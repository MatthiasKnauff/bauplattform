'use strict';
/* Gebäudemodell – Seite der App (bis 16.11.2026 „Planung“), aufgebaut wie alle Apps (GO 16.11.2026, Entwurf „Gebäudemodell wie alle Apps +
   Elemente und Anweisungen“): links die Bereiche (bpNav, oben das Versionsmenü der Planstände), darüber die Befehlsleiste (befehle.js:
   Rückgängig · Neu · Planstand · KI · Ausgabe · Ansicht), in der Mitte die Baumtabelle der Bauteile (bp/bauteile.js, baum: true), rechts der
   abdockbare Bereich (seite.js: Details der markierten Zeile, 3D mit der Zeile hervorgehoben, Fragen).
   Bereiche: Modell (Bauteile, Fenster & Türen, Räume, 3D-Ansicht) · Planung (Assistent, Fragen) · Projekt (Verknüpfungen, Anweisungen,
   Gelerntes). Fenster & Türen, Räume und Anweisungen: gebaeudemodell-listen.js. Keine eigenen Daten: alles im Projektmodell des Kerns. */
const NAV = $('#navL'), LEISTE = $('#bfl'), WORK = $('#work'), V = $('#view'), LS = bpLS('pl.');
const IC = { karte: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="2"/><circle cx="19.5" cy="6" r="2"/><circle cx="4.5" cy="18" r="2"/><circle cx="19.5" cy="18" r="2"/><path d="M6.2 7.2l3.4 3M17.8 7.2l-3.4 3M6.2 16.8l3.4-3M17.8 16.8l-3.4-3"/>',
  fragen: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.5M12 16.6v.1"/>', gelernt: '<path d="M4 6l8-3 8 3-8 3z"/><path d="M8 7.6V12c0 1.5 2 2.7 4 2.7s4-1.2 4-2.7V7.6M20 6v6"/>', d3: '<path d="M12 2.8l8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4z"/><path d="M3.8 7.4L12 12l8.2-4.6M12 12v9.2"/>', bauteile: '<path d="M5 6l1.5 1.5L9 5M5 12l1.5 1.5L9 11M5 18l1.5 1.5L9 17"/><path d="M12 6.5h7M12 12.5h7M12 18.5h7"/>',
  fenster: '<rect x="5" y="4" width="14" height="16" rx="1"/><path d="M12 4v16M5 12h14"/>', raeume: '<path d="M4 4h16v16H4zM4 12h8v8M12 4v8"/>', anweisung: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 7l3 3"/>',
  zeile: '<path d="M5 7h14M5 12h14M5 17h8"/>', lesen: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', gilt: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', ki: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/><circle cx="12" cy="12" r="3"/>', ifc: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6"/>', bh: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>', details: '<path d="M4 4h16v16H4zM14 4v16"/>',
  baukasten: '<path d="M4 20V11l4-3 4 3v9zM12 20v-6h8v6M14 14v-3h4v3"/>' };
const NAVG = [['Modell', [['bauteile', 'Bauteile'], ['fenster', 'Fenster & Türen'], ['raeume', 'Räume']]], ['Planung', [['baukasten', 'Baukasten'], ['fragen', 'Fragen und Antworten']]],
  ['Projekt', [['karte', 'Verknüpfungen'], ['anweisungen', 'Anweisungen'], ['gelernt', 'Gelerntes']]]];
let SICHT = LS.get('sicht') || 'bauteile', PID = null, BT = null;
const tag = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
window.bpPlanungPid = () => PID;

function nav() {
  bpNav(NAV, { kopf: { titel: 'Gebäudemodell', klein: 'Projektmodell' }, attr: 'pl', lage: true, aktiv: SICHT, davor: '<div class="gm-vm"></div>',
    nachher: (el) => { const b = el.querySelector('.gm-vm'); if (b && BT) BT.menue(b); },
    gruppen: NAVG.map(([t, P]) => ({ titel: t, punkte: P.map(([id, text]) => ({ id, text, icon: IC[id] || IC.bauteile })) })),
    wahl: (id) => { SICHT = id; LS.set('sicht', id); zeichne(); } });
}

