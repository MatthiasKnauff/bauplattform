/* Baukosten – Grundlagen, Rechnen (wie auf dem Server), Laden und Speichern, Versionsleiste, Oberfläche der Bereiche.
   Teil der Seite baukosten.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: baukosten-kern.js, baukosten-bauteile.js, baukosten-start.js). */
const TABS = [['uebersicht', 'Übersicht'], ['plaene', 'Pläne & Raumbuch'], ['bauteile', 'Bauteile & Kostengruppen'], ['kosten', 'Kosten'], ['mittel', 'Mittelabfluss'], ['pruefung', 'Prüfung']];
// Was die Stufe bedeutet und bewirkt (Genauigkeit, Gliederungstiefe im PDF, zusätzliche Prüfregeln)
const STUFE_INFO = {
  rahmen: { lph: 'LPH 1 · Grundlagen', ebene: 1, genau: 35, txt: 'Gesamtkosten aus Fläche × Kennwert, Gliederung nach der 1. Ebene.' },
  schaetzung: { lph: 'LPH 2 · Vorplanung', ebene: 2, genau: 25, txt: 'Gliederung mindestens bis zur 2. Ebene (z. B. 330 Außenwände).' },
  berechnung: { lph: 'LPH 3 · Entwurf', ebene: 3, genau: 15, txt: 'Gliederung bis zur 3. Ebene; alle Räume bestätigt, Aufteilung auf die 2. Ebene nötig.' },
  voranschlag: { lph: 'LPH 6 · Vorbereitung der Vergabe', ebene: 3, genau: 10, txt: 'Bepreiste Leistungsverzeichnisse statt Kennwerte, gegliedert bis zur 3. Ebene bzw. nach Vergabeeinheiten.' },
  anschlag: { lph: 'LPH 7 · Vergabe', ebene: 3, genau: 8, txt: 'Angebots- und Auftragspreise statt Kennwerte – geschätzte Positionen werden in der Prüfung gemeldet.' },
  feststellung: { lph: 'LPH 8 · Abrechnung', ebene: 3, genau: 2, txt: 'Abgerechnete Kosten aus den Schlussrechnungen – geschätzte Positionen werden in der Prüfung gemeldet.' },
};
const STUFEN = [['rahmen', 'Kostenrahmen'], ['schaetzung', 'Kostenschätzung'], ['berechnung', 'Kostenberechnung'], ['voranschlag', 'Kostenvoranschlag'], ['anschlag', 'Kostenanschlag'], ['feststellung', 'Kostenfeststellung']];
let VG = null;   // eigene Vergleichsobjekte und importierte Kennwerte
const vgOf = (label) => VG && VG.auswertung[(label || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim()];
const vgHint = (t) => { const v = vgOf(t.label); return v ? `<div class="hint" style="font-size:.72rem;white-space:nowrap" title="${esc(v.werte.map((w) => `${w.obj}: ${Math.round(w.kw).toLocaleString('de-DE')} €`).join('\n'))}">Vergleich Ø ${Math.round(v.mittel).toLocaleString('de-DE')} € (${v.n}${v.n > 1 ? `, ${Math.round(v.min).toLocaleString('de-DE')}–${Math.round(v.max).toLocaleString('de-DE')}` : ''})</div>` : ''; };
let LIST = [], B = null, FLOW = null, CHECK = null, SRC = null, tab = (location.hash || '').slice(1) || 'uebersicht', selFile = null, selRoom = null, saveT = 0, saving = false;
const eur = (v) => (v == null ? '–' : Math.round(v).toLocaleString('de-DE') + ' €');
const m2 = (v) => (+v || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (v) => (+v || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';
const pnum = (s) => { const v = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : 0; };
const ym = (s) => { const [y, m] = s.split('-'); return ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][+m - 1] + ' ' + y.slice(2); };

/* ---------- Rechnen (wie auf dem Server, damit Eingaben sofort wirken) ---------- */
const btBetrag = (b) => Math.round((+b.menge || 0) * (+b.ep || 0) * 100) / 100;
/* Angaben je Raum: Faktor auf den Kennwert (wie STD_F / MASS_F auf dem Server) */
const STD_F = { einfach: 0.85, mittel: 1, gehoben: 1.2, hoch: 1.45 }, MASS_F = { neu: 1, umbau: 0.8, sanierung: 0.6, bestand: 0 };
const STD_L = [['', 'mittel'], ['einfach', 'einfach'], ['gehoben', 'gehoben'], ['hoch', 'hoch']], MASS_L = [['', 'Neubau'], ['umbau', 'Umbau'], ['sanierung', 'Sanierung'], ['bestand', 'Bestand bleibt']];
const raumF = (r) => (STD_F[r.std || 'mittel'] ?? 1) * (MASS_F[r.mass || 'neu'] ?? 1);
function calc(d) {   // wie calc() auf dem Server
  const ju = Object.assign({ region: 100, preis: 100, rest: 'kw', f: 1 }, d.justage || {}), jf = ju.region / 100 * ju.preis / 100;
  const by = {}; d.rooms.forEach((r) => { const t = by[r.typ] ||= { area: 0, n: 0, gew: 0 }; t.area += +r.area || 0; t.n++; t.gew += (+r.area || 0) * raumF(r); });
  let raw = 0; const types = Object.entries(d.types).map(([k, t]) => { const a = by[k] || { area: 0, n: 0, gew: 0 }; const s = a.gew * t.kw; raw += s; return { typ: k, label: t.label, n: a.n, area: a.area, gew: a.gew, kw: t.kw, sum: s }; });
  let bau = raw * jf; const bauKw = bau; let k300 = bau * d.kg['300'] / 100, k400 = bau * d.kg['400'] / 100; const kg2 = {};
  const J = { region: ju.region, preis: ju.preis, faktor: jf, rest: ju.rest, rest_f: 1, k: null, bt_wert: 0, bt_kw: 0, rest_kw: 0, rest_wert: 0 };
  const bts = (d.bauteile || []).filter((b) => /^[34]\d\d$/.test(b.kg || ''));
  if (bts.length) {   // Bauteile ersetzen in ihrer Gruppe der 2. Ebene den Kennwert-Anteil
    const sums = {}; bts.forEach((b) => { const k = b.kg.slice(0, 2) + '0', x = sums[k] ||= { wert: 0, n: 0 }; x.wert += btBetrag(b); x.n++; });
    const std = (B && B.kg2_std) || {}, anteil = {};
    for (const [main, base] of [['3', k300], ['4', k400]]) {
      let src = Object.fromEntries(Object.entries(Object.keys(d.kg2 || {}).length ? d.kg2 : std).filter(([k]) => k[0] === main));
      if (!Object.keys(src).length) src = Object.fromEntries(Object.entries(std).filter(([k]) => k[0] === main));
      const ssum = Object.values(src).reduce((a, x) => a + +x, 0) || 1;
      for (const k of new Set([...Object.keys(src), ...Object.keys(sums).filter((x) => x[0] === main)])) anteil[k] = base * (src[k] || 0) / ssum;
    }
    J.bt_wert = Object.values(sums).reduce((a, x) => a + x.wert, 0);
    J.bt_kw = Object.keys(sums).reduce((a, k) => a + (anteil[k] || 0), 0);
    J.k = J.bt_kw ? J.bt_wert / J.bt_kw : null;
    J.rest_f = ju.rest === 'angl' ? (J.k || 1) : ju.rest === 'eigen' ? +ju.f || 1 : 1;
    const tot = { 3: 0, 4: 0 };
    for (const k of Object.keys(anteil).sort()) {
      if (sums[k]) kg2[k] = { wert: sums[k].wert, quelle: 'bauteile', n: sums[k].n, kennwert: anteil[k] };
      else { kg2[k] = { wert: anteil[k] * J.rest_f, quelle: 'kennwerte', n: 0, kennwert: anteil[k] }; J.rest_kw += anteil[k]; J.rest_wert += kg2[k].wert; }
      tot[k[0]] += kg2[k].wert;
    }
    k300 = tot[3]; k400 = tot[4]; bau = k300 + k400;
  }
  const extra = d.items.reduce((s, i) => s + (i.kg !== '700' && i.amount != null ? +i.amount : 0), 0);
  const nk = (bau + extra) * d.nk / 100, area = d.rooms.reduce((s, r) => s + (+r.area || 0), 0), risiko = (bau + extra + nk) * (+d.risiko || 0) / 100;
  return { types, kw_summe: raw, bauwerk: bau, bauwerk_kw: bauKw, kg2, justage: J, kg300: k300, kg400: k400, extra, nk, risiko, total: bau + extra + nk + risiko, area, kw: area ? bau / area : 0 };
}
/* Justage: Kennwerte an Region und Preisstand anpassen; Gruppen ohne Bauteile angleichen */
const fx = (v, n = 2) => (v == null ? '–' : (Math.round(v * 10 ** n) / 10 ** n).toLocaleString('de-DE', { minimumFractionDigits: n }));
/* Abweichung in Worten: „Bauteile 89 % mehr als Kennwert“ */
const vglTxt = (wert, kw, kurz) => { if (!kw) return '–'; const d = Math.round((wert / kw - 1) * 100); return Math.abs(d) < 1 ? (kurz ? 'wie Kennwert' : 'Bauteile wie Kennwert') : `${kurz ? '' : 'Bauteile '}${Math.abs(d)} % ${d > 0 ? 'mehr' : 'weniger'} als Kennwert`; };
const kPct = (k) => vglTxt(k || 1, 1);
/* Empfehlung für die Kostengruppen ohne Bauteile – aus Abweichung (k), Zahl der bepreisten Gruppen und ihrem Anteil am Bauwerk */
function juEmpfehlung(J) {
  const n = Object.values(B.calc.kg2 || {}).filter((x) => x.quelle === 'bauteile').length, cov = J.bt_kw / ((J.bt_kw + J.rest_kw) || 1), k = J.k || 1, p = Math.round(cov * 100);
  if (k >= 0.9 && k <= 1.1) return { v: 'kw', s: 'Kennwert-Anteil unverändert lassen', t: `Bauteile und Kennwerte passen zusammen (Abweichung unter 10 %). Die übrigen Gruppen können beim Kennwert bleiben.` };
  if (n < 2 || cov < 0.25) return { v: 'kw', s: 'Kennwert-Anteil lassen, weitere Gruppen bepreisen', t: `Erst ${n} Gruppe${n === 1 ? '' : 'n'} mit Bauteilen (${p} % des Bauwerks) – zu wenig, um auf das ganze Gebäude zu schließen. Kennwert-Anteil lassen, Mengen und Einheitspreise der Bauteile prüfen und weitere Gruppen bepreisen.` };
  if (k < 0.9) return { v: 'kw', s: 'Bauteile auf Vollständigkeit prüfen, Kennwert-Anteil lassen', t: `Die Bauteile liegen unter dem Kennwert-Anteil ihrer Gruppen (${kPct(k)}). Meist fehlen dort noch Positionen – z. B. Fenster und Türen in 330, Bekleidungen, Beläge, Abdichtung oder Baustelleneinrichtung. Kennwert-Anteil der übrigen Gruppen lassen und die bepreisten Gruppen auf Vollständigkeit prüfen. Sind sie vollständig und das Büro baut wirklich günstiger, den Faktor unter „eigener Faktor“ eintragen.` };
  if (k > 1.6 && J.region === 100 && J.preis === 100) return { v: 'preis', p: Math.round(k * 100), s: `Preisstand auf ${Math.round(k * 100)} % anpassen`, t: `Die Bauteile liegen sehr weit vom Kennwert entfernt (${kPct(k)}), obwohl ${p} % des Bauwerks bepreist sind. Das spricht für Kennwerte mit altem Preisstand oder anderer Region. Empfehlung: Preisstand bzw. Regionalfaktor anpassen (gleicht alle Kennwerte an) – vorher Mengen und Einheitspreise auf Ausreißer prüfen.` };
  return { v: 'angl', s: 'übrige Gruppen an die Bauteile angleichen', t: `${n} Gruppen mit Bauteilen decken ${p} % des Bauwerks ab – ${kPct(k)}. Das ist ein belastbarer Hinweis auf das Preisniveau – die übrigen Gruppen angleichen, sonst werden zwei Preisniveaus gemischt.` };
}
function justageHtml() {
  const J = B.calc.justage || { region: 100, preis: 100, faktor: 1, rest: 'kw' }, ju = B.data.justage || {}, bt = J.bt_kw > 0;
  const E = bt ? juEmpfehlung(J) : null, cur = ju.rest || 'kw';
  const rad = (v, l, x = '') => `<label class="chk" style="color:var(--ink);align-items:flex-start"><input type="radio" name="juRest" data-ju="rest" value="${v}"${cur === v ? ' checked' : ''}><span>${l}${E && E.v === v ? ' <span class="pill ok">empfohlen</span>' : ''}${x}</span></label>`;
  const ok = E && (E.v === cur || (E.v === 'preis' && Math.abs(J.preis - E.p) < 1));
  const emp = E ? `<div class="card" style="margin:.6rem 0;padding:.6rem .8rem;border-color:${ok ? 'var(--ok)' : 'var(--y)'}"><b style="font-size:.9rem">${ok ? '✓ ' : '💡 '}Empfehlung</b> <a href="#" data-act="juWarum" class="hint">Warum?</a><p class="hint" style="margin:.2rem 0 ${ok ? 0 : '.5rem'}">${esc(E.t)}</p>
    ${ok ? '' : E.v === 'preis' ? `<button class="btn sm" data-act="juEmpf" data-v="preis" data-p="${E.p}">Preisstand auf ${E.p} % setzen</button>` : `<button class="btn sm" data-act="juEmpf" data-v="${E.v}">Empfehlung übernehmen</button>`}</div>` : '';
  return `<section class="card" id="justage" style="margin-bottom:1rem"><h2 style="margin:0">Justage</h2>
    <p class="sub" style="margin:.3rem 0 .6rem">Kennwerte sind Durchschnittswerte zu einem bestimmten Preisstand. Hier passt du sie an Ort und heutige Preise an – Bauteile mit eigenen Einheitspreisen bleiben unberührt.</p>
    <div class="row"><label>Regionalfaktor in %<input class="n" style="width:110px" data-ju="region" value="${fx(J.region, 1)}" inputmode="decimal" title="100 = Bundesdurchschnitt; z. B. aus den BKI-Regionalfaktoren für den Landkreis"></label>
      <label>Preisstand in %<input class="n" style="width:110px" data-ju="preis" value="${fx(J.preis, 1)}" inputmode="decimal" title="Baupreisindex heute ÷ Index zum Stand der Kennwerte × 100"></label>
      <span class="hint" style="align-self:flex-end;padding-bottom:.45rem">= Faktor ${fx(J.faktor, 3)} auf alle Kennwerte</span></div>
    ${bt ? `<div style="margin-top:.8rem"><b style="font-size:.9rem">Kostengruppen ohne Bauteile</b>
      <div class="tbl" style="margin:.4rem 0"><table><thead><tr><th>Gruppen mit Bauteilen</th><th class="r">Kennwert-Anteil</th><th class="r">Bauteile</th><th class="r">Abweichung</th></tr></thead>
        <tbody><tr><td>${Object.entries(B.calc.kg2 || {}).filter(([, x]) => x.quelle === 'bauteile').map(([k]) => k).join(', ')}</td><td class="r num">${eur(J.bt_kw)}</td><td class="r num">${eur(J.bt_wert)}</td><td class="r"${J.k && (J.k > 1.4 || J.k < 0.7) ? ' style="color:#e07b3a"' : ''}>${vglTxt(J.bt_wert, J.bt_kw)}</td></tr></tbody></table></div>${emp}
      <div style="display:flex;flex-direction:column;gap:.3rem">${rad('kw', 'Kennwert-Anteil unverändert', ' <span class="hint">– mischt zwei Preisniveaus, wenn der Faktor deutlich von 1 abweicht</span>')}
      ${rad('angl', `an die Bauteile angleichen (${J.k >= 1 ? '+' : '−'}${Math.abs(Math.round((J.k - 1) * 100))} %)`, ' <span class="hint">– unterstellt, dass die übrigen Gewerke ebenso abweichen</span>')}
      ${rad('eigen', 'eigener Faktor', ` <input class="n" style="width:80px;margin-left:.4rem" data-ju="f" value="${fx(ju.f || 1)}" inputmode="decimal" aria-label="eigener Faktor">`)}</div></div>` : ''}</section>`;
}

/* ---------- Laden / Speichern ---------- */
async function loadList(keep) {
  LIST = await api('api/bk');
  let want = keep;
  const gp = !keep && BPHead.projektId();   // Projekt aus der zuletzt benutzten App: dessen neueste Kostenermittlung
  if (gp) {
    const cur = LIST.find((x) => x.id === +localStorage.getItem('bk.cur'));
    const fit = cur && cur.project_id === gp ? cur : LIST.filter((x) => x.project_id === gp && !x.archived).concat(LIST.filter((x) => x.project_id === gp))[0];
    if (fit) want = fit.id;
    else { B = null; selBtn(); head(); render(); return; }   // kein fremdes Projekt zeigen – anbieten, eine anzulegen
  }
  want = want || +localStorage.getItem('bk.cur') || (LIST[0] && LIST[0].id);
  if (LIST.some((x) => x.id === want)) await openBk(want, !gp); else { B = null; selBtn(); render(); }
}
async function openBk(id, merken = true) {   // nicht „open“ nennen: das überschriebe window.open (PDF-Fenster)
  B = await api('api/bk/' + id);
  if (merken && B.project_id) BPHead.projektSetzen(B.project_id);   // gilt dann auch in den anderen Apps
  FLOW = null; CHECK = null; EST = null; selFile = B.files[0] ? B.files[0].id : null;
  asLoad(); if (localStorage.getItem(AS_KEY()) == null) { AS.open = true; asSave(); }   // beim ersten Öffnen startet der Assistent
  try { localStorage.setItem('bk.cur', id); } catch { /* egal */ }
  head(); render();
}
const saveEl = () => document.querySelector('#bph-vl .bph-vl-st') || $('#save');
const dkurz = (t) => (t ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
/* ---------- Versionsleiste: je Projekt eine Kostenermittlung, darin Versionen (Startversion, nach Bankgespräch …) ---------- */
function versionen() { return B ? (B.project_id ? LIST.filter((x) => x.project_id === B.project_id) : LIST.filter((x) => x.id === B.id)).sort((a, b) => a.id - b.id) : []; }
function vleiste() {
  if (!window.BPHead || !BPHead.versionsleiste) return;
  const ab = $('#ansBtn'); if (ab) { const leer = LIST.length < 2; ab.style.opacity = leer ? '.5' : '';   // immer sichtbar – ohne zweite Kostenermittlung grau, der Klick sagt warum
    ab.title = leer ? 'Es gibt noch keine andere Kostenermittlung, aus der sich etwas übernehmen ließe' : 'Kostenansätze (Kennwerte, Prozente, Pauschalen, Bauteile mit Einheitspreisen) aus der Kostenermittlung eines anderen Projekts übernehmen'; }
  let pd = $('#bkPrD');
  if (!pd) { pd = document.createElement('button'); pd.id = 'bkPrD'; pd.className = 'btn sm'; pd.type = 'button'; pd.textContent = '🏗 Projektdaten'; pd.title = 'Bauherr, Projektbeschreibung, Termine – dieselbe Maske wie in Verwaltung und AVA'; pd.onclick = () => { if (B && B.project_id) BPHead.projektDaten(B.project_id); else toast('Diese Kostenermittlung ist keinem Projekt zugeordnet.', true); }; }
  pd.style.display = B && B.project_id ? '' : 'none';
  const V = versionen(), G = V.find((x) => x.gueltig);
  const O = { aktuell: B && B.id, gueltig: B && B.project_id && G ? G.id : null,
    liste: V.map((x) => ({ id: x.id, name: x.name, datum: dkurz(x.updated), wer: x.updated_by, archiviert: x.archived })),
    onWahl: async (id) => { clearTimeout(saveT); if (B) await saveNow().catch(() => {}); await openBk(+id); },
    onGueltig: B && B.project_id ? bkGilt : null,
    onNeu: neueVersion, onUmbenennen: umbenennen, onVerlauf: verlauf, onVerwalten: verwalten };
  // kompaktes Versionsmenü wie in AVA und Bauzeitenplan: eine Zeile mit Version, Drucken, Ansätze, Projektdaten
  const el = BPHead.versionsleiste({ vor: $('main.wrap'), ...O }); el.style.display = 'none';
  const top = $('.top'); top.hidden = !B;
  let vm = $('#bkVm'); if (!vm) { vm = document.createElement('div'); vm.id = 'bkVm'; vm.className = 'bk-vm'; top.insertBefore(vm, top.firstChild); }
  [pd, $('#pdfBtn'), ab].forEach((b) => { if (b && b.parentNode !== top) top.insertBefore(b, $('#save')); });
  if (BPHead.versionsMenue) BPHead.versionsMenue({ ...O, in: vm });
}
async function bkGilt(id, schon) {
  const x = LIST.find((y) => y.id === +id); if (!x) return;
  if (!schon && window.bpFrage && !(await bpFrage(`„${x.name}“ gilt ab jetzt als Kostenermittlung des Projekts (Kostenkontrolle, To-dos).`, { ok: 'Gilt ab jetzt' }))) return;
  try { await api('api/bk/' + id + '/gueltig', 'PUT'); LIST = await api('api/bk'); vleiste(); toast('Diese Kostenermittlung gilt jetzt.'); } catch (e) { toast(e.message, true); }
}
function neueVersion() {
  if (!B) return;
  modalBox(`<h3>Neue Version</h3><p class="hint" style="margin:0 0 .7rem">Kopie von „${esc(B.name)}“ mit allen Räumen, Bauteilen, Kosten und Plänen. Danach arbeitest du in der neuen Version weiter, die alte bleibt, wie sie ist.</p>
    <div class="row" style="flex-direction:column;align-items:stretch"><label for="nvName">Name der Version</label><input id="nvName" maxlength="120" placeholder="z. B. nach Bauherrengespräch"></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    const name = bg.querySelector('#nvName').value.trim(); if (!name) { bg.querySelector('#nvName').focus(); return; }
    btn.disabled = true;
    try { clearTimeout(saveT); await saveNow(); const r = await api(`api/bk/${B.id}/kopie`, 'POST', { name }); close(); toast(`Version „${name}“ angelegt.`); await loadList(r.id); }
    catch (e) { btn.disabled = false; toast(e.message, true); }
  });
  setTimeout(() => { const i = document.querySelector('#nvName'); if (i) i.focus(); }, 50);
}
function umbenennen() {
  if (!B) return;
  modalBox(`<h3>Version umbenennen</h3><p class="hint" style="margin:0 0 .7rem">Nur der Name der Version – das Projekt steht oben in der Kopfleiste.</p>
    <div class="row" style="flex-direction:column;align-items:stretch"><label for="rnName">Name der Version</label><input id="rnName" maxlength="120" value="${esc(B.name)}"></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    const name = bg.querySelector('#rnName').value.trim(); if (!name) return;
    close(); clearTimeout(saveT); await saveNow({ name }); B.name = name; const x = LIST.find((y) => y.id === B.id); if (x) x.name = name; vleiste();
  });
  setTimeout(() => { const i = document.querySelector('#rnName'); if (i) { i.focus(); i.select(); } }, 50);
}
const STUFE_N = (k) => (STUFEN.find((x) => x[0] === k) || [k, ''])[1];
const bkSub = (x) => [STUFE_N(x.stufe), x.project ? [x.project.client, x.project.address].filter(Boolean).join(' · ') : '', x.archived ? 'archiviert' : ''].filter(Boolean).join(' · ');
/* Das Projekt steht oben in der Kopfleiste – die App zeigt dessen Kostenermittlung, eine eigene Auswahl gibt es nicht */
function selBtn() { /* keine zweite Auswahl mehr */ }
if (window.BPHead && BPHead.beiProjektWahl) BPHead.beiProjektWahl(async (id) => {   // Projekt oben gewählt: dessen Kostenermittlung
  clearTimeout(saveT); if (B) await saveNow().catch(() => {});
  LIST = await api('api/bk'); const fit = LIST.filter((x) => x.project_id === id && !x.archived).concat(LIST.filter((x) => x.project_id === id))[0];
  if (fit) await openBk(fit.id, false); else { B = null; selBtn(); head(); render(); }
});
function head() {
  if (B || LIST) selBtn();
  // ohne Kostenermittlung: nur „anlegen“ (hidden reicht bei .btn nicht – display kommt aus dem CSS)
  $('#tabs').style.display = B ? '' : 'none';
  vleiste();
  if (!window.BPHead) return;
  if (B && B.project_id) BPHead.projektSetzen(B.project_id);   // Kopfleiste zeigt das Projekt
}
function changed(redraw = true) {
  B.calc = calc(B.data); FLOW = null;
  saveEl().textContent = 'Nicht gespeichert …';
  clearTimeout(saveT); saveT = setTimeout(saveNow, 700);
  if (redraw) setTimeout(render, 0);   // erst nach dem Fokuswechsel neu zeichnen, damit Tab weiterspringt
}
function sigOf(el) {   // Selektor für das Eingabefeld, um den Fokus nach dem Neuzeichnen wiederherzustellen
  if (!el || el === document.body || !$('#view').contains(el)) return null;
  const at = [...el.attributes].filter((a) => a.name.startsWith('data-') && a.name !== 'data-own').map((a) => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  if (!at) return null;
  const row = el.closest('[data-row]');
  return (row ? `[data-row="${row.dataset.row}"] ` : '') + el.tagName.toLowerCase() + at;
}
async function saveNow(extra = {}) {
  if (!B || saving) return; saving = true;
  try {
    const r = await api('api/bk/' + B.id, 'PUT', { rev: B.rev, data: B.data, ...extra });
    B.rev = r.rev; B.updated_by = r.updated_by; B.acc = r.acc; B.reife = r.reife; const rb = $('#reifeBox'); if (rb) rb.innerHTML = reifeHtml(); if (r.quellen) B.quellen = r.quellen; const ab = $('#accBox'); if (ab) ab.innerHTML = accHtml(); assist(); if (extra.stufe || extra.gantt_id !== undefined || extra.project_id !== undefined || extra.archived !== undefined || extra.name) { Object.assign(B, r); head(); }
    const d = new Date(); saveEl().textContent = `✓ gespeichert ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    saveEl().textContent = 'Nicht gespeichert';
    if (/geändert/.test(e.message)) { toast(e.message + ' Der neue Stand wird geladen.', true); await openBk(B.id); }
    else toast('Speichern fehlgeschlagen: ' + e.message, true);
  } finally { saving = false; }
}

/* ---------- Oberfläche ---------- */
function render() {
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}"${k === tab ? ' aria-current="page"' : ''}>${l}${k === 'pruefung' && CHECK ? ` <span class="pill y">${CHECK.hinweise.length}</span>` : ''}</button>`).join('');
  const v = $('#view'), sig = sigOf(document.activeElement);
  if (!B) { const gp = window.BPHead && BPHead.projekt;
    v.innerHTML = `<div class="card empty"><p><b>${gp && gp.id ? `Für ${esc(gp.name)} gibt es noch keine Kostenermittlung.` : 'Noch keine Kostenermittlung.'}</b></p><p class="hint">Mit einem Grundriss (PDF), von Hand oder mit dem Assistenten – sie wird gleich mit dem Projekt verknüpft.</p><button class="btn pri" data-act="new">Kostenermittlung anlegen</button></div>`; return; }
  v.innerHTML = { uebersicht: vUebersicht, plaene: vPlaene, bauteile: vBauteile, kosten: vKosten, mittel: vMittel, pruefung: vPruefung }[tab]();
  if (sig) { const n = document.querySelector(sig); if (n) n.focus(); }
  histTrack();
  zmInit(); pwInit();
  document.body.classList.toggle('pv-seite', tab === 'plaene' && pvMode() === 'seite');
  assist();
  if (tab === 'mittel' || tab === 'uebersicht') ensureFlow();
}
function vUebersicht() {
  const c = B.calc, max = Math.max(1, ...c.types.map((t) => t.sum));
  if (!B.data.rooms.length) {   // noch leer: statt 0-€-Kacheln den Einstieg zeigen
    return `<section class="card" style="padding:1.6rem 1.6rem 1.4rem"><h2 style="font-size:1.3rem">Los geht's mit „${esc(B.name)}“</h2>
      <p class="sub" style="max-width:640px">Für eine erste Summe reicht ein Grundriss als PDF. Räume, Flächen und Nutzungen liest die App daraus, die Kosten rechnet sie mit Kennwerten je Raumtyp.</p>
      <div class="drop bk-drop" role="button" tabindex="0" style="margin:.6rem 0 .7rem;max-width:640px">+ Grundriss hierher ziehen oder klicken<br><small>Vektor-PDF (Grundrisse, Ansichten, Schnitte), IFC-Modell mit Räumen und Bauteilen oder DXF-Grundriss mit Raumpolygonen – z. B. aus Allplan</small></div>
      <div class="row" style="gap:.6rem;margin-top:.4rem"><button class="btn" data-act="firstRoom">Räume von Hand eintragen</button>${AS.open ? '' : '<button class="btn" data-act="openAssist">Mit dem Assistenten</button>'}</div></section>`;
  }
  return `<div class="kpis">
    <div class="card kpi"><span class="lbl">Bauwerk KG 300 + 400</span><b class="num">${eur(c.bauwerk)}</b><span>${B.data.rooms.length} Räume × Kennwerte</span></div>
    <div class="card kpi"><span class="lbl">Gesamt netto</span><b class="num">${eur(c.total)}</b><span>${B.acc ? `wahrscheinlich ${eur(B.acc.low)} – ${eur(B.acc.high)}` : 'inkl. Positionen und ' + pct(B.data.nk) + ' Nebenkosten'}</span></div>
    <div class="card kpi"><span class="lbl">Raumfläche</span><b class="num">${m2(c.area)} m²</b><span>${B.files.length} Pläne</span></div>
    <div class="card kpi"><span class="lbl">Kennwert</span><b class="num">${eur(c.kw)}</b><span>je m² Raumfläche, KG 300 + 400</span></div></div>
  <section class="card" style="margin-bottom:1.2rem" id="reifeBox">${reifeHtml()}</section>
  <div class="two">
    <section class="card"><h2>Kosten nach Raumtyp</h2><p class="sub">Fläche × Kennwert</p><div class="bars">${c.types.filter((t) => t.n).map((t) => `
      <div class="bar"><div class="t"><span>${esc(t.label)} <span class="mute">· ${m2(t.area)} m²</span></span><span class="num">${eur(t.sum)}</span></div><div class="tr"><div class="f" style="width:${(t.sum / max * 100).toFixed(1)}%"></div></div></div>`).join('') || '<p class="hint">Noch keine Räume – unter „Pläne & Raumbuch“ einen Grundriss hochladen.</p>'}</div></section>
    <section class="card"><h2>Mittelabfluss je Monat</h2><p class="sub">${B.gantt ? 'aus dem Bauzeitenplan „' + esc(B.gantt.name) + '“' : 'kein Bauzeitenplan verknüpft'}</p><div id="miniFlow">${flowCols(true)}</div></section>
  </div>
  <section class="card" style="margin-top:1.2rem" id="accBox">${accHtml()}</section>
  <section class="card alert"><b>Plausibilitätsprüfung</b><span class="fill">${CHECK ? CHECK.hinweise.length + ' Hinweise' : 'Regeln und – je nach KI-Auswahl oben – Hinweise der KI'}</span><button class="btn" data-act="goCheck">Prüfen</button></section>`;
}
/* Wofür reichen die Daten? – ergibt sich aus den Eingaben (dieselben Regeln wie die Prüfung); die Stufe wählt man erst beim Prüfen und Drucken */
function reifeHtml() {
  const R0 = B.reife; if (!R0) return '<h2>Wofür reichen die Daten?</h2><p class="hint">Wird beim nächsten Speichern ermittelt.</p>';
  const I = STUFE_INFO, nx = R0.stufen.find((x) => !x.ok), sp = (x) => STUFE_INFO[x.key].lph.split(' · ')[0];
  return `<h2>Wofür reichen die Daten?</h2><p class="sub">Ergibt sich von selbst aus dem, was eingegeben ist. Die Stufe nach DIN 276 wählst du erst beim Prüfen und beim Drucken.</p>
    <div class="reife">${R0.stufen.map((x) => `<div class="rf ${x.ok ? 'ok' : ''}${x.key === R0.reicht ? ' cur' : ''}">${x.key === R0.reicht ? '<span class="pin">reicht für</span>' : ''}<b>${x.ok ? '✓' : '○'} ${esc(x.name)}</b><span>${esc(sp(x))} · ± ${I[x.key].genau} %</span></div>`).join('')}</div>
    ${nx ? `<p style="margin:.7rem 0 .2rem"><b>Für ${esc(nx.name === 'Kostenrahmen' ? 'den Kostenrahmen' : 'die ' + nx.name)} fehlt noch:</b></p><ul class="rfl">${nx.fehlt.slice(0, 6).map((f, k) => `<li>${esc(f.text)}${f.go && f.go.tab ? ` – <a href="#" data-rgo="${R0.stufen.indexOf(nx)}:${k}">zu „${esc((TABS.find((t) => t[0] === f.go.tab) || [, ''])[1])}“</a>` : ''}</li>`).join('')}${nx.fehlt.length > 6 ? `<li class="hint">und ${nx.fehlt.length - 6} weitere – siehe Prüfung</li>` : ''}</ul>` : '<p class="hint" style="margin:.6rem 0 0">Die Daten reichen für alle Stufen. Ob es ein Kostenvoranschlag, -anschlag oder eine -feststellung ist, hängt davon ab, woher die Beträge stammen (LV, Angebote, Rechnungen).</p>'}`;
}
function accHtml() {
  const a = B.acc; if (!a) return '';
  const t = B.calc.total, lo = a.low, hi = a.high, span = hi - lo || 1, x = (v) => Math.max(0, Math.min(100, (v - lo) / span * 100));
  return `<h2>Wie genau ist die Summe?</h2><p class="sub">Wahrscheinlich zwischen <b class="num" style="color:var(--ink)">${eur(lo)}</b> und <b class="num" style="color:var(--ink)">${eur(hi)}</b>
    (−${pct(a.lo_pct)} / +${pct(a.hi_pct)}) – <b style="color:var(--ink)">${esc(a.urteil)}</b>. Nach oben größer, weil Offenes die Kosten eher erhöht.</p>
    <div class="band" aria-hidden="true"><i style="left:0;right:0"></i><b style="left:calc(${x(t)}% - 1px)"></b></div>
    <div class="legend" style="justify-content:space-between;margin:0 0 .6rem"><span>${eur(lo)}</span><span>Summe ${eur(t)}</span><span>${eur(hi)}</span></div>
    <div class="acc">${a.faktoren.map((f) => `<div class="fx"><span>${esc(f.text)}${f.tipp ? `<small>${esc(f.tipp)}</small>` : ''}</span><span class="num" style="white-space:nowrap${f.plus < 0 ? ';color:var(--ok)' : ''}">${f.plus < 0 ? '− ' + pct(-f.plus) : (f.oben ? '+' : '±') + ' ' + pct(f.plus)}</span></div>`).join('')}</div>`;
}
function flowCols(mini) {
  if (!B.gantt_id) return '<p class="hint">Unter „Mittelabfluss“ einen Bauzeitenplan wählen.</p>';
  if (!FLOW) return '<p class="hint">Lade …</p>';
  if (!FLOW.ok) return `<p class="hint">${esc(FLOW.why)}</p>`;
  const M = FLOW.months, max = Math.max(1, ...M.map((m) => Math.max(m.amount, m.idx))), H = mini ? 140 : 180;
  return `<div class="cols" style="height:${H + 16}px">${M.map((m) => `<div title="${ym(m.ym)}: ${eur(m.amount)} · mit Index ${eur(m.idx)}"><div class="c" style="height:${Math.round(m.amount / max * H)}px"></div><div class="c i" style="height:${Math.round(m.idx / max * H)}px"></div></div>`).join('')}</div>
    <div class="axis">${M.map((m, i) => `<span>${M.length > 14 && i % 2 ? '' : ym(m.ym)}</span>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--y)"></i>ohne Preissteigerung</span><span><i style="border:2px solid var(--ink);opacity:.6"></i>mit Baupreisindex ${pct(B.data.rate)} p. a.</span></div>`;
}
async function ensureFlow() {
  if (FLOW || !B.gantt_id) return;
  try { FLOW = await api(`api/bk/${B.id}/flow`); } catch (e) { FLOW = { ok: false, why: e.message }; }
  if (tab === 'uebersicht') { const el = $('#miniFlow'); if (el) el.innerHTML = flowCols(true); } else if (tab === 'mittel') render();
}
// Bauzeitenplan geändert (z. B. in einem anderen Tab)? Beim Zurückkommen und alle 2 Minuten neu rechnen
const flowRefresh = () => { if (!B || !B.gantt_id || document.hidden || !['mittel', 'uebersicht'].includes(tab)) return; FLOW = null; ensureFlow(); };
document.addEventListener('visibilitychange', flowRefresh);
addEventListener('focus', flowRefresh);
setInterval(flowRefresh, 120000);
function vPlaene() {
  const f = B.files.find((x) => x.id === selFile), rooms = B.data.rooms;
  const dup = {}; rooms.forEach((r) => { if (r.nr) { const k = r.floor + '|' + r.nr; dup[k] = (dup[k] || 0) + 1; } });
  const typeOpts = (sel) => Object.entries(B.data.types).map(([k, t]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${esc(t.label)}</option>`).join('');
  const open = rooms.filter((r) => !r.ok).length;
  return `<div class="layout"><aside class="side bk-plaene"><span class="hint" style="text-transform:uppercase;letter-spacing:.04em">Pläne</span><div class="files">${B.files.map((x) => `
    <div class="card fc ${x.id === selFile ? 'on' : ''}" data-file="${x.id}" tabindex="0" role="button" aria-pressed="${x.id === selFile}"><b>${esc(x.meta.kind ? x.meta.kind + ' · ' : '')}${esc(x.name)}</b><small>${esc(x.meta.note || '')}</small>
      <div class="acts"><a class="btn sm" href="api/bk/${B.id}/files/${x.id}" data-ansehen="pdf" data-name="${esc(x.name)}">PDF</a>${x.meta.kind !== 'Ansicht' && x.meta.kind !== 'Schnitt' ? `<button class="btn sm${x.meta.found ? '' : ' pri'}" data-kiroom="${x.id}" title="Räume mit der oben gewählten KI aus dem Planbild lesen – für Pläne, deren Beschriftung nicht als Text vorliegt">✨ KI lesen</button>` : ''}${x.meta.found ? '' : `<button class="btn sm" data-reread="${x.id}" title="Plan mit der aktuellen Erkennung erneut auswerten">Neu einlesen</button>`}<button class="btn sm danger" data-delfile="${x.id}">Entfernen</button></div></div>`).join('')}
    <div class="drop" id="drop" role="button" tabindex="0">+ PDF, IFC oder DXF hinzufügen<br><small>Vektor-PDF (Grundrisse, Ansichten, Schnitte), IFC-Modell mit Räumen und Bauteilen oder DXF-Grundriss mit Raumpolygonen – z. B. aus Allplan</small></div></div>
    <p class="hint">Räume (Name und m², mit oder ohne Nummer) werden aus Vektor-PDFs exakt gelesen. Der Raumtyp ist ein Vorschlag – bitte jeden Raum bestätigen. Plan: Mausrad zoomt, ziehen verschiebt.</p></aside>
  ${(() => {
    const PV = pvMode(), plan = f ? `<div class="plan card" id="planBox" style="padding:0" title="Mausrad oder zwei Finger: zoomen · ziehen: verschieben · Doppelklick: vergrößern"><div class="pz" id="pz"><img src="api/bk/${B.id}/files/${f.id}/preview.png" alt="Vorschau ${esc(f.name)}" draggable="false">${rooms.filter((r) => r.src === 'pdf:' + f.id && r.pos).map((r) => `<span class="mk ${dup[r.floor + '|' + r.nr] > 1 ? 'warn' : r.ok ? 'ok' : ''} ${r.id === selRoom ? 'sel' : ''}" style="left:${r.pos[0] * 100}%;top:${r.pos[1] * 100}%" title="${esc(r.nr + ' ' + r.name)}" data-mk="${r.id}">${esc(r.nr || '•')}</span>`).join('')}</div>
    <div class="pzc"><button type="button" data-zm="-" aria-label="Verkleinern">−</button><span id="pzp">100 %</span><button type="button" data-zm="+" aria-label="Vergrößern">+</button><button type="button" data-zm="0" aria-label="Ganzer Plan" title="Ganzer Plan">⤢</button></div></div>` : '';
    const modes = f ? `<div class="pmodes" role="group" aria-label="Anordnung des Plans">${[['oben', '▭', 'Plan über dem Raumbuch'], ['seite', '◫', 'Geteilte Ansicht: Plan neben dem Raumbuch'], ['fenster', '⧉', 'Plan in einem frei beweglichen Fenster']].map(([k, i, t]) => `<button type="button" data-pmode="${k}" class="${PV === k ? 'on' : ''}" title="${t}" aria-pressed="${PV === k}">${i}</button>`).join('')}</div>` : '';
    if (PV === 'fenster' && f) { const g = pwGeo(); return `<div class="pwin" id="pwin" style="left:${g.l}px;top:${g.t}px;width:${g.w}px;height:${g.h}px"><div class="pwh" id="pwh"><b>${esc(f.name)}</b>${modes}<button type="button" class="pwx" data-pmode="oben" title="Fenster schließen – Plan wieder über dem Raumbuch" aria-label="Fenster schließen">✕</button></div>${plan}</div><div class="main">`; }
    if (PV === 'seite' && f) return `<div class="main split" data-bph-trenn-ab="901" data-bph-trenn="bk" data-bph-trenn-min="320" data-bph-trenn-max="0.75"><div class="sp-r">${modes}${plan}</div><div class="sp-l">`;
    return `<div class="main">${f ? `<div class="pbar">${modes}</div>` : ''}${plan}`;
  })()}
    <div class="row"><b>Raumbuch</b><span class="hint">${rooms.length} ${rooms.length === 1 ? 'Raum' : 'Räume'} · ${m2(B.calc.area)} m²${volume() ? ` · ${m2(volume()).replace(/,\d+$/, '')} m³` : ''}${open ? ` · ${open} offen` : ''}</span><span style="flex:1"></span>${open ? '<button class="btn sm" data-act="okAll">Alle bestätigen</button>' : ''}<button class="btn sm" data-act="ausTyp" title="Boden, Wand und Decke je Raumtyp aus dem Bauteil-Baukasten – daraus entstehen unter „Bauteile & Material“ die Mengen und Preise">Ausstattung je Raumtyp …</button><button class="btn sm" data-act="addRoom">+ Raum</button></div>
    ${hoehenInfo()}
    ${rooms.length ? `<div class="alle hint">Für alle Räume setzen: <select data-alle="std" aria-label="Standard für alle"><option value="-">Standard …</option>${STD_L.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <select data-alle="mass" aria-label="Maßnahme für alle"><option value="-">Maßnahme …</option>${MASS_L.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <span>Standard und Maßnahme gewichten den Kennwert des Raumtyps, Besonderheiten liest die KI bei Bauteilen und Prüfung mit.</span></div>` : ''}
    <div class="tbl"><table><thead><tr><th title="Geschoss – aus dem Plan erkannt oder eingetragen (z. B. KG, EG, 1.OG, DG)">Geschoss</th><th>Nr.</th><th>Raum</th><th>Raumtyp</th><th class="r">Fläche m²</th><th class="r" title="Umfang des Raums (aus IFC/DXF oder eingetragen) – für die Wandflächen; leer = aus der Fläche geschätzt">Umfang m</th><th title="Boden, Wand und Decke aus dem Bauteil-Baukasten – leer = Ausstattung des Raumtyps">Ausstattung</th><th class="r" title="Geschosshöhe (Fertigfußboden bis Fertigfußboden) – aus dem Schnitt oder eingetragen">Höhe m</th><th title="Ausbaustandard – Faktor auf den Kennwert: einfach 0,85 · mittel 1 · gehoben 1,2 · hoch 1,45">Standard</th><th title="Maßnahme – Faktor auf den Kennwert: Neubau 1 · Umbau 0,8 · Sanierung 0,6 · Bestand bleibt 0">Maßnahme</th><th title="z. B. Fußbodenheizung, Fliesen raumhoch, Akustikdecke – hilft der KI bei Bauteilen und Prüfung">Besonderheiten</th><th>Status</th><th></th></tr></thead><tbody>${rooms.map((r, i) => `
      <tr data-row="${i}" class="${r.id === selRoom ? 'sel' : ''} ${dup[r.floor + '|' + r.nr] > 1 ? 'warn' : ''}"><td><input class="n" style="width:72px;text-align:left" value="${esc(r.floor || '')}" data-f="floor" list="bkGeschosse" placeholder="EG" aria-label="Geschoss"></td><td><input class="n" style="width:64px;text-align:left" value="${esc(r.nr)}" data-f="nr" aria-label="Nummer"></td>
      <td><input class="w" value="${esc(r.name)}" data-f="name" aria-label="Raumname">${dup[r.floor + '|' + r.nr] > 1 ? '<span class="wn">Raumnummer doppelt</span>' : ''}</td>
      <td><select data-f="typ" aria-label="Raumtyp">${typeOpts(r.typ)}</select></td>
      <td class="r"><input class="n" value="${m2(r.area)}" data-f="area" inputmode="decimal" aria-label="Fläche"></td>
      <td class="r"><input class="n" style="width:58px" value="${r.umfang ? m2(r.umfang) : ''}" placeholder="${r.area ? m2(4 * Math.sqrt(r.area)).replace(/,\d+$/, '') : ''}" data-f="umfang" inputmode="decimal" aria-label="Umfang" title="leer = aus der Fläche geschätzt (quadratisch)"></td>
      <td><button class="btn sm" data-ausr="${i}" title="${esc(ausTitel(r))}" style="white-space:nowrap">${ausKurz(r)}</button></td>
      <td class="r">${(() => { const a = hAuto(r); return `<input class="n" style="width:64px" value="${r.h ? String(r.h).replace('.', ',') : ''}" placeholder="${a.v ? String(a.v).replace('.', ',') : '–'}" title="${esc(r.h ? 'eigener Wert – leeren übernimmt wieder ' + (a.v ? String(a.v).replace('.', ',') + ' m (' + a.src + ')' : 'den Standard') : a.v ? a.src : 'Höhe eintragen – der erste Wert gilt für alle Räume, bis du ihn änderst')}" data-h="${i}" inputmode="decimal" aria-label="Höhe">`; })()}</td>
      <td><select data-f="std" aria-label="Standard" class="${r.std ? 'set' : ''}">${STD_L.map(([k, l]) => `<option value="${k}"${(r.std || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><select data-f="mass" aria-label="Maßnahme" class="${r.mass ? 'set' : ''}">${MASS_L.map(([k, l]) => `<option value="${k}"${(r.mass || '') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><input class="w nz" value="${esc(r.notiz || '')}" data-f="notiz" placeholder="z. B. Fußbodenheizung" aria-label="Besonderheiten" maxlength="500"></td>
      <td><button class="okb ${r.ok ? 'on' : ''}" data-ok="${i}">${r.ok ? '✓ Bestätigt' : 'Prüfen'}</button></td>
      <td><button class="btn sm" data-delroom="${i}" aria-label="Raum löschen" title="Raum löschen">✕</button></td></tr>`).join('') || '<tr><td colspan="13" class="empty">Noch keine Räume.</td></tr>'}</tbody>
      <tfoot><tr><td></td><td></td><td>Summe</td><td></td><td class="r num">${m2(B.calc.area)}</td><td></td><td></td><td class="r num" title="Raumvolumen (Fläche × Höhe)">${volume() ? m2(volume()).replace(/,\d+$/, '') + ' m³' : ''}</td><td colspan="5"></td></tr></tfoot></table><datalist id="bkGeschosse">${[...new Set(['UG', 'KG', 'EG', '1.OG', '2.OG', '3.OG', 'DG', 'SB', ...rooms.map((x) => x.floor).filter(Boolean)])].map((g) => `<option value="${esc(g)}">`).join('')}</datalist></div>${pvMode() === 'seite' && f ? '</div>' : ''}</div></div>`;
}
/* Anordnung des Plans beim Raumbuch: oben · nebeneinander (geteilte Ansicht) · eigenes Fenster (frei beweglich, Größe änderbar) */
const pvMode = () => { try { const v = localStorage.getItem('bk.planAnsicht'); return ['seite', 'fenster'].includes(v) ? (v === 'seite' && innerWidth < 900 ? 'oben' : v) : 'oben'; } catch { return 'oben'; } };
function pwGeo() {
  let g = null; try { g = JSON.parse(localStorage.getItem('bk.planFenster')); } catch { /* egal */ }
  const w = Math.min(innerWidth - 16, Math.max(320, (g && g.w) || Math.round(innerWidth * 0.45))), h = Math.min(innerHeight - 16, Math.max(240, (g && g.h) || Math.round(innerHeight * 0.6)));
  return { w, h, l: Math.max(0, Math.min(innerWidth - 120, (g && g.l) ?? innerWidth - w - 24)), t: Math.max(0, Math.min(innerHeight - 60, (g && g.t) ?? 90)) };
}
function pwSave() { const w = $('#pwin'); if (!w) return; const r = w.getBoundingClientRect(); try { localStorage.setItem('bk.planFenster', JSON.stringify({ l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) })); } catch { /* egal */ } }
function pwInit() {
  const w = $('#pwin'); if (!w) return;
  const h = $('#pwh');
  h.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    const r = w.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; h.setPointerCapture(e.pointerId);
    const mv = (ev) => { w.style.left = Math.max(-r.width + 80, Math.min(innerWidth - 80, ev.clientX - dx)) + 'px'; w.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + 'px'; };
    const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); pwSave(); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
  });
  let t = 0; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { pwSave(); zmApply(); }, 200); }).observe(w);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pmode]'); if (!b) return;
  try { localStorage.setItem('bk.planAnsicht', b.dataset.pmode); } catch { /* egal */ }
  render();
});
// Höhen: eigener Wert am Raum, sonst Geschosshöhe aus dem Schnitt, sonst die zuerst eingetragene Höhe (gilt für alle)
function floorKey(n) {
  n = String(n || '').toLowerCase();
  for (const [k, rx] of [['SB', /spitzboden|\bsb\b/], ['DG', /dach|\bdg\b/], ['SG', /staffel|\bsg\b/], ['2.OG', /2\.?\s*(og|ober)/], ['3.OG', /3\.?\s*(og|ober)/], ['OG', /ober|\bog\b|1\.?\s*og/], ['EG', /erd|\beg\b/], ['KG', /keller|\bkg\b/], ['UG', /unter|\bug\b|souterrain/]]) if (rx.test(n)) return k;
  return '';
}
function hAuto(r) {
  const H = B.data.hoehen || {}, k = floorKey(r.floor);
  if (k && H[k]) return { v: H[k], src: `Geschosshöhe ${k} aus dem Schnitt` };
  if (B.data.hoehe_std) return { v: B.data.hoehe_std, src: 'Standard (zuerst eingetragene Höhe)' };
  return { v: 0, src: '' };
}
const hOf = (r) => r.h || hAuto(r).v || 0;
const volume = () => B.data.rooms.reduce((a, r) => a + (+r.area || 0) * hOf(r), 0);
function hoehenInfo() {
  const H = B.data.hoehen || {}, ks = Object.keys(H);
  return `<p class="hint" style="margin:.2rem 0 .6rem">${ks.length ? 'Geschosshöhen aus dem Schnitt: ' + ks.map((k) => `<b>${esc(k)}</b> ${String(H[k]).replace('.', ',')} m`).join(' · ') + '. ' : 'Keine Höhen aus einem Schnitt – Schnitt mit Höhenkoten (z. B. „OKFF EG = +0,70“) hochladen oder Höhe eintragen. '}${B.data.hoehe_std ? `Standard für alle übrigen Räume: <b>${String(B.data.hoehe_std).replace('.', ',')} m</b> <a href="#" data-act="hstdClear">ändern</a>.` : 'Die erste eingetragene Höhe gilt für alle Räume, bis du sie änderst.'}</p>`;
}
const KG2 = [['310', 'Baugrube / Erdbau'], ['320', 'Gründung, Unterbau'], ['330', 'Außenwände / Vertikale Baukonstruktionen, außen'], ['340', 'Innenwände / Vertikale Baukonstruktionen, innen'],
  ['350', 'Decken / Horizontale Baukonstruktionen'], ['360', 'Dächer'], ['370', 'Infrastrukturanlagen'], ['380', 'Baukonstruktive Einbauten'], ['390', 'Sonstige Maßnahmen für Baukonstruktionen'],
  ['410', 'Abwasser-, Wasser-, Gasanlagen'], ['420', 'Wärmeversorgungsanlagen'], ['430', 'Raumlufttechnische Anlagen'], ['440', 'Elektrische Anlagen'],
  ['450', 'Kommunikations-, sicherheits- und informationstechnische Anlagen'], ['460', 'Förderanlagen'], ['470', 'Nutzungsspezifische und verfahrenstechnische Anlagen'],
  ['480', 'Gebäude- und Anlagenautomation'], ['490', 'Sonstige Maßnahmen für technische Anlagen']];
const sum2 = (g) => Object.entries(B.data.kg2 || {}).filter(([k]) => k[0] === g).reduce((a, [, v]) => a + (+v || 0), 0);
let EST = null, estBusy = false;
function estHtml() {
  const open = B.data.items.filter((i) => i.amount == null).length, ki = window.BPHead ? BPHead.provider() : { key: 'intern', label: 'Intern' };
  let h = `<section class="card" style="margin-bottom:1.2rem" id="estBox"><div class="row"><div style="flex:1;min-width:240px"><h2>Fehlendes schätzen</h2>
    <p class="sub" style="margin:0">${open ? open + ' Kostengruppen sind noch offen.' : 'Keine offenen Kostengruppen.'} Faustwerte (Intern)${ki.key !== 'intern' ? ' und ' + esc(ki.label) + ' im Vergleich' : ' – für einen Vergleich oben eine KI wählen'}, jeweils mit Spanne.</p></div>
    <button class="btn pri" data-act="estimate"${estBusy ? ' disabled' : ''}>${estBusy ? 'Schätze …' : EST ? 'Neu schätzen' : 'Jetzt schätzen'}</button><button class="btn ki" data-act="estimateKi"${estBusy ? ' disabled' : ''} title="Zusätzlich mit KI schätzen">✨ mit KI</button>${EST ? '<button class="btn" data-act="estZu" title="Vorschläge ausblenden – übernommen ist nur, was du mit „Übernehmen“ bestätigt hast">✕ Vorschläge schließen</button>' : ''}</div>`;
  if (EST) {
    if (EST.note) h += `<p class="hint" style="color:#e07b3a">${esc(EST.note)}</p>`;
    /* ohne Bauwerkskosten sind die Faustwerte (Prozente davon) alle 0 € – das sagen statt leere Vorschläge anbieten */
    const leer = EST.vorschlaege.length && EST.vorschlaege.every((v) => !(v.value > 0));
    if (leer) h += '<p class="hint" style="margin:.8rem 0 0">Es gibt noch keine Bauwerkskosten (KG 300 + 400) – die Faustwerte sind Prozente davon und wären alle 0 €. Erst unter <a href="#" data-tab="plaene">Pläne &amp; Raumbuch</a> Räume mit Flächen erfassen, dann hier neu schätzen.</p>';
    const by = {}; (leer ? [] : EST.vorschlaege).forEach((v, n) => { (by[v.kg] ||= []).push([v, n]); });
    h += Object.entries(by).map(([kg, vs]) => `<h3 style="margin:1rem 0 .5rem;font-size:.95rem">KG ${esc(kg)} ${esc(vs[0][0].name)}</h3><div class="est">${vs.map(([v, n]) => `
      <div class="card ec"><span class="src">${esc(v.src)}</span><span class="v num">${eur(v.value)}</span><span class="sp">Spanne ${eur(v.low)} – ${eur(v.high)} <span class="sich ${v.sicher}">Sicherheit ${esc(v.sicher)}</span></span>
      <p class="hint" style="margin:.2rem 0">${esc(v.basis)}</p><div><button class="btn sm" data-take="${n}">Übernehmen</button></div></div>`).join('')}</div>`).join('');
    h += EST.kg2.map((k, n) => `<h3 style="margin:1rem 0 .5rem;font-size:.95rem">Aufteilung auf die 2. Ebene · <span class="src" style="color:var(--y)">${esc(k.src)}</span></h3>
      <p class="hint" style="margin:0 0 .4rem">${esc(k.basis)}: ${Object.entries(k.werte).map(([a, b]) => a + ' ' + b + ' %').join(' · ')}</p><button class="btn sm" data-takekg2="${n}">Aufteilung übernehmen</button>`).join('');
    h += `<div class="card" style="margin-top:1rem;background:var(--hov)"><b>Wie gut ist welche Schätzung?</b>${Object.entries(EST.guete).map(([k, t]) => `<p class="hint" style="margin:.35rem 0 0"><b style="color:var(--ink)">${k === 'intern' ? 'Ohne KI (Intern)' : esc((BPHead.providers.find((p) => p.key === k) || {}).label || k)}:</b> ${esc(t)}</p>`).join('')}
      <p class="hint" style="margin:.5rem 0 0">Die Gesamtspanne hängt vor allem an den Daten (Kennwerte, bestätigte Flächen, offene Positionen), nicht an der KI. Eine KI kann Lücken finden, macht Zahlen aber nicht genauer als die Grundlagen.</p></div>`;
  }
  return h + '</section>';
}
async function runEstimate(ki) {
  estBusy = true; if (tab === 'kosten') render();
  try { clearTimeout(saveT); await saveNow(); EST = await api(`api/bk/${B.id}/schaetzen`, 'POST', ki ? { ki: true } : {}); B.acc = EST.acc; } catch (e) { toast(e.message, true); }
  estBusy = false; render();
}
function vKosten() {
  const c = B.calc, d = B.data;
  const viaBt = c.kg2 && Object.keys(c.kg2).length;
  const kgRows = [['300', 'Bauwerk – Baukonstruktionen', viaBt ? 'aus Bauteilen und Kennwert-Anteilen' : `${pct(d.kg['300'])} der Raumtyp-Summe`, c.kg300], ['400', 'Bauwerk – Technische Anlagen', viaBt ? 'aus Bauteilen und Kennwert-Anteilen' : `${pct(d.kg['400'])} der Raumtyp-Summe`, c.kg400]]
    .concat(d.items.map((i) => [i.kg, i.name, 'eigene Position', i.amount])).concat([['700', 'Baunebenkosten', `${pct(d.nk)} auf alle Kosten`, c.nk]]).sort((a, b) => a[0].localeCompare(b[0]))
    .concat(c.risiko ? [['', 'Kostenrisiken (gesondert ausgewiesen)', `${pct(d.risiko)}${d.risiko_text ? ' – ' + d.risiko_text : ''}`, c.risiko]] : []);
  return `${estHtml()}<section class="card" style="margin-bottom:1.2rem"><h2>Raumtypen und Kennwerte</h2><p class="sub">Kennwerte in € je m² Raumfläche (KG 300 + 400, netto). Die vorgegebenen Werte sind Beispiele – eigene Werte aus abgerechneten Projekten eintragen. Raumtypen ergänzen oder umbenennen: <a href="#" data-act="raumtypen">⚙ Raumtypen</a>.</p>
    <div class="tbl"><table><thead><tr><th>Raumtyp</th><th class="r">Räume</th><th class="r">Fläche m²</th><th class="r">€ / m²</th><th class="r">Summe</th></tr></thead><tbody>${c.types.map((t) => `
      <tr><td>${esc(t.label)}</td><td class="r num">${t.n}</td><td class="r num">${m2(t.area)}${Math.abs((t.gew ?? t.area) - t.area) > 0.005 ? `<div class="hint" style="font-size:.75rem" title="Fläche × Faktor aus Standard und Maßnahme der Räume">${m2(t.gew)} gewichtet</div>` : ''}</td><td class="r"><input class="n" value="${Math.round(t.kw)}" data-kw="${t.typ}" inputmode="numeric" aria-label="Kennwert ${esc(t.label)}">${vgHint(t)}</td><td class="r num">${eur(t.sum)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Summe Kennwerte</td><td></td><td class="r num">${m2(c.area)}</td><td class="r num">${eur(c.area ? c.kw_summe / c.area : 0)}</td><td class="r num">${eur(c.kw_summe)}</td></tr>
      ${Math.abs(c.justage.faktor - 1) > 1e-6 ? `<tr><td colspan="3"><a href="#" data-act="toJustage">Justage</a> <span class="hint">Region ${fx(c.justage.region, 1)} % × Preisstand ${fx(c.justage.preis, 1)} %</span></td><td class="r num">× ${fx(c.justage.faktor, 3)}</td><td class="r num">${eur(c.bauwerk_kw)}</td></tr>` : ''}
      ${Object.keys(c.kg2 || {}).length ? `<tr><td colspan="3">Bauwerk mit Bauteilen <a href="#" data-tab="bauteile" class="hint">(Bauteile & Material)</a></td><td class="r num">${eur(c.kw)}</td><td class="r num">${eur(c.bauwerk)}</td></tr>` : ''}</tfoot></table></div>
    <div class="row" style="margin-top:.8rem"><button class="btn sm" data-act="saveKw">Als eigene Kennwerte für neue Kostenermittlungen speichern</button>
      ${VG && Object.keys(VG.auswertung).length ? '<button class="btn sm" data-act="vgUse" title="Mittelwerte der eigenen Vergleichsobjekte und importierten Kennwerte in die Raumtypen übernehmen">Ø Vergleichswerte übernehmen</button>' : ''}</div></section>
  <section class="card" style="margin-bottom:1.2rem"><h2>Vergleichsobjekte – damit die Kennwerte mit jedem Projekt besser werden</h2>
    <p class="sub">Abgerechnete Projekte des Büros (am besten aus der Kostenfeststellung) und Kennwerte aus Kostendatenbanken (BKI, sirAdos, DBD … als Excel/CSV-Export) bilden eine eigene Vergleichsbasis. Bei jedem Raumtyp steht dann der Mittelwert mit Spanne.</p>
    ${VG && VG.objekte.length ? `<div class="tbl"><table><thead><tr><th>Objekt / Quelle</th><th>Stufe</th><th>Kostenstand</th><th class="r">€/m² Bauwerk</th><th></th></tr></thead><tbody>${VG.objekte.map((o) => `<tr><td>${esc(o.name)}${o.art === 'import' ? ' <span class="hint">(Import, ' + Object.keys(o.types).length + ' Kennwerte)</span>' : ''}</td><td>${esc(o.stufe || '')}</td><td>${esc((o.kostenstand || '').split('-').reverse().join('/'))}</td><td class="r num">${o.kw ? eur(o.kw) : '–'}</td><td class="r"><button class="btn sm" data-act="vgDel" data-id="${esc(o.id)}" aria-label="entfernen">✕</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">Noch keine Vergleichsobjekte.</p>'}
    <div class="row" style="margin-top:.8rem"><button class="btn sm" data-act="vgAdd">Diese Kostenermittlung als Vergleichsobjekt speichern</button><button class="btn sm" data-act="vgImp">Kennwerte importieren (Excel/CSV) …</button><button class="btn sm" data-act="dienste">Kostendatenbanken (Zugänge) …</button></div></section>
  ${justageHtml()}
  <div class="two"><section class="card"><h2>Ansätze</h2><p class="sub">Aufteilung und Zuschläge</p><div class="row">
      <label>Anteil KG 300 (Rest KG 400) in %<input class="n" style="width:120px" value="${d.kg['300']}" data-set="kg300" inputmode="decimal"></label>
      <label>Baunebenkosten KG 700 in %<input class="n" style="width:120px" value="${d.nk}" data-set="nk" inputmode="decimal"></label></div>
    <h2 style="margin-top:1.4rem">Angaben nach DIN 276</h2><p class="sub">Kostenstand (Zeitpunkt der Preise) und vorhersehbare Kostenrisiken werden im PDF gesondert ausgewiesen.</p><div class="row">
      <label>Kostenstand<input type="month" style="width:160px" value="${esc(d.kostenstand || '')}" data-sets="kostenstand"></label>
      <label>Kostenrisiken in %<input class="n" style="width:110px" value="${d.risiko || 0}" data-set="risiko" inputmode="decimal" title="z. B. 5–10 % bei Umbau im Bestand"></label>
      <label style="flex:1;min-width:220px">Begründung der Risiken<input class="w" value="${esc(d.risiko_text || '')}" data-sets="risiko_text" placeholder="z. B. Bestand, Baugrund, Schadstoffe, Marktlage"></label></div>
    <div class="row" style="margin-top:.5rem"><button class="btn sm" data-act="din1" title="KG 100, 200, 500, 600, 800 als Positionen aufnehmen, falls sie fehlen">Alle Kostengruppen der 1. Ebene aufführen</button></div>
    <h2 style="margin-top:1.4rem">Eigene Positionen</h2><p class="sub">z. B. KG 200, Rückbau (394), Fassade aus den Ansichten, Außenanlagen (500). Leer = noch offen.</p>
    <div class="tbl"><table><thead><tr><th>KG</th><th>Bezeichnung</th><th class="r">Betrag €</th><th></th></tr></thead><tbody>${d.items.map((i, k) => `
      <tr><td><input class="n" style="width:70px;text-align:left" value="${esc(i.kg)}" data-it="${k}" data-f="kg" aria-label="Kostengruppe"></td><td><input class="w" value="${esc(i.name)}" data-it="${k}" data-f="name" aria-label="Bezeichnung"></td>
      <td class="r"><input class="n" style="width:130px" value="${i.amount == null ? '' : Math.round(i.amount)}" placeholder="offen" data-it="${k}" data-f="amount" inputmode="numeric" aria-label="Betrag">${i.est ? `<div class="hint" style="font-size:.75rem;white-space:nowrap" title="${esc(i.est.basis)}">geschätzt · ${esc(i.est.src)}<br>${eur(i.est.low)} – ${eur(i.est.high)}</div>` : ''}</td><td><button class="btn sm" data-delit="${k}" aria-label="Position löschen">✕</button></td></tr>`).join('')}</tbody></table></div>
    <div class="row" style="margin-top:.6rem"><button class="btn sm" data-act="addItem">+ Position</button></div>
    <h2 style="margin-top:1.4rem">Aufteilung auf die 2. Ebene (für das PDF)</h2><p class="sub">Anteil der Raumtyp-Kosten in % von KG 300 bzw. 400. Leer = nicht aufgeteilt; der Rest erscheint als „nicht zugeordnet“.</p>
    <div class="tbl"><table><thead><tr><th>KG</th><th>Bezeichnung</th><th class="r">%</th></tr></thead><tbody>${KG2.map(([k, n]) => `${k === '410' ? `<tr><td colspan="3" class="hint">Summe KG 300: ${pct(sum2('3'))}</td></tr>` : ''}
      <tr><td class="num">${k}</td><td>${esc(n)}</td><td class="r"><input class="n" style="width:80px" value="${d.kg2[k] ?? ''}" data-kg2="${k}" inputmode="decimal" aria-label="Anteil KG ${k}"></td></tr>`).join('')}
      <tr><td colspan="3" class="hint">Summe KG 400: ${pct(sum2('4'))}</td></tr></tbody></table></div>
    <h2 style="margin-top:1.4rem">Erläuterungen für den Bauherrn</h2><p class="sub">Erscheint im PDF unter „Erläuterungen und Annahmen“. Leerzeile = neuer Absatz.</p>
    <textarea data-notes="1" rows="5" style="width:100%;resize:vertical" aria-label="Erläuterungen">${esc(d.notes || '')}</textarea></section>
  <section class="card"><h2>Kostengruppen nach DIN 276</h2><p class="sub">netto</p><div class="tbl"><table><thead><tr><th>KG</th><th>Bezeichnung</th><th>Ansatz</th><th class="r">Betrag</th></tr></thead><tbody>${kgRows.map(([kg, n, a, v]) => `
      <tr><td class="num">${esc(kg)}</td><td>${esc(n)}</td><td class="hint">${esc(a)}</td><td class="r num" style="${v == null ? 'color:#e07b3a' : ''}">${v == null ? 'offen' : eur(v)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td></td><td>Gesamt netto</td><td></td><td class="r num">${eur(c.total)}</td></tr></tfoot></table></div></section></div>`;
}
function vMittel() {
  const S = SRC || { projects: [], plans: [] };
  if (!SRC) loadSources();
  const F = FLOW && FLOW.ok ? FLOW : null;
  return `<section class="card" style="margin-bottom:1.2rem"><h2>Verknüpfung</h2><p class="sub">Der Bauzeitenplan liefert die Termine; die Kosten werden über seine Leistungen verteilt.</p><div class="row">
    <label>Projekt (Bautagebuch)<select data-link="project_id" data-bp-projekte><option value="">– keines –</option>${S.projects.map((p) => `<option value="${p.id}"${p.id === B.project_id ? ' selected' : ''}>${esc(p.name)}${p.archived ? ' (archiviert)' : ''}</option>`).join('')}</select></label>
    <label>Bauzeitenplan<select data-link="gantt_id"><option value="">– keiner –</option>${S.plans.map((p) => `<option value="${esc(p.id)}"${p.id === B.gantt_id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
    <label>Baupreisindex % p. a.<input class="n" style="width:110px" value="${B.data.rate}" data-set="rate" inputmode="decimal"></label></div></section>
  <section class="card" style="margin-bottom:1.2rem"><h2>Mittelabfluss je Monat</h2>${F ? `<p class="sub">${esc(F.plan)} · ${new Date(F.start).toLocaleDateString('de-DE')} bis ${new Date(F.end).toLocaleDateString('de-DE')} · verteilt: ${eur(F.base)} (KG 300+400 und Positionen, ohne KG 700)</p>` : ''}${flowCols(false)}
    ${F ? `<div class="tbl" style="margin-top:1rem"><table><thead><tr><th>Monat</th><th class="r">Betrag</th><th class="r">mit Index</th><th class="r">kumuliert mit Index</th></tr></thead><tbody>${F.months.map((m) => `<tr><td>${ym(m.ym)}</td><td class="r num">${eur(m.amount)}</td><td class="r num">${eur(m.idx)}</td><td class="r num">${eur(m.cum_idx)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Summe</td><td class="r num">${eur(F.base)}</td><td class="r num">${eur(F.total_idx)}</td><td class="r num" style="color:#e07b3a">+ ${eur(F.total_idx - F.base)}</td></tr></tfoot></table></div>` : ''}</section>
  ${F ? `<section class="card"><h2>Leistungen</h2><p class="sub">Gewicht je Leistung: Standard = Dauer in Kalendertagen. Für teure Gewerke höher setzen (z. B. Haustechnik).</p><div class="tbl"><table><thead><tr><th>Leistung</th><th>Gewerk</th><th>Zeitraum</th><th style="width:30%"></th><th class="r">Gewicht</th><th class="r">Anteil</th><th class="r">Betrag</th></tr></thead><tbody>${(() => {
      const t0 = new Date(F.start).getTime(), span = Math.max(1, new Date(F.end).getTime() - t0 + 864e5);
      return F.tasks.map((t) => `<tr><td>${esc(t.name)}</td><td class="hint">${esc(t.gw)}</td><td class="num" style="white-space:nowrap;font-size:.85rem">${new Date(t.s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}–${new Date(t.f).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
        <td><div class="gbar"><i style="left:${((new Date(t.s) - t0) / span * 100).toFixed(2)}%;width:${Math.max(0.6, t.days * 864e5 / span * 100).toFixed(2)}%"></i></div></td>
        <td class="r"><input class="n" style="width:80px" value="${Math.round(t.w * 10) / 10}" data-share="${t.uid}" inputmode="decimal" aria-label="Gewicht ${esc(t.name)}"${t.own ? ' data-own="1"' : ''}></td><td class="r num">${pct(t.pct)}</td><td class="r num">${eur(t.amount)}</td></tr>`).join('');
    })()}</tbody></table></div></section>` : ''}`;
}
function vPruefung() {
  const ki = window.BPHead ? BPHead.provider() : { label: 'Intern' };
  const rc = B.reife && B.reife.reicht, rs = B.reife && B.reife.stufen.find((x) => x.key === B.stufe);
  return `<div class="row" style="margin-bottom:1rem"><div style="flex:1"><h2 style="margin:0">Plausibilitätsprüfung</h2><p class="hint" style="margin:.2rem 0 0">Feste Regeln${ki.key && ki.key !== 'intern' ? ' und ' + esc(ki.label) : ''} · KI unter ⚙ → Für mich → KI</p></div>
    <span style="display:flex;align-items:center;gap:.5rem;font-size:.9rem;color:var(--mute);white-space:nowrap">prüfen als <select data-pstufe aria-label="prüfen als" style="width:auto">${STUFEN.map(([k, l]) => `<option value="${k}"${k === B.stufe ? ' selected' : ''}>${l}${k === rc ? ' – dafür reicht es' : ''}</option>`).join('')}</select></span><button class="btn pri" data-act="check">${CHECK ? 'Erneut prüfen' : 'Jetzt prüfen'}</button><button class="btn ki" data-act="checkKi" title="Zusätzlich mit KI prüfen (oben gewählte KI, sonst die erste eingerichtete)">✨ mit KI</button></div>
    ${rs ? `<p class="hint" style="margin:-.4rem 0 .8rem${rs.ok ? '' : ';color:#e07b3a'}">${rs.ok ? `✓ Als ${esc(rs.name)} ist alles vorhanden.` : `Als ${esc(rs.name)} fehlt noch: ${rs.fehlt.length} ${rs.fehlt.length === 1 ? 'Punkt' : 'Punkte'}${rc ? ` – die Daten reichen für ${esc(STUFE_N(rc) === 'Kostenrahmen' ? 'den Kostenrahmen' : 'die ' + STUFE_N(rc))}` : ''}.`}</p>` : ''}
    ${CHECK && CHECK.note ? `<p class="hint" style="color:#e07b3a">${esc(CHECK.note)}</p>` : ''}
    <div class="list">${CHECK ? CHECK.hinweise.map((h, k) => `<button type="button" class="card h go" data-hint="${k}" title="Zur Stelle springen"><span class="d ${h.lvl}" aria-label="${h.lvl}"></span><div><b>${esc(h.title)}</b><p>${esc(h.text)}</p></div><span class="src">${esc(h.src)}<i aria-hidden="true">→</i></span></button>`).join('') || '<div class="card empty">Keine Auffälligkeiten.</div>' : '<div class="card empty">Noch nicht geprüft.</div>'}</div>
    <section class="card" style="margin-top:1.4rem" id="quellen"><h2 style="margin:0 0 .3rem">Grundlagen und Quellen</h2><p class="sub" style="margin:0 0 .6rem">Woher Flächen, Kennwerte, Anteile und Preise dieser Kostenermittlung stammen – im „PDF für den Bauherrn“ als eigener Abschnitt wählbar.</p>
      ${(B.quellen || []).map((q) => `<p style="margin:.55rem 0"><b>${esc(q.t)}</b><br><span class="hint" style="font-size:.88rem;color:var(--ink)">${esc(q.x)}</span></p>`).join('') || '<p class="hint">Wird beim nächsten Speichern ermittelt.</p>'}</section>`;
}
