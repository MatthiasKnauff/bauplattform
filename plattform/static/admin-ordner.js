'use strict';
/* Verwaltung → Einstellungen → Ablage & Server → „Projektordner aufräumen“: Projektordner auf dem Dateiserver mit einem Muster vergleichen und angleichen (nur Administratoren).
   Muster: die Projektvorlage auf dem Dateiserver („A0 Projektvorlage LEER“) oder ein gut sortiertes Projekt. Das Kürzel des
   Musters („A000“) steht für das Kürzel des jeweiligen Projekts. Vorgeschlagen werden Umbenennen, fehlende Ordner anlegen,
   Vorlagedateien kopieren und zusätzliche Unterordner auflösen – ausgeführt wird erst nach Vorher/Nachher und Bestätigung.
   Server: Bautagebuch /api/ordner/… (über /api/bt/ordner/… der Verwaltung). Gehört zu admin.html (gemeinsame Namen: api, esc, $, data). */
const ORD_LS = bpLS('bp.ordner.');   // gemerkt je Browser: Abfrage „Kürzel vor alles ohne Entsprechung“
const ORD = { kv: !!ORD_LS.get('kv', false), muster: '', projekte: null, wahl: new Set(), res: {}, sel: {}, offen: new Set(), busy: false, info: null };
const ORD_ART = { umbenennen: ['✎', 'Umbenennen'], anlegen: ['＋', 'Ordner anlegen'], kopieren: ['⧉', 'Vorlagedatei kopieren'], aufloesen: ['⤴', 'Unterordner auflösen'], verschieben: ['⇢', 'An die Stelle des Musters verschieben'] };
const ORD_TIPP = { umbenennen: 'Passt zum Muster, heißt aber anders (Kürzel, Schreibweise, Nummer)', anlegen: 'Fehlt im Projektordner',
  kopieren: 'Datei der Vorlage fehlt (z. B. Adressdatei) – nicht vorgewählt', aufloesen: 'Zusätzlicher Unterordner: Inhalt eine Ebene höher, Ordner weg – nicht vorgewählt',
  verschieben: 'Ordner liegt an anderer Stelle als im Muster – dorthin verschieben; gibt es ihn dort schon, wird der Inhalt zusammengeführt – nicht vorgewählt' };

const HANDY_ORD = () => matchMedia('(max-width: 760px)').matches;   // am Handy nur ansehen (Vorher/Nachher), ändern am PC
const ORD_KURZ = { umbenennen: 'umbenennen', anlegen: 'fehlt', kopieren: 'Datei fehlt', aufloesen: 'zusätzlich', verschieben: 'verschieben' };

/* Abschnitt „Projektordner aufräumen“ in Einstellungen → Ablage & Server (seit 17.11.2026; vorher eigener Punkt „Projektordner“).
   Beim Öffnen wird jeder Projektordner einmal gelesen (nur lesend) – die Tabelle zeigt je Projekt die Abweichung vom Muster. */
async function ordMount(el) {
  ORD.el = el;
  if (!ORD.projekte) {
    el.innerHTML = '<h2>Projektordner aufräumen</h2><p class="mute">Lade Projekte …</p>';
    const P = await api('api/projects');
    ORD.projekte = P.filter((p) => p.bt && !p.archived && /^[A-Za-z]+\d/.test(p.name || '')).map((p) => ({ id: p.bt.id, name: p.name }));
    try { ORD.info = await api('api/bt/ordner/muster'); } catch (e) { ORD.info = { error: e.message }; }
  }
  renderOrdner();
  if (!ORD.gelesen) ordPruefen();
}

