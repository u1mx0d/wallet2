import { describe, expect, it } from "vitest";

import {
  BURKUT_SOURCE,
  derivePrevCloseMinor,
  isEndOfDayRun,
  isWithinMarketWindow,
  parseBurkutResponse,
  planStaleMarks,
  planWrites,
  rowMatches,
  toBasisPoints,
  toMinor,
} from "./core.js";

describe("toMinor", () => {
  it.each([
    [248.3, 24830],
    [2.56, 256],
    [0.45, 45],
    [1.27, 127],
    [1234.56, 123456],
    [0.01, 1],
  ])("%d TL → %d kuruş", (value, expected) => {
    expect(toMinor(value)).toBe(expected);
  });

  it.each([
    [0],
    [-1],
    [1.005],
    [12.345],
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    ["248.3"],
    [null],
    [undefined],
  ])("geçersiz değeri (%s) reddeder", (value) => {
    expect(toMinor(value)).toBeNull();
  });
});

describe("toBasisPoints", () => {
  it("2 ondalıklı yüzdeyi tam baz puana çevirir", () => {
    expect(toBasisPoints(-1.66)).toBe(-166);
    expect(toBasisPoints(4.48)).toBe(448);
    expect(toBasisPoints(0)).toBe(0);
  });

  it("geçersiz ve ±%50 dışı değerlerde null", () => {
    expect(toBasisPoints(null)).toBeNull();
    expect(toBasisPoints(Number.NaN)).toBeNull();
    expect(toBasisPoints(55)).toBeNull();
    expect(toBasisPoints(-60)).toBeNull();
  });
});

describe("derivePrevCloseMinor", () => {
  it("THYAO örneği: 248,30 TL ve −%1,66 → yaklaşık 252,49 TL", () => {
    expect(derivePrevCloseMinor(24830, -166)).toBe(25249);
  });

  it("değişim sıfırsa önceki kapanış fiyata eşittir", () => {
    expect(derivePrevCloseMinor(45, 0)).toBe(45);
  });

  it("değişim bilinmiyorsa null", () => {
    expect(derivePrevCloseMinor(24830, null)).toBeNull();
  });

  it("çok büyük fiyatta taşma olmadan hesaplar", () => {
    expect(derivePrevCloseMinor(999_999_999_999, 0)).toBe(999_999_999_999);
  });
});

describe("parseBurkutResponse", () => {
  const thyao = {
    change: -4.191356518202156,
    changePercent: -1.66,
    currentPrice: 248.3,
    freshness: "FRESH",
    name: "TURK HAVA YOLLARI",
    price: 248.3,
    stale: false,
    symbol: "THYAO",
    updatedAt: "2026-10-30T08:50:00Z",
    volume: 2201352012.6,
  };

  it("geçerli satırı iç biçime çevirir", () => {
    expect(parseBurkutResponse({ data: [thyao] })).toEqual({
      quotes: [
        {
          symbol: "THYAO",
          name: "TURK HAVA YOLLARI",
          priceMinor: 24830,
          prevCloseMinor: 25249,
          asOf: "2026-10-30T08:50:00.000Z",
          stale: false,
        },
      ],
      invalidCount: 0,
    });
  });

  it("geçersiz satırları atlar ve sayar", () => {
    const result = parseBurkutResponse({
      data: [
        thyao,
        { ...thyao, symbol: "x" },
        { ...thyao, symbol: "ABC", price: 0 },
        { ...thyao, symbol: "DEF", price: 1.005 },
        { ...thyao, symbol: "GHI", updatedAt: "dün" },
        null,
      ],
    });
    expect(result.quotes.map((quote) => quote.symbol)).toEqual(["THYAO"]);
    expect(result.invalidCount).toBe(5);
  });

  it("sağlayıcının eski veri işaretlerini taşır", () => {
    const [byFlag] = parseBurkutResponse({
      data: [{ ...thyao, stale: true }],
    }).quotes;
    const [byFreshness] = parseBurkutResponse({
      data: [{ ...thyao, freshness: "STALE" }],
    }).quotes;
    expect(byFlag?.stale).toBe(true);
    expect(byFreshness?.stale).toBe(true);
  });

  it("sembolü büyük harfe çevirir, adı yoksa sembolü kullanır", () => {
    const [quote] = parseBurkutResponse({
      data: [{ ...thyao, symbol: " thyao ", name: "" }],
    }).quotes;
    expect(quote?.symbol).toBe("THYAO");
    expect(quote?.name).toBe("THYAO");
  });

  it("beklenmedik yanıt biçiminde hata fırlatır", () => {
    expect(() => parseBurkutResponse({ error: "quota" })).toThrow();
    expect(() => parseBurkutResponse(null)).toThrow();
  });
});

