"""
VCF parsing with cyvcf2. Extract GENE (from INFO or rsid mapping), STAR, RS, Genotype.
Filter ONLY the 6 allowed genes. Graceful handling of missing INFO.
"""
import io
from typing import List, Dict, Any, Optional, Set

try:
    import cyvcf2
except ImportError:
    cyvcf2 = None

from backend.config import ALLOWED_GENES

# rsid → gene mapping for the 6 genes (common pharmacogenomic markers)
RSID_TO_GENE: Dict[str, str] = {
    # CYP2C19
    "rs4244285": "CYP2C19",
    "rs4986893": "CYP2C19",
    "rs12248560": "CYP2C19",
    # CYP2C9
    "rs1799853": "CYP2C9",
    "rs1057910": "CYP2C9",
    # CYP2D6
    "rs3892097": "CYP2D6",
    "rs5030655": "CYP2D6",
    "rs1065852": "CYP2D6",
    "rs28371725": "CYP2D6",
    # SLCO1B1
    "rs4149056": "SLCO1B1",
    "rs2306283": "SLCO1B1",
    # TPMT
    "rs1800462": "TPMT",
    "rs1800460": "TPMT",
    "rs1142345": "TPMT",
    # DPYD
    "rs3918290": "DPYD",
    "rs55886062": "DPYD",
    "rs67376798": "DPYD",
}


def _get_rsid(record: Any) -> Optional[str]:
    """Extract first rs-prefixed ID from record."""
    if not record.ID:
        return None
    for x in str(record.ID).split(";"):
        x = x.strip()
        if x.startswith("rs"):
            return x
    return str(record.ID) if record.ID != "." else None


def _get_gene_from_info(record: Any) -> Optional[str]:
    """Get GENE from INFO if present."""
    if record.INFO.get("GENE"):
        return str(record.INFO.get("GENE")).strip()
    return None


def _get_star_from_info(record: Any) -> Optional[str]:
    """Get STAR allele from INFO if present."""
    for key in ("STAR", "STAR_ALLELE", "ALLELE"):
        if record.INFO.get(key):
            return str(record.INFO.get(key)).strip()
    return None


def _get_gt(record: Any) -> str:
    """Genotype from first sample; use | or /."""
    if record.num_samples == 0:
        return "./."
    try:
        gt = record.genotypes[0]
        # cyvcf2 returns list e.g. [0, 1, 0] for 0/1 with phased
        if len(gt) >= 2:
            a, b = int(gt[0]), int(gt[1])
            sep = "|" if len(gt) > 2 and gt[2] else "/"
            if a == -1 or b == -1:
                return "./."
            return f"{a}{sep}{b}"
    except Exception:
        pass
    return "./."


def parse_vcf(vcf_content: bytes, max_size: int = 5 * 1024 * 1024) -> tuple[List[Dict[str, Any]], bool, str]:
    """
    Parse VCF content. Returns (variants, parsing_success, gene_coverage).
    variants: list of {gene, star, rs, genotype}
    Only includes variants for ALLOWED_GENES.
    """
    if cyvcf2 is None:
        return [], False, "cyvcf2 not installed"

    if len(vcf_content) > max_size:
        return [], False, "VCF exceeds max size"

    variants: List[Dict[str, Any]] = []
    genes_seen: Set[str] = set()

    try:
        # cyvcf2 expects path or file-like; use temp file or BytesIO
        # cyvcf2.VCF() typically wants a path. For bytes we write to a temp file.
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".vcf", delete=False) as f:
            f.write(vcf_content)
            path = f.name
        try:
            vcf = cyvcf2.VCF(path)
            for record in vcf:
                rsid = _get_rsid(record)
                gene = _get_gene_from_info(record) or (RSID_TO_GENE.get(rsid) if rsid else None)
                if not gene or gene not in ALLOWED_GENES:
                    continue
                genes_seen.add(gene)
                star = _get_star_from_info(record)
                gt = _get_gt(record)
                variants.append({
                    "gene": gene,
                    "star": star,
                    "rs": rsid,
                    "genotype": gt,
                })
            vcf.close()
        finally:
            import os
            try:
                os.unlink(path)
            except OSError:
                pass
    except Exception as e:
        return [], False, str(e)[:200]

    gene_coverage = ",".join(sorted(genes_seen)) if genes_seen else "none"
    return variants, True, gene_coverage
