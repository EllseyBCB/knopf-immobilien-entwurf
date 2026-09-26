/* ══════════════════════════════════════════════
   Knopf Immobilien — Anfragenverwaltung
   Spricht die Datenbank direkt an, ohne fremde Bibliothek.
   Läuft als installierbare App unter knopfimmobilien.de/verwaltung/.
   ══════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   Jims Supabase-Projekt (Frankfurt). Der Schlüssel ist der
   öffentliche — er allein gibt keinen Zugriff auf die Anfragen,
   dafür sorgen die Zugriffsregeln der Tabelle „anfragen".
   ────────────────────────────────────────────── */

const SUPABASE_URL        = 'https://bullyvdntyswiixngtzu.supabase.co';
const SUPABASE_SCHLUESSEL = 'sb_publishable_t54MOAqmBy22rpbP5wNS2w_TCqO9xG8';

/* ────────────────────────────────────────────── */

const STAENDE = { neu: 'Neu', arbeit: 'In Arbeit', erledigt: 'Erledigt' };
const SITZUNG_SCHLUESSEL = 'knopf-sitzung';
const TAKT_MS = 60 * 1000;   // so oft schaut die offene App nach neuen Anfragen

const teile = {
  tor:   document.getElementById('tor'),
  kopf:  document.getElementById('kopf'),
  rumpf: document.getElementById('rumpf'),
};

const liste        = document.getElementById('liste');
const filterleiste = document.getElementById('filter');
const meldungsfeld = document.getElementById('meldung');
const torMeldung   = document.getElementById('tor-meldung');
const formAdresse  = document.getElementById('anmelden');
const formCode     = document.getElementById('bestaetigen');

let sitzung  = null;    // { token, refresh, ablauf, email }
let anfragen = [];
let filter   = 'alle';
let emailFuerCode = '';

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

function torMelden(text, art) {
  torMeldung.textContent = text || '';
  torMeldung.className = 'tor__meldung' + (art ? ' tor__meldung--' + art : '');
}

function datumDeutsch(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' Uhr';
}

/* ══ Sitzung ══
   Liegt im localStorage, damit Jim auf seinem Gerät angemeldet bleibt.
   Das Zugangsmerkmal gilt eine Stunde und wird vorher still erneuert. */

function sitzungAusAntwort(a) {
  let email = a.user && a.user.email ? a.user.email : '';
  if (!email) {
    try {
      const nutzlast = JSON.parse(atob(a.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      email = nutzlast.email || '';
    } catch { /* Adresse ist nur Anzeige */ }
  }
  const ablauf = a.expires_at
    ? Number(a.expires_at) * 1000
    : Date.now() + (Number(a.expires_in) || 3600) * 1000;
  return { token: a.access_token, refresh: a.refresh_token, ablauf, email };
}

function sitzungMerken(s) {
  sitzung = s;
  try { localStorage.setItem(SITZUNG_SCHLUESSEL, JSON.stringify(s)); } catch { /* egal */ }
}

function sitzungHolen() {
  try {
    const roh = localStorage.getItem(SITZUNG_SCHLUESSEL);
    return roh ? JSON.parse(roh) : null;
  } catch { return null; }
}

let erneuerung = null;
function sitzungErneuern() {
  // Mehrere gleichzeitige Anfragen teilen sich eine Erneuerung
  if (erneuerung) return erneuerung;
  erneuerung = (async () => {
    if (!sitzung || !sitzung.refresh) return false;
    const antwort = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: SUPABASE_SCHLUESSEL, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: sitzung.refresh }),
    }).catch(() => null);
    if (!antwort) throw new Error('offline');
    if (!antwort.ok) return false;
    sitzungMerken(sitzungAusAntwort(await antwort.json()));
    return true;
  })().finally(() => { erneuerung = null; });
  return erneuerung;
}

function abmelden(hinweis) {
  if (sitzung && sitzung.token) {
    fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: { apikey: SUPABASE_SCHLUESSEL, Authorization: 'Bearer ' + sitzung.token },
    }).catch(() => {});
  }
  sitzung = null;
  anfragen = [];
  try { localStorage.removeItem(SITZUNG_SCHLUESSEL); } catch { /* egal */ }
  abzeichenSetzen(0);
  schrittAdresse();
  zeigen('tor');
  torMelden(hinweis, hinweis ? 'fehler' : '');
}

/* ══ Zugriff auf die Datenbank ══ */

async function datenbank(pfad, einstellungen = {}, zweiterVersuch = false) {
  if (sitzung && sitzung.ablauf - Date.now() < 60 * 1000) {
    if (!(await sitzungErneuern())) {
      abmelden('Die Anmeldung ist abgelaufen. Bitte neu anmelden.');
      throw new Error('nicht angemeldet');
    }
  }

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
    if (!zweiterVersuch && (await sitzungErneuern().catch(() => false))) {
      return datenbank(pfad, einstellungen, true);
    }
    abmelden('Die Anmeldung ist abgelaufen. Bitte neu anmelden.');
    throw new Error('nicht angemeldet');
  }
  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '');
    throw new Error(`${antwort.status} ${text}`.trim());
  }
  return antwort.status === 204 ? null : antwort.json().catch(() => null);
}

/* ══ Anmeldung per Code ══
   Kein Link: Auf dem iPhone öffnet ein Link aus der Mail Safari statt
   der installierten App. Den Code tippt man dort ein, wo man ist. */

