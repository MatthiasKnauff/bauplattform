/* Zeiten am Handy: „Woche“ und „Monat & Urlaub“ als reine Ansicht (erfasst wird nur in „Mein Tag“).
   Ein Tipp auf einen Tag öffnet ihn in „Mein Tag“ (gemeinsamer Handler [data-geh]); Wischen blättert (‹ › = [data-dn] / [data-mn]).
   Geladen nach zeiten-strahl.js – benutzt W, M, AN, G, ME, WT, wtag, dkurz, std, h2m, esc, PJN, zsFarbe, abwKarte, antragKarte. */
(function () {
  const st = document.createElement('style');
  st.textContent = `.zh{display:grid;gap:.6rem}
  .zh-nav{display:flex;align-items:center;justify-content:space-between;gap:.5rem}.zh-nav b{font-size:1.02rem}
  .zh-nav .ib{width:2.3rem;height:2.3rem;border-radius:50%}
  .zh-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem}
  .zh-sum div{background:var(--card);border:1px solid var(--line);border-radius:calc(14px*var(--rk,1));padding:.45rem .6rem}.zh-sum small{display:block;color:var(--mute);font-size:.72rem}.zh-sum b{font-size:1.1rem;font-variant-numeric:tabular-nums}
  .zh-plus{color:var(--ok,#2f7d4f)}.zh-minus{color:var(--y)}
  .zh-tag{display:block;width:100%;text-align:left;font:inherit;color:inherit;background:var(--card);border:1px solid var(--line);border-radius:calc(16px*var(--rk,1));padding:.55rem .7rem;cursor:pointer}
  .zh-tag.frei{background:transparent;border-style:dashed;color:var(--mute);padding:.4rem .7rem}
  .zh-t{display:flex;align-items:baseline;gap:.45rem}.zh-t b{font-size:.95rem}.zh-t small{color:var(--mute)}.zh-t .h{margin-left:auto;font-weight:700;font-variant-numeric:tabular-nums}
  .zh-st{font-size:.7rem;border-radius:calc(999px*var(--rkp,1));padding:.05rem .45rem;background:color-mix(in srgb,var(--mute) 14%,var(--card));color:var(--mute)}
  .zh-st.ok{background:color-mix(in srgb,var(--ok,#2f7d4f) 14%,var(--card));color:var(--ok,#2f7d4f)}.zh-st.of{background:color-mix(in srgb,#d08a10 16%,var(--card));color:#a86c06}
  .zh-st.ab{background:color-mix(in srgb,#3c6fb0 16%,var(--card));color:#3c6fb0}
  .zh-str{position:relative;height:14px;background:color-mix(in srgb,var(--mute) 13%,var(--card));border-radius:6px;margin:.45rem 0 .25rem;overflow:hidden}
  .zh-str i{position:absolute;top:0;bottom:0;border-radius:4px}
  .zh-pj{display:flex;gap:.3rem;flex-wrap:wrap}.zh-pj span{font-size:.72rem;border-radius:calc(999px*var(--rkp,1));padding:.05rem .5rem;background:color-mix(in srgb,var(--mute) 11%,var(--card));white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .zh-pj.v span{background:none;border:1px dashed var(--line);color:var(--mute)}
  .zh-str i.v{opacity:1;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 3px,transparent 3px 7px)}
  body.handy #dnav:empty,body.handy .top .fill{display:none}
  .zh-pj span::before{content:"";display:inline-block;width:.5rem;height:.5rem;border-radius:50%;margin-right:.3rem;background:var(--c)}
  .zh-k{background:var(--card);border:1px solid var(--line);border-radius:calc(16px*var(--rk,1));padding:.6rem .7rem}.zh-k h4{margin:0 0 .45rem;font-size:.86rem}
  .zh-bz{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.12rem .6rem;align-items:center;font-size:.8rem}.zh-bz>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .zh-bz .b{grid-column:1/-1;height:6px;border-radius:3px;background:color-mix(in srgb,var(--mute) 12%,var(--card));overflow:hidden;margin-bottom:.25rem}.zh-bz .b i{display:block;height:100%;border-radius:3px}
  .zh-kal .wk{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:.68rem;color:var(--mute);margin-bottom:.2rem}
  .zh-kal .g{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
  .zh-kal button{aspect-ratio:1;border:0;border-radius:calc(10px*var(--rk,1));display:flex;flex-direction:column;align-items:center;justify-content:center;font:inherit;font-size:.82rem;color:var(--ink);background:color-mix(in srgb,var(--mute) 8%,var(--card));padding:0;cursor:pointer;min-width:0}
  .zh-kal button small{font-size:.56rem;color:var(--mute);line-height:1.05;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
  .zh-kal button.we{background:none;color:var(--mute)}.zh-kal button.ok{background:color-mix(in srgb,var(--ok,#2f7d4f) 15%,var(--card))}.zh-kal button.ok small{color:var(--ok,#2f7d4f)}
  .zh-kal button.of{background:color-mix(in srgb,#d08a10 17%,var(--card))}.zh-kal button.of small{color:#a86c06}
  .zh-kal button.ab{background:#3c6fb0;color:#fff}.zh-kal button.ab small{color:#e3ecf8}
  .zh-kal button.an{background:repeating-linear-gradient(45deg,color-mix(in srgb,#3c6fb0 18%,var(--card)) 0 5px,var(--card) 5px 9px);color:#3c6fb0;box-shadow:inset 0 0 0 1.5px #3c6fb0}
  .zh-kal button.ft{color:var(--y)}.zh-kal button.hz{box-shadow:inset 0 0 0 2px var(--y)}
  .zh-leg{display:flex;gap:.7rem;flex-wrap:wrap;font-size:.7rem;color:var(--mute);margin:.45rem .1rem 0}.zh-leg i{display:inline-block;width:.7rem;height:.7rem;border-radius:3px;margin-right:.25rem;vertical-align:-1px}
  .zh-ring{display:flex;align-items:center;gap:.8rem}.zh-ring svg{width:76px;height:76px;flex:none;transform:rotate(-90deg)}
  .zh-ring b{font-size:1.35rem}.zh-ring small{display:block;color:var(--mute);font-size:.76rem}
  .zh-an{display:flex;align-items:center;gap:.5rem;padding:.42rem 0;border-top:1px solid var(--line);font-size:.83rem}.zh-an:first-child{border-top:0}.zh-an .zh-st{margin-left:auto}
  .zh-neu{display:block;width:100%;margin-top:.55rem;font:inherit;font-weight:600;color:var(--y);background:none;border:1.5px solid var(--y);border-radius:calc(12px*var(--rk,1));padding:.55rem;cursor:pointer}`;
  document.head.appendChild(st);
})();

