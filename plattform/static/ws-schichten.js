'use strict';
/* =====================================================================
   Wärmeschutz – Schichtaufbau (Mock „Schichtaufbau neu – mit Gefachen“, GO 22.11.2026: SA-1 … SA-17 alle A).
   Oben die Ergebnisleiste (U groß, Balken gegen das Soll fürs Gebäude mit den anderen Stufen als Striche, 5 Stufen, „fehlt: x cm“),
   darunter der Querschnitt in Maßstab (Fläche ziehen = umsortieren, Fuge ziehen = Dicke, ＋ an der Fuge = Schicht dazwischen,
   Temperaturlinie im Winter), daneben die Draufsicht der Gefache mit den Teilflächen, darunter die Schichten als Liste (⋮⋮ ziehen,
   Strg+↑/↓, Dicke − / +, λ – gelb = Produktwert, ⋯ = Gefach, Fachwerte μ/sd, Baustoff, entfernen). Gefach als Unterzeile: Holz, Breite,
   Abstand, Anteil, „kreuzweise“ / „in Flucht“ (Rechnung bp/wsphysik.js gruppen()). Unter der Liste R′, R″, Fehler und R′/R″ ≤ 1,5.
   Jede Änderung ist ein Schritt im Rückgängig (bauteilSpeichern). Nutzt aus ws-kern.js / ws-bauteil.js: D, BSI, R7, zahl, ergebnis,
   bauteil, bauteilSpeichern, ntz, pz, bsName, baustoffWahl, bsWaehlen, sollK, schichtenUmdrehen.
   ===================================================================== */
const SK_MIN = 2.4, SK_H = 150, SK_CM = 90;   // Mindestbreite einer Schicht im Querschnitt (%), Höhe des Querschnitts (px) = 90 cm
const skDaemm = (m) => !!m && m.lambda > 0 && m.lambda < 0.06 && !m.belueftet;
const skDicke = (d) => ntz(+(+d || 0).toFixed(+d < 1 ? 2 : 1));