async function codeSchicken(email) {
  const antwort = await fetch(SUPABASE_URL + '/auth/v1/otp', {
    method: 'POST',
    headers: { apikey: SUPABASE_SCHLUESSEL, 'Content-Type': 'application/json' },
    // Beim allerersten Mal legt das Jims Konto an. Fremde Adressen können
    // sich so zwar ein Konto machen, sehen aber nichts — die Tabelle gibt
    // nur info@knopfimmobilien.de frei.
    body: JSON.stringify({ email, create_user: true }),
  });
  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '');
    throw new Error(text || String(antwort.status));
  }
}

async function codePruefen(email, code) {
  const antwort = await fetch(SUPABASE_URL + '/auth/v1/verify', {
    method: 'POST',
    headers: { apikey: SUPABASE_SCHLUESSEL, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'email', email, token: code }),
  });
  if (!antwort.ok) return null;
  return sitzungAusAntwort(await antwort.json());
}

function sitzungAusAdresse() {
  // Falls doch jemand auf den Link in der Mail klickt: der landet hier
  if (!location.hash.includes('access_token')) return null;
  const werte = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  history.replaceState(null, '', location.pathname + location.search);
  return werte.access_token ? sitzungAusAntwort(werte) : null;
}

function schrittAdresse() {
  formAdresse.hidden = false;
  formCode.hidden = true;
  document.getElementById('code').value = '';
}

function schrittCode(email) {
  emailFuerCode = email;
  formAdresse.hidden = true;
  formCode.hidden = false;
  document.getElementById('code').focus();
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
  document.getElementById('wer').textContent = sitzung.email || 'Knopf Immobilien';
  zeichnen();
}

function zaehler() {
  const z = { alle: anfragen.length, neu: 0, arbeit: 0, erledigt: 0 };
  anfragen.forEach(a => { z[a.stand] = (z[a.stand] || 0) + 1; });
  return z;
}

function abzeichenSetzen(zahl) {
  document.title = (zahl ? `(${zahl}) ` : '') + 'Anfragen — Knopf Immobilien';
  try {
    if (zahl && navigator.setAppBadge) navigator.setAppBadge(zahl).catch(() => {});
    else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
  } catch { /* nicht jedes Gerät kann das */ }
}

function filterZeichnen() {
  const z = zaehler();
  abzeichenSetzen(z.neu);
  const punkte = [['alle', 'Alle'], ...Object.entries(STAENDE)];
  filterleiste.innerHTML = punkte.map(([wert, name]) => `
    <button type="button" data-filter="${wert}" aria-pressed="${filter === wert}">
      ${name}<span class="zahl">${z[wert] || 0}</span>
    </button>`).join('');
}

function antwortLink(a) {
  const betreff = `Ihre Anfrage zur WEG-Verwaltung — ${a.ort}`;
  return `mailto:${encodeURIComponent(a.email)}?subject=${encodeURIComponent(betreff)}`;
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
        <div class="staende">
          <a class="klein" href="${maskieren(antwortLink(a))}">Antworten</a>
          <button type="button" class="klein klein--fort" data-fort="1">Löschen</button>
        </div>
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

formAdresse.addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = document.getElementById('anmelde-knopf');
  const email = document.getElementById('adresse').value.trim().toLowerCase();
  knopf.disabled = true;
  torMelden('Wird verschickt …');

  try {
    await codeSchicken(email);
    schrittCode(email);
    torMelden(`Der Code ist unterwegs an ${email}. Bitte auch im Spam-Ordner nachsehen.`, 'gut');
  } catch (fehler) {
    torMelden(/rate|429|seconds/i.test(fehler.message)
      ? 'Zu viele Versuche. Bitte ein paar Minuten warten.'
      : 'Das hat nicht geklappt. Bitte die Adresse prüfen.', 'fehler');
  } finally {
    knopf.disabled = false;
  }
});

formCode.addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = document.getElementById('code-knopf');
  const code = document.getElementById('code').value.replace(/\D/g, '');
  knopf.disabled = true;
  torMelden('Wird geprüft …');

  try {
    const neu = await codePruefen(emailFuerCode, code);
    if (!neu) {
      torMelden('Der Code stimmt nicht oder ist abgelaufen.', 'fehler');
      return;
    }
    sitzungMerken(neu);
    torMelden('');
    schrittAdresse();
    zeigen('liste');
    ladenUndZeichnen();
  } catch {
    torMelden('Keine Verbindung. Bitte noch einmal versuchen.', 'fehler');
  } finally {
    knopf.disabled = false;
  }
});

document.getElementById('andere-adresse').addEventListener('click', () => {
  schrittAdresse();
  torMelden('');
  document.getElementById('adresse').focus();
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
    notizUhr = null;
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

/* ══ Von selbst aktuell bleiben ══
   Beim Zurückkehren in die App und jede Minute, solange sie offen ist.
   Nicht, während eine Notiz getippt wird — das Neuzeichnen würde das
   Feld unter den Fingern austauschen. */

function nachsehen() {
  if (!sitzung || document.hidden) return;
  if (notizUhr || (document.activeElement && document.activeElement.matches('[data-notiz]'))) return;
  ladenUndZeichnen();
}

document.addEventListener('visibilitychange', nachsehen);
setInterval(nachsehen, TAKT_MS);

/* ══ Start ══ */

(function start() {
  const ausAdresse = sitzungAusAdresse();
  if (ausAdresse) sitzungMerken(ausAdresse);
  else sitzung = sitzungHolen();

  if (!sitzung) { zeigen('tor'); return; }

  zeigen('liste');
  document.getElementById('wer').textContent = sitzung.email || 'Knopf Immobilien';
  ladenUndZeichnen();
})();
