'use strict';
/* Gebäudemodell ohne Plan (GO 17.11.2026, Entwurf „Gebäudemodell: Assistent rechts, legt Bauteile, Räume, Fenster an“):
   – Arbeitsmaske in „Räume“ und „Fenster & Türen“, solange kein Plan gilt oder der gültige Planstand von Hand ist: Zeilen eintippen,
     Enter in der letzten Zeile = neue Zeile, ✕ entfernt; jede Änderung führt den Planstand nach (Rückgängig).
   – Vorschlag des Assistenten (Reiter „Planung“ → letzter Schritt, oder Knopf in der Maske): Räume, Fenster und Türen aus Fläche,
     Geschossen und Einheiten bzw. aus dem gültigen Planstand → neuer Planstand „Assistent“ (mit Abgleich, wenn schon einer gilt).
   Kern: bpcore/modell_hand.py. Gemeinsame Namen mit gebaeudemodell.js (V, PID, SICHT, zeichne, zuBauteil, BT, gmListe). */
const GM_ARTEN = ['Fenster', 'Fenstertür', 'Innentür', 'Außentür'];
const gmHandModus = (L) => !(L.zeilen || []).length || (L.quelle || {}).art === 'hand';
const gmZ = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const gmN = (v) => { const x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : null; };
let GMH = null;   // Stand der Maske: { raeume, elemente } in der Form der Eingaben

function gmHandDaten(L) {
  return { raeume: (L.raeume || []).map((r) => ({ nr: r.nr, name: r.name, geschoss: r.geschoss || 'EG', flaeche: r.flaeche, hoehe: r.hoehe, ...(r.teil ? { teil: r.teil } : {}) })),
    elemente: (L.elemente || []).map((e) => ({ nr: e.nr || '', art: GM_ARTEN.includes(e.typ) ? e.typ : (e.art === 'Fenster' ? 'Fenster' : 'Innentür'),
      geschoss: e.geschoss || '', raum: (e.raeume || [''])[0] || '', b: e.b, h: e.h, bruestung: e.bruestung })) };
}
const GM_SP = {
  raeume: [['nr', 'Nr.', 5], ['name', 'Raum', 14], ['geschoss', 'Geschoss', 6], ['flaeche', 'Fläche m²', 6, 1], ['hoehe', 'Höhe m', 5, 1]],
  fenster: [['nr', 'Nr.', 5], ['art', 'Art', 0], ['geschoss', 'Geschoss', 6], ['raum', 'Raum', 6], ['b', 'Breite m', 5, 1], ['h', 'Höhe m', 5, 1], ['bruestung', 'Brüstung m', 5, 1]],
};
function gmMaske(art, L, fokus) {
  GMH = gmHandDaten(L);
  const r = art === 'raeume', X = r ? GMH.raeume : GMH.elemente, S = GM_SP[art];
  const zelle = (x, k, [f, , w, zahl]) => (f === 'art' ? `<td><button type="button" class="btn sm gm-art" data-gmart="${k}" title="Art wechseln: ${GM_ARTEN.join(' · ')}">${esc(x.art)}</button></td>`
    : `<td${zahl ? ' class="r"' : ''}><input class="gm-hi" data-gmh="${k}:${f}" value="${esc(zahl ? gmZ(x[f]) : x[f] || '')}" size="${w}" inputmode="${zahl ? 'decimal' : 'text'}" aria-label="${esc(f)} Zeile ${k + 1}"></td>`);
  V.innerHTML = `<div class="gm-hin"><span>${r ? 'Räume' : 'Fenster und Türen'} von Hand – es gilt noch kein Plan${(L.quelle || {}).art === 'hand' ? ` („${esc((L.quelle || {}).name || 'von Hand')}“)` : ''}. Daraus entstehen die Bauteile wie aus einem IFC (Böden, Wände, Decken, Fenster …, Rohbau grob geschätzt). Enter in der letzten Zeile = neue Zeile.</span>
      <button type="button" class="btn" data-gmhvor>Vorschlag des Assistenten …</button>${r ? '' : '<button type="button" class="btn" data-gmtl>Aus der Türliste übernehmen</button>'}</div>
    <table class="gm-l gm-mask"><thead><tr>${S.map(([, t, , z]) => `<th${z ? ' class="r"' : ''}>${esc(t)}</th>`).join('')}<th></th></tr></thead><tbody>
    ${X.map((x, k) => `<tr data-gmk="${k}">${S.map((s) => zelle(x, k, s)).join('')}<td><button type="button" class="ib" data-gmhweg="${k}" title="Zeile entfernen" aria-label="Zeile ${k + 1} entfernen">✕</button></td></tr>`).join('')}</tbody></table>
    <button type="button" class="btn sm" data-gmhneu>＋ ${r ? 'Raum' : 'Fenster / Tür'}</button>`;
  if (fokus != null) { const i = V.querySelector(`[data-gmk="${fokus}"] input`); if (i) i.focus(); }
}
function gmNeueZeile(art) {
  const r = art === 'raeume', X = r ? GMH.raeume : GMH.elemente, letzt = X[X.length - 1] || {};
  if (r) return { nr: `${letzt.geschoss || 'EG'}.${String(X.filter((x) => x.geschoss === (letzt.geschoss || 'EG')).length + 1).padStart(2, '0')}`, name: 'Raum', geschoss: letzt.geschoss || 'EG', flaeche: 0, hoehe: letzt.hoehe || 2.5 };
  return { nr: '', art: letzt.art || 'Fenster', geschoss: letzt.geschoss || 'EG', raum: letzt.raum || '', b: letzt.b || 1.26, h: letzt.h || 1.38, bruestung: letzt.bruestung == null ? 0.9 : letzt.bruestung };
}
async function gmSpeichern(art, neu, text, fokus) {
  const alt = JSON.parse(JSON.stringify(GMH)), schl = art === 'raeume' ? 'raeume' : 'elemente';
  try {
    const d = await api(`api/bp/modell/${PID}/hand`, 'PUT', { [schl]: neu });
    gmMaske(art, (d.modell || {}).bauteilliste || {}, fokus);
    if (window.rueckgaengig) rueckgaengig(text, async () => { await api(`api/bp/modell/${PID}/hand`, 'PUT', { [schl]: alt[schl] }); await gmListe(art); }, { neu: async () => { await gmListe(art); } });
  } catch (er) { toast(er.message, true); await gmListe(art); }
}

