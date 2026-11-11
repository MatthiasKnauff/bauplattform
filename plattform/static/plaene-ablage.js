/* Pläne & Dateien – Dateien hereinziehen und im Projektordner ablegen (wie in der AVA).
   Ordnervorschlag: zuerst „hier“ (die Zeile, auf die gezogen wurde, sonst der Ordner der gerade gezeigten Pläne),
   dann, was der Server aus Dateiname und Plankopf erkennt, dann alle Ordner des Projekts (mit Suche).
   Benutzt die gemeinsamen Namen der Seite plaene.html (pid, D, sichtbar, laden, stKey). */
const plOrdnerVon = (pfad) => (pfad || '').split('/').slice(0, -1).join('/');
function plHier(zeile) {   // wo ich gerade bin
  if (zeile && D) {
    for (const p of D.plaene.concat(D.frei || [])) for (const st of p.staende) if (stKey(p, st) === zeile.dataset.k && st.pdf) return plOrdnerVon(st.pdf.pfad);
  }
  const n = {};
  for (const p of (D && !D.error ? sichtbar() : [])) { const st = p.staende.find((x) => x.pdf); if (st) { const o = plOrdnerVon(st.pdf.pfad); n[o] = (n[o] || 0) + 1; } }
  const best = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}
async function plAblegenAlle(files, zeile) {
  if (!pid) { toast('Bitte zuerst ein Projekt wählen.', true); return; }
  const hier = plHier(zeile), L = [...files];
  let n = 0;
  for (let i = 0; i < L.length; i++) { const r = await plAblegen(L[i], hier, L.length - i - 1); if (r === 'stop') break; if (r === 'ok') n++; }
  if (n) laden(true);   // Ordner neu einlesen, damit die Datei gleich in der Liste steht
}
async function plAblegen(f, hier, rest) {
  const warte = setTimeout(() => toast(`„${f.name}“ wird gelesen …`), 1500);
  const fd = new FormData(); fd.append('datei', f); fd.append('project_id', pid);
  let V;
  try { const r = await fetch('api/ablage/vorschlag', { method: 'POST', body: fd, credentials: 'same-origin' }); V = await r.json().catch(() => ({})); if (!r.ok) throw new Error(V.error || 'Fehler ' + r.status); }
  catch (e) { clearTimeout(warte); toast(e.message, true); return rest ? 'weiter' : 'stop'; }
  clearTimeout(warte);
  const zeig = (o) => (o ? o.split('/').join(' / ') : '(oberste Ebene)');
  const items = [];
  if (hier != null) items.push({ group: 'Hier – wo du gerade bist', title: zeig(hier), value: hier });
  V.erkannt.filter((x) => x.pfad !== hier).forEach((x) => items.push({ group: 'Erkannt aus dem Plan', title: zeig(x.pfad), sub: x.grund, value: x.pfad }));
  V.ordner.filter((o) => o !== hier && !V.erkannt.some((x) => x.pfad === o)).forEach((o) => items.push({ group: 'Alle Ordner', title: zeig(o), value: o, find: o }));
  let wahl = items.length ? items[0].value : null;
  return new Promise((fertig) => {
    const bg = modalBox(`<h3>Datei ablegen</h3>
      <p class="mu" style="margin:0 0 .7rem"><b>${esc(f.name)}</b> · ${mb(f.size)}${V.plan ? ` · Plan ${esc(V.plan)}` : ''}${V.text || !/\.pdf$/i.test(f.name) ? '' : ' · im PDF kein Text gefunden, Vorschlag nur nach dem Namen'}</p>
      <div class="fm"><label>Ordner</label><button type="button" class="pick" id="plAbO" style="width:100%"></button></div>
      <p class="mu" style="margin:.5rem 0 0;font-size:.85rem">Im Projektordner ${esc(V.basis || '')}. Gibt es den Namen dort schon, wird nichts überschrieben – die neue Datei bekommt „(2)“.</p>
      <div class="acts"><button class="btn" data-m="x">${rest ? 'Überspringen' : 'Abbrechen'}</button><button class="btn pri" data-m="ok">Ablegen</button></div>`, async (m, bg2, close) => {
      if (m === 'x') { close(); fertig(rest ? 'weiter' : 'stop'); return; }
      if (m !== 'ok') return;
      if (wahl == null) { toast('Bitte einen Ordner wählen.', true); return; }
      if (!wahl) { toast('Bitte einen Ordner im Projektordner wählen, nicht die oberste Ebene.', true); return; }
      close();
      const fd2 = new FormData(); fd2.append('datei', f); fd2.append('project_id', pid); fd2.append('ordner', wahl);
      try { const r = await fetch('api/ablage', { method: 'POST', body: fd2, credentials: 'same-origin' }), j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status); toast('Abgelegt: ' + j.pfad); fertig('ok'); }
      catch (e) { toast(e.message, true); fertig('weiter'); }
    });
    const k = bg.querySelector('#plAbO');
    const knopf = () => { const it = items.find((x) => x.value === wahl); pickButton(k, { title: it ? it.title : 'Ordner wählen …', sub: it ? it.group + (it.sub ? ' · ' + it.sub : '') : '' }); };
    knopf();
    k.addEventListener('click', () => pickMenu(k, { items: items.map((x) => ({ ...x, on: x.value === wahl })), search: 'Ordner suchen …', empty: 'Keine Ordner gefunden.', onPick: (v) => { wahl = v; knopf(); } }));
  });
}
/* irgendwo auf die Seite ziehen; auf eine Planzeile gezogen = in deren Ordner */
document.addEventListener('dragover', (e) => {
  if (![...(e.dataTransfer.types || [])].includes('Files') || e.target.closest('.modal-bg')) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; document.body.classList.add('pl-ziehen');
  document.querySelectorAll('tr.pl-ziel').forEach((x) => x.classList.remove('pl-ziel'));
  const z = e.target.closest('table.pl tr[data-k]'); if (z) z.classList.add('pl-ziel');
});
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) { document.body.classList.remove('pl-ziehen'); document.querySelectorAll('tr.pl-ziel').forEach((x) => x.classList.remove('pl-ziel')); } });
document.addEventListener('drop', (e) => {
  document.body.classList.remove('pl-ziehen');
  const z = e.target.closest && e.target.closest('table.pl tr[data-k]'); document.querySelectorAll('tr.pl-ziel').forEach((x) => x.classList.remove('pl-ziel'));
  if (!e.dataTransfer.files.length || e.target.closest('.modal-bg')) return;
  e.preventDefault(); plAblegenAlle(e.dataTransfer.files, z);
});
