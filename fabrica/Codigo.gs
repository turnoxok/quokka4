/**
 * Fábrica de demos de tuweeb.
 * Se publica una sola vez como "Aplicación web" (ejecutar como: yo · acceso: cualquiera).
 *  - POST {action:'demoCrear', ...}  -> crea la demo y manda los links por mail
 *  - GET  ?action=demo&id=XXXX       -> devuelve la configuración pública de esa demo
 * Cada demo es un archivo JSON en la carpeta "tuweeb-demos" de Drive.
 * Pedidos de "Mi web" (logo animado, marca 3D, salón 3D y dominio): un JSON por demo en "tuweeb-pedidos"; comprobantes en "tuweeb-comprobantes" (privados).
 *  - GET  ?action=pedido&id=X | ?action=dominio&q=nombre
 *  - POST {action:'pedidoGuardar'|'pedidoComprobante', id, ...}
 *  - POST {action:'adminLogin'|'admin...', token, ...}  -> panel del dueño (admin/)
 * Una función diaria (limpiar) borra las demos que pasaron los DIAS_VIDA.
 */
var SITIO = 'https://demo.tuweeb.com/';
var CARPETA = 'tuweeb-demos';
var DIAS_VIDA = 7;
var MAX_POR_DIA = 300;
var MAX_LOGO = 500000;

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function carpeta_() {
  var it = DriveApp.getFoldersByName(CARPETA);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
}
var RESERVADOS = ['crear','panel','reservar','assets','demo','bloques','herramientas','fabrica','planes','galeria','invitacion','editor','app','index','tuweeb','admin','www','api','login','demos','tema','weeb'];
/** Dirección legible a partir del nombre del negocio: "Parque Land" -> parqueland (y parqueland2 si ya existe). */
function idNuevo_(nombre, dir) {
  var base = String(nombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  if (base.length < 3) base = (base + 'weeb').slice(0, 24);
  var id = base, n = 1;
  while (RESERVADOS.indexOf(id) >= 0 || dir.getFilesByName(id + '.json').hasNext()) { n++; id = base + n; }
  return id;
}
function hex_(v) { v = String(v || '').replace('#', '').toLowerCase(); return /^[0-9a-f]{6}$/.test(v) ? v : ''; }
function texto_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n); }

