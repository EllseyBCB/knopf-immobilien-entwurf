#!/usr/bin/env bash
# Schaltet knopfimmobilien.de scharf — nachdem die DNS-Einträge stehen.
#
# Reihenfolge ist hier keine Förmlichkeit: Wird die CNAME-Datei angelegt,
# bevor DNS zeigt, leitet GitHub die Vorschauadresse auf die Domain um.
# Die ist dann noch geparkt, und man sieht nur die Parkseite. Deshalb
# prüft dieses Skript zuerst und bricht ab, wenn etwas fehlt.
#
# Das Skript ist wiederholbar: Was schon erledigt ist, wird übersprungen.
set -uo pipefail

DOMAIN="knopfimmobilien.de"
REPO="EllseyBCB/knopf-immobilien-entwurf"
cd "$(dirname "$0")" || exit 1

schritt() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()      { printf '  \033[32m✓\033[0m %s\n' "$*"; }
weiter()  { printf '  \033[33m→\033[0m %s\n' "$*"; }
ende()    { printf '\n  \033[31m✗ %s\033[0m\n\n' "$*"; exit 1; }

# ── 1. Voraussetzungen ──────────────────────────────────────────
schritt "1/6  DNS gegenprüfen"
if ! ./domain-pruefen.sh; then
  ende "DNS ist noch nicht so weit. Nichts geändert."
fi

command -v gh >/dev/null || ende "gh fehlt. Bitte GitHub CLI installieren."
gh auth status >/dev/null 2>&1 || ende "gh ist nicht angemeldet: gh auth login"

# ── 2. Arbeitsstand sauber? ─────────────────────────────────────
schritt "2/6  Arbeitsstand prüfen"
if [ -n "$(git status --porcelain)" ]; then
  ende "Es liegen ungesicherte Änderungen herum. Erst committen."
fi
ok "Nichts Ungesichertes im Projektordner"

# ── 3. Der Schalter: die CNAME-Datei ────────────────────────────
schritt "3/6  Eigene Domain im Auslieferungsordner hinterlegen"
if [ -f CNAME ] && [ "$(cat CNAME)" = "$DOMAIN" ]; then
  ok "CNAME steht bereits auf $DOMAIN"
else
  echo "$DOMAIN" > CNAME
  git add CNAME
  git commit -q -m "Eigene Domain aufgeschaltet: $DOMAIN

Die DNS-Einträge zeigen auf GitHub Pages, deshalb darf die CNAME-Datei
jetzt gesetzt werden. Vorher hätte sie die Vorschauadresse auf die noch
geparkte Domain umgeleitet.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
  git push -q origin main || ende "Push fehlgeschlagen"
  ok "CNAME angelegt und gepusht"
fi

# ── 4. Auf den Deploy warten ────────────────────────────────────
schritt "4/6  Auf den Deploy warten"
sleep 5
lauf=$(gh run list --repo "$REPO" --workflow "Website veröffentlichen" \
         --limit 1 --json databaseId --jq '.[0].databaseId')
if [ -n "$lauf" ]; then
  gh run watch "$lauf" --repo "$REPO" --exit-status >/dev/null 2>&1 \
    && ok "Deploy durchgelaufen" \
    || weiter "Deploy meldet einen Fehler — bitte ansehen: gh run view $lauf"
fi

# ── 5. GitHub die Domain mitteilen ──────────────────────────────
schritt "5/6  Domain in den Repository-Einstellungen setzen"
aktuell=$(gh api "repos/$REPO/pages" --jq '.cname' 2>/dev/null)
if [ "$aktuell" = "$DOMAIN" ]; then
  ok "Domain ist bereits eingetragen"
else
  gh api -X PUT "repos/$REPO/pages" -f "cname=$DOMAIN" >/dev/null 2>&1 \
    && ok "Domain eingetragen" \
    || weiter "Ging nicht über die Schnittstelle — die CNAME-Datei allein genügt meist"
fi

# ── 6. Zertifikat abwarten, dann HTTPS erzwingen ────────────────
schritt "6/6  Auf das Zertifikat warten und HTTPS erzwingen"
echo "  GitHub stellt es über Let's Encrypt aus, das dauert bis zu 15 Minuten."
for i in $(seq 1 30); do
  zustand=$(gh api "repos/$REPO/pages" --jq '.https_certificate.state // "keiner"' 2>/dev/null)
  if [ "$zustand" = "approved" ]; then
    ok "Zertifikat ausgestellt"
    gh api -X PUT "repos/$REPO/pages" -F "https_enforced=true" >/dev/null 2>&1 \
      && ok "HTTPS wird erzwungen" \
      || weiter "HTTPS-Zwang bitte von Hand anhaken: Settings → Pages"
    break
  fi
  printf '  … Versuch %2d/30 — Zustand: %s\n' "$i" "$zustand"
  sleep 30
done

# ── Schlussprobe ────────────────────────────────────────────────
schritt "Schlussprobe"
for adresse in "https://$DOMAIN/" "https://www.$DOMAIN/" "http://$DOMAIN/"; do
  antwort=$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 12 "$adresse")
  printf '  %-34s %s\n' "$adresse" "$antwort"
done
echo
echo "Fertig, sobald oben überall 200 steht."
echo "Danach noch: Datenschutzerklärung prüfen, falls der Hoster wechselt."
