#!/usr/bin/env python3
"""Engancha el tema (tema.js) en el visor 3D. Sirve para el index.html exportado (minificado) y para los editores (visor escapado para HTML: acá no se usan los signos & < >).
Pone TEMA.colorear() en el color base de cada material (gradeColor y makeSvgMat) y, tras OBJECTS, cambia el logo por el de la marca.
uso: python3 herramientas/parchear-visor.py index.html editor.html ..."""
import re, sys
HOOK = 'if (window.TEMA) { TEMA.listo.then(function () { TEMA.aplicarObjetos(OBJECTS); }); }'
def parchear(f):
    s = open(f, encoding='utf-8').read()
    if 'TEMA.colorear' in s: print('ya parcheado', f); return
    ed = 'function gradeColor(base, g) {' in s
    if ed:
        s = s.replace('const c = base.clone();', 'const c = window.TEMA ? TEMA.colorear(base.clone()) : base.clone();', 1)
        s = s.replace('new THREE.Color(data.matColor || pr.color || base)', '(window.TEMA ? TEMA.colorear(new THREE.Color(data.matColor || pr.color || base)) : new THREE.Color(data.matColor || pr.color || base))')
        a = 'return `const OBJECTS = [\\n${objLines || "  // (sin objetos)"}\\n];`;'
        assert a in s, 'sin generador de OBJECTS en ' + f
        s = s.replace(a, a[:-3] + '\\n' + HOOK.replace('\\', '\\\\') + '`;')
    else:
        a = 'function gradeColor(base,g){const c=base.clone();'; assert a in s
        s = s.replace(a, 'function gradeColor(base,g){const c=window.TEMA?TEMA.colorear(base.clone()):base.clone();', 1)
        s = s.replace('new THREE.Color(data.matColor||pr.color||base)', '(window.TEMA?TEMA.colorear(new THREE.Color(data.matColor||pr.color||base)):new THREE.Color(data.matColor||pr.color||base))')
        i = s.index('const OBJECTS=['); d = 0; j = i + len('const OBJECTS='); q = None
        while True:
            ch = s[j]
            if q:
                if ch == '\\': j += 1
                elif ch == q: q = None
            elif ch in '"\'`': q = ch
            elif ch == '[': d += 1
            elif ch == ']':
                d -= 1
                if d == 0: break
            j += 1
        assert s[j + 1] == ';'
        s = s[:j + 2] + HOOK + s[j + 2:]
    open(f, 'w', encoding='utf-8').write(s); print('parcheado', f)
for f in sys.argv[1:]: parchear(f)
