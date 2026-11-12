'use strict';
/* Zeiten – Zeitstrahl (Mein Tag und Woche): Blöcke in der Farbe des Projekts, die Quelle als Zeichen und Streifen unten,
   Raster im Takt des Büros (Einstellungen), Pause als schraffierte Fläche.
   Ziehen: Block in der Mitte verschieben, an den Rändern Beginn/Ende ändern – rastet auf den Takt ein; was darunter liegt,
   kürzt der Server (bpcore/zeiten.ordnen). Klick in eine freie Stelle: Zeit eintragen, Pause hier, Kommen/Gehen setzen.
   Ablage unter dem Strahl: Kärtchen (eigene Projekte zuerst, Büro, Pause, freie Beschriftung) in den Strahl ziehen.
   Rückgängig: jede Antwort bringt den Stand davor mit (vorher) → POST api/tag/stand. Nutzt G, D, W, tag, tab, NEU, zeichne() aus zeiten.html. */
const ZS_PAL = ['#3f7fbf', '#d0762a', '#2f9a5a', '#9a5cc8', '#c8455f', '#2f9fb0', '#9a8f22', '#c25aa8', '#5865c9', '#8a6a3a', '#3fae8a', '#d4a020'];   // Nachbarn möglichst verschieden
const zsFarbe = (pid) => (pid ? ZS_PAL[(+pid - 1) % ZS_PAL.length] : '#7d8088');
const ZS_Q = { puls: ['🖥', '#4a7fb5', 'aus der Arbeit in der Plattform'], vorort: ['📍', '#2f9e5a', 'vor Ort (Baustelle)'], fahrt: ['≈🚗', '#e0a030', 'Fahrt (geschätzt)'],
  unterwegs: ['🚗', '#c47f12', 'Fahrt (erfasst)'], hand: ['✍', '#8a6fd1', 'von Hand / Stoppuhr'], stoppuhr: ['⏱', '#8a6fd1', 'von Hand / Stoppuhr'] };
const zsTakt = () => (G && G.takt) || 15;
let ZS_ZUG = 0;   // Zeitpunkt des letzten Ziehens – der folgende Klick zählt dann nicht

(function () {
  const st = document.createElement('style');
  st.textContent = `.zs-tl .b.zs{border-color:var(--pf)!important;background:color-mix(in srgb,var(--pf) 17%,var(--card));padding-bottom:7px;cursor:grab;touch-action:none;user-select:none}
  .zs-tl .b.zs::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:var(--qf)}
  .zs-tl .b.zs .zn{font-weight:600}.zs-tl .b.zs.v{border-style:dashed}
  .zs-tl .b.zp{border:1.5px dashed var(--mute);color:var(--mute);background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--mute) 22%,transparent) 0 6px,transparent 6px 11px);cursor:grab;touch-action:none;user-select:none}
  .zs-tl.fest .b{cursor:default}.zs-tl .b.zieh{box-shadow:var(--sh0,0 4px 14px rgba(0,0,0,.3));z-index:3;opacity:.92}
  .zs-tl .tq{position:absolute;top:0;bottom:0;width:0;border-left:1px dotted var(--line);opacity:.8}
  .zs-tl .zs-lab{position:absolute;top:-1.35rem;transform:translateX(-50%);background:var(--ink);color:var(--card);font-size:.72rem;padding:.05rem .35rem;border-radius:calc(4px*var(--rk,1));white-space:nowrap;z-index:4;pointer-events:none}
  .zs-tl .zs-vor{position:absolute;top:4px;bottom:4px;border:2px dashed var(--y);border-radius:calc(7px*var(--rk,1));background:color-mix(in srgb,var(--y) 10%,transparent);pointer-events:none}
  .zs-tl:not(.fest){cursor:copy}
  .zs-ab{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin:.55rem 0 .1rem;font-size:.8rem}
  .zs-ab>small{color:var(--mute);margin-right:.2rem}
  .zs-c{display:inline-flex;align-items:center;gap:.3rem;border:1.5px solid var(--pf,var(--line));background:color-mix(in srgb,var(--pf,var(--mute)) 12%,var(--card));color:var(--ink);border-radius:calc(999px*var(--rkp,1));padding:.18rem .6rem;cursor:grab;touch-action:none;user-select:none;white-space:nowrap;max-width:16rem;overflow:hidden;text-overflow:ellipsis;font:inherit;font-size:.8rem}
  .zs-c.zs-pa{border-style:dashed;--pf:var(--mute)}.zs-c.zs-mehr{cursor:pointer;border-style:dashed;background:none}
  .zs-c.zs-frei{padding:0 .2rem 0 .5rem;cursor:default}.zs-c.zs-frei b{cursor:grab;color:var(--mute);font-weight:400}
  .zs-c.zs-frei input{border:0;background:transparent;color:var(--ink);font:inherit;width:11rem;padding:.2rem .2rem;outline:0}
  .zs-geist{position:fixed;z-index:1200;pointer-events:none;transform:translate(-50%,-120%);box-shadow:var(--sh0,0 4px 14px rgba(0,0,0,.3))}
  .zs-anker{position:fixed;width:1px;height:1px;pointer-events:none}
  .zs-w{display:grid;gap:.3rem;min-width:620px}
  .zs-wz{display:grid;grid-template-columns:6.2rem minmax(0,1fr) 9.5rem;gap:.6rem;align-items:center}
  .zs-wz>button{border:0;background:none;color:var(--y);font:inherit;font-weight:600;text-align:left;cursor:pointer;padding:0;font-size:.86rem}
  .zs-wz>button small{display:block;color:var(--mute);font-weight:400;font-size:.74rem}
  .zs-wz>span{font-size:.78rem;color:var(--mute);font-variant-numeric:tabular-nums}.zs-wz>span b{color:var(--ink)}
  .zs-wz .tl{height:34px;margin:0}.zs-wz .tl .b{top:3px;height:28px;font-size:.68rem;padding:2px 5px 6px;white-space:nowrap}
  .zs-wk{height:1rem;margin:0;position:relative}.zs-wk .h{position:absolute;top:0;font-size:.72rem;color:var(--mute);transform:translateX(-50%)}
  .zs-aus{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--mute) 10%,transparent) 0 6px,transparent 6px 12px);pointer-events:none;z-index:0}
  .b.zs-va{opacity:.45;pointer-events:auto;cursor:default}
  .zs-wkopf{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem}.zs-wkopf h3{margin:0}`;
  document.head.appendChild(st);
})();

