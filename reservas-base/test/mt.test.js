// Pruebas del sistema único (varios clientes, una sola copia del código).  node reservas-base/test/mt.test.js
process.env.RV_MULTI = '1';
const { crear } = require('./mock');
const assert = require('assert');
let n = 0, fallos = 0;
const t = (nombre, fn) => { try { fn(); n++; console.log('  ok  ' + nombre); } catch (e) { fallos++; console.log('FALLA ' + nombre + '\n      ' + (e.stack || e).split('\n').slice(0, 3).join('\n      ')); } };
const NOW = Date.parse('2026-11-02T18:00:00-03:00');
const a = crear({ multi: true }); a.setNow(NOW);
const J = (o) => JSON.parse(o.getContent());
const get = (c, params) => J(a.ctx.rvDoGet({ parameter: Object.assign({ cl: c }, params) }));
const post = (c, body) => J(a.ctx.rvEntrada_(Object.assign({ cl: c }, body), true));
const reg = (id, sheet, nombre, wa, mail, clave) => a.run(`rvRegistrar_({ id: '${id}', sheetId: '${sheet}', nombre: '${nombre}', whatsapp: '${wa}', email: '${mail}', clave: '${clave}' })`);

reg('rana-loca', 'HOJA_A', 'Rana Loca', '5491111111111', 'ana@rana.com', 'clave-ana-1234');
reg('sapo-feliz', 'HOJA_B', 'Sapo Feliz', '5492222222222', 'beto@sapo.com', 'clave-beto-1234');

console.log('Sistema único');
t('cada cliente tiene su propia hoja con todas las pestañas', () => {
  ['Config', 'Salones', 'Turnos', 'Reservas', 'Pagos', 'Usuarios'].forEach(h => { assert(a.libros.HOJA_A.hojas[h], 'A sin ' + h); assert(a.libros.HOJA_B.hojas[h], 'B sin ' + h); });
  assert.notStrictEqual(a.libros.HOJA_A.hojas.Config, a.libros.HOJA_B.hojas.Config);
});
t('la configuración pública sale de la hoja de cada uno (sin mezclarse por la caché)', () => {
  const A1 = get('rana-loca', { action: 'config' }), B1 = get('sapo-feliz', { action: 'config' }), A2 = get('rana-loca', { action: 'config' });
  assert(A1.ok && B1.ok, JSON.stringify([A1, B1]));
  assert.equal(A1.data.nombre, 'Rana Loca'); assert.equal(B1.data.nombre, 'Sapo Feliz'); assert.equal(A2.data.nombre, 'Rana Loca');
  assert.equal(B1.data.whatsapp, '5492222222222');
});
t('un cliente que no existe recibe un aviso claro', () => {
  const r = get('no-existe', { action: 'config' }); assert(!r.ok && r.error === 'SIN_CLIENTE', JSON.stringify(r));
  const r2 = get('', { action: 'config' }); assert(!r2.ok && r2.error === 'SIN_CLIENTE');
  const r3 = get('../../x', { action: 'config' }); assert(!r3.ok && r3.error === 'SIN_CLIENTE');
});
t('el dueño de cada cliente entra con su mail y su clave, y no entra al del otro', () => {
  const l = post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }); assert(l.ok, JSON.stringify(l));
  const x = post('sapo-feliz', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }); assert(!x.ok, 'Ana no debería entrar al panel de Sapo Feliz');
  const l2 = post('sapo-feliz', { action: 'login', email: 'beto@sapo.com', clave: 'clave-beto-1234' }); assert(l2.ok);
});
t('el token de un cliente no sirve en el otro', () => {
  const l = post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' });
  const ok = post('rana-loca', { action: 'admin.ping', token: l.data.token }); assert(ok.ok, JSON.stringify(ok));
  const mal = post('sapo-feliz', { action: 'admin.ping', token: l.data.token }); assert(!mal.ok, 'el token de Rana Loca no debe servir en Sapo Feliz');
});
t('una reserva de un cliente queda en su hoja y no aparece en la del otro', () => {
  const tk = post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }).data.token;
  const tu = post('rana-loca', { action: 'admin.guardarTurno', token: tk, salonId: 'S1', dias: '6', inicio: '14:00', fin: '18:00', etiqueta: 'Tarde', precio: 100000, senaTipo: 'pct', senaValor: 30 });
  assert(tu.ok, JSON.stringify(tu));
  const r = post('rana-loca', { action: 'reservar', turnoId: tu.data.id, fecha: '2026-11-07', nombre: 'Juan', telefono: '+54 9 11 5555-1234', email: 'juan@mail.com', personas: 20, metodo: 'transferencia' });
  assert(r.ok, JSON.stringify(r));
  const filasA = a.libros.HOJA_A.hojas.Reservas.filas.filter(f => f.some(x => x)).length, filasB = a.libros.HOJA_B.hojas.Reservas.filas.filter(f => f.some(x => x)).length;
  assert(filasA >= 2 && filasB <= 1, `A=${filasA} B=${filasB}`);
  const dispA = get('rana-loca', { action: 'disponibilidad', mes: '2026-11' }), dispB = get('sapo-feliz', { action: 'disponibilidad', mes: '2026-11' });
  assert(dispA.ok && dispB.ok);
  const dia = (d) => JSON.stringify((d.data.dias || d.data)).includes('2026-11-07');
  assert(dia(dispA) && !dia(dispB), 'el calendario de B no debe tener el turno de A');
});
t('una cuenta por cliente: las tareas automáticas recorren a todos', () => {
  a.run('rvInstalarTriggers_()'); assert.equal(a.triggers.length, 3);
  a.run('rvInstalarTriggers_()'); assert.equal(a.triggers.length, 3, 'no se duplican');
  assert.equal(JSON.stringify(a.run('rvClientes_().filter(function (x) { return x !== "uno"; }).sort()')), JSON.stringify(['rana-loca', 'sapo-feliz']));
  a.run('rvVencerTodos_()'); a.run('rvBackupTodos_()');
});
t('cambiar la clave de un dueño', () => {
  a.run("rvNuevaClave_('rana-loca', 'ana@rana.com', 'otra-clave-5678')");
  assert(!post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'clave-ana-1234' }).ok);
  assert(post('rana-loca', { action: 'login', email: 'ana@rana.com', clave: 'otra-clave-5678' }).ok);
});
t('quitar a un cliente corta su acceso y no toca al otro', () => {
  a.run("rvQuitar_('sapo-feliz')");
  a.cache && Object.keys(a.cache).forEach(k => { if (k.indexOf('rvmap:') === 0) delete a.cache[k]; });
  assert(!get('sapo-feliz', { action: 'config' }).ok);
  assert(get('rana-loca', { action: 'config' }).ok);
});
t('datos inválidos al registrar', () => {
  assert.throws(() => reg('x', 'H', 'N', '', 'mal', 'clave-larga-123'));
  assert.throws(() => reg('otro-cliente', 'H', 'N', '', 'ok@ok.com', 'corta'));
});

