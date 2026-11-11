/* Pläne & Dateien – Reiter „Alle Dateien“: alle Dateien des Projektordners mit Filtern (Art, Ordner, Zeitraum, Suche) und
   Vorschaubildern in den Größen S/M/L oder als Liste. Server: plaene_alle.py (Liste, Vorschau aus der Datenbank, Original direkt vom
   Dateiserver), Vorschaubilder erzeugen die Dienste im Hintergrund (bpcore/vorschau.py). Kacheln ohne Vorschau, die gerade zu sehen
   sind, werden gemeldet und kommen zuerst dran; das Bild erscheint dann ohne Neuladen. Am Handy: nur ansehen, Größe M.
   Benutzt die gemeinsamen Namen der Seite plaene.html (pid, LS, render, mb, de, passt). */
let ALLE = null, ALLE_PID = null, ALLE_L = null, alleBusy = false, alleMehr = 0, ALLE_SEL = '', ALLE_DET = null;
const ALLE_INFO = new Map();   // Details je Datei (pfad|mtime) – einmal je Sitzung geholt
const AF = Object.assign({ art: '', q: '', ordner: '', unter: true, zeit: '', gr: 'M' }, LS.get('alle', {}));
const A_IC = { pdf: '📄', foto: '🖼', cad: '📐', office: '📊', mail: '✉', andere: '📎' };
const A_NAME = { pdf: 'PDF', foto: 'Fotos', cad: 'CAD', office: 'Office', mail: 'Mails', andere: 'Sonstige' };
const A_ZEIT = [['', 'jederzeit'], ['7', '7 Tage'], ['30', '30 Tage'], ['365', '1 Jahr']];
const A_GR = { liste: '☰ Liste', S: 'S', M: 'M', L: 'L' };
const A_SCHRITT = 300;
const alleHandy = () => matchMedia('(max-width: 760px)').matches;
const alleUrl = (pfad, dl) => `api/alle/datei?project_id=${pid}&pfad=${encodeURIComponent(pfad)}${dl ? '&dl=1' : ''}`;
const alleBild = (pfad, neu) => `api/alle/bild?project_id=${pid}&pfad=${encodeURIComponent(pfad)}${neu ? '&t=' + Date.now() : ''}`;
const alleSehbar = (x) => x.art === 'pdf' || (x.art === 'foto' && /\.(jpe?g|png|gif|webp|bmp)$/i.test(x.name));

async function alleLaden(neu) {
  if (!pid) return;
  alleBusy = true; render();
  try { ALLE = await api(`api/alle?project_id=${pid}${neu ? '&neu=1' : ''}`); } catch (e) { ALLE = { error: e.message }; }
  ALLE_PID = pid; ALLE_L = null; alleBusy = false; alleMehr = 0; render();
}

function alleListe() {   // einmal je Laden: Einträge mit Name, Ordner, Art
  if (ALLE_L) return ALLE_L;
  const art = {}; Object.entries(ALLE.arten || {}).forEach(([k, l]) => l.forEach((e) => { art[e] = k; }));
  ALLE_L = (ALLE.dateien || []).map(([pfad, groesse, mtime, v]) => {
    const i = pfad.lastIndexOf('/'), name = pfad.slice(i + 1), e = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
    return { pfad, name, ordner: i < 0 ? '' : pfad.slice(0, i), art: art[e] || 'andere', groesse, mtime, v };
  }).sort((a, b) => b.mtime - a.mtime);
  return ALLE_L;
}

function alleFilter(L, ohne) {
  const q = AF.q.trim().toLowerCase(), grenze = AF.zeit ? Date.now() / 1000 - AF.zeit * 86400 : 0;
  return L.filter((x) => (ohne === 'art' || !AF.art || x.art === AF.art)
    && (!AF.ordner || (AF.unter ? x.ordner === AF.ordner || x.ordner.startsWith(AF.ordner + '/') : x.ordner === AF.ordner))
    && (!grenze || x.mtime >= grenze) && (!q || passt(x.pfad, q)));
}

