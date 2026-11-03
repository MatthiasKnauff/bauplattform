'use strict';
/* =====================================================================
   Positionsvorschlag für neue Leistungen
   - eingebaut: Textähnlichkeit zu den vorhandenen Leistungen + DIN-Schlagworte (offline)
   - KI: Claude über den eigenen Server (/api/ai/place); der API-Schlüssel bleibt auf dem Server
   Einstellung (Aus / Eingebaut / KI) und Zugangsdaten: Programmeinstellungen.
   ===================================================================== */
window.AI_SETTINGS = { mode: 'builtin', model: 'claude-haiku-5-5', models: {}, hasKey: false, keyHint: '' };
async function loadAiSettings() {
  try { const s = await fetch('/api/settings').then(j); if (s && s.ai) window.AI_SETTINGS = s.ai; } catch { /* Standard bleibt */ }
  if (window.AssistCore) AssistCore.notifySoon();
  if (!$('#libView').hidden && typeof renderLib === 'function') renderLib();
}

const AI_STOP = new Set(['und', 'oder', 'der', 'die', 'das', 'den', 'dem', 'des', 'für', 'mit', 'von', 'vom', 'zum', 'zur', 'inkl', 'bzw', 'nach', 'vor', 'aus', 'bei', 'ein', 'eine', 'einer', 'neu', 'neue', 'neuer', 'herstellen', 'einbauen', 'montieren', 'montage', 'arbeiten', 'liefern', 'erstellen', 'anbringen', 'setzen', 'verlegen']);
const aiTok = (s) => String(s || '').toLowerCase().replace(/[^a-zäöüß0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !AI_STOP.has(w));
const aiStem = (w) => w.replace(/(ungen|ung|en|er|e|n|s)$/, '');
function aiSim(a, b) {   // gleiche Wortstämme; bei zusammengesetzten Wörtern nur ganze Teilwörter (Keller|fenster, Dach|rinne)
  let sc = 0;
  for (const t of a) for (const u of b) {
    if (t === u) { sc += t.length + 2; continue; }
    const ts = aiStem(t), us = aiStem(u);
    if (ts.length >= 4 && ts === us) { sc += ts.length + 1; continue; }
    if (us.length >= 5 && (t.startsWith(us) || t.endsWith(us) || t.endsWith(u))) { sc += us.length * 0.8; continue; }
    if (ts.length >= 5 && (u.startsWith(ts) || u.endsWith(ts) || u.endsWith(t))) { sc += ts.length * 0.8; continue; }
  }
  return sc / Math.sqrt(Math.max(1, b.length));
}
// typische Begriffe → Bezugsleistung (danach eingeplant), Gewerk
const AI_ANCHOR = [
  [/fliesenspiegel|fliesen/, 'fliesen', 'Fliesen', '18352'], [/haustür|hauseingangstür|außentür|nebeneingangstür|kellertür außen/, 'fenster_neu', 'Fenster', '18355'],
  [/kellerdecke.*dämm|dämm.*kellerdecke|kellerdeckendämm/, 'wdvs', 'Dämmung', '18421'], [/oberste geschossdecke.*dämm|dämm.*oberste geschossdecke|dachbodendämm/, 'dach_daemm', 'Dach', '18338'],
  [/rauchwarn|rauchmelder|rwm/, 'el_fein', 'Elektro', '18382'], [/wallbox|ladestation|ladesäule/, 'el_fein', 'Elektro', '18382'], [/smart.?home|netzwerk|datenleitung|sat.?anlage|antenne/, 'el_roh', 'Elektro', '18382'],
  [/brandschutzklapp|lüftungsklapp|brandschutzmanschett|schott/, 'lueft', 'Lüftung', '18379'], [/brandschutz.*(tür|tor)|rauchschutztür/, 'tischler', 'Tischler', '18355'], [/brandschutz.*(bekleid|wand|decke)|f30|f90/, 'trocken', 'Trockenbau', '18340'],
  [/lichtschacht|kellerfenster/, 'keller', 'Rohbau', '18330'], [/dachrinne|regenrinne|fallrohr|rinnenheiz/, 'klempner', 'Klempner', '18339'], [/schneefang|laufrost|sicherheitshaken/, 'dach_deck', 'Dach', '18338'],
  [/kamin|ofen|schornstein/, 'schornstein', 'Rohbau', '18330'], [/aufzug|lift/, 'aufzug', 'Aufzug', '18385'], [/klimaanlage|klimagerät|split/, 'hz_fein', 'Heizung', '18380'],
  [/zisterne|regenwasser|versickerung|rigole/, 'aussenanl', 'Außenanlagen', '18318'], [/hecke|rasen|bepflanz|baum/, 'garten', 'Außenanlagen', '18320'], [/mülltonne|müllbox|fahrradständer/, 'aussenanl', 'Außenanlagen', '18318'],
  [/tapete|tapezier/, 'spachtel_wd', 'Maler', '18366'], [/lack|türen streichen|heizkörper streichen/, 'maler', 'Maler', '18363'], [/vorhang|gardine|rollo innen|jalousie innen/, 'maler', 'Raumausstatter', '18366'],
  [/estrich.*schleif|grundier/, 'estr_tr', 'Bodenbelag', '18365'], [/teppich|vinyl|linoleum|pvc/, 'boden_vorb', 'Bodenbelag', '18365'], [/naturstein|marmor|granit/, 'fliesen', 'Naturstein', '18332'],
  [/glasarbeit|glaswand|duschwand|ganzglas|spiegelwand/, 'fliesen', 'Glaser', '18361'], [/schließanlage|schliesszylinder|zylinder/, 'tischler', 'Tischler', '18355'], [/endreinigung|feinreinigung|grobreinigung/, 'reinig', 'Reinigung', '18451'],
  [/baustrom|bauwasser|bauzaun|container|toilette/, 'be', 'Bauleitung', ''], [/abnahme|übergabe|dokumentation/, 'reinig', 'Bauleitung', ''], [/blower|luftdicht|thermograf/, 'trocken', 'Bauleitung', ''],
];
function builtinPlace(text, items, curPh) {
  const tk = aiTok(text), din = (AssistCore.dinSuggest(text) || [])[0] || null;
  const cand = items.filter((i) => !i.ms && i.id !== 'start');
  const low = String(text).toLowerCase(), anc = AI_ANCHOR.find(([re, id]) => re.test(low) && cand.some((i) => i.id === id));
  if (anc) {
    const it = cand.find((i) => i.id === anc[1]), k = items.indexOf(it);
    const succ = items.slice(k + 1).find((y) => AssistCore.effA(y.id, { type: 'frei' }).includes(it.id));
    return { ph: it.ph, gw: anc[2], din: anc[3], sc: it.sc, d: 1, a: [it.id], b: succ ? [succ.id] : [], why: `Fachbegriff erkannt – nach „${it.n}“ eingeplant${succ ? `, vor „${succ.n}“` : ''}`, src: 'eingebaut' };
  }
  let best = null, bs = 0;
  for (const it of cand) {
    let sc = aiSim(tk, aiTok(it.n));
    if (din && it.gw === din.gw) sc += 3;
    if (curPh && it.ph === curPh) sc += 0.8;
    if (sc > bs) { bs = sc; best = it; }
  }
  if (!best || bs < 2) {   // nichts Ähnliches: ans Ende des gewählten bzw. passenden Abschnitts
    const ph = curPh || (din && (cand.find((i) => i.gw === din.gw) || {}).ph) || 'ausbau';
    const inPh = cand.filter((i) => i.ph === ph); best = inPh[inPh.length - 1] || cand[cand.length - 1];
    if (!best) return null;
    return { ph, gw: din ? din.gw : '', din: din ? din.din : '', sc: best.sc, d: 2, a: [best.id], b: [], why: `keine ähnliche Leistung gefunden – ans Ende von „${(CATALOG.phases.find((p) => p.k === ph) || {}).n || ph}“`, src: 'eingebaut' };
  }
  const k = items.indexOf(best);
  const succ = items.slice(k + 1).find((y) => AssistCore.effA(y.id, { type: 'frei' }).includes(best.id) || (y.a || []).some((x) => (Array.isArray(x) ? x[0] : x) === best.id));
  const gw = din && din.gw !== best.gw && bs < 6 ? din.gw : best.gw;
  return { ph: best.ph, gw, din: gw === best.gw ? best.din || '' : din.din, sc: best.sc, d: Math.max(1, Math.round(best.d || 2)), a: [best.id], b: succ ? [succ.id] : [],
    why: `ähnlich wie „${best.n}“ – danach eingeplant${succ ? `, vor „${succ.n}“` : ''}`, src: 'eingebaut' };
}
async function aiServerPlace(text, items, cfg, curPh, phases) {
  phases = phases || CATALOG.phases.map((p) => ({ k: p.k, n: p.n }));
  const r = await fetch('/api/ai/place', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ph: curPh || '', type: (cfg && cfg.type) || '', phases, items: items.filter((i) => !i.ms).map((i) => ({ id: i.id, n: i.n, ph: i.ph, gw: i.gw })) }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.statusText);
  const ids = new Set(items.map((i) => i.id)), phs = new Set(phases.map((p) => p.k));
  const clean = (l) => (Array.isArray(l) ? l : [l]).map(String).filter((x) => ids.has(x)).slice(0, 2);
  return { ph: phs.has(d.ph) ? d.ph : curPh || phases[0].k, gw: String(d.gw || '').slice(0, 80), din: String(d.din || '').replace(/^din\s*/i, '').slice(0, 40), sc: d.sc === 'bau' ? 'bau' : 'we',
    d: Math.max(1, Math.min(999, Math.round(+d.d) || 2)), a: clean(d.a), b: clean(d.b), craft: String(d.craft || '').slice(0, 80), why: String(d.why || '').slice(0, 300), src: 'KI · ' + (d.model || '') };
}
const AI_CACHE = new Map();
const aiAvail = () => (window.AI_SETTINGS.mode === 'off' ? [] : window.AI_SETTINGS.mode === 'ai' && window.AI_SETTINGS.hasKey ? ['builtin', 'ai'] : ['builtin']);
function finish(r, items) {
  if (!r) throw new Error('Kein Vorschlag möglich');
  if (!r.craft && typeof CRAFT !== 'undefined') r.craft = CRAFT[r.gw] || '';
  r.names = Object.fromEntries([...r.a, ...r.b].map((id) => [id, (items.find((i) => i.id === id) || {}).n || id]));
  return r;
}
window.AiPlace = {
  enabled: () => window.AI_SETTINGS.mode !== 'off',
  variants: aiAvail,
  preferred: () => (aiAvail().includes('ai') ? 'ai' : 'builtin'),
  label: () => (window.AI_SETTINGS.mode === 'ai' && window.AI_SETTINGS.hasKey ? '✨ KI-Vorschlag' : '✨ Position vorschlagen'),
  /* Vorschlag im Katalog-Zusammenhang (Assistent, Leistungskatalog).
     kind: 'builtin' | 'ai' | undefined (= bevorzugt, bei KI-Fehler eingebaut); force: neu suchen statt Zwischenspeicher */
  async suggest(text, cfg, curPh, kind, force) {
    cfg = cfg || { type: 'frei' };
    const items = AssistCore.items(cfg);
    const k = kind || this.preferred(), key = [k, text.trim().toLowerCase(), cfg.type || '', curPh || '', CATALOG.phases.length, (window.LIBRARY || []).length].join('|');
    if (!force && AI_CACHE.has(key)) return AI_CACHE.get(key);
    let r;
    if (k === 'ai') {
      try { r = await aiServerPlace(text, items, cfg, curPh); }
      catch (e) { if (kind) throw e; r = builtinPlace(text, items, curPh); if (r) r.why = 'KI nicht erreichbar (' + e.message + ') – eingebauter Vorschlag: ' + r.why; }
    } else r = builtinPlace(text, items, curPh);
    r = finish(r, items); AI_CACHE.set(key, r); return r;
  },
  /* Vorschlag für eine Leistung im geöffneten Plan: Gewerk, Dauer, Vorgänger und Nachfolger aus den Leistungen des Plans */
  async suggestInPlan(i, text, kind, force) {
    const t = P.tasks[i], items = [], phases = [], stack = [];
    P.tasks.forEach((x, k) => {
      const lvl = x.lvl || 0; stack.length = lvl;
      const sum = k + 1 < P.tasks.length && (P.tasks[k + 1].lvl || 0) > lvl;
      if (sum) { stack[lvl] = 'g' + x.uid; if (!phases.some((p) => p.k === 'g' + x.uid)) phases.push({ k: 'g' + x.uid, n: x.name }); return; }
      if (k === i || isAncestor(k, i) || isAncestor(i, k)) return;
      items.push({ id: 'u' + x.uid, n: x.name, gw: x.gw || '', ph: stack.filter(Boolean).slice(-1)[0] || 'g0', d: x.dur, sc: 'we', a: (x.preds || []).map((p) => 'u' + p.uid) });
    });
    if (!phases.length) phases.push({ k: 'g0', n: 'Projekt' });
    const key = ['plan', kind, P.id, t.uid, text.trim().toLowerCase(), P.tasks.length].join('|');
    if (!force && AI_CACHE.has(key)) return AI_CACHE.get(key);
    let r;
    if (kind === 'ai') r = await aiServerPlace(text, items, P.assist || { type: '' }, '', phases);
    else {
      const tk = aiTok(text), din = (AssistCore.dinSuggest(text) || [])[0] || null;
      let best = null, bs = 0;
      for (const it of items) { let sc = aiSim(tk, aiTok(it.n)); if (din && it.gw === din.gw) sc += 3; if (sc > bs) { bs = sc; best = it; } }
      if (!best || bs < 2) { r = { gw: din ? din.gw : '', din: din ? din.din : '', d: t.dur || 1, a: [], b: [], why: din ? 'Gewerk nach DIN-Schlagwort, keine ähnliche Leistung im Plan' : 'keine ähnliche Leistung im Plan gefunden' }; }
      else {
        const succ = items.find((y) => y.a.includes(best.id));
        r = { gw: din && din.gw !== best.gw && bs < 6 ? din.gw : best.gw, din: '', d: Math.max(1, best.d || 1), a: [best.id], b: succ ? [succ.id] : [], why: `ähnlich wie „${best.n}“ – danach eingeplant${succ ? `, vor „${succ.n}“` : ''}` };
      }
      r.src = 'eingebaut';
    }
    r = finish(r, items); AI_CACHE.set(key, r); return r;
  },
};

