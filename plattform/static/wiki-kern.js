'use strict';
/* Wiki – Seite der App (besprochen am 13.11.2026; Aufbau wie die anderen Apps seit 14.11.2026, Entwurf „Wiki-Aufbau“): links nur Bereiche
   (Alle, Neu, Zu prüfen, Geprüft, Wochen – bpNav mit Suche), oben die Befehlsleiste, in der Mitte die Tag-Zeile und die Baumtabelle
   Kapitel → Einträge (bpBaum), rechts der abdockbare Bereich: Eintrag (sofort gespeichert, Rückgängig-Dock), Prüfung, Woche (wiki-pruefung.js).
   Am Handy: Einträge als Karten, Tippen öffnet den Eintrag ganzseitig.
   Server: plattform/wiki.py, Regeln bpcore/wiki.py. Festhalten aus anderen Apps: Baustein bp/wiki.js. */
let L = null, E = null, EID = null, Q = '', ST = '', BER = 'alle', HOFFEN = false;
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work');
const STN = { neu: 'neu gesammelt', zusammengefasst: 'zusammengefasst – Prüfung offen', geprueft: 'fachlich geprüft' };
const FARBE = { neu: 'var(--mute)', zusammengefasst: 'var(--c-o)', geprueft: 'var(--c-g)' };
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', seite: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', ki: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  pdf: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 15h6M12 12v6"/>', weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', woche: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', ok: '<path d="M5 12l5 5 9-10"/>' };
const deD = (t) => (t && t.length >= 10 ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
const LS = { get(k) { try { return JSON.parse(localStorage.getItem('wk.' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('wk.' + k, JSON.stringify(v)); } catch { /* egal */ } } };
let TAGS = LS.get('tags') || [];   // Tag-Zeile über der Tabelle, je Benutzer:in gemerkt
const KZ = bpBaum.klapp({ key: 'wiki' });
const HANDY = matchMedia('(max-width: 820px)');

async function laden(eid) {
  L = await api('api/eintraege?q=' + encodeURIComponent(Q) + '&status=' + ST);
  if (eid) EID = eid;
  const S = sichtbar();
  if (!L.eintraege.some((x) => x.id === EID)) EID = (S.find((x) => x.id === LS.get('eid')) || S[0] || {}).id || null;
  if (EID) LS.set('eid', EID);
  try { E = EID ? await api('api/eintraege/' + EID) : null; } catch { E = null; }
  zeichne();
}
/* Einträge des gewählten Bereichs und der Tag-Zeile: Wochen nur im Bereich „Wochen“; mehrere Tags = Einträge mit allen gewählten */
function sichtbar() {
  const T = TAGS.map((t) => t.toLowerCase());
  return L.eintraege.filter((x) => (BER === 'wochen' ? x.kapitel === 'Wochen' : x.kapitel !== 'Wochen') && T.every((t) => x.tags.some((y) => y.toLowerCase() === t)));
}

/* Speichern: Server antwortet mit dem Eintrag und „vorher“ – Rückgängig schickt die alten Werte zurück */
async function speichern(body, text, still) {
  if (!E) return null;
  const eid = E.id;
  try {
    const r = await api('api/eintraege/' + eid, 'PUT', body), vorher = r.vorher; delete r.vorher;
    E = r; const z = L.eintraege.find((x) => x.id === eid); if (z) Object.assign(z, { titel: r.titel, kapitel: r.kapitel, status: r.status, tags: r.tags, projekte: r.projekte });
    if (body.status) await laden(eid);   // Zahlen links (zu prüfen …) neu
    else if (still) { nav(); tabelleNeu(); } else zeichne();
    if (text && vorher) rueckgaengig(text, async () => {   // die alten Werte zurück (Tags stecken in Kapitel und Stichworten, Projekte als Liste)
      const zr = {}; Object.keys(body).forEach((k) => { if (k === 'tags') Object.assign(zr, { kapitel: vorher.kapitel, stichworte: vorher.stichworte }); else if (k === 'projekte') zr.projekte = JSON.parse(vorher.projekte || '[]'); else zr[k] = vorher[k]; });
      await api('api/eintraege/' + eid, 'PUT', zr); await laden(eid); });
    return r;
  } catch (e) { toast(e.message, true); return null; }
}

const BEREICHE = [['alle', 'Alle Einträge', '', '#2f5fb3'], ['neu', 'Neu', 'neu', '#c48a1a'], ['pruef', 'Zu prüfen', 'zusammengefasst', 'var(--red,#b42318)'], ['geprueft', 'Geprüft', 'geprueft', 'var(--ok,#2e7d4f)']];
function nav() {
  const z = L.zahl || {}, nW = L.eintraege.filter((x) => x.kapitel === 'Wochen').length;
  const P = ([k, t, st, f]) => ({ id: k, text: t, icon: IC.seite, farbe: f, zahl: k === 'alle' ? '' : String(z[st] || '') || '', zahlTip: k === 'pruef' ? 'warten auf die fachliche Prüfung' : '' });
  bpNav(NAV, { kopf: { titel: 'Wiki', klein: `${L.eintraege.length} Einträge${z.zusammengefasst ? ' · ' + z.zusammengefasst + ' zu prüfen' : ''}` }, attr: 'wk', lage: true,
    davor: `<div class="wk-such"><input type="search" id="wkQ" placeholder="Suchen: Text, Stichwort, Projekt …" value="${esc(Q)}"></div>`,
    gruppen: [{ titel: 'Wissen', punkte: BEREICHE.map(P) }, { titel: 'Sammeln', punkte: [{ id: 'wochen', text: 'Wochen', icon: IC.woche, farbe: '#7a4fb3', zahl: nW ? String(nW) : '' }] }],
    aktiv: BER, fuss: '<button type="button" class="nneu" data-wkneu>＋ Neue Erkenntnis</button>',
    wahl: (id) => { BER = id; ST = (BEREICHE.find((b) => b[0] === id) || [])[2] || ''; HOFFEN = false; EID = null; laden(); } });
  const q = NAV.querySelector('#wkQ');
  if (q && !q.dataset.an) { q.dataset.an = 1; let t = 0; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { Q = q.value.trim(); laden(); }, 300); }); }
}
NAV.addEventListener('click', (e) => { if (e.target.closest('[data-wkneu]')) neuDialog(); });

