
/* ═══════════════ MULTI-CLIENTE (lo agrega herramientas/armar_reservas.py; no editar a mano) ═══════════════
   Un solo sistema atiende a todos los clientes. Cada pedido trae «c» (código del cliente); el sistema busca la hoja de ese
   cliente y trabaja sobre ella. Cada cliente tiene su hoja, su clave de panel y su caché, y no se mezclan. */
var RV_CTX = { id: '', sheetId: '' };
function rvCache_() {
  var c = CacheService.getScriptCache(), pre = 'rv:' + RV_CTX.id + ':';
  return { get: function (k) { return c.get(pre + k); }, put: function (k, v, t) { return t == null ? c.put(pre + k, v) : c.put(pre + k, v, t); }, remove: function (k) { c.remove(pre + k); } };
}
function rvIdOk_(id) { id = String(id || '').toLowerCase(); return /^[a-z0-9][a-z0-9-]{2,29}$/.test(id) ? id : ''; }
/** Cambia al cliente indicado. false si ese cliente no está registrado. */
function rvUsar_(id) {
  id = rvIdOk_(id); if (!id) return false;
  var c = CacheService.getScriptCache(), sid = c.get('rvmap:' + id);
  if (!sid) { sid = PropertiesService.getScriptProperties().getProperty('RVC:' + id); if (!sid) return false; c.put('rvmap:' + id, sid, 21600); }
  RV_CTX = { id: id, sheetId: sid }; CFG_MEMO = null; return true;
}
function rvEntrada_(p, esPost) {
  if (!rvUsar_(p.cl)) return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'SIN_CLIENTE', mensaje: 'Este sitio todavía no tiene su sistema de reservas conectado.' })).setMimeType(ContentService.MimeType.JSON);
  return responder_(function () { return despachar_(p, esPost); });
}
function rvDoGet(e) { return rvEntrada_((e && e.parameter) || {}, false); }
function rvClientes_() { var o = PropertiesService.getScriptProperties().getProperties(), l = []; Object.keys(o).forEach(function (k) { if (k.indexOf('RVC:') === 0) l.push(k.slice(4)); }); return l; }
/** Da de alta un cliente: arma las pestañas de su hoja, carga nombre y WhatsApp y crea el acceso del dueño al panel. */
function rvRegistrar_(o) {
  var id = rvIdOk_(o.id); if (!id || !o.sheetId) throw new Error('Cliente inválido');
  PropertiesService.getScriptProperties().setProperty('RVC:' + id, String(o.sheetId)); CacheService.getScriptCache().remove('rvmap:' + id);
  if (!rvUsar_(id)) throw new Error('No pude registrar al cliente');
  rvInstalarHoja_();
  var vals = {}; if (o.nombre) vals.nombre = String(o.nombre).slice(0, 80); if (o.whatsapp) vals.whatsapp = String(o.whatsapp).replace(/\D/g, '').slice(0, 15);
  if (Object.keys(vals).length) guardarConfig_({ valores: vals }, 'sistema');
  definirUsuario_(o.email, o.clave, o.dueno || 'Dueño/a', 'admin');
  return true;
}
function rvNuevaClave_(id, email, clave) { if (!rvUsar_(id)) throw new Error('Ese cliente no tiene sistema de reservas'); definirUsuario_(email, clave, '', ''); return true; }
function rvQuitar_(id) { id = rvIdOk_(id); if (!id) return false; PropertiesService.getScriptProperties().deleteProperty('RVC:' + id); CacheService.getScriptCache().remove('rvmap:' + id); return true; }
function rvPorCliente_(fn) { rvClientes_().forEach(function (id) { try { if (rvUsar_(id)) fn(); } catch (e) {} }); }
function rvVencerTodos_() { rvPorCliente_(vencer_); }
function rvBackupTodos_() { rvPorCliente_(backup_); }
function rvInstalarTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { var f = t.getHandlerFunction(); if (f === 'rvVencerTodos_' || f === 'rvBackupTodos_' || f === 'rvLimpiarTodos_') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('rvVencerTodos_').timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger('rvBackupTodos_').timeBased().everyDays(1).atHour(3).create();
  return true;
}

/** Carga en la hoja del cliente lo mismo que trae su demo: opciones, horarios, combos con sus precios y textos de la página.
 *  Solo si todavía no tiene horarios (no pisa nada de lo que el dueño ya armó). d = datos base + datos de su demo. */
