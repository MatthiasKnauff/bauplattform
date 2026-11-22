'use strict';
/* =====================================================================
   Leistungskatalog – Ansicht „Abhängigkeiten“ (Mock „Leistungskatalog: Abhängigkeiten“ B, GO 22.11.2026: K1-A Leistung in der Mitte)
   Eine Leistung steht in der Mitte (Richtdauer, Art), links ihre Vorgänger, rechts ihre Nachfolger; Klick auf eine Kiste = in die Mitte.
   ＋ Vorgänger / ＋ Nachfolger (Suche) oder eine Leistung aus der Liste links auf eine Seite ziehen = neue Abhängigkeit; ✕ an der Kiste
   löst sie; Klick auf den Pfeil = Art (Ende → Anfang / Anfang → Anfang) und Abstand. Kreise lehnt die Ansicht ab.
   Werk-Leistungen schreiben die Abweichung des Büros (KatBuero), eigene Leistungen ihren Eintrag im Katalog (libUpd).
   Darunter die Probe: Gesamtbauzeit für ein Beispielgebäude (AssistCore.estimate) – vor dem Öffnen und jetzt.
   katNetzHtml(id) · katNetzKlick(e) · katNetzDrop(e) – von library.js aufgerufen (Umschalter „Liste | Abhängigkeiten“).
   ===================================================================== */
