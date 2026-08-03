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
        el("div", { className: "card__head" }, [
          el("h1", { text: "لا مراجعات مستحقة الآن" }),
          el("span", { className: "rule-fill" }),
        ]),
        el("p", { className: "muted", text: "كل ما جدولته أُنجز في وقته. عُد حين يحين موعد المقطع التالي." }),
        el("div", { className: "actions actions--inline" }, [
          bigButton({ text: "العودة إلى اليوم", onClick: () => navigate("today"), variant: "secondary" }),
        ]),
      ]),
    ]);
  }

  const rows = items.map((item) => buildReviewRow(item, ctx, todayKey));

  return el("div", { className: "view view-review" }, [
    el("header", { className: "view__head" }, [
      el("h1", { text: `المراجعة المستحقة (${items.length})` }),
      el("span", { className: "rule-fill" }),
    ]),
    ...rows,
  ]);
}

const TIER_LABELS = { sabqi: "سبقي", manzil: "منزل", graduated: "متخرّج" };

function buildReviewRow(item, ctx, todayKey) {
  const { store, surahs } = ctx;

  function applyOutcome(outcome) {
    const state = store.getState();
    const nextQueue = state.reviewQueue.map((i) => (i.id === item.id ? applyReviewOutcome(i, outcome, todayKey) : i));
    store.setState({ ...state, reviewQueue: nextQueue });
  }

  const meta = el("div", { className: "card__eyebrow" }, [
    el("p", { className: "muted", text: TIER_LABELS[item.tier] ?? item.tier }),
    el("h2", { className: "portion", text: formatPortion(item.portion, surahs) }),
  ]);

  const children = [meta];

  if (needsReinforcement(item)) {
    children.push(
      el("p", { className: "badge badge--danger", text: "يحتاج إعادة تثبيت (تكرر إخفاقه)" })
    );
  }

  children.push(
    el("div", { className: "actions" }, [
      bigButton({ text: "نجحت", onClick: () => applyOutcome("passed"), size: "lg" }),
      bigButton({ text: "لم أنجح", variant: "secondary", size: "lg", onClick: () => applyOutcome("failed") }),
    ])
  );

  return el("section", { className: "card" }, children);
}
