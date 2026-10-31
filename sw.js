// Cambia este numero cada vez que subas una version nueva
const CACHE_NAME = 'mis-finanzas-v25';
// Cache aparte para herramientas externas que no cambian (no se borra al actualizar la app)
const LIBS_CACHE = 'mis-finanzas-libs';
const SUPABASE_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.js';
const XLSX_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  SUPABASE_SDK
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== LIBS_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  // Herramienta de Excel: se descarga la primera vez y luego se usa la copia guardada (funciona sin internet)
  if (url === XLSX_LIB) {
    event.respondWith(
      caches.open(LIBS_CACHE).then((cache) =>
        cache.match(event.request).then((cached) =>
          cached || fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          })
        )
      )
    );
    return;
  }

  // Primero intenta internet (para recibir actualizaciones); si no hay conexion, usa la copia guardada.
  // Las llamadas a la nube (Supabase) y otros sitios pasan directo, sin cache.
  const sameOrigin = new URL(url).origin === self.location.origin;
  if (!sameOrigin && url !== SUPABASE_SDK) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && sameOrigin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
