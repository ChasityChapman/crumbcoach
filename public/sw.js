// Service Worker for Push Notifications
const CACHE_NAME = 'sourdough-baking-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event for background notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  const options = {
    body: 'Time for your next baking step!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: 'baking-step',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Bake', icon: '/favicon.ico' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  if (event.data) {
    const data = event.data.json();
    options.body = `Time for: ${data.stepName}`;
    options.tag = `bake-${data.bakeId}`;
  }

  event.waitUntil(
    self.registration.showNotification('🍞 Baking Step Ready!', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open or focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes('/') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
  }
});