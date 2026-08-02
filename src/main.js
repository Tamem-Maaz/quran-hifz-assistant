/**
 * نقطة الدخول: تحميل بيانات السور، تهيئة المخزن، وربط التوجيه بالشاشات (المرحلة 2).
 */

import { createRepository } from "./storage/repository.js";
import { createStore } from "./ui/store.js";
import { startRouter, navigate } from "./ui/router.js";
import { el, clear } from "./ui/components/dom.js";
import * as todayView from "./ui/views/today.js";
import * as newSessionView from "./ui/views/new-session.js";
import * as sessionView from "./ui/views/session.js";
import * as reviewView from "./ui/views/review.js";
import * as settingsView from "./ui/views/settings.js";

const VIEWS = {
  today: todayView,
  "new-session": newSessionView,
  session: sessionView,
  review: reviewView,
  settings: settingsView,
};

const NAV_LINKS = [
  { route: /** @type {const} */ ("today"), label: "اليوم" },
  { route: /** @type {const} */ ("review"), label: "المراجعة" },
  { route: /** @type {const} */ ("settings"), label: "الإعدادات" },
];

async function main() {
  const app = document.getElementById("app");
  if (!app) throw new Error("عنصر #app غير موجود في index.html");

  const surahsResponse = await fetch(new URL("./data/surahs.json", import.meta.url));
  const surahs = await surahsResponse.json();

  const repository = createRepository();
  const store = createStore(repository, Date.now());

  applyTheme(store.getState().settings);
  store.subscribe((state) => applyTheme(state.settings));

  const viewContainer = el("div", { className: "view-container" });
  app.append(buildNav(), viewContainer);

  const ctx = { store, surahs, now: () => Date.now() };
  /** @type {(() => void) | null} */
  let cleanup = null;

  startRouter((route) => {
    if (cleanup) cleanup();
    const result = VIEWS[route].render(viewContainer, ctx);
    cleanup = typeof result === "function" ? result : null;
  });
}

/**
 * @param {import('./core/types.js').Settings} settings
 */
function applyTheme(settings) {
  const root = document.documentElement;
  if (settings.theme === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = settings.theme;
  }
  root.dataset.fontScale = settings.fontScale;
}

function buildNav() {
  return el(
    "nav",
    { className: "app-nav" },
    NAV_LINKS.map((link) =>
      el("button", {
        className: "nav-btn",
        text: link.label,
        attrs: { type: "button" },
        onClick: () => navigate(link.route),
      })
    )
  );
}

main().catch((error) => {
  console.error(error);
  const app = document.getElementById("app");
  if (app) {
    clear(app);
    app.append(el("p", { className: "error-text", text: "تعذّر تشغيل التطبيق. حاول إعادة تحميل الصفحة." }));
  }
});
