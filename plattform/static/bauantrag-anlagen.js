'use strict';
/* Bauantrag – Karte „Anlagen“ (Schritt Prüfen & Paket, Server: bauantrag_anlagen.py): alles, was zum Antrag gehört.
   Pläne aus der Planliste und PDFs aus dem Projektordner (Auswahlfenster mit Suche), freie Zeilen; je Anlage an/aus, Nummer
   (aus der Gliederung), Abschnitt (Trennblatt), „PDF“ oder „nur nennen“, Stand. Abgabe auf Papier (Packliste) oder digital (ZIP).
   Nutzt D, AID, V, zeichne() aus bauantrag.js; Rückgängig über die Gegen-Aufrufe. */
let BAN_PD = null, BAN_PD_AID = null, banHolt = false;   // Planliste und Dateien des Projektordners (einmal je Antrag)
const banNr = () => Object.fromEntries((D.gliederung || []).flatMap((s) => s.eintraege.filter((e) => e.id).map((e) => [e.id, e.nr])));
const banTrenner = () => D.paket.filter((x) => x.art === 'trenner').map((x) => [+x.nr, x.titel]);
const BAN_HER = { bauvorlage: 'Checkliste', frei: 'frei', plan: 'Planliste', datei: 'Projektordner' };

(function () {
  const st = document.createElement('style');
  st.textContent = `.ban td{vertical-align:middle}.ban .ban-h{font-size:.76rem;color:var(--mute)}.ban .ban-w{color:var(--warn,#b7791f);font-size:.78rem;border:0;background:none;padding:0;cursor:pointer;text-decoration:underline}
  .ban .ban-c{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:calc(999px*var(--rkp,1));padding:.08rem .55rem;font:inherit;font-size:.78rem;cursor:pointer;white-space:nowrap;max-width:14rem;overflow:hidden;text-overflow:ellipsis}
  .ban .ban-c.bei{border-color:var(--ok,#1e8a4c);color:var(--ok,#1e8a4c)}.ban .ban-c.nach{border-color:var(--warn,#b7791f);color:var(--warn,#b7791f)}.ban .ban-c.pruef{border-color:#4a7fb5;color:#4a7fb5}
  .ban .ban-n{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--mute);width:2.2rem}.ban .ban-z{display:flex;gap:.35rem;flex-wrap:wrap;align-items:center;margin-top:.3rem}
  .ban-frei{display:flex;gap:.35rem;flex-wrap:wrap;align-items:center;margin-top:.6rem}.ban-frei .ban-c{border-style:dashed;color:var(--mute);max-width:none}.ban .seg button{padding:.12rem .55rem;font-size:.76rem}
  .ban-neu{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center;margin-top:.6rem}.ban-neu input{flex:1;min-width:14rem;font:inherit;padding:.35rem .5rem;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));background:var(--inp);color:var(--ink)}
  .ban-wl{max-height:55vh;overflow:auto;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));margin-top:.5rem}
  .ban-wl .g{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mute);padding:.45rem .7rem .15rem;position:sticky;top:0;background:var(--card)}
  .ban-wl label{display:flex;gap:.55rem;align-items:center;padding:.3rem .7rem;cursor:pointer}.ban-wl label:hover{background:var(--hov)}.ban-wl small{color:var(--mute)}
  .ban-wl label.drin{opacity:.5}`;
  document.head.appendChild(st);
})();

