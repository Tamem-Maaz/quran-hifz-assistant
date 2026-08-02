import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  InvalidStateError,
  UnsupportedSchemaVersionError,
  createInitialState,
  migrate,
} from "../../src/storage/migrations.js";

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

  it("لا يستدعي onBeforeMigrate عندما لا حاجة لترحيل", () => {
    let called = false;
    migrate(createInitialState(1), () => {
      called = true;
    });
    expect(called).toBe(false);
  });
});
