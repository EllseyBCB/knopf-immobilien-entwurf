# knopfimmobilien.de auf die Website zeigen lassen

Es fehlt genau ein Schritt, und der geht nur im checkdomain-Konto: die
DNS-Einträge. Alles danach erledigt `./domain-aufschalten.sh` von selbst.

Dauer im Konto: etwa fünf Minuten. Danach je nach Anbieter einige Minuten bis
wenige Stunden, bis die Änderung überall angekommen ist.

---

## Was einzutragen ist

Bei checkdomain: **Domains → knopfimmobilien.de → DNS-Verwaltung**.

### 1. Die vier A-Einträge (ersetzen den bisherigen)

Der bisherige Eintrag zeigt auf `130.185.109.77` — das ist die Parkseite von
checkdomain. Er wird gelöscht, dafür kommen diese vier:

| Typ | Name | Wert |
|---|---|---|
| A | @ | `185.199.108.153` |
| A | @ | `185.199.109.153` |
| A | @ | `185.199.110.153` |
| A | @ | `185.199.111.153` |

Vier Stück, weil GitHub die Last darauf verteilt. Drei davon allein reichen
nicht zuverlässig.

### 2. Die vier AAAA-Einträge (ersetzen den bisherigen)

**Der Punkt, an dem dieser Umzug meistens scheitert.** Es gibt bereits einen
AAAA-Eintrag auf `2a01:4a0:2002:4:1da9:a99f:5423:3cf1`. Bleibt der stehen,
sehen alle Besucher mit IPv6 — in deutschen Mobilfunknetzen die Mehrheit —
weiterhin die Parkseite, während am Rechner alles richtig aussieht.

| Typ | Name | Wert |
|---|---|---|
| AAAA | @ | `2606:50c0:8000::153` |
| AAAA | @ | `2606:50c0:8001::153` |
| AAAA | @ | `2606:50c0:8002::153` |
| AAAA | @ | `2606:50c0:8003::153` |

Wenn checkdomain keine AAAA-Einträge anlegen lässt: dann den vorhandenen
**löschen** und keinen neuen setzen. Ohne AAAA nehmen IPv6-Besucher
automatisch IPv4, und es funktioniert ebenfalls.

### 3. www

Der bisherige A-Eintrag für `www` wird gelöscht, stattdessen:

| Typ | Name | Wert |
|---|---|---|
| CNAME | www | `ellseybcb.github.io` |

Mit Punkt am Ende, falls checkdomain danach verlangt: `ellseybcb.github.io.`

### 4. Den defekten MX-Eintrag löschen

**Das betrifft die Post, nicht die Website — und es ist schon jetzt kaputt.**

Unter den MX-Einträgen steht:

```
10  mx.zoho.eu          ← richtig
10  knopfimmobilien.de  ← muss weg
20  mx2.zoho.eu         ← richtig
50  mx3.zoho.eu         ← richtig
```

Der zweite zeigt auf die Domain selbst, also auf den Webserver. Der nimmt
keine Post an. Weil er dieselbe Rangzahl 10 hat wie der richtige Eintrag,
wird er gleich häufig angesteuert — grob jede zweite eingehende Mail an
`info@knopfimmobilien.de` läuft zuerst ins Leere. Manche Absender versuchen
es danach beim richtigen Server, manche geben auf.

**Diesen einen Eintrag löschen.** Die drei Zoho-Einträge bleiben unberührt.

Nicht anfassen: der SPF-Eintrag (`v=spf1 include:zoho.eu -all`) und der
Zoho-Prüfeintrag. Beide sind richtig.

---

## Danach

Im Projektordner:

```
./domain-pruefen.sh
```

Das sagt, was schon durch ist und was noch fehlt — ohne etwas zu ändern.
Zeigt es überall ein Häkchen:

```
./domain-aufschalten.sh
```

Das legt die CNAME-Datei an, stösst den Deploy an, trägt die Domain bei
GitHub ein, wartet auf das Let's-Encrypt-Zertifikat, schaltet den
HTTPS-Zwang scharf und prüft am Ende alle drei Adressen durch.

Es bricht ab, ohne etwas zu ändern, wenn DNS noch nicht steht.

---

## Warum die Reihenfolge nicht egal ist

Die Datei `CNAME` im Projektordner ist der Schalter. Sobald sie existiert,
liefert GitHub unter der eigenen Domain aus **und leitet die bisherige
Vorschauadresse dorthin um**. Wird sie angelegt, bevor DNS zeigt, führt die
Weiterleitung auf die geparkte Domain — die Website ist dann unter beiden
Adressen nicht mehr zu sehen. Deshalb prüft `domain-aufschalten.sh` zuerst
und legt die Datei erst danach an.

---

## Wenn die Website danach nicht kommt

| Zu sehen | Ursache |
|---|---|
| Parkseite von checkdomain | DNS noch nicht durchgelaufen, oder der AAAA-Eintrag steht noch auf der alten Adresse |
| Zertifikatswarnung | Let's Encrypt ist noch nicht durch. Bis 15 Minuten nach der DNS-Änderung normal |
| 404 von GitHub | Die CNAME-Datei passt nicht zur Domain, oder der Deploy lief nicht |
| Website kommt, aber `www` nicht | Der CNAME für `www` fehlt |

Im Zweifel `./domain-pruefen.sh` — es fragt direkt bei den checkdomain-Servern
nach, nicht beim Zwischenspeicher, und zeigt den tatsächlichen Stand.