function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [K('Erkenntnis', IC.neu, neuDialog, { tip: 'Neue Erkenntnis festhalten (geht auch in jeder App: „?“ → „Erkenntnis fürs Wiki“)' })] },
    { titel: 'KI', knoepfe: [K(L.woche ? `Woche · ${L.woche}` : 'Woche zusammenfassen', IC.woche, () => wocheZeigen(), { tip: L.woche ? 'Vorschlag der Zusammenfassung ansehen und übernehmen' : 'Neue Erkenntnisse von der KI zuordnen und zusammenführen lassen (Vorschlag)' }),
      K('Lektorat', IC.ki, () => lektorat(), { aus: !E, tip: 'Die KI schlägt einen besseren Text vor – übernommen wird nur auf Klick' })] },
    ...(L.darf_pruefen ? [{ titel: 'Prüfen', knoepfe: [K(E && E.status === 'geprueft' ? 'Prüfung zurücknehmen' : 'Fachlich geprüft', IC.ok, () => E && speichern({ status: E.status === 'geprueft' ? 'zusammengefasst' : 'geprueft' }, 'Prüfung geändert'), { aus: !E })] }] : []),
    { titel: 'Ausgabe', rechts: true, knoepfe: [K('PDF', IC.pdf, () => window.open('api/pdf', '_blank'), { tip: 'Das ganze Wiki als PDF – die Dienste legen es jede Woche auch in „Pläne & Dateien“ → „Büro“ → „Wiki“ ab' })] },
    { titel: 'Bearbeiten', rechts: true, knoepfe: [K('Löschen', IC.weg, eintragLoeschen, { aus: !E, rot: true })] },
  ]);
}

