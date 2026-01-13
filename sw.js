
const CACHE_NAME = 'karma-chakra-v1';
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
