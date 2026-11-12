/* Baukosten – Bauteile und Material, Assistent, Nachfragen, Rückgängig, Prüfung, Planvorschau.
   Teil der Seite baukosten.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: baukosten-kern.js, baukosten-bauteile.js, baukosten-start.js). */
/* ---------- Bauteile & Material: Kostenberechnung mit Mengen, Materialien und Einheitspreisen ---------- */
let btBusy = false;
const KG2N = { 310: 'Baugrube / Erdbau', 320: 'Gründung, Unterbau', 330: 'Außenwände', 340: 'Innenwände', 350: 'Decken / Böden', 360: 'Dächer', 370: 'Infrastrukturanlagen', 380: 'Baukonstruktive Einbauten', 390: 'Sonstiges KG 300',
  410: 'Abwasser, Wasser, Gas', 420: 'Wärmeversorgung', 430: 'Raumlufttechnik', 440: 'Elektrische Anlagen', 450: 'Kommunikation', 460: 'Förderanlagen', 470: 'Nutzungsspezifische Anlagen', 480: 'Gebäudeautomation', 490: 'Sonstiges KG 400' };
const num1 = (v) => (v == null || v === '' ? '' : String(Math.round(+v * 1000) / 1000).replace('.', ','));
function evalFormel(t) {   // „12,5 * 2,75 + 3“ → Zahl; sonst null (Text ist dann nur eine Beschreibung) – gemeinsamer Baustein bpRechne (bp.js)
  const v = bpRechne(t); return v != null && v >= 0 ? Math.round(v * 1000) / 1000 : null;
}
/* Raumbuch-Ausstattung: je Raum bzw. Raumtyp Boden (353), Wand (345) und Decke (354) als Aufbau aus dem Bauteil-Baukasten.
   Gespeichert als {v: Vorlage, w: Wahl je Schicht, t: Text}; {v: ''} = ohne. Daraus macht „Vorschläge aus dem Raumbuch“ die Bauteile. */
