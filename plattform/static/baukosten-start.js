/* Baukosten – Bedienung, Raumtypen, Justage, Kennwerte und Kostendatenbanken, Hinweis beim Öffnen, Start.
   Teil der Seite baukosten.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: baukosten-kern.js, baukosten-bauteile.js, baukosten-start.js). */
/* ---------- Bedienung ---------- */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; history.replaceState(null, '', '#' + tab); render(); return; }
  const s = e.target.closest('[data-stufe]');
  if (s && B) {
    if (B.stufe === s.dataset.stufe) return;
    B.stufe = s.dataset.stufe; CHECK = null; render(); clearTimeout(saveT);
    const I = STUFE_INFO[B.stufe], n = STUFEN.find((x) => x[0] === B.stufe)[1];
    saveNow({ stufe: B.stufe }).then(() => { toast(`${n}: übliche Genauigkeit ± ${I.genau} %, PDF in der ${I.ebene}. Ebene.`); if (tab === 'pruefung') runCheck(); else render(); });
    return;
  }
  const a = e.target.closest('[data-act]');
  if (a) {
    const act = a.dataset.act;
    if (act === 'new') { const gp = window.BPHead && BPHead.projektId();   // Projekt steht oben: gleich anlegen, ohne Rückfrage
      if (gp) { try { const r = await api('api/bk', 'POST', { project_id: gp, name: 'Startversion' }); SRC = null; tab = 'uebersicht'; await loadList(r.id); } catch (er) { toast(er.message, true); } }
      else newDialog(); }
    else if (act === 'goCheck') { tab = 'pruefung'; history.replaceState(null, '', '#pruefung'); render(); runCheck(); }
    else if (act === 'check') runCheck();
    else if (act === 'checkKi') runCheck(true);
    else if (act === 'estimateKi') runEstimate(true);
    else if (act === 'okAll') { B.data.rooms.forEach((r) => { r.ok = true; }); changed(); }
    else if (act === 'addRoom') { B.data.rooms.push({ id: 'h' + Date.now(), nr: '', name: '', area: 0, typ: 'sonst', ok: true, src: 'hand', floor: '', pos: null }); changed(); }
    else if (act === 'addItem') { B.data.items.push({ kg: '', name: '', amount: null }); changed(); }
    else if (act === 'juWarum') { e.preventDefault(); juWarum(); }
    else if (act === 'juEmpf') {
      const j = B.data.justage ||= { region: 100, preis: 100, rest: 'kw', f: 1 };
      if (a.dataset.v === 'preis') { j.preis = Math.max(30, Math.min(400, +a.dataset.p)); j.rest = 'kw'; toast(`Preisstand auf ${a.dataset.p} % gesetzt – bitte mit dem Baupreisindex begründen (Quelle im PDF).`); }
      else { j.rest = a.dataset.v; toast(a.dataset.v === 'angl' ? 'Übrige Gruppen an die Bauteile angeglichen.' : 'Übrige Gruppen bleiben beim Kennwert.'); }
      changed();
    }
    else if (act === 'din1') {   // DIN 276: alle Kostengruppen der 1. Ebene aufführen – nicht beauftragte mit 0 €
      const da = new Set(B.data.items.map((i) => String(i.kg).replace(/\D/g, '')[0]));
      const neu = [['100', 'Grundstück', 0], ['200', 'Vorbereitende Maßnahmen', null], ['500', 'Außenanlagen und Freiflächen', null], ['600', 'Ausstattung und Kunstwerke', 0], ['800', 'Finanzierung', 0]].filter(([k]) => !da.has(k[0]));
      neu.forEach(([kg, name, amount]) => B.data.items.push({ kg, name: amount === 0 ? name + ' – nicht Bestandteil' : name, amount }));
      toast(neu.length ? `${neu.length} Kostengruppen ergänzt – Beträge prüfen.` : 'Alle Kostengruppen der 1. Ebene sind schon aufgeführt.'); changed();
    }
    else if (act === 'estimate') runEstimate();
    else if (act === 'estZu') { EST = null; render(); }
    else if (act === 'firstPdf') $('#pdfIn').click();
    else if (act === 'firstRoom') { tab = 'plaene'; history.replaceState(null, '', '#plaene'); B.data.rooms.push({ id: 'h' + Date.now(), nr: '', name: '', area: 0, typ: 'sonst', ok: true, src: 'hand', floor: '', pos: null }); changed(); }
    else if (act === 'openAssist') { AS.open = true; AS.step = null; asSave(); assist(); }
    else if (act === 'hstdClear') { e.preventDefault(); const v = (await bpEingabe('Standardhöhe für alle Räume ohne eigene Höhe (m):', String(B.data.hoehe_std || '').replace('.', ','))); if (v != null) { const n = pnum(v); B.data.hoehe_std = n >= 1.5 && n <= 20 ? Math.round(n * 100) / 100 : null; changed(); } }
    else if (act === 'btVor') btSuggest(false);
    else if (act === 'btKi') btSuggest(true);
    else if (act === 'ausTyp') ausDialog(null);
    else if (act === 'btAufbau') aufbauWahl({ kg: $('#btNewKg').value, knopf: 'Bauteil anlegen', onOk(a) { (B.data.bauteile ||= []).push(btAusAufbau({ id: 'h' + Date.now(), formel: '', menge: 0, src: '', geschoss: '' }, a)); changed(); toast('Bauteil angelegt – Menge ergänzen.'); } });
    else if (act === 'btPdb') { pdbWahl({ titel: 'Bauteile aus den Baudaten', knopf: 'übernehmen', onInsert(neu) {
      const L = (B.data.bauteile ||= []);
      neu.forEach((x, k) => L.push({ id: 'h' + Date.now() + k, kg: x.kg || $('#btNewKg').value, name: x.kurz, mat: '', formel: '', menge: 0, einheit: x.einheit, ep: x.ep_s ?? 0, src: '', notiz: [x.quelle, x.ep_von != null ? `Spanne ${x.ep_von}–${x.ep_bis} €` : ''].filter(Boolean).join(' · '), geschoss: '', ...(x.aufbau ? { aufbau: x.aufbau } : {}) }));
      changed(); toast(`${neu.length} Bauteil${neu.length === 1 ? '' : 'e'} übernommen – Mengen ergänzen.`);
    } }); }
    else if (act === 'btAdd') { const k = $('#btNewKg').value, m = (B.mat || {})[k]; (B.data.bauteile ||= []).push({ id: 'h' + Date.now(), kg: k, name: m ? m.name : '', mat: m && m.opts[0] ? m.opts[0].n : '', formel: '', menge: 0, einheit: m ? m.einheit : 'm²', ep: m && m.opts[0] ? m.opts[0].ep : 0, src: '', notiz: '', geschoss: '' }); changed(); setTimeout(() => { const ins = document.querySelectorAll('[data-bf="formel"]'); const x = [...ins].find((e) => +e.dataset.bi === B.data.bauteile.length - 1); if (x) x.focus(); }, 50); }
    else if (act === 'btClear') { if ((await bpFrage('Alle Bauteile entfernen? Die Kosten kommen dann wieder ganz aus den Kennwerten (mit ↶ Rückgängig zurückholbar).'))) { B.data.bauteile = []; changed(); } }
    else if (act === 'raumtypen') { e.preventDefault(); typesDialog(); }
    else if (act === 'toJustage') { e.preventDefault(); goHint({ go: { tab: 'kosten', sel: '#justage' } }); }
    else if (act === 'vgAdd') { try { clearTimeout(saveT); await saveNow(); VG = await api(`api/bk/${B.id}/vergleich`, 'POST', {}); toast('Als Vergleichsobjekt gespeichert.' + (VG.hinweis ? ' ' + VG.hinweis : '')); render(); } catch (er) { toast(er.message, true); } }
    else if (act === 'vgDel') { if (!(await bpFrage('Vergleichsobjekt entfernen? (Im Verlauf wiederherstellbar.)'))) return; try { VG = await api('api/vergleich/' + encodeURIComponent(a.dataset.id), 'DELETE'); render(); } catch (er) { toast(er.message, true); } }
    else if (act === 'vgUse') {
      let n = 0; Object.values(B.data.types).forEach((t) => { const v = vgOf(t.label); if (v) { t.kw = Math.round(v.mittel); n++; } });
      toast(n ? `${n} Kennwerte auf den Mittelwert der Vergleichsobjekte gesetzt.` : 'Keine passenden Raumtypen in den Vergleichsobjekten.'); if (n) changed();
    }
    else if (act === 'vgImp') vgImport();
    else if (act === 'dienste') diensteDialog();
    else if (act === 'saveKw') { try { const o = {}; Object.entries(B.data.types).forEach(([k, v]) => { o[k] = v.kw; }); await api('api/kennwerte', 'PUT', o); toast('Eigene Kennwerte gespeichert – gelten für neue Kostenermittlungen.'); } catch (er) { toast(er.message, true); } }
    return;
  }
  const tk = e.target.closest('[data-take]');
  if (tk) {
    const v = EST.vorschlaege[+tk.dataset.take], it = B.data.items.find((i) => i.kg.replace(/\D/g, '').slice(0, 3) === v.kg);
    const val = { amount: v.value, est: { src: v.src, low: v.low, high: v.high, basis: v.basis } };
    if (it) Object.assign(it, val); else B.data.items.push({ kg: v.kg, name: v.name, ...val });
    toast(`KG ${v.kg} mit ${eur(v.value)} übernommen (${v.src}).`); changed(); return;
  }
  const tk2 = e.target.closest('[data-takekg2]'); if (tk2) { B.data.kg2 = { ...EST.kg2[+tk2.dataset.takekg2].werte }; toast('Aufteilung übernommen – unter „Kosten“ änderbar.'); changed(); return; }
  const ok = e.target.closest('[data-ok]'); if (ok) { const r = B.data.rooms[+ok.dataset.ok]; r.ok = !r.ok; changed(); return; }
  const rr = e.target.closest('[data-reread]');
  if (rr) {
    rr.disabled = true; rr.textContent = 'lese …';
    try { clearTimeout(saveT); await saveNow(); const r = await api(`api/bk/${B.id}/files/${rr.dataset.reread}/neu-lesen`, 'POST', {}); B = r.bk; toast(`${r.note}${r.added ? ` – ${r.added} Räume übernommen` : ''}`); render(); }
    catch (er) { toast(er.message, true); rr.disabled = false; rr.textContent = 'Neu einlesen'; }
    return;
  }
  const kr = e.target.closest('[data-kiroom]');
  if (kr) {
    if (window.BPHead && BPHead.kiFragen) { const k = await BPHead.kiFragen({ titel: 'Plan mit KI lesen?', text: 'Räume, Flächen und Höhen aus dem Plan erkennen.', hinweis: 'Die Planseiten gehen als Bild an die gewählte KI. Das Ergebnis kommt als Vorschlag in die Raumliste.', bild: true }); if (!k) { if (!(BPHead.providers || []).some((p) => p.ok && p.bild && p.key !== 'intern')) toast('Keine KI eingerichtet, die Pläne lesen kann – Verwaltung → Einstellungen → KI.', true); return; } }
    const ki = window.BPHead ? BPHead.provider() : { key: 'intern' };
    if (!ki.bild) { toast(ki.key === 'ollama' ? 'Das Bildmodell von Ollama ist noch nicht geladen – kurz warten oder unter ⚙ → Für mich → KI Claude, Gemini oder ChatGPT wählen.' : 'Zum Lesen von Plänen unter ⚙ → Für mich → KI Ollama (mit Bildmodell), Claude, Gemini oder ChatGPT wählen – „Intern“ kann keine Bilder lesen.', true); return; }
    kr.disabled = true; kr.textContent = 'KI liest den Plan …';
    try {
      clearTimeout(saveT); await saveNow();
      const url = `api/bk/${B.id}/files/${kr.dataset.kiroom}/ki-raeume`;
      let r = await api(url, 'POST', {});
      while (r.wait) {   // Ollama im Büro: läuft im Hintergrund, ohne Grafikkarte einige Minuten
        kr.textContent = `KI liest den Plan … ${Math.floor((r.sek || 0) / 60)}:${String((r.sek || 0) % 60).padStart(2, '0')}`;
        await new Promise((ok) => setTimeout(ok, 4000));
        r = await api(url, 'POST', { job: r.job });
      }
      B = r.bk; toast(`${ki.label}: ${r.found} Räume gelesen, ${r.added} neu übernommen – bitte prüfen.${r.hinweis ? ' ' + r.hinweis : ''}`); render();
    } catch (er) { toast(er.message, true); kr.disabled = false; kr.textContent = '✨ KI lesen'; }
    return;
  }
  const dr = e.target.closest('[data-delroom]'); if (dr) { B.data.rooms.splice(+dr.dataset.delroom, 1); changed(); return; }
  const bdl = e.target.closest('[data-btdel]'); if (bdl) { B.data.bauteile.splice(+bdl.dataset.btdel, 1); changed(); return; }
  const ar = e.target.closest('[data-ausr]'); if (ar) { ausDialog(+ar.dataset.ausr); return; }
  const bau = e.target.closest('[data-btauf]'); if (bau) { const b = B.data.bauteile[+bau.dataset.btauf]; if (b) btAufbauOeffnen(b); return; }
  const bdu = e.target.closest('[data-btdup]'); if (bdu) { const i = +bdu.dataset.btdup; B.data.bauteile.splice(i + 1, 0, { ...B.data.bauteile[i], id: 'h' + Date.now(), src: '', aufbau: B.data.bauteile[i].aufbau ? { ...B.data.bauteile[i].aufbau } : undefined }); changed(); return; }
  const di = e.target.closest('[data-delit]'); if (di) { B.data.items.splice(+di.dataset.delit, 1); changed(); return; }
  const df = e.target.closest('[data-delfile]');
  if (df) {
    e.stopPropagation();
    const fid = +df.dataset.delfile, f = B.files.find((x) => x.id === fid), n = B.data.rooms.filter((r) => r.src === 'pdf:' + fid).length;
    modalBox(`<h3>Plan entfernen</h3><p>„${esc(f.name)}“ entfernen?${n ? ` Aus diesem Plan stammen ${n} Räume.` : ''}</p><div class="acts">${n ? '<button class="btn" data-m="keep">Plan entfernen, Räume behalten</button>' : ''}<button class="btn danger" data-m="all">${n ? 'Plan und Räume entfernen' : 'Entfernen'}</button><button class="btn" data-m="x">Abbrechen</button></div>`,
      async (m, bg, close) => { close(); if (m === 'x') return; try { clearTimeout(saveT); await saveNow(); B = await api(`api/bk/${B.id}/files/${fid}${m === 'keep' ? '?keep=1' : ''}`, 'DELETE'); selFile = B.files[0] ? B.files[0].id : null; render(); } catch (er) { toast(er.message, true); } });
    return;
  }
  const fc = e.target.closest('[data-file]'); if (fc && !e.target.closest('a')) { selFile = +fc.dataset.file; render(); return; }
  const mk = e.target.closest('[data-mk]'); if (mk) { selRoom = mk.dataset.mk; render(); const row = document.querySelector('tr.sel'); if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  if (e.target.closest('#drop,.bk-drop')) $('#pdfIn').click();
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.id === 'pdfIn') { if (el.files.length) upload([...el.files]); el.value = ''; return; }
  const row = el.closest('[data-row]');
  if (el.dataset.bf) {   // Bauteile & Material
    const b = B.data.bauteile[+el.dataset.bi], f = el.dataset.bf; if (!b) return;
    if (f === 'mat') {
      if (el.value === '__aufbau') { el.value = b.mat; btAufbauOeffnen(b); return; }
      if (el.value === '__eigen') { const v = (await bpEingabe('Material / Ausführung:', b.mat || '')); if (v != null && v.trim()) b.mat = v.trim(); changed(); return; }
      const o = ((B.mat || {})[b.kg] || { opts: [] }).opts.find((x) => x.n === el.value); b.mat = el.value; if (o) b.ep = o.ep; changed(); return;
    }
    if (f === 'formel') { b.formel = el.value; const v = evalFormel(el.value); if (v != null) b.menge = v; changed(); return; }
    if (f === 'menge' || f === 'ep') { b[f] = pnum(el.value); changed(); return; }
    if (f === 'kg') { b.kg = el.value.replace(/\D/g, '').slice(0, 3); const m = (B.mat || {})[b.kg]; if (m && !b.name) b.name = m.name; changed(); return; }
    b[f] = el.value; changed(); return;
  }
  if (el.dataset.h != null) {
    const r = B.data.rooms[+el.dataset.h], v = el.value.trim() === '' ? null : Math.round(pnum(el.value) * 100) / 100;
    if (v != null && (v < 1.5 || v > 20)) { toast('Bitte eine Höhe in Metern eintragen, z. B. 2,75.', true); el.value = r.h || ''; return; }
    if (v != null && !B.data.hoehe_std && !hAuto(r).v) { B.data.hoehe_std = v; r.h = null; toast(`${String(v).replace('.', ',')} m gilt jetzt für alle Räume ohne eigene Höhe – einzelne Räume kannst du danach ändern.`); }
    else r.h = v;
    changed(); return;
  }
  if (el.dataset.alle) { const k = el.dataset.alle, v = el.value; if (v === '-') return; B.data.rooms.forEach((r) => { r[k] = v; }); toast(`${k === 'std' ? 'Standard' : 'Maßnahme'} „${el.options[el.selectedIndex].text}“ für alle ${B.data.rooms.length} Räume gesetzt.`); changed(); return; }
  if (row && el.dataset.f) { const r = B.data.rooms[+row.dataset.row]; r[el.dataset.f] = el.dataset.f === 'area' ? pnum(el.value) : el.dataset.f === 'umfang' ? (el.value.trim() ? pnum(el.value) : null) : el.value; changed(); return; }
  if (el.dataset.kw) { B.data.types[el.dataset.kw].kw = pnum(el.value); changed(); return; }
  if (el.dataset.it) { const it = B.data.items[+el.dataset.it]; if (el.dataset.f === 'amount') delete it.est; it[el.dataset.f] = el.dataset.f === 'amount' ? (el.value.trim() === '' ? null : pnum(el.value)) : el.value; changed(); return; }
  if (el.dataset.kg2) { B.data.kg2 ||= {}; if (el.value.trim() === '') delete B.data.kg2[el.dataset.kg2]; else B.data.kg2[el.dataset.kg2] = pnum(el.value); changed(); return; }
  if (el.dataset.notes) { B.data.notes = el.value; changed(false); return; }
  if (el.dataset.share) { B.data.shares[el.dataset.share] = pnum(el.value); changed(); return; }
  if (el.dataset.ju) {
    const j = B.data.justage ||= { region: 100, preis: 100, rest: 'kw', f: 1 }, k = el.dataset.ju;
    if (k === 'rest') j.rest = el.value;
    else { const lim = { region: [30, 300], preis: [30, 400], f: [0.2, 5] }[k], v = pnum(el.value); j[k] = Math.max(lim[0], Math.min(lim[1], v || (k === 'f' ? 1 : 100))); if (k === 'f') j.rest = 'eigen'; }
    changed(); return;
  }
  if (el.dataset.sets) { B.data[el.dataset.sets] = el.value.trim(); changed(false); return; }
  if (el.dataset.set) {
    const v = pnum(el.value);
    if (el.dataset.set === 'kg300') { B.data.kg['300'] = Math.max(0, Math.min(100, v)); B.data.kg['400'] = 100 - B.data.kg['300']; }
    else B.data[el.dataset.set] = Math.max(0, v);
    changed(); return;
  }
  if (el.dataset.link) {
    const k = el.dataset.link, v = el.value ? (k === 'project_id' ? +el.value : el.value) : null;
    B[k] = v; FLOW = null; clearTimeout(saveT);
    const extra = { [k]: v };
    if (k === 'project_id' && v && !B.gantt_id && SRC) { const pl = SRC.plans.find((p) => p.project_id === v); if (pl) { extra.gantt_id = pl.id; B.gantt_id = pl.id; toast(`Bauzeitenplan „${pl.name}“ des Projekts übernommen.`); } }
    saveNow(extra).then(() => render());
  }
});
['dragover', 'dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
  const d = e.target.closest && e.target.closest('#drop,.bk-drop'); if (!d) return;
  e.preventDefault(); d.classList.toggle('on', ev === 'dragover');
  if (ev === 'drop' && e.dataTransfer.files.length) upload([...e.dataTransfer.files]);
}));
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-file],#drop,.bk-drop')) { e.preventDefault(); e.target.click(); } });
$('#pdfBtn').onclick = () => pdfDialog();
/* ---------- ⚙ Raumtypen: Liste des Büros (gilt für alle Kostenermittlungen) ---------- */
const guessTyp = (name, cat) => { const n = (name || '').toLowerCase().trim(); if (n) for (const t of cat) for (const w of (t.worte || '').split(',')) { const x = w.trim(); if (x && n.includes(x)) return t.key; } return 'sonst'; };
async function typesDialog(host) {
  let R; try { R = await api('api/kennwerte'); } catch (e) { toast(e.message, true); return; }
  let L = R.raumtypen.map((t) => ({ ...t }));
  const row = (t, i) => `<tr data-i="${i}"><td><input data-tf="label" value="${esc(t.label)}" aria-label="Bezeichnung" style="width:100%"></td>
    <td><input data-tf="worte" value="${esc(t.worte)}" placeholder="${t.key === 'sonst' ? 'alles andere' : 'z. B. labor, werkstatt'}" aria-label="Stichwörter" style="width:100%"${t.key === 'sonst' ? ' disabled' : ''}></td>
    <td class="r"><input class="n" data-tf="kw" value="${Math.round(t.kw)}" inputmode="numeric" style="width:90px" aria-label="Kennwert €/m²">${t.beispiel != null && Math.round(t.beispiel) !== Math.round(t.kw) ? `<div class="hint" style="font-size:.72rem">Beispiel ${Math.round(t.beispiel).toLocaleString('de-DE')} €</div>` : ''}</td>
    <td style="white-space:nowrap"><button class="btn sm" data-m="up" data-i="${i}" title="nach oben (Vorrang beim Zuordnen)" aria-label="nach oben"${i ? '' : ' disabled'}>↑</button>${t.key === 'sonst' ? '' : `<button class="btn sm" data-m="rm" data-i="${i}" aria-label="Raumtyp entfernen">✕</button>`}</td></tr>`;
  const html = () => `<h3>Raumtypen und Kennwerte des Büros</h3>
    <p class="hint" style="margin:0 0 .8rem">Gelten für alle Kostenermittlungen. Beim Einlesen eines Plans bekommt jeder Raum den ersten Raumtyp, dessen Stichwort im Raumnamen vorkommt (auch in Zusammensetzungen: „lager“ trifft „Stuhllager“). Eigene Typen für besondere Bauaufgaben ergänzen – z. B. Tierbereich, Labor, Klassenraum, Werkstatt.</p>
    <div class="tbl"><table><thead><tr><th>Raumtyp</th><th>Stichwörter (mit Komma)</th><th class="r">€ / m²</th><th></th></tr></thead><tbody>${L.map(row).join('')}</tbody></table></div>
    <div class="acts" style="justify-content:flex-start;margin-top:.6rem"><button class="btn sm" data-m="add">＋ Raumtyp</button><button class="btn sm" data-m="std">Vorgaben wiederherstellen</button></div>
    ${B ? `<label class="chk" style="margin-top:.8rem"><input type="checkbox" id="tyRe" checked><span><b>Raumtypen neu vorschlagen</b> – in der geöffneten Kostenermittlung „${esc(B.name)}“ bekommen alle Räume, die du noch <b>nicht bestätigt</b> hast, ihren Raumtyp nach den Stichwörtern oben neu. Bestätigte Räume bleiben unverändert.</span></label>` : ''}
    <div class="acts"><button type="button" class="btn" data-bph-verlauf="bk:raumtypen" style="margin-right:auto" title="Frühere Stände ansehen und wiederherstellen">🕘 Verlauf</button><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="save">OK</button></div>`;
  const read = (bg) => bg.querySelectorAll('tr[data-i]').forEach((tr) => { const t = L[+tr.dataset.i]; tr.querySelectorAll('[data-tf]').forEach((el) => { t[el.dataset.tf] = el.dataset.tf === 'kw' ? pnum(el.value) : el.value; }); });
  const bg = boxIn(host)(html(), async (m, bg, close, b) => {
    if (m === 'x') { close(); return; }
    read(bg);
    const redraw = () => { bg.querySelector('.modal').innerHTML = html(); };
    if (m === 'add') { L.splice(Math.max(0, L.length - 1), 0, { key: '', label: '', worte: '', kw: 1300, beispiel: null }); redraw(); const ins = bg.querySelectorAll('[data-tf=label]'); ins[ins.length - 2]?.focus(); return; }
    if (m === 'rm') { L.splice(+b.dataset.i, 1); redraw(); return; }
    if (m === 'up') { const i = +b.dataset.i; [L[i - 1], L[i]] = [L[i], L[i - 1]]; redraw(); return; }
    if (m === 'std') { L = R.standard.map((t) => ({ ...t, beispiel: t.kw })).concat(L.filter((t) => !R.standard.some((s) => s.key === t.key) && t.label.trim()).map((t) => ({ ...t }))); const so = L.findIndex((t) => t.key === 'sonst'); if (so >= 0) L.push(L.splice(so, 1)[0]); redraw(); return; }
    if (m === 'save') {
      const re = bg.querySelector('#tyRe')?.checked;
      try {
        const r = await api('api/kennwerte', 'PUT', { raumtypen: L.filter((t) => t.label.trim()) });
        if (!host) close(); else { R.raumtypen = r.raumtypen; } toast('Raumtypen gespeichert – gelten für alle Kostenermittlungen.');
        if (B) {
          clearTimeout(saveT); await saveNow(); B = await api('api/bk/' + B.id);
          if (re) { let n = 0; B.data.rooms.forEach((x) => { if (!x.ok) { const k = guessTyp(x.name, r.raumtypen); if (k !== x.typ && B.data.types[k]) { x.typ = k; n++; } } }); if (n) { toast(`${n} Räume neu zugeordnet.`); changed(); return; } }
          render();
        }
      } catch (er) { toast(er.message, true); }
    }
  });
  if (!host) bg.querySelector('.modal').style.width = 'min(760px,100%)';
}
function verwalten() {
  if (!B) return;
  modalBox(`<h3>„${esc(B.name)}“</h3>
    <p><b>Archivieren</b> schiebt diese Version in der Versionsauswahl nach unten unter „Archiviert“; sie bleibt erhalten und lässt sich jederzeit zurückholen.</p>
    <p><b>In den Papierkorb</b> nimmt diese Version mit Raumbuch, Schätzungen und hochgeladenen Plänen heraus – wiederherstellen lässt sie sich auf der Startseite unter „Papierkorb“.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn" data-m="arch">${B.archived ? 'Aus dem Archiv holen' : 'Archivieren'}</button><button class="btn danger" data-m="del">🗑 In den Papierkorb</button></div>`,
  async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m === 'arch') {
      const id = B.id, alt = !!B.archived, nm = B.name;
      close(); clearTimeout(saveT); await saveNow({ archived: !alt }); await loadList(id);
      rueckgaengig(`„${nm}“ ${alt ? 'aus dem Archiv geholt' : 'archiviert'}`, async () => {
        if (B && B.id === id) { clearTimeout(saveT); await saveNow({ archived: alt }); } else await api('api/bk/' + id, 'PUT', { archived: alt });
        await loadList(id);
      });
      return;
    }
    if (m === 'del') {
      try {
        clearTimeout(saveT); await saveNow(); const id = B.id, name = B.name;
        const r = await api('api/bk/' + id, 'DELETE'); close();
        try { localStorage.removeItem('bk.cur'); } catch { /* egal */ }
        B = null; await loadList();
        if (typeof r.papierkorb === 'number') rueckgaengig(`„${name}“ liegt im Papierkorb`, async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await loadList(id); });
        else toast(`„${name}“ liegt im Papierkorb – wiederherstellen unter Startseite → Papierkorb.`);
      } catch (e) { toast('Löschen fehlgeschlagen: ' + e.message, true); }
    }
  });
}
const PARTS = [['deckblatt', 'Deckblatt', 'Projekt, Bauherr, Stand, Gesamtkosten'], ['zusammenfassung', 'Zusammenfassung', 'Bauwerk, weitere KG, Nebenkosten, MwSt.'], ['genauigkeit', 'Genauigkeit', 'wahrscheinliche Spanne und was sie beeinflusst'],
  ['kosten', 'Kosten nach DIN 276', 'in der gewählten Gliederungstiefe'], ['raumtypen', 'Kosten nach Nutzung', 'Raumtypen mit Fläche und Kennwert'],
  ['raumbuch', 'Raumbuch', 'alle Räume mit Nutzung und Fläche'], ['mittelabfluss', 'Mittelabfluss', 'Diagramm und Monatstabelle aus dem Bauzeitenplan'],
  ['erlaeuterungen', 'Erläuterungen und Annahmen', 'eigener Text und offene Positionen'], ['quellen', 'Grundlagen und Quellen', 'woher Flächen, Kennwerte, Anteile und Preise stammen'], ['plaene', 'Planunterlagen', 'hochgeladene Pläne als Anlage']];
