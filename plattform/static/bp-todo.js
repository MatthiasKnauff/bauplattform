/* Aufgaben & Post → Büro → „Bauplattform“: die ToDo-Liste der Bauplattform (shared/bpcore/buero/todo.md) mit Antworten.
   Punkte, die auf eine Entscheidung warten (Abschnitte „Wartet auf dich“, „Offene Fragen“), bekommen GO / Nein / Später und eine Bemerkung –
   gespeichert in der Datenbank des Büros mit Name und Zeit. „Antworten für Claude kopieren“ legt die neuen Antworten als Text in die
   Zwischenablage (zum Einfügen im Chat); danach gelten sie als übermittelt. Nur für die Verwaltung. */
let BPT = null, BPT_ANS = 'warten';
const bptWort = { go: 'GO', nein: 'Nein', spaeter: 'Später' };
async function bptLaden() { BPT = await api('api/bauplattform/todo'); return BPT; }
function bptOffen() {   // Zahl links in der Navigation: wartende Punkte ohne Antwort
  if (!BPT) return 0; let n = 0;
  BPT.abschnitte.forEach((a) => { if (a.warten) a.punkte.forEach((p) => { if (!p.erledigt && !p.entschieden && !BPT.antworten[p.id]) n++; }); });
  return n;
}
function bptZeile(p, warten) {
  const A = (BPT.antworten || {})[p.id], passt = !window.BPTFILTER || BPTFILTER(p);   // Suchfeld links (aufgaben.html)
  if (!passt) return '';
  const unter = (p.unter || []).length ? `<ul class="bpt-u">${p.unter.map((u) => `<li class="${u.erledigt ? 'erl' : ''}">${esc(u.text)}${u.zeit ? ` <small>${esc(u.zeit)}</small>` : ''}</li>`).join('')}</ul>` : '';
  return `<div class="bpt-z${warten && !p.erledigt ? ((A && A.antwort) || p.entschieden ? ' w ent' : ' w') : ''}${p.erledigt ? ' erl' : ''}" data-bpt="${esc(p.id)}">
    <div class="bpt-t">${esc(p.text)}${unter}</div><div class="bpt-zeit">${esc(p.zeit || '')}</div>
    ${warten && !p.erledigt ? `<div class="bpt-a"><span class="seg" role="group" aria-label="Antwort">${['go', 'nein', 'spaeter'].map((k) => `<button type="button" class="${A && A.antwort === k ? 'on ' + k : ''}" data-bpta="${k}">${bptWort[k]}</button>`).join('')}</span>
      <input class="bpt-bem" data-bptb value="${esc((A && A.bem) || '')}" placeholder="Bemerkung …" aria-label="Bemerkung">
      ${A ? `<small class="mute">${A.antwort ? bptWort[A.antwort] + ' · ' : ''}${esc(A.wer || '')} · ${esc(A.zeit || '')}${A.kopiert ? ' · übermittelt' : ' · noch nicht übermittelt'}</small>` : ''}</div>` : ''}</div>`;
}
function bptRender(el) {
  if (!BPT) { el.innerHTML = '<p class="mute">Lade …</p>'; bptLaden().then(() => { renderTabs(); bptRender(el); }).catch((e) => { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; }); return; }
  const neu = Object.values(BPT.antworten || {}).filter((a) => !a.kopiert).length;
  const ab = BPT.abschnitte.filter((a) => (BPT_ANS === 'warten' ? a.warten : BPT_ANS === 'erledigt' ? /erledigt/i.test(a.titel) : !/erledigt/i.test(a.titel)));
  const teile = ab.map((a) => {
    const P = (BPT_ANS === 'erledigt' ? a.punkte.slice(0, 80) : a.punkte.filter((p) => !p.erledigt || BPT_ANS === 'alle')).map((p) => bptZeile({ ...p, abschnitt: a.titel }, a.warten)).join('');
    return P ? `<div class="grp">${esc(a.titel)}</div><div class="bpt-l">${P}</div>` : ''; }).join('');
  el.innerHTML = `<div class="bpt-k"><span class="seg">${[['warten', `Wartet auf mich (${bptOffen()})`], ['alle', 'Alle offenen'], ['erledigt', 'Erledigt']].map(([k, t]) => `<button type="button" class="${BPT_ANS === k ? 'on' : ''}" data-bptan="${k}">${t}</button>`).join('')}</span>
    <button type="button" class="btn sm" data-bptkopie${neu ? '' : ' disabled'} title="Neue Antworten als Text in die Zwischenablage – im Chat mit Claude einfügen">📋 Antworten für Claude kopieren${neu ? ` (${neu})` : ''}</button></div>
    <p class="note">Die Liste kommt aus dem Repo und ist nach jedem Build aktuell. Antworten bleiben in der Datenbank des Büros – Claude sieht sie nicht von selbst: „Antworten für Claude kopieren“ und im Chat einfügen.</p>
    ${teile || '<div class="empty">Nichts gefunden.</div>'}`;
}
async function bptAntwort(id, antwort, bem) {
  const alt = (BPT.antworten || {})[id] ? { ...BPT.antworten[id] } : null;
  try { const r = await api('api/bauplattform/todo/antwort', 'POST', { id, antwort, bem }); BPT.antworten = r.antworten; renderTabs(); bptRender($('#view'));
    rueckgaengig('Antwort geändert', async () => { const r2 = await api('api/bauplattform/todo/antwort', 'POST', { id, antwort: alt ? alt.antwort : null, bem: alt ? alt.bem : '' }); BPT.antworten = r2.antworten; renderTabs(); bptRender($('#view')); });
  } catch (e) { toast(e.message, true); }
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !e.target.closest('.bpt-k, .bpt-l')) return;
  const an = e.target.closest('[data-bptan]'); if (an) { BPT_ANS = an.dataset.bptan; bptRender($('#view')); return; }
  const a = e.target.closest('[data-bpta]');
  if (a) { const z = a.closest('[data-bpt]'), id = z.dataset.bpt, cur = (BPT.antworten[id] || {}).antwort, k = a.dataset.bpta; bptAntwort(id, cur === k ? null : k, z.querySelector('[data-bptb]').value.trim()); return; }
  if (e.target.closest('[data-bptkopie]')) {
    try {
      const r = await api('api/bauplattform/todo/kopieren', 'POST', {}); if (!r.text) { toast('Keine neuen Antworten.'); return; }
      let ok = true; try { await navigator.clipboard.writeText(r.text); } catch { ok = false; }
      if (!ok) { await bpHinweis('Bitte markieren und kopieren (Strg+C):\n\n' + r.text); }
      if (await bpFrage(`${ok ? 'In der Zwischenablage.' : ''} Im Chat mit Claude einfügen.\n\nAls übermittelt markieren?`, { ok: 'Ja, übermittelt' })) {
        const r2 = await api('api/bauplattform/todo/kopieren', 'POST', { fertig: true }); BPT.antworten = r2.antworten; bptRender($('#view')); toast('Als übermittelt markiert.'); }
    } catch (er) { toast(er.message, true); }
  }
});
document.addEventListener('change', (e) => { const b = e.target.closest && e.target.closest('[data-bptb]'); if (!b) return; const z = b.closest('[data-bpt]'), id = z.dataset.bpt;
  bptAntwort(id, (BPT.antworten[id] || {}).antwort || null, b.value.trim()); });
