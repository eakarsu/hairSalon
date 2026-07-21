const STATIC_CACHE = 'salonflow-static-v2';
const DYNAMIC_CACHE = 'salonflow-dynamic-v2';
const OFFLINE_DB = 'salonflow-offline';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests from caching (but handle offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'You are offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Authenticated HTML is never cached because it may contain tenant data.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For other assets, try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Refresh cache in background
          fetch(request).then((response) => {
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response);
            });
          });
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          // Cache the response
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  let data = { title: 'SalonFlow', body: 'You have a new notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'default',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if a window is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  const commands = await listOfflineCommands();
  for (const command of commands) {
    try {
      const response = await fetch('/api/field-service/offline', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (response.ok) {
        await deleteOfflineCommand(command.commandId);
      } else if (response.status === 409) {
        await notifyWindows({ type: 'OFFLINE_COMMAND_CONFLICT', commandId: command.commandId, details: await response.json() });
        await deleteOfflineCommand(command.commandId);
      } else {
        throw new Error(`sync returned ${response.status}`);
      }
    } catch {
      throw new Error('Appointment sync remains pending');
    }
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'QUEUE_APPOINTMENT_COMMAND') return;
  event.waitUntil(putOfflineCommand(event.data.command).then(() => self.registration.sync.register('sync-appointments')));
});

function offlineStore(mode) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('commands', { keyPath: 'commandId' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result.transaction('commands', mode).objectStore('commands'));
  });
}

async function putOfflineCommand(command) {
  const store = await offlineStore('readwrite');
  return new Promise((resolve, reject) => {
    const request = store.put(command);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function listOfflineCommands() {
  const store = await offlineStore('readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteOfflineCommand(commandId) {
  const store = await offlineStore('readwrite');
  return new Promise((resolve, reject) => {
    const request = store.delete(commandId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function notifyWindows(message) {
  const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(message));
}
