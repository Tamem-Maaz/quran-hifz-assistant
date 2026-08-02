/**
 * الإعدادات (القسم 12). نسخة أولية من المرحلة 2 — التصدير/الاستيراد/الضبط
 * يُبنى في المرحلة 3 (حماية البيانات).
 */

import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { navigate } from "../router.js";

/** @typedef {import('../store.js').AppContext} AppContext */

const THEME_LABELS = { light: "فاتح", dark: "داكن", system: "حسب النظام" };
const FONT_SCALE_LABELS = { sm: "صغير", md: "متوسط", lg: "كبير", xl: "كبير جدًا" };

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  const { store } = ctx;
  const state = store.getState();

  const themeSelect = /** @type {HTMLSelectElement} */ (
    el(
      "select",
      {},
      Object.entries(THEME_LABELS).map(([value, label]) => el("option", { text: label, attrs: { value } }))
    )
  );
  themeSelect.value = state.settings.theme;

  const fontScaleSelect = /** @type {HTMLSelectElement} */ (
    el(
      "select",
      {},
      Object.entries(FONT_SCALE_LABELS).map(([value, label]) => el("option", { text: label, attrs: { value } }))
    )
  );
  fontScaleSelect.value = state.settings.fontScale;

  const defaultRepsInput = /** @type {HTMLInputElement} */ (
    el("input", { attrs: { type: "number", min: "1" } })
  );
  defaultRepsInput.value = String(state.settings.defaultReps);

  const dailyLimitInput = /** @type {HTMLInputElement} */ (el("input", { attrs: { type: "number", min: "1" } }));
  dailyLimitInput.value = String(state.settings.dailyReviewLimit);

  const backupReminderInput = /** @type {HTMLInputElement} */ (el("input", { attrs: { type: "checkbox" } }));
  backupReminderInput.checked = state.settings.backupReminderEnabled;

  function handleSave() {
    const current = store.getState();
    store.setState({
      ...current,
      settings: {
        ...current.settings,
        theme: /** @type {'light'|'dark'|'system'} */ (themeSelect.value),
        fontScale: /** @type {'sm'|'md'|'lg'|'xl'} */ (fontScaleSelect.value),
        defaultReps: Math.max(1, Number(defaultRepsInput.value) || current.settings.defaultReps),
        dailyReviewLimit: Math.max(1, Number(dailyLimitInput.value) || current.settings.dailyReviewLimit),
        backupReminderEnabled: backupReminderInput.checked,
      },
    });
    navigate("today");
  }

  const view = el("div", { className: "view view-settings" }, [
    el("section", { className: "card" }, [
      el("h1", { text: "الإعدادات" }),
      el("div", { className: "field" }, [el("label", { text: "المظهر" }), themeSelect]),
      el("div", { className: "field" }, [el("label", { text: "حجم الخط" }), fontScaleSelect]),
      el("div", { className: "field" }, [el("label", { text: "عدد التكرارات الافتراضي" }), defaultRepsInput]),
      el("div", { className: "field" }, [el("label", { text: "الحد الأقصى لمراجعات اليوم" }), dailyLimitInput]),
      el("div", { className: "field" }, [
        el("label", {}, [backupReminderInput, el("span", { text: " تذكير النسخ الاحتياطي كل 30 يومًا" })]),
      ]),
      el("div", { className: "step-counter__actions" }, [bigButton({ text: "حفظ", onClick: handleSave })]),
    ]),
  ]);

  clear(container);
  container.append(view);
}
