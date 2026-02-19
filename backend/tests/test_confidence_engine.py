"""Unit test: confidence breakdown components sum to confidence_score."""
import pytest
from backend.services.confidence_engine import compute_confidence


def test_confidence_breakdown_sum_equals_score():
    """Breakdown (evidence_weight, variant_completeness, parsing_integrity, diplotype_clarity) sums to confidence_score."""
    cases = [
        {"vcf_parsing_success": True, "gene_coverage": "CYP2D6", "rule_engine_status": "success", "num_variants": 2, "diplotype": "*1/*1", "phenotype": "NM"},
        {"vcf_parsing_success": True, "gene_coverage": "none", "rule_engine_status": "success", "num_variants": 0, "diplotype": "", "phenotype": "Unknown"},
        {"vcf_parsing_success": False, "gene_coverage": "CYP2D6", "rule_engine_status": "partial", "num_variants": 1, "diplotype": "*1/*2", "phenotype": "IM"},
    ]
    for kw in cases:
        score, breakdown = compute_confidence(**kw)
        total = (
            breakdown["evidence_weight"]
            + breakdown["variant_completeness"]
            + breakdown["parsing_integrity"]
            + breakdown["diplotype_clarity"]
        )
        assert abs(total - score) < 0.01, f"breakdown sum {total} != score {score} for {kw}"
        assert 0 <= score <= 1.0
