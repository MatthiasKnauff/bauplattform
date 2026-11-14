/* Bautagebuch – Grundhilfen, Symbole, Zustand, PDF-Ansicht, Server-Aufrufe, Meldungen. Grundhilfen ($, esc, fold, passt) kommen aus dem Baukasten (bp/baukasten.js).
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
const fmt = d => d ? new Date(d + 'T12:00').toLocaleDateString('de-DE') : '';
const IC = {
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', pencil:'<path fill="currentColor" d="M4 20l1-4L16 5l3 3L8 19z"/>',
  folder:'<path d="M3 6h6l2 2h10v11H3z"/>', cal:'<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>', pdf:'<path d="M6 3h9l4 4v14H6zM14 3v5h5"/>',
  cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
  gear:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  cloud:'<path fill="currentColor" stroke="none" d="M7 19a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.5 4.8 4.8 0 0 1 17.5 19z"/>',
  doc:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>', home:'<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
  users:'<path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-4 3-6 6-6s6 2 6 6M17 11a2.5 2.5 0 1 0 0-5M17 14c3 0 4 2 4 5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
  archive:'<path d="M3 5h18v4H3zM5 9v10h14V9M10 13h4"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  out:'<path d="M10 4H4v16h6M14 8l5 4-5 4M19 12H9"/>', chev:'<path d="M6 9l6 6 6-6"/>',
  grid:'<rect x="3.5" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="16" y="3.5" width="4.5" height="4.5" rx="1"/><rect x="3.5" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="16" y="9.75" width="4.5" height="4.5" rx="1"/><rect x="3.5" y="16" width="4.5" height="4.5" rx="1"/><rect x="9.75" y="16" width="4.5" height="4.5" rx="1"/><rect x="16" y="16" width="4.5" height="4.5" rx="1"/>',
  pin:'<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  warn:'<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17v.01"/>', check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>', note:'<path d="M5 4h14v12l-4 4H5z"/><path d="M15 20v-4h4M8 9h8M8 13h5"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', cloudo:'<path d="M7 18h10a4 4 0 00.6-8A6 6 0 006 9.5 4.3 4.3 0 007 18z"/>', bar:'<path d="M4 6h10M4 12h16M4 18h7"/>',
  wind:'<path d="M3 9h11a3 3 0 10-3-3M3 15h15a3 3 0 11-3 3"/>', drop:'<path d="M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z"/>', send:'<path d="M4 12l16-8-6 16-3-7z"/>'
};
/* Abschnitte: Symbol und Farbe (neue Gestaltung) */
const SECIC = { header: ['doc', 'c-y'], weather: ['cloudo', 'c-b'], anwesende: ['users', 'c-g'], notizen: ['note', 'c-v'], images: ['cam', 'c-o'], bilder: ['cam', 'c-o'], maengel: ['warn', 'c-r'], zu_erledigen: ['check', 'c-y'], weisungen: ['flag', 'c-b'] };
const secIc = (s) => { const [n, c] = SECIC[s.key] || SECIC[s.type] || ['doc', 'c-y']; return `<span class="si ${c}">${ic(n, 20, 2)}</span>`; };
const kuerzel = (t) => String(t || '').replace(/\b(GmbH|AG|KG|UG|mbH|Co|e\.K\.|&)\b/gi, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '·';
const ic = (n, s = 22, w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const TABS = [['bericht','Bericht','doc'],['kontakte','Kontakte','users']];   // Suche: Feld rechts in der Reiterzeile
const WX = ['Heiter','Sonnig','Wolkig','Bedeckt','Regen','Gewitter','Schnee','Nebel'];
const PRECIP = ['trocken','leichter Regen','Regen','Starkregen','Schnee'];
const CHECKS = [['chk_tidy','Baustelle aufgeräumt'],['chk_measure','Maßkontrolle'],['chk_photos','Fotodokumentation'],['chk_firms','Alle Firmen angesprochen']];
const NEAR_M = 600;   // so nah (Meter) muss man an einem Projekt sein, damit es automatisch gewählt wird
const favicon = () => document.querySelectorAll('link[rel=icon],link[rel=apple-touch-icon]').forEach(l => { l.href = l.href.split('?')[0] + (l.href.includes('s=180') ? '?s=180&' : '?') + 'v=' + Date.now(); });
let settings = {}, logoV = 1, saving = new Set(), here = null, cq = '', cTrade = '', cProj = '', cProjSet = false, sheetQ = '';
const track = pr => { saving.add(pr); pr.finally(() => saving.delete(pr)); return pr; };
let draft = null, cfrom = null, armedKey = null, armedTimer = null;
let itemPhotoFor = null, meta = {sections: []}, contacts = [], cid = null, projects = [], pid = null, reports = [], rid = null, tab = 'bericht', wxEdit = false, headEdit = false, adding = null, allImgs = false, dueEditId = null, leaderUsers = [];
const addr = p => [p.street, [p.zip, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
const curProject = () => projects.find(x => x.id === pid);
const curReport = () => reports.find(x => x.id === rid);
const hasPos = p => p.lat != null && p.lon != null;
const dist = (a, b, c, d) => { const r = Math.PI / 180, h = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const fmtDist = m => m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';


// ---------- PDF-Ansicht in der App (Standalone/Startbildschirm: kein Zurück-Knopf des Browsers) ----------
const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
const loadScript = src => new Promise((ok, no) => { const e = document.createElement('script'); e.src = src; e.onload = ok; e.onerror = no; document.head.appendChild(e); });
let pv = null;
/* Seiten erst zeichnen, wenn sie in die Nähe kommen, und weit entfernte wieder freigeben – das iPhone erlaubt nur
   begrenzt Canvas-Speicher (sonst „Total canvas memory use exceeds the maximum limit“ bei vielen Seiten mit Fotos). */
const PV_MAXPX = 4.2e6;
async function pvRender() {
  const box = pv.el.querySelector('.pvw'), W = pv.el.querySelector('.pvs').clientWidth - 20;
  if (pv.io) pv.io.disconnect();
  box.querySelectorAll('canvas').forEach((c) => { c.width = c.height = 0; });
  box.innerHTML = '';
  const cssW = W * pv.zoom, slots = [];
  for (let n = 1; n <= pv.doc.numPages; n++) {
    const pg = await pv.doc.getPage(n), v1 = pg.getViewport({scale: 1});
    const d = document.createElement('div'); d.className = 'pvp'; d.dataset.n = n;
    d.style.width = cssW + 'px'; d.style.height = (cssW * v1.height / v1.width) + 'px';
    box.appendChild(d); slots.push(d);
    if (!pv) return;
  }
  const zeichne = async (d) => {
    if (d._an || !pv) return; d._an = true;
    try {
      const pg = await pv.doc.getPage(+d.dataset.n), v1 = pg.getViewport({scale: 1});
      let dpr = Math.min(window.devicePixelRatio || 1, 2), sc = cssW / v1.width;
      while (v1.width * sc * dpr * v1.height * sc * dpr > PV_MAXPX && dpr > 0.75) dpr -= 0.25;
      const vp = pg.getViewport({scale: sc * dpr}), c = document.createElement('canvas');
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height); c.style.width = '100%'; c.style.height = '100%';
      const ctx = c.getContext('2d'); if (!ctx) throw new Error('Kein Zeichenspeicher frei');
      d.appendChild(c); d._task = pg.render({canvasContext: ctx, viewport: vp});
      await d._task.promise; d._task = null;
    } catch (e) { if (!/cancel/i.test(String(e && e.name) + String(e && e.message))) { d._an = false; pvMelden(e); } }
  };
  const frei = (d) => { if (!d._an) return; if (d._task) { try { d._task.cancel(); } catch { /* egal */ } } const c = d.querySelector('canvas'); if (c) { c.width = c.height = 0; c.remove(); } d._an = false; };
  pv.io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) zeichne(e.target); else if (Math.abs(e.boundingClientRect.top) > innerHeight * 4) frei(e.target); }),
    {root: pv.el.querySelector('.pvs'), rootMargin: '150% 0px'});
  slots.forEach((d) => pv.io.observe(d));
}
function pvMelden(e) {   // Fehler der Ansicht an die Verwaltung (System → Fehlermeldungen), damit man sieht, was am Gerät schiefging
  try { fetch('api/bp/fehler', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, keepalive: true,
    body: JSON.stringify({app: 'Bautagebuch', meldung: 'PDF-Ansicht: ' + String((e && (e.message || e.name)) || e).slice(0, 400), stack: String((e && e.stack) || '').slice(0, 3000) + '\n' + navigator.userAgent, pfad: location.pathname})}).catch(() => {}); } catch { /* egal */ }
}
/* Vorgaben für „Per Mail senden“ im Ansehen-Fenster (⋯) – bp/versand.js: Projekt des Bautagebuchs, im Verlauf als „Bautagebuch-Bericht“ */
window.bpMailStandard = () => { const p = curProject() || {}; return { art: 'tagesbericht', pid: p.id || null, projekt: p.name || '', link: 'bautagebuch:' }; };
async function openPdf(url, titel) {
  if (window.BPHead && BPHead.ansehen) { BPHead.ansehen([{ url: url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), typ: 'pdf', name: titel || 'Bautagebuch' }]); return; }   // gemeinsamer Viewer wie in allen Apps (Drucken, Teilen, Speichern, Unterschreiben)
  toast('PDF wird erzeugt …');
  let blob, name = 'Bautagebuch.pdf';
  try {
    const r = await fetch(url);
    if (!r.ok) { const j = await r.json().catch(() => ({})); toast(j.error || 'Das PDF konnte nicht erzeugt werden.'); return; }
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(r.headers.get('Content-Disposition') || ''); if (m) name = decodeURIComponent(m[1]);
    blob = await r.blob();
  } catch (e) { toast('Das PDF konnte nicht geladen werden – Verbindung prüfen.'); return; }
  closePv();
  const el = document.createElement('div'); el.id = 'pv';
  el.innerHTML = `<div class="pvb"><button class="pvc" data-act="pvClose">✕ Schließen</button><span>${esc(name)}</span><button data-act="pvZoom" data-d="-1" aria-label="Verkleinern">−</button><button data-act="pvZoom" data-d="1" aria-label="Vergrößern">+</button><button data-act="pvShare">Teilen</button></div><div class="pvs"><div class="pvw"></div></div>`;
  document.body.appendChild(el); pv = {el, doc: null, blob, name, zoom: 1};
  history.pushState({pv: 1}, '');   // Wischgeste „zurück“ schließt die Ansicht ebenfalls
  try {
    if (!window.pdfjsLib) { await loadScript('vendor/pdfjs/pdf.js'); pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.js', location.href).href; }
    pv.doc = await pdfjsLib.getDocument({ isEvalSupported: false, data: await blob.arrayBuffer()}).promise;
    await pvRender();
  } catch (e) {   // Vorschau geht nicht – das PDF ist trotzdem da: teilen, sichern, in Bücher/Dateien öffnen
    pvMelden(e);
    if (pv) pv.el.querySelector('.pvw').innerHTML = `<div style="color:#eee;max-width:28rem;margin:2rem auto;text-align:center;line-height:1.5">Die Vorschau lässt sich auf diesem Gerät nicht anzeigen.<br>Das PDF ist aber fertig.<br><small style="opacity:.6">${esc(String((e && e.message) || e).slice(0, 160))}</small><br><br><button class="btn" data-act="pvShare" style="font-size:1.05rem;padding:.7rem 1.4rem">Teilen / Sichern …</button></div>`;
  }
}
function closePv() { if (pv) { if (pv.io) pv.io.disconnect(); pv.el.querySelectorAll('canvas').forEach((c) => { c.width = c.height = 0; }); if (pv.doc) pv.doc.destroy(); pv.el.remove(); pv = null; } }
window.addEventListener('popstate', closePv);
async function pvShare() {
  const f = new File([pv.blob], pv.name, {type: 'application/pdf'});
  try { if (navigator.canShare && navigator.canShare({files: [f]})) { await navigator.share({files: [f]}); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(pv.blob); a.download = pv.name; document.body.appendChild(a); a.click(); a.remove();
}
/* Hochladen mit Drehkreis und Fortschritt (Fotos, Logo): unten eingeblendet, bis der Server fertig ist */
function upBusy(on, txt) {
  let b = $('#upBusy');
  if (!on) { if (b && !--b._n) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'upBusy'; b.setAttribute('role', 'status'); b._n = 0; b.innerHTML = '<span class="spin"></span><span class="t"></span>'; document.body.appendChild(b); }
  if (on === 'start') b._n++;
  b.querySelector('.t').textContent = txt;
}
/* Fotos hochladen: jedes einzeln (beliebig viele auf einmal, auch über Mobilfunk), mit „Foto 7 von 23“. Was nicht klappt, wird am Ende
   eindeutig gemeldet – welches Foto, warum – mit „Nochmal“ nur für diese. FOTO_MAX_MB muss zum Server passen (bautagebuch/app.py). */
const FOTO_MAX_MB = 100;
async function fotosHochladen(files, itemId) {
  const fs = [...files], fehler = [], mb = (b) => (b / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB';
  let ok = 0;
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    if (f.size > FOTO_MAX_MB * 1048576) { fehler.push([f, `${mb(f.size)} – höchstens ${FOTO_MAX_MB} MB je Foto`]); continue; }
    const fd = new FormData(); fd.append('files', f); if (itemId) fd.append('item_id', itemId);
    let up;
    try { up = await apiUpload(`api/reports/${rid}/images`, fd, fs.length > 1 ? `Foto ${i + 1} von ${fs.length} wird hochgeladen` : 'Foto wird hochgeladen'); }
    catch (e) { if (e === 0 && !navigator.onLine) { fehler.push([f, 'keine Verbindung']); continue; } if (e === 0) { fehler.push([f, 'Verbindung abgebrochen']); continue; } throw e; }
    if (up.error) fehler.push([f, up.status === 413 ? `${mb(f.size)} – zu groß für den Server` : up.error]);
    else if (up.rejected && up.rejected.length) fehler.push([f, 'Format nicht lesbar (kein Foto?)']);
    else ok++;
  }
  return { ok, fehler };
}
async function fotosMelden(r, nochmal) {
  if (!r.fehler.length) { if (r.ok > 1) toast(`${r.ok} Fotos hochgeladen.`); return; }
  const liste = r.fehler.map(([f, g]) => `• ${f.name || 'Foto'}: ${g}`).join('\n');
  const text = `${r.ok ? `${r.ok} von ${r.ok + r.fehler.length} Fotos hochgeladen.` : (r.fehler.length > 1 ? 'Keines der Fotos wurde hochgeladen.' : 'Das Foto wurde nicht hochgeladen.')}\n\nNicht übernommen:\n${liste}`;
  const wieder = r.fehler.filter(([, g]) => !/MB je Foto|Format/.test(g)).map(([f]) => f);
  if (wieder.length && window.bpFrage) { if (await bpFrage(text, { ok: `Nochmal (${wieder.length})`, abbrechen: 'Schließen' })) await nochmal(wieder); }
  else if (window.bpHinweis) bpHinweis(text); else toast(text, true);
}
function apiUpload(u, form, text) {
  const n = [...form.getAll('files')].length, was = text || (n ? (n > 1 ? `${n} Fotos werden hochgeladen` : 'Foto wird hochgeladen') : 'Wird hochgeladen');
  upBusy('start', was + ' …');
  return new Promise((ok, bad) => {
    const x = new XMLHttpRequest(); x.open('POST', u);
    x.upload.onprogress = (e) => { if (e.lengthComputable) upBusy(true, e.loaded < e.total ? `${was} … ${Math.round(e.loaded / e.total * 100)} %` : 'Wird verarbeitet …'); };
    x.onload = () => { upBusy(false); if (x.status === 401) { showLogin(); bad(0); return; } try { ok(JSON.parse(x.responseText)); } catch { ok({error: x.status === 413 ? 'zu groß für den Server' : 'Hochladen fehlgeschlagen (' + x.status + ')', status: x.status}); } };
    x.onerror = () => { upBusy(false); toast('Hochladen fehlgeschlagen – bitte Verbindung prüfen und erneut versuchen.'); bad(0); };
    x.send(form);
  });
}
/* Server-Aufrufe: api() aus dem Baukasten (Fehlertexte bei 502/504/413 usw.); das Bautagebuch bekommt Fehler wie bisher als
   Antwort ({error: …}) statt als Ausnahme, Hochladen läuft mit Fortschritt, ohne Anmeldung erscheint die eigene Anmeldeseite. */
const _bpApi = api;
api = async (u, m = 'GET', d, form) => {
  if (form && m === 'POST') return apiUpload(u, form);
  try { return await _bpApi(u, m, d); } catch (e) {
    const j = e && e.data; if (!j) throw e;
    if (e.status === 401 && u !== 'api/login') { showLogin(); throw 0; }
    if (e.status === 403 && j.must_change) { authView('change'); throw 0; }
    return j;
  }
};

const DANGER = new Set(['restoreVer', 'delUser', 'userMail']);   // Löschen mit Rückgängig/Papierkorb braucht keine zweite Bestätigung
function disarm() { clearTimeout(armedTimer); armedKey = null; document.querySelectorAll('.armed').forEach(el => { el.classList.remove('armed'); if (el._orig != null) { el.innerHTML = el._orig; el._orig = null; } }); }
function arm(b, key) {   // erster Tipp = scharf stellen, zweiter Tipp = ausführen
  if (armedKey === key) { disarm(); return true; }
  disarm(); armedKey = key; b.classList.add('armed');
  if (b.textContent.trim().length > 1) { b._orig = b.innerHTML; b.textContent = b.dataset.arm || 'Wirklich löschen? Nochmal tippen'; } else toast('Zum Löschen nochmals tippen.');
  armedTimer = setTimeout(disarm, 4000); return false;
}
const grow = t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; };
const growAll = () => document.querySelectorAll('textarea.ed').forEach(grow);
