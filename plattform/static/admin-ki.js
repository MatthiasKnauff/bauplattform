'use strict';
/* Verwaltung → KI: Verbrauch je Dienst (Claude, Gemini, ChatGPT) – dieser Monat, Ø je Tag, Guthaben aus eingetragenen Aufladungen.
   Die Plattform schreibt jede Anfrage mit (bpcore.ki_verbrauch); Kosten = Tokens × Listenpreis, geschätzt.
   Gehört zu admin.html (gemeinsame Namen: api, esc, $, toast, ADMIN, nurSehen, rueckgaengig). */
const kiEur = (v) => (v == null ? '–' : v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
async function kiVerbrauchZeigen() {
  const el = document.querySelectorAll('[data-kv]'); if (!el.length) return;
  let V; try { V = await api('api/ki/verbrauch'); } catch { return; }
  el.forEach((x) => { const a = V[x.dataset.kv]; if (a) x.innerHTML = kiVerbrauchHtml(x.dataset.kv, a); });
}
function kiVerbrauchHtml(p, a) {
  const g = a.guthaben, knapp = g != null && a.tag_mittel > 0 && g / a.tag_mittel < 14;
  return `<div class="kv-z"><div><small>dieser Monat</small><b>${kiEur(a.monat)}</b><span>${a.n_monat} Anfrage${a.n_monat === 1 ? '' : 'n'}</span></div>
    <div><small>Ø je Tag (30 Tage)</small><b>${kiEur(a.tag_mittel)}</b><span>heute ${kiEur(a.heute)}</span></div>
    <div class="${g != null && g < 0 ? 'kv-rot' : knapp ? 'kv-gelb' : ''}"><small>Guthaben (geschätzt)</small><b>${g == null ? '–' : kiEur(g)}</b><span>${g == null ? 'Aufladung eintragen' : a.tag_mittel > 0 ? `reicht ca. ${Math.max(0, Math.floor(g / a.tag_mittel))} Tage` : 'seit ' + new Date(a.aufladungen[0].datum).toLocaleDateString('de-DE')}</span></div></div>
    <details class="kv-a"><summary>Aufladungen${a.aufladungen.length ? ` (${a.aufladungen.length})` : ''}</summary>
      ${a.aufladungen.map((x, i) => `<div class="kv-l"><span>${new Date(x.datum).toLocaleDateString('de-DE')}</span><b>${kiEur(+x.betrag)}</b><span class="mute">${esc(x.wer || '')}</span><button type="button" class="btn sm" data-kvweg="${p}" data-i="${i}" title="Aufladung entfernen">✕</button></div>`).join('')}
      <div class="kv-n"><input type="date" data-kvd="${p}" aria-label="Datum der Aufladung"><input data-kvb="${p}" inputmode="decimal" placeholder="Betrag €" aria-label="Betrag in Euro"><button type="button" class="btn sm" data-kvplus="${p}">＋ Aufladung</button></div>
      <p class="mute">Der Kontostand beim Anbieter lässt sich mit einem normalen Schlüssel nicht abfragen – trage ein, was du auflädst. Kosten = Tokens × Listenpreis, umgerechnet in € (die Rechnung des Anbieters gilt).</p></details>`;
}
document.addEventListener('click', async (e) => {
  const plus = e.target.closest('[data-kvplus]'), weg = e.target.closest('[data-kvweg]'); if (!plus && !weg) return;
  const p = (plus || weg).dataset.kvplus || (plus || weg).dataset.kvweg, box = (plus || weg).closest('[data-kv]');
  try {
    if (plus) {
      const betrag = box.querySelector('[data-kvb]').value.trim(), datum = box.querySelector('[data-kvd]').value;
      if (!betrag) { toast('Betrag eintragen.', true); return; }
      const V = await api('api/ki/aufladung', 'POST', { anbieter: p, betrag, datum }); box.innerHTML = kiVerbrauchHtml(p, V[p]); box.querySelector('details').open = true;
      const i = V[p].aufladungen.length - 1;
      rueckgaengig(`Aufladung ${kiEur(+betrag.replace(',', '.'))} eingetragen`, async () => { const W = await api('api/ki/aufladung', 'POST', { anbieter: p, weg: i }); const b = document.querySelector(`[data-kv="${p}"]`); if (b) b.innerHTML = kiVerbrauchHtml(p, W[p]); });
    } else {
      const i = +weg.dataset.i, V0 = await api('api/ki/verbrauch'), alt = V0[p].aufladungen[i];
      const V = await api('api/ki/aufladung', 'POST', { anbieter: p, weg: i }); box.innerHTML = kiVerbrauchHtml(p, V[p]); box.querySelector('details').open = true;
      if (alt) rueckgaengig(`Aufladung ${kiEur(+alt.betrag)} entfernt`, async () => { const W = await api('api/ki/aufladung', 'POST', { anbieter: p, betrag: String(alt.betrag), datum: alt.datum }); const b = document.querySelector(`[data-kv="${p}"]`); if (b) b.innerHTML = kiVerbrauchHtml(p, W[p]); });
    }
  } catch (er) { toast(er.message, true); }
});
