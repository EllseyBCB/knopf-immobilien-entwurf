/* ══════════════════════════════════════════════
   Knopf Immobilien — Verhalten der Seite
   ══════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────
   HIER ÄNDERN — Preise und Empfängeradresse
   ──────────────────────────────────────────────
   ACHTUNG: Diese Werte sind PLATZHALTER. Sie stammen nicht von
   Jim Knopf, sondern sind marktübliche Größenordnungen, damit der
   Rechner überhaupt etwas anzeigt. Vor dem Livegang ersetzen.
   Alle Beträge netto, pro Einheit und Monat.                     */

const PREISE = {
  // Grundpreis je nach Größe der Anlage
  staffel: [
    { bis:  10, satz: 32.00 },
    { bis:  25, satz: 27.00 },
    { bis:  50, satz: 24.00 },
    { bis: 100, satz: 21.00 },
    { bis: Infinity, satz: 19.00 }
  ],
  aufschlagSondereigentum: 8.00,   // wenn zusätzlich SEV gewünscht
  aufschlagAufzug:         1.50,
  aufschlagGewerbe:        2.00,
  mindestbetragMonat:    180.00,   // Untergrenze für sehr kleine Anlagen
  spanne:                  0.12    // ± 12 %, daraus wird die Preisspanne
};

const EMPFAENGER = 'BITTE-EINTRAGEN@knopf-immobilien.de';

/* ────────────────────────────────────────────── */

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0
});
const euroGenau = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 2
});

const ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══ Menü auf schmalen Bildschirmen ══ */

(function menue() {
  const schalter = document.querySelector('.kopf__schalter');
  const nav = document.querySelector('.kopf__nav');
  if (!schalter || !nav) return;

  schalter.addEventListener('click', () => {
    const offen = nav.classList.toggle('kopf__nav--offen');
    schalter.setAttribute('aria-expanded', String(offen));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('kopf__nav--offen');
    schalter.setAttribute('aria-expanded', 'false');
  }));
})();

/* ══ Angebotsrechner ══ */

const rechner = (function () {
  const schieber = document.getElementById('einheiten');
  if (!schieber) return null;

  const anzeigeEinheiten = document.getElementById('einheiten-wert');
  const ausgabeProEinheit = document.getElementById('preis-einheit');
  const ausgabeGesamt = document.getElementById('preis-gesamt');

  function satzFuer(anzahl) {
    return PREISE.staffel.find(s => anzahl <= s.bis).satz;
  }

  function lesen() {
    const anzahl = Number(schieber.value);
    const umfang = document.querySelector('input[name="umfang"]:checked').value;
    const zusatz = [...document.querySelectorAll('input[name="zusatz"]:checked')]
      .map(e => e.value);
    return { anzahl, umfang, zusatz };
  }

  function rechnen() {
    const { anzahl, umfang, zusatz } = lesen();

    let satz = satzFuer(anzahl);
    if (umfang === 'weg_sev') satz += PREISE.aufschlagSondereigentum;
    if (zusatz.includes('aufzug'))  satz += PREISE.aufschlagAufzug;
    if (zusatz.includes('gewerbe')) satz += PREISE.aufschlagGewerbe;

    const untenProEinheit = satz * (1 - PREISE.spanne);
    const obenProEinheit  = satz * (1 + PREISE.spanne);

    // Mindestbetrag kann den Satz pro Einheit anheben
    const untenGesamt = Math.max(untenProEinheit * anzahl, PREISE.mindestbetragMonat);
    const obenGesamt  = Math.max(obenProEinheit  * anzahl, PREISE.mindestbetragMonat * 1.15);

    return {
      anzahl, umfang, zusatz,
      proEinheit: [untenGesamt / anzahl, obenGesamt / anzahl],
      gesamt: [untenGesamt, obenGesamt]
    };
  }

  function zeichnen() {
    const e = rechnen();
    anzeigeEinheiten.textContent = e.anzahl;
    ausgabeProEinheit.textContent =
      `${euroGenau.format(e.proEinheit[0])} – ${euroGenau.format(e.proEinheit[1])}`;
    ausgabeGesamt.textContent =
      `${euro.format(e.gesamt[0])} – ${euro.format(e.gesamt[1])}`;

    // Füllstand des Schiebereglers sichtbar machen
    const anteil = (e.anzahl - schieber.min) / (schieber.max - schieber.min) * 100;
    schieber.style.setProperty('--fuellstand', anteil + '%');
  }

  document.querySelectorAll('#rechner input').forEach(feld => {
    feld.addEventListener('input', zeichnen);
    feld.addEventListener('change', zeichnen);
  });
  zeichnen();

  return { rechnen };
})();

