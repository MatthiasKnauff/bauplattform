/* Ausschreibung (AVA) – Handy-Ansicht, Start.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Handy-Ansicht: übersichtlich, nur lesen (wie im Bauzeitenplan) ----------
   Aufträge: alle LVs des Projekts mit Auftrag, Nachträgen, Leistungsstand, abgerechnet · LV: Titel mit Summen, Positionen
   (Tippen zeigt den Langtext) · Nachträge · Rechnungen. Bearbeiten geht am Computer („Desktop-Ansicht“ schaltet um). */
const MOB = (() => {
  const LSK = 'ava.mobilAus';
  const schmal = Math.min(window.innerWidth, screen.width || 9999) <= 760, touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!((schmal && touch) || /iPhone|Android.+Mobile/i.test(navigator.userAgent))) return null;
  try { localStorage.removeItem(LSK); } catch { /* egal */ }   // am Handy immer die Ansicht – bearbeitet wird am Computer
  document.documentElement.classList.add('mobil');
  const box = $('#mView'), st = { modus: LS.get('mModus', 'lvs'), auf: new Set(), q: '', T: 0, tok: 0, R: [] };
  const pct = (a, b) => (b ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0);
  const stLbl = (k) => (STATUS.find((x) => x[0] === k) || [, k])[1];
  function vAuf() {
    const A = LIST.filter((x) => !x.archived && (x.vergeben || x.frei));
    if (!A.length) return '<p class="mu" style="padding:1rem;color:var(--mute)">In diesem Projekt ist noch nichts vergeben.</p>';
    const S = A.reduce((s, x) => ({ a: s.a + (x.auftrag || 0), sch: s.sch + (x.auftrag ? 0 : x.schaetzung || 0), n: s.n + (x.nachtraege || 0), ab: s.ab + (x.abgerechnet || 0), p: s.p + (x.prognose || 0) }), { a: 0, sch: 0, n: 0, ab: 0, p: 0 });
    return `<div class="mv-k"><div><small>Aufträge</small><b>${eur0(S.a)}</b>${S.sch ? `<span class="sub"> · ${eur0(S.sch)} noch nicht vergeben</span>` : ''}</div><div><small>Nachträge beauftragt</small><b>${eur0(S.n)}</b></div>
        <div><small>Prognose</small><b>${eur0(S.p)}</b></div><div><small>abgerechnet</small><b>${eur0(S.ab)}</b><span class="sub"> · ${pct(S.ab, S.a + S.n)} %</span></div></div>
      ${A.map((x) => { const ges = (x.auftrag || 0) + (x.nachtraege || 0);
        return `<button class="mk" data-mlv="${x.id}"><div class="mk-h"><b>${esc(x.nr)} ${esc(x.name)}</b><span class="mk-tag${x.status === 'vergeben' ? ' ok' : ''}">${esc(stLbl(x.status))}</span></div>
          <div class="mk-z">${esc([x.gewerk, x.auftragnehmer].filter(Boolean).join(' · ') || 'noch nicht vergeben')}</div>
          ${x.auftrag ? `<div class="mk-r"><span>Auftrag</span>${eur0(x.auftrag)}</div>` : `<div class="mk-r"><span>Schätzung</span>${eur0(x.schaetzung)}</div>`}
          ${x.nachtraege || x.nt_angemeldet ? `<div class="mk-r"><span>Nachträge</span>${eur0(x.nachtraege)}${x.nt_angemeldet ? ` <small style="color:#e07b3a">+ ${eur0(x.nt_angemeldet)} angemeldet</small>` : ''}</div>` : ''}
          ${ges ? `<div class="mk-r"><span>Leistungsstand · abgerechnet</span>${eur0(x.leistung)} · ${eur0(x.abgerechnet)}</div>
          <div class="mk-b"><u style="width:${pct(x.leistung, ges)}%"></u><i style="width:${pct(x.abgerechnet, ges)}%"></i></div>` : ''}</button>`; }).join('')}`;
  }
  const preisVon = (x) => (vergeben() ? (L.vergabe.preise || {})[x.id] : x.ep_s);
  function vLvM() {
    if (!L) return '<p style="padding:1rem;color:var(--mute)">Kein LV gewählt.</p>';
    const I = items(), K = L.calc, ges = K.auftrag + K.nachtraege.beauftragt;
    let h = `<div class="mv-k"><div><small>${vergeben() ? 'Auftrag' : 'Schätzung'}</small><b>${eur0(vergeben() ? K.auftrag : K.schaetzung)}</b>${L.vergabe.bieter ? `<span class="sub"> · ${esc(L.vergabe.bieter)}</span>` : ''}</div>
      <div><small>Nachträge beauftragt</small><b>${eur0(K.nachtraege.beauftragt)}</b>${K.nachtraege.angemeldet ? `<span class="sub"> · ${eur0(K.nachtraege.angemeldet)} angem.</span>` : ''}</div>
      <div><small>Leistungsstand</small><b>${eur0(K.leistung)}</b><span class="sub"> · ${pct(K.leistung, ges)} %</span></div><div><small>abgerechnet</small><b>${eur0(K.abgerechnet)}</b></div></div>`;
    let offen = false, sum = 0, tit = null;
    const fl = () => { if (tit) h += `</div>`; };
    I.forEach((x) => {
      if (x.typ === 'titel') {
        fl(); const lv = x.lvl || 1; let s2 = 0;
        for (let j = I.indexOf(x) + 1; j < I.length && !(I[j].typ === 'titel' && (I[j].lvl || 1) <= lv); j++) { const y = I[j]; const ep = preisVon(y); if (y.typ === 'pos' && zaehlt(y) && ep != null) s2 += (y.menge || 0) * ep; }
        offen = !st.auf.has(x.id); tit = x;
        h += `<section class="mg"><h3 data-mt="${esc(x.id)}" style="padding-left:${(lv - 1) * .8}rem">${offen ? '▾' : '▸'} ${esc(x.oz)} ${esc(x.kurz)}<span class="mg-s">${s2 ? eur0(s2) : ''}</span></h3><div${offen ? '' : ' hidden'}>`;
        return;
      }
      if (x.art === 'T') { h += `<div class="mp grau"><div class="t" style="font-style:italic">${esc(x.kurz)}</div>${x.lang ? `<div class="lt">${esc(x.lang)}</div>` : ''}</div>`; return; }
      const ep = preisVon(x), gp = ep != null && zaehlt(x) ? (x.menge || 0) * ep : null; sum += gp || 0;
      h += `<div class="mp${ohneGB(x) || x.entf ? ' grau' : ''}" data-mp="${esc(x.id)}"><div class="o">${esc(x.oz)}${x.nt ? ` · <b style="color:#e07b3a">${esc(x.nt)} ${esc(x.nt_status || '')}</b>` : ''}${ohneGB(x) ? ' · ohne GB' : ''}${x.entf ? ' · entfällt' : ''}</div>
        <div class="t">${esc(x.kurz)}</div><div class="z"><span>${nf(x.menge)} ${esc(x.einheit || '')}${ep != null ? ' × ' + nf2(ep) + ' €' : ''}</span><b>${gp != null ? eur(gp) : ''}</b></div>
        ${st.lang === x.id && x.lang ? `<div class="lt">${esc(x.lang)}</div>` : ''}</div>`;
    });
    fl();
    return h + `<p class="mv-f" style="margin-top:.8rem">Summe netto <b>${eur(sum)}</b></p>`;
  }
  function vNt() {
    if (!L) return '';
    const N = items().filter((x) => x.nt); if (!N.length) return '<p style="padding:1rem;color:var(--mute)">Keine Nachträge in diesem LV.</p>';
    const VP = L.vergabe.preise || {};
    return N.map((x) => { const ep = VP[x.id], gp = ep != null ? (x.menge || 0) * ep : null, s = x.nt_status || 'angemeldet';
      return `<div class="mk" style="--gw:${s === 'beauftragt' ? '#2f9e5a' : s === 'abgelehnt' ? '#9e9e9e' : '#e07b3a'}"><div class="mk-h"><b>${esc(x.nt)} · ${esc(x.kurz)}</b><span class="mk-tag ${s === 'beauftragt' ? 'ok' : s === 'angemeldet' ? 'w' : ''}">${esc(s)}</span></div>
        <div class="mk-r"><span>${nf(x.menge)} ${esc(x.einheit || '')}${ep != null ? ' × ' + nf2(ep) + ' €' : ''}</span>${gp != null ? eur(gp) : '–'}</div>${x.nt_grund ? `<div class="mk-z">${esc(x.nt_grund)}</div>` : ''}</div>`; }).join('');
  }
  function vRe() {
    if (!L) return '';
    if (!L.rechnungen.length) return '<p style="padding:1rem;color:var(--mute)">Noch keine Rechnungen zu diesem LV.</p>';
    const RC = Object.fromEntries(L.calc.rechnungen.map((r) => [r.id, r]));
    return [...L.rechnungen].reverse().map((r) => { const c = RC[r.id] || {}, g = r.status === 'geprueft';
      return `<div class="mk" style="--gw:${g ? '#2f9e5a' : '#e0a030'}"><div class="mk-h"><b>${r.nr}. ${r.art === 'schluss' ? 'Schlussrechnung' : 'Abschlagsrechnung'}</b><span class="mk-tag ${g ? 'ok' : 'w'}">${g ? 'geprüft' : 'in Prüfung'}</span></div>
        <div class="mk-z">${[r.re_nr ? 'Nr. ' + esc(r.re_nr) : '', r.datum ? de(r.datum) : '', r.eingang ? 'Eingang ' + de(r.eingang) : ''].filter(Boolean).join(' · ')}</div>
        ${r.gefordert ? `<div class="mk-r"><span>gefordert (kumuliert)</span>${eur(r.gefordert)}</div>` : ''}
        <div class="mk-r"><span>anerkannt (kumuliert)</span>${eur(c.anerkannt)}</div><div class="mk-r"><span>Zahlbetrag netto · brutto</span><b>${eur(c.zahlung)} · ${eur(c.brutto)}</b></div></div>`; }).join('');
  }
  function vLvs() {   // alle LVs des Projekts – Tippen öffnet die Positionen
    const A = LIST.filter((x) => !x.archived);
    if (!A.length) return '<p style="padding:1rem;color:var(--mute)">In diesem Projekt gibt es noch kein Leistungsverzeichnis.</p>';
    return A.map((x) => `<button class="mk" data-mlv="${x.id}" style="--gw:${x.vergeben || x.frei ? '#2f9e5a' : x.n_angebote ? '#e0a030' : 'var(--line)'}"><div class="mk-h"><b>${esc(x.nr)} ${esc(x.name)}</b><span class="mk-tag${x.vergeben || x.frei ? ' ok' : ''}">${esc(stLbl(x.status))}</span></div>
      <div class="mk-z">${esc([x.gewerk, x.auftragnehmer].filter(Boolean).join(' · ') || (x.n_angebote ? `${x.n_angebote} Angebot${x.n_angebote === 1 ? '' : 'e'}` : 'in Ausschreibung'))}</div>
      <div class="mk-r"><span>${x.n_pos} Positionen</span>${x.auftrag ? eur0(x.auftrag) : x.schaetzung ? 'Schätzung ' + eur0(x.schaetzung) : ''}</div></button>`).join('');
  }
  function vAm() {   // Aufmaß je Position des gewählten LV: LV-Menge, aufgemessen, Anteil
    if (!L) return '<p style="padding:1rem;color:var(--mute)">Kein LV gewählt.</p>';
    const P = items().filter((x) => x.typ === 'pos' && x.art !== 'T'), AM = L.calc.aufmass || {}, VP = (L.vergabe && L.vergabe.preise) || {};
    if (!P.length) return '<p style="padding:1rem;color:var(--mute)">Dieses LV hat keine Positionen.</p>';
    const mit = P.filter((x) => AM[x.id]), ges = P.reduce((a, x) => a + (AM[x.id] || 0) * (VP[x.id] || 0), 0);
    return `<div class="mv-k"><div><small>Positionen mit Aufmaß</small><b>${mit.length}</b><span class="sub"> von ${P.length}</span></div><div><small>Leistungsstand</small><b>${eur0(L.calc.leistung)}</b></div></div>`
      + P.map((x) => { const m = AM[x.id] || 0, q = x.menge ? Math.round(m / x.menge * 100) : null;
        return `<div class="mp${m ? '' : ' grau'}" data-mp="${esc(x.id)}"><div class="o">${esc(x.oz)}${x.nt ? ` · <b style="color:#e07b3a">${esc(x.nt)}</b>` : ''}</div><div class="t">${esc(x.kurz)}</div>
          <div class="z"><span>LV ${nf(x.menge)} ${esc(x.einheit || '')} · aufgemessen <b>${nf(m)}</b></span><b${q != null && q > 110 ? ' style="color:#e07b3a"' : ''}>${q != null ? q + ' %' : ''}</b></div>
          ${x.menge ? `<div class="mk-b"><i style="width:${Math.min(100, q || 0)}%"></i></div>` : ''}${st.lang === x.id && x.lang ? `<div class="lt">${esc(x.lang)}</div>` : ''}</div>`; }).join('');
  }
  function vReAlle() {   // alle Rechnungen im Projekt, je LV
    const A = LIST.filter((x) => !x.archived && (x.rechnungen || []).length);
    if (!A.length) return '<p style="padding:1rem;color:var(--mute)">Noch keine Rechnungen in diesem Projekt.</p>';
    return A.map((x) => `<div class="mv-g">${esc(x.nr)} ${esc(x.name)}${x.auftragnehmer ? ' · ' + esc(x.auftragnehmer) : ''}</div>` + [...x.rechnungen].reverse().map((r) => { const g = r.status === 'geprueft';
      return `<button class="mk" data-mre="${x.id}" style="--gw:${g ? '#2f9e5a' : '#e0a030'}"><div class="mk-h"><b>${esc(reTitel(r))}</b><span class="mk-tag ${g ? 'ok' : 'w'}">${g ? 'geprüft' : 'in Prüfung'}</span></div>
        ${r.re_nr ? `<div class="mk-z">Nr. ${esc(r.re_nr)}</div>` : ''}<div class="mk-r"><span>anerkannt (kumuliert)</span>${eur(r.anerkannt)}</div><div class="mk-r"><span>Zahlbetrag netto</span><b>${eur(r.zahlung)}</b></div></button>`; }).join('')).join('');
  }
  function mvLvWahl() {   // LV wählen: Liste von unten (wie auf dem Handy üblich), mit Suchfeld; schließt nur über ✕ oder die Auswahl
    const A = LIST.filter((x) => !x.archived || (L && x.id === L.id));
    const sh = document.createElement('div'); sh.className = 'mv-sh';
    sh.innerHTML = `<div class="in" role="dialog" aria-label="Leistungsverzeichnis wählen"><div class="hd"><b>Leistungsverzeichnis</b><button type="button" data-x aria-label="Schließen">✕</button></div>${A.length > 8 ? '<input type="search" placeholder="Filtern – Nummer, Name, Firma …" autocomplete="off">' : ''}<div class="ls"></div></div>`;
    const ls = sh.querySelector('.ls'), q = sh.querySelector('input');
    const zeig = () => { const f = (q ? q.value : '').trim().toLowerCase();
      ls.innerHTML = A.filter((x) => !f || [x.nr, x.name, x.auftragnehmer].join(' ').toLowerCase().includes(f)).map((x) => `<button type="button" data-lv="${x.id}" class="${L && L.id === x.id ? 'on' : ''}"><span class="nr">${esc(x.nr || '')}</span><span class="nm">${esc(x.name || '')}${x.auftragnehmer ? `<small>${esc(x.auftragnehmer)}</small>` : ''}</span>${L && L.id === x.id ? '<span class="ck">✓</span>' : ''}</button>`).join('') || '<p style="color:var(--mute);padding:.6rem">Nichts gefunden.</p>'; };
    zeig(); if (q) q.addEventListener('input', zeig);
    sh.addEventListener('click', async (e) => { if (e.target.closest('[data-x]')) { sh.remove(); return; } const b = e.target.closest('[data-lv]'); if (!b) return; sh.remove(); await openLv(+b.dataset.lv); });
    document.body.appendChild(sh); const on = ls.querySelector('.on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  function zeichnen() {
    if (st.modus === 'nt') st.modus = 'auftraege';
    const la = L && LIST.find((x) => x.id === L.id);
    const lvSel = LIST.length ? `<button type="button" class="mv-lvb" id="mLv" aria-haspopup="dialog"><span class="t"><b>${la ? esc([la.nr, la.name].filter(Boolean).join(' · ')) : 'LV wählen'}</b>${la && la.auftragnehmer ? `<small>${esc(la.auftragnehmer)}</small>` : ''}</span><i>▾</i></button>` : '';
    const M = [['lvs', 'LVs'], ['auftraege', 'Aufträge'], ['am', 'Aufmaß'], ['re', 'Rechnungen']], mAkt = st.modus === 'lv' ? (st.von || 'lvs') : st.modus;
    box.innerHTML = `<div class="mv-top"><div class="mv-q"><input type="search" id="mQ" placeholder="🔍 Suchen – Text, OZ, Firma …" value="${esc(st.q)}" autocomplete="off" enterkeyhint="search"></div>${true ? `<div class="mv-seg mv-wo" role="radiogroup" aria-label="Suchen in">${[['lv', 'dieses LV'], ['projekt', 'Projekt'], ['alle', 'alle Projekte']].map(([k, l]) => `<button type="button" data-vqwo="${k}" class="${vqWo() === k ? 'on' : ''}"${k === 'lv' && !L ? ' disabled' : ''}>${l}</button>`).join('')}</div>` : ''}${st.modus === 'lv' || st.modus === 'am' ? lvSel : ''}<div class="mv-seg">${M.map(([k, l]) => `<button data-mm="${k}" class="${k === mAkt ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="mv-b">${st.q.length > 1 ? '<p style="color:var(--mute)">Suche …</p>' : st.modus === 'lv' ? `<button class="mv-zur" data-mm="${st.von || 'lvs'}">‹ ${st.von === 'auftraege' ? 'Aufträge' : 'alle LVs'}</button>${vLvM()}${items().some((x) => x.nt) ? '<div class="mv-g">Nachträge</div>' + vNt() : ''}` : st.modus === 'am' ? vAm() : st.modus === 're' ? vReAlle() : st.modus === 'lvs' ? vLvs() : vAuf()}
      <p class="mv-f">Nur Ansicht – bearbeitet wird am Computer.</p></div>`;
    if (st.q.trim().length > 1) suchen();
  }
  async function suchen() {   // Volltextsuche wie am Computer (api/suche) – Ergebnisse statt der Liste
    const q = st.q.trim(), b = box.querySelector('.mv-b'); if (!b) return;
    if (q.length < 2) { zeichnen(); return; }
    const my = ++st.tok;
    try {
      const r = await api('api/suche?q=' + encodeURIComponent(q) + vqQs()); if (my !== st.tok) return;
      st.R = r.treffer.filter((t) => t.art !== 'tuer');
      let h = '', grp = '';
      st.R.forEach((t, k) => {
        const g = [vqWo() === 'alle' ? t.projekt : '', t.lv].filter(Boolean).join(' › '); if (g !== grp) { grp = g; h += `<div class="mv-g">${esc(g)}</div>`; }
        h += `<button class="mv-r" data-mr="${k}"><div class="o">${VQIC[t.art] || '▪'} ${esc(t.oz || (t.art === 'angebot' ? 'Bieter' : t.art === 'rechnung' ? 'Rechnung' : t.art === 'aufmass' ? 'Aufmaß' : ''))}${t.nt ? ' · ' + esc(t.nt) : ''}</div><div class="t">${vqMarkieren(t.titel, q)}</div>${t.text ? `<div class="s">${vqMarkieren(t.text, q)}</div>` : ''}</button>`;
      });
      b.innerHTML = h || `<p style="color:var(--mute);padding:.5rem 0">Nichts gefunden zu „${esc(q)}“${vqWo() === 'alle' ? '' : vqWo() === 'lv' ? ' in diesem LV – oben „Projekt“ wählen' : ' in diesem Projekt – oben „alle Projekte“ wählen'}.</p>`;
    } catch (er) { toast(er.message, true); }
  }
  async function gehe(t) {
    st.q = ''; document.activeElement && document.activeElement.blur && document.activeElement.blur();
    if (t.pid && t.pid !== pid) { pid = t.pid; LS.set('pid', pid); if (window.BPHead) BPHead.projektSetzen(pid); LIST = await lvListe(); }
    st.modus = t.art === 'rechnung' ? 're' : 'lv'; LS.set('mModus', st.modus); st.auf.clear(); st.lang = t.pos_id || null;
    if (t.lv_id) await openLv(t.lv_id);
    zeichnen();
    setTimeout(() => { const el = t.pos_id && box.querySelector(`[data-mp="${CSS.escape(t.pos_id)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('blink'); } else scrollTo(0, 0); }, 60);
  }
  box.addEventListener('input', (e) => { if (e.target.id === 'mQ') { st.q = e.target.value; clearTimeout(st.T); st.T = setTimeout(suchen, 300); } });
  box.addEventListener('click', (e) => { const w = e.target.closest('.mv-wo [data-vqwo]'); if (!w) return; LS.set('vqWo', w.dataset.vqwo); box.querySelectorAll('.mv-wo [data-vqwo]').forEach((b) => b.classList.toggle('on', b === w)); suchen(); });
  box.addEventListener('click', (e) => { if (e.target.closest('#mLv')) mvLvWahl(); });   // eigene Auswahl statt Systemliste
  box.addEventListener('click', async (e) => {
    const mr = e.target.closest('[data-mr]'); if (mr) { gehe(st.R[+mr.dataset.mr]); return; }
    const m = e.target.closest('[data-mm]'); if (m) { st.q = ''; st.modus = m.dataset.mm; LS.set('mModus', st.modus); zeichnen(); scrollTo(0, 0); return; }
    const k = e.target.closest('[data-mlv]'); if (k) { st.von = st.modus === 'auftraege' ? 'auftraege' : 'lvs'; st.modus = 'lv'; LS.set('mModus', 'lv'); await openLv(+k.dataset.mlv); scrollTo(0, 0); return; }
    const kr = e.target.closest('[data-mre]'); if (kr) { if (!L || L.id !== +kr.dataset.mre) await openLv(+kr.dataset.mre); st.modus = 'rlv'; zeichnenRe(); scrollTo(0, 0); return; }
    const t = e.target.closest('[data-mt]'); if (t) { const id = t.dataset.mt; if (st.auf.has(id)) st.auf.delete(id); else st.auf.add(id); zeichnen(); return; }
    const p = e.target.closest('[data-mp]'); if (p) { st.lang = st.lang === p.dataset.mp ? null : p.dataset.mp; zeichnen(); return; }
  });
  function zeichnenRe() {   // Rechnungen eines LV im Detail (wie bisher), mit Zurück
    zeichnen(); const b = box.querySelector('.mv-b'); if (b) b.innerHTML = `<button class="mv-zur" data-mm="re">‹ alle Rechnungen</button><div class="mv-g">${esc(L.nr)} ${esc(L.name)}</div>${vRe()}<p class="mv-f">Nur Ansicht – bearbeitet wird am Computer.</p>`;
    const sg = box.querySelector('[data-mm="re"].on, .mv-seg [data-mm="re"]'); if (sg) sg.classList.add('on');
  }
  return { zeichnen: () => (st.modus === 'rlv' ? zeichnenRe() : zeichnen()) };
})();
window.bpMobilAn = () => { try { localStorage.removeItem('ava.mobilAus'); } catch { /* egal */ } location.reload(); };

/* ---------- Start ---------- */
(async () => {
  $('#lbList').innerHTML = LB.map((l) => `<option value="${l}">`).join('');
  const me = await api('api/me'); applyLook(me);
  const conf = await api('api/platform');
  await header('Ausschreibung & Abrechnung', me, conf);
  if (BPHead.appEinstellungen) BPHead.appEinstellungen([{ key: 'katalog', label: 'Kataloge', render: (h) => { KatalogeEinst(h, { bd: '../baudaten/', ava: '', nachher: async () => { try { KAT = await api('api/katalog'); } catch { /* alter Stand bleibt */ } if (QU.pid) quLaden().catch(() => {}); } }); } },
    { key: 'abrechnung', label: 'Abrechnung', render: (h) => { abrEinst(h); } }]);
  api('api/kontakte').then((k) => { KONT = k; }).catch(() => { KONT = []; });
  await loadProj();
  await loadList();
  const hl = /lv=(\d+)/.exec(location.hash);   // Link aus den To-dos der Startseite: #lv=<id>[&pos=<id>][&tab=rechnungen][&vgdok=<id>]
  if (hl) {
    try {
      const lv = await api('api/lv/' + hl[1]), hp = /pos=([^&]+)/.exec(location.hash), ht = /tab=(\w+)/.exec(location.hash);
      await vqGehe({ lv_id: lv.id, pid: lv.project_id, projekt: lv.projekt || '', pos_id: hp ? decodeURIComponent(hp[1]) : null, art: ht && ht[1] === 'rechnungen' ? 'rechnung' : 'pos', titel: '' });
      const hv = /vgdok=(\d+)/.exec(location.hash);   // aus der Kommunikation: Protokoll / Vertrag gleich öffnen
      if (hv) { await vgLaden(lv.id); vgEditor(+hv[1]); }
    } catch (e) { toast(e.message, true); }
    history.replaceState(null, '', location.pathname + location.search);
  }
  if (QU.an) quLaden();
})().catch((e) => toast(e.message, true));
addEventListener('beforeunload', () => { if (saveT && L) navigator.sendBeacon && fetch('api/lv/' + L.id, { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rev: L.rev, data: L.data }) }); });

