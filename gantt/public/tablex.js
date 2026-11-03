'use strict';
/* =====================================================================
   Tabellen mit veränderbarer Spaltenbreite und Sortierung
   Tabellen mit data-tk="<schlüssel>" werden nach jedem Neuzeichnen erweitert:
   - Spaltenrand im Kopf ziehen = Breite ändern, Doppelklick auf den Rand = zurücksetzen
   - Klick auf die Überschrift = sortieren (auf → ab → ursprüngliche Reihenfolge)
   data-nosort an der Tabelle schaltet das Sortieren ab, th.nosort oder leere Überschrift einzelne Spalten.
   Sortiert wird innerhalb von Gruppen (Zeilen mit class lv-ph trennen Gruppen); Zeilen mit
   class lv-sgrow bleiben an ihrer Zeile darüber. Breiten und Sortierung merkt sich der Browser.
   ===================================================================== */
const TBX = { widths: LS.get('tbxW', {}), sort: LS.get('tbxS', {}) };
const tbxSave = () => { LS.set('tbxW', TBX.widths); LS.set('tbxS', TBX.sort); };

function tbxCellVal(td) {
  if (!td) return '';
  if (td.dataset.sort != null) return td.dataset.sort;
  const f = td.querySelector('input:not([type=checkbox]),select,textarea');
  if (f) return f.tagName === 'SELECT' ? (f.selectedOptions[0] ? f.selectedOptions[0].text : '') : f.value;
  return td.textContent.trim();
}
const tbxNum = (v) => { const s = String(v).trim(); return s !== '' && /^-?[\d.,]+$/.test(s) ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : null; };
function tbxCompare(a, b) {
  const na = tbxNum(a), nb = tbxNum(b);
  if (na != null && nb != null) return na - nb;
  const ea = a === '' || a === '–', eb = b === '' || b === '–';
  if (ea !== eb) return ea ? 1 : -1;   // leere Werte immer ans Ende
  return String(a).localeCompare(String(b), 'de', { numeric: true, sensitivity: 'base' });
}

function tbxApplySort(table, key) {
  const st = TBX.sort[key], body = table.tBodies[0]; if (!body) return;
  const rows = [...body.rows];
  if (!rows.every((r) => r.dataset.tbxo != null)) rows.forEach((r, k) => { r.dataset.tbxo = k; });
  // Gruppen bilden: Trennzeilen bleiben stehen, angehängte Zeilen wandern mit
  const units = [], groups = [[]];
  for (const r of rows) {
    if (r.classList.contains('lv-ph') || r.querySelector('td.fv-empty')) { groups.push({ sep: r }); groups.push([]); continue; }
    if (r.classList.contains('lv-sgrow') && units.length) { units[units.length - 1].push(r); continue; }
    const u = [r]; units.push(u); groups[groups.length - 1].push(u);
  }
  const col = st ? st.col : -1, dir = st ? st.dir : 0;
  const frag = document.createDocumentFragment();
  for (const g of groups) {
    if (!Array.isArray(g)) { frag.appendChild(g.sep); continue; }
    const sorted = g.slice();
    if (dir) sorted.sort((x, y) => dir * tbxCompare(tbxCellVal(x[0].cells[col]), tbxCellVal(y[0].cells[col])) || (+x[0].dataset.tbxo - +y[0].dataset.tbxo));
    else sorted.sort((x, y) => +x[0].dataset.tbxo - +y[0].dataset.tbxo);
    sorted.forEach((u) => u.forEach((r) => frag.appendChild(r)));
  }
  body.appendChild(frag);
  table.querySelectorAll('thead th').forEach((th, k) => { th.classList.toggle('tbx-asc', k === col && dir > 0); th.classList.toggle('tbx-desc', k === col && dir < 0); });
}

function tbxApplyWidths(table, key) {
  const ths = [...table.querySelectorAll('thead tr:first-child > th')], w = TBX.widths[key];
  if (w && w.length === ths.length) {
    table.style.tableLayout = 'fixed'; table.style.width = w.reduce((a, b) => a + b, 0) + 'px';
    ths.forEach((th, k) => { th.style.width = w[k] + 'px'; th.style.minWidth = ''; });
    table.classList.add('tbx-fixed');
  } else { table.style.tableLayout = ''; table.style.width = ''; table.classList.remove('tbx-fixed'); }
}

function enhanceTables(root) {
  (root || document).querySelectorAll('table[data-tk]').forEach((table) => {
    const key = table.dataset.tk, sortable = !table.hasAttribute('data-nosort');
    const ths = [...table.querySelectorAll('thead tr:first-child > th')];
    ths.forEach((th, k) => {
      if (th.querySelector('.tbx-rz')) return;
      th.classList.add('tbx-th');
      const canSort = sortable && !th.classList.contains('nosort') && th.textContent.trim() !== '';
      if (canSort) { th.classList.add('tbx-s'); th.title = (th.title ? th.title + '\n' : '') + 'Klicken zum Sortieren'; }
      const rz = document.createElement('span'); rz.className = 'tbx-rz'; rz.title = 'Ziehen: Breite ändern · Doppelklick: zurücksetzen'; th.appendChild(rz);
      rz.addEventListener('click', (e) => e.stopPropagation());
      rz.addEventListener('dblclick', (e) => { e.stopPropagation(); delete TBX.widths[key]; tbxSave(); tbxApplyWidths(table, key); });
      rz.addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        // beim ersten Ziehen alle aktuellen Breiten festhalten, dann feste Spaltenbreiten
        if (!TBX.widths[key] || TBX.widths[key].length !== ths.length) { TBX.widths[key] = ths.map((x) => Math.round(x.getBoundingClientRect().width)); tbxApplyWidths(table, key); }
        const x0 = e.clientX, w0 = TBX.widths[key][k];
        document.body.classList.add('tbx-resizing');
        const mv = (ev) => { TBX.widths[key][k] = Math.max(40, Math.round(w0 + ev.clientX - x0)); tbxApplyWidths(table, key); };
        const up = () => { removeEventListener('mousemove', mv); removeEventListener('mouseup', up); document.body.classList.remove('tbx-resizing'); tbxSave(); };
        addEventListener('mousemove', mv); addEventListener('mouseup', up);
      });
      if (canSort) th.addEventListener('click', (e) => {
        if (e.target.closest('input,select,button,a')) return;
        const cur = TBX.sort[key];
        TBX.sort[key] = !cur || cur.col !== k ? { col: k, dir: 1 } : cur.dir === 1 ? { col: k, dir: -1 } : null;
        if (!TBX.sort[key]) delete TBX.sort[key];
        tbxSave(); tbxApplySort(table, key);
      });
    });
    tbxApplyWidths(table, key);
    if (sortable) tbxApplySort(table, key);
  });
}
