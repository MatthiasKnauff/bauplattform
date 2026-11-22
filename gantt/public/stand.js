'use strict';
/* =====================================================================
   „Zeit und Stand“ (Mock „Soll, Ist und Fortschritt“, GO 22.11.2026: SI2-4 A, SI2-6 A): Dauer, Fortschritt, „später fertig um … AT“ und
   Grund stehen zusammen – EIN Block für das Eigenschaften-Fenster (taskDialog, Reiter Allgemein unter der Bezeichnung) und das kleine
   Feld am Balken (Klick auf den Balken, zsPop). Fortschritt mit dem Baustein der Plattform (bpProzent: 0 · 25 · 50 · 75 · 100 und Schieber).
     zsHtml(i, { dlg })  → HTML des Blocks (dlg: Dauer-Feld mit id="fDur" für die Abschnitte im Fenster)
     zsAn(box, aendern?) – Ergebniszeile („geplant … → jetzt fertig …“) folgt den Eingaben; aendern(w) wendet sofort an (Feld am Balken)
     zsLesen(box)        → { dur, pct, ue, grund } (wirft UErr bei ungültiger Dauer)
     zsPop(i) / zsZu()   – Feld am Balken: jede Änderung gleich im Plan als ein Schritt (act), schließt nur über ✕ oder Esc
   Grund: Auswahl (bpVorschlag) oder eigener Text. Derselbe Block steht auch rechts unter „Details“ (rahmen.js).
   Nutzt aus gantt-*.js: P, CAL, act, render, fmtDur, parseDur, fmtD, fromW, UEBER_GRUND, UErr, esc.
   ===================================================================== */
function zsHtml(i, opt = {}) {
  const t = P.tasks[i], ue = (t.ueber && t.ueber.at) || 0, g = (t.ueber && t.ueber.grund) || 'leistung', ms = !CAL.dur[i];
  return `<div class="zs" data-zs-i="${i}" data-pct="${Math.round(t.pct || 0)}"><div class="zs-k">Zeit und Stand</div>
    <div class="zs-z"><label>Dauer <input ${opt.dlg ? 'id="fDur" ' : ''}data-zs="dur" value="${esc(fmtDur(CAL.dur[i]))}" size="7"></label></div>
    <div class="zs-z zs-lauf"${ms ? ' hidden' : ''}><span class="zs-l">Fortschritt</span>${bpProzent(t.pct || 0, 'data-zsp')}</div>
    <div class="zs-z zs-lauf"${ms ? ' hidden' : ''}><label>Später fertig um <input type="number" data-zs="ue" min="0" max="365" value="${ue}"> AT</label>
      <label>Grund <input data-zs="ueg" data-vs="zsGrund" value="${esc(UEBER_GRUND[g] || g)}" placeholder="auswählen oder eintippen" autocomplete="off"></label></div>
    <div class="zs-e" data-zs="erg">${zsErgebnis(i, CAL.dur[i], ue)}</div></div>`;
}
/* Grund: Auswahl oder eigener Text (22.11.2026) – bekannte Gründe als Schlüssel (Lernen zählt nur „liegt an der Leistung“), sonst der Text */
const zsGrundVon = (v) => { v = String(v || '').trim(); const k = Object.keys(UEBER_GRUND).find((x) => x === v || UEBER_GRUND[x].toLowerCase() === v.toLowerCase()); return k || v.slice(0, 80) || 'anders'; };
if (window.bpVorschlag) bpVorschlag.listen.zsGrund = () => {
  const eigen = new Set(); (P ? P.tasks : []).forEach((t) => { const g = t.ueber && t.ueber.grund; if (g && !UEBER_GRUND[g]) eigen.add(g); });
  return [...Object.values(UEBER_GRUND).map((w) => ({ w })), ...[...eigen].map((w) => ({ w, t: 'im Plan' }))];
};
function zsErgebnis(i, dur, ue) {   // geplant Anfang – Ende (ohne Überzug) → jetzt fertig
  if (!+dur) return `Meilenstein am ${fmtD(CAL.sd[i])}`;   // 0 Tage: kein Fortschritt, kein „später fertig“
  const t = P.tasks[i], m = CAL.segE[i].length, alt = (t.ueber && t.ueber.at) || 0;
  const plan = CAL.segE[i][m - 1] - alt + ((+dur || t.dur) - t.dur);
  return `geplant ${fmtD(CAL.sd[i])} – ${fmtD(fromW(plan - 1))}${ue > 0 ? ` → <b class="zs-sp">jetzt fertig ${fmtD(fromW(plan + ue - 1))}</b>` : ''}`;
}
const zsBox = (box) => (box.classList.contains('zs') ? box : box.querySelector('.zs'));
function zsLesen(box) {
  const v = (k) => box.querySelector(`[data-zs="${k}"]`).value;
  const dur = parseDur(v('dur')); if (dur == null) throw new UErr('Ungültige Dauer.');
  return { dur, pct: Math.max(0, Math.min(100, Math.round(+zsBox(box).dataset.pct || 0))), ue: dur ? Math.max(0, Math.min(365, Math.round(+v('ue') || 0))) : 0, grund: zsGrundVon(v('ueg')) };
}
function zsSetzen(t, w) {   // Werte aus zsLesen in die Leistung (innerhalb von act)
  if (!segList(t)) t.dur = w.dur;
  t.pct = w.pct;
  if (w.ue) t.ueber = { at: w.ue, grund: w.grund }; else delete t.ueber;
}
function zsAn(box, aendern) {
  const erg = () => { const z = zsBox(box), d = parseDur(z.querySelector('[data-zs="dur"]').value); z.querySelector('[data-zs="erg"]').innerHTML = zsErgebnis(+z.dataset.zsI, d, Math.round(+z.querySelector('[data-zs="ue"]').value || 0));
    z.querySelectorAll('.zs-lauf').forEach((x) => { x.hidden = d === 0; }); };
  const neu = () => { if (!aendern) return erg(); try { aendern(zsLesen(box)); } catch (e) { toast(e.message, true); } };
  box.addEventListener('click', (e) => { const b = e.target.closest('.bp-pz-s [data-zsp]'); if (!b) return; zsBox(box).dataset.pct = b.dataset.p;
    const r = box.querySelector('.bp-pz input[type=range]'); if (r) { r.value = b.dataset.p; r.nextElementSibling.textContent = b.dataset.p + ' %'; } neu(); });
  box.addEventListener('change', (e) => { if (e.target.matches('input[type=range][data-zsp]')) zsBox(box).dataset.pct = e.target.value; neu(); });
  box.addEventListener('input', (e) => { if (e.target.matches('[data-zs="dur"],[data-zs="ue"]')) erg(); });
  box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-zs]')) { e.preventDefault(); e.target.blur(); } });
}

