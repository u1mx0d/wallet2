import type { Quote } from "./schemas";

/**
 * Realtime'dan gelen fiyatı önbellekteki listede yerine koyar.
 * Listede olmayan semboller (portföyde olmayan hisseler) yok sayılır: aynı dizi döner.
 */
export function upsertQuote(
  list: readonly Quote[],
  quote: Quote,
): readonly Quote[] {
  const index = list.findIndex((item) => item.symbol === quote.symbol);
  if (index === -1) return list;
  return list.map((item, position) => (position === index ? quote : item));
}
