import { describe, expect, it } from "vitest";
import {
  abandonSession,
  completeRecitation,
  completeSession,
  createSession,
  decrementMemorizationRep,
  decrementStep,
  findInProgressSessionForDay,
  incrementMemorizationRep,
  incrementStep,
  isRecitationDone,
  isValidPortion,
  recordMistake,
} from "../../src/core/session.js";

const surahs = [
  { id: 1, ayahCount: 7 },
  { id: 2, ayahCount: 286 },
];

function baseSession() {
  return createSession({
    id: "s1",
    portion: { surah: 2, fromAyah: 12, toAyah: 15 },
    dayKey: "2026-08-03",
    now: 1000,
    defaultReps: 10,
  });
}

describe("isValidPortion", () => {
  it("يقبل مقطعًا صالحًا داخل حدود السورة", () => {
    expect(isValidPortion(2, 12, 15, surahs)).toBe(true);
  });

  it("يرفض سورة غير موجودة", () => {
    expect(isValidPortion(999, 1, 2, surahs)).toBe(false);
  });

  it("يرفض toAyah أصغر من fromAyah", () => {
    expect(isValidPortion(2, 15, 12, surahs)).toBe(false);
  });

  it("يرفض تجاوز عدد آيات السورة", () => {
    expect(isValidPortion(1, 1, 8, surahs)).toBe(false);
  });

  it("يرفض fromAyah أصغر من 1", () => {
    expect(isValidPortion(1, 0, 3, surahs)).toBe(false);
  });
});

describe("createSession", () => {
  it("ينشئ جلسة in_progress بكل المراحل صفرية", () => {
    const session = baseSession();
    expect(session.status).toBe("in_progress");
    expect(session.completedAt).toBeNull();
    expect(session.steps.memorization.targetReps).toBe(10);
    expect(session.steps.memorization.doneReps).toBe(0);
    expect(session.steps.recitation.completedAt).toBeNull();
  });
});

describe("incrementStep / decrementStep", () => {
  it("يزيد العدّاد ويثبّت completedAt عند أول زيادة", () => {
    const session = incrementStep(baseSession(), "listeningBefore", 2000);
    expect(session.steps.listeningBefore.count).toBe(1);
    expect(session.steps.listeningBefore.completedAt).toBe(2000);
  });

  it("لا يغيّر completedAt عند زيادات لاحقة", () => {
    let session = incrementStep(baseSession(), "tafsir", 2000);
    session = incrementStep(session, "tafsir", 3000);
    expect(session.steps.tafsir.count).toBe(2);
    expect(session.steps.tafsir.completedAt).toBe(2000);
  });

  it("لا ينزل العدّاد تحت الصفر", () => {
    const session = decrementStep(baseSession(), "review");
    expect(session.steps.review.count).toBe(0);
  });

  it("لا يعدّل الجلسة الأصلية (immutability)", () => {
    const original = baseSession();
    incrementStep(original, "listeningBefore", 2000);
    expect(original.steps.listeningBefore.count).toBe(0);
  });
});

describe("memorization reps", () => {
  it("يزيد doneReps دون قفل عند بلوغ الهدف", () => {
    let session = baseSession();
    for (let i = 0; i < 12; i++) {
      session = incrementMemorizationRep(session, 1000 + i);
    }
    expect(session.steps.memorization.doneReps).toBe(12);
    expect(session.steps.memorization.completedAt).toBe(1009); // أول لحظة بلوغ الهدف (10)
  });

  it("لا ينزل doneReps تحت الصفر", () => {
    const session = decrementMemorizationRep(baseSession());
    expect(session.steps.memorization.doneReps).toBe(0);
  });
});

describe("recitation & completion", () => {
  it("يسجّل بيانات التسميع ويعلّم الإنجاز", () => {
    const session = completeRecitation(baseSession(), 5000, "أحمد", "ملاحظة");
    expect(isRecitationDone(session)).toBe(true);
    expect(session.steps.recitation.listenerName).toBe("أحمد");
  });

  it("completeSession يضبط الحالة والطابع الزمني", () => {
    const session = completeSession(baseSession(), 6000);
    expect(session.status).toBe("completed");
    expect(session.completedAt).toBe(6000);
  });

  it("abandonSession يعلّم الجلسة كمهجورة دون طابع إكمال", () => {
    const session = abandonSession(baseSession());
    expect(session.status).toBe("abandoned");
    expect(session.completedAt).toBeNull();
  });
});

describe("recordMistake", () => {
  it("يبني MistakeEntry من موضع الخطأ", () => {
    const session = baseSession();
    const mistake = recordMistake(session, 2, 14, 7000, "التبس بآية مشابهة", "m1");
    expect(mistake).toEqual({
      id: "m1",
      surah: 2,
      ayah: 14,
      occurredAt: 7000,
      note: "التبس بآية مشابهة",
    });
  });
});

describe("findInProgressSessionForDay", () => {
  it("يجد الجلسة المفتوحة لليوم المحدد", () => {
    const inProgress = baseSession();
    const completed = completeSession(createSession({
      id: "s2",
      portion: { surah: 1, fromAyah: 1, toAyah: 7 },
      dayKey: "2026-08-03",
      now: 1,
      defaultReps: 5,
    }), 2);
    const found = findInProgressSessionForDay([completed, inProgress], "2026-08-03");
    expect(found?.id).toBe("s1");
  });

  it("يعيد null إن لم توجد جلسة مفتوحة لليوم", () => {
    expect(findInProgressSessionForDay([], "2026-08-03")).toBeNull();
  });
});
