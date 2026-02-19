import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { UploadZone } from "@/components/UploadZone";

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

const Analysis = () => {
  const navigate = useNavigate();
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