function anlagenHtml() {
  if (!D.anlagen) return '';
  if (D.anlagen.some((x) => x.art === 'plan') && BAN_PD_AID !== AID && !banHolt) { banHolt = true; banProjekt().then(() => { if (SCHRITT === 'pruefen') zeichne(); }).catch(() => {}).finally(() => { banHolt = false; }); }   // neuerer Index?
  const nr = banNr(), T = Object.fromEntries(banTrenner()), an = (x) => `<button type="button" class="bap-ck${x.an ? ' an' : ''}" data-banan="${esc(x.id)}" aria-pressed="${x.an}" title="${x.an ? 'Nicht zum Antrag' : 'Zum Antrag'}"></button>`;
  const neuIdx = (x) => { if (x.art !== 'plan' || !BAN_PD || BAN_PD_AID !== AID) return null; const p = BAN_PD.plaene.find((y) => y.plan === x.plan); return p && p.index !== x.index ? p : null; };
  const zeile = (x) => { const ni = neuIdx(x), datei = x.art === 'plan' || x.art === 'datei';
    return `<tr><td class="bap-c">${an(x)}</td><td class="ban-n">${esc(nr[x.id] || '')}</td>
      <td><b>${esc(x.bezeichnung)}</b> <span class="ban-h">${esc(BAN_HER[x.art] || '')}${x.pflicht ? ' · Pflicht' : ''}</span>${ni ? `<br><button type="button" class="ban-w" data-banidx="${esc(x.id)}">Index ${esc(ni.index || '–')} liegt vor – übernehmen</button>` : ''}
        <div class="ban-z"><button type="button" class="ban-c" data-banab="${esc(x.id)}" title="Abschnitt (Trennblatt ${x.abschnitt})">${esc(T[x.abschnitt] || 'Abschnitt ' + x.abschnitt)}</button>
        ${datei && x.pfad ? `<span class="seg" role="group"><button type="button" data-banbei="${esc(x.id)}" data-v="1" class="${x.beilegen ? 'on' : ''}">PDF</button><button type="button" data-banbei="${esc(x.id)}" data-v="" class="${x.beilegen ? '' : 'on'}">nur nennen</button></span>` : ''}
        ${x.beilegen ? '<span class="ban-c bei">im PDF</span>' : `<button type="button" class="ban-c ${x.stand}" data-banst="${esc(x.id)}">${esc(D.stand_namen[x.stand])}</button>`}</div></td>
      <td class="bap-a">${x.art !== 'bauvorlage' ? `<button type="button" class="btn sm" data-banweg="${esc(x.id)}" title="Anlage entfernen">✕</button>` : ''}</td></tr>`; };
  const drin = D.anlagen.filter((x) => x.an), frei = D.anlagen.filter((x) => !x.an);
  const pap = D.abgabe !== 'digital';
  return `<div class="ba-k ban"><h3>Anlagen<span class="mute">alles, was zum Antrag gehört – auch was nicht im PDF liegt</span></h3>
    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem"><b style="font-size:.85rem">Abgabe</b><span class="seg" role="group"><button type="button" data-banabg="papier" class="${pap ? 'on' : ''}">auf Papier</button><button type="button" data-banabg="digital" class="${pap ? '' : 'on'}">digital</button></span>
      <span class="ba-hilfe" style="margin:0">${pap ? `Das PDF enthält alles außer den genannten Plänen – ${D.packliste ? `Packliste mit ${D.packliste} Anlage${D.packliste === 1 ? '' : 'n'} zum Dazulegen auf der letzten Seite` : 'die Packliste steht auf der letzten Seite'}.` : 'Pläne und Dateien liegen als PDF bei – „⤓ ZIP“ unten: je Anlage eine Datei für das Bauportal.'}</span></div>
    ${drin.length ? `<table class="ba-t"><tbody>${drin.map(zeile).join('')}</tbody></table>` : '<p class="ba-hilfe">Noch keine Anlage gewählt.</p>'}
    ${frei.length ? `<div class="ban-frei"><span class="ban-h">Nicht dabei:</span> ${frei.map((x) => `<button type="button" class="ban-c" data-banan="${esc(x.id)}" title="Zum Antrag">＋ ${esc(x.bezeichnung)}${x.pflicht ? ' ·\u00a0Pflicht' : ''}</button>`).join(' ')}</div>` : ''}
    <div class="ban-neu"><button type="button" class="btn sm" data-banwahl="plaene">＋ Pläne aus der Planliste …</button><button type="button" class="btn sm" data-banwahl="dateien">＋ Datei aus dem Projektordner …</button>
      <input data-banfrei placeholder="＋ frei eingeben, z. B. „Statik (Ing.-Büro Muster)“ – Enter" aria-label="Anlage frei eingeben"></div></div>`;
}

