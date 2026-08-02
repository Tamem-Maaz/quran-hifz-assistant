import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryStorage } from "./support/memory-storage.js";
import { createRepository } from "../../src/storage/repository.js";
import { createInitialState } from "../../src/storage/migrations.js";

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe("createRepository", () => {
  it("load يعيد حالة أولية عند عدم وجود بيانات", () => {
    const repo = createRepository();
    expect(repo.load(1000).sessions).toEqual([]);
  });

  it("save يحفظ الحالة بحيث يعيدها load لاحقًا", () => {
    const repo = createRepository();
    const state = { ...createInitialState(1000), lastBackupAt: 5000 };
    repo.save(state);
    expect(repo.load(9999).lastBackupAt).toBe(5000);
  });

  it("subscribe يُخطر المستمعين عند كل save بحالة save الجديدة", () => {
    const repo = createRepository();
    const listener = vi.fn();
    repo.subscribe(listener);
    const state = createInitialState(1000);
    repo.save(state);
    expect(listener).toHaveBeenCalledWith(state);
  });

  it("إلغاء الاشتراك يوقف الإخطارات اللاحقة", () => {
    const repo = createRepository();
    const listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);
    unsubscribe();
    repo.save(createInitialState(1000));
    expect(listener).not.toHaveBeenCalled();
  });
});
