/**
 * Pharmacogenomic logic: gene definitions, genotype → diplotype → phenotype,
 * drug–gene mapping, and risk/severity for GeneX analysis.
 * Based on CPIC-style allele functionality and phenotype classification.
 */

import type { VariantRow } from "@/types/analysis";
import type { RiskLevel } from "@/components/RiskBadge";
import type { VcfVariant } from "./vcfParser";

// CYP2C19: key variants and star alleles (simplified)
const CYP2C19_VARIANTS: Record<
  string,
  { allele: string; function: string }
> = {
  rs4244285: { allele: "*2", function: "No function" },
  rs4986893: { allele: "*3", function: "No function" },
  rs12248560: { allele: "*17", function: "Increased function" },
};

const CYP2C19_RSIDS = Object.keys(CYP2C19_VARIANTS);

// Activity score per allele (CPIC-style): *1=1, *17=1.5, *2/*3=0
function cyp2c19AlleleActivity(allele: string): number {
  if (allele === "*1" || allele === "*1A" || allele === "*1B") return 1;
  if (allele === "*17") return 1.5;
  if (allele === "*2" || allele === "*3") return 0;
  return 0.5; // unknown, conservative
}

/** Count variant alleles (0, 1, or 2) from genotype string */
function countVariantAlleles(gt: string): number {
  const parts = gt.split(/[/|]/).map((x) => (x === "." ? NaN : parseInt(x, 10)));
  return parts.filter((p) => !Number.isNaN(p) && p >= 1).length;
}

/** Infer diplotype and phenotype from CYP2C19 VCF variants */
function interpretCYP2C19(variants: VcfVariant[]): {
  diplotype: string;
  phenotype: string;
  activityLevel: number;
  variantRows: VariantRow[];
} {
  const byRsid = new Map<string, VcfVariant>();
  for (const v of variants) {
    byRsid.set(v.rsid, v);
  }

  const variantRows: VariantRow[] = [];
  let nLoF = 0;  // loss-of-function (*2, *3) variant allele count
  let nGain = 0; // gain (*17) variant allele count

  for (const rsid of CYP2C19_RSIDS) {
    const def = CYP2C19_VARIANTS[rsid];
    const v = byRsid.get(rsid);
    if (!def) continue;

    const gt = v?.genotype ?? "./.";
    const varCount = countVariantAlleles(gt);

    if (varCount === 0) {
      variantRows.push({
        rsid,
        gene: "CYP2C19",
        allele: "*1",
        function: "Normal function",
      });
    } else {
      variantRows.push({
        rsid,
        gene: "CYP2C19",
        allele: def.allele,
        function: def.function,
      });
      if (def.allele === "*17") nGain += varCount;
      else nLoF += varCount; // *2 or *3
    }
  }

  const nRef = Math.max(0, 2 - nLoF - nGain);
  const score = nRef * 1 + nGain * 1.5; // *1=1, *17=1.5, *2/*3=0

  let diplotype: string;
  if (nLoF >= 2) diplotype = "*2/*2";
  else if (nLoF === 1 && nGain >= 2) diplotype = "*2/*17";
  else if (nLoF === 1 && nGain === 1) diplotype = "*2/*17";
  else if (nLoF === 1) diplotype = "*1/*2";
  else if (nGain >= 2) diplotype = "*17/*17";
  else if (nGain === 1) diplotype = "*1/*17";
  else diplotype = "*1/*1";

  let phenotype: string;
  let activityLevel: number;
  if (score === 0) {
    phenotype = "Poor Metabolizer";
    activityLevel = 0;
  } else if (score <= 1) {
    phenotype = "Intermediate Metabolizer";
    activityLevel = 1;
  } else if (score < 2.5) {
    phenotype = "Normal Metabolizer";
    activityLevel = 2;
  } else {
    phenotype = "Ultrarapid Metabolizer";
    activityLevel = 3;
  }

  return {
    diplotype,
    phenotype,
    activityLevel,
    variantRows: variantRows.length ? variantRows : [
      { rsid: "—", gene: "CYP2C19", allele: "*1", function: "Normal function" },
    ],
  };
}

/** Drug → primary gene for analysis */
export const DRUG_GENE_MAP: Record<string, string> = {
  clopidogrel: "CYP2C19",
  codeine: "CYP2D6",
  warfarin: "CYP2C9",
  tamoxifen: "CYP2D6",
  simvastatin: "CYP2C19", // also SLCO1B1; we use CYP2C19 for demo
  abacavir: "HLA-B",
  carbamazepine: "HLA-B",
  fluorouracil: "DPYD",
};

