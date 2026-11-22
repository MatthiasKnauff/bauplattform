'use strict';
/* Wärmeschutz: links derselbe Bauteile-Baum wie im Gebäudemodell (GO 22.11.2026, Mock „Wärmeschutz: Bauteile-Baum“ WB-1 B · WB-2 A · WB-3 A · WB-4 A)
   – bp/bauteile.js mit opt.filter (nur die Hülle, wie der Kern sie für den Nachweis zusammenträgt: MOD.huelle aus waermeschutz_modell._hinweise),
   eigene Ebene „Hüllfläche“ (ab Werk Hüllfläche › Typ), dazu Anforderung und Himmelsrichtung; kompakt: Bauteil · Fläche · U · im Nachweis.
   Klick öffnet das Bauteil des Nachweises in der Mitte, „＋ in den Nachweis“ übernimmt (auch für mehrere angehakte). Darunter „Nur im Nachweis“
   (von Hand, ohne Zeile im Modell) mit „＋ Bauteil …“ – was fehlt, wird hier angelegt. Nichts springt: der Baum ist EIN Element, das beim
   Neuzeichnen der Navigation nur umgehängt wird; neu gezeichnet wird nur sein Inhalt.
   Gemeinsame Namen mit ws-kern.js / ws-bauteil.js: D, MOD, BID, PID, R7, ergebnis, typName, zahl, zeichne, wsSicht, modellEntscheiden, bauteilNeu. */
const WSB = { el: null, bt: null, pid: null };
const WS_HUELLE = [['Außenwände', ['wand']], ['Wände gegen Erdreich', ['erdwand']], ['Wände gegen unbeheizt', ['innenwand']], ['Dach und oberste Geschossdecke', ['steildach', 'flachdach', 'ogd']],
  ['Boden gegen Erdreich / unbeheizt / außen', ['bodenplatte', 'kellerdecke', 'decke_aussen']], ['Fenster und Außentüren', ['fenster', 'tuer']]];
const wsHu = () => new Map(((MOD && MOD.huelle) || []).filter((x) => wsSicht({ typ: x.art, aussen: x.aussen })).map((x) => [x.zeile, x]));
const wsZeileVon = (ref) => { const m = /^bk:[^:]*:(.+)$/.exec(String(ref || '')); return m ? m[1] : ''; };
const wsImNachweis = (zid) => (D ? D.bauteile.find((b) => wsZeileVon(b.ref) === zid) : null);
const wsHinweisVon = (zid) => (MOD ? MOD.hinweise.find((h) => h.art === 'neu' && wsZeileVon(h.ref) === zid) : null);
function wsAnf(b) { if (!b) return 'noch nicht im Nachweis'; const e = ergebnis(b); return e.ok === false ? 'nicht erfüllt' : e.ok ? 'erfüllt' : 'ohne Anforderung'; }
const WS_RI = { N: 'Nord', O: 'Ost', S: 'Süd', W: 'West' };
const wsRi = (z) => { const R = Object.entries(z.richtung || {}); if (!R.length) return 'ohne Richtung'; return WS_RI[R.sort((a, b) => b[1] - a[1])[0][0]] || 'ohne Richtung'; };

