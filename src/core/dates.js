/**
 * دوال خالصة للتعامل مع التواريخ. كل التوقيت محلي — لا UTC ولا Date.now() هنا،
 * الوقت يُمرَّر دائمًا كوسيط من الطبقة المستدعية.
 */

const MS_PER_DAY = 86400000;

/**
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD" بالتوقيت المحلي
 */
export function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * @param {string} dayKey
 * @returns {Date} منتصف ليل ذلك اليوم بالتوقيت المحلي
 */
export function dayKeyToDate(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * يضيف عددًا من الأيام إلى dayKey عبر حساب تقويمي (وليس فرق طوابع زمنية خام)،
 * فيبقى صحيحًا عبر انتقالات التوقيت الصيفي.
 * @param {string} dayKey
 * @param {number} days يمكن أن يكون سالبًا
 * @returns {string}
 */
export function addDays(dayKey, days) {
  const date = dayKeyToDate(dayKey);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number} عدد الأيام بين a و b (b - a)
 */
export function diffInDays(a, b) {
  const dateA = dayKeyToDate(a);
  const dateB = dayKeyToDate(b);
  return Math.round((dateB.getTime() - dateA.getTime()) / MS_PER_DAY);
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {-1|0|1}
 */
export function compareDayKeys(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * @param {string} previousDayKey
 * @param {string} dayKey
 * @returns {boolean} هل dayKey هو اليوم التالي مباشرة لـ previousDayKey
 */
export function isNextDay(previousDayKey, dayKey) {
  return diffInDays(previousDayKey, dayKey) === 1;
}
