/**
 * الإعدادات (القسم 12) وحماية البيانات (القسم 11): تصدير، استيراد بتحقق كامل
 * واستبدال لا دمج، وإعادة ضبط — كلها بتأكيد صريح ونسخ احتياطي تلقائي قبل أي
 * عملية خطرة.
 */

import { toDayKey } from "../../core/dates.js";
import { CURRENT_SCHEMA_VERSION, createInitialState } from "../../storage/migrations.js";
import { ImportValidationError, validateImportedState } from "../../storage/validation.js";
import { APP_VERSION } from "../../version.js";
import { formatDayKeyLong } from "../format.js";
import { el, clear } from "../components/dom.js";
import { bigButton } from "../components/big-button.js";
import { cardHead } from "../components/card.js";
import { downloadBackup } from "../download-backup.js";
import { navigate } from "../router.js";

/** @typedef {import('../store.js').AppContext} AppContext */

const THEME_LABELS = { light: "فاتح", dark: "داكن", system: "حسب النظام" };
const FONT_SCALE_LABELS = { sm: "صغير", md: "متوسط", lg: "كبير", xl: "كبير جدًا" };

/**
 * @param {HTMLElement} container
 * @param {AppContext} ctx
 */
export function render(container, ctx) {
  /** @type {{state: import('../../core/types.js').AppState, sessionsCount: number, reviewCount: number, mistakesCount: number} | null} */
  let pendingImport = null;
  let importError = "";
  let resetConfirming = false;
  let savedFlash = false;

  function paint() {
    clear(container);
    container.append(
      build(ctx, {
        pendingImport,
        importError,
        resetConfirming,
        savedFlash,
        setPendingImport: (v) => {
          pendingImport = v;
          paint();
        },
        setImportError: (v) => {
          importError = v;
          paint();
        },
        setResetConfirming: (v) => {
          resetConfirming = v;
          paint();
        },
        flashSaved: () => {
          savedFlash = true;
          paint();
        },
      })
    );
  }

  paint();
  return ctx.store.subscribe(paint);
}

function build(ctx, ui) {
  const { store } = ctx;
  const state = store.getState();

  return el("div", { className: "view view-settings" }, [
    buildPreferencesCard(ctx, state, ui),
    buildBackupCard(ctx, state, ui),
    buildAboutCard(),
  ]);
}

function buildPreferencesCard(ctx, state, ui) {
  const { store } = ctx;

  const themeSelect = /** @type {HTMLSelectElement} */ (
    el(
      "select",
      { className: "select", attrs: { id: "settings-theme" } },
      Object.entries(THEME_LABELS).map(([value, label]) => el("option", { text: label, attrs: { value } }))
    )
  );
  themeSelect.value = state.settings.theme;

  const fontScaleSelect = /** @type {HTMLSelectElement} */ (
    el(
      "select",
      { className: "select", attrs: { id: "settings-font-scale" } },
      Object.entries(FONT_SCALE_LABELS).map(([value, label]) => el("option", { text: label, attrs: { value } }))
    )
  );
  fontScaleSelect.value = state.settings.fontScale;

  const defaultRepsInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "input", attrs: { type: "number", min: "1", id: "settings-default-reps" } })
  );
  defaultRepsInput.value = String(state.settings.defaultReps);

  const dailyLimitInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "input", attrs: { type: "number", min: "1", id: "settings-daily-limit" } })
  );
  dailyLimitInput.value = String(state.settings.dailyReviewLimit);

  const backupReminderInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "checkbox", attrs: { type: "checkbox" } })
  );
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
    ui.flashSaved();
  }

  const children = [
    cardHead("الإعدادات", { eyebrow: "التفضيلات", level: "h1" }),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "المظهر", attrs: { for: "settings-theme" } }),
      themeSelect,
    ]),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "حجم الخط", attrs: { for: "settings-font-scale" } }),
      fontScaleSelect,
    ]),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "عدد التكرارات الافتراضي", attrs: { for: "settings-default-reps" } }),
      defaultRepsInput,
    ]),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "الحد الأقصى لمراجعات اليوم", attrs: { for: "settings-daily-limit" } }),
      dailyLimitInput,
    ]),
    el("div", { className: "field" }, [
      el("label", { className: "checkbox-row" }, [
        backupReminderInput,
        el("span", { text: "تذكير النسخ الاحتياطي كل 30 يومًا" }),
      ]),
    ]),
    el("div", { className: "actions actions--inline" }, [bigButton({ text: "حفظ", onClick: handleSave })]),
  ];

  if (ui.savedFlash) {
    children.push(el("p", { className: "muted", text: "تم الحفظ." }));
  }

  return el("section", { className: "card" }, children);
}

