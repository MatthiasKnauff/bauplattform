'use strict';
/* Gebäudemodell – Seite der App (GO 20.11.2026, Mock „Gebäudemodell schlank“ A1 B1 C1 D1 E1 F1 G1 H1): links nur noch drei Punkte (bpNav):
   Gebäude · Fragen & Anweisungen · Verknüpfungen. Darüber die Befehlsleiste (befehle.js) mit nur drei Gruppen: Rückgängig · Planstand
   (Einlesen, Gelten lassen, „n entfallene entfernen“ nur wenn es sie gibt, „Ausgeben ▾“ mit IFC und Bauherr:in) · Ansicht (3D · Grundriss · Tabelle).
   „Gebäude“ = eine 3D-Ansicht: ohne IFC-Plan baut man darin mit dem Baukasten (bp/gebaeudekasten.js), mit Plan zeigt sie den Plan (bp/ansicht3d.js).
   Tabelle mit Reitern Bauteile · Räume · Fenster & Türen (gebaeudemodell-listen.js). Rechts der abdockbare Bereich (seite.js): Bauteil, Korb
   (nur Baukasten), Änderungen, Planung. Gelerntes steht in Verwaltung → Einstellungen → Gebäudemodell. Keine eigenen Daten: alles im Projektmodell. */
