export interface ReportDateRange {
  from: Date;
  /** Exclusive upper bound (the day after the picker's "to" date), for use in `lt` filters. */
  to: Date;
  fromStr: string;
  toStr: string;
}

/** Plain date math, safe to import from both server and client code. */
export function defaultMonthRangeStrings(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

/**
 * Parses "YYYY-MM-DD" from/to query params (inclusive on both ends as shown to the user)
 * into UTC date boundaries for Prisma `gte`/`lt` filters. Defaults to the current month when
 * either is missing, matching the Expenses tab's own month-default choice. All-UTC
 * throughout — `date`/`createdAt` columns are stored as UTC instants and the server's local
 * timezone isn't guaranteed to be UTC.
 */
export function parseReportDateRange(from?: string, to?: string): ReportDateRange {
  const defaults = defaultMonthRangeStrings();
  const fromDate = new Date(`${from ?? defaults.from}T00:00:00.000Z`);
  const toDateInclusive = new Date(`${to ?? defaults.to}T00:00:00.000Z`);
  const toExclusive = new Date(toDateInclusive.getTime() + 24 * 60 * 60 * 1000);

  return {
    from: fromDate,
    to: toExclusive,
    fromStr: fromDate.toISOString().slice(0, 10),
    toStr: toDateInclusive.toISOString().slice(0, 10),
  };
}
