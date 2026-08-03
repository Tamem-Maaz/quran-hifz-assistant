/**
 * لوحة اليوم (القسم 8) — الشاشة الافتتاحية. تجيب على سؤالي المشروع: ماذا أحفظ
 * اليوم، وماذا أراجع مما حفظته سابقًا.
 */

import { diffInDays, toDayKey } from "../../core/dates.js";
import { findOpenSession } from "../../core/session.js";
import { getDueItems, redistributeBacklog } from "../../core/scheduler.js";
import { computeStreak, totalAyahsMemorized } from "../../core/statistics.js";
import { computeProgressPercentage, estimateCompletionDayKey, TOTAL_AYAHS } from "../../core/progress.js";
import { formatDayKeyLong, formatPortion } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { downloadBackup } from "../download-backup.js";
import { navigate } from "../router.js";

const OVERFLOW_ALERT_THRESHOLD = 10;
const BACKUP_REMINDER_DAYS = 30;

/** @typedef {import('../store.js').AppContext} AppContext */

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  function paint() {
    clear(container);
    container.append(build(ctx));
  }
  paint();
  return ctx.store.subscribe(paint);
}

function build(ctx) {
  const { store, surahs, now } = ctx;
  const state = store.getState();
  const todayKey = toDayKey(new Date(now()));
  const openSession = findOpenSession(state.sessions);
  const hasAnySessions = state.sessions.length > 0;
  const completedToday = state.sessions.some((s) => s.status === "completed" && s.dayKey === todayKey);
  const { current: streak } = computeStreak(state.sessions, state.reviewQueue, todayKey);
  const { items: dueItems, overflowCount } = getDueItems(state.reviewQueue, todayKey, state.settings.dailyReviewLimit);

  const header = el("header", { className: "card" }, [
    el("h1", { text: `اليوم — ${formatDayKeyLong(todayKey)}` }),
    el("p", { className: "muted", text: streak > 0 ? `🔥 تتابع: ${streak} يومًا` : "ابدأ تتابعك اليوم" }),
  ]);

  const sections = [header];

  const backupReminder = buildBackupReminderCard(ctx, state, todayKey);
  if (backupReminder) sections.push(backupReminder);

  sections.push(buildSabaqCard({ openSession, hasAnySessions, completedToday, surahs, todayKey }));

  if (dueItems.length > 0 || overflowCount > 0) {
    sections.push(buildReviewCard({ dueItems, overflowCount, surahs, store, todayKey }));
  }

  if (hasAnySessions) {
    sections.push(buildProgressCard(state, todayKey));
  }

  return el("div", { className: "view view-today" }, sections);
}

function buildBackupReminderCard(ctx, state, todayKey) {
  const { store, now } = ctx;
  if (!state.settings.backupReminderEnabled) return null;

  const lastBackupDayKey = toDayKey(new Date(state.lastBackupAt));
  const daysSinceBackup = diffInDays(lastBackupDayKey, todayKey);
  if (daysSinceBackup < BACKUP_REMINDER_DAYS) return null;

  return el("section", { className: "card" }, [
    el("h2", { text: "تذكير بالنسخ الاحتياطي" }),
    el("p", {
      text: `مضى ${daysSinceBackup} يومًا منذ آخر نسخة احتياطية. بياناتك محفوظة في متصفحك فقط، والنسخ الاحتياطي حمايتك الوحيدة من فقدانها.`,
    }),
    el("div", { className: "step-counter__actions" }, [
      bigButton({
        text: "تصدير الآن",
        onClick: () => {
          const current = store.getState();
          const nowMs = now();
          downloadBackup(current, nowMs);
          store.setState({ ...current, lastBackupAt: nowMs });
        },
      }),
      bigButton({ text: "فتح الإعدادات", variant: "secondary", onClick: () => navigate("settings") }),
    ]),
  ]);
}

