'use strict';
/* Bauantrag – Schritt „Angaben der Vordrucke“ (nach bauantrag-pdf.js geladen, gemeinsame Namen; Server: bauantrag_angaben.py).
   Eine Liste für alle gewählten Vordrucke: jedes Feld einmal. Was zu einem Antragsfeld gehört, kommt aus dem Antrag und seiner Quelle
   (Änderung wird dort gespeichert – setze() aus bauantrag.js). Alles andere ist eine Angabe des Projekts: einmal eintragen, gilt in jedem
   Vordruck, in dem sie vorkommt, auch im nächsten Antrag. Felder, die die Behörde ausfüllt oder die unterschrieben werden, stehen unten
   und zählen nicht als offen. Entschieden am 16.11.2026. */
let ANG = null, ANG_LAEDT = false, ANG_NUR = false;   // ANG: Liste des Antrags AID mit Stand (sig) – geändert (Antrag, gewählte Vordrucke): neu holen
const angSig = () => (D ? (D.gewaehlt || []).join(',') + '|' + D.antrag.geaendert : '');

async function angLaden() {
  if (ANG_LAEDT || !AID) return; ANG_LAEDT = true; const id = AID, sig = angSig();
  try { const r = await api(`api/antraege/${id}/angaben`); if (id === AID) ANG = { ...r, aid: id, sig }; }
  catch (e) { if (id === AID) ANG = { aid: id, sig, zeilen: [], offen: 0, felder: 0, gefuellt: 0, vordrucke: [], fehler: e.message }; }
  finally { ANG_LAEDT = false; }
  if (id === AID) { if (SCHRITT === 'angaben' && !FORM) zeichne(); else nav(); }
}
const angAktuell = () => ANG && ANG.aid === AID;
const angOffen = () => (angAktuell() ? ANG.offen : 0);
const angVoll = (z) => z.wert === true || (typeof z.wert === 'string' && z.wert.trim() !== '');

