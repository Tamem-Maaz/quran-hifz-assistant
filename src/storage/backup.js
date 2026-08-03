/**
 * بناء ملف النسخ الاحتياطي (القسم 11.2). دالة خالصة — التنزيل الفعلي (Blob/رابط)
 * مسؤولية طبقة ui/ لأنه يلمس DOM.
 */

import { toDayKey } from "../core/dates.js";

/** @typedef {import('../core/types.js').AppState} AppState */

/**
 * @param {AppState} state
 * @param {number} now
 * @returns {{fileName: string, json: string}}
 */
export function buildBackupExport(state, now) {
  const dayKey = toDayKey(new Date(now));
  const exportedState = { ...state, exportedAt: now };
  return {
    fileName: `quran-memorization-backup-${dayKey}.json`,
    json: JSON.stringify(exportedState, null, 2),
  };
}
