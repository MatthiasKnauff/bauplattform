'use strict';
/* Verwaltung → Kataloge erzeugen (Server: Baudaten, baudaten_ki.py): Umfang der Kataloge, Allplan-Kataloge neu übertragen
   (Baustein AllplanKnoepfe aus kataloge.js) und mit Claude ergänzen – Vorbemerkungen und fehlende Positionen als Prüfliste;
   übernommen wird nur, was angehakt ist (mit Rückgängig). Gehört zu admin.html (gemeinsame Namen: api, esc, $, data, stNav). */
const KBD = '../baudaten/';
const KE = { S: null, V: null };
const keZahl = (n) => (+n || 0).toLocaleString('de-DE');

async function renderKataloge() {
  $('#main').innerHTML = stNav() + '<p class="mute">Lade …</p>';
  try { KE.S = await api(KBD + 'api/kataloge/stand'); } catch (e) { $('#main').innerHTML = stNav() + `<p class="err">${esc(e.message)}</p>`; return; }
  keZeichnen();
}
function keZeichnen() {
  const S = KE.S, C = S.claude, ohne = S.lbs.filter((l) => !l.vorbem);
  const lbWahl = (id) => `<select id="${id}" data-bp-auswahl data-ph="Leistungsbereich suchen …">${S.lbs.map((l) => `<option value="${esc(l.nr)}">${esc(l.nr)} ${esc(l.name)}${l.vorbem ? '' : ' – ohne Vorbemerkung'}</option>`).join('')}</select>`;
  $('#main').innerHTML = `${stNav()}
    <p class="mute" style="margin-top:-.6rem">Positionen ${keZahl(S.positionen)} · eigene Positionen ${keZahl(S.eigene)} · Bauteil-Vorlagen ${keZahl(S.vorlagen)} · Elemente ${keZahl(S.elemente)} · Vorbemerkungen ${keZahl(S.vorbemerkungen)}.
      Die Preise der Elemente rechnen sich bei jedem Aufruf aus den heutigen Positionspreisen – neu berechnen ist nicht nötig.</p>
    <section class="card st"><h2>Allplan-Kataloge neu erstellen</h2><div id="keAp"></div></section>
    <section class="card st"><h2>Mit KI ergänzen (Claude)</h2>
      <p class="mute">Claude schlägt vor – eigene Texte, keine Sätze aus lizenzierten Katalogen. Die Vorschläge kommen als Prüfliste; übernommen wird nur, was du anhakst. Ein Lauf kostet je nach Umfang etwa 2–15 Cent.</p>
      ${C.da ? `<p class="mute">${C.quelle === 'buero' ? 'Nutzt den Claude-Zugang des Büros (Verwaltung → KI).' : 'Nutzt den Schlüssel, der nur für die Kataloge hinterlegt ist.'} Modell: ${esc(C.modelle[C.modell] || C.modell)}${C.quelle === 'kataloge' ? ' · <button type="button" class="btn sm" data-kekey="weg">Schlüssel entfernen</button>' : ''}</p>`
        : `<div class="ke-key"><b>Claude ist noch nicht eingerichtet.</b> Hier einen Schlüssel nur für die Kataloge hinterlegen (er bleibt auf dem Server und wird nie wieder angezeigt) – oder unter Verwaltung → KI für alle Apps.
          <div class="bar" style="margin-top:.4rem"><input type="password" id="keKey" placeholder="sk-ant-…" autocomplete="off" style="min-width:16rem"><select id="keMod">${Object.entries(C.modelle).map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select><button type="button" class="btn pri" data-kekey="neu">Speichern &amp; testen</button></div></div>`}
      <div class="ke-g${C.da ? '' : ' ke-aus'}">
        <div class="ke-k"><h3>Vorbemerkungen</h3><p class="mute">Neue Vorbemerkung für einen Leistungsbereich – oder die vorhandene überarbeiten (der bisherige Text steht daneben zum Vergleich).${ohne.length ? ` ${ohne.length} Bereiche haben noch keine.` : ' Alle Bereiche haben eine.'}</p>
          <div class="bar">${lbWahl('keVbLb')}<input id="keVbWort" placeholder="Schwerpunkt (optional), z. B. Passivhaus, Bestand"><button type="button" class="btn pri" data-kev="vorbem"${C.da ? '' : ' disabled'}>Vorschlag holen</button></div></div>
        <div class="ke-k"><h3>Fehlende Positionen</h3><p class="mute">Bis zu 12 Positionen, die im gewählten Leistungsbereich fehlen – mit Langtext, Einheit, Kostengruppe und Preisspanne. Übernommen werden sie als eigene Positionen.</p>
          <div class="bar">${lbWahl('kePoLb')}<input id="kePoWort" placeholder="Was fehlt? (optional), z. B. Brandschutzklappen"><button type="button" class="btn pri" data-kev="positionen"${C.da ? '' : ' disabled'}>Vorschläge holen</button></div></div>
        <div class="ke-k"><h3>Bauteil-Vorlage mit Schichten</h3><p class="mute">Neuer Aufbau für den Baukasten (z. B. „Holzrahmenwand Passivhaus“) – Schichten und Optionen nur aus vorhandenen Positionen. Daraus entstehen die Elemente für Baukosten, Ausschreibung und Allplan.</p>
          <div class="bar"><select id="keVlKg" data-bp-auswahl data-ph="Kostengruppe suchen …">${(S.kgs || []).map((k) => `<option value="${k.kg}">${k.kg} ${esc(k.name)}${k.n ? ` (${k.n} Vorlagen)` : ''}</option>`).join('')}</select><input id="keVlWort" placeholder="Was für ein Aufbau? z. B. Holzrahmenwand Passivhaus"><button type="button" class="btn pri" data-kev="vorlage"${C.da ? '' : ' disabled'}>Vorschlag holen</button></div></div>
      </div>
      <div id="keErg"></div></section>`;
  AllplanKnoepfe($('#keAp'), { bd: KBD, admin: true });
  if (ohne.length) { const s = $('#keVbLb'); if (s) s.value = ohne[0].nr; }
}
function keErgebnis() {
  const V = KE.V, el = $('#keErg'); if (!el) return;
  if (!V) { el.innerHTML = ''; return; }
  if (V.art === 'vorlage') {
    const v = V.vorlage, E = V.elemente, ep = E.map((e) => e.ep_mittel), f2 = (x) => x.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    el.innerHTML = `<div class="ke-erg"><h3>Vorschlag: Bauteil-Vorlage in ${esc(V.kg)} ${esc(V.kg_name)}</h3>
      <div class="ke-2"><label>Name<input id="keVlN" value="${esc(v.name)}"></label><label>Einheit<input id="keVlE" value="${esc(v.einheit)}"></label></div>
      <p class="mute" style="margin:.4rem 0">${esc(v.lang)}${v.bezug ? ` · Menge: ${esc(v.bezug)}` : ''}</p>
      ${v.schichten.map((s, i) => `<div class="ke-s"><b>${esc(s.name)}</b>${s.optionen.map((o, j) => `<label class="ke-o"><input type="checkbox" data-keo="${i}.${j}" checked><span><b>${esc(o.k || 'ohne')}</b>${o.std ? ' <span class="pill">Standard</span>' : ''} ${esc(o.t)}<small>${esc((o.teile_txt || []).join(' + '))}</small></span></label>`).join('')}</div>`).join('')}
      <p class="mute">${E.length} Standardelemente${ep.length ? `, ${f2(Math.min(...ep))} – ${f2(Math.max(...ep))} € je ${esc(v.einheit)} (mittel, heutiger Stand)` : ''}. Abgewählte Optionen kommen nicht in die Vorlage.</p>
      <div class="bar"><button type="button" class="btn" data-kez="weg">Verwerfen</button><button type="button" class="btn pri" data-kez="vl">Übernehmen</button></div></div>`;
    return;
  }
  if (V.art === 'vorbem') {
    el.innerHTML = `<div class="ke-erg"><h3>Vorschlag: Vorbemerkung ${esc(V.lb)} ${esc(V.name)}</h3>
      <div class="ke-2"><label>Titel<input id="keVbT" value="${esc(V.vorschlag.titel)}"></label><span></span>
      <label>Vorschlag (änderbar)<textarea id="keVbX" rows="16">${esc(V.vorschlag.text)}</textarea></label>
      <div><b>Bisher</b>${V.bisher ? `<pre class="ke-alt">${esc(V.bisher.text)}</pre>` : '<p class="mute">Noch keine Vorbemerkung.</p>'}</div></div>
      <div class="bar"><button type="button" class="btn" data-kez="weg">Verwerfen</button><button type="button" class="btn pri" data-kez="vb">Übernehmen</button></div></div>`;
    return;
  }
  el.innerHTML = `<div class="ke-erg"><h3>Vorschläge: ${esc(V.lb)} ${esc(V.name)}</h3>${V.positionen.length ? `<table class="ke-t"><thead><tr><th></th><th>Kurztext / Langtext</th><th>EH</th><th>KG</th><th class="r">EP von – mittel – bis</th></tr></thead><tbody>
    ${V.positionen.map((p, i) => `<tr><td><input type="checkbox" data-kep="${i}" checked></td><td><b>${esc(p.kurz)}</b><small>${esc(p.lang)}</small></td><td>${esc(p.einheit)}</td><td>${esc(p.kg)}</td><td class="r">${[p.ep_von, p.ep_mittel, p.ep_bis].map((x) => (x == null ? '–' : x.toLocaleString('de-DE', { minimumFractionDigits: 2 }))).join(' – ')}</td></tr>`).join('')}</tbody></table>` : '<p class="mute">Keine Vorschläge – der Bereich scheint vollständig.</p>'}
    <div class="bar"><button type="button" class="btn" data-kez="weg">Verwerfen</button>${V.positionen.length ? '<button type="button" class="btn pri" data-kez="pos">Angehakte übernehmen</button>' : ''}</div></div>`;
}
$('#main').addEventListener('click', async (e) => {
  if (tab !== 'einstellungen' || data.stab !== 'kataloge') return;
  const k = e.target.closest('[data-kekey],[data-kev],[data-kez]'); if (!k) return;
  try {
    if (k.dataset.kekey === 'neu') { const v = $('#keKey').value.trim(); if (!v) return toast('Bitte den Schlüssel eintragen.', true); k.disabled = true; k.textContent = 'prüfe …';
      try { KE.S.claude = (await api(KBD + 'api/kataloge/schluessel', 'PUT', { key: v, model: $('#keMod').value })).claude; toast('Schlüssel funktioniert und ist gespeichert.'); keZeichnen(); } finally { k.disabled = false; } return; }
    if (k.dataset.kekey === 'weg') { if (!(await bpFrage('Den Schlüssel nur für die Kataloge entfernen?', { ok: 'Entfernen' }))) return; KE.S.claude = (await api(KBD + 'api/kataloge/schluessel', 'PUT', { key: '' })).claude; keZeichnen(); return; }
    if (k.dataset.kev) {
      const art = k.dataset.kev, vb = art === 'vorbem', alt = k.textContent;
      if (art === 'vorlage' && !$('#keVlWort').value.trim()) return toast('Bitte beschreiben, was für ein Aufbau gesucht ist.', true);
      k.disabled = true; k.textContent = 'Claude schreibt … (bis zu einer Minute)';
      try {
        if (art === 'vorlage') { const kg = $('#keVlKg').value; KE.V = { art, kg, ...(await api(KBD + 'api/kataloge/vorlage-vorschlag', 'POST', { kg, stichwort: $('#keVlWort').value })) }; }
        else KE.V = await api(KBD + 'api/kataloge/vorschlag', 'POST', { art, lb: $(vb ? '#keVbLb' : '#kePoLb').value, stichwort: $(vb ? '#keVbWort' : '#kePoWort').value });
        keErgebnis(); $('#keErg').scrollIntoView({ block: 'start', behavior: 'smooth' }); } finally { k.disabled = false; k.textContent = alt; }
      return;
    }
    if (k.dataset.kez === 'weg') { KE.V = null; keErgebnis(); return; }
    if (k.dataset.kez === 'vl') {
      const V = KE.V, v = JSON.parse(JSON.stringify(V.vorlage));
      v.schichten = v.schichten.map((s, i) => ({ ...s, optionen: s.optionen.filter((o, j) => { const c = $('#keErg').querySelector(`[data-keo="${i}.${j}"]`); return c && c.checked; }).map(({ teile_txt, ...o }) => o) })).filter((s) => s.optionen.length);
      if (!v.schichten.length) return toast('Mindestens eine Option anhaken.', true);
      const r = await api(KBD + 'api/kataloge/vorlage', 'PUT', { ...v, kg: V.kg, name: $('#keVlN').value.trim() || v.name, einheit: $('#keVlE').value.trim() || v.einheit });
      rueckgaengig(`Vorlage ${r.id} mit ${r.elemente} Elementen angelegt`, async () => { await api(KBD + 'api/kataloge/vorlage/' + encodeURIComponent(r.id), 'DELETE'); renderKataloge(); });
      KE.V = null; await renderKataloge(); toast(`Vorlage ${r.id} angelegt – ${r.elemente} Elemente. Die Allplan-Kataloge enthalten sie nach dem nächsten Übertragen.`); return;
    }
    if (k.dataset.kez === 'vb') {
      const V = KE.V, r = await api(KBD + 'api/kataloge/vorbemerkung/' + encodeURIComponent(V.lb), 'PUT', { titel: $('#keVbT').value, text: $('#keVbX').value });
      rueckgaengig(`Vorbemerkung ${V.lb} übernommen`, async () => { await api(KBD + 'api/kataloge/vorbemerkung/' + encodeURIComponent(V.lb), 'PUT', r.vorher); renderKataloge(); });
      KE.V = null; await renderKataloge(); toast('Vorbemerkung übernommen.'); return;
    }
    if (k.dataset.kez === 'pos') {
      const V = KE.V, wahl = V.positionen.filter((p, i) => { const c = $('#keErg').querySelector(`[data-kep="${i}"]`); return c && c.checked; }); if (!wahl.length) return toast('Nichts angehakt.', true);
      const neu = [];
      for (const p of wahl) neu.push((await api(KBD + 'api/position', 'POST', { lb_nr: V.lb, titel: `${V.lb} ${V.name}`, kurz: p.kurz, lang: p.lang, einheit: p.einheit, kg: p.kg, ep_von: p.ep_von, ep_mittel: p.ep_mittel, ep_bis: p.ep_bis, genauigkeit: 'C', hinweis: 'Vorschlag der KI (Claude) – bitte prüfen' })).id);
      rueckgaengig(`${neu.length} Positionen übernommen`, async () => { for (const id of neu) await api(KBD + 'api/position/' + id, 'DELETE'); renderKataloge(); });
      KE.V = null; await renderKataloge(); toast(`${neu.length} Positionen als eigene Positionen übernommen.`);
    }
  } catch (er) { toast(er.message, true); }
});
