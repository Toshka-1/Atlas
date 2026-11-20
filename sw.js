// Atlas hors ligne : garde l'appli sur l'iPhone pour qu'elle s'ouvre sans réseau.
const C = "atlas-v23", PH = "atlas-photos", CFG = "atlas-cfg";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
// seules les anciennes versions de l'appli sont effacées : les photos et le réglage restent
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => /^atlas-v/.test(k) && k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("lent")), ms); p.then((r) => { clearTimeout(t); res(r); }, (e) => { clearTimeout(t); rej(e); }); });
// Photo : d'abord la copie du téléphone, sinon on la télécharge depuis le dépôt privé (avec le code enregistré dans l'appli).
async function photo(u) {
  const c = await caches.open(PH), hit = await c.match(u.href);
  if (hit) return hit;
  try {
    const cfg = await (await caches.open(CFG)).match(new URL("./__cfg", self.registration.scope).href), t = cfg ? (await cfg.json()).t : "";
    if (!t) return new Response("", { status: 404 });
    const id = decodeURIComponent(u.pathname.split("/_blob/")[1] || "");
    const r = await fetch("https://api.github.com/repos/Toshka-1/Atlas-data/contents/photos/" + encodeURIComponent(id) + ".jpg", { cache: "no-store", headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github.raw+json" } });
    if (!r.ok) return new Response("", { status: 404 });
    const res = new Response(await r.blob(), { headers: { "Content-Type": "image/jpeg" } });
    await c.put(u.href, res.clone());
    return res;
  } catch (e) { return new Response("", { status: 504 }); }
}
self.addEventListener("fetch", (e) => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin && u.pathname.indexOf("/_blob/") >= 0) { e.respondWith(photo(u)); return; }
  if (u.origin === self.location.origin) {
    // réseau d'abord (pour les mises à jour), mais pas plus de 3 s : sinon la copie gardée
    e.respondWith(timeout(fetch(r), 3000).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); } return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match("./index.html"))));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { const cp = res.clone(); caches.open(C).then((c) => c.put(r, cp)); return res; }).catch(() => new Response("", { status: 504 }))));
  }
});
