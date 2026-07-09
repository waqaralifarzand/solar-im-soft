import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { verifyInvoiceShareToken } from "@/lib/pdfShareToken";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf-document";

export const dynamic = "force-dynamic";

// Unauthenticated by design (see middleware.ts's /api/public exemption) — the signed
// token itself is the capability, so a tampered/invalid token must 404 exactly like a
// nonexistent invoice would, never revealing which case it was.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const invoiceId = await verifyInvoiceShareToken(params.token);
  if (!invoiceId) return new NextResponse("Not found", { status: 404 });

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    select: { companyId: true },
  });
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const [detail, company] = await Promise.all([
    getInvoiceDetail(invoice.companyId, invoiceId),
    prisma.company.findUniqueOrThrow({
      where: { id: invoice.companyId },
      select: {
        name: true,
        logoUrl: true,
        address: true,
        phone: true,
        email: true,
        invoiceHeaderNote: true,
        invoiceFooterNote: true,
        accentColor: true,
        currency: true,
        lakhCroreFormat: true,
      },
    }),
  ]);
  if (!detail) return new NextResponse("Not found", { status: 404 });

  const buffer = await renderToBuffer(<InvoicePdfDocument company={company} invoice={detail} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${detail.invoiceNo}.pdf"`,
    },
  });
}
