/* ══════════════════════════════════════════════
   Knopf Immobilien — Anfragenverwaltung
   Spricht die Datenbank direkt an, ohne fremde Bibliothek.
   ══════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   HIER EINTRAGEN — beides steht im Supabase-Projekt
   unter Project Settings → API
   ────────────────────────────────────────────── */

const SUPABASE_URL        = '';   // z. B. 'https://abcdefgh.supabase.co'
const SUPABASE_SCHLUESSEL = '';   // der öffentliche Schlüssel (anon / publishable)

/* ────────────────────────────────────────────── */

const STAENDE = { neu: 'Neu', arbeit: 'In Arbeit', erledigt: 'Erledigt' };

const teile = {
  einrichten: document.getElementById('einrichten'),
  tor:        document.getElementById('tor'),
  kopf:       document.getElementById('kopf'),
  rumpf:      document.getElementById('rumpf'),
};

const liste        = document.getElementById('liste');
const filterleiste = document.getElementById('filter');
const meldungsfeld = document.getElementById('meldung');
const torMeldung   = document.getElementById('tor-meldung');

let sitzung  = null;    // { token, email }
let anfragen = [];
let filter   = 'alle';

/* ══ Kleine Helfer ══ */

const maskieren = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function zeigen(name) {
  Object.entries(teile).forEach(([schluessel, el]) => {
    if (el) el.hidden = (schluessel !== name && !(name === 'liste' && (schluessel === 'kopf' || schluessel === 'rumpf')));
  });
}

let meldungsUhr = null;
function melden(text) {
  meldungsfeld.textContent = text;
  meldungsfeld.classList.add('stand-meldung--da');
  clearTimeout(meldungsUhr);
  meldungsUhr = setTimeout(() => meldungsfeld.classList.remove('stand-meldung--da'), 2800);
}

function datumDeutsch(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' Uhr';
}

/* ══ Zugriff auf die Datenbank ══ */

async function datenbank(pfad, einstellungen = {}) {
  const antwort = await fetch(SUPABASE_URL + pfad, {
    ...einstellungen,
    headers: {
      apikey: SUPABASE_SCHLUESSEL,
      Authorization: 'Bearer ' + (sitzung ? sitzung.token : SUPABASE_SCHLUESSEL),
      'Content-Type': 'application/json',
      ...(einstellungen.headers || {}),
    },
  });

  if (antwort.status === 401 || antwort.status === 403) {
    abmelden('Die Anmeldung ist abgelaufen. Bitte neu anmelden.');
    throw new Error('nicht angemeldet');
  }
  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '');
    throw new Error(`${antwort.status} ${text}`.trim());
  }
  return antwort.status === 204 ? null : antwort.json().catch(() => null);
}

/* ══ Anmeldung ══ */

async function anmeldelinkSchicken(email) {
  const antwort = await fetch(SUPABASE_URL + '/auth/v1/otp', {
    method: 'POST',
    headers: { apikey: SUPABASE_SCHLUESSEL, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      create_user: false,          // niemand legt sich hier selbst ein Konto an
      options: { email_redirect_to: location.href.split('#')[0] },
    }),
  });
  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '');
    throw new Error(text || String(antwort.status));
  }
}

function sitzungAusAdresse() {
  // Nach dem Klick auf den Anmeldelink hängt das Zugangsmerkmal hinter dem #
  if (!location.hash.includes('access_token')) return null;
  const teileHash = new URLSearchParams(location.hash.slice(1));
  const token = teileHash.get('access_token');
  if (!token) return null;

  // Aus der Adresszeile entfernen, damit es nicht im Verlauf stehen bleibt
  history.replaceState(null, '', location.pathname + location.search);

  let email = '';
  try {
    const nutzlast = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    email = nutzlast.email || '';
  } catch { /* Adresse ist nur Anzeige, nicht kritisch */ }

  return { token, email };
}

function sitzungMerken(s) {
  sitzung = s;
  try { sessionStorage.setItem('knopf-sitzung', JSON.stringify(s)); } catch { /* egal */ }
}