/* ══ Werte aus dem Rechner in das Formular übernehmen ══ */

(function uebernehmen() {
  const knopf = document.getElementById('rechner-uebernehmen');
  const formular = document.getElementById('anfrage');
  if (!knopf || !formular || !rechner) return;

  knopf.addEventListener('click', () => {
    const e = rechner.rechnen();
    formular.elements.einheiten.value = e.anzahl;
    formular.elements.umfang.value =
      e.umfang === 'weg_sev' ? 'WEG plus Sondereigentum' : 'Nur WEG-Verwaltung';

    const merkmale = [];
    if (e.zusatz.includes('aufzug'))  merkmale.push('Aufzug vorhanden');
    if (e.zusatz.includes('gewerbe')) merkmale.push('Gewerbeeinheiten im Objekt');
    if (merkmale.length) {
      const feld = formular.elements.nachricht;
      const zusatzText = 'Besonderheiten: ' + merkmale.join(', ') + '.';
      feld.value = feld.value ? feld.value.replace(/\s*Besonderheiten:.*$/, '').trim() +
        '\n' + zusatzText : zusatzText;
    }

    document.getElementById('kontakt')
      .scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => formular.elements.name.focus(), ruhig ? 0 : 600);
  });
})();

/* ══ Anfrageformular ══ */

