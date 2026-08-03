/**
 * الإحصائيات (القسم 10): تُشتق دائمًا من sessions/reviewQueue/mistakes عند
 * العرض — لا عدّادات مخزّنة (القسم 10.1). التتابع لا يتحوّل إلى ضغط نفسي
 * (القسم 10.3): رسالة محايدة عند الانقطاع، والأطول يُعرض دائمًا بجانب الحالي.
 */

import { toDayKey } from "../../core/dates.js";
import {
  buildActivityHeatmap,
  computeStepTotals,
  computeStreak,
  countCompletedSessions,
  topMistakeSpots,
  totalAyahsMemorized,
} from "../../core/statistics.js";
import { computeProgressPercentage, estimateCompletionDayKey, TOTAL_AYAHS } from "../../core/progress.js";
import { formatDayKeyLong } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { activityHeatmap } from "../components/heatmap.js";

/** @typedef {import('../store.js').AppContext} AppContext */

const STEP_LABELS = {
  listeningBefore: "مرات الاستماع (قبل)",
  tafsir: "مرات قراءة التفسير",
  listeningAfter: "مرات الاستماع (بعد)",
  memorizationReps: "مرات التكرار",
  review: "مرات المراجعة (قراءة دون نظر)",
  recitation: "مرات التسميع",
};

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

  return el("div", { className: "view view-stats" }, [
    el("h1", { text: "الإحصائيات" }),
    buildStreakCard(state, todayKey),
    buildProgressCard(state, todayKey),
    buildGoalCard(ctx, state),
    buildStepTotalsCard(state),
    buildMistakesCard(state, surahs),
    buildHeatmapCard(state, todayKey),
  ]);
}

function buildStreakCard(state, todayKey) {
  const { current, longest } = computeStreak(state.sessions, state.reviewQueue, todayKey);

  const message =
    current === 0 && longest > 0
      ? "انقطع تتابعك الحالي — لا بأس، يمكنك البدء من جديد اليوم. أطول تتابع سابق محفوظ لك دائمًا."
      : current === 0
        ? "ابدأ تتابعك اليوم بسبق جديد أو مراجعة."
        : "استمر — كل يوم نشاط (سبق أو مراجعة) يحافظ على التتابع.";

  return el("section", { className: "card" }, [
    el("h2", { text: "التتابع" }),
    el("div", { className: "stat-grid" }, [
      el("div", { className: "stat-tile" }, [
        el("span", { className: "stat-tile__value", text: String(current) }),
        el("span", { className: "muted", text: "الحالي" }),
      ]),
      el("div", { className: "stat-tile" }, [
        el("span", { className: "stat-tile__value", text: String(longest) }),
        el("span", { className: "muted", text: "الأطول" }),
      ]),
    ]),
    el("p", { className: "muted", text: message }),
  ]);
}

function buildProgressCard(state, todayKey) {
  const memorized = totalAyahsMemorized(state.sessions);
  const percentage = computeProgressPercentage(memorized);
  const estimate = estimateCompletionDayKey(state.sessions, todayKey);

  return el("section", { className: "card" }, [
    el("h2", { text: "التقدّم" }),
    el("div", { className: "stat-grid" }, [
      el("div", { className: "stat-tile" }, [
        el("span", { className: "stat-tile__value", text: String(memorized) }),
        el("span", { className: "muted", text: `آية من ${TOTAL_AYAHS}` }),
      ]),
      el("div", { className: "stat-tile" }, [
        el("span", { className: "stat-tile__value", text: `${percentage.toFixed(1)}%` }),
        el("span", { className: "muted", text: "من كتاب الله" }),
      ]),
    ]),
    el("p", {
      className: "muted",
      text: estimate
        ? `الختم المتوقع (تقدير من معدّل آخر 30 يومًا): ${formatDayKeyLong(estimate)}`
        : "لا يوجد نشاط كافٍ حديثًا لتقدير تاريخ الختم",
    }),
  ]);
}

function buildGoalCard(ctx, state) {
  const { store, now } = ctx;
  const goal = state.goal;

  if (goal) {
    return el("section", { className: "card" }, [
      el("h2", { text: "الهدف اليومي" }),
      el("p", { text: `${goal.ayahsPerDay} آية في اليوم` }),
      el("div", { className: "step-counter__actions" }, [
        bigButton({
          text: "إلغاء الهدف",
          variant: "secondary",
          onClick: () => store.setState({ ...store.getState(), goal: null }),
        }),
      ]),
    ]);
  }

  const input = /** @type {HTMLInputElement} */ (
    el("input", { attrs: { type: "number", min: "1", inputmode: "numeric", id: "goal-ayahs-per-day" } })
  );
  input.value = "5";

  return el("section", { className: "card" }, [
    el("h2", { text: "الهدف اليومي" }),
    el("p", { className: "muted", text: "اختياري — عدد الآيات التي تنوي حفظها يوميًا." }),
    el("div", { className: "field" }, [
      el("label", { text: "آيات في اليوم", attrs: { for: "goal-ayahs-per-day" } }),
      input,
    ]),
    el("div", { className: "step-counter__actions" }, [
      bigButton({
        text: "تعيين الهدف",
        onClick: () => {
          const ayahsPerDay = Math.max(1, Number(input.value) || 1);
          const current = store.getState();
          store.setState({ ...current, goal: { ayahsPerDay, startedAt: now() } });
        },
      }),
    ]),
  ]);
}

function buildStepTotalsCard(state) {
  const totals = computeStepTotals(state.sessions);

  return el("section", { className: "card" }, [
    el("h2", { text: "إجماليات الخطوات" }),
    el("p", { text: `الجلسات المكتملة: ${countCompletedSessions(state.sessions)}` }),
    ...Object.entries(STEP_LABELS).map(([key, label]) =>
      el("p", { className: "muted", text: `${label}: ${totals[key]}` })
    ),
  ]);
}

function buildMistakesCard(state, surahs) {
  const top = topMistakeSpots(state.mistakes, 10);

  if (top.length === 0) {
    return el("section", { className: "card" }, [
      el("h2", { text: "أكثر المواضع تعثّرًا" }),
      el("p", { className: "muted", text: "لا أخطاء مسجّلة بعد." }),
    ]);
  }

  const rows = top.map((spot) => {
    const surah = surahs.find((s) => s.id === spot.surah);
    const name = surah ? surah.name : `سورة ${spot.surah}`;
    return el("div", { className: "mistake-spot-row" }, [
      el("span", { text: `${name} ${spot.ayah}` }),
      el("span", { className: "muted", text: `${spot.count} مرة` }),
    ]);
  });

  return el("section", { className: "card" }, [el("h2", { text: "أكثر المواضع تعثّرًا" }), ...rows]);
}

function buildHeatmapCard(state, todayKey) {
  const days = buildActivityHeatmap(state.sessions, state.reviewQueue, todayKey, 365);
  return el("section", { className: "card" }, [
    el("h2", { text: "خريطة النشاط (آخر 365 يومًا)" }),
    activityHeatmap(days),
  ]);
}