/* ---------- Umschalter „Eigene | Eingebaut | KI“ ----------
   Klick: Variante anzeigen (beim ersten Mal wird gesucht), Doppelklick: neu suchen.
   st = { cur, own, res: { builtin, ai }, busy, err } */
const SG_NAMES = { own: 'Eigene', builtin: 'Eingebaut', ai: 'KI' };   // dazu ggf. vorn: src = Original (Standardkatalog / Kopiervorlage)
window.SugBar = {
  html(st, cls = '') {
    const v = [...(st.srcVals ? ['src'] : []), 'own', ...aiAvail()];
    const r = st.cur !== 'own' && st.res[st.cur], why = st.busy ? (st.busy === 'ai' ? 'KI denkt nach …' : 'suche …') : st.err ? '✖ ' + st.err : r ? r.why : 'deine eigenen Angaben';
    return `<div class="sg-bar ${cls}"><span class="sg-l">✨ Vorschlag</span><span class="sg-seg">${v.map((k) => `<button type="button" data-sgv="${k}" class="${st.cur === k ? 'on' : ''}${st.res[k] ? ' has' : ''}${st.busy === k ? ' busy' : ''}" title="${k === 'own' ? 'eigene Angaben wiederherstellen' : k === 'src' ? 'Werte des Originals übernehmen' : 'Klick: anzeigen · Doppelklick: neu suchen'}">${k === 'src' ? esc(st.srcLabel) : SG_NAMES[k]}</button>`).join('')}</span><span class="sg-why${st.err ? ' err' : ''}">${esc(why || '')}</span></div>`;
  },
  // o = { text(): Bezeichnung, fetch(kind, force) → Promise, apply(werte | null = eigene), snap() → eigene Werte, redraw() }
  click(e, st, o) {
    const b = e.target.closest('[data-sgv]'); if (!b) return false;
    e.preventDefault();
    const v = b.dataset.sgv;
    clearTimeout(st.timer);
    if (e.detail >= 2) this.run(st, v, true, o); else st.timer = setTimeout(() => this.run(st, v, false, o), 230);
    return true;
  },
  async run(st, v, force, o) {
    st.err = '';
    const txt = String(o.text() || '').trim();
    if (txt !== st.text) { st.res = st.res.src ? { src: st.res.src } : {}; st.text = txt; }   // Bezeichnung geändert: alte Vorschläge verwerfen
    if (v === 'own') { if (st.cur !== 'own') { st.cur = 'own'; o.apply(null); } o.redraw(); return; }
    if (v === 'src') { if (st.cur === 'own' && o.snap) st.own = o.snap(); st.res.src = st.srcVals; st.cur = 'src'; o.apply(st.srcVals); o.redraw(); return; }
    if (txt.length < 3) { st.err = 'Bitte zuerst eine Bezeichnung eingeben.'; o.redraw(); return; }
    if (st.cur === 'own' && o.snap) st.own = o.snap();
    if (!force && st.res[v]) { st.cur = v; o.apply(st.res[v]); o.redraw(); return; }
    st.busy = v; o.redraw();
    try { const r = await o.fetch(v, force); st.res[v] = r; st.cur = v; o.apply(r); } catch (err) { st.err = err.message; }
    st.busy = null; o.redraw();
  },
  state: (own) => ({ cur: 'own', own, res: {}, busy: null, err: '', timer: null, text: '' }),
};