function sitzungHolen() {
  try {
    const roh = sessionStorage.getItem('knopf-sitzung');
    return roh ? JSON.parse(roh) : null;
  } catch { return null; }
}

function abmelden(hinweis) {
  sitzung = null;
  anfragen = [];
  try { sessionStorage.removeItem('knopf-sitzung'); } catch { /* egal */ }
  zeigen('tor');
  torMeldung.textContent = hinweis || '';
  torMeldung.className = 'tor__meldung' + (hinweis ? ' tor__meldung--fehler' : '');
}

/* ══ Anfragen laden und darstellen ══ */

async function ladenUndZeichnen() {
  try {
    anfragen = await datenbank('/rest/v1/anfragen?select=*&order=eingegangen.desc') || [];
  } catch (fehler) {
    if (String(fehler.message) === 'nicht angemeldet') return;
    melden('Die Anfragen konnten nicht geladen werden.');
    return;
  }

  if (anfragen.length === 0 && sitzung) {
    // Leere Liste kann auch heißen: angemeldet, aber nicht freigeschaltet
    document.getElementById('wer').textContent = sitzung.email || 'Knopf Immobilien';
  }
  zeichnen();
}

function zaehler() {
  const z = { alle: anfragen.length, neu: 0, arbeit: 0, erledigt: 0 };
  anfragen.forEach(a => { z[a.stand] = (z[a.stand] || 0) + 1; });
  return z;
}

function filterZeichnen() {
  const z = zaehler();
  const punkte = [['alle', 'Alle'], ...Object.entries(STAENDE)];
  filterleiste.innerHTML = punkte.map(([wert, name]) => `
    <button type="button" data-filter="${wert}" aria-pressed="${filter === wert}">
      ${name}<span class="zahl">${z[wert] || 0}</span>
    </button>`).join('');
}

function karte(a) {
  const felder = [
    ['Objekt', maskieren(a.ort), false],
    ['Einheiten', String(a.einheiten), true],
    a.baujahr ? ['Baujahr', String(a.baujahr), true] : null,
    a.umfang ? ['Umfang', maskieren(a.umfang), false] : null,
    ['E-Mail', `<a href="mailto:${maskieren(a.email)}">${maskieren(a.email)}</a>`, false],
    a.telefon ? ['Telefon', `<a href="tel:${maskieren(a.telefon.replace(/[^\d+]/g, ''))}">${maskieren(a.telefon)}</a>`, false] : null,
  ].filter(Boolean);

  return `
    <article class="karte" data-stand="${a.stand}" data-id="${maskieren(a.id)}">
      <div class="karte__kopf">
        <div>
          <h2>${maskieren(a.name)}</h2>
          <p class="karte__wann">${maskieren(datumDeutsch(a.eingegangen))}</p>
        </div>
        <span class="marke" data-stand="${a.stand}">${STAENDE[a.stand] || a.stand}</span>
      </div>
      <dl class="daten">
        ${felder.map(([n, w, zahl]) =>
          `<div><dt>${n}</dt><dd${zahl ? ' class="zahl"' : ''}>${w}</dd></div>`).join('')}
      </dl>
      ${a.nachricht ? `<div class="nachricht">${maskieren(a.nachricht)}</div>` : ''}
      <div class="werkzeug">
        <div class="staende">
          ${Object.entries(STAENDE).map(([wert, name]) => `
            <button type="button" class="klein" data-stand-setzen="${wert}"
                    aria-pressed="${a.stand === wert}">${name}</button>`).join('')}
        </div>
        <button type="button" class="klein klein--fort" data-fort="1">Löschen</button>
      </div>
      <div class="notiz">
        <textarea data-notiz="1" rows="2"
                  placeholder="Eigene Notiz zu dieser Anfrage">${maskieren(a.notiz)}</textarea>
      </div>
    </article>`;
}

