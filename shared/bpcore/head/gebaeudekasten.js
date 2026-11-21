/* bp/gebaeudekasten.js – Gebäude-Baukasten (GO 20.11.2026, Mock „Gebäude-Baukasten“: A3 B2 C D2 E1 F1/F2 G1 H1) – global bpBaukasten.
   Seit 21.11.2026 (Mock „Baukasten wie 3D“: A1 B3 C1 D2 E1, Leiste als Symbolreihe) dieselbe 3D-Ansicht wie das Modell aus dem Plan
   (bp/ansicht3d.js): dieselbe Maus (ziehen dreht, rechte Taste/Umschalt verschiebt, Rad zoomt), dieselbe Auswahl (Klick, Strg, ▭ Rahmen),
   dieselbe Leiste (Färbungen, Darstellung ▾ mit Geschossen, auseinander, Wände spreizen). Bauteile haben ihre Dicke aus dem Aufbau im Korb
   (Summe der Schichten), ohne Aufbau übliche Werte (DICKE). Befehle (Geschoss, Staffel, Keller, Anbau, entfernen, Dachform) rechts beim
   gewählten Bauteil und per Rechtsklick auf die Stelle (gemeinsames Kontextmenü); Dächer, Gauben, Fenster und Türen aus der Symbolreihe aufs
   Modell ziehen – die passende Stelle leuchtet grün; Maße als Zahlen rechts und an violetten Griffen am Modell (0,5-m-Raster).
   Das Netz rechnet dieser Baustein (eine Stelle für die Geometrie) und gibt es beim Speichern mit – der Kern legt es zum Planstand (B5).
   Nummern wie im Kern (bpcore/baukasten.py, rohbau): Körper b → ID0 + b·20 + Seite (xp, xm, yp, ym), +5 Boden, +6… Dachflächen; Fenster/Türen
   ID0 + 900000 + n, Gauben ID0 + 800000 + 4n – so färben Maßnahmen, U-Wert und Änderungen wie beim Plan.
   bpBaukasten.mount(el, pid, { nachher(antwort), seite({ detail, korb }), d3: { …Optionen für bp3d }, neu: true }) → { neu(), daten(), d3 } */
