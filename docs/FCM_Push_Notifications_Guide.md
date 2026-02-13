# Firebase Cloud Messaging (FCM) — Push Notifications for a Delivery Web App

**Roles:** Riders, Customers, Admins  
**Stack:** React (or vanilla JS) frontend · Node.js (Express) backend · Custom auth (JWT/session)  
**Use cases:** Order assigned, order status update, chat message, emergency alert

---

## 0. How Web Push Actually Works

On the web, push notifications require all of the following:

1. **Firebase Cloud Messaging (FCM)** — the transport layer
2. **Service Worker** (`firebase-messaging-sw.js`) — handles background messages
3. **VAPID key** — identifies your app to the browser
4. **Browser permission** — user must grant it
5. **Device FCM token** — unique per browser/device, stored on your backend
6. **Backend sending messages** — via the Firebase Admin SDK

### HTTPS Requirement

Web push **only** works in secure contexts:

| Environment | Works? | Notes |
|---|---|---|
| Firebase Hosting | ✅ | HTTPS by default |
| Custom domain (HTTPS) | ✅ | |
| `http://localhost` | ✅ | Chrome treats localhost as secure. **Other browsers vary — test explicitly.** |
| HTTP in production | ❌ | Will fail silently |

### Browser Support

| Browser | FCM Push? | Notes |
|---|---|---|
| Chrome / Edge | ✅ | Full support |
| Firefox | ✅ | Full support |
| Android WebView / PWA | ✅ | Full support |
| **Safari (macOS + iOS)** | ❌ | Safari uses APNs, not FCM. See note below. |

> ⚠️ **Safari limitation:** Safari 16.4+ supports the Web Push standard natively, but it routes through Apple Push Notification Service (APNs), **not** through Firebase Cloud Messaging. FCM has no way to deliver to Safari. If Safari support matters for your platform, you need a separate APNs integration — or accept that Safari users will not receive push notifications from this system.

---

## 1. Firebase Console Setup (One-Time)

### 1.1 Create or Open Your Firebase Project

Go to the [Firebase Console](https://console.firebase.google.com) → **Project Settings**.

Enable:
- **Cloud Messaging**
- **Firestore** or **Realtime Database** (if you plan to store tokens there — see Section 5.2 for the recommended relational approach)

### 1.2 Generate the VAPID Key

```
Firebase Console → Project Settings → Cloud Messaging
→ Web configuration → Generate VAPID key
```

Save the output as `PUBLIC_VAPID_KEY`. You will use this in the frontend.

### 1.3 Download the Service Account Key (for the Backend)

```
Project Settings → Service Accounts → Generate new private key → Download JSON
```

> ⚠️ **Never commit this file to Git.** Load it from an environment variable or a secrets manager at runtime.

---

## 2. Install Dependencies

```bash
# Frontend
npm install firebase

# Backend
npm install firebase-admin
```

---

## 3. Frontend Setup

### 3.1 Firebase Initialization (`firebase.js`)

```js
import { initializeApp }  from "firebase/app";
import { getMessaging }   from "firebase/messaging";

const firebaseConfig = {
  apiKey:                "YOUR_API_KEY",
  authDomain:            "YOUR_PROJECT.firebaseapp.com",
  projectId:             "YOUR_PROJECT_ID",
  storageBucket:         "YOUR_PROJECT.appspot.com",
  messagingSenderId:     "YOUR_SENDER_ID",
  appId:                 "YOUR_APP_ID"
};

export const app       = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

### 3.2 Register the Service Worker

Add this early in your app entry point (`main.js` / `index.js`):

```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .catch(err => console.error("Service worker registration failed:", err));
}
```

### 3.3 Service Worker File

> ⚠️ **Version sync rule:** The `firebase-compat` script version here **must match** the version installed by `npm install firebase`. When you upgrade the package, update this URL too. Consider adding a build-time check or a comment flagging this dependency.

Place this file at `public/firebase-messaging-sw.js`:

```js
// firebase-messaging-sw.js
// ⚠️  Keep this version in sync with your npm firebase package version.
//      Current: 10.7.0 — update both when upgrading.
//      If background messages stop working after a deploy, verify this version
//      matches your package.json firebase version.
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// All FCM background messages — notification AND data-only — arrive here.
// See Section 8 for the full consolidated handler that covers both paths.
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};

  // --- Data-only path: background sync, no UI ---
  if (data.type === "ORDER_UPDATE") {
    refreshOrder(data.orderId);
  }

  // --- Notification path: only show UI if a notification block is present ---
  if (payload.notification) {
    self.registration.showNotification(
      payload.notification.title,
      {
        body: payload.notification.body,
        icon: "/icon.png",
        data       // pass through so click handlers can act on it
      }
    );
  }
});
```

---

## 4. Request Permission and Register the Token

```js
// pushRegistration.js
import { getToken } from "firebase/messaging";   // ← onTokenRefresh does NOT exist in v9+
import { messaging } from "./firebase";