/* ---------- Mitte: Tag-Zeile und Baumtabelle Kapitel → Einträge ---------- */
const STK = { neu: ['n', 'neu'], zusammengefasst: ['p', 'zu prüfen'], geprueft: ['g', 'geprüft'] };
function tagZeile() {
  const S = sichtbar();
  return `<div class="wk-tf"><span class="mute">🏷 Tags:</span>${TAGS.map((t) => `<button type="button" class="wk-tag on" data-wktagweg="${esc(t)}" title="Filter entfernen">${esc(t)} ✕</button>`).join('')}
    <button type="button" class="wk-tag plus" data-wktagdazu>＋ Tag ▾</button><span class="mute wk-tz">${S.length} von ${L.eintraege.filter((x) => (BER === 'wochen') === (x.kapitel === 'Wochen')).length} Einträgen</span></div>`;
}
function tabelleHtml() {
  const S = sichtbar(), G = {};
  for (const x of S) (G[x.kapitel || 'Ohne Kapitel'] = G[x.kapitel || 'Ohne Kapitel'] || []).push(x);
  const reihe = Object.keys(G).sort((a, b) => G[b].length - G[a].length || a.localeCompare(b, 'de'));
  if (!S.length) return `<div class="leer">${Q || TAGS.length || ST ? 'Nichts gefunden.' : 'Noch leer – „＋ Erkenntnis“ oben, oder in jeder App über „?“ → „Erkenntnis fürs Wiki“.'}</div>`;
  const zeilen = reihe.map((k) => {
    const zu = KZ.zu('k:' + k);
    return `<tr class="k" data-wkkap="${esc(k)}">${bpBaum.zelle({ tiefe: 0, auf: !zu, klapp: 'k:' + k, icon: '<span class="wk-ic">📁</span>', html: `<b>${esc(k)}</b> <small class="mute">${G[k].length}</small>` })}<td></td><td></td><td></td><td></td></tr>`
      + (zu ? '' : G[k].map((x) => `<tr data-wke="${x.id}" draggable="true" class="${x.id === EID ? 'on' : ''}">${bpBaum.zelle({ tiefe: 1, icon: '<span class="wk-ic">📄</span>', html: `<span>${esc(x.titel || '(ohne Titel)')}</span>${x.dateien ? ` <small class="mute">📎${x.dateien}</small>` : ''}` })}
        <td><span class="wk-sc ${STK[x.status][0]}">${STK[x.status][1]}</span></td><td class="wk-tc">${x.tags.slice(1, 3).map((t) => `<button type="button" class="wk-tag" data-wktag="${esc(t)}" title="nach „${esc(t)}“ filtern">${esc(t)}</button>`).join('')}</td>
        <td class="wk-pc">${esc(x.projekte.map((p) => (p.name || '').split(' ')[0]).join(', ') || '–')}</td><td class="mute wk-dc">${deD(x.updated || x.created)}</td></tr>`).join(''));
  }).join('');
  return `<table class="bp-baum wk-t"><thead><tr><th>Titel</th><th>Status</th><th>Tags</th><th>Projekte</th><th>geändert</th></tr></thead><tbody>${zeilen}</tbody></table>
    <p class="wk-hin" style="margin-top:.5rem">Einträge auf ein Kapitel ziehen ordnet sie dort ein (erster Tag). Klick auf einen Tag filtert.</p>`;
}
function tabelleNeu() { const t = V.querySelector('[data-wktab]'); if (t) { const pos = V.scrollTop; t.innerHTML = tabelleHtml(); V.scrollTop = pos; } const z = V.querySelector('.wk-tf'); if (z) z.outerHTML = tagZeile(); }

