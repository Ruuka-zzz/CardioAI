/**
 * Service worker — receives push messages when the app is closed.
 *
 * MUST live at frontend/public/sw.js, not in src/. Vite copies public/ to the
 * root of the build, and a service worker can only control pages at or below
 * its own path. Served from /sw.js it controls the whole site; served from
 * /assets/sw-a3f9.js it would control nothing.
 *
 * Deliberately minimal. This file runs outside React with no access to app
 * state, and it runs even when no tab is open — logic here is hard to debug
 * and impossible to hot-reload. Decisions belong in notification-service;
 * this worker only displays what it is sent.
 */

const DEFAULT_TITLE = "CardioAI";

self.addEventListener("install", (event) => {
  // Take over immediately rather than waiting for every tab to close.
  // Without this, a patient who updates the app keeps the old worker until
  // they close every tab — which on mobile can be days.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // A malformed payload must still surface something. Silently dropping a
    // push is the worst outcome here — it could have been an urgent one.
    payload = { body: event.data ? event.data.text() : "You have a new alert." };
  }

  const urgency = payload.urgency || "routine";

  const options = {
    body: payload.body || "You have a new alert.",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: payload.tag || urgency,

    // Emergency alerts stay on screen until acknowledged and vibrate.
    // Routine reminders do neither — a check-in nudge that demands dismissal
    // trains people to swipe notifications away without reading them, which
    // is exactly what you don't want when the urgent one arrives.
    requireInteraction: urgency === "emergency",
    vibrate: urgency === "emergency" ? [200, 100, 200, 100, 200] : undefined,
    silent: urgency === "routine",

    data: {
      url: payload.url || "/patient",
      urgency,
    },
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || DEFAULT_TITLE, options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification.data?.url || "/patient";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab rather than opening a duplicate.
        for (const client of clientList) {
          if (client.url.includes(target) && "focus" in client) {
            return client.focus();
          }
        }
        if (clientList.length > 0 && "navigate" in clientList[0]) {
          return clientList[0].navigate(target).then((c) => c && c.focus());
        }
        return self.clients.openWindow(target);
      }),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Browsers rotate subscriptions without warning. If this isn't handled the
  // patient silently stops receiving alerts and nothing anywhere reports it.
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((subscription) =>
        fetch("/api/patients/me/push-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        }),
      ),
  );
});