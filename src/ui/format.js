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
