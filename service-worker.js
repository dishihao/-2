const C='specimen-v15-recovery';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.map(key=>caches.delete(key)));
  await self.clients.claim();
})()));

function injectScripts(html){
  const scripts=['supabase-fetch-fix.js','cloud-sync.js','admin-permissions.js','admin-entry-gate.js','direct-classify.js','admin-return-ui-fix.js'];
  for(const file of scripts){
    if(!html.includes(file)) html=html.replace('</body>',`<script src="./${file}"></script></body>`);
  }
  return html;
}

async function appResponse(){
  let response;
  try{
    response=await fetch('./index.html?sw='+Date.now(),{cache:'no-store'});
    if(!response.ok) throw new Error('index '+response.status);
  }catch(error){
    const cached=await caches.match('./index.html');
    if(!cached) throw error;
    response=cached;
  }
  const html=injectScripts(await response.text());
  const cache=await caches.open(C);
  cache.put('./index.html',new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}})).catch(()=>{});
  return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    if(url.pathname.endsWith('/admin.html')){
      event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response(`<!doctype html><meta charset="utf-8"><script>localStorage.setItem('specimen_admin_entry_visible_v2','1');location.replace('./?admin=1&v=recovery')</script>`,{headers:{'Content-Type':'text/html; charset=utf-8'}})));
    }else{
      event.respondWith(appResponse());
    }
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){
      const copy=response.clone();
      caches.open(C).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});
