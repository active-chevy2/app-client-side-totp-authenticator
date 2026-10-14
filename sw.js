// Service worker: lets the app open offline after the first visit.
//
// - App files, config.json and fonts are cached at install time.
// - Same-site requests try the network first, so updates arrive, and fall back to the cache offline.
// - Cross-site images (the logo) are cached the first time they load.
//
// Loaded secrets never reach this worker: they are read by the page from the
// file picker and stay in memory. Nothing secret is ever fetched or cached.

const CACHE_NAME = 'totp-app';

const APP_FILES = [
    './',
    'index.html',
    'style.css',
    'theme.js',
    'app-config.js',
    'parser.js',
    'totp.js',
    'app.js',
    'config.json',
    'manifest.webmanifest',
    'vendor/crypto-js.js',
    'fonts/roboto-latin-400-normal.woff2',
    'fonts/roboto-latin-500-normal.woff2',
    'fonts/roboto-latin-700-normal.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const sameSite = new URL(request.url).origin === self.location.origin;

    if (sameSite) {
        event.respondWith(networkFirst(request));
    } else if (request.destination === 'image') {
        event.respondWith(cacheFirst(request));
    }
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const shell = await cache.match('index.html');
            if (shell) return shell;
        }
        return Response.error();
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok || response.type === 'opaque') {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        return Response.error();
    }
}
