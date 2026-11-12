/* Bauantrag – „Im PDF ausfüllen“, Hilfen (nach bauantrag-paket.js geladen, gemeinsame Namen):
   - leere Felder des Antrags gelblich, oben „noch N leer“ mit Sprung zum nächsten leeren Feld
   - klein im Feld, woher der Wert kommt (Projektdaten, Adressen, Büro, Mein Konto …)
   - „Alle übernehmen“: bewusst geleerte Felder wieder aus ihrer Quelle füllen
   - Vorschläge je Feld (Baustein vorschlag.js): Wert aus der Quelle, Auswahlwerte; Bauherrschaft aus den Adressen – füllt den ganzen Block */
/* Tab-Reihenfolge wie man das Formular liest: Abschnitte werden durch breite Felder getrennt; darin erst die linke Spalte von
   oben nach unten, dann die rechte (Bauherrschaft | Entwurfsverfassende), Felder einer Zeile von links nach rechts */
function ausReihe(F, seite) {
  const L = F.map((f, i) => [f, i]).filter(([f]) => f.seite === seite).sort(([a], [b]) => a.y - b.y || a.x - b.x);
  const out = []; let block = [];
  const leeren = () => { block.sort(([a], [b]) => { const ca = a.x + a.w / 2 < 0.5 ? 0 : 1, cb = b.x + b.w / 2 < 0.5 ? 0 : 1; return ca - cb || (Math.abs(a.y - b.y) < 0.006 ? a.x - b.x : a.y - b.y); }); out.push(...block); block = []; };
  const reihen = []; L.forEach((z) => { const r = reihen[reihen.length - 1]; if (r && Math.abs(r[0][0].y - z[0].y) < 0.006) r.push(z); else reihen.push([z]); });
  reihen.forEach((r) => {   // breites Feld oder Zeile mit drei und mehr Feldern (Gebäudeklasse 1–5, Gemarkung | Flur | Flurstück): eigener Abschnitt, links → rechts
    if (r.length > 2 || r.some(([f]) => f.w > 0.55)) { leeren(); out.push(...r.sort(([a], [b]) => a.x - b.x)); } else block.push(...r);
  });
  leeren();
  return out;
}
let BA_KB = null;   // Adressen (Name, Gewerk) für die Bauherrschaft – einmal geladen
function baKontakteLaden() {
  if (BA_KB) return;
  BA_KB = [];
  api('api/bp/kontakte?namen=1').then((r) => { BA_KB = Array.isArray(r) ? r : []; }).catch(() => { BA_KB = []; });
}
const baFeld = (k) => (D && D.felder || []).find((f) => f.key === k);
const BA_QK = { 'Projektdaten': 'Projekt', 'Projekt': 'Projekt', 'Adressen': 'Adresse', 'Büro': 'Büro', 'Mein Konto': 'Konto', 'Baukosten': 'Baukosten', 'Vorschlag': 'Vorschlag', 'Vorgabe': 'Vorgabe' };

function ausExtras(el) {
  const box = el.querySelector('.bap-as'); if (!box || !box._felder) return;
  box.querySelectorAll('.bap-ap').forEach((pg) => pg.querySelectorAll('.bap-q').forEach((q) => q.remove()));
  let leer = 0;
  box.querySelectorAll('.bap-ai[data-af]').forEach((x) => {
    const f = box._felder[+x.dataset.af]; if (!f || f.typ === 'kreuz') return;
    const istLeer = !f.eigen && !!f.akey && !String(x.value || '').trim();
    x.classList.toggle('l', istLeer); if (istLeer) leer++;
    const F = f.akey && baFeld(f.akey);
    if (F && F.quelle && String(x.value || '').trim() && f.w > 0.12) {   // Herkunft rechts im Feld
      const q = document.createElement('span'); q.className = 'bap-q';
      q.textContent = F.quelle === 'von Hand' ? '' : (BA_QK[F.quelle] || F.quelle);
      if (q.textContent) {
        Object.assign(q.style, { left: (f.x + f.w) * 100 + '%', top: f.y * 100 + '%', height: f.h * 100 + '%' });
        q.title = `kommt aus: ${F.quelle}`; x.parentElement.appendChild(q);
      }
    }
  });
  if (AUS.key && LEER[AUS.key] !== leer) { LEER[AUS.key] = leer; if (typeof nav === 'function') nav(); }   // Stand je Vordruck links in der Navigation
  const z = el.querySelector('.bap-zahl');
  if (z) z.innerHTML = leer ? `noch <b>${leer} Feld${leer === 1 ? '' : 'er'} leer</b><button type="button" class="btn sm" data-ausleer>nächstes leeres ↓</button>` : '<span class="bap-voll">✓ alle Felder des Antrags gefüllt</span>';
  const ban = el.querySelector('.bap-ban'), U = baUebernehmbar();
  if (ban) {
    ban.hidden = !U.length;
    if (U.length) {
      const qn = [...new Set(U.map((f) => f.quelle_name))].join(', ');
      ban.innerHTML = `<span>✓ <b>${U.length} Feld${U.length === 1 ? '' : 'er'}</b> ${U.length === 1 ? 'lässt' : 'lassen'} sich aus ${esc(qn)} füllen.</span><button type="button" class="btn sm pri" data-ausalle>Alle übernehmen</button>`;
    }
  }
}
/* bewusst geleerte Felder, für die es eine Quelle gibt */
const baUebernehmbar = () => (D && D.felder || []).filter((f) => f.eigen && !String(f.wert || '').trim() && String(f.quelle_wert || '').trim());

