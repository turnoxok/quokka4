/* estado-web.js — cartel de "sitio suspendido" para las webs finales de los clientes.
   Uso: <script src="https://demo.tuweeb.com/estado-web.js" data-id="CODIGO_DEL_CLIENTE" defer></script>
   Si tuweeb marca la web como suspendida (desde el admin), tapa la página con un cartel. Si no hay conexión con tuweeb, la web sigue funcionando normal. */
(function(){
var s=document.currentScript,id=s&&s.getAttribute('data-id');if(!/^[a-z0-9][a-z0-9-]{2,29}$/.test(id||''))return;
var F='https://script.google.com/macros/s/AKfycbyTcTreVN0lQHTxzxbIEGoyF7g7UCDmAZekwLk_10tdAQSR3SbHWt-_bg1wr3ueZ9VK/exec',K='tuweeb-susp:'+id;
var ON=false;function cartel(on){ON=on;var e=document.getElementById('tuweeb-susp');if(!on){if(e)e.remove();document.documentElement.style.overflow='';return}
  if(e)return;var mk=function(){if(!ON||document.getElementById('tuweeb-susp'))return;var d=document.createElement('div');d.id='tuweeb-susp';d.setAttribute('role','alert');
    d.style.cssText='position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;justify-items:center;gap:14px;padding:24px;text-align:center;background:linear-gradient(#2b1c44,#1a1026);color:#fbf9ff;font:600 16px Montserrat,system-ui,sans-serif';
    d.innerHTML='<b style="font-size:20px">Este sitio está suspendido</b><span style="max-width:22rem;font-weight:500;opacity:.85;line-height:1.5">Por el momento no está disponible. Si sos el dueño, escribinos y lo reactivamos.</span><a href="https://wa.me/5493435020970" style="color:#fff;background:#e8693a;border-radius:999px;padding:12px 22px;text-decoration:none">Escribir a tuweeb</a>';
    document.body.appendChild(d);document.documentElement.style.overflow='hidden'};
  if(document.body)mk();else document.addEventListener('DOMContentLoaded',mk)}
try{if(localStorage.getItem(K)==='1')cartel(true)}catch(e){}
fetch(F+'?action=estadoWeb&id='+id).then(function(r){return r.json()}).then(function(j){if(!j||!j.ok)return;var sus=!!j.data.suspendida;try{localStorage.setItem(K,sus?'1':'0')}catch(e){}cartel(sus)}).catch(function(){});
})();
