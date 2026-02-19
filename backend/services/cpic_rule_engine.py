"""
Deterministic CPIC rule engine. Lookup tables only. No LLM.
Drug → Gene; Phenotype → risk_label, severity, clinical_action, guideline_reference.
"""
from typing import Dict, Any
from backend.config import DRUG_GENE_MAP, ALLOWED_DRUGS

# Phenotype shorthand → risk label and severity (strict)
# risk_label: Safe | Adjust Dosage | Ineffective | Toxic
# severity: low | moderate | high
PHENOTYPE_TO_RISK: Dict[str, Dict[str, str]] = {
    # CYP2D6 (CODEINE)
    "PM": {"risk_label": "Ineffective", "severity": "moderate"},
    "IM": {"risk_label": "Adjust Dosage", "severity": "moderate"},
    "NM": {"risk_label": "Safe", "severity": "low"},
    "UM": {"risk_label": "Toxic", "severity": "high"},
    # CYP2C9 (WARFARIN), CYP2C19 (CLOPIDOGREL) - same labels
    # SLCO1B1, TPMT, DPYD - map phenotype names to same set
    "Low function": {"risk_label": "Toxic", "severity": "high"},
    "DPD deficient": {"risk_label": "Toxic", "severity": "high"},
    "Low activity": {"risk_label": "Toxic", "severity": "high"},
    "Intermediate": {"risk_label": "Adjust Dosage", "severity": "moderate"},
    "DPD intermediate": {"risk_label": "Adjust Dosage", "severity": "moderate"},
    "Normal": {"risk_label": "Safe", "severity": "low"},
    "DPD normal": {"risk_label": "Safe", "severity": "low"},
}

# (drug, phenotype_key) → clinical_action text (deterministic)
CLINICAL_ACTIONS: Dict[str, Dict[str, str]] = {
    "CODEINE": {
        "PM": "Avoid codeine; use alternative analgesic.",
        "IM": "Consider reduced dose or alternative.",
        "NM": "Standard dose.",
        "UM": "Avoid codeine; risk of toxicity.",
    },
    "WARFARIN": {
        "PM": "Use low dose; consider alternative.",
        "IM": "Consider dose reduction.",
        "NM": "Standard dose.",
    },
    "CLOPIDOGREL": {
        "PM": "Consider alternative antiplatelet (e.g. prasugrel/ticagrelor).",
        "IM": "Consider alternative or monitor.",
        "NM": "Standard dose.",
        "UM": "Standard dose; monitor.",
    },
    "SIMVASTATIN": {
        "Low function": "Use low dose or alternative statin.",
        "Intermediate": "Consider reduced dose.",
        "Normal": "Standard dose.",
    },
    "AZATHIOPRINE": {
        "Low activity": "Use very low dose or alternative.",
        "Intermediate": "Reduce dose.",
        "Normal": "Standard dose.",
    },
    "FLUOROURACIL": {
        "DPD deficient": "Do not use full dose; consider alternative.",
        "DPD intermediate": "Start at 50% dose reduction.",
        "DPD normal": "Standard dose.",
    },
}


def _phenotype_key(phenotype: str) -> str:
    """Normalize phenotype string for lookup."""
    p = phenotype.strip().upper()
    if p in ("PM", "IM", "NM", "UM"):
        return p
    if "DEFICIENT" in p or "LOW" in p and "FUNCTION" in p:
        return "Low function" if "SLCO" not in phenotype else "Low function"
    if "INTERMEDIATE" in p or "DPD INTERMEDIATE" in phenotype:
        return "Intermediate" if "DPD" not in phenotype else "DPD intermediate"
    if "NORMAL" in p or "DPD NORMAL" in phenotype:
        return "Normal" if "DPD" not in phenotype else "DPD normal"
    if "LOW ACTIVITY" in phenotype:
        return "Low activity"
    # Direct map
    for k in PHENOTYPE_TO_RISK:
        if k.upper() in p or k in phenotype:
            return k
    return "NM"  # default safe


def get_cpic_recommendation(
    drug: str, gene: str, phenotype: str
) -> Dict[str, Any]:
    """
    Deterministic lookup. Returns:
    risk_label, severity, clinical_action, guideline_reference (CPIC).
    """
    drug = drug.strip().upper()
    if drug not in ALLOWED_DRUGS:
        return {
            "risk_label": "Safe",
            "severity": "low",
            "clinical_action": "Drug not in scope.",
            "guideline_reference": "CPIC",
        }

    key = _phenotype_key(phenotype)
    risk_info = PHENOTYPE_TO_RISK.get(
        key,
        PHENOTYPE_TO_RISK.get("NM", {"risk_label": "Safe", "severity": "low"}),
    )
    if isinstance(risk_info, dict):
        risk_label = risk_info.get("risk_label", "Safe")
        severity = risk_info.get("severity", "low")
    else:
        risk_label, severity = "Safe", "low"

    actions = CLINICAL_ACTIONS.get(drug, {})
    clinical_action = actions.get(key) or actions.get("NM") or "Standard dose per CPIC."
    if not clinical_action:
        clinical_action = "See CPIC guideline for " + drug + " and " + gene + "."

    return {
        "risk_label": risk_label,
        "severity": severity,
        "clinical_action": clinical_action,
        "guideline_reference": "CPIC",
    }
