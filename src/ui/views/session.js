/**
 * جلسة الحفظ بمراحلها الست (القسم 6) + الاستئناف (القسم 6.1). المرحلة الحالية
 * تُشتق دائمًا من `currentStageKey(session)` — هذا وحده ما يجعل الاستئناف يعمل
 * بلا أي حالة إضافية محفوظة في الواجهة.
 */

import { toDayKey } from "../../core/dates.js";
import {
  abandonSession,
  completeRecitation,
  completeSession,
  currentStageKey,
  decrementMemorizationRep,
  findOpenSession,
  incrementMemorizationRep,
  incrementStep,
  recordMistake,
  STAGE_ORDER,
} from "../../core/session.js";
import { createReviewItem } from "../../core/scheduler.js";
import { formatPortion } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { cardHead } from "../components/card.js";
import { stepCounter } from "../components/step-counter.js";
import { navigate } from "../router.js";

/** @typedef {import('../store.js').AppContext} AppContext */

const STAGE_META = {
  listeningBefore: { title: "الاستماع", actionLabel: "استمعت" },
  tafsir: { title: "قراءة التفسير", actionLabel: "قرأت التفسير" },
  listeningAfter: { title: "الاستماع مرة أخرى", actionLabel: "استمعت" },
  memorization: { title: "الحفظ بالتكرار", actionLabel: "كررت مرة" },
  review: { title: "المراجعة (قراءة دون نظر)", actionLabel: "راجعت" },
  recitation: { title: "التسميع", actionLabel: "" },
};

/**
 * موضع المرحلة من مراحل السبق الست. ترقيم مبرَّر هنا لأن المراحل تسلسل
 * حقيقي لا تصنيفًا: معرفة «الرابعة من ست» تخبرك كم بقي من الجلسة.
 * @param {typeof STAGE_ORDER[number]} stageKey
 * @returns {string}
 */
function stageEyebrow(stageKey) {
  const index = STAGE_ORDER.indexOf(stageKey);
  return `المرحلة ${index + 1} من ${STAGE_ORDER.length}`;
}

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  function paint() {
    const state = ctx.store.getState();
    const session = findOpenSession(state.sessions);
    if (!session) {
      navigate("today");
      return;
    }
    clear(container);
    container.append(build(session, ctx));
  }
  paint();
  return ctx.store.subscribe(paint);
}

function updateSession(ctx, sessionId, updater) {
  const state = ctx.store.getState();
  const nextSessions = state.sessions.map((s) => (s.id === sessionId ? updater(s) : s));
  ctx.store.setState({ ...state, sessions: nextSessions });
}

function build(session, ctx) {
  const { surahs } = ctx;
  const stage = currentStageKey(session);

  // الرأس يبقى ثابتًا عبر المراحل الست: ما الذي أحفظه (المقطع) أولًا، ثم
  // مخرج آمن. عنوان الشاشة نفسه أصغر من المقطع عمدًا — المقطع هو الخبر.
  const header = el("header", { className: "card card--hero" }, [
    el("div", { className: "card__eyebrow" }, [
      el("p", { className: "eyebrow", text: "جلسة الحفظ" }),
      el("h1", { className: "portion", text: formatPortion(session.portion, surahs) }),
    ]),
    el("div", { className: "actions actions--inline" }, [
      bigButton({
        text: "إنهاء الجلسة الآن (تُحفظ كمتوقفة)",
        variant: "danger",
        onClick: () => {
          updateSession(ctx, session.id, (s) => abandonSession(s));
          navigate("today");
        },
      }),
    ]),
  ]);

  if (stage === null) {
    return el("div", { className: "view view-session" }, [header, buildFinish(session, ctx)]);
  }

  if (stage === "memorization") {
    return el("div", { className: "view view-session" }, [header, buildMemorization(session, ctx)]);
  }

  if (stage === "recitation") {
    return el("div", { className: "view view-session" }, [header, buildRecitation(session, ctx)]);
  }

  return el("div", { className: "view view-session" }, [header, buildSimpleStage(session, ctx, stage)]);
}

function buildSimpleStage(session, ctx, stageKey) {
  const meta = STAGE_META[stageKey];
  const step = session.steps[stageKey];

  return el("section", { className: "card" }, [
    cardHead(meta.title, { eyebrow: stageEyebrow(stageKey) }),
    stepCounter({
      count: step.count,
      incrementLabel: meta.actionLabel,
      onIncrement: () => updateSession(ctx, session.id, (s) => incrementStep(s, stageKey, ctx.now())),
    }),
  ]);
}

