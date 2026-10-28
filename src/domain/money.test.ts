import { describe, expect, it } from "vitest";

import {
    formatMinorForInput,
    formatTry,
    MAX_AMOUNT_MINOR,
    MINUS_SIGN,
    parseTryInput,
    sumMinor,
    type MoneyParseError,
} from "./money";

describe("parseTryInput: geçerli girişler", () => {
  it.each<[string, number]>([
    ["0", 0],
    ["1", 100],
    ["007", 700],
    ["1234", 123400],
    ["+5", 500],
    // Türkçe biçim: virgül ondalık, nokta binlik
    ["1.234,56", 123456],
    ["1234,56", 123456],
    ["1234,5", 123450],
    ["12.345,6", 1234560],
    ["0,5", 50],
    ["0,01", 1],
    [",5", 50],
    ["12,", 1200],
    // Virgül yok, noktadan sonra tam 3 hane → binlik
    ["1.234", 123400],
    ["12.345", 1234500],
    ["1.234.567", 123456700],
    // Virgül yok, tek nokta ve 1-2 hane → ondalık (bazı Android klavyeleri)
    ["12.5", 1250],
    ["12.50", 1250],
    ["1234.56", 123456],
    ["12.", 1200],
    // Sembol ve boşluklar
    ["₺1.234,56", 123456],
    ["1.234,56 TL", 123456],
    ["1.234,56tl", 123456],
    ["TL 50", 5000],
    [" 1 234,56 ", 123456],
    ["1\u00A0234,56", 123456],
    // Üst sınır
    ["9.999.999.999,99", MAX_AMOUNT_MINOR],
  ])("%j → %d kuruş", (input, expected) => {
    expect(parseTryInput(input)).toEqual({ ok: true, value: expected });
  });
});

describe("parseTryInput: geçersiz girişler", () => {
  it.each<[string, MoneyParseError]>([
    ["", "empty"],
    ["   ", "empty"],
    ["₺", "empty"],
    ["-5", "negative"],
    [`${MINUS_SIGN}5`, "negative"],
    ["abc", "invalid"],
    ["12a", "invalid"],
    ["1e5", "invalid"],
    [",", "invalid"],
    [".", "invalid"],
    ["1,2,3", "invalid"],
    ["1.23.4", "invalid"],
    ["12.34.56", "invalid"],
    ["1.23,45", "invalid"],
    ["1,23.4", "invalid"],
    // 3+ kuruş hanesi
    ["1,234", "too_many_decimals"],
    ["12,345", "too_many_decimals"],
    ["1.234,567", "too_many_decimals"],
    ["1.2345", "too_many_decimals"],
    ["1234.567", "too_many_decimals"],
    // Boşluklar önce silinir: "…,99 1" → "…,991" (3 kuruş hanesi)
    ["9.999.999.999,99 1", "too_many_decimals"],
    // Üst sınır aşımı: MAX_AMOUNT_MINOR + 1 kuruş = 10.000.000.000,00 TL
    ["10.000.000.000", "too_large"],
    ["10.000.000.000,00", "too_large"],
    ["99999999999999999999", "too_large"],
  ])("%j → %s", (input, expectedError) => {
    expect(parseTryInput(input)).toEqual({ ok: false, error: expectedError });
  });
});

describe("formatTry", () => {
  it.each<[number, string]>([
    [0, "₺0,00"],
    [1, "₺0,01"],
    [10, "₺0,10"],
    [100, "₺1,00"],
    [123456, "₺1.234,56"],
    [100000000, "₺1.000.000,00"],
    [MAX_AMOUNT_MINOR, "₺9.999.999.999,99"],
    [-1, `${MINUS_SIGN}₺0,01`],
    [-123456, `${MINUS_SIGN}₺1.234,56`],
  ])("%d → %s", (minor, expected) => {
    expect(formatTry(minor)).toBe(expected);
  });

  it("-0 işaretsiz sıfır olarak gösterilir", () => {
    expect(formatTry(-0)).toBe("₺0,00");
  });

  it('sign: "always" pozitiflerde + ekler, sıfırda eklemez', () => {
    expect(formatTry(123456, { sign: "always" })).toBe("+₺1.234,56");
    expect(formatTry(0, { sign: "always" })).toBe("₺0,00");
    expect(formatTry(-123456, { sign: "always" })).toBe(
      `${MINUS_SIGN}₺1.234,56`,
    );
  });

  it.each([
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("tam sayı olmayan veya güvensiz değeri (%d) reddeder", (value) => {
    expect(() => formatTry(value)).toThrow(RangeError);
  });
});

describe("formatMinorForInput", () => {
  it.each<[number, string]>([
    [0, "0"],
    [50, "0,50"],
    [100, "1"],
    [100000, "1.000"],
    [123456, "1.234,56"],
    [123450, "1.234,50"],
  ])("%d → %j", (minor, expected) => {
    expect(formatMinorForInput(minor)).toBe(expected);
  });

  it("negatif değeri reddeder", () => {
    expect(() => formatMinorForInput(-1)).toThrow(RangeError);
  });
});

describe("gidiş-dönüş (round-trip)", () => {
  const samples = [
    0,
    1,
    9,
    10,
    99,
    100,
    101,
    999,
    1000,
    123456,
    100000,
    1000000,
    MAX_AMOUNT_MINOR,
  ];

  it.each(samples)(
    "parseTryInput(formatMinorForInput(%d)) aynı değeri verir",
    (minor) => {
      expect(parseTryInput(formatMinorForInput(minor))).toEqual({
        ok: true,
        value: minor,
      });
    },
  );

  it.each(samples)(
    "parseTryInput(formatTry(%d)) aynı değeri verir",
    (minor) => {
      expect(parseTryInput(formatTry(minor))).toEqual({
        ok: true,
        value: minor,
      });
    },
  );

  it("rastgele 5.000 değerde gidiş-dönüş bozulmaz", () => {
    // Deterministik sözde rastgele üreteç: test her çalıştırmada aynı değerleri dener.
    let seed = 42;
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed;
    };
    for (let i = 0; i < 5_000; i += 1) {
      const minor = (next() * 1_000 + next()) % (MAX_AMOUNT_MINOR + 1);
      expect(parseTryInput(formatMinorForInput(minor))).toEqual({
        ok: true,
        value: minor,
      });
      expect(parseTryInput(formatTry(minor))).toEqual({
        ok: true,
        value: minor,
      });
    }
  });
});

describe("sumMinor", () => {
  it("tam sayıları toplar", () => {
    expect(sumMinor([])).toBe(0);
    expect(sumMinor([1, 2, 3])).toBe(6);
    expect(sumMinor([123456, -23456])).toBe(100000);
  });

  it("float ile yapılsaydı hatalı olacak toplamı doğru verir", () => {
    // 0.1 + 0.2 float'ta 0.30000000000000004 olur; kuruşla 10 + 20 = 30.
    expect(sumMinor([10, 20])).toBe(30);
  });

  it("tam sayı olmayan değeri reddeder", () => {
    expect(() => sumMinor([100, 0.5])).toThrow(RangeError);
  });

  it("güvenli tam sayı sınırını aşan toplamı reddeder", () => {
    expect(() => sumMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow(RangeError);
  });
});
