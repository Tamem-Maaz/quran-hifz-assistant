import { describe, expect, it } from "vitest";
import { addDays, compareDayKeys, diffInDays, isNextDay, toDayKey, dayKeyToDate } from "../../src/core/dates.js";

describe("toDayKey", () => {
  it("يبني YYYY-MM-DD من التقويم المحلي مع حشو الأصفار", () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDayKey(new Date(2026, 7, 3))).toBe("2026-08-03");
  });
});

describe("dayKeyToDate / addDays", () => {
  it("يحوّل ذهابًا وإيابًا دون فقدان اليوم", () => {
    expect(toDayKey(dayKeyToDate("2026-08-03"))).toBe("2026-08-03");
  });

  it("يضيف أيامًا موجبة وسالبة بشكل صحيح", () => {
    expect(addDays("2026-08-03", 1)).toBe("2026-08-04");
    expect(addDays("2026-08-03", -1)).toBe("2026-08-02");
    expect(addDays("2026-08-03", 0)).toBe("2026-08-03");
  });

  it("يتجاوز نهاية الشهر والسنة بشكل صحيح", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("يتعامل مع السنة الكبيسة", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
});

describe("diffInDays / isNextDay", () => {
  it("يحسب الفرق بالأيام في الاتجاهين", () => {
    expect(diffInDays("2026-08-01", "2026-08-05")).toBe(4);
    expect(diffInDays("2026-08-05", "2026-08-01")).toBe(-4);
    expect(diffInDays("2026-08-01", "2026-08-01")).toBe(0);
  });

  it("يتحقق من التتالي المباشر بين يومين", () => {
    expect(isNextDay("2026-08-01", "2026-08-02")).toBe(true);
    expect(isNextDay("2026-08-01", "2026-08-03")).toBe(false);
    expect(isNextDay("2026-08-02", "2026-08-01")).toBe(false);
  });
});

describe("compareDayKeys", () => {
  it("يقارن سلاسل ISO مباشرة", () => {
    expect(compareDayKeys("2026-08-01", "2026-08-02")).toBe(-1);
    expect(compareDayKeys("2026-08-02", "2026-08-01")).toBe(1);
    expect(compareDayKeys("2026-08-01", "2026-08-01")).toBe(0);
  });
});
