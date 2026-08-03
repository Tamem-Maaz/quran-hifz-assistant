/**
 * التحقق من بيانات الاستيراد (القسم 11.3). الملف المستورد مدخل غير موثوق حتى لو
 * صدّره التطبيق نفسه. فشل أي حقل ⇒ رفض الملف كاملًا (لا كتابة جزئية).
 * كل كائن يُبنى حقلًا بحقل صراحةً — لا Object.assign ولا نشر لمدخل غير موثوق.
 */

import { isValidPortion } from "../core/session.js";
import { CURRENT_SCHEMA_VERSION, DEFAULT_AYAHS_PER_PORTION } from "./migrations.js";

/** @typedef {import('../core/types.js').AppState} AppState */

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

const THEMES = new Set(["light", "dark", "system"]);
const FONT_SCALES = new Set(["sm", "md", "lg", "xl"]);
const SESSION_STATUSES = new Set(["in_progress", "completed", "abandoned"]);
const REVIEW_TIERS = new Set(["sabqi", "manzil", "graduated"]);
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class ImportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ImportValidationError";
  }
}

function fail(message) {
  throw new ImportValidationError(message);
}

function isPositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function asOptionalString(value) {
  return typeof value === "string" ? value : "";
}

function validateDayKey(value, fieldName) {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) {
    fail(`${fieldName} غير صالح`);
  }
  return value;
}

function validateTimestampOrNull(value, fieldName) {
  if (value === null) return null;
  if (!isPositiveNumber(value)) fail(`طابع زمني غير صالح في ${fieldName}`);
  return value;
}

/**
 * @param {unknown} portion
 * @param {{id:number, ayahCount:number}[]} surahs
 */
function validatePortion(portion, surahs) {
  if (portion === null || typeof portion !== "object") fail("مقطع غير صالح");
  const { surah, fromAyah, toAyah } = /** @type {any} */ (portion);
  if (!isValidPortion(surah, fromAyah, toAyah, surahs)) {
    fail(`مقطع غير صالح: سورة ${surah} آية ${fromAyah}-${toAyah}`);
  }
  return { surah, fromAyah, toAyah };
}

/**
 * حقول أُضيفت في مخطط لاحق تُقرأ بتساهل لا برفض: ملفات النسخ الاحتياطي
 * المصدَّرة قبل إضافتها لا تحملها، ورفضها كان سيُبطل كل نسخة قديمة للمستخدم.
 * الملف يحتفظ بـ schemaVersion الخاص به، فالترحيل يُقوّمه عند أول تحميل.
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function asCountOrDefault(value, fallback) {
  return Number.isInteger(value) && /** @type {number} */ (value) >= 1 ? /** @type {number} */ (value) : fallback;
}

function validateStepState(step, fieldName) {
  if (step === null || typeof step !== "object" || !isPositiveNumber(step.count)) {
    fail(`${fieldName} غير صالحة`);
  }
  return {
    count: step.count,
    targetCount: asCountOrDefault(step.targetCount, 1),
    completedAt: validateTimestampOrNull(step.completedAt, fieldName),
  };
}

function validateMemorizationStep(step) {
  if (
    step === null ||
    typeof step !== "object" ||
    !isPositiveNumber(step.targetReps) ||
    !isPositiveNumber(step.doneReps)
  ) {
    fail("خطوة الحفظ غير صالحة");
  }
  return {
    targetReps: step.targetReps,
    doneReps: step.doneReps,
    completedAt: validateTimestampOrNull(step.completedAt, "خطوة الحفظ"),
  };
}

function validateRecitationStep(step) {
  if (step === null || typeof step !== "object") fail("خطوة التسميع غير صالحة");
  return {
    completedAt: validateTimestampOrNull(step.completedAt, "خطوة التسميع"),
    listenerName: asOptionalString(step.listenerName),
    notes: asOptionalString(step.notes),
  };
}

function validateSession(session, surahs) {
  if (session === null || typeof session !== "object") fail("جلسة غير صالحة");
  if (!isNonEmptyString(session.id)) fail("معرّف جلسة غير صالح");
  if (!SESSION_STATUSES.has(session.status)) fail("حالة جلسة غير صالحة");
  if (!isPositiveNumber(session.createdAt)) fail("createdAt غير صالح");

  const steps = session.steps ?? {};
  return {
    id: session.id,
    portion: validatePortion(session.portion, surahs),
    dayKey: validateDayKey(session.dayKey, "dayKey الجلسة"),
    createdAt: session.createdAt,
    completedAt: validateTimestampOrNull(session.completedAt, "الجلسة"),
    status: session.status,
    steps: {
      listeningBefore: validateStepState(steps.listeningBefore, "الاستماع الأول"),
      tafsir: validateStepState(steps.tafsir, "التفسير"),
      listeningAfter: validateStepState(steps.listeningAfter, "الاستماع الثاني"),
      memorization: validateMemorizationStep(steps.memorization),
      review: validateStepState(steps.review, "المراجعة"),
      recitation: validateRecitationStep(steps.recitation),
    },
  };
}

