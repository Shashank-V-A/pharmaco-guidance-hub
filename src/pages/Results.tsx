import { Download, Shield, Dna, Brain, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { RiskBadge } from "@/components/RiskBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { VariantTable } from "@/components/VariantTable";
import { ActivityBar } from "@/components/ActivityBar";
import { ExplanationAccordion } from "@/components/ExplanationAccordion";

// Demo data
const resultData = {
  drug: "Clopidogrel",
  risk: "adjust" as const,
  severity: "Intermediate metabolizer — reduced drug activation expected. Consider alternative antiplatelet therapy.",
  confidence: 87,
  gene: "CYP2C19",
  diplotype: "*1/*2",
  phenotype: "Intermediate Metabolizer",
  activityLevel: 1,
  variants: [
    { rsid: "rs4244285", gene: "CYP2C19", allele: "*2", function: "No function" },
    { rsid: "rs4986893", gene: "CYP2C19", allele: "*1", function: "Normal function" },
    { rsid: "rs12248560", gene: "CYP2C19", allele: "*17", function: "Increased function" },
  ],
  explanations: [
    {
      title: "Clinical Recommendation",
      content:
        "Based on CYP2C19 intermediate metabolizer status, consider alternative antiplatelet therapy (e.g., prasugrel or ticagrelor) if no contraindications exist. Standard dose clopidogrel may result in reduced platelet inhibition.",
    },
    {
      title: "Pharmacokinetic Impact",
      content:
        "CYP2C19 is the primary enzyme responsible for the bioactivation of clopidogrel. Patients with one loss-of-function allele (*2) demonstrate approximately 30% reduction in active metabolite formation compared to normal metabolizers.",
    },
    {
      title: "Evidence Summary",
      content:
        "This recommendation is supported by CPIC Level A evidence (strong). Multiple clinical trials and meta-analyses have demonstrated the association between CYP2C19 loss-of-function alleles and adverse cardiovascular outcomes in clopidogrel-treated patients.",
    },
  ],
  audit: [
    {
      title: "Rule Applied",
      content: "CPIC Guideline for Clopidogrel and CYP2C19 (2013, updated 2022). Recommendation: Consider alternative antiplatelet therapy for intermediate and poor metabolizers.",
    },
    {
      title: "Gene Detected",
      content: "CYP2C19 — Cytochrome P450 2C19. Located on chromosome 10q23.33. This enzyme is responsible for metabolizing approximately 10% of commonly prescribed drugs.",
    },
    {
      title: "CPIC Evidence Level",
      content: "Level A — Prescribing action recommended. Strong evidence from well-designed studies indicates that genetic information should be used to change prescribing of the affected drug.",
    },
    {
      title: "Deterministic Rule ID",
      content: "CPIC-CYP2C19-CLOP-2022-v2.1 — This rule was matched using deterministic logic, not probabilistic inference. The genotype-phenotype translation follows the standardized CPIC allele functionality table.",
    },
  ],
};

const Results = () => {
  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(resultData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pgx-results.json";
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
              Drug: <span className="font-medium text-foreground">{resultData.drug}</span> · Gene: <span className="font-medium text-foreground">{resultData.gene}</span>
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
          <div className="clinical-card-hover fade-in-up border-l-4 border-l-warning" style={{ animationDelay: "50ms" }}>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">Risk Assessment</h2>
                  <RiskBadge level={resultData.risk} size="lg" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{resultData.severity}</p>
                <ConfidenceBar value={resultData.confidence} label="Confidence" />
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
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{resultData.gene}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diplotype</p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-foreground">{resultData.diplotype}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phenotype</p>
                  <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {resultData.phenotype}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Detected Variants
                </p>
                <VariantTable variants={resultData.variants} />
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
                <p className="text-lg font-semibold text-foreground">{resultData.phenotype}</p>
              </div>

              <ActivityBar activeLevel={resultData.activityLevel} />

              <div className="mt-6 rounded-xl bg-muted/50 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Enzyme activity is classified based on the combination of allele functionality scores.
                  An intermediate metabolizer has a reduced but not absent enzyme activity, which may
                  affect drug metabolism rates.
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
            <ExplanationAccordion items={resultData.explanations} />
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
            <ExplanationAccordion items={resultData.audit} />
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Results;
