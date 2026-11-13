// 計算機 Service Worker：讓 App 可以離線開啟
const CACHE = 'calc-v1';
const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // 匯率 API 不快取（頁面自己會把匯率存在 localStorage）
    if (url.hostname === 'open.er-api.com') return;

    // 頁面本身：網路優先，離線時用快取
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // 其他資源（Tailwind、字型、圖示）：先用快取，背景更新
    event.respondWith(
        caches.match(req).then((cached) => {
            const network = fetch(req)
                .then((res) => {
                    if (res.ok || res.type === 'opaque') {
                        const copy = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});
