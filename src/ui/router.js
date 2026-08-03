/**
 * توجيه بسيط عبر location.hash بقائمة سماح للمسارات المعروفة (القسم 14) —
 * أي مسار غير معروف يُوجَّه إلى لوحة اليوم بدل تمريره كما هو.
 */

export const ROUTES = /** @type {const} */ ([
  "today",
  "new-session",
  "session",
  "review",
  "stats",
  "maps",
  "settings",
]);
export const DEFAULT_ROUTE = "today";

/** @typedef {typeof ROUTES[number]} Route */

/**
 * @param {string} hash
 * @returns {Route}
 */
export function resolveRoute(hash) {
  const raw = /** @type {Route} */ (hash.replace(/^#\/?/, "").split("?")[0].trim());
  return ROUTES.includes(raw) ? raw : DEFAULT_ROUTE;
}

/**
 * @param {Route} route
 */
export function navigate(route) {
  const safeRoute = ROUTES.includes(route) ? route : DEFAULT_ROUTE;
  window.location.hash = `#/${safeRoute}`;
}

/**
 * @param {(route: Route) => void} onChange
 * @returns {() => void} إلغاء الاشتراك
 */
export function startRouter(onChange) {
  function handle() {
    onChange(resolveRoute(window.location.hash));
  }
  window.addEventListener("hashchange", handle);
  handle();
  return () => window.removeEventListener("hashchange", handle);
}