function alleBaum(L) {   // Ordner mit Zahl der Dateien (inkl. Unterordner); aufgeklappt bis zum gewählten Ordner
  const n = {};
  L.forEach((x) => { const t = x.ordner ? x.ordner.split('/') : []; for (let i = 1; i <= t.length; i++) { const k = t.slice(0, i).join('/'); n[k] = (n[k] || 0) + 1; } });
  const offen = new Set(['']); if (AF.ordner) { const t = AF.ordner.split('/'); for (let i = 1; i <= t.length; i++) offen.add(t.slice(0, i).join('/')); }
  const keys = Object.keys(n).filter((k) => offen.has(k.split('/').slice(0, -1).join('/'))).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  return `<button type="button" class="ab-o${!AF.ordner ? ' on' : ''}" data-aord="">${esc((ALLE.basis || 'Projektordner').split('/').pop())} <small>${L.length}</small></button>`
    + keys.map((k) => { const t = k.split('/'); return `<button type="button" class="ab-o${AF.ordner === k ? ' on' : ''}" data-aord="${esc(k)}" style="padding-left:${0.6 + t.length * 0.8}rem" title="${esc(k)}">${esc(t[t.length - 1])} <small>${n[k]}</small></button>`; }).join('');
}

function alleKachel(x, i) {
  const th = x.v === 1 ? `<img src="${alleBild(x.pfad)}" alt="" loading="lazy" decoding="async">` : `<span class="aic">${A_IC[x.art]}</span>`;
  const warte = x.v === 0 && (ALLE.vorschau || []).includes(x.art);
  return `<a class="ak${x.pfad === ALLE_SEL ? ' sel' : ''}" href="${alleUrl(x.pfad)}" data-ansehen="nein" data-ai="${i}" data-ap="${esc(x.pfad)}"${warte ? ` data-aw="${esc(x.pfad)}"` : ''} title="${esc(x.pfad)}">
    <span class="ath">${th}${warte ? '<span class="awt">Vorschau folgt</span>' : ''}</span><span class="an">${esc(x.name)}</span><span class="am">${mb(x.groesse)} · ${de(x.mtime)}</span></a>`;
}