const AUS_SL = [['boden', 'Boden', '353'], ['wand', 'Wand', '345'], ['decke', 'Decke', '354']];
function ausEff(r, k) { const a = (r.aus || {})[k]; if (a) return [a, 'Raum']; const t = ((B.data.ausstattung || {})[r.typ] || {})[k]; return t ? [t, 'Raumtyp'] : [null, 'Standard']; }
function ausKurz(r) { const n = AUS_SL.filter(([k]) => (r.aus || {})[k]).length; return n ? `◧ ${n} eigene` : (B.data.ausstattung || {})[r.typ] ? '◧ Raumtyp' : '◧ Standard'; }
function ausTitel(r) { return AUS_SL.map(([k, l]) => { const [a, q] = ausEff(r, k); return `${l}: ${a ? (a.v ? a.t || a.v : 'ohne') : 'Standard des Baukastens'}${a ? ` (${q})` : ''}`; }).join('\n'); }
function ausDialog(ri) {
  const r = ri == null ? null : B.data.rooms[ri];
  const typen = [...new Set(B.data.rooms.map((x) => x.typ))].filter((t) => B.data.types[t]);
  const zeile = (ziel, k, l) => { const a = ziel ? ziel[k] : null; return `<tr><td>${l}</td><td style="font-size:.86rem">${a ? (a.v ? esc(a.t || a.v) : '<i>ohne</i>') : `<span class="hint">${r ? (() => { const [x, q] = ausEff({ ...r, aus: {} }, k); return x ? (x.v ? esc(x.t || x.v) + ' (Raumtyp)' : 'ohne (Raumtyp)') : 'Standard des Baukastens'; })() : 'Standard des Baukastens'}</span>`}</td>
    <td style="white-space:nowrap"><button class="btn sm" data-aw="${k}" data-at="${ziel === null ? '' : ''}">wählen …</button> <button class="btn sm" data-ao="${k}" title="Diese Fläche nicht ausstatten (z. B. Sichtbeton, gesondert erfasst)">ohne</button>${a ? ` <button class="btn sm" data-ax="${k}" title="Eigene Angabe entfernen">↺</button>` : ''}</td></tr>`; };
  let typ = r ? null : typen[0] || Object.keys(B.data.types)[0];
  const ziel = () => (r ? (r.aus ||= {}) : ((B.data.ausstattung ||= {})[typ] ||= {}));
  const html = () => `<h3>${r ? `Ausstattung ${esc([r.nr, r.name].filter(Boolean).join(' '))}` : 'Ausstattung je Raumtyp'}</h3>
    <p class="hint" style="margin:.2rem 0 .6rem">${r ? 'Eigene Aufbauten nur für diesen Raum – sonst gilt die Ausstattung des Raumtyps.' : 'Gilt für alle Räume dieses Typs ohne eigene Angabe.'} Mengen: Boden und Decke = Fläche, Wand = Umfang × lichte Höhe (Geschosshöhe − 0,30 m) − 1 Tür; Fliesen ohne eigene Angabe bis 2,0 m Höhe.</p>
    ${r ? '' : `<select id="ausT" style="margin-bottom:.5rem">${Object.entries(B.data.types).map(([k, t]) => `<option value="${k}"${k === typ ? ' selected' : ''}>${esc(t.label)}${typen.includes(k) ? ` · ${B.data.rooms.filter((x) => x.typ === k).length} Räume` : ''}</option>`).join('')}</select>`}
    <table style="width:100%"><tbody>${AUS_SL.map(([k, l]) => zeile(r ? r.aus || {} : (B.data.ausstattung || {})[typ] || {}, k, l)).join('')}</tbody></table>
    <p class="hint" style="margin:.6rem 0 0">Unter „Bauteile & Material“ → „Vorschläge neu aus dem Raumbuch“ entstehen daraus die Bauteile mit Mengen und Preisen.</p>
    <div class="acts" style="justify-content:flex-end"><button class="btn pri" data-m="x">Fertig</button></div>`;
  const bg = modalBox(html(), (m, bgx, close) => { if (m === 'x') close(); });
  const neu = () => { bg.querySelector('.modal').innerHTML = html(); };
  bg.addEventListener('change', (e) => { if (e.target.id === 'ausT') { typ = e.target.value; neu(); } });
  bg.addEventListener('click', (e) => {
    const w = e.target.closest('[data-aw]'), o = e.target.closest('[data-ao]'), x = e.target.closest('[data-ax]');
    if (o) { ziel()[o.dataset.ao] = { v: '', w: [] }; changed(); neu(); return; }
    if (x) { delete ziel()[x.dataset.ax]; if (r && !Object.keys(r.aus).length) delete r.aus; changed(); neu(); return; }
    if (w) { const k = w.dataset.aw, sl = AUS_SL.find((z) => z[0] === k), a = ziel()[k];
      aufbauWahl({ kg: sl[2], vorlage: a && a.v, wahl: a && a.w, titel: `${sl[1]}: Aufbau wählen`, knopf: 'Übernehmen', onOk(A) { ziel()[k] = { v: A.vorlage, w: A.wahl, t: A.bez }; changed(); neu(); } }); }
  });
}
function btAusAufbau(b, a) {   // gewählter Aufbau → Bauteil (Name aus der Vorlage, Ausführung = gewählte Schichten, EP mittel, Spanne als Notiz)
  const aus = a.bez.slice(a.name.length).replace(/^,\s*/, '');
  return Object.assign(b, { kg: a.kg, name: b.name && b.aufbau ? b.name : a.name, mat: aus || a.name, einheit: a.einheit, ep: a.ep_mittel,
    notiz: `Baukasten ${a.vorlage} · Spanne ${String(a.ep_von).replace('.', ',')}–${String(a.ep_bis).replace('.', ',')} € · ${a.teile.length} Positionen`, aufbau: { v: a.vorlage, w: a.wahl } });
}
function btAufbauOeffnen(b) { aufbauWahl({ kg: b.kg, vorlage: b.aufbau && b.aufbau.v, wahl: b.aufbau && b.aufbau.w, knopf: 'Übernehmen', onOk(a) { btAusAufbau(b, a); changed(); } }); }
function vBauteile() {
  const d = B.data, c = B.calc, bt = d.bauteile || [], M = B.mat || {}, J0 = c.justage || {};
  const matSel = (b, i) => { const m = M[b.kg]; const opts = m ? m.opts : []; const own = b.mat && !opts.some((o) => o.n === b.mat);
    return `<select data-bf="mat" data-bi="${i}" aria-label="Material">${opts.map((o) => `<option value="${esc(o.n)}"${o.n === b.mat ? ' selected' : ''}>${esc(o.n)} · ${eur(o.ep)}</option>`).join('')}${own || !opts.length ? `<option value="${esc(b.mat)}" selected>${esc(b.mat || '– eigenes –')}</option>` : ''}<option value="__eigen">eigenes Material …</option><option value="__aufbau">${b.aufbau ? 'Aufbau ändern …' : 'Aufbau aus dem Baukasten …'}</option></select>${b.aufbau ? `<button class="btn sm" data-btauf="${i}" title="Aufbau im Baukasten ändern (Schichten, Preis aus den Positionen)" aria-label="Aufbau ändern" style="margin-left:.2rem">🧱</button>` : ''}`; };
  const groups = {}; bt.forEach((b, i) => { const k = (b.kg || '').slice(0, 2) + '0'; (groups[k] ||= []).push([b, i]); });
  const row = ([b, i]) => `<tr data-bi="${i}"><td><input class="n" style="width:52px;text-align:left" data-bf="kg" data-bi="${i}" value="${esc(b.kg)}" aria-label="KG"></td>
      <td><input data-bf="name" data-bi="${i}" value="${esc(b.name)}" style="min-width:170px" aria-label="Bauteil">${b.src ? `<div class="hint" style="font-size:.7rem">${esc(b.src)}${b.notiz ? ' · ' + esc(b.notiz) : ''}</div>` : ''}</td>
      <td>${matSel(b, i)}</td>
      <td><input data-bf="formel" data-bi="${i}" value="${esc(b.formel)}" placeholder="z. B. 12,5 × 2,75" style="min-width:150px" title="Rechnung (z. B. 12,5 × 2,75 + 3) – ergibt die Menge; oder eine Beschreibung" aria-label="Ermittlung"></td>
      <td class="r"><input class="n" style="width:80px" data-bf="menge" data-bi="${i}" value="${num1(b.menge)}" inputmode="decimal" aria-label="Menge"></td>
      <td><input style="width:48px" data-bf="einheit" data-bi="${i}" data-vs="eh" autocomplete="off" value="${esc(b.einheit)}" aria-label="Einheit"></td>
      <td class="r"><input class="n" style="width:84px" data-bf="ep" data-bi="${i}" value="${num1(b.ep)}" inputmode="decimal" aria-label="Einheitspreis"></td>
      <td class="r num">${eur(btBetrag(b))}</td>
      <td style="white-space:nowrap"><button class="btn sm" data-btdup="${i}" title="Zeile kopieren" aria-label="kopieren">⧉</button><button class="btn sm" data-btdel="${i}" title="Zeile löschen" aria-label="löschen">✕</button></td></tr>`;
  const kgOpts = Object.entries(M).map(([k, m]) => `<option value="${k}">${k} ${esc(m.name)}</option>`).join('');
  const sumBt = bt.reduce((a, b) => a + btBetrag(b), 0);
  return `<section class="card" style="margin-bottom:1rem"><div class="row" style="align-items:flex-start;gap:1rem;flex-wrap:wrap"><div style="flex:1 1 380px"><h2 style="margin:0">Bauteile & Material</h2>
      <p class="sub" style="margin:.3rem 0 0">Für die Kostenberechnung: Bauteile mit Menge, Material und Einheitspreis. Hat eine Kostengruppe der 2. Ebene (z. B. 350 Decken) Bauteile, ersetzen sie dort den Anteil aus den Kennwerten – die übrigen Gruppen bleiben beim Kennwert.</p></div>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn sm pri" data-act="btVor"${btBusy ? ' disabled' : ''}>${bt.length ? 'Vorschläge neu aus dem Raumbuch' : 'Vorschläge aus Raumbuch & Plänen'}</button><button class="btn sm ki" data-act="btKi"${btBusy ? ' disabled' : ''} title="Mengen, Materialien und Preise von der KI prüfen und ergänzen lassen">${btBusy ? '✨ rechnet …' : '✨ Mit KI prüfen & ergänzen'}</button></div></div>
    ${(() => { const J = c.justage || {}; if (!J.bt_kw) return `<div class="kpis" style="display:flex;gap:1.4rem;flex-wrap:wrap;margin-top:.8rem"><span><span class="hint">Bauwerk KG 300 + 400 aus Kennwerten</span><br><b>${eur(c.bauwerk)}</b></span></div>`;
      const dev = J.k ? Math.round((J.k - 1) * 100) : 0, warn = J.k && (J.k > 1.4 || J.k < 0.7);
      const it = (l, v, x = '') => `<span><span class="hint">${l}</span><br><b>${v}</b>${x}</span>`, op = (t) => `<span style="align-self:center;font-size:1.3rem;color:var(--mute)">${t}</span>`;
      return `<div class="kpis" style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:.8rem;align-items:flex-start">${it('Gruppen mit Bauteilen', eur(J.bt_wert), `<br><span class="hint" style="font-size:.75rem">Kennwert-Anteil ${eur(J.bt_kw)} · ${vglTxt(J.bt_wert, J.bt_kw)}</span>`)}${op('+')}${it('übrige Gruppen aus Kennwerten', eur(J.rest_wert), `<br><span class="hint" style="font-size:.75rem">${J.rest_f !== 1 ? `${eur(J.rest_kw)} × ${fx(J.rest_f)}` : 'unverändert'}</span>`)}${op('=')}${it('Bauwerk KG 300 + 400', eur(c.bauwerk), c.area ? `<br><span class="hint" style="font-size:.75rem">${eur(c.bauwerk / c.area)} je m² Raumfläche</span>` : '')}<span style="flex:1"></span>${it('zum Vergleich: nur Kennwerte', eur(c.bauwerk_kw))}</div>
        ${(() => { const E = juEmpfehlung(J), cur = (d.justage || {}).rest || 'kw', ok = E.v === cur || (E.v === 'preis' && Math.abs(J.preis - E.p) < 1);
          return `<p class="hint" style="margin:.6rem 0 0;${warn && !ok ? 'color:#e07b3a' : ''}">${warn ? `Bauteile und Kennwerte liegen weit auseinander (${vglTxt(J.bt_wert, J.bt_kw)}). ` : ''}${ok ? '✓' : '💡'} <b>Empfehlung:</b> ${esc(E.s)}${ok ? ' (gewählt)' : ''} · <a href="#" data-act="juWarum">Warum?</a>${ok ? '' : ` · <a href="#" data-act="toJustage">zur Justage</a>`}</p>`; })()}`; })()}</section>
    ${justageHtml()}
    ${bt.length ? `<div class="tbl"><table class="bt"><thead><tr><th>KG</th><th>Bauteil</th><th>Material / Ausführung</th><th>Ermittlung</th><th class="r">Menge</th><th>Einh.</th><th class="r">€ / Einh.</th><th class="r">Betrag</th><th></th></tr></thead><tbody>
      ${Object.keys(groups).sort().map((k) => { const g = c.kg2[k] || {}; return `<tr class="bt-g"><td>${k}</td><td colspan="6"><b>${esc(KG2N[k] || 'KG ' + k)}</b>${g.kennwert ? ` <span class="hint">· Kennwert-Anteil ${eur(g.kennwert)} · ${vglTxt(groups[k].reduce((a, [b]) => a + btBetrag(b), 0), g.kennwert)}</span>` : ''}</td><td class="r num"><b>${eur(groups[k].reduce((a, [b]) => a + btBetrag(b), 0))}</b></td><td></td></tr>` + groups[k].map(row).join(''); }).join('')}
      </tbody></table></div>` : '<div class="card empty"><p>Noch keine Bauteile. „Vorschläge aus Raumbuch & Plänen“ legt eine Liste mit Mengen aus Flächen, Geschossen und Höhen an – Material und Preis wählst du je Zeile.</p></div>'}
    <div class="row" style="margin-top:.7rem;gap:.4rem"><select id="btNewKg" aria-label="Kostengruppe für neues Bauteil">${kgOpts}</select><button class="btn sm" data-act="btAdd">+ Bauteil</button><button class="btn sm" data-act="btAufbau" title="Bauteil aus dem Baukasten: Vorlage nach DIN 276 wählen, je Schicht die Ausführung – Preis von–mittel–bis aus den Positionen der Baudaten">+ aus Baukasten</button><button class="btn sm" data-act="btPdb" title="Bauteile aus den Baudaten (Positionsdatenbank, Sirados-Import, eigene Positionen) mit Einheit, KG und Preis übernehmen">+ aus Baudaten</button>${bt.length ? '<span style="flex:1"></span><button class="btn sm danger" data-act="btClear">Alle Bauteile entfernen</button>' : ''}</div>
    ${c.kg2 && Object.keys(c.kg2).length ? `<section class="card" style="margin-top:1rem"><h2 style="margin:0 0 .5rem">Kostengruppen der 2. Ebene</h2><p class="hint" style="margin:0 0 .5rem">Abweichung = Bauteile im Vergleich zum Kennwert-Anteil derselben Kostengruppe.</p><div class="tbl"><table><thead><tr><th>KG</th><th>Bezeichnung</th><th>Quelle</th><th class="r">Kennwert-Anteil</th><th class="r">Bauteile</th><th class="r">Abweichung</th><th class="r">Betrag</th></tr></thead><tbody>
      ${Object.entries(c.kg2).sort().map(([k, x]) => { const dv = x.kennwert ? Math.round((x.wert / x.kennwert - 1) * 100) : null;
        return `<tr><td>${k}</td><td>${esc(KG2N[k] || '')}</td><td>${x.quelle === 'bauteile' ? `${x.n} Bauteile` : '<span class="hint">Kennwert-Anteil</span>'}</td><td class="r num">${eur(x.kennwert)}</td><td class="r num">${x.quelle === 'bauteile' ? eur(x.wert) : '–'}</td><td class="r"${dv != null && Math.abs(dv) > 40 ? ' style="color:#e07b3a"' : ''}>${x.quelle === 'bauteile' ? vglTxt(x.wert, x.kennwert) : x.wert !== x.kennwert ? `angeglichen ${vglTxt(x.wert, x.kennwert, true)}` : '–'}</td><td class="r num">${eur(x.wert)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr><td></td><td>Summe</td><td></td><td class="r num">${eur(Object.values(c.kg2).reduce((a, x) => a + x.kennwert, 0))}</td><td class="r num">${eur(J0.bt_wert)}</td><td class="r">${J0.bt_kw ? vglTxt(J0.bt_wert, J0.bt_kw) : ''}</td><td class="r num">${eur(c.bauwerk)}</td></tr></tfoot></table></div></section>` : ''}`;
}
async function btSuggest(ki) {
  if (btBusy) return;
  if ((B.data.bauteile || []).length && !(await bpFrage(ki ? 'Die KI prüft die Liste und schlägt eine neue vor. Die bisherige Bauteilliste wird ersetzt (mit ↶ Rückgängig zurückholbar). Weiter?' : 'Die Bauteilliste wird durch neue Vorschläge aus dem Raumbuch ersetzt (mit ↶ Rückgängig zurückholbar). Weiter?'))) return;
  btBusy = true; render();
  try { clearTimeout(saveT); await saveNow(); const r = await api(`api/bk/${B.id}/bauteile/vorschlag`, 'POST', ki ? { ki: true } : {}); B.data.bauteile = r.rows; toast(r.note); changed(); }
  catch (e) { toast(e.message, true); }
  btBusy = false; render();
}
async function loadSources() { try { SRC = await api('api/sources'); } catch { SRC = { projects: [], plans: [] }; } if (tab === 'mittel') render(); }
async function runCheck(ki) {
  const b = document.querySelector(ki ? '[data-act="checkKi"]' : '[data-act="check"]'); if (b) { b.disabled = true; b.textContent = 'Prüfe …'; }
  try { clearTimeout(saveT); await saveNow(); CHECK = await api(`api/bk/${B.id}/check`, 'POST', ki ? { ki: true } : {}); } catch (e) { toast(e.message, true); }
  render();
}
async function upload(files) {
  for (const f of files) {
    const fd = new FormData(); fd.append('file', f);
    toast(`„${f.name}“ wird gelesen …`);
    try {
      clearTimeout(saveT); await saveNow();
      const r = await fetch(`api/bk/${B.id}/files`, { method: 'POST', body: fd }); const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || r.statusText);
      B = d.bk; CHECK = null;
      if (d.cad) { toast(`${f.name}: ${d.note}`); continue; }
      selFile = B.files[B.files.length - 1].id;
      toast(`${f.name}: ${d.note}${d.added ? ` – ${d.added} Räume übernommen` : ''}`);
    } catch (e) { toast(`${f.name}: ${e.message}`, true); }
  }
  render();
}

/* ---------- Assistent: führt Schritt für Schritt, jederzeit verlassen und später fortsetzen ---------- */
const AS_KEY = () => 'bk.assist.' + (B ? B.id : 0);
let AS = { open: false, step: null, skip: [], kw: false, pdf: false };
function asLoad() { try { AS = Object.assign({ open: false, step: null, skip: [], kw: false, pdf: false }, JSON.parse(localStorage.getItem(AS_KEY())) || {}); } catch { AS = { open: false, step: null, skip: [], kw: false, pdf: false }; } }
function asSave() { try { localStorage.setItem(AS_KEY(), JSON.stringify(AS)); } catch { /* egal */ } }
const STEPS = [
  { k: 'plaene', t: 'Pläne hochladen', done: () => B.files.length > 0,
    txt: () => 'Lade die Grundrisse <b>aller Geschosse</b> als PDF aus dem CAD hoch, dazu Ansichten und Schnitte. Aus Grundrissen werden Raumnummer, Name und Fläche exakt gelesen.',
    st: () => B.files.length ? `${B.files.length} Pläne, ${B.data.rooms.length} Räume gelesen.` : 'Noch keine Pläne.',
    acts: [['PDF auswählen', 'pdf'], ['Zu „Pläne & Raumbuch“', 'tab:plaene']] },
  { k: 'raeume', t: 'Räume prüfen', done: () => B.data.rooms.some((r) => r.area > 0) && B.data.rooms.every((r) => r.ok && r.area > 0 && r.name),
    txt: () => 'Prüfe Raumtyp und Fläche je Raum. Die Typen sind Vorschläge. Rote Markierungen im Plan zeigen doppelte Raumnummern.',
    st: () => { const o = B.data.rooms.filter((r) => !r.ok || !(r.area > 0) || !r.name).length; return B.data.rooms.length ? (o ? `${o} von ${B.data.rooms.length} Räumen noch offen oder ohne Name/Fläche.` : 'Alle Räume bestätigt.') : 'Noch keine Räume – Grundriss hochladen oder „Räume mit KI lesen“.'; },
    acts: [['Zu den Räumen', 'tab:plaene'], ['Alle bestätigen', 'okAll']] },
  { k: 'ansaetze', t: 'Aus einem früheren Projekt übernehmen?', done: () => !!AS.ans || LIST.length < 2,   // das Projekt selbst ist immer gesetzt – kein eigener Schritt
    txt: () => 'Kennwerte, Prozente, Pauschalen und Bauteile mit Einheitspreisen aus einer anderen Kostenermittlung holen – auf Wunsch mit Mengen. Räume und Pläne bleiben. ↶ Rückgängig nimmt es zurück.',
    st: () => (LIST.length < 2 ? 'Es gibt noch keine andere Kostenermittlung.' : AS.ans === 'ja' ? 'Ansätze übernommen.' : AS.ans ? 'Nicht nötig.' : 'Noch nichts übernommen.'),
    acts: [['Aus anderem Projekt übernehmen …', 'ans'], ['Nicht nötig', 'ansok']] },
  { k: 'kennwerte', t: 'Kennwerte', done: () => AS.kw || !(B.acc && B.acc.faktoren.some((f) => /Beispiel-Kennwerte/.test(f.text))),
    txt: () => 'Die vorgegebenen €/m² sind Beispielwerte. Mit Kennwerten aus euren abgerechneten Projekten wird die Schätzung deutlich genauer. Einmal als eigene Werte gespeichert, gelten sie für alle neuen Kostenermittlungen.',
    st: () => (B.acc && B.acc.faktoren.some((f) => /Beispiel-Kennwerte/.test(f.text))) ? 'Es werden noch Beispiel-Kennwerte verwendet.' : 'Eigene Kennwerte in Verwendung.',
    acts: [['Zu den Kennwerten', 'tab:kosten'], ['Beispielwerte sind ok', 'kwok']] },
  { k: 'schaetzen', t: 'Fehlendes schätzen', done: () => !B.data.items.some((i) => i.amount == null),
    txt: () => 'Offene Kostengruppen (z. B. Rückbau, Außenanlagen) fehlen in der Summe. Lass sie schätzen – ohne KI mit Faustwerten oder zusätzlich mit der gewählten KI – und übernimm, was passt. Jede Schätzung hat eine Spanne.',
    st: () => { const o = B.data.items.filter((i) => i.amount == null).length; return o ? `${o} Kostengruppen offen.` : 'Keine offenen Kostengruppen.'; },
    acts: [['Jetzt schätzen', 'estimate']] },
  { k: 'mittel', t: 'Bauzeitenplan', done: () => !!B.gantt_id,
    txt: () => 'Mit dem Bauzeitenplan werden die Kosten auf Monate verteilt (Mittelabfluss) – das braucht der Bauherr für die Finanzierung.',
    st: () => B.gantt ? `Verknüpft: ${esc(B.gantt.name)}` : 'Kein Bauzeitenplan verknüpft.',
    acts: [['Zum Mittelabfluss', 'tab:mittel']] },
  { k: 'pruefung', t: 'Prüfen', done: () => !!CHECK,
    txt: () => 'Die Prüfung findet doppelte Raumnummern, fehlende Geschosse, auffällige Kennwerte und offene Kostengruppen – mit KI zusätzlich nutzungsspezifische Hinweise.',
    st: () => CHECK ? `${CHECK.hinweise.length} Hinweise.` : 'Noch nicht geprüft.',
    acts: [['Jetzt prüfen', 'check']] },
  { k: 'pdf', t: 'PDF für den Bauherrn', done: () => AS.pdf,
    txt: () => `Wähle, was ins PDF-Paket soll und in welcher Gliederungstiefe. Aktuell: <b>${eur(B.calc.total)}</b>${B.acc ? `, wahrscheinlich ${eur(B.acc.low)} – ${eur(B.acc.high)} (${esc(B.acc.urteil)})` : ''}.`,
    st: () => AS.pdf ? 'PDF erstellt.' : '',
    acts: [['PDF erstellen …', 'pdf-dlg']] },
];
function asCur() {
  const i = AS.step != null ? STEPS.findIndex((x) => x.k === AS.step) : -1;
  return i >= 0 ? i : Math.max(0, STEPS.findIndex((x) => !x.done() && !AS.skip.includes(x.k)));
}
function assist() {
  let box = $('#asst'), fab = $('#asstFab');
  if (!B) { if (box) box.remove(); if (fab) fab.remove(); return; }
  const n = STEPS.filter((x) => x.done()).length;
  if (!AS.open) {
    document.body.classList.remove('as-open');
    if (box) box.remove();
    if (!fab) { fab = document.createElement('button'); fab.id = 'asstFab'; fab.className = 'btn pri'; fab.onclick = () => { AS.open = true; AS.step = null; asSave(); assist(); }; document.body.appendChild(fab); }
    fab.textContent = n === STEPS.length ? 'Assistent ✓' : `Assistent · ${n}/${STEPS.length}`;
    return;
  }
  if (fab) fab.remove();
  document.body.classList.add('as-open');
  if (!box) { box = document.createElement('aside'); box.id = 'asst'; box.setAttribute('aria-label', 'Assistent'); document.body.appendChild(box); }
  const i = asCur(), S = STEPS[i], st = S.st();
  box.innerHTML = `<div class="ah" title="Zum Verschieben ziehen · Doppelklick: zurück in die Ecke"><span class="grip" aria-hidden="true">⋮⋮</span><b>Assistent · Schritt ${i + 1} von ${STEPS.length}</b><button class="btn sm" data-as="close" title="Assistent schließen – später über den Knopf unten rechts weitermachen">Später weiter</button></div>
    <div class="ab"><div class="steps">${STEPS.map((x, k) => `<button type="button" class="${k === i ? 'cur' : x.done() ? 'ok' : ''}" data-as="go:${x.k}" title="${esc(x.t)}${x.done() ? ' ✓' : ''}" aria-label="${esc(x.t)}"></button>`).join('')}</div>
    <h3>${S.done() ? '✓ ' : ''}${esc(S.t)}</h3><p>${S.txt()}</p>${st ? `<div class="st ${S.done() ? 'ok' : ''}">${st}</div>` : ''}
    <div class="acts">${S.acts.map(([l, a]) => `<button class="btn sm" data-as="${a}">${esc(l)}</button>`).join('')}</div></div>
    <div class="af"><button class="btn sm" data-as="prev"${i ? '' : ' disabled'}>Zurück</button><span class="fill">${n} von ${STEPS.length} erledigt</span>
    ${S.done() || i === STEPS.length - 1 ? '' : '<button class="btn sm" data-as="skip">Überspringen</button>'}<button class="btn sm pri" data-as="next"${i === STEPS.length - 1 ? ' disabled' : ''}>Weiter</button></div>`;
  asPlace();
}
/* ---------- Nachfragen: Positionen mit Menge und Preis vorschlagen (intern oder ✨ KI) ---------- */
async function askDialog(ask) {
  if (document.querySelector('.modal-bg')) return;
  let R; try { clearTimeout(saveT); await saveNow(); R = await api(`api/bk/${B.id}/vorschlag`, 'POST', ask); } catch (e) { toast(e.message, true); return; }
  let rows = R.rows.map((x) => ({ ...x, on: true }));
  const sum = () => rows.filter((x) => x.on).reduce((a, x) => a + (+x.betrag || 0), 0);
  const tbl = () => `<div class="tbl"><table><thead><tr><th></th><th>KG</th><th>Bezeichnung</th><th class="r">Menge</th><th>Einheit</th><th class="r">€ / Einheit</th><th class="r">Betrag €</th></tr></thead><tbody>${rows.map((x, i) => `
    <tr data-r="${i}"><td><input type="checkbox" data-q="on"${x.on ? ' checked' : ''} aria-label="übernehmen"></td><td><input class="n" style="width:56px;text-align:left" data-q="kg" value="${esc(x.kg)}"></td>
    <td><input data-q="name" value="${esc(x.name)}" style="min-width:220px"><div class="hint" style="font-size:.72rem">${esc(x.src)}${x.basis ? ' · ' + esc(x.basis) : ''}</div></td>
    <td class="r"><input class="n" style="width:80px" data-q="menge" value="${x.menge == null ? '' : String(x.menge).replace('.', ',')}" inputmode="decimal"></td><td><input style="width:56px" data-q="einheit" data-vs="eh" autocomplete="off" value="${esc(x.einheit || '')}"></td>
    <td class="r"><input class="n" style="width:90px" data-q="ep" value="${x.ep == null ? '' : String(x.ep).replace('.', ',')}" inputmode="decimal"></td>
    <td class="r"><input class="n" style="width:110px" data-q="betrag" value="${Math.round(+x.betrag || 0)}" inputmode="numeric"></td></tr>`).join('')}</tbody>
    <tfoot><tr><td></td><td></td><td>Summe der gewählten Positionen</td><td></td><td></td><td></td><td class="r num" id="askSum">${eur(sum())}</td></tr></tfoot></table></div>`;
  const html = () => `<h3>${esc(R.title)}</h3><p class="hint" style="margin-top:0">${esc(R.note || '')}</p><div id="askT">${tbl()}</div>
    <div class="acts" style="justify-content:space-between"><button class="btn ki" data-m="ki" title="Positionen, Mengen und Preise von der KI vorschlagen lassen">✨ Mit KI vorschlagen</button>
    <span><button class="btn" data-m="x">Abbrechen</button> <button class="btn pri" data-m="ok">OK</button></span></div>`;
  const bg = modalBox(html(), async (m, bg, close, b) => {
    if (m === 'x') { close(); return; }
    if (m === 'ki') {
      b.disabled = true; b.textContent = '✨ KI rechnet …';
      try { const K = await api(`api/bk/${B.id}/vorschlag`, 'POST', { ...ask, ki: true }); R = { ...R, note: K.note, title: K.title }; rows = K.rows.map((x) => ({ ...x, on: true })); bg.querySelector('.modal').innerHTML = html(); }
      catch (e) { toast(e.message, true); b.disabled = false; b.textContent = '✨ Mit KI vorschlagen'; }
      return;
    }
    if (m === 'ok') {
      const take = rows.filter((x) => x.on && x.name.trim() && (+x.betrag || 0) > 0);
      if (!take.length) { toast('Keine Position mit Betrag gewählt.', true); return; }
      const it = ask.item != null ? B.data.items[ask.item] : null;
      if (it && it.amount == null) B.data.items.splice(ask.item, 1);   // offene Sammelposition wird durch die Einzelpositionen ersetzt
      take.forEach((x) => B.data.items.push({ kg: x.kg, name: x.name.trim(), amount: Math.round(+x.betrag),
        est: { src: x.src || 'Vorschlag', low: Math.round(x.betrag * 0.8), high: Math.round(x.betrag * 1.3), basis: [x.menge ? `${String(x.menge).replace('.', ',')} ${x.einheit || ''} × ${eur(+x.ep || 0)}` : '', x.basis || ''].filter(Boolean).join(' · ').slice(0, 300) } }));
      close(); CHECK = null; tab = 'kosten'; history.replaceState(null, '', '#kosten');
      changed(); toast(`${take.length} Positionen übernommen – mit ↶ Rückgängig zurücknehmbar.`);
    }
  });
  bg.querySelector('.modal').style.width = 'min(980px,100%)';
  bg.addEventListener('input', (e) => {
    const el = e.target, tr = el.closest('[data-r]'); if (!tr || !el.dataset.q) return;
    const x = rows[+tr.dataset.r], q = el.dataset.q;
    if (q === 'on') return;
    x[q] = ['menge', 'ep', 'betrag'].includes(q) ? (el.value.trim() === '' ? null : pnum(el.value)) : el.value;
    if ((q === 'menge' || q === 'ep') && x.menge != null && x.ep != null) { x.betrag = Math.round(x.menge * x.ep); tr.querySelector('[data-q="betrag"]').value = x.betrag; }
    bg.querySelector('#askSum').textContent = eur(sum());
  });
  bg.addEventListener('change', (e) => { const el = e.target, tr = el.closest('[data-r]'); if (tr && el.dataset.q === 'on') { rows[+tr.dataset.r].on = el.checked; bg.querySelector('#askSum').textContent = eur(sum()); } });
}

/* ---------- Rückgängig / Wiederholen: eigene Eingaben, Löschen und automatische Übernahmen ---------- */
let HIST = { id: null, last: null, undo: [], redo: [] };
const histLabel = (a, b) => {
  try {
    const A = JSON.parse(a), Bd = JSON.parse(b);
    if (Bd.rooms.length < A.rooms.length) return `${A.rooms.length - Bd.rooms.length === 1 ? 'Raum' : (A.rooms.length - Bd.rooms.length) + ' Räume'} gelöscht`;
    if (Bd.rooms.length > A.rooms.length) return `${Bd.rooms.length - A.rooms.length} Räume hinzugefügt`;
    if (Bd.items.length < A.items.length) return 'Position gelöscht';
    if (Bd.items.length > A.items.length) return 'Positionen hinzugefügt';
    if (JSON.stringify(A.rooms.map((r) => r.ok)) !== JSON.stringify(Bd.rooms.map((r) => r.ok))) return 'Bestätigung geändert';
  } catch { /* egal */ }
  return 'Änderung';
};
function histTrack() {   // nach jeder Änderung aufrufen: alten Stand merken
  if (!B) return;
  const cur = JSON.stringify(B.data);
  if (HIST.id !== B.id) { HIST = { id: B.id, last: cur, undo: [], redo: [] }; histUi(); return; }
  if (cur === HIST.last) return;
  HIST.undo.push({ data: HIST.last, label: HIST.next || histLabel(HIST.last, cur) }); HIST.next = ''; if (HIST.undo.length > 60) HIST.undo.shift();
  HIST.redo = []; HIST.last = cur; histUi();
}
function histGo(dir) {
  histTrack();
  const from = dir < 0 ? HIST.undo : HIST.redo, to = dir < 0 ? HIST.redo : HIST.undo, s = from.pop(); if (!s) return;
  to.push({ data: HIST.last, label: s.label });
  B.data = JSON.parse(s.data); HIST.last = s.data; CHECK = null;
  changed(); histUi(); toast(`${dir < 0 ? 'Rückgängig' : 'Wiederholt'}: ${s.label}`);
}
function histUi() {
  let el = $('#histBar');
  if (!el) { el = document.createElement('div'); el.id = 'histBar'; el.innerHTML = '<button class="btn" data-hist="-1">↶ Rückgängig</button><button class="btn" data-hist="1" title="Wiederholen (Strg+Y)">↷</button>'; document.body.appendChild(el);
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-hist]'); if (b) histGo(+b.dataset.hist); }); }
  const u = HIST.undo[HIST.undo.length - 1], r = HIST.redo[HIST.redo.length - 1];
  el.hidden = !B || (!u && !r);
  const bu = el.querySelector('[data-hist="-1"]'), br = el.querySelector('[data-hist="1"]');
  bu.disabled = !u; bu.title = u ? `Rückgängig: ${u.label} (Strg+Z)` : 'Nichts rückgängig zu machen'; bu.textContent = u ? `↶ ${u.label}` : '↶ Rückgängig';
  br.disabled = !r; br.title = r ? `Wiederholen: ${r.label} (Strg+Y)` : 'Nichts zu wiederholen';
}
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || document.querySelector('.modal-bg')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;   // im Feld macht der Browser selbst rückgängig
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); histGo(-1); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); histGo(1); }
});

/* ---------- Prüfung: Hinweis anklicken → zur Stelle springen ---------- */
function goHint(h) {
  const g = h.go || { tab: 'kosten' };
  if (g.ask) { askDialog(g.ask); return; }
  if (g.room) selRoom = g.room;
  tab = g.tab || 'kosten'; history.replaceState(null, '', '#' + tab); render();
  requestAnimationFrame(() => {
    let el = g.sel ? document.querySelector(g.sel) : null;
    if (g.room) { const tr = document.querySelector('tr.sel'); if (tr) el = tr.querySelector(g.f === 'area' ? '[data-f="area"]' : 'input,select') || tr; }
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const box = el.closest('tr') || el; box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 1800);
    if (el.matches('input,select,textarea')) setTimeout(() => { el.focus({ preventScroll: true }); if (el.select) el.select(); }, 350);
  });
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-hint]'); if (b && CHECK) goHint(CHECK.hinweise[+b.dataset.hint]); });
document.addEventListener('click', (e) => { const b = e.target.closest('[data-rgo]'); if (!b || !B || !B.reife) return; e.preventDefault(); const [i, k] = b.dataset.rgo.split(':').map(Number); const f = B.reife.stufen[i].fehlt[k]; goHint({ title: f.text, go: f.go }); });
document.addEventListener('change', (e) => {   // Prüfung: gegen welche Stufe nach DIN 276
  const sel = e.target.closest('[data-pstufe]'); if (!sel || !B) return;
  B.stufe = sel.value; CHECK = null; clearTimeout(saveT);
  saveNow({ stufe: B.stufe }).then(() => { const x = LIST.find((y) => y.id === B.id); if (x) x.stufe = B.stufe; vleiste(); render(); runCheck(); });
});

/* ---------- Assistent verschieben (an der Titelzeile ziehen) ---------- */
function asPlace() {
  const box = $('#asst'); if (!box) return;
  if (!AS.pos || innerWidth <= 640) { box.style.left = box.style.top = ''; box.style.right = box.style.bottom = ''; return; }
  const w = box.offsetWidth, h = box.offsetHeight;
  const l = Math.max(4, Math.min(innerWidth - w - 4, AS.pos.l)), t = Math.max(56, Math.min(innerHeight - Math.min(h, 120), AS.pos.t));
  Object.assign(box.style, { left: l + 'px', top: t + 'px', right: 'auto', bottom: 'auto' });
}
document.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('#asst .ah'); if (!h || e.target.closest('button') || innerWidth <= 640) return;
  const box = $('#asst'), r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
  h.setPointerCapture(e.pointerId);
  const mv = (ev) => { AS.pos = { l: ev.clientX - dx, t: ev.clientY - dy }; asPlace(); };
  const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); asSave(); };
  h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
});
document.addEventListener('dblclick', (e) => { if (e.target.closest('#asst .ah') && !e.target.closest('button')) { AS.pos = null; asSave(); asPlace(); } });
addEventListener('resize', () => asPlace());

/* ---------- Planvorschau zoomen und verschieben ---------- */
let ZM = { key: '', s: 1, x: 0, y: 0 };
function zmApply() {
  const pz = $('#pz'), box = $('#planBox'); if (!pz || !box) return;
  const W = box.clientWidth, H = pz.offsetHeight;
  ZM.s = Math.max(1, Math.min(10, ZM.s));
  ZM.x = Math.min(0, Math.max(W - W * ZM.s, ZM.x)); ZM.y = Math.min(0, Math.max(H - H * ZM.s, ZM.y));
  pz.style.transform = `translate(${ZM.x}px,${ZM.y}px) scale(${ZM.s})`; pz.style.setProperty('--z', ZM.s);
  const p = $('#pzp'); if (p) p.textContent = Math.round(ZM.s * 100) + ' %';
}
function zmAt(f, px, py) { const ns = Math.max(1, Math.min(10, ZM.s * f)); ZM.x = px - (px - ZM.x) * ns / ZM.s; ZM.y = py - (py - ZM.y) * ns / ZM.s; ZM.s = ns; zmApply(); }
function zmInit() {
  const box = $('#planBox'); if (!box) return;
  const key = B.id + ':' + selFile; if (ZM.key !== key) ZM = { key, s: 1, x: 0, y: 0 };
  const img = box.querySelector('img'); if (img.complete) zmApply(); else img.onload = zmApply;
  const pt = new Map(); let last = null, moved = 0, pinch = null;
  const rel = (e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  box.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = rel(e); zmAt(Math.exp(-e.deltaY * 0.0015), x, y); }, { passive: false });
  box.addEventListener('dblclick', (e) => { if (e.target.closest('.pzc')) return; const [x, y] = rel(e); if (ZM.s >= 6) { ZM.s = 1; ZM.x = ZM.y = 0; zmApply(); } else zmAt(2, x, y); });
  box.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.pzc')) return;
    pt.set(e.pointerId, rel(e)); moved = 0; last = rel(e);
    if (pt.size === 2) { const [a, b] = [...pt.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: ZM.s }; }
  });
  box.addEventListener('pointermove', (e) => {
    if (!pt.has(e.pointerId)) return;
    const p = rel(e); pt.set(e.pointerId, p);
    if (pt.size === 2 && pinch) { const [a, b] = [...pt.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zmAt(pinch.s * d / pinch.d / ZM.s, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); moved = 99; return; }
    const dx = p[0] - last[0], dy = p[1] - last[1]; last = p; moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4 && ZM.s > 1) { if (!box.hasPointerCapture(e.pointerId)) box.setPointerCapture(e.pointerId); box.classList.add('drag'); ZM.x += dx; ZM.y += dy; zmApply(); }
  });
  const end = (e) => { pt.delete(e.pointerId); if (pt.size < 2) pinch = null; if (!pt.size) { box.classList.remove('drag'); if (moved > 4) box.dataset.dragged = '1'; } };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('click', (e) => { if (box.dataset.dragged) { delete box.dataset.dragged; e.stopPropagation(); e.preventDefault(); } }, true);
  box.querySelector('.pzc').addEventListener('click', (e) => { const b = e.target.closest('[data-zm]'); if (!b) return; const W = box.clientWidth / 2, H = box.clientHeight / 2;
    if (b.dataset.zm === '0') { ZM.s = 1; ZM.x = ZM.y = 0; zmApply(); } else zmAt(b.dataset.zm === '+' ? 1.5 : 1 / 1.5, W, H); });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-as]'); if (!b || !B) return;
  const a = b.dataset.as, i = asCur();
  if (a === 'close') { AS.open = false; asSave(); toast('Assistent pausiert – unten rechts geht es weiter.'); }
  else if (a === 'next') AS.step = STEPS[Math.min(STEPS.length - 1, i + 1)].k;
  else if (a === 'prev') AS.step = STEPS[Math.max(0, i - 1)].k;
  else if (a === 'skip') { AS.skip = [...new Set([...AS.skip, STEPS[i].k])]; AS.step = (STEPS.slice(i + 1).find((x) => !x.done()) || STEPS[STEPS.length - 1]).k; }
  else if (a.startsWith('go:')) AS.step = a.slice(3);
  else if (a.startsWith('tab:')) { tab = a.slice(4); history.replaceState(null, '', '#' + tab); render(); }
  else if (a === 'pdf') $('#pdfIn').click();
  else if (a === 'okAll') { B.data.rooms.forEach((r) => { r.ok = true; }); changed(); }
  else if (a === 'kwok') { AS.kw = true; }
  else if (a === 'ans') $('#ansBtn').click();
  else if (a === 'ansok') { AS.ans = 'nein'; }
  else if (a === 'estimate') { tab = 'kosten'; history.replaceState(null, '', '#kosten'); runEstimate(); }
  else if (a === 'check') { tab = 'pruefung'; history.replaceState(null, '', '#pruefung'); render(); runCheck().then(assist); }
  else if (a === 'pdf-dlg') pdfDialog();
  asSave(); assist();
});
