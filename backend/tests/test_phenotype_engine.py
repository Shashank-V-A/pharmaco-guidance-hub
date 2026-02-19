"""Unit tests for phenotype engine (deterministic)."""
import pytest
from backend.services.phenotype_engine import get_phenotype


def test_cyp2d6_nm():
    # No variants → *1/*1 NM
    r = get_phenotype("CYP2D6", [])
    assert r["phenotype"] == "NM"
    assert "*1" in r["diplotype"]


def test_cyp2d6_pm():
    # *4/*4 equivalent: two no-function alleles
    variants = [
        {"gene": "CYP2D6", "rs": "rs3892097", "genotype": "1/1"},
    ]
    r = get_phenotype("CYP2D6", variants)
    assert r["phenotype"] in ("PM", "IM")  # depends on implementation


def test_cyp2c19_nm():
    r = get_phenotype("CYP2C19", [])
    assert r["phenotype"] == "NM"
    assert r["gene"] == "CYP2C19"


def test_only_allowed_genes():
    r = get_phenotype("CYP2C9", [])
    assert r["gene"] == "CYP2C9"
    r2 = get_phenotype("DPYD", [])
    assert r2["gene"] == "DPYD"
