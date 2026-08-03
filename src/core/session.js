/**
 * قواعد جلسة الحفظ وانتقالات الحالة. دوال خالصة بالكامل — كل دالة تُرجع كائنًا جديدًا،
 * ولا تُعدَّل الحالة الممرَّرة إليها.
 */

/** @typedef {import('./types.js').Portion} Portion */
/** @typedef {import('./types.js').Session} Session */
/** @typedef {import('./types.js').SessionSteps} SessionSteps */
/** @typedef {import('./types.js').StepState} StepState */
/** @typedef {import('./types.js').MemorizationStep} MemorizationStep */
/** @typedef {import('./types.js').RecitationStep} RecitationStep */

/**
 * @typedef {'listeningBefore'|'tafsir'|'listeningAfter'|'review'} SimpleStepKey
 */

/**
 * خطوة بسيطة بهدفٍ صريح: لا تكتمل حتى يبلغ عدّادها هدفها. الهدف 1 يعني
 * «ضغطة واحدة تُنهي المرحلة» — وهو سلوك المراحل قبل إعداد مرات الاستماع.
 * @param {number} [targetCount]
 * @returns {StepState}
 */
function createStepState(targetCount = 1) {
  return { count: 0, targetCount: Math.max(1, Math.trunc(targetCount) || 1), completedAt: null };
}

/**
 * @param {number} targetReps
 * @returns {MemorizationStep}
 */
function createMemorizationStep(targetReps) {
  return { targetReps, doneReps: 0, completedAt: null };
}

/** @returns {RecitationStep} */
function createRecitationStep() {
  return { completedAt: null, listenerName: "", notes: "" };
}

/**
 * @param {number} surah
 * @param {number} fromAyah
 * @param {number} toAyah
 * @param {{id:number, ayahCount:number}[]} surahs
 * @returns {boolean}
 */
export function isValidPortion(surah, fromAyah, toAyah, surahs) {
  const surahInfo = surahs.find((s) => s.id === surah);
  if (!surahInfo) return false;
  if (!Number.isInteger(fromAyah) || !Number.isInteger(toAyah)) return false;
  if (fromAyah < 1 || toAyah < fromAyah) return false;
  if (toAyah > surahInfo.ayahCount) return false;
  return true;
}

/**
 * @param {{id:string, portion:Portion, dayKey:string, now:number, defaultReps:number, listeningBeforeReps?:number, listeningAfterReps?:number}} params
 * @returns {Session}
 */
export function createSession({
  id,
  portion,
  dayKey,
  now,
  defaultReps,
  listeningBeforeReps = 1,
  listeningAfterReps = 1,
}) {
  return {
    id,
    portion,
    dayKey,
    createdAt: now,
    completedAt: null,
    status: "in_progress",
    steps: {
      listeningBefore: createStepState(listeningBeforeReps),
      tafsir: createStepState(),
      listeningAfter: createStepState(listeningAfterReps),
      memorization: createMemorizationStep(defaultReps),
      review: createStepState(),
      recitation: createRecitationStep(),
    },
  };
}

/**
 * @param {Session} session
 * @param {SimpleStepKey} stepKey
 * @param {number} now
 * @returns {Session}
 */
export function incrementStep(session, stepKey, now) {
  const step = session.steps[stepKey];
  const targetCount = stepTarget(step);
  const nextCount = step.count + 1;
  return {
    ...session,
    steps: {
      ...session.steps,
      [stepKey]: {
        count: nextCount,
        targetCount,
        completedAt: step.completedAt ?? (nextCount >= targetCount ? now : null),
      },
    },
  };
}

/**
 * هدف الخطوة، بافتراض 1 لأي خطوة قديمة سبقت وجود الحقل (دفاع مزدوج: الترحيل
 * يملؤه أصلًا، لكن الدوال الخالصة لا تفترض أن الترحيل جرى).
 * @param {StepState} step
 * @returns {number}
 */
function stepTarget(step) {
  return typeof step.targetCount === "number" && step.targetCount >= 1 ? step.targetCount : 1;
}

/**
 * @param {Session} session
 * @param {SimpleStepKey} stepKey
 * @returns {Session}
 */
export function decrementStep(session, stepKey) {
  const step = session.steps[stepKey];
  return {
    ...session,
    steps: {
      ...session.steps,
      [stepKey]: {
        ...step,
        count: Math.max(0, step.count - 1),
      },
    },
  };
}

