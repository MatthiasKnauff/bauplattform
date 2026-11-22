'use strict';
/* Räume als Baum (GO 22.11.2026, Mock „Umsortieren und Räume gruppieren“ US-4 A): derselbe Aufbau wie die Bauteile – Leiste „Gruppieren:“
   (bp/gruppen.js), Gruppen anfangs zu (gemerkt, was offen ist), Haken an der Gruppe wählt alle darin, Klick wählt (Strg = dazu), Doppelklick
   bzw. Kontextmenü = Eigenschaften (bp/eigenschaften.js: Allgemein · Raumbuch · Maße). Nichts springt: ein Klick springt nicht mehr in die
   Bauteile, neu gezeichnet wird nur die Liste, die Rollposition bleibt.
   Gemeinsame Namen mit gebaeudemodell*.js: PID, LS, gmFeld, gmErg, GM_HER, gmZeileVon, GM_WORT, gmZahl, GMH. */
const GMR_GRUPPEN = { geschoss: 'Geschoss', nutzung: 'Nutzung', boden: 'Boden', wand: 'Wände', decke: 'Decke', teil: 'Gebäudeteil', herkunft: 'Herkunft' };
const GMR = { sel: new Set(), grp: null, auf: null, ids: {}, liste: [] };
const gmrLies = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
const gmrMerk = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* nur Bequemlichkeit */ } };

/* Ein Raum der Liste: aus dem Plan (r) oder ergänzt (p, k = Nummer in GMH.raeume) – mit den Werten für die Gruppen */
function gmrEintraege(L) {
  const teil = (r, t) => { const z = gmZeileVon(L, r.nr, (x) => x.id.startsWith(`raum:${t}:`)); return z ? (z.kurz || GM_WORT[z.status] || '') : ''; };
  const zid = (r) => { const z = gmZeileVon(L, r.nr, (x) => x.id.startsWith('raum:boden:')); return z ? z.id : ''; };
  const ein = (r, p, k) => { const x = r || p;
    return { r, p, k, key: r ? `r:${r.nr}` : `p:${k}`, nr: x.nr || '', name: x.name || '', zid: zid(x), flaeche: x.flaeche || 0, hoehe: x.hoehe || 0, umfang: x.umfang || 0,
      w: { geschoss: x.geschoss || 'ohne Geschoss', nutzung: x.nutzung || 'Raum', boden: teil(x, 'boden') || 'offen', wand: teil(x, 'wand') || 'offen', decke: teil(x, 'decke') || 'offen',
        teil: x.teil || 'ohne Gebäudeteil', herkunft: p ? 'ergänzt' : r.ermittelt ? 'aus den Wänden ermittelt' : 'aus dem Plan' } }; };
  return [...(L.raeume || []).filter((r) => !r.ergaenzt).map((r) => ein(r, null)), ...(GMH.raeume || []).map((p, k) => ein(null, p, k))];
}

