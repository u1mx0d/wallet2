import { describe, expect, it } from "vitest";

import { computeAxis, niceStep } from "./chartAxis";

describe("niceStep", () => {
  it.each<[number, number]>([
    [0, 100],
    [-5, 100],
    [1, 1],
    [3, 5],
    [750, 1000],
    [375, 500],
    [220, 250],
    [12_000, 20_000],
  ])("%d → %d", (raw, expected) => {
    expect(niceStep(raw)).toBe(expected);
  });
});

describe("computeAxis", () => {
  it("tüm değerler sıfırsa ₺1'lik tek bölüm", () => {
    expect(computeAxis([0, 0])).toEqual({
      stepValue: 100,
      noOfSections: 1,
      maxValue: 100,
      noOfSectionsBelowXAxis: 0,
      mostNegativeValue: 0,
    });
  });

  it("yalnızca pozitif değerler", () => {
    expect(computeAxis([1000, 3000])).toEqual({
      stepValue: 1000,
      noOfSections: 3,
      maxValue: 3000,
      noOfSectionsBelowXAxis: 0,
      mostNegativeValue: 0,
    });
  });

  it("negatif değerlerde iki taraf aynı adımı kullanır", () => {
    expect(computeAxis([-500, 1500])).toEqual({
      stepValue: 500,
      noOfSections: 3,
      maxValue: 1500,
      noOfSectionsBelowXAxis: 1,
      mostNegativeValue: -500,
    });
  });

  it("yalnızca negatif değerlerde üstte yine en az bir bölüm olur", () => {
    const axis = computeAxis([-2000, -100]);
    expect(axis.noOfSections).toBe(1);
    expect(axis.mostNegativeValue).toBeLessThanOrEqual(-2000);
    expect(axis.mostNegativeValue % axis.stepValue).toBe(0);
  });

  it("maksimum değer her zaman en büyük değeri kapsar", () => {
    for (const max of [1, 99, 101, 12_345, 999_999, 123_456_789]) {
      const axis = computeAxis([0, max]);
      expect(axis.maxValue).toBeGreaterThanOrEqual(max);
      expect(axis.maxValue % axis.stepValue).toBe(0);
    }
  });
});
