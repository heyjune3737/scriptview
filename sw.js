const CACHE = 'creatorview-v5';
const ASSETS = ['./', 'index.html', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE && k !== 'share-target-cache').map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Share Target POST handling (mobile file sharing)
  if (e.request.method === 'POST' && url.searchParams.has('share-target')) {
    e.respondWith((async () => {
      const formData = await e.request.formData();
      const file = formData.get('file');
      if (file) {
        const cache = await caches.open('share-target-cache');
        await cache.put('shared-file', new Response(await file.text(), {
          headers: { 'Content-Type': 'text/plain' }
        }));
        return Response.redirect(url.pathname + '?share-target=1&name=' + encodeURIComponent(file.name), 303);
      }
      return Response.redirect(url.pathname, 303);
    })());
    return;
  }

  // Normal fetch: network first, cache fallback
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
