#!/usr/bin/env python3
"""Pasa los colores de la familia verde (la marca original) a variables CSS con el mismo valor de respaldo:
   #406c38  ->  var(--t-406c38,#406c38)      rgba(177,199,77,.3) -> rgba(var(--t-b1c74d-rgb,177,199,77),.3)
Después tema.js recalcula esas variables según el color de cada marca. Se puede correr de nuevo sin romper nada.
uso: python3 herramientas/tematizar.py archivo1 archivo2 ...   (deja la lista de colores en tema.js)"""
import re, sys, colorsys, json, os
def hsl(h): r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]; H,L,S=colorsys.rgb_to_hls(r,g,b); return H*360,S,L
def verde(h): H,S,L=hsl(h); return 60<=H<=175 and S>=.15 and .08<=L<=.97
HEX=re.compile(r'(?<![\w-])#([0-9a-fA-F]{6})\b(?![\w-])'); RGBA=re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)')
usados=set()
def cssfix(t):
    def h(m):
        c=m.group(1).lower()
        if not verde(c): return m.group(0)
        usados.add(c); return 'var(--t-%s,#%s)'%(c,c)
    def r(m):
        R,G,B=int(m.group(1)),int(m.group(2)),int(m.group(3)); c='%02x%02x%02x'%(R,G,B)
        if not verde(c): return m.group(0)
        usados.add(c); a=m.group(4); return 'rgba(var(--t-%s-rgb,%d,%d,%d)%s)'%(c,R,G,B,(','+a) if a is not None else '')
    return RGBA.sub(r,HEX.sub(h,t))
def htmlfix(t):
    partes=re.split(r'(<script\b[\s\S]*?</script>|<svg\b[\s\S]*?</svg>)',t,flags=re.I); out=[]
    for p in partes:
        if re.match(r'<(script|svg)\b',p,re.I): out.append(p); continue
        p=re.sub(r'(<style\b[^>]*>)([\s\S]*?)(</style>)',lambda m:m.group(1)+cssfix(m.group(2))+m.group(3),p,flags=re.I)
        p=re.sub(r'(\sstyle=")([^"]*)(")',lambda m:m.group(1)+cssfix(m.group(2))+m.group(3),p)
        out.append(p)
    return ''.join(out)
for f in sys.argv[1:]:
    s=open(f,encoding='utf-8').read(); n=htmlfix(s) if f.endswith('.html') else cssfix(s)
    if n!=s: open(f,'w',encoding='utf-8').write(n)
    print(f, 'cambiado' if n!=s else 'sin cambios')
ruta=os.path.join(os.path.dirname(os.path.abspath(__file__)),'colores-tema.json')
previo=set(json.load(open(ruta))) if os.path.exists(ruta) else set()
json.dump(sorted(previo|usados),open(ruta,'w')); print(len(previo|usados),'colores en total')
