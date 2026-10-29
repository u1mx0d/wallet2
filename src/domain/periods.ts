/**
 * Dashboard dönemleri. Tüm hesaplar cihazın YEREL saatine göredir.
 * Aralıklar [start, end) şeklindedir: start dahil, end hariç.
 * Bu dosya saf TypeScript'tir.
 */
import { addLocalDays, startOfLocalDay, TR_MONTHS } from "./dates";

export type PeriodPreset = "week" | "month" | "year";

export type Period =
  | { kind: PeriodPreset }
  /** Özel dönem: iki gün de DAHİL. */
  | { kind: "custom"; start: Date; end: Date };

export type DateRange = {
  /** Dahil. */
  start: Date;
  /** Hariç. */
  end: Date;
};

const DAY_MS = 86_400_000;

/** Pazartesi 00:00 (JavaScript'te pazar = 0). */
function startOfLocalWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % 7;
  return addLocalDays(date, -daysSinceMonday);
}

export function resolvePeriod(period: Period, now: Date): DateRange {
  switch (period.kind) {
    case "week": {
      const start = startOfLocalWeek(now);
      return { start, end: addLocalDays(start, 7) };
    }
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case "year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1),
      };
    case "custom": {
      const [first, last] =
        period.start <= period.end
          ? [period.start, period.end]
          : [period.end, period.start];
      return { start: startOfLocalDay(first), end: addLocalDays(last, 1) };
    }
  }
}

/** Appwrite sorgusu için dahil-dahil ISO sınırları (greaterThanEqual / lessThanEqual). */
export function toQueryBounds(range: DateRange): { from: string; to: string } {
  return {
    from: range.start.toISOString(),
    to: new Date(range.end.getTime() - 1).toISOString(),
  };
}

/** Aralıktaki gün sayısı (yaz saati farkına dayanıklı). */
export function daysInRange(range: DateRange): number {
  return Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS);
}

/** "Bu hafta", "Ekim 2026", "2026", "1 Eki – 15 Eki 2026" */
export function formatPeriodLabel(period: Period, now: Date): string {
  switch (period.kind) {
    case "week":
      return "Bu hafta";
    case "month":
      return `${TR_MONTHS[now.getMonth()] ?? ""} ${now.getFullYear()}`;
    case "year":
      return String(now.getFullYear());
    case "custom": {
      const { start, end } = resolvePeriod(period, now);
      const last = addLocalDays(end, -1);
      const short = (date: Date) =>
        `${date.getDate()} ${TR_MONTHS_SHORT[date.getMonth()] ?? ""}`;
      return start.getFullYear() === last.getFullYear()
        ? `${short(start)} – ${short(last)} ${last.getFullYear()}`
        : `${short(start)} ${start.getFullYear()} – ${short(last)} ${last.getFullYear()}`;
    }
  }
}

export const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
] as const;
