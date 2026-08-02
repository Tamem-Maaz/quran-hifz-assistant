/**
 * سلسلة الترحيل بين إصدارات المخطط (القسم 5.2). الترحيل للأمام فقط — لا دعم للتراجع.
 */

/** @typedef {import('../core/types.js').AppState} AppState */

export const CURRENT_SCHEMA_VERSION = 1;

/**
 * كل مفتاح هو رقم الإصدار المصدر، والقيمة دالة تحوّل حالة ذلك الإصدار إلى الإصدار التالي مباشرة.
 * @type {Record<number, (state: any) => any>}
 */
const migrations = {
  // 1: (state) => ({ ...state, schemaVersion: 2, ... })
};

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
      tafsirSourceId: "",
      backupReminderEnabled: true,
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