/* ---------------- Daten eines Tages (aus „Mein Tag“ oder der Woche) ---------------- */
function zsDaten(t0) {
  if (D && D.tag === t0) return { tag: t0, e: D.eintraege || [], v: D.vorschlaege || [], p: D.pausen || [], pf: D.pausen_fest, fest: !!D.bestaetigt, va: D.vorschlaege_aussen || [], kv: D.kommen || '', gv: D.gehen || '', kf: !!D.kommen_fest, gf: !!D.gehen_fest, k: D.kommen_fest ? D.kommen : '', g: D.gehen_fest ? D.gehen : '' };
  const x = W && W.tage.find((y) => y.tag === t0);
  return x ? { tag: t0, e: x.bl.e, v: x.bl.v, p: x.pausen || [], pf: x.pausen_fest, fest: !!x.bestaetigt } : null;
}
function zsBereich(L) {   // Stunden von … bis (mind. 7–18 Uhr)
  const ms = L.flatMap((x) => [h2m(x.von), h2m(x.bis)]).filter((x) => x != null);
  return [Math.min(7 * 60, ...ms.map((m) => Math.floor(m / 60) * 60)), Math.max(18 * 60, ...ms.map((m) => Math.ceil(m / 60) * 60))];
}
const zsAlleMitAussen = (dd) => [...zsAlle(dd), ...(dd.va || [])];
const zsAlle = (dd) => [...dd.e.map((e) => ({ ...e, k: 'e' + e.id })), ...dd.v.map((v, i) => ({ ...v, k: 'v' + i })), ...dd.p.map(([von, bis], i) => ({ von, bis, k: 'p' + i }))];

