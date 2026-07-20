const C='specimen-v7-cloud';
const A=['./','./index.html','./cloud-sync.js','./data-01.js','./data-02.js','./data-03.js','./data-04.js','./data-05.js','./data-06.js','./data-07.js','./data-08.js','./data-09.js','./data-10.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(x=>x.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
async function injectedIndex(){
  let r;
  try{r=await fetch('./index.html',{cache:'no-store'})}catch(_){r=await caches.match('./index.html')}
  let t=await r.text();
  if(!t.includes('cloud-sync.js'))t=t.replace('</body>','<script src="./cloud-sync.js"></script></body>');
  return new Response(t,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
self.addEventListener('fetch',e=>{
  if(e.request.mode==='navigate')return e.respondWith(injectedIndex());
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
