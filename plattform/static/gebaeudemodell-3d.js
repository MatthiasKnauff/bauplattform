'use strict';
/* Gebäudemodell – Seite „Gebäude“ (Mocks „Gebäude bearbeiten“ und „Räume rechts“, GO 21.11.2026 abends):
   Mitte nur Grafik – 3D (bp/ansicht3d.js; ohne Plan der Baukasten bp/gebaeudekasten.js) oder Grundriss (gebaeudemodell-grundriss.js).
   Oben links im 3D der Schalter „Gebäude bearbeiten“ (nur Baukasten, an beim Öffnen; bei einem Plan aus einer Datei grau): an = die Form ändern,
   rechts „Baukörper“ (Hineinziehen, Maße, Befehle) und „Räume“ nur zum Lesen; aus = Aufbauten belegen, rechts „Bauteile“ – der Baum wie im LV
   (bp/bauteile.js: Gruppieren, Dreieck = Aufbau wählen, Doppelklick = Eigenschaften-Fenster; darüber „Fenster & Türen einzeln“) – und „Räume“.
   Färbungen: U-Wert und Maßnahmen. Mehrere Bauteile (Strg, Rahmen) → im Baum gemeinsam ändern.
   Nutzt aus gebaeudemodell.js: PID, BT, WORK, V, LS, baustein, leiste. Einstellungen im Kern: bpcore/modell_einst.py. */
const G3 = { N: null, D3: null, zu: new Map(), E: null, uw: {}, mitte: null };
const G3ART = { w: 'Wand', f: 'Fenster', d: 'Tür', s: 'Decke / Platte', r: 'Dach', x: 'Sonstiges', o: 'Öffnung' };

const g3Zeile = (e) => { const x = G3.zu.get(e.i); return x ? x.z : null; };
const g3Nr = (e) => { const x = G3.zu.get(e.i); return x ? x.nr : ''; };
const g3Name = (e) => { const z = g3Zeile(e); return z ? z.name : (G3ART[e.t] || 'Bauteil') + ' aus dem Plan'; };
const g3Gesch = (e) => ((G3.N && G3.N.geschosse[e.g]) || {}).n || 'Geschoss ' + ((e.g || 0) + 1);

function g3Modi() {
  const M = [];   // Färbungen nur noch U-Wert (+ Maßnahmen im Baustein) – Bauteilart, Außen/innen, Himmelsrichtung, gleicher Aufbau, Material sind Filter der Liste (Mock „schlank“)
  const ust = (e) => { const z = g3Zeile(e), u = z && G3.uw[z.id]; if (!u || u.u == null || !u.anf) return null; const r = Math.round(u.u * 100) / 100; return r <= u.anf.u + 1e-9 ? 'g' : u.u <= u.anf.u * 1.1 ? 'y' : 'r'; };
  M.push({ key: 'g-uw', name: 'U-Wert', farbe: (e) => ({ g: '#58b368', y: '#e9b949', r: '#d9534f' }[ust(e)] || null), legende: [['#58b368', 'hält die Anforderung ein'], ['#e9b949', 'bis 10 % darüber'], ['#d9534f', 'darüber'], ['#d6d8da', 'ohne U-Wert']] });
  return M;
}
function g3Info(e) {
  const z = g3Zeile(e), h = window.bpBauteile ? bpBauteile.material(z) : '';
  return `<b>${esc(g3Name(e))}${g3Nr(e) ? ' · ' + esc(g3Nr(e)) : ''}</b>${esc(g3Gesch(e))}${z && z.teil ? ' · ' + esc(z.teil) : ''}${z && z.kurz ? `<br><small>${esc(z.kurz)}</small>` : ''}${h ? `<br><small>Hauptschicht: ${esc(h)}</small>` : ''}`;
}