(function anfrage() {
  const formular = document.getElementById('anfrage');
  if (!formular) return;
  const meldung = document.getElementById('anfrage-meldung');

  const regeln = {
    name:     w => w.trim().length >= 2      || 'Bitte tragen Sie Ihren Namen ein.',
    email:    w => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(w.trim()) || 'Diese E-Mail-Adresse sieht nicht vollständig aus.',
    ort:      w => w.trim().length >= 2      || 'Bitte nennen Sie den Ort der Anlage.',
    einheiten:w => Number(w) >= 1 && Number(w) <= 500 || 'Bitte eine Zahl zwischen 1 und 500.'
  };

  function fehlerZeigen(feld, text) {
    const traeger = feld.closest('.eingabe');
    const platz = traeger
      ? traeger.querySelector('.eingabe__fehler')
      : document.querySelector(`[data-fuer="${feld.name}"]`);
    if (platz) platz.textContent = text || '';
    if (traeger) traeger.classList.toggle('eingabe--fehler', Boolean(text));
    feld.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  function feldPruefen(feld) {
    const regel = regeln[feld.name];
    if (!regel) return true;
    const ergebnis = regel(feld.value);
    fehlerZeigen(feld, ergebnis === true ? '' : ergebnis);
    return ergebnis === true;
  }

  Object.keys(regeln).forEach(name => {
    const feld = formular.elements[name];
    if (!feld) return;
    feld.addEventListener('blur', () => feldPruefen(feld));
    feld.addEventListener('input', () => {
      if (feld.closest('.eingabe').classList.contains('eingabe--fehler')) feldPruefen(feld);
    });
  });

  formular.addEventListener('submit', ereignis => {
    ereignis.preventDefault();
    meldung.className = 'anfrage__meldung';

    // Spamfalle: ausgefüllt heißt Bot — leise abbrechen
    if (formular.elements.webseite.value.trim() !== '') return;

    let sauber = true;
    let erstesFehlerfeld = null;
    Object.keys(regeln).forEach(name => {
      const feld = formular.elements[name];
      if (feld && !feldPruefen(feld)) {
        sauber = false;
        if (!erstesFehlerfeld) erstesFehlerfeld = feld;
      }
    });

    const zustimmung = formular.elements.datenschutz;
    if (!zustimmung.checked) {
      fehlerZeigen(zustimmung, 'Ohne Ihr Einverständnis kann ich die Anfrage nicht bearbeiten.');
      sauber = false;
      if (!erstesFehlerfeld) erstesFehlerfeld = zustimmung;
    } else {
      fehlerZeigen(zustimmung, '');
    }

    if (!sauber) {
      meldung.textContent = 'Bitte prüfen Sie die markierten Felder.';
      meldung.classList.add('anfrage__meldung--fehler');
      erstesFehlerfeld.focus();
      return;
    }

    const d = Object.fromEntries(new FormData(formular).entries());
    const betreff = `Anfrage WEG-Verwaltung — ${d.ort}, ${d.einheiten} Einheiten`;
    const rumpf = [
      `Name:       ${d.name}`,
      `E-Mail:     ${d.email}`,
      `Telefon:    ${d.telefon || '—'}`,
      `Ort:        ${d.ort}`,
      `Einheiten:  ${d.einheiten}`,
      `Umfang:     ${d.umfang}`,
      '',
      'Nachricht:',
      d.nachricht || '—',
      '',
      '— gesendet über knopf-immobilien.de'
    ].join('\n');

    window.location.href =
      `mailto:${EMPFAENGER}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(rumpf)}`;

    if (EMPFAENGER.includes('BITTE-EINTRAGEN')) {
      meldung.textContent =
        'Hinweis für den Betreiber: In seite.js ist noch keine echte Empfängeradresse hinterlegt.';
      meldung.classList.add('anfrage__meldung--fehler');
    } else {
      meldung.textContent =
        'Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht. Bitte dort noch auf Senden klicken.';
      meldung.classList.add('anfrage__meldung--gut');
    }
  });
})();

/* ══ Abschnitte beim Scrollen einblenden ══ */

(function einblenden() {
  if (ruhig || !('IntersectionObserver' in window)) return;

  const ziele = document.querySelectorAll(
    '.leiste > div, .karte, .anspruch__text, .anspruch figure, ' +
    '.schritte li, .frage, .block > h2, .block > .einleitung, ' +
    '.rechner, .anfrage, .kontakt'
  );
  ziele.forEach(el => el.classList.add('auftritt'));

  const beobachter = new IntersectionObserver((eintraege, selbst) => {
    eintraege.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('auftritt--da');
      selbst.unobserve(e.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -5% 0px' });

  ziele.forEach((el, i) => {
    el.style.setProperty('--verzug', (i % 4) * 70 + 'ms');
    beobachter.observe(el);
  });

  /* Sicherheitsnetz: Was im sichtbaren Bereich steht, wird auf jeden Fall
     gezeigt — auch wenn der Beobachter nicht ausgelöst hat. Das greift beim
     Sprung über eine Adresse wie /#kontakt und wenn sehr schnell gescrollt
     wird. Ohne dieses Netz könnte Inhalt dauerhaft unsichtbar bleiben. */
  function sichtbaresZeigen() {
    document.querySelectorAll('.auftritt:not(.auftritt--da)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        el.classList.add('auftritt--da');
        beobachter.unobserve(el);
      }
    });
  }

  window.addEventListener('load', sichtbaresZeigen);
  window.addEventListener('hashchange', () => setTimeout(sichtbaresZeigen, 60));
  setTimeout(sichtbaresZeigen, 1200);
})();

/* ══ Aktiven Menüpunkt mitführen ══ */

(function menuepunkt() {
  const punkte = [...document.querySelectorAll('.kopf__nav a[href^="#"]')]
    .filter(a => !a.classList.contains('knopf'));
  if (!punkte.length || !('IntersectionObserver' in window)) return;

  const zuPunkt = new Map();
  punkte.forEach(a => {
    const ziel = document.querySelector(a.getAttribute('href'));
    if (ziel) zuPunkt.set(ziel, a);
  });

  const beobachter = new IntersectionObserver(eintraege => {
    eintraege.forEach(e => {
      const a = zuPunkt.get(e.target);
      if (!a) return;
      if (e.isIntersecting) {
        punkte.forEach(p => p.classList.remove('kopf__nav--aktiv'));
        a.classList.add('kopf__nav--aktiv');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  zuPunkt.forEach((_, ziel) => beobachter.observe(ziel));
})();

/* ══ Immer nur eine Frage offen ══ */

(function fragen() {
  const alle = [...document.querySelectorAll('.frage')];
  alle.forEach(f => f.addEventListener('toggle', () => {
    if (f.open) alle.filter(a => a !== f && a.open).forEach(a => { a.open = false; });
  }));
})();

/* ══════════════════════════════════════════════
   Scroll-Effekte
   Alles über transform und opacity, damit der Browser
   nichts neu berechnen muss. Bei reduzierter Bewegung
   bleibt die Seite still.
   ══════════════════════════════════════════════ */

(function scrolleffekte() {
  if (ruhig) return;

  const kopf = document.querySelector('.kopf');
  const balken = document.getElementById('lesefortschritt');

  /* Bilder, die sich langsamer bewegen als die Seite */
  const langsam = [
    { el: document.querySelector('.band img'),    staerke: 0.16 },
    { el: document.querySelector('.block__grund'), staerke: 0.10 }
  ].filter(z => z.el);

  /* Bilder, die beim Durchscrollen sanft aus dem Zoom laufen */
  const zoom = [...document.querySelectorAll('.anspruch figure img')];

  let laeuft = false;

  function zeichnen() {
    laeuft = false;
    const hoehe = window.innerHeight;
    const oben = window.scrollY;

    /* Kopfzeile wird kompakt, sobald man losscrollt */
    if (kopf) kopf.classList.toggle('kopf--klein', oben > 60);

    /* Lesefortschritt */
    if (balken) {
      const gesamt = document.documentElement.scrollHeight - hoehe;
      balken.style.transform = `scaleX(${gesamt > 0 ? oben / gesamt : 0})`;
    }

    /* Langsamere Bilder */
    langsam.forEach(({ el, staerke }) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > hoehe + 200) return;
      const mitte = r.top + r.height / 2 - hoehe / 2;
      el.style.transform = `translate3d(0, ${(-mitte * staerke).toFixed(1)}px, 0)`;
    });

    /* Zoom läuft aus, während das Bild durchs Bild wandert */
    zoom.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > hoehe) return;
      // 0 = Bild betritt den Bildschirm unten, 1 = es hat die Mitte erreicht
      const weg = Math.min(Math.max((hoehe - r.top) / (hoehe * 0.85), 0), 1);
      el.style.transform = `scale(${(1.09 - weg * 0.09).toFixed(4)})`;
    });
  }

  function anstossen() {
    if (laeuft) return;
    laeuft = true;
    requestAnimationFrame(zeichnen);
  }

  window.addEventListener('scroll', anstossen, { passive: true });
  window.addEventListener('resize', anstossen);

  /* In einem Hintergrund-Tab hält der Browser Scroll-Ereignisse und
     Bildwiederholung an. Kommt der Besucher zurück, kann die Seite
     inzwischen ganz woanders stehen — deshalb einmal frisch zeichnen. */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') zeichnen();
  });

  zeichnen();
})();
