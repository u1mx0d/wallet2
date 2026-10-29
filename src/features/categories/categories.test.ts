import { describe, expect, it } from "vitest";

import { removeCategory, sortCategories, upsertCategory } from "./cache";
import {
    categoryInputSchema,
    parseCategoryRow,
    type Category,
} from "./schemas";

const category = (
  id: string,
  name: string,
  type: Category["type"] = "expense",
): Category => ({
  id,
  name,
  type,
  icon: "dots",
  color: "#64748B",
});

describe("parseCategoryRow", () => {
  it("geçerli satırı dönüştürür ve bilinmeyen alanları atar", () => {
    const row = {
      $id: "abc",
      $permissions: ['read("user:1")'],
      userId: "1",
      name: "Market",
      type: "expense",
      icon: "cart",
      color: "#16A34A",
    };
    expect(parseCategoryRow(row)).toEqual({
      id: "abc",
      name: "Market",
      type: "expense",
      icon: "cart",
      color: "#16A34A",
    });
  });

  it("geçersiz türde null döner", () => {
    expect(
      parseCategoryRow({
        $id: "abc",
        name: "X",
        type: "transfer",
        icon: "dots",
        color: "#000000",
      }),
    ).toBeNull();
  });

  it("eksik alanda null döner", () => {
    expect(parseCategoryRow({ $id: "abc", type: "expense" })).toBeNull();
  });
});

describe("categoryInputSchema", () => {
  it("adı kırpar", () => {
    const result = categoryInputSchema.parse({
      name: "  Kahve  ",
      type: "expense",
      icon: "coffee",
      color: "#7C3AED",
    });
    expect(result.name).toBe("Kahve");
  });

  it.each([
    [{ name: "", type: "expense", icon: "coffee", color: "#7C3AED" }],
    [
      {
        name: "x".repeat(51),
        type: "expense",
        icon: "coffee",
        color: "#7C3AED",
      },
    ],
    [
      {
        name: "Kahve",
        type: "expense",
        icon: "olmayan-ikon",
        color: "#7C3AED",
      },
    ],
    [{ name: "Kahve", type: "expense", icon: "coffee", color: "mor" }],
  ])("geçersiz girişi reddeder: %j", (input) => {
    expect(categoryInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("sortCategories", () => {
  it("önce giderleri, sonra gelirleri Türkçe alfabetik sıralar", () => {
    const sorted = sortCategories([
      category("1", "Ulaşım"),
      category("2", "Maaş", "income"),
      category("3", "Çiçek"),
      category("4", "Market"),
      category("5", "Ek gelir", "income"),
    ]);
    expect(sorted.map((item) => item.name)).toEqual([
      "Çiçek",
      "Market",
      "Ulaşım",
      "Ek gelir",
      "Maaş",
    ]);
  });

  it("girdi dizisini değiştirmez", () => {
    const input = [category("1", "B"), category("2", "A")];
    sortCategories(input);
    expect(input.map((item) => item.name)).toEqual(["B", "A"]);
  });
});

describe("upsertCategory / removeCategory", () => {
  it("yeni kategoriyi doğru sıraya ekler", () => {
    const list = [category("1", "Çiçek"), category("2", "Ulaşım")];
    expect(
      upsertCategory(list, category("3", "Market")).map((item) => item.id),
    ).toEqual(["1", "3", "2"]);
  });

  it("aynı ID'li kategoriyi çoğaltmadan günceller", () => {
    const list = [category("1", "Market"), category("2", "Ulaşım")];
    const result = upsertCategory(list, category("1", "Süpermarket"));
    expect(result).toHaveLength(2);
    expect(result.map((item) => item.name)).toEqual(["Süpermarket", "Ulaşım"]);
  });

  it("ID ile kaldırır", () => {
    const list = [category("1", "Market"), category("2", "Ulaşım")];
    expect(removeCategory(list, "1").map((item) => item.id)).toEqual(["2"]);
  });
});