/* Art je Bauteil (22.11.2026: „eine Außenwand wird als Innenwand erkannt“): im 3D gewählte Bauteile umstellen – Kern modell_plus PUT /artje,
   gemerkt je GlobalId, die Bauteile wandern in die Zeile ihrer neuen Art. Rechtsklick im 3D und „Art ▾“ im Eigenschaften-Fenster (bauteile.js opt.artJe). */
const G3ARTEN = [['331', 'Außenwand tragend'], ['332', 'Außenwand nichttragend'], ['341', 'Innenwand tragend'], ['342', 'Innenwand nichttragend'], ['322', 'Bodenplatte'], ['351', 'Decke'], ['361', 'Dach']];
const g3Fam = (kg) => (['331', '332', '341', '342'].includes(String(kg)) ? G3ARTEN.slice(0, 4) : ['322', '351', '361'].includes(String(kg)) ? G3ARTEN.slice(4) : []);
async function g3Art(ids, kg) {
  const alt = new Map(ids.map((i) => [i, String(((G3.zu.get(+i) || {}).z || {}).kg || '')]));
  const tu = async (I, k) => { await api(`api/bp/modell/${PID}/artje`, 'PUT', { ids: I, kg: k }); if (BT && BT.laden) await BT.laden(); };
  try {
    await tu(ids, kg);
    const name = (G3ARTEN.find((a) => a[0] === kg) || [, kg])[1];
    if (window.rueckgaengig) rueckgaengig(`${ids.length === 1 ? 'Bauteil' : ids.length + ' Bauteile'}: Art „${name}“`, async () => { for (const k of new Set(alt.values())) if (k) await tu(ids.filter((i) => alt.get(i) === k), k); }, 10000, () => tu(ids, kg));
  } catch (e) { toast(e.message, true); }
}
function g3ArtPunkte(e, P) {   // Rechtsklick im 3D: gewählte Bauteile (oder das unter der Maus) umstellen
  const z = e && g3Zeile(e); if (!z || G3.an) return;
  const F = g3Fam(z.kg); if (!F.length) return;
  const ids = G3.wahl && G3.wahl.includes(e.i) ? G3.wahl.filter((i) => g3Fam(((G3.zu.get(i) || {}).z || {}).kg).length) : [e.i];
  P.push({ titel: `Art ${ids.length === 1 ? 'dieses Bauteils' : `der ${ids.length} gewählten Bauteile`}` });
  F.forEach(([k, n]) => P.push({ text: n + (String(z.kg) === k && ids.length === 1 ? ' ✓' : ''), fn: () => g3Art(ids, k) }));
}

/* 3D gewählt → dieselben Zeilen im Baum rechts (einzeln: Zeile zeigen, mehrere: gemeinsam ändern) */
const g3Frisch = () => G3.vom3d && Date.now() - G3.vom3d < 400;   // Auswahl kommt gerade aus dem 3D
function g3Ids(ids) {
  G3.wahl = (ids || []).map((i) => +i);   // einzelne Bauteile im 3D – für „Art“ je Bauteil (g3Art)
  G3.vom3d = Date.now();   // die Zeilen folgen rechts – das 3D behält die angeklickten Bauteile (22.11.2026: sonst leuchtete die ganze Zeile, Wände wirkten „zusammengefügt“)
  const Z = [...new Set((ids || []).map((i) => (G3.zu.get(+i) || {}).z).filter(Boolean).map((z) => z.id))];
  if (!BT || !Z.length) return;
  if (window.seiteReiter && !(G3.bk && G3.bearb)) seiteReiter('gm', 'details');
  if (Z.length > 1) BT.mehr(Z); else if (!((ids || []).length === 1 && BT.element(+ids[0]))) BT.zeige(Z[0], false);   // genau ein Bauteil: diese Wand im Baum (darunter einzeln)
}
/* Geschoss je Bauteil aus dem Netz (Zuordnung im IFC, netz.geschosse) – für den Baum: einzelne Bauteile, Gruppieren nach Geschoss */
function g3ElInfo(i) {
  const N = G3.N; if (!N || !N.e) return null;
  if (G3.eMapN !== N) { G3.eMap = new Map(N.e.map((e) => [+e.i, e])); G3.eMapN = N; }
  const e = G3.eMap.get(+i); if (!e) return null;
  const g = (N.geschosse || [])[e.g]; return g ? { g: g.n, gi: e.g } : {};
}

