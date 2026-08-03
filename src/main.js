/**
 * نقطة الدخول: تحميل بيانات السور، تهيئة المخزن، وربط التوجيه بالشاشات (المرحلة 2).
 */

import { createRepository } from "./storage/repository.js";
import { createStore } from "./ui/store.js";
import { startRouter, navigate } from "./ui/router.js";
import { el, clear } from "./ui/components/dom.js";
import { brandMark, navIcon } from "./ui/components/icons.js";
import * as todayView from "./ui/views/today.js";
import * as newSessionView from "./ui/views/new-session.js";
import * as sessionView from "./ui/views/session.js";
import * as reviewView from "./ui/views/review.js";
import * as statsView from "./ui/views/stats.js";
import * as mapsView from "./ui/views/maps.js";
import * as settingsView from "./ui/views/settings.js";

const VIEWS = {
  today: todayView,
  "new-session": newSessionView,
  session: sessionView,
  review: reviewView,
  stats: statsView,
  maps: mapsView,
  settings: settingsView,
};

const NAV_LINKS = [
  { route: /** @type {const} */ ("today"), label: "اليوم", icon: /** @type {const} */ ("today") },
  { route: /** @type {const} */ ("review"), label: "المراجعة", icon: /** @type {const} */ ("review") },
  { route: /** @type {const} */ ("stats"), label: "الإحصائيات", icon: /** @type {const} */ ("stats") },
  { route: /** @type {const} */ ("maps"), label: "الخرائط", icon: /** @type {const} */ ("maps") },
  { route: /** @type {const} */ ("settings"), label: "الإعدادات", icon: /** @type {const} */ ("settings") },
];

async function main() {
  const app = document.getElementById("app");
  if (!app) throw new Error("عنصر #app غير موجود في index.html");

  const [surahsResponse, mapsResponse] = await Promise.all([
    fetch(new URL("./data/surahs.json", import.meta.url)),
    fetch(new URL("./data/maps.json", import.meta.url)),
  ]);
  const surahs = await surahsResponse.json();
  const maps = await mapsResponse.json();

  const repository = createRepository();
  const store = createStore(repository, Date.now());

  applyTheme(store.getState().settings);
  store.subscribe((state) => applyTheme(state.settings));

  const navContainer = el("nav", { className: "app-nav" });
  const viewContainer = el("div", { className: "view-container" });
  app.append(buildHeader(), navContainer, viewContainer);

  const ctx = { store, surahs, maps, now: () => Date.now() };
  /** @type {(() => void) | null} */
  let cleanup = null;

  startRouter((route) => {
    renderNav(navContainer, route);
    if (cleanup) cleanup();
    const result = VIEWS[route].render(viewContainer, ctx);
    cleanup = typeof result === "function" ? result : null;
  });

  registerServiceWorker();
}

/**
 * تسجيل Service Worker وإدارة إشعار التحديث (القسم 15). عند اكتشاف نسخة
 * جديدة مثبَّتة بينما نسخة سابقة لا تزال تتحكّم بالصفحة، تُعرض لافتة
 * «يتوفر تحديث — إعادة التحميل»؛ الضغط عليها يرسل SKIP_WAITING فتُفعَّل
 * النسخة الجديدة تلقائيًا (controllerchange) وتُعاد الصفحة.
 */
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // لا نستمع لـ controllerchange هنا عالميًا: هذا الحدث يُطلَق أيضًا في أول
  // مرة تتحكّم فيها Service Worker بصفحة غير متحكَّم بها (self.clients.claim()
  // عند أول تثبيت) — وهذه ليست ترقية. الاستماع الفعلي يبدأ فقط داخل
  // showUpdateBanner، أي بعد تأكّد وجود تحديث حقيقي.

  // "load" قد يكون أُطلق بالفعل قبل تنفيذ هذا السكربت (شائع على تحميل محلي
  // سريع)، فالاعتماد على addEventListener("load", ...) وحده يُفوّت التسجيل
  // بصمت. document.readyState === "complete" يغطي هذه الحالة مباشرة.
  if (document.readyState === "complete") {
    void doRegister();
  } else {
    window.addEventListener("load", () => void doRegister());
  }

  async function doRegister() {
    try {
      const registration = await navigator.serviceWorker.register(
        new URL("../service-worker.js", import.meta.url)
      );
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
          }
        });
      });
    } catch (error) {
      console.error("تعذّر تسجيل Service Worker", error);
    }
  }
}

/**
 * @param {ServiceWorkerRegistration} registration
 */
function showUpdateBanner(registration) {
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  const banner = el("div", { className: "update-banner", attrs: { role: "status" } }, [
    el("span", { text: "يتوفر تحديث للتطبيق" }),
    el("button", {
      className: "update-banner__button",
      text: "إعادة التحميل",
      attrs: { type: "button" },
      onClick: () => registration.waiting?.postMessage("SKIP_WAITING"),
    }),
  ]);
  document.body.append(banner);
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

function buildHeader() {
  return el("header", { className: "app-header" }, [
    brandMark(),
    el("p", { className: "app-header__title", text: "حفظ القرآن", attrs: { title: "المساعد بحفظ القرآن الكريم" } }),
  ]);
}

/**
 * يعيد بناء التنقّل مع تعليم المسار الحالي (aria-current) — إعادة البناء
 * كاملة أبسط من تحديث الأزرار الحالية، والعدد صغير فلا كلفة ملحوظة.
 * @param {HTMLElement} container
 * @param {import('./ui/router.js').Route} activeRoute
 */
function renderNav(container, activeRoute) {
  clear(container);
  for (const link of NAV_LINKS) {
    const isActive = link.route === activeRoute;
    container.append(
      el(
        "button",
        {
          className: "nav-btn",
          attrs: { type: "button", ...(isActive ? { "aria-current": "page" } : {}) },
          onClick: () => navigate(link.route),
        },
        [navIcon(link.icon), el("span", { text: link.label })]
      )
    );
  }
}

main().catch((error) => {
  console.error(error);
  const app = document.getElementById("app");
  if (app) {
    clear(app);
    app.append(el("p", { className: "error-text", text: "تعذّر تشغيل التطبيق. حاول إعادة تحميل الصفحة." }));
  }
});
