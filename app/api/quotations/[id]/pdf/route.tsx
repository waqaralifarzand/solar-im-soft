import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireRole } from "@/lib/requireRole";
import { prisma } from "@/lib/prisma";
import { getQuotationDetail } from "@/lib/queries/quotations";
import { QuotationPdfDocument } from "@/lib/pdf/quotation-pdf-document";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await requireRole("ADMIN", "MANAGER");

  const [detail, company] = await Promise.all([
    getQuotationDetail(ctx.companyId, params.id),
    prisma.company.findUniqueOrThrow({
      where: { id: ctx.companyId },
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

  const buffer = await renderToBuffer(<QuotationPdfDocument company={company} quotation={detail} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${detail.quoteNo}.pdf"`,
    },
  });
}
