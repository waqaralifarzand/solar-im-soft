import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/getTenantContext";
import { prisma } from "@/lib/prisma";
import { LOGO_DATA_URL_PATTERN } from "@/lib/logo";

export const dynamic = "force-dynamic";

/**
 * Serves the company logo as a standalone, cacheable image response instead of inlining the
 * base64 data URI in every page's RSC payload (see SCRATCHPAD.md's perf investigation report —
 * the inlined version added ~500KB, duplicated, to every navigation and every router.refresh()).
 * ETag is a hash of the stored data URI itself, so the browser gets a cheap 304 instead of
 * re-downloading the image until the logo actually changes.
 */
export async function GET(request: Request) {
  const ctx = await getTenantContext();

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: ctx.companyId },
    select: { logoUrl: true },
  });

  if (!company.logoUrl || !LOGO_DATA_URL_PATTERN.test(company.logoUrl)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const etag = `"${createHash("sha1").update(company.logoUrl).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const [, mime, base64] = company.logoUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/) ?? [];
  if (!mime || !base64) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, max-age=3600, must-revalidate",
      ETag: etag,
    },
  });
}
