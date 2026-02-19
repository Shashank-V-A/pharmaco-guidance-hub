"""
FastAPI backend: POST /analyze — VCF + drug_name (+ optional patient_id).
Strict logical consistency: no risk_assessment/pharmacogenomic_profile when parsing fails.
Full schema only when parsing + phenotype + rule_engine + LLM (or fallback) all succeed.
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from backend.config import (
    ALLOWED_DRUGS,
    ALLOWED_GENES,
    DRUG_GENE_MAP,
    MAX_VCF_SIZE_BYTES,
)
from backend.models.schemas import (
    AnalyzeResponse,
    RiskAssessment,
    PharmacogenomicProfile,
    ClinicalRecommendation,
    LLMGeneratedExplanation,
    QualityMetrics,
    DetectedVariant,
)
from backend.services import (
    parse_vcf,
    get_phenotype,
    get_cpic_recommendation,
    compute_confidence,
    fetch_llm_explanation,
)

app = FastAPI(
    title="Pharmacogenomics Analysis API",
    description="Hackathon-compliant CPIC rule engine; LLM explanation only. Strict consistency.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- RULE 4: patient_id never null ---
def _ensure_patient_id(patient_id: Optional[str]) -> str:
    return patient_id.strip() if (patient_id and patient_id.strip()) else str(uuid.uuid4())


# --- RULE 1 / 2: Parsing failure → 400, abort; no risk, no profile ---
def _abort_vcf_parse_failed(details: str) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "VCF parsing failed", "details": details},
    )


# --- RULE 3: Rule engine failure → 422 ---
def _abort_rule_engine_failed(details: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": "Rule engine failed", "details": details},
    )


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(..., description="VCF file (max 5MB)"),
    drug_name: str = Form(..., description="One of: CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL"),
    patient_id: Optional[str] = Form(None),
):
    """
    Strict flow: validate → parse VCF → [abort 400 if parse fail] → phenotype → rule engine → [abort 422 if rule fail] → confidence → LLM (or fallback) → validate → return full schema.
    """
    # RULE 4: patient_id never null
    resolved_patient_id = _ensure_patient_id(patient_id)

    drug_upper = drug_name.strip().upper()
    # RULE 3: drug unsupported → 422 (rule engine cannot run)
    if drug_upper not in ALLOWED_DRUGS:
        return _abort_rule_engine_failed(
            f"drug_name must be one of: {', '.join(sorted(ALLOWED_DRUGS))}"
        )

    if not file.filename or not file.filename.lower().endswith((".vcf", ".vcf.gz")):
        return _abort_vcf_parse_failed("File must be a VCF (.vcf or .vcf.gz)")

    content = await file.read()
    if len(content) > MAX_VCF_SIZE_BYTES:
        return _abort_vcf_parse_failed("VCF file exceeds 5MB limit")

    # Parse VCF
    variants, vcf_parsing_success, gene_coverage = parse_vcf(content, max_size=MAX_VCF_SIZE_BYTES)

    # RULE 1 & 2: If parsing failed → 400, do NOT run phenotype/rule/LLM, do NOT return risk or profile
    if not vcf_parsing_success:
        return _abort_vcf_parse_failed(gene_coverage or "Parse error")

    # Required gene for this drug
    gene = DRUG_GENE_MAP.get(drug_upper)
    if not gene or gene not in ALLOWED_GENES:
        return _abort_rule_engine_failed("Gene missing or unsupported for drug")

    # Gene not detected in VCF → rule engine cannot produce valid recommendation
    if gene_coverage == "none" or gene not in gene_coverage:
        return _abort_rule_engine_failed(f"Required gene {gene} not detected in VCF")

    # Phenotype engine (only runs when parsing succeeded)
    profile = get_phenotype(gene, variants)
    diplotype = profile.get("diplotype", "")
    phenotype = profile.get("phenotype", "")

    # RULE 3: Phenotype undefined → 422
    if not phenotype or phenotype in ("Unknown", "Genotype not determined"):
        return _abort_rule_engine_failed("Phenotype undefined or not determined")

    # Rule engine (deterministic)
    cpic = get_cpic_recommendation(drug_upper, gene, phenotype)
    risk_label = cpic.get("risk_label")
    severity = cpic.get("severity")
    clinical_action = cpic.get("clinical_action")
    guideline_reference = cpic.get("guideline_reference", "CPIC")

    # RULE 3: Mapping not found
    if not risk_label or risk_label not in ("Safe", "Adjust Dosage", "Ineffective", "Toxic"):
        return _abort_rule_engine_failed("Phenotype mapping not found for drug/gene")

    # RULE 5 state: all true so far (parsing, phenotype, rule_engine). Now confidence + LLM.
    # RULE 8: Confidence only in success block
    confidence_score = compute_confidence(
        vcf_parsing_success=True,
        gene_coverage=gene_coverage,
        rule_engine_status="success",
        num_variants=len(variants),
        diplotype=diplotype,
        phenotype=phenotype,
    )

    dose_adjustment = clinical_action or "See CPIC guideline."
    alternative_options = "See CPIC guideline for alternatives if dose adjustment not suitable."

    # RULE 9: LLM (or fallback) only when rule_engine succeeded
    llm_payload = fetch_llm_explanation(
        drug=drug_upper,
        gene=gene,
        phenotype=phenotype,
        risk_label=risk_label,
        severity=severity,
        guideline_reference=guideline_reference,
        detected_variants=variants,
    )

    detected_variants_schema = [
        DetectedVariant(
            gene=v.get("gene", ""),
            star=v.get("star"),
            rs=v.get("rs"),
            genotype=v.get("genotype", "./."),
        )
        for v in variants
    ]

    # RULE 6: Only return full schema when quality_metrics are consistent
    quality_metrics = QualityMetrics(
        vcf_parsing_success=True,
        gene_coverage=gene_coverage,
        rule_engine_status="success",
    )
    # Explicit consistency check: never risk_label with rule_engine_status error or parsing false
    if not quality_metrics.vcf_parsing_success or quality_metrics.rule_engine_status != "success":
        return JSONResponse(
            status_code=500,
            content={"error": "Internal consistency error", "details": "Quality metrics invalid before response build"},
        )

    payload = {
        "patient_id": resolved_patient_id,
        "drug": drug_upper,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")[:23] + "Z",
        "risk_assessment": RiskAssessment(
            risk_label=risk_label,
            severity=severity,
            confidence_score=confidence_score,
        ),
        "pharmacogenomic_profile": PharmacogenomicProfile(
            gene=gene,
            diplotype=diplotype,
            phenotype=phenotype,
            detected_variants=detected_variants_schema,
        ),
        "clinical_recommendation": ClinicalRecommendation(
            dose_adjustment=dose_adjustment,
            alternative_options=alternative_options,
            guideline_reference=guideline_reference,
        ),
        "llm_generated_explanation": LLMGeneratedExplanation(
            summary=llm_payload.get("summary", ""),
            mechanism_explanation=llm_payload.get("mechanism_explanation", ""),
            variant_references=llm_payload.get("variant_references", []),
            clinical_rationale=llm_payload.get("clinical_rationale", ""),
        ),
        "quality_metrics": quality_metrics,
    }

    # RULE 7: Validate with Pydantic before return; 500 on validation failure
    try:
        response = AnalyzeResponse.model_validate(payload)
    except ValidationError as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Response validation failed", "details": e.errors()},
        )

    return response


@app.get("/health")
def health():
    return {"status": "ok"}
