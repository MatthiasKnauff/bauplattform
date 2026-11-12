'use strict';
/* Bauzeitenplan – Grundlagen, Arbeitskalender, Gewerke und Farben, Zustand, Terminrechnung (Vorwärts/Rückwärts), Hilfen für Leistungen, Rückgängig.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: gantt-kern.js, gantt-diagramm.js, gantt-befehle.js, gantt-ereignisse.js, gantt-start.js). */
/* =====================================================================
   Gantt – Projektplanung im Browser
   Tabelle (links) + Balkendiagramm (rechts), automatische Planung mit
   Arbeitstagen (Mo–Fr), Anordnungsbeziehungen EA/AA/EE/AE, Leistungsgruppen,
   Meilensteine, kritischer Weg, Drag & Drop, Rückgängig.
   ===================================================================== */

/* $, esc, api(…) und toast kommen aus dem Baukasten (/bp/baukasten.js) */
const RH = 24;          // Zeilenhöhe
const HH = 44;          // Kopfhöhe
const DAY = 86400000;
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD2 = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WD1 = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
class UErr extends Error {}

/* ---------- Kalender: Tage als ganze Zahlen (Tage seit 1970, UTC) ---------- */
const ud = (n) => new Date(n * DAY);
const todayN = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
// Arbeitstag-Index (Mo–Fr). toW rastet Wochenenden auf den folgenden Montag ein.
/* ---------- Arbeitskalender: Arbeitswoche, Feiertage, eigene freie Tage ----------
   Arbeitstage werden fortlaufend gezählt: toW(Tag) = Index des ersten Arbeitstags ab diesem Tag,
   fromW(Index) = Datum dieses Arbeitstags. */
