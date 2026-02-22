// Service Worker — Network-first strategy
// Always fetches fresh content, falls back to cache when offline
var CACHE = 'bklib-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE; })
          .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  // Skip non-GET and chrome-extension requests
  if (e.request.method !== 'GET') return;
  if (url.indexOf('chrome-extension') === 0) return;

  // For navigation (HTML page) — network first, cache fallback
  if (e.request.mode === 'navigate' || url.indexOf('.html') > -1) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // For Google Sheets JSONP — always network, no cache
  if (url.indexOf('docs.google.com') > -1) {
    return;
  }

  // For API calls (covers) — network first, cache fallback
  if (url.indexOf('googleapis.com') > -1 || url.indexOf('openlibrary.org') > -1 || url.indexOf('covers.openlibrary.org') > -1) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // For fonts and other static — cache first, then network
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return resp;
      });
    })
  );
});
