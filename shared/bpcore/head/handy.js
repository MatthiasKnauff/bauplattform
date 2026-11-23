'use strict';
/* Handyansicht (GO 22.11.2026, Mock „Handyansicht je App“: HG-1 … HG-5 und je App A; Bautagebuch und Zeiten bleiben, wie sie sind).
   EIN Baustein für alle Apps (HG-2), von head.js erst geladen, wenn das Fenster schmal ist (≤ 820 px – Handy, schmales Fenster;
   Tablet quer bleibt normal, HG-1). Er setzt
     html.bp-handy               solange schmal (Stil in head.css)
     html[data-hstufe]           voll · ansicht (Ansicht + Handgriffe) · lesen (nur Ansicht) · keine – je App aus STUFE
   und zeigt
     – unten die Leiste mit fünf Plätzen (HG-4: Vorgabe Start · Bautagebuch · Aufgaben · Adressen · Suche, je Person in ⚙ → Darstellung,
       gespeichert als „handy“ in den persönlichen Einstellungen); in Apps, die ein ＋ anmelden (window.bpHandyPlus = { titel, attr, aus }:
       Bautagebuch, Zeiten – Mock „Bautagebuch Handyfuß“ BF-1 B … BF-5 A, 23.11.2026), nimmt das ＋ den Platz der App selbst ein, in der Mitte
       zwischen den übrigen Plätzen; attr = Attribute des Knopfs (der Handler der App fängt den Klick), aus() = gerade nichts hinzuzufügen
     – in „nur Ansicht“-Apps oben den Hinweis „Bearbeiten am Rechner“ mit „Link an mich senden“ (HG-3: Mail an mich selbst mit der
       Adresse genau dieser Stelle, /api/bp/handy/link); die Befehlsleiste zum Bearbeiten fehlt dort (head.css).
   Jede App setzt darauf nur ihre eigene Ansicht (Karten statt Tabellen) – sie fragt bpHandy.an() bzw. hört auf das Ereignis „bp:handy“. */