function renderAlle() {
  bar && bar();
  if (!pid) { $('#viewA').innerHTML = '<p class="mute">Bitte ein Projekt wählen.</p>'; $('#ord').innerHTML = ''; return; }
  if (!ALLE || ALLE_PID !== pid) { if (!alleBusy) alleLaden(false); $('#viewA').innerHTML = '<p class="mute">Projektordner wird gelesen …</p>'; $('#ord').innerHTML = ''; return; }
  if (ALLE.error) { $('#viewA').innerHTML = `<div class="card"><p>${esc(ALLE.error)}</p></div>`; $('#ord').innerHTML = ''; return; }
  $('#ord').innerHTML = `${ALLE.stand ? `<span class="mu" title="Nachts für alle laufenden Projekte eingelesen – „Neu einlesen“ liest den Ordner jetzt">Stand ${esc(new Date(ALLE.stand).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}</span>` : ''}${ALLE.abgebrochen ? ' <span class="pill bad" title="Sehr viele Dateien – nicht alle wurden eingelesen">nicht vollständig</span>' : ''}`;
  const L = alleListe(), gr = alleHandy() && AF.gr !== 'liste' ? 'M' : AF.gr;
  const ohneArt = alleFilter(L, 'art'), Z = {}; ohneArt.forEach((x) => { Z[x.art] = (Z[x.art] || 0) + 1; });
  const F = AF.art ? ohneArt.filter((x) => x.art === AF.art) : ohneArt;
  const chip = (attr, v, txt, on) => `<button type="button" class="chip${on ? ' on' : ''}" ${attr}="${esc(v)}">${txt}</button>`;
  const leiste = `<div class="al-l"><input id="aq" type="search" placeholder="🔍 Name oder Ordner suchen …" value="${esc(AF.q)}" aria-label="Suchen">
    ${chip('data-aart', '', `Alle <small>${ohneArt.length}</small>`, !AF.art)}${Object.keys(A_NAME).filter((k) => Z[k]).map((k) => chip('data-aart', k, `${A_IC[k]} ${A_NAME[k]} <small>${Z[k]}</small>`, AF.art === k)).join('')}
    <span class="seg" role="group" aria-label="Zeitraum">${A_ZEIT.map(([k, t]) => `<button type="button" data-azeit="${k}" class="${String(AF.zeit) === k ? 'on' : ''}">${t}</button>`).join('')}</span>
    ${AF.ordner ? chip('data-aunter', '1', AF.unter ? 'mit Unterordnern' : 'nur dieser Ordner', !AF.unter) : ''}
    <span class="seg al-gr" role="group" aria-label="Größe">${Object.entries(A_GR).map(([k, t]) => `<button type="button" data-agr="${k}" class="${gr === k ? 'on' : ''}">${t}</button>`).join('')}</span></div>`;
  const zeig = A_SCHRITT * (alleMehr + 1);
  let inhalt;
  if (!F.length) inhalt = `<p class="mu">${L.length ? 'Keine Dateien zu diesem Filter.' : 'Der Projektordner ist leer.'}</p>`;
  else if (gr === 'liste') {
    inhalt = `<div class="tbl"><table class="pl al-t"><thead><tr><th>Name</th><th class="hide-m">Ordner</th><th class="r">Größe</th><th>geändert</th></tr></thead><tbody>${F.slice(0, zeig).map((x, i) =>
      `<tr class="${x.pfad === ALLE_SEL ? 'sel' : ''}" data-ap="${esc(x.pfad)}"><td><a class="ak-z" href="${alleUrl(x.pfad)}" data-ansehen="nein" data-ai="${i}">${A_IC[x.art]} ${esc(x.name)}</a></td><td class="hide-m mu">${esc(x.ordner)}</td><td class="r">${mb(x.groesse)}</td><td>${de(x.mtime)}</td></tr>`).join('')}</tbody></table></div>`;
  } else {
    const jetzt = Date.now() / 1000, G = [['Diese Woche', (x) => x.mtime >= jetzt - 7 * 86400], ['Dieser Monat', (x) => x.mtime >= jetzt - 30 * 86400], ['Älter', () => true]];
    const sicht = F.slice(0, zeig), gruppen = []; let i0 = 0;
    G.forEach(([t, f]) => { let j = i0; while (j < sicht.length && f(sicht[j])) j++; if (j > i0) gruppen.push([t, i0, j]); i0 = j; });
    inhalt = gruppen.map(([t, a, b]) => `<div class="al-g">${t}</div><div class="al-k al-${gr}">${sicht.slice(a, b).map((x, k) => alleKachel(x, a + k)).join('')}</div>`).join('');
  }
  if (F.length > zeig) inhalt += `<div class="al-mehr"><button type="button" class="btn" data-amehr>Weitere ${Math.min(A_SCHRITT, F.length - zeig)} von ${F.length - zeig} zeigen</button></div>`;
  $('#viewA').innerHTML = `<div class="al">${leiste}<div class="al-i">${inhalt}</div></div>`;   // Ordnerbaum steht links in der Navigation (alleNavBaum)
  alleSichtbar.F = F;
  if (ALLE_SEL) { const el = $('#viewA').querySelector(`[data-ap="${CSS.escape(ALLE_SEL)}"]`); if (el) el.classList.add('sel'); }
  if (!alleHandy() && window.seite) seite($('#workA'), 'pl-alle', [{ id: 'det', titel: 'Details', mount: (el) => { ALLE_DET = el; alleDetail(); } }], { start: 'det', w: 0.74, min: 300, minL: 420 });
  alleBeobachten();
}

/* Kacheln ohne Vorschau, die zu sehen sind: melden (die Dienste erzeugen sie zuerst) und das Bild nachladen, sobald es da ist */
const alleSichtbar = { F: [], warte: new Set(), gemeldet: new Set(), t: null, io: null, runden: 0 };
function alleBeobachten() {
  if (alleSichtbar.io) alleSichtbar.io.disconnect();
  if (!('IntersectionObserver' in window)) return;
  alleSichtbar.io = new IntersectionObserver((E) => {
    E.forEach((e) => { if (e.isIntersecting) { const p = e.target.dataset.aw; if (p && !alleSichtbar.gemeldet.has(pid + '|' + p)) alleSichtbar.warte.add(p); } });
    clearTimeout(alleSichtbar.t); alleSichtbar.t = setTimeout(alleMelden, 600);
  });
  document.querySelectorAll('#viewA [data-aw]').forEach((el) => alleSichtbar.io.observe(el));
}
async function alleMelden() {
  const P = [...alleSichtbar.warte]; alleSichtbar.warte.clear(); if (!P.length) return;
  P.forEach((p) => alleSichtbar.gemeldet.add(pid + '|' + p));
  try { await api('api/alle/wunsch', 'POST', { project_id: pid, pfade: P }); } catch { return; }
  alleSichtbar.runden = 0; alleNachladen(P);
}
function alleNachladen(P) {
  const offen = P.filter((p) => document.querySelector(`#viewA [data-aw="${CSS.escape(p)}"]`));
  if (!offen.length || alleSichtbar.runden++ > 12) return;
  setTimeout(() => {
    let n = offen.length;
    const rest = [];
    offen.forEach((p) => {
      const im = new Image();
      im.onload = () => { const el = document.querySelector(`#viewA [data-aw="${CSS.escape(p)}"]`); if (el) { const th = el.querySelector('.ath'); th.innerHTML = ''; im.alt = ''; th.appendChild(im); el.removeAttribute('data-aw'); }
        const x = (ALLE_L || []).find((y) => y.pfad === p); if (x) x.v = 1; if (--n === 0 && rest.length) alleNachladen(rest); };
      im.onerror = () => { rest.push(p); if (--n === 0) alleNachladen(rest); };
      im.src = alleBild(p, true);
    });
  }, alleSichtbar.runden < 3 ? 3000 : 6000);
}

function alleOeffnen(i) {
  const F = alleSichtbar.F, x = F[i]; if (!x) return;
  if (alleSehbar(x) && window.BPHead && BPHead.ansehen) {
    const G = F.filter(alleSehbar).slice(0, 500);
    BPHead.ansehen(G.map((y) => ({ url: alleUrl(y.pfad), name: y.name, typ: y.art === 'pdf' ? 'pdf' : 'bild' })), Math.max(0, G.indexOf(x)));
    return;
  }
  const a = document.createElement('a'); a.href = alleUrl(x.pfad, true); a.dataset.ansehen = 'nein'; a.download = x.name; document.body.appendChild(a); a.click(); a.remove();
}

function alleSetzen(w) { Object.assign(AF, w); LS.set('alle', AF); alleMehr = 0; render(); }
document.addEventListener('click', (e) => {
  if (tab !== 'alle') return;
  const t = e.target.closest('[data-ai],[data-aart],[data-azeit],[data-agr],[data-aord],[data-aunter],[data-amehr]'); if (!t) return;
  if (t.dataset.ai != null) { if (e.ctrlKey || e.metaKey || e.shiftKey) return; e.preventDefault();
    if (alleHandy() || !ALLE_DET || !ALLE_DET.isConnected) { alleOeffnen(+t.dataset.ai); return; }   // ohne Details (Handy, zugeklappt): gleich öffnen
    alleWaehlen(alleSichtbar.F[+t.dataset.ai]); return; }
  if (t.dataset.aart != null) return alleSetzen({ art: t.dataset.aart });
  if (t.dataset.azeit != null) return alleSetzen({ zeit: t.dataset.azeit ? +t.dataset.azeit : '' });
  if (t.dataset.agr) return alleSetzen({ gr: t.dataset.agr });
  if (t.dataset.aord != null) return alleSetzen({ ordner: t.dataset.aord });
  if (t.dataset.aunter) return alleSetzen({ unter: !AF.unter });
  if (t.dataset.amehr != null) { alleMehr++; render(); }
});
let aqT = null;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'aq') return;
  AF.q = e.target.value; LS.set('alle', AF); clearTimeout(aqT);
  aqT = setTimeout(() => { alleMehr = 0; render(); const q = $('#aq'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250);
});