console.log('Siembra desde la demo');
const base = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'demo', 'datos-base.json'), 'utf8'));
t('un cliente nuevo nace con los horarios, combos y precios de su demo', () => {
  reg('luna-azul', 'HOJA_C', 'Luna Azul', '5493334445555', 'luna@azul.com', 'clave-luna-1234');
  const r = a.run(`rvSembrar_('luna-azul', ${JSON.stringify(base)}, { nombre: 'Luna Azul', whatsapp: '5493334445555', email: 'luna@azul.com' })`);
  assert(r.sembrado && r.turnos >= 4 && r.planes >= 2, JSON.stringify(r));
  const c = get('luna-azul', { action: 'config' });
  assert.equal(c.data.nombre, 'Luna Azul'); assert(c.data.planes.length >= 2, 'planes ' + c.data.planes.length);
  const d = get('luna-azul', { action: 'disponibilidad', mes: '2026-11' }); assert(d.ok && JSON.stringify(d.data).includes('libre'), JSON.stringify(d).slice(0, 200));
  assert(!JSON.stringify(c.data).includes('Planeta'), 'quedó el nombre de otro salón');
});
t('sembrar de nuevo no pisa ni duplica', () => {
  const r = a.run(`rvSembrar_('luna-azul', ${JSON.stringify(base)}, { nombre: 'Luna Azul' })`); assert.equal(r.sembrado, false);
  assert.equal(a.libros.HOJA_C.hojas.Turnos.filas.length - 1, base.turnos.length);
});