function ordZeile(p) {
  const r = ORD.res[p.id], k = (p.name.match(/^\S+/) || [''])[0], rest = p.name.slice(k.length).trim();
  let ab = '<span class="mute">wird gelesen …</span>', ord = '', cls = '';
  if (r && r.error) { ab = esc(r.error); cls = 'ord-rot'; }
  else if (r) {
    ord = (r.projekt.pfad || '').split(/[\\/]/).filter(Boolean).pop() || '';
    const n = {}; r.schritte.forEach((s) => { n[s.art] = (n[s.art] || 0) + 1; });
    ab = r.schritte.length ? Object.keys(ORD_KURZ).filter((a) => n[a]).map((a) => `${n[a]} ${ORD_KURZ[a]}`).join(' · ') : 'passt';
    cls = r.schritte.length ? 'ord-or' : 'ord-gr';
  }
  return `<tr><td><input type="checkbox" data-ordp="${p.id}" aria-label="${esc(p.name)} auswählen"${ORD.wahl.has(p.id) ? ' checked' : ''}${r && !r.error && r.schritte.length ? '' : ' disabled'}></td>
    <td><b>${esc(k)}</b></td><td>${esc(rest)}</td><td class="ord-pf">${esc(ord || (r && !r.error ? '' : '—'))}</td><td class="${cls}">${r ? '● ' : ''}${ab}</td></tr>`;
}