/** Deja solo un SVG inofensivo: sin scripts, sin eventos, sin enlaces externos. */
function limpiarSvg_(svg) {
  svg = String(svg || '');
  if (!/^<svg[\s>]/i.test(svg.replace(/^<\?xml[^>]*>\s*/i, ''))) return '';
  if (/<\s*(script|foreignObject|iframe|object|embed|audio|video)/i.test(svg)) return '';
  if (/\son[a-z]+\s*=/i.test(svg)) return '';
  if (/(href)\s*=\s*["']\s*(?!#|data:image\/)/i.test(svg)) return '';
  if (/javascript:/i.test(svg)) return '';
  return svg;
}
function logoValido_(logo) {
  logo = String(logo || '');
  if (logo.length > MAX_LOGO) return '';
  if (/^data:image\/png;base64,/.test(logo)) return /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+\/=]+$/.test(logo) ? logo : '';
  var m = /^data:image\/svg\+xml;utf8,(.*)$/.exec(logo);
  if (!m) return '';
  var svg; try { svg = decodeURIComponent(m[1]); } catch (e) { return ''; }
  return limpiarSvg_(svg) ? logo : '';
}
function planesValidos_(d) {
  if (!d || !Array.isArray(d.planes)) return null;
  var pl = d.planes.slice(0, 6).map(function (p) {
    if (!p || typeof p !== 'object') return null;
    p.nombre = texto_(p.nombre, 40); p.descripcion = texto_(p.descripcion, 300);
    p.precio = Math.max(0, Math.min(1e8, Number(p.precio) || 0)); p.sena = Math.max(0, Math.min(1e8, Number(p.sena) || 0));
    return p;
  }).filter(Boolean);
  return pl.length ? { planes: pl } : null;
}

function demoCrear_(b) {
  var email = texto_(b.email, 120).toLowerCase(), nombre = texto_(b.nombre, 60);
  if (nombre.length < 2) return { ok: false, mensaje: 'Falta el nombre de tu negocio.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return { ok: false, mensaje: 'Revisá tu mail.' };
  var color = hex_(b.color); if (!color) return { ok: false, mensaje: 'Color inválido.' };
  var logo = logoValido_(b.logo); if (!logo) return { ok: false, mensaje: 'No pudimos leer el logo. Probá con otro o pedinos ayuda por WhatsApp.' };

  var cache = CacheService.getScriptCache(), prop = PropertiesService.getScriptProperties(), lock = LockService.getScriptLock();
  if (cache.get('m:' + email)) return { ok: false, mensaje: 'Ya creaste un weeb hace un momento. Esperá un minuto y probá de nuevo.' };
  lock.waitLock(20000);
  try {
    var hoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd'), k = 'n' + hoy, n = Number(prop.getProperty(k) || 0);
    if (n >= MAX_POR_DIA) return { ok: false, mensaje: 'Hoy se llenó el cupo de demos. Probá mañana o escribinos por WhatsApp.' };
    prop.setProperty(k, String(n + 1));
    var dir = carpeta_(), id = idNuevo_(nombre, dir);
    var demo = { id: id, creada: new Date().toISOString(), nombre: nombre, email: email, whatsapp: String(b.whatsapp || '').replace(/\D/g, '').slice(0, 15), color: color, color2: hex_(b.color2), color3: hex_(b.color3), color4: hex_(b.color4), logo: logo };
    var l3 = logoValido_(b.logo3d); if (l3) demo.logo3d = l3;
    var datos = planesValidos_(b.datos); if (datos) demo.datos = datos;
    dir.createFile(id + '.json', JSON.stringify(demo), MimeType.PLAIN_TEXT);
    try { var ix = indice_().filter(function (x) { return x.id !== id; }); ix.push({ id: id, nombre: nombre, email: email, whatsapp: demo.whatsapp || '', creada: demo.creada }); indiceGuardar_(ix); } catch (e) {}
    cache.put('m:' + email, '1', 45);
    if (b.salon) { try { crmVincular_(b.salon, id, demo.creada); } catch (e) {} }
  } finally { lock.releaseLock(); }

  var sitio = SITIO + '?d=' + id, panel = SITIO + 'panel/?d=' + id;
  try {
    MailApp.sendEmail({ to: email, name: 'tuweeb', subject: 'Tu weeb de ' + nombre + ' está listo',
      body: 'Hola!\n\nTu weeb ya está andando:\n\nTu sitio: ' + sitio + '\nTu panel: ' + panel + '\n\nUsuario del panel: ' + email + '\nClave inicial: demo1234 (la cambiás en el panel, en Seguridad).\n\nSi te gustó, desde el panel en "Mi web" elegís el dominio y lo activamos.\n\ntuweeb' });
  } catch (e) {}
  try {
    var dueno = Session.getEffectiveUser().getEmail();
    if (dueno) MailApp.sendEmail({ to: dueno, subject: 'Nueva demo: ' + nombre, body: nombre + '\n' + email + '\nWhatsApp: ' + (demo.whatsapp || '-') + '\n' + sitio });
  } catch (e) {}
  return { ok: true, data: { id: id, whatsapp: demo.whatsapp } };
}

/* ───────────── Ficha de datos de la web (dueño, WhatsApp, dirección, mapa, planes) ─────────────
   Vive dentro del JSON de la demo (demo.datos). La escribe el admin o el panel del cliente; todas las páginas la leen. */
function fichaArchivo_(id) {
  var it = carpeta_().getFilesByName(id + '.json'); if (it.hasNext()) return it.next();
  var av = carp_(CARP_VENCIDAS).getFilesByName(id + '.json'); return av.hasNext() ? av.next() : null;
}
function fichaPlanes_(lista, previos) {
  var out = [];
  (Array.isArray(lista) ? lista : []).slice(0, 8).forEach(function (p, i) {
    var nombre = texto_(p && p.nombre, 60); if (!nombre) return;
    var pr = Number(p.precio); var o = Object.assign({}, (previos && previos[i]) || {}, { nombre: nombre, descripcion: texto_(p.descripcion, 300), precio: isFinite(pr) && pr >= 0 ? Math.round(pr) : 0 });
    out.push(o);
  });
  return out;
}
/** quien: 'admin' o 'panel'. Mezcla solo las claves permitidas y marca una versión nueva para que las páginas se actualicen.
 *  Si lo cambia el admin y el cliente ya tiene su sistema de reservas, lo mismo se copia a su planilla (así el panel y todas sus páginas lo ven);
 *  sinEspejo = true cuando el cambio ya viene de la planilla. */
function fichaAplicar_(id, v, quien, sinEspejo) {
  id = idOk_(id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  v = v || {};
  var lock = LockService.getScriptLock(), espejo = null, res; lock.waitLock(20000);
  try {
    var f = fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
    var d = JSON.parse(f.getBlob().getDataAsString()); d.datos = d.datos || {}; var cambios = [], kv = {};
    var lg = v.logo !== undefined ? logoValido_(v.logo) : null; if (v.logo !== undefined && !lg) return { ok: false, mensaje: 'No pude leer el logo. Probá con otra imagen (PNG).' };
    if (v.nombre !== undefined) { var nn = texto_(v.nombre, 60); if (nn.length >= 2 && d.nombre !== nn) { cambios.push('nombre'); kv.nombre = 1; d.nombre = nn; } }
    ['duenio', 'direccion'].forEach(function (k) { if (v[k] !== undefined) { var t = texto_(v[k], 160); if (d.datos[k] !== t) { cambios.push(k); kv[k] = 1; } d.datos[k] = t; } });
    if (v.mapsUrl !== undefined) { var m = String(v.mapsUrl || '').trim(); m = /^https:\/\/[^\s<>"]{8,400}$/.test(m) ? m : ''; if (d.datos.mapsUrl !== m) { cambios.push('mapsUrl'); kv.mapsUrl = 1; } d.datos.mapsUrl = m; }
    if (v.whatsapp !== undefined) { var w = String(v.whatsapp || '').replace(/\D/g, '').slice(0, 15); if (d.whatsapp !== w) { cambios.push('whatsapp'); kv.whatsapp = 1; } d.whatsapp = w; d.datos.whatsapp = w; }
    if (v.planes !== undefined) { d.datos.planes = fichaPlanes_(v.planes, d.datos.planes); cambios.push('planes'); kv.planes = 1; }
    if (lg && d.logo !== lg) { d.logo = lg; cambios.push('logo'); kv.logo = 1; }
    if (!cambios.length) return { ok: true, data: { fichaV: d.fichaV || '', sinCambios: true } };
    d.fichaV = new Date().toISOString();
    d.fichaHist = (d.fichaHist || []).concat([{ f: d.fichaV, q: quien, k: cambios.join(',') }]).slice(-30);
    f.setContent(JSON.stringify(d));
    if (!sinEspejo && quien === 'admin' && d.hojaId) espejo = { d: d, kv: kv };
    res = { ok: true, data: { fichaV: d.fichaV } };
  } finally { lock.releaseLock(); }
  if (espejo) rvFichaASheet_(id, espejo.d, espejo.kv);
  return res;
}
var RV_ESPEJO = false;
/** Ficha → planilla del cliente: lo que carga el admin (dirección, mapa, WhatsApp, nombre, planes) aparece solo en su panel y en todas sus páginas. */
function rvFichaASheet_(id, d, kv) {
  RV_ESPEJO = true;
  try {
    if (!rvUsar_(id)) return;
    var x = d.datos || {}, vals = {};
    if (kv.direccion) vals.direccion = x.direccion || '';
    if (kv.mapsUrl) vals.mapsUrl = x.mapsUrl || '';
    if (kv.whatsapp) vals.whatsapp = d.whatsapp || '';
    if (kv.nombre) vals.nombre = d.nombre;
    if (Object.keys(vals).length) guardarConfig_({ valores: vals }, 'sistema');
    if (kv.planes) rvPlanesDesdeFicha_(x.planes || []);
  } catch (e) { } finally { RV_ESPEJO = false; }
}
/** Deja los planes de la planilla como la lista de la ficha: los que tienen el mismo nombre se actualizan, los nuevos se crean, los que se sacaron se borran. Conserva seña, horarios y salón de cada plan. */
function rvPlanesDesdeFicha_(lista) {
  var U = { email: 'sistema' }, act = planesActivos_(), libres = act.slice(), pares = [], norm = function (t) { return String(t || '').trim().toLowerCase(); };
  lista.forEach(function (p) { var k = -1; for (var i = 0; i < libres.length; i++) if (norm(libres[i].nombre) === norm(p.nombre)) { k = i; break; } pares.push(k >= 0 ? libres.splice(k, 1)[0] : null); });
  lista.forEach(function (p, i) { if (!pares[i] && libres.length) pares[i] = libres.shift(); });
  lista.forEach(function (p, i) {
    var cur = pares[i], o = { nombre: p.nombre, descripcion: p.descripcion || '', precio: Number(p.precio) || 0, activo: true };
    if (cur) { o.id = cur.id; ['senaTipo', 'senaValor', 'orden', 'salonId', 'descTotal'].forEach(function (k) { if (cur[k] !== undefined) o[k] = cur[k]; }); }
    else { o.senaTipo = 'pct'; o.senaValor = 30; o.orden = act.length + i + 1; }
    ADMIN['admin.guardarPlan'](o, U);
  });
  if (act.length <= 8) libres.forEach(function (x) { ADMIN['admin.borrarPlan']({ id: x.id }, U); });
}
/** Planilla → ficha: lo que el dueño cambia en su panel (Ajustes) vuelve al admin y a las páginas que leen la ficha. */
function rvPanelAFicha_(vals, usuario) {
  if (RV_ESPEJO || usuario === 'sistema' || !RV_CTX.id) return;
  try {
    var id = RV_CTX.id, v = {};
    ['direccion', 'mapsUrl', 'whatsapp', 'nombre'].forEach(function (k) { if (vals[k] !== undefined) v[k] = vals[k]; });
    if (!Object.keys(v).length) return;
    fichaAplicar_(id, v, 'panel', true);
    if (v.whatsapp !== undefined) crmTelPorDemo_(id, v.whatsapp);
    if (v.nombre !== undefined) crmNombrePorDemo_(id, v.nombre);
  } catch (e) { }
}
function rvPlanesAFicha_(usuario) {
  if (RV_ESPEJO || usuario === 'sistema' || !RV_CTX.id) return;
  try { fichaAplicar_(RV_CTX.id, { planes: planesActivos_().map(function (p) { return { nombre: p.nombre, descripcion: p.descripcion || '', precio: Number(p.precio) || 0 }; }) }, 'panel', true); } catch (e) { }
}
function rvLogoAFicha_(logo, usuario) {
  var r = fichaAplicar_(RV_CTX.id, { logo: logo }, 'panel', true);
  if (!r.ok) throw err_('DATO_INVALIDO', r.mensaje || 'No pude guardar el logo.');
  return { guardado: true };
}
function crmNombrePorDemo_(demoId, nombre) {
  try { var base = crmLeer_(), r = base.rows.filter(function (x) { return x.demo === demoId; })[0]; if (!r) return; var n = texto_(nombre, 80); if (n.length >= 2) celdas_(base.h, r.fila, { 1: n }); } catch (e) {}
}
/** El WhatsApp del salón es uno solo: el de la ficha (columna WhatsApp). Si cambia en el panel de su demo, se actualiza ahí. */
function crmTelPorDemo_(demoId, tel) {
  try { var base = crmLeer_(), r = base.rows.filter(function (x) { return x.demo === demoId; })[0]; if (!r) return; var t = digs_(tel).slice(0, 15); celdas_(base.h, r.fila, { 5: t, 6: t ? 'https://wa.me/' + wsp_(t, '') : '' }); } catch (e) {}
}
/** Lo que el cliente cambia en el panel de su demo vuelve al admin (solo claves permitidas). */
function demoFichaPanel_(b) {
  var id = idOk_(b.id); if (!id || !carpeta_().getFilesByName(id + '.json').hasNext()) return { ok: false, mensaje: 'Demo inexistente.' };
  var c = b.claves || {}, v = {}; ['direccion', 'mapsUrl', 'whatsapp', 'planes'].forEach(function (k) { if (c[k] !== undefined) v[k] = c[k]; });
  var r = fichaAplicar_(id, v, 'panel'); if (r.ok && v.whatsapp !== undefined) crmTelPorDemo_(id, v.whatsapp); return r;
}
/** Mail con el que entra hoy el dueño al panel: se lee de la hoja del cliente (si él lo cambió desde su panel, acá se actualiza solo). */
function panelEmailVivo_(id, d) {
  var cur = String((d && d.panelEmail) || '').trim().toLowerCase();
  try {
    if (!d || !d.hojaId) return cur;
    var sh = SpreadsheetApp.openById(d.hojaId).getSheetByName('Config'); if (!sh) return cur;
    var v = sh.getDataRange().getValues(), h = v[0].map(function (x) { return String(x).trim().toLowerCase(); }), ci = h.indexOf('clave'), vi = h.indexOf('valor'); if (ci < 0 || vi < 0) return cur;
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][ci]).trim() === 'emailAdmin') {
        var e = String(v[i][vi] || '').trim().toLowerCase();
        if (e && e !== cur) {
          var lock = LockService.getScriptLock(); lock.waitLock(20000);
          try { var f2 = fichaArchivo_(id), d2 = JSON.parse(f2.getBlob().getDataAsString()); d2.panelEmail = e; f2.setContent(JSON.stringify(d2)); } finally { lock.releaseLock(); }
        }
        return e || cur;
      }
    }
  } catch (err) {}
  return cur;
}
function fichaLeer_(id) {
  id = idOk_(id); var f = id && fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
  var d = JSON.parse(f.getBlob().getDataAsString()), x = d.datos || {};
  return { ok: true, data: { p3d: p3dInfo_(id), repo: d.repo || '', repoUrl: d.repoUrl || '', hojaUrl: d.hojaUrl || '', vinculado: !!d.vinculado, panelEmail: panelEmailVivo_(id, d), fichaV: d.fichaV || '', hist: (d.fichaHist || []).slice(-8).reverse(), archivada: !carpeta_().getFilesByName(id + '.json').hasNext() } };
}

/* ───────────── Proyecto 3D de cada demo (el .json del editor) ─────────────
   Se guarda en la carpeta tuweeb-proyectos3d, una copia por demo (más la anterior). Así el 3D se retoca sin pasar por GitHub. */
var CARP_P3D = 'tuweeb-proyectos3d', MAX_P3D = 9 * 1024 * 1024;
function p3dInfo_(id) {
  var it = carp_(CARP_P3D).getFilesByName(id + '.json'); if (!it.hasNext()) return { existe: false };
  var f = it.next(); return { existe: true, fecha: f.getLastUpdated ? f.getLastUpdated().toISOString() : '', bytes: f.getSize ? f.getSize() : 0 };
}
function p3dGuardar_(id, texto) {
  id = idOk_(id); if (!id || !fichaArchivo_(id)) return { ok: false, mensaje: 'Esa demo no existe.' };
  texto = String(texto || ''); if (texto.length > MAX_P3D) return { ok: false, mensaje: 'El archivo es muy pesado (máximo 9 MB).' };
  var j; try { j = JSON.parse(texto); } catch (e) { return { ok: false, mensaje: 'Ese archivo no es un proyecto del editor (.json).' }; }
  if (!j || j.kind !== 'weeb-scroll-project') return { ok: false, mensaje: 'Ese archivo no es un proyecto del editor (.json).' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var d = carp_(CARP_P3D), it = d.getFilesByName(id + '.json'), pv = d.getFilesByName(id + '.anterior.json');
    if (it.hasNext()) { var f = it.next(); while (pv.hasNext()) pv.next().setTrashed(true); f.setName(id + '.anterior.json'); }
    d.createFile(id + '.json', texto, MimeType.PLAIN_TEXT);
  } finally { lock.releaseLock(); }
  /* Un 3D propio del cliente trae sus datos básicos (dirección, WhatsApp): si la ficha no los tiene, se cargan solos para que ninguna página los pierda. Lo que ya está cargado en la ficha no se toca. */
  try {
    if (j.tuweebPropio) {
      var fa = fichaArchivo_(id), fd = fa && JSON.parse(fa.getBlob().getDataAsString()), dd = (fd && fd.datos) || {}, v = {};
      var pie = (j.sections || []).filter(function (x) { return x && x.type === 'footer'; })[0] || {}, dk = j.dock || {};
      var dir = String(pie.address || dk.address || '').trim(), wa = String(dk.whatsappPhone || pie.whatsapp || '').replace(/\D/g, '');
      if (dir && !String(dd.direccion || '').trim()) v.direccion = dir;
      if (wa && !String((fd && fd.whatsapp) || dd.whatsapp || '').trim()) v.whatsapp = wa;
      if (Object.keys(v).length) fichaAplicar_(id, v, 'admin');
    }
  } catch (e) {}
  return { ok: true, data: p3dInfo_(id) };
}
function p3dLeer_(id) {
  id = idOk_(id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  var it = carp_(CARP_P3D).getFilesByName(id + '.json'); if (!it.hasNext()) return { ok: true, data: { existe: false } };
  var f = it.next(); return { ok: true, data: { existe: true, texto: f.getBlob().getDataAsString(), fecha: f.getLastUpdated ? f.getLastUpdated().toISOString() : '' } };
}

/* ───────────── Pasar a cliente: crea su sitio en GitHub (copia exacta de la demo) y lo publica ─────────────
   Usa el permiso guardado en Ajustes. Pasos: copia de la demo (plantilla) → se sacan las partes del admin → se fija su código → se carga su 3D → se publica. */
function gh_(metodo, ruta, cuerpo) {
  var tk = PropertiesService.getScriptProperties().getProperty('ghToken'); if (!tk) throw new Error('GitHub no está conectado (Ajustes).');
  var o = { method: metodo, headers: { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json', 'User-Agent': 'tuweeb', 'X-GitHub-Api-Version': '2022-11-28' }, muteHttpExceptions: true };
  if (cuerpo !== undefined) { o.contentType = 'application/json'; o.payload = JSON.stringify(cuerpo); }
  var r = UrlFetchApp.fetch('https://api.github.com' + ruta, o), t = r.getContentText();
  var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
  return { code: r.getResponseCode(), json: j };
}
var EXEC_URL = 'https://script.google.com/macros/s/AKfycbyTcTreVN0lQHTxzxbIEGoyF7g7UCDmAZekwLk_10tdAQSR3SbHWt-_bg1wr3ueZ9VK/exec';
function claveNueva_() { var abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', o = ''; for (var i = 0; i < 12; i++) o += abc.charAt(Math.floor(Math.random() * abc.length)); return o; }
var PC_QUITAR = /^(admin\/|crear\/|fabrica\/|herramientas\/|CLAUDE\.md$|CNAME$|\.gitignore$)/;
function pasarCliente_(b) {
  var id = idOk_(b.id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  var f = fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
  var gp = PropertiesService.getScriptProperties(), dueno = gp.getProperty('ghUser'); if (!gp.getProperty('ghToken') || !dueno) return { ok: false, mensaje: 'Primero conectá GitHub en Ajustes.' };
  var repo = String(b.repo || id).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 39);
  if (!/^[a-z0-9][a-z0-9-]{2,38}$/.test(repo) || repo === 'demo') return { ok: false, mensaje: 'Elegí otro nombre para el sitio (3 a 39 letras, números o guiones).' };
  var dominio = String(b.dominio || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (dominio && !/^[a-z0-9]([a-z0-9.-]{0,60}[a-z0-9])?\.[a-z]{2,}$/.test(dominio)) return { ok: false, mensaje: 'Ese dominio no es válido (ej: minegocio.com.ar).' };
  var d = JSON.parse(f.getBlob().getDataAsString());
  if (d.repo) return { ok: false, mensaje: 'Esta demo ya tiene su sitio: ' + d.repo };
  var emDueno = String(b.email || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emDueno)) emDueno = emailCRM_(id);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emDueno || '')) return { ok: false, mensaje: 'Falta el mail del dueño: con ese mail entra a su panel. Escribilo en el cuadro «Mail del dueño» o cargalo en sus datos de contacto.' };
  var R = '/repos/' + dueno + '/' + repo;
  if (gh_('GET', R).code === 200) return { ok: false, mensaje: 'Ya existe un sitio con ese nombre en GitHub. Elegí otro.' };
  // 1. la demo, como plantilla
  var dm = gh_('GET', '/repos/' + dueno + '/demo'); if (dm.code !== 200) return { ok: false, mensaje: 'No encuentro el sitio demo en GitHub.' };
  if (!dm.json.is_template) { var pt = gh_('PATCH', '/repos/' + dueno + '/demo', { is_template: true }); if (pt.code !== 200) return { ok: false, mensaje: 'No pude preparar la demo para copiarla (revisá el permiso Administration).' }; }
  // 2. copia
  var gn = gh_('POST', '/repos/' + dueno + '/demo/generate', { owner: dueno, name: repo, description: 'Web de ' + d.nombre, private: false });
  if (gn.code !== 201) return { ok: false, mensaje: 'GitHub no pudo crear el sitio (' + gn.code + '). Probá de nuevo en un minuto.' };
  // 3. esperar a que tenga los archivos
  var arbol = null;
  for (var i = 0; i < 20 && !arbol; i++) { var tr = gh_('GET', R + '/git/trees/main?recursive=1'); if (tr.code === 200 && tr.json && tr.json.tree && tr.json.tree.length > 5 && !tr.json.truncated) arbol = tr.json; else Utilities.sleep(3000); }
  if (!arbol) return { ok: false, mensaje: 'La copia todavía se está armando. Esperá un minuto y mirá en GitHub: el sitio ' + repo + ' ya se creó.' };
  var blobSha = function (p) { var e = arbol.tree.filter(function (x) { return x.path === p && x.type === 'blob'; })[0]; return e && e.sha; };
  var leer = function (p) { var sh = blobSha(p); if (!sh) throw new Error('Falta ' + p + ' en la copia.'); var g = gh_('GET', R + '/git/blobs/' + sh); if (g.code !== 200) throw new Error('No pude leer ' + p); return Utilities.newBlob(Utilities.base64Decode(g.json.content.replace(/\n/g, ''))).getDataAsString(); };
  var cambios = [];
  var nuevo = function (p, texto) { var bl = gh_('POST', R + '/git/blobs', { content: Utilities.base64Encode(Utilities.newBlob(texto).getBytes()), encoding: 'base64' }); if (bl.code !== 201) throw new Error('No pude subir ' + p); cambios.push({ path: p, mode: '100644', type: 'blob', sha: bl.json.sha }); };
  // 4. sacar lo del admin
  arbol.tree.forEach(function (x) { if (x.type === 'blob' && PC_QUITAR.test(x.path)) cambios.push({ path: x.path, mode: x.mode, type: 'blob', sha: null }); });
  // 5. su código fijo: la web ya sabe quién es sin necesitar ?d=
  var tema = leer('tema.js'); if (tema.split("String(q.d||'')").length !== 2) return { ok: false, mensaje: 'No pude fijar el código del sitio (cambió tema.js). Avisame.' };
  nuevo('tema.js', 'window.TUWEEB_CLIENTE=true;\n' + tema.replace("String(q.d||'')", "String(q.d||'" + id + "')"));
  // 6. su 3D, si lo tiene guardado
  var p3 = p3dLeer_(id).data;
  if (p3 && p3.existe && p3.texto) {
    var ed = leer('editor.html'), rx = /(<script id="embedded-project-b64" type="text\/plain">)[^<]*(<\/script>)/;
    if (rx.test(ed)) nuevo('editor.html', ed.replace(rx, function (m, a, c) { return a + Utilities.base64Encode(Utilities.newBlob(p3.texto).getBytes()) + c; }));
  }
  // 7. su dominio
  if (dominio) nuevo('CNAME', dominio + '\n');
  // 7b. su hoja de cálculo (reservas y pagos), creada sola en la carpeta tuweeb-clientes
  var hoja = null; try { hoja = hojaCliente_(d.nombre, repo); } catch (e) { hoja = null; }
  // 7c. su sistema de reservas: se registra su hoja, y reservar/ y panel/ de su sitio apuntan al sistema real (ya no a la simulación de la demo)
  var acceso = null, avisoRv = '';
  if (hoja) {
    try {
      var cl = claveNueva_();
      rvRegistrar_({ id: id, sheetId: hoja.id, nombre: d.nombre, whatsapp: d.whatsapp || (d.datos && d.datos.whatsapp) || '', email: emDueno, clave: cl, dueno: (d.datos && d.datos.duenio) || '' });
      try { sembrarCliente_(id); } catch (esb) { avisoRv = ' No pude cargarle los horarios y combos (' + String(esb.message || esb).slice(0, 80) + '): usá «Cargar horarios y combos».'; }
      try { rvInstalarTriggers_(); } catch (etr) {}   // avisos y respaldos de todos los clientes (se reinstalan sin duplicar)
      acceso = { email: emDueno, clave: cl };
      ['reservar/config.json', 'panel/config.json'].forEach(function (rp) {
        var cj = {}; try { cj = JSON.parse(leer(rp)); } catch (e2) { cj = {}; }
        cj.api = EXEC_URL; cj.cliente = id; nuevo(rp, JSON.stringify(cj, null, 1));
      });
    } catch (e) { avisoRv = 'El sitio quedó listo, pero no pude conectar su sistema de reservas (' + String(e.message || e).slice(0, 80) + ').'; acceso = null; }
  }
  var deshacer = function () { try { if (hoja) DriveApp.getFileById(hoja.id).setTrashed(true); rvQuitar_(id); } catch (e) {} };
  var ref = gh_('GET', R + '/git/ref/heads/main'); if (ref.code !== 200) { deshacer(); return { ok: false, mensaje: 'No pude leer el sitio nuevo.' }; }
  var cm0 = gh_('GET', R + '/git/commits/' + ref.json.object.sha);
  var tn = gh_('POST', R + '/git/trees', { base_tree: cm0.json.tree.sha, tree: cambios }); if (tn.code !== 201) { deshacer(); return { ok: false, mensaje: 'No pude armar el sitio (' + tn.code + ').' }; }
  var cm = gh_('POST', R + '/git/commits', { message: 'Sitio de ' + d.nombre + ' (copia de la demo)', tree: tn.json.sha, parents: [ref.json.object.sha] }); if (cm.code !== 201) { deshacer(); return { ok: false, mensaje: 'No pude guardar el sitio.' }; }
  var up = gh_('PATCH', R + '/git/refs/heads/main', { sha: cm.json.sha, force: false }); if (up.code !== 200) { deshacer(); return { ok: false, mensaje: 'No pude publicar el sitio.' }; }
  // 8. publicar
  var pg = gh_('POST', R + '/pages', { source: { branch: 'main', path: '/' } });
  var avisoPages = (pg.code !== 201 && pg.code !== 409) ? 'El sitio se creó pero no pude activar su publicación (' + pg.code + '). Activala en Settings → Pages.' : '';
  var url = dominio ? 'https://' + dominio + '/' : 'https://' + dueno + '.github.io/' + repo + '/';
  // 9. la ficha: ya es cliente, con su sitio y el mismo código de demo (el Mi web y los pagos siguen conectados)
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { var f2 = fichaArchivo_(id), d2 = JSON.parse(f2.getBlob().getDataAsString()); d2.repo = repo; d2.repoUrl = url; d2.clienteDesde = new Date().toISOString(); if (acceso) d2.panelEmail = acceso.email; if (hoja) { d2.hojaId = hoja.id; d2.hojaUrl = hoja.url; } f2.setContent(JSON.stringify(d2)); } finally { lock.releaseLock(); }
  try { var base = crmLeer_(), r = base.rows.filter(function (x) { return x.demo === id; })[0]; if (r) celdas_(base.h, r.fila, { 8: 'cliente', 13: url }); } catch (e) {}
  return { ok: true, data: { repo: repo, url: url, acceso: acceso, aviso: avisoPages || avisoRv || (hoja ? '' : 'El sitio quedó listo, pero no pude crear su hoja de cálculo.') } };
}

/** Elimina SOLO la web del cliente (GitHub y, si existieran, su hoja y su script de Drive). El salón, su ficha, su 3D guardado y su demo quedan en el admin; vuelve a Hablando. */
function eliminarWeb_(b) {
  var id = idOk_(b.id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  var f = fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
  var d = JSON.parse(f.getBlob().getDataAsString());
  if (d.vinculado) {   // un sitio que ya existía (ej. Planeta Niños) NUNCA se borra desde acá: solo se desvincula de la ficha
    var lk = LockService.getScriptLock(); lk.waitLock(20000);
    try { var fv = fichaArchivo_(id), dv = JSON.parse(fv.getBlob().getDataAsString()); delete dv.repo; delete dv.repoUrl; delete dv.vinculado; fv.setContent(JSON.stringify(dv)); } finally { lk.releaseLock(); }
    try { var bv = crmLeer_(), xv = bv.rows.filter(function (q) { return q.demo === id; })[0]; if (xv) celdas_(bv.h, xv.fila, { 8: 'hablando' }); } catch (e) {}
    return { ok: true, data: { drive: [], desvinculado: true } };
  }
  var gp = PropertiesService.getScriptProperties(), dueno = gp.getProperty('ghUser'); if (!gp.getProperty('ghToken') || !dueno) return { ok: false, mensaje: 'Primero conectá GitHub en Ajustes.' };
  var repo = String(d.repo || b.repo || '').toLowerCase().trim();   // el anotado en la ficha; si no figura (quedó a medias), el que se escriba, solo si salió de la demo
  if (!repo) return { ok: false, mensaje: 'Este salón no tiene un sitio creado.' };
  if (!d.repo) {
    var gx = gh_('GET', '/repos/' + dueno + '/' + repo);
    if (gx.code === 404) return { ok: false, mensaje: 'No existe un sitio con ese nombre en GitHub.' };
    if (gx.code !== 200) return { ok: false, mensaje: 'No pude consultar ese sitio en GitHub (' + gx.code + ').' };
    if (!(gx.json && gx.json.template_repository && gx.json.template_repository.name === 'demo')) return { ok: false, mensaje: 'Ese sitio no se creó desde la demo: por seguridad no lo borro desde acá.' };
  }
  if (!/^[a-z0-9][a-z0-9-]{2,38}$/.test(repo) || repo === 'demo') return { ok: false, mensaje: 'El nombre del sitio guardado no es válido. No se borró nada.' };
  if (String(b.confirmar || '').trim().toLowerCase() !== repo) return { ok: false, mensaje: 'Para confirmar hay que escribir el nombre del sitio: ' + repo };
  var del = gh_('DELETE', '/repos/' + dueno + '/' + repo);
  if (del.code !== 204 && del.code !== 404) return { ok: false, mensaje: del.code === 403 ? 'GitHub no dejó borrar el sitio. Al permiso de GitHub le falta «Administration: Read and write» (Ajustes del código en github.com).' : 'GitHub no pudo borrar el sitio (' + del.code + '). No se cambió nada en el admin.' };
  var drive = [];
  try { rvQuitar_(id); } catch (eq) {}
  ['hojaId', 'scriptId'].forEach(function (k) { if (d[k]) { try { DriveApp.getFileById(String(d[k])).setTrashed(true); drive.push(k === 'hojaId' ? 'hoja' : 'script'); } catch (e) {} } });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { var f2 = fichaArchivo_(id), d2 = JSON.parse(f2.getBlob().getDataAsString()); delete d2.repo; delete d2.repoUrl; delete d2.clienteDesde; delete d2.hojaId; delete d2.hojaUrl; delete d2.scriptId; f2.setContent(JSON.stringify(d2)); } finally { lock.releaseLock(); }
  try { var base = crmLeer_(), r = base.rows.filter(function (x) { return x.demo === id; })[0]; if (r) celdas_(base.h, r.fila, { 8: 'hablando', 13: '' }); } catch (e) {}
  return { ok: true, data: { repo: repo, drive: drive } };
}

/** Hoja de cálculo propia de un cliente (reservas y pagos). Queda en la carpeta tuweeb-clientes; al eliminar su web va a la papelera. */
function hojaCliente_(nombre, repo) {
  var ss = SpreadsheetApp.create('Reservas · ' + String(nombre).slice(0, 60) + ' (' + repo + ')');
  var h1 = ss.getSheets()[0]; h1.setName('Reservas'); h1.getRange(1, 1, 1, 8).setValues([['Fecha', 'Horario', 'Nombre', 'Teléfono', 'Cantidad', 'Estado', 'Pagado', 'Nota']]).setFontWeight('bold'); h1.setFrozenRows(1);
  var h2 = ss.insertSheet('Pagos'); h2.getRange(1, 1, 1, 6).setValues([['Fecha', 'Concepto', 'Monto', 'Medio', 'Estado', 'Comprobante']]).setFontWeight('bold'); h2.setFrozenRows(1);
  var f = DriveApp.getFileById(ss.getId()); f.moveTo(carp_('tuweeb-clientes'));
  return { id: ss.getId(), url: ss.getUrl() };
}
/** Publica en la web de un cliente el 3D editado: sube el index.html nuevo y el editor con su proyecto adentro, en un solo cambio. Antes deja una marca para volver atrás. */
function publicarWeb_(b) {
  var id = idOk_(b.id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  var f = fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
  var d = JSON.parse(f.getBlob().getDataAsString());
  if (!d.repo) return { ok: false, mensaje: 'Este salón todavía no tiene su web creada. Primero «Pasar a cliente».' };
  var gp = PropertiesService.getScriptProperties(), dueno = gp.getProperty('ghUser'); if (!gp.getProperty('ghToken') || !dueno) return { ok: false, mensaje: 'Primero conectá GitHub en Ajustes.' };
  var idx = String(b.index || ''), proy = String(b.proyecto || '');
  if (idx.length < 20000 || idx.length > 20 * 1024 * 1024 || !/^\s*<!doctype html/i.test(idx) || !/<\/html>\s*$/i.test(idx)) return { ok: false, mensaje: 'El sitio generado no es válido. No se publicó nada.' };
  var pj; try { pj = JSON.parse(proy); } catch (e) { pj = null; }
  if (!pj || pj.kind !== 'weeb-scroll-project') return { ok: false, mensaje: 'El proyecto no es válido. No se publicó nada.' };
  var gd = p3dGuardar_(id, proy); if (!gd.ok) return gd;   // el 3D queda también guardado en la ficha
  var R = '/repos/' + dueno + '/' + String(d.repo);
  var ref = gh_('GET', R + '/git/ref/heads/main'); if (ref.code !== 200) return { ok: false, mensaje: 'No encuentro el sitio en GitHub (' + ref.code + ').' };
  var sha0 = ref.json.object.sha, cm0 = gh_('GET', R + '/git/commits/' + sha0);
  var tr = gh_('GET', R + '/git/trees/' + cm0.json.tree.sha + '?recursive=1'); if (tr.code !== 200 || !tr.json || tr.json.truncated) return { ok: false, mensaje: 'No pude leer los archivos del sitio.' };
  var ed = tr.json.tree.filter(function (x) { return x.path === 'editor.html' && x.type === 'blob'; })[0]; if (!ed) return { ok: false, mensaje: 'Al sitio le falta editor.html.' };
  var eg = gh_('GET', R + '/git/blobs/' + ed.sha); if (eg.code !== 200) return { ok: false, mensaje: 'No pude leer el editor del sitio.' };
  var edTxt = Utilities.newBlob(Utilities.base64Decode(eg.json.content.replace(/\n/g, ''))).getDataAsString(), rx = /(<script id="embedded-project-b64" type="text\/plain">)[^<]*(<\/script>)/;
  if (!rx.test(edTxt)) return { ok: false, mensaje: 'El editor del sitio no tiene la forma esperada.' };
  var edNuevo = edTxt.replace(rx, function (m, a1, c1) { return a1 + Utilities.base64Encode(Utilities.newBlob(proy).getBytes()) + c1; });
  var nb = function (txt) { var r = gh_('POST', R + '/git/blobs', { content: Utilities.base64Encode(Utilities.newBlob(txt).getBytes()), encoding: 'base64' }); if (r.code !== 201) throw new Error('No pude subir un archivo (' + r.code + ').'); return r.json.sha; };
  var cambios = [{ path: 'index.html', mode: '100644', type: 'blob', sha: nb(idx) }, { path: 'editor.html', mode: '100644', type: 'blob', sha: nb(edNuevo) }];
  var marca = 'antes-' + Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyyMMdd-HHmmss');
  var tg = gh_('POST', R + '/git/refs', { ref: 'refs/tags/' + marca, sha: sha0 }); if (tg.code !== 201) return { ok: false, mensaje: 'No pude dejar el respaldo (' + tg.code + '). No se publicó nada.' };
  var tn = gh_('POST', R + '/git/trees', { base_tree: cm0.json.tree.sha, tree: cambios }); if (tn.code !== 201) return { ok: false, mensaje: 'No pude armar la publicación (' + tn.code + ').' };
  var cm = gh_('POST', R + '/git/commits', { message: 'Nuevo 3D publicado desde el editor', tree: tn.json.sha, parents: [sha0] }); if (cm.code !== 201) return { ok: false, mensaje: 'No pude guardar la publicación.' };
  var up = gh_('PATCH', R + '/git/refs/heads/main', { sha: cm.json.sha, force: false }); if (up.code !== 200) return { ok: false, mensaje: 'No pude publicar (' + up.code + ').' };
  try { var fp = fichaArchivo_(id), dp = JSON.parse(fp.getBlob().getDataAsString()); dp.personalizada = true; dp.personalizadaDesde = dp.personalizadaDesde || new Date().toISOString(); fp.setContent(JSON.stringify(dp)); } catch (ep) {}
  return { ok: true, data: { url: d.repoUrl || '', respaldo: marca } };
}

/** Mail real del cliente cargado en la ficha del admin (columna Email) para esa demo; '' si no hay. */
function emailCRM_(id) {
  try { var h = libro_().getSheetByName('Salones'), n = h.getLastRow(); if (n < 2) return ''; var v = h.getRange(2, 1, n - 1, 21).getValues();
    for (var i = 0; i < v.length; i++) if (String(v[i][8]).trim() === id) { var e = String(v[i][15] || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : ''; } } catch (x) {}
  return '';
}
function demoLeer_(id) {
  id = String(id || '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(id)) return { ok: false, mensaje: 'Demo inexistente.' };
  var it = carpeta_().getFilesByName(id + '.json');
  if (!it.hasNext()) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  var d = JSON.parse(it.next().getBlob().getDataAsString());
  var pedX = pedLeer_(id), conPed = !!pedX, emReal = conPed ? emailCRM_(id) : '', susp = !!(pedX && pedX.web && pedX.web.estado === 'suspendida');
  return { ok: true, data: { nombre: d.nombre, email: emReal || d.email, whatsapp: d.whatsapp, color: d.color, color2: d.color2, color3: d.color3 || '', color4: d.color4 || '', logo: d.logo, logo3d: d.logo3d || '', datos: d.datos || null, fichaV: d.fichaV || '', creada: d.creada || '', conPedido: conPed, suspendida: susp } };
}


/* ───────────── Mi web: pedidos y pagos de las demos ───────────── */
var CARP_PEDIDOS = 'tuweeb-pedidos', CARP_VENCIDAS = 'tuweeb-demos-vencidas', CARP_COMP = 'tuweeb-comprobantes', DOMINIO_BASE = 'salondefiestas.com', MP_LINK = 'https://link.mercadopago.com.ar/x23';
var ADMIN_SAL = '3c92d13582a6210b', ADMIN_HASH = '9c5b526a2d31eff182a9086648d2a6088a6ad5420504125209ce2bfbe57b7b92';
/** Lo que se vende. total = precio; sena = lo que se paga para arrancar; modo: sena (saldo contra entrega) · anual (todo junto) · entrega (sin seña) */
var PRODUCTOS = {
  logo:   { nombre: 'Tu logo animado', total: 149000, sena: 74500, modo: 'sena', plan: true, detalle: 'Seña para arrancar y saldo contra entrega. Entrega en 24 a 48 hs.' },
  marca:  { nombre: 'Tu marca en 3D', total: 380000, sena: 190000, modo: 'sena', plan: true, detalle: 'Seña para arrancar y saldo contra entrega.' },
  salon:  { nombre: 'Tu salón en 3D', total: 720000, sena: 360000, modo: 'sena', plan: true, detalle: 'Seña para arrancar y saldo contra entrega.' },
  dominio:{ nombre: 'Dominio con otra terminación (primer año)', total: 43000, sena: 43000, modo: 'anual', detalle: 'El .com del primer año va incluido en el plan. Otras terminaciones: $43.000 por año, se abona junto con la seña.' }
};
function carp_(n) { var it = DriveApp.getFoldersByName(n); return it.hasNext() ? it.next() : DriveApp.createFolder(n); }
function sha_(t) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, t).map(function (b) { return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2); }).join(''); }
function idOk_(id) { id = String(id || '').toLowerCase(); return /^[a-z0-9][a-z0-9-]{2,29}$/.test(id) ? id : ''; }
function demoRaw_(id) { var it = carpeta_().getFilesByName(id + '.json'); return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null; }
function pedLeer_(id) { var it = carp_(CARP_PEDIDOS).getFilesByName(id + '.json'); return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : null; }
function pedGuardar_(p) {
  p.actualizado = new Date().toISOString();
  var d = carp_(CARP_PEDIDOS), it = d.getFilesByName(p.id + '.json');
  if (it.hasNext()) it.next().setContent(JSON.stringify(p)); else d.createFile(p.id + '.json', JSON.stringify(p), MimeType.PLAIN_TEXT);
}
function transferCfg_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('transfer') || '{}'); } catch (e) { return {}; } }
function slug_(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); }
/** Cuánto va pagado, cuánto falta y qué se sugiere pagar ahora, por producto. */
function calcItem_(ped, k) {
  var pr = PRODUCTOS[k], it = ped.items[k], conf = 0, rev = 0, ac = it.acuerdo || {};
  var total = Number(ac.total) > 0 ? Number(ac.total) : pr.total, sena = Number(ac.sena) > 0 ? Number(ac.sena) : pr.sena, cuota = Number(ac.cuota) > 0 ? Number(ac.cuota) : 0;
  (ped.pagos || []).forEach(function (g) { if (g.k !== k) return; if (g.estado === 'confirmado') conf += g.monto; else if (g.estado === 'revision') rev += g.monto; });
  var entregado = it.estado === 'entregado', falta = Math.max(0, total - conf), sug = 0;
  if (pr.modo === 'anual') sug = Math.max(0, falta - rev);
  else if (pr.modo === 'sena') sug = entregado ? Math.max(0, falta - rev) : Math.max(0, sena - conf - rev);
  else sug = entregado ? Math.max(0, falta - rev) : 0;
  if (cuota && sug > cuota) sug = cuota;
  return { k: k, nombre: pr.nombre, detalle: pr.detalle, modo: pr.modo, total: total, sena: sena, cuota: cuota, acordado: !!(ac.total || ac.sena || ac.cuota), estado: it.estado || 'pedido', url: it.url || '', nota: it.nota || '', confirmado: conf, revision: rev, falta: falta, sugerido: sug, creado: it.creado };
}
/** Lo que el admin tiene cargado de un cliente (monto acordado, seña del presupuesto y cobros): Mi web lo muestra igual, sin cargarlo dos veces. */
function crmDatos_(id) {
  try {
    var base = crmLeer_(), s = base.rows.filter(function (x) { return x.demo === id; })[0] || base.rows.filter(function (x) { return x.id === id; })[0]; if (!s) return null;
    var out = { acordado: Number(s.acordado) || 0, sena: 0, cobros: [] }, ch = libro_().getSheetByName('Cobros'), rh = libro_().getSheetByName('Registros');
    if (ch && ch.getLastRow() > 1) ch.getRange(2, 1, ch.getLastRow() - 1, 8).getValues().forEach(function (r) { if (String(r[0]) === s.id && Number(r[3]) > 0) out.cobros.push({ id: String(r[1]), fecha: iso_(r[2]), monto: Number(r[3]) || 0, detalle: String(r[4] || '') }); });
    if (out.acordado > 0 && rh && rh.getLastRow() > 1) {
      var pres = rh.getRange(2, 1, rh.getLastRow() - 1, 11).getValues().filter(function (r) { return String(r[0]) === s.id && String(r[2]) === 'presupuesto'; }).pop();
      if (pres) { var t = String(pres[5] || ''), m1 = t.match(/se[ñn]a[^%$\d]{0,12}(\d{1,2})\s*%/i), m2 = t.match(/se[ñn]a[^$]{0,20}\$\s*([\d.]+)/i);
        if (m2) out.sena = Math.round(Number(m2[1].replace(/\./g, ''))); else if (m1) out.sena = Math.round(out.acordado * Number(m1[1]) / 100); }
    }
    return out;
  } catch (e) { return null; }
}
function pedPublico_(id, ped, demo) {
  ped = ped || { id: id, items: {}, pagos: [] };
  var items = Object.keys(ped.items).map(function (k) { return calcItem_(ped, k); });
  var crm = demo ? crmDatos_(id) : null, pagosCrm = [];   // el acuerdo y los cobros del admin valen desde que es demo, no solo cuando ya es cliente
  if (crm) {
    crm.cobros.forEach(function (c) { pagosCrm.push({ id: c.id, k: 'salon', fecha: c.fecha, monto: c.monto, estado: 'confirmado', nota: c.detalle || 'Cobro', archivo: '', archivos: 0 }); });
    items.forEach(function (it) {
      if (it.k !== 'salon') return;
      if (!it.acordado) { if (crm.acordado > 0) { it.total = crm.acordado; it.acordado = true; } if (crm.sena > 0) it.sena = crm.sena; }
      var extra = 0; crm.cobros.forEach(function (c) { extra += c.monto; });
      it.confirmado += extra; it.falta = Math.max(0, it.total - it.confirmado);
      it.sugerido = it.estado === 'entregado' ? Math.max(0, it.falta - it.revision) : Math.max(0, it.sena - it.confirmado - it.revision);
    });
  }
  var t = transferCfg_();
  return { id: id, items: items, dominio: ped.dominio || '',
    pagos: (ped.pagos || []).map(function (g) { return { id: g.id, k: g.k, fecha: g.fecha, monto: g.monto, estado: g.estado, nota: g.nota || '', archivo: g.nombreArchivo || '', archivos: (g.archivo ? 1 : 0) + (g.extra || []).length }; }).concat(pagosCrm),
    personalizada: !!demo.personalizada, cliente: !!demo.repo,
    web: (ped.web && ped.web.estado) || 'activa', venc: (ped.venc || []).map(function (v) { return { id: v.id, concepto: v.concepto, fecha: v.fecha, monto: v.monto || 0, hecho: !!v.hecho }; }),
    transferencia: { alias: t.alias || '', titular: t.titular || '', banco: t.banco || '', cbu: t.cbu || '', nota: t.nota || '', mp: t.mp === undefined ? MP_LINK : t.mp }, catalogo: PRODUCTOS };
}
function avisoDueno_(asunto, cuerpo) { try { var d = Session.getEffectiveUser().getEmail(); if (d) MailApp.sendEmail({ to: d, subject: asunto, body: cuerpo + '\n\nAdmin: ' + SITIO + 'admin/' }); } catch (e) {} }

