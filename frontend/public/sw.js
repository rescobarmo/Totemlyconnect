// Service Worker de autodestrucción - invalida caché anterior y se desregistra
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((n) => caches.delete(n)));
    })
  );
  self.clients.matchAll({ type: "window" }).then((clients) => {
    for (const client of clients) {
      client.navigate(client.url);
    }
  });
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
