import { api } from "./client";

/**
 * Web push registration.
 *
 * Four things have to line up: browser support, a registered service worker,
 * the patient's permission, and a subscription stored on the server. Any one
 * missing means no notifications — and the failure is silent, which is why
 * every step here reports a named reason instead of a boolean.
 *
 * PERMISSION TIMING. Never call enablePush() on page load. A permission
 * prompt with no context gets denied, and a denied prompt cannot be shown
 * again — the patient has to dig through browser settings to undo it. Ask
 * only after the patient has pressed a button that says what it's for.
 *
 * HTTPS. Push requires a secure context. `localhost` is exempt, so local
 * development works, but testing from a phone on 192.168.x.x will not.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const PushState = {
  UNSUPPORTED: "unsupported",
  INSECURE: "insecure",
  UNCONFIGURED: "unconfigured",
  DENIED: "denied",
  DEFAULT: "default",
  GRANTED: "granted",
};

/** What state are we in, without prompting for anything. */
export function pushState() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return PushState.UNSUPPORTED;
  }
  if (!window.isSecureContext) {
    return PushState.INSECURE;
  }
  if (!VAPID_PUBLIC_KEY) {
    return PushState.UNCONFIGURED;
  }
  return Notification.permission; // "default" | "granted" | "denied"
}

/** Register the worker. Safe to call on load — it prompts for nothing. */
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

/**
 * Ask permission, subscribe, and send the subscription to the server.
 * Call this ONLY from a user gesture — see the note above.
 */
export async function enablePush() {
  const state = pushState();

  if (state === PushState.UNSUPPORTED) {
    throw new Error("This browser doesn't support notifications.");
  }
  if (state === PushState.INSECURE) {
    throw new Error("Notifications need a secure (https) connection.");
  }
  if (state === PushState.UNCONFIGURED) {
    throw new Error("Notifications aren't configured on this server.");
  }
  if (state === PushState.DENIED) {
    throw new Error(
      "Notifications are blocked. You'll need to allow them in your browser settings.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications weren't allowed.");
  }

  const registration =
    (await navigator.serviceWorker.getRegistration()) ||
    (await registerServiceWorker());

  if (!registration) {
    throw new Error("Couldn't set up notifications on this device.");
  }

  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      // Required to be true by every browser: we may not subscribe silently
      // and send pushes the patient never sees a notification for.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  await api.savePushSubscription(subscription.toJSON());
  return subscription;
}

/** Unsubscribe locally and clear the stored subscription server-side. */
export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }
  await api.deletePushSubscription();
}

/**
 * VAPID keys are distributed as URL-safe base64; the Push API wants raw bytes.
 * Without this conversion `subscribe()` fails with an opaque
 * InvalidAccessError that gives no hint about the key format.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);

  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}