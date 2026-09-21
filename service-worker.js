const CACHE_NAME = "jiaxin-v13-central";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json"
];

// 安裝新版 Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// 啟用新版，刪除舊快取
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

// 抓取策略
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.pathname.endsWith("/index.html");

  // HTML：優先抓網路最新版
  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match("./index.html")
          )
        )
    );

    return;
  }

  // 其他檔案：先讀快取，同時背景更新
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });

          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
