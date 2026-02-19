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

/** LLM-generated content for summary and explanations */
export interface LLMContent {
  summary: string;
  mechanicalExplanation: string;
  biologicalReasoning: string;
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
  /** LLM-generated summary and explanations (optional) */
  llm?: LLMContent;
}
