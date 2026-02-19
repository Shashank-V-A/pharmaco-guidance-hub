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

// ——— CYP2C9 (warfarin, etc.): *2 rs1799853, *3 rs1057910. CPIC: *1=1, *2=0.5, *3=0. No UM. ———
const CYP2C9_VARIANTS: Record<string, { allele: string; function: string }> = {
  rs1799853: { allele: "*2", function: "Decreased function" },
  rs1057910: { allele: "*3", function: "No function" },
};
const CYP2C9_RSIDS = Object.keys(CYP2C9_VARIANTS);

function cyp2c9AlleleActivity(allele: string): number {
  if (allele === "*1") return 1;
  if (allele === "*2") return 0.5;
  if (allele === "*3") return 0;
  return 0.5;
}

function interpretCYP2C9(variants: VcfVariant[]): {
  diplotype: string;
  phenotype: string;
  activityLevel: number;
  variantRows: VariantRow[];
} {
  const byRsid = new Map<string, VcfVariant>();
  for (const v of variants) byRsid.set(v.rsid, v);

  const variantRows: VariantRow[] = [];
  const alleleScores: number[] = []; // up to 2 alleles

  for (const rsid of CYP2C9_RSIDS) {
    const def = CYP2C9_VARIANTS[rsid];
    const v = byRsid.get(rsid);
    if (!def) continue;
    const gt = v?.genotype ?? "./.";
    const varCount = countVariantAlleles(gt);
    if (varCount === 0) {
      variantRows.push({ rsid, gene: "CYP2C9", allele: "*1", function: "Normal function" });
      alleleScores.push(1);
    } else {
      variantRows.push({ rsid, gene: "CYP2C9", allele: def.allele, function: def.function });
      const a = cyp2c9AlleleActivity(def.allele);
      for (let i = 0; i < varCount; i++) alleleScores.push(a);
    }
  }
  // If we have no variant data, assume *1/*1
  while (alleleScores.length < 2) alleleScores.push(1);
  const score = alleleScores.slice(0, 2).reduce((s, a) => s + a, 0);

  let diplotype = "*1/*1";
  const a1 = alleleScores[0] ?? 1;
  const a2 = alleleScores[1] ?? 1;
  if (a1 === 0 && a2 === 0) diplotype = "*3/*3";
  else if (a1 === 0 && a2 === 0.5) diplotype = "*2/*3";
  else if (a1 === 0.5 && a2 === 0) diplotype = "*2/*3";
  else if (a1 === 0 && a2 === 1) diplotype = "*1/*3";
  else if (a1 === 1 && a2 === 0) diplotype = "*1/*3";
  else if (a1 === 0.5 && a2 === 0.5) diplotype = "*2/*2";
  else if (a1 === 0.5 && a2 === 1) diplotype = "*1/*2";
  else if (a1 === 1 && a2 === 0.5) diplotype = "*1/*2";

  let phenotype: string;
  let activityLevel: number;
  if (score <= 0.5) {
    phenotype = "Poor Metabolizer";
    activityLevel = 0;
  } else if (score <= 1.5) {
    phenotype = "Intermediate Metabolizer";
    activityLevel = 1;
  } else {
    phenotype = "Normal Metabolizer";
    activityLevel = 2;
  }

  return {
    diplotype,
    phenotype,
    activityLevel,
    variantRows: variantRows.length ? variantRows : [{ rsid: "—", gene: "CYP2C9", allele: "*1", function: "Normal function" }],
  };
}

// ——— CYP2D6 (codeine, tamoxifen): *4 rs3892097, *6 rs5030655, *10 rs1065852, *41 rs28371725. *1=1, *4/*6=0, *10/*41=0.5 ———
const CYP2D6_VARIANTS: Record<string, { allele: string; function: string }> = {
  rs3892097: { allele: "*4", function: "No function" },
  rs5030655: { allele: "*6", function: "No function" },
  rs1065852: { allele: "*10", function: "Decreased function" },
  rs28371725: { allele: "*41", function: "Decreased function" },
};
const CYP2D6_RSIDS = Object.keys(CYP2D6_VARIANTS);

function cyp2d6AlleleActivity(allele: string): number {
  if (allele === "*1") return 1;
  if (allele === "*4" || allele === "*6") return 0;
  if (allele === "*10" || allele === "*41") return 0.5;
  return 0.5;
}

