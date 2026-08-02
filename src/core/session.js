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

/** @returns {StepState} */
function createStepState() {
  return { count: 0, completedAt: null };
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
 * @param {{id:string, portion:Portion, dayKey:string, now:number, defaultReps:number}} params
 * @returns {Session}
 */
export function createSession({ id, portion, dayKey, now, defaultReps }) {
  return {
    id,
    portion,
    dayKey,
    createdAt: now,
    completedAt: null,
    status: "in_progress",
    steps: {
      listeningBefore: createStepState(),
      tafsir: createStepState(),
      listeningAfter: createStepState(),
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
  const nextCount = step.count + 1;
  return {
    ...session,
    steps: {
      ...session.steps,
      [stepKey]: {
        count: nextCount,
        completedAt: step.completedAt ?? now,
      },
    },
  };
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
