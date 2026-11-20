'use strict';
/* Gebäudemodell – Seite „Bauteile“ mit großem 3D (GO 20.11.2026, Mock „Gebäudemodell – neue Seite Bauteile“, A–F in den Einstellungen der App).
   Mitte: das Modell (bp/ansicht3d.js) – Befehlsleiste „Ansicht“ schaltet auf die Tabelle der Bauteile (bp/bauteile.js) um; die Tabelle kommt von
   selbst, solange ein Planstand als Entwurf offen ist oder es noch nichts zu zeigen gibt. Rechts (seite.js): „Bauteil“ = Details der gewählten
   Zeile und darunter die Liste – jedes Bauteil einzeln (E1 nach der Färbung, E2 Gebäudeteil › Geschoss › Art); „Änderungen“ mit Zeitschieber:
   das Gebäude wird grau, alles, was seit dem gewählten Tag geändert wurde, in Farbe (A was zählt, B Farbe je App/Alter/Person, C Zurücknehmen).
   Färbungen: Gebäudeteil, Bauteilart, Außen/innen, Himmelsrichtung, Gleiche Bauteile (= Zeile mit gleichem Aufbau), U-Wert, Material
   (D1 Hauptschicht, D2 aus der Liste wählen), Änderungen; dazu Maßnahmen und Farben des Modells aus dem Baustein.
   Nutzt aus gebaeudemodell.js: PID, BT, WORK, V, LS, baustein, leiste. Kern: bpcore/modell_aenderung.py. */
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
  const N = G3.N ? G3.N.e : [], Z = [...new Set([...G3.zu.values()].map((x) => x.z))];
  const leg = (f) => { const M = new Map(); N.forEach((e) => { const k = f(e); if (k) M.set(k[0], k[1]); }); return [...M.entries()].slice(0, 14).map(([t, c]) => [c, t]); };
  const teil = (e) => { const z = g3Zeile(e); return z && z.teil ? [z.teil, g3Farbe('t' + z.teil)] : null; };
  const M = [];
  if (Z.some((z) => z.teil)) M.push({ key: 'g-teil', name: 'Gebäudeteil', farbe: (e) => (teil(e) || [])[1] || null, legende: leg(teil) });
  M.push({ key: 'g-art', name: 'Bauteilart', farbe: (e) => G3ARTF[e.t] || null, legende: leg((e) => [G3ART[e.t] || 'Bauteil', G3ARTF[e.t] || '#c8c8c8']) });
  M.push({ key: 'g-lage', name: 'Außen / innen', farbe: (e) => { const z = g3Zeile(e); return z && typeof z.aussen === 'boolean' ? (z.aussen ? '#d9534f' : '#6e8fb5') : null; }, legende: [['#d9534f', 'außen'], ['#6e8fb5', 'innen'], ['#d6d8da', 'ohne Angabe']] });
  M.push({ key: 'g-hr', name: 'Himmelsrichtung', farbe: (e) => HR3F[g3Hr(g3Zeile(e))] || null, legende: Object.entries(HR3F).map(([t, c]) => [c, t]) });
  M.push({ key: 'g-gleich', name: 'Gleiche Bauteile', farbe: (e) => { const z = g3Zeile(e); return z && z.vorlage ? g3Farbe(z.vorlage + (z.kurz || '')) : null; },
    legende: leg((e) => { const z = g3Zeile(e); return z && z.vorlage ? [(z.kurz || z.name).slice(0, 40), g3Farbe(z.vorlage + (z.kurz || ''))] : null; }) });
  const ust = (e) => { const z = g3Zeile(e), u = z && G3.uw[z.id]; if (!u || u.u == null || !u.anf) return null; const r = Math.round(u.u * 100) / 100; return r <= u.anf.u + 1e-9 ? 'g' : u.u <= u.anf.u * 1.1 ? 'y' : 'r'; };
  M.push({ key: 'g-uw', name: 'U-Wert', farbe: (e) => ({ g: '#58b368', y: '#e9b949', r: '#d9534f' }[ust(e)] || null), legende: [['#58b368', 'hält die Anforderung ein'], ['#e9b949', 'bis 10 % darüber'], ['#d9534f', 'darüber'], ['#d6d8da', 'ohne U-Wert']] });
  const D2 = (G3.E || {}).d === 'd2';
  M.push({ key: 'g-mat', name: D2 && G3.mat ? 'Material: ' + G3.mat : 'Material',
    farbe: (e) => { const [h, A] = g3Mats(g3Zeile(e)); if (D2 && G3.mat) return A.includes(G3.mat) ? (G3MATF[G3.mat] || '#c2694b') : null; return h ? (G3MATF[h] || g3Farbe(h)) : null; },
    legende: D2 && G3.mat ? [[G3MATF[G3.mat] || '#c2694b', 'enthält ' + G3.mat], ['#d6d8da', 'enthält es nicht']] : leg((e) => { const h = g3Mats(g3Zeile(e))[0]; return h ? [h, G3MATF[h] || g3Farbe(h)] : null; }) });
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
    { key: 'lage', name: 'Außen / innen', farbe: '#d9534f', werte: (e) => { const z = g3Zeile(e); return z && typeof z.aussen === 'boolean' ? [z.aussen ? 'außen' : 'innen'] : []; } },
    { key: 'mat', name: 'Material', farbe: '#b08a5e', werte: (e) => g3Mats(g3Zeile(e))[1] },
    { key: 'auf', name: 'Aufbau', farbe: '#e3a23b', werte: (e) => { const z = g3Zeile(e); return z && z.kurz ? [z.kurz.slice(0, 60)] : []; } }],
  () => (G3.N ? G3.N.e : []), (e) => `${g3Name(e)} ${g3Nr(e)} ${(g3Zeile(e) || {}).kurz || ''}`, () => g3Liste(G3.liste));
  const [kopf, lb] = g3Fach(box, G3.FL), k = G3.farbe, M = new Map(), E = G3.FL ? G3.N.e.filter((e) => G3.FL.pruefe(e)) : G3.N.e;
  E.forEach((e) => { const g = g3Gruppe(e, k); (M.get(g) || M.set(g, []).get(g)).push(e); });
  const G = [...M.entries()].sort((a, b) => (k === 'g-aend' && a[0] === 'nicht geändert' ? 1 : k === 'g-aend' && b[0] === 'nicht geändert' ? -1 : a[0].localeCompare(b[0], 'de', { numeric: true })));
  const D2 = (G3.E || {}).d === 'd2' && k === 'g-mat';
  kopf.innerHTML = `<b>Bauteile einzeln</b><span class="mute">${E.length === G3.N.e.length ? G3.N.e.length + ' im Plan' : E.length + ' von ' + G3.N.e.length}</span>`;
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
  V.className = 'gm-bt bp-voll'; V.innerHTML = '<div class="gm-d3"></div><div class="gm-tab" hidden></div>';
  Object.assign(G3, { N: null, D3: null, zu: new Map(), sel: null, liste: null, aend: null, FL: null, FA: null, hvF: false, farbe: LS.get('farbe') || 'g-art' });
  const fD3 = V.querySelector('.gm-d3'), fT = V.querySelector('.gm-tab');
  try { G3.E = await api('api/bp/modell/einst'); } catch { G3.E = { a: 'a1', b: 'b1', c: 'c2', d: 'd2', e: 'e1', f: 'f1' }; }
  if (lauf !== G3.lauf) return;
  const zuordnen = (Z) => { G3.zu = new Map(); (Z || []).forEach((z) => (z.ids || []).forEach((i, k) => G3.zu.set(+i, { z, nr: (z.nummern || [])[k] || '' }))); };
  let erst = true;
  BT = bpBauteile.mount(fT, PID, { einlesen: true, baum: true, raeume: () => gmWeg('raeume'),
    nachher: () => {
      if (lauf !== G3.lauf || !fT.isConnected) return;   // Seite inzwischen neu aufgebaut – dieser Stand gilt nicht mehr
      leiste(); const b = NAV.querySelector('.gm-vm'); if (b) BT.menue(b);
      const st = BT.zustand(); zuordnen(st.zeilen);
      if (st.an || !(st.zeilen || []).length) { G3.zwang = true; g3Mitte('tabelle', true); }   // Entwurf offen oder noch nichts da: Tabelle
      else if (erst || G3.zwang) { G3.zwang = false; g3Mitte(LS.get('mitte') || '3d', true); }   // danach wieder, was die Person gewählt hat
      if (G3.D3) { if (st.rev !== G3.rev) { G3.D3.neu(st.zeilen || []); G3.D3.farben(g3Modi()); } }   // nur bei neuem Stand – nicht bei jedem Klick in der Tabelle
      else if (!st.an && (st.zeilen || []).length && G3.mitte === '3d') g3Laden(fD3, st);
      if (zeige) { const z = zeige; zeige = null; BT.zeige(z, true); const x = (st.zeilen || []).find((y) => y.id === z); if (x && G3.D3) G3.D3.waehle(x.ids || []); }
      G3.rev = st.rev; erst = false; g3Liste(G3.liste);
    },
    auswahl: (z) => { if (z && window.seiteReiter) seiteReiter('gm', 'details'); if (window.seiteFuellen) seiteFuellen('gm', 'details'); if (G3.D3) G3.D3.waehle(z ? z.ids || [] : []); } });
  if (window.seite) {
    seite(WORK, 'gm', [{ id: 'details', titel: 'Bauteil', mount: (el) => { el.innerHTML = '<div class="g3-det"></div><div class="g3-li"></div>'; BT.details(el.firstChild); G3.liste = el.lastChild; g3Liste(G3.liste); } },
      { id: 'aend', titel: 'Änderungen', mount: (el) => { G3.aend = el; el.classList.add('g3-aend'); g3AendLaden(); } },
      { id: 'fragen', titel: 'Fragen und Antworten', mount: async (el) => { await baustein('fragen.js', 'bpFragen'); bpFragen.mount(el, PID, { aendern: true }); } }, seite.planung], { start: 'details', w: 0.62, minL: 520, min: 340, planung: false });
  }
}
function g3Laden(feld, st) {
  if (!feld.isConnected) return;
  const F = (G3.E || {}).f || 'f1';
  G3.D3 = bp3d.mount(feld, { url: `api/bp/modell/${PID}/netz`, zeilen: st.zeilen || [], modi: g3Modi(), start: G3.farbe, wahl: true, info: g3Info,
    spreizen: F === 'f2' ? 'aussen' : 'alle', spreizWahl: F !== 'f2', teil: (e) => { const z = g3Zeile(e); return z ? z.teil || '' : ''; },
    geladen: (N) => { G3.N = N; g3Liste(G3.liste); if (G3.D3) G3.D3.farben(g3Modi()); },
    onWahl: (ids, e) => { if (!e) { G3.sel = null; g3Liste(G3.liste); return; } g3Waehle(e.i, true); } });
  feld.addEventListener('click', (ev) => { const b = ev.target.closest('[data-b3f]'); if (b) { G3.farbe = b.dataset.b3f; LS.set('farbe', G3.farbe); setTimeout(() => g3Liste(G3.liste), 0); } });
  baustein('uwert.js', 'bpUwert').then(() => bpUwert.holen(`api/bp/modell/${PID}`, st.rev)).then((U) => { G3.uw = U || {}; if (G3.D3) G3.D3.farben(g3Modi()); }).catch(() => {});
  api(`api/bp/modell/${PID}/aenderungen`).then((r) => { G3.AE = r.aenderungen || []; if (G3.D3) G3.D3.farben(g3Modi()); }).catch(() => {});
}
/* Mitte: 3D oder Tabelle (Befehlsleiste „Ansicht“) – gemerkt je Person; erzwungen = vom Zustand gewählt, nicht gemerkt */
function g3Mitte(w, erzwungen) {
  const d = V.querySelector('.gm-d3'), t = V.querySelector('.gm-tab'); if (!d || !t) return;
  G3.mitte = w; d.hidden = w !== '3d'; t.hidden = w === '3d';
  if (!erzwungen) LS.set('mitte', w);
  if (w === '3d' && !G3.D3 && BT) { const st = BT.zustand(); if ((st.zeilen || []).length && !st.an) g3Laden(d, st); }
  leiste();
}

WORK.addEventListener('click', async (e) => {
  const g = e.target.closest('[data-g3auf]'); if (g) { const k = g.dataset.g3auf; if (G3.offen.has(k)) G3.offen.delete(k); else G3.offen.add(k); return g3Liste(G3.liste); }
  const r = e.target.closest('[data-g3e]'); if (r) return g3Waehle(+r.dataset.g3e, false);
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
const g3EinstMelden = () => { if (window.BPHead && BPHead.appEinstellungen) BPHead.appEinstellungen([{ key: 'bauteile', label: 'Seite „Bauteile“: Änderungen, Material, Liste, Wände', render: (h) => g3Einst(h) }]); };   // nach header() (gebaeudemodell.js)
