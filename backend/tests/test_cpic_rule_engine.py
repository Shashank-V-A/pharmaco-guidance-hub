"""Unit tests for CPIC rule engine (deterministic lookup)."""
import pytest
from backend.services.cpic_rule_engine import get_cpic_recommendation


def test_codeine_nm_safe():
    r = get_cpic_recommendation("CODEINE", "CYP2D6", "NM")
    assert r["risk_label"] == "Safe"
    assert r["severity"] == "low"
    assert r["guideline_reference"] == "CPIC"


def test_codeine_pm_ineffective():
    r = get_cpic_recommendation("CODEINE", "CYP2D6", "PM")
    assert r["risk_label"] == "Ineffective"
    assert r["severity"] == "moderate"


def test_codeine_um_toxic():
    r = get_cpic_recommendation("CODEINE", "CYP2D6", "UM")
    assert r["risk_label"] == "Toxic"
    assert r["severity"] == "high"


def test_warfarin_clopidogrel_in_scope():
    r = get_cpic_recommendation("WARFARIN", "CYP2C9", "NM")
    assert r["risk_label"] == "Safe"
    r2 = get_cpic_recommendation("CLOPIDOGREL", "CYP2C19", "PM")
    assert r2["risk_label"] in ("Adjust Dosage", "Toxic", "Ineffective", "Safe")
