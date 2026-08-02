/**
 * جدولة المراجعة الدورية (السبقي/المنزل). راجع القسم 7 من docs/PROJECT_PLAN.md.
 */

import { addDays, compareDayKeys } from "./dates.js";

/** @typedef {import('./types.js').ReviewItem} ReviewItem */
/** @typedef {import('./types.js').ReviewTier} ReviewTier */
/** @typedef {import('./types.js').Portion} Portion */

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 15, 30, 60];
export const SABQI_INTERVAL_COUNT = 3; // أول 3 فواصل (1، 3، 7 أيام) = السبقي
export const GRADUATED_INTERVAL_DAYS = 30;
export const LAPSE_THRESHOLD = 3;

/**
 * @param {number} intervalIndex
 * @returns {ReviewTier}
 */
export function tierForIntervalIndex(intervalIndex) {
  if (intervalIndex >= REVIEW_INTERVALS_DAYS.length) return "graduated";
  return intervalIndex < SABQI_INTERVAL_COUNT ? "sabqi" : "manzil";
}

/**
 * @param {{id:string, portion:Portion, sourceSessionId:string}} params
 * @param {string} todayKey
 * @returns {ReviewItem}
 */
export function createReviewItem({ id, portion, sourceSessionId }, todayKey) {
  return {
    id,
    portion,
    sourceSessionId,
    intervalIndex: 0,
    dueDayKey: addDays(todayKey, REVIEW_INTERVALS_DAYS[0]),
    lastReviewedDayKey: null,
    reviewCount: 0,
    lapseCount: 0,
    tier: tierForIntervalIndex(0),
  };
}

/**
 * @param {ReviewItem} item
 * @param {'passed'|'failed'} outcome
 * @param {string} todayKey
 * @returns {ReviewItem}
 */
export function applyReviewOutcome(item, outcome, todayKey) {
  if (outcome === "failed") {
    return {
      ...item,
      intervalIndex: 0,
      dueDayKey: addDays(todayKey, REVIEW_INTERVALS_DAYS[0]),
      lastReviewedDayKey: todayKey,
      reviewCount: item.reviewCount + 1,
      lapseCount: item.lapseCount + 1,
      tier: tierForIntervalIndex(0),
    };
  }

  const nextIndex = item.intervalIndex + 1;
  const isGraduated = nextIndex >= REVIEW_INTERVALS_DAYS.length;
  const resultIndex = isGraduated ? REVIEW_INTERVALS_DAYS.length : nextIndex;
  const intervalDays = isGraduated ? GRADUATED_INTERVAL_DAYS : REVIEW_INTERVALS_DAYS[nextIndex];

  return {
    ...item,
    intervalIndex: resultIndex,
    dueDayKey: addDays(todayKey, intervalDays),
    lastReviewedDayKey: todayKey,
    reviewCount: item.reviewCount + 1,
    tier: tierForIntervalIndex(resultIndex),
  };
}

/**
 * @param {ReviewItem} item
 * @returns {boolean}
 */
export function needsReinforcement(item) {
  return item.lapseCount >= LAPSE_THRESHOLD;
}

/**
 * @param {ReviewItem[]} queue
 * @param {string} todayKey
 * @param {number} limit
 * @returns {{items: ReviewItem[], overflowCount: number}}
 */
export function getDueItems(queue, todayKey, limit) {
  const due = queue
    .filter((item) => compareDayKeys(item.dueDayKey, todayKey) <= 0)
    .sort((a, b) => {
      const byDate = compareDayKeys(a.dueDayKey, b.dueDayKey);
      if (byDate !== 0) return byDate;
      return b.lapseCount - a.lapseCount;
    });
  return {
    items: due.slice(0, limit),
    overflowCount: Math.max(0, due.length - limit),
  };
}

/**
 * يوزّع المستحقات المتأخرة على الأيام القادمة بالتساوي تقريبًا، الأقدم استحقاقًا أولًا.
 * @param {ReviewItem[]} queue
 * @param {string} todayKey
 * @param {number} [overDays]
 * @returns {ReviewItem[]}
 */
export function redistributeBacklog(queue, todayKey, overDays = 7) {
  const overdue = queue
    .filter((item) => compareDayKeys(item.dueDayKey, todayKey) < 0)
    .sort((a, b) => compareDayKeys(a.dueDayKey, b.dueDayKey));
  const overdueIds = new Set(overdue.map((item) => item.id));
  const newDueDayKeys = overdue.map((_, index) => addDays(todayKey, index % overDays));

  let cursor = 0;
  return queue.map((item) => {
    if (!overdueIds.has(item.id)) return item;
    const dueDayKey = newDueDayKeys[cursor];
    cursor += 1;
    return { ...item, dueDayKey };
  });
}
