/**
 * تعريفات الأنواع المشتركة عبر `core/` و`storage/` (JSDoc فقط — لا كود تنفيذي).
 * راجع القسم 5 من docs/PROJECT_PLAN.md لتوثيق كامل للعقد.
 */

/**
 * @typedef {Object} AppState
 * @property {number} schemaVersion
 * @property {Settings} settings
 * @property {Session[]} sessions
 * @property {ReviewItem[]} reviewQueue
 * @property {MistakeEntry[]} mistakes
 * @property {Goal|null} goal
 * @property {number} lastBackupAt
 */

/**
 * المقطع لا يمتد عبر سورتين (قرار مثبّت، القسم 20).
 * @typedef {Object} Portion
 * @property {number} surah 1..114
 * @property {number} fromAyah
 * @property {number} toAyah toAyah >= fromAyah
 */

/**
 * @typedef {'in_progress'|'completed'|'abandoned'} SessionStatus
 */

/**
 * @typedef {Object} Session
 * @property {string} id
 * @property {Portion} portion
 * @property {string} dayKey
 * @property {number} createdAt
 * @property {number|null} completedAt
 * @property {SessionStatus} status
 * @property {SessionSteps} steps
 */

/**
 * @typedef {Object} SessionSteps
 * @property {StepState} listeningBefore
 * @property {StepState} tafsir
 * @property {StepState} listeningAfter
 * @property {MemorizationStep} memorization
 * @property {StepState} review
 * @property {RecitationStep} recitation
 */

/**
 * خطوة بسيطة: لا تكتمل حتى يبلغ `count` قيمة `targetCount` (الهدف 1 = ضغطة
 * واحدة تُنهيها). مرحلتا الاستماع تأخذان هدفهما من الإعدادات عند إنشاء الجلسة.
 * @typedef {Object} StepState
 * @property {number} count
 * @property {number} targetCount
 * @property {number|null} completedAt
 */

/**
 * @typedef {Object} MemorizationStep
 * @property {number} targetReps
 * @property {number} doneReps
 * @property {number|null} completedAt
 */

/**
 * @typedef {Object} RecitationStep
 * @property {number|null} completedAt
 * @property {string} listenerName
 * @property {string} notes
 */

/**
 * @typedef {'sabqi'|'manzil'|'graduated'} ReviewTier
 */

/**
 * @typedef {Object} ReviewItem
 * @property {string} id
 * @property {Portion} portion
 * @property {string} sourceSessionId
 * @property {number} intervalIndex
 * @property {string} dueDayKey
 * @property {string|null} lastReviewedDayKey
 * @property {number} reviewCount
 * @property {number} lapseCount
 * @property {ReviewTier} tier
 */

/**
 * @typedef {Object} MistakeEntry
 * @property {string} id
 * @property {number} surah
 * @property {number} ayah
 * @property {number} occurredAt
 * @property {string} note
 */

/**
 * @typedef {Object} Goal
 * @property {number} ayahsPerDay
 * @property {number} startedAt
 */

/**
 * @typedef {Object} Settings
 * @property {'light'|'dark'|'system'} theme
 * @property {'sm'|'md'|'lg'|'xl'} fontScale
 * @property {number} defaultReps
 * @property {number} listeningBeforeReps مرات الاستماع قبل قراءة التفسير
 * @property {number} listeningAfterReps مرات الاستماع بعد قراءة التفسير
 * @property {number} ayahsPerPortion طول السبق الافتراضي بالآيات
 * @property {string} tafsirSourceId
 * @property {boolean} backupReminderEnabled
 * @property {number} dailyReviewLimit
 */

export {};
