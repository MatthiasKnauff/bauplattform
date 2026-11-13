'use strict';
/* Bestandteile eines Elements – Bauportal-Elemente (Katalog gk3e), eigene Elemente und Elemente eingelesener Kataloge (sirAdos Elemente).
   Je Bestandteil der Anteil in % (100 % = Menge laut Katalog); der Preis des Elements (tief · mittel · hoch) rechnet sofort neu.
   Speichern: eigenes Element → Anteile ändern; sonst „Als eigenes Element mit diesen Anteilen“ (Bauportal: mit Bestandteilen,
   sirAdos: Preis angepasst, Anteile als Hinweis). Gebraucht von baudaten.html (bearbeitbar) und pdbwahl.js (nur ansehen). */
const PDBT = new Map();   // Element-ID → {x, p: [Anteil % je Bestandteil]}
const _tEur = (v) => (v == null ? '–' : Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
const _tNum = (v, n = 3) => Number(v).toLocaleString('de-DE', { maximumFractionDigits: n });
function pdbTeileSumme(x, p) {   // {ep_von, ep_mittel, ep_bis} mit den gewählten Anteilen
  const s = { ep_von: 0, ep_mittel: 0, ep_bis: 0 };
  x.teile.forEach((t, i) => { const f = t.faktor * (p[i] / 100); for (const k in s) s[k] += (t[k] ?? t.ep_mittel ?? 0) * f; });
  for (const k in s) s[k] = Math.round(s[k] * 100) / 100;
  return s;
}
/* x: Position mit teile; bearbeitbar: Anteile änderbar (Baudaten-App) */
function pdbTeileHtml(x, bearbeitbar) {
  if (!(x.teile || []).length) return '';
  const st = PDBT.get(x.id) && PDBT.get(x.id).x === x ? PDBT.get(x.id) : { x, p: x.teile.map(() => 100) };
  PDBT.set(x.id, st);
  const S = pdbTeileSumme(x, st.p), geaendert = st.p.some((v) => v !== 100);
  const quelle = x.teile_quelle === 'katalog' ? (x.katalog_name || 'Katalog') : 'Positionsdatenbank';
  return `<div class="pdbt" data-pdbt="${x.id}"><h4>Bestandteile (${esc(quelle)}) – je 1 ${esc(x.einheit || '')}</h4>
    <table><thead><tr><th>Bestandteil</th><th class="r">Anteil</th><th class="r">Menge</th><th class="r">€</th></tr></thead><tbody>
    ${x.teile.map((t, i) => `<tr${st.p[i] !== 100 ? ' class="anders"' : ''}><td>${esc(t.kurz)}<br><small class="mute">${esc(t.code)} · ${_tEur(t.ep_mittel)} je ${esc(t.einheit)}</small></td>
      <td class="r">${bearbeitbar ? `<input class="pdbt-p" data-tp="${i}" value="${_tNum(st.p[i], 1)}" inputmode="decimal" aria-label="Anteil in Prozent"> %` : '100 %'}</td>
      <td class="r" data-tm="${i}">${_tNum(t.faktor * st.p[i] / 100)} ${esc(t.einheit)}</td><td class="r" data-te="${i}">${_tEur(t.ep_mittel * t.faktor * st.p[i] / 100)}</td></tr>`).join('')}
    </tbody></table>
    <div class="pdbt-s"><span>tief <b data-ts="ep_von">${_tEur(S.ep_von)}</b></span><span>mittel <b data-ts="ep_mittel">${_tEur(S.ep_mittel)}</b></span><span>hoch <b data-ts="ep_bis">${_tEur(S.ep_bis)}</b></span></div>
    ${bearbeitbar ? `<div class="pdbt-a"${geaendert ? '' : ' hidden'}><button type="button" class="btn sm" data-tzurueck>↺ Anteile zurück</button>${x.katalog === 'eigen'
      ? '<button type="button" class="btn sm pri" data-tspeichern>Anteile speichern</button>'
      : '<button type="button" class="btn sm pri" data-tneu title="Neue eigene Position mit diesen Anteilen und dem neuen Preis">⎘ Als eigenes Element mit diesen Anteilen</button>'}</div>` : ''}
    </div>`;
}
document.addEventListener('input', (e) => {
  const inp = e.target.closest && e.target.closest('.pdbt-p'); if (!inp) return;
  const box = inp.closest('[data-pdbt]'), st = PDBT.get(+box.dataset.pdbt); if (!st) return;
  const v = parseFloat(String(inp.value).replace(',', '.')), i = +inp.dataset.tp;
  st.p[i] = isFinite(v) && v >= 0 && v <= 1000 ? v : 100;
  const t = st.x.teile[i];
  box.querySelector(`[data-tm="${i}"]`).textContent = `${_tNum(t.faktor * st.p[i] / 100)} ${t.einheit || ''}`;
  box.querySelector(`[data-te="${i}"]`).textContent = _tEur(t.ep_mittel * t.faktor * st.p[i] / 100);
  inp.closest('tr').classList.toggle('anders', st.p[i] !== 100);
  const S = pdbTeileSumme(st.x, st.p); box.querySelectorAll('[data-ts]').forEach((b) => { b.textContent = _tEur(S[b.dataset.ts]); });
  const a = box.querySelector('.pdbt-a'); if (a) a.hidden = st.p.every((x) => x === 100);
});
/* Speichern – fertig(neueStelle) zeichnet die Seite neu */
async function pdbTeileKlick(e, fertig) {
  const b = e.target.closest && e.target.closest('[data-tzurueck],[data-tspeichern],[data-tneu]'); if (!b) return false;
  const box = b.closest('[data-pdbt]'), st = PDBT.get(+box.dataset.pdbt); if (!st) return true;
  const x = st.x, S = pdbTeileSumme(x, st.p), faktoren = Object.fromEntries(x.teile.map((t, i) => [t.code, Math.round(t.faktor * st.p[i] / 100 * 10000) / 10000]));
  try {
    if (b.hasAttribute('data-tzurueck')) { st.p = x.teile.map(() => 100); PDBT.delete(x.id); fertig(x); return true; }
    if (b.hasAttribute('data-tspeichern')) {
      const alt = { faktoren: Object.fromEntries(x.teile.map((t) => [t.code, t.faktor])), ep_von: x.ep_von_akt, ep_mittel: x.ep_mittel_akt, ep_bis: x.ep_bis_akt };
      const r = await api('api/position/' + x.id, 'PUT', { faktoren, ...S }); PDBT.delete(x.id); fertig(r);
      rueckgaengig(`Anteile von „${x.kurz}“ geändert`, async () => { fertig(await api('api/position/' + x.id, 'PUT', alt)); });
      return true;
    }
    const r = await api('api/position', 'POST', { von: x.id, faktoren, ...S }); PDBT.delete(x.id);
    toast('Als eigenes Element angelegt (Katalog „Eigene Positionen“).'); fertig(r);
    rueckgaengig(`Eigenes Element „${r.kurz}“ angelegt`, async () => { await api('api/position/' + r.id, 'DELETE'); fertig(x); });
  } catch (er) { toast(er.message, true); }
  return true;
}
