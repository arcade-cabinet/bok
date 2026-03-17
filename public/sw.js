// Bok PWA Service Worker — cache-first for hashed assets, network-first for navigation
const CACHE_VERSION = "bok-v1";

self.addEventListener("install", (event) => {
	// Activate immediately — don't wait for existing tabs to close
	self.skipWaiting();
	// Pre-cache the app shell (index.html will be cached on first navigation)
	event.waitUntil(caches.open(CACHE_VERSION));
});

self.addEventListener("activate", (event) => {
	// Claim all open tabs so they use this SW immediately
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	// Only handle GET requests
	if (request.method !== "GET") return;

	// Skip cross-origin requests (fonts CDN, analytics, etc.)
	if (!request.url.startsWith(self.location.origin)) return;

	// Navigation requests (HTML) — network-first so updates propagate
	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(() => caches.match(request)),
		);
		return;
	}

	// Static assets (JS, CSS, images, WASM) — cache-first since Vite content-hashes them
	event.respondWith(
		caches.match(request).then(
			(cached) =>
				cached ||
				fetch(request).then((response) => {
					// Only cache successful responses
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
					}
					return response;
				}),
		),
	);
});
