const V='moedas-v4';
const SHELL=['./','index.html','manifest.json','assets/css/style.css','assets/icons/icon.svg',...['app','config','storage','sources','indicators','costs','analysis','patterns','portfolio','catalog','backup'].map(n=>`assets/js/${n}.js`)];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!(u.origin===location.origin||u.hostname==='cdn.jsdelivr.net'))return;
  e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match('./'))));
});