/* ---------- Ergebnisleiste (SA-6, SA-15, SA-16) – auch für Fenster und Türen ---------- */
function skAndere(b, um) {   // die übrigen deutschen Stufen als Striche am Balken – gleiche Werte ein Strich
  const M = new Map();
  R7.SOLL.filter((x) => x.land === 'DE' && x.k !== sollK()).forEach((x) => { const v = R7.sollUmax(b, x.k, zone()); if (v != null && Math.abs(v - um) > 1e-9) (M.get(v) || M.set(v, []).get(v)).push(x); });
  return [...M.entries()];
}
function ergebnisLeiste(b) {
  const e = ergebnis(b), S = R7.sollVon(sollK());
  if (e.u == null) return `<span class="mute">${R7.ohneSchichten(b.typ) ? 'U-Wert aus dem Datenblatt eintragen.' : 'Schichten eintragen – U-Wert, Tauwasser und Temperaturen rechnen sofort mit.'}</span>`;
  const um = e.umax, st = e.stufe, fen = R7.ohneSchichten(b.typ), sk = Math.max(fen ? 2 : 0.6, (um || 0) * 1.6, e.u * 1.05);
  const p = (v) => Math.min(100, v / sk * 100);
  let fehlt = '';
  if (e.ok === false && e.r && um) {   // wie viel dicker muss die Dämmung werden (λ der dicksten Dämmschicht, sonst WLS 035)
    const D2 = (b.schichten || []).map((s, i) => [s, i, BSI[s.m]]).filter(([, , m]) => skDaemm(m)).sort((a, c) => c[0].d - a[0].d)[0];
    const lam = D2 ? (D2[0].lam || D2[2].lambda) : 0.035, cm = Math.ceil((1 / um - e.r.u.rT) * lam * 100 * 2) / 2;
    if (cm > 0) fehlt = D2 ? `<button type="button" class="ws-fehlt" data-skfehlt="${D2[1]}" data-cm="${cm}" title="${esc(bsName(D2[2]))} um ${ntz(cm)} cm dicker">fehlt: ${ntz(cm)} cm → Dämmung dicker</button>` : `<span class="ws-fehlt">fehlt: ${ntz(cm)} cm WLS 035</span>`;
  }
  const g = e.r && e.r.glaser, uw = e.r && e.r.u;
  const chip = (ok, t) => `<span class="ws-chip ${ok == null ? '' : ok ? 'ok' : 'no'}">${t}</span>`;
  const striche = um != null ? skAndere(b, um).sort((x, y) => x[0] - y[0]).map(([v, L], k) => `<b class="${k % 2 ? 'h2' : ''}" style="left:${p(v)}%" data-t="${esc(L.map((x) => x.kurz).join('/'))}" title="${esc(L.map((x) => x.n).join(', '))}: ${zahl(v)}"></b>`).join('') : '';
  return `<div class="ws-uw"><span class="ws-u">${zahl(e.u, 3)}</span><small>W/m²K</small></div>
    <div class="ws-eb">${um != null ? `<div class="ws-bal${e.ok === false ? ' no' : ''}"><i style="width:${p(e.u)}%"></i>${striche}<em style="left:${p(um)}%"></em><span style="left:${p(um)}%">Soll ${zahl(um)}</span></div>` : ''}
      <div class="ws-ez">${st ? `<span class="ws-st ws-st${st.s}" title="bezogen auf: ${esc(S.n)}">${st.zeichen} ${st.text}</span><span class="ws-chip">${st.prozent} % vom Soll</span>`
        : `<span class="ws-chip">${S.k === 'gm7' ? (b.massnahme ? 'keine Anforderung' : 'Maßnahme wählen') : 'kein Wert für diese Bauteilart'}</span>`}${fehlt}
        ${g ? chip(!g.tauwasser || (g.mc <= 1 && g.mev >= g.mc), g.tauwasser ? `Tauwasser ${zahl(g.mc, 3)} kg/m²` : '✓ kein Tauwasser') : ''}
        ${e.r ? chip(e.r.frsi >= 0.7, `${e.r.frsi >= 0.7 ? '✓' : '✗'} fRsi ${zahl(e.r.frsi)}`) : ''}
        ${uw && uw.inhomogen ? chip(uw.zulaessig, `${uw.zulaessig ? '✓' : '✗'} R′/R″ ${zahl(uw.verhaeltnis)} ${uw.zulaessig ? '≤' : '>'} 1,5`) : ''}</div></div>`;
}
const stufeChip = (e) => (e.u == null ? '<span class="ws-ch of">offen</span>' : !e.stufe ? '<span class="ws-ch of">ohne Soll</span>'
  : `<span class="ws-st ws-st${e.stufe.s}" title="${e.stufe.prozent} % vom Soll">${e.stufe.zeichen} ${e.stufe.text}</span>`);
const ergebnisKl = (b) => { const e = ergebnis(b); return !e.stufe ? '' : e.stufe.s <= 1 ? 'ok' : e.stufe.s === 2 ? 'knapp' : 'no'; };