const KN = { id: null, probe: 'efh', basis: {} };
const KN_PROBE = { efh: ['Einfamilienhaus 160 m²', 'neubau_efh', { area: 160 }], mfh: ['Mehrfamilienhaus 6 WE', 'neubau_mfh', { area: 480, units: 6 }], san: ['Sanierung EFH', 'kern_efh', { area: 140 }] };
const knAlle = () => [...CATALOG.items.filter((i) => i.id !== 'start'), ...(window.LIBRARY || [])];
const knIt = (id) => knAlle().find((i) => i.id === id);
const knId = (a) => (Array.isArray(a) ? a[0] : a);
function knVor(id) {   // Vorgänger mit Art und Abstand; eigene Leistungen „Muss fertig sein vor“ zählen mit
  const it = knIt(id); if (!it) return [];
  const V = (it.a || []).map((a) => (Array.isArray(a) ? { id: a[0], t: a[1] || 'FS', lag: +a[2] || 0 } : { id: a, t: 'FS', lag: 0 }));
  (window.LIBRARY || []).forEach((x) => { if ((x.b || []).includes(id) && !V.some((v) => v.id === x.id)) V.push({ id: x.id, t: 'FS', lag: 0, b: true }); });
  return V.filter((v) => knIt(v.id));
}
function knNach(id) {
  const N = knAlle().filter((i) => (i.a || []).some((a) => knId(a) === id)).map((i) => ({ id: i.id, ...(knVor(i.id).find((v) => v.id === id) || {}) }));
  const it = knIt(id); (it && it.b || []).forEach((b) => { if (knIt(b) && !N.some((n) => n.id === b)) N.push({ id: b, t: 'FS', lag: 0, b: true }); });
  return N;
}
function knVorfahr(id, ziel, seen = new Set()) {   // liegt ziel vor id? (dann gäbe ein Pfeil id → ziel einen Kreis)
  if (id === ziel) return true; if (seen.has(id)) return false; seen.add(id);
  return knVor(id).some((v) => knVorfahr(v.id, ziel, seen));
}
function knSetzeA(id, A, text) {   // Vorgänger einer Leistung schreiben – Werk: Büro-Abweichung, eigene: Katalog
  if (KatBuero.istWerk(id)) return KatBuero.setzen(id, { a: A }, text);
  if (!libDarf()) return libNurAdmin();
  libText = text; libUpd(id, { a: A.map(knId) });
}
function knVerbinde(von, nach) {
  if (von === nach) return;
  if (knVorfahr(von, nach)) return toast(`„${knIt(von).n}“ hängt schon (über andere) an „${knIt(nach).n}“ – das gäbe einen Kreis.`, true);
  const it = knIt(nach); if ((it.a || []).some((a) => knId(a) === von)) return;
  knSetzeA(nach, [...(it.a || []), von], `${knIt(nach).n}: folgt auf ${knIt(von).n}`);
}
function knLoese(von, nach) {
  const it = knIt(nach), v = knVor(nach).find((x) => x.id === von); if (!it || !v) return;
  if (v.b) { if (!libDarf()) return libNurAdmin(); const x = knIt(von); libText = `${x.n}: nicht mehr vor ${it.n}`; return libUpd(von, { b: (x.b || []).filter((y) => y !== nach) }); }
  knSetzeA(nach, (it.a || []).filter((a) => knId(a) !== von), `${it.n}: folgt nicht mehr auf ${knIt(von).n}`);
}
function knProbe(key) {
  const [, type, mehr] = KN_PROBE[key]; if (!window.AssistCore) return null;
  try { const cfg = { ...AssistCore.defaults(type), ...mehr }; return AssistCore.estimate(cfg, AssistCore.recFor(cfg)).wd; } catch { return null; }
}
const knArt = (i) => (i.ms ? 'Meilenstein' : i.w ? 'Wartezeit' : i.fix ? 'feste Dauer' : i.gs ? 'je Geschoss' : 'wächst mit der Fläche');
const knPf = (v) => `${v.t === 'SS' ? 'Anfang → Anfang' : 'Ende → Anfang'}${v.lag ? ` ${v.lag > 0 ? '+' : ''}${v.lag} AT` : ''}`;
function knKiste(id, seite, v) {
  const i = knIt(id), ab = KatBuero.istWerk(id) && KatBuero.abw(id).length;
  return `<div class="kn-z"><button type="button" class="kn-pf${knIt(id).w ? ' w' : ''}" data-knpf="${seite}:${esc(id)}" title="Art und Abstand ändern">${esc(knPf(v))}</button>
    <div class="kn-k" data-knk="${esc(id)}" title="In die Mitte"><b>${esc(i.n)}</b><small>${esc(i.gw || '–')} · ${esc(knArt(i))}${i.ms ? '' : ` · ${i.d} AT`}${ab ? ' · <span class="kn-ab">Büro</span>' : ''}${KatBuero.istWerk(id) ? '' : ' · eigene'}</small>
    <button type="button" class="kn-x" data-knweg="${seite}:${esc(id)}" title="Abhängigkeit lösen" aria-label="Abhängigkeit lösen">✕</button></div></div>`;
}
function katNetzHtml(id) {
  KN.id = id && knIt(id) ? id : KN.id && knIt(KN.id) ? KN.id : (CATALOG.items.find((i) => i.id === 'estrich') || CATALOG.items[1]).id;
  const i = knIt(KN.id), werk = KatBuero.istWerk(KN.id), ab = werk ? KatBuero.abw(KN.id) : [], W = werk ? KatBuero.werk(KN.id) : null, darf = libDarf();
  if (KN.basis[KN.probe] == null) KN.basis[KN.probe] = knProbe(KN.probe);
  const jetzt = knProbe(KN.probe), vorher = KN.basis[KN.probe];
  const ph = CATALOG.phases.find((p) => p.k === i.ph), nachbar = knAlle().filter((x) => x.ph === i.ph && x.id !== KN.id);
  const ru = (f) => (ab.includes(f) ? ` <button type="button" class="kn-ru" data-knru="${f}" title="zurück auf Werk: ${esc(f === 'd' ? W.d + ' AT' : f === 'a' ? (W.a || []).map((a) => (knIt(knId(a)) || {}).n || knId(a)).join(', ') || '–' : knArt({ ...i, fix: W.fix, w: W.w }))}">↺</button>` : '');
  return `<div class="kn"><div class="kn-l"><b>${esc((ph && ph.n.split(' (')[0]) || '')}</b><small>auf eine Seite ziehen = Abhängigkeit</small>${nachbar.map((x) => `<div class="kn-li${x.id === KN.id ? ' on' : ''}" draggable="${darf}" data-knli="${esc(x.id)}">${esc(x.n)}</div>`).join('')}</div>
    <div class="kn-m"><div class="kn-sp" data-kndrop="vor"><div class="kn-h">Vorgänger</div>${knVor(KN.id).map((v) => knKiste(v.id, 'vor', v)).join('') || '<p class="mut">keine – beginnt mit dem Abschnitt</p>'}<button type="button" class="kn-add" data-knadd="vor">＋ Vorgänger …</button></div>
    <div class="kn-mitte"><div class="kn-mk"><b>${esc(i.n)}</b><small>${esc(i.gw || '–')} · ${esc((ph && ph.n.split(' (')[0]) || '')}${werk ? '' : ' · eigene Leistung'}</small>
      ${i.ms ? '<p class="mut">Meilenstein – ohne Dauer</p>' : `<label>Richtdauer <input type="number" min="0.5" max="999" step="0.5" value="${i.d}" data-knd class="${ab.includes('d') ? 'kn-gelb' : ''}"> AT${ru('d')}</label>
      <label>Art <select data-knart class="${ab.includes('fix') || ab.includes('w') ? 'kn-gelb' : ''}"${werk ? '' : ' disabled title="Art ändern geht bei Leistungen ab Werk"'}><option value="flaeche"${!i.fix && !i.w ? ' selected' : ''}>wächst mit der Fläche</option><option value="fix"${i.fix && !i.w ? ' selected' : ''}>feste Dauer</option><option value="w"${i.w ? ' selected' : ''}>Wartezeit – läuft in allen Einheiten zugleich</option></select>${ru('fix') || ru('w')}</label>
      <p class="mut">Richtdauer gilt für ein Einfamilienhaus mit 140 m²; mit „wächst mit der Fläche“ passt das Programm sie der Größe an.</p>`}
      ${ab.includes('a') ? `<p class="kn-gelb">Vorgänger vom Büro geändert${ru('a')}</p>` : ''}</div></div>
    <div class="kn-sp" data-kndrop="nach"><div class="kn-h">Nachfolger</div>${knNach(KN.id).map((v) => knKiste(v.id, 'nach', v)).join('') || '<p class="mut">keine</p>'}<button type="button" class="kn-add" data-knadd="nach">＋ Nachfolger …</button></div></div>
    <div class="kn-probe"><b>Probe</b><span class="kn-seg">${Object.entries(KN_PROBE).map(([k, [n]]) => `<button type="button" data-knprobe="${k}" class="${KN.probe === k ? 'on' : ''}">${esc(n)}</button>`).join('')}</span>
      <span>Gesamtbauzeit <b>${jetzt == null ? '–' : jetzt + ' AT'}</b>${vorher != null && jetzt != null && vorher !== jetzt ? ` <span class="${jetzt > vorher ? 'kn-mehr' : 'kn-weniger'}">(vorher ${vorher} AT, ${jetzt > vorher ? '+' : ''}${jetzt - vorher})</span>` : ''}</span></div></div>`;
}
function knAuswahl(anker, seite) {
  const ziel = KN.id, L = knAlle().filter((x) => x.id !== ziel && !x.ms).filter((x) => (seite === 'vor' ? !knVorfahr(x.id, ziel) && !knVor(ziel).some((v) => v.id === x.id) : !knVorfahr(ziel, x.id) && !knNach(ziel).some((v) => v.id === x.id)));
  pickMenu(anker, { search: 'Leistung suchen …', items: L.map((x) => ({ value: x.id, title: x.n, sub: `${x.gw || ''} · ${((CATALOG.phases.find((p) => p.k === x.ph) || {}).n || '').split(' (')[0]}` })),
    onPick: (v) => (seite === 'vor' ? knVerbinde(v, ziel) : knVerbinde(ziel, v)) });
}
async function knPfeil(anker, seite, id) {
  const [von, nach] = seite === 'vor' ? [id, KN.id] : [KN.id, id], v = knVor(nach).find((x) => x.id === von); if (!v) return;
  if (v.b) return toast('Diese Abhängigkeit kommt aus „Muss fertig sein vor“ der eigenen Leistung – dort ändern.');
  pickMenu(anker, { items: [{ value: 'FS', title: 'Ende → Anfang', sub: 'beginnt, wenn der Vorgänger fertig ist' }, { value: 'SS', title: 'Anfang → Anfang', sub: 'beginnt mit dem Vorgänger (mit Abstand)' }, { value: 'lag', title: `Abstand ändern … (jetzt ${v.lag} AT)` }],
    onPick: async (t) => {
      let lag = v.lag, typ = v.t;
      if (t === 'lag') { const e = await bpEingabe('Abstand in Arbeitstagen (negativ = Überlappung):', String(v.lag)); if (e == null) return; lag = Math.round(+String(e).replace(',', '.')) || 0; } else typ = t;
      const it = knIt(nach), A = (it.a || []).map((a) => (knId(a) === von ? (typ === 'FS' && !lag ? von : [von, typ, lag]) : a));
      if (!KatBuero.istWerk(nach) && (typ !== 'FS' || lag)) return toast('Art und Abstand gibt es bei Leistungen ab Werk; eigene Leistungen folgen mit Ende → Anfang.');
      knSetzeA(nach, A, `${it.n}: ${knPf({ t: typ, lag })} nach ${knIt(von).n}`);
    } });
}
function katNetzKlick(e) {
  const t = e.target.closest('[data-knk],[data-knweg],[data-knadd],[data-knpf],[data-knprobe],[data-knru],[data-knli]'); if (!t) return false;
  const d = t.dataset;
  if (d.knprobe) { KN.probe = d.knprobe; renderLib(); return true; }
  if (d.knk || d.knli) { KN.id = d.knk || d.knli; renderLib(); return true; }
  if (!libDarf()) { libNurAdmin(); return true; }
  if (d.knadd) { knAuswahl(t, d.knadd); return true; }
  if (d.knweg) { const [s, id] = d.knweg.split(':'); if (s === 'vor') knLoese(id, KN.id); else knLoese(KN.id, id); renderLib(); return true; }
  if (d.knpf) { const [s, id] = d.knpf.split(':'); knPfeil(t, s, id); return true; }
  if (d.knru) { KatBuero.zurueck(KN.id, d.knru === 'w' ? 'w' : d.knru); if (d.knru === 'fix' || d.knru === 'w') KatBuero.zurueck(KN.id, d.knru === 'w' ? 'fix' : 'w'); renderLib(); return true; }
  return false;
}
function katNetzAendern(e) {
  if (!e.target.closest('.kn')) return false;
  if (!libDarf()) { libNurAdmin(); renderLib(); return true; }
  const id = KN.id, i = knIt(id);
  if (e.target.matches('[data-knd]')) { const v = Math.max(0.5, Math.min(999, Math.round((+String(e.target.value).replace(',', '.') || 1) * 2) / 2));
    if (KatBuero.istWerk(id)) KatBuero.setzen(id, { d: v }, `${i.n}: Richtdauer ${v} AT`); else { libText = `${i.n}: Dauer ${v} AT`; libUpd(id, { d: v }); } renderLib(); return true; }
  if (e.target.matches('[data-knart]')) { const a = e.target.value; KatBuero.setzen(id, { fix: a !== 'flaeche', w: a === 'w' }, `${i.n}: ${a === 'w' ? 'Wartezeit' : a === 'fix' ? 'feste Dauer' : 'wächst mit der Fläche'}`); renderLib(); return true; }
  return false;
}
document.addEventListener('dragstart', (e) => { const l = e.target.closest && e.target.closest('[data-knli]'); if (l) { e.dataTransfer.setData('text/kn', l.dataset.knli); e.dataTransfer.effectAllowed = 'link'; } });
document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('[data-kndrop]') && [...(e.dataTransfer.types || [])].includes('text/kn')) e.preventDefault(); });
document.addEventListener('drop', (e) => {
  const z = e.target.closest && e.target.closest('[data-kndrop]'); const id = e.dataTransfer && e.dataTransfer.getData('text/kn'); if (!z || !id) return;
  e.preventDefault(); if (!libDarf()) return libNurAdmin();
  if (z.dataset.kndrop === 'vor') knVerbinde(id, KN.id); else knVerbinde(KN.id, id); renderLib();
});
