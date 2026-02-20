import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileText, Dna, ImagePlus, Camera, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { UploadZone } from "@/components/UploadZone";
import { useAnalysisResult } from "@/contexts/AnalysisResultContext";
import { analyzeVcf, mapApiResponseToResult, detectDrug } from "@/lib/api";

/** Strict scope: only these 6 drugs (backend enforces). */
const ALLOWED_DRUGS = [
  "CODEINE",
  "WARFARIN",
  "CLOPIDOGREL",
  "SIMVASTATIN",
  "AZATHIOPRINE",
  "FLUOROURACIL",
] as const;

type ExplanationMode = "clinician" | "research";
type DrugInputMode = "manual" | "upload" | "camera";

const Analysis = () => {
  const navigate = useNavigate();
  const { setResultAndApi } = useAnalysisResult();
  const [file, setFile] = useState<File | null>(null);
  const [drug, setDrug] = useState<string>("");
  const [drugInputMode, setDrugInputMode] = useState<DrugInputMode>("manual");
  const [detectedDrug, setDetectedDrug] = useState<{ drug: string; confidence: number } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [detectLoading, setDetectLoading] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>("clinician");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    if (drugInputMode !== "camera") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setDetectError("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (drugInputMode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [drugInputMode]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setDetectError("Please select an image file (jpg, png, etc.).");
      return;
    }
    setDetectError(null);
    setImageFile(f);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(f));
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleDetectFromFile = async () => {
    if (!imageFile) {
      setDetectError("Please select an image first.");
      return;
    }
    setDetectError(null);
    setDetectLoading(true);
    try {
      const res = await detectDrug(imageFile);
      setDetectedDrug({ drug: res.detected_drug, confidence: res.confidence });
      setDrug(res.detected_drug);
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : "Detection failed.");
    } finally {
      setDetectLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !streamRef.current) {
      setDetectError("Camera not ready.");
      return;
    }
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setDetectError("Waiting for video frame.");
      return;
    }
    setDetectError(null);
    setDetectLoading(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = 1.5;
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) throw new Error("Capture failed");
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
      const res = await detectDrug(file);
      setDetectedDrug({ drug: res.detected_drug, confidence: res.confidence });
      setDrug(res.detected_drug);
    } catch (e) {
      setDetectError(e instanceof Error ? e.message : "Capture or detection failed.");
    } finally {
      setDetectLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a VCF file.");
      return;
    }
    const drugName = drug.trim().toUpperCase();
    if (!ALLOWED_DRUGS.includes(drugName as (typeof ALLOWED_DRUGS)[number])) {
      setError("Please select a drug from the list.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const apiResponse = await analyzeVcf(file, drugName, undefined, explanationMode);
      const result = mapApiResponseToResult(apiResponse, file.name);
      setResultAndApi(result, apiResponse);
      navigate("/results");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Analysis failed. Check the file and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <PageContainer>
        <div className="fade-in-up mx-auto max-w-lg pt-8 sm:pt-16">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Patient Analysis</h1>
            <p className="text-sm text-muted-foreground">
              Upload a VCF file and select a drug. Analysis runs on the backend (CPIC rule engine); AI explanation is generated by the API.
            </p>
          </div>

          <div className="clinical-card space-y-6">
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

            {/* Drug input mode */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Dna className="h-4 w-4 text-primary" />
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Drug
                </label>
              </div>
              <div className="flex gap-2 rounded-xl border border-border bg-muted/30 p-1">
                <Button
                  type="button"
                  variant={drugInputMode === "manual" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={() => {
                    setDrugInputMode("manual");
                    setDetectError(null);
                    setDetectedDrug(null);
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImagePreview(null);
                    setImageFile(null);
                  }}
                >
                  Manual
                </Button>
                <Button
                  type="button"
                  variant={drugInputMode === "upload" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={() => { setDrugInputMode("upload"); setDetectError(null); }}
                >
                  <ImagePlus className="mr-1 h-3.5 w-3.5" />
                  Upload Image
                </Button>
                <Button
                  type="button"
                  variant={drugInputMode === "camera" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1 rounded-lg"
                  onClick={() => { setDrugInputMode("camera"); setDetectError(null); setDetectedDrug(null); }}
                >
                  <Camera className="mr-1 h-3.5 w-3.5" />
                  Camera
                </Button>
              </div>

              {drugInputMode === "upload" && (
                <div className="fade-in space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-6 transition-colors hover:border-primary/40">
                    <ImagePlus className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-foreground">Choose drug label image</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                  </label>
                  {imagePreview && (
                    <div className="relative overflow-hidden rounded-xl bg-muted">
                      <img src={imagePreview} alt="Preview" className="max-h-40 w-full object-contain" />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    disabled={!imageFile || detectLoading}
                    onClick={handleDetectFromFile}
                  >
                    {detectLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting…
                      </>
                    ) : (
                      "Detect drug"
                    )}
                  </Button>
                </div>
              )}

              {drugInputMode === "camera" && (
                <div className="fade-in space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    disabled={detectLoading}
                    onClick={handleCapture}
                  >
                    {detectLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting…
                      </>
                    ) : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Capture & detect drug
                      </>
                    )}
                  </Button>
                </div>
              )}

              {detectedDrug && (
                <div className="fade-in flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    Detected: <strong>{detectedDrug.drug}</strong> (Confidence: {(detectedDrug.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              )}

              {detectError && (
                <div
                  className={`fade-in rounded-xl px-4 py-2.5 text-sm ${
                    detectError.includes("not available in this environment")
                      ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {detectError}
                  {detectError.includes("not available in this environment") && (
                    <p className="mt-1.5 text-xs opacity-90">Use the &quot;Select a drug&quot; dropdown below to choose the drug, then run analysis.</p>
                  )}
                </div>
              )}

              <Select value={drug} onValueChange={(v) => { setDrug(v); setError(""); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a drug" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_DRUGS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d.charAt(0) + d.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {drugInputMode !== "manual" ? "You can change the drug above before analyzing." : "Select the drug for pharmacogenomic analysis."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                AI explanation mode
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={explanationMode === "clinician" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl flex-1"
                  onClick={() => setExplanationMode("clinician")}
                >
                  Clinician
                </Button>
                <Button
                  type="button"
                  variant={explanationMode === "research" ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl flex-1"
                  onClick={() => setExplanationMode("research")}
                >
                  Research
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {explanationMode === "clinician"
                  ? "Short, action-focused explanation."
                  : "Detailed mechanism, variant impact, PK."}
              </p>
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
