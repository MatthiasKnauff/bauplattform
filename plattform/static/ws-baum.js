'use strict';
/* Wärmeschutz: rechts der Reiter „Gebäudemodell“ wie die Baudaten im LV (GO 22.11.2026, Mock „Wärmeschutz – Gebäudemodell rechts“ WR-1 … WR-7 alle A)
   – derselbe Baum wie im Gebäudemodell (bp/bauteile.js) mit opt.filter = nur die Hülle, wie der Kern sie für den Nachweis zusammenträgt
   (MOD.huelle aus waermeschutz_modell._hinweise), ab Werk gruppiert Hüllfläche › Typ, dazu Anforderung und Himmelsrichtung; kompakt:
   Bauteil · Fläche · U · im Nachweis. Noch nicht im Nachweis → „← übernehmen“ (mit Haken: alle angehakten, auch an der Gruppe) oder die
   Zeilen nach links bzw. in die Mitte ziehen (WR-3 A); im Nachweis → U mit Stufe, geändert im Modell → gelber Rand (WR-5 A, „übernehmen? /
   behalten“ steht beim Bauteil in der Mitte). Links stehen wieder die Bauteile des Nachweises (ws-kern.js nav, WR-2 A).
   Nichts springt: der Baum ist EIN Element, das beim Wechsel des Reiters nur umgehängt wird; neu gezeichnet wird nur sein Inhalt.
   Gemeinsame Namen mit ws-kern.js / ws-bauteil.js: D, MOD, BID, PID, R7, NAV, V, ergebnis, typName, zahl, zeichne, wsSicht, modellEntscheiden. */
const WSB = { el: null, bt: null, pid: null, zieh: null };
const WS_HUELLE = [['Außenwände', ['wand']], ['Wände gegen Erdreich', ['erdwand']], ['Wände gegen unbeheizt', ['innenwand']], ['Dach und oberste Geschossdecke', ['steildach', 'flachdach', 'ogd']],
  ['Boden gegen Erdreich / unbeheizt / außen', ['bodenplatte', 'kellerdecke', 'decke_aussen']], ['Fenster und Außentüren', ['fenster', 'tuer']]];
const wsHu = () => new Map(((MOD && MOD.huelle) || []).filter((x) => wsSicht({ typ: x.art, aussen: x.aussen })).map((x) => [x.zeile, x]));
const wsZeileVon = (ref) => { const m = /^bk:[^:]*:(.+)$/.exec(String(ref || '')); return m ? m[1] : ''; };
const wsImNachweis = (zid) => (D ? D.bauteile.find((b) => wsZeileVon(b.ref) === zid) : null);
const wsHinweisVon = (zid, art = 'neu') => (MOD ? MOD.hinweise.find((h) => h.art === art && wsZeileVon(h.ref) === zid) : null);
function wsAnf(b) { if (!b) return 'noch nicht im Nachweis'; const e = ergebnis(b); return e.ok === false ? 'nicht erfüllt' : e.ok ? 'erfüllt' : 'ohne Anforderung'; }
const WS_RI = { N: 'Nord', O: 'Ost', S: 'Süd', W: 'West' };
const wsRi = (z) => { const R = Object.entries(z.richtung || {}); if (!R.length) return 'ohne Richtung'; return WS_RI[R.sort((a, b) => b[1] - a[1])[0][0]] || 'ohne Richtung'; };

