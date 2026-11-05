'use strict';
/* =====================================================================
   Gantt – Projektplanung im Browser
   Tabelle (links) + Balkendiagramm (rechts), automatische Planung mit
   Arbeitstagen (Mo–Fr), Anordnungsbeziehungen EA/AA/EE/AE, Leistungsgruppen,
   Meilensteine, kritischer Weg, Drag & Drop, Rückgängig.
   ===================================================================== */

const $ = (s) => document.querySelector(s);
const RH = 24;          // Zeilenhöhe
const HH = 44;          // Kopfhöhe
const DAY = 86400000;
const MON = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONL = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WD2 = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WD1 = ['S', 'M', 'D', 'M', 'D', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
  { k: 'res', t: 'Unternehmer', w: 130 },
  { k: 'pct', t: '% Abg.', w: 56 },
];
const COLK = COLS.map((c) => c.k);
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
function act(fn) {
  const snap = snapshot();
  try { fn(); } catch (e) {
    restore(snap);
    if (e instanceof UErr) { toast(e.message, true); return false; }
    throw e;
  }
  normalize();
  const C = schedule();
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

/* =====================================================================
   Rendering
   ===================================================================== */
function computeVis() {
  vis = []; const T = P.tasks; let hide = Infinity;
  for (let i = 0; i < T.length; i++) {
    const t = T[i];
    if (t.lvl > hide) continue;
    hide = Infinity; vis.push(i);
    if (CAL.summ[i] && t.collapsed) hide = t.lvl;
  }
}
const nRows = () => vis.length + Math.max(25, Math.ceil((gridPane.clientHeight || 600) / RH));

function render() {
  if (!P) return;
  computeVis();
  if (cur.r >= nRows()) cur.r = nRows() - 1;
  renderGrid(); renderChart(); renderStatus(); updateRibbon(); updateProjSub();
  if (window.AssistCore) AssistCore.notifySoon();
  if (typeof renderFirms === 'function' && !$('#firmView').hidden && !window.fvSkip) renderFirms();
  if (typeof renderLib === 'function' && !$('#libView').hidden) renderLib();
}

function updateProjSub() {
  const el = $('#projSub'); if (!el || !P) return;
  const n = P.tasks.length;
  el.textContent = n && CAL ? `${fmtD(P.start)} – ${fmtD(CAL.peDay)} · ${n} Leistungen` : 'Noch keine Leistungen';
}

/* ---------- Einstellungen: zentral in der Verwaltung (KI, Farben …); „Beim Löschen fragen“ im Reiter Leistung ---------- */
function settingsDialog() {
  if (window.BPHead && BPHead.einstellungen) { BPHead.einstellungen(); return; }   // ⚙ – gleiches Einstellungsfenster wie in allen Apps
  const conf = window.BP && BP.conf, me = window.BP && BP.me;
  const portal = conf && (conf.apps || []).find((a) => a.key === 'portal');
  modal('Einstellungen', `<div style="max-width:440px;line-height:1.5">Die Einstellungen der Bauplattform (KI, Kennwerte …) nimmt die Verwaltung vor${me ? '' : ''}.<br><br>
    Deine Farben stellst du auf der Startseite unter <b>Darstellung</b> ein${portal && window.BPHead ? ` – <a href="${esc(BPHead.appUrl(portal))}/#darstellung">zur Startseite</a>` : ''}.<br>
    Ob beim Löschen von Leistungen nachgefragt wird, schaltest du im Reiter <b>Leistung</b> um.</div>`, [{ label: 'OK', cls: 'primary', primary: true }]);
}
function renderAfterTheme() { if (P) render(); }

function cellHTML(k, i, t) {
  const c = CAL;
  switch (k) {
    case 'nr': return i + 1;
    case 'ind': {
      let s = '';
      if (!c.summ[i] && (t.pct || 0) >= 100) s += '<span class="ico-d" title="Diese Leistung ist abgeschlossen.">✓</span>';
      if (t.cons != null) s += `<span class="ico-c" title="Einschränkung: Anfang nicht früher als ${fmtD(t.cons)}">▦</span>`;
      if (segList(t)) s += `<span class="ico-s" title="Unterbrochen: ${t.segs.map((x, k) => (k ? `Pause ${x.gap} T, ` : '') + `${x.d} T`).join(', ')}">⋯</span>`;
      if (t.notes) s += `<span class="ico-n" title="${esc(t.notes)}">✎</span>`;
      return s;
    }
    case 'name': {
      const tog = c.summ[i] ? `<span class="tog" data-tog="${i}">${t.collapsed ? '▶' : '◢'}</span>` : '<span class="tog"></span>';
      return `<span class="ind" style="width:${t.lvl * 16}px"></span>${tog}<span class="nm">${esc(t.name)}</span>`;
    }
    case 'dur': return durText(i);
    case 'start': return fmtD(c.sd[i]);
    case 'finish': return fmtD(c.fd[i]);
    case 'pred': return esc(predText(t));
    case 'res': return esc(t.res || '');
    case 'gw': return (t.gw || t.color) ? `<span class="gwdot${t.color ? ' own' : ''}" style="background:${effColor(t)}" title="${t.color ? 'Eigene Balkenfarbe' : 'Farbe des Gewerks'}"></span><span class="nm">${esc(t.gw || '')}</span>` : '';
    case 'pct': return Math.round(c.pct[i]) + '%';
  }
  return '';
}

function renderGrid() {
  gridHead.innerHTML = COLS.map((c) => `<div class="hc c-${c.k}" style="width:${colW[c.k]}px"><span class="lbl">${c.t}</span>${c.k !== 'nr' ? `<span class="rz" data-k="${c.k}"></span>` : ''}</div>`).join('');
  const total = nRows(); const T = P.tasks; let h = '';
  for (let r = 0; r < total; r++) {
    const i = vis[r];
    if (i == null) {
      h += `<div class="row blank" data-r="${r}">` + COLS.map((c) => `<div class="c c-${c.k}${cur.r === r && cur.c === c.k ? ' cur' : ''}" style="width:${colW[c.k]}px" data-c="${c.k}"></div>`).join('') + '</div>';
      continue;
    }
    const t = T[i];
    const cls = ['row', sel.has(t.uid) ? 'sel' : '', CAL.summ[i] ? 'sum' : '', !CAL.summ[i] && t.dur === 0 ? 'ms' : ''].join(' ');
    h += `<div class="${cls}" data-r="${r}">` + COLS.map((c) => `<div class="c c-${c.k}${cur.r === r && cur.c === c.k ? ' cur' : ''}" style="width:${colW[c.k]}px" data-c="${c.k}">${cellHTML(c.k, i, t)}</div>`).join('') + '</div>';
  }
  gridBody.innerHTML = h;
}

/* ---------- Zeitskala ---------- */
function startOf(u, n) {
  const D = ud(n), y = D.getUTCFullYear(), m = D.getUTCMonth();
  switch (u) {
    case 'day': return n;
    case 'week': return n - ((D.getUTCDay() + 6) % 7);
    case 'month': return Date.UTC(y, m, 1) / DAY;
    case 'quarter': return Date.UTC(y, m - (m % 3), 1) / DAY;
    case 'year': return Date.UTC(y, 0, 1) / DAY;
  }
}
function nextOf(u, n) {
  const D = ud(n), y = D.getUTCFullYear(), m = D.getUTCMonth();
  switch (u) {
    case 'day': return n + 1;
    case 'week': return n + 7;
    case 'month': return Date.UTC(y, m + 1, 1) / DAY;
    case 'quarter': return Date.UTC(y, m + 3, 1) / DAY;
    case 'year': return Date.UTC(y + 1, 0, 1) / DAY;
  }
}
function tier(u, a, b) { const out = []; let d = startOf(u, a); while (d < b) { const e = nextOf(u, d); out.push([d, e]); d = e; } return out; }
function tlabel(u, n, w, top) {
  const D = ud(n), y = D.getUTCFullYear(), m = D.getUTCMonth(), d = D.getUTCDate(), yy = String(y).slice(2);
  switch (u) {
    case 'year': return String(y);
    case 'quarter': { const q = Math.floor(m / 3) + 1; return top ? (w > 110 ? `${q}. Quartal ${y}` : `Q${q} '${yy}`) : (w > 70 ? `${q}. Quartal` : `Q${q}`); }
    case 'month': return top ? (w > 110 ? `${MONL[m]} ${y}` : `${MON[m]} '${yy}`) : (w > 70 ? MONL[m] : w > 26 ? MON[m] : MON[m][0]);
    case 'week': return top ? (w > 220 ? `${pad(d)}. ${MONL[m]} ${y}` : `${pad(d)}. ${MON[m]} '${yy}`) : (w > 38 ? `${pad(d)}.${pad(m + 1)}.` : pad(d));
    case 'day': { const g = D.getUTCDay(); return w < 26 ? WD1[g] : w < 50 ? pad(d) : `${WD2[g]} ${pad(d)}.`; }
  }
  return '';
}

/* ---------- Diagramm ---------- */
const X = (d) => (d - view.start) * ZOOMS[zoom].ppd;

function linkPath(a, b, type) {
  const ya = a.y + RH / 2, yb = b.y + RH / 2, down = yb >= ya, g = 7;
  switch (type) {
    case 'FS': {
      const xa = a.x2;
      if (b.cx >= xa + g + 3) return `M${xa},${ya}H${b.cx}V${down ? b.y + 5 : b.y + RH - 5}`;
      const yh = down ? b.y : b.y + RH;
      return `M${xa},${ya}h${g}V${yh}H${b.x1 - g * 1.6}V${yb}H${b.x1}`;
    }
    case 'SS': { const xl = Math.min(a.x1, b.x1) - g * 1.6; return `M${a.x1},${ya}H${xl}V${yb}H${b.x1}`; }
    case 'FF': { const xr = Math.max(a.x2, b.x2) + g * 1.6; return `M${a.x2},${ya}H${xr}V${yb}H${b.x2}`; }
    case 'SF': { const yh = down ? b.y : b.y + RH; return `M${a.x1},${ya}h${-g}V${yh}H${b.x2 + g * 1.6}V${yb}H${b.x2}`; }
  }
  return '';
}

function renderChart() {
  const z = ZOOMS[zoom], ppd = z.ppd, T = P.tasks, c = CAL;
  let mn = P.start, mx = P.start;
  for (let i = 0; i < T.length; i++) { mn = Math.min(mn, c.sd[i]); mx = Math.max(mx, c.fd[i]); }
  const old = view.start, oldPpd = view.ppd;
  view.start = startOf(z.t, mn - Math.ceil(90 / ppd) - 2);
  view.end = nextOf(z.t, Math.max(mx + Math.ceil(240 / ppd), view.start + Math.ceil((chartPane.clientWidth || 1200) * 1.2 / ppd)));
  view.ppd = ppd;
  const W = Math.ceil((view.end - view.start) * ppd);
  const total = nRows(), H = total * RH;

  // Kopf
  let h = `<svg width="${W}" height="${HH}"><rect width="${W}" height="${HH}" class="tsbg"/>`;
  for (const [a, b] of tier(z.t, view.start, view.end)) {
    const x = Math.round(X(a)) + 0.5, w = (b - a) * ppd;
    h += `<line x1="${x}" y1="0" x2="${x}" y2="22" class="tl"/>`;
    if (w > 28) h += `<text x="${x + 5}" y="15" class="tt">${tlabel(z.t, a, w, true)}</text>`;
  }
  h += `<line x1="0" y1="22.5" x2="${W}" y2="22.5" class="tl"/>`;
  for (const [a, b] of tier(z.b, view.start, view.end)) {
    const x = Math.round(X(a)) + 0.5, w = (b - a) * ppd;
    h += `<line x1="${x}" y1="22" x2="${x}" y2="${HH}" class="tl"/>`;
    if (z.b === 'day' && freeName(a)) h += `<rect x="${x}" y="22.5" width="${w}" height="${HH - 23}" class="holh"><title>${esc(freeName(a))}</title></rect>`;
    if (w >= 9) h += `<text x="${x + w / 2}" y="37" text-anchor="middle" class="tb${z.b === 'day' && isWE(a) ? ' we' : ''}${z.b === 'day' && freeName(a) ? ' ho' : ''}">${tlabel(z.b, a, w, false)}</text>`;
  }
  chartHead.style.width = W + 'px';
  chartHead.innerHTML = h + '</svg>';

  // Körper
  let s = `<svg width="${W}" height="${H}" id="chartSvg"><defs>
    <marker id="ah" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp"/></marker>
    <marker id="ahc" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp crit"/></marker>
    <marker id="ahpre" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp pre"/></marker>
    <marker id="ahsuc" viewBox="0 0 8 8" refX="7.5" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0.6L8,4L0,7.4z" class="ahp suc"/></marker></defs>`;
  if (ppd >= 3) {
    for (let d = view.start; d < view.end; d++) {
      if (isWork(d)) continue;
      const fn = freeName(d);
      s += `<rect x="${X(d)}" y="0" width="${ppd}" height="${H}" class="${fn ? 'hol' : 'wes'}">${fn ? `<title>${esc(fn)} – ${fmtD(d)}</title>` : ''}</rect>`;
    }
  }
  if (ppd >= 6) for (const [a] of tier(z.b, view.start, view.end)) { const x = Math.round(X(a)) + 0.5; s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="gl"/>`; }
  for (const [a] of tier(z.t, view.start, view.end)) { const x = Math.round(X(a)) + 0.5; s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" class="gl2"/>`; }
  s += '<g id="selg"></g><g id="relg"></g>';
  const td = todayN();
  if (td >= view.start && td < view.end) s += `<line x1="${X(td) + 0.5}" y1="0" x2="${X(td) + 0.5}" y2="${H}" class="today"><title>Heute: ${fmtD(td)}</title></line>`;
  s += `<line x1="${X(P.start) + 0.5}" y1="0" x2="${X(P.start) + 0.5}" y2="${H}" class="pstart"><title>Projektanfang: ${fmtD(P.start)}</title></line>`;

  // Geometrie
  geo = {};
  vis.forEach((i, r) => { geo[i] = barGeo(i, r * RH, X, ppd); });
  // Verknüpfungslinien
  let links = '';
  vis.forEach((i) => {
    const t = T[i];
    (t.preds || []).forEach((p, k) => {
      const pi = c.idx.get(p.uid); if (pi == null || !geo[pi]) return;
      const cr = showCrit && c.crit[i] && c.crit[pi];
      const d = linkPath(segAnchor(geo[pi], p.ps), segAnchor(geo[i], p.ss), p.type);
      links += `<g class="lk${c.crit[i] && c.crit[pi] ? ' critl' : ''}" data-s="${i}" data-p="${pi}" data-k="${k}"><path d="${d}" class="lkh"/><path d="${d}" class="lkl${cr ? ' crit' : ''}" marker-end="url(#${cr ? 'ahc' : 'ah'})"/></g>`;
    });
  });
  // Balken
  let bars = '';
  vis.forEach((i) => {
    const t = T[i], g = geo[i], y = g.y, cr = showCrit && c.crit[i];
    if (c.summ[i]) {
      const { x1 } = g, x2 = Math.max(g.x2, x1 + 8);
      const pw = (x2 - x1) * c.pct[i] / 100;
      bars += `<g class="bar sum${cr ? ' crit' : ''}" data-i="${i}"><path class="sumbar" d="M${x1},${y + 7}H${x2}V${y + 17}L${x2 - 5},${y + 12}H${x1 + 5}L${x1},${y + 17}Z"/>`
        + (pw > 0 ? `<rect class="sumprog" x="${x1}" y="${y + 9}" width="${pw}" height="1.5"/>` : '') + `<circle class="lkdot" cx="${x2 + 7}" cy="${y + 12}" r="3.5"/></g>`;
    } else if (t.dur === 0) {
      bars += `<g class="bar${cr ? ' crit' : ''}" data-i="${i}"><path class="ms" d="M${g.cx},${y + 5}L${g.cx + 7},${y + 12}L${g.cx},${y + 19}L${g.cx - 7},${y + 12}Z"/><circle class="lkdot" cx="${g.cx + 13}" cy="${y + 12}" r="3.5"/></g>`;
    } else {
      const gc = effColor(t);
      const bst = gc ? ` style="fill:${gc};stroke:${cr ? '#c00000' : shade(gc, 0.7)};stroke-width:${cr ? 2 : 1}"` : '';
      const pst = gc ? ` style="fill:${shade(gc, 0.42)}"` : '';
      let doneW = t.dur * (t.pct || 0) / 100, h = '', px = g.x1;
      g.segs.forEach((sg, k) => {
        const w = Math.max(2, sg.x2 - sg.x1), d = sg.d;
        const f = Math.max(0, Math.min(1, doneW / d)); doneW -= d;
        if (f > 0) px = sg.x1 + w * f;
        if (k) h += `<line class="segc" x1="${g.segs[k - 1].x2}" y1="${y + 12}" x2="${sg.x1}" y2="${y + 12}"/>`;
        h += `<g class="sg" data-seg="${k}"><rect class="b" data-seg="${k}" x="${sg.x1}" y="${y + 6}" width="${w}" height="12"${bst}/>`
          + (f > 0 ? `<rect class="p" x="${sg.x1}" y="${y + 10}" width="${w * f}" height="4"${pst}/>` : '') + '</g>';
      });
      bars += `<g class="bar${cr ? ' crit' : ''}${g.segs.length > 1 ? ' split' : ''}" data-i="${i}">${h}`
        + `<rect class="lh" x="${g.x1 - 3}" y="${y + 4}" width="7" height="16"/><rect class="rh" x="${g.x2 - 5}" y="${y + 4}" width="8" height="16"/>`
        + `<path class="ph" d="M${px},${y + 17}l4,5h-8z"/><circle class="lkdot" cx="${g.x2 + 7}" cy="${y + 12}" r="3.5"/></g>`;
    }
    bars += barLabels(i, g, y);
  });
  chartBody.style.width = W + 'px';
  chartBody.className = 'lk-' + linkMode + (typeof splitMode !== 'undefined' && splitMode ? ' splitting' : '');
  chartBody.innerHTML = s + '<rect id="hovband" x="0" y="-100" width="100%" height="' + RH + '"/>' + links + bars + '</svg>';
  updateSelBands(); markLinks();
  // Scrollposition stabil halten, wenn sich der Anfang der Zeitachse verschiebt
  if (old != null && oldPpd === ppd && old !== view.start) chartPane.scrollLeft += (old - view.start) * ppd;
}

/* ---------- Balkengeometrie (auch für den Druck) ---------- */
function barGeo(i, y, Xf, ppd) {
  const c = CAL, t = P.tasks[i];
  if (!c.summ[i] && t.dur === 0) { const cx = Xf(c.sd[i]) + (c.msEnd[i] ? ppd : 0); return { x1: cx - 6, x2: cx + 6, cx, y, ms: true, segs: [] }; }
  if (c.summ[i]) { const x1 = Xf(c.sd[i]), x2 = c.dur[i] > 0 ? Xf(c.fd[i] + 1) : x1 + 2; return { x1, x2, cx: x1 + Math.min(6, (x2 - x1) / 2), y, segs: [] }; }
  const S = c.segS[i], E = c.segE[i], D = segList(t) ? t.segs.map((x) => x.d) : [t.dur];
  const segs = S.map((st, k) => ({ x1: Xf(fromW(st)), x2: Xf(fromW(E[k] - 1) + 1), d: D[k], s: st, e: E[k] }));
  const x1 = segs[0].x1, x2 = segs[segs.length - 1].x2;
  return { x1, x2, cx: x1 + Math.min(6, (segs[0].x2 - x1) / 2), y, segs };
}
function segAnchor(g, k) {
  if (k == null || !g.segs || !g.segs[k]) return g;
  const sg = g.segs[k];
  return { ...g, x1: sg.x1, x2: sg.x2, cx: sg.x1 + Math.min(6, (sg.x2 - sg.x1) / 2) };
}

/* ---------- Balkenbeschriftung (links / im Balken / rechts) ---------- */
const LABEL_FIELDS = [['', '– keine –'], ['name', 'Leistung'], ['res', 'Unternehmer'], ['craft', 'Unternehmer-Bezeichnung (Firmenliste)'], ['gw', 'Gewerk'], ['dur', 'Dauer'], ['start', 'Anfang'], ['finish', 'Ende'], ['dates', 'Anfang – Ende'], ['pct', '% Abgeschlossen'], ['nr', 'Nr.']];
/* Dauer von Leistungsgruppen: Zeitspanne wie MS Project (Standard), Summe der Leistungen oder beides */
let sumMode = LS.get('sumMode2', 'span');
function sumWork(i) {
  let s = 0; const e = blockEnd(i);
  for (let k = i + 1; k <= e; k++) if (!CAL.summ[k]) s += Math.max(0, P.tasks[k].dur || 0);
  return s;
}
function durText(i) {
  if (!CAL.summ[i]) return fmtDur(CAL.dur[i]);
  const sum = sumWork(i), span = CAL.dur[i];
  if (sumMode === 'span') return fmtDur(span);
  if (sumMode === 'both') return sum === span ? fmtDur(sum) : `${fmtDur(sum)} (Spanne ${span})`;
  return fmtDur(sum);
}
let barLbl = Object.assign({ l: '', m: '', r: 'res' }, LS.get('barLbl', {}));
function lblVal(i, f) {
  const t = P.tasks[i], c = CAL;
  switch (f) {
    case 'name': return t.name || '';
    case 'res': return t.res || '';
    case 'gw': return t.gw || '';
    case 'craft': return t.gw && typeof craftOf === 'function' ? craftOf(t.gw) : '';
    case 'dur': return c.summ[i] || t.dur ? durText(i) : '';
    case 'start': return fmtShort(c.sd[i]);
    case 'finish': return fmtShort(c.fd[i]);
    case 'dates': return c.sd[i] === c.fd[i] ? fmtShort(c.sd[i]) : fmtShort(c.sd[i]) + ' – ' + fmtShort(c.fd[i]);
    case 'pct': return Math.round(c.pct[i]) + '%';
    case 'nr': return String(i + 1);
  }
  return '';
}
const textOn = (hex) => { if (!hex || hex[0] !== '#') return '#1e1e1e'; const n = parseInt(hex.slice(1), 16); const L = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); return L < 150 ? '#fff' : '#1e1e1e'; };
const clipTxt = (s, px, cw = 6.1) => { s = String(s || ''); const n = Math.floor((px - 6) / cw); return n < 2 ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s; };
function barLabels(i, g, y, lbl = barLbl) {
  const t = P.tasks[i], c = CAL, ms = !c.summ[i] && t.dur === 0;
  let out = '';
  const L = lbl.l ? lblVal(i, lbl.l) : '';
  if (L) out += `<text class="blabel" text-anchor="end" x="${(ms ? g.cx - 9 : g.x1) - 6}" y="${y + 16}">${esc(L)}</text>`;
  if (lbl.m && !ms && !c.summ[i] && g.segs.length) {
    const sg = g.segs.reduce((a, b) => (b.x2 - b.x1 > a.x2 - a.x1 ? b : a), g.segs[0]);
    const txt = clipTxt(lblVal(i, lbl.m), sg.x2 - sg.x1);
    if (txt) out += `<text class="blabel inbar" x="${sg.x1 + 4}" y="${y + 15.5}" style="fill:${textOn(effColor(t) || '#8db3e2')}">${esc(txt)}</text>`;
  }
  let R = lbl.r ? lblVal(i, lbl.r) : '';
  if (ms && !R) R = fmtShort(c.sd[i]);
  if (R) out += `<text class="blabel" x="${(ms ? g.cx + 7 : Math.max(g.x2, g.x1 + 8)) + 14}" y="${y + 16}">${esc(R)}</text>`;
  return out;
}

function renderStatus() {
  const n = P.tasks.length;
  const c0 = P.cal || {}, calTxt = `${+c0.week || 5}-Tage-Woche · ${(STATES.find((x) => x[0] === (c0.state ?? 'DE')) || STATES[1])[1].replace('nur bundesweite Feiertage', 'Feiertage bundesweit')}${(c0.free || []).length ? ' · ' + c0.free.length + ' eigene freie Zeiträume' : ''}`;
  $('#stInfo').textContent = n ? `${n} Leistungen  ·  Anfang ${fmtD(P.start)}  ·  Ende ${fmtD(CAL.peDay)}  ·  ${CAL.pe - toW(P.start)} Arbeitstage  ·  ${calTxt}` : 'Keine Leistungen – tippe einen Namen in die erste Zeile';
  markDirty();
  $('#projStart').value = isoD(P.start);
  $('#zoomRange').value = zoom;
}

function updateSelBands() {
  const g = document.getElementById('selg'); if (!g) return;
  let s = '';
  vis.forEach((i, r) => { if (sel.has(P.tasks[i].uid)) s += `<rect x="0" y="${r * RH}" width="100%" height="${RH}" class="selband"/>`; });
  g.innerHTML = s;
}
/* ---------- Pfeile anzeigen: alle / nur markierte / kritischer Weg / keine ---------- */
let linkMode = LS.get('linkMode', 'sel'), hoverLinkI = null;
// markierte Leistung: Vorgänger blau, Nachfolger orange – Pfeile, Balken und Zeilen
function markLinks() {
  const on = new Set(selIdx()); if (hoverLinkI != null) on.add(hoverLinkI);
  if (linkMode === 'sel') chartBody.querySelectorAll('.lk').forEach((g) => g.classList.toggle('on', on.has(+g.dataset.s) || on.has(+g.dataset.p)));
  const pre = new Set(), suc = new Set(), few = on.size > 0 && on.size <= 12;
  chartBody.querySelectorAll('.lk').forEach((g) => {
    const si = +g.dataset.s, pi = +g.dataset.p, isPre = few && on.has(si) && !on.has(pi), isSuc = few && on.has(pi) && !on.has(si);
    g.classList.toggle('pre', isPre); g.classList.toggle('suc', isSuc);
    if (isPre) { pre.add(pi); g.parentNode.appendChild(g); } if (isSuc) { suc.add(si); g.parentNode.appendChild(g); }   // nach vorn holen
  });
  chartBody.querySelectorAll('.bar[data-i]').forEach((b) => { const i = +b.dataset.i; b.classList.toggle('is-pre', pre.has(i)); b.classList.toggle('is-suc', suc.has(i) && !pre.has(i)); });
  gridBody.querySelectorAll('.row').forEach((row) => { const i = vis[+row.dataset.r]; row.classList.toggle('row-pre', pre.has(i)); row.classList.toggle('row-suc', suc.has(i) && !pre.has(i)); });
  const g = document.getElementById('relg');
  if (g) { let h = ''; vis.forEach((i, r) => { if (pre.has(i)) h += `<rect x="0" y="${r * RH}" width="100%" height="${RH}" class="preband"/>`; else if (suc.has(i)) h += `<rect x="0" y="${r * RH}" width="100%" height="${RH}" class="sucband"/>`; }); g.innerHTML = h; }
}
function updateSel() {
  gridBody.querySelectorAll('.row').forEach((row) => { const i = vis[+row.dataset.r]; row.classList.toggle('sel', i != null && sel.has(P.tasks[i].uid)); });
  gridBody.querySelectorAll('.c.cur').forEach((x) => x.classList.remove('cur'));
  const cc = gridBody.querySelector(`.row[data-r="${cur.r}"] .c-${cur.c}`); if (cc) cc.classList.add('cur');
  updateSelBands(); markLinks(); updateRibbon();
}
function updateRibbon() {
  const b = (a) => document.querySelector(`.rb[data-act="${a}"]`);
  b('undo').disabled = !undoS.length; b('redo').disabled = !redoS.length;
  $('#btnCrit').classList.toggle('on', showCrit);
  $('#btnAuto').classList.toggle('on', !!autoLink);
  { const da = $('#btnDelAsk'); if (da) da.classList.toggle('on', !!LS.get('delAsk', true)); }
  $('#btnAssist').classList.toggle('on', document.body.classList.contains('assist-open'));
  const has = selIdx().length > 0;
  ['deleteSel', 'indent', 'outdent', 'unlinkSel', 'taskInfo', 'scrollToTask', 'moveUp', 'moveDown', 'insertSummary'].forEach((a) => { b(a).disabled = !has; });
  document.querySelectorAll('.rb[data-act="pct"]').forEach((x) => { x.disabled = !has; });
  b('linkSel').disabled = selIdx().length < 2;
}