/* ---------------- Zeichnen ---------------- */
function zsBlock(x, a, b, klein) {
  const p = (m) => ((m - a) / (b - a) * 100).toFixed(3) + '%', v = h2m(x.von), z = h2m(x.bis);
  const pos = `left:${p(v)};width:calc(${((z - v) / (b - a) * 100).toFixed(3)}% - 2px)`;
  if (x.k[0] === 'p') return `<div class="b zp" data-spr="${x.k}" style="${pos}" title="Pause ${x.von}–${x.bis} – ziehen verschiebt, Klick für mehr">☕${klein ? '' : ' Pause'}</div>`;
  const pj = PJN(), q = ZS_Q[x.quelle] || ZS_Q.hand, name = x.notiz && !x.project_id ? x.notiz : pj[x.project_id] || (x.project_id ? 'Projekt ' + x.project_id : 'Büro');
  const tip = `${x.von}–${x.bis} · ${pj[x.project_id] || 'ohne Projekt'} · ${artKurz(x.art)} · ${q[2]}${x.notiz ? ' · ' + x.notiz : ''}${x.k[0] === 'v' ? ' · Vorschlag' : ''}`;
  return `<div class="b zs${x.k[0] === 'v' ? ' v' : ''}" data-spr="${x.k}" style="${pos};--pf:${zsFarbe(x.project_id)};--qf:${q[1]}" title="${esc(tip)}"><span class="zn">${q[0]} ${esc(name.slice(0, 26))}</span>${klein ? '' : `<br>${esc(artKurz(x.art))}`}</div>`;
}
function zsStrahl(dd, a, b, klein) {
  const t = zsTakt(), p = (m) => ((m - a) / (b - a) * 100).toFixed(3) + '%';
  let h = '';
  for (let s = a; s <= b; s += 60) h += `${klein ? '' : `<span class="h" style="left:${p(s)}">${s / 60}</span>`}<span class="hl" style="left:${p(s)}"></span>`;
  if (t < 60 && !klein) for (let s = a + t; s < b; s += t) if (s % 60) h += `<span class="tq" style="left:${p(s)}"></span>`;
  if (!dd.fest && (dd.k || dd.g)) {   // außerhalb von Kommen–Gehen: grau – zählt nicht, beim Bestätigen wird gefragt
    const km = dd.k ? h2m(dd.k) : null, gm = dd.g ? h2m(dd.g) : null;
    if (km != null && km > a) h += `<span class="zs-aus" style="left:0;width:${p(km)}" title="vor Kommen (${dd.k}) – zählt erst, wenn du es beim Bestätigen übernimmst"></span>`;
    if (gm != null && gm < b) h += `<span class="zs-aus" style="left:${p(gm)};right:0" title="nach Gehen (${dd.g}) – zählt erst, wenn du es beim Bestätigen übernimmst"></span>`;
    h += (dd.va || []).map((x) => { const v = h2m(x.von), z = h2m(x.bis); return `<div class="b zs v zs-va" style="left:${p(v)};width:calc(${((z - v) / (b - a) * 100).toFixed(3)}% - 2px);--pf:${zsFarbe(x.project_id)}" title="${esc(`${x.von}–${x.bis} · außerhalb von Kommen–Gehen – beim Bestätigen gefragt`)}"><span class="zn">${esc((PJN()[x.project_id] || 'Büro').slice(0, 20))}</span></div>`; }).join('');
  }
  h += zsAlle(dd).map((x) => zsBlock(x, a, b, klein)).join('');
  for (const [z, f, t] of [[dd.kv, dd.kf, 'Kommen'], [dd.gv, dd.gf, 'Gehen']]) {   // Arbeitszeitgrenzen als deutliche Linie (gestrichelt = Vorschlag)
    const m = z ? h2m(z) : null;
    if (m != null && m >= a && m <= b) h += `<span class="zs-gr${f ? '' : ' v'}${t === 'Gehen' ? ' g' : ''}" style="left:${p(m)}" title="${t} ${z}${f ? '' : ' (Vorschlag)'}">${klein ? '' : `<b>${t} ${z}</b>`}</span>`;
  }
  if (dd.tag === G.heute) { const n = new Date(), m = n.getHours() * 60 + n.getMinutes(); if (m >= a && m <= b) h += `<span class="now" style="left:${p(m)}" title="jetzt"></span>`; }
  return `<div class="tl zs-tl${dd.fest ? ' fest' : ''}" data-tag="${dd.tag}" data-a="${a}" data-b="${b}">${h}</div>`;
}
function zsLegende(dd) {
  const pj = PJN(), P = [...new Set([...dd.e, ...dd.v].map((x) => x.project_id || 0))];
  return `<div class="leg">${P.map((id) => `<span><i style="border-color:${zsFarbe(id)};background:color-mix(in srgb,${zsFarbe(id)} 17%,var(--card))"></i>${esc(id ? pj[id] || 'Projekt ' + id : 'Büro (ohne Projekt)')}</span>`).join('')}
    ${['puls', 'vorort', 'fahrt', 'unterwegs', 'hand'].map((k) => `<span><i style="border:0;height:4px;width:14px;background:${ZS_Q[k][1]}"></i>${ZS_Q[k][0]} ${ZS_Q[k][2]}</span>`).join('')}
    <span>gestrichelt = Vorschlag, noch nicht übernommen</span><span>schraffiert = Pause</span></div>`;
}
function zsAblage(dd) {   // Kärtchen zum Hineinziehen: eigene Projekte zuerst, dann die des Tages, Büro, Pause, freie Beschriftung
  if (dd && dd.fest) return '';
  const heute = new Set([...(dd ? [...dd.e, ...dd.v] : [])].map((x) => x.project_id).filter(Boolean));
  const akt = window.BPHead && BPHead.projekt && BPHead.projekt.id;
  const L = (G.projekte || []).filter((p) => p.mein || heute.has(p.id) || p.id === akt || ZS_EXTRA.has(p.id));
  return `<div class="zs-ab"><small>In den Strahl ziehen:</small>${L.map((p) => `<span class="zs-c" data-zc="p${p.id}" style="--pf:${zsFarbe(p.id)}" title="${esc(p.name)} – in den Strahl ziehen">${esc(p.name)}</span>`).join('')}
    <span class="zs-c" data-zc="b" style="--pf:${zsFarbe(0)}">Büro</span><span class="zs-c zs-pa" data-zc="pause">☕ Pause</span>
    <span class="zs-c zs-mehr" data-zs-mehr="1" title="Weiteres Projekt in die Ablage holen">＋ Projekt …</span>
    <span class="zs-c zs-frei" data-zc="frei"><b title="Anfassen und in den Strahl ziehen">⠿</b><input placeholder="freie Beschriftung …" aria-label="Freie Beschriftung" maxlength="120"></span></div>`;
}
const ZS_EXTRA = new Set();
function zsTag(d) {   // „Mein Tag“: Strahl, Legende, Ablage
  const dd = zsDaten(d.tag), [a, b] = zsBereich(zsAlleMitAussen(dd));
  return zsStrahl(dd, a, b, false) + zsLegende(dd) + zsAblage(dd);
}
function zsWoche() {
  if (!W) return '';
  const sieben = LS.get('wtage', 5) === 7;
  const T = W.tage.filter((x, i) => sieben || i < 5 || x.bl.e.length || x.bl.v.length);
  const DD = T.map((x) => zsDaten(x.tag)), [a, b] = zsBereich(DD.flatMap(zsAlle));
  const p = (m) => ((m - a) / (b - a) * 100).toFixed(3) + '%';
  let ach = ''; for (let s = a; s <= b; s += 60) ach += `<span class="h" style="left:${p(s)}">${s / 60}</span>`;
  const zeilen = T.map((x, i) => `<div class="zs-wz"><button type="button" data-geh="${x.tag}" title="Tag öffnen">${WT[wtag(x.tag)]} ${dkurz(x.tag)}<small>${x.abw ? esc(G.abw[x.abw] || '') : x.feiertag ? esc(x.feiertag) : x.soll ? 'Soll ' + std(x.soll) : 'frei'}</small></button>
    ${zsStrahl(DD[i], a, b, true)}<span>${x.bestaetigt || x.abw || x.tag === G.heute ? `<b>${std(x.ist)}</b>` : '–'}${x.soll ? ' / ' + std(x.soll) : ''} · ${x.bestaetigt ? '✓' : x.abw ? '' : x.bl.e.length || x.bl.v.length ? (x.tag === G.heute ? 'läuft' : 'offen') : ''}</span></div>`).join('');
  return `<div class="card profi"><div class="zs-wkopf"><h3>Woche ab ${dkurz(W.tage[0].tag)}</h3><span class="seg"><button type="button" data-wt="5" class="${sieben ? '' : 'on'}">Mo–Fr</button><button type="button" data-wt="7" class="${sieben ? 'on' : ''}">Mo–So</button></span></div>
    <div style="overflow-x:auto"><div class="zs-w"><div class="zs-wz"><span></span><div class="zs-wk">${ach}</div><span></span></div>${zeilen}</div></div>
    ${zsAblage(null)}</div>`;
}