function buildSabaqCard({ openSession, hasAnySessions, completedToday, surahs, todayKey }) {
  if (openSession) {
    const isFromToday = openSession.dayKey === todayKey;
    return el("section", { className: "card" }, [
      el("h2", { text: isFromToday ? "السبق: جلسة مفتوحة" : "جلسة متوقفة من يوم سابق" }),
      el("p", { className: "portion-badge", text: formatPortion(openSession.portion, surahs) }),
      el("div", { className: "step-counter__actions" }, [
        bigButton({ text: "استئناف", onClick: () => navigate("session") }),
      ]),
    ]);
  }

  if (!hasAnySessions) {
    return el("section", { className: "card" }, [
      el("h2", { text: "أهلًا بك" }),
      el("p", {
        text: "هذا مساعدك الشخصي للحفظ. يقودك خلال جلسة حفظ متكاملة، ويذكّرك بمراجعة ما حفظته سابقًا في وقته.",
      }),
      el("div", { className: "step-counter__actions" }, [
        bigButton({ text: "ابدأ أول جلسة", onClick: () => navigate("new-session") }),
      ]),
    ]);
  }

  if (completedToday) {
    return el("section", { className: "card" }, [
      el("h2", { text: "أنجزت سبق اليوم ✅" }),
      el("div", { className: "step-counter__actions" }, [
        bigButton({ text: "جلسة إضافية", onClick: () => navigate("new-session"), variant: "secondary" }),
      ]),
    ]);
  }

  return el("section", { className: "card" }, [
    el("h2", { text: "لم تبدأ سبقًا جديدًا اليوم" }),
    el("div", { className: "step-counter__actions" }, [
      bigButton({ text: "بدء سبق جديد", onClick: () => navigate("new-session") }),
    ]),
  ]);
}

function buildReviewCard({ dueItems, overflowCount, surahs, store, todayKey }) {
  const rows = dueItems.map((item) =>
    el("div", { className: "review-item" }, [
      el("span", { text: formatPortion(item.portion, surahs) }),
      el("span", { className: "muted", text: item.dueDayKey === todayKey ? "اليوم" : "متأخرة" }),
    ])
  );

  const children = [el("h2", { text: `المراجعة المستحقة (${dueItems.length})` }), ...rows];

  if (dueItems.length > 0) {
    children.push(
      el("div", { className: "step-counter__actions" }, [bigButton({ text: "ابدأ المراجعة", onClick: () => navigate("review") })])
    );
  }

  if (overflowCount > 0) {
    children.push(el("p", { className: "muted", text: `+${overflowCount} أخرى مستحقة لاحقًا` }));
  }

  if (overflowCount >= OVERFLOW_ALERT_THRESHOLD) {
    children.push(
      el("div", { className: "step-counter__actions" }, [
        bigButton({
          text: "إعادة توزيع المتراكم",
          variant: "secondary",
          onClick: () => {
            const state = store.getState();
            const redistributed = redistributeBacklog(state.reviewQueue, todayKey, 7);
            store.setState({ ...state, reviewQueue: redistributed });
          },
        }),
      ])
    );
  }

  return el("section", { className: "card" }, children);
}

function buildProgressCard(state, todayKey) {
  const memorized = totalAyahsMemorized(state.sessions);
  const percentage = computeProgressPercentage(memorized);
  const estimate = estimateCompletionDayKey(state.sessions, todayKey);

  return el("section", { className: "card" }, [
    el("h2", { text: "التقدّم" }),
    el("p", { text: `${memorized} آية من ${TOTAL_AYAHS} (${percentage.toFixed(1)}%)` }),
    el("p", {
      className: "muted",
      text: estimate ? `الختم المتوقع (تقدير من معدّل آخر 30 يومًا): ${formatDayKeyLong(estimate)}` : "لا يوجد نشاط كافٍ حديثًا لتقدير تاريخ الختم",
    }),
  ]);
}
