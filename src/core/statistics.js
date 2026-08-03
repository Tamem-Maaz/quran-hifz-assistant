/**
 * اشتقاق الإحصائيات من `sessions` عند العرض — لا تُخزَّن كعدّادات منفصلة (القسم 10.1).
 */

import { addDays, diffInDays, isNextDay } from "./dates.js";

/** @typedef {import('./types.js').Session} Session */
/** @typedef {import('./types.js').MistakeEntry} MistakeEntry */
/** @typedef {import('./types.js').ReviewItem} ReviewItem */

/**
 * @param {Session[]} sessions
 * @returns {Session[]}
 */
function completedOnly(sessions) {
  return sessions.filter((s) => s.status === "completed");
}

/**
 * أيام النشاط الفريدة: يوم فيه سبق مكتمل أو مراجعة أُجريت. مراجعة وحدها بلا
 * سبق جديد تُحتسب يوم نشاط (القسم 20.2، القرار العامل: نعم تُحتسب).
 * @param {Session[]} sessions
 * @param {ReviewItem[]} reviewQueue
 * @returns {string[]}
 */
export function activeDayKeys(sessions, reviewQueue) {
  const days = new Set();
  for (const session of completedOnly(sessions)) days.add(session.dayKey);
  for (const item of reviewQueue) {
    if (item.lastReviewedDayKey) days.add(item.lastReviewedDayKey);
  }
  return [...days];
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
 * @param {ReviewItem[]} reviewQueue
 * @param {string} todayKey
 * @returns {{current: number, longest: number}}
 */
export function computeStreak(sessions, reviewQueue, todayKey) {
  const activeDays = activeDayKeys(sessions, reviewQueue).sort();
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

/**
 * إجماليات الخطوات عبر كل الجلسات (بلا استثناء المهجورة — كل تكرار فعلي يُحتسب).
 * @param {Session[]} sessions
 * @returns {{listeningBefore:number, tafsir:number, listeningAfter:number, memorizationReps:number, review:number, recitation:number}}
 */
export function computeStepTotals(sessions) {
  const totals = {
    listeningBefore: 0,
    tafsir: 0,
    listeningAfter: 0,
    memorizationReps: 0,
    review: 0,
    recitation: 0,
  };
  for (const session of sessions) {
    totals.listeningBefore += session.steps.listeningBefore.count;
    totals.tafsir += session.steps.tafsir.count;
    totals.listeningAfter += session.steps.listeningAfter.count;
    totals.memorizationReps += session.steps.memorization.doneReps;
    totals.review += session.steps.review.count;
    totals.recitation += session.steps.recitation.completedAt !== null ? 1 : 0;
  }
  return totals;
}

/**
 * خريطة حرارية لأيام النشاط خلال آخر `days` يومًا المنتهية باليوم الحالي
 * (نافذة متحرّكة، لا سنة تقويمية ثابتة — القسم 10.2).
 * @param {Session[]} sessions
 * @param {ReviewItem[]} reviewQueue
 * @param {string} todayKey
 * @param {number} [days]
 * @returns {{dayKey:string, count:number}[]} من الأقدم إلى الأحدث
 */
export function buildActivityHeatmap(sessions, reviewQueue, todayKey, days = 365) {
  const counts = new Map();
  for (const session of completedOnly(sessions)) {
    counts.set(session.dayKey, (counts.get(session.dayKey) ?? 0) + 1);
  }
  for (const item of reviewQueue) {
    if (item.lastReviewedDayKey) {
      counts.set(item.lastReviewedDayKey, (counts.get(item.lastReviewedDayKey) ?? 0) + 1);
    }
  }

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayKey = addDays(todayKey, -i);
    result.push({ dayKey, count: counts.get(dayKey) ?? 0 });
  }
  return result;
}
