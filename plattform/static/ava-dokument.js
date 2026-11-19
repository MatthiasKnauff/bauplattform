'use strict';
/* Rechnung prüfen direkt im Dokument (GO 17.11.2026, K1 L1 N1) – Reiter „📄 Dokument“ der Aufmaßprüfung und der Rechnungen.
   Geladen nach ava-aufmass.js (gemeinsame Namen: L, AMV, amRe, amRC, amSummen, amBelege, amMarken, amAutoAus, api, nf, nf2, esc).
   - Korrekturen an Ort und Stelle (K1): geprüfte Menge, Auftrags-EP und neuer Gesamtpreis rot über der durchgestrichenen Zahl der Firma;
     Netto, Umsatzsteuer, Endsumme ebenso, darunter „Zahlbetrag lt. Prüfung“ (N1). Gleiche Regeln wie die Prüf-PDF (ava_dokument.py).
   - Rahmen ziehen (Maus/Stift): Notiz dazu (L1) – steht in der Prüf-PDF, außer „nur intern“. Klick auf die Notiz: ändern, löschen.
   - Verschickt: Haken, Notizen und Automarkierungen bleiben, wie sie abgelegt sind – Rückfrage „Korrekturversion beginnen“. */
const AMDS = {};   // Sperre je Rechnung (GET api/rechnungen/<id>/dokument)
async function amDokFrei(R) {
  if (!R) return false;
  let s = AMDS[R.id];
  if (!s) { try { s = AMDS[R.id] = await api(`api/rechnungen/${R.id}/dokument`); } catch { return true; } }   // der Server prüft beim Speichern noch einmal
  if (!s.gesperrt) return true;
  const t = s.versendet ? new Date(s.versendet.replace(' ', 'T')).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '';
  if (!(await bpFrage(`Die Rechnungsprüfung ist verschickt${t ? ' (' + t + ')' : ''} und bleibt so abgelegt.\n\nFür Änderungen eine Korrekturversion beginnen? Die verschickte Fassung bleibt unverändert; die Korrektur wird neu abgelegt („GEPRÜFT NEU“) und verschickt.`, { ok: 'Korrekturversion beginnen' }))) return false;
  try { AMDS[R.id] = await api(`api/rechnungen/${R.id}/korrektur`, 'POST'); toast('Korrekturversion – Haken, Notizen und Automarkierungen sind wieder änderbar.'); return true; } catch (e) { toast(e.message, true); return false; }
}

/* ---------- Korrekturen: dieselbe Regel wie ava_dokument.korrekturen ---------- */
function amZahlBox(A, seite, box, wert) {
  if (!box || wert == null) return null;
  const Z = ((A.zahlen || {})[seite] || []).filter((z) => box[1] - 0.004 <= (z[1] + z[3]) / 2 && (z[1] + z[3]) / 2 <= box[3] + 0.004 && Math.abs(z[4] - wert) < 0.005);
  return Z.length ? Z.reduce((a, z) => (z[2] > a[2] ? z : a)).slice(0, 4) : null;
}
/* Höhe der Zeile mit den Zahlen (mehrzeilige Positionen; die letzte der Seite reicht oft bis zum Fuß) – wie ava_dokument.zeile_y */
function amZeileY(A, t) {
  const b = t.box; if (!b) return 0;
  const z = ['gp', 'menge', 'ep', 'wert'].map((k) => amZahlBox(A, t.seite, b, t[k])).find(Boolean);
  return z ? (z[1] + z[3]) / 2 : Math.min((b[1] + b[3]) / 2, b[1] + 0.008);
}
function amKorrekturen(A, R, RC) {
  if (!A || !A.zahlen || !R || !RC) return [];
  const am = L.calc.aufmass || {}, stand = R.status === 'geprueft' && R.data.stand ? R.data.stand : am, VP = (L.vergabe && L.vergabe.preise) || {}, out = [];
  if (R.art !== 'regie') for (const [pid, t] of Object.entries(A.pos || {})) {
    if (t.menge == null || !t.box || (!(pid in am) && R.status !== 'geprueft' && !(pid in stand))) continue;
    const m = stand[pid] || 0, ep = VP[pid] != null && VP[pid] !== '' ? +VP[pid] : null;
    if (Math.abs(t.menge - m) >= 1e-6) { const b = amZahlBox(A, t.seite, t.box, t.menge); if (b) out.push([t.seite, b, nf(m)]); }
    if (ep != null && t.ep != null && Math.abs(t.ep - ep) >= 0.005) { const b = amZahlBox(A, t.seite, t.box, t.ep); if (b) out.push([t.seite, b, nf2(ep)]); }
    const e = ep != null ? ep : t.ep, gp = e != null ? Math.round(m * e * 100) / 100 : null;
    if (t.gp != null && gp != null && Math.abs(t.gp - gp) >= 0.005) { const b = amZahlBox(A, t.seite, t.box, t.gp); if (b) out.push([t.seite, b, nf2(gp)]); }
  }
  const G = amSummen(RC); let sb = null;
  for (const su of (A.kopf && A.kopf.summen) || []) {
    if (!G[su.art] || !su.box) continue; if (su.art === 'brutto' || !sb || (sb.art !== 'brutto' && su.box[3] > sb.box[3])) sb = su;   // unter der Endsumme, sonst unter der untersten
    if (!G[su.art].some((v) => Math.abs(su.wert - v) <= 1)) out.push([su.seite, su.box, nf2(su.art === 'brutto' ? RC.brutto : G[su.art][0])]);
  }
  const z = RC.auszahlung != null ? RC.auszahlung : RC.zahlung;
  if (sb && out.length && z != null) out.push([sb.seite, [sb.box[0], sb.box[3] + 0.006, sb.box[2], sb.box[3] + 0.006], `Zahlbetrag lt. Prüfung: ${nf2(z)} €`, true]);
  return out;
}

