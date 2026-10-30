import { describe, expect, it } from "vitest";

import { isQuoteOutdated } from "./staleness";

// 30 Ekim 2026 cuma, 31 Ekim cumartesi.
const at = (iso: string) => new Date(iso);

describe("isQuoteOutdated", () => {
  it("seans içinde 90 dakikadan eski fiyatı eski sayar", () => {
    expect(
      isQuoteOutdated("2026-10-30T09:30:00Z", at("2026-10-30T12:00:00Z")),
    ).toBe(true);
  });

  it("seans içinde 90 dakikadan yeni fiyatı eski saymaz", () => {
    expect(
      isQuoteOutdated("2026-10-30T11:00:00Z", at("2026-10-30T12:00:00Z")),
    ).toBe(false);
  });

  it("açılıştan sonraki ilk 90 dakikada önceki günün fiyatı normaldir", () => {
    expect(
      isQuoteOutdated("2026-10-29T16:30:00Z", at("2026-10-30T08:00:00Z")),
    ).toBe(false);
  });

  it("açılıştan 90 dakika sonra önceki günün fiyatı eskidir", () => {
    expect(
      isQuoteOutdated("2026-10-29T16:30:00Z", at("2026-10-30T09:00:00Z")),
    ).toBe(true);
  });

  it("kapanıştan bir saat sonra kontrol durur", () => {
    expect(
      isQuoteOutdated("2026-10-30T09:00:00Z", at("2026-10-30T16:30:00Z")),
    ).toBe(false);
  });

  it("hafta sonu kontrol yapılmaz", () => {
    expect(
      isQuoteOutdated("2026-10-30T16:30:00Z", at("2026-10-31T12:00:00Z")),
    ).toBe(false);
  });

  it("geçersiz zamanı eski sayar", () => {
    expect(isQuoteOutdated("dün", at("2026-10-30T12:00:00Z"))).toBe(true);
  });
});
