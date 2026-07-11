export const MAX_IMPORT_ROWS = 500;

export const IMPORT_FIELDS = [
  "name",
  "sku",
  "barcode",
  "category",
  "unit",
  "costPrice",
  "salePrice",
  "stockQty",
  "reorderLevel",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

// Fields required in the source file — everything else has a sensible default when blank.
export const REQUIRED_IMPORT_FIELDS: ImportField[] = ["name", "sku", "costPrice", "salePrice"];

export type ImportRowRaw = Partial<Record<ImportField, string>>;

export interface ParsedProductRow {
  name: string;
  sku: string;
  barcode: string | null;
  categoryName: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  reorderLevel: number;
}

function parseRequiredAmount(raw: string | undefined, label: string, errors: string[]): number | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    errors.push(`${label} is required`);
    return undefined;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be a valid non-negative number`);
    return undefined;
  }
  return value;
}

function parseOptionalInt(
  raw: string | undefined,
  label: string,
  errors: string[],
  defaultValue: number,
): number | undefined {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return defaultValue;
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 0) {
    errors.push(`${label} must be a whole number, zero or greater`);
    return undefined;
  }
  return value;
}

/** Validates and normalizes one raw import row. Returns null data if any field failed. */
export function parseImportRow(raw: ImportRowRaw): { data: ParsedProductRow | null; errors: string[] } {
  const errors: string[] = [];

  const name = (raw.name ?? "").trim();
  if (!name) errors.push("Name is required");
  else if (name.length > 160) errors.push("Name must be 160 characters or fewer");

  const sku = (raw.sku ?? "").trim();
  if (!sku) errors.push("SKU is required");
  else if (sku.length > 40) errors.push("SKU must be 40 characters or fewer");

  const barcodeRaw = (raw.barcode ?? "").trim();
  if (barcodeRaw.length > 60) errors.push("Barcode must be 60 characters or fewer");

  const categoryRaw = (raw.category ?? "").trim();
  if (categoryRaw.length > 60) errors.push("Category must be 60 characters or fewer");

  const unitRaw = (raw.unit ?? "").trim();
  if (unitRaw.length > 20) errors.push("Unit must be 20 characters or fewer");

  const costPrice = parseRequiredAmount(raw.costPrice, "Cost price", errors);
  const salePrice = parseRequiredAmount(raw.salePrice, "Sale price", errors);
  const stockQty = parseOptionalInt(raw.stockQty, "Stock qty", errors, 0);
  const reorderLevel = parseOptionalInt(raw.reorderLevel, "Reorder level", errors, 5);

  if (errors.length > 0) return { data: null, errors };

  return {
    data: {
      name,
      sku,
      barcode: barcodeRaw || null,
      categoryName: categoryRaw || null,
      unit: unitRaw || "pcs",
      costPrice: costPrice!,
      salePrice: salePrice!,
      stockQty: stockQty!,
      reorderLevel: reorderLevel!,
    },
    errors: [],
  };
}

const FIELD_SYNONYMS: Record<ImportField, string[]> = {
  name: ["name", "product name", "product"],
  sku: ["sku", "code", "item code"],
  barcode: ["barcode", "bar code", "upc"],
  category: ["category", "cat"],
  unit: ["unit", "uom", "units"],
  costPrice: ["costprice", "cost price", "cost", "purchase price"],
  salePrice: ["saleprice", "sale price", "price", "selling price"],
  stockQty: ["stockqty", "stock qty", "stock", "quantity", "qty", "opening stock"],
  reorderLevel: ["reorderlevel", "reorder level", "reorder", "reorder qty", "low stock level"],
};

/** Best-effort auto-mapping from detected sheet column headers to import fields. */
export function guessColumnMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const normalized = headers.map((h) => ({ original: h, key: h.trim().toLowerCase() }));
  const mapping: Partial<Record<ImportField, string>> = {};
  for (const field of IMPORT_FIELDS) {
    const match = normalized.find((h) => FIELD_SYNONYMS[field].includes(h.key));
    if (match) mapping[field] = match.original;
  }
  return mapping;
}