(function () {
  if (window.bpBaukasten) return;
  const STIL = `.bkx{--linie:var(--line,#d6dce3);--text:var(--ink,#1c2733);--leise:var(--mute,#5d6b7a);--akzent:var(--y,#1f6fb2);--akzent-hell:color-mix(in srgb,var(--akzent) 12%,transparent);
--wahl:#7b2ff7;--wahl-hell:color-mix(in srgb,#7b2ff7 10%,transparent);--rot:var(--red,#c92a2a);--gruen:var(--ok,#2b8a3e);--gruen-hell:color-mix(in srgb,var(--gruen) 10%,transparent);--flaeche:var(--card,#fff);--r:calc(8px*var(--rk,1));display:grid;gap:10px;color:var(--text)}
.bkx .haupt{display:grid;grid-template-columns:minmax(0,1fr) 20rem;gap:12px;align-items:start}.bkx:not(.breit) .haupt,.bkx.eingebettet .haupt{grid-template-columns:minmax(0,1fr)}
.bkx .buehne{position:relative;min-width:0}.bkx .buehne .b3{height:min(74vh,700px);min-height:380px}.bkx.eingebettet{flex:1;min-height:0;height:100%;display:flex;flex-direction:column}.bkx.eingebettet .haupt{flex:1;min-height:0;display:flex}.bkx.eingebettet .buehne,.bkx.eingebettet [data-bk=d3]{flex:1;min-height:0;height:100%}.bkx.eingebettet .buehne .b3{height:100%;min-height:380px}
.bkx .bkx-seite{display:grid;gap:12px;align-content:start;min-width:0}.bkx.bkx-aus{padding:10px;gap:10px}
.bkx .kasten{background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--r);padding:10px 12px;display:grid;gap:8px;min-width:0}
.bkx .kasten h2{font-size:.74rem;text-transform:uppercase;letter-spacing:.07em;color:var(--leise);margin:0;font-weight:600}
.bkx .palk{padding:6px 8px;gap:4px}.bkx .pal{display:flex;flex-wrap:wrap;gap:4px}.bkx .palk.zu .pal,.bkx .palk.zu .hinweis{display:none}
.bkx .palk-k{all:unset;cursor:pointer;font-size:.78rem;color:var(--leise);font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.bkx .stein{display:grid;place-items:center;width:38px;height:32px;border:1px solid var(--linie);border-radius:7px;background:var(--flaeche);cursor:grab;user-select:none;touch-action:none}
.bkx .stein:hover{border-color:var(--akzent)}.bkx .stein:active{cursor:grabbing}.bkx .stein svg{width:30px;height:24px}
.bkx .geist{position:fixed;pointer-events:none;z-index:50;background:var(--flaeche);color:var(--text);border:1px solid var(--akzent);border-radius:7px;padding:4px 8px;font-size:.84rem;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.bkx .bkx-gr{position:absolute;inset:0;pointer-events:none;overflow:hidden}.bkx .griff{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid var(--wahl);background:#fff;border-radius:2px;cursor:grab;pointer-events:auto;box-sizing:border-box}
.bkx .griff:hover,.bkx .griff.zieht{background:var(--wahl)}
.bkx .stand{font-size:.8rem;color:var(--leise);margin:0}
.bkx dl.w{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:0;font-size:.88rem}.bkx dl.w dt{color:var(--leise)}.bkx dl.w dd{margin:0}
.bkx label.feld{display:grid;gap:3px;font-size:.84rem;color:var(--leise)}
.bkx select,.bkx input[type=number]{font:inherit;font-size:.9rem;padding:4px 6px;border:1px solid var(--linie);border-radius:6px;background:var(--inp,var(--flaeche));color:var(--text);width:100%}
.bkx .reihe{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.bkx .chips{display:flex;flex-wrap:wrap;gap:5px}.bkx .chips button,.bkx .kn{font:inherit;font-size:.84rem;border:1px solid var(--linie);background:var(--flaeche);border-radius:14px;padding:.18rem .6rem;cursor:pointer;color:var(--text)}
.bkx .chips button[aria-pressed="true"]{border-color:var(--akzent);background:var(--akzent-hell);color:var(--akzent);font-weight:600}
.bkx .bef{display:flex;flex-wrap:wrap;gap:5px}.bkx .bef button{font:inherit;font-size:.82rem;border:1px solid var(--linie);background:var(--flaeche);border-radius:7px;padding:.2rem .55rem;cursor:pointer;color:var(--text)}
.bkx .bef button:hover{border-color:var(--akzent)}.bkx .weg{color:var(--rot)!important;border-color:#f0c4c4!important}
.bkx .uw{display:flex;align-items:center;gap:8px}.bkx .uw input{width:5.5rem}.bkx .ok{color:var(--gruen);font-weight:600}.bkx .nein{color:var(--rot);font-weight:600}
.bkx .sync{background:var(--gruen-hell);border-color:#b7dcc0}.bkx .sync ul,.bkx .raeume ul{margin:0;padding-left:1.1rem;font-size:.86rem}
.bkx .hinweis{color:var(--leise);font-size:.84rem;margin:0}
.bkx .korb{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 6px;align-items:center;border:1px solid var(--linie);border-radius:7px;padding:5px 7px}
.bkx .korb.an{border-color:var(--wahl);background:var(--wahl-hell)}.bkx .korbn{grid-column:1/-1;text-align:left;font:inherit;font-size:.88rem;background:none;border:0;padding:0;cursor:pointer;color:var(--text)}
.bkx .korbn small{display:block;color:var(--leise);font-size:.78rem}.bkx .korb select{font-size:.8rem;padding:2px 4px}`;
  const ID0 = 9600000, OID = ID0 + 900000, GID = ID0 + 800000;   // wie bpcore/baukasten.ID0 – Nummern der Zeilen (rohbau) treffen das Netz
  const SEITEN = { xp: [1, 0], xm: [-1, 0], yp: [0, 1], ym: [0, -1] }, SK = Object.keys(SEITEN), SNAME = { xp: 'rechts', xm: 'links', yp: 'hinten', ym: 'vorne' }   // wie beim ersten Blick (von vorn links);
  const DICKE = { wand: 0.365, decke: 0.22, boden: 0.25, dach: 0.30, flach: 0.35 };   // E1: ohne Aufbau übliche Werte (m)
  const RAHMEN = ['Holz', 'Kunststoff', 'Holz-Alu', 'Alu'], UW = { Holz: [1.3, 0.9], Kunststoff: [1.2, 0.85], 'Holz-Alu': [1.2, 0.8], Alu: [1.5, 1.0] };
  const VOR = { wand: '331.02', dach: '363.04', flach: '363.09', boden: '322.04', decke: '351.01' };   // wie bpcore/baukasten.VORGABE
  const UMAX = { wand: 0.24, dach: 0.24, fenster: 1.3, boden: 0.3 };   // Anlage 7 GModG (Änderung) – Anzeige
  const DACHF = [['sattel', 'Satteldach', 38], ['walm', 'Walmdach', 35], ['pult', 'Pultdach', 15], ['flach', 'Flachdach', 0]];
  const DFL = { flach: [0], pult: [0], sattel: [0, 1], walm: [0, 1, 2, 3] };   // Dachflächen mit eigenem Aufbau – Reihenfolge wie bpcore/baukasten.FLAECHEN
  const STEINE = [['sattel', 'Satteldach – aufs oberste Geschoss'], ['walm', 'Walmdach'], ['pult', 'Pultdach'], ['flach', 'Flachdach'], ['gaube:Schleppgaube', 'Schleppgaube – auf eine Dachfläche'],
    ['gaube:Satteldachgaube', 'Satteldachgaube'], ['gaube:Flachdachgaube', 'Flachdachgaube'], ['fenster', 'Fenster – auf eine Wand'], ['fenstert', 'Fenstertür'], ['tuer', 'Haustür']];
  const IKON = { 'gaube:Schleppgaube': '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M10 15h9v-5l-9 1z" fill="#d9c7b3" stroke="#5d6b7a"/>', 'gaube:Satteldachgaube': '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M10 16v-5l4.5-4 4.5 4v5z" fill="#d9c7b3" stroke="#5d6b7a"/>', 'gaube:Flachdachgaube': '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M10 15h9V9h-9z" fill="#d9c7b3" stroke="#5d6b7a"/>', sattel: '<path d="M3 20h24M5 20V12l10-8 10 8v8" fill="#e7d6c5" stroke="#5d6b7a"/>', walm: '<path d="M3 20h24M5 20V12l6-7h8l6 7v8" fill="#e7d6c5" stroke="#5d6b7a"/>',
    pult: '<path d="M3 20h24M5 20V8l20 4v8" fill="#e7d6c5" stroke="#5d6b7a"/>', flach: '<path d="M3 20h24M5 20V9h20v11" fill="#e7d6c5" stroke="#5d6b7a"/>', fenster: '<rect x="8" y="4" width="14" height="16" fill="#cfe3f2" stroke="#5d6b7a"/><path d="M15 4v16M8 12h14" stroke="#5d6b7a"/>',
    fenstert: '<rect x="9" y="2" width="12" height="20" fill="#cfe3f2" stroke="#5d6b7a"/><path d="M15 2v20" stroke="#5d6b7a"/>', tuer: '<rect x="9" y="3" width="12" height="19" fill="#9d7c5c" stroke="#5d6b7a"/><circle cx="18" cy="13" r="1" fill="#fff"/>' };
  const TEILF = ['#e8dfd2', '#dfe7d6', '#dde3ee', '#eedfe4'];
  const esc = window.bpEsc;
  const de = (n, st = 2) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: st, maximumFractionDigits: st });
  const rund = (v) => Math.round(v * 2) / 2;   // B2: 0,5-m-Raster

  function mount(el, pid, OPT = {}) {
    const DOC = el.ownerDocument || document;   // abgedocktes Fenster (seite.js) = eigenes Dokument
    [DOC, document].forEach((D) => { if (!D.getElementById('bkx-stil')) { const s = D.createElement('style'); s.id = 'bkx-stil'; s.textContent = STIL; D.head.appendChild(s); } });   // auch in der Seite: Angaben und Korb stehen dort, wenn das 3D abgedockt ist
    el.innerHTML = `<div class="bkx"><div class="haupt"><div class="buehne" data-bk="buehne"><div data-bk="d3"></div></div>
      <aside class="bkx-seite">
        <section class="kasten palk" data-bk="palk" aria-label="Bausteine zum Hineinziehen"><button type="button" class="palk-k" data-bk="palzu">Hineinziehen</button><div class="pal" data-bk="pal"></div>
          <p class="hinweis">Aufs Modell ziehen – die passende Stelle leuchtet grün.</p></section>
        <section class="kasten" data-bk="detail" aria-live="polite"></section>
        <section class="kasten raeume" data-bk="raeume" hidden><h2>Räume je Geschoss</h2><div data-bk="rliste"></div></section>
        <section class="kasten" aria-label="Aufbauten im Gebäudemodell"><h2>Aufbauten im Gebäudemodell (Korb)</h2><div data-bk="korb"></div>
          <p class="hinweis">Jedes Bauteil ist fest mit einem Aufbau im Korb verknüpft. Tauschst du hier den Aufbau, ändern sich alle verknüpften Bauteile – in Kosten, Wärmeschutz und LV. „Kopie“ macht eine eigene Fassung.</p></section>
        <section class="kasten sync"><h2>Steht so auch im Planungsassistenten</h2><div data-bk="sync"></div><p class="stand" data-bk="stand">Baukasten wird geladen …</p></section>
      </aside></div></div>`;
    const root = el.querySelector('.bkx'), AS = root.querySelector('aside'), ORTE = [root];
    root.classList.toggle('breit', (el.clientWidth || 0) >= 1100);
    let HOER = [AS];
    if (OPT.seite) {   // eingebettet (Gebäudemodell): Symbolreihe + Angaben in „Bauteil“, Korb als eigener Reiter rechts
      root.classList.add('eingebettet');
      const wD = DOC.createElement('div'), wK = DOC.createElement('div'); wD.className = 'bkx bkx-aus'; wK.className = 'bkx bkx-aus';
      wD.append(AS.querySelector('[data-bk="palk"]'), AS.querySelector('[data-bk="detail"]'), AS.querySelector('[data-bk="raeume"]'));
      wK.append(...AS.children); AS.remove();
      if (OPT.eigenschaften) wD.appendChild(wK.querySelector('[data-bk="stand"]'));   // Gebäudemodell ohne Korb-Reiter (I1): der Stand („gespeichert …“) unter den Angaben
      ORTE.push(wD, wK); HOER = [wD, wK]; OPT.seite({ detail: wD, korb: wK });
    }
    const $ = (s) => { const q = s.replace(/^#(\w+)$/, '[data-bk="$1"]'); for (const o of ORTE) { const x = o.querySelector(q); if (x) return x; } return null; };
    $('#pal').innerHTML = STEINE.map(([k, n]) => `<div class="stein" data-stein="${k}" title="${esc(n)}" role="button" aria-label="${esc(n.split(' – ')[0])}"><svg viewBox="0 0 30 24">${IKON[k]}</svg></div>`).join('');

    /* Korb des Gebäudemodells: die Aufbauten dieses Projekts (BIB = Vorlagen der Baudaten [id, name, U, Dicke m]) */
    const BIB = { wand: [], dach: [], boden: [] }, KORB = {}; let KN = 0;
    function korbHol(art, von) { const x = Object.values(KORB).find((e) => e.art === art && e.von === von && !e.eigen); if (x) return x.id; const id = 'A' + (++KN), b = BIB[art].find((y) => y[0] === von) || [von, von, null]; KORB[id] = { id, art, von, name: b[1], u: b[2] }; return id; }
    const aufbau = (id) => { const e = KORB[id]; return e ? [e.id, e.name, e.u] : ['', '–', 0]; };
    const dicke = (id, std) => { const e = KORB[id], b = e && BIB[e.art].find((y) => y[0] === e.von); return (b && b[3]) || std; };   // E1: Summe der Schichten, sonst üblich

    /* Modell: Körper (Geschosse) mit Lage und Maßen, Dach auf einem Körper, Gauben auf einer Dachfläche, Fenster/Türen auf einer Wand */
    const M = { koerper: [], dach: {}, gauben: [], oeff: [], n: 0, teile: { h: 'Hauptgebäude' } };
    let SEL = null, MEHR = [], PALAUF = true;   // Symbolreihe „Hineinziehen“: offen, bis man sie selbst zuklappt (21.11.2026 – vorher klappte sie beim Bearbeiten zu); gemerkt je Browser
    try { PALAUF = localStorage.getItem('bp.bk.pal') !== 'zu'; } catch { /* ohne Speicher: offen */ }
    const gleichS = (a, b) => a && b && a.art === b.art && a.id === b.id && (a.seite || '') === (b.seite || '');
    const kz = (id) => M.koerper.find((k) => k.id === id);
    const oben = (k) => !M.koerper.some((q) => q.teil === k.teil && Math.abs(q.z - (k.z + k.h)) < 0.01);
    const RUECK = 1.25;   // Staffelgeschoss: so weit rückt es allseitig zurück
    const gname = (k) => { const L = M.koerper.filter((q) => q.teil === k.teil).map((q) => q.z).sort((a, b) => a - b), i = L.indexOf(k.z), eg = L.indexOf(L.find((v) => v >= 0)), n = i - eg; return n < 0 ? (n === -1 ? 'Kellergeschoss' : n + '. UG') : n === 0 ? 'Erdgeschoss' : n + '. Obergeschoss'; };
    const frei = (k, s) => { const [nx, ny] = SEITEN[s]; return !M.koerper.some((q) => q.id !== k.id && q.z < k.z + k.h && q.z + q.h > k.z && (nx ? Math.abs((nx > 0 ? q.x : q.x + q.w) - (nx > 0 ? k.x + k.w : k.x)) < 0.01 : Math.abs((ny > 0 ? q.y : q.y + q.d) - (ny > 0 ? k.y + k.d : k.y)) < 0.01)); };
    function seiteEcken(k, s) {   // vier Ecken einer Seitenwand (außen), unten → oben
      const x0 = k.x, x1 = k.x + k.w, y0 = k.y, y1 = k.y + k.d, z0 = k.z, z1 = k.z + k.h;
      const L = { xp: [[x1, y1], [x1, y0]], xm: [[x0, y0], [x0, y1]], yp: [[x0, y1], [x1, y1]], ym: [[x1, y0], [x0, y0]] }[s];
      return [[...L[0], z0], [...L[1], z0], [...L[1], z1], [...L[0], z1]];
    }
    /* First (21.11.2026): die Richtung bleibt beim Ziehen fest (D.first „x“ = First parallel zur Länge, „y“ = zur Breite) – vorher kippte er,
       sobald die Breite größer als die Länge wurde. Spannweite quer zum First; Pultdach fällt immer über die Breite. Wie bpcore/baukasten.dach_polygone. */
    const firstX = (k, D) => (D && D.first ? D.first === 'x' : k.w >= k.d);
    const DACHH = (k, f, D) => { const ng = (DACHF.find((x) => x[0] === f) || [, , 0])[2], sp = f === 'pult' ? k.d : firstX(k, D) ? k.d : k.w; return f === 'pult' ? Math.tan(ng * Math.PI / 180) * sp : f === 'flach' ? dicke(D && ((D.fl && D.fl[0]) || D.aufbau), DICKE.flach) : Math.tan(ng * Math.PI / 180) * sp / 2; };
    const flAuf = (kid, i) => { const D = M.dach[kid]; return (D && D.fl && D.fl[i]) || (D && D.aufbau); };
    function flSetzen(kid, i, v) { const D = M.dach[kid]; if (!D) return; D.fl = { ...(D.fl || {}) }; if (v === D.aufbau) delete D.fl[i]; else D.fl[i] = v; if (!Object.keys(D.fl).length) delete D.fl; }
    const flNr = (x) => (x && x.seite && x.seite[0] === 'f' ? +x.seite.slice(1) : null);
    /* Keine durchdringenden Körper (21.11.2026): Dachüberstand endet an der Wand, wo ein anderer Körper anliegt; Ziehen, Maße und Anbau
       halten an einem anderen Körper an (platz). Wie bpcore/baukasten.dach_polygone (kappen, anliegend). */
    const ZU = 0.01, zUeber = (a, b) => a.z < b.z + b.h - ZU && a.z + a.h > b.z + ZU;
    const quer = (a, b, nx) => (nx ? a.y < b.y + b.d - ZU && a.y + a.d > b.y + ZU : a.x < b.x + b.w - ZU && a.x + a.w > b.x + ZU);
    function anliegend(k, z) {   // Seiten von k, an denen auf Höhe der Traufe z ein anderer Körper anliegt
      return SK.filter((s) => { const [nx, ny] = SEITEN[s], e = nx > 0 ? k.x + k.w : nx < 0 ? k.x : ny > 0 ? k.y + k.d : k.y;
        return M.koerper.some((q) => q.id !== k.id && q.z < z + ZU && q.z + q.h + 0.5 > z && quer(q, k, nx)
          && Math.abs((nx ? (nx > 0 ? q.x : q.x + q.w) : (ny > 0 ? q.y : q.y + q.d)) - e) < ZU); });
    }
    function kappen(P, ax, wert, kleiner) {   // Polygon an der senkrechten Ebene ax = wert abschneiden, Reihenfolge ab dem Punkt nächst P[0]
      const ok = (p) => (kleiner ? p[ax] <= wert + 1e-6 : p[ax] >= wert - 1e-6), R = [];
      P.forEach((p, i) => { const q = P[(i + 1) % P.length], a = ok(p);
        if (a) R.push(p);
        if (a !== ok(q)) { const t = (wert - p[ax]) / (q[ax] - p[ax]); R.push(p.map((v, j) => (j === ax ? wert : v + (q[j] - v) * t))); } });
      if (R.length < 3) return [];
      const d = (p) => (p[0] - P[0][0]) ** 2 + (p[1] - P[0][1]) ** 2 + (p[2] - P[0][2]) ** 2, i0 = R.reduce((b, p, i) => (d(p) < d(R[b]) ? i : b), 0);
      return R.slice(i0).concat(R.slice(0, i0));
    }
    function platz(k, s, mit) {   // bis wohin Seite s von k nach außen darf, ohne einen anderen Körper zu durchdringen (mit = Ids, die mitwandern)
      const [nx, ny] = SEITEN[s]; let g = nx + ny > 0 ? Infinity : -Infinity;
      M.koerper.forEach((q) => { if (q.id === k.id || mit.has(q.id) || !zUeber(q, k) || !quer(q, k, nx)) return;
        if (nx > 0 && q.x >= k.x + k.w - ZU) g = Math.min(g, q.x); if (nx < 0 && q.x + q.w <= k.x + ZU) g = Math.max(g, q.x + q.w);
        if (ny > 0 && q.y >= k.y + k.d - ZU) g = Math.min(g, q.y); if (ny < 0 && q.y + q.d <= k.y + ZU) g = Math.max(g, q.y + q.d); });
      return g;
    }
    const r2 = (v) => Math.round(v * 100) / 100;
    function bisPlatz(K, f, v) {   // Länge (w) bzw. Breite (d) mehrerer Körper nach + ändern – höchstens bis zum nächsten Körper
      const mit = new Set(K.map((k) => k.id)); K.forEach((k) => { k[f] = Math.min(v, r2(platz(k, f === 'w' ? 'xp' : 'yp', mit) - (f === 'w' ? k.x : k.y))); });
    }
    /* ───────── Dächer verschneiden (Schritt 1, GO 21.11.2026) ─────────
       Liegt ein Körper k auf gleicher Traufhöhe an der TRAUFSEITE eines anderen Dachs (q), läuft sein Dach in dessen Fläche hinein, bis es sie trifft:
         Satteldach mit dem Giebel voran (beide Flächen laufen längs des Firsts weiter – Kehlen), Pultdach mit der hohen Seite oder einem Ortgang voran.
       Die Flächen von k werden dazu über die Wand hinaus verlängert und an der Ebene der Dachfläche von q abgeschnitten; Giebel/Rückwand an dieser
       Seite entfallen, Wände seitlich davon (Ortgang, Rückwand) laufen bis auf das Dach von q. Die Fläche von q bekommt dort einen Ausschnitt – in
       Teilstücken (`mehr`), damit jedes Stück ein einfaches Vieleck bleibt. Trifft das Dach die Fläche nicht vor deren First, bleibt es wie bisher
       an der Wand. Der Kern rechnet dieselben Flächen (bpcore/baukasten.py: einlauf, dach_teile). */
    const GEGEN = { xp: 'xm', xm: 'xp', yp: 'ym', ym: 'yp' };
    const einlaufSeiten = (k, D) => (D.form === 'sattel' ? (firstX(k, D) ? ['xp', 'xm'] : ['yp', 'ym']) : D.form === 'pult' ? ['ym', 'xp', 'xm'] : []);
    const kante = (k, s) => (s === 'xp' ? k.x + k.w : s === 'xm' ? k.x : s === 'yp' ? k.y + k.d : k.y);
    function nachbarDach(k, s) {   // Körper mit eigenem Dach, der an Seite s auf gleicher Traufhöhe anliegt und k in der Breite ganz aufnimmt
      const nx = SEITEN[s][0], e = kante(k, s);
      return M.koerper.find((q) => q.id !== k.id && M.dach[q.id] && Math.abs(q.z + q.h - k.z - k.h) < ZU && Math.abs(kante(q, GEGEN[s]) - e) < ZU
        && (nx ? q.y <= k.y + ZU && q.y + q.d >= k.y + k.d - ZU : q.x <= k.x + ZU && q.x + q.w >= k.x + k.w - ZU));
    }
    function traufEbene(q, s) {   // Dachfläche von q an seiner Traufseite s: Ebene z = a·x + b·y + c, Tiefe T von der Wand bis zum First, Nummer fi der Fläche
      const D = M.dach[q.id], z = q.z + q.h; if (!D) return null;
      if (D.form === 'sattel') { const la = firstX(q, D), halb = (la ? q.d : q.w) / 2, t = DACHH(q, 'sattel', D) / halb;
        if (la && s === 'yp') return { a: 0, b: -t, c: z + t * (q.y + q.d), T: halb, fi: 0 }; if (la && s === 'ym') return { a: 0, b: t, c: z - t * q.y, T: halb, fi: 1 };
        if (!la && s === 'xp') return { a: -t, b: 0, c: z + t * (q.x + q.w), T: halb, fi: 0 }; if (!la && s === 'xm') return { a: t, b: 0, c: z - t * q.x, T: halb, fi: 1 };
        return null; }
      if (D.form === 'pult' && s === 'yp') { const t = DACHH(q, 'pult', D) / q.d; return { a: 0, b: -t, c: z + t * (q.y + q.d), T: q.d, fi: 0 }; }
      return null;
    }
    function ebeneVon(P) {   // Ebene z = a·x + b·y + c durch ein (nicht senkrechtes) Vieleck
      let nx = 0, ny = 0, nz = 0; P.forEach((p, i) => { const q = P[(i + 1) % P.length]; nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]); });
      if (Math.abs(nz) < 1e-9) return null; const a = -nx / nz, b = -ny / nz; return { a, b, c: P[0][2] - a * P[0][0] - b * P[0][1] };
    }
    function schneiden(P, g) {   // Vieleck auf den Teil mit g(p) ≥ 0 beschneiden (g linear), Reihenfolge ab dem Punkt nächst P[0]
      const W = P.map(g), R = [];
      P.forEach((p, i) => { const j = (i + 1) % P.length, a = W[i] >= -1e-7, b = W[j] >= -1e-7;
        if (a) R.push(p);
        if (a !== b) { const t = W[i] / (W[i] - W[j]); R.push(p.map((v, n) => v + (P[j][n] - v) * t)); } });
      if (R.length < 3) return [];
      const d = (p) => (p[0] - P[0][0]) ** 2 + (p[1] - P[0][1]) ** 2 + (p[2] - P[0][2]) ** 2, i0 = R.reduce((b, p, i) => (d(p) < d(R[b]) ? i : b), 0);
      return R.slice(i0).concat(R.slice(0, i0));
    }
    function einlauf(k, s, P) {   // Dach von k (Flächen P, sonst dachRoh) läuft an Seite s ins Nachbardach → { q, fi, P, streifen } oder null
      const D = M.dach[k.id]; if (!D || !einlaufSeiten(k, D).includes(s)) return null;
      const q = nachbarDach(k, s), E = q && traufEbene(q, GEGEN[s]); if (!E) return null;
      const ax = SEITEN[s][0] ? 0 : 1, vz = SEITEN[s][0] + SEITEN[s][1], e = kante(k, s), fern = e + vz * E.T, z0 = k.z + k.h;
      const g = (p) => p[2] - (E.a * p[0] + E.b * p[1] + E.c), tief = (p) => (p[ax] - e) * vz;   // tief: wie weit hinter der Wand von q
      const roh = P || dachRoh(k, D), dach = ebeneVon(roh[0].p), streifen = [];
      const aus = roh.map((x) => {
        if (x.s === s) return { ...x, p: [] };   // Giebel / Rückwand / Ortgang an dieser Seite: entfällt, dort geht das Dach weiter
        if (x.s === GEGEN[s] || !x.p.length) return x;
        const eb = x.s ? dach : ebeneVon(x.p); if (!eb) return x;
        const lang = x.p.map((p) => { if (tief(p) < -1e-6) return p; const n = [...p]; n[ax] = fern;   // Punkte an dieser Seite wandern bis zur Tiefe des Nachbardachs
          if (!x.s || p[2] > z0 + 1e-6) n[2] = eb.a * n[0] + eb.b * n[1] + eb.c; return n; });   // … in der Dachebene (Wände: nur die Oberkante)
        return { ...x, p: schneiden(lang, g) };
      });
      if (aus.some((x) => !x.s && x.p.some((p) => tief(p) > E.T - 1e-4))) return null;   // trifft die Fläche nicht vor ihrem First – bleibt an der Wand
      aus.forEach((x, i) => { if (x.s || !x.p.length) return; const U = x.p.filter((p) => tief(p) > 1e-4).map((p) => p[1 - ax]); if (!U.length) return;
        streifen.push({ u0: Math.min(...U), u1: Math.max(...U), ...ebeneVon(roh[i].p) }); });
      return streifen.length ? { q, fi: E.fi, P: aus, streifen, ax: 1 - ax } : null;
    }
    function dachFlaechen(k) {   // Vielecke des Dachs (Weltkoordinaten; Reihenfolge wie bpcore/baukasten.dach_teile): verschnitten, sonst an anliegenden Seiten gekappt
      const D = M.dach[k.id]; if (!D) return [];
      const A = anliegend(k, k.z + k.h); let P = dachRoh(k, D); const fertig = new Set();
      einlaufSeiten(k, D).forEach((s) => { const r = A.includes(s) && einlauf(k, s, P); if (r) { P = r.P; fertig.add(s); } });
      A.forEach((s) => { if (!fertig.has(s)) P = P.map((x) => (x.p.length ? { ...x, p: kappen(x.p, s[0] === 'x' ? 0 : 1, kante(k, s), s.endsWith('p')) } : x)); });
      M.koerper.forEach((r) => { if (r.id === k.id || !M.dach[r.id]) return;   // Dächer, die in dieses hineinlaufen: Ausschnitt in der getroffenen Fläche
        einlaufSeiten(r, M.dach[r.id]).forEach((s) => { if (nachbarDach(r, s) !== k) return; const E = einlauf(r, s); if (!E) return;
          const x = P[E.fi], U0 = Math.min(...E.streifen.map((t) => t.u0)), U1 = Math.max(...E.streifen.map((t) => t.u1)), neu = [];
          [x.p, ...(x.mehr || [])].forEach((st) => { if (st.length < 3) return;
            neu.push(kappen(st, E.ax, U0, true), kappen(st, E.ax, U1, false));
            E.streifen.forEach((t) => { const m = kappen(kappen(st, E.ax, t.u0, false), E.ax, t.u1, true); if (m.length) neu.push(schneiden(m, (p) => p[2] - (t.a * p[0] + t.b * p[1] + t.c))); }); });
          const T = neu.filter((st) => st.length >= 3); P[E.fi] = { ...x, p: T[0] || [], mehr: T.slice(1) }; }); });
      return P;
    }
    /* Dachflächen (Unterseite) und Giebel eines Körpers. Sattel- und Walmdach haben 40 cm Überstand: die Fläche geht mit ihrer Neigung durch die
       Oberkante der Wand (außen) und läuft im Überstand weiter nach unten (Traufe ze unter der Wandoberkante) – so bleibt zwischen Traufwand und
       Dach kein Spalt (21.11.2026); der First liegt H über der Wand. Der Kern rechnet dieselben Flächen (baukasten._dach_roh). */
    function dachRoh(k, D) {
      const ue = D.form === 'pult' ? 0 : 0.4, x0 = k.x - ue, x1 = k.x + k.w + ue, y0 = k.y - ue, y1 = k.y + k.d + ue, z = k.z + k.h, H = DACHH(k, D.form, D), la = firstX(k, D);
      const X0 = k.x, X1 = k.x + k.w, Y0 = k.y, Y1 = k.y + k.d, halb = (la ? k.d : k.w) / 2, ze = z - H * ue / halb;   // ze: Höhe der Traufe am Ende des Überstands
      if (D.form === 'flach') return [{ n: 'Dach', p: [[x0, y0, z + H], [x1, y0, z + H], [x1, y1, z + H], [x0, y1, z + H]], seite: 'top' }];
      if (D.form === 'pult') return [{ n: 'Dachfläche', p: [[x0, y0, z + H], [x1, y0, z + H], [x1, y1, z], [x0, y1, z]], seite: 'yp' },
        { n: 'Ortgang', s: 'xp', p: [[x1, y1, z], [x1, y0, z], [x1, y0, z + H]] }, { n: 'Ortgang', s: 'xm', p: [[x0, y0, z], [x0, y1, z], [x0, y0, z + H]] }, { n: 'Rückwand', s: 'ym', p: [[x1, y0, z], [x0, y0, z], [x0, y0, z + H], [x1, y0, z + H]] }];
      if (D.form === 'walm') { const e = halb + ue;   // gleiche Neigung auf allen vier Seiten
        if (la) { const r0 = [x0 + e, (y0 + y1) / 2, z + H], r1 = [x1 - e, (y0 + y1) / 2, z + H];
          return [{ n: 'Dachfläche', seite: 'yp', p: [[x0, y1, ze], [x1, y1, ze], r1, r0] }, { n: 'Dachfläche', seite: 'ym', p: [[x1, y0, ze], [x0, y0, ze], r0, r1] }, { n: 'Walmfläche', seite: 'xp', p: [[x1, y1, ze], [x1, y0, ze], r1] }, { n: 'Walmfläche', seite: 'xm', p: [[x0, y0, ze], [x0, y1, ze], r0] }]; }
        const r0 = [(x0 + x1) / 2, y0 + e, z + H], r1 = [(x0 + x1) / 2, y1 - e, z + H];
        return [{ n: 'Dachfläche', seite: 'xp', p: [[x1, y1, ze], [x1, y0, ze], r0, r1] }, { n: 'Dachfläche', seite: 'xm', p: [[x0, y0, ze], [x0, y1, ze], r1, r0] }, { n: 'Walmfläche', seite: 'yp', p: [[x0, y1, ze], [x1, y1, ze], r1] }, { n: 'Walmfläche', seite: 'ym', p: [[x1, y0, ze], [x0, y0, ze], r0] }]; }
      if (la) { const ym = (y0 + y1) / 2, r0 = [x0, ym, z + H], r1 = [x1, ym, z + H];
        return [{ n: 'Dachfläche', seite: 'yp', p: [[x0, y1, ze], [x1, y1, ze], r1, r0] }, { n: 'Dachfläche', seite: 'ym', p: [[x1, y0, ze], [x0, y0, ze], r0, r1] },
          { n: 'Giebel', s: 'xp', p: [[X1, Y1, z], [X1, Y0, z], [X1, ym, z + H]] }, { n: 'Giebel', s: 'xm', p: [[X0, Y0, z], [X0, Y1, z], [X0, ym, z + H]] }]; }
      const r0 = [(x0 + x1) / 2, y0, z + H], r1 = [(x0 + x1) / 2, y1, z + H], xm = (x0 + x1) / 2;
      return [{ n: 'Dachfläche', seite: 'xp', p: [[x1, y1, ze], [x1, y0, ze], r0, r1] }, { n: 'Dachfläche', seite: 'xm', p: [[x0, y0, ze], [x0, y1, ze], r1, r0] },
        { n: 'Giebel', s: 'yp', p: [[X0, Y1, z], [X1, Y1, z], [xm, Y1, z + H]] }, { n: 'Giebel', s: 'ym', p: [[X1, Y0, z], [X0, Y0, z], [xm, Y0, z + H]] }];
    }
    /* Dicke einer geneigten Dachfläche, senkrecht gemessen (Aufbau der Fläche ÷ cos Neigung) – um so viel liegt die Oberseite über der Fläche aus dachFlaechen */
    function dachTv(k, fi) { const D = M.dach[k.id]; if (!D || D.form === 'flach') return 0;
      return dicke(flAuf(k.id, fi), DICKE.dach) / Math.cos(((DACHF.find((f) => f[0] === D.form) || [, , 0])[2]) * Math.PI / 180); }
    function gaubeGeo(g) {   // Front, Dach(e), Fenster einer Gaube auf ihrer Dachfläche (auf der Oberseite – nicht in der Dachplatte)
      const k = kz(g.k); if (!k || !M.dach[k.id]) return null; const f0 = dachFlaechen(k)[g.fl]; if (!f0 || f0.p.length < 4) return null;
      const tv = dachTv(k, g.fl) + 0.02, fl = { ...f0, p: f0.p.map((q) => [q[0], q[1], q[2] + tv]) };   // knapp über der Oberseite des Dachs
      const [a, b, , d] = fl.p, br = g.b / Math.hypot(b[0] - a[0], b[1] - a[1]), at = (t, s) => [a[0] + (b[0] - a[0]) * t + (d[0] - a[0]) * s, a[1] + (b[1] - a[1]) * t + (d[1] - a[1]) * s, a[2] + (b[2] - a[2]) * t + (d[2] - a[2]) * s];
      const p0 = at(g.u - br / 2, 0.2), p1 = at(g.u + br / 2, 0.2), q0 = at(g.u - br / 2, 0.75), q1 = at(g.u + br / 2, 0.75), hz = Math.max(q0[2], q1[2]);
      const mid = (A, B) => [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], first = hz + 0.9;
      let front = [p0, p1, [p1[0], p1[1], hz], [p0[0], p0[1], hz]], D1 = [[p0[0], p0[1], hz], [p1[0], p1[1], hz], [q1[0], q1[1], hz + 0.25], [q0[0], q0[1], hz + 0.25]], D2 = null;
      if (g.form === 'Flachdachgaube') D1 = [[p0[0], p0[1], hz], [p1[0], p1[1], hz], [q1[0], q1[1], hz], [q0[0], q0[1], hz]];
      if (g.form === 'Satteldachgaube') { const fm = mid(p0, p1), qm = mid(q0, q1); front = [p0, p1, [p1[0], p1[1], hz], [fm[0], fm[1], first], [p0[0], p0[1], hz]];
        D1 = [[p0[0], p0[1], hz], [fm[0], fm[1], first], [qm[0], qm[1], first], [q0[0], q0[1], hz]]; D2 = [[p1[0], p1[1], hz], [fm[0], fm[1], first], [qm[0], qm[1], first], [q1[0], q1[1], hz]]; }
      const zq = g.form === 'Schleppgaube' ? hz + 0.25 : hz, W = [[p0, [p0[0], p0[1], hz], [q0[0], q0[1], zq], q0], [p1, q1, [q1[0], q1[1], zq], [p1[0], p1[1], hz]]];   // Wangen: Wand zwischen Dachfläche und Gaubendach
      const sch = (t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t], fen = [[...sch(0.2), p0[2] + 0.25], [...sch(0.8), p0[2] + 0.25], [...sch(0.8), hz - 0.2], [...sch(0.2), hz - 0.2]];
      return { front, W, D1, D2, fen, fl, at };
    }

    /* ───────── Netz (Format von bpcore/netz.py) – Bauteile mit Dicke (E1) ───────── */
    const cm = (p) => [Math.round(p[0] * 100), Math.round(p[1] * 100), Math.round(p[2] * 100)];
    function flaeche(P, v) { for (let i = 1; i < P.length - 1; i++) [P[0], P[i], P[i + 1]].forEach((p) => v.push(...cm(p))); return v; }
    function prisma(F, z0, z1, v = []) {   // Grundriss F (Punkte x, y) von z0 bis z1
      flaeche(F.map((p) => [p[0], p[1], z0]), v); flaeche(F.map((p) => [p[0], p[1], z1]), v);
      F.forEach((p, i) => { const q = F[(i + 1) % F.length]; flaeche([[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]], v); });
      return v;
    }
    function platte(P, t, v = []) {   // ebenes Polygon im Raum, um t nach unten verdickt (Dachflächen)
      const U = P.map((p) => [p[0], p[1], p[2] - t]); flaeche(P, v); flaeche(U, v);
      P.forEach((p, i) => { const j = (i + 1) % P.length; flaeche([p, P[j], U[j], U[i]], v); });
      return v;
    }
    function wandDick(P, nx, ny, t, v = [], ab = 0, zu = 0) {   // senkrechtes Polygon (Giebel) um t nach innen; ab = so viel tiefer liegt die Innenkante oberhalb zu (Rückwand unter dem geneigten Pultdach)
      const I = P.map((p) => [p[0] - nx * t, p[1] - ny * t, p[2] > zu + 1e-6 ? p[2] - ab : p[2]]); flaeche(P, v); flaeche(I, v);
      P.forEach((p, i) => { const j = (i + 1) % P.length; flaeche([p, P[j], I[j], I[i]], v); });
      return v;
    }
    const FUGE = 0.02;   // m (das Netz rechnet in ganzen cm) – Abstand zwischen Wandoberkante und Dachunterseite im Netz
    const REF = new Map();   // Nummer im Netz → Auswahl ({ art, id, seite })
    function netzBauen() {
      REF.clear();
      const K = M.koerper, zs = [...new Set(K.map((k) => Math.round(k.z * 100) / 100))].sort((a, b) => a - b), gv = (z) => zs.indexOf(Math.round(z * 100) / 100), E = [];
      const tf = (k) => TEILF[Object.keys(M.teile).indexOf(k.teil) % TEILF.length];
      const tief = {}; K.forEach((k) => { tief[k.teil] = Math.min(tief[k.teil] ?? 1e9, k.z); });
      K.forEach((k, b) => {
        const g = gv(k.z), c = tf(k);
        const tw = Math.min(Math.max(0.1, Math.min(k.w, k.d) / 3), dicke(k.wand, DICKE.wand));
        const x0 = k.x, x1 = k.x + k.w, y0 = k.y, y1 = k.y + k.d, I = { xp: [[x1, y1], [x1, y0], [x1 - tw, y0 + tw], [x1 - tw, y1 - tw]], xm: [[x0, y0], [x0, y1], [x0 + tw, y1 - tw], [x0 + tw, y0 + tw]],
          yp: [[x0, y1], [x1, y1], [x1 - tw, y1 - tw], [x0 + tw, y1 - tw]], ym: [[x1, y0], [x0, y0], [x0 + tw, y0 + tw], [x1 - tw, y0 + tw]] };   // Gehrung an den Ecken
        SK.forEach((s, si) => { const i = ID0 + b * 20 + si; E.push({ i, t: 'w', g, c, a: 0, v: prisma(I[s], k.z, k.z + k.h) }); REF.set(i, { art: 'wand', id: k.id, seite: s }); });
        const unten = k.z <= tief[k.teil] + 0.01, ds = dicke(k.boden, unten ? DICKE.boden : DICKE.decke), ib = ID0 + b * 20 + 5;
        E.push({ i: ib, t: 's', g, c: '#c9c4ba', a: 0, v: prisma([[x0 + tw, y0 + tw], [x1 - tw, y0 + tw], [x1 - tw, y1 - tw], [x0 + tw, y1 - tw]], unten ? k.z - ds : k.z, unten ? k.z : k.z + Math.min(ds, k.h / 3)) });
        REF.set(ib, { art: 'koerper', id: k.id });
        const D = M.dach[k.id];
        const DF = D ? dachFlaechen(k) : [];
        if (D) DF.forEach((x, fi) => { if (x.p.length < 3) return; const i = ID0 + b * 20 + 6 + fi, td = dicke(flAuf(k.id, fi), D.form === 'flach' ? DICKE.flach : DICKE.dach);
          /* Keine überlappenden Bauteile (21.11.2026): die Flächen aus dachFlaechen sind die UNTERSEITE des geneigten Dachs – die Platte liegt darüber
             (senkrecht gemessen tv), Giebel, Ortgang und Rückwand enden genau an der Unterseite, die Traufwand an ihrer Oberkante. Das Flachdach
             liegt wie bisher mit seiner Dicke auf der Wand (Fläche = Oberseite). */
          const tv = x.n === 'Dach' ? td : dachTv(k, fi);
          const wp = x.s && D.form === 'pult' && x.s !== 'ym' && DF[3] && DF[3].p.length ? kappen(x.p, 1, k.y + tw, false) : x.p;   // Pultdach: die Ortgänge enden an der Rückwand (hohe Seite), nicht in ihr
          if (wp.length < 3) return;
          const v = x.s ? wandDick(wp, ...SEITEN[x.s], tw, [], ...(D.form === 'pult' && x.s === 'ym' ? [DACHH(k, D.form, D) * tw / k.d, k.z + k.h] : []))
            : [x.p, ...(x.mehr || [])].reduce((vv, st) => platte(st.map((q) => [q[0], q[1], q[2] + (x.n === 'Dach' ? 0 : tv) + FUGE]), tv, vv), []);   // mehr: Teilstücke einer verschnittenen Fläche   // FUGE: das Dach liegt 2 cm über den Wänden – nie in derselben Ebene (sonst zeichnen sich die Wandkanten in der Dachfläche ab)
          E.push({ i, t: x.s ? 'w' : 'r', g, c: x.s ? c : D.form === 'flach' ? '#9aa3ad' : '#b56a4f', a: 0, v });
          REF.set(i, x.s ? { art: 'wand', id: k.id, seite: x.s } : { art: 'dach', id: k.id, ...(DFL[D.form].includes(fi) ? { seite: 'f' + fi } : {}) }); });   // Giebel/Ortgang gehören zur Wand ihrer Seite (21.11.2026)
        else if (oben(k) || M.koerper.some((q) => q.teil === k.teil && q.staffel && Math.abs(q.z - k.z - k.h) < ZU)) { const i = ID0 + b * 20 + 19;   // oben offen bzw. Terrasse um ein Staffelgeschoss: Decke als Abschluss
          E.push({ i, t: 's', g, c: '#c9c4ba', a: 0, v: prisma([[x0 + tw, y0 + tw], [x1 - tw, y0 + tw], [x1 - tw, y1 - tw], [x0 + tw, y1 - tw]], k.z + k.h - DICKE.decke, k.z + k.h) }); REF.set(i, { art: 'koerper', id: k.id }); }
      });
      M.oeff.forEach((o, n) => { const b = K.findIndex((k) => k.id === o.k); if (b < 0) return; const k = K[b], E4 = seiteEcken(k, o.seite), L = Math.hypot(E4[1][0] - E4[0][0], E4[1][1] - E4[0][1]) || 1, [nx, ny] = SEITEN[o.seite];
        const t0 = o.u - o.b / 2 / L, t1 = o.u + o.b / 2 / L, z0 = k.z + (o.art === 'fenster' ? 0.9 : 0), at = (t, zz) => [E4[0][0] + (E4[1][0] - E4[0][0]) * t + nx * 0.03, E4[0][1] + (E4[1][1] - E4[0][1]) * t + ny * 0.03, zz];
        const i = OID + n; E.push({ i, t: o.art === 'tuer' ? 'd' : 'f', g: gv(k.z), c: o.art === 'tuer' ? '#9d7c5c' : '', a: 0, h: ID0 + b * 20 + SK.indexOf(o.seite), v: flaeche([at(t0, z0), at(t1, z0), at(t1, z0 + o.h), at(t0, z0 + o.h)], []) });
        REF.set(i, { art: 'oeff', id: o.id }); });
      M.gauben.forEach((gb, n) => { const G = gaubeGeo(gb), k = kz(gb.k); if (!G) return; const g = gv(k.z), i = GID + n * 4;
        E.push({ i, t: 'w', g, c: '#ece4d8', a: 0, v: flaeche(G.front, []) }); E.push({ i: i + 3, t: 'w', g, c: '#ece4d8', a: 0, v: flaeche(G.W[1], flaeche(G.W[0], [])) }); E.push({ i: i + 1, t: 'r', g, c: '#a65f46', a: 0, v: flaeche(G.D1, G.D2 ? flaeche(G.D2, []) : []) });
        E.push({ i: i + 2, t: 'f', g, c: '', a: 0, h: i, v: flaeche(G.fen.map((p) => [p[0], p[1], p[2]]), []) });
        [i, i + 1, i + 2, i + 3].forEach((x) => REF.set(x, { art: 'gaube', id: gb.id })); });   // Front und Wangen zählt der Kern zur Außenwand (rohbau)
      return { stand: 2, e: E, geschosse: zs.map((z) => ({ n: z < 0 ? 'Kellergeschoss' : (zs.filter((y) => y >= 0).indexOf(z) ? zs.filter((y) => y >= 0).indexOf(z) + '. Obergeschoss' : 'Erdgeschoss'), z })), dreiecke: E.reduce((a, e) => a + e.v.length / 9, 0), voll: true };
    }
    const idsVon = (x) => [...REF.entries()].filter(([, r]) => r.art === x.art && r.id === x.id && (x.art === 'wand' || x.art === 'dach' ? (r.seite || '') === (x.seite || '') || (x.art === 'dach' && !x.seite) : true)).map(([i]) => i);

    /* ───────── 3D (bp/ansicht3d.js) ───────── */
    let D3 = null, NETZ = null;
    const gr = DOC.createElement('div'); gr.className = 'bkx-gr';
    function d3Laden() {
      const O = OPT.d3 || {};
      D3 = window.bp3d.mount($('#d3'), { info: () => '', ...O, netz: NETZ, wahl: true, start: O.start || (O.zeilen ? 'massnahme' : 'modell'), leer: 'Noch kein Geschoss – im Assistenten Fläche und Geschosse angeben.',
        onWahl: (ids, e) => { const L = []; ids.forEach((i) => { const r = REF.get(+i); if (r && !L.some((x) => gleichS(x, r))) L.push(r); });
          SEL = L[0] || null; MEHR = L.slice(1); if (O.onWahl) O.onWahl(ids, e); seitlich(); },
        kontext: (e, P) => { const r = e && REF.get(e.i); if (!r) return; if (!(SEL && gleichS(SEL, r)) && !MEHR.some((x) => gleichS(x, r))) { SEL = r; MEHR = []; auswahlZeigen(); seitlich(); } befehle(r).forEach((b) => P.push(b)); },
        gezeichnet: griffeSetzen });
      D3.feld.appendChild(gr);
    }
    function bild(still) {   // Geometrie neu → 3D, Auswahl und Griffe; still = beim Ziehen (nur das Bild)
      M.koerper.forEach((k) => { k.name = gname(k); });
      NETZ = netzBauen();
      if (!D3) { if (window.bp3d) d3Laden(); } else D3.setzen(NETZ);
      auswahlZeigen();
      if (!still) { seitlich(); spaeter(); }
    }
    const auswahlZeigen = () => { if (D3) D3.waehle([SEL, ...MEHR].filter(Boolean).flatMap(idsVon)); };
    function seitlich() { detail(); sync(); korb(); raeume(); palette(); griffeSetzen(); }
    function palette() { const p = $('#palk'); if (p) { p.classList.toggle('zu', !PALAUF); $('#palzu').textContent = p.classList.contains('zu') ? 'Hineinziehen ▸' : 'Hineinziehen'; } }

    /* ───────── Befehle (B3): rechts beim Gewählten und per Rechtsklick ───────── */
    function befehle(r) {
      const P = [], k = (r.art === 'wand' || r.art === 'koerper') && kz(r.id), tue = (f) => () => { f(); bild(); };
      if (k) {
        if (oben(k)) { P.push({ text: '＋ Geschoss darauf', fn: tue(() => geschossDarauf(k)) }); if (k.z >= 0) P.push({ text: '＋ Staffelgeschoss', fn: tue(() => staffel(k)) }); }
        if (k.z === 0 && !M.koerper.some((q) => q.teil === k.teil && q.z < 0)) P.push({ text: '＋ Keller darunter', fn: tue(() => keller(k)) });
        if (r.art === 'wand' && frei(k, r.seite)) P.push({ text: `＋ Anbau an dieser Seite (${SNAME[r.seite]})`, fn: tue(() => anbau([k], r.seite)) });
        if (r.art === 'koerper') SK.filter((s) => frei(k, s)).forEach((s) => P.push({ text: `＋ Anbau ${SNAME[s]}`, fn: tue(() => anbau([k], s)) }));
        if (M.koerper.length > 1) P.push({ text: `${k.name} entfernen`, gefahr: true, fn: tue(() => { entfernen(k); SEL = null; MEHR = []; }) });
      }
      if (r.art === 'dach' && M.dach[r.id]) { const D = M.dach[r.id];
        DACHF.forEach(([f, n]) => P.push({ text: n, aus: D.form === f, fn: tue(() => { if (D.form !== f) delete D.fl; D.form = f; SEL = { art: 'dach', id: r.id }; }) }));
        if (D.form === 'sattel' || D.form === 'walm') P.push({ text: 'First drehen', fn: tue(() => { const k = kz(r.id); D.first = firstX(k, D) ? 'y' : 'x'; delete D.fl; M.gauben = M.gauben.filter((g) => g.k !== r.id); SEL = { art: 'dach', id: r.id }; }) });
        P.push({ text: 'Dach entfernen', gefahr: true, fn: tue(() => { delete M.dach[r.id]; M.gauben = M.gauben.filter((g) => g.k !== r.id); SEL = null; }) }); }
      if (r.art === 'gaube') P.push({ text: 'Gaube entfernen', gefahr: true, fn: tue(() => { M.gauben = M.gauben.filter((g) => g.id !== r.id); SEL = null; }) });
      if (r.art === 'oeff') P.push({ text: 'entfernen', gefahr: true, fn: tue(() => { M.oeff = M.oeff.filter((o) => o.id !== r.id); SEL = null; }) });
      return P;
    }
    const befHtml = (r) => { const B = befehle(r); BEF = B; return B.length ? `<div class="bef">${B.map((b, i) => `<button type="button" data-bef="${i}"${b.aus ? ' disabled' : ''}${b.gefahr ? ' class="weg"' : ''}>${esc(b.text)}</button>`).join('')}</div>` : ''; };
    let BEF = [];
    function geschossDarauf(k) { const n = { ...k, id: 'k' + (++M.n), z: k.z + k.h, h: 2.8, boden: korbHol('boden', VOR.decke), seiten: { ...(k.seiten || {}) } }; delete n.staffel; delete n.voll;
      if (M.dach[k.id]) { M.dach[n.id] = M.dach[k.id]; delete M.dach[k.id]; M.gauben.forEach((g) => { if (g.k === k.id) g.k = n.id; }); } M.koerper.push(n); SEL = { art: 'koerper', id: n.id }; MEHR = []; }
    function staffel(k) { const n = { ...k, id: 'k' + (++M.n), z: k.z + k.h, h: 2.8, boden: korbHol('boden', VOR.decke), staffel: true, voll: { x: k.x, y: k.y, w: k.w, d: k.d }, x: k.x + RUECK, y: k.y + RUECK, w: k.w - 2 * RUECK, d: k.d - 2 * RUECK, seiten: { ...(k.seiten || {}) } };
      if (M.dach[k.id]) { delete M.dach[k.id]; M.gauben = M.gauben.filter((g) => g.k !== k.id); } M.dach[n.id] = { form: 'flach', aufbau: korbHol('dach', VOR.flach) }; M.koerper.push(n); SEL = { art: 'koerper', id: n.id }; MEHR = []; }
    function keller(k) { const n = { ...k, id: 'k' + (++M.n), z: -2.6, h: 2.6, wand: korbHol('wand', VOR.wand), seiten: {} }; delete n.staffel; delete n.voll;
      M.koerper.forEach((q) => { if (q.teil === k.teil && KORB[q.boden] && KORB[q.boden].von === VOR.boden) q.boden = korbHol('boden', VOR.decke); }); n.boden = korbHol('boden', VOR.boden); M.koerper.push(n); SEL = { art: 'koerper', id: n.id }; MEHR = []; }
    function anbau(K, s) {   // Anbau an einer Seite über ein oder mehrere Geschosse – je Geschoss ein Körper, oben ein Flachdach
      K = K.slice().sort((a, b) => a.z - b.z); const k = K[0], [nx, ny] = SEITEN[s], t = 't' + (++M.n), nw = nx ? 7 : Math.min(8, k.w), nd = ny ? 6 : Math.min(7, k.d);
      let x = nx > 0 ? k.x + k.w : nx < 0 ? k.x - nw : k.x + (k.w - nw) / 2, y = ny > 0 ? k.y + k.d : ny < 0 ? k.y - nd : k.y + (k.d - nd) / 2, w = nw, dd = nd, n = null;
      const z0 = K[0].z, z1 = K[K.length - 1].z + K[K.length - 1].h;   // Platz für den Anbau: nicht in einen anderen Körper hinein – in Richtung der Seite kürzen
      for (const q of M.koerper) { const p = { x, y, w, d: dd, z: z0, h: z1 - z0 }; if (!zUeber(q, p) || !quer(q, p, 1) || !quer(q, p, 0)) continue;
        if (nx > 0) w = r2(q.x - x); else if (nx < 0) { w = r2(x + w - q.x - q.w); x = r2(q.x + q.w); } else if (ny > 0) dd = r2(q.y - y); else { dd = r2(y + dd - q.y - q.d); y = r2(q.y + q.d); } }
      if (w < 1.5 || dd < 1.5) { if (window.toast) toast('Hier ist kein Platz für einen Anbau – ein anderer Körper steht im Weg.', true); return; }
      M.teile[t] = 'Anbau ' + Object.keys(M.teile).length;
      K.forEach((q, i) => { n = { id: 'k' + (++M.n), teil: t, z: q.z, h: q.h, w, d: dd, x, y, wand: korbHol('wand', VOR.wand), boden: korbHol('boden', i ? VOR.decke : VOR.boden), seiten: {} }; M.koerper.push(n); });
      M.dach[n.id] = { form: 'flach', aufbau: korbHol('dach', VOR.flach) }; SEL = { art: 'koerper', id: n.id }; MEHR = [];
    }
    function entfernen(k) {   // Geschoss weg: darüber rückt nach unten, das Dach bleibt oben
      M.koerper = M.koerper.filter((q) => q.id !== k.id); M.oeff = M.oeff.filter((o) => o.k !== k.id);
      if (M.dach[k.id]) { const u = M.koerper.filter((q) => q.teil === k.teil && q.z < k.z).sort((a, c) => c.z - a.z)[0]; if (u) { M.dach[u.id] = M.dach[k.id]; M.gauben.forEach((g) => { if (g.k === k.id) g.k = u.id; }); } else M.gauben = M.gauben.filter((g) => g.k !== k.id); delete M.dach[k.id]; }
      M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z = Math.round((q.z - k.h) * 100) / 100; }); if (!M.koerper.some((q) => q.teil === k.teil)) delete M.teile[k.teil];
    }

    /* ───────── Griffe (D2): violett am Gewählten, Maße im 0,5-m-Raster ───────── */
    let GR = [], ZG = null;
    const RAST = 0.4;
    function einrasten(k, nx, ny) {   // kleineres Geschoss auf einem größeren rastet an dessen Kante ein
      const u = M.koerper.find((q) => q.teil === k.teil && q.id !== k.id && Math.abs(q.z + q.h - k.z) < 0.01); if (!u) return;
      if (nx > 0 && Math.abs(k.x + k.w - (u.x + u.w)) < RAST) k.w = Math.round((u.x + u.w - k.x) * 100) / 100;
      if (nx < 0 && Math.abs(k.x - u.x) < RAST) { k.w = Math.round((k.w + k.x - u.x) * 100) / 100; k.x = u.x; }
      if (ny > 0 && Math.abs(k.y + k.d - (u.y + u.d)) < RAST) k.d = Math.round((u.y + u.d - k.y) * 100) / 100;
      if (ny < 0 && Math.abs(k.y - u.y) < RAST) { k.d = Math.round((k.d + k.y - u.y) * 100) / 100; k.y = u.y; }
    }
    function griffeListe() {
      const L = []; if (!SEL) return L; const add = (p, ax, fn, tip, n) => L.push({ p, ax, fn, tip, n });   // n = Seite, an der der Griff sitzt (sichtbar nur zugewandt)
      const GS = [...new Map([SEL, ...MEHR].filter((x) => x.art === 'koerper' || x.art === 'wand').map((x) => [x.id, kz(x.id)])).values()].filter(Boolean);
      if (MEHR.length && GS.length > 1 && GS.every((k) => k.teil === GS[0].teil)) {   // mehrere Geschosse: ein Höhengriff, verteilt
        GS.sort((a, b) => a.z - b.z); const o = GS[GS.length - 1], h0 = GS.map((k) => k.h);
        add([o.x + o.w / 2, o.y + o.d / 2, o.z + o.h], [0, 0, 1], (A, d) => { const je = d / GS.length; GS.forEach((k, i) => { const z0 = k.z + k.h, h = Math.max(2.2, Math.min(6, Math.round((h0[i] + je) * 100) / 100)), dz = h - k.h; k.h = h;
          M.koerper.forEach((q) => { if (q.teil === k.teil && q.z >= z0 - 0.01) q.z = Math.round((q.z + dz) * 100) / 100; }); }); }, `Höhe – verteilt auf ${GS.length} Geschosse`);
        return L;
      }
      if (SEL.art === 'koerper' || SEL.art === 'wand') { const k = kz(SEL.id); if (!k) return L; const zm = k.z + k.h / 2;
        SK.forEach((s) => { const [nx, ny] = SEITEN[s];
          add([k.x + k.w / 2 + nx * k.w / 2, k.y + k.d / 2 + ny * k.d / 2, zm], [nx, ny, 0], (A, d) => {   // gleich große Geschosse des Teils wandern mit (beim Anfassen gemerkt)
            const Q = A._Q || (A._Q = M.koerper.filter((q) => q.teil === k.teil && (nx ? Math.abs(q.x - A.x) < .01 && Math.abs(q.w - A.w) < .01 : Math.abs(q.y - A.y) < .01 && Math.abs(q.d - A.d) < .01)).map((q) => ({ q, a: { ...q } })));
            const mit = new Set(Q.map((x) => x.q.id)), f = nx ? 'w' : 'd', o = nx ? 'x' : 'y'; let v = Math.max(2, rund(A[f] + d));
            Q.forEach(({ a }) => { const g = platz(a, s, mit); v = Math.min(v, r2(nx + ny > 0 ? g - a[o] : a[o] + a[f] - g)); });   // nicht in einen anderen Körper hinein
            Q.forEach(({ q, a }) => { if (nx + ny < 0) q[o] = r2(a[o] + a[f] - v); q[f] = v; });
            einrasten(k, nx, ny); }, nx ? 'Länge ziehen' : 'Breite ziehen', [nx, ny, 0]); });
        add([k.x + k.w / 2, k.y + k.d / 2, k.z + k.h], [0, 0, 1], (A, d) => { const h = Math.max(2.2, Math.min(6, Math.round((A.h + d) * 20) / 20)), dz = h - k.h; k.h = h; M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z = Math.round((q.z + dz) * 100) / 100; }); }, 'Geschosshöhe ziehen'); }
      if (SEL.art === 'oeff') { const o = M.oeff.find((x) => x.id === SEL.id), k = o && kz(o.k); if (!k) return L;
        const E = seiteEcken(k, o.seite), Ln = Math.hypot(E[1][0] - E[0][0], E[1][1] - E[0][1]), tx = [(E[1][0] - E[0][0]) / Ln, (E[1][1] - E[0][1]) / Ln, 0], z0 = o.art === 'fenster' ? 0.9 : 0;
        const at = (t, zz) => [E[0][0] + (E[1][0] - E[0][0]) * t, E[0][1] + (E[1][1] - E[0][1]) * t, k.z + zz];
        add(at(o.u + o.b / 2 / Ln, z0 + o.h / 2), tx, (A, d) => { o.b = Math.max(0.4, Math.min(Ln - 0.2, Math.round((A.b + d) * 100) / 100)); }, 'Breite ziehen');
        add(at(o.u, z0 + o.h), [0, 0, 1], (A, d) => { o.h = Math.max(0.4, Math.min(k.h - z0 - 0.1, Math.round((A.h + d) * 100) / 100)); }, 'Höhe ziehen');
        add(at(o.u, z0 + o.h / 2), tx, (A, d) => { o.u = Math.max(o.b / 2 / Ln, Math.min(1 - o.b / 2 / Ln, A.u + d / Ln)); }, 'verschieben'); }
      if (SEL.art === 'gaube') { const g = M.gauben.find((x) => x.id === SEL.id), G = g && gaubeGeo(g); if (!G) return L;
        const [a, b] = G.fl.p, Ln = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = [(b[0] - a[0]) / Ln, (b[1] - a[1]) / Ln, 0];
        add(G.at(g.u + g.b / 2 / Ln, 0.3), tx, (A, d) => { g.b = Math.max(1, Math.min(8, rund(A.b + d))); }, 'Breite ziehen');
        add(G.at(g.u, 0.3), tx, (A, d) => { g.u = Math.max(0.12, Math.min(0.88, A.u + d / Ln)); }, 'verschieben'); }
      return L;
    }
    function griffeSetzen() {   // nach jedem Bild (bp3d: gezeichnet) – beim Auseinanderziehen ohne Griffe
      if (!D3) return; if (!ZG) GR = griffeListe();
      const zeig = GR.length && !D3.gespreizt(), B = D3.blick();
      while (gr.children.length > (zeig ? GR.length : 0)) gr.lastChild.remove();
      if (!zeig) return;
      GR.forEach((g, i) => { let d = gr.children[i]; if (!d) { d = DOC.createElement('div'); d.className = 'griff'; gr.appendChild(d); } d.dataset.griff = i; d.title = g.tip;
        const vorn = !g.n || g.n[0] * B[0] + g.n[1] * B[1] + g.n[2] * B[2] > 0.02;   // Griff einer abgewandten Seite: nicht durchs Gebäude zeigen
        const p = vorn && D3.proj(g.p); d.hidden = !p; if (p) { d.style.left = p[0] + 'px'; d.style.top = p[1] + 'px'; } });
    }
    gr.addEventListener('pointerdown', (e) => { const g = e.target.closest('[data-griff]'); if (!g || !D3) return; e.preventDefault(); e.stopPropagation();
      const G = GR[+g.dataset.griff], a = D3.proj(G.p), b = D3.proj([G.p[0] + G.ax[0], G.p[1] + G.ax[1], G.p[2] + G.ax[2]]); if (!a || !b) return;
      const v = [b[0] - a[0], b[1] - a[1]], o = SEL.art === 'oeff' ? M.oeff.find((x) => x.id === SEL.id) : SEL.art === 'gaube' ? M.gauben.find((x) => x.id === SEL.id) : kz(SEL.id);
      ZG = { G, v, x: e.clientX, y: e.clientY, A: { ...o }, n: v[0] * v[0] + v[1] * v[1] || 1, el: g }; g.classList.add('zieht'); g.setPointerCapture(e.pointerId); });
    gr.addEventListener('pointermove', (e) => { if (!ZG) return; const d = ((e.clientX - ZG.x) * ZG.v[0] + (e.clientY - ZG.y) * ZG.v[1]) / ZG.n; ZG.d = d;
      if (!ZG.f) ZG.f = requestAnimationFrame(() => { if (!ZG) return; ZG.f = 0; ZG.G.fn(ZG.A, ZG.d); bild(true); tippe('Ziehen: ' + ZG.G.tip + ' · ' + masz()); }); });
    const zgEnde = () => { if (!ZG) return; ZG.el.classList.remove('zieht'); ZG = null; bild(); };
    gr.addEventListener('pointerup', zgEnde); gr.addEventListener('pointercancel', zgEnde);
    const masz = () => { if (!SEL) return ''; if (SEL.art === 'oeff' || SEL.art === 'gaube') { const o = SEL.art === 'oeff' ? M.oeff.find((x) => x.id === SEL.id) : M.gauben.find((x) => x.id === SEL.id); return o ? de(o.b) + (o.h ? ' × ' + de(o.h) : '') + ' m' : ''; }
      const k = kz(SEL.id); return k ? `${de(k.w, 1)} × ${de(k.d, 1)} m, ${de(k.h)} m hoch` : ''; };

    /* ───────── Hineinziehen aus der Symbolreihe (C1): passende Stelle grün ───────── */
    let ZUG = null;
    $('#pal').addEventListener('pointerdown', (e) => { const s = e.target.closest('[data-stein]'); if (!s) return; e.preventDefault();
      ZUG = { art: s.dataset.stein, geist: DOC.createElement('div'), z: null }; ZUG.geist.className = 'geist'; ZUG.geist.textContent = s.title.split(' – ')[0]; root.appendChild(ZUG.geist); bewegen(e); });
    const W = DOC.defaultView || window;
    W.addEventListener('pointermove', (e) => { if (ZUG && root.isConnected) bewegen(e); });
    W.addEventListener('pointerup', (e) => { if (!ZUG || !root.isConnected) return; const z = ZUG.z, art = ZUG.art; ZUG.geist.remove(); ZUG = null; if (D3) D3.ziel([]); if (z) ablegen(art, z, e); });
    function ziel(e) {   // was liegt unter dem Zeiger und passt zum Baustein?
      if (!D3 || !D3.feld.contains(DOC.elementFromPoint(e.clientX, e.clientY))) return null;
      const x = D3.bei(e.clientX, e.clientY), r = x && REF.get(x.i); if (!r) return null; const a = ZUG.art;
      if (['sattel', 'walm', 'pult', 'flach'].includes(a)) { const k = kz(r.id); return (r.art === 'wand' || r.art === 'koerper' || r.art === 'dach') && k && oben(k) ? { k, ids: M.koerper.filter((q) => q.id === k.id).flatMap((q) => idsVon({ art: 'koerper', id: q.id }).concat(SK.flatMap((s) => idsVon({ art: 'wand', id: q.id, seite: s })))) } : null; }
      if (a.startsWith('gaube')) { const k = r.art === 'dach' && kz(r.id), fi = x.i - ID0 - M.koerper.indexOf(k) * 20 - 6, fl = k && dachFlaechen(k)[fi]; return fl && /Dachfläche/.test(fl.n) ? { k, fl: fi, ids: [x.i] } : null; }
      return r.art === 'wand' ? { k: kz(r.id), seite: r.seite, ids: [x.i] } : null;
    }
    function bewegen(e) { ZUG.geist.style.left = e.clientX + 12 + 'px'; ZUG.geist.style.top = e.clientY + 12 + 'px'; ZUG.e = e;
      if (!ZUG.f) ZUG.f = requestAnimationFrame(() => { if (!ZUG) return; ZUG.f = 0; ZUG.z = ziel(ZUG.e); if (D3) D3.ziel(ZUG.z ? ZUG.z.ids : []); }); }
    function aufFlaeche(pts3, e) {   // Zeigerpunkt → (t, s) auf einer Fläche mit Ecken a, b (unten) und d (oben links) – im Bild gerechnet
      const R = D3.feld.getBoundingClientRect(), x = e.clientX - R.left, y = e.clientY - R.top, P = pts3.map((p) => D3.proj(p)); if (P.some((p) => !p)) return [0.5, 0.5];
      const [a, b, , d] = P, ux = b[0] - a[0], uy = b[1] - a[1], vx = d[0] - a[0], vy = d[1] - a[1], det = ux * vy - uy * vx || 1;
      return [((x - a[0]) * vy - (y - a[1]) * vx) / det, (ux * (y - a[1]) - uy * (x - a[0])) / det];
    }
    function ablegen(art, z, e) {
      M.n++;
      if (['sattel', 'walm', 'pult', 'flach'].includes(art)) { const D = M.dach[z.k.id]; M.dach[z.k.id] = { form: art, first: D && D.first ? D.first : z.k.w >= z.k.d ? 'x' : 'y', aufbau: D && D.aufbau && art !== 'flach' && D.form !== 'flach' ? D.aufbau : korbHol('dach', art === 'flach' ? VOR.flach : VOR.dach) }; SEL = { art: 'dach', id: z.k.id }; }
      else if (art.startsWith('gaube')) { const [t] = aufFlaeche(dachFlaechen(z.k)[z.fl].p, e); const g = { id: 'g' + M.n, k: z.k.id, fl: z.fl, u: Math.max(0.15, Math.min(0.85, t)), b: 2.4, form: art.slice(6) || 'Schleppgaube', rahmen: 'Kunststoff', fach: 3 }; M.gauben.push(g); SEL = { art: 'gaube', id: g.id }; }
      else { const [t] = aufFlaeche(seiteEcken(z.k, z.seite), e), o = { id: 'o' + M.n, k: z.k.id, seite: z.seite, art: art === 'tuer' ? 'tuer' : art === 'fenstert' ? 'fenstertuer' : 'fenster', u: Math.max(0.08, Math.min(0.92, t)),
        b: art === 'fenster' ? 1.26 : art === 'tuer' ? 1.1 : 1.01, h: art === 'fenster' ? 1.38 : 2.13, rahmen: 'Kunststoff', fach: 3 }; M.oeff.push(o); SEL = { art: 'oeff', id: o.id }; }
      MEHR = []; bild();
    }
    $('#palzu').addEventListener('click', () => { PALAUF = !PALAUF; try { localStorage.setItem('bp.bk.pal', PALAUF ? 'auf' : 'zu'); } catch { /* egal */ } palette(); });

    /* ───────── Angaben rechts ───────── */
    const optK = (art, w) => `<optgroup label="Im Gebäudemodell (Korb)">${Object.values(KORB).filter((e) => e.art === art).map((e) => `<option value="${e.id}"${e.id === w ? ' selected' : ''}>${esc(e.name)}${e.u ? ' · U ' + de(e.u) : ''}</option>`).join('')}</optgroup>`
      + `<optgroup label="Aus der Bibliothek – kommt in den Korb">${BIB[art].map(([k, n, u]) => `<option value="bib:${k}">${esc(n)}${u ? ' · U ' + de(u) : ''}</option>`).join('')}</optgroup>`;
    const nutzer = (id) => { const L = []; M.koerper.forEach((k) => { if (k.wand === id) L.push(k.name); Object.values(k.seiten || {}).forEach((v) => { if (v === id) L.push(k.name + ' Seite'); }); if (k.boden === id) L.push(k.name + ' Boden'); const D = M.dach[k.id]; if (D && D.aufbau === id) L.push('Dach'); Object.values((D || {}).fl || {}).forEach((v) => { if (v === id) L.push('Dachfläche'); }); }); return L; };
    const verkn = (id) => `<p class="hinweis">🔗 fest verknüpft mit „${esc(aufbau(id)[1])}“ im Korb – gilt für ${nutzer(id).length} Bauteil${nutzer(id).length === 1 ? '' : 'e'}. <button type="button" class="kn" data-korbzeig="${id}">zeigen</button></p>`;
    const korbWahl = (art, v) => (v.startsWith('bib:') ? korbHol(art, v.slice(4)) : v);
    const pruef = (u, max) => (u ? (u <= max ? `<span class="ok">✓ U ${de(u)} ≤ ${de(max)}</span>` : `<span class="nein">✗ U ${de(u)} > ${de(max)}</span>`) : '');
    const dickeTxt = (id, std) => `<p class="hinweis">Dicke ${de(dicke(id, std) * 100, 1)} cm${KORB[id] && BIB[KORB[id].art].find((y) => y[0] === KORB[id].von && y[3]) ? ' – aus den Schichten des Aufbaus' : ' – übliche Dicke (Aufbau ohne Schichtdicken)'}</p>`;
    const fensterHtml = (o, kat, uw) => `<label class="feld">Rahmen</label><div class="chips">${RAHMEN.map((r) => `<button type="button" data-rahmen="${r}" aria-pressed="${o.rahmen === r}">${r}</button>`).join('')}</div>
      <label class="feld">Verglasung</label><div class="chips">${[2, 3].map((f) => `<button type="button" data-fach="${f}" aria-pressed="${o.fach === f}">${f}-fach</button>`).join('')}</div>
      <label class="feld">Uw in W/(m²K) – aus dem Katalog: ${de(kat)}</label><div class="uw"><input type="number" step="0.01" min="0.5" max="6" value="${uw}" data-uw>${o.uw != null ? '<button type="button" class="kn" data-uwzur title="Wert aus dem Katalog">↺</button>' : ''}${pruef(uw, UMAX.fenster)}</div>`;
    const obj = () => M.oeff.find((x) => x.id === SEL.id) || M.gauben.find((x) => x.id === SEL.id);
    /* Im Gebäudemodell (Mock „Bauteile wie der LV-Baum“ F1, 21.11.2026): rechts nur der Baukörper – Maße und Befehle; den Aufbau wählt man im
       Eigenschaften-Fenster der Bauteile (OPT.eigenschaften(ids) – derselbe Editor wie in der Tabelle; der Korb-Eintrag folgt im Kern) */
    const eigKurz = (titel, A, ids, mehr) => `<div class="feld bkx-eig"><span>${esc(titel)}: <b>${esc(A[1])}</b></span><button type="button" class="kn" data-bkeig="${ids.join(',')}">Aufbau … (Eigenschaften)</button>${mehr ? `<div class="hinweis">${mehr}</div>` : ''}</div>`;
    function detail() {
      const el = $('#detail'); if (!el) return;
      if (SEL && MEHR.length) return mehrfach(el);
      if (!SEL) { el.innerHTML = '<h2>Auswahl</h2><p class="hinweis">Ein Bauteil im Modell anklicken – mit Strg mehrere. Rechtsklick zeigt, was an der Stelle geht (Geschoss, Anbau, Dachform …).</p>'; return; }
      if (SEL.art === 'koerper' || SEL.art === 'wand') { const k = kz(SEL.id); if (!k) { SEL = null; return detail(); }
        const wid = (SEL.art === 'wand' && k.seiten && k.seiten[SEL.seite]) || k.wand, Wd = aufbau(wid);
        el.innerHTML = `<h2>${SEL.art === 'wand' ? 'Außenwand' : 'Geschoss'}</h2><dl class="w"><dt>Teil</dt><dd>${esc(M.teile[k.teil] || '')}</dd><dt>Geschoss</dt><dd>${esc(k.name)}${k.staffel ? ' · Staffelgeschoss' : ''}</dd>${SEL.art === 'wand' ? `<dt>Seite</dt><dd>${esc(SNAME[SEL.seite])} · ${de(SEL.seite[0] === 'x' ? k.d : k.w, 1)} m lang</dd>` : ''}</dl>
          ${befHtml(SEL)}
          ${k.z > 0 && SEL.art === 'koerper' ? `<div class="chips"><button type="button" data-staffel="0" aria-pressed="${!k.staffel}">Vollgeschoss</button><button type="button" data-staffel="1" aria-pressed="${!!k.staffel}">Staffelgeschoss</button></div>` : ''}
          <div class="reihe"><label class="feld">Länge m<input type="number" step="0.5" min="2" value="${k.w}" data-mass="w"></label><label class="feld">Breite m<input type="number" step="0.5" min="2" value="${k.d}" data-mass="d"></label><label class="feld">Höhe m<input type="number" step="0.1" min="2" value="${k.h}" data-mass="h"></label></div>
          ${OPT.eigenschaften ? eigKurz(`Außenwand${SEL.art === 'wand' ? ' – diese Seite' : 'e'}`, Wd, idsVon(SEL.art === 'wand' ? SEL : { art: 'wand', id: k.id, seite: 'ym' }), dickeTxt(wid, DICKE.wand) + pruef(Wd[2], UMAX.wand))
            + eigKurz(k.z < 0 ? 'Kellersohle' : 'Boden', aufbau(k.boden), [ID0 + M.koerper.indexOf(k) * 20 + 5], '')
          : `<label class="feld">Aufbau Außenwand${SEL.art === 'wand' ? ' – diese Seite' : ''}<select data-wand>${optK('wand', Wd[0])}</select></label>${verkn(Wd[0])}${dickeTxt(wid, DICKE.wand)}<div>${pruef(Wd[2], UMAX.wand)}</div>
          <label class="feld">${k.z < 0 ? 'Kellersohle' : 'Boden'}<select data-boden>${optK('boden', k.boden)}</select></label>`}`; return; }
      if (SEL.art === 'dach') { const k = kz(SEL.id), D = M.dach[SEL.id]; if (!k || !D) { SEL = null; return detail(); }
        const i = flNr(SEL), af = i == null ? D.aufbau : flAuf(SEL.id, i), A = aufbau(af), nF = DFL[D.form].length;
        el.innerHTML = `<h2>${i == null ? 'Dach' : `Dachfläche${nF > 1 ? ' ' + (i + 1) + ' von ' + nF : ''}`}</h2><dl class="w"><dt>Teil</dt><dd>${esc(M.teile[k.teil] || '')}</dd><dt>auf</dt><dd>${esc(k.name)}</dd></dl>
          ${befHtml(SEL)}
          ${OPT.eigenschaften ? eigKurz(i == null ? 'Dach' : 'Dachfläche', A, idsVon(SEL), dickeTxt(af, D.form === 'flach' ? DICKE.flach : DICKE.dach) + pruef(A[2], UMAX.dach)) : `${i == null ? '' : `<label class="feld">Aufbau dieser Dachfläche<select data-dflauf>${optK('dach', af)}</select></label>`}
          <label class="feld">Aufbau ${i == null ? '' : 'des ganzen Dachs'}<select data-dachauf>${optK('dach', D.aufbau)}</select></label>${verkn(af)}${dickeTxt(af, D.form === 'flach' ? DICKE.flach : DICKE.dach)}<div>${pruef(A[2], UMAX.dach)}</div>
          ${i != null && D.fl && D.fl[i] ? '<p class="hinweis">Diese Fläche hat einen eigenen Aufbau – „Aufbau des ganzen Dachs“ gilt für die übrigen.</p>' : ''}`}`; return; }
      if (SEL.art === 'gaube') { const g = M.gauben.find((x) => x.id === SEL.id); if (!g) { SEL = null; return detail(); } const kat = UW[g.rahmen][g.fach === 3 ? 1 : 0], uw = g.uw ?? kat;
        el.innerHTML = `<h2>Gaube</h2>${befHtml(SEL)}<div class="chips">${['Schleppgaube', 'Satteldachgaube', 'Flachdachgaube'].map((f) => `<button type="button" data-gform="${f}" aria-pressed="${g.form === f}">${f}</button>`).join('')}</div>
          <label class="feld">Breite m<input type="number" step="0.1" min="1" max="8" value="${g.b}" data-gb></label><h2>Fenster der Gaube</h2>${fensterHtml(g, kat, uw)}`; return; }
      if (SEL.art === 'oeff') { const o = M.oeff.find((x) => x.id === SEL.id); if (!o) { SEL = null; return detail(); } const kat = o.art === 'tuer' ? 1.8 : UW[o.rahmen][o.fach === 3 ? 1 : 0], uw = o.uw ?? kat;
        el.innerHTML = `<h2>${o.art === 'tuer' ? 'Haustür' : o.art === 'fenstertuer' ? 'Fenstertür' : 'Fenster'}</h2>${befHtml(SEL)}
          <div class="reihe"><label class="feld">Breite m<input type="number" step="0.01" min="0.4" value="${o.b}" data-ob></label><label class="feld">Höhe m<input type="number" step="0.01" min="0.4" value="${o.h}" data-oh></label><span></span></div>
          ${o.art !== 'tuer' ? fensterHtml(o, kat, uw) : `<label class="feld">Uw in W/(m²K) – aus dem Katalog: ${de(kat)}</label><div class="uw"><input type="number" step="0.01" min="0.5" max="6" value="${uw}" data-uw>${pruef(uw, 1.8)}</div>`}`; }
    }
    let tz = 0; const spaeterBild = () => { clearTimeout(tz); tz = setTimeout(() => bild(), 350); };
    $('#detail').addEventListener('input', (e) => { const t = e.target, d = t.dataset;
      if (MEHR.length && MF) { if ('mmass' in d) { const v = +t.value; if (!(v >= (d.mmass === 'h' ? 2 : 1))) return; if (d.mmass !== 'h') bisPlatz(MF.K, d.mmass, v); else MF.K.forEach((k) => { const alt = k[d.mmass]; k[d.mmass] = v; if (d.mmass === 'h') M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z = Math.round((q.z + v - alt) * 100) / 100; }); }); spaeterBild(); }
        if ('muw' in d) MF.FE.forEach((o) => { o.uw = t.value ? +t.value : null; }); return; }
      if (d.mass) { const k = kz(SEL.id), v = Math.max(1, +t.value || 0), alt = k[d.mass]; k[d.mass] = v; if (d.mass === 'h') M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z = Math.round((q.z + v - alt) * 100) / 100; }); else { k[d.mass] = alt; bisPlatz(M.koerper.filter((q) => q.teil === k.teil && q.x === k.x && q.y === k.y && q[d.mass] === alt), d.mass, v); } spaeterBild(); }
      if ('ob' in d || 'oh' in d || 'uw' in d || 'gb' in d) { const o = obj(); if ('ob' in d) o.b = +t.value; if ('oh' in d) o.h = +t.value; if ('gb' in d) o.b = +t.value; if ('uw' in d) o.uw = +t.value; spaeterBild(); } });
    $('#detail').addEventListener('change', (e) => { const t = e.target, d = t.dataset;
      if (MEHR.length && MF) { if (!t.value) return; if ('mwand' in d) { const v = korbWahl('wand', t.value); MF.W.forEach((x) => { const k = kz(x.id); if (x.art === 'wand') { k.seiten = k.seiten || {}; k.seiten[x.seite] = v; } else { k.wand = v; k.seiten = {}; } }); }
        if ('mdach' in d) { const v = korbWahl('dach', t.value); MF.D.forEach((x) => { if (flNr(x) == null) M.dach[x.id].aufbau = v; else flSetzen(x.id, flNr(x), v); }); } return bild(); }
      if ('wand' in d) { const k = kz(SEL.id), v = korbWahl('wand', t.value); if (SEL.art === 'wand') { k.seiten = k.seiten || {}; k.seiten[SEL.seite] = v; } else { k.wand = v; k.seiten = {}; } }
      if ('boden' in d) kz(SEL.id).boden = korbWahl('boden', t.value);
      if ('dachauf' in d) { M.dach[SEL.id].aufbau = korbWahl('dach', t.value); if (M.dach[SEL.id].fl) Object.entries(M.dach[SEL.id].fl).forEach(([i, v]) => flSetzen(SEL.id, i, v)); }
      if ('dflauf' in d) flSetzen(SEL.id, flNr(SEL), korbWahl('dach', t.value));
      if (['wand', 'boden', 'dachauf', 'dflauf'].some((x) => x in d)) bild(); });
    $('#detail').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if ('bkeig' in d) return OPT.eigenschaften && OPT.eigenschaften(d.bkeig.split(',').map(Number).filter(Boolean));
      if ('bef' in d) { const f = BEF[+d.bef]; if (f && !f.aus) f.fn(); return; }
      if (MEHR.length && MF) { const FE = MF.FE;
        if ('mrahmen' in d) FE.forEach((o) => { o.rahmen = d.mrahmen; o.uw = null; });
        if ('mfach' in d) FE.forEach((o) => { o.fach = +d.mfach; o.uw = null; });
        if ('mweg' in d) { SEL = null; MEHR = []; }
        if ('manbau' in d) anbau([SEL, ...MEHR].map((x) => kz(x.id)), d.manbau);
        if ('mentf' in d) { [SEL, ...MEHR].map((x) => kz(x.id)).sort((a, c) => c.z - a.z).forEach((k) => { if (M.koerper.length > 1) entfernen(k); }); SEL = null; MEHR = []; }
        return bild(); }
      if ('staffel' in d) { const k = kz(SEL.id), an = d.staffel === '1';
        if (an && !k.staffel) { k.voll = { x: k.x, y: k.y, w: k.w, d: k.d }; Object.assign(k, { staffel: true, x: k.x + RUECK, y: k.y + RUECK, w: k.w - 2 * RUECK, d: k.d - 2 * RUECK }); }
        if (!an && k.staffel) Object.assign(k, k.voll || {}, { staffel: false }); }
      else if ('gform' in d) M.gauben.find((x) => x.id === SEL.id).form = d.gform;
      else if ('rahmen' in d) { const o = obj(); o.rahmen = d.rahmen; o.uw = null; }
      else if ('fach' in d) { const o = obj(); o.fach = +d.fach; o.uw = null; }
      else if ('uwzur' in d) obj().uw = null;
      else return;
      bild(); });
    /* Mehrere gewählt (Strg, Rahmen): gemeinsam vergeben – Maße der Geschosse, Aufbau der Wände und Dächer, Rahmen/Verglasung/Uw der Fenster */
    let MF = null;
    function mehrfach(el) {
      const L = [SEL, ...MEHR], W2 = L.filter((x) => x.art === 'wand' || x.art === 'koerper'), D = L.filter((x) => x.art === 'dach'),
        FE = L.filter((x) => (x.art === 'oeff' && (M.oeff.find((o) => o.id === x.id) || {}).art !== 'tuer') || x.art === 'gaube').map((x) => (x.art === 'gaube' ? M.gauben.find((g) => g.id === x.id) : M.oeff.find((o) => o.id === x.id))).filter(Boolean);
      const K = [...new Set(W2.map((x) => x.id))].map(kz).filter(Boolean);
      const gl = (A, f) => (A.length && A.every((a) => a[f] === A[0][f]) ? A[0][f] : null), wv = (x) => { const k = kz(x.id); return x.art === 'wand' ? (k.seiten && k.seiten[x.seite]) || k.wand : k.wand; };
      const wg = W2.length && W2.every((x) => wv(x) === wv(W2[0])) ? wv(W2[0]) : '', dv = (x) => (flNr(x) == null ? M.dach[x.id].aufbau : flAuf(x.id, flNr(x))), dg = D.length && D.every((x) => dv(x) === dv(D[0])) ? dv(D[0]) : '';
      const ms = (f, st, mn) => `<label class="feld">${{ w: 'Länge', d: 'Breite', h: 'Höhe' }[f]} m<input type="number" step="${st}" min="${mn}" value="${gl(K, f) ?? ''}" placeholder="verschieden" data-mmass="${f}"></label>`;
      el.innerHTML = `<h2>Auswahl</h2><b>${L.length} Bauteile gewählt</b><p class="hinweis">Jede Angabe gilt für alle – „verschieden“, wo sie sich unterscheiden. Mit Strg weitere dazu oder wieder weg.</p>`
        + (K.length ? `<div class="reihe">${ms('w', 0.5, 2)}${ms('d', 0.5, 2)}${ms('h', 0.1, 2)}</div>` : '')
        + (OPT.eigenschaften && (W2.length || D.length) ? `<div class="bef"><button type="button" data-bkeig="${[...W2, ...D].flatMap(idsVon).join(',')}">Aufbau für alle ${W2.length + D.length} … (Eigenschaften)</button></div>` : '')
        + (W2.length && !OPT.eigenschaften ? `<label class="feld">Aufbau für alle ${W2.length} Wände${wg ? '' : ' (verschieden)'}<select data-mwand>${wg ? '' : '<option value="">– wählen –</option>'}${optK('wand', wg)}</select></label>` : '')
        + (D.length && !OPT.eigenschaften ? `<label class="feld">Aufbau für alle ${D.length} Dächer/Dachflächen${dg ? '' : ' (verschieden)'}<select data-mdach>${dg ? '' : '<option value="">– wählen –</option>'}${optK('dach', dg)}</select></label>` : '')
        + (FE.length ? `<label class="feld">Rahmen für alle ${FE.length} Fenster${gl(FE, 'rahmen') ? '' : ' (verschieden)'}</label><div class="chips">${RAHMEN.map((r) => `<button type="button" data-mrahmen="${r}" aria-pressed="${gl(FE, 'rahmen') === r}">${r}</button>`).join('')}</div>
          <label class="feld">Verglasung</label><div class="chips">${[2, 3].map((f) => `<button type="button" data-mfach="${f}" aria-pressed="${gl(FE, 'fach') === f}">${f}-fach</button>`).join('')}</div>
          <label class="feld">Uw für alle (leer = aus dem Katalog je Fenster)</label><div class="uw"><input type="number" step="0.01" min="0.5" max="6" value="${gl(FE, 'uw') ?? ''}" data-muw placeholder="Katalog"></div>` : '')
        + (() => { const WS = L.filter((x) => x.art === 'wand'), ok = WS.length > 1 && WS.length === L.length && WS.every((x) => x.seite === WS[0].seite && kz(x.id).teil === kz(WS[0].id).teil);
          return ok ? `<div class="bef"><button type="button" data-manbau="${WS[0].seite}">＋ Anbau über diese ${WS.length} Geschosse</button><button type="button" class="weg" data-mentf>${WS.length} Geschosse entfernen</button></div>` : ''; })()
        + '<div class="bef"><button type="button" data-mweg>Auswahl aufheben</button></div>';
      MF = { W: W2, D, FE, K };
    }
    function korb() {
      const ART = { wand: 'Außenwände', dach: 'Dächer', boden: 'Böden und Decken' }, used = (id) => nutzer(id).length, box = $('#korb'); if (!box) return;
      box.innerHTML = Object.entries(ART).map(([a, t]) => { const L = Object.values(KORB).filter((e) => e.art === a && used(e.id)); if (!L.length) return '';
        return `<div class="hinweis"><b>${t}</b></div>` + L.map((e) => `<div class="korb${SEL && SEL.art === 'korb' && SEL.id === e.id ? ' an' : ''}" data-korb="${e.id}">
          <button type="button" class="korbn" data-korbzeig="${e.id}" title="Verknüpfte Bauteile zeigen">🔗 ${esc(e.name)}${e.eigen ? ' <em>(eigene Fassung)</em>' : ''}<small>${e.u ? 'U ' + de(e.u) + ' · ' : ''}${used(e.id)}× verknüpft</small></button>
          <select data-korbtausch="${e.id}" aria-label="Aufbau für alle verknüpften Bauteile tauschen"><option value="">tauschen für alle ${used(e.id)} …</option>${BIB[a].map(([k, n, u]) => `<option value="${k}">${esc(n)}${u ? ' · U ' + de(u) : ''}</option>`).join('')}</select>
          <button type="button" class="kn" data-korbkopie="${e.id}" title="Eigene Fassung für das gewählte Bauteil">Kopie</button></div>`).join(''); }).join('');
    }
    HOER.forEach((H) => H.addEventListener('click', (e) => {
      const z = e.target.closest('[data-korbzeig]'); if (z) { const id = z.dataset.korbzeig, L = [];   // alle verknüpften Bauteile im Modell wählen
        M.koerper.forEach((k) => { SK.forEach((s) => { if (((k.seiten || {})[s] || k.wand) === id) L.push({ art: 'wand', id: k.id, seite: s }); }); if (k.boden === id) L.push({ art: 'koerper', id: k.id }); const D = M.dach[k.id]; if (D) DFL[D.form].forEach((i) => { if (flAuf(k.id, i) === id) L.push({ art: 'dach', id: k.id, seite: 'f' + i }); }); });
        SEL = L[0] || null; MEHR = L.slice(1); auswahlZeigen(); return seitlich(); }
      const kp = e.target.closest('[data-korbkopie]'); if (kp) { const a = KORB[kp.dataset.korbkopie], id = 'A' + (++KN); KORB[id] = { ...a, id, eigen: true, name: a.name + ' (Kopie)' };
        if (SEL && (SEL.art === 'wand' || SEL.art === 'koerper')) { const k = kz(SEL.id); if (SEL.art === 'wand') { k.seiten = k.seiten || {}; k.seiten[SEL.seite] = id; } else if (k.wand === a.id) k.wand = id; }
        else if (SEL && SEL.art === 'dach' && flNr(SEL) != null && flAuf(SEL.id, flNr(SEL)) === a.id) flSetzen(SEL.id, flNr(SEL), id); else if (SEL && SEL.art === 'dach' && M.dach[SEL.id].aufbau === a.id) M.dach[SEL.id].aufbau = id;
        bild(); }
      if (e.target.closest('[data-bkrm]')) { RM = !RM; bild(); } }));
    HOER.forEach((H) => H.addEventListener('change', (e) => { const t = e.target; if (!t.dataset.korbtausch || !t.value) return; const x = KORB[t.dataset.korbtausch], b = BIB[x.art].find((y) => y[0] === t.value);
      Object.assign(x, { von: b[0], name: b[1] + (x.eigen ? ' (Kopie)' : ''), u: b[2] }); bild(); }));
    function sync() {   // was im Assistenten steht – dieselben Angaben, aus dem Baukasten gelesen
      const box = $('#sync'); if (!box) return;
      const T = Object.entries(M.teile).map(([t, n]) => { const K = M.koerper.filter((k) => k.teil === t).sort((a, b) => a.z - b.z); if (!K.length) return '';
        const eg = K.find((k) => k.z >= 0) || K[0], kel = K.some((k) => k.z < 0), ober = K.filter((k) => k.z > 0).length, dk = K.find((k) => M.dach[k.id]), D = dk && M.dach[dk.id];
        const fl = K.filter((k) => k.z >= 0).reduce((a, k) => a + k.w * k.d, 0), F = M.oeff.filter((o) => K.some((k) => k.id === o.k) && o.art !== 'tuer');
        return `<li><b>${esc(n)}</b>: ${de(eg.w, 1)} × ${de(eg.d, 1)} m, ${kel ? 'Keller + ' : ''}EG${ober ? ' + ' + ober + ' OG' : ''} · ${de(fl, 0)} m² BGF · ${D ? esc((DACHF.find((x) => x[0] === D.form) || [])[1]) : '<span class="nein">ohne Dach</span>'}${F.length ? ` · ${F.length} Fenster` : ''}</li>`; }).join('');
      box.innerHTML = `<ul>${T}</ul><div class="bef"><button type="button" data-bkrm aria-pressed="${RM}">${RM ? 'Räume ausblenden' : 'Räume je Geschoss zeigen'}</button></div>`;
    }
    function raeume() {
      const box = $('#raeume'); if (!box) return; box.hidden = !RM; if (!RM) return;
      const G = {}; RAEUME.forEach((r) => { (G[r.geschoss || '–'] = G[r.geschoss || '–'] || []).push(r); });
      $('#rliste').innerHTML = Object.keys(G).length ? Object.entries(G).map(([g, L]) => `<div class="hinweis"><b>${esc(g)}</b></div><ul>${L.map((r) => `<li>${esc(r.nr || '')} ${esc(r.name)} · ${de(r.flaeche || 0, 1)} m²</li>`).join('')}</ul>`).join('')
        : '<p class="hinweis">Noch keine Räume – der Assistent schlägt sie aus Fläche und Geschossen vor, oder unter „Räume“ im Gebäudemodell von Hand.</p>';
    }

    /* ───────── Laden und Speichern (Kern: bpcore/baukasten.py) ───────── */
    const basis = `api/bp/modell/${pid}`;
    const J = (u, m, b) => fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
      .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Der Baukasten konnte nicht geladen werden.'); return j; });
    let STAND = '', PLAN = 'hand', RAEUME = [], LADEN = false, TS = 0, RM = false, BIBOK = null, NEU = !!OPT.neu;
    const tippe = (t) => { const x = $('#stand'); if (x) x.textContent = t; };
    function bib() {   // Vorlagen der Baudaten – mit Dicke aus den Schichten (Standard-Option je Schicht, E1)
      const dk = (v) => { let s = 0; (v.schichten || []).forEach((x) => { const o = (x.optionen || []).find((y) => y.std) || (x.optionen || [])[0]; if (o && +o.dicke) s += +o.dicke; }); return s >= 5 ? s / 100 : 0; };
      return BIBOK || (BIBOK = Promise.all(['331', '36', '32', '35'].map((kg) => J(`${basis}/bauteile/vorlagen?kg=${kg}`))).then(([w, d, b1, b2]) => {
        const L = (A) => A.filter((v) => !v.bestand).map((v) => [v.id, v.name, null, dk(v)]);
        BIB.wand = L(w); BIB.dach = L(d); BIB.boden = L([...b1, ...b2]); }));
    }
    function daten() {
      return { baukasten: { koerper: M.koerper.map((k) => ({ id: k.id, teil: k.teil, x: k.x, y: k.y, z: k.z, w: k.w, d: k.d, h: k.h, wand: k.wand, boden: k.boden, seiten: k.seiten || {}, ...(k.staffel ? { staffel: true } : {}) })),
        dach: M.dach, gauben: M.gauben, oeff: M.oeff, teile: M.teile, raeume: RM },
      korb: Object.fromEntries(Object.values(KORB).map((e) => [e.id, { art: e.art, vorlage: e.von, name: e.name, eigen: !!e.eigen }])) };
    }
    function spaeter() { if (LADEN) return; const s = JSON.stringify(daten()); if (s === STAND) return; clearTimeout(TS); TS = setTimeout(() => speichern(s), 700); }
    /* Text fürs Rückgängig (21.11.2026: statt „Baukasten geändert“) – was sich zwischen zwei Ständen geändert hat, z. B. „Außenwand rechts
       (Erdgeschoss): Aufbau“, „Hauptgebäude, Erdgeschoss: Länge 10 → 12 m“, „Dach: Satteldach → Walmdach“, „Fenster eingesetzt“ */
    function wasText(a, b) {
      const A = a.baukasten, B = b.baukasten, T = [], tn = (k) => (B.teile || {})[k.teil] || (A.teile || {})[k.teil] || '', wo = (k) => { const q = kz(k.id); return [tn(k), q ? gname(q) : ''].filter(Boolean).join(', '); };
      const dm = (n) => Number(n).toLocaleString('de-DE', { maximumFractionDigits: 2 }), kn = (id) => (KORB[id] ? `„${KORB[id].name}“` : ''), MN = { w: 'Länge', d: 'Breite', h: 'Höhe' }, ON = { fenster: 'Fenster', fenstertuer: 'Fenstertür', tuer: 'Tür' };
      const DF = Object.fromEntries(DACHF.map((f) => [f[0], f[1]])), by = (L) => new Map((L || []).map((x) => [x.id, x])), KA = by(A.koerper), KB = by(B.koerper);
      KB.forEach((k, id) => { const o = KA.get(id);
        if (!o) { T.push(!Object.values(A.koerper).some((q) => q.teil === k.teil) ? `${tn(k) || 'Anbau'} angelegt` : k.staffel ? 'Staffelgeschoss darauf' : k.z < 0 ? 'Keller darunter' : `${tn(k)}: Geschoss darauf`); return; }
        Object.keys(MN).forEach((f) => { if (o[f] !== k[f]) T.push(`${wo(k)}: ${MN[f]} ${dm(o[f])} → ${dm(k[f])} m`); });
        if (o.wand !== k.wand) T.push(`Außenwände (${wo(k)}): Aufbau ${kn(k.wand)}`);
        SK.forEach((sd) => { if ((o.seiten || {})[sd] !== (k.seiten || {})[sd] && o.wand === k.wand) T.push(`Außenwand ${SNAME[sd]} (${wo(k)}): Aufbau ${kn((k.seiten || {})[sd] || k.wand)}`); });
        if (o.boden !== k.boden) T.push(`${k.z <= Math.min(...B.koerper.filter((q) => q.teil === k.teil).map((q) => q.z)) + 0.01 ? 'Bodenplatte' : 'Decke'} (${wo(k)}): Aufbau ${kn(k.boden)}`);
        if (!!o.staffel !== !!k.staffel) T.push(`${wo(k)}: ${k.staffel ? 'als Staffelgeschoss' : 'volle Größe'}`); });
      KA.forEach((k, id) => { if (!KB.has(id)) T.push(`${tn(k) ? tn(k) + ': ' : ''}Geschoss entfernt`); });
      const DA = A.dach || {}, DB = B.dach || {};
      Object.keys({ ...DA, ...DB }).forEach((id) => { const o = DA[id], n = DB[id];
        const zahl = Object.keys(DB).length - Object.keys(DA).length;   // wandert ein Dach nur aufs neue Geschoss, bleibt die Zahl gleich
        if (o && !n) { if (zahl < 0) T.push('Dach entfernt'); return; }
        if (!o) { if (zahl > 0) T.push(`Dach: ${DF[n.form] || n.form}`); return; }
        if (o.form !== n.form) T.push(`Dach: ${DF[o.form] || o.form} → ${DF[n.form] || n.form}`);
        else if (o.first !== n.first) T.push('Dach: First gedreht');
        if (o.aufbau !== n.aufbau) T.push(`Dach: Aufbau ${kn(n.aufbau)}`);
        if (JSON.stringify(o.fl || {}) !== JSON.stringify(n.fl || {})) T.push('Dachfläche: eigener Aufbau'); });
      const GA = by(A.gauben), GB = by(B.gauben), OA = by(A.oeff), OB = by(B.oeff);
      GB.forEach((g, id) => { const o = GA.get(id); if (!o) T.push(`${g.form} eingesetzt`); else if (JSON.stringify(o) !== JSON.stringify(g)) T.push(`${g.form}: ${o.b !== g.b ? `Breite ${dm(o.b)} → ${dm(g.b)} m` : o.form !== g.form ? 'Form' : 'Fenster'}`); });
      GA.forEach((g, id) => { if (!GB.has(id)) T.push('Gaube entfernt'); });
      OB.forEach((x, id) => { const o = OA.get(id), n = ON[x.art] || 'Fenster'; if (!o) T.push(`${n} eingesetzt`); else if (JSON.stringify(o) !== JSON.stringify(x)) T.push(`${n}: ${o.b !== x.b || o.h !== x.h ? `${dm(x.b)} × ${dm(x.h)} m` : o.u !== x.u ? 'verschoben' : 'Rahmen, Verglasung, Uw'}`); });
      OA.forEach((x, id) => { if (!OB.has(id)) T.push(`${ON[x.art] || 'Fenster'} entfernt`); });
      if (!!A.raeume !== !!B.raeume) T.push(`Räume je Geschoss ${B.raeume ? 'an' : 'aus'}`);
      if (JSON.stringify(A.teile) !== JSON.stringify(B.teile) && !T.length) T.push('Gebäudeteil umbenannt');
      if (!T.length && JSON.stringify(a.korb) !== JSON.stringify(b.korb)) T.push('Korb: Aufbau geändert');
      const U = [...new Set(T)]; return U.length ? U[0] + (U.length > 1 ? ` (+${U.length - 1})` : '') : 'Baukasten geändert';
    }
    async function speichern(s) {
      const vor = STAND, neu = NEU; STAND = s; NEU = false; tippe('wird gespeichert …');
      try {
        const r = await J(`${basis}/baukasten`, 'PUT', { ...JSON.parse(s), netz: netzBauen(), ...(neu ? { neu: true, ...(OPT.planung ? { name: 'Planung' } : {}) } : {}) }); PLAN = r.plan;
        tippe(PLAN === 'ifc' ? 'Gespeichert – es gilt ein Plan: Bauteile und 3D kommen aus dem Plan.' : 'Gespeichert – der Planstand ist nachgeführt.');
        uWerte(r);
        if (window.rueckgaengig && vor) rueckgaengig(wasText(JSON.parse(vor), JSON.parse(s)), async () => { await J(`${basis}/baukasten`, 'PUT', { ...JSON.parse(vor), netz: null }); await laden();
          await J(`${basis}/baukasten`, 'PUT', { ...daten(), netz: netzBauen() }); }, { neu: () => laden() });   // dann das Netz des alten Stands (ohne neuen Schritt) – sonst zeigten die anderen Apps das 3D von eben
        (DOC.defaultView || window).dispatchEvent(new CustomEvent('bp:modellGeaendert', { detail: { pid } }));
        if (OPT.nachher) OPT.nachher(r);
      } catch (e) { STAND = vor; NEU = neu; tippe(e.message); if (window.toast) toast(e.message, true); }
    }
    async function uWerte(r) {   // U je Aufbau im Korb – gerechnet wie überall (bp/uwert.js) an den Zeilen, die aus dem Baukasten kommen
      try {
        await skript('uwert.js', 'bpUwert'); if (!window.bpUwert || !r || !r.modell) return;
        const U = await bpUwert.holen(basis, r.rev), Z = ((r.modell.bauteilliste || {}).zeilen || []);
        Object.values(KORB).forEach((e) => { const z = Z.find((x) => x.name.endsWith('– ' + e.name)); const u = z && U[z.id]; e.u = u && u.u != null ? Math.round(u.u * 100) / 100 : null; });
        seitlich();
      } catch { /* ohne U-Werte geht es auch */ }
    }
    const skript = (datei, glob) => (window[glob] ? Promise.resolve() : new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + datei + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); }));
    async function laden() {
      LADEN = true;
      try {
        const [d] = await Promise.all([J(`${basis}/baukasten${NEU ? '?neu=1' + (OPT.planung ? '&planung=1' : '') : ''}`), bib(), skript('ansicht3d.js', 'bp3d')]), bk = d.baukasten || {};
        Object.keys(KORB).forEach((k) => delete KORB[k]); KN = 0;
        Object.entries(d.korb || {}).forEach(([id, e]) => { const b = BIB[e.art].find((y) => y[0] === e.vorlage); KORB[id] = { id, art: e.art, von: e.vorlage, name: e.name || (b && b[1]) || e.vorlage, u: null, eigen: e.eigen }; KN = Math.max(KN, +id.slice(1) || 0); });
        M.koerper = (bk.koerper || []).map((k) => ({ ...k, seiten: { ...(k.seiten || {}) } })); M.dach = bk.dach || {}; M.gauben = bk.gauben || []; M.oeff = bk.oeff || [];
        M.teile = bk.teile || { h: 'Hauptgebäude' }; RM = !!bk.raeume; PLAN = d.plan; RAEUME = d.raeume || [];
        M.koerper.forEach((k) => { if (!KORB[k.wand]) k.wand = korbHol('wand', VOR.wand);
          if (!KORB[k.boden]) k.boden = korbHol('boden', k.z <= Math.min(...M.koerper.filter((q) => q.teil === k.teil).map((q) => q.z)) + 0.01 ? VOR.boden : VOR.decke); });
        Object.entries(M.dach).forEach(([kid, D]) => { const k = kz(kid); if (k && !D.first) D.first = k.w >= k.d ? 'x' : 'y';   // ältere Stände: First wie bisher gezeigt, ab jetzt fest
          if (!KORB[D.aufbau]) D.aufbau = korbHol('dach', D.form === 'flach' ? VOR.flach : VOR.dach); if (D.fl) { Object.keys(D.fl).forEach((i) => { if (!KORB[D.fl[i]]) delete D.fl[i]; }); if (!Object.keys(D.fl).length) delete D.fl; } });
        M.n = 20 + Math.max(0, ...[...M.koerper, ...M.gauben, ...M.oeff].map((x) => +String(x.id).replace(/\D/g, '') || 0));
        SEL = null; MEHR = []; LADEN = false; STAND = NEU ? '' : JSON.stringify(daten()); bild(true); seitlich();
        tippe(PLAN === 'ifc' ? 'Es gilt ein Plan (IFC): Bauteile und 3D kommen aus dem Plan; was du hier änderst, bleibt im Baukasten.' : d.herkunft === 'baukasten' ? 'Änderungen speichern sich von selbst und führen den Planstand nach.' : 'Ein Vorschlag – mit der ersten Änderung entsteht der Planstand.');
        if (NEU) spaeter();
      } catch (e) { LADEN = false; tippe(e.message); }
    }
    laden();
    return { neu: () => { NEU = false; return laden(); }, daten, get d3() { return D3; } };
  }
  window.bpBaukasten = { mount };
}());
