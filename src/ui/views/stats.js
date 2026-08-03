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
import { cardHead } from "../components/card.js";
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
    el("header", { className: "view__head" }, [
      el("h1", { text: "الإحصائيات" }),
      el("span", { className: "rule-fill" }),
    ]),
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
    cardHead("التتابع", { eyebrow: "الاستمرار" }),
    el("div", { className: "stat-grid" }, [
      statTile(String(current), "يومًا متتاليًا", "gold"),
      statTile(String(longest), "أطول تتابع"),
    ]),
    el("p", { className: "muted", text: message }),
  ]);
}

/**
 * بلاطة إحصائية: رقم كبير وتسمية تحته. التسمية تصف الوحدة لا تعيد العنوان.
 * @param {string} value
 * @param {string} label
 * @param {'gold'|'accent'} [tone]
 * @returns {HTMLElement}
 */
function statTile(value, label, tone) {
  return el("div", { className: `stat${tone ? ` stat--${tone}` : ""}` }, [
    el("span", { className: "stat__value", attrs: { dir: "ltr" }, text: value }),
    el("span", { className: "stat__label", text: label }),
  ]);
}

function buildProgressCard(state, todayKey) {
  const memorized = totalAyahsMemorized(state.sessions);
  const percentage = computeProgressPercentage(memorized);
  const estimate = estimateCompletionDayKey(state.sessions, todayKey);

  return el("section", { className: "card" }, [
    cardHead("التقدّم", { eyebrow: "الحصيلة" }),
    el("div", { className: "stat-grid" }, [
      statTile(String(memorized), `آية من ${TOTAL_AYAHS}`, "accent"),
      statTile(`${percentage.toFixed(1)}%`, "من كتاب الله"),
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
      cardHead("الهدف اليومي", { eyebrow: "الالتزام" }),
      el("p", { text: `${goal.ayahsPerDay} آية في اليوم` }),
      el("div", { className: "actions actions--inline" }, [
        bigButton({
          text: "إلغاء الهدف",
          variant: "secondary",
          onClick: () => store.setState({ ...store.getState(), goal: null }),
        }),
      ]),
    ]);
  }

  const input = /** @type {HTMLInputElement} */ (
    el("input", {
      className: "input",
      attrs: { type: "number", min: "1", inputmode: "numeric", id: "goal-ayahs-per-day" },
    })
  );
  input.value = "5";

  return el("section", { className: "card" }, [
    cardHead("الهدف اليومي", { eyebrow: "الالتزام" }),
    el("p", { className: "muted", text: "اختياري — عدد الآيات التي تنوي حفظها يوميًا." }),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "آيات في اليوم", attrs: { for: "goal-ayahs-per-day" } }),
      input,
    ]),
    el("div", { className: "actions actions--inline" }, [
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
    cardHead("إجماليات الخطوات", { eyebrow: "العمل المبذول" }),
    el("p", { text: `الجلسات المكتملة: ${countCompletedSessions(state.sessions)}` }),
    el(
      "div",
      {},
      Object.entries(STEP_LABELS).map(([key, label]) =>
        el("div", { className: "row" }, [
          el("span", { className: "row__label", text: label }),
          el("span", { className: "num muted", attrs: { dir: "ltr" }, text: String(totals[key]) }),
        ])
      )
    ),
  ]);
}

function buildMistakesCard(state, surahs) {
  const top = topMistakeSpots(state.mistakes, 10);

  if (top.length === 0) {
    return el("section", { className: "card" }, [
      cardHead("أكثر المواضع تعثّرًا", { eyebrow: "ما يحتاج تثبيتًا" }),
      el("p", { className: "muted", text: "لا أخطاء مسجّلة بعد." }),
    ]);
  }

  const rows = top.map((spot) => {
    const surah = surahs.find((s) => s.id === spot.surah);
    const name = surah ? surah.name : `سورة ${spot.surah}`;
    return el("div", { className: "row" }, [
      el("span", { className: "row__label", text: `${name} ${spot.ayah}` }),
      el("span", { className: "badge", text: `${spot.count} مرة` }),
    ]);
  });

  return el("section", { className: "card" }, [
    cardHead("أكثر المواضع تعثّرًا", { eyebrow: "ما يحتاج تثبيتًا" }),
    el("div", {}, rows),
  ]);
}

function buildHeatmapCard(state, todayKey) {
  const days = buildActivityHeatmap(state.sessions, state.reviewQueue, todayKey, 365);
  return el("section", { className: "card" }, [
    cardHead("خريطة النشاط (آخر 365 يومًا)", { eyebrow: "السنة كاملة" }),
    activityHeatmap(days),
  ]);
}