function wsBaum(nav) {   // aus nav(): den Baum hinter die Gruppe „Nachweis“ hängen (dasselbe Element, kein Neuaufbau)
  if (!D || !PID) return;
  const nach = [...nav.querySelectorAll('.ng')].find((x) => (x.querySelector('.nh') || {}).textContent === 'Nachweis'); if (!nach) return;
  if (!WSB.el || WSB.pid !== PID) { WSB.el = document.createElement('div'); WSB.el.className = 'ws-baum'; WSB.pid = PID; WSB.bt = null; wsBaumAn(WSB.el); }
  nach.after(WSB.el);
  if (!WSB.bt) wsBaumMount(); else WSB.bt.zeigen();
}
async function wsBaumMount() {
  const el = WSB.el, pid = PID;
  el.innerHTML = '<div class="nh">Bauteile</div><div class="ws-bt"><p class="mute">Bauteile werden geladen …</p></div>';
  if (!window.bpBauteile) {
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''];
    await new Promise((ok) => { const sc = document.createElement('script'); sc.src = b + 'bauteile.js' + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); });
  }
  if (!window.bpBauteile || pid !== PID) return;
  const hu = () => wsHu();
  WSB.bt = bpBauteile.mount(el.querySelector('.ws-bt'), pid, {
    baum: true, kompakt: true, grpKey: 'bp.ws.grp', grp0: ['huelle', 'typ'],
    filter: (z) => hu().has(z.id),
    gruppenExtra: {
      huelle: ['Hüllfläche', (z) => { const x = hu().get(z.id); return (WS_HUELLE.find(([, A]) => x && A.includes(x.art)) || ['Sonstige Hülle'])[0]; }, WS_HUELLE.map((x) => x[0])],
      anf: ['Anforderung', (z) => wsAnf(wsImNachweis(z.id)), ['nicht erfüllt', 'noch nicht im Nachweis', 'ohne Anforderung', 'erfüllt']],
      ri: ['Himmelsrichtung', wsRi, ['Nord', 'Ost', 'Süd', 'West', 'ohne Richtung']] },
    letzte: { kopf: 'im Nachweis',
      zelle: (z) => { const b = wsImNachweis(z.id); if (!b) return wsHinweisVon(z.id) ? `<button type="button" class="btn sm" data-wsplus="${esc(z.id)}" title="Als Bauteil in den Nachweis übernehmen (mit Haken: alle angehakten)">＋ in den Nachweis</button>` : '<span class="mute">–</span>';
        const e = ergebnis(b), st = e.stufe; return `<span class="ws-bu${st ? ' ws-st' + st.s : ''}" title="${esc(b.name || typName(b.typ))}${e.umax != null ? ' · Soll ' + zahl(e.umax) : ''}${st ? ' · ' + st.text + ' (' + st.prozent + ' %)' : ''}">${zahl(e.u)} ${st ? st.zeichen : ''}</span>`; },
      gruppe: (R) => `${R.filter((z) => wsImNachweis(z.id)).length} von ${R.length}` },
    nachher: () => wsNurNachweis(),
    auswahl: (z) => { const b = z && wsImNachweis(z.id); if (b && b.id !== BID) { BID = b.id; WS_AUF.add('bauteile'); zeichne(); } },
  });
}
function wsNurNachweis() {   // Bauteile des Nachweises ohne Zeile im Modell (von Hand) – unten im Baum, mit „＋ Bauteil …“
  const H = wsHu(), N = (D ? D.bauteile : []).filter((b) => !H.has(wsZeileVon(b.ref)) && wsSicht(b));
  return `<tr class="bt-bh ws-nur"><td colspan="3"><b>Nur im Nachweis</b> <small class="bt-nr">${N.length} · von Hand</small> <button type="button" class="bt-plus" data-wsneu title="Bauteil von Hand anlegen: Art wählen, Musteraufbau oder aus dem Katalog">＋ Bauteil …</button></td><td class="c"></td></tr>`
    + N.map((b) => { const e = ergebnis(b);
      return `<tr class="ws-nurz${b.id === BID ? ' akt' : ''}" data-wsb="${esc(b.id)}"><td style="padding-left:1.4rem">${esc(`${b.kurz || ''} ${b.name || typName(b.typ)}`.trim())}</td><td class="r">${b.flaeche ? zahl(b.flaeche) + '&nbsp;m²' : ''}</td><td class="r">${zahl(e.u)}</td><td class="c">${e.stufe ? `<span class="ws-bu ws-st${e.stufe.s}" title="${e.stufe.text}">${e.stufe.zeichen}</span>` : ''}</td></tr>`; }).join('');
}
function wsBaumAn(el) {   // Klicks der App im Baum – vor denen des Bausteins (Erfassung), damit nichts anderes passiert
  el.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-wsplus]'), n = e.target.closest('[data-wsneu]'), r = e.target.closest('tr[data-wsb]');
    if (!p && !n && !r) return;
    e.stopPropagation(); e.preventDefault();
    if (n) return bauteilNeu(n);
    if (r) { if (r.dataset.wsb !== BID) { BID = r.dataset.wsb; WS_AUF.add('bauteile'); zeichne(); } return; }
    const ids = WSB.bt && WSB.bt.mehrfach().includes(p.dataset.wsplus) ? WSB.bt.mehrfach() : [p.dataset.wsplus];   // WB-4 A: auch für mehrere angehakte
    const ohneArt = ids.filter((zid) => { const h = wsHinweisVon(zid), x = wsHu().get(zid); return h && !(h.typ || (x && x.art)); });
    const los = async (art) => { for (const zid of ids) { const h = wsHinweisVon(zid), x = wsHu().get(zid); if (h) await modellEntscheiden(h.id, 'uebernehmen', h.typ || (x && x.art) || art); } };
    if (!ohneArt.length) return los('');
    pickMenu(p, { items: R7.TYPEN.filter(([k]) => k !== 'innenwand').map(([k, t]) => ({ value: k, title: t })), onPick: (v) => los(v) });   // Art noch offen (z. B. Decke): erst wählen
  }, true);
}
