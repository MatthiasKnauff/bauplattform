'use strict';
/* Ausschreibung → Details rechts, wenn das Projekt, das LV oder ein Gliederungspunkt markiert ist (Mock „AVA Details“, GO 13.11.2026).
   Kennzahlen, Stand, Leistungsfortschritt (Leistungsstand aus dem Aufmaß zum Auftrag) und die nächsten Schritte.
   Alles aus LIST und L; nur Budget (Kostenermittlung), Bauherr und Abgabetermine holt /api/projekt/<pid>/details – erst beim Markieren.
   Gelb nur, wenn etwas fehlt oder eine Frist naht. Gehört zu ava.html (gemeinsame Namen: L, LIST, pid, items, eur0, esc …). */
const DK = { key: null, d: null, t: 0, laeuft: false };
function dkLaden() {   // einmal je Projekt (und Version) – neu, wenn das Projekt wieder markiert wird (höchstens alle 30 s)
  const key = pid + ':' + (vSicht() || '');
  if (DK.laeuft || (DK.key === key && DK.d && (LVAKT !== '__pj' || Date.now() - DK.t < 30000))) return;
  DK.laeuft = true; DK.t = Date.now();
  api(`api/projekt/${pid}/details${vSicht() ? '?version_id=' + vSicht() : ''}`).then((d) => {
    const neu = JSON.stringify(d) !== JSON.stringify(DK.d) || DK.key !== key; DK.d = d; DK.key = key;
    if (neu && tab === 'lv') seiteFuellen('lv', 'details');
  }).catch(() => {}).finally(() => { DK.laeuft = false; });
}
const dkD = () => (DK.key === pid + ':' + (vSicht() || '') ? DK.d : null);
const dkPct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
const dkBalken = (titel, a, b, txt) => { const p = dkPct(a, b); return p == null ? '' : `<div class="dk-b"><div class="dk-bl"><span>${esc(titel)}</span><span>${txt || p + ' %'}</span></div><div class="dk-bb"><i style="width:${Math.min(100, p)}%"${p > 100 ? ' class="ueber"' : ''}></i></div></div>`; };
const dkKz = (L3) => `<div class="dk-kz">${L3.map(([t, v, sub]) => `<div><small>${esc(t)}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`).join('')}</div>`;
const dkLi = (Z) => `<div class="dk-li">${Z.filter(Boolean).map(([t, v]) => `<span>${esc(t)}</span><b>${v}</b>`).join('')}</div>`;
const dkWarn = (W) => (W.length ? `<div class="dk-warn">${W.map(esc).join(' · ')}</div>` : '');
const dkFrist = (iso) => { if (!iso) return null; const t = new Date(iso); if (isNaN(t)) return null; return Math.ceil((t - new Date()) / 864e5); };
const dkLvs = () => LIST.filter((x) => !x.archived && !lvWeg(x));
const dkGes = (x) => (x.auftrag || 0) + (x.nachtraege || 0);   // Auftrag mit beauftragten Nachträgen

