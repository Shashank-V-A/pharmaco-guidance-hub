import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pill, FileText, Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { MedicinePhotoUpload, type IdentifiedDrug } from "@/components/MedicinePhotoUpload";
import { UploadZone } from "@/components/UploadZone";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";
import { buildAnalysisResult } from "@/lib/buildAnalysisResult";

const Analysis = () => {
  const navigate = useNavigate();
  const { setResult } = useAnalysisResult();
  const [identified, setIdentified] = useState<IdentifiedDrug | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = () => {
    if (!identified) return setError("Please identify the medicine from a photo first.");
    if (!file) return setError("Please upload a DNA or blood report (VCF/JSON).");
    setError("");
    setLoading(true);
    setTimeout(() => {
      const result = buildAnalysisResult(identified.drug, identified.gene, file.name);
      setResult(result);
      setLoading(false);
      navigate("/results");
    }, 2000);
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="fade-in-up mx-auto max-w-2xl pt-8 sm:pt-16">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Patient Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Identify the medicine from a photo, then add the patient’s gene data from a DNA or blood report.
            </p>
          </div>

          <div className="clinical-card space-y-8">
            {/* Step 1: Identify medicine from photo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">1. Identify medicine from photo</h2>
              </div>
              <MedicinePhotoUpload onIdentified={setIdentified} identified={identified} />
            </div>

            {/* Step 2: Patient's gene data (DNA / blood report) */}
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">2. Patient’s gene data</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a DNA report or blood report (VCF or JSON) so we can match your genes to the drug.
              </p>
              <UploadZone onFileSelect={(f) => { setFile(f); setError(""); }} />
              {file && (
                <div className="fade-in flex items-center gap-2 rounded-xl bg-success/10 px-4 py-2.5 text-sm text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {file.name}
                </div>
              )}
            </div>

            {identified && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                <Dna className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Drug–gene pair:</span>
                <span className="font-medium text-foreground">{identified.drug}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono font-medium text-primary">{identified.gene}</span>
              </div>
            )}

            {error && (
              <div className="fade-in rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={loading || !identified || !file}
              className="w-full rounded-xl py-5 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                "Analyze drug–gene risk"
              )}
            </Button>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Analysis;
