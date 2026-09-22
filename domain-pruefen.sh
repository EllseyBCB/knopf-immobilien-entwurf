#!/usr/bin/env bash
# Prüft, ob die DNS-Einträge für knopfimmobilien.de bereit sind.
# Ändert nichts. Rückgabewert 0 = bereit, 1 = noch nicht.
set -uo pipefail

DOMAIN="knopfimmobilien.de"
PAGES_KONTO="ellseybcb.github.io"

V4=(185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153)
V6=(2606:50c0:8000::153 2606:50c0:8001::153 2606:50c0:8002::153 2606:50c0:8003::153)

gruen=0; rot=0
ja() { printf '  \033[32m✓\033[0m %s\n' "$1"; gruen=$((gruen+1)); }
nein() { printf '  \033[31m✗\033[0m %s\n' "$1"; rot=$((rot+1)); }
hm()  { printf '  \033[33m!\033[0m %s\n' "$1"; }

# Direkt bei der zuständigen Zone fragen, nicht beim Zwischenspeicher
NS=$(dig +short "$DOMAIN" NS | head -1)
frag() { dig +short "@${NS:-1.1.1.1}" "$1" "$2" 2>/dev/null; }

echo
echo "DNS-Stand für $DOMAIN   (gefragt bei ${NS:-1.1.1.1})"
echo

# ── 1. A-Einträge ───────────────────────────────────────────────
ist_a=$(frag "$DOMAIN" A | sort | tr '\n' ' ')
soll_a=$(printf '%s\n' "${V4[@]}" | sort | tr '\n' ' ')
if [ "$ist_a" = "$soll_a" ]; then
  ja "A-Einträge zeigen auf GitHub Pages"
else
  nein "A-Einträge stehen noch auf: ${ist_a:-nichts}"
fi

# ── 2. AAAA-Einträge (der stille Fallstrick) ────────────────────
ist_aaaa=$(frag "$DOMAIN" AAAA | sort | tr '\n' ' ')
soll_aaaa=$(printf '%s\n' "${V6[@]}" | sort | tr '\n' ' ')
if [ -z "$ist_aaaa" ]; then
  ja "Kein AAAA-Eintrag — in Ordnung, IPv6-Besucher nehmen dann IPv4"
elif [ "$ist_aaaa" = "$soll_aaaa" ]; then
  ja "AAAA-Einträge zeigen auf GitHub Pages"
else
  nein "AAAA zeigt noch woanders hin: $ist_aaaa"
  hm   "Besucher mit IPv6 sehen dadurch weiter die alte Seite — löschen oder umstellen"
fi

# ── 3. www ──────────────────────────────────────────────────────
ist_www=$(frag "www.$DOMAIN" CNAME)
if [ "${ist_www%.}" = "$PAGES_KONTO" ]; then
  ja "www zeigt als CNAME auf $PAGES_KONTO"
else
  ist_www_a=$(frag "www.$DOMAIN" A | tr '\n' ' ')
  nein "www ist noch nicht gesetzt (CNAME: ${ist_www:-keiner}, A: ${ist_www_a:-keine})"
fi

# ── 4. Der MX-Eintrag, der Post verschluckt ─────────────────────
if frag "$DOMAIN" MX | grep -q "[[:space:]]${DOMAIN}\.$"; then
  nein "MX-Eintrag auf $DOMAIN selbst ist noch da"
  hm   "Er liegt gleichrangig neben mx.zoho.eu und zeigt auf den Webserver."
  hm   "Jede Mail, die ihn erwischt, läuft ins Leere. Muss gelöscht werden."
else
  ja "Kein MX-Eintrag auf die Domain selbst — Post geht sauber zu Zoho"
fi

# ── 5. Was der Browser aktuell sieht ────────────────────────────
echo
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://$DOMAIN/" 2>/dev/null)
if [ "$code" = "200" ]; then
  ja "https://$DOMAIN/ antwortet mit 200"
else
  hm "https://$DOMAIN/ antwortet noch nicht (${code:-keine Antwort}) — normal, solange DNS oder Zertifikat fehlen"
fi

echo
if [ "$rot" -eq 0 ]; then
  echo "Bereit. Weiter mit:  ./domain-aufschalten.sh"
  exit 0
else
  echo "Noch $rot offene Punkte. DNS-Änderungen brauchen je nach Anbieter"
  echo "wenige Minuten bis einige Stunden."
  exit 1
fi