const NAV = $('#navL'), LEISTE = $('#bfl'), WORK = $('#work'), V = $('#view'), LS = bpLS('pl.');
const IC = { karte: '<circle cx="12" cy="12" r="3"/><circle cx="4.5" cy="6" r="2"/><circle cx="19.5" cy="6" r="2"/><circle cx="4.5" cy="18" r="2"/><circle cx="19.5" cy="18" r="2"/><path d="M6.2 7.2l3.4 3M17.8 7.2l-3.4 3M6.2 16.8l3.4-3M17.8 16.8l-3.4-3"/>',
  fragen: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.5M12 16.6v.1"/>', d3: '<path d="M12 2.8l8.2 4.6v9.2L12 21.2l-8.2-4.6V7.4z"/><path d="M3.8 7.4L12 12l8.2-4.6M12 12v9.2"/>',
  gebaeude: '<path d="M4 20V11l4-3 4 3v9zM12 20v-6h8v6M14 14v-3h4v3"/>', gr: '<path d="M4 4h16v16H4zM4 12h8v8M12 4v8"/>',
  zeile: '<path d="M5 7h14M5 12h14M5 17h8"/>', lesen: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', gilt: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', aus: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6"/>' };
const NAVG = [['Modell', [['gebaeude', 'Gebäude'], ['fragen', 'Fragen & Anweisungen'], ['karte', 'Verknüpfungen']]]];
const TABS = [['bauteile', 'Bauteile'], ['raeume', 'Räume'], ['fenster', 'Fenster & Türen']];
/* SICHT: bauteile (3D · Grundriss · Tabelle der Bauteile), raeume / fenster (Tabelle mit diesem Reiter), fragen, karte – frühere Punkte führen hierher */
const ALT = { baukasten: 'bauteile', gelernt: 'bauteile', d3: 'bauteile', gebaeude: 'bauteile', anweisungen: 'fragen' };
const sichtVon = (s) => ALT[s] || (['bauteile', 'raeume', 'fenster', 'fragen', 'karte'].includes(s) ? s : 'bauteile');
let SICHT = sichtVon(LS.get('sicht')), PID = null, BT = null, KIS = null;
const tag = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
const navId = () => (SICHT === 'fragen' || SICHT === 'karte' ? SICHT : 'gebaeude');
window.bpPlanungPid = () => PID;

function nav() {
  bpNav(NAV, { kopf: { titel: 'Gebäudemodell', klein: 'Projektmodell' }, attr: 'pl', lage: true, aktiv: navId(), davor: '<div class="gm-vm"></div>',
    nachher: (el) => { const b = el.querySelector('.gm-vm'); if (b && BT) BT.menue(b); },
    gruppen: NAVG.map(([t, P]) => ({ titel: t, punkte: P.map(([id, text]) => ({ id, text, icon: IC[id] || IC.gebaeude })) })),
    wahl: (id) => { SICHT = id === 'gebaeude' ? (TABS.some((t) => t[0] === SICHT) ? SICHT : 'bauteile') : id; LS.set('sicht', SICHT); zeichne(); } });
}

/* Befehlsleiste: Rückgängig (undo.js) · Planstand · Ansicht – was gerade nicht geht, bleibt grau an seinem Platz */
function leiste() {
  const st = BT ? BT.zustand() : {}, geb = TABS.some((t) => t[0] === SICHT), bh = window.BPHead && BPHead.bauherrAn && BPHead.bauherrAn();
  const mitte = geb ? G3.mitte || 'tabelle' : '';
  const ausgeben = (e) => pickMenu(e.target.closest('button'), { items: [
    { value: 'ifc', title: 'IFC mit Maßnahmen ausgeben', sub: !st.ifc ? 'nur mit gültigem IFC-Planstand' : st.an ? 'erst den Entwurf gelten lassen oder verlassen' : 'Nummern, Status und Aufbau in den Bauteilen' },
    { value: 'bh', title: 'Im Bauherrenportal zeigen', sub: bh ? 'Räume, Flächen, Maßnahmen, Planstand und 3D – ohne Kosten' : 'Bauherrenportal ist nicht eingerichtet' }],
  onPick: (v) => { if (v === 'ifc') { if (!BT || !st.ifc || st.an || !(st.zeilen || []).length) return toast('IFC ausgeben geht nur mit einem gültigen IFC-Planstand.', true); return BT.ausgeben(); }
    if (v === 'bh') { if (!bh) return toast('Das Bauherrenportal ist nicht eingerichtet.', true); return bauherr(); } } });
  befehle(LEISTE, [
    { titel: 'Planstand', knoepfe: [{ t: 'Neuer Planstand …', ic: IC.lesen, fn: async () => { if (!BT) { SICHT = 'bauteile'; await zeichne(); } if (BT) BT.anfang(true); }, aus: !PID, tip: 'Wie willst du beginnen? Mit dem Baukasten, mit der Planung oder mit einer Datei (IFC, DXF, PDF)' },
      { t: 'Gelten lassen', ic: IC.gilt, fn: () => BT.gelten(), aus: !st.an, tip: 'Den angesehenen Planstand gelten lassen – die Apps arbeiten dann damit' },
      ...(st.weg && !st.an ? [{ t: `${st.weg} entfallene entfernen`, ic: IC.weg, fn: () => BT.aufraeumen(), tip: 'Zeilen entfernen, die im gültigen Planstand nicht mehr vorkommen' }] : []),   // nur, wenn es etwas gibt (Mock „schlank“)
      { t: 'Ausgeben ▾', ic: IC.aus, fn: ausgeben, aus: !PID, tip: 'IFC mit Maßnahmen ausgeben · im Bauherrenportal zeigen' }] },
    { titel: 'Ansicht', rechts: true, knoepfe: [
      { t: '3D', ic: IC.d3, fn: () => mitteWahl('3d'), aus: !PID, an: mitte === '3d', tip: st.an ? 'Der angesehene Planstand in 3D – nur zum Ansehen' : st.plan ? 'Das Modell aus dem Plan groß in der Mitte – Färbungen, Auswahl, Wände spreizen' : 'Das Gebäude in 3D – ohne Plan baust du es hier mit dem Baukasten' },
      { t: 'Grundriss', ic: IC.gr, fn: () => mitteWahl('grundriss'), aus: !PID, an: mitte === 'grundriss', tip: 'Grundriss je Geschoss – Räume, Flächen ohne Raum per Klick als Raum annehmen' },
      { t: 'Tabelle', ic: IC.zeile, fn: () => mitteWahl('tabelle'), aus: !PID, an: mitte === 'tabelle', tip: 'Bauteile, Räume, Fenster & Türen als Tabelle – direkt ändern, mit Haken mehrere gemeinsam' }] },
  ]);
}
async function mitteWahl(w) {
  if (!TABS.some((t) => t[0] === SICHT) || !V.querySelector('.gm-tabi')) { if (!TABS.some((t) => t[0] === SICHT)) { SICHT = 'bauteile'; LS.set('sicht', SICHT); } LS.set('mitte', w); return zeichne(); }
  g3Mitte(w);
}

function baustein(datei, glob) {   // Bausteine erst holen, wenn ihr Bereich gezeigt wird
  if (window[glob]) return Promise.resolve();
  const [b, v] = window.BP_HEAD_BASIS || ['bp/', ''];
  return new Promise((ok, nein) => { const s = document.createElement('script'); s.src = b + datei + v; s.onload = ok; s.onerror = () => nein(new Error('Der Baustein konnte nicht geladen werden.')); document.head.appendChild(s); });
}

/* Gelerntes (D1): Verwaltung → Einstellungen → Gebäudemodell – Ergänzungen, die der Assistent fürs Büro gemerkt hat (bpcore/lernen.py) */
const ABSCHN = { type: 'Was wird gebaut?', eck: 'Größe', bau: 'Bauweise', dg: 'Dach', start: 'Baubeginn', lst: 'Leistungen' };
async function gelernt(host) {
  let L; try { L = await api('api/bp/gelernt'); } catch (e) { host.textContent = e.message; return; }
  host.innerHTML = `<p class="bph-mu">Ergänzungen aus dem Planungsassistenten – der Assistent schlägt sie bei ähnlichen Gebäuden wieder vor (mit Herkunft). „Vergessen“ nimmt sie aus den Vorschlägen; in den Projekten bleiben sie stehen.</p>
    ${L.length ? `<table class="gm-l"><thead><tr><th>Abschnitt</th><th>Ergänzung</th><th>Projekte</th><th>Von</th><th>Datum</th><th></th></tr></thead><tbody>${L.map((x) => `<tr><td class="kl">${esc(x.art === 'leistung' ? 'Leistung' : x.art === 'dauer' ? 'Dauer' : ABSCHN[x.abschnitt] || x.abschnitt)}</td><td>${esc(x.text)}</td><td class="kl">${esc(x.projekte.join(', '))}</td><td class="kl">${esc(x.wer || '')}</td><td class="kl">${esc(tag(x.wann))}</td><td><button type="button" class="btn sm" data-plverg="${esc(x.schluessel)}">Vergessen</button></td></tr>`).join('')}</tbody></table>`
      : '<p class="bph-mu">Noch nichts gelernt. Ergänzt jemand im Assistenten einen Abschnitt oder legt eine eigene Leistung an, steht sie hier.</p>'}`;
  host.onclick = async (e) => { const vg = e.target.closest('[data-plverg]'); if (!vg) return;
    if (!(await bpFrage('Diese Ergänzung vergessen? Der Assistent schlägt sie dann nicht mehr vor.', { ok: 'Vergessen' }))) return;
    try { await api('api/bp/gelernt', 'POST', { schluessel: vg.dataset.plverg }); await gelernt(host); } catch (er) { toast(er.message, true); } };
}

function bauherr() { return BPHead.bauherrFreigeben({ pid: PID, art: 'gebaeude', schluessel: 'modell', titel: 'Gebäude', stand: new Date().toISOString().slice(0, 10) }); }
async function anweisung() {   // „＋ Anweisung …“ unter den ausgeführten Anweisungen (Fragen & Anweisungen)
  await baustein('anweisung.js', 'bpAnweisung');
  bpAnweisung.dialog(PID, { nachher: () => fragenSeite() });
}

/* Reiter über der Tabelle: Bauteile · Räume · Fenster & Türen (B1, C1) – „＋ Raum“ / „＋ Fenster / Tür“ rechts daneben */
function tabsHtml() {
  const neu = SICHT === 'raeume' ? '<button type="button" class="btn sm" data-gmneu="raeume">＋ Raum</button>' : SICHT === 'fenster' ? '<button type="button" class="btn sm" data-gmneu="fenster">＋ Fenster / Tür</button>' : '';
  return `<div class="gm-tr" role="tablist">${TABS.map(([k, t]) => `<button type="button" role="tab" aria-selected="${SICHT === k}" class="${SICHT === k ? 'on' : ''}" data-gmtr="${k}">${t}</button>`).join('')}<span class="gm-trf"></span>${neu}</div>`;
}

/* Fragen & Anweisungen: Fragen und Antworten (mit Änderungssätzen), „✨ KI: Lücken füllen“ mit einem Klick, darunter die ausgeführten Anweisungen */
async function fragenSeite() {
  V.className = 'bp-schmal gm-fa';
  V.innerHTML = `<div class="gm-ki"><span class="gm-kis"></span><button type="button" class="btn" data-gmluecken title="Fehlende Bauteile, Aufbauten für Zeilen ohne Aufbau, auffällige Mengen – als Vorschläge zum Annehmen">✨ KI: Lücken füllen</button><span class="gm-kiw mute"></span></div>
    <div class="gm-fr"></div><h3 class="gm-h3">Ausgeführte Anweisungen</h3><div class="gm-an"></div>`;
  KIS = null; if (typeof bpKiSchieber === 'function') bpKiSchieber(V.querySelector('.gm-kis'), 'gm-luecken', { pid: PID, kompakt: true }).then((k) => { KIS = k; });
  await baustein('fragen.js', 'bpFragen'); bpFragen.mount(V.querySelector('.gm-fr'), PID, { aendern: true });   // auch Änderungssätze (FA-B2)
  await gmAnweisungen(V.querySelector('.gm-an'));
}
async function luecken(b) {
  const w = V.querySelector('.gm-kiw'), stufe = KIS ? KIS.wert() : window.bpKI ? bpKI.wert('gm-luecken') : 'buero';
  if (stufe === 'aus') return toast('Der KI-Schieber steht auf „ohne KI“ – dann gibt es nichts zu füllen.', true);
  const k = 'gm-ext-ok:' + PID;
  if (stufe === 'extern' && !bpLS('').get(k)) {   // einmal je Projekt: was hinausgeht
    if (!(await bpFrage('Für die externe KI gehen anonymisiert hinaus: Bauart, Geschosse, Räume nach Art mit Fläche, die Bauteil-Liste mit Mengen und Aufbau. Nicht: Projektname, Adresse, Personen, Firmen, Preise, Pläne. Für dieses Projekt erlauben?', { ok: 'Erlauben' }))) return;
    bpLS('').set(k, 1);
  }
  b.disabled = true; const t0 = setTimeout(() => { w.textContent = 'Die KI arbeitet … (bis etwa eine Minute)'; }, 1500);
  try {
    const d = await api(`api/bp/modell/${PID}/verfeinern`, 'POST', { was: ['luecken', 'aufbau', 'mengen'], ki: stufe });
    w.innerHTML = d.n ? `${d.n} Vorschl${d.n === 1 ? 'ag' : 'äge'} – <button type="button" class="btn sm" data-gmvs>ansehen und annehmen</button>` : 'Keine Lücken gefunden.';
  } catch (er) { w.textContent = er.message; } finally { clearTimeout(t0); b.disabled = false; }
}

async function zeichne(zeige) {
  nav();
  const geb = TABS.some((t) => t[0] === SICHT);
  if (!geb) { BT = null; G3.D3 = null; G3.BK = null; if (window.seite && WORK.dataset.sr !== 'gmp') seite(WORK, 'gmp', [seite.planung], { planung: false, zu: true }); }   // Fragen, Verknüpfungen: rechts nur „Planung“ – nicht bei jedem Wechsel neu laden
  leiste();
  if (!PID) {
    V.className = 'pl-leer'; V.innerHTML = '<p>Bitte oben ein Projekt wählen – das Gebäudemodell gehört immer zu einem Projekt.</p><button type="button" class="btn primary" data-plprojekt>Projekt wählen</button>'; return;
  }
  try {
    if (geb) return await bauteile3d(zeige);   // gebaeudemodell-3d.js – Bauteile, Räume, Fenster & Türen als Reiter derselben Seite
    if (SICHT === 'fragen') return await fragenSeite();
    V.className = 'bp-voll'; V.innerHTML = ''; const feld = document.createElement('div'); V.appendChild(feld);
    await baustein('karte.js', 'bpKarte'); bpKarte.mount(feld, PID);
  } catch (e) { V.innerHTML = `<p class="mute">${esc(e.message)}</p>`; }
}
document.addEventListener('bp:gmSicht', (e) => {   // Verknüpfungen: Weg I–V und A1 führen zur Ansicht
  const s = e.detail; if (s === 'baukasten') LS.set('mitte', '3d');
  SICHT = sichtVon(s); LS.set('sicht', SICHT); zeichne();
});
document.addEventListener('bp:verknuepfung', () => { SICHT = 'karte'; LS.set('sicht', SICHT); zeichne(); });   // Assistent, letzter Schritt: Zeile antippen → Verknüpfungen (bpKarteZiel)
/* aus einer Liste (Fenster & Türen, Räume) in die Bauteile springen und die Zeile markieren */
function zuBauteil(id) { if (BT && V.querySelector('.gm-tabi')) { gmTab('bauteile'); return BT.zeige(id, true); } SICHT = 'bauteile'; LS.set('sicht', SICHT); zeichne(id); }

V.addEventListener('click', async (e) => {
  if (e.target.closest('[data-plprojekt]')) return BPHead.projektWahl();
  const tr = e.target.closest('[data-gmtr]');
  if (tr) { if (BT && V.querySelector('.gm-tabi')) return gmTab(tr.dataset.gmtr); SICHT = tr.dataset.gmtr; LS.set('sicht', SICHT); LS.set('mitte', 'tabelle'); return zeichne(); }
  const nn = e.target.closest('[data-gmneu]'); if (nn) return gmNeu(nn.dataset.gmneu);
  const lb = e.target.closest('[data-gmluecken]'); if (lb) return luecken(lb);
  if (e.target.closest('[data-gmvs]')) { LS.set('mitte', 'tabelle'); return zuBauteil('__rw'); }   // Vorschläge stehen rechts unter „Bauteil“
});

(async () => {
  const me = await api('api/me'); applyLook(me);
  const PC = await api('api/platform');
  await header('Gebäudemodell', me, PC);
  bpNav.breite(NAV, { key: 'gebaeudemodell' });
  g3EinstMelden();   // Verwaltung → Einstellungen → Gebäudemodell (A–F, Gelerntes)
  PID = BPHead.projektId();
  if (window.BPHead && BPHead.beiProjektWahl) BPHead.beiProjektWahl(() => { PID = BPHead.projektId(); zeichne(); });
  const h = /^#(\w+)$/.exec(location.hash);
  if (h) { if (h[1] === 'baukasten') LS.set('mitte', '3d'); SICHT = sichtVon(h[1]); }
  await zeichne();
})().catch((e) => toast(e.message, true));
// Änderung aus „Fragen und Antworten“ ausgeführt (bp/fragen.js): Bauteile neu laden, damit der neue Aufbau sofort dasteht
addEventListener('bp:modellGeaendert', (e) => { if (+((e.detail || {}).pid) !== +PID) return; if (BT && BT.laden && !G3.BK) BT.laden(); leiste(); });
