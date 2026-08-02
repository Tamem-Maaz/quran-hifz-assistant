import { beforeEach, describe, expect, it } from "vitest";
import { MemoryStorage } from "./support/memory-storage.js";
import { STORAGE_KEY, StorageQuotaExceededError, loadState, saveState } from "../../src/storage/local-storage.js";
import { CURRENT_SCHEMA_VERSION, createInitialState } from "../../src/storage/migrations.js";

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe("loadState", () => {
  it("ينشئ حالة أولية عند عدم وجود بيانات مخزّنة", () => {
    const state = loadState(1000);
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(state.sessions).toEqual([]);
  });

  it("ينشئ حالة أولية عند تلف JSON المخزَّن بدل تعطّل التطبيق", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    const state = loadState(2000);
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("يقرأ حالة صالحة محفوظة مسبقًا دون تعديل", () => {
    const original = createInitialState(500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(original));
    const loaded = loadState(9999);
    expect(loaded).toEqual(original);
  });
});

describe("saveState", () => {
  it("يحفظ الحالة ويمكن قراءتها مجددًا", () => {
    const state = createInitialState(1000);
    saveState(state);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(state);
  });

  it("يرمي StorageQuotaExceededError عند امتلاء التخزين", () => {
    globalThis.localStorage = new MemoryStorage(10); // حصة صغيرة جدًا عمدًا
    const state = createInitialState(1000);
    expect(() => saveState(state)).toThrow(StorageQuotaExceededError);
  });
});
