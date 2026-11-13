/* ✨ Langtext vorschlagen: Länge je Benutzer:in gemerkt (ganz kurz · kurz · mittel · lang) */
const KI_L = [['ganzkurz', 'ganz kurz'], ['kurz', 'kurz'], ['mittel', 'mittel'], ['lang', 'lang']];
const kiLaenge = () => { const v = LS.get('kilaenge', 'mittel'); return KI_L.some(([k]) => k === v) ? v : 'mittel'; };
/* Ausschreibung (AVA) – Leistungsverzeichnis, neues LV, Einlesen und Ausgeben.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Leistungsverzeichnis ---------- */
const aufgehoben = () => !!(L && L.vergabe && L.vergabe.aufgehoben);   // Beauftragung aufgehoben: Auftrag und Rechnungen bleiben sichtbar, zählen aber nicht mehr
const vergeben = () => !!(L && L.vergabe && L.vergabe.preise) && !aufgehoben();
/* Sperre (Wunsch 11.11.): beauftragter Auftrag und beauftragte Nachträge lassen sich nur nach ausdrücklicher Bestätigung ändern – je LV bzw. je Nachtrag, bis zum Neuladen */
const FREI = new Set(); let SPERRFRAGE = false;
function sperrKey(x) { if (!L || !x) return null; if (x.nt) return x.nt_status === 'beauftragt' ? `${L.id}:nt:${x.nt}` : null; return vergeben() ? String(L.id) : null; }
const gesperrt = (x) => { const k = sperrKey(x); return !!k && !FREI.has(k); };
/* Sperre leise anzeigen (Wunsch 13.11.): 🔒/🔓 neben dem LV im Baum und oben in den Details – Klick schaltet frei bzw. sperrt wieder */
const sperrIcon = (k) => `<span class="lv-sp${FREI.has(k) ? ' frei' : ''}" data-lvsperre="${esc(k)}" role="button" tabindex="0" title="${FREI.has(k) ? 'Bearbeiten freigeschaltet – Klick: wieder sperren' : 'Beauftragt, Positionen gesperrt – Klick: zum Bearbeiten freischalten'}">${FREI.has(k) ? '🔓' : '🔒'}</span>`;
function sperrZeile(x) {   // x = null: das LV; sonst ein beauftragter Nachtrag
  const k = x ? sperrKey(x) : (vergeben() ? String(L.id) : null); if (!k) return '';
  const was = x ? `Nachtrag ${esc(x.nt)} beauftragt` : `Beauftragt an ${esc((L.vergabe && L.vergabe.bieter) || L.auftragnehmer || 'die Firma')}`;
  return `<div class="lv-sz${FREI.has(k) ? ' frei' : ''}">${FREI.has(k) ? '🔓' : '🔒'} <span>${was} – ${FREI.has(k) ? 'Bearbeiten freigeschaltet' : 'Positionen gesperrt'}</span><button type="button" class="btn sm" data-lvsperre="${esc(k)}">${FREI.has(k) ? '🔒 Wieder sperren' : '🔓 Freischalten'}</button></div>`;
}
document.addEventListener('click', async (e) => {
  const s = e.target.closest && e.target.closest('[data-lvsperre]'); if (!s) return; e.stopPropagation();
  const k = s.dataset.lvsperre, lvId = +k.split(':')[0];
  if (FREI.has(k)) { FREI.delete(k); if (typeof VWARN !== 'undefined') VWARN.ok.delete(lvId); render(); toast('Wieder gesperrt – Änderungen nur nach Freischalten.'); return; }
  if (!(await bpFrage(k.includes(':nt:') ? 'Beauftragten Nachtrag zum Bearbeiten freischalten?' : 'Dieses LV ist beauftragt – die Positionen sind Vertragsinhalt. Zusätzliche Leistungen besser als Nachtrag.\n\nZum Bearbeiten freischalten?', { ok: '🔓 Freischalten', abbrechen: 'Gesperrt lassen' }))) return;
  FREI.add(k); if (!k.includes(':nt:') && typeof VWARN !== 'undefined') VWARN.ok.add(lvId); render();
}, true);
const psDruckOhne = () => { const o = typeof psOhne === 'function' ? [...psOhne(L.angebote || [])] : []; return o.length ? '&ohne=' + o.join(',') : ''; };   // Preisspiegel: graue und ausgeblendete Bieter nicht drucken
async function freischalten(x) {
  const k = sperrKey(x); if (!k || FREI.has(k)) return true;
  const firma = (L.vergabe && L.vergabe.bieter) || L.auftragnehmer || 'die Firma';
  const ja = await bpFrage(x.nt ? `Nachtrag ${x.nt} ist beauftragt – Leistung, Menge und Preis sind vereinbart.\n\nWirklich ändern?`
    : `Dieses LV ist an ${firma} beauftragt – die Positionen sind Vertragsinhalt.\nÄnderungen ändern den Auftrag rückwirkend; Aufmaß und Rechnungen rechnen mit den neuen Werten. Zusätzliche Leistungen besser als Nachtrag.\n\nWirklich ändern?`,
    { ok: '🔓 Bearbeiten freischalten', abbrechen: 'Nicht ändern' });
  if (ja) { FREI.add(k); if (!x.nt && typeof VWARN !== 'undefined') VWARN.ok.add(L.id); }
  return ja;
}
['pointerdown', 'beforeinput', 'keydown', 'dragstart', 'dblclick'].forEach((art) => document.addEventListener(art, async (e) => {   // erst beim Ändern fragen – Hineinklicken, Markieren, Kopieren, Feld größer ziehen und Blättern bleiben frei
  if (typeof tab === 'undefined' || tab !== 'lv' || !L) return;
  const tr = e.target.closest && e.target.closest('table.lv tr.zu[data-i]'); if (!tr) return;
  const feld = e.target.closest('input,select,textarea,[contenteditable],button[data-a]:not([data-a="lang"])'), text = feld && feld.matches('input:not([type=checkbox]),textarea,[contenteditable]');
  if (art === 'beforeinput' && !text) return;   // Tippen, Einfügen, Löschen in Textfeldern
  if (art === 'pointerdown' && (!feld || text)) return;   // Auswahllisten, Häkchen und Knöpfe öffnen erst nach der Frage
  if (art === 'keydown' && (!feld || text || /^(Tab|Shift|Control|Alt|Meta|Escape|Page\w+|Home|End|F6)$/.test(e.key))) return;
  if (art === 'dblclick' && text) return;
  e.preventDefault(); e.stopPropagation();
  if (SPERRFRAGE) return; SPERRFRAGE = true;
  const ok = await freischalten(items()[+tr.dataset.i]).finally(() => { SPERRFRAGE = false; });
  if (ok) render();
}, true));
function aufhBanner() {
  const A = L.vergabe.aufgehoben || {}, d = A.am ? A.am.split('-').reverse().join('.') : '';
  return `<div class="aufh-b"><span class="aufh-i">⏸</span><div><b>Beauftragung an ${esc(L.vergabe.bieter || 'die Firma')} aufgehoben</b>${d ? ` am ${d}` : ''}${A.von ? ` von ${esc(A.von)}` : ''}.
    <div class="hint">Auftrag, Nachträge und die ${(L.rechnungen || []).length} Rechnung${(L.rechnungen || []).length === 1 ? '' : 'en'} bleiben zum Nachsehen erhalten, sind aber deaktiviert – sie zählen nicht mehr in Kostenkontrolle, Prognose und To-dos. Das LV steht wieder in der Ausschreibung.</div></div>
    <button class="btn sm pri" data-act="reaktiv">▶ Wieder beauftragen</button></div>`;
}
/* LV als Baum wie in „Aufträge“: Projekt → LV → Titel (zuklappbar) → Positionen; Kurztext direkt in der Zeile bearbeiten */
let LVZU = bpBaum.klapp();   // welche Titel sind zugeklappt (gemeinsamer Baustein /bp/baum.js)
const lvTiefe = (y) => (y.typ === 'titel' ? y.lvl || 1 : Infinity);   // Ebene einer LV-Zeile: Titel 1–4, Positionen sind Blätter
const LVGZ = new Set(LS.get('lvgz', []));   // ganz zugeklappte LVs (im Baum nur noch die Zeile)
document.addEventListener('click', (e) => { const c = e.target.closest && e.target.closest('[data-lvganz]'); if (!c || !L) return; e.stopPropagation(); if (LVGZ.has(L.id)) LVGZ.delete(L.id); else LVGZ.add(L.id); LS.set('lvgz', [...LVGZ]); render(); }, true);
const lvZuLaden = () => { LVZU = bpBaum.klapp({ anfang: items().filter((x) => x.typ === 'titel').map((x) => x.id) }); };   // beim Anwählen eines LV: alle Titel zugeklappt
let LVF = [], LVUM = null;   // sichtbare Zeilen des LV (Nummern in items()) · zuletzt markierte Zeile beim Zeichnen
/* Zeile i des LV auf der Seite (bei großen LVs wird sie dafür in den Ausschnitt geholt); rest = Auswahl darin, z. B. ' [data-f="kurz"]' */
function lvTr(i, rest = '') { const k = LVF.indexOf(+i); if (k >= 0) bpBaum.fenster.zeige('lv', k); return document.querySelector(`table.lv tr[data-i="${i}"]${rest}`); }
/* Das LV zeichnet in zwei Teilen: vLv() baut den Rahmen (Vorbemerkungen, Spaltenköpfe, Summenzeile), lvKoerper() die Zeilen. Ändert sich nur
   der Inhalt (Auf-/Zuklappen, neue Zeile, Verschieben), tauscht lvNeu() allein die Zeilen aus – Navigation, Befehlsleiste und der Bereich
   rechts bleiben stehen. Das ist ein Vielfaches schneller als render(). */
