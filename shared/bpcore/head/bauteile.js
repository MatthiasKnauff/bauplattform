/* Bauteil-Checkliste – derselbe Baustein in jeder App (Entwurf „Bauteil-Checkliste“, entschieden am 16.11.2026).
   Liest das Gebäudemodell (IFC, z. B. Allplan) und fragt je Gruppe gleicher Bauteile: was passiert damit, wird es berechnet, welcher Aufbau
   aus dem Bauteil-Baukasten. Dazu feste Fragen für das, was nicht im Modell steht. Die Antworten stehen im Projektmodell (Kern:
   bpcore/bauteilliste.py, /api/bp/modell/<pid>/bauteile/…) – Kosten, Ausschreibung und Termine nehmen sie über ihre Linie.
   „IFC mit Maßnahmen ausgeben“ schreibt Nummern, Status, Maßnahme und Aufbau ins IFC zurück.

   Planstände (GO 16.11.2026, Kern bpcore/planstand.py): Jeder eingelesene Plan ist ein Planstand im gemeinsamen Versionsmenü („★ gilt“,
   ansehen, umbenennen, archivieren, löschen). Einlesen nur im Gebäudemodell – vom Gerät oder aus „Pläne & Dateien“ – mit Abgleich
   (neu · geändert · entfällt) und Zuordnung per Klick; entfallene Zeilen mit Antwort bleiben, bis „Aufräumen“.

   bpBauteile.mount(el, pid, { einlesen }) – füllt ein Feld: groß im Gebäudemodell (einlesen: true), sonst Reiter „Bauteile“ im Bereich rechts
   (dort nur der Stand und der Sprung ins Gebäudemodell). Wird erst bei Bedarf geladen (seite.js), kostet beim Öffnen einer App nichts.

   Wie der LV-Baum (GO 21.11.2026, Mock „Bauteile wie der LV-Baum“): Leiste „Gruppieren:“ über der Tabelle (bp/gruppen.js, Ebenen GRUPPEN),
   Dreieck an der Zeile = schnelle Aufbau-Wahl (schnellHtml), Doppelklick auf die Zeile oder im 3D = Eigenschaften-Fenster (eigenschaften):
   oben derselbe Editor wie in den Details (detailsIn), unten „angewählte“ · „gleiche Bauteile“. Von außen: api.eigenschaften(id), api.mehr(ids). */
