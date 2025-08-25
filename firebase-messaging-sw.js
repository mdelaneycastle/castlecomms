// Firebase Cloud Messaging Service Worker
// This runs in the background to handle push notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJvHNZB_pzhytD7yLa69auStrZBk2SEHk",
  authDomain: "castle-comms.firebaseapp.com",
  databaseURL: "https://castle-comms-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "castle-comms",
  storageBucket: "castle-comms.firebasestorage.app",
  messagingSenderId: "959264765744",
  appId: "1:959264765744:web:7aee345a37673f720cfaf5",
  measurementId: "G-NLS757VMJ8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message: ', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icon.png',
    badge: '/icon.png',
    tag: 'castle-comms-message',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open Chat',
        icon: '/icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      url: '/messages.html',
      ...payload.data
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received.');

  event.notification.close();

  if (event.action === 'open') {
    // Open the messages page
    event.waitUntil(
      clients.openWindow('/messages.html')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          // If the app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes('messages.html') && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise, open a new window
          if (clients.openWindow) {
            return clients.openWindow('/messages.html');
          }
        })
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed: ', event);
});

// Install event
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});