const CAL_D0 = Date.UTC(1990, 0, 1) / DAY, CAL_N = 90 * 366;
const STATES = [['', 'keine Feiertage'], ['DE', 'nur bundesweite Feiertage'], ['BW', 'Baden-Württemberg'], ['BY', 'Bayern'], ['BE', 'Berlin'], ['BB', 'Brandenburg'], ['HB', 'Bremen'], ['HH', 'Hamburg'], ['HE', 'Hessen'], ['MV', 'Mecklenburg-Vorpommern'], ['NI', 'Niedersachsen'], ['NW', 'Nordrhein-Westfalen'], ['RP', 'Rheinland-Pfalz'], ['SL', 'Saarland'], ['SN', 'Sachsen'], ['ST', 'Sachsen-Anhalt'], ['SH', 'Schleswig-Holstein'], ['TH', 'Thüringen']];
const WEEKS = [[5, '5-Tage-Woche (Mo–Fr)'], [6, '6-Tage-Woche (Mo–Sa)'], [7, '7-Tage-Woche (Mo–So)']];
const dUTC = (y, m, d) => Date.UTC(y, m - 1, d) / DAY;
function easter(y) {   // Gaußsche Osterformel (gregorianisch)
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return dUTC(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}
function holidaysOf(y, st) {
  if (!st) return [];
  const E = easter(y), in_ = (...l) => l.includes(st), out = [];
  const add = (d, n) => out.push([d, n]);
  add(dUTC(y, 1, 1), 'Neujahr');
  if (in_('BW', 'BY', 'ST')) add(dUTC(y, 1, 6), 'Heilige Drei Könige');
  if ((st === 'BE' && y >= 2019) || (st === 'MV' && y >= 2023)) add(dUTC(y, 3, 8), 'Internationaler Frauentag');
  add(E - 2, 'Karfreitag');
  if (st === 'BB') add(E, 'Ostersonntag');
  add(E + 1, 'Ostermontag');
  add(dUTC(y, 5, 1), 'Tag der Arbeit');
  add(E + 39, 'Christi Himmelfahrt');
  if (st === 'BB') add(E + 49, 'Pfingstsonntag');
  add(E + 50, 'Pfingstmontag');
  if (in_('BW', 'BY', 'HE', 'NW', 'RP', 'SL')) add(E + 60, 'Fronleichnam');
  if (st === 'SL') add(dUTC(y, 8, 15), 'Mariä Himmelfahrt');
  if (st === 'TH' && y >= 2019) add(dUTC(y, 9, 20), 'Weltkindertag');
  add(dUTC(y, 10, 3), 'Tag der Deutschen Einheit');
  if (in_('BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH') || y === 2017) add(dUTC(y, 10, 31), 'Reformationstag');
  if (in_('BW', 'BY', 'NW', 'RP', 'SL')) add(dUTC(y, 11, 1), 'Allerheiligen');
  if (st === 'SN') { let d = dUTC(y, 11, 22); while (wdOf(d) !== 3) d--; add(d, 'Buß- und Bettag'); }
  add(dUTC(y, 12, 25), '1. Weihnachtstag');
  add(dUTC(y, 12, 26), '2. Weihnachtstag');
  return out;
}
const wdOf = (n) => (((n + 4) % 7) + 7) % 7;   // 0 = Sonntag
function freeMap(cal, y0, y1) {   // Datum → Bezeichnung (Feiertage + eigene freie Tage)
  const m = new Map();
  for (let y = y0; y <= y1; y++) for (const [d, n] of holidaysOf(y, cal.state)) m.set(d, n);
  for (const f of cal.free || []) {
    const a = parseDate(f.from), b = parseDate(f.to || f.from); if (a == null || b == null || b < a || b - a > 400) continue;
    const name = f.name || 'frei';
    if (f.yearly) {
      const D = ud(a), y0f = D.getUTCFullYear();
      for (let y = y0; y <= y1; y++) { const s0 = dUTC(y, D.getUTCMonth() + 1, D.getUTCDate()); void y0f; for (let d = s0; d <= s0 + (b - a); d++) if (!m.has(d)) m.set(d, name); }
    } else for (let d = a; d <= b; d++) if (!m.has(d)) m.set(d, name);
  }
  return m;
}
let calKey = null, calCum = null, calDays = null, calFree = new Map(), calWeek = 5;
function buildCal(cal) {
  cal = cal || { week: 5, state: 'DE', free: [] };
  const key = JSON.stringify([cal.week || 5, cal.state ?? 'DE', cal.free || []]);
  if (key === calKey) return;
  calKey = key; calWeek = +cal.week || 5;
  calFree = freeMap({ state: cal.state ?? 'DE', free: cal.free || [] }, 1990, 2079);
  calCum = new Int32Array(CAL_N + 1); calDays = [];
  for (let k = 0; k < CAL_N; k++) {
    const d = CAL_D0 + k, wd = wdOf(d);
    const off = calWeek === 5 ? wd === 0 || wd === 6 : calWeek === 6 ? wd === 0 : false;
    const work = !off && !calFree.has(d);
    calCum[k + 1] = calCum[k] + (work ? 1 : 0); if (work) calDays.push(d);
  }
}
function toW(n) { const k = n - CAL_D0; if (k < 0) return k; if (k >= CAL_N) return calCum[CAL_N] + (k - CAL_N); return calCum[k]; }
function fromW(w) { if (w < 0) return CAL_D0 + w; if (w >= calDays.length) return calDays[calDays.length - 1] + (w - calDays.length + 1); return calDays[w]; }
const isWork = (n) => { const k = n - CAL_D0; return k >= 0 && k < CAL_N ? calCum[k + 1] > calCum[k] : true; };
const freeName = (n) => calFree.get(n) || '';
const snapWork = (n) => fromW(toW(n));
const isWE = (n) => !isWork(n);   // arbeitsfrei laut Projektkalender
function fmtD(n) { const d = ud(n); return WD2[d.getUTCDay()] + ' ' + pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.' + String(d.getUTCFullYear()).slice(2); }
const fmtShort = (n) => { const d = ud(n); return pad(d.getUTCDate()) + '.' + pad(d.getUTCMonth() + 1) + '.'; };
const isoD = (n) => ud(n).toISOString().slice(0, 10);
function parseDate(s) {
  s = String(s).trim().replace(/^[a-zäöü]{2,3}\.?\s+/i, '');
  let m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return Date.UTC(+m[1], m[2] - 1, +m[3]) / DAY;
  if ((m = /^(\d{1,2})\.(\d{1,2})\.?(\d{2}|\d{4})?$/.exec(s))) {
    let y = m[3] ? +m[3] : ud(todayN()).getUTCFullYear(); if (y < 100) y += 2000;
    if (+m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31) return null;
    return Date.UTC(y, m[2] - 1, +m[1]) / DAY;
  }
  return null;
}
function parseDur(s) {
  s = String(s).trim().toLowerCase().replace(',', '.');
  const m = /^(\d+(?:\.\d+)?)\s*([a-zä]*)\.?\??$/.exec(s); if (!m) return null;
  let v = +m[1]; const u = m[2];
  if (!u || /^(t|tg|tag|tage|d|day|days)$/.test(u)) { /* Tage */ }
  else if (/^(w|wo|woche|wochen|wk|wks)$/.test(u)) v *= 5;
  else if (/^(mo|mon|monat|monate|mt)$/.test(u)) v *= 20;
  else return null;
  return Math.max(0, Math.round(v));
}
function parseLag(s) {
  s = String(s || '').trim(); if (!s) return 0;
  const m = /^([+-])?\s*(.+)$/.exec(s); const d = parseDur(m[2]);
  if (d == null) return null; return m[1] === '-' ? -d : d;
}
buildCal(null);
const fmtDur = (d) => (d === 1 ? '1 Tag' : d + ' Tage');
const fmtLag = (l) => (l ? (l > 0 ? '+' : '-') + fmtDur(Math.abs(l)) : '');
const T2DE = { FS: 'EA', SS: 'AA', FF: 'EE', SF: 'AE' };
const DE2T = { EA: 'FS', AA: 'SS', EE: 'FF', AE: 'SF', FS: 'FS', SS: 'SS', FF: 'FF', SF: 'SF' };
const TNAME = { FS: 'Ende-Anfang (EA)', SS: 'Anfang-Anfang (AA)', FF: 'Ende-Ende (EE)', SF: 'Anfang-Ende (AE)' };

/* ---------- Gewerke & Farben ---------- */
const GW_DEFAULT = {
  'Abbruch': '#a1887f', 'Rohbau': '#78909c', 'Sanitär': '#42a5f5', 'Heizung': '#ff8a65', 'Elektro': '#ffca28',
  'Fenster': '#26a69a', 'Putz': '#d7b36a', 'Estrich': '#9575cd', 'Fliesen': '#4dd0e1', 'Trockenbau': '#b0bec5',
  'Maler': '#66bb6a', 'Bodenbelag': '#c27c4e', 'Tischler': '#8d6e63', 'Dach': '#ef8f5f', 'Gerüst': '#bdbdbd', 'Bauleitung': '#7986cb',
  'Erdbau': '#8d7b68', 'Abdichtung': '#546e7a', 'Zimmerer': '#bc8a5f', 'Klempner': '#90a4ae', 'Fassade': '#e6a157', 'Lüftung': '#80cbc4',
  'Aufzug': '#ec407a', 'Außenanlagen': '#9ccc65', 'Reinigung': '#f8bbd0', 'Vermessung': '#9fa8da',
  'Metallbau': '#607d8b', 'Glaser': '#81d4fa', 'Naturstein': '#bcaaa4', 'Rollladen': '#ffb74d', 'Küche': '#ce93d8', 'Spezialtiefbau': '#5c6bc0',
};
const GW_PALETTE = ['#5c6bc0', '#ec407a', '#9ccc65', '#ffa726', '#26c6da', '#ab47bc', '#d4e157', '#8d6e63', '#29b6f6', '#ff7043', '#7e57c2', '#66bb6a', '#ffd54f', '#4db6ac'];
const GW_RULES = [
  ['Abbruch', /abbruch|abbrechen|rückbau|entkern|schutt|demontage/],
  ['Rohbau', /durchbruch|abfang|stahlträger|maurer|mauerwerk|rohbau|beton|sturz|abstützung|untermauer/],
  ['Fliesen', /fliese/],
  ['Sanitär', /sanitär|shk|abwasser|trinkwasser|\bwc\b|waschtisch|dusche|armatur|vorwand/],
  ['Heizung', /heizung|heizkörper|therme|wärmepumpe/],
  ['Elektro', /elektro|steckdose|schalter|leuchte|unterverteil|kabel/],
  ['Fenster', /fenster/],
  ['Estrich', /estrich/],
  ['Putz', /putz|stuck/],
  ['Trockenbau', /trockenbau|rigips|gipskarton|ständerwerk|vorsatzschale/],
  ['Maler', /maler|anstrich|tapez|spachtel/],
  ['Bodenbelag', /parkett|bodenbelag|bodenleger|laminat|vinyl|sockelleiste|teppich/],
  ['Tischler', /innentür|türen|tischler|schreiner|zarge/],
  ['Dach', /dach/],
  ['Gerüst', /gerüst/],
  ['Bauleitung', /bauleitung|baustelleneinrichtung/],
];
function guessGw(t) { const s = ((t.name || '') + ' ' + (t.res || '')).toLowerCase(); for (const [g, re] of GW_RULES) if (re.test(s)) return g; return ''; }
function gwColor(g) {
  if (!g) return null;
  if (!P) return GW_DEFAULT[g] || '#9e9e9e';   // ohne geöffnetes Projekt (Leistungskatalog)
  P.gwColors ||= {};
  if (P.gwColors[g]) return P.gwColors[g];
  const used = new Set(Object.values(P.gwColors));
  let col = GW_DEFAULT[g] && !used.has(GW_DEFAULT[g]) ? GW_DEFAULT[g] : GW_PALETTE.find((c) => !used.has(c));
  if (!col) { let h = 0; for (const ch of g) h = (h * 31 + ch.charCodeAt(0)) % 360; col = hslHex(h, 55, 60); }
  P.gwColors[g] = col; return col;
}
function hslHex(h, s, l) { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l); const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0'); return '#' + f(0) + f(8) + f(4); }
function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f)); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
const effColor = (t) => (t && t.color) || gwColor(t && t.gw);
const allGw = () => [...new Set(P.tasks.map((t) => t.gw).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
function updateGwList() {
  let dl = document.getElementById('gwList');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'gwList'; document.body.appendChild(dl); }
  dl.innerHTML = [...new Set([...allGw(), ...Object.keys(GW_DEFAULT)])].map((g) => `<option value="${esc(g)}">`).join('');
}

/* ---------- Zustand ---------- */
const COLS = [
  { k: 'nr', t: '', w: 38 },
  { k: 'ind', t: '<span title="Indikatoren">ⓘ</span>', w: 30 },
  { k: 'name', t: 'Leistung', w: 230 },
  { k: 'gw', t: 'Gewerk', w: 110 },
  { k: 'dur', t: 'Dauer', w: 70 },
  { k: 'start', t: 'Anfang', w: 94 },
  { k: 'finish', t: 'Ende', w: 94 },
  { k: 'pred', t: 'Vorgänger', w: 84 },
  { k: 'res', t: 'Unternehmer:in', w: 130 },
  { k: 'pct', t: '% Abg.', w: 56 },
];
const SP = { key: 'gantt.plan', namen: ['Nr.', 'Indikatoren', 'Leistung', 'Gewerk', 'Dauer', 'Anfang', 'Ende', 'Vorgänger', 'Unternehmer:in', '% Abg.'] };
// sichtbare Spalten in gewählter Reihenfolge – Spalten-Menü des Baukastens (rechte Maustaste auf den Kopf, wie überall)
function VCOLS() { if (!window.bpSpalten) return COLS; const z = bpSpalten.stand(SP.key, COLS.length, []); return z.ord.filter((n) => !z.aus.has(n)).map((n) => COLS[n]); }
const COLK = { get length() { return VCOLS().length; }, indexOf: (k) => VCOLS().findIndex((c) => c.k === k), filter: (f) => VCOLS().map((c) => c.k).filter(f) };
const MULTI_FIELDS = new Set(['gw', 'dur', 'pct', 'res', 'start']);
const LEAF_ONLY = new Set(['dur', 'pct', 'finish']);
const EDITABLE = new Set(['name', 'gw', 'dur', 'start', 'finish', 'pred', 'res', 'pct']);
const ZOOMS = [
  { ppd: 1.2, t: 'year', b: 'quarter' },
  { ppd: 3, t: 'quarter', b: 'month' },
  { ppd: 6, t: 'month', b: 'week' },
  { ppd: 20, t: 'week', b: 'day' },
  { ppd: 36, t: 'week', b: 'day' },
  { ppd: 64, t: 'week', b: 'day' },
];
const LS = {
  get(k, d) { try { const v = localStorage.getItem('gantt.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('gantt.' + k, JSON.stringify(v)); } catch { /* egal */ } },
};
let colW = Object.assign(Object.fromEntries(COLS.map((c) => [c.k, c.w])), LS.get('colW', {}));
let P = null, CAL = null, vis = [], projects = [];
let sel = new Set(), cur = { r: 0, c: 'name' }, anchorR = 0;
let zoom = LS.get('zoom', 3), showCrit = LS.get('crit', false);
let undoS = [], redoS = [];
let view = { start: null, end: 0, ppd: 0 }, geo = {};
let editing = null, drag = null, saveTimer = null;
let autoSave = true, dirty = false;   // es wird immer automatisch gespeichert
const fileHandles = {};   // Projekt-ID → verknüpfte Datei auf diesem Computer (nur in dieser Sitzung)


const gridPane = $('#gridPane'), chartPane = $('#chartPane');
const gridBody = $('#gridBody'), gridHead = $('#gridHead');
const chartBody = $('#chartBody'), chartHead = $('#chartHead');
const tip = $('#tip');

/* =====================================================================
   Planung (Vorwärts-/Rückwärtsrechnung)
   ===================================================================== */
function segList(t) { return t && t.segs && t.segs.length > 1 && t.dur > 0 ? t.segs : null; }
function schedule() {
  buildCal(P.cal);
  const T = P.tasks, n = T.length, ps = toW(P.start);
  const idx = new Map(T.map((t, i) => [t.uid, i]));
  const summ = T.map((t, i) => i + 1 < n && T[i + 1].lvl > t.lvl);
  const par = new Array(n).fill(-1);
  { const st = []; for (let i = 0; i < n; i++) { while (st.length && T[st[st.length - 1]].lvl >= T[i].lvl) st.pop(); par[i] = st.length ? st[st.length - 1] : -1; st.push(i); } }
  const leavesCache = new Map();
  const leavesOf = (i) => {
    if (!summ[i]) return [i];
    if (leavesCache.has(i)) return leavesCache.get(i);
    const r = []; for (let j = i + 1; j < n && T[j].lvl > T[i].lvl; j++) if (!summ[j]) r.push(j);
    leavesCache.set(i, r); return r;
  };
  const es = new Array(n).fill(ps), ef = new Array(n).fill(ps), ls = new Array(n).fill(0), lf = new Array(n).fill(0);
  const segS = new Array(n).fill(null), segE = new Array(n).fill(null);
  const ins = T.map(() => []), outs = T.map(() => []), inc = new Array(n).fill(0), cons = new Array(n).fill(ps);

  for (let i = 0; i < n; i++) {
    if (summ[i]) continue;
    let c = ps;
    for (let a = i; a >= 0; a = par[a]) {          // eigene + geerbte Vorgänger/Einschränkungen
      const t = T[a];
      if (t.cons != null) c = Math.max(c, toW(t.cons));
      for (const pr of t.preds || []) {
        const pi = idx.get(pr.uid); if (pi == null) continue;
        for (const l of leavesOf(pi)) {
          if (l === i) continue;
          // Abschnitt-Anker nur bei direkter Verknüpfung zweier Leistungen (nicht über Gruppen)
          const r = { p: l, s: i, type: pr.type || 'FS', lag: pr.lag || 0, ps: l === pi ? pr.ps ?? null : null, ss: a === i ? pr.ss ?? null : null };
          ins[i].push(r); outs[l].push(r); inc[i]++;
        }
      }
    }
    cons[i] = c;
  }
  // topologische Reihenfolge
  const order = [], q = [], left = inc.slice(), inOrder = new Array(n).fill(false);
  for (let i = 0; i < n; i++) if (!summ[i] && inc[i] === 0) q.push(i);
  for (let h = 0; h < q.length; h++) { const i = q[h]; order.push(i); inOrder[i] = true; for (const r of outs[i]) if (--left[r.s] === 0) q.push(r.s); }
  const leafCount = summ.filter((x) => !x).length, cyc = order.length < leafCount;
  if (cyc) for (let i = 0; i < n; i++) if (!summ[i] && !inOrder[i]) order.push(i);

  const anchorW = (p, k, end) => (k != null && segS[p] && k < segS[p].length ? (end ? segE[p][k] : segS[p][k]) : end ? ef[p] : es[p]);
  for (const i of order) {
    const t = T[i], sg = segList(t);
    const D = sg ? sg.map((x) => x.d) : [t.dur], G = sg ? sg.map((x, k) => (k ? x.gap || 0 : 0)) : [0], m = D.length;
    const need = new Array(m).fill(-Infinity); need[0] = cons[i];
    for (const r of ins[i]) {
      const endBased = r.type === 'FF' || r.type === 'SF';
      const k = r.ss != null && r.ss < m ? r.ss : endBased ? m - 1 : 0;
      const src = r.type === 'FS' || r.type === 'FF' ? anchorW(r.p, r.ps, true) : anchorW(r.p, r.ps, false);
      need[k] = Math.max(need[k], src + r.lag - (endBased ? D[k] : 0));
    }
    const S = [], E = [];
    for (let k = 0; k < m; k++) { const st = k ? Math.max(E[k - 1] + G[k], need[k]) : need[0]; S.push(st); E.push(st + D[k]); }
    segS[i] = S; segE[i] = E; es[i] = S[0]; ef[i] = E[m - 1];
  }
  // Leistungsgruppen
  const pctW = new Array(n).fill(0), durW = new Array(n).fill(0), cntL = new Array(n).fill(0), pctS = new Array(n).fill(0);
  for (let i = 0; i < n; i++) if (summ[i]) { es[i] = Infinity; ef[i] = -Infinity; }
  for (let i = n - 1; i >= 0; i--) {
    if (!summ[i]) { pctW[i] = (T[i].pct || 0) * T[i].dur; durW[i] = T[i].dur; cntL[i] = 1; pctS[i] = T[i].pct || 0; }
    else if (!isFinite(es[i])) { es[i] = ef[i] = ps; }
    const a = par[i];
    if (a >= 0) { es[a] = Math.min(es[a], es[i]); ef[a] = Math.max(ef[a], ef[i]); pctW[a] += pctW[i]; durW[a] += durW[i]; cntL[a] += cntL[i]; pctS[a] += pctS[i]; }
  }
  // Rückwärtsrechnung (Abschnitte über ihre Lage innerhalb der Leistung berücksichtigt)
  let pe = ps; for (let i = 0; i < n; i++) if (!summ[i]) pe = Math.max(pe, ef[i]);
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k], span = ef[i] - es[i]; let L = pe;
    for (const r of outs[i]) {
      const s = r.s, spanS = ef[s] - es[s];
      const tOff = (end) => (r.ss != null && segS[s] && r.ss < segS[s].length ? (end ? segE[s][r.ss] : segS[s][r.ss]) - es[s] : end ? spanS : 0);
      const aOff = (end) => (r.ps != null && segS[i] && r.ps < segS[i].length ? (end ? segE[i][r.ps] : segS[i][r.ps]) - es[i] : end ? span : 0);
      let v;
      switch (r.type) {
        case 'FS': v = ls[s] + tOff(false) - r.lag - aOff(true); break;
        case 'SS': v = ls[s] + tOff(false) - r.lag - aOff(false); break;
        case 'FF': v = ls[s] + tOff(true) - r.lag - aOff(true); break;
        default: v = ls[s] + tOff(true) - r.lag - aOff(false); break;
      }
      L = Math.min(L, v + span);
    }
    lf[i] = L; ls[i] = L - span;
  }
  const crit = new Array(n).fill(false), slack = new Array(n).fill(0);
  for (let i = 0; i < n; i++) if (!summ[i]) { slack[i] = lf[i] - ef[i]; crit[i] = slack[i] <= 0; }
  for (let i = n - 1; i >= 0; i--) if (crit[i] && par[i] >= 0) crit[par[i]] = true;

  // Anzeige-Tage
  const sd = new Array(n), fd = new Array(n), dur = new Array(n), msEnd = new Array(n).fill(false), pct = new Array(n);
  for (let i = 0; i < n; i++) {
    dur[i] = summ[i] ? ef[i] - es[i] : T[i].dur;
    pct[i] = summ[i] ? (durW[i] > 0 ? pctW[i] / durW[i] : (cntL[i] ? pctS[i] / cntL[i] : 0)) : (T[i].pct || 0);
    if (dur[i] > 0) { sd[i] = fromW(es[i]); fd[i] = fromW(ef[i] - 1); }
    else if (!summ[i] && es[i] > cons[i]) { sd[i] = fd[i] = fromW(es[i] - 1); msEnd[i] = true; } // Meilenstein am Ende des Vortags
    else { sd[i] = fd[i] = fromW(es[i]); }
  }
  const peDay = pe > ps ? fromW(pe - 1) : fromW(ps);
  return { idx, summ, par, es, ef, ls, lf, sd, fd, dur, pct, crit, slack, msEnd, cyc, pe, peDay, segS, segE };
}

/* =====================================================================
   Hilfsfunktionen für Leistungen
   ===================================================================== */
function newTask(name = 'Neue Leistung', dur = 1) {
  return { uid: P.nextUid++, name, dur, cons: null, pct: 0, res: '', gw: '', color: '', notes: '', lvl: 0, preds: [], collapsed: false, cat: '', blk: -1, ph: '' };
}
const blockEnd = (i) => { const T = P.tasks; let j = i; while (j + 1 < T.length && T[j + 1].lvl > T[i].lvl) j++; return j; };
const isAncestor = (a, b) => b > a && b <= blockEnd(a);
const rowOfIdx = (i) => vis.indexOf(i);
const idxOfUid = (uid) => P.tasks.findIndex((t) => t.uid === uid);
function selIdx() {
  const r = [...sel].map(idxOfUid).filter((i) => i >= 0).sort((a, b) => a - b);
  if (!r.length && cur.r < vis.length) r.push(vis[cur.r]);
  return r;
}
function predText(t) {
  return (t.preds || []).map((p) => {
    const i = CAL ? CAL.idx.get(p.uid) : idxOfUid(p.uid); if (i == null || i < 0) return '';
    return (i + 1) + ((p.type !== 'FS' || p.lag) ? T2DE[p.type] : '') + fmtLag(p.lag);
  }).filter(Boolean).join(';');
}
function parsePreds(s, selfIdx) {
  s = s.trim(); if (!s) return [];
  const out = [];
  for (const part of s.split(';')) {
    const x = part.trim(); if (!x) continue;
    const m = /^(\d+)\s*(EA|AA|EE|AE|FS|SS|FF|SF)?\s*(?:([+-])\s*(\d+(?:[.,]\d+)?\s*[a-zä]*))?$/i.exec(x);
    if (!m) throw new UErr(`„${x}“ ist kein gültiger Vorgänger. Beispiele: 3  ·  3EA+2t  ·  4AA  ·  5EE-1t`);
    const i = +m[1] - 1;
    if (i < 0 || i >= P.tasks.length) throw new UErr(`Leistung Nr. ${m[1]} existiert nicht.`);
    if (i === selfIdx) throw new UErr('Eine Leistung kann nicht ihr eigener Vorgänger sein.');
    if (isAncestor(i, selfIdx) || isAncestor(selfIdx, i)) throw new UErr('Leistungsgruppen können nicht mit ihren eigenen Teilleistungen verknüpft werden.');
    let lag = 0;
    if (m[3]) { lag = parseDur(m[4]); if (lag == null) throw new UErr(`Ungültiger Zeitabstand in „${x}“.`); if (m[3] === '-') lag = -lag; }
    const uid = P.tasks[i].uid;
    if (!out.some((p) => p.uid === uid)) out.push({ uid, type: DE2T[(m[2] || 'FS').toUpperCase()], lag });
  }
  return out;
}
function normalize() {
  const T = P.tasks;
  for (let i = 0; i < T.length; i++) {
    const max = i === 0 ? 0 : T[i - 1].lvl + 1;
    if (T[i].lvl > max) T[i].lvl = max;
    if (T[i].lvl < 0) T[i].lvl = 0;
  }
  const uids = new Set(T.map((t) => t.uid));
  for (const t of T) t.preds = (t.preds || []).filter((p) => uids.has(p.uid) && p.uid !== t.uid);
  for (let i = 0; i < T.length; i++) { if (i + 1 < T.length && T[i + 1].lvl > T[i].lvl) T[i].segs = null; else fixSegs(T[i]); }
  const byU = new Map(T.map((t) => [t.uid, t]));
  for (const t of T) for (const p of t.preds) {
    if (p.ss != null && !(t.segs && p.ss >= 0 && p.ss < t.segs.length)) delete p.ss;
    const pt = byU.get(p.uid); if (p.ps != null && !(pt && pt.segs && p.ps >= 0 && p.ps < pt.segs.length)) delete p.ps;
  }
}
// Abschnitte (Unterbrechungen): Summe der Abschnitte = Dauer, Pause 0 → Abschnitte zusammenführen
function fixSegs(t) {
  if (!Array.isArray(t.segs) || !(t.dur > 0)) { t.segs = null; return; }
  let sg = t.segs.map((x, k) => ({ d: Math.max(1, Math.round(+x.d || 1)), gap: k ? Math.max(0, Math.round(+x.gap || 0)) : 0 }));
  sg = sg.reduce((acc, x, k) => { if (k && x.gap === 0) acc[acc.length - 1].d += x.d; else acc.push(x); return acc; }, []);
  let diff = t.dur - sg.reduce((acc, x) => acc + x.d, 0);
  if (diff > 0) sg[sg.length - 1].d += diff;
  while (diff < 0 && sg.length) { const L = sg[sg.length - 1]; if (L.d + diff >= 1) { L.d += diff; diff = 0; } else { diff += L.d; sg.pop(); } }
  t.segs = sg.length > 1 ? sg : null;
}

/* ---------- Änderungen, Rückgängig ---------- */
const snapshot = () => JSON.stringify({ name: P.name, start: P.start, nextUid: P.nextUid, tasks: P.tasks, gwColors: P.gwColors || {}, assist: P.assist || null, cal: P.cal || null, trades: P.trades || {} });
const restore = (s) => Object.assign(P, JSON.parse(s));
// Verliert eine Leistung Verknüpfungen (ohne neue zu bekommen), behält sie ihren bisherigen Anfang:
// er wird als Einschränkung „Anfang nicht früher als“ festgehalten – aber nur, wenn sie sonst nach vorn springen würde.
function vorherMerken() {
  const m = new Map();
  if (!CAL || !CAL.es) return m;
  P.tasks.forEach((t, i) => m.set(t.uid, { preds: new Set((t.preds || []).map((p) => p.uid)), es: CAL.es[i] }));
  return m;
}
function ortHalten(vorher, C) {
  const T = P.tasks, n = T.length; let fest = 0;
  for (let i = 0; i < n; i++) {
    const alt = vorher.get(T[i].uid); if (!alt) continue;
    const neu = new Set((T[i].preds || []).map((p) => p.uid));
    let weg = false, dazu = false;
    for (const u of alt.preds) if (!neu.has(u)) weg = true;
    for (const u of neu) if (!alt.preds.has(u)) dazu = true;
    if (!weg || dazu) continue;
    const bis = C.summ[i] ? blockEnd(i) : i;          // bei Gruppen: alle Leistungen darin
    for (let l = i; l <= bis; l++) {
      if (C.summ[l]) continue;
      const a = vorher.get(T[l].uid); if (!a || a.es == null || !(C.es[l] < a.es)) continue;
      const tag = fromW(a.es);
      if (T[l].cons == null || toW(T[l].cons) < a.es) { T[l].cons = tag; fest++; }
    }
  }
  return fest;
}
function act(fn) {
  const snap = snapshot();
  const vorher = vorherMerken();
  try { fn(); } catch (e) {
    restore(snap);
    if (e instanceof UErr) { toast(e.message, true); return false; }
    throw e;
  }
  normalize();
  let C = schedule();
  if (!C.cyc && vorher.size) {
    const fest = ortHalten(vorher, C);
    if (fest) { C = schedule(); toast(fest === 1 ? 'Die Leistung bleibt an ihrem Termin (als „Anfang nicht früher als“ festgehalten).' : `${fest} Leistungen bleiben an ihrem Termin (als „Anfang nicht früher als“ festgehalten).`); }
  }
  if (C.cyc) {
    restore(snap); CAL = schedule(); render();
    toast('Diese Änderung würde einen Zirkelbezug zwischen Leistungen erzeugen und wurde nicht übernommen.', true);
    return false;
  }
  if (snap !== snapshot()) { undoS.push(snap); if (undoS.length > 200) undoS.shift(); redoS = []; }
  CAL = C; render(); queueSave();
  return true;
}
function doUndo() { if (!undoS.length) return; redoS.push(snapshot()); restore(undoS.pop()); CAL = schedule(); render(); queueSave(); }
function doRedo() { if (!redoS.length) return; undoS.push(snapshot()); restore(redoS.pop()); CAL = schedule(); render(); queueSave(); }