function dkProjekt() {
  dkLaden();
  const D = dkD() || {}, X = dkLvs(), p = PROJ.find((y) => y.id === pid) || {};
  const ausschr = X.filter((x) => !x.vergeben && !x.frei && x.status !== 'nicht_vergeben' && !x.n_angebote).length;
  const vergabe = X.filter((x) => !x.vergeben && !x.frei && x.n_angebote > 0 && x.status !== 'nicht_vergeben').length;
  const beauftr = X.filter((x) => x.vergeben || x.frei);
  const zuPruefen = X.reduce((s, x) => s + (x.rechnungen || []).filter((r) => r.status !== 'geprueft').length, 0);
  const prog = X.reduce((s, x) => s + (x.prognose || 0), 0), auftr = beauftr.reduce((s, x) => s + dkGes(x), 0);
  const leist = beauftr.reduce((s, x) => s + (x.leistung || 0), 0), abg = X.reduce((s, x) => s + (x.abgerechnet || 0), 0);
  const B = D.budget, W = [];
  Object.entries(D.lvs || {}).forEach(([id, v]) => { const x = X.find((y) => y.id === +id); if (!x || x.vergeben || x.n_angebote) return;
    const t = dkFrist(v.abgabe); if (t != null && t >= 0 && t <= 14) W.push(`⏰ Abgabe „LV ${x.nr} ${x.name}“ am ${de(v.abgabe)}${v.ohne_rueck ? ` · ${v.ohne_rueck} Bieter:in${v.ohne_rueck === 1 ? '' : 'nen'} ohne Rückmeldung` : ''}`); });
  if (B && prog > B.wert) W.push(`Prognose ${eur0(prog - B.wert)} über der Kostenermittlung`);
  const bk = window.BPHead && BPHead.conf && (BPHead.conf.apps || []).find((a) => a.key === 'baukosten' && a.allowed);
  return `<div class="dk"><div class="dk-k"><span class="dk-ic">🏗</span><b>${esc(p.name || 'Projekt')}</b></div>
    ${D.bauherr || D.adresse ? `<div class="hint">${esc([D.bauherr, D.adresse].filter(Boolean).join(' · '))}</div>` : ''}
    ${dkKz([[B ? 'Kostenermittlung' : 'Prognose', B ? eur0(B.wert) : eur0(prog), B ? '' : ''], ['beauftragt', auftr ? eur0(auftr) : '–'], ['abgerechnet', abg ? eur0(abg) : '–']])}
    ${B ? dkBalken('Budget ausgeschöpft (Prognose)', prog, B.wert) : `<div class="hint">${esc(D.budget_grund || (dkD() ? 'Keine Kostenermittlung' : 'lädt …'))}</div>`}
    ${dkBalken('Leistungsfortschritt', leist, auftr, `${eur0(leist)} · ${dkPct(leist, auftr)} %`)}
    <table class="dk-t"><tr><td>LVs in Ausschreibung</td><td>${ausschr}</td></tr><tr><td>in Vergabe (Angebote da)</td><td>${vergabe}</td></tr><tr><td>beauftragt</td><td>${beauftr.length}</td></tr>
      <tr${zuPruefen ? ' class="dk-hin" data-dkgeh="aufmass"' : ''}><td>Rechnungen zu prüfen</td><td>${zuPruefen ? `<b>${zuPruefen}</b>` : 0}</td></tr></table>
    ${dkWarn(W)}
    <div class="bar"><button type="button" class="btn sm" data-dk="neu">＋ Neues LV</button><button type="button" class="btn sm" data-dk="pdaten">Projektdaten …</button>${bk ? `<a class="btn sm" href="${esc(BPHead.appUrl(bk))}/">Kostenermittlung ↗</a>` : ''}</div></div>`;
}

