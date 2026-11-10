/* Ausschreibung (AVA) – Fenster- und Türliste.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Fenster- und Türliste: Tabelle wie in Excel (markieren, kopieren, einfügen, löschen, ausfüllen),
   gleiche Ausführung wird beim Übernehmen zu einer LV-Position ---------- */
const TA = { art: ['Innentür', 'Fenster', 'Fenstertür', 'Nebeneingangstür', 'Haustür', 'Außentür', 'Wohnungseingangstür', 'Funktionstür', 'Brandschutztür', 'Rauchschutztür', 'Schallschutztür', 'Schiebetür', 'Ganzglastür', 'Stahltür', 'Tor'],
  flg: ['1-flg.', '2-flg.', '2-flg. ungleich', 'Schiebetür', 'Pendeltür'], din: ['DIN L', 'DIN R', 'oben'],
  oeffnung: ['fest', 'festverglast', 'dreh', 'drehkipp', 'kipp', 'schiebe', 'Stulp drehkipp/dreh'],
  fb_innen: ['gefliest (bauseits)', 'Werkstein', 'Holz', 'keine'], fb_aussen: ['Aluminium', 'gefliest (bauseits)', 'keine (wandbündig)'],
  rollo: ['nein', 'ja', 'ja, mit Handkurbel (2. Rettungsweg)'],
  brand: ['T30', 'T30-RS', 'T90', 'T90-RS', 'RS', 'EI2 30', 'EI2 90', 'G30'], schall: ['27 dB', '32 dB', '37 dB', '42 dB', '47 dB'], rc: ['RC2', 'RC3', 'RC4'], klima: ['I', 'II', 'III'],
  zarge: ['Stahl-Umfassungszarge', 'Stahl-Eckzarge', 'Stahl-Blockzarge', 'Holz-Umfassungszarge', 'Holz-Blockzarge', 'Alu-Rahmen', 'Ganzglas-Beschläge', 'zargenlos (flächenbündig)'],
  blatt: ['Röhrenspan', 'Vollspan', 'Stahl doppelwandig', 'Alu-Rahmen mit Füllung', 'Ganzglas ESG', 'Holz massiv', 'Brandschutzeinlage'],
  oberfl: ['CPL', 'HPL', 'Lack weiß', 'Lack RAL nach Wahl', 'Furnier', 'pulverbeschichtet', 'grundiert'],
  glas: ['Klarglas VSG', 'Satinato ESG', 'Brandschutzglas', 'Drahtglas'],
  schloss: ['BB', 'PZ', 'WC', 'Panik', 'Motorschloss', 'ohne'], beschlag: ['Drücker/Drücker Edelstahl', 'Drücker/Knauf', 'Stoßgriff', 'Muschelgriff', 'Drücker/Drücker Alu'] };
const TJA = [['licht', 'Lichtausschnitt'], ['umfz', 'Umfassungszarge'], ['lueft', 'Lüftungsöffnung'], ['otsch', 'Obentürschließer'], ['frl', 'Feststellanlage'], ['oberlicht', 'Oberlicht'], ['seitenteil', 'Seitenteil'], ['bodend', 'Bodendichtung'],
  ['schwelle', 'schwellenlos'], ['bf', 'barrierefrei'], ['panik', 'Panik EN 1125'], ['notaus', 'Notausgang EN 179'], ['eoeff', 'E-Öffner'], ['antrieb', 'Antrieb'], ['zk', 'Zutrittskontrolle'],
  ['rm', 'Riegelkontakt'], ['sa', 'Schließanlage'], ['stopper', 'Türstopper'], ['kanten', 'Kantenschutz'], ['nass', 'Feuchtraum']];
const TSP = [   // Schlüssel, Überschrift, Art (t Text, n Zahl/Maß, s Auswahl, b Ja/Nein), Breite px, Gruppe
  ['nr', 'Einbaupos. / Tür-Nr.', 't', 46, 'Lage'], ['geschoss', 'Geschoss', 't', 26, 'Lage'], ['raum', 'Raum-Nr.', 't', 34, 'Lage'], ['raumname', 'Raum', 't', 70, 'Lage'], ['zu', 'zu Raum', 't', 40, 'Lage'],
  ['typ', 'Typ', 't', 24, 'Element'], ['anzahl', 'Anzahl', 'n', 22, 'Element'], ['art', 'Art', 's', 66, 'Element'], ['flg', 'Flügel', 's', 38, 'Element'], ['din', 'Öffnungsrichtung (DIN)', 's', 34, 'Element'],
  ['b', 'Breite (m o. mm)', 'n', 36, 'Maße'], ['h', 'Höhe (m o. mm)', 'n', 38, 'Maße'], ['wand', 'Wanddicke', 'n', 26, 'Maße'], ['bruestung', 'Brüstungshöhe', 'n', 28, 'Maße'],
  ['oeffnung', 'Öffnungsart', 's', 44, 'Fenster'], ['fb_innen', 'Innenfensterbank', 's', 46, 'Fenster'], ['fb_aussen', 'Außenfensterbank', 's', 46, 'Fenster'], ['rollo', 'Rollo', 's', 30, 'Fenster'],
  ['zarge', 'Zarge', 's', 46, 'Ausführung'], ['blatt', 'Türblatt', 's', 46, 'Ausführung'], ['oberfl', 'Oberfläche', 's', 40, 'Ausführung'], ['farbe', 'Farbe / RAL', 't', 36, 'Ausführung'], ['glas', 'Verglasung', 's', 40, 'Ausführung'],
  ['brand', 'Brandschutz', 's', 38, 'Anforderungen'], ['schall', 'Schallschutz', 's', 30, 'Anforderungen'], ['rc', 'Einbruch (RC)', 's', 24, 'Anforderungen'], ['klima', 'Klimaklasse', 's', 20, 'Anforderungen'],
  ['schloss', 'Schloss', 's', 30, 'Beschlag'], ['beschlag', 'Beschlag', 's', 46, 'Beschlag'],
  ...TJA.map(([k, l]) => [k, l, 'b', 17, 'Ausstattung']), ['bem', 'Bemerkung', 't', 90, 'Hinweis']];