async function banSenden(methode, body, text, zurueck) {
  const id = AID;
  try { D = await api(`api/antraege/${id}/${methode === 'ABGABE' ? 'abgabe' : 'anlage'}`, methode === 'ABGABE' ? 'PUT' : methode, body); zeichne();
    if (D.fehler && D.fehler.length) toast(D.fehler.join(' · '), true);
    if (text) rueckgaengig(text, async () => { if (AID !== id) return; await zurueck(D); zeichne(); });
    return D; } catch (e) { toast(e.message, true); return null; }
}
async function banProjekt() {
  if (BAN_PD && BAN_PD_AID === AID) return BAN_PD;
  BAN_PD = await api(`api/antraege/${AID}/projektdateien`); BAN_PD_AID = AID; return BAN_PD;
}
async function banWahl(art) {
  let P; try { P = await banProjekt(); } catch (e) { toast(e.message, true); return; }
  const drin = new Set(D.anlagen.map((x) => x.pfad).filter(Boolean)), plaene = art === 'plaene';
  const L = plaene ? P.plaene : P.sonstige;
  if (!L.length) { bpHinweis(plaene ? 'In der Planliste des Projekts sind keine Plan-PDFs.' : 'Im Projektordner sind keine weiteren PDFs.'); return; }
  const gruppen = [...new Set(L.map((x) => (plaene ? x.gruppe : x.ordner) || (plaene ? 'Pläne' : 'Projektordner')))];
  const liste = (q) => gruppen.map((g) => { const Z = L.filter((x) => ((plaene ? x.gruppe : x.ordner) || (plaene ? 'Pläne' : 'Projektordner')) === g)
    .filter((x) => !q || [x.nr, x.titel, x.name, x.ordner].join(' ').toLowerCase().includes(q)); if (!Z.length) return '';
    return `<div class="g">${esc(g)}</div>${Z.map((x) => `<label class="${drin.has(x.pfad) ? 'drin' : ''}"><input type="checkbox" data-pf="${esc(x.pfad)}"${drin.has(x.pfad) ? ' disabled checked' : ''}>
      <span>${plaene ? `<b>${esc(x.nr)}</b> ${esc(x.titel)} <small>${x.index ? 'Index ' + esc(x.index) : ''}</small>` : `${esc(x.name)} <small>${esc(x.ordner)}</small>`}</span></label>`).join('')}`; }).join('') || '<p class="mute" style="padding:.6rem">Nichts gefunden.</p>';
  modalBox(`<div class="modal-h"><b>${plaene ? 'Pläne aus der Planliste' : 'Datei aus dem Projektordner'}</b><button type="button" class="ib" data-m="x" aria-label="Schließen">✕</button></div>
    <input type="search" data-banq placeholder="Suchen …" aria-label="Suchen" style="width:100%;box-sizing:border-box;font:inherit;padding:.4rem .55rem;border:1px solid var(--line);border-radius:8px;background:var(--inp);color:var(--ink)">
    <div class="ban-wl">${liste('')}</div><p class="ba-hilfe" style="margin:.5rem 0 0">${plaene ? (D.abgabe === 'digital' ? 'Die Pläne werden als PDF beigelegt.' : 'Die Pläne werden genannt und kommen auf die Packliste – „PDF“ legt sie ins Paket.') : 'Die Dateien werden als PDF beigelegt – „nur nennen“ geht danach in der Liste.'}</p>
    <div class="modal-f"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Übernehmen</button></div>`, async (m, bg, close) => {
    if (m === 'x') return close();
    if (m !== 'ok') return;
    const sel = [...bg.querySelectorAll('input[data-pf]:checked:not(:disabled)')].map((i) => L.find((x) => x.pfad === i.dataset.pf)).filter(Boolean);
    if (!sel.length) { toast('Bitte mindestens eine Datei ankreuzen.', true); return; }
    close();
    const neu = sel.map((x) => plaene ? { art: 'plan', text: x.titel, nr: x.nr, index: x.index, pfad: x.pfad, plan: x.plan } : { art: 'datei', text: x.name.replace(/\.pdf$/i, ''), pfad: x.pfad });
    const r = await banSenden('POST', { neu }, `${sel.length} Anlage${sel.length === 1 ? '' : 'n'} hinzugefügt`, async () => { for (const i of r.neu) D = await api(`api/antraege/${AID}/anlage`, 'DELETE', { id: i }); });
  });
  const q = document.querySelector('[data-banq]'); if (q) { q.focus(); q.addEventListener('input', () => { q.closest('.modal').querySelector('.ban-wl').innerHTML = liste(q.value.trim().toLowerCase()); }); }
}
function banMenue(anker, items, onPick) { pickMenu(anker, { items, onPick }); }

