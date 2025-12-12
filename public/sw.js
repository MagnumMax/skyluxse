const CACHE_NAME = "skyluxse-cache-v1";
const ASSET_CACHE = "skyluxse-assets-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (request.destination === "style" || request.destination === "script" || request.destination === "image" || request.destination === "font") {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;
          return new Response("<html><body><h1>Offline</h1><p>No internet connection.</p></body></html>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
            status: 200,
          });
        }
      })()
    );
  }
});
