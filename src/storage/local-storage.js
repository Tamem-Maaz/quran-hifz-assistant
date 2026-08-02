/**
 * التنفيذ الفعلي للتخزين فوق `localStorage`. هذه هي الطبقة الوحيدة التي تلمس
 * الكائن العام `localStorage` — أي دالة أخرى تصل إليه عبر هذا الملف.
 */

import { createInitialState, migrate } from "./migrations.js";

/** @typedef {import('../core/types.js').AppState} AppState */

export const STORAGE_KEY = "quran-hifz-assistant:state";
const BACKUP_KEY_PREFIX = "quran-hifz-assistant:pre-migration-backup:";

export class StorageQuotaExceededError extends Error {
  constructor() {
    super("localStorage ممتلئ — صدّر نسخة احتياطية وحرّر مساحة");
    this.name = "StorageQuotaExceededError";
  }
}

function isQuotaExceededError(error) {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}

/**
 * @param {number} now
 * @returns {AppState}
 */
export function loadState(now) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return createInitialState(now);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createInitialState(now);
  }

  return migrate(parsed, (rawState) => backupBeforeMigration(rawState, now));
}

/**
 * @param {AppState} state
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    if (isQuotaExceededError(error)) throw new StorageQuotaExceededError();
    throw error;
  }
}

/**
 * تصدير نسخة احتياطية تلقائية إلى مفتاح منفصل قبل تطبيق أي ترحيل (القسم 5.2).
 * @param {any} rawState
 * @param {number} now
 */
function backupBeforeMigration(rawState, now) {
  try {
    localStorage.setItem(`${BACKUP_KEY_PREFIX}${now}`, JSON.stringify(rawState));
  } catch {
    // النسخ الاحتياطي التلقائي غير حرج لنجاح الترحيل — تجاهل فشله بصمت
  }
}
