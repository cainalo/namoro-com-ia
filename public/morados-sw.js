const CACHE_NAME = "morados-static-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/morados-icon.svg", "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL);
        return offline || Response.error();
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(?:svg|png|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      }),
    );
  }
});
