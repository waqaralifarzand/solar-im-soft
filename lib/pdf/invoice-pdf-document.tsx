import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/formatMoney";
import type { InvoiceDetail } from "@/lib/queries/invoices";

const BORDER = "#EBE8E4";
const MUTED = "#6F6B66";
const FOREGROUND = "#111110";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: FOREGROUND, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 56, height: 56, objectFit: "contain", marginBottom: 6 },
  companyName: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED, fontSize: 9 },
  invoiceNo: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  accentBar: { height: 2, marginTop: 12, marginBottom: 16 },
  headerNote: { marginBottom: 16, fontSize: 9, color: MUTED },
  section: { marginBottom: 16 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 2 },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: "row", borderBottom: `1px solid ${BORDER}`, paddingBottom: 4, marginBottom: 4 },
  tableHeaderCell: { fontSize: 8, color: MUTED, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 5, borderBottom: `1px solid ${BORDER}` },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: "right" },
  col3: { flex: 1.5, textAlign: "right" },
  col4: { flex: 1.5, textAlign: "right" },
  summary: { marginTop: 16, alignItems: "flex-end" },
  summaryRow: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 2 },
  summaryBold: { fontFamily: "Helvetica-Bold" },
  summaryDivider: { width: 220, borderTop: `1px solid ${BORDER}`, marginVertical: 4 },
  footerNote: { marginTop: 32, fontSize: 8, color: MUTED, textAlign: "center" },
});

export interface InvoicePdfCompany {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  invoiceHeaderNote: string | null;
  invoiceFooterNote: string | null;
  accentColor: string;
  currency: string;
  lakhCroreFormat: boolean;
}

interface InvoicePdfDocumentProps {
  company: InvoicePdfCompany;
  invoice: InvoiceDetail;
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={bold ? styles.summaryBold : undefined}>{label}</Text>
      <Text style={bold ? styles.summaryBold : undefined}>{value}</Text>
    </View>
  );
}

export function InvoicePdfDocument({ company, invoice }: InvoicePdfDocumentProps) {
  const fmt = { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat };
  const money = (v: string) => formatMoney(v, fmt);
  const remaining = (Number(invoice.total) - Number(invoice.paidAmount)).toFixed(2);

  return (
    <Document title={invoice.invoiceNo}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is a PDF-drawing primitive, not an <img>; it has no alt prop. */}
            {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address && <Text style={styles.muted}>{company.address}</Text>}
            {(company.phone || company.email) && (
              <Text style={styles.muted}>{[company.phone, company.email].filter(Boolean).join("   ·   ")}</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.invoiceNo, { color: company.accentColor }]}>{invoice.invoiceNo}</Text>
            <Text style={styles.muted}>{new Date(invoice.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.muted}>{invoice.status}</Text>
          </View>
        </View>

        <View style={[styles.accentBar, { backgroundColor: company.accentColor }]} />

        {company.invoiceHeaderNote && <Text style={styles.headerNote}>{company.invoiceHeaderNote}</Text>}

        <View style={styles.section}>
          <Text style={styles.label}>Billed to</Text>
          <Text>{invoice.customer ? invoice.customer.name : "Walk-in customer"}</Text>
          {invoice.customer?.phone && <Text style={styles.muted}>{invoice.customer.phone}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Unit price</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Line total</Text>
          </View>
          {invoice.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.col1}>{item.nameSnapshot}</Text>
              <Text style={styles.col2}>{item.qty}</Text>
              <Text style={styles.col3}>{money(item.unitPrice)}</Text>
              <Text style={styles.col4}>{money(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <SummaryRow label="Subtotal" value={money(invoice.subtotal)} />
          <SummaryRow label="Discount" value={`-${money(invoice.discount)}`} />
          <SummaryRow label="Tax" value={money(invoice.taxAmount)} />
          <View style={styles.summaryDivider} />
          <SummaryRow label="Total" value={money(invoice.total)} bold />
          <SummaryRow label="Paid" value={money(invoice.paidAmount)} />
          <SummaryRow label="Balance due" value={money(remaining)} bold />
        </View>

        {company.invoiceFooterNote && <Text style={styles.footerNote}>{company.invoiceFooterNote}</Text>}
      </Page>
    </Document>
  );
}
