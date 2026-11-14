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

/* Verwaltung → KI → Datenschutz (besprochen am 14.11.2026): externe KI bekommt Namen, Adressen, E-Mail, Telefon nur als Art#Nummer
   (bpcore/anonym.py), Ollama im Büro im Klartext. Protokoll jeder Anfrage – ein/aus, Aufbewahrung in Tagen, Export als Text oder XML.
   Sehen nur mit dem Recht „Datenschutz“ (das Protokoll enthält selbst Klartext). */
let DS = { von: '', bis: '', q: '' };
async function kiDsZeigen(box) {
  let D; try { D = await api('api/ki/datenschutz?' + new URLSearchParams({ von: DS.von, bis: DS.bis, q: DS.q })); } catch (e) { box.innerHTML = `<p class="mute">${esc(e.message)}</p>`; return; }
  const qs = new URLSearchParams({ von: DS.von, bis: DS.bis, q: DS.q }).toString();
  box.innerHTML = `<h2>Anfragen an externe KI anonymisieren</h2>
    <p class="mute" style="margin-top:0">Immer an. An ${D.extern.map((x) => ({ claude: 'Claude', gemini: 'Gemini', chatgpt: 'ChatGPT' }[x] || x)).join(', ')} gehen Projekte, Adressen, Firmen, Personen, Mitarbeiter:innen, E-Mail und Telefon nur als Kennung (z. B. <code>firma#302918475610</code>); die Antwort wird zurückübersetzt. Ollama läuft im Büro und bekommt den Klartext. Bilder (Pläne, Scans) lassen sich nicht austauschen – vor dem Senden an externe KI fragt die Plattform nach.</p>
    <div class="ds-z"><label class="ck"><input type="checkbox" data-dsan${D.an ? ' checked' : ''}> <b>Protokoll der KI-Anfragen</b></label><label>aufbewahren <input data-dstage inputmode="numeric" value="${D.tage}" style="width:4.5rem;text-align:right"> Tage</label><span class="mute">danach automatisch gelöscht</span></div>
    <div class="ds-f"><input type="date" data-dsf="von" value="${esc(DS.von)}" aria-label="von"><input type="date" data-dsf="bis" value="${esc(DS.bis)}" aria-label="bis"><input type="search" data-dsf="q" value="${esc(DS.q)}" placeholder="Suchen – wer, App, Name …" aria-label="Suchen">
      <a class="btn sm" href="api/ki/datenschutz/export?form=txt&${qs}">⤓ Textdatei</a><a class="btn sm" href="api/ki/datenschutz/export?form=xml&${qs}">⤓ XML</a></div>
    <div class="tblw"><table class="ds-t"><thead><tr><th>Zeit</th><th>Wer · App</th><th>KI</th><th class="r">ersetzt</th><th>hinausgegangen</th></tr></thead><tbody>
      ${D.zeilen.map((z) => `<tr data-dsid="${z.id}"><td>${esc(z.zeit.slice(8, 10) + '.' + z.zeit.slice(5, 7) + '. ' + z.zeit.slice(11, 16))}</td><td>${esc(z.wer || '–')} · ${esc(z.app)}${z.zweck ? ` <small class="mute">${esc(z.zweck)}</small>` : ''}</td><td>${esc(z.anbieter)}${z.bild ? ' 🖼' : ''}</td><td class="r">${D.extern.includes(z.anbieter) ? z.n : '<small class="mute">im Büro</small>'}</td><td class="ds-a">${dsMarke(esc(z.auszug))}</td></tr>`).join('') || '<tr><td colspan="5" class="mute">Keine Anfragen im Zeitraum.</td></tr>'}
    </tbody></table></div><div id="dsEine"></div>
    <h3 style="margin-top:1.2rem">Ausprobieren</h3><p class="mute" style="margin-top:0">Text eingeben – so ginge er an eine externe KI. Es wird nichts gesendet und nichts protokolliert.</p>
    <textarea data-dsprobe rows="3" style="width:100%" placeholder="z. B. Herr Schmitz von Maler Müller war heute auf der Baustelle …"></textarea><pre class="ds-pr" id="dsProbe"></pre>`;
}
const dsMarke = (h) => h.replace(/\b([a-z]+#\d{12})\b/g, '<span class="ds-k">$1</span>');   // Kennungen blau
document.addEventListener('change', async (e) => {
  const box = document.getElementById('dsBox'); if (!box || !box.contains(e.target)) return;
  try {
    if (e.target.matches('[data-dsan]')) { const an = e.target.checked; await api('api/ki/datenschutz', 'PUT', { an }); rueckgaengig(`KI-Protokoll ${an ? 'an' : 'aus'}`, async () => { await api('api/ki/datenschutz', 'PUT', { an: !an }); kiDsZeigen(box); }); }
    else if (e.target.matches('[data-dstage]')) { const alt = (await api('api/ki/datenschutz?n=1')).tage; await api('api/ki/datenschutz', 'PUT', { tage: +e.target.value }); rueckgaengig('Aufbewahrung geändert', async () => { await api('api/ki/datenschutz', 'PUT', { tage: alt }); kiDsZeigen(box); }); }
    else if (e.target.matches('[data-dsf]')) { DS[e.target.dataset.dsf] = e.target.value; }
    else return;
    kiDsZeigen(box);
  } catch (er) { toast(er.message, true); }
});
document.addEventListener('click', async (e) => {
  const z = e.target.closest && e.target.closest('#dsBox tr[data-dsid]'); if (!z) return;   // eine Anfrage: Klartext und Hinausgegangenes nebeneinander
  let r; try { r = await api('api/ki/datenschutz/' + z.dataset.dsid); } catch (er) { toast(er.message, true); return; }
  const klar = r.ersetzt.reduce((t, [k, w]) => t.split(k).join('\u0001' + w + '\u0002'), r.gesendet);   // Klartext mit markierten Stellen
  const mk = (t) => esc(t).replace(/\u0001/g, '<span class="ds-kl">').replace(/\u0002/g, '</span>');
  document.getElementById('dsEine').innerHTML = `<h3>Anfrage #${r.id} · ${esc(r.zeit)} · ${esc(r.wer)} · ${esc(r.app)} · ${esc(r.anbieter)}</h3>
    ${r.ersetzt.length ? `<table class="ds-t"><tr><th>Kennung</th><th>Klartext</th><th>Art</th></tr>${r.ersetzt.map(([k, w, a]) => `<tr><td><span class="ds-k">${esc(k)}</span></td><td><span class="ds-kl">${esc(w)}</span></td><td>${esc(a)}</td></tr>`).join('')}</table>` : ''}
    <div class="ds-2"><div><h4>Im Büro (Klartext)</h4><pre>${mk(klar)}</pre></div><div><h4>Hinausgegangen</h4><pre>${dsMarke(esc(r.gesendet))}</pre></div></div>
    <h4>Antwort der KI</h4><pre>${dsMarke(esc(r.antwort))}</pre>`;
  document.getElementById('dsEine').scrollIntoView({ block: 'start', behavior: 'smooth' });
});
let DS_T = 0;
document.addEventListener('input', (e) => {
  if (!e.target.matches || !e.target.matches('[data-dsprobe]')) return; clearTimeout(DS_T);
  DS_T = setTimeout(async () => { const out = document.getElementById('dsProbe'); if (!out) return;
    try { const r = await api('api/ki/datenschutz/probe', 'POST', { text: e.target.value }); out.innerHTML = dsMarke(esc(r.gesendet)) + (r.ersetzt.length ? '\n\n' + r.ersetzt.map(([k, w, a]) => `${k} = ${esc(w)} (${a})`).join('\n') : ''); }
    catch (er) { out.textContent = er.message; } }, 400);
});
