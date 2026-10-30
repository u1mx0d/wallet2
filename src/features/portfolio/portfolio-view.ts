import {
    computePositions,
    summarizePortfolio,
    valuePosition,
    type EngineError,
    type PortfolioSummary,
    type PositionValuation,
} from "@/domain/portfolio";

import type { Quote, Trade } from "./schemas";

export type PortfolioView =
  | {
      ok: true;
      /** Önce açık pozisyonlar (piyasa değerine göre büyükten küçüğe), sonra kapalılar. */
      positions: PositionValuation[];
      summary: PortfolioSummary;
      quotesBySymbol: Map<string, Quote>;
    }
  | { ok: false; error: EngineError };

/** İşlemlerde geçen semboller (benzersiz, alfabetik). */
export function heldSymbols(trades: readonly Trade[]): string[] {
  return [...new Set(trades.map((trade) => trade.symbol))].sort();
}

/** İşlemler + fiyatlar → pozisyonlar, değerleme ve portföy özeti. Saf fonksiyon. */
export function buildPortfolio(
  trades: readonly Trade[],
  quotes: readonly Quote[],
): PortfolioView {
  const result = computePositions(trades);
  if (!result.ok) return { ok: false, error: result.error };

  const quotesBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  const valuations = result.positions.map((position) => {
    const quote = quotesBySymbol.get(position.symbol);
    return valuePosition(
      position,
      quote
        ? { priceMinor: quote.priceMinor, prevCloseMinor: quote.prevCloseMinor }
        : undefined,
    );
  });

  const positions = [...valuations].sort((a, b) => {
    const aOpen = a.lots > 0 ? 1 : 0;
    const bOpen = b.lots > 0 ? 1 : 0;
    if (aOpen !== bOpen) return bOpen - aOpen;
    const byValue =
      (b.marketValueMinor ?? b.totalCostMinor) -
      (a.marketValueMinor ?? a.totalCostMinor);
    return byValue !== 0 ? byValue : a.symbol < b.symbol ? -1 : 1;
  });

  return {
    ok: true,
    positions,
    summary: summarizePortfolio(valuations),
    quotesBySymbol,
  };
}
