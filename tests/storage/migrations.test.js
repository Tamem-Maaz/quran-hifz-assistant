import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_AYAHS_PER_PORTION,
  InvalidStateError,
  UnsupportedSchemaVersionError,
  createInitialState,
  migrate,
} from "../../src/storage/migrations.js";

/** حالة إصدار 1 مبسّطة: جلسة واحدة بخطواتها كما كانت قبل حقل targetCount. */
function v1State() {
  return {
    schemaVersion: 1,
    settings: {
      theme: "dark",
      fontScale: "lg",
      defaultReps: 12,
      tafsirSourceId: "",
      backupReminderEnabled: false,
      dailyReviewLimit: 5,
    },
    sessions: [
      {
        id: "s1",
        portion: { surah: 2, fromAyah: 12, toAyah: 15 },
        dayKey: "2026-08-01",
        createdAt: 1000,
        completedAt: null,
        status: "in_progress",
        steps: {
          listeningBefore: { count: 1, completedAt: 1100 },
          tafsir: { count: 0, completedAt: null },
          listeningAfter: { count: 0, completedAt: null },
          memorization: { targetReps: 12, doneReps: 0, completedAt: null },
          review: { count: 0, completedAt: null },
          recitation: { completedAt: null, listenerName: "", notes: "" },
        },
      },
    ],
    reviewQueue: [],
    mistakes: [],
    goal: null,
    lastBackupAt: 900,
  };
}

describe("createInitialState", () => {
  it("ينشئ حالة فارغة صالحة بالإصدار الحالي", () => {
    const state = createInitialState(1000);
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.sessions).toEqual([]);
    expect(state.reviewQueue).toEqual([]);
    expect(state.mistakes).toEqual([]);
    expect(state.goal).toBeNull();
    expect(state.lastBackupAt).toBe(1000);
    expect(state.settings.theme).toBe("system");
  });
});

describe("migrate", () => {
  it("يرجع الحالة كما هي عند مطابقة الإصدار الحالي", () => {
    const state = createInitialState(1000);
    expect(migrate(state)).toBe(state);
  });

  it("يرفض حالة تالفة (null أو بلا schemaVersion رقمي)", () => {
    expect(() => migrate(null)).toThrow(InvalidStateError);
    expect(() => migrate({})).toThrow(InvalidStateError);
    expect(() => migrate({ schemaVersion: "1" })).toThrow(InvalidStateError);
  });

  it("يرفض إصدارًا أحدث من المدعوم", () => {
    expect(() => migrate({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toThrow(
      UnsupportedSchemaVersionError
    );
  });

  it("يستدعي onBeforeMigrate مرة واحدة فقط قبل أول ترحيل فعلي، ويرفض عدم وجود دالة ترحيل", () => {
    let backupCalls = 0;
    expect(() =>
      migrate({ schemaVersion: 0 }, () => {
        backupCalls += 1;
      })
    ).toThrow(InvalidStateError);
    expect(backupCalls).toBe(1);
  });

  it("يرحّل من الإصدار 1: إعدادات جديدة بقيم افتراضية دون المساس بالقائمة", () => {
    const migrated = migrate(v1State());
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.settings.listeningBeforeReps).toBe(1);
    expect(migrated.settings.listeningAfterReps).toBe(1);
    expect(migrated.settings.ayahsPerPortion).toBe(DEFAULT_AYAHS_PER_PORTION);
    expect(migrated.settings.defaultReps).toBe(12);
    expect(migrated.settings.theme).toBe("dark");
    expect(migrated.settings.dailyReviewLimit).toBe(5);
  });

  it("يرحّل من الإصدار 1: هدف 1 لكل خطوة بسيطة فلا يتغيّر سلوك جلسة جارية", () => {
    const migrated = migrate(v1State());
    const steps = migrated.sessions[0].steps;
    expect(steps.listeningBefore).toEqual({ count: 1, targetCount: 1, completedAt: 1100 });
    expect(steps.tafsir.targetCount).toBe(1);
    expect(steps.listeningAfter.targetCount).toBe(1);
    expect(steps.review.targetCount).toBe(1);
    expect(steps.memorization).toEqual({ targetReps: 12, doneReps: 0, completedAt: null });
  });

  it("لا يستدعي onBeforeMigrate عندما لا حاجة لترحيل", () => {
    let called = false;
    migrate(createInitialState(1), () => {
      called = true;
    });
    expect(called).toBe(false);
  });
});
