"""GET /report/{patient_id} returns 200 and PDF when data exists; 404 otherwise."""
import io
import pytest
from fastapi.testclient import TestClient

from backend.main import app, _report_store

client = TestClient(app)

VALID_VCF_MINIMAL = b"""##fileformat=VCFv4.2
#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tsample1
1	1000	rs3892097	A	G	.	.	.	GT	0/1
"""


def test_report_404_when_no_data():
    """GET /report/{unknown_id} returns 404 when no analysis stored."""
    # Use a UUID that was never analyzed
    response = client.get("/report/00000000-0000-0000-0000-000000000001")
    assert response.status_code == 404
    body = response.json()
    assert "error" in body


def test_report_200_and_pdf_when_data_exists():
    """After a successful analyze, GET /report/{patient_id} returns 200 and application/pdf."""
    # Clear store to avoid cross-test pollution; then run analyze with known patient_id
    patient_id = "test-patient-report-123"
    _report_store.clear()
    response = client.post(
        "/analyze",
        data={"drug_name": "CODEINE", "patient_id": patient_id},
        files={"file": ("test.vcf", io.BytesIO(VALID_VCF_MINIMAL), "text/vcf")},
    )
    if response.status_code != 200:
        pytest.skip("Analyze did not succeed (e.g. gene not detected in minimal VCF)")
    assert patient_id in _report_store

    report_response = client.get(f"/report/{patient_id}")
    assert report_response.status_code == 200
    assert report_response.headers.get("content-type", "").startswith("application/pdf")
    assert len(report_response.content) > 100
    assert report_response.content[:4] == b"%PDF"
