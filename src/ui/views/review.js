/**
 * مراجعة المستحقات (السبقي والمنزل، القسم 7). كل عنصر يُعرض بمرجعه فقط
 * («البقرة 12 — 15») — لا نص آيات ولا تفسير داخل التطبيق (القسم 9.2).
 */

import { toDayKey } from "../../core/dates.js";
import { applyReviewOutcome, getDueItems, needsReinforcement } from "../../core/scheduler.js";
import { formatPortion } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { navigate } from "../router.js";

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
  const { store, now } = ctx;
  const state = store.getState();
  const todayKey = toDayKey(new Date(now()));
  const { items } = getDueItems(state.reviewQueue, todayKey, state.settings.dailyReviewLimit);

  if (items.length === 0) {
    return el("div", { className: "view view-review" }, [
      el("section", { className: "card" }, [
        el("h1", { text: "لا مراجعات مستحقة الآن" }),
        el("div", { className: "step-counter__actions" }, [
          bigButton({ text: "العودة إلى اليوم", onClick: () => navigate("today") }),
        ]),
      ]),
    ]);
  }

  const rows = items.map((item) => buildReviewRow(item, ctx, todayKey));

  return el("div", { className: "view view-review" }, [
    el("header", { className: "card" }, [el("h1", { text: `المراجعة المستحقة (${items.length})` })]),
    ...rows,
  ]);
}

function buildReviewRow(item, ctx, todayKey) {
  const { store, surahs } = ctx;

  function applyOutcome(outcome) {
    const state = store.getState();
    const nextQueue = state.reviewQueue.map((i) => (i.id === item.id ? applyReviewOutcome(i, outcome, todayKey) : i));
    store.setState({ ...state, reviewQueue: nextQueue });
  }

  const children = [
    el("h2", { className: "portion-badge", text: formatPortion(item.portion, surahs) }),
    el("p", { className: "muted", text: item.tier === "sabqi" ? "سبقي" : item.tier === "manzil" ? "منزل" : "متخرّج" }),
  ];

  if (needsReinforcement(item)) {
    children.push(el("p", { className: "error-text", text: "يحتاج إعادة تثبيت (تكرر إخفاقه)" }));
  }

  children.push(
    el("div", { className: "step-counter__actions" }, [
      bigButton({ text: "نجحت", onClick: () => applyOutcome("passed") }),
      bigButton({ text: "لم أنجح", variant: "secondary", onClick: () => applyOutcome("failed") }),
    ])
  );

  return el("section", { className: "card" }, children);
}
