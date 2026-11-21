/* bp/gebaeudekasten.js – Gebäude-Baukasten (GO 20.11.2026, Mock „Gebäude-Baukasten“: A3 B2 C D2 E1 F1/F2 G1 H1) – global bpBaukasten.
   Das Gebäude per Klick und Ziehen: ＋/− je Geschoss und Wandfläche (Geschoss, Keller, Staffelgeschoss, Anbau), Dächer, Gauben, Fenster und
   Türen aus der Leiste hineinziehen, Größe an den violetten Griffen ziehen (0,5-m-Raster), mit Strg mehrere wählen und gemeinsam vergeben.
   Aufbauten liegen im Korb des Projekts (fest verknüpft, „Kopie“ für Abweichungen). Steht neben dem Planungsassistenten – beide füllen dieselben
   Angaben; Ergebnis ist der Planstand „Assistent“ mit Bauteilen aus der Geometrie und 3D (Kern bpcore/baukasten.py).
   bpBaukasten.mount(el, pid, { nachher(antwort) }) → { neu(), daten() }. Ansicht isometrisch in SVG (kein WebGL nötig). */
(function () {
  if (window.bpBaukasten) return;
  const STIL = `.bkx{--grund:var(--bg,#f3f5f7);--flaeche:var(--card,#fff);--linie:var(--line,#d6dce3);--text:var(--ink,#1c2733);--leise:var(--mute,#5d6b7a);--akzent:var(--y,#1f6fb2);--akzent-hell:color-mix(in srgb,var(--akzent) 12%,transparent);
--wahl:#7b2ff7;--wahl-hell:color-mix(in srgb,#7b2ff7 10%,transparent);--rot:var(--red,#c92a2a);--rot-hell:color-mix(in srgb,var(--rot) 10%,transparent);--gruen:var(--ok,#2b8a3e);--gruen-hell:color-mix(in srgb,var(--gruen) 10%,transparent);--r:calc(8px*var(--rk,1));display:grid;gap:10px;color:var(--text)}
.bkx .bkx-kopf{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.bkx .bkx-kopf .hinweis{flex:1 1 16rem}
.bkx.breit .haupt{grid-template-columns:11rem minmax(0,1fr) 20rem}.bkx:not(.breit) .haupt{grid-template-columns:minmax(0,1fr)}.bkx:not(.breit) .pal{grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))}
.bkx:not(.breit) .buehne{height:min(60vh,560px)}.bkx .stein{background:var(--flaeche);color:var(--text)}
.bkx select,.bkx input[type=number]{background:var(--inp,var(--flaeche));color:var(--text);border:1px solid var(--linie)}.bkx .chips button{background:var(--flaeche)}
.bkx .bkx-seite{display:grid;gap:12px;align-content:start;min-width:0}
.bkx .bkx-kn[aria-pressed="true"]{border-color:var(--akzent);color:var(--akzent);font-weight:600}.bkx .palk.aus{opacity:.45;pointer-events:none}
.bkx .raeume ul{margin:0;padding-left:1.1rem;font-size:.86rem}.bkx .stand{font-size:.8rem;color:var(--leise)}
.bkx .haupt{display:grid;grid-template-columns:minmax(0,1fr) 20rem;gap:12px;align-items:start}
.bkx .kasten{background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--r);padding:10px 12px;display:grid;gap:8px;min-width:0}
.bkx .kasten h2{font-size:.74rem;text-transform:uppercase;letter-spacing:.07em;color:var(--leise);margin:0;font-weight:600}
.bkx .pal{display:grid;gap:6px}
.bkx .stein{display:flex;align-items:center;gap:8px;border:1px solid var(--linie);border-radius:7px;padding:6px 8px;background:var(--flaeche);color:var(--text);cursor:grab;user-select:none;touch-action:none;font-size:.88rem}
.bkx .stein:active{cursor:grabbing}
.bkx .stein svg{flex:none;width:30px;height:24px}
.bkx .stein small{display:block;color:var(--leise);font-size:.74rem}
.bkx .buehne svg{user-select:none;-webkit-user-select:none;touch-action:none}.bkx .buehne{position:relative;background:linear-gradient(#eef3f8,#dfe6ee);border:1px solid var(--linie);border-radius:var(--r);height:min(74vh,700px);min-height:420px;overflow:hidden}
.bkx .buehne svg{width:100%;height:100%;display:block;touch-action:none}
.bkx .oben{position:absolute;left:10px;top:10px;right:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;pointer-events:none}
.bkx .oben>*{pointer-events:auto}
.bkx .seg{display:inline-flex;background:var(--flaeche);border:1px solid var(--linie);border-radius:14px;padding:2px}
.bkx .seg button,.bkx .kn{border:0;background:none;color:var(--text);font:inherit;font-weight:500;padding:.25rem .65rem;border-radius:12px;cursor:pointer;font-size:.86rem}
.bkx .kn{border:1px solid var(--linie);background:var(--flaeche)}
.bkx .seg button[aria-pressed="true"]{background:var(--akzent);color:#fff}
.bkx .tipp{position:absolute;left:10px;bottom:10px;right:10px;font-size:.8rem;color:var(--leise);background:rgba(255,255,255,.85);color:#5d6b7a;border-radius:6px;padding:4px 8px;pointer-events:none}
.bkx .plus{cursor:pointer}
.bkx .plus circle{fill:#fff;stroke:var(--akzent);stroke-width:1.5}
.bkx .plus text{fill:var(--akzent);font:600 15px var(--lauf);text-anchor:middle;dominant-baseline:central;pointer-events:none}
.bkx .plus:hover circle{fill:var(--akzent)}
.bkx .plus:hover text{fill:#fff}
.bkx .plus.minus circle{stroke:var(--rot)}
.bkx .plus.minus text{fill:var(--rot)}
.bkx .plus.minus:hover circle{fill:var(--rot)}
.bkx .plus.minus:hover text{fill:#fff}
.bkx .plus .pl{font:500 10.5px var(--lauf);fill:var(--akzent);text-anchor:middle;pointer-events:none;paint-order:stroke;stroke:#fff;stroke-width:3px}
.bkx .f{stroke:#3b4552;stroke-width:.8;stroke-linejoin:round;cursor:pointer}
.bkx .f:hover{filter:brightness(1.06)}
.bkx .f.an{stroke:var(--wahl);stroke-width:2.2}
.bkx .f.ziel{fill:#cfe3f7 !important;stroke:var(--akzent);stroke-width:2}
.bkx .geist{position:fixed;pointer-events:none;z-index:50;background:var(--flaeche);color:var(--text);border:1px solid var(--akzent);border-radius:7px;padding:4px 8px;font-size:.84rem;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.bkx dl.w{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:0;font-size:.88rem}
.bkx dl.w dt{color:var(--leise)}
.bkx dl.w dd{margin:0}
.bkx label.feld{display:grid;gap:3px;font-size:.84rem;color:var(--leise)}
.bkx select,.bkx input[type=number]{font:inherit;font-size:.9rem;padding:4px 6px;border:1px solid var(--linie);border-radius:6px;background:var(--inp,var(--flaeche));color:var(--text);width:100%}
.bkx .reihe{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.bkx .chips{display:flex;flex-wrap:wrap;gap:5px}
.bkx .chips button{font:inherit;font-size:.84rem;border:1px solid var(--linie);background:var(--flaeche);border-radius:14px;padding:.18rem .6rem;cursor:pointer;color:var(--text)}
.bkx .chips button[aria-pressed="true"]{border-color:var(--akzent);background:var(--akzent-hell);color:var(--akzent);font-weight:600}
.bkx .uw{display:flex;align-items:center;gap:8px}
.bkx .uw input{width:5.5rem}
.bkx .ok{color:var(--gruen);font-weight:600}
.bkx .nein{color:var(--rot);font-weight:600}
.bkx .sync{background:var(--gruen-hell);border-color:#b7dcc0}
.bkx .sync li{margin:2px 0}
.bkx .sync ul{margin:0;padding-left:1.1rem;font-size:.86rem}
.bkx .hinweis{color:var(--leise);font-size:.84rem;margin:0}
.bkx .weg{color:var(--rot);border-color:#f0c4c4}
.bkx .griff{cursor:grab}
.bkx .griff rect{fill:#fff;stroke:var(--wahl);stroke-width:2}
.bkx .griff:hover rect{fill:var(--wahl)}
.bkx .korb{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 6px;align-items:center;border:1px solid var(--linie);border-radius:7px;padding:5px 7px}
.bkx .korb.an{border-color:var(--wahl);background:var(--wahl-hell)}
.bkx .korbn{grid-column:1/-1;text-align:left;font:inherit;font-size:.88rem;background:none;border:0;padding:0;cursor:pointer;color:var(--text)}
.bkx .korbn small{display:block;color:var(--leise);font-size:.78rem}
.bkx .korb select{font-size:.8rem;padding:2px 4px}
.bkx.eingebettet .haupt{grid-template-columns:minmax(0,1fr)}.bkx.eingebettet .buehne{height:calc(100vh - 230px);min-height:380px}
.bkx.bkx-aus{padding:10px;gap:10px}`;
  function mount(el, pid, OPT = {}) {
    const DOC = el.ownerDocument || document;
    if (!DOC.getElementById('bkx-stil')) { const s = DOC.createElement('style'); s.id = 'bkx-stil'; s.textContent = STIL; DOC.head.appendChild(s); }
    el.innerHTML = `<div class="bkx"><div class="bkx-kopf"><span class="hinweis" data-bk="stand">Baukasten wird geladen …</span></div><div class="haupt">
    <section class="kasten palk" aria-label="Bausteine zum Hineinziehen">
      <h2>Hineinziehen</h2>
      <div class="pal" data-bk="pal"></div>
      <p class="hinweis">Dach auf ein oberstes Geschoss, Gaube auf eine Dachfläche, Fenster und Türen auf eine Wand ziehen.</p>
    </section>

    <div class="buehne" data-bk="buehne">
      <svg data-bk="sv" aria-label="Gebäude als Baukasten"></svg>
      <div class="oben">
        <div class="seg" role="group" aria-label="Blickrichtung"><button type="button" data-dreh="-1" title="Gebäude nach links drehen">⟲ drehen</button><button type="button" data-dreh="1" title="Gebäude nach rechts drehen">drehen ⟳</button></div>
        <button type="button" class="kn bkx-kn" data-bk="plus" aria-pressed="true">✓ Bearbeiten beenden</button><button type="button" class="kn bkx-kn" data-bk="rm" aria-pressed="false" title="Räume je Geschoss neben dem Bild (F)">Räume</button>
        <button type="button" class="kn" data-bk="knNeu" title="Aus den Angaben des Assistenten neu aufbauen">Neu aus dem Assistenten</button>
      </div>
      <div class="tipp" data-bk="tipp">＋ fügt an, − nimmt weg · am gewählten Bauteil die violetten Griffe ziehen: Länge, Breite, Höhe, Fenster- und Gaubengröße · Bausteine aus der Leiste hineinziehen · Klick auf ein Bauteil zeigt rechts seine Angaben, mit Strg mehrere gemeinsam (z. B. die Wandflächen von EG und OG einer Seite → Anbau über beide Geschosse) · auf freier Fläche ziehen dreht und neigt das Gebäude</div>
    </div>

    <aside class="bkx-seite">
      <section class="kasten" data-bk="detail" aria-live="polite"></section>
      <section class="kasten" aria-label="Aufbauten im Gebäudemodell">
        <h2>Aufbauten im Gebäudemodell (Korb)</h2>
        <div data-bk="korb"></div>
        <p class="hinweis">Jedes Bauteil ist fest mit einem Aufbau im Korb verknüpft. Tauschst du hier den Aufbau, ändern sich alle verknüpften Bauteile – in Kosten, Wärmeschutz und LV. „Kopie“ macht eine eigene Fassung, z. B. für eine Seite mit anderer Dämmung.</p>
      </section>
      <section class="kasten raeume" data-bk="raeume" hidden><h2>Räume je Geschoss</h2><div data-bk="rliste"></div></section>
      <section class="kasten sync">
        <h2>Steht so auch im Planungsassistenten</h2>
        <div data-bk="sync"></div>
      </section>
    </aside>
  </div></div>`;
    const root = el.querySelector('.bkx'), AS = root.querySelector('aside'), ORTE = [root];
    root.classList.toggle('breit', (el.clientWidth || 0) >= 1100);
    /* Eingebettet im Gebäudemodell (GO 20.11.2026, Mock „Gebäudemodell schlank“: eine 3D-Ansicht, F1 Korb rechts als Reiter): die Bühne steht in
       der Mitte, Bausteine zum Hineinziehen, Angaben und Korb gibt der Baustein als zwei Kästen heraus – OPT.seite({ detail, korb }) setzt sie in den Bereich rechts */
    let HOER = [AS];
    if (OPT.seite) {
      root.classList.add('eingebettet');
      const wD = DOC.createElement('div'), wK = DOC.createElement('div'); wD.className = 'bkx bkx-aus'; wK.className = 'bkx bkx-aus';
      wD.append(root.querySelector('.palk'), AS.querySelector('[data-bk="detail"]'), AS.querySelector('[data-bk="raeume"]'));   // Bausteine zum Hineinziehen bleiben rechts an der Seite (21.11.2026)
      wK.append(...AS.children); AS.remove();
      ORTE.push(wD, wK); HOER = [wD, wK]; OPT.seite({ detail: wD, korb: wK });
    }

  'use strict';
  const $ = (s) => { const q = s.replace(/^#(\w+)$/, '[data-bk="$1"]'); for (const o of ORTE) { const x = o.querySelector(q); if (x) return x; } return null; }, esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const de = (n, st = 2) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: st, maximumFractionDigits: st });
  const NS = 'http://www.w3.org/2000/svg';
  // Bibliothek (Beispiele – in der Plattform: die Vorlagen des Baukastens mit Schichten; U-Werte rechnet der Wärmeschutz)
  // Bibliothek = Vorlagen der Baudaten (geladen beim Öffnen: KG 331 Außenwände, 36 Dächer, 32/35 Böden und Decken); U-Werte rechnet bp/uwert.js
  const RAHMEN = ['Holz', 'Kunststoff', 'Holz-Alu', 'Alu'], UW = { Holz: [1.3, 0.9], Kunststoff: [1.2, 0.85], 'Holz-Alu': [1.2, 0.8], Alu: [1.5, 1.0] };
  /* Korb des Gebäudemodells: die Aufbauten dieses Projekts. Bauteile sind fest damit verknüpft – ändert man den Aufbau im Korb, ändern sich alle. */
  const BIB = { wand: [], dach: [], boden: [] }, KORB = {}; let KN = 0;
  const VOR = { wand: '331.02', dach: '363.04', flach: '363.09', boden: '322.04', decke: '351.01' };   // wie bpcore/baukasten.VORGABE
  function korbHol(art, von) { const x = Object.values(KORB).find((e) => e.art === art && e.von === von && !e.eigen); if (x) return x.id; const id = 'A' + (++KN), b = BIB[art].find((y) => y[0] === von) || [von, von, null]; KORB[id] = { id, art, von, name: b[1], u: b[2] }; return id; }
  const aufbau = (id) => { const e = KORB[id]; return e ? [e.id, e.name, e.u] : ['', '–', 0]; };
  const UMAX = { wand: 0.24, dach: 0.24, fenster: 1.3, boden: 0.3 };   // Anlage 7 GModG (Änderung) – nur zur Anzeige im Mock
  const DACHF = [['sattel', 'Satteldach', 38], ['walm', 'Walmdach', 35], ['pult', 'Pultdach', 15], ['flach', 'Flachdach', 0]];
  const STEINE = [['sattel', 'Satteldach', 'aufs oberste Geschoss'], ['walm', 'Walmdach', ''], ['pult', 'Pultdach', ''], ['flach', 'Flachdach', ''],
    ['gaube:Schleppgaube', 'Schleppgaube', 'auf eine Dachfläche'], ['gaube:Satteldachgaube', 'Satteldachgaube', ''], ['gaube:Flachdachgaube', 'Flachdachgaube', ''], ['fenster', 'Fenster', 'auf eine Wand'], ['fenstert', 'Fenstertür', 'auf eine Wand'], ['tuer', 'Haustür', 'auf eine Wand']];
  const IKON = { 'gaube:Schleppgaube': '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M10 15h9v-5l-9 1z" fill="#d9c7b3" stroke="#5d6b7a"/>', 'gaube:Satteldachgaube': '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M10 16v-5l4.5-4 4.5 4v5z" fill="#d9c7b3" stroke="#5d6b7a"/>', 'gaube:Flachdachgaube': '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M10 15h9V9h-9z" fill="#d9c7b3" stroke="#5d6b7a"/>', sattel: '<path d="M3 20h24M5 20V12l10-8 10 8v8" fill="#e7d6c5" stroke="#5d6b7a"/>', walm: '<path d="M3 20h24M5 20V12l6-7h8l6 7v8" fill="#e7d6c5" stroke="#5d6b7a"/>',
    pult: '<path d="M3 20h24M5 20V8l20 4v8" fill="#e7d6c5" stroke="#5d6b7a"/>', flach: '<path d="M3 20h24M5 20V9h20v11" fill="#e7d6c5" stroke="#5d6b7a"/>',
    gaube: '<path d="M2 20l13-12 13 12" fill="none" stroke="#5d6b7a"/><path d="M11 14h8v-5h-8z" fill="#d9c7b3" stroke="#5d6b7a"/>', fenster: '<rect x="8" y="4" width="14" height="16" fill="#cfe3f2" stroke="#5d6b7a"/><path d="M15 4v16M8 12h14" stroke="#5d6b7a"/>',
    fenstert: '<rect x="9" y="2" width="12" height="20" fill="#cfe3f2" stroke="#5d6b7a"/><path d="M15 2v20" stroke="#5d6b7a"/>', tuer: '<rect x="9" y="3" width="12" height="19" fill="#9d7c5c" stroke="#5d6b7a"/><circle cx="18" cy="13" r="1" fill="#fff"/>' };
  $('#pal').innerHTML = STEINE.map(([k, n, s]) => `<div class="stein" data-stein="${k}"><svg viewBox="0 0 30 24">${IKON[k]}</svg><span>${esc(n)}${s ? `<small>${esc(s)}</small>` : ''}</span></div>`).join('');

  /* Modell: Körper (Geschosse) mit Lage und Maßen, Dach auf einem Körper, Gauben auf einer Dachfläche, Fenster/Türen auf einer Wand */
  const M = { koerper: [], dach: {}, gauben: [], oeff: [], n: 0, teile: { h: 'Hauptgebäude' } };
  let DR = null, SEL = null, PLUS = true, MEHR = [];   // MEHR: mit Strg dazu gewählte Bauteile (gemeinsam vergeben)
  const gleichS = (a, b) => a && b && a.art === b.art && a.id === b.id && (a.seite || '') === (b.seite || '');
  const ist = (art, id, seite) => [SEL, ...MEHR].some((x) => gleichS(x, { art, id, seite }));
  const kz = (id) => M.koerper.find((k) => k.id === id);
  const oben = (k) => !M.koerper.some((q) => q.teil === k.teil && Math.abs(q.z - (k.z + k.h)) < 0.01);
  const RUECK = 1.25;   // Staffelgeschoss: so weit rückt es allseitig zurück (mit den Griffen änderbar)
  const gname = (k, z) => { const L = M.koerper.filter((q) => q.teil === k.teil).map((q) => q.z).sort((a, b) => a - b), i = L.indexOf(z); const eg = L.indexOf(L.find((v) => v >= 0)) ; const n = i - eg; return n < 0 ? (n === -1 ? 'Kellergeschoss' : n + '. UG') : n === 0 ? 'Erdgeschoss' : n + '. Obergeschoss'; };
  function namen() { M.koerper.forEach((k) => { k.name = gname(k, k.z); }); }

  /* Ansicht: frei drehbar (20.11.2026) – Ziehen auf freier Fläche dreht um die Hochachse und neigt; „drehen“ = Vierteldrehung.
     Parallelprojektion: u quer zur Blickrichtung, v zum Betrachter; sichtbar sind die Seiten, deren Normale zum Betrachter zeigt */
  const S = 15;   // Pixel je Meter (wird an die Bühne angepasst)
  let SK = S, OX = 0, OY = 0;
  let YAW = Math.PI / 4, NEIG = 0.55;   // Drehung um die Hochachse, Neigung (0 = von der Seite, π/2 = von oben)
  const uv = (x, y) => { const c = Math.cos(YAW), si = Math.sin(YAW); return [x * c - y * si, x * si + y * c]; };
  const pr = (x, y, z) => { const [u, v] = uv(x, y); return [OX + u * 1.22 * SK, OY + v * Math.sin(NEIG) * 1.22 * SK - z * Math.cos(NEIG) * 1.15 * SK]; };
  const tiefe = (x, y, z) => { const v = uv(x, y)[1]; return v * Math.cos(NEIG) + z * Math.sin(NEIG) * 0.01; };
  const SEITEN = { xp: [1, 0], xm: [-1, 0], yp: [0, 1], ym: [0, -1] };
  const sichtbar = (s) => { if (!SEITEN[s]) return true; return uv(...SEITEN[s])[1] > 0.02; };   // „top“ (Dach oben) sieht man immer
  function seiteEcken(k, s) {   // vier Ecken einer Seitenwand, unten links → unten rechts (im Uhrzeigersinn von außen gesehen) → oben
    const x0 = k.x, x1 = k.x + k.w, y0 = k.y, y1 = k.y + k.d, z0 = k.z, z1 = k.z + k.h;
    const L = { xp: [[x1, y1], [x1, y0]], xm: [[x0, y0], [x0, y1]], yp: [[x0, y1], [x1, y1]], ym: [[x1, y0], [x0, y0]] }[s];
    return [[...L[0], z0], [...L[1], z0], [...L[1], z1], [...L[0], z1]];
  }
  const DACHH = (k, f) => { const neig = (DACHF.find((x) => x[0] === f) || [, , 0])[2]; const kurz = Math.min(k.w, k.d); return f === 'pult' ? Math.tan(neig * Math.PI / 180) * kurz : f === 'flach' ? 0.35 : Math.tan(neig * Math.PI / 180) * kurz / 2; };
  // Dachflächen einzeln (20.11.2026): je Fläche ein eigener Aufbau möglich (D.fl = { Index: Korb }) – Reihenfolge wie bpcore/baukasten.FLAECHEN
  const DFL = { flach: [0], pult: [0], sattel: [0, 1], walm: [0, 1, 2, 3] };
  const flAuf = (kid, i) => { const D = M.dach[kid]; return (D && D.fl && D.fl[i]) || (D && D.aufbau); };
  function flSetzen(kid, i, v) { const D = M.dach[kid]; if (!D) return; D.fl = { ...(D.fl || {}) }; if (v === D.aufbau) delete D.fl[i]; else D.fl[i] = v; if (!Object.keys(D.fl).length) delete D.fl; }
  const flNr = (x) => (x && x.seite && x.seite[0] === 'f' ? +x.seite.slice(1) : null);
  function dachFlaechen(k) {   // Polygone des Dachs (Weltkoordinaten) mit Name
    const D = M.dach[k.id]; if (!D) return [];
    const ue = D.form === 'pult' ? 0 : 0.4, x0 = k.x - ue, x1 = k.x + k.w + ue, y0 = k.y - ue, y1 = k.y + k.d + ue,   /* Pultdach ohne Überstand */ z = k.z + k.h, H = DACHH(k, D.form), la = k.w >= k.d;
    if (D.form === 'flach') return [{ n: 'Dach', p: [[x0, y0, z + H], [x1, y0, z + H], [x1, y1, z + H], [x0, y1, z + H]], seite: 'top' },
      ...['xp', 'yp', 'xm', 'ym'].map((s) => ({ n: 'Attika', s, p: { xp: [[x1, y1, z], [x1, y0, z], [x1, y0, z + H], [x1, y1, z + H]], yp: [[x0, y1, z], [x1, y1, z], [x1, y1, z + H], [x0, y1, z + H]], xm: [[x0, y0, z], [x0, y1, z], [x0, y1, z + H], [x0, y0, z + H]], ym: [[x1, y0, z], [x0, y0, z], [x0, y0, z + H], [x1, y0, z + H]] }[s] }))];
    if (D.form === 'pult') return [{ n: 'Dachfläche', p: [[x0, y0, z + H], [x1, y0, z + H], [x1, y1, z], [x0, y1, z]], seite: 'yp' },
      { n: 'Ortgang', s: 'xp', p: [[x1, y1, z], [x1, y0, z], [x1, y0, z + H]] }, { n: 'Ortgang', s: 'xm', p: [[x0, y0, z], [x0, y1, z], [x0, y0, z + H]] }, { n: 'Rückwand', s: 'ym', p: [[x1, y0, z], [x0, y0, z], [x0, y0, z + H], [x1, y0, z + H]] }];
    if (D.form === 'walm') { const e = Math.min(k.w, k.d) / 2;
      if (la) { const r0 = [x0 + e, (y0 + y1) / 2, z + H], r1 = [x1 - e, (y0 + y1) / 2, z + H];
        return [{ n: 'Dachfläche', seite: 'yp', p: [[x0, y1, z], [x1, y1, z], r1, r0] }, { n: 'Dachfläche', seite: 'ym', p: [[x1, y0, z], [x0, y0, z], r0, r1] }, { n: 'Walmfläche', seite: 'xp', p: [[x1, y1, z], [x1, y0, z], r1] }, { n: 'Walmfläche', seite: 'xm', p: [[x0, y0, z], [x0, y1, z], r0] }]; }
      const r0 = [(x0 + x1) / 2, y0 + e, z + H], r1 = [(x0 + x1) / 2, y1 - e, z + H];
      return [{ n: 'Dachfläche', seite: 'xp', p: [[x1, y1, z], [x1, y0, z], r0, r1] }, { n: 'Dachfläche', seite: 'xm', p: [[x0, y0, z], [x0, y1, z], r1, r0] }, { n: 'Walmfläche', seite: 'yp', p: [[x0, y1, z], [x1, y1, z], r1] }, { n: 'Walmfläche', seite: 'ym', p: [[x1, y0, z], [x0, y0, z], r0] }]; }
    if (la) { const r0 = [x0, (y0 + y1) / 2, z + H], r1 = [x1, (y0 + y1) / 2, z + H];
      return [{ n: 'Dachfläche', seite: 'yp', p: [[x0, y1, z], [x1, y1, z], r1, r0] }, { n: 'Dachfläche', seite: 'ym', p: [[x1, y0, z], [x0, y0, z], r0, r1] }, { n: 'Giebel', s: 'xp', p: [[x1, y1, z], [x1, y0, z], r1] }, { n: 'Giebel', s: 'xm', p: [[x0, y0, z], [x0, y1, z], r0] }]; }
    const r0 = [(x0 + x1) / 2, y0, z + H], r1 = [(x0 + x1) / 2, y1, z + H];
    return [{ n: 'Dachfläche', seite: 'xp', p: [[x1, y1, z], [x1, y0, z], r0, r1] }, { n: 'Dachfläche', seite: 'xm', p: [[x0, y0, z], [x0, y1, z], r1, r0] }, { n: 'Giebel', s: 'yp', p: [[x0, y1, z], [x1, y1, z], r1] }, { n: 'Giebel', s: 'ym', p: [[x1, y0, z], [x0, y0, z], r0] }];
  }
  const TEILF = ['#e8dfd2', '#dfe7d6', '#dde3ee', '#eedfe4'];
  const farbeTeil = (t) => TEILF[Object.keys(M.teile).indexOf(t) % TEILF.length];
  const hell = (h, f) => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`; };

  function zeichnen(still) {
    namen();
    const sv = $('#sv'), R = sv.getBoundingClientRect();
    // Maßstab: alles ins Bild
    const P = []; M.koerper.forEach((k) => { [[k.x, k.y], [k.x + k.w, k.y], [k.x, k.y + k.d], [k.x + k.w, k.y + k.d]].forEach(([x, y]) => { P.push([x, y, k.z]); P.push([x, y, k.z + k.h + (M.dach[k.id] ? DACHH(k, M.dach[k.id].form) : 0)]); }); });
    if (!ZG) {   // beim Ziehen bleibt der Maßstab stehen – sonst springt das Bild unter der Maus; beim Drehen bleibt er auch, nur die Mitte folgt
    const sk0 = SK, halt = DR && DR.weit; SK = 1; OX = 0; OY = 0; const Q = P.map((p) => pr(...p)); const xs = Q.map((q) => q[0]), ys = Q.map((q) => q[1]);
    const bw = Math.max(...xs) - Math.min(...xs) || 1, bh = Math.max(...ys) - Math.min(...ys) || 1;
    SK = halt ? sk0 : Math.min((R.width - 160) / bw, (R.height - 170) / bh, 34); OX = R.width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2 * SK; OY = R.height / 2 + 20 - (Math.min(...ys) + Math.max(...ys)) / 2 * SK;
    }
    const F = [];   // Flächen: {d (Tiefe), html}
    const poly = (pts, fill, attrs, an) => `<polygon class="f${an ? ' an' : ''}" points="${pts.map((p) => pr(...p).map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${attrs}/>`;
    const mitte = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length, a[2] + p[2] / pts.length], [0, 0, 0]);
    for (const k of M.koerper) {
      const f = farbeTeil(k.teil), an = ist('koerper', k.id);
      for (const s of Object.keys(SEITEN)) { if (!sichtbar(s)) continue; const E = seiteEcken(k, s), m = mitte(E), a = uv(...SEITEN[s])[0];
        F.push({ d: tiefe(m[0], m[1], 0) - 0.2, h: poly(E, hell(f, 0.84 + 0.1 * a), `data-k="${k.id}" data-seite="${s}"`, an || ist('wand', k.id, s) || (SEL && SEL.art === 'korb' && (k.seiten && k.seiten[s] || k.wand) === SEL.id)) }); }
      if (!M.dach[k.id] && (oben(k) || M.koerper.some((q) => q.teil === k.teil && q.staffel && Math.abs(q.z - (k.z + k.h)) < 0.01))) {   // oben offen oder Terrasse um ein Staffelgeschoss
        const T = [[k.x, k.y, k.z + k.h], [k.x + k.w, k.y, k.z + k.h], [k.x + k.w, k.y + k.d, k.z + k.h], [k.x, k.y + k.d, k.z + k.h]], m = mitte(T);
        F.push({ d: tiefe(m[0], m[1], 0) - 0.3, h: poly(T, hell(f, 1.03 > 1 ? 1 : 1), `data-k="${k.id}" data-seite="top"`, an) }); }
      dachFlaechen(k).forEach((x, i) => { if (x.s && !sichtbar(x.s)) return; if (x.seite && x.seite !== 'top' && !sichtbar(x.seite) && x.n === 'Dachfläche') { /* abgewandte Dachfläche: trotzdem zeichnen, liegt hinten */ }
        const m = mitte(x.p), dn = /Dach|Walm/.test(x.n) ? '#b56a4f' : hell(f, 0.86);
        F.push({ d: tiefe(m[0], m[1], 0) + (x.seite && sichtbar(x.seite) ? 0.1 : -0.5), h: poly(x.p, x.n === 'Dach' ? '#9aa3ad' : dn, `data-dach="${k.id}" data-fl="${i}"`, ist('dach', k.id) || ist('dach', k.id, 'f' + i) || (SEL && SEL.art === 'korb' && (DFL[M.dach[k.id].form].includes(i) ? flAuf(k.id, i) : M.dach[k.id].aufbau) === SEL.id)) }); });
    }
    // Gauben: kleiner Körper auf der Dachfläche (vereinfacht: Box mit Frontfenster)
    for (const g of M.gauben) { const k = kz(g.k); if (!k || !M.dach[k.id]) continue; const fl = dachFlaechen(k)[g.fl]; if (!fl || (fl.seite && fl.seite !== 'top' && !sichtbar(fl.seite))) continue;   // Gaube auf der abgewandten Dachfläche: liegt hinten
      const [a, b, c, d] = fl.p, u = g.u, br = g.b / Math.hypot(b[0] - a[0], b[1] - a[1]), at = (t, s) => [a[0] + (b[0] - a[0]) * t + (d[0] - a[0]) * s, a[1] + (b[1] - a[1]) * t + (d[1] - a[1]) * s, a[2] + (b[2] - a[2]) * t + (d[2] - a[2]) * s];
      const p0 = at(u - br / 2, 0.2), p1 = at(u + br / 2, 0.2), q0 = at(u - br / 2, 0.75), q1 = at(u + br / 2, 0.75), hz = Math.max(q0[2], q1[2]);
      const mid = (A, B) => [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], first = hz + 0.9;
      let front = [p0, p1, [p1[0], p1[1], hz], [p0[0], p0[1], hz]], dachG = [[p0[0], p0[1], hz], [p1[0], p1[1], hz], [q1[0], q1[1], hz + 0.25], [q0[0], q0[1], hz + 0.25]], dach2 = null;   // Schleppgaube: flach geneigt nach hinten
      if (g.form === 'Flachdachgaube') dachG = [[p0[0], p0[1], hz], [p1[0], p1[1], hz], [q1[0], q1[1], hz], [q0[0], q0[1], hz]];
      if (g.form === 'Satteldachgaube') { const fm = mid(p0, p1), qm = mid(q0, q1); front = [p0, p1, [p1[0], p1[1], hz], [fm[0], fm[1], first], [p0[0], p0[1], hz]];
        dachG = [[p0[0], p0[1], hz], [fm[0], fm[1], first], [qm[0], qm[1], first], [q0[0], q0[1], hz]]; dach2 = [[p1[0], p1[1], hz], [fm[0], fm[1], first], [qm[0], qm[1], first], [q1[0], q1[1], hz]]; }
      const m = mitte(front), an = ist('gaube', g.id), sch = (t) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
      const fen = [[...sch(0.2), p0[2] + 0.25], [...sch(0.8), p0[2] + 0.25], [...sch(0.8), hz - 0.2], [...sch(0.2), hz - 0.2]];
      F.push({ d: tiefe(m[0], m[1], 0) + 0.4, h: (dach2 ? poly(dach2, '#93533d', `data-gaube="${g.id}"`, an) : '') + poly(front, '#ece4d8', `data-gaube="${g.id}"`, an) + poly(dachG, g.form === 'Flachdachgaube' ? '#9aa3ad' : '#a65f46', `data-gaube="${g.id}"`, an) + poly(fen, g.rahmen === 'Alu' ? '#b9c6d2' : '#bcd7ea', `data-gaube="${g.id}"`, an) }); }
    // Fenster und Türen auf den Wänden
    for (const o of M.oeff) { const k = kz(o.k); if (!k || !sichtbar(o.seite)) continue; const E = seiteEcken(k, o.seite), L = Math.hypot(E[1][0] - E[0][0], E[1][1] - E[0][1]);
      const at = (t, zz) => [E[0][0] + (E[1][0] - E[0][0]) * t, E[0][1] + (E[1][1] - E[0][1]) * t, k.z + zz];
      const t0 = o.u - o.b / 2 / L, t1 = o.u + o.b / 2 / L, z0 = o.art === 'fenster' ? 0.9 : 0, z1 = z0 + o.h, pts = [at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1)], m = mitte(pts);
      const an = ist('oeff', o.id), fill = o.art === 'tuer' ? '#9d7c5c' : o.rahmen === 'Alu' ? '#b9c6d2' : o.rahmen === 'Kunststoff' ? '#d7e6f2' : '#bcd7ea';
      F.push({ d: tiefe(m[0], m[1], 0) + 0.05, h: poly(pts, fill, `data-oeff="${o.id}"`, an) + (o.art !== 'tuer' ? `<polyline points="${[at((t0 + t1) / 2, z0), at((t0 + t1) / 2, z1)].map((p) => pr(...p).map((v) => v.toFixed(1)).join(',')).join(' ')}" stroke="#5d6b7a" stroke-width=".8" fill="none" pointer-events="none"/>` : '') }); }
    F.sort((a, b) => a.d - b.d);
    // Plus-Knöpfe: oben (Geschoss), unten (Keller, nur am untersten), an sichtbaren Seiten (Anbau – nur am untersten Geschoss eines Teils)
    let plus = '';
    if (PLUS) for (const k of M.koerper) {
      const knopf = (p, was, txt, lab, minus) => `<g class="plus${minus ? ' minus' : ''}" data-plus="${was}" data-k="${k.id}" transform="translate(${p[0].toFixed(1)},${p[1].toFixed(1)})"><title>${esc(txt)}</title><circle r="${minus ? 9 : 11}"/><text>${minus ? '−' : '＋'}</text>${lab ? `<text class="pl" y="22">${esc(lab)}</text>` : ''}</g>`;
      const frei = (s) => { const [nx, ny] = SEITEN[s]; return !M.koerper.some((q) => q.id !== k.id && q.z < k.z + k.h && q.z + q.h > k.z && (nx ? Math.abs((nx > 0 ? q.x : q.x + q.w) - (nx > 0 ? k.x + k.w : k.x)) < 0.01 : Math.abs((ny > 0 ? q.y : q.y + q.d) - (ny > 0 ? k.y + k.d : k.y)) < 0.01)); };   // Seite ohne angebauten Nachbarn
      const cx = k.x + k.w / 2, cy = k.y + k.d / 2;
      if (oben(k)) {   // an der Oberkante des Geschosses: Mitte der oberen Kante der vorderen sichtbaren Wand (nicht auf dem Dach)
        const vs = (Object.keys(SEITEN).filter((s) => sichtbar(s) && frei(s)).length ? Object.keys(SEITEN).filter((s) => sichtbar(s) && frei(s)) : Object.keys(SEITEN).filter(sichtbar)).map((s) => { const E = seiteEcken(k, s), m = [(E[2][0] + E[3][0]) / 2, (E[2][1] + E[3][1]) / 2]; return [tiefe(m[0], m[1], 0) + (s[0] === 'x' ? k.d : k.w) * 10, m]; }).sort((a, b) => b[0] - a[0])[0][1];   // lieber die lange Seite (Traufe), dann die vordere
        plus += knopf(pr(vs[0], vs[1], k.z + k.h), 'oben', M.dach[k.id] ? 'Geschoss darüber einfügen (das Dach wandert mit nach oben)' : 'Geschoss darüber', 'Geschoss');
        if (k.z >= 0) { const q = pr(vs[0], vs[1], k.z + k.h); plus += knopf([q[0] + 84, q[1]], 'staffel', 'Staffelgeschoss darüber (zurückgesetzt, mit Flachdach)', 'Staffel'); } }
      const unten = !M.koerper.some((q) => q.teil === k.teil && q.z < k.z);
      if (unten && !M.koerper.some((q) => q.teil === k.teil && q.z < 0) && k.z === 0) plus += knopf(pr(cx, cy, k.z - 1.3), 'unten', 'Keller darunter', 'Keller');
      for (const s of Object.keys(SEITEN)) { if (!sichtbar(s) || !frei(s)) continue; const E = seiteEcken(k, s), m = mitte([E[0], E[1]]), [nx, ny] = SEITEN[s];   // je Geschoss und Wandfläche: ＋ Anbau, − Geschoss weg
        plus += knopf(pr(m[0] + nx * 1.6, m[1] + ny * 1.6, k.z + k.h / 2), 'seite:' + s, `Anbau an dieser Seite – im ${k.name}`, k.z === 0 ? 'Anbau' : '');
        if (M.koerper.length > 1) plus += knopf(pr(m[0], m[1], k.z + k.h * 0.18), 'weg', `${k.name} entfernen (darüber rückt nach unten)`, '', true); }
    }
    sv.innerHTML = F.map((f) => f.h).join('') + plus + griffe();
    detail(); sync(); korb(); raeume(); if (!still) spaeter();
  }

  /* Größe ziehen (20.11.2026): am gewählten Bauteil Griffe – Geschoss/Anbau an jeder sichtbaren Seite (Länge, Breite) und oben (Höhe),
     Fenster rechts (Breite), oben (Höhe), Mitte (verschieben), Gaube seitlich (Breite). Ziehen rechnet die Mausbewegung auf die Richtung im Bild um. */
  let GR = [];
  const rund = (v) => Math.round(v * 2) / 2;   // B2: 0,5-m-Raster
  /* Staffelgeschoss (und jedes kleinere Geschoss auf einem größeren) rastet beim Ziehen an der Kante des Geschosses darunter ein (20.11.2026) */
  const RAST = 0.4;
  function einrasten(k, nx, ny) {
    const u = M.koerper.find((q) => q.teil === k.teil && q.id !== k.id && Math.abs(q.z + q.h - k.z) < 0.01); if (!u) return;
    if (nx > 0 && Math.abs(k.x + k.w - (u.x + u.w)) < RAST) k.w = Math.round((u.x + u.w - k.x) * 100) / 100;
    if (nx < 0 && Math.abs(k.x - u.x) < RAST) { k.w = Math.round((k.w + k.x - u.x) * 100) / 100; k.x = u.x; }
    if (ny > 0 && Math.abs(k.y + k.d - (u.y + u.d)) < RAST) k.d = Math.round((u.y + u.d - k.y) * 100) / 100;
    if (ny < 0 && Math.abs(k.y - u.y) < RAST) { k.d = Math.round((k.d + k.y - u.y) * 100) / 100; k.y = u.y; }
  }
  function griffe() {
    GR = []; if (!SEL || !PLUS) return '';
    const add = (p, ax, fn, tip) => GR.push({ p, ax, fn, tip });
    /* mehrere Geschosse eines Teils gewählt (Strg): ein Höhen-Griff oben – die Höhe teilt sich gleichmäßig auf die Geschosse auf */
    const GS = [...new Map([SEL, ...MEHR].filter((x) => x.art === 'koerper' || x.art === 'wand').map((x) => [x.id, kz(x.id)])).values()].filter(Boolean);
    if (MEHR.length && GS.length > 1 && GS.every((k) => k.teil === GS[0].teil)) { GS.sort((a, b) => a.z - b.z); const o = GS[GS.length - 1], h0 = GS.map((k) => k.h);
      add([o.x + o.w / 2, o.y + o.d / 2, o.z + o.h], [0, 0, 1], (A, d) => { const je = d / GS.length; GS.forEach((k, i) => { const z0 = k.z + k.h, h = Math.max(2.2, Math.min(6, Math.round((h0[i] + je) * 100) / 100)), dz = h - k.h; k.h = h;
        M.koerper.forEach((q) => { if (q.teil === k.teil && q.z >= z0 - 0.01) q.z = Math.round((q.z + dz) * 100) / 100; }); }); }, `Höhe ziehen – verteilt auf ${GS.length} Geschosse`);
      return GR.map((g, i) => { const [x, y] = pr(...g.p); return `<g class="griff" data-griff="${i}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><title>${esc(g.tip)}</title><rect x="-6" y="-6" width="12" height="12" rx="2"/></g>`; }).join(''); }
    if (SEL.art === 'koerper' || SEL.art === 'wand') { const k = kz(SEL.id); if (!k) return '';
      const zm = k.z + k.h / 2, folge = (f, v) => M.koerper.forEach((q) => { if (q.teil === k.teil && q.id !== k.id && Math.abs(q.x - k.x) < .01 && Math.abs(q.y - k.y) < .01 && Math.abs(q.w - k.w) < .01 && Math.abs(q.d - k.d) < .01) q[f] = v; });
      for (const s of Object.keys(SEITEN)) { if (!sichtbar(s)) continue; const [nx, ny] = SEITEN[s], c = [k.x + k.w / 2 + nx * k.w / 2, k.y + k.d / 2 + ny * k.d / 2, zm];
        add(c, [nx, ny, 0], (A, d) => { const o = A; if (nx) { const w = Math.max(2, rund(o.w + d)); M.koerper.forEach((q) => { if (q.teil === k.teil && Math.abs(q.x - o.x) < .01 && Math.abs(q.w - o.w) < .01) { if (nx < 0) q.x = rund(o.x + o.w - w); q.w = w; } }); }
          else { const dd = Math.max(2, rund(o.d + d)); M.koerper.forEach((q) => { if (q.teil === k.teil && Math.abs(q.y - o.y) < .01 && Math.abs(q.d - o.d) < .01) { if (ny < 0) q.y = rund(o.y + o.d - dd); q.d = dd; } }); }
          einrasten(k, nx, ny); }, nx ? 'Länge ziehen' : 'Breite ziehen'); }
      add([k.x + k.w / 2, k.y + k.d / 2, k.z + k.h], [0, 0, 1], (A, d) => { const h = Math.max(2.2, Math.min(6, Math.round((A.h + d) * 20) / 20)), dz = h - k.h; k.h = h; M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z = rund(q.z + dz); }); }, 'Geschosshöhe ziehen'); }
    if (SEL.art === 'oeff') { const o = M.oeff.find((x) => x.id === SEL.id), k = o && kz(o.k); if (!k || !sichtbar(o.seite)) return '';
      const E = seiteEcken(k, o.seite), L = Math.hypot(E[1][0] - E[0][0], E[1][1] - E[0][1]), tx = [(E[1][0] - E[0][0]) / L, (E[1][1] - E[0][1]) / L, 0], z0 = o.art === 'fenster' ? (o.br ?? 0.9) : 0;
      const at = (t, zz) => [E[0][0] + (E[1][0] - E[0][0]) * t, E[0][1] + (E[1][1] - E[0][1]) * t, k.z + zz];
      add(at(o.u + o.b / 2 / L, z0 + o.h / 2), tx, (A, d) => { o.b = Math.max(0.4, Math.min(L - 0.2, Math.round((A.b + d) * 100) / 100)); }, 'Breite ziehen');
      add(at(o.u, z0 + o.h), [0, 0, 1], (A, d) => { o.h = Math.max(0.4, Math.min(k.h - z0 - 0.1, Math.round((A.h + d) * 100) / 100)); }, 'Höhe ziehen');
      add(at(o.u, z0 + o.h / 2), tx, (A, d) => { o.u = Math.max(o.b / 2 / L, Math.min(1 - o.b / 2 / L, A.u + d / L)); }, 'verschieben'); }
    if (SEL.art === 'gaube') { const g = M.gauben.find((x) => x.id === SEL.id), k = g && kz(g.k), fl = k && dachFlaechen(k)[g.fl]; if (!fl) return '';
      const [a, b, , d4] = fl.p, L = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, 0], at = (t, s2) => [a[0] + (b[0] - a[0]) * t + (d4[0] - a[0]) * s2, a[1] + (b[1] - a[1]) * t + (d4[1] - a[1]) * s2, a[2] + (b[2] - a[2]) * t + (d4[2] - a[2]) * s2];
      add(at(g.u + g.b / 2 / L, 0.3), tx, (A, d) => { g.b = Math.max(1, Math.min(8, rund(A.b + d))); }, 'Breite ziehen');
      add(at(g.u, 0.3), tx, (A, d) => { g.u = Math.max(0.12, Math.min(0.88, A.u + d / L)); }, 'verschieben'); }
    return GR.map((g, i) => { const [x, y] = pr(...g.p); return `<g class="griff" data-griff="${i}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><title>${esc(g.tip)}</title><rect x="-6" y="-6" width="12" height="12" rx="2"/></g>`; }).join('');
  }
  let ZG = null;
  $('#sv').addEventListener('pointerdown', (e) => { const g = e.target.closest('[data-griff]'); if (!g) return; e.preventDefault(); e.stopPropagation();
    const G = GR[+g.dataset.griff], a = pr(...G.p), b = pr(G.p[0] + G.ax[0], G.p[1] + G.ax[1], G.p[2] + G.ax[2]), v = [b[0] - a[0], b[1] - a[1]];
    const o = SEL.art === 'oeff' ? M.oeff.find((x) => x.id === SEL.id) : SEL.art === 'gaube' ? M.gauben.find((x) => x.id === SEL.id) : kz(SEL.id);   // bei mehreren Geschossen merkt sich der Griff die Höhen selbst
    ZG = { G, v, x: e.clientX, y: e.clientY, A: { ...o }, n: v[0] * v[0] + v[1] * v[1] || 1 }; $('#sv').setPointerCapture(e.pointerId); });
  $('#sv').addEventListener('pointermove', (e) => { if (!ZG) return; const dx = e.clientX - ZG.x, dy = e.clientY - ZG.y, d = (dx * ZG.v[0] + dy * ZG.v[1]) / ZG.n;
    ZG.G.fn(ZG.A, d); const fix = ZG; zeichnen(); ZG = fix; $('#tipp').textContent = 'Ziehen: ' + ZG.G.tip + ' · ' + masz(); });
  $('#sv').addEventListener('pointerup', () => { if (ZG) { ZG = null; ZG_ENDE = Date.now(); } });
  let ZG_ENDE = 0;
  const masz = () => { if (MEHR.length) { const GS = [...new Set([SEL, ...MEHR].map((x) => x.id))].map(kz).filter(Boolean).sort((a, b) => a.z - b.z); return GS.map((k) => `${k.name} ${de(k.h)} m`).join(' · ') + ` = ${de(GS.reduce((a, k) => a + k.h, 0))} m`; }
    if (SEL.art === 'oeff' || SEL.art === 'gaube') { const o = SEL.art === 'oeff' ? M.oeff.find((x) => x.id === SEL.id) : M.gauben.find((x) => x.id === SEL.id); return de(o.b) + (o.h ? ' × ' + de(o.h) : '') + ' m'; } const k = kz(SEL.id); return `${de(k.w, 1)} × ${de(k.d, 1)} m, ${de(k.h)} m hoch`; };
  /* Klicks: Plus, Bauteile wählen */
  $('#sv').addEventListener('click', (e) => {
    if (Date.now() - ZG_ENDE < 250 || e.target.closest('[data-griff]')) return;   // Ende eines Ziehens ist kein Klick
    const p = e.target.closest('[data-plus]');
    if (p) { const k = kz(p.dataset.k), w = p.dataset.plus; M.n++;
      if (w === 'weg') { entfernen(k); SEL = null; return zeichnen(); }
      if (w === 'staffel') { const n = { ...k, id: 'k' + M.n, z: k.z + k.h, h: 2.8, boden: korbHol('boden', VOR.decke), staffel: true, voll: { x: k.x, y: k.y, w: k.w, d: k.d }, x: k.x + RUECK, y: k.y + RUECK, w: k.w - 2 * RUECK, d: k.d - 2 * RUECK };
        if (M.dach[k.id]) { delete M.dach[k.id]; M.gauben = M.gauben.filter((g) => g.k !== k.id); } M.dach[n.id] = { form: 'flach', aufbau: korbHol('dach', VOR.flach) };   // Staffel: Flachdach, darunter Terrasse
        M.koerper.push(n); SEL = { art: 'koerper', id: n.id }; MEHR = []; return zeichnen(); }
      if (w === 'oben') { const n = { ...k, id: 'k' + M.n, z: k.z + k.h, h: 2.8, boden: korbHol('boden', VOR.decke) }; if (M.dach[k.id]) { M.dach[n.id] = M.dach[k.id]; delete M.dach[k.id]; M.gauben.forEach((g) => { if (g.k === k.id) g.k = n.id; }); } M.koerper.push(n); SEL = { art: 'koerper', id: n.id }; }
      else if (w === 'unten') { const n = { ...k, id: 'k' + M.n, z: -2.6, h: 2.6, wand: korbHol('wand', VOR.wand) }; M.koerper.forEach((q) => { if (q.teil === k.teil && KORB[q.boden] && KORB[q.boden].von === VOR.boden) q.boden = korbHol('boden', VOR.decke); }); n.boden = korbHol('boden', VOR.boden); n.name = 'Kellergeschoss'; M.koerper.push(n); SEL = { art: 'koerper', id: n.id }; }
      else { anbau([k], w.slice(6)); return zeichnen(); }
      if (false) { const s = w.slice(6), [nx, ny] = SEITEN[s], t = 't' + M.n, nw = nx ? 7 : Math.min(8, k.w), nd = ny ? 6 : Math.min(7, k.d);
        M.teile[t] = 'Anbau ' + (Object.keys(M.teile).length);
        const n = { id: 'k' + M.n, teil: t, z: k.z, h: k.h, w: nw, d: nd, x: nx > 0 ? k.x + k.w : nx < 0 ? k.x - nw : k.x + (k.w - nw) / 2, y: ny > 0 ? k.y + k.d : ny < 0 ? k.y - nd : k.y + (k.d - nd) / 2, wand: korbHol('wand', VOR.wand), boden: korbHol('boden', VOR.boden) };
        M.koerper.push(n); M.dach[n.id] = { form: 'flach', aufbau: korbHol('dach', VOR.flach) }; SEL = { art: 'koerper', id: n.id }; }   // ein Anbau bekommt gleich ein Dach (Flachdach, ändern durch Hineinziehen oder rechts)
      return zeichnen(); }
    const f = e.target.closest('[data-k],[data-dach],[data-gaube],[data-oeff]');
    if (!f) { if (!(e.ctrlKey || e.metaKey)) { SEL = null; MEHR = []; } return zeichnen(); }
    const neu = f.dataset.oeff ? { art: 'oeff', id: f.dataset.oeff } : f.dataset.gaube ? { art: 'gaube', id: f.dataset.gaube } : f.dataset.dach ? { art: 'dach', id: f.dataset.dach, ...((DFL[(M.dach[f.dataset.dach] || {}).form] || []).includes(+f.dataset.fl) ? { seite: 'f' + f.dataset.fl } : {}) }
      : f.dataset.seite && f.dataset.seite !== 'top' ? { art: 'wand', id: f.dataset.k, seite: f.dataset.seite } : { art: 'koerper', id: f.dataset.k };
    if (e.ctrlKey || e.metaKey) {   // Strg: dazu oder wieder weg
      const L = [SEL, ...MEHR].filter(Boolean), i = L.findIndex((x) => gleichS(x, neu));
      if (i >= 0) L.splice(i, 1); else L.push(neu);
      SEL = L[0] || null; MEHR = L.slice(1);
    } else { SEL = neu; MEHR = []; }
    zeichnen();
  });
  root.querySelectorAll('[data-dreh]').forEach((b) => b.addEventListener('click', () => { YAW += +b.dataset.dreh * Math.PI / 2; zeichnen(); }));
  /* frei drehen: auf freier Fläche oder einem Bauteil ziehen (nicht an Griffen, ＋/−) – ein Klick ohne Bewegung wählt weiter aus */
  $('#sv').addEventListener('pointerdown', (e) => { if (e.button !== 0 || e.target.closest('[data-griff],[data-plus]')) return; DR = { x: e.clientX, y: e.clientY, yaw: YAW, neig: NEIG, weit: false, id: e.pointerId }; });
  $('#sv').addEventListener('pointermove', (e) => { if (!DR || ZG) return; const dx = e.clientX - DR.x, dy = e.clientY - DR.y;
    if (!DR.weit && Math.hypot(dx, dy) < 5) return; if (!DR.weit) { DR.weit = true; $('#sv').setPointerCapture(DR.id); }
    YAW = DR.yaw - dx * 0.01; NEIG = Math.max(0.12, Math.min(1.45, DR.neig + dy * 0.006)); zeichnen(true); });
  const drEnde = () => { const w = DR && DR.weit; if (w) ZG_ENDE = Date.now(); DR = null; if (w) zeichnen(true); };   // nach dem Drehen einmal neu einpassen
  $('#sv').addEventListener('pointerup', drEnde); $('#sv').addEventListener('pointercancel', drEnde);
  $('#plus').addEventListener('click', (e) => { PLUS = !PLUS; const b = e.currentTarget; b.setAttribute('aria-pressed', String(PLUS)); b.textContent = PLUS ? '✓ Bearbeiten beenden' : '✎ Bearbeiten';
    root.querySelector('.palk').classList.toggle('aus', !PLUS); $('#tipp').textContent = PLUS ? TIPP : 'Ansehen · ✎ Bearbeiten zeigt wieder ＋/− und die Bausteine zum Hineinziehen'; zeichnen(); });
  const TIPP = $('#tipp').textContent;
  $('#knNeu').addEventListener('click', async () => { if (!(await (window.bpFrage ? bpFrage('Den Baukasten aus den Angaben des Assistenten neu aufbauen? Was du hier gezeichnet hast, geht verloren (Rückgängig bleibt).', { ok: 'Neu aufbauen' }) : true))) return; laden(true); });
  if (window.ResizeObserver) new ResizeObserver(() => { if (root.isConnected && !ZG && M.koerper.length) zeichnen(true); }).observe($('#buehne'));

  /* Hineinziehen aus der Leiste */
  let ZUG = null;
  $('#pal').addEventListener('pointerdown', (e) => { const s = e.target.closest('[data-stein]'); if (!s) return; e.preventDefault();
    ZUG = { art: s.dataset.stein, geist: document.createElement('div') }; ZUG.geist.className = 'geist'; ZUG.geist.textContent = s.textContent.trim().split('\n')[0]; document.body.appendChild(ZUG.geist); bewegen(e); });
  addEventListener('pointermove', (e) => { if (ZUG && root.isConnected) bewegen(e); });
  addEventListener('pointerup', (e) => { if (!ZUG || !root.isConnected) return; const z = ziel(e); ZUG.geist.remove(); root.querySelectorAll('.f.ziel').forEach((x) => x.classList.remove('ziel')); const art = ZUG.art; ZUG = null; if (z) ablegen(art, z, e); });
  function ziel(e) {   // was liegt unter dem Zeiger und passt zum Baustein?
    const el = document.elementFromPoint(e.clientX, e.clientY), f = el && el.closest && el.closest('.f'); if (!f) return null;
    const a = ZUG.art;
    if (['sattel', 'walm', 'pult', 'flach'].includes(a)) { const k = kz(f.dataset.k || f.dataset.dach); return k && oben(k) ? { f, k } : null; }
    if (a.startsWith('gaube')) return f.dataset.dach && /Dachfläche/.test((dachFlaechen(kz(f.dataset.dach))[+f.dataset.fl] || {}).n || '') ? { f, k: kz(f.dataset.dach), fl: +f.dataset.fl } : null;
    return f.dataset.seite && f.dataset.seite !== 'top' ? { f, k: kz(f.dataset.k), seite: f.dataset.seite } : null;
  }
  function bewegen(e) { ZUG.geist.style.left = e.clientX + 12 + 'px'; ZUG.geist.style.top = e.clientY + 12 + 'px'; root.querySelectorAll('.f.ziel').forEach((x) => x.classList.remove('ziel')); const z = ziel(e); if (z) z.f.classList.add('ziel'); }
  function aufFlaeche(pts3, e) {   // Zeigerpunkt → (t, s) auf einer Fläche mit Ecken a, b (unten) und d (oben links)
    const R = $('#sv').getBoundingClientRect(), x = e.clientX - R.left, y = e.clientY - R.top, [a, b, , d] = pts3.map((p) => pr(...p));
    const ux = b[0] - a[0], uy = b[1] - a[1], vx = d[0] - a[0], vy = d[1] - a[1], det = ux * vy - uy * vx || 1;
    return [((x - a[0]) * vy - (y - a[1]) * vx) / det, (ux * (y - a[1]) - uy * (x - a[0])) / det];
  }
  function ablegen(art, z, e) {
    M.n++;
    if (['sattel', 'walm', 'pult', 'flach'].includes(art)) { M.dach[z.k.id] = { form: art, aufbau: korbHol('dach', art === 'flach' ? VOR.flach : VOR.dach) }; SEL = { art: 'dach', id: z.k.id }; }
    else if (art.startsWith('gaube')) { const fl = dachFlaechen(z.k)[z.fl], [t] = aufFlaeche(fl.p, e); const g = { id: 'g' + M.n, k: z.k.id, fl: z.fl, u: Math.max(0.15, Math.min(0.85, t)), b: 2.4, form: art.slice(6) || 'Schleppgaube', rahmen: 'Kunststoff', fach: 3, uw: null }; M.gauben.push(g); SEL = { art: 'gaube', id: g.id }; }
    else { const E = seiteEcken(z.k, z.seite), [t] = aufFlaeche(E, e), o = { id: 'o' + M.n, k: z.k.id, seite: z.seite, art: art === 'tuer' ? 'tuer' : art === 'fenstert' ? 'fenstertuer' : 'fenster', u: Math.max(0.08, Math.min(0.92, t)),
      b: art === 'fenster' ? 1.26 : art === 'tuer' ? 1.1 : 1.01, h: art === 'fenster' ? 1.38 : 2.13, rahmen: 'Kunststoff', fach: 3, uw: null };
      M.oeff.push(o); SEL = { art: 'oeff', id: o.id }; }
    zeichnen();
  }

  /* Angaben rechts: je nach Auswahl */
  const opt = (L, w) => L.map(([k, n, u]) => `<option value="${k}"${k === w ? ' selected' : ''}>${esc(n)}${u ? ' · U ' + de(u) : ''}</option>`).join('');
  const optK = (art, w) => `<optgroup label="Im Gebäudemodell (Korb)">${Object.values(KORB).filter((e) => e.art === art).map((e) => `<option value="${e.id}"${e.id === w ? ' selected' : ''}>${esc(e.name)}${e.u ? ' · U ' + de(e.u) : ''}</option>`).join('')}</optgroup>`
    + `<optgroup label="Aus der Bibliothek – kommt in den Korb">${BIB[art].map(([k, n, u]) => `<option value="bib:${k}">${esc(n)}${u ? ' · U ' + de(u) : ''}</option>`).join('')}</optgroup>`;
  const nutzer = (id) => { const L = []; M.koerper.forEach((k) => { if (k.wand === id) L.push(k.name + ' (' + M.teile[k.teil] + ')'); Object.entries(k.seiten || {}).forEach(([s, v]) => { if (v === id) L.push(k.name + ' Seite'); }); if (k.boden === id) L.push(k.name + ' Boden'); if (M.dach[k.id] && M.dach[k.id].aufbau === id) L.push('Dach ' + M.teile[k.teil]); Object.entries((M.dach[k.id] || {}).fl || {}).forEach(([i, v]) => { if (v === id) L.push(`Dachfläche ${+i + 1} ${M.teile[k.teil]}`); }); }); return L; };
  const verkn = (id) => `<p class="hinweis">🔗 fest verknüpft mit „${esc(aufbau(id)[1])}“ im Korb – gilt für ${nutzer(id).length} Bauteil${nutzer(id).length === 1 ? '' : 'e'}. <button type="button" class="kn" data-korbzeig="${id}">zeigen</button></p>`;
  const korbWahl = (art, v) => (v.startsWith('bib:') ? korbHol(art, v.slice(4)) : v);
  const pruef = (u, max) => (u ? (u <= max ? `<span class="ok">✓ U ${de(u)} ≤ ${de(max)}</span>` : `<span class="nein">✗ U ${de(u)} > ${de(max)}</span>`) : '');
  const fensterHtml = (o, kat, uw) => `<label class="feld">Rahmen</label><div class="chips">${RAHMEN.map((r) => `<button type="button" data-rahmen="${r}" aria-pressed="${o.rahmen === r}">${r}</button>`).join('')}</div>
        <label class="feld">Verglasung</label><div class="chips">${[2, 3].map((f) => `<button type="button" data-fach="${f}" aria-pressed="${o.fach === f}">${f}-fach</button>`).join('')}</div>
        <label class="feld">Uw in W/(m²K) – aus dem Katalog: ${de(kat)}</label><div class="uw"><input type="number" step="0.01" min="0.5" max="6" value="${uw}" data-uw>${o.uw != null ? '<button type="button" class="kn" data-uwzur title="Wert aus dem Katalog">↺</button>' : ''}${pruef(uw, UMAX.fenster)}</div>`;
  const obj = () => M.oeff.find((x) => x.id === SEL.id) || M.gauben.find((x) => x.id === SEL.id);
  function detail() {
    const el = $('#detail');
    if (SEL && MEHR.length) return mehrfach(el);
    if (!SEL) { el.innerHTML = '<h2>Auswahl</h2><p class="hinweis">Ein Geschoss, eine Wand, das Dach, eine Gaube oder ein Fenster anklicken – hier stehen dann seine Angaben.</p>'; return; }
    if (SEL.art === 'koerper' || SEL.art === 'wand') { const k = kz(SEL.id); if (!k) { SEL = null; return detail(); }
      const W = aufbau(SEL.art === 'wand' && k.seiten && k.seiten[SEL.seite] || k.wand);
      el.innerHTML = `<h2>${SEL.art === 'wand' ? 'Außenwand' : 'Geschoss'}</h2><dl class="w"><dt>Teil</dt><dd>${esc(M.teile[k.teil])}</dd><dt>Geschoss</dt><dd>${esc(k.name)}${k.staffel ? ' · Staffelgeschoss' : ''}</dd>${SEL.art === 'wand' ? `<dt>Seite</dt><dd>${esc({ xp: 'rechts', xm: 'links', yp: 'vorne', ym: 'hinten' }[SEL.seite])} · ${de(SEL.seite[0] === 'x' ? k.d : k.w, 1)} m lang</dd>` : ''}</dl>
        ${k.z > 0 && SEL.art === 'koerper' ? `<div class="chips"><button type="button" data-staffel="0" aria-pressed="${!k.staffel}">Vollgeschoss</button><button type="button" data-staffel="1" aria-pressed="${!!k.staffel}">Staffelgeschoss</button></div>` : ''}
        <div class="reihe"><label class="feld">Länge m<input type="number" step="0.5" min="2" value="${k.w}" data-mass="w"></label><label class="feld">Breite m<input type="number" step="0.5" min="2" value="${k.d}" data-mass="d"></label><label class="feld">Höhe m<input type="number" step="0.1" min="2" value="${k.h}" data-mass="h"></label></div>
        <label class="feld">Aufbau Außenwand${SEL.art === 'wand' ? ' – diese Seite' : ''}<select data-wand>${optK('wand', W[0])}</select></label>${verkn(W[0])}<div>${pruef(W[2], UMAX.wand)}</div>
        ${k.z <= 0 || k.boden !== 'ohne' ? `<label class="feld">${k.z < 0 ? 'Kellersohle' : 'Boden'}<select data-boden>${optK('boden', k.boden)}</select></label>` : ''}
        <p class="hinweis">${SEL.art === 'wand' ? 'Gilt für diese Wandfläche – mit Strg + Klick weitere Wände dazu, dann gemeinsam vergeben (C).' : 'Fenster und Türen aus der Leiste auf eine Wand ziehen.'}</p>
        ${M.koerper.length > 1 ? '<button type="button" class="kn weg" data-weg>Geschoss entfernen</button>' : ''}`; return; }
    if (SEL.art === 'dach') { const k = kz(SEL.id), D = M.dach[SEL.id], i = flNr(SEL), af = i == null ? D.aufbau : flAuf(SEL.id, i), A = aufbau(af), nF = DFL[D.form].length;
      el.innerHTML = `<h2>${i == null ? 'Dach' : `Dachfläche${nF > 1 ? ' ' + (i + 1) + ' von ' + nF : ''}`}</h2><dl class="w"><dt>Teil</dt><dd>${esc(M.teile[k.teil])}</dd><dt>auf</dt><dd>${esc(k.name)}</dd></dl>
        <div class="chips">${DACHF.map(([f, n]) => `<button type="button" data-form="${f}" aria-pressed="${D.form === f}">${n}</button>`).join('')}</div>
        ${i == null ? '' : `<label class="feld">Aufbau dieser Dachfläche<select data-dflauf>${optK('dach', af)}</select></label>`}
        <label class="feld">Aufbau ${i == null ? '' : 'des ganzen Dachs'}<select data-dachauf>${optK('dach', D.aufbau)}</select></label>${verkn(af)}<div>${pruef(A[2], UMAX.dach)}</div>
        ${i != null && D.fl && D.fl[i] ? '<p class="hinweis">Diese Fläche hat einen eigenen Aufbau – „Aufbau des ganzen Dachs“ gilt für die übrigen.</p>' : nF > 1 ? '<p class="hinweis">Eine Dachfläche anklicken = nur diese; mit Strg mehrere.</p>' : ''}
        <p class="hinweis">Gauben aus der Leiste auf eine Dachfläche ziehen.</p><button type="button" class="kn weg" data-weg>Dach entfernen</button>`; return; }
    if (SEL.art === 'gaube') { const g = M.gauben.find((x) => x.id === SEL.id);
      const kat = UW[g.rahmen][g.fach === 3 ? 1 : 0], uw = g.uw ?? kat;
      el.innerHTML = `<h2>Gaube</h2><div class="chips">${['Schleppgaube', 'Satteldachgaube', 'Flachdachgaube'].map((f) => `<button type="button" data-gform="${f}" aria-pressed="${g.form === f}">${f}</button>`).join('')}</div>
        <label class="feld">Breite m<input type="number" step="0.1" min="1" max="8" value="${g.b}" data-gb></label><h2 style="margin-top:6px">Fenster der Gaube</h2>${fensterHtml(g, kat, uw)}<button type="button" class="kn weg" data-weg>Gaube entfernen</button>`; return; }
    if (SEL.art === 'oeff') { const o = M.oeff.find((x) => x.id === SEL.id); const kat = o.art === 'tuer' ? 1.8 : UW[o.rahmen][o.fach === 3 ? 1 : 0], uw = o.uw ?? kat;
      el.innerHTML = `<h2>${o.art === 'tuer' ? 'Haustür' : o.art === 'fenstertuer' ? 'Fenstertür' : 'Fenster'}</h2>
        <div class="reihe"><label class="feld">Breite m<input type="number" step="0.01" min="0.4" value="${o.b}" data-ob></label><label class="feld">Höhe m<input type="number" step="0.01" min="0.4" value="${o.h}" data-oh></label><span></span></div>
        ${o.art !== 'tuer' ? fensterHtml(o, kat, uw) : `<label class="feld">Uw in W/(m²K) – aus dem Katalog: ${de(kat)}</label><div class="uw"><input type="number" step="0.01" min="0.5" max="6" value="${uw}" data-uw>${pruef(uw, 1.8)}</div>`}
        <p class="hinweis">Rahmen, Verglasung und Uw landen im Gebäudemodell und rechnen im Wärmeschutz mit. Fensterfläche schätzt weiter der Assistent (D2).</p><button type="button" class="kn weg" data-weg>entfernen</button>`; }
  }
  $('#detail').addEventListener('input', (e) => { if (MEHR.length) return; const t = e.target, d = t.dataset;
    if (d.mass) { const k = kz(SEL.id), v = Math.max(1, +t.value || 0); const alt = k[d.mass]; k[d.mass] = v; if (d.mass === 'h') M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z += v - alt; }); else M.koerper.forEach((q) => { if (q.teil === k.teil && q.id !== k.id && q.x === k.x && q.y === k.y) q[d.mass] = v; }); zeichnenSpaeter(); }
    if ('ob' in d || 'oh' in d || 'uw' in d || 'gb' in d) { const o = M.oeff.find((x) => x.id === SEL.id) || M.gauben.find((x) => x.id === SEL.id); if ('ob' in d) o.b = +t.value; if ('oh' in d) o.h = +t.value; if ('gb' in d) o.b = +t.value; if ('uw' in d) o.uw = +t.value; zeichnenSpaeter(); }
  });
  let tz = 0; const zeichnenSpaeter = () => { clearTimeout(tz); tz = setTimeout(zeichnen, 350); };
  $('#detail').addEventListener('change', (e) => { if (MEHR.length) return; const t = e.target, d = t.dataset;
    if ('wand' in d) { const k = kz(SEL.id), v = korbWahl('wand', t.value); if (SEL.art === 'wand') { k.seiten = k.seiten || {}; k.seiten[SEL.seite] = v; } else { k.wand = v; k.seiten = {}; } zeichnen(); }
    if ('boden' in d) { kz(SEL.id).boden = korbWahl('boden', t.value); zeichnen(); }
    if ('dachauf' in d) { M.dach[SEL.id].aufbau = korbWahl('dach', t.value); if (M.dach[SEL.id].fl) Object.entries(M.dach[SEL.id].fl).forEach(([i, v]) => flSetzen(SEL.id, i, v)); zeichnen(); }
    if ('dflauf' in d) { flSetzen(SEL.id, flNr(SEL), korbWahl('dach', t.value)); zeichnen(); }
  });
  $('#detail').addEventListener('click', (e) => { if (MEHR.length) return; const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if ('staffel' in d) { const k = kz(SEL.id), an = d.staffel === '1';
      if (an && !k.staffel) { k.voll = { x: k.x, y: k.y, w: k.w, d: k.d }; Object.assign(k, { staffel: true, x: k.x + RUECK, y: k.y + RUECK, w: k.w - 2 * RUECK, d: k.d - 2 * RUECK }); }
      if (!an && k.staffel) { Object.assign(k, k.voll || {}, { staffel: false }); } }
    if ('form' in d) { const D = M.dach[SEL.id]; if (D.form !== d.form) delete D.fl; D.form = d.form; SEL = { art: 'dach', id: SEL.id }; }   // andere Dachform: eigene Aufbauten je Fläche passen nicht mehr
    if ('gform' in d) M.gauben.find((x) => x.id === SEL.id).form = d.gform;
    if ('rahmen' in d) { const o = obj(); o.rahmen = d.rahmen; o.uw = null; }
    if ('fach' in d) { const o = obj(); o.fach = +d.fach; o.uw = null; }
    if ('uwzur' in d) obj().uw = null;
    if ('weg' in d) { if (SEL.art === 'koerper' || SEL.art === 'wand') entfernen(kz(SEL.id));
      if (SEL.art === 'dach') { delete M.dach[SEL.id]; M.gauben = M.gauben.filter((g) => g.k !== SEL.id); }
      if (SEL.art === 'gaube') M.gauben = M.gauben.filter((g) => g.id !== SEL.id);
      if (SEL.art === 'oeff') M.oeff = M.oeff.filter((o) => o.id !== SEL.id);
      SEL = null; }
    zeichnen();
  });

  function anbau(K, s) {   // Anbau an einer Seite über ein oder mehrere Geschosse (mit Strg gewählte Wandflächen) – je Geschoss ein Körper, oben ein Flachdach
    K = K.slice().sort((a, b) => a.z - b.z); const k = K[0], [nx, ny] = SEITEN[s], t = 't' + (++M.n), nw = nx ? 7 : Math.min(8, k.w), nd = ny ? 6 : Math.min(7, k.d);
    M.teile[t] = 'Anbau ' + Object.keys(M.teile).length;
    const x = nx > 0 ? k.x + k.w : nx < 0 ? k.x - nw : k.x + (k.w - nw) / 2, y = ny > 0 ? k.y + k.d : ny < 0 ? k.y - nd : k.y + (k.d - nd) / 2; let n = null;
    K.forEach((q, i) => { n = { id: 'k' + (++M.n), teil: t, z: q.z, h: q.h, w: nw, d: nd, x, y, wand: korbHol('wand', VOR.wand), boden: korbHol('boden', i ? 'ohne' : 'bp') }; M.koerper.push(n); });
    M.dach[n.id] = { form: 'flach', aufbau: korbHol('dach', VOR.flach) }; SEL = { art: 'koerper', id: n.id }; MEHR = [];
  }
  function entfernen(k) {   // Geschoss weg: darüber rückt nach unten, das Dach bleibt oben
    M.koerper = M.koerper.filter((q) => q.id !== k.id); M.oeff = M.oeff.filter((o) => o.k !== k.id);
    if (M.dach[k.id]) { const u = M.koerper.filter((q) => q.teil === k.teil && q.z < k.z).sort((a, c) => c.z - a.z)[0]; if (u) { M.dach[u.id] = M.dach[k.id]; M.gauben.forEach((g) => { if (g.k === k.id) g.k = u.id; }); } delete M.dach[k.id]; }
    M.koerper.forEach((q) => { if (q.teil === k.teil && q.z > k.z) q.z -= k.h; }); if (!M.koerper.some((q) => q.teil === k.teil)) delete M.teile[k.teil];
  }
  function korb() {
    const ART = { wand: 'Außenwände', dach: 'Dächer', boden: 'Böden und Decken' }, used = (id) => nutzer(id).length;
    $('#korb').innerHTML = Object.entries(ART).map(([a, t]) => { const L = Object.values(KORB).filter((e) => e.art === a && used(e.id)); if (!L.length) return '';
      return `<div class="hinweis" style="margin-top:4px"><b>${t}</b></div>` + L.map((e) => `<div class="korb${SEL && SEL.art === 'korb' && SEL.id === e.id ? ' an' : ''}" data-korb="${e.id}">
        <button type="button" class="korbn" data-korbzeig="${e.id}" title="Verknüpfte Bauteile zeigen">🔗 ${esc(e.name)}${e.eigen ? ' <em>(eigene Fassung)</em>' : ''}<small>${e.u ? 'U ' + de(e.u) + ' · ' : ''}${used(e.id)}× verknüpft</small></button>
        <select data-korbtausch="${e.id}" aria-label="Aufbau für alle verknüpften Bauteile tauschen"><option value="">tauschen für alle ${used(e.id)} …</option>${BIB[a].map(([k, n, u]) => `<option value="${k}">${esc(n)}${u ? ' · U ' + de(u) : ''}</option>`).join('')}</select>
        <button type="button" class="kn" data-korbkopie="${e.id}" title="Eigene Fassung für das gewählte Bauteil">Kopie</button></div>`).join(''); }).join('');
  }
  HOER.forEach((H) => H.addEventListener('click', (e) => { const z = e.target.closest('[data-korbzeig]'); if (z) { SEL = { art: 'korb', id: z.dataset.korbzeig }; return zeichnen(); }
    const kp = e.target.closest('[data-korbkopie]'); if (kp) { const a = KORB[kp.dataset.korbkopie], id = 'A' + (++KN); KORB[id] = { ...a, id, eigen: true, name: a.name + ' (Kopie)' };
      if (SEL && (SEL.art === 'wand' || SEL.art === 'koerper')) { const k = kz(SEL.id); if (SEL.art === 'wand') { k.seiten = k.seiten || {}; k.seiten[SEL.seite] = id; } else if (k.wand === a.id) k.wand = id; } else if (SEL && SEL.art === 'dach' && flNr(SEL) != null && flAuf(SEL.id, flNr(SEL)) === a.id) flSetzen(SEL.id, flNr(SEL), id); else if (SEL && SEL.art === 'dach' && M.dach[SEL.id].aufbau === a.id) M.dach[SEL.id].aufbau = id;
      zeichnen(); } }));
  HOER.forEach((H) => H.addEventListener('change', (e) => { const t = e.target; if (!t.dataset.korbtausch || !t.value) return; const x = KORB[t.dataset.korbtausch], b = BIB[x.art].find((y) => y[0] === t.value);
    Object.assign(x, { von: b[0], name: b[1] + (x.eigen ? ' (Kopie)' : ''), u: b[2] }); SEL = { art: 'korb', id: x.id }; zeichnen(); }));
  /* Mehrere Bauteile mit Strg gewählt: gemeinsam vergeben – Aufbau der Wände, Aufbau der Dächer, Rahmen/Verglasung/Uw der Fenster */
  function mehrfach(el) {
    const L = [SEL, ...MEHR], W = L.filter((x) => x.art === 'wand' || x.art === 'koerper'), D = L.filter((x) => x.art === 'dach'),
      FE = L.filter((x) => (x.art === 'oeff' && (M.oeff.find((o) => o.id === x.id) || {}).art !== 'tuer') || x.art === 'gaube').map((x) => (x.art === 'gaube' ? M.gauben.find((g) => g.id === x.id) : M.oeff.find((o) => o.id === x.id))).filter(Boolean);
    const gl = (A, f) => (A.length && A.every((a) => a[f] === A[0][f]) ? A[0][f] : null), wv = (x) => { const k = kz(x.id); return x.art === 'wand' ? (k.seiten && k.seiten[x.seite]) || k.wand : k.wand; };
    const wg = W.length && W.every((x) => wv(x) === wv(W[0])) ? wv(W[0]) : '', dv = (x) => (flNr(x) == null ? M.dach[x.id].aufbau : flAuf(x.id, flNr(x))), dg = D.length && D.every((x) => dv(x) === dv(D[0])) ? dv(D[0]) : '';
    const n = { wand: W.length, dach: D.length, fenster: FE.length };
    el.innerHTML = `<h2>Auswahl</h2><h3 style="margin:0;font-size:1rem">${L.length} Bauteile gewählt</h3><p class="hinweis">${[n.wand && n.wand + ' × Wand/Geschoss', n.dach && n.dach + ' × Dach/Dachfläche', n.fenster && n.fenster + ' × Fenster'].filter(Boolean).join(' · ')} – mit Strg weitere dazu oder wieder weg.</p>`
      + (W.length ? `<label class="feld">Aufbau für alle ${W.length} Wände${wg ? '' : ' (bisher verschieden)'}<select data-mwand>${wg ? '' : '<option value="">– wählen –</option>'}${optK('wand', wg)}</select></label>` : '')
      + (D.length ? `<label class="feld">Aufbau für alle ${D.length} Dächer/Dachflächen${dg ? '' : ' (bisher verschieden)'}<select data-mdach>${dg ? '' : '<option value="">– wählen –</option>'}${optK('dach', dg)}</select></label>` : '')
      + (FE.length ? `<label class="feld">Rahmen für alle ${FE.length} Fenster${gl(FE, 'rahmen') ? '' : ' (bisher verschieden)'}</label><div class="chips">${RAHMEN.map((r) => `<button type="button" data-mrahmen="${r}" aria-pressed="${gl(FE, 'rahmen') === r}">${r}</button>`).join('')}</div>
        <label class="feld">Verglasung</label><div class="chips">${[2, 3].map((f) => `<button type="button" data-mfach="${f}" aria-pressed="${gl(FE, 'fach') === f}">${f}-fach</button>`).join('')}</div>
        <label class="feld">Uw für alle (leer = aus dem Katalog je Fenster)</label><div class="uw"><input type="number" step="0.01" min="0.5" max="6" value="${gl(FE, 'uw') ?? ''}" data-muw placeholder="Katalog"></div>` : '')
      + (() => { const WS = L.filter((x) => x.art === 'wand'), ok = WS.length > 1 && WS.length === L.length && WS.every((x) => x.seite === WS[0].seite && kz(x.id).teil === kz(WS[0].id).teil);
        return ok ? `<div class="chips" style="margin-top:4px"><button type="button" data-manbau="${WS[0].seite}">＋ Anbau über diese ${WS.length} Geschosse</button><button type="button" class="weg" data-mentf>− diese ${WS.length} Geschosse entfernen</button></div>` : ''; })()
      + '<p class="hinweis">Gilt sofort für alle Gewählten – Wände und Dächer bleiben dabei fest mit dem Aufbau im Korb verknüpft.</p><button type="button" class="kn" data-mweg>Auswahl aufheben</button>';
    MF = { W, D, FE };
  }
  let MF = null;
  $('#detail').addEventListener('change', (e) => { if (!MEHR.length || !MF) return; const t = e.target; if (!t.value) return; const { W, D } = MF;
    if ('mwand' in t.dataset) { const v = korbWahl('wand', t.value); W.forEach((x) => { const k = kz(x.id); if (x.art === 'wand') { k.seiten = k.seiten || {}; k.seiten[x.seite] = v; } else { k.wand = v; k.seiten = {}; } }); zeichnen(); }
    if ('mdach' in t.dataset) { const v = korbWahl('dach', t.value); D.forEach((x) => { if (flNr(x) == null) M.dach[x.id].aufbau = v; else flSetzen(x.id, flNr(x), v); }); zeichnen(); } });
  $('#detail').addEventListener('input', (e) => { if (!MEHR.length || !MF) return; if ('muw' in e.target.dataset) MF.FE.forEach((o) => { o.uw = e.target.value ? +e.target.value : null; }); });
  $('#detail').addEventListener('click', (e) => { if (!MEHR.length || !MF) return; const b = e.target.closest('button'); if (!b) return; const FE = MF.FE;
    if ('mrahmen' in b.dataset) FE.forEach((o) => { o.rahmen = b.dataset.mrahmen; o.uw = null; });
    if ('mfach' in b.dataset) FE.forEach((o) => { o.fach = +b.dataset.mfach; o.uw = null; });
    if ('mweg' in b.dataset) { SEL = null; MEHR = []; }
    if ('manbau' in b.dataset) anbau([SEL, ...MEHR].map((x) => kz(x.id)), b.dataset.manbau);
    if ('mentf' in b.dataset) { [SEL, ...MEHR].map((x) => kz(x.id)).sort((a, c) => c.z - a.z).forEach((k) => { if (M.koerper.length > 1) entfernen(k); }); SEL = null; MEHR = []; }
    zeichnen(); });
  /* Was im Assistenten steht – dieselben Angaben, aus dem Baukasten gelesen */
  function sync() {
    const T = Object.entries(M.teile).map(([t, n]) => { const K = M.koerper.filter((k) => k.teil === t).sort((a, b) => a.z - b.z); if (!K.length) return '';
      const eg = K.find((k) => k.z >= 0) || K[0], keller = K.some((k) => k.z < 0), ober = K.filter((k) => k.z > 0).length, dk = K.find((k) => M.dach[k.id]), D = dk && M.dach[dk.id];
      const fl = K.filter((k) => k.z >= 0).reduce((a, k) => a + k.w * k.d, 0), W = aufbau(eg.wand), F = M.oeff.filter((o) => K.some((k) => k.id === o.k) && o.art !== 'tuer');
      const ra = [...new Set(F.map((o) => `${o.rahmen} ${o.fach}-fach`))];
      return `<li><b>${esc(n)}</b>: ${de(eg.w, 1)} × ${de(eg.d, 1)} m, ${keller ? 'Keller + ' : ''}EG${ober ? ' + ' + ober + ' OG' : ''} · ${de(fl, 0)} m² BGF · ${D ? esc((DACHF.find((x) => x[0] === D.form) || [])[1]) + (M.gauben.some((g) => g.k === dk.id) ? ' mit ' + M.gauben.filter((g) => g.k === dk.id).length + ' Gaube(n)' : '') : '<span class="nein">ohne Dach</span>'}
        <br><span class="hinweis">Wand: ${esc(W ? W[1] : '–')}${F.length ? ` · ${F.length} Fenster (${esc(ra.join(', '))})` : ''}</span></li>`; }).join('');
    $('#sync').innerHTML = `<ul>${T}</ul><p class="hinweis">Änderst du dort etwas (z. B. Geschosse oder Dachform), steht es hier sofort im Bild – und umgekehrt. Ergebnis ist der Planstand „Assistent“.</p>`;
  }

  /* ───────── Laden und Speichern (Kern: bpcore/baukasten.py) ───────── */
  const basis = `api/bp/modell/${pid}`;
  const J = (u, m, b) => fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Der Baukasten konnte nicht geladen werden.'); return j; });
  let STAND = '', PLAN = 'hand', RAEUME = [], LADEN = false, TS = 0, RM = false, BIBOK = null;
  const tippe = (t) => { const x = $('#stand'); if (x) x.textContent = t; };
  function bib() {
    return BIBOK || (BIBOK = Promise.all(['331', '36', '32', '35'].map((kg) => J(`${basis}/bauteile/vorlagen?kg=${kg}`).catch(() => []))).then(([w, d, b1, b2]) => {
      const L = (A) => A.filter((v) => !v.bestand).map((v) => [v.id, v.name, null]);
      BIB.wand = L(w); BIB.dach = L(d); BIB.boden = L([...b1, ...b2]); }));
  }
  function daten() {
    return { baukasten: { koerper: M.koerper.map((k) => ({ id: k.id, teil: k.teil, x: k.x, y: k.y, z: k.z, w: k.w, d: k.d, h: k.h, wand: k.wand, boden: k.boden, seiten: k.seiten || {}, ...(k.staffel ? { staffel: true } : {}) })),
      dach: M.dach, gauben: M.gauben, oeff: M.oeff, teile: M.teile, raeume: RM },
    korb: Object.fromEntries(Object.values(KORB).map((e) => [e.id, { art: e.art, vorlage: e.von, name: e.name, eigen: !!e.eigen }])) };
  }
  function spaeter() { if (LADEN) return; const s = JSON.stringify(daten()); if (s === STAND) return; clearTimeout(TS); TS = setTimeout(() => speichern(s), 700); }
  async function speichern(s) {
    const vor = STAND; STAND = s; tippe('wird gespeichert …');
    try {
      const r = await J(`${basis}/baukasten`, 'PUT', JSON.parse(s)); PLAN = r.plan; tippe(PLAN === 'ifc' ? 'Gespeichert – es gilt ein Plan: Bauteile und 3D kommen aus dem Plan.' : 'Gespeichert – Planstand „Assistent“ nachgeführt.');
      uWerte(r);
      if (window.rueckgaengig && vor) rueckgaengig('Baukasten geändert', async () => { await J(`${basis}/baukasten`, 'PUT', JSON.parse(vor)); await laden(); }, { neu: () => laden() });
      dispatchEvent(new CustomEvent('bp:modellGeaendert', { detail: { pid } }));
      if (OPT.nachher) OPT.nachher(r);
    } catch (e) { STAND = vor; tippe(e.message); if (window.toast) toast(e.message, true); }
  }
  async function uWerte(r) {   // U je Aufbau im Korb – gerechnet wie überall (bp/uwert.js) an den Zeilen, die aus dem Baukasten kommen
    try {
      if (!window.bpUwert) await new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'uwert.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });
      if (!window.bpUwert || !r || !r.modell) return;
      const U = await bpUwert.holen(basis, r.rev), Z = ((r.modell.bauteilliste || {}).zeilen || []);
      Object.values(KORB).forEach((e) => { const z = Z.find((x) => x.name.endsWith('– ' + e.name)); const u = z && U[z.id]; e.u = u && u.u != null ? Math.round(u.u * 100) / 100 : null; });
      zeichnen(true);
    } catch { /* ohne U-Werte geht es auch */ }
  }
  async function laden(neu) {
    LADEN = true;
    try {
      const [d] = await Promise.all([J(`${basis}/baukasten${neu ? '?neu=1' : ''}`), bib()]), bk = d.baukasten || {};
      Object.keys(KORB).forEach((k) => delete KORB[k]); KN = 0;
      Object.entries(d.korb || {}).forEach(([id, e]) => { const b = BIB[e.art].find((y) => y[0] === e.vorlage); KORB[id] = { id, art: e.art, von: e.vorlage, name: e.name || (b && b[1]) || e.vorlage, u: null, eigen: e.eigen }; KN = Math.max(KN, +id.slice(1) || 0); });
      M.koerper = (bk.koerper || []).map((k) => ({ ...k, seiten: { ...(k.seiten || {}) } })); M.dach = bk.dach || {}; M.gauben = bk.gauben || []; M.oeff = bk.oeff || [];
      M.teile = bk.teile || { h: 'Hauptgebäude' }; RM = !!bk.raeume; PLAN = d.plan; RAEUME = d.raeume || [];
      M.koerper.forEach((k) => { if (!KORB[k.wand]) k.wand = korbHol('wand', VOR.wand);
        if (!KORB[k.boden]) k.boden = korbHol('boden', k.z <= Math.min(...M.koerper.filter((q) => q.teil === k.teil).map((q) => q.z)) + 0.01 ? VOR.boden : VOR.decke); });
      Object.values(M.dach).forEach((D) => { if (!KORB[D.aufbau]) D.aufbau = korbHol('dach', D.form === 'flach' ? VOR.flach : VOR.dach); if (D.fl) { Object.keys(D.fl).forEach((i) => { if (!KORB[D.fl[i]]) delete D.fl[i]; }); if (!Object.keys(D.fl).length) delete D.fl; } });
      M.n = 20 + Math.max(0, ...[...M.koerper, ...M.gauben, ...M.oeff].map((x) => +String(x.id).replace(/\D/g, '') || 0));
      SEL = null; MEHR = []; $('[data-bk="rm"]').setAttribute('aria-pressed', String(RM));
      zeichnen(true); STAND = neu ? '' : JSON.stringify(daten());
      tippe(PLAN === 'ifc' ? 'Es gilt ein Plan (IFC): Was du hier änderst, bleibt im Baukasten; die Bauteile kommen aus dem Plan, Angaben gehen über den Abgleich als Vorschlag.' : 'Änderungen speichern sich von selbst und führen den Planstand „Assistent“ nach.');
    } catch (e) { tippe(e.message); }
    LADEN = false;
    if (neu) spaeter();
  }
  function raeume() {   // F1/F2 umschaltbar: Räume je Geschoss neben dem Bild
    const box = $('#raeume'); if (!box) return; box.hidden = !RM; if (!RM) return;
    const G = {}; RAEUME.forEach((r) => { (G[r.geschoss || '–'] = G[r.geschoss || '–'] || []).push(r); });
    $('#rliste').innerHTML = Object.keys(G).length ? Object.entries(G).map(([g, L]) => `<div class="hinweis"><b>${esc(g)}</b></div><ul>${L.map((r) => `<li>${esc(r.nr || '')} ${esc(r.name)} · ${de(r.flaeche || 0, 1)} m²</li>`).join('')}</ul>`).join('')
      : '<p class="hinweis">Noch keine Räume – der Assistent schlägt sie aus Fläche und Geschossen vor, oder unter „Räume“ im Gebäudemodell von Hand.</p>';
  }
  $('[data-bk="rm"]').addEventListener('click', (e) => { RM = !RM; e.currentTarget.setAttribute('aria-pressed', String(RM)); zeichnen(); });
  laden();
  return { neu: () => laden(), daten };
  }
  window.bpBaukasten = { mount };
}());
