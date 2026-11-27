'use strict';
/* hs de juego — página pública. Todo el texto entra con textContent (nunca innerHTML). */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], DSEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const $ = (s, r = document) => r.querySelector(s), money = n => '$' + Math.round(n || 0).toLocaleString('es-AR');
const flarga = f => { const [y, m, d] = f.split('-').map(Number), t = new Date(y, m - 1, d); return `${DSEM[t.getDay()]} ${d} de ${MESES[m - 1]}`; };
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'value') e.value = v; else e.setAttribute(k, v === true ? '' : v); }
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}
const S = { cfg: null, pub: null, slots: [], timer: null, poll: null };
async function llamar(action, data, post) {
  const base = { action, ...(S.cfg.cliente ? { cl: S.cfg.cliente } : {}), ...(data || {}) };
  let r, j; const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 45000);
  try { r = await fetch(S.cfg.api + (post ? '' : '?' + new URLSearchParams(base)), post ? { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(base), signal: ctl.signal } : { signal: ctl.signal }); j = await r.json(); }
  catch (e) { throw new Error(e && e.name === 'AbortError' ? 'Está tardando demasiado. Probá de nuevo en un momento.' : 'No hay conexión. Revisá tu internet y probá de nuevo.'); } finally { clearTimeout(tm); }
  if (!j.ok) { const e = new Error(j.mensaje || j.error); e.codigo = j.error; throw e; } return j.data;
}
const wa = txt => S.pub && S.pub.whatsapp ? 'https://wa.me/' + String(S.pub.whatsapp).replace(/\D/g, '') + (txt ? '?text=' + encodeURIComponent(txt) : '') : '';
const colorSalon = id => (S.cfg.colores && S.cfg.colores[id]) || '#c0a3ff';
function pagina(...c) { clearInterval(S.timer); clearInterval(S.poll); $('#app').replaceChildren(h('div', { class: 'page' }, h('div', { class: 'hero' }, h('a', { class: 'volver', href: '../' }, '← Volver al sitio'), (S.pub && S.pub.logoUrl ? h('img', { src: S.pub.logoUrl, alt: S.pub.nombre, onerror: e => e.target.remove() }) : ''), h('h1', null, 'hs de juego'), h('p', null, 'Elegí un horario, reservá tu mesa y que los chicos se la pasen genial.')), h('div', { class: 'cont' }, ...c))); window.scrollTo(0, 0); }

