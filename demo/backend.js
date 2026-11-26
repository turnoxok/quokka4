/* demo/backend.js — el backend de reservas (Codigo.gs, el mismo que usan los clientes reales) corriendo DENTRO del navegador, con hojas simuladas.
   Cada demo tiene sus datos en el celular o la compu de quien la prueba (localStorage): nunca toca datos de nadie ni necesita servidor.
   Se engancha en fetchSeguro() de reservar y panel: si existe window.DEMO_BACKEND, los pedidos se contestan acá. */
(function () {
  var ROOT = ((document.currentScript && document.currentScript.src) || '').replace(/demo\/backend\.js.*$/, '');
  var LS = 'tuweeb-demo-v1:';
  /* ── SHA-256 y HMAC síncronos (Utilities.computeDigest / computeHmacSha256Signature) ── */
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  function sha256(m) {
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n), w = new Int32Array(64), i, j;
    b.set(m); b[l] = 0x80; var bits = l * 8; for (i = 0; i < 4; i++) { b[n - 1 - i] = (bits >>> (8 * i)) & 255; b[n - 5 - i] = Math.floor(bits / 4294967296) >>> (8 * i) & 255; }
    for (var o = 0; o < n; o += 64) {
      for (i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
      for (i = 16; i < 64; i++) { var x = w[i - 15], y = w[i - 2]; w[i] = (w[i - 16] + (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + w[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10))) | 0; }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0, t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    var out = new Uint8Array(32); for (i = 0; i < 8; i++) { out[4 * i] = H[i] >>> 24; out[4 * i + 1] = (H[i] >>> 16) & 255; out[4 * i + 2] = (H[i] >>> 8) & 255; out[4 * i + 3] = H[i] & 255; } return out;
  }
  function hmac(msg, key) {
    if (key.length > 64) key = sha256(key); var k = new Uint8Array(64), ik = new Uint8Array(64 + msg.length), ok = new Uint8Array(96), i; k.set(key);
    for (i = 0; i < 64; i++) { ik[i] = k[i] ^ 0x36; ok[i] = k[i] ^ 0x5c; } ik.set(msg, 64); ok.set(sha256(ik), 64); return sha256(ok);
  }
  var utf8 = function (s) { return new TextEncoder().encode(s); }, firmado = function (u) { return Array.prototype.map.call(u, function (b) { return b > 127 ? b - 256 : b; }); };
  var b64 = function (u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
  var deb64 = function (s) { var r = atob(s.replace(/-/g, '+').replace(/_/g, '/')), o = []; for (var i = 0; i < r.length; i++) o.push(r.charCodeAt(i)); return o; };
  /* ── hojas y servicios simulados (mismo contrato que test/mock.js) ── */
  function nuevoMundo(guardado) {
    var hojas = {}, uuid = 0, props = {}, cache = {}, drive = { carpetas: [], archivos: [] };
    function Hoja(nombre, filas) {
      var h = { nombre: nombre, filas: filas || [[]], frozen: 0, formatos: {} };
      return Object.assign(h, {
        getLastRow: function () { var l = 0; h.filas.forEach(function (f, i) { if (f.some(function (x) { return x !== '' && x != null; })) l = i + 1; }); return l; },
        getMaxRows: function () { return 1000; }, setFrozenRows: function (n) { h.frozen = n; },
        appendRow: function (a) { h.filas[h.getLastRow()] = a.slice(); }, deleteRow: function (r) { h.filas.splice(r - 1, 1); },
        getRange: function (r, c, nr, nc) { nr = nr || 1; nc = nc || 1; return {
          getValues: function () { var o = []; for (var i = 0; i < nr; i++) { var f = h.filas[r - 1 + i] || [], row = []; for (var j = 0; j < nc; j++) row.push(f[c - 1 + j] === undefined ? '' : f[c - 1 + j]); o.push(row); } return o; },
          setValues: function (v) { for (var i = 0; i < nr; i++) { var f = (h.filas[r - 1 + i] = h.filas[r - 1 + i] || []); for (var j = 0; j < nc; j++) f[c - 1 + j] = v[i][j]; } },
          setNumberFormat: function (fm) { h.formatos[c] = fm; } }; }
      });
    }
    if (guardado) { Object.keys(guardado.hojas || {}).forEach(function (n) { hojas[n] = Hoja(n, guardado.hojas[n]); }); props = guardado.props || {}; cache = guardado.cache || {}; }
    var ss = { getSheetByName: function (n) { return hojas[n] || null; }, insertSheet: function (n) { return (hojas[n] = Hoja(n)); }, getId: function () { return 'SS1'; }, getName: function () { return 'Demo'; } };
    var ctx = {
      console: console, Date: Date, JSON: JSON, Math: Math, Number: Number, String: String, Object: Object, Array: Array, RegExp: RegExp, Error: Error, isFinite: isFinite, parseInt: parseInt, Intl: Intl,
      SpreadsheetApp: { getActiveSpreadsheet: function () { return ss; }, openById: function () { return ss; }, getUi: function () { return { createMenu: function () { return { addItem: function () { return this; }, addToUi: function () {} }; } }; } },
      PropertiesService: { getScriptProperties: function () { return { getProperty: function (k) { return props[k] || null; }, setProperty: function (k, v) { props[k] = v; } }; } },
      LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
      CacheService: { getScriptCache: function () { return { get: function (k) { return k in cache ? cache[k] : null; }, put: function (k, v) { cache[k] = v; }, remove: function (k) { delete cache[k]; } }; } },
      Utilities: {
        DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
        computeDigest: function (a, s) { return firmado(sha256(utf8(s))); },
        computeHmacSha256Signature: function (s, k) { return firmado(hmac(utf8(s), utf8(k))); },
        base64Decode: function (s) { return deb64(s); },
        base64EncodeWebSafe: function (s) { return b64(utf8(s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
        base64DecodeWebSafe: function (s) { return deb64(s); },
        newBlob: function (bytes, tipo, nombre) { return { bytes: bytes, tipo: tipo, nombre: nombre, getDataAsString: function () { return new TextDecoder().decode(new Uint8Array(bytes.map(function (x) { return x & 255; }))); } }; },
        getUuid: function () { return 'u' + String(++uuid).padStart(8, '0') + '-aaaa-bbbb-cccc-' + Math.random().toString(16).slice(2, 14); },
        formatDate: function (d, tz, f) { var p = {}; new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; }); return f === 'yyyy-MM-dd' ? p.year + '-' + p.month + '-' + p.day : f === 'HH:mm' ? p.hour + ':' + p.minute : f; }
      },
      ContentService: { MimeType: { JSON: 'json' }, createTextOutput: function (s) { return { s: s, setMimeType: function () { return this; }, getContent: function () { return s; } }; } },
      MailApp: { sendEmail: function () {}, getRemainingDailyQuota: function () { return 100; } },
      ScriptApp: { getProjectTriggers: function () { return []; }, deleteTrigger: function () {}, newTrigger: function () { var b = { timeBased: function () { return b; }, everyMinutes: function () { return b; }, everyDays: function () { return b; }, atHour: function () { return b; }, create: function () { return {}; } }; return b; } },
      DriveApp: {
        Access: { ANYONE_WITH_LINK: 'link' }, Permission: { VIEW: 'view' },
        getFoldersByName: function (n) { var f = drive.carpetas.filter(function (c) { return c.n === n; }), i = 0; return { hasNext: function () { return i < f.length; }, next: function () { return f[i++]; } }; },
        createFolder: function (n) { var c = { n: n, createFile: function (blob) { var f = { id: 'F' + (drive.archivos.length + 1), blob: blob, papelera: false, getId: function () { return this.id; }, getUrl: function () { return 'about:blank#' + this.id; }, setSharing: function () { return this; }, setTrashed: function (v) { this.papelera = v; }, getParents: function () { var p = [c], i = 0; return { hasNext: function () { return i < p.length; }, next: function () { return p[i++]; } }; } }; drive.archivos.push(f); return f; }, getId: function () { return 'C' + n; } }; drive.carpetas.push(c); return c; },
        getFileById: function (id) { var f = drive.archivos.filter(function (x) { return x.id === id; })[0]; if (!f) throw new Error('no existe'); return f; }
      }
    };
    return { ctx: ctx, estado: function () { var o = {}; Object.keys(hojas).forEach(function (n) { o[n] = hojas[n].filas; }); return { hojas: o, props: props, cache: cache }; } };
  }
  /* ── arranque: el código del backend, los datos de la demo y el guardado ── */
  var mundos = {};
  function iniciar(demo) {
    var id = (demo && demo.id) || 'general';
    if (mundos[id]) return mundos[id];
    return (mundos[id] = (async function () {
      var codigo = await (await fetch(ROOT + 'demo/Codigo.gs?v=3')).text(), previo = null;
      try { previo = JSON.parse(localStorage.getItem(LS + id) || 'null'); } catch (e) {} if (previo && previo.s !== 2) previo = null;   /* demos guardadas con una versión vieja de los datos de ejemplo: se rearman */
      var m = nuevoMundo(previo && previo.v === 1 ? previo.e : null);
      var fn = new Function('ctx', 'with(ctx){' + codigo + '\n;return {doGet:doGet,doPost:doPost,run:function(s){return eval(s)}}}');
      var a = fn(m.ctx); a.m = m;
      /* Copia de seguridad en tuweeb de lo que carga un cliente con pedido (así no se pierde si cambia de celular y se puede pasar a su web final) */
      var tResp = null, respaldar = function () {
        clearTimeout(tResp); tResp = setTimeout(function () {
          try {
            var T = window.TEMA, raw = localStorage.getItem(LS + id); if (!raw || !T || !T.fabrica || !T.demo || !T.demo.conPedido) return;
            if (localStorage.getItem('tuweeb-resp:' + id) === String(raw.length) + ':' + raw.slice(-40)) return;
            fetch(T.fabrica, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'demoRespaldar', id: id, datos: raw }) })
              .then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok) try { localStorage.setItem('tuweeb-resp:' + id, String(raw.length) + ':' + raw.slice(-40)); } catch (e) {} }).catch(function () {});
          } catch (e) {}
        }, 8000);
      };
      a.guardar = function () { try { localStorage.setItem(LS + id, JSON.stringify({ v: 1, s: 2, e: m.estado() })); } catch (e) {} respaldar(); };
      if (previo) respaldar();
      a.get = function (p) { return JSON.parse(a.doGet({ parameter: p }).getContent()); };
      a.post = function (b) { return JSON.parse(a.doPost({ postData: { contents: JSON.stringify(b) } }).getContent()); };
      if (!previo) { var base = {}; try { base = await (await fetch(ROOT + 'demo/datos-base.json')).json(); } catch (e) {} await sembrar(a, demo || {}, base); a.guardar(); if (demo && demo.fichaV) try { localStorage.setItem('tuweeb-fv:' + id, demo.fichaV); } catch (e) {} }
      return a;
    })());
  }
  /* ── ficha de la web: lo que carga el dueño de tuweeb en el admin llega acá, y lo que el cliente cambia en el panel vuelve al admin ── */
  var USR = { email: 'ficha', rol: 'admin' };
  function fvLocal(id) { try { return localStorage.getItem('tuweeb-fv:' + id) || ''; } catch (e) { return ''; } }
  function fvGuardar(id, v) { try { localStorage.setItem('tuweeb-fv:' + id, v); } catch (e) {} var T = window.TEMA; if (T && T.demo) { T.demo.fichaV = v; T._dd = null; } }
  function aplicarFicha(a, demo) {
    var id = demo && demo.id; if (!id || !demo.fichaV || fvLocal(id) === demo.fichaV) return false;
    var x = demo.datos || {}, vals = {};
    ['direccion', 'mapsUrl'].forEach(function (k) { if (x[k] !== undefined) vals[k] = x[k]; });
    if (demo.whatsapp !== undefined && demo.whatsapp !== null) vals.whatsapp = demo.whatsapp;
    try { if (Object.keys(vals).length) a.run('guardarConfig_(' + JSON.stringify({ valores: vals }) + ',' + JSON.stringify(USR) + ')'); } catch (e) {}
    try {
      if (Array.isArray(x.planes) && x.planes.length) {
        var ex = a.run("ADMIN['admin.planes']({}, " + JSON.stringify(USR) + ')') || [];
        x.planes.forEach(function (p, i) {
          var c = ex[i] || {}, o = { nombre: p.nombre, descripcion: p.descripcion || '', precio: Number(p.precio) || 0, senaTipo: c.senaTipo || 'pct', senaValor: c.senaValor == null ? 30 : c.senaValor, orden: i + 1, activo: true, precios: c.precios || {} };
          if (c.id) o.id = c.id;
          a.run("ADMIN['admin.guardarPlan'](" + JSON.stringify(o) + ',' + JSON.stringify(USR) + ')');
        });
        ex.slice(x.planes.length).forEach(function (c) { a.run("ADMIN['admin.borrarPlan'](" + JSON.stringify({ id: c.id }) + ',' + JSON.stringify(USR) + ')'); });
      }
    } catch (e) {}
    fvGuardar(id, demo.fichaV); a.guardar(); return true;
  }
  var tFicha = null, pendFicha = {};
  function subirFicha(a, id, claves) {
    Object.assign(pendFicha, claves); clearTimeout(tFicha);
    tFicha = setTimeout(function () {
      var T = window.TEMA, c = pendFicha; pendFicha = {};
      if (c.planes === true) { try { c.planes = (a.run("ADMIN['admin.planes']({}, " + JSON.stringify(USR) + ')') || []).sort(function (x, y) { return x.orden - y.orden; }).map(function (p) { return { nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio || 0 }; }); } catch (e) { delete c.planes; } }
      if (!T || !T.fabrica || !Object.keys(c).length) return;
      fetch(T.fabrica, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'demoFichaPanel', id: id, claves: c }) })
        .then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok && j.data && j.data.fichaV) fvGuardar(id, j.data.fichaV); }).catch(function () {});
    }, 1500);
  }
  window.DEMO_BACKEND = {
    ROOT: ROOT,
    iniciar: iniciar,
    fetch: async function (url, opts) {
      if (window.TEMA && TEMA.listo) await TEMA.listo;
      if (window.TEMA && TEMA.fresca) await TEMA.fresca;   /* los datos más nuevos de la ficha llegan antes de mostrar nada */
      var demo = (window.TEMA && TEMA.demo) || { id: window.TEMA && TEMA.demoId }, a = await iniciar(demo), j;
      aplicarFicha(a, demo);
      try { a.run('vencer_()'); } catch (e) {}
      if (opts && opts.method === 'POST') {
        j = a.doPost({ postData: { contents: opts.body } }).getContent();
        /* las fotos que se suben en la demo se guardan en el mismo navegador (no hay Drive): el link es la propia foto */
        try { var pf = JSON.parse(opts.body), jf = JSON.parse(j); if (jf && jf.ok && demo.id) {
          if (pf.action === 'admin.guardarConfig' && pf.valores) { var kk = {}; ['direccion', 'mapsUrl', 'whatsapp'].forEach(function (k) { if (pf.valores[k] !== undefined) kk[k] = pf.valores[k]; }); if (Object.keys(kk).length) subirFicha(a, demo.id, kk); }
          else if (pf.action === 'admin.guardarPlan' || pf.action === 'admin.borrarPlan') subirFicha(a, demo.id, { planes: true }); } } catch (e) {}
        try { var pb = JSON.parse(opts.body); if (pb.action === 'admin.subirFoto') { var jj = JSON.parse(j); if (jj && jj.ok && jj.data) { jj.data.url = String(pb.datos || '').indexOf('data:') === 0 ? pb.datos : 'data:' + (pb.tipo || 'image/jpeg') + ';base64,' + pb.datos; j = JSON.stringify(jj); } } } catch (e) {}
      }
      else { var u = new URL(url, location.href), p = {}; u.searchParams.forEach(function (v, k) { p[k] = v; }); j = a.doGet({ parameter: p }).getContent(); }
      a.guardar();
      return { ok: true, status: 200, json: async function () { return JSON.parse(j); } };
    }
  };
  /* ── siembra: lo que trae una demo recién creada ── */
  var CLAVE_DEMO = 'demo1234';
  async function sembrar(a, demo, base) {
    var d = Object.assign({}, base || {}, demo.datos || {}), email = demo.email || 'demo@tuweeb.com', clave = demo.clave || CLAVE_DEMO;
    a.run('instalar()');
    a.run('definirUsuario_(' + JSON.stringify(email) + ',' + JSON.stringify(clave) + ',' + JSON.stringify(demo.nombre || 'Demo') + ",'admin')");
    var lg = a.post({ action: 'login', email: email, clave: clave }); if (!lg.ok) throw new Error('demo: ' + JSON.stringify(lg));
    var tk = lg.data.token, adm = function (acc, p) { return a.post(Object.assign({ action: acc, token: tk }, p || {})); };
    var vals = {}; ['nombre', 'whatsapp', 'direccion', 'mapsUrl', 'colorPrincipal', 'mesesAnticipacion', 'antelacionHoras', 'pagoTransferencia', 'pagoMercadoPago', 'urlReservas'].forEach(function (k) { if (d[k] !== undefined && d[k] !== '') vals[k] = d[k]; });
    Object.keys(d).forEach(function (k) { if (/^pg[A-Z]/.test(k)) vals[k] = typeof d[k] === 'string' ? d[k].replace(/\{nombre\}|Planeta Ni[ñn]os/g, demo.nombre || 'tu salón') : d[k]; });
    if (demo.nombre) vals.nombre = demo.nombre; vals.whatsapp = demo.whatsapp || ''; if (demo.color) vals.colorPrincipal = '#' + String(demo.color).replace('#', '');
    vals.maxPendientesPorContacto = 50; vals.emailAdmin = email; vals.transferAlias = vals.transferAlias || 'tu.alias.demo'; vals.transferTitular = vals.transferTitular || (demo.nombre || 'Tu negocio');
    var r = adm('admin.guardarConfig', { valores: vals }); if (!r.ok) { /* una opción desconocida no debe romper la demo: se reintenta de a una */ Object.keys(vals).forEach(function (k) { adm('admin.guardarConfig', { valores: (function (o) { o[k] = vals[k]; return o; })({}) }); }); }
    var mapaT = {}; a.run("leer_('Turnos').forEach(function(t){})");
    (d.turnos || []).forEach(function (t) { var x = adm('admin.guardarTurno', { salonId: 'S1', dias: t.dias, inicio: t.inicio, fin: t.fin, etiqueta: t.etiqueta, precio: 0, senaTipo: 'pct', senaValor: 30 }); if (x.ok) mapaT[t.id] = x.data.id; });
    var planIds = [];
    (d.planes || []).forEach(function (p, i) {
      var pr = {}; Object.keys(p.precios || {}).forEach(function (k) { if (mapaT[k]) pr[mapaT[k]] = p.precios[k]; });
      var x = adm('admin.guardarPlan', { nombre: p.nombre, descripcion: p.descripcion, precio: p.precio, senaTipo: p.senaTipo || 'pct', senaValor: p.senaValor == null ? 30 : p.senaValor, orden: i + 1, activo: true, precios: pr }); if (x && x.ok && x.data && x.data.id) planIds.push(x.data.id);
    });
    (d.contenido || []).forEach(function (c, i) { adm('admin.guardarContenido', { seccion: c.seccion, orden: i + 1, titulo: c.titulo, texto: c.texto, imagen: c.imagen, etiqueta: c.etiqueta, activo: true }); });
    /* unas reservas de ejemplo para que la agenda no se vea vacía */
    try {
      var tid = Object.keys(mapaT).map(function (k) { return mapaT[k]; }), ej = [['Sofía Benítez', 18, 0, 0, 'confirmada'], ['Familia Romero', 25, 1, 1, 'confirmada'], ['Lucas y Mía', 20, 2, 0, 'pendiente'], ['Cumple de Joaquín', 30, 3, 1, 'confirmada'], ['Valentina Paz', 22, 4, 0, 'confirmada']], hoy = new Date(), n = 0;
      for (var dd = 2; dd < 40 && n < ej.length; dd++) {
        var f = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dd), wd = f.getDay(); if (wd !== 6 && wd !== 0 && wd !== 5) continue;
        if ((dd + wd) % 2) continue;
        var e = ej[n], iso = f.getFullYear() + '-' + ('0' + (f.getMonth() + 1)).slice(-2) + '-' + ('0' + f.getDate()).slice(-2);
        if (tid.length && adm('admin.crearReserva', { fecha: iso, turnoId: tid[e[3] % tid.length], planId: planIds.length ? planIds[e[2] % planIds.length] : '', nombre: e[0], telefono: '11 5555 000' + n, personas: e[1], estado: e[4], pago: e[4] === 'confirmada' ? { monto: 30000, metodo: 'transferencia' } : undefined }).ok) n++;
      }
    } catch (x) {}
    a.sesion = null;
  }
})();
