import { describe, expect, it } from "vitest";
import { computeStreak, countCompletedSessions, topMistakeSpots, totalAyahsMemorized } from "../../src/core/statistics.js";

function session(dayKey, status, fromAyah = 1, toAyah = 5) {
  return {
    id: `${dayKey}-${status}-${fromAyah}`,
    portion: { surah: 2, fromAyah, toAyah },
    dayKey,
    status,
  };
}

describe("countCompletedSessions / totalAyahsMemorized", () => {
  it("يعدّ الجلسات المكتملة فقط ويجمع آياتها", () => {
    const sessions = [
      session("2026-08-01", "completed", 1, 5), // 5 آيات
      session("2026-08-02", "abandoned", 1, 100),
      session("2026-08-03", "completed", 6, 10), // 5 آيات
    ];
    expect(countCompletedSessions(sessions)).toBe(2);
    expect(totalAyahsMemorized(sessions)).toBe(10);
  });
});

describe("computeStreak", () => {
  it("يعيد صفرًا بلا جلسات", () => {
    expect(computeStreak([], "2026-08-03")).toEqual({ current: 0, longest: 0 });
  });

  it("يحسب التتابع الحالي والأطول عبر أيام متتالية", () => {
    const sessions = [
      session("2026-08-01", "completed"),
      session("2026-08-02", "completed"),
      session("2026-08-03", "completed"),
    ];
    expect(computeStreak(sessions, "2026-08-03")).toEqual({ current: 3, longest: 3 });
  });

  it("يبقي التتابع حيًا إن كان آخر نشاط أمس", () => {
    const sessions = [session("2026-08-01", "completed"), session("2026-08-02", "completed")];
    expect(computeStreak(sessions, "2026-08-03")).toEqual({ current: 2, longest: 2 });
  });

  it("يصفّر التتابع الحالي عند انقطاع يزيد عن يوم مع حفظ الأطول", () => {
    const sessions = [
      session("2026-07-01", "completed"),
      session("2026-07-02", "completed"),
      session("2026-07-03", "completed"),
      session("2026-08-01", "completed"),
    ];
    expect(computeStreak(sessions, "2026-08-05")).toEqual({ current: 0, longest: 3 });
  });

  it("يتجاهل جلسات اليوم نفسه المكررة عند حساب الأيام النشطة", () => {
    const sessions = [
      session("2026-08-01", "completed", 1, 3),
      { ...session("2026-08-01", "completed", 4, 6), id: "dup" },
    ];
    expect(computeStreak(sessions, "2026-08-01")).toEqual({ current: 1, longest: 1 });
  });
});

describe("topMistakeSpots", () => {
  it("يرتّب المواضع الأكثر تكرارًا تنازليًا ويطبّق الحد", () => {
    const mistakes = [
      { surah: 2, ayah: 10 },
      { surah: 2, ayah: 10 },
      { surah: 2, ayah: 10 },
      { surah: 2, ayah: 20 },
      { surah: 2, ayah: 20 },
      { surah: 3, ayah: 1 },
    ];
    const top = topMistakeSpots(mistakes, 2);
    expect(top).toEqual([
      { surah: 2, ayah: 10, count: 3 },
      { surah: 2, ayah: 20, count: 2 },
    ]);
  });

  it("يعيد مصفوفة فارغة بلا أخطاء", () => {
    expect(topMistakeSpots([])).toEqual([]);
  });
});
