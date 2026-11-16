#!/usr/bin/env python3
"""Compuerta de seguridad: falla el pipeline si OWASP ZAP reporta alertas de riesgo Alto (3) o Medio (2)."""
import json, sys

import os

UMBRAL = 2  # 3=Alto, 2=Medio, 1=Bajo, 0=Informativo
ACEPTADOS = set()
ruta = os.path.join(os.path.dirname(__file__), "..", ".zap", "riesgos-aceptados.txt")
if os.path.exists(ruta):
    with open(ruta, encoding="utf-8") as f:
        ACEPTADOS = {l.split("|")[0].strip() for l in f if l.strip() and not l.startswith("#")}
bloqueantes = []
for archivo in sys.argv[1:]:
    with open(archivo, encoding="utf-8") as f:
        datos = json.load(f)
    for sitio in datos.get("site", []):
        for a in sitio.get("alerts", []):
            riesgo = int(a.get("riskcode", 0))
            print(f"[{archivo}] riesgo={riesgo} {a['name']} (x{a.get('count')})")
            if riesgo >= UMBRAL and str(a.get("pluginid")) in ACEPTADOS:
                print(f"    -> riesgo aceptado formalmente (ver .zap/riesgos-aceptados.txt)")
            elif riesgo >= UMBRAL:
                bloqueantes.append(a["name"])
if bloqueantes:
    print("FALLA: alertas de riesgo medio/alto:", ", ".join(sorted(set(bloqueantes))))
    sys.exit(1)
print("OK: sin alertas de riesgo medio o alto")