/* Befehlsleiste: Rückgängig (undo.js) · Neu · Planstand · KI · Ausgabe · Ansicht – was gerade nicht geht, bleibt grau an seinem Platz */
function leiste() {
  const st = BT ? BT.zustand() : {}, bt = !!BT && SICHT === 'bauteile', bh = window.BPHead && BPHead.bauherrAn && BPHead.bauherrAn();
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [SICHT === 'raeume' ? { t: 'Raum', ic: IC.raeume, fn: () => gmNeu('raeume'), aus: !PID, tip: 'Raum anlegen – gilt ein Plan, steht er als Ergänzung (gelb) neben den Räumen aus dem Plan' }   // „Neu“ legt an, was die Ansicht zeigt (C1, 20.11.2026)
      : SICHT === 'fenster' ? { t: 'Fenster / Tür', ic: IC.fenster, fn: () => gmNeu('fenster'), aus: !PID, tip: 'Fenster oder Tür anlegen – gilt ein Plan, steht es als Ergänzung (gelb) neben denen aus dem Plan' }
        : { t: 'Zeile', ic: IC.zeile, fn: () => BT.hand(), aus: !bt || !!st.an, tip: 'Bauteil ohne Modell anlegen: Name, Menge und Einheit, Aufbau aus dem Baukasten' }] },
    { titel: 'Planstand', knoepfe: [{ t: 'Einlesen …', ic: IC.lesen, fn: () => BT.einlesen(), aus: !bt, tip: 'Neuen Planstand einlesen: IFC (Allplan u. a.), DXF oder PDF – mit Abgleich' },
      { t: 'Gelten lassen', ic: IC.gilt, fn: () => BT.gelten(), aus: !st.an, tip: 'Den angesehenen Planstand gelten lassen – die Apps arbeiten dann damit' },
      { t: 'Aufräumen', ic: IC.weg, fn: () => BT.aufraeumen(), aus: !bt || !st.weg, tip: 'Zeilen entfernen, die im gültigen Planstand nicht mehr vorkommen' }] },
    { titel: 'KI', knoepfe: [{ t: 'Anweisung …', ic: IC.anweisung, fn: anweisung, aus: !PID, tip: 'Anweisung an das Modell, z. B. „Alle Wohnräume im EG Mosaikparkett“ – nur aus dem Katalog der Bauplattform, erst Vorschau' },
      { t: 'Verfeinern …', ic: IC.ki, fn: () => BT.verfeinern(), aus: !bt || !st.extern, tip: st.extern ? 'Externe KI schlägt fehlende Bauteile, Aufbauten, Mengen vor – anonymisiert, nur als Vorschlag' : 'Nur mit eingeschalteter Zusatzrecherche (Verwaltung → KI)' }] },
    { titel: 'Ausgabe', knoepfe: [{ t: 'IFC', ic: IC.ifc, fn: () => BT.ausgeben(), aus: !bt || !(st.zeilen || []).length || !!st.an || !st.ifc, tip: 'IFC mit Maßnahmen ausgeben: Nummern, Status und Aufbau in den Bauteilen' }] },
    { titel: 'Teilen', knoepfe: [{ t: 'Bauherr:in', ic: IC.bh, fn: bauherr, aus: !PID || !bh, tip: 'Räume, Flächen, Maßnahmen, Planstand und 3D im Bauherrenportal zeigen – ohne Kosten' }] },
    { titel: 'Ansicht', rechts: true, knoepfe: [{ t: '3D', ic: IC.d3, fn: () => g3Mitte('3d'), aus: !bt || !!st.an || !(st.zeilen || []).length, an: bt && G3.mitte === '3d', tip: 'Das Modell groß in der Mitte – Färbungen, Auswahl, Wände spreizen' },
      { t: 'Tabelle', ic: IC.zeile, fn: () => g3Mitte('tabelle'), aus: !bt, an: bt && G3.mitte === 'tabelle', tip: 'Die Bauteile als Tabelle mit Antworten und Aufbau' },
      { t: 'Details', ic: IC.details, fn: () => window.seiteUmschalten && seiteUmschalten(), aus: !bt, tip: 'Bereich rechts zeigen oder an den Rand klappen' }] },
  ]);
}