describe("isWithinMarketWindow", () => {
  it.each([
    ["2026-10-30T06:59:00Z", false], // cuma 09:59 TR
    ["2026-10-30T07:00:00Z", true], // cuma 10:00 TR
    ["2026-10-30T12:37:21Z", true],
    ["2026-10-30T16:59:00Z", true], // cuma 19:59 TR
    ["2026-10-30T17:00:00Z", false], // cuma 20:00 TR
    ["2026-10-31T10:00:00Z", false], // cumartesi
    ["2026-11-01T10:00:00Z", false], // pazar
  ])("%s → %s", (iso, expected) => {
    expect(isWithinMarketWindow(new Date(iso))).toBe(expected);
  });
});

describe("isEndOfDayRun", () => {
  it.each([
    ["2026-10-30T16:00:00Z", true], // cuma 19:00 TR: saatin herhangi bir dakikası
    ["2026-10-30T16:37:21Z", true],
    ["2026-10-30T15:59:59Z", false], // 18:59 TR: henüz değil
    ["2026-10-30T07:00:00Z", false],
    ["2026-10-31T16:30:00Z", false], // cumartesi
  ])("%s → %s", (iso, expected) => {
    expect(isEndOfDayRun(new Date(iso))).toBe(expected);
  });
});

describe("rowMatches", () => {
  const data = {
    symbol: "THYAO",
    name: "TURK HAVA YOLLARI",
    priceMinor: 24830,
    prevCloseMinor: 25249,
    updatedAt: "2026-10-30T08:50:00.000Z",
    source: BURKUT_SOURCE,
    stale: false,
  };

  it("Appwrite'ın farklı zaman biçimini aynı an olarak tanır", () => {
    expect(
      rowMatches({ ...data, updatedAt: "2026-10-30T08:50:00.000+00:00" }, data),
    ).toBe(true);
  });

  it("fiyat, kaynak veya eski veri işareti değişmişse eşleşmez", () => {
    expect(rowMatches({ ...data, priceMinor: 24800 }, data)).toBe(false);
    expect(rowMatches({ ...data, source: "test-verisi" }, data)).toBe(false);
    expect(rowMatches({ ...data, stale: true }, data)).toBe(false);
  });
});

describe("planWrites / planStaleMarks", () => {
  const quote = (symbol, priceMinor) => ({
    symbol,
    name: symbol,
    priceMinor,
    prevCloseMinor: null,
    asOf: "2026-10-30T08:50:00.000Z",
    stale: false,
  });
  const row = (symbol, priceMinor) => ({
    symbol,
    name: symbol,
    priceMinor,
    prevCloseMinor: null,
    updatedAt: "2026-10-30T08:50:00.000+00:00",
    source: BURKUT_SOURCE,
    stale: false,
  });

  const quotes = [
    quote("THYAO", 24830),
    quote("GARAN", 12000),
    quote("ASELS", 5000),
    quote("NEWCO", 100),
  ];
  const existing = new Map([
    ["THYAO", row("THYAO", 24800)],
    ["GARAN", row("GARAN", 11900)],
    ["ASELS", row("ASELS", 5000)],
  ]);

  it("gün içinde: portföydekiler ve tabloda olmayanlar yazılır, değişmeyen atlanır", () => {
    const { writes } = planWrites({
      quotes,
      existing,
      held: new Set(["THYAO", "ASELS"]),
      fullRefresh: false,
    });
    expect(writes.map((write) => [write.symbol, write.create])).toEqual([
      ["THYAO", false],
      ["NEWCO", true],
    ]);
  });

  it("tam yenilemede değişen her sembol yazılır", () => {
    const { writes } = planWrites({
      quotes,
      existing,
      held: new Set(),
      fullRefresh: true,
    });
    expect(writes.map((write) => write.symbol)).toEqual([
      "THYAO",
      "GARAN",
      "NEWCO",
    ]);
  });

  it("portföydeki ama sağlayıcıda olmayan sembolleri bildirir", () => {
    const { missingHeld } = planWrites({
      quotes,
      existing,
      held: new Set(["THYAO", "KAPALI"]),
      fullRefresh: false,
    });
    expect(missingHeld).toEqual(["KAPALI"]);
  });

  it("eski veri işareti yalnızca tabloda olan ve henüz işaretli olmayanlara konur", () => {
    const withStale = new Map(existing);
    withStale.set("GARAN", { ...row("GARAN", 11900), stale: true });
    expect(
      planStaleMarks({
        existing: withStale,
        symbols: new Set(["THYAO", "GARAN", "YOK"]),
      }),
    ).toEqual(["THYAO"]);
  });
});