function pedidoGet_(id) {
  id = idOk_(id); if (!id) return { ok: false, mensaje: 'Demo inexistente.' };
  var demo = demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  return { ok: true, data: pedPublico_(id, pedLeer_(id), demo) };
}
function pedidoGuardar_(b) {
  var id = idOk_(b.id), demo = id && demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  var plan = (Array.isArray(b.items) ? b.items : []).filter(function (k) { return PRODUCTOS[k] && PRODUCTOS[k].plan; })[0];
  var dm = String(b.dominio || '').toLowerCase().trim();
  if (dm && !/^[a-z0-9-]{2,60}(\.[a-z0-9-]{2,20}){1,2}$/.test(dm)) return { ok: false, mensaje: 'El dominio elegido no es válido. Buscalo de nuevo.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ped = pedLeer_(id) || { id: id, nombre: demo.nombre, email: demo.email, whatsapp: demo.whatsapp || '', creado: new Date().toISOString(), items: {}, pagos: [] }, nuevos = [];
    var tienePlan = Object.keys(ped.items).some(function (k) { return PRODUCTOS[k] && PRODUCTOS[k].plan; });
    if (!plan && !tienePlan) return { ok: false, mensaje: 'Elegí un plan.' };
    ped.nombre = demo.nombre; ped.email = demo.email; ped.whatsapp = demo.whatsapp || '';
    if (plan && !tienePlan) { ped.items[plan] = { estado: 'pedido', creado: new Date().toISOString() }; nuevos.push(PRODUCTOS[plan].nombre); }
    if (dm) {
      ped.dominio = dm;
      if (/\.com$/.test(dm)) { if (ped.items.dominio && !(ped.pagos || []).some(function (g) { return g.k === 'dominio'; })) delete ped.items.dominio; }
      else if (!ped.items.dominio) { ped.items.dominio = { estado: 'pedido', creado: new Date().toISOString() }; nuevos.push(PRODUCTOS.dominio.nombre); }
    }
    pedGuardar_(ped);
    if (nuevos.length) avisoDueno_('Nuevo pedido: ' + demo.nombre, demo.nombre + ' (' + demo.email + ', WhatsApp ' + (demo.whatsapp || '-') + ')\nPidió: ' + nuevos.join(', ') + '\nDominio: ' + (ped.dominio || '(todavía no lo eligió)'));
    return { ok: true, data: pedPublico_(id, ped, demo) };
  } finally { lock.releaseLock(); }
}
var COMP_TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
/** Guarda archivos de comprobante adicionales ([{tipo,datos,nombre}], hasta 4). Devuelve [{archivo,tipo,nombreArchivo}] o null si alguno es inválido. */
function adjuntosExtra_(id, pid, lista, desde) {
  var out = []; lista = Array.isArray(lista) ? lista.slice(0, 4) : [];
  for (var i = 0; i < lista.length; i++) {
    var a = lista[i] || {}, tipo = String(a.tipo || '').toLowerCase(), ext = COMP_TIPOS[tipo], d = String(a.datos || '').replace(/^data:[^,]*,/, '').replace(/\s/g, '');
    if (!ext || !d || d.length * 0.75 > 4 * 1024 * 1024) return null;
    var nm = texto_(a.nombre || '', 80).replace(/[\\\/:*?"<>|]/g, '_').replace(/\.[A-Za-z0-9]+$/, '') || 'comprobante';
    var f = carp_(CARP_COMP).createFile(Utilities.newBlob(Utilities.base64Decode(d), tipo, id + '_' + pid + '_' + (desde + i) + '.' + ext));
    out.push({ archivo: f.getId(), tipo: tipo, nombreArchivo: nm + '.' + ext });
  }
  return out;
}
function histAdd_(ped, txt) { ped.hist = ped.hist || []; ped.hist.push({ fecha: new Date().toISOString(), txt: String(txt).slice(0, 200) }); if (ped.hist.length > 200) ped.hist = ped.hist.slice(-200); }
/** Estado de una web (para el cartel de "suspendida"): lo consultan el sitio de la demo y las webs finales de los clientes. */
function estadoWeb_(id) {
  id = idOk_(id); if (!id) return { ok: false, mensaje: 'Código inválido.' };
  var ped = pedLeer_(id), sus = !!(ped && ped.web && ped.web.estado === 'suspendida');
  return { ok: true, data: { suspendida: sus, mensaje: sus ? 'Este sitio está suspendido temporalmente.' : '' } };
}
/** Copia de seguridad de lo que el cliente cargó en su panel de demo (vive en su navegador). Solo para demos con pedido. */
function demoRespaldar_(b) {
  var id = idOk_(b.id); if (!id || !pedLeer_(id)) return { ok: false, mensaje: 'Sin pedido.' };
  var datos = String(b.datos || ''); if (datos.length < 10 || datos.length > 3 * 1024 * 1024) return { ok: false, mensaje: 'Datos inválidos.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var d = carp_('tuweeb-respaldos'), it = d.getFilesByName(id + '.json'), pv = d.getFilesByName(id + '.prev.json');
    if (it.hasNext()) { var f = it.next(); while (pv.hasNext()) pv.next().setTrashed(true); f.setName(id + '.prev.json'); }
    d.createFile(id + '.json', JSON.stringify({ id: id, fecha: new Date().toISOString(), datos: datos }), MimeType.PLAIN_TEXT);
    return { ok: true, data: { guardado: true } };
  } finally { lock.releaseLock(); }
}
/** El cliente ve los comprobantes que subió él mismo (por demo + id del pago). */
function pedidoVerComprobante_(b) {
  var id = idOk_(b.id), ped = id && pedLeer_(id), g = ped && (ped.pagos || []).filter(function (x) { return x.id === String(b.pagoId || ''); })[0]; if (!g || !g.archivo) return { ok: false, mensaje: 'Sin comprobante.' };
  var n = Math.round(Number(b.n) || 0), src = n > 0 ? (g.extra || [])[n - 1] : g; if (!src || !src.archivo) return { ok: false, mensaje: 'Sin comprobante.' };
  return { ok: true, data: { tipo: src.tipo, nombre: src.nombreArchivo, datos: Utilities.base64Encode(DriveApp.getFileById(src.archivo).getBlob().getBytes()) } };
}
function pedidoComprobante_(b) {
  var id = idOk_(b.id), demo = id && demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Esta demo ya no existe.' };
  var k = String(b.k || ''); if (!PRODUCTOS[k]) return { ok: false, mensaje: 'Producto inválido.' };
  var tipo = String(b.tipo || '').toLowerCase(), ext = COMP_TIPOS[tipo]; if (!ext && b.sinArchivo !== true) return { ok: false, mensaje: 'Subí una foto (JPG, PNG) o un PDF.' };
  var monto = Math.round(Number(b.monto) || 0); if (monto < 1 || monto > 50000000) return { ok: false, mensaje: 'Escribí el monto que transferiste.' };
  var sinArch = b.sinArchivo === true, b64 = String(b.datos || '').replace(/^data:[^,]*,/, '').replace(/\s/g, ''); if (!sinArch && !b64) return { ok: false, mensaje: 'El archivo llegó vacío.' };
  if (b64.length * 0.75 > 4 * 1024 * 1024) return { ok: false, mensaje: 'El archivo pesa demasiado (máximo 4 MB).' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ped = pedLeer_(id); if (!ped || !ped.items[k]) return { ok: false, mensaje: 'Primero elegí esta opción.' };
    if ((ped.pagos || []).filter(function (g) { return g.estado === 'revision'; }).length >= 8) return { ok: false, mensaje: 'Ya tenés varios comprobantes en revisión. Esperá a que los confirmemos.' };
    var pid = 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), nombre = texto_(b.nombre || '', 80).replace(/[\\\/:*?"<>|]/g, '_').replace(/\.[A-Za-z0-9]+$/, '') || 'comprobante';
    var f = sinArch ? null : carp_(CARP_COMP).createFile(Utilities.newBlob(Utilities.base64Decode(b64), tipo, id + '_' + pid + '.' + ext));
    var pg = { id: pid, k: k, fecha: new Date().toISOString(), monto: monto, estado: 'revision', archivo: f ? f.getId() : '', tipo: sinArch ? '' : tipo, nombreArchivo: f ? nombre + '.' + ext : '', nota: '' };
    var ex = adjuntosExtra_(id, pid, b.extra, 1); if (ex === null) return { ok: false, mensaje: 'Algún archivo no es válido o pesa más de 4 MB.' }; if (ex.length) pg.extra = ex;
    ped.pagos = ped.pagos || []; ped.pagos.push(pg);
    pedGuardar_(ped);
    avisoDueno_('Comprobante recibido: ' + demo.nombre, demo.nombre + ' (' + demo.email + ')\n' + PRODUCTOS[k].nombre + '\nMonto: $' + monto);
    return { ok: true, data: pedPublico_(id, ped, demo) };
  } finally { lock.releaseLock(); }
}
/** ¿Está libre ese dominio? Se consulta el registro público (RDAP): 404 = libre, 200 = ocupado. */
function dominioBuscar_(q) {
  var t = String(q || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9-]{2,60}(\.[a-z0-9-]{2,20}){0,2}$/.test(t)) return { ok: false, mensaje: 'Escribí un nombre sin espacios, por ejemplo minegocio o minegocio.com.ar' };
  var lista = t.indexOf('.') > 0 ? [t] : ['.com', '.com.ar', '.net', '.ar'].map(function (x) { return t + x; });
  var res = lista.map(function (d) {
    var estado = 'desconocido';
    try {
      var url = /\.com$/.test(d) ? 'https://rdap.verisign.com/com/v1/domain/' + d : /\.net$/.test(d) ? 'https://rdap.verisign.com/net/v1/domain/' + d : /\.ar$/.test(d) ? 'https://rdap.nic.ar/domain/' + d : 'https://rdap.org/domain/' + d;
      var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true }), c = r.getResponseCode();
      estado = c === 404 ? 'libre' : c === 200 ? 'ocupado' : 'desconocido';
    } catch (e) {}
    return { dominio: d, estado: estado };
  });
  return { ok: true, data: res };
}

