/**
 * نسبة الإنجاز وتقدير تاريخ الختم من المعدل الفعلي (القسم 10.2) — لا من الهدف المعلن.
 */

import { addDays, compareDayKeys } from "./dates.js";
import { totalAyahsMemorized } from "./statistics.js";

/** @typedef {import('./types.js').Session} Session */

export const TOTAL_AYAHS = 6236;

/**
 * @param {number} memorizedAyahs
 * @returns {number} نسبة مئوية بين 0 و100
 */
export function computeProgressPercentage(memorizedAyahs) {
  return Math.min(100, Math.max(0, (memorizedAyahs / TOTAL_AYAHS) * 100));
}

/**
 * يقدّر تاريخ الختم من متوسط آيات اليوم الفعلي خلال آخر `windowDays` يومًا.
 * @param {Session[]} sessions
 * @param {string} todayKey
 * @param {number} [windowDays]
 * @returns {string|null} dayKey متوقّع، أو null إن تعذّر التقدير (لا نشاط حديث)
 */
export function estimateCompletionDayKey(sessions, todayKey, windowDays = 30) {
  const windowStart = addDays(todayKey, -windowDays);
  const recentAyahs = sessions
    .filter((s) => s.status === "completed" && compareDayKeys(s.dayKey, windowStart) >= 0)
    .reduce((sum, s) => sum + (s.portion.toAyah - s.portion.fromAyah + 1), 0);

  if (recentAyahs <= 0) return null;

  const dailyRate = recentAyahs / windowDays;
  const remaining = TOTAL_AYAHS - totalAyahsMemorized(sessions);
  if (remaining <= 0) return todayKey;

  const daysNeeded = Math.ceil(remaining / dailyRate);
  return addDays(todayKey, daysNeeded);
}
