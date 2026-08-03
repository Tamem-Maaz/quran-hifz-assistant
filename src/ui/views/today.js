/**
 * لوحة اليوم (القسم 8) — الشاشة الافتتاحية. تجيب على سؤالي المشروع: ماذا أحفظ
 * اليوم، وماذا أراجع مما حفظته سابقًا.
 */

import { diffInDays, toDayKey } from "../../core/dates.js";
import { findOpenSession } from "../../core/session.js";
import { getDueItems, redistributeBacklog } from "../../core/scheduler.js";
import { totalAyahsMemorized } from "../../core/statistics.js";
import { computeProgressPercentage, estimateCompletionDayKey, TOTAL_AYAHS } from "../../core/progress.js";
import { formatDayKeyLong, formatPortion } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { cardHead } from "../components/card.js";
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
  const { items: dueItems, overflowCount } = getDueItems(state.reviewQueue, todayKey, state.settings.dailyReviewLimit);

  const header = el("header", { className: "view__head" }, [
    el("h1", { text: `اليوم — ${formatDayKeyLong(todayKey)}` }),
    el("span", { className: "rule-fill" }),
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
    cardHead("تذكير بالنسخ الاحتياطي", { eyebrow: "حماية البيانات" }),
    el("p", {
      text: `مضى ${daysSinceBackup} يومًا منذ آخر نسخة احتياطية. بياناتك محفوظة في متصفحك فقط، والنسخ الاحتياطي حمايتك الوحيدة من فقدانها.`,
    }),
    el("div", { className: "actions" }, [
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
    return el("section", { className: "card card--hero" }, [
      cardHead(isFromToday ? "السبق: جلسة مفتوحة" : "جلسة متوقفة من يوم سابق", { eyebrow: "السبق" }),
      el("p", { className: "portion", text: formatPortion(openSession.portion, surahs) }),
      el("div", { className: "actions" }, [
        bigButton({ text: "استئناف", onClick: () => navigate("session"), size: "lg" }),
      ]),
    ]);
  }

  if (!hasAnySessions) {
    return el("section", { className: "card card--hero" }, [
      cardHead("أهلًا بك", { eyebrow: "البداية" }),
      el("p", {
        text: "هذا مساعدك الشخصي للحفظ. يقودك خلال جلسة حفظ متكاملة، ويذكّرك بمراجعة ما حفظته سابقًا في وقته.",
      }),
      el("div", { className: "actions" }, [
        bigButton({ text: "ابدأ أول جلسة", onClick: () => navigate("new-session"), size: "lg" }),
      ]),
    ]);
  }

  if (completedToday) {
    return el("section", { className: "card" }, [
      cardHead("أنجزت سبق اليوم", { eyebrow: "السبق" }),
      el("p", { className: "muted", text: "بقيت المراجعة وحدها — أو ابدأ سبقًا إضافيًا إن كان في العزم بقية." }),
      el("div", { className: "actions actions--inline" }, [
        bigButton({ text: "جلسة إضافية", onClick: () => navigate("new-session"), variant: "secondary" }),
      ]),
    ]);
  }

  return el("section", { className: "card card--hero" }, [
    cardHead("لم تبدأ سبقًا جديدًا اليوم", { eyebrow: "السبق" }),
    el("div", { className: "actions" }, [
      bigButton({ text: "بدء سبق جديد", onClick: () => navigate("new-session"), size: "lg" }),
    ]),
  ]);
}

function buildReviewCard({ dueItems, overflowCount, surahs, store, todayKey }) {
  const rows = dueItems.map((item) => {
    const isToday = item.dueDayKey === todayKey;
    return el("div", { className: "row" }, [
      el("span", { className: "row__label", text: formatPortion(item.portion, surahs) }),
      el("span", { className: `badge${isToday ? "" : " badge--danger"}`, text: isToday ? "اليوم" : "متأخرة" }),
    ]);
  });

  const children = [
    cardHead(`المراجعة المستحقة (${dueItems.length})`, { eyebrow: "المراجعة" }),
    el("div", {}, rows),
  ];

  if (dueItems.length > 0) {
    children.push(
      el("div", { className: "actions" }, [
        bigButton({ text: "ابدأ المراجعة", onClick: () => navigate("review"), size: "lg" }),
      ])
    );
  }

  if (overflowCount > 0) {
    children.push(el("p", { className: "muted", text: `+${overflowCount} أخرى مستحقة لاحقًا` }));
  }

  if (overflowCount >= OVERFLOW_ALERT_THRESHOLD) {
    children.push(
      el("div", { className: "actions actions--inline" }, [
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

  const fill = el("div", { className: "progress__fill" });
  fill.style.inlineSize = `${Math.max(percentage, 0.5)}%`;
  const bar = el(
    "div",
    {
      className: "progress",
      attrs: {
        role: "progressbar",
        "aria-label": "التقدّم في حفظ المصحف",
        "aria-valuemin": "0",
        "aria-valuemax": "100",
        "aria-valuenow": percentage.toFixed(1),
      },
    },
    [fill]
  );

  return el("section", { className: "card" }, [
    cardHead("التقدّم", { eyebrow: "الحصيلة" }),
    el("p", { text: `${memorized} آية من ${TOTAL_AYAHS} (${percentage.toFixed(1)}%)` }),
    bar,
    el("p", {
      className: "muted",
      text: estimate
        ? `الختم المتوقع (تقدير من معدّل آخر 30 يومًا): ${formatDayKeyLong(estimate)}`
        : "لا يوجد نشاط كافٍ حديثًا لتقدير تاريخ الختم",
    }),
  ]);
}
