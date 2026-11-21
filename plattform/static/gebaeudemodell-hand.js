'use strict';
/* Gebäudemodell ohne Plan (GO 17.11.2026, Entwurf „Gebäudemodell: Assistent rechts, legt Bauteile, Räume, Fenster an“):
   – Arbeitsmaske in „Räume“ und „Fenster & Türen“, solange kein Plan gilt oder der gültige Planstand von Hand ist: Zeilen eintippen,
     Enter in der letzten Zeile = neue Zeile, ✕ entfernt; jede Änderung führt den Planstand nach (Rückgängig).
   – Vorschlag des Assistenten (Reiter „Planung“ → letzter Schritt, oder Knopf in der Maske): Räume, Fenster und Türen aus Fläche,
     Geschossen und Einheiten bzw. aus dem gültigen Planstand → neuer Planstand „Assistent“ (mit Abgleich, wenn schon einer gilt).
   Kern: bpcore/modell_hand.py. Gemeinsame Namen mit gebaeudemodell.js (WORK, PID, SICHT, zeichne, zuBauteil, BT, gmListe).
   Beide Listen stehen rechts (21.11.2026): Räume im Reiter „Räume“, Fenster & Türen unter „Bauteile“ – welche gemeint ist, sagt ihr Platz (gmArt). */
const gmArt = (el) => (el.closest('.gm-li-f') ? 'fenster' : 'raeume');
const GM_ARTEN = ['Fenster', 'Fenstertür', 'Innentür', 'Außentür'];
const gmHandModus = (L) => !(L.zeilen || []).length || (L.quelle || {}).art === 'hand';
const gmZ = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const gmN = (v) => { const x = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : null; };
let GMH = null;   // Stand der Maske: { raeume, elemente } in der Form der Eingaben; mit „plus“ = Ergänzungen neben dem Plan (bpcore/modell_plus.py)

