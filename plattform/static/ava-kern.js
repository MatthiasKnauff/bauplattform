/* Ausschreibung (AVA) – Grundlagen: Laden und Speichern, Versionsleiste, Kopf, Ablagefeld, Eingangsordner.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* Wird die App gerade neu gestartet (Update eingespielt), antwortet der Verteiler sofort mit 502 „… nicht erreichbar (ConnectionRefusedError)“ –
   die Anfrage ist dann nicht angekommen und wird nach ein paar Sekunden still wiederholt (bis zu einer Minute). */
(() => {
  const roh = window.fetch.bind(window);
  window.fetch = async (url, opt) => {
    for (let k = 0; ; k++) {
      const r = await roh(url, opt);
      if (r.status !== 502 || k >= 12) return r;
      const t = await r.clone().text().catch(() => '');
      if (!/nicht erreichbar \((ConnectionRefusedError|ConnectionResetError|RemoteDisconnected)/.test(t) || (/RemoteDisconnected|Reset/.test(t) && opt && opt.method && opt.method !== 'GET')) return r;
      if (k === 0 && window.toast) toast('Die AVA startet gerade neu (Update) – die Anfrage wird gleich wiederholt …');
      await new Promise((ok) => setTimeout(ok, 5000));
    }
  };
})();
const LS = { get(k, d) { try { const v = localStorage.getItem('ava.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('ava.' + k, JSON.stringify(v)); } catch { /* egal */ } } };
const NAVI = [   // wie in den gewohnten AVA-Programmen: links die Arbeitsschritte, rechts die Tabelle
  ['Ausschreibung', [['lv', 'Leistungsverzeichnis', '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/>'], ['tueren', 'Fenster- & Türliste', '<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="15" cy="12" r=".8"/>']]],
  ['Vergabe', [['angebote', 'Angebote & Preisspiegel', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>']]],
  ['Prüfung und Abrechnung', [['auftraege', 'Aufträge', '<path d="M3 7h6l2 2h10v10H3z"/>'], ['aufmass', 'Aufmaßprüfung', '<path d="M3 17l14-14 4 4-14 14H3z"/><path d="M13 7l4 4"/>'], ['rechnungen', 'Rechnungen', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>']]],
  ['Kostenübersicht', [['uebersicht', 'Kostenkontrolle', '<path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>']]],
];
const NAVF = { lv: '#6aa7ff', tueren: '#2fd6c9', angebote: '#b18cff', auftraege: '#3ddc84', aufmass: '#ffad5c', rechnungen: '#e8c53a', uebersicht: '#ff7a6b' };   // Farbe der Symbol-Kacheln je Bereich
/* Die vier Arbeitsschritte oben (fest), darunter die Bereiche des gewählten Schritts */
const SCHRITTE = [['aus', 'Ausschreibung', ['lv', 'tueren']], ['ver', 'Vergabe', ['angebote']], ['abr', 'Abrechnung', ['auftraege', 'aufmass', 'rechnungen']], ['kos', 'Kosten', ['uebersicht']]];
const schrittVon = (t) => SCHRITTE.find((x) => x[2].includes(t)) || SCHRITTE[0];
const TABS = NAVI.flatMap((g) => g[1].map((x) => [x[0], x[1]]));
const NURLV = new Set(['lv', 'angebote', 'aufmass', 'rechnungen']);
/* Breite der Navigation links und der Kopierquelle rechts: am Rand ziehen (Doppelklick = Standard), gemerkt je Browser */
(() => {
  const body = () => document.querySelector('.body'), RAND = 6;
  const setz = (k, v) => { const b = body(); if (!b) return; if (v) b.style.setProperty(k, v + 'px'); else b.style.removeProperty(k); };
  const lade = () => { const w = LS.get('navw', 0), q = LS.get('quw', 0); if (w) setz('--navw', w); if (q) setz('--quw', q); };
  const amRand = (e) => {
    if (innerWidth <= 1100) return null;
    const gr = e.target.closest && e.target.closest('.rand-griff');   // der sichtbare Anfasser
    if (gr) { const el = document.getElementById(gr.dataset.seite === 'l' ? 'navL' : 'quelle'); return el && !el.hidden ? [gr.dataset.seite, el] : null; }
    const n = e.target.closest && e.target.closest('#navL'), q = e.target.closest && e.target.closest('#quelle');
    if (n) { const r = n.getBoundingClientRect(); return r.right - e.clientX <= RAND ? ['l', n] : null; }
    if (q) { const r = q.getBoundingClientRect(); return e.clientX - r.left <= RAND ? ['r', q] : null; }
    return null;
  };
  document.addEventListener('pointermove', (e) => { if (e.buttons) return; const a = amRand(e); const el = e.target.closest && e.target.closest('#navL,#quelle'); if (el) el.style.cursor = a ? 'col-resize' : ''; });
  document.addEventListener('pointerdown', (e) => {
    const a = amRand(e); if (!a || e.button !== 0) return;
    e.preventDefault(); const b = body(), [seite, el] = a, r0 = el.getBoundingClientRect();
    b.classList.add('zieh-' + seite);
    const mv = (ev) => {
      if (seite === 'l') setz('--navw', Math.round(Math.max(200, Math.min(innerWidth * 0.5, ev.clientX - r0.left))));
      else setz('--quw', Math.round(Math.max(300, Math.min(innerWidth * 0.6, r0.right - ev.clientX))));
    };
    const up = () => {
      b.classList.remove('zieh-' + seite); removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      const v = parseInt(getComputedStyle(b).getPropertyValue(seite === 'l' ? '--navw' : '--quw'), 10); if (v) LS.set(seite === 'l' ? 'navw' : 'quw', v);
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }, true);
  document.addEventListener('dblclick', (e) => { const a = amRand(e); if (!a) return; e.preventDefault(); setz(a[0] === 'l' ? '--navw' : '--quw', 0); LS.set(a[0] === 'l' ? 'navw' : 'quw', 0); }, true);
  const rechts = () => {   // Anfasser rechts folgt dem linken Rand der Kopierquelle
    const g = document.querySelector('.rand-griff[data-seite="r"]'), q = document.getElementById('quelle'), b = body(); if (!g || !q || !b) return;
    g.hidden = q.hidden || !b.classList.contains('mit-quelle'); if (!g.hidden) g.style.left = (q.getBoundingClientRect().left - b.getBoundingClientRect().left - 6) + 'px';
  };
  const start = () => { lade(); const q = document.getElementById('quelle'); if (q) { new ResizeObserver(rechts).observe(q); new MutationObserver(rechts).observe(q, { attributes: true, attributeFilter: ['hidden'] }); } if (body()) new MutationObserver(rechts).observe(body(), { attributes: true, attributeFilter: ['class', 'style'] }); addEventListener('resize', rechts); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
const ARTEN = { N: 'Normal', E: 'Bedarf (ohne GB)', A: 'Wahl (ohne GB)', P: 'Pauschal', T: 'Hinweistext', V: 'Vorbemerkung' };
/* Vorbemerkung = Hinweistext mit Kennzeichen vb (GAEB: Hinweistext) – im Druck breit und abschaltbar (Layout → „Vorbemerkungen im LV“) */
const artW = (x) => (x.art === 'T' && x.vb ? 'V' : x.art);
/* Art der Position: Feld mit Vorschlagsliste (gemeinsamer Baustein /bp/vorschlag.js) – wie die Einheit */
bpVorschlag.listen.art = Object.entries(ARTEN).map(([w, t]) => ({ w, t }));
bpVorschlag.norm.art = (v) => String(v || '').trim().toUpperCase().slice(0, 1);
const STATUS = [['entwurf', 'Entwurf'], ['versendet', 'An Bieter versendet'], ['vergeben', 'Vergeben'], ['abgerechnet', 'Abgerechnet'], ['nicht_vergeben', 'Nicht vergeben']];
const NICHT_GRUENDE = [['', '– ohne Angabe –'], ['entfallen', 'Leistung entfällt'], ['aufgehoben', 'Ausschreibung aufgehoben'], ['anderweitig', 'anderweitig vergeben'], ['zurueckgestellt', 'zurückgestellt']];
/* Einheitlicher Name für alle PDFs: „<Projektnr.> <Art> <Firma> – LV <Nr> <Name> – <Zusatz>.pdf“ – im ganzen Projekt gleich */
let PDFTPL = '{projektnr} {art} {firma} – LV {lv} – {zusatz}';   // Schema aus den Büro-Einstellungen (Verwaltung → Ablage), wird beim Start geladen
function pdfName(art, zusatz = '', lv = L) {
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || '', m = /^\s*([A-Z]{1,2}\d{2,5}(?:[.\-]\d+)?)\b/.exec(pn);
  const w = { projektnr: m ? m[1] : pn.split(/\s+/)[0] || '', projekt: pn, art: art || '', firma: (lv && lv.vergabe && (lv.vergabe.bieter || lv.auftragnehmer) || '').trim(),
    lvnr: lv ? lv.nr || '' : '', lvname: lv ? lv.name || '' : '', zusatz: zusatz || '', datum: new Date().toISOString().slice(0, 10) };
  w.lv = [w.lvnr, w.lvname].filter(Boolean).join(' ');
  let t = PDFTPL.replace(/\{(\w+)\}/g, (_, k) => w[k] ?? '');
  t = t.replace(/(\s*[–\-·|]\s*)(?:LV\s*)?(?=\s*[–\-·|]|\s*$)/g, '').replace(/^\s*[–\-·|]\s*/, '');   // leere Teile samt Trennzeichen weg
  return t.replace(/\s+/g, ' ').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 150) + '.pdf';
}
const ohneLv = (x) => !!(x.frei && x.ohne_lv !== false);   // Auftrag ohne LV: nur unter Prüfung und Abrechnung, nicht in Ausschreibung/Vergabe
let PROJ = [], pid = null, LIST = [], L = null, tab = LS.get('tab', 'auftraege'), PC = {}, EXP = new Set(LS.get('exp', [])), TSEL = null, saveT = 0, saving = false, KONT = null, OPEN = new Set(), amPos = LS.get('amPos', null), amNur = LS.get('amNur', false);
window.bpBereich = () => tab;   // für die Zeiterfassung: Reiter der AVA ergibt die Leistungsphase (LV → LPh 6, Angebote → LPh 7, Aufmaß/Rechnungen → LPh 8)
if (!TABS.some((t) => t[0] === tab)) tab = 'auftraege';
const eur = (v) => (v == null || isNaN(v) ? '–' : (Math.abs(v) < 0.005 ? 0 : v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €');
const eur0 = (v) => (v == null || isNaN(v) ? '–' : Math.round(v).toLocaleString('de-DE') + ' €');
const nf2 = (v) => (v == null || v === '' || isNaN(v) ? '' : (+v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const nf3 = (v) => (+v || 0).toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const nf = (v, n = 3) => (v == null || v === '' || isNaN(v) ? '' : (+v).toLocaleString('de-DE', { maximumFractionDigits: n }));
const pf = (s) => { if (s == null) return null; s = String(s).trim(); if (!s) return null; const v = parseFloat(s.replace(/\./g, (m, i, a) => (/\.\d{3}(\D|$)/.test(a.slice(i)) ? '' : '.')).replace(',', '.')); return isNaN(v) ? null : v; };
const de = (s) => { if (!s) return ''; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('de-DE'); };
const uid = () => Math.random().toString(36).slice(2, 12);
const zaehlt = (p) => p.typ === 'pos' && (p.art === 'N' || p.art === 'P' || (p.art === 'E' && p.gb)) && !p.nt && !p.entf;
const ohneGB = (x) => x.art === 'A' || (x.art === 'E' && !x.gb);
const items = () => (L && L.data && L.data.items) || [];
const posOf = () => items().filter((x) => x.typ === 'pos' && x.art !== 'T');
/* Rechenweg wie auf dem Server: „2 × 3,5 × 2,75 – 0,885 × 2,135“ */
function formel(s) {
  let t = String(s || '').trim(); if (!t) return null;
  t = t.replace(/[×·xX]/g, '*').replace(/÷|:/g, '/').replace(/[–−]/g, '-').replace(/(\d)\.(?=\d{3}(\D|$))/g, '$1').replace(/,/g, '.');
  if (!/^[\d\s.+\-*/()]+$/.test(t)) return null;
  try { const v = Function('"use strict";return (' + t + ')')(); return typeof v === 'number' && isFinite(v) ? Math.round(v * 10000) / 10000 : null; } catch { return null; }
}

/* ---------- Laden / Speichern ---------- */
async function loadProj() {
  PROJ = await api('api/projekte');
  api('api/einstellungen/abrechnung').then((E) => { if (E && E.pdf_name_tpl) PDFTPL = E.pdf_name_tpl; }).catch(() => {});   // Namensschema der PDFs (Büro)
  const gp = window.BPHead && BPHead.projektId();
  pid = PROJ.some((p) => p.id === gp) ? gp : PROJ.some((p) => p.id === LS.get('pid')) ? LS.get('pid') : (PROJ.find((p) => !p.archived) || {}).id || null;
  $('#proj').innerHTML = `<optgroup label="Projekte">${PROJ.filter((p) => !p.archived).map((p) => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>`
    + (PROJ.some((p) => p.archived) ? `<optgroup label="Archiv">${PROJ.filter((p) => p.archived).map((p) => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</optgroup>` : '');
  projektKnopf($('#proj'));
  if (pid && window.BPHead) BPHead.projektSetzen(pid);
}
/* ---------- Versionsleiste: je Projekt EINE AVA, darin Versionen (Startversion, Bauherrenwünsche eingearbeitet …) – jede mit eigenen LVs ---------- */
let VERS = [];
/* Angesehene Version (nicht unbedingt die gültige): nur in diesem Fenster, beim nächsten Wechsel wird wieder gefragt */
let VSICHT = null;
window.bpBugZustand = () => ({ ansicht: tab, projekt_id: pid, lv: L ? { id: L.id, nr: L.nr, name: L.name, status: L.status, version_id: L.version_id } : null,   // für 🐞 Fehler melden
  version: VSICHT && VSICHT.pid === pid ? 'angesehen ' + VSICHT.id : 'gültige', versionen: (VERS || []).map((v) => `${v.id}${v.aktiv ? '*' : ''} ${v.name}`).slice(0, 10), lvs: (LIST || []).length, aktive_zeile: LVAKT, markiert: LVSEL ? LVSEL.size : 0 });
const vSicht = () => (VSICHT && VSICHT.pid === pid && VERS.some((v) => v.id === VSICHT.id && !v.aktiv) ? VSICHT.id : null);
const lvListe = () => api('api/lv?project_id=' + pid + (vSicht() ? '&version_id=' + vSicht() : ''));
/* Nur einen Eintrag der LV-Liste nachladen (nach Nachtrag/Stand): schneller als die ganze Liste mit allen Summen neu zu rechnen */
async function lvEintrag(id) {
  const l = await api('api/lv?project_id=' + pid + '&id=' + id); const n = l && l[0]; if (!n) return;
  const i = LIST.findIndex((x) => x.id === id); if (i >= 0) LIST[i] = n; else LIST.push(n);
  selBtn(); einUeb();
}
async function vleiste(neu) {
  if (!window.BPHead || !BPHead.versionsleiste) return;
  if (neu !== false) { try { VERS = pid ? await api('api/versionen?project_id=' + pid) : []; } catch { VERS = []; } }
  const gilt = VERS.find((v) => v.aktiv) || VERS[0], akt = VERS.find((v) => v.id === vSicht()) || gilt;
  const dk = (t) => (t ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '');
  const el = BPHead.versionsleiste({ vor: $('main.ava'), aktuell: akt && akt.id, gueltig: gilt && gilt.id,
    liste: VERS.map((v) => ({ id: v.id, name: v.name, datum: dk(v.created), wer: v.updated_by, archiviert: v.archived })),
    onWahl: async (id, gilt_) => { await flush(); VSICHT = gilt_ || +id === (gilt && gilt.id) ? null : { pid, id: +id }; if (gilt_) return; L = null; await vleiste(); await loadList(); toast(VSICHT ? 'Version gewechselt – nur zum Ansehen und Bearbeiten, gültig bleibt die bisherige.' : 'Gültige Version.'); },
    onGueltig: async (id, schon) => { const v = VERS.find((x) => x.id === +id); if (!v) return;
      if (!schon && !(await bpFrage(`„${v.name}“ gilt ab jetzt?\nSie gilt dann für alle, die in diesem Projekt arbeiten (Startseite, To-dos, Kostenkontrolle).`, { ok: 'Gilt ab jetzt' }))) return;
      await flush(); await api('api/versionen/' + id, 'PUT', { aktiv: true }); VSICHT = null; L = null; await vleiste(); await loadList(); toast(`„${v.name}“ gilt jetzt für alle, die in diesem Projekt arbeiten.`); },
    onNeu: () => { if (!akt) return; modalBox(`<h3>Neue Version</h3><p class="hint" style="margin:0 0 .7rem">Kopie von „${esc(akt.name)}“ mit allen Leistungsverzeichnissen, Angeboten, Aufmaß, Rechnungen und Fotos. Danach arbeitest du in der neuen Version weiter, die alte bleibt, wie sie ist.</p>
        <div class="fm"><label for="nvName">Name der Version</label><input id="nvName" maxlength="120" placeholder="z. B. Bauherrenwünsche eingearbeitet"></div>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, async (m, bg, close, btn) => {
        if (m === 'x') { close(); return; }
        const name = bg.querySelector('#nvName').value.trim(); if (!name) { bg.querySelector('#nvName').focus(); return; }
        btn.disabled = true;
        try { await flush(); await api('api/versionen', 'POST', { project_id: pid, name, ...(vSicht() ? { von: vSicht() } : {}) }); VSICHT = null; close(); L = null; await loadList(); toast(`Version „${name}“ angelegt – du arbeitest jetzt darin.`); } catch (e) { btn.disabled = false; toast(e.message, true); }
      }); setTimeout(() => { const i = document.querySelector('#nvName'); if (i) i.focus(); }, 50); },
    onUmbenennen: () => { if (!akt) return; modalBox(`<h3>Version umbenennen</h3><div class="fm"><label for="rnName">Name der Version</label><input id="rnName" maxlength="120" value="${esc(akt.name)}"></div>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>`, async (m, bg, close) => {
        if (m === 'x') { close(); return; }
        const name = bg.querySelector('#rnName').value.trim(); if (!name) return;
        try { await api('api/versionen/' + akt.id, 'PUT', { name }); close(); vleiste(); } catch (e) { toast(e.message, true); }
      }); setTimeout(() => { const i = document.querySelector('#rnName'); if (i) { i.focus(); i.select(); } }, 50); },
    onVerlauf: () => lvVerlauf(),
    onVerwalten: () => { if (!akt) return;
      const selRe = (tab === 'rechnungen' || tab === 'aufmass') && L && PJSEL && PJSEL[0] === 'r' ? L.rechnungen.find((y) => 'r' + y.id === PJSEL) : null;
      const selAng = tab === 'angebote' && L && PJSEL && PJSEL[0] === 'b' ? L.angebote.find((y) => 'b' + y.id === PJSEL) : null;
      const selTxt = selRe ? reTitel(selRe) : selAng ? `Angebot „${selAng.bieter}“` : L ? `LV „${L.name}“` : '';
      modalBox(`<h3>Version „${esc(akt.name)}“</h3>
        ${selTxt ? `<div class="si-w" style="margin:0 0 .7rem;padding:.55rem .7rem;border-radius:calc(8px*var(--rk,1))">Hier geht es um die <b>ganze Version</b> (alle LVs). Nur <b>${esc(selTxt)}</b> löschen? <button class="btn sm" data-m="nur" style="margin-left:.4rem">Nur ${esc(selTxt)} …</button></div>` : ''}
        <p><b>Archivieren</b> schiebt die Version in der Auswahl nach unten unter „Archiviert“; sie bleibt erhalten.</p>
        <p><b>In den Papierkorb</b> nimmt die Version mit allen ihren Leistungsverzeichnissen, Angeboten, Aufmaß und Rechnungen heraus – wiederherstellen auf der Startseite unter „Papierkorb“.${VERS.length < 2 ? ' Da es die einzige ist, geht es danach mit einer leeren „Startversion“ weiter.' : ''}</p>
        <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn" data-m="arch">${akt.archived ? 'Aus dem Archiv holen' : 'Archivieren'}</button><button class="btn danger" data-m="del"${VERS.length < 2 ? ' title="Die einzige Version – danach gibt es eine leere „Startversion“"' : ''}>🗑 Ganze Version in den Papierkorb</button></div>`, async (m, bg, close) => {
        if (m === 'x') { close(); return; }
        if (m === 'nur') { close(); if (!selRe && !selAng) PJSEL = null; return $('#moreBtn').onclick(); }
        try {
          if (m === 'arch') {
            const vid = akt.id, alt = !!akt.archived;
            await api('api/versionen/' + vid, 'PUT', { archived: !alt }); close(); vleiste();
            rueckgaengig(`Version „${akt.name}“ ${alt ? 'aus dem Archiv geholt' : 'archiviert'}`, async () => { await api('api/versionen/' + vid, 'PUT', { archived: alt }); vleiste(); });
            return;
          }
          if (m === 'del') {
            await flush(); const r = await api('api/versionen/' + akt.id, 'DELETE'); close(); L = null; VSICHT = null; await vleiste(); await loadList();   // nicht weiter die gelöschte Version abfragen
            if (r && r.papierkorb) rueckgaengig(`Version „${akt.name}“ liegt im Papierkorb`, async () => { const w = await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); if (akt.aktiv && w.schluessel) await api('api/versionen/' + w.schluessel, 'PUT', { aktiv: true }); else if (w.schluessel) VSICHT = { pid, id: +w.schluessel }; L = null; await vleiste(); await loadList(); });
            else toast('Version liegt im Papierkorb – wiederherstellen unter Startseite → Papierkorb.');
          }
        } catch (e) { toast(e.message, true); }
      }); } });
  vlSicht();
}
/* Versionen braucht man nur beim Ausschreiben – die Leiste steht nur im Schritt „Ausschreibung“ */
/* Menü „⋯“ der Bereichsleiste: die Befehle der (ausgeblendeten) Werkzeugleiste */
const UMENU = [['impBtn', 'Import … (GAEB, Excel)'], ['expBtn', 'Export … (GAEB, Excel)'], ['druBtn', 'Drucken / PDF …'], '-', ['quBtn', 'Kopierquelle (LV daneben)'], '-', ['moreBtn', 'Archivieren / löschen …']];
/* Befehle je Phase sichtbar in der Bereichsleiste (Symbol + Wort); der Rest unter „⋯“ */
/* Obere Leiste je Bereich: nur Datei rein/raus, Drucken und „daneben öffnen“ – alles „＋ Neu“ steht links, „＋ Titel/Position“ in der Seite.
   Eintrag: [Knopf-Selektor der Werkzeugleiste, Text] oder [Funktion, Text, Symbol, gesperrt?] */
const IC_DEL = '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>';
const IC_IMP = '<path d="M5 14v6h14v-6"/><path d="M12 3v11M8 10l4 4 4-4"/>', IC_DRU = '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="1.5"/><path d="M7 14h10v7H7z"/>';
function dateiWahl(accept, mehr, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!mehr; i.hidden = true; document.body.appendChild(i); i.onchange = () => { const f = [...i.files]; i.remove(); if (f.length) fn(f); }; i.click(); }
const UTAB = {
  lv: () => [['impBtn', 'Import'], ['expBtn', 'Export'], ['druBtn', 'Drucken'], ['quBtn', 'Kopierquelle']],
  tueren: () => [[() => window.tlImport && tlImport(), 'Import (Excel)', IC_IMP]],
  angebote: () => [['impBtn', 'Import (Angebot)'], ['expBtn', 'Export'], ['druBtn', 'Drucken']],
  auftraege: () => [['impBtn', 'Import'], ['druBtn', 'Drucken']],
  aufmass: () => [[() => dateiWahl('.pdf,application/pdf', true, (f) => amBelegHoch(f)), 'Import (Rechnung / Aufmaß der Firma)', IC_IMP, !L || !vergeben()], ['druBtn', 'Drucken']],
  rechnungen: () => [[() => { const r = reGewaehlt(); if (!r) return toast('Erst eine Rechnung anlegen (links „＋ Neue Rechnung“).', true); dateiWahl('application/pdf,.pdf', false, (f) => reBelegHoch(r.id, f[0])); }, 'Import (Rechnung der Firma)', IC_IMP, !L || !vergeben()],
    [() => { const r = reGewaehlt(); if (r) reDruck(r); else toast('Noch keine Rechnung.', true); }, 'Drucken', IC_DRU, !L || !(L.rechnungen || []).length]],
  uebersicht: () => [['druBtn', 'Drucken'], ['expBtn', 'Export']],
};
let UFN2 = [];
/* LV aus der Liste nehmen: mit Auftrag/Rechnungen zuerst „Archivieren“ (bleibt vollständig erhalten), Löschen nur ausdrücklich */
async function lvWegFragen(id) {
  const x = LIST.find((y) => y.id === id) || (L && L.id === id ? L : null); if (!x) return;
  const nm = [x.nr, x.name].filter(Boolean).join(' '), nRe = (x.rechnungen || []).length, nAng = x.n_angebote != null ? x.n_angebote : (x.angebote || []).length;
  const nAm = L && L.id === id ? new Set((L.aufmass || []).map((a) => a.pos_id)).size : null, mitAuftrag = !!(x.vergeben || x.frei || nRe);
  const wegDamit = async () => { try { if (L && L.id === id) await flush(); const w = await api('api/lv/' + id, 'DELETE'); if (L && L.id === id) L = null; await loadList();
    if (typeof w.papierkorb === 'number') rueckgaengig(`LV „${x.name}“ liegt im Papierkorb`, async () => { const z = await api(`api/bp/papierkorb/${w.papierkorb}/zurueck`, 'POST'); await loadList(+z.schluessel || undefined); }); } catch (er) { toast(er.message, true); } };
  if (!mitAuftrag) {
    if (await bpFrage(`LV „${nm}“${nAng ? ` mit ${nAng} Angebot${nAng === 1 ? '' : 'en'}` : ''} in den Papierkorb legen?\nWiederherstellen geht über Rückgängig oder den Papierkorb auf der Startseite.`, { ok: 'In den Papierkorb' })) await wegDamit();
    return;
  }
  const was = [nRe ? `${nRe} Rechnung${nRe === 1 ? '' : 'en'}` : '', nAng ? `${nAng} Angebot${nAng === 1 ? '' : 'e'}` : '', nAm ? `Aufmaß zu ${nAm} Position${nAm === 1 ? '' : 'en'}` : ''].filter(Boolean).join(', ');
  modalBox(`<h3>LV „${esc(nm)}“ aus der Liste nehmen?</h3>
    <p>Das LV ist beauftragt${x.auftragnehmer || (x.vergabe && x.vergabe.bieter) ? ' an <b>' + esc(x.auftragnehmer || x.vergabe.bieter) + '</b>' : ''}${was ? ' und hat ' + esc(was) : ''}. Angebote, Aufmaß und Rechnungen hängen an seinen Positionen – ohne das LV ließen sie sich nicht mehr nachrechnen.</p>
    <p class="hint"><b>Archivieren</b> nimmt es aus allen Listen, alles bleibt vollständig erhalten und lässt sich jederzeit zurückholen.</p>
    <div class="acts"><button class="btn danger sm" data-m="del" style="margin-right:auto" title="Mit allem in den Papierkorb – wiederherstellbar über den Papierkorb">trotzdem in den Papierkorb</button><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="arch">Archivieren</button></div>`, async (m, bg, close) => {
    if (m === 'x') return close();
    if (m === 'arch') { close(); await lvSetzen(id, { archived: true }); if (L && L.id === id) { await refreshList(); } render(); rueckgaengig(`LV „${x.name}“ archiviert`, () => lvSetzen(id, { archived: false })); return; }
    if (m === 'del') { close(); if (await bpFrage(`Wirklich das ganze LV „${nm}“ mit ${was || 'allem'} in den Papierkorb?`, { ok: 'In den Papierkorb' })) await wegDamit(); }
  });
}
/* Löschen in der Titelzeile – je Bereich das Gewählte: Rechnung, Angebot, sonst das ganze LV (immer in den Papierkorb) */
async function uLoeschen() {
  if (!L) return toast('Kein LV gewählt.', true);
  if ((tab === 'rechnungen' || tab === 'aufmass') && L.rechnungen && L.rechnungen.length && (PJSEL && PJSEL[0] === 'r')) return reLoeschen(+PJSEL.slice(1));
  if (tab === 'angebote' && PJSEL && PJSEL[0] === 'b') return angLoeschen(+PJSEL.slice(1));
  return lvWegFragen(L.id);
}
const uLoeschText = () => ((tab === 'rechnungen' || tab === 'aufmass') && PJSEL && PJSEL[0] === 'r' ? 'Rechnung löschen' : tab === 'angebote' && PJSEL && PJSEL[0] === 'b' ? 'Angebot löschen' : 'LV löschen');
/* „⋯“ passend zum Bereich: im LV die LV-Befehle, in Vergabe/Abrechnung/Kosten die dortigen – [Knopf-Selektor | Funktion, Text, gesperrt] */
let UFN = [];
const reGewaehlt = () => { if (!L || !L.rechnungen || !L.rechnungen.length) return null; const RS = [...L.rechnungen].sort((a, b) => a.nr - b.nr);
  return (PJSEL && PJSEL[0] === 'r' && RS.find((r) => 'r' + r.id === PJSEL)) || RS.find((r) => r.status !== 'geprueft') || RS[RS.length - 1]; };
const reBefehl = (art) => () => { const r = reGewaehlt(); if (!r) return; const b = document.createElement('button'); b.dataset.reb = art; b.dataset.id = r.id; reAktion(b); };
const uSicht = () => new Set(uSlots().map((x) => x[0]).filter((x) => typeof x === 'string'));
/* was früher unter „⋯“ stand, steht jetzt direkt in der Leiste (wird es eng, sammelt „»“ die Gruppen ein) */
const BIC_ARCH = '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>';
const uWeitere = () => { const S = uSicht(); S.add('quBtn'); S.add('moreBtn');   // Archivieren bietet „Löschen“ selbst an (bei Aufträgen zuerst) – kein zweiter Knopf
  return uMenuPunkte().filter((x) => x !== '-' && (typeof x[0] === 'function' ? !/Verlauf/.test(x[1]) : !S.has(x[0]))).map((x) => {   // Kopierquelle und Verlauf stehen schon in der Leiste
  if (typeof x[0] === 'function') return { t: x[1].replace(/^\W+\s*/, '').replace(/ …$/, ''), fn: x[0], aus: !!x[2], ic: BIC_ARCH, tip: x[1] };
  const b = ribKnopf(x[0]); if (!b) return null; const sv = b.querySelector('svg');
  return { t: x[0] === 'moreBtn' ? 'Archivieren' : x[1].replace(/ ….*$/, ''), attrs: `data-ucmd="${esc(x[0])}" data-udr`, aus: b.disabled, ic: x[0] === 'moreBtn' || !sv ? BIC_ARCH : sv.innerHTML, tip: x[1] }; }).filter(Boolean); };
const uMenuLeer = () => { const S = uSicht(); return !uMenuPunkte().some((x) => x !== '-' && (typeof x[0] === 'function' || (!S.has(x[0]) && ribKnopf(x[0])))); };   // nichts übrig → „mehr“ grau statt leerem Menü
function uMenuPunkte() {   // nur, was nicht schon oben, links oder in der Seite steht
  const archiv = ['moreBtn', 'LV archivieren / löschen …'], verlauf = [() => lvVerlauf(), 'Verlauf …', !L];
  if (tab === 'rechnungen' || tab === 'aufmass' || tab === 'angebote' || tab === 'tueren') return [archiv];
  if (tab === 'auftraege') return [archiv];
  if (tab === 'uebersicht') return [['expBtn', 'Export … (GAEB, Excel)'], '-', verlauf];
  return UMENU;
}
function uSlots() {   // feste Reihenfolge und gleiche Wörter in allen Bereichen – was nicht greift, ist grau (Erklärung im Tooltip)
  const imp = { lv: ['impBtn'], angebote: ['impBtn'], auftraege: ['impBtn'], tueren: [() => window.tlImport && tlImport(), false, 'Fenster- und Türliste aus Excel einlesen'],
    aufmass: [() => dateiWahl('.pdf,application/pdf', true, (f) => amBelegHoch(f)), !L || !vergeben(), 'Rechnung oder Aufmaß der Firma (PDF) einlesen'],
    rechnungen: [() => { const r = reGewaehlt(); if (!r) return toast('Erst eine Rechnung anlegen (links „＋ Neue Rechnung“).', true); dateiWahl('application/pdf,.pdf', false, (f) => reBelegHoch(r.id, f[0])); }, !L || !vergeben(), 'Rechnung der Firma (PDF) an die gewählte Rechnung hängen'] }[tab];
  const exp = ['lv', 'angebote', 'auftraege', 'uebersicht'].includes(tab) ? ['expBtn'] : null;
  const dru = tab === 'rechnungen' ? [() => { const r = reGewaehlt(); if (r) reDruck(r); else toast('Noch keine Rechnung.', true); }, !L || !(L.rechnungen || []).length, 'gewählte Rechnung drucken'] : tab === 'tueren' ? null : ['druBtn'];
  const slot = (x, label, ic, tipNein) => {
    if (!x) return [null, label, ic, true, tipNein];
    if (typeof x[0] === 'string') { const b = ribKnopf(x[0]); return b ? [x[0], label, ic, b.disabled, b.title || label] : [null, label, ic, true, tipNein]; }
    return [x[0], label, ic, !!x[1], x[2] || label];
  };
  const IC_VER = '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>';
  return [
    slot(imp, 'Import', IC_IMP, 'Hier gibt es nichts einzulesen'),
    slot(exp, 'Export', '<path d="M5 14v6h14v-6"/><path d="M12 15V4M8 8l4-4 4 4"/>', 'Export gibt es im Leistungsverzeichnis, bei Angeboten, Aufträgen und in der Kostenkontrolle'),
    slot(dru, 'Drucken', IC_DRU, 'Hier gibt es nichts zu drucken'),
    L && tab !== 'uebersicht' ? [() => lvVerlauf(), 'Verlauf', IC_VER, false, 'Verlauf des LV – alle Änderungen'] : [null, 'Verlauf', IC_VER, true, 'Erst ein LV wählen'],
    L && tab !== 'tueren' && tab !== 'uebersicht' ? [uLoeschen, 'Löschen', IC_DEL, false, uLoeschText() + ' – in den Papierkorb, mit Rückgängig', null, 'rot'] : [null, 'Löschen', IC_DEL, true, 'Hier gibt es nichts zu löschen'],
  ];
}
function uLeisteNeu() { befehle($('#bfl'), avaBefehle(), document.getElementById('kpi')); }   // Kennzahlen in der Mitte der Leiste – keine eigene Zeile mehr   // Befehlsleiste neu – nach jedem Zeichnen und wenn sich die Auswahl ändert
/* Befehlsleiste je Bereich (befehle.js): links das Fachliche, rechts immer Datei · Verlauf · Löschen · ⋯ (den Bereich rechts klappen die Reiter am Rand und sein ✕) */
const BIC = { plus: '<path d="M12 5v14M5 12h14"/>', num: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>', bk: '<path d="M4 20V10l8-6 8 6v10"/><path d="M9 20v-6h6v6"/>', qu: '<rect x="3" y="4" width="8" height="16" rx="1.5"/><path d="M15 8h6M15 12h6M15 16h4"/>',
  dok: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', lang: '<path d="M4 6h16M4 10h16M4 14h10M4 18h7"/>', vb: '<path d="M5 4h14v16H5z"/><path d="M9 8h6M9 12h6"/>', bieter: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>',
  nv: '<circle cx="12" cy="12" r="8.5"/><path d="M8 8l8 8"/>', ki: '<path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/>', ueb: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>', raum: '<path d="M3 21V8l9-5 9 5v13"/><path d="M8 21v-7h8v7"/>', re: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>' };
const uKnopf = ([x, t, ic, aus, tip, an, rot]) => ({ t, ic, tip, an, rot, aus: aus || !x, ...(typeof x === 'function' ? { fn: x } : typeof x === 'string' ? { attrs: `data-ucmd="${esc(x)}" data-udr` } : {}) });
function avaBefehle() {
  const S = uSlots(), bez = { lv: 'LV', angebote: 'Angebot', auftraege: 'Auftrag', aufmass: 'Rechnung', rechnungen: 'Rechnung', tueren: 'Türliste', uebersicht: 'Projekt' }[tab] || '';
  const rechts = [{ titel: 'Datei', rechts: true, knoepfe: S.slice(0, 3).map(uKnopf) },
    { titel: bez, rechts: true, knoepfe: [uKnopf(S[4]), ...uWeitere(), uKnopf(S[3])] }];
  return [...(L || tab === 'uebersicht' ? bereichBefehle() : []), ...rechts];
}
function bereichBefehle() {
  if (tab === 'lv' && L) return [
    { titel: 'Neu', knoepfe: [{ t: 'Gliederung', ic: BIC.plus, attrs: 'data-act="glied"', tip: 'Gliederungspunkt eine Ebene unter der markierten Zeile – markierte Positionen kommen hinein; oben auf das LV klicken für die oberste Ebene (GAEB: höchstens 4 Ebenen)' }, { t: 'Position', ic: BIC.plus, attrs: 'data-act="pos"', tip: 'Position nach der markierten Zeile' }] },
    { titel: 'Bearbeiten', knoepfe: [{ t: 'Nummerieren', ic: BIC.num, attrs: 'data-act="num"', tip: 'Ordnungszahlen neu vergeben – nach einem Schema wie in GAEB' }, { t: 'Aus Baukosten', ic: BIC.bk, attrs: 'data-act="bk"', tip: 'Bauteile mit Mengen und Preisen aus einer Kostenermittlung übernehmen' },
      { t: 'Kopierquelle', ic: BIC.qu, attrs: 'data-ucmd="quBtn" data-udr', an: quSichtbar(), tip: 'Ein LV aus einem anderen Projekt rechts daneben – Positionen herüberkopieren' },
      { t: 'Dokument ablegen', ic: BIC.dok, datei: { accept: DOK_ACCEPT, attrs: 'data-lvdokin' }, tip: 'LV oder Angebot als PDF, Scan, Foto oder Word rechts als Reiter „📄 Dokument“ – Zeilen anklicken übernimmt sie' }] },
    { titel: 'Ansicht', knoepfe: [{ t: 'Langtexte', ic: BIC.lang, attrs: 'data-act="alleLang"', an: OPEN.size > 0, tip: OPEN.size ? 'Langtexte zuklappen' : 'Alle Langtexte aufklappen' },
      L.data.vorbem ? { t: 'Vorbemerkungen', ic: BIC.vb, attrs: 'data-act="vorbem"', tip: 'Vorbemerkungen dieses LV (älterer Stand)' } : null] }];
  if (tab === 'angebote' && L) { const V = L.vergabe || {}, NV = V.nicht_vergeben || L.nicht_vergeben; return [
    { titel: 'Neu', knoepfe: [{ t: 'Bieter', ic: BIC.bieter, attrs: 'data-act="bieter"', tip: 'Bieter aus den Adressen hinzufügen' }] },
    { titel: 'Vergabe', knoepfe: [{ t: 'Nicht vergeben', ic: BIC.nv, attrs: 'data-act="nichtVergeben"', aus: !!(V.bieter || NV), tip: 'Ausgeschrieben, wird aber nicht beauftragt – zählt dann nicht mehr für Budget, Prognose und To-dos' }] }]; }
  if (tab === 'auftraege') { const x = auNtLv(), lv = x && (PC[x.id] || (L && L.id === x.id ? L : null)), aus = !x; return [
    { titel: 'Neu (Nachtrag)', knoepfe: [{ t: 'Gliederungspunkt', ic: BIC.plus, attrs: 'data-aunt="glied"', aus, tip: 'Neuer Nachtrag als Gliederungspunkt – Positionen kommen darunter' }, { t: 'Position', ic: BIC.plus, attrs: 'data-aunt="pos"', aus, tip: 'Nachtragsposition – in den gewählten Nachtrags-Gliederungspunkt, sonst als eigener Nachtrag' }] },
    { titel: 'Übernehmen', knoepfe: [{ t: 'Nachtragsangebot', ic: BIC.dok, attrs: 'data-aunt="ang"', aus, tip: 'Nachtragsangebot der Firma (GAEB X84, Excel, PDF oder Scan) lesen' }] },
    { titel: 'Nachträge', html: x && lv ? ntModusKopf(x.id, lv) : '<span class="hint" style="align-self:center;padding:0 .3rem">Auftrag wählen</span>' }]; }
  if (tab === 'aufmass' && L && vergeben()) { const B = amBelege(), z = amNurR && B.length ? 'pdf' : amNur ? 'am' : 'alle';
    const offen = B.reduce((n, b) => n + Object.values((b.auslese && b.auslese.pos) || {}).filter((y) => y.menge != null).length, 0);
    return [{ titel: 'Arbeitsweise', html: `<span class="seg" role="group" aria-label="Ansicht"><button type="button" class="${amAns === 'erfassen' ? 'on' : ''}" data-amans="erfassen">Aufmaß erfassen</button><button type="button" class="${amAns === 'baum' ? 'on' : ''}" data-amans="baum">Prüfung je Rechnung</button></span>` },
      amAns === 'erfassen' ? { titel: 'Übernehmen', knoepfe: [{ t: 'Mengen der Firma', ic: BIC.ueb, attrs: 'data-amueb="*"', aus: !(B.length && offen), tip: 'Für alle Positionen, bei denen die Firma mehr fordert als aufgemessen, die Differenz als Zeile „lt. Firma“ eintragen' }, { t: 'Aus dem Raumbuch', ic: BIC.raum, attrs: 'data-amraum="1"', tip: 'Flächen aus dem Raumbuch der Baukosten übernehmen' }] } : null,
      amAns === 'erfassen' && posOf().length ? { titel: 'Zeigen', html: `<span class="seg sm" role="group" aria-label="Welche Positionen zeigen"><button type="button" class="${z === 'alle' ? 'on' : ''}" data-amzeig="alle">Alle</button><button type="button" class="${z === 'am' ? 'on' : ''}" data-amzeig="am">Aufgemessene</button>${B.length ? `<button type="button" class="${z === 'pdf' ? 'on' : ''}" data-amzeig="pdf">In der Rechnung</button>` : ''}</span><button type="button" class="btn sm${amZw ? ' pri' : ''}" data-amzw title="Aufmaßzeilen (Datum, Ort, Rechenweg, Menge) als Zwischenzeilen unter jeder Position" style="margin-left:.4rem">Rechenweg ${amZw ? 'ein' : 'aus'}</button>` } : null]; }
  if (tab === 'rechnungen' && L) return [{ titel: 'Neu', knoepfe: [{ t: 'Rechnung', ic: BIC.re, attrs: 'data-uhaupt="reNeu"', aus: !vergeben(), tip: 'Neue Rechnung (Abschlag, Schluss, Nachtrag, Stundenlohn …)' }] }];
  return [];
}
function uLeiste() {
  UFN2 = [];
  return uSlots().map(([x, l, ic, aus, tip, an, rot]) => {
    const svg = `<svg viewBox="0 0 24 24">${ic || ''}</svg>`, cls = `btn sm ug${rot && !aus ? ' u-rot' : ''}${an ? ' on' : ''}`;
    if (typeof x === 'function') { UFN2.push(x); return `<button type="button" class="${cls}" data-ufn2="${UFN2.length - 1}"${aus ? ' disabled' : ''} title="${esc(tip)}"${an != null ? ` aria-pressed="${!!an}"` : ''}>${svg}${esc(l)}</button>`; }
    if (typeof x === 'string') return `<button type="button" class="${cls}" data-ucmd="${esc(x)}" data-udr${aus ? ' disabled' : ''} title="${esc(tip)}">${svg}${esc(l)}</button>`;
    return `<button type="button" class="${cls}" disabled title="${esc(tip)}">${svg}${esc(l)}</button>`; }).join('');
}
function uEng() {}   // (früher: Leiste in der Titelzeile zusammenklappen – macht jetzt befehle.js)
const ribKnopf = (sel) => document.querySelector(sel[0] === '[' ? '.rib ' + sel : '#' + sel);
document.addEventListener('click', (e) => {
  const m = document.querySelector('.umenu');
  const h = e.target.closest('[data-uhaupt]');
  if (h) { const a = h.dataset.uhaupt; if (a === 'new') return newDialog();
    if (a === 'auftrag') return auftragDialog();
    if (a === 'pos') { const b = ribKnopf('[data-act="pos"]'); if (b) b.click(); return; }
    if (a === 'reNeu') { e.stopPropagation(); return reNeuMenu(h); }
    const z = document.querySelector(`#view [data-act="${a}"]`); if (z) { z.scrollIntoView({ block: 'nearest' }); z.click(); } return; }
  if (e.target.closest('[data-umenu]')) {
    if (m) { m.remove(); return; }
    const d = document.createElement('div'); d.className = 'umenu'; d.setAttribute('role', 'menu');
    const eng = false;   // die Befehlsleiste klappt selbst zusammen (befehle.js)
    const sicht = uSicht();   // im Menü nicht doppelt
    UFN = [];
    const oben = eng ? [...uSlots().slice(0, 4).filter((x) => x[0]).map(([a, b, , c]) => [a, b, c]), '-'] : [];
    const unten = [...(eng && L && tab !== 'uebersicht' ? ['-', [() => lvVerlauf(), '🕘 Verlauf …', false]] : []), ...(eng && L && tab !== 'tueren' && tab !== 'uebersicht' ? ['-', [uLoeschen, '🗑 ' + uLoeschText(), false]] : [])];   // breit: „Löschen“ steht schon rot in der Leiste – nicht doppelt
    d.innerHTML = [...oben, ...uMenuPunkte().filter((x) => x === '-' || typeof x[0] === 'function' || !sicht.has(x[0])), ...unten].map((x) => { if (x === '-') return '<hr>';
      if (typeof x[0] === 'function') { UFN.push(x[0]); return `<button type="button" role="menuitem" data-ufn="${UFN.length - 1}"${x[2] ? ' disabled' : ''}>${esc(x[1])}</button>`; }
      const b = ribKnopf(x[0]); if (!b) return ''; return `<button type="button" role="menuitem" data-ucmd="${esc(x[0])}"${b.disabled ? ' disabled' : ''}>${(b.querySelector('svg') || {}).outerHTML || ''}${esc(x[1])}</button>`; }).join('');
    d.innerHTML = d.innerHTML.replace(/(<hr>)+/g, '<hr>').replace(/^<hr>|<hr>$/g, '');
    const lz = [...d.querySelectorAll('[data-ufn]')].pop(); if (lz && unten.length) lz.classList.add('u-rot');
    const r = e.target.closest('[data-umenu]').getBoundingClientRect(); document.body.appendChild(d);   // am Körper: Neuzeichnen der Leiste schließt es nicht
    Object.assign(d.style, { position: 'fixed', top: (r.bottom + 4) + 'px', left: Math.max(8, r.right - d.offsetWidth) + 'px', right: 'auto' }); return;
  }
  const f2 = e.target.closest('[data-ufn2]'); if (f2 && !f2.disabled) { const f = UFN2[+f2.dataset.ufn2]; if (f) f(); return; }
  const fz = e.target.closest('[data-ufn]');
  if (fz) { if (m) m.remove(); const f = UFN[+fz.dataset.ufn]; if (f && !fz.disabled) { e.stopPropagation(); f(); } return; }
  const c = e.target.closest('[data-ucmd]');
  if (c) {
    if (m) m.remove(); const b = ribKnopf(c.dataset.ucmd); if (!b || b.disabled) return;
    const r = (c.hasAttribute('data-udr') ? c : document.querySelector('[data-umenu]') || c).getBoundingClientRect(), vorher = new Set(document.querySelectorAll('.menu'));
    e.stopPropagation(); b.click();
    // Untermenüs (z. B. Drucken) hängen sonst am unsichtbaren Knopf der Werkzeugleiste – unter „⋯“ anzeigen
    setTimeout(() => document.querySelectorAll('.menu').forEach((x) => { if (vorher.has(x)) return; Object.assign(x.style, { position: 'fixed', top: (r.bottom + 4) + 'px', right: 'auto', bottom: 'auto', width: 'auto', minWidth: '16rem', maxWidth: '24rem' }); x.style.left = Math.max(8, r.right - x.offsetWidth) + 'px'; }), 0);
    return;
  }
  if (m && !e.target.closest('.umenu')) m.remove();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const m = document.querySelector('.umenu'); if (m) m.remove(); } });
/* Volltextsuche oben in der linken Spalte (statt in der Werkzeugleiste) */
setTimeout(() => { const q = document.querySelector('.rib .vqb'); if (q && $('#nsuche')) { $('#vq').placeholder = 'Suchen: LV, Firma, OZ, Text …'; $('#nsuche').appendChild(q); } }, 0);
/* Die Versionen stehen links im Projektbaum unter dem Projektnamen (die breite Leiste bleibt verborgen – nichts springt) */
function vlSicht() {
  const el = document.getElementById('bph-vl'); if (el) el.style.display = 'none';
  const box = document.getElementById('pjVer'); if (!box || !el || !el._o || !window.BPHead || !BPHead.versionsMenue) return;
  if (!VERS.length) { box.innerHTML = ''; return; }
  BPHead.versionsMenue({ ...el._o, in: box, wahlHinweis: 'Sie gilt dann für alle, die in diesem Projekt arbeiten (Startseite, To-dos, Kostenkontrolle).' });
}
function pjVerHtml() { return '<div id="pjVer" class="pjv"></div>'; }
async function loadList(want) {
  LIST = pid ? await lvListe() : [];
  vleiste();
  want = want || LS.get('lv:' + pid);
  const pick = LIST.find((x) => x.id === want) || LIST.find((x) => !x.archived) || LIST[0];
  if (pick) await openLv(pick.id); else { L = null; render(); }
}
async function openLv(id) {
  if (!L || L.id !== id) { LVSEL = new Set(); LVAKT = null; }
  L = await api('api/lv/' + id); LS.set('lv:' + pid, id); render(); histTrack();
}
/* Beauftragtes LV: die Positionen sind Vertragsinhalt – vor der ersten Änderung je LV warnen (Nachtrag ist meist der bessere Weg) */
const VWARN = { ok: new Set(), still: false };
async function vertragWarnen() {
  const firma = (L.vergabe && L.vergabe.bieter) || L.auftragnehmer || 'die Firma';
  const ja = await bpFrage(`Dieses LV ist an ${firma} beauftragt – die Positionen sind Vertragsinhalt.\nÄnderungen hier ändern den Auftrag rückwirkend; Aufmaß und Rechnungen rechnen mit den neuen Werten. Zusätzliche oder geänderte Leistungen besser als Nachtrag erfassen (Bereich „Aufträge“ → Nachtrag).`,
    { ok: 'Trotzdem ändern', abbrechen: 'Rückgängig' });
  if (!ja) histGo(-1);
}
function changed(draw = false) {
  if (tab === 'lv' && L && !VWARN.still && !VWARN.ok.has(L.id) && typeof vergeben === 'function' && vergeben()) { VWARN.ok.add(L.id); setTimeout(vertragWarnen, 0); }
  histTrack();
  $('#save').textContent = 'Nicht gespeichert …';
  clearTimeout(saveT); saveT = setTimeout(saveNow, 800);
  if (draw) render(); else { kpis(); sums(); }
}
async function saveNow(extra = {}) {
  if (!L) return;
  if (saving) { clearTimeout(saveT); saveT = setTimeout(() => saveNow(extra), 400); return; }
  saving = true; saveT = 0;
  try {
    const r = await api('api/lv/' + L.id, 'PUT', { rev: L.rev, data: L.data, ...extra });
    const struct = !!extra.nummerieren;
    L.rev = r.rev; L.calc = r.calc; L.vergabe = r.vergabe; L.status = r.status; L.name = r.name; L.nr = r.nr; L.gewerk = r.gewerk; L.archived = r.archived;
    if (struct) { L.data = r.data; render(); } else { kpis(); selBtn(); }
    const d = new Date(); $('#save').textContent = `✓ gespeichert ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch (e) {
    $('#save').textContent = 'Nicht gespeichert';
    if (e.data && e.data.conflict) { toast(e.message + ' Der neue Stand wird geladen.', true); await openLv(L.id); } else toast('Speichern fehlgeschlagen: ' + e.message, true);
  } finally { saving = false; }
}
async function flush() { if (saveT) { clearTimeout(saveT); saveT = 0; if ($('#save').textContent.startsWith('Nicht')) await saveNow(); } }
async function call(url, m, body) {   // Aktion auf dem Server, Antwort ist das ganze LV
  await flush();
  const r = await api(url, m, body); L = r; render(); histTrack(); if (r.hinweis) toast(r.hinweis); refreshList(); return r;
}
/* Felder eines LV zurücksetzen (Rückgängig) – ist es offen, über saveNow, sonst direkt */
async function lvSetzen(id, extra) {
  if (L && L.id === id) { await flush(); await saveNow(extra); await refreshList(); render(); return; }
  await api('api/lv/' + id, 'PUT', extra); await refreshList();
}
async function refreshList() { try { LIST = await lvListe(); selBtn(); einUeb(); if (PJTABS.has(tab) || tab === 'tueren') pjZeichnen(); if (!VERS.length && LIST.length) vleiste(); } catch { /* egal */ } }

/* ---------- Kopf ---------- */
function selBtn() {
  const x = L && LIST.find((y) => y.id === L.id);
  pickButton($('#sel'), L ? { title: `${L.nr ? L.nr + ' · ' : ''}${L.name}`, sub: [L.gewerk, STATUS.find((s) => s[0] === L.status)[1], L.vergabe.bieter ? 'an ' + L.vergabe.bieter : '', L.archived ? 'archiviert' : ''].filter(Boolean).join(' · ') }
    : { title: LIST.length ? 'LV wählen' : 'Noch kein Leistungsverzeichnis', sub: LIST.length ? `${LIST.length} im Projekt` : 'Mit „+ Neues LV“ anlegen' });
  ['impBtn', 'expBtn', 'druBtn', 'moreBtn'].forEach((k) => { $('#' + k).hidden = !L; });
}
$('#sel').addEventListener('click', () => pickMenu($('#sel'), {
  search: LIST.length > 6 ? 'LV suchen …' : '', empty: 'Noch kein LV in diesem Projekt.',
  items: LIST.map((x) => ({ group: x.archived ? 'Archiv' : 'Leistungsverzeichnisse', title: `${x.nr ? x.nr + ' · ' : ''}${x.name}`, sub: [x.gewerk, STATUS.find((s) => s[0] === x.status)[1], x.auftragnehmer, x.auftrag ? eur0(x.auftrag) : x.schaetzung ? 'Schätzung ' + eur0(x.schaetzung) : ''].filter(Boolean).join(' · '), value: x.id, on: L && L.id === x.id })),
  footer: '<button class="btn sm" data-new>+ Neues LV</button>', onPick: (v) => openLv(v), onFooter: (e) => { if (e.target.closest('[data-new]')) newDialog(); },
}));
/* Ablauf des LV als schmale Leiste über den Kennzahlen: welche Stufe erreicht ist, ergibt sich aus dem Inhalt; der „Stand“ rechts bleibt von Hand.
   Ein Klick öffnet den passenden Bereich. Eigene Form (Balken in Stufen, Ocker) – bewusst anders als Honorar (Pfeil-Kästen) und Baukosten (Punkte). */
function avStufen(K, nt) {
  const st = L.status, nv = st === 'nicht_vergeben';
  const S = [['LV', 'lv', true], ['Versand', 'lv', ['versendet', 'vergeben', 'abgerechnet'].includes(st) || L.angebote.length > 0],
    ['Angebote', 'angebote', L.angebote.length > 0], ['Vergabe', 'auftraege', vergeben()], ['Ausführung', 'aufmass', vergeben() && (K.leistung > 0 || nt.beauftragt > 0)],
    ['Abrechnung', 'rechnungen', K.abgerechnet > 0 || st === 'abgerechnet']];
  let cur = 0; S.forEach((x, i) => { if (x[2]) cur = i; });
  const L2 = nv ? S.slice(0, 3).concat([['nicht vergeben', 'angebote', true]]) : S;
  if (nv) cur = 3;
  const hier = L2.findIndex(([, t]) => t === tab);   // die Ansicht links (Navigation) – „Versand“ teilt sich die Ansicht mit dem LV, markiert wird das LV
  return L2.map(([n, t, ok], i) => `<button type="button" class="${i === cur ? 'cur' : ok && i < cur ? 'ok' : ''}${nv && i === 3 ? ' nv' : ''}${i === hier ? ' hier' : ''}" data-tab="${t}"${i === hier ? ' aria-current="page"' : ''} title="${esc(n)}${i === cur ? ' – aktueller Stand' : ''} – Bereich öffnen">${esc(n)}</button>`).join('');
}
function kpis() {
  { const f = $('#phFirma'); if (f) { const V = L && L.vergabe || {}, firma = V.bieter || (L && L.auftragnehmer) || ''; const an = L && (V.preise || V.frei) && firma;
      f.hidden = false; f.className = 'ph-firma' + (an ? '' : L && NURLV.has(tab) ? ' nv' : ' leer');
      if (!an) f.textContent = L && NURLV.has(tab) ? 'noch nicht vergeben' : ''; if (an) f.innerHTML = V.aufgehoben ? `⏸ ${esc(firma)} <small>Beauftragung aufgehoben</small>` : `${esc(firma)} <small>${V.frei && !V.preise ? 'Auftrag frei eingetragen' : 'beauftragt' + (V.datum ? ' am ' + de(V.datum) : '')}</small>`; f.title = f.textContent.replace(/\s+/g, ' ').trim(); } }
  if (!L) { $('#kpi').innerHTML = ''; $('#stat').innerHTML = ''; $('#avStufen').innerHTML = ''; return; }
  const K = L.calc, best = K.angebote.filter((a) => a.summe).sort((a, b) => a.netto - b.netto)[0], bA = best && L.angebote.find((a) => a.id === best.id);
  const nt = K.nachtraege, ges = K.auftrag + nt.beauftragt;
  const KZ = {};   // je Kennzahl ein Kästchen – Reihenfolge per Ziehen, je Browser gemerkt
  KZ.sch = `<small>Schätzung</small><b>${eur0(K.schaetzung)}</b>${K.ohne_schaetzung ? `<span class="sub"> · ${K.ohne_schaetzung} Pos. ohne Preis</span>` : ''}`;
  KZ.best = `<small>Bestes Angebot</small><b>${best ? eur0(best.netto) : '–'}</b><span class="sub">${bA ? ' · ' + esc(bA.bieter) : L.angebote.length ? '' : ' · noch keine'}</span>`;
  KZ.auf = `<small>Auftrag</small><b>${aufgehoben() ? '⏸ aufgehoben' : L.vergabe.preise ? eur0(K.auftrag) : '–'}</b>${vergeben() && K.schaetzung ? `<span class="sub"> · ${Math.round((K.auftrag / K.schaetzung - 1) * 100)} % zur Schätzung</span>` : ''}`;
  KZ.nt = `<small>Nachträge beauftragt</small><b>${nt.beauftragt ? eur0(nt.beauftragt) : '–'}</b>${nt.angemeldet ? `<span class="sub"> · angemeldet ${eur0(nt.angemeldet)}</span>` : ''}`;
  KZ.leist = `<small>Leistungsstand</small><b>${K.leistung ? eur0(K.leistung) : '–'}</b>${ges && K.leistung ? `<span class="sub"> · ${Math.round(K.leistung / ges * 100)} %</span>` : ''}`;
  KZ.abg = `<small>abgerechnet</small><b>${K.abgerechnet ? eur0(K.abgerechnet) : '–'}</b>`;
  const ord = LS.get('kzOrd', []), keys = Object.keys(KZ).sort((a, b) => { const ia = ord.indexOf(a), ib = ord.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); });
  $('#kpi').innerHTML = keys.map((k) => `<div draggable="true" data-kz="${k}" title="${esc(KZ[k].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())} – zum Umsortieren ziehen">${KZ[k]}</div>`).join('');
  requestAnimationFrame(() => { document.querySelectorAll('#kpi > div').forEach((d) => { const b = d.querySelector('b'); d.style.minWidth = b ? Math.ceil(b.getBoundingClientRect().width + 44) + 'px' : ''; }); if (typeof uEng === 'function') uEng(); });   // der Betrag bleibt immer ganz
  if (typeof gaebSchwebeSetzen === 'function') gaebSchwebeSetzen();   // Warnzeichen „GAEB“ über der ersten Kennzahl
  $('#avStufen').innerHTML = avStufen(K, nt);
  $('#stat').innerHTML = `<button type="button" class="st-w" data-stwahl title="Stand des LV ändern">Stand: <b>${esc((STATUS.find((x) => x[0] === L.status) || [, L.status])[1])}</b> ▾</button>`;
}
/* Kennzahlen im Kopf: Reihenfolge einfach durch Ziehen ändern (ohne Bearbeiten-Modus), Schieber teilt den Platz mit den Befehlen */
(() => {
  let zk = null;
  const kpiEl = () => document.getElementById('kpi');
  document.addEventListener('dragstart', (e) => { const d = e.target.closest && e.target.closest('#kpi > div[data-kz]'); if (!d) return; zk = d.dataset.kz; d.classList.add('zieh'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', zk); } catch { /* egal */ } });
  const weg = () => document.querySelectorAll('#kpi > div').forEach((x) => x.classList.remove('zieh', 'ziel-l', 'ziel-r'));
  document.addEventListener('dragover', (e) => { if (!zk) return; const d = e.target.closest && e.target.closest('#kpi > div[data-kz]'); if (!d) return; e.preventDefault(); const r = d.getBoundingClientRect(), re = e.clientX > r.left + r.width / 2; document.querySelectorAll('#kpi > div').forEach((x) => x.classList.remove('ziel-l', 'ziel-r')); if (d.dataset.kz !== zk) d.classList.add(re ? 'ziel-r' : 'ziel-l'); });
  document.addEventListener('drop', (e) => { if (!zk) return; const d = e.target.closest && e.target.closest('#kpi > div[data-kz]'); if (!d) return; e.preventDefault(); e.stopPropagation();
    const r = d.getBoundingClientRect(), re = e.clientX > r.left + r.width / 2, k = [...kpiEl().children].map((x) => x.dataset.kz).filter((x) => x !== zk);
    if (d.dataset.kz !== zk) { k.splice(k.indexOf(d.dataset.kz) + (re ? 1 : 0), 0, zk); LS.set('kzOrd', k); const ch = Object.fromEntries([...kpiEl().children].map((x) => [x.dataset.kz, x])); k.forEach((x) => kpiEl().appendChild(ch[x])); }
    weg(); zk = null; }, true);
  document.addEventListener('dragend', () => { if (zk) { weg(); zk = null; } });
})();
/* ---------- Ein Ablagefeld für die ganze AVA: Datei erkennen (Art, Firma, Projekt, LV), nachfragen, an die richtige Stelle ---------- */
const DOKN = { angebot: 'Angebot', rechnung: 'Rechnung', aufmass: 'Aufmaß', lv: 'Leistungsverzeichnis (Muster-LV)', buergschaft: 'Bürgschaft (Sicherheit)' };
async function avaDokumente(files) { for (const f of [...files]) { const ok = await avaDokument(f); if (ok === false) break; } }
async function avaDokument(f) {
  const fd = new FormData(); fd.append('datei', f); if (pid) fd.append('project_id', pid); if (pid && vSicht()) fd.append('version_id', vSicht());
  toast(`„${f.name}“ wird gelesen …`);
  let E;
  try {
    const r = await fetch('api/ava/erkennen', { method: 'POST', body: fd, credentials: 'same-origin' });
    E = await r.json().catch(() => null);
    if (!E) throw new Error(r.status === 413 ? 'Die Datei ist für den Webserver zu groß.' : r.status === 504 || r.status === 502 ? 'Das Lesen hat zu lange gedauert.' : `Antwort ${r.status} vom Server.`);
    if (!r.ok) throw new Error(E.error || 'Fehler ' + r.status);
  } catch (e) {   // Erkennen ging nicht – trotzdem fragen, wohin die Datei soll (Art, Projekt, LV von Hand)
    if (/zu groß/.test(e.message) && !/Webserver/.test(e.message)) { toast(e.message, true); return; }
    E = { name: f.name, format: /\.pdf$/i.test(f.name) ? 'pdf' : '', dok: '', sicher: false, projekte: [], lvs: [], firma: '', hinweis: `Automatisch erkennen ging nicht (${e.message}) – bitte Art, Projekt und LV wählen.` };
  }
  if (!KONT) KONT = await api('api/kontakte').catch(() => []);
  // Vorgabe = wo ich gerade arbeite (Bereich, LV, Firma des Auftrags); die Texterkennung füllt nur Lücken und meldet Widersprüche als Hinweis
  const KX = { dok: { angebote: 'angebot', aufmass: 'rechnung', rechnungen: 'rechnung', lv: 'lv', auftraege: 'rechnung' }[tab] || '', lv: L && L.project_id === pid ? L.id : null,
    firma: L && L.project_id === pid ? ((L.vergabe && L.vergabe.bieter) || L.auftragnehmer || '') : '' };
  const OCR = { dok: E.sicher ? E.dok : '', firma: E.firma || '', lv: ((E.lvs || []).filter((x) => x.treffer || x.firma).sort((a, b) => (b.treffer || 0) - (a.treffer || 0))[0] || {}).id || null };
  if (KX.dok) E.dok = KX.dok;
  if (KX.firma) E.firma = KX.firma;
  return new Promise((fertig) => {
    let projId = pid || (E.projekte[0] || {}).id || null, lvs = E.lvs || [];   // abgelegt wird im Projekt, in dem ich gerade bin
    const ABL = { ordner: null, hand: false, tok: 0 };
    const ablZeigen = () => { const el = bg.querySelector('#adAblPfad'); if (!el) return;
      el.innerHTML = ABL.fehler ? `<span style="color:#e07b3a">${esc(ABL.fehler)}</span>` : ABL.ordner ? `📁 ${ABL.ordner.map((x, i) => `<span${ABL.neu && ABL.neu[i] ? ' class="ad-neu" title="wird angelegt"' : ''}>${esc(x)}</span>`).join(' / ')}${ABL.hand ? ' <small>(von Hand)</small>' : ''}${ABL.neu && ABL.neu.some(Boolean) ? ' <small>– kursiv: wird angelegt</small>' : ''}` : 'wird gesucht …'; };
    const ablSuchen = async () => {
      if (ABL.hand || !projId) return ablZeigen();
      const my = ++ABL.tok, art = bg.querySelector('#adArt').value, x = lvs.find((y) => y.id === +bg.querySelector('#adLv').value);
      ABL.ordner = null; ABL.fehler = ''; ablZeigen();
      const r = await api(`api/ablage/vorschlag?project_id=${projId}&art=${art}&firma=${encodeURIComponent(bg.querySelector('#adFirma').value.trim())}&gewerk=${encodeURIComponent(x ? x.name : '')}`).catch((e) => ({ ok: false, error: e.message }));
      if (my !== ABL.tok) return;
      if (r.ok && Array.isArray(r.ordner)) { ABL.ordner = r.ordner; ABL.neu = r.neu; } else ABL.fehler = r.error || 'Ablage nicht erreichbar';
      ablZeigen();
    };
    const projOpts = () => `${E.projekte.length ? `<optgroup label="erkannt">${E.projekte.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>` : ''}
      <optgroup label="alle Projekte">${PROJ.filter((p) => !p.archived && !E.projekte.some((q) => q.id === p.id)).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</optgroup><option value="neu">＋ neues Projekt anlegen …</option>`;
    const lvOpts = (art) => `${lvs.filter((x) => x.project_id === projId).map((x) => `<option value="${x.id}">${esc([x.nr, x.name].filter(Boolean).join(' '))}${x.bieter ? ' · ' + esc(x.bieter) : ''}${x.treffer ? ` · ${x.treffer} Pos. passen` : ''}${x.firma ? ' · Firma passt' : ''}</option>`).join('')}${art === 'lv' || art === 'rechnung' || art === 'angebot' ? `<option value="neu">＋ neues LV${art === 'rechnung' ? ' (Rechnung ohne LV)' : art === 'angebot' ? ' aus diesem Angebot' : ''}</option>` : ''}`;
    const was = [E.format === 'gaeb' ? `GAEB X${E.dp}` : E.format === 'excel' ? 'Excel' : E.ocr ? 'PDF-Scan (Texterkennung)' : 'PDF', E.n_pos ? `${E.n_pos} Positionen` : '', E.regie ? 'Regie/Stundenlohn' : '', E.schluss ? 'Schlussrechnung' : '', E.nachtrag ? 'Nachtrag' : ''].filter(Boolean).join(' · ');
    const bg = modalBox(`<h3>Dokument ablegen</h3><p class="hint" style="margin:0 0 .6rem"><b>${esc(f.name)}</b> · ${esc(was)}${E.sicher ? '' : ' · <span style="color:#e07b3a">Art nicht sicher erkannt – bitte prüfen</span>'}${E.hinweis ? ' · ' + esc(E.hinweis) : ''}</p>
      <div class="fm"><label for="adArt">Was ist es?</label><select id="adArt">${Object.entries(DOKN).map(([k, l]) => `<option value="${k}"${k === (E.dok || 'rechnung') ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label for="adProj">Projekt</label>${pid ? `<div style="align-self:center"><b>${esc((PROJ.find((p) => p.id === pid) || {}).name || 'aktuelles Projekt')}</b></div><select id="adProj" hidden><option value="${pid}">aktuell</option></select>` : `<select id="adProj" data-bp-projekte>${projOpts()}</select>`}
      <label for="adLv">LV / Auftrag</label><select id="adLv"></select>
      <label for="adFirma">Firma</label><input id="adFirma" list="adFirmen" value="${esc(E.firma || '')}" placeholder="Bieter / Auftragnehmer"><datalist id="adFirmen">${(KONT || []).map((k) => `<option value="${esc(k.name)}">`).join('')}</datalist>
      <label style="align-self:start;padding-top:.15rem">Projektordner</label><div class="ad-abl"><span id="adAblPfad" class="hint">wird gesucht …</span><span class="ad-abl-k"><button class="btn sm" type="button" id="adAblWahl" title="Ordner selbst wählen">ändern …</button><label class="hint ad-nein"><input type="checkbox" id="adAblNein"> nicht ablegen</label></span></div></div>
      <p class="hint ad-wid" id="adWid" hidden></p>
      <p class="hint" id="adWohin" style="margin:.5rem 0 0"></p>
      <div class="acts"><button class="btn" data-m="x">${files_rest() ? 'Überspringen' : 'Abbrechen'}</button><button class="btn pri" data-m="ok">Ablegen</button></div>`, async (m, bg, close) => {
      if (m === 'x') { close(); fertig(); return; }
      if (m !== 'ok') return;
      const art = bg.querySelector('#adArt').value, lvv = bg.querySelector('#adLv').value, firma = bg.querySelector('#adFirma').value.trim();
      if (!projId) { toast('Bitte ein Projekt wählen.', true); return; }
      const ordner = bg.querySelector('#adAblNein').checked ? 'nein' : ABL.ordner && ABL.ordner.length ? ABL.ordner : null;
      close();
      let ok = true;
      try { await avaAblegen(f, E, { art, projId, lv: lvv === 'neu' || !lvv ? null : +lvv, firma, ordner }); } catch (e) { ok = false; toast(e.message, true); }
      fertig(ok ? 'ok' : undefined);
    });
    // Widerspricht die Texterkennung der Vorgabe, nur ein Hinweis mit „Dorthin“ – umgestellt wird nichts von selbst
    const widerspruch = () => {
      const el = bg.querySelector('#adWid'); if (!el) return;
      const T = [], lvO = OCR.lv && KX.lv && OCR.lv !== KX.lv ? lvs.find((y) => y.id === OCR.lv) : null;
      if (OCR.dok && KX.dok && OCR.dok !== KX.dok) T.push(`als <b>${esc(DOKN[OCR.dok] || OCR.dok)}</b> erkannt`);
      if (OCR.firma && KX.firma && OCR.firma.toLowerCase() !== KX.firma.toLowerCase()) T.push(`Firma <b>${esc(OCR.firma)}</b>`);
      if (lvO) T.push(`passt eher zu <b>${esc([lvO.nr, lvO.name].filter(Boolean).join(' '))}</b>`);
      el.hidden = !T.length;
      el.innerHTML = T.length ? `ⓘ Im Dokument: ${T.join(' · ')}. <button type="button" class="btn sm" id="adDorthin">Dorthin</button>` : '';
    };
    bg.addEventListener('click', (e) => {
      if (!e.target.closest('#adDorthin')) return;
      if (OCR.dok) bg.querySelector('#adArt').value = OCR.dok;
      if (OCR.firma) { bg.querySelector('#adFirma').value = OCR.firma; fAuto = null; }
      zeichne().then(() => { const sel = bg.querySelector('#adLv'); if (OCR.lv && [...sel.options].some((o) => o.value === String(OCR.lv))) { sel.value = String(OCR.lv); zeichne(); } });
      bg.querySelector('#adWid').hidden = true;
    });
    const zeichne = async () => {
      const art = bg.querySelector('#adArt').value;
      if (projId && !lvs.some((x) => x.project_id === projId)) {   // LVs des gewählten Projekts nachladen
        const L2 = await api('api/lv?project_id=' + projId + (projId == pid && vSicht() ? '&version_id=' + vSicht() : '')).catch(() => []);
        lvs = lvs.concat(L2.filter((x) => !x.archived).map((x) => ({ id: x.id, project_id: projId, nr: x.nr, name: x.name, bieter: x.auftragnehmer, vergeben: x.vergeben, treffer: 0 })));
      }
      bg.querySelector('#adProj').value = projId ? String(projId) : '';
      const sel = bg.querySelector('#adLv'), alt = sel.value; sel.innerHTML = lvOpts(art); if ([...sel.options].some((o) => o.value === alt)) sel.value = alt;
      if (!zeichne.lv) { zeichne.lv = 1; const st = KX.lv || OCR.lv; if (st && [...sel.options].some((o) => o.value === String(st))) sel.value = String(st); widerspruch(); }
      if ((art === 'lv' || art === 'angebot') && !sel.value) sel.value = 'neu';
      const x = lvs.find((y) => y.id === +sel.value);
      ablSuchen();
      bg.querySelector('#adWohin').innerHTML = art === 'buergschaft' ? `Kommt zu den Sicherheiten des Auftrags (VOB/B § 17)${E.buergschaft && E.buergschaft.betrag ? ` – erkannt: ${E.buergschaft.art === 'ma' ? 'Mängelansprüche' : E.buergschaft.art === 've' ? 'Vertragserfüllung' : 'Art unklar'}, ${eur(E.buergschaft.betrag)}${E.buergschaft.buerge ? ', ' + esc(E.buergschaft.buerge) : ''}` : ''}. Die Angaben werden danach zum Prüfen gezeigt; ein noch einbehaltener Betrag kann gegen die Bürgschaft freigegeben werden.`
        : art === 'lv' ? (sel.value === 'neu' ? 'Wird als neues LV angelegt' + (E.format === 'pdf' ? ' – die PDF steht dann rechts daneben: erkannte Positionen übernehmen oder Zeile für Zeile anklicken.' : '.') : 'Positionen werden an das gewählte LV angehängt.')
        : art === 'angebot' && sel.value === 'neu' ? 'Aus dem Angebot wird ein neues LV erzeugt (Positionen, Mengen, Preise als Schätzung) – danach kann es als Angebot der Firma eingetragen werden.'
        : art === 'angebot' ? 'Preise werden als Angebot der Firma eingetragen (Zuordnung über die Ordnungszahl) – danach im Preisspiegel.'
        : sel.value === 'neu' ? 'Neues LV ohne Positionen, Auftrag frei an die Firma – die Rechnung wird mit dem Betrag erfasst (Kostenkontrolle).'
        : `Kommt als PDF zur ${x && !x.vergeben ? 'Rechnung (das LV ist noch nicht vergeben – Auftrag wird frei an die Firma eingetragen)' : 'offenen Rechnung des Auftrags'} und wird in der Aufmaßprüfung neben der Prüfung angezeigt.`;
    };
    bg.addEventListener('change', async (e) => {
      if (e.target.id === 'adProj') {
        if (e.target.value === 'neu') {
          e.target.value = projId ? String(projId) : '';
          if (window.BPHead && BPHead.projektBearbeiten) BPHead.projektBearbeiten(null, { name: E.projekt_vorschlag || '', onSaved: async (nid) => { PROJ = await api('api/projekte'); projId = nid; bg.querySelector('#adProj').innerHTML = projOpts(); zeichne(); } });
          return;
        }
        projId = +e.target.value;
      }
      if (e.target.id === 'adLv' || e.target.id === 'adArt') firmaAusLv();
      zeichne();
    });
    // Rechnung/Aufmaß zu einem vergebenen LV: die Firma ist der Auftragnehmer – eintragen, solange nicht selbst getippt
    let fAuto = null;
    const firmaAusLv = () => { const fi = bg.querySelector('#adFirma'), art = bg.querySelector('#adArt').value, x = lvs.find((y) => y.id === +bg.querySelector('#adLv').value);
      if (art === 'angebot' || !x || !x.bieter || !fi) return;
      if (!fi.value.trim() || fi.value === fAuto) { fi.value = x.bieter; fAuto = x.bieter; clearTimeout(ABL.t); ABL.t = setTimeout(ablSuchen, 100); } };
    setTimeout(firmaAusLv, 0);
    bg.addEventListener('input', (e) => { if (e.target.id === 'adFirma') { fAuto = null; clearTimeout(ABL.t); ABL.t = setTimeout(ablSuchen, 500); } });
    bg.addEventListener('click', async (e) => {
      if (!e.target.closest('#adAblWahl')) return;
      const w = await ordnerWahl(projId, ABL.ordner ? ABL.ordner.filter((_, i) => !(ABL.neu && ABL.neu[i])) : []);
      if (w) { ABL.ordner = w; ABL.neu = null; ABL.hand = true; ABL.fehler = ''; bg.querySelector('#adAblNein').checked = false; ablZeigen(); }
    });
    zeichne();
  });
  function files_rest() { return false; }
}
/* Ordner im Projektordner selbst wählen: durchklicken, neuen Ordner anlegen, „hier ablegen“ */
function ordnerWahl(projId, start) {
  return new Promise((fertig) => {
    let pfad = [...(start || [])], neu = [];
    const bg = modalBox(`<h3>Ordner wählen</h3><div id="owPfad" class="hint" style="margin:0 0 .4rem"></div><div id="owListe" class="ow-l">Lade …</div>
      <div class="acts"><button class="btn" data-m="ordner">＋ neuer Ordner</button><span style="flex:1"></span><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Hier ablegen</button></div>`, async (m, bg, close) => {
      if (m === 'x') { close(); fertig(null); return; }
      if (m === 'ok') { close(); fertig([...pfad, ...neu]); return; }
      if (m === 'ordner') { const n = await bpEingabe('Name des neuen Ordners (wird beim Ablegen angelegt):', ''); if (n && n.trim()) { neu.push(n.trim().replace(/[\\/:*?"<>|]/g, ' ')); zeichne(); } }
    });
    async function zeichne() {
      const ganz = [...pfad, ...neu];
      bg.querySelector('#owPfad').innerHTML = `<a href="#" data-ow="-1">📁 Projektordner</a>${ganz.map((x, i) => ` / <a href="#" data-ow="${i}">${esc(x)}</a>`).join('')}`;
      const L_ = bg.querySelector('#owListe');
      if (neu.length) { L_.innerHTML = '<p class="hint">Neuer Ordner – noch leer.</p>'; return; }
      L_.textContent = 'Lade …';
      const r = await api(`api/ablage/ordner?project_id=${projId}&pfad=${encodeURIComponent(pfad.join('/'))}`).catch((e) => ({ ok: false, error: e.message }));
      if (!r.ok || !Array.isArray(r.ordner)) { L_.innerHTML = `<p style="color:#e07b3a">${esc(r.error || 'Ablage nicht erreichbar')}</p>`; return; }
      L_.innerHTML = (pfad.length ? '<button class="ow-o" data-owauf="1">⬑ eine Ebene höher</button>' : '') + (r.ordner.length ? r.ordner.map((d) => `<button class="ow-o" data-owin="${esc(d)}">📁 ${esc(d)}</button>`).join('') : '<p class="hint">Keine Unterordner.</p>');
    }
    bg.addEventListener('click', (e) => {
      const a = e.target.closest('[data-ow]'); if (a) { e.preventDefault(); const i = +a.dataset.ow, ganz = [...pfad, ...neu].slice(0, i + 1); pfad = ganz.slice(0, Math.min(ganz.length, pfad.length)); neu = ganz.slice(pfad.length); zeichne(); return; }
      const o = e.target.closest('[data-owin]'); if (o) { pfad.push(o.dataset.owin); zeichne(); return; }
      if (e.target.closest('[data-owauf]')) { pfad.pop(); zeichne(); }
    });
    zeichne();
  });
}
async function projGehe(id) {
  if (id === pid) return;
  await flush(); pid = id; LS.set('pid', pid); if (window.BPHead) await BPHead.projektSetzen(pid);
  if (!PROJ.some((p) => p.id === id)) PROJ = await api('api/projekte');
  const sel = $('#proj'); if (sel && ![...sel.options].some((o) => +o.value === id)) { const o = document.createElement('option'); o.value = id; o.textContent = (PROJ.find((p) => p.id === id) || {}).name || ''; sel.appendChild(o); } if (sel) sel.value = String(id);
  LIST = await lvListe(); vleiste();
}
async function avaAblegen(f, E, o) {
  const vonRe = tab === 'rechnungen' && L && o.lv === L.id && o.projId === pid ? reGewaehlt() : null;   // aus „Rechnungen“ heraus: an die gewählte Rechnung hängen
  await projGehe(o.projId);
  const K = (KONT || []).find((k) => k.name.toLowerCase() === (o.firma || '').toLowerCase());
  let lvId = o.lv;
  if (!lvId) {   // neues LV
    const name = (o.art === 'lv' || o.art === 'angebot' ? E.lv_name : '') || (o.art === 'rechnung' ? (o.firma || 'Rechnung') : o.art === 'angebot' && o.firma ? `Angebot ${o.firma}` : f.name.replace(/\.[^.]+$/, ''));
    const r = await api('api/lv', 'POST', { project_id: o.projId, name, gewerk: K ? K.trade || '' : '', nr: String(LIST.length + 1).padStart(2, '0'), ...(o.projId === pid && vSicht() ? { version_id: vSicht() } : {}) }); lvId = r.id;
    if (o.art === 'rechnung') await api(`api/lv/${lvId}/vergabe`, 'POST', { frei: true, bieter: o.firma || 'Firma', contact_id: K ? K.id : null, summe: 0, einbehalt: 0 });
    await refreshList();
  }
  await openLv(lvId);
  const ablegen = async () => {   // Angebot / LV: Datei zusätzlich in den Projektordner
    if (o.ordner === 'nein') return;
    const fd = new FormData(); fd.append('datei', f); fd.append('project_id', o.projId); fd.append('art', o.art); fd.append('firma', o.firma || ''); fd.append('gewerk', L ? L.gewerk || L.name : '');
    if (Array.isArray(o.ordner)) fd.append('ordner', JSON.stringify(o.ordner));
    try { const r = await fetch('api/ablage', { method: 'POST', body: fd, credentials: 'same-origin' }), j = await jsonAus(r); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status); toast('Im Projektordner abgelegt: ' + j.pfad); }
    catch (e) { toast('Nicht im Projektordner abgelegt: ' + e.message, true); }
  };
  if (o.art === 'lv' || (o.art === 'angebot' && !o.lv)) {   // LV – auch neu aus einem Angebot
    tab = 'lv'; LS.set('tab', tab); render();
    const ausAng = o.art === 'angebot';
    if (E.format === 'gaeb' || E.format === 'excel') {
      IMP = { ziel: 'lv', ersetzen: false }; await doImport(f);
      if (ausAng && posOf().length && await bpFrage(`Die Preise auch als Angebot von „${o.firma || 'Firma'}“ eintragen?`, { ok: 'Eintragen' })) { IMP = { ziel: 'angebot', bieter: o.firma, contact_id: K ? K.id : null }; await doImport(f); }
      IMP = null;
    } else {
      const d = await lvDokHoch(lvId, f, { uebernehmen: ausAng });   // PDF/Scan/Foto/Word: rechts daneben, Positionen erkennen oder Zeile für Zeile übernehmen
      if (ausAng && d && !d.laeuft && d.n_pos >= 3) setTimeout(async () => {
        if (!(await bpFrage(`Die Preise auch als Angebot von „${o.firma || 'Firma'}“ eintragen (Preisspiegel)?`, { ok: 'Eintragen' }))) return;
        try {
          await flush(); await angebotPdf(lvId, f, o.firma || f.name, K ? K.id : null);
        } catch (e) { toast(e.message, true); }
      }, 1500);
    }
    await ablegen(); return;
  }
  if (o.art === 'angebot') {
    tab = 'angebote'; LS.set('tab', tab); render();
    if (E.format === 'pdf' || E.format === '') { await angebotPdf(lvId, f, o.firma || f.name, K ? K.id : null); await ablegen(); return; }
    IMP = { ziel: 'angebot', bieter: o.firma, contact_id: K ? K.id : null }; await doImport(f); await ablegen(); return;
  }
  if (o.art === 'buergschaft') {   // Bürgschaftsurkunde zu den Sicherheiten des Auftrags
    if (!vergeben()) { await call(`api/lv/${lvId}/vergabe`, 'POST', { frei: true, bieter: o.firma || 'Firma', contact_id: K ? K.id : null, summe: 0, einbehalt: 0 }); toast(`Auftrag frei an „${o.firma || 'Firma'}“ eingetragen.`); }
    tab = 'rechnungen'; LS.set('tab', tab); render();
    await buergschaftHoch(f, { ordner: o.ordner, erkannt: E.buergschaft }); return;
  }
  // Rechnung / Aufmaß: PDF in die Aufmaßprüfung (offene Rechnung, sonst neue)
  if (E.format !== 'pdf') throw new Error('Rechnungen und Aufmaße bitte als PDF ablegen.');
  if (vonRe && vonRe.status !== 'geprueft') { tab = 'rechnungen'; LS.set('tab', tab); render(); await reBelegHoch(vonRe.id, f); return; }
  if (!vergeben()) { await call(`api/lv/${lvId}/vergabe`, 'POST', { frei: true, bieter: o.firma || 'Firma', contact_id: K ? K.id : null, summe: 0, einbehalt: 0 }); toast(`Auftrag frei an „${o.firma || 'Firma'}“ eingetragen.`); }
  if (!L.rechnungen.some((r) => r.status !== 'geprueft') && E.regie && !(L.calc.auftrag && posOf().length)) await call(`api/lv/${L.id}/rechnungen`, 'POST', { art: 'regie' });
  if (!L.rechnungen.some((r) => r.status !== 'geprueft') && E.schluss) await call(`api/lv/${L.id}/rechnungen`, 'POST', { art: 'schluss' });
  tab = 'aufmass'; amAns = 'erfassen'; LS.set('tab', tab); render();
  AMABL = { ordner: o.ordner, art: o.art }; try { await amBelegHoch([f]); } finally { AMABL = null; }
}
/* ---------- Eingangsordner auf dem Server (z. B. Scans vom Kopierer): beim Wechsel in die AVA nachsehen und fragen ---------- */
var EINGANG = { n: 0, t: 0 };   // var: wird schon beim ersten Zeichnen gelesen
const eingangSpaeter = () => { try { return new Set(JSON.parse(sessionStorage.getItem('avaEingangSpaeter') || '[]')); } catch { return new Set(); } };
const eingangKey = (x) => x.name + '|' + x.mtime;
async function eingangPruefen(manuell) {
  if (!manuell && Date.now() - EINGANG.t < 60000) return;
  EINGANG.t = Date.now();
  let r; try { r = await api('api/eingang'); } catch (e) { if (manuell) toast(e.message, true); return; }
  if (r.aus) { if (manuell) toast('Kein Eingangsordner eingerichtet (Verwaltung → Einstellungen → Ablage).', true); return; }
  if (!r.ok) { if (manuell) toast(r.error || 'Eingangsordner nicht erreichbar.', true); return; }
  const D = r.dateien || [], sp = eingangSpaeter(), neu = D.filter((x) => !sp.has(eingangKey(x)));
  EINGANG.n = D.length; const b = document.querySelector('[data-eingangn]'); if (b) b.innerHTML = D.length ? `<span class="nz">${D.length}</span>` : '';
  if (manuell || neu.length) eingangDialog(D, new Set(neu.map(eingangKey)));
}
function eingangDialog(D, neu) {
  if (document.querySelector('.ein-dlg')) return;
  if (!D.length) { toast('Der Eingangsordner ist leer.'); return; }
  const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB');
  const dt = (t) => { const d = new Date(t); return isNaN(d) ? '' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
  const bg = modalBox(`<h3>📥 Eingang auf dem Server</h3><p class="hint" style="margin:0 0 .5rem">${D.length} Datei${D.length === 1 ? '' : 'en'} im Eingangsordner – welche sollen verarbeitet werden? Jede wird wie beim Hineinziehen erkannt und nachgefragt; danach wandert sie nach „verarbeitet“.</p>
    <div class="ein-l">${D.map((x, i) => `<label class="ein-z${neu.has(eingangKey(x)) ? ' neu' : ''}"><input type="checkbox" data-ein="${i}"${neu.has(eingangKey(x)) ? ' checked' : ''}><span class="ein-n">${esc(x.name)}</span><small>${dt(x.mtime)} · ${kb(x.size)}</small><button type="button" class="btn sm" data-einsieh="${i}" title="Ansehen">👁</button></label>`).join('')}</div>
    <div class="acts"><button class="btn" data-m="spaeter">Später</button><button class="btn" data-m="erledigt" title="Ausgewählte ohne Verarbeiten nach „verarbeitet“ verschieben">Als erledigt ablegen</button><button class="btn pri" data-m="ok">Verarbeiten</button></div>`, async (m, bg2, close) => {
    const wahl = [...bg2.querySelectorAll('[data-ein]:checked')].map((c) => D[+c.dataset.ein]);
    if (m === 'spaeter') { const sp = eingangSpaeter(); D.forEach((x) => sp.add(eingangKey(x))); try { sessionStorage.setItem('avaEingangSpaeter', JSON.stringify([...sp])); } catch { /* egal */ } close(); return; }
    if (m === 'erledigt') {
      if (!wahl.length) return toast('Bitte Dateien auswählen.', true);
      close(); let n = 0;
      for (const x of wahl) { try { await api('api/eingang/erledigt', 'POST', { name: x.name }); n++; } catch (e) { toast(e.message, true); } }
      toast(`${n} Datei${n === 1 ? '' : 'en'} nach „verarbeitet“ verschoben.`); EINGANG.t = 0; return;
    }
    if (m !== 'ok') return;
    if (!wahl.length) return toast('Bitte Dateien auswählen.', true);
    close();
    for (const x of wahl) {
      let f; try { const r = await fetch('api/eingang/datei?name=' + encodeURIComponent(x.name), { credentials: 'same-origin' }); if (!r.ok) throw new Error((await jsonAus(r)).error || 'Fehler ' + r.status); const bl = await r.blob(); f = new File([bl], x.name, { type: bl.type }); }
      catch (e) { toast(`„${x.name}“: ${e.message}`, true); continue; }
      const erg = await avaDokument(f);
      if (erg === 'ok') { try { await api('api/eingang/erledigt', 'POST', { name: x.name }); } catch (e) { toast(`„${x.name}“ verarbeitet, aber nicht verschoben: ${e.message}`, true); } }
      if (erg === false) break;
    }
    EINGANG.t = 0;
  });
  bg.querySelector('.modal').classList.add('ein-dlg');
  bg.addEventListener('click', (e) => { const v = e.target.closest('[data-einsieh]'); if (!v) return; e.preventDefault(); const x = D[+v.dataset.einsieh];
    const u = 'api/eingang/datei?name=' + encodeURIComponent(x.name); if (window.BPHead && BPHead.ansehen && /\.(pdf|jpe?g|png)$/i.test(x.name)) BPHead.ansehen([{ url: u, name: x.name, typ: /\.pdf$/i.test(x.name) ? 'pdf' : 'bild' }]); });
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') eingangPruefen(false); });
setTimeout(() => eingangPruefen(false), 2500);
document.addEventListener('click', (e) => { if (e.target.closest('[data-eingang]')) { e.preventDefault(); e.stopPropagation(); eingangPruefen(true); } }, true);
document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('[data-avadropin]'); if (i && i.files.length) { const fs = [...i.files]; i.value = ''; avaDokumente(fs); } });
/* irgendwo auf die Seite ziehen (außer auf eigene Ablagen wie Rechnung, Aufmaß, Foto am Langtext): das gemeinsame Ablagefeld */
const AVAEIGEN = '[data-amdrop],[data-redrop],tr.lang,.modal-bg,.bph-dlg-bg,.bed';
document.addEventListener('dragover', (e) => {
  if (![...(e.dataTransfer.types || [])].includes('Files')) return;
  const eigen = e.target.closest && e.target.closest(AVAEIGEN), feld = e.target.closest && e.target.closest('[data-avadrop]');
  document.body.classList.toggle('ava-ziehen', !eigen || !!feld);
  if (!eigen || feld) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
});
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) document.body.classList.remove('ava-ziehen'); });
document.addEventListener('drop', (e) => {
  document.body.classList.remove('ava-ziehen');
  if (!e.dataTransfer.files.length) return;
  const eigen = e.target.closest && e.target.closest(AVAEIGEN), feld = e.target.closest && e.target.closest('[data-avadrop]');
  if (eigen && !feld) return;
  e.preventDefault(); avaDokumente(e.dataTransfer.files);
});