function interpretCYP2D6(variants: VcfVariant[]): {
  diplotype: string;
  phenotype: string;
  activityLevel: number;
  variantRows: VariantRow[];
} {
  const byRsid = new Map<string, VcfVariant>();
  for (const v of variants) byRsid.set(v.rsid, v);

  const variantRows: VariantRow[] = [];
  const alleleScores: number[] = [];

  for (const rsid of CYP2D6_RSIDS) {
    const def = CYP2D6_VARIANTS[rsid];
    const v = byRsid.get(rsid);
    if (!def) continue;
    const gt = v?.genotype ?? "./.";
    const varCount = countVariantAlleles(gt);
    if (varCount === 0) {
      variantRows.push({ rsid, gene: "CYP2D6", allele: "*1", function: "Normal function" });
      alleleScores.push(1);
    } else {
      variantRows.push({ rsid, gene: "CYP2D6", allele: def.allele, function: def.function });
      const a = cyp2d6AlleleActivity(def.allele);
      for (let i = 0; i < varCount; i++) alleleScores.push(a);
    }
  }
  while (alleleScores.length < 2) alleleScores.push(1);
  const score = alleleScores.slice(0, 2).reduce((s, x) => s + x, 0);

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

  const alleles = alleleScores.slice(0, 2);
  const names = alleles.map((a) => (a === 0 ? "*4" : a === 0.5 ? "*10" : "*1"));
  const diplotype = (names[0] ?? "*1") + "/" + (names[1] ?? "*1");

  return {
    diplotype,
    phenotype,
    activityLevel,
    variantRows: variantRows.length ? variantRows : [{ rsid: "—", gene: "CYP2D6", allele: "*1", function: "Normal function" }],
  };
}

// ——— HLA-B: abacavir → rs2395029 (HLA-B*57:01); carbamazepine → rs2844682 (HLA-B*15:02). Positive = carrier = toxic risk. ———
const HLA_ABACAVIR_RSID = "rs2395029";
const HLA_CARBAMAZEPINE_RSID = "rs2844682";

function interpretHLA(
  variants: VcfVariant[],
  drugKey: string
): { phenotype: string; activityLevel: number; variantRows: VariantRow[]; positive: boolean } {
  const rsid = /abacavir/i.test(drugKey) ? HLA_ABACAVIR_RSID : HLA_CARBAMAZEPINE_RSID;
  const alleleName = /abacavir/i.test(drugKey) ? "HLA-B*57:01" : "HLA-B*15:02";
  const v = variants.find((x) => x.rsid === rsid);
  const gt = v?.genotype ?? "./.";
  const varCount = countVariantAlleles(gt);
  const positive = varCount >= 1;

  const variantRows: VariantRow[] = v
    ? [{ rsid: v.rsid, gene: "HLA-B", allele: alleleName, function: positive ? "Risk allele present" : "Negative" }]
    : [{ rsid, gene: "HLA-B", allele: alleleName, function: "Not genotyped in this file" }];

  return {
    phenotype: positive ? "Carrier (at-risk)" : "Negative",
    activityLevel: positive ? 0 : 2,
    variantRows,
    positive,
  };
}

// ——— DPYD (fluorouracil): rs3918290 *2A no function, rs55886062 *13 no function, rs67376798 decreased ———
const DPYD_VARIANTS: Record<string, { allele: string; function: string; activity: number }> = {
  rs3918290: { allele: "*2A", function: "No function", activity: 0 },
  rs55886062: { allele: "*13", function: "No function", activity: 0 },
  rs67376798: { allele: "c.2846A>T", function: "Decreased function", activity: 0.5 },
};
const DPYD_RSIDS = Object.keys(DPYD_VARIANTS);

function interpretDPYD(variants: VcfVariant[]): {
  diplotype: string;
  phenotype: string;
  activityLevel: number;
  variantRows: VariantRow[];
} {
  const byRsid = new Map<string, VcfVariant>();
  for (const v of variants) byRsid.set(v.rsid, v);

  const variantRows: VariantRow[] = [];
  let nNoFunc = 0; // no-function allele count (max 2)
  let nDec = 0;     // decreased-function allele count

  for (const rsid of DPYD_RSIDS) {
    const def = DPYD_VARIANTS[rsid];
    const v = byRsid.get(rsid);
    if (!def) continue;
    const gt = v?.genotype ?? "./.";
    const varCount = countVariantAlleles(gt);
    variantRows.push({ rsid, gene: "DPYD", allele: def.allele, function: def.function });
    if (def.activity === 0) nNoFunc = Math.max(nNoFunc, varCount);
    else nDec = Math.max(nDec, varCount);
  }
  // Activity: 2 alleles; no-function subtracts 1 per allele, decreased subtracts 0.5 per allele. Conservative: nNoFunc caps at 2.
  nNoFunc = Math.min(2, nNoFunc);
  let activitySum = 2 - nNoFunc - 0.5 * Math.min(2 - nNoFunc, nDec);
  activitySum = Math.max(0, activitySum);

  let phenotype: string;
  let activityLevel: number;
  if (activitySum <= 0) {
    phenotype = "DPD Deficient";
    activityLevel = 0;
  } else if (activitySum < 1.5) {
    phenotype = "DPD Intermediate";
    activityLevel = 1;
  } else {
    phenotype = "DPD Normal";
    activityLevel = 2;
  }

  const diplotype = activitySum <= 0 ? "*2A/*2A or variant/variant" : activitySum < 1.5 ? "Variant carrier" : "*1/*1";

  return {
    diplotype,
    phenotype,
    activityLevel,
    variantRows: variantRows.length ? variantRows : [{ rsid: "—", gene: "DPYD", allele: "Normal", function: "Normal function" }],
  };
}