/* ---------- Zeichnen (von amMarken nach den Haken) ---------- */
function amDokExtra(V, R, b) {
  V.el.querySelectorAll('.am-kor,.am-notiz,.am-nrahmen').forEach((x) => x.remove());
  const A = b && b.auslese;
  if (A && !amAutoAus(R, b)) for (const [se, bx, txt, zeile] of amKorrekturen(A, R, amRC(R))) {
    const w = V.pages[se - 1]; if (!w) continue;
    const d = document.createElement('div'); d.className = 'am-kor' + (zeile ? ' zb' : '');
    Object.assign(d.style, { left: (bx[0] * 100 - 0.3) + '%', top: (bx[1] * 100) + '%', width: ((bx[2] - bx[0]) * 100 + 0.6) + '%', height: ((bx[3] - bx[1]) * 100) + '%' });
    d.innerHTML = `<span>${esc(txt)}</span>`; d.title = zeile ? 'Zahlbetrag lt. Prüfung' : 'geprüfter Wert – steht so auch in der Prüf-PDF'; w.appendChild(d);
    if (!zeile) w.querySelectorAll('.am-mk.no small').forEach((s) => { if (Math.abs(parseFloat(s.parentElement.style.top) / 100 - (bx[1] + bx[3]) / 2) < 0.012) s.remove(); });   // Wert steht schon über der Zahl
  }
  ((R.data && R.data.notizen) || []).forEach((n) => {
    if (n.bid !== V.bid) return; const w = V.pages[n.seite - 1]; if (!w) return;
    const [x0, y0, x1, y1] = n.box, r = document.createElement('div'); r.className = 'am-nrahmen' + (n.intern ? ' intern' : '');
    Object.assign(r.style, { left: x0 * 100 + '%', top: y0 * 100 + '%', width: (x1 - x0) * 100 + '%', height: (y1 - y0) * 100 + '%' });
    const t = document.createElement('div'); t.className = 'am-notiz' + (n.intern ? ' intern' : ''); t.dataset.amnotiz = n.id;
    Object.assign(t.style, { left: Math.min(x0 * 100, 70) + '%', top: (y1 * 100 + 0.4) + '%' });
    t.innerHTML = `${esc(n.text)}${n.intern ? ' <small>nur intern</small>' : ''}${n.von ? ` <small>– ${esc(n.von)}</small>` : ''}`; t.title = 'Notiz ändern oder löschen';
    w.appendChild(r); w.appendChild(t);
  });
}

