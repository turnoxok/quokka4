// uso: node herramientas/tema-post-run.js index.html   -> aplica temaPostExport y avisa de colores nuevos para la lista de tema.js
const fs = require('fs'), { temaPostExport } = require('./tema-post.js');
const f = process.argv[2], s = fs.readFileSync(f, 'utf8'), n = temaPostExport(s);
fs.writeFileSync(f, n);
const usados = new Set([...n.matchAll(/--t-([0-9a-f]{6})\b/g)].map((m) => m[1]));
const t = fs.readFileSync(__dirname + '/../tema.js', 'utf8'), lista = JSON.parse(t.match(/\/\*ORIG\*\/(\[.*?\])\/\*FIN\*\//)[1]);
const nuevos = [...usados].filter((c) => !lista.includes(c));
if (nuevos.length) { const todo = [...new Set([...lista, ...nuevos])].sort(); fs.writeFileSync(__dirname + '/../tema.js', t.replace(/\/\*ORIG\*\/\[.*?\]\/\*FIN\*\//, '/*ORIG*/' + JSON.stringify(todo) + '/*FIN*/')); fs.writeFileSync(__dirname + '/colores-tema.json', JSON.stringify(todo)); }
console.log(f, s === n ? 'sin cambios' : 'actualizado', '| colores nuevos en tema.js:', nuevos.join(',') || 'ninguno');
