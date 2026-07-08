import { timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const NOT_FOUND = new NextResponse(null, { status: 404 });

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * One-time bootstrap: creates the Super Admin from env vars, but only when the
 * User table is completely empty and a valid BOOTSTRAP_TOKEN is supplied. Every
 * failure mode returns a bare 404 rather than 401/403 so the route's existence
 * (and why a given attempt failed) isn't revealed.
 */
export async function GET(request: NextRequest) {
  const bootstrapToken = process.env.BOOTSTRAP_TOKEN;
  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL;
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD;

  if (!bootstrapToken || !superAdminEmail || !superAdminPassword) {
    return NOT_FOUND;
  }

  const token = request.nextUrl.searchParams.get("token");
  if (!token || !safeCompare(token, bootstrapToken)) {
    return NOT_FOUND;
  }

  const userCount = await prisma.user.count();
  if (userCount !== 0) {
    return NOT_FOUND;
  }

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: superAdminEmail,
      passwordHash,
      role: "SUPER_ADMIN",
      companyId: null,
    },
  });

  return NextResponse.json({ ok: true });
}