function buildBackupCard(ctx, state, ui) {
  const { store, surahs, now } = ctx;

  const lastBackupText = state.lastBackupAt
    ? `آخر نسخة احتياطية: ${formatDayKeyLong(toDayKey(new Date(state.lastBackupAt)))}`
    : "لم يُصدَّر أي نسخة احتياطية بعد.";

  const exportButton = bigButton({
    text: "تصدير نسخة احتياطية الآن",
    onClick: () => {
      const current = store.getState();
      const nowMs = now();
      downloadBackup(current, nowMs);
      store.setState({ ...current, lastBackupAt: nowMs });
    },
  });

  const fileInput = /** @type {HTMLInputElement} */ (
    el("input", { className: "input", attrs: { type: "file", accept: "application/json,.json", id: "settings-import-file" } })
  );

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    file
      .text()
      .then((text) => {
        const validated = validateImportedState(text, surahs);
        ui.setImportError("");
        ui.setPendingImport({
          state: validated,
          sessionsCount: validated.sessions.length,
          reviewCount: validated.reviewQueue.length,
          mistakesCount: validated.mistakes.length,
        });
      })
      .catch((error) => {
        ui.setPendingImport(null);
        ui.setImportError(
          error instanceof ImportValidationError ? error.message : "تعذّرت قراءة الملف."
        );
      })
      .finally(() => {
        fileInput.value = "";
      });
  });

  const children = [
    cardHead("النسخ الاحتياطي والبيانات", { eyebrow: "بياناتك" }),
    el("p", {
      text: "تُخزَّن كل بياناتك محليًا في متصفحك فقط (localStorage) ولا تغادر جهازك إطلاقًا. هذا التخزين قد يُمحى بتنظيف بيانات المتصفح أو التصفح الخفي أو إعادة ضبط الجهاز — النسخ الاحتياطي الدوري هو حمايتك الوحيدة.",
    }),
    el("p", { className: "muted", text: lastBackupText }),
    el("div", { className: "actions actions--inline" }, [exportButton]),
    el("div", { className: "field" }, [
      el("label", { className: "label", text: "استيراد نسخة احتياطية (يستبدل كل البيانات الحالية)", attrs: { for: "settings-import-file" } }),
      fileInput,
    ]),
  ];

  if (ui.importError) {
    children.push(el("p", { className: "error-text", attrs: { role: "alert" }, text: ui.importError }));
  }

  if (ui.pendingImport) {
    children.push(buildImportConfirm(ctx, ui));
  }

  children.push(el("hr", {}));
  children.push(buildResetSection(ctx, ui));

  return el("section", { className: "card" }, children);
}

function buildImportConfirm(ctx, ui) {
  const { store, now } = ctx;
  const { pendingImport } = ui;

  return el("div", { className: "card card--sunken" }, [
    el("h3", { text: "تأكيد استبدال البيانات" }),
    el("p", {
      text: `سيتم استبدال بياناتك الحالية بالكامل بمحتوى هذا الملف: ${pendingImport.sessionsCount} جلسة، ${pendingImport.reviewCount} عنصر مراجعة، ${pendingImport.mistakesCount} سجل خطأ. سيُصدَّر نسخة من حالتك الحالية تلقائيًا أولًا قبل الاستبدال.`,
    }),
    el("div", { className: "actions actions--inline" }, [
      bigButton({
        text: "تأكيد الاستبدال",
        variant: "danger",
        onClick: () => {
          const current = store.getState();
          downloadBackup(current, now());
          store.setState(pendingImport.state);
          ui.setPendingImport(null);
        },
      }),
      bigButton({ text: "إلغاء", variant: "secondary", onClick: () => ui.setPendingImport(null) }),
    ]),
  ]);
}

function buildResetSection(ctx, ui) {
  const { store, now } = ctx;

  if (!ui.resetConfirming) {
    return el("div", { className: "actions actions--inline" }, [
      bigButton({
        text: "إعادة ضبط التطبيق",
        variant: "danger",
        onClick: () => ui.setResetConfirming(true),
      }),
    ]);
  }

  return el("div", { className: "card card--sunken" }, [
    el("p", {
      className: "error-text",
      text: "سيُحذف كل شيء — جلساتك ومراجعاتك وأخطاؤك المسجّلة — بلا رجعة. سيُصدَّر نسخة احتياطية تلقائيًا أولًا.",
    }),
    el("div", { className: "actions actions--inline" }, [
      bigButton({
        text: "نعم، احذف كل شيء",
        variant: "danger",
        onClick: () => {
          const current = store.getState();
          const nowMs = now();
          downloadBackup(current, nowMs);
          store.setState(createInitialState(nowMs));
          ui.setResetConfirming(false);
          navigate("today");
        },
      }),
      bigButton({ text: "إلغاء", variant: "secondary", onClick: () => ui.setResetConfirming(false) }),
    ]),
  ]);
}

function buildAboutCard() {
  return el("section", { className: "card" }, [
    cardHead("حول", { eyebrow: "التطبيق" }),
    el("p", { className: "muted", text: `الإصدار: ${APP_VERSION} · schemaVersion: ${CURRENT_SCHEMA_VERSION}` }),
  ]);
}
