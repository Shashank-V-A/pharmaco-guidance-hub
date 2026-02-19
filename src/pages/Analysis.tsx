import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Dna, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { UploadZone } from "@/components/UploadZone";
import { MedicinePhotoUpload, type IdentifiedDrug } from "@/components/MedicinePhotoUpload";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";
import type { AnalysisResult, ExplanationItem } from "@/types/analysis";
import { parseVcf } from "@/lib/vcfParser";
import { getRsidsForDrug, interpretFromVcf } from "@/lib/pharmacogenomics";
import { fetchLLMExplanations, isLLMAvailable } from "@/lib/llm";

const DRUGS = [
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
  severity: string
): { explanations: ExplanationItem[]; audit: ExplanationItem[] } {
  const explanations: ExplanationItem[] = [
    {
      title: "Clinical recommendation",
      content: `Based on ${gene} ${phenotype} status, ${severity} Always consider patient-specific factors and current CPIC guidelines before prescribing.`,
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
        "Phenotype and risk are computed from VCF-derived genotypes and CPIC-style activity scores, not from mock or probabilistic models.",
    },
  ];
  return { explanations, audit };
}

const Analysis = () => {
  const navigate = useNavigate();
  const { setResult } = useAnalysisResult();
  const [identified, setIdentified] = useState<IdentifiedDrug | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drug, setDrug] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<"analyze" | "llm" | null>(null);
  const [error, setError] = useState("");

  const effectiveDrugKey = identified
    ? identified.drug.trim().toLowerCase()
    : drug;

  const handleAnalyze = async () => {
    if (!file) return setError("Please upload a genetic data file (VCF).");
    if (!effectiveDrugKey) return setError("Identify a medicine from a photo or select a drug.");
    setError("");
    setLoading(true);
    setLoadingPhase("analyze");

    try {
      const vcfText = await file.text();
      const rsids = getRsidsForDrug(effectiveDrugKey);
      const defaultRsids = ["rs4244285", "rs4986893", "rs12248560"];
      const vcfVariants = parseVcf(vcfText, rsids.length > 0 ? rsids : defaultRsids);

      const interp = interpretFromVcf(vcfVariants, effectiveDrugKey);
      const drugName = effectiveDrugKey.charAt(0).toUpperCase() + effectiveDrugKey.slice(1);

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
        e instanceof Error ? e.message : "Analysis failed. Check that the file is a valid VCF."
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
              Identify medicine from a photo (camera or upload), or select a drug. Upload a VCF file;
              analysis runs on the uploaded file content and AI summary is generated via Groq when configured.
            </p>
          </div>

          <div className="clinical-card space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Medicine (camera or image)
                </label>
              </div>
              <MedicinePhotoUpload
                onIdentified={setIdentified}
                identified={identified}
              />
              <p className="text-xs text-muted-foreground">
                Take a photo or upload an image of the medicine; we’ll try to identify the drug from the label.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Genetic data (VCF)
                </label>
              </div>
              <UploadZone onFileSelect={(f) => { setFile(f); setError(""); }} />
            </div>

            {file && (
              <div className="fade-in flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-sm text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                {file.name}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Dna className="h-4 w-4 text-primary" />
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Or select a drug
                </label>
              </div>
              <Select value={drug} onValueChange={(v) => { setDrug(v); setError(""); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a drug if not using photo" />
                </SelectTrigger>
                <SelectContent>
                  {DRUGS.map((d) => (
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
                    ? "Generating AI summary…"
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