/**
 * Requests notification permission, obtains the FCM token,
 * and sends it to your backend for storage.
 *
 * Call this after the user is authenticated so the backend
 * can derive their identity from the session — never from client input.
 */
export async function registerForPush() {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Notification permission denied.");
    return;
  }

  try {
    const token = await getToken(messaging, {
      vapidKey: "YOUR_PUBLIC_VAPID_KEY"
    });

    if (!token) {
      console.warn("FCM returned no token — service worker may not be ready.");
      return;
    }

    await sendTokenToBackend(token);

  } catch (err) {
    console.error("Failed to get FCM token:", err);
    // Optionally: schedule a retry, or show a fallback UI prompt
  }
}

/**
 * POSTs the token to your backend.
 * userId and role are NOT sent from the client —
 * the backend derives them from the authenticated session.
 */
async function sendTokenToBackend(token) {
  const res = await fetch("/api/push/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ token })   // token only — nothing else is trusted
  });
  if (!res.ok) {
    throw new Error(`Token registration failed: ${res.status}`);
  }
}
```

### Token rotation (why there is no `onTokenRefresh`)

The v9 modular Firebase SDK **does not expose** an `onTokenRefresh` callback for web. FCM silently rotates tokens in the background, and the only way to catch a new token is to call `getToken` again — it returns the current token, whether fresh or rotated.

The correct strategy is to call `registerForPush` **opportunistically** at the points where a stale token is most likely:

```js
// 1. On app startup (after auth is ready)
registerForPush().catch(() => {});

// 2. On user login
// — call registerForPush() at the end of your login flow

// 3. On tab becoming visible (catches rotations that happened while the tab was inactive)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    registerForPush().catch(() => {});
  }
});

// 4. On service worker update (new SW = potentially new token)
navigator.serviceWorker.addEventListener("controllerchange", () => {
  registerForPush().catch(() => {});
});
```

`getToken` is cheap — it returns a cached token if nothing has changed, and only does network work when the token is actually new. Calling it at these four points covers every realistic rotation scenario without polling.

### Key notes

- **No `onTokenRefresh`** — it does not exist in the v9 SDK and will throw a runtime import error if referenced.
- **`try/catch` around `getToken`** stays — it prevents unhandled rejections when the service worker isn't ready or permission is in an edge state.
- **Only `token` is sent to the backend.** `userId` and `role` are resolved server-side — see Section 5.3.

---

## 5. Backend Setup (Node.js / Express)

### 5.1 Initialize Firebase Admin

```js
// firebase-admin.js
const admin = require("firebase-admin");

// ⚠️ Load the service account from an env var or secrets manager, never from a committed file.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
```

### 5.2 Token Storage Schema

Design the table to support **one user → many tokens** (multiple devices/browsers):

```sql
CREATE TABLE fcm_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  role       TEXT        NOT NULL CHECK (role IN ('courier', 'customer', 'admin')),
  token      TEXT        NOT NULL UNIQUE,   -- FCM token string
  device     TEXT,                          -- optional: "chrome-win", "safari-ios", etc.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Queries always filter by user_id; deletions target token directly.
CREATE INDEX idx_fcm_tokens_user_id ON fcm_tokens (user_id);
```

### 5.3 Token Registration Endpoint

```js
// routes/push.js
const express = require("express");
const router  = express.Router();
const db      = require("../db");           // your pg / knex instance
const { requireAuth } = require("../middleware/auth"); // your existing auth middleware

/**
 * POST /api/push/register
 *
 * Requires authentication. userId and role are extracted from the
 * verified session/JWT — they are NEVER read from req.body.
 */
router.post("/register", requireAuth, async (req, res) => {
  const { token } = req.body;                 // only the FCM token comes from the client
  const userId   = req.user.id;              // from your verified auth context
  const role      = req.user.role;            // from your verified auth context

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token is required" });
  }

  await db.query(`
    INSERT INTO fcm_tokens (user_id, role, token)
    VALUES ($1, $2, $3)
    ON CONFLICT (token)
      DO UPDATE SET user_id   = EXCLUDED.user_id,
                    role      = EXCLUDED.role,
                    updated_at = NOW()
  `, [userId, role, token]);

  res.json({ ok: true });
});