document.addEventListener('dblclick', (e) => {   // Doppelklick öffnet (Ansicht bzw. Herunterladen)
  if (tab !== 'alle') return; const t = e.target.closest('[data-ai]'); if (!t) return; e.preventDefault(); alleOeffnen(+t.dataset.ai);
});
document.addEventListener('keydown', (e) => {
  if (tab !== 'alle' || e.key !== 'Enter') return; const t = e.target.closest && e.target.closest('[data-ai]'); if (!t) return; e.preventDefault(); alleOeffnen(+t.dataset.ai);
});

/* Ordnerbaum in der Navigation links (unter „Alle Dateien“) */
function alleNavBaum() {
  if (!ALLE || ALLE_PID !== pid || ALLE.error) return '';
  return `<div class="al-b" aria-label="Ordner">${alleBaum(alleListe())}</div>`;
}

/* Details rechts (seite.js): Vorschau, Pfad, Größe, Datum; dazu, was in der Datei steht (api/alle/info, beim ersten Mal gelesen) */
function alleWaehlen(x) {
  if (!x) return;
  ALLE_SEL = x.pfad;
  document.querySelectorAll('#viewA .sel').forEach((el) => el.classList.remove('sel'));
  document.querySelectorAll(`#viewA [data-ap="${CSS.escape(x.pfad)}"]`).forEach((el) => el.classList.add('sel'));
  alleDetail();
}
const A_ART = { pdf: 'PDF', foto: 'Foto', cad: 'CAD-Zeichnung', office: 'Office-Datei', mail: 'E-Mail', andere: 'Datei' };
function alleDetail() {
  const el = ALLE_DET; if (!el || !el.isConnected) return;
  const x = (ALLE_L || []).find((y) => y.pfad === ALLE_SEL);
  if (!x) { el.innerHTML = '<div class="ad-leer">Eine Datei anklicken – hier stehen dann ihre Angaben.<br><small>Doppelklick öffnet sie.</small></div>'; return; }
  const dl = (L) => `<dl class="ad-dl">${L.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
  const k = x.pfad + '|' + x.mtime, I = ALLE_INFO.get(k);
  const ext = x.name.includes('.') ? x.name.split('.').pop().toUpperCase() : '';
  const info = !I ? '<p class="ad-lade">Lese Angaben aus der Datei …</p>' : I.error ? `<p class="ad-lade">${esc(I.error)}</p>`
    : I.gruppen.map(([t, L]) => `<div class="ad-t">${esc(t)}</div>${dl(L)}`).join('')
      + (I.gps ? `<div class="ad-t">Ort</div>${dl([['Koordinaten', I.gps.map((v) => String(v).replace('.', ',')).join(' · ')], ...(I.naehe ? [['Nähe', `${I.naehe.projekt} (${I.naehe.meter < 1000 ? I.naehe.meter + ' m' : (I.naehe.meter / 1000).toFixed(1).replace('.', ',') + ' km'})`]] : [])])}
        <a class="btn sm" href="https://www.openstreetmap.org/?mlat=${I.gps[0]}&mlon=${I.gps[1]}#map=18/${I.gps[0]}/${I.gps[1]}" target="_blank" rel="noopener">In der Karte zeigen ↗</a>` : '');
  el.innerHTML = `<div class="ad">
    <div class="ad-b">${x.v === 1 ? `<img src="${alleBild(x.pfad)}" alt="">` : `<span>${A_IC[x.art]}</span>`}</div>
    <h3>${esc(x.name)}</h3><div class="ad-p">${esc(x.ordner || (ALLE.basis || '').split('/').pop())}</div>
    ${dl([['Größe', mb(x.groesse)], ['Geändert', new Date(x.mtime * 1000).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })], ['Art', `${A_ART[x.art]}${ext ? ' (' + ext + ')' : ''}`]])}
    ${info}
    <div class="ad-a"><button type="button" class="btn sm pri" data-adoff>Öffnen</button><a class="btn sm" href="${alleUrl(x.pfad, true)}" data-ansehen="nein" download="${esc(x.name)}">⤓ Laden</a><button type="button" class="btn sm" data-adpfad>Pfad kopieren</button></div></div>`;
  if (!I) api(`api/alle/info?project_id=${pid}&pfad=${encodeURIComponent(x.pfad)}&g=${x.groesse}&m=${x.mtime}`).then((r) => { ALLE_INFO.set(k, r); }).catch((e) => { ALLE_INFO.set(k, { error: e.message }); })
    .finally(() => { if (ALLE_SEL === x.pfad) alleDetail(); });
}
document.addEventListener('click', async (e) => {
  if (tab !== 'alle' || !e.target.closest) return;
  if (e.target.closest('[data-adoff]')) { const i = alleSichtbar.F.findIndex((y) => y.pfad === ALLE_SEL); if (i >= 0) alleOeffnen(i); return; }
  if (e.target.closest('[data-adpfad]')) { const t = `${ALLE.basis ? ALLE.basis.replace(/\/$/, '') + '/' : ''}${ALLE_SEL}`;
    try { await navigator.clipboard.writeText(t); toast('Pfad kopiert.'); } catch { bpHinweis(t); } }
});
