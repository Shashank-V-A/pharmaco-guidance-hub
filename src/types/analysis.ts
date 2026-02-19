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

/** Optional confidence breakdown (sum = confidence_score). */
export interface ConfidenceBreakdown {
  evidence_weight: number;
  variant_completeness: number;
  parsing_integrity: number;
  diplotype_clarity: number;
}

export interface AnalysisResult {
  drug: string;
  fileName: string;
  /** Set when backend returns patient_id (for PDF report). */
  patientId?: string;
  risk: RiskLevel;
  severity: string;
  confidence: number;
  /** Optional breakdown whose sum equals confidence (0–1 scale in API, displayed as %). */
  confidenceBreakdown?: ConfidenceBreakdown;
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
