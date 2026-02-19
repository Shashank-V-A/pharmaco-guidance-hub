"""
FastAPI backend: POST /analyze — VCF + drug_name (+ optional patient_id).
Strict JSON schema response. All pharmacogenomic logic in backend.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.config import (
    ALLOWED_DRUGS,
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
    description="Hackathon-compliant CPIC rule engine; LLM explanation only.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(..., description="VCF file (max 5MB)"),
    drug_name: str = Form(..., description="One of: CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL"),
    patient_id: Optional[str] = Form(None),
):
    """Validate file and drug, run VCF parse → phenotype → CPIC rules → confidence → LLM explanation. Return strict schema."""
    drug_upper = drug_name.strip().upper()
    if drug_upper not in ALLOWED_DRUGS:
        raise HTTPException(
            status_code=422,
            detail=f"drug_name must be one of: {', '.join(sorted(ALLOWED_DRUGS))}",
        )
    if not file.filename or not file.filename.lower().endswith((".vcf", ".vcf.gz")):
        raise HTTPException(status_code=400, detail="File must be a VCF (.vcf or .vcf.gz)")

    content = await file.read()
    if len(content) > MAX_VCF_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="VCF file exceeds 5MB limit")

    # Parse VCF (only 6 genes)
    variants, vcf_parsing_success, gene_coverage = parse_vcf(content, max_size=MAX_VCF_SIZE_BYTES)
    rule_engine_status = "success"
    if not vcf_parsing_success:
        rule_engine_status = "error"
        gene_coverage = "parse_failed"

    gene = DRUG_GENE_MAP.get(drug_upper, "CYP2C19")
    profile = get_phenotype(gene, variants)
    diplotype = profile.get("diplotype", "*1/*1")
    phenotype = profile.get("phenotype", "NM")

    cpic = get_cpic_recommendation(drug_upper, gene, phenotype)
    risk_label = cpic.get("risk_label", "Safe")
    severity = cpic.get("severity", "low")
    clinical_action = cpic.get("clinical_action", "See CPIC.")
    guideline_reference = cpic.get("guideline_reference", "CPIC")

    confidence_score = compute_confidence(
        vcf_parsing_success=vcf_parsing_success,
        gene_coverage=gene_coverage,
        rule_engine_status=rule_engine_status,
        num_variants=len(variants),
        diplotype=diplotype,
        phenotype=phenotype,
    )

    # Dose adjustment / alternative: derive from clinical_action
    dose_adjustment = clinical_action
    alternative_options = "See CPIC guideline for alternatives if dose adjustment not suitable."

    # LLM explanation only (does not change risk/severity)
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

    return AnalyzeResponse(
        patient_id=patient_id or None,
        drug=drug_upper,
        timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")[:23] + "Z",
        risk_assessment=RiskAssessment(
            risk_label=risk_label,
            severity=severity,
            confidence_score=confidence_score,
        ),
        pharmacogenomic_profile=PharmacogenomicProfile(
            gene=gene,
            diplotype=diplotype,
            phenotype=phenotype,
            detected_variants=detected_variants_schema,
        ),
        clinical_recommendation=ClinicalRecommendation(
            dose_adjustment=dose_adjustment,
            alternative_options=alternative_options,
            guideline_reference=guideline_reference,
        ),
        llm_generated_explanation=LLMGeneratedExplanation(
            summary=llm_payload.get("summary", ""),
            mechanism_explanation=llm_payload.get("mechanism_explanation", ""),
            variant_references=llm_payload.get("variant_references", []),
            clinical_rationale=llm_payload.get("clinical_rationale", ""),
        ),
        quality_metrics=QualityMetrics(
            vcf_parsing_success=vcf_parsing_success,
            gene_coverage=gene_coverage,
            rule_engine_status=rule_engine_status,
        ),
    )


@app.get("/health")
def health():
    return {"status": "ok"}
