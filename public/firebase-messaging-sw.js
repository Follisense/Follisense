// public/firebase-messaging-sw.js
// This file MUST be in the public folder

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyCAtBfWDHUuExJDDTOeKBtevdzSn3MgZ0Q',
  authDomain:        'follisense-c46b1.firebaseapp.com',
  projectId:         'follisense-c46b1',
  storageBucket:     'follisense-c46b1.firebasestorage.app',
  messagingSenderId: '573910311260',
  appId:             '1:573910311260:web:3b89ad03ba24930128a199',
});

const messaging = firebase.messaging();

// New brand assets — must exist in /public
const ICON  = '/follisense-icon-green.png';
const BADGE = '/follisense-badge.png';

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body, icon } = payload.notification || {};

  self.registration.showNotification(title || 'FolliSense', {
    body:    body || "There's something new in your record.",
    icon:    icon || ICON,
    badge:   BADGE,
    tag:     'follisense-notification',
    data:    payload.data || {},
    actions: [
      { action: 'open',    title: 'Open app' },
      { action: 'dismiss', title: 'Dismiss'  },
    ],
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  // Deep-link: honour a url passed in the message data, fall back to /home
  const targetUrl = (event.notification.data && event.notification.data.url) || '/home';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});