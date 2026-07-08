import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/forgot-password"];

function roleHome(role: string): string {
  return role === "SUPER_ADMIN" ? "/super" : "/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
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

  if (pathname.startsWith("/super")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL(roleHome(role), req.url));
    }
    return NextResponse.next();
  }

  // Every other guarded route is a company route — SUPER_ADMIN has no tenant
  // context outside of impersonation (Phase 1), so keep it out of here for now.
  if (role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/super", req.url));
  }

  if (pathname.startsWith("/settings") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(roleHome(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