/* =====================================================================
   Auswahl & Tabelle bearbeiten
   ===================================================================== */
function selectRow(r, e) {
  cur.r = r;
  if (r >= vis.length) { if (!(e && (e.ctrlKey || e.metaKey || e.shiftKey))) sel.clear(); anchorR = r; updateSel(); return; }
  const uid = P.tasks[vis[r]].uid;
  if (e && e.shiftKey) {
    sel.clear(); const a = Math.min(anchorR, r), b = Math.max(anchorR, r);
    for (let k = a; k <= b && k < vis.length; k++) sel.add(P.tasks[vis[k]].uid);
  } else if (e && (e.ctrlKey || e.metaKey)) { sel.has(uid) ? sel.delete(uid) : sel.add(uid); anchorR = r; }
  else { sel = new Set([uid]); anchorR = r; }
  updateSel();
}
function selectTaskIdx(i) { const r = rowOfIdx(i); if (r >= 0) { sel = new Set([P.tasks[i].uid]); cur.r = r; anchorR = r; } }
function ensureVisible(r) {
  const top = r * RH, bottom = top + RH, vh = gridPane.clientHeight - HH - 16;
  if (top < gridPane.scrollTop) gridPane.scrollTop = top;
  else if (bottom > gridPane.scrollTop + vh) gridPane.scrollTop = bottom - vh;
  const cell = gridBody.querySelector(`.row[data-r="${r}"] .c-${cur.c}`);
  if (cell) {
    const l = cell.offsetLeft, rr = l + cell.offsetWidth;
    if (l < gridPane.scrollLeft) gridPane.scrollLeft = l;
    else if (rr > gridPane.scrollLeft + gridPane.clientWidth - 16) gridPane.scrollLeft = rr - gridPane.clientWidth + 16;
  }
}
function rawVal(i, c) {
  const t = P.tasks[i];
  switch (c) {
    case 'name': return t.name;
    case 'dur': return fmtDur(CAL.dur[i]);
    case 'start': return fmtD(CAL.sd[i]);
    case 'finish': return fmtD(CAL.fd[i]);
    case 'pred': return predText(t);
    case 'res': return t.res || '';
    case 'gw': return t.gw || '';
    case 'pct': return String(t.pct || 0);
  }
  return '';
}
/* ---------- Vorschlagsliste für Bezeichnungen: zuletzt verwendet · im Projekt · Leistungskatalog ---------- */
function nameHistAdd(n) {
  n = String(n || '').trim(); if (n.length < 2) return;
  const h = LS.get('nameHist', []).filter((x) => x !== n); h.unshift(n); LS.set('nameHist', h.slice(0, 40));
}
function nameGroups(exclude) {
  const seen = new Set([String(exclude || '').trim().toLowerCase()]), g = [];
  const add = (title, list) => { const items = []; for (const it of list) { const k = it.n.trim().toLowerCase(); if (!k || seen.has(k)) continue; seen.add(k); items.push(it); } if (items.length) g.push({ title, items }); };
  add('Zuletzt verwendet', LS.get('nameHist', []).map((n) => ({ n })));
  if (P) add('In diesem Projekt', P.tasks.filter((t, i) => t.name && !(i + 1 < P.tasks.length && P.tasks[i + 1].lvl > t.lvl)).map((t) => ({ n: t.name, gw: t.gw })));
  add('Leistungskatalog', [...(window.LIBRARY || []).map((x) => ({ n: x.n, gw: x.gw })), ...(window.CATALOG ? CATALOG.items.filter((x) => !x.ms).map((x) => ({ n: x.n, gw: x.gw })) : [])]);
  return g;
}
// Vorschläge für den Unternehmer: Firmen des Gewerks · Unternehmerbezeichnung · im Projekt · Adressbuch
function resGroups(gw, cur) {
  const seen = new Set([String(cur || '').trim().toLowerCase()]), g = [];
  const add = (title, names) => { const items = []; for (const n of names) { const k = String(n || '').trim().toLowerCase(); if (!k || seen.has(k)) continue; seen.add(k); items.push({ n: String(n).trim() }); } if (items.length) g.push({ title, items }); };
  const book = typeof FIRMS !== 'undefined' ? FIRMS.slice().sort((a, b) => a.name.localeCompare(b.name, 'de')) : [];
  if (gw) {
    const tr = P && P.trades && P.trades[gw], f = tr && tr.firm && typeof firmById === 'function' ? firmById(tr.firm) : null;
    add('Firmen für ' + gw, [...(f ? [f.name] : []), ...book.map((x) => [x, typeof firmGwScore === 'function' ? firmGwScore(x, gw) : 0]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map((x) => x[0].name)]);
    add('Unternehmerbezeichnung', [typeof craftOf === 'function' ? craftOf(gw) : '']);
  }
  if (P) add('Im Projekt verwendet', [...new Set(P.tasks.map((t) => t.res).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')));
  add('Adressbuch', book.map((x) => x.name));
  return g;
}
// Eingabefeld mit Aufklappliste (▾ oder Alt+↓ öffnet, Tippen filtert, ↑/↓ + Enter wählt)
function attachCombo(inp, groupsFn, onPick) {
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'combo-dd'; btn.tabIndex = -1; btn.textContent = '▾'; btn.title = 'Vorschläge anzeigen';
  inp.insertAdjacentElement('afterend', btn); inp.setAttribute('autocomplete', 'off');
  let pop = null, act = -1, flat = [];
  const close = () => { if (pop) { pop.remove(); pop = null; } act = -1; };
  const open = (filter) => {
    const q = String(filter || '').trim().toLowerCase();
    const groups = groupsFn().map((g) => ({ title: g.title, items: g.items.filter((x) => !q || x.n.toLowerCase().includes(q)).slice(0, q ? 12 : 8) })).filter((g) => g.items.length);
    if (!groups.length) { close(); return; }
    if (!pop) { pop = document.createElement('div'); pop.className = 'combo-pop'; document.body.appendChild(pop); pop.addEventListener('mousedown', (e) => { e.preventDefault(); const d = e.target.closest('[data-ci]'); if (d) pick(+d.dataset.ci); }); }
    flat = []; let h = '';
    for (const g of groups) { h += `<div class="combo-h">${esc(g.title)}</div>`; for (const it of g.items) { h += `<div class="combo-i" data-ci="${flat.length}"><span>${esc(it.n)}</span></div>`; flat.push(it); } }
    pop.innerHTML = h; act = -1;
    const r = inp.getBoundingClientRect(); pop.style.left = r.left + 'px'; pop.style.minWidth = Math.max(r.width + 24, 320) + 'px';
    const below = innerHeight - r.bottom > 260 || r.top < 260; pop.style.top = below ? r.bottom + 2 + 'px' : ''; pop.style.bottom = below ? '' : (innerHeight - r.top + 2) + 'px';
  };
  const mark = () => { if (!pop) return; pop.querySelectorAll('.combo-i').forEach((d) => d.classList.toggle('on', +d.dataset.ci === act)); const el = pop.querySelector('.combo-i.on'); if (el) el.scrollIntoView({ block: 'nearest' }); };
  const pick = (k) => { const it = flat[k]; if (!it) return; inp.value = it.n; close(); onPick && onPick(it); inp.dispatchEvent(new Event('change', { bubbles: true })); inp.focus(); };
  btn.addEventListener('mousedown', (e) => { e.preventDefault(); if (pop) close(); else { inp.focus(); open(''); } });
  inp.addEventListener('input', () => open(inp.value));
  inp.addEventListener('blur', () => setTimeout(close, 120));
  inp.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); open(''); return; }
    if (!pop) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopImmediatePropagation(); act = Math.max(0, Math.min(flat.length - 1, act + (e.key === 'ArrowDown' ? 1 : -1))); mark(); }
    else if (e.key === 'Enter' && act >= 0) { e.preventDefault(); e.stopImmediatePropagation(); pick(act); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
  }, true);
  return { close, remove: () => { close(); btn.remove(); } };
}
function startEdit(r, c, initial) {
  if (!EDITABLE.has(c) || editing) return;
  const isTask = r < vis.length, i = isTask ? vis[r] : -1;
  if (isTask && CAL.summ[i] && ['dur', 'pct', 'finish'].includes(c)) { toast('Dauer, Ende und % Abgeschlossen von Leistungsgruppen werden aus den Teilleistungen berechnet.'); return; }
  const row = gridBody.querySelector(`.row[data-r="${r}"]`); if (!row) return;
  const cell = row.querySelector(`.c-${c}`);
  const inp = document.createElement('input');
  inp.className = 'cell-ed'; inp.spellcheck = false;
  if (c === 'gw') { updateGwList(); inp.setAttribute('list', 'gwList'); }
  if (c === 'res' && typeof updateResList === 'function') { updateResList(isTask ? i : -1); inp.setAttribute('list', 'resList'); }
  const orig = isTask ? rawVal(i, c) : '';
  inp.value = initial != null ? initial : orig;
  inp.style.left = cell.offsetLeft + 'px'; inp.style.top = row.offsetTop + 'px';
  inp.style.width = Math.max(cell.offsetWidth, c === 'name' ? 160 : 90) + 'px';
  gridBody.appendChild(inp);
  let combo = null;
  if (c === 'name') { combo = attachCombo(inp, () => nameGroups(orig), null); /* nur die Bezeichnung – das Gewerk trägst du selbst ein */ const b = inp.nextElementSibling; b.classList.add('cell-dd'); b.style.left = (cell.offsetLeft + Math.max(cell.offsetWidth, 160) - 18) + 'px'; b.style.top = row.offsetTop + 'px'; }
  inp.focus();
  if (initial == null) inp.select(); else inp.setSelectionRange(inp.value.length, inp.value.length);
  editing = { r, c, inp, orig };
  let typed = initial != null; inp.addEventListener('input', () => { typed = true; });
  const finish = (commit, move) => {
    if (!editing || editing.inp !== inp) return;
    const v = inp.value; editing = null; inp.remove(); if (combo) combo.remove();
    if (commit && c === 'name' && v !== orig) nameHistAdd(v);
    const multi = MULTI_FIELDS.has(c) && sel.size > 1 && r < vis.length && sel.has(P.tasks[vis[r]].uid);
    if (commit && (v !== orig || (multi && typed))) commitEdit(r, c, v);
    if (multi) { updateSel(); gridBody.focus({ preventScroll: true }); return; }
    if (move === 'down') cur.r = Math.min(cur.r + 1, nRows() - 1);
    else if (move === 'up') cur.r = Math.max(cur.r - 1, 0);
    else if (move === 'right' || move === 'left') {
      const order = COLK.filter((k) => EDITABLE.has(k));
      let ix = order.indexOf(cur.c) + (move === 'right' ? 1 : -1);
      ix = Math.max(0, Math.min(order.length - 1, ix)); cur.c = order[ix];
    }
    if (cur.r < vis.length) { sel = new Set([P.tasks[vis[cur.r]].uid]); anchorR = cur.r; } else sel.clear();
    updateSel(); ensureVisible(cur.r); gridBody.focus({ preventScroll: true });
  };
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); finish(true, 'down'); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    else if (e.key === 'Tab') { e.preventDefault(); finish(true, e.shiftKey ? 'left' : 'right'); }
    else if (e.key === 'ArrowDown' && c !== 'name') { e.preventDefault(); finish(true, 'down'); }
    else if (e.key === 'ArrowUp' && c !== 'name') { e.preventDefault(); finish(true, 'up'); }
  });
  inp.addEventListener('blur', () => finish(true));
}
function applyField(i, c, v) {
  const t = P.tasks[i]; v = v.trim();
  switch (c) {
    case 'name': t.name = v; break;
    case 'dur': { const d = parseDur(v); if (d == null) throw new UErr('Ungültige Dauer. Beispiele: 5  ·  5t  ·  2w (= 10 Tage)  ·  0 (Meilenstein)'); t.dur = d; break; }
    case 'start': {
      if (!v) { t.cons = null; break; }
      const d = parseDate(v); if (d == null) throw new UErr('Ungültiges Datum. Format: TT.MM.JJ, z. B. 02.11.26');
      t.cons = snapWork(d); break;
    }
    case 'finish': {
      const d = parseDate(v); if (d == null) throw new UErr('Ungültiges Datum. Format: TT.MM.JJ, z. B. 02.11.26');
      if (t.dur === 0) { t.cons = snapWork(d); break; }
      const nd = toW(d + 1) - CAL.es[i];
      if (nd < 1) throw new UErr('Das Ende darf nicht vor dem Anfang liegen.');
      t.dur = nd; break;
    }
    case 'pred': { const old = new Map(t.preds.map((p) => [p.uid, p])); t.preds = parsePreds(v, i).map((p) => { const o = old.get(p.uid); if (o && o.ps != null) p.ps = o.ps; if (o && o.ss != null) p.ss = o.ss; return p; }); break; }
    case 'res': t.res = v; break;
    case 'gw': {   // bei Leistungsgruppen für alle Teilleistungen
      t.gw = v; if (CAL.summ[i]) for (let k = i + 1; k <= blockEnd(i); k++) P.tasks[k].gw = v;
      if (v) gwColor(v); break;
    }
    case 'pct': { const p = parseFloat(v.replace('%', '').replace(',', '.')); if (isNaN(p)) throw new UErr('Bitte eine Zahl von 0 bis 100 eingeben.'); t.pct = Math.max(0, Math.min(100, Math.round(p))); break; }
  }
}
function commitEdit(r, c, v) {
  if (r >= vis.length) {
    if (!v.trim()) return false;
    return act(() => {
      const last = vis.length ? P.tasks[vis[vis.length - 1]] : null;
      const t = newTask(c === 'name' ? v.trim() : 'Neue Leistung');
      t.lvl = last ? last.lvl : 0;
      P.tasks.push(t);
      if (autoLink) autoLinkInserted(P.tasks.length - 1);
      CAL = schedule(); computeVis();
      if (c !== 'name') applyField(P.tasks.length - 1, c, v);
      sel = new Set([t.uid]);
      cur.r = vis.length - 1;
    }) && (flashLinkMsg(), true);
  }
  const i0 = vis[r];
  if (MULTI_FIELDS.has(c) && sel.size > 1 && sel.has(P.tasks[i0].uid)) {
    const ix = selIdx().filter((i) => !(CAL.summ[i] && LEAF_ONLY.has(c)));
    const ok = act(() => { ix.forEach((i) => applyField(i, c, v)); });
    if (ok) toast(`Für ${ix.length} markierte Leistungen übernommen.`);
    return ok;
  }
  return act(() => applyField(i0, c, v));
}

/* =====================================================================
   Befehle
   ===================================================================== */
function insertTask(kind = 'task') {
  let at, lvl;
  if (cur.r < vis.length) { at = vis[cur.r]; lvl = P.tasks[at].lvl; }
  else { at = P.tasks.length; const last = vis.length ? P.tasks[vis[vis.length - 1]] : null; lvl = last ? last.lvl : 0; }
  let uid;
  act(() => {
    const t = newTask(kind === 'ms' ? 'Meilenstein' : 'Neue Leistung', kind === 'ms' ? 0 : 1);
    t.lvl = lvl; P.tasks.splice(at, 0, t); uid = t.uid; sel = new Set([uid]);
    if (autoLink) autoLinkInserted(at);
  });
  flashLinkMsg();
  const i = idxOfUid(uid); cur.r = rowOfIdx(i); cur.c = 'name'; anchorR = cur.r;
  updateSel(); ensureVisible(cur.r); startEdit(cur.r, 'name');
}
function insertSummary() {
  const ix = selIdx(); if (!ix.length) return;
  const a = ix[0], b = Math.max(...ix.map(blockEnd));
  const lvl = Math.min(...P.tasks.slice(a, b + 1).map((t) => t.lvl));
  let uid;
  act(() => {
    for (let k = a; k <= b; k++) P.tasks[k].lvl++;
    const t = newTask('Neue Leistungsgruppe', 1); t.lvl = lvl;
    P.tasks.splice(a, 0, t); uid = t.uid; sel = new Set([uid]);
  });
  cur.r = rowOfIdx(idxOfUid(uid)); cur.c = 'name'; anchorR = cur.r; updateSel(); startEdit(cur.r, 'name');
}
/* ---------- Automatisch verknüpfen ---------- */
let autoLink = null;
const isSum = (k) => k + 1 < P.tasks.length && P.tasks[k + 1].lvl > P.tasks[k].lvl;
let linkMsg = '';
// Beim Löschen: Nachfolger der gelöschten Leistungen an deren Vorgänger hängen (Kette überbrücken)
function bridgeDeleted(D) {
  const T = P.tasks, delU = new Set([...D].map((i) => T[i].uid));
  const byU = new Map(T.map((t, k) => [t.uid, k]));
  const ownPreds = (k) => { let r = [...T[k].preds]; if (isSum(k)) for (let j = k + 1; j <= blockEnd(k); j++) r = r.concat(T[j].preds); return r; };
  const ext = (uid, seen = new Set()) => {
    if (seen.has(uid)) return []; seen.add(uid);
    const k = byU.get(uid); if (k == null) return [];
    const out = [];
    for (const p of ownPreds(k)) {
      if (delU.has(p.uid)) { for (const e of ext(p.uid, seen)) out.push({ uid: e.uid, fs: e.fs && p.type === 'FS', lag: e.lag + p.lag }); }
      else out.push({ uid: p.uid, fs: p.type === 'FS', lag: p.lag });
    }
    return out;
  };
  const reaches = (startK, targetUid) => {          // ist target schon (indirekt) Vorgänger von start?
    const stack = [...T[startK].preds.map((p) => p.uid)], seen = new Set();
    while (stack.length) {
      const u = stack.pop(); if (u === targetUid) return true; if (seen.has(u) || delU.has(u)) continue; seen.add(u);
      const k = byU.get(u); if (k != null) stack.push(...T[k].preds.map((p) => p.uid));
    }
    return false;
  };
  let n = 0;
  T.forEach((s, k) => {
    if (D.has(k) || !s.preds.some((p) => delU.has(p.uid))) return;
    const add = [];
    for (const p of s.preds) if (delU.has(p.uid)) for (const e of ext(p.uid)) add.push(e.fs && p.type === 'FS' ? { uid: e.uid, type: 'FS', lag: e.lag + p.lag } : { uid: e.uid, type: p.type, lag: p.lag });
    s.preds = s.preds.filter((p) => !delU.has(p.uid));
    for (const a of add) {
      const ak = byU.get(a.uid);
      if (s.preds.some((x) => x.uid === a.uid) || isAncestor(ak, k) || isAncestor(k, ak) || reaches(k, a.uid)) continue;
      s.preds.push(a); n++;
    }
  });
  if (n) linkMsg = `${n} ${n === 1 ? 'Verknüpfung' : 'Verknüpfungen'} überbrückt`;
}
// Beim Einfügen: neuen Vorgang sinnvoll in die Kette setzen
function autoLinkInserted(n) {
  const T = P.tasks, N = T[n]; if (isSum(n)) return;
  let a = -1, b = -1;
  for (let k = n - 1; k >= 0; k--) { if (T[k].lvl < N.lvl) break; if (T[k].lvl === N.lvl) { a = k; break; } }
  if (n + 1 < T.length && T[n + 1].lvl === N.lvl) b = n + 1;
  const A = a >= 0 ? T[a] : null, B = b >= 0 ? T[b] : null, nm = (t) => `„${t.name}“`;
  const ab = A && B ? B.preds.findIndex((p) => p.uid === A.uid) : -1;
  if (ab >= 0) {                                     // A → B wird zu A → Neu → B
    const old = B.preds[ab];
    N.preds = [{ uid: A.uid, type: old.type, lag: 0 }];
    B.preds[ab] = { uid: N.uid, type: 'FS', lag: old.lag };
    linkMsg = `In Kette eingefügt: ${nm(A)} → neu → ${nm(B)}`;
  } else if (A) {                                    // hinter den Vorgang darüber
    N.preds = [{ uid: A.uid, type: 'FS', lag: 0 }];
    linkMsg = `Verknüpft: ${nm(A)} → neu`;
  } else if (B && !isSum(b) && B.preds.length) {     // erster Vorgang einer Gruppe: übernimmt die Vorgänger
    N.preds = B.preds.map((p) => ({ ...p }));
    B.preds = [{ uid: N.uid, type: 'FS', lag: 0 }];
    linkMsg = `Vor ${nm(B)} in die Kette eingefügt`;
  }
}
function flashLinkMsg() { if (linkMsg) { toast(linkMsg + '  (Strg+Z macht es rückgängig)'); linkMsg = ''; } }