(function () {
  const esc = window.bpEsc;
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const zahl = (v) => (window.bpZahl ? bpZahl(v, 0, 2) : String(v).replace('.', ','));
  async function J(u, m, b) {
    const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b && !(b instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
      body: b ? (b instanceof FormData ? b : JSON.stringify(b)) : undefined });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); e.status = r.status; throw e; }
    return r;
  }
  const WORT = { offen: 'offen', bleibt: 'bleibt', instandsetzen: 'instandsetzen', erneuern: 'erneuern', neu: 'neu', abbruch: 'Abbruch', pruefen: 'prüfen lassen' };
  const WORT_FRAGE = { bleibt: 'nein, bleibt', erneuern: 'erneuern', neu: 'neu', pruefen: 'prüfen lassen' };
  const ROHG = [['grund', 'Gründung · Bodenplatte', '320', (z) => /^32/.test(z.kg || '')], ['aw', 'Außenwände', '330', (z) => /^33/.test(z.kg || '')],   // Rohbau nach Bauteilen (A1)
    ['iw', 'Innenwände', '340', (z) => /^34/.test(z.kg || '')], ['tr', 'Treppen', '350', (z) => /trepp/i.test(`${z.name} ${z.art}`)], ['de', 'Decken', '350', (z) => /^35/.test(z.kg || '')],
    ['da', 'Dach', '360', (z) => /^36/.test(z.kg || '')]];
  /* Gruppieren oben (Mock „Bauteile wie der LV-Baum“ C1, 21.11.2026) – Ebenen der Baumtabelle, gemerkt je Browser; „Bereich“ allein = die
     gewohnte Gliederung (Rohbau nach Bauteilen, Fragen, „＋ Zeile“ je Gruppe) */
  const GRUPPEN = { typ: 'Typ', bereich: 'Bereich', teil: 'Gebäudeteil', geschoss: 'Geschoss', art: 'Bauteilart', mat: 'Material', aufbau: 'Aufbau', mass: 'Maßnahme' };   // Geschoss: aus der Zuordnung im Plan je Bauteil (opt.elementInfo), 22.11.2026   // Typ: Gebäudemodell neu, Etappe 2 (22.11.2026)
  /* Material (F1, 21.11.2026): das tragende Material des Aufbaus – die dickste Schicht, die keine Dämmung ist (aus den Schichten des Plans), sonst aus dem
     Text des Aufbaus; einmal hier, auch fürs 3D des Gebäudemodells (bpBauteile.material) */
  const MATW = [['kalksand', 'Kalksandstein'], ['stahlbeton', 'Stahlbeton'], ['beton', 'Beton'], ['porenbeton', 'Porenbeton'], ['mauer', 'Mauerwerk'], ['poroton', 'Ziegel'], ['ziegel', 'Ziegel'], ['hlz', 'Ziegel'],
    ['holz', 'Holz'], ['sparren', 'Holz'], ['osb', 'Holz'], ['dämm', 'Dämmung'], ['daemm', 'Dämmung'], ['wdvs', 'Dämmung'], ['mineral', 'Dämmung'], ['eps', 'Dämmung'], ['xps', 'Dämmung'], ['pir', 'Dämmung'],
    ['glas', 'Glas'], ['gips', 'Gipskarton'], ['trocken', 'Gipskarton'], ['estrich', 'Estrich'], ['putz', 'Putz'], ['fliese', 'Fliesen'], ['dachstein', 'Dachziegel']];
  const matName = (t) => { const x = String(t || '').toLowerCase(); const m = MATW.find(([w]) => x.includes(w)); return m ? m[1] : ''; };
  function material(z) {
    if (!z) return '';
    const L = (z.lagen || []).filter((l) => l[0]).map((l) => [matName(l[0]), l[1] || 0]).filter((l) => l[0]);
    const T = L.filter((l) => l[0] !== 'Dämmung'), dick = (A) => A.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    if (L.length) return dick(T.length ? T : L);
    return matName(z.kurz || z.material || z.name);
  }
  /* „In Kosten/LV“ (22.11.2026, statt Häkchen unter „€“): ein Schalter „zählt / zählt nicht“ – zählt die Zeile in Kosten und LV mit; offen = gesperrt */
  const berKnopf = (z) => { const an = !!z.berechnen, aus = z.status === 'offen';
    return `<button type="button" class="bt-zl${an ? ' an' : ''}" data-btber aria-pressed="${an}"${aus ? ' disabled' : ''} title="${aus ? 'Erst eine Maßnahme wählen' : an ? 'zählt in Kosten und LV – Klick: zählt nicht' : 'zählt nicht in Kosten und LV – Klick: zählt'}">${an ? 'zählt' : 'zählt nicht'}</button>`; };
  const GRP0 = ['art', 'typ'];   // Vorgabe (22.11.2026): Bauteilart › Typ – Außenwände › AW-01 …, Gruppen anfangs zu
  const grpLies = (key, G, d) => { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) && v.length ? v.filter((k) => k in G) : d; } catch { return d; } };   // Vorgabe seit 22.11.2026: nach Typ (neuer Schlüssel – die frühere Vorgabe „Bereich“ gilt nicht weiter)
  const BEREICH = [['rohbau', 'Rohbau'], ['oeffnung', 'Öffnungen – Fenster und Türen'], ['raum', 'Räume – Oberflächen'], ['ausbau', 'Küche und Bad'], ['frage', 'Nicht im Modell – bitte beantworten'], ['hand', 'Von Hand'], ['leistung', 'Leistungen ohne Bauteil']];
  const HAND = ['hand', 'leistung'];   // Name/Menge hier änderbar, entfernen möglich
  let KONTEXT = null; document.addEventListener('bph:kontext', (e) => { if (KONTEXT) KONTEXT(e); });
  const APPN = { kosten: 'Kosten', termine: 'Bauzeitenplan' };
  const KG2 = [['31', 'Baugrube'], ['32', 'Gründung'], ['33', 'Außenwände'], ['34', 'Innenwände'], ['35', 'Decken'], ['36', 'Dächer'], ['38', 'Einbauten'], ['39', 'Sonstiges KG 300'], ['41', 'Wasser'], ['42', 'Wärme'], ['43', 'Lüftung'], ['44', 'Elektro'], ['47', 'Nutzungsspezifisch']];
  const STIL = `.bt-l{display:flex;flex-direction:column;gap:.7rem;padding:.8rem .9rem 1.2rem;font-size:.9rem}
.bt-kopf{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center}.bt-kopf .bt-q{flex:1 1 14rem;font-size:.8rem;opacity:.7;min-width:0}
.bt-z{border-radius:1em;padding:0 .55em;font-size:.78rem;background:var(--line,#d5d9de)}.bt-z.rot{background:var(--red,#c62f2a);color:#fff}
.bt-b{border-top:1px solid var(--line,#d5d9de);padding-top:.5rem;display:flex;flex-direction:column;gap:.35rem}.bt-b>h4{margin:0 0 .1rem;font-size:.86rem;opacity:.8}
.bt-r{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.15rem .55rem;padding:.4rem .5rem;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));background:var(--card,transparent)}
.bt-r.offen{border-left:3px solid var(--red,#c62f2a)}
.bt-r input[type=checkbox]{margin-top:.2rem}
.bt-n{display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline}.bt-n b{font-weight:600}.bt-n i{font-style:normal;opacity:.7;font-size:.82rem}
.bt-nr{font-size:.76rem;opacity:.65}
.bt-st{grid-column:2;display:flex;flex-wrap:wrap;gap:.25rem}
.bt-st button,.bt-o button{font:inherit;font-size:.8rem;border:1px solid var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(99px*var(--rkp,1));padding:.05rem .6rem;cursor:pointer}
.bt-st button.on,.bt-o button.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3);font-weight:600}
.bt-a{grid-column:2;font-size:.82rem;display:flex;flex-wrap:wrap;gap:.2rem .5rem;align-items:baseline}.bt-a code{font-size:.78rem;opacity:.85}
.bt-a button{font:inherit;font-size:.8rem;background:none;border:0;color:var(--y,#2f6fb3);cursor:pointer;padding:0;text-decoration:underline}
.bt-h{grid-column:2;font-size:.78rem;opacity:.7}.bt-vlw{border-style:dashed!important;opacity:.85}.bt-weitere>summary{opacity:.75}.bt-weitere>.bt-blk{margin-left:.8rem}.bt-art{grid-column:2;font-size:.82rem;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.bt-e{grid-column:1/-1;border-top:1px dashed var(--line,#d5d9de);margin-top:.3rem;padding-top:.4rem;display:flex;flex-direction:column;gap:.35rem}
.bt-nm{font:inherit;font-weight:700;color:inherit;background:transparent;border:1px solid transparent;border-radius:calc(6px*var(--rk,1));padding:.05rem .3rem;margin-left:-.3rem;min-width:0;flex:1 1 9rem}.bt-nm:hover,.bt-nm:focus{border-color:var(--line)}
.bt-such{position:relative}.bt-such input{width:100%;box-sizing:border-box;font:inherit;padding:.3rem .5rem;border:1px solid var(--line,#c9ced4);border-radius:calc(6px*var(--rk,1))}
.bt-vs{position:absolute;left:0;right:0;top:100%;z-index:20;background:var(--card,#fff);border:1px solid var(--line,#c9ced4);border-radius:calc(6px*var(--rk,1));box-shadow:0 6px 18px rgba(0,0,0,.14);display:grid;max-height:16rem;overflow:auto}
.bt-vs:empty{display:none}.bt-vs button{all:unset;padding:.3rem .55rem;cursor:pointer;font-size:.85rem}.bt-vs button:hover,.bt-vs button.on{background:color-mix(in srgb,var(--y,#2f6fb3) 10%,transparent)}.bt-vs small{display:block;opacity:.7;font-size:.76rem}
.bt-vbl{display:flex;gap:.25rem}.bt-vbl>.bt-bln{font-size:.78rem;opacity:.7;min-width:7rem;padding-top:.15rem}.bt-vbl>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:.2rem}   /* Vorlagen-Blöcke – nicht .bt-bl (Rahmen der Baumtabelle), sonst rutscht die Tabelle nach unten (19.11.2026) */
.bt-blk>summary{cursor:pointer;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;opacity:.75;padding:.1rem 0}.bt-blk>summary small{opacity:.7;text-transform:none}.bt-blk>.bt-o{padding:.1rem 0 .3rem}
.bt-o{display:flex;flex-wrap:wrap;gap:.25rem;align-items:baseline}.bt-dkh{font-size:.72rem;opacity:.7;align-self:center}.bt-o .bph-pa{width:8rem}.bt-o>span{font-size:.78rem;opacity:.7;min-width:7rem}
.bt-leer{font-size:.88rem;line-height:1.5;opacity:.85}.bt-m{width:5.5rem;text-align:right;font:inherit;font-size:.85rem;padding:.05rem .3rem}
.bt-weg{font:inherit;font-size:.78rem;background:none;border:0;color:var(--red,#c62f2a);cursor:pointer;padding:0;text-decoration:underline}.bt-w{font-size:.82rem;opacity:.75}
/* Spaltenbreiten bleiben stehen (22.11.2026): feste Aufteilung statt Verteilung nach Inhalt – gezogene Breiten (bp/spaltbreite.js) gehen vor */
table.bt-baum{table-layout:fixed;width:100%}table.bt-baum th:nth-child(2){width:15%}table.bt-baum th:nth-child(3){width:14%}table.bt-baum th:nth-child(4){width:20%}table.bt-baum th:nth-child(5){width:7%}table.bt-baum th:nth-child(6){width:14%}table.bt-baum td{overflow:hidden;text-overflow:ellipsis}
.bt-zl{font:inherit;font-size:.72rem;line-height:1.5;height:auto;min-height:0;align-self:start;justify-self:start;white-space:nowrap;border:1px solid var(--line,#d5d9de);background:var(--card,#fff);color:var(--mute,#5d6b7a);border-radius:1em;padding:0 .55em;margin:0;cursor:pointer}.bt-zl.an{border-color:color-mix(in srgb,var(--ok,#2e7d4f) 55%,transparent);background:color-mix(in srgb,var(--ok,#2e7d4f) 12%,transparent);color:var(--ok,#2e7d4f);font-weight:600}.bt-zl.teils{border-style:dashed}.bt-zl:disabled{opacity:.45;cursor:default}.bt-r.weg{opacity:.6;border-style:dashed}.bt-r.weg b{text-decoration:line-through}.bt-chip{font-size:.74rem;border-radius:1em;padding:0 .5em;border:1px solid var(--line,#d5d9de)}
.bt-an{border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;font-size:.86rem}
.bt-an b{font-weight:600}.bt-an span{flex:1 1 14rem}.bt-ps{font-size:.84rem}.bt-ps a{color:var(--y,#2f6fb3)}
.bt-ab{width:min(860px,100%);display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.1rem;max-height:86vh;overflow:auto;font-size:.9rem}
.bt-ab h3{margin:0;font-size:1.05rem}.bt-ab h4{margin:.3rem 0 .2rem;font-size:.86rem}.bt-ab .bt-sp{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
.bt-ab .bt-li{display:flex;flex-direction:column;gap:.25rem}.bt-ab button.bt-i{font:inherit;font-size:.84rem;text-align:left;background:none;color:inherit;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));padding:.25rem .5rem;cursor:pointer}
.bt-ab button.bt-i.sel{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3)}.bt-ab button.bt-i.paar{background:var(--hov,rgba(47,111,179,.08))}
.bt-ab .bt-ft{display:flex;gap:.5rem;justify-content:flex-end;align-items:center;flex-wrap:wrap}.bt-ab .bt-ft label{flex:1;display:flex;gap:.4rem;align-items:center;min-width:14rem}.bt-ab .bt-ft input{flex:1;font:inherit;padding:.3rem .5rem}
.bt-rw{border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;display:flex;flex-direction:column;gap:.4rem;font-size:.86rem}
.bt-rw h4{margin:0;font-size:.88rem}.bt-rw .bt-rz{display:flex;flex-wrap:wrap;gap:.25rem .6rem;align-items:baseline;border-top:1px dashed var(--line,#d5d9de);padding-top:.3rem}
.bt-rw .bt-rz>span{flex:1 1 14rem;min-width:0}.bt-rw .bt-rk{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end}
.bt-ext{border-color:var(--red,#c62f2a);color:var(--red,#c62f2a)}
.bt-bl{display:flex;flex-direction:column;gap:.5rem;height:100%;min-height:0;font-size:.9rem}.bt-bw{flex:1;min-height:0;overflow:auto}
.bt-baum{width:100%}.bt-baum th{position:sticky;top:0;background:var(--bg,var(--card));z-index:1;text-align:left;font-size:.8rem;font-weight:600;opacity:.8;padding:.3rem .45rem}
.bt-baum td{padding:.28rem .45rem;border-top:1px solid var(--line,#d5d9de);vertical-align:middle}.bt-baum td.r,.bt-baum th.r{text-align:right;white-space:nowrap}.bt-baum td.c,.bt-baum th.c{text-align:center;width:2rem}
.bt-plus{border:0;background:none;color:var(--y,#3b5a8f);font:inherit;font-size:.8rem;font-weight:600;cursor:pointer;margin-left:.5rem;opacity:.75}.bt-plus:hover{opacity:1}.bt-start{padding:.35rem .5rem .35rem 1.6rem}.bt-gerust tr.bt-bh td{opacity:.95}.bt-baum tr[data-btz]{cursor:pointer}.bt-baum tr.akt{background:var(--hov,rgba(47,111,179,.08))}.bt-baum tr.bt-bh td{background:var(--card,transparent);padding-top:.5rem}
.bt-baum tr.weg{opacity:.55}.bt-baum th:first-child{min-width:13rem}.bt-kz{max-width:min(28rem,22vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem;opacity:.85}.bt-ro{color:var(--red,#c62f2a)}
.bt-teile{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:.3rem 0;font-size:.84rem}.bt-teile>span{opacity:.7;margin-right:.2rem}.bt-teile button{font:inherit;border:1px solid var(--line,#d5d9de);border-radius:999px;padding:.05rem .6rem;background:var(--card,#fff);color:inherit;cursor:pointer}.bt-teile button.on{background:var(--af,#3b5a8f);border-color:var(--af,#3b5a8f);color:#fff}
.bt-mwl{position:sticky;bottom:0;z-index:3;box-shadow:0 -4px 12px rgba(0,0,0,.08);display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;background:color-mix(in srgb,#7b2ff7 9%,var(--card,#fff));border:1px solid color-mix(in srgb,#7b2ff7 45%,transparent);border-radius:calc(8px*var(--rk,1));padding:.35rem .6rem;font-size:.86rem}
.bt-mwg{display:inline-flex;flex-wrap:wrap;gap:.25rem;align-items:center}.bt-mwl button:not(.btn),.bt-mwd .bt-o button{font:inherit;font-size:.82rem;border:1px solid var(--line,#d6dce3);background:var(--card,#fff);color:inherit;border-radius:12px;padding:.1rem .55rem;cursor:pointer}
.bt-mwl button.on,.bt-mwd .bt-o button.on{background:#7b2ff7;border-color:#7b2ff7;color:#fff}.bt-mwl select,.bt-mwd select{font:inherit;font-size:.84rem;max-width:22rem}.bt-mwv{color:#8a5a00;font-style:italic;font-size:.82rem}
.bt-mwb{display:inline-flex;gap:.3rem;align-items:center}.bt-mwt{margin:0;font-size:1rem}.bt-mwh{margin:0 .35rem 0 0;vertical-align:-2px}table.bt-baum.bt-kompakt th:nth-child(2){width:20%}table.bt-baum.bt-kompakt th:nth-child(3){width:13%}table.bt-baum.bt-kompakt th:nth-child(4){width:27%}
tr.bt-ziel>td{background:color-mix(in srgb,#2f6fd6 12%,transparent);box-shadow:inset 0 0 0 1px #2f6fd6}tr.bt-nein>td{opacity:.55}tr.bt-cut>td{opacity:.5}
.bt-geist{position:fixed;left:-999px;top:0;background:#fff;border:1px solid #2f6fd6;color:#2f6fd6;border-radius:6px;padding:3px 9px;font:600 12px system-ui,sans-serif;box-shadow:0 6px 16px rgba(30,60,120,.18)}
tr.bt-mwz>td{background:color-mix(in srgb,#7b2ff7 8%,transparent)}
.bt-rwl{display:flex;gap:.6rem;align-items:center;border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.3rem .6rem;font-size:.86rem}.bt-rwl span{flex:1}
.bt-el{width:100%;font-size:.82rem;border-collapse:collapse}.bt-el th{text-align:left;opacity:.7;font-weight:600}.bt-el td,.bt-el th{padding:.2rem .35rem;border-top:1px solid var(--line,#d5d9de)}.bt-el .r{text-align:right;white-space:nowrap}
.bt-rs{display:flex;flex-wrap:wrap;gap:.3rem .9rem;font-size:.8rem;opacity:.8;align-items:center}.bt-rs label{display:flex;gap:.3rem;align-items:center;cursor:pointer}
@media (max-width:640px){.bt-ab .bt-sp{grid-template-columns:1fr}}
.bt-ap{display:flex;gap:.5rem;align-items:flex-start;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.4rem .6rem;margin:.3rem 0;cursor:pointer}.bt-ap.on{border-color:var(--y,#3b5a8f);box-shadow:inset 0 0 0 1px var(--y,#3b5a8f)}
.bt-kzb{grid-column:1/-1;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.4rem .55rem;display:flex;flex-direction:column;gap:.3rem;font-size:.84rem}
.bt-kzb code{font-size:.8rem;background:var(--hov,rgba(0,0,0,.05));border-radius:4px;padding:0 .3rem}.bt-kzb table{border-collapse:collapse;font-size:.8rem}.bt-kzb td{padding:.1rem .45rem .1rem 0;vertical-align:top}.bt-kzb td:last-child{opacity:.7}
.bt-kzb .bt-kzk{display:flex;gap:.4rem;flex-wrap:wrap}.bt-chip.gelb{background:#fff4d6;border-color:#e7c27a}.bt-ul{display:flex;flex-direction:column;gap:.25rem;font-size:.86rem}.bt-ul li{margin:.1rem 0}
.bt-weg4{width:100%;text-align:left;font:inherit;color:inherit;background:var(--card,transparent)}.bt-weg4:hover,.bt-weg4:focus-visible{border-color:var(--y,#3b5a8f);box-shadow:inset 0 0 0 1px var(--y,#3b5a8f)}.bt-anf{width:min(520px,100%)}
.bt-hd{width:min(480px,100%)}.bt-hdl{display:flex;flex-direction:column;gap:.2rem;font-size:.86rem}.bt-hdl>span{opacity:.75}.bt-hdl input{font:inherit;padding:.3rem .5rem}.bt-hdz{display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end}.bt-hdz .bt-m{width:7rem}
.bt-ehb{font:inherit;font-size:.85rem;border:1px solid var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(6px*var(--rk,1));padding:0 .4rem;cursor:pointer}.bt-baum tr.bt-erg td:first-child{box-shadow:inset 3px 0 0 #e0b100}
.bt-ap small{display:block;opacity:.7}.bt-lk{border:0;background:none;color:var(--y,#3b5a8f);font:inherit;cursor:pointer;padding:.2rem 0}
.bt-grp{flex:none}.bt-snz>td{background:color-mix(in srgb,var(--y,#2f6fb3) 5%,transparent)}.bt-sn{display:flex;flex-wrap:wrap;gap:.5rem;align-items:flex-start;padding:.35rem .5rem .45rem}.bt-sn .bt-such{flex:1;min-width:16rem;max-width:34rem}.bt-sni{align-self:center;font-size:.85rem}
.bt-pop .bt-popd{display:flex;flex-direction:column;gap:.6rem}.bt-hk{width:1.4rem}.bt-hk input{margin:0;accent-color:#7b2ff7}
.bt-kw{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;margin:0 0 .45rem}.bt-kw .bt-h{width:100%;margin:0}.bt-chip{border:1px solid var(--line,#d5d9de);background:var(--card,#fff);color:inherit;border-radius:calc(999px*var(--rkp,1));padding:.15rem .6rem;font:inherit;font-size:.85em;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bt-chip.on{border-color:var(--af,#3b5a8f);font-weight:600;box-shadow:inset 0 0 0 1px var(--af,#3b5a8f)}.bt-kwp{border-style:dashed;color:var(--mute,#6b7380)}
.bt-popr{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.35rem}.bt-seg{display:inline-flex;padding:2px;border:1px solid var(--line,#d5d9de);border-radius:calc(999px*var(--rkp,1))}
.bt-seg button{border:0;background:none;border-radius:calc(999px*var(--rkp,1));padding:.1rem .65rem;cursor:pointer;font:inherit;color:inherit}.bt-seg button.on{background:var(--y,#2f6fb3);color:#fff}
.bt-popu tr[data-btpz]:hover td{background:var(--hov,rgba(47,111,179,.08))}`;
  const stil = () => { if (document.getElementById('bt-stil')) return; const s = document.createElement('style'); s.id = 'bt-stil'; s.textContent = STIL; document.head.appendChild(s); };

  const tag = (s) => (window.bpTag ? bpTag(String(s || '').slice(0, 10)) : String(s || '').slice(0, 10));

  /* „Neuer Planstand – mit der Planung“ (21.11.2026): das ganze Gebäude aus dem Assistenten – alle Teile, Geschosse, Keller, Dach – als
     Baukasten im Gebäudemodell; Mengen kommen aus der Geometrie (kein Fenster „Mengen/Preise“ mehr, Preise gibt es erst in Kosten und LV).
     Im Gebäudemodell direkt (gmWeg), sonst dorthin springen (#neu-planung) – mit „Zurück“. */
  function planungNeu() {
    if (typeof window.gmWeg === 'function') return window.gmWeg('planung');
    const H = window.BPHead || {}, gm = H.conf && (H.conf.apps || []).find((x) => x.key === 'gebaeudemodell');
    if (!gm || !H.appUrl) { if (window.toast) toast('Das Gebäudemodell ist nicht freigeschaltet.', true); return; }
    if (window.bpZurueckMerken) bpZurueckMerken({ titel: document.title });
    location.href = `${H.appUrl(gm)}/#neu-planung`;
  }

  /* Ein Fenster für jeden Anfang (GO 20.11.2026 D1; 21.11.2026: auch „＋ Neuer Planstand …“ im Menü) – „Wie willst du beginnen?“ mit drei Wegen:
     Baukasten · Planung · Datei; darunter klein, was ohne Gebäude geht. → Promise<'baukasten' | 'planung' | 'lesen' | 'raeume' | 'zeilen' | null>;
     der Aufrufer führt den Weg aus. o.neu = es gibt schon einen Planstand (Titel „Neuer Planstand“), o.plan = der Assistent kennt das Gebäude. */
  const WEGE = [['baukasten', 'Mit dem Baukasten', 'Das Gebäude in 3D zusammenbauen – Geschosse, Dach, Fenster und Türen. Beginnt mit einem Erdgeschoss und Satteldach.'],
    ['planung', 'Mit der Planung', 'Das ganze Gebäude aus dem Planungsassistenten – alle Gebäudeteile, Geschosse, Keller und Dach – im Baukasten, mit Räumen, Fenstern und Türen.'],
    ['lesen', 'Mit einer Datei', 'IFC, DXF oder PDF – aus „Pläne & Dateien“ oder vom Gerät. Bauteile, Räume, Fenster und Türen kommen aus dem Plan.']];
  function anfangen(o = {}) {
    stil();
    return new Promise((fertig) => {
      modalBox(`<div class="bt-ab bt-anf"><h3>${o.neu ? 'Neuer Planstand – wie willst du beginnen?' : 'Wie willst du beginnen?'}</h3>
        ${WEGE.map(([k, t, u]) => `<button type="button" class="bt-ap bt-weg4" data-m="${k}"><span><b>${t}</b><small>${k === 'planung' && o.plan === false ? 'Dafür erst im Reiter „Planung“ sagen, was gebaut wird und wie groß – der Reiter geht auf.' : u}</small></span></button>`).join('')}
        <div class="mute">Ohne Gebäude: <button type="button" class="bt-lk" data-m="zeilen">nur einzelne Bauteile</button> · Räume entstehen im Grundriss des Baukastens (Etappe 5, G4-A)</div>
        <div class="mute">${o.neu ? 'Mit dem Baukasten gilt der neue Planstand sofort; aus der Planung oder einer Datei kommt er mit Abgleich. Der bisherige bleibt im Menü.' : 'Es entsteht ein Planstand – ein späterer Plan ersetzt ihn mit Abgleich, deine Antworten bleiben.'}</div>
        <div class="bt-ft"><button type="button" class="btn" data-m="x">Abbrechen</button></div></div>`, (m, bg, close) => { close(); fertig(m === 'x' ? null : m); });
    });
  }
  /* Zeile von Hand (B1): Name, Menge und Einheit gleich beim Anlegen → Promise<{ name, menge, einheit } | null> */
  const EINHEITEN = ['m²', 'm', 'St', 'psch'];
  function handDialog(gruppe) {
    let eh = 'm²';
    return new Promise((fertig) => {
      modalBox(`<div class="bt-ab bt-hd"><h3>Neue Zeile${gruppe ? ' – ' + esc(gruppe) : ''}</h3>
        <label class="bt-hdl"><span>Was für ein Bauteil?</span><input data-bthn placeholder="z. B. Trockenbauwand Flur" maxlength="200"></label>
        <div class="bt-hdz"><label class="bt-hdl"><span>Menge</span><input data-bthm class="bt-m" inputmode="decimal" placeholder="0"></label>
          <div class="bt-hdl"><span>Einheit</span><div class="bt-o" role="group" aria-label="Einheit">${EINHEITEN.map((e) => `<button type="button" data-m="eh:${e}" class="${e === eh ? 'on' : ''}">${e}</button>`).join('')}</div></div></div>
        <div class="mute">Die Menge kannst du auch später eintragen – bis dahin rechnet die Zeile mit 0. Den Aufbau wählst du danach rechts.</div>
        <div class="bt-ft"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Anlegen</button></div></div>`, (m, bg, close) => {
        if (m.startsWith('eh:')) { eh = m.slice(3); bg.querySelectorAll('[data-m^="eh:"]').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); return; }
        if (m === 'x') { close(); return fertig(null); }
        const n = bg.querySelector('[data-bthn]').value.trim(); if (!n) { bg.querySelector('[data-bthn]').focus(); return sag('Bitte sagen, was für ein Bauteil es ist.', true); }
        close(); fertig({ name: n, menge: parseFloat(bg.querySelector('[data-bthm]').value.replace(/\./g, '').replace(',', '.')) || 0, einheit: eh });
      });
      const i = [...document.querySelectorAll('.modal-bg')].pop()?.querySelector('[data-bthn]'); if (i) { i.focus(); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.closest('.modal-bg').querySelector('[data-m="ok"]').click(); }); }
    });
  }

  function mount(el, pid, opt = {}) {
    stil();
    const H = window.BPHead || {};
    /* Für andere Apps (22.11.2026, Wärmeschutz – Mock „Wärmeschutz: Bauteile-Baum“ WB-1 B): opt.filter(z) – nur diese Zeilen; opt.gruppenExtra
       { key: [Name, (z) => Wert] } – eigene Ebenen; opt.grp0 / opt.grpKey – Vorgabe und Merk-Schlüssel; opt.kompakt – nur Bauteil · Menge · U ·
       letzte Spalte; opt.letzte { kopf, zelle(z), gruppe(R) } statt „in Kosten/LV“; opt.nachher(api) – nach jedem Zeichnen;
       opt.umsortieren: false – Ziehen und Strg+X/V ordnen nichts um; opt.ziehen(ids) – beim Anfassen der Zeilen (Ablegen außerhalb macht die App) */
    const GX = opt.gruppenExtra || {}, GR = { ...GRUPPEN, ...Object.fromEntries(Object.entries(GX).map(([k, [n]]) => [k, n])) };
    const grpKey = opt.grpKey || 'bp.bt.grp3', grp0 = opt.grp0 || GRP0, KOMP = !!opt.kompakt, NS = KOMP ? 4 : 6;
    const Z = { d: null, auf: null, vorl: {}, vorlD: {}, blk: {}, laeuft: false, kg: {}, ps: [], an: null, rw: null, rwW: {}, sel: null, det: null, mw: [], grp: grpLies(grpKey, GR, grp0), gk: [], schnell: null, pop: null, popU: 'an' };   // sel: markierte Zeile (Baumtabelle), det: Feld „Details“ rechts   // rw: Vorschläge der Apps (Rückweg), rwW: Wahl je Vorschlag   // an: Planstand, der gerade angesehen wird (gilt nicht)
    const G = () => (Z.d && Z.d.modell && Z.d.modell.bauteilliste) || { zeilen: [], raeume: [], quelle: {} };
    const L = () => (Z.an ? Z.an.liste : G());
    const gilt = () => (G().quelle || {}).planstand || null;
    const basis = `api/bp/modell/${pid}`;
    const warte = (t) => { const tm = setTimeout(() => { const w = el.querySelector('.bt-w'); if (w) w.textContent = t; }, 1500); return () => clearTimeout(tm); };

    async function laden() {
      const [d, p, rw] = await Promise.all([J(basis).then((r) => r.json()), opt.einlesen ? J(`${basis}/planstaende`).then((r) => r.json()) : Promise.resolve(null),
        J(`${basis}/rueckweg`).then((r) => r.json()).catch(() => null)]);
      Z.d = d; if (p) Z.ps = p.planstaende || []; Z.rw = rw;
      zeichne();
    }
    const neu = (d) => { Z.d = d; if (d.planstaende) Z.ps = d.planstaende; };
    async function ansehen(id) {
      if (!id || String(id) === String(gilt())) { Z.an = null; return zeichne(); }
      try { const d = await (await J(`${basis}/planstand/${id}`)).json(); Z.an = { ...d.planstand, liste: d.liste, abgleich: d.abgleich }; Z.auf = null; zeichne(); } catch (e) { sag(e.message, true); }
    }
    async function aendern(id, was, text) {
      try { neu(await (await J(`${basis}/planstand/${id}`, 'POST', was)).json()); if (was.gilt || was.loeschen) Z.an = null; zeichne(); if (text) sag(text); } catch (e) { sag(e.message, true); }
    }
    /* Arbeitsstand und Versionen (Etappe 4 „Gebäudemodell neu“, F4-A/F5-A – 22.11.2026): der gültige Planstand ist der Arbeitsstand,
       die übrigen sind festgehaltene Versionen; Versionen vom Versand eingeklappt in der Gruppe „Versand“. Zurückholen = Kopie wird Arbeitsstand. */
    const ZURUECK = 'Die Version ist jetzt der Arbeitsstand – die Apps arbeiten damit. Die Version selbst bleibt, wie sie war.';
    async function festhalten() {
      const g = gilt(); if (!g) return sag('Noch kein Arbeitsstand.', true);
      const n = await bpEingabe('Name der Version (z. B. „Entwurf Bauherr“):', ''); if (n == null) return;
      await aendern(g, { festhalten: n.trim() }, 'Version festgehalten – am Arbeitsstand geht es weiter.');
    }
    function menue(box) {   // gemeinsames Versionsmenü (head.js)
      if (!H.versionsMenue || !box) return;
      const g = gilt(), akt = Z.an ? Z.an.id : g;
      H.versionsMenue({ in: box, wort: 'Stand', fragen: false, gruppen: { versand: 'Beim Versand festgehalten' },
        liste: Z.ps.map((x) => ({ id: x.id, name: String(x.id) === String(g) ? `Arbeitsstand · ${x.name}` : x.name, datum: tag(x.erstellt), archiviert: x.archiviert, gruppe: String(x.id) === String(g) ? '' : x.gruppe || '' })), aktuell: akt, gueltig: g,
        neuText: '＋ Neuer Plan / neu beginnen …', giltText: '↩ Als Arbeitsstand zurückholen …',
        extra: g && String(akt) === String(g) ? [{ text: '📌 Version festhalten …', fn: festhalten }] : [],
        onWahl: (id) => ansehen(id),
        onGueltig: (id) => aendern(id, { zurueckholen: true }, ZURUECK),
        onNeu: () => anfang(true),
        onUmbenennen: async () => { const x = Z.ps.find((y) => String(y.id) === String(akt)); const n = await bpEingabe('Name des Planstands:', x ? x.name : ''); if (n && n.trim()) aendern(akt, { name: n.trim() }); },
        onVerwalten: async () => {   // jeder Planstand lässt sich löschen – auch der gültige (16.11.2026), immer über den Papierkorb mit Rückgängig
          const x = Z.ps.find((y) => String(y.id) === String(akt)); if (!x) return;
          const istG = String(akt) === String(g), andere = Z.ps.filter((y) => String(y.id) !== String(akt));
          const nf = istG ? (andere.filter((y) => !y.archiviert).slice(-1)[0] || andere.slice(-1)[0]) : null;
          let r;
          if (istG) r = await bpFrage(nf ? `„${x.name}“ gilt gerade.\nBeim Löschen gilt ab dann „${nf.name}“ – Kosten, Ausschreibung, Termine und die anderen Apps arbeiten damit.`
            : `„${x.name}“ ist der einzige Planstand.\nDanach ist das Gebäudemodell leer – Bauteile, Räume, Fenster und Türen, auch von Hand Ergänztes. Alles liegt 30 Tage im Papierkorb und kommt mit „Zurück“ wieder.`,
          { ok: 'In den Papierkorb', gefahr: true, abbrechen: 'Abbrechen' });
          else r = await bpFrage(`„${x.name}“ archivieren oder löschen?\nArchivierte Planstände bleiben im Menü unter „Archiviert“, gelöschte liegen 30 Tage im Papierkorb.`, { ok: x.archiviert ? 'Wieder hervorholen' : 'Archivieren', drei: 'In den Papierkorb', abbrechen: 'Abbrechen' });
          if (r === true && !istG) { aendern(akt, { archiviert: !x.archiviert }); return; }
          if (!(istG ? r === true : r === 'drei')) return;
          try {
            const d = await (await J(`${basis}/planstand/${akt}`, 'POST', { loeschen: true, ...(nf ? { nachfolger: nf.id } : {}) })).json();
            neu(d); Z.an = null; zeichne(); sag(`„${x.name}“ im Papierkorb.`);
            const id = x.id;
            if (window.rueckgaengig && d.papierkorb) rueckgaengig(`Planstand „${x.name}“ gelöscht`, async () => {
              await J(`api/bp/papierkorb/${d.papierkorb}/zurueck`, 'POST');
              if (istG) neu(await (await J(`${basis}/planstand/${id}`, 'POST', { gilt: true })).json()); else await laden();
              zeichne(); }, { neu: async () => { await laden(); zeichne(); } });
          } catch (e) { sag(e.message, true); }
        } });
    }
    async function einlesen() {
      const r = await bpFrage('Neuen Planstand einlesen – woher kommt die Datei?\nIFC (Allplan u. a.) liefert Bauteile, Öffnungen und Räume; DXF Räume, Öffnungen und Wände; PDF nur die Raumstempel.',
        { ok: 'Aus „Pläne & Dateien“ …', drei: 'Vom Gerät …', abbrechen: 'Abbrechen' });
      if (r === 'drei') return el.querySelector('[data-btdatei]').click();
      if (r !== true || !H.dateiWahl) return;
      const w = await H.dateiWahl({ project_id: pid, titel: 'Plan für das Gebäudemodell wählen', start: 'server', endungen: ['ifc', 'dxf', 'pdf'], eine: true,
        geraet: () => el.querySelector('[data-btdatei]').click() });
      if (w && w[0]) lesen({ quelle: w[0].quelle, pfad: w[0].pfad });
    }
    async function lesen(was) {   // Schritt 1: Entwurf mit Abgleich – das Modell bleibt, bis „Planstand übernehmen“
      if (Z.laeuft) return; Z.laeuft = true;
      const stop = warte('Plan wird gelesen …');
      try {
        const e = await (await J(`${basis}/bauteile/lesen`, 'POST', was)).json();
        if (e.zuordnen) return zuordnen(e.zuordnen, was);
        if (e.erster) return await uebernehmen(e, {}, e.name);
        abgleich(e);
      } catch (er) { sag(er.message, true); } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    }
    function zuordnen(Q, was) {   // DXF: Ebenen und Blöcke einmal zuordnen – das Büro merkt es sich
      const WE = { raum: 'Räume', wand_aussen: 'Außenwände', wand_innen: 'Innenwände', ignorieren: 'nicht verwenden' }, WB = { fenster: 'Fenster', tuer: 'Türen', ignorieren: 'nicht verwenden' };
      const Z = { ebenen: Object.fromEntries(Q.ebenen.map((x) => [x.name, x.rolle])), bloecke: Object.fromEntries(Q.bloecke.map((x) => [x.name, x.rolle])) };
      const zeile = (x, art, W, info) => `<div class="bt-o"><span title="${esc(x.name)}">${esc(x.name)}<br><small>${esc(info)}</small></span>${Object.entries(W).map(([k, t]) => `<button type="button" data-m="${art}|${k}|${esc(x.name)}" class="${Z[art][x.name] === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
      const html = () => `<div class="bt-ab"><h3>DXF: Ebenen und Symbole zuordnen</h3>
        <div class="mute">Einmal antippen, was auf welcher Ebene liegt – das Büro merkt es sich für die nächsten Pläne. Vorschläge kommen aus den Namen.</div>
        <h4>Ebenen</h4>${Q.ebenen.map((x) => zeile(x, 'ebenen', WE, [x.flaechen ? x.flaechen + ' Umrisse' : '', x.linien ? x.linien + ' Linien' : ''].filter(Boolean).join(' · '))).join('') || '<span class="mute">keine</span>'}
        <h4>Blöcke (Symbole)</h4>${Q.bloecke.map((x) => zeile(x, 'bloecke', WB, x.n + '×')).join('') || '<span class="mute">keine</span>'}
        <div class="bt-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Einlesen</button></div></div>`;
      modalBox(html(), (m, bg, close) => {
        if (m === 'abbrechen') return close();
        if (m === 'ok') { close(); if (was instanceof FormData) { was.set('zuordnung', JSON.stringify(Z)); return lesen(was); } return lesen({ ...was, zuordnung: Z }); }
        const [art, k, ...n] = m.split('|'); Z[art][n.join('|')] = k;
        const box = bg.querySelector('.modal'), y = box.querySelector('.bt-ab').scrollTop; box.innerHTML = html(); box.querySelector('.bt-ab').scrollTop = y;
      });
    }
    async function uebernehmen(e, zuordnung, name, plus_weg) {
      neu(await (await J(`${basis}/planstand/${e.entwurf}/uebernehmen`, 'POST', { zuordnung, name, ...(plus_weg ? { plus_weg } : {}) })).json()); Z.an = null; Z.auf = null;
      sag(`Planstand übernommen: ${L().zeilen.length} Zeilen` + ((e.hinweise || []).length ? ' – ' + e.hinweise[0] : '')); zeichne();
    }
    function abgleich(e) {   // Schritt 2: Abgleich mit Zuordnung per Klick (entfällt ↔ neu = dasselbe Bauteil)
      const A = e.abgleich, paar = {}, ERG = A.ergaenzt || [], bleibt = new Set(); let wahl = null;   // ERG: Ergänztes, das der neue Plan selbst enthält (A1, 20.11.2026)
      const weg = () => { const w = { raeume: [], elemente: [] }; ERG.forEach((x, i) => { if (!bleibt.has(i)) w[x.art].push(x.k); }); return w; };
      const it = (x, art) => { const p = art === 'e' ? paar[x.id] : Object.keys(paar).find((k) => paar[k] === x.id);
        return `<button type="button" class="bt-i${wahl === x.id ? ' sel' : ''}${p ? ' paar' : ''}" data-m="${art}:${esc(x.id)}">${esc(x.name)} <small>· ${zahl(x.menge)} ${esc(x.einheit)}${x.beantwortet ? ' · ' + esc(WORT[x.status] || x.status) : ''}</small>${p ? `<br><small>↔ ${esc((art === 'e' ? A.neu : A.entfaellt).find((y) => y.id === p)?.name || '')}</small>` : ''}</button>`; };
      const html = () => `<div class="bt-ab"><h3>Neuer Planstand: ${esc(e.name)}</h3>
        <div>${A.neu.length} neu · ${A.geaendert.length} geändert · ${A.entfaellt.length} entfällt · ${A.gleich} unverändert – deine Maßnahmen zu unveränderten Zeilen bleiben.</div>
        ${A.entfaellt.length && A.neu.length ? '<div class="mute">Ist ein „entfällt“ und ein „neu“ dasselbe Bauteil (neu gezeichnet, umbenannt)? Erst links, dann rechts antippen – Status und Aufbau gehen mit. Nochmal antippen löst die Zuordnung.</div>' : ''}
        <div class="bt-sp"><div class="bt-li"><h4>Entfällt (${A.entfaellt.length})</h4>${A.entfaellt.map((x) => it(x, 'e')).join('') || '<span class="mute">nichts</span>'}</div>
          <div class="bt-li"><h4>Neu (${A.neu.length})</h4>${A.neu.map((x) => it(x, 'n')).join('') || '<span class="mute">nichts</span>'}</div></div>
        ${A.geaendert.length ? `<h4>Geändert (${A.geaendert.length})</h4><div class="bt-li">${A.geaendert.map((x) => `<span>${esc(x.name)} <small class="mute">${zahl(x.menge_alt)} → ${zahl(x.menge)} ${esc(x.einheit)}</small></span>`).join('')}</div>` : ''}
        ${ERG.length ? `<h4>Ergänzt – jetzt im Plan (${ERG.length})</h4><div class="bt-li">${ERG.map((x, i) => `<button type="button" class="bt-i${bleibt.has(i) ? '' : ' sel'}" data-m="p:${i}">${esc(x.text)} ist jetzt im Plan – ergänzte Zeile ${bleibt.has(i) ? '<b>behalten</b>' : '<b>entfernen</b>'}</button>`).join('')}<span class="mute">Antippen wechselt zwischen entfernen und behalten.</span></div>` : ''}
        ${(e.hinweise || []).length ? `<div class="mute">${e.hinweise.map(esc).join('<br>')}</div>` : ''}
        <div class="bt-ft"><label>Name <input data-btname value="${esc(e.name)}"></label><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Planstand übernehmen</button></div></div>`;
      modalBox(html(), async (m, bg, close) => {
        if (m === 'abbrechen') return close();
        if (m === 'ok') { const n = bg.querySelector('[data-btname]').value.trim(); close(); try { await uebernehmen(e, paar, n, ERG.length ? weg() : null); } catch (er) { sag(er.message, true); } return; }
        const [art, id] = [m.slice(0, 1), m.slice(2)];
        if (art === 'p') { if (bleibt.has(+id)) bleibt.delete(+id); else bleibt.add(+id); }
        else if (art === 'e') { if (paar[id]) delete paar[id]; else wahl = id; }
        else if (art === 'n') { const k = Object.keys(paar).find((x) => paar[x] === id); if (k) delete paar[k]; else if (wahl) { paar[wahl] = id; wahl = null; } }
        const box = bg.querySelector('.modal'), n = box.querySelector('[data-btname]').value; box.innerHTML = html(); box.querySelector('[data-btname]').value = n;
      });
    }
    async function zeile(id, neu, still) {   // eine Antwort ändern – mit Rückgängig (undo.js) für Antwort, berechnen, Aufbau, Menge
      if (!still && Z.mw.length > 1 && id === Z.mw[0] && !neu.loeschen && !('name' in neu) && !('menge' in neu)) {   // Editor bei mehreren: gilt für alle
        const r0 = L().zeilen.find((x) => x.id === id) || {};   // Option/Dicke/Ausführung gehören zur Vorlage: alle bekommen denselben Aufbau wie die gezeigte Zeile
        return mwAendern(['wahl', 'dicken', 'ausf'].some((k) => k in neu) && !('vorlage' in neu) ? { vorlage: r0.vorlage, wahl: [...(r0.wahl || [])], dicken: r0.dicken || {}, ausf: r0.ausf || {}, ...neu } : neu);
      }
      const z0 = L().zeilen.find((x) => x.id === id), alt = z0 && !neu.loeschen ? Object.fromEntries(Object.keys(neu).map((k) => [k, k === 'wahl' ? [...(z0.wahl || [])] : z0[k]])) : null;
      if (alt && 'status' in neu) Object.assign(alt, { vorlage: z0.vorlage, wahl: [...(z0.wahl || [])], berechnen: z0.berechnen });
      try {
        Z.d = await (await J(`${basis}/bauteile/zeile`, 'POST', { id, rev: Z.d.rev, ...neu })).json(); zeichne();
        window.dispatchEvent(new CustomEvent('bp:bauteile', { detail: { pid, id } }));   // andere Ansichten (Kosten links) rechnen nach
        if (alt && !still && window.rueckgaengig) rueckgaengig(`${z0.name}: ${wasText(neu)}`, () => zeile(id, alt, true), 10000, () => zeile(id, neu, true));
      } catch (e) { sag(e.message, true); if (e.status === 409) laden(); }
    }
    async function vorlagen(kg) {
      const k = String(kg || '').slice(0, 2);
      if (!Z.vorl[k]) Z.vorl[k] = J(`${basis}/bauteile/vorlagen?kg=${k}0`).then((r) => r.json()).then((d) => (Z.vorlD[k] = d), (e) => { delete Z.vorl[k]; throw e; });
      return Z.vorl[k];
    }

    function zeileHtml(z) {
      const fr = z.bereich === 'frage';
      const st = z.erlaubt || [];   /* welche Antworten passen, sagt der Kern (bauteilliste.erlaubt): im Neubau nur „neu“ */
      const T = ((Z.rw && Z.rw.termine && Z.rw.termine.phasen) || {})[z.bauphase], PN = ((Z.rw && Z.rw.phasen) || []).find((x) => x.k === z.bauphase);
      const ph = PN && (T || z.phase) ? `<span title="Bauphase${T ? ' aus dem Bauzeitenplan' : ''}">${esc(PN.n)}${T ? ' · ' + esc(tag(T.von)) + '–' + esc(tag(T.bis)) : ''}</span>` : '';
      const nr = (z.nummern || []).length || ph || z.herkunft ? `<div class="bt-nr">${[esc((z.nummern || []).join(' · ')), ph, z.herkunft ? 'aus ' + esc(z.herkunft) : ''].filter(Boolean).join(' · ')}</div>` : '';
      const auf = z.vorlage ? `<div class="bt-a"><span>${esc(z.kurz)}</span>${z.code ? `<code>${esc(z.code)}</code>` : '<code>Aufbau nach Wahl</code>'}<button type="button" data-btauf="${esc(z.id)}">Aufbau ${Z.auf === z.id ? 'zu' : 'ändern'}</button></div>`
        : z.status !== 'offen' && z.status !== 'bleibt' && z.status !== 'pruefen' ? `<div class="bt-a"><span>kein Aufbau gewählt</span><button type="button" data-btauf="${esc(z.id)}">Aufbau wählen</button></div>` : '';
      if (z.entfaellt || Z.an) {   // entfallen oder älterer Planstand: nur ansehen
        return `<div class="bt-r${z.entfaellt ? ' weg' : ''}" data-btz="${esc(z.id)}"><span></span><div><div class="bt-n"><b>${esc(z.name)}</b>${z.einordnung ? `<small class="bt-nr"> ${esc(z.einordnung)}</small>` : ''}<i>${zahl(z.menge)} ${esc(z.einheit)}</i>${z.entfaellt ? '<span class="bt-chip">entfällt</span>' : ''}<span class="bt-chip">${esc((fr ? WORT_FRAGE : WORT)[z.status] || z.status)}</span></div>${nr}${z.kurz ? `<div class="bt-a"><span>${esc(z.kurz)}</span></div>` : ''}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}</div></div>`;
      }
      return `<div class="bt-r${z.status === 'offen' ? ' offen' : ''}" data-btz="${esc(z.id)}">
        ${berKnopf(z)}
        <div><div class="bt-n">${HAND.includes(z.bereich) ? `<input class="bt-nm" data-btname value="${esc(z.name)}" aria-label="Name des Bauteils" title="Name ändern">` : `<b>${esc(z.name)}</b>`}${z.einordnung ? `<small class="bt-nr"> ${esc(z.einordnung)}</small>` : ''}${typeof bpWk === 'function' ? bpWk([z.name, z.material]) : ''}<span data-btu="${esc(z.id)}"></span>${HAND.includes(z.bereich) ? `<i><input class="bt-m" data-btmenge value="${zahl(z.menge)}" inputmode="decimal" aria-label="Menge ${esc(z.name)}"> ${z.bereich === 'hand' ? `<button type="button" class="bt-ehb" data-bteh title="Einheit wählen" aria-label="Einheit ${esc(z.einheit)}">${esc(z.einheit)} ▾</button>` : esc(z.einheit)}</i><button type="button" class="bt-weg" data-btweg title="Zeile entfernen">entfernen</button>${z.bereich === 'hand' && !z.menge ? '<span class="bt-chip gelb" data-btmf>Menge fehlt – wird mit 0 gerechnet</span>' : ''}` : `<i>${zahl(z.menge)} ${esc(z.einheit)}${z.anzahl > 1 && z.einheit !== 'St' ? ` · ${z.anzahl} Objekte` : ''}</i>${z.ergaenzt ? '<span class="bt-chip gelb" title="Neben dem Plan ergänzt – ändern unter „Räume“ bzw. „Fenster & Türen“">ergänzt</span>' : ''}`}</div>${nr}</div>
        <div class="bt-st">${st.map((s) => `<button type="button" data-btst="${s}" class="${z.status === s ? 'on' : ''}">${esc((fr ? WORT_FRAGE : WORT)[s])}</button>`).join('')}</div>
        ${auf}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}${artHtml(z)}${kzHtml(z)}${Z.auf === z.id ? `<div class="bt-e">${editorSofort(z) || '<div class="bt-w">Vorlagen werden geladen …</div>'}</div>` : ''}</div>`;
    }
    /* Art berichtigen (20.11.2026): was der Import vermutet (unterste Platte = Bodenplatte, außen/innen, tragend), lässt sich umstellen – Kern bauteilliste.art_wahl */
    const ARTEN = { 322: 'Bodenplatte', 351: 'Decke', 361: 'Dach', 331: 'Außenwand tragend', 332: 'Außenwand nichttragend', 341: 'Innenwand tragend', 342: 'Innenwand nichttragend' };   // wie bauteilliste.ARTEN
    const artWahl = (z) => (z.bereich !== 'rohbau' || z.quelle === 'allplan' ? [] : ([['322', '351', '361'], ['331', '332', '341', '342']].find((F) => F.includes(String(z.kg))) || []).map((k) => [k, ARTEN[k]]));   // auch für Listen, die vor dem 20.11.2026 gespeichert sind
    function artHtml(z) {
      const W = artWahl(z); if (W.length < 2) return '';
      const n = (k) => (W.find((x) => x[0] === k) || [k, k])[1];
      return `<div class="bt-art">Art: <button type="button" class="bt-ehb" data-btart title="Art ändern, falls der Plan sie falsch zeigt">${esc(n(z.kg))} ▾</button>${z.kg_hand && z.kg_plan && z.kg_plan !== z.kg ? ` <small class="bt-nr">von Hand – im Plan ${esc(n(z.kg_plan))}</small>` : ''}</div>`;
    }
    /* Kürzel aus dem Plan (GO 18.11.2026, Kern kuerzel.py): was an der Wand steht, wie es verstanden wurde, Vorschlag „bitte bestätigen“ (C1),
       Gelerntes (D1), Dickenprobe, Himmelsrichtung; „Wie andere Zeile …“ für gleiche Wände mit verschiedenen Namen */
    const STUFE = { bestaetigen: 'fast alles erkannt', teils: 'teils erkannt', offen: 'nur die Lage erkannt' };
    const stufeText = (e) => (e.stufe === 'offen' && !(e.folge || []).some((f) => f[2] === 'Lage') ? 'nicht erkannt' : STUFE[e.stufe] || '');   // ohne Lage nicht „nur die Lage“
    const kzChip = (z) => (!z.bestaetigt ? '<span class="bt-chip gelb">bitte bestätigen</span>' : z.vorlage ? '<span class="bt-chip">bestätigt</span>' : '<span class="bt-chip gelb">Aufbau wählen</span>');   // ohne Aufbau nichts „bestätigt“
    function kzHtml(z) {
      if (!z.kuerzel || z.bereich === 'oeffnung') return '';   // Fenster/Türen: Name ist der Typ – Ausführung über die Türliste
      const e = z.erkannt || {}, R = z.richtung || {}, ri = Object.keys(R).length ? ['N', 'O', 'S', 'W'].filter((k) => R[k]).map((k) => `${k} ${zahl(R[k])} m²`).join(' · ') : '';
      return `<div class="bt-kzb"><div><b>Aus dem Plan:</b> <code>${esc(z.kuerzel)}</code> ${kzChip(z)} <span class="bt-nr">${esc(stufeText(e))}</span></div>
        ${(e.folge || []).length ? `<table>${e.folge.map((f) => `<tr><td><code>${esc(f[0])}</code></td><td>${esc(f[1])}</td><td>${esc(f[2])}</td></tr>`).join('')}</table>` : ''}
        ${e.gelernt ? `<div class="bt-h">Vorschlag aus dem Büro: ${e.gelernt}× bei diesem Kürzel so bestätigt.</div>` : ''}${e.dicke ? `<div class="bt-h bt-ro">${esc(e.dicke)}</div>` : ''}${e.frage ? `<div class="bt-h bt-ro">${esc(e.frage)}</div>` : ''}
        ${ri ? `<div class="bt-h">Himmelsrichtung (aus der Geometrie): ${esc(ri)}</div>` : ''}
        ${Z.an ? '' : `<div class="bt-kzk">${!z.bestaetigt && z.vorlage ? '<button type="button" class="btn sm primary" data-btbest>Bestätigen</button>' : ''}<button type="button" class="btn sm" data-btwie>Wie andere Zeile …</button></div>`}</div>`;
    }
    function zeichnerListe() {   // „An den Zeichner“: was im Plan nachzuziehen ist – Abweichungen, Dicken, fehlende Kürzel
      const Zs = (L().zeilen || []).filter((z) => !z.entfaellt), A = [];
      for (const z of Zs) {
        if (z.kuerzel && z.bestaetigt && z.kz_vorlage && z.vorlage && z.vorlage !== z.kz_vorlage) A.push(`„${z.kuerzel}“: im Modell ${z.kurz} – weicht vom Plan ab`);
        if (z.kuerzel && (z.erkannt || {}).dicke) A.push(`„${z.kuerzel}“: ${z.erkannt.dicke}`);
        if (z.kuerzel && (z.erkannt || {}).frage) A.push(`„${z.kuerzel}“: ${z.erkannt.frage}`);
        if (!z.kuerzel && /^Wand|^Decke|^Dach|^Bodenplatte/.test(z.art || '') && !z.code && z.quelle === 'ifc') A.push(`${z.name}: ohne Kürzel im Plan`);
      }
      const nach = {}; Zs.filter((z) => z.kuerzel && z.bereich !== 'oeffnung').forEach((z) => { (nach[z.kuerzel.toLowerCase()] = nach[z.kuerzel.toLowerCase()] || new Set()).add(zahl((z.dicke_plan || 0) * 100)); });
      Object.entries(nach).forEach(([k, d]) => { if (d.size > 1) A.push(`„${k}“ kommt mit verschiedenen Dicken vor (${[...d].join(' / ')} cm) – gleiche Wände, gleicher Name?`); });
      return A;
    }
    async function zeichnerZeigen() {
      const A = zeichnerListe(); let K = null; try { K = await (await J('api/bp/modell/kuerzel')).json(); } catch { /* ohne Liste */ }
      const txt = A.map((x) => '– ' + x).join('\n');
      modalBox(`<div class="bt-ab"><h3>An den Zeichner</h3><p class="mute">Was im Plan nachzuziehen ist – die Kosten stimmen trotzdem, das Modell gilt.</p>
        <ul class="bt-ul">${A.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>Nichts – Plan und Modell passen zusammen.</li>'}</ul>
        ${K ? `<details><summary>Kürzel, die das Portal sicher kennt</summary><p class="mute">Gleiche Bauteile, gleicher Name. Groß/klein, Leerzeichen und Bindestriche egal. Die Art (Wand, Decke …) kommt aus dem Plan.</p>
          <p><b>Lage (freiwillig):</b> ${K.lage.map((x) => `<code>${esc(x[0])}</code> ${esc(x[1])}`).join(' · ')}</p><p><b>Kern:</b> ${K.kern.map((x) => `<code>${esc(x[0])}</code> ${esc(x[1])}`).join(' · ')}</p>
          <p><b>Schichten:</b> ${K.schichten.map(esc).join(', ')} – Tippfehler bis 2 Buchstaben werden erkannt.</p></details>` : ''}
        <div class="bt-ft"><button type="button" class="btn" data-m="kopie"${A.length ? '' : ' disabled'}>Liste kopieren</button><button type="button" class="btn primary" data-m="zu">Schließen</button></div></div>`,
      async (m, bg, close) => { if (m === 'zu') close(); if (m === 'kopie') { try { await navigator.clipboard.writeText(txt); sag('Kopiert.'); } catch { sag('Kopieren ging nicht – bitte markieren.', true); } } });
    }

    /* Gebäudeteile (GT-C1, 18.11.2026): Zeilen tragen „teil“ – Auswahl oben, Name des Teils hinter der Zeile; Zeilen ohne Teil (Fragen, von Hand) immer */
    const teilName = (k) => (((Z.d && Z.d.modell && Z.d.modell.teile) || []).find((t) => t.k === k) || {}).n || k;
    const teilFilter = (ZZ) => { const T = [...new Set(ZZ.map((z) => z.teil).filter(Boolean))]; if (Z.teil && !T.includes(Z.teil)) Z.teil = '';
      return [T.length > 1 ? ZZ.filter((z) => !Z.teil || !z.teil || z.teil === Z.teil) : ZZ, T.length > 1 ? `<div class="bt-teile" role="group" aria-label="Gebäudeteil"><span>Gebäudeteil</span>${['', ...T].map((k) => `<button type="button" data-btteil="${esc(k)}" class="${(Z.teil || '') === k ? 'on' : ''}">${esc(k ? teilName(k) : 'alle')}</button>`).join('')}</div>` : ''];
    };
    const mitTeil = (z) => (z.teil && !String(z.name).includes(teilName(z.teil)) ? `${z.name} – ${teilName(z.teil)}` : z.name);
    function zeichne() {
      if (opt.baum) { baumZeichnen(); uFuellen(el); detailsZeichnen(); if (opt.nachher) opt.nachher(api); return; }
      const Li = L(), Q = Li.quelle || {}, ZZ = Li.zeilen || [], gm = ((H.conf || {}).apps || []).find((a) => a.key === 'gebaeudemodell');
      const offen = ZZ.filter((z) => z.status === 'offen' && !z.entfaellt).length, weg = G().zeilen.filter((z) => z.entfaellt).length;
      const stand = Q.datei ? `${esc(Q.name || 'Planstand')} · ${esc(Q.datei)}${Q.gelesen ? ' · gelesen ' + esc(tag(Q.gelesen)) : ''}${Q.programm ? ' · ' + esc(Q.programm) : ''}` : '';
      const kopf = opt.einlesen
        ? `<div class="bt-kopf"><span data-btvm></span><button type="button" class="btn${ZZ.length ? '' : ' primary'}" data-btlesen>Planstand einlesen …</button>
          <button type="button" class="btn" data-btaus${ZZ.length && !Z.an && ifcDa(Q) ? '' : ' disabled'} title="Nummern, Status und Aufbau ins IFC schreiben${Q.pfad ? ' – die Datei kommt aus „Pläne & Dateien“' : ' – dafür die IFC-Datei noch einmal wählen'}">IFC mit Maßnahmen ausgeben</button>
          ${weg && !Z.an ? `<button type="button" class="btn" data-btweg-alle title="Zeilen, die im gültigen Planstand nicht mehr vorkommen, entfernen">Aufräumen (${weg} entfällt)</button>` : ''}
          ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
          <span class="bt-q"></span>${Z.an ? '' : '<button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button>'}
          ${ZZ.length && !Z.an && Z.rw && Z.rw.extern ? '<button type="button" class="btn" data-btki title="Eine externe KI schlägt fehlende Bauteile, Aufbauten, Mengen oder Ausstattung vor – anonymisiert, nur als Vorschlag">Verfeinern (extern) …</button>' : ''}
          <input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div><div class="bt-w"></div>`
        : `<div class="bt-kopf"><span class="bt-ps">${stand ? 'Planstand: ' + stand : 'Noch kein Planstand eingelesen.'}${gm ? ` · <a href="${esc(H.appUrl(gm))}/#bauteile">${stand ? 'Neuen Planstand einlesen' : 'Plan einlesen'} → Gebäudemodell</a>` : ''}</span>
          ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
          <button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button></div><div class="bt-w"></div>`;
      const an = Z.an ? `<div class="bt-an"><span>Du siehst die Version <b>${esc(Z.an.name)}</b> – nur zum Ansehen. Gegenüber dem Arbeitsstand: ${Z.an.abgleich.neu.length} neu · ${Z.an.abgleich.geaendert.length} geändert · ${Z.an.abgleich.entfaellt.length} entfällt.</span>
        <button type="button" class="btn" data-btzurueck>Zurück zum Arbeitsstand</button><button type="button" class="btn primary" data-btgilt>Als Arbeitsstand zurückholen</button></div>` : '';
      if (!ZZ.length) {   // ohne Modell (Z1, 17.11.2026): dieselbe Meldung wie überall – aus der Planung anlegen, Plan einlesen oder Zeile von Hand
        const A = (Z.d.modell || {}).assistent || {}, plan = !!A.type;
        el.innerHTML = `<div class="bt-l">${typeof bpLeer === 'function' ? bpLeer({ was: 'keine Bauteile', text: plan ? 'Aus der Planung lässt sich ein erster Stand anlegen – mit Vorschlagsmengen und Preisspanne aus den Baudaten. Oder einen Plan einlesen (IFC, DXF, PDF).' : 'Erst die Planung beginnen (Was wird gebaut, wie groß) – daraus entstehen die Bauteile. Oder einen Plan einlesen (IFC, DXF, PDF).',
          knoepfe: [{ t: 'Anfangen …', attrs: 'data-btanfang' }] }) : ''}
          ${opt.einlesen || !gm ? '' : `<p class="bt-nr"><a href="${esc(H.appUrl(gm))}/#bauteile">Plan einlesen → Gebäudemodell</a></p>`}<span data-btvm hidden></span><input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div>`;
        menue(el.querySelector('[data-btvm]'));
        return;
      }
      const nZ = Z.an ? 0 : zeichnerListe().length, [ZT, tw] = teilFilter(ZZ);
      // ohne Hüpfen (19.11.2026, Video): Höhe halten, bis der Aufbau-Editor wieder gefüllt ist, und die Rollposition des Bereichs zurücksetzen
      let sc = el; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const y = sc && sc !== document.body ? sc.scrollTop : null, hoch = el.offsetHeight;
      if (y != null) el.style.minHeight = hoch + 'px';
      const halt = () => { if (y == null) return; sc.scrollTop = y; el.style.minHeight = ''; };
      el.innerHTML = `<div class="bt-l">${kopf}${an}${tw}${Z.an ? '' : rueckwegHtml()}${nZ ? `<div class="bt-rwl"><span>${nZ} Hinweis${nZ === 1 ? '' : 'e'} an den Zeichner (Plan und Modell weichen ab, Kürzel fehlen)</span><button type="button" class="btn sm" data-btzeichner>ansehen</button></div>` : ''}${BEREICH.map(([b, t]) => { const R = ZT.filter((z) => z.bereich === b); return R.length ? `<section class="bt-b"><h4>${esc(t)}</h4>${R.map(zeileHtml).join('')}</section>` : ''; }).join('')}</div>`;
      menue(el.querySelector('[data-btvm]'));
      uFuellen(el);
      if (y != null) sc.scrollTop = y;
      if (Z.auf) editor().then(halt, halt); else halt();
    }

    function rueckwegHtml() {   // Vorschläge der Apps (Kern rueckweg.py): annehmen, verbinden, ablehnen; Schalter „ins Modell“ je App
      const R = Z.rw; if (!R) return '';
      const S = R.schalter || {}, alle = G().zeilen || [], name = (id) => (alle.find((x) => x.id === id) || {}).name || id;
      const PN = (k) => ((R.phasen || []).find((x) => x.k === k) || {}).n || k;
      const was = (e) => Object.entries(e.neu || {}).filter(([k]) => !['einheit', 'kg', 'gewerk', 'vorlage_name'].includes(k))
        .map(([k, v]) => (k === 'menge' ? `Menge ${e.alt && e.alt.menge != null ? zahl(e.alt.menge) + ' → ' : ''}${zahl(v)} ${esc(e.einheit || (e.neu || {}).einheit || '')}`
          : k === 'vorlage' ? `Aufbau ${e.alt && e.alt.aufbau ? esc(e.alt.aufbau) + ' → ' : ''}${esc(e.neu.vorlage_name || v)}`
            : `Bauphase ${e.alt && e.alt.phase ? esc(PN(e.alt.phase)) + ' → ' : ''}${esc(PN(v))}`)).join(' · ')
        + (e.grund ? `<br><small class="bt-w">${esc(e.grund)}</small>` : '');
      const knopf = (hid, i, w, t) => `<button type="button" class="btn sm${(Z.rwW[hid] || {})[i] === w ? ' primary' : ''}" data-btrw="${hid}" data-i="${i}" data-w="${esc(w)}">${t}</button>`;
      const box = (R.vorschlaege || []).map((h) => {
        const W = Z.rwW[h.id] ||= {}, Zl = (h.daten.zeilen || []);
        Zl.forEach((e, i) => { if (!(i in W)) W[i] = e.doppelt ? 'verbinden:' + e.doppelt : 'ja'; });
        return `<div class="bt-rw" data-btrwh="${h.id}"><h4>${esc(h.titel)}${h.daten.extern ? ' <span class="bt-chip bt-ext">extern, ungeprüft</span>' : ''}</h4>${Zl.map((e, i) => `<div class="bt-rz"><span>${e.art === 'neu' ? `<b>Neu:</b> ${esc(e.name)}${was(e) ? ' · ' + was(e) : ''}${e.doppelt ? ` <span class="bt-chip">gibt es schon: „${esc(name(e.doppelt))}“</span>` : ''}` : `<b>${esc(e.name)}</b>: ${was(e)}`}</span>
          <span class="bt-rk">${e.art === 'neu' ? knopf(h.id, i, 'ja', 'Neu anlegen') + (e.doppelt ? knopf(h.id, i, 'verbinden:' + e.doppelt, 'Verbinden') : '') : knopf(h.id, i, 'ja', 'Übernehmen')}${knopf(h.id, i, 'nein', 'Nein')}</span></div>`).join('')}
          <div class="bt-rk"><button type="button" class="btn sm" data-btrwab="${h.id}">Alle ablehnen</button><button type="button" class="btn sm primary" data-btrwok="${h.id}">Entscheidung übernehmen</button></div></div>`;
      }).join('');
      return `${box}<div class="bt-rs"><span>Änderungen aus den Apps als Vorschlag ins Modell:</span>${Object.keys(APPN).map((a) => `<label><input type="checkbox" data-btrws="${a}"${S[a] !== false ? ' checked' : ''}> ${APPN[a]}</label>`).join('')}</div>`;
    }
    function verfeinern() {   // externe KI (Kern verfeinern.py): 1. was vorschlagen · 2. was hinausgeht · dann Vorschläge oben in der Liste
      const W = [['luecken', 'Fehlende Bauteile', 'was zur Bauart passt, aber in der Liste fehlt (z. B. Dachentwässerung, Sockel)', true],
        ['aufbau', 'Aufbauten', 'zu Zeilen ohne Aufbau: passender Aufbau aus dem eigenen Baukasten', true],
        ['mengen', 'Mengen prüfen', 'Auffälliges, z. B. Wandfläche zu Bodenfläche', false],
        ['ausstattung', 'Ausstattung je Raumgruppe', 'Aufbau für Bad, Küche und Böden nach üblichem Standard', false]];
      let schritt = 1;
      const html = () => schritt === 1
        ? `<div class="bt-ab"><h3>Verfeinern (extern) – was soll die KI vorschlagen?</h3>${W.map(([k, n, t, an]) => `<label style="display:flex;gap:.5rem;align-items:flex-start"><input type="checkbox" data-btkw="${k}"${an ? ' checked' : ''}><span><b>${n}</b><br><small class="bt-w">${t}</small></span></label>`).join('')}
          <div class="bt-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="kweiter">Weiter …</button></div></div>`
        : `<div class="bt-ab"><h3>Das geht hinaus</h3><p style="margin:0">An die externe KI (wie in der Verwaltung eingestellt), <b>anonymisiert</b>:</p>
          <ul style="margin:0;padding-left:1.2rem"><li>Bauart, Geschosse, Räume nach Art (Bad, Küche …) mit Fläche und Höhe – keine Raumnamen</li><li>die Bauteil-Liste mit Mengen, Maßnahmen und Aufbau</li><li>passende Aufbauten aus dem eigenen Baukasten (nur Namen)</li></ul>
          <p style="margin:0"><b>Nicht:</b> Projektname, Adresse, Personen, Firmen, Preise, Pläne oder Bilder.</p>
          <p class="bt-an" style="margin:0">Kostet je Anfrage, die Antwort ist ungeprüft und steht im Datenschutz-Protokoll. Nichts ändert sich von selbst – jeder Vorschlag wird einzeln übernommen.</p>
          <div class="bt-w" data-btkw2></div><div class="bt-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn" data-m="kzur">Zurück</button><button type="button" class="btn primary" data-m="kgo" data-btkgo>Extern fragen</button></div></div>`;
      let wahl = W.filter((w) => w[3]).map((w) => w[0]);
      modalBox(html(), async (m, bg, close) => {
        const box = bg.querySelector('.modal');
        if (m === 'abbrechen') return close();
        if (m === 'kweiter') { wahl = [...box.querySelectorAll('[data-btkw]:checked')].map((x) => x.dataset.btkw); if (!wahl.length) return sag('Bitte mindestens einen Punkt wählen.', true); schritt = 2; box.innerHTML = html(); }
        else if (m === 'kzur') { schritt = 1; box.innerHTML = html(); box.querySelectorAll('[data-btkw]').forEach((x) => { x.checked = wahl.includes(x.dataset.btkw); }); }
        else if (m === 'kgo') {
          const b = box.querySelector('[data-btkgo]'); b.disabled = true; box.querySelector('[data-btkw2]').textContent = 'Die externe KI arbeitet … (bis etwa eine Minute)';
          try {
            const d = await (await J(`${basis}/verfeinern`, 'POST', { was: wahl })).json();
            Z.rw = { ...Z.rw, vorschlaege: d.vorschlaege }; close(); zeichne();
            sag(d.n ? `${d.n} Vorschl${d.n === 1 ? 'ag' : 'äge'} der externen KI – oben in der Liste, einzeln übernehmen.` : 'Die externe KI hat nichts Neues vorgeschlagen.');
            if (d.n) { const v = el.querySelector('.bt-rw'); if (v) v.scrollIntoView({ block: 'nearest' }); }
          } catch (er) { b.disabled = false; box.querySelector('[data-btkw2]').textContent = er.message; }
        }
      });
    }
    async function rueckweg(hid, wahl) {
      try {
        const d = await (await J(`${basis}/rueckweg/${hid}`, 'POST', { wahl })).json();
        Z.d = { ...Z.d, modell: d.modell, rev: d.rev }; Z.rw = { ...Z.rw, vorschlaege: d.vorschlaege }; delete Z.rwW[hid];
        sag(d.n ? `${d.n} Vorschl${d.n === 1 ? 'ag' : 'äge'} ins Modell übernommen.` : 'Vorschlag abgelehnt.'); zeichne();
      } catch (e) { sag(e.message, true); }
    }

    /* Jede Schicht gleich: Material · Stärke · Ausführung (GO 18.11.2026, Mock „Schicht: Material, Stärke, Ausführung“: MA-A1 B1 C1).
       Der Kern zerlegt die Optionen (bpcore/schicht.py: mat, dicke, ausf je Option; je Schicht Bezeichnung und Liste der Ausführungen, übliche
       Stärken). Hier: Material als Knöpfe, Stärke und Ausführung als Auswahl mit „eigener Wert …“. Gewählt wird die Option mit gleichem
       Material, gleicher Ausführung und der nächsten Stärke; was davon abweicht, steht in der Zeile (dicken, ausf). */
    const dz = (d) => String(d).replace('.', ',');
    function schichtHtml(z, s, i) {
      const j = (z.wahl || [])[i], o = s.optionen[j] || {}, d = (z.dicken || {})[i] || o.dicke, a = (z.ausf || {})[i] || o.ausf || '', mats = [];
      s.optionen.forEach((x, k) => { const m = x.mat ? 'm:' + x.mat : '#' + k; if (!mats.includes(m)) mats.push(m); });
      const chips = mats.map((m) => (m.startsWith('#') ? `<button type="button" data-btop="${i}.${m.slice(1)}" class="${j === +m.slice(1) ? 'on' : ''}" title="${esc(s.optionen[+m.slice(1)].t || '')}">${esc(optName(s.optionen[+m.slice(1)]))}</button>`
        : `<button type="button" data-btmat="${i}" data-mat="${esc(m.slice(2))}" class="${o.mat === m.slice(2) ? 'on' : ''}" title="${esc(s.optionen.filter((x) => x.mat === m.slice(2)).map((x) => x.k).join(' · '))}">${esc(m.slice(2))}</button>`)).join('');
      if (!o.mat) return chips;
      const M = (s.mats || {})[o.mat] || {};   // Angaben des Materials: Ausführung (Bezeichnung, Liste), übliche Stärken
      const st = [...new Set([...(M.staerken || []), ...s.optionen.filter((x) => x.mat === o.mat && x.dicke).map((x) => x.dicke), d].filter(Boolean))].sort((x, y) => x - y);
      const stHtml = d ? `<span class="bt-dkh">Stärke</span><select data-bp-auswahl data-btdk="${i}" title="Stärke – zwischen den Positionen der Datenbank wird der Preis umgerechnet">${st.map((w) => `<option value="${w}"${w === d ? ' selected' : ''}>${dz(w)} cm</option>`).join('')}<option value="eigen">eigener Wert …</option></select>` : '';
      const wl = [...new Set([...(M.werte || []), ...s.optionen.filter((x) => x.mat === o.mat && x.ausf).map((x) => x.ausf), a].filter(Boolean))];
      const auHtml = M.ausf ? `<span class="bt-dkh">${esc(M.ausf)}</span><select data-bp-auswahl data-btau="${i}" title="Ausführung – steht im Text der Positionen, der Preis bleibt">${a ? '' : '<option value="" selected>–</option>'}${wl.map((w) => `<option value="${esc(w)}"${w === a ? ' selected' : ''}>${esc(w)}</option>`).join('')}<option value="eigen">eigener Wert …</option></select>` : '';
      const hin = (z.dicken || {})[i] ? 'Preis aus den Nachbardicken umgerechnet' : (z.ausf || {})[i] ? 'eigene Ausführung – Preis wie die Option' : '';
      return `${chips}${stHtml}${auHtml}${hin ? `<small class="bt-dkh">${hin}</small>` : ''}`;
    }
    function schichtSetzen(id, i, mat, d, a) {   // → wahl, dicken, ausf: passende Option; Abweichungen nur, wenn sie von der Option abweichen
      const z = L().zeilen.find((x) => x.id === id), s = Z.vl && Z.vl.schichten[i]; if (!z || !s) return;
      const O = s.optionen.map((x, k) => [k, x]).filter(([, x]) => x.mat === mat); if (!O.length) return;
      const wert = ([, x]) => (a && x.ausf !== a ? 1000 : 0) + Math.abs((x.dicke || 0) - (d || x.dicke || 0));
      const [k, o] = O.reduce((p, q) => (wert(q) < wert(p) ? q : p));
      const w = [...(z.wahl || [])]; w[i] = k;
      const dk = { ...(z.dicken || {}) }; if (!d || o.dicke === d) delete dk[i]; else dk[i] = d;
      const au = { ...(z.ausf || {}) }; if (!a || o.ausf === a) delete au[i]; else au[i] = a;
      return zeile(id, { wahl: w, dicken: dk, ausf: au });
    }
    /* Vorlagen in Blöcken (GO 18.11.2026, Mock „Vorlagen in Blöcken“: BL-A1 B1 C1): je 3. Ebene der DIN 276 ein Block; offen ist der Block
       der Zeile (bei Wänden tragend und nichttragend zusammen), die anderen zugeklappt darunter. Vorlagen nur für Vorhandenes (Kern: bestand)
       fehlen bei „neu“ und stehen sonst als Block „Bestand“ oben. Der Knopf wiederholt den Block nicht („IW tragend …“ → „…“). */
    const PAAR = { 331: [332], 332: [331], 341: [342], 342: [341] };
    const kurzName = (n) => { const x = String(n || '').replace(/^(?:Nichttragende\s+)?(?:IW|AW)\s+(?:(?:nicht)?tragend\s+)?/i, ''); return x ? x[0].toUpperCase() + x.slice(1) : n; };
    // Option ohne Kurzname: mit Leistung = Regelausführung („Standard“, z. B. Deckenschalung bis 3 m), ohne Leistung = „ohne“ (19.11.2026)
    const optName = (o) => o.k || (o.t ? 'Standard' : 'ohne');
    // Bauteile, die in der KG stehen, aber nicht zur Zeile passen: in einer Decke keine Treppen, Unterzüge, Träger (19.11.2026)
    const passt = (z, x) => !(/decke|platte/i.test(`${z.art} ${z.name}`) && !/trepp/i.test(`${z.art} ${z.name}`) && /trepp|unterzug|träger/i.test(x.name));
    function bloeckeHtml(z, V) {
      const k3 = String(z.kg || '').slice(0, 3), offen = new Set([k3, ...(PAAR[k3] || []).map(String)]), st = z.status || '';
      const gew = V.find((x) => x.id === z.vorlage); if (gew) offen.add(gew.bestand && st !== 'neu' ? '_b' : String(gew.kg).slice(0, 3));
      const B = new Map(), knopf = (x) => `<button type="button" data-btvl="${esc(x.id)}" class="${x.id === z.vorlage ? 'on' : ''}" title="${esc(x.kg + ' ' + x.name)}">${esc(kurzName(x.name))}</button>`;
      for (const x of V) {
        if (x.id !== z.vorlage && ((x.bestand && st === 'neu') || !passt(z, x))) continue;
        const k = x.bestand && st !== 'neu' ? '_b' : String(x.kg).slice(0, 3);
        if (!B.has(k)) B.set(k, { n: k === '_b' ? 'Bestand' : `${k} · ${x.block || ''}`, L: [] }); B.get(k).L.push(x);
      }
      if (['bleibt', 'instandsetzen', 'erneuern', 'abbruch'].includes(st)) offen.add('_b');
      const ord = [...B.keys()].sort((a, b) => (b === '_b') - (a === '_b') || offen.has(b) - offen.has(a) || a.localeCompare(b));
      // kompakt (20.11.2026): ist eine Vorlage gewählt, steht nur sie da – „ändern“ klappt die Auswahl auf; dort die Blöcke der Zeile offen,
      // die übrigen Kostengruppen in EINER Zeile „weitere Kostengruppen“ (nichts geht verloren, alles einen Klick weiter)
      if (gew && Z.vlAuf !== z.id) return `<div class="bt-vbl"><span class="bt-bln">Vorlage</span><div class="bt-o"><button type="button" class="on" data-btvlauf title="${esc(gew.kg + ' ' + gew.name)}">${esc(kurzName(gew.name))}</button><button type="button" class="bt-vlw" data-btvlauf>andere Vorlage …</button></div></div>`;
      const blk = (k) => { const b = B.get(k); return `<details class="bt-blk" data-btblk="${esc(k)}"${(k in Z.blk ? Z.blk[k] : offen.has(k)) ? ' open' : ''}><summary>${esc(b.n)} <small>${b.L.length}</small></summary><div class="bt-o">${b.L.map(knopf).join('')}</div></details>`; };
      const vorn = ord.filter((k) => offen.has(k)), rest = ord.filter((k) => !offen.has(k));
      return `<div class="bt-vbl"><span class="bt-bln">Vorlage</span><div>${(vorn.length ? vorn : rest.splice(0, 1)).map(blk).join('')}${rest.length ? `<details class="bt-blk bt-weitere" data-btblk="_weitere"${Z.blk._weitere ? ' open' : ''}><summary>weitere Kostengruppen <small>${rest.length}</small></summary>${rest.map(blk).join('')}</details>` : ''}${gew ? '<div class="bt-o"><button type="button" class="bt-vlw" data-btvlauf>zuklappen</button></div>' : ''}</div></div>`;
    }
    /* Aufbau-Editor: sind die Vorlagen schon da, steht er gleich mit in der Zeile (kein „wird geladen“ dazwischen – sonst springt die Seite bei jeder Wahl, 20.11.2026) */
    function editorSofort(z) { const kg = Z.kg[z.id] || z.kg, V = Z.vorlD[String(kg || '').slice(0, 2)]; return V ? editorHtml(z, kg, V) : ''; }
    async function editor(neu) {
      const sel = `[data-btz="${CSS.escape(Z.auf || '')}"] .bt-e`, z = L().zeilen.find((x) => x.id === Z.auf);
      const B = [Z.det, Z.pop && Z.pop.isConnected ? Z.pop : null, el].map((x) => x && x.querySelector(sel)).filter(Boolean).filter((b) => neu || b.querySelector('.bt-w'));   // rechts, Fenster, Zeile – nur, was noch nicht gefüllt ist (editorSofort)
      if (!z || !B.length) return;
      let V;
      const kg = Z.kg[z.id] || z.kg;
      try { V = await vorlagen(kg); } catch (e) { B.forEach((b) => { b.innerHTML = `<div class="bt-w">${esc(e.message)}</div>`; }); return; }
      B.forEach((b) => { b.innerHTML = editorHtml(z, kg, V); });
    }
    /* Suche nach dem Aufbau (GO 21.11.2026, Mock „Baukasten wie 3D“ F1): ganz oben im Editor – findet Vorlagen, Optionen in den Schichten
       (Material, Kurzname, Text) und Kürzel aus dem Plan (PP, KS, HLz, WDVS … – Liste des Kerns, bpcore/kuerzel.py). Ein Treffer setzt Vorlage
       und Option zusammen; bei mehreren gewählten Zeilen gilt er für alle (zeile() → mwAendern). */
    const falt = (t) => String(t || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    let KZL = null;
    const kzl = () => KZL || (KZL = J('api/bp/modell/kuerzel').then((r) => r.json()).then((d) => { const M = {}; (d.kern || []).concat(d.lage || []).forEach(([k, n]) => { M[falt(k)] = falt(n).replace(/\s*\(.*$/, ''); }); return M; }).catch(() => ({})));
    /* Aufbau-Suche (21.11.2026 überarbeitet – „KS 17,5“ oder „Kalksandstein WDVS“ fand nichts): die Eingabe zerfällt in Wörter, JEDES Wort muss im
       Aufbau vorkommen (Vorlage, Schicht, Option, Material); Kürzel je Wort (KS → Kalksandstein), Zahlen mit Komma oder Punkt; sortiert nach Güte. */
    function suchTreffer(z, V, q, K) {
      const zahl = (t) => t.replace(/(\d),(\d)/g, '$1.$2'), norm = (t) => zahl(falt(t));
      const W = norm(q).trim().split(/\s+/).filter(Boolean); if (W.join('').length < 2) return [];
      const A = W.map((w) => [...new Set([w, K[w] && zahl(K[w])].filter(Boolean))]);   // je Wort: das Wort oder die Bedeutung des Kürzels
      const in_ = (t, i) => A[i].some((x) => t.includes(x)), st = z.status || '', T = [];
      for (const v of V) {
        if ((v.bestand && st === 'neu') || !passt(z, v)) continue;
        const vn = norm(`${v.name} ${v.kg || ''}`), S = (v.schichten || []).map((s) => ({ n: norm(s.name), o: s.optionen.map((o) => norm(`${o.k} ${o.mat || ''} ${o.t || ''}`)) }));
        const std = S.map((s, i) => s.o[Math.max(0, v.schichten[i].optionen.findIndex((o) => o.std))] || '').join(' ');
        if (W.every((_, i) => in_(vn, i) || in_(std, i))) T.push({ v, t: kurzName(v.name), u: 'Vorlage', g: W.reduce((g, _, i) => g + (in_(vn, i) ? 3 : 1), 1) });
        S.forEach((s, si) => s.o.forEach((ot, oi) => {
          if (!W.every((_, i) => in_(ot, i) || in_(s.n, i) || in_(vn, i))) return;
          const g = W.reduce((g2, _, i) => g2 + (in_(ot, i) ? 3 : in_(vn, i) ? 2 : 1), 0); if (!W.some((_, i) => in_(ot, i))) return;   // die Option selbst muss etwas treffen
          const o = v.schichten[si].optionen[oi];
          T.push({ v, si, oi, t: `${kurzName(v.name)} · ${v.schichten[si].name}: ${optName(o)}`, u: W.some((w) => K[w]) ? `Kürzel ${q.trim().toUpperCase()}` : 'Option in der Schicht', g });
        }));
      }
      return T.sort((a, b) => b.g - a.g).slice(0, 12);
    }
    async function suchen(e) {
      const i = e.target.closest && e.target.closest('[data-btsuch]'); if (!i) return;
      const r = i.closest('[data-btz]'), z = r && L().zeilen.find((x) => x.id === r.dataset.btz), box = i.parentElement.querySelector('.bt-vs'); if (!z || !box) return;
      const k2 = String(Z.kg[z.id] || z.kg || '').slice(0, 2); if (!Z.vorlD[k2] && k2) { try { await vorlagen(k2); } catch { /* ohne */ } }   // erst laden, dann suchen (vorher „nichts gefunden“)
      const V = Z.vorlD[k2] || [], K = await kzl();
      if (!i.isConnected) return; const T = suchTreffer(z, V, i.value, K); Z.tr = T;   // nach dem Warten mit dem Text von jetzt
      box.innerHTML = T.map((x, k) => `<button type="button" data-btvs="${k}"${k ? '' : ' class="on"'}>${esc(x.t)}<small>${esc(x.u)}</small></button>`).join('') || (i.value.trim().length > 1 ? '<span class="mute" style="padding:.3rem .55rem">nichts gefunden</span>' : '');
    }
    function suchWahl(id, x) {   // Vorlage und Option zusammen – die übrigen Schichten in der Regelausführung
      const wahl = (x.v.schichten || []).map((s, i) => (i === x.si ? x.oi : Math.max(0, s.optionen.findIndex((o) => o.std))));
      Z.vlAuf = null; return zeile(id, { vorlage: x.v.id, wahl, dicken: {}, ausf: {} });
    }
    /* Kurzwahl der Aufbauten je Büro (GN-B, F6-A – 22.11.2026): Knöpfe über der Suche, Kern bpcore/kurzwahl.py; geladen erst mit dem ersten Editor */
    const KWG = { 331: 'AW', 332: 'AW', 341: 'IW', 342: 'IW', 322: 'BP', 324: 'BP', 325: 'BP', 351: 'DE', 352: 'DE', 361: 'DA', 362: 'DA', 363: 'DA', 364: 'DA', 335: 'AB', 336: 'WI', 345: 'WI', 353: 'BO', 354: 'DB', 344: 'TI' };
    const kwGruppe = (z) => (z.typ ? z.typ.split('-')[0] : String(z.kg || '').slice(0, 3) === '334' ? (/Fenster/.test(z.art || '') ? 'FE' : 'TA') : KWG[String(z.kg || '').slice(0, 3)] || '');
    const kwSchl = (e) => JSON.stringify([e.vorlage || '', e.wahl || [], Object.entries(e.dicken || {}).sort(), Object.entries(e.ausf || {}).sort()]);
    function kwHtml(z) {
      if (HAND.includes(z.bereich)) return '';
      if (!Z.kwP) Z.kwP = J('api/bp/modell/kurzwahl').then((r) => r.json()).then((d) => { Z.kw = d; detailsZeichnen(); }, () => { Z.kw = {}; });
      const g = kwGruppe(z), K = Z.kw && Z.kw[g]; if (!K || !K.eintraege.length) return '';
      const jetzt = z.vorlage ? kwSchl(z) : '', drin = K.quelle === 'buero' && K.eintraege.some((e) => kwSchl(e) === jetzt);
      return `<div class="bt-kw"><span class="bt-h">Kurzwahl ${esc(K.name)}${K.quelle === 'auto' ? ' <small title="Noch keine Liste des Büros – die meistbenutzten Aufbauten aller Projekte">· meistbenutzt</small>' : ''}</span>
        ${K.eintraege.map((e, i) => `<button type="button" class="bt-chip${kwSchl(e) === jetzt ? ' on' : ''}" data-btkw="${i}" title="${esc(e.kurz)}">${esc(e.kurz.length > 44 ? e.kurz.slice(0, 42) + ' …' : e.kurz)}</button>`).join('')}
        ${jetzt && !drin ? '<button type="button" class="bt-chip bt-kwp" data-btkwplus title="Diesen Aufbau in die Kurzwahl des Büros aufnehmen">＋ in die Kurzwahl</button>' : ''}</div>`;
    }
    async function kwPlus(z) {
      const g = kwGruppe(z), K = (Z.kw || {})[g] || { eintraege: [] }, E = K.eintraege.concat([{ vorlage: z.vorlage, wahl: z.wahl, dicken: z.dicken, ausf: z.ausf, kurz: z.kurz }]);
      try { Z.kw = await (await J('api/bp/modell/kurzwahl', 'PUT', { gruppe: g, eintraege: E })).json(); detailsZeichnen(); sag(`In der Kurzwahl ${Z.kw[g] ? Z.kw[g].name : g}.`); } catch (e) { sag(e.message, true); }
    }
    function editorHtml(z, kg, V) {
      const v = V.find((x) => x.id === z.vorlage);
      Z.vl = v;
      return `${kwHtml(z)}<div class="bt-such"><input data-btsuch placeholder="Aufbau suchen: Vorlage, Material oder Kürzel (PP, KS, WDVS …)" aria-label="Aufbau suchen" autocomplete="off"><div class="bt-vs"></div></div>${HAND.includes(z.bereich) ? `<div class="bt-o"><span>Kostengruppe</span>${KG2.map(([k, t]) => `<button type="button" data-btkg="${k}" class="${String(kg).startsWith(k) ? 'on' : ''}">${k}0 ${esc(t)}</button>`).join('')}</div>` : ''}${bloeckeHtml(z, V)}
        ${v ? v.schichten.map((s, i) => `<div class="bt-o"><span>${esc(s.name)}</span>${s.gl ? schichtHtml(z, s, i) : s.optionen.map((o, j) => `<button type="button" data-btop="${i}.${j}" class="${(z.wahl || [])[i] === j ? 'on' : ''}" title="${esc(o.t)}">${esc(optName(o))}</button>`).join('')}</div>`).join('') : ''}`;
    }

    const blkMerk = (e) => { const d = e.target; if (d && d.dataset && d.dataset.btblk) Z.blk[d.dataset.btblk] = d.open; };   // auf-/zugeklappte Vorlagen-Blöcke bleiben beim Neuzeichnen so
    el.addEventListener('toggle', blkMerk, true);
    const klick = async (e) => {
      const t = e.target, r = t.closest('[data-btz]'), id = r && r.dataset.btz;
      if (opt.baum && t.closest('[data-btrwzeig]')) { Z.sel = '__rw'; Z.auf = null; zeichne(); if (opt.auswahl) opt.auswahl(null); return; }
      const eR = opt.baum && t.closest('tr[data-bte]');
      if (eR && !t.closest('input,button,[data-zu]')) {   // einzelnes Bauteil: nur dieses wählen (auch im 3D)
        if (Z.mw.length) { Z.mw = []; if (opt.mehr) opt.mehr([]); } Z.sel = Z.auf = id; Z.selE = +eR.dataset.bte; zeichne();
        if (opt.element) opt.element(Z.selE); return; }
      if (t.closest('[data-btmw]') && id) return mwUm(id, true);
      const gw = t.closest('[data-btgw]'); if (gw) {   // US-3 A: alle der Gruppe dazu bzw. (alle schon gewählt) wieder heraus
        const I = Z.grpIds[gw.dataset.btgw] || [], A = new Set(Z.mw.length ? Z.mw : Z.sel && Z.sel !== '__rw' ? [Z.sel] : []), alle = I.every((x) => A.has(x));
        I.forEach((x) => (alle ? A.delete(x) : A.add(x))); Z.selG = gw.dataset.btgw; if (!A.size) Z.sel = Z.auf = null; return mwSetzen([...A]); }
      { const bh = t.closest('tr.bt-bh[data-btgk]'); Z.selG = bh ? bh.dataset.btgk : null; }   // zuletzt angeklickte Gruppe: Ziel für Strg+V
      if (t.closest('[data-btschnell]') && id) {   // E3: schnelle Aufbau-Wahl in der Zeile; im Gebäudemodell darunter die einzelnen Bauteile
        const auf = Z.schnell === id || Z.elAuf === id; Z.schnell = auf ? null : id; Z.elAuf = auf ? null : id; Z.sel = Z.auf = id; return zeichne(); }
      if (t.closest('[data-btpop]') && id) return eigenschaften(id);
      if (t.closest('[data-btber]') && id && !Z.an) { const z = L().zeilen.find((x) => x.id === id); if (z) zeile(id, { berechnen: !z.berechnen }); return; }
      const bg = t.closest('[data-btberg]'); if (bg && !Z.an) {   // derselbe Schalter an der Gruppe: für alle Zeilen darin (ohne offene)
        const R = (Z.grpIds[bg.dataset.btberg] || []).map((x) => L().zeilen.find((y) => y.id === x)).filter((z) => z && z.status !== 'offen');
        if (R.length) mwAendern({ berechnen: !R.every((z) => z.berechnen) }, R); return; }
      if (opt.baum && r && r.tagName === 'TR' && (e.ctrlKey || e.metaKey) && !t.closest('[data-zu],input,button')) return mwUm(id, true);
      if (t.closest('[data-btmwweg]')) return mwSetzen([]);
      if (t.closest('[data-btmwart]') && opt.artJe) {   // Art je Bauteil für mehrere: im 3D gewählte Bauteile dieser Zeilen, sonst alle der Zeilen
        const R = mwZ(), alle = R.flatMap((z) => z.ids || []), e3 = (opt.e3 ? opt.e3() : []).filter((i) => alle.includes(i));
        return pickMenu(t.closest('[data-btmwart]'), { items: artWahl(R[0]).map(([k, n]) => ({ value: k, title: n })), onPick: (v) => opt.artJe(e3.length ? e3 : alle, v) });
      }
      if (t.closest('[data-btmwst]')) return mwAendern({ status: t.closest('[data-btmwst]').dataset.btmwst });
      if (opt.baum && r && r.tagName === 'TR' && !t.closest('[data-zu],input,button')) {
        const eins = () => { if (Z.mw.length) { Z.mw = []; if (opt.mehr) opt.mehr([]); } Z.sel = id; Z.auf = id; Z.selE = null; zeichne(); if (opt.auswahl) opt.auswahl(L().zeilen.find((x) => x.id === id)); };
        clearTimeout(Z.klT);
        if (Z.mw.length > 1 && Z.mw.includes(id) && e.detail === 1) { Z.klT = setTimeout(eins, 300); return; }   // gehört zur Auswahl: erst sehen, ob ein Doppelklick folgt (der öffnet die Eigenschaften aller gewählten)
        return eins(); }
      if (t.closest('[data-btlesen]')) return einlesen();
      if (t.closest('[data-btanfang]')) return anfang();
      if (t.closest('[data-btplan]')) return planungNeu();
      if (t.closest('[data-btplanung]')) { if (window.seiteReiterVon && seiteReiterVon(el, 'planung')) return; sag('Die Planung steht im Reiter „Planung“ rechts.'); return; }
      if (t.closest('[data-btki]')) return verfeinern();
      if (t.closest('[data-btzurueck]')) return ansehen(null);
      if (t.closest('[data-btgilt]') && Z.an) return aendern(Z.an.id, { zurueckholen: true }, ZURUECK);
      if (t.closest('[data-btweg-alle]')) {
        if (!(await bpFrage('Alle Zeilen entfernen, die im gültigen Planstand nicht mehr vorkommen? Ihre Maßnahmen gehen dabei verloren.', { ok: 'Aufräumen' }))) return;
        try { const d = await (await J(`${basis}/bauteile/aufraeumen`, 'POST', {})).json(); neu(d); sag(`${d.entfernt} Zeilen entfernt.`); zeichne(); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-btstart]')) {   // Standardbaum ohne Plan: Fragen beantworten → Planstand „Von Hand“ mit den Fragen (Kern: von_hand_anfangen)
        try { neu(await (await J(`${basis}/bauteile/hand`, 'POST', { nur_start: true })).json()); zeichne(); sag('Planstand „Von Hand“ angelegt – die Fragen stehen jetzt in der Liste.'); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-bthand]')) {
        const hk = t.closest('[data-bthand]'), g = hk.dataset.gruppe ? ` – ${hk.dataset.gruppe}` : '';
        const n = await handDialog(g.slice(3)); if (!n) return;   // Name, Menge, Einheit (B1, 20.11.2026)
        try { neu(await (await J(`${basis}/bauteile/hand`, 'POST', { ...n, kg: hk.dataset.kg || '' })).json()); const L2 = L().zeilen; Z.sel = Z.auf = L2.length ? L2[L2.length - 1].id : null; zeichne(); if (opt.auswahl) opt.auswahl(L2[L2.length - 1]); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-btaus]')) {
        const Q = G().quelle || {};
        return ausgeben(Q.pfad ? { quelle: 'server', pfad: Q.pfad } : {});   // Datei aus „Pläne & Dateien“ oder die beim Einlesen gespeicherte
      }
      const rw = t.closest('[data-btrw]'); if (rw) { (Z.rwW[rw.dataset.btrw] ||= {})[rw.dataset.i] = rw.dataset.w; return zeichne(); }
      if (t.closest('[data-btrwok]')) { const h = t.closest('[data-btrwok]').dataset.btrwok; return rueckweg(+h, Z.rwW[h] || {}); }
      if (t.closest('[data-btrwab]')) return rueckweg(+t.closest('[data-btrwab]').dataset.btrwab, {});
      if (t.closest('[data-btzeichner]')) return zeichnerZeigen();
      if (t.closest('[data-btteil]')) { Z.teil = t.closest('[data-btteil]').dataset.btteil; return zeichne(); }
      if (!id) return;
      const z = L().zeilen.find((x) => x.id === id);
      if (t.closest('[data-btst]')) return zeile(id, { status: t.closest('[data-btst]').dataset.btst });
      if (t.closest('[data-btauf]')) { Z.auf = Z.auf === id ? null : id; return zeichne(); }
      if (t.closest('[data-btbest]') && id) return zeile(id, { bestaetigt: true });
      if (t.closest('[data-btwie]') && id) {
        const z = L().zeilen.find((x) => x.id === id), A = L().zeilen.filter((x) => x.id !== id && x.vorlage && !x.entfaellt && (x.kg || '').slice(0, 2) === (z.kg || '').slice(0, 2));
        if (!A.length) return sag('Keine andere Zeile mit Aufbau in dieser Gruppe.');
        return pickMenu(t.closest('[data-btwie]'), { items: A.map((x) => ({ value: x.id, title: `${x.kuerzel ? '„' + x.kuerzel + '“' : x.name} – ${x.kurz}` })), onPick: (v) => zeile(id, { wie: v }) });
      }
      if (t.closest('[data-btkw]') && z) { const e = ((Z.kw || {})[kwGruppe(z)] || { eintraege: [] }).eintraege[+t.closest('[data-btkw]').dataset.btkw]; if (e) { Z.vlAuf = null; return zeile(id, { vorlage: e.vorlage, wahl: [...(e.wahl || [])], dicken: e.dicken || {}, ausf: e.ausf || {} }); } }
      if (t.closest('[data-btkwplus]') && z) return kwPlus(z);
      if (t.closest('[data-btvs]') && Z.tr) { const x = Z.tr[+t.closest('[data-btvs]').dataset.btvs]; if (x) return suchWahl(id, x); }
      if (t.closest('[data-btvlauf]')) { Z.vlAuf = Z.vlAuf === id ? null : id; return editor(true); }
      if (t.closest('[data-btkg]')) { Z.kg[id] = t.closest('[data-btkg]').dataset.btkg + '0'; return editor(true); }
      if (t.closest('[data-btweg]')) return handWeg(id);
      if (t.closest('[data-btart]') && z) return pickMenu(t.closest('[data-btart]'), { items: artWahl(z).map(([k, n]) => ({ value: k, title: n + (k === z.kg ? ' ✓' : '') })), onPick: (v) => {   // gleiche Art = bestätigt (Hinweis weg)
        if (!opt.artJe || !(z.ids || []).length || !(L().quelle || {}).planstand || ((L().quelle || {}).art || 'ifc') !== 'ifc') return zeile(id, { kg: v });
        const e3 = (opt.e3 ? opt.e3() : []).filter((i) => z.ids.includes(i));   // im 3D gewählte Bauteile dieser Zeile – sonst alle der Zeile (22.11.2026: Art je Bauteil)
        return opt.artJe(e3.length ? e3 : z.ids, v); } });
      if (t.closest('[data-bteh]') && z) return pickMenu(t.closest('[data-bteh]'), { items: EINHEITEN.map((e) => ({ value: e, title: e })), onPick: (v) => (v === z.einheit ? null : zeile(id, { einheit: v })) });
      if (t.closest('[data-btvl]')) {   // Zeile von Hand mit gewählter Einheit: rechnet der Aufbau anders, fragt die Zeile nach (B1)
        Z.vlAuf = null;   // gewählt: Auswahl klappt wieder zu
        const vid = t.closest('[data-btvl]').dataset.btvl, v = z && z.bereich === 'hand' && z.einheit_hand ? ((await vorlagen(Z.kg[id] || z.kg)) || []).find((x) => x.id === vid) : null;
        if (v && v.einheit && v.einheit !== z.einheit) { const r = await bpFrage(`Der Aufbau „${v.name}“ rechnet in ${v.einheit}, die Zeile in ${z.einheit}.`, { ok: `Auf ${v.einheit} umstellen`, drei: `${z.einheit} behalten`, abbrechen: 'Abbrechen' });
          return r === true || r === 'drei' ? zeile(id, { vorlage: vid, einheit: r === true ? v.einheit : z.einheit }) : null; }
        return zeile(id, { vorlage: vid });
      }
      if (t.closest('[data-btmat]') && z) { const b = t.closest('[data-btmat]'), i = +b.dataset.btmat, s = Z.vl && Z.vl.schichten[i], o = s && s.optionen[(z.wahl || [])[i]], gl = o && o.mat === b.dataset.mat;
        return schichtSetzen(id, i, b.dataset.mat, gl ? (z.dicken || {})[i] || o.dicke : (o && ((z.dicken || {})[i] || o.dicke)), gl ? (z.ausf || {})[i] || o.ausf : ''); }   // anderes Material: Stärke behalten, Ausführung der Option
      if (t.closest('[data-btop]') && z) { const [i, j] = t.closest('[data-btop]').dataset.btop.split('.').map(Number); const w = [...(z.wahl || [])]; w[i] = j; return zeile(id, { wahl: w }); }
    };
    el.onclick = klick;
    const wechsel = async (e) => {
      const t = e.target;
      if (t.matches('[data-btrws]')) {
        try { const d = await (await J(`${basis}/rueckweg/schalter`, 'PUT', { [t.dataset.btrws]: t.checked })).json(); Z.rw = { ...Z.rw, schalter: d.schalter }; Z.d = await (await J(basis)).json();
          sag(t.checked ? `${APPN[t.dataset.btrws]}: Änderungen kommen als Vorschlag ins Modell.` : `${APPN[t.dataset.btrws]}: Änderungen bleiben in der App.`); } catch (er) { sag(er.message, true); t.checked = !t.checked; }
        return;
      }
      if (t.matches('[data-btdk]') || t.matches('[data-btau]')) {   // Stärke oder Ausführung: Liste oder eigener Wert
        const id = t.closest('[data-btz]').dataset.btz, i = +(t.dataset.btdk ?? t.dataset.btau), z = L().zeilen.find((x) => x.id === id), s = Z.vl && Z.vl.schichten[i], o = s && z && s.optionen[(z.wahl || [])[i]];
        if (!o) return;
        let d = (z.dicken || {})[i] || o.dicke, a = (z.ausf || {})[i] || o.ausf || '';
        if (t.matches('[data-btdk]')) {
          d = parseFloat(t.value);
          if (t.value === 'eigen') {
            const e = window.bpEingabe ? await bpEingabe('Stärke in cm (0,5 bis 60, halbe cm möglich)', dz((z.dicken || {})[i] || o.dicke)) : null;
            d = Math.round(parseFloat(String(e || '').replace(',', '.')) * 2) / 2;
            if (!(d >= 0.5 && d <= 60)) { if (e) sag('Bitte eine Stärke von 0,5 bis 60 cm.', true); return editor(true); }
          }
        } else {
          a = t.value;
          if (a === 'eigen') {
            const e = window.bpEingabe ? await bpEingabe(`${((s.mats || {})[o.mat] || {}).ausf || 'Ausführung'} – eigener Wert (wird fürs Büro gemerkt)`, (z.ausf || {})[i] || o.ausf || '') : null;
            a = String(e || '').trim().slice(0, 40); if (!a) return editor(true);
          }
        }
        return schichtSetzen(id, i, o.mat, d, a);
      }
      if (t.matches('[data-btmwvl]') && t.value) return mwAendern({ vorlage: t.value });
      if (t.matches('[data-btmwber]')) return mwAendern({ berechnen: t.checked });
      if (t.matches('[data-btname]')) { const n = String(t.value).trim(), z0 = L().zeilen.find((x) => x.id === t.closest('[data-btz]').dataset.btz); if (!n || !z0 || n === z0.name) { if (z0) t.value = z0.name; return; } return zeile(z0.id, { name: n }); }
      if (t.matches('[data-btmenge]')) return zeile(t.closest('[data-btz]').dataset.btz, { menge: parseFloat(String(t.value).replace(/\./g, '').replace(',', '.')) || 0 });
      if (!t.matches('[data-btdatei]') || !t.files[0]) return;
      const f = t.files[0], aus = Z.ausgabe; Z.ausgabe = false; t.value = '';
      const fd = new FormData(); fd.append('datei', f, f.name);
      if (aus) return ausgeben(fd);
      lesen(fd);
    };
    el.onchange = wechsel;
    const suchTaste = (e) => { const i = e.target.closest && e.target.closest('[data-btsuch]'); if (!i || e.key !== 'Enter') return; e.preventDefault(); const b = i.parentElement.querySelector('[data-btvs]'); if (b) b.click(); };
    el.addEventListener('input', suchen); el.addEventListener('keydown', suchTaste);
    function ifcDa(Q) { return !!Q.planstand && (Q.art || 'ifc') === 'ifc'; }   // IFC ausgeben nur mit gültigem IFC-Planstand (sonst gibt es keine Datei)
    async function ausgeben(was) {
      if (Z.laeuft) return; Z.laeuft = true;
      const stop = warte('IFC wird geschrieben …');
      try {
        const r = await J(`${basis}/bauteile/ifc`, 'POST', was), b = await r.blob();
        const m = /filename\*=UTF-8''([^;]+)/.exec(r.headers.get('Content-Disposition') || ''), a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = m ? decodeURIComponent(m[1]) : 'modell-massnahmen.ifc'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        sag('IFC mit Maßnahmen erstellt – Nummern, Status und Aufbau stehen in den Bauteilen.');
      } catch (er) {
        if (er.status === 409 && !(was instanceof FormData)) { sag(er.message); Z.ausgabe = true; const f = el.querySelector('[data-btdatei]'); if (f) f.click(); }   // älterer Planstand ohne gespeicherte Datei
        else sag(er.message, true);
      } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    }
    /* Baumtabelle (Gebäudemodell, GO 16.11.2026 „wie alle Apps“): Bereich → Zeile → aus Anweisungen abgeleitete Zeile; Antwort, Aufbau und
       Optionen rechts unter „Details“ (details(box)); die Knöpfe stehen in der Befehlsleiste der App (api unten). */
    const KL = window.bpBaum ? bpBaum.klapp({ key: 'gm.bauteile.' + pid }) : null;
    const ganzVerteilt = (z) => z.menge_basis != null && !z.anzahl && z.verteilt;
    const ort = (z) => z.bereich !== 'hand' ? z.bereich : /^3[2-6]/.test(z.kg || '') ? 'rohbau' : /^41/.test(z.kg || '') ? 'ausbau' : 'hand';   // „＋ Zeile“ in einer Gruppe: die Zeile steht dort
    const artVon = (z) => { if (ort(z) === 'rohbau') { const g = ROHG.find((x) => x[3](z)); return g ? g[1] : 'Sonstiges'; } return (BEREICH.find(([b]) => b === ort(z)) || [, 'Sonstiges'])[1]; };
    const wert = (z, k) => (GX[k] ? GX[k][1](z) : k === 'bereich' ? (BEREICH.find(([b]) => b === ort(z)) || [, 'Sonstiges'])[1] : k === 'teil' ? z.teil || 'ohne Gebäudeteil' : k === 'art' ? artVon(z)
      : k === 'aufbau' ? z.kurz || 'ohne Aufbau' : k === 'mat' ? material(z) || 'Material offen' : k === 'typ' ? typName(z.typ) : (z.bereich === 'frage' ? WORT_FRAGE : WORT)[z.status] || z.status || '–');
    function baumZeichnen() {
      const Li = L(), [ZZ, tw] = teilFilter((Li.zeilen || []).filter((z) => !ganzVerteilt(z) && (!opt.filter || opt.filter(z)))), nRw = opt.filter ? 0 : ((Z.rw && Z.rw.vorschlaege) || []).length, leer = !ZZ.length;
      const an = Z.an ? `<div class="bt-an"><span>Du siehst die Version <b>${esc(Z.an.name)}</b> – nur zum Ansehen. Gegenüber dem Arbeitsstand: ${Z.an.abgleich.neu.length} neu · ${Z.an.abgleich.geaendert.length} geändert · ${Z.an.abgleich.entfaellt.length} entfällt.</span>
        <button type="button" class="btn" data-btzurueck>Zurück zum Arbeitsstand</button><button type="button" class="btn primary" data-btgilt>Als Arbeitsstand zurückholen</button></div>` : '';
      const rwl = nRw && !Z.an ? `<div class="bt-rwl"><span>${nRw} Vorschl${nRw === 1 ? 'ag' : 'äge'} fürs Modell (aus den Apps${(Z.rw.vorschlaege || []).some((h) => h.daten && h.daten.extern) ? ' und der externen KI' : ''})</span><button type="button" class="btn sm" data-btrwzeig>ansehen</button></div>` : '';
      const nZ = !Z.an && Li.zeilen && !opt.filter ? zeichnerListe().length : 0;
      const zl = nZ ? `<div class="bt-rwl"><span>${nZ} Hinweis${nZ === 1 ? '' : 'e'} an den Zeichner (Plan und Modell weichen ab, Kürzel fehlen)</span><button type="button" class="btn sm" data-btzeichner>ansehen</button></div>` : '';
      /* Einzelne Bauteile unter einer Zeile (22.11.2026, „einzelne Wände sehe ich links gar nicht“): nur mit opt.einzeln (Gebäudemodell) – je Bauteil
         eine Zeile mit Geschoss, Himmelsrichtung, Menge; Klick wählt nur dieses Bauteil (auch im 3D), im 3D angeklickt → genau diese Zeile */
      const elZeilen = (z, t, nur) => {
        const I = nur || z.ids || [], je = z.je || {}, rj = z.rj || {}, RN = { N: 'Nord', O: 'Ost', S: 'Süd', W: 'West' };
        const zz = I.slice(0, 300).map((i) => { const k = (z.ids || []).indexOf(i), nr = (z.nummern || [])[k] || '', inf = elInfo(i);
          const lab = [nr && !/^\d+$/.test(nr) ? nr : '', inf.g, RN[rj[i]] || ''].filter(Boolean).join(' · ') || `Bauteil ${k + 1}`;
          return `<tr class="bt-el${Z.selE === i ? ' akt' : ''}" data-btz="${esc(z.id)}" data-bte="${i}">${bpBaum.zelle({ tiefe: t + 1, html: `<span class="bt-tn">${esc(lab)}</span>` })}<td class="r">${je[i] != null ? `${zahl(je[i])}&nbsp;${esc(z.einheit)}` : ''}</td><td colspan="${NS - 2}"></td></tr>`; }).join('');
        return zz + (I.length > 300 ? `<tr class="bt-el"><td colspan="${NS}" class="bt-nr">… ${I.length - 300} weitere</td></tr>` : '');
      };
      const zeilenHtml = (z, t, titel, nur) => {   // titel: die Zeile steht für ihren Typ (eine Zeile je Typ); nur: Teil der Bauteile (Gruppe Geschoss)
        const fr = z.bereich === 'frage', w = (fr ? WORT_FRAGE : WORT)[z.status] || z.status;
        const mn = nur && z.je ? nur.reduce((a, i) => a + (z.je[i] || 0), 0) : null;
        const menge = fr && !z.menge ? '<span title="kommt, sobald Fläche oder Räume bekannt sind (Assistent, Plan oder von Hand)">–</span>'
          : nur ? (mn != null ? `${zahl(mn)}&nbsp;${esc(z.einheit)}` : `<span title="${nur.length} von ${(z.ids || []).length} Bauteilen dieser Zeile">${nur.length}/${(z.ids || []).length}</span>`) : `${zahl(z.menge)}&nbsp;${esc(z.einheit)}`;
        const einz = !!(opt.einzeln && (z.ids || []).length && !fr && !Z.an), elOffen = einz && (Z.elAuf === z.id || Z.schnell === z.id);
        const sn = Z.schnell === z.id && !Z.an && z.bereich !== 'frage';
        return `<tr data-btz="${esc(z.id)}"${Z.an ? '' : ' draggable="true"'} class="${Z.sel === z.id ? 'akt' : ''}${Z.mw.includes(z.id) ? ' bt-mwz' : ''}${Z.clip && Z.clip.cut && Z.clip.ids.includes(z.id) ? ' bt-cut' : ''}${z.status === 'offen' ? ' offen' : ''}${z.entfaellt ? ' weg' : ''}${z.ergaenzt ? ' bt-erg' : ''}">${bpBaum.zelle({ tiefe: t, auf: Z.an || z.bereich === 'frage' ? undefined : sn || elOffen, car: ` data-btschnell title="${sn || elOffen ? 'zuklappen' : einz ? 'Einzelne Bauteile und Aufbau schnell wählen – Doppelklick: alle Eigenschaften' : 'Aufbau schnell wählen – Doppelklick: alle Eigenschaften'}"`, html: `${Z.an ? '' : `<input type="checkbox" class="bt-mwh" data-btmw${Z.mw.includes(z.id) || (!Z.mw.length && Z.sel === z.id) ? ' checked' : ''} title="Mehrere Zeilen wählen und gemeinsam ändern" aria-label="${esc(z.name)} wählen">`}${titel ? `<b class="bt-tn">${esc(titel)}</b> <small class="bt-nr">${esc(mitTeil(z))}${einz ? ` · ${(nur || z.ids).length}` : ''}</small>` : `<span class="bt-tn">${esc(mitTeil(z))}</span>`}${z.einordnung && !titel ? `<small class="bt-nr"> ${esc(z.einordnung)}</small>` : ''}${typeof bpWk === 'function' ? bpWk([z.name, z.material]) : ''}${(z.nummern || []).length && t < 2 ? `<small class="bt-nr"> ${esc(z.nummern.length > 6 ? z.nummern[0] + ' … ' + z.nummern[z.nummern.length - 1] : z.nummern.join(' · '))}</small>` : ''}` })}
          <td class="r">${z.bereich === 'hand' && !z.menge ? '<span class="bt-chip gelb" title="Menge fehlt – die Zeile wird mit 0 gerechnet. Eintragen rechts unter „Details“.">Menge fehlt</span>' : menge}</td>${KOMP ? '' : `<td><span class="bt-chip${z.status === 'offen' ? ' bt-ext' : ''}">${esc(w)}</span>${z.ergaenzt ? ' <span class="bt-chip gelb" title="Neben dem Plan ergänzt">ergänzt</span>' : ''}${z.entfaellt ? ' <span class="bt-chip">entfällt</span>' : ''}${z.kuerzel && !z.bestaetigt && !z.entfaellt ? ' <span class="bt-chip gelb" title="Aufbau aus dem Kürzel im Plan – bitte bestätigen">bestätigen</span>' : ''}</td>`}
          ${KOMP ? '' : `<td class="bt-kz" title="${esc(z.kurz || '')}">${esc(z.kurz || (z.berechnen ? 'kein Aufbau' : ''))}</td>`}<td class="r" data-btu="${esc(z.id)}"></td><td class="c">${opt.letzte ? opt.letzte.zelle(z) : Z.an ? (z.berechnen ? 'zählt' : '–') : berKnopf(z)}</td></tr>`
          + (sn ? `<tr class="bt-snz" data-btz="${esc(z.id)}"><td colspan="${NS}"><div class="bt-sn" style="${'padding-left:' + (1.2 * (t + 1) + 1) + 'rem'}">${schnellHtml(z)}</div></td></tr>` : '')
          + (elOffen ? elZeilen(z, t, nur) : '');
      };
      /* Eine Baumtabelle für alles (17.11.2026, „konsequent“): alle Bereiche und Gruppen stehen immer da – leer mit 0 und „＋ Zeile“, gefüllt
         klappbar; „＋ Zeile“ am Kopf jeder Gruppe, in die man von Hand etwas eintragen kann. Ohne Zeilen oben die Meldung wie in allen Apps. */
      const plus = (kg, g) => (Z.an ? '' : ` <button type="button" class="bt-plus" data-bthand data-kg="${kg}" data-gruppe="${esc(g)}" title="Bauteil von Hand in „${esc(g)}“ anlegen">＋ Zeile</button>`);
      const kopfZ = (R, t, k, tiefe, extra) => {   // Gruppen aus „Gruppieren“ (g:…) sind anfangs zu – gemerkt wird, was offen ist („og:…“)
        const g = k.startsWith('g:'), kk = g ? 'o' + k : k;
        if (g && Z.selAuf && KL && !KL.zu(kk) && R.some((z) => z.id === Z.sel || Z.mw.includes(z.id))) KL.um(kk);   // im 3D gewählt: nur ihre Gruppe geht auf
        const zu = R.length && KL && (g ? !KL.zu(kk) : KL.zu(k)), offen = R.filter((z) => z.status === 'offen' && !z.entfaellt).length;
        const B = R.filter((z) => z.status !== 'offen'), nb = B.filter((z) => z.berechnen).length; Z.grpIds[k] = R.map((z) => z.id);
        const gs = B.length && !Z.an ? `<button type="button" class="bt-zl${nb === B.length ? ' an' : nb ? ' teils' : ''}" data-btberg="${esc(k)}" title="für alle ${B.length} Zeilen dieser Gruppe umschalten">${nb === B.length ? 'zählt' : nb ? 'teils' : 'zählt nicht'}</button>` : '';
        const nw = R.filter((z) => Z.mw.includes(z.id) || (!Z.mw.length && Z.sel === z.id)).length;   // US-3 A: Haken an der Gruppe wählt alle darin (halb = einige)
        const hk = R.length && !Z.an ? `<input type="checkbox" class="bt-mwh" data-btgw="${esc(k)}"${nw && nw === R.length ? ' checked' : ''}${nw && nw < R.length ? ' data-teil' : ''} title="Alle ${R.length} dieser Gruppe wählen" aria-label="${esc(t)}: alle wählen">` : '';
        return [zu, `<tr class="bt-bh" data-btgk="${esc(k)}">${bpBaum.zelle({ tiefe, auf: R.length ? !zu : null, klapp: R.length ? kk : null, html: `${hk}<b>${esc(t)}</b> <small class="bt-nr">${R.length}${offen ? ` · <span class="bt-ro">${offen} offen</span>` : ''}</small>${extra || ''}` })}<td colspan="${NS - 2}"></td><td class="c">${opt.letzte ? opt.letzte.gruppe(R) : gs}</td></tr>`];
      };
      const PLUS = { ausbau: '412', hand: '300' };
      const elInfo = (i) => (opt.elementInfo && opt.elementInfo(i)) || {}, GR_RANG = new Map();
      const geschVon = (x) => {   // Geschoss je Bauteil aus dem Plan; eine Zeile über mehrere Geschosse steht in jedem mit ihrem Teil
        const I = x.nur || x.z.ids || []; if (!I.length) return [[x.z.geschoss || 'ohne Geschoss', x.nur]];
        const M = new Map(); I.forEach((i) => { const f = elInfo(i), g = f.g || 'ohne Geschoss'; if (f.g && f.gi != null) GR_RANG.set(g, f.gi); (M.get(g) || M.set(g, []).get(g)).push(i); });
        return M.size === 1 && !x.nur ? [[[...M.keys()][0], null]] : [...M.entries()];
      };
      {   // Ebenen, die hier nichts unterscheiden, im ＋-Menü ausgegraut (22.11.2026)
        const viele = (f) => { const S = new Set(); for (const z of ZZ) { f(z).forEach((v) => S.add(v)); if (S.size > 1) return true; } return false; };
        const aw = (k) => (z) => [GX[k] ? GX[k][1](z) : k === 'teil' ? z.teil || '' : k === 'typ' ? z.typ || '' : k === 'mat' ? material(z) || '' : k === 'aufbau' ? z.kurz || '' : k === 'mass' ? z.status || '' : k === 'bereich' ? z.bereich : z.kg || ''];
        Z.grpAus = {};
        for (const k of Object.keys(GR)) if (!(k === 'geschoss' ? viele((z) => ((z.ids || []).length ? z.ids.map((i) => elInfo(i).g || '') : [z.geschoss || ''])) : viele(aw(k)))) Z.grpAus[k] = 'unterscheidet in diesem Projekt nichts';
      }
      let body = ''; Z.gk = []; Z.grpIds = {}; Z.grpZiel = {};
      const ohneTyp = Z.grp.filter((k) => k !== 'typ'), G = Z.grp.includes('typ') && (leer || !Object.keys(Li.typen || {}).length) ? (ohneTyp.length && !(ohneTyp.length === 1 && ohneTyp[0] === 'art') ? ohneTyp : ['bereich']) : Z.grp, gewohnt = G.length === 1 && G[0] === 'bereich';   // noch keine Typen (leer, nur von Hand): ohne die Ebene Typ – nur Bauteilart allein = der Standardbaum
      if (!gewohnt) {   // Ebenen aus der Leiste oben, außen vor innen – je Ebene klappbar
        const ebene = (X, i, pfad, W) => {   // X = [{ z, nur }] – nur: Teil der Bauteile einer Zeile (Gruppe Geschoss), sonst null; W = Weg [[Ebene, Wert], …] bis hier
          if (i >= G.length) { body += X.map((x) => zeilenHtml(x.z, i, null, x.nur)).join(''); return; }
          const M = new Map(), dazu = (w, x) => (M.get(w) || M.set(w, []).get(w)).push(x);
          X.forEach((x) => { if (G[i] === 'geschoss') geschVon(x).forEach(([w, nur]) => dazu(w, { z: x.z, nur })); else dazu(wert(x.z, G[i]), x); });
          const ART = [...ROHG.map((x) => x[1]), ...BEREICH.map((x) => x[1])], rang = (w) => (GX[G[i]] && GX[G[i]][2] ? (GX[G[i]][2].indexOf(w) + 1 || 999) : G[i] === 'art' && ART.includes(w) ? ART.indexOf(w) : G[i] === 'geschoss' && GR_RANG.has(w) ? GR_RANG.get(w) : 999);   // Bauteilart in der Reihenfolge des Baus, Geschosse von unten
          [...M.entries()].sort((a, b) => rang(a[0]) - rang(b[0]) || a[0].localeCompare(b[0], 'de', { numeric: true })).forEach(([w, XX]) => {
            if (G[i] === 'typ' && i === G.length - 1 && XX.length === 1 && w !== 'ohne Typ') { body += zeilenHtml(XX[0].z, i, w, XX[0].nur); return; }   // eine Zeile je Typ: die Zeile ist der Typ (darunter die einzelnen Bauteile)
            const k = `g:${pfad}/${w}`, W2 = [...W, [G[i], w]]; Z.gk.push(k); Z.grpZiel[k] = W2; const [zu, h] = kopfZ(XX.map((x) => x.z), w, k, i); body += h; if (!zu) ebene(XX, i + 1, `${pfad}/${w}`, W2); });
        };
        ebene(ZZ.map((z) => ({ z, nur: null })), 0, G.join('>'), []);
      }
      for (const [b, t] of gewohnt ? BEREICH : []) {
        const R = ZZ.filter((z) => ort(z) === b);
        if (!R.length && (b === 'hand' || (b === 'leistung' && !leer))) continue;   // „Von Hand“ nur mit Zeilen; Leistungen ohne Bauteil kommen aus den Apps
        const [zu, k] = kopfZ(R, t, 'b:' + b, 0, PLUS[b] ? plus(PLUS[b], t) : ''); body += k;
        if (b === 'frage' && !R.length) { body += `<tr><td colspan="${NS}" class="bt-start"><button type="button" class="btn sm" data-btstart${Z.an ? ' disabled' : ''}>Fragen beantworten …</button> <span class="bt-nr">Was ein Plan nicht zeigt (Elektro, Heizung, Leitungen, Baustelle …) – die Mengen kommen, sobald Fläche oder Räume bekannt sind</span></td></tr>`; continue; }
        if (zu) continue;
        if (b !== 'rohbau') { body += R.map((z) => zeilenHtml(z, z.abgeleitet ? 2 : 1)).join(''); continue; }
        const rest = new Set(R);   // Rohbau nach Bauteilen (A1, 17.11.2026): Gründung, Außenwände, Innenwände, Treppen, Decken, Dach, Sonstiges
        for (const [g, tg, kgg, fn] of ROHG) {
          const RG = R.filter((z) => rest.has(z) && fn(z)); RG.forEach((z) => rest.delete(z));
          Z.grpZiel['r:' + g] = [['art', tg]]; const [zg, kg] = kopfZ(RG, tg, 'r:' + g, 1, plus(kgg, tg)); body += kg; if (!zg) body += RG.map((z) => zeilenHtml(z, z.abgeleitet ? 3 : 2)).join('');
        }
        if (rest.size) { const RS = [...rest], [zs, ks] = kopfZ(RS, 'Sonstiges', 'r:so', 1); body += ks; if (!zs) body += RS.map((z) => zeilenHtml(z, z.abgeleitet ? 3 : 2)).join(''); }
      }
      const meldung = leer && typeof bpLeer === 'function' ? bpLeer({ was: 'kein Gebäudemodell', text: 'Mit Plan oder ohne: aus der Planung, Räume und Fenster selbst eintragen, einzelne Bauteile oder einen Plan einlesen (IFC, DXF, PDF).', knoepfe: [{ t: 'Anfangen …', attrs: 'data-btanfang' }] }) : '';
      const y = el.querySelector('.bt-bw') ? el.querySelector('.bt-bw').scrollTop : 0;
      const mwl = Z.mw.length > 1 && !Z.an ? `<div class="bt-mwl">${mwHtml(true)}</div>` : '';   // H1: gemeinsam ändern – schwebt unten im Bereich (22.11.2026: über der Tabelle schob sie die Liste nach unten)
      const grp = window.bpGruppen && !leer ? `<div class="bt-grp">${bpGruppen.html(Z.grp, GR, { rechts: 'Doppelklick: Eigenschaften · Strg + Klick: mehrere' })}</div>` : '';
      el.innerHTML = `<div class="bt-bl">${an}${rwl}${zl}${tw}${meldung}<div class="bt-w"></div>${grp}<div class="bt-bw"><table class="bp-baum bt-baum${leer ? ' bt-gerust' : ''}${KOMP ? ' bt-kompakt' : ''}"><thead><tr><th>Bauteil</th><th class="r">Menge</th>${KOMP ? '' : '<th>Maßnahme</th><th>Aufbau</th>'}<th class="r" title="U-Wert aus dem gewählten Aufbau, W/(m²K) – Farbe nach GModG (Neubau: Referenzgebäude, Bestand: Anlage 7)">U</th><th class="c"${opt.letzte ? '' : ' title="wird berechnet"'}>${opt.letzte ? esc(opt.letzte.kopf) : 'in Kosten/LV'}</th></tr></thead><tbody>${body}</tbody></table></div>${mwl}
        <input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div>`;
      el.querySelector('.bt-bw').scrollTop = y; Z.selAuf = false;
      el.querySelectorAll('[data-btgw][data-teil]').forEach((x) => { x.indeterminate = true; });
      if (window.bpSpaltBreite && !leer) bpSpaltBreite.an(el.querySelector('.bt-baum'), KOMP ? 'bauteile.k' : 'bauteile');   // Spaltenbreiten ziehen wie im LV (22.11.2026)
      const gb = el.querySelector('.bt-grp');
      if (gb) bpGruppen.an(gb, { lies: () => Z.grp, namen: GR, aus: () => Z.grpAus || {}, setze: (G2) => { Z.grp = G2.length ? G2 : grp0; try { localStorage.setItem(grpKey, JSON.stringify(Z.grp)); } catch { /* egal */ } baumZeichnen(); } });
    }
    /* Dreieck an der Zeile (E3): darunter die schnelle Wahl eines fertigen Aufbaus – erst Standardbauteile, dann Schichten (dieselbe Suche wie im Editor) */
    function schnellHtml(z) {
      const k2 = String(Z.kg[z.id] || z.kg || '').slice(0, 2); if (k2 && !Z.vorlD[k2]) vorlagen(Z.kg[z.id] || z.kg).catch(() => {});
      return `<div class="bt-such"><input data-btsuch placeholder="Fertigen Aufbau suchen: Standardbauteil, Material oder Kürzel (KS, PP, WDVS …)" aria-label="Aufbau suchen" autocomplete="off"><div class="bt-vs"></div></div>
        <span class="bt-sni">Jetzt: <b>${esc(z.kurz || 'kein Aufbau')}</b></span><button type="button" class="btn sm" data-btpop>Eigenschaften …</button>`;
    }
    /* Eigenschaften-Fenster (Doppelklick auf eine Zeile oder im 3D, Mock D4 G1 H1): ein freies Fenster über der Seite – die Seite bleibt bedienbar,
       daneben in der Tabelle oder im 3D an- und abwählen; oben derselbe Editor wie rechts (Aufbau, Schichten, U), unten zwei Reiter
       „angewählte“ · „gleiche Bauteile“ (gleicher Aufbau) – „alle wählen“ macht die gleichen zur Auswahl, dann gilt jede Änderung für alle */
    function eigenschaften(id) {
      if (id && !Z.mw.includes(id)) { Z.mw = []; Z.sel = Z.auf = id; }
      if (!Z.pop || !Z.pop.isConnected) {   // EIN Baustein für Eigenschaften-Fenster (bp/eigenschaften.js, EF-D1): Kopf, feste Größe, Liste unten
        const E = window.bpEigen({ key: 'bt.pop', titel: 'Eigenschaften', unten: true, klasse: 'bt-pop', doc: el.ownerDocument, aktion: (m, f, zu) => { if (m === 'x') zu(); }, zu: () => { Z.pop = null; } });
        const f = E.f; Z.pop = f; E.body.classList.add('bt-popd'); E.unten.classList.add('bt-popu');
        const d = E.body; d.onclick = klick; d.onchange = wechsel; d.oninput = suchen; d.onkeydown = suchTaste; d.addEventListener('toggle', blkMerk, true);
        E.unten.onclick = (e) => {   // Haken je Zeile und „alle“ in der Kopfzeile (EF-A1) – statt violetter Hinterlegung und „alle n wählen“
          const b = e.target.closest('[data-btpu]'); if (b) { Z.popU = b.dataset.btpu; return popUnten(); }
          const ty = e.target.closest('[data-bttyp]'); if (ty) return typBefehl(ty.dataset.bttyp);
          const k = e.target.closest('[data-btpk]'); if (k) return mwUm(k.dataset.btpk, true);
          if (e.target.closest('[data-btpall]')) { const R = Z.popU === 'gleich' ? gleiche() : gewaehlt(), an = gewaehlt().map((x) => x.id), alle = R.length && R.every((x) => an.includes(x.id));
            return mwSetzen(alle ? an.filter((id) => !R.some((x) => x.id === id)) : [...an, ...R.map((x) => x.id)]); }
        };
      }
      zeichne(); if (opt.mehr) opt.mehr(Z.mw.length ? Z.mw : Z.sel ? [Z.sel] : []);
    }
    const gewaehlt = () => (Z.mw.length ? mwZ() : L().zeilen.filter((x) => x.id === Z.sel));
    /* Bauteiltypen (Gebäudemodell neu, Etappe 2 – 22.11.2026): „gleiche Bauteile“ = derselbe Typ (Kern bpcore/typen.py); ältere Listen ohne Typ: gleicher Aufbau */
    const gleiche = () => { const r = gewaehlt()[0]; if (!r) return []; if (r.typ) return L().zeilen.filter((x) => !x.entfaellt && x.typ === r.typ);
      return r.kurz ? L().zeilen.filter((x) => !x.entfaellt && x.kurz === r.kurz && String(x.kg || '').slice(0, 2) === String(r.kg || '').slice(0, 2)) : []; };
    function typName(k) { const t = (L().typen || {})[k], n = t && (t.name || t.kurz); return t ? `${k}${n ? ' · ' + n : ''}` : 'ohne Typ'; }   // ohne eigenen Namen: der Aufbau
    function typStand(ks) {   // Stand vor einer Typ-Aktion – für Rückgängig/Wieder (Aktion „stand“ im Kern)
      const K = new Set(ks), zl = {};
      for (const z of L().zeilen) if (z.typ && K.has(z.typ)) zl[z.id] = { typ: z.typ, vorlage: z.vorlage, wahl: [...(z.wahl || [])], code: z.code, kurz: z.kurz, dicken: z.dicken || {}, ausf: z.ausf || {} };
      return { typen: JSON.parse(JSON.stringify(L().typen || {})), zeilen: zl };
    }
    async function typAktion(body, text, ks) {
      const vor = typStand(ks);
      const tu = async (b) => { const d = await (await J(`${basis}/typen`, 'PUT', b)).json(); Z.d = d; zeichne(); window.dispatchEvent(new CustomEvent('bp:bauteile', { detail: { pid } })); return d; };
      try {
        const d = await tu(body), nach = typStand([...ks, d.typ]);
        if (window.rueckgaengig) rueckgaengig(text, () => tu({ aktion: 'stand', stand: vor }), 10000, () => tu({ aktion: 'stand', stand: nach }));
        return d;
      } catch (e) { sag(e.message, true); return null; }
    }
    async function typBefehl(was) {
      const r = gewaehlt()[0]; if (!r || !r.typ) return; const k = r.typ, T = L().typen || {};
      if (was === 'neu') {
        const ids = gewaehlt().filter((x) => x.typ === k).map((x) => x.id), n = await bpEingabe(`Neuer Typ aus ${k} für ${ids.length === 1 ? 'das angehakte Bauteil' : ids.length + ' angehakte Bauteile'} – Name:`, '');
        if (n == null) return; const d = await typAktion({ aktion: 'neu_aus', typ: k, zeilen: ids, name: n.trim() }, `Neuer Typ aus ${k}`, [k]); if (d) bpHinweis && bpHinweis(`${d.typ} angelegt – der Aufbau gilt jetzt nur für seine Bauteile.`);
      } else if (was === 'zus') {
        const vs = k.split('-')[0], A = Object.values(T).filter((t) => t.k !== k && t.k.split('-')[0] === vs);
        if (!A.length) return bpHinweis(`Es gibt keinen anderen Typ ${vs}-… zum Zusammenlegen.`);
        pickMenu(Z.pop.querySelector('[data-bttyp="zus"]'), { items: A.map((t) => ({ value: t.k, title: `${t.k}${t.name ? ' · ' + t.name : ''}`, sub: t.kurz || 'ohne Aufbau' })),
          onPick: async (v) => { if (await bpFrage(`Alle Bauteile von ${k} gehören dann zu ${v} und bekommen dessen Aufbau. ${k} entfällt.`, { ok: 'Zusammenlegen' })) typAktion({ aktion: 'zusammen', typ: k, nach: v }, `${k} mit ${v} zusammengelegt`, [k, v]); } });
      } else if (was === 'name') {
        const n = await bpEingabe(`Name des Typs ${k}:`, (T[k] || {}).name || ''); if (n != null) typAktion({ aktion: 'name', typ: k, name: n.trim() }, `${k} umbenannt`, [k]);
      }
    }
    function popUnten() {
      const u = Z.pop && Z.pop.querySelector('.bt-popu'); if (!u) return;
      const S = gewaehlt(), GL = gleiche(), R = Z.popU === 'gleich' ? GL : S, an = new Set(S.map((x) => x.id)), nAn = R.filter((x) => an.has(x.id)).length;
      const ty = S[0] && S[0].typ && S.every((x) => x.typ === S[0].typ) ? S[0].typ : '';
      const E = window.bpEigen.offen('bt.pop'); if (E) E.titel((!S.length ? 'Eigenschaften' : S.length > 1 ? `Eigenschaften · ${S.length} Bauteile` : `Eigenschaften · ${S[0].name}`) + (ty ? ` · Typ ${typName(ty)}` : ''));
      const tyL = ty && !Z.an ? `<div class="bt-popr bt-typl"><span class="bt-nr">Der Aufbau gilt für alle Bauteile des Typs ${esc(ty)} mit bauender Maßnahme.</span><button type="button" class="btn sm" data-bttyp="neu" title="Die angehakten Bauteile bekommen einen eigenen Typ – eine Kopie von ${esc(ty)}">Neuer Typ aus den angehakten …</button><button type="button" class="btn sm" data-bttyp="zus">Mit anderem Typ zusammenlegen …</button><button type="button" class="btn sm" data-bttyp="name">Typ umbenennen …</button></div>` : '';
      u.innerHTML = `<div class="bt-popr"><span class="bt-seg" role="tablist"><button type="button" role="tab" data-btpu="an" class="${Z.popU !== 'gleich' ? 'on' : ''}">angewählte (${S.length})</button><button type="button" role="tab" data-btpu="gleich" class="${Z.popU === 'gleich' ? 'on' : ''}">${ty ? `Typ ${esc(ty)}` : 'gleiche Bauteile'} (${GL.length})</button></span>
        <span class="bt-nr">Änderung oben gilt für ${S.length === 1 ? 'das angehakte Bauteil' : `${S.length} angehakte`} · daneben in der Tabelle oder im 3D mit Strg + Klick</span></div>
        ${tyL}<table class="bt-el"><thead><tr><th class="bt-hk"><input type="checkbox" data-btpall${R.length && nAn === R.length ? ' checked' : ''} title="alle / keins" aria-label="alle oder keins"${R.length ? '' : ' disabled'}></th><th>Bauteil</th><th>Gebäudeteil</th><th>Aufbau</th><th class="r">Menge</th></tr></thead><tbody>${R.map((x) => `<tr data-btpz="${esc(x.id)}"><td class="bt-hk"><input type="checkbox" data-btpk="${esc(x.id)}"${an.has(x.id) ? ' checked' : ''} aria-label="${esc(x.name)} mitändern"></td><td>${esc(x.name)}</td><td>${esc(x.teil || '')}</td><td>${esc(x.kurz || '')}</td><td class="r">${zahl(x.menge)} ${esc(x.einheit || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="bt-nr">nichts gewählt</td></tr>'}</tbody></table>`;
      const h = u.querySelector('[data-btpall]'); if (h) h.indeterminate = nAn > 0 && nAn < R.length;
    }
    if (opt.baum && window.bpBaum) {
      bpBaum.klappbar(el, { klapp: () => KL, neu: () => baumZeichnen(), alle: () => BEREICH.map(([b]) => 'b:' + b).concat(ROHG.map(([g]) => 'r:' + g), ['r:so'], Z.gk) });
      bpBaum.tasten({ wurzel: '.bt-baum > tbody', zeilen: 'tr[data-btz]', waehle: (z) => z.querySelector('td').click(), loesche: (tr) => handWeg(tr.dataset.btz) });
      /* Zeilen von Hand auch im Baum ändern (20.11.2026: „lassen sich weder bearbeiten noch löschen“ – ging nur rechts in den Details): Kontextmenü, F2, Entf */
      KONTEXT = (e) => { const zi = e.detail.ziel.closest && e.detail.ziel.closest('tr[data-btz], tr.bt-bh[data-btgk]'); if (!zi || !el.contains(zi) || Z.an) return;
        const ein = Z.clip ? [{ text: `Hier einfügen (verschieben${Z.clip.ids.length > 1 ? `: ${Z.clip.ids.length} Bauteile` : ''})`, k: 'Strg+V', fn: () => einfuegen(zi) }] : [];
        if (!zi.dataset.btz) { const k = zi.dataset.btgk; e.detail.punkte.push({ titel: (Z.grpZiel[k] || []).map((x) => x[1]).pop() || 'Gruppe' }, ...ein,   // Gruppenzeile
          { text: 'Alle der Gruppe wählen', fn: () => mwSetzen(Z.grpIds[k] || []) }); return; }
        const tr = zi, z = L().zeilen.find((x) => x.id === tr.dataset.btz); if (!z) return;
        if (!Z.mw.includes(z.id) && Z.sel !== z.id) { Z.mw = []; Z.sel = Z.auf = z.id; zeichne(); }   // Rechtsklick auf eine andere Zeile: sie gilt
        const n = Z.mw.length > 1 && Z.mw.includes(z.id) ? Z.mw.length : 1;   // Eigenschaften für die Auswahl (22.11.2026) – wie der Doppelklick
        e.detail.punkte.push({ titel: n > 1 ? `${n} Bauteile` : z.name }, { text: n > 1 ? `Eigenschaften der ${n} gewählten …` : 'Eigenschaften …', k: 'Doppelklick', fn: () => eigenschaften(z.id) },
          { titel: '' }, { text: 'Ausschneiden', k: 'Strg+X', fn: () => ablage(true) }, { text: 'Kopieren', k: 'Strg+C', fn: () => ablage(false) }, ...ein,
          ...(Z.clip ? [{ text: 'Aufbau und Maßnahme einfügen', k: 'Strg+Umschalt+V', fn: () => aufbauEinfuegen() }] : []),
          { text: 'Alle der Gruppe wählen', k: 'Strg+A', fn: () => { const g = gruppeVon(z.id); if (g) mwSetzen(g[1]); } });
        if (HAND.includes(z.bereich) && n === 1) e.detail.punkte.push({ text: 'Umbenennen …', k: 'F2', fn: () => handName(z.id) }, { text: 'Entfernen', k: 'Entf', gefahr: true, fn: () => handWeg(z.id) }); };   // ein Lauscher für die Seite (unten), immer der zuletzt aufgebaute Baum
      el.addEventListener('keydown', (e) => { if (e.key !== 'F2' || !Z.sel || Z.an || (window.bpTippt && bpTippt(e.target))) return; e.preventDefault(); handName(Z.sel); });
      el.addEventListener('keydown', (e) => {   // US-2 A: Strg+X/C/V, Strg+Umschalt+V, Strg+A im Baum (nicht beim Tippen)
        if (!(e.ctrlKey || e.metaKey) || e.altKey || Z.an || (window.bpTippt && bpTippt(e.target)) || !e.target.closest('.bt-baum, .bt-bw')) return;
        const k = e.key.toLowerCase();
        if (opt.umsortieren === false && ['x', 'v'].includes(k)) return;   // nur ansehen und übernehmen (Wärmeschutz) – nichts im Modell umsortieren
        if (k === 'x' || k === 'c') { if (!auswahlIds().length) return; e.preventDefault(); ablage(k === 'x'); }
        else if (k === 'v' && Z.clip) { e.preventDefault(); if (e.shiftKey) aufbauEinfuegen(); else einfuegen(Z.selG ? el.querySelector(`tr.bt-bh[data-btgk="${CSS.escape(Z.selG)}"]`) : Z.sel && el.querySelector(`tr[data-btz="${CSS.escape(Z.sel)}"]`)); }
        else if (k === 'a' && Z.sel) { const g = gruppeVon(Z.sel); if (g) { e.preventDefault(); mwSetzen(g[1]); } }
      });
      /* Ziehen (US-1 A): die gewählten (oder die eine Zeile) auf eine Gruppe oder Zeile – blau gestrichelt = hier ablegen, grau = geht nicht */
      const zielTr = (e) => e.target.closest && e.target.closest('tr.bt-bh[data-btgk], tr[data-btz]:not(.bt-el):not(.bt-snz)');
      const markeWeg = () => el.querySelectorAll('.bt-ziel, .bt-nein').forEach((x) => x.classList.remove('bt-ziel', 'bt-nein'));
      el.addEventListener('dragstart', (e) => {
        const tr = e.target.closest && e.target.closest('tr[data-btz][draggable]'); if (!tr) return;
        const id = tr.dataset.btz; Z.zieh = Z.mw.includes(id) ? [...Z.mw] : [id];
        const g = document.createElement('div'); g.className = 'bt-geist'; g.textContent = Z.zieh.length === 1 ? (L().zeilen.find((x) => x.id === id) || {}).name || '1 Bauteil' : `${Z.zieh.length} Bauteile`;
        document.body.appendChild(g); e.dataTransfer.setDragImage(g, 12, 12); setTimeout(() => g.remove(), 0);
        e.dataTransfer.effectAllowed = opt.umsortieren === false ? 'copy' : 'move'; e.dataTransfer.setData('text/plain', g.textContent);
        if (opt.ziehen) opt.ziehen([...Z.zieh]);   // andere Apps: die gezogenen Zeilen auch außerhalb des Baums ablegen (Wärmeschutz: nach links/in die Mitte = übernehmen, WR-3 A)
      });
      el.addEventListener('dragover', (e) => {
        if (!Z.zieh || opt.umsortieren === false) return; const tr = zielTr(e); markeWeg(); if (!tr || (tr.dataset.btz && Z.zieh.includes(tr.dataset.btz))) return;
        const P = umPlan(Z.zieh, zielWeg(tr)); tr.classList.add(P.ok ? 'bt-ziel' : 'bt-nein'); tr.title = P.ok ? `Hier ablegen: ${P.schritte.map((s) => s.w).join(' · ')}` : P.grund;
        if (P.ok) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
      });
      el.addEventListener('drop', (e) => { const tr = zielTr(e), ids = Z.zieh; markeWeg(); Z.zieh = null; if (!tr || !ids || opt.umsortieren === false) return; e.preventDefault(); umsortieren(ids, zielWeg(tr)); });
      el.addEventListener('dragend', () => { Z.zieh = null; markeWeg(); });
      el.addEventListener('click', (e) => { if (e.detail !== 2) return; const r = e.target.closest('tr[data-btz]'); if (!r || !el.contains(r) || e.target.closest('input,button,select,[data-btschnell]')) return; e.preventDefault(); e.stopPropagation(); clearTimeout(Z.klT); eigenschaften(r.dataset.btz); }, true);   // Doppelklick = Eigenschaften wie im LV – als zweiter Klick (detail 2) vor dem Neuzeichnen: der erste Klick zeichnet die Zeile neu, dann käme kein dblclick an
    }
    const ladeJs = (n, da) => (da() ? Promise.resolve() : new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + n + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); }));
    const raumbuchJs = () => ladeJs('raumbuch.js', () => window.bpRaumbuch);
    const uFuellen = (w) => { if (w && Z.d && !Z.an) ladeJs('uwert.js', () => window.bpUwert).then(() => window.bpUwert && bpUwert.fuellen(w, basis, Z.d.rev, { name: (id) => ((G().zeilen || []).find((x) => x.id === id) || {}).name || id, setzen: (id, v) => zeile(id, v) })); };   // U-Werte (bp/uwert.js, UW-A1)
    function detailsZeichnen() {   // rechts unter „Bauteil“ und im Eigenschaften-Fenster – derselbe Inhalt
      const P = Z.pop && Z.pop.isConnected ? Z.pop.querySelector('.bt-popd') : null;
      [Z.det, P].forEach((b) => { if (b && b.isConnected) detailsIn(b); });
      if (P) popUnten();
    }
    function detailsIn(box) {
      if (Z.mw.length > 1) {   // mehrere: oben das Gemeinsame; gleiche Bauteilart → darunter derselbe Aufbau-Editor wie bei einem Bauteil, jede Wahl gilt für alle (21.11.2026)
        const R = mwZ(), k2 = String((R[0] || {}).kg || '').slice(0, 2), ein = k2 && R.every((z) => String(z.kg || '').slice(0, 2) === k2);
        if (!ein) { box.innerHTML = `<div class="bt-l bt-mwd">${mwHtml(false)}</div>`; return; }
        Z.auf = R[0].id;
        box.innerHTML = `<div class="bt-l bt-mwd">${mwHtml(false, true)}</div><div class="bt-l bt-mwe"><div class="bt-h">Aufbau für alle ${R.length} – gezeigt wie bei „${esc(R[0].name)}“; jede Wahl hier gilt für alle.</div>${zeileHtml(R[0])}</div>`;
        uFuellen(box); editor(); return;
      }
      if (Z.sel === '__rw') { box.innerHTML = `<div class="bt-l">${rueckwegHtml() || '<p class="bt-leer">Keine offenen Vorschläge.</p>'}</div>`; return; }
      const z = L().zeilen.find((x) => x.id === Z.sel);
      if (!z) { box.innerHTML = '<div class="bt-l"><p class="bt-leer">Links eine Zeile antippen – hier stehen Maßnahme, Aufbau mit Optionen, „wird berechnet“ und die Fenster, Türen oder Räume der Zeile.</p></div>'; return; }
      const D = Z.d.modell.bauteilliste || {}, E = (D.elemente || []).filter((e) => (z.mitglieder || []).includes(String(e.id))), R = (D.raeume || []).filter((r) => z.bereich === 'raum' && (z.mitglieder || []).includes(r.nr));
      const m = (v) => (v == null ? '–' : zahl(v));
      const liste = E.length ? `<table class="bt-el"><thead><tr><th>Nr.</th><th>Art</th><th>Geschoss</th><th>Raum</th><th class="r">B × H</th><th class="r">Brüstung</th></tr></thead><tbody>${E.map((e) => `<tr><td>${esc(e.nr)}</td><td>${esc(e.typ)}</td><td>${esc(e.geschoss)}</td><td>${esc((e.raeume || []).join(' → '))}</td><td class="r">${m(e.b)} × ${m(e.h)}</td><td class="r">${m(e.bruestung)}</td></tr>`).join('')}</tbody></table>`
        : R.length ? '<div data-btrb></div>' : '';   // Räume: Raumbuch – Boden, Wand, Decke je Raum (bp/raumbuch.js, erst hier geladen)
      let sc = box; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const y = sc && sc !== document.body ? sc.scrollTop : null;   // Details neu gezeichnet: Rollposition bleibt (kein Springen nach jeder Wahl)
      box.innerHTML = `<div class="bt-l">${zeileHtml(z)}<div data-btuw="${esc(z.id)}"></div>${z.anweisung === 'raumbuch' ? '<div class="bt-h">Aus dem Raumbuch – ändern unten je Raum.</div>' : z.abgeleitet ? '<div class="bt-h">Aus einer Anweisung an das Modell – zurücknehmen unter „Anweisungen“.</div>' : ''}${liste}</div>`;
      const rb = box.querySelector('[data-btrb]');
      uFuellen(box);
      if (rb) raumbuchJs().then(() => window.bpRaumbuch && bpRaumbuch.mount(rb, { basis, rev: Z.d && Z.d.rev, sel: R.map((r) => r.nr), neu: (d) => api.neu(d) }));
      if (y != null) sc.scrollTop = y;
      if (Z.auf === z.id) editor().then(() => { if (y != null) sc.scrollTop = y; });
    }
    /* Mehrere Bauteile gemeinsam (GO 20.11.2026, Mock „Gebäudemodell schlank“ H1): Haken in der Tabelle, Strg + Klick, im 3D mit Strg oder Rahmen
       (api.mehr). Rechts und über der Tabelle dieselben Felder: Antwort, Aufbau, „wird berechnet“ – „verschieden“, wo die Gewählten abweichen;
       jede Änderung gilt für alle, ein Rückgängig für alle. */
    const mwZ = () => Z.mw.map((id) => L().zeilen.find((x) => x.id === id)).filter(Boolean);
    function mwSetzen(ids) { Z.mw = [...new Set(ids)].filter((id) => L().zeilen.some((x) => x.id === id)); if (Z.mw.length === 1) { Z.sel = Z.auf = Z.mw[0]; Z.mw = []; } zeichne(); if (opt.mehr) opt.mehr(Z.mw.length ? Z.mw : Z.sel ? [Z.sel] : []); }
    function mwUm(id, mitSel) { const A = Z.mw.length ? [...Z.mw] : mitSel && Z.sel && Z.sel !== '__rw' ? [Z.sel] : []; const i = A.indexOf(id); if (i >= 0) A.splice(i, 1); else A.push(id); if (!A.length) { Z.sel = null; } mwSetzen(A); }
    function mwHtml(kompakt, ohneAufbau) {
      const R = mwZ(); if (R.length < 2) return '';
      const gl = (f) => (R.every((z) => z[f] === R[0][f]) ? R[0][f] : undefined), versch = '<span class="bt-mwv">verschieden</span>';
      const erl = (R[0].erlaubt || []).filter((s) => R.every((z) => (z.erlaubt || []).includes(s))), st = gl('status'), ber = gl('berechnen'), vl = gl('vorlage');
      const k2 = String(R[0].kg || '').slice(0, 2), einKg = k2 && R.every((z) => String(z.kg || '').slice(0, 2) === k2), V = einKg ? Z.vorlD[k2] : null;
      if (einKg && !V && !Z.mwL) { Z.mwL = true; vorlagen(k2).then(() => { Z.mwL = false; zeichne(); }, () => { Z.mwL = false; }); }
      const ant = erl.length ? `${erl.map((s) => `<button type="button" data-btmwst="${s}" class="${st === s ? 'on' : ''}">${esc(WORT[s] || s)}</button>`).join('')}${st === undefined ? ' ' + versch : ''}` : '<span class="mute">keine gemeinsame Maßnahme</span>';
      const auf = einKg ? `<select data-btmwvl aria-label="Aufbau für alle"><option value="">${vl ? esc(R[0].kurz || 'gewählter Aufbau') : 'verschieden – für alle wählen …'}</option>${(V || []).filter((v) => v.id !== vl || true).map((v) => `<option value="${esc(v.id)}"${v.id === vl ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : '<span class="mute">verschiedene Bauteilarten – Aufbau je Zeile</span>';
      const aw = artWahl(R[0]), fam = opt.artJe && aw.length > 1 && R.every((z) => artWahl(z).some((x) => x[0] === String(R[0].kg))) && (L().quelle || {}).planstand && ((L().quelle || {}).art || 'ifc') === 'ifc';   // Art je Bauteil (22.11.2026)
      const kgG = gl('kg'), art = fam ? `<button type="button" class="bt-ehb" data-btmwart title="Art der gewählten Bauteile ändern, falls der Plan sie falsch zeigt">${kgG ? esc(ARTEN[kgG] || kgG) : 'verschieden'} ▾</button>` : '';
      const be = `<label class="bt-mwb"><input type="checkbox" data-btmwber${ber ? ' checked' : ''}${ber === undefined ? ' data-mix' : ''}> wird berechnet${ber === undefined ? ' ' + versch : ''}</label>`;
      if (kompakt) return `<b>${R.length} gewählt:</b><span class="bt-mwg"><span class="mute">Maßnahme</span>${ant}</span><span class="bt-mwg"><span class="mute">Aufbau</span>${auf}</span>${art ? `<span class="bt-mwg"><span class="mute">Art</span>${art}</span>` : ''}${be}<button type="button" class="btn sm" data-btmwweg>Auswahl aufheben</button>`;
      return `<h3 class="bt-mwt">${R.length} Bauteile gewählt</h3><p class="bt-nr">${R.slice(0, 8).map((z) => esc(z.name)).join(' · ')}${R.length > 8 ? ` · … ${R.length - 8} weitere` : ''}</p>
        <div class="bt-o"><span>Maßnahme</span>${ant}</div>${ohneAufbau ? `<div class="bt-o"><span>Aufbau</span>${vl === undefined ? versch : esc(R[0].kurz || '–')}</div>` : `<div class="bt-o"><span>Aufbau</span>${auf}</div>`}${art ? `<div class="bt-o"><span>Art</span>${art}</div>` : ''}<div class="bt-o"><span></span>${be}</div>
        <p class="bt-h">Jede Änderung hier gilt für alle ${R.length}. „verschieden“ = die Gewählten haben verschiedene Werte; wählst du einen, gilt er für alle. Mit Strg + Klick weitere dazu oder weg.</p>
        <button type="button" class="btn sm" data-btmwweg>Auswahl aufheben</button>`;
    }
    /* Text fürs Rückgängig (21.11.2026): welches Bauteil, welche Angabe – „Außenwand – KS + WDVS: Aufbau“ statt „… geändert“ */
    const FELD = { status: 'Maßnahme', vorlage: 'Aufbau', wahl: 'Ausführung', dicken: 'Schichtdicke', ausf: 'Ausführung', menge: 'Menge', name: 'Name', uw: 'Uw', kg: 'Art', einheit: 'Einheit', berechnen: 'Menge berechnen', wie: 'Aufbau wie …', bestaetigt: 'Kürzel bestätigt' };
    const wasText = (neu) => [...new Set(Object.keys(neu).map((k) => FELD[k]).filter(Boolean))].join(', ') || 'geändert';
    /* Mehrere Zeilen auf einmal: je gleicher Änderung EINE Anfrage mit allen Kennungen (Kern: ids), einmal zeichnen –
       vorher ging jede Zeile einzeln, die Gruppe zeigte unterwegs „teils“ und ein zweiter Klick traf einen halben Stand (22.11.2026) */
    async function zeilenSetzen(L2) {
      const G = new Map(); for (const [id, v] of L2) { const k = JSON.stringify(v); if (!G.has(k)) G.set(k, { v, ids: [] }); G.get(k).ids.push(id); }
      try {
        for (const { v, ids } of G.values()) Z.d = await (await J(`${basis}/bauteile/zeile`, 'POST', { ids, rev: Z.d.rev, ...v })).json();
        zeichne(); window.dispatchEvent(new CustomEvent('bp:bauteile', { detail: { pid } }));
      } catch (e) { sag(e.message, true); if (e.status === 409) laden(); }
    }
    async function mwAendern(neu, R0) {   // R0: diese Zeilen (Schalter an einer Gruppe), sonst die gewählten
      const R = R0 || mwZ(); if (!R.length) return;
      const alt = R.map((z) => [z.id, Object.fromEntries(Object.keys(neu).map((k) => [k, z[k]]).concat('status' in neu ? [['vorlage', z.vorlage], ['wahl', [...(z.wahl || [])]], ['berechnen', z.berechnen]] : 'vorlage' in neu ? [['wahl', [...(z.wahl || [])]]] : []))]);
      const lauf = (L2) => zeilenSetzen(L2);
      const stop = warte(`${R.length} Bauteile werden geändert …`);
      try { await lauf(R.map((z) => [z.id, neu])); } finally { stop(); }
      sag(`${R.length} Bauteile geändert.`);
      if (window.rueckgaengig) rueckgaengig(`${R.length} Bauteile: ${wasText(neu)}`, () => lauf(alt), 10000, () => lauf(R.map((z) => [z.id, neu])));
    }
    /* Umsortieren (Mock „Umsortieren und Räume gruppieren“ US-1 A, US-2 A – 22.11.2026): Bauteile in eine andere Gruppe ziehen bzw. ausschneiden
       und dort einfügen = sie übernehmen die Eigenschaft der Gruppe – Typ, Bauteilart, Aufbau, Maßnahme. Was aus dem Plan kommt (Geschoss,
       Gebäudeteil, Bereich, Material), lässt sich so nicht ändern – das Ziel ist grau. Strg+Umschalt+V überträgt nur Aufbau und Maßnahme. */
    const ART_KG = { 'Außenwände': { 341: '331', 342: '332', 331: '331', 332: '332' }, 'Innenwände': { 331: '341', 332: '342', 341: '341', 342: '342' },
      'Gründung · Bodenplatte': { x: '322' }, Decken: { x: '351' }, Dach: { x: '361' } };
    const artKg = (z, w) => { const M = ART_KG[w]; if (!M) return null; const k = M[z.kg] || M.x; return k && artWahl(z).some((a) => a[0] === k) ? k : null; };
    const zielWeg = (tr) => {   // [[Ebene, Wert], …] der Gruppe bzw. der Zeile, auf die gezogen wird
      if (!tr) return null;
      if (tr.dataset.btgk) return Z.grpZiel[tr.dataset.btgk] || null;
      const z = L().zeilen.find((x) => x.id === tr.dataset.btz); if (!z) return null;
      const G = Z.grp.filter((k) => k !== 'geschoss'); return G.length === 1 && G[0] === 'bereich' ? [['art', artVon(z)]] : G.map((k) => [k, wert(z, k)]);
    };
    function umPlan(ids, W) {   // → { ok, grund, schritte: [{ was, … }] }
      const R = ids.map((id) => L().zeilen.find((x) => x.id === id)).filter(Boolean);
      if (!R.length || !W) return { ok: false, grund: '' };
      const schritte = [];
      for (const [k, w] of W) {
        if (R.every((z) => wert(z, k) === w)) continue;
        if (k === 'art') { const K = R.map((z) => artKg(z, w)); if (K.some((x) => !x)) return { ok: false, grund: `${R.length === 1 ? 'Dieses Bauteil kann' : 'Diese Bauteile können'} nicht ${w} werden` }; schritte.push({ was: 'art', kg: K, w }); continue; }
        if (k === 'typ') { const T = Object.values(L().typen || {}).find((t) => typName(t.k) === w); if (!T) return { ok: false, grund: 'ohne Typ' };
          const art = L().zeilen.find((x) => x.typ === T.k); if (art && R.some((z) => artVon(z) !== artVon(art) && !W.some(([kk]) => kk === 'art'))) return { ok: false, grund: `${T.k} ist ${artVon(art)}` };
          schritte.push({ was: 'typ', typ: T.k, w }); continue; }
        if (k === 'mass') { const st = Object.keys(WORT).find((x) => WORT[x] === w) || Object.keys(WORT_FRAGE).find((x) => WORT_FRAGE[x] === w);
          if (!st || R.some((z) => (z.erlaubt || []).length && !z.erlaubt.includes(st))) return { ok: false, grund: `„${w}“ passt nicht zu allen` }; schritte.push({ was: 'mass', status: st, w }); continue; }
        if (k === 'aufbau') { const q = L().zeilen.find((x) => x.kurz === w && x.vorlage); if (!q) return { ok: false, grund: 'ohne Aufbau' };
          schritte.push({ was: 'aufbau', neu: { vorlage: q.vorlage, wahl: [...(q.wahl || [])], dicken: q.dicken || {}, ausf: q.ausf || {} }, w }); continue; }
        return { ok: false, grund: `${GR[k] || k} ${GX[k] ? 'ergibt sich aus der App' : 'kommt aus dem Plan'} – lässt sich so nicht ändern` };
      }
      return { ok: schritte.length > 0, grund: schritte.length ? '' : 'steht schon dort', schritte, R };
    }
    async function umsortieren(ids, W) {
      const P = umPlan(ids, W); if (!P.ok) { if (P.grund) sag(P.grund, true); return false; }
      let R = P.R;
      const elIds = new Set(R.flatMap((z) => z.ids || []));
      const nachher = () => { R = elIds.size ? L().zeilen.filter((z) => (z.ids || []).some((i) => elIds.has(i))) : R.map((z) => L().zeilen.find((x) => x.id === z.id)).filter(Boolean); };
      for (const s of P.schritte) {
        if (s.was === 'art') {   // Bauart je Bauteil (IFC: die Bauteile wandern in die Zeile ihrer neuen Art) bzw. die Zeile von Hand
          const je = new Map(); R.forEach((z, i) => { const k = s.kg[i]; (je.get(k) || je.set(k, []).get(k)).push(z); });
          for (const [kg, RR] of je) { const I = RR.flatMap((z) => z.ids || []);
            if (opt.artJe && I.length && ifcDa(G().quelle || {}) && ((G().quelle || {}).art || 'ifc') === 'ifc') await opt.artJe(I, kg); else await mwAendern({ kg }, RR); }
          nachher();
        } else if (s.was === 'typ') await typAktion({ aktion: 'zuweisen', typ: s.typ, zeilen: R.map((z) => z.id) }, `${R.length === 1 ? R[0].name : R.length + ' Bauteile'} → Typ ${s.typ}`, [...new Set(R.map((z) => z.typ).filter(Boolean)), s.typ]);
        else if (s.was === 'mass') await mwAendern({ status: s.status }, R);
        else if (s.was === 'aufbau') await mwAendern(s.neu, R);
        nachher();
      }
      sag(`${ids.length === 1 ? 'Bauteil' : ids.length + ' Bauteile'} → ${P.schritte.map((s) => s.w).join(' · ')}`);
      return true;
    }
    const auswahlIds = () => (Z.mw.length ? [...Z.mw] : Z.sel && Z.sel !== '__rw' ? [Z.sel] : []);
    function ablage(cut) { const ids = auswahlIds(); if (!ids.length) return; Z.clip = { ids, cut, von: ids[0] }; zeichne();
      sag(`${ids.length === 1 ? '1 Bauteil' : ids.length + ' Bauteile'} ${cut ? 'ausgeschnitten' : 'kopiert'} – Strg+V in eine Zeile oder Gruppe verschiebt dorthin, Strg+Umschalt+V überträgt Aufbau und Maßnahme`); }
    async function einfuegen(ziel) {   // Strg+V (US-2 A): verschieben wie Ziehen
      if (!Z.clip || !ziel) return; const W = zielWeg(ziel); if (await umsortieren(Z.clip.ids, W) && Z.clip.cut) { Z.clip = null; zeichne(); } }
    async function aufbauEinfuegen() {   // Strg+Umschalt+V: Aufbau und Maßnahme der kopierten Zeile auf die markierten
      const q = Z.clip && L().zeilen.find((x) => x.id === Z.clip.von), R = auswahlIds().map((id) => L().zeilen.find((x) => x.id === id)).filter((z) => z && z.id !== (q || {}).id);
      if (!q || !R.length) return;
      const auf = q.vorlage ? { vorlage: q.vorlage, wahl: [...(q.wahl || [])], dicken: q.dicken || {}, ausf: q.ausf || {} } : {};
      const mit = R.filter((z) => !(z.erlaubt || []).length || z.erlaubt.includes(q.status)), ohne = R.filter((z) => !mit.includes(z));
      if (mit.length) await mwAendern({ status: q.status, ...auf }, mit);
      if (ohne.length && q.vorlage) await mwAendern(auf, ohne);
    }
    const gruppeVon = (id) => Object.entries(Z.grpIds || {}).filter(([, I]) => I.includes(id)).sort((a, b) => a[1].length - b[1].length)[0];
    const handZ = (id) => { const z = L().zeilen.find((x) => x.id === id); return z && HAND.includes(z.bereich) && !Z.an ? z : null; };
    async function handWeg(id) { const z = handZ(id); if (!z) return sag('Nur Zeilen von Hand lassen sich entfernen – Bauteile aus dem Plan entfallen mit dem nächsten Planstand.'); const alt = { ...z, wahl: [...(z.wahl || [])] };
      await zeile(id, { loeschen: true }); if (Z.sel === id) { Z.sel = Z.auf = null; zeichne(); if (opt.auswahl) opt.auswahl(null); } sag(`„${z.name}“ entfernt.`);
      if (window.rueckgaengig) rueckgaengig(`„${alt.name}“ entfernt`, async () => {   // zurück: Zeile neu anlegen und Menge, Antwort, Aufbau wieder setzen (neue Kennung)
        neu(await (await J(`${basis}/bauteile/hand`, 'POST', { name: alt.name, kg: alt.kg || '', ...(alt.einheit_hand ? { einheit: alt.einheit } : {}) })).json()); const n = L().zeilen[L().zeilen.length - 1]; if (!n) return;
        await zeile(n.id, { menge: alt.menge || 0, status: alt.status, berechnen: !!alt.berechnen, ...(alt.vorlage ? { vorlage: alt.vorlage, wahl: alt.wahl, ...(alt.dicken ? { dicken: alt.dicken } : {}), ...(alt.ausf ? { ausf: alt.ausf } : {}) } : {}) }, true); }); }
    async function handName(id) { const z = handZ(id); if (!z || !window.bpEingabe) return; const n = await bpEingabe('Name des Bauteils', z.name); if (n && String(n).trim() && String(n).trim() !== z.name) return zeile(id, { name: String(n).trim() }); }
    async function anfang(neu) {   // ein Fenster für jeden Anfang (D1, 21.11.2026: Baukasten · Planung · Datei)
      const plan = !!(((Z.d && Z.d.modell) || {}).assistent || {}).type, gm = ((H.conf || {}).apps || []).find((a) => a.key === 'gebaeudemodell'), w = await anfangen({ plan, neu: neu === true || !!Z.ps.length });
      const hin = (h) => { if (gm) location.href = `${H.appUrl(gm)}/#${h}`; };
      if (w === 'baukasten') return opt.baukasten ? opt.baukasten() : hin('baukasten');
      if (w === 'planung') return tue(plan ? 'data-btplan' : 'data-btplanung');
      if (w === 'raeume') return opt.raeume ? opt.raeume() : hin('raeume');
      if (w === 'zeilen') return tue('data-bthand');
      if (w === 'lesen') return opt.einlesen ? einlesen() : hin('bauteile');
    }
    const tue = (attr) => { const b = document.createElement('button'); b.setAttribute(attr, ''); return klick({ target: b }); };
    const api = {
      laden, menue, verfeinern, einlesen, anfang, ansehen,
      hand: () => tue('data-bthand'), aufraeumen: () => tue('data-btweg-alle'), ausgeben: () => tue('data-btaus'),
      gelten: () => (Z.an ? aendern(Z.an.id, { zurueckholen: true }, ZURUECK) : null),
      festhalten: () => festhalten(),
      details(box) { Z.det = box; box.onclick = klick; box.onchange = wechsel; box.oninput = suchen; box.onkeydown = suchTaste; box.addEventListener('toggle', blkMerk, true); detailsZeichnen(); },
      zustand: () => ({ an: Z.an, planstaende: Z.ps.length, gilt: (G().quelle || {}).planstand || null, ifc: ifcDa(G().quelle || {}), plan: !!(G().quelle || {}).planstand && ((G().quelle || {}).art || 'ifc') !== 'hand', planart: (G().quelle || {}).art || '', zeilen: L().zeilen, weg: G().zeilen.filter((z) => z.entfaellt).length, extern: !!(Z.rw && Z.rw.extern), sel: Z.sel, modell: Z.d && Z.d.modell, rev: Z.d && Z.d.rev }),
      mehr(ids) { mwSetzen(ids || []); },   // im 3D mehrere gewählt (Zeilen-Kennungen)
      eigenschaften(id) { eigenschaften(id); },   // Doppelklick im 3D (G1)
      mehrfach: () => [...Z.mw],
      element(i) {   // im 3D genau ein Bauteil angeklickt: seine Zeile auf, genau dieses Bauteil gewählt (22.11.2026)
        const z = L().zeilen.find((x) => (x.ids || []).includes(+i)); if (!z) return false;
        Z.mw = []; Z.sel = Z.auf = z.id; Z.selE = +i; Z.elAuf = z.id; Z.selAuf = true; zeichne();
        const r = el.querySelector(`tr[data-bte="${+i}"]`) || el.querySelector(`tr[data-btz="${CSS.escape(z.id)}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); return true; },
      zeige(id, rollen) { Z.mw = []; Z.sel = id; Z.auf = id; Z.selE = null; Z.selAuf = !!rollen; zeichne(); const r = rollen && el.querySelector(`[data-btz="${CSS.escape(id)}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); },   // rollen: aus der 3D-Ansicht gewählt – die Zeile ins Bild
      neu(d) { Z.d = d; zeichne(); },
      zeigen() { zeichne(); },   // der Platz wurde gerade sichtbar (Reiter rechts im Gebäudemodell) – der Baum zeichnet nur, was zu sehen ist
      entwurf: (e) => (e.erster ? uebernehmen(e, {}, e.name) : abgleich(e)),   // Planstand von außen (Assistent: bpcore/modell_hand.py) – wie nach dem Einlesen
    };
    el.innerHTML = '<div class="bt-l"><div class="bt-w">Lade …</div></div>';
    laden().catch((e) => { el.innerHTML = `<div class="bt-l"><p class="bt-leer">${esc(e.message)}</p></div>`; });
    return api;
  }
  window.bpBauteile = { mount, planungNeu, anfangen, material };
}());