function baustein(datei, glob) {   // Bausteine erst holen, wenn ihr Bereich gezeigt wird
  if (window[glob]) return Promise.resolve();
  const [b, v] = window.BP_HEAD_BASIS || ['bp/', ''];
  return new Promise((ok, nein) => { const s = document.createElement('script'); s.src = b + datei + v; s.onload = ok; s.onerror = () => nein(new Error('Der Baustein konnte nicht geladen werden.')); document.head.appendChild(s); });
}

/* Gelerntes: Ergänzungen, die der Assistent fürs Büro gemerkt hat (bpcore/lernen.py) – ansehen und vergessen */
const ABSCHN = { type: 'Was wird gebaut?', eck: 'Größe', bau: 'Bauweise', dg: 'Dach', start: 'Baubeginn', lst: 'Leistungen' };
async function gelernt() {
  const L = await api(`api/bp/modell/${PID}/gelernt`);
  V.className = 'pl-st bp-voll';
  V.innerHTML = `<p class="mute">Ergänzungen aus dem Planungsassistenten – der Assistent schlägt sie bei ähnlichen Gebäuden wieder vor (mit Herkunft). „Vergessen“ nimmt sie aus den Vorschlägen; in den Projekten bleiben sie stehen.</p>
    ${L.length ? `<table><thead><tr><th>Abschnitt</th><th>Ergänzung</th><th>Projekte</th><th>Von</th><th>Datum</th><th></th></tr></thead><tbody>${L.map((x) => `<tr><td class="kl">${esc(x.art === 'leistung' ? 'Leistung' : x.art === 'dauer' ? 'Dauer' : ABSCHN[x.abschnitt] || x.abschnitt)}</td><td>${esc(x.text)}</td><td class="kl">${esc(x.projekte.join(', '))}</td><td class="kl">${esc(x.wer || '')}</td><td class="kl">${esc(tag(x.wann))}</td><td><button type="button" class="btn sm" data-plverg="${esc(x.schluessel)}">Vergessen</button></td></tr>`).join('')}</tbody></table>`
      : '<p class="mute">Noch nichts gelernt. Ergänzt jemand im Assistenten einen Abschnitt oder legt eine eigene Leistung an, steht sie hier.</p>'}`;
}

function bauherr() { return BPHead.bauherrFreigeben({ pid: PID, art: 'gebaeude', schluessel: 'modell', titel: 'Gebäude', stand: new Date().toISOString().slice(0, 10) }); }
async function anweisung() {
  await baustein('anweisung.js', 'bpAnweisung');
  bpAnweisung.dialog(PID, { nachher: (d) => { if (BT && SICHT === 'bauteile') BT.neu(d); else zeichne(); leiste(); } });
}

/* Bauteile: großes 3D in der Mitte, Tabelle über „Ansicht“ – gebaeudemodell-3d.js (GO 20.11.2026) */
const bauteile = (zeige) => bauteile3d(zeige);