/* ---------- Karte ---------- */
function schichtenHtml(b) {
  const S = b.schichten || [];
  return `<div class="ws-ampel" id="wsErg"></div>
    <div class="ws-qsw"><div class="ws-qs"><div class="ws-qsk"><b>innen 20 °C</b><span id="wsQd"></span><b class="a">außen −5 °C</b></div>
      <div class="ws-band" id="wsBand"></div><div class="ws-mass" id="wsMass"></div></div><div class="ws-drauf" id="wsDrauf" hidden></div></div>
    <div class="ws-leg"><span><i></i>Temperatur im Winter (im Gefach)</span><span>Fläche ziehen = umsortieren · Fuge ziehen = Dicke · ＋ an der Fuge = Schicht dazwischen</span></div>
    <div class="ws-li" id="wsLi"><div class="ws-lk"><span></span><span></span><span>Schicht (innen → außen)</span><span>Dicke</span><span class="r">λ W/mK</span><span class="r">R</span><span>Anteil an R</span><span></span></div>
      ${S.map((s, i) => zeileHtml(b, s, i)).join('') || '<div class="ws-lz0 mute">Noch keine Schicht – „＋ Schicht“.</div>'}
      <div class="ws-lf"><span><button type="button" class="btn sm" data-sneu>＋ Schicht</button> <button type="button" class="btn sm" data-sdreh title="Reihenfolge innen ↔ außen tauschen">⇄ innen/außen tauschen</button></span><span id="wsSum"></span></div></div>
    <div class="ws-rech" id="wsRech"></div>`;
}
function zeileHtml(b, s, i) {
  const m = BSI[s.m], eig = !m, g = s.m2, fl = s.gl === 'flucht';
  const vorG = (b.schichten || []).slice(0, i).some((x) => x.m2);
  const gef = g ? `<div class="ws-gef"><span class="ic"></span><div class="ws-gefi">
      <span>Gefach: ${baustoffWahl(s.m2, `data-sk="m2" data-si="${i}" aria-label="Holz im Gefach"`)}</span>
      <label>Breite ${zahlFeld(i, 'breite', s.breite, fl)}</label><label>Abstand ${zahlFeld(i, 'abstand', s.abstand, fl)}</label>
      <span>Anteil <b class="wert" data-sga="${i}"></b></span>
      ${vorG ? `<span class="ws-seg" role="group" aria-label="Lage zum Gefach davor"><button type="button" data-sgl="${i}" data-v="kreuz" class="${fl ? '' : 'on'}">kreuzweise</button><button type="button" data-sgl="${i}" data-v="flucht" class="${fl ? 'on' : ''}">in Flucht</button></span>` : '<span class="ws-seg"><button type="button" class="on" disabled>erstes Gefach</button></span>'}
      <button type="button" class="ws-x" data-sgef="${i}" title="Gefach entfernen">✕</button></div></div>` : '';
  return `<div class="ws-zb${m && m.belueftet ? ' aus' : ''}" data-zb="${i}"><div class="ws-lz" tabindex="0" data-lz="${i}">
      <span class="ws-grip" data-grip="${i}" title="Ziehen zum Umsortieren (Strg+↑/↓)">⋮⋮</span><span class="sw" style="background:${esc((m || {}).farbe || '#dcdcdc')}"></span>
      <span class="ws-nm">${!eig && s.name ? `<b class="ws-pn" title="Name aus dem Plan – der Baustoff dahinter liefert λ, ρ und μ">${esc(s.name)}</b>` : ''}${baustoffWahl(eig ? 'eigen' : s.m, `data-sk="m" data-si="${i}" aria-label="Baustoff"`)}${eig ? ` <input data-sk="name" data-si="${i}" value="${esc(s.name || '')}" placeholder="Name" style="width:9rem">` : ''}
        <small>${m && m.belueftet ? 'belüftet – zählt nicht (Rse = Rsi)' : esc((m || {}).kat || '')}${g ? ' · mit Gefach' : ''}${s.mu != null || s.sd != null ? ' · Fachwerte von Hand' : ''}</small></span>
      ${zahlFeld(i, 'd', s.d, false, 'Dicke in cm')}
      <input class="n ws-lam${s.lam ? ' hand' : ''}" data-sk="lam" data-si="${i}" value="${ntz(s.lam)}" placeholder="${m && m.lambda ? ntz(m.lambda) : ''}" inputmode="decimal" aria-label="λ" title="leer = Richtwert des Baustoffs; eingetragen (gelb) = Produktwert – leeren = zurück zum Richtwert">
      <span class="r" data-rr="${i}"></span><span class="ws-ant" data-ra="${i}"></span>
      <button type="button" class="ws-mehr" data-smehr="${i}" title="Weitere: Gefach, Fachwerte, Baustoff, entfernen">⋯</button></div>${gef}</div>`;
}
function zahlFeld(i, k, v, aus, label) {
  const d = aus ? ' disabled' : '';
  return `<span class="ws-dk${k === 'd' ? '' : ' kl'}"><button type="button" data-skm="${k}" data-si="${i}"${d} aria-label="weniger">−</button><input data-sk="${k}" data-si="${i}" value="${k === 'd' ? skDicke(v) : ntz(v)}" inputmode="decimal"${d} aria-label="${label || k}"><span>cm</span><button type="button" data-skp="${k}" data-si="${i}"${d} aria-label="mehr">+</button></span>`;
}

