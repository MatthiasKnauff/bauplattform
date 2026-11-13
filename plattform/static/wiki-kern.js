'use strict';
/* Wiki – Seite der App (besprochen am 13.11.2026, Mock „Wiki – Entwurf“). Links Kapitel und Einträge (bpNav, mit Suche und Status),
   oben die Befehlsleiste, in der Mitte der Eintrag (sofort gespeichert, Rückgängig-Dock), rechts Prüfung und Woche (wiki-pruefung.js).
   Server: plattform/wiki.py, Regeln bpcore/wiki.py. Festhalten aus anderen Apps: Baustein bp/wiki.js. */
let L = null, E = null, EID = null, Q = '', ST = '';
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work');
const STN = { neu: 'neu gesammelt', zusammengefasst: 'zusammengefasst – Prüfung offen', geprueft: 'fachlich geprüft' };
const FARBE = { neu: 'var(--mute)', zusammengefasst: 'var(--c-o)', geprueft: 'var(--c-g)' };
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', seite: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>', ki: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  pdf: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 15h6M12 12v6"/>', weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', woche: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>' };
const deD = (t) => (t && t.length >= 10 ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
const LS = { get(k) { try { return JSON.parse(localStorage.getItem('wk.' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('wk.' + k, JSON.stringify(v)); } catch { /* egal */ } } };

async function laden(eid) {
  L = await api('api/eintraege?q=' + encodeURIComponent(Q) + '&status=' + ST);
  if (eid) EID = eid;
  if (!L.eintraege.some((x) => x.id === EID)) EID = (L.eintraege.find((x) => x.id === LS.get('eid')) || L.eintraege[0] || {}).id || null;
  if (EID) LS.set('eid', EID);
  try { E = EID ? await api('api/eintraege/' + EID) : null; } catch { E = null; }
  zeichne();
}

/* Speichern: Server antwortet mit dem Eintrag und „vorher“ – Rückgängig schickt die alten Werte zurück */
async function speichern(body, text, still) {
  if (!E) return null;
  const eid = E.id;
  try {
    const r = await api('api/eintraege/' + eid, 'PUT', body), vorher = r.vorher; delete r.vorher;
    E = r; const z = L.eintraege.find((x) => x.id === eid); if (z) Object.assign(z, { titel: r.titel, kapitel: r.kapitel, status: r.status });
    if (body.status) await laden(eid);   // Zahlen links (zu prüfen …) neu
    else if (still) { nav(); if (window.rechtsNeu) rechtsNeu(); } else zeichne();
    if (text && vorher) rueckgaengig(text, async () => {   // die alten Werte zurück (Tags stecken in Kapitel und Stichworten, Projekte als Liste)
      const zr = {}; Object.keys(body).forEach((k) => { if (k === 'tags') Object.assign(zr, { kapitel: vorher.kapitel, stichworte: vorher.stichworte }); else if (k === 'projekte') zr.projekte = JSON.parse(vorher.projekte || '[]'); else zr[k] = vorher[k]; });
      await api('api/eintraege/' + eid, 'PUT', zr); await laden(eid); });
    return r;
  } catch (e) { toast(e.message, true); return null; }
}

function nav() {
  const G = {};
  for (const x of L.eintraege) (G[x.kapitel || 'Ohne Kapitel'] = G[x.kapitel || 'Ohne Kapitel'] || []).push(x);
  const rang = (k) => G[k].length;   // Tags mit den meisten Einträgen zuerst, „Wochen“ am Ende
  const reihe = Object.keys(G).sort((a, b) => (a === 'Wochen') - (b === 'Wochen') || rang(b) - rang(a) || a.localeCompare(b, 'de'));
  const z = L.zahl || {};
  bpNav(NAV, { kopf: { titel: 'Wiki', klein: `${L.eintraege.length} Einträge${z.zusammengefasst ? ' · ' + z.zusammengefasst + ' zu prüfen' : ''}` }, attr: 'wk', lage: true,
    davor: `<div class="wk-such"><input type="search" id="wkQ" placeholder="Suchen: Text, Stichwort, Projekt …" value="${esc(Q)}">
      <div class="wk-seg">${[['', 'Alle'], ['neu', 'Neu' + (z.neu ? ' · ' + z.neu : '')], ['zusammengefasst', 'Zu prüfen' + (z.zusammengefasst ? ' · ' + z.zusammengefasst : '')], ['geprueft', 'Geprüft']].map(([k, t]) => `<button type="button" data-wkst="${k}" class="${ST === k ? 'on' : ''}">${t}</button>`).join('')}</div></div>`,
    gruppen: reihe.map((k) => ({ titel: k, klapp: 'wk:' + k, punkte: G[k].map((x) => ({ id: 'e:' + x.id, text: x.titel || '(ohne Titel)', icon: IC.seite, farbe: FARBE[x.status],
      zahl: x.dateien ? '📎' + x.dateien : '', zahlTip: STN[x.status] })) })),
    aktiv: EID ? 'e:' + EID : '', fuss: L.eintraege.length ? '' : `<p class="mute" style="padding:.6rem;font-size:.85rem">${Q || ST ? 'Nichts gefunden.' : 'Noch leer – „＋ Erkenntnis“ oben, oder in jeder App über „?“ → „Erkenntnis fürs Wiki“.'}</p>`,
    wahl: (id) => { if (id.startsWith('e:')) laden(+id.slice(2)); } });
  const q = NAV.querySelector('#wkQ');
  if (q && !q.dataset.an) { q.dataset.an = 1; let t = 0; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { Q = q.value.trim(); laden(); }, 300); }); }
}

