"""JSON schema validation: response matches exact required structure."""
import pytest
from backend.models.schemas import AnalyzeResponse, RiskAssessment, QualityMetrics


def test_response_schema():
    r = AnalyzeResponse(
        patient_id="P1",
        drug="CODEINE",
        timestamp="2025-02-19T12:00:00Z",
        risk_assessment=RiskAssessment(risk_label="Safe", severity="low", confidence_score=0.92),
        pharmacogenomic_profile={
            "gene": "CYP2D6",
            "diplotype": "*1/*1",
            "phenotype": "NM",
            "detected_variants": [],
        },
        clinical_recommendation={
            "dose_adjustment": "Standard",
            "alternative_options": "None",
            "guideline_reference": "CPIC",
        },
        llm_generated_explanation={
            "summary": "S",
            "mechanism_explanation": "M",
            "variant_references": [],
            "clinical_rationale": "C",
        },
        quality_metrics=QualityMetrics(
            vcf_parsing_success=True,
            gene_coverage="CYP2D6",
            rule_engine_status="success",
        ),
    )
    d = r.model_dump()
    assert "patient_id" in d
    assert "drug" in d
    assert "timestamp" in d
    assert "risk_assessment" in d
    assert "pharmacogenomic_profile" in d
    assert "clinical_recommendation" in d
    assert "llm_generated_explanation" in d
    assert "quality_metrics" in d
    assert d["risk_assessment"]["risk_label"] == "Safe"
    assert d["risk_assessment"]["confidence_score"] == 0.92