/* ---------- Neu zeichnen ohne die Eingabefelder (beim Tippen) ---------- */
function schichtenNeu(b) {
  const E = $('#wsErg'); if (E) { E.innerHTML = ergebnisLeiste(b); E.className = 'ws-ampel ' + ergebnisKl(b); }
  if (R7.ohneSchichten(b.typ) || !$('#wsBand')) return;
  const e = ergebnis(b), r = e.r, S = b.schichten || [];
  band(b, r); drauf(b, r);
  const mx = r ? Math.max(...r.u.rSchicht, 0.01) : 1;
  S.forEach((s, i) => {
    const rr = V.querySelector(`[data-rr="${i}"]`), ra = V.querySelector(`[data-ra="${i}"]`), ga = V.querySelector(`[data-sga="${i}"]`), x = r ? r.u.rSchicht[i] : null;
    if (rr) rr.textContent = x != null ? zahl(x, 2) : '–';
    if (ra) ra.innerHTML = x != null ? `<i style="width:${Math.max(2, x / mx * 58)}px"></i><small>${zahl(x / r.u.rT * 100, 0)} %</small>` : '';
    if (ga) { const q = s.gl === 'flucht' ? skKopf(S, i) : s; ga.textContent = q && q.breite > 0 && q.abstand > 0 ? zahl(q.breite / q.abstand * 100, 1) + ' %' : '–'; }
  });
  const sum = $('#wsSum'); if (sum) sum.textContent = `d ${zahl(S.reduce((a, s) => a + (+s.d || 0), 0), 1)} cm${r ? ` · R gesamt ${zahl(r.u.rT, 2)} m²K/W · Rsi ${zahl(r.u.rsi)} · Rse ${zahl(r.u.rse)}` : ''}`;
  const rc = $('#wsRech'), u = r && r.u;
  if (rc) rc.innerHTML = u && u.inhomogen ? `DIN EN ISO 6946, inhomogene Schichten: obere Grenze R′ <b>${zahl(u.rOben, 3)}</b> · untere Grenze R″ <b>${zahl(u.rUnten, 3)}</b> · R<sub>T</sub> = (R′ + R″) / 2 = <b>${zahl(u.rT, 3)}</b> m²K/W · Fehler ${zahl(u.fehler * 100, 1)} % · R′/R″ ${zahl(u.verhaeltnis)} ${u.zulaessig ? '≤ 1,5 ✓' : ''}`
    + (u.zulaessig ? '' : '<div class="ws-rot">✗ R′/R″ &gt; 1,5 – das vereinfachte Verfahren ist nicht zulässig, eine Wärmebrückenberechnung ist nötig. Der U-Wert steht mit diesem Hinweis im Ausdruck.</div>') : '';
}
const skKopf = (S, i) => { for (let j = i - 1; j >= 0; j--) if (S[j].m2 && S[j].gl !== 'flucht') return S[j]; return null; };
function skBreiten(S) { const g = S.reduce((a, s) => a + (+s.d || 0), 0) || 1; const W = S.map((s) => Math.max(SK_MIN, (+s.d || 0) / g * 100)), k = 100 / W.reduce((a, c) => a + c, 0); return W.map((w) => w * k); }
function skGruppeVon(S, i) { let k = -1; for (let j = 0; j <= i; j++) if (S[j].m2 && S[j].gl !== 'flucht') k++; return k; }
function holz(S, i) {   // Holz im Schnitt: erstes Gefach als Querschnitte, kreuzweise als Latte längs, in Flucht an derselben Stelle wie das Gefach davor
  const s = S[i]; if (!s.m2) return '';
  const q = s.gl === 'flucht' ? (skKopf(S, i) || s) : s; if (!(q.breite > 0 && q.abstand > 0)) return '';
  const kreuz = skGruppeVon(S, i) > 0, sk = SK_H / SK_CM, a = Math.max(q.abstand, q.breite + 1);
  let h = ''; for (let y = -a / 2 + 12; y < SK_CM; y += a) h += `<div class="ws-holz${kreuz ? ' q' : ''}" style="top:${(y * sk).toFixed(1)}px;height:${(q.breite * sk).toFixed(1)}px"></div>`;
  return h;
}
function band(b, r) {
  const el = $('#wsBand'); if (!el) return;
  const S = b.schichten || [], W = skBreiten(S); let x = 0, h = '', fug = '';
  S.forEach((s, i) => { const m = BSI[s.m] || {}, mu = /Dämm/.test(m.kat || '') ? 'd' : /Mauer/.test(m.kat || '') ? 'm' : '', aus = r && i >= r.aktiv.length;
    h += `<div class="ws-lage${mu ? ' ' + mu : ''}${aus ? ' aus' : ''}" data-lage="${i}" style="width:${W[i]}%;background-color:${esc(m.farbe || '#dcdcdc')}" title="${esc(s.name || bsName(m) || 'Schicht')} · ${skDicke(s.d)} cm">${holz(S, i)}<span class="nr">${i + 1}</span></div>`;
    x += W[i]; if (i < S.length - 1) fug += `<div class="ws-fuge" data-fuge="${i}" style="left:${x}%"><button type="button" class="plus" data-splus="${i + 1}" title="Schicht hier einfügen">＋</button></div>`; });
  let lin = '';
  if (r && r.tWinter) { const y = (t) => 6 + (20 - t) / 25 * (SK_H - 12); let xx = 0; const P = [`0,${y(r.tWinter.punkte[0].t).toFixed(1)}`];
    r.tWinter.punkte.slice(1).forEach((p, i) => { xx += W[i]; P.push(`${xx.toFixed(2)},${y(p.t).toFixed(1)}`); });
    lin = `<svg class="ws-tl" viewBox="0 0 100 ${SK_H}" preserveAspectRatio="none"><polyline points="${P.join(' ')}" vector-effect="non-scaling-stroke"/></svg>`; }
  el.innerHTML = h + fug + lin;
  $('#wsMass').innerHTML = S.map((s, i) => `<div style="width:${W[i]}%">${W[i] > 6 ? skDicke(s.d) : ''}</div>`).join('');
  $('#wsQd').textContent = `Gesamt ${zahl(S.reduce((a, s) => a + (+s.d || 0), 0), 1)} cm`;
}
function drauf(b, r) {
  const el = $('#wsDrauf'); if (!el) return;
  const u = r && r.u; if (!u || !u.gruppen.length) { el.hidden = true; el.innerHTML = ''; return; }
  const A = r.aktiv, G = u.gruppen, g0 = A[G[0].L[0]], g1 = G[1] ? A[G[1].L[0]] : null, P = 150, kp = (s) => { const q = (b.schichten || [])[A.indexOf(s)] || {}; return q; };
  const q0 = kp(g0), q1 = g1 ? kp(g1) : null, f = 1.4;
  let sv = '';
  if (q0.abstand > 0) for (let x = 0; x < P; x += q0.abstand * f) sv += `<rect x="${x + 8}" y="0" width="${q0.breite * f}" height="${P}" class="h"/>`;
  if (q1 && q1.abstand > 0) { for (let y = 0; y < P; y += q1.abstand * f) sv += `<rect x="0" y="${y + 5}" width="${P}" height="${q1.breite * f}" class="h q"/>`;
    if (q0.abstand > 0) for (let x = 0; x < P; x += q0.abstand * f) for (let y = 0; y < P; y += q1.abstand * f) sv += `<rect x="${x + 8}" y="${y + 5}" width="${q0.breite * f}" height="${q1.breite * f}" class="hh"/>`; }
  const nm = (m) => G.map((g, k) => ((m >> k) & 1 ? 'Holz' : 'Dämmung')).join(' / ');
  const kl = (m) => (m === 0 ? 'd' : m === (1 << G.length) - 1 ? 'hh' : 'h');
  el.hidden = false;
  el.innerHTML = `<b>Draufsicht der Gefache</b><svg viewBox="0 0 ${P} ${P}">${sv}</svg>
    <table>${u.pfade.map((t) => `<tr><td><span class="q ${kl(t.m)}"></span>${nm(t.m)}</td><td class="r">${zahl(t.f * 100, 1)} %</td></tr>`).join('')}</table>
    <div class="mute">${G.length > 1 ? 'innen → außen; Gefache kreuzweise' : 'ein Gefach'}${G.some((g) => g.L.length > 1) ? ' · in Flucht: Holz durchgehend' : ''}</div>`;
}

