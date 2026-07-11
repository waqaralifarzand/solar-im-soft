import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { getInvoiceDetail } from "@/lib/queries/invoices";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf-document";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext();

  const [detail, company] = await Promise.all([
    getInvoiceDetail(ctx.companyId, params.id),
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
  if (ctx.role === "CASHIER" && detail.createdBy !== ctx.userId) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await renderToBuffer(<InvoicePdfDocument company={company} invoice={detail} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${detail.invoiceNo}.pdf"`,
    },
  });
}