function dkLv() {
  if (!L) return '<div class="card empty"><p class="hint">Links ein LV öffnen.</p></div>';
  dkLaden();
  const K = L.calc, nt = K.nachtraege, x = LIST.find((y) => y.id === L.id) || {}, V = L.vergabe || {}, I = items();
  const P = I.filter((y) => y.typ === 'pos' && y.art !== 'T'), vb = I.filter((y) => y.typ === 'pos' && y.art === 'T' && y.vb).length;
  const ges = K.auftrag + nt.beauftragt, RE = L.rechnungen || [], v = (dkD() && dkD().lvs || {})[L.id];
  const st = [['Ausschreibung', true], ['Vergabe', L.angebote.length > 0], ['Auftrag', vergeben()], ['Abrechnung', K.abgerechnet > 0 || L.status === 'abgerechnet']];
  let cur = 0; st.forEach((s, i) => { if (s[1]) cur = i; });
  const W = [], t = v && dkFrist(v.abgabe);
  if (!vergeben() && v && t != null && t >= 0 && t <= 14) W.push(`⏰ Abgabe am ${de(v.abgabe)}${v.ohne_rueck ? ` · ${v.ohne_rueck} ohne Rückmeldung` : ''}`);
  if (K.ohne_schaetzung && !vergeben()) W.push(`${K.ohne_schaetzung} Position${K.ohne_schaetzung === 1 ? '' : 'en'} ohne Preis`);
  const nE = P.filter((y) => y.art === 'E').length, nA = P.filter((y) => y.art === 'A').length;
  return `<div class="dk"><div class="dk-k"><span class="dk-ic">📁</span><b>LV ${esc(L.nr || '')} ${esc(L.name || '')}</b>${L.gewerk || x.kg ? `<span class="hint">· ${esc([x.kg ? 'KG ' + x.kg : '', L.gewerk].filter(Boolean).join(' · '))}</span>` : ''}</div>
    ${sperrZeile(null)}
    <div><div class="dk-st">${st.map((s, i) => `<i class="${i < cur || (i === cur && cur === 3) ? 'on' : i === cur ? 'akt' : ''}"></i>`).join('')}</div><div class="dk-sl">${st.map((s) => `<span>${s[0]}</span>`).join('')}</div></div>
    ${dkKz([['Schätzung', K.schaetzung ? eur0(K.schaetzung) : '–'], ['Auftrag', vergeben() ? eur0(K.auftrag) : '–'], ['Nachträge', nt.beauftragt ? '+ ' + eur0(nt.beauftragt) : '–', nt.angemeldet ? 'angemeldet ' + eur0(nt.angemeldet) : '']])}
    ${vergeben() ? dkBalken('Leistungsfortschritt (Aufmaß)', K.leistung, ges, `${eur0(K.leistung)} · ${dkPct(K.leistung, ges)} %`) : ''}
    ${dkLi([['Positionen', `${P.length}${nE || nA ? ` · davon ${[nE ? nE + ' Bedarf' : '', nA ? nA + ' Wahl' : ''].filter(Boolean).join(', ')}` : ''}`],
      ['Gliederungspunkte', I.filter((y) => y.typ === 'titel').length], ['Vorbemerkungen', vb ? `✓ ${vb} Text${vb === 1 ? '' : 'e'}` : '–'],
      v && v.eingeladen ? ['Versendet', `an ${v.eingeladen} · ${L.angebote.length} Angebot${L.angebote.length === 1 ? '' : 'e'}`] : L.angebote.length ? ['Angebote', L.angebote.length] : null,
      V.bieter && vergeben() ? ['Auftragnehmer', esc(V.bieter)] : null,
      K.abgerechnet ? ['abgerechnet', `${eur0(K.abgerechnet)}${ges ? ` (${dkPct(K.abgerechnet, ges)} %)` : ''} · ${RE.length} Rechnung${RE.length === 1 ? '' : 'en'}`] : null])}
    ${dkWarn(W)}
    <div class="bar"><button type="button" class="btn sm" data-dk="ldaten">Eigenschaften …</button><button type="button" class="btn sm" data-dk="druck">Drucken</button><button type="button" class="btn sm" data-dk="versand">Versand</button></div></div>`;
}