/* ---------- Feld am Balken ---------- */
let ZS = null;   // { el, uid }
function zsZu() { if (ZS) { ZS.el.remove(); ZS = null; } }
function zsLage() {
  if (!ZS) return;
  const i = P ? P.tasks.findIndex((t) => t.uid === ZS.uid) : -1, b = i >= 0 && document.querySelector(`#chartBody .bar[data-i="${i}"] .b`);
  if (!b) { ZS.el.style.visibility = 'hidden'; return; }
  const r = b.getBoundingClientRect(), w = ZS.el.offsetWidth, h = ZS.el.offsetHeight;
  const x = Math.max(8, Math.min(innerWidth - w - 8, r.left)), y = r.bottom + 8 + h > innerHeight ? Math.max(8, r.top - h - 8) : r.bottom + 8;
  ZS.el.style.left = x + 'px'; ZS.el.style.top = y + 'px'; ZS.el.style.visibility = '';
}
function zsPop(i) {
  const t = P.tasks[i]; if (!t || CAL.summ[i] || t.dur === 0) return;
  zsZu();
  const el = document.createElement('div'); el.className = 'zs-pop';
  ZS = { el, uid: t.uid };
  const fuellen = () => {
    const k = P.tasks.findIndex((x) => x.uid === ZS.uid); if (k < 0) return zsZu();
    el.innerHTML = `<div class="zs-kopf"><b>${esc(P.tasks[k].name)}</b><button type="button" class="zs-x" data-zsx title="Schließen (Esc)" aria-label="Schließen">✕</button></div>${zsHtml(k)}<div class="zs-fuss">Doppelklick auf den Balken = Eigenschaften</div>`;
  };
  fuellen();
  el.addEventListener('click', (e) => { if (e.target.closest('[data-zsx]')) zsZu(); });
  el.addEventListener('mousedown', (e) => e.stopPropagation());
  zsAn(el, (w) => {
    const k = P.tasks.findIndex((x) => x.uid === ZS.uid), x = P.tasks[k]; if (!x) return;
    act(() => zsSetzen(x, w));
    const f = document.activeElement && el.contains(document.activeElement) ? document.activeElement.dataset.zs : null;
    fuellen(); zsLage();
    if (f) { const n = el.querySelector(`[data-zs="${f}"]`); if (n) n.focus(); }
  });
  document.body.appendChild(el);
  zsLage();
}
addEventListener('keydown', (e) => { if (ZS && e.key === 'Escape') { e.stopPropagation(); zsZu(); } }, true);
document.addEventListener('scroll', zsLage, true);
addEventListener('resize', zsLage);
window.zsPop = zsPop; window.zsZu = zsZu; window.zsLage = zsLage;