V.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-banan],[data-banab],[data-banbei],[data-banst],[data-banweg],[data-banwahl],[data-banabg],[data-banidx],[data-baanl]'); if (!b || !D) return;
  const x = (k) => D.anlagen.find((y) => y.id === k);
  if (b.dataset.banwahl) return banWahl(b.dataset.banwahl);
  if (b.dataset.banan) { const a = x(b.dataset.banan); return banSenden('PUT', { id: a.id, an: !a.an }, a.an ? `„${a.bezeichnung}“ nicht zum Antrag` : `„${a.bezeichnung}“ zum Antrag`, async () => { D = await api(`api/antraege/${AID}/anlage`, 'PUT', { id: a.id, an: a.an }); }); }
  if (b.dataset.banab) { const a = x(b.dataset.banab);
    return banMenue(b, banTrenner().map(([n, t]) => ({ value: n, title: t, sub: `Trennblatt ${n}`, on: n === a.abschnitt })), (v) => banSenden('PUT', { id: a.id, abschnitt: v }, `Abschnitt ${v}`, async () => { D = await api(`api/antraege/${AID}/anlage`, 'PUT', { id: a.id, abschnitt: a.abschnitt }); })); }
  if (b.dataset.banst) { const a = x(b.dataset.banst);
    return banMenue(b, Object.entries(D.stand_namen).map(([k, t]) => ({ value: k, title: t, on: k === a.stand })), (v) => banSenden('PUT', { id: a.id, stand: v }, D.stand_namen[v], async () => { D = await api(`api/antraege/${AID}/anlage`, 'PUT', { id: a.id, stand: a.stand }); })); }
  if (b.dataset.banbei) { const a = x(b.dataset.banbei), v = !!b.dataset.v; if (v === a.beilegen) return;
    return banSenden('PUT', { id: a.id, beilegen: v }, v ? 'Als PDF beigelegt' : 'Nur genannt', async () => { D = await api(`api/antraege/${AID}/anlage`, 'PUT', { id: a.id, beilegen: !v }); }); }
  if (b.dataset.banidx) { const a = x(b.dataset.banidx), p = BAN_PD.plaene.find((y) => y.plan === a.plan);
    return banSenden('PUT', { id: a.id, index: p.index, pfad: p.pfad }, `Index ${p.index} übernommen`, async () => { D = await api(`api/antraege/${AID}/anlage`, 'PUT', { id: a.id, index: a.index, pfad: a.pfad }); }); }
  if (b.dataset.banweg) { const a = x(b.dataset.banweg);
    return banSenden('DELETE', { id: a.id }, `„${a.bezeichnung}“ entfernt`, async () => {
      if (a.id.startsWith('e:')) { D = await api(`api/antraege/${AID}/paket`, 'PUT', { deckblatt: { neu: a.text, punkt: a.text, an: a.an } }); return; }
      D = await api(`api/antraege/${AID}/anlage`, 'POST', { neu: [{ art: a.art, text: a.text, nr: a.nr, index: a.index, pfad: a.pfad, plan: a.plan, abschnitt: a.abschnitt, beilegen: a.beilegen }] }); }); }
  if (b.dataset.banabg) { const alt = D.abgabe, v = b.dataset.banabg; if (v === alt) return;
    return banSenden('ABGABE', { abgabe: v }, v === 'digital' ? 'Abgabe digital – Pläne als PDF' : 'Abgabe auf Papier – Pläne werden genannt', async () => { D = await api(`api/antraege/${AID}/abgabe`, 'PUT', { abgabe: alt }); }); }
  if (b.dataset.baanl) { if (b.dataset.baanl === D.anschreiben.anlagen) return; const alt = D.anschreiben.anlagen, id = AID;
    try { D = await api(`api/antraege/${id}/paket`, 'PUT', { anschreiben: { anlagen: b.dataset.baanl } }); zeichne();
      rueckgaengig(b.dataset.baanl === 'liste' ? 'Anlagen im Anschreiben ausgeschrieben' : 'Anlagen gemäß Inhaltsverzeichnis', async () => { D = await api(`api/antraege/${id}/paket`, 'PUT', { anschreiben: { anlagen: alt } }); zeichne(); }); } catch (er) { toast(er.message, true); }
    return; }
});
V.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter' || e.target.dataset.banfrei === undefined || !e.target.value.trim()) return;
  e.preventDefault(); const t = e.target.value.trim();
  const r = await banSenden('POST', { neu: [{ art: 'frei', text: t }] }, `„${t}“ ergänzt`, async () => { for (const i of r.neu) D = await api(`api/antraege/${AID}/anlage`, 'DELETE', { id: i }); });
  const f = V.querySelector('[data-banfrei]'); if (f) f.focus();
});
