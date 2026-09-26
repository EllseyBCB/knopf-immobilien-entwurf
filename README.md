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
| `stil.css`, `seite.js` | |
| `verwaltung/` (Jims Anfragen-App) | |
| `schriften/`, `bilder/` | `stempeln.py`, `README.md`, `BILDNACHWEIS.md` |
| `robots.txt`, `sitemap.xml`, `favicon.ico` | |

Einmalige Voraussetzung im Repository: **Settings → Pages → Source = „GitHub Actions"**.

## Stand: live unter knopfimmobilien.de

Erledigt für den Livegang:

- Entwurfskennzeichnung, `noindex` und die `robots.txt`-Sperre sind raus
- Montserrat wird **lokal** ausgeliefert (`schriften/`) — keine Verbindung zu Google
- Impressum als Kleingewerbe-Fassung: Register und USt-IdNr. entfallen, weil
  Einzelunternehmen ohne Handelsregistereintrag und Kleinunternehmer nach § 19 UStG
- Datenschutzerklärung passt zum tatsächlichen Verhalten der Seite: keine Cookies,
  keine Statistik, Formular über das E-Mail-Programm, Schrift lokal
- Vorschaubild, Favicon, Sitemap und strukturierte Daten für Google
- Waagerechter Überlauf auf dem Handy behoben (Querbild der Anspruch-Sektion)
- Eigene Domain aufgeschaltet, Let's-Encrypt-Zertifikat, HTTPS erzwungen

### Zwei Angaben, die Jim bewusst weggelassen hat

Auf seine Entscheidung stehen **nicht** im Impressum:

1. Die Erlaubnis nach § 34c Abs. 1 Satz 1 Nr. 4 GewO samt erteilender Behörde.
   § 5 Abs. 1 Nr. 3 DDG verlangt die Aufsichtsbehörde dort, wo die Tätigkeit eine
   behördliche Zulassung braucht.
2. Die Berufshaftpflichtversicherung nach § 15 MaBV mit Versicherer und
   räumlichem Geltungsbereich (§ 2 Abs. 1 Nr. 11 DL-InfoV).

Beide hängen an der Tätigkeit, nicht an der Betriebsgrösse — anders als
Registereintrag und USt-IdNr., die bei einem Kleingewerbe tatsächlich entfallen.
Sollen sie später doch hinein, gehören sie in `impressum.html` zwischen
„Verantwortlich für den Inhalt" und „Berufsrechtliche Regelungen".

Ebenfalls offen, aber nicht blockierend: die Nutzungsrechte an Porträt und Logo
sind nicht schriftlich belegt (siehe `BILDNACHWEIS.md`).

## Eigene Domain aufschalten

**Erledigt am 22.09.2026** — die Seite läuft unter `https://knopfimmobilien.de`,
`www` und HTTP leiten dorthin, das Zertifikat kommt von Let's Encrypt und wird
von GitHub selbst erneuert.

Die Anleitung bleibt hier stehen, falls die Domain je umzieht. Was genau einzutragen
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
verwaltung/         Jims Anfragen-App, live unter /verwaltung/
anfragen.html       Vorschau der Verwaltung mit Beispieldaten (nicht im Netz)
```

## Das Anfrageformular

Drei Wege stehen in `seite.js` bereit, der erste eingerichtete gewinnt:
`ANFRAGE_ZIEL` (PHP auf eigenem Webspace), `SUPABASE_URL` +
`SUPABASE_SCHLUESSEL`, sonst das E-Mail-Programm des Besuchers.

**Im Betrieb ist der Supabase-Weg** (seit 26.09.2026). Das Projekt liegt in
Jims eigenem Supabase-Konto (Organisation „Knopf Immobilien", Projekt
`bullyvdntyswiixngtzu`, Frankfurt). Tabelle `anfragen`:

- Besucher (`anon`) dürfen **nur einfügen**, und nur die Formularfelder —
  `stand` und `notiz` können von aussen nicht gesetzt werden, Lesen ist gesperrt.
- Angemeldet darf nur `info@knopfimmobilien.de` lesen, ändern, löschen.
- Eingänge sieht Jim im Supabase-Dashboard unter Table Editor → `anfragen`.

Scheitert die Übertragung, öffnet sich das E-Mail-Programm des Besuchers.
Der Abschnitt „Anfrageformular" in `datenschutz.html` beschreibt diesen Stand.
Offen: Jim muss den Auftragsverarbeitungsvertrag (DPA) von Supabase
abschliessen — Dashboard → Organization Settings → Legal Documents.

## Die Anfragen-App für Jim

Liegt unter **https://knopfimmobilien.de/verwaltung/** und lässt sich als App
installieren: iPhone → Safari → Teilen → „Zum Home-Bildschirm"; Android/Chrome
und Mac/Chrome → „App installieren".

- Anmeldung mit **E-Mail und Passwort** (`info@knopfimmobilien.de`). Danach
  bleibt das Gerät angemeldet, die Sitzung erneuert sich selbst. Über
  „Passwort ändern" im Kopf setzt Jim ein eigenes.
- Das Konto wird im Supabase-Dashboard angelegt (Authentication → Users →
  Add user → Create new user, „Auto confirm"). Sehen kann nur
  `info@knopfimmobilien.de` etwas, das regelt die Tabelle, nicht die App.
- Stand setzen, Notiz, Antworten (öffnet Mail), Löschen. Die offene App schaut
  jede Minute nach Neuem; die Zahl neuer Anfragen steht am App-Symbol.
