/**
 * نقطة الدخول: تحميل بيانات السور، تهيئة المخزن، وربط التوجيه بالشاشات (المرحلة 2).
 */

import { createRepository } from "./storage/repository.js";
import { createStore } from "./ui/store.js";
import { startRouter, navigate } from "./ui/router.js";
import { el, clear } from "./ui/components/dom.js";
import { brandMark, navIcon, rosette } from "./ui/components/icons.js";
import { toDayKey } from "./core/dates.js";
import { computeStreak } from "./core/statistics.js";
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

/** روابط التنقّل الخمسة. بدء السبق وشاشة الجلسة ليسا هنا عمدًا: يُدخَل
 * إليهما من لوحة اليوم في سياقهما، لا من قائمة دائمة. */
const NAV_LINKS = /** @type {const} */ ([
  { route: "today", label: "اليوم", icon: "today" },
  { route: "review", label: "المراجعة", icon: "review" },
  { route: "stats", label: "الإحصائيات", icon: "stats" },
  { route: "maps", label: "الخرائط الذهنية", icon: "maps" },
  { route: "settings", label: "الإعدادات", icon: "settings" },
]);

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

  const navContainer = el("nav", { className: "app-nav", attrs: { "aria-label": "التنقّل الرئيسي" } });
  const statusContainer = el("div", { className: "app-status" });
  const sidebar = el("div", { className: "app-sidebar" }, [buildHeader(), navContainer, statusContainer]);
  const viewContainer = el("main", { className: "app-main" });
  app.append(sidebar, viewContainer);

  const ctx = { store, surahs, maps, now: () => Date.now() };
  /** @type {(() => void) | null} */
  let cleanup = null;

  renderStatus(statusContainer, ctx);
  store.subscribe(() => renderStatus(statusContainer, ctx));

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

  const banner = el("div", { className: "banner", attrs: { role: "status" } }, [
    el("span", { text: "يتوفر تحديث للتطبيق" }),
    el("button", {
      className: "btn btn-primary btn--sm",
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
    el("div", { className: "app-header__text" }, [
      el("p", { className: "app-header__title", text: "حفظ القرآن", attrs: { title: "المساعد بحفظ القرآن الكريم" } }),
      el("p", { className: "app-header__subtitle", text: "سبقٌ كل يوم، ومراجعةٌ في وقتها" }),
    ]),
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
    const children = [navIcon(link.icon), el("span", { text: link.label })];
    // علامة الربع في الهامش تدلّ على الصفحة الحالية — كما تُعلَّم الأرباع في
    // هامش المصحف. aria-current وحده هو ما يبلّغ القارئات؛ العلامة زخرفية.
    if (isActive) children.push(rosette("nav-btn__marker"));
    container.append(
      el(
        "button",
        {
          className: "nav-btn",
          attrs: { type: "button", ...(isActive ? { "aria-current": "page" } : {}) },
          onClick: () => navigate(link.route),
        },
        children
      )
    );
  }
}

/**
 * حالة اليوم في الهامش: التتابع الحالي. معلومة صحيحة أيًّا كانت الشاشة
 * المعروضة، فمكانها الهامش الثابت لا رأس كل شاشة. يُعاد البناء عند كل تغيّر
 * حالة (قد يتغيّر التتابع بإتمام سبق أو مراجعة).
 * @param {HTMLElement} container
 * @param {import('./ui/store.js').AppContext} ctx
 */
function renderStatus(container, ctx) {
  clear(container);
  const state = ctx.store.getState();
  const todayKey = toDayKey(new Date(ctx.now()));
  const { current: streak } = computeStreak(state.sessions, state.reviewQueue, todayKey);

  // التاريخ لا يتكرّر هنا: لوحة اليوم تعرضه في عنوانها، وسائر الشاشات لا
  // تحتاجه. التتابع وحده هو ما يفيد أيًّا كانت الشاشة المفتوحة.
  container.append(
    streak > 0
      ? el("span", { className: "badge badge--gold" }, [
          rosette("rosette"),
          el("span", { text: `تتابع ${streak} يومًا` }),
        ])
      : el("span", { className: "badge", text: "لا تتابع بعد" })
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
