const C='specimen-v14-admin-persistent';
const A=['./','./index.html','./admin.html','./supabase-fetch-fix.js','./cloud-sync.js','./admin-permissions.js','./admin-entry-gate.js','./direct-classify.js','./admin-return-ui-fix.js','./data-01.js','./data-02.js','./data-03.js','./data-04.js','./data-05.js','./data-06.js','./data-07.js','./data-08.js','./data-09.js','./data-10.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(x=>x.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
async function injectedIndex(){
  let r;
  try{r=await fetch('./index.html',{cache:'no-store'})}catch(_){r=await caches.match('./index.html')}
  let t=await r.text();
  if(!t.includes('supabase-fetch-fix.js'))t=t.replace('</body>','<script src="./supabase-fetch-fix.js"></script></body>');
  if(!t.includes('cloud-sync.js'))t=t.replace('</body>','<script src="./cloud-sync.js"></script></body>');
  if(!t.includes('admin-permissions.js'))t=t.replace('</body>','<script src="./admin-permissions.js"></script></body>');
  if(!t.includes('admin-entry-gate.js'))t=t.replace('</body>','<script src="./admin-entry-gate.js"></script></body>');
  if(!t.includes('direct-classify.js'))t=t.replace('</body>','<script src="./direct-classify.js"></script></body>');
  if(!t.includes('admin-return-ui-fix.js'))t=t.replace('</body>','<script src="./admin-return-ui-fix.js"></script></body>');
  return new Response(t,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'&&u.pathname.endsWith('/admin.html')){
    return e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./admin.html')));
  }
  if(e.request.mode==='navigate')return e.respondWith(injectedIndex());
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
