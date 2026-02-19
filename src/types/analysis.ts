import type { RiskLevel } from "@/components/RiskBadge";

export interface VariantRow {
  rsid: string;
  gene: string;
  allele: string;
  function: string;
}

export interface ExplanationItem {
  title: string;
  content: string;
}

export interface AnalysisResult {
  drug: string;
  fileName: string;
  risk: RiskLevel;
  severity: string;
  confidence: number;
  gene: string;
  diplotype: string;
  phenotype: string;
  activityLevel: number;
  variants: VariantRow[];
  explanations: ExplanationItem[];
  audit: ExplanationItem[];
}
