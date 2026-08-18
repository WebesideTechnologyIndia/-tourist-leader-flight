// No-op service worker.
// TouristLeader does not use Firebase Cloud Messaging. This stub only exists to
// satisfy stray requests for /firebase-messaging-sw.js (from browser extensions
// or a service worker registered by another site on localhost) so the dev/prod
// logs don't fill with 404s. It self-unregisters.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
      .catch(() => {})
  );
});