function dkGlied(x) {
  const I = items(), k = I.indexOf(x), lv = x.lvl || 1; let e = k + 1;
  while (e < I.length && !(I[e].typ === 'titel' && (I[e].lvl || 1) <= lv)) e++;
  const P = I.slice(k + 1, e).filter((y) => y.typ === 'pos' && y.art !== 'T'), V = vergeben(), VP = (L.vergabe && L.vergabe.preise) || {};
  const ep = (y) => (V ? VP[y.id] : y.ep_s), gp = (y) => (ep(y) != null && zaehlt(y) ? mengeZ(y, ep) * ep(y) : 0);
  const sum = P.reduce((s, y) => s + gp(y), 0), lvSum = I.filter((y) => y.typ === 'pos').reduce((s, y) => s + gp(y), 0);
  const AM = (L.calc && L.calc.aufmass) || {}, auf = P.reduce((s, y) => s + (ep(y) != null && zaehlt(y) ? (AM[y.id] || 0) * ep(y) : 0), 0);
  const kg = {}; P.forEach((y) => { if (y.kg) kg[y.kg] = (kg[y.kg] || 0) + 1; });
  const top = P.filter((y) => gp(y)).sort((a, b) => gp(b) - gp(a)), oM = P.filter((y) => zaehlt(y) && !y.menge).length, oP = P.filter((y) => zaehlt(y) && ep(y) == null).length;
  const W = []; if (oM) W.push(`${oM} Position${oM === 1 ? '' : 'en'} ohne Menge`); if (oP) W.push(`${oP} ohne ${V ? 'Auftragspreis' : 'Einheitspreis'}`);
  return `<div class="dk"><div class="dk-k"><span class="dk-ic">▤</span><b>${esc(x.oz || '')} ${esc(x.kurz || '')}</b></div>
    ${dkKz([['Summe', sum ? eur0(sum) : '–'], ['Anteil am LV', lvSum ? dkPct(sum, lvSum) + ' %' : '–'], ['Positionen', P.length]])}
    ${top.length ? `<table class="dk-t">${top.slice(0, 4).map((y) => `<tr data-dkpos="${esc(y.id)}" class="dk-hin"><td>${esc(y.oz)} ${esc((y.kurz || '').slice(0, 40))}</td><td>${eur0(gp(y))}</td></tr>`).join('')}${top.length > 4 ? `<tr><td class="hint">… ${top.length - 4} weitere</td><td></td></tr>` : ''}</table>` : ''}
    ${V ? dkBalken('Leistungsfortschritt (Aufmaß)', auf, sum, `${eur0(auf)} · ${dkPct(auf, sum)} %`) : ''}
    ${dkLi([Object.keys(kg).length ? ['Kostengruppen', esc(Object.entries(kg).sort().map(([g, n]) => `${g} (${n})`).join(', '))] : null, x.nt ? ['Nachtrag', esc(x.nt)] : null])}
    ${dkWarn(W)}
    <div class="bar"><button type="button" class="btn sm" data-dk="pos">＋ Position hier</button><button type="button" class="btn sm" data-dk="umben">Umbenennen</button></div></div>`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-dk],[data-dkpos],[data-dkgeh]'); if (!b || !b.closest('.dk')) return;
  if (b.dataset.dkpos) { const y = items().find((z) => z.id === b.dataset.dkpos); if (!y) return; LVSEL = new Set(); LVAKT = y.id; lvAktZeigen(); const tr = document.querySelector(`table.lv tr[data-i="${items().indexOf(y)}"]`); if (tr) tr.scrollIntoView({ block: 'center' }); return; }
  if (b.dataset.dkgeh) { const n = document.querySelector(`[data-tab="${b.dataset.dkgeh}"]`); if (n) n.click(); return; }
  const a = b.dataset.dk;
  if (a === 'neu') return newDialog();
  if (a === 'pdaten') { if (window.BPHead && BPHead.projektBearbeiten) BPHead.projektBearbeiten(pid, { onSaved: () => { DK.d = null; seiteFuellen('lv', 'details'); } }); return; }
  if (a === 'ldaten') return lvDaten();
  if (a === 'druck') { const d = $('#druBtn'); if (d) d.click(); return; }
  if (a === 'versand') { const r = document.querySelector('#view [data-srt="versand"]'); if (r) r.click(); return; }
  if (a === 'pos') { const p = document.querySelector('[data-act="pos"]'); if (p) p.click(); return; }
  if (a === 'umben') { const x = items().find((y) => y.id === LVAKT); const f = x && document.querySelector(`table.lv tr[data-i="${items().indexOf(x)}"] [data-f="kurz"]`); if (f) { f.focus(); f.select(); } }
});