// Hauptleistung für eine zu löschende Leistung: Katalog-Zuordnung, sonst gleiches Gewerk in derselben Gruppe, sonst Vorgänger in der Gruppe
function mergeTargetFor(k, del) {
  const T = P.tasks, t = T[k], isLeaf = (j) => !(j + 1 < T.length && T[j + 1].lvl > T[j].lvl) && T[j].dur > 0 && !del.has(j);
  const base = String(t.cat || '').split('~')[0], it = base && window.CATALOG ? CATALOG.items.find((x) => x.id === base) : null;
  if (it && it.m) { const j = T.findIndex((x, q) => x.cat === it.m && (x.blk ?? -1) === (t.blk ?? -1) && isLeaf(q)); if (j >= 0) return j; }
  let p = k - 1; while (p >= 0 && T[p].lvl >= t.lvl) p--;   // Elterngruppe
  const from = p + 1, to = p >= 0 ? blockEnd(p) : T.length - 1;
  if (t.gw) { let best = -1; for (let j = from; j <= to; j++) if (j !== k && isLeaf(j) && T[j].gw === t.gw && T[j].lvl === t.lvl && (best < 0 || Math.abs(j - k) < Math.abs(best - k))) best = j; if (best >= 0) return best; }
  for (const pr of t.preds || []) { const j = idxOfUid(pr.uid); if (j >= from && j <= to && isLeaf(j)) return j; }
  return -1;
}
function deleteSel(mode) {
  const ix = selIdx(); if (!ix.length) return;
  const del = new Set(); ix.forEach((i) => { for (let k = i; k <= blockEnd(i); k++) del.add(k); });
  const firstRow = rowOfIdx(ix[0]);
  // Rückfrage: Gesamtzeit verkürzen oder Dauer auf Hauptleistungen umlegen
  const cand = [...del].filter((k) => !(k + 1 < P.tasks.length && P.tasks[k + 1].lvl > P.tasks[k].lvl) && P.tasks[k].dur > 0).map((k) => ({ k, to: mergeTargetFor(k, del) })).filter((x) => x.to >= 0);
  if (!mode && cand.length && LS.get('delAsk', true)) {
    const leafOpts = (sel0) => '<option value="">– entfällt –</option>' + P.tasks.map((x, j) => (del.has(j) || (j + 1 < P.tasks.length && P.tasks[j + 1].lvl > x.lvl) || !(x.dur > 0)) ? '' : `<option value="${x.uid}"${j === sel0 ? ' selected' : ''}>${j + 1} – ${esc(x.name)}</option>`).join('');
    const tot = cand.reduce((a, c) => a + P.tasks[c.k].dur, 0);
    const bg = modal('Leistungen löschen', `<div style="margin-bottom:8px">${del.size === 1 ? 'Die Leistung wird' : del.size + ' Leistungen werden'} gelöscht – zusammen <b>${fmtDur(tot)}</b> Arbeit. Soll sich die Gesamtzeit verkürzen oder wird die Dauer auf die Hauptleistung umgelegt?</div>
      <table class="ptab"><thead><tr><th>Gelöschte Leistung</th><th style="width:80px">Dauer</th><th>Dauer umlegen auf</th></tr></thead><tbody>${cand.map((c) => `<tr><td>${esc(P.tasks[c.k].name)}</td><td>${fmtDur(P.tasks[c.k].dur)}</td><td><select data-mk="${P.tasks[c.k].uid}">${leafOpts(c.to)}</select></td></tr>`).join('')}</tbody></table>
      <label class="cb" style="margin-top:8px"><input type="checkbox" id="delAskOff"> nicht mehr fragen (immer verkürzen) – wieder einschalten im Reiter „Leistung“ → „Beim Löschen fragen“</label>`,
      [{ label: 'Gesamtzeit verkürzen', fn: (b2) => { if (b2.querySelector('#delAskOff').checked) LS.set('delAsk', false); setTimeout(() => deleteSel('cut'), 0); } },
        { label: 'Dauer umlegen', cls: 'primary', primary: true, fn: (b2) => { const m = {}; b2.querySelectorAll('[data-mk]').forEach((s2) => { if (s2.value) m[s2.dataset.mk] = +s2.value; }); setTimeout(() => deleteSel(m), 0); } },
        { label: 'Abbrechen', left: true }]);
    bg.querySelector('.modal').style.width = 'min(700px,94vw)';
    return;
  }
  const merge = mode && typeof mode === 'object' ? mode : null;
  linkMsg = '';
  act(() => {
    if (merge) for (const [from, to] of Object.entries(merge)) {
      const f = P.tasks.find((x) => x.uid === +from), tt = P.tasks.find((x) => x.uid === to); if (!f || !tt) continue;
      if (segList(tt)) tt.segs[tt.segs.length - 1].d += f.dur; tt.dur += f.dur;
    }
    if (autoLink) bridgeDeleted(del); P.tasks = P.tasks.filter((t, k) => !del.has(k)); sel.clear();
  });
  flashLinkMsg();
  cur.r = Math.max(0, Math.min(firstRow, vis.length)); if (cur.r < vis.length) { sel = new Set([P.tasks[vis[cur.r]].uid]); }
  updateSel();
}
function indent(dir) {
  const ix = selIdx(); if (!ix.length) return;
  act(() => {
    const T = P.tasks, uids = ix.map((i) => T[i].uid);
    const selSet = new Set(ix);
    for (const uid of uids) {
      const i = idxOfUid(uid);
      // nur oberste markierte Ebene bewegen (Kinder wandern mit)
      let skip = false; for (let a = i - 1; a >= 0; a--) if (T[a].lvl < T[i].lvl && selSet.has(a) && isAncestor(a, i)) { skip = true; break; }
      if (skip) continue;
      const e = blockEnd(i);
      if (dir > 0) { if (i === 0 || T[i].lvl > T[i - 1].lvl) continue; for (let k = i; k <= e; k++) T[k].lvl++; }
      else { if (T[i].lvl === 0) continue; for (let k = i; k <= e; k++) T[k].lvl--; }
    }
  });
}
function moveSel(dir) {
  const ix = selIdx(); if (!ix.length) return;
  const i = ix[0], T = P.tasks, lvl = T[i].lvl, e = blockEnd(i), uid = T[i].uid;
  sel = new Set([uid]);
  const n0 = undoS.length;
  act(() => {
    if (dir < 0) {
      let j = -1; for (let k = i - 1; k >= 0; k--) { if (T[k].lvl < lvl) break; if (T[k].lvl === lvl) { j = k; break; } }
      if (j < 0) return;
      const block = T.splice(i, e - i + 1); T.splice(j, 0, ...block);
    } else {
      const n = e + 1; if (n >= T.length || T[n].lvl !== lvl) return;
      const e2 = blockEnd(n); const block = T.splice(i, e - i + 1); T.splice(e2 - (e - i), 0, ...block);
    }
  });
  const ni = idxOfUid(uid);
  if (ni >= 0) { cur.r = rowOfIdx(ni); anchorR = cur.r; } updateSel();
  if (undoS.length > n0) afterMove(uid);
}
/* ---------- Nach dem Verschieben: Vorgänger neu wählen ---------- */
let relink = null, lastRelink = null;   // { uid, orig, above, below, choice, succ }
function closeRelink() { const el = document.getElementById('relinkPop'); if (el) el.remove(); if (relink) lastRelink = { uid: relink.uid, orig: relink.orig, at: Date.now() }; relink = null; }
function afterMove(uid) {
  const i = idxOfUid(uid); if (i < 0 || isSum(i) || P.tasks[i].dur == null) { closeRelink(); return; }
  const t = P.tasks[i], r = rowOfIdx(i);
  const orig = relink && relink.uid === uid ? relink.orig : lastRelink && lastRelink.uid === uid && Date.now() - lastRelink.at < 60000 ? lastRelink.orig : t.preds.map((p) => ({ ...p }));
  if (relink && relink.uid !== uid) closeRelink();
  const near = (dir) => { const out = []; for (let k = r + dir; k >= 0 && k < vis.length && out.length < 4; k += dir) { const j = vis[k]; if (!CAL.summ[j] && j !== i) out.push(P.tasks[j].uid); } return out; };
  const above = near(-1), below = near(1);
  relink = { uid, orig, above, below, choice: autoLink && above.length ? above[0] : 'orig', succ: false, base: new Map(P.tasks.map((x) => [x.uid, x.preds.map((p) => ({ ...p }))])) };
  applyRelink(true);
  showRelink();
}
function applyRelink(merge) {
  const R = relink; if (!R) return false;
  const i = idxOfUid(R.uid); if (i < 0) return false;
  const n0 = undoS.length;
  const ok = act(() => {
    // Ausgangslage direkt nach dem Verschieben wiederherstellen, dann Auswahl anwenden
    for (const t of P.tasks) if (R.base.has(t.uid)) t.preds = R.base.get(t.uid).map((p) => ({ ...p }));
    const t = P.tasks[idxOfUid(R.uid)], byU = new Map(P.tasks.map((x) => [x.uid, x]));
    const dependsOn = (x, m, seen = new Set()) => { if (x === m) return true; if (seen.has(x)) return false; seen.add(x); const o = byU.get(x); return !!o && o.preds.some((p) => dependsOn(p.uid, m, seen)); };
    let newPreds;
    if (R.choice === 'orig') newPreds = R.orig.map((p) => ({ ...p }));
    else if (R.choice === 'none') newPreds = [];
    else newPreds = [{ uid: R.choice, type: 'FS', lag: 0 }];
    // Steht die Leistung jetzt hinter einem ihrer Nachfolger: diese Abhängigkeit überbrücken (sonst Zirkelbezug)
    R.bridged = [];
    for (const np of newPreds) {
      if (!dependsOn(np.uid, t.uid)) continue;
      for (const o of P.tasks) {
        if (o === t || !o.preds.some((p) => p.uid === t.uid)) continue;
        if (o.uid === np.uid || dependsOn(np.uid, o.uid)) {
          o.preds = o.preds.filter((p) => p.uid !== t.uid);
          for (const op of R.orig) if (op.uid !== o.uid && !o.preds.some((p) => p.uid === op.uid) && !dependsOn(op.uid, o.uid)) o.preds.push({ ...op });
          R.bridged.push(o.name);
        }
      }
    }
    t.preds = newPreds;
    // Leistung darunter auf diese warten lassen (in die Kette einfügen)
    const B = R.below.length ? byU.get(R.below[0]) : null;
    if (R.succ && B) {
      if (typeof R.choice === 'number') B.preds = B.preds.filter((p) => p.uid !== R.choice);
      if (!B.preds.some((p) => p.uid === t.uid)) B.preds.push({ uid: t.uid, type: 'FS', lag: 0 });
    }
  });
  if (merge && ok && undoS.length === n0 + 1) undoS.pop();   // ein Rückgängig-Schritt für Verschieben + Verknüpfen
  return ok;
}
function showRelink() {
  const R = relink; document.getElementById('relinkPop')?.remove();
  if (!R) return;
  const i = idxOfUid(R.uid), r = rowOfIdx(i); if (r < 0) return;
  const row = gridBody.querySelector(`.row[data-r="${r}"]`); if (!row) return;
  const nm = (u) => { const k = idxOfUid(u); return k < 0 ? '?' : `${k + 1} – ${esc(P.tasks[k].name)}`; };
  const origTxt = R.orig.length ? R.orig.map((p) => { const k = idxOfUid(p.uid); return k < 0 ? '' : P.tasks[k].name; }).filter(Boolean).join(', ') : 'keine';
  const opt = (v, l) => `<option value="${v}"${String(R.choice) === String(v) ? ' selected' : ''}>${l}</option>`;
  const B = R.below.length ? P.tasks[idxOfUid(R.below[0])] : null;
  const el = document.createElement('div'); el.id = 'relinkPop'; el.className = 'relink';
  el.innerHTML = `<div class="rl-h">Vorgänger von „${esc(P.tasks[i].name)}“<button class="rl-x" title="Schließen (Esc)">×</button></div>
    <select class="rl-sel">
      ${R.above.length ? `<optgroup label="Darüber">${R.above.map((u, k) => opt(u, nm(u) + (k === 0 ? '  (direkt darüber)' : ''))).join('')}</optgroup>` : ''}
      ${R.below.length ? `<optgroup label="Darunter">${R.below.map((u) => opt(u, nm(u))).join('')}</optgroup>` : ''}
      <optgroup label="Sonst">${opt('orig', 'bisherige behalten: ' + esc(origTxt))}${opt('none', 'kein Vorgänger – frei planen')}</optgroup>
    </select>
    ${B ? `<label class="cb rl-cb"><input type="checkbox"${R.succ ? ' checked' : ''}> „${esc(B.name)}“ (darunter) wartet auf diese Leistung</label>` : ''}
    ${R.bridged && R.bridged.length ? `<div class="rl-note">Damit kein Zirkelbezug entsteht, wartet „${esc(R.bridged.join('“, „'))}“ nicht mehr auf diese Leistung, sondern auf deren bisherige Vorgänger.</div>` : ''}
    <div class="rl-f"><span>Strg+Z nimmt Verschieben und Verknüpfen zurück</span><button class="btn sm primary rl-ok">OK</button></div>`;
  document.body.appendChild(el);
  const rb = row.getBoundingClientRect(), gx = gridPane.getBoundingClientRect();
  const left = Math.min(gx.left + colW.nr + colW.ind + 30, innerWidth - el.offsetWidth - 8);
  let top = rb.bottom + 4; if (top + el.offsetHeight > innerHeight - 30) top = rb.top - el.offsetHeight - 4;
  el.style.left = Math.max(4, left) + 'px'; el.style.top = Math.max(4, top) + 'px';
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  el.querySelector('.rl-sel').addEventListener('change', (e) => {
    const v = e.target.value, prev = R.choice;
    R.choice = v === 'orig' || v === 'none' ? v : +v;
    if (!applyRelink(false)) { R.choice = prev; }
    showRelink();
  });
  const cb = el.querySelector('.rl-cb input');
  if (cb) cb.addEventListener('change', () => { R.succ = cb.checked; if (!applyRelink(false)) R.succ = !cb.checked; showRelink(); });
  el.querySelector('.rl-ok').onclick = closeRelink; el.querySelector('.rl-x').onclick = closeRelink;
}
document.addEventListener('mousedown', (e) => { if (relink && !e.target.closest('#relinkPop')) closeRelink(); });
gridPane.addEventListener('scroll', () => { if (relink) closeRelink(); });

/* Überflüssige Verknüpfungen: A → C entfällt, wenn C über einen anderen Weg (nur Ende-Anfang, Abstand ≥ 0) ohnehin auf A wartet.
   Die berechneten Termine ändern sich dadurch nicht. */
function tidyLinks() {
  const T = P.tasks, byU = new Map(T.map((t, i) => [t.uid, i])), leaf = (i) => !isSum(i);
  const plain = (p) => (p.type || 'FS') === 'FS' && (p.lag || 0) >= 0 && p.ps == null && p.ss == null;
  const reach = (from, target, skipEdge, seen = new Set()) => {   // wartet „from“ (rückwärts über Vorgänger) auf „target“?
    const t = T[byU.get(from)]; if (!t) return false;
    for (const p of t.preds) {
      if (skipEdge && from === skipEdge[1] && p.uid === skipEdge[0]) continue;
      if (!plain(p)) continue;
      const pi = byU.get(p.uid); if (pi == null || !leaf(pi)) continue;
      if (p.uid === target) return true;
      if (seen.has(p.uid)) continue; seen.add(p.uid);
      if (reach(p.uid, target, null, seen)) return true;
    }
    return false;
  };
  let n = 0;
  const ok = act(() => {
    for (let i = 0; i < T.length; i++) {
      if (!leaf(i)) continue;
      const t = T[i];
      for (const p of [...t.preds]) {
        const pi = byU.get(p.uid);
        if (pi == null || !leaf(pi) || !plain(p) || p.lag) continue;
        if (reach(t.uid, p.uid, [p.uid, t.uid])) { t.preds = t.preds.filter((x) => x !== p); n++; }
      }
    }
  });
  if (ok) toast(n ? `${n} überflüssige Verknüpfungen entfernt – die Termine bleiben gleich (Strg+Z macht es rückgängig).` : 'Keine überflüssigen Verknüpfungen gefunden.');
}
function linkSel() {
  const ix = selIdx(); if (ix.length < 2) { toast('Markiere mindestens zwei Leistungen (Strg- oder Umschalt-Klick).'); return; }
  act(() => {
    for (let k = 1; k < ix.length; k++) {
      const p = P.tasks[ix[k - 1]], s = P.tasks[ix[k]];
      if (isAncestor(ix[k - 1], ix[k]) || isAncestor(ix[k], ix[k - 1])) continue;
      if (!s.preds.some((x) => x.uid === p.uid)) s.preds.push({ uid: p.uid, type: 'FS', lag: 0 });
    }
  });
}
function unlinkSel() {
  const ix = selIdx(); if (!ix.length) return;
  const uids = new Set(ix.map((i) => P.tasks[i].uid));
  act(() => {
    if (uids.size === 1) { const u = [...uids][0]; for (const t of P.tasks) { if (t.uid === u) t.preds = []; else t.preds = t.preds.filter((p) => p.uid !== u); } }
    else for (const t of P.tasks) if (uids.has(t.uid)) t.preds = t.preds.filter((p) => !uids.has(p.uid));
  });
}
function setPct(v) { const ix = selIdx().filter((i) => !CAL.summ[i]); const all = new Set(); selIdx().forEach((i) => { for (let k = i; k <= blockEnd(i); k++) if (!CAL.summ[k]) all.add(k); }); if (!all.size) return; act(() => { all.forEach((i) => { P.tasks[i].pct = v; }); }); void ix; }
function setZoom(z, centerDay) {
  z = Math.max(0, Math.min(ZOOMS.length - 1, z)); if (z === zoom && centerDay == null) return;
  const oldPpd = ZOOMS[zoom].ppd;
  const c = centerDay != null ? centerDay : view.start + (chartPane.scrollLeft + chartPane.clientWidth / 2) / oldPpd;
  zoom = z; LS.set('zoom', z); render();
  chartPane.scrollLeft = X(c) - chartPane.clientWidth / 2;
}
function scrollToDay(d, frac = 0.15) { chartPane.scrollLeft = Math.max(0, X(d) - chartPane.clientWidth * frac); }
function scrollToTask() { const ix = selIdx(); if (ix.length) scrollToDay(CAL.sd[ix[0]], 0.05); }
function fitProject() {
  const T = P.tasks; if (!T.length) return;
  let mn = Infinity, mx = -Infinity; T.forEach((t, i) => { mn = Math.min(mn, CAL.sd[i]); mx = Math.max(mx, CAL.fd[i] + 1); });
  const span = mx - mn, w = chartPane.clientWidth - 80;
  let z = 0; for (let k = ZOOMS.length - 1; k >= 0; k--) if (span * ZOOMS[k].ppd <= w) { z = k; break; }
  zoom = z; LS.set('zoom', z); render(); chartPane.scrollLeft = Math.max(0, X(mn) - 30);
}
function setCollapsedAll(v) { P.tasks.forEach((t, i) => { if (CAL.summ[i]) t.collapsed = v; }); render(); queueSave(); }

/* ---------- Dialoge ---------- */
// Dialog an der Titelleiste verschieben; Position je Dialog merken, Doppelklick = wieder mittig
const dlgPos = {};
function makeDraggable(box, handle, key) {
  if (!box || !handle) return;
  handle.classList.add('drag-h'); handle.title = 'Zum Verschieben ziehen · Doppelklick: wieder mittig';
  const place = (x, y) => {
    const r = box.getBoundingClientRect();
    x = Math.max(-r.width + 120, Math.min(innerWidth - 120, x)); y = Math.max(0, Math.min(innerHeight - 40, y));
    Object.assign(box.style, { position: 'fixed', left: x + 'px', top: y + 'px', margin: '0' }); dlgPos[key] = { x, y };
  };
  if (dlgPos[key]) requestAnimationFrame(() => place(dlgPos[key].x, dlgPos[key].y));
  handle.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('button,input,select')) return;
    e.preventDefault();
    const r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    document.body.classList.add('dragging-dlg');
    const mv = (ev) => place(ev.clientX - dx, ev.clientY - dy);
    const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); document.body.classList.remove('dragging-dlg'); };
    addEventListener('mousemove', mv); addEventListener('mouseup', up);
  });
  handle.addEventListener('dblclick', (e) => { if (e.target.closest('button')) return; delete dlgPos[key]; Object.assign(box.style, { position: '', left: '', top: '', margin: '' }); });
}
function modal(title, body, buttons) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog" aria-label="${esc(title)}"><div class="mh">${esc(title)}<button class="mx" title="Schließen">×</button></div><div class="mb">${body}</div><div class="mf"></div></div>`;
  const close = () => { bg.remove(); gridBody.focus({ preventScroll: true }); };
  const mf = bg.querySelector('.mf');
  const run = (b) => { if (b.fn && b.fn(bg) === false) return; close(); };
  buttons.forEach((b) => {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = b.label; el.className = 'btn ' + (b.cls || '');
    if (b.left) el.style.marginRight = 'auto';
    el.onclick = () => run(b); mf.appendChild(el);
  });
  bg.querySelector('.mx').onclick = close;
  bg.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const p = buttons.find((b) => b.primary); if (p) { e.preventDefault(); run(p); } }
    // ← → (in Eingabefeldern Alt+← →) bzw. Bild↑/Bild↓: vorige / nächste Leistung, wenn der Dialog solche Knöpfe hat
    const feld = e.target.closest && e.target.closest('input,textarea,select');
    const vor = e.key === 'PageUp' || (e.key === 'ArrowLeft' && (!feld || e.altKey)), nach = e.key === 'PageDown' || (e.key === 'ArrowRight' && (!feld || e.altKey));
    if (vor || nach) { const b = buttons.find((x) => (vor ? /^◀/ : /▶$/).test(x.label || '')); if (b) { e.preventDefault(); if (feld) feld.dispatchEvent(new Event('change', { bubbles: true })); run(b); } }
  });
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  document.body.appendChild(bg);
  makeDraggable(bg.querySelector('.modal'), bg.querySelector('.mh'), 'dlgPos:' + title);
  setTimeout(() => { const f = bg.querySelector('input:not([disabled]),select,textarea'); if (f) { f.focus(); if (f.select) f.select(); } }, 0);
  return bg;
}

function taskDialog(i) {
  const t = P.tasks[i], isS = CAL.summ[i];
  let preds = t.preds.map((p) => ({ ...p }));
  const opts = (u) => '<option value="">– auswählen –</option>' + P.tasks.map((x, j) => (j === i || isAncestor(j, i) || isAncestor(i, j)) ? '' : `<option value="${x.uid}"${x.uid === u ? ' selected' : ''}>${j + 1} – ${esc(x.name)}</option>`).join('');
  const predRows = () => preds.map((p, k) => `<tr data-k="${k}"><td><select class="pu">${opts(p.uid)}</select></td>
      <td><select class="pt">${['FS', 'SS', 'FF', 'SF'].map((ty) => `<option value="${ty}"${ty === p.type ? ' selected' : ''}>${TNAME[ty]}</option>`).join('')}</select></td>
      <td><input class="pl" value="${p.lag ? (p.lag > 0 ? '+' : '-') + Math.abs(p.lag) + 't' : '0t'}"></td>
      <td style="width:30px;text-align:center"><button type="button" class="btn sm prm" data-k="${k}" title="Entfernen">✕</button></td></tr>`).join('')
    || '<tr><td colspan="4" style="color:var(--mut);padding:6px">Keine Vorgänger</td></tr>';
  const body = `<div class="form">
      <label>Bezeichnung</label><div class="full combo-wrap"><input id="fName" value="${esc(t.name)}"></div>
      <label>Dauer</label><input id="fDur" value="${fmtDur(CAL.dur[i])}" ${isS ? 'disabled' : ''}>
      <label>% Abgeschlossen</label><input id="fPct" type="number" min="0" max="100" value="${Math.round(CAL.pct[i])}" ${isS ? 'disabled' : ''}>
      <label>Anfang nicht früher als</label><input id="fCons" type="date" value="${t.cons != null ? isoD(t.cons) : ''}">
      <label>Berechnet</label><div class="ro">${fmtD(CAL.sd[i])} – ${fmtD(CAL.fd[i])}</div>
      <label>Gewerk</label><input id="fGw" list="gwList" value="${esc(t.gw || '')}" placeholder="${esc(guessGw(t) ? 'Vorschlag: ' + guessGw(t) : 'z. B. Elektro')}">
      <label>Balkenfarbe</label><div class="ro colrow"><select id="fColM"><option value="">vom Gewerk</option><option value="own"${t.color ? ' selected' : ''}>eigene Farbe</option></select><input type="color" id="fCol" value="${t.color || effColor(t) || '#8db3e2'}"><span id="fGwC"></span></div>
      <label>Unternehmer</label><div class="full combo-wrap"><input id="fRes" value="${esc(t.res || '')}" placeholder="z. B. Firma Müller; Elektro Schmidt"></div>
      ${!isS && window.AiPlace && AiPlace.enabled() ? '<div id="tdSg" style="grid-column:1 / span 4"></div>' : ''}
      <label>Gesamtpuffer</label><div class="ro">${isS ? '–' : fmtDur(CAL.slack[i])}${CAL.crit[i] ? ' · <b style="color:var(--critbd)">kritisch</b>' : ''}</div><span></span><span></span>
    </div>
    ${!isS && t.dur > 1 ? `<div class="sec">Abschnitte (Unterbrechungen)</div><div id="segBox"></div>` : ''}
    <div class="sec">Vorgänger</div>
    <table class="ptab"><thead><tr><th>Leistung</th><th>Art</th><th style="width:80px">Zeitabstand</th><th></th></tr></thead><tbody id="pBody">${predRows()}</tbody></table>
    <button type="button" class="btn sm" id="pAdd" style="margin-top:6px">+ Vorgänger hinzufügen</button>
    <div class="sec">Notizen</div>
    <div class="form"><textarea id="fNotes" class="full" style="grid-column:1 / span 4">${esc(t.notes || '')}</textarea></div>
    <div class="hint">Leeres Feld „Anfang nicht früher als“ = so früh wie möglich planen.</div>`;
  const readPreds = (bg) => {
    preds = [...bg.querySelectorAll('#pBody tr[data-k]')].map((tr) => ({ uid: tr.querySelector('.pu').value === '' ? null : +tr.querySelector('.pu').value, type: tr.querySelector('.pt').value, lagS: tr.querySelector('.pl').value }))
      .map((p) => ({ uid: p.uid, type: p.type, lag: parseLag(p.lagS) ?? 0, bad: parseLag(p.lagS) == null }));
  };
  const apply = (bg) => {
    readPreds(bg);
    if (preds.some((p) => p.bad)) { toast('Ungültiger Zeitabstand. Beispiele: +2t, -1t, 1w', true); return false; }
    const v = (id) => bg.querySelector(id).value;
    return act(() => {
      t.name = v('#fName').trim(); nameHistAdd(t.name);
      if (!isS) {
        const d = parseDur(v('#fDur')); if (d == null) throw new UErr('Ungültige Dauer.'); t.dur = d;
        t.pct = Math.max(0, Math.min(100, Math.round(+v('#fPct') || 0)));
      }
      const cs = v('#fCons'); t.cons = cs ? snapWork(parseDate(cs)) : null;
      t.res = v('#fRes').trim(); t.notes = v('#fNotes');
      const gw = v('#fGw').trim(); if (gw !== (t.gw || '')) applyField(i, 'gw', gw);
      t.color = v('#fColM') === 'own' ? v('#fCol') : '';
      const seen = new Set(), old = new Map(t.preds.map((p) => [p.uid, p]));
      t.preds = preds.filter((p) => p.uid != null && !seen.has(p.uid) && seen.add(p.uid)).map(({ uid, type, lag }) => { const l = { uid, type, lag }, o = old.get(uid); if (o && o.ps != null) l.ps = o.ps; if (o && o.ss != null) l.ss = o.ss; return l; });
      for (const su of sucUids) { const x = P.tasks.find((y) => y.uid === su); if (x && !x.preds.some((p) => p.uid === t.uid)) x.preds.push({ uid: t.uid, type: 'FS', lag: 0 }); }
      if (segBox && segsEd) { if (segsEd.length > 1) { t.segs = segsEd.map((x) => ({ ...x })); t.dur = segsEd.reduce((a, x) => a + x.d, 0); } else if (segList(t)) { t.dur = segsEd[0].d; t.segs = null; } }
    }) ? undefined : false;
  };
  updateGwList();
  // Vor/Zurück: Änderungen übernehmen und zur benachbarten Leistung springen
  const nav = (dir) => (bgx) => {
    const r = rowOfIdx(i), nr = r + dir; if (nr < 0 || nr >= vis.length) { toast(dir < 0 ? 'Das ist die erste Leistung.' : 'Das ist die letzte Leistung.'); return false; }
    if (apply(bgx) === false) return false;
    const ni = vis[nr]; sel = new Set([P.tasks[ni].uid]); cur.r = nr; updateSel(); ensureVisible(nr);
    setTimeout(() => taskDialog(ni), 0);
  };
  const bg = modal('Leistungsinformationen', body, [
    { label: '◀ Vorherige', cls: 'sm td-nav', fn: nav(-1) }, { label: 'Nächste ▶', cls: 'sm td-nav', fn: nav(1) },
    { label: '↶ Rückgängig', cls: 'sm td-undo', left: true, fn: () => { undoLocal(); return false; } },
    { label: 'OK', cls: 'primary', primary: true, fn: apply }, { label: 'Abbrechen' }]);
  // Navigation und Rückgängig in die Titelleiste – dort springen sie nicht mit der Fensterhöhe
  { const mh = bg.querySelector('.mh'), mx = mh.querySelector('.mx'), grp = document.createElement('span'); grp.className = 'mh-tools';
    bg.querySelectorAll('.mf .td-nav, .mf .td-undo').forEach((b) => { b.style.marginRight = ''; grp.appendChild(b); });
    mh.insertBefore(grp, mx);
    grp.addEventListener('mousedown', (e) => e.stopPropagation()); }   // kein Verschieben beim Klick auf die Knöpfe
  bg.querySelectorAll('.td-nav')[0].title = 'Änderungen übernehmen und zur vorherigen Leistung (Alt+↑)';
  bg.querySelectorAll('.td-nav')[1].title = 'Änderungen übernehmen und zur nächsten Leistung (Alt+↓)';
  bg.querySelector('.td-undo').title = 'Letzte Änderung in diesem Fenster zurücknehmen (Strg+Z)';
  bg.querySelector('.modal').style.width = '640px';
  const showC = () => {
    const own = bg.querySelector('#fColM').value === 'own', g = bg.querySelector('#fGw').value.trim();
    bg.querySelector('#fCol').style.display = own ? '' : 'none';
    bg.querySelector('#fGwC').innerHTML = own ? '' : g ? `<span class="gwdot" style="background:${P.gwColors?.[g] || GW_DEFAULT[g] || '#ccc'}"></span>${P.gwColors?.[g] ? '' : '(wird vergeben)'}` : '<span style="color:var(--mut)">Standard</span>';
  };
  bg.querySelector('#fGw').addEventListener('input', showC); bg.querySelector('#fColM').addEventListener('change', showC); showC();
  attachCombo(bg.querySelector('#fName'), () => nameGroups(t.name), null);
  attachCombo(bg.querySelector('#fRes'), () => resGroups(bg.querySelector('#fGw').value.trim(), bg.querySelector('#fRes').value), null);   // nur die Bezeichnung – das Gewerk bleibt offen
  // Vorschlag: Gewerk, Dauer, Vorgänger und Nachfolger aus dem Plan – Eigene | Eingebaut | KI
  let sucUids = [];
  const sgBox = bg.querySelector('#tdSg');
  if (sgBox) {
    const st = SugBar.state(null), uidOf = (id) => +String(id).slice(1);
    const nm = (u) => { const x = P.tasks.find((y) => y.uid === u); return x ? esc(x.name) : '?'; };
    const draw = () => {
      const r = st.cur !== 'own' && st.res[st.cur];
      sgBox.innerHTML = SugBar.html(st, 'td-sg') + (r && (r.a.length || r.b.length) ? `<div class="td-sgi">${r.a.length ? `<span class="tip-pre">◀ Vorgänger:</span> ${r.a.map((x) => nm(uidOf(x))).join(', ')}` : ''}${r.b.length ? `${r.a.length ? ' · ' : ''}<span class="tip-suc">Nachfolger ▶</span> ${r.b.map((x) => nm(uidOf(x))).join(', ')} <small>(wird bei OK verknüpft)</small>` : ''}</div>` : '');
      bg.querySelector('#pBody').innerHTML = predRows(); showC();
    };
    const o = {
      text: () => bg.querySelector('#fName').value,
      snap: () => { readPreds(bg); return { gw: bg.querySelector('#fGw').value, dur: bg.querySelector('#fDur').value, preds: preds.map((p) => ({ uid: p.uid, type: p.type, lag: p.lag })) }; },
      fetch: (kind, force) => AiPlace.suggestInPlan(i, bg.querySelector('#fName').value, kind, force),
      apply: (r) => {
        const own = st.own || {};
        if (!r) { bg.querySelector('#fGw').value = own.gw || ''; if (own.dur != null) bg.querySelector('#fDur').value = own.dur; preds = (own.preds || []).map((p) => ({ ...p })); sucUids = []; return; }
        if (r.gw) bg.querySelector('#fGw').value = r.gw;
        if (r.d && !segsEd) bg.querySelector('#fDur').value = fmtDur(r.d);
        const add = r.a.map(uidOf).filter((u) => u !== t.uid && !(own.preds || []).some((p) => p.uid === u));
        preds = [...(own.preds || []).map((p) => ({ ...p })), ...add.map((u) => ({ uid: u, type: 'FS', lag: 0 }))];
        sucUids = r.b.map(uidOf).filter((u) => u !== t.uid);
      },
      redraw: () => { draw(); ldRecord(); },
    };
    st.text = (t.name || '').trim();
    draw();
    sgBox.addEventListener('click', (e) => SugBar.click(e, st, o));
  }
  // Lokales Rückgängig: Zustand der Felder und Vorgänger nach jeder Änderung merken
  const ldSnap = () => {
    const vals = {}; bg.querySelectorAll('.mb input[id], .mb select[id], .mb textarea[id]').forEach((el) => { vals[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
    readPreds(bg); return JSON.stringify({ vals, preds: preds.map(({ uid, type, lag }) => ({ uid, type, lag })), suc: sucUids });
  };
  let ldLast = null; const ldStack = [];
  const ldUpd = () => { const b = bg.querySelector('.td-undo'); if (b) b.disabled = !ldStack.length; };
  const ldRecord = () => setTimeout(() => { if (!bg.isConnected) return; const sNow = ldSnap(); if (sNow !== ldLast) { if (ldLast) ldStack.push(ldLast); ldLast = sNow; ldUpd(); } }, 0);
  function undoLocal() {
    if (!ldStack.length) return;
    const st0 = JSON.parse(ldStack.pop()); ldLast = JSON.stringify(st0);
    for (const [id, v] of Object.entries(st0.vals)) { const el = bg.querySelector('#' + id); if (el) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } }
    preds = st0.preds.map((p) => ({ ...p })); sucUids = st0.suc.slice();
    bg.querySelector('#pBody').innerHTML = predRows(); showC(); ldUpd();
  }
  setTimeout(() => { ldLast = ldSnap(); ldUpd(); }, 0);   // Ausgangszustand
  bg.addEventListener('change', ldRecord); bg.addEventListener('click', (e) => { if (!e.target.closest('.mf')) ldRecord(); });
  bg.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target.matches('input,textarea') && e.target.value !== (JSON.parse(ldLast || '{"vals":{}}').vals[e.target.id] ?? e.target.value))) { e.preventDefault(); undoLocal(); }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); const r = nav(e.key === 'ArrowUp' ? -1 : 1)(bg); if (r !== false) bg.remove(); }
  });
  // Abschnitte bearbeiten
  const segBox = bg.querySelector('#segBox');
  let segsEd = null;
  if (segBox) {
    segsEd = segList(t) ? t.segs.map((x) => ({ ...x })) : null;
    const segHtml = () => {
      if (!segsEd) return '<div class="hint" style="margin:0">Nicht unterbrochen. <button type="button" class="btn sm" id="segAdd">Unterbrechung einfügen</button> teilt die Leistung in der Mitte mit 5 Tagen Pause – oder im Diagramm per Rechtsklick auf den Balken bzw. mit „Unterbrechen“.</div>';
      return `<table class="ptab"><thead><tr><th>Abschnitt</th><th style="width:110px">Pause davor</th><th style="width:110px">Dauer</th><th>Termine (berechnet)</th><th></th></tr></thead><tbody>${segsEd.map((x, k) => `<tr>
        <td>Abschnitt ${k + 1}</td><td>${k ? `<input data-sg="gap" data-k="${k}" type="number" min="0" value="${x.gap}">` : '–'}</td>
        <td><input data-sg="d" data-k="${k}" type="number" min="1" value="${x.d}"></td>
        <td style="color:var(--mut)">${CAL.segS[i] && CAL.segS[i][k] != null && segList(t) && t.segs.length === segsEd.length ? fmtD(fromW(CAL.segS[i][k])) + ' – ' + fmtD(fromW(CAL.segE[i][k] - 1)) : ''}</td>
        <td style="width:30px;text-align:center">${k ? `<button type="button" class="btn sm" data-sgdel="${k}" title="Pause entfernen (mit vorherigem Abschnitt zusammenführen)">✕</button>` : ''}</td></tr>`).join('')}</tbody></table>
        <button type="button" class="btn sm" id="segAdd" style="margin-top:6px">+ weitere Unterbrechung</button> <span class="hint">Dauer der Leistung = Summe der Abschnitte (${segsEd.reduce((a, x) => a + x.d, 0)} Tage). Pause 0 führt Abschnitte zusammen.</span>`;
    };
    const draw = () => {
      segBox.innerHTML = segHtml();
      const fd = bg.querySelector('#fDur'); if (fd) { fd.disabled = !!segsEd; if (segsEd) fd.value = fmtDur(segsEd.reduce((a, x) => a + x.d, 0)); }
      segBox.querySelectorAll('input[data-sg]').forEach((inp) => inp.addEventListener('change', () => { const x = segsEd[+inp.dataset.k]; x[inp.dataset.sg] = Math.max(inp.dataset.sg === 'd' ? 1 : 0, Math.round(+inp.value || 0)); if (inp.dataset.sg === 'gap' && x.gap === 0) { segsEd[+inp.dataset.k - 1].d += x.d; segsEd.splice(+inp.dataset.k, 1); if (segsEd.length < 2) segsEd = [segsEd[0]]; } draw(); }));
      segBox.querySelectorAll('[data-sgdel]').forEach((b) => { b.onclick = () => { const k = +b.dataset.sgdel; segsEd[k - 1].d += segsEd[k].d; segsEd.splice(k, 1); draw(); }; });
      const add = segBox.querySelector('#segAdd');
      if (add) add.onclick = () => {
        if (!segsEd) { const d = parseDur(bg.querySelector('#fDur').value) || t.dur; if (d < 2) { toast('Für eine Unterbrechung braucht die Leistung mindestens 2 Tage.', true); return; } segsEd = [{ d: Math.ceil(d / 2), gap: 0 }, { d: Math.floor(d / 2), gap: 5 }]; }
        else { const L = segsEd[segsEd.length - 1]; if (L.d < 2) { toast('Der letzte Abschnitt ist zu kurz zum Teilen.', true); return; } const h = Math.floor(L.d / 2); L.d -= h; segsEd.push({ d: h, gap: 5 }); }
        draw();
      };
    };
    draw();
  }
  const wire = () => {
    bg.querySelectorAll('.prm').forEach((b) => { b.onclick = () => { readPreds(bg); preds.splice(+b.dataset.k, 1); bg.querySelector('#pBody').innerHTML = predRows(); wire(); }; });
  };
  bg.querySelector('#pAdd').onclick = () => { readPreds(bg); preds.push({ uid: null, type: 'FS', lag: 0 }); bg.querySelector('#pBody').innerHTML = predRows(); wire(); };
  wire();
}