async function iniciar() {
  S.cfg = await fetch('../reservar/config.json', { cache: 'no-store' }).then(r => r.json());
  try { S.pub = await llamar('config'); } catch (e) { $('#app').replaceChildren(h('div', { class: 'vacio' }, h('p', null, e.message), h('button', { class: 'btn', onclick: () => location.reload() }, 'Reintentar'))); return; }
  document.title = 'hs de juego · ' + S.pub.nombre;
  const cod = new URLSearchParams(location.search).get('codigo');
  if (cod) return estado({ codigo: cod }); lista();
}
async function lista() {
  pagina(h('p', { class: 'centro' }, 'Buscando horarios…'));
  let d; try { d = await llamar('juego'); } catch (e) { return pagina(h('div', { class: 'err' }, e.message), h('button', { class: 'btn', onclick: lista }, 'Reintentar')); }
  S.slots = d.slots;
  const miRes = h('button', { class: 'link', onclick: consultar }, 'Ya reservé: ver mi reserva');
  if (!S.slots.length) return pagina(h('div', { class: 'vacio' }, h('h2', null, 'Todavía no hay horarios'), h('p', { class: 'mini' }, 'Cuando abramos nuevos horarios de hs de juego los vas a ver acá.'), wa('Hola! Quiero saber cuándo hay hs de juego.') ? h('a', { class: 'btn alt', href: wa('Hola! Quiero saber cuándo hay hs de juego.'), target: '_blank', rel: 'noopener' }, 'Preguntanos por WhatsApp') : ''), miRes);
  const porDia = {}; S.slots.forEach(s => (porDia[s.fecha] = porDia[s.fecha] || []).push(s)); let n = 0;
  const bloques = Object.keys(porDia).sort().map(f => [h('h2', { class: 'dia' }, flarga(f)), porDia[f].map(s => tarjeta(s, n++))]);
  pagina(bloques, h('div', { class: 'centro' }, miRes));
  requestAnimationFrame(() => setTimeout(() => document.querySelectorAll('.barra i').forEach(i => (i.style.width = i.dataset.w), 80), 120));
}
function tarjeta(s, n) {
  const ocupadas = s.anotados, pct = Math.round(ocupadas / s.cupo * 100), poco = s.libres > 0 && s.libres <= Math.max(1, Math.ceil(s.cupo * .25));
  return h('div', { class: 'slot', style: `--sc:${colorSalon(s.salonId)};animation-delay:${n * 90}ms` },
    h('div', { class: 'hh' }, h('b', null, `${s.inicio} a ${s.fin}`), s.salon ? h('span', null, s.salon) : ''),
    h('p', { class: 'pre' }, `${money(s.precio)} por niño · los adultos no pagan`),
    s.flyer ? h('img', { class: 'flyer', src: s.flyer, alt: 'Flyer de hs de juego', loading: 'lazy', onerror: e => e.target.remove() }) : '',
    h('div', { class: 'barra' + (poco ? ' casi' : ''), role: 'img', 'aria-label': `Quedan ${s.libres} de ${s.cupo} mesas` }, h('i', { 'data-w': pct + '%' })),
    h('p', { class: 'quedan' }, s.completo ? 'Mesas completas' : `Quedan ${s.libres} de ${s.cupo} mesas${poco ? ' · ¡se están yendo!' : ''}`),
    h('button', { class: 'btn', disabled: s.completo, onclick: () => formulario(s) }, s.completo ? 'Completo' : 'Reservar mi mesa'));
}
function stepper(titulo, sub, min, max, ini, cambio) {
  let v = ini; const out = h('output', null, v), menos = h('button', { type: 'button', 'aria-label': 'Menos ' + titulo.toLowerCase(), onclick: () => poner(v - 1) }, '−'), mas = h('button', { type: 'button', 'aria-label': 'Más ' + titulo.toLowerCase(), onclick: () => poner(v + 1) }, '+');
  const poner = x => { v = Math.max(min, Math.min(max, x)); out.textContent = v; menos.disabled = v <= min; mas.disabled = v >= max; cambio(v); }; menos.disabled = v <= min; mas.disabled = v >= max;
  return h('div', { class: 'step' }, h('div', { class: 'l' }, h('b', null, titulo), h('small', null, sub)), h('div', { class: 'c' }, menos, out, mas));
}
function formulario(s) {
  let chicos = 1, adultos = Math.min(1, s.adultosMax); const tot = h('b', null, money(s.precio)), msg = h('div');
  const nom = h('input', { class: 't', name: 'nombre', autocomplete: 'name', placeholder: 'Nombre y apellido', required: true }), tel = h('input', { class: 't', name: 'tel', type: 'tel', autocomplete: 'tel', placeholder: 'Tu WhatsApp', required: true }), mail = h('input', { class: 't', name: 'mail', type: 'email', autocomplete: 'email', placeholder: 'Tu mail (ahí te llega la confirmación)', required: true });
  const trampa = h('input', { class: 'sr', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true', name: 'web' }), btn = h('button', { class: 'btn', style: 'margin-top:.4rem' }, 'Reservar mi mesa');
  const f = h('form', { novalidate: true, onsubmit: async ev => {
    ev.preventDefault(); msg.replaceChildren();
    const falla = t => { msg.replaceChildren(h('div', { class: 'err', role: 'alert' }, t)); };
    if (nom.value.trim().length < 3 || !nom.value.trim().includes(' ')) return falla('Escribí tu nombre y apellido.'); if (tel.value.replace(/\D/g, '').length < 6) return falla('Escribí tu WhatsApp.'); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.value.trim())) return falla('Escribí tu mail para mandarte la confirmación.');
    btn.disabled = true; btn.textContent = 'Reservando…';
    try { const r = await llamar('reservarJuego', { juegoId: s.id, nombre: nom.value.trim(), telefono: tel.value.trim(), email: mail.value.trim(), chicos, adultos, web: trampa.value }, true); history.replaceState(null, '', '?codigo=' + r.codigo); resultado(r); }
    catch (e) { btn.disabled = false; btn.textContent = 'Reservar mi mesa'; falla(e.message); if (e.codigo === 'COMPLETO' || e.codigo === 'NO_DISPONIBLE') msg.append(h('button', { type: 'button', class: 'btn alt', onclick: lista }, 'Ver otros horarios')); }
  } },
    h('label', { class: 'f' }, 'Nombre y apellido'), nom, h('label', { class: 'f' }, 'WhatsApp'), tel, h('label', { class: 'f' }, 'Mail'), mail, trampa,
    stepper('Niños', `${money(s.precio)} cada uno`, 1, 50, 1, v => { chicos = v; tot.textContent = money(v * s.precio); }),
    stepper('Adultos', `Hasta ${s.adultosMax} por mesa · no pagan`, 0, s.adultosMax, adultos, v => { adultos = v; }),
    h('div', { class: 'total' }, h('span', null, 'Total a pagar'), tot), h('p', { class: 'mini' }, 'Cada familia ocupa 1 mesa. Te guardamos la mesa 15 minutos para que hagas la transferencia y subas el comprobante.'), msg, btn);
  pagina(h('button', { class: 'link', onclick: lista }, '← Elegir otro horario'), h('div', { class: 'card' }, h('h2', { style: 'margin:0 0 .2rem' }, flarga(s.fecha)), h('p', { style: 'margin:0;font-weight:700' }, `${s.inicio} a ${s.fin}` + (s.salon ? ' · ' + s.salon : '')), f));
  nom.focus({ preventScroll: true });
}
const copiar = (label, valor) => h('div', { class: 'copy' }, h('div', null, h('span', null, label), h('b', null, valor)), h('button', { onclick: e => { navigator.clipboard && navigator.clipboard.writeText(valor); e.target.textContent = '¡Copiado!'; setTimeout(() => (e.target.textContent = 'Copiar'), 1500); } }, 'Copiar'));
function leerArchivo(f) {
  return new Promise((ok, mal) => {
    const fin = (blob, tipo) => { const fr = new FileReader(); fr.onload = () => ok({ nombre: f.name, tipo, datos: String(fr.result).split(',')[1] || '' }); fr.onerror = () => mal(new Error('No pudimos leer el archivo')); fr.readAsDataURL(blob); };
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { if (f.size > 4.5 * 1048576) return mal(new Error('El archivo pesa demasiado (máximo 4 MB)')); return fin(f, f.type); }
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); c.toBlob(b => b ? fin(b, 'image/jpeg') : mal(new Error('No pudimos preparar la imagen')), 'image/jpeg', .82); };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No pudimos abrir esa imagen. Probá con otra foto o un PDF.')); }; img.src = url;
  });
}
function resultado(r) {
  const pend = r.estado === 'pendiente', ok = r.estado === 'confirmada', t = r.transferencia, falta = r.total - r.pagado;
  const aviso = wa(`Hola! Ya hice la transferencia de hs de juego. Reserva ${r.codigo} a nombre de ${r.nombre}, ${flarga(r.fecha)} de ${r.inicio} a ${r.fin} hs.`);
  const msg = h('p', { class: 'mini', style: 'margin-top:.6rem' }), inp = h('input', { type: 'file', accept: 'image/*,application/pdf', style: 'display:none' }), c = r.comprobante;
  const btnSub = h('button', { class: 'btn lila', style: 'margin-top:.8rem', onclick: () => inp.click() }, c ? 'Cambiar comprobante' : 'Subir comprobante');
  inp.addEventListener('change', async () => { const f = inp.files && inp.files[0]; if (!f) return; btnSub.disabled = true; btnSub.textContent = 'Enviando…'; msg.textContent = 'Subiendo el archivo, no cierres esta página.';
    try { const a = await leerArchivo(f); resultado(await llamar('comprobanteJuego', { id: r.id, ...a }, true)); } catch (e) { btnSub.disabled = false; btnSub.textContent = c ? 'Cambiar comprobante' : 'Subir comprobante'; msg.className = 'err'; msg.textContent = e.message + ' Podés mandarlo por WhatsApp.'; inp.value = ''; } });
  const reloj = h('div', { class: 'reloj' });
  pagina(h('div', { class: 'card' }, h('div', { class: 'ok' }, ok ? '🎉' : pend ? '⏳' : '😕'),
    h('h2', { class: 'centro', style: 'margin:.2rem 0' }, ok ? '¡Mesa confirmada!' : pend ? `¡Casi listo, ${r.nombre}!` : r.estado === 'vencida' ? 'Se liberó la mesa' : 'Reserva cancelada'),
    h('p', { class: 'centro', style: 'margin:0;font-weight:700' }, `${flarga(r.fecha)} · ${r.inicio} a ${r.fin}` + (r.salon ? ' · ' + r.salon : '')),
    h('p', { class: 'centro mini' }, `${r.chicos} ${r.chicos === 1 ? 'niño' : 'niños'} y ${r.adultos} ${r.adultos === 1 ? 'adulto' : 'adultos'}`), h('div', { class: 'codigo' }, r.codigo),
    ok ? h('p', { class: 'centro mini' }, 'Te mandamos la confirmación por mail. ¡Los esperamos!') : '',
    r.estado === 'vencida' ? h('p', { class: 'centro mini' }, 'Pasaron los 15 minutos sin el pago. Si todavía querés, reservá de nuevo o escribinos.') : ''),
    pend ? [h('div', { class: 'card' }, reloj, h('h3', { style: 'margin:.2rem 0 .4rem' }, 'Transferí ' + money(falta)),
      t ? [t.alias ? copiar('Alias', t.alias) : '', t.cbu ? copiar('CBU / CVU', t.cbu) : '', t.titular ? copiar('Titular', t.titular) : '', t.banco ? h('p', { class: 'mini' }, 'Banco o billetera: ' + t.banco) : '', t.nota ? h('p', { class: 'mini' }, t.nota) : ''] : h('p', { class: 'mini' }, 'Escribinos por WhatsApp para coordinar el pago.')),
      h('div', { class: 'card' }, h('h3', { style: 'margin:0 0 .3rem' }, c ? '✓ Comprobante recibido' : 'Mandanos el comprobante'), h('p', { class: 'mini', style: 'margin:0' }, c ? 'Recibimos «' + c.nombre + '». En cuanto lo revisemos, confirmamos tu mesa.' : 'Subí la foto o el PDF de la transferencia, o enviáloselo al salón por WhatsApp.'), inp, btnSub, aviso ? h('a', { class: 'btn alt', style: 'margin-top:.7rem', href: aviso, target: '_blank', rel: 'noopener' }, 'Prefiero enviarlo por WhatsApp') : '', msg)] : '',
    h('div', { class: 'centro', style: 'margin-top:1rem' }, h('button', { class: 'link', onclick: () => { history.replaceState(null, '', location.pathname); lista(); } }, '← Ver los horarios'), h('a', { class: 'link', style: 'margin-left:1rem;color:inherit', href: '../' }, 'Volver al sitio')));
  if (pend && r.venceEn) {
    const fin = Date.parse(r.venceEn), tic = () => { const s = Math.max(0, Math.round((fin - Date.now()) / 1000)); reloj.replaceChildren('Tu mesa se guarda ', h('b', null, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)); if (!s) { clearInterval(S.timer); estado({ id: r.id }); } }; tic(); S.timer = setInterval(tic, 1000);
  }
  if (pend) S.poll = setInterval(async () => { if (inp.value) return; try { const n = await llamar('estadoJuego', { id: r.id }); if (n.estado !== 'pendiente') resultado(n); } catch (e) { } }, 20000);
}
async function estado(ref) {
  pagina(h('p', { class: 'centro' }, 'Buscando tu reserva…'));
  try { const r = await llamar('estadoJuego', ref); if (ref.codigo) history.replaceState(null, '', '?codigo=' + r.codigo); resultado(r); }
  catch (e) { pagina(h('div', { class: 'err' }, e.message), h('button', { class: 'btn', onclick: () => { history.replaceState(null, '', location.pathname); lista(); } }, 'Ver los horarios')); }
}
function consultar() {
  const inp = h('input', { class: 't', placeholder: 'Tu código de reserva', autocapitalize: 'characters', style: 'text-align:center;letter-spacing:.2em;font-weight:800' });
  pagina(h('button', { class: 'link', onclick: lista }, '← Volver'), h('div', { class: 'card' }, h('h2', { style: 'margin:0 0 .6rem' }, 'Ver mi reserva'), h('p', { class: 'mini' }, 'Escribí el código que te llegó por mail.'), inp, h('button', { class: 'btn', style: 'margin-top:.8rem', onclick: () => inp.value.trim() && estado({ codigo: inp.value.trim() }) }, 'Buscar')));
}
iniciar().catch(e => { $('#app').replaceChildren(h('div', { class: 'vacio' }, h('p', null, 'No pudimos cargar la página. Recargá e intentá de nuevo.'), h('button', { class: 'btn', onclick: () => location.reload() }, 'Reintentar'))); });
