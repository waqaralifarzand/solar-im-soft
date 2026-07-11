import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getQuotationDetail } from "@/lib/queries/quotations";
import { verifyShareToken } from "@/lib/pdfShareToken";
import { QuotationPdfDocument } from "@/lib/pdf/quotation-pdf-document";

export const dynamic = "force-dynamic";

// Unauthenticated by design (see middleware.ts's /api/public exemption) — the signed
// token itself is the capability, so a tampered/invalid token must 404 exactly like a
// nonexistent quotation would, never revealing which case it was.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const quotationId = await verifyShareToken(params.token);
  if (!quotationId) return new NextResponse("Not found", { status: 404 });

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { companyId: true },
  });
  if (!quotation) return new NextResponse("Not found", { status: 404 });

  const [detail, company] = await Promise.all([
    getQuotationDetail(quotation.companyId, quotationId),
    prisma.company.findUniqueOrThrow({
      where: { id: quotation.companyId },
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
        bankName: true,
        accountTitle: true,
        accountNumber: true,
        iban: true,
        jazzCashNumber: true,
        easyPaisaNumber: true,
      },
    }),
  ]);
  if (!detail) return new NextResponse("Not found", { status: 404 });

  const buffer = await renderToBuffer(<QuotationPdfDocument company={company} quotation={detail} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${detail.quoteNo}.pdf"`,
    },
  });
}