function vLv() {
  const V = vergeben();
  return `${lvGaebHinweis()}
    ${L.data.showVorbem ? `<div class="card" style="margin-bottom:.7rem"><div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><b>Vorbemerkungen</b><span style="flex:1"></span><select data-vbwahl title="Kompakte Vorbemerkungen aus den Baudaten anhängen (eigene Texte je Leistungsbereich, Muster für Baubeschreibung und Vertragsbedingungen)"><option value="">+ aus den Baudaten einfügen …</option>${(window.VBL || []).map((v) => `<option value="${esc(v.key)}">${esc(/^\d/.test(v.key) ? v.key + ' ' + v.titel : v.titel)}</option>`).join('')}</select></div><textarea data-vorbem style="width:100%;min-height:8rem;margin-top:.4rem;font:inherit">${esc(L.data.vorbem || '')}</textarea></div>` : ''}
    <div class="tblw"><table class="lv baum bp-baum" data-sp="ava.lv" data-lvid="${L.id}" data-lvv="${V ? 1 : 0}"><thead><tr><th style="min-width:14rem" data-ed>Bezeichnung</th><th class="r" data-ed>Menge</th><th data-ed>EH</th><th title="N Normal · E Bedarf · A Wahl · P Pauschal · T Hinweistext · V Vorbemerkung" data-ed>Art</th><th class="hide-m" data-ed>KG</th>
      <th class="r"${V ? '' : ' data-ed'}>${V ? 'EP Auftrag' : 'EP (Schätzung)'}</th>${V ? '<th class="r">EP Schätz.</th>' : ''}<th class="r">GP</th><th></th></tr></thead><tbody>${lvKoerper()}</tbody>
      <tfoot><tr><td colspan="${V ? 7 : 6}" class="r"><b>Summe netto</b> <span class="hint">(ohne Bedarfs-/Wahlpositionen${V ? ', ohne Nachlass' : ''})</span></td><td class="r" id="lvSum"></td><td></td></tr></tfoot></table></div>`;
}
function lvNeu() {   // nur die Zeilen des LV neu – wenn der Rahmen nicht (mehr) passt, alles
  const tb = tab === 'lv' && L ? document.querySelector('#view table.lv.baum[data-lvid] > tbody') : null, t = tb && tb.parentNode;
  if (!t || +t.dataset.lvid !== L.id || t.dataset.lvv !== (vergeben() ? '1' : '0')) return render();
  const F = fokusMerken(), zurueck = bpBaum.rolle($('#view'));
  tb.innerHTML = lvKoerper(); zurueck();
  sums(); lvAktZeigen(); edSpalten(); kpis(); fokusZurueck(F);
  if (typeof histUi === 'function') setTimeout(histUi, 0);
}
function lvKoerper() {
  const I = items(), V = vergeben(), VP = (L.vergabe && L.vergabe.preise) || {}, NC = V ? 9 : 8;
  if (LVZU._lv !== L.id) { lvZuLaden(); LVZU._lv = L.id; }
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || L.projekt || 'Ohne Projekt';
  /* Art der Position am Symbol erkennbar: Normal, Bedarf (gestrichelt), Wahl, Pauschal, Hinweistext (i), Vorbemerkung (Textzeilen), Nachtrag (orange +) */
  const icArt = (x) => { const a = x.art || 'N', tt = (x.nt ? 'Nachtrag · ' : '') + (ARTEN[a] || a);
    const doc = (extra, st = '#7a8a99', fill = '#fff', dash = '') => `<svg class="ico" viewBox="0 0 24 24" fill="${fill}" stroke="${st}"${dash ? ` stroke-dasharray="${dash}"` : ''}><title>${tt}</title><path d="M6 3h9l4 4v14H6z"/>${extra}</svg>`;
    const buch = (b, c) => `<text x="12.5" y="17" text-anchor="middle" font-size="9" font-weight="700" fill="${c}" stroke="none">${b}</text>`;
    if (a === 'T') return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#8a8f96" stroke-width="2"><title>${tt}</title><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>`;
    if (a === 'V') return doc('<path d="M9 10h7M9 13h7M9 16h5" stroke-width="1.4"/>', '#5b7fa8', '#eef3f9');
    if (x.nt) return doc('<path d="M12.5 10v7M9 13.5h7" stroke="#d9822b" stroke-width="2"/>', '#d9822b', '#fdf3e7');
    if (a === 'E') return doc(buch('E', '#8a6d00'), '#8a6d00', '#fff', '2 1.6');
    if (a === 'A') return doc(buch('A', '#6d4fa8'), '#6d4fa8', '#f4f0fb');
    if (a === 'P') return doc(buch('P', '#2f8f4e'), '#2f8f4e', '#eef7f0');
    return doc('', '#7a8a99'); };
  const ICT = '<svg class="ico\" viewBox="0 0 24 24" fill="none" stroke="#8a8f96" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>';
  const einr = bpBaum.einzug;   // Einrückung je Ebene: gemeinsamer Baustein (/bp/baum.js)
  let tief = 0; const sichtbar = bpBaum.sicht(I, lvTiefe, LVZU);
  const hatKind = (i) => !!I[i + 1] && lvTiefe(I[i + 1]) > lvTiefe(I[i]);   // leerer Gliederungspunkt: kein Dreieck   // was unter einem zugeklappten Titel liegt, fehlt
  /* Zeilen erst bauen, wenn sie gebraucht werden (bpBaum.fenster): bei großen LVs steht nur der Ausschnitt im Bild auf der Seite.
     TIEF[i] = Ebene des letzten Gliederungspunkts bis zur Zeile i; LVF = die sichtbaren Zeilen (nicht unter einem zugeklappten Punkt) */
  const TIEF = []; { let t0 = 0; I.forEach((x, i) => { if (x.typ === 'titel') t0 = x.lvl || 1; TIEF[i] = t0; }); }
  LVF = []; sichtbar.forEach((ok, i) => { if (ok) LVF.push(i); });
  const zeile = (x, i) => {
    tief = TIEF[i];
    if (x.typ === 'titel') {
      const lv = x.lvl || 1;
      if (!sichtbar[i]) return '';
      return `<tr class="ti l${lv}${x.nt ? ' nt' : ''}${gesperrt(x) ? ' zu' : ''}" data-i="${i}">${bpBaum.zelle({ kl: 'oz', attr: ' title="Doppelklick: Eigenschaften des Gliederungspunkts (Bezeichnung, Nachtrag) · zum Verschieben hier greifen und ziehen"', tiefe: lv + 1, auf: hatKind(i) ? !LVZU.zu(x.id) : undefined, leer: !hatKind(i), klapp: hatKind(i) ? x.id : null, icon: IC.ti, html: `<span class="ozt">${esc(x.oz)}</span><input data-f="kurz" value="${esc(x.kurz)}" placeholder="Titel, z. B. Erdarbeiten">${x.nt ? `<span class="badge nt" title="Dieser Gliederungspunkt ist ein Nachtrag – alle Positionen darunter gehören dazu">${esc(x.nt)}</span><select data-f="nt_status" style="width:auto;font-size:var(--fs-s2)" title="Stand des Nachtrags (gilt für alle Positionen darunter)">${['angemeldet', 'beauftragt', 'abgelehnt'].map((s2) => `<option${x.nt_status === s2 ? ' selected' : ''}>${s2}</option>`).join('')}</select>` : ''}` })}<td colspan="${V ? 6 : 5}"></td>
      <td class="r" data-tsum="${i}"></td><td class="acts-c"><button class="ib${x.nt ? ' an' : ''}" data-a="ntti" title="${x.nt ? 'Nachtrag aufheben – die Positionen darunter werden wieder normale Positionen' : 'Diesen Gliederungspunkt als Nachtrag kennzeichnen – alle Positionen darunter gehören dann zum Nachtrag'}">NT</button><button class="ib" data-a="lvlauf" title="eine Ebene höher (mit seinen Untertiteln)"${lv > 1 ? '' : ' disabled'}>⇤</button><button class="ib" data-a="lvlab" title="zum Untertitel machen – eine Ebene tiefer (GAEB: höchstens 4 Ebenen)"${lv < 4 ? '' : ' disabled'}>⇥</button><button class="ib" data-a="del" title="Titel löschen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></td></tr>`;
    }
    if (!sichtbar[i]) return '';
    const open = OPEN.has(x.id), t = x.art === 'T';
    const ep = V ? VP[x.id] : x.ep_s, gp = ep != null && !t && !x.entf ? (ohneGB(x) ? null : mengeZ(x, (y) => (V ? VP[y.id] : y.ep_s)) * ep) : null, z = x.art === 'Z';
    let h = `<tr class="${t ? 'txt' : ''}${x.nt ? ' nt' : ''}${x.entf ? ' entf' : ''}${gesperrt(x) ? ' zu' : ''}${open ? ' ml' : ''}" data-i="${i}">${bpBaum.zelle({ kl: 'oz', attr: ' title="Klick markiert (Strg/Umschalt: mehrere) · zum Verschieben hier greifen und ziehen · Doppelklick: Eigenschaften"', tiefe: tief + 2, auf: open, car: ` data-a="lang" title="${open ? 'Langtext zuklappen' : 'Langtext aufklappen'}"`, icon: icArt(x), html: `<span class="ozt">${esc(x.oz)}</span><input data-f="kurz" value="${esc(x.kurz)}" placeholder="${t ? 'Hinweistext' : 'Kurztext der Leistung'}">${x.sp ? '<span class="badge sp" title="Schwerpunktposition">S</span>' : ''}${x.nt && x.nt_erbe ? `<span class="badge nt" title="gehört zum Nachtrag des Gliederungspunkts (${esc(x.nt_status || '')})">${esc(x.nt)}</span>` : x.nt ? `<span class="badge nt">${esc(x.nt)}</span><select data-f="nt_status" style="width:auto;font-size:var(--fs-s2)">${['angemeldet', 'beauftragt', 'abgelehnt'].map((s2) => `<option${x.nt_status === s2 ? ' selected' : ''}>${s2}</option>`).join('')}</select>` : ''}` })}
      <td>${t ? '' : z ? `<span class="hint" title="Zuschlag auf ${(x.zu || []).length} Positionen – Summe ihrer Gesamtpreise">${eur(mengeZ(x, (y) => (V ? VP[y.id] : y.ep_s)) * 100)}</span>` : `<input class="n" data-f="menge" value="${nf(x.menge)}" inputmode="decimal" style="width:5.5rem">`}</td>
      <td>${t ? '' : z ? '%' : `<input data-f="einheit" value="${esc(x.einheit)}" data-vs="eh" autocomplete="off" style="width:3.8rem">`}</td>
      <td><input data-f="art" value="${artW(x)}" data-vs="art" autocomplete="off" maxlength="1" style="width:3.8rem" title="${esc(ARTEN[artW(x)])} – N Normal · E Bedarf · A Wahl · P Pauschal · T Hinweistext · V Vorbemerkung"></td>
      <td class="hide-m"><input data-f="kg" value="${esc(x.kg || '')}" placeholder="${esc(lvKg() || 'KG')}" data-vs="kg" autocomplete="off" style="width:3.4rem" inputmode="numeric" title="Kostengruppe DIN 276${lvKg() ? ' – leer: wie das LV (' + esc(lvKg()) + ')' : ''}"></td>
      <td>${t ? '' : V ? `<input class="n" data-vp="${x.id}" value="${ep != null ? nf2(ep) : ''}" inputmode="decimal" style="width:6.5rem" title="Einheitspreis des Auftrags${x.nt ? ' (Nachtragspreis)' : ''}">` : `<input class="n" data-f="ep_s" value="${x.ep_s != null ? nf2(x.ep_s) : ''}" inputmode="decimal" style="width:6.5rem" placeholder="EP" title="geschätzter Einheitspreis (Kostenanschlag)">`}</td>
      ${V ? `<td class="r hint" title="geschätzter EP">${x.ep_s != null ? nf2(x.ep_s) : ''}</td>` : ''}
      <td class="r" data-gp="${i}">${x.entf ? '<span class="hint">entfällt</span>' : gp != null ? eur(gp) : ohneGB(x) ? '<span class="hint">ohne GB</span>' : ''}</td>
      <td class="acts-c"><button class="ib" data-a="eig" title="Eigenschaften der Position (auch Doppelklick)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg></button><button class="ib${open || x.lang || fotosVon(x).length ? ' on' : ''}" data-a="lang" title="Langtext${fotosVon(x).length ? ' · ' + fotosVon(x).length + ' Foto(s)' : ''}">${fotosVon(x).length ? '¶<sup>📷</sup>' : '¶'}</button><button class="ib" data-a="del" title="Position löschen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button></td></tr>`;
    if (open) h += `<tr class="lang${gesperrt(x) ? ' zu' : ''}" data-i="${i}"><td colspan="${NC}" style="${einr(tief + 3)}"><textarea data-f="lang" rows="6" placeholder="Langtext – Leistungsbeschreibung, Material, Fabrikat, Ausführung, Abrechnung">${esc(x.lang || '')}</textarea>
      ${fotoLeiste(x)}
      <div class="bar" style="margin:.3rem 0 0"><button class="btn sm" data-a="ki" title="Langtext mit der oben gewählten KI vorschlagen">✨ Langtext vorschlagen</button><span class="seg ki-l" title="Länge des Vorschlags – außer bei „lang“ ohne die immer gleichen Floskeln (stehen in den Vorbemerkungen)">${KI_L.map(([k, t]) => `<button type="button" class="${kiLaenge() === k ? 'on' : ''}" data-kil="${k}">${t}</button>`).join('')}</span><label class="btn sm" title="Fotos oder Skizzen zur Position – erscheinen unter dem Langtext im LV-Ausdruck. Ein Bild aus der Zwischenablage mit Strg+V im Langtext einfügen.">📷 Foto<input type="file" accept="image/*" multiple hidden data-foto="${x.id}"></label><span class="hint">${x.nt ? 'Begründung des Nachtrags: ' : ''}</span>${x.nt ? `<input data-f="nt_grund" value="${esc(x.nt_grund || '')}" placeholder="z. B. geänderte Ausführung auf Anordnung des Bauherrn" style="flex:1;min-width:14rem">` : ''}</div></td></tr>`;
    return h;
  };
  const um = LVAKT !== LVUM ? LVF.indexOf(I.findIndex((x) => x.id === LVAKT)) : -1; LVUM = LVAKT;   // neu markierte Zeile (z. B. gerade angelegt) ist sicher dabei
  const rows = LVGZ.has(L.id) ? '' : bpBaum.fenster.html('lv', LVF.length, (k) => zeile(I[LVF[k]], LVF[k]), { um, nachher: () => { lvAktMarken(); sums(); edSpalten(); } });
  const kopf = `<tr class="wurzel${LVAKT === '__pj' ? ' akt' : ''}" data-pjwurzel>${bpBaum.zelle({ tiefe: 0, auf: true, icon: IC.proj, html: `<b>${esc(pn)}</b>` })}<td colspan="${NC - 1}"></td></tr>
    <tr class="wurzel lvz${LVAKT === '__lv' ? ' akt' : ''}" data-lvwurzel title="Klick markiert das LV – „+ Gliederungspunkt“ legt dann einen Punkt der obersten Ebene an">${bpBaum.zelle({ tiefe: 1, auf: !LVGZ.has(L.id), car: ` data-lvganz title="${LVGZ.has(L.id) ? 'aufklappen' : 'zuklappen'}" style="cursor:pointer"`, icon: IC.lv, html: `<b>${esc(L.nr)} ${esc(L.name)}</b>${vergeben() ? sperrIcon(String(L.id)) : ''}` })}<td colspan="3"></td><td class="hide-m"><input data-lvkg value="${esc(lvKg())}" placeholder="KG" data-vs="kg" autocomplete="off" style="width:3.4rem" inputmode="numeric" title="Kostengruppe des LV (DIN 276) – neue und leere Positionen übernehmen sie"></td><td colspan="${NC - 7}"></td><td class="r" id="lvSumK"></td><td class="acts-c"><button class="ib" data-zualle="${LVZU.zahl() ? 'auf' : 'zu'}" title="${LVZU.zahl() ? 'alle Titel aufklappen' : 'alle Titel zuklappen'}">${LVZU.zahl() ? '⊞' : '⊟'}</button></td></tr>`;
  // die anderen LVs des Projekts als zugeklappte Ordner – Klick öffnet sie (ersetzt die LV-Auswahl oben)
  const andere = (x) => `<tr class="wurzel lvz zu" data-lvopen="${x.id}" title="Öffnen">${bpBaum.zelle({ tiefe: 1, auf: false, icon: IC.lv, html: `<b>${esc(x.nr)} ${esc(x.name)}</b>${x.vergeben && !x.aufgehoben ? sperrIcon(String(x.id)) : ''}<span class="hint" style="margin-left:.5rem">${esc([x.gewerk, STATUS.find((st) => st[0] === x.status)[1], x.auftragnehmer].filter(Boolean).join(' · '))}</span>` })}<td colspan="3"></td><td class="hide-m hint">${esc(x.kg || '')}</td><td colspan="${NC - 7}"></td><td class="r">${x.auftrag ? eur(x.auftrag) : x.schaetzung ? eur(x.schaetzung) : ''}</td><td></td></tr>`;
  const LV = LIST.filter((x) => (!x.archived && !ohneLv(x) && !lvWeg(x)) || x.id === L.id), k = LV.findIndex((x) => x.id === L.id);
  const vorher = LV.slice(0, Math.max(0, k)).map(andere).join(''), nachher = (k >= 0 ? LV.slice(k + 1) : LV.filter((x) => x.id !== L.id)).map(andere).join('');
  return `${kopf.replace(/^(<tr class="wurzel[^>]*>.*?<\/tr>)\s*/s, '$1' + vorher)}${LVGZ.has(L.id) ? '' : rows || `<tr><td colspan="${NC}" class="empty">Noch keine Positionen. Mit „+ Titel“ und „+ Position“ anfangen, „Aus Baukosten …“ übernehmen oder oben eine GAEB-Datei einlesen.</td></tr>`}${nachher}${archivZeilen(NC)}`;
}
document.addEventListener('click', async (e) => {   // anderes LV im Baum öffnen
  const r = tab === 'lv' && e.target.closest && e.target.closest('[data-lvopen]'); if (!r) return;
  LVGZ.delete(+r.dataset.lvopen); LS.set('lvgz', [...LVGZ]); const zurueck = bpBaum.anker(r); await flush();
  try { await openLv(+r.dataset.lvopen); LVAKT = '__lv'; lvAktZeigen(); zurueck('table.lv tr[data-lvwurzel]'); } catch (er) { toast(er.message, true); }   // bleibt unter der Maus, auch wenn das vorige LV darüber zuklappt; markiert; ein Fehler beim Laden bleibt nicht stumm
});
bpBaum.klappbar(document, { klapp: () => (tab === 'lv' && L ? LVZU : null), neu: lvNeu, alle: () => items().filter((x) => x.typ === 'titel').map((x) => x.id) });   // Titel auf- und zuklappen (einzeln und alle)
/* Tastatur in den Bäumen (gemeinsamer Baustein /bp/baum.js): ↑↓ ← → Enter Esc, Tab/Enter in den Feldern, F6 zwischen Baum und Bereich rechts */
bpBaum.tasten({ wurzel: '#view table.lv.baum:not(.am) > tbody', zeilen: 'tr[data-i]:not(.lang), tr.wurzel', unterzeile: 'tr.lang', tabOhne: '[data-f=art], [data-f=kg]', aktiv: (w) => w.querySelector('tr.akt'),
  waehle: (z, o) => { if (z.dataset.lvopen == null) (z.querySelector('.ozt') || z.querySelector('td')).dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: o.umschalt })); },   // andere LVs: erst Enter öffnet
  neu: (z, titel) => { const b = document.querySelector(`.rib [data-act="${titel ? 'glied' : 'pos'}"]`); if (b && !b.disabled) b.click(); },
  schiebe: (z, d) => { if (z.dataset.i != null) moveItem(+z.dataset.i, d); } });
bpBaum.tasten({ wurzel: '#pjTree, #view .pjtree[data-teil]', zeilen: '.pj-r', tiefe: (z) => (z.classList.contains('root') ? 0 : z.classList.contains('k') ? 2 : 1) });   // Projektbaum: Cursor wandert, Enter öffnet
bpBaum.tasten({ wurzel: '#view table.au-t > tbody', zeilen: 'tr[data-tr]', ohne: 'input.aui, tr[data-ntein] input', waehle: (z) => (z.querySelector('.au-bz') || z.querySelector('td')).click() });   // Aufträge: Felder mit eigenem Tab/Enter (auZiel…)
bpBaum.tasten({ wurzel: '#view table.lv.am.baum > tbody', zeilen: 'tr', ohne: '[data-am-new], .pj-ren' });
window.bpBaumFelder = '#view table.lv.ps, .sr-flo table.lv.ps, .sr-eigen table.lv.ps';   // Preisspiegel: Enter geht in der Spalte eines Bieters nach unten, Tab von Bieter zu Bieter
/* Kostengruppe (DIN 276, Liste im Kern): Vorschlagsliste der Spalte KG – erst die KG des LV, dann die im LV benutzten, dann die zum Gewerk passenden, dann alle.
   Die KG des LV steht in der LV-Zeile; neue und leere Positionen übernehmen sie (wird sie geändert, ziehen die Positionen mit, die leer waren oder die alte hatten). */
