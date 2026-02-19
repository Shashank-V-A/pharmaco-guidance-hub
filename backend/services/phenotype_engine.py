"""
Deterministic phenotype engine: star alleles → phenotype.
Only 6 genes: CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD.
No AI. Returns gene, diplotype, phenotype.
"""
from typing import List, Dict, Any
from backend.config import ALLOWED_GENES


def _count_variant_alleles(gt: str) -> int:
    """Count non-ref alleles from genotype string (0/1, 1/1, etc.)."""
    parts = gt.replace("|", "/").split("/")
    n = 0
    for p in parts:
        p = p.strip()
        if p and p != ".":
            try:
                if int(p) >= 1:
                    n += 1
            except ValueError:
                pass
    return n


def _activity_cyp2c19(variants: List[Dict]) -> tuple[str, str, float]:
    # *2/*3 = 0, *17 = 1.5, *1 = 1
    rs_allele = {"rs4244285": "*2", "rs4986893": "*3", "rs12248560": "*17"}
    n_lof = 0
    n_gain = 0
    for v in variants:
        if v.get("gene") != "CYP2C19":
            continue
        gt = v.get("genotype", "./.")
        c = _count_variant_alleles(gt)
        allele = rs_allele.get(v.get("rs", ""), "*1")
        if allele == "*17":
            n_gain += c
        elif allele in ("*2", "*3"):
            n_lof += c
    n_ref = max(0, 2 - n_lof - n_gain)
    score = n_ref * 1.0 + n_gain * 1.5
    if score == 0:
        return "*2/*2", "PM", 0.0
    if score <= 1:
        return "*1/*2", "IM", 1.0
    if score < 2.5:
        return "*1/*1", "NM", 2.0
    return "*1/*17", "UM", 3.0


def _activity_cyp2c9(variants: List[Dict]) -> tuple[str, str, float]:
    # *2 = 0.5, *3 = 0, *1 = 1
    rs_allele = {"rs1799853": "*2", "rs1057910": "*3"}
    scores = [1.0, 1.0]
    for v in variants:
        if v.get("gene") != "CYP2C9":
            continue
        gt = v.get("genotype", "./.")
        c = _count_variant_alleles(gt)
        allele = rs_allele.get(v.get("rs", ""), "*1")
        a = 0.5 if allele == "*2" else (0.0 if allele == "*3" else 1.0)
        for _ in range(c):
            if scores[0] > scores[1]:
                scores[1] = min(scores[1], a)
            else:
                scores[0] = min(scores[0], a)
    total = sum(scores)
    if total <= 0.5:
        return "*3/*3", "PM", 0.0
    if total <= 1.5:
        return "*1/*3", "IM", 1.0
    return "*1/*1", "NM", 2.0


def _activity_cyp2d6(variants: List[Dict]) -> tuple[str, str, float]:
    # *4/*6 = 0, *10/*41 = 0.5, *1 = 1
    rs_allele = {"rs3892097": "*4", "rs5030655": "*6", "rs1065852": "*10", "rs28371725": "*41"}
    scores = [1.0, 1.0]
    for v in variants:
        if v.get("gene") != "CYP2D6":
            continue
        gt = v.get("genotype", "./.")
        c = _count_variant_alleles(gt)
        allele = rs_allele.get(v.get("rs", ""), "*1")
        a = 0.0 if allele in ("*4", "*6") else (0.5 if allele in ("*10", "*41") else 1.0)
        for _ in range(c):
            if scores[0] > scores[1]:
                scores[1] = min(scores[1], a)
            else:
                scores[0] = min(scores[0], a)
    total = sum(scores)
    if total == 0:
        return "*4/*4", "PM", 0.0
    if total <= 1:
        return "*1/*4", "IM", 1.0
    if total < 2.5:
        return "*1/*1", "NM", 2.0
    return "*1/*1xN", "UM", 3.0


def _activity_slco1b1(variants: List[Dict]) -> tuple[str, str, float]:
    # rs4149056 (c.521T>C) = decreased; rs2306283 = normal
    for v in variants:
        if v.get("gene") != "SLCO1B1":
            continue
        rs = v.get("rs", "")
        gt = v.get("genotype", "./.")
        c = _count_variant_alleles(gt)
        if rs == "rs4149056" and c >= 1:
            if c >= 2:
                return "*5/*5", "Low function", 0.0
            return "*1a/*5", "Intermediate", 1.0
    return "*1a/*1a", "Normal", 2.0


def _activity_tpmt(variants: List[Dict]) -> tuple[str, str, float]:
    # rs1800462, rs1800460, rs1142345 - LoF
    n_lof = 0
    for v in variants:
        if v.get("gene") != "TPMT":
            continue
        c = _count_variant_alleles(v.get("genotype", "./."))
        n_lof += c
    n_lof = min(2, n_lof)
    if n_lof >= 2:
        return "*3A/*3A", "Low activity", 0.0
    if n_lof == 1:
        return "*1/*3A", "Intermediate", 1.0
    return "*1/*1", "Normal", 2.0


def _activity_dpyd(variants: List[Dict]) -> tuple[str, str, float]:
    # rs3918290 *2A, rs55886062 *13 = no function; rs67376798 = decreased
    n_nofunc = 0
    n_dec = 0
    for v in variants:
        if v.get("gene") != "DPYD":
            continue
        rs = v.get("rs", "")
        c = _count_variant_alleles(v.get("genotype", "./."))
        if rs in ("rs3918290", "rs55886062"):
            n_nofunc = max(n_nofunc, c)
        elif rs == "rs67376798":
            n_dec = max(n_dec, c)
    n_nofunc = min(2, n_nofunc)
    activity = 2.0 - n_nofunc - 0.5 * min(2 - n_nofunc, n_dec)
    activity = max(0.0, activity)
    if activity <= 0:
        return "*2A/*2A", "DPD deficient", 0.0
    if activity < 1.5:
        return "*1/*2A", "DPD intermediate", 1.0
    return "*1/*1", "DPD normal", 2.0


def get_phenotype(gene: str, variants: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic mapping: variants for the gene → diplotype, phenotype.
    Returns {gene, diplotype, phenotype, activity_level (0-3 for display)}.
    """
    if gene not in ALLOWED_GENES:
        return {"gene": gene, "diplotype": "*1/*1", "phenotype": "Unknown", "activity_level": 1}

    gene_variants = [v for v in variants if v.get("gene") == gene]
    if gene == "CYP2C19":
        diplotype, phenotype, level = _activity_cyp2c19(gene_variants)
    elif gene == "CYP2C9":
        diplotype, phenotype, level = _activity_cyp2c9(gene_variants)
    elif gene == "CYP2D6":
        diplotype, phenotype, level = _activity_cyp2d6(gene_variants)
    elif gene == "SLCO1B1":
        diplotype, phenotype, level = _activity_slco1b1(gene_variants)
    elif gene == "TPMT":
        diplotype, phenotype, level = _activity_tpmt(gene_variants)
    elif gene == "DPYD":
        diplotype, phenotype, level = _activity_dpyd(gene_variants)
    else:
        diplotype, phenotype, level = "*1/*1", "NM", 2.0

    return {
        "gene": gene,
        "diplotype": diplotype,
        "phenotype": phenotype,
        "activity_level": level,
    }
