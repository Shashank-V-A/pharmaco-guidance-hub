"""
Confidence score 0.0–1.0 from CPIC evidence, variant completeness, parsing integrity, diplotype clarity.
No AI. Rounded to 2 decimals. Returns structured breakdown so sum equals confidence_score.
"""
from typing import Dict, Any, Tuple


def compute_confidence(
    vcf_parsing_success: bool,
    gene_coverage: str,
    rule_engine_status: str,
    num_variants: int,
    diplotype: str,
    phenotype: str,
) -> Tuple[float, Dict[str, float]]:
    """
    Deterministic confidence from:
    - evidence_weight (rule engine success)
    - variant_completeness (gene coverage + variant count)
    - parsing_integrity (VCF parse success)
    - diplotype_clarity (diplotype + phenotype defined)
    Returns (confidence_score, confidence_breakdown). Sum of breakdown values equals score.
    """
    evidence_weight = 0.30 if rule_engine_status == "success" else (0.15 if rule_engine_status == "partial" else 0.0)
    variant_completeness = 0.0
    if gene_coverage and gene_coverage != "none":
        variant_completeness += 0.20
    if num_variants > 0:
        variant_completeness += min(0.10, num_variants * 0.03)
    parsing_integrity = 0.35 if vcf_parsing_success else 0.0
    diplotype_clarity = 0.0
    if diplotype and diplotype not in ("—", "."):
        diplotype_clarity += 0.05
    if phenotype and phenotype not in ("Unknown", "Genotype not determined"):
        diplotype_clarity += 0.05
    total = evidence_weight + variant_completeness + parsing_integrity + diplotype_clarity
    score = round(min(1.0, total), 2)
    # Normalize breakdown so it sums exactly to score (avoid float drift)
    breakdown_sum = evidence_weight + variant_completeness + parsing_integrity + diplotype_clarity
    if breakdown_sum > 0:
        scale = score / breakdown_sum
        evidence_weight = round(evidence_weight * scale, 2)
        variant_completeness = round(variant_completeness * scale, 2)
        parsing_integrity = round(parsing_integrity * scale, 2)
        diplotype_clarity = round(score - evidence_weight - variant_completeness - parsing_integrity, 2)
    else:
        evidence_weight = variant_completeness = parsing_integrity = diplotype_clarity = 0.0
    confidence_breakdown = {
        "evidence_weight": round(evidence_weight, 2),
        "variant_completeness": round(variant_completeness, 2),
        "parsing_integrity": round(parsing_integrity, 2),
        "diplotype_clarity": round(diplotype_clarity, 2),
    }
    return score, confidence_breakdown