/* ---------------- Speichern mit Rückgängig ---------------- */
async function zsNeu(t0, d) {
  if (d && D && D.tag === t0) D = d;
  try { W = await api('api/woche?d=' + tag); } catch { /* bleibt */ }
  zeichne();
}
async function zsAntwort(t0, r, text) {
  if (r && r.vorher) { const vorher = r.vorher; rueckgaengig(text, async () => { const d = await api('api/tag/stand', 'POST', { d: t0, stand: vorher }); await zsNeu(t0, d); }); }
  await zsNeu(t0, r);
}
async function zsAufruf(t0, url, methode, body, text) {
  try { const r = await api(url, methode, body); await zsAntwort(t0, r, text); return r; } catch (er) { toast(er.message, true); zeichne(); return null; }
}
const zsPausen = (dd) => dd.p.map((x) => [...x]);
function zsSetzen(t0, k, von, bis) {
  const dd = zsDaten(t0), i = +k.slice(1), V = m2h(von), B = m2h(bis);
  if (k[0] === 'e') return zsAufruf(t0, 'api/eintrag/' + i, 'PUT', { von: V, bis: B }, 'Zeit verschoben');
  if (k[0] === 'v') { const v = dd.v[i]; return zsAufruf(t0, 'api/eintrag', 'POST', { d: t0, project_id: v.project_id || '', art: v.art, quelle: v.quelle, von: V, bis: B, ignor: [v.von, v.bis] }, 'Vorschlag verschoben und übernommen'); }
  const P = zsPausen(dd); P[i] = [V, B]; return zsAufruf(t0, 'api/tag', 'PUT', { d: t0, pausen: P }, 'Pause verschoben');
}
function zsFrei(dd, m, laenge) {   // freier Bereich ab Minute m (auf den Takt), höchstens „laenge“ lang
  const t = zsTakt(), L = zsAlle(dd).map((x) => [h2m(x.von), h2m(x.bis)]);
  let von = Math.floor(m / t) * t;
  const drin = L.find(([a, b]) => a <= von && von < b); if (drin) von = drin[1];
  const hi = Math.min(24 * 60, ...L.filter(([a]) => a > von).map(([a]) => a));
  const bis = Math.min(hi, von + laenge);
  return bis - von >= t ? [von, bis] : null;
}
function zsMinute(tl, x) { const r = tl.getBoundingClientRect(), a = +tl.dataset.a, b = +tl.dataset.b; return a + Math.max(0, Math.min(1, (x - r.left) / r.width)) * (b - a); }