function gmHandDaten(L) {
  return { raeume: (L.raeume || []).map((r) => ({ nr: r.nr, name: r.name, geschoss: r.geschoss || 'EG', flaeche: r.flaeche, hoehe: r.hoehe, ...(r.teil ? { teil: r.teil } : {}) })),
    elemente: (L.elemente || []).map((e) => ({ nr: e.nr || '', art: GM_ARTEN.includes(e.typ) ? e.typ : (e.art === 'Fenster' ? 'Fenster' : 'Innentür'),
      geschoss: e.geschoss || '', raum: (e.raeume || [''])[0] || '', b: e.b, h: e.h, bruestung: e.bruestung, ...(e.quelle === 'baukasten' ? { bk: true } : {}) })) };   // bk: im 3D gesetzt – nur zeigen
}
const GM_SP = {
  raeume: [['nr', 'Nr.', 5], ['name', 'Raum', 14], ['geschoss', 'Geschoss', 6], ['flaeche', 'Fläche m²', 6, 1], ['hoehe', 'Höhe m', 5, 1]],
  fenster: [['nr', 'Nr.', 5], ['art', 'Art', 0], ['geschoss', 'Geschoss', 6], ['raum', 'Raum', 6], ['b', 'Breite m', 5, 1], ['h', 'Höhe m', 5, 1], ['bruestung', 'Brüstung m', 5, 1]],
};
/* eine Zelle der Maske – auch für ergänzte Zeilen neben dem Plan (gebaeudemodell-listen.js); Art als Auswahlliste (C1, 20.11.2026) */
function gmZelle(x, k, [f, , w, zahl]) {
  return f === 'art' ? `<td><button type="button" class="btn sm gm-art" data-gmart="${k}" title="Art wählen" aria-label="Art Zeile ${k + 1}: ${esc(x.art)}">${esc(x.art)} ▾</button></td>`
    : `<td${zahl ? ' class="r"' : ''}><input class="gm-hi" data-gmh="${k}:${f}" value="${esc(zahl ? gmZ(x[f]) : x[f] || '')}" size="${w}" inputmode="${zahl ? 'decimal' : 'text'}" aria-label="${esc(f)} Zeile ${k + 1}"></td>`;
}
function gmMaske(art, L, fokus) {
  GMH = gmHandDaten(L);
  const r = art === 'raeume', X = r ? GMH.raeume : GMH.elemente, S = GM_SP[art];
  const zelle = (x, k, s) => (x.bk ? `<td${s[3] ? ' class="r"' : ''}>${esc(s[3] ? gmZ(x[s[0]]) : x[s[0]] || '')}</td>` : gmZelle(x, k, s));   // aus dem 3D: nur lesen
  const C = gmLi(art);
  const bk = (L.quelle || {}).programm === 'Bauplattform (Baukasten)';
  C.innerHTML = `<div class="gm-hin"><span>${bk ? `${r ? 'Räume von Hand' : 'Fenster und Türen aus dem 3D (dort ändern) und von Hand ergänzt'} – Planstand „${esc((L.quelle || {}).name || 'Baukasten')}“. Enter in der letzten Zeile = neue Zeile.`
    : `${r ? 'Räume' : 'Fenster und Türen'} von Hand – es gilt noch kein Plan${(L.quelle || {}).art === 'hand' ? ` („${esc((L.quelle || {}).name || 'von Hand')}“)` : ''}. Daraus entstehen die Bauteile wie aus einem IFC (Böden, Wände, Decken, Fenster …, Rohbau grob geschätzt). Enter in der letzten Zeile = neue Zeile.`}</span>
      ${(L.zeilen || []).length ? '<button type="button" class="btn" data-gmhvor>Vorschlag des Assistenten …</button>' : '<button type="button" class="btn primary" data-gmanfang>Anfangen …</button>'}${r ? '' : '<button type="button" class="btn" data-gmtl>Aus der Türliste übernehmen</button>'}</div>
    <table class="gm-l gm-mask"><thead><tr>${S.map(([, t, , z]) => `<th${z ? ' class="r"' : ''}>${esc(t)}</th>`).join('')}<th></th></tr></thead><tbody>
    ${X.map((x, k) => `<tr data-gmk="${k}">${S.map((s) => zelle(x, k, s)).join('')}<td>${x.bk ? '<small class="mute" title="Im 3D gesetzt – dort verschieben, ändern oder entfernen">3D</small>' : `<button type="button" class="ib" data-gmhweg="${k}" title="Zeile entfernen" aria-label="Zeile ${k + 1} entfernen">✕</button>`}</td></tr>`).join('')}</tbody></table>
    ${X.length ? '' : `<p class="mute gm-leerz">Noch ${r ? 'kein Raum' : 'kein Fenster und keine Tür'} – oben „＋ ${r ? 'Raum' : 'Fenster / Tür'}“.</p>`}`;
  if (fokus != null) { const i = C.querySelector(`[data-gmk="${fokus}"] input`); if (i) i.focus(); }
}
function gmNeueZeile(art) {
  const r = art === 'raeume', X = r ? GMH.raeume : GMH.elemente, P = GMH.plan || {}, letzt = X[X.length - 1] || {}, g = letzt.geschoss || P.geschoss || 'EG';
  if (r) {   // nächste freie Nummer im Geschoss – auch neben den Räumen aus dem Plan
    const da = new Set([...X.map((x) => x.nr), ...(P.raeume || [])]); let n = X.filter((x) => x.geschoss === g).length + 1, nr;
    do { nr = `${g}.${String(n++).padStart(2, '0')}`; } while (da.has(nr));
    return { nr, name: 'Raum', geschoss: g, flaeche: 0, hoehe: letzt.hoehe || 2.5 };
  }
  return { nr: '', art: letzt.art || 'Fenster', geschoss: g, raum: letzt.raum || '', b: letzt.b || 1.26, h: letzt.h || 1.38, bruestung: letzt.bruestung == null ? 0.9 : letzt.bruestung };
}
/* Befehlsleiste „Neu“ (C1): legt an, was die Ansicht zeigt – Raum bzw. Fenster / Tür; mit Plan als Ergänzung daneben */
function gmNeu(art) {
  if (!GMH || !PID) return;
  const X = JSON.parse(JSON.stringify(art === 'raeume' ? GMH.raeume : GMH.elemente));
  return gmSpeichern(art, [...X, gmNeueZeile(art)], GMH.plus ? 'Zeile ergänzt' : 'Zeile angelegt', X.length);
}
async function gmSpeichern(art, neu, text, fokus) {
  const alt = JSON.parse(JSON.stringify(GMH)), schl = art === 'raeume' ? 'raeume' : 'elemente', ziel = `api/bp/modell/${PID}/${GMH.plus ? 'plus' : 'hand'}`;
  try {
    const d = await api(ziel, 'PUT', { [schl]: neu });
    if (alt.plus) await gmListe(art, fokus); else gmMaske(art, (d.modell || {}).bauteilliste || {}, fokus);
    if (typeof leiste === 'function') leiste();
    if (window.rueckgaengig) rueckgaengig(text, async () => { await api(ziel, 'PUT', { [schl]: alt[schl] }); await gmListe(art); }, { neu: async () => { await gmListe(art); } });
  } catch (er) { toast(er.message, true); await gmListe(art); }
}

