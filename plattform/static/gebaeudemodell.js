'use strict';
/* Gebäudemodell – Seite der App (bis 16.11.2026 „Planung“) (Etappe 4 des Projektmodells, Entwurf „Planung – Verknüpfungen“, entschieden am 15.11.2026).
   Links die Bereiche (bpNav): 3D-Ansicht (bp/ansicht3d.js), Bauteile mit Planständen (bp/bauteile.js), Assistent (bp/assistent.js), Verknüpfungen (bp/karte.js), Stände. Das Projekt kommt aus der Kopfleiste.
   Keine eigenen Daten: alles liegt im Projektmodell des Kerns (/api/bp/modell/<pid>). Server: plattform/gebaeudemodell.py. */
const NAV = $('#navL'), V = $('#view'), LS = bpLS('pl.');
const IC = { karte: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="2"/><circle cx="19.5" cy="6" r="2"/><circle cx="4.5" cy="18" r="2"/><circle cx="19.5" cy="18" r="2"/><path d="M6.2 7.2l3.4 3M17.8 7.2l-3.4 3M6.2 16.8l3.4-3M17.8 16.8l-3.4-3"/>',
  assistent: '<path d="M5 5h14v10H9l-4 4z"/><path d="M9 9h6M9 12h4"/>', fragen: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.5M12 16.6v.1"/>', gelernt: '<path d="M4 6l8-3 8 3-8 3z"/><path d="M8 7.6V12c0 1.5 2 2.7 4 2.7s4-1.2 4-2.7V7.6M20 6v6"/>', d3: '<path d="M12 2.8l8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4z"/><path d="M3.8 7.4L12 12l8.2-4.6M12 12v9.2"/>', bauteile: '<path d="M5 6l1.5 1.5L9 5M5 12l1.5 1.5L9 11M5 18l1.5 1.5L9 17"/><path d="M12 6.5h7M12 12.5h7M12 18.5h7"/>', staende: '<path d="M5 6h14M5 12h14M5 18h14"/><circle cx="8" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="10" cy="18" r="1.6"/>' };
let SICHT = LS.get('sicht') || 'd3', PID = null;
const tag = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
const ANLASS = (a) => (a === 'hand' ? 'von Hand' : /^ausgang:/.test(a || '') ? 'etwas hat das Haus verlassen' : a || '');

function nav() {
  bpNav(NAV, { kopf: { titel: 'Gebäudemodell', klein: 'Projektmodell' }, attr: 'pl', lage: true, aktiv: SICHT,
    gruppen: [{ titel: 'Projektmodell', punkte: [{ id: 'd3', text: '3D-Ansicht', icon: IC.d3 }, { id: 'bauteile', text: 'Bauteile', icon: IC.bauteile }, { id: 'assistent', text: 'Assistent', icon: IC.assistent }, { id: 'karte', text: 'Verknüpfungen', icon: IC.karte }, { id: 'staende', text: 'Stände', icon: IC.staende }, { id: 'gelernt', text: 'Gelerntes', icon: IC.gelernt }, { id: 'fragen', text: 'Fragen', icon: IC.fragen }] }],
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

/* Gelerntes: Ergänzungen, die der Assistent fürs Büro gemerkt hat (bpcore/lernen.py) – ansehen und vergessen */
const ABSCHN = { type: 'Was wird gebaut?', eck: 'Größe', bau: 'Bauweise', dg: 'Dach', start: 'Baubeginn', lst: 'Leistungen' };
async function gelernt() {
  const L = await api(`api/bp/modell/${PID}/gelernt`);
  V.className = 'pl-st bp-voll';
  V.innerHTML = `<p class="mute">Ergänzungen aus dem Planungsassistenten – der Assistent schlägt sie bei ähnlichen Gebäuden wieder vor (mit Herkunft). „Vergessen“ nimmt sie aus den Vorschlägen; in den Projekten bleiben sie stehen.</p>
    ${L.length ? `<table><thead><tr><th>Abschnitt</th><th>Ergänzung</th><th>Projekte</th><th>Von</th><th>Datum</th><th></th></tr></thead><tbody>${L.map((x) => `<tr><td class="kl">${esc(x.art === 'leistung' ? 'Leistung' : ABSCHN[x.abschnitt] || x.abschnitt)}</td><td>${esc(x.text)}</td><td class="kl">${esc(x.projekte.join(', '))}</td><td class="kl">${esc(x.wer || '')}</td><td class="kl">${esc(tag(x.wann))}</td><td><button type="button" class="btn sm" data-plverg="${esc(x.schluessel)}">Vergessen</button></td></tr>`).join('')}</tbody></table>`
      : '<p class="mute">Noch nichts gelernt. Ergänzt jemand im Assistenten einen Abschnitt oder legt eine eigene Leistung an, steht sie hier.</p>'}`;
}

async function zeichne() {
  nav();
  if (!PID) {
    V.className = 'pl-leer'; V.innerHTML = '<p>Bitte oben ein Projekt wählen – das Gebäudemodell gehört immer zu einem Projekt.</p><button type="button" class="btn primary" data-plprojekt>Projekt wählen</button>'; return;
  }
  try {
    if (SICHT === 'staende') return await staende();
    if (SICHT === 'gelernt') return await gelernt();
    V.className = SICHT === 'assistent' ? 'bp-schmal' : 'bp-voll'; V.innerHTML = '';
    const feld = document.createElement('div'); V.appendChild(feld);
    if (SICHT === 'assistent') { await baustein('assistent.js', 'bpAssistent'); bpAssistent.mount(feld, PID); }
    else if (SICHT === 'fragen') { V.className = 'bp-schmal'; await baustein('fragen.js', 'bpFragen'); bpFragen.mount(feld, PID); }   // KI-Gespräch – nur Ollama, eigene Daten
    else if (SICHT === 'd3') {   // 3D-Ansicht des gültigen Planstands, gefärbt nach den Antworten der Checkliste
      const [, D] = await Promise.all([baustein('ansicht3d.js', 'bp3d'), api(`api/bp/modell/${PID}`)]);
      bp3d.mount(feld, { url: `api/bp/modell/${PID}/netz`, zeilen: ((D.modell || {}).bauteilliste || {}).zeilen || [] });
      if (BPHead.bauherrAn && BPHead.bauherrAn()) {   // Gebäude fürs Bauherrenportal: Räume, Flächen, Maßnahmen, Planstand, 3D – nie Kosten (der Kern stellt es zusammen)
        const b = document.createElement('div'); b.className = 'gm-bh';
        b.innerHTML = '<button type="button" class="btn" data-plbh title="Räume, Flächen, Maßnahmen, Planstand und 3D-Ansicht im Bauherrenportal zeigen – ohne Kosten. Der Stand wird im Modell festgehalten.">Für Bauherr:in freigeben</button>';
        V.insertBefore(b, feld);
      }
    }
    else if (SICHT === 'bauteile') { await baustein('bauteile.js', 'bpBauteile'); bpBauteile.mount(feld, PID, { einlesen: true }); }   // nur hier: Planstände einlesen
    else { await baustein('karte.js', 'bpKarte'); bpKarte.mount(feld, PID); }
  } catch (e) { V.innerHTML = `<p class="mute">${esc(e.message)}</p>`; }
}

V.addEventListener('click', async (e) => {
  if (e.target.closest('[data-plprojekt]')) return BPHead.projektWahl();
  const vg = e.target.closest('[data-plverg]');
  if (vg) { if (!(await bpFrage('Diese Ergänzung vergessen? Der Assistent schlägt sie dann nicht mehr vor.', { ok: 'Vergessen' }))) return; try { await api(`api/bp/modell/${PID}/gelernt/vergessen`, 'POST', { schluessel: vg.dataset.plverg }); await gelernt(); } catch (er) { toast(er.message, true); } return; }
  if (e.target.closest('[data-plbh]')) return BPHead.bauherrFreigeben({ pid: PID, art: 'gebaeude', schluessel: 'modell', titel: 'Gebäude', stand: new Date().toISOString().slice(0, 10) });
  if (!e.target.closest('[data-plstand]')) return;
  const k = await bpEingabe('Kommentar zum neuen Stand des Projektmodells (z. B. „Vorentwurf“, „nach Bauherrengespräch“):', ''); if (k == null) return;
  try { const r = await api(`api/bp/modell/${PID}/stand`, 'POST', { kommentar: String(k).trim() }); toast(`Stand ${r.nr} festgehalten – alle Linien stehen wieder auf „mit Übernahme“.`); await staende(); } catch (er) { toast(er.message, true); }
});

(async () => {
  const me = await api('api/me'); applyLook(me);
  const PC = await api('api/platform');
  await header('Gebäudemodell', me, PC);
  bpNav.breite(NAV, { key: 'gebaeudemodell' });
  PID = BPHead.projektId();
  if (/^#(d3|karte|assistent|bauteile|staende|gelernt|fragen)$/.test(location.hash)) SICHT = location.hash.slice(1);
  await zeichne();
})().catch((e) => toast(e.message, true));