let TL = null, TLq = '', tlT = 0, TLA = null, TLC = null, TLH = [], TLR = [], TLzu = new Set(LS.get('tlzu', [])), tlZiehen = false, tlEd = null;
function tlDatalists() {
  if ($('#tlDl')) return;
  const d = document.createElement('div'); d.id = 'tlDl'; d.hidden = true;
  d.innerHTML = Object.entries(TA).map(([k, xs]) => `<datalist id="tl-${k}">${xs.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`).join('');
  document.body.appendChild(d);
}
async function tlLaden(liste) {   // mehrere Listen je Projekt; zuletzt geöffnete merken
  const p = pid; liste = liste || LS.get('tl.liste.' + p, '1'); TL = { pid: p, liste, tueren: [], rev: 0, listen: [], laedt: true };
  try {
    let r = await api(`api/projekt/${p}/tueren?liste=${encodeURIComponent(liste)}`);
    if (r.listen.length && !r.listen.some((x) => x.id === liste)) { liste = r.listen[0].id; r = await api(`api/projekt/${p}/tueren?liste=${encodeURIComponent(liste)}`); }   // gelöscht → erste
    if (pid === p) { TL = { pid: p, liste, tueren: r.tueren, rev: r.rev, listen: r.listen }; LS.set('tl.liste.' + p, liste); }
  } catch (e) { toast(e.message, true); }
  TLA = TLC = null; TLH = []; TLR = []; bpUndo.wegArt('tl'); if (tab === 'tueren') render();
}
const tlName = () => ((TL.listen || []).find((x) => x.id === TL.liste) || {}).name || 'Fenster- & Türliste';
async function tlListeNeu() {
  if (tlT) { clearTimeout(tlT); await tlJetzt(); }
  modalBox(`<h3>Neue Fenster- & Türliste</h3><p class="hint">Z. B. je Bauteil, Bauabschnitt oder Stand. Jede Liste lässt sich getrennt ins LV übernehmen und später aktualisieren.</p>
    <label class="dz-l">Name<input id="tlnN" value="" placeholder="z. B. Fenster Altbau, Haus B, Stand Entwurf"></label>
    <label class="dz-l" style="margin-top:.6rem">Inhalt<select id="tlnK"><option value="">leer</option>${TL.tueren.length ? `<option value="${esc(TL.liste)}">Kopie von „${esc(tlName())}“ (${TL.tueren.length} Zeilen)</option>` : ''}</select></label>
    <div class="acts" style="margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') return close();
    btn.disabled = true;
    try { const r = await api(`api/projekt/${pid}/tuerlisten`, 'POST', { name: bg.querySelector('#tlnN').value.trim() || 'Neue Liste', kopie_von: bg.querySelector('#tlnK').value || null });
      close(); await tlLaden(r.liste); toast('Liste angelegt.'); } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  setTimeout(() => { const f = document.getElementById('tlnN'); if (f) f.focus(); }, 30);
}
async function tlListeUmbenennen() {
  const name = (await bpEingabe('Name der Liste', tlName())); if (name == null || !name.trim()) return;
  try { const r = await api(`api/projekt/${pid}/tuerlisten/${TL.liste}`, 'PUT', { name: name.trim() }); TL.listen = r.listen; render(); } catch (e) { toast(e.message, true); }
}
async function tlListeLoeschen() {
  const nm = tlName(), n = TL.tueren.length;
  modalBox(`<h3>Liste löschen?</h3><p>„${esc(nm)}“ mit ${n} Zeile${n === 1 ? '' : 'n'} kommt in den Papierkorb und lässt sich von dort wiederherstellen. Positionen, die schon im LV stehen, bleiben dort.</p>
    <div class="acts" style="margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn danger" data-m="ok">In den Papierkorb</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') return close();
    btn.disabled = true;
    try {
      clearTimeout(tlT); tlT = 0;
      const r = await api(`api/projekt/${pid}/tuerlisten/${TL.liste}`, 'DELETE'); close();
      const naechste = (r.listen[0] || {}).id || '1'; await tlLaden(naechste);
      if (typeof r.papierkorb === 'number') rueckgaengig(`„${nm}“ liegt im Papierkorb`, async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await tlLaden(); });
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
}
function tlSpeichern(sofort) { $('#save').textContent = 'Nicht gespeichert …'; clearTimeout(tlT); tlT = setTimeout(tlJetzt, sofort ? 10 : 600); }
async function tlJetzt() {
  tlT = 0; if (!TL) return;
  try { const r = await api(`api/projekt/${TL.pid}/tueren?liste=${encodeURIComponent(TL.liste || '1')}`, 'PUT', { rev: TL.rev, tueren: TL.tueren }); TL.rev = r.rev;
    const li = (TL.listen || []).find((x) => x.id === TL.liste); if (li) li.n = TL.tueren.length; else TL.listen = [...(TL.listen || []), { id: TL.liste, name: 'Fenster- & Türliste', n: TL.tueren.length }];
    const d = new Date(); $('#save').textContent = `✓ gespeichert ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) { $('#save').textContent = 'Nicht gespeichert'; toast(e.message + (e.data && e.data.conflict ? ' Die Liste wird neu geladen.' : ''), true); if (e.data && e.data.conflict) tlLaden(); }
}
/* Rückgängig / Wiederholen (Strg+Z / Strg+Y) – je Änderung ein Stand */
function tlMerken(label) { const st = { data: JSON.stringify(TL.tueren), label: label || '' }; st.u = bpUndo.push(label || 'Türliste geändert', () => tlZurueck(false), 'tl'); TLH.push(st); if (TLH.length > 80) bpUndo.weg(TLH.shift().u); TLR = []; setTimeout(tlBeschriften, 0); }
function tlBeschriften() {   // Text für „↶ …“ aus dem Unterschied ermitteln (wie im LV)
  const top = TLH[TLH.length - 1]; if (!top || top.label) return histUi();
  const a = JSON.parse(top.data), n = TL.tueren.length;
  top.label = n < a.length ? `${a.length - n} Zeile${a.length - n > 1 ? 'n' : ''} gelöscht` : n > a.length ? `${n - a.length} Zeile${n - a.length > 1 ? 'n' : ''} hinzugefügt` : 'Türliste geändert';
  bpUndo.text(top.u, top.label); histUi();
}
function tlZurueck(vor) {
  const von = vor ? TLR : TLH, nach = vor ? TLH : TLR; if (!von.length) return toast(vor ? 'Nichts zum Wiederholen.' : 'Nichts mehr rückgängig zu machen.');
  const st = von.pop(), neu = { data: JSON.stringify(TL.tueren), label: st.label }; nach.push(neu); if (vor) neu.u = bpUndo.push(st.label || 'Türliste geändert', () => tlZurueck(false), 'tl'); else bpUndo.weg(st.u); TL.tueren = JSON.parse(st.data); tlSpeichern(true); tlZeichnen(); histUi();
  toast(`${vor ? 'Wiederholt' : 'Rückgängig'}: ${st.label || 'Änderung'}`);
}
let TLS = LS.get('tl.sort', null);   // Sortierung der Ansicht {k, ab} – Klick auf den Spaltenkopf (aufsteigend → absteigend → aus)
const tlSortWert = (t, k) => { const v = t[k]; if (v == null || v === '') return null; if (typeof v === 'boolean') return v ? 1 : 0;
  const z = String(v).trim().replace(/\s/g, ''); return /^-?\d+([.,]\d+)?$/.test(z) && !['nr', 'raum'].includes(k) ? parseFloat(z.replace(',', '.')) : String(v); };
const tlSicht = () => { const q = TLq.trim().toLowerCase(); const L = TL.tueren.filter((t) => !q || Object.values(t).some((v) => typeof v === 'string' && v.toLowerCase().includes(q)));
  if (!TLS || !TLS.k) return L;
  const k = TLS.k, f = TLS.ab ? -1 : 1;
  return L.map((t, i) => [t, i]).sort(([a, i], [b, j]) => { const x = tlSortWert(a, k), y = tlSortWert(b, k);
    if (x == null || y == null) return x == null && y == null ? i - j : x == null ? 1 : -1;   // leere immer unten
    const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'de', { numeric: true, sensitivity: 'base' });
    return r ? r * f : i - j; }).map(([t]) => t); };
/* Darstellung (⚙ in der Leiste, je Benutzer gemerkt): Ansichten, feste Lage-Spalten, Ausstattung als Marken, Details rechts, große Schrift */
const TLO = Object.assign({ ansichten: true, fest: true, marken: true, details: true, gross: true }, LS.get('tlo', {}));
let TLV = LS.get('tlv', 'uebersicht');
const TAUS = ['aus', 'Ausstattung', 'm', 120, 'Ausstattung'];   // eine Spalte mit Marken statt 20 Ja/Nein-Spalten
const TVIEWS = [
  ['uebersicht', 'Übersicht', ['nr', 'geschoss', 'raum', 'raumname', 'art', 'anzahl', 'flg', 'din', 'b', 'h', 'wand', 'brand', 'schall', 'aus', 'bem']],
  ['masse', 'Maße & Fenster', ['nr', 'geschoss', 'raum', 'typ', 'art', 'anzahl', 'b', 'h', 'wand', 'bruestung', 'oeffnung', 'fb_innen', 'fb_aussen', 'rollo', 'glas']],
  ['ausf', 'Ausführung', ['nr', 'geschoss', 'raum', 'art', 'zarge', 'blatt', 'oberfl', 'farbe', 'glas', 'aus']],
  ['anf', 'Anforderungen & Beschlag', ['nr', 'geschoss', 'raum', 'art', 'brand', 'schall', 'rc', 'klima', 'schloss', 'beschlag', 'aus']],
  ['alle', 'Alle Spalten', null]];
const TFEST = ['nr', 'geschoss', 'raum'];   // bleiben beim Scrollen nach rechts stehen
const tlSpalten = () => {
  const v = TLO.ansichten ? TVIEWS.find((x) => x[0] === TLV) || TVIEWS[0] : TVIEWS[TVIEWS.length - 1];
  let L = v[2] ? v[2].map((k) => (k === 'aus' ? TAUS : TSP.find((c) => c[0] === k))).filter(Boolean) : TSP.filter((c) => !TLzu.has(c[4]) || c[4] === 'Lage');
  if (!v[2] && TLO.marken) { const i = L.findIndex((c) => c[2] === 'b'); L = L.filter((c) => c[2] !== 'b'); if (i >= 0) L.splice(i, 0, TAUS); }
  if (!TLO.marken) L = L.flatMap((c) => (c === TAUS ? TSP.filter((x) => x[2] === 'b') : [c]));
  return L;
};
const TKURZ = { nr: 'Nr.', geschoss: 'Geschoss', raum: 'Raum-Nr.', raumname: 'Raum', zu: 'zu Raum', anzahl: 'Anz.', din: 'DIN', b: 'Breite', h: 'Höhe', wand: 'Wand', bruestung: 'Brüstung', oeffnung: 'Öffnung',
  fb_innen: 'Fensterbank innen', fb_aussen: 'Fensterbank außen', brand: 'Brand', schall: 'Schall', rc: 'RC', klima: 'Klima', farbe: 'Farbe/RAL', oberfl: 'Oberfläche' };
const tlKopf = (c) => (TLO.gross && TKURZ[c[0]]) || c[1];
const TMIN = { art: 150, raumname: 160, bem: 220, zarge: 170, blatt: 150, beschlag: 170, oeffnung: 110, fb_innen: 140, fb_aussen: 140, glas: 130, oberfl: 110, schloss: 70, brand: 80, schall: 70, wand: 66, b: 66, h: 66, bruestung: 76 };
const TLBW = LS.get('tl.bw', {}) || {};   // Spaltenbreiten, am Spaltenkopf gezogen (Doppelklick: Standard)
const tlBreiteStd = (c) => (TLO.gross ? Math.max(Math.round((TMIN[c[0]] || 0) * 0.8), Math.round(c[3] * 1.35), c[2] === 'b' ? 30 : c[2] === 'm' ? 200 : c[2] === 's' ? 80 : 44, Math.min(120, tlKopf(c).length * 7.6 + 14)) : c[3]);
const tlBreite = (c) => TLBW[c[0]] || tlBreiteStd(c);
const tlBox = () => (TLA && TLC ? { r1: Math.min(TLA.r, TLC.r), r2: Math.max(TLA.r, TLC.r), c1: Math.min(TLA.c, TLC.c), c2: Math.max(TLA.c, TLC.c) } : null);
const tlText = (t, c) => { if (c[2] === 'm') return TJA.filter(([k]) => t[k]).map(([, l]) => l).join(', '); const v = t[c[0]]; return c[2] === 'b' ? (v ? '✓' : '') : v == null ? '' : c[0] === 'din' ? String(v).replace(/^DIN /, '') : String(v); };
function tlWert(c, roh) {   // eingegebenen / eingefügten Text in den Feldwert wandeln
  const v = String(roh == null ? '' : roh).trim();
  if (c[2] === 'b') return /^(x|ja|j|1|✓|✔|true|wahr|yes)$/i.test(v) || undefined;
  if (c[0] === 'din') { const m = v.match(/^(?:din\s*)?([lr])$/i); if (m) return 'DIN ' + m[1].toUpperCase(); }
  return v || undefined;
}
function tlSetzen(t, c, roh) {
  if (c[2] === 'm') {   // Marken: „OTS, E-Öffner“ – Bezeichnung oder Kürzel
    const L = String(roh || '').toLowerCase().split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    TJA.forEach(([k, l]) => { if (L.some((x) => x === l.toLowerCase() || x === k || l.toLowerCase().startsWith(x))) t[k] = true; else delete t[k]; });
    return;
  }
  const w = tlWert(c, roh); if (w === undefined || w === false) delete t[c[0]]; else t[c[0]] = w; }
function vTueren(v) {
  if (!pid) { v.innerHTML = '<div class="card empty"><p>Bitte oben ein Projekt wählen.</p></div>'; return; }
  if (!TL || TL.pid !== pid) { v.innerHTML = '<p class="mute">Lade Türliste …</p>'; tlLaden(); return; }
  if (TL.laedt) { v.innerHTML = '<p class="mute">Lade Türliste …</p>'; return; }
  tlDatalists();
  const T = tlSicht(), S = tlSpalten(), B = tlBox();
  const alle = !TLO.ansichten || TLV === 'alle', zu = (g) => alle && TLzu.has(g) && g !== 'Lage';
  const gr = [];
  if (alle) [...new Set(TSP.map((c) => c[4]))].forEach((g) => gr.push([g, S.filter((c) => c[4] === g)]));
  else S.forEach((c) => { const g = gr[gr.length - 1]; if (g && g[0] === c[4]) g[1].push(c); else gr.push([c[4], [c]]); });
  const RN = TLO.gross ? 34 : 26, LEFT = {}; { let acc = RN; S.forEach((c) => { if (TLO.fest && TFEST.includes(c[0])) LEFT[c[0]] = acc; acc += tlBreite(c); }); }
  const FXL = Object.keys(LEFT).pop();   // letzte feste Spalte bekommt den kräftigen Rand
  const stueck = TL.tueren.reduce((s, t) => s + (Math.max(1, parseInt(t.anzahl, 10) || 1)), 0);
  const nZ = B ? B.r2 - B.r1 + 1 : 0;
  const kopf1 = gr.map(([g, cs]) => (zu(g) ? `<th class="g" data-tlg="${esc(g)}" title="${esc(g)} wieder aufklappen" style="width:16px">▸</th>` : `<th class="g" colspan="${cs.length}" data-tlg="${esc(g)}" title="${g === 'Lage' ? '' : 'Klick: Spaltengruppe zuklappen'}">${esc(g)}</th>`)).join('');
  const kopf2 = gr.map(([g, cs]) => (zu(g) ? '<th data-tlg="' + esc(g) + '"></th>' : cs.map((c) => `<th style="width:${tlBreite(c)}px${LEFT[c[0]] != null ? `;left:${LEFT[c[0]]}px` : ''}" class="${LEFT[c[0]] != null ? 'fx' : ''}${c[0] === FXL ? ' fxl' : ''}" title="${esc(c[1])} – Klick sortiert" data-tlk="${S.indexOf(c)}" data-tlsort="${esc(c[0])}"><span class="vt">${esc(tlKopf(c))}${TLS && TLS.k === c[0] && c[2] !== 'm' ? `<b class="tl-sort">${TLS.ab ? '▼' : '▲'}</b>` : ''}</span><i class="tl-rz" data-tlrz="${esc(c[0])}" title="Ziehen: Spaltenbreite · Doppelklick: Standard"></i></th>`).join(''))).join('');
  const zelle = (t, r, c, ci) => { const cl = [c[2] === 'b' ? 'c' : c[2] === 'n' ? 'n' : '']; if (B && r >= B.r1 && r <= B.r2 && ci >= B.c1 && ci <= B.c2) cl.push('m'); if (TLC && TLC.r === r && TLC.c === ci) cl.push('a');
    const x = tlText(t, c), fx = LEFT[c[0]] != null;
    if (fx) cl.push('fx'); if (c[0] === FXL) cl.push('fxl');
    const st = fx ? ` style="left:${LEFT[c[0]]}px"` : '';
    if (c[2] === 'm') return `<td data-r="${r}" data-c="${ci}" class="${cl.join(' ')} tlmk"${x ? ` title="${esc(x)}"` : ''}>${TJA.filter(([k]) => t[k]).map(([, l]) => `<span class="tl-tag">${esc(l)}</span>`).join('')}</td>`;
    return `<td data-r="${r}" data-c="${ci}" class="${cl.join(' ')}"${st}${x.length > 6 ? ` title="${esc(x)}"` : ''}>${esc(x)}</td>`; };
  const zeile = (t, r) => { let ci = 0; return `<tr data-t="${esc(t.id)}" class="${B && r >= B.r1 && r <= B.r2 && B.c1 === 0 && B.c2 === S.length - 1 ? 'rs' : ''}"><td class="rn" data-rn="${r}">${r + 1}<i class="tl-rh" title="Ziehen: Zeilenhöhe (alle Zeilen) · Doppelklick: Standard"></i></td>${gr.map(([g, cs]) => (zu(g) ? '<td class="k"></td>' : cs.map((c) => zelle(t, r, c, ci++)).join(''))).join('')}</tr>`; };
  const LL = TL.listen && TL.listen.length ? TL.listen : [{ id: '1', name: 'Fenster- & Türliste', n: TL.tueren.length }];
  v.innerHTML = `<div class="tl-listen" role="tablist">${LL.map((x) => `<button type="button" role="tab" data-tll="${esc(x.id)}" class="${x.id === TL.liste ? 'on' : ''}" aria-selected="${x.id === TL.liste}">${esc(x.name)} <small>${x.id === TL.liste ? TL.tueren.length : x.n}</small></button>`).join('')}
      <button type="button" class="tl-lplus" data-tl="lneu" title="Weitere Liste anlegen (z. B. je Bauteil oder Stand)">＋ Liste</button><span style="flex:1"></span>
      <button type="button" class="btn sm" data-tl="lname" title="Liste umbenennen">✎ Umbenennen</button><button type="button" class="btn sm danger" data-tl="ldel" title="Liste in den Papierkorb">Liste löschen</button></div>
    <div class="tl-bar">
      <button class="btn sm pri" data-tl="neu" title="Neue Zeile unter der markierten (übernimmt deren Ausführung)">+ Zeile</button><button class="btn sm" data-tl="raeume" title="Für Räume aus dem Raumbuch der Kostenermittlung je eine Tür anlegen">Aus Raumbuch …</button>
      <span class="sep"></span>
      <button class="btn sm" data-tl="dup" ${nZ ? '' : 'disabled'} title="Markierte Zeilen kopieren">Zeilen duplizieren</button><button class="btn sm" data-tl="mehr" ${nZ ? '' : 'disabled'} title="Ein Feld für alle markierten Zeilen setzen">Ändern …</button><button class="btn sm danger" data-tl="del" ${nZ ? '' : 'disabled'}>Zeilen löschen</button>
      <span class="sep"></span>
      <input type="search" id="tlQ" placeholder="Suchen (Nr., Raum, T30 …)" value="${esc(TLq)}">
      <span style="flex:1"></span><span class="hint">${TL.tueren.length} Zeilen · ${stueck} Stück${nZ > 1 ? ` · ${nZ} Zeilen markiert` : ''}</span>
      ${TL.tueren.length ? (() => { const n = window.tlWarnungen ? tlWarnungen() : 0; return `<button class="btn sm${n ? ' warnb' : ''}" data-tl="pruef" title="Plausibilität prüfen: fehlende Angaben, ungewöhnliche Maße, 2. Rettungsweg, Absturzsicherung, Brandschutz …">${n ? `⚠ ${n} prüfen` : '✓ Prüfen'}</button>`; })() : ''}<button class="btn sm" data-tl="opt" title="Darstellung: Ansichten, feste Spalten, Ausstattung als Marken, Details, Schriftgröße" aria-haspopup="dialog">⚙ Darstellung</button><a class="btn sm" href="api/projekt/${pid}/tueren.xlsx?liste=${encodeURIComponent(TL.liste || '1')}" title="Liste als Excel">Excel</a><button class="btn sm pri" data-tl="lv" ${TL.tueren.length ? '' : 'disabled'} title="Gleiche Elemente zu Positionen zusammenfassen und ins LV übernehmen">→ In LV übernehmen …</button></div>
    ${TLO.ansichten && TL.tueren.length ? `<div class="tl-views" role="tablist">${TVIEWS.map(([k, l, ks]) => `<button type="button" role="tab" data-tlv="${k}" class="${k === TLV ? 'on' : ''}" aria-selected="${k === TLV}">${esc(l)}${ks ? ` <small>${ks.length}</small>` : ''}</button>`).join('')}</div>` : ''}
    ${TL.tueren.length ? `<div class="tl-flex"><div class="tl-w" tabindex="0"><table data-sp="-" class="tl${TLO.gross ? ' gross' : ''}" style="width:${RN + gr.reduce((a, [g, cs]) => a + (zu(g) ? 16 : cs.reduce((b, c) => b + tlBreite(c), 0)), 0)}px${LS.get('tl.rh', 0) ? `;--tlrh:${LS.get('tl.rh', 0)}px` : ''}"><colgroup><col style="width:${RN}px">${gr.map(([g, cs]) => (zu(g) ? '<col style="width:16px">' : cs.map((c) => `<col style="width:${tlBreite(c)}px">`).join(''))).join('')}</colgroup>
      <thead><tr><th class="rn g" rowspan="1"></th>${kopf1}</tr><tr><th class="rn" title="Alles markieren" data-tl="alles">⊿</th>${kopf2}</tr></thead>
      <tbody>${T.map(zeile).join('')}</tbody></table></div>${TLO.details ? `<aside class="tl-d" id="tlD">${tlDetails()}</aside>` : ''}</div>
      <p class="hint" style="margin:.5rem 0 0">Wie in Excel: klicken/ziehen markiert (Umschalt erweitert, Zeilennummer markiert ganze Zeilen), Tippen oder Doppelklick schreibt, Entf löscht, Strg+C / Strg+X / Strg+V kopiert und fügt ein – auch aus Excel –, Strg+D füllt nach unten, Strg+Z macht rückgängig. Spaltenbreite am rechten Rand des Spaltenkopfs ziehen, Zeilenhöhe am unteren Rand der Zeilennummer (Doppelklick: Standard). Ja/Nein-Spalten mit Klick oder Leertaste, beim Einfügen gilt x/ja/1 als Ja. Maße in m oder mm.${alle ? ' Gruppenüberschrift anklicken klappt Spalten zu.' : ''}${TLO.marken ? ' Ausstattung: Doppelklick oder Eingabe öffnet die Auswahl.' : ''}</p>`
    : `<div class="card tl-leer"><p>Noch keine Türen oder Fenster in diesem Projekt.</p><p class="hint">Zeilen anlegen, aus Excel einfügen (Strg+V in die erste Zelle) oder für die Räume aus dem Raumbuch übernehmen. Alles lässt sich später als Positionen ins LV übernehmen.</p><button class="btn pri" data-tl="neu">+ Erste Zeile</button> <button class="btn" data-tl="raeume">Aus Raumbuch …</button> <button class="btn" data-tl="einf">Aus Zwischenablage einfügen</button> <button class="btn" data-tl="import">Aus Excel einlesen …</button></div>`}`;
}
/* Details rechts: alle Felder der markierten Zeile(n) – eine Änderung gilt für alle markierten */
function tlAuswahl() { const B = tlBox(), V = tlSicht(); return B ? V.slice(B.r1, B.r2 + 1) : TLC ? [V[TLC.r]].filter(Boolean) : []; }
function tlDetails() {
  const W = tlAuswahl();
  if (!W.length) return '<p class="hint" style="margin:0">Zeile anklicken – hier stehen dann alle ihre Felder. Mehrere Zeilen markieren: Änderungen gelten für alle.</p>';
  const gleich = (k) => { const v = W[0][k]; return W.every((t) => (t[k] ?? '') === (v ?? '')) ? (v ?? '') : null; };
  const kopf = W.length === 1 ? `${esc(W[0].nr || 'ohne Nr.')}${W[0].raumname || W[0].raum ? ' · ' + esc(W[0].raumname || W[0].raum) : ''}` : `${W.length} Zeilen markiert`;
  const gruppen = [...new Set(TSP.filter((c) => c[2] !== 'b').map((c) => c[4]))];
  return `<h4>${kopf}</h4><p class="hint" style="margin:.1rem 0 .6rem">${W.length > 1 ? 'Änderungen gelten für alle markierten Zeilen. Leere Felder: unterschiedliche Werte.' : 'Änderungen gelten sofort.'}</p>`
    + gruppen.map((g) => `<div class="tl-dg">${esc(g)}</div><div class="tl-df">${TSP.filter((c) => c[4] === g && c[2] !== 'b').map((c) => { const v = gleich(c[0]);
      return `<label${c[0] === 'bem' || c[0] === 'raumname' ? ' class="w"' : ''}>${esc(c[1].replace(/ \(m o\. mm\)/, ''))}<input data-tld="${c[0]}" value="${esc(v ?? '')}"${v === null ? ' placeholder="unterschiedlich"' : ''}${TA[c[0]] ? ` list="tl-${c[0]}"` : ''} autocomplete="off"></label>`; }).join('')}</div>`).join('')
    + `<div class="tl-dg">Ausstattung</div><div class="tl-chips">${TJA.map(([k, l]) => { const n = W.filter((t) => t[k]).length; return `<button type="button" data-tlj="${k}" class="${n === W.length ? 'on' : n ? 'halb' : ''}">${esc(l)}</button>`; }).join('')}</div>`;
}
function tlDetailsNeu() { const d = document.getElementById('tlD'); if (d && !d.contains(document.activeElement)) d.innerHTML = tlDetails(); }
function tlMarkenWahl(td) {   // Ausstattung in der Tabelle: Auswahl an der Zelle
  document.querySelectorAll('.tl-pop').forEach((x) => x.remove());
  const W = tlAuswahl(); if (!W.length) return;
  const pop = document.createElement('div'); pop.className = 'tl-pop';
  const zeichnen = () => { pop.innerHTML = `<div class="tl-chips">${TJA.map(([k, l]) => { const n = W.filter((t) => t[k]).length; return `<button type="button" data-tlj="${k}" class="${n === W.length ? 'on' : n ? 'halb' : ''}">${esc(l)}</button>`; }).join('')}</div><div class="hint" style="margin-top:.4rem">${W.length > 1 ? W.length + ' Zeilen · ' : ''}Esc oder Klick daneben schließt</div>`; };
  zeichnen(); document.body.appendChild(pop);
  const r = td.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left)) + 'px'; pop.style.top = Math.min(innerHeight - pop.offsetHeight - 8, r.bottom + 4) + 'px';
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-tlj]'); if (!b) return; tlJa(b.dataset.tlj, W); zeichnen(); });
  setTimeout(() => { const zu = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !pop.contains(e.target)) { pop.remove(); document.removeEventListener('mousedown', zu); document.removeEventListener('keydown', zu); tlZeichnen(); } }; document.addEventListener('mousedown', zu); document.addEventListener('keydown', zu); }, 0);
}
function tlJa(k, W) {   // Ausstattung an/aus für alle gewählten Zeilen (alle an → alle aus)
  const an = !W.every((t) => t[k]); tlMerken(`${(TJA.find((x) => x[0] === k) || [, k])[1]} ${an ? 'an' : 'aus'}`);
  W.forEach((t) => { if (an) t[k] = true; else delete t[k]; }); tlSpeichern();
  const B = tlBox(); if (B) for (let r = B.r1; r <= B.r2; r++) tlSpalten().forEach((c, ci) => { if (c[2] === 'm' || c[0] === k) tlZelleNeu(r, ci); });
}
function tlOptionen(btn) {
  const L = [['ansichten', 'Ansichten (Reiter Übersicht, Maße & Fenster …)'], ['fest', 'Nr., Geschoss und Raum beim Scrollen festhalten'], ['marken', 'Ausstattung als Marken in einer Spalte'], ['details', 'Details der markierten Zeile rechts'], ['gross', 'Große Schrift und Zeilen']];
  modalBox(`<h3>Darstellung der Türliste</h3><div style="display:flex;flex-direction:column;gap:.5rem;margin:.4rem 0 1rem">${L.map(([k, l]) => `<label class="chk"><input type="checkbox" data-tlo="${k}"${TLO[k] ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div><p class="hint">Gilt nur für dich, wird gemerkt.</p><div class="acts"><button class="btn pri" data-m="x">Fertig</button></div>`, (m, bg, close) => close())
    .addEventListener('change', (e) => { const k = e.target.dataset.tlo; if (!k) return; TLO[k] = e.target.checked; LS.set('tlo', TLO); TLA = TLC = null; tlZeichnen(); });
  void btn;
}
function tlNaechsteNr(nr) { const m = String(nr || '').match(/^(.*?)(\d+)(\D*)$/); if (!m) return ''; return m[1] + String(+m[2] + 1).padStart(m[2].length, '0') + m[3]; }
function tlZeichnen() {
  const w = $('.tl-w'), sl = w ? w.scrollLeft : 0, stp = w ? w.scrollTop : 0, fokus = w && document.activeElement === w;
  render(); const w2 = $('.tl-w'); if (w2) { w2.scrollLeft = sl; w2.scrollTop = stp; if (fokus || TLC) w2.focus({ preventScroll: true }); }
}
function tlMarkieren() {   // nur Klassen setzen (schnell, ohne neu zu zeichnen)
  const B = tlBox(), S = tlSpalten();
  document.querySelectorAll('table.tl td[data-r]').forEach((td) => { const r = +td.dataset.r, c = +td.dataset.c;
    td.classList.toggle('m', !!B && r >= B.r1 && r <= B.r2 && c >= B.c1 && c <= B.c2); td.classList.toggle('a', !!TLC && TLC.r === r && TLC.c === c); });
  document.querySelectorAll('table.tl tbody tr').forEach((tr, r) => tr.classList.toggle('rs', !!B && r >= B.r1 && r <= B.r2 && B.c1 === 0 && B.c2 === S.length - 1));
  tlDetailsNeu();
  const n = B ? B.r2 - B.r1 + 1 : 0; ['dup', 'mehr', 'del'].forEach((k) => { const b = document.querySelector(`[data-tl="${k}"]`); if (b) b.disabled = !n; });
  const td = TLC && document.querySelector(`table.tl td[data-r="${TLC.r}"][data-c="${TLC.c}"]`); if (td) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function tlGehe(r, c, erweitern) {
  const T = tlSicht(), S = tlSpalten(); r = Math.max(0, Math.min(T.length - 1, r)); c = Math.max(0, Math.min(S.length - 1, c));
  TLC = { r, c }; if (!erweitern || !TLA) TLA = { r, c }; tlMarkieren();
}
function tlBearbeiten(start) {   // Zelle bearbeiten (Eingabefeld über der Zelle)
  if (!TLC) return; const T = tlSicht(), S = tlSpalten(), t = T[TLC.r], c = S[TLC.c]; if (!t || !c) return;
  if (c[2] === 'm') { const td = document.querySelector(`table.tl td[data-r="${TLC.r}"][data-c="${TLC.c}"]`); if (td) tlMarkenWahl(td); return; }
  if (c[2] === 'b') { tlMerken(`${c[1]} umgeschaltet`); tlSetzen(t, c, t[c[0]] ? '' : 'x'); tlSpeichern(); tlZelleNeu(TLC.r, TLC.c); return; }
  const td = document.querySelector(`table.tl td[data-r="${TLC.r}"][data-c="${TLC.c}"]`); if (!td) return;
  const inp = document.createElement('input'); inp.className = 'ed'; inp.value = start != null ? start : (t[c[0]] || '');
  if (TA[c[0]]) inp.setAttribute('list', 'tl-' + c[0]);
  inp.style.width = Math.max(td.offsetWidth, c[2] === 's' || c[0] === 'bem' || c[0] === 'raumname' ? 190 : 90) + 'px';
  td.appendChild(inp); inp.focus(); if (start == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
  tlEd = { inp, r: TLC.r, c: TLC.c, t, sp: c, alt: t[c[0]] || '' };
}
function tlEdFertig(ok, weiter) {
  const e = tlEd; if (!e) return; tlEd = null;
  if (ok && e.inp.value !== e.alt) { tlMerken(`${e.sp[1]} geändert`); tlSetzen(e.t, e.sp, e.inp.value); tlSpeichern(); }
  e.inp.remove(); tlZelleNeu(e.r, e.c); const w = $('.tl-w'); if (w) w.focus({ preventScroll: true });
  if (weiter === 'unten') { if (e.r === tlSicht().length - 1) tlAktion('neu'); else tlGehe(e.r + 1, e.c); }
  else if (weiter === 'rechts') tlGehe(e.r, e.c + 1); else if (weiter === 'links') tlGehe(e.r, e.c - 1);
}
function tlZelleNeu(r, ci) { const td = document.querySelector(`table.tl td[data-r="${r}"][data-c="${ci}"]`), t = tlSicht()[r], c = tlSpalten()[ci]; if (td && t && c) { const x = tlText(t, c); td.textContent = x; td.title = x.length > 6 ? x : ''; } }
function tlKopieren(ausschneiden) {
  const B = tlBox(); if (!B) return ''; const T = tlSicht(), S = tlSpalten();
  const tsv = T.slice(B.r1, B.r2 + 1).map((t) => S.slice(B.c1, B.c2 + 1).map((c) => (c[2] === 'b' ? (t[c[0]] ? 'x' : '') : String(t[c[0]] || '').replace(/[\t\n]/g, ' '))).join('\t')).join('\r\n');
  if (ausschneiden) tlLeeren();
  return tsv;
}
function tlLeeren() {
  const B = tlBox(); if (!B) return; const T = tlSicht(), S = tlSpalten(); tlMerken('Zellen geleert');
  T.slice(B.r1, B.r2 + 1).forEach((t) => S.slice(B.c1, B.c2 + 1).forEach((c) => { delete t[c[0]]; })); tlSpeichern(); tlZeichnen();
}
function tlEinfuegen(text) {
  if (!text) return; const zeilen = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((z) => z.split('\t'));
  if (!TL.tueren.length) { TLA = TLC = { r: 0, c: 0 }; }
  if (!TLC) return toast('Erst eine Zelle anklicken, dann einfügen.', true);
  const S = tlSpalten(); let T = tlSicht(); tlMerken('Eingefügt');
  const B = tlBox(), einzeln = zeilen.length === 1 && zeilen[0].length === 1;
  if (einzeln && B) { T.slice(B.r1, B.r2 + 1).forEach((t) => S.slice(B.c1, B.c2 + 1).forEach((c) => tlSetzen(t, c, zeilen[0][0]))); tlSpeichern(true); tlZeichnen(); return; }
  const r0 = B ? B.r1 : TLC.r, c0 = B ? B.c1 : TLC.c;
  zeilen.forEach((z, i) => {
    let t = T[r0 + i];
    if (!t) { t = { id: uid() }; TL.tueren.push(t); T = tlSicht(); if (!T.includes(t)) { TLq = ''; T = tlSicht(); } }
    z.forEach((v, j) => { const c = S[c0 + j]; if (c) tlSetzen(t, c, v); });
  });
  TLA = { r: r0, c: c0 }; TLC = { r: r0 + zeilen.length - 1, c: Math.min(S.length - 1, c0 + Math.max(...zeilen.map((z) => z.length)) - 1) };
  tlSpeichern(true); tlZeichnen(); toast(`${zeilen.length} Zeile${zeilen.length > 1 ? 'n' : ''} eingefügt.`);
}
function tlFuellen() {   // Strg+D: oberste Zeile der Markierung nach unten
  const B = tlBox(); if (!B || B.r2 === B.r1) return; const T = tlSicht(), S = tlSpalten(); tlMerken('Nach unten ausgefüllt');
  T.slice(B.r1 + 1, B.r2 + 1).forEach((t) => S.slice(B.c1, B.c2 + 1).forEach((c) => { if (T[B.r1][c[0]] == null) delete t[c[0]]; else t[c[0]] = T[B.r1][c[0]]; }));
  tlSpeichern(true); tlZeichnen();
}
$('#tlBtn').addEventListener('click', async () => { await flush(); tab = 'tueren'; LS.set('tab', tab); render(); });
document.addEventListener('input', (e) => {
  const el = e.target; if (tab !== 'tueren' || !TL || el.id !== 'tlQ') return;
  TLq = el.value; TLA = TLC = null; const p = el.selectionStart; tlZeichnen(); const q = $('#tlQ'); q.focus(); q.setSelectionRange(p, p);
});
/* Spaltenbreite und Zeilenhöhe der Türliste ziehen (wie in Excel) */
let tlRzKlick = 0;
document.addEventListener('mousedown', (e) => {
  const rz = e.target.closest && e.target.closest('.tl-rz, .tl-rh'); if (!rz || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation(); rz.classList.add('on'); document.body.classList.add('tl-ziehen');
  const tab_ = rz.closest('table.tl'), x0 = e.clientX, y0 = e.clientY;
  if (rz.classList.contains('tl-rz')) {
    const th = rz.closest('th'), i = [...th.parentElement.children].indexOf(th), col = tab_.querySelectorAll('colgroup col')[i], w0 = th.getBoundingClientRect().width, tw0 = tab_.getBoundingClientRect().width;
    let w = w0, raf = 0;
    const mv = (ev) => { w = Math.max(24, Math.min(600, Math.round(w0 + ev.clientX - x0)));   // Tabelle wächst mit – die anderen Spalten bleiben stehen
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; tab_.style.width = (tw0 + w - w0) + 'px'; th.style.width = w + 'px'; if (col) col.style.width = w + 'px'; }); };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('tl-ziehen'); tlRzKlick = Date.now();
      if (Math.abs(w - w0) > 2) { TLBW[rz.dataset.tlrz] = w; LS.set('tl.bw', TLBW); tlZeichnen(); } else rz.classList.remove('on'); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  } else {
    const td = rz.closest('td'), h0 = td.getBoundingClientRect().height;
    let h = h0;
    const mv = (ev) => { h = Math.max(18, Math.min(120, Math.round(h0 + ev.clientY - y0))); tab_.style.setProperty('--tlrh', h + 'px'); };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.body.classList.remove('tl-ziehen'); rz.classList.remove('on'); tlRzKlick = Date.now();
      if (Math.abs(h - h0) > 1) LS.set('tl.rh', h); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  }
}, true);
document.addEventListener('click', (e) => { if (Date.now() - tlRzKlick < 250 || (e.target.closest && e.target.closest('.tl-rz, .tl-rh'))) { e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener('dblclick', (e) => {
  const rz = e.target.closest && e.target.closest('.tl-rz, .tl-rh'); if (!rz) return;
  e.stopPropagation(); e.preventDefault();
  if (rz.classList.contains('tl-rz')) { delete TLBW[rz.dataset.tlrz]; LS.set('tl.bw', TLBW); } else LS.set('tl.rh', 0);
  tlZeichnen();
}, true);
document.addEventListener('mousedown', (e) => {
  if (tab !== 'tueren' || !TL || e.button !== 0) return;
  const td = e.target.closest && e.target.closest('table.tl td[data-r]'), rn = e.target.closest && e.target.closest('table.tl td[data-rn]');
  if (tlEd && !(e.target === tlEd.inp)) tlEdFertig(true);
  if (rn) { e.preventDefault(); const r = +rn.dataset.rn, S = tlSpalten(); if (e.shiftKey && TLA) { TLC = { r, c: S.length - 1 }; TLA = { r: TLA.r, c: 0 }; } else { TLA = { r, c: 0 }; TLC = { r, c: S.length - 1 }; } tlZiehen = 'zeile'; tlMarkieren(); $('.tl-w').focus({ preventScroll: true }); return; }
  if (!td || e.target.classList.contains('ed')) return;
  e.preventDefault(); $('.tl-w').focus({ preventScroll: true });
  const r = +td.dataset.r, c = +td.dataset.c, war = TLC && TLC.r === r && TLC.c === c && TLA && TLA.r === r && TLA.c === c;
  tlGehe(r, c, e.shiftKey); tlZiehen = { r, c, bool: td.classList.contains('c') && !e.shiftKey, war };
});
document.addEventListener('mouseover', (e) => {
  if (!tlZiehen || tab !== 'tueren') return;
  if (tlZiehen === 'zeile') { const rn = e.target.closest && e.target.closest('table.tl td[data-rn], table.tl td[data-r]'); if (rn) { TLC = { r: +(rn.dataset.rn || rn.dataset.r), c: tlSpalten().length - 1 }; tlMarkieren(); } return; }
  const td = e.target.closest && e.target.closest('table.tl td[data-r]'); if (!td) return;
  const r = +td.dataset.r, c = +td.dataset.c; if (r === tlZiehen.r && c === tlZiehen.c) return;
  tlZiehen.bool = false; TLC = { r, c }; tlMarkieren();
});
document.addEventListener('mouseup', (e) => {
  const z = tlZiehen; tlZiehen = false; if (!z || z === 'zeile' || tab !== 'tueren') return;
  const td = e.target.closest && e.target.closest('table.tl td[data-r]');
  if (z.bool && td && +td.dataset.r === z.r && +td.dataset.c === z.c) tlBearbeiten();   // Ja/Nein: ein Klick schaltet um
});
document.addEventListener('dblclick', (e) => { if (tab !== 'tueren' || !TL) return; const td = e.target.closest && e.target.closest('table.tl td[data-r]'); if (td && !td.classList.contains('c')) tlBearbeiten(); });
document.addEventListener('keydown', (e) => {
  if (tab !== 'tueren' || !TL) return;
  if (tlEd && e.target === tlEd.inp) {
    if (e.key === 'Enter') { e.preventDefault(); tlEdFertig(true, 'unten'); } else if (e.key === 'Tab') { e.preventDefault(); tlEdFertig(true, e.shiftKey ? 'links' : 'rechts'); } else if (e.key === 'Escape') { e.preventDefault(); tlEdFertig(false); }
    return;
  }
  if (!e.target.classList || !e.target.classList.contains('tl-w')) return;
  const k = e.key, strg = e.ctrlKey || e.metaKey;
  if (strg && (k === 'a' || k === 'A')) { e.preventDefault(); TLA = { r: 0, c: 0 }; TLC = { r: tlSicht().length - 1, c: tlSpalten().length - 1 }; return tlMarkieren(); }
  if (strg && (k === 'd' || k === 'D')) { e.preventDefault(); return tlFuellen(); }
  if (!TLC) { if (k.startsWith('Arrow')) { e.preventDefault(); tlGehe(0, 0); } return; }
  const mv = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }[k];
  if (mv) { e.preventDefault(); return tlGehe(TLC.r + mv[0], TLC.c + mv[1], e.shiftKey); }
  if (k === 'Tab') { e.preventDefault(); return tlGehe(TLC.r, TLC.c + (e.shiftKey ? -1 : 1)); }
  if (k === 'Enter') { e.preventDefault(); return e.shiftKey ? tlGehe(TLC.r - 1, TLC.c) : tlGehe(TLC.r + 1, TLC.c); }
  if (k === 'F2') { e.preventDefault(); return tlBearbeiten(); }
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return tlLeeren(); }
  if (k === ' ' && tlSpalten()[TLC.c][2] === 'b') { e.preventDefault(); const B = tlBox(), T = tlSicht(), S = tlSpalten(); tlMerken(); const an = !T[TLC.r][S[TLC.c][0]];
    T.slice(B.r1, B.r2 + 1).forEach((t) => S.slice(B.c1, B.c2 + 1).forEach((c) => { if (c[2] === 'b') tlSetzen(t, c, an ? 'x' : ''); })); tlSpeichern(); tlZeichnen(); return; }
  if (k.length === 1 && !strg && !e.altKey) { e.preventDefault(); TLA = { ...TLC }; tlMarkieren(); tlBearbeiten(k); }
});
document.addEventListener('copy', (e) => { if (tab === 'tueren' && TL && e.target.classList && e.target.classList.contains('tl-w')) { const x = tlKopieren(false); if (x) { e.preventDefault(); e.clipboardData.setData('text/plain', x); } } });
document.addEventListener('cut', (e) => { if (tab === 'tueren' && TL && e.target.classList && e.target.classList.contains('tl-w')) { const x = tlKopieren(true); if (x) { e.preventDefault(); e.clipboardData.setData('text/plain', x); } } });
document.addEventListener('paste', (e) => {
  if (tab !== 'tueren' || !TL || tlEd) return;
  if (!(e.target.classList && e.target.classList.contains('tl-w')) && !(TL.tueren.length === 0 && e.target === document.body)) return;
  e.preventDefault(); tlEinfuegen(e.clipboardData.getData('text/plain'));
});
document.addEventListener('click', (e) => {
  if (tab !== 'tueren' || !TL) return;
  const ll = e.target.closest('[data-tll]'); if (ll) { if (ll.dataset.tll !== TL.liste) { (async () => { if (tlT) { clearTimeout(tlT); await tlJetzt(); } TLq = ''; tlLaden(ll.dataset.tll); })(); } return; }
  const lb = e.target.closest('[data-tl="lneu"],[data-tl="lname"],[data-tl="ldel"]'); if (lb) { ({ lneu: tlListeNeu, lname: tlListeUmbenennen, ldel: tlListeLoeschen })[lb.dataset.tl](); return; }
  const so = e.target.closest('th[data-tlsort]'); if (so && !e.target.closest('.tl-rz')) { const k = so.dataset.tlsort; if (k === 'aus' || k === 'ausstattung') return;
    TLS = !TLS || TLS.k !== k ? { k, ab: false } : !TLS.ab ? { k, ab: true } : null; LS.set('tl.sort', TLS); TLA = TLC = null; tlZeichnen(); return; }
  const g = e.target.closest('[data-tlg]'); if (g && g.dataset.tlg !== 'Lage') { const n = g.dataset.tlg; if (TLzu.has(n)) TLzu.delete(n); else TLzu.add(n); LS.set('tlzu', [...TLzu]); TLA = TLC = null; tlZeichnen(); return; }
  const v = e.target.closest('[data-tlv]'); if (v) { TLV = v.dataset.tlv; LS.set('tlv', TLV); TLA = TLC = null; tlZeichnen(); return; }
  const j = e.target.closest('#tlD [data-tlj]'); if (j) { tlJa(j.dataset.tlj, tlAuswahl()); const d = $('#tlD'); if (d) d.innerHTML = tlDetails(); return; }
  if (e.target.closest('#tlD')) return;
  const b = e.target.closest('[data-tl]'); if (b) tlAktion(b.dataset.tl);
});
document.addEventListener('change', (e) => {   // Details rechts: Feld für alle markierten Zeilen setzen
  const el = e.target.closest && e.target.closest('#tlD [data-tld]'); if (!el || tab !== 'tueren' || !TL) return;
  const c = TSP.find((x) => x[0] === el.dataset.tld), W = tlAuswahl(); if (!c || !W.length) return;
  if (el.value === '' && el.placeholder === 'unterschiedlich') return;   // nichts eingetragen: unterschiedliche Werte bleiben
  tlMerken(`${c[1]} geändert`); W.forEach((t) => tlSetzen(t, c, el.value)); tlSpeichern();
  const B = tlBox(), S = tlSpalten(), ci = S.indexOf(c); if (B && ci >= 0) for (let r = B.r1; r <= B.r2; r++) tlZelleNeu(r, ci); else if (TLC && ci >= 0) tlZelleNeu(TLC.r, ci);
});
async function tlAktion(a) {
  if (a === 'opt') { tlOptionen(); return; }
  const T = TL.tueren, V = tlSicht(), B = tlBox(), sel = B ? V.slice(B.r1, B.r2 + 1) : [];
  if (a === 'neu') {   // neue Zeile unter der markierten: Ausführung übernehmen, Nr. hochzählen, Raum leer
    const ref = TLC ? V[B.r2] : T[T.length - 1];
    const t = ref ? { ...ref, id: uid(), nr: tlNaechsteNr(ref.nr), raum: '', raumname: '', zu: '', bem: '' } : { id: uid() };
    Object.keys(t).forEach((k) => { if (t[k] === '') delete t[k]; });
    tlMerken(); T.splice(ref ? T.indexOf(ref) + 1 : T.length, 0, t); TLq = ''; tlSpeichern(true);
    const r = tlSicht().indexOf(t); TLA = TLC = { r, c: 0 }; tlZeichnen(); return;
  }
  if (a === 'alles') { TLA = { r: 0, c: 0 }; TLC = { r: V.length - 1, c: tlSpalten().length - 1 }; return tlMarkieren(); }
  if (a === 'undo' || a === 'redo') return tlZurueck(a === 'redo');
  if (a === 'einf') { try { const x = await navigator.clipboard.readText(); tlEinfuegen(x); } catch { toast('Bitte mit Strg+V einfügen.', true); } return; }
  if (a === 'dup') { tlMerken(); sel.forEach((t) => T.splice(T.indexOf(sel[sel.length - 1]) + 1 + sel.indexOf(t), 0, { ...t, id: uid() })); TLA = { r: B.r2 + 1, c: 0 }; TLC = { r: B.r2 + sel.length, c: tlSpalten().length - 1 }; tlSpeichern(true); tlZeichnen(); return; }
  if (a === 'del') { tlMerken(); const weg = new Set(sel.map((t) => t.id)); TL.tueren = T.filter((t) => !weg.has(t.id)); TLA = TLC = null; tlSpeichern(true); tlZeichnen(); toast(`${weg.size} Zeile${weg.size > 1 ? 'n' : ''} gelöscht – Strg+Z holt sie zurück.`); return; }
  if (a === 'mehr') return tlMehrfach(sel);
  if (a === 'raeume') return tlRaeume();
  if (a === 'import') return window.tlImport && tlImport();
  if (a === 'pruef') return window.tlPruefDialog && tlPruefDialog();
  if (a === 'lv') return tlInsLv(sel.length > 1 ? sel : []);
}
function tlMehrfach(sel) {
  const F = TSP.filter((c) => !['nr', 'raum', 'raumname'].includes(c[0]));
  const feld = (k) => { const c = TSP.find((x) => x[0] === k);
    if (c[2] === 'b') return '<select id="tmV"><option value="x">Ja</option><option value="">Nein</option></select>';
    return `<input id="tmV"${TA[k] ? ` list="tl-${k}"` : ''} placeholder="leer lassen zum Löschen">`; };
  const bg = modalBox(`<h3>${sel.length} Zeilen ändern</h3><label class="dz-l">Feld<select id="tmF">${F.map((c) => `<option value="${c[0]}">${esc(c[4] ? c[4] + ': ' : '')}${esc(c[1])}</option>`).join('')}</select></label>
    <label class="dz-l" style="margin-top:.6rem">Neuer Wert<span id="tmW">${feld(F[0][0])}</span></label>
    <div class="acts" style="margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Für alle setzen</button></div>`, (m, bg2, close) => {
    if (m === 'x') return close();
    const c = TSP.find((x) => x[0] === $('#tmF').value), v = $('#tmV').value; tlMerken();
    sel.forEach((t) => tlSetzen(t, c, v)); close(); tlSpeichern(true); tlZeichnen();
  });
  bg.querySelector('#tmF').addEventListener('change', (e) => { bg.querySelector('#tmW').innerHTML = feld(e.target.value); });
}
async function tlRaeume() {
  let r; try { r = await api(`api/projekt/${pid}/raeume`); } catch (e) { return toast(e.message, true); }
  if (!r.raeume.length) return toast(r.bk ? 'Im Raumbuch der Kostenermittlung stehen noch keine Räume.' : 'Für dieses Projekt gibt es noch keine Kostenermittlung mit Raumbuch.', true);
  const hat = new Set(TL.tueren.map((t) => t.raum).filter(Boolean));
  modalBox(`<h3>Türen aus dem Raumbuch</h3><p class="hint">Raumbuch „${esc(r.bk.name)}“. Für jeden gewählten Raum wird eine Tür angelegt (Nr. = Raumnummer). Räume, die schon eine Tür haben, sind abgewählt.</p>
    <label class="dz-c"><input type="checkbox" id="trAlle"> alle</label>
    <div class="tl-vs">${r.raeume.map((x, i) => `<label class="dz-c"><input type="checkbox" data-ri="${i}" ${hat.has(x.nr) ? '' : 'checked'}> ${esc(x.nr)} ${esc(x.name)}</label><span class="hint">${esc(x.geschoss)}</span>`).join('')}</div>
    <div class="acts" style="margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Türen anlegen</button></div>`, (m, bg, close) => {
    if (m === 'x') return close();
    const neu = [...bg.querySelectorAll('[data-ri]:checked')].map((c) => { const x = r.raeume[+c.dataset.ri];
      const t = { id: uid(), nr: x.nr, raum: x.nr, raumname: x.name, geschoss: x.geschoss, art: 'Innentür', flg: '1-flg.' };
      Object.keys(t).forEach((k) => { if (!t[k]) delete t[k]; }); return t; });
    tlMerken(); TL.tueren.push(...neu); close(); tlSpeichern(true); tlZeichnen(); toast(`${neu.length} Türen angelegt.`);
  }).querySelector('#trAlle').addEventListener('change', (e) => { e.target.closest('.modal').querySelectorAll('[data-ri]').forEach((c) => { c.checked = e.target.checked; }); });
}
async function tlInsLv(sel) {
  const auswahl = sel.length ? sel : TL.tueren, lvs = LIST.filter((x) => !x.archived);
  if (tlT) { clearTimeout(tlT); await tlJetzt(); }
  const verk = await api(`api/projekt/${pid}/tueren/lv?liste=${encodeURIComponent(TL.liste || '1')}${vSicht() ? '&version_id=' + vSicht() : ''}`).catch(() => []);   // LVs mit Positionen aus dieser Liste
  const lvName = (id) => { const x = lvs.find((y) => y.id === id); return x ? `LV ${x.nr} ${x.name}` : 'LV'; };
  const bg = modalBox(`<h3>Ins LV übernehmen</h3>
    <p>„${esc(tlName())}“: ${auswahl.length} Zeile${auswahl.length > 1 ? 'n' : ''}${sel.length ? ' (markiert)' : ''}. Gleiche Ausführung wird zu einer Position zusammengefasst, die Stückzahl ist die Menge.</p>
    <label class="dz-l">Ziel<select id="tlZiel">${verk.filter((v) => lvs.some((x) => x.id === v.lv)).map((v, i) => `<option value="akt:${v.lv}"${i === 0 ? ' selected' : ''}>${esc(lvName(v.lv))} aktualisieren (${v.positionen} Positionen aus dieser Liste)</option>`).join('')}
      <option value="">Neues LV „Fenster und Türen“ anlegen</option>${lvs.map((x) => `<option value="${x.id}"${!verk.length && L && L.id === x.id ? ' selected' : ''}>an LV ${esc(x.nr)} ${esc(x.name)} anhängen</option>`).join('')}</select></label>
    <p class="hint" id="tlAktH" hidden style="margin:.4rem 0 0">Aktualisieren nimmt die ganze Liste: geänderte Stückzahlen und Texte werden angepasst, neue Ausführungen kommen dazu, weggefallene bekommen Menge 0. OZ, Preise und Vergabe bleiben.</p>
    <label class="dz-l" style="margin-top:.6rem">Textform<select id="tlForm"><option value="merkmale">Systembeschreibung je Titel + Positionen „… gemäß vorangegangener Systembeschreibung“ mit Einbauposition, Raum, Typ, Maße … (wie bisher)</option><option value="lang">ausführlicher Langtext je Position</option></select></label>
    <label class="dz-c" style="margin-top:.6rem"><input type="checkbox" id="tlDin" checked> links und rechts angeschlagene getrennt (eigene Positionen)</label>
    <label class="dz-l" style="margin-top:.6rem">Obertitel (leer = Titel Fenster / Außentüren / Innentüren direkt)<input id="tlTitel" value=""></label>
    <div class="acts" style="margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`, async (m, bg2, close, btn) => {
    if (m === 'x') return close();
    btn.disabled = true;
    try {
      if (tlT) { clearTimeout(tlT); await tlJetzt(); }
      const z = $('#tlZiel').value, akt = z.startsWith('akt:');
      const r = await api(`api/projekt/${pid}/tueren/lv`, 'POST', { version_id: vSicht() || undefined, liste: TL.liste || '1', ids: sel.map((t) => t.id), lv: z ? +(akt ? z.slice(4) : z) : null, aktualisieren: akt,
        titel: $('#tlTitel').value, form: $('#tlForm').value, din_trennen: $('#tlDin').checked, name: tlName() === 'Fenster- & Türliste' ? 'Fenster und Türen' : tlName() });
      close(); await refreshList(); await openLv(r.lv); tab = 'lv'; LS.set('tab', tab); render();
      const A = r.abgleich;
      toast(A ? `LV aktualisiert: ${A.angepasst} Position${A.angepasst === 1 ? '' : 'en'} angepasst, ${A.neu} neu${A.null ? `, ${A.null} auf Menge 0 (nicht mehr in der Liste)` : ''}${A.gleich ? `, ${A.gleich} unverändert` : ''}. ↶ macht es rückgängig.`
        : `${r.tueren} Zeile${r.tueren > 1 ? 'n' : ''} → ${r.positionen} Position${r.positionen > 1 ? 'en' : ''} übernommen. Systembeschreibung und Preise jetzt im LV ergänzen.`);
    } catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  const zs = bg.querySelector('#tlZiel'), zh = () => { bg.querySelector('#tlAktH').hidden = !zs.value.startsWith('akt:'); }; zs.addEventListener('change', zh); zh();
  return bg;
}
