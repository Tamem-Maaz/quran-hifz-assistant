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
} from "../../core/session.js";
import { createReviewItem } from "../../core/scheduler.js";
import { formatPortion } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
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

  const header = el("header", { className: "card" }, [
    el("h1", { text: "جلسة الحفظ" }),
    el("p", { className: "portion-badge", text: formatPortion(session.portion, surahs) }),
    el("div", { className: "step-counter__actions" }, [
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
    el("h2", { text: meta.title }),
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
    el("h2", { text: STAGE_META.memorization.title }),
    stepCounter({
      count: step.doneReps,
      target: step.targetReps,
      incrementLabel: STAGE_META.memorization.actionLabel,
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
    const countLabel = el("span", { className: "muted", text: mistakeCount(ayah) > 0 ? `(${mistakeCount(ayah)})` : "" });
    return el("div", { className: "mistake-row" }, [
      el("span", { text: `آية ${ayah}` }),
      countLabel,
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

  const listenerInput = /** @type {HTMLInputElement} */ (el("input", { attrs: { type: "text" } }));
  const notesInput = /** @type {HTMLTextAreaElement} */ (el("textarea", { attrs: { rows: "3" } }));

  return el("section", { className: "card" }, [
    el("h2", { text: STAGE_META.recitation.title }),
    ...ayahRows,
    el("div", { className: "field" }, [el("label", { text: "اسم المسمِّع (اختياري)" }), listenerInput]),
    el("div", { className: "field" }, [el("label", { text: "ملاحظات (اختياري)" }), notesInput]),
    el("div", { className: "step-counter__actions" }, [
      bigButton({
        text: "أنهيت التسميع",
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
  return el("section", { className: "card" }, [
    el("h2", { text: "أحسنت! اكتملت كل مراحل السبق" }),
    el("div", { className: "step-counter__actions" }, [
      bigButton({
        text: "إنهاء الجلسة وجدولة المراجعة",
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