/** Rsids to extract from VCF per gene */
const GENE_RSIDS: Record<string, string[]> = {
  CYP2C19: CYP2C19_RSIDS,
  CYP2D6: [], // would need different handling (copy number, etc.)
  CYP2C9: [],
  "HLA-B": [],
  DPYD: [],
};

export interface PGxInterpretation {
  gene: string;
  diplotype: string;
  phenotype: string;
  activityLevel: number;
  variants: VariantRow[];
  risk: RiskLevel;
  severity: string;
  confidence: number;
}

/**
 * Run pharmacogenomic interpretation from VCF variants and selected drug.
 * Returns interpretation for the drug's primary gene (CYP2C19 supported fully).
 */
export function interpretFromVcf(
  vcfVariants: VcfVariant[],
  drugKey: string
): PGxInterpretation {
  const gene = DRUG_GENE_MAP[drugKey] ?? "CYP2C19";
  const drugName = drugKey.charAt(0).toUpperCase() + drugKey.slice(1);

  if (gene === "CYP2C19") {
    const cyp = interpretCYP2C19(vcfVariants);
    const { risk, severity, confidence } = getRiskForCYP2C19(
      drugName,
      cyp.phenotype,
      cyp.activityLevel
    );
    return {
      gene: "CYP2C19",
      diplotype: cyp.diplotype,
      phenotype: cyp.phenotype,
      activityLevel: cyp.activityLevel,
      variants: cyp.variantRows,
      risk,
      severity,
      confidence,
    };
  }

  // Fallback for other genes: no variants in VCF → report "no genotype" or default
  return {
    gene,
    diplotype: "*1/*1",
    phenotype: "Normal Metabolizer",
    activityLevel: 2,
    variants: [
      { rsid: "—", gene, allele: "*1", function: "Normal function" },
    ],
    risk: "safe",
    severity: `No pharmacogenomic variants for ${gene} in this file. Default phenotype assumed. Consult clinical guidelines for ${drugName}.`,
    confidence: 50,
  };
}

function getRiskForCYP2C19(
  drug: string,
  phenotype: string,
  activityLevel: number
): { risk: RiskLevel; severity: string; confidence: number } {
  const isClopidogrel = /clopidogrel/i.test(drug);
  const isProdrug = isClopidogrel; // drugs requiring activation by CYP2C19

  if (phenotype === "Poor Metabolizer") {
    if (isProdrug) {
      return {
        risk: "adjust",
        severity:
          "Poor metabolizer — significantly reduced drug activation. Consider alternative therapy (e.g., prasugrel or ticagrelor for antiplatelet therapy).",
        confidence: 92,
      };
    }
    return {
      risk: "adjust",
      severity: `Poor metabolizer — altered metabolism of ${drug}. Consider dose adjustment or alternative based on CPIC guidelines.`,
      confidence: 88,
    };
  }

  if (phenotype === "Intermediate Metabolizer") {
    if (isProdrug) {
      return {
        risk: "adjust",
        severity:
          "Intermediate metabolizer — reduced drug activation expected. Consider alternative antiplatelet therapy or monitor response.",
        confidence: 87,
      };
    }
    return {
      risk: "adjust",
      severity: `Intermediate metabolizer — may have reduced metabolism of ${drug}. Consider dose adjustment per CPIC guidelines.`,
      confidence: 85,
    };
  }

  if (phenotype === "Ultrarapid Metabolizer") {
    if (isProdrug) {
      return {
        risk: "safe",
        severity:
          "Ultrarapid metabolizer — increased activation possible; standard dosing often appropriate. Monitor for efficacy.",
        confidence: 82,
      };
    }
    return {
      risk: "safe",
      severity: `Ultrarapid metabolizer — increased metabolism of ${drug}. Standard dosing typically appropriate.`,
      confidence: 80,
    };
  }

  // Normal Metabolizer
  return {
    risk: "safe",
    severity: `Normal metabolizer — standard dosing of ${drug} is typically appropriate based on CYP2C19 genotype.`,
    confidence: 90,
  };
}

/**
 * Get list of rsids to extract from VCF for a given drug.
 */
export function getRsidsForDrug(drugKey: string): string[] {
  const gene = DRUG_GENE_MAP[drugKey] ?? "CYP2C19";
  return GENE_RSIDS[gene] ?? CYP2C19_RSIDS;
}