let KGV = { g: null, v: [] };
const lvKg = () => (L && (LIST.find((y) => y.id === L.id) || {}).kg) || '';
function kgLaden() {
  if (!KGN) { KGN = {}; api('api/kg_namen').then((k) => { KGN = k; }).catch(() => { KGN = null; }); }
  const g = (L && L.gewerk) || ''; if (KGV.g === g) return; KGV = { g, v: [] };
  if (g) api('api/kg_vorschlag?gewerk=' + encodeURIComponent(g)).then((v) => { if (KGV.g === g) KGV.v = v; }).catch(() => {});
}
bpVorschlag.listen.kg = () => {
  kgLaden(); const N = KGN || {}, zahl = {};
  if (L) items().forEach((x) => { if (x.kg) zahl[x.kg] = (zahl[x.kg] || 0) + 1; });
  const R = [...new Set([lvKg(), ...Object.keys(zahl).sort((a, b) => zahl[b] - zahl[a]), ...KGV.v, ...Object.keys(N)].filter(Boolean))];
  return R.map((k) => ({ w: k, t: (N[k] || '') + (k === lvKg() ? ' · KG des LV' : zahl[k] ? ' · im LV' : KGV.v.includes(k) ? ' · Gewerk' : '') }));
};
bpVorschlag.norm.kg = (v) => String(v || '').replace(/\D/g, '').slice(0, 3);
async function kgInPos(id, alt, neu) {   // KG des LV geändert: Positionen ohne eigene KG (leer oder die alte des LV) ziehen mit
  const x = LIST.find((y) => y.id === id); if (x) x.kg = neu;
  if (!L || L.id !== id) return;
  let n = 0; items().forEach((y) => { if (y.typ === 'pos' && (!y.kg || y.kg === alt)) { y.kg = neu; n++; } });
  if (n) { HIST.next = `KG des LV ${alt || 'leer'} → ${neu || 'leer'} (${n} Position${n === 1 ? '' : 'en'})`; changed(true); } else render();
}
async function lvKgSetzen(neu) {
  if (!L) return; const id = L.id, alt = lvKg(); neu = bpVorschlag.norm.kg(neu); if (neu === alt) return;
  try { await api(`api/lv/${id}/daten`, 'PUT', { lv: { kg: neu } }); await kgInPos(id, alt, neu); rueckgaengig(`KG des LV: ${alt || 'leer'} → ${neu || 'leer'}`, () => lvKgSetzen(alt)); }
  catch (e) { toast(e.message, true); render(); }
}
document.addEventListener('change', (e) => { const i = e.target.closest && e.target.closest('input[data-lvkg]'); if (i) lvKgSetzen(i.value); });
/* Doppelklick auf ein LV im Baum (LV-Tabelle, Projektbaum, Aufmaß) öffnet „LV- & Auftragsdaten“ – wie in den Aufträgen; Alt+Enter ebenso */
document.addEventListener('dblclick', async (e) => {
  const r = e.target.closest && e.target.closest('table.lv tr[data-lvwurzel], table.lv tr[data-lvopen], .pjtree [data-pjlv]:not([data-pjsub])');
  if (!r || e.target.closest('input,button,select,[data-pjcar],[data-lvganz]')) return;
  const id = r.dataset.lvwurzel != null ? L && L.id : +(r.dataset.lvopen || r.dataset.pjlv); if (!id) return;
  e.preventDefault(); if (window.getSelection) getSelection().removeAllRanges();
  if (!L || L.id !== id) { await flush(); await openLv(id); }
  lvDaten();
});
function sums() {   // Titel- und LV-Summen ohne neu zu zeichnen (Fokus bleibt)
  if (tab !== 'lv' || !L) return;
  const I = items(), V = vergeben(), VP = (L.vergabe && L.vergabe.preise) || {};
  const ep = (x) => (V ? VP[x.id] : x.ep_s), gp = (x) => (ep(x) != null && zaehlt(x) ? mengeZ(x, ep) * ep(x) : 0);
  /* ein Durchlauf: GP je Position, Summen je Gliederungspunkt (offene Punkte auf einem Stapel); geschrieben wird nur in Zellen, die auf der Seite
     stehen und deren Inhalt sich geändert hat – so bleibt das Tippen auch in großen LVs flüssig */
  let tot = 0; const G = new Array(I.length), TS = new Array(I.length), offen = [];
  I.forEach((x, i) => {
    if (x.typ === 'titel') { const lv = x.lvl || 1; while (offen.length && (I[offen[offen.length - 1]].lvl || 1) >= lv) offen.pop(); offen.push(i); TS[i] = 0; }
    else if (x.typ === 'pos') { const g = gp(x); G[i] = g; tot += g; for (const t of offen) TS[t] += g; }
  });
  const text = (c, t) => { if (c.textContent !== t || c.firstElementChild) c.textContent = t; }, hinweis = (c, t) => { const h = c.firstElementChild; if (!h || h.textContent !== t || c.childNodes.length !== 1) c.innerHTML = `<span class="hint">${t}</span>`; };
  document.querySelectorAll('#view table.lv [data-tsum]').forEach((c) => { const v = TS[+c.dataset.tsum]; text(c, v ? eur(v) : ''); });
  document.querySelectorAll('#view table.lv [data-gp]').forEach((c) => { const x = I[+c.dataset.gp]; if (!x || x.art === 'T') return;
    if (x.entf) hinweis(c, 'entfällt'); else if (ep(x) == null) text(c, ''); else if (ohneGB(x)) hinweis(c, 'ohne GB'); else text(c, eur(mengeZ(x, ep) * ep(x))); });
  const s = $('#lvSum'); if (s) text(s, eur(tot));
  const sk = $('#lvSumK'); if (sk) text(sk, eur(tot));
}
/* Aktive Zeile: Klick auf die OZ (oder Bearbeiten in der Zeile) – neue Titel, Positionen und Hinweistexte kommen dahinter */
let LVAKT = null, LVSEL = new Set(), LVANK = null;   // aktive Zeile (dahinter wird eingefügt), Mehrfachmarkierung (Strg/Umschalt), Anker für Umschalt
/* Langtext wandert mit: ist der Langtext der Position offen, auf der man stand, und geht man auf eine andere Position
   (Klick, Pfeiltasten, Enter/Tab ins nächste Feld), klappt deren Langtext auf und der alte zu. Sind mehrere markiert oder
   ist der neue schon offen (z. B. „alle Langtexte“), bleibt alles, wie es ist. Die Zeile bleibt dabei an ihrer Stelle am Bildschirm. */
