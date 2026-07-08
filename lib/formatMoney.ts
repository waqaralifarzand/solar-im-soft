import type { Prisma } from "@prisma/client";

type MoneyInput = Prisma.Decimal | number | string;

interface FormatMoneyOptions {
  currency: string;
  lakhCroreFormat: boolean;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "Rs",
  INR: "₹",
  USD: "$",
  AED: "AED",
  SAR: "SAR",
};

function toNumber(amount: MoneyInput): number {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") return Number(amount);
  return amount.toNumber();
}

/**
 * Formats a money amount per company currency and number-grouping preference.
 * lakhCroreFormat groups digits as 1,23,45,678 (Pakistani/Indian convention)
 * instead of the western 12,345,678.
 */
export function formatMoney(amount: MoneyInput, options: FormatMoneyOptions): string {
  const value = toNumber(amount);
  const symbol = CURRENCY_SYMBOLS[options.currency] ?? options.currency;
  const formatted = new Intl.NumberFormat(options.lakhCroreFormat ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${symbol} ${formatted}`;
}
