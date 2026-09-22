# Knopf Immobilien — Website

Website für **Knopf Immobilien (WEG-Verwaltung)**, Inhaber Jim Knopf.
Kein Framework, keine fremden Bibliotheken — reines HTML, CSS und JavaScript.

## Was veröffentlicht wird

Es geht **nur die ruhige Fassung** nach draussen. Der Ablauf unter
`.github/workflows/deploy.yml` stellt bei jedem Push auf `main` einen
Auslieferungsordner zusammen und prüft anschliessend selbst nach, dass
nichts Unbeabsichtigtes darin liegt.

| Kommt ins Netz | Bleibt im Repository |
|---|---|
| `index.html` (ruhige Fassung) | `bewegt.html` + `bewegt.css` + `bewegt.js` |
| `impressum.html`, `datenschutz.html`, `404.html` | `anfragen.html` (Vorschau mit Beispieldaten) |
| `stil.css`, `seite.js` | `verwaltung.html` + `verwaltung.css` + `verwaltung.js` |
| `schriften/`, `bilder/` | `stempeln.py`, `README.md`, `BILDNACHWEIS.md` |
| `robots.txt`, `sitemap.xml`, `favicon.ico` | |

Einmalige Voraussetzung im Repository: **Settings → Pages → Source = „GitHub Actions"**.

## Stand: freigegeben, mit zwei offenen Angaben

Erledigt für den Livegang:

- Entwurfskennzeichnung, `noindex` und die `robots.txt`-Sperre sind raus
- Montserrat wird **lokal** ausgeliefert (`schriften/`) — keine Verbindung zu Google
- Impressum als Kleingewerbe-Fassung: Register und USt-IdNr. entfallen, weil
  Einzelunternehmen ohne Handelsregistereintrag und Kleinunternehmer nach § 19 UStG
- Datenschutzerklärung passt zum tatsächlichen Verhalten der Seite: keine Cookies,
  keine Statistik, Formular über das E-Mail-Programm, Schrift lokal
- Vorschaubild, Favicon, Sitemap und strukturierte Daten für Google
- Waagerechter Überlauf auf dem Handy behoben (Querbild der Anspruch-Sektion)

**Noch einzutragen** — beides hängt nicht an der Betriebsgrösse und ist im HTML
gelb markiert (`EINZUTRAGEN`):

1. `impressum.html` — Erlaubnis nach § 34c Abs. 1 Satz 1 Nr. 4 GewO samt Name und
   Anschrift der erteilenden Behörde. § 5 Abs. 1 Nr. 3 DDG verlangt die
   Aufsichtsbehörde dort, wo die Tätigkeit eine behördliche Zulassung braucht.
2. `impressum.html` — Berufshaftpflichtversicherung nach § 15 MaBV: Versicherer,
   Anschrift, räumlicher Geltungsbereich (§ 2 Abs. 1 Nr. 11 DL-InfoV).

Dazu offen, aber nicht blockierend: die Nutzungsrechte an Porträt und Logo sind
nicht schriftlich belegt (siehe `BILDNACHWEIS.md`).

## Eigene Domain aufschalten

Die Seite ist auf `https://knopfimmobilien.de` ausgelegt — `canonical`,
Vorschaubilder und `sitemap.xml` zeigen bereits dorthin. Aufgeschaltet ist
sie noch nicht, weil die Domain bei checkdomain geparkt ist.

Es fehlt **nur** die DNS-Änderung im checkdomain-Konto. Was genau einzutragen
ist, steht in [`DOMAIN-UMSTELLEN.md`](DOMAIN-UMSTELLEN.md) — samt der beiden
Punkte, die dabei gern übersehen werden: der **AAAA-Eintrag** (sonst sehen
IPv6-Besucher weiter die Parkseite) und der defekte **MX-Eintrag** auf die
Domain selbst, der schon heute Post verschluckt.

Danach im Projektordner:

```
./domain-pruefen.sh        # sagt, was noch fehlt — ändert nichts
./domain-aufschalten.sh    # macht den Rest allein
```

`domain-aufschalten.sh` legt die `CNAME`-Datei an, stösst den Deploy an,
trägt die Domain bei GitHub ein, wartet auf das Let's-Encrypt-Zertifikat,
erzwingt HTTPS und prüft am Ende alle drei Adressen durch. Es bricht ab,
ohne etwas zu ändern, solange DNS nicht steht.

**Die Datei `CNAME` niemals von Hand anlegen.** Sobald sie da ist, leitet
GitHub auch die Vorschauadresse auf die eigene Domain um. Steht DNS dann noch
nicht, ist die Website unter beiden Adressen weg.

## Lokal ansehen

```
python3 -m http.server 8901
```

`http://localhost:8901` für die ruhige, `/bewegt.html` für die bewegte Fassung.

## Nach jeder Änderung an CSS oder JavaScript

```
python3 stempeln.py
```

Setzt in alle Verweise einen Stempel aus dem Dateiinhalt. Ohne ihn zeigen
Browser hartnäckig die alte Fassung aus dem Zwischenspeicher.

## Wo was steht

```
index.html          ruhige Fassung — die Website
stil.css            Gestaltung
seite.js            Kostenrechner, Formular, Fragen, Einblendungen
                    → Preise und Empfängeradresse stehen ganz oben
schriften/          Montserrat lokal, dazu die Lizenz
impressum.html      Kleingewerbe-Fassung
datenschutz.html    passend zum tatsächlichen Verhalten der Seite
404.html            Fehlerseite
bilder/             Porträt, Logo, vier Architekturaufnahmen, Vorschaubild
BILDNACHWEIS.md     Herkunft und Lizenz jedes Bildes

bewegt.*            zweite Fassung mit starken Scroll-Effekten (nicht im Netz)
verwaltung.*        Anfragenverwaltung über Supabase (nicht eingerichtet)
anfragen.html       Vorschau der Verwaltung mit Beispieldaten (nicht im Netz)
```

## Das Anfrageformular

Drei Wege stehen in `seite.js` bereit, der erste eingerichtete gewinnt:
`ANFRAGE_ZIEL` (PHP auf eigenem Webspace), `SUPABASE_URL` +
`SUPABASE_SCHLUESSEL`, sonst das E-Mail-Programm des Besuchers.

**Im Betrieb ist der E-Mail-Weg.** Beide Felder sind deshalb leer. Das ist die
datenschutzsparsamste Fassung: nichts wird gespeichert, kein
Auftragsverarbeiter kommt ins Spiel. Wird umgestellt, muss der Abschnitt
„Anfrageformular" in `datenschutz.html` mitgeändert werden.
