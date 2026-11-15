'use strict';
/* Planung – Seite der App (Etappe 4 des Projektmodells, Entwurf „Planung – Verknüpfungen“, entschieden am 15.11.2026).
   Links die Bereiche (bpNav): Verknüpfungen (bp/karte.js), Assistent (bp/assistent.js), Bauteile (bp/bauteile.js), Stände. Das Projekt kommt aus der Kopfleiste.
   Keine eigenen Daten: alles liegt im Projektmodell des Kerns (/api/bp/modell/<pid>). Server: plattform/planung.py. */
const NAV = $('#navL'), V = $('#view'), LS = bpLS('pl.');
const IC = { karte: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="2"/><circle cx="19.5" cy="6" r="2"/><circle cx="4.5" cy="18" r="2"/><circle cx="19.5" cy="18" r="2"/><path d="M6.2 7.2l3.4 3M17.8 7.2l-3.4 3M6.2 16.8l3.4-3M17.8 16.8l-3.4-3"/>',
  assistent: '<path d="M5 5h14v10H9l-4 4z"/><path d="M9 9h6M9 12h4"/>', bauteile: '<path d="M5 6l1.5 1.5L9 5M5 12l1.5 1.5L9 11M5 18l1.5 1.5L9 17"/><path d="M12 6.5h7M12 12.5h7M12 18.5h7"/>', staende: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="8" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="10" cy="18" r="1.6"/>' };
let SICHT = LS.get('sicht') || 'karte', PID = null;
const tag = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
const ANLASS = (a) => (a === 'hand' ? 'von Hand' : /^ausgang:/.test(a || '') ? 'etwas hat das Haus verlassen' : a || '');

function nav() {
  bpNav(NAV, { kopf: { titel: 'Planung', klein: 'Projektmodell' }, attr: 'pl', lage: true, aktiv: SICHT,
    gruppen: [{ titel: 'Projektmodell', punkte: [{ id: 'karte', text: 'Verknüpfungen', icon: IC.karte }, { id: 'assistent', text: 'Assistent', icon: IC.assistent }, { id: 'bauteile', text: 'Bauteile', icon: IC.bauteile }, { id: 'staende', text: 'Stände', icon: IC.staende }] }],
    wahl: (id) => { SICHT = id; LS.set('sicht', id); zeichne(); } });
}

function baustein(datei, glob) {   // Bausteine erst holen, wenn ihr Bereich gezeigt wird
  if (window[glob]) return Promise.resolve();
  const [b, v] = window.BP_HEAD_BASIS || ['bp/', ''];
  return new Promise((ok, nein) => { const s = document.createElement('script'); s.src = b + datei + v; s.onload = ok; s.onerror = () => nein(new Error('Der Baustein konnte nicht geladen werden.')); document.head.appendChild(s); });
}

async function staende() {
  const D = await api(`api/bp/modell/${PID}`), S = D.staende || [];
  V.className = 'pl-st bp-voll';
  V.innerHTML = `<div><button type="button" class="btn" data-plstand>＋ Stand festhalten</button></div>
    ${S.length ? `<table><thead><tr><th>Nr.</th><th>Kommentar</th><th>Anlass</th><th>Datum</th><th>Von</th></tr></thead><tbody>${S.map((s) => `<tr><td class="nr">${s.nr}</td><td>${esc(s.kommentar || '')}</td><td class="kl">${esc(ANLASS(s.anlass))}</td><td class="kl">${esc(tag(s.wann))}</td><td class="kl">${esc(s.wer || '')}</td></tr>`).join('')}</tbody></table>`
      : '<p class="mute">Noch kein Stand festgehalten. Ein Stand hält das Projektmodell mit Nummer und freiem Kommentar fest – von Hand oder von selbst, wenn etwas das Haus verlässt (LV versendet, Bauantrag eingereicht).</p>'}`;
}

async function zeichne() {
  nav();
  if (!PID) {
    V.className = 'pl-leer'; V.innerHTML = '<p>Bitte oben ein Projekt wählen – die Planung gehört immer zu einem Projekt.</p><button type="button" class="btn primary" data-plprojekt>Projekt wählen</button>'; return;
  }
  try {
    if (SICHT === 'staende') return await staende();
    V.className = SICHT === 'assistent' ? 'bp-schmal' : 'bp-voll'; V.innerHTML = '';
    const feld = document.createElement('div'); V.appendChild(feld);
    if (SICHT === 'assistent') { await baustein('assistent.js', 'bpAssistent'); bpAssistent.mount(feld, PID); }
    else if (SICHT === 'bauteile') { await baustein('bauteile.js', 'bpBauteile'); bpBauteile.mount(feld, PID); }
    else { await baustein('karte.js', 'bpKarte'); bpKarte.mount(feld, PID); }
  } catch (e) { V.innerHTML = `<p class="mute">${esc(e.message)}</p>`; }
}

V.addEventListener('click', async (e) => {
  if (e.target.closest('[data-plprojekt]')) return BPHead.projektWahl();
  if (!e.target.closest('[data-plstand]')) return;
  const k = await bpEingabe('Kommentar zum neuen Stand des Projektmodells (z. B. „Vorentwurf“, „nach Bauherrengespräch“):', ''); if (k == null) return;
  try { const r = await api(`api/bp/modell/${PID}/stand`, 'POST', { kommentar: String(k).trim() }); toast(`Stand ${r.nr} festgehalten – alle Linien stehen wieder auf „mit Übernahme“.`); await staende(); } catch (er) { toast(er.message, true); }
});

(async () => {
  const me = await api('api/me'); applyLook(me);
  const PC = await api('api/platform');
  await header('Planung', me, PC);
  bpNav.breite(NAV, { key: 'planung' });
  PID = BPHead.projektId();
  if (/^#(karte|assistent|bauteile|staende)$/.test(location.hash)) SICHT = location.hash.slice(1);
  await zeichne();
})().catch((e) => toast(e.message, true));
