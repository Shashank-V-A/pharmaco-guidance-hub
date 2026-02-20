/**
 * Frontend API client. No medical logic — calls backend POST /analyze only.
 */
import type { AnalysisResult } from "@/types/analysis";

const envBase = (import.meta.env.VITE_API_BASE_URL ?? "").toString().trim().replace(/\/$/, "");
const API_BASE = envBase && envBase.includes("localhost") ? envBase : "/api";

/** Optional confidence breakdown (sum equals confidence_score). */
export interface ConfidenceBreakdownApi {
  evidence_weight: number;
  variant_completeness: number;
  parsing_integrity: number;
  diplotype_clarity: number;
}

/** Optional audit trail (only on successful analyze). */
export interface AuditTrailApi {
  gene_detected: string;
  phenotype_determined: string;
  rule_applied: string;
  cpic_evidence_level: string;
  confidence_breakdown?: ConfidenceBreakdownApi | null;
}

export interface AnalyzeApiResponse {
  patient_id: string; // Backend never null; UUID if not provided
  drug: string;
  timestamp: string;
  risk_assessment: {
    risk_label: string;
    severity: string;
    confidence_score: number;
  };
  pharmacogenomic_profile: {
    gene: string;
    diplotype: string;
    phenotype: string;
    detected_variants: Array<{
      gene: string;
      star?: string | null;
      rs?: string | null;
      genotype: string;
    }>;
  };
  clinical_recommendation: {
    dose_adjustment: string;
    alternative_options: string;
    guideline_reference: string;
  };
  llm_generated_explanation: {
    summary: string;
    mechanism_explanation: string;
    variant_references: string[];
    clinical_rationale: string;
  };
  quality_metrics: {
    vcf_parsing_success: boolean;
    gene_coverage: string;
    rule_engine_status: string;
  };
  audit_trail?: AuditTrailApi | null;
}

export async function analyzeVcf(
  file: File,
  drugName: string,
  patientId?: string | null,
  explanationMode?: "clinician" | "research"
): Promise<AnalyzeApiResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("drug_name", drugName.trim().toUpperCase());
  if (patientId != null && patientId !== "") {
    form.append("patient_id", patientId);
  }
  form.append("explanation_mode", explanationMode === "research" ? "research" : "clinician");
  const url = `${API_BASE}/analyze`;
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.detail ?? text;
    } catch {
      // use text
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<AnalyzeApiResponse>;
}

/** Response from POST /detect-drug (image-based drug detection; input enhancement only). */
export interface DetectDrugResponse {
  detected_drug: string;
  confidence: number;
  raw_text?: string;
}

/** Detect drug name from image (label photo). Does not run analysis. */
export async function detectDrug(image: File): Promise<DetectDrugResponse> {
  const form = new FormData();
  form.append("image", image);
  const url = `${API_BASE}/detect-drug`;
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.details ?? j.detail ?? j.error ?? text;
    } catch {
      // use text
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<DetectDrugResponse>;
}

/** Download clinical report PDF for a patient (last successful analysis). */
export async function fetchReport(patientId: string): Promise<Blob> {
  const url = `${API_BASE}/report/${encodeURIComponent(patientId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error("No report found for this patient");
    throw new Error("Failed to download report");
  }
  return res.blob();
}

/** Map backend risk_label to frontend RiskLevel */
function riskLabelToLevel(riskLabel: string): "safe" | "adjust" | "toxic" | "ineffective" {
  const s = (riskLabel || "").toLowerCase();
  if (s === "safe") return "safe";
  if (s === "adjust dosage" || s === "adjust") return "adjust";
  if (s === "ineffective") return "ineffective";
  if (s === "toxic") return "toxic";
  return "safe";
}

/** Phenotype → activity level 0–3 for ActivityBar */
function phenotypeToActivityLevel(phenotype: string): number {
  const p = (phenotype || "").toUpperCase();
  if (p.includes("PM") || p.includes("POOR") || p.includes("LOW") && p.includes("FUNCTION") || p.includes("DEFICIENT") || p.includes("LOW ACTIVITY")) return 0;
  if (p.includes("IM") || p.includes("INTERMEDIATE") || p.includes("DPD INTERMEDIATE")) return 1;
  if (p.includes("UM") || p.includes("ULTRARAPID")) return 3;
  return 2; // NM, Normal, etc.
}

/** Map API response to UI AnalysisResult (no medical logic in frontend). */
export function mapApiResponseToResult(
  api: AnalyzeApiResponse,
  fileName: string
): AnalysisResult {
  const profile = api.pharmacogenomic_profile;
  const risk = api.risk_assessment;
  const rec = api.clinical_recommendation;
  const llm = api.llm_generated_explanation;
  const variants = (profile.detected_variants || []).map((v) => ({
    rsid: v.rs ?? "—",
    gene: v.gene,
    allele: v.star ?? "—",
    function: "—",
  }));
  const audit = api.audit_trail
    ? [
        { title: "Gene detected", content: api.audit_trail.gene_detected },
        { title: "Phenotype determined", content: api.audit_trail.phenotype_determined },
        { title: "Rule applied", content: api.audit_trail.rule_applied },
        { title: "CPIC evidence level", content: api.audit_trail.cpic_evidence_level },
        ...(api.quality_metrics?.gene_coverage
          ? [{ title: "Gene coverage", content: api.quality_metrics.gene_coverage }]
          : []),
      ]
    : [
        { title: "Guideline", content: rec.guideline_reference },
        { title: "Gene coverage", content: api.quality_metrics?.gene_coverage ?? "—" },
      ];
  return {
    drug: api.drug,
    fileName,
    patientId: api.patient_id,
    risk: riskLabelToLevel(risk.risk_label),
    severity: risk.severity + ": " + rec.dose_adjustment,
    confidence: Math.round((risk.confidence_score ?? 0) * 100),
    confidenceBreakdown: api.audit_trail?.confidence_breakdown
      ? {
          evidence_weight: api.audit_trail.confidence_breakdown.evidence_weight,
          variant_completeness: api.audit_trail.confidence_breakdown.variant_completeness,
          parsing_integrity: api.audit_trail.confidence_breakdown.parsing_integrity,
          diplotype_clarity: api.audit_trail.confidence_breakdown.diplotype_clarity,
        }
      : undefined,
    gene: profile.gene,
    diplotype: profile.diplotype,
    phenotype: profile.phenotype,
    activityLevel: phenotypeToActivityLevel(profile.phenotype),
    variants,
    explanations: [
      { title: "Dose adjustment", content: rec.dose_adjustment },
      { title: "Alternative options", content: rec.alternative_options },
    ],
    audit,
    llm: {
      summary: llm.summary,
      mechanicalExplanation: llm.mechanism_explanation,
      biologicalReasoning: llm.clinical_rationale,
    },
  };
}
