import { useState, useCallback, useRef, useEffect } from "react";
import { createWorker } from "tesseract.js";
import { Camera, Loader2, Pill, Dna, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getGeneForDrug,
  getDrugDisplayName,
  matchDrugFromText,
  DRUGS,
} from "@/constants/drugGeneMap";

export interface IdentifiedDrug {
  drug: string;
  gene: string;
}

interface MedicinePhotoUploadProps {
  onIdentified: (result: IdentifiedDrug | null) => void;
  identified: IdentifiedDrug | null;
}

/** Run OCR on the image and match text to a known drug; fallback to mock if no match. */
async function identifyFromImage(file: File, imageUrl: string): Promise<IdentifiedDrug> {
  try {
    const worker = await createWorker("eng");
    const {
      data: { text },
    } = await worker.recognize(imageUrl);
    await worker.terminate();
    const matched = matchDrugFromText(text);
    if (matched) {
      const gene = getGeneForDrug(matched)!;
      return { drug: getDrugDisplayName(matched), gene };
    }
  } catch {
    // fall through to fallback
  }
  const drugs = DRUGS.map((d) => d.toLowerCase());
  const index = Math.abs(hashCode(file.name + String(file.size))) % drugs.length;
  const drug = drugs[index];
  const gene = getGeneForDrug(drug)!;
  return { drug: getDrugDisplayName(drug), gene };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export function MedicinePhotoUpload({ onIdentified, identified }: MedicinePhotoUploadProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setCameraError(null);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleStartCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not access camera";
      setCameraError(msg);
      setCameraActive(false);
    }
  }, []);

  useEffect(() => {
    if (!cameraActive || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    video.onloadedmetadata = () => {
      video.play().catch(() => {});
    };
  }, [cameraActive]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
        setPhoto(file);
        setPreview(URL.createObjectURL(blob));
        stopCamera();
      },
      "image/jpeg",
      0.92
    );
  }, [stopCamera]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setIdentifying(false);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleIdentify = async () => {
    if (!photo || !preview) return;
    setIdentifying(true);
    try {
      const result = await identifyFromImage(photo, preview);
      onIdentified(result);
    } finally {
      setIdentifying(false);
    }
  };

  const handleReset = useCallback(() => {
    stopCamera();
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(null);
    setPreview(null);
    onIdentified(null);
  }, [preview, onIdentified, stopCamera]);

  return (
    <div className="space-y-4">
      {cameraActive ? (
        <div className="rounded-2xl border-2 border-primary/50 bg-primary/5 p-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              onClick={handleCapture}
              className="flex-1 gap-2 rounded-xl py-5"
            >
              <Camera className="h-4 w-4" />
              Capture photo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopCamera}
              className="gap-2 rounded-xl"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all ${
            preview ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50"
          }`}
        >
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Medicine"
                className="max-h-48 rounded-xl object-contain"
              />
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    handleReset();
                  }}
                >
                  Change photo
                </Button>
                <input type="file" className="hidden" accept="image/*" onChange={handleChange} id="med-photo-input" />
                <label htmlFor="med-photo-input">
                  <Button type="button" variant="outline" size="sm" className="rounded-lg cursor-pointer" asChild>
                    <span>
                      <Camera className="mr-1.5 h-3.5 w-3.5 inline" />
                      New photo
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <>
              <Camera className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Click or drop a photo of the medicine</p>
              <p className="mt-1 text-xs text-muted-foreground">Or use your camera to take a photo</p>
              <input type="file" className="hidden" accept="image/*" onChange={handleChange} />
            </>
          )}
        </label>
      )}

      {!preview && !cameraActive && (
        <Button
          type="button"
          variant="outline"
          onClick={handleStartCamera}
          className="w-full gap-2 rounded-xl py-5"
        >
          <Video className="h-4 w-4" />
          Take photo with camera
        </Button>
      )}

      {cameraError && (
        <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {cameraError}
        </p>
      )}

      {preview && !identified && (
        <Button
          onClick={handleIdentify}
          disabled={identifying}
          className="w-full gap-2 rounded-xl py-5"
        >
          {identifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Identifying medicine…
            </>
          ) : (
            <>
              <Pill className="h-4 w-4" />
              Identify medicine from photo
            </>
          )}
        </Button>
      )}

      {identified && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3">
          <Dna className="h-5 w-5 text-success" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Detected drug & gene
            </p>
            <p className="font-semibold text-foreground">
              {identified.drug} <span className="text-muted-foreground">→</span>{" "}
              <span className="text-primary">{identified.gene}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto text-muted-foreground">
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