(function () {
  if (window.bpHandy) return;
  const H = window.BPHead, esc = window.bpEsc, R = document.documentElement;
  const STUFE = { portal: 'voll', aufgaben: 'voll', adressen: 'voll', bautagebuch: 'eigen', zeiten: 'eigen',
    plaene: 'ansicht', kommunikation: 'ansicht', gantt: 'ansicht', ava: 'ansicht', wiki: 'ansicht', personal: 'ansicht',
    gebaeudemodell: 'lesen', baukosten: 'lesen', honorar: 'lesen', bauantrag: 'lesen', waermeschutz: 'lesen', baudaten: 'lesen', akquise: 'lesen', papierkorb: 'lesen',
    admin: 'keine' };
  const VORGABE = ['portal', 'bautagebuch', 'aufgaben', 'adressen', 'suche'];
  const LUPE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
  const mq = matchMedia('(max-width: 820px)');
  const stufe = () => STUFE[H.app] || 'lesen';
  const apps = () => ((H.conf || {}).apps || []).filter((a) => a.allowed !== false);
  /* die Plätze der Leiste: gewählt oder Vorgabe; was die Person nicht (mehr) hat, fällt heraus */
  function plaetze() {
    const L = Array.isArray(H.me && H.me.handy) && H.me.handy.length ? H.me.handy : VORGABE;
    return L.filter((k) => k === 'suche' || k === 'portal' || apps().some((a) => a.key === k)).slice(0, 5);
  }
  function eintrag(k) {
    if (k === 'suche') return { k, titel: 'Suche', ic: LUPE };
    const a = apps().find((x) => x.key === k) || {};
    const titel = k === 'portal' ? 'Start' : String(a.short || a.name || k).replace(/ &.*$/, '');
    const pj = k === 'adressen' && H.app !== 'adressen' && H.projekt && H.projekt.id ? '#projekt' : '';   // aus einer App mit Projekt: Adressen beginnen mit dessen Beteiligten (23.11.2026)
    return { k, titel, ic: (H.IC || {})[k === 'portal' ? 'home' : k] || '', href: k === 'portal' ? '/' : a.key && H.appUrl ? H.appUrl(a) + '/' + pj : '' };
  }
  const PLUSIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  function leiste() {
    let n = document.querySelector('.bph-unten');
    if (!n) { n = document.createElement('nav'); n.className = 'bph-unten'; n.setAttribute('aria-label', 'Schnellzugriff'); document.body.appendChild(n); }
    const akt = H.app === 'admin' ? '' : H.app, P = window.bpHandyPlus;
    const H5 = plaetze().map(eintrag).map((e) => e.k === 'suche'
      ? `<button type="button" data-hu="suche">${e.ic}<span>${esc(e.titel)}</span></button>`
      : `<a href="${esc(e.href || '#')}" data-hu="${esc(e.k)}"${e.k === akt ? ' class="on" aria-current="page"' : ''}>${e.ic}<span>${esc(e.titel)}</span></a>`);
    if (P) {   // ＋ statt der eigenen App, in der Mitte (BF-1 B)
      const L = plaetze().filter((k) => k !== akt).slice(0, 4).map((k) => H5[plaetze().indexOf(k)]), m = Math.ceil(L.length / 2);
      L.splice(m, 0, `<button type="button" class="bph-uplus" ${P.attr || ''} aria-label="${esc(P.titel || 'Hinzufügen')}" title="${esc(P.titel || 'Hinzufügen')}"${P.aus && P.aus() ? ' disabled' : ''}><i>${PLUSIC}</i></button>`);
      n.innerHTML = L.join(''); n.style.gridTemplateColumns = `repeat(${L.length},minmax(0,1fr))`;
    } else { n.innerHTML = H5.join(''); n.style.gridTemplateColumns = `repeat(${H5.length},minmax(0,1fr))`; }   // weniger Plätze (App im Büro aus): keine Lücke rechts
  }
  /* „nur Ansicht“: Hinweis oben – Bearbeiten am Rechner, Link an mich senden (HG-3) */
  function hinweis() {
    let n = document.querySelector('.bph-hrech');
    if (stufe() !== 'lesen' && stufe() !== 'keine') { if (n) n.remove(); return; }
    if (n) return;
    const band = document.querySelector('header.bph'); if (!band) return;
    n = document.createElement('div'); n.className = 'bph-hrech';
    n.innerHTML = `<span>${stufe() === 'keine' ? 'Diese App am Rechner öffnen.' : 'Hier nur ansehen – bearbeiten am Rechner.'}</span><button type="button" data-hlink>Link an mich senden</button>`;
    band.after(n);
  }
  async function linkSenden(b) {
    b.disabled = true;
    try {
      const r = await fetch('api/bp/handy/link', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: location.href, titel: document.title }) }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      b.textContent = '✓ gesendet an ' + (r.an || 'dich');
    } catch (e) { b.disabled = false; (window.toast || ((t) => H.tip && H.tip(t)))('Nicht gesendet: ' + e.message, true); }
  }
  function setzen() {
    const an = mq.matches;
    R.classList.toggle('bp-handy', an);
    if (an) R.dataset.hstufe = stufe(); else delete R.dataset.hstufe;
    if (an) { leiste(); hinweis(); } else document.querySelectorAll('.bph-unten, .bph-hrech').forEach((x) => x.remove());
    if (window.bpNav && bpNav.lageJetzt && stufe() !== 'eigen') bpNav.lageJetzt(an ? 'oben' : null);   // Navigation links am Handy als schmale Zeile oben (Bereiche als ▾-Menüs), nicht als halber Bildschirm
    document.dispatchEvent(new CustomEvent('bp:handy', { detail: { an, stufe: stufe() } }));
  }
  document.addEventListener('click', (e) => {
    const s = e.target.closest && e.target.closest('.bph-unten [data-hu="suche"]'); if (s) { e.preventDefault(); H.suche(); return; }
    const l = e.target.closest && e.target.closest('[data-hlink]'); if (l) linkSenden(l);
  });
  mq.addEventListener('change', setzen);
  window.bpHandy = { an: () => mq.matches, stufe, STUFE, VORGABE, plaetze, eintrag, neu: () => { if (mq.matches) leiste(); },   // auch nach jeder Änderung von bpHandyPlus.aus()
    /* Auswahl für ⚙ → Darstellung: alle Plätze, die es für diese Person gibt */
    moeglich: () => ['portal', 'suche', ...apps().filter((a) => !a.teil).map((a) => a.key).filter((k) => !['portal', 'admin', 'papierkorb'].includes(k))] };
  setzen();
})();
