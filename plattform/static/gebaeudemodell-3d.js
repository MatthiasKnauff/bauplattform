'use strict';
/* Gebäudemodell – Seite „Bauteile“ mit großem 3D (GO 20.11.2026, Mock „Gebäudemodell – neue Seite Bauteile“, A–F in den Einstellungen der App).
   Mitte: das Modell (bp/ansicht3d.js) – Befehlsleiste „Ansicht“ schaltet auf die Tabelle der Bauteile (bp/bauteile.js) um; die Tabelle kommt von
   selbst, solange ein Planstand als Entwurf offen ist oder es noch nichts zu zeigen gibt. Rechts (seite.js): „Bauteil“ = Details der gewählten
   Zeile und darunter die Liste – jedes Bauteil einzeln (E1 nach der Färbung, E2 Gebäudeteil › Geschoss › Art); „Änderungen“ mit Zeitschieber:
   das Gebäude wird grau, alles, was seit dem gewählten Tag geändert wurde, in Farbe (A was zählt, B Farbe je App/Alter/Person, C Zurücknehmen).
   Färbungen: Gebäudeteil, Bauteilart, Außen/innen, Himmelsrichtung, Gleiche Bauteile (= Zeile mit gleichem Aufbau), U-Wert, Material
   (D1 Hauptschicht, D2 aus der Liste wählen), Änderungen; dazu Maßnahmen und Farben des Modells aus dem Baustein.
   Seit 20.11.2026 (Mock „Gebäudemodell schlank“): eine 3D-Ansicht – ohne Plan der Baukasten (bp/gebaeudekasten.js, Angaben unter „Bauteil“, Korb als
   Reiter), mit Plan das Modell aus dem Plan; dazu Grundriss (gebaeudemodell-grundriss.js); mehrere Bauteile (Strg, Rahmen, Haken) gemeinsam ändern.
   Nutzt aus gebaeudemodell.js: PID, BT, WORK, V, LS, baustein, leiste, tabsHtml. Kern: bpcore/modell_aenderung.py. */
const G3 = { N: null, D3: null, zu: new Map(), E: null, AE: [], tage: 0, mat: '', uw: {}, sel: null, mitte: null, offen: new Set() };
const G3PAL = ['#6e8fb5', '#e3a23b', '#7fb58a', '#c2694b', '#a58bb5', '#d9c15a', '#5fb0b0', '#d98aa0', '#8d99a6', '#b08a5e', '#9bbf5a', '#c7a3d6'];
const G3ART = { w: 'Wand', f: 'Fenster', d: 'Tür', s: 'Decke / Platte', r: 'Dach', x: 'Sonstiges', o: 'Öffnung' };
const G3ARTF = { w: '#d8c4a1', f: '#7db5da', d: '#8a6a4f', s: '#9fa9b3', r: '#c2694b', x: '#c8c8c8', o: '#a8cde8' };
const G3APP = { waermeschutz: ['Wärmeschutz', '#d9534f'], baukosten: ['Kosten', '#e3a23b'], gebaeudemodell: ['Gebäudemodell', '#1f6fb2'], ava: ['Ausschreibung', '#2b8a3e'], gantt: ['Bauzeitenplan', '#a58bb5'], bauantrag: ['Bauantrag', '#5fb0b0'] };
const G3MATW = [['kalksand', 'Kalksandstein'], ['stahlbeton', 'Stahlbeton'], ['beton', 'Beton'], ['mauer', 'Mauerwerk'], ['ziegel', 'Ziegel'], ['poroton', 'Ziegel'], ['porenbeton', 'Porenbeton'],
  ['holz', 'Holz'], ['sparren', 'Holz'], ['osb', 'Holz'], ['dämm', 'Dämmung'], ['daemm', 'Dämmung'], ['wdvs', 'Dämmung'], ['mineral', 'Dämmung'], ['eps', 'Dämmung'], ['xps', 'Dämmung'], ['pir', 'Dämmung'],
  ['glas', 'Glas'], ['gips', 'Gipskarton'], ['trocken', 'Gipskarton'], ['estrich', 'Estrich'], ['putz', 'Putz'], ['fliese', 'Fliesen'], ['ziegeldeck', 'Dachziegel'], ['dachstein', 'Dachziegel']];
const G3MATF = { Kalksandstein: '#e7dcc4', Stahlbeton: '#7f8c99', Beton: '#8d99a6', Mauerwerk: '#c2694b', Ziegel: '#b5523b', Porenbeton: '#e6e1d6', Holz: '#b08a5e', Dämmung: '#e9d36a',
  Glas: '#7db5da', Gipskarton: '#d9d4ec', Estrich: '#b9b6ad', Putz: '#efe9dc', Fliesen: '#9bbfc7', Dachziegel: '#a94d36' };
const HR3 = { N: 'Nord', O: 'Ost', S: 'Süd', W: 'West' }, HR3F = { Nord: '#4a78b8', Ost: '#7fb58a', Süd: '#e3a23b', West: '#c2694b' };