function multiDialog(ix) {
  const T = P.tasks, ts = ix.map((i) => T[i]), leaves = ix.filter((i) => !CAL.summ[i]);
  const same = (f) => { const v = ts.map(f); return v.every((x) => x === v[0]) ? v[0] : undefined; };
  const sameL = (f) => { const v = leaves.map((i) => f(T[i], i)); return v.length && v.every((x) => x === v[0]) ? v[0] : undefined; };
  const val = (x) => (x === undefined ? '' : esc(x));
  const ph = (x) => (x === undefined ? ' placeholder="(unterschiedlich)"' : '');
  const gw = same((t) => t.gw || ''), res = same((t) => t.res || ''), col = same((t) => t.color || '');
  const dur = sameL((t) => t.dur), pct = sameL((t) => t.pct || 0), cons = same((t) => t.cons ?? null);
  const body = `<div style="margin-bottom:10px;color:var(--mut)"><b>${ix.length} Leistungen</b> markiert${leaves.length < ix.length ? ` (davon ${ix.length - leaves.length} Leistungsgruppen – Dauer und % gelten nur für Teilleistungen; ein Gewerk wird an alle Teilleistungen weitergegeben)` : ''}. Geändert wird nur, was du anfasst.</div>
    <div class="form multi">
      <label>Gewerk</label><input data-f="gw" list="gwList" value="${val(gw)}"${ph(gw)}>
      <label>Balkenfarbe</label><div class="ro colrow"><select data-f="colm"><option value="keep" selected>unverändert</option><option value="gw">vom Gewerk</option><option value="own">eigene Farbe</option></select><input type="color" data-f="col" value="${col || '#8db3e2'}" style="display:none"></div>
      <label>Unternehmer</label><input data-f="res" class="full" value="${val(res)}"${ph(res)}>
      <label>Dauer</label><input data-f="dur" value="${dur === undefined ? '' : fmtDur(dur)}"${dur === undefined ? ' placeholder="(unterschiedlich)"' : ''}${leaves.length ? '' : ' disabled'}>
      <label>% Abgeschlossen</label><input data-f="pct" type="number" min="0" max="100" value="${pct === undefined ? '' : Math.round(pct)}"${pct === undefined ? ' placeholder="(unterschiedlich)"' : ''}${leaves.length ? '' : ' disabled'}>
      <label>Anfang nicht früher als</label><div class="ro colrow"><select data-f="consm"><option value="keep" selected>unverändert${cons === undefined ? ' (unterschiedlich)' : cons == null ? ' (keiner)' : ' (' + fmtD(cons) + ')'}</option><option value="clear">entfernen – so früh wie möglich</option><option value="set">setzen auf …</option></select><input type="date" data-f="cons" style="display:none" value="${cons != null && cons !== undefined ? isoD(cons) : ''}"></div>
      <label>Notizen</label><select data-f="notesm" class="full"><option value="keep" selected>unverändert</option><option value="append">Text anhängen …</option><option value="replace">ersetzen durch …</option><option value="clear">leeren</option></select>
      <label></label><textarea data-f="notes" class="full" style="display:none;grid-column:2 / span 3"></textarea>
    </div>`;
  updateGwList();
  const dirty = new Set();
  const bg = modal('Mehrere Leistungen bearbeiten', body, [{ label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
    const g = (f) => bg.querySelector(`[data-f="${f}"]`).value;
    let durV = null, pctV = null, consV;
    if (dirty.has('dur')) { durV = parseDur(g('dur')); if (durV == null) { toast('Ungültige Dauer.', true); return false; } }
    if (dirty.has('pct')) { pctV = Math.max(0, Math.min(100, Math.round(+g('pct') || 0))); }
    if (g('consm') === 'set') { consV = parseDate(g('cons')); if (consV == null) { toast('Bitte ein Datum wählen.', true); return false; } }
    const n = dirty.size + (g('colm') !== 'keep') + (g('consm') !== 'keep') + (g('notesm') !== 'keep');
    if (!n) return;
    const ok = act(() => {
      ix.forEach((i) => {
        const t = T[i], leaf = !CAL.summ[i];
        if (dirty.has('gw')) applyField(i, 'gw', g('gw'));
        if (dirty.has('res')) t.res = g('res').trim();
        if (leaf && durV != null) t.dur = durV;
        if (leaf && pctV != null) t.pct = pctV;
        if (g('colm') === 'gw') t.color = ''; else if (g('colm') === 'own') t.color = g('col');
        if (g('consm') === 'clear') t.cons = null; else if (g('consm') === 'set') t.cons = snapWork(consV);
        const nm = g('notesm'), tx = g('notes');
        if (nm === 'clear') t.notes = ''; else if (nm === 'replace') t.notes = tx; else if (nm === 'append' && tx.trim()) t.notes = (t.notes ? t.notes + '\n' : '') + tx;
      });
    });
    if (!ok) return false;
    toast(`${ix.length} Leistungen geändert.`);
  } }, { label: 'Abbrechen' }]);
  bg.querySelector('.modal').style.width = '620px';
  bg.querySelectorAll('input[data-f],textarea[data-f]').forEach((el) => el.addEventListener('input', () => dirty.add(el.dataset.f)));
  const sync = () => {
    const g = (f) => bg.querySelector(`[data-f="${f}"]`);
    g('col').style.display = g('colm').value === 'own' ? '' : 'none';
    g('cons').style.display = g('consm').value === 'set' ? '' : 'none';
    g('notes').style.display = ['append', 'replace'].includes(g('notesm').value) ? '' : 'none';
  };
  bg.addEventListener('change', sync); sync();
}
function infoForSelection() { const ix = selIdx(); if (ix.length > 1) multiDialog(ix); else if (ix.length) taskDialog(ix[0]); }

function linkDialog(si, k) {
  const s = P.tasks[si], p = s.preds[k], pi = CAL.idx.get(p.uid), pt = P.tasks[pi];
  const body = `<div class="form">
      <label>Von</label><div class="ro full">${pi + 1} – ${esc(pt.name)}</div>
      <label>Nach</label><div class="ro full">${si + 1} – ${esc(s.name)}</div>
      <label>Art</label><select id="lType" class="full">${['FS', 'SS', 'FF', 'SF'].map((ty) => `<option value="${ty}"${ty === p.type ? ' selected' : ''}>${TNAME[ty]}</option>`).join('')}</select>
      <label>Zeitabstand</label><input id="lLag" class="full" value="${p.lag ? (p.lag > 0 ? '+' : '-') + Math.abs(p.lag) + 't' : '0t'}">
      ${segList(pt) ? `<label>Von Abschnitt</label><select id="lPs" class="full"><option value="">ganze Leistung (Standard)</option>${pt.segs.map((x, k) => `<option value="${k}"${p.ps === k ? ' selected' : ''}>Abschnitt ${k + 1} (${fmtShort(fromW(CAL.segS[pi][k]))} – ${fmtShort(fromW(CAL.segE[pi][k] - 1))})</option>`).join('')}</select>` : ''}
      ${segList(s) ? `<label>An Abschnitt</label><select id="lSs" class="full"><option value="">Standard (Anfang bzw. Ende der Leistung)</option>${s.segs.map((x, k) => `<option value="${k}"${p.ss === k ? ' selected' : ''}>Abschnitt ${k + 1} (${fmtShort(fromW(CAL.segS[si][k]))} – ${fmtShort(fromW(CAL.segE[si][k] - 1))})</option>`).join('')}</select>` : ''}
    </div>`;
  modal('Anordnungsbeziehung', body, [
    { label: 'Löschen', cls: 'danger', left: true, fn: () => { act(() => { s.preds.splice(k, 1); }); } },
    { label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
      const lag = parseLag(bg.querySelector('#lLag').value);
      if (lag == null) { toast('Ungültiger Zeitabstand. Beispiele: +2t, -1t, 1w', true); return false; }
      const ps = bg.querySelector('#lPs'), ss = bg.querySelector('#lSs');
      return act(() => { const l = { uid: p.uid, type: bg.querySelector('#lType').value, lag }; const pv = ps ? ps.value : p.ps ?? '', sv = ss ? ss.value : p.ss ?? ''; if (pv !== '' && pv != null) l.ps = +pv; if (sv !== '' && sv != null) l.ss = +sv; s.preds[k] = l; }) ? undefined : false;
    } },
    { label: 'Abbrechen' },
  ]);
}

