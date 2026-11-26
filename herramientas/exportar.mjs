// Abre el editor, aprieta "Exportar index.html" y guarda el archivo.
// Uso:  node exportar.mjs http://localhost:8767/editor.html salida.html
import {open} from './navegador-sandbox.mjs';
import fs from 'fs';
const [url, out] = [process.argv[2], process.argv[3]];
const {b, pg} = await open(url, {w: 1400, h: 900});
const errs = []; pg.on('pageerror', e => errs.push(e.message.slice(0, 200)));
const btn = pg.locator('[title="Exportar index.html"]').first();
await btn.waitFor({timeout: 400000}); await pg.waitForTimeout(8000);
const [d] = await Promise.all([pg.waitForEvent('download', {timeout: 900000}), btn.click({timeout: 900000, noWaitAfter: true})]);
await d.saveAs(out);
console.log('EXPORTADO', out, fs.statSync(out).size, 'errores:', errs.length ? errs : 'ninguno');
await b.close();