/* ───────────── panel del dueño ───────────── */
function adminLogin_(b) {
  var cache = CacheService.getScriptCache(), k = 'afail', n = Number(cache.get(k) || 0);
  if (n >= 6) return { ok: false, mensaje: 'Demasiados intentos. Esperá 15 minutos.' };
  var guardada = PropertiesService.getScriptProperties().getProperty('adminHash') || '', sal = ADMIN_SAL, h = ADMIN_HASH;
  if (guardada.indexOf('$') > 0) { sal = guardada.split('$')[0]; h = guardada.split('$')[1]; }
  if (sha_(sal + String(b.clave || '')) !== h) { cache.put(k, String(n + 1), 900); Utilities.sleep(800); return { ok: false, mensaje: 'Clave incorrecta.' }; }
  var tk = Utilities.getUuid() + Utilities.getUuid().slice(0, 8); cache.put('adm:' + tk, '1', 21600);
  return { ok: true, data: { token: tk } };
}
function adminOk_(b) { return b && b.token && CacheService.getScriptCache().get('adm:' + String(b.token)) === '1'; }
function indice_() {
  var d = carpeta_(), it = d.getFilesByName('_indice.json');
  if (it.hasNext()) { try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch (e) {} }
  var out = [], fs = d.getFiles();
  while (fs.hasNext()) { var f = fs.next(), n = f.getName(); if (!/^[a-z0-9-]+\.json$/.test(n)) continue; try { var x = JSON.parse(f.getBlob().getDataAsString()); out.push({ id: x.id, nombre: x.nombre, email: x.email, whatsapp: x.whatsapp || '', creada: x.creada }); } catch (e) {} }
  indiceGuardar_(out); return out;
}
function indiceGuardar_(l) {
  var d = carpeta_(), it = d.getFilesByName('_indice.json');
  if (it.hasNext()) it.next().setContent(JSON.stringify(l)); else d.createFile('_indice.json', JSON.stringify(l), MimeType.PLAIN_TEXT);
}
function resumenPed_(p) {
  var items = Object.keys(p.items || {}).map(function (k) { return calcItem_(p, k); }), conf = 0, rev = 0, tot = 0;
  items.forEach(function (i) { conf += i.confirmado; rev += i.revision; tot += i.total; });
  var pv = (p.venc || []).filter(function (v) { return !v.hecho; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; })[0];
  return { items: items.map(function (i) { return { k: i.k, estado: i.estado }; }), total: tot, pagado: conf, revision: rev, suspendida: !!(p.web && p.web.estado === 'suspendida'), proxVenc: pv ? { fecha: pv.fecha, concepto: pv.concepto, monto: pv.monto || 0 } : null };
}
function admin_(b) {
  var a = String(b.action || '');
  if (/^admin(Salon|Nota|Cobro|Reg)/.test(a)) return crmAdmin_(b);
  if (a === 'adminDemos') {
    var peds = {}, fs = carp_(CARP_PEDIDOS).getFiles();
    while (fs.hasNext()) { var f = fs.next(); try { var p = JSON.parse(f.getBlob().getDataAsString()); peds[p.id] = resumenPed_(p); } catch (e) {} }
    var lista = indice_().slice().sort(function (x, y) { return String(y.creada) < String(x.creada) ? -1 : 1; }).map(function (d) { d.pedido = peds[d.id] || null; return d; });
    return { ok: true, data: { demos: lista, transferencia: (function () { var t = transferCfg_(); if (t.mp === undefined) t.mp = MP_LINK; return t; })() } };
  }
  var id = idOk_(b.id);
  if (a === 'adminPedido') {
    var demo = id && demoRaw_(id); if (!demo) return { ok: false, mensaje: 'Demo inexistente.' };
    var ped = pedLeer_(id), pub = pedPublico_(id, ped, demo);
    return { ok: true, data: { demo: { id: id, nombre: demo.nombre, email: demo.email, whatsapp: demo.whatsapp || '', creada: demo.creada, color: demo.color }, pedido: pub, pagos: (ped && ped.pagos) || [], hist: (ped && ped.hist) || [] } };
  }
  if (a === 'adminPago') {
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      var p2 = pedLeer_(id); if (!p2) return { ok: false, mensaje: 'Sin pedido.' };
      var g = (p2.pagos || []).filter(function (x) { return x.id === b.pagoId; })[0]; if (!g) return { ok: false, mensaje: 'Pago inexistente.' };
      if (['confirmado', 'rechazado', 'revision'].indexOf(b.estado) < 0) return { ok: false, mensaje: 'Estado inválido.' };
      g.estado = b.estado; g.nota = texto_(b.nota, 200); if (b.monto != null && Number(b.monto) > 0) g.monto = Math.round(Number(b.monto));
      histAdd_(p2, 'Pago de ' + g.monto + ' (' + g.k + '): ' + b.estado);
      pedGuardar_(p2);
      if (b.estado !== 'revision') { try { MailApp.sendEmail({ to: emailCRM_(id) || p2.email, name: 'tuweeb', subject: b.estado === 'confirmado' ? 'Confirmamos tu pago' : 'No pudimos confirmar tu pago', body: 'Hola!\n\n' + (b.estado === 'confirmado' ? 'Confirmamos tu pago de $' + g.monto + ' (' + PRODUCTOS[g.k].nombre + ').' : 'No pudimos confirmar tu comprobante de $' + g.monto + '. ' + (g.nota || 'Escribinos por WhatsApp y lo vemos.')) + '\n\nMirá el estado en tu panel: ' + SITIO + 'panel/?d=' + id }); } catch (e) {} }
      return { ok: true, data: pedPublico_(id, p2, demoRaw_(id)) };
    } finally { lock.releaseLock(); }
  }
  if (a === 'adminPagoManual') {
    var lk = LockService.getScriptLock(); lk.waitLock(20000);
    try {
      var p3 = pedLeer_(id); if (!p3 || !p3.items[b.k]) return { ok: false, mensaje: 'Sin ese producto en el pedido.' };
      var m = Math.round(Number(b.monto) || 0); if (m < 1) return { ok: false, mensaje: 'Monto inválido.' };
      p3.pagos.push({ id: 'P' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), k: b.k, fecha: new Date().toISOString(), monto: m, estado: 'confirmado', archivo: '', tipo: '', nombreArchivo: '', nota: texto_(b.nota, 200) || 'Cargado por tuweeb' });
      histAdd_(p3, 'Pago cargado a mano: ' + m + ' (' + b.k + ')'); pedGuardar_(p3); return { ok: true, data: pedPublico_(id, p3, demoRaw_(id)) };
    } finally { lk.releaseLock(); }
  }
  if (a === 'adminItem') {
    var lk2 = LockService.getScriptLock(); lk2.waitLock(20000);
    try {
      var p4 = pedLeer_(id); if (!p4 || !p4.items[b.k]) return { ok: false, mensaje: 'Sin ese producto en el pedido.' };
      var it4 = p4.items[b.k]; if (['pedido', 'entregado'].indexOf(b.estado) >= 0) it4.estado = b.estado;
      if (b.url != null) { var u = String(b.url).trim(); it4.url = /^https:\/\/[^\s<>"]{3,200}$/.test(u) ? u : ''; }
      if (b.nota != null) it4.nota = texto_(b.nota, 200);
      pedGuardar_(p4); return { ok: true, data: pedPublico_(id, p4, demoRaw_(id)) };
    } finally { lk2.releaseLock(); }
  }
  if (a === 'adminWeb') {
    var lk9 = LockService.getScriptLock(); lk9.waitLock(20000);
    try {
      var p9 = pedLeer_(id); if (!p9) return { ok: false, mensaje: 'Sin pedido.' };
      var est9 = b.estado === 'suspendida' ? 'suspendida' : 'activa';
      p9.web = { estado: est9, desde: new Date().toISOString(), motivo: texto_(b.motivo, 200) }; histAdd_(p9, est9 === 'suspendida' ? 'Web suspendida' + (p9.web.motivo ? ': ' + p9.web.motivo : '') : 'Web reactivada');
      pedGuardar_(p9); return { ok: true, data: { pedido: pedPublico_(id, p9, demoRaw_(id)), pagos: p9.pagos, hist: p9.hist } };
    } finally { lk9.releaseLock(); }
  }
  if (a === 'adminVenc') {
    var lk10 = LockService.getScriptLock(); lk10.waitLock(20000);
    try {
      var p10 = pedLeer_(id); if (!p10) return { ok: false, mensaje: 'Sin pedido.' }; p10.venc = p10.venc || [];
      if (b.op === 'add') {
        var f10 = String(b.fecha || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(f10)) return { ok: false, mensaje: 'Poné la fecha del vencimiento.' };
        var c10 = texto_(b.concepto, 80); if (!c10) return { ok: false, mensaje: 'Poné de qué es el vencimiento.' };
        p10.venc.push({ id: 'V' + Utilities.getUuid().replace(/-/g, '').slice(0, 6), concepto: c10, fecha: f10, monto: Math.max(0, Math.round(Number(b.monto) || 0)), hecho: false }); histAdd_(p10, 'Vencimiento cargado: ' + c10 + ' el ' + f10);
      } else {
        var v10 = p10.venc.filter(function (x) { return x.id === b.vid; })[0]; if (!v10) return { ok: false, mensaje: 'Vencimiento inexistente.' };
        if (b.op === 'hecho') { v10.hecho = b.hecho !== false; histAdd_(p10, (v10.hecho ? 'Vencimiento pagado: ' : 'Vencimiento reabierto: ') + v10.concepto); }
        else if (b.op === 'borrar') { p10.venc = p10.venc.filter(function (x) { return x.id !== b.vid; }); histAdd_(p10, 'Vencimiento borrado: ' + v10.concepto); }
        else return { ok: false, mensaje: 'Acción inválida.' };
      }
      pedGuardar_(p10); return { ok: true, data: { pedido: pedPublico_(id, p10, demoRaw_(id)), pagos: p10.pagos, hist: p10.hist || [] } };
    } finally { lk10.releaseLock(); }
  }
  if (a === 'adminComprobante') {
    var p5 = pedLeer_(id), g5 = p5 && (p5.pagos || []).filter(function (x) { return x.id === b.pagoId; })[0]; if (!g5 || !g5.archivo) return { ok: false, mensaje: 'Sin archivo.' };
    var n5 = Math.round(Number(b.n) || 0), src = n5 > 0 ? (g5.extra || [])[n5 - 1] : g5; if (!src || !src.archivo) return { ok: false, mensaje: 'Sin archivo.' };
    var bl = DriveApp.getFileById(src.archivo).getBlob();
    return { ok: true, data: { tipo: src.tipo, nombre: src.nombreArchivo, datos: Utilities.base64Encode(bl.getBytes()) } };
  }
  if (a === 'adminPagoAdjuntar') {
    var lk6 = LockService.getScriptLock(); lk6.waitLock(20000);
    try {
      var p6 = pedLeer_(id), g6 = p6 && (p6.pagos || []).filter(function (x) { return x.id === b.pagoId; })[0]; if (!g6) return { ok: false, mensaje: 'Pago inexistente.' };
      var nu = adjuntosExtra_(id, g6.id, [{ tipo: b.tipo, datos: b.datos, nombre: b.nombre }], (g6.extra || []).length + 2); if (!nu || !nu.length) return { ok: false, mensaje: 'Subí una foto (JPG, PNG) o un PDF de hasta 4 MB.' };
      if (!g6.archivo) { g6.archivo = nu[0].archivo; g6.tipo = nu[0].tipo; g6.nombreArchivo = nu[0].nombreArchivo; } else { g6.extra = (g6.extra || []).concat(nu); }
      pedGuardar_(p6); return { ok: true, data: { pedido: pedPublico_(id, p6, demoRaw_(id)), pagos: p6.pagos } };
    } finally { lk6.releaseLock(); }
  }
  if (a === 'adminPagoBorrar') {
    var lk7 = LockService.getScriptLock(); lk7.waitLock(20000);
    try {
      var p7 = pedLeer_(id); if (!p7) return { ok: false, mensaje: 'Sin pedido.' };
      var n0 = (p7.pagos || []).length; p7.pagos = (p7.pagos || []).filter(function (x) { return x.id !== b.pagoId; }); if (p7.pagos.length === n0) return { ok: false, mensaje: 'Pago inexistente.' };
      histAdd_(p7, 'Pago borrado'); pedGuardar_(p7); return { ok: true, data: { pedido: pedPublico_(id, p7, demoRaw_(id)), pagos: p7.pagos } };
    } finally { lk7.releaseLock(); }
  }
  if (a === 'adminAcuerdo') {
    var lk8 = LockService.getScriptLock(); lk8.waitLock(20000);
    try {
      var p8 = pedLeer_(id); if (!p8 || !p8.items[b.k]) return { ok: false, mensaje: 'Sin ese producto en el pedido.' };
      var num = function (v) { v = Math.round(Number(v) || 0); return v > 0 && v <= 50000000 ? v : 0; };
      var ac8 = { total: num(b.total), sena: num(b.sena), cuota: num(b.cuota) };
      if (ac8.total || ac8.sena || ac8.cuota) p8.items[b.k].acuerdo = ac8; else delete p8.items[b.k].acuerdo;
      histAdd_(p8, 'Acuerdo de pago: total ' + ac8.total + ', seña ' + ac8.sena + ', cuota ' + ac8.cuota); pedGuardar_(p8); return { ok: true, data: { pedido: pedPublico_(id, p8, demoRaw_(id)), pagos: p8.pagos } };
    } finally { lk8.releaseLock(); }
  }
  if (a === 'adminPublicarWeb') { try { return publicarWeb_(b); } catch (e) { return { ok: false, mensaje: 'No se pudo publicar: ' + String(e.message || e).slice(0, 160) }; } }
  if (a === 'adminEliminarWeb') { try { return eliminarWeb_(b); } catch (e) { return { ok: false, mensaje: 'No se pudo completar: ' + String(e.message || e).slice(0, 160) }; } }
  if (a === 'adminRvConectar') { try { return conectarReservas_(b); } catch (e) { return { ok: false, mensaje: 'No se pudo: ' + String(e.message || e).slice(0, 140) }; } }
  if (a === 'adminVincularWeb') { try { return vincularWeb_(b); } catch (e) { return { ok: false, mensaje: 'No se pudo: ' + String(e.message || e).slice(0, 140) }; } }
  if (a === 'adminRvImportar') { try { var idi = idOk_(b.id), di = idi && demoRaw_(idi); if (!di || !di.repo || !di.hojaId) return { ok: false, mensaje: 'Primero conectá sus reservas.' }; var oid = String(b.origen || '').trim(); var mo = /\/d\/([A-Za-z0-9_-]{20,})/.exec(oid); oid = mo ? mo[1] : oid; if (!/^[A-Za-z0-9_-]{20,}$/.test(oid)) return { ok: false, mensaje: 'Pegá el link de la planilla anterior.' }; if (oid === di.hojaId) return { ok: false, mensaje: 'Esa es la planilla de su sistema nuevo.' }; return { ok: true, data: { traido: rvImportar_(idi, oid) } }; } catch (eim) { return { ok: false, mensaje: 'No pude traer los datos: ' + String(eim.message || eim).slice(0, 140) }; } }
  if (a === 'adminRvSembrar') { try { var ids = idOk_(b.id), ds = ids && demoRaw_(ids); if (!ds || !ds.repo) return { ok: false, mensaje: 'Primero pasalo a cliente.' }; var rs = sembrarCliente_(ids); return { ok: true, data: rs }; } catch (e) { return { ok: false, mensaje: 'No se pudo: ' + String(e.message || e).slice(0, 140) }; } }
  if (a === 'adminPanelClave') { try {
    var idk = idOk_(b.id), dk = idk && demoRaw_(idk); if (!dk || !dk.repo) return { ok: false, mensaje: 'Primero pasalo a cliente.' };
    var emk = panelEmailVivo_(idk, dk); if (!emk) return { ok: false, mensaje: 'No tiene mail del panel guardado.' };
    var ck = claveNueva_(); rvNuevaClave_(idk, emk, ck); return { ok: true, data: { acceso: { email: emk, clave: ck } } };
  } catch (e) { return { ok: false, mensaje: 'No se pudo generar la clave: ' + String(e.message || e).slice(0, 140) }; } }
  if (a === 'adminPasarCliente') { try { return pasarCliente_(b); } catch (e) { return { ok: false, mensaje: 'No se pudo completar: ' + String(e.message || e).slice(0, 160) }; } }
  if (a === 'adminGithubEstado') { var gp = PropertiesService.getScriptProperties(); return { ok: true, data: { configurado: !!gp.getProperty('ghToken'), usuario: gp.getProperty('ghUser') || '' } }; }
  if (a === 'adminGithubQuitar') { var gq = PropertiesService.getScriptProperties(); gq.deleteProperty('ghToken'); gq.deleteProperty('ghUser'); return { ok: true, data: { configurado: false, usuario: '' } }; }
  if (a === 'adminGithubGuardar') {   // el permiso queda guardado solo en el sistema: nunca se devuelve ni se muestra
    var tk = String(b.gh || '').trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,300}$/.test(tk)) return { ok: false, mensaje: 'Ese código no parece de GitHub. Copialo completo (empieza con github_pat_).' };
    var gr; try { gr = UrlFetchApp.fetch('https://api.github.com/user', { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json', 'User-Agent': 'tuweeb' }, muteHttpExceptions: true }); } catch (e) { return { ok: false, mensaje: 'No pude comunicarme con GitHub. Probá de nuevo.' }; }
    if (gr.getResponseCode() !== 200) return { ok: false, mensaje: 'GitHub no aceptó ese código. Revisá que esté completo y que no haya vencido.' };
    var login = JSON.parse(gr.getContentText()).login;
    var gr2 = UrlFetchApp.fetch('https://api.github.com/repos/' + login + '/demo', { headers: { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json', 'User-Agent': 'tuweeb' }, muteHttpExceptions: true });
    var perm = gr2.getResponseCode() === 200 ? (JSON.parse(gr2.getContentText()).permissions || {}) : {};
    if (!perm.push) return { ok: false, mensaje: 'El código funciona pero no puede escribir en tus repositorios. Al crearlo elegí «All repositories» y Contents: Read and write.' };
    var gs = PropertiesService.getScriptProperties(); gs.setProperty('ghToken', tk); gs.setProperty('ghUser', login);
    return { ok: true, data: { configurado: true, usuario: login } };
  }
  if (a === 'adminConfig') {
    var mp = String(b.mp || '').trim(), c = { alias: texto_(b.alias, 60), titular: texto_(b.titular, 80), banco: texto_(b.banco, 60), cbu: texto_(b.cbu, 40), nota: texto_(b.nota, 200), mp: /^https:\/\/[^\s<>"]{8,200}$/.test(mp) ? mp : '' };
    PropertiesService.getScriptProperties().setProperty('transfer', JSON.stringify(c)); return { ok: true, data: c };
  }
  if (a === 'adminDemoReactivar') {   // una demo vencida vuelve a vivir 7 días más, tal como se envió
    var did = idOk_(b.id); if (!did) return { ok: false, mensaje: 'Demo inexistente.' };
    if (carpeta_().getFilesByName(did + '.json').hasNext()) return { ok: true, data: true };
    var av = carp_(CARP_VENCIDAS).getFilesByName(did + '.json'); if (!av.hasNext()) return { ok: false, mensaje: 'No quedó copia de esa demo. Creá una nueva.' };
    var fa = av.next(), dx = JSON.parse(fa.getBlob().getDataAsString()); dx.creada = new Date().toISOString();
    carpeta_().createFile(did + '.json', JSON.stringify(dx), MimeType.PLAIN_TEXT); fa.setTrashed(true);
    var ixr = indice_().filter(function (x) { return x.id !== did; }); ixr.push({ id: dx.id, nombre: dx.nombre, email: dx.email, whatsapp: dx.whatsapp || '', creada: dx.creada }); indiceGuardar_(ixr);
    var bs = crmLeer_(), r2 = bs.rows.filter(function (r) { return r.demo === did; })[0]; if (r2) celdas_(bs.h, r2.fila, { 10: dx.creada, 11: '' });
    return { ok: true, data: true };
  }
  if (a === 'adminBorrarDemo') {
    var it = id && carpeta_().getFilesByName(id + '.json'); if (!it || !it.hasNext()) return { ok: false, mensaje: 'Demo inexistente.' };
    archivarDemo_(it.next());   // la demo queda guardada aparte; el pedido y los comprobantes sí se borran
    var pf = carp_(CARP_PEDIDOS).getFilesByName(id + '.json'); while (pf.hasNext()) pf.next().setTrashed(true);   // pedido y pagos de esa demo
    var cf = carp_(CARP_COMP).getFiles(); while (cf.hasNext()) { var cx = cf.next(); if (cx.getName().indexOf(id + '_') === 0) cx.setTrashed(true); }   // comprobantes
    indiceGuardar_(indice_().filter(function (x) { return x.id !== id; })); return { ok: true, data: true };
  }
  if (a === 'adminFichaLeer') return fichaLeer_(b.id);
  if (a === 'adminP3dGuardar') return p3dGuardar_(b.id, b.texto);
  if (a === 'adminP3dLeer') return p3dLeer_(b.id);
  if (a === 'adminCambiarClave') {
    var nv = String(b.nueva || ''); if (nv.length < 10) return { ok: false, mensaje: 'La clave nueva debe tener al menos 10 caracteres.' };
    var sal = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
    PropertiesService.getScriptProperties().setProperty('adminHash', sal + '$' + sha_(sal + nv)); return { ok: true, data: true };
  }
  return { ok: false, mensaje: 'Acción desconocida.' };
}

/** Baja un logo de la lista de salones (solo de elsitiodelpelotero.com) y lo devuelve como imagen, para que el creador lo cargue solo. */
function logoUrl_(u) {
  u = String(u || '');
  if (!/^https:\/\/www\.elsitiodelpelotero\.com\/clientes\/[\w.\-%]+$/.test(u)) return { ok: false, mensaje: 'Dirección de logo no permitida.' };
  var r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: false });
  if (r.getResponseCode() !== 200) return { ok: false, mensaje: 'No se pudo bajar el logo.' };
  var bl = r.getBlob(), ct = String(bl.getContentType() || ''), by = bl.getBytes();
  if (!/^image\/(png|jpeg|webp|gif)$/.test(ct) || by.length > 3000000) return { ok: false, mensaje: 'El logo no es una imagen válida.' };
  return { ok: true, data: { dataUrl: 'data:' + ct + ';base64,' + Utilities.base64Encode(by) } };
}

/** Salones a los que ya se les mandó el mensaje (se comparte entre la compu y el celu). */
function enviados_() {
  var it = carpeta_().getFilesByName('_enviados.json');
  try { return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString()) : {}; } catch (x) { return {}; }
}
function enviadoMarcar_(b) {
  var ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(String).filter(function (i) { return /^[a-z0-9]{3,40}$/.test(i); }).slice(0, 500);
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var m = enviados_(), ahora = new Date().getTime(), nuevos = ids.filter(function (i) { return !m[i]; }); ids.forEach(function (i) { if (!m[i]) m[i] = ahora; });
    try { crmEnviado_(nuevos); } catch (e) {}
    var d = carpeta_(), it = d.getFilesByName('_enviados.json');
    if (it.hasNext()) it.next().setContent(JSON.stringify(m)); else d.createFile('_enviados.json', JSON.stringify(m), MimeType.PLAIN_TEXT);
    return { ok: true, data: m };
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents);
    if (b.cl) return rvEntrada_(b, true);   // reservas de un cliente (Reservas.gs)
    if (b.action === 'demoCrear') return json_(demoCrear_(b));
    if (b.action === 'opMarcar') return json_(enviadoMarcar_(b));
    if (b.action === 'pedidoGuardar') return json_(pedidoGuardar_(b));
    if (b.action === 'pedidoComprobante') return json_(pedidoComprobante_(b));
    if (b.action === 'pedidoVerComprobante') return json_(pedidoVerComprobante_(b));
    if (b.action === 'demoRespaldar') return json_(demoRespaldar_(b));
    if (b.action === 'demoFichaPanel') return json_(demoFichaPanel_(b));
    if (b.action === 'adminLogin') return json_(adminLogin_(b));
    if (/^admin/.test(String(b.action))) return json_(adminOk_(b) ? admin_(b) : { ok: false, mensaje: 'Sesión vencida. Volvé a entrar.', sesion: true });
    return json_({ ok: false, mensaje: 'Acción desconocida.' });
  } catch (x) { return json_({ ok: false, mensaje: 'No pudimos crear tu weeb. Probá de nuevo.' }); }
}
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.cl) return rvEntrada_(p, false);   // reservas de un cliente (Reservas.gs)
    if (p.action === 'demo') return json_(demoLeer_(p.id));
    if (p.action === 'estadoWeb') return json_(estadoWeb_(p.id));
    if (p.action === 'pedido') return json_(pedidoGet_(p.id));
    if (p.action === 'dominio') return json_(dominioBuscar_(p.q));
    if (p.action === 'logoUrl') return json_(logoUrl_(p.u));
    if (p.action === 'salon') return json_(crmSalonPublico_(p.id));
    if (p.action === 'enviados') return json_({ ok: true, data: enviados_() });
    return json_({ ok: true, data: 'fabrica tuweeb' });
  } catch (x) { return json_({ ok: false, mensaje: 'Error.' }); }
}

