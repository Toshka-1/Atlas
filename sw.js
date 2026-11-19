// Atlas hors ligne : garde l'appli sur l'iPhone pour qu'elle s'ouvre sans réseau.
const C = "atlas-v18";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("lent")), ms); p.then((r) => { clearTimeout(t); res(r); }, (e) => { clearTimeout(t); rej(e); }); });
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    // réseau d'abord (pour les mises à jour), mais pas plus de 3 s : sinon la copie gardée
    e.respondWith(timeout(fetch(r), 3000).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match("./index.html"))));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); return res; }).catch(() => new Response("", { status: 504 }))));
  }
});
