'use strict';
/* =====================================================================
   Vorschlag für eine neue Leistung (Abschnitt, Gewerk, DIN, Bezug, Dauer, Vorgänger, Nachfolger) – NUR Textvergleich mit dem Katalog
   und DIN-Schlagworte, offline, ohne KI (22.11.2026, Mock „Leistungskatalog: Abhängigkeiten“ K6-A: der ✨-Knopf mit eigener KI-Einstellung
   am KI-Schieber vorbei ist weg). Benutzt beim Anlegen einer Leistung (library.js, Fenster „Neue Leistung“): belegt vor, änderbar.
   LeistungVorschlag.platz(text, cfg, abschnitt) → { ph, gw, din, sc, d, a, b, why, names }
   ===================================================================== */

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
function finish(r, items) {
  if (!r) return null;
  if (!r.craft && typeof CRAFT !== 'undefined') r.craft = CRAFT[r.gw] || '';
  r.names = Object.fromEntries([...r.a, ...r.b].map((id) => [id, (items.find((i) => i.id === id) || {}).n || id]));
  return r;
}
window.LeistungVorschlag = {
  platz(text, cfg, curPh) { const items = AssistCore.items(cfg || { type: 'frei' }); return finish(builtinPlace(String(text || ''), items, curPh), items); },
};