/** Drug → primary gene for analysis */
export const DRUG_GENE_MAP: Record<string, string> = {
  clopidogrel: "CYP2C19",
  codeine: "CYP2D6",
  warfarin: "CYP2C9",
  tamoxifen: "CYP2D6",
  simvastatin: "CYP2C19",
  abacavir: "HLA-B",
  carbamazepine: "HLA-B",
  fluorouracil: "DPYD",
};

/** Rsids to extract from VCF per gene (HLA-B is drug-specific). */
const GENE_RSIDS: Record<string, string[]> = {
  CYP2C19: CYP2C19_RSIDS,
  CYP2C9: CYP2C9_RSIDS,
  CYP2D6: CYP2D6_RSIDS,
  "HLA-B": [HLA_ABACAVIR_RSID, HLA_CARBAMAZEPINE_RSID],
  DPYD: DPYD_RSIDS,
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

function getRiskForCYP2C9(
  drug: string,
  phenotype: string,
  activityLevel: number
): { risk: RiskLevel; severity: string; confidence: number } {
  if (phenotype === "Poor Metabolizer") {
    return {
      risk: "toxic",
      severity: `Poor metabolizer — significantly reduced metabolism of ${drug}. High bleeding risk with warfarin. Avoid or use alternative; if essential, use very low dose with close monitoring per CPIC.`,
      confidence: 92,
    };
  }
  if (phenotype === "Intermediate Metabolizer") {
    return {
      risk: "adjust",
      severity: `Intermediate metabolizer — reduced metabolism of ${drug}. Consider dose reduction (e.g. warfarin) per CPIC guidelines.`,
      confidence: 88,
    };
  }
  return {
    risk: "safe",
    severity: `Normal metabolizer — standard dosing of ${drug} is typically appropriate based on CYP2C9 genotype.`,
    confidence: 90,
  };
}

function getRiskForCYP2D6(
  drug: string,
  phenotype: string,
  activityLevel: number
): { risk: RiskLevel; severity: string; confidence: number } {
  if (phenotype === "Poor Metabolizer") {
    return {
      risk: "ineffective",
      severity: `Poor metabolizer — little or no conversion to active metabolite for ${drug}. Consider alternative (e.g. non-codeine analgesic or alternative to tamoxifen) per CPIC.`,
      confidence: 90,
    };
  }
  if (phenotype === "Intermediate Metabolizer") {
    return {
      risk: "adjust",
      severity: `Intermediate metabolizer — reduced metabolism of ${drug}. Consider dose adjustment or alternative per CPIC guidelines.`,
      confidence: 85,
    };
  }
  if (phenotype === "Ultrarapid Metabolizer") {
    return {
      risk: "adjust",
      severity: `Ultrarapid metabolizer — increased conversion to active metabolite. Monitor for toxicity; consider dose reduction per CPIC.`,
      confidence: 82,
    };
  }
  return {
    risk: "safe",
    severity: `Normal metabolizer — standard dosing of ${drug} is typically appropriate based on CYP2D6 genotype.`,
    confidence: 88,
  };
}

function getRiskForHLA(drugKey: string, positive: boolean): { risk: RiskLevel; severity: string; confidence: number } {
  const drug = drugKey.charAt(0).toUpperCase() + drugKey.slice(1);
  if (positive) {
    if (/abacavir/i.test(drugKey)) {
      return {
        risk: "toxic",
        severity: `HLA-B*57:01 positive — high risk of abacavir hypersensitivity. Do not use abacavir. Use alternative antiretroviral per CPIC/FDA.`,
        confidence: 98,
      };
    }
    return {
      risk: "toxic",
      severity: `HLA-B*15:02 positive — increased risk of carbamazepine-induced SJS/TEN. Avoid carbamazepine unless benefits clearly outweigh risks; consider alternative per CPIC.`,
      confidence: 95,
    };
  }
  return {
    risk: "safe",
    severity: `HLA risk allele negative — standard use of ${drug} is appropriate from a pharmacogenomic standpoint.`,
    confidence: 95,
  };
}

function getRiskForDPYD(
  drug: string,
  phenotype: string,
  activityLevel: number
): { risk: RiskLevel; severity: string; confidence: number } {
  if (phenotype === "DPD Deficient" || activityLevel === 0) {
    return {
      risk: "toxic",
      severity: `DPD deficient — high risk of severe fluoropyrimidine toxicity. Do not use full dose; consider alternative or substantial dose reduction with DPYD-guided dosing per CPIC.`,
      confidence: 95,
    };
  }
  if (phenotype === "DPD Intermediate" || activityLevel === 1) {
    return {
      risk: "adjust",
      severity: `DPD intermediate — increased toxicity risk with fluorouracil/capecitabine. Start with 50% dose reduction and titrate per CPIC.`,
      confidence: 88,
    };
  }
  return {
    risk: "safe",
    severity: `DPD normal — standard dosing of ${drug} is appropriate based on DPYD genotype.`,
    confidence: 90,
  };
}

/** When no variants found in VCF for the gene, return a "no genotype" result instead of assuming normal. */
function noGenotypeResult(
  gene: string,
  drugName: string
): PGxInterpretation {
  return {
    gene,
    diplotype: "—",
    phenotype: "Genotype not determined",
    activityLevel: 1,
    variants: [{ rsid: "—", gene, allele: "—", function: "No variants found in file for this gene" }],
    risk: "adjust",
    severity: `The uploaded file did not contain genotype data for ${gene}. Order ${gene} testing or upload a VCF that includes the relevant markers for ${drugName}.`,
    confidence: 0,
  };
}

/**
 * Run pharmacogenomic interpretation from VCF variants and selected drug.
 * All supported genes (CYP2C19, CYP2C9, CYP2D6, HLA-B, DPYD) use real VCF-derived genotype and CPIC-style phenotype/risk.
 */
export function interpretFromVcf(
  vcfVariants: VcfVariant[],
  drugKey: string
): PGxInterpretation {
  const gene = DRUG_GENE_MAP[drugKey] ?? "CYP2C19";
  const drugName = drugKey.charAt(0).toUpperCase() + drugKey.slice(1);

  if (vcfVariants.length === 0) {
    return noGenotypeResult(gene, drugName);
  }

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

  if (gene === "CYP2C9") {
    const cyp = interpretCYP2C9(vcfVariants);
    const { risk, severity, confidence } = getRiskForCYP2C9(drugName, cyp.phenotype, cyp.activityLevel);
    return {
      gene: "CYP2C9",
      diplotype: cyp.diplotype,
      phenotype: cyp.phenotype,
      activityLevel: cyp.activityLevel,
      variants: cyp.variantRows,
      risk,
      severity,
      confidence,
    };
  }

  if (gene === "CYP2D6") {
    const cyp = interpretCYP2D6(vcfVariants);
    const { risk, severity, confidence } = getRiskForCYP2D6(drugName, cyp.phenotype, cyp.activityLevel);
    return {
      gene: "CYP2D6",
      diplotype: cyp.diplotype,
      phenotype: cyp.phenotype,
      activityLevel: cyp.activityLevel,
      variants: cyp.variantRows,
      risk,
      severity,
      confidence,
    };
  }

  if (gene === "HLA-B") {
    const hla = interpretHLA(vcfVariants, drugKey);
    const { risk, severity, confidence } = getRiskForHLA(drugKey, hla.positive);
    return {
      gene: "HLA-B",
      diplotype: hla.positive ? "Carrier" : "Non-carrier",
      phenotype: hla.phenotype,
      activityLevel: hla.activityLevel,
      variants: hla.variantRows,
      risk,
      severity,
      confidence,
    };
  }

  if (gene === "DPYD") {
    const dpyd = interpretDPYD(vcfVariants);
    const { risk, severity, confidence } = getRiskForDPYD(drugName, dpyd.phenotype, dpyd.activityLevel);
    return {
      gene: "DPYD",
      diplotype: dpyd.diplotype,
      phenotype: dpyd.phenotype,
      activityLevel: dpyd.activityLevel,
      variants: dpyd.variantRows,
      risk,
      severity,
      confidence,
    };
  }

  // Only if gene is not in our map (should not happen for configured drugs)
  return {
    gene,
    diplotype: "*1/*1",
    phenotype: "Normal Metabolizer",
    activityLevel: 2,
    variants: [{ rsid: "—", gene, allele: "*1", function: "Normal function" }],
    risk: "safe",
    severity: `Gene ${gene} is not yet implemented for genotype-based interpretation. Consult clinical guidelines for ${drugName}.`,
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
 * HLA-B is drug-specific: abacavir → HLA-B*57:01 (rs2395029), carbamazepine → HLA-B*15:02 (rs2844682).
 */
export function getRsidsForDrug(drugKey: string): string[] {
  const gene = DRUG_GENE_MAP[drugKey] ?? "CYP2C19";
  if (gene === "HLA-B") {
    return /abacavir/i.test(drugKey) ? [HLA_ABACAVIR_RSID] : [HLA_CARBAMAZEPINE_RSID];
  }
  return GENE_RSIDS[gene] ?? CYP2C19_RSIDS;
}
