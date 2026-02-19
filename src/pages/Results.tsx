import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, Shield, Dna, Brain, Activity, FileSearch, ArrowRight, Copy, Check, FileJson, FileText, ChevronDown, ChevronUp, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { RiskBadge } from "@/components/RiskBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { ConfidenceBreakdownBar } from "@/components/ConfidenceBreakdownBar";
import { VariantTable } from "@/components/VariantTable";
import { ActivityBar } from "@/components/ActivityBar";
import { ExplanationAccordion } from "@/components/ExplanationAccordion";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";
import { fetchReport } from "@/lib/api";
import type { RiskLevel } from "@/components/RiskBadge";
import type { LLMContent } from "@/types/analysis";

/** Ensure we never render [object Object]; LLM fields may sometimes be nested. */
function toDisplayString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value != null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const key of ["text", "content", "value"]) {
      const v = o[key];
      if (typeof v === "string") return v;
    }
  }
  return value != null ? String(value) : "";
}

const RISK_CARD_STYLES: Record<RiskLevel, { border: string; iconBg: string; iconColor: string; badge: string }> = {
  safe: { border: "border-l-success", iconBg: "bg-success/10", iconColor: "text-success", badge: "bg-success/10 text-success" },
  adjust: { border: "border-l-warning", iconBg: "bg-warning/10", iconColor: "text-warning", badge: "bg-warning/10 text-warning" },
  toxic: { border: "border-l-destructive", iconBg: "bg-destructive/10", iconColor: "text-destructive", badge: "bg-destructive/10 text-destructive" },
  ineffective: { border: "border-l-destructive", iconBg: "bg-destructive/10", iconColor: "text-destructive", badge: "bg-destructive/10 text-destructive" },
};