function angWert(z) {
  const dis = D.antrag.status !== 'entwurf' ? ' disabled' : '';
  if (z.art === 'antrag') {
    const f = z.key.startsWith('f:') && feld(z.key.slice(2));
    if (!f) return `<span>${esc(z.wert) || '<span class="mute">–</span>'}</span>`;
    const w = f.typ === 'eur' && z.wert ? (+z.wert).toLocaleString('de-DE') : z.wert;
    return `<input data-angf="${esc(f.key)}" value="${esc(w)}" aria-label="${esc(z.label)}"${f.typ === 'eur' || f.typ === 'zahl' ? ' inputmode="decimal"' : ''}${dis}>`;
  }
  if (z.typ === 'kreuz') return `<button type="button" class="ang-k${z.wert ? ' an' : ''}" data-angk="${esc(z.key)}" aria-pressed="${!!z.wert}"${dis}>${z.wert ? '✗ angekreuzt' : 'nicht angekreuzt'}</button>`;
  if (z.typ === 'wahl') return `<span class="seg" role="group" aria-label="${esc(z.label)}">${z.optionen.map((o) => `<button type="button" data-angw="${esc(z.key)}" data-v="${esc(o)}" class="${z.wert === o ? 'on' : ''}"${dis}>${esc(o.replace(/^\//, ''))}</button>`).join('')}</span>`;
  return `<input data-ang="${esc(z.key)}" value="${esc(z.wert)}" aria-label="${esc(z.label)}" placeholder="eintragen"${dis}>`;
}
function angZeile(z) {
  const voll = angVoll(z), f = z.art === 'antrag' && z.key.startsWith('f:') && feld(z.key.slice(2));
  const q = z.art === 'antrag'
    ? `<span class="ba-q${f && f.ziel ? ' sync' : ''}" title="${esc(f && f.ziel ? `Kommt aus „${f.ziel}“ – eine Änderung hier wird dort gespeichert` : 'aus dem Antrag')}">${esc(f && f.ziel ? '⇄ ' + f.ziel : z.quelle || 'Antrag')}</span>${f && f.eigen && f.quelle_name ? `<button type="button" class="ba-r" data-zurueck="${esc(f.key)}" title="Wert aus „${esc(f.quelle_name)}“ wieder übernehmen">↺</button>` : ''}`
    : voll ? `<span class="ba-q sync" title="Gilt in allen Vordrucken, in denen die Angabe vorkommt, und für weitere Anträge des Projekts">${z.nur_hier ? 'nur dieser Vordruck' : '⇄ Projekt'}</span>` : z.typ === 'kreuz' ? '' : '<span class="ba-q of">offen</span>';
  return `<tr class="${voll || z.typ === 'kreuz' ? '' : 'ang-of'}"><td>${esc(z.label)}${z.nur_hier ? ' <span class="mute" title="Das Feld hat keine Beschriftung – die Angabe gilt nur in diesem Vordruck">(ohne Beschriftung)</span>' : ''}</td>
    <td class="ang-w">${angWert(z)}</td><td class="ang-q">${q}</td>
    <td class="ang-in"><button type="button" class="ang-v" data-angv="${esc(z.vordruck)}" title="Im Vordruck zeigen">${esc(z.in.join(' · '))}</button></td></tr>`;
}
function angabenHtml() {
  if (!angAktuell() || ANG.sig !== angSig()) { angLaden(); if (!angAktuell()) return '<div class="ba-k"><h3>Angaben der Vordrucke</h3><p class="mute">Die Felder der gewählten Vordrucke werden gelesen …</p></div>'; }
  const A = ANG;
  if (A.fehler) return `<div class="ba-k"><h3>Angaben der Vordrucke</h3><p class="ba-hilfe">${esc(A.fehler)}</p></div>`;
  if (!A.vordrucke.length) return '<div class="ba-k"><h3>Angaben der Vordrucke</h3><p class="ba-hilfe">Noch kein Vordruck mit Feldern gewählt – in Schritt 1 „Verfahren &amp; Formulare“ anhaken. Vordrucke ohne Formularfelder (z. B. der Erhebungsbogen als leeres PDF): dort „Platzieren …“ und „＋ Neue Angabe“ wählen.</p></div>';
  const Z = A.zeilen.filter((z) => !z.amt), amt = A.zeilen.filter((z) => z.amt);
  const offen = Z.filter((z) => !angVoll(z) && z.typ !== 'kreuz'), sicht = ANG_NUR ? offen : [...offen, ...Z.filter((z) => !offen.includes(z))];
  return `<div class="ba-k ang"><h3>Angaben der Vordrucke<span class="mute">jedes Feld aller gewählten Vordrucke – einmal eintragen genügt</span></h3>
    <div class="ang-kopf"><b>${A.vordrucke.length} Vordruck${A.vordrucke.length === 1 ? '' : 'e'}</b><span class="ba-chip">${A.felder} Felder</span><span class="ba-chip ok">${A.gefuellt} gefüllt</span>${A.offen ? `<span class="ba-chip of">${A.offen} offen</span>` : '<span class="ba-chip ok">nichts offen</span>'}
      <span style="flex:1"></span><button type="button" class="btn sm" data-angnur aria-pressed="${ANG_NUR}">${ANG_NUR ? 'Alle zeigen' : 'Nur offene zeigen'}</button>${A.offen ? '<button type="button" class="btn sm pri" data-angnext>Offene nacheinander ausfüllen</button>' : ''}</div>
    <table class="ba-t ang-t"><thead><tr><th>Angabe</th><th>Wert</th><th>kommt aus</th><th>steht in</th></tr></thead><tbody>${sicht.map(angZeile).join('') || '<tr><td colspan="4" class="mute">Nichts offen.</td></tr>'}</tbody></table>
    ${amt.length ? `<details class="ang-amt"><summary>Füllt die Behörde oder wird unterschrieben (${amt.length})</summary><table class="ba-t ang-t"><tbody>${amt.map(angZeile).join('')}</tbody></table></details>` : ''}
    <p class="ba-hilfe" style="margin:.6rem 0 0">Was zu einem Antragsfeld gehört, wird dort gespeichert (⇄, mit seiner Quelle). Alle übrigen Angaben stehen am Projekt: Sie gelten in jedem Vordruck, in dem sie vorkommen, und im nächsten Antrag. Enter springt zum nächsten offenen Feld.</p></div>`;
}

async function angSetzen(werte, text) {
  const id = AID;
  try { const r = await api(`api/antraege/${id}/angaben`, 'PUT', { werte }); D = await api('api/antraege/' + id); ANG = { ...r, aid: id, sig: angSig() }; zeichne();
    rueckgaengig(text, async () => { const r2 = await api(`api/antraege/${id}/angaben`, 'PUT', { werte: r.alt }); if (AID === id) { D = await api('api/antraege/' + id); ANG = { ...r2, aid: id, sig: angSig() }; zeichne(); } });
  } catch (e) { toast(e.message, true); }
}
function angNaechstes(von) {   // nächstes leeres Eingabefeld (nach „von“), sonst das erste
  const L = [...V.querySelectorAll('.ang-t input:not([disabled])')].filter((x) => !x.value.trim());
  const i = von ? L.findIndex((x) => x.compareDocumentPosition(von) & Node.DOCUMENT_POSITION_PRECEDING) : 0;
  const x = L[i < 0 ? 0 : i]; if (x) { x.focus(); x.scrollIntoView({ block: 'center' }); } else toast('Keine offenen Felder mehr.');
}
const zAng = (k) => (ANG ? ANG.zeilen.find((z) => z.key === k) : null);

V.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.ang) { const z = zAng(t.dataset.ang), v = t.value.trim(); if (!z || v === String(z.wert || '')) return; angSetzen({ [z.key]: v || null }, `„${z.label}“ eingetragen`); }
  else if (t.dataset.angf) { const f = feld(t.dataset.angf); let v = t.value.trim(); if (f.typ === 'eur') v = v.replace(/\./g, '').replace(',', '.');
    if (v === String(f.wert)) return; setze({ [f.key]: v }, `„${f.label}“ geändert`); }
});
V.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('.ang-t') || e.target.tagName !== 'INPUT') return;
  e.preventDefault(); const von = e.target; von.blur(); setTimeout(() => angNaechstes(V.querySelector(`[data-ang="${CSS.escape(von.dataset.ang || '')}"],[data-angf="${CSS.escape(von.dataset.angf || '')}"]`)), 0);
});
V.addEventListener('click', (e) => {
  const b = e.target.closest('[data-angk],[data-angw],[data-angnur],[data-angnext],[data-angv]'); if (!b || !D) return;
  if (b.dataset.angnur !== undefined) { ANG_NUR = !ANG_NUR; zeichne(); return; }
  if (b.dataset.angnext !== undefined) { angNaechstes(null); return; }
  if (b.dataset.angv) { navWahl('st:' + b.dataset.angv); return; }
  if (b.dataset.angk) { const z = zAng(b.dataset.angk); angSetzen({ [z.key]: z.wert ? null : true }, `„${z.label}“ ${z.wert ? 'nicht mehr angekreuzt' : 'angekreuzt'}`); return; }
  if (b.dataset.angw) { const z = zAng(b.dataset.angw), v = b.dataset.v; angSetzen({ [z.key]: z.wert === v ? null : v }, `„${z.label}“: ${v.replace(/^\//, '')}`); }
});
(function () {
  const st = document.createElement('style');
  st.textContent = `.ang .ang-kopf{display:flex;gap:.45rem;flex-wrap:wrap;align-items:center;margin-bottom:.6rem}.ang .ba-chip.ok{border-color:var(--ok,#1e8a4c);color:var(--ok,#1e8a4c)}
  .ang-t td{vertical-align:middle}.ang-t .ang-w{min-width:12rem}.ang-t .ang-w input{width:100%;box-sizing:border-box}.ang-t tr.ang-of .ang-w input{border-color:var(--warn,#b7791f);background:color-mix(in srgb,var(--warn,#b7791f) 10%,var(--inp))}
  .ang-t .ang-q{white-space:nowrap}.ang-t{width:100%}.ang-v{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:calc(10px*var(--rkp,1));padding:.08rem .55rem;font:inherit;font-size:.74rem;cursor:pointer;text-align:left;white-space:normal}.ang .ba-q.of{color:var(--warn,#b7791f)}
  .ang-k{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:calc(8px*var(--rk,1));padding:.2rem .6rem;font:inherit;cursor:pointer}.ang-k.an{border-color:var(--ok,#1e8a4c);color:var(--ok,#1e8a4c);font-weight:600}
  .ang-amt{margin-top:.7rem}.ang-amt summary{cursor:pointer;color:var(--mute);font-size:.85rem}`;
  document.head.appendChild(st);
})();
