/**
 * بدء جلسة جديدة: اختيار السورة (ببحث) ونطاق الآيات (المقطع لا يمتد عبر
 * سورتين — القسم 20)، مع زر اختياري لفتح الخريطة الذهنية للسورة المختارة.
 */

import { toDayKey } from "../../core/dates.js";
import { createSession, isValidPortion } from "../../core/session.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { cardHead } from "../components/card.js";
import { openImageLightbox } from "../components/lightbox.js";
import { navigate } from "../router.js";

/** @typedef {import('../store.js').AppContext} AppContext */

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  const { store, surahs, maps, now } = ctx;

  const searchInput = /** @type {HTMLInputElement} */ (
    el("input", {
      className: "input",
      attrs: { type: "search", id: "surah-search", placeholder: "اكتب اسم السورة أو رقمها", autocomplete: "off" },
    })
  );

  const searchStatus = el("p", { className: "field__hint", attrs: { "aria-live": "polite" } });

  const surahSelect = /** @type {HTMLSelectElement} */ (
    el("select", { className: "select", attrs: { id: "surah-select" } })
  );

  const mapButtonContainer = el("div", { className: "actions actions--inline" });

  /**
   * @param {typeof surahs} filtered
   */
  function renderSurahOptions(filtered) {
    clear(surahSelect);
    for (const s of filtered) {
      surahSelect.append(
        el("option", { text: `${s.id}. ${s.name} (${s.ayahCount} آية)`, attrs: { value: String(s.id) } })
      );
    }
    if (filtered.length === 0) {
      searchStatus.textContent = "لا نتائج مطابقة";
    } else if (filtered.length === surahs.length) {
      searchStatus.textContent = "";
    } else {
      searchStatus.textContent = `${filtered.length} نتيجة`;
    }
  }

  function updateMapButton() {
    clear(mapButtonContainer);
    const currentId = Number(surahSelect.value);
    const map = maps.find((m) => m.surah === currentId);
    if (!map) return;

    const surah = surahs.find((s) => s.id === currentId);
    const name = surah ? surah.name : `سورة ${currentId}`;
    const mapButton = bigButton({
      text: "فتح الخريطة الذهنية",
      variant: "secondary",
      onClick: () =>
        openImageLightbox({
          src: `docs/maps/${encodeURIComponent(map.fileName)}`,
          alt: `الخريطة الذهنية لسورة ${name}`,
          triggerElement: mapButton,
        }),
    });
    mapButtonContainer.append(mapButton);
  }

  renderSurahOptions(surahs);
  updateMapButton();

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim();
    const filtered = term ? surahs.filter((s) => s.name.includes(term) || String(s.id).includes(term)) : surahs;
    renderSurahOptions(filtered);
    updateMapButton();
  });

  surahSelect.addEventListener("change", updateMapButton);

  const fromInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "input", attrs: { id: "from-ayah", type: "number", min: "1", inputmode: "numeric" } })
  );
  fromInput.value = "1";

  const toInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "input", attrs: { id: "to-ayah", type: "number", min: "1", inputmode: "numeric" } })
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

  const view = el("div", { className: "view view-new-session" }, [
    el("section", { className: "card card--hero" }, [
      cardHead("بدء سبق جديد", { eyebrow: "السبق", level: "h1" }),
      el("p", { className: "muted", text: "المقطع لا يمتدّ عبر سورتين — اختر السورة ثم حدّ آياتها." }),
      el("div", { className: "field" }, [
        el("label", { className: "label", text: "ابحث عن سورة", attrs: { for: "surah-search" } }),
        searchInput,
        searchStatus,
      ]),
      el("div", { className: "field" }, [
        el("label", { className: "label", text: "السورة", attrs: { for: "surah-select" } }),
        surahSelect,
      ]),
      mapButtonContainer,
      el("div", { className: "ayah-range" }, [
        el("div", { className: "field" }, [
          el("label", { className: "label", text: "من آية", attrs: { for: "from-ayah" } }),
          fromInput,
        ]),
        el("div", { className: "field" }, [
          el("label", { className: "label", text: "إلى آية", attrs: { for: "to-ayah" } }),
          toInput,
        ]),
      ]),
      errorBox,
      el("div", { className: "actions" }, [
        bigButton({ text: "ابدأ الجلسة", onClick: handleStart, size: "lg" }),
      ]),
    ]),
  ]);

  clear(container);
  container.append(view);
}