let LVLT = null;   // die Zeile, auf der man zuletzt stand
function lvLangFolgt(vor) {
  const x = items().find((y) => y.id === LVAKT);
  if (!x || x.typ !== 'pos' || vor == null || !OPEN.has(vor) || OPEN.has(x.id) || LVSEL.size > 1) return;
  setTimeout(() => {   // erst nach dem laufenden Klick/Tastendruck neu zeichnen
    if (tab !== 'lv' || LVAKT !== x.id || OPEN.has(x.id)) return;
    const zeile = () => { const n = items().findIndex((y) => y.id === x.id); return n < 0 ? null : document.querySelector(`table.lv tr[data-i="${n}"]:not(.lang)`); };
    const fa = document.activeElement, ftr = fa && fa.closest && fa.closest('table.lv tr[data-i]:not(.lang)'), fx = ftr && items()[+ftr.dataset.i];
    const feld = fx && fx.id === x.id && fa.matches('[data-f],[data-vp]') ? { sel: fa.dataset.f ? `[data-f="${fa.dataset.f}"]` : `[data-vp="${fa.dataset.vp}"]`, a: fa.selectionStart, b: fa.selectionEnd } : null;
    const tr0 = zeile(), oben = tr0 ? tr0.getBoundingClientRect().top : null;
    OPEN.delete(vor); OPEN.add(x.id); render();
    if (feld) { const f = zeile() && zeile().querySelector(feld.sel); if (f) { f.focus({ preventScroll: true }); try { if (feld.a != null) f.setSelectionRange(feld.a, feld.b); } catch { /* Feld ohne Textauswahl */ } } }
    if (oben != null) requestAnimationFrame(() => requestAnimationFrame(() => {   // nach dem Wiederherstellen der Rollposition (bpBaum.rolle)
      const tr = zeile(); if (!tr) return; const d = tr.getBoundingClientRect().top - oben; if (Math.abs(d) < 1) return;
      for (let e = tr.parentElement; e; e = e.parentElement) { const st = getComputedStyle(e); if (/(auto|scroll)/.test(st.overflowY) && e.scrollHeight > e.clientHeight + 1) { e.scrollTop += d; return; } }
      scrollBy(0, d);
    }));
  }, 0);
}
function lvAktMarken() {   // nur die Markierung an den Zeilen (auch für nachgebaute Zeilen großer LVs)
  const I = items(); document.querySelectorAll('table.lv tr[data-i]').forEach((tr) => { const x = I[+tr.dataset.i]; tr.classList.toggle('akt', !!x && (x.id === LVAKT || LVSEL.has(x.id))); });
  const w = document.querySelector('table.lv tr[data-lvwurzel]'); if (w) w.classList.toggle('akt', LVAKT === '__lv');
  const pw = document.querySelector('table.lv tr[data-pjwurzel]'); if (pw) pw.classList.toggle('akt', LVAKT === '__pj');
}
function lvAktZeigen() {
  if (tab === 'lv' && LVAKT !== LVLT) { const vor = LVLT; LVLT = LVAKT; lvLangFolgt(vor); }
  if (tab === 'lv') seiteFuellen('lv', 'details');   // rechts, im freien oder im eigenen Browserfenster
  const I = items(); lvAktMarken();
  lvSelLeiste();
  const n = I.findIndex((x) => x.id === LVAKT), h = n >= 0 ? `nach ${I[n].oz || (I[n].art === 'T' ? 'dem Hinweistext' : 'der markierten Zeile')} einfügen` : 'am Ende anhängen';
  document.querySelectorAll('[data-act="titel"],[data-act="pos"],[data-act="txt"]').forEach((b) => { b.title = h; });
  document.querySelectorAll('[data-act="glied"]').forEach((gb) => { const x = I[n]; const el = x ? (x.typ === 'titel' ? x : [...I.slice(0, n)].reverse().find((y) => y.typ === 'titel')) : null;
    const mp = lvMarkiertePos().length;
    gb.title = mp ? `Gliederungspunkt anlegen – die ${mp === 1 ? 'markierte Position kommt' : mp + ' markierten Positionen kommen'} hinein` : LVAKT === '__lv' || !x ? 'Gliederungspunkt der obersten Ebene am Ende anlegen' : `Gliederungspunkt unter ${el ? el.oz + ' ' + (el.kurz || '') : 'der obersten Ebene'} anlegen (Ebene ${el ? (el.lvl || 1) + 1 : 1})`; });
}
document.addEventListener('click', (e) => {   // Klick auf die LV-Zeile ganz oben markiert das LV selbst (oberste Ebene)
  if (tab !== 'lv') return;
  const w = e.target.closest && e.target.closest('tr[data-lvwurzel], tr[data-pjwurzel]'); if (!w || e.target.closest('button,input,[data-lvganz]')) return;
  LVSEL = new Set(); LVAKT = w.hasAttribute('data-pjwurzel') ? '__pj' : '__lv';
  if (L) lvAktZeigen(); else w.classList.add('akt');   // auch wenn noch kein LV offen ist (neues Projekt)
});
function lvEinfuegeStelle(kind) {
  const I = items(), n = I.findIndex((x) => x.id === LVAKT); if (n < 0) return I.length;
  const x = I[n];
  if (x.typ === 'titel' && kind === 'titel') { let e = n + 1; while (e < I.length && !(I[e].typ === 'titel' && (I[e].lvl || 1) <= (x.lvl || 1))) e++; return e; }   // neuer Titel nach dem ganzen Titel
  return n + 1;
}
document.addEventListener('click', (e) => {   // Klick auf die OZ markiert; Strg+Klick einzelne dazu/weg, Umschalt+Klick von–bis
  if (tab !== 'lv' || !L) return;
  const tr = e.target.closest && e.target.closest('table.lv tr[data-i]:not(.lang)'); if (!tr) return;
  const aufOz = !!e.target.closest('td.oz'), feld = e.target.closest('input,textarea,select,button,a,[data-zu],[data-a]');
  if (feld && !(e.ctrlKey || e.metaKey || e.shiftKey)) return;
  const I = items(), x = I[+tr.dataset.i]; if (!x) return;
  if (e.shiftKey) { e.preventDefault(); window.getSelection && window.getSelection().removeAllRanges(); }
  // Klick irgendwo in die Zeile markiert sie (bleibt markiert, auch beim zweiten Klick) – Regel aus dem Baukasten (bpBaum.markiere)
  ({ akt: LVAKT, sel: LVSEL, anker: LVANK } = bpBaum.markiere({ akt: LVAKT, sel: LVSEL, anker: LVANK }, I.map((y) => y.id), x.id, { umschalt: e.shiftKey, strg: e.ctrlKey || e.metaKey }));
  lvAktZeigen();
});
const lvMarkiert = () => { const I = items(), m = new Set(bpBaum.markiert({ akt: LVAKT, sel: LVSEL }, I.map((y) => y.id))); return I.filter((y) => m.has(y.id)); };
function lvSelLeiste() {   // Leiste für mehrere markierte Zeilen
  let el = $('#lvSel'); const n = tab === 'lv' && L ? lvMarkiert().length : 0;
  if (n < 2) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'lvSel'; document.body.appendChild(el);
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-ls]'); if (b) lvSelAktion(b.dataset.ls); }); }
  el.hidden = false;
  el.innerHTML = `<b>${n} Zeilen markiert</b><button class="btn sm" data-ls="kopieren" title="Strg+C">Kopieren</button><button class="btn sm" data-ls="ausschneiden" title="Strg+X">Ausschneiden</button><button class="btn sm danger" data-ls="loeschen" title="Entf">Löschen</button><button class="btn sm" data-ls="weg" title="Esc">✕</button>`;
}
let LVCLIP = null;
async function lvSelAktion(a) {
  const M = lvMarkiert(); if (!M.length && a !== 'einfuegen') return;
  if (a === 'weg') { LVSEL = new Set(); lvAktZeigen(); return; }
  if (a !== 'kopieren') { for (const x of M) if (gesperrt(x) && !(await freischalten(x))) return; }   // beauftragt: erst bestätigen
  if (a === 'kopieren' || a === 'ausschneiden') {
    LVCLIP = JSON.parse(JSON.stringify(M)); try { localStorage.setItem('ava.clip', JSON.stringify(LVCLIP)); } catch { /* egal */ }
    if (a === 'kopieren') return toast(`${M.length} Zeile${M.length > 1 ? 'n' : ''} kopiert – mit Strg+V hinter der markierten Zeile einfügen (auch in einem anderen LV).`);
  }
  if (a === 'ausschneiden' || a === 'loeschen') {
    const weg = new Set(M.map((x) => x.id)), I = items(), vor = I.findIndex((x) => weg.has(x.id)) - 1;
    L.data.items = I.filter((x) => !weg.has(x.id)); LVSEL = new Set(); LVAKT = vor >= 0 ? L.data.items[Math.min(vor, L.data.items.length - 1)]?.id || null : null;
    HIST.next = a === 'loeschen' ? `${M.length} Zeile${M.length > 1 ? 'n' : ''} gelöscht` : `${M.length} Zeile${M.length > 1 ? 'n' : ''} ausgeschnitten`; numerieren(); changed(true);
    if (a === 'ausschneiden') toast(`${M.length} Zeilen ausgeschnitten – mit Strg+V an der markierten Stelle einfügen.`);
    return;
  }
  if (a === 'einfuegen') {
    let C = LVCLIP; if (!C) { try { C = JSON.parse(localStorage.getItem('ava.clip') || 'null'); } catch { C = null; } }
    if (!C || !C.length) return toast('Nichts zum Einfügen – erst Zeilen markieren und mit Strg+C kopieren.');
    const I = items(), at = (() => { const n = I.findIndex((x) => x.id === LVAKT); return n < 0 ? I.length : n + 1; })();
    const neu = C.map((x) => { const y = { ...JSON.parse(JSON.stringify(x)), id: uid() }; delete y.nt; delete y.nt_status; delete y.nt_grund; return y; });
    I.splice(at, 0, ...neu); LVSEL = new Set(neu.map((x) => x.id)); LVAKT = neu[neu.length - 1].id;
    HIST.next = `${neu.length} Zeile${neu.length > 1 ? 'n' : ''} eingefügt`; numerieren(); changed(true);
  }
}
document.addEventListener('keydown', (e) => {   // Strg+C/X/V, Entf und Esc für markierte Zeilen (nicht in Eingabefeldern)
  if (tab !== 'lv' || !L || document.querySelector('.modal-bg,.bed')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
  const k = e.key.toLowerCase(), strg = e.ctrlKey || e.metaKey;
  if (strg && k === 'c' && lvMarkiert().length) { if (String(window.getSelection && window.getSelection()).trim()) return; e.preventDefault(); lvSelAktion('kopieren'); }
  else if (strg && k === 'x' && lvMarkiert().length) { e.preventDefault(); lvSelAktion('ausschneiden'); }
  else if (strg && k === 'v') { e.preventDefault(); lvSelAktion('einfuegen'); }
  else if (strg && k === 'a' && !e.shiftKey) { e.preventDefault(); LVSEL = new Set(items().map((x) => x.id)); lvAktZeigen(); }
  else if ((k === 'delete') && lvMarkiert().length) { e.preventDefault(); lvSelAktion('loeschen'); }
  else if (k === 'escape' && LVSEL.size) { LVSEL = new Set(); lvAktZeigen(); }
});
/* LV-Tabelle: der erste Klick wählt nur die Zeile; erst ein zweiter, langsamer Klick in ein Feld schreibt (schneller Doppelklick = Eigenschaften).
   Innerhalb der Zeile, in der man schon schreibt, geht jedes Feld sofort. Tab springt wie gewohnt weiter. */
let lvKlick = { id: null, t: 0 };
document.addEventListener('mousedown', (e) => {
  if (tab !== 'lv' || !L || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const f = e.target.closest && e.target.closest('table.lv tr[data-i]:not(.lang) :is(input,select)'); if (!f || f === document.activeElement) return;
  const tr = f.closest('tr[data-i]'), x = items()[+tr.dataset.i]; if (!x) return;
  const a = document.activeElement, jetzt = Date.now(), fk = (f.dataset.f || f.dataset.vp || '') + ':' + x.id;
  const frei = lvKlick.f === fk && jetzt - lvKlick.t > 450 && jetzt - lvKlick.t < 5000;   // zwei langsame Klicks auf dasselbe Feld – nicht einer
  lvKlick = { id: x.id, f: fk, t: jetzt };
  if (frei) return;
  e.preventDefault(); if (a && a !== document.body && a.blur) a.blur();
  LVSEL = new Set(); LVAKT = x.id; LVANK = x.id; lvAktZeigen();
}, true);
document.addEventListener('focusin', (e) => { if (tab !== 'lv' || !L) return; const tr = e.target.closest && e.target.closest('table.lv tr[data-i]'); if (tr) { const x = items()[+tr.dataset.i]; if (x && x.id !== LVAKT) { LVAKT = x.id; lvAktZeigen(); } } });
/* die markierten Positionen in LV-Reihenfolge: Mehrfachauswahl, sonst die Zeile, auf der man steht (Titel zählen nicht) */
const lvMarkiertePos = () => items().filter((x) => x.typ === 'pos' && (LVSEL.size ? LVSEL.has(x.id) : x.id === LVAKT));
function addItem(kind) {
  const I = items(), at = lvEinfuegeStelle(kind), ref = at > 0 ? I[at - 1] : null;
  let neu;
  const ober = [...I.slice(0, at)].reverse().find((x) => x.typ === 'titel');   // Titel, in dem eingefügt wird
  if (kind === 'glied') {   // immer eine Ebene tiefer als die markierte Zeile; LV oben markiert (oder nichts): oberste Ebene, am Ende
    const n = LVAKT === '__lv' ? -1 : I.findIndex((x) => x.id === LVAKT), akt = n >= 0 ? I[n] : null;
    const mark = lvMarkiertePos();
    if (mark.length) {   // Positionen markiert: genau sie kommen in den neuen Punkt – er steht hinter den übrigen Positionen seines Titels
      const n0 = I.indexOf(mark[0]), elt = [...I.slice(0, n0)].reverse().find((x) => x.typ === 'titel'), lv0 = elt ? (elt.lvl || 1) + 1 : 1;
      if (lv0 > 4) { toast('GAEB erlaubt höchstens 4 Gliederungsebenen – hier geht keine weitere.', true); return; }
      let e = n0; while (e < I.length && I[e].typ !== 'titel') e++;   // Ende der Positionen, zwischen denen die erste markierte steht
      const nachE = I[e] || null, ms = new Set(mark), rest = I.filter((x) => !ms.has(x)), neuT = { id: uid(), typ: 'titel', lvl: lv0, oz: '', kurz: '' };
      const st = nachE ? rest.indexOf(nachE) : rest.length;
      rest.splice(st, 0, neuT, ...mark); I.splice(0, I.length, ...rest);
      LVSEL = new Set(); LVAKT = neuT.id; numerieren(); ntErben(I); HIST.next = `Gliederungspunkt mit ${mark.length} Position${mark.length === 1 ? '' : 'en'}`; changed(true);
      toast(`${mark.length === 1 ? 'Die markierte Position steht' : `Die ${mark.length} markierten Positionen stehen`} jetzt unter ${neuT.oz} – rückgängig mit Strg+Z.`);
      { const el = lvTr(st, ' [data-f="kurz"]'); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } }
      return;
    }
    const eltern = akt ? (akt.typ === 'titel' ? akt : [...I.slice(0, n)].reverse().find((x) => x.typ === 'titel')) : null;
    const lv = eltern ? (eltern.lvl || 1) + 1 : 1;
    if (lv > 4) { toast('GAEB erlaubt höchstens 4 Gliederungsebenen – hier geht keine weitere.', true); return; }
    let stelle = I.length, mit = 0;
    if (akt && akt.typ === 'titel') {
      let e = n + 1; while (e < I.length && !(I[e].typ === 'titel' && (I[e].lvl || 1) <= (akt.lvl || 1))) e++;
      const hatUnter = I.slice(n + 1, e).some((x) => x.typ === 'titel');
      if (hatUnter) stelle = e; else { stelle = n + 1; mit = I.slice(n + 1, e).filter((x) => x.typ === 'pos').length; }   // nur Positionen darin: sie kommen unter den neuen Punkt (gleiche Tiefe, GAEB)
    } else if (akt) stelle = n + 1;
    const neuT = { id: uid(), typ: 'titel', lvl: lv, oz: '', kurz: '' };
    I.splice(stelle, 0, neuT); LVAKT = neuT.id; numerieren(); changed(true);
    if (mit) toast(`Die ${mit} Position${mit === 1 ? '' : 'en'} von ${akt.oz} ${mit === 1 ? 'steht' : 'stehen'} jetzt unter ${neuT.oz} – rückgängig mit Strg+Z.`);
    { const el = lvTr(stelle, ' [data-f="kurz"]'); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } }
    return;
  }
  if (kind === 'utitel') { const lv = ober ? (ober.lvl || 1) + 1 : 1; if (lv > 4) { toast('GAEB erlaubt höchstens 4 Titelebenen – hier geht kein weiterer Untertitel.', true); return; } neu = { id: uid(), typ: 'titel', lvl: lv, oz: '', kurz: '' }; }
  else if (kind === 'titel') {   // gleiche Ebene wie der markierte Titel (nach seinem ganzen Inhalt), sonst wie der Titel davor
    const akt = I.find((x) => x.id === LVAKT);
    neu = { id: uid(), typ: 'titel', lvl: akt && akt.typ === 'titel' ? (akt.lvl || 1) : ref && ref.typ === 'titel' ? (ref.lvl || 1) : ober ? (ober.lvl || 1) : 1, oz: '', kurz: '' };
  }
  else if (kind === 'txt') neu = { id: uid(), typ: 'pos', art: 'T', oz: '', kurz: '', lang: '', menge: 0, einheit: '' };
  else if (kind === 'nt') { const n = ntNr(); neu = { id: uid(), typ: 'pos', art: 'N', oz: '', kurz: '', lang: '', menge: 1, einheit: 'psch', kg: lvKg(), nt: 'NT' + n, nt_status: 'angemeldet' }; }
  else { const last = [...I.slice(0, at)].reverse().find((x) => x.typ === 'pos' && x.art !== 'T') || [...I].reverse().find((x) => x.typ === 'pos' && x.art !== 'T'); neu = { id: uid(), typ: 'pos', art: 'N', oz: '', kurz: '', lang: '', menge: 0, einheit: last ? last.einheit : 'm2', kg: lvKg() || (last ? last.kg : '') }; }
  I.splice(at, 0, neu); if (LVAKT) LVAKT = neu.id;
  numerieren(); changed(true);
  { const el = lvTr(at, ' [data-f="kurz"]'); if (el) { el.focus(); el.scrollIntoView({ block: 'nearest' }); } }
}
const ozMaske = () => { const m = (L && L.data && L.data.ozm) || {}; return { t: Array.isArray(m.t) && m.t.length ? m.t : [2, 2, 2, 2], p: m.p || 4, s: m.s || 10 }; };
function numerieren() {   // wie nummerieren() auf dem Server – nach der OZ-Maske des LV, sofort sichtbar
  const st = [], cnt = {}, M = ozMaske();
  for (const x of items()) {
    if (x.typ === 'titel') { const lv = x.lvl || 1; while (st.length && st[st.length - 1][0] >= lv) st.pop(); const par = st.length ? st[st.length - 1][1] : ''; cnt[par] = (cnt[par] || 0) + 1; x.oz = (par ? par + '.' : '') + String(cnt[par]).padStart(M.t[Math.min(st.length, M.t.length - 1)], '0'); st.push([lv, x.oz]); cnt[x.oz + '#p'] = 0; }
    else if (x.art === 'T') x.oz = '';
    else { const par = st.length ? st[st.length - 1][1] : ''; const k = par + '#p'; cnt[k] = (cnt[k] || 0) + M.s; x.oz = (par ? par + '.' : '') + String(cnt[k]).padStart(M.p, '0'); }
  }
}
/* Nummerieren: erst das Schema (GAEB-OZ-Maske) – Titelstufen mit ihren Stellen, Stellen der Position, Schrittweite – mit Vorschau */
function numDialog() {
  const M = ozMaske(), tiefe = Math.max(1, ...items().filter((x) => x.typ === 'titel').map((x) => x.lvl || 1));
  const n = Math.max(tiefe, Math.min(4, M.t.length));
  const bg = modalBox(`<h3>Nummerieren</h3><p class="hint" style="margin:0 0 .7rem">Ordnungszahlen nach einem Schema wie in GAEB (OZ-Maske). Das Schema wird beim LV gemerkt.</p>
    <div class="nlf" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <label>Titelstufen<select id="ozT">${[1, 2, 3, 4].map((k) => `<option${k === n ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>Stellen je Titel<select id="ozTS">${[1, 2, 3].map((k) => `<option${k === (M.t[0] || 2) ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>Stellen der Position<select id="ozP">${[3, 4, 5].map((k) => `<option${k === M.p ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>Schrittweite<select id="ozS">${[1, 5, 10].map((k) => `<option${k === M.s ? ' selected' : ''}>${k}</option>`).join('')}</select></label></div>
    <p class="hint" style="margin:.7rem 0 .2rem">Beispiel: <b id="ozV"></b>${tiefe > 1 ? ` · im LV gibt es ${tiefe} Titelstufen` : ''}</p><p id="ozW" class="ferr" style="color:var(--red,#d64545);margin:.3rem 0 0;font-size:var(--fs)" hidden></p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Nummerieren</button></div>`, (m, bg2, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok' || bg2.querySelector('[data-m="ok"]').disabled) return;
    const t = +bg2.querySelector('#ozT').value, ts = +bg2.querySelector('#ozTS').value;
    L.data.ozm = { t: Array(t).fill(ts), p: +bg2.querySelector('#ozP').value, s: +bg2.querySelector('#ozS').value };
    close(); HIST.next = 'Nummeriert'; numerieren(); changed(true);
  });
  // passt das Schema zum LV? Titelstufen, Titel je Stufe und Positionen je Titel müssen in die Stellen passen
  const I = items(), stapel = []; let maxT = 0, maxP = 0; const nT = {}, nP = {};
  I.forEach((x, k) => { if (x.typ === 'titel') { const lv = x.lvl || 1; while (stapel.length && stapel[stapel.length - 1][0] >= lv) stapel.pop(); const par = stapel.length ? stapel[stapel.length - 1][1] : 'w'; nT[par] = (nT[par] || 0) + 1; maxT = Math.max(maxT, nT[par]); stapel.push([lv, 't' + k]); }
    else if (x.art !== 'T') { const par = stapel.length ? stapel[stapel.length - 1][1] : 'w'; nP[par] = (nP[par] || 0) + 1; maxP = Math.max(maxP, nP[par]); } });
  const pruef = () => { const t = +bg.querySelector('#ozT').value, ts = +bg.querySelector('#ozTS').value, p = +bg.querySelector('#ozP').value, st = +bg.querySelector('#ozS').value, w = [];
    if (t < tiefe) w.push(`Im LV gibt es ${tiefe} Titelstufen – bitte mindestens ${tiefe} wählen.`);
    if (maxT >= 10 ** ts) w.push(`Auf einer Stufe stehen ${maxT} Titel – dafür reichen ${ts} Stelle${ts > 1 ? 'n' : ''} nicht (höchstens ${10 ** ts - 1}).`);
    if (maxP * st >= 10 ** p) w.push(`Ein Titel hat ${maxP} Positionen – mit Schrittweite ${st} reichen ${p} Stellen nicht (bis ${maxP * st}).`);
    const el = bg.querySelector('#ozW'); el.hidden = !w.length; el.textContent = w.length ? '⚠ ' + w.join(' ') : ''; bg.querySelector('[data-m="ok"]').disabled = !!w.length; };
  const vor = () => { pruef(); const t = +bg.querySelector('#ozT').value, ts = +bg.querySelector('#ozTS').value, p = +bg.querySelector('#ozP').value, st = +bg.querySelector('#ozS').value;
    bg.querySelector('#ozV').textContent = [...Array(t)].map((_, i) => String(i + 1).padStart(ts, '0')).join('.') + '.' + String(st).padStart(p, '0') + ` (Titel ${'1'.padStart(ts, '0')}, Positionen ${String(st).padStart(p, '0')}, ${String(2 * st).padStart(p, '0')} …)`; };
  bg.addEventListener('change', vor); vor();
}
/* Nachträge: Nummer vergeben (nur eigene, nicht geerbte zählen) und Vererbung vom Gliederungspunkt auf die Positionen darunter (Spiegel von nt_erben im Server) */
function ntNr() { const I = items(), v = new Set(I.filter((y) => y.nt).map((y) => String(y.nt))); let k = v.size + 1; while (v.has('NT' + k)) k++; return k; }
function ntErben(I) {
  const st = [];
  I.forEach((x) => {
    if (x.typ === 'titel') { const lv = x.lvl || 1; while (st.length && st[st.length - 1][0] >= lv) st.pop(); st.push([lv, x]); return; }
    if (x.typ !== 'pos') return;
    const erbe = [...st].reverse().map((p) => p[1]).find((t) => t.nt);
    if (x.nt_erbe && !erbe) { delete x.nt; delete x.nt_status; delete x.nt_grund; delete x.nt_erbe; }
    else if (erbe && (!x.nt || x.nt_erbe)) { x.nt = erbe.nt; x.nt_status = erbe.nt_status || 'angemeldet'; x.nt_grund = erbe.nt_grund || ''; x.nt_erbe = true; }
  });
  return I;
}
function moveItem(i, dir) {
  const I = items(), x = I[i];
  if (gesperrt(x)) { freischalten(x).then((ok) => { if (ok) { render(); moveItem(i, dir); } }); return; }   // beauftragt: erst bestätigen
  if (x.typ === 'titel') {   // Titel samt Inhalt verschieben
    const lv = x.lvl || 1; let e = i + 1; while (e < I.length && !(I[e].typ === 'titel' && (I[e].lvl || 1) <= lv)) e++;
    const blk = I.splice(i, e - i);
    let t = i;
    if (dir < 0) { t = i - 1; while (t > 0 && !(I[t].typ === 'titel' && (I[t].lvl || 1) <= lv)) t--; if (t < 0) t = 0; }
    else { t = i; if (t < I.length) { t++; while (t < I.length && !(I[t].typ === 'titel' && (I[t].lvl || 1) <= lv)) t++; } }
    I.splice(t, 0, ...blk);
  } else { const j = i + dir; if (j < 0 || j >= I.length) return; [I[i], I[j]] = [I[j], I[i]]; }
  numerieren(); changed(true);
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.vorbem != null) { L.data.vorbem = el.value; changed(); return; }
  if (el.dataset.vbwahl != null) {   // Vorbemerkung aus den Baudaten anhängen
    const k = el.value; el.value = ''; if (!k) return;
    api('api/baudaten/vorbemerkungen?key=' + encodeURIComponent(k)).then((v) => { L.data.vorbem = ((L.data.vorbem || '').trim() ? L.data.vorbem.trim() + '\n\n' : '') + v.titel + '\n\n' + v.text; changed(); render(); toast(`„${v.titel}“ eingefügt – bitte an das Projekt anpassen (Angaben in [eckigen Klammern]).`); }).catch((e) => toast(e.message, true));
    return;
  }
  const row = el.closest('tr[data-i]'); if (!row || !L || tab !== 'lv') return;
  const x = items()[+row.dataset.i]; if (!x) return;
  if (el.dataset.f === 'art') { const v = el.value.trim().toUpperCase(); if (!ARTEN[v]) return;   // nur gültige Arten übernehmen (Feld mit Vorschlagsliste wie die Einheit)
    if (v === 'V') { x.art = 'T'; x.vb = true; } else { x.art = v; delete x.vb; } changed(); return; }
  if (el.dataset.f) { const f = el.dataset.f; x[f] = ['menge'].includes(f) ? (pf(el.value) ?? 0) : f === 'ep_s' ? pf(el.value) : el.value; changed(); return; }
  if (el.dataset.vp) { L.vergabe.preise = { ...(L.vergabe.preise || {}), [el.dataset.vp]: pf(el.value) }; clearTimeout(vpT); vpT = setTimeout(() => saveVp(el.dataset.vp, el.value), 700); sums(); }
});
let vpT = 0;
async function saveVp(id, v) { try { await flush(); const r = await api('api/lv/' + L.id, 'PUT', { vergabe: { preise: { [id]: v } } }); L.rev = r.rev; L.calc = r.calc; L.vergabe = r.vergabe; kpis(); } catch (e) { toast(e.message, true); } }
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'proj') { pid = +el.value; LS.set('pid', pid); if (window.BPHead) BPHead.projektSetzen(pid); loadList(); return; }
  if (el.id === 'fileIn') { if (el.files[0]) { const f = el.files[0], z = IMP ? IMP.ziel : 'lv', bi = IMP && IMP.bieter; doImport(f).then(() => inOrdner(f, z, bi)); } el.value = ''; return; }
  const row = el.closest('tr[data-i]');
  if (row && tab === 'lv' && (el.dataset.f === 'art' || el.dataset.f === 'nt_status')) { if (el.dataset.f === 'nt_status') ntErben(items()); render(); }
  if (row && tab === 'lv' && el.dataset.f === 'kurz' && window.BPHead && BPHead.wiki) BPHead.wiki('warnung', el.value, { worte: [L && L.gewerk] });   // Wiki und frühere Mängel (bp/wiki.js)
  if (el.dataset.am != null) { mitUndo(el, amSave, 'Aufmaß'); return; }
  if (el.dataset.amNew != null) { amNeu(el); return; }
  if (el.dataset.ang) { mitUndo(el, angSave, el.dataset.ang === 'ep' ? 'EP' : 'Angebot'); return; }
  if (el.dataset.re) { mitUndo(el, reSave, 'Rechnung'); return; }
  if (el.id === 'amNur') { amNur = el.checked; LS.set('amNur', amNur); render(); }
});
document.addEventListener('click', async (e) => {
  const t = e.target;
  const sb = t.closest('[data-schritt]'); if (sb) { const S = SCHRITTE.find((x) => x[0] === sb.dataset.schritt); const z = LS.get('tab:' + S[0], S[2][0]); await flush(); tab = S[2].includes(z) ? z : S[2][0]; LS.set('tab', tab); render(); if (tab === 'uebersicht' || tab === 'auftraege') { await refreshList(); render(); } return; }
  const tb = t.closest('[data-tab]'); if (tb) { await flush(); tab = tb.dataset.tab; if (tab === 'aufmass') amAns = 'erfassen'; LS.set('tab', tab);
    if ((tab === 'lv' || tab === 'versand' || tab === 'angebote') && L && (ohneLv(L) || (tab === 'lv' && lvWeg(L)))) {   // Auftrag ohne LV gehört nicht in Ausschreibung/Vergabe: ein echtes LV öffnen, sonst keins
      const n = LIST.find((x) => !x.archived && !ohneLv(x) && !lvWeg(x)); if (n) await openLv(n.id); else { L = null; }
    }
    render(); if (tab === 'uebersicht' || tab === 'auftraege') { await refreshList(); render(); }
    if (tb.dataset.srz) setTimeout(() => { if (window.seiteOffen && seiteDa() && !seiteOffen()) seiteUmschalten(); const r = document.querySelector(`#view [data-srt="${tb.dataset.srz}"]`); if (r && !r.classList.contains('on')) r.click(); }, 0);   // Ablauf „Besprechung“/„Versand“: Ansicht mit dem passenden Reiter rechts
    return; }
  const sw = t.closest('[data-stwahl]'); if (sw && L) {
    pickMenu(sw, { items: STATUS.map(([k, l]) => ({ value: k, title: l, on: L.status === k })), onPick: (k) => { const b = document.createElement('button'); b.dataset.status = k; b.hidden = true; document.body.appendChild(b); b.click(); b.remove(); } });
    return;
  }
  const st = t.closest('[data-status]'); if (st && L) {
    const alt = L.status, id = L.id; if (alt === st.dataset.status) return;
    L.status = st.dataset.status; await flush(); saveNow({ status: L.status }); kpis();
    rueckgaengig(`Stand „${(STATUS.find((s) => s[0] === L.status) || [, L.status])[1]}“ gesetzt`, () => lvSetzen(id, { status: alt }));
    return;
  }
  const ac = t.closest('[data-act]');
  if (ac) {
    const a = ac.dataset.act;
    if (a === 'new') return newDialog();
    if (a === 'lvDaten') return lvDaten();
    if (['titel', 'utitel', 'glied', 'pos', 'txt', 'nt'].includes(a)) { if (!L) return; if (tab !== 'lv') { await flush(); tab = 'lv'; LS.set('tab', tab); render(); } return addItem(a); }
    if (a === 'num') { numDialog(); return; }
    if (a === 'bk') return bkDialog();
    if (a === 'vorbem') { L.data.showVorbem = !L.data.showVorbem; if (L.data.showVorbem && !window.VBL) api('api/baudaten/vorbemerkungen').then((v) => { window.VBL = v; render(); }).catch(() => { window.VBL = []; }); render(); return; }
    if (a === 'alleLang') { if (OPEN.size) OPEN.clear(); else items().forEach((x) => { if (x.typ === 'pos') OPEN.add(x.id); }); render(); return; }
    if (a === 'bieter') return bieterDialog();
    if (a === 'x84') return importDialog('angebot');
    if (a === 'ps') return pdfZeigen('preisspiegel', `api/lv/${L.id}/pdf?art=preisspiegel${psDruckOhne()}`, pdfName('Preisspiegel'));
    if (a === 'freiVergeben') { try { if (await freiVergeben(L.id, $('#view'))) toast('Auftrag eingetragen – Rechnungen jetzt über „+ Neu ▾“ erfassen.'); } catch (er) { toast(er.message, true); } return; }
    if (a === 'amPdf') return pdfZeigen('aufmass', `api/lv/${L.id}/pdf?art=aufmass`, pdfName('Massenermittlung'));
    if (a === 'reNeu') return reNeuMenu(e.target.closest('[data-act]'));
    if (a === 'reaktiv') { try { await call(`api/lv/${L.id}/vergabe`, 'POST', { reaktivieren: true }); toast('Beauftragung wieder in Kraft – Auftrag und Rechnungen zählen wieder.'); } catch (er) { toast(er.message, true); } return; }
    if (a === 'nichtVergeben') { nichtVergebenDialog(); return; }
    if (a === 'nichtVergebenWeg') { try { await call(`api/lv/${L.id}/vergabe`, 'DELETE', {}); await refreshList(); toast('„Nicht vergeben“ zurückgenommen.'); } catch (er) { toast(er.message, true); } return; }
    if (a === 'vergabeWeg') return vergabeAufheben(L.id);
  }
  const row = t.closest('tr[data-i]'), ib = t.closest('.ib,.car[data-a]');   // Knöpfe der Zeile und das Dreieck (Langtext)
  if (row && ib && tab === 'lv') {
    const i = +row.dataset.i, x = items()[i], a = ib.dataset.a;
    if (a === 'up' || a === 'down') return moveItem(i, a === 'up' ? -1 : 1);
    if (a === 'del') { items().splice(i, 1); numerieren(); changed(true); return; }
    if (a === 'ntti') {   // Gliederungspunkt als Nachtrag: die Positionen darunter erben Nummer und Stand (Server: nt_erben)
      if (x.nt) { delete x.nt; delete x.nt_status; delete x.nt_grund; } else { x.nt = 'NT' + ntNr(); x.nt_status = 'angemeldet'; }
      ntErben(items()); HIST.next = x.nt ? `${x.nt}: Gliederungspunkt als Nachtrag` : 'Nachtrag am Gliederungspunkt aufgehoben'; changed(true); return;
    }
    if (a === 'lvlauf' || a === 'lvlab') {   // Titel samt seinen Untertiteln eine Ebene höher/tiefer
      const I = items(), alt = x.lvl || 1, d = a === 'lvlab' ? 1 : -1;
      const vor = [...I.slice(0, i)].reverse().find((y) => y.typ === 'titel');
      if (d > 0 && (!vor || (vor.lvl || 1) < alt)) { toast('Ein Untertitel braucht darüber einen Titel derselben Ebene – erst einen Titel davor anlegen.', true); return; }
      let ende = i + 1; while (ende < I.length && !(I[ende].typ === 'titel' && (I[ende].lvl || 1) <= alt)) ende++;
      const tief = Math.max(...I.slice(i, ende).filter((y) => y.typ === 'titel').map((y) => y.lvl || 1));
      if (alt + d < 1 || tief + d > 4) { toast('GAEB erlaubt höchstens 4 Titelebenen.', true); return; }
      I.slice(i, ende).forEach((y) => { if (y.typ === 'titel') y.lvl = (y.lvl || 1) + d; });
      HIST.next = d > 0 ? 'Zum Untertitel gemacht' : 'Eine Ebene höher'; numerieren(); changed(true); return;
    }
    if (a === 'lang') { if (OPEN.has(x.id)) OPEN.delete(x.id); else OPEN.add(x.id); render(); return; }
    if (a === 'eig') return eigDialog(x.id);
  }
  const kl = t.closest('[data-kil]'); if (kl) { LS.set('kilaenge', kl.dataset.kil); kl.parentElement.querySelectorAll('[data-kil]').forEach((y) => y.classList.toggle('on', y === kl)); return; }
  if (row && t.closest('[data-a="ki"]')) {
    const x = items()[+row.dataset.i], b = t.closest('[data-a="ki"]'); b.disabled = true; b.textContent = '✨ schreibe …';
    try { const r = await api('api/ki/langtext', 'POST', { kurz: x.kurz, einheit: x.einheit, gewerk: L.gewerk, lang: x.lang, laenge: kiLaenge() }); const alt = x.lang; x.lang = r.text; changed(true); rueckgaengig('Langtext vorgeschlagen', () => { x.lang = alt; changed(true); }); } catch (er) { toast(er.message, true); b.disabled = false; b.textContent = '✨ Langtext vorschlagen'; }
    return;
  }
  const vg = t.closest('[data-vergabe]'); if (vg) return vergabeDialog(+vg.dataset.vergabe);
  const adt = t.closest('[data-angdaten]'); if (adt) { angebotDaten(+adt.dataset.angdaten); return; }
  const ad = t.closest('[data-angdel]'); if (ad) {
    const id = L.id, x = JSON.parse(JSON.stringify(L.angebote.find((z) => z.id === +ad.dataset.angdel) || {})), vergeben = L.vergabe && L.vergabe.angebot_id === x.id;
    try { await call('api/angebote/' + ad.dataset.angdel, 'DELETE'); } catch (er) { toast(er.message, true); return; }
    if (x.id && !vergeben) rueckgaengig(`Angebot ${x.bieter} gelöscht`, async () => {   // neu anlegen und Preise wieder eintragen
      const vorher = new Set(L && L.id === id ? L.angebote.map((z) => z.id) : []);
      const r = await call(`api/lv/${id}/angebote`, 'POST', { contact_id: x.contact_id, bieter: x.bieter, eingang: x.eingang });
      const neu = r.angebote.filter((z) => !vorher.has(z.id)).sort((p, q) => q.id - p.id)[0];
      if (neu) await call('api/angebote/' + neu.id, 'PUT', { notiz: x.notiz || '', nachlass: x.nachlass || 0, skonto: x.skonto || 0, preise: x.preise || {} });
    });
    return;
  }
  const ax = t.closest('[data-angx84]'); if (ax) { location.href = `api/lv/${L.id}/gaeb?dp=84&angebot=${ax.dataset.angx84}`; return; }
  const ap = t.closest('[data-ampos]'); if (ap && t.closest('.am-zwi')) return;   // Rechenweg in der Tabelle bearbeiten – nicht neu zeichnen
  if (ap && ap.classList.contains('am-zw') && ap.dataset.ampos === amPos) { const i = ap.querySelector('.am-zwi'); if (i) { i.focus({ preventScroll: true }); i.select(); } return; }   // Zeile der gewählten Position: ins Feld, ohne Neuzeichnen (springt sonst)
  if (ap) { amPos = ap.dataset.ampos; LS.set('amPos', amPos); render(); { const n = document.querySelector('[data-am-new="formel"]'); if (n) n.focus({ preventScroll: true }); } return; }   // ohne Rollen: die Tabelle sprang sonst waagerecht
  const amd = t.closest('[data-amdel]'); if (amd) {
    const id = L.id, z = L.aufmass.find((y) => y.id === +amd.dataset.amdel);
    try { await call('api/aufmass/' + amd.dataset.amdel, 'DELETE'); } catch (er) { toast(er.message, true); return; }
    if (z) rueckgaengig(`Aufmaßzeile ${z.ort || z.formel || ''} gelöscht`.trim(), () => call(`api/lv/${id}/aufmass`, 'POST', { pos_id: z.pos_id, datum: z.datum, ort: z.ort, formel: z.formel, menge: z.menge, quelle: z.quelle }));
    return;
  }
  const amr = t.closest('[data-amraum]'); if (amr) return raumDialog();
  const rb = t.closest('[data-reb]'); if (rb) return reAktion(rb);
  const ue = t.closest('tr[data-ue]'); if (ue) { tab = 'lv'; LS.set('tab', tab); return openLv(+ue.dataset.ue); }
});

/* LV aus der Kostenermittlung: gliedern nach Leistung (zusammengefasst) oder je Bauteil, eine Ebene oder mit Gliederungspunkten (ava_aus_kosten.py) */
const BKG = () => ({ bloecke: 'leistung', ebenen: 'eine', titel: 'lb', ...LS.get('bkGlied', {}) });
function bkGliedHtml() {
  const G = BKG(), seg = (k, L) => `<span class="seg" role="group">${L.map(([v, t]) => `<button type="button" data-bkg="${k}" data-v="${v}" class="${G[k] === v ? 'on' : ''}">${t}</button>`).join('')}</span>`;
  return `<div class="bkg"><span>Blöcke</span>${seg('bloecke', [['leistung', 'nach Leistung'], ['bauteil', 'je Bauteil']])}
    <span>Ebenen</span>${seg('ebenen', [['eine', 'eine Ebene, Überschrift als Hinweistext'], ['gliederung', 'mit Gliederungspunkten']])}
    <span data-bkgt${G.ebenen === 'eine' ? ' hidden' : ''}>Titel</span><span data-bkgt${G.ebenen === 'eine' ? ' hidden' : ''}>${seg('titel', [['lb', 'Leistungsbereich'], ['kg', 'Kostengruppe']])}</span></div>
    <p class="hint" style="margin:.3rem 0 0">Nach Leistung: gleiche Positionen aus mehreren Bauteilen werden eine (Mengen addiert, Herkunft in den Details).</p>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-bkg]'); if (!b) return;
  const G = { ...BKG(), [b.dataset.bkg]: b.dataset.v }; LS.set('bkGlied', G);
  b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  const box = b.closest('.bkg'); if (box) box.querySelectorAll('[data-bkgt]').forEach((x) => { x.hidden = G.ebenen === 'eine'; }); });

/* ---------- Neues LV ---------- */
async function newDialog(o = {}) {
  if (!pid) { toast('Bitte zuerst oben ein Projekt wählen.', true); return; }
  let BK = []; try { BK = await api('api/baukosten?project_id=' + pid); } catch { /* egal */ }
  const alle = await api('api/lv').catch(() => []);
  const n = LIST.length + 1;
  const bg = modalBox(`<h3>${o.auftrag ? 'Neuer Auftrag' : 'Neues Leistungsverzeichnis'}</h3>${o.auftrag ? '<p class="hint" style="margin:-.2rem 0 .7rem">Ohne LV: Firma und Auftragssumme eintragen, Rechnungen dann mit Betrag oder Positionen von Hand. Ein vorhandenes LV vergibst du unter „2 Vergabe“.</p>' : ''}<div class="nlf">
      <label>Bezeichnung<input id="nlName" placeholder="z. B. Rohbauarbeiten, Trockenbau, Fliesen"></label>
      <label>Gewerk<input id="nlGw" data-vs="gewerk" autocomplete="off" placeholder="für die Bieterauswahl"></label>
      <label>Nr.<input id="nlNr" value="${String(n).padStart(2, '0')}"></label></div>
    <div class="nlw-h">Womit anfangen?</div>
    <div class="nlw">${[
      ['leer', '📄', 'Leer anfangen', 'Positionen selbst schreiben oder aus Katalogen holen', true],
      ['pdf', '📥', 'Aus einer Datei', 'LV, Angebot oder Leistungsliste – PDF, Scan, Foto, Word, Excel, GAEB', true],
      ['lv', '📑', 'Kopie eines LV', 'auch aus anderen Projekten – ohne Preise', alle.length > 0],
      ['bk', '🧮', 'Aus der Kostenermittlung', 'Bauteile mit Mengen und Preisen als Schätzung', BK.some((b) => b.n)],
      ['frei', '🧾', 'Ohne LV', 'nur Rechnungen erfassen – z. B. kleine Handwerker:in', true],
    ].map(([v, i, t, d, ok], k) => `<label class="${ok ? '' : 'aus'}"><input type="radio" name="nlSrc" value="${v}"${(o.auftrag ? v === 'frei' : !k) ? ' checked' : ''}${ok ? '' : ' disabled'}><span class="i">${i}</span><b>${t}</b><small>${ok ? d : v === 'bk' ? 'keine Kostenermittlung mit Bauteilen im Projekt' : 'noch kein LV vorhanden'}</small></label>`).join('')}</div>
    <div class="nlw-d">
      <div class="kgs" id="nlBk" hidden><select id="nlBkSel">${BK.filter((b) => b.n).map((b) => `<option value="${b.id}">${esc(b.name)} · ${b.n} Bauteile${b.eigenes ? '' : ' (anderes Projekt)'}</option>`).join('')}</select><span id="nlKgs"></span>${bkGliedHtml()}</div>
      <div class="kgs nl-kopie" id="nlLv" hidden><button type="button" id="nlKpP" class="pick" title="Aus welchem Projekt?"></button><span class="nl-pf">›</span><button type="button" id="nlKpL" class="pick" title="Welches LV?"></button><input type="hidden" id="nlLvSel">
        <label><input type="checkbox" id="nlMengen" checked> Mengen übernehmen</label></div>
      <div class="kgs" id="nlPdf" hidden><input type="file" id="nlPdfF" accept="${DOK_ACCEPT}"><label><input type="checkbox" id="nlPdfUe" checked> erkannte Positionen gleich übernehmen (das Dokument bleibt rechts daneben zum Prüfen; Preise eines Angebots als Schätzpreise)</label>
        <span class="hint">Titel und Positionen werden ohne KI erkannt (Scans per Texterkennung). Klappt das nicht, fragt die AVA, ob eine KI das Dokument lesen darf.</span></div>
      <div class="kgs" id="nlFrei"${o.auftrag ? "" : " hidden"}>${freiFelder()}</div></div>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Anlegen</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const src = bg.querySelector('[name=nlSrc]:checked').value, body = { project_id: pid, name: $('#nlName').value.trim(), gewerk: $('#nlGw').value.trim(), nr: $('#nlNr').value.trim(), ...(vSicht() ? { version_id: vSicht() } : {}) };
    if (!body.name && !body.gewerk) { toast('Bitte eine Bezeichnung oder ein Gewerk eingeben.', true); return; }
    if (src === 'lv') { body.kopie_von = +$('#nlLvSel').value; body.mengen = $('#nlMengen').checked; }
    if (src === 'frei' && !bg.querySelector('#frFirma').value.trim()) { toast('Bitte die Firma angeben.', true); return; }
    const pdfF = src === 'pdf' ? (bg.querySelector('#nlPdfF').files || [])[0] : null, pdfUe = src === 'pdf' && bg.querySelector('#nlPdfUe').checked;
    if (src === 'pdf' && !pdfF) { toast('Bitte die Datei wählen.', true); return; }
    if (src === 'pdf' && !body.name) body.name = pdfF.name.replace(/\.[^.]+$/, '').slice(0, 120);
    try {
      let r = await api('api/lv', 'POST', body);
      if (src === 'bk') r = await api(`api/lv/${r.id}/aus-baukosten`, 'POST', { bk_id: +$('#nlBkSel').value, kgs: [...bg.querySelectorAll('[data-kg]:checked')].map((x) => x.dataset.kg), ...BKG() });
      if (src === 'frei' && !(await freiVergeben(r.id, bg))) return;
      if (src === 'frei') r = await api('api/lv/' + r.id);
      close(); L = r; tab = src === 'frei' ? 'rechnungen' : 'lv'; LS.set('tab', tab); await refreshList(); render();
      if (tab === 'lv') { LVAKT = '__lv'; lvAktZeigen(); const z = document.querySelector('table.lv tr[data-lvwurzel]'); if (z) z.scrollIntoView({ block: 'center' }); }   // das neue LV steht oft weit unten im Baum: hinrollen und markieren
      if (src === 'pdf' && istImport(pdfF)) { IMP = { ziel: 'lv', ersetzen: true }; await doImport(pdfF); IMP = null; }
      else if (src === 'pdf') await lvDokHoch(r.id, pdfF, { uebernehmen: pdfUe });
    } catch (e) { toast(e.message, true); }
  });
  const kgDraw = () => { const b = BK.find((x) => x.id === +$('#nlBkSel').value); $('#nlKgs').innerHTML = b ? `<span class="kgws">${b.kgs.map(kgWahl).join('')}</span>` : ''; };
  bg.addEventListener('change', (e) => {
    if (e.target.name === 'nlSrc') { $('#nlBk').hidden = e.target.value !== 'bk'; $('#nlLv').hidden = e.target.value !== 'lv'; $('#nlFrei').hidden = e.target.value !== 'frei'; $('#nlPdf').hidden = e.target.value !== 'pdf'; if (e.target.value === 'bk') kgDraw(); }
    if (e.target.id === 'nlBkSel') kgDraw();
  });
  /* Kopie eines LV: erst das Projekt, dann das LV darin – zwei Auswahlknöpfe mit Suche */
  const pName = (id) => (PROJ.find((p) => p.id === id) || {}).name || 'Projekt ' + id;
  const lvsVon = (id) => alle.filter((x) => x.project_id === id);
  let kpP = lvsVon(pid).length ? pid : (alle[0] || {}).project_id;
  const kpZeig = (lvId) => {
    const L2 = lvsVon(kpP), x = L2.find((y) => y.id === lvId) || L2[0];
    $('#nlLvSel').value = x ? x.id : '';
    pickButton($('#nlKpP'), { title: kpP ? pName(kpP) : 'Projekt wählen', sub: `${L2.length} LV${kpP === pid ? ' · dieses Projekt' : ''}` });
    pickButton($('#nlKpL'), { title: x ? (x.nr ? x.nr + ' ' : '') + x.name : 'kein LV', sub: x ? [x.gewerk, x.n_pos != null ? x.n_pos + ' Positionen' : ''].filter(Boolean).join(' · ') : '' });
  };
  kpZeig();
  $('#nlKpP').addEventListener('click', () => { const P2 = [...new Set(alle.map((x) => x.project_id))];
    pickMenu($('#nlKpP'), { search: 'Projekt suchen …', items: P2.map((id) => ({ value: id, title: pName(id), sub: `${lvsVon(id).length} LV`, group: id === pid ? 'Dieses Projekt' : 'Andere Projekte', on: id === kpP }))
      .sort((a, b) => (b.value === pid) - (a.value === pid) || a.title.localeCompare(b.title, 'de')), onPick: (v) => { kpP = +v; kpZeig(); } }); });
  $('#nlKpL').addEventListener('click', () => pickMenu($('#nlKpL'), { search: lvsVon(kpP).length > 8 ? 'LV suchen …' : '', items: lvsVon(kpP).map((x) => ({ value: x.id, title: (x.nr ? x.nr + ' ' : '') + x.name, sub: x.gewerk || '', on: x.id === +$('#nlLvSel').value })), onPick: (v) => kpZeig(+v) }));
  bg.querySelector('.modal').classList.add('wide');
  $('#nlName').focus();
}
/* Kostengruppen DIN 276, 3. Ebene – Namen für die Auswahl */
const KG3 = {"311": "Herstellung", "312": "Umschließung", "313": "Wasserhaltung", "314": "Vortrieb", "319": "Baugrube, Sonstiges", "321": "Baugrundverbesserung", "322": "Flachgründungen und Bodenplatten", "323": "Tiefgründungen", "324": "Gründungsbeläge", "325": "Abdichtungen und Bekleidungen", "326": "Dränagen", "329": "Gründung, Sonstiges", "331": "Tragende Außenwände", "332": "Nichttragende Außenwände", "333": "Außenstützen", "334": "Außenwandöffnungen", "335": "Außenwandbekleidungen außen", "336": "Außenwandbekleidungen innen", "337": "Elementierte Außenwände", "338": "Lichtschutz Außenwände", "339": "Außenwände, Sonstiges", "341": "Tragende Innenwände", "342": "Nichttragende Innenwände", "343": "Innenstützen", "344": "Innenwandöffnungen", "345": "Innenwandbekleidungen", "346": "Elementierte Innenwände", "347": "Lichtschutz Innenwände", "349": "Innenwände, Sonstiges", "351": "Deckenkonstruktionen", "352": "Deckenöffnungen", "353": "Deckenbeläge", "354": "Deckenbekleidungen", "355": "Elementierte Decken", "359": "Decken, Sonstiges", "361": "Dachkonstruktionen", "362": "Dachöffnungen", "363": "Dachbeläge", "364": "Dachbekleidungen", "365": "Elementierte Dächer", "366": "Lichtschutz Dächer", "369": "Dächer, Sonstiges", "381": "Allgemeine Einbauten", "382": "Besondere Einbauten", "389": "Einbauten, Sonstiges", "391": "Baustelleneinrichtung", "392": "Gerüste", "393": "Sicherungsmaßnahmen", "394": "Abbruchmaßnahmen", "395": "Instandsetzungen", "396": "Materialentsorgung", "397": "Zusätzliche Maßnahmen", "398": "Provisorische Baukonstruktionen", "399": "Baukonstruktionen, Sonstiges", "411": "Abwasseranlagen", "412": "Wasseranlagen", "413": "Gasanlagen", "419": "Abwasser, Wasser, Gas, Sonstiges", "421": "Wärmeerzeugungsanlagen", "422": "Wärmeverteilnetze", "423": "Raumheizflächen", "424": "Verkehrsheizflächen", "429": "Wärmeversorgung, Sonstiges", "431": "Lüftungsanlagen", "432": "Teilklimaanlagen", "433": "Klimaanlagen", "434": "Kälteanlagen", "439": "Raumlufttechnik, Sonstiges", "441": "Hoch- und Mittelspannungsanlagen", "442": "Eigenstromversorgung", "443": "Niederspannungsschaltanlagen", "444": "Niederspannungsinstallation", "445": "Beleuchtungsanlagen", "446": "Blitzschutz und Erdung", "449": "Elektrische Anlagen, Sonstiges", "451": "Telekommunikationsanlagen", "452": "Such- und Signalanlagen", "454": "Elektroakustische Anlagen", "455": "Audiovisuelle Medien, Antennen", "456": "Gefahrenmelde- und Alarmanlagen", "457": "Datenübertragungsnetze", "459": "Kommunikation, Sonstiges", "461": "Aufzugsanlagen", "462": "Fahrtreppen, Fahrsteige", "469": "Förderanlagen, Sonstiges", "481": "Automationssysteme", "482": "Schaltschränke, Automationsschwerpunkte"};
const kgWahl = (k) => `<label class="kgw"><input type="checkbox" data-kg="${k}" checked><span><b>${esc(KG3[k] || 'Kostengruppe')}</b><small>KG ${k}</small></span></label>`;
async function bkDialog() {
  let BK = []; try { BK = (await api('api/baukosten?project_id=' + pid)).filter((b) => b.n); } catch (e) { toast(e.message, true); return; }
  if (!BK.length) { toast('Keine Kostenermittlung mit Bauteilen gefunden (Baukosten → Bauteile & Material).', true); return; }
  const bg = modalBox(`<h3>Aus den Baukosten übernehmen</h3><p class="hint" style="margin:0 0 .6rem">Bauteile mit Menge, Einheit und Einheitspreis werden als Positionen angehängt. Der Preis wird zur Schätzung im LV.</p>
    <select id="bkSel" style="width:100%">${BK.map((b) => `<option value="${b.id}">${esc(b.name)} · ${b.n} Bauteile${b.eigenes ? '' : ' (anderes Projekt)'}</option>`).join('')}</select><div class="kgws" id="bkKgs"></div>${bkGliedHtml()}
    <label style="display:flex;gap:.6rem;align-items:flex-start;margin:.7rem 0 0;font-size:var(--fs);cursor:pointer"><input type="checkbox" id="bkAuf" checked style="width:1.15rem;height:1.15rem;flex:none;margin-top:.1rem"> Bauteile mit Aufbau aus dem Baukasten in Einzelpositionen auflösen (Menge = Faktor × Bauteilmenge, Langtexte aus den Baudaten)</label>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Übernehmen</button></div>`, async (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    try { await call(`api/lv/${L.id}/aus-baukosten`, 'POST', { bk_id: +$('#bkSel').value, kgs: [...bg.querySelectorAll('[data-kg]:checked')].map((x) => x.dataset.kg), aufloesen: $('#bkAuf').checked, ...BKG() }); close(); toast('Bauteile übernommen.'); } catch (e) { toast(e.message, true); }
  });
  const draw = () => { const b = BK.find((x) => x.id === +$('#bkSel').value); $('#bkKgs').innerHTML = b.kgs.map(kgWahl).join(''); };
  bg.addEventListener('change', (e) => { if (e.target.id === 'bkSel') draw(); }); draw();
}

/* ---------- Einlesen / Ausgeben ---------- */
let IMP = null;
function importDialog(ziel) {
  IMP = { ziel };
  const bieterOpts = (KONT || []).map((k) => `<option value="${k.id}">${esc(k.name)}${k.trade ? ' · ' + esc(k.trade) : ''}</option>`).join('');
  const bg = modalBox(`<h3>${ziel === 'angebot' ? 'Angebot einlesen' : 'Leistungsverzeichnis einlesen'}</h3>
    <p class="hint" style="margin:0 0 .6rem">${ziel === 'angebot' ? 'GAEB-Angebotsdatei (X84), das ausgefüllte Excel der Firma oder das Angebot als PDF, Scan oder Foto (auch das ausgefüllte LV). Die Preise werden über die Ordnungszahl, sonst über den Kurztext zugeordnet.' : 'GAEB DA XML (X81, X83, X84, X86) aus ORCA, California, AVA-Programmen oder Herstellern, eine Excel-Liste mit OZ, Kurztext, Menge, Einheit – oder ein PDF, Scan, Foto oder Word-Dokument.'}</p>
    ${ziel === 'angebot' ? `<div class="fm"><label>Bieter:in</label><select id="impBieter"><option value="">– aus der Datei –</option>${L.angebote.map((a) => `<option value="a${a.id}">${esc(a.bieter)} (vorhanden)</option>`).join('')}${bieterOpts}</select></div>`
      : (posOf().length ? '<label style="display:flex;gap:.5rem;margin:.4rem 0"><input type="checkbox" id="impErs"> vorhandene Positionen ersetzen (sonst anhängen)</label>' : '')}
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Datei wählen …</button></div>`, (m, bg, close) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    if (ziel === 'angebot') { const v = $('#impBieter').value; IMP.contact_id = v && !v.startsWith('a') ? +v : null; IMP.bieter = v.startsWith('a') ? (L.angebote.find((a) => 'a' + a.id === v) || {}).bieter : v ? (KONT.find((k) => k.id === +v) || {}).name : ''; }
    else IMP.ersetzen = !!(bg.querySelector('#impErs') && bg.querySelector('#impErs').checked);
    close(); $('#fileIn').click();
  });
}
async function doImport(file) {
  if (IMP && IMP.ziel === 'angebot' && !istImport(file)) { const I = IMP; IMP = null; await flush(); return angebotPdf(L.id, file, I.bieter || file.name.replace(/\.[^.]+$/, ''), I.contact_id); }
  if (IMP && IMP.ziel !== 'angebot' && !istImport(file)) { IMP = null; return lvDokHoch(L.id, file, { uebernehmen: true }); }
  const fd = new FormData(); fd.append('datei', file); fd.append('ziel', IMP ? IMP.ziel : 'lv');
  if (IMP && IMP.ersetzen) fd.append('ersetzen', '1');
  if (IMP && IMP.bieter) fd.append('bieter', IMP.bieter);
  if (IMP && IMP.contact_id) fd.append('contact_id', IMP.contact_id);
  try {
    await flush();
    const r = await fetch(`api/lv/${L.id}/import`, { method: 'POST', body: fd }), j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || r.statusText);
    L = j; HIST.next = 'Einlesen'; render(); histTrack(); toast(j.hinweis || 'Eingelesen.'); refreshList();
  } catch (e) { toast(e.message, true); }
}
$('#impBtn').onclick = () => { if (!L) return; const m = menu($('#impBtn'), [['lv', 'Leistungsverzeichnis einlesen', 'GAEB X81–X86 oder Excel'], ['angebot', 'Angebot einer Bieter:in einlesen', 'GAEB X84 oder ausgefülltes Excel']]); m.onpick = (k) => importDialog(k); };
$('#expBtn').onclick = () => {   // Speichern unter = als Datei
  if (!L) return;
  const m = menu($('#expBtn'), [['x83', 'GAEB X83 – an die Bieter:innen', 'Angebotsaufforderung, ohne Preise'], ['xlsx', 'Excel zum Ausfüllen', 'für Firmen ohne GAEB-Programm'],
    ['x86', 'GAEB X86 – Auftrags-LV', vergeben() ? 'mit Auftragspreisen und Nachträgen' : 'erst nach der Vergabe', !vergeben()]]);
  m.onpick = (k) => { location.href = { x83: `api/lv/${L.id}/gaeb?dp=83`, x86: `api/lv/${L.id}/gaeb?dp=86`, xlsx: `api/lv/${L.id}/excel` }[k]; };
};
$('#druBtn').onclick = () => {   // Drucken / PDF
  if (!L) return;
  const m = menu($('#druBtn'), [['druck', 'LV drucken / PDF …', 'Layout wählen, Deckblatt und Texte bearbeiten'],
    ['ps', 'Preisspiegel', L.angebote.length ? '' : 'erst mit Angeboten', !L.angebote.length], ['am', 'Massenermittlung', L.aufmass.length ? '' : 'erst mit Aufmaß', !L.aufmass.length]]);
  m.onpick = (k) => { if (k === 'druck') return druckEditor(); if (k === 'am') return pdfZeigen('aufmass', `api/lv/${L.id}/pdf?art=aufmass`, pdfName('Massenermittlung')); pdfZeigen('preisspiegel', `api/lv/${L.id}/pdf?art=preisspiegel${psDruckOhne()}`, pdfName('Preisspiegel')); };
};
function menu(anchor, list) {
  document.querySelectorAll('.menu').forEach((x) => x.remove());
  const m = document.createElement('div'); m.className = 'menu'; const o = {};
  m.innerHTML = list.map((x) => (x === '-' ? '<hr>' : `<button type="button" data-k="${x[0]}"${x[3] ? ' disabled style="opacity:.5"' : ''}>${esc(x[1])}${x[2] ? `<small>${esc(x[2])}</small>` : ''}</button>`)).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect(); m.style.top = (r.bottom + 6) + 'px'; m.style.left = Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8)) + 'px';
  const off = (e) => { if (!m.contains(e.target) && e.target !== anchor) { m.remove(); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
  m.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b || b.disabled) return; m.remove(); document.removeEventListener('pointerdown', off, true); o.onpick && o.onpick(b.dataset.k); });
  return o;
}
$('#newBtn').onclick = () => newDialog();
window.bpVerlaufBereich = () => (L && tab !== 'uebersicht' ? 'avalv:' + L.id : null);   // Rückgängig-Dock → „Ältere Stände im Verlauf“
window.bpVerlaufNach = async () => { L = await api('api/lv/' + L.id); render(); };
async function lvVerlauf() { if (!L || !window.BPHead) { toast('Erst ein LV öffnen – der Verlauf gilt je Leistungsverzeichnis.'); return; } await flush(); BPHead.verlauf({ bereich: 'avalv:' + L.id, nach: () => openLv(L.id) }); }
window.bpNachVerlauf = () => (L ? openLv(L.id) : location.reload());
/* Stammdaten: Projekt (gemeinsame Maske), LV mit Auftrag, Angebot */
$('#phPrD').onclick = () => { if (pid && window.BPHead && BPHead.projektDaten) BPHead.projektDaten(pid); };
$('#phLvD').onclick = () => lvDaten();
async function lvDaten() {
  if (!L || !window.BPHead || !BPHead.datenMaske) return;
  const id = L.id; let D; try { D = await api(`api/lv/${id}/daten`); } catch (e) { toast(e.message, true); return; }
  if (!KONT) KONT = await api('api/kontakte').catch(() => []);
  const A = (g) => g.map((x) => ({ ...x, felder: x.felder.map((f) => ({ ...f, k: 'a_' + f.k })) }));
  // Auftragsbedingungen und Sicherheiten – dieselben Werte wie in der Auftragskarte (vergabe), hier zusätzlich zum Eintragen
  const SKA = { kt: 'Kalendertagen (Mo–So)', wt: 'Werktagen (Mo–Sa)', at: 'Arbeitstagen (Mo–Fr)', wo: 'Wochen' }, FORM = { einbehalt: 'Einbehalt', buergschaft: 'Bürgschaft' };
  const zk = (v, n = 2) => (v || v === 0 ? nf(v, n) : '');
  const kond = () => { const V = L && L.id === id ? L.vergabe || {} : {}, S = V.sicherheit || {}, ve = S.ve || {}, ma = S.ma || {};
    return { k_nachlass: zk(V.nachlass || ''), k_nachlass_eur: zk(V.nachlass_eur || ''), k_skonto: zk(V.skonto || ''), k_skonto_tage: V.skonto_tage ? String(V.skonto_tage) : '',
      k_skonto_art: SKA[V.skonto_art || 'kt'], k_ve_form: FORM[ve.form === 'buergschaft' ? 'buergschaft' : 'einbehalt'], k_ve_pct: zk(V.einbehalt ?? 5),
      k_ma_form: FORM[ma.form === 'buergschaft' ? 'buergschaft' : 'einbehalt'], k_ma_pct: zk(ma.pct ?? ''), k_gw_jahre: S.gw_jahre != null ? String(S.gw_jahre) : '',
      ...Object.fromEntries(ABZ.map(([k]) => ['k_abz_' + k, !(V.abzug && V.abzug[k] === false)])) }; };
  const KOND = [{ titel: 'Auftragsbedingungen', felder: [
    { k: 'k_nachlass', l: 'Nachlass', typ: 'prozent' }, { k: 'k_nachlass_eur', l: 'Nachlass als Betrag (netto)', typ: 'eur', hilfe: 'wird anteilig auf jede Rechnung umgelegt' },
    { k: 'k_skonto', l: 'Skonto', typ: 'prozent' }, { k: 'k_skonto_tage', l: 'Skontofrist', typ: 'zahl', hilfe: 'ab Rechnungseingang' },
    { k: 'k_skonto_art', l: 'Skontofrist gezählt in', typ: 'select', opt: Object.values(SKA) }] },
  { titel: 'Sicherheiten (VOB/B § 17)', felder: [
    { k: 'k_ve_form', l: 'Vertragserfüllung: Art', typ: 'select', opt: Object.values(FORM) }, { k: 'k_ve_pct', l: 'Vertragserfüllung: Einbehalt', typ: 'prozent', hilfe: 'in jeder Teil-, Nachtrags- und Regierechnung' },
    { k: 'k_ma_form', l: 'Mängelansprüche: Art', typ: 'select', opt: Object.values(FORM) }, { k: 'k_ma_pct', l: 'Mängelansprüche: Einbehalt', typ: 'prozent', hilfe: 'in der Schlussrechnung, z. B. 3' },
    { k: 'k_gw_jahre', l: 'Verjährung Mängelansprüche (Jahre)', typ: 'zahl', hilfe: 'VOB/B: 4 Jahre' }] },
  { titel: 'Rechnungsprüfung: abziehen', felder: ABZ.map(([k, t]) => ({ k: 'k_abz_' + k, l: t, typ: 'check' })) }];   // Voreinstellung für jede Rechnung – je Rechnung bei „Abziehen:“ änderbar
  const werte = () => ({ ...D.lv, ...Object.fromEntries(Object.entries(D.auftrag || {}).map(([k, v]) => ['a_' + k, v])), ...(D.vergeben ? kond() : {}) });
  const tag = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
  BPHead.datenMaske({
    titel: 'LV- & Auftragsdaten', unter: D.titel + (D.vergeben ? ' · beauftragt: ' + D.bieter : ''),
    gruppen: [...D.felder_lv, ...(D.vergeben ? [...A(D.felder_auftrag), ...KOND] : [{ titel: 'Auftrag', felder: [] }])], werte: werte(),
    listen: { gw: [...new Set([...(KONT || []).map((k) => k.trade), ...LIST.map((x) => x.gewerk)].map((g) => String(g || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
      kg: Object.entries(D.kg_namen || {}) },
    zusatz: (k) => (k === 'ausf_beginn' && D.plan.start ? `<span class="bph-dm-z">Bauzeitenplan: ${tag(D.plan.start)} <button type="button" class="bph-btn" data-lvplan="ausf_beginn">übernehmen</button></span>`
      : k === 'ausf_ende' && D.plan.ende ? `<span class="bph-dm-z">Bauzeitenplan: ${tag(D.plan.ende)} <button type="button" class="bph-btn" data-lvplan="ausf_ende">übernehmen</button></span>`
      : k === 'a_beginn' && (D.lv.ausf_beginn || D.plan.start) ? `<span class="bph-dm-z"><button type="button" class="bph-btn" data-lvplan="a_beginn">wie Ausführung (${tag(D.lv.ausf_beginn || D.plan.start)})</button></span>`
      : k === 'a_ende' && (D.lv.ausf_ende || D.plan.ende) ? `<span class="bph-dm-z"><button type="button" class="bph-btn" data-lvplan="a_ende">wie Ausführung (${tag(D.lv.ausf_ende || D.plan.ende)})</button></span>` : ''),
    klick: async (e, ctx) => {
      const b = e.target.closest('[data-lvplan]'); if (!b) return false; const k = b.dataset.lvplan, W = ctx.werte();
      ctx.setzen(k, { ausf_beginn: D.plan.start, ausf_ende: D.plan.ende, a_beginn: W.ausf_beginn || D.plan.start, a_ende: W.ausf_ende || D.plan.ende }[k]); return true;
    },
    speichern: async (W) => {
      const lv = {}, au = {}, K = {}; Object.entries(W).forEach(([k, v]) => { if (k.startsWith('a_')) au[k.slice(2)] = v; else if (k.startsWith('k_')) K[k.slice(2)] = v; else lv[k] = v; });
      const kgAlt = String((D.lv || {}).kg || '');
      D = await api(`api/lv/${id}/daten`, 'PUT', { lv, auftrag: au });
      if (String(D.lv.kg || '') !== kgAlt) await kgInPos(id, kgAlt, String(D.lv.kg || ''));
      if (D.vergeben && Object.keys(K).length) {   // Auftragsbedingungen und Sicherheiten wie in der Auftragskarte speichern
        const alt = kond(), geaendert = Object.keys(K).filter((k) => String(K[k] ?? '') !== String(alt['k_' + k] ?? ''));
        if (geaendert.length) {
          const art = (t) => Object.keys(SKA).find((x) => SKA[x] === t) || 'kt', form = (t) => (t === FORM.buergschaft ? 'buergschaft' : 'einbehalt'), n = (v) => pf(v) ?? 0;
          const v = {}, si = {};
          if (geaendert.includes('nachlass')) v.nachlass = n(K.nachlass);
          if (geaendert.includes('nachlass_eur')) v.nachlass_eur = n(K.nachlass_eur);
          if (geaendert.includes('skonto')) v.skonto = n(K.skonto);
          if (geaendert.includes('skonto_tage')) v.skonto_tage = n(K.skonto_tage);
          if (geaendert.includes('skonto_art')) v.skonto_art = art(K.skonto_art);
          if (geaendert.includes('ve_pct')) v.einbehalt = pf(K.ve_pct) ?? 5;
          if (geaendert.includes('ve_form')) si.ve = { form: form(K.ve_form) };
          if (geaendert.includes('ma_form') || geaendert.includes('ma_pct')) si.ma = { ...(geaendert.includes('ma_form') ? { form: form(K.ma_form) } : {}), ...(geaendert.includes('ma_pct') ? { pct: pf(K.ma_pct) } : {}) };
          if (geaendert.includes('gw_jahre')) si.gw_jahre = pf(K.gw_jahre);
          if (Object.keys(si).length) v.sicherheit = si;
          const abz = Object.fromEntries(geaendert.filter((k) => k.startsWith('abz_')).map((k) => [k.slice(4), !!K[k]])); if (Object.keys(abz).length) v.abzug = abz;
          await call('api/lv/' + id, 'PUT', { vergabe: v });   // lädt das LV neu – Auftragskarte und Rechnungen rechnen mit den neuen Werten
        }
      }
      return { werte: werte(), hinweis: D.vergeben ? 'Gespeichert.' : 'Gespeichert. Angaben zum Auftrag gibt es nach der Vergabe.' };
    },
    knoepfe: BPHead.verlaufKnopf ? BPHead.verlaufKnopf('avalv:' + id, 'Verlauf') : '',
  });
}
async function angebotDaten(aid) {
  let D; try { D = await api(`api/angebote/${aid}/daten`); } catch (e) { toast(e.message, true); return; }
  BPHead.datenMaske({ titel: 'Angaben zum Angebot', unter: D.titel, gruppen: D.felder, werte: D.werte,
    speichern: async (W) => { D = await api(`api/angebote/${aid}/daten`, 'PUT', { werte: W }); return { werte: D.werte }; } });
}
/* Freigabe netto von Hand festsetzen – Grund ist Pflicht; im Prüfblatt und in der Rechnungsfreigabe deutlich vermerkt */
document.addEventListener('click', async (e) => {
  const a = e.target.closest && e.target.closest('[data-rehand1]');
  if (a && L) { e.stopPropagation(); const rid = +a.dataset.rehand1, c = (L.calc.rechnungen || []).find((x) => x.id === rid); if (!c) return;
    modalBox(`<h2 style="margin-top:0">Betrag von Hand freigeben</h2><p class="hint" style="margin-top:0">Rechnerisch ${c.frei ? '' : 'nach Aufmaß '}<b>${eur(c.zahlung)}</b> netto. Der abweichende Betrag wird im Prüfblatt und in der Rechnungsfreigabe deutlich vermerkt.${c.einzeln ? '' : ' Die nächste kumulierte Rechnung rechnet mit dem tatsächlich Freigegebenen weiter.'}</p>
      <div class="row"><label>Zahlbetrag netto</label><input id="rhB" value="${nf(c.zahlung, 2)}" inputmode="decimal" style="text-align:right"></div>
      <div class="row"><label>Grund</label><input id="rhG" placeholder="z. B. Estrich Achse 3 noch nicht abgenommen"></div>
      <div class="bar" style="justify-content:flex-end;margin-top:1rem"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">Festsetzen</button></div>`, async (m, bg, close) => {
      if (m === 'x') { close(); return; }
      const betrag = pf(bg.querySelector('#rhB').value), grund = bg.querySelector('#rhG').value.trim();
      if (betrag == null) { toast('Bitte einen Betrag eingeben.', true); return; }
      if (!grund) { toast('Bitte einen Grund angeben.', true); bg.querySelector('#rhG').focus(); return; }
      try { await call('api/rechnungen/' + rid, 'PUT', { hand: { betrag, grund } }); close(); rueckgaengig('Zahlbetrag von Hand festgesetzt', () => call('api/rechnungen/' + rid, 'PUT', { hand: null })); } catch (er) { toast(er.message, true); }
    });
    { const i = document.querySelector('#rhB'); if (i) i.select(); } return; }
  const z = e.target.closest && e.target.closest('[data-rehand0]');
  if (z && L) { e.stopPropagation(); const rid = +z.dataset.rehand0, c = (L.calc.rechnungen || []).find((x) => x.id === rid); if (!c || !c.hand) return; const alt = { betrag: c.zahlung, grund: c.hand.grund };
    try { await call('api/rechnungen/' + rid, 'PUT', { hand: null }); rueckgaengig('Wieder der rechnerische Betrag', () => call('api/rechnungen/' + rid, 'PUT', { hand: alt })); } catch (er) { toast(er.message, true); } }
});
document.addEventListener('change', async (e) => {
  const el = e.target.closest && e.target.closest('[data-rehand]'); if (!el || !L) return;
  const rid = +el.dataset.id, c = (L.calc.rechnungen || []).find((x) => x.id === rid); if (!c || !c.hand) return;
  const card = el.closest('[data-reid]'), betrag = pf(card.querySelector('[data-rehand="betrag"]').value), grund = card.querySelector('[data-rehand="grund"]').value.trim();
  if (!grund) { toast('Bitte einen Grund angeben.', true); el.value = el.dataset.rehand === 'grund' ? c.hand.grund : el.value; return; }
  if (betrag == null) { toast('Bitte einen Betrag eingeben.', true); return; }
  const alt = { betrag: c.zahlung, grund: c.hand.grund };
  try { await call('api/rechnungen/' + rid, 'PUT', { hand: { betrag, grund } }); rueckgaengig('Festgesetzter Betrag geändert', () => call('api/rechnungen/' + rid, 'PUT', { hand: alt })); } catch (er) { toast(er.message, true); }
});
/* Abzüge bei der Prüfung an/aus: je Auftrag (Voreinstellung) und je Rechnung */
const ABZ = [['nachlass', 'Nachlass'], ['abzuege', 'Abzüge'], ['einbehalt', 'Einbehalt'], ['vorher', 'bisherige Zahlungen']];
const abzAuftrag = () => Object.fromEntries(ABZ.map(([k]) => [k, !(L.vergabe.abzug && L.vergabe.abzug[k] === false)]));
function abzChips(wahl, attr, dis, abweich) {
  return `<span class="abz-w">${ABZ.map(([k, t]) => `<button type="button" class="chip${wahl[k] ? ' on' : ''}${abweich && abweich[k] ? ' abw' : ''}" ${attr}="${k}"${dis ? ' disabled' : ''} aria-pressed="${!!wahl[k]}" title="${wahl[k] ? t + ' wird abgezogen – klicken: nicht abziehen' : t + ' wird nicht abgezogen – klicken: abziehen'}">${wahl[k] ? '✓' : '✗'} ${t}</button>`).join('')}</span>`;
}
function abzLeer() {
  const A = abzAuftrag(), an = ABZ.filter(([k]) => A[k]).map(([, t]) => t), aus = ABZ.filter(([k]) => !A[k]).map(([, t]) => t);
  return `<div class="card empty">Noch keine Rechnung. Teilrechnungen werden kumuliert geprüft: Aufmaß × Auftragspreis${an.length ? ', abzüglich ' + an.join(', ').replace(/, ([^,]*)$/, ' und $1') : ', ohne Abzüge'}${aus.length ? ` (nicht abgezogen: ${aus.join(', ')})` : ''} – einstellbar unter „LV- &amp; Auftragsdaten“, je Rechnung bei „Abziehen:“.</div>`;
}
/* Nur diese Rechnung löschen – Aufmaß, Auftrag und LV bleiben; mit Rückgängig */
async function reLoeschen(rid) {
  const r = L && L.rechnungen.find((y) => y.id === rid); if (!r) return;
  const id = L.id, x = JSON.parse(JSON.stringify(r)), stAlt = L.status;
  let pk = null; try { pk = (await call('api/rechnungen/' + r.id, 'DELETE')).papierkorb; } catch (e) { toast(e.message, true); return; }
  if (PJSEL === 'r' + rid) PJSEL = null;
  rueckgaengig(`${reTitel(x)} liegt im Papierkorb – Aufmaß, Auftrag und LV bleiben`, async () => {   // wie sie war: gleiche Nummer, Prüfstand, PDFs
    if (pk) { await api(`api/bp/papierkorb/${pk}/zurueck`, 'POST'); if (L && L.id === id) L = await api('api/lv/' + id); await refreshList(); render(); }
    else await call(`api/lv/${id}/rechnungen`, 'POST', { wiederherstellen: x });
    if (stAlt !== L.status) await call('api/lv/' + id, 'PUT', { status: stAlt });
  });
}
/* Nur dieses Angebot löschen – mit Rückgängig (Bieter, Preise, Nachlass, Skonto wieder anlegen) */
async function angLoeschen(aid) {
  const a = L && L.angebote.find((y) => y.id === aid); if (!a) return;
  if (L.vergabe && L.vergabe.angebot_id === aid) { toast('Auf dieses Angebot ist der Auftrag erteilt – erst die Vergabe zurücknehmen.', true); return; }
  const id = L.id, x = JSON.parse(JSON.stringify(a));
  let pk = null; try { pk = (await call('api/angebote/' + aid, 'DELETE')).papierkorb; } catch (e) { toast(e.message, true); return; }
  if (PJSEL === 'b' + aid) PJSEL = null;
  rueckgaengig(`Angebot „${x.bieter}“ liegt im Papierkorb – das LV bleibt`, async () => {
    if (pk) { await api(`api/bp/papierkorb/${pk}/zurueck`, 'POST'); if (L && L.id === id) L = await api('api/lv/' + id); await refreshList(); render(); return; }
    const r = await call(`api/lv/${id}/angebote`, 'POST', { bieter: x.bieter, contact_id: x.contact_id || null, eingang: x.eingang || '' });
    const n = r.angebote.reduce((m, y) => (y.id > m.id ? y : m), r.angebote[0]);
    await call('api/angebote/' + n.id, 'PUT', { preise: x.preise || {}, nachlass: x.nachlass || 0, skonto: x.skonto || 0, nachlass_eur: x.nachlass_eur || 0, notiz: x.notiz || '' });
  });
}
$('#moreBtn').onclick = () => {
  if (!L) return;
  if ((tab === 'rechnungen' || tab === 'aufmass') && PJSEL && PJSEL[0] === 'r' && (L.rechnungen || []).some((y) => 'r' + y.id === PJSEL)) {   // im Baum ist eine Rechnung gewählt: nur sie
    const r = L.rechnungen.find((y) => 'r' + y.id === PJSEL);
    modalBox(`<h3>${esc(reTitel(r))} löschen?</h3><p>Gelöscht wird <b>nur diese Rechnung</b> (mit ihren PDFs in der Plattform). Aufmaß, Auftrag und das LV „${esc(L.name)}“ bleiben – im Projektordner abgelegte PDFs auch.</p>
      <div class="acts"><button class="btn" data-m="lv" style="margin-right:auto">ganzes LV …</button><button class="btn" data-m="x">Abbrechen</button><button class="btn danger" data-m="del">Rechnung löschen</button></div>`, async (m, bg, close) => {
      if (m === 'x') return close();
      if (m === 'lv') { close(); PJSEL = null; return $('#moreBtn').onclick(); }
      if (m === 'del') { close(); reLoeschen(r.id); }
    });
    return;
  }
  if (tab === 'angebote' && PJSEL && PJSEL[0] === 'b' && (L.angebote || []).some((y) => 'b' + y.id === PJSEL)) {   // ein Angebot gewählt: nur das
    const a = L.angebote.find((y) => 'b' + y.id === PJSEL);
    modalBox(`<h3>Angebot „${esc(a.bieter)}“ löschen?</h3><p>Gelöscht wird <b>nur dieses Angebot</b>. Das LV „${esc(L.name)}“ und die anderen Angebote bleiben.</p>
      <div class="acts"><button class="btn" data-m="lv" style="margin-right:auto">ganzes LV …</button><button class="btn" data-m="x">Abbrechen</button><button class="btn danger" data-m="del">Angebot löschen</button></div>`, async (m, bg, close) => {
      if (m === 'x') return close();
      if (m === 'lv') { close(); PJSEL = null; return $('#moreBtn').onclick(); }
      if (m === 'del') { close(); angLoeschen(a.id); }
    });
    return;
  }
  modalBox(`<h3>Archivieren oder löschen</h3><p><b>${L.archived ? 'Zurückholen' : 'Archivieren'}</b> ${L.archived ? 'stellt das LV wieder zu den laufenden.' : 'nimmt das LV aus der Liste – mit Angeboten, Aufmaß und Rechnungen bleibt alles erhalten.'}</p>
    <p><b>In den Papierkorb</b> nimmt <b>das ganze LV „${esc(L.name)}“</b> mit allen Angeboten, Aufmaß und Rechnungen heraus – wiederherstellen lässt es sich auf der Startseite unter „Papierkorb“. Nur eine Rechnung oder ein Angebot löschen: im Baum links anwählen (oder rechte Maustaste darauf).</p>
    <div class="acts"><button class="btn danger" data-m="del" style="margin-right:auto">🗑 Ganzes LV in den Papierkorb</button><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="arch">${L.archived ? 'Zurückholen' : 'Archivieren'}</button></div>`, async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m === 'arch') {
      const id = L.id, alt = !!L.archived, nm = L.name;
      await flush(); await saveNow({ archived: !alt }); close(); await refreshList(); render();
      rueckgaengig(`LV „${nm}“ ${alt ? 'zurückgeholt' : 'archiviert'}`, () => lvSetzen(id, { archived: alt }));
      return;
    }
    if (m === 'del') {
      try {
        const nm = L.name; await flush(); const r = await api('api/lv/' + L.id, 'DELETE'); close(); L = null; await loadList();
        if (typeof r.papierkorb === 'number') rueckgaengig(`LV „${nm}“ liegt im Papierkorb`, async () => { const w = await api(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); await loadList(+w.schluessel || undefined); });
        else toast('LV liegt im Papierkorb – wiederherstellen unter Startseite → Papierkorb.');
      } catch (e) { toast(e.message, true); }
    }
  });
};