function gmRaumBaum(C, L) {
  if (!GMR.grp) GMR.grp = gmrLies('bp.gm.rgrp', ['geschoss']).filter((k) => k in GMR_GRUPPEN);
  if (!GMR.auf) GMR.auf = new Set(gmrLies('bp.gm.rauf', []));
  const E = GMR.liste = gmrEintraege(L);
  if (!E.length) { C.innerHTML = '<div class="gm-hin"><span>Noch keine Räume im Modell – ein Planstand (IFC, DXF oder PDF mit Raumstempeln) bringt sie mit. Oder oben „＋ Raum“.</span></div>'; return; }
  const PR = GMH.raeume || [], nPlan = E.length - PR.length;
  const aus = {}; for (const k of Object.keys(GMR_GRUPPEN)) if (new Set(E.map((x) => x.w[k])).size < 2) aus[k] = 'unterscheidet hier nichts';
  const G = GMR.grp.length ? GMR.grp : ['geschoss'];
  let body = ''; GMR.ids = {};
  const zeile = (x, t) => {
    const s = GMR.sel.has(x.key), r = x.r, hk = `<input type="checkbox" class="bt-mwh" data-gmrw="${esc(x.key)}"${s ? ' checked' : ''} aria-label="Raum ${esc(x.nr)} wählen">`;
    const zellen = ['boden', 'wand', 'decke'].map((k) => `<td class="kz" title="${esc(x.w[k])}">${esc(x.w[k] === 'offen' ? '' : x.w[k])}</td>`).join('');
    if (x.p) return `<tr class="gm-plus${s ? ' akt' : ''}" data-gmk="${x.k}" data-gmrr="${esc(x.key)}" data-gmz="${esc(x.zid)}">${bpBaum.zelle({ tiefe: t, html: hk + gmFeld(x.k, 'nr', x.p.nr, 5) + ' ' + gmFeld(x.k, 'name', x.p.name, 14) })}<td class="r">${gmFeld(x.k, 'flaeche', x.p.flaeche, 6, 1)} m²</td><td class="r">${gmFeld(x.k, 'hoehe', x.p.hoehe, 5, 1)}</td>${zellen}${gmErg(x.k)}</tr>`;
    const nm = r.ermittelt ? `<input class="gm-rn" data-gmrn="${esc(r.nr)}" value="${esc(r.name)}" aria-label="Name des Raums ${esc(r.nr)}"> <small class="mute" title="Das IFC enthielt keine Räume – aus den Wänden ermittelt.">ermittelt</small>` : esc(r.name);
    return `<tr class="${s ? 'akt' : ''}" data-gmrr="${esc(x.key)}" data-gmz="${esc(x.zid)}">${bpBaum.zelle({ tiefe: t, html: `${hk}<span class="gmr-nr">${esc(r.nr)}</span> ${nm}` })}<td class="r">${gmZahl(r.flaeche)} m²</td><td class="r">${gmZahl(r.hoehe)}</td>${zellen}${GM_HER}</tr>`;
  };
  const ebene = (X, i, pfad) => {
    if (i >= G.length) { body += X.map((x) => zeile(x, i)).join(''); return; }
    const M = new Map(); X.forEach((x) => { const w = x.w[G[i]]; (M.get(w) || M.set(w, []).get(w)).push(x); });
    [...M.entries()].sort((a, b) => (G[i] === 'geschoss' ? 0 : a[0].localeCompare(b[0], 'de', { numeric: true }))).forEach(([w, XX]) => {   // Geschosse in der Reihenfolge des Plans
      const k = `${pfad}/${w}`, auf = GMR.auf.has(k), n = XX.filter((x) => GMR.sel.has(x.key)).length; GMR.ids[k] = XX.map((x) => x.key);
      const hk = `<input type="checkbox" class="bt-mwh" data-gmrg="${esc(k)}"${n && n === XX.length ? ' checked' : ''}${n && n < XX.length ? ' data-teil' : ''} title="Alle ${XX.length} dieser Gruppe wählen" aria-label="${esc(w)}: alle wählen">`;
      body += `<tr class="gh" data-gmrgk="${esc(k)}">${bpBaum.zelle({ tiefe: i, auf, klapp: k, html: `${hk}<b>${esc(w)}</b> <small class="mute">${XX.length} ${XX.length === 1 ? 'Raum' : 'Räume'} · ${gmZahl(XX.reduce((a, x) => a + (x.flaeche || 0), 0))} m²</small>` })}<td class="r">${gmZahl(XX.reduce((a, x) => a + (x.flaeche || 0), 0))} m²</td><td colspan="5"></td></tr>`;
      if (auf) ebene(XX, i + 1, k);
    });
  };
  ebene(E, 0, G.join('>'));
  const kopf = `${PR.length ? `<div class="gm-hin"><span>${nPlan} Räume aus dem Plan · <b>${PR.length} ergänzt</b> (gelb, änderbar) – der nächste Planstand gleicht ab.</span></div>` : ''}<div class="bt-grp gmr-grp">${bpGruppen.html(G, GMR_GRUPPEN, { rechts: 'Doppelklick: Eigenschaften · Strg + Klick: mehrere' })}</div>`;
  const tab = `<table class="gm-l bp-baum gmr-l"><colgroup><col class="gmr-c1"><col class="gmr-c2"><col class="gmr-c3"><col><col><col><col class="gmr-c7"></colgroup><thead><tr><th>Raum</th><th class="r">Fläche</th><th class="r">Höhe</th><th>Boden</th><th>Wände</th><th>Decke</th><th>Herkunft</th></tr></thead><tbody>${body}</tbody></table>`;
  // nichts springt: der Platz bleibt stehen, neu gezeichnet werden nur Kopf und Tabelle darin (die Rollposition des Bereichs bleibt)
  if (!C.querySelector(':scope > .gmr-sc')) C.innerHTML = '<div class="gmr-kopf"></div><div class="gmr-sc"></div>';
  C.querySelectorAll(':scope > .gm-ansehen').forEach((x) => x.remove());   // der Hinweis „nur zum Ansehen“ kommt nach dem Zeichnen neu (gmNurAnsehen)
  C.querySelector('.gmr-kopf').innerHTML = kopf; C.querySelector('.gmr-sc').innerHTML = tab;
  C.querySelectorAll('[data-gmrg][data-teil]').forEach((x) => { x.indeterminate = true; });
  bpGruppen.an(C.querySelector('.gmr-grp'), { lies: () => GMR.grp, namen: GMR_GRUPPEN, aus: () => aus, setze: (G2) => { GMR.grp = G2.length ? G2 : ['geschoss']; gmrMerk('bp.gm.rgrp', GMR.grp); gmRaumBaum(C, L); } });
  if (window.bpSpaltBreite) bpSpaltBreite.an(C.querySelector('table.gmr-l'), 'gm.raeume');
  if (!C._gmr) gmrAn(C);
  C._gmrL = L; GMR.C = C;
  gmrKisten();
}

