/* ══════════════════════════════════════════════
   Knopf Immobilien — bewegte Fassung
   Eine einzige Schleife rechnet alle Effekte aus.
   Kein fremder Programmcode nötig.
   ══════════════════════════════════════════════ */

'use strict';

const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const klemme = (w, min, max) => Math.max(min, Math.min(w, max));

/* ══ Sätze in Wörter zerlegen, damit sie einzeln aufhellen können ══ */

(function woerterTrennen() {
  const satz = document.querySelector('.satz__text');
  if (!satz) return;
  satz.innerHTML = satz.textContent.trim().split(/\s+/)
    .map(w => `<span class="wort">${w}</span>`).join(' ');
})();

/* ══ Zeilen für den Auftritt vorbereiten ══ */

(function zeilenVorbereiten() {
  if (ruhig) return;
  document.querySelectorAll('.zeile').forEach(z => {
    // Inhalt in eine Hülle packen, die sich aus der Maske schiebt
    const huelle = document.createElement('span');
    huelle.className = 'hebt';
    huelle.style.display = 'block';
    while (z.firstChild) huelle.appendChild(z.firstChild);
    z.appendChild(huelle);
  });
})();

/* ══ Auftritte auslösen, sobald etwas ins Bild kommt ══ */

(function auftritte() {
  if (ruhig) {
    document.querySelectorAll('.enthuellen').forEach(e => e.classList.add('enthuellen--da'));
    return;
  }

  const beobachter = new IntersectionObserver((eintraege, selbst) => {
    eintraege.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;

      if (el.classList.contains('enthuellen')) {
        el.classList.add('enthuellen--da');
      } else {
        // Alle Zeilen eines Blocks nacheinander
        const zeilen = [...el.querySelectorAll('.hebt')];
        zeilen.forEach((h, i) => {
          h.style.setProperty('--verzug', i * 85 + 'ms');
          h.classList.add('hebt--da');
        });
      }
      selbst.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.held__text, .schluss__inhalt, .quer__kopf, .enthuellen')
    .forEach(el => beobachter.observe(el));

  /* Sicherheitsnetz — nichts darf dauerhaft unsichtbar bleiben */
  setTimeout(() => {
    document.querySelectorAll('.hebt:not(.hebt--da)').forEach(h => {
      const r = h.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) h.classList.add('hebt--da');
    });
    document.querySelectorAll('.enthuellen:not(.enthuellen--da)').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) e.classList.add('enthuellen--da');
    });
  }, 1400);
})();

/* ══ Weiches Scrollen ══
   Das Mausrad schreibt nicht mehr direkt in die Seite, sondern auf ein
   Ziel, dem die Seite nachläuft. Tastatur, Touch und Scrollbalken bleiben
   unangetastet — wird von dort gescrollt, übernimmt die Schleife den Wert. */

let ziel = scrollY;
let jetzt = scrollY;

if (!ruhig) {
  addEventListener('wheel', e => {
    if (e.ctrlKey) return;                 // Zoom nicht abfangen
    e.preventDefault();
    ziel += e.deltaY * (e.deltaMode === 1 ? 22 : 1);
  }, { passive: false });

  // Ankerklicks führen das Ziel weich nach
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      ziel = el.getBoundingClientRect().top + scrollY;
    });
  });
}

/* ══ Anteil, den eine angeheftete Sektion schon durchlaufen hat ══ */

function anteil(el) {
  const r = el.getBoundingClientRect();
  const weg = el.offsetHeight - innerHeight;
  return weg <= 0 ? 0 : klemme(-r.top / weg, 0, 1);
}

/* ══ Die Schleife ══ */

const kopf = document.querySelector('.kopf');
const balken = document.getElementById('lesefortschritt');
const weite = document.querySelector('.weite');
const weiteRahmen = document.querySelector('.weite__rahmen');
const haft = document.querySelector('.haft');
const haftBilder = [...document.querySelectorAll('.haft__bild img')];
const haftTeile = [...document.querySelectorAll('.haft__teil')];
const haftPunkte = [...document.querySelectorAll('.haft__punkte span')];
const quer = document.querySelector('.quer');
const bahn = document.querySelector('.quer__bahn');
const woerter = [...document.querySelectorAll('.satz__text .wort')];
const schlussGrund = document.querySelector('.schluss__grund');

let haftStand = -1;

function schleife() {
  /* Weiches Scrollen nachführen */
  if (!ruhig) {
    const maxWeg = document.documentElement.scrollHeight - innerHeight;
    ziel = klemme(ziel, 0, maxWeg);

    // Wurde von außen gescrollt (Touch, Tastatur, Scrollbalken)?
    if (Math.abs(scrollY - jetzt) > 3) { jetzt = scrollY; ziel = scrollY; }

    const rest = ziel - jetzt;
    if (Math.abs(rest) > 0.35) {
      jetzt += rest * 0.085;
      scrollTo(0, jetzt);
    } else {
      jetzt = ziel;
    }
  }

  const oben = scrollY;

  /* Kopf und Fortschritt */
  kopf.classList.toggle('kopf--klein', oben > 40);
  const gesamt = document.documentElement.scrollHeight - innerHeight;
  balken.style.transform = `scaleX(${gesamt > 0 ? oben / gesamt : 0})`;

  /* Das Band geht auf */
  if (weite && weiteRahmen) {
    const a = anteil(weite);
    weiteRahmen.style.setProperty('--auf', klemme(a * 1.5, 0, 1).toFixed(3));
  }

  /* Leistungen wechseln durch */
  if (haft && haftTeile.length) {
    const a = anteil(haft);
    const stand = klemme(Math.floor(a * haftTeile.length * 0.999), 0, haftTeile.length - 1);
    if (stand !== haftStand) {
      haftStand = stand;
      haftTeile.forEach((t, i) => t.classList.toggle('ist-da', i === stand));
      haftBilder.forEach((b, i) => b.classList.toggle('ist-da', i === stand));
      haftPunkte.forEach((p, i) => p.classList.toggle('ist-da', i === stand));
    }
  }

  /* Der Ablauf läuft seitwärts */
  if (quer && bahn) {
    const a = anteil(quer);
    const weg = Math.max(0, bahn.scrollWidth - innerWidth + 48);
    bahn.style.transform = `translate3d(${(-weg * a).toFixed(1)}px, 0, 0)`;
  }

  /* Wörter hellen sich nacheinander auf */
  if (woerter.length) {
    const mitte = innerHeight * 0.62;
    woerter.forEach(w => {
      w.classList.toggle('wort--da', w.getBoundingClientRect().top < mitte);
    });
  }

  /* Hintergrund im Schluss läuft langsamer */
  if (schlussGrund) {
    const r = schlussGrund.parentElement.getBoundingClientRect();
    if (r.bottom > -200 && r.top < innerHeight + 200) {
      const m = r.top + r.height / 2 - innerHeight / 2;
      schlussGrund.style.transform = `translate3d(0, ${(-m * 0.09).toFixed(1)}px, 0)`;
    }
  }

  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);

/* ══ Knöpfe folgen dem Zeiger ══ */

(function magnetisch() {
  if (ruhig || matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.magnet').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.28}px, ${y * 0.4}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .5s cubic-bezier(.19,1,.22,1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 500);
    });
  });
})();

/* ══ Nach Tabwechsel sauber weiterrechnen ══ */

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { jetzt = scrollY; ziel = scrollY; }
});
