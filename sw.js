// Service Worker for Bee Neural Beats
const CACHE_NAME = 'bee-neural-beats-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/tone-audio.js',
  '/bee-logo.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Remove previous app caches when the updated worker activates.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('bee-neural-beats-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for audio persistence
self.addEventListener('sync', (event) => {
  if (event.tag === 'audio-sync') {
    event.waitUntil(
      // Send message to main thread to maintain audio
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'MAINTAIN_AUDIO',
            timestamp: Date.now()
          });
        });
      })
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