async function bauteile3d(zeige) {
  const lauf = G3.lauf = (G3.lauf || 0) + 1;   // wird die Seite währenddessen neu aufgebaut, bricht dieser Lauf ab
  await Promise.all([baustein('bauteile.js', 'bpBauteile'), baustein('baum.js', 'bpBaum'), baustein('ansicht3d.js', 'bp3d')]);
  if (lauf !== G3.lauf) return;
  V.className = 'gm-bt bp-voll'; V.innerHTML = '<div class="gm-d3"></div><div class="gm-gr" hidden></div>';   // Mitte nur Grafik: 3D oder Grundriss (E1, 21.11.2026)
  /* rechts (C, R-A): Reiter „Bauteile“ = der Baum (bp/bauteile.js) samt „Fenster & Türen einzeln“, Reiter „Räume“ = die Raumliste – beide Elemente
     entstehen hier einmal und ziehen beim Öffnen des Reiters dorthin um (der Baum bleibt derselbe, auch beim Wechsel der Reiter) */
  const bE = document.createElement('div'); bE.className = 'gm-r';
  bE.innerHTML = '<div class="gm-rk" role="group" aria-label="Bauteile"><button type="button" data-gmrk="baum" class="on" aria-pressed="true">Alle Bauteile</button><button type="button" data-gmrk="fenster" aria-pressed="false">Fenster &amp; Türen einzeln</button><span class="gm-trf"></span><button type="button" class="btn sm" data-gmneu="fenster" hidden>＋ Fenster / Tür</button></div><div class="gm-tabi"></div><div class="gm-li gm-li-f" hidden></div>';
  const rE = document.createElement('div'); rE.className = 'gm-r';
  rE.innerHTML = '<div class="gm-rk"><span class="gm-trf"></span><button type="button" class="btn sm" data-gmneu="raeume">＋ Raum</button></div><div class="gm-li gm-li-r"></div>';
  Object.assign(G3, { N: null, D3: null, BK: null, bk: null, an: null, bkD: null, zu: new Map(), rev: null, liRev: null, btE: bE, raE: rE, bearb: true, farbe: ['massnahme', 'modell', 'g-uw'].includes(LS.get('farbe')) ? LS.get('farbe') : 'massnahme' });   // B: „Gebäude bearbeiten“ an beim Öffnen
  const fT = bE.querySelector('.gm-tabi');
  if (!G3.E) G3.E = await api('api/bp/modell/einst');   // einmal je Seite – Vorgaben im Kern (modell_einst.EINST); ändern über g3Einst
  if (lauf !== G3.lauf) return;
  const zuordnen = (Z) => { G3.zu = new Map(); (Z || []).forEach((z) => (z.ids || []).forEach((i, k) => G3.zu.set(+i, { z, nr: (z.nummern || [])[k] || '' }))); };
  let erst = true;
  BT = bpBauteile.mount(fT, PID, { einlesen: true, baum: true, einzeln: true, elementInfo: g3ElInfo, element: (i) => { if (G3.D3 && !g3Frisch()) { G3.wahl = [+i]; G3.D3.waehle([+i]); } },
    artJe: g3Art, e3: () => G3.wahl || [], raeume: () => gmWeg('raeume'), baukasten: () => gmWeg('baukasten'),
    nachher: () => {
      if (lauf !== G3.lauf || G3.btE !== bE) return;   // Seite inzwischen neu aufgebaut – dieser Stand gilt nicht mehr (der Baum steht rechts, nicht im Dokument geprüft)
      leiste(); const b = NAV.querySelector('.gm-vm'); if (b) BT.menue(b);
      const st = BT.zustand(), ZZ = g3Zeilen(st); zuordnen(ZZ);
      /* eine 3D-Ansicht: ohne Plan der Baukasten, mit Plan das Modell aus dem Plan (E1); ein angesehener Planstand, der nicht gilt, nur zum Ansehen
         (21.11.2026) – 3D, Grundriss, Bauteile, Räume, Fenster & Türen bleiben bei ihm, bis „Zurück zum gültigen“ oder „gelten lassen“ */
      /* ohne jeden Planstand ist die Mitte leer (21.11.2026: nach dem Löschen stand sonst das alte Gebäude da) – angefangen wird über „Wie willst du beginnen?“ */
      const bk = (!st.plan && !st.an && st.planstaende > 0) || !!G3.bkNeu, an = st.an && !G3.bkNeu ? st.an.id : null;   // bkNeu: „Neuer Planstand – mit dem Baukasten“, bis er gespeichert ist
      if (G3.bk !== null && (G3.bk !== bk || G3.an !== an || G3.gilt !== st.gilt)) g3Neu(bk, an);   // auch ein anderer gültiger Planstand (gelöscht, gelten lassen): 3D neu
      if (G3.bk === null) { G3.bk = bk; G3.an = an; g3Seite(); }
      G3.gilt = st.gilt;
      if (erst) g3Mitte(LS.get('mitte') === 'grundriss' ? 'grundriss' : '3d', true);
      g3Leer(!bk && !st.an && !ZZ.length);   // noch kein Planstand: in der Mitte der Einstieg „Wie willst du beginnen?“
      if (G3.liRev !== `${st.rev}|${an}`) g3Listen();   // Räume, Fenster & Türen rechts: nur bei neuem Stand neu
      if (G3.D3 && !G3.bk) { if (st.rev !== G3.rev) { G3.D3.neu(ZZ); G3.D3.farben(g3Modi()); } }   // nur bei neuem Stand – nicht bei jedem Klick in der Tabelle
      if (G3.rev && st.rev !== G3.rev && st.rev !== G3.uwRev) g3Uw(st.rev);   // neuer Stand: U-Werte neu (Plan und Baukasten)
      if (G3.mitte === 'grundriss' && G3.rev && st.rev !== G3.rev) gmGrundriss(V.querySelector('.gm-gr'), true);
      if (zeige) { const z = zeige; zeige = null; if (window.seiteReiter) seiteReiter('gm', 'details'); BT.zeige(z, z !== '__rw'); const x = ZZ.find((y) => y.id === z); if (x && G3.D3) G3.D3.waehle(x.ids || []); }
      G3.rev = st.rev; erst = false;
    },
    auswahl: (z) => { if (G3.D3 && !g3Frisch()) G3.D3.waehle(z ? z.ids || [] : []); },   // der Baum steht selbst rechts – nur das 3D folgt
    mehr: (ids) => {   // mehrere Zeilen gewählt (Haken, Strg + Klick): im 3D alle hervorheben, rechts die gemeinsamen Felder
      if (G3.D3 && !g3Frisch()) { const Z = g3Zeilen(BT.zustand()).filter((z) => ids.includes(z.id)); G3.D3.waehle(Z.flatMap((z) => z.ids || [])); }
    } });
}
const g3Zeilen = (st) => (st.an ? (st.an.liste || {}).zeilen || [] : st.zeilen || []);
function g3Neu(bk, an) {   // Planstand gewechselt (gilt jetzt, angesehen, zurück): Mitte neu – die Tabelle bleibt
  if (G3.BK) G3.BK.weg();   // der bisherige Baukasten wird abgebaut: sein wartendes Speichern gilt nicht mehr
  Object.assign(G3, { D3: null, BK: null, bkD: null, N: null, bk, an, rev: null });
  const d = g3Feld(); if (d) d.innerHTML = '';
  if (typeof GR !== 'undefined') GR.F = null;
  g3Seite(); if (G3.mitte) g3Mitte(G3.mitte, true);
}
/* Bereich rechts (Mock „Gebäude bearbeiten“ B C, „Räume rechts“ R-A R-E, 21.11.2026): „Gebäude bearbeiten“ an (nur Baukasten) →
   Baukörper (Hineinziehen, Maße, Befehle) · Räume (nur lesen); aus bzw. Plan aus einer Datei → Bauteile (der Baum) · Räume; dazu Fragen, Planung */