function wsBaumReiter(host) {   // Reiter „Gebäudemodell“ (ws-grafik.js bereich): dasselbe Element einhängen
  if (!D || !PID) { host.innerHTML = '<div class="ws-r mute">Erst einen Nachweis anlegen.</div>'; return; }
  if (!WSB.el || WSB.pid !== PID) { WSB.el = document.createElement('div'); WSB.el.className = 'ws-baum'; WSB.pid = PID; WSB.bt = null; wsBaumAn(WSB.el); }
  host.replaceChildren(WSB.el);
  if (!WSB.bt) wsBaumMount(); else WSB.bt.zeigen();
}
function wsBaumNeu() { if (WSB.bt && WSB.el && WSB.el.isConnected) WSB.bt.zeigen(); }
async function wsBaumMount() {
  const el = WSB.el, pid = PID;
  const gm = ((window.BPHead && BPHead.conf) || {}).apps ? BPHead.conf.apps.find((a) => a.key === 'gebaeudemodell') : null;   // wie in der Ausschreibung (ava-modellquelle.js)
  el.innerHTML = `<div class="ws-bkopf"><span class="mute">Hülle aus dem Gebäudemodell – „← übernehmen“ oder nach links ziehen</span>${gm ? `<a class="btn sm" href="${esc(BPHead.appUrl(gm))}/" title="Bauteile und Aufbauten ändern">↗ im Gebäudemodell öffnen</a>` : ''}</div><div class="ws-bt"><p class="mute">Bauteile werden geladen …</p></div>`;
  if (!window.bpBauteile) {
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''];
    await new Promise((ok) => { const sc = document.createElement('script'); sc.src = b + 'bauteile.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });
  }
  if (!window.bpBauteile || pid !== PID) return;
  const hu = () => wsHu();
  WSB.bt = bpBauteile.mount(el.querySelector('.ws-bt'), pid, {
    baum: true, kompakt: true, grpKey: 'bp.ws.grp', grp0: ['huelle', 'typ'], umsortieren: false, ziehen: (ids) => { WSB.zieh = ids; },
    filter: (z) => hu().has(z.id),
    gruppenExtra: {
      huelle: ['Hüllfläche', (z) => { const x = hu().get(z.id); return (WS_HUELLE.find(([, A]) => x && A.includes(x.art)) || ['Sonstige Hülle'])[0]; }, WS_HUELLE.map((x) => x[0])],
      anf: ['Anforderung', (z) => wsAnf(wsImNachweis(z.id)), ['nicht erfüllt', 'noch nicht im Nachweis', 'ohne Anforderung', 'erfüllt']],
      ri: ['Himmelsrichtung', wsRi, ['Nord', 'Ost', 'Süd', 'West', 'ohne Richtung']] },
    letzte: { kopf: 'im Nachweis',
      zelle: (z) => { const b = wsImNachweis(z.id);
        if (!b) return wsHinweisVon(z.id) ? `<button type="button" class="btn sm" data-wsplus="${esc(z.id)}" title="Als Bauteil in den Nachweis übernehmen (mit Haken: alle angehakten)">← übernehmen</button>` : '<span class="mute">–</span>';
        const e = ergebnis(b), st = e.stufe, geae = wsHinweisVon(z.id, 'flaeche');
        return `<span class="ws-bu${st ? ' ws-st' + st.s : ''}${geae ? ' ws-geae' : ''}" title="${esc(b.name || typName(b.typ))}${e.umax != null ? ' · Soll ' + zahl(e.umax) : ''}${st ? ' · ' + st.text + ' (' + st.prozent + ' %)' : ''}${geae ? ' · im Modell geändert – in der Mitte „übernehmen?“' : ''}">${zahl(e.u)} ${st ? st.zeichen : ''}</span>`; },
      gruppe: (R) => { const offen = R.filter((z) => !wsImNachweis(z.id) && wsHinweisVon(z.id)).map((z) => z.id);
        return offen.length ? `<button type="button" class="btn sm" data-wsplusg="${esc(offen.join(','))}" title="Alle ${offen.length} dieser Gruppe übernehmen">← ${offen.length}</button>` : `${R.length} ✓`; } },
    auswahl: (z) => { const b = z && wsImNachweis(z.id); if (b && b.id !== BID) { BID = b.id; WS_AUF.add('bauteile'); zeichne(); } },
  });
}
/* Übernehmen: eine Zeile, die angehakten oder eine ganze Gruppe – Art noch offen (z. B. Decke) → erst wählen; ein Rückgängig je Bauteil */
async function wsUebernehmen(ids, anker) {
  ids = ids.filter((zid) => !wsImNachweis(zid) && wsHinweisVon(zid));
  if (!ids.length) return;
  const ohneArt = ids.filter((zid) => { const h = wsHinweisVon(zid), x = wsHu().get(zid); return !(h.typ || (x && x.art)); });
  const los = async (art) => { for (const zid of ids) { const h = wsHinweisVon(zid), x = wsHu().get(zid); if (h) await modellEntscheiden(h.id, 'uebernehmen', h.typ || (x && x.art) || art); } };
  if (!ohneArt.length) return los('');
  pickMenu(anker || NAV, { items: R7.TYPEN.filter(([k]) => k !== 'innenwand').map(([k, t]) => ({ value: k, title: t })), onPick: (v) => los(v) });
}
function wsBaumAn(el) {   // Klicks der App im Baum – vor denen des Bausteins (Erfassung), damit nichts anderes passiert
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-wsplus]'), g = e.target.closest('[data-wsplusg]');
    if (!p && !g) return;
    e.stopPropagation(); e.preventDefault();
    if (g) return wsUebernehmen(g.dataset.wsplusg.split(','), g);
    const M = WSB.bt ? WSB.bt.mehrfach() : [];
    wsUebernehmen(M.includes(p.dataset.wsplus) ? M : [p.dataset.wsplus], p);   // WR-3 A: auch für mehrere angehakte
  }, true);
  el.addEventListener('dragend', () => { WSB.zieh = null; document.querySelectorAll('.ws-ablage').forEach((x) => x.classList.remove('ws-ablage')); });
}
/* Ablegen links (Navigation) oder in der Mitte = übernehmen (WR-3 A) */
[NAV, V].forEach((z) => {
  z.addEventListener('dragover', (e) => { if (!WSB.zieh) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; z.classList.add('ws-ablage'); });
  z.addEventListener('dragleave', (e) => { if (!z.contains(e.relatedTarget)) z.classList.remove('ws-ablage'); });
  z.addEventListener('drop', (e) => { if (!WSB.zieh) return; e.preventDefault(); const ids = WSB.zieh; WSB.zieh = null; z.classList.remove('ws-ablage'); wsUebernehmen(ids); });
});