console.log('\nAdmin ↔ panel (ficha y planilla)');
const fsrc = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'fabrica', 'Codigo.gs'), 'utf8');
const bloque = fsrc.slice(fsrc.indexOf('var RV_ESPEJO'), fsrc.indexOf('function crmNombrePorDemo_'));
a.run("var LLAMADAS = []; function fichaAplicar_(id, v, q, se) { LLAMADAS.push({ id: id, v: v, q: q, se: se }); return { ok: true }; } function crmTelPorDemo_() {} function crmNombrePorDemo_() {}\n" + bloque);
const planesDe = () => get('luna-azul', { action: 'config' }).data.planes;
t('lo que carga el admin (dirección, mapa, WhatsApp, nombre) llega a la planilla del cliente', () => {
  a.run("rvFichaASheet_('luna-azul', { nombre: 'Luna Nueva', whatsapp: '5493331112222', datos: { direccion: 'Aguado 2280, Neuquén', mapsUrl: 'https://maps.app.goo.gl/abc123' } }, { nombre: 1, whatsapp: 1, direccion: 1, mapsUrl: 1 })");
  const c = get('luna-azul', { action: 'config' }).data;
  assert.equal(c.direccion, 'Aguado 2280, Neuquén'); assert.equal(c.mapsUrl, 'https://maps.app.goo.gl/abc123'); assert.equal(c.whatsapp, '5493331112222'); assert.equal(c.nombre, 'Luna Nueva');
  assert.equal(a.run('LLAMADAS.length'), 0, 'no debe volver a la ficha lo que viene de la ficha');
});
t('los planes del admin actualizan, crean y sacan planes sin perder la seña ni los horarios', () => {
  const antes = planesDe(), p0 = antes[0];
  const lista = antes.map(p => ({ nombre: p.nombre, descripcion: p.descripcion, precio: p.precio }));
  lista[0] = { nombre: 'Combo Estrella', descripcion: 'nuevo texto', precio: 123000 };   // renombrado y con otro precio
  lista.push({ nombre: 'Plan Extra', descripcion: '', precio: 50000 });                    // agregado
  const sacado = lista.splice(1, 1)[0];                                                       // quitado
  a.run(`rvFichaASheet_('luna-azul', { datos: { planes: ${JSON.stringify(lista)} } }, { planes: 1 })`);
  const des = planesDe(), nombres = des.map(p => p.nombre);
  assert(nombres.includes('Combo Estrella') && nombres.includes('Plan Extra') && !nombres.includes(sacado.nombre), nombres.join('|'));
  const e = des.filter(p => p.nombre === 'Combo Estrella')[0];
  assert.equal(e.id, p0.id, 'el renombrado debe seguir siendo el mismo plan'); assert.equal(e.precio, 123000); assert.equal(e.senaTipo, p0.senaTipo);
  assert.equal(a.run('LLAMADAS.length'), 0);
});
t('lo que el dueño cambia en Ajustes vuelve a la ficha; lo del sistema no', () => {
  a.run("RV_CTX = { id: 'luna-azul', sheetId: 'HOJA_C' }; guardarConfig_({ valores: { direccion: 'Otra 123', nombre: 'Luna Azul' } }, 'dueno@x.com')");
  const ll = a.run('LLAMADAS'); assert.equal(ll.length, 1, JSON.stringify(ll)); assert.equal(ll[0].v.direccion, 'Otra 123'); assert.equal(ll[0].q, 'panel'); assert.equal(ll[0].se, true);
  a.run("LLAMADAS.length = 0; guardarConfig_({ valores: { direccion: 'Sistema 1' } }, 'sistema')"); assert.equal(a.run('LLAMADAS.length'), 0);
});
t('un plan creado o borrado en el panel se copia a la ficha', () => {
  a.run("LLAMADAS.length = 0; RV_CTX = { id: 'luna-azul', sheetId: 'HOJA_C' }; ADMIN['admin.guardarPlan']({ nombre: 'Solo panel', precio: 777 }, { email: 'dueno@x.com' })");
  const ll = a.run('LLAMADAS'); assert.equal(ll.length, 1); assert(ll[0].v.planes.some(p => p.nombre === 'Solo panel' && p.precio === 777), JSON.stringify(ll[0].v.planes));
});
console.log('\n' + n + ' pruebas ok, ' + fallos + ' con fallas'); process.exit(fallos ? 1 : 0);