function g3Seite() {
  if (!window.seite) return;
  const form = !!G3.bk && G3.bearb;
  const R = form ? [{ id: 'koerper', titel: 'Baukörper', mount: (el) => { el.innerHTML = ''; if (G3.bkD) el.appendChild(G3.bkD); } }]
    : [{ id: 'details', titel: 'Bauteile', fenster: false, mount: (el) => { el.innerHTML = ''; el.appendChild(G3.btE); if (BT) requestAnimationFrame(() => BT.zeigen()); } }];
  R.push({ id: 'raeume', titel: 'Räume', fenster: false, mount: (el) => { el.innerHTML = ''; el.appendChild(G3.raE); g3Listen(true); } }, FRAGEN_R, seite.planung);
  seite(WORK, 'gm', R, { start: form ? 'koerper' : 'details', w: 0.62, minL: 520, min: 340, planung: false });
}
/* Räume und „Fenster & Türen einzeln“ rechts – gezeichnet, wenn ihr Platz zu sehen ist; bei „Gebäude bearbeiten“ an sind die Räume nur zu lesen (R-E) */
async function g3Listen(jetzt) {
  const st = BT ? BT.zustand() : {}; G3.liRev = `${st.rev}|${st.an ? st.an.id : null}`;
  const r = G3.raE.querySelector('.gm-li-r'), f = G3.btE.querySelector('.gm-li-f');
  if (r.isConnected || jetzt) { await gmListe('raeume', null, true); if (G3.bk || st.planart === 'hand') gmNurLesen(r, true); }   // G4-A (22.11.2026): ohne Plan keine Arbeitsmaske – Räume entstehen im Grundriss
  if (!f.hidden) await gmListe('fenster', null, true);
}
function gmNurLesen(C, grundriss) {
  C.querySelectorAll('input,select,textarea,button').forEach((x) => { x.disabled = true; });
  const n = G3.raE.querySelector('[data-gmneu]'); if (n) n.hidden = !!grundriss, n.disabled = true;
  if (!C.querySelector('.gm-lesen')) C.insertAdjacentHTML('afterbegin', grundriss ? `<p class="mute gm-lesen">Räume entstehen im Grundriss: Innenwand ziehen, Doppelklick in eine Fläche = Name.${G3.bk ? ' <button type="button" class="bt-lk" data-gmgr>Zum Grundriss</button>' : ' Ältere Räume von Hand bleiben lesbar – weiterbauen mit „Neuer Plan … → Mit dem Baukasten“.'}</p>`
    : '<p class="mute gm-lesen">Nur zum Lesen – Räume ändern: oben im 3D „Gebäude bearbeiten“ ausschalten.</p>');
  const g = C.querySelector('[data-gmgr]'); if (g) { g.disabled = false; g.onclick = () => g3Mitte('grundriss'); }
}
function g3Bearb(an) {   // Schalter „Gebäude bearbeiten“ (A1) – nur im Baukasten; ein Plan aus einer Datei hat seine Form aus der Datei (D1)
  if (!G3.bk) return;
  G3.bearb = an; if (G3.BK) G3.BK.bearbeiten(an);
  const n = G3.raE.querySelector('[data-gmneu]'); if (n) n.disabled = false;
  g3Seite(); g3Listen(); g3Knopf();
}
const g3KnopfHtml = () => `<button type="button" data-gmbearb class="b3-bearb${G3.bk && G3.bearb ? ' on' : ''}" aria-pressed="${!!(G3.bk && G3.bearb)}"${G3.bk ? ' title="An: die Form des Gebäudes ändern (Geschosse, Anbauten, Fenster) · Aus: den Bauteilen Aufbauten geben"' : ' disabled title="Die Form kommt aus der Datei – hier nur Aufbauten belegen"'}><i></i>Gebäude bearbeiten</button>`;
function g3Knopf() { const b = (g3Feld() || document).querySelector('[data-gmbearb]'); if (b) b.outerHTML = g3KnopfHtml(); }
function g3Leer(an) {   // noch kein Planstand: Einstieg mitten auf der Fläche (statt der früheren Tabelle)
  const d = V.querySelector('.gm-d3'); if (!d) return; let h = d.querySelector(':scope > .gm-start');
  if (!an) { if (h) h.remove(); return; }
  if (!h) { h = document.createElement('div'); h.className = 'gm-start'; h.innerHTML = '<p>Noch kein Gebäude in diesem Projekt.</p><button type="button" class="btn primary" data-gmstart>Wie willst du beginnen? …</button>'; d.appendChild(h); }
}
function g3Laden(feld, st) {
  if (!feld.isConnected) return;
  const F = (G3.E || {}).f || 'f1', D3O = { vorne: g3KnopfHtml, abdocken: { zurueck: g3Ab(), fn: g3Abdocken }, doppel: (e) => { const x = G3.zu.get(e.i); if (x && BT) BT.eigenschaften(x.z.id); }, zeilen: g3Zeilen(st), modi: g3Modi(), start: G3.farbe, info: g3Info, spreizen: F === 'f2' ? 'aussen' : 'alle', spreizWahl: F !== 'f2', teil: (e) => { const z = g3Zeile(e); return z ? z.teil || '' : ''; } };
  g3Extras(st);
  if (G3.bk) {   // ohne Plan: das Gebäude im Baukasten bauen – dieselbe 3D-Ansicht (A1), Angaben und Korb rechts
    G3.BK = bpBaukasten.mount(feld, PID, { seite: ({ detail }) => { G3.bkD = detail; const b = document.querySelector('.g3-bk'); if (b) b.appendChild(detail); },
    eigenschaften: (ids) => {   // „Aufbau …“ beim Baukörper → Eigenschaften-Fenster der Zeile(n) dieser Bauteile
      const Z = [...new Set(ids.map((i) => (G3.zu.get(+i) || {}).z).filter(Boolean).map((z) => z.id))]; if (!Z.length || !BT) return toast('Zu diesem Bauteil gibt es noch keine Zeile – erst speichern lassen.', true);
      if (Z.length > 1) { BT.mehr(Z); BT.eigenschaften(null); } else BT.eigenschaften(Z[0]); },
    d3: { ...D3O, geladen: (N) => { G3.N = N; if (G3.BK) G3.D3 = G3.BK.d3; if (BT && BT.zeigen) BT.zeigen(); }, onWahl: (ids) => { if (G3.bearb) { if (ids && ids.length && window.seiteReiter) seiteReiter('gm', 'koerper'); } else g3Ids(ids); } },
    neu: !!G3.bkNeu, planung: G3.bkNeu === 'planung', bearbeiten: G3.bearb,   // an: Gewähltes unter „Baukörper“, aus: die Zeile im Baum
    nachher: () => { G3.bkNeu = false; if (BT && BT.laden) BT.laden(); } });
    return;
  }
  G3.D3 = bp3d.mount(feld, { ...D3O, url: `api/bp/modell/${PID}/netz${st.an ? '?planstand=' + st.an.id : ''}`, wahl: true,
    geladen: (N) => { G3.N = N; if (G3.D3) G3.D3.farben(g3Modi()); if (BT && BT.zeigen) BT.zeigen(); },   // Geschosse je Bauteil sind jetzt da – Baum neu (einzelne Bauteile, Gruppe Geschoss)
    kontext: g3ArtPunkte, onWahl: (ids) => g3Ids(ids) });
}
function g3Extras(st) {   // Färbung merken, U-Werte nachladen – für Plan und Baukasten gleich
  const feld = g3Feld();
  if (feld && !feld.dataset.f) { feld.dataset.f = '1'; feld.addEventListener('click', (ev) => { const b = ev.target.closest('[data-b3f]'); if (b) { G3.farbe = b.dataset.b3f; LS.set('farbe', G3.farbe); }   // bp3d hat die Färbung schon umgestellt (Klick kommt von innen)
    if (ev.target.closest('[data-gmbearb]')) g3Bearb(!G3.bearb); }); }
  g3Uw(st.rev);
}
/* U-Werte der Färbung – bei jedem neuen Stand neu (21.11.2026: vorher nur beim Aufbau des 3D, ein geänderter Aufbau färbte erst nach dem Neuladen um) */
function g3Uw(rev) {
  G3.uwRev = rev;
  baustein('uwert.js', 'bpUwert').then(() => bpUwert.holen(`api/bp/modell/${PID}`, rev)).then((U) => { if (G3.uwRev !== rev) return; G3.uw = U || {}; if (G3.D3) G3.D3.farben(g3Modi()); }).catch(() => {});
}
/* 3D abdocken (21.11.2026, A1 B3): ⧉ in der Leiste des 3D legt es in ein eigenes Browserfenster (seiteFenster, auch zweiter Bildschirm) –
   die Mitte zeigt dann, was zuletzt unter Tabelle/Grundriss gewählt war; ↙ bzw. Fenster schließen holt es zurück. */