/* ---------- Ändern ---------- */
const skVerschiebe = (S, i, k) => { if (k === i || k === i + 1) return false; const [s] = S.splice(i, 1); S.splice(k > i ? k - 1 : k, 0, s); return true; };
V.addEventListener('click', (e) => {
  const b = bauteil(); if (!b) return;
  const S = b.schichten || [], t = e.target.closest('[data-skm],[data-skp],[data-sgl],[data-sgef],[data-sneu],[data-sdreh],[data-skfehlt],[data-splus],[data-smehr]'); if (!t || t.disabled) return;
  const i = +t.dataset.si;
  if (t.dataset.skm || t.dataset.skp) { const k = t.dataset.skm || t.dataset.skp, s = S[i], st = k === 'd' ? 0.5 : k === 'abstand' ? 2.5 : 1, lo = k === 'd' ? 0.5 : k === 'breite' ? 1 : (+s.breite || 1) + 1;
    s[k] = Math.max(lo, Math.round(((+s[k] || 0) + (t.dataset.skp ? st : -st)) * 100) / 100); bauteilSpeichern(k === 'd' ? 'Dicke geändert' : 'Gefach geändert'); return; }
  if (t.dataset.sgl != null) { const s = S[+t.dataset.sgl]; if (t.dataset.v === 'flucht') s.gl = 'flucht'; else delete s.gl; bauteilSpeichern(t.dataset.v === 'flucht' ? 'Gefach in Flucht' : 'Gefach kreuzweise'); return; }
  if (t.dataset.sgef != null) { gefachUmschalten(S[+t.dataset.sgef]); return; }
  if (t.dataset.sneu != null) { schichtNeu(); return; }
  if (t.dataset.sdreh != null) { schichtenUmdrehen(); return; }
  if (t.dataset.skfehlt != null) { const s = S[+t.dataset.skfehlt]; s.d = Math.round(((+s.d || 0) + +t.dataset.cm) * 10) / 10; bauteilSpeichern(`Dämmung ${ntz(t.dataset.cm)} cm dicker`); return; }
  if (t.dataset.splus != null) { const k = +t.dataset.splus; bsWaehlen('', (id) => { const m = BSI[id]; S.splice(k, 0, { m: id, d: skDaemm(m) ? 10 : /Folie|Bahn/i.test((m && m.kat) || '') ? 0.05 : 1.5 }); bauteilSpeichern('Schicht eingefügt'); }, 'Neue Schicht an dieser Stelle'); return; }
  if (t.dataset.smehr != null) { mehrMenue(t, b, +t.dataset.smehr); }
});
function gefachUmschalten(s) {
  if (s.m2) { delete s.m2; delete s.breite; delete s.abstand; delete s.gl; bauteilSpeichern('Gefach entfernt'); return; }
  Object.assign(s, { m2: 'holz_nadel', breite: 6, abstand: 62.5 }); bauteilSpeichern('Gefach hinzugefügt');
}
function mehrMenue(anker, b, i) {
  const S = b.schichten, s = S[i];
  pickMenu(anker, { items: [
    { value: 'gef', title: s.m2 ? 'Gefach entfernen' : 'Gefach (Sparren, Ständer, Latten) …' },
    { value: 'fach', title: 'Fachwerte: μ, sd …' }, { value: 'bs', title: 'Baustoff wählen …' },
    { value: 'in', title: 'Nach innen', sub: 'Strg+↑', aus: !i }, { value: 'out', title: 'Nach außen', sub: 'Strg+↓', aus: i >= S.length - 1 },
    { value: 'weg', title: 'Schicht entfernen', sub: 'Entf' }], onPick: (v) => {
    if (v === 'gef') gefachUmschalten(s);
    else if (v === 'fach') fachwerte(s);
    else if (v === 'bs') bsWaehlen(s.m, (id) => { s.m = id; delete s.lam; delete s.mu; delete s.sd; bauteilSpeichern('Baustoff gewählt'); }, 'Baustoff der Schicht');
    else if (v === 'in' || v === 'out') { if (skVerschiebe(S, i, v === 'in' ? i - 1 : i + 2)) bauteilSpeichern('Schicht verschoben'); }
    else if (v === 'weg') { S.splice(i, 1); bauteilSpeichern('Schicht entfernt'); }
  } });
}
function fachwerte(s) {   // SA-4: μ/sd nicht als Spalte, sondern hier; leer = Wert des Baustoffs
  const m = BSI[s.m] || {};
  modalBox(`<h3>Fachwerte – ${esc(s.name || bsName(m) || 'Schicht')}</h3><div class="ws-f">
      <label>μ (Diffusionswiderstandszahl)<input data-fw="mu" value="${ntz(s.mu)}" placeholder="${ntz(m.mu)}" inputmode="decimal"></label>
      <label>sd (m, statt μ – z. B. Folien)<input data-fw="sd" value="${ntz(s.sd)}" placeholder="${m.sd != null ? ntz(m.sd) : ''}" inputmode="decimal"></label></div>
    <p class="mute" style="font-size:.85rem">Leer = Wert des Baustoffs. ρ und c kommen aus der Baustoff-Datenbank.</p>
    <div class="btns"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Übernehmen</button></div>`, (k, bg, close) => {
    if (k === 'x') return close();
    if (k !== 'ok') return;
    ['mu', 'sd'].forEach((f) => { const v = pz(bg.querySelector(`[data-fw="${f}"]`).value); if (v == null) delete s[f]; else s[f] = v; });
    close(); bauteilSpeichern('Fachwerte geändert');
  });
}
/* Ziehen: Liste senkrecht (⋮⋮), Querschnitt waagerecht (Fläche), Fuge = Dicke der Schicht links davon */
let SKZ = null;
V.addEventListener('pointerdown', (e) => {
  const b = bauteil(); if (!b || e.button !== 0 || e.target.closest('.plus')) return;
  const f = e.target.closest('.ws-fuge'), g = e.target.closest('.ws-grip'), l = e.target.closest('.ws-lage');
  if (!f && !g && !l) return;
  e.preventDefault();
  if (f) { const i = +f.dataset.fuge, s = b.schichten[i]; SKZ = { art: 'fuge', i, d0: +s.d || 0, x0: e.clientX, bw: $('#wsBand').getBoundingClientRect().width, gs: b.schichten.reduce((a, x) => a + (+x.d || 0), 0) }; f.classList.add('an'); return; }
  const i = +(g ? g.dataset.grip : l.dataset.lage);
  SKZ = { art: g ? 'liste' : 'band', i, x0: e.clientX, y0: e.clientY, k: null };
});
addEventListener('pointermove', (e) => {
  if (!SKZ) return;
  const b = bauteil(); if (!b) { SKZ = null; return; }
  if (SKZ.art === 'fuge') {
    const s = b.schichten[SKZ.i]; s.d = Math.max(0.5, Math.round((SKZ.d0 + (e.clientX - SKZ.x0) / SKZ.bw * SKZ.gs) * 2) / 2);
    const inp = V.querySelector(`input[data-sk="d"][data-si="${SKZ.i}"]`); if (inp) inp.value = skDicke(s.d);
    schichtenNeu(b); const n = V.querySelector(`.ws-fuge[data-fuge="${SKZ.i}"]`); if (n) n.classList.add('an');
    SKZ.zog = true; return;
  }
  if (!SKZ.zog && Math.hypot(e.clientX - SKZ.x0, e.clientY - SKZ.y0) < 4) return;
  SKZ.zog = true;
  V.querySelectorAll('.ws-platz,.ws-mark').forEach((x) => x.remove());
  V.querySelectorAll(`[data-zb="${SKZ.i}"],[data-lage="${SKZ.i}"]`).forEach((x) => x.classList.add('zieht'));
  if (SKZ.art === 'liste') {
    const Z = [...V.querySelectorAll('.ws-zb')]; let k = Z.length;
    for (let j = 0; j < Z.length; j++) { const r = Z[j].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { k = j; break; } }
    SKZ.k = k; const p = document.createElement('div'); p.className = 'ws-platz'; if (k < Z.length) Z[k].before(p); else Z[Z.length - 1].after(p);
  } else {
    const L = [...V.querySelectorAll('.ws-lage')], B = $('#wsBand').getBoundingClientRect(); let k = L.length;
    for (let j = 0; j < L.length; j++) { const r = L[j].getBoundingClientRect(); if (e.clientX < r.left + r.width / 2) { k = j; break; } }
    SKZ.k = k; const x = k < L.length ? L[k].getBoundingClientRect().left : B.right, m = document.createElement('div'); m.className = 'ws-mark'; m.style.left = (x - B.left) + 'px'; $('#wsBand').appendChild(m);
  }
});
addEventListener('pointerup', () => {
  if (!SKZ) return; const z = SKZ; SKZ = null;
  V.querySelectorAll('.ws-platz,.ws-mark').forEach((x) => x.remove()); V.querySelectorAll('.zieht,.ws-fuge.an').forEach((x) => x.classList.remove('zieht', 'an'));
  const b = bauteil(); if (!b || !z.zog) return;
  if (z.art === 'fuge') { bauteilSpeichern('Dicke geändert'); return; }
  if (z.k != null && skVerschiebe(b.schichten, z.i, z.k)) bauteilSpeichern('Schicht verschoben');
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && SKZ) { SKZ = null; zeichne(); return; }
  const z = e.target.closest && e.target.closest('.ws-lz'); if (!z || !(e.ctrlKey || e.metaKey) || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const b = bauteil(), i = +z.dataset.lz; if (!b) return;
  e.preventDefault();
  if (skVerschiebe(b.schichten, i, e.key === 'ArrowUp' ? i - 1 : i + 2)) { Promise.resolve(bauteilSpeichern('Schicht verschoben')).then(() => { const n = V.querySelector(`.ws-lz[data-lz="${e.key === 'ArrowUp' ? i - 1 : i + 1}"]`); if (n) n.focus(); }); }
});
V.addEventListener('mouseover', (e) => {   // Zeile und Fläche im Querschnitt leuchten gemeinsam
  const x = e.target.closest('.ws-zb,.ws-lage'); if (!x || SKZ) return; const i = x.dataset.zb ?? x.dataset.lage;
  V.querySelectorAll('.ws-zb.hl,.ws-lage.hl').forEach((y) => y.classList.remove('hl'));
  V.querySelectorAll(`[data-zb="${i}"],[data-lage="${i}"]`).forEach((y) => y.classList.add('hl'));
});

