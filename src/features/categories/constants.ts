/**
 * Kategori ikon anahtarları. Görsel ikonlarla eşleme ADIM 4c'de yapılacak.
 * İlk 13 anahtar default-categories Function'ındakilerle aynıdır.
 */
export const CATEGORY_ICON_KEYS = [
  "cart",
  "utensils",
  "bus",
  "receipt",
  "home",
  "heart",
  "film",
  "shirt",
  "book",
  "dots",
  "briefcase",
  "sparkles",
  "gift",
  "car",
  "plane",
  "phone",
  "coffee",
  "paw",
  "baby",
  "dumbbell",
  "tool",
  "chart",
  "coins",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

/** Kullanıcının seçebileceği kategori renkleri (açık ve koyu temada okunabilir orta tonlar). */
export const CATEGORY_COLORS = [
  "#16A34A",
  "#15803D",
  "#0D9488",
  "#0891B2",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#C026D3",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#64748B",
] as const;