/* Eintrag (rechts im Bereich, am Handy ganzseitig) */
function dateienHtml() {
  const d = E.dateien || [];
  return `<div class="wk-df">${d.map((f) => `<div class="wk-d"><a href="api/datei/${f.id}" target="_blank" rel="noopener" title="${esc(f.name)} – von der Freigabe „Bauportal“">${f.bild ? `<img src="api/datei/${f.id}/bild" alt="" loading="lazy">` : '<span class="sy">📄</span>'}<span>${esc(f.name)}</span></a><button type="button" data-wkdweg="${f.id}" title="Aus dem Eintrag entfernen (die Datei bleibt auf der Freigabe)" aria-label="entfernen">✕</button></div>`).join('')}</div>
    <div class="wk-drop" data-wkdrop>Fotos, PDFs hierher ziehen oder <label>auswählen<input type="file" multiple hidden data-wkfile></label> – sie liegen auf „Bauportal/02 Wiki/${esc(E.kapitel || 'Sonstiges')}“, hier nur ein Vorschaubild.</div>`;
}
function eintragHtml() {
  if (!E) return '<div class="wk-r"><p class="mute">In der Tabelle einen Eintrag wählen.</p></div>';
  return `<div class="wk-a">${HANDY.matches ? '<button type="button" class="btn sm" data-wkzur style="justify-self:start">‹ Alle Einträge</button>' : ''}
    <input class="ti" data-wkf="titel" value="${esc(E.titel)}" aria-label="Titel" placeholder="Titel">
    <div class="wk-meta"><span class="wk-st ${E.status}"><i></i>${STN[E.status]}</span>
      <span>Projekte: ${E.projekte.length ? esc(E.projekte.map((x) => x.name).join(', ')) : '–'} <button type="button" class="wk-l" data-wkprj>ändern</button></span>${E.quelle ? `<span>aus: ${esc(E.quelle)}</span>` : ''}
      <span>${esc(E.autor_name || '')} · ${deD(E.created)}${E.updated && E.updated.slice(0, 10) !== (E.created || '').slice(0, 10) ? ' · geändert ' + deD(E.updated) : ''}</span></div>
    <textarea data-wkf="text" aria-label="Text" spellcheck="true">${esc(E.text)}</textarea>
    <div class="wk-sw">Tags <small>– meistbenutzte zuerst; der erste ordnet ein</small></div><div data-wktags></div>
    ${dateienHtml()}
    ${E.status === 'geprueft' ? '<p class="wk-hin">Geprüft – wer Titel oder Text ändert, gibt den Eintrag wieder zur Prüfung.</p>' : ''}
    ${HANDY.matches ? `<div class="wk-r">${pruefHtml()}</div>` : ''}</div>`;
}
function eintragFuellen(el) {
  if (!el) return;
  el.innerHTML = eintragHtml();
  const t = el.querySelector('[data-wktags]'); if (t && E) bpWiki.tagKnoepfe(t, E.tags, L.tags || [], (T) => speichern({ tags: T }, 'Tags geändert', true));   // Baustein bp/wiki.js
}

function zeichne() {
  nav(); leiste();
  const pos = V.scrollTop;
  if (HANDY.matches) {   // Handy: Karten, Tippen öffnet den Eintrag ganzseitig (wie im Bautagebuch)
    document.body.classList.add('wk-handy');
    if (HOFFEN && E) { eintragFuellen(V); V.scrollTop = 0; return; }
    const S = sichtbar();
    V.innerHTML = `${tagZeile()}<div class="wk-karten">${S.map((x) => `<button type="button" class="wk-karte" data-wke="${x.id}"><b>${esc(x.titel || '(ohne Titel)')}</b>
      <span class="wk-sc ${STK[x.status][0]}">${STK[x.status][1]}</span><small>${esc(x.kapitel)}${x.tags.length > 1 ? ' · ' + esc(x.tags.slice(1, 3).join(', ')) : ''} · ${deD(x.updated || x.created)}</small>
      <span class="kurz">${esc(x.kurz || '')}</span></button>`).join('') || '<div class="leer">Nichts gefunden.</div>'}</div>`;
    V.scrollTop = pos; return;
  }
  V.innerHTML = `${tagZeile()}<div data-wktab>${tabelleHtml()}</div>`;
  V.scrollTop = pos;
  rechts();
}
bpBaum.klappbar(V, { klapp: () => KZ, neu: () => tabelleNeu(), alle: () => [...new Set(L.eintraege.map((x) => 'k:' + (x.kapitel || 'Ohne Kapitel')))] });
bpBaum.tasten({ wurzel: '#view table.wk-t > tbody', zeilen: 'tr[data-wke], tr.k', waehle: (z) => z.click() });
HANDY.addEventListener('change', () => { document.body.classList.toggle('wk-handy', HANDY.matches); zeichne(); });

