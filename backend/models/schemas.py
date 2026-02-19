"""
Strict Pydantic schemas for hackathon-compliant API.
Output schema MUST match exactly.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


# --- Error responses (no full schema) ---
class VcfParseErrorResponse(BaseModel):
    error: str = "VCF parsing failed"
    details: str


class RuleEngineErrorResponse(BaseModel):
    error: str = "Rule engine failed"
    details: str


# --- Request ---
class AnalyzeRequest(BaseModel):
    drug_name: str = Field(..., description="One of: CODEINE, WARFARIN, CLOPIDOGREL, SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL")
    patient_id: Optional[str] = None


# --- Detected variant (from VCF) ---
class DetectedVariant(BaseModel):
    gene: str
    star: Optional[str] = None
    rs: Optional[str] = None
    genotype: str


# --- Risk assessment ---
class RiskAssessment(BaseModel):
    risk_label: str  # Safe | Adjust Dosage | Ineffective | Toxic
    severity: str    # low | moderate | high
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="0.0-1.0, 2 decimals")


# --- Pharmacogenomic profile ---
class PharmacogenomicProfile(BaseModel):
    gene: str
    diplotype: str
    phenotype: str
    detected_variants: List[DetectedVariant] = Field(default_factory=list)


# --- Clinical recommendation ---
class ClinicalRecommendation(BaseModel):
    dose_adjustment: str
    alternative_options: str
    guideline_reference: str = "CPIC"


# --- LLM-generated explanation (explanation only; never modifies risk) ---
class LLMGeneratedExplanation(BaseModel):
    summary: str
    mechanism_explanation: str
    variant_references: List[str] = Field(default_factory=list)
    clinical_rationale: str


# --- Quality metrics ---
class QualityMetrics(BaseModel):
    vcf_parsing_success: bool
    gene_coverage: str
    rule_engine_status: str  # success | partial | error


# --- Full response (EXACT schema). Only returned when all steps succeed. ---
class AnalyzeResponse(BaseModel):
    patient_id: str  # Never null; UUID generated if not provided
    drug: str
    timestamp: str  # ISO format
    risk_assessment: RiskAssessment
    pharmacogenomic_profile: PharmacogenomicProfile
    clinical_recommendation: ClinicalRecommendation
    llm_generated_explanation: LLMGeneratedExplanation
    quality_metrics: QualityMetrics

    class Config:
        json_schema_extra = {
            "example": {
                "patient_id": "550e8400-e29b-41d4-a716-446655440000",
                "drug": "CODEINE",
                "timestamp": "2025-02-19T12:00:00Z",
                "risk_assessment": {
                    "risk_label": "Safe",
                    "severity": "low",
                    "confidence_score": 0.92
                },
                "pharmacogenomic_profile": {
                    "gene": "CYP2D6",
                    "diplotype": "*1/*1",
                    "phenotype": "NM",
                    "detected_variants": []
                },
                "clinical_recommendation": {
                    "dose_adjustment": "Standard dose",
                    "alternative_options": "None required",
                    "guideline_reference": "CPIC"
                },
                "llm_generated_explanation": {
                    "summary": "...",
                    "mechanism_explanation": "...",
                    "variant_references": [],
                    "clinical_rationale": "..."
                },
                "quality_metrics": {
                    "vcf_parsing_success": True,
                    "gene_coverage": "CYP2D6",
                    "rule_engine_status": "success"
                }
            }
        }