/* ---------- Rahmen ziehen → Notiz ---------- */
let AMZG = null, AMZG_T = 0;
const amDokGezogen = () => Date.now() - AMZG_T < 450;
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.pointerType === 'touch') return;   // am Handy: Tippen = Haken, Wischen = Rollen
  const w = e.target.closest && e.target.closest('.am-pv .am-pg'); if (!w || !AMV || e.target.closest('.am-mk,.am-notiz,a,button')) return;
  const q = w.getBoundingClientRect(); AMZG = { w, q, x: e.clientX, y: e.clientY, d: null, id: e.pointerId };
});
document.addEventListener('pointermove', (e) => {
  if (!AMZG || e.pointerId !== AMZG.id) return;
  const { w, q } = AMZG, dx = e.clientX - AMZG.x, dy = e.clientY - AMZG.y;
  if (!AMZG.d) { if (Math.hypot(dx, dy) < 10) return; AMZG.d = document.createElement('div'); AMZG.d.className = 'am-nrahmen neu'; w.appendChild(AMZG.d); try { w.setPointerCapture(e.pointerId); } catch { /* egal */ } }
  e.preventDefault();
  const x0 = Math.min(AMZG.x, e.clientX) - q.left, y0 = Math.min(AMZG.y, e.clientY) - q.top;
  Object.assign(AMZG.d.style, { left: x0 / q.width * 100 + '%', top: y0 / q.height * 100 + '%', width: Math.abs(dx) / q.width * 100 + '%', height: Math.abs(dy) / q.height * 100 + '%' });
});
document.addEventListener('pointerup', async (e) => {
  const Z = AMZG; AMZG = null; if (!Z || !Z.d) return;
  AMZG_T = Date.now();
  const { q } = Z, se = AMV.pages.indexOf(Z.w) + 1, cl = (v) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
  const box = [cl((Math.min(Z.x, e.clientX) - q.left) / q.width), cl((Math.min(Z.y, e.clientY) - q.top) / q.height), cl((Math.max(Z.x, e.clientX) - q.left) / q.width), cl((Math.max(Z.y, e.clientY) - q.top) / q.height)];
  const R = amRe(); if (!R || !se || !(await amDokFrei(R))) { Z.d.remove(); return; }
  amNotizDialog(R, { id: Date.now().toString(36), bid: AMV.bid, seite: se, box, text: '', intern: false }, true, Z.d);
});
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('[data-amnotiz]'); if (!t) return;
  e.stopPropagation(); const R = amRe(); const n = R && ((R.data && R.data.notizen) || []).find((x) => x.id === t.dataset.amnotiz); if (n) amNotizDialog(R, { ...n }, false);
});
function amNotizDialog(R, n, neu, vorschau) {
  modalBox(`<h3>${neu ? 'Notiz zum Rahmen' : 'Notiz'}</h3><textarea data-amnotext rows="4" style="width:min(30rem,80vw)" placeholder="z. B. Länge vor Ort nachmessen – laut Plan 1,25 m">${esc(n.text)}</textarea>
    <label style="display:flex;gap:.4rem;align-items:center;margin:.4rem 0"><input type="checkbox" data-amnotint${n.intern ? ' checked' : ''}> nur intern – nicht in der Prüf-PDF für die Firma</label>
    <div class="acts">${neu ? '' : '<button type="button" class="btn" data-m="weg">Löschen</button>'}<span class="fill"></span><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Speichern</button></div>`,
  async (m, bg, close) => {
    if (m === 'x') { close(); if (vorschau) vorschau.remove(); return; }
    if (m !== 'ok' && m !== 'weg') return;
    const alt = ((R.data.notizen) || []).slice();
    let neuL;
    if (m === 'weg') neuL = alt.filter((x) => x.id !== n.id);
    else {
      const text = bg.querySelector('[data-amnotext]').value.trim(); if (!text) { toast('Bitte einen Text eingeben.', true); return; }
      const x = { ...n, text, intern: bg.querySelector('[data-amnotint]').checked, von: n.von || ((BPHead.me || {}).name || ''), am: n.am || new Date().toISOString().slice(0, 16) };
      neuL = neu ? [...alt, x] : alt.map((y) => (y.id === n.id ? x : y));
    }
    close(); if (vorschau) vorschau.remove();
    if (!(await amDokFrei(R))) return;
    const setze = async (N, still) => { R.data.notizen = N; amMarken(); try { await api('api/rechnungen/' + R.id, 'PUT', { notizen: N }); } catch (er) { if (!still) { R.data.notizen = alt; amMarken(); toast(er.message, true); } } };
    await setze(neuL);
    rueckgaengig(m === 'weg' ? 'Notiz gelöscht' : neu ? 'Notiz angelegt' : 'Notiz geändert', () => setze(alt, true), 10000, () => setze(neuL, true));
  });
  setTimeout(() => { const t = document.querySelector('[data-amnotext]'); if (t) t.focus(); }, 30);
}
