import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { IMPERSONATION_COOKIE_NAME, verifyImpersonationToken } from "@/lib/impersonation";

const PUBLIC_PATHS = ["/login", "/forgot-password"];

function roleHome(role: string): string {
  return role === "SUPER_ADMIN" ? "/super" : "/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/bootstrap" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token && pathname === "/login") {
      return NextResponse.redirect(new URL(roleHome(token.role), req.url));
    }
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role;
  const impersonation =
    role === "SUPER_ADMIN"
      ? await verifyImpersonationToken(req.cookies.get(IMPERSONATION_COOKIE_NAME)?.value)
      : null;
  const effectiveRole = impersonation ? impersonation.targetRole : role;

  if (pathname.startsWith("/super")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL(roleHome(role), req.url));
    }
    return NextResponse.next();
  }

  // Every other guarded route is a company route. A SUPER_ADMIN only gets in while
  // actively impersonating (Phase 1); otherwise they have no tenant context.
  if (role === "SUPER_ADMIN" && !impersonation) {
    return NextResponse.redirect(new URL("/super", req.url));
  }

  if (pathname.startsWith("/settings") && effectiveRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(roleHome(effectiveRole), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