/* Vorschläge je Feld (vorschlag.js: data-vs="ba") */
bpVorschlag.listen.ba = (inp) => {
  const k = inp.dataset.ak, F = k && baFeld(k), L = [];
  if (k === 'bauherr_name' && BA_KB && BA_KB.length) {   // getippt: passende Adressen; sonst die als Bauherr geführten zuerst
    const q = F && inp.value.trim() === String(F.wert || '').trim() ? '' : inp.value.trim().toLowerCase();
    const bh = (x) => /bauherr/i.test(x.trade || '');
    BA_KB.filter((x) => (q ? x.name.toLowerCase().includes(q) : bh(x))).slice(0, 12).forEach((x) => L.push({ w: x.name, t: (x.trade ? x.trade + ' · ' : '') + 'aus den Adressen – füllt Anschrift, Telefon, E-Mail' }));
  }
  if (F && String(F.quelle_wert || '').trim() && F.quelle_wert !== F.wert) L.unshift({ w: F.quelle_wert, t: 'aus ' + F.quelle_name });
  if (F && F.optionen && F.optionen.length) F.optionen.forEach((o) => { const v = Array.isArray(o) ? o[0] : o; if (v && !L.some((x) => x.w === v)) L.push({ w: v, t: Array.isArray(o) ? o[1] : '' }); });
  return L;
};

document.addEventListener('focusin', (e) => { if (e.target.dataset && e.target.dataset.ak === 'bauherr_name') baKontakteLaden(); });   // Adressen erst bei Bedarf laden

/* Bauherrschaft aus den Adressen gewählt: ganzer Block (Projektdaten → Name, Anschrift, Telefon, E-Mail) */
document.addEventListener('change', async (e) => {
  const x = e.target; if (!x.dataset || x.dataset.ak !== 'bauherr_name' || !x.closest('.bap-as') || !BA_KB) return;
  const k = BA_KB.find((y) => y.name === x.value.trim()); if (!k) return;
  e.stopImmediatePropagation();
  const id = AID;
  try {
    const r = await api(`api/antraege/${id}/bauherr`, 'POST', { kid: k.id }), v = r.vorher || {};
    D = r; zeichne(); toast(`Bauherrschaft: ${k.name} – Anschrift, Telefon und E-Mail aus den Adressen.`);
    rueckgaengig(`Bauherrschaft „${k.name}“ gewählt`, async () => { D = await api(`api/antraege/${id}/bauherr`, 'POST', { kid: v.kid || 0, name: v.name || '', daten: v.daten || {} }); zeichne(); });
  } catch (er) { toast(er.message, true); }
}, true);

document.addEventListener('click', async (e) => {
  if (!e.target.closest) return;
  if (e.target.closest('[data-ausleer]')) {   // nächstes leeres Feld nach dem aktuellen
    const el = e.target.closest('.bap-aus'), L = [...el.querySelectorAll('.bap-ai.l')]; if (!L.length) return;
    const a = document.activeElement, i = L.indexOf(a), n = L[(i + 1) % L.length];
    n.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => n.focus({ preventScroll: true }), 250); return;
  }
  if (e.target.closest('[data-ausalle]')) {
    const U = baUebernehmbar(); if (!U.length || !D) return;
    const id = AID, F = {}, Z = {}; U.forEach((f) => { F[f.key] = null; Z[f.key] = ''; });
    try { D = await api(`api/antraege/${id}`, 'PUT', { felder: F }); zeichne(); toast(`${U.length} Felder übernommen.`);
      rueckgaengig(`${U.length} Felder übernommen`, async () => { D = await api(`api/antraege/${id}`, 'PUT', { felder: Z }); zeichne(); }); }
    catch (er) { toast(er.message, true); }
  }
});

/* ---------- Statistischer Erhebungsbogen: online beim Statistikamt ausfüllen, den Ausdruck als Beleg dem Antrag beilegen ----------
   Ein Datenzugang zum Online-Dienst der Statistikämter gibt es nicht – die Werte stehen hier zum Abschreiben (Klick kopiert). */
