/** Shared constraints for the base64-in-db logo upload (client field + server Zod schema). */
export const MAX_LOGO_FILE_BYTES = 300 * 1024; // 300KB raw file, before base64 inflates it ~33%
export const MAX_LOGO_DATA_URL_LENGTH = 400_000; // generous cap on the resulting data URI string
export const LOGO_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/;
