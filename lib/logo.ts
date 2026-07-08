/** Shared constraints for the base64-in-db logo upload (client field + server Zod schema). */
export const MAX_LOGO_FILE_BYTES = 200 * 1024; // 200KB raw file — hard reject above this
export const MAX_LOGO_DATA_URL_LENGTH = 400_000; // safety-net cap on the final (post-compression) data URI string
export const MAX_LOGO_DIMENSION = 256; // logos render at a few dozen px; 256px is generous headroom
export const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/;
