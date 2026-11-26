/* tema.js — logo, nombre y colores de la marca para TODAS las páginas (sitio 3D, planes, galería, invitaciones, reservar, panel).
   Los colores originales (verde Planeta Niños) están escritos en cada página como var(--t-xxxxxx, respaldo). Acá se recalculan a partir del color de la marca
   girando el tono y conservando luminosidad: el contraste y la legibilidad no se pierden con ninguna marca.
   Fuentes de la marca, en orden: demo (?d=código, ver abajo), parámetros ?color= ?color2= ?logo= ?nombre= (vista rápida; ?tema=borrar vuelve al original) y lo guardado en este navegador.
   DEMOS: ?d=<código> trae la marca, el mail y los planes de esa demo desde la fábrica de tuweeb, la guarda en el navegador y, en reservar y panel, activa el backend de demo (demo/backend.js). */
(function(){
var ORIG=/*ORIG*/["0e200b","0e220b","183214","1e3a19","223d1e","23431d","25a244","274422","2c5026","2f5429","305629","325a2b","355c2e","356030","386230","3f8a28","406c38","477a3d","5b7a52","6ee7c9","7cc23a","83b27c","8be3ae","b1c74d","d4e48a","dcea9a"]/*FIN*/,K='tuweeb-tema-v1',DK='tuweeb-demo-id-v1',CK='tuweeb-demo-cfg-v1:',REF='406c38',R=document.documentElement,cfg=null,q={};
var FABRICA=/*FABRICA*/"https://script.google.com/macros/s/AKfycbyTcTreVN0lQHTxzxbIEGoyF7g7UCDmAZekwLk_10tdAQSR3SbHWt-_bg1wr3ueZ9VK/exec"/*FIN*/;
var SCRIPT=document.currentScript&&document.currentScript.src||'',RAIZ=SCRIPT?new URL('.',SCRIPT).pathname:'/';
function ls(a,k,v){try{if(a==='g')return localStorage.getItem(k);if(a==='s')localStorage.setItem(k,v);else localStorage.removeItem(k)}catch(e){}return null}
function rgb(h){return[0,2,4].map(function(i){return parseInt(h.substr(i,2),16)})}
function toHsl(h){var c=rgb(h).map(function(v){return v/255}),M=Math.max.apply(0,c),m=Math.min.apply(0,c),l=(M+m)/2,s=0,H=0;if(M!==m){var d=M-m;s=l>.5?d/(2-M-m):d/(M+m);H=M===c[0]?(c[1]-c[2])/d+(c[1]<c[2]?6:0):M===c[1]?(c[2]-c[0])/d+2:(c[0]-c[1])/d+4;H*=60}return[H,s,l]}
function toHex(H,s,l){H=((H%360)+360)%360/360;function f(p,q2,t){t<0&&(t+=1);t>1&&(t-=1);return t<1/6?p+(q2-p)*6*t:t<.5?q2:t<2/3?p+(q2-p)*(2/3-t)*6:p}var r,g,b;if(!s)r=g=b=l;else{var q2=l<.5?l*(1+s):l+s-l*s,p=2*l-q2;r=f(p,q2,H+1/3);g=f(p,q2,H);b=f(p,q2,H-1/3)}return[r,g,b].map(function(v){return('0'+Math.round(v*255).toString(16)).slice(-2)}).join('')}
function limpio(c){c=String(c||'').trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(c))c=c.replace(/./g,'$&$&');return /^[0-9a-f]{6}$/i.test(c)?c.toLowerCase():''}
function logoOk(u){u=String(u||'').trim();return /^(https:\/\/|data:image\/(svg\+xml|png|jpeg|webp)|\.{0,2}\/[\w./-]+$)/i.test(u)?u:''}
try{new URLSearchParams(location.search).forEach(function(v,k){q[k]=v})}catch(e){}
if(q.tema==='borrar'){ls('r',K);ls('r',DK)}
try{cfg=JSON.parse(ls('g',K)||'null')}catch(e){}
if(q.color||q.color2||q.logo||q.nombre){cfg=cfg||{};if(q.color)cfg.color=limpio(q.color);if(q.color2)cfg.color2=limpio(q.color2);if(q.logo)cfg.logo=logoOk(q.logo);if(q.nombre)cfg.nombre=q.nombre.slice(0,60);ls('s',K,JSON.stringify(cfg))}
var mapa=null,T=window.TEMA={fabrica:FABRICA,color:'',color2:'',logo:'',nombre:'',delta:0,demo:null,raiz:RAIZ,aplicar:aplicar,guardar:guardar,listo:Promise.resolve()};

/* ── DEMOS ── */
var enRaiz=location.pathname.replace(/index\.html$/,'')===RAIZ;
function idDemo(){var d=String(q.d||'').toLowerCase();if(/^[a-z0-9][a-z0-9-]{2,29}$/.test(d)){ls('s',DK,JSON.stringify({id:d,t:Date.now()}));return d}
  var g=null;try{g=JSON.parse(ls('g',DK)||'null')}catch(e){}
  if(!g||!/^[a-z0-9][a-z0-9-]{2,29}$/.test(g.id||''))return '';
  /* el sitio principal sin ?d= solo recuerda la demo un rato (para "Volver al sitio"); reservar, panel y las demás páginas, 90 días */
  var vida=enRaiz?6*3600e3:90*864e5;if(Date.now()-(g.t||0)>vida){ls('r',DK);return ''}
  if(enRaiz)ls('s',DK,JSON.stringify({id:g.id,t:Date.now()}));return g.id}
function aDemo(d){return{color:d.color||'',color2:d.color2||'',color3:d.color3||'',color4:d.color4||'',logo:d.logo||'',logo3d:d.logo3d||'',nombre:d.nombre||''}}
var SUSP=false;function suspender(sus){SUSP=sus;var e=document.getElementById('tema-susp');if(!sus){if(e)e.remove();return}
  if(e)return;var mk=function(){if(!SUSP||document.getElementById('tema-susp'))return;var d=document.createElement('div');d.id='tema-susp';d.setAttribute('role','alert');
    d.style.cssText='position:fixed;inset:0;z-index:2147483600;display:grid;place-content:center;justify-items:center;gap:14px;padding:24px;text-align:center;background:linear-gradient(#2b1c44,#1a1026);color:#fbf9ff;font:600 16px Montserrat,system-ui,sans-serif';
    d.innerHTML='<img src="'+RAIZ+'reservar/tuweeb-icono.svg" alt="" width="72" height="72"><b style="font-size:20px">Este sitio está suspendido</b><span style="max-width:22rem;font-weight:500;opacity:.85;line-height:1.5">Por el momento no está disponible. Si sos el dueño, escribinos y lo reactivamos.</span><a href="https://wa.me/5493435020970" style="color:#fff;background:#e8693a;border-radius:999px;padding:12px 22px;text-decoration:none">Escribir a tuweeb</a>';
    (document.body||R).appendChild(d);try{document.documentElement.style.overflow='hidden'}catch(e){}};
  if(document.body)mk();else document.addEventListener('DOMContentLoaded',mk)}
function conDemo(d){T.demo=d;cfg=aDemo(d);suspender(!!d.suspendida)}
var id=q.tema==='borrar'?'':idDemo();
T.demoId=id;T.cliente=window.TUWEEB_CLIENTE===true;T.sinRecolor=window.TUWEEB_PROPIO===true;   /* web de un cliente con su marca ya definida (ej. Planeta Niños): se agrega <script>window.TUWEEB_PROPIO=true</script> antes de tema.js y NO se repinta con la paleta de la ficha */
if(id){
  /* en una demo nunca se ve el logo de Planeta Niños: queda oculto hasta que se cambia por el de la marca */
  var hs=document.createElement('style');hs.textContent='img[src*="planetaninos"]:not([data-t]),img[src*="logo-slogan"]:not([data-t]){visibility:hidden!important}';document.head.appendChild(hs);
  var cacheada=null;try{cacheada=JSON.parse(ls('g',CK+id)||'null')}catch(e){}
  /* web de un cliente: dirección, mapa y WhatsApp salen de lo que cargó en su panel (su planilla), no de la ficha de la demo */
  var conCliente=function(d){if(window.TUWEEB_CLIENTE!==true)return d;return fetch(RAIZ+'reservar/config.json').then(function(r){return r.json()}).then(function(cf){return fetch(cf.api+'?action=config'+(cf.cliente?'&cl='+encodeURIComponent(cf.cliente):''))}).then(function(r){return r.json()}).then(function(j){var c=j&&j.ok&&j.data;if(c){d.datos=Object.assign({},d.datos||{});['direccion','mapsUrl','whatsapp'].forEach(function(k){if(c[k])d.datos[k]=c[k]});if(c.whatsapp)d.whatsapp=String(c.whatsapp).replace(/\D/g,'')}return d}).catch(function(){return d})};
  var pedir=function(){return FABRICA?fetch(FABRICA+'?action=demo&id='+id).then(function(r){return r.json()}).then(function(j){if(!j||!j.ok||!j.data)throw 0;j.data.id=id;return conCliente(j.data)}).then(function(d){ls('s',CK+id,JSON.stringify(d));return d}):Promise.reject()};
  if(cacheada){cacheada.id=id;conDemo(cacheada);T.fresca=Promise.race([pedir().then(function(d){if(T.demo){T.demo.datos=d.datos;T.demo.fichaV=d.fichaV;T.demo.whatsapp=d.whatsapp;T._dd=null}return d}),new Promise(function(r){setTimeout(r,2500)})]).catch(function(){});pedir().then(function(d){if(T.demo){T.demo.creada=d.creada;T.demo.conPedido=d.conPedido;T.demo.suspendida=d.suspendida;suspender(!!d.suspendida);if(!d.suspendida)try{document.documentElement.style.overflow=''}catch(e){}}}).catch(function(){})}
  else{
    /* primera vez en este dispositivo: la página espera (hasta 5 s) la marca de la demo para no mostrar la de otro negocio */
    var st=document.createElement('style');st.id='tema-espera';st.textContent='html.tema-espera body{visibility:hidden}';document.head.appendChild(st);R.classList.add('tema-espera');
    /* mientras tanto: ni logo ni nombre de otro negocio; pantalla neutra de tuweeb y pestaña neutra */
    try{document.title='tuweeb · preparando tu weeb';var fv=document.querySelector('link[rel~=icon]');if(fv){fv.type='image/svg+xml';fv.href=RAIZ+'reservar/tuweeb-icono.svg'}
      var sp=document.createElement('div');sp.id='tema-splash';sp.setAttribute('role','status');sp.style.cssText='position:fixed;inset:0;z-index:2147483000;display:grid;place-content:center;justify-items:center;gap:14px;background:linear-gradient(#2b1c44,#1a1026);color:#fbf9ff;font:600 15px Montserrat,system-ui,sans-serif;visibility:visible';
      sp.innerHTML='<img src="'+RAIZ+'reservar/tuweeb-icono.svg" alt="" width="84" height="84" style="animation:tsp 1.4s ease-in-out infinite"><span>Preparando tu weeb…</span><style>@keyframes tsp{50%{transform:scale(1.08);opacity:.75}}@media(prefers-reduced-motion:reduce){#tema-splash img{animation:none!important}}</style>';
      (document.body||R).appendChild(sp);
      if(!document.body)document.addEventListener('DOMContentLoaded',function(){if(!sp.parentNode&&R.classList.contains('tema-espera'))document.body.appendChild(sp)})}catch(e){}
    T.listo=new Promise(function(ok){var fin=function(){R.classList.remove('tema-espera');var sp=document.getElementById('tema-splash');if(sp)sp.remove();ok()};var tm=null;var mal=function(){clearTimeout(tm);var sp=document.getElementById('tema-splash');if(sp){sp.innerHTML='<img src="'+RAIZ+'reservar/tuweeb-icono.svg" alt="" width="64" height="64"><span style="text-align:center;max-width:280px">No pudimos abrir esta demo. Revisá tu conexión o que el link esté completo.</span><button type="button" style="all:unset;cursor:pointer;background:#e8693a;color:#fff;padding:12px 22px;border-radius:999px;font-weight:700" onclick="location.reload()">Reintentar</button>'}else fin()};
      tm=setTimeout(mal,20000);
      pedir().then(function(d){clearTimeout(tm);conDemo(d);aplicar();T.tarde=true;if(/^tuweeb · preparando/.test(document.title))document.title=(T.nombre||'tuweeb')+(T.cliente?'':' · demo');if(window.__temaListo)window.__temaListo();fin()},function(){mal()})});
  }
  /* cinta de demo: en el sitio, planes, galería e invitaciones siempre se ve que es una demo y cómo entrar al panel */
  if(!T.cliente&&!/\/(crear\/|editor\.html)/.test(location.pathname)&&window.top===window.self){
    var VIDA=7*864e5;
    var cinta=function(){try{if(sessionStorage.getItem('tuweeb-cinta-x'))return}catch(e){}
      if(document.getElementById('tema-cinta'))return;
      var c=document.createElement('div');c.id='tema-cinta';c.style.cssText='position:fixed;top:calc(15px + env(safe-area-inset-top,0px));right:8px;z-index:90;display:flex;align-items:center;gap:5px;height:32px;box-sizing:border-box;padding:0 3px 0 9px;border-radius:999px;background:rgba(20,12,32,.72);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fbf9ff;font:600 10.5px/1 Montserrat,system-ui,sans-serif;white-space:nowrap;max-width:calc(100vw - 16px)';
      c.innerHTML='<span id="tema-reloj" title="Tiempo que le queda a esta demo" style="font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis"></span><a href="'+RAIZ+'panel/?d='+id+'&activar=1" style="color:#fff;background:#e8693a;border-radius:999px;height:26px;box-sizing:border-box;display:inline-flex;align-items:center;padding:0 9px;text-decoration:none;font-weight:700"></a><button type="button" aria-label="Cerrar" style="all:unset;cursor:pointer;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;font-size:15px;opacity:.7">×</button>';
      var ch=innerWidth<420;
      if(ch&&!document.getElementById('tema-cinta-css')){var cs=document.createElement('style');cs.id='tema-cinta-css';cs.textContent='.weeb-back{height:32px!important;padding:0 10px!important;font-size:11px!important;top:calc(15px + env(safe-area-inset-top,0px))!important;left:8px!important;gap:4px!important;box-sizing:border-box!important}';document.head.appendChild(cs)}
      document.body.appendChild(c);var alinear=function(){var wb=document.querySelector('.weeb-back');if(wb){var r=wb.getBoundingClientRect();if(r.height)c.style.top=Math.round(r.top+r.height/2-16)+'px'}};alinear();
      var rel=c.firstChild,act=c.querySelector('a'),p2=function(n){return n<10?'0'+n:''+n};
      var fit=function(){var wb=document.querySelector('.weeb-back');if(!wb)return;var x=c.querySelector('button'),f=c.style;f.fontSize='';act.style.padding='';x.style.display='';rel.style.fontSize='';
        var solapa=function(){return c.getBoundingClientRect().left<wb.getBoundingClientRect().right+4};
        if(solapa()){f.fontSize='9.5px';act.style.padding='0 7px';f.gap='3px'}
        if(solapa()){x.style.display='none';f.paddingRight='3px'}
        if(solapa()){rel.style.fontSize='9px';act.style.fontSize='9px'}};
      var tick=function(){alinear();fit();var d=T.demo||{};act.textContent=d.conPedido?'Ver mi pedido':'Activar mi web';
        if(!d.creada||d.conPedido){rel.style.display='none';c.style.paddingLeft='3px';return}
        rel.style.display='';c.style.paddingLeft='10px';var ms=new Date(d.creada).getTime()+VIDA-Date.now();
        if(!(ms>0)){rel.textContent='Demo vencida';return}
        var s=Math.floor(ms/1000),dd=Math.floor(s/86400);rel.textContent=(ch?'⏱ ':'Vence ')+(dd?dd+'d ':'')+p2(Math.floor(s%86400/3600))+':'+p2(Math.floor(s%3600/60))+':'+p2(s%60)};
      tick();var iv=setInterval(function(){if(!c.parentNode){clearInterval(iv);return}tick()},1000);
      c.querySelector('button').onclick=function(){c.remove();var x=document.getElementById('tema-cinta-css');if(x)x.remove();try{sessionStorage.setItem('tuweeb-cinta-x','1')}catch(e){}};};
    T.listo.then(function(){if(document.body)cinta();else document.addEventListener('DOMContentLoaded',cinta)});
  }
  if(!T.cliente&&/\/(reservar|panel)\/|\/(planes|galeria)(\.html)?$/.test(location.pathname)){document.write('<script src="'+RAIZ+'demo/backend.js?v=7"><\/script>')}
}

/* ── colores ── */
function guardar(c){cfg=c||null;c?ls('s',K,JSON.stringify(c)):ls('r',K);aplicar()}
T.mapHsl=function(h,s,l){if(!mapa||!T.color)return null;h=((h%360)+360)%360;if(h<60||h>175||s<.15||l<.08||l>.97)return null;var r=mapa([h,s,l]);return[((r[0]%360)+360)%360,r[1],r[2]]};
var FAM=null;
T.famHsl=function(h,s,l){if(!FAM)return null;h=((h%360)+360)%360;if(s<.5||l<.12||l>.95)return null;if(h>=60&&h<=175)return null;if(h>=8&&h<=42&&s<.66)return null;var f=h>=175&&h<270?FAM[2]:h>=270&&h<345?FAM[3]:(h>=345||h<25)?FAM[1]:FAM[0];if(f[1]<.12)return[f[0],f[1],Math.min(.95,Math.max(.12,l+(f[2]-.5)*.3))];return[f[0],Math.min(1,Math.max(.35,f[1]*(.55+.45*s))),Math.min(.95,Math.max(.14,l+(f[2]-.5)*.35))]};
T.colorear=function(c,url){if(T.sinRecolor||!mapa||!c||!c.getHSL||/#logo[.]svg/.test(url||''))return c;var q={h:0,s:0,l:0};c.getHSL(q,'srgb');var r=T.mapHsl(q.h*360,q.s,q.l)||T.famHsl(q.h*360,q.s,q.l);if(r)c.setHSL(r[0]/360,r[1],r[2],'srgb');return c};
T.hexEscena=function(x){var h=limpio(x);if(!h||!mapa)return x;var o=toHsl(h),r=T.mapHsl(o[0],o[1],o[2])||T.famHsl(o[0],o[1],o[2]);return r?'#'+toHex(r[0],r[1],r[2]):x};
/* primera visita: la página ya armó sus constantes de color (menú, barra, cursor…) con el verde original antes de conocer la marca; acá se corrigen una sola vez */
T.tarde=false;T.recolorear=function(l){if(!T.tarde||!mapa)return;T.tarde=false;l.forEach(function(p){if(p&&p[0]&&typeof p[0][p[1]]==='string')p[0][p[1]]=T.hex(p[0][p[1]])})};
T.hex=function(x){var h=limpio(x);if(!h||!mapa)return x;var o=toHsl(h),r=T.mapHsl(o[0],o[1],o[2]);return r?'#'+toHex(r[0],r[1],r[2]):x};
/* Logo para el 3D: solo si es un SVG; el visor lo extruye. Se devuelve con su proporción para encajarlo en el lugar del logo original */
function svg3d(u){if(!/^data:image\/svg\+xml/i.test(u||''))return null;try{var p=u.split(','),x=p.slice(1).join(','),t=/;base64/i.test(p[0])?atob(x):decodeURIComponent(x),vb=/viewBox\s*=\s*["']([^"']+)["']/.exec(t),w,h;if(vb){var n=vb[1].trim().split(/[\s,]+/).map(Number);w=n[2];h=n[3]}else{w=parseFloat((/\swidth\s*=\s*["']?([\d.]+)/.exec(t)||[])[1]);h=parseFloat((/\sheight\s*=\s*["']?([\d.]+)/.exec(t)||[])[1])}return w>0&&h>0?{url:u+'#logo.svg',aspect:w/h}:null}catch(e){return null}}
/* El visor 3D llama a esto con su lista de objetos cuando la marca ya está lista: cambia el logo y lo encaja en el lugar del original */
T.aplicarLoader=function(L){if(!L)return;
  try{
    if(T.plano){
      /* logo plano sobre su silueta, igual que en el 3D: el contorno se dibuja y después aparece el logo */
      var sp=T.logo3dRaw.split(','),sx=/;base64/i.test(sp[0])?atob(sp.slice(1).join(',')):decodeURIComponent(sp.slice(1).join(',')),vb=/viewBox\s*=\s*["']([^"']+)["']/.exec(sx),nn=vb?vb[1].trim().split(/[\s,]+/).map(Number):[0,0,100,100],fc=/fill="rgb\((\d+),(\d+),(\d+)\)"/.exec(sx),inner=sx.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
      L.svg=sx;var o=toHsl(T.color||'3F8A28');
      L.lineColor=fc&&(+fc[1]*.299+ +fc[2]*.587+ +fc[3]*.114)/255<.72?'rgb('+fc[1]+','+fc[2]+','+fc[3]+')':'#'+toHex(o[0],o[1],Math.min(o[2],.42));
      L.background='#ffffff';
      T.loaderImg='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="'+nn.join(' ')+'">'+inner+'<image href="'+T.logo+'" x="'+nn[0]+'" y="'+nn[1]+'" width="'+nn[2]+'" height="'+nn[3]+'"/></svg>');
      var hd='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="'+nn.join(' ')+'">';
      T.loaderSil='data:image/svg+xml;utf8,'+encodeURIComponent(hd+inner+'</svg>');
      T.loaderFront='data:image/svg+xml;utf8,'+encodeURIComponent(hd+'<image href="'+T.logo+'" x="'+nn[0]+'" y="'+nn[1]+'" width="'+nn[2]+'" height="'+nn[3]+'"/></svg>');
      T.silColor=fc?'rgb('+fc[1]+','+fc[2]+','+fc[3]+')':'';
      return}
    var u=T.logo;if(!/^data:image\/svg\+xml/i.test(u||''))return;var p=u.split(','),x=p.slice(1).join(','),t=/;base64/i.test(p[0])?atob(x):decodeURIComponent(x);L.svg=t;var o2=toHsl(T.color||'3F8A28');L.lineColor='#'+toHex(o2[0],o2[1],Math.min(o2[2],.42));L.background='#ffffff'
  }catch(e){}};
T.silBox=function(){try{var sp=T.logo3dRaw.split(','),sx=/;base64/i.test(sp[0])?atob(sp.slice(1).join(',')):decodeURIComponent(sp.slice(1).join(',')),vb=/viewBox\s*=\s*["']([^"']+)["']/.exec(sx),nn=vb[1].trim().split(/[\s,]+/).map(Number),x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,re=/\sd="([^"]+)"/g,m;
  while((m=re.exec(sx))){var tk=m[1].match(/[MLQZ]|-?[\d.]+/g)||[],i=0,cmd='';while(i<tk.length){if(/[MLQZ]/.test(tk[i])){cmd=tk[i++];continue}var n=cmd==='Q'?4:2,a=tk.slice(i,i+n).map(Number),px=a[n-2],py=a[n-1];if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;i+=n}}
  if(x1<=x0||y1<=y0)return null;return{W:nn[2],H:nn[3],cx:(x0+x1)/2,cy:(y0+y1)/2,bw:x1-x0,bh:y1-y0}}catch(e){return null}};
/* datos de contacto del sitio: en una demo, los de la demo (o genéricos si todavía no los cargó); nunca los de Planeta Niños */
T.datosDemo=function(){var d=T.demo;if(!d)return null;if(T._dd)return T._dd;var x=d.datos||{},c={};
  /* lo que se carga en el panel (Ajustes) de esta demo manda sobre lo del alta */
  try{var st=JSON.parse(localStorage.getItem('tuweeb-demo-v1:'+d.id)||'null'),f=st&&st.e&&st.e.hojas&&st.e.hojas.Config||[];f.forEach(function(r){if(r&&r[0])c[r[0]]=r[1]});if(d.fichaV&&localStorage.getItem('tuweeb-fv:'+d.id)!==d.fichaV){['direccion','mapsUrl'].forEach(function(k){if(x[k]!==undefined)c[k]=x[k]});if(x.whatsapp)c.whatsapp=x.whatsapp}}catch(e){}
  var wa=String(c.whatsapp||d.whatsapp||x.whatsapp||'').replace(/\D/g,''),dir=String(c.direccion||x.direccion||'').trim(),mp=String(c.mapsUrl||x.mapsUrl||'').trim();if(/^Tu direcci[oó]n/i.test(dir))dir='';
  return T._dd={nombre:d.nombre||T.nombre||'Tu salón',dir:dir,generica:!dir,wa:wa,tel:wa?'+'+wa:'',maps:mp||(dir?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(dir):'')}};
/* aviso para los botones que todavía no tienen su dato */
T.avisoSinConfig=function(tipo){var t=document.getElementById('tw-aviso');if(t)t.remove();var ws=/wa/.test(tipo||''),vd=/vid/.test(tipo||''),pn=T.demoId?T.raiz+'panel/?d='+T.demoId+(vd?'&activar=1':''):T.raiz+'panel/';
  t=document.createElement('div');t.id='tw-aviso';t.setAttribute('role','alertdialog');t.style.cssText='position:fixed;left:50%;bottom:max(96px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483200;width:min(92vw,380px);box-sizing:border-box;padding:16px 18px;border-radius:18px;background:rgba(22,16,34,.92);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:#fff;font:600 14px/1.45 Montserrat,system-ui,sans-serif;box-shadow:0 18px 40px -12px rgba(0,0,0,.6)';
  t.innerHTML='<b style="display:block;font-size:15px;margin-bottom:4px">Este botón todavía no está configurado</b><span style="opacity:.85;font-weight:500">'+(vd?'La animación y el video se activan con tu web. Activala desde tu panel.':(ws?'Agregá el WhatsApp del salón':'Agregá la dirección y el link de “Cómo llegar”')+' desde tu panel: Ajustes.')+'</span><div style="display:flex;gap:8px;margin-top:12px"><a href="'+pn+'" style="flex:1;text-align:center;padding:10px;border-radius:12px;background:#e8693a;color:#fff;text-decoration:none">'+(vd?'Activar mi web':'Ir al panel')+'</a><button type="button" style="flex:1;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.3);background:none;color:#fff;font:inherit;cursor:pointer">Cerrar</button></div>';
  t.querySelector('button').onclick=function(){t.remove()};document.body.appendChild(t);setTimeout(function(){if(t.parentNode)t.remove()},9000)};
/* en una demo ningún botón de WhatsApp funciona, aunque tenga número: se muestra el aviso */
document.addEventListener('click',function(e){if(!T.demoId||T.cliente||/\/panel\//.test(location.pathname))return;var a=e.target.closest&&e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"],a[href*="web.whatsapp.com"]');if(!a||a.closest('#tw-aviso'))return;e.preventDefault();e.stopImmediatePropagation();T.avisoSinConfig('#sin-config-wa')},true);
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#sin-config"]');if(!a)return;e.preventDefault();e.stopImmediatePropagation();T.avisoSinConfig(a.getAttribute('href'))},true);
T.aplicarDatos=function(P){var D=T.datosDemo();if(!D||!P)return;
  if(P.menu&&P.menu.items)P.menu.items.forEach(function(it){if(it&&/maps/.test(it.href||'')&&(D.maps||D.dir)){it.href='./mapa.html';it.newTab=false;it.ask='¿Ver cómo llegar?'}});
  var nom=D.nombre,wlink=(T.cliente&&D.wa)?'https://wa.me/'+D.wa+'?text='+encodeURIComponent('¡Hola! Quiero consultar por una reserva en '+nom+'.'):'';/* demo: el botón de WhatsApp nunca funciona; en la web de un cliente usa el WhatsApp que cargó en su panel */
  (P.sections||[]).forEach(function(s){if(s&&s.type==='footer'){
    if(T.sinRecolor){/* sitio propio del cliente: los datos de la ficha mandan, pero si faltan se conserva lo que ya tiene el sitio: nunca se pierde un dato básico */
      s.address=D.dir||s.address||'';s.phone=D.tel||s.phone||'';s.whatsapp=D.wa||s.whatsapp||'';return}
    s.address=D.dir||'Tu dirección, tu ciudad';s.phone=D.tel;s.whatsapp=D.wa;s.text='Salón de fiestas y eventos. ¡Tu fiesta, a tu manera!';
    s.col1Links=String(s.col1Links||'').split('\n').map(function(l){return /wa\.me/.test(l)?'Contacto | '+(wlink||'#sin-config-wa'):l}).filter(Boolean).join('\n')}});
  if(T.sinRecolor){if(P.fab){P.fab.phone=D.wa||P.fab.phone;P.fab.address=D.dir||P.fab.address;P.fab.mapUrl=D.maps||P.fab.mapUrl}return}
  if(P.menu&&P.menu.items)P.menu.items.forEach(function(it){if(!it)return;if(/maps/.test(it.href||'')){if(D.maps)it.href=D.maps;else{it.href='#sin-config-mapa';it.newTab=false;it.ask='Todavía no está configurado. ¿Ver cómo agregarlo?'}}else if(/wa\.me/.test(it.href||'')){if(wlink)it.href=wlink;else{it.href='#sin-config-wa';it.newTab=false;it.ask='Todavía no está configurado. ¿Ver cómo agregarlo?'}}});
  if(P.fab){P.fab.phone=D.wa;P.fab.address=D.dir;P.fab.mapUrl=D.maps;P.fab.waText='¡Hola! Quiero consultar por una reserva en '+nom+'.';if(!D.wa)P.fab.wa=false;if(!D.maps)P.fab.map=false}};
/* luz interna: un destello suave y centrado sobre la cara del cartel (PNG generado al vuelo), como el centro más claro de un panel con luz de fondo */
T.haloUrl=function(aspect){try{var cv=document.createElement('canvas'),w=256,h=Math.max(64,Math.min(512,Math.round(256/(aspect||1)))),x=cv.getContext('2d');cv.width=w;cv.height=h;x.setTransform(w/2,0,0,h/2,w/2,h/2);var g=x.createRadialGradient(0,0,0,0,0,1.05);g.addColorStop(0,'rgba(255,250,235,.62)');g.addColorStop(.45,'rgba(255,250,235,.38)');g.addColorStop(.8,'rgba(255,250,235,.14)');g.addColorStop(1,'rgba(255,250,235,0)');x.fillStyle=g;x.fillRect(-1,-1,2,2);return cv.toDataURL('image/png')}catch(e){return''}};
T.aplicarObjetos=function(OBJ){if(T.sinRecolor||!T.logo3d||!OBJ)return;var extra=[];OBJ.forEach(function(o){if(o&&/logo-slogan[.]svg/.test(o.url||'')){o.url=T.logo3d.url;var m=Math.min(5.014/T.logo3d.aspect,2.2)*1.18;(o.keyframes||[]).forEach(function(k){k.scale=k.scale*m});
  /* backlight: la placa brilla sola (material "neón") y sobre la cara va un destello suave en el centro. Sin resplandor por fuera */
  if(T.plano&&T.silColor){var sc0=T.silColor,rr=/^#/.test(sc0)?rgb(limpio(sc0)):(sc0.match(/[\d.]+/g)||[0,0,0]).slice(0,3).map(Number),hx=rr.map(function(v){return('0'+Math.max(0,Math.min(255,Math.round(v*1.0))).toString(16)).slice(-2)}).join('');o.mat='neon';o.matColor='#'+hx}var hu=T.haloUrl(T.logo3d.aspect);if(hu){var hl=JSON.parse(JSON.stringify(o));hl.url=hu;hl.ext=0;hl.bev=0;hl.seg=0;hl.shadows=false;hl.lit=false;hl.glow=0;hl.mat='matte';hl.keyframes.forEach(function(k){var sc=k.scale;k.scale=sc*.95;k.position=[k.position[0],k.position[1],k.position[2]+0.03*sc]});if(T.plano&&T.silColor)extra.push(hl)}
  /* logo plano: la silueta se extruye y el logo (imagen PNG sin fondo) se apoya adelante, sin tocarle los colores */
  if(T.plano){var c=JSON.parse(JSON.stringify(o));c.url=T.logo;c.ext=0;c.bev=0;c.shadows=false;c.lit=false;c.glow=0;
    /* la silueta 3D se centra y se escala por el borde de su trazo; el logo plano, por su cuadro entero: se alinean los dos */
    var bb=T.silBox();
    c.keyframes.forEach(function(k){var sc=k.scale,ox=0,oy=0,ks=1;if(bb){ks=bb.H/bb.bh;ox=(bb.W/2-bb.cx)/bb.bh*sc;oy=-(bb.H/2-bb.cy)/bb.bh*sc}k.position=[k.position[0]+ox,k.position[1]+oy,k.position[2]+T.dzPlano*sc];k.scale=sc*ks});extra.push(c)}}});
  extra.forEach(function(c){OBJ.push(c)})};
T.dzPlano=0.05;
function aplicar(){
  var c=cfg||{},col=limpio(c.color),col2=limpio(c.color2);T.color=col;T.color2=col2;T.color3=limpio(c.color3);T.color4=limpio(c.color4);T.logo=logoOk(c.logo);T.logo3dRaw=logoOk(c.logo3d);T.silColor='';try{var _t=T.logo3dRaw?(/;base64/i.test(T.logo3dRaw.split(',')[0])?atob(T.logo3dRaw.split(',').slice(1).join(',')):decodeURIComponent(T.logo3dRaw.split(',').slice(1).join(','))):'',_m=/fill="(rgb\([^"]+\)|#[0-9a-fA-F]{3,8})"/.exec(_t);if(_m)T.silColor=_m[1]}catch(e){}T.logo3d=svg3d(T.logo3dRaw||T.logo);T.plano=!!(T.logo3dRaw&&T.logo3d&&/^data:image\/png/i.test(T.logo));T.nombre=c.nombre||'';
  if(col&&col2&&toHsl(col)[1]<.12&&toHsl(col2)[1]>=.12){var tmp=col;col=col2;col2=tmp;T.color=col;T.color2=col2}
  if(T.sinRecolor){T.color=T.color2=T.color3=T.color4='';T.delta=0;return}
  if(!col){T.delta=0;return}
  var ref=toHsl(REF),refA=toHsl('b1c74d'),b=toHsl(col),b2=col2?toHsl(col2):b,gris=b[1]<.12,
      /* tono de los fondos oscuros: rojos, naranjas, amarillos y rosas oscuros se ven bordó, marrón u oliva (feo en un salón infantil). Si la marca es de esos tonos, los fondos usan otro color de la paleta; si no hay, un violeta profundo. Los botones y destacados siguen con los colores de la marca */
      sucio=function(h){return h<=70||h>=325},
      bgb=(function(){if(gris||!sucio(b[0]))return b;var alt=[c.color2,c.color3,c.color4].map(limpio).filter(Boolean).map(toHsl).filter(function(x){return x[1]>=.2&&!sucio(x[0])})[0];return alt||[228,.3,.4]})(),
      dH=gris?0:bgb[0]-ref[0],
      ratio=gris?.06:Math.min(1.25,Math.max(.25,bgb[1]/ref[1])),ratioA=b2[1]<.12?.06:Math.min(1.4,Math.max(.3,b2[1]/refA[1]));
  T.delta=dH;T.tono=b[0];
  (function(){var h1=b,h2=col2?toHsl(col2):null,h3=limpio(c.color3)?toHsl(limpio(c.color3)):null,h4=limpio(c.color4)?toHsl(limpio(c.color4)):null;
    function sh(x,dh,dl){return[(x[0]+dh+360)%360,x[1],Math.min(.85,Math.max(.25,x[2]+dl))]}
    var f2=h2||sh(h1,38,.04),f3=h3||sh(h1,-32,.08),f4=h4||sh(h2||h1,32,-.04);
    FAM=[h1,f2,f3,f4]})();
  var st=R.style;
  /* fondos y tonos oscuros: el tono de la marca; destacados claros: el color de la marca (o el segundo color si lo hay) */
  mapa=function(x){var ac=x[2]>=.5;return ac?[b2[0],Math.min(1,x[1]*ratioA),x[2]]:[((x[0]+dH)%360+360)%360,Math.min(1,Math.max(x[1]*ratio,gris?0:bgb[1]*.5*(1-x[2]))),x[2]]};
  ORIG.forEach(function(h){var n=toHex.apply(0,mapa(toHsl(h)));st.setProperty('--t-'+h,'#'+n);st.setProperty('--t-'+h+'-rgb',rgb(n).join(','))});
  var m=document.querySelector('meta[name=theme-color]');m&&m.setAttribute('content','#'+toHex(ref[0]+dH,Math.min(1,ref[1]*ratio),ref[2]));  /* tarjetas que se apilan: cada una con un color de la marca, siempre lo bastante oscuro para que el texto blanco se lea (contraste mínimo 6) */
  (function(){function lum(hex){var q=rgb(hex).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*q[0]+.7152*q[1]+.0722*q[2]}
    FAM.forEach(function(f,i){var l=Math.min(.42,Math.max(.2,f[2])),sat=Math.min(.7,Math.max(.3,f[1])),hx=toHex(f[0],sat,l),g=0;
      while(1.05/(lum(hx)+.05)<6&&g++<40){l-=.015;hx=toHex(f[0],sat,l)}
      st.setProperty('--sc'+(i+1),'#'+hx);st.setProperty('--sc'+(i+1)+'-t','#'+toHex(f[0],Math.min(.9,sat+.1),.86))});
    st.setProperty('--sc-fg','#fff')})();
}
var NOM=/Planeta Ni[ñn]os/gi;
/* en una demo, lo que quedó escrito del lugar original (dirección, teléfono, ciudad) se reemplaza por lo de la demo o por algo genérico */
function dato(v){var D=T.datosDemo&&T.datosDemo();if(!D||!v)return v;
  return v.replace(/Av\.? Los Cisnes 2351,? Oro Verde(, Entre R[ií]os)?/gi,D.dir||'Tu dirección, tu ciudad').replace(/343 ?622 ?22 ?63|\+?5493436222263/g,D.tel||'').replace(/\s*(en|,)\s*Oro Verde(, Entre R[ií]os)?/gi,'')}
function logos(){
  if(!T.logo)return;
  var st=document.createElement('style');st.textContent='.tw3d{content:url("'+T.logo.replace(/"/g,'%22')+'")!important}';document.head.appendChild(st);
  document.querySelectorAll('img[src*="planetaninos-logo"],img[src*="planetaninos-marciano"],img[src*="logo-slogan"]').forEach(function(i){i.src=T.logo;i.setAttribute('data-t','1');if(T.nombre)i.alt=T.nombre});
  var f=document.querySelector('link[rel~=icon]');if(f)f.href=T.logo;
}
function nombres(raiz){
  if(!T.nombre)return;var w=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT,null),n,lista=[];
  while(n=w.nextNode()){var p=n.parentNode&&n.parentNode.nodeName;if(p==='SCRIPT'||p==='STYLE')continue;NOM.lastIndex=0;if(NOM.test(n.nodeValue)||(T.demo&&/Oro Verde|Los Cisnes|622 ?22 ?63|3436222263/i.test(n.nodeValue)))lista.push(n)}
  lista.forEach(function(x){x.nodeValue=dato(x.nodeValue.replace(NOM,T.nombre))});
  var DD=T.datosDemo&&T.datosDemo();if(T.demo&&DD&&DD.wa&&raiz.querySelectorAll)raiz.querySelectorAll('a[href*="3436222263"]').forEach(function(a){a.href='https://wa.me/'+DD.wa});
  raiz.querySelectorAll&&raiz.querySelectorAll('[alt],[aria-label],[content]').forEach(function(e){['alt','aria-label','content'].forEach(function(a){var v=e.getAttribute(a);if(v&&/Planeta Ni[ñn]os/i.test(v))e.setAttribute(a,v.replace(NOM,T.nombre))})});
}
function textos(){
  if(!T.nombre)return;nombres(document.body);if(/Planeta Ni[ñn]os|Oro Verde/i.test(document.title))document.title=dato(document.title.replace(NOM,T.nombre));if(T.demo&&!T.cliente){var rb=document.querySelector('meta[name=robots]')||document.head.appendChild(Object.assign(document.createElement('meta'),{name:'robots'}));rb.content='noindex,nofollow'}
  var pend=0;new MutationObserver(function(){if(pend)return;pend=setTimeout(function(){pend=0;nombres(document.body)},120)}).observe(document.body,{childList:true,subtree:true,characterData:true});
}
/* el botón de mapa abre "cómo llegar" encima del sitio (sin salir ni recargar el 3D); si no se puede, abre Google Maps como siempre */
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a.fab__map');if(!a||e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;if(window.__weebOpenPage&&window.__weebOpenPage('./mapa.html')){e.preventDefault();e.stopPropagation()}},true);
/* dentro de una demo, los enlaces del sitio llevan el código: así "Volver al sitio" y los botones no pierden la marca */
function enlaces(){
  if(!T.demo)return;
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target==='_blank'||a.hasAttribute('download'))return;
    try{var u=new URL(a.href,location.href);if(u.origin===location.origin&&!u.searchParams.has('d')&&!/^(#|mailto:|tel:)/.test(a.getAttribute('href'))){u.searchParams.set('d',T.demo.id);a.href=u.href}}catch(x){}},true);
  /* el panel instalado como app abre la demo directamente */
  if(/\/panel\//.test(location.pathname)){var m=document.querySelector('link[rel=manifest]');if(m)fetch(m.href).then(function(r){return r.json()}).then(function(j){j.start_url='./?d='+T.demo.id;j.name='Panel '+(T.nombre||'demo');j.short_name=(T.nombre||'Panel').slice(0,12);m.href=URL.createObjectURL(new Blob([JSON.stringify(j)],{type:'application/manifest+json'}))}).catch(function(){})}
}
function listo(){logos();textos();enlaces();if(T.logo){var pl=0;new MutationObserver(function(){if(pl)return;pl=setTimeout(function(){pl=0;document.querySelectorAll('img[src*="planetaninos-logo"],img[src*="planetaninos-marciano"],img[src*="logo-slogan"]').forEach(function(i){if(i.src!==T.logo)i.src=T.logo;i.setAttribute('data-t','1')})},120)}).observe(document.body,{childList:true,subtree:true})}}
aplicar();
/* si la marca de la demo llega tarde (primera visita), se aplica apenas llega */
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){T.listo.then(function(){if(!T.__ok){T.__ok=1;listo()}})});else T.listo.then(function(){if(!T.__ok){T.__ok=1;listo()}});
})();