/* ---------------- Menü an einer Stelle (Baukasten pickMenu) ---------------- */
function zsMenue(x, y, items, onPick) {
  let an = document.querySelector('.zs-anker'); if (!an) { an = document.createElement('span'); an.className = 'zs-anker'; document.body.appendChild(an); }
  an.style.left = x + 'px'; an.style.top = y + 'px';
  pickMenu(an, { items, onPick });
}
function zsLeerKlick(tl, e) {
  const t0 = tl.dataset.tag, dd = zsDaten(t0); if (!dd || dd.fest) return;
  const m = zsMinute(tl, e.clientX), f = zsFrei(dd, m, 60); if (!f) { toast('Hier ist kein Platz frei.', true); return; }
  const L = zsAlle(dd).map((x) => [h2m(x.von), h2m(x.bis)]), erst = Math.min(...L.map((x) => x[0])), letzt = Math.max(...L.map((x) => x[1]));
  const t = zsTakt(), mr = Math.round(m / t) * t, pd = (G.pause_dauer || 30);
  const items = [{ value: 'neu', title: '＋ Zeit eintragen …', sub: `${m2h(f[0])}–${m2h(f[1])}` }, { value: 'pause', title: '☕ Pause hier', sub: `${m2h(f[0])}–${m2h(Math.min(f[1], f[0] + pd))}` }];
  if (L.length && mr < erst) items.push({ value: 'kommen', title: `Kommen auf ${m2h(mr)}` });
  if (L.length && mr > letzt) items.push({ value: 'gehen', title: `Gehen auf ${m2h(mr)}` });
  zsMenue(e.clientX, e.clientY, items, (v) => {
    if (v === 'neu') { NEU = { von: m2h(f[0]), bis: m2h(f[1]), project_id: (window.BPHead && BPHead.projekt && BPHead.projekt.id) || '', art: 'buero' };
      if (tag !== t0 || tab !== 'tag') { tag = t0; tab = 'tag'; LS.set('tab', tab); laden(); return; }
      zeichne(); const s = document.querySelector('.zr[data-n] [data-zf="project_id"]'); if (s) s.focus(); return; }
    if (v === 'pause') { const P = zsPausen(dd); P.push([m2h(f[0]), m2h(Math.min(f[1], f[0] + pd))]); zsAufruf(t0, 'api/tag', 'PUT', { d: t0, pausen: P }, 'Pause eingetragen'); return; }
    zsAufruf(t0, 'api/tag', 'PUT', { d: t0, [v]: m2h(mr) }, v === 'kommen' ? 'Kommen gesetzt' : 'Gehen gesetzt');
  });
}
function zsPauseKlick(blk, e) {
  const tl = blk.closest('.zs-tl'), t0 = tl.dataset.tag, dd = zsDaten(t0), i = +blk.dataset.spr.slice(1); if (!dd || dd.fest) return;
  const [von] = dd.p[i];
  const items = [{ value: 'weg', title: 'Pause entfernen' }, ...[15, 30, 45, 60].map((n) => ({ value: n, title: `${n} Minuten`, sub: `${von}–${m2h(h2m(von) + n)}` }))];
  if (dd.pf) items.push({ value: 'vorgabe', title: 'Wie in den Einstellungen', sub: 'die eigene Pause des Tages verwerfen' });
  zsMenue(e.clientX, e.clientY, items, (v) => {
    if (v === 'vorgabe') return zsAufruf(t0, 'api/tag', 'PUT', { d: t0, pausen: null }, 'Pause wie in den Einstellungen');
    const P = zsPausen(dd); if (v === 'weg') P.splice(i, 1); else P[i] = [von, m2h(h2m(von) + v)];
    zsAufruf(t0, 'api/tag', 'PUT', { d: t0, pausen: P }, v === 'weg' ? 'Pause entfernt' : 'Pause geändert');
  });
}

