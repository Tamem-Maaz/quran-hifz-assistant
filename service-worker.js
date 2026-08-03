/**
 * Service Worker (القسم 15): cache-first للأصول الساكنة، network-first
 * لمستند التطبيق الرئيسي، وإدارة تحديث عبر ترقيم إصدار الذاكرة المؤقتة.
 *
 * ملاحظة صيانة: PRECACHE_URLS قائمة يدوية — لا أداة بناء تُولّدها (القرار
 * المعماري 1). أضِف أي وحدة src/ جديدة هنا عند إنشائها، وارفع CACHE_VERSION
 * عند أي نشر يغيّر محتوى ملف مخزَّن مسبقًا (هذا ما يُفعّل مسار الترقية).
 */

const CACHE_VERSION = "v4";
const CACHE_NAME = `quran-hifz-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/icon.svg",
  "./assets/icons/icon-maskable.svg",
  "./assets/fonts/almarai-400-arabic.woff2",
  "./assets/fonts/almarai-400-latin.woff2",
  "./assets/fonts/aref-ruqaa-700-arabic.woff2",
  "./src/main.js",
  "./src/version.js",
  "./src/core/dates.js",
  "./src/core/progress.js",
  "./src/core/scheduler.js",
  "./src/core/session.js",
  "./src/core/statistics.js",
  "./src/core/types.js",
  "./src/storage/backup.js",
  "./src/storage/local-storage.js",
  "./src/storage/migrations.js",
  "./src/storage/repository.js",
  "./src/storage/validation.js",
  "./src/ui/store.js",
  "./src/ui/router.js",
  "./src/ui/format.js",
  "./src/ui/download-backup.js",
  "./src/ui/base.css",
  "./src/ui/components/dom.js",
  "./src/ui/components/big-button.js",
  "./src/ui/components/step-counter.js",
  "./src/ui/components/heatmap.js",
  "./src/ui/components/lightbox.js",
  "./src/ui/components/icons.js",
  "./src/ui/views/today.js",
  "./src/ui/views/new-session.js",
  "./src/ui/views/session.js",
  "./src/ui/views/review.js",
  "./src/ui/views/stats.js",
  "./src/ui/views/maps.js",
  "./src/ui/views/settings.js",
  "./src/data/surahs.json",
  "./src/data/maps.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || request.destination === "document") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? (await caches.match("./index.html"));
  }
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