module.exports = router;
```

### Key changes from the original

- **`requireAuth` middleware** ensures the endpoint is only callable by an authenticated user.
- **`userId` and `role` come from `req.user`**, populated by your auth middleware after verifying the JWT or session. The client cannot spoof these.
- **`ON CONFLICT … DO UPDATE`** handles token reuse correctly: if FCM reissues a token that was previously bound to a different user or device, the row is updated rather than silently ignored.

---

## 6. Sending Notifications

### 6.1 Core Send Function (with centralized error handling)

```js
// lib/push.js
const admin = require("../firebase-admin");
const db    = require("../db");

/**
 * Sends a push notification to a single FCM token.
 *
 * Returns true on success.
 * If the token is no longer valid, it is deleted and false is returned.
 * All other errors are thrown so callers can decide how to handle them.
 *
 * @param {string} token        – FCM device token
 * @param {string} title        – Notification title
 * @param {string} body         – Notification body text
 * @param {Object} [data={}]    – Arbitrary key/value pairs (all values must be strings)
 * @returns {Promise<boolean>}
 */
export async function sendPush(token, title, body, data = {}) {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data                            // passed through for deep-link or action handling
    });
    return true;
  } catch (err) {
    // Token is expired, revoked, or otherwise invalid — clean it up
    if (err.code === "messaging/registration-token-not-registered") {
      await db.query("DELETE FROM fcm_tokens WHERE token = $1", [token]);
      console.warn(`Deleted stale FCM token: ${token}`);
      return false;
    }
    // Re-throw anything else (network error, quota exceeded, etc.)
    throw err;
  }
}

/**
 * Sends a notification to every token registered to a given user.
 * Stale tokens are cleaned up automatically via sendPush.
 *
 * @param {string} userId
 * @param {string} title
 * @param {string} body
 * @param {Object} [data={}]
 */
export async function sendPushToUser(userId, title, body, data = {}) {
  const result = await db.query(
    "SELECT token FROM fcm_tokens WHERE user_id = $1",
    [userId]
  );

  await Promise.all(
    result.rows.map(row => sendPush(row.token, title, body, data))
  );
}
```

### Key changes from the original

- **Error handling lives in `sendPush`**, not in every individual caller. Stale-token cleanup is automatic and centralized.
- **`sendPushToUser` helper** abstracts the "fetch all tokens for a user" pattern, which every notification type needs.
- **`Promise.all`** fans out to all of a user's devices in parallel rather than sequentially.

### 6.2 Courier Assignment Example

```js
// Called when an order is assigned to a courier
async function notifyCourierAssignment(courierId, orderId) {
  await sendPushToUser(
    courierId,
    "New Delivery Assigned",
    "You have a new order to pick up.",
    { type: "ORDER_ASSIGNED", orderId: String(orderId) }   // all data values must be strings
  );
}
```

Clean and caller-focused — all the heavy lifting is in `sendPush` and `sendPushToUser`.

---

## 7. Handle Notifications in the Foreground

When your app is open and in the foreground, the service worker does **not** fire — `onMessage` handles it instead. In a delivery app this is critical: a rider needs to see an incoming order even when actively using the app.

```js
// notificationToast.js  (wire this up early in your app lifecycle)
import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase";

/**
 * Registers the foreground message listener.
 * Call once during app initialization.
 *
 * @param {function} showToast – your app's toast/banner renderer,
 *   e.g. (title, body, data) => { ... }
 */
export function initForegroundListener(showToast) {
  onMessage(messaging, payload => {
    const { title, body } = payload.notification || {};
    const data            = payload.data || {};

    console.log("Foreground push received:", payload);

    // Render a visible in-app notification
    if (showToast) {
      showToast(title, body, data);
    }

    // Example: if this is an order assignment, trigger an action
    if (data.type === "ORDER_ASSIGNED") {
      // e.g. navigate to order details, play alert sound, etc.
    }
  });
}
```

Then in your app entry point:

```js
import { initForegroundListener } from "./notificationToast";

// Wire in your existing toast component/function
initForegroundListener((title, body, data) => {
  // e.g. dispatch to a global notification state, or render a toast directly
  console.log("Show toast:", { title, body, data });
});
```

---

## 8. Data-Only Messages (Silent Push)

Use these for background sync triggers where no visible notification is needed: order state refresh, location updates, cache invalidation, etc.

```js
// All values in the data object MUST be strings — FCM will reject non-string values.
await admin.messaging().send({
  token,
  data: {
    type:    "ORDER_UPDATE",
    orderId: String(orderId)   // explicit coercion — don't rely on implicit conversion
  }
  // No `notification` block — no UI is shown
});
```

> ⚠️ **Web caveat:** Pure data-only messages (no `notification` block) are **not reliably delivered** to web service workers in all browsers. If your target is web and the message must reach a background tab, include a `notification` block as well, or handle the update via a periodic polling fallback. On Android/iOS (via a native wrapper or PWA with background sync), data-only messages work as expected.

### Handling data-only messages in the service worker

All FCM messages — notification **and** data-only — arrive through `onBackgroundMessage`. The `self.addEventListener("message")` listener is for `postMessage` from your main thread, **not** for FCM payloads. The service worker should use a single consolidated handler:

```js
// firebase-messaging-sw.js — replace the onBackgroundMessage block with this:

messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};

  // --- Data-only path: background sync, no UI ---
  if (data.type === "ORDER_UPDATE") {
    // Trigger a background refresh without showing a notification.
    // Use event.waitUntil if you need the SW to stay alive for the fetch.
    refreshOrder(data.orderId);
  }

  // --- Notification path: show the push notification ---
  // Only call showNotification if a notification block is present.
  // Pure data messages should not trigger a visible notification.
  if (payload.notification) {
    self.registration.showNotification(
      payload.notification.title,
      {
        body: payload.notification.body,
        icon: "/icon.png",
        data       // pass through so click handlers can act on it
      }
    );
  }
});
```

Both paths live in one place. The handler checks what's present and acts accordingly — no separate listener needed.

---

## 9. Security Rules

### Never do this

- Trust `userId` or `role` sent by the client in the request body
- Allow users to call your notification-sending endpoints directly
- Commit the Firebase service account JSON to version control
- Blindly store tokens without binding them to an authenticated user

### Always do this

- Authenticate every endpoint that registers or manages tokens (`requireAuth`)
- Derive `userId` and `role` from your verified session/JWT on the server
- Validate incoming token strings (non-empty string, reasonable length)
- Delete invalid tokens promptly when sends fail with `registration-token-not-registered`
- Rotate or revoke tokens on user logout

---

## 10. Notification Matrix

| Event | Customer | Courier | Admin |
|---|---|---|---|
| Order placed | ✅ | ❌ | ✅ |
| Order assigned | ❌ | ✅ | ❌ |
| Courier arrived | ✅ | ❌ | ❌ |
| Order completed | ✅ | ✅ | ❌ |
| **Chat message** | ✅ | ✅ | ❌ |
| **Emergency alert** | ❌ | ✅ | ✅ |

> **Chat message** was listed as a core use case but was missing from the original matrix. It is one of the highest-frequency notification types in a delivery platform — prioritize it.

---

## 11. Common Pitfalls

| # | Pitfall | Why it hurts |
|---|---|---|
| 1 | Running on HTTP in production | Push registration silently fails |
| 2 | Missing or misconfigured service worker | Background notifications never arrive |
| 3 | VAPID key mismatch | `getToken` throws or returns null |
| 4 | Not handling token rotation | Tokens silently expire; pushes stop delivering |
| 5 | Assuming one token per user | Notifications only reach one device |
| 6 | Not deleting invalid tokens | Dead rows accumulate; send calls fail repeatedly |
| 7 | Trusting client-sent `userId` / `role` | Any user can register a token under someone else's account |
| 8 | No `try/catch` around `getToken` | Unhandled rejection crashes the registration flow |
| 9 | Service worker compat version out of sync with npm package | Background messages silently stop working after an upgrade. **If pushes break after a deploy, check this first.** |
| 10 | Expecting FCM to work on Safari | Safari uses APNs. FCM cannot deliver to it. Requires a separate APNs integration. |
| 11 | Using non-string values in `data` payloads | FCM rejects the message at send time |

---

## 12. Recommended Enhancements (Advanced)

- **Notification grouping** by `orderId` (collapses repeated updates for the same order)
- **Sound customization** for PWA on mobile
- **Emergency priority channel** with elevated delivery priority
- **Retry queue** (BullMQ / Redis) for transient send failures
- **Push analytics table** — track delivered vs. failed vs. opened per event type
- **Token cleanup cron** — periodically remove tokens older than 30 days that haven't been refreshed

---

## 13. Do You Need Firebase Auth?

**No.** FCM works perfectly with any authentication system:

- Custom JWT
- Session-based auth
- OAuth tokens
- Any middleware that populates `req.user`

You only store FCM tokens. Identity management is entirely separate.

---

## 14. Recommended Implementation Order

1. **Courier assignment push** — validates the full end-to-end flow
2. **Chat message push** — highest-frequency event, proves scale
3. **Emergency alert push** — priority delivery path
4. **Admin dashboard push** — lower urgency, can come last
5. **Token cleanup cron** — operational hygiene, run weekly or daily
