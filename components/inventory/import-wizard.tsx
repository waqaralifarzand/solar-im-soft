"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { UploadCloud, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/exportCsv";
import {
  IMPORT_FIELDS,
  REQUIRED_IMPORT_FIELDS,
  MAX_IMPORT_ROWS,
  guessColumnMapping,
  type ImportField,
  type ImportRowRaw,
} from "@/lib/validations/inventory-import";
import { validateProductImport, importProducts, type ImportRowResult } from "@/lib/actions/inventory-import";

const FIELD_LABELS: Record<ImportField, string> = {
  name: "Name",
  sku: "SKU",
  barcode: "Barcode",
  category: "Category",
  unit: "Unit",
  costPrice: "Cost price",
  salePrice: "Sale price",
  stockQty: "Stock qty",
  reorderLevel: "Reorder level",
};

const TEMPLATE_HEADERS = IMPORT_FIELDS.map((f) => FIELD_LABELS[f]);
const TEMPLATE_EXAMPLE_ROW = [
  "Mono PERC Solar Panel 550W",
  "PNL-0001",
  "1234567890123",
  "Solar Panels",
  "pcs",
  "28000",
  "32000",
  "10",
  "5",
];

type Stage = "upload" | "mapping" | "preview" | "done";

interface ParsedSheet {
  fileName: string;
  headers: string[];
  rows: string[][];
}

function parseWorkbook(buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  if (raw.length === 0) throw new Error("The file is empty");
  const headers = (raw[0] as unknown[]).map((h) => String(h ?? "").trim());
  const rows = raw
    .slice(1)
    .filter((r) => (r as unknown[]).some((cell) => String(cell ?? "").trim() !== ""))
    .map((r) => headers.map((_, i) => String((r as unknown[])[i] ?? "")));
  return { headers, rows };
}

export function ImportWizard() {
  const router = useRouter();
  const showToast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
  const [validation, setValidation] = useState<{ rows: ImportRowResult[]; validCount: number; invalidCount: number } | null>(
    null,
  );
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ createdCount: number; categoriesCreated: number } | null>(null);

  const mappedRows = useMemo<ImportRowRaw[]>(() => {
    if (!sheet) return [];
    const indexByField: Partial<Record<ImportField, number>> = {};
    for (const field of IMPORT_FIELDS) {
      const header = mapping[field];
      if (header) indexByField[field] = sheet.headers.indexOf(header);
    }
    return sheet.rows.map((row) => {
      const mapped: ImportRowRaw = {};
      for (const field of IMPORT_FIELDS) {
        const idx = indexByField[field];
        if (idx !== undefined && idx >= 0) mapped[field] = row[idx];
      }
      return mapped;
    });
  }, [sheet, mapping]);

  function handleDownloadTemplate() {
    downloadCsv("product-import-template.csv", TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE_ROW]);
  }

  async function handleFileSelected(file: File) {
    setError(null);
    try {
      if (!/\.(csv|xlsx)$/i.test(file.name)) {
        throw new Error("Please choose a .csv or .xlsx file");
      }
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      if (parsed.rows.length === 0) throw new Error("The file has no data rows");
      if (parsed.rows.length > MAX_IMPORT_ROWS) {
        throw new Error(`This file has ${parsed.rows.length} rows — import is capped at ${MAX_IMPORT_ROWS} per file`);
      }
      setSheet({ fileName: file.name, headers: parsed.headers, rows: parsed.rows });
      setMapping(guessColumnMapping(parsed.headers));
      setStage("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  const missingRequired = REQUIRED_IMPORT_FIELDS.filter((f) => !mapping[f]);

  async function handleValidate() {
    setError(null);
    setValidating(true);
    try {
      const res = await validateProductImport(mappedRows);
      setValidation(res);
      setStage("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  async function handleImport() {
    if (!validation) return;
    setError(null);
    setImporting(true);
    try {
      const validData = validation.rows.filter((r) => r.data !== null).map((r) => r.data!);
      const res = await importProducts(validData);
      setResult(res);
      setStage("done");
      showToast(`Imported ${res.createdCount} product${res.createdCount === 1 ? "" : "s"}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStage("upload");
    setError(null);
    setSheet(null);
    setMapping({});
    setValidation(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-center gap-2 rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {stage === "upload" && (
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-card bg-surface">
            <UploadCloud size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Upload a .csv or .xlsx file</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Up to {MAX_IMPORT_ROWS} products per import. You&apos;ll map columns and review errors before anything
              is saved.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </Button>
            <Button type="button" variant="secondary" onClick={handleDownloadTemplate}>
              Download template
            </Button>
          </div>
        </Card>
      )}

      {stage === "mapping" && sheet && (
        <Card className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{sheet.fileName}</p>
            <span className="text-xs text-muted-foreground">· {sheet.rows.length} rows detected</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Match each field to a column from your file. Name, SKU, cost price, and sale price are required.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {IMPORT_FIELDS.map((field) => (
              <div key={field} className="flex flex-col gap-2">
                <label className="text-[13px] font-medium text-foreground">
                  {FIELD_LABELS[field]}
                  {REQUIRED_IMPORT_FIELDS.includes(field) && <span className="text-destructive"> *</span>}
                </label>
                <Select
                  value={mapping[field] ?? ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
                >
                  <option value="">— Not mapped —</option>
                  {sheet.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleValidate} disabled={missingRequired.length > 0 || validating}>
              {validating ? "Checking…" : "Continue"}
            </Button>
            <Button type="button" variant="secondary" onClick={reset}>
              Start over
            </Button>
          </div>
          {missingRequired.length > 0 && (
            <p className="text-xs text-destructive">
              Map {missingRequired.map((f) => FIELD_LABELS[f]).join(", ")} before continuing.
            </p>
          )}
        </Card>
      )}

      {stage === "preview" && validation && (
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Review before importing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="text-success">{validation.validCount} valid</span> ·{" "}
                <span className={validation.invalidCount > 0 ? "text-destructive" : ""}>
                  {validation.invalidCount} with errors
                </span>{" "}
                — only valid rows will be imported.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={reset} disabled={importing}>
                Start over
              </Button>
              <Button type="button" onClick={handleImport} disabled={validation.validCount === 0 || importing}>
                {importing ? "Importing…" : `Import ${validation.validCount} product${validation.validCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>

          <div className="max-h-[480px] overflow-auto rounded-input border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Sale</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {validation.rows.map((r) => (
                  <tr key={r.index} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">{r.index + 2}</td>
                    <td className="px-3 py-2">{r.data?.name ?? "—"}</td>
                    <td className="px-3 py-2">{r.data?.sku ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.data?.categoryName ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.data?.costPrice ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.data?.salePrice ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{r.data?.stockQty ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.errors.length === 0 ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 size={14} /> OK
                        </span>
                      ) : (
                        <span className="flex items-start gap-1 text-destructive">
                          <XCircle size={14} className="mt-0.5 shrink-0" />
                          {r.errors.join("; ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {stage === "done" && result && (
        <Card className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 size={32} className="text-success" />
          <p className="text-sm font-medium text-foreground">
            Imported {result.createdCount} product{result.createdCount === 1 ? "" : "s"}
          </p>
          {result.categoriesCreated > 0 && (
            <p className="text-xs text-muted-foreground">
              Created {result.categoriesCreated} new categor{result.categoriesCreated === 1 ? "y" : "ies"}.
            </p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <Button type="button" onClick={() => router.push("/inventory")}>
              Back to inventory
            </Button>
            <Button type="button" variant="secondary" onClick={reset}>
              Import another file
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
