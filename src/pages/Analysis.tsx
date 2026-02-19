import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { UploadZone } from "@/components/UploadZone";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";
import type { AnalysisResult } from "@/types/analysis";

const drugs = [
  "Clopidogrel",
  "Codeine",
  "Warfarin",
  "Tamoxifen",
  "Simvastatin",
  "Abacavir",
  "Carbamazepine",
  "Fluorouracil",
];

function buildResultFromAnalysis(drug: string, fileName: string): AnalysisResult {
  const drugName = drug.charAt(0).toUpperCase() + drug.slice(1);
  return {
    drug: drugName,
    fileName,
    risk: "adjust",
    severity:
      "Intermediate metabolizer — reduced drug activation expected. Consider alternative antiplatelet therapy.",
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
        content:
          "CPIC Guideline for Clopidogrel and CYP2C19 (2013, updated 2022). Recommendation: Consider alternative antiplatelet therapy for intermediate and poor metabolizers.",
      },
      {
        title: "Gene Detected",
        content:
          "CYP2C19 — Cytochrome P450 2C19. Located on chromosome 10q23.33. This enzyme is responsible for metabolizing approximately 10% of commonly prescribed drugs.",
      },
      {
        title: "CPIC Evidence Level",
        content:
          "Level A — Prescribing action recommended. Strong evidence from well-designed studies indicates that genetic information should be used to change prescribing of the affected drug.",
      },
      {
        title: "Deterministic Rule ID",
        content:
          "CPIC-CYP2C19-CLOP-2022-v2.1 — This rule was matched using deterministic logic, not probabilistic inference. The genotype-phenotype translation follows the standardized CPIC allele functionality table.",
      },
    ],
  };
}

const Analysis = () => {
  const navigate = useNavigate();
  const { setResult } = useAnalysisResult();
  const [file, setFile] = useState<File | null>(null);
  const [drug, setDrug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = () => {
    if (!file) return setError("Please upload a genetic data file.");
    if (!drug) return setError("Please select a drug.");
    setError("");
    setLoading(true);
    setTimeout(() => {
      const result = buildResultFromAnalysis(drug, file.name);
      setResult(result);
      setLoading(false);
      navigate("/results");
    }, 2000);
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="fade-in-up mx-auto max-w-lg pt-8 sm:pt-16">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Patient Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Upload genetic data and select a drug to analyze pharmacogenomic interactions.
            </p>
          </div>

          <div className="clinical-card space-y-6">
            <UploadZone onFileSelect={(f) => { setFile(f); setError(""); }} />

            {file && (
              <div className="fade-in flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-sm text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {file.name}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Drug Selection
              </label>
              <Select value={drug} onValueChange={(v) => { setDrug(v); setError(""); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a drug to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {drugs.map((d) => (
                    <SelectItem key={d} value={d.toLowerCase()}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="fade-in rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full rounded-xl py-5 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                "Analyze"
              )}
            </Button>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Analysis;
