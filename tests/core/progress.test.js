import { describe, expect, it } from "vitest";
import { TOTAL_AYAHS, computeProgressPercentage, estimateCompletionDayKey } from "../../src/core/progress.js";

function session(dayKey, fromAyah, toAyah) {
  return { portion: { surah: 2, fromAyah, toAyah }, dayKey, status: "completed" };
}

describe("computeProgressPercentage", () => {
  it("يحسب النسبة من إجمالي آيات القرآن", () => {
    expect(computeProgressPercentage(0)).toBe(0);
    expect(computeProgressPercentage(TOTAL_AYAHS)).toBe(100);
    expect(computeProgressPercentage(TOTAL_AYAHS / 2)).toBeCloseTo(50, 5);
  });

  it("لا يتجاوز 100 حتى مع مدخل أكبر من الإجمالي", () => {
    expect(computeProgressPercentage(TOTAL_AYAHS * 2)).toBe(100);
  });
});

describe("estimateCompletionDayKey", () => {
  it("يعيد null بلا نشاط ضمن نافذة القياس", () => {
    expect(estimateCompletionDayKey([], "2026-08-03")).toBeNull();
  });

  it("يقدّر تاريخًا مستقبليًا بناءً على المعدل الفعلي", () => {
    // 10 آيات يوميًا لآخر 30 يومًا (300 آية)، الباقي = TOTAL_AYAHS - 300
    const sessions = [session("2026-07-05", 1, 10)];
    const result = estimateCompletionDayKey(sessions, "2026-08-03", 30);
    expect(result).not.toBeNull();
    expect(result >= "2026-08-03").toBe(true);
  });

  it("يعيد اليوم نفسه إن اكتمل الحفظ بالفعل", () => {
    const sessions = [session("2026-08-01", 1, TOTAL_AYAHS)];
    expect(estimateCompletionDayKey(sessions, "2026-08-03", 30)).toBe("2026-08-03");
  });
});
