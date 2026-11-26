// Cache-first service worker. Bump CACHE whenever any app file changes so phones pick up the new version.
const CACHE = 'cmk-wt-v54';
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.json', 'icon.svg', 'cmk-gymapp-192.png', 'cmk-gymapp-512.png',
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

// The page and the manifest come from the network when online (and refresh the cache), so a
// new version and its name show on the next open; offline, the cache answers. Everything
// else is cache-first, and anything not cached (tests.html) falls through to the network.
const fromCache = request => caches.match(request, { ignoreSearch: true });
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode === 'navigate' || request.url.endsWith('manifest.json')) {
    event.respondWith(fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy));
        return response;
      })
      .catch(() => fromCache(request)));
    return;
  }
  event.respondWith(fromCache(request).then(hit => hit || fetch(request)));
});
