import { describe, expect, it } from "vitest";
import { addDays } from "../../src/core/dates.js";
import {
  REVIEW_INTERVALS_DAYS,
  applyReviewOutcome,
  createReviewItem,
  getDueItems,
  needsReinforcement,
  redistributeBacklog,
  tierForIntervalIndex,
} from "../../src/core/scheduler.js";

const portion = { surah: 2, fromAyah: 1, toAyah: 5 };

describe("tierForIntervalIndex", () => {
  it("يصنّف أول 3 فواصل كسبقي", () => {
    expect(tierForIntervalIndex(0)).toBe("sabqi");
    expect(tierForIntervalIndex(2)).toBe("sabqi");
  });

  it("يصنّف الفواصل 3 و4 و5 كمنزل", () => {
    expect(tierForIntervalIndex(3)).toBe("manzil");
    expect(tierForIntervalIndex(5)).toBe("manzil");
  });

  it("يصنّف ما بعد آخر فاصل كمتخرّج", () => {
    expect(tierForIntervalIndex(6)).toBe("graduated");
  });
});

describe("createReviewItem", () => {
  it("يجدول أول استحقاق بعد يوم واحد", () => {
    const item = createReviewItem(
      { id: "r1", portion, sourceSessionId: "s1" },
      "2026-08-03"
    );
    expect(item.dueDayKey).toBe("2026-08-04");
    expect(item.intervalIndex).toBe(0);
    expect(item.tier).toBe("sabqi");
    expect(item.lapseCount).toBe(0);
  });
});

describe("applyReviewOutcome", () => {
  it("passed يقدّم الفاصل ويحسب الاستحقاق التالي", () => {
    const item = createReviewItem({ id: "r1", portion, sourceSessionId: "s1" }, "2026-08-03");
    const next = applyReviewOutcome(item, "passed", "2026-08-04");
    expect(next.intervalIndex).toBe(1);
    expect(next.dueDayKey).toBe("2026-08-07"); // +3 أيام
    expect(next.reviewCount).toBe(1);
    expect(next.lapseCount).toBe(0);
  });

  it("failed يعيد الفاصل إلى الصفر ويزيد lapseCount", () => {
    const item = createReviewItem({ id: "r1", portion, sourceSessionId: "s1" }, "2026-08-03");
    const advanced = applyReviewOutcome(item, "passed", "2026-08-04");
    const failed = applyReviewOutcome(advanced, "failed", "2026-08-07");
    expect(failed.intervalIndex).toBe(0);
    expect(failed.dueDayKey).toBe("2026-08-08");
    expect(failed.lapseCount).toBe(1);
  });

  it("يتخرّج العنصر بعد اجتياز آخر فاصل ويعيد جدولته كل 30 يومًا", () => {
    let item = createReviewItem({ id: "r1", portion, sourceSessionId: "s1" }, "2026-01-01");
    let today = "2026-01-02";
    for (let i = 0; i < REVIEW_INTERVALS_DAYS.length; i++) {
      item = applyReviewOutcome(item, "passed", today);
      today = item.dueDayKey;
    }
    expect(item.tier).toBe("graduated");
    const dueBefore = item.dueDayKey;
    const graduatedAgain = applyReviewOutcome(item, "passed", dueBefore);
    expect(graduatedAgain.tier).toBe("graduated");
    expect(graduatedAgain.dueDayKey).toBe(addDays(dueBefore, 30));
  });
});

describe("needsReinforcement", () => {
  it("يعلّم العنصر بعد 3 إخفاقات فأكثر", () => {
    const item = { lapseCount: 3 };
    expect(needsReinforcement(item)).toBe(true);
    expect(needsReinforcement({ lapseCount: 2 })).toBe(false);
  });
});

describe("getDueItems", () => {
  const queue = [
    { id: "a", dueDayKey: "2026-08-01", lapseCount: 0 },
    { id: "b", dueDayKey: "2026-08-02", lapseCount: 5 },
    { id: "c", dueDayKey: "2026-08-03", lapseCount: 0 },
    { id: "d", dueDayKey: "2026-08-10", lapseCount: 0 },
  ];

  it("يرجّح الأقدم استحقاقًا ثم الأعلى lapseCount ويطبّق الحد", () => {
    const { items, overflowCount } = getDueItems(queue, "2026-08-03", 2);
    expect(items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(overflowCount).toBe(1);
  });

  it("لا يضمّن عناصر مستحقة مستقبلًا", () => {
    const { items } = getDueItems(queue, "2026-08-03", 10);
    expect(items.some((i) => i.id === "d")).toBe(false);
  });
});

describe("redistributeBacklog", () => {
  it("يوزّع المتأخر فقط على الأيام القادمة ولا يمسّ غير المتأخر", () => {
    const queue = [
      { id: "a", dueDayKey: "2026-07-20" },
      { id: "b", dueDayKey: "2026-07-25" },
      { id: "c", dueDayKey: "2026-08-10" },
    ];
    const result = redistributeBacklog(queue, "2026-08-03", 7);
    const byId = Object.fromEntries(result.map((i) => [i.id, i.dueDayKey]));
    expect(byId.a).toBe("2026-08-03");
    expect(byId.b).toBe("2026-08-04");
    expect(byId.c).toBe("2026-08-10");
  });
});