const g3Zeile = (e) => { const x = G3.zu.get(e.i); return x ? x.z : null; };
const g3Nr = (e) => { const x = G3.zu.get(e.i); return x ? x.nr : ''; };
const g3Name = (e) => { const z = g3Zeile(e); return z ? z.name : (G3ART[e.t] || 'Bauteil') + ' aus dem Plan'; };
const g3Gesch = (e) => ((G3.N && G3.N.geschosse[e.g]) || {}).n || 'Geschoss ' + ((e.g || 0) + 1);
const g3Matname = (t) => { const x = String(t || '').toLowerCase(); const m = G3MATW.find(([w]) => x.includes(w)); return m ? m[1] : ''; };
function g3Mats(z) {   // Materialien einer Zeile: [Hauptschicht, alle] – aus den Schichten des Plans, sonst aus dem Aufbau
  if (!z) return ['', []];
  const L = (z.lagen || []).filter((l) => l[0]);
  if (L.length) { const A = [...new Set(L.map((l) => g3Matname(l[0])).filter(Boolean))], h = L.reduce((a, b) => ((b[1] || 0) > (a[1] || 0) ? b : a)); return [g3Matname(h[0]) || A[0] || '', A]; }
  const t = g3Matname(z.kurz || z.material || z.name); return [t, t ? [t] : []];
}
const g3Hr = (z) => { const R = (z && z.richtung) || {}, k = Object.keys(R).sort((a, b) => R[b] - R[a])[0]; return k ? HR3[k] : ''; };
const g3Z2 = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
const g3Farbe = (k) => G3PAL[Math.abs([...String(k)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % G3PAL.length];

/* Änderungen: was zählt (A), seit wann (Zeitschieber), welche Farbe (B) */
function g3Gilt(a) { const A = (G3.E || {}).a || 'a1'; return a.art === 'bauteil' || (a.art === 'plan' && A === 'a3') || ((a.art === 'raum' || a.art === 'assistent') && A !== 'a1'); }
function g3Seit() { if (!G3.tage) return null; const d = new Date(); d.setDate(d.getDate() - G3.tage); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }   // Ortszeit
function g3Aend(e) {   // jüngste geltende Änderung an diesem Bauteil seit dem Tag des Schiebers
  const s = g3Seit(); if (!s) return null;
  const z = g3Zeile(e);
  return G3.AE.find((a) => !a.zurueck && g3Gilt(a) && a.wann.slice(0, 10) >= s && ((a.ids || []).includes(e.i) || (z && a.zeile === z.id))) || null;
}
function g3AendFarbe(a) {
  const B = (G3.E || {}).b || 'b1';
  if (B === 'b2') { const t = (Date.now() - new Date(a.wann)) / 864e5; return t <= 1 ? '#c62f2a' : t <= 7 ? '#e3a23b' : t <= 30 ? '#e9d36a' : '#b9c7a5'; }
  if (B === 'b3') return g3Farbe(a.wer || '?');
  return (G3APP[a.app] || ['', '#8d99a6'])[1];
}
function g3AendSchl(a) { const B = (G3.E || {}).b || 'b1', t = (Date.now() - new Date(a.wann)) / 864e5;
  return B === 'b2' ? (t <= 1 ? 'heute / gestern' : t <= 7 ? 'diese Woche' : t <= 30 ? 'diesen Monat' : 'älter') : B === 'b3' ? (a.wer || 'unbekannt') : (G3APP[a.app] || [a.app || 'ohne App'])[0]; }

function g3Modi() {
  const N = G3.N ? G3.N.e : [];
  const leg = (f) => { const M = new Map(); N.forEach((e) => { const k = f(e); if (k) M.set(k[0], k[1]); }); return [...M.entries()].slice(0, 14).map(([t, c]) => [c, t]); };
  const M = [];   // Färbungen nur noch U-Wert und Änderungen (+ Maßnahmen im Baustein) – Bauteilart, Außen/innen, Himmelsrichtung, gleicher Aufbau, Material sind Filter der Liste (Mock „schlank“)
  const ust = (e) => { const z = g3Zeile(e), u = z && G3.uw[z.id]; if (!u || u.u == null || !u.anf) return null; const r = Math.round(u.u * 100) / 100; return r <= u.anf.u + 1e-9 ? 'g' : u.u <= u.anf.u * 1.1 ? 'y' : 'r'; };
  M.push({ key: 'g-uw', name: 'U-Wert', farbe: (e) => ({ g: '#58b368', y: '#e9b949', r: '#d9534f' }[ust(e)] || null), legende: [['#58b368', 'hält die Anforderung ein'], ['#e9b949', 'bis 10 % darüber'], ['#d9534f', 'darüber'], ['#d6d8da', 'ohne U-Wert']] });
  M.push({ key: 'g-aend', name: 'Änderungen', farbe: (e) => { const a = g3Aend(e); return a ? g3AendFarbe(a) : null; },
    legende: G3.tage ? leg((e) => { const a = g3Aend(e); return a ? [g3AendSchl(a), g3AendFarbe(a)] : null; }).concat([['#d6d8da', 'nicht geändert']]) : [['#d6d8da', 'Schieber unter „Änderungen“ zurückziehen']] });
  return M;
}
function g3Info(e) {
  const z = g3Zeile(e), a = g3Aend(e), [h] = g3Mats(z);
  return `<b>${esc(g3Name(e))}${g3Nr(e) ? ' · ' + esc(g3Nr(e)) : ''}</b>${esc(g3Gesch(e))}${z && z.teil ? ' · ' + esc(z.teil) : ''}${z && z.kurz ? `<br><small>${esc(z.kurz)}</small>` : ''}${h ? `<br><small>Hauptschicht: ${esc(h)}</small>` : ''}`
    + (a ? `<br><small>${esc(a.wann.slice(8, 10) + '.' + a.wann.slice(5, 7) + '.')} ${esc(g3AendSchl(a))}: ${esc(a.text)}</small>` : '');
}

/* Die Liste rechts: jedes Bauteil einzeln (E1 gegliedert wie die Färbung, E2 Gebäudeteil › Geschoss › Art) */
function g3Gruppe(e, k) {
  const z = g3Zeile(e);
  if ((G3.E || {}).e === 'e2' || !k || k === 'massnahme' || k === 'modell') return [z && z.teil ? z.teil : '', g3Gesch(e), G3ART[e.t] || 'Bauteil'].filter(Boolean).join(' › ');
  if (k === 'g-teil') return (z && z.teil) || 'ohne Gebäudeteil';
  if (k === 'g-art') return G3ART[e.t] || 'Bauteil';
  if (k === 'g-lage') return z && typeof z.aussen === 'boolean' ? (z.aussen ? 'außen' : 'innen') : 'ohne Angabe';
  if (k === 'g-hr') return g3Hr(z) || 'ohne Richtung';
  if (k === 'g-gleich') return z && z.vorlage ? (z.kurz || z.name) : 'ohne Aufbau';
  if (k === 'g-uw') { const u = z && G3.uw[z.id]; return u && u.u != null ? 'U ' + g3Z2(u.u) + (u.anf ? ' (höchstens ' + g3Z2(u.anf.u) + ')' : '') : 'ohne U-Wert'; }
  if (k === 'g-mat') return g3Mats(z)[0] || 'ohne Schichten';
  if (k === 'g-aend') { const a = g3Aend(e); return a ? g3AendSchl(a) : 'nicht geändert'; }
  return '';
}
/* Filter der Listen rechts (20.11.2026: „die Liste rechts ist mehrfach filterbar“) – gemeinsamer Baustein bp/filter.js: mehrere Arten, je Art
   beliebig viele Werte, UND/ODER/NICHT, freier Text; das Feld bleibt stehen, nur die Liste darunter wird neu gezeichnet */
function g3Filter(key, arten, items, text, neu) {
  if (!window.bpFilter) return null;
  return bpFilter({ key, arten, items, text, aendern: neu, leerStart: true });
}
function g3Fach(box, F) {   // Gerüst: Kopf · Filter · Liste – einmal; danach wird nur die Liste neu gezeichnet
  if (!box.querySelector(':scope > .g3-lb')) box.innerHTML = '<div class="g3-lk"></div><div class="g3-fl"></div><div class="g3-lb"></div>';
  if (F && !box.querySelector(':scope > .g3-fl').contains(F.el)) box.querySelector(':scope > .g3-fl').appendChild(F.el);
  return [box.querySelector(':scope > .g3-lk'), box.querySelector(':scope > .g3-lb')];
}
function g3Liste(box) {
  if (!box) return; if (!G3.N) { box.innerHTML = '<p class="mute">Liste der Bauteile erscheint, sobald das Modell geladen ist.</p>'; return; }
  G3.FL = G3.FL || g3Filter('gm-bauteile', [
    { key: 'art', name: 'Bauteilart', farbe: '#6e8fb5', werte: (e) => [G3ART[e.t] || 'Bauteil'] },
    { key: 'teil', name: 'Gebäudeteil', farbe: '#7fb58a', werte: (e) => { const z = g3Zeile(e); return z && z.teil ? [z.teil] : []; } },
    { key: 'ges', name: 'Geschoss', farbe: '#a58bb5', werte: (e) => [g3Gesch(e)] },
    { key: 'hr', name: 'Himmelsrichtung', farbe: '#4a78b8', werte: (e) => { const h = g3Hr(g3Zeile(e)); return h ? [h] : []; } },
    { key: 'lage', name: 'Außen / innen', farbe: '#d9534f', werte: (e) => { const z = g3Zeile(e); return z && typeof z.aussen === 'boolean' ? [z.aussen ? 'außen' : 'innen'] : []; } },
    { key: 'mat', name: 'Material', farbe: '#b08a5e', werte: (e) => g3Mats(g3Zeile(e))[1] },
    { key: 'auf', name: 'Gleicher Aufbau', farbe: '#e3a23b', werte: (e) => { const z = g3Zeile(e); return z && z.kurz ? [z.kurz.slice(0, 60)] : []; } }],
  () => (G3.N ? G3.N.e : []), (e) => `${g3Name(e)} ${g3Nr(e)} ${(g3Zeile(e) || {}).kurz || ''}`, () => g3Liste(G3.liste));
  const [kopf, lb] = g3Fach(box, G3.FL), k = G3.farbe, M = new Map(), E = G3.FL ? G3.N.e.filter((e) => G3.FL.pruefe(e)) : G3.N.e;
  E.forEach((e) => { const g = g3Gruppe(e, k); (M.get(g) || M.set(g, []).get(g)).push(e); });
  const G = [...M.entries()].sort((a, b) => (k === 'g-aend' && a[0] === 'nicht geändert' ? 1 : k === 'g-aend' && b[0] === 'nicht geändert' ? -1 : a[0].localeCompare(b[0], 'de', { numeric: true })));
  const D2 = (G3.E || {}).d === 'd2' && k === 'g-mat';
  kopf.innerHTML = `<b>Bauteile einzeln</b><span class="mute">${E.length === G3.N.e.length ? G3.N.e.length + ' im Plan' : E.length + ' von ' + G3.N.e.length}</span>${E.length > 1 ? `<button type="button" class="btn sm" data-g3alle title="Alle Bauteile, die der Filter zeigt, wählen – oben gemeinsam ändern">alle ${E.length} wählen</button>` : ''}`;
  G3.LE = E;
  if (G3.D3 && G3.D3.hervor) { const f = E.length !== G3.N.e.length; if (f || G3.hvF) G3.D3.hervor(f ? E.map((e) => e.i) : null); G3.hvF = f; }   // gefiltert: im Modell leuchtet nur, was in der Liste steht
  lb.innerHTML = (D2 ? `<div class="g3-mat">Material: ${[...new Set(G3.N.e.flatMap((e) => g3Mats(g3Zeile(e))[1]))].sort().map((m) => `<button type="button" class="${G3.mat === m ? 'on' : ''}" data-g3mat="${esc(m)}">${esc(m)}</button>`).join('') || '<span class="mute">keine Schichten mit Material</span>'}</div>` : '')
    + G.map(([g, L]) => { const auf = G3.offen.has(g) || L.some((e) => e.i === G3.sel);
      return `<div class="g3-g${auf ? ' auf' : ''}" data-g3g="${esc(g)}"><button type="button" class="g3-gk" data-g3auf="${esc(g)}">${bpKlapp(auf)}<span>${esc(g)}</span><em>${L.length}</em></button>`
        + (auf ? L.map((e) => `<button type="button" class="g3-e${e.i === G3.sel ? ' an' : ''}" data-g3e="${e.i}"><span>${esc(g3Name(e))}</span><small>${esc([g3Nr(e), g3Gesch(e)].filter(Boolean).join(' · '))}</small></button>`).join('') : '') + '</div>'; }).join('');
}
function g3Waehle(i, von3d) {   // ein Bauteil im Plan gewählt: Modell, Liste, Details der Zeile
  G3.sel = i; const x = i != null ? G3.zu.get(i) : null;
  if (!von3d && G3.D3) G3.D3.waehle(i != null ? [i] : []);
  if (x && BT) BT.zeige(x.z.id, false);
  if (window.seiteReiter && i != null) seiteReiter('gm', 'details');
  g3Liste(G3.liste);
}

/* Reiter „Änderungen“: Zeitschieber und Liste */
const g3AName = (a) => { const x = [...G3.zu.values()].find((y) => y.z.id === a.zeile); return x ? x.z.name : ''; };
function g3AendKopf() {
  return `<div class="g3-zs"><span class="mute">vor 90 Tagen</span><input type="range" min="-90" max="0" value="${-G3.tage}" data-g3zeit aria-label="Stand zurückziehen"><b>${G3.tage ? 'seit ' + esc(tag(s)) : 'heute'}</b></div>
    <p class="mute g3-zt">Schieber nach links: das Gebäude wird grau, was seit dem gewählten Tag geändert wurde, erscheint in Farbe (${esc({ b1: 'je App', b2: 'je Alter', b3: 'je Person' }[(G3.E || {}).b] || 'je App')}). Klick auf eine Zeile wählt das Bauteil.</p>`;
}
function g3AendListe() {   // je Änderung: oben klein Datum · App · Person, darunter der Text in voller Breite, rechts „Zurücknehmen“ (20.11.2026: im schmalen Bereich stand der Text Wort für Wort untereinander)
  const C2 = (G3.E || {}).c !== 'c1', s = g3Seit(), A = G3.AE.filter(g3Gilt), L = G3.FA ? A.filter((a) => G3.FA.pruefe(a)) : A;
  return A.length ? (L.length ? `<div class="g3-al">${L.map((a) => `<div class="g3-a${s && a.wann.slice(0, 10) >= s ? '' : ' alt'}${a.zurueck ? ' zur' : ''}" data-g3a="${a.id}">
      <span class="g3-am"><i class="g3-af" data-g3f="${esc(g3AendFarbe(a))}"></i>${esc(tag(a.wann))} · ${esc((G3APP[a.app] || [a.app || '–'])[0])} · ${esc(a.wer || '–')}</span>
      <span class="g3-at">${g3AName(a) ? `<b>${esc(g3AName(a))}</b> – ` : ''}${esc(a.text)}${a.zurueck ? ' <em>(zurückgenommen)</em>' : ''}</span>
      ${C2 && a.kann ? `<button type="button" class="btn sm" data-g3zur="${a.id}" title="Diese Änderung zurücknehmen">Zurücknehmen</button>` : ''}</div>`).join('')}</div>` : '<p class="mute">Keine Änderung passt zum Filter.</p>')
    : '<p class="mute">Noch keine Änderungen gemerkt – ab jetzt steht hier jede Änderung an einem Bauteil, egal aus welcher App.</p>';
}
function g3AendZeichnen(kopfNeu) {
  const b = G3.aend; if (!b || !b.isConnected) return;
  G3.FA = G3.FA || g3Filter('gm-aenderungen', [
    { key: 'app', name: 'App', farbe: '#1f6fb2', werte: (a) => [(G3APP[a.app] || [a.app || 'ohne App'])[0]] },
    { key: 'wer', name: 'Person', farbe: '#a58bb5', werte: (a) => (a.wer ? [a.wer] : []) },
    { key: 'was', name: 'Was', farbe: '#e3a23b', werte: (a) => [String(a.text || '').split(':')[0].slice(0, 40)] },
    { key: 'bt', name: 'Bauteil', farbe: '#7fb58a', werte: (a) => (g3AName(a) ? [g3AName(a)] : []) }],
  () => G3.AE.filter(g3Gilt), (a) => `${a.text} ${a.wer} ${g3AName(a)}`, () => g3AendZeichnen());
  const neu = !b.querySelector(':scope > .g3-ab');
  if (neu) b.innerHTML = '<div class="g3-ak"></div><div class="g3-fl"></div><div class="g3-ab"></div>';
  if (G3.FA && !b.querySelector(':scope > .g3-fl').contains(G3.FA.el)) b.querySelector(':scope > .g3-fl').appendChild(G3.FA.el);
  if (neu || kopfNeu) b.querySelector(':scope > .g3-ak').innerHTML = g3AendKopf();   // der Schieber wird beim Ziehen nicht neu gebaut
  const ab = b.querySelector(':scope > .g3-ab'); ab.innerHTML = g3AendListe();
  ab.querySelectorAll('[data-g3f]').forEach((i) => { i.style.background = i.dataset.g3f; });   // Farbe per CSSOM (kein style-Attribut im HTML)
}
async function g3AendLaden() {
  try { const r = await api(`api/bp/modell/${PID}/aenderungen`); G3.AE = r.aenderungen || []; G3.E = r.einst || G3.E; } catch { G3.AE = []; }
  g3AendZeichnen(true); if (G3.D3) G3.D3.farben(g3Modi());
}

async function bauteile3d(zeige) {
  const lauf = G3.lauf = (G3.lauf || 0) + 1;   // wird die Seite währenddessen neu aufgebaut, bricht dieser Lauf ab
  await Promise.all([baustein('bauteile.js', 'bpBauteile'), baustein('baum.js', 'bpBaum'), baustein('ansicht3d.js', 'bp3d'), baustein('filter.js', 'bpFilter').catch(() => null)]);
  if (lauf !== G3.lauf) return;
  V.className = 'gm-bt bp-voll'; V.innerHTML = `<div class="gm-d3"></div><div class="gm-gr" hidden></div><div class="gm-tab" hidden>${tabsHtml()}<div class="gm-tabi"></div><div class="gm-li" hidden></div></div>`;
  Object.assign(G3, { N: null, D3: null, BK: null, bk: null, an: null, bkD: null, bkK: null, zu: new Map(), sel: null, liste: null, aend: null, FL: null, FA: null, hvF: false, rev: null, liRev: null, farbe: ['massnahme', 'modell', 'g-uw', 'g-aend'].includes(LS.get('farbe')) ? LS.get('farbe') : 'massnahme' });
  const fD3 = V.querySelector('.gm-d3'), fT = V.querySelector('.gm-tabi');
  try { G3.E = await api('api/bp/modell/einst'); } catch { G3.E = { a: 'a1', b: 'b1', c: 'c2', d: 'd2', e: 'e1', f: 'f1' }; }
  if (lauf !== G3.lauf) return;
  const zuordnen = (Z) => { G3.zu = new Map(); (Z || []).forEach((z) => (z.ids || []).forEach((i, k) => G3.zu.set(+i, { z, nr: (z.nummern || [])[k] || '' }))); };
  let erst = true;
  BT = bpBauteile.mount(fT, PID, { einlesen: true, baum: true, raeume: () => gmWeg('raeume'), baukasten: () => gmWeg('baukasten'),
    nachher: () => {
      if (lauf !== G3.lauf || !fT.isConnected) return;   // Seite inzwischen neu aufgebaut – dieser Stand gilt nicht mehr
      leiste(); const b = NAV.querySelector('.gm-vm'); if (b) BT.menue(b);
      const st = BT.zustand(), ZZ = g3Zeilen(st); zuordnen(ZZ);
      /* eine 3D-Ansicht: ohne Plan der Baukasten, mit Plan das Modell aus dem Plan (E1); ein angesehener Planstand, der nicht gilt, nur zum Ansehen
         (21.11.2026) – 3D, Grundriss, Bauteile, Räume, Fenster & Türen bleiben bei ihm, bis „Zurück zum gültigen“ oder „gelten lassen“ */
      const bk = (!st.plan && !st.an) || !!G3.bkNeu, an = st.an && !G3.bkNeu ? st.an.id : null;   // bkNeu: „Neuer Planstand – mit dem Baukasten“, bis er gespeichert ist
      if (G3.bk !== null && (G3.bk !== bk || G3.an !== an)) g3Neu(bk, an);
      if (G3.bk === null) { G3.bk = bk; G3.an = an; g3Seite(); }
      if (!bk && !st.an && !ZZ.length) { G3.zwang = true; g3Mitte('tabelle', true); }   // Plan ohne Zeilen: Tabelle mit dem Einstieg
      else if (erst || G3.zwang) { G3.zwang = false; g3Mitte(SICHT !== 'bauteile' ? 'tabelle' : LS.get('mitte') || '3d', true); }   // danach wieder, was die Person gewählt hat
      if (erst && SICHT !== 'bauteile') gmTab(SICHT);
      else if (SICHT !== 'bauteile' && G3.liRev !== `${st.rev}|${an}`) gmTab(SICHT);   // Räume, Fenster & Türen: nur bei neuem Stand neu
      if (G3.D3 && !G3.bk) { if (st.rev !== G3.rev) { G3.D3.neu(ZZ); G3.D3.farben(g3Modi()); } }   // nur bei neuem Stand – nicht bei jedem Klick in der Tabelle
      if (G3.mitte === 'grundriss' && G3.rev && st.rev !== G3.rev) gmGrundriss(V.querySelector('.gm-gr'), true);
      if (zeige) { const z = zeige; zeige = null; if (z === '__rw') { g3Mitte('tabelle', true); BT.zeige(z, false); } else { BT.zeige(z, true); const x = ZZ.find((y) => y.id === z); if (x && G3.D3) G3.D3.waehle(x.ids || []); } }
      G3.rev = st.rev; erst = false; g3Liste(G3.liste);
    },
    auswahl: (z) => { if (z && window.seiteReiter) seiteReiter('gm', 'details'); if (window.seiteFuellen) seiteFuellen('gm', 'details'); if (G3.D3) G3.D3.waehle(z ? z.ids || [] : []); },
    mehr: (ids) => {   // mehrere Zeilen gewählt (Haken, Strg + Klick): im 3D alle hervorheben, rechts die gemeinsamen Felder
      if (window.seiteReiter && ids.length > 1) seiteReiter('gm', 'details');
      if (G3.D3) { const Z = g3Zeilen(BT.zustand()).filter((z) => ids.includes(z.id)); G3.D3.waehle(Z.flatMap((z) => z.ids || [])); }
    } });
}
const g3Zeilen = (st) => (st.an ? (st.an.liste || {}).zeilen || [] : st.zeilen || []);
function g3Neu(bk, an) {   // Planstand gewechselt (gilt jetzt, angesehen, zurück): Mitte neu – die Tabelle bleibt
  Object.assign(G3, { D3: null, BK: null, bkD: null, bkK: null, N: null, bk, an, rev: null });
  const d = V.querySelector('.gm-d3'); if (d) d.innerHTML = '';
  if (typeof GR !== 'undefined') GR.F = null;
  g3Seite(); if (G3.mitte) g3Mitte(G3.mitte, true);
}
/* Reiter über der Tabelle (Bauteile · Räume · Fenster & Türen) – in derselben Seite, rechts bleibt alles stehen (21.11.2026) */
async function gmTab(k) {
  if (!TABS.some((t) => t[0] === k)) return;
  SICHT = k; LS.set('sicht', k);
  const t = V.querySelector('.gm-tab'), li = V.querySelector('.gm-li'), fT = V.querySelector('.gm-tabi'); if (!t || !li) return;
  const h = document.createElement('div'); h.innerHTML = tabsHtml(); t.querySelector('.gm-tr').replaceWith(h.firstChild);
  fT.hidden = k !== 'bauteile'; li.hidden = k === 'bauteile';
  if (k !== 'bauteile' && G3.mitte !== 'tabelle') g3Mitte('tabelle');
  leiste();
  if (k !== 'bauteile') { const st = BT ? BT.zustand() : {}; G3.liRev = `${st.rev}|${st.an ? st.an.id : null}`; await gmListe(k, null, true); }
}
/* Bereich rechts: Bauteil (Baukasten: Angaben des gewählten Körpers, Tabelle: Details der Zeile – darunter die Liste jedes Bauteils einzeln),
   Korb (nur Baukasten, F1), Änderungen, Planung */
function g3Seite() {
  if (!window.seite) return;
  const R = [{ id: 'details', titel: 'Bauteil', mount: (el) => {
    el.innerHTML = '<div class="g3-teil"><div class="g3-oben"><div class="g3-bk"></div><div class="g3-det"></div></div><div class="g3-tr" role="separator" aria-orientation="horizontal" title="Ziehen: Platz zwischen Angaben und Liste"></div><div class="g3-li"></div></div>';
    const h = +LS.get('g3h'); if (h > 60) el.querySelector('.g3-teil').style.setProperty('--g3h', h + 'px');
    if (G3.bkD) el.querySelector('.g3-bk').appendChild(G3.bkD);
    BT.details(el.querySelector('.g3-det')); G3.liste = el.querySelector('.g3-li'); g3Liste(G3.liste); g3Rechts(); } }];
  if (G3.bk) R.push({ id: 'korb', titel: 'Korb', mount: (el) => { el.innerHTML = ''; if (G3.bkK) el.appendChild(G3.bkK); else el.innerHTML = '<p class="mute" style="padding:.8rem">Der Korb erscheint mit dem Baukasten (Ansicht „3D“).</p>'; } });
  R.push({ id: 'aend', titel: 'Änderungen', mount: (el) => { G3.aend = el; el.classList.add('g3-aend'); g3AendLaden(); } }, seite.planung);
  seite(WORK, 'gm', R, { start: 'details', w: 0.62, minL: 520, min: 340, planung: false });
}
function g3Rechts() {   // im Baukasten zeigt „Bauteil“ die Angaben des Körpers (3D), in Tabelle/Grundriss die Details der Zeile; Liste nur mit Plan
  const box = document.querySelector('.g3-bk'), det = document.querySelector('.g3-det'), li = document.querySelector('.g3-li'), tr = document.querySelector('.g3-tr');
  const bk = !!G3.bk && G3.mitte === '3d';
  if (box) box.hidden = !bk; if (det) det.hidden = bk; if (li) li.hidden = !!G3.bk; if (tr) tr.hidden = !!G3.bk;
  const t = document.querySelector('.g3-teil'); if (t) t.classList.toggle('ohne', !!G3.bk);
}
/* Trenner zwischen Angaben und Liste ziehen (L-B) – Höhe je Person gemerkt */
document.addEventListener('pointerdown', (e) => {
  const tr = e.target.closest && e.target.closest('.g3-tr'); if (!tr) return;
  const t = tr.parentElement, o = t.querySelector('.g3-oben'), y0 = e.clientY, h0 = o.getBoundingClientRect().height, max = t.getBoundingClientRect().height - 90;
  e.preventDefault(); tr.setPointerCapture(e.pointerId);
  const zieh = (ev) => { const h = Math.max(80, Math.min(max, h0 + ev.clientY - y0)); t.style.setProperty('--g3h', Math.round(h) + 'px'); };
  const los = (ev) => { tr.removeEventListener('pointermove', zieh); tr.removeEventListener('pointerup', los); const h = parseInt(t.style.getPropertyValue('--g3h'), 10); if (h) LS.set('g3h', h); };
  tr.addEventListener('pointermove', zieh); tr.addEventListener('pointerup', los);
});
function g3Laden(feld, st) {
  if (!feld.isConnected) return;
  const F = (G3.E || {}).f || 'f1', D3O = { zeilen: g3Zeilen(st), modi: g3Modi(), start: G3.farbe, info: g3Info, spreizen: F === 'f2' ? 'aussen' : 'alle', spreizWahl: F !== 'f2', teil: (e) => { const z = g3Zeile(e); return z ? z.teil || '' : ''; } };
  g3Extras(st);
  if (G3.bk) {   // ohne Plan: das Gebäude im Baukasten bauen – dieselbe 3D-Ansicht (A1), Angaben und Korb rechts
    G3.BK = bpBaukasten.mount(feld, PID, { seite: ({ detail, korb }) => { G3.bkD = detail; G3.bkK = korb; const b = document.querySelector('.g3-bk'); if (b) b.appendChild(detail);
      if (window.seiteFuellen) seiteFuellen('gm', 'korb'); },
    d3: { ...D3O, geladen: (N) => { G3.N = N; if (G3.BK) G3.D3 = G3.BK.d3; } }, neu: !!G3.bkNeu,
    nachher: () => { G3.bkNeu = false; if (BT && BT.laden) BT.laden(); } });
    return;
  }
  G3.D3 = bp3d.mount(feld, { ...D3O, url: `api/bp/modell/${PID}/netz${st.an ? '?planstand=' + st.an.id : ''}`, wahl: true,
    geladen: (N) => { G3.N = N; g3Liste(G3.liste); if (G3.D3) G3.D3.farben(g3Modi()); },
    onWahl: (ids, e) => {
      const Z = [...new Set((ids || []).map((i) => (G3.zu.get(+i) || {}).z).filter(Boolean).map((z) => z.id))];
      if (Z.length > 1 && BT) { G3.sel = null; BT.mehr(Z); g3Liste(G3.liste); return; }   // mehrere Bauteile (Strg, Rahmen): gemeinsam ändern
      if (!e) { G3.sel = null; g3Liste(G3.liste); return; } g3Waehle(e.i, true); } });
}
function g3Extras(st) {   // Färbung merken, U-Werte und Änderungen nachladen – für Plan und Baukasten gleich
  const feld = V.querySelector('.gm-d3');
  if (feld && !feld.dataset.f) { feld.dataset.f = '1'; feld.addEventListener('click', (ev) => { const b = ev.target.closest('[data-b3f]'); if (b) { G3.farbe = b.dataset.b3f; LS.set('farbe', G3.farbe); setTimeout(() => g3Liste(G3.liste), 0); } }); }
  baustein('uwert.js', 'bpUwert').then(() => bpUwert.holen(`api/bp/modell/${PID}`, st.rev)).then((U) => { G3.uw = U || {}; if (G3.D3) G3.D3.farben(g3Modi()); }).catch(() => {});
  api(`api/bp/modell/${PID}/aenderungen`).then((r) => { G3.AE = r.aenderungen || []; if (G3.D3) G3.D3.farben(g3Modi()); }).catch(() => {});
}
/* Mitte: 3D · Grundriss · Tabelle (Befehlsleiste „Ansicht“) – gemerkt je Person; erzwungen = vom Zustand gewählt, nicht gemerkt */
async function g3Mitte(w, erzwungen) {
  const d = V.querySelector('.gm-d3'), g = V.querySelector('.gm-gr'), t = V.querySelector('.gm-tab'); if (!d || !t) return;
  if (!['3d', 'grundriss', 'tabelle'].includes(w)) w = '3d';
  G3.mitte = w; d.hidden = w !== '3d'; g.hidden = w !== 'grundriss'; t.hidden = w !== 'tabelle';
  if (!erzwungen) LS.set('mitte', w);
  if (w === '3d' && !G3.D3 && !G3.BK && BT) { const st = BT.zustand(); if (G3.bk || g3Zeilen(st).length) { await Promise.all([baustein('ansicht3d.js', 'bp3d'), G3.bk ? baustein('gebaeudekasten.js', 'bpBaukasten') : null]); g3Laden(d, st); } }
  if (w === 'grundriss') gmGrundriss(g);   // gebaeudemodell-grundriss.js
  g3Rechts(); leiste();
}

WORK.addEventListener('click', async (e) => {
  const g = e.target.closest('[data-g3auf]'); if (g) { const k = g.dataset.g3auf; if (G3.offen.has(k)) G3.offen.delete(k); else G3.offen.add(k); return g3Liste(G3.liste); }
  const r = e.target.closest('[data-g3e]'); if (r) return g3Waehle(+r.dataset.g3e, false);
  if (e.target.closest('[data-g3alle]') && G3.LE && BT) {   // F1: alles, was der Filter zeigt, wählen → rechts oben gemeinsam ändern
    const Z = [...new Set(G3.LE.map((x) => (G3.zu.get(x.i) || {}).z).filter(Boolean).map((z) => z.id))];
    if (G3.D3) G3.D3.waehle(G3.LE.map((x) => x.i));
    if (Z.length > 1) BT.mehr(Z); else if (Z.length) BT.zeige(Z[0], false);
    const o = document.querySelector('.g3-oben'); if (o) o.scrollTop = 0; return;
  }
  const m = e.target.closest('[data-g3mat]'); if (m) { G3.mat = G3.mat === m.dataset.g3mat ? '' : m.dataset.g3mat; if (G3.D3) { G3.D3.farben(g3Modi()); } return g3Liste(G3.liste); }
  const z = e.target.closest('[data-g3zur]');
  if (z) { try { const d = await api(`api/bp/modell/${PID}/aenderungen/${z.dataset.g3zur}/zurueck`, 'POST', {}); G3.AE = d.aenderungen || G3.AE; toast('Zurückgenommen.'); if (BT && BT.laden) BT.laden(); g3AendZeichnen(); } catch (er) { toast(er.message, true); } return; }
  const a = e.target.closest('[data-g3a]');
  if (a && !e.target.closest('button')) { const x = G3.AE.find((y) => y.id === +a.dataset.g3a); if (x && G3.D3 && (x.ids || []).length) { G3.D3.waehle(x.ids); if (BT) { const zz = [...G3.zu.values()].find((y) => y.z.id === x.zeile); if (zz) BT.zeige(zz.z.id, false); } } }
});
WORK.addEventListener('input', (e) => {
  if (!('g3zeit' in e.target.dataset)) return;
  G3.tage = -e.target.value; const b = e.target.parentElement.querySelector('b'); if (b) b.textContent = G3.tage ? 'seit ' + tag(g3Seit()) : 'heute';
  if (G3.D3) { if (G3.tage && G3.farbe !== 'g-aend') { G3.farbe = 'g-aend'; G3.D3.farben(g3Modi()); G3.D3.modus('g-aend'); } else G3.D3.farben(g3Modi()); }
  clearTimeout(G3.zt); G3.zt = setTimeout(() => { g3AendZeichnen(); g3Liste(G3.liste); }, 250);
});

/* Einstellungen der App (Verwaltung → Einstellungen → Gebäudemodell): A–F mit sinnvoller Vorgabe */
const G3EINST = [['a', 'Was zählt als Änderung?', [['a1', 'nur Bauteile (Aufbau, Dicke, Maßnahme, Menge)'], ['a2', 'dazu Räume und Angaben des Assistenten'], ['a3', 'dazu jeder neue Planstand (neue und entfallene Bauteile)']]],
  ['b', 'Farbe der Änderungen', [['b1', 'je App'], ['b2', 'je Alter – frisch kräftig, älter blasser'], ['b3', 'je Person']]],
  ['c', 'Klick auf eine Änderung', [['c1', 'nur zeigen'], ['c2', 'zeigen und „Zurücknehmen“ anbieten']]],
  ['d', 'Färbung „Material“', [['d1', 'nach der Hauptschicht (dickste Schicht)'], ['d2', 'Material aus einer Liste wählen – alle Bauteile, in denen es vorkommt, leuchten']]],
  ['e', 'Liste rechts', [['e1', 'gegliedert wie die gewählte Färbung'], ['e2', 'immer Gebäudeteil › Geschoss › Bauteilart']]],
  ['f', 'Wände auseinanderspreizen', [['f1', 'alle Wände, mit Umschalter „nur Außenwände“'], ['f2', 'nur Außenwände, ohne Umschalter']]]];
async function g3Einst(host) {
  let E; try { E = await api('api/bp/modell/einst'); } catch (e) { host.textContent = e.message; return; }
  host.innerHTML = '<p class="bph-mu">Gilt fürs ganze Büro. Vorgabe: A1 · B1 · C2 · D2 · E1 · F1.</p>' + G3EINST.map(([k, t, O]) => `<fieldset class="g3-ef"><legend>${k.toUpperCase()} · ${esc(t)}</legend>${O.map(([w, x]) => `<label><input type="radio" name="g3e-${k}" value="${w}"${E[k] === w ? ' checked' : ''}> ${w.toUpperCase()}: ${esc(x)}</label>`).join('')}</fieldset>`).join('');
  host.addEventListener('change', async (e) => { const r = e.target; if (r.type !== 'radio') return;
    try { G3.E = await api('api/bp/modell/einst', 'PUT', { werte: { [r.name.slice(4)]: r.value } }); toast('Gespeichert.'); } catch (er) { toast(er.message, true); } });
}
const g3EinstMelden = () => { if (window.BPHead && BPHead.appEinstellungen) BPHead.appEinstellungen([{ key: 'bauteile', label: 'Gebäude: Änderungen, Material, Liste, Wände', render: (h) => g3Einst(h) }, { key: 'gelernt', label: 'Gelerntes aus dem Planungsassistenten', render: (h) => gelernt(h) }]); };   // Gelerntes (D1)   // nach header() (gebaeudemodell.js)
