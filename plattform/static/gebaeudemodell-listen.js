'use strict';
/* Gebäudemodell – Listen aus dem Modell (GO 16.11.2026, Fragen 7 und 8): Fenster & Türen einzeln (Nummer, Art, Geschoss, Raum, Maße,
   Brüstung, Antwort und Aufbau der Zeile), Räume mit Boden, Wänden und Decke, Anweisungen an das Modell (zurücknehmen).
   Gemeinsame Namen mit gebaeudemodell.js (V, PID, zuBauteil, anweisung, leiste). Antippen springt in die Bauteile und markiert die Zeile. */
const gmZahl = (v) => (v == null ? '–' : bpZahl(v, 0, 2));
const GM_WORT = { offen: 'offen', bleibt: 'bleibt', instandsetzen: 'instandsetzen', erneuern: 'erneuern', neu: 'neu', abbruch: 'Abbruch', pruefen: 'prüfen lassen' };

function gmZeileVon(L, mitglied, filter) {   // wirksame Zeile eines Elements/Raums: abgeleitete (Anweisung) vor der Basis-Zeile
  const Z = (L.zeilen || []).filter((z) => (z.mitglieder || []).includes(mitglied) && (!filter || filter(z)));
  return Z.find((z) => z.abgeleitet) || Z[0] || null;
}
function gmGruppen(liste, schluessel) {   // nach Geschoss gruppiert, Reihenfolge wie im Modell
  const G = new Map(); liste.forEach((x) => { const k = schluessel(x) || '–'; if (!G.has(k)) G.set(k, []); G.get(k).push(x); }); return [...G.entries()];
}

