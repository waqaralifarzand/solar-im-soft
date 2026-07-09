/**
 * Signs/verifies a durable, unauthenticated share token for a single record's (invoice or
 * quotation) public read-only PDF. Same Web Crypto HMAC-SHA256 technique as
 * lib/impersonation.ts. The token body is the record's id itself — visible if decoded, but
 * that's fine: a Prisma cuid is already non-guessable, and the security property that
 * matters is that nobody can forge a *valid* token for an id they don't already hold a link
 * for, since that requires NEXTAUTH_SECRET. No expiry: a share link is meant to keep working
 * whenever the customer opens it later, like any other "view your document" link.
 */

const SEPARATOR = ".";

async function getKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to sign invoice share tokens");
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

export async function signShareToken(recordId: string): Promise<string> {
  const key = await getKey();
  const body = bytesToBase64url(new TextEncoder().encode(recordId));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}${SEPARATOR}${bytesToBase64url(new Uint8Array(signature))}`;
}

/** Returns the record id if the token is well-formed and its signature is valid, else null. */
export async function verifyShareToken(token: string): Promise<string | null> {
  const [body, signature] = token.split(SEPARATOR);
  if (!body || !signature) return null;

  let valid: boolean;
  try {
    const key = await getKey();
    valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(signature) as BufferSource,
      new TextEncoder().encode(body),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    return new TextDecoder().decode(base64urlToBytes(body));
  } catch {
    return null;
  }
}
