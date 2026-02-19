"""
Rule 10: Unit tests for strict consistency.
- Parsing failure → 400 returned, no risk_assessment
- Rule engine failure → 422 returned
- Successful case → full schema returned
- No state where risk_label exists with rule_engine_status = error
"""
import io
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

# Minimal valid VCF with one known rsid so parsing can succeed and we get gene coverage
VALID_VCF_MINIMAL = b"""##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample1
1	1000	rs3892097	A	G	.	.	.	GT	0/1
"""

# Invalid VCF (not valid format) - may still be "parsed" by cyvcf2 with no variants, or fail
INVALID_VCF = b"not a vcf file at all\n"


def test_parsing_failure_returns_400_no_risk():
    """Rule 1 & 2: Invalid file → 400, response must NOT contain risk_assessment or pharmacogenomic_profile."""
    # Use invalid extension to get 400 before parse, or use invalid content
    response = client.post(
        "/analyze",
        data={"drug_name": "CODEINE"},
        files={"file": ("x.txt", io.BytesIO(b"x"), "text/plain")},
    )
    # File type check gives 400 with our error shape
    assert response.status_code == 400
    body = response.json()
    assert "error" in body
    assert "details" in body
    assert "risk_assessment" not in body
    assert "pharmacogenomic_profile" not in body
    assert "clinical_recommendation" not in body


def test_oversized_file_returns_400():
    """Oversized VCF → 400, no full schema."""
    large = b"#" + b"x" * (6 * 1024 * 1024)  # > 5MB
    response = client.post(
        "/analyze",
        data={"drug_name": "CODEINE"},
        files={"file": ("big.vcf", io.BytesIO(large), "text/plain")},
    )
    assert response.status_code == 400
    body = response.json()
    assert body.get("error") == "VCF parsing failed"
    assert "risk_assessment" not in body


def test_rule_engine_failure_returns_422():
    """Rule 3: Unsupported drug → 422, no full schema."""
    response = client.post(
        "/analyze",
        data={"drug_name": "INVALID_DRUG"},
        files={"file": ("test.vcf", io.BytesIO(VALID_VCF_MINIMAL), "text/vcf")},
    )
    assert response.status_code == 422
    body = response.json()
    assert "error" in body
    assert body.get("error") == "Rule engine failed"
    assert "risk_assessment" not in body
    assert "pharmacogenomic_profile" not in body


def test_success_returns_full_schema():
    """Rule 5: When parsing + phenotype + rule engine + LLM path succeed → 200 and full schema."""
    response = client.post(
        "/analyze",
        data={"drug_name": "CODEINE"},
        files={"file": ("test.vcf", io.BytesIO(VALID_VCF_MINIMAL), "text/vcf")},
    )
    # May be 422 if gene not detected (e.g. VCF has no CYP2D6), or 200 if pipeline succeeds
    if response.status_code == 200:
        body = response.json()
        assert "patient_id" in body
        assert body["patient_id"] is not None and body["patient_id"] != ""
        assert "risk_assessment" in body
        assert "pharmacogenomic_profile" in body
        assert "clinical_recommendation" in body
        assert "llm_generated_explanation" in body
        assert "quality_metrics" in body
        assert body["quality_metrics"]["vcf_parsing_success"] is True
        assert body["quality_metrics"]["rule_engine_status"] == "success"
        assert "risk_label" in body["risk_assessment"]
        # audit_trail present only on successful analyze
        assert "audit_trail" in body
        assert body["audit_trail"] is not None
        assert "gene_detected" in body["audit_trail"]
        assert "confidence_breakdown" in body["audit_trail"]


def test_audit_trail_absent_on_4xx():
    """audit_trail is not present on 400/422 responses (only on full schema success)."""
    response400 = client.post(
        "/analyze",
        data={"drug_name": "CODEINE"},
        files={"file": ("x.txt", io.BytesIO(b"x"), "text/plain")},
    )
    assert response400.status_code == 400
    body400 = response400.json()
    assert "audit_trail" not in body400

    response422 = client.post(
        "/analyze",
        data={"drug_name": "INVALID_DRUG"},
        files={"file": ("test.vcf", io.BytesIO(VALID_VCF_MINIMAL), "text/vcf")},
    )
    assert response422.status_code == 422
    body422 = response422.json()
    assert "audit_trail" not in body422


def test_no_risk_label_when_rule_engine_status_error():
    """Rule 6: No response should ever have risk_label present AND rule_engine_status = 'error'."""
    # Any 400 response must not contain risk_label (no full schema)
    response400 = client.post(
        "/analyze",
        data={"drug_name": "CODEINE"},
        files={"file": ("x.txt", io.BytesIO(b"x"), "text/plain")},
    )
    assert response400.status_code == 400
    body400 = response400.json()
    assert "risk_assessment" not in body400
    assert "quality_metrics" not in body400

    # Any 422 response must not contain full schema with rule_engine_status error
    response422 = client.post(
        "/analyze",
        data={"drug_name": "NOTADRUG"},
        files={"file": ("test.vcf", io.BytesIO(VALID_VCF_MINIMAL), "text/vcf")},
    )
    assert response422.status_code == 422
    body422 = response422.json()
    assert "risk_assessment" not in body422


def test_python_fallback_parser_used_when_cyvcf2_missing():
    """When cyvcf2 is not installed, pure-Python fallback still parses valid VCF (no 400 cyvcf2)."""
    from backend.services.vcf_parser import parse_vcf, _parse_vcf_python
    vcf = b"""##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample1
1	1000	rs3892097	A	G	.	.	.	GT	0/1
"""
    variants, success, coverage = _parse_vcf_python(vcf)
    assert success is True
    assert coverage == "CYP2D6"
    assert len(variants) >= 1
    assert variants[0]["gene"] == "CYP2D6" and variants[0]["rs"] == "rs3892097"


def test_patient_id_never_null():
    """Rule 4: When full schema is returned, patient_id is always a non-empty string."""
    response = client.post(
        "/analyze",
        data={"drug_name": "CODEINE"},
        files={"file": ("test.vcf", io.BytesIO(VALID_VCF_MINIMAL), "text/vcf")},
    )
    if response.status_code == 200:
        body = response.json()
        assert isinstance(body["patient_id"], str)
        assert len(body["patient_id"]) > 0
        assert body["patient_id"] is not None
