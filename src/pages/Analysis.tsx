import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { UploadZone } from "@/components/UploadZone";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";
import type { AnalysisResult, ExplanationItem } from "@/types/analysis";
import { parseVcf } from "@/lib/vcfParser";
import {
  getRsidsForDrug,
  interpretFromVcf,
} from "@/lib/pharmacogenomics";
import {
  fetchLLMExplanations,
  isLLMAvailable,
} from "@/lib/llm";

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

function buildExplanationsAndAudit(
  drug: string,
  gene: string,
  phenotype: string,
  risk: string
): { explanations: ExplanationItem[]; audit: ExplanationItem[] } {
  const explanations: ExplanationItem[] = [
    {
      title: "Clinical recommendation",
      content: `Based on ${gene} ${phenotype} status, ${risk}. Always consider patient-specific factors and current CPIC guidelines before prescribing.`,
    },
    {
      title: "Evidence level",
      content:
        "Recommendations align with CPIC guideline evidence. Consult the latest CPIC guideline for this drug–gene pair for full evidence summary.",
    },
  ];
  const audit: ExplanationItem[] = [
    {
      title: "Gene",
      content: `${gene} — pharmacogene relevant to ${drug}. Phenotype derived from genotype using standardized activity scoring.`,
    },
    {
      title: "Deterministic rule",
      content:
        "Phenotype and risk are computed from VCF-derived genotypes and CPIC-style activity scores, not from probabilistic models.",
    },
  ];
  return { explanations, audit };
}

const Analysis = () => {
  const navigate = useNavigate();
  const { setResult } = useAnalysisResult();
  const [file, setFile] = useState<File | null>(null);
  const [drug, setDrug] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"analyze" | "llm" | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!file) return setError("Please upload a genetic data file.");
    if (!drug) return setError("Please select a drug.");
    setError("");
    setLoading(true);
    setLoadingPhase("analyze");

    try {
      const vcfText = await file.text();
      const rsids = getRsidsForDrug(drug);
      const vcfVariants = parseVcf(vcfText, rsids.length ? rsids : ["rs4244285", "rs4986893", "rs12248560"]);

      const interp = interpretFromVcf(vcfVariants, drug);
      const drugName = drug.charAt(0).toUpperCase() + drug.slice(1);

      const { explanations, audit } = buildExplanationsAndAudit(
        drugName,
        interp.gene,
        interp.phenotype,
        interp.severity
      );

      const result: AnalysisResult = {
        drug: drugName,
        fileName: file.name,
        risk: interp.risk,
        severity: interp.severity,
        confidence: interp.confidence,
        gene: interp.gene,
        diplotype: interp.diplotype,
        phenotype: interp.phenotype,
        activityLevel: interp.activityLevel,
        variants: interp.variants,
        explanations,
        audit,
      };

      if (isLLMAvailable()) {
        setLoadingPhase("llm");
        const llm = await fetchLLMExplanations(result);
        if (llm) result.llm = llm;
      }

      setResult(result);
      navigate("/results");
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : "Analysis failed. Check that the file is a valid VCF."
      );
    } finally {
      setLoading(false);
      setLoadingPhase(null);
    }
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="fade-in-up mx-auto max-w-lg pt-8 sm:pt-16">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Patient Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Upload genetic data (VCF) and select a drug to analyze pharmacogenomic interactions.
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
                  {loadingPhase === "llm"
                    ? "Generating explanations…"
                    : "Analyzing…"}
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
