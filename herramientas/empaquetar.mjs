// Toma el index.html exportado del editor y arma el sitio rápido en una carpeta:
//   1) app.js propio (three, react, etc. empaquetados: no depende de esm.sh ni unpkg)
//   2) contador desde el primer segundo + precarga de los modelos pesados
//   3) piezas SVG ya armadas (bk-lite / bk-full) para que no se construyan al abrir
// Uso:  node empaquetar.mjs exportado.html carpeta-salida [http://localhost:PUERTO/carpeta-salida/]
// (el tercer parámetro es la dirección desde donde se sirve la carpeta de salida; hace falta para el paso 3)
import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import * as esb from 'esbuild';
import {open} from './navegador-sandbox.mjs';
const [src, out, urlSalida] = [process.argv[2], process.argv[3], process.argv[4]];
const MODELOS_PESADOS = (process.env.PRECARGA || 'nena.glb,nene.glb,techo-pelotero.glb,arbustos-3d.glb').split(',').filter(Boolean);
let h = fs.readFileSync(src, 'utf8');
fs.mkdirSync(out, {recursive: true});
// 1) código
const a = h.indexOf('<script type="module">'), b = h.indexOf('</script>', a);
if (a < 0) throw new Error('No encontré el script del sitio en el index exportado');
const codigo = h.slice(a + '<script type="module">'.length, b);
const r = await esb.build({stdin: {contents: codigo, resolveDir: process.cwd(), loader: 'js'}, bundle: true, minify: true, format: 'esm', target: 'es2020',
  define: {'process.env.NODE_ENV': '"production"'}, legalComments: 'none', write: false, logLevel: 'error'});
const appJs = r.outputFiles[0].text; fs.writeFileSync(path.join(out, 'app.js'), appJs);
const TOTAL = Buffer.byteLength(appJs);
fs.copyFileSync(path.join(process.cwd(), 'node_modules/lenis/dist/lenis.min.js'), path.join(out, 'lenis.min.js'));
// 2) index
h = h.slice(0, a) + h.slice(b + '</script>'.length);
h = h.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');
h = h.replace(/<script[^>]*src="[^"]*lenis[^"]*"[^>]*><\/script>/, '<script src="./lenis.min.js"></script>');
const preload = MODELOS_PESADOS.map(f => `<link rel="preload" as="fetch" crossorigin="anonymous" href="./assets/models/${f}">`).join('\n');
const pre = `<!-- Modelos pesados: se empiezan a bajar desde el primer instante, en paralelo con el código -->
${preload}
<script>
/* Contador desde el primer segundo: mide la descarga real del código (hasta el 35 por ciento); después el cargador sigue desde ese número, sin volver a cero.
   Las piezas SVG ya armadas (bk-lite / bk-full) también se empiezan a bajar acá. */
(function(){
var TOTAL=${TOTAL},got=0,shown=0,el=null,last=performance.now();window.__preCount=0;
function tick(n){var dt=Math.min(.05,(n-last)/1e3);last=n;
 el=el||document.querySelector('#pre-ldr span');
 if(el&&!el.isConnected)return;
 shown+=(Math.min(35,got/TOTAL*35)-shown)*(1-Math.exp(-dt*6));window.__preCount=shown;
 if(el)el.textContent=String(Math.min(99,Math.floor(shown))).padStart(3,'0');
 requestAnimationFrame(tick);}
requestAnimationFrame(tick);
function plain(){var s=document.createElement('script');s.type='module';s.src='./app.js';document.body.appendChild(s);}
function go(blob){window.__preMs=performance.now();import(URL.createObjectURL(blob)).catch(plain);}
try{var _ph=window.matchMedia&&matchMedia('(pointer: coarse)').matches,_q=new URLSearchParams(location.search).get('q'),_t=(_q==='2'?false:(_q==='1'||_q==='0')?true:_ph)?'lite':'full';
 ['json','bin.gz'].forEach(function(e){var l=document.createElement('link');l.rel='preload';l.as='fetch';l.crossOrigin='anonymous';l.href='./bk-'+_t+'.'+e;document.head.appendChild(l);});}catch(e){}
fetch('./app.js').then(function(r){var rd=r.body.getReader(),ch=[];
 function pump(){return rd.read().then(function(x){if(x.done)return;ch.push(x.value);got+=x.value.length;return pump();});}
 return pump().then(function(){return new Blob(ch,{type:'text/javascript'});});})
.then(function(b){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){go(b)});else go(b);})
.catch(function(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',plain);else plain();});
})();
</script>
`;
const k = h.indexOf('<script src="./lenis.min.js"></script>');
h = k > 0 ? h.slice(0, k) + pre + h.slice(k) : h.replace('</head>', pre + '</head>');
fs.writeFileSync(path.join(out, 'index.html'), h);
console.log('EMPAQUETADO app.js', Math.round(TOTAL / 1024), 'KB');
// 3) piezas ya armadas (hace falta el sitio servido)
if (urlSalida) {
  for (const [q, nombre] of [['1', 'bk-lite'], ['2', 'bk-full']]) {
    for (const e of ['json', 'bin.gz']) fs.rmSync(path.join(out, nombre + '.' + e), {force: true});
    const {b: br, pg} = await open(urlSalida + 'index.html?q=' + q, {w: 1400, h: 900});
    let last = -1, est = 0;
    for (let i = 0; i < 1000; i++) {
      const s = await pg.evaluate(() => ({st: window.__wbStarted || 0, pe: window.__wbPend || 0, n: window.__SVG_GEO ? window.__SVG_GEO.size : 0})).catch(() => null);
      if (s && s.st > 0 && s.pe === 0) { est = s.n === last ? est + 1 : 0; last = s.n; if (est >= 6) break; }
      await pg.waitForTimeout(1000);
    }
    const res = await pg.evaluate(() => {
      const man = {}, chunks = []; let off = 0;
      const push = (ta) => { const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength); const pad = (4 - (off % 4)) % 4; if (pad) { chunks.push(new Uint8Array(pad)); off += pad; } const o = off; chunks.push(u8.slice()); off += u8.byteLength; return [o, ta.length]; };
      for (const [k, e] of window.__SVG_GEO) {
        man[k] = {asp: e.built.aspect, rev: !!e.built.rev, parts: e.built.parts.map(pt => { const g = pt.geo, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
          const o = {c: [pt.color.r, pt.color.g, pt.color.b], p: push(new Float32Array(p.array)), n: n ? push(new Float32Array(n.array)) : null, u: u ? push(new Float32Array(u.array)) : null};
          if (g.index) { const big = p.count > 65535; o.i = push(big ? new Uint32Array(g.index.array) : new Uint16Array(g.index.array)); o.big = big; }
          return o; })};
      }
      const tot = new Uint8Array(off); let c = 0; chunks.forEach(x => { tot.set(x, c); c += x.byteLength; });
      let bin = ''; for (let i = 0; i < tot.length; i += 32768) bin += String.fromCharCode.apply(null, tot.subarray(i, i + 32768));
      return {man, b64: btoa(bin), n: window.__SVG_GEO.size};
    });
    fs.writeFileSync(path.join(out, nombre + '.json'), JSON.stringify(res.man));
    fs.writeFileSync(path.join(out, nombre + '.bin.gz'), zlib.gzipSync(Buffer.from(res.b64, 'base64'), {level: 9}));
    console.log('PIEZAS', nombre, res.n, 'formas', Math.round(fs.statSync(path.join(out, nombre + '.bin.gz')).size / 1024), 'KB');
    await br.close();
  }
}
console.log('LISTO', out);
