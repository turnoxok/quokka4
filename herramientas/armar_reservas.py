#!/usr/bin/env python3
"""Arma fabrica/Reservas.gs: el sistema de reservas (reservas-base/Codigo.gs) convertido a multi-cliente.
Una sola copia atiende a todos; cada pedido trae «c» y el sistema trabaja sobre la hoja de ese cliente.
Uso: python3 herramientas/armar_reservas.py   (desde la raíz del repo)"""
import re, sys, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
src = (R / 'reservas-base' / 'Codigo.gs').read_text()
glue = (R / 'reservas-base' / 'glue.gs').read_text()

def una(pat, rep, s, flags=0, n=1):
    r, k = re.subn(pat, rep, s, flags=flags)
    if k != n: sys.exit('Cambió el código base: "%s" aparece %d veces (esperaba %d)' % (pat[:50], k, n))
    return r

# nombres que chocan con la fábrica
src = una(r'\bfunction doGet\(', 'function rvDoGetBase_(', src)
src = una(r'\bfunction doPost\(', 'function rvDoPostBase_(', src)
src = re.sub(r'\bCOMP_TIPOS\b', 'RV_COMP_TIPOS', src)
src = re.sub(r'\bhex_\b', 'rvHex_', src)
# la hoja del cliente de este pedido
src = una(r"function ss_\(\) \{.*?\n\}", "function ss_() {\n  if (!RV_CTX.sheetId) throw err_('SIN_CLIENTE', 'No hay un cliente seleccionado.');\n  return SpreadsheetApp.openById(RV_CTX.sheetId);\n}", src, re.S)
# caché separada por cliente
src, k = re.subn(r'CacheService\.getScriptCache\(\)', 'rvCache_()', src); assert k >= 8, k
# clave de firma distinta por cliente
src = una(r"function secreto_\(\) \{.*?\n\}", "function secreto_() {\n  var p = PropertiesService.getScriptProperties(), s = p.getProperty('RV_SECRET');\n  if (!s) { s = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid(); p.setProperty('RV_SECRET', s); }\n  return s + ':' + RV_CTX.id;\n}", src, re.S)
# instalar(): sin tareas por hoja (las tareas son de todo el sistema)
src = una(r"function instalar\(\) \{", "function rvInstalarHoja_() {", src)
src = una(r"  secreto_\(\);\n  ScriptApp\.getProjectTriggers\(\).*?everyDays\(1\)\.atHour\(4\)\.create\(\);\n", "", src, re.S)
# el menú de hoja no se usa en el sistema único
src = una(r'function onOpen\(\)', 'function rvOnOpenNoUsar_()', src)
out = ("/* ═══════ RESERVAS (multi-cliente) — GENERADO por herramientas/armar_reservas.py desde reservas-base/Codigo.gs. No editar a mano. ═══════ */\n"
       + src + glue)
(R / 'fabrica' / 'Reservas.gs').write_text(out)
print('fabrica/Reservas.gs', len(out), 'caracteres')