/* Räume als Kisten im 3D (GO 22.11.2026, R-B): nur solange der Reiter „Räume“ zu sehen ist; Farbe nach der ersten Gruppierung, gewählt =
   violett, Gruppe der ersten Ebene zu (während andere offen sind) = blass. Umrisse aus dem Grundriss (bpcore/grundriss.py – derselbe Abruf wie
   die Ansicht „Grundriss“, gemerkt in GR), Geschoss über den Namen wie im Netz. Klick/Rahmen/Doppelklick im 3D wählen die Zeilen hier. */
const GMR_NUTZ = [[/wohn|ess|schlaf|kind|zimmer|arbeit|büro/i, '#4f9d5b'], [/bad|wc|dusch|sanit/i, '#3d7fc4'], [/küche|koch/i, '#d6a72a'], [/flur|diele|gang|treppe|vorraum|eingang/i, '#8d949b'],
  [/technik|heiz|haus.?anschl|hwr|wasch|abstell|lager|keller/i, '#e07b2e'], [/garage|carport/i, '#7a6a5a']];
const GMR_PAL = ['#3d7fc4', '#4f9d5b', '#e07b2e', '#a35fc4', '#c94f4f', '#2fa3a3', '#b58a2a', '#6a7bd0', '#8d949b'];
let GMR_K = 0;
async function gmrKisten() {
  const D = G3 && G3.D3; if (!D || !D.kisten) return;
  const sicht = G3.raE && G3.raE.isConnected && G3.raE.offsetParent !== null && GMR.C && GMR.C.isConnected;
  if (!sicht) return D.kisten(null);
  const n = ++GMR_K, st = BT ? BT.zustand() : {}, an = st.an ? st.an.id : null, rev = `${st.rev}|${an}`;
  if (!GR.F || GR.rev !== rev) { try { GR.F = await api(`api/bp/modell/${PID}/grundriss${an ? `?planstand=${an}` : ''}`); GR.rev = rev; GR.N = G3.N || GR.N; } catch { return D.kisten(null); } }
  if (n !== GMR_K || !G3.D3) return;   // inzwischen neuer Aufruf
  const F = GR.F, NG = ((G3.N || GR.N || {}).geschosse) || [], E = GMR.liste, G = GMR.grp && GMR.grp.length ? GMR.grp : ['geschoss'], g0 = G[0];
  const innen = (x, y, P) => { let d = false; for (let k = 0, j = P.length - 1; k < P.length; j = k++) { const [xi, yi] = P[k], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
  const werte = [...new Set(E.map((x) => x.w[g0]))], farbe = (w) => { if (g0 === 'nutzung') { const t = GMR_NUTZ.find(([re]) => re.test(w)); if (t) return t[1]; } return GMR_PAL[werte.indexOf(w) % GMR_PAL.length]; };
  const offen = [...GMR.auf].some((k) => k.startsWith(`${G.join('>')}/`) && !k.slice(G.join('>').length + 1).includes('/'));
  const K = [];
  (F.flaechen || []).forEach((f) => {
    const gn = ((F.geschosse || [])[f.g] || {}).n || '', [cx, cy] = f.mitte || f.umriss[0];
    const x = E.find((y) => { const u = (y.r || y.p || {}).umriss; return u && u.length > 2 && innen(cx, cy, u); })
      || (f.raum && E.find((y) => (f.raum.nr && y.nr === f.raum.nr) || (f.raum.name && y.name === f.raum.name && (!y.w.geschoss || y.w.geschoss === gn || y.w.geschoss === 'ohne Geschoss'))));
    if (!x) return;   // Fläche ohne Raum: keine Kiste
    const g = Math.max(0, NG.findIndex((y) => y.n === gn)), w = x.w[g0];
    K.push({ key: x.key, g, umriss: f.umriss, z: f.z != null ? f.z : ((F.geschosse || [])[f.g] || {}).z || 0, h: f.hoehe || x.hoehe || 2.5, farbe: farbe(w),
      blass: offen && !GMR.auf.has(`${G.join('>')}/${w}`), an: GMR.sel.has(x.key), text: `${x.nr} ${x.name} · ${gmZahl(x.flaeche)} m²`.trim() });
  });
  D.kisten(K, { legende: werte.map((w) => [farbe(w), w]),
    wahl: (key, dazu) => { if (!key) { if (!dazu) GMR.sel.clear(); } else if (dazu) { GMR.sel.has(key) ? GMR.sel.delete(key) : GMR.sel.add(key); } else GMR.sel = new Set([key]); gmrZeigen(key); },
    rahmen: (keys, ab) => { keys.forEach((k) => (ab ? GMR.sel.delete(k) : GMR.sel.add(k))); gmrZeigen(keys[0]); },
    doppel: (key) => { GMR.sel = new Set([key]); gmrZeigen(key); if (GMR.C) gmrEigen(GMR.C, key); } });
}
function gmrZeigen(key) {   // aus dem 3D gewählt: Gruppen dieses Raums auf, Liste neu; nur wenn die Zeile nicht zu sehen ist, so wenig wie nötig rollen
  const C = GMR.C; if (!C) return;
  const x = key && GMR.liste.find((y) => y.key === key), G = GMR.grp && GMR.grp.length ? GMR.grp : ['geschoss'];
  if (x) { let k = G.join('>'); G.forEach((g) => { k += `/${x.w[g]}`; GMR.auf.add(k); }); gmrMerk('bp.gm.rauf', [...GMR.auf]); }
  gmRaumBaum(C, C._gmrL);
  const tr = x && C.querySelector(`tr[data-gmrr="${CSS.escape(key)}"]`); if (tr) tr.scrollIntoView({ block: 'nearest' });
}

function gmrAn(C) {   // Klicks, Doppelklick, Kontextmenü – einmal je Platz
  C._gmr = true;
  const neu = () => gmRaumBaum(C, C._gmrL);
  C.addEventListener('click', (e) => {
    const t = e.target;
    const kl = t.closest('[data-zu]'); if (kl) { const k = kl.closest('tr').dataset.gmrgk; if (k) { GMR.auf.has(k) ? GMR.auf.delete(k) : GMR.auf.add(k); gmrMerk('bp.gm.rauf', [...GMR.auf]); neu(); } return; }
    const g = t.closest('[data-gmrg]'); if (g) { const I = GMR.ids[g.dataset.gmrg] || [], alle = I.every((k) => GMR.sel.has(k)); I.forEach((k) => (alle ? GMR.sel.delete(k) : GMR.sel.add(k))); return neu(); }
    const w = t.closest('[data-gmrw]'); if (w) { GMR.sel.has(w.dataset.gmrw) ? GMR.sel.delete(w.dataset.gmrw) : GMR.sel.add(w.dataset.gmrw); return neu(); }
    if (t.closest('input,button,select')) return;
    const r = t.closest('tr[data-gmrr]'); if (!r) return;
    e.stopPropagation();   // die Räume gehören dieser Liste – kein Sprung in die Bauteile (Klick auf tr[data-gmz] in gebaeudemodell-listen.js)
    if (e.detail === 2) { e.preventDefault(); return gmrEigen(C, r.dataset.gmrr); }   // Doppelklick = Eigenschaften (zweiter Klick, vor dem Neuzeichnen)
    if (e.ctrlKey || e.metaKey) { GMR.sel.has(r.dataset.gmrr) ? GMR.sel.delete(r.dataset.gmrr) : GMR.sel.add(r.dataset.gmrr); } else { GMR.sel = new Set([r.dataset.gmrr]); }
    neu();
  });
  document.addEventListener('bph:kontext', (e) => {
    const r = e.detail.ziel && e.detail.ziel.closest && e.detail.ziel.closest('tr[data-gmrr], tr[data-gmrgk]'); if (!r || !C.contains(r)) return;
    if (r.dataset.gmrgk) { const I = GMR.ids[r.dataset.gmrgk] || []; e.detail.punkte.push({ titel: 'Gruppe' }, { text: 'Alle der Gruppe wählen', fn: () => { I.forEach((k) => GMR.sel.add(k)); neu(); } }); return; }
    if (!GMR.sel.has(r.dataset.gmrr)) { GMR.sel = new Set([r.dataset.gmrr]); neu(); }
    e.detail.punkte.push({ titel: GMR.sel.size > 1 ? `${GMR.sel.size} Räume` : 'Raum' }, { text: 'Eigenschaften …', k: 'Doppelklick', fn: () => gmrEigen(C, r.dataset.gmrr) });
  });
}

/* Eigenschaften Raum (bp/eigenschaften.js): Allgemein · Raumbuch (bp/raumbuch.js, für alle gewählten) · Maße – feste Größe, ↑ ↓ blättert */
async function gmrEigen(C, key) {
  if (!GMR.sel.has(key)) { GMR.sel = new Set([key]); gmRaumBaum(C, C._gmrL); }
  const X = () => GMR.liste.filter((x) => GMR.sel.has(x.key)), x0 = GMR.liste.find((x) => x.key === key); if (!x0) return;
  const reiter = [['allg', 'Allgemein'], ['rb', 'Raumbuch'], ['mass', 'Maße']];
  const titel = () => { const S = X(); return S.length > 1 ? `Eigenschaften · ${S.length} Räume` : `Eigenschaften · ${x0.nr} ${x0.name}`; };
  const allg = (x) => `<table class="gm-l gmr-eig"><tbody>${[['Nr.', x.nr], ['Name', x.name], ['Geschoss', x.w.geschoss], ['Nutzung', x.w.nutzung], ['Gebäudeteil', x.w.teil], ['Herkunft', x.w.herkunft],
    ['Boden', x.w.boden], ['Wände', x.w.wand], ['Decke', x.w.decke]].map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table>
    ${x.r && x.r.ermittelt ? '<p class="mute">Aus den Wänden ermittelt – den Namen in der Liste vergeben.</p>' : x.p ? '<p class="mute">Ergänzt neben dem Plan – Felder in der Liste ändern.</p>' : ''}`;
  const mass = (S) => `<table class="gm-l gmr-eig"><thead><tr><th>Raum</th><th class="r">Fläche</th><th class="r">Umfang</th><th class="r">Höhe</th><th class="r">Volumen</th></tr></thead><tbody>${S.map((x) => `<tr><td>${esc(x.nr)} ${esc(x.name)}</td><td class="r">${gmZahl(x.flaeche)} m²</td><td class="r">${x.umfang ? gmZahl(x.umfang) + ' m' : '–'}</td><td class="r">${x.hoehe ? gmZahl(x.hoehe) + ' m' : '–'}</td><td class="r">${x.hoehe ? gmZahl(x.flaeche * x.hoehe) + ' m³' : '–'}</td></tr>`).join('')}
    ${S.length > 1 ? `<tr><th>Summe</th><td class="r"><b>${gmZahl(S.reduce((a, x) => a + x.flaeche, 0))} m²</b></td><td></td><td></td><td class="r">${gmZahl(S.reduce((a, x) => a + x.flaeche * (x.hoehe || 0), 0))} m³</td></tr>` : ''}</tbody></table>`;
  let an = 'allg';
  const fuellen = async (f) => {
    const S = X(); f.body.innerHTML = an === 'allg' ? (S.length > 1 ? `<p class="mute">${S.length} Räume gewählt – Raumbuch und Maße gelten für alle.</p>` + mass(S) : allg(x0)) : an === 'mass' ? mass(S) : '<div class="gmr-rb">Lade …</div>';
    if (an === 'rb') {
      const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''];
      if (!window.bpRaumbuch) await new Promise((ok) => { const sc = document.createElement('script'); sc.src = b + 'raumbuch.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });
      const m = await api(`api/bp/modell/${PID}`), host = f.body.querySelector('.gmr-rb');
      if (window.bpRaumbuch && host) bpRaumbuch.mount(host, { basis: `api/bp/modell/${PID}`, rev: m.rev, sel: S.map((x) => x.nr), neu: () => gmListe('raeume') });
    }
  };
  const f = bpEigen({ key: 'gm.raum', titel: titel(), reiter, an, blaettern: true, reiterWechsel: (id) => { an = id; fuellen(f); },
    aktion: (m, _f, zu) => { if (m === 'x') return zu();   // ↑ ↓: der vorige/nächste Raum der Liste
      const L2 = GMR.liste, i = L2.findIndex((x) => x.key === key), n = L2[i + (m === 'prev' ? -1 : 1)]; if (n) { GMR.sel = new Set([n.key]); gmRaumBaum(C, C._gmrL); gmrEigen(C, n.key); } } });
  fuellen(f);
}
