import type { Role } from "@prisma/client";

/**
 * Signs/verifies a short-lived impersonation token stored in a cookie, using the Web Crypto
 * API (not Node's `crypto` module) so this can be verified from Edge middleware as well as
 * from server actions/components. Keeps the SUPER_ADMIN's real NextAuth session untouched —
 * impersonation is layered on top via this cookie, never by mutating the JWT.
 */

const COOKIE_NAME = "impersonation";
const MAX_AGE_SECONDS = 60 * 60; // 1 hour

export interface ImpersonationPayload {
  companyId: string;
  targetUserId: string;
  targetRole: Role;
  actualSuperAdminId: string;
  exp: number; // epoch seconds
}

async function getKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to sign impersonation tokens");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToBase64url(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const str = atob(b64 + pad);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

export async function signImpersonationToken(
  payload: Omit<ImpersonationPayload, "exp">,
): Promise<{ token: string; maxAge: number }> {
  const full: ImpersonationPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  const key = await getKey();
  const body = bytesToBase64url(new TextEncoder().encode(JSON.stringify(full)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const token = `${body}.${bytesToBase64url(new Uint8Array(signature))}`;
  return { token, maxAge: MAX_AGE_SECONDS };
}

export async function verifyImpersonationToken(
  token: string | undefined,
): Promise<ImpersonationPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const key = await getKey();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlToBytes(signature) as BufferSource,
    new TextEncoder().encode(body),
  );
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(body))) as ImpersonationPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export { COOKIE_NAME as IMPERSONATION_COOKIE_NAME };
