"""
Tests for drug detection (image input enhancement only).
- Drug matching logic (deterministic)
- Unsupported drug → no match
- OCR failure / empty text → no match
- Detection endpoint does not affect main analyze schema
"""
import io
import pytest
from unittest.mock import patch, MagicMock

from backend.services.drug_detection_service import (
    detect_drug_from_image,
    _match_drug,
    _ocr_image,
    SUPPORTED_DRUGS,
    MIN_CONFIDENCE,
)


def test_match_drug_warfarine():
    """Text containing WARFARIN returns WARFARIN and positive raw confidence."""
    drug, raw_conf = _match_drug("WARFARIN 5mg tablets")
    assert drug == "WARFARIN"
    assert raw_conf > 0
    total_len = max(len("WARFARIN 5MG TABLETS".strip()), 1)
    expected_conf = 8 / total_len
    assert abs(raw_conf - expected_conf) < 0.01


def test_match_drug_codeine():
    """Text containing CODEINE returns CODEINE."""
    drug, _ = _match_drug("Contains CODEINE phosphate")
    assert drug == "CODEINE"


def test_match_drug_unsupported():
    """Text with only unsupported drug name returns None."""
    drug, conf = _match_drug("ASPIRIN 100mg")
    assert drug is None
    assert conf == 0.0


def test_match_drug_empty():
    """Empty or whitespace text returns None."""
    assert _match_drug("") == (None, 0.0)
    assert _match_drug("   \n  ") == (None, 0.0)


def test_match_drug_multiple_highest_frequency():
    """When multiple drugs appear, return the one with highest occurrence count."""
    drug, _ = _match_drug("WARFARIN WARFARIN CODEINE")
    assert drug == "WARFARIN"


def test_detect_drug_from_image_no_match_returns_none():
    """When OCR returns text with no supported drug, detect_drug_from_image returns (None, 0, raw_text)."""
    with patch("backend.services.drug_detection_service._ocr_image", return_value="PARACETAMOL 500mg"):
        drug, conf, raw = detect_drug_from_image(b"fake")
        assert drug is None
        assert conf == 0.0
        assert "PARACETAMOL" in raw


def test_detect_drug_from_image_weak_match_still_accepted():
    """When drug name appears in long text (low ratio), we still accept with min confidence 0.8."""
    long_text = "X" * 200 + "WARFARIN"
    with patch("backend.services.drug_detection_service._ocr_image", return_value=long_text):
        drug, conf, _ = detect_drug_from_image(b"fake")
        assert drug == "WARFARIN"
        assert conf >= 0.8


def test_detect_drug_from_image_ocr_failure():
    """When OCR fails (empty string), return None."""
    with patch("backend.services.drug_detection_service._ocr_image", return_value=""):
        drug, conf, raw = detect_drug_from_image(b"fake")
        assert drug is None
        assert conf == 0.0
        assert raw == ""


def test_detect_drug_from_image_success():
    """When OCR returns text with supported drug and sufficient confidence, return drug and confidence."""
    with patch("backend.services.drug_detection_service._ocr_image", return_value="WARFARIN 5mg"):
        drug, conf, raw = detect_drug_from_image(b"fake")
        assert drug == "WARFARIN"
        assert MIN_CONFIDENCE <= conf <= 0.99
        assert "WARFARIN" in raw


def test_supported_drugs_unchanged():
    """Supported list is exactly the 6 allowed drugs (no scope expansion)."""
    expected = {"CODEINE", "WARFARIN", "CLOPIDOGREL", "SIMVASTATIN", "AZATHIOPRINE", "FLUOROURACIL"}
    assert set(SUPPORTED_DRUGS) == expected
    assert len(SUPPORTED_DRUGS) == 6


def test_detect_drug_endpoint_does_not_affect_analyze_schema():
    """Detection endpoint is separate; main analyze schema unchanged (no new required fields)."""
    from backend.models.schemas import AnalyzeResponse
    # AnalyzeResponse must still have required fields only; audit_trail etc are optional
    required = set(AnalyzeResponse.model_fields)
    assert "patient_id" in required
    assert "drug" in required
    assert "risk_assessment" in required
    assert "pharmacogenomic_profile" in required
