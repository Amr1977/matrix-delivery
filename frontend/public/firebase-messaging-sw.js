// firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker
// ⚠️  Keep this version in sync with firebase package version
//      Current: 10.7.1 — update both when upgrading

// Firebase configurations - must be hardcoded since SW can't access process.env
const firebaseConfigs = {
  development: {
    apiKey: "AIzaSyDonXVaZajprJ6SHiRFbQY_rPf4ZrFhRbo",
    authDomain: "matrix-delivery-dev.firebaseapp.com",
    projectId: "matrix-delivery-dev",
    storageBucket: "matrix-delivery-dev.firebasestorage.app",
    messagingSenderId: "821695847521",
    appId: "1:821695847521:web:930d27360631e4ee041e20"
  },
  staging: {
    apiKey: "AIzaSyCJN5RuTC_31mFadOsmT7WNZaejkjdTrhA",
    authDomain: "matrix-delivery-staging.firebaseapp.com",
    projectId: "matrix-delivery-staging",
    storageBucket: "matrix-delivery-staging.firebasestorage.app",
    messagingSenderId: "395768910783",
    appId: "1:395768910783:web:ce5368f53c2f4e7c5fc70a"
  },
  test: {
    apiKey: "AIzaSyDNTvXNL5uzWvuDzinJ3hlTiGvf6GK1YLg",
    authDomain: "matrix-delivery-test.firebaseapp.com",
    projectId: "matrix-delivery-test",
    storageBucket: "matrix-delivery-test.firebasestorage.app",
    messagingSenderId: "267773227239",
    appId: "1:267773227239:web:1d4bac5faa97d41b503242"
  },
  production: {
    apiKey: "AIzaSyCKLqK_x_Jvop7a5ht3w1nsnpa2hhx1bVk",
    authDomain: "matrix-delivery.firebaseapp.com",
    projectId: "matrix-delivery",
    storageBucket: "matrix-delivery.firebasestorage.app",
    messagingSenderId: "127557882021",
    appId: "1:127557882021:web:f515e53b8d66547d2efd4c"
  }
};

// Determine environment based on hostname
function getEnvironment() {
  if (typeof self !== 'undefined' && self.location) {
    const hostname = self.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'development';
    }
    if (hostname.includes('staging')) {
      return 'staging';
    }
    if (hostname.includes('test') || hostname.includes('testing')) {
      return 'test';
    }
  }
  return 'production';
}

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase
const env = getEnvironment();
const config = firebaseConfigs[env];
firebase.initializeApp(config);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Background push received:', payload);

  const notificationTitle = payload.notification ? payload.notification.title : 'New Notification';
  const notificationBody = payload.notification ? payload.notification.body : '';
  const notificationData = payload.data || {};

  return self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: '/defaulticon.png',
    data: notificationData,
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Focus existing window if available
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: data });
          return;
        }
      }

      // Open new window
      if (clients.openWindow) {
        var url = self.location.origin;
        if (data.orderId) {
          url = self.location.origin + '/#/orders/' + data.orderId;
        } else if (data.type === 'NEW_MESSAGE') {
          url = self.location.origin + '/#/messages';
        }
        return clients.openWindow(url);
      }
    })
  );
});
