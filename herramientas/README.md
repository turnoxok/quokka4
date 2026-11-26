# Herramientas del sitio demo

Sirven para sacar del editor un sitio que abre rápido. Se usan desde el sandbox (no hace falta que las toque el dueño).

## Qué hace cada una
- `exportar.mjs`: abre `editor.html`, aprieta **Exportar index.html** y guarda el archivo.
- `empaquetar.mjs`: toma ese index exportado y arma la carpeta final:
  - `app.js` propio (no depende de esm.sh ni unpkg),
  - contador desde el primer segundo + precarga de los modelos pesados,
  - piezas SVG ya armadas (`bk-lite.*` para celular, `bk-full.*` para PC), que se bajan de un archivo en vez de construirse al abrir.
- `navegador-sandbox.mjs`: navegador de pruebas del sandbox (reemplaza esm.sh/unpkg por copias locales).
- `librerias.mjs`: arma esas copias locales (solo el sandbox las necesita).

## Pasos
1. Una vez por sandbox, en una carpeta de trabajo (ej. `/tmp/r3`): `npm i three@0.160.0 @react-three/fiber@8.17.10 @react-three/drei@9.114.3 @react-three/postprocessing@2.16.3 postprocessing@6.36.4 zustand@4.5.5 react@18.3.1 react-dom@18.3.1 lenis@1.1.18 @babel/standalone@7.25.6 esbuild playwright` y `node librerias.mjs` (deja `dist/`). Enlazar `herramientas/node_modules` a esa carpeta.
2. Servir el repo: `python3 -m http.server 8767` desde la raíz del repo.
3. `node exportar.mjs http://localhost:8767/editor.html /tmp/exportado.html`
4. `node empaquetar.mjs /tmp/exportado.html . http://localhost:8767/` (genera `index.html`, `app.js`, `lenis.min.js` y `bk-*` en la raíz)
5. Commit y push (se publica con GitHub Pages desde `main`).

Cada vez que cambia el editor o los modelos, repetir 3 y 4: las piezas armadas se regeneran solas.
Si algún `bk-*` falta o no coincide, el sitio arma las piezas como siempre (más lento, pero anda).
