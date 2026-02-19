import { Link } from "react-router-dom";
import { Download, Shield, Dna, Brain, Activity, FileSearch, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { RiskBadge } from "@/components/RiskBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { VariantTable } from "@/components/VariantTable";
import { ActivityBar } from "@/components/ActivityBar";
import { ExplanationAccordion } from "@/components/ExplanationAccordion";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";

const Results = () => {
  const { result } = useAnalysisResult();

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
              Upload a VCF file and select a drug on the Analysis page to run pharmacogenomic analysis. Results will appear here after you complete that step.
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
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "genex-results.json";
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJSON}
            className="fade-in gap-2 rounded-xl self-start"
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
        </div>

        <div className="space-y-6">
          {/* Risk Assessment */}
          <div
            className="clinical-card-hover fade-in-up border-l-4 border-l-warning"
            style={{ animationDelay: "50ms" }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Risk Assessment</h2>
                  <RiskBadge level={result.risk} size="lg" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{result.severity}</p>
                <ConfidenceBar value={result.confidence} label="Confidence" />
              </div>
            </div>
          </div>

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
                  <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
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
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Decision Transparency</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Audit Trail
              </span>
            </div>
            <ExplanationAccordion items={result.audit} />
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Results;
