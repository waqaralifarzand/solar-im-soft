interface BrandingPreviewCardProps {
  companyName: string;
  logoDataUrl: string | null;
  accentColor: string;
}

const isValidHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

export function BrandingPreviewCard({ companyName, logoDataUrl, accentColor }: BrandingPreviewCardProps) {
  const color = isValidHex(accentColor) ? accentColor : "#111110";

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Live preview</p>

      <div className="flex items-center gap-2 rounded-input border border-border bg-white p-3">
        {logoDataUrl ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo is a base64 data URI */}
            <img src={logoDataUrl} alt={companyName} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {companyName.charAt(0).toUpperCase() || "?"}
          </div>
        )}
        <span className="truncate text-[13px] font-medium text-foreground">{companyName || "Your company"}</span>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-input border border-border bg-white p-3">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[13px] font-medium text-foreground">Dashboard</span>
      </div>

      <button
        type="button"
        className="mt-3 w-full rounded-pill px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: color }}
        disabled
      >
        Primary button
      </button>
    </div>
  );
}
