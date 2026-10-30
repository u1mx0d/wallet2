import { describe, expect, it } from "vitest";

import { buildPortfolio, heldSymbols } from "./portfolio-view";
import {
    parseQuoteRow,
    parseTradeRow,
    tradeFormSchema,
    type Quote,
    type Trade,
} from "./schemas";
import { foldForSearch } from "./search";

const day = (n: number) => new Date(Date.UTC(2026, 8, n, 9)).toISOString();

function trade(
  id: string,
  symbol: string,
  side: Trade["side"],
  lots: number,
  priceMinor: number,
  n: number,
): Trade {
  return {
    id,
    symbol,
    side,
    lots,
    priceMinor,
    feeMinor: 0,
    date: day(n),
    createdAt: day(n),
  };
}

function quote(
  symbol: string,
  priceMinor: number,
  prevCloseMinor: number | null = null,
): Quote {
  return {
    symbol,
    name: symbol,
    priceMinor,
    prevCloseMinor,
    updatedAt: day(30),
    source: "burkut",
    stale: false,
  };
}

describe("foldForSearch", () => {
  it.each([
    ["türk", "TURK"],
    ["  Şişe ", "SISE"],
    ["ığdır", "IGDIR"],
    ["İstanbul", "ISTANBUL"],
    ["çelik", "CELIK"],
    ["thyao", "THYAO"],
  ])("%j → %s", (input, expected) => {
    expect(foldForSearch(input)).toBe(expected);
  });
});

describe("parseTradeRow / parseQuoteRow", () => {
  it("işlem satırını çevirir, komisyon yoksa 0", () => {
    expect(
      parseTradeRow({
        $id: "t1",
        $createdAt: day(2),
        userId: "u1",
        symbol: "THYAO",
        side: "buy",
        lots: 10,
        priceMinor: 24830,
        feeMinor: null,
        date: day(1),
      }),
    ).toEqual({
      id: "t1",
      symbol: "THYAO",
      side: "buy",
      lots: 10,
      priceMinor: 24830,
      feeMinor: 0,
      date: day(1),
      createdAt: day(2),
    });
  });

  it("geçersiz işlem satırında null", () => {
    expect(
      parseTradeRow({
        $id: "t1",
        $createdAt: day(1),
        symbol: "X",
        side: "hold",
        lots: 1,
        priceMinor: 1,
        date: day(1),
      }),
    ).toBeNull();
  });

  it("fiyat satırını çevirir; ad yoksa sembol, eski veri yoksa false", () => {
    expect(
      parseQuoteRow({
        $id: "THYAO",
        symbol: "THYAO",
        name: null,
        priceMinor: 24830,
        prevCloseMinor: null,
        updatedAt: "2026-10-30T08:50:00.000+00:00",
        source: "burkut",
        stale: null,
      }),
    ).toEqual({
      symbol: "THYAO",
      name: "THYAO",
      priceMinor: 24830,
      prevCloseMinor: null,
      updatedAt: "2026-10-30T08:50:00.000+00:00",
      source: "burkut",
      stale: false,
    });
  });
});

describe("tradeFormSchema", () => {
  const valid = {
    symbol: " thyao ",
    side: "buy",
    lots: "1.000",
    price: "248,30",
    fee: "",
    date: day(1),
  };

  it("form alanlarını sunucuya gidecek biçime çevirir", () => {
    expect(tradeFormSchema.parse(valid)).toEqual({
      symbol: "THYAO",
      side: "buy",
      lots: 1000,
      priceMinor: 24830,
      feeMinor: 0,
      date: day(1),
    });
  });

  it("komisyonu kuruşa çevirir", () => {
    expect(tradeFormSchema.parse({ ...valid, fee: "12,5" }).feeMinor).toBe(
      1250,
    );
  });

  it.each([
    [{ lots: "1,5" }, "lots"],
    [{ lots: "0" }, "lots"],
    [{ lots: "" }, "lots"],
    [{ price: "0" }, "price"],
    [{ price: "abc" }, "price"],
    [{ fee: "-1" }, "fee"],
    [{ symbol: "" }, "symbol"],
    [{ date: "dün" }, "date"],
  ])("geçersiz girişi reddeder: %j", (override, field) => {
    const result = tradeFormSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path[0]).toBe(field);
  });
});

describe("buildPortfolio", () => {
  const trades = [
    trade("a", "THYAO", "buy", 10, 10_000, 1),
    trade("b", "THYAO", "buy", 30, 12_000, 2),
    trade("c", "THYAO", "sell", 10, 13_000, 3),
    trade("d", "ASELS", "buy", 10, 5_000, 1),
    trade("e", "GARAN", "buy", 10, 10_000, 1),
    trade("f", "GARAN", "sell", 10, 12_000, 2),
  ];

  it("sembolleri benzersiz ve alfabetik verir", () => {
    expect(heldSymbols(trades)).toEqual(["ASELS", "GARAN", "THYAO"]);
  });

  it("açık pozisyonları değere göre, kapalıları sona dizer ve özeti hesaplar", () => {
    const view = buildPortfolio(trades, [
      quote("THYAO", 12_500, 12_000),
      quote("ASELS", 6_000),
    ]);
    if (!view.ok) throw new Error("Hata beklenmiyordu");
    expect(view.positions.map((position) => position.symbol)).toEqual([
      "THYAO",
      "ASELS",
      "GARAN",
    ]);
    expect(view.summary).toMatchObject({
      marketValueMinor: 375_000 + 60_000,
      realizedPnlMinor: 15_000 + 20_000,
      openPositionCount: 2,
      missingPriceSymbols: [],
    });
  });

  it("fiyatı olmayan pozisyonu özetin dışında tutar ve bildirir", () => {
    const view = buildPortfolio(trades, [quote("THYAO", 12_500)]);
    if (!view.ok) throw new Error("Hata beklenmiyordu");
    expect(view.summary.missingPriceSymbols).toEqual(["ASELS"]);
  });

  it("tutarsız işlem geçmişinde hata döner", () => {
    const view = buildPortfolio([trade("x", "THYAO", "sell", 1, 100, 1)], []);
    expect(view.ok).toBe(false);
  });
});
