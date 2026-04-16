/* Squad App — Service Worker
 * Gère le cache et l'installation comme PWA.
 * Version v1 — Incrémente CACHE_VERSION à chaque mise à jour du HTML pour forcer la MAJ chez les testeuses.
 */

const CACHE_VERSION = "squad-v1";
const CORE_ASSETS = [
  "./",
  "./app.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Installation : mise en cache des ressources principales
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn("[SW] Échec mise en cache partielle :", err);
      });
    })
  );
});

// Activation : suppression des anciens caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Stratégie : network-first pour la page HTML (pour voir les MAJ rapidement), cache-first pour le reste
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNavigate = request.mode === "navigate" || request.destination === "document";

  if (isNavigate) {
    // Network-first pour le HTML
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("./app.html")))
    );
    return;
  }

  // Cache-first pour les autres ressources
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