const Results = () => {
  const { result, apiResponse } = useAnalysisResult();
  const [copied, setCopied] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [devViewOpen, setDevViewOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  if (!result) {
    return (
      <DashboardLayout>
        <PageContainer>
          <div className="fade-in-up mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FileSearch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">No results yet</h2>
            <p className="mb-8 text-sm text-muted-foreground">
              Identify a medicine from a photo and upload a DNA or blood report on the Analysis page. Results will appear here after you run the analysis.
            </p>
            <Button asChild className="gap-2 rounded-xl">
              <Link to="/analysis">
                Go to Analysis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  const handleDownloadJSON = () => {
    const payload = apiResponse ?? result;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "genex-results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = async () => {
    const payload = apiResponse ?? result;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadReport = async () => {
    const patientId = result.patientId ?? apiResponse?.patient_id;
    if (!patientId) {
      setReportError("Patient ID not available for report.");
      return;
    }
    setReportError(null);
    setReportLoading(true);
    try {
      const blob = await fetchReport(patientId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clinical-report-${patientId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Failed to download report");
    } finally {
      setReportLoading(false);
    }
  };

  const riskStyle = RISK_CARD_STYLES[result.risk];
  const showGuardrail = result.confidence < 50;

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="fade-in-up">
            <h1 className="text-2xl font-bold text-foreground">Analysis Results</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Drug: <span className="font-medium text-foreground">{result.drug}</span> · Gene:{" "}
              <span className="font-medium text-foreground">{result.gene}</span>
              {result.fileName && (
                <> · File: <span className="font-medium text-foreground">{result.fileName}</span></>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              disabled={reportLoading || !(result.patientId ?? apiResponse?.patient_id)}
              className="fade-in gap-2 rounded-xl"
            >
              {reportLoading ? (
                <>Loading…</>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Download Clinical Report
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyJSON}
              className="fade-in gap-2 rounded-xl"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy JSON"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJSON}
              className="fade-in gap-2 rounded-xl"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Risk Assessment — color-coded: Green = Safe, Yellow = Adjust, Red = Toxic/Ineffective */}
          <div
            className={`clinical-card-hover fade-in-up border-l-4 ${riskStyle.border}`}
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${riskStyle.iconBg}`}>
                <Shield className={`h-5 w-5 ${riskStyle.iconColor}`} />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Risk Assessment</h2>
                  <RiskBadge level={result.risk} size="lg" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{result.severity}</p>
                {result.confidenceBreakdown ? (
                  <ConfidenceBreakdownBar
                    totalPercent={result.confidence}
                    breakdown={result.confidenceBreakdown}
                    label="Confidence"
                  />
                ) : (
                  <ConfidenceBar value={result.confidence} label="Confidence" />
                )}
              </div>
            </div>
          </div>

          {showGuardrail && (
            <div className="fade-in-up rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200">
              Insufficient genetic evidence for confident recommendation.
            </div>
          )}

          {reportError && (
            <div className="fade-in-up rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {reportError}
            </div>
          )}

          {/* LLM-generated summary and explanations */}
          {result.llm && (
            <div className="clinical-card fade-in-up space-y-6" style={{ animationDelay: "60ms" }}>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">AI Summary & Explanations</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob(
                      [JSON.stringify({ ...result.llm, drug: result.drug, gene: result.gene }, null, 2)],
                      { type: "application/json" }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "genex-ai-summary.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="gap-1.5 rounded-lg"
                >
                  <FileJson className="h-3.5 w-3.5" />
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const llm = result.llm as LLMContent;
                    const summary = toDisplayString(llm.summary);
                    const mechanical = toDisplayString(llm.mechanicalExplanation);
                    const biological = toDisplayString(llm.biologicalReasoning);
                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>GeneX AI Summary</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a;} h1{font-size:1.25rem;margin-bottom:0.5rem;} h2{font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;margin:1.5rem 0 0.5rem;} p{margin:0 0 0.75rem;}</style></head><body><h1>AI Summary &amp; Explanations</h1><p><strong>${result.drug}</strong> · ${result.gene}</p><h2>Summary</h2><p>${summary.replace(/</g, "&lt;")}</p><h2>Mechanical explanation</h2><p>${mechanical.replace(/</g, "&lt;")}</p><h2>Biological reasoning</h2><p>${biological.replace(/</g, "&lt;")}</p></body></html>`;
                    const win = window.open("", "_blank");
                    if (win) {
                      win.document.write(html);
                      win.document.close();
                      win.focus();
                      setTimeout(() => win.print(), 250);
                    }
                  }}
                  className="gap-1.5 rounded-lg"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Download PDF
                </Button>
              </div>
              <div className="space-y-5">
                <div>
                  <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Summary
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground">
                    {toDisplayString(result.llm.summary)}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Mechanical explanation
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {toDisplayString(result.llm.mechanicalExplanation)}
                  </p>
                </div>
                <div>
                  <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Biological reasoning
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {toDisplayString(result.llm.biologicalReasoning)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Genetic Profile */}
            <div className="clinical-card fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="mb-4 flex items-center gap-2">
                <Dna className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Genetic Profile</h3>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Gene</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {result.gene}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diplotype</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                    {result.diplotype}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phenotype</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${riskStyle.badge}`}>
                    {result.phenotype}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Detected Variants
                </p>
                <VariantTable variants={result.variants} />
              </div>
            </div>

            {/* Enzyme Activity */}
            <div className="clinical-card fade-in-up" style={{ animationDelay: "150ms" }}>
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Enzyme Activity</h3>
              </div>

              <div className="mb-6">
                <p className="mb-1 text-xs text-muted-foreground">Current Metabolizer Status</p>
                <p className="text-lg font-semibold text-foreground">{result.phenotype}</p>
              </div>

              <ActivityBar activeLevel={result.activityLevel} />

              <div className="mt-6 rounded-xl bg-muted/50 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Enzyme activity is classified based on the combination of allele functionality
                  scores. An intermediate metabolizer has a reduced but not absent enzyme activity,
                  which may affect drug metabolism rates.
                </p>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="clinical-card fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Clinical Explanation</h3>
            </div>
            <ExplanationAccordion items={result.explanations} />
          </div>

          {/* Decision Transparency / Audit Trail */}
          <div className="clinical-card fade-in-up" style={{ animationDelay: "250ms" }}>
            <button
              type="button"
              className="mb-4 flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setAuditOpen((o) => !o)}
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Decision Transparency</h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Audit Trail
                </span>
              </div>
              {auditOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {auditOpen && <ExplanationAccordion items={result.audit} />}
          </div>

          {/* Developer JSON view */}
          <div className="clinical-card fade-in-up" style={{ animationDelay: "280ms" }}>
            <button
              type="button"
              className="mb-4 flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setDevViewOpen((o) => !o)}
            >
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Developer View</h3>
              </div>
              {devViewOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {devViewOpen && (
              <pre className="max-h-96 overflow-auto rounded-xl border border-border bg-muted/30 p-4 text-left text-xs font-mono text-foreground">
                {JSON.stringify(apiResponse ?? result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Results;
