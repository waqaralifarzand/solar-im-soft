"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_LOGO_FILE_BYTES, MAX_LOGO_DATA_URL_LENGTH, MAX_LOGO_DIMENSION } from "@/lib/logo";
import { compressImageToDataUrl } from "@/lib/compressImage";

interface LogoUploadFieldProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  companyInitial: string;
  disabled?: boolean;
}

export function LogoUploadField({ value, onChange, companyInitial, disabled }: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_LOGO_FILE_BYTES) {
      setError(`Logo must be smaller than ${Math.round(MAX_LOGO_FILE_BYTES / 1024)}KB`);
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be a PNG, JPEG, or WEBP image");
      return;
    }

    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressImageToDataUrl(file, {
        maxDimension: MAX_LOGO_DIMENSION,
        maxDataUrlLength: MAX_LOGO_DATA_URL_LENGTH,
      });
      if (!compressed) {
        setError("Couldn't shrink this image enough — try a smaller or simpler logo");
        return;
      }
      onChange(compressed);
    } catch {
      setError("Couldn't read that image — try a different file");
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Logo</Label>
      <div className="flex items-center gap-4">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo is a base64 data URI
          <img src={value} alt="Logo preview" className="h-12 w-12 rounded-input border border-border object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-input border border-border bg-surface text-sm font-semibold text-muted-foreground">
            {companyInitial}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || compressing}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} className="mr-1.5" />
            {compressing ? "Processing…" : "Upload logo"}
          </Button>
          {value && (
            <button
              type="button"
              className="text-left text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange(null)}
              disabled={disabled || compressing}
            >
              Remove logo
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