/* ---------------- Ziehen: Blöcke im Strahl und Kärtchen aus der Ablage ---------------- */
function zsZug(e, h) {   // Zeiger verfolgen, bis er losgelassen wird
  const mv = (ev) => { ev.preventDefault(); h.move(ev); };
  const fertig = (ev, ok) => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', ab); h.ende(ev, ok); };
  const up = (ev) => fertig(ev, true), ab = (ev) => fertig(ev, false);
  addEventListener('pointermove', mv, { passive: false }); addEventListener('pointerup', up); addEventListener('pointercancel', ab);
}
function zsBlockZiehen(blk, e) {
  const tl = blk.closest('.zs-tl'); if (tl.classList.contains('fest')) return;
  const a = +tl.dataset.a, b = +tl.dataset.b, t = zsTakt(), dd = zsDaten(tl.dataset.tag), k = blk.dataset.spr;
  const x = zsAlle(dd).find((y) => y.k === k); if (!x) return;
  const r = blk.getBoundingClientRect(), W0 = tl.getBoundingClientRect().width, v0 = h2m(x.von), z0 = h2m(x.bis);
  const art = r.width < 26 ? 'm' : e.clientX - r.left < 8 ? 'l' : r.right - e.clientX < 8 ? 'r' : 'm';
  let v = v0, z = z0, bewegt = false, lab = null, ziel = null, vor = null;   // ziel: anderer Tag (Woche), auf den der Block gezogen wird
  const p = (m) => ((m - a) / (b - a) * 100).toFixed(3) + '%';
  const tagZiel = (ev) => {   // nur ganze Blöcke (Zeiten, Vorschläge), nicht Pausen und nicht beim Ziehen am Rand
    if (art !== 'm' || k[0] === 'p') return null;
    const el = document.elementFromPoint(ev.clientX, ev.clientY), z2 = el && el.closest('.zs-tl:not(.fest)');
    return z2 && z2 !== tl && z2.dataset.tag ? z2 : null;
  };
  zsZug(e, {
    move(ev) {
      const dm = Math.round((ev.clientX - e.clientX) * (b - a) / W0 / t) * t;
      if (!bewegt && Math.abs(ev.clientX - e.clientX) < 4 && Math.abs(ev.clientY - e.clientY) < 6) return;
      if (!bewegt) { bewegt = true; blk.classList.add('zieh'); lab = document.createElement('span'); lab.className = 'zs-lab'; tl.appendChild(lab); }
      if (art === 'm') { const d = Math.max(-v0, Math.min(24 * 60 - z0, dm)); v = v0 + d; z = z0 + d; }
      else if (art === 'l') v = Math.min(z0 - t, Math.max(0, Math.round((v0 + dm) / t) * t));
      else z = Math.max(v0 + t, Math.min(24 * 60, Math.round((z0 + dm) / t) * t));
      blk.style.left = p(v); blk.style.width = `calc(${((z - v) / (b - a) * 100).toFixed(3)}% - 2px)`;
      lab.style.left = p((v + z) / 2); lab.textContent = `${m2h(v)}–${m2h(z)}`;
      const zt = tagZiel(ev);
      if (zt !== ziel) { if (vor) vor.remove(); vor = null; ziel = zt; }
      if (ziel) { if (!vor) { vor = document.createElement('div'); vor.className = 'zs-vor'; ziel.appendChild(vor); }
        const a2 = +ziel.dataset.a, b2 = +ziel.dataset.b; vor.style.left = ((v - a2) / (b2 - a2) * 100) + '%'; vor.style.width = ((z - v) / (b2 - a2) * 100) + '%'; vor.title = `${m2h(v)}–${m2h(z)}`; }
      blk.style.opacity = ziel ? '.45' : '';
    },
    async ende(ev, ok) {
      if (!bewegt) return;
      ZS_ZUG = Date.now(); if (lab) lab.remove(); if (vor) vor.remove(); blk.classList.remove('zieh'); blk.style.opacity = '';
      if (ok && ziel) { zsAufTag(tl.dataset.tag, ziel.dataset.tag, k, x, v, z); return; }
      if (!ok || (v === v0 && z === z0)) { zeichne(); return; }
      zsSetzen(tl.dataset.tag, k, v, z);
    },
  });
}
/* Block auf einen anderen Tag gezogen (Woche): kurz fragen, dann verschieben – mit Rückgängig */
async function zsAufTag(t0, t1, k, x, v, z) {
  const V = m2h(v), B = m2h(z), wt = (t) => new Date(t + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const was = x.notiz && !x.project_id ? x.notiz : PJN()[x.project_id] || (x.project_id ? 'Projekt ' + x.project_id : 'Büro');
  if (!(await bpFrage(`„${was}“ ${x.von}–${x.bis} vom ${wt(t0)} auf ${wt(t1)} ${V}–${B} verschieben?`, { ok: 'Verschieben' }))) { zeichne(); return; }
  const neu = async (r) => { if (D && (D.tag === t0 || D.tag === t1)) { try { D = await api('api/tag?d=' + D.tag); } catch { /* bleibt */ } } await zsNeu(t1, null); return r; };
  try {
    if (k[0] === 'e') {
      const r = await api('api/eintrag/' + k.slice(1), 'PUT', { tag: t1, von: V, bis: B }); await neu(r);
      const id = k.slice(1), alt = r.alt;
      rueckgaengig(`Auf ${wt(t1)} verschoben`, async () => { await api('api/eintrag/' + id, 'PUT', { tag: alt.tag, von: alt.von, bis: alt.bis }); await neu(); });
    } else {   // Vorschlag: am Zieltag als Zeit eintragen, am alten Tag nicht mehr vorschlagen
      const r = await api('api/eintrag', 'POST', { d: t1, project_id: x.project_id || '', art: x.art, quelle: x.quelle || 'hand', von: V, bis: B });
      await api('api/verwerfen', 'POST', { d: t0, von: x.von, bis: x.bis }); await neu(r);
      const rv = r.vorher;
      rueckgaengig(`Vorschlag auf ${wt(t1)} übernommen`, async () => { if (rv) await api('api/tag/stand', 'POST', { d: t1, stand: rv }); await api('api/verwerfen', 'POST', { d: t0, von: x.von, bis: x.bis, zurueck: true }); await neu(); });
    }
  } catch (er) { toast(er.message, true); zeichne(); }
}
function zsKarteZiehen(c, e) {
  const art = c.dataset.zc, text = art === 'frei' ? (c.querySelector('input').value || '').trim() : '';
  if (art === 'frei' && !text) { toast('Erst eine Beschriftung eingeben, dann am ⠿ in den Strahl ziehen.', true); c.querySelector('input').focus(); return; }
  const g = c.cloneNode(true); g.classList.add('zs-geist'); if (art === 'frei') g.innerHTML = '✎ ' + esc(text); document.body.appendChild(g);
  let ziel = null, vor = null, f = null;
  const weg = () => { if (vor) vor.remove(); vor = null; };
  zsZug(e, {
    move(ev) {
      g.style.left = ev.clientX + 'px'; g.style.top = ev.clientY + 'px';
      const el = document.elementFromPoint(ev.clientX, ev.clientY), tl = el && el.closest('.zs-tl:not(.fest)');
      if (tl !== ziel) { weg(); ziel = tl; }
      if (!tl) { f = null; return; }
      const dd = zsDaten(tl.dataset.tag); f = dd && zsFrei(dd, zsMinute(tl, ev.clientX), art === 'pause' ? (G.pause_dauer || 30) : 60);
      if (!f) { weg(); return; }
      const a = +tl.dataset.a, b = +tl.dataset.b;
      if (!vor) { vor = document.createElement('div'); vor.className = 'zs-vor'; tl.appendChild(vor); }
      vor.style.left = ((f[0] - a) / (b - a) * 100) + '%'; vor.style.width = ((f[1] - f[0]) / (b - a) * 100) + '%'; vor.title = `${m2h(f[0])}–${m2h(f[1])}`;
    },
    ende(ev, ok) {
      g.remove(); weg(); ZS_ZUG = Date.now();
      if (!ok || !ziel || !f) return;
      const t0 = ziel.dataset.tag, dd = zsDaten(t0), V = m2h(f[0]), B = m2h(f[1]);
      if (art === 'pause') { const P = zsPausen(dd); P.push([V, B]); zsAufruf(t0, 'api/tag', 'PUT', { d: t0, pausen: P }, 'Pause eingetragen'); return; }
      const pid = art[0] === 'p' ? +art.slice(1) : '', gleich = [...dd.e, ...dd.v].find((x) => pid && x.project_id === pid);
      zsAufruf(t0, 'api/eintrag', 'POST', { d: t0, von: V, bis: B, project_id: pid, art: gleich ? gleich.art : pid ? 'sonst' : art === 'frei' ? 'sonst' : 'buero', notiz: text, quelle: 'hand' }, 'Zeit eingetragen');
      if (art === 'frei') { const i = document.querySelector('[data-zc="frei"] input'); if (i) i.value = ''; }
    },
  });
}
document.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || !G) return;
  const c = e.target.closest('[data-zc]');
  if (c && !e.target.closest('input')) { e.preventDefault(); zsKarteZiehen(c, e); return; }
  const blk = e.target.closest('.zs-tl .b'); if (blk) zsBlockZiehen(blk, e);
});
document.addEventListener('mousemove', (e) => {   // Mauszeiger: an den Rändern Breite ändern, sonst verschieben
  const blk = e.target.closest && e.target.closest('.zs-tl:not(.fest) .b'); if (!blk) return;
  const r = blk.getBoundingClientRect(); blk.style.cursor = r.width >= 26 && (e.clientX - r.left < 8 || r.right - e.clientX < 8) ? 'ew-resize' : 'grab';
});
document.addEventListener('click', (e) => {
  if (!G) return;
  const wt = e.target.closest('[data-wt]'); if (wt) { LS.set('wtage', +wt.dataset.wt); zeichne(); return; }
  const mehr = e.target.closest('[data-zs-mehr]');
  if (mehr) { const drin = new Set([...document.querySelectorAll('[data-zc^="p"]')].map((x) => x.dataset.zc));
    const P = (G.projekte || []).filter((p) => !drin.has('p' + p.id)), mein = P.some((p) => p.mein);
    pickMenu(mehr, { search: 'Projekt suchen …', items: P.map((p) => ({ value: p.id, title: p.name, group: mein || P.length ? (p.mein ? 'Meine Projekte' : 'Andere Projekte') : '' })),
      onPick: (v) => { ZS_EXTRA.add(+v); zeichne(); } }); return; }
  if (Date.now() - ZS_ZUG < 350) return;
  const pb = e.target.closest('.zs-tl .b.zp'); if (pb) { zsPauseKlick(pb, e); return; }
  const tl = e.target.closest('.zs-tl'); if (tl && !e.target.closest('.b') && !tl.classList.contains('fest')) zsLeerKlick(tl, e);
});
