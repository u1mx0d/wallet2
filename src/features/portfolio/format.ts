/**
 * Yatırım ekranlarının saf biçimlendirme yardımcıları.
 */
import { formatDayLabel } from "@/domain/dates";
import type { TradeSide } from "@/domain/portfolio";

import type { Quote } from "./schemas";

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** 1000 → "1.000" */
export function formatLots(lots: number): string {
  return String(lots).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * İşlemin nakit tutarı (kuruş): alımda ödenen (lot × fiyat + komisyon),
 * satışta alınan (lot × fiyat − komisyon). Güvenli tam sayı sınırını aşarsa null.
 */
export function tradeCashMinor({
  side,
  lots,
  priceMinor,
  feeMinor,
}: {
  side: TradeSide;
  lots: number;
  priceMinor: number;
  feeMinor: number;
}): number | null {
  const gross = BigInt(lots) * BigInt(priceMinor);
  const fee = BigInt(feeMinor);
  const total = side === "buy" ? gross + fee : gross - fee;
  if (total > MAX_SAFE || total < -MAX_SAFE) return null;
  return Number(total);
}

/** "09:05" (yerel saat). */
export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "Bugün 11:50", "Dün 18:10", "27 Ekim 18:10" */
export function formatQuoteTime(iso: string, now: Date): string {
  const date = new Date(iso);
  return `${formatDayLabel(date, now)} ${formatClock(date)}`;
}

/** Fiyatların en ESKİSİNİN zamanı: en yenisini göstermek eski bir fiyatı gizlerdi. */
export function oldestQuoteTime(quotes: readonly Quote[]): string | null {
  let oldest: string | null = null;
  for (const quote of quotes) {
    if (oldest === null || Date.parse(quote.updatedAt) < Date.parse(oldest))
      oldest = quote.updatedAt;
  }
  return oldest;
}

/** Dağılım grafiği renkleri (açık ve koyu temada okunabilir orta tonlar). */
export const ALLOCATION_COLORS = [
  "#2563EB",
  "#16A34A",
  "#EA580C",
  "#7C3AED",
  "#DB2777",
  "#0891B2",
  "#CA8A04",
  "#DC2626",
  "#4F46E5",
  "#0D9488",
] as const;

export function allocationColor(index: number): string {
  return ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] ?? "#64748B";
}