/** Demos que NO se tocan nunca: las de un salón que ya está hablando, es cliente, postventa o se descartó (etapa cargada en la planilla). */
function demosProtegidas_() {
  var m = {}; crmLeer_().rows.forEach(function (r) { if (r.demo && ETAPAS.indexOf(r.etapa) >= 0) m[r.demo] = 1; }); return m;
}
/** La demo vencida no se borra: se guarda aparte, con todo lo que se le mandó al salón (nombre, logo, colores). Se puede reactivar desde la ficha. */
function archivarDemo_(f) { f.moveTo(carp_(CARP_VENCIDAS)); }
/** Se programa una vez (diaria): las demos de más de DIAS_VIDA días pasan al archivo, salvo las protegidas o con pedido. Si no puede saber qué proteger, no toca nada. */
function limpiar() {
  var prot; try { prot = demosProtegidas_(); } catch (e) { return; }
  var corte = new Date().getTime() - DIAS_VIDA * 86400000, it = carpeta_().getFiles(), movidos = false;
  while (it.hasNext()) {
    var f = it.next(), nom = f.getName(); if (/^_/.test(nom)) continue;
    var id = nom.replace(/\.json$/, '');
    if (f.getDateCreated().getTime() < corte && !prot[id] && !pedLeer_(id)) { archivarDemo_(f); movidos = true; }
  }
  if (movidos) { var vivos = []; var it2 = carpeta_().getFiles(); while (it2.hasNext()) { var g = it2.next(); if (/^_/.test(g.getName())) continue; try { var x = JSON.parse(g.getBlob().getDataAsString()); vivos.push({ id: x.id, nombre: x.nombre, email: x.email, whatsapp: x.whatsapp || '', creada: x.creada }); } catch (e) {} } indiceGuardar_(vivos); }
}
function programarLimpieza() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'limpiar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('limpiar').timeBased().everyDays(1).atHour(4).create();
}