function zeichnen() {
  filterZeichnen();
  const sichtbar = anfragen.filter(a => filter === 'alle' || a.stand === filter);
  liste.innerHTML = sichtbar.length
    ? sichtbar.map(karte).join('')
    : `<p class="leer">Hier ist gerade nichts. Sobald jemand das Formular auf der
         Website ausfüllt, erscheint die Anfrage an dieser Stelle.</p>`;
}

/* ══ Bedienung ══ */

document.getElementById('anmelden').addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = document.getElementById('anmelde-knopf');
  const email = document.getElementById('adresse').value.trim();
  knopf.disabled = true;
  torMeldung.className = 'tor__meldung';
  torMeldung.textContent = 'Wird verschickt …';

  try {
    await anmeldelinkSchicken(email);
    torMeldung.textContent =
      'Der Anmeldelink ist unterwegs. Bitte im Postfach nachsehen — er gilt eine Stunde.';
    torMeldung.classList.add('tor__meldung--gut');
  } catch {
    torMeldung.textContent =
      'Das hat nicht geklappt. Ist die Adresse für diese Verwaltung freigeschaltet?';
    torMeldung.classList.add('tor__meldung--fehler');
  } finally {
    knopf.disabled = false;
  }
});

document.getElementById('abmelden').addEventListener('click', () => abmelden());

filterleiste.addEventListener('click', (e) => {
  const knopf = e.target.closest('[data-filter]');
  if (!knopf) return;
  filter = knopf.dataset.filter;
  zeichnen();
});

liste.addEventListener('click', async (e) => {
  const karteEl = e.target.closest('.karte');
  if (!karteEl) return;
  const id = karteEl.dataset.id;
  const anfrage = anfragen.find(a => String(a.id) === id);
  if (!anfrage) return;

  const standKnopf = e.target.closest('[data-stand-setzen]');
  if (standKnopf) {
    const vorher = anfrage.stand;
    anfrage.stand = standKnopf.dataset.standSetzen;
    zeichnen();
    try {
      await datenbank(`/rest/v1/anfragen?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ stand: anfrage.stand }),
      });
      melden('Stand: ' + STAENDE[anfrage.stand]);
    } catch {
      anfrage.stand = vorher;
      zeichnen();
      melden('Der Stand konnte nicht gespeichert werden.');
    }
    return;
  }

  if (e.target.closest('[data-fort]')) {
    if (!confirm('Diese Anfrage endgültig löschen? Das lässt sich nicht rückgängig machen.')) return;
    try {
      await datenbank(`/rest/v1/anfragen?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      anfragen = anfragen.filter(a => String(a.id) !== id);
      zeichnen();
      melden('Anfrage gelöscht.');
    } catch {
      melden('Die Anfrage konnte nicht gelöscht werden.');
    }
  }
});

let notizUhr = null;
liste.addEventListener('input', (e) => {
  const feld = e.target.closest('[data-notiz]');
  if (!feld) return;
  const id = feld.closest('.karte').dataset.id;
  const anfrage = anfragen.find(a => String(a.id) === id);
  if (!anfrage) return;
  anfrage.notiz = feld.value;

  clearTimeout(notizUhr);
  notizUhr = setTimeout(async () => {
    try {
      await datenbank(`/rest/v1/anfragen?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ notiz: anfrage.notiz }),
      });
      melden('Notiz gespeichert.');
    } catch {
      melden('Die Notiz konnte nicht gespeichert werden.');
    }
  }, 900);
});

/* ══ Start ══ */

(function start() {
  if (!SUPABASE_URL || !SUPABASE_SCHLUESSEL) {
    zeigen('einrichten');
    return;
  }

  const ausAdresse = sitzungAusAdresse();
  if (ausAdresse) sitzungMerken(ausAdresse);
  else sitzung = sitzungHolen();

  if (!sitzung) { zeigen('tor'); return; }

  zeigen('liste');
  document.getElementById('wer').textContent = sitzung.email || 'Knopf Immobilien';
  ladenUndZeichnen();
})();