function renderOrdner() {
  const el = ORD.el; if (!el || !el.isConnected) return;
  const I = ORD.info || {}, P = ORD.projekte || [];
  const abw = P.filter((p) => ORD.res[p.id] && !ORD.res[p.id].error && ORD.res[p.id].schritte.length);
  const zeig = ORD.zeigen ? [...ORD.wahl].filter((id) => ORD.res[id] && ORD.res[id].schritte) : [];
  const n = zeig.reduce((s, id) => s + (ORD.sel[id] ? ORD.sel[id].size : 0), 0);
  const musterWahl = `<label class="ord-l">Muster<select data-ordm data-bp-projekte aria-label="Muster" data-ph="Projekt oder Vorlage suchen …">${[['', I.muster ? I.muster.name : 'Projektvorlage auf dem Dateiserver'], ...P.map((p) => [String(p.id), p.name])]
    .map(([v, t]) => `<option value="${v}"${v === ORD.muster ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  el.innerHTML = `<div class="ord-kopf"><h2>Projektordner aufräumen</h2>${musterWahl}<span class="fill"></span>
      <label class="ord-kv" title="Ordner und Dateien ohne Entsprechung in der Projektvorlage bekommen das Projektkürzel davor (vorgewählt); zusätzliche Ordner werden dann umbenannt statt aufgelöst"><input type="checkbox" data-ordkv${ORD.kv ? ' checked' : ''}> Kürzel vor alles ohne Entsprechung in der Vorlage</label>
      <span class="mute">${ORD.busy ? `lese ${Object.keys(ORD.res).length} von ${P.length} …` : `${abw.length} von ${P.length} weichen ab`}</span>
      <button class="btn sm" data-a="ordAlle"${abw.length ? '' : ' disabled'}>${abw.length && abw.every((p) => ORD.wahl.has(p.id)) ? 'Keine' : 'Alle abweichenden'}</button>
      <button class="btn sm pri" data-a="ordVN"${ORD.wahl.size ? '' : ' disabled'}>${ORD.zeigen ? 'Vorher / Nachher ausblenden' : `Vorher / Nachher (${ORD.wahl.size})`}</button></div>
    ${I.testserver ? '<p class="ord-test">Testserver: nur Vorschau – am Dateiserver wird hier nichts geändert.</p>' : ''}
    ${I.error ? `<p class="err">${esc(I.error)}</p>` : ''}
    <table class="ord-t"><thead><tr><th></th><th>Kürzel</th><th>Projekt</th><th>Ordner auf dem Server</th><th>Abweichung</th></tr></thead><tbody>${P.map(ordZeile).join('')}</tbody></table>
    <p class="mute ord-hinw">Gelesen wird beim Öffnen, geändert wird nichts. Ausgeführt wird erst nach „Vorher / Nachher“ und deiner Bestätigung – Ordner mit anderem Kürzel oder anderer Schreibweise werden umbenannt, fehlende angelegt, zusätzliche Unterordner können aufgelöst werden.</p>
    ${zeig.map(ordKarte).join('')}
    ${zeig.length && HANDY_ORD() ? '<div class="bar ord-fuss"><span class="mute">Am Handy nur ansehen – ausführen geht am PC.</span></div>' : ''}
    ${zeig.length && !HANDY_ORD() ? `<div class="bar ord-fuss"><span class="mute">${n} Änderung${n === 1 ? '' : 'en'} gewählt</span><span class="fill"></span><button class="btn pri" data-a="ordLos"${n && !ORD.busy ? '' : ' disabled'}>Ausgewählte Änderungen ausführen</button></div>` : ''}`;
}

function ordKarte(id) {
  const r = ORD.res[id];
  if (r.error) return `<div class="card ord-k"><h3>${esc(r.name || 'Projekt')}</h3><p class="err">${esc(r.error)}</p></div>`;
  const S = r.schritte, sel = ORD.sel[id], offen = ORD.offen.has(id);
  const gruppen = Object.keys(ORD_ART).map((art) => {
    const L = S.filter((s) => s.art === art); if (!L.length) return '';
    return `<h4 title="${esc(ORD_TIPP[art])}">${ORD_ART[art][0]} ${ORD_ART[art][1]} <small class="mute">(${L.length})</small></h4>`
      + L.map((s) => `<label class="ord-s"><input type="checkbox" data-ords="${id}|${s.id}"${sel.has(s.id) ? ' checked' : ''}><span>${esc(s.pfad.join(' / '))}${s.neu ? ` <b>→ ${esc(s.neu)}</b>` : ''}${s.ziel ? ` <b>→ ${esc(s.ziel.join(' / '))}</b>` : ''}${s.grund ? ` <small class="mute">· ${esc(s.grund)}</small>` : ''}${s.inhalt != null ? ` <small class="mute">(${s.inhalt} Einträge)</small>` : ''}</span></label>`).join('');
  }).join('');
  return `<div class="card ord-k"><div class="bar" style="margin:0"><h3 style="margin:0">${esc(r.projekt.name)}</h3><small class="mute">${esc(r.projekt.pfad)} · Muster: ${esc(r.muster.name)}</small><span class="fill"></span>
      ${S.length ? `<button class="btn sm" data-a="ordBaum" data-id="${id}">${offen ? 'Bäume ausblenden' : 'Bäume zeigen'}</button>` : ''}</div>
    ${S.length ? gruppen : '<p class="mute" style="margin:.5rem 0 0">✓ Passt zum Muster – nichts zu ändern.</p>'}
    ${offen ? `<div class="ord-vn"><div><h4>Vorher</h4>${ordBaum(r.vorher, ordVorher(r, sel))}</div><div><h4>Nachher</h4>${ordNachher(r, sel)}</div></div>` : ''}</div>`;
}

/* Baum als eingerückte Liste: Ordner (bis 3 Ebenen), Dateien nur als Anzahl; Markierung neu/umbenannt/aufgelöst */
function ordBaum(b, mark, pfad = [], tiefe = 0) {
  if (tiefe > 2) return '';
  const E = Object.entries(b).sort((x, y) => (x[1].dir === y[1].dir ? x[0].localeCompare(y[0], 'de') : x[1].dir ? -1 : 1));
  const dateien = E.filter(([, v]) => !v.dir), ordner = E.filter(([, v]) => v.dir);
  const neu = dateien.filter(([k]) => mark[[...pfad, k].join('\u0001')]), rest = dateien.length - neu.length, fm = mark[[...pfad, '\u0002'].join('\u0001')] || '';
  let h = neu.map(([k]) => `<div class="ord-z ${mark[[...pfad, k].join('\u0001')]}" style="padding-left:${tiefe * 1.1}rem">📄 ${esc(k)}</div>`).join('')   // Dateien zuerst – sonst sehen sie aus, als lägen sie im Ordner darüber
    + (rest > 0 ? `<div class="ord-z ${fm || 'mute'}" style="padding-left:${tiefe * 1.1}rem">📄 ${rest} Datei${rest === 1 ? '' : 'en'}</div>` : '');
  h += ordner.map(([k, v]) => { const p = [...pfad, k], mk = mark[p.join('\u0001')] || '';
    return `<div class="ord-z ${mk}" style="padding-left:${tiefe * 1.1}rem">📁 ${esc(k)}</div>` + ordBaum(v.kinder || {}, mark, p, tiefe + 1); }).join('');
  return h;
}

/* Vorher: was die gewählten Schritte anfassen – Ordner, die umbenannt, verschoben oder aufgelöst werden, samt ihrer Dateien */
function ordVorher(r, sel) {
  const mark = {}, T = { umbenennen: 'alt', verschieben: 'alt', aufloesen: 'alt' };
  r.schritte.filter((s) => sel.has(s.id) && T[s.art]).forEach((s) => {
    mark[s.pfad.join('\u0001')] = 'alt';
    if (s.art !== 'umbenennen') mark[[...s.pfad, '\u0002'].join('\u0001')] = 'alt';   // die Dateien darin wandern mit
  });
  return mark;
}

/* Nachher: die gewählten Schritte auf eine Kopie des Baums anwenden – in derselben Reihenfolge wie der Server */
function ordNachher(r, sel) {
  const b = JSON.parse(JSON.stringify(r.vorher)), mark = {}, umb = {};
  const knoten = (pf) => { let n = { kinder: b }; for (const t of pf) { n = n.kinder[t]; if (!n) return null; } return n; };
  const um = (pf) => pf.map((t, i) => umb[pf.slice(0, i + 1).join('\u0001')] || t);
  const rang = { umbenennen: 0, aufloesen: 1, verschieben: 2, anlegen: 3, kopieren: 4 };
  const W = r.schritte.filter((s) => sel.has(s.id)).sort((x, y) => rang[x.art] - rang[y.art] || (rang[x.art] < 3 ? y.pfad.length - x.pfad.length : x.pfad.length - y.pfad.length));
  for (const s of W) {
    if (s.art === 'umbenennen') {
      const alt = [...um(s.pfad.slice(0, -1)), s.pfad[s.pfad.length - 1]], el = knoten(alt.slice(0, -1)); if (!el || !el.kinder[alt[alt.length - 1]]) continue;
      el.kinder[s.neu] = el.kinder[alt[alt.length - 1]]; delete el.kinder[alt[alt.length - 1]];
      umb[s.pfad.join('\u0001')] = s.neu; mark[[...alt.slice(0, -1), s.neu].join('\u0001')] = 'umb';
    } else if (s.art === 'aufloesen') {
      const x = um(s.pfad), el = knoten(x.slice(0, -1)), n = el && el.kinder[x[x.length - 1]]; if (!n) continue;
      delete el.kinder[x[x.length - 1]];
      for (const [k, v] of Object.entries(n.kinder || {})) { let z = k, i = 2; while (el.kinder[z]) z = k.replace(/(\.[^.]+)?$/, ` (${i++})$1`); el.kinder[z] = v; mark[[...x.slice(0, -1), z].join('\u0001')] = 'hoch'; }
    } else if (s.art === 'verschieben') {
      const x = um(s.pfad), el = knoten(x.slice(0, -1)), n = el && el.kinder[x[x.length - 1]]; if (!n) continue;
      delete el.kinder[x[x.length - 1]];
      let z = { kinder: b }; s.ziel.forEach((t, i) => { if (!z.kinder[t]) { z.kinder[t] = { dir: true, kinder: {} }; mark[s.ziel.slice(0, i + 1).join('\u0001')] = 'neu'; } z = z.kinder[t]; });
      if (Object.keys(z.kinder).length) Object.entries(n.kinder || {}).forEach(([k, v]) => { z.kinder[z.kinder[k] ? k + ' (2)' : k] = v; }); else z.kinder = n.kinder || {};
      mark[s.ziel.join('\u0001')] = 'umb'; mark[[...s.ziel, '\u0002'].join('\u0001')] = 'umb';
    } else {
      const x = um(s.pfad), el = knoten(x.slice(0, -1)); if (!el) continue;
      if (!el.kinder[x[x.length - 1]]) el.kinder[x[x.length - 1]] = { dir: s.art === 'anlegen', kinder: {} };
      mark[x.join('\u0001')] = 'neu';
    }
  }
  return ordBaum(b, mark);
}

async function ordPruefen() {
  ORD.busy = true; ORD.gelesen = true; ORD.res = {}; ORD.sel = {}; ORD.wahl = new Set(); ORD.zeigen = false; renderOrdner();
  const warte = setTimeout(() => { if (ORD.busy) renderOrdner(); }, 1500);
  const Q = [...(ORD.projekte || [])];
  const eins = async () => { for (let p; (p = Q.shift());) {
    try { ORD.res[p.id] = await api(`api/bt/ordner/pruefen?project_id=${p.id}${ORD.muster ? '&projekt=' + ORD.muster : ''}${ORD.kv ? '&kv=1' : ''}`); }
    catch (e) { ORD.res[p.id] = { error: e.message, name: p.name }; }
    const r = ORD.res[p.id];
    if (r.schritte) { ORD.sel[p.id] = new Set(r.schritte.filter((s) => s.vor).map((s) => s.id)); if (r.schritte.length) ORD.wahl.add(p.id); }
    renderOrdner();
  } };
  await Promise.all([eins(), eins(), eins(), eins()]);   // vier zugleich – bei vielen Projekten wenige Sekunden
  clearTimeout(warte); ORD.busy = false; renderOrdner();
}

async function ordLos() {
  const ids = [...ORD.wahl].filter((id) => ORD.sel[id] && ORD.sel[id].size), n = ids.reduce((s, id) => s + ORD.sel[id].size, 0);
  if (!(await bpFrage(`${n} Änderung${n === 1 ? '' : 'en'} in ${ids.length} Projektordner${ids.length === 1 ? '' : 'n'} auf dem Dateiserver ausführen?\nUmbenennen und Auflösen lassen sich hier nicht rückgängig machen – jeder Schritt steht im Protokoll.`, { ok: 'Ausführen' }))) return;
  ORD.busy = true; renderOrdner();
  const fehler = []; let ok = 0, test = false;
  for (const id of ids) {
    try {
      const r = await api('api/bt/ordner/ausfuehren', 'POST', { project_id: id, projekt: ORD.muster ? +ORD.muster : null, kv: ORD.kv, ids: [...ORD.sel[id]] });
      ok += r.erledigt; test = test || r.testserver; fehler.push(...r.fehler.map((f) => ORD.res[id].projekt.name + ': ' + f));
      if (r.unbekannt) fehler.push(`${ORD.res[id].projekt.name}: ${r.unbekannt} Schritt(e) nicht mehr aktuell – bitte neu prüfen`);
    } catch (e) { fehler.push(e.message); }
  }
  ORD.busy = false;
  toast(test ? 'Testserver: nur Vorschau – am Dateiserver wurde nichts geändert.' : `${ok} Änderung${ok === 1 ? '' : 'en'} ausgeführt${fehler.length ? ', ' + fehler.length + ' Fehler' : ''}.`, !!fehler.length);
  if (fehler.length && window.bpHinweis) bpHinweis(fehler.slice(0, 12).join('\n'));
  ordPruefen();
}

const ordHier = (e) => ORD.el && ORD.el.isConnected && ORD.el.contains(e.target);
document.addEventListener('click', (e) => {
  if (!ordHier(e)) return;
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, abw = (ORD.projekte || []).filter((p) => ORD.res[p.id] && ORD.res[p.id].schritte && ORD.res[p.id].schritte.length).map((p) => p.id);
  if (a === 'ordAlle') { ORD.wahl = abw.every((id) => ORD.wahl.has(id)) ? new Set() : new Set(abw); renderOrdner(); }
  else if (a === 'ordVN') { ORD.zeigen = !ORD.zeigen; renderOrdner(); }
  else if (a === 'ordLos') ordLos();
  else if (a === 'ordBaum') { const id = +b.dataset.id; ORD.offen.has(id) ? ORD.offen.delete(id) : ORD.offen.add(id); renderOrdner(); }
});
document.addEventListener('change', (e) => {
  if (!ordHier(e)) return;
  const t = e.target;
  if (t.matches('[data-ordm]')) { ORD.muster = t.value; ordPruefen(); }
  else if (t.matches('[data-ordkv]')) { ORD.kv = t.checked; ORD_LS.set('kv', ORD.kv); ordPruefen(); }
  else if (t.matches('[data-ordp]')) { const id = +t.dataset.ordp; t.checked ? ORD.wahl.add(id) : ORD.wahl.delete(id); renderOrdner(); }
  else if (t.matches('[data-ords]')) { const [id, s] = t.dataset.ords.split('|'); t.checked ? ORD.sel[id].add(s) : ORD.sel[id].delete(s); renderOrdner(); }
});
