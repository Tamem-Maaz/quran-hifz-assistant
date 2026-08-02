import { describe, expect, it } from "vitest";
import surahs from "../../src/data/surahs.json" with { type: "json" };
import { ImportValidationError, MAX_IMPORT_BYTES, validateImportedState } from "../../src/storage/validation.js";
import { createInitialState } from "../../src/storage/migrations.js";
import { createSession, incrementStep } from "../../src/core/session.js";

function validState() {
  const state = createInitialState(1000);
  const session = incrementStep(
    createSession({
      id: "s1",
      portion: { surah: 2, fromAyah: 1, toAyah: 5 },
      dayKey: "2026-08-03",
      now: 1000,
      defaultReps: 10,
    }),
    "listeningBefore",
    1000
  );
  return {
    ...state,
    sessions: [session],
    reviewQueue: [
      {
        id: "r1",
        portion: { surah: 2, fromAyah: 1, toAyah: 5 },
        sourceSessionId: "s1",
        intervalIndex: 0,
        dueDayKey: "2026-08-04",
        lastReviewedDayKey: null,
        reviewCount: 0,
        lapseCount: 0,
        tier: "sabqi",
      },
    ],
    mistakes: [{ id: "m1", surah: 2, ayah: 3, occurredAt: 1000, note: "" }],
  };
}

describe("validateImportedState — المسار السليم", () => {
  it("يقبل حالة صالحة ويعيد بناءها حقلًا بحقل", () => {
    const state = validState();
    const result = validateImportedState(JSON.stringify(state), surahs);
    expect(result.sessions).toHaveLength(1);
    expect(result.reviewQueue).toHaveLength(1);
    expect(result.mistakes).toHaveLength(1);
    expect(result.settings.theme).toBe("system");
  });

  it("يتجاهل الحقول الزائدة بدل تمريرها", () => {
    const state = { ...validState(), extraField: "لا يجب أن يظهر" };
    const result = validateImportedState(JSON.stringify(state), surahs);
    expect(result.extraField).toBeUndefined();
  });
});

describe("validateImportedState — أخطاء بنيوية", () => {
  it("يرفض النص غير JSON", () => {
    expect(() => validateImportedState("{not json", surahs)).toThrow(ImportValidationError);
  });

  it("يرفض ما يتجاوز الحد الأقصى للحجم", () => {
    const huge = "a".repeat(MAX_IMPORT_BYTES + 1);
    expect(() => validateImportedState(huge, surahs)).toThrow(/5 ميغابايت/);
  });

  it("يرفض schemaVersion مفقود أو غير رقمي", () => {
    const state = { ...validState(), schemaVersion: "1" };
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("يرفض schemaVersion أحدث من المدعوم", () => {
    const state = { ...validState(), schemaVersion: 999 };
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(/حدّث التطبيق/);
  });

  it("يرفض sessions إن لم تكن مصفوفة", () => {
    const state = { ...validState(), sessions: {} };
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });
});

describe("validateImportedState — أخطاء المقاطع والجلسات", () => {
  it("يرفض مقطعًا يتجاوز عدد آيات السورة", () => {
    const state = validState();
    state.sessions[0].portion = { surah: 1, fromAyah: 1, toAyah: 999 };
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("يرفض رقم سورة خارج المدى 1..114", () => {
    const state = validState();
    state.sessions[0].portion = { surah: 200, fromAyah: 1, toAyah: 2 };
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("يرفض حالة جلسة غير معروفة", () => {
    const state = validState();
    state.sessions[0].status = "unknown";
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("يرفض dayKey بصيغة غير صحيحة", () => {
    const state = validState();
    state.sessions[0].dayKey = "03-08-2026";
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("فشل ذرّي: خطأ واحد في عنصر مراجعة يرفض الملف كاملًا", () => {
    const state = validState();
    state.reviewQueue[0].tier = "unknown-tier";
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("يرفض سجل خطأ برقم آية غير صالح", () => {
    const state = validState();
    state.mistakes[0].ayah = 0;
    expect(() => validateImportedState(JSON.stringify(state), surahs)).toThrow(ImportValidationError);
  });

  it("يقبل goal فارغًا (null) ويرفض goal مشوّهًا", () => {
    const okState = { ...validState(), goal: null };
    expect(validateImportedState(JSON.stringify(okState), surahs).goal).toBeNull();

    const badState = { ...validState(), goal: { ayahsPerDay: "خمسة" } };
    expect(() => validateImportedState(JSON.stringify(badState), surahs)).toThrow(ImportValidationError);
  });
});
