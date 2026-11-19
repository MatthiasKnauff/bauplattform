'use strict';
/* Adressen aufräumen (GO 19.11.2026, Mock „Adressen aufräumen“: A1 B1 C1 D1, dazu die Duplikatsuche unter demselben Knopf).
   Reiter: Doppelte Adressen (vorhandene Duplikatsuche duplikate()) · Gewerk · Art · Stichwörter · Tags.
   Je Reiter die Vorschläge des Kerns (bpcore/aufraeumen.py): zusammenführen (Ziel wählbar), aufteilen, zuordnen, leeren – je Gruppe
   „Übernehmen“ oder „Nicht ähnlich“, unten „Alle übernehmen“. Ausgeführt über begriffe.ersetzen, danach Rückgängig (begriffe/zurueck). */
(function () {
  const Q = [['dup', 'Doppelte Adressen'], ['kontakt.trade', 'Gewerk'], ['kontakt.art', 'Art'], ['kontakt.stichworte', 'Stichwörter'], ['kontakt.tags', 'Tags']];
  const ARTN = { firma: 'Firma', bauherr: 'Bauherr:in', baustelle: 'Baustelle' };
  let REIT = 'kontakt.trade', D = {}, DUPN = null;
  const css = document.createElement('style');
  css.textContent = `.af-l{display:grid;gap:.5rem;max-height:min(60vh,34rem);overflow:auto;margin-top:.6rem}.af-g{border:1px solid var(--line);border-radius:calc(8px*var(--rkp,1));padding:.45rem .6rem;display:grid;gap:.2rem}
.af-g.zerl{background:color-mix(in srgb,var(--warn,#b7791f) 8%,transparent)}.af-k{display:flex;justify-content:space-between;gap:.5rem;align-items:center;flex-wrap:wrap}.af-w{display:flex;gap:.3rem;align-items:center;flex-wrap:wrap}
.af-b{display:flex;gap:.3rem}.af-v{display:inline-flex;gap:.25rem;align-items:center;border:1px solid var(--line);border-radius:999px;padding:0 .55rem;font-size:.84rem;background:var(--hov,transparent);font:inherit;font-size:.84rem}
.af-v small{opacity:.65}.af-wahl{cursor:pointer;opacity:.75}.af-wahl.af-z{opacity:1}.af-r [role=tab].on{font-weight:700;border-bottom:2px solid currentColor}.af-z{border-color:var(--ok,#1e8a4c);font-weight:600}.af-ein{cursor:pointer}.af-alle summary{cursor:pointer;margin:.3rem 0}.af-alle div{display:flex;flex-wrap:wrap;gap:.3rem}`;
  document.head.appendChild(css);
  const v = (w) => `<span class="af-v">${esc(w.name || ARTN[w.w] || w.w)} <small>${w.n}</small></span>`;
  function gruppe(x, i) {
    const knopf = { zusammen: 'Zusammenführen', aufteilen: 'Aufteilen', zuordnen: 'Zuordnen', leeren: 'Gewerk leeren' }[x.art], n = x.werte.reduce((s, w) => s + w.n, 0);
    let ziel = '';
    const chip = (w, t) => `<button type="button" class="af-v af-wahl${x.ziel === w ? ' af-z' : ''}" data-afzw="${i}" data-w="${esc(w)}" title="als Ziel wählen">${esc(t)}</button>`;   // keine native Auswahlliste: Ziel als Knöpfe
    if (x.art === 'zusammen') ziel = (x.werte.some((w) => w.w === x.ziel) ? '' : chip(x.ziel, ARTN[x.ziel] || x.ziel)) + x.werte.map((w) => chip(w.w, w.name || ARTN[w.w] || w.w)).join('');
    else if (x.art === 'aufteilen') ziel = x.ziel.map((t) => `<span class="af-v af-z">${esc(t)}</span>`).join(' ');
    else if (x.art === 'zuordnen') ziel = x.wahl.map(([k, t]) => chip(k, t)).join('');
    else ziel = '<span class="mute">(leer)</span>';
    return `<div class="af-g${x.art === 'aufteilen' ? ' zerl' : ''}" data-afi="${i}"><div class="af-k"><span class="af-w">${x.werte.map(v).join(' ')} <span class="mute">→</span> ${ziel}</span>
      <span class="af-b"><button type="button" class="btn sm pri" data-afok="${i}">${knopf} (${n})</button><button type="button" class="btn sm" data-afnein="${i}">${x.art === 'zusammen' ? 'Nicht ähnlich' : 'So lassen'}</button></span></div>
      <small class="mute">${esc(x.grund)}</small></div>`;
  }
  function inhalt() {
    if (REIT === 'dup') return `<p>Doppelte und sehr ähnliche Adressen (gleiche E-Mail, Telefon, Internetseite, ähnlicher Name) – Werte wählen und zusammenführen; Verweise in Bautagebuch, Bauzeitenplan und Ausschreibung werden umgehängt.</p>
      <p><b>${DUPN == null ? '…' : DUPN ? DUPN + ' mögliche Duplikate' : 'Keine Duplikate gefunden.'}</b></p>${DUPN ? '<button type="button" class="btn pri" data-afdup>Durchsehen …</button>' : ''}`;
    const d = D[REIT]; if (!d) return '<p class="mute">Lade …</p>';
    return (d.vorschlaege.length ? d.vorschlaege.map(gruppe).join('') : '<p class="mute">Keine Vorschläge – alles aufgeräumt.</p>')
      + `<details class="af-alle"><summary>Alle Werte A–Z (${d.werte.length})</summary><div>${d.werte.map(([w, n]) => `<button type="button" class="af-v af-ein" data-afein="${esc(w)}" title="Umbenennen oder ersetzen …">${esc(ARTN[w] || w)} <small>${n}</small></button>`).join(' ')}</div></details>`;
  }
  async function laden(q) {
    if (q === 'dup') { try { DUPN = (await api('api/contacts/duplikate')).length; } catch { DUPN = 0; } return; }
    try { D[q] = await api('api/bp/aufraeumen/' + q); } catch (e) { toast(e.message, true); D[q] = { vorschlaege: [], werte: [] }; }
  }
  async function anwenden(q, L, bg) {
    if (!L.length) return;
    let r; try { r = await api(`api/bp/aufraeumen/${q}/anwenden`, 'POST', { vorschlaege: L }); } catch (e) { toast(e.message, true); return; }
    if (r.rueck && r.rueck.length) rueckgaengig(`${r.n} Kontakt${r.n === 1 ? '' : 'e'} aufgeräumt`, async () => { await api(`api/bp/begriffe/${q}/zurueck`, 'POST', { rueck: r.rueck }); await load(); }, { neu: load });
    await laden(q); zeichne(bg); load();
  }
  const auswahl = (x) => ({ art: x.art, werte: x.werte.map((w) => w.w), ziel: x.ziel });
  function zeichne(bg) {
    const L = REIT !== 'dup' && D[REIT] ? D[REIT].vorschlaege : [];
    bg.querySelector('#afIn').innerHTML = `<div class="mh"><h3 style="margin:0">Adressen aufräumen</h3><button class="x" data-m="x" aria-label="Schließen">✕</button></div>
      <div class="tabs af-r" role="tablist">${Q.map(([k, t]) => `<button type="button" role="tab" class="${k === REIT ? 'on' : ''}" aria-selected="${k === REIT}" data-afr="${k}">${t}${k !== 'dup' && D[k] ? ` · ${D[k].vorschlaege.length}` : k === 'dup' && DUPN ? ` · ${DUPN}` : ''}</button>`).join('')}</div>
      <div class="af-l">${inhalt()}</div>
      <div class="acts" style="margin-top:.8rem;display:flex;gap:.5rem"><button class="btn" data-m="x">Schließen</button><span style="flex:1"></span>${L.length ? `<button class="btn pri" data-afalle>Alle Vorschläge übernehmen (${L.reduce((s, x) => s + x.werte.reduce((a, w) => a + w.n, 0), 0)})</button>` : ''}</div>`;
  }
  window.aufraeumen = async function () {
    const bg = modalBox('<div id="afIn"></div>', async (m, bg, close) => { if (m === 'x') { close(); load(); } });
    bg.querySelector('.modal').style.width = 'min(820px,96vw)';
    zeichne(bg);
    await Promise.all(Q.map(([k]) => laden(k))); zeichne(bg);
    bg.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-afr],[data-afok],[data-afnein],[data-afalle],[data-afdup],[data-afein],[data-afzw]'); if (!t) return;
      if (t.dataset.afzw) { const x = (D[REIT] || { vorschlaege: [] }).vorschlaege[+t.dataset.afzw]; if (x) { x.ziel = t.dataset.w; zeichne(bg); } return; }
      if (t.dataset.afr) { REIT = t.dataset.afr; zeichne(bg); return; }
      if (t.dataset.afdup !== undefined) { bg.querySelector('[data-m="x"]').click(); duplikate(); return; }
      const L = D[REIT] ? D[REIT].vorschlaege : [];
      if (t.dataset.afok) { const i = +t.dataset.afok; const a = auswahl(L[i]); if (a.art === 'zuordnen' && !a.ziel) { toast('Bitte eine Art wählen.'); return; } await anwenden(REIT, [a], bg); return; }
      if (t.dataset.afnein) { try { await api(`api/bp/aufraeumen/${REIT}/nicht`, 'POST', { schluessel: L[+t.dataset.afnein].schluessel }); } catch (er) { toast(er.message, true); return; } L.splice(+t.dataset.afnein, 1); zeichne(bg); return; }
      if (t.dataset.afalle !== undefined) { await anwenden(REIT, L.map((x) => auswahl(x)).filter((a) => a.art !== 'zuordnen' || a.ziel), bg); return; }
      if (t.dataset.afein) { if (!window.bpBegriff) await new Promise((ok) => { const sc = document.createElement('script'); sc.src = 'bp/begriffe.js'; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); }); if (!window.bpBegriff) return; const r = await bpBegriff.loeschen({ quelle: REIT, wert: t.dataset.afein }); if (r) { await laden(REIT); zeichne(bg); load(); } }
    });
  };
})();
