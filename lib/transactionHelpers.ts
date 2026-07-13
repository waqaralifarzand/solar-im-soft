import { Prisma } from "@prisma/client";

/**
 * Prisma's interactive-transaction default (5s) is too tight for a pooled Neon connection
 * under real production latency — this is what was producing P2028 ("Transaction not
 * found"/expired) on POS sales. maxWait is how long a transaction waits to acquire a
 * connection from the pool before giving up; timeout is how long the transaction itself is
 * allowed to stay open. Applied to every interactive `$transaction` in the codebase.
 */
export const DEFAULT_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 } as const;

const INFRA_ERROR_TYPES = [
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
];

/**
 * Business-rule errors thrown inside a transaction (e.g. "Not enough stock for X") are
 * developer-authored, already-safe messages meant to reach the client verbatim. Anything
 * Prisma itself throws — a lost connection, P2028's transaction timeout, an engine crash —
 * carries no user-facing meaning and must never be shown as-is. Call this in the `catch` of
 * every transaction that can plausibly run long enough to hit that class of failure.
 */
export function toUserFacingError(error: unknown, fallbackMessage: string): Error {
  if (INFRA_ERROR_TYPES.some((cls) => error instanceof cls)) {
    return new Error(fallbackMessage);
  }
  if (error instanceof Error) return error;
  return new Error(fallbackMessage);
}
