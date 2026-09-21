/* Bijayalakshmi Physiotherapy — offline service worker (TEMPLATE).
 *
 * App shell: cache-first. API: network-first with offline fallback.
 *
 * __BUILD_ID__ is replaced with the Next.js build ID at build time (see
 * scripts/inject-build-id.mjs, run by `npm run build`). Every deployment
 * therefore ships a byte-different sw.js, so browsers install the fresh
 * service worker instead of running a stale cached bundle against a new
 * backend contract.
 */
const CACHE = "bijaya-physio-__BUILD_ID__";
const SHELL = [
  "/",
  "/login",
  "/dashboard",
  "/patients",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Backend API: network-first; when offline, answer JSON so the app can
  // keep working from IndexedDB instead of hanging.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ offline: true, message: "Offline — using local data." }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
      )
    );
    return;
  }

  // Navigations: cached app shell first, then network, then root fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request)
            .then((res) => {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
              return res;
            })
            .catch(() => caches.match("/"))
      )
    );
    return;
  }

  // Same-origin static assets: cache-first, populate on miss.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});
