/* Bauantrag – Statistischer Erhebungsbogen (nach bauantrag-pdf.js geladen, gemeinsame Namen).
   Der Bogen wird online beim Statistischen Landesamt ausgefüllt; den Ausdruck legt man als Beleg in den Antrag (kommt ins Papier-PDF).
   Geteilt wie bei den PDFs: links die Werte aus dem Antrag (Klick kopiert), rechts das Online-Formular als eigenes Fenster (Einbetten lässt das Landesamt nicht zu).
   Ausfüllen auf einen Klick: „Werte kopieren“ legt die Werte in die Zwischenablage, das Lesezeichen „Bauportal ausfüllen“ setzt sie in der
   Seite des Landesamts in die passenden Felder (nach der Beschriftung) und markiert sie grün. Eine fremde Seite darf unsere Seite nicht
   beschreiben und umgekehrt – darum läuft das Lesezeichen nur im eigenen Fenster des Landesamts, nicht in der Einbettung. Ein Datenzugang
   zum Online-Dienst der Statistikämter gibt es nicht. */
const STAT_URL = 'https://bau.statistik-bw.de/baut/servlet/LaenderServlet';   // Bautätigkeitsstatistik Online der Statistischen Ämter (Land wählen)
const STAT_WERTE = () => {
  const W = (k) => String((baFeld(k) || {}).wert || '');
  return [['Ort', W('gs_ort'), ['gemeinde', 'ort', 'plz ort']], ['Straße, Hausnummer', W('gs_strasse'), ['strasse', 'strasse hausnummer']],
    ['Gemarkung', W('gemarkung'), ['gemarkung']], ['Flur', W('flur'), ['flur']], ['Flurstück', W('flurstueck'), ['flurstueck', 'flurstuecke']],
    ['Bauherrschaft', W('bauherr_name'), ['bauherr', 'bauherrin', 'bauherrschaft', 'name des bauherrn']], ['Anschrift Bauherrschaft', W('bauherr_anschrift'), ['anschrift', 'anschrift bauherr']],
    ['Art der Bautätigkeit', W('art'), ['art der bautaetigkeit', 'bautaetigkeit', 'art der baumassnahme', 'baumassnahme']], ['Nutzung', W('nutzung'), ['nutzung', 'gebaeudeart', 'art des gebaeudes']],
    ['Gebäudeklasse', W('gebaeudeklasse'), ['gebaeudeklasse']], ['Vollgeschosse', W('geschosse'), ['vollgeschosse', 'anzahl der vollgeschosse', 'geschosse']],
    ['Wohneinheiten', W('we'), ['wohnungen', 'anzahl der wohnungen', 'wohneinheiten']], ['Brutto-Rauminhalt BRI (m³)', W('bri'), ['rauminhalt', 'brutto rauminhalt', 'umbauter raum']],
    ['Bruttogrundfläche BGF (m²)', W('bgf'), ['bruttogrundflaeche', 'brutto grundflaeche']], ['Grundfläche (m²)', W('grf'), ['grundflaeche', 'ueberbaute flaeche']],
    ['Herstellungskosten (€)', W('herstellung'), ['veranschlagte kosten', 'kosten des bauwerks', 'baukosten', 'herstellungskosten', 'kosten']]];
};