const g3Ab = () => !!G3.ab && !G3.ab.closed;
const g3Feld = () => (g3Ab() ? G3.abF : V.querySelector('.gm-d3'));
function g3Abdocken() {
  if (g3Ab()) { G3.ab.close(); return; }   // ↙: pagehide → g3Zurueck
  if (!window.seiteFenster) return;
  const w = seiteFenster('gm3d', `3D – ${document.title}`, (el, x, wieder) => { G3.abF = el; if (wieder) { g3Neu(G3.bk, G3.an); g3Mitte('grundriss', true); } }, g3Zurueck); if (!w) return;   // wieder: F5 im Fenster – das 3D dort neu aufbauen
  const alt = V.querySelector('.gm-d3'); if (alt) alt.innerHTML = '';   // das 3D zieht ganz um – in der Mitte bleibt nichts stehen
  G3.ab = w;
  g3Neu(G3.bk, G3.an); g3Mitte('grundriss', true);
}
function g3Zurueck() { if (!G3.ab) return; G3.ab = null; G3.abF = null; if (!V.querySelector('.gm-d3')) return; g3Neu(G3.bk, G3.an); g3Mitte('3d'); }
/* Mitte: 3D · Grundriss (links in der Navigation, E1 21.11.2026 – keine Tabelle mehr) – gemerkt je Person; erzwungen = vom Zustand gewählt, nicht gemerkt */
async function g3Mitte(w, erzwungen) {   // Grundriss im Baukasten (Etappe 5): auch dann den Baukasten aufbauen – er rechnet und speichert, wenn das 3D verdeckt ist
  const d = V.querySelector('.gm-d3'), g = V.querySelector('.gm-gr'); if (!d || !g) return;
  if (w !== 'grundriss') w = '3d';
  if (w === '3d' && g3Ab()) { try { G3.ab.focus(); } catch { /* egal */ } w = 'grundriss'; }   // abgedockt: das Fenster nach vorn, die Mitte zeigt den Grundriss
  G3.mitte = w; d.hidden = w !== '3d'; g.hidden = w !== 'grundriss';
  if (!erzwungen) LS.set('mitte', w);
  if ((w === '3d' || g3Ab() || (w === 'grundriss' && G3.bk)) && !G3.D3 && !G3.BK && !G3.baut && BT) { const st = BT.zustand(); if (G3.bk || g3Zeilen(st).length) {
    /* „wird aufgebaut“ VOR dem Nachladen vermerken: zwischen Prüfen und Aufbauen liegt das Warten auf die Bausteine – ohne Vermerk kam ein
       zweiter Aufruf (Bauteile geladen, während „Neuer Planstand“ lief) ebenfalls durch, es entstanden zwei Baukästen und zwei Planstände (21.11.2026) */
    G3.baut = true; try { await Promise.all([baustein('ansicht3d.js', 'bp3d'), G3.bk ? baustein('gebaeudekasten.js', 'bpBaukasten') : null]); g3Laden(g3Feld(), BT.zustand()); } finally { G3.baut = false; } if (g3Ab()) seiteFenster.stil(G3.ab); } }
  if (w === 'grundriss') gmGrundriss(g);   // gebaeudemodell-grundriss.js
  leiste(); nav();   // links den passenden Punkt markieren
}

