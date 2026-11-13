'use strict';
/* Wiki – Bereich rechts (seite.js): „Prüfung“ (Ablauf des Eintrags, Lektorat der KI, fachliche Prüfung) und „Woche“ (Vorschlag der
   Zusammenfassung übernehmen). Am Handy steht die Prüfung unter dem Eintrag. Gemeinsame Namen mit wiki-kern.js. */
let LEK = null, WO = null, WOL = false;
const WR = {};
const breit = () => window.seite && !matchMedia('(max-width: 820px)').matches;

function rechts() {
  if (breit()) {
    if (!WORK.querySelector(':scope > .sr-r')) {
      const R = (id, titel) => ({ id, titel, mount: (el) => { WR[id] = el; rechtsFuellen(id); } });
      seite(WORK, 'wk', [R('pruef', 'Prüfung'), R('woche', 'Woche')], { start: 'pruef', w: 0.62, minL: 460, min: 320 });
    } else rechtsNeu();
  } else { const u = $('#wkUnten'); if (u) u.innerHTML = `<div class="wk-r">${pruefHtml()}</div>`; }
}
function rechtsNeu() { if (breit()) Object.keys(WR).forEach(rechtsFuellen); else rechts(); }
function rechtsFuellen(id) {
  const el = WR[id]; if (!el || !el.isConnected) return;
  if (id === 'pruef') el.innerHTML = `<div class="wk-r">${pruefHtml()}</div>`;
  if (id === 'woche') { if (!WOL) wocheLaden(); el.innerHTML = `<div class="wk-r">${wocheHtml()}</div>`; }
}

function pruefHtml() {
  if (!E) return '<p class="mute">Links einen Eintrag wählen.</p>';
  const st = E.status, s = (k, n, titel, klein, inhalt = '') => `<div class="wk-s ${k}"><span class="n">${k === 'ok' ? '✓' : n}</span><div><b>${titel}</b><small>${klein}</small>${inhalt}</div></div>`;
  const lek = LEK && LEK.eid === E.id ? LEK : null;
  const lekHtml = lek ? `<div class="wk-vor"><small class="mute">Vorschlag (${esc(lek.ki)})${lek.titel !== E.titel ? ' – neuer Titel: <b>' + esc(lek.titel) + '</b>' : ''}</small>
      <pre>${esc(lek.text)}</pre>${lek.stichworte !== E.stichworte ? `<small class="mute">Stichworte: ${esc(lek.stichworte)}</small>` : ''}
      ${lek.hinweis ? `<small><b>Fachlich prüfen:</b> ${esc(lek.hinweis)}</small>` : ''}
      <div class="wk-k"><button type="button" class="btn sm pri" data-wkl="ja">Übernehmen</button><button type="button" class="btn sm" data-wkl="nein">Verwerfen</button></div></div>`
    : `<div class="wk-k" style="margin-top:.3rem"><button type="button" class="btn sm" data-wkl="los">✨ Lektorat (KI)</button></div>`;
  const darf = L.darf_pruefen;
  return s('ok', 1, 'Gesammelt', `${esc(E.quelle || 'von Hand')} · ${deD(E.created)}`)
    + s(st === 'neu' ? 'jetzt' : 'ok', 2, 'Zusammengefasst', st === 'neu' ? 'kommt mit der Wochenzusammenfassung (montags oder „Woche zusammenfassen“)' : 'eingeordnet',
      st === 'neu' ? '<div class="wk-k" style="margin-top:.3rem"><button type="button" class="btn sm" data-wkstatus="zusammengefasst" title="Ohne KI: Text passt schon">So übernehmen</button></div>' : '')
    + s(st === 'geprueft' ? 'ok' : 'jetzt', 3, 'Lektorat', 'die KI schlägt einen besseren Text vor – nur auf Klick übernommen', st === 'geprueft' ? '' : lekHtml)
    + s(st === 'geprueft' ? 'ok' : '', 4, 'Fachprüfung', st === 'geprueft' ? 'geprüft – erscheint als Hinweis in den Apps' : darf ? 'stimmt das fachlich? Erst dann erscheint es in den Apps' : 'durch eine Person mit dem Recht „Wiki prüfen“ (ab Werk Büroleitung)',
      darf ? `<div class="wk-k" style="margin-top:.3rem">${st === 'geprueft' ? '<button type="button" class="btn sm" data-wkstatus="zusammengefasst">Prüfung zurücknehmen</button>' : '<button type="button" class="btn sm pri" data-wkstatus="geprueft">Fachlich geprüft ✓</button>'}</div>` : '')
    + '<p class="wk-hin">Die KI bekommt Namen und Projekte so, wie sie im Eintrag stehen.</p>';
}

