"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccentColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
  disabled?: boolean;
}

export function AccentColorField({ value, onChange, error, disabled }: AccentColorFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="accentColor">Accent color</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick accent color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111110"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-input border border-border bg-white p-1"
        />
        <Input
          id="accentColor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="#111110"
          className="flex-1"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
