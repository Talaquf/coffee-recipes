/* Offline support. The page itself is fetched network-first, so a new
   version on GitHub always wins when online; the cached copy is only a
   fallback for when there's no connection. */
const CACHE = "coffee-recipes-v1.6.0";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("coffee-recipes-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* the page and the update check: network first, cache as fallback */
  if (req.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(
      fetch(req, { cache: "no-store" }).then(res => {
        if (res.ok && !url.searchParams.has("check")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
        }
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  /* icons, manifest, Google Fonts: cache first */
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