/* ---------- Soll fürs Gebäude (SA-14): eine Wahl oben, gemerkt am Nachweis ---------- */
function sollHtml() {
  const S = R7.sollVon(sollK()), w = (t) => R7.sollUmax({ typ: t, massnahme: (R7.massnahmen(t)[0] || {}).k }, S.k, zone());
  return `<div class="ws-soll"><span class="k">Anforderung (Soll) fürs Gebäude</span><button type="button" class="ws-sollk" data-wssoll><span>${esc(S.n)}</span><span>▾</span></button>
    <span class="mute">${S.k === 'gm7' ? 'je Bauteil nach der Maßnahme (Anlage 7)' : `Wand ${zahl(w('wand'))} · Dach ${zahl(w('steildach'))} · Fenster ${zahl(w('fenster'))} W/m²K`} · <span title="${esc(S.quelle)}">Quelle: ${esc(S.quelle.split(' (')[0])}, Stand ${esc(S.stand)}</span></span></div>`;
}
document.addEventListener('click', (e) => {
  const k = e.target.closest && e.target.closest('[data-wssoll]'); if (!k || !D) return;
  pickMenu(k, { items: R7.SOLL.map((x) => ({ value: x.k, title: x.n, sub: x.quelle, group: x.gruppe, on: x.k === sollK() })), onPick: (v) => speichern({ grundlagen: { soll: v } }, 'Anforderung (Soll) geändert') });
});