function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  befehle(LEISTE, [
    { titel: 'Neu', knoepfe: [K('Erkenntnis', IC.neu, neuDialog, { tip: 'Neue Erkenntnis festhalten (geht auch in jeder App: „?“ → „Erkenntnis fürs Wiki“)' })] },
    { titel: 'KI', knoepfe: [K(L.woche ? `Woche · ${L.woche}` : 'Woche zusammenfassen', IC.woche, () => wocheZeigen(), { tip: L.woche ? 'Vorschlag der Zusammenfassung ansehen und übernehmen' : 'Neue Erkenntnisse von der KI zuordnen und zusammenführen lassen (Vorschlag)' }),
      K('Lektorat', IC.ki, () => lektorat(), { aus: !E, tip: 'Die KI schlägt einen besseren Text vor – übernommen wird nur auf Klick' })] },
    { titel: 'Ausgabe', knoepfe: [K('PDF', IC.pdf, () => window.open('api/pdf', '_blank'), { tip: 'Das ganze Wiki als PDF – die Dienste legen es jede Woche auch in „Pläne & Dateien“ → „Büro“ → „Wiki“ ab' })] },
    { titel: 'Bearbeiten', rechts: true, knoepfe: [K('Löschen', IC.weg, eintragLoeschen, { aus: !E, rot: true })] },
  ]);
}

function dateienHtml() {
  const d = E.dateien || [];
  return `<div class="wk-df">${d.map((f) => `<div class="wk-d"><a href="api/datei/${f.id}" target="_blank" rel="noopener" title="${esc(f.name)} – von der Freigabe „Bauportal“">${f.bild ? `<img src="api/datei/${f.id}/bild" alt="" loading="lazy">` : '<span class="sy">📄</span>'}<span>${esc(f.name)}</span></a><button type="button" data-wkdweg="${f.id}" title="Aus dem Eintrag entfernen (die Datei bleibt auf der Freigabe)" aria-label="entfernen">✕</button></div>`).join('')}</div>
    <div class="wk-drop" data-wkdrop>Fotos, PDFs hierher ziehen oder <label>auswählen<input type="file" multiple hidden data-wkfile></label> – sie liegen auf „Bauportal/02 Wiki/${esc(E.kapitel || 'Sonstiges')}“, hier nur ein Vorschaubild.</div>`;
}

