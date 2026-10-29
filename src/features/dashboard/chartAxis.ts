/**
 * Grafik ekseni: "güzel" adım değerleri (1, 2, 2,5, 5 × 10ⁿ) ve pozitif/negatif tarafta
 * AYNI adım. Değerler kuruş cinsindendir. Saf TypeScript.
 */

export type Axis = {
  stepValue: number;
  /** X ekseninin üstündeki bölüm sayısı (en az 1). */
  noOfSections: number;
  maxValue: number;
  /** X ekseninin altındaki bölüm sayısı (negatif değer yoksa 0). */
  noOfSectionsBelowXAxis: number;
  /** Negatif değer yoksa 0. */
  mostNegativeValue: number;
};

const NICE_FACTORS = [1, 2, 2.5, 5, 10] as const;
/** Tüm değerler sıfırsa kullanılacak adım: ₺1. */
const DEFAULT_STEP = 100;

export function niceStep(raw: number): number {
  if (!(raw > 0)) return DEFAULT_STEP;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const factor of NICE_FACTORS) {
    const step = factor * magnitude;
    if (step >= raw) return Math.max(1, Math.round(step));
  }
  return Math.max(1, Math.round(10 * magnitude));
}

export function computeAxis(
  values: readonly number[],
  targetSections = 4,
): Axis {
  let maxPositive = 0;
  let minNegative = 0;
  for (const value of values) {
    if (value > maxPositive) maxPositive = value;
    if (value < minNegative) minNegative = value;
  }

  const span = Math.max(maxPositive, -minNegative);
  const stepValue = niceStep(span / targetSections);
  const noOfSections = Math.max(1, Math.ceil(maxPositive / stepValue));
  const noOfSectionsBelowXAxis =
    minNegative < 0 ? Math.ceil(-minNegative / stepValue) : 0;

  return {
    stepValue,
    noOfSections,
    maxValue: noOfSections * stepValue,
    noOfSectionsBelowXAxis,
    // -0 * x JavaScript'te -0 verir; negatif bölüm yoksa açıkça 0 döndür.
    mostNegativeValue:
      noOfSectionsBelowXAxis === 0 ? 0 : -noOfSectionsBelowXAxis * stepValue,
  };
}