/* Lesezeichen: läuft in der Seite des Landesamts (nicht bei uns), liest die Werte aus der Zwischenablage (oder Strg+V), füllt nach Beschriftung */
function bpStatFuellen() {
  if (window.BPHead) return;   // in unserer eigenen Seite nichts anfassen
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:2147483647;right:12px;top:12px;width:320px;background:#fff;color:#222;border:2px solid #2f5d8a;border-radius:10px;padding:10px 12px;font:14px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3)';
  box.innerHTML = '<b>Bauportal ausfüllen</b> <button type="button" style="float:right;border:0;background:none;font-size:18px;cursor:pointer">×</button><div>Werte werden gelesen … sonst hier Strg+V drücken.</div>';
  document.body.appendChild(box); box.querySelector('button').addEventListener('click', () => box.remove());
  const msg = (t) => { box.lastChild.textContent = t; };
  const norm = (s) => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  const lab = (el) => {
    let t = ''; const d = el.ownerDocument;
    if (el.id) { const l = d.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l) t = l.textContent; }
    if (!t && el.closest('label')) t = el.closest('label').textContent;
    t = t || el.getAttribute('aria-label') || el.title || '';
    if (!t) { const td = el.closest('td'); if (td && td.previousElementSibling) t = td.previousElementSibling.textContent; }
    if (!t && el.previousElementSibling) t = el.previousElementSibling.textContent;
    return norm(t);
  };
  const setz = (el, w) => {
    if (el.tagName === 'SELECT') { const n = norm(w), o = [...el.options].find((x) => { const y = norm(x.textContent); return y && (y === n || y.includes(n) || n.includes(y)); }); if (!o) return false; el.value = o.value; }
    else { const ds = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value'); if (ds && ds.set) ds.set.call(el, w); else el.value = w; }
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    el.style.background = '#e3f1e7'; el.style.outline = '2px solid #2f8a4c'; return true;
  };
  const fuell = (t) => {
    let D; try { D = JSON.parse(String(t).replace(/^\s*BPSTAT:/, '')); } catch { msg('Keine Bauportal-Werte in der Zwischenablage – im Bauportal zuerst „Werte kopieren“ klicken.'); return; }
    const docs = [document]; document.querySelectorAll('iframe,frame').forEach((f) => { try { if (f.contentDocument) docs.push(f.contentDocument); } catch { /* fremd */ } });
    const F = []; docs.forEach((d) => d.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]),select,textarea')
      .forEach((el) => { if (!el.disabled && !el.readOnly && !el.value) F.push({ el, l: lab(el) }); }));
    const P = [];   // alle Paare Wert × Feld mit Güte, dann die besten zuerst (so nimmt „Flur“ nicht das Feld „Flurstück“)
    D.forEach((x, i) => { if (!x.w) return; F.forEach((f, j) => { let best = 0; x.k.forEach((k) => { k = norm(k); const s = f.l === k ? 3 : f.l.startsWith(k + ' ') ? 2 : (' ' + f.l + ' ').includes(' ' + k + ' ') ? 1.5 : 0; if (s) best = Math.max(best, s + k.length / 100); }); if (best) P.push([best, i, j]); }); });
    P.sort((a, b) => b[0] - a[0]);
    const wd = new Set(), fd = new Set();
    P.forEach(([, i, j]) => { if (wd.has(i) || fd.has(j)) return; if (setz(F[j].el, D[i].w)) { wd.add(i); fd.add(j); } });
    const rest = D.filter((x, i) => x.w && !wd.has(i)).map((x) => x.l);
    msg(wd.size + ' Felder ausgefüllt (grün).' + (rest.length ? ' Selbst eintragen: ' + rest.join(', ') + '.' : '') + ' Bitte alles prüfen und dann beim Landesamt absenden.');
  };
  const h = (e) => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (/BPSTAT:/.test(t)) { e.preventDefault(); document.removeEventListener('paste', h, true); fuell(t); } };
  document.addEventListener('paste', h, true);
  if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then((t) => { if (/^\s*BPSTAT:/.test(t)) { document.removeEventListener('paste', h, true); fuell(t); } }).catch(() => {});
}
const STAT_LZ = 'javascript:' + encodeURIComponent('(' + bpStatFuellen.toString() + ')()');

/* Zwei Wege: (A) der leere Erhebungsbogen des Landesamts als Vordruck – einmal hochladen, dann wie die anderen Formulare ausfüllen
   (Platzieren / Im PDF ausfüllen) und mit ins Paket; (B) online beim Landesamt melden und den Ausdruck als Beleg beilegen. */