/* Kein Flackern beim Neuzeichnen: Spaltenbreiten und Rollposition noch vor dem ersten Bild setzen – jeder Bereich (auch Aufträge,
   Übersicht, Türliste) kehrt aus render() früh zurück; ohne das stand die Tabelle ein Bild lang in ihrer natürlichen Breite da */
{ const render0 = render;
  render = function (...a) { const x = render0.apply(this, a); try { spaltenGriffe(); } catch { /* egal */ } try { if (RZURUECK) RZURUECK(); } catch { /* egal */ } return x; }; }
/* Tabellen: Zelle mit Inhalt wird beim Hineinspringen (Klick, Tab, Enter) ganz markiert – Tippen überschreibt, F2 schreibt ans Ende */
(() => {
  const feld = (el) => el && el.matches && el.matches('table input:not([type]),table input[type=text],table input[type=number],table input[inputmode],table textarea.ed') && !el.readOnly && !el.disabled;
  let maus = false;
  document.addEventListener('pointerdown', () => { maus = true; setTimeout(() => { maus = false; }, 400); }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target; if (!feld(el) || !el.value) return;
    const sel = () => { if (document.activeElement === el) try { el.select(); } catch { /* egal */ } };
    if (maus) el.addEventListener('mouseup', (m) => { m.preventDefault(); sel(); }, { once: true }); else sel();
  });
  document.addEventListener('keydown', (e) => { if (e.key !== 'F2' || !feld(e.target)) return; e.preventDefault(); const n = e.target.value.length; try { e.target.setSelectionRange(n, n); } catch { /* egal */ } });
})();