/* ---------- Ereignisse ---------- */
V.addEventListener('click', async (e) => {
  const tg = e.target.closest('[data-wktag]'); if (tg) { e.stopPropagation(); const t = tg.dataset.wktag; if (!TAGS.some((x) => x.toLowerCase() === t.toLowerCase())) { TAGS.push(t); LS.set('tags', TAGS); } EID = null; laden(); return; }
  const tw = e.target.closest('[data-wktagweg]'); if (tw) { TAGS = TAGS.filter((x) => x !== tw.dataset.wktagweg); LS.set('tags', TAGS); laden(); return; }
  const td = e.target.closest('[data-wktagdazu]');
  if (td) {   // alle Tags mit Anzahl, meistbenutzte zuerst
    pickMenu(td, { items: (L.tags || []).filter((x) => x.n && !TAGS.includes(x.tag)).map((x) => ({ value: x.tag, title: `${x.tag}  ·  ${x.n}` })), onPick: (t) => { TAGS.push(t); LS.set('tags', TAGS); EID = null; laden(); } });
    return;
  }
  const r = e.target.closest('[data-wke]');
  if (r && !e.target.closest('.car')) { EID = +r.dataset.wke; LS.set('eid', EID); HOFFEN = HANDY.matches; try { E = await api('api/eintraege/' + EID); } catch (er) { toast(er.message, true); return; }
    if (HANDY.matches) { zeichne(); return; } V.querySelectorAll('tr.on').forEach((x) => x.classList.remove('on')); r.classList.add('on'); leiste(); rechtsNeu(); }
});
/* Einträge auf ein Kapitel ziehen: der neue erste Tag ordnet ein */
V.addEventListener('dragstart', (e) => { const r = e.target.closest && e.target.closest('tr[data-wke]'); if (!r) return; e.dataTransfer.setData('text/wk', r.dataset.wke); e.dataTransfer.effectAllowed = 'move'; });
V.addEventListener('dragover', (e) => { const k = e.target.closest && e.target.closest('tr.k'); if (k && [...e.dataTransfer.types].includes('text/wk')) { e.preventDefault(); V.querySelectorAll('tr.k.ziel').forEach((x) => x !== k && x.classList.remove('ziel')); k.classList.add('ziel'); } });
V.addEventListener('drop', async (e) => {
  const k = e.target.closest && e.target.closest('tr.k'), id = +e.dataTransfer.getData('text/wk'); V.querySelectorAll('tr.k.ziel').forEach((x) => x.classList.remove('ziel'));
  if (!k || !id) return; e.preventDefault();
  const kap = k.dataset.wkkap, x = L.eintraege.find((y) => y.id === id); if (!x || x.kapitel === kap) return;
  if (!E || E.id !== id) { EID = id; E = await api('api/eintraege/' + id); }
  await speichern({ tags: [kap, ...E.tags.filter((t) => t.toLowerCase() !== kap.toLowerCase() && t !== x.kapitel)] }, `nach „${kap}“ verschoben`);
});