const zhSaldo = (m) => `<b class="${m >= 0 ? 'zh-plus' : 'zh-minus'}">${(m >= 0 ? '+' : '−') + std(Math.abs(m))}</b>`;
const zhDauer = (x) => Math.max(0, (h2m(x.bis) || 0) - (h2m(x.von) || 0));
const zhTage = (n) => String(n).replace('.', ',') + (n === 1 ? ' Tag' : ' Tage');

function hWoche() {
  if (!W) return '';
  const T = W.tage, pj = PJN(), kw = (() => { const d = new Date(T[0].tag + 'T12:00'); d.setDate(d.getDate() + 3); const j = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - j) / 864e5 - 3 + (j.getDay() + 6) % 7) / 7); })();
  const s = T.reduce((a, x) => ({ soll: a.soll + x.soll, ist: a.ist + (x.bestaetigt || x.abw ? x.ist : 0) }), { soll: 0, ist: 0 });
  const summe = {};
  const karte = (x) => {
    const L = [...x.bl.e.map((e) => ({ ...e, v: 0 })), ...x.bl.v.map((e) => ({ ...e, v: 1 }))].filter((e) => h2m(e.von) != null && h2m(e.bis) != null);
    const wt = `<b>${WT[wtag(x.tag)]} ${+x.tag.slice(8)}.</b>`;
    if (!L.length && !x.soll && !x.abw) return `<button type="button" class="zh-tag frei" data-geh="${x.tag}">${wt} <small>${x.feiertag ? esc(x.feiertag) : 'frei'}</small></button>`;
    const pro = {};
    const fest = L.filter((e) => !e.v), nurV = !fest.length;   // noch nichts übernommen: die Vorschläge zeigen (gestrichelt), aber nicht mitzählen
    (nurV ? L : fest).forEach((e) => { const k = e.project_id || 0; pro[k] = (pro[k] || 0) + zhDauer(e); if (!nurV) summe[k] = (summe[k] || 0) + zhDauer(e); });
    const ms = L.flatMap((e) => [h2m(e.von), h2m(e.bis)]), a = Math.min(7 * 60, ...ms), b = Math.max(18 * 60, ...ms), p = (m) => ((m - a) / (b - a) * 100).toFixed(2) + '%';
    const status = x.abw ? `<span class="zh-st ab">${esc(G.abw[x.abw] || '')}</span>` : x.bestaetigt ? '<span class="zh-st ok">✓</span>' : L.length ? `<span class="zh-st of">${x.tag === G.heute ? 'läuft' : 'offen'}</span>` : x.tag === G.heute ? '<small>heute</small>' : '';
    const h = x.bestaetigt || x.abw ? std(x.ist) : L.length && !nurV ? std(Object.values(pro).reduce((u, v) => u + v, 0)) : nurV && L.length ? '<small>Vorschlag</small>' : '–';
    return `<button type="button" class="zh-tag" data-geh="${x.tag}"><span class="zh-t">${wt}${x.feiertag ? `<small>${esc(x.feiertag)}</small>` : ''}${status}<span class="h">${h}</span></span>
      ${L.length ? `<span class="zh-str" style="display:block">${L.map((e) => `<i class="${e.v ? 'v' : ''}" style="left:${p(h2m(e.von))};width:${((zhDauer(e)) / (b - a) * 100).toFixed(2)}%;background-color:${zsFarbe(e.project_id)}"></i>`).join('')}</span>
      <span class="zh-pj${nurV ? ' v' : ''}">${Object.entries(pro).sort((u, v) => v[1] - u[1]).map(([k, m]) => `<span style="--c:${zsFarbe(+k)}">${esc((pj[k] || (+k ? 'Projekt ' + k : 'Büro')).slice(0, 28))} ${std(m)}</span>`).join('')}</span>` : ''}</button>`;
  };
  const sieben = T.filter((x, i) => i < 5 || x.bl.e.length || x.bl.v.length);
  const karten = sieben.map(karte).join(''), we = T.slice(5).filter((x) => !sieben.includes(x));
  const top = Object.entries(summe).sort((u, v) => v[1] - u[1]), max = top.length ? top[0][1] : 1;
  return `<div class="zh"><div class="zh-nav"><button type="button" class="ib" data-dn="-7" aria-label="Woche zurück">‹</button><b>KW ${kw} · ${dkurz(T[0].tag)} – ${dkurz(T[6].tag)}</b><button type="button" class="ib" data-dn="7" aria-label="Woche vor"${T[6].tag >= G.heute ? ' disabled' : ''}>›</button></div>
    <div class="zh-sum"><div><small>Ist</small><b>${std(s.ist)}</b></div><div><small>Soll</small><b>${std(s.soll)}</b></div><div><small>Saldo gesamt</small>${zhSaldo(W.konto.saldo)}</div></div>
    ${karten}${we.length ? `<div class="zh-tag frei">${we.map((x) => `${WT[wtag(x.tag)]} ${+x.tag.slice(8)}.`).join(' · ')} frei</div>` : ''}
    ${top.length ? `<div class="zh-k"><h4>Projekte dieser Woche</h4><div class="zh-bz">${top.map(([k, m]) => `<span>${esc(pj[k] || (+k ? 'Projekt ' + k : 'Büro / ohne Projekt'))}</span><b>${std(m)}</b><span class="b"><i style="width:${Math.max(3, m / max * 100).toFixed(1)}%;background:${zsFarbe(+k)}"></i></span>`).join('')}</div></div>` : ''}</div>`;
}

