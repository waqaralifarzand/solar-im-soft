const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Random temp password shown once to the operator; excludes visually ambiguous characters. */
export function generateTempPassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += CHARSET[bytes[i] % CHARSET.length];
  return out;
}