const statVordruck = () => (D.paket || []).find((x) => x.art === 'vordruck' && /statist|erhebungsbogen/i.test(x.titel));
function statistikHtml() {
  const R = STAT_WERTE(), VD = statVordruck();
  const b = D.bauvorlagen.find((x) => x.key === 'statistik') || {};
  const beleg = (D.paket || []).filter((x) => x.art === 'unterlage' && /statist|erhebung/i.test(x.titel));
  const st = b.status === 'entfaellt' ? '<span class="ba-chip">entfällt</span>' : VD && VD.an ? '<span class="ba-chip ok">✓ als Vordruck im Paket</span>'
    : beleg.length || b.status === 'da' ? '<span class="ba-chip ok">✓ Beleg liegt bei</span>' : '<span class="ba-chip of">fehlt noch</span>';
  const vordruck = VD
    ? `<p>Der Erhebungsbogen liegt als <b>Vordruck</b> vor (${esc(VD.fassung || '')}) und wird wie die anderen Formulare ausgefüllt.</p>
       <p><button type="button" class="btn${VD.an ? '' : ' pri'}" data-bapan="${VD.key}">${VD.an ? '✓ im Paket – herausnehmen' : '＋ ins Paket aufnehmen'}</button>
         <button type="button" class="btn${!VD.felder && !VD.platziert ? ' pri' : ''}" data-bapplatz="${VD.key}" title="Werte auf die Seite setzen – der leere Bogen hat meist keine Formularfelder">Platzieren …</button>
         <button type="button" class="btn" data-bapsehen="${VD.key}">Ansehen</button>
         <label class="btn" title="Neue Fassung des leeren Bogens hochladen">Ersetzen<input type="file" accept="application/pdf" data-statvordruck hidden></label></p>
       <p class="ba-hilfe">${VD.platziert ? `${VD.platziert} Werte platziert – sie stehen in jedem Antrag an derselben Stelle.` : VD.felder ? `${VD.felder} Formularfelder – „Im PDF ausfüllen“ rechts.` : 'Noch keine Werte platziert: „Platzieren …“ – einmal je Fassung, danach füllt sich der Bogen in jedem Antrag selbst.'}</p>`
    : `<ol class="ba-stat-s"><li>Beim Landesamt <b>${esc(LAND_NAME[D.antrag.land] || 'dein Bundesland')}</b> wählen und „<b>Leeren Erhebungsbogen für Baugenehmigung ausdrucken (PDF)</b>“ → Ausführen, das PDF speichern.</li>
         <li>Hier hochladen – einmal fürs Büro, danach steht er in jedem Antrag unter „Amtliche Vordrucke“.</li><li>Einmal „Platzieren …“, dann füllt er sich mit den Werten des Antrags.</li></ol>
       <p><a class="btn" href="${STAT_URL}" data-statfen>Landesamt öffnen ↗</a> <label class="btn pri">📎 Leeren Bogen hochladen<input type="file" accept="application/pdf" data-statvordruck hidden></label></p>`;
  return `<div class="ba-k"><h3>Statistischer Erhebungsbogen ${st}</h3>${vordruck}
      <p><button type="button" class="btn sm" data-bv="statistik" data-v="${b.status === 'entfaellt' ? 'offen' : 'entfaellt'}">${b.status === 'entfaellt' ? 'wird doch gebraucht' : 'entfällt (z. B. Abbruch ohne Neubau)'}</button></p></div>
    <details class="ba-k ba-online"${!VD && beleg.length ? ' open' : ''}><summary><h3>Oder online melden und den Ausdruck beilegen</h3></summary>
    <ol class="ba-stat-s"><li>Das <b>Online-Formular</b> des Landesamts im eigenen Fenster rechts daneben öffnen – die Werte unten mit einem Klick kopieren, oder alles auf einmal mit dem Lesezeichen.</li><li>Am Ende den Ausdruck als PDF speichern.</li><li>Das PDF hier als <b>Beleg</b> ablegen – es kommt mit ins Papier-PDF des Antrags.</li></ol>
    <p><button type="button" class="btn" data-statalle>⚡ Werte kopieren</button> <a class="btn" href="${STAT_URL}" data-statfen>Online-Formular im eigenen Fenster ↗</a> <label class="btn">📎 Beleg (PDF) ablegen<input type="file" accept="application/pdf" data-statbeleg hidden></label></p>
    ${beleg.length ? `<p class="ba-hilfe">Beleg: ${beleg.map((x) => `<a href="#" data-statsehen="${x.key}">📄 ${esc(x.titel)}</a>`).join(' · ')}</p>` : ''}
    <p>Lesezeichen einmal einrichten: mit der Maus in die <b>Lesezeichenleiste</b> ziehen → <a class="btn sm ba-lzk" href="${esc(STAT_LZ)}" data-statlz draggable="true" title="In die Lesezeichenleiste ziehen">🔖 Bauportal ausfüllen</a> – dann im Formularfenster anklicken, passende Felder werden grün.</p></details>
    <div class="ba-k"><h3>Werte aus dem Antrag<span class="mute">Klick kopiert den Wert</span></h3><table class="ba-t ba-stat"><tbody>
    ${R.map(([l, w]) => `<tr><td>${esc(l)}</td><td>${w ? `<button type="button" class="ba-kopie" data-kopie="${esc(w)}" title="kopieren">${esc(w)} <span>⧉</span></button>` : '<span class="mute">– noch leer</span>'}</td></tr>`).join('')}
    </tbody></table></div>`;
}
const LAND_NAME = { BW: 'Baden-Württemberg', BY: 'Bayern', BE: 'Berlin', BB: 'Brandenburg', HB: 'Bremen', HH: 'Hamburg', HE: 'Hessen', MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen', NW: 'Nordrhein-Westfalen', RP: 'Rheinland-Pfalz', SL: 'Saarland', SN: 'Sachsen', ST: 'Sachsen-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thüringen' };
/* leeren Bogen als Vordruck des Landes hochladen (wie unter „Formulare“) und gleich in diesen Antrag aufnehmen */
document.addEventListener('change', async (e) => {
  const inp = e.target; if (!inp.dataset || inp.dataset.statvordruck === undefined || !inp.files.length || !D) return;
  const f = inp.files[0], VD = statVordruck(), id = AID; inp.value = '';
  const fd = new FormData(); fd.append('datei', f); fd.append('land', D.antrag.land || 'NW'); fd.append('nr', 'Statistik'); fd.append('titel', 'Statistischer Erhebungsbogen (Baugenehmigung)');
  if (VD) fd.append('id', VD.key.slice(1));
  try {
    const r = await fetch('api/formulare/hochladen', { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    D = await api('api/antraege/' + id); const x = statVordruck();
    if (x && !x.an) D = await api(`api/antraege/${id}/paket`, 'PUT', { key: x.key, an: true });
    zeichne(); toast(VD ? 'Neue Fassung des Erhebungsbogens hochgeladen.' : 'Erhebungsbogen als Vordruck abgelegt und in den Antrag aufgenommen – jetzt einmal „Platzieren …“.');
  } catch (er) { toast(er.message, true); }
});

/* Reiter „Online-Formular“ im Bereich rechts: Das Landesamt lässt sich nicht einbetten (getestet 12.11.2026 – der Browser zeigt nur das
   Sperrzeichen). Darum öffnet das Formular als eigenes Fenster rechts neben dem Bauportal; hier stehen Knopf und Ablauf. */
function statFormularIn(el) {
  el.innerHTML = `<div class="ba-stfr ba-stleer"><div><h3>Online-Formular des Statistischen Landesamts</h3>
    <p>Das Landesamt erlaubt nicht, sein Formular hier einzubetten. Es öffnet sich deshalb als <b>eigenes Fenster rechts daneben</b> – dieses Fenster mit den Werten bleibt links.</p>
    <p><a class="btn pri" href="${STAT_URL}" data-statfen>Online-Formular rechts daneben öffnen ↗</a></p>
    <ol class="ba-stat-s"><li><b>⚡ Werte kopieren</b> (links).</li><li>Im Formularfenster auf das Lesezeichen <b>„Bauportal ausfüllen“</b> klicken – passende Felder werden grün.</li><li>Rest ergänzen, beim Landesamt absenden, Ausdruck als PDF hier als Beleg ablegen.</li></ol></div></div>`;
}
function statFenster() {   // rechts neben das Bauportal legen (so weit der Browser das erlaubt)
  const w = Math.round(screen.availWidth / 2), h = screen.availHeight, l = (screen.availLeft || 0) + w;
  const f = window.open(STAT_URL, 'bpstatistik', `popup,width=${w},height=${h},left=${l},top=${screen.availTop || 0}`);
  if (!f) window.open(STAT_URL, '_blank', 'noopener');
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest) return;
  const k = e.target.closest('[data-kopie]');
  if (k) { try { await navigator.clipboard.writeText(k.dataset.kopie); toast('Kopiert: ' + k.dataset.kopie); } catch { bpHinweis(k.dataset.kopie); } return; }
  if (e.target.closest('[data-statalle]')) {
    const P = STAT_WERTE().filter((x) => x[1]).map(([l, w, k]) => ({ l, w, k }));
    try { await navigator.clipboard.writeText('BPSTAT:' + JSON.stringify(P)); toast(`${P.length} Werte kopiert – jetzt im Online-Formular (eigenes Fenster) das Lesezeichen „Bauportal ausfüllen“ klicken.`); }
    catch { bpHinweis('Die Zwischenablage ist gesperrt – bitte die Werte einzeln kopieren.'); }
    return;
  }
  if (e.target.closest('[data-statfen]')) { e.preventDefault(); statFenster(); return; }
  if (e.target.closest('[data-statlz]')) { e.preventDefault(); bpHinweis('Diesen Knopf nicht anklicken, sondern mit der Maus in die Lesezeichenleiste ziehen (Strg+Umschalt+B blendet sie ein). Benutzt wird er dann in der Seite des Landesamts.'); return; }
  const s = e.target.closest('[data-statsehen]');
  if (s) { e.preventDefault(); BPHead.ansehen([{ url: `api/antraege/${AID}/stueck/${s.dataset.statsehen}.pdf`, typ: 'pdf', name: 'Statistischer Erhebungsbogen' }]); }
});
document.addEventListener('change', async (e) => {
  const inp = e.target; if (!inp.dataset || inp.dataset.statbeleg === undefined || !inp.files.length) return;
  const f = inp.files[0]; inp.value = '';
  const fd = new FormData(); fd.append('datei', new File([f], 'Statistischer Erhebungsbogen (Beleg).pdf', { type: 'application/pdf' }));
  const id = AID;
  try {
    const r = await fetch(`api/antraege/${id}/unterlagen`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Hochladen fehlgeschlagen');
    D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { statistik: { status: 'da' } } }); zeichne();
    toast('Beleg abgelegt – er liegt im Papier-PDF des Antrags.');
    rueckgaengig('Beleg Statistik abgelegt', async () => { for (const u of d.neu || []) await api('api/unterlagen/' + u, 'DELETE'); D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { statistik: null } }); zeichne(); });
  } catch (er) { toast(er.message, true); }
});