let ZH_ABW = false;   // Formular „Urlaub beantragen“ aufgeklappt
function hMonat() {
  if (!M) return '';
  const T = M.tage, k = M.konto, P = M.person, vor = wtag(T[0].tag);
  const s = T.reduce((a, x) => ({ soll: a.soll + (x.tag <= G.heute ? x.soll : 0), ist: a.ist + (x.bestaetigt || x.abw ? x.ist : 0) }), { soll: 0, ist: 0 });
  const kal = T.map((x) => {
    const off = !x.bestaetigt && !x.abw && x.tag < G.heute && (x.soll || x.offen);
    const ant = !x.abw && x.soll && AN.find((a) => a.status === 'offen' && a.user_id === ME.id && a.von <= x.tag && a.bis >= x.tag);
    const c = ant ? 'an' : x.abw ? 'ab' : x.bestaetigt ? 'ok' : off ? 'of' : !x.soll ? (x.feiertag ? 'we ft' : 'we') : '';
    const t = ant ? 'beantragt' : x.abw ? (G.abw[x.abw] || '') : x.feiertag ? x.feiertag : x.bestaetigt ? std(x.ist) : off ? 'offen' : '';
    return `<button type="button" data-geh="${x.tag}" class="${c}${x.tag === G.heute ? ' hz' : ''}" title="${esc(dlang(x.tag))}">${+x.tag.slice(8)}<small>${esc(t)}</small></button>`;
  }).join('');
  const ges = +P.urlaub || 0, gen = +k.urlaub_genommen || 0, bea = +k.urlaub_beantragt || 0, U = 2 * Math.PI * 15.9;
  const bogen = (anteil, ab, farbe) => `<circle cx="18" cy="18" r="15.9" fill="none" stroke="${farbe}" stroke-width="4" stroke-dasharray="${(anteil * U).toFixed(2)} ${U.toFixed(2)}" stroke-dashoffset="${(-ab * U).toFixed(2)}"/>`;
  const ring = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.9" fill="none" stroke="color-mix(in srgb,#3c6fb0 14%,transparent)" stroke-width="4"/>${ges ? bogen(Math.min(1, gen / ges), 0, '#3c6fb0') + (bea ? bogen(Math.min(1, bea / ges), Math.min(1, gen / ges), '#9db8dd') : '') : ''}</svg>`;
  const eigene = AN.filter((a) => a.user_id === ME.id && a.status !== 'zurueckgezogen').slice(0, 6);
  return `<div class="zh"><div class="zh-nav"><button type="button" class="ib" data-mn="-1" aria-label="Monat zurück">‹</button><b>${new Date(monat + '-15').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</b><button type="button" class="ib" data-mn="1" aria-label="Monat vor">›</button></div>
    <div class="zh-sum"><div><small>Ist</small><b>${std(s.ist)}</b></div><div><small>Soll bis heute</small><b>${std(s.soll)}</b></div><div><small>Saldo gesamt</small>${zhSaldo(k.saldo)}</div></div>
    <div class="zh-k zh-kal"><div class="wk">${WT.map((w) => `<span>${w}</span>`).join('')}</div><div class="g">${'<span></span>'.repeat(vor)}${kal}</div>
      <div class="zh-leg"><span><i style="background:color-mix(in srgb,var(--ok,#2f7d4f) 30%,var(--card))"></i>bestätigt</span><span><i style="background:color-mix(in srgb,#d08a10 35%,var(--card))"></i>offen</span><span><i style="background:#3c6fb0"></i>abwesend</span><span><i style="box-shadow:inset 0 0 0 1.5px #3c6fb0"></i>beantragt</span></div></div>
    <div class="zh-k"><div class="zh-ring">${ring}<div><b>${zhTage(+k.urlaub_rest)}</b><small>Urlaub übrig ${monat.slice(0, 4)} · ${String(gen).replace('.', ',')} genommen${bea ? ` · ${String(bea).replace('.', ',')} beantragt` : ''} · ${String(ges).replace('.', ',')} Anspruch</small></div></div>
      ${eigene.length ? `<div style="margin-top:.45rem">${eigene.map((a) => `<div class="zh-an"><span>${esc(dkurz(a.von))}${a.bis !== a.von ? '–' + esc(dkurz(a.bis)) : ''}</span><small style="color:var(--mute)">${esc(G.abw[a.art] || a.art)}, ${zhTage(+a.tage)}</small><span class="zh-st ${a.status === 'genehmigt' ? 'ok' : a.status === 'offen' ? 'of' : ''}">${AST[a.status] || a.status}</span></div>`).join('')}</div>` : ''}
      <button type="button" class="zh-neu" data-zhabw>${ZH_ABW ? '× schließen' : (G.antrag_pflicht && !G.admin ? '＋ Urlaub beantragen' : '＋ Urlaub, Krank, Frei eintragen')}</button></div>
    ${ZH_ABW ? abwKarte(G.heute) + (G.admin ? antragKarte() : '') : ''}</div>`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('[data-zhabw]')) { ZH_ABW = !ZH_ABW; zeichne(); }
});
(function () {   // Wischen blättert Woche bzw. Monat
  let x0 = null, y0 = 0;
  document.addEventListener('touchstart', (e) => { x0 = handy() && ['woche', 'monat'].includes(tab) && e.target.closest('#view') && !e.target.closest('input,select,textarea') ? e.touches[0].clientX : null; y0 = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
    const b = document.querySelector(`#view .zh-nav .ib:${dx < 0 ? 'last-child' : 'first-child'}`); if (b && !b.disabled) b.click();
  }, { passive: true });
})();
