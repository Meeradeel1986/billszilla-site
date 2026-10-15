/* Installability-only service worker.
   Deliberately caches NOTHING and passes all fetches to the network:
   the site must not work offline, because ad impressions require a live connection. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});
self.addEventListener("fetch", function () { /* pass-through to network */ });