/* Einstellungen der App (Verwaltung → Einstellungen → Gebäudemodell): E und F mit sinnvoller Vorgabe (A–C entfielen mit dem Reiter „Änderungen“) */
const G3EINST = [['f', 'Wände auseinanderspreizen', [['f1', 'alle Wände, mit Umschalter „nur Außenwände“'], ['f2', 'nur Außenwände, ohne Umschalter']]]];
async function g3Einst(host) {
  let E; try { E = await api('api/bp/modell/einst'); } catch (e) { host.textContent = e.message; return; }
  host.innerHTML = '<p class="bph-mu">Gilt fürs ganze Büro. Vorgabe: F1.</p>' + G3EINST.map(([k, t, O]) => `<fieldset class="g3-ef"><legend>${k.toUpperCase()} · ${esc(t)}</legend>${O.map(([w, x]) => `<label><input type="radio" name="g3e-${k}" value="${w}"${E[k] === w ? ' checked' : ''}> ${w.toUpperCase()}: ${esc(x)}</label>`).join('')}</fieldset>`).join('');
  host.addEventListener('change', async (e) => { const r = e.target; if (r.type !== 'radio') return;
    try { G3.E = await api('api/bp/modell/einst', 'PUT', { werte: { [r.name.slice(4)]: r.value } }); toast('Gespeichert.'); } catch (er) { toast(er.message, true); } });
}
const g3EinstMelden = () => { if (window.BPHead && BPHead.appEinstellungen) BPHead.appEinstellungen([{ key: 'bauteile', label: 'Gebäude: Liste, Wände', render: (h) => g3Einst(h) }, { key: 'kurzwahl', label: 'Kurzwahl der Aufbauten', render: (h) => kurzwahlEinst(h) }, { key: 'gelernt', label: 'Gelerntes aus dem Planungsassistenten', render: (h) => gelernt(h) }]); };   // Gelerntes (D1)   // nach header() (gebaeudemodell.js)
/* Aufbau im Eigenschaften-Fenster geändert, während der Baukasten zeigt (I1, 21.11.2026): der Kern führt den Aufbau im Baukasten nach (bauteile_zeile → korb),
   der Baukasten lädt neu – so folgt die Dicke im 3D */
window.addEventListener('bp:bauteile', () => { if (!G3.bk || !G3.BK) return; clearTimeout(G3.bkT); G3.bkT = setTimeout(() => G3.BK && G3.BK.neu(), 400); });
/* Planung gespeichert (bp/assistent.js meldet bp:assistent nach jeder Änderung): der Baukasten folgt sofort – Geschosse, Dach, Keller, Teile, Namen (21.11.2026) */
window.addEventListener('bp:assistent', () => { if (!G3.bk || !G3.BK) return; clearTimeout(G3.bkT); G3.bkT = setTimeout(() => G3.BK && G3.BK.neu(), 300); });