async function zeichne(zeige) {
  nav();
  if (SICHT !== 'bauteile') { BT = null; G3.D3 = null; if (window.seite) seite(WORK, 'gmp', [seite.planung], { planung: false, zu: true }); }   // Assistent wie überall rechts (Reiter „Planung“)
  leiste();
  if (!PID) {
    V.className = 'pl-leer'; V.innerHTML = '<p>Bitte oben ein Projekt wählen – das Gebäudemodell gehört immer zu einem Projekt.</p><button type="button" class="btn primary" data-plprojekt>Projekt wählen</button>'; return;
  }
  try {
    if (SICHT === 'bauteile') return await bauteile(zeige);
    if (SICHT === 'gelernt') return await gelernt();
    if (SICHT === 'fenster' || SICHT === 'raeume' || SICHT === 'anweisungen') return await gmListe(SICHT);   // gebaeudemodell-listen.js
    V.className = SICHT === 'fragen' ? 'bp-schmal' : 'bp-voll'; V.innerHTML = '';
    const feld = document.createElement('div'); V.appendChild(feld);
    if (SICHT === 'baukasten') { V.className = 'bp-voll'; await baustein('gebaeudekasten.js', 'bpBaukasten'); bpBaukasten.mount(feld, PID); }   // Gebäude-Baukasten (A3) – füllt dieselben Angaben wie der Assistent
    else if (SICHT === 'fragen') { await baustein('fragen.js', 'bpFragen'); bpFragen.mount(feld, PID, { aendern: true }); }   // Fragen und Antworten – hier auch Änderungssätze (FA-B2)
    else { await baustein('karte.js', 'bpKarte'); bpKarte.mount(feld, PID); }
  } catch (e) { V.innerHTML = `<p class="mute">${esc(e.message)}</p>`; }
}
document.addEventListener('bp:gmSicht', (e) => { if (NAVG.some(([, P]) => P.some(([id]) => id === e.detail))) { SICHT = e.detail; LS.set('sicht', SICHT); zeichne(); } });   // Verknüpfungen: Weg I–V und A1 führen zur Ansicht
document.addEventListener('bp:verknuepfung', () => { SICHT = 'karte'; LS.set('sicht', SICHT); zeichne(); });   // Assistent, letzter Schritt: Zeile antippen → Verknüpfungen (bpKarteZiel)
/* aus einer Liste (Fenster & Türen, Räume) in die Bauteile springen und die Zeile markieren */
function zuBauteil(id) { SICHT = 'bauteile'; LS.set('sicht', SICHT); zeichne(id); }

V.addEventListener('click', async (e) => {
  if (e.target.closest('[data-plprojekt]')) return BPHead.projektWahl();
  const vg = e.target.closest('[data-plverg]');
  if (vg) { if (!(await bpFrage('Diese Ergänzung vergessen? Der Assistent schlägt sie dann nicht mehr vor.', { ok: 'Vergessen' }))) return; try { await api(`api/bp/modell/${PID}/gelernt/vergessen`, 'POST', { schluessel: vg.dataset.plverg }); await gelernt(); } catch (er) { toast(er.message, true); } }
});

(async () => {
  const me = await api('api/me'); applyLook(me);
  const PC = await api('api/platform');
  await header('Gebäudemodell', me, PC);
  bpNav.breite(NAV, { key: 'gebaeudemodell' });
  g3EinstMelden();   // Verwaltung → Einstellungen → Gebäudemodell (A–F)
  PID = BPHead.projektId();
  if (window.BPHead && BPHead.beiProjektWahl) BPHead.beiProjektWahl(() => { PID = BPHead.projektId(); zeichne(); });
  const h = /^#(\w+)$/.exec(location.hash);
  if (h && h[1] === 'd3') SICHT = 'bauteile';   // frühere „3D-Ansicht“ steckt jetzt in „Bauteile“
  if (h && NAVG.some(([, P]) => P.some(([id]) => id === h[1]))) SICHT = h[1];
  if (!NAVG.some(([, P]) => P.some(([id]) => id === SICHT))) SICHT = 'bauteile';
  await zeichne();
})().catch((e) => toast(e.message, true));
// Änderung aus „Fragen und Antworten“ ausgeführt (bp/fragen.js): Bauteile neu laden, damit der neue Aufbau sofort dasteht
addEventListener('bp:modellGeaendert', (e) => { if (+((e.detail || {}).pid) !== +PID) return; if (BT && SICHT === 'bauteile' && BT.laden) BT.laden(); leiste(); });
