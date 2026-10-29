import { describe, expect, it } from "vitest";

import {
    addLocalDays,
    combineDayWithTime,
    formatDayLabel,
    formatFullDate,
    isSameLocalDay,
} from "./dates";

describe("formatDayLabel", () => {
  const now = new Date(2026, 9, 29, 20, 0);

  it.each<[Date, string]>([
    [new Date(2026, 9, 29, 0, 1), "Bugün"],
    [new Date(2026, 9, 29, 23, 59), "Bugün"],
    [new Date(2026, 9, 28, 23, 59), "Dün"],
    [new Date(2026, 9, 28, 0, 0), "Dün"],
    [new Date(2026, 9, 27, 12, 0), "27 Ekim"],
    [new Date(2026, 0, 5, 12, 0), "5 Ocak"],
    [new Date(2025, 11, 31, 12, 0), "31 Aralık 2025"],
  ])("%s → %s", (date, expected) => {
    expect(formatDayLabel(date, now)).toBe(expected);
  });

  it("ay ve yıl geçişinde 'Dün' doğru hesaplanır", () => {
    expect(
      formatDayLabel(new Date(2026, 9, 31, 22, 0), new Date(2026, 10, 1, 8, 0)),
    ).toBe("Dün");
    expect(
      formatDayLabel(new Date(2025, 11, 31, 22, 0), new Date(2026, 0, 1, 8, 0)),
    ).toBe("Dün");
  });
});

describe("formatFullDate", () => {
  it("Türkçe ay adıyla yazar", () => {
    expect(formatFullDate(new Date(2026, 1, 3))).toBe("3 Şubat 2026");
  });
});

describe("isSameLocalDay / addLocalDays", () => {
  it("aynı günün farklı saatlerini aynı gün sayar", () => {
    expect(
      isSameLocalDay(
        new Date(2026, 9, 29, 0, 0),
        new Date(2026, 9, 29, 23, 59),
      ),
    ).toBe(true);
    expect(isSameLocalDay(new Date(2026, 9, 29), new Date(2026, 9, 30))).toBe(
      false,
    );
  });

  it("ay sonunu geçer", () => {
    expect(addLocalDays(new Date(2026, 9, 31), 1)).toEqual(
      new Date(2026, 10, 1),
    );
  });
});

describe("combineDayWithTime", () => {
  const now = new Date(2026, 9, 29, 15, 30);

  it("bugün seçilince şimdiki saati kullanır", () => {
    expect(combineDayWithTime(new Date(2026, 9, 29), now)).toEqual(now);
  });

  it("geçmiş gün seçilince 12:00 kullanır", () => {
    expect(combineDayWithTime(new Date(2026, 9, 20, 3, 0), now)).toEqual(
      new Date(2026, 9, 20, 12, 0),
    );
  });

  it("düzenlemede gün değişmediyse orijinal saati korur", () => {
    const previous = new Date(2026, 9, 20, 8, 45);
    expect(combineDayWithTime(new Date(2026, 9, 20), now, previous)).toEqual(
      previous,
    );
  });

  it("düzenlemede gün değiştiyse orijinal saati kullanmaz", () => {
    const previous = new Date(2026, 9, 20, 8, 45);
    expect(combineDayWithTime(new Date(2026, 9, 21), now, previous)).toEqual(
      new Date(2026, 9, 21, 12, 0),
    );
  });
});