V.addEventListener('change', (e) => {
  const i = e.target.closest('[data-gmh]'); if (!i || !GMH) return;
  const [k, f] = i.dataset.gmh.split(':'), art = SICHT, X = JSON.parse(JSON.stringify(art === 'raeume' ? GMH.raeume : GMH.elemente));
  const zahl = GM_SP[art].some(([s, , , z]) => s === f && z);
  X[+k][f] = zahl ? gmN(i.value) : i.value.trim();
  gmSpeichern(art, X, `${art === 'raeume' ? 'Raum' : 'Element'} geändert`);
});
V.addEventListener('keydown', (e) => {
  const i = e.target.closest('[data-gmh]'); if (!i || e.key !== 'Enter') return;
  e.preventDefault(); const art = SICHT, X = art === 'raeume' ? GMH.raeume : GMH.elemente, k = +i.dataset.gmh.split(':')[0];
  if (k < X.length - 1) { const n = V.querySelector(`[data-gmk="${k + 1}"] input`); if (n) n.focus(); return; }
  i.blur();   // erst die Änderung, dann die neue Zeile
  setTimeout(() => gmSpeichern(art, [...(art === 'raeume' ? GMH.raeume : GMH.elemente), gmNeueZeile(art)], 'Zeile angelegt', X.length), 50);
});
V.addEventListener('click', (e) => {
  const t = e.target; if (!GMH || !(SICHT === 'raeume' || SICHT === 'fenster')) return;
  const art = SICHT, X = JSON.parse(JSON.stringify(art === 'raeume' ? GMH.raeume : GMH.elemente));
  if (t.closest('[data-gmhneu]')) return gmSpeichern(art, [...X, gmNeueZeile(art)], 'Zeile angelegt', X.length);
  const w = t.closest('[data-gmhweg]'); if (w) { X.splice(+w.dataset.gmhweg, 1); return gmSpeichern(art, X, 'Zeile entfernt'); }
  const a = t.closest('[data-gmart]'); if (a) {
    const x = X[+a.dataset.gmart], n = GM_ARTEN[(GM_ARTEN.indexOf(x.art) + 1) % GM_ARTEN.length];
    Object.assign(x, { art: n }, n === 'Fenstertür' ? { bruestung: 0, h: Math.max(x.h || 0, 2.135) } : n === 'Fenster' ? { bruestung: x.bruestung || 0.9 } : { bruestung: null });
    return gmSpeichern(art, X, `Art: ${n}`);
  }
  if (t.closest('[data-gmhvor]')) return gmVorschlag();
});

/* Vorschlag des Assistenten → Planstand „Assistent“ – derselbe Dialog wie im Reiter „Bauteile“ und im Assistenten (bpBauteile.ausPlanung:
   Räume ansehen, mit/ohne Vorschlagsmengen und Preise); gilt schon ein Plan, kommt der Abgleich */
async function gmVorschlag() {
  if (!PID) return;
  await baustein('bauteile.js', 'bpBauteile');
  const e = await bpBauteile.ausPlanung(PID); if (!e) return;
  SICHT = 'bauteile'; LS.set('sicht', SICHT); await zeichne();
  if (!e.erster && BT && BT.entwurf) BT.entwurf(e);   // Abgleich mit dem gültigen Planstand (wie beim Einlesen eines Plans)
}
