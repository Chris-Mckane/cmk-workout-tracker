// Cache-first service worker. Bump CACHE whenever any app file changes so phones pick up the new version.
const CACHE = 'cmk-wt-v50';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.json', 'icon.svg', 'app-icon-192.png', 'app-icon-512.png',
  'js/app.js', 'js/store.js', 'js/time.js', 'js/stats.js', 'js/ui.js', 'js/timers.js',
  'js/session.js', 'js/workouts.js', 'js/daily.js', 'js/summary.js', 'js/library.js', 'js/home.js', 'js/muscles.js', 'js/progress.js',
];

self.addEventListener('install', event => {
  // 'reload' skips the browser's HTTP cache, so a new version never caches stale copies of old files.
  const fresh = FILES.map(file => new Request(file, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// Anything not in the cache (tests.html) falls through to the network.
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request)));
});