function pdfDialog() {
  if (!B) return;
  let o; try { o = JSON.parse(localStorage.getItem('bk.pdf')) || {}; } catch { o = {}; }
  const tb = o.tiefeBy || {};
  o = { teile: o.teile || ['deckblatt', 'zusammenfassung', 'genauigkeit', 'kosten', 'mittelabfluss', 'erlaeuterungen', 'quellen'], tiefe: tb[B.stufe] || (STUFE_INFO[B.stufe] || {}).ebene || 2, tiefeBy: tb, brutto: o.brutto ?? true, mwst: o.mwst ?? 19, runden: o.runden ?? 100 };
  let st = B.stufe;
  const warn = () => { const x = B.reife && B.reife.stufen.find((y) => y.key === st), rc = B.reife && B.reife.reicht; if (!x || x.ok) return '';
    return `<div class="pwarn"><b>Dafür reichen die Daten noch nicht:</b> ${x.fehlt.slice(0, 4).map((f) => esc(f.text)).join(' · ')}${x.fehlt.length > 4 ? ` · und ${x.fehlt.length - 4} weitere` : ''}
      <div class="acts" style="justify-content:flex-start;margin:.5rem 0 .3rem">${rc ? `<button class="btn sm" data-m="tiefer">Als ${esc(STUFE_N(rc))} ausgeben</button>` : ''}<button class="btn sm" data-m="pruef">Zur Prüfung</button></div>
      <label class="chk"><input type="checkbox" id="pVorl" checked><span>trotzdem als ${esc(STUFE_N(st))} – mit dem Vermerk „vorläufig“</span></label></div>`; };
  const bg0 = modalBox(`<h3>PDF für den Bauherrn</h3>
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin:.2rem 0 .4rem"><b>Ausgeben als</b><select id="pStufe" aria-label="Ausgeben als" style="width:auto">${STUFEN.map(([k, l]) => `<option value="${k}"${k === st ? ' selected' : ''}>${l}${B.reife && k === B.reife.reicht ? ' – dafür reicht es' : ''}</option>`).join('')}</select><span class="hint" id="pLph">nach DIN 276, ${esc(STUFE_INFO[st].lph)}</span></div>
    <div id="pWarn">${warn()}</div>
    <p class="hint" style="margin-top:.6rem">Was soll ins PDF-Paket? Die Auswahl wird gemerkt.</p>
    <div style="display:flex;flex-direction:column;gap:.15rem;margin-bottom:.9rem">${PARTS.map(([k, n, h]) => `<label class="chk"><input type="checkbox" data-part="${k}"${o.teile.includes(k) ? ' checked' : ''}><span><b>${n}</b> <span class="hint">– ${h}</span></span></label>`).join('')}</div>
    <div class="row" style="flex-direction:column;align-items:stretch;gap:.6rem">
      <label>Gliederungstiefe der Kosten<select id="pTiefe"><option value="1"${o.tiefe == 1 ? ' selected' : ''}>1. Ebene – Kostengruppen 100 … 800</option><option value="2"${o.tiefe == 2 ? ' selected' : ''}>2. Ebene – z. B. 330 Außenwände, 440 Elektro</option><option value="3"${o.tiefe == 3 ? ' selected' : ''}>3. Ebene – mit Einzelpositionen</option></select></label>
      <label>Beträge<select id="pBrutto"><option value="1"${o.brutto ? ' selected' : ''}>brutto inkl. MwSt.</option><option value="0"${o.brutto ? '' : ' selected'}>netto</option></select></label>
      <label>MwSt. in %<input id="pMwst" value="${o.mwst}" inputmode="decimal"></label>
      <label>Rundung<select id="pRund"><option value="0"${o.runden == 0 ? ' selected' : ''}>auf volle Euro</option><option value="100"${o.runden == 100 ? ' selected' : ''}>auf 100 €</option><option value="1000"${o.runden == 1000 ? ' selected' : ''}>auf 1.000 €</option></select></label></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">PDF erstellen</button></div>`,
  async (m, bg, close) => {
    if (m === 'tiefer') { bg.querySelector('#pStufe').value = B.reife.reicht; bg.querySelector('#pStufe').dispatchEvent(new Event('change', { bubbles: true })); return; }
    if (m === 'pruef') { close(); tab = 'pruefung'; history.replaceState(null, '', '#pruefung'); if (st !== B.stufe) { B.stufe = st; clearTimeout(saveT); await saveNow({ stufe: st }); } render(); runCheck(); return; }
    if (m !== 'ok') { close(); return; }
    const vx = B.reife && B.reife.stufen.find((y) => y.key === st), vorl = !!(vx && !vx.ok);
    if (vorl && !bg.querySelector('#pVorl').checked) { toast('Für diese Stufe reichen die Daten noch nicht – niedrigere Stufe wählen oder „vorläufig“ ankreuzen.', true); return; }
    const n = { teile: [...bg.querySelectorAll('[data-part]:checked')].map((x) => x.dataset.part), tiefe: +bg.querySelector('#pTiefe').value, brutto: bg.querySelector('#pBrutto').value === '1', mwst: pnum(bg.querySelector('#pMwst').value), runden: +bg.querySelector('#pRund').value };
    if (!n.teile.length) { toast('Bitte mindestens einen Teil wählen.', true); return; }
    try { localStorage.setItem('bk.pdf', JSON.stringify({ ...n, tiefeBy: { ...o.tiefeBy, [B.stufe]: n.tiefe } })); } catch { /* egal */ }
    // Fenster SOFORT öffnen (noch im Klick) – nach dem Speichern würde der Browser es als Popup blockieren
    const w = window.open('', '_blank');
    if (w) w.document.write('<!doctype html><meta charset="utf-8"><title>PDF wird erstellt …</title><body style="font:16px system-ui;display:grid;place-items:center;height:90vh;color:#555">PDF wird erstellt …</body>');
    close(); clearTimeout(saveT);
    if (st !== B.stufe) { B.stufe = st; const x = LIST.find((y) => y.id === B.id); if (x) x.stufe = st; await saveNow({ stufe: st }); vleiste(); } else await saveNow();
    AS.pdf = true; asSave(); assist();
    const url = `api/bk/${B.id}/bericht.pdf?teile=${n.teile.join(',')}&tiefe=${n.tiefe}&brutto=${n.brutto ? 1 : 0}&mwst=${n.mwst}&runden=${n.runden}${vorl ? '&vorl=1' : ''}`;
    toast('PDF wird erstellt …');
    try {
      const r = await fetch(url);
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || `Fehler ${r.status}`); }
      const blob = await r.blob(), href = URL.createObjectURL(blob);
      if (w && !w.closed) w.location.href = href;
      else { const a = document.createElement('a'); a.href = href; a.download = `${STUFEN.find((x) => x[0] === B.stufe)?.[1] || 'Kosten'} ${B.name}.pdf`; document.body.appendChild(a); a.click(); a.remove(); }
      setTimeout(() => URL.revokeObjectURL(href), 120000);
    } catch (er) { if (w && !w.closed) w.close(); toast('Das PDF konnte nicht erstellt werden: ' + er.message, true); }
  });
  pdfStufeBind(bg0, (k) => { st = k; }, warn, tb);
}
function pdfStufeBind(bg, setSt, warn, tb) {
  bg.addEventListener('change', (e) => {
    if (e.target.id !== 'pStufe') return;
    const k = e.target.value; setSt(k);
    bg.querySelector('#pLph').textContent = 'nach DIN 276, ' + STUFE_INFO[k].lph;
    bg.querySelector('#pWarn').innerHTML = warn();
    bg.querySelector('#pTiefe').value = String(tb[k] || STUFE_INFO[k].ebene || 2);   // Gliederungstiefe passend zur Stufe
  });
}
async function newDialog(vor) {
  if (document.querySelector('.modal-bg')) return;   // schon offen (Doppelklick)
  if (typeof vor === 'string') setTimeout(() => { const q = document.querySelector('#nkQ'); if (q) { q.value = vor; q.dispatchEvent(new Event('input', { bubbles: true })); } }, 0);
  if (!SRC) await loadSources();
  let sel = null, folders = [], fT = 0, nameTouched = false;   // sel: {kind:'bt'|'folder'|'none', id?, name}
  const bg = modalBox(`<h3 style="margin-bottom:.3rem">Neue Kostenermittlung</h3><p class="hint" style="margin:0 0 1rem">Wähle das Projekt – aus dem Bautagebuch oder als Ordner vom Server.</p>
    <div class="nk">
      <label class="nkl" for="nkQ">Projekt</label>
      <input id="nkQ" type="search" autocomplete="off" placeholder="Projektnummer oder Name, z. B. A526">
      <div class="nkList" id="nkList" role="listbox" aria-label="Projekte"></div>
      <div class="nkRow"><div><label class="nkl" for="nkName">Name der Version</label><input id="nkName" autocomplete="off" value="Startversion"></div></div>
      <label class="nkl" for="nkPlan">Bauzeitenplan <span class="hint">(für den Mittelabfluss, kann später gewählt werden)</span></label>
      <select id="nkPlan"><option value="">– später wählen –</option>${SRC.plans.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select>
    </div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`,
  async (m, bgx, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    if (!sel) { toast('Bitte ein Projekt wählen – oder „Ohne Projekt“.', true); $('#nkQ').focus(); return; }
    btn.disabled = true; btn.textContent = 'Lege an …';
    try {
      let pid = sel.kind === 'bt' ? sel.id : null;
      if (sel.kind === 'folder') { const r = await api('api/bautagebuch-projekt', 'POST', { name: sel.name }); pid = r.id; toast(`Projekt „${sel.name}“ im Bautagebuch angelegt.`); }
      const r = await api('api/bk', 'POST', { name: $('#nkName').value.trim() || sel.name, project_id: pid, gantt_id: $('#nkPlan').value || null });
      close(); SRC = null; tab = 'uebersicht'; await loadList(r.id);
    } catch (e) { btn.disabled = false; btn.textContent = 'Anlegen'; toast(e.message, true); }
  });
  bg.querySelector('.modal').style.width = 'min(620px, 100%)';
  const setName = () => {};   // die Version heißt „Startversion“ – das Projekt steht in der Kopfleiste
  const draw = () => {
    const q = $('#nkQ').value.trim().toLowerCase();
    const hit = (t) => passt(t, q);
    const pr = SRC.projects.filter((p) => !p.archived || q).filter((p) => !q || hit(p.name + ' ' + (p.client || '') + ' ' + (p.address || ''))).slice(0, q ? 30 : 8);
    const fo = folders.filter((f) => !SRC.projects.some((p) => p.name.toLowerCase() === f.toLowerCase()));
    const opt = (kind, key, title, sub, extra = '') => `<button type="button" role="option" class="nkOpt ${sel && sel.kind === kind && String(sel.key) === String(key) ? 'on' : ''}" data-k="${kind}" data-key="${esc(String(key))}" aria-selected="${!!(sel && sel.kind === kind && String(sel.key) === String(key))}"><b>${esc(title)}</b>${extra}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`;
    $('#nkList').innerHTML = (pr.length ? `<div class="nkGrp">Projekte im Bautagebuch</div>` + pr.map((p) => opt('bt', p.id, p.name, [p.client, p.address].filter(Boolean).join(' · ') + (p.archived ? ' · archiviert' : ''))).join('') : '')
      + (fo.length ? `<div class="nkGrp">Ordner auf dem Server – noch kein Projekt</div>` + fo.map((f) => opt('folder', f, f, 'wird beim Anlegen im Bautagebuch als Projekt angelegt', '<span class="pill y">neu</span>')).join('') : '')
      + (q && !pr.length && !fo.length ? `<p class="hint" style="padding:.6rem .8rem;margin:0">Nichts gefunden zu „${esc(q)}“${q.length < 2 ? '' : ' – auch kein Ordner auf dem Server'}.</p>` : '')
      + `<div class="nkGrp">Sonstiges</div>` + opt('none', 'none', 'Ohne Projekt anlegen', 'z. B. für eine erste Machbarkeitsschätzung');
  };
  $('#nkQ').addEventListener('input', () => {
    draw(); clearTimeout(fT); const q = $('#nkQ').value.trim();
    if (q.length < 2) { folders = []; draw(); return; }
    fT = setTimeout(async () => { try { const r = await api('api/folders?q=' + encodeURIComponent(q)); if (q === $('#nkQ').value.trim()) { folders = r; draw(); } } catch { /* ohne Vorschläge */ } }, 250);
  });
  $('#nkList').addEventListener('click', (e) => {
    const o = e.target.closest('[data-k]'); if (!o) return;
    const k = o.dataset.k, key = o.dataset.key;
    if (k === 'bt') { const p = SRC.projects.find((x) => String(x.id) === key); sel = { kind: k, key, id: p.id, name: p.name }; const pl = SRC.plans.find((x) => x.project_id === p.id); if (pl) $('#nkPlan').value = pl.id; }
    else if (k === 'folder') sel = { kind: k, key, name: key };
    else sel = { kind: 'none', key: 'none', name: '' };
    setName(); draw(); $('#nkName').focus();
  });
  $('#nkName').addEventListener('input', () => { nameTouched = true; });
  draw(); $('#nkQ').focus();
  // Projekt, aus dem man gekommen ist: hat es noch keine Kostenermittlung, gleich auswählen und den Namen übernehmen
  const gp = window.BPHead && BPHead.projekt, gpr = gp && gp.id && SRC.projects.find((p) => p.id === gp.id);
  if (gpr && !LIST.some((x) => x.project_id === gpr.id)) {
    sel = { kind: 'bt', key: String(gpr.id), id: gpr.id, name: gpr.name };
    $('#nkQ').value = gpr.name; draw(); setName();
    const pl = SRC.plans.find((x) => x.project_id === gpr.id); if (pl) $('#nkPlan').value = pl.id;
    // Projekt steht oben fest – keine zweite Projektsuche im Dialog
    $('#nkQ').style.display = 'none'; $('#nkList').style.display = 'none';
    $('#nkQ').insertAdjacentHTML('afterend', `<div class="nkFix"><b>${esc(gpr.name)}</b>${gpr.address ? `<small> · ${esc(gpr.address)}</small>` : ''}</div>`);
    const hi = bg.querySelector('.hint'); if (hi) hi.textContent = 'Für das oben gewählte Projekt.';
    $('#nkName').focus();
  }
}
/* ---------- Erklärung der Justage-Empfehlung ---------- */
function juWarum() {
  const J = B.calc.justage || {}; if (!J.bt_kw) return;
  const E = juEmpfehlung(J), n = Object.values(B.calc.kg2 || {}).filter((x) => x.quelle === 'bauteile').length, cov = Math.round(J.bt_kw / ((J.bt_kw + J.rest_kw) || 1) * 100);
  const z = (c, t) => `<tr${c ? ' style="background:rgba(127,127,127,.12);font-weight:600"' : ''}><td>${t[0]}</td><td>${t[1]}</td></tr>`;
  modalBox(`<h3>Warum diese Empfehlung?</h3>
    <p>Hat eine Kostengruppe der 2. Ebene Bauteile mit Menge und Einheitspreis, ersetzen sie dort den Anteil aus den Raumtyp-Kennwerten. Die übrigen Gruppen stehen weiter beim Kennwert. Weichen beide stark voneinander ab, ergibt die Summe einen <b>Mischwert aus zwei Preisniveaus</b> – die Justage legt fest, wie die übrigen Gruppen damit umgehen.</p>
    <div class="tbl" style="margin:.6rem 0"><table><tbody>
      <tr><td>Gruppen mit Bauteilen</td><td class="r">${n} (${cov} % des Bauwerks)</td></tr>
      <tr><td>Kennwert-Anteil dieser Gruppen</td><td class="r num">${eur(J.bt_kw)}</td></tr>
      <tr><td>Bauteile dieser Gruppen</td><td class="r num">${eur(J.bt_wert)}</td></tr>
      <tr><td>Abweichung</td><td class="r"><b>${vglTxt(J.bt_wert, J.bt_kw)}</b></td></tr></tbody></table></div>
    <h4 style="margin:.8rem 0 .3rem">So entscheidet die App</h4>
    <div class="tbl"><table><thead><tr><th>Lage</th><th>Empfehlung</th></tr></thead><tbody>
      ${z(E.v === 'kw' && J.k >= 0.9 && J.k <= 1.1, ['Abweichung höchstens 10 %', 'Kennwert-Anteil unverändert – beide Preisniveaus passen'])}
      ${z(E.s.startsWith('Kennwert-Anteil lassen'), ['nur 1 Gruppe oder unter 25 % des Bauwerks bepreist', 'Kennwert-Anteil lassen – zu wenig, um aufs ganze Gebäude zu schließen'])}
      ${z(E.s.startsWith('Bauteile auf'), ['Bauteile günstiger als der Kennwert', 'meist fehlen Positionen (Fenster, Beläge, Abdichtung …) – erst vervollständigen'])}
      ${z(E.v === 'angl', ['mind. 2 Gruppen und 25 % bepreist, Bauteile 10–60 % teurer', 'übrige Gruppen angleichen – die Bauteile zeigen das tatsächliche Preisniveau'])}
      ${z(E.v === 'preis', ['Bauteile mehr als 60 % teurer, noch keine Justage', 'Preisstand/Region anpassen – die Kennwerte sind vermutlich veraltet'])}
    </tbody></table></div>
    <h4 style="margin:.8rem 0 .3rem">Hier: ${esc(E.s)}</h4><p class="hint" style="margin:0">${esc(E.t)}</p>
    <h4 style="margin:.8rem 0 .3rem">Die Möglichkeiten</h4>
    <ul style="margin:0;padding-left:1.2rem;font-size:.92rem"><li><b>Kennwert-Anteil unverändert</b> – sicher, solange Bauteile und Kennwerte zusammenpassen.</li>
      <li><b>an die Bauteile angleichen</b> – überträgt die Abweichung der bepreisten auf alle übrigen Gruppen.</li>
      <li><b>eigener Faktor</b> – wenn du das Preisniveau des Projekts besser kennst (z. B. aus Angeboten).</li>
      <li><b>Regionalfaktor / Preisstand</b> – ändert alle Kennwerte (Ort, Baupreisindex); die Bauteile bleiben, wie sie sind.</li></ul>
    <p class="hint">Die Empfehlung ist eine Hilfe. Entscheidend bleibt deine fachliche Einschätzung des Projekts.</p>
    <div class="acts"><button class="btn" data-m="x">Schließen</button>${E.v === 'preis' ? `<button class="btn pri" data-m="ok">Preisstand auf ${E.p} % setzen</button>` : `<button class="btn pri" data-m="ok">Empfehlung übernehmen</button>`}</div>`, (m, bg, close) => {
    if (m === 'x') { close(); return; }
    close(); const j = B.data.justage ||= { region: 100, preis: 100, rest: 'kw', f: 1 };
    if (E.v === 'preis') { j.preis = Math.max(30, Math.min(400, E.p)); j.rest = 'kw'; } else j.rest = E.v;
    toast('Empfehlung übernommen.'); changed();
  }).querySelector('.modal').style.width = 'min(760px, 96vw)';
}
/* ---------- Kennwerte importieren, Kostendatenbanken ---------- */
function vgImport() {
  modalBox(`<h3>Kennwerte importieren</h3><p class="hint">Export aus einer Kostendatenbank oder eine eigene Liste als Excel (.xlsx) oder CSV: je Zeile eine Bezeichnung (z. B. „Büro“, „Wohnen“, „Sanitär“ – wie die Raumtypen) und ein Kennwert in € je m² Raumfläche (KG 300 + 400, netto). Weitere Spalten werden ignoriert.</p>
    <div class="fm" style="display:grid;gap:.6rem"><label>Quelle<input id="iQ" placeholder="z. B. BKI Baukosten 2026, Büro-Neubau" style="width:100%"></label>
    <label>Kostenstand<input type="month" id="iS" value="${new Date().toISOString().slice(0, 7)}"></label><input type="file" id="iF" accept=".xlsx,.csv,.txt"></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Importieren</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    const f = $('#iF', bg).files[0]; if (!f) { toast('Bitte eine Datei wählen.', true); return; }
    const fd = new FormData(); fd.append('file', f); fd.append('quelle', $('#iQ', bg).value.trim() || f.name); fd.append('stand', $('#iS', bg).value);
    try { const r = await fetch('api/vergleich/import', { method: 'POST', body: fd }); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); VG = j; close(); toast(`${j.n} Kennwerte importiert.`); render(); } catch (e) { toast(e.message, true); }
  });
}
async function diensteDialog(host) {
  let D; try { D = await api('api/dienste'); } catch (e) { toast(e.message, true); return; }
  const dis = D.admin ? '' : ' disabled';
  boxIn(host)(`<h3>Kostendatenbanken (kostenpflichtig)</h3><p class="hint">Für genauere Kennwerte nach DIN 276 bieten diese Anbieter Daten aus abgerechneten Projekten an. Eine direkte Abfrage geben sie nur für Software-Partner frei – bis dahin die Kennwerte dort als Excel/CSV exportieren und unter „Kennwerte importieren“ einlesen. Die Zugangsdaten werden hier schon hinterlegt (nur der Administrator sieht und ändert sie; Kennwörter werden nie angezeigt).</p>
    ${D.dienste.map((x) => `<div class="card" style="margin:.6rem 0;padding:.7rem .9rem"><label class="chk" style="font-weight:600"><input type="checkbox" data-dk="${x.key}" data-df="an"${x.an ? ' checked' : ''}${dis}> ${esc(x.name)}</label>
      <p class="hint" style="margin:.2rem 0 .5rem">${esc(x.info)} · <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace('https://', ''))}</a></p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem"><label>Benutzer<input data-dk="${x.key}" data-df="user" value="${esc(x.user)}"${dis}></label>
      <label>Kennwort<input type="password" data-dk="${x.key}" data-df="pass" placeholder="${x.pass_set ? 'hinterlegt' : ''}" autocomplete="new-password"${dis}></label>
      <label>API-Schlüssel / Lizenz<input type="password" data-dk="${x.key}" data-df="key" placeholder="${x.key_set ? 'hinterlegt' : ''}" autocomplete="new-password"${dis}></label></div></div>`).join('')}
    <div class="acts"><button type="button" class="btn" data-bph-verlauf="bk:dienste" style="margin-right:auto">🕘 Verlauf</button><button class="btn" data-m="x">${D.admin ? 'Abbrechen' : 'Schließen'}</button>${D.admin ? '<button class="btn pri" data-m="ok">OK</button>' : ''}</div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    const b = {}; bg.querySelectorAll('[data-dk]').forEach((el) => { const o = b[el.dataset.dk] ||= {}; o[el.dataset.df] = el.type === 'checkbox' ? el.checked : el.value; });
    try { await api('api/dienste', 'PUT', b); if (!host) close(); toast('Zugänge gespeichert.'); } catch (e) { toast(e.message, true); }
  });
}
/* ---------- Hinweis beim Öffnen (abschaltbar) ---------- */
async function hinweis() {
  let K = null; try { K = await api('api/bp/konto'); } catch { return; }
  if ((K.hinweise_aus || []).includes('baukosten')) return;
  modalBox(`<h3>Baukosten – bitte kurz lesen</h3>
    <p>Die App ermittelt Kosten nach <b>DIN 276:2018-12</b> (Stufen Kostenrahmen bis Kostenfeststellung, Gliederung bis zur 3. Ebene, Kostenstand und Kostenrisiken gesondert ausgewiesen). Unter „Prüfung“ steht, was für die gewählte Stufe nach der Norm noch fehlt.</p>
    <p><b>Die Kennwerte sind Annahmen</b>: vorgegebene Beispielwerte, eigene Werte des Büros, Vergleichsobjekte oder importierte Werte aus Kostendatenbanken. Die Ergebnisse sind nur so gut wie diese Kennwerte, die Flächen und die eingetragenen Mengen – bitte jede Ermittlung fachlich prüfen, bevor sie den Bauherrn erreicht. Vorschläge der KI sind Hilfen, keine Kalkulation.</p>
    <p><b>Besser werden</b>: abgerechnete Projekte unter „Kosten → Vergleichsobjekte“ speichern, Kennwerte aus BKI & Co. importieren (Zugänge unter „Kostendatenbanken“), Kennwerte mit Region und Preisstand justieren.</p>
    <label class="chk" style="margin-top:.6rem"><input type="checkbox" id="hwAus"> nicht mehr anzeigen</label>
    <div class="acts"><button class="btn pri" data-m="ok">Verstanden</button></div>`, async (m, bg, close) => {
    if ($('#hwAus', bg).checked) { try { await api('api/bp/konto', 'PUT', { hinweise_aus: [...(K.hinweise_aus || []), 'baukosten'] }); } catch { /* egal */ } }
    close();
  });
}
(async () => {
  const me = await api('api/me'); applyLook(me);
  const conf = await api('api/platform');
  await header('Baukosten', me, conf);
  BPHead.appEinstellungen([{ key: 'raumtypen', label: 'Raumtypen & Kennwerte', render: (h) => typesDialog(h) },
    { key: 'dienste', label: 'Kostendatenbanken', render: (h) => diensteDialog(h) }]);
  BPHead.onKi(() => { CHECK = null; if (tab === 'pruefung') render(); });
  const hb = /^#bk=(\d+)/.exec(location.hash);   // Link aus der Verwaltung: diese Kostenermittlung öffnen
  if (!TABS.some((t) => t[0] === tab)) tab = 'uebersicht';
  if (hb) history.replaceState(null, '', location.pathname + '#' + tab);
  await loadList(hb ? +hb[1] : undefined);
  api('api/vergleich').then((v) => { VG = v; if (B && tab === 'kosten') render(); }).catch(() => {});
  hinweis();
})().catch((e) => toast(e.message, true));
async function verlauf() {
  if (!B || !window.BPHead) return;
  clearTimeout(saveT); if (saveEl().textContent.startsWith('Nicht')) await saveNow();
  BPHead.verlauf({ bereich: 'bkp:' + B.id, nach: () => openBk(B.id) });
}
window.bpNachVerlauf = () => (B ? openBk(B.id) : location.reload());
document.addEventListener('click', (e) => { if (e.target.closest('#verlBtn')) verlauf(); });
/* Kostenansätze aus einer anderen Kostenermittlung übernehmen – wie jede Änderung mit ↶ Rückgängig umkehrbar */
$('#ansBtn').onclick = () => {
  if (!B) return;
  if (LIST.length < 2) { toast('Es gibt noch keine andere Kostenermittlung, aus der sich etwas übernehmen ließe.'); return; }
  const L = LIST.filter((x) => x.id !== B.id).sort((a, b) => (!!a.archived - !!b.archived) || String(b.updated || '').localeCompare(String(a.updated || '')));
  let Q = null;
  const TEILE = [
    ['kw', 'Kennwerte der Raumtypen', 'Kosten je m² für jeden Raumtyp (auch eigene Raumtypen jenes Projekts)'],
    ['proz', 'Prozente und Justage', 'Aufteilung KG 300/400 und der Gruppen, Baunebenkosten, Preissteigerung, Risikozuschlag, Regionalfaktor und Preisstand'],
    ['pausch', 'Pauschale Positionen', 'KG 200, Abbruch, Außenanlagen usw. mit Beträgen – ersetzt die Positionen hier'],
    ['bt', 'Bauteile mit Einheitspreisen', 'werden angehängt; Mengen nur auf Wunsch (sonst hier neu ermitteln)'],
  ];
  const info = (k) => {
    if (!Q) return '';
    const d = Q.data || {};
    if (k === 'kw') return `${Object.keys(d.types || {}).length} Raumtypen`;
    if (k === 'proz') return `KG 300 ${d.kg ? d.kg['300'] : '–'} % · Nebenkosten ${d.nk ?? '–'} % · Steigerung ${d.rate ?? '–'} %/Jahr${d.risiko ? ` · Risiko ${d.risiko} %` : ''}`;
    if (k === 'pausch') { const it = (d.items || []).filter((x) => x.amount != null); return `${(d.items || []).length} Positionen${it.length ? `, ${it.length} mit Betrag (${eur(it.reduce((a, x) => a + x.amount, 0))})` : ''}`; }
    if (k === 'bt') return `${(d.bauteile || []).length} Bauteile`;
    return '';
  };
  const html = () => `<h3>Kostenansätze übernehmen</h3>
    <p class="hint" style="margin:0 0 .6rem">Aus einer anderen Kostenermittlung in „${esc(B.name)}“. Räume und Pläne bleiben, wie sie sind. ↶ Rückgängig nimmt die Übernahme wieder zurück.</p>
    <div class="row"><label for="ansQ">Aus</label><button type="button" class="pick" id="ansQ" style="width:100%"></button></div>
    ${Q ? `<p class="hint" style="margin:.2rem 0 .5rem">${esc(bkSub(Q))}${Q.calc && Q.calc.total ? ' · gesamt ' + eur(Q.calc.total) : ''}</p>` : ''}
    <div style="display:flex;flex-direction:column;gap:.45rem;margin:.4rem 0">${TEILE.map(([k, l, t]) => `<label class="chk" style="align-items:flex-start;gap:.5rem"><input type="checkbox" style="flex:none" data-ans="${k}"${k !== 'pausch' ? ' checked' : ''}${Q ? '' : ' disabled'}><span><b>${l}</b>${Q ? ` <small class="pill">${esc(info(k))}</small>` : ''}<small class="hint" style="display:block">${t}</small></span></label>`).join('')}
      <label class="chk" style="margin-left:1.7rem"><input type="checkbox" id="ansMenge"${Q ? '' : ' disabled'}> Mengen der Bauteile mit übernehmen</label></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok"${Q ? '' : ' disabled'}>Übernehmen</button></div>`;
  const bg = modalBox(html(), (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok' || !Q) return;
    const w = new Set([...bg.querySelectorAll('[data-ans]:checked')].map((x) => x.dataset.ans));
    if (!w.size) { toast('Bitte mindestens einen Teil wählen.', true); return; }
    const d = B.data, q = JSON.parse(JSON.stringify(Q.data || {})), done = [];
    histTrack();
    if (w.has('kw')) {
      Object.entries(q.types || {}).forEach(([k, v]) => { if (d.types[k]) d.types[k].kw = v.kw; else d.types[k] = { label: v.label, kw: v.kw, eigen: true }; });
      done.push('Kennwerte');
    }
    if (w.has('proz')) {
      ['kg', 'nk', 'rate', 'kg2', 'risiko', 'risiko_text', 'justage'].forEach((k) => { if (q[k] !== undefined) d[k] = q[k]; });
      done.push('Prozente');
    }
    if (w.has('pausch')) { d.items = q.items || []; done.push('Pauschalen'); }
    if (w.has('bt')) {
      const mit = bg.querySelector('#ansMenge').checked, t0 = Date.now();
      const neu = (q.bauteile || []).map((b, k) => ({ ...b, id: 'u' + t0 + '_' + k, src: '', menge: mit ? b.menge : 0, formel: mit ? b.formel : '', geschoss: mit ? b.geschoss : '',
        notiz: [b.notiz, `aus „${Q.name}“`].filter(Boolean).join(' · ').slice(0, 500) }));
      d.bauteile = (d.bauteile || []).concat(neu); done.push(`${neu.length} Bauteile`);
    }
    close(); CHECK = null; HIST.next = 'Ansätze übernommen'; histTrack(); AS.ans = 'ja'; asSave(); assist();
    changed();
    toast(`Aus „${Q.name}“ übernommen: ${done.join(', ')}. ↶ Rückgängig nimmt es zurück.`);
  });
  /* Auswahl mit Suche (Tippen vervollständigt), gruppiert nach Projekt – das eigene zuerst, Archiv zuletzt */
  const proj = (x) => (x.project && x.project.name) || 'ohne Projekt';
  const knopf = () => { const k = bg.querySelector('#ansQ'); if (k) pickButton(k, { title: Q ? Q.name : 'Kostenermittlung wählen …', sub: Q ? proj(Q) : 'aus diesem oder einem anderen Projekt – tippen sucht' }); };
  knopf();
  bg.addEventListener('click', (e) => {
    const k = e.target.closest('#ansQ'); if (!k) return;
    const eigen = (x) => x.project_id && x.project_id === B.project_id;
    const R = L.slice().sort((a, b) => (!!a.archived - !!b.archived) || (eigen(b) - eigen(a)) || proj(a).localeCompare(proj(b), 'de'));
    pickMenu(k, { search: 'Projekt oder Kostenermittlung suchen …', empty: 'Nichts gefunden.',
      items: R.map((x) => ({ value: x.id, title: x.name, sub: [STUFE_N(x.stufe), x.total ? eur(x.total) : ''].filter(Boolean).join(' · '), group: x.archived ? 'Archiv' : eigen(x) ? 'Dieses Projekt' : proj(x), find: proj(x) + ' ' + x.name, on: Q && Q.id === x.id })),
      onPick: async (id) => { Q = null; try { Q = await api('api/bk/' + id); } catch (er) { toast(er.message, true); } bg.querySelector('.modal').innerHTML = html(); knopf(); } });
  });
};
