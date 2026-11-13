'use strict';
/* Honorar überschlagen – einfacher HOAI-Rechner (Gebäude, § 35), ohne Auftrag, speichert nichts (Mock 13.11.2026).
   Am Handy immer oben über den Aufträgen (zusammenklappbar, je Gerät gemerkt), am Rechner hinter dem Knopf „🧮 Überschlagen“ in der Navigation.
   Rechnet auf dem Server mit derselben Honorartafel wie die Aufträge (/api/ueberschlag). Gemeinsame Namen aus honorar.js (api, eur, eur0, esc, modalBox). */
const UE = { kosten: '', zone: 3, satz: 0, umbau: 0, nk: 5, r: null, offen: (() => { try { return localStorage.getItem('honorar:ue-offen') !== '0'; } catch { return true; } })(), lph: false, t: 0 };
const ueZahl = (v) => { const x = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
function ueKarte() {
  const r = UE.r, seg = (k, L) => `<span class="seg ue-seg">${L.map(([v, t]) => `<button type="button" class="${+UE[k] === v ? 'on' : ''}" data-ue="${k}" data-v="${v}">${t}</button>`).join('')}</span>`;
  const erg = r && r.netto ? `<div class="ue-erg"><span>LPh 1–9 (100 %)</span><b>${eur0(r.summe_lph)}</b>${r.umbau ? `<span>Umbauzuschlag ${UE.umbau} %</span><b>${eur0(r.umbau)}</b>` : ''}
      <span class="mute">Spanne bis oberer Satz</span><span class="mute">${eur0(r.oben)}</span><span>Nebenkosten ${UE.nk} %</span><b>${eur0(r.nk)}</b>
      <span><b>netto</b></span><b class="ue-gr">${eur0(r.netto)}</b><span class="mute">brutto</span><span class="mute">${eur0(r.brutto)}</span></div>`
    : `<div class="ue-erg"><span class="mute">${r && r.warnungen && r.warnungen.length ? esc(r.warnungen[0]) : 'Anrechenbare Kosten eintragen.'}</span></div>`;
  return `<div class="ho-k ue" data-uek><button type="button" class="ue-kopf" data-uezu aria-expanded="${UE.offen}"><b>🧮 Honorar überschlagen</b><small>HOAI 2021 · Gebäude</small><span>${UE.offen ? '▾' : '▸'}</span></button>
    <label>Anrechenbare Kosten netto<input class="ue-in" data-uein="kosten" value="${esc(UE.kosten)}" inputmode="decimal" placeholder="z. B. 850.000"></label>
    ${r && r.vorschlag ? `<small class="mute">aus der Kostenermittlung: ${esc(r.vorschlag.info)}</small>` : ''}
    ${UE.offen ? `<label>Honorarzone${seg('zone', [[1, 'I'], [2, 'II'], [3, 'III'], [4, 'IV'], [5, 'V']])}</label>
    <label>Honorarsatz${seg('satz', [[0, 'Basis'], [50, 'Mittel'], [100, 'oben']])}</label>
    <div class="ue-r2"><label>Umbauzuschlag %<input class="ue-in" data-uein="umbau" value="${UE.umbau}" inputmode="decimal"></label><label>Nebenkosten %<input class="ue-in" data-uein="nk" value="${UE.nk}" inputmode="decimal"></label></div>` : ''}
    ${erg}
    ${UE.offen && r && r.netto ? `<button type="button" class="ue-mehr" data-uelph>${UE.lph ? '▾' : '▸'} Leistungsphasen einzeln</button>
      ${UE.lph ? `<div class="ue-lph">${r.phasen.map((p) => `<span>${p.key.slice(3)} ${esc(p.name)}</span><span class="mute">${p.p} %</span><b>${eur0(p.honorar)}</b>`).join('')}</div>` : ''}` : ''}</div>`;
}
async function ueRechnen(mitVorschlag) {
  const pid = window.BPHead && BPHead.projektId ? BPHead.projektId() : null;
  try {
    UE.r = await api('api/ueberschlag', 'POST', { kosten: UE.kosten, zone: UE.zone, satz: UE.satz, umbau: UE.umbau, nk: UE.nk, ...(mitVorschlag && pid ? { project_id: +pid } : {}) });
    if (UE.r.vorschlag && !ueZahl(UE.kosten)) UE.kosten = UE.r.kosten.toLocaleString('de-DE');
  } catch (e) { UE.r = null; toast(e.message, true); }
  ueNeu();
}
function ueNeu() {   // alle sichtbaren Karten (Handy oben, Fenster am Rechner) neu – das gerade benutzte Feld behält den Fokus
  const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.uein, pos = f ? document.activeElement.selectionStart : 0;
  document.querySelectorAll('[data-uek]').forEach((k) => { k.outerHTML = ueKarte(); });
  if (f) { const i = document.querySelector(`[data-uein="${f}"]`); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch { /* egal */ } } }
}
function ueFenster() {   // am Rechner: Knopf „🧮 Überschlagen“
  modalBox(`${ueKarte()}<div class="acts"><button class="btn pri" data-m="x">Schließen</button></div>`, (m, bg, close) => { if (m === 'x') close(); });
  if (!UE.r) ueRechnen(true);
}
document.addEventListener('input', (e) => {
  const i = e.target.closest && e.target.closest('[data-uein]'); if (!i) return;
  UE[i.dataset.uein] = i.dataset.uein === 'kosten' ? i.value : ueZahl(i.value);
  clearTimeout(UE.t); UE.t = setTimeout(() => ueRechnen(false), 250);   // nicht bei jedem Tastendruck rechnen
});
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-ue],[data-uezu],[data-uelph],[data-ueauf]'); if (!t) return;
  if (t.dataset.ueauf != null) return ueFenster();
  if (t.dataset.ue) { UE[t.dataset.ue] = +t.dataset.v; return ueRechnen(false); }
  if (t.hasAttribute('data-uezu')) { UE.offen = !UE.offen; try { localStorage.setItem('honorar:ue-offen', UE.offen ? '1' : '0'); } catch { /* egal */ } return ueNeu(); }
  if (t.hasAttribute('data-uelph')) { UE.lph = !UE.lph; ueNeu(); }
});