/** Trae los datos de OTRA planilla de reservas (ej: el sistema que ya tenía un sitio publicado) a la de este cliente: horarios, planes, textos de la página de planes, precios, bloqueos, reservas y pagos. Las columnas se emparejan por nombre. En Config solo se pisan las claves que tienen valor en el origen (el mail del dueño y la reserva de juego del sistema nuevo no se tocan). */
function rvImportar_(id, origenId) {
  if (!rvUsar_(id)) throw new Error('Ese cliente no tiene sistema de reservas');
  var src = SpreadsheetApp.openById(origenId), dst = ss_(), res = {};
  ['Salones', 'Turnos', 'Bloqueos', 'Planes', 'Contenido', 'Precios', 'Reservas', 'Pagos', 'Movimientos'].forEach(function (n) {
    var a = src.getSheetByName(n), b = dst.getSheetByName(n); if (!a || !b || a.getLastRow() < 1 || b.getLastColumn() < 1) return;
    var av = a.getRange(1, 1, a.getLastRow(), a.getLastColumn()).getValues(), af = a.getRange(1, 1, a.getLastRow(), a.getLastColumn()).getNumberFormats();
    var ah = av[0].map(String), bh = b.getRange(1, 1, 1, b.getLastColumn()).getValues()[0].map(String), rows = [], fm = [];
    for (var i = 1; i < av.length; i++) {
      if (av[i].join('') === '') continue;
      rows.push(bh.map(function (h) { var k = ah.indexOf(h); return k >= 0 ? av[i][k] : ''; }));
      fm.push(bh.map(function (h) { var k = ah.indexOf(h); return k >= 0 ? af[i][k] : '@'; }));
    }
    if (b.getLastRow() > 1) b.getRange(2, 1, b.getLastRow() - 1, b.getLastColumn()).clearContent();
    if (rows.length) { var r = b.getRange(2, 1, rows.length, bh.length); r.setNumberFormats(fm); r.setValues(rows); }
    res[n] = rows.length;
  });
  var ca = src.getSheetByName('Config'), cb = dst.getSheetByName('Config');
  if (ca && cb) {
    var cv = cb.getDataRange().getValues(), idx = {}; cv.forEach(function (r, i) { idx[String(r[0])] = i; });
    var n2 = 0;
    ca.getDataRange().getValues().slice(1).forEach(function (r) {
      var k = String(r[0] || ''); if (!k || k === 'emailAdmin' || r[1] === '' || r[1] === null) return;
      if (idx[k] !== undefined) cb.getRange(idx[k] + 1, 2).setValue(r[1]); else cb.appendRow([k, r[1]]); n2++;
    });
    res.Config = n2;
  }
  CFG_MEMO = null; invalidar_();
  return res;
}

function rvSembrar_(id, d, demo) {
  if (!rvUsar_(id)) throw new Error('Ese cliente no tiene sistema de reservas');
  if (leer_('Turnos').length) return { sembrado: false, motivo: 'ya tiene horarios' };
  var U = { email: 'sistema' }, vals = {}, n = { turnos: 0, planes: 0, contenido: 0 };
  ['nombre', 'whatsapp', 'direccion', 'mapsUrl', 'colorPrincipal', 'mesesAnticipacion', 'antelacionHoras', 'pagoTransferencia', 'pagoMercadoPago', 'urlReservas'].forEach(function (k) { if (d[k] !== undefined && d[k] !== '') vals[k] = d[k]; });
  Object.keys(d).forEach(function (k) { if (/^pg[A-Z]/.test(k)) vals[k] = typeof d[k] === 'string' ? d[k].replace(/\{nombre\}|Planeta Ni[ñn]os/g, demo.nombre || 'tu salón') : d[k]; });
  if (demo.nombre) vals.nombre = demo.nombre; if (demo.whatsapp) vals.whatsapp = String(demo.whatsapp).replace(/\D/g, '').slice(0, 15); if (demo.color) vals.colorPrincipal = '#' + String(demo.color).replace('#', '');
  vals.maxPendientesPorContacto = 50; vals.emailAdmin = demo.email || ''; vals.transferTitular = demo.nombre || '';
  /* datos de pago de PRUEBA para que se vea cómo se cobra; el dueño pone los reales en Ajustes del panel */
  vals.transferAlias = vals.transferAlias || 'alias.de.prueba'; vals.transferBanco = 'Banco de prueba'; vals.transferNota = 'Datos de prueba: no transfieras dinero todavía.';
  Object.keys(vals).forEach(function (k) { try { guardarConfig_({ valores: (function (o) { o[k] = vals[k]; return o; })({}) }, 'sistema'); } catch (e) { /* una opción desconocida no frena el resto */ } });
  var mapaT = {};
  (d.turnos || []).forEach(function (t) { try { var x = ADMIN['admin.guardarTurno']({ salonId: 'S1', dias: t.dias, inicio: t.inicio, fin: t.fin, etiqueta: t.etiqueta, precio: 0, senaTipo: 'pct', senaValor: 30 }, U); mapaT[t.id] = x.id; n.turnos++; } catch (e) {} });
  (d.planes || []).forEach(function (p, i) {
    var pr = {}; Object.keys(p.precios || {}).forEach(function (k) { if (mapaT[k]) pr[mapaT[k]] = p.precios[k]; });
    try { ADMIN['admin.guardarPlan']({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, senaTipo: p.senaTipo || 'pct', senaValor: p.senaValor == null ? 30 : p.senaValor, orden: i + 1, activo: true, precios: pr }, U); n.planes++; } catch (e) {}
  });
  (d.contenido || []).forEach(function (c, i) { try { ADMIN['admin.guardarContenido']({ seccion: c.seccion, orden: i + 1, titulo: c.titulo, texto: c.texto, imagen: c.imagen, etiqueta: c.etiqueta, activo: true }, U); n.contenido++; } catch (e) {} });
  CFG_MEMO = null; invalidar_();
  return { sembrado: true, turnos: n.turnos, planes: n.planes, contenido: n.contenido };
}