/* ============ Base de salones (CRM): la planilla "Salones" es la fuente única ============
 * Columnas: A Nombre · B Logo · C Provincia · D Ciudad · E WhatsApp · F Link WhatsApp (los carga el dueño)
 *           G ID · H Etapa (hablando/cliente/postventa/descartado; vacío = automática) · I Demo · J Demo creada · K Enviada
 *           L Acordado · M Web vendida · N Resumen. Hojas "Notas" y "Cobros" (con comprobantes en Drive). Los salones NUNCA se borran. */
var SHEET_ID = '1BVH40TxG4BkY--b_NhRkkL731Dz9GsdCpTH2vSL2hr0', HOJA = 'Salones', ETAPAS = ['hablando', 'cliente', 'postventa', 'descartado'];
var CAB_REG = ['Salón', 'Id', 'Tipo', 'Fecha', 'Título', 'Detalle', 'Monto', 'Estado', 'Archivo', 'Tipo archivo', 'Nombre archivo'], CAB_NOTAS = ['Salón', 'Fecha', 'Nota', 'Id'], CAB_COBROS = ['Salón', 'Id', 'Fecha', 'Monto', 'Detalle', 'Archivo', 'Tipo', 'Nombre del archivo'];
function libro_() { return SpreadsheetApp.openById(SHEET_ID); }
function hojaAux_(nombre, cab) { var l = libro_(), h = l.getSheetByName(nombre); if (!h) { h = l.insertSheet(nombre); h.appendRow(cab); h.setFrozenRows(1); } return h; }
function digs_(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }
function iso_(v) { if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString(); v = String(v == null ? '' : v); var t = Date.parse(v); return isNaN(t) ? '' : new Date(t).toISOString(); }
function fechaAR_(v) { if (v instanceof Date) return iso_(v); var m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12)).toISOString() : iso_(v); }
function wsp_(tel, lnk) { var d = digs_(lnk).length >= 10 ? digs_(lnk) : digs_(tel); if (!d) return ''; if (d.indexOf('54') === 0) return d; if (d.length >= 11 && (d.indexOf('52') === 0 || d.indexOf('34') === 0)) return d; return '549' + d.replace(/^0+/, '').replace(/^(\d{2,4})15/, '$1'); }
function slugId_(nombre, usados) {
  var base = String(nombre || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24); if (base.length < 3) base = (base + 'salon').slice(0, 24);
  var id = base, n = 1; while (usados[id] || RESERVADOS.indexOf(id) >= 0) { n++; id = base + n; } return id;
}
/** Lista vieja de salones (con los ids que ya usaban los "enviados"): sirve solo para asignar los ids la primera vez. */
function semilla_() { try { var l = JSON.parse(UrlFetchApp.fetch(SITIO + 'crear/salones.json').getContentText()), m = {}; l.forEach(function (x) { m[digs_(x.w).slice(-10)] = x.i; }); return m; } catch (e) { return {}; } }
/** Lee la planilla, asigna ids a filas nuevas, enlaza las demos existentes y trae lo que falte. Devuelve las filas listas. */
function crmLeer_() {
  var h = libro_().getSheetByName(HOJA), n = h.getLastRow(), vals = n > 1 ? h.getRange(2, 1, n - 1, 21).getValues() : [], usados = {}, sem = null, rows = [];
  vals.forEach(function (r) { if (r[6]) usados[String(r[6]).trim()] = 1; });
  vals.forEach(function (r, i) {
    var nom = String(r[0] || '').trim(); if (!nom) return;
    var id = String(r[6] || '').trim();
    if (!id) {
      if (sem === null) sem = semilla_();
      var s0 = sem[digs_(r[4]).slice(-10)]; id = (s0 && !usados[s0]) ? s0 : slugId_(nom, usados); usados[id] = 1; h.getRange(i + 2, 7).setValue(id);
    }
    rows.push({ fila: i + 2, id: id, n: nom, logo: String(r[1] || ''), prov: String(r[2] || ''), ciu: String(r[3] || ''), w: wsp_(r[4], r[5]), etapa: String(r[7] || '').toLowerCase().trim(), demo: String(r[8] || '').trim(), creada: iso_(r[9]), enviada: iso_(r[10]), acordado: Number(r[11]) || 0, web: String(r[12] || ''), resumen: String(r[13] || ''), contacto: String(r[14] || ''), email: String(r[15] || ''), seg: String(r[16] || ''), canal: String(r[17] || ''), primero: fechaAR_(r[18]), ig: String(r[19] || ''), origen: String(r[20] || '') });
  });
  if (h.getRange(1, 17).getValue() !== 'Seguimiento') h.getRange(1, 15, 1, 7).setValues([['Contacto', 'Email', 'Seguimiento', 'Canal', 'Primer contacto', 'Instagram', 'Origen']]);
  return { h: h, rows: rows, usados: usados };
}
function celdas_(h, fila, o) {  // o: { col: valor }
  Object.keys(o).forEach(function (c) { var v = o[c]; if (c === '10' || c === '11') { v = v ? new Date(v) : ''; var cell = h.getRange(fila, Number(c)); cell.setNumberFormat('dd/mm/yyyy hh:mm'); cell.setValue(v); } else h.getRange(fila, Number(c)).setValue(v); });
}
function crmEnlazar_(base, vivas, peds) {
  var rows = base.rows, h = base.h, env = enviados_(), cambio = false;
  var porTel = {}, porId = {}; rows.forEach(function (r) { if (r.w) porTel[r.w.slice(-10)] = r; porId[r.id] = r; });
  vivas.slice().sort(function (a, b) { return String(a.creada) < String(b.creada) ? -1 : 1; }).forEach(function (d) {
    var r = (d.whatsapp && porTel[digs_(d.whatsapp).slice(-10)]) || porId[slugId_(d.nombre, {})] || null;
    if (!r && peds[d.id]) {   // demo con pedido que no está en la planilla (ej: un cliente): se agrega
      var id = slugId_(d.nombre, base.usados); base.usados[id] = 1;
      h.appendRow([d.nombre, '', '', '', d.whatsapp || '', d.whatsapp ? 'https://wa.me/' + digs_(d.whatsapp) : '', id, 'hablando', d.id, '', '', '', '', '']);
      var fila = h.getLastRow(); celdas_(h, fila, { 10: d.creada });
      r = { fila: fila, id: id, n: d.nombre, logo: '', prov: '', ciu: '', w: digs_(d.whatsapp), etapa: 'hablando', demo: d.id, creada: d.creada, enviada: '', acordado: 0, web: '', resumen: '', contacto: '', email: '' }; rows.push(r); porId[id] = r; return;
    }
    if (!r) return;
    if (r.demo !== d.id && (!r.creada || String(d.creada) > String(r.creada))) { r.demo = d.id; r.creada = d.creada; celdas_(h, r.fila, { 9: d.id, 10: d.creada }); }
    if (peds[d.id] && !r.etapa) { r.etapa = 'hablando'; h.getRange(r.fila, 8).setValue('hablando'); }
  });
  rows.forEach(function (r) { if (!r.enviada && env[r.id]) { r.enviada = new Date(env[r.id]).toISOString(); celdas_(h, r.fila, { 11: r.enviada }); } });
  return rows;
}
function estadoSalon_(r, vivas, ahora) {
  if (ETAPAS.indexOf(r.etapa) >= 0) return { estado: r.etapa, dias: null };
  if (!r.demo) return { estado: (r.seg && r.seg !== 'Pendiente') ? 'contactado' : 'nuevo', dias: null };
  var d = vivas[r.demo]; if (!d) return { estado: 'vencida', dias: null };
  var dias = DIAS_VIDA - Math.floor((ahora - Date.parse(d.creada)) / 86400000);
  if (!r.enviada) return { estado: 'creada', dias: dias };
  return { estado: dias <= 2 ? 'porvencer' : 'enviada', dias: dias };
}
function crmCobrado_() {
  var h = libro_().getSheetByName('Cobros'), m = {}; if (!h || h.getLastRow() < 2) return m;
  h.getRange(2, 1, h.getLastRow() - 1, 4).getValues().forEach(function (r) { var k = String(r[0]); m[k] = (m[k] || 0) + (Number(r[3]) || 0); }); return m;
}
function crmSalones_() {
  var base = crmLeer_(), ix = indice_(), vivas = {}, peds = {}, ahora = new Date().getTime();
  ix.forEach(function (d) { vivas[d.id] = d; });
  var fs = carp_(CARP_PEDIDOS).getFiles(); while (fs.hasNext()) { var f = fs.next(); try { var p = JSON.parse(f.getBlob().getDataAsString()); peds[p.id] = resumenPed_(p); } catch (e) {} }
  var rows = crmEnlazar_(base, ix, peds), cob = crmCobrado_();
  return rows.map(function (r) { var e = estadoSalon_(r, vivas, ahora); r.estado = e.estado; r.dias = e.dias; r.demoVivo = !!vivas[r.demo]; r.pedido = peds[r.demo] || null; r.cobrado = cob[r.id] || 0; return r; });
}
function crmFila_(id) { var base = crmLeer_(), r = base.rows.filter(function (x) { return x.id === id; })[0]; return r ? { h: base.h, r: r, base: base } : null; }
/** Se corre una sola vez a mano desde el editor: pide el permiso para leer la planilla y deja las filas ordenadas. */
function autorizarPlanilla() { var n = crmSalones_().length; Logger.log('Salones leidos: ' + n); return n; }
function crmSalonPublico_(id) { id = String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40); var x = id && crmFila_(id); if (!x) return { ok: false, mensaje: 'No encontré ese salón en la planilla.' };
  var out = { i: x.r.id, n: x.r.n, l: x.r.logo, w: x.r.w, c: x.r.ciu, p: x.r.prov, e: x.r.email };
  return { ok: true, data: out }; }
