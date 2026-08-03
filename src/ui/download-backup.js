import { buildBackupExport } from "../storage/backup.js";

/** @typedef {import('../core/types.js').AppState} AppState */

/**
 * يبني ملف النسخة الاحتياطية ويشغّل تنزيله فورًا عبر رابط blob مؤقت.
 * @param {AppState} state
 * @param {number} now
 */
export function downloadBackup(state, now) {
  const { fileName, json } = buildBackupExport(state, now);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
