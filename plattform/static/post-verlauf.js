/* =====================================================================
   Post & Vorgänge – „Verlauf“: was mit wem hin- und herging, je Projekt oder je Kontakt (Sendungen, Antworten aus dem Posteingang,
   festgehaltene Vorgänge, Abnahmen). Bis 24.11.2026 die eigene App „Kommunikation“; jetzt ein Teil der Seite aufgaben.html.
     PV.zeigen(el)      Verlauf in el aufbauen und laden (Navigation links zeichnet die Seite über apNav() mit PV.nav())
     PV.weg()           Verlauf verlassen (andere Ansicht der Seite)
     PV.nav()           { aktiv, arten, mitwem, filter, wahl } für bpAufPost
     PV.ausHash()       #art= · #v= · #kontakt= · #post → true (gehört zum Verlauf), öffnet Abnahme bzw. Kontakt
     PV.projekt / PV.laden / PV.beteiligte – gemeinsame Namen mit kom-abnahme.js
   Server: plattform/aufgaben_post.py (Routen /api/kom …, /api/vorgang …), Abnahme kom_abnahme.py.
   ===================================================================== */
(() => {
'use strict';
const LS = bpLS('kom.');
const F = { alle: LS.get('alle', false), arten: new Set(LS.get('arten', [])), q: '', ich: LS.get('ich', false) };
let K = null;          // gewählter Kontakt {contact_id|email, name, …} – dann alles mit ihm, über alle Projekte
let KP = null;         // im Kontakt: auf ein Projekt eingeschränkt
let D = null, N = 300, tok = 0, ANT = {}, HOST = null;   // HOST: Bereich, in dem der Verlauf gerade steht (sonst null)   // ANT: Antworten aus dem Posteingang je Sendung
const IC = { planversand: '📐', plotauftrag: '🖨', maengelruege: '⚠️', terminruege: '⏱', lvversand: '📋', angebotsbesprechung: '🤝', bauvertrag: '📜', auftragsschreiben: '📄', brief: '✉️', nachricht: '✉️', vorgang: '📝' };
const projekt = () => (window.BPHead && BPHead.projekt) || null;
const ME = () => (window.BPHead && BPHead.me) || {};
const $p = (s) => HOST && HOST.querySelector(s);
const dt = (t) => { const d = new Date(t); return isNaN(d) ? t : d; };
const uhr = (t) => { const d = dt(t); return d instanceof Date ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''; };
const tagName = (t) => {
  const d = dt(t); if (!(d instanceof Date)) return t; const h = new Date(); const g = new Date(h - 864e5);
  if (d.toDateString() === h.toDateString()) return 'Heute'; if (d.toDateString() === g.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const kurzDatum = (t) => { const d = dt(t); return d instanceof Date ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''; };

function params(ohne = {}) {
  const p = new URLSearchParams();
  if (K) { if (K.contact_id) p.set('cid', K.contact_id); else p.set('email', K.email); if (KP) p.set('pid', KP); }
  else if (!F.alle && projekt()) p.set('pid', projekt().id);
  if (F.arten.size) p.set('art', [...F.arten].join(','));
  if (F.q) p.set('q', F.q);
  if (F.ich) p.set('ich', '1');
  if (!ohne.n) p.set('n', N);
  return p.toString();
}
async function laden() {
  if (!HOST) return;
  const my = ++tok;
  try {
    const vp = !K && (F.alle || projekt()) && (!F.arten.size || F.arten.has('vorgang')) && !F.ich ? api('api/vorgaenge' + (F.alle ? '' : '?pid=' + projekt().id)).catch(() => []) : Promise.resolve([]);
    const [r, v, an] = await Promise.all([api('api/kom?' + params()), vp, api('api/antworten?' + params()).catch(() => ({ antworten: [] }))]); if (my !== tok) return; D = r;
    ANT = {}; (an.antworten || []).forEach((a) => { (ANT[a.bid] = ANT[a.bid] || []).push(a); });
    const q = (F.q || '').toLowerCase();
    VG = (v || []).filter((x) => !x.gesendet && (!q || [x.titel, x.text, x.beteiligte, x.art_name].join(' ').toLowerCase().includes(q)));
    zeichnen();
  }
  catch (e) { if (my === tok && HOST) $p('#pvList').innerHTML = `<div class="leer">${esc(e.message)}</div>`; }
}
const ENTW = new Set();   // markierte Entwürfe (zum Löschen)
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.ent) { const id = +t.dataset.ent; if (t.checked) ENTW.add(id); else ENTW.delete(id); zeichnen(); return; }
  if (t.dataset && t.dataset.entalle !== undefined) { ENTW.clear(); if (t.checked) VG.filter((v) => v.art === 'abnahme' && v.status === 'entwurf').forEach((v) => ENTW.add(v.id)); zeichnen(); }
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !e.target.closest('[data-entweg]')) return;
  const ids = [...ENTW]; if (!ids.length || !(await bpFrage(`${ids.length} Entw${ids.length === 1 ? 'urf' : 'ürfe'} löschen?\nSie liegen danach im Papierkorb.`, { ok: 'Löschen', gefahr: true }))) return;
  const pk = [];
  for (const id of ids) { try { const r = await api('api/abnahme/' + id, 'DELETE'); if (r.papierkorb) pk.push(r.papierkorb); } catch (er) { toast(er.message, true); } }
  ENTW.clear(); await laden();
  if (pk.length) rueckgaengig(`${pk.length} Entw${pk.length === 1 ? 'urf' : 'ürfe'} gelöscht`, async () => { for (const p of pk) await api(`api/bp/papierkorb/${p}/zurueck`, 'POST').catch(() => {}); await laden(); });
});
const QIN = document.createElement('input');   // Suchfeld oben im Verlauf – dasselbe Feld bei jedem Aufbau (Fokus, Text bleiben)
Object.assign(QIN, { type: 'search', placeholder: 'Suchen – Betreff, Firma, Plan …', autocomplete: 'off' }); QIN.setAttribute('aria-label', 'Verlauf durchsuchen');
function zeichnen() {
  if (!HOST || !D) return;
  const p = projekt();
  $p('#pvScope').style.display = K ? 'none' : '';
  $p('#pvScope').innerHTML = `<button type="button" data-sc="p" class="${!F.alle ? 'on' : ''}" title="${esc(p ? p.name : '')}">${p ? esc(p.name) : 'Projekt oben wählen'}</button><button type="button" data-sc="a" class="${F.alle ? 'on' : ''}">Alle Projekte</button>`;
  $p('#pvIch').checked = F.ich;
  if (window.apNav) apNav();   // Navigation links (Post & Vorgänge zeichnet sie – mit PV.nav())
  $p('#pvSide').hidden = !K; $p('#pvSide').parentElement.classList.toggle('ohne', !K);   // ohne Kontakt stehen „Mit wem“ links in der Navigation
  $p('#pvKbox').innerHTML = K ? `<div class="kb"><span style="font-size:1.4rem">👤</span><span><b>${esc(K.name)}</b><br><span class="mute">${esc([K.ansprech, K.gewerk, K.email].filter(Boolean).join(' · '))}</span></span>
    <span class="mute">${D.gesamt} Sendung${D.gesamt === 1 ? '' : 'en'}${KP ? ' in diesem Projekt' : ' in allen Projekten'}</span><button type="button" class="btn sm x zur" data-kx title="Zurück zur Übersicht aller Sendungen">← Zurück zur Übersicht</button></div>` : '';
  // links: mit wem (Projekt/alle) bzw. in welchen Projekten (Kontakt)
  const side = $p('#pvSide');
  if (K) {
    const L = D.projekte || [], ges = L.reduce((s, x) => s + x.n, 0);
    side.innerHTML = `<h3>Projekte</h3><button type="button" class="si${!KP ? ' on' : ''}" data-kp=""><span><b>Alle Projekte</b></span><i>${ges}</i></button>`
      + L.map((x) => `<button type="button" class="si${KP === x.project_id ? ' on' : ''}" data-kp="${x.project_id || ''}"${x.project_id ? '' : ' disabled'}><span><b>${esc(x.name)}</b><small>zuletzt ${kurzDatum(x.letzte)}</small></span><i>${x.n}</i></button>`).join('');
  } else {
    const L = D.kontakte || [];
    side.innerHTML = `<h3>Mit wem${F.alle ? '' : ' in diesem Projekt'}</h3>` + (L.length ? L.map((x, k) => `<button type="button" class="si" data-ki="${k}"><span><b>${esc(x.name)}</b><small>${esc([x.gewerk, x.ansprech].filter(Boolean).join(' · ') || x.email || '')} · zuletzt ${kurzDatum(x.letzte)}</small></span><i>${x.n}</i></button>`).join('')
      : '<p class="mute" style="padding:0 .9rem;font-size:.88rem">Noch niemand.</p>');
  }
  // rechts: Protokoll nach Tagen
  const E = [...(D.eintraege || []), ...VG.map((v) => ({ ...v, ts: v.zeit, _vg: 1 }))].sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  if (!E.length) {
    $p('#pvList').innerHTML = `<div class="leer">${F.q || F.arten.size || F.ich ? 'Nichts gefunden – Filter oder Suche ändern.' : K ? `An ${esc(K.name)} wurde noch nichts verschickt.` : !F.alle && p ? `In ${esc(p.name)} wurde noch nichts verschickt.<br><small>Hier erscheinen Planversand, Mängel- und Terminrügen – sobald sie aus den Apps verschickt werden.</small>` : 'Noch nichts verschickt.'}</div>`;
    return;
  }
  const EN = E.filter((x) => x._vg && x.art === 'abnahme' && x.status === 'entwurf'); [...ENTW].forEach((id) => { if (!EN.some((x) => x.id === id)) ENTW.delete(id); });
  let h = EN.length ? `<div class="ent-bar"><label class="ck"><input type="checkbox" data-entalle${ENTW.size === EN.length ? ' checked' : ''}> alle ${EN.length} Entwürfe markieren</label>
    ${ENTW.size ? `<span class="mute">${ENTW.size} markiert</span><button type="button" class="btn sm" data-entweg>🗑 Markierte löschen</button>` : '<span class="mute">einzeln über das Kästchen am Entwurf</span>'}</div>` : '', tag = '';
  for (const x of E) {
    const t = tagName(x.ts); if (t !== tag) { tag = t; h += `<div class="tag">${esc(t)}</div>`; }
    if (x._vg) { h += vgEintrag(x); continue; }
    const wer = x.kontakt || x.name || x.email, cls = x.art === 'maengelruege' ? ' mr' : x.art === 'terminruege' ? ' tr' : '';
    h += `<details class="e${x.status === 'fehler' ? ' f' : ''}"><summary><span class="ic">${IC[x.art] || '✉️'}</span>
      <span class="h"><span class="art${cls}">${esc(x.art_name)}</span><b>${esc(wer)}</b>${x.betreff ? ' – ' + esc(x.betreff) : ''}</span>
      <span class="z">${uhr(x.ts)}</span>
      <span class="s">${esc([K || !F.alle ? '' : x.projekt, x.weg_name, x.von ? 'von ' + x.von : '', x.email && x.email !== wer ? x.email : ''].filter(Boolean).join(' · '))}${x.status === 'fehler' ? ' · <b style="color:var(--red)">nicht zugestellt</b>' : ''}</span></summary>
      <div class="d">${x.ansprech || x.gewerk ? `<div class="mute">${esc([x.ansprech, x.gewerk].filter(Boolean).join(' · '))}</div>` : ''}${x.inhalt ? `<pre>${esc(x.inhalt)}</pre>` : ''}${x.fehler ? `<div class="mute">Fehler: ${esc(x.fehler)}</div>` : ''}
        <div class="mute">${esc(new Date(x.ts).toLocaleString('de-DE'))}${x.projekt ? ' · ' + esc(x.projekt) : ''}</div>
        ${(x.dateien || []).length || x.eingabe ? `<div class="pv-dat">${(x.dateien || []).map((d) => `<button type="button" class="btn sm" data-pvdat="${d.id}" data-n="${esc(d.name)}" data-m="${esc(d.mime)}">📄 ${esc(d.name)}</button>`).join('')}${x.eingabe ? `<button type="button" class="btn sm" data-pvpdf="${x.id}" title="Das verschickte Schreiben ansehen">📄 PDF</button><button type="button" class="btn sm" data-pvneu="${x.id}" title="Denselben Brief als neuen Entwurf öffnen – ändern und erneut senden">✎ Erneut bearbeiten …</button>` : ''}</div>` : ''}
        ${quelle(x) ? `<a href="${esc(quelle(x))}" data-qp="${x.project_id || ''}">↗ ${x.art === 'planversand' || x.art === 'plotauftrag' ? 'Planversandliste' : x.art.endsWith('ruege') ? 'Mängel' : String(x.link || '').startsWith('ava:') ? 'In der Ausschreibung' : 'Quelle'} öffnen</a>` : ''}
        ${x.contact_id && !K ? ` · <a href="#" data-kc="${x.contact_id}">alles mit ${esc(x.kontakt)}</a>` : ''}
        ${ME().is_admin || x.von === ME().full ? ` · <a href="#" class="kweg" data-kweg="${x.id}" title="Aus dem Protokoll löschen (z. B. Testversand) – liegt danach im Papierkorb, steht im Protokoll">Löschen</a>` : ''}</div></details>`;
    for (const a of (ANT[x.id] || []).sort((p, q) => String(p.zeit).localeCompare(String(q.zeit)))) {
      h += `<details class="e ant"><summary><span class="ic">↩</span><span class="h"><span class="art an">Antwort</span><b>${esc(a.von_name || a.von)}</b> – ${esc(a.betreff)}</span><span class="z">${uhr(a.zeit)}</span>
        <span class="s">${esc(a.vorschau.slice(0, 140))}${a.anhaenge && a.anhaenge.length ? ` · 📎 ${a.anhaenge.length}` : ''}</span></summary>
        <div class="d"><pre>${esc(a.vorschau)}</pre>${a.anhaenge && a.anhaenge.length ? `<div class="mute">📎 ${esc(a.anhaenge.join(', '))}</div>` : ''}
          <div class="mute">${esc(new Date(a.zeit).toLocaleString('de-DE'))} · ${esc(a.von)}</div>${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">↗ Im Postfach öffnen</a>` : ''}</div></details>`;
    }
  }
  if (D.gesamt > (D.eintraege || []).length) h += `<button type="button" class="btn sm mehr" data-mehr>+ ältere anzeigen (${D.gesamt - (D.eintraege || []).length} weitere)</button>`;
  $p('#pvList').innerHTML = h;
}

/* ---------- Vorlagen für Nachrichten (fürs ganze Büro): {firma} {projekt} {frist} {ich} ---------- */
/* Einsetzen und Speichern macht der gemeinsame Versand-Dialog (bp/versand.js); hier bleibt das Verwalten (umbenennen, löschen) */
let VL = null;
async function vorlagen() { VL = (await api('api/bp/textvorlagen')).vorlagen || []; return VL; }
function vlVerwalten() {
  vorlagen().then((L) => {
    const zeile = (v, i) => `<div class="vl-z"><input data-vln="${i}" value="${esc(v.name)}" maxlength="80"><button type="button" class="ib" data-vlx="${i}" title="Löschen">✕</button></div>`;
    modalBox(`<h3>Vorlagen</h3><p class="hint" style="margin-top:0">Für alle im Büro. Platzhalter im Text: {firma} {projekt} {frist} {ich}.</p><div class="vl-l">${L.map(zeile).join('')}</div>
      <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, async (m, bg, close) => {
      if (m === 'x') { close(); return; } if (m !== 'ok') return;
      const neu = []; bg.querySelectorAll('[data-vln]').forEach((i) => { const v = L[+i.dataset.vln]; if (v && !i.closest('.vl-z').hidden) neu.push({ ...v, name: i.value.trim() || v.name }); });
      try { VL = (await api('api/bp/textvorlagen', 'PUT', { vorlagen: neu })).vorlagen; close(); toast('Vorlagen gespeichert.'); } catch (er) { toast(er.message, true); } });
    document.querySelectorAll('[data-vlx]').forEach((x) => { x.onclick = () => { x.closest('.vl-z').hidden = true; }; });
  });
}
/* ---------- Neue Nachricht und Vorgang dokumentieren (Desktop: Fenster mit zwei Spalten, Handy: Vollbild über ＋ unten rechts) ---------- */
let VA = null, BET = { pid: null, L: [] }, VG = [];   // VA: Arten der Vorgänge · BET: Beteiligte des Projekts · VG: Vorgänge (nur festgehaltene) im Protokoll
const KURZ = (n) => (((n || '').split(' ')[0] || '').match(/^[A-Za-z]{1,4}\d{2,6}$/) || [''])[0];
async function beteiligte(pid) { if (BET.pid !== pid) { BET = { pid, L: await api('api/beteiligte?pid=' + pid).catch(() => []) }; } return BET.L; }
function verfassen(modus, mit) {   // mit: Übergabe aus der Leiste „＋ Neu“ (an, betreff, text, Dateien)
  const p = projekt(); if (!p) { toast('Bitte oben zuerst ein Projekt wählen.', true); if (window.BPHead && BPHead.projektWahl) BPHead.projektWahl({}); return; }
  mit = mit || {};
  if (modus === 'n' || modus === 'd') {   // Nachricht und Datei: der gemeinsame Versand-Dialog – gesendet und abgelegt vom Kern (/api/bp/versand)
    const k = KURZ(p.name);
    BPHead.unterlagenSenden({ titel: modus === 'd' ? 'Datei versenden' : 'Neue Nachricht', art: 'nachricht', pid: p.id, projekt: p.name, link: 'aufgaben:#post', neu: modus === 'd' ? 'datei' : 'nachricht', mit,
      an: Array.isArray(mit.an) ? mit.an.filter((x) => x && x.email) : [], dateien: Array.isArray(mit._dateien) ? mit._dateien : [], betreff: mit.betreff || '', text: mit.text || '', kopie: false,
      textHilfe: `Signatur wird angehängt.${k ? ` Vor dem Betreff steht [${esc(k)}] – so findet die Antwort zurück ins Projekt.` : ''}`, vorlagenVerwalten: vlVerwalten, danach: () => laden() });
    return;
  }
  const S = { an: Array.isArray(mit.an) ? mit.an.filter((x) => x && x.email) : [], dateien: Array.isArray(mit._dateien) ? mit._dateien : [], art: 'telefon', senden: false }; window.KVS = S;
  const jetzt = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), k = KURZ(p.name);
  const bg = modalBox(`<div class="kv-k"><b class="kv-t"></b><button type="button" class="ib kv-x" data-m="x" title="Schließen (Esc)">✕</button></div>
    <div class="kv-neu"></div>${window.BPHead && BPHead.neuMitHtml ? BPHead.neuMitHtml(mit) : ''}
    <div class="kv-b"><div class="kv-l">
      <div class="kv-v"><div class="kv-arten"></div>
        <label class="kv-lb">Wer war beteiligt / am Telefon<input id="kvWer" placeholder="z. B. Herr Wilhelmi, Elektro" autocomplete="off"></label>
        <div class="kv-2"><label class="kv-lb">Wann<input id="kvZeit" type="datetime-local" value="${jetzt}"></label><label class="kv-lb">Ort (optional)<input id="kvOrt" placeholder="z. B. 1. OG" autocomplete="off"></label></div>
        <label class="kv-lb">Kurz (Überschrift, optional)<input id="kvTitel" maxlength="200" autocomplete="off"></label></div>
      <div class="kv-an"><span class="kv-lb">An – Beteiligte von ${esc(p.name)}</span><div class="kv-chips"></div></div>
      <label class="kv-lb"><span class="kv-txtl">Was ist passiert?</span><textarea id="kvText" rows="8" placeholder="🎤 Diktieren geht über die Tastatur des Handys"></textarea></label>
      <div class="kv-v kv-2"><label class="kv-lb">Frist (optional – wird ein To-do mit Erinnerung)<input id="kvFrist" type="date"></label><span></span></div>
      <div class="kv-v"><span class="kv-seg kv-sd"><button type="button" data-kvs="0">nur festhalten</button><button type="button" data-kvs="1">als PDF an die Firma</button></span></div>
      <label class="kv-ck"><input type="checkbox" id="kvKopie"> Kopie an mich</label>
    </div><div class="kv-r"><span class="kv-lb">Fotos / Dateien <small>hierher ziehen oder</small></span>
      <div class="kv-dz"><div class="kv-fs"></div><label class="kv-add" title="Fotos aufnehmen oder Dateien wählen">📷 ＋<input type="file" id="kvDatei" multiple accept="image/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt" hidden></label></div>
      <p class="kv-hint"></p></div></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok"></button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') return close();
    if (m !== 'ok') return;
    const fd = new FormData(); fd.append('pid', p.id); S.dateien.forEach((f) => fd.append('dateien', f, f.name));
    const v = (id) => (bg.querySelector('#' + id) || {}).value || '';
    if (!v('kvText').trim() && !v('kvTitel').trim()) return toast('Bitte festhalten, was passiert ist.', true);
    if (S.senden && !S.an.length) return toast('Bitte einen Empfänger wählen – oder „nur festhalten“.', true);
    Object.entries({ art: S.art, titel: v('kvTitel'), text: v('kvText'), beteiligte: v('kvWer'), zeit: v('kvZeit'), ort: v('kvOrt'), frist: v('kvFrist'), senden: S.senden ? '1' : '', an: JSON.stringify(S.an), kopie: bg.querySelector('#kvKopie').checked ? '1' : '' }).forEach(([a, b]) => fd.append(a, b));
    btn.disabled = true; btn.textContent = 'Wird gesendet …';
    try {
      const r = await fetch('api/vorgang', { method: 'POST', body: fd, credentials: 'same-origin' }); const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) throw new Error(j.error || 'Fehler ' + r.status);
      close();
      toast(`${VA.find((x) => x.key === S.art).name} festgehalten${j.hinweis ? ' und ' + j.hinweis + ' geschickt' : ''}${j.todo ? ' · Frist als To-do' : ''}`);
      laden();
    } catch (er) { toast(er.message, true); btn.disabled = false; zeichne(); }
  });
  bg.querySelector('.modal').classList.add('kv');
  const $b = (s) => bg.querySelector(s);
  const zeichne = () => {
    $b('.kv-t').textContent = 'Vorgang dokumentieren';
    $b('.kv-neu').innerHTML = window.BPHead && BPHead.neuLeiste ? BPHead.neuLeiste('vorgang') : '';
    $b('.kv-an').hidden = !S.senden; $b('.kv-ck').hidden = !S.senden;
    $b('.kv-arten').innerHTML = (VA || []).map((a) => `<button type="button" data-kva="${a.key}" class="${S.art === a.key ? 'on' : ''}">${a.ic} ${esc(a.name)}</button>`).join('');
    bg.querySelectorAll('[data-kvs]').forEach((x) => x.classList.toggle('on', (x.dataset.kvs === '1') === S.senden));
    $b('[data-m="ok"]').textContent = S.senden ? 'Speichern & senden' : 'Festhalten';
    $b('.kv-chips').innerHTML = S.an.map((x, i) => `<span class="kv-chip" title="${esc(x.email)}">${esc(x.name || x.email)}<button type="button" data-kvweg="${i}" aria-label="entfernen">✕</button></span>`).join('')
      + `<button type="button" class="kv-plus" data-kvan>＋ Firma, Person</button><input class="kv-mail" data-enter placeholder="oder E-Mail eintippen, Enter" autocomplete="off" inputmode="email">`;
    $b('.kv-fs').innerHTML = S.dateien.map((f, i) => `<span class="kv-f" title="${esc(f.name)}">${f.type.startsWith('image/') ? `<img src="${f._url || (f._url = URL.createObjectURL(f))}" alt="">` : `<i>📄</i><small>${esc(f.name)}</small>`}<button type="button" data-kvfweg="${i}" aria-label="entfernen">✕</button></span>`).join('');
    const mb = S.dateien.reduce((a, f) => a + f.size, 0) / 1048576;
    $b('.kv-hint').textContent = (S.senden ? 'Das PDF des Vorgangs (auf dem Briefbogen, mit den Fotos) geht an die Firma.' : 'Steht danach im Protokoll des Projekts.') + (mb ? ` · ${mb.toFixed(1).replace('.', ',')} MB` : '');
  };
  const neuDatei = (fs) => { for (const f of fs) { if (S.dateien.length >= 12) { toast('Höchstens 12 Dateien.', true); break; } S.dateien.push(f); } zeichne(); };
  bg.addEventListener('click', (e) => {
    const t = e.target;
    const a = t.closest('[data-kva]'); if (a) { S.art = a.dataset.kva; zeichne(); return; }
    const sd = t.closest('[data-kvs]'); if (sd) { S.senden = sd.dataset.kvs === '1'; zeichne(); return; }
    const w = t.closest('[data-kvweg]'); if (w) { S.an.splice(+w.dataset.kvweg, 1); zeichne(); return; }
    const fw = t.closest('[data-kvfweg]'); if (fw) { const f = S.dateien.splice(+fw.dataset.kvfweg, 1)[0]; if (f && f._url) URL.revokeObjectURL(f._url); zeichne(); return; }
    const pl = t.closest('[data-kvan]'); if (pl) { (async () => { const B = await beteiligte(p.id), K = await api('api/kom/kontakte?q=').catch(() => []);
      const da = new Set(S.an.map((x) => x.email.toLowerCase())), bid = new Set(B.map((x) => x.id));
      pickMenu(pl, { search: 'Firma, Person oder E-Mail …', empty: 'Niemand gefunden – E-Mail-Adresse direkt eintippen.',
        items: [...B.map((x) => ({ ...x, g: 'Beteiligte des Projekts' })), ...K.filter((x) => !bid.has(x.id)).map((x) => ({ ...x, g: 'Weitere Kontakte' }))].filter((x) => x.email && !da.has(x.email.toLowerCase()))
          .map((x) => ({ group: x.g, title: x.name, sub: [x.gewerk, x.ansprech, x.email].filter(Boolean).join(' · '), value: x.id, find: [x.ansprech, x.email, x.gewerk].join(' '), x })),
        onPick: (id, it) => { S.an.push({ email: it.x.email, name: it.x.name, contact_id: it.x.id }); zeichne(); } }); })(); return; }
  });
  bg.addEventListener('keydown', (e) => { const i = e.target.closest && e.target.closest('.kv-mail'); if (!i || e.key !== 'Enter') return; e.preventDefault();
    const a = i.value.trim(); if (!/^[^@\s<>,;]+@[^@\s<>,;]+\.[A-Za-z]{2,}$/.test(a)) return toast('Bitte eine gültige E-Mail-Adresse eintippen.', true);
    if (!S.an.some((x) => x.email.toLowerCase() === a.toLowerCase())) S.an.push({ email: a, name: '' }); zeichne(); setTimeout(() => { const n = bg.querySelector('.kv-mail'); if (n) n.focus(); }, 0); });
  bg.addEventListener('change', (e) => { if (e.target.id === 'kvDatei') { neuDatei([...e.target.files]); e.target.value = ''; } });
  const dz = $b('.kv-r');
  dz.addEventListener('dragover', (e) => { if ([...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); dz.classList.add('over'); } });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); neuDatei([...e.dataTransfer.files]); });
  (async () => { if (!VA) VA = await api('api/vorgang/arten').catch(() => []); zeichne(); })();
  if (window.BPHead) {   // „＋ Neu“: was dieses Fenster beim Wechseln mitgibt, und wie es zugeht
    BPHead.neuDaten = () => ({ an: S.an, betreff: (bg.querySelector('#kvTitel') || {}).value || '', text: (bg.querySelector('#kvText') || {}).value || '', _dateien: S.dateien,
      firma: (S.an[0] || {}).name || '', contact_id: (S.an[0] || {}).contact_id || null });
    BPHead.neuSchliessen = () => { bg.remove(); };
  }
  if (mit.betreff) bg.querySelector('#kvTitel').value = mit.betreff;
  if (mit.text) bg.querySelector('#kvText').value = mit.text;
  zeichne();
  if (innerWidth > 760) setTimeout(() => { const f = bg.querySelector('#kvText'); if (f) f.focus(); }, 50);   // am Handy nicht gleich die Tastatur öffnen
}
async function pdfAnsehen(bid) {   // verschickte Rüge: aus dem Projektordner, sonst (Testserver) aus den Eingaben neu gedruckt – nichts liegt als Datei in der Datenbank
  try {
    const x = await api(`api/kom/${bid}/eingabe`), name = x.name || 'Rüge.pdf';
    let r = x.pfad ? await fetch(`api/kom/${bid}/pdf`, { credentials: 'same-origin' }) : null;
    if (!r || !r.ok) {
      r = await fetch(x.url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...x.body, schritt: 'drucken' }) });
      if (!r.ok) throw new Error('PDF ließ sich nicht erzeugen (' + r.status + ')');
    }
    BPHead.ansehen([{ url: URL.createObjectURL(await r.blob()), name, typ: 'pdf' }]);
  } catch (e) { toast(e.message, true); }
}
/* Vorgänge im Protokoll (nur die festgehaltenen – verschickte stehen schon als Sendung darin) */
function vgEintrag(v) {
  const d = (v.zeit || '').replace('T', ' '), F = v.dateien || [];
  if (v.art === 'abnahme') {   // Abnahme: öffnet den Ablauf (Entwurf weiter bearbeiten, unterschrieben ansehen/senden/Nachtrag) – kom-abnahme.js
    return `<div class="e vg${v.status === 'entwurf' ? ' ent' : ''}">${v.status === 'entwurf' ? `<input type="checkbox" class="ent-ck" data-ent="${v.id}"${ENTW.has(v.id) ? ' checked' : ''} aria-label="Entwurf markieren" title="Markieren – zum Löschen">` : ''}<a href="#v=${v.id}" class="ab-zeile" data-abn="${v.id}"><span class="ic">🏁</span><span class="h"><span class="art vg">${esc(v.art_name)}</span><b>${esc(v.titel || 'Abnahme')}</b></span>
      <span class="z">${v.status === 'entwurf' ? '<span class="art mr">Entwurf</span>' : v.status === 'abgeschlossen' ? '✓ abgeschlossen · noch änderbar' : '✓ unterschrieben'}</span><span class="s">${(v.unterschriften || []).length ? `<span class="kv-us">${v.unterschriften.map((u) => `<span class="${u.da ? 'da' : 'fehlt'}" title="${u.da ? 'unterschrieben' : 'nicht anwesend'}">${u.da ? '✍' : '–'} ${esc(u.rolle)}${u.name ? ' ' + esc(u.name) : ''}</span>`).join('')}</span>` : ''}${esc(['von ' + v.von, F.filter((f) => f.mime.startsWith('image/')).length ? F.filter((f) => f.mime.startsWith('image/')).length + ' Fotos' : ''].filter(Boolean).join(' · '))}</span></a></div>`;
  }
  return `<details class="e vg"><summary><span class="ic">${v.ic || '📝'}</span>
    <span class="h"><span class="art vg">${esc(v.art_name)}</span><b>${esc(v.titel || (v.text || '').slice(0, 80))}</b></span><span class="z">${uhr(v.zeit)}</span>
    <span class="s">${esc([v.beteiligte, v.ort, 'festgehalten von ' + v.von, F.length ? F.length + ' Datei' + (F.length === 1 ? '' : 'en') : '', v.frist ? 'Frist ' + kurzDatum(v.frist) : ''].filter(Boolean).join(' · '))}</span></summary>
    <div class="d">${v.text ? `<pre>${esc(v.text)}</pre>` : ''}${F.length ? `<div class="vg-f">${F.map((f) => f.mime.startsWith('image/') ? `<a href="api/datei/${f.id}" target="_blank" rel="noopener"><img src="api/datei/${f.id}" alt="${esc(f.name)}" loading="lazy"></a>` : `<a href="api/datei/${f.id}" target="_blank" rel="noopener">📄 ${esc(f.name)}</a>`).join('')}</div>` : ''}
      <div class="mute">${esc(new Date(v.zeit).toLocaleString('de-DE'))} · <a href="api/vorgang/${v.id}.pdf" target="_blank" rel="noopener">PDF</a></div></div></details>`;
}

function quelle(x) {
  const apps = ((window.BPHead && BPHead.conf) || {}).apps || [];
  const [k] = String(x.link || '').split(':'); const a = apps.find((y) => y.key === k && y.allowed);
  return a ? appUrl(a) + '/' + x.link.slice(k.length + 1) : '';
}
function kontaktWahl(anchor) {
  const offen = (L) => pickMenu(anchor, {
    search: 'Firma, Ansprechpartner:in oder E-Mail …',
    empty: 'Keine Kontakte gefunden.',
    items: L.map((x) => ({ group: x.n ? 'Mit Sendungen' : 'Weitere Kontakte', title: x.name, sub: [x.gewerk, x.ansprech, x.email].filter(Boolean).join(' · ') + (x.n ? ` · ${x.n} Sendung${x.n === 1 ? '' : 'en'}` : ''), value: x.id, find: [x.ansprech, x.email, x.gewerk].join(' ') })),
    onPick: (id) => { const x = L.find((y) => y.id === id); kontakt({ contact_id: x.id, name: x.name, ansprech: x.ansprech, gewerk: x.gewerk, email: x.email }); },
  });
  api('api/kom/kontakte?q=').then(offen).catch((e) => toast(e.message, true));
}
function kontakt(k) { K = k; KP = null; N = 300; laden(); scrollTo({ top: 0 }); }

document.addEventListener('click', async (e) => {
  const t = e.target; if (!HOST || !t.closest || !t.closest('.pv')) return;
  const sc = t.closest('[data-sc]'); if (sc) { F.alle = sc.dataset.sc === 'a'; LS.set('alle', F.alle); if (!F.alle && !projekt() && window.BPHead) BPHead.projektWahl && BPHead.projektWahl({}); laden(); return; }
  const ki = t.closest('[data-ki]'); if (ki) { kontakt(D.kontakte[+ki.dataset.ki]); return; }
  const kc = t.closest('[data-kc]'); if (kc) { e.preventDefault(); const x = D.eintraege.find((y) => y.contact_id === +kc.dataset.kc); kontakt({ contact_id: x.contact_id, name: x.kontakt, ansprech: x.ansprech, gewerk: x.gewerk, email: x.email }); return; }
  if (t.closest('[data-kx]')) { K = null; KP = null; laden(); return; }
  const kp = t.closest('[data-kp]'); if (kp) { KP = +kp.dataset.kp || null; laden(); return; }
  if (t.closest('[data-mehr]')) { N += 500; laden(); return; }
  const kw = t.closest('[data-kweg]'); if (kw) {   // Sendung löschen (Testversand …): Papierkorb + Protokoll, Rückgängig
    e.preventDefault(); const x = (D.eintraege || []).find((y) => y.id === +kw.dataset.kweg); if (!x) return;
    if (!(await bpFrage(`„${x.betreff || x.art_name}“ aus dem Protokoll löschen?\nDas ist ein Eingriff ins Protokoll: Die Sendung liegt danach im Papierkorb, und das Löschen wird protokolliert.`, { ok: 'Löschen', gefahr: true }))) return;
    try { const r = await api('api/kom/' + x.id, 'DELETE'); await laden(); rueckgaengig('Sendung gelöscht', async () => { await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await laden(); }); toast('Sendung gelöscht – im Papierkorb.'); } catch (er) { toast(er.message, true); }
    return;
  }
  const qp = t.closest('[data-qp]'); if (qp && qp.dataset.qp) { e.preventDefault(); try { await BPHead.projektSetzen(+qp.dataset.qp); } catch { /* egal */ } location.href = qp.href; return; }
  const dt = t.closest('[data-pvdat]'); if (dt) { const u = 'api/datei/' + dt.dataset.pvdat, pdf = dt.dataset.m === 'application/pdf'; if (window.BPHead && BPHead.ansehen && (pdf || /^image\//.test(dt.dataset.m))) BPHead.ansehen([{ url: u, name: dt.dataset.n, typ: pdf ? 'pdf' : 'bild' }]); else window.open(u, '_blank'); return; }
  const pp = t.closest('[data-pvpdf]'); if (pp) { pdfAnsehen(+pp.dataset.pvpdf); return; }
  const nb = t.closest('[data-pvneu]'); if (nb) { if (window.briefAusSendung) briefAusSendung(+nb.dataset.pvneu); return; }   // aufgaben.html: Rüge als neuer Entwurf
  if (t.closest('[data-pvk]')) { kontaktWahl(t.closest('[data-pvk]')); return; }
  if (t.closest('[data-pvcsv]')) { location.href = 'api/kom.csv?' + params({ n: 1 }); return; }
  if (t.closest('[data-pvdr]')) { HOST.querySelectorAll('#pvList details').forEach((d) => { d.open = true; }); setTimeout(() => print(), 50); }
});
document.addEventListener('change', (e) => { if (e.target.id === 'pvIch') { F.ich = e.target.checked; LS.set('ich', F.ich); laden(); } });


const GERUEST = `<div class="pv"><div class="top">
    <span class="pv-such"></span>
    <div class="seg" id="pvScope" role="group" aria-label="Umfang"></div>
    <button class="btn sm" data-pvk title="Einen Kontakt wählen und alles sehen, was ihm geschickt wurde">👤 Kontakt …</button>
    <button class="btn sm" data-pvcsv title="Die gezeigten Sendungen als Excel-Tabelle (CSV) speichern">⤓ Speichern unter …</button>
    <button class="btn sm" data-pvdr title="Als Nachweis drucken oder als PDF speichern">🖨 Drucken / PDF</button>
    <label class="ck"><input type="checkbox" id="pvIch"> nur von mir</label>
  </div>
  <div id="pvKbox"></div>
  <div class="grid" data-bph-trenn-ab="821" data-bph-trenn="kom" data-bph-trenn-min="200" data-bph-trenn-max="0.5"><aside class="side" id="pvSide" aria-label="Übersicht"></aside><section id="pvList" aria-live="polite"><div class="leer">Lade …</div></section></div></div>`;

function zeigen(el) { HOST = el; el.innerHTML = GERUEST; el.querySelector('.pv-such').appendChild(QIN); laden(); }   // Suchfeld oben im Verlauf (nicht in der Navigation)
function weg() { HOST = null; tok++; }
function nav() {
  return { aktiv: K ? '' : 'v:' + (F.arten.size === 1 ? [...F.arten][0] : ''), arten: (D && D.arten) || null,
    mitwem: K || !D ? [] : (D.kontakte || []).map((x) => ({ name: x.name, n: x.n, tip: [x.gewerk, x.ansprech].filter(Boolean).join(' · ') })),
    wahl: (id) => { if (id.startsWith('w:')) { kontakt(D.kontakte[+id.slice(2)]); return; } K = null; KP = null; F.arten = new Set(id.slice(2) ? [id.slice(2)] : []); LS.set('arten', [...F.arten]); laden(); } };
}
/* Adresse: #art=planversand (leer = alles), #v=<Vorgang> (Abnahme öffnet sich), #kontakt=<id>, #post – gehört zum Verlauf */
function ausHash() {
  const h = location.hash || '';
  const ah = /(?:^#|&)art=(\w*)/.exec(h), va = /(?:^#|&)v=(\d+)/.exec(h), m = /(?:^#|&)kontakt=(\d+)/.exec(h);
  if (!ah && !va && !m && !/^#post(&|$)/.test(h)) return false;
  if (ah) { F.arten = new Set(ah[1] ? [ah[1]] : []); LS.set('arten', [...F.arten]); }
  if (va) api('api/abnahme/' + va[1]).then((A) => abnahmeOeffnen(A.id, A)).catch(() => {});
  if (m) api('api/kom/kontakte?q=').then((L) => { const x = L.find((y) => y.id === +m[1]); if (x) kontakt({ contact_id: x.id, name: x.name, ansprech: x.ansprech, gewerk: x.gewerk, email: x.email }); }).catch(() => {});
  return true;
}
let QT = 0;
QIN.addEventListener('input', (e) => { clearTimeout(QT); QT = setTimeout(() => { F.q = e.target.value.trim(); laden(); }, 300); });
const neuArten = { nachricht: (d) => verfassen('n', d), vorgang: (d) => verfassen('v', d), datei: (d) => verfassen('d', d), abnahme: (d) => abnahmeNeu(undefined, d) };   // „＋ Neu“: diese Arten öffnet der Verlauf selbst
function projektNeu() { if (!K) { F.alle = false; LS.set('alle', false); } laden(); }   // oben ein anderes Projekt gewählt
window.PV = { zeigen, weg, nav, ausHash, laden, projektNeu, projekt, beteiligte, neuArten, an: () => !!HOST };
})();