/**
 * آخر آية في مقطعٍ يبدأ من `fromAyah` بطول `ayahsPerPortion`. المقطع لا يمتد
 * عبر سورتين (القسم 20)، فإن تجاوز الطولُ آخرَ السورة قُصَّ عندها — يبدأ
 * المستخدم من آية واحدة والنظام يحدّد نهايته.
 * @param {number} surah
 * @param {number} fromAyah
 * @param {number} ayahsPerPortion
 * @param {{id:number, ayahCount:number}[]} surahs
 * @returns {number}
 */
export function portionEndAyah(surah, fromAyah, ayahsPerPortion, surahs) {
  const surahInfo = surahs.find((s) => s.id === surah);
  const length = Math.max(1, Math.trunc(ayahsPerPortion) || 1);
  const end = fromAyah + length - 1;
  if (!surahInfo) return end;
  return Math.min(end, surahInfo.ayahCount);
}

/**
 * @param {Session} session
 * @param {number} now
 * @returns {Session}
 */
export function incrementMemorizationRep(session, now) {
  const step = session.steps.memorization;
  const doneReps = step.doneReps + 1;
  const justReachedTarget = step.completedAt === null && doneReps >= step.targetReps;
  return {
    ...session,
    steps: {
      ...session.steps,
      memorization: {
        ...step,
        doneReps,
        completedAt: justReachedTarget ? now : step.completedAt,
      },
    },
  };
}

/**
 * @param {Session} session
 * @returns {Session}
 */
export function decrementMemorizationRep(session) {
  const step = session.steps.memorization;
  return {
    ...session,
    steps: {
      ...session.steps,
      memorization: {
        ...step,
        doneReps: Math.max(0, step.doneReps - 1),
      },
    },
  };
}

/**
 * @param {Session} session
 * @param {number} surah
 * @param {number} ayah
 * @param {number} occurredAt
 * @param {string} note
 * @returns {import('./types.js').MistakeEntry}
 */
export function recordMistake(session, surah, ayah, occurredAt, note, id) {
  return { id, surah, ayah, occurredAt, note };
}

/**
 * @param {Session} session
 * @param {number} now
 * @param {string} listenerName
 * @param {string} notes
 * @returns {Session}
 */
export function completeRecitation(session, now, listenerName, notes) {
  return {
    ...session,
    steps: {
      ...session.steps,
      recitation: { completedAt: now, listenerName, notes },
    },
  };
}

/**
 * @param {Session} session
 * @returns {boolean}
 */
export function isRecitationDone(session) {
  return session.steps.recitation.completedAt !== null;
}

/**
 * @param {Session} session
 * @param {number} now
 * @returns {Session}
 */
export function completeSession(session, now) {
  return { ...session, status: "completed", completedAt: now };
}

/**
 * @param {Session} session
 * @returns {Session}
 */
export function abandonSession(session) {
  return { ...session, status: "abandoned" };
}

/**
 * @param {Session[]} sessions
 * @param {string} dayKey
 * @returns {Session|null}
 */
export function findInProgressSessionForDay(sessions, dayKey) {
  return sessions.find((s) => s.status === "in_progress" && s.dayKey === dayKey) ?? null;
}

/**
 * يجد أي جلسة مفتوحة بصرف النظر عن يومها — لعرض «استئناف أو إنهاء» حتى لجلسة
 * متوقفة من يوم سابق (القسم 8).
 * @param {Session[]} sessions
 * @returns {Session|null}
 */
export function findOpenSession(sessions) {
  return sessions.find((s) => s.status === "in_progress") ?? null;
}

const STAGE_ORDER = /** @type {const} */ ([
  "listeningBefore",
  "tafsir",
  "listeningAfter",
  "memorization",
  "review",
  "recitation",
]);

/**
 * أول مرحلة غير مكتملة في الجلسة، أو null إن اكتملت كل المراحل الست.
 * القيمة تُشتق دائمًا من `completedAt` — هذا ما يجعل الاستئناف بلا حاجة لحالة إضافية.
 * @param {Session} session
 * @returns {typeof STAGE_ORDER[number]|null}
 */
export function currentStageKey(session) {
  return STAGE_ORDER.find((key) => session.steps[key].completedAt === null) ?? null;
}

export { STAGE_ORDER };
