import type { AnalysisResult } from "@/types/analysis";
import type { RiskLevel } from "@/components/RiskBadge";

const GENE_INFO: Record<
  string,
  { diplotype: string; phenotype: string; activityLevel: number; variants: Array<{ rsid: string; allele: string; function: string }> }
> = {
  CYP2D6: {
    diplotype: "*1/*2",
    phenotype: "Intermediate Metabolizer",
    activityLevel: 1,
    variants: [
      { rsid: "rs1065852", allele: "*2", function: "Reduced function" },
      { rsid: "rs28371725", allele: "*1", function: "Normal function" },
    ],
  },
  CYP2C9: {
    diplotype: "*1/*3",
    phenotype: "Intermediate Metabolizer",
    activityLevel: 1,
    variants: [
      { rsid: "rs1057910", allele: "*3", function: "No function" },
      { rsid: "rs1799853", allele: "*1", function: "Normal function" },
    ],
  },
  CYP2C19: {
    diplotype: "*1/*2",
    phenotype: "Intermediate Metabolizer",
    activityLevel: 1,
    variants: [
      { rsid: "rs4244285", allele: "*2", function: "No function" },
      { rsid: "rs4986893", allele: "*1", function: "Normal function" },
    ],
  },
  SLCO1B1: {
    diplotype: "*1a/*5",
    phenotype: "Intermediate function",
    activityLevel: 1,
    variants: [
      { rsid: "rs4149056", allele: "*5", function: "Decreased function" },
      { rsid: "rs2306283", allele: "*1a", function: "Normal function" },
    ],
  },
  TPMT: {
    diplotype: "*1/*1",
    phenotype: "Normal Metabolizer",
    activityLevel: 2,
    variants: [
      { rsid: "rs1800462", allele: "*1", function: "Normal function" },
      { rsid: "rs1800460", allele: "*1", function: "Normal function" },
    ],
  },
  DPYD: {
    diplotype: "*1/*2A",
    phenotype: "Intermediate activity",
    activityLevel: 1,
    variants: [
      { rsid: "rs3918290", allele: "*2A", function: "No function" },
      { rsid: "rs55886062", allele: "*1", function: "Normal function" },
    ],
  },
  "HLA-B": {
    diplotype: "B*57:01 negative",
    phenotype: "Low risk",
    activityLevel: 2,
    variants: [
      { rsid: "rs2395029", allele: "G", function: "Tag for B*57:01" },
      { rsid: "rs3093726", allele: "T", function: "Tag for B*57:01" },
    ],
  },
  "HLA-A": {
    diplotype: "A*31:01 negative",
    phenotype: "Low risk",
    activityLevel: 2,
    variants: [
      { rsid: "rs1061235", allele: "T", function: "Tag for A*31:01" },
      { rsid: "rs2844682", allele: "C", function: "Tag for A*31:01" },
    ],
  },
};

const DEFAULT_GENE = {
  diplotype: "*1/*2",
  phenotype: "Intermediate Metabolizer",
  activityLevel: 1,
  variants: [
    { rsid: "rs4244285", allele: "*2", function: "No function" },
    { rsid: "rs4986893", allele: "*1", function: "Normal function" },
  ],
};

/** Build risk and severity from drug + gene + mock phenotype (for demo). */
function getRiskForGene(gene: string, activityLevel: number): { risk: RiskLevel; severity: string } {
  if (activityLevel >= 2)
    return {
      risk: "safe",
      severity: "Normal metabolizer — standard dosing recommended. No dose adjustment required based on genotype.",
    };
  if (activityLevel === 1)
    return {
      risk: "adjust",
      severity:
        "Intermediate metabolizer — consider dose adjustment or therapeutic alternative. Monitor response and adverse effects.",
    };
  return {
    risk: "toxic",
    severity:
      "Poor metabolizer / high risk — avoid or use alternative drug. If no alternative, use reduced dose with close monitoring.",
  };
}

export function buildAnalysisResult(
  drug: string,
  gene: string,
  fileName: string
): AnalysisResult {
  const baseInfo = GENE_INFO[gene] ?? DEFAULT_GENE;
  const info = {
    ...baseInfo,
    variants: baseInfo.variants.map((v) => ({ ...v, gene })),
  };
  const { risk, severity } = getRiskForGene(gene, info.activityLevel);
  const variants = info.variants;

  return {
    drug: drug.charAt(0).toUpperCase() + drug.slice(1),
    fileName,
    risk,
    severity,
    confidence: 85 + Math.floor(Math.random() * 12),
    gene,
    diplotype: info.diplotype,
    phenotype: info.phenotype,
    activityLevel: info.activityLevel,
    variants,
    explanations: [
      {
        title: "Clinical Recommendation",
        content: `Based on ${gene} ${info.phenotype} status, ${severity.split(" — ")[0].toLowerCase()}. ${severity.split(" — ")[1] ?? ""}`,
      },
      {
        title: "Pharmacokinetic Impact",
        content: `${gene} is a key enzyme for this drug. Your phenotype (${info.phenotype}) influences metabolism and response. This analysis uses CPIC guideline logic.`,
      },
      {
        title: "Evidence Summary",
        content:
          "Recommendations align with CPIC evidence levels. Genetic information should be used together with clinical judgment and monitoring.",
      },
    ],
    audit: [
      {
        title: "Rule Applied",
        content: `CPIC Guideline for ${drug} and ${gene}. Risk level derived from genotype-phenotype translation.`,
      },
      {
        title: "Gene Detected",
        content: `${gene} — genotype inferred from uploaded report. Phenotype: ${info.phenotype}.`,
      },
      {
        title: "CPIC Evidence Level",
        content:
          "Level A — Prescribing action recommended. Genetic information should inform dosing or drug choice when supported by guidelines.",
      },
    ],
  };
}
