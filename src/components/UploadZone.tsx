import { Upload } from "lucide-react";
import { useState, useCallback } from "react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files?.[0]) onFileSelect(files[0]);
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
  };

  return (
    <label
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ease-in-out ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      }`}
    >
      <Upload className={`mb-3 h-8 w-8 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-sm font-medium text-foreground">
        Drop your VCF or JSON file here
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        or click to browse
      </p>
      <input type="file" className="hidden" accept=".vcf,.json" onChange={handleChange} />
    </label>
  );
}
