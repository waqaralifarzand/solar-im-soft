import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/formatMoney";
import type { QuotationDetail } from "@/lib/queries/quotations";

// Deliberately duplicated from lib/pdf/invoice-pdf-document.tsx rather than sharing a
// styles module — keeps the two templates isolated so nothing here can regress the
// already-tested invoice PDF, at the cost of ~30 lines of repeated StyleSheet.
const BORDER = "#EBE8E4";
const MUTED = "#6F6B66";
const FOREGROUND = "#111110";
const SURFACE = "#F5F3F1";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: FOREGROUND, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 56, height: 56, objectFit: "contain", marginBottom: 6 },
  companyName: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  muted: { color: MUTED, fontSize: 9 },
  docNo: { fontSize: 14, fontFamily: "Helvetica-Bold" },
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
  paymentDetails: { marginTop: 16, padding: 10, backgroundColor: SURFACE, borderRadius: 6, maxWidth: 260 },
  paymentDetailsTitle: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 6 },
  paymentDetailsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5, gap: 12 },
  paymentDetailsLabel: { fontSize: 9, color: MUTED },
  paymentDetailsValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  footerNote: { marginTop: 32, fontSize: 8, color: MUTED, textAlign: "center" },
});

export interface QuotationPdfCompany {
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
  bankName: string | null;
  accountTitle: string | null;
  accountNumber: string | null;
  iban: string | null;
  jazzCashNumber: string | null;
  easyPaisaNumber: string | null;
}

interface QuotationPdfDocumentProps {
  company: QuotationPdfCompany;
  quotation: QuotationDetail;
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={bold ? styles.summaryBold : undefined}>{label}</Text>
      <Text style={bold ? styles.summaryBold : undefined}>{value}</Text>
    </View>
  );
}

function PaymentDetailsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.paymentDetailsRow}>
      <Text style={styles.paymentDetailsLabel}>{label}</Text>
      <Text style={styles.paymentDetailsValue}>{value}</Text>
    </View>
  );
}

export function QuotationPdfDocument({ company, quotation }: QuotationPdfDocumentProps) {
  const fmt = { currency: company.currency, lakhCroreFormat: company.lakhCroreFormat };
  const money = (v: string) => formatMoney(v, fmt);
  const customerLabel = quotation.customer?.name ?? quotation.customerNameFree ?? "—";
  const hasPaymentDetails = Boolean(
    company.bankName ||
      company.accountTitle ||
      company.accountNumber ||
      company.iban ||
      company.jazzCashNumber ||
      company.easyPaisaNumber,
  );

  return (
    <Document title={quotation.quoteNo}>
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
            <Text style={styles.muted}>QUOTATION</Text>
            <Text style={[styles.docNo, { color: company.accentColor }]}>{quotation.quoteNo}</Text>
            <Text style={styles.muted}>{new Date(quotation.createdAt).toLocaleDateString()}</Text>
            {quotation.validUntil && (
              <Text style={styles.muted}>Valid until {new Date(quotation.validUntil).toLocaleDateString()}</Text>
            )}
          </View>
        </View>

        <View style={[styles.accentBar, { backgroundColor: company.accentColor }]} />

        {company.invoiceHeaderNote && <Text style={styles.headerNote}>{company.invoiceHeaderNote}</Text>}

        <View style={styles.section}>
          <Text style={styles.label}>Prepared for</Text>
          <Text>{customerLabel}</Text>
          {quotation.customer?.phone && <Text style={styles.muted}>{quotation.customer.phone}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>Unit price</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>Line total</Text>
          </View>
          {quotation.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={styles.col1}>{item.nameSnapshot}</Text>
              <Text style={styles.col2}>{item.qty}</Text>
              <Text style={styles.col3}>{money(item.unitPrice)}</Text>
              <Text style={styles.col4}>{money(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <SummaryRow label="Subtotal" value={money(quotation.subtotal)} />
          <SummaryRow label="Discount" value={`-${money(quotation.discount)}`} />
          <SummaryRow label="Tax" value={money(quotation.taxAmount)} />
          <View style={styles.summaryDivider} />
          <SummaryRow label="Total" value={money(quotation.total)} bold />
        </View>

        {hasPaymentDetails && (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailsTitle}>Payment details</Text>
            {company.bankName && <PaymentDetailsRow label="Bank" value={company.bankName} />}
            {company.accountTitle && <PaymentDetailsRow label="Account title" value={company.accountTitle} />}
            {company.accountNumber && <PaymentDetailsRow label="Account number" value={company.accountNumber} />}
            {company.iban && <PaymentDetailsRow label="IBAN" value={company.iban} />}
            {company.jazzCashNumber && <PaymentDetailsRow label="JazzCash" value={company.jazzCashNumber} />}
            {company.easyPaisaNumber && <PaymentDetailsRow label="EasyPaisa" value={company.easyPaisaNumber} />}
          </View>
        )}

        {company.invoiceFooterNote && <Text style={styles.footerNote}>{company.invoiceFooterNote}</Text>}
      </Page>
    </Document>
  );
}
