import { describe, expect, it } from "vitest";
import { buildBackupExport } from "../../src/storage/backup.js";
import { createInitialState } from "../../src/storage/migrations.js";

describe("buildBackupExport", () => {
  it("يبني اسم ملف من التاريخ المحلي بصيغة quran-memorization-backup-YYYY-MM-DD.json", () => {
    const state = createInitialState(1000);
    const now = new Date(2026, 7, 3).getTime();
    const { fileName } = buildBackupExport(state, now);
    expect(fileName).toBe("quran-memorization-backup-2026-08-03.json");
  });

  it("يضيف exportedAt دون تعديل الحالة الأصلية", () => {
    const state = createInitialState(1000);
    const now = 5000;
    const { json } = buildBackupExport(state, now);
    const parsed = JSON.parse(json);
    expect(parsed.exportedAt).toBe(5000);
    expect(parsed.schemaVersion).toBe(state.schemaVersion);
    expect(state.exportedAt).toBeUndefined();
  });
});