/* Projekte ändern: dieselbe Liste wie beim Festhalten (Baustein bp/wiki.js) */
document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('[data-wkprj]') || !E) return;
  let PW = null;
  modalBox(`<h3>Projekte zu „${esc(E.titel)}“</h3><div data-wkpw></div><div class="btns"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn pri" data-m="ok">OK</button></div>`,
    (m, bg, close) => { if (m === 'abbrechen') { close(); return; } if (m === 'ok') { close(); speichern({ projekte: PW.werte() }, 'Projekte geändert'); } });
  const P0 = BPHead.projekt && BPHead.projekt.id ? { id: BPHead.projekt.id, name: BPHead.projekt.name } : null;
  PW = bpWiki.projektWahl([...document.querySelectorAll('.modal-bg')].pop().querySelector('[data-wkpw]'), E.projekte, P0);
});
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-wkzur]')) { HOFFEN = false; zeichne(); } });
document.addEventListener('change', (e) => {
  const f = e.target.closest && e.target.closest('.wk-a [data-wkf]');
  if (f && E) { const k = f.dataset.wkf; if ((E[k] || '') === f.value) return; speichern({ [k]: f.value }, { titel: 'Titel geändert', text: 'Text geändert' }[k], true); return; }
  if (e.target.matches && e.target.matches('.wk-a [data-wkfile]')) { hochladen([...e.target.files]); e.target.value = ''; }
});
document.addEventListener('click', async (e) => {
  const w = e.target.closest && e.target.closest('.wk-a [data-wkdweg]'); if (!w || !E) return;
  const did = +w.dataset.wkdweg, eid = E.id;
  try { await api('api/datei/' + did, 'DELETE'); await laden(eid);
    rueckgaengig('Datei entfernt', async () => { await api(`api/datei/${did}/zurueck`, 'POST'); await laden(eid); }); } catch (er) { toast(er.message, true); }
});
const b64 = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f); });
async function hochladen(fs) {
  if (!E) return; const eid = E.id; let n = 0;
  for (const f of fs) {
    if (f.size > 40 * 1048576) { toast(`„${f.name}“ ist zu groß (höchstens 40 MB).`, true); continue; }
    try { await api(`api/eintraege/${eid}/datei`, 'POST', { name: f.name, mime: f.type, datei: await b64(f) }); n++; } catch (er) { toast(er.message, true); }
  }
  if (!n) return;
  toast(n === 1 ? 'Datei abgelegt.' : n + ' Dateien abgelegt.');
  const T = [...E.tags], Pj = [...E.projekte];   // nach der Texterkennung: Tags und Projekte aus dem Dokument dazu
  for (const f of fs) { const v = await bpWiki.lesen(f); (v.tags || []).forEach((t) => { if (!T.some((x) => x.toLowerCase() === t.toLowerCase())) T.push(t); });
    (v.projekte || []).forEach((p) => { if (!Pj.some((x) => (x.id && x.id === p.id) || x.name.toLowerCase() === p.name.toLowerCase())) Pj.push(p); }); }
  if (E && E.id === eid && (T.length > E.tags.length || Pj.length > E.projekte.length)) await speichern({ tags: T, projekte: Pj }, 'Tags und Projekte aus dem Dokument');
  await laden(eid);
}
document.addEventListener('dragover', (e) => { const z = e.target.closest && e.target.closest('.wk-a [data-wkdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.add('an'); });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-wkdrop]'); if (z) z.classList.remove('an'); });
document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('.wk-a [data-wkdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('an'); hochladen([...e.dataTransfer.files]); });

function neuDialog() { BPHead.wiki('festhalten', { quelle: 'Wiki' }); }
document.addEventListener('bp-wiki', (e) => laden(e.detail.id));   // festgehalten (Befehlsleiste oder „?“ → „Erkenntnis fürs Wiki“)
async function eintragLoeschen() {
  if (!E || !(await bpFrage(`„${E.titel}“ löschen?`, { ok: 'Löschen' }))) return;
  const eid = E.id;
  try { await api('api/eintraege/' + eid, 'DELETE'); rueckgaengig('Eintrag gelöscht', async () => { await api(`api/eintraege/${eid}/zurueck`, 'POST'); await laden(eid); });
    EID = null; HOFFEN = false; await laden(); } catch (er) { toast(er.message, true); }
}

(async () => {
  const ME = await api('api/me'); applyLook(ME);
  const PC = await api('api/platform');
  await header('Wiki', ME, PC);
  bpNav.breite(NAV, { key: 'wiki' });
  BPHead.appEinstellungen([{ key: 'sammeln', label: 'Erkenntnisse sammeln', render: (h) => sammelnEinst(h) }]);   // Verwaltung → Einstellungen → Wiki (wiki-pruefung.js)
  const h = (location.hash.match(/^#e(\d+)$/) || [])[1];
  if (h) HOFFEN = HANDY.matches;
  await laden(h ? +h : null);
  BPHead.live(['wiki_eintrag', 'wiki_datei'], async () => { const a = document.activeElement; if (a && a.closest && a.closest('[data-wkf]')) return; await laden(); BPHead.liveNotiz(); }, { projekt: false });
})().catch((e) => { V.innerHTML = `<div class="leer">${esc(e.message)}</div>`; });
