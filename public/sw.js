// Minimal service worker: makes the site installable. It does NOT cache anything,
// so participants always see the latest data and code.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