async function wocheLaden() { WOL = true; try { WO = await api('api/woche'); } catch { WO = {}; } if (WR.woche) rechtsFuellen('woche'); }
function wocheHtml() {
  if (!WOL || WO === null) return '<p class="mute">Lade …</p>';
  const n = (L.zahl || {}).neu || 0;
  if (!WO.eintraege || !WO.eintraege.length) return `<p>${n ? `${n} neue Erkenntnis${n === 1 ? '' : 'se'} warten auf die Zusammenfassung.` : 'Keine neuen Erkenntnisse.'}</p>
    <p class="wk-hin">Montags früh bereiten die Dienste einen Vorschlag mit der KI im Büro vor. Jetzt gleich – mit der oben gewählten KI (${esc(L.ki)}):</p>
    <div class="wk-k"><button type="button" class="btn sm pri" data-wkw="los"${n ? '' : ' disabled'}>Woche zusammenfassen</button></div>`;
  return `<p><b>Vorschlag</b> <span class="mute">vom ${deD(WO.wann)} (${esc(WO.ki)})</span></p>${WO.woche ? `<p class="wk-hin">${esc(WO.woche)}</p>` : ''}
    <div class="wk-w">${WO.eintraege.map((e, i) => `<label><input type="checkbox" data-wkwi="${i}" checked><span><b>${esc(e.kapitel)}:</b> ${esc(e.titel)}
      <small>${e.zu ? 'ergänzt „' + esc(e.zu) + '“' : e.ids.length > 1 ? e.ids.length + ' Erkenntnisse zusammengeführt' : 'neuer Eintrag'} · ${esc(e.text.slice(0, 140))}${e.text.length > 140 ? '…' : ''}</small></span></label>`).join('')}</div>
    <div class="wk-k"><button type="button" class="btn sm pri" data-wkw="ja">Ausgewählte übernehmen</button><button type="button" class="btn sm" data-wkw="nein">Verwerfen</button></div>
    <p class="wk-hin">Übernommen wird als „zusammengefasst“ – die fachliche Prüfung folgt je Eintrag.</p>`;
}
function wocheZeigen() {
  if (breit()) { seiteReiter('wk', 'woche'); WOL = false; rechtsFuellen('woche'); return; }
  WOL = false; wocheLaden().then(() => modalBox(`<h3>Woche zusammenfassen</h3><div class="wk-r" data-wkmodal>${wocheHtml()}</div><div class="btns"><button type="button" class="btn" data-m="zu">Schließen</button></div>`, (m, bg, close) => { if (m === 'zu') close(); }));
}
async function lektorat() {
  if (!E) return;
  const eid = E.id;
  try { const r = await BPHead.warten(api(`api/eintraege/${eid}/lektorat`, 'POST'), 'Die KI liest den Eintrag …'); LEK = { eid, ...r }; if (breit()) seiteReiter('wk', 'pruef'); rechtsNeu(); }
  catch (er) { toast(er.message, true); }
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-wkstatus],[data-wkl],[data-wkw]'); if (!t || !E && !t.dataset.wkw) return;
  if (t.dataset.wkstatus) { const s = t.dataset.wkstatus; await speichern({ status: s }, s === 'geprueft' ? 'Fachlich geprüft' : 'Status geändert'); return; }
  if (t.dataset.wkl === 'los') { lektorat(); return; }
  if (t.dataset.wkl === 'nein') { LEK = null; rechtsNeu(); return; }
  if (t.dataset.wkl === 'ja' && LEK && LEK.eid === E.id) { const v = LEK; LEK = null; await speichern({ titel: v.titel, text: v.text, stichworte: v.stichworte }, 'Lektorat übernommen'); return; }
  const w = t.dataset.wkw; if (!w) return;
  try {
    if (w === 'los') { t.disabled = true; WO = await BPHead.warten(api('api/woche', 'POST'), 'Die KI fasst die Woche zusammen …'); }
    else if (w === 'nein') { await api('api/woche', 'DELETE'); WO = {}; toast('Vorschlag verworfen.'); }
    else if (w === 'ja') {
      const box = t.closest('.wk-r'), nr = [...box.querySelectorAll('[data-wkwi]')].filter((x) => x.checked).map((x) => +x.dataset.wkwi);
      if (!nr.length) { toast('Nichts ausgewählt.', true); return; }
      const r = await api('api/woche/uebernehmen', 'POST', { nummern: nr }); WO = {}; toast(`${r.uebernommen} Einträge übernommen – jetzt fachlich prüfen.`);
    }
  } catch (er) { toast(er.message, true); t.disabled = false; }
  const mo = t.closest('[data-wkmodal]'); if (mo) mo.innerHTML = wocheHtml();
  await laden(EID);
});