function zeichne() {
  nav(); leiste();
  if (!E) { V.innerHTML = `<div class="leer">${L.eintraege.length ? 'Links einen Eintrag wählen.' : 'Noch keine Einträge. „＋ Erkenntnis“ oben – oder in jeder App über „?“ → „Erkenntnis fürs Wiki“.'}</div>`; rechts(); return; }
  const pos = V.scrollTop;
  V.innerHTML = `<div class="wk-a">
    <input class="ti" data-wkf="titel" value="${esc(E.titel)}" aria-label="Titel" placeholder="Titel">
    <div class="wk-meta"><span class="wk-st ${E.status}"><i></i>${STN[E.status]}</span>
      <span>Projekte: ${E.projekte.length ? esc(E.projekte.map((x) => x.name).join(', ')) : '–'} <button type="button" class="wk-l" data-wkprj>ändern</button></span>${E.quelle ? `<span>aus: ${esc(E.quelle)}</span>` : ''}
      <span>${esc(E.autor_name || '')} · ${deD(E.created)}${E.updated && E.updated.slice(0, 10) !== (E.created || '').slice(0, 10) ? ' · geändert ' + deD(E.updated) : ''}</span></div>
    <textarea data-wkf="text" aria-label="Text" spellcheck="true">${esc(E.text)}</textarea>
    <div class="wk-sw">Tags <small>– meistbenutzte zuerst; der erste ordnet links ein</small></div><div id="wkTags"></div>
    ${dateienHtml()}
    ${E.status === 'geprueft' ? '<p class="wk-hin">Geprüft – wer Titel oder Text ändert, gibt den Eintrag wieder zur Prüfung.</p>' : ''}
    <div id="wkUnten"></div></div>`;
  V.scrollTop = pos;
  bpWiki.tagKnoepfe($('#wkTags'), E.tags, L.tags || [], (T) => speichern({ tags: T }, 'Tags geändert', true));   // Baustein bp/wiki.js
  rechts();
}
/* Projekte ändern: dieselbe Liste wie beim Festhalten (Baustein bp/wiki.js) */
V.addEventListener('click', (e) => {
  if (!e.target.closest('[data-wkprj]') || !E) return;
  let PW = null;
  modalBox(`<h3>Projekte zu „${esc(E.titel)}“</h3><div data-wkpw></div><div class="btns"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn pri" data-m="ok">OK</button></div>`,
    (m, bg, close) => { if (m === 'abbrechen') { close(); return; } if (m === 'ok') { close(); speichern({ projekte: PW.werte() }, 'Projekte geändert'); } });
  const P0 = BPHead.projekt && BPHead.projekt.id ? { id: BPHead.projekt.id, name: BPHead.projekt.name } : null;
  PW = bpWiki.projektWahl([...document.querySelectorAll('.modal-bg')].pop().querySelector('[data-wkpw]'), E.projekte, P0);
});

/* ---------- Ereignisse ---------- */
V.addEventListener('change', (e) => {
  const f = e.target.closest('[data-wkf]'); if (!f || !E) return;
  const k = f.dataset.wkf; if ((E[k] || '') === f.value) return;
  speichern({ [k]: f.value }, { titel: 'Titel geändert', text: 'Text geändert' }[k], k === 'text');
});
NAV.addEventListener('click', (e) => { const b = e.target.closest('[data-wkst]'); if (!b) return; ST = b.dataset.wkst; laden(); });
V.addEventListener('click', async (e) => {
  const w = e.target.closest('[data-wkdweg]'); if (!w || !E) return;
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
V.addEventListener('dragover', (e) => { const z = e.target.closest('[data-wkdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.add('an'); });
V.addEventListener('dragleave', (e) => { const z = e.target.closest('[data-wkdrop]'); if (z) z.classList.remove('an'); });
V.addEventListener('drop', (e) => { const z = e.target.closest('[data-wkdrop]'); if (!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('an'); hochladen([...e.dataTransfer.files]); });
V.addEventListener('change', (e) => { if (e.target.matches('[data-wkfile]')) { hochladen([...e.target.files]); e.target.value = ''; } });

function neuDialog() { BPHead.wiki('festhalten', { quelle: 'Wiki' }); }
document.addEventListener('bp-wiki', (e) => laden(e.detail.id));   // festgehalten (Befehlsleiste oder „?“ → „Erkenntnis fürs Wiki“)
async function eintragLoeschen() {
  if (!E || !(await bpFrage(`„${E.titel}“ löschen?`, { ok: 'Löschen' }))) return;
  const eid = E.id;
  try { await api('api/eintraege/' + eid, 'DELETE'); rueckgaengig('Eintrag gelöscht', async () => { await api(`api/eintraege/${eid}/zurueck`, 'POST'); await laden(eid); });
    EID = null; await laden(); } catch (er) { toast(er.message, true); }
}

(async () => {
  const ME = await api('api/me'); applyLook(ME);
  const PC = await api('api/platform');
  await header('Wiki', ME, PC);
  bpNav.breite(NAV, { key: 'wiki' });
  BPHead.appEinstellungen([{ key: 'sammeln', label: 'Erkenntnisse sammeln', render: (h) => sammelnEinst(h) }]);   // Verwaltung → Einstellungen → Wiki (wiki-pruefung.js)
  const h = (location.hash.match(/^#e(\d+)$/) || [])[1];
  await laden(h ? +h : null);
  BPHead.live(['wiki_eintrag', 'wiki_datei'], async () => { const a = document.activeElement; if (a && a.closest && a.closest('#view [data-wkf]')) return; await laden(); BPHead.liveNotiz(); }, { projekt: false });
})().catch((e) => { V.innerHTML = `<div class="leer">${esc(e.message)}</div>`; });