const STAT_URL = 'https://www.statistik-bw.de/baut/servlet/LaenderServlet';
function statistikHtml() {
  const W = (k) => String((baFeld(k) || {}).wert || '');
  const R = [['Ort', W('gs_ort')], ['Straße, Hausnummer', W('gs_strasse')], ['Gemarkung', W('gemarkung')], ['Flur', W('flur')], ['Flurstück', W('flurstueck')],
    ['Bauherrschaft', W('bauherr_name')], ['Anschrift Bauherrschaft', W('bauherr_anschrift')], ['Art der Bautätigkeit', W('art')], ['Nutzung', W('nutzung')],
    ['Gebäudeklasse', W('gebaeudeklasse')], ['Vollgeschosse', W('geschosse')], ['Wohneinheiten', W('we')], ['Brutto-Rauminhalt BRI (m³)', W('bri')],
    ['Bruttogrundfläche BGF (m²)', W('bgf')], ['Grundfläche (m²)', W('grf')], ['Herstellungskosten (€)', W('herstellung')]];
  const b = D.bauvorlagen.find((x) => x.key === 'statistik') || {};
  const beleg = (D.paket || []).filter((x) => x.art === 'unterlage' && /statist|erhebung/i.test(x.titel));
  const st = b.status === 'entfaellt' ? '<span class="ba-chip">entfällt</span>' : beleg.length || b.status === 'da' ? '<span class="ba-chip ok">✓ Beleg liegt bei</span>' : '<span class="ba-chip of">fehlt noch</span>';
  return `<div class="ba-k"><h3>Statistischer Erhebungsbogen ${st}</h3>
    <ol class="ba-stat-s"><li>Den Bogen <b>online</b> beim Statistikamt ausfüllen – die Werte unten mit einem Klick kopieren.</li><li>Am Ende den Ausdruck als PDF speichern.</li><li>Das PDF hier als <b>Beleg</b> ablegen – es kommt mit ins Papier-PDF des Antrags.</li></ol>
    <p><a class="btn pri" href="${STAT_URL}" target="_blank" rel="noopener">Online ausfüllen ↗</a> <label class="btn">📎 Beleg (PDF) ablegen<input type="file" accept="application/pdf" data-statbeleg hidden></label>
      <button type="button" class="btn" data-bv="statistik" data-v="${b.status === 'entfaellt' ? 'offen' : 'entfaellt'}">${b.status === 'entfaellt' ? 'wird doch gebraucht' : 'entfällt (z. B. Abbruch ohne Neubau)'}</button></p>
    ${beleg.length ? `<p class="ba-hilfe">Beleg: ${beleg.map((x) => `<a href="#" data-statsehen="${x.key}">📄 ${esc(x.titel)}</a>`).join(' · ')}</p>` : ''}</div>
    <div class="ba-k"><h3>Werte aus dem Antrag<span class="mute">Klick kopiert den Wert</span></h3><table class="ba-t ba-stat"><tbody>
    ${R.map(([l, w]) => `<tr><td>${esc(l)}</td><td>${w ? `<button type="button" class="ba-kopie" data-kopie="${esc(w)}" title="kopieren">${esc(w)} <span>⧉</span></button>` : '<span class="mute">– noch leer</span>'}</td></tr>`).join('')}
    </tbody></table></div>`;
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest) return;
  const k = e.target.closest('[data-kopie]');
  if (k) { try { await navigator.clipboard.writeText(k.dataset.kopie); toast('Kopiert: ' + k.dataset.kopie); } catch { bpHinweis(k.dataset.kopie); } return; }
  const s = e.target.closest('[data-statsehen]');
  if (s) { e.preventDefault(); BPHead.ansehen([{ url: `api/antraege/${AID}/stueck/${s.dataset.statsehen}.pdf`, typ: 'pdf', name: 'Statistischer Erhebungsbogen' }]); }
});
document.addEventListener('change', async (e) => {
  const inp = e.target; if (!inp.dataset || inp.dataset.statbeleg === undefined || !inp.files.length) return;
  const f = inp.files[0]; inp.value = '';
  const fd = new FormData(); fd.append('datei', new File([f], 'Statistischer Erhebungsbogen (Beleg).pdf', { type: 'application/pdf' }));
  const id = AID;
  try {
    const r = await fetch(`api/antraege/${id}/unterlagen`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { statistik: { status: 'da' } } }); zeichne();
    toast('Beleg abgelegt – er liegt im Papier-PDF des Antrags.');
    rueckgaengig('Beleg Statistik abgelegt', async () => { for (const u of d.neu || []) await api('api/unterlagen/' + u, 'DELETE'); D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { statistik: null } }); zeichne(); });
  } catch (er) { toast(er.message, true); }
});
