// Версия кэша — меняй при обновлении, чтобы сбросить старый кэш
const CACHE_NAME = 'reshebnik-v1';

// Список всех статичных ресурсов для предварительного кэширования
const STATIC_ASSETS = [
  './',                   // корневая страница
  'index.html',
  'style.css',
  'script.js',
  'manifest.json',
  'icon-192x192.png',
  'icon-512x512.png',
  '1.jpeg',
  '2.jpg',
  '3.jpg'
];

// Установочный этап: кэшируем все указанные файлы
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активируем новый SW и удаляем устаревшие кэши
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Перехват fetch-запросов
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // PHP/API-запросы: сначала сеть, при неудаче — кэш
  if (url.pathname.endsWith('.php')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Всё остальное: отдаём из кэша, если есть; иначе — из сети и кэшируем
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    }).catch(() => {
      // При офлайне и отсутствующем файле — показываем главную страницу
      return caches.match('index.html');
    })
  );
});