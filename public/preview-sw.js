// ARCHVISTA browser build: serves the generated website under /__preview/ for the in-app preview.
let files = {};
const types = { html: "text/html; charset=utf-8", js: "text/javascript", json: "application/json", glb: "model/gltf-binary", jpg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml", hdr: "application/octet-stream", css: "text/css" };
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("message", (e) => { if (e.data?.type === "files") { files = e.data.files; e.ports[0]?.postMessage("ok"); } });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (!u.pathname.startsWith("/__preview/")) return;
  const p = decodeURIComponent(u.pathname.slice("/__preview/".length)) || "index.html";
  const f = files[p];
  e.respondWith(f ? new Response(f, { headers: { "content-type": types[p.split(".").pop()] ?? "application/octet-stream" } }) : new Response("not found", { status: 404 }));
});