/* ---------- Einstellungen (Teil des Dialogs „Programmeinstellungen“) ---------- */
function aiSettingsHtml() {
  const S = window.AI_SETTINGS, M = S.models && Object.keys(S.models).length ? S.models : { 'claude-haiku-5-5': 'Claude Haiku 5.5', 'claude-sonnet-5-5': 'Claude Sonnet 5.5' };
  const r = (v, l, h) => `<label class="cb ai-r"><input type="radio" name="aimode" value="${v}"${S.mode === v ? ' checked' : ''}> <span><b>${l}</b><small>${h}</small></span></label>`;
  return `<div class="sec">Positionsvorschlag für neue Leistungen</div>
    <div class="ai-modes">${r('builtin', 'Eingebaut (ohne KI)', 'Vergleicht die Bezeichnung mit vorhandenen Leistungen und DIN-Schlagworten – offline, kostenlos.')}
      ${r('ai', 'KI (Claude)', 'Fragt Claude über deinen Server – versteht Fachbegriffe und Sonderfälle. Bei Fehlern greift der eingebaute Vorschlag.')}
      ${r('off', 'Aus', 'Kein Vorschlags-Knopf.')}</div>
    <div class="form ai-form" style="grid-template-columns:auto 1fr;margin-top:8px">
      <label>API-Schlüssel</label><div class="colrow"><input id="aiKey" type="password" autocomplete="off" placeholder="${S.hasKey ? 'hinterlegt (' + esc(S.keyHint) + ')' + (S.fromEnv ? ' aus docker-compose' : '') + ' – zum Ändern neu eingeben' : 'sk-ant-… (von console.anthropic.com)'}">${S.hasKey && !S.fromEnv ? '<button type="button" class="btn sm" id="aiKeyDel">Entfernen</button>' : ''}</div>
      <label>Modell</label><select id="aiModel">${Object.entries(M).map(([k, n]) => `<option value="${k}"${S.model === k ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <label></label><div class="colrow"><button type="button" class="btn sm" id="aiTest">Verbindung testen</button><span id="aiTestRes" class="hint" style="margin:0"></span></div>
    </div>
    <div class="hint">Der Schlüssel wird nur auf dem Server gespeichert (Datenordner, nicht im Browser) und gilt für alle Nutzer dieser Installation. An die KI gehen nur Leistungsbezeichnungen, Gewerke und Abschnitte – keine Firmen oder Kontaktdaten. Kosten entstehen je Anfrage über dein Anthropic-Konto.</div>`;
}
function aiSettingsWire(bg) {
  let clearKey = false;
  const del = bg.querySelector('#aiKeyDel'); if (del) del.onclick = () => { clearKey = true; del.textContent = 'wird entfernt'; del.disabled = true; bg.querySelector('#aiKey').placeholder = 'kein Schlüssel'; };
  bg.querySelector('#aiTest').onclick = async () => {
    const out = bg.querySelector('#aiTestRes'); out.textContent = 'teste …'; out.style.color = '';
    try {
      const r = await fetch('/api/ai/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: bg.querySelector('#aiKey').value, model: bg.querySelector('#aiModel').value }) });
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || r.statusText);
      out.textContent = '✔ Verbindung in Ordnung (' + d.model + ')'; out.style.color = '#2e7d32';
    } catch (e) { out.textContent = '✖ ' + e.message; out.style.color = '#c62828'; }
  };
  return async () => {
    const mode = (bg.querySelector('input[name="aimode"]:checked') || {}).value || 'builtin';
    const body = { ai: { mode, model: bg.querySelector('#aiModel').value, key: bg.querySelector('#aiKey').value, clearKey } };
    try {
      const s = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(j);
      window.AI_SETTINGS = s.ai;
      if (mode === 'ai' && !s.ai.hasKey) toast('KI gewählt, aber kein API-Schlüssel hinterlegt – bis dahin gilt der eingebaute Vorschlag.', true);
    } catch (e) { toast('Einstellungen nicht gespeichert: ' + e.message, true); }
    if (window.AssistCore) AssistCore.notifySoon();
    if (!$('#libView').hidden && typeof renderLib === 'function') renderLib();
  };
}

loadAiSettings();
