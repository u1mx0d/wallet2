import { describe, expect, it } from "vitest";

import { transactionFormSchema } from "./schemas";

const valid = {
  type: "expense",
  amount: "1.234,56",
  categoryId: "c1",
  note: "  Haftalık alışveriş  ",
  date: "2026-10-29T12:00:00.000Z",
};

function errorFor(
  input: Record<string, string>,
  field: string,
): string | undefined {
  const result = transactionFormSchema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("transactionFormSchema", () => {
  it("metin alanlarını TransactionInput'a çevirir", () => {
    expect(transactionFormSchema.parse(valid)).toEqual({
      type: "expense",
      amountMinor: 123456,
      categoryId: "c1",
      note: "Haftalık alışveriş",
      date: "2026-10-29T12:00:00.000Z",
    });
  });

  it("boş notu null yapar", () => {
    expect(transactionFormSchema.parse({ ...valid, note: "" }).note).toBeNull();
  });

  it.each<[string, string]>([
    ["", "Tutarı yaz."],
    ["abc", "Geçerli bir tutar yaz (ör. 1.234,56)."],
    ["0", "Tutar en az ₺0,01 olmalı."],
    ["0,00", "Tutar en az ₺0,01 olmalı."],
    ["1,234", "Kuruş kısmı en fazla 2 haneli olabilir."],
    ["-5", "Tutar negatif olamaz."],
  ])("tutar %j → %s", (amount, message) => {
    expect(errorFor({ ...valid, amount }, "amount")).toBe(message);
  });

  it("kategori seçilmediyse hata verir", () => {
    expect(errorFor({ ...valid, categoryId: "" }, "categoryId")).toBe(
      "Kategori seç.",
    );
  });

  it("çok uzun notu reddeder", () => {
    expect(errorFor({ ...valid, note: "x".repeat(501) }, "note")).toBe(
      "Not en fazla 500 karakter olabilir.",
    );
  });
});
