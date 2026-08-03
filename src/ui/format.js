/**
 * تنسيق العرض (تواريخ ومراجع مقاطع). طبقة ui/ فقط — Intl والتنسيق ليسا منطق نطاق.
 */

/** @typedef {import('../core/types.js').Portion} Portion */

/**
 * @param {string} dayKey
 * @returns {string} مثل "الاثنين، ٣ أغسطس ٢٠٢٦" — السنة إلزامية دائمًا لتفادي التباس
 * تاريخ بعيد (مثل تقدير الختم) بتاريخ في السنة الحالية.
 */
export function formatDayKeyLong(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
    date
  );
}

/**
 * @param {string} dayKey
 * @returns {string} مثل "٣ أغسطس" — بلا سنة أو يوم أسبوع، لسياقات مضغوطة كشريط المعلومات العلوي.
 */
export function formatDayKeyShort(dayKey) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" }).format(date);
}

/**
 * @param {Portion} portion
 * @param {{id:number, name:string}[]} surahs
 * @returns {string} مثل "البقرة 12 — 15"
 */
export function formatPortion(portion, surahs) {
  const surah = surahs.find((s) => s.id === portion.surah);
  const name = surah ? surah.name : `سورة ${portion.surah}`;
  return portion.fromAyah === portion.toAyah
    ? `${name} ${portion.fromAyah}`
    : `${name} ${portion.fromAyah} — ${portion.toAyah}`;
}

/**
 * صيغة العدد مع تمييزه بالعربية: المفرد والمثنّى وجمع القلّة (3–10) ثم
 * التمييز المفرد (11 فأكثر). «5 آية» خطأ نحوي يلفت النظر في نصّ عن القرآن.
 * @param {number} count
 * @returns {string} مثل "آية واحدة" أو "آيتان" أو "5 آيات" أو "12 آية"
 */
export function formatAyahCount(count) {
  if (count === 1) return "آية واحدة";
  if (count === 2) return "آيتان";
  if (count >= 3 && count <= 10) return `${count} آيات`;
  return `${count} آية`;
}
