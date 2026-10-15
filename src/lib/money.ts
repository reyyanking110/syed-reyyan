import type { Currency } from "@/db/schema";
import { roundMoney, toNumber } from "./utils";

export const CURRENCIES: { code: Currency; label: string; symbol: string; locale: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "PKR", label: "Pakistani Rupee", symbol: "Rs", locale: "en-PK" },
];

export function currencySymbol(currency: Currency) {
  return CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
}

type FormatOptions = {
  /** Hide decimals when the amount is a whole number (default: true for PKR, false for USD). */
  compact?: boolean;
  /** Always hide decimals. */
  noDecimals?: boolean;
  /** Show explicit +/- sign. */
  signed?: boolean;
};

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: Currency, fractionDigits: number, compact: boolean) {
  const key = `${currency}-${fractionDigits}-${compact}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      notation: compact ? "compact" : "standard",
      compactDisplay: "short",
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats a monetary amount. USD → "$1,250.00", PKR → "Rs 125,000".
 * Negative values render as "-$120.00".
 */
export function formatMoney(
  amount: string | number | null | undefined,
  currency: Currency = "USD",
  options: FormatOptions = {},
) {
  const value = toNumber(amount);
  const isWhole = Math.abs(value % 1) < 0.005;
  const fractionDigits = options.noDecimals || (currency === "PKR" && isWhole) ? 0 : 2;
  const formatted = getFormatter(currency, fractionDigits, false).format(Math.abs(value));
  const symbol = currencySymbol(currency);
  const sign = value < 0 ? "-" : options.signed && value > 0 ? "+" : "";
  return currency === "PKR" ? `${sign}${symbol} ${formatted}` : `${sign}${symbol}${formatted}`;
}

/** Compact variant for KPI cards: "$12.4K", "Rs 1.2M". */
export function formatMoneyCompact(amount: string | number | null | undefined, currency: Currency = "USD") {
  const value = toNumber(amount);
  if (Math.abs(value) < 10_000) return formatMoney(value, currency, { noDecimals: currency === "PKR" });
  const formatted = getFormatter(currency, 1, true).format(Math.abs(value));
  const symbol = currencySymbol(currency);
  const sign = value < 0 ? "-" : "";
  return currency === "PKR" ? `${sign}${symbol} ${formatted}` : `${sign}${symbol}${formatted}`;
}

/** Converts between USD and PKR using the user's configured rate. */
export function convertCurrency(amount: number, from: Currency, to: Currency, usdToPkrRate: number) {
  if (from === to) return amount;
  const rate = usdToPkrRate > 0 ? usdToPkrRate : 278.5;
  return from === "USD" ? roundMoney(amount * rate) : roundMoney(amount / rate);
}

export function parseMoneyInput(value: string | number | null | undefined) {
  if (typeof value === "number") return roundMoney(value);
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return roundMoney(toNumber(cleaned));
}

export function toDecimalString(value: number) {
  return roundMoney(value).toFixed(2);
}
