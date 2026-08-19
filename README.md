# Knopf Immobilien — Website, Entwurfsstand

Zwei Fassungen derselben Seite für **Knopf Immobilien (WEG-Verwaltung)**, Inhaber Jim Knopf.
Gleiche Inhalte, unterschiedliche Inszenierung — zum Vergleichen und Auswählen.

| Fassung | Datei | Charakter |
|---|---|---|
| **Ruhig** | `index.html` | Sachlich, mit Kostenrechner, Anfrageformular und häufigen Fragen |
| **Bewegt** | `bewegt.html` | Starke Scroll-Effekte: weiches Scrollen, angeheftete Sektionen, seitwärts laufender Ablauf |

## Das ist ein Entwurf, keine fertige Website

Suchmaschinen sind über `robots.txt` und `noindex` ausgesperrt, auf beiden Seiten steht
unten links eine Entwurfskennzeichnung.

### Was vor einer echten Veröffentlichung zwingend passieren muss

1. **Impressum vervollständigen.** Aktuell nur ein Gerüst mit Platzhaltern. Es fehlen
   Firmierung, Anschrift, Rechtsform, Kontakt, gegebenenfalls Register und USt-IdNr.,
   die Erlaubnis nach § 34c Abs. 1 Satz 1 Nr. 4 GewO samt erteilender Behörde sowie die
   Berufshaftpflicht nach § 15 MaBV. Ein unvollständiges Impressum ist abmahnfähig.
2. **Preise ersetzen.** Die Werte im Kostenrechner stammen **nicht von Jim Knopf**. Es sind
   marktübliche Größenordnungen, damit der Rechner überhaupt etwas anzeigt. Sie stehen
   gesammelt in `seite.js` ganz oben unter `PREISE`.
3. **Empfängeradresse eintragen.** In `seite.js` unter `EMPFAENGER`. Solange dort
   `BITTE-EINTRAGEN@…` steht, weist das Formular beim Absenden darauf hin.
4. **Datenschutzerklärung prüfen.** Hosting-Anbieter und zuständige Aufsichtsbehörde fehlen.
5. **Bildrechte klären.** Porträt und Logo kamen über WhatsApp; Urheber und Nutzungsrechte
   sind offen. Siehe `BILDNACHWEIS.md`.
6. **Aussagen bestätigen lassen.** Nicht von Jim, sondern beim Schreiben angenommen:
   „Rückmeldung innerhalb von 48 Stunden" und „vier bis acht Wochen" für eine Übernahme.
7. **Zertifizierung nach § 26a WEG.** Steht als Frage auf der Seite und ist unbeantwortet.
8. **Schriftart lokal einbinden.** Montserrat wird derzeit von Google geladen, das ist im
   Datenschutztext entsprechend vermerkt.

Danach: `entwurf.css` löschen, die beiden Verweise darauf entfernen, `robots.txt` anpassen
und die `noindex`-Angaben aus den vier HTML-Dateien nehmen.

## Lokal ansehen

```
python3 -m http.server 8901
```

Dann `http://localhost:8901` für die ruhige und `http://localhost:8901/bewegt.html`
für die bewegte Fassung.

## Aufbau

Kein Framework, keine fremden Bibliotheken — reines HTML, CSS und JavaScript.

```
index.html        ruhige Fassung
bewegt.html       bewegte Fassung
stil.css          Gestaltung der ruhigen Fassung
seite.js          Kostenrechner, Formular, Fragen, Einblendungen
bewegt.css        Gestaltung der bewegten Fassung
bewegt.js         Scroll-Effekte in einer einzigen Rechenschleife
entwurf.css       nur für den Entwurfsstand
impressum.html    Gerüst
datenschutz.html  Gerüst
bilder/           Porträt, Logo, vier Architekturaufnahmen
BILDNACHWEIS.md   Herkunft und Lizenz jedes Bildes
```
