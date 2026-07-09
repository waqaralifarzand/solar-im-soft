-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "costSnapshot" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill: existing InvoiceItem rows predate cost-snapshotting (Phase 7), so there is no
-- true historical unit cost recorded for them. Approximate by copying each item's CURRENT
-- product.costPrice — this is the best available estimate, but is NOT the cost at the time
-- of that historical sale if the product's cost has changed since. Any Profit report COGS
-- figure that spans dates before this migration is therefore approximate for those rows;
-- everything created after this migration captures the real cost at sale time going forward
-- (see lib/actions/invoices.ts).
UPDATE "InvoiceItem" ii
SET "costSnapshot" = p."costPrice"
FROM "Product" p
WHERE p.id = ii."productId";