function crmVincular_(salon, demoId, creada) { var x = crmFila_(String(salon || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)); if (x) celdas_(x.h, x.r.fila, { 9: demoId, 10: creada, 11: '' }); }
function crmEnviado_(ids) { if (ids.length > 20) return; var base = crmLeer_(); base.rows.forEach(function (r) { if (ids.indexOf(r.id) >= 0 && !r.enviada) celdas_(base.h, r.fila, { 11: new Date().toISOString() }); }); }
function crmAdmin_(b) {
  var a = String(b.action || ''), id = String(b.id || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  if (a === 'adminSalones') return { ok: true, data: { salones: crmSalones_(), transferencia: (function () { var t = transferCfg_(); if (t.mp === undefined) t.mp = MP_LINK; return t; })() } };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (a === 'adminSalonAlta') {
      var nom = texto_(b.nombre, 80); if (nom.length < 2) return { ok: false, mensaje: 'Falta el nombre.' };
      var base = crmLeer_(), nid = slugId_(nom, base.usados), tel = digs_(b.tel).slice(0, 15), et = ETAPAS.indexOf(b.etapa) >= 0 ? b.etapa : '';
      base.h.appendRow([nom, '', texto_(b.prov, 40), texto_(b.ciu, 60), tel, tel ? 'https://wa.me/' + wsp_(tel, '') : '', nid, et, '', '', '', '', '', '', texto_(b.contacto, 80), texto_(b.email, 120), '', '', '', texto_(b.ig, 60).replace(/^@/, ''), 'Alta manual']);
      return { ok: true, data: { id: nid } };
    }
    var x = crmFila_(id); if (!x) return { ok: false, mensaje: 'Salón inexistente.' };
    if (a === 'adminSalon') {
      var nh = libro_().getSheetByName('Notas'), ch = libro_().getSheetByName('Cobros'), notas = [], cobros = [];
      if (nh && nh.getLastRow() > 1) nh.getRange(2, 1, nh.getLastRow() - 1, 4).getValues().forEach(function (r) { if (String(r[0]) === id) notas.push({ nid: String(r[3]), fecha: iso_(r[1]), texto: String(r[2]) }); });
      if (ch && ch.getLastRow() > 1) ch.getRange(2, 1, ch.getLastRow() - 1, 8).getValues().forEach(function (r) { if (String(r[0]) === id) cobros.push({ id: String(r[1]), fecha: iso_(r[2]), monto: Number(r[3]) || 0, detalle: String(r[4] || ''), archivo: String(r[7] || ''), tipo: String(r[6] || ''), tiene: !!r[5] }); });
      var rh = libro_().getSheetByName('Registros'), regs = [];
      if (rh && rh.getLastRow() > 1) rh.getRange(2, 1, rh.getLastRow() - 1, 11).getValues().forEach(function (r) { if (String(r[0]) === id) regs.push({ rid: String(r[1]), tipo: String(r[2]), fecha: iso_(r[3]), titulo: String(r[4] || ''), detalle: String(r[5] || ''), monto: Number(r[6]) || 0, estado: String(r[7] || ''), tiene: !!r[8], tipoArchivo: String(r[9] || ''), archivo: String(r[10] || '') }); });
      var vivas = {}; indice_().forEach(function (d) { vivas[d.id] = d; });
      var e = estadoSalon_(x.r, vivas, new Date().getTime()); x.r.estado = e.estado; x.r.dias = e.dias; x.r.demoVivo = !!vivas[x.r.demo];
      try { var dfi = x.r.demo && demoRaw_(x.r.demo); x.r.dir = dfi && dfi.datos ? (dfi.datos.direccion || '') : ''; } catch (e) { x.r.dir = ''; }
      return { ok: true, data: { salon: x.r, notas: notas.reverse(), cobros: cobros.reverse(), registros: regs.reverse() } };
    }
    if (a === 'adminSalonGuardar') {
      var c = {};
      if (b.etapa !== undefined) { var etp = String(b.etapa || ''); if (etp && ETAPAS.indexOf(etp) < 0) return { ok: false, mensaje: 'Etapa inválida.' }; c[8] = etp; }
      if (b.acordado !== undefined) c[12] = Math.max(0, Math.min(1e9, Math.round(Number(b.acordado) || 0)));
      if (b.web !== undefined) { var w = String(b.web || '').trim(); c[13] = /^https:\/\/[^\s<>"]{3,200}$/.test(w) ? w : ''; }
      if (b.resumen !== undefined) c[14] = texto_(b.resumen, 300);
      if (b.nombre !== undefined) { var nn = texto_(b.nombre, 80); if (nn.length < 2) return { ok: false, mensaje: 'El nombre no puede quedar vacío.' }; c[1] = nn; }
      if (b.prov !== undefined) c[3] = texto_(b.prov, 40);
      if (b.ciu !== undefined) c[4] = texto_(b.ciu, 60);
      if (b.tel !== undefined) { var tl = digs_(b.tel).slice(0, 15); c[5] = tl; c[6] = tl ? 'https://wa.me/' + wsp_(tl, '') : ''; }
      if (b.contacto !== undefined) c[15] = texto_(b.contacto, 80);
      if (b.email !== undefined) c[16] = texto_(b.email, 120);
      if (b.seg !== undefined) c[17] = texto_(b.seg, 40);
      if (b.canal !== undefined) c[18] = texto_(b.canal, 40);
      if (b.ig !== undefined) c[20] = texto_(b.ig, 60).replace(/^@/, '');
      celdas_(x.h, x.r.fila, c);
      if ((b.tel !== undefined || b.nombre !== undefined || b.dir !== undefined) && x.r.demo) { try { var fv = {}; if (b.tel !== undefined) fv.whatsapp = b.tel; if (b.nombre !== undefined) fv.nombre = b.nombre; if (b.dir !== undefined) fv.direccion = b.dir; fichaAplicar_(x.r.demo, fv, 'admin'); } catch (e) {} }   // el mismo WhatsApp se ve en su demo
      return { ok: true, data: true };
    }
    if (a === 'adminNota') {
      var tx = texto_(b.texto, 1000); if (!tx) return { ok: false, mensaje: 'Escribí la nota.' };
      hojaAux_('Notas', CAB_NOTAS).appendRow([id, new Date(), tx, 'N' + Utilities.getUuid().replace(/-/g, '').slice(0, 8)]); return { ok: true, data: true };
    }
    if (a === 'adminNotaBorrar') {
      var nh2 = hojaAux_('Notas', CAB_NOTAS), v = nh2.getLastRow() > 1 ? nh2.getRange(2, 1, nh2.getLastRow() - 1, 4).getValues() : [];
      for (var i = 0; i < v.length; i++) if (String(v[i][0]) === id && String(v[i][3]) === String(b.nid)) { nh2.deleteRow(i + 2); return { ok: true, data: true }; }
      return { ok: false, mensaje: 'Nota inexistente.' };
    }
    if (a === 'adminReg' || a === 'adminRegBorrar' || a === 'adminRegArchivo') {
      var rhh = hojaAux_('Registros', CAB_REG), vr = rhh.getLastRow() > 1 ? rhh.getRange(2, 1, rhh.getLastRow() - 1, 11).getValues() : [], pos = -1;
      if (b.rid) { for (var q = 0; q < vr.length; q++) if (String(vr[q][0]) === id && String(vr[q][1]) === String(b.rid)) { pos = q; break; } if (pos < 0) return { ok: false, mensaje: 'Registro inexistente.' }; }
      if (a === 'adminRegArchivo') { if (!vr[pos][8]) return { ok: false, mensaje: 'Sin archivo.' }; var bl2 = DriveApp.getFileById(String(vr[pos][8])).getBlob(); return { ok: true, data: { tipo: String(vr[pos][9]), nombre: String(vr[pos][10]), datos: Utilities.base64Encode(bl2.getBytes()) } }; }
      if (a === 'adminRegBorrar') { if (vr[pos][8]) { try { DriveApp.getFileById(String(vr[pos][8])).setTrashed(true); } catch (e3) {} } rhh.deleteRow(pos + 2); return { ok: true, data: true }; }
      var TIPOS = ['contacto', 'local', 'presupuesto'], tp = String(b.tipo || ''); if (pos >= 0) tp = String(vr[pos][2]); if (TIPOS.indexOf(tp) < 0) return { ok: false, mensaje: 'Tipo inválido.' };
      var tit = texto_(b.titulo, 120); if (!tit) return { ok: false, mensaje: 'Falta el nombre o el título.' };
      var mto = Math.max(0, Math.min(1e10, Math.round(Number(b.monto) || 0))), tpA = String(b.tipoArchivo || '').toLowerCase(), extA = COMP_TIPOS[tpA], b64r = String(b.datos || '').replace(/^data:[^,]*,/, '').replace(/\s/g, '');
      if (b64r && !extA) return { ok: false, mensaje: 'El archivo tiene que ser JPG, PNG o PDF.' };
      if (b64r.length * 0.75 > 6 * 1024 * 1024) return { ok: false, mensaje: 'El archivo pesa demasiado (máximo 6 MB).' };
      var rid = pos >= 0 ? String(vr[pos][1]) : 'R' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), fid = pos >= 0 ? vr[pos][8] : '', ta = pos >= 0 ? vr[pos][9] : '', na = pos >= 0 ? vr[pos][10] : '';
      if (b64r) { if (fid) { try { DriveApp.getFileById(String(fid)).setTrashed(true); } catch (e4) {} } var nom2 = texto_(b.nombre || '', 80).replace(/[\\\/:*?"<>|]/g, '_').replace(/\.[A-Za-z0-9]+$/, '') || tp, f2 = carp_(CARP_COMP).createFile(Utilities.newBlob(Utilities.base64Decode(b64r), tpA, 'crm_' + id + '_' + rid + '.' + extA)); fid = f2.getId(); ta = tpA; na = nom2 + '.' + extA; }
      var fr = b.fecha && !isNaN(Date.parse(b.fecha)) ? new Date(b.fecha) : (pos >= 0 ? (vr[pos][3] || new Date()) : new Date());
      var fila2 = [id, rid, tp, fr, tit, texto_(b.detalle, 600), mto, texto_(b.estado, 40), fid, ta, na];
      if (pos >= 0) rhh.getRange(pos + 2, 1, 1, 11).setValues([fila2]); else rhh.appendRow(fila2);
      return { ok: true, data: { rid: rid } };
    }
    if (a === 'adminCobro') {
      var monto = Math.round(Number(b.monto) || 0); if (monto < 1 || monto > 1e9) return { ok: false, mensaje: 'Escribí el monto.' };
      var tipo = String(b.tipo || '').toLowerCase(), ext = COMP_TIPOS[tipo], b64 = String(b.datos || '').replace(/^data:[^,]*,/, '').replace(/\s/g, '');
      if (b64 && !ext) return { ok: false, mensaje: 'El comprobante tiene que ser JPG, PNG o PDF.' };
      if (b64.length * 0.75 > 6 * 1024 * 1024) return { ok: false, mensaje: 'El archivo pesa demasiado (máximo 6 MB).' };
      var pid = 'C' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), nombre = texto_(b.nombre || '', 80).replace(/[\\\/:*?"<>|]/g, '_').replace(/\.[A-Za-z0-9]+$/, '') || 'comprobante';
      var f = b64 ? carp_(CARP_COMP).createFile(Utilities.newBlob(Utilities.base64Decode(b64), tipo, 'crm_' + id + '_' + pid + '.' + ext)) : null;
      var fch = b.fecha && !isNaN(Date.parse(b.fecha)) ? new Date(b.fecha) : new Date();
      hojaAux_('Cobros', CAB_COBROS).appendRow([id, pid, fch, monto, texto_(b.detalle, 120), f ? f.getId() : '', b64 ? tipo : '', f ? nombre + '.' + ext : '']); return { ok: true, data: true };
    }
    if (a === 'adminCobroBorrar' || a === 'adminCobroArchivo') {
      var ch2 = hojaAux_('Cobros', CAB_COBROS), v2 = ch2.getLastRow() > 1 ? ch2.getRange(2, 1, ch2.getLastRow() - 1, 8).getValues() : [];
      for (var j = 0; j < v2.length; j++) if (String(v2[j][0]) === id && String(v2[j][1]) === String(b.pagoId)) {
        if (a === 'adminCobroArchivo') { if (!v2[j][5]) return { ok: false, mensaje: 'Sin archivo.' }; var bl = DriveApp.getFileById(String(v2[j][5])).getBlob(); return { ok: true, data: { tipo: String(v2[j][6]), nombre: String(v2[j][7]), datos: Utilities.base64Encode(bl.getBytes()) } }; }
        if (v2[j][5]) { try { DriveApp.getFileById(String(v2[j][5])).setTrashed(true); } catch (e2) {} }
        ch2.deleteRow(j + 2); return { ok: true, data: true };
      }
      return { ok: false, mensaje: 'Cobro inexistente.' };
    }
    return { ok: false, mensaje: 'Acción desconocida.' };
  } finally { lock.releaseLock(); }
}

if (typeof module !== 'undefined') module.exports = { crmLeer_: crmLeer_, crmEnlazar_: crmEnlazar_, estadoSalon_: estadoSalon_, crmAdmin_: crmAdmin_, wsp_: wsp_, doPost: doPost, doGet: doGet, limpiarSvg_: limpiarSvg_, logoValido_: logoValido_ };

/* Para correr a mano desde el editor de Apps Script (una sola vez): instala los avisos y respaldos del sistema de reservas */
/** Conecta las reservas de un sitio ya vinculado: crea su hoja, la registra en el sistema único, la llena con los horarios y combos y crea el acceso del dueño. */
function conectarReservas_(b) {
  var id = idOk_(b.id), f = id && fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
  var d = JSON.parse(f.getBlob().getDataAsString()); if (!d.repo) return { ok: false, mensaje: 'Primero vinculá su sitio o pasalo a cliente.' };
  if (d.hojaId) return { ok: false, mensaje: 'Ya tiene su sistema de reservas conectado.' };
  var em = String(b.email || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) em = String(d.email || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) em = emailCRM_(id);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em || '')) return { ok: false, mensaje: 'Falta el mail del dueño: con ese mail entra a su panel.' };
  var hoja = hojaCliente_(d.nombre, d.repo), cl = claveNueva_(), aviso = '';
  try {
    rvRegistrar_({ id: id, sheetId: hoja.id, nombre: d.nombre, whatsapp: d.whatsapp || (d.datos && d.datos.whatsapp) || '', email: em, clave: cl, dueno: (d.datos && d.datos.duenio) || '' });
    try { sembrarCliente_(id); } catch (esb) { aviso = 'Conectado, pero no pude cargarle los horarios y combos: usá «Cargar horarios y combos».'; }
    try { rvInstalarTriggers_(); } catch (etr) {}
  } catch (e) { try { DriveApp.getFileById(hoja.id).setTrashed(true); rvQuitar_(id); } catch (e2) {} return { ok: false, mensaje: 'No pude conectar las reservas: ' + String(e.message || e).slice(0, 120) }; }
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { var f2 = fichaArchivo_(id), d2 = JSON.parse(f2.getBlob().getDataAsString()); d2.hojaId = hoja.id; d2.hojaUrl = hoja.url; d2.panelEmail = em; f2.setContent(JSON.stringify(d2)); } finally { lock.releaseLock(); }
  return { ok: true, data: { acceso: { email: em, clave: cl }, aviso: aviso } };
}
/** Vincula un sitio que YA existe (como el de Planeta Niños) con su ficha del admin, sin crear, copiar ni tocar nada del sitio. */
function vincularWeb_(b) {
  var id = idOk_(b.id), repo = String(b.repo || '').trim().toLowerCase();
  if (!id || !/^[a-z0-9][a-z0-9-]{1,38}$/.test(repo)) return { ok: false, mensaje: 'Escribí el nombre del sitio en GitHub (letras, números o guiones).' };
  var gp = PropertiesService.getScriptProperties(), dueno = gp.getProperty('ghUser'); if (!gp.getProperty('ghToken') || !dueno) return { ok: false, mensaje: 'Primero conectá GitHub en Ajustes.' };
  var f = fichaArchivo_(id); if (!f) return { ok: false, mensaje: 'Esa demo no existe.' };
  var d = JSON.parse(f.getBlob().getDataAsString()); if (d.repo) return { ok: false, mensaje: 'Ya tiene su sitio: ' + d.repo };
  var r = gh_('GET', '/repos/' + dueno + '/' + repo); if (r.code !== 200) return { ok: false, mensaje: 'No encuentro ese sitio en GitHub (' + dueno + '/' + repo + '). Revisá el nombre.' };
  var dom = String(b.dominio || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  var url = dom ? 'https://' + dom + '/' : 'https://' + dueno + '.github.io/' + repo + '/';
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { var f2 = fichaArchivo_(id), d2 = JSON.parse(f2.getBlob().getDataAsString()); d2.repo = repo; d2.repoUrl = url; d2.vinculado = true; d2.clienteDesde = d2.clienteDesde || new Date().toISOString(); f2.setContent(JSON.stringify(d2)); } finally { lock.releaseLock(); }
  try { var base = crmLeer_(), x = base.rows.filter(function (q) { return q.demo === id; })[0]; if (x) celdas_(base.h, x.fila, { 8: 'cliente', 13: url }); } catch (e) {}
  return { ok: true, data: { repo: repo, url: url } };
}
/** Deja a un cliente con los mismos horarios, combos y textos que su demo (los datos base de las demos + lo que se editó en su ficha). */
function sembrarCliente_(id) {
  var demo = demoRaw_(id); if (!demo) throw new Error('No encuentro su ficha');
  var base = {}; try { base = JSON.parse(UrlFetchApp.fetch(SITIO + 'demo/datos-base.json?ts=' + Date.now(), { muteHttpExceptions: true }).getContentText()); } catch (e) {}
  var d = {}; Object.keys(base).forEach(function (k) { d[k] = base[k]; }); var x = demo.datos || {}; Object.keys(x).forEach(function (k) { if (x[k] !== undefined && x[k] !== '' && x[k] !== null) d[k] = x[k]; });
  var rs = rvSembrar_(id, d, demo);
  try { if (rs && rs.sembrado) fichaAplicar_(id, { planes: planesActivos_().map(function (p) { return { nombre: p.nombre, descripcion: p.descripcion || '', precio: Number(p.precio) || 0 }; }) }, 'admin', true); } catch (e) {}   // lo que quedó en su panel también se ve en la ficha del admin
  return rs;
}
function instalarReservas() { return rvInstalarTriggers_(); }