WORK.addEventListener('change', (e) => {
  const i = e.target.closest('[data-gmh]'); if (!i || !GMH) return;
  const [k, f] = i.dataset.gmh.split(':'), art = gmArt(i), X = JSON.parse(JSON.stringify(art === 'raeume' ? GMH.raeume : GMH.elemente));
  const zahl = GM_SP[art].some(([s, , , z]) => s === f && z);
  X[+k][f] = zahl ? gmN(i.value) : i.value.trim();
  gmSpeichern(art, X, `${art === 'raeume' ? 'Raum' : 'Element'} geändert`);
});
WORK.addEventListener('keydown', (e) => {
  const i = e.target.closest('[data-gmh]'); if (!i || e.key !== 'Enter') return;
  e.preventDefault(); const art = gmArt(i), X = art === 'raeume' ? GMH.raeume : GMH.elemente, k = +i.dataset.gmh.split(':')[0];
  if (k < X.length - 1) { const n = gmLi(art).querySelector(`[data-gmk="${k + 1}"] input`); if (n) n.focus(); return; }
  i.blur();   // erst die Änderung, dann die neue Zeile
  setTimeout(() => gmSpeichern(art, [...(art === 'raeume' ? GMH.raeume : GMH.elemente), gmNeueZeile(art)], 'Zeile angelegt', X.length), 50);
});
WORK.addEventListener('click', (e) => {
  const t = e.target; if (!GMH || !t.closest('.gm-li')) return;
  const art = gmArt(t), X = JSON.parse(JSON.stringify(art === 'raeume' ? GMH.raeume : GMH.elemente));
  if (t.closest('[data-gmanfang]')) return gmAnfangen();
  const w = t.closest('[data-gmhweg]'); if (w) { X.splice(+w.dataset.gmhweg, 1); return gmSpeichern(art, X, 'Zeile entfernt'); }
  const a = t.closest('[data-gmart]'); if (a) {   // Art als Auswahlliste (C1) statt Durchklicken
    const x = X[+a.dataset.gmart];
    return pickMenu(a, { items: GM_ARTEN.map((n) => ({ value: n, title: n })), onPick: (n) => { if (n === x.art) return;
      Object.assign(x, { art: n }, n === 'Fenstertür' ? { bruestung: 0, h: Math.max(x.h || 0, 2.135) } : n === 'Fenster' ? { bruestung: x.bruestung || 0.9 } : { bruestung: null });
      gmSpeichern(art, X, `Art: ${n}`); } });
  }
  if (t.closest('[data-gmhvor]')) return gmWeg('planung');
});

/* Ein Einstieg ohne Plan (D1, 20.11.2026): dasselbe Fenster „Wie willst du anfangen?“ wie in den Bauteilen (bpBauteile.anfangen) */
async function gmWeg(w) {
  if (w === 'planung' && !gmPlanDa) { if (window.seiteReiter) seiteReiter(SICHT === 'bauteile' ? 'gm' : 'gmp', 'planung'); return; }   // noch keine Planung: erst den Assistenten
  if (w === 'baukasten' || w === 'planung') {   // neuer Planstand mit dem Baukasten (Erdgeschoss + Satteldach) bzw. mit der Planung (das ganze Gebäude aus dem
    // Assistenten: alle Teile, Geschosse, Keller, Dach – 21.11.2026, ohne Fenster „Mengen/Preise“: Mengen aus der Geometrie); gilt mit dem ersten Speichern
    G3.bkNeu = w; LS.set('mitte', '3d');
    if (BT && G3.btE) { if (BT.zustand().an) BT.ansehen(null); G3.mitte = '3d'; G3.bearb = true; return g3Neu(true, null); }   // g3Neu baut die Mitte – genau einmal (vorher danach noch g3Mitte: zweiter Baukasten, zweiter Planstand)
    SICHT = 'bauteile'; LS.set('sicht', SICHT); return zeichne();
  }
  if (w === 'raeume') { if (SICHT !== 'bauteile') { SICHT = 'bauteile'; LS.set('sicht', SICHT); await zeichne(); } if (window.seiteReiter) seiteReiter('gm', 'raeume'); return; }   // Räume stehen rechts (R-A)
  if (w === 'zeilen' || w === 'lesen') { SICHT = 'bauteile'; LS.set('sicht', SICHT); await zeichne(); if (BT) return w === 'zeilen' ? BT.hand() : BT.einlesen(); }
}
let gmPlanDa = true;
async function gmAnfangen() {
  if (!PID) return;
  await baustein('bauteile.js', 'bpBauteile');
  try { gmPlanDa = !!(((await api(`api/bp/modell/${PID}`)).modell || {}).assistent || {}).type; } catch { gmPlanDa = true; }
  return gmWeg(await bpBauteile.anfangen({ plan: gmPlanDa }));
}
