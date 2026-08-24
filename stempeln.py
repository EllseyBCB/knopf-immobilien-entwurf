#!/usr/bin/env python3
"""Setzt Versionsstempel in die Verweise auf CSS und JavaScript.

Der Stempel kommt aus dem Dateiinhalt. Ändert sich die Datei, ändert sich
der Stempel, und jeder Browser lädt zwangsläufig neu statt eine alte
Fassung aus dem Zwischenspeicher zu zeigen.

Trifft ausschließlich href/src in <link> und <script> — Fließtext bleibt
unberührt.  Aufruf:  python3 stempeln.py
"""
import hashlib, pathlib, re

SEITEN = ['index.html', 'bewegt.html', 'impressum.html', 'datenschutz.html']
MUSTER = re.compile(r'((?:href|src)=")([\w./-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")')

def stempel(name: str) -> str:
    p = pathlib.Path(name)
    return hashlib.sha1(p.read_bytes()).hexdigest()[:8] if p.exists() else ''

for seite in SEITEN:
    p = pathlib.Path(seite)
    if not p.exists():
        continue
    def ersetzen(t):
        datei = t.group(2)
        v = stempel(datei)
        return f'{t.group(1)}{datei}{"?v=" + v if v else ""}{t.group(3)}'
    neu = MUSTER.sub(ersetzen, p.read_text())
    p.write_text(neu)
    treffer = MUSTER.findall(neu)
    print(f'{seite}: {len(treffer)} Verweise gestempelt')
