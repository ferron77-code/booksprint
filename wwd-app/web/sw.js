/* Worldwide Distributors: service worker.
   Lets the installed app OPEN with no signal. Always tries the network first,
   so a new deploy shows up on the next open whenever there is signal; falls back
   to the last copy on the phone only when the network is unreachable.
   Only this site's own files are cached. Supabase data never passes through here:
   the app keeps its own offline copy of jobs and its own queue of unsent work. */
const VERSION = '20260922-1912';
const CACHE = 'wwd-shell-' + VERSION;
const SHELL = ['./', 'index.html', 'office.html', 'tech.js', 'tech.css', 'config.js',
  'vendor/supabase.js', 'vendor/xlsx.mini.min.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wwd-shell-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, fonts: not ours
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const net = await fetch(req, { cache: 'no-store' });
      if (net && net.ok) cache.put(req, net.clone());
      return net;
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true })
        || (req.mode === 'navigate' ? await cache.match(url.pathname.endsWith('office.html') ? 'office.html' : 'index.html') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
