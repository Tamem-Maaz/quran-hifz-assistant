/**
 * اشتقاق الإحصائيات من `sessions` عند العرض — لا تُخزَّن كعدّادات منفصلة (القسم 10.1).
 */

import { diffInDays, isNextDay } from "./dates.js";

/** @typedef {import('./types.js').Session} Session */
/** @typedef {import('./types.js').MistakeEntry} MistakeEntry */

/**
 * @param {Session[]} sessions
 * @returns {Session[]}
 */
function completedOnly(sessions) {
  return sessions.filter((s) => s.status === "completed");
}

/**
 * @param {Session[]} sessions
 * @returns {number}
 */
export function countCompletedSessions(sessions) {
  return completedOnly(sessions).length;
}

/**
 * @param {Session[]} sessions
 * @returns {number}
 */
export function totalAyahsMemorized(sessions) {
  return completedOnly(sessions).reduce(
    (sum, s) => sum + (s.portion.toAyah - s.portion.fromAyah + 1),
    0
  );
}

/**
 * @param {Session[]} sessions
 * @returns {{current: number, longest: number}}
 */
export function computeStreak(sessions, todayKey) {
  const activeDays = [...new Set(completedOnly(sessions).map((s) => s.dayKey))].sort();
  if (activeDays.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let runLength = 1;
  for (let i = 1; i < activeDays.length; i++) {
    runLength = isNextDay(activeDays[i - 1], activeDays[i]) ? runLength + 1 : 1;
    longest = Math.max(longest, runLength);
  }

  const lastActiveDay = activeDays[activeDays.length - 1];
  const gapFromToday = diffInDays(lastActiveDay, todayKey);
  if (gapFromToday > 1) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let i = activeDays.length - 1; i > 0; i--) {
    if (isNextDay(activeDays[i - 1], activeDays[i])) current += 1;
    else break;
  }
  return { current, longest };
}

/**
 * أكثر المواضع تعثّرًا، الأعلى تكرارًا أولًا.
 * @param {MistakeEntry[]} mistakes
 * @param {number} [limit]
 * @returns {{surah:number, ayah:number, count:number}[]}
 */
export function topMistakeSpots(mistakes, limit = 10) {
  const counts = new Map();
  for (const m of mistakes) {
    const key = `${m.surah}:${m.ayah}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { surah: m.surah, ayah: m.ayah, count: 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