function buildMemorization(session, ctx) {
  const step = session.steps.memorization;
  return el("section", { className: "card" }, [
    cardHead(STAGE_META.memorization.title, { eyebrow: stageEyebrow("memorization") }),
    stepCounter({
      count: step.doneReps,
      target: step.targetReps,
      incrementLabel: STAGE_META.memorization.actionLabel,
      progressLabel: "تقدّم الحفظ بالتكرار",
      onIncrement: () => updateSession(ctx, session.id, (s) => incrementMemorizationRep(s, ctx.now())),
      onDecrement: () => updateSession(ctx, session.id, (s) => decrementMemorizationRep(s)),
    }),
  ]);
}

function buildRecitation(session, ctx) {
  const { portion } = session;
  const ayahNumbers = [];
  for (let a = portion.fromAyah; a <= portion.toAyah; a++) ayahNumbers.push(a);

  const state = ctx.store.getState();
  const mistakeCount = (ayah) =>
    state.mistakes.filter((m) => m.surah === portion.surah && m.ayah === ayah).length;

  const ayahRows = ayahNumbers.map((ayah) => {
    const count = mistakeCount(ayah);
    const label = el("span", { className: "row__label" }, [el("span", { text: `آية ${ayah}` })]);
    if (count > 0) {
      label.append(el("span", { className: "badge badge--danger", text: `${count} خطأ` }));
    }
    return el("div", { className: "row" }, [
      label,
      bigButton({
        text: "أخطأت هنا",
        variant: "secondary",
        onClick: () => {
          const s = ctx.store.getState();
          const entry = recordMistake(session, portion.surah, ayah, ctx.now(), "", crypto.randomUUID());
          ctx.store.setState({ ...s, mistakes: [...s.mistakes, entry] });
        },
      }),
    ]);
  });

  const listenerInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "input", attrs: { type: "text", id: "recitation-listener-name" } })
  );
  const notesInput = /** @type {HTMLTextAreaElement} */ (
    el("textarea", { className: "textarea", attrs: { rows: "3", id: "recitation-notes" } })
  );

  return el("section", { className: "card" }, [
    cardHead(STAGE_META.recitation.title, { eyebrow: stageEyebrow("recitation") }),
    el("p", { className: "muted", text: "سجّل موضع كل تعثّر أثناء التسميع — هذه المواضع هي ما ستُراجعه لاحقًا." }),
    el("div", {}, ayahRows),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "اسم المسمِّع (اختياري)", attrs: { for: "recitation-listener-name" } }),
      listenerInput,
    ]),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "ملاحظات (اختياري)", attrs: { for: "recitation-notes" } }),
      notesInput,
    ]),
    el("div", { className: "actions" }, [
      bigButton({
        text: "أنهيت التسميع",
        size: "lg",
        onClick: () =>
          updateSession(ctx, session.id, (s) =>
            completeRecitation(s, ctx.now(), listenerInput.value.trim(), notesInput.value.trim())
          ),
      }),
    ]),
  ]);
}

/**
 * طلب تخزين دائم عند أول جلسة مكتملة (القسم 11.1) — يقلّل احتمال حذف المتصفح
 * التلقائي لبيانات مواقع غير مستخدمة لفترة طويلة. الرفض يُتجاهل بصمت.
 */
function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    navigator.storage.persist().catch(() => {});
  }
}

function buildFinish(session, ctx) {
  return el("section", { className: "card card--hero" }, [
    cardHead("أحسنت! اكتملت كل مراحل السبق", { eyebrow: `تمّت المراحل الست` }),
    el("p", {
      className: "muted",
      text: "بإنهاء الجلسة يدخل هذا المقطع في جدول المراجعة، ويعود إليك في موعده.",
    }),
    el("div", { className: "actions" }, [
      bigButton({
        text: "إنهاء الجلسة وجدولة المراجعة",
        size: "lg",
        onClick: () => {
          const now = ctx.now();
          const todayKey = toDayKey(new Date(now));
          const state = ctx.store.getState();
          const isFirstEverCompletion = !state.sessions.some((s) => s.status === "completed");
          const reviewItem = createReviewItem(
            { id: crypto.randomUUID(), portion: session.portion, sourceSessionId: session.id },
            todayKey
          );
          const nextSessions = state.sessions.map((s) => (s.id === session.id ? completeSession(s, now) : s));
          ctx.store.setState({
            ...state,
            sessions: nextSessions,
            reviewQueue: [...state.reviewQueue, reviewItem],
          });
          if (isFirstEverCompletion) requestPersistentStorage();
          navigate("today");
        },
      }),
    ]),
  ]);
}

