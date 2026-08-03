/**
 * سلسلة الترحيل بين إصدارات المخطط (القسم 5.2). الترحيل للأمام فقط — لا دعم للتراجع.
 */

/** @typedef {import('../core/types.js').AppState} AppState */

export const CURRENT_SCHEMA_VERSION = 2;

/**
 * كل مفتاح هو رقم الإصدار المصدر، والقيمة دالة تحوّل حالة ذلك الإصدار إلى الإصدار التالي مباشرة.
 * @type {Record<number, (state: any) => any>}
 */
const migrations = {
  // 1 ← 2: إعدادات مرات الاستماع وطول السبق، وهدفٌ صريح لكل خطوة بسيطة.
  // الهدف 1 لكل الخطوات القائمة: هو بالضبط سلوكها السابق (ضغطة واحدة تُنهي
  // المرحلة)، فلا تتغيّر أي جلسة جارية تحت يد المستخدم عند الترقية.
  1: (state) => ({
    ...state,
    schemaVersion: 2,
    settings: {
      ...state.settings,
      listeningBeforeReps: 1,
      listeningAfterReps: 1,
      ayahsPerPortion: DEFAULT_AYAHS_PER_PORTION,
    },
    sessions: (state.sessions ?? []).map((session) => ({
      ...session,
      steps: {
        ...session.steps,
        listeningBefore: { ...session.steps.listeningBefore, targetCount: 1 },
        tafsir: { ...session.steps.tafsir, targetCount: 1 },
        listeningAfter: { ...session.steps.listeningAfter, targetCount: 1 },
        review: { ...session.steps.review, targetCount: 1 },
      },
    })),
  }),
};

/** طول السبق الافتراضي بالآيات لمستخدم جديد. */
export const DEFAULT_AYAHS_PER_PORTION = 5;

export class InvalidStateError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidStateError";
  }
}

export class UnsupportedSchemaVersionError extends Error {
  constructor(version) {
    super(
      `إصدار المخطط ${version} أحدث من الإصدار المدعوم ${CURRENT_SCHEMA_VERSION} — حدّث التطبيق أولًا`
    );
    this.name = "UnsupportedSchemaVersionError";
    this.version = version;
  }
}

/**
 * @param {number} now
 * @returns {AppState}
 */
export function createInitialState(now) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: {
      theme: "system",
      fontScale: "md",
      defaultReps: 10,
      listeningBeforeReps: 1,
      listeningAfterReps: 1,
      ayahsPerPortion: DEFAULT_AYAHS_PER_PORTION,
      tafsirSourceId: "",
      backupReminderEnabled: true,
      dailyReviewLimit: 7,
    },
    sessions: [],
    reviewQueue: [],
    mistakes: [],
    goal: null,
    lastBackupAt: now,
  };
}

/**
 * يطبّق سلسلة الترحيل تصاعديًا حتى الإصدار الحالي.
 * @param {any} rawState
 * @param {(rawState: any) => void} [onBeforeMigrate] يُستدعى بنسخة من الحالة الخام قبل أول ترحيل فعلي فقط
 * @returns {AppState}
 */
export function migrate(rawState, onBeforeMigrate) {
  if (rawState === null || typeof rawState !== "object" || typeof rawState.schemaVersion !== "number") {
    throw new InvalidStateError("الحالة المخزّنة تالفة أو بلا schemaVersion صالح");
  }

  if (rawState.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new UnsupportedSchemaVersionError(rawState.schemaVersion);
  }

  if (rawState.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return rawState;
  }

  onBeforeMigrate?.(rawState);

  let state = rawState;
  for (let version = state.schemaVersion; version < CURRENT_SCHEMA_VERSION; version++) {
    const step = migrations[version];
    if (!step) {
      throw new InvalidStateError(`لا توجد دالة ترحيل مسجّلة من الإصدار ${version}`);
    }
    state = step(state);
  }
  return state;
}
