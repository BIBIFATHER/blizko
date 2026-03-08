// Blizko Service Worker — Push Notifications + Offline Cache
const CACHE_NAME = 'blizko-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache for offline support
const PRE_CACHE = [
    '/',
    '/offline.html',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install: pre-cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
    }
});

// Push Notifications
self.addEventListener('push', (event) => {
    let data = { title: 'Blizko', body: 'Новое уведомление', icon: '/icons/icon-192.png' };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (e) {
        if (event.data) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now(),
        },
        actions: data.actions || [
            { action: 'open', title: 'Открыть' },
            { action: 'close', title: 'Позже' },
        ],
        tag: data.tag || 'blizko-notification',
        renotify: true,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    if (event.action === 'close') return;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus existing window if open
            const existingClient = clients.find((c) => c.url.includes(self.location.origin));
            if (existingClient) {
                existingClient.navigate(url);
                return existingClient.focus();
            }
            // Otherwise open new window
            return self.clients.openWindow(url);
        })
    );
});