function validateReviewItem(item, surahs) {
  if (item === null || typeof item !== "object") fail("عنصر مراجعة غير صالح");
  if (!isNonEmptyString(item.id)) fail("معرّف عنصر مراجعة غير صالح");
  if (!isNonEmptyString(item.sourceSessionId)) fail("sourceSessionId غير صالح");
  if (!Number.isInteger(item.intervalIndex) || item.intervalIndex < 0) fail("intervalIndex غير صالح");
  if (!isPositiveNumber(item.reviewCount)) fail("reviewCount غير صالح");
  if (!isPositiveNumber(item.lapseCount)) fail("lapseCount غير صالح");
  if (!REVIEW_TIERS.has(item.tier)) fail("tier غير صالح");

  return {
    id: item.id,
    portion: validatePortion(item.portion, surahs),
    sourceSessionId: item.sourceSessionId,
    intervalIndex: item.intervalIndex,
    dueDayKey: validateDayKey(item.dueDayKey, "dueDayKey"),
    lastReviewedDayKey:
      item.lastReviewedDayKey === null ? null : validateDayKey(item.lastReviewedDayKey, "lastReviewedDayKey"),
    reviewCount: item.reviewCount,
    lapseCount: item.lapseCount,
    tier: item.tier,
  };
}

function validateMistake(mistake) {
  if (mistake === null || typeof mistake !== "object") fail("سجل خطأ غير صالح");
  if (!isNonEmptyString(mistake.id)) fail("معرّف خطأ غير صالح");
  if (!Number.isInteger(mistake.surah) || mistake.surah < 1 || mistake.surah > 114) {
    fail("رقم سورة غير صالح في سجل خطأ");
  }
  if (!Number.isInteger(mistake.ayah) || mistake.ayah < 1) fail("رقم آية غير صالح في سجل خطأ");
  if (!isPositiveNumber(mistake.occurredAt)) fail("occurredAt غير صالح");
  return {
    id: mistake.id,
    surah: mistake.surah,
    ayah: mistake.ayah,
    occurredAt: mistake.occurredAt,
    note: asOptionalString(mistake.note),
  };
}

function validateGoal(goal) {
  if (goal === null || goal === undefined) return null;
  if (typeof goal !== "object" || !isPositiveNumber(goal.ayahsPerDay) || !isPositiveNumber(goal.startedAt)) {
    fail("goal غير صالح");
  }
  return { ayahsPerDay: goal.ayahsPerDay, startedAt: goal.startedAt };
}

function validateSettings(settings) {
  if (settings === null || typeof settings !== "object") fail("settings غير صالحة");
  if (!THEMES.has(settings.theme)) fail("theme غير صالح");
  if (!FONT_SCALES.has(settings.fontScale)) fail("fontScale غير صالح");
  if (!Number.isInteger(settings.defaultReps) || settings.defaultReps < 1) fail("defaultReps غير صالح");
  if (typeof settings.tafsirSourceId !== "string") fail("tafsirSourceId غير صالح");
  if (typeof settings.backupReminderEnabled !== "boolean") fail("backupReminderEnabled غير صالح");
  if (!Number.isInteger(settings.dailyReviewLimit) || settings.dailyReviewLimit < 1) {
    fail("dailyReviewLimit غير صالح");
  }
  return {
    theme: settings.theme,
    fontScale: settings.fontScale,
    defaultReps: settings.defaultReps,
    listeningBeforeReps: asCountOrDefault(settings.listeningBeforeReps, 1),
    listeningAfterReps: asCountOrDefault(settings.listeningAfterReps, 1),
    ayahsPerPortion: asCountOrDefault(settings.ayahsPerPortion, DEFAULT_AYAHS_PER_PORTION),
    tafsirSourceId: settings.tafsirSourceId,
    backupReminderEnabled: settings.backupReminderEnabled,
    dailyReviewLimit: settings.dailyReviewLimit,
  };
}

/**
 * @param {string} rawText محتوى ملف الاستيراد كنص خام
 * @param {{id:number, ayahCount:number}[]} surahs
 * @param {number} [maxBytes]
 * @returns {AppState}
 */
export function validateImportedState(rawText, surahs, maxBytes = MAX_IMPORT_BYTES) {
  if (typeof rawText !== "string") fail("محتوى الملف غير نصي");

  const byteLength = new TextEncoder().encode(rawText).length;
  if (byteLength > maxBytes) fail("حجم الملف يتجاوز الحد الأقصى (5 ميغابايت)");

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    fail("الملف ليس JSON صالحًا");
  }

  if (parsed === null || typeof parsed !== "object") fail("بنية الملف غير صالحة");
  if (typeof parsed.schemaVersion !== "number") fail("schemaVersion مفقود أو غير صالح");
  if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
    fail("إصدار الملف أحدث من الإصدار المدعوم — حدّث التطبيق أولًا");
  }
  if (!Array.isArray(parsed.sessions)) fail("sessions ليست مصفوفة");
  if (!Array.isArray(parsed.reviewQueue)) fail("reviewQueue ليست مصفوفة");
  if (!Array.isArray(parsed.mistakes)) fail("mistakes ليست مصفوفة");
  if (!isPositiveNumber(parsed.lastBackupAt)) fail("lastBackupAt غير صالح");

  return {
    schemaVersion: parsed.schemaVersion,
    settings: validateSettings(parsed.settings),
    sessions: parsed.sessions.map((s) => validateSession(s, surahs)),
    reviewQueue: parsed.reviewQueue.map((r) => validateReviewItem(r, surahs)),
    mistakes: parsed.mistakes.map(validateMistake),
    goal: validateGoal(parsed.goal),
    lastBackupAt: parsed.lastBackupAt,
  };
}
