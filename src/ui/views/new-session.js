/**
 * بدء جلسة جديدة: اختيار السورة ونطاق الآيات (المقطع لا يمتد عبر سورتين — القسم 20).
 */

import { toDayKey } from "../../core/dates.js";
import { createSession, isValidPortion } from "../../core/session.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { navigate } from "../router.js";

/** @typedef {import('../store.js').AppContext} AppContext */

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  const { store, surahs, now } = ctx;

  const surahSelect = /** @type {HTMLSelectElement} */ (
    el(
      "select",
      { attrs: { id: "surah-select" } },
      surahs.map((s) => el("option", { text: `${s.id}. ${s.name} (${s.ayahCount} آية)`, attrs: { value: String(s.id) } }))
    )
  );

  const fromInput = /** @type {HTMLInputElement} */ (
    el("input", { attrs: { id: "from-ayah", type: "number", min: "1", inputmode: "numeric" } })
  );
  fromInput.value = "1";

  const toInput = /** @type {HTMLInputElement} */ (
    el("input", { attrs: { id: "to-ayah", type: "number", min: "1", inputmode: "numeric" } })
  );
  toInput.value = "1";

  const errorBox = el("p", { className: "error-text", attrs: { role: "alert" } });

  function handleStart() {
    errorBox.textContent = "";

    const surah = Number(surahSelect.value);
    const fromAyah = Number(fromInput.value);
    const toAyah = Number(toInput.value);

    if (!isValidPortion(surah, fromAyah, toAyah, surahs)) {
      errorBox.textContent = "المقطع غير صالح — تحقّق من نطاق الآيات داخل حدود السورة.";
      return;
    }

    const state = store.getState();
    const nowMs = now();
    const session = createSession({
      id: crypto.randomUUID(),
      portion: { surah, fromAyah, toAyah },
      dayKey: toDayKey(new Date(nowMs)),
      now: nowMs,
      defaultReps: state.settings.defaultReps,
    });

    store.setState({ ...state, sessions: [...state.sessions, session] });
    navigate("session");
  }

  const view = el("div", { className: "card" }, [
    el("h2", { text: "بدء سبق جديد" }),
    el("div", { className: "field" }, [el("label", { text: "السورة", attrs: { for: "surah-select" } }), surahSelect]),
    el("div", { className: "field" }, [el("label", { text: "من آية", attrs: { for: "from-ayah" } }), fromInput]),
    el("div", { className: "field" }, [el("label", { text: "إلى آية", attrs: { for: "to-ayah" } }), toInput]),
    errorBox,
    el("div", { className: "step-counter__actions" }, [bigButton({ text: "ابدأ الجلسة", onClick: handleStart })]),
  ]);

  clear(container);
  container.append(view);
}
