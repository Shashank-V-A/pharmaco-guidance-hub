"""
Confidence score 0.0–1.0 from CPIC evidence, variant completeness, parsing integrity, diplotype clarity.
No AI. Rounded to 2 decimals.
"""
from typing import List, Dict, Any


def compute_confidence(
    vcf_parsing_success: bool,
    gene_coverage: str,
    rule_engine_status: str,
    num_variants: int,
    diplotype: str,
    phenotype: str,
) -> float:
    """
    Deterministic confidence from:
    - Parsing success
    - Gene coverage (target gene present)
    - Rule engine status
    - Variant count (more = higher if parsed)
    - Diplotype clarity (no-call vs clear)
    """
    score = 0.0
    if vcf_parsing_success:
        score += 0.35
    if rule_engine_status == "success":
        score += 0.30
    elif rule_engine_status == "partial":
        score += 0.15
    if gene_coverage and gene_coverage != "none":
        score += 0.20
    if num_variants > 0:
        score += min(0.10, num_variants * 0.03)
    if diplotype and diplotype != "—" and diplotype != ".":
        score += 0.05
    if phenotype and phenotype not in ("Unknown", "Genotype not determined"):
        score += 0.05
    return round(min(1.0, score), 2)