function projectDialog() {
  const cal = { week: 5, state: 'DE', free: [], ...(P.cal || {}) };
  let free = (cal.free || []).map((f) => ({ ...f }));
  const freeRows = () => free.map((f, k) => `<tr><td><input type="date" data-fr="from" data-k="${k}" value="${esc(f.from || '')}"></td><td><input type="date" data-fr="to" data-k="${k}" value="${esc(f.to || f.from || '')}"></td>
      <td><input data-fr="name" data-k="${k}" value="${esc(f.name || '')}" placeholder="z. B. Betriebsferien"></td><td style="text-align:center"><input type="checkbox" data-fr="yearly" data-k="${k}"${f.yearly ? ' checked' : ''} title="jedes Jahr"></td>
      <td style="width:30px;text-align:center"><button type="button" class="btn sm" data-frdel="${k}" title="Entfernen">✕</button></td></tr>`).join('')
    || '<tr><td colspan="5" style="color:var(--mut);padding:6px">Keine eigenen freien Tage</td></tr>';
  const body = `<div class="form">
      <label>Projektname</label><input id="pName" class="full" value="${esc(P.name)}" data-bp-projekt autocomplete="off">
      <label>Projektanfang</label><input id="pStart" type="date" class="full" value="${isoD(P.start)}">
      <label>Projektende</label><div class="ro full">${fmtD(CAL.peDay)} (berechnet)</div>
    </div>
    <div class="sec">Arbeitszeit und Feiertage</div>
    <div class="form">
      <label>Arbeitswoche</label><select id="pWeek" class="full">${WEEKS.map(([v, l]) => `<option value="${v}"${+cal.week === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label>Feiertage</label><select id="pState" class="full">${STATES.map(([v, l]) => `<option value="${v}"${(cal.state ?? 'DE') === v ? ' selected' : ''}>${l}</option>`).join('')}</select>
    </div>
    <div class="sec">Eigene freie Tage</div>
    <table class="ptab"><thead><tr><th style="width:130px">Von</th><th style="width:130px">Bis</th><th>Bezeichnung</th><th style="width:48px" title="jedes Jahr wiederholen">jährl.</th><th></th></tr></thead><tbody id="frBody">${freeRows()}</tbody></table>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      <button type="button" class="btn sm" id="frAdd">+ freie Tage</button>
      <button type="button" class="btn sm" data-q="xmas">+ Weihnachtsferien 24.12.–01.01. (jährlich)</button>
      <button type="button" class="btn sm" data-q="eve">+ Heiligabend und Silvester (jährlich)</button>
    </div>
    <div class="sec">Freie Tage im Projektzeitraum</div><div id="frPrev" class="frprev"></div>`;
  const read = (bg) => {
    bg.querySelectorAll('[data-fr]').forEach((el) => { const f = free[+el.dataset.k]; if (!f) return; f[el.dataset.fr] = el.type === 'checkbox' ? el.checked : el.value; });
    return { week: +bg.querySelector('#pWeek').value, state: bg.querySelector('#pState').value, free: free.filter((f) => f.from) };
  };
  const bg = modal('Projektinformationen', body, [{ label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
    const nm = bg.querySelector('#pName').value.trim() || P.name, d = parseDate(bg.querySelector('#pStart').value), c = read(bg);
    const end0 = CAL.peDay;
    const ok = act(() => { P.name = nm; P.cal = c; buildCal(c); if (d != null) P.start = snapWork(d); });
    if (ok && CAL.peDay !== end0) toast(`Projektende jetzt ${fmtD(CAL.peDay)} (vorher ${fmtD(end0)}).`);
    refreshProjectList();
  } }, { label: 'Abbrechen', fn: () => { buildCal(P.cal); } }]);
  bg.querySelector('.modal').style.width = '660px';
  const prev = () => {
    const c = read(bg), a = P.start, z = Math.max(CAL.peDay, P.start + 60);
    const m = freeMap({ state: c.state, free: c.free }, ud(a).getUTCFullYear(), ud(z).getUTCFullYear());
    const rows = [...m.entries()].filter(([d]) => d >= a && d <= z && (c.week === 7 || (c.week === 6 ? wdOf(d) !== 0 : wdOf(d) !== 0 && wdOf(d) !== 6))).sort((x, y) => x[0] - y[0]);
    bg.querySelector('#frPrev').innerHTML = rows.length ? `<div class="hint" style="margin:0 0 4px">${rows.length} zusätzliche arbeitsfreie Tage zwischen ${fmtD(a)} und ${fmtD(z)}:</div>` + rows.map(([d, n]) => `<span class="frday"><b>${fmtD(d)}</b> ${esc(n)}</span>`).join('') : '<div class="hint" style="margin:0">Keine Feiertage oder freien Tage im Projektzeitraum.</div>';
  };
  const redraw = () => { bg.querySelector('#frBody').innerHTML = freeRows(); prev(); };
  bg.addEventListener('change', (e) => { if (e.target.closest('.modal')) { read(bg); prev(); } });
  bg.addEventListener('click', (e) => {
    const del = e.target.closest('[data-frdel]'); if (del) { read(bg); free.splice(+del.dataset.frdel, 1); redraw(); return; }
    if (e.target.id === 'frAdd') { read(bg); const t = isoD(Math.max(todayN(), P.start)); free.push({ from: t, to: t, name: '', yearly: false }); redraw(); return; }
    const q = e.target.closest('[data-q]'); if (!q) return;
    read(bg); const y = ud(P.start).getUTCFullYear();
    if (q.dataset.q === 'xmas') free.push({ from: `${y}-12-24`, to: `${y + 1}-01-01`, name: 'Weihnachtsferien', yearly: true });
    else { free.push({ from: `${y}-12-24`, to: `${y}-12-24`, name: 'Heiligabend', yearly: true }); free.push({ from: `${y}-12-31`, to: `${y}-12-31`, name: 'Silvester', yearly: true }); }
    redraw();
  });
  prev();
}

/* ---------- Gewerke ---------- */
function gwAuto() {
  const props = [];
  P.tasks.forEach((t, i) => { if (!CAL.summ[i] && t.dur > 0 && !t.gw) { const g = guessGw(t); if (g) props.push([i, g]); } });
  const open = P.tasks.filter((t, i) => !CAL.summ[i] && t.dur > 0 && !t.gw).length - props.length;
  if (!props.length) { toast(open ? `Keine eindeutige Zuordnung gefunden – ${open} Leistungen bitte von Hand eintragen.` : 'Alle Leistungen haben bereits ein Gewerk.'); return; }
  const rows = props.map(([i, g]) => `<tr><td style="text-align:right;color:var(--mut)">${i + 1}</td><td>${esc(P.tasks[i].name)}</td><td><label class="cb"><input type="checkbox" data-i="${i}" checked><span class="gwdot" style="background:${P.gwColors[g] || GW_DEFAULT[g] || '#ccc'}"></span>${esc(g)}</label></td></tr>`).join('');
  modal('Gewerke automatisch zuordnen', `<div style="margin-bottom:8px">Für ${props.length} Leistungen ohne Gewerk wurde eine eindeutige Zuordnung gefunden (aus Leistung und Unternehmer). Bereits eingetragene Gewerke bleiben unverändert.${open > 0 ? ` <b>${open}</b> weitere Leistungen sind nicht eindeutig und bleiben leer.` : ''}</div>
    <div style="max-height:52vh;overflow:auto"><table class="ptab"><thead><tr><th>Nr.</th><th>Leistung</th><th>Gewerk</th></tr></thead><tbody>${rows}</tbody></table></div>`,
  [{ label: 'Übernehmen', cls: 'primary', primary: true, fn: (bg) => {
    const ok = new Set([...bg.querySelectorAll('input[data-i]:checked')].map((x) => +x.dataset.i));
    act(() => { props.forEach(([i, g]) => { if (ok.has(i)) { P.tasks[i].gw = g; gwColor(g); } }); });
  } }, { label: 'Abbrechen' }]);
}
function gwDialog() {
  const list = allGw();
  const cnt = (g) => P.tasks.filter((t) => t.gw === g).length;
  const rows = list.map((g) => `<tr><td><input type="color" data-g="${esc(g)}" value="${gwColor(g)}" style="width:42px;height:24px;padding:0;border:1px solid var(--bd)"></td>
      <td><input data-r="${esc(g)}" value="${esc(g)}"></td><td style="text-align:right;color:var(--mut);white-space:nowrap">${cnt(g)} Leistungen</td></tr>`).join('')
    || '<tr><td colspan="3" style="padding:8px;color:var(--mut)">Noch keine Gewerke eingetragen. Spalte „Gewerk“ ausfüllen oder „Automatisch zuordnen“ verwenden.</td></tr>';
  modal('Gewerke & Farben', `<table class="ptab"><thead><tr><th style="width:56px">Farbe</th><th>Gewerk (umbenennen möglich)</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="hint">Die Farbe gilt für alle Leistungen des Gewerks – im Diagramm, in der Tabelle und beim Drucken.</div>`,
  [{ label: 'Automatisch zuordnen…', left: true, fn: () => { setTimeout(gwAuto, 0); } },
    { label: 'OK', cls: 'primary', primary: true, fn: (bg) => {
      act(() => {
        bg.querySelectorAll('input[data-g]').forEach((el) => { P.gwColors[el.dataset.g] = el.value; });
        bg.querySelectorAll('input[data-r]').forEach((el) => {
          const o = el.dataset.r, n = el.value.trim(); if (!n || n === o) return;
          P.tasks.forEach((t) => { if (t.gw === o) t.gw = n; });
          if (!P.gwColors[n]) P.gwColors[n] = P.gwColors[o]; delete P.gwColors[o];
        });
      });
    } }, { label: 'Abbrechen' }]);
}

// suggest: optionale Vorschlagsliste. autocomplete="off": sonst schlägt der Browser Einträge aus anderen
// Dialogen vor (z. B. Projektnamen = Bauvorhabenadressen beim Anlegen eines Gewerks).
function promptDialog(title, label, value, onOk, suggest) {
  const dl = suggest && suggest.length ? `<datalist id="pvList">${suggest.map((s) => `<option value="${esc(s)}">`).join('')}</datalist>` : '';
  modal(title, `<div class="form"><label>${esc(label)}</label><input id="pv" class="full" value="${esc(value)}" autocomplete="off"${dl ? ' list="pvList"' : ''}${label === 'Projektname' ? ' data-bp-projekt' : ''}>${dl}</div>`,
    [{ label: 'OK', cls: 'primary', primary: true, fn: (bg) => { const v = bg.querySelector('#pv').value.trim(); if (!v) return false; onOk(v); } }, { label: 'Abbrechen' }]);
}
function confirmDialog(title, text, onOk, okLabel = 'Löschen') {
  modal(title, `<div style="max-width:420px;line-height:1.5">${text}</div>`, [{ label: okLabel, cls: 'primary', primary: true, fn: onOk }, { label: 'Abbrechen' }]);
}

/* ---------- Kontextmenü & Hinweise ---------- */
function ctxMenu(x, y, items) {
  document.querySelectorAll('.ctx').forEach((m) => m.remove());
  const m = document.createElement('div'); m.className = 'ctx';
  m.innerHTML = items.map((it, k) => (it === '-' ? '<hr>' : `<div data-k="${k}" class="${it.dis ? 'dis' : ''}">${esc(it.label)}${it.key ? `<kbd>${it.key}</kbd>` : ''}</div>`)).join('');
  document.body.appendChild(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 4) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 4) + 'px';
  m.addEventListener('mousedown', (e) => e.stopPropagation());
  m.addEventListener('click', (e) => { const d = e.target.closest('[data-k]'); if (!d) return; const it = items[+d.dataset.k]; if (it.dis) return; m.remove(); it.fn(); });
  setTimeout(() => { const off = () => { m.remove(); document.removeEventListener('mousedown', off); }; document.addEventListener('mousedown', off); }, 0);
}
function taskCtx(e) {
  e.preventDefault();
  const has = selIdx().length > 0;
  ctxMenu(e.clientX, e.clientY, [
    { label: 'Leistung einfügen', key: 'Einfg', fn: () => insertTask() },
    { label: 'Meilenstein einfügen', fn: () => insertTask('ms') },
    { label: 'Leistung löschen', key: 'Entf', dis: !has, fn: deleteSel },
    '-',
    { label: 'Tiefer stufen', key: 'Alt+⇧+→', dis: !has, fn: () => indent(1) },
    { label: 'Höher stufen', key: 'Alt+⇧+←', dis: !has, fn: () => indent(-1) },
    '-',
    { label: 'Leistungen verknüpfen', key: 'Strg+F2', dis: selIdx().length < 2, fn: linkSel },
    { label: 'Verknüpfung lösen', dis: !has, fn: unlinkSel },
    '-',
    { label: 'Zur Leistung scrollen', dis: !has, fn: scrollToTask },
    { label: selIdx().length > 1 ? `Gemeinsam bearbeiten… (${selIdx().length})` : 'Informationen…', key: '⇧+F2', dis: !has, fn: infoForSelection },
  ]);
}
let toastTimer = null;
function toast(msg, err = false) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 4500);
}

/* =====================================================================
   Ereignisse – Tabelle
   ===================================================================== */
gridBody.addEventListener('mousedown', (e) => {
  if (e.target.classList.contains('cell-ed')) return;
  const row = e.target.closest('.row'); if (!row) return;
  const r = +row.dataset.r;
  const tg = e.target.closest('[data-tog]');
  if (tg) { const i = +tg.dataset.tog; P.tasks[i].collapsed = !P.tasks[i].collapsed; queueSave(); render(); e.preventDefault(); return; }
  const cell = e.target.closest('.c'); if (cell) cur.c = cell.dataset.c;
  if (e.button === 2 && r < vis.length && sel.has(P.tasks[vis[r]].uid)) { cur.r = r; updateSel(); return; }
  const onNr = cell && cell.dataset.c === 'nr' && r < vis.length && e.button === 0;
  if (!(onNr && sel.has(P.tasks[vis[r]].uid) && !e.shiftKey && !e.ctrlKey && !e.metaKey)) selectRow(r, e);
  if (onNr) { e.preventDefault(); rowDrag = { y0: e.clientY, moved: false, n: selIdx().length }; gridBody.classList.add('rowdragging'); }
  gridBody.focus({ preventScroll: true });
});
gridBody.addEventListener('dblclick', (e) => {
  const row = e.target.closest('.row'), cell = e.target.closest('.c'); if (!row || !cell || e.target.closest('[data-tog]')) return;
  const r = +row.dataset.r, c = cell.dataset.c;
  if ((c === 'nr' || c === 'ind') && r < vis.length) taskDialog(vis[r]); else startEdit(r, c);
});
gridBody.addEventListener('contextmenu', taskCtx);

// Spaltenbreite
gridHead.addEventListener('mousedown', (e) => {
  const rz = e.target.closest('.rz'); if (!rz) return;
  e.preventDefault(); const k = rz.dataset.k, x0 = e.clientX, w0 = colW[k];
  const mv = (ev) => { colW[k] = Math.max(28, w0 + ev.clientX - x0); renderGrid(); };
  const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); LS.set('colW', colW); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});

// Trennlinie
$('#split').addEventListener('mousedown', (e) => {
  e.preventDefault(); const x0 = e.clientX, w0 = gridPane.offsetWidth, sp = $('#split'); sp.classList.add('drag');
  const mv = (ev) => { const w = Math.max(120, Math.min(innerWidth - 150, w0 + ev.clientX - x0)); document.documentElement.style.setProperty('--gw', w + 'px'); };
  const up = () => { sp.classList.remove('drag'); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); LS.set('gw', gridPane.offsetWidth); render(); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});

// synchrones vertikales Scrollen
gridPane.addEventListener('scroll', () => { if (chartPane.scrollTop !== gridPane.scrollTop) chartPane.scrollTop = gridPane.scrollTop; });
chartPane.addEventListener('scroll', () => { if (gridPane.scrollTop !== chartPane.scrollTop) gridPane.scrollTop = chartPane.scrollTop; });

/* =====================================================================
   Ereignisse – Diagramm (Ziehen, Verknüpfen, Tooltip)
   ===================================================================== */
const svgXY = (e) => { const r = chartBody.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function showTip(e, html) { tip.innerHTML = html; tip.style.display = 'block'; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(e.clientX + 14, innerWidth - w - 6) + 'px'; tip.style.top = Math.min(e.clientY + 16, innerHeight - h - 6) + 'px'; }
const hideTip = () => { tip.style.display = 'none'; };
function taskTip(i) {
  const t = P.tasks[i], kind = CAL.summ[i] ? 'Leistungsgruppe' : t.dur === 0 ? 'Meilenstein' : 'Leistung';
  return `<b>${esc(t.name || '(ohne Namen)')}</b><table>
    <tr><td>${kind}</td><td>Nr. ${i + 1}</td></tr>
    <tr><td>Anfang:</td><td>${fmtD(CAL.sd[i])}</td></tr><tr><td>Ende:</td><td>${fmtD(CAL.fd[i])}</td></tr>
    ${CAL.summ[i] ? `<tr><td>Summe Arbeit:</td><td>${fmtDur(sumWork(i))} <small style="color:var(--mut)">(Summe der Leistungen)</small></td></tr><tr><td>Zeitspanne:</td><td>${fmtDur(CAL.dur[i])} <small style="color:var(--mut)">(erste bis letzte Leistung)</small></td></tr>` : `<tr><td>Dauer:</td><td>${fmtDur(CAL.dur[i])}</td></tr>`}<tr><td>Abgeschlossen:</td><td>${Math.round(CAL.pct[i])}%</td></tr>
    ${t.gw ? `<tr><td>Gewerk:</td><td><span class="gwdot" style="background:${gwColor(t.gw)}"></span>${esc(t.gw)}</td></tr>` : ''}
    ${t.res ? `<tr><td>Unternehmer:</td><td>${esc(t.res)}</td></tr>` : ''}${relRows(i)}</table>`;
}
function relRows(i) {
  const t = P.tasks[i], nm = (k) => { const n = P.tasks[k].name || ''; return `<span style="white-space:nowrap">${esc(n.length > 40 ? n.slice(0, 38) + '…' : n)}</span>`; };
  const pre = (t.preds || []).map((p) => idxOfUid(p.uid)).filter((k) => k >= 0);
  const suc = []; P.tasks.forEach((x, k) => { if ((x.preds || []).some((p) => p.uid === t.uid)) suc.push(k); });
  const list = (a) => a.slice(0, 4).map(nm).join('<br>') + (a.length > 4 ? `<br>… und ${a.length - 4} weitere` : '');
  return (pre.length ? `<tr><td><span class="tip-pre">◀ Vorgänger:</span></td><td>${list(pre)}</td></tr>` : '') + (suc.length ? `<tr><td><span class="tip-suc">Nachfolger ▶</span></td><td>${list(suc)}</td></tr>` : '');
}

/* ---------- Hilfen für die Mausbedienung ---------- */
const dayAtX = (x) => view.start + Math.floor(x / ZOOMS[zoom].ppd);
let splitMode = false;
function setSplitMode(v) {
  splitMode = v; chartBody.classList.toggle('splitting', v);
  const b = document.querySelector('.rb[data-act="splitMode"]'); if (b) b.classList.toggle('on', v);
  if (v) toast('Unterbrechen: auf die Stelle im Balken klicken, an der die Pause beginnen soll (Esc bricht ab).');
  else { hideTip(); const m = document.getElementById('splitMark'); if (m) m.remove(); }
}
function segAtDay(i, day) {   // Abschnitt, der den Tag enthält (oder -1)
  const S = CAL.segS[i], E = CAL.segE[i], w = toW(day);
  if (!S) return -1;
  for (let k = 0; k < S.length; k++) if (w >= S[k] && w < E[k] && !isWE(day)) return k;
  return -1;
}
function doSplit(i, day, gap = 5) {
  const t = P.tasks[i];
  if (CAL.summ[i] || !(t.dur > 1)) { toast('Nur Leistungen mit mindestens 2 Tagen Dauer lassen sich unterbrechen.', true); return false; }
  const k = segAtDay(i, day), S = CAL.segS[i];
  const w = toW(day);
  if (k < 0 || w <= S[k]) { toast('Bitte auf einen Tag innerhalb des Balkens klicken – nicht auf den ersten Tag eines Abschnitts.', true); return false; }
  const segs = segList(t) ? t.segs.map((x) => ({ ...x })) : [{ d: t.dur, gap: 0 }];
  const d1 = w - S[k], d2 = segs[k].d - d1;
  segs.splice(k, 1, { d: d1, gap: segs[k].gap }, { d: d2, gap: Math.max(1, gap) });
  // Verknüpfungen an späteren Abschnitten verschieben sich um eins
  const ok = act(() => {
    t.segs = segs;
    for (const p of t.preds) if (p.ss != null && p.ss > k) p.ss++;
    for (const o of P.tasks) for (const p of o.preds) if (p.uid === t.uid && p.ps != null && p.ps > k) p.ps++;
  });
  if (ok) toast(`Unterbrochen: Abschnitt ${k + 1} endet ${fmtD(fromW(w - 1))}, ${gap} Arbeitstage Pause. Den hinteren Teil kannst du mit der Maus verschieben.`);
  return ok;
}
function unsplit(i) { const t = P.tasks[i]; if (!segList(t)) return; act(() => { t.segs = null; for (const p of t.preds) delete p.ss; for (const o of P.tasks) for (const p of o.preds) if (p.uid === t.uid) delete p.ps; }); }
function splitDialog(i, day) {
  modal('Leistung unterbrechen', `<div class="form"><label>Unterbrechen ab</label><div class="ro full">${fmtD(day)}</div>
      <label>Pause</label><input id="spGap" class="full" value="5 Tage"></div><div class="hint">Die Leistung wird an diesem Tag geteilt; der hintere Abschnitt beginnt nach der Pause. Beide Abschnitte lassen sich einzeln verschieben und verknüpfen.</div>`,
  [{ label: 'Unterbrechen', cls: 'primary', primary: true, fn: (bg) => { const g = parseDur(bg.querySelector('#spGap').value); if (g == null || g < 1) { toast('Bitte eine Pause von mindestens 1 Tag angeben.', true); return false; } doSplit(i, day, g); } }, { label: 'Abbrechen' }]);
}
function setHover(r) {
  const hb = document.getElementById('hovband'); if (hb) hb.setAttribute('y', r == null || r >= vis.length ? -100 : r * RH);
  gridBody.querySelectorAll('.row.hov').forEach((x) => x.classList.remove('hov'));
  if (r != null && r < vis.length) { const row = gridBody.querySelector(`.row[data-r="${r}"]`); if (row) row.classList.add('hov'); }
}
function addLinkSeg(pi, si, ps, ss) {
  if (pi === si) return false;
  if (isAncestor(pi, si) || isAncestor(si, pi)) { toast('Leistungsgruppen können nicht mit ihren eigenen Teilleistungen verknüpft werden.', true); return false; }
  const s = P.tasks[si], puid = P.tasks[pi].uid;
  const ex = s.preds.find((p) => p.uid === puid);
  if (ex && (ex.ps ?? null) === (ps ?? null) && (ex.ss ?? null) === (ss ?? null)) { toast('Diese Leistungen sind bereits so verknüpft.'); return false; }
  return act(() => {
    const l = { uid: puid, type: 'FS', lag: 0 }; if (ps != null) l.ps = ps; if (ss != null) l.ss = ss;
    if (ex) Object.assign(ex, l); else s.preds.push(l);
  });
}
const segName = (i, k) => (k == null || !segList(P.tasks[i]) ? '' : ` (Abschnitt ${k + 1})`);

/* ---------- Diagramm: Maus ---------- */
chartBody.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  hideTip();
  const { x, y } = svgXY(e);
  const r = Math.floor(y / RH);
  if (e.target.closest('.lk')) return;
  const b = e.target.closest('.bar');
  if (splitMode) {
    e.preventDefault();
    if (b && !CAL.summ[+b.dataset.i]) { const i = +b.dataset.i; if (doSplit(i, dayAtX(x))) setSplitMode(false); }
    else setSplitMode(false);
    return;
  }
  if (!b) {
    e.preventDefault();
    drag = { mode: r >= vis.length ? 'draw' : 'pan', r, x0: e.clientX, y0: e.clientY, sx: x, sy: y, sl: chartPane.scrollLeft, st: chartPane.scrollTop, moved: false, ev: e };
    return;
  }
  const i = +b.dataset.i, ri = rowOfIdx(i);
  if (e.ctrlKey || e.shiftKey || !sel.has(P.tasks[i].uid)) selectRow(ri, e);
  cur.r = ri;
  const cl = e.target.classList, segEl = e.target.closest('[data-seg]'), k = segEl ? +segEl.dataset.seg : null;
  let mode;
  if (cl.contains('lkdot')) mode = 'link';
  else if (CAL.summ[i]) mode = 'link';
  else if (cl.contains('rh')) mode = 'resize';
  else if (cl.contains('lh')) mode = 'lresize';
  else if (cl.contains('ph')) mode = 'pct';
  else if (k > 0) mode = 'seg';
  else mode = 'move';
  const nSeg = geo[i].segs.length;
  drag = { i, mode, k, x0: e.clientX, y0: e.clientY, sx: x, sy: y, moved: false, el: b, fromDot: cl.contains('lkdot'),
    ps: k != null && nSeg > 1 && k < nSeg - 1 ? k : null };
  e.preventDefault();
});

addEventListener('mousemove', (e) => {
  if (!drag) {
    if (!e.target.closest) return;
    const inChart = e.target.closest('#chartBody');
    if (inChart) {
      const { x, y } = svgXY(e), r = Math.floor(y / RH);
      setHover(r);
      const b = e.target.closest('#chartBody .bar'), lk = !b && e.target.closest('#chartBody .lk');
      if (splitMode) {
        const svg = document.getElementById('chartSvg'); let m = document.getElementById('splitMark');
        if (!m) { m = document.createElementNS('http://www.w3.org/2000/svg', 'line'); m.id = 'splitMark'; m.setAttribute('class', 'splitmark'); svg.appendChild(m); }
        const d = dayAtX(x), xx = X(d);
        m.setAttribute('x1', xx); m.setAttribute('x2', xx); m.setAttribute('y1', r * RH); m.setAttribute('y2', r * RH + RH);
        showTip(e, b ? `<b>Unterbrechen ab ${fmtD(d)}</b>Klicken, um hier eine Pause einzufügen` : '<b>Unterbrechen</b>Auf einen Balken klicken');
        return;
      }
      chartBody.style.cursor = b || lk ? '' : r >= vis.length ? 'crosshair' : 'grab';
      if (linkMode === 'sel') { const hi = b ? +b.dataset.i : null; if (hi !== hoverLinkI) { hoverLinkI = hi; markLinks(); } }
      if (b) {
        const i = +b.dataset.i, cl = e.target.classList;
        if (cl.contains('lkdot')) showTip(e, '<b>Verknüpfen</b>Ziehen auf die nachfolgende Leistung');
        else if (cl.contains('ph')) showTip(e, `<b>Fortschritt</b>${Math.round(CAL.pct[i])}% – ziehen zum Ändern`);
        else if (cl.contains('lh')) showTip(e, '<b>Anfang verschieben</b>Ziehen ändert Anfang und Dauer, das Ende bleibt');
        else showTip(e, taskTip(i));
      } else if (lk) {
        const si = +lk.dataset.s, p = P.tasks[si].preds[+lk.dataset.k], pi = CAL.idx.get(p.uid);
        showTip(e, `<b>Anordnungsbeziehung</b><table><tr><td>Von:</td><td>${pi + 1} – ${esc(P.tasks[pi].name)}${segName(pi, p.ps)}</td></tr><tr><td>Nach:</td><td>${si + 1} – ${esc(P.tasks[si].name)}${segName(si, p.ss)}</td></tr><tr><td>Art:</td><td>${TNAME[p.type]}</td></tr><tr><td>Zeitabstand:</td><td>${p.lag ? fmtLag(p.lag) : '0 Tage'}</td></tr></table><div style="color:var(--mut);margin-top:3px">Doppelklick oder Rechtsklick zum Bearbeiten</div>`);
      } else if (r >= vis.length) showTip(e, '<b>Neue Leistung</b>Waagerecht ziehen, um einen Balken aufzuziehen');
      else hideTip();
    } else if (!e.target.closest('#tip')) { hideTip(); }
    return;
  }
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0, ppd = ZOOMS[zoom].ppd;
  if (!drag.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
  drag.moved = true;
  const svg = document.getElementById('chartSvg');
  if (drag.mode === 'pan') {
    chartPane.scrollLeft = drag.sl - dx; chartPane.scrollTop = drag.st - dy; chartBody.style.cursor = 'grabbing'; hideTip(); return;
  }
  if (drag.mode === 'draw') {
    const p = svgXY(e), a = dayAtX(Math.min(drag.sx, p.x)), z = dayAtX(Math.max(drag.sx, p.x));
    const s0 = snapWork(a), nd = Math.max(1, toW(z + 1) - toW(s0));
    let pv = document.getElementById('drawPrev');
    if (!pv) { pv = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); pv.id = 'drawPrev'; pv.setAttribute('class', 'drawprev'); svg.appendChild(pv); }
    const x1 = X(s0), x2 = X(fromW(toW(s0) + nd - 1) + 1);
    pv.setAttribute('x', x1); pv.setAttribute('y', drag.r * RH + 6); pv.setAttribute('width', Math.max(2, x2 - x1)); pv.setAttribute('height', 12);
    drag.val = { start: s0, dur: nd };
    showTip(e, `<b>Neue Leistung</b><table><tr><td>Anfang:</td><td>${fmtD(s0)}</td></tr><tr><td>Ende:</td><td>${fmtD(fromW(toW(s0) + nd - 1))}</td></tr><tr><td>Dauer:</td><td>${fmtDur(nd)}</td></tr></table>`);
    return;
  }
  const i = drag.i, t = P.tasks[i], g = geo[i];
  if (drag.mode === 'move' && !drag.fromDot && Math.abs(dy) > RH * 0.8 && !segList(t)) { drag.mode = 'link'; drag.el.removeAttribute('transform'); }
  if (drag.mode === 'move' && !drag.fromDot && Math.abs(dy) > RH * 0.8 && segList(t)) { drag.mode = 'link'; drag.el.removeAttribute('transform'); }
  if (drag.mode === 'move') {
    const dd = Math.round(dx / ppd);
    drag.el.setAttribute('transform', `translate(${dd * ppd},0)`); drag.el.classList.add('dragging');
    const ns = snapWork(CAL.sd[i] + dd + (CAL.msEnd[i] ? 1 : 0));
    const span = CAL.ef[i] - CAL.es[i];
    const nf = t.dur > 0 ? fromW(toW(ns) + span - 1) : ns;
    drag.val = ns;
    showTip(e, `<b>${esc(t.name)}</b><table><tr><td>Anfang:</td><td>${fmtD(ns)}</td></tr><tr><td>Ende:</td><td>${fmtD(nf)}</td></tr></table>`);
  } else if (drag.mode === 'seg') {
    const k = drag.k, S = CAL.segS[i], E = CAL.segE[i];
    const dd = Math.round(dx / ppd);
    const ns = snapWork(fromW(S[k]) + dd);
    const gap = Math.max(0, toW(ns) - E[k - 1]);
    const sh = (E[k - 1] + gap - S[k]);   // Verschiebung in Arbeitstagen
    const px = X(fromW(S[k] + sh)) - X(fromW(S[k]));
    drag.el.querySelectorAll('.sg').forEach((el) => { if (+el.dataset.seg >= k) el.setAttribute('transform', `translate(${px},0)`); });
    drag.el.classList.add('dragging');
    drag.val = gap;
    showTip(e, `<b>${esc(t.name)} – Abschnitt ${k + 1}</b><table><tr><td>Anfang:</td><td>${fmtD(fromW(E[k - 1] + gap))}</td></tr><tr><td>Pause:</td><td>${gap ? fmtDur(gap) : '<b>keine – Abschnitte werden zusammengeführt</b>'}</td></tr></table>`);
  } else if (drag.mode === 'resize') {
    const last = g.segs.length - 1, sg = g.segs[last];
    const rect = drag.el.querySelector(`rect.b[data-seg="${last}"]`);
    rect.setAttribute('width', Math.max(ppd, sg.x2 - sg.x1 + dx));
    const end = fromW(CAL.segE[i][last] - 1) + Math.round(dx / ppd);
    const nd = Math.max(1, toW(end + 1) - CAL.segS[i][last]);
    drag.val = nd;
    const tot = t.dur - sg.d + nd;
    showTip(e, `<b>${esc(t.name)}</b><table><tr><td>Ende:</td><td>${fmtD(fromW(CAL.segS[i][last] + nd - 1))}</td></tr><tr><td>Dauer:</td><td>${fmtDur(tot)}</td></tr></table>`);
  } else if (drag.mode === 'lresize') {
    const sg = g.segs[0], rect = drag.el.querySelector('rect.b[data-seg="0"]');
    const ns = snapWork(CAL.sd[i] + Math.round(dx / ppd));
    const d0 = CAL.segE[i][0] - toW(ns);
    if (d0 >= 1) {
      const nx = X(ns); rect.setAttribute('x', nx); rect.setAttribute('width', Math.max(2, sg.x2 - nx));
      drag.val = { ns, d0 };
      showTip(e, `<b>${esc(t.name)}</b><table><tr><td>Anfang:</td><td>${fmtD(ns)}</td></tr><tr><td>Dauer:</td><td>${fmtDur(t.dur - sg.d + d0)}</td></tr></table>`);
    }
  } else if (drag.mode === 'pct') {
    const p = svgXY(e); let done = 0;
    for (const sg of g.segs) { if (p.x >= sg.x2) done += sg.d; else if (p.x > sg.x1) done += (p.x - sg.x1) / (sg.x2 - sg.x1) * sg.d; }
    const v = Math.max(0, Math.min(100, Math.round(done / t.dur * 20) * 5));
    drag.val = v;
    const ph = drag.el.querySelector('.ph'); if (ph) ph.setAttribute('transform', `translate(${p.x - drag.sx},0)`);
    showTip(e, `<b>Fortschritt</b>${v}% abgeschlossen`);
  } else if (drag.mode === 'link') {
    let ln = svg.querySelector('.dragline');
    if (!ln) { ln = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ln.setAttribute('class', 'dragline'); svg.appendChild(ln); }
    const from = segAnchor(g, drag.ps), p = svgXY(e);
    ln.setAttribute('x1', drag.fromDot ? g.x2 + 7 : from.x2); ln.setAttribute('y1', g.y + RH / 2); ln.setAttribute('x2', p.x); ln.setAttribute('y2', p.y);
    svg.querySelectorAll('.bar.target').forEach((x) => x.classList.remove('target'));
    const tr = Math.floor(p.y / RH), ti = vis[tr];
    drag.target = null; drag.ss = null;
    if (ti != null && ti !== i && !isAncestor(ti, i) && !isAncestor(i, ti)) {
      drag.target = ti; const tb = svg.querySelector(`.bar[data-i="${ti}"]`); if (tb) tb.classList.add('target');
      const tg = geo[ti];
      if (tg.segs.length > 1) { let best = 0, bd = Infinity; tg.segs.forEach((sg, kk) => { const dd2 = p.x < sg.x1 ? sg.x1 - p.x : p.x > sg.x2 ? p.x - sg.x2 : 0; if (dd2 < bd) { bd = dd2; best = kk; } }); drag.ss = best > 0 ? best : null; }
      showTip(e, `<b>Leistungen verknüpfen</b><table><tr><td>Von:</td><td>${i + 1} – ${esc(t.name)}${segName(i, drag.ps)}</td></tr><tr><td>Nach:</td><td>${ti + 1} – ${esc(P.tasks[ti].name)}${segName(ti, drag.ss ?? (tg.segs.length > 1 ? 0 : null))}</td></tr></table>`);
    } else showTip(e, '<b>Leistungen verknüpfen</b>Auf eine andere Leistung ziehen');
  }
});

addEventListener('blur', () => { if (drag && drag.mode !== 'draw') { drag = null; hideTip(); document.querySelectorAll('.dragline').forEach((x) => x.remove()); chartBody.style.cursor = ''; if (P) render(); } });
addEventListener('mouseup', () => {
  if (!drag) return;
  const d = drag; drag = null; hideTip(); chartBody.style.cursor = '';
  document.querySelectorAll('.dragline').forEach((x) => x.remove());   // Verknüpfungs-Vorschau immer entfernen
  if (d.mode === 'pan') { if (!d.moved) selectRow(d.r, d.ev); return; }
  if (d.mode === 'draw') {
    const pv = document.getElementById('drawPrev'); if (pv) pv.remove();
    if (!d.moved || !d.val) { selectRow(d.r, d.ev); return; }
    let uid;
    const ok = act(() => {
      const last = vis.length ? P.tasks[vis[vis.length - 1]] : null;
      const t = newTask('Neue Leistung', d.val.dur); t.cons = d.val.start; t.lvl = last ? last.lvl : 0;
      P.tasks.push(t); uid = t.uid; sel = new Set([uid]);
    });
    if (ok) { cur.r = rowOfIdx(idxOfUid(uid)); cur.c = 'name'; anchorR = cur.r; updateSel(); startEdit(cur.r, 'name'); }
    return;
  }
  if (!d.moved) return;
  const t = P.tasks[d.i];
  if (d.mode === 'move' && d.val != null) act(() => { t.cons = d.val; });
  else if (d.mode === 'seg' && d.val != null) act(() => { t.segs[d.k].gap = d.val; });
  else if (d.mode === 'resize' && d.val != null) act(() => { if (segList(t)) { const L = t.segs.length - 1; t.dur += d.val - t.segs[L].d; t.segs[L].d = d.val; } else t.dur = d.val; });
  else if (d.mode === 'lresize' && d.val) act(() => { t.cons = d.val.ns; if (segList(t)) { t.dur += d.val.d0 - t.segs[0].d; t.segs[0].d = d.val.d0; } else t.dur = d.val.d0; });
  else if (d.mode === 'pct' && d.val != null) act(() => { t.pct = d.val; });
  else if (d.mode === 'link' && d.target != null) addLinkSeg(d.i, d.target, d.ps, d.ss);
  else render();
});

chartBody.addEventListener('dblclick', (e) => {
  const lk = e.target.closest('.lk');
  if (lk) { linkDialog(+lk.dataset.s, +lk.dataset.k); return; }
  const b = e.target.closest('.bar'); if (b) { taskDialog(+b.dataset.i); return; }
  const { x, y } = svgXY(e), r = Math.floor(y / RH);
  if (r < vis.length) { taskDialog(vis[r]); return; }
  // Doppelklick in eine leere Zeile: neue Leistung an diesem Tag
  let uid;
  const ok = act(() => { const last = vis.length ? P.tasks[vis[vis.length - 1]] : null; const t = newTask('Neue Leistung', 1); t.cons = snapWork(dayAtX(x)); t.lvl = last ? last.lvl : 0; P.tasks.push(t); uid = t.uid; sel = new Set([uid]); });
  if (ok) { cur.r = rowOfIdx(idxOfUid(uid)); cur.c = 'name'; anchorR = cur.r; updateSel(); startEdit(cur.r, 'name'); }
});
chartBody.addEventListener('contextmenu', (e) => {
  e.preventDefault(); hideTip();
  const lk = e.target.closest('.lk');
  if (lk) {
    const si = +lk.dataset.s, k = +lk.dataset.k, s2 = P.tasks[si], p = s2.preds[k];
    ctxMenu(e.clientX, e.clientY, [
      { label: 'Verknüpfung bearbeiten …', fn: () => linkDialog(si, k) },
      '-',
      ...['FS', 'SS', 'FF', 'SF'].map((ty) => ({ label: (p.type === ty ? '✓ ' : ' ') + TNAME[ty], fn: () => act(() => { p.type = ty; }) })),
      '-',
      { label: 'Verknüpfung löschen', fn: () => act(() => { s2.preds.splice(k, 1); }) },
    ]);
    return;
  }
  const b = e.target.closest('.bar'); const { x, y } = svgXY(e);
  const r = b ? rowOfIdx(+b.dataset.i) : Math.floor(y / RH);
  if (r < vis.length && !sel.has(P.tasks[vis[r]].uid)) selectRow(r, null); else cur.r = r;
  if (!b || CAL.summ[+b.dataset.i]) { taskCtx(e); return; }
  const i = +b.dataset.i, t = P.tasks[i], day = dayAtX(x);
  ctxMenu(e.clientX, e.clientY, [
    { label: `Hier unterbrechen (ab ${fmtShort(day)}) …`, dis: !(t.dur > 1), fn: () => splitDialog(i, day) },
    { label: 'Unterbrechungen entfernen', dis: !segList(t), fn: () => unsplit(i) },
    '-',
    { label: 'Fortschritt 0 %', fn: () => act(() => { t.pct = 0; }) },
    { label: 'Fortschritt 50 %', fn: () => act(() => { t.pct = 50; }) },
    { label: 'Fortschritt 100 %', fn: () => act(() => { t.pct = 100; }) },
    '-',
    { label: 'Leistung einfügen', key: 'Einfg', fn: () => insertTask() },
    { label: 'Leistung löschen', key: 'Entf', fn: deleteSel },
    { label: 'Verknüpfungen dieser Leistung lösen', fn: unlinkSel },
    '-',
    { label: selIdx().length > 1 ? `Gemeinsam bearbeiten … (${selIdx().length})` : 'Informationen …', key: '⇧+F2', fn: infoForSelection },
  ]);
});
chartBody.addEventListener('mouseleave', () => { if (!drag) { setHover(null); hideTip(); if (hoverLinkI != null) { hoverLinkI = null; markLinks(); } } });
gridBody.addEventListener('mousemove', (e) => { if (drag || rowDrag) return; const row = e.target.closest('.row'); setHover(row ? +row.dataset.r : null); });
gridBody.addEventListener('mouseleave', () => setHover(null));

// Zeitskala: ziehen = waagerecht verschieben, Mausrad = waagerecht blättern
chartHead.addEventListener('mousedown', (e) => {
  e.preventDefault(); const x0 = e.clientX, sl = chartPane.scrollLeft; chartHead.style.cursor = 'grabbing';
  const mv = (ev) => { chartPane.scrollLeft = sl - (ev.clientX - x0); };
  const up = () => { chartHead.style.cursor = ''; removeEventListener('mousemove', mv); removeEventListener('mouseup', up); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});
chartHead.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); chartPane.scrollLeft += e.deltaY + e.deltaX; }, { passive: false });

/* ---------- Tabelle: Zeilen per Maus verschieben (an der Nummernspalte ziehen) ---------- */
let rowDrag = null;
function moveRowsTo(ix, rt) {
  const T = P.tasks;
  const tops = ix.filter((i) => !ix.some((j) => j !== i && isAncestor(j, i)));
  const moving = new Set(); tops.forEach((i) => { for (let k = i; k <= blockEnd(i); k++) moving.add(k); });
  const targetIdx = rt < vis.length ? vis[rt] : T.length;
  if (moving.has(targetIdx)) return false;
  const uids = tops.map((i) => T[i].uid);
  const ok = act(() => {
    const block = T.filter((t, k) => moving.has(k));
    const tgt = targetIdx < T.length ? T[targetIdx] : null;
    const rest = T.filter((t, k) => !moving.has(k));
    const at = tgt ? rest.indexOf(tgt) : rest.length;
    const base = tgt ? tgt.lvl : rest.length ? rest[rest.length - 1].lvl : 0;
    const delta = base - Math.min(...block.map((t) => t.lvl));
    block.forEach((t) => { t.lvl = Math.max(0, t.lvl + delta); });
    rest.splice(at, 0, ...block); P.tasks = rest;
    sel = new Set(uids);
  });
  if (ok) { const r0 = rowOfIdx(idxOfUid(uids[0])); if (r0 >= 0) { cur.r = r0; anchorR = r0; } updateSel(); if (uids.length === 1) afterMove(uids[0]); }
  return ok;
}
addEventListener('mousemove', (e) => {
  if (!rowDrag) return;
  if (!rowDrag.moved && Math.abs(e.clientY - rowDrag.y0) < 4) return;
  rowDrag.moved = true;
  const rb = gridBody.getBoundingClientRect();
  const rt = Math.max(0, Math.min(vis.length, Math.round((e.clientY - rb.top) / RH)));
  rowDrag.rt = rt;
  let ln = document.getElementById('rowDropLine');
  if (!ln) { ln = document.createElement('div'); ln.id = 'rowDropLine'; gridBody.appendChild(ln); }
  ln.style.top = (rt * RH - 1) + 'px';
  showTip(e, `<b>Verschieben</b>${rowDrag.n} ${rowDrag.n === 1 ? 'Leistung' : 'Leistungen'} ${rt < vis.length ? 'vor Zeile ' + (vis[rt] + 1) : 'ans Ende'}`);
  // am Rand automatisch blättern
  const pr = gridPane.getBoundingClientRect();
  if (e.clientY > pr.bottom - 30) gridPane.scrollTop += 12; else if (e.clientY < pr.top + HH + 20) gridPane.scrollTop -= 12;
});
addEventListener('mouseup', () => {
  if (!rowDrag) return;
  const d = rowDrag; rowDrag = null; hideTip();
  const ln = document.getElementById('rowDropLine'); if (ln) ln.remove();
  gridBody.classList.remove('rowdragging');
  if (d.moved && d.rt != null) moveRowsTo(selIdx(), d.rt);
});

chartPane.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const day = view.start + (chartPane.scrollLeft + (e.clientX - chartPane.getBoundingClientRect().left)) / ZOOMS[zoom].ppd;
  const nz = zoom + (e.deltaY < 0 ? 1 : -1); if (nz < 0 || nz >= ZOOMS.length) return;
  zoom = nz; LS.set('zoom', nz); render();
  chartPane.scrollLeft = X(day) - (e.clientX - chartPane.getBoundingClientRect().left);
}, { passive: false });

/* =====================================================================
   Tastatur
   ===================================================================== */
document.addEventListener('keydown', (e) => {
  if (document.querySelector('.modal-bg') || editing) return;
  if (e.target.matches('input,textarea,select')) return;
  if (!$('#firmView').hidden && !(e.ctrlKey || e.metaKey)) return;
  if (e.target.closest && e.target.closest('#assistPane')) return;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey, lk = k.toLowerCase();
  if (!P) { if (ctrl && lk === 'o') { e.preventDefault(); fileOpen(); } return; }
  if (k === 'Escape' && splitMode) { setSplitMode(false); return; }
  if (k === 'Escape' && relink) { closeRelink(); return; }
  if (ctrl && lk === 'p') { e.preventDefault(); printDialog(); return; }
  if (ctrl && lk === 's') { e.preventDefault(); if (e.shiftKey) fileSaveAs(); else fileSave(); return; }
  if (ctrl && lk === 'o') { e.preventDefault(); fileOpen(); return; }
  if (ctrl && lk === 'z') { e.preventDefault(); doUndo(); return; }
  if (ctrl && (lk === 'y' || (e.shiftKey && lk === 'z'))) { e.preventDefault(); doRedo(); return; }
  if (ctrl && k === 'F2') { e.preventDefault(); e.shiftKey ? unlinkSel() : linkSel(); return; }
  if (e.shiftKey && k === 'F2') { e.preventDefault(); infoForSelection(); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowRight') { e.preventDefault(); indent(1); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowLeft') { e.preventDefault(); indent(-1); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowUp') { e.preventDefault(); moveSel(-1); return; }
  if (e.altKey && e.shiftKey && k === 'ArrowDown') { e.preventDefault(); moveSel(1); return; }
  if (ctrl && lk === 'a') { e.preventDefault(); sel = new Set(vis.map((i) => P.tasks[i].uid)); updateSel(); return; }
  if (k === 'Insert') { e.preventDefault(); insertTask(); return; }
  if (k === 'Delete') { e.preventDefault(); deleteSel(); return; }
  if (k === 'F2') { e.preventDefault(); startEdit(cur.r, cur.c); return; }
  const mv = (dr, dc) => {
    e.preventDefault();
    if (dr) {
      const nr = Math.max(0, Math.min(nRows() - 1, cur.r + dr));
      if (e.shiftKey) { cur.r = nr; sel.clear(); const a = Math.min(anchorR, nr), b = Math.max(anchorR, nr); for (let x = a; x <= b && x < vis.length; x++) sel.add(P.tasks[vis[x]].uid); updateSel(); }
      else selectRow(nr, null);
    }
    if (dc) { const ix = Math.max(0, Math.min(COLK.length - 1, COLK.indexOf(cur.c) + dc)); cur.c = COLK[ix]; updateSel(); }
    ensureVisible(cur.r);
  };
  if (k === 'ArrowDown' || k === 'Enter') return mv(e.shiftKey && k === 'Enter' ? -1 : 1, 0);
  if (k === 'ArrowUp') return mv(-1, 0);
  if (k === 'ArrowLeft') return mv(0, -1);
  if (k === 'ArrowRight' || k === 'Tab') return mv(0, e.shiftKey && k === 'Tab' ? -2 : 1);
  if (k === 'PageDown') return mv(Math.floor(gridPane.clientHeight / RH) - 2, 0);
  if (k === 'PageUp') return mv(-(Math.floor(gridPane.clientHeight / RH) - 2), 0);
  if (k.length === 1 && !ctrl && !e.altKey && EDITABLE.has(cur.c)) { e.preventDefault(); startEdit(cur.r, cur.c, k); }
});

/* =====================================================================
   Menüband
   ===================================================================== */
const ICONS = {
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  task: '<rect x="2.5" y="10" width="14" height="6" class="bluef"/><path d="M19.5 3.5v6M16.5 6.5h6" class="grn"/>',
  summary: '<path d="M2.5 5.5h19v3.5l-2.2-1.7H4.7L2.5 9z" class="f"/><rect x="5" y="12" width="8" height="4" class="bluef"/><rect x="11" y="18" width="9" height="3.5" class="bluef"/>',
  milestone: '<path d="M12 4l7.5 8-7.5 8-7.5-8z" class="f"/>',
  del: '<path d="M6 6l12 12M18 6L6 18" class="red"/>',
  outdent: '<path d="M21 5H10M21 12h-7M21 19H10"/><path d="M8 8.5L4.5 12 8 15.5" class="grn"/>',
  indent: '<path d="M21 5H10M21 12h-7M21 19H10"/><path d="M3.5 8.5L7 12l-3.5 3.5" class="grn"/>',
  up: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 4v15M6 13l6 6 6-6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" class="blue"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" class="blue"/>',
  unlink: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" class="blue"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" class="blue"/><path d="M4 4l16 16" class="red"/>',
  info: '<circle cx="12" cy="12" r="9" class="blue"/><path d="M12 11v6M12 7.5v.4" class="blue"/>',
  scrollto: '<path d="M3 12h12M11 8l4 4-4 4"/><rect x="17" y="9" width="5" height="6" class="bluef"/>',
  zoomin: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20.5 20.5l-5.3-5.3M7.5 10.5h6M10.5 7.5v6"/>',
  zoomout: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20.5 20.5l-5.3-5.3M7.5 10.5h6"/>',
  fit: '<path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5"/><rect x="7" y="10" width="10" height="4" class="bluef"/>',
  today: '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/><rect x="10" y="13" width="4" height="4" class="f" style="fill:#f08a00"/>',
  crit: '<rect x="2.5" y="5" width="10" height="5" class="redf"/><rect x="9.5" y="14" width="12" height="5" class="redf"/><path d="M12.5 7.5h3v6.5" class="red"/>',
  expand: '<path d="M4 6h16M8 12h12M8 18h12"/><path d="M4 10.5l2 2 2-2" class="grn"/>',
  collapse: '<path d="M4 6h16M4 12h16M4 18h16" />',
  newfile: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6M9 14h6" class="grn"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" class="red"/>',
  import: '<path d="M12 3v12M7 10l5 5 5-5" class="grn"/><path d="M4 17v4h16v-4"/>',
  export: '<path d="M12 15V3M7 8l5-5 5 5" class="blue"/><path d="M4 17v4h16v-4"/>',
  table: '<rect x="3" y="4" width="18" height="16"/><path d="M3 9.5h18M3 14.5h18M9 4v16"/>',
  xml: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9.5 12l-2 2 2 2M14.5 12l2 2-2 2" class="blue"/>',
  autolink: '<rect x="2.5" y="4" width="7" height="4" class="bluef"/><rect x="14.5" y="16" width="7" height="4" class="bluef"/><path d="M9.5 6h3v12h2" class="blue"/><path d="M12.5 15.5l2 2.5-2 2.5" class="blue"/><path d="M18 3.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" class="f" style="fill:#f0a400"/>',
  assist: '<rect x="3" y="4" width="11" height="16" rx="1"/><path d="M6 8.5l1.2 1.2L9.5 7.5M6 13.5l1.2 1.2 2.3-2.2" class="grn"/><path d="M11 9h1M11 14h1"/><rect x="16" y="6" width="6" height="3" class="bluef"/><rect x="17.5" y="11" width="4.5" height="3" class="bluef"/><rect x="16" y="16" width="5" height="3" class="bluef"/>',
  popout: '<rect x="3" y="6" width="13" height="14" rx="1"/><path d="M10 3h11v11"/><path d="M21 3l-9 9" class="blue"/>',
  scissors: '<circle cx="6" cy="7" r="2.6"/><circle cx="6" cy="17" r="2.6"/><path d="M8.2 8.4L20 16M8.2 15.6L20 8"/><path d="M14 12h1M17 12h1" class="blue"/>',
  vsave: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3"/><rect x="8" y="13" width="8" height="6" class="bluef"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3 4v4h4" class="blue"/><path d="M12 7.5V12l3 2" class="grn"/>',
  tidy: '<path d="M4 6h7l4 6h5M4 18h7l4-6" class="blue"/><path d="M16 4l4 4M20 4l-4 4" class="red"/>',
  open: '<path d="M3 6h6l2 2h9v3"/><path d="M3 6v13h15l3-8H7l-4 8" class="blue"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  saveas: '<path d="M5 3h11l3 3v7"/><path d="M5 3v18h7"/><path d="M8 3v5h7V3"/><path d="M15 21l1-3 5-5 2 2-5 5z" class="grn"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6l8.5 7 8.5-7" class="blue"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.5-4-8.2-9-8.2z"/><circle cx="7.5" cy="11" r="1.4" class="f" style="fill:#42a5f5"/><circle cx="10" cy="7" r="1.4" class="f" style="fill:#ffca28"/><circle cx="14.5" cy="7" r="1.4" class="f" style="fill:#66bb6a"/><circle cx="17" cy="10.5" r="1.4" class="f" style="fill:#ef8f5f"/>',
  magic: '<path d="M4 20L16 8"/><path d="M14 6l2-2 4 4-2 2z" class="grn"/><path d="M6 4v3M4.5 5.5h3M19 14v3M17.5 15.5h3M10 2.5v2M9 3.5h2" class="blue"/>',
  close: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21H11"/><path d="M14 3v5h5V11"/><path d="M15 15l6 6M21 15l-6 6" class="red"/>',
  verlauf: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/>',
  settings: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-.5-.5-2.3z"/>',
  printer: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M7 14h10v7H7z" class="bluef"/><circle cx="17.5" cy="11" r=".6" class="f"/>',
};
document.querySelectorAll('.rb[data-ico]').forEach((b) => { b.insertAdjacentHTML('afterbegin', `<svg viewBox="0 0 24 24">${ICONS[b.dataset.ico] || ''}</svg>`); });

const ACTIONS = {
  undo: doUndo, redo: doRedo,
  insertTask: () => insertTask(), insertMilestone: () => insertTask('ms'), insertSummary, deleteSel: () => deleteSel(),
  indent: () => indent(1), outdent: () => indent(-1), moveUp: () => moveSel(-1), moveDown: () => moveSel(1),
  linkSel, unlinkSel,
  taskInfo: infoForSelection,
  scrollToTask,
  pct: (b) => setPct(+b.dataset.pct),
  projectInfo: projectDialog,
  toggleCrit: () => { showCrit = !showCrit; LS.set('crit', showCrit); render(); },
  zoomIn: () => setZoom(zoom + 1), zoomOut: () => setZoom(zoom - 1), fitProject,
  goToday: () => scrollToDay(todayN(), 0.3),
  expandAll: () => setCollapsedAll(false), collapseAll: () => setCollapsedAll(true),
  newProject: () => promptDialog('Neues Projekt', 'Projektname', 'Neues Projekt', async (name) => {
    await flushSave();
    const p = await api.create({ name, start: snapWork(todayN()), tasks: [] }); await refreshProjectList(); await openProject(p.id);
  }),
  renameProject: () => promptDialog('Version umbenennen', 'Name der Version (das Projekt steht oben in der Kopfleiste)', P.name, (name) => { act(() => { P.name = name; }); refreshProjectList(); }),
  deleteProject: () => archivDialog(),
  importJson: () => $('#fileInput').click(),
  exportJson: () => download(fileName('json'), JSON.stringify({ name: P.name, start: P.start, startDate: isoD(P.start), nextUid: P.nextUid, gwColors: P.gwColors || {}, tasks: P.tasks }, null, 2), 'application/json'),
  exportCsv,
  exportXml,
  printDialog,
  tradeAdd: () => promptDialog('Gewerk hinzufügen', 'Gewerk', '', (g) => { act(() => { P.trades = { ...(P.trades || {}) }; P.trades[g] = { ...(P.trades[g] || {}), extra: true }; }); gwColor(g); renderFirms(); }, tradeSuggestions()),
  tradeAssignAll: () => assignAllFirms(), tradeCsv: () => tradeCsv(), tradeMail: () => tradeMail(), tradePrint: () => tradePrint(),
  fileNew, fileOpen: () => fileOpen(), fileSave: () => fileSave(), fileSaveAs, fileExport,
  tidyLinks: () => tidyLinks(),
  saveVersion: () => saveVersionDialog(),
  versionHistory: () => versionHistory(),
  splitMode: () => setSplitMode(!splitMode),
  toggleAssist: () => setAssistOpen(!document.body.classList.contains('assist-open')),
  popoutAssist: () => popoutAssist(),
  toggleDelAsk: () => { const v = !LS.get('delAsk', true); LS.set('delAsk', v); updateRibbon(); toast(v ? 'Beim Löschen fragen: EIN – du wählst, ob die Dauer auf eine Hauptleistung umgelegt wird.' : 'Beim Löschen fragen: AUS – die Gesamtzeit verkürzt sich.'); },
  toggleAutoLink: () => { autoLink = !autoLink; LS.set('autolink', autoLink); updateRibbon(); toast(autoLink ? 'Automatisch verknüpfen: EIN – beim Einfügen und Löschen werden Verknüpfungen angepasst.' : 'Automatisch verknüpfen: AUS'); },
  gwDialog, gwAuto,
  settings: () => settingsDialog(),
  verlaufKatalog: () => { if (window.BPHead && BPHead.verlaufAlle) BPHead.verlaufAlle({ teil: 'gs', titel: 'Verlauf der Kataloge und Einstellungen' }); },
  fileClose: () => closeProject(),
  bpVerknuepfen: () => { if (window.bpLinkDialog) window.bpLinkDialog(); },
  projMenu: (b) => projMenu(b),
  libNew: () => libNew(), libFromProjects: () => libFromProjects(), libStd: () => libToggleStd(), libExport: () => libExport(), libImport: () => libImportFile(),
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  if (!P && !NOPROJ_OK.has(b.dataset.act)) { toast('Kein Bauzeitenplan geöffnet – oben im Kopf das Projekt wählen oder einen Plan anlegen.'); return; }
  const f = ACTIONS[b.dataset.act]; if (f) f(b);
});
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
// ohne geöffnetes Projekt erlaubte Befehle
const NOPROJ_OK = new Set(['fileNew', 'fileOpen', 'projMenu', 'settings', 'verlaufKatalog', 'toggleAssist', 'popoutAssist', 'libNew', 'libFromProjects', 'libStd', 'libExport', 'libImport']);
function setNoProject(on) {
  document.body.classList.toggle('no-project', on);
  if (on) { const v = document.getElementById('bph-vl'); if (v) v.style.display = 'none'; }
  document.querySelectorAll('.rb[data-act]').forEach((b) => b.classList.toggle('np-dis', on && !NOPROJ_OK.has(b.dataset.act)));
  $('#startView').hidden = !on || LS.get('tab', 'vorgang') === 'katalog';
  if (on) { $('#main').hidden = true; $('#firmView').hidden = true; }
}
async function closeProject() {
  if (!P) return;
  if (!(await leaveProjectOk())) return;
  await flushSave();
  const name = P.name;
  P = null; CAL = null; undoS = []; redoS = []; sel.clear(); dirty = false;
  LS.set('last', '__geschlossen__');
  $('#projTitle').textContent = 'Kein Projekt geöffnet'; $('#projSub').textContent = 'Klicken zum Öffnen oder Anlegen';
  setSave(' '); document.title = 'Gantt – Projektplanung';
  if ($('#projSelect')) $('#projSelect').value = '';
  setNoProject(true); renderStart(); if ($('#stInfo')) $('#stInfo').textContent = 'Kein Projekt geöffnet';
  if (window.AssistCore) AssistCore.notifySoon();
  if (!$('#libView').hidden && typeof renderLib === 'function') renderLib();
  toast(`„${name}“ geschlossen.`);
}
/* Projekt oben in der Kopfleiste hat (noch) keinen Bauzeitenplan: keinen fremden Plan zeigen, sondern anbieten, einen anzulegen */
async function keinPlanFuer() {
  if (P) { if (!(await leaveProjectOk())) return; await flushSave(); }
  P = null; CAL = null; undoS = []; redoS = []; sel.clear(); dirty = false;
  $('#projTitle').textContent = 'Kein Bauzeitenplan'; $('#projSub').textContent = 'für dieses Projekt';
  setSave(' '); if ($('#projSelect')) $('#projSelect').value = '';
  setNoProject(true); renderStart(); if ($('#stInfo')) $('#stInfo').textContent = '';
}
window.keinPlanFuer = keinPlanFuer;
async function renderStart() {
  const box = $('#startView'); if (!box || P) return;
  try { projects = await api.list(); } catch { /* Liste wie gehabt */ }
  const gp = window.BPHead && BPHead.projekt;
  if (gp && gp.id) {   // aktuelles Projekt der Plattform
    const eig = projects.filter((p) => p.bt_id === gp.id && !p.archived);
    if (eig.length) { await openProject(eig.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''))[0].id); refreshProjectList(); return; }
    box.innerHTML = `<div class="sv"><div class="sv-h"><h2>Für ${esc(gp.name)} gibt es noch keinen Bauzeitenplan</h2>
      <p>Neu anlegen – leer, mit dem Planungsassistenten oder aus dem Ablauf eines früheren Projekts. Er gehört gleich zu diesem Projekt; die erste Version heißt „Startversion“.</p>
      <div class="sv-b"><button class="btn primary" data-act="fileNew">Bauzeitenplan anlegen …</button></div></div>
      ${eig.length ? `<div class="sv-list">${eig.map((p) => `<button class="sv-p" data-open="${p.id}"><b>${esc(p.name)}</b><small>${p.n || 0} Leistungen${p.start != null ? ' · Beginn ' + fmtD(p.start) : ''}</small></button>`).join('')}</div>` : ''}</div>`;
    return;
  }
  const rec = projects.slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).slice(0, 12);
  const when = (u) => { if (!u) return ''; const d = new Date(u); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  box.innerHTML = `<div class="sv"><div class="sv-h"><h2>Kein Projekt geöffnet</h2><p>Projekt aus der Liste wählen, ein neues anlegen oder mit dem Planungsassistenten starten.</p>
    <div class="sv-b"><button class="btn primary" data-act="fileNew">Neues Projekt …</button><button class="btn" data-act="fileOpen">Öffnen …</button><button class="btn" data-act="toggleAssist">Planungsassistent</button></div></div>
    <h3>Zuletzt bearbeitet</h3><div class="sv-list">${rec.map((p) => `<button class="sv-p" data-open="${p.id}"><b>${esc(p.name)}</b><small>${p.n || 0} Leistungen${p.start != null ? ' · Beginn ' + fmtD(p.start) : ''}</small><small>geändert ${when(p.updated)}</small></button>`).join('') || '<div class="hint">Noch keine Projekte.</div>'}</div></div>`;
}
$('#startView').addEventListener('click', async (e) => { const b = e.target.closest('[data-open]'); if (!b) return; await openProject(b.dataset.open); refreshProjectList(); });
function projMenu(btn) {
  const r = btn.getBoundingClientRect();
  const gp = window.BPHead && BPHead.projekt;   // nur die Pläne des Projekts oben; alle anderen über „Öffnen …“
  const rec = projects.slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || '')).filter((p) => (!P || p.id !== P.id) && !p.archived && (!gp || !gp.id || p.bt_id === gp.id)).slice(0, 8);
  const items = [
    ...(P ? [{ label: '✔ ' + P.name, dis: true }, '-'] : []),
    ...rec.map((p) => ({ label: p.name, fn: async () => { await openProject(p.id); refreshProjectList(); } })),
    ...(rec.length ? ['-'] : []),
    { label: 'Anderen Plan öffnen …', key: 'Strg+O', fn: () => fileOpen() },
    { label: 'Neuer Bauzeitenplan …', fn: () => fileNew() },
    '-',
    { label: 'Projekt schließen', key: 'Strg+W', dis: !P, fn: () => closeProject() },
  ];
  ctxMenu(r.left, r.bottom + 4, items);
}
function showTab(name) {
  if (!document.querySelector(`.tab[data-tab="${name}"]`)) name = 'vorgang';   // Reiter „Datei“ gibt es nicht mehr (Versionsleiste)
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.grp').forEach((g) => g.classList.toggle('show', g.dataset.tab === name));
  LS.set('tab', name);
  const fv = name === 'firmen', lv = name === 'katalog';
  $('#main').hidden = fv || lv || !P; $('#firmView').hidden = !fv || !P; $('#libView').hidden = !lv;
  $('#startView').hidden = !!P || lv;
  if (fv && typeof renderFirms === 'function') renderFirms(); else if (lv && typeof renderLib === 'function') renderLib(); else if (P) render();
  if (P && CAL && (fv || lv)) { renderStatus(); updateProjSub(); }   // Projektkarte und Statusleiste auch in diesen Reitern aktuell halten
}
$('#zoomRange').addEventListener('input', (e) => setZoom(+e.target.value));
{ const sm = $('#sumModeSel'); if (sm) { sm.value = sumMode; sm.addEventListener('change', () => { sumMode = sm.value; LS.set('sumMode2', sumMode); render(); }); } }
{ const lm = $('#linkModeSel'); if (lm) { lm.value = linkMode; lm.addEventListener('change', () => { linkMode = lm.value; LS.set('linkMode', linkMode); render(); }); } }
document.querySelectorAll('select[data-lbl]').forEach((sl) => {
  sl.innerHTML = LABEL_FIELDS.map(([v, l]) => `<option value="${v}"${barLbl[sl.dataset.lbl] === v ? ' selected' : ''}>${l}</option>`).join('');
  sl.addEventListener('change', () => { barLbl[sl.dataset.lbl] = sl.value; LS.set('barLbl', barLbl); render(); });
});
$('#projStart').addEventListener('change', (e) => { const d = parseDate(e.target.value); if (d != null) act(() => { P.start = snapWork(d); }); });
$('#projSelect').addEventListener('change', async (e) => { await openProject(e.target.value); refreshProjectList(); });
{ const ac = $('#autoSaveChk'); ac.checked = autoSave; ac.addEventListener('change', async () => { autoSave = ac.checked; LS.set('autosave', autoSave); if (autoSave && dirty) await saveNow(); else markDirty(); toast(autoSave ? 'Automatisch speichern: an – jede Änderung wird sofort gesichert.' : 'Automatisch speichern: aus – mit Strg+S oder „Speichern“ sichern.'); }); }
$('#fileInput').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.tasks)) throw new Error('Keine Leistungen gefunden');
    if (data.startDate && !Number.isInteger(data.start)) data.start = parseDate(data.startDate);
    data.name = data.name || f.name.replace(/\.(gantt|json)$/i, '');
    if (!(await leaveProjectOk())) return;
    const p = await api.create(data); await openProject(p.id); await refreshProjectList();
    toast(`Projekt „${p.name}“ importiert.`);
  } catch (err) { toast('Import fehlgeschlagen: ' + err.message, true); }
});

/* ---------- Dateihandling: Neu, Öffnen, Speichern, Speichern unter, Speichern als ---------- */
const GANTT_TYPES = [{ description: 'Gantt-Projekt', accept: { 'application/json': ['.gantt', '.json'] } }];
const projectFileData = () => ({ format: 'gantt-projekt', version: 1, name: P.name, start: P.start, startDate: isoD(P.start), nextUid: P.nextUid, cal: P.cal || null, assist: P.assist || null, gwColors: P.gwColors || {}, tasks: P.tasks });
async function writeFileHandle(h) { const w = await h.createWritable(); await w.write(JSON.stringify(projectFileData(), null, 1)); await w.close(); }
function readProjectFile(text, fname) {
  const data = JSON.parse(text);
  if (!Array.isArray(data.tasks)) throw new Error('Keine Leistungen gefunden – ist das eine Gantt-Projektdatei?');
  if (data.startDate && !Number.isInteger(data.start)) data.start = parseDate(data.startDate);
  data.name = data.name || fname.replace(/\.(gantt|json)$/i, '');
  return data;
}
async function fileSave() {
  if (!P) return;
  clearTimeout(saveTimer); await saveNow();
  toast(fileHandles[P.id] ? `Gespeichert – auf dem Server und in „${fileHandles[P.id].name}“.` : 'Gespeichert.');
}
function fileNew() {
  modal('Neu', `<div class="nw-opts">
      <button class="nw-opt" data-nw="empty"><b>Leeres Projekt</b><small>Leistungen selbst eintragen</small></button>
      <button class="nw-opt" data-nw="assist"><b>Mit Planungsassistent</b><small>Gebäudetyp wählen, Leistungen vorschlagen lassen</small></button>
      <button class="nw-opt" data-nw="kopie"><b>Aus anderem Bauzeitenplan</b><small>Ablauf eines früheren Projekts übernehmen, auf den neuen Anfang verschoben</small></button>
    </div><div class="form" style="margin-top:10px"><label>Projektname</label><input id="nwName" class="full" value="" placeholder="Projektnummer oder Name – Vorschläge aus Bautagebuch und Server" data-bp-projekt autocomplete="off"><label>Projektanfang</label><input id="nwStart" type="date" class="full" value="${isoD(startOf('week', todayN() + 7))}"></div>`, [{ label: 'Abbrechen' }]);
  const bg = [...document.querySelectorAll('.modal-bg')].pop();
  // Projekt, aus dem man gekommen ist (gemeinsames Projekt der Apps): hat es noch keinen Plan, dessen Namen vorschlagen und verknüpfen
  const gp = window.BPHead && BPHead.projekt;
  const gnr = gp && gp.id ? (gp.name.match(/^[A-Za-z]\d{3}(?:\.\d+)?/) || [''])[0].toLowerCase() : '';
  if (gp && gp.id && !projects.some((p) => p.bt_id === gp.id || (gnr && !p.bt_id && p.name.toLowerCase().startsWith(gnr)))) {   // Projekt steht oben: erste Version, ohne Namensabfrage
    const nw = bg.querySelector('#nwName'); nw.value = 'Startversion'; nw.dataset.btId = gp.id;
    const lb = nw.previousElementSibling; if (lb && lb.tagName === 'LABEL') lb.hidden = true; nw.hidden = true; }
  bg.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-nw]'); if (!b) return;
    const nw = bg.querySelector('#nwName'), name = nw.value.trim() || 'Neues Projekt', st = parseDate(bg.querySelector('#nwStart').value) ?? todayN();
    const btId = nw.dataset.btId ? +nw.dataset.btId : null;   // Vorschlag „Projekt im Bautagebuch“ gewählt → gleich verknüpfen
    bg.remove();
    if (b.dataset.nw === 'kopie' && window.planAusAnderem) { window.planAusAnderem(nw.value.trim(), st, btId); return; }
    if (!(await leaveProjectOk())) return;
    const p = await api.create({ name, start: snapWork(st), tasks: [], cal: P ? P.cal : null });
    if (btId) await fetch(`api/projects/${p.id}/link`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: btId }) }).catch(() => {});
    await openProject(p.id); await refreshProjectList();
    if (btId) toast('Mit dem Bautagebuch-Projekt verknüpft.');
    if (b.dataset.nw === 'assist') { setAssistOpen(true); toast('Wähle rechts im Planungsassistenten die Maßnahme – „In … erzeugen“ füllt das neue Projekt.'); }
  });
}
/* Archivieren statt Löschen (wie in den Baukosten): archivierte Pläne bleiben erhalten, stehen in den Listen unten */
function archivDialog() {
  if (!P) return;
  const arch = !!P.archived;
  modal(arch ? 'Archiviertes Projekt' : 'Archivieren oder löschen', `<div style="max-width:460px;line-height:1.5">
    <p><b>${arch ? 'Zurückholen' : 'Archivieren'}</b> ${arch ? 'stellt „' + esc(P.name) + '“ wieder zu den laufenden Plänen.' : 'nimmt „' + esc(P.name) + '“ aus den laufenden Plänen – er bleibt mit allen Versionen erhalten und lässt sich jederzeit zurückholen (Öffnen → unten „Archiv“).'}</p>
    <p><b>In den Papierkorb</b> nimmt diese Version mit ihrem Verlauf heraus. Aus dem Papierkorb (Startseite) lässt sie sich wiederherstellen, bis er geleert wird.</p></div>`, [
    { label: '🗑 In den Papierkorb', cls: 'danger', left: true, fn: () => { reallyDelete(); } },
    { label: 'Abbrechen' },
    { label: arch ? 'Zurückholen' : 'Archivieren', cls: 'primary', primary: true, fn: async () => {
      act(() => { P.archived = !arch; }); await saveNow(); await refreshProjectList();
      toast(arch ? `„${P.name}“ ist wieder ein laufender Plan.` : `„${P.name}“ archiviert – unter Öffnen → „Archiv“ jederzeit erreichbar.`);
    } }]);
}
function reallyDelete() {
  (async () => {
    await flushSave(); clearTimeout(saveTimer); saveTimer = null; const name = P.name;
    const bt = P._bt && P._bt.id;
    await api.del(P.id); projects = await api.list(); P = null;
    const next = bt ? projects.find((p) => !p.archived && p.bt_id === bt) || projects.find((p) => p.bt_id === bt) : projects.find((p) => !p.archived);   // nächste Version desselben Projekts
    if (next) await openProject(next.id); else { await keinPlanFuer(); }
    refreshProjectList(); toast(`„${name}“ liegt im Papierkorb – wiederherstellen unter Startseite → Papierkorb.`);
  })().catch((e) => toast(e.message, true));
}
async function fileOpen() {
  let list = await api.list();
  const fmtTs = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const bg = modal('Öffnen', `<div class="op-top"><input id="opQ" placeholder="Suchen …"><button class="btn" id="opFile">Vom Computer öffnen …</button></div><div id="opList" class="op-list"></div>
    <div class="hint">Doppelklick öffnet. Dateien vom Computer (.gantt / .json) werden als Projekt übernommen und mit der Datei verknüpft: „Speichern“ schreibt dann auch in diese Datei (in Chrome/Edge).</div>`, [{ label: 'Schließen' }]);
  bg.querySelector('.modal').style.width = '760px';
  const draw = () => {
    const qv = bg.querySelector('#opQ').value.trim().toLowerCase();
    const rows = list.filter((p) => !qv || (p.name || '').toLowerCase().includes(qv)).sort((a, b) => (!!a.archived - !!b.archived) || (b.updated || '').localeCompare(a.updated || ''));
    let archH = false;
    bg.querySelector('#opList').innerHTML = rows.map((p) => `${p.archived && !archH && (archH = true) ? '<div class="op-arch">Archiv</div>' : ''}<div class="op-row${P && p.id === P.id ? ' cur' : ''}${p.archived ? ' arch' : ''}" data-op="${p.id}"><div class="op-n"><b>${esc(p.name)}</b><small>${p.n ?? '?'} Leistungen · Anfang ${p.start != null ? fmtD(p.start) : '–'}${p.assist ? ' · mit Assistent' : ''}${P && p.id === P.id ? ' · <i>geöffnet</i>' : ''}</small></div>
      <span class="op-d">geändert ${fmtTs(p.updated)}</span><button class="btn sm primary" data-opo="${p.id}">Öffnen</button><button class="btn sm" data-opc="${p.id}" title="Kopie anlegen">Duplizieren</button><button class="btn sm" data-opa="${p.id}" title="${p.archived ? 'Wieder zu den laufenden Plänen' : 'Archivieren – bleibt erhalten, steht unten im Archiv'}">${p.archived ? 'Zurückholen' : 'Archivieren'}</button><button class="btn sm" data-opd="${p.id}" title="Löschen">✕</button></div>`).join('') || '<div class="hint">Keine Projekte gefunden.</div>';
  };
  bg.querySelector('#opQ').addEventListener('input', draw);
  const openId = async (id) => { bg.remove(); if (await openProject(id) !== false) refreshProjectList(); };
  bg.addEventListener('dblclick', (e) => { const r = e.target.closest('[data-op]'); if (r) openId(r.dataset.op); });
  bg.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.id === 'opFile') { bg.remove(); openFromComputer(); return; }
    if (t.dataset.opo) { openId(t.dataset.opo); return; }
    if (t.dataset.opc) { const src = t.dataset.opc === P.id ? projectFileData() : await api.get(t.dataset.opc); const c = await api.create({ ...src, name: src.name + ' (Kopie)' }); list = await api.list(); draw(); toast(`Kopie „${c.name}“ angelegt.`); refreshProjectList(); return; }
    if (t.dataset.opa) {
      const id = t.dataset.opa, x = list.find((p) => p.id === id);
      if (P && id === P.id) { act(() => { P.archived = !P.archived; }); await saveNow(); }
      else await fetch('api/projects/' + encodeURIComponent(id) + '/archiv', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archiviert: !x.archived }) }).then(j);
      list = await api.list(); draw(); refreshProjectList(); return;
    }
    if (t.dataset.opd) {
      if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Löschen?'; t.classList.add('danger'); setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = '✕'; t.classList.remove('danger'); } }, 3000); return; }
      const id = t.dataset.opd;
      if (P && id === P.id) { toast('Das geöffnete Projekt bitte über „Projekt löschen“ löschen.', true); return; }
      await api.del(id); list = await api.list(); draw(); refreshProjectList();
    }
  });
  draw(); setTimeout(() => bg.querySelector('#opQ').focus(), 0);
}
async function openFromComputer() {
  if (!window.showOpenFilePicker) { $('#fileInput').click(); return; }
  let h; try { [h] = await window.showOpenFilePicker({ types: GANTT_TYPES, multiple: false }); } catch { return; }
  try {
    const f = await h.getFile(), data = readProjectFile(await f.text(), f.name);
    if (!(await leaveProjectOk())) return;
    const p = await api.create(data); fileHandles[p.id] = h;
    await openProject(p.id); await refreshProjectList(); markDirty();
    toast(`„${f.name}“ geöffnet und verknüpft – „Speichern“ schreibt auch in diese Datei.`);
  } catch (err) { toast('Öffnen fehlgeschlagen: ' + err.message, true); }
}
function fileSaveAs() {   // „Speichern unter“ = wie eine Datei abspeichern: Formate oder Kopie unter neuem Namen
  if (!P) return;
  const canPick = !!window.showSaveFilePicker;
  const bg = modal('Speichern unter', `<div class="ex-opts">
      <button class="nw-opt" data-ex="gantt"><b>Gantt-Projektdatei (.gantt)</b><small>${canPick ? 'Speicherort frei wählbar; der Plan bleibt mit der Datei verknüpft – Änderungen werden auch dorthin geschrieben.' : 'Vollständig – zum Sichern, Weitergeben und wieder Öffnen (als Download)'}</small></button>
      <button class="nw-opt" data-ex="csv"><b>Excel / CSV (.csv)</b><small>Tabelle aller Leistungen mit Terminen, Gewerk, Unternehmer</small></button>
      <button class="nw-opt" data-ex="xml"><b>MS Project (.xml)</b><small>Zum Öffnen in Microsoft Project und kompatiblen Programmen</small></button>
      <button class="nw-opt" data-ex="pdf"><b>PDF</b><small>Bauzeitenplan mit Format- und Seitenwahl (wie Drucken)</small></button>
      <button class="nw-opt" data-ex="kopie"><b>Kopie unter neuem Namen</b><small>Neuer Bauzeitenplan auf dem Server – danach arbeitest du in der Kopie weiter, das Original bleibt erhalten.</small></button>
    </div>`, [{ label: 'Abbrechen' }]);
  bg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ex]'); if (!b) return; bg.remove();
    const k = b.dataset.ex;
    if (k === 'csv') return exportCsv();
    if (k === 'xml') return exportXml();
    if (k === 'pdf') return printDialog();
    if (k === 'kopie') {
      modal('Kopie unter neuem Namen', `<div class="form"><label>Name</label><input id="saName" class="full" value="${esc(P.name)} (Kopie)"></div>`, [{ label: 'Speichern', cls: 'primary', primary: true, fn: (bg2) => {
        const name = bg2.querySelector('#saName').value.trim(); if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
        (async () => {
          const p = await api.create({ ...projectFileData(), name });
          dirty = false; clearTimeout(saveTimer); saveTimer = null;
          await openProject(p.id); await refreshProjectList(); toast(`Gespeichert unter „${name}“ – du arbeitest jetzt in der Kopie.`);
        })().catch((er) => toast('Speichern fehlgeschlagen: ' + er.message, true));
      } }, { label: 'Abbrechen' }]);
      return;
    }
    (async () => {   // .gantt
      if (canPick) {
        let h; try { h = await window.showSaveFilePicker({ suggestedName: fileName('gantt'), types: GANTT_TYPES }); } catch { return; }
        await flushSave(); await writeFileHandle(h); fileHandles[P.id] = h; markDirty();
        toast(`Gespeichert in „${h.name}“ – Änderungen werden auch in diese Datei geschrieben.`);
      } else download(fileName('gantt'), JSON.stringify(projectFileData(), null, 1), 'application/json');
    })().catch((er) => toast('Speichern fehlgeschlagen: ' + er.message, true));
  });
}
function fileExport() {
  const bg = modal('Exportieren', `<div class="ex-opts">
      <button class="nw-opt" data-ex="gantt"><b>Gantt-Projektdatei (.gantt)</b><small>Vollständig – zum Sichern, Weitergeben und wieder Öffnen</small></button>
      <button class="nw-opt" data-ex="csv"><b>Excel / CSV (.csv)</b><small>Tabelle aller Leistungen mit Terminen, Gewerk, Unternehmer</small></button>
      <button class="nw-opt" data-ex="xml"><b>MS Project (.xml)</b><small>Zum Öffnen in Microsoft Project und kompatiblen Programmen</small></button>
      <button class="nw-opt" data-ex="pdf"><b>PDF / Drucken</b><small>Bauzeitenplan mit Format- und Seitenwahl</small></button>
    </div>`, [{ label: 'Abbrechen' }]);
  bg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ex]'); if (!b) return; bg.remove();
    const k = b.dataset.ex;
    if (k === 'gantt') download(fileName('gantt'), JSON.stringify(projectFileData(), null, 1), 'application/json');
    else if (k === 'csv') exportCsv(); else if (k === 'xml') exportXml(); else printDialog();
  });
}

/* ---------- Export ---------- */
const fileName = (ext) => (P.name || 'Projekt').replace(/[^\wäöüÄÖÜß.-]+/g, '_') + '.' + ext;
function download(name, content, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportCsv() {
  const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
  const rows = [['Nr.', 'Gliederungsebene', 'Leistung', 'Dauer (Tage)', 'Anfang', 'Ende', 'Vorgänger', 'Gewerk', 'Unternehmer', '% Abgeschlossen', 'Leistungsgruppe', 'Meilenstein', 'Kritisch', 'Notizen']];
  P.tasks.forEach((t, i) => rows.push([i + 1, t.lvl + 1, t.name, CAL.dur[i], fmtD(CAL.sd[i]).slice(3), fmtD(CAL.fd[i]).slice(3), predText(t), t.gw || '', t.res || '', Math.round(CAL.pct[i]), CAL.summ[i] ? 'Ja' : 'Nein', !CAL.summ[i] && t.dur === 0 ? 'Ja' : 'Nein', CAL.crit[i] ? 'Ja' : 'Nein', t.notes || '']));
  download(fileName('csv'), '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}
// Microsoft-Project-XML (MSPDI), lässt sich in gängiger Projektsoftware öffnen
function exportXml() {
  const x = (s) => esc(s);
  const dt = (n, end) => isoD(n) + (end ? 'T17:00:00' : 'T08:00:00');
  const durS = (d) => `PT${d * 8}H0M0S`;
  const resNames = [...new Set(P.tasks.flatMap((t) => (t.res || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)))];
  const typeCode = { FF: 0, FS: 1, SF: 2, SS: 3 };
  let tasks = `<Task><UID>0</UID><ID>0</ID><Name>${x(P.name)}</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary><Start>${dt(P.start)}</Start><Finish>${dt(CAL.peDay, true)}</Finish></Task>`;
  P.tasks.forEach((t, i) => {
    const ms = !CAL.summ[i] && t.dur === 0;
    tasks += `<Task><UID>${t.uid}</UID><ID>${i + 1}</ID><Name>${x(t.name)}</Name><Manual>0</Manual><OutlineLevel>${t.lvl + 1}</OutlineLevel>`
      + `<Start>${dt(CAL.sd[i], ms && CAL.msEnd[i])}</Start><Finish>${dt(CAL.fd[i], !ms || CAL.msEnd[i])}</Finish><Duration>${durS(CAL.dur[i])}</Duration><DurationFormat>7</DurationFormat>`
      + `<Milestone>${ms ? 1 : 0}</Milestone><Summary>${CAL.summ[i] ? 1 : 0}</Summary><Critical>${CAL.crit[i] ? 1 : 0}</Critical><PercentComplete>${Math.round(CAL.pct[i])}</PercentComplete>`
      + (t.cons != null ? `<ConstraintType>4</ConstraintType><ConstraintDate>${dt(t.cons)}</ConstraintDate>` : '<ConstraintType>0</ConstraintType>')
      + (t.notes ? `<Notes>${x(t.notes)}</Notes>` : '')
      + t.preds.map((p) => `<PredecessorLink><PredecessorUID>${p.uid}</PredecessorUID><Type>${typeCode[p.type]}</Type><LinkLag>${p.lag * 4800}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`).join('')
      + '</Task>';
  });
  const resources = resNames.map((r, k) => `<Resource><UID>${k + 1}</UID><ID>${k + 1}</ID><Name>${x(r)}</Name><Type>1</Type></Resource>`).join('');
  let auid = 1, assigns = '';
  P.tasks.forEach((t) => (t.res || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean).forEach((r) => { assigns += `<Assignment><UID>${auid++}</UID><TaskUID>${t.uid}</TaskUID><ResourceUID>${resNames.indexOf(r) + 1}</ResourceUID><Units>1</Units></Assignment>`; }));
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Project xmlns="http://schemas.microsoft.com/project"><Name>${x(P.name)}</Name><Title>${x(P.name)}</Title><ScheduleFromStart>1</ScheduleFromStart><StartDate>${dt(P.start)}</StartDate><FinishDate>${dt(CAL.peDay, true)}</FinishDate><MinutesPerDay>480</MinutesPerDay><MinutesPerWeek>2400</MinutesPerWeek><DaysPerMonth>20</DaysPerMonth><DefaultStartTime>08:00:00</DefaultStartTime><DefaultFinishTime>17:00:00</DefaultFinishTime><NewTasksAreManual>0</NewTasksAreManual><Tasks>${tasks}</Tasks><Resources>${resources}</Resources><Assignments>${assigns}</Assignments></Project>`;
  download(fileName('xml'), xml, 'application/xml');
}

/* =====================================================================
   Server / Speichern
   ===================================================================== */
const j = async (r) => {
  if (!r.ok) { const d = await r.json().catch(() => ({})); const e = new Error(d.error || r.statusText); e.status = r.status; e.data = d; throw e; }
  return r.json();
};
const api = {
  list: () => fetch('api/projects').then(j),
  get: (id) => fetch('api/projects/' + id).then(j),
  create: (p) => fetch('api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(j),
  save: (p, keepalive = false) => fetch('api/projects/' + p.id, { method: 'PUT', keepalive, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...p, sched: P && p.id === P.id ? schedOut() : undefined }) }).then(j),
  del: (id) => fetch('api/projects/' + id, { method: 'DELETE' }).then(j),
  versions: (id) => fetch(`api/projects/${id}/versions`).then(j),
  version: (id, v) => fetch(`api/projects/${id}/versions/${v}`).then(j),
  addVersion: (id, b) => fetch(`api/projects/${id}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j),
  patchVersion: (id, v, b) => fetch(`api/projects/${id}/versions/${v}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(j),
  delVersion: (id, v) => fetch(`api/projects/${id}/versions/${v}`, { method: 'DELETE' }).then(j),
};
/* berechnete Termine mitspeichern – die Baukosten-App verteilt damit die Kosten über die Bauzeit (Mittelabfluss) */
function schedOut() {
  try { return P.tasks.map((t, i) => ({ uid: t.uid, s: isoD(CAL.sd[i]), f: isoD(CAL.fd[i]), g: CAL.summ[i] ? 1 : 0 })); } catch { return null; }
}
const setSave = (s) => { const el = $('#saveState'); if (el) el.textContent = /^Gespeichert/.test(s) ? '✓ ' + s.replace(/^Gespeichert/, 'gespeichert') : s; };
function queueSave() {
  dirty = true; markDirty();
  clearTimeout(saveTimer); saveTimer = null;
  if (autoSave) { setSave('Nicht gespeicherte Änderungen …'); saveTimer = setTimeout(saveNow, 600); }
  else setSave('● Nicht gespeichert – Strg+S');
}
function markDirty() {
  if (!P) return;
  const fh = fileHandles[P.id];
  $('#projTitle').textContent = (dirty && !autoSave ? '● ' : '') + P.name + (fh ? '  ·  ' + fh.name : '');
  $('#projCard').title = P.name + (fh ? '\nDatei: ' + fh.name : '') + '\nKlicken: Projekt wechseln, öffnen, neu anlegen oder schließen';
  document.title = (dirty && !autoSave ? '● ' : '') + P.name + ' – Gantt';
}
const lastAutoV = {};
let conflictOpen = false;
async function saveNow(force = false) {
  saveTimer = null; if (!P || conflictOpen) return;
  try {
    const r = await api.save(force ? { ...P, _force: true } : P);
    if (P && r.id === P.id) { P._rev = r._rev; P._by = r._by; P.updated = r.updated; }
    dirty = false; const d = new Date(); setSave(`Gespeichert ${pad(d.getHours())}:${pad(d.getMinutes())}`); markDirty();
    if (fileHandles[P.id]) { try { await writeFileHandle(fileHandles[P.id]); setSave(`Gespeichert ${pad(d.getHours())}:${pad(d.getMinutes())} · auch in ${fileHandles[P.id].name}`); } catch (e) { toast('In die Datei konnte nicht geschrieben werden: ' + e.message, true); } }
    // automatischer Zwischenstand höchstens alle 15 Minuten
    if (Date.now() - (lastAutoV[P.id] || 0) > 15 * 60000) { lastAutoV[P.id] = Date.now(); api.addVersion(P.id, { auto: true, end: CAL.peDay }).catch(() => {}); }
  }
  catch (e) {
    if (e.status === 409) return saveConflict(e.data || {});
    setSave('Speichern fehlgeschlagen'); toast('Speichern fehlgeschlagen: ' + e.message, true);
  }
}
/* Mehrbenutzer: Jemand anderes hat den Plan gespeichert, während hier noch Änderungen offen waren */
function saveConflict(d) {
  if (conflictOpen || !P) return; conflictOpen = true;
  setSave('Nicht gespeichert – Plan wurde geändert');
  const when = d.updated ? new Date(d.updated).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  const done = () => { conflictOpen = false; };
  modal('Plan wurde inzwischen geändert', `<div style="max-width:470px;line-height:1.5"><b>${esc(d.by || 'Jemand anderes')}</b> hat „${esc(P.name)}“${when ? ' um ' + when : ''} gespeichert, während du hier Änderungen gemacht hast.<br><br>
      <b>Neu laden</b> übernimmt den gespeicherten Stand – deine letzten Änderungen gehen verloren.<br>
      <b>Meine Fassung speichern</b> überschreibt den anderen Stand (er bleibt in der Versionshistorie).<br>
      <b>Als Kopie speichern</b> legt deine Fassung als eigenes Projekt an.</div>`, [
    { label: 'Als Kopie speichern', left: true, fn: () => { done(); (async () => { const c = await api.create({ ...projectFileData(), trades: P.trades || {}, name: P.name + ' (meine Fassung)' }); dirty = false; await openProject(c.id); await refreshProjectList(); toast(`Deine Fassung ist als „${c.name}“ gespeichert.`); })().catch((e) => toast(e.message, true)); } },
    { label: 'Meine Fassung speichern', fn: () => { done(); (async () => { await api.addVersion(P.id, { name: `Stand von ${d.by || 'anderem Benutzer'} vor dem Überschreiben`, auto: false }).catch(() => {}); await saveNow(true); })(); } },
    { label: 'Neu laden', cls: 'primary', primary: true, fn: () => { done(); reloadProject(); } },
  ]);
  const bgs = document.querySelectorAll('.modal-bg'); const last = bgs[bgs.length - 1];
  last.querySelector('.mx').addEventListener('click', done);
}
/* Gespeicherten Stand neu laden, Ansicht (Bildlauf, Zeitachse, Reiter) bleibt */
async function reloadProject(note) {
  if (!P) return;
  const id = P.id, top = gridPane.scrollTop, vs = view.start;
  clearTimeout(saveTimer); saveTimer = null;
  const p = await api.get(id); if (!P || P.id !== id) return;
  p.gwColors ||= {}; p.trades ||= {}; p.tasks = (p.tasks || []).map(fillTask);
  P = p; dirty = false; undoS = []; redoS = [];
  normalize(); allGw().forEach(gwColor); CAL = schedule(); render();
  view.start = vs; gridPane.scrollTop = top; render(); markDirty();
  setSave('Gespeichert');
  if (note) toast(note);
}
async function flushSave() { if (saveTimer) { clearTimeout(saveTimer); await saveNow(); } }
addEventListener('beforeunload', (e) => { if (saveTimer && P) { api.save(P, true); } else if (dirty && !autoSave && P) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- Versionsleiste: je Projekt EIN Bauzeitenplan, darin Versionen (Startversion, 1. Überarbeitung …) = Pläne desselben Projekts ---------- */
let vlKnoepfe = null;
function vleiste() {
  if (!window.BPHead || !BPHead.versionsleiste) return;
  if (!vlKnoepfe) {
    const mk = (act, txt, tip) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'bph-vl-b'; b.dataset.act = act; b.textContent = txt; b.title = tip; return b; };
    vlKnoepfe = [mk('printDialog', '🖨 Drucken / PDF …', 'Bauzeitenplan drucken oder als PDF (Strg+P)'), mk('fileExport', '⤓ Exportieren …', 'Als Datei speichern: Excel/CSV, MS Project, Gantt-Datei')];
  }
  const bt = P && P._bt ? P._bt.id : null;
  const L = !P ? [] : (bt ? projects.filter((p) => p.bt_id === bt) : projects.filter((p) => p.id === P.id)).slice().sort((a, b) => (a.created || '').localeCompare(b.created || '') || a.id.localeCompare(b.id));
  const when = (u) => { if (!u) return ''; const d = new Date(u); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`; };
  const el = BPHead.versionsleiste({ vor: $('#tabs'), aktuell: P && P.id, rechts: vlKnoepfe,
    liste: L.map((p) => ({ id: p.id, name: p.id === (P && P.id) ? P.name : p.name, datum: when(p.updated), wer: p.by || '', archiviert: p.archived })),
    onWahl: async (id) => { await flushSave(); if (await openProject(String(id)) !== false) refreshProjectList(); },
    onNeu: neueVersion, extra: [{ text: '⎘ Aus anderem Plan übernehmen …', fn: () => ACTIONS.planUebernehmen() }], onUmbenennen: () => ACTIONS.renameProject(), onVerlauf: () => versionHistory(), onVerwalten: () => archivDialog() });
  el.style.display = P ? '' : 'none';
}
window.ganttVleiste = vleiste;
function neueVersion() {
  if (!P) return;
  modal('Neue Version', `<div class="form" style="max-width:460px"><div class="hint" style="margin:0 0 8px">Kopie von „${esc(P.name)}“ mit allen Leistungen, Verknüpfungen, Firmen und Kalender. Danach arbeitest du in der neuen Version weiter, die alte bleibt, wie sie ist.</div>
    <label>Name der Version</label><input id="nvName" class="full" placeholder="z. B. 1. Überarbeitung, nach den Sommerferien"></div>`, [{ label: 'Anlegen', cls: 'primary', primary: true, fn: (bg) => {
    const name = bg.querySelector('#nvName').value.trim(); if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
    (async () => {
      await flushSave();
      const src = JSON.parse(JSON.stringify(P)); delete src._rev; delete src._by; delete src._bt;
      const p = await api.create({ ...src, name, archived: false, _link: P._bt ? P._bt.id : null });
      await openProject(p.id); await refreshProjectList(); toast(`Version „${name}“ angelegt – du arbeitest jetzt darin.`);
    })().catch((er) => toast('Anlegen fehlgeschlagen: ' + er.message, true));
  } }, { label: 'Abbrechen' }]);
  setTimeout(() => { const i = document.querySelector('#nvName'); if (i) i.focus(); }, 30);
}
async function refreshProjectList() {
  projects = await api.list();
  const opt = (p) => `<option value="${p.id}"${P && p.id === P.id ? ' selected' : ''}>${esc(p.id === P?.id ? P.name : p.name)}</option>`;
  const lauf = projects.filter((p) => !p.archived), arch = projects.filter((p) => p.archived);
  $('#projSelect').innerHTML = lauf.map(opt).join('') + (arch.length ? `<optgroup label="Archiv">${arch.map(opt).join('')}</optgroup>` : '');
  vleiste();
}
function askUnsaved() {
  return new Promise((resolve) => {
    modal('Nicht gespeicherte Änderungen', `<div style="max-width:440px;line-height:1.5">Sollen die Änderungen an „<b>${esc(P.name)}</b>“ gespeichert werden?</div>`, [
      { label: 'Abbrechen', left: true, fn: () => resolve('cancel') },
      { label: 'Speichern', cls: 'primary', primary: true, fn: () => resolve('save') },
      { label: 'Nicht speichern', fn: () => resolve('discard') }]);
    const bg = document.querySelectorAll('.modal-bg'); const last = bg[bg.length - 1];
    last.querySelector('.mx').addEventListener('click', () => resolve('cancel'));
    const iv = setInterval(() => { if (!last.isConnected) { clearInterval(iv); resolve('cancel'); } }, 200);
  });
}
async function leaveProjectOk() {
  if (!P || !dirty || autoSave) { await flushSave(); return true; }
  const c = await askUnsaved();
  if (c === 'cancel') { $('#projSelect').value = P.id; return false; }
  if (c === 'save') await saveNow(); else dirty = false;
  return true;
}
async function openProject(id) {
  if (P && P.id !== id && !(await leaveProjectOk())) return false;
  const p = await api.get(id);
  dirty = false;
  p.gwColors ||= {}; p.trades ||= {};
  p.tasks = (p.tasks || []).map(fillTask);
  P = p; LS.set('last', id);
  undoS = []; redoS = []; sel.clear(); cur = { r: 0, c: 'name' }; anchorR = 0; view.start = null;
  normalize(); allGw().forEach(gwColor); CAL = schedule();
  setNoProject(false); showTab(LS.get('tab', 'vorgang'));   // blendet den passenden Bereich ein und zeichnet
  setSave('Gespeichert');
  $('#projSelect').value = id;
  gridPane.scrollTop = 0;
  scrollToDay(P.start, 0.02);
  // erster Stand eines Projekts ohne Versionen
  api.versions(id).then((l) => { if (!l.length && P && P.id === id) api.addVersion(id, { name: 'Erster Stand', auto: true, end: CAL.peDay }); }).catch(() => {});
}
const fillTask = (t) => ({ cat: '', blk: -1, ph: '', preds: [], pct: 0, res: '', gw: '', color: '', notes: '', lvl: 0, cons: null, collapsed: false, ...t });

/* ---------- Versionshistorie ---------- */
function saveVersionDialog(after) {
  modal('Stand speichern', `<div class="form"><label>Name</label><input id="vName" class="full" placeholder="z. B. Stand Ausschreibung, an Bauherrn" value="Stand ${fmtShort(todayN())}${ud(todayN()).getUTCFullYear()}">
      <label>Notiz</label><textarea id="vNote" class="full" placeholder="optional – was hat sich geändert?"></textarea></div>
      <div class="hint">Gespeichert wird der aktuelle Plan mit allen Leistungen, Verknüpfungen, Kalender und Assistent-Einstellungen. Projektende jetzt: ${fmtD(CAL.peDay)}.</div>`,
  [{ label: 'Speichern', cls: 'primary', primary: true, fn: (bg) => {
    const name = bg.querySelector('#vName').value.trim(); if (!name) { toast('Bitte einen Namen eingeben.', true); return false; }
    (async () => { await flushSave(); await api.addVersion(P.id, { name, note: bg.querySelector('#vNote').value, end: CAL.peDay }); toast(`Stand „${name}“ gespeichert – er steht im Verlauf.`); if (after) after(); })().catch((e) => toast('Fehler: ' + e.message, true));
  } }, { label: 'Abbrechen' }]);
}
function scheduleOf(data) {   // Termine eines gespeicherten Stands berechnen, ohne den aktuellen Plan anzufassen
  const save = P; let C2, T2;
  try { P = { ...data, tasks: (data.tasks || []).map(fillTask) }; normalize(); C2 = schedule(); T2 = P.tasks; }
  finally { P = save; buildCal(P.cal); }
  return { C: C2, T: T2 };
}
async function versionHistory() {
  await flushSave();
  let list = [];
  const bg = modal('Verlauf – ' + P.name, '<div id="vhBody">Lade …</div>', [
    { label: 'Schließen' }]);
  bg.querySelector('.modal').style.width = '860px';
  const fmtTs = (iso) => { const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const draw = () => {
    const box = bg.querySelector('#vhBody');
    if (!list.length) { box.innerHTML = '<div class="hint">Noch keine Versionen. Mit „Aktuellen Stand als Version speichern“ legst du einen benannten Planstand an; außerdem entstehen beim Arbeiten automatische Zwischenstände (höchstens alle 15 Minuten, die letzten 60 bleiben).</div>'; return; }
    box.innerHTML = `<div class="vh-cur">Aktueller Stand: <b>${P.tasks.length} Leistungen</b> · Projektende <b>${fmtD(CAL.peDay)}</b></div>
      <table class="ptab vh"><thead><tr><th style="width:120px">Gespeichert</th><th>Version</th><th style="width:70px">Leistungen</th><th style="width:100px">Projektende</th><th style="width:250px"></th></tr></thead><tbody>`
      + list.map((v) => `<tr class="${v.auto ? 'auto' : ''}"><td>${fmtTs(v.created)}</td>
        <td>${v.auto && !v.name ? '<span class="vh-auto">automatischer Zwischenstand</span>' : `<b>${esc(v.name)}</b>`}${v.note ? `<div class="vh-note">${esc(v.note)}</div>` : ''}</td>
        <td style="text-align:right">${v.n}</td><td>${v.end != null ? fmtD(v.end) : '–'}${v.end != null && v.end !== CAL.peDay ? `<div class="vh-d ${v.end < CAL.peDay ? 'late' : 'early'}">jetzt ${CAL.peDay > v.end ? '+' : ''}${CAL.peDay - v.end} Tage</div>` : ''}</td>
        <td class="vh-act"><button class="btn sm" data-vc="${v.id}">Vergleichen</button><button class="btn sm" data-vr="${v.id}">Wiederherstellen</button><button class="btn sm" data-vo="${v.id}" title="Als neues Projekt öffnen">Als Projekt</button><button class="btn sm" data-vn="${v.id}" title="Benennen">✎</button><button class="btn sm" data-vd="${v.id}" title="Löschen">✕</button></td></tr>`).join('')
      + '</tbody></table>';
  };
  const load = async () => { try { list = await api.versions(P.id); } catch (e) { list = []; toast('Versionen konnten nicht geladen werden: ' + e.message, true); } draw(); };
  bg.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const v = list.find((x) => x.id === (b.dataset.vc || b.dataset.vr || b.dataset.vo || b.dataset.vn || b.dataset.vd)); if (!v) return;
    const label = v.name || 'Zwischenstand vom ' + fmtTs(v.created);
    if (b.dataset.vc) { compareVersion(v, label); return; }
    if (b.dataset.vr) {
      confirmDialog('Version wiederherstellen', `Den Plan auf „<b>${esc(label)}</b>“ zurücksetzen? Der aktuelle Stand wird vorher als Version „Vor Wiederherstellung“ gesichert; zusätzlich lässt sich das Zurücksetzen mit Strg+Z rückgängig machen.`, async () => {
        try {
          await flushSave(); await api.addVersion(P.id, { name: 'Vor Wiederherstellung', note: 'automatisch vor dem Zurücksetzen auf „' + label + '“', end: CAL.peDay });
          const full = await api.version(P.id, v.id), d = full.data;
          const ok = act(() => { P.tasks = (d.tasks || []).map(fillTask); P.start = d.start; P.cal = d.cal || null; P.assist = d.assist || null; P.gwColors = d.gwColors || {}; P.nextUid = Math.max(d.nextUid || 1, P.nextUid); sel = new Set(); });
          if (ok) { allGw().forEach(gwColor); render(); toast(`Plan auf „${label}“ zurückgesetzt.`); }
          bg.remove();
        } catch (err) { toast('Fehler: ' + err.message, true); }
      }, 'Wiederherstellen');
      return;
    }
    if (b.dataset.vo) {
      try { const full = await api.version(P.id, v.id); await flushSave(); const p = await api.create({ ...full.data, name: `${P.name} – ${label}` }); bg.remove(); await refreshProjectList(); await openProject(p.id); await refreshProjectList(); toast(`„${label}“ als neues Projekt geöffnet.`); }
      catch (err) { toast('Fehler: ' + err.message, true); }
      return;
    }
    if (b.dataset.vn) { promptDialog('Version benennen', 'Name', v.name || '', async (name) => { await api.patchVersion(P.id, v.id, { name }); load(); }); return; }
    if (b.dataset.vd) {
      if (b.dataset.sure) { await api.delVersion(P.id, v.id); load(); }
      else { b.dataset.sure = '1'; b.textContent = 'Löschen?'; b.classList.add('danger'); setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = '✕'; b.classList.remove('danger'); } }, 3000); }
    }
  });
  load();
}
async function compareVersion(v, label) {
  let full; try { full = await api.version(P.id, v.id); } catch (e) { toast('Fehler: ' + e.message, true); return; }
  const { C: C2, T: T2 } = scheduleOf(full.data);
  const leaf = (T, C, i) => !C.summ[i];
  const old = new Map(), cur = new Map(), oldByName = new Map();
  T2.forEach((t, i) => { if (leaf(T2, C2, i)) { const o = { name: t.name, sd: C2.sd[i], fd: C2.fd[i], dur: C2.dur[i], res: t.res, i }; old.set(t.uid, o); if (!oldByName.has(t.name)) oldByName.set(t.name, o); } });
  P.tasks.forEach((t, i) => { if (!CAL.summ[i]) cur.set(t.uid, { name: t.name, sd: CAL.sd[i], fd: CAL.fd[i], dur: CAL.dur[i], i }); });
  const used = new Set(), rows = [];
  for (const [u, c] of cur) {
    let o = old.get(u); if (!o || o.name !== c.name) { const byN = oldByName.get(c.name); if (byN && !used.has(byN)) o = byN; else if (o && used.has(o)) o = null; }
    if (o) { used.add(o); if (o.sd !== c.sd || o.fd !== c.fd || o.dur !== c.dur) rows.push({ k: 'ch', c, o }); }
    else rows.push({ k: 'new', c });
  }
  for (const o of old.values()) if (!used.has(o)) rows.push({ k: 'del', o });
  rows.sort((a, b) => (a.c ? a.c.i : 1e6 + a.o.i) - (b.c ? b.c.i : 1e6 + b.o.i));
  const dd = (a, b) => b - a, sgn = (n) => (n > 0 ? '+' + n : String(n));
  const endD = CAL.peDay - C2.peDay;
  const nCh = rows.filter((r) => r.k === 'ch').length, nNew = rows.filter((r) => r.k === 'new').length, nDel = rows.filter((r) => r.k === 'del').length;
  const body = `<div class="vh-sum"><div><span>Projektende</span><b>${fmtD(C2.peDay)}</b> → <b>${fmtD(CAL.peDay)}</b> <i class="${endD > 0 ? 'late' : endD < 0 ? 'early' : ''}">${endD ? sgn(endD) + ' Kalendertage' : 'unverändert'}</i></div>
      <div><span>Leistungen</span>${nCh} verschoben/geändert · ${nNew} neu · ${nDel} entfallen</div></div>
    ${rows.length ? `<div style="max-height:56vh;overflow:auto"><table class="ptab vh"><thead><tr><th>Leistung</th><th>Anfang: ${esc(label.length > 24 ? 'Version' : label)} → jetzt</th><th>Ende: Version → jetzt</th><th style="width:90px">Ende Δ</th></tr></thead><tbody>`
      + rows.map((r) => r.k === 'new' ? `<tr class="vh-new"><td>${r.c.i + 1} – ${esc(r.c.name)} <i class="t in">neu</i></td><td>${fmtD(r.c.sd)}</td><td>${fmtD(r.c.fd)}</td><td></td></tr>`
        : r.k === 'del' ? `<tr class="vh-del"><td>${esc(r.o.name)} <i class="t part">entfallen</i></td><td>${fmtD(r.o.sd)}</td><td>${fmtD(r.o.fd)}</td><td></td></tr>`
        : `<tr><td>${r.c.i + 1} – ${esc(r.c.name)}${r.o.dur !== r.c.dur ? ` <small>(${r.o.dur} → ${r.c.dur} AT)</small>` : ''}</td><td>${r.o.sd === r.c.sd ? fmtD(r.c.sd) : `${fmtD(r.o.sd)} → <b>${fmtD(r.c.sd)}</b>`}</td><td>${r.o.fd === r.c.fd ? fmtD(r.c.fd) : `${fmtD(r.o.fd)} → <b>${fmtD(r.c.fd)}</b>`}</td><td class="${dd(r.o.fd, r.c.fd) > 0 ? 'late' : dd(r.o.fd, r.c.fd) < 0 ? 'early' : ''}">${dd(r.o.fd, r.c.fd) ? sgn(dd(r.o.fd, r.c.fd)) + ' Tage' : '–'}</td></tr>`).join('')
      + '</tbody></table></div>' : '<div class="hint">Keine Unterschiede bei den Leistungen.</div>'}`;
  const m = modal(`Vergleich: „${label}“ ↔ aktueller Stand`, body, [{ label: 'Schließen' }]);
  m.querySelector('.modal').style.width = '900px';
}

/* ⚙ → Bauzeitenplan: Einstellungen dieser App */
function ganttSettings(host) {
  const draw = () => {
    host.innerHTML = `<h4>Bearbeiten</h4>
      <label class="bph-ck"><input type="checkbox" data-gs="delAsk"${LS.get('delAsk', true) ? ' checked' : ''}> Beim Löschen von Leistungen fragen</label>
      <label class="bph-ck"><input type="checkbox" data-gs="autoLink"${autoLink ? ' checked' : ''}> Neue Leistungen automatisch mit der vorherigen verknüpfen</label>
      <p class="bph-mu">Gilt auf diesem Gerät. Beides lässt sich auch im Reiter „Leistung“ umschalten.</p>
      <h4>Kataloge, Phasen, Firmen und Vorlagen</h4>
      <p class="bph-mu">Leistungskatalog und Vorlagen pflegst du im Reiter „Leistungskatalog“, den Planungsassistenten über ✦ in der Leiste. Frühere Stände lassen sich hier zurückholen.</p>
      <div class="bph-row"><button type="button" class="bph-btn" data-gs="verlauf">🕘 Verlauf der Kataloge und Einstellungen</button></div>`;
  };
  host.onchange = (e) => {
    const k = e.target.dataset.gs;
    if (k === 'delAsk') { LS.set('delAsk', e.target.checked); updateRibbon(); }
    if (k === 'autoLink') { autoLink = e.target.checked; LS.set('autolink', autoLink); updateRibbon(); }
  };
  host.onclick = (e) => { if (e.target.closest('[data-gs="verlauf"]')) ACTIONS.verlaufKatalog(); };
  draw();
}
if (window.BPHead && BPHead.appEinstellungen) BPHead.appEinstellungen([{ key: 'gantt', label: 'Bauzeitenplan', render: (h) => ganttSettings(h) }]);

async function boot() {
  const gw = LS.get('gw', null); if (gw) document.documentElement.style.setProperty('--gw', gw + 'px');
  showTab(LS.get('tab', 'vorgang'));
  autoLink = LS.get('autolink', true);
  try {
    projects = await api.list();
    let id = LS.get('last', null);
    const hp = /^#plan=([\w-]+)/.exec(location.hash);   // Link aus der Verwaltung: diesen Plan öffnen
    if (hp && projects.some((p) => p.id === hp[1])) {
      id = hp[1];
      const ht = /[&#]tab=(\w+)/.exec(location.hash); if (ht) showTab(ht[1]);   // z. B. aus den Adressen: „Gewerke & Firmen“
      history.replaceState(null, '', location.pathname);
    }
    if (id === '__geschlossen__' && projects.length) { await refreshProjectList(); $('#projTitle').textContent = 'Kein Projekt geöffnet'; $('#projSub').textContent = 'Klicken zum Öffnen oder Anlegen'; setNoProject(true); renderStart(); if (LS.get('assistOpen', false)) setAssistOpen(true); return; }
    if (!hp) {   // Projekt aus der zuletzt benutzten App: dessen Plan (verknüpft oder gleiche Projektnummer)
      await new Promise((ok) => (document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ok) : ok()));
      if (window.BPHead && BPHead.ready) await BPHead.ready.catch(() => null);
      const gp = window.BPHead && BPHead.projekt;
      if (gp && gp.id) {
        const nr = (gp.name.match(/^[A-Za-z]\d{3}(?:\.\d+)?/) || [''])[0].toLowerCase();
        const fit = projects.find((p) => p.id === id && p.bt_id === gp.id) || projects.find((p) => p.bt_id === gp.id)
          || (nr && projects.find((p) => !p.bt_id && p.name.toLowerCase().startsWith(nr)));
        if (fit) id = fit.id;
        else { await refreshProjectList(); await keinPlanFuer(); if (LS.get('assistOpen', false)) setAssistOpen(true); return; }   // kein fremder Plan unter diesem Projekt
      }
    }
    if (!projects.some((p) => p.id === id)) id = (projects.find((p) => !p.archived) || projects[0])?.id;
    if (!id) { const p = await api.create({ name: 'Neues Projekt', start: snapWork(todayN()), tasks: [] }); id = p.id; }
    await openProject(id);
    await refreshProjectList();
    const aw = LS.get('aw', null); if (aw) document.documentElement.style.setProperty('--aw', aw + 'px');
    if (LS.get('assistOpen', false)) setAssistOpen(true);
  } catch (e) { toast('Server nicht erreichbar: ' + e.message, true); }
}
/* ---------- Planungsassistent (angedockt / eigenes Fenster) ---------- */
let assistUI = null;
function setAssistOpen(v) {
  document.body.classList.toggle('assist-open', v);
  if (v && !assistUI) assistUI = AssistUI.mount($('#assistPane'), AssistCore, { docked: true, onClose: () => setAssistOpen(false), onPopout: popoutAssist });
  if (!v && assistUI) { assistUI.destroy(); assistUI = null; }
  LS.set('assistOpen', v); render();
}
function popoutAssist() {
  const w = window.open('assistent.html', 'gantt_assistent', 'width=640,height=960');
  if (!w) { toast('Das Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.', true); return; }
  w.focus(); setAssistOpen(false);
}
$('#split2').addEventListener('mousedown', (e) => {
  e.preventDefault(); const x0 = e.clientX, w0 = $('#assistPane').offsetWidth, sp = $('#split2'); sp.classList.add('drag');
  const mv = (ev) => { const w = Math.max(300, Math.min(innerWidth * 0.7, w0 - (ev.clientX - x0))); document.documentElement.style.setProperty('--aw', w + 'px'); };
  const up = () => { sp.classList.remove('drag'); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); LS.set('aw', $('#assistPane').offsetWidth); render(); };
  addEventListener('mousemove', mv); addEventListener('mouseup', up);
});

let rzT = null;
addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => P && render(), 120); });
boot();
