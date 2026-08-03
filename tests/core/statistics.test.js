import { describe, expect, it } from "vitest";
import {
  activeDayKeys,
  buildActivityHeatmap,
  computeStepTotals,
  computeStreak,
  countCompletedSessions,
  topMistakeSpots,
  totalAyahsMemorized,
} from "../../src/core/statistics.js";

function session(dayKey, status, fromAyah = 1, toAyah = 5) {
  return {
    id: `${dayKey}-${status}-${fromAyah}`,
    portion: { surah: 2, fromAyah, toAyah },
    dayKey,
    status,
    steps: {
      listeningBefore: { count: 1, completedAt: 1 },
      tafsir: { count: 2, completedAt: 1 },
      listeningAfter: { count: 1, completedAt: 1 },
      memorization: { targetReps: 10, doneReps: 10, completedAt: 1 },
      review: { count: 1, completedAt: 1 },
      recitation: { completedAt: status === "completed" ? 1 : null, listenerName: "", notes: "" },
    },
  };
}

function reviewItem(lastReviewedDayKey) {
  return {
    id: `r-${lastReviewedDayKey}-${Math.random()}`,
    portion: { surah: 1, fromAyah: 1, toAyah: 1 },
    sourceSessionId: "s1",
    intervalIndex: 1,
    dueDayKey: "2026-09-01",
    lastReviewedDayKey,
    reviewCount: 1,
    lapseCount: 0,
    tier: "sabqi",
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

describe("activeDayKeys", () => {
  it("يحتسب أيام السبق المكتمل وأيام المراجعة معًا بلا تكرار", () => {
    const sessions = [session("2026-08-01", "completed")];
    const reviewQueue = [reviewItem("2026-08-02"), reviewItem("2026-08-02"), reviewItem(null)];
    const days = activeDayKeys(sessions, reviewQueue).sort();
    expect(days).toEqual(["2026-08-01", "2026-08-02"]);
  });
});

describe("computeStreak", () => {
  it("يعيد صفرًا بلا نشاط", () => {
    expect(computeStreak([], [], "2026-08-03")).toEqual({ current: 0, longest: 0 });
  });

  it("يحسب التتابع الحالي والأطول عبر أيام متتالية", () => {
    const sessions = [
      session("2026-08-01", "completed"),
      session("2026-08-02", "completed"),
      session("2026-08-03", "completed"),
    ];
    expect(computeStreak(sessions, [], "2026-08-03")).toEqual({ current: 3, longest: 3 });
  });

  it("يبقي التتابع حيًا إن كان آخر نشاط أمس", () => {
    const sessions = [session("2026-08-01", "completed"), session("2026-08-02", "completed")];
    expect(computeStreak(sessions, [], "2026-08-03")).toEqual({ current: 2, longest: 2 });
  });

  it("يصفّر التتابع الحالي عند انقطاع يزيد عن يوم مع حفظ الأطول", () => {
    const sessions = [
      session("2026-07-01", "completed"),
      session("2026-07-02", "completed"),
      session("2026-07-03", "completed"),
      session("2026-08-01", "completed"),
    ];
    expect(computeStreak(sessions, [], "2026-08-05")).toEqual({ current: 0, longest: 3 });
  });

  it("يتجاهل جلسات اليوم نفسه المكررة عند حساب الأيام النشطة", () => {
    const sessions = [
      session("2026-08-01", "completed", 1, 3),
      { ...session("2026-08-01", "completed", 4, 6), id: "dup" },
    ];
    expect(computeStreak(sessions, [], "2026-08-01")).toEqual({ current: 1, longest: 1 });
  });

  it("يوم مراجعة وحده بلا سبق جديد يُحتسب ويكمل التتابع (القسم 20.2)", () => {
    const sessions = [session("2026-08-01", "completed")];
    const reviewQueue = [reviewItem("2026-08-02")];
    expect(computeStreak(sessions, reviewQueue, "2026-08-02")).toEqual({ current: 2, longest: 2 });
  });

  it("سلسلة مراجعات متتالية بلا أي سبق تُكوّن تتابعًا كاملًا", () => {
    const reviewQueue = [reviewItem("2026-08-01"), reviewItem("2026-08-02"), reviewItem("2026-08-03")];
    expect(computeStreak([], reviewQueue, "2026-08-03")).toEqual({ current: 3, longest: 3 });
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

describe("computeStepTotals", () => {
  it("يجمع كل الخطوات عبر جميع الجلسات بما فيها المهجورة", () => {
    const sessions = [session("2026-08-01", "completed"), session("2026-08-02", "abandoned")];
    expect(computeStepTotals(sessions)).toEqual({
      listeningBefore: 2,
      tafsir: 4,
      listeningAfter: 2,
      memorizationReps: 20,
      review: 2,
      recitation: 1, // الجلسة المهجورة recitation.completedAt = null فلا تُحتسب
    });
  });

  it("يعيد أصفارًا بلا جلسات", () => {
    expect(computeStepTotals([])).toEqual({
      listeningBefore: 0,
      tafsir: 0,
      listeningAfter: 0,
      memorizationReps: 0,
      review: 0,
      recitation: 0,
    });
  });
});

describe("buildActivityHeatmap", () => {
  it("يبني نافذة متحرّكة بالطول المطلوب تنتهي باليوم الحالي", () => {
    const heatmap = buildActivityHeatmap([], [], "2026-08-03", 5);
    expect(heatmap.map((d) => d.dayKey)).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
    expect(heatmap.every((d) => d.count === 0)).toBe(true);
  });

  it("يجمع أحداث السبق والمراجعة لنفس اليوم في عدّاد واحد", () => {
    const sessions = [session("2026-08-02", "completed")];
    const reviewQueue = [reviewItem("2026-08-02"), reviewItem("2026-08-03")];
    const heatmap = buildActivityHeatmap(sessions, reviewQueue, "2026-08-03", 3);
    const byDay = Object.fromEntries(heatmap.map((d) => [d.dayKey, d.count]));
    expect(byDay).toEqual({ "2026-08-01": 0, "2026-08-02": 2, "2026-08-03": 1 });
  });
});