async function gmListe(art) {
  const D = await api(`api/bp/modell/${PID}`), L = (D.modell || {}).bauteilliste || {};
  V.className = 'bp-voll';
  if ((art === 'fenster' || art === 'raeume') && gmHandModus(L)) return gmMaske(art, L);   // ohne Plan: Arbeitsmaske (gebaeudemodell-hand.js)
  if (art === 'fenster') {
    const E = L.elemente || [];
    if (!E.length) {
      V.innerHTML = `<div class="gm-hin"><span>Im Modell sind noch keine Fenster und Türen einzeln. Ein IFC-Planstand bringt sie mit (Bauteile → Planstand einlesen). Ohne IFC: die Fenster- &amp; Türliste der Ausschreibung einmal ins Modell holen.</span>
        <button type="button" class="btn" data-gmtl>Aus der Türliste übernehmen</button></div>`;
      return;
    }
    const R = Object.fromEntries((L.raeume || []).map((r) => [r.nr, r]));
    const AB = await api(`api/bp/modell/${PID}/elemente/abweichungen`).catch(() => ({}));   // D1: in der Türliste bewusst anders als im Plan
    const ab = (e, k, txt) => { const a = (AB[String(e.id)] || {})[k]; return a ? `<span class="bph-q e" title="Türliste: ${esc(a.liste)} · Plan: ${esc(a.plan || '–')}">Türliste: ${esc(a.liste)}</span> <small class="mute">Plan: ${txt}</small>` : txt; };
    const nAb = Object.keys(AB).length;
    V.innerHTML = `<div class="gm-hin"><span>${E.length} Elemente aus dem Modell – dieselbe Liste speist die Fenster- &amp; Türliste der Ausschreibung (über ihre Linie). Antippen zeigt die Zeile in den Bauteilen.</span></div>
      ${nAb ? `<div class="gm-hin"><span><b>${nAb} Element${nAb === 1 ? '' : 'e'}</b> in der Türliste anders als im Plan – der Plan bleibt, wie gezeichnet. Für den Zeichner:</span><button type="button" class="btn" data-gmzeichner>An den Zeichner …</button></div>` : ''}
      <table class="gm-l bp-baum"><thead><tr><th>Nr.</th><th>Art</th><th>Raum</th><th class="r">Breite</th><th class="r">Höhe</th><th class="r">Brüstung</th><th>außen</th><th>Antwort</th><th>Aufbau</th></tr></thead><tbody>
      ${gmGruppen(E, (e) => e.geschoss).map(([g, X]) => `<tr class="gh">${bpBaum.zelle({ tiefe: 0, html: `<b>${esc(g)}</b> <small class="mute">${X.length}</small>` })}<td colspan="8"></td></tr>${X.map((e) => {
        const z = gmZeileVon(L, String(e.id));
        return `<tr data-gmz="${esc(z ? z.id : '')}">${bpBaum.zelle({ tiefe: 1, html: esc(e.nr || '–') })}<td>${esc(e.typ)}</td><td>${esc((e.raeume || []).map((n) => (R[n] ? `${n} ${R[n].name}` : n)).join(' → '))}</td>
          <td class="r">${ab(e, 'b', gmZahl(e.b))}</td><td class="r">${ab(e, 'h', gmZahl(e.h))}</td><td class="r">${ab(e, 'bruestung', gmZahl(e.bruestung))}</td><td>${e.aussen ? 'ja' : ''}</td><td>${z ? esc(GM_WORT[z.status] || z.status) : ''}</td><td class="kz" title="${esc(z ? z.kurz : '')}">${esc(z ? z.kurz : '')}</td></tr>`;
      }).join('')}`).join('')}</tbody></table>`;
    return;
  }
  if (art === 'raeume') {
    const R = L.raeume || [];
    if (!R.length) { V.innerHTML = '<div class="gm-hin"><span>Noch keine Räume im Modell – ein Planstand (IFC, DXF oder PDF mit Raumstempeln) bringt sie mit.</span></div>'; return; }
    const teil = (r, t) => { const z = gmZeileVon(L, r.nr, (x) => x.id.startsWith(`raum:${t}:`)); return z ? (z.kurz || GM_WORT[z.status] || '') : ''; };
    const zid = (r) => { const z = gmZeileVon(L, r.nr, (x) => x.id.startsWith('raum:boden:')); return z ? z.id : ''; };
    V.innerHTML = `<table class="gm-l bp-baum"><thead><tr><th>Nr.</th><th>Raum</th><th class="r">Fläche</th><th class="r">Höhe</th><th>Boden</th><th>Wände</th><th>Decke</th></tr></thead><tbody>
      ${gmGruppen(R, (r) => r.geschoss).map(([g, X]) => `<tr class="gh">${bpBaum.zelle({ tiefe: 0, html: `<b>${esc(g)}</b> <small class="mute">${X.length} Räume · ${gmZahl(X.reduce((a, r) => a + (r.flaeche || 0), 0))} m²</small>` })}<td colspan="6"></td></tr>
        ${X.map((r) => `<tr data-gmz="${esc(zid(r))}">${bpBaum.zelle({ tiefe: 1, html: esc(r.nr) })}<td>${r.ermittelt ? `<input class="gm-rn" data-gmrn="${esc(r.nr)}" value="${esc(r.name)}" aria-label="Name des Raums ${esc(r.nr)}"> <small class="mute" title="Das IFC enthielt keine Räume – aus den Wänden ermittelt. Namen hier vergeben; „IFC mit Maßnahmen ausgeben“ schreibt die Räume ins IFC.">ermittelt</small>` : esc(r.name)}</td><td class="r">${gmZahl(r.flaeche)} m²</td><td class="r">${gmZahl(r.hoehe)}</td>
          ${['boden', 'wand', 'decke'].map((t) => `<td class="kz" title="${esc(teil(r, t))}">${esc(teil(r, t))}</td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table>`;
    return;
  }
  const A = L.anweisungen || [];   // Anweisungen
  V.innerHTML = `<div class="gm-hin"><span>Anweisungen an das Modell teilen die Zeilen der Bauteile auf (z. B. Böden im EG mit Mosaikparkett). Sie gelten auch für neue Planstände. Zurücknehmen stellt die Zeilen wieder her.</span>
    <button type="button" class="btn primary" data-gmanw>＋ Anweisung …</button></div>
    ${A.length ? `<table class="gm-l"><thead><tr><th>Anweisung</th><th>Schritte</th><th>Von</th><th>Wann</th><th></th></tr></thead><tbody>${A.slice().reverse().map((a) => `<tr><td>${esc(a.text)}</td>
      <td class="kz">${esc(a.schritte.map((s) => (s.treffer || {}).name || s.material).join(' · '))}</td><td>${esc(a.wer || '')}</td><td>${esc(tag(a.wann))}</td>
      <td><button type="button" class="btn sm" data-gmanwweg="${esc(a.id)}">Zurücknehmen</button></td></tr>`).join('')}</tbody></table>` : '<p class="mute">Noch keine Anweisung.</p>'}`;
}

V.addEventListener('click', async (e) => {
  if (e.target.closest('input')) return;
  if (e.target.closest('[data-gmzeichner]')) {   // Liste zum Kopieren: Element, Feld, Türliste, Plan
    const D = await api(`api/bp/modell/${PID}`), E = Object.fromEntries((((D.modell || {}).bauteilliste || {}).elemente || []).map((x) => [String(x.id), x]));
    const AB = await api(`api/bp/modell/${PID}/elemente/abweichungen`), F = { b: 'Breite', h: 'Höhe', bruestung: 'Brüstung', nr: 'Nummer', geschoss: 'Geschoss' };
    const txt = Object.entries(AB).flatMap(([id, x]) => Object.entries(x).map(([k, v]) => `${(E[id] || {}).nr || id}: ${F[k] || k} ${v.plan || '–'} → ${v.liste}`)).join('\n');
    modalBox(`<h3>An den Zeichner</h3><p class="hint">In der Fenster- &amp; Türliste geändert, im Plan noch nicht – Plan → Türliste:</p><textarea readonly rows="10" style="width:100%">${esc(txt)}</textarea>
      <div class="acts"><button class="btn" data-m="kopie">Kopieren</button><button class="btn pri" data-m="zu">Schließen</button></div>`, async (m, bg, close) => { if (m === 'kopie') { try { await navigator.clipboard.writeText(txt); toast('Kopiert.'); } catch { bg.querySelector('textarea').select(); } } else close(); });
    return;
  }
  const r = e.target.closest('tr[data-gmz]'); if (r && r.dataset.gmz) return zuBauteil(r.dataset.gmz);
  if (e.target.closest('[data-gmanw]')) return anweisung();
  if (e.target.closest('[data-gmtl]')) {
    try { const d = await api(`api/bp/modell/${PID}/elemente/aus_tuerliste`, 'POST'); toast(`${d.n} Fenster und Türen aus der Türliste ins Modell übernommen.`); await gmListe('fenster'); } catch (er) { toast(er.message, true); }
    return;
  }
  const w = e.target.closest('[data-gmanwweg]'); if (!w) return;
  const a = w.dataset.gmanwweg;
  if (!(await bpFrage('Diese Anweisung zurücknehmen? Die Zeilen der Bauteile entstehen ohne sie neu.', { ok: 'Zurücknehmen' }))) return;
  try { await api(`api/bp/modell/${PID}/anweisung/${a}`, 'DELETE'); toast('Anweisung zurückgenommen.'); await gmListe('anweisungen'); } catch (er) { toast(er.message, true); }
});
V.addEventListener('change', async (e) => {   // Name eines ermittelten Raums (die Geometrie kennt keine Namen)
  const i = e.target.closest('[data-gmrn]'); if (!i) return;
  const nr = i.dataset.gmrn, alt = i.defaultValue, neu = i.value.trim(); if (!neu || neu === alt) { i.value = alt; return; }
  const setzen = async (name) => { await api(`api/bp/modell/${PID}/raum`, 'POST', { nr, name }); await gmListe('raeume'); };
  try { await setzen(neu); if (window.rueckgaengig) rueckgaengig(`Raum ${nr} benannt`, () => setzen(alt)); } catch (er) { toast(er.message, true); i.value = alt; }
});
