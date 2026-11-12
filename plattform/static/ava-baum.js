/* Ausschreibung (AVA) – Projektbaum links, LV als PDF/Scan daneben.
   Teil der Seite ava.html: die Dateien ava-*.js werden dort in fester Reihenfolge geladen und teilen sich ihre Namen
   (ein Programm, auf mehrere Dateien verteilt – vorher ein einziges Skript in ava.html). */
/* ---------- Projektbaum links (LV, Angebote, Aufmaßprüfung, Rechnungen) ---------- */
const PJTABS = new Set(['lv', 'angebote', 'aufmass', 'rechnungen']);   // Projektbaum links in der Navigation unter dem gewählten Bereich
let PJX = new Set(LS.get('pjx', [])), PJXG = LS.get('pjx', null) !== null, PJZU = LS.get('pjzu', false), PJF = null;   // PJXG: schon einmal selbst auf-/zugeklappt – dann auch alle zu erlaubt
/* Unter dem gewählten Bereich links: der Projektbaum (LVs mit Bietern bzw. Rechnungen) und der passende „＋ Neu“-Knopf */
let NSU = null;   // Suchfeld der Navigation (#nsuche)
function navUnter(k) {
  const nb = { lv: ['new', '＋ Neues LV', !pid], angebote: ['bieter', '＋ Bieter', !L], auftraege: ['auftrag', '＋ Neuer Auftrag', !pid], aufmass: ['reNeu', '＋ Neue Rechnung', !pid], rechnungen: ['reNeu', '＋ Neue Rechnung', !pid] }[k];   // ohne vergebenes LV: „Rechnung ohne LV / Auftrag“
  const baum = '';   // die LVs stehen im Tabellenfeld; die Fenster- & Türliste gilt für das ganze Projekt und braucht keinen LV-Baum
  return baum || nb ? `<div class="nav-u">${baum}${nb ? `<button type="button" class="nneu" data-uhaupt="${nb[0]}"${nb[2] ? ' disabled' : ''}>${nb[1]}</button>` : ''}</div>` : '';
}
function pjBaum() {
  const xs = LIST.filter((x) => !x.archived && !((tab === 'lv' || tab === 'angebote') && ohneLv(x)) && !(tab === 'lv' && lvWeg(x))
    && !((tab === 'aufmass' || tab === 'rechnungen') && !(x.vergeben || x.frei || (L && L.id === x.id))));   // Abrechnung: nur Aufträge
  const e0 = (v) => (v ? eur(v).replace(' €', '') : '');
  if (L && !PJX.size && !PJXG) PJX.add(L.id);
  const out = [];
  if (!xs.length) out.push('<p class="hint" style="padding:.3rem .5rem">Noch kein LV.</p>');
  // Rechnungen ohne LV / Auftrag: eigene Gruppe ganz oben, darunter je Firma
  const oa = xs.filter((x) => x.ohne_auftrag);
  if (oa.length) { const nOA = xs.length; xs.splice(0, nOA, ...oa, ...xs.filter((x) => !x.ohne_auftrag));
    out.push(`<div class="pj-r oa-g" title="Rechnungen ohne LV / Auftrag – je Firma"><span class="car" data-oazu>${OAZU ? '▸' : '▾'}</span>${IC.lv}<span class="t"><b>Ohne LV / Auftrag</b></span><span class="v">${e0(oa.reduce((a, x) => a + (x.abgerechnet || 0), 0))}</span></div>`); }
  xs.forEach((x) => {
    if (x.ohne_auftrag && OAZU) { if (L && L.id === x.id) out.push('\u0001'); return; }
    // je Bereich: Ausschreibung nur die LVs, Vergabe mit Bietern, Prüfung und Abrechnung mit Rechnungen
    const re = tab === 'aufmass' || tab === 'rechnungen', kids = re ? x.rechnungen : tab === 'angebote' ? [...x.angebote].sort((a, b) => (a.rang || 99) - (b.rang || 99)) : [];
    const on = L && L.id === x.id, offen = PJX.has(x.id);
    const wert = x.auftrag || x.min_angebot || x.schaetzung;
    const sub = tab === 'lv' ? '' : x.aufgehoben ? '⏸ Beauftragung aufgehoben' : x.vergeben ? (ohneLv(x) ? 'ohne LV' : lvWeg(x) ? 'LV gelöscht' : '') : x.status === 'nicht_vergeben' ? '' : x.angebote.length ? `${x.angebote.length} Angebot${x.angebote.length === 1 ? '' : 'e'}` : `${x.n_pos} Pos.`;   // „vergeben“ steht nirgends mehr unter dem Namen (Firma oben in der Mitte); im Leistungsverzeichnis einzeilig
    const haupt = false;   // Baum links neben dem Inhalt: LVs ohne Unterpunkte bekommen keinen Pfeil (nur Bieter bzw. Rechnungen klappen auf)
    out.push(`<div class="pj-r lv${x.ohne_auftrag ? ' oa' : ''}${on && !(PJF && PJF.sub) && !PJSEL ? ' on' : ''}${on ? ' akt' : ''}" data-pjlv="${x.id}" title="${esc([x.nr, x.name].filter(Boolean).join(' '))}"><span class="car" ${kids.length ? `data-pjcar="${x.id}"` : on && haupt ? 'data-lvzu' : ''}>${kids.length ? (offen ? '▾' : '▸') : haupt ? (on && !LVXZU ? '▾' : '▸') : ''}</span>${IC.lv}<span class="t">${x.ohne_auftrag ? `${esc(x.auftragnehmer || x.name)}${x.kg ? ` <small class="mu">KG ${esc(x.kg)}</small>` : ''}` : esc([x.nr, x.name].filter(Boolean).join(' '))}${sub && !x.ohne_auftrag ? `<small>${esc(sub)}</small>` : ''}</span><span class="v">${e0(x.ohne_auftrag ? x.abgerechnet : wert)}</span><button type="button" class="pj-del" data-pjdel="lv" title="Ganzes LV in den Papierkorb (mit Angeboten, Aufmaß und Rechnungen)">🗑</button></div>`);
    if (!offen) { if (on) out.push('\u0001'); return; }
    kids.forEach((k) => {
      const key = (re ? 'r' : 'b') + k.id, sel = on && PJSEL === key;
      const txt = !re ? `${k.rang ? k.rang + '. ' : ''}${esc(k.bieter)}${x.angebot_id === k.id ? ' <span class="ok">✓</span>' : ''}`
        : `${esc(reTitel(k, x.id))} <span class="${k.status === 'geprueft' ? 'ok' : 'offen'}" title="${k.status === 'geprueft' ? 'geprüft' : 'offen'}">${k.status === 'geprueft' ? '✓' : '●'}</span>`;   // Rechnungsnummer steht rechts in der Karte – im Baum einzeilig
      out.push(`<div class="pj-r k${x.ohne_auftrag ? ' oa' : ''}${sel ? ' on' : ''}${re && x.aufgehoben ? ' deakt-k' : ''}" data-pjlv="${x.id}" data-pjsub="${key}"><span class="car"></span>${re ? IC.ti : IC.pos}<span class="t">${txt}</span><span class="v">${e0(re ? k.zahlung : k.netto)}</span><button type="button" class="pj-del" data-pjdel="${re ? 're' : 'ang'}" title="${re ? 'Diese Rechnung' : 'Dieses Angebot'} in den Papierkorb – mit Rückgängig">🗑</button></div>`);
    });
    if (on) out.push('\u0001');
  });
  return out.join('');
}
let PJSEL = null, LVXZU = LS.get('lvxzu', false), LVXHOCH = false, OAZU = LS.get('oazu', false);
document.addEventListener('click', (e) => { const c = e.target.closest && e.target.closest('[data-oazu]'); if (!c) return; e.stopPropagation(); OAZU = !OAZU; LS.set('oazu', OAZU); pjZeichnen(); });
/* LVs im Tabellenfeld (Leistungsverzeichnis, Angebote, Aufmaß, Rechnungen): Zeilen vor dem geöffneten LV, dessen Inhalt, Zeilen danach */
function pjTeile() { const h = pjBaum(), i = h.indexOf('\u0001'); return i < 0 ? [h, ''] : [h.slice(0, i), h.slice(i + 1)]; }
/* Oberste Ebene des Projektbaums (wie in Aufträge): das Projekt mit Zahl der LVs und Summe; Pfeil klappt alle LVs zu/auf */
function pjWurzel() {
  const xs = LIST.filter((x) => !x.archived && !((tab === 'lv' || tab === 'angebote') && ohneLv(x)) && !(tab === 'lv' && lvWeg(x)) && !((tab === 'aufmass' || tab === 'rechnungen') && !(x.vergeben || x.frei)));
  const sum = xs.reduce((a, x) => a + (x.auftrag || x.min_angebot || x.schaetzung || 0), 0);
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || 'Projekt';
  return `<div class="pj-r root" title="${esc(pn)} · ${xs.length} LV${xs.length === 1 ? '' : 's'}"><span class="car" data-pjzu title="${PJZU ? 'LVs aufklappen' : 'alle LVs zuklappen'}">${PJZU ? '▸' : '▾'}</span>${IC.proj}<span class="t">${esc(pn)}</span><span class="v">${sum ? eur(sum).replace(' €', '') : ''}</span></div>`;
}
const pjBaumMitWurzel = () => pjWurzel() + (PJZU ? '' : pjBaum().replace('\u0001', ''));
/* Baum: Rollposition behalten; die gewählte Rechnung bzw. das gewählte Angebot nur so weit ins Bild rollen wie nötig */
function pjImBlick(top, glatt) {
  const t = document.getElementById('pjTree'); if (!t) return;
  if (top != null) t.scrollTop = top;
  const a = t.querySelector('.pj-r.k.on') || t.querySelector('.pj-r.lv.on, .pj-r.lv.akt'); if (!a) return;
  const oben = 4;
  const r = a.getBoundingClientRect(), b = t.getBoundingClientRect();
  if (r.top < b.top + oben) t.scrollBy({ top: r.top - b.top - oben - 6, behavior: glatt ? 'smooth' : 'auto' });
  else if (r.bottom > b.bottom - 4) t.scrollBy({ top: r.bottom - b.bottom + 10, behavior: glatt ? 'smooth' : 'auto' });
}
function pjZeichnen() {
  if (tab === 'aufmass' && !document.getElementById('pjTree')) { render(); return; }
  if (tab === 'tueren' || PJTABS.has(tab)) { const t = document.getElementById('pjTree'); if (t) { const top = t.scrollTop; t.innerHTML = pjBaumMitWurzel(); pjImBlick(top); } return; }
  const a = document.querySelector('.pjtree[data-teil="a"]'), b = document.querySelector('.pjtree[data-teil="b"]'); if (!a || !b) return;
  const [x, y] = pjTeile(); a.innerHTML = lvxKopf() + x; b.innerHTML = y;
}
function lvxKopf() {
  const xs = LIST.filter((x) => !x.archived && !((tab === 'lv' || tab === 'angebote') && ohneLv(x)) && !(tab === 'lv' && lvWeg(x)));
  const sum = xs.reduce((a, x) => a + (x.auftrag || x.min_angebot || x.schaetzung || 0), 0);
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || 'Projekt';
  return `<div class="pj-r root lvx-root"><span class="car">▾</span>${IC.lv}<span class="t">${esc(pn)}<small>${xs.length} LV${xs.length === 1 ? '' : 's'}</small></span><span class="v">${sum ? eur(sum).replace(' €', '') : ''}</span></div>`;
}
function re2Html(inhalt) {
  if (tab === 'rechnungen') { RETEIL = inhalt == null ? '<div class="card empty"><p class="hint">Links einen Auftrag oder eine Rechnung wählen.</p></div>' : inhalt;   // wie Aufträge und Angebote: Baum links, rechts der abdockbare Bereich
    return `<div class="ang-sp re-sp"><div class="ang-l"><div class="ang-kopf"><span>Bezeichnung</span><span>Zahlbetrag</span></div><aside class="re2-baum pjtree ang-baum" id="pjTree">${pjBaumMitWurzel()}</aside></div></div>`; }
  if (tab === 'angebote') return `<div class="ang-sp"><div class="ang-l"><div class="ang-kopf"><span>Bezeichnung</span><span>Summe</span></div><aside class="re2-baum pjtree ang-baum" id="pjTree">${pjBaumMitWurzel()}</aside></div></div>`;   // wie Aufträge: Baum links, rechts der abdockbare Bereich mit dem Preisspiegel
  if (tab === 'aufmass' && L && amAns !== 'baum' && inhalt != null && inhalt.includes('am-baum')) return `<div class="re2 re2-ein"><div class="re2-ed">${inhalt}</div></div>`;   // Aufmaß erfassen: die LVs und Rechnungen stehen im Baum der Tabelle
  if (tab === 'lv') return `<div class="re2 re2-ein"><div class="re2-ed">${inhalt == null ? lvNurOrdner() : inhalt}</div></div>`;   // LV: die LVs stehen als Ordner in der Tabelle (wie bei den Aufträgen) – kein eigener Baum daneben
  return `<div class="re2" data-bph-trenn="ava.re2" data-bph-trenn-min="200" data-bph-trenn-max="0.45"><aside class="re2-baum pjtree" id="pjTree">${pjBaumMitWurzel()}</aside><div class="re2-ed">${inhalt == null ? '<div class="card empty"><p>Links ein LV oder eine Rechnung wählen.</p></div>' : inhalt}</div></div>`;
}
function angSeite() {   // Angebote & Preisspiegel: Bereich rechts (seite.js) – Preisspiegel des gewählten LV, Vergabe
  const sp = document.querySelector('#view .ang-sp'); if (!sp) return;
  const leer = '<div class="card empty"><p class="hint">Links ein LV wählen – hier steht dann sein Preisspiegel.</p></div>';
  seite(sp, 'ang', [{ id: 'ps', titel: 'Preisspiegel', mount: (el) => { el.innerHTML = `<div class="sr-pad re2-ed">${L ? vAngebote('ps') : leer}</div>`; } },
    { id: 'vg', titel: 'Vergabe', mount: (el) => { el.innerHTML = `<div class="sr-pad re2-ed">${(L && vAngebote('kopf').trim()) || '<div class="card empty"><p class="hint">Noch nicht vergeben. Im Preisspiegel unter dem Bieter „Vergeben …“ wählen.</p></div>'}</div>`; } }],
    { start: 'ps', w: 0.3, wechsel: () => { uLeisteNeu(); requestAnimationFrame(randUnten); } });
}
function lvNurOrdner() {   // noch kein LV geöffnet: nur die Ordner zeigen
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || '';
  return `<div class="tblw"><table class="lv baum bp-baum"><thead><tr><th style="min-width:18rem">Bezeichnung</th><th class="r">Summe</th></tr></thead><tbody><tr class="wurzel${LVAKT === '__pj' ? ' akt' : ''}" data-pjwurzel>${bpBaum.zelle({ tiefe: 0, auf: true, icon: IC.proj, html: `<b>${esc(pn)}</b>` })}<td></td></tr>
    ${LIST.filter((x) => !x.archived && !ohneLv(x)).map((x) => `<tr class="wurzel lvz zu" data-lvopen="${x.id}" title="Öffnen">${bpBaum.zelle({ tiefe: 1, auf: false, icon: IC.lv, html: `<b>${esc(x.nr)} ${esc(x.name)}</b><span class="hint" style="margin-left:.5rem">${esc([x.gewerk, (STATUS.find((st) => st[0] === x.status) || [, ''])[1], x.auftragnehmer].filter(Boolean).join(' · '))}</span>` })}<td class="r">${x.auftrag ? eur(x.auftrag) : x.schaetzung ? eur(x.schaetzung) : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
function lvxHtml(inhalt) {
  const [a, b] = pjTeile();
  const sp = { lv: 'Stand', angebote: 'Bieter', aufmass: 'Auftragnehmer', rechnungen: 'Auftragnehmer' }[tab] || '';
  return `<div class="lvx"><div class="lvx-h"><span></span><span>Bezeichnung</span><span>${sp}</span><span class="r">EUR</span></div>
    <div class="pjtree" data-teil="a">${lvxKopf()}${a}</div>${inhalt != null && !LVXZU ? `<div class="lvx-akt">${inhalt}</div>` : ''}<div class="pjtree" data-teil="b">${b}</div></div>`;
}
/* Umbenennen im Baum: zweiter Klick auf die gewählte Zeile, F2 oder rechte Maustaste → „Umbenennen“ */
function pjUmbenennen(r) {
  const id = +r.dataset.pjlv, sub = r.dataset.pjsub || '', x = LIST.find((y) => y.id === id); if (!x) return;
  const t = r.querySelector('.t'); if (!t || t.querySelector('input')) return;
  let alt, ziel;
  if (!sub) { alt = [x.nr, x.name].filter(Boolean).join(' '); ziel = 'lv'; }
  else if (sub[0] === 'b') { const k = x.angebote.find((y) => 'b' + y.id === sub); if (!k) return; alt = k.bieter; ziel = 'ang'; }
  else { const k = x.rechnungen.find((y) => 'r' + y.id === sub); if (!k) return; alt = k.re_nr || ''; ziel = 're'; }
  const html0 = t.innerHTML;
  t.innerHTML = `<input class="pj-ren" value="${esc(alt)}" placeholder="${ziel === 're' ? 'Rechnungsnummer der Firma' : ziel === 'lv' ? 'Nr. und Bezeichnung, z. B. 03 Rohbau' : 'Bieter'}" aria-label="Neuer Name">`;
  const i = t.querySelector('input'); i.focus(); i.select();
  let fertig = false, gw = null;
  if (ziel === 'lv') {   // Gewerke aus den Kontakten vorschlagen – die Nummer davor bleibt
    const G = [...new Set([...(KONT || []).map((k) => k.trade), ...LIST.map((y) => y.gewerk)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
    const box = document.createElement('div'); box.className = 'pj-gw'; box.hidden = true; document.body.appendChild(box); let akt = -1, tr = [];   // am Körper: der Baum schneidet sonst ab
    i.addEventListener('blur', () => setTimeout(() => box.remove(), 150));
    const teil = () => { const m = /^(\d[\w.-]{0,8})\s*(.*)$/.exec(i.value); return m ? [m[1], m[2]] : ['', i.value]; };
    const zeig = () => { const q = teil()[1].trim().toLowerCase(); tr = q ? G.filter((g) => g.toLowerCase().includes(q) && g.toLowerCase() !== q).slice(0, 8) : [];
      akt = -1; box.hidden = !tr.length; box.innerHTML = tr.map((g, k) => `<div data-gwk="${k}">${esc(g)}</div>`).join(''); const r = i.getBoundingClientRect(); Object.assign(box.style, { left: r.left + 'px', top: r.bottom + 3 + 'px', width: Math.max(r.width, 200) + 'px' }); };
    const nimm = (k) => { const [nr] = teil(); gw = tr[k]; i.value = (nr ? nr + ' ' : '') + gw; box.hidden = true; i.focus(); };
    i.addEventListener('input', zeig);
    i.addEventListener('keydown', (e) => { if (box.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); akt = Math.max(0, Math.min(tr.length - 1, akt + (e.key === 'ArrowDown' ? 1 : -1))); box.querySelectorAll('[data-gwk]').forEach((d) => d.classList.toggle('on', +d.dataset.gwk === akt)); }
      else if (e.key === 'Enter' && akt >= 0) { e.preventDefault(); e.stopImmediatePropagation(); nimm(akt); } else if (e.key === 'Escape') { e.stopImmediatePropagation(); box.hidden = true; } });
    box.addEventListener('mousedown', (e) => { const d = e.target.closest('[data-gwk]'); if (d) { e.preventDefault(); nimm(+d.dataset.gwk); } });
  }
  const ende = async (ok) => {
    if (fertig) return; fertig = true;
    const v = i.value.trim(); if (!ok || !v || v === alt) { t.innerHTML = html0; return; }
    try {
      if (ziel === 'lv') { const m = /^(\d[\w.-]{0,8})\s+(.+)$/.exec(v); const neu = m ? { nr: m[1], name: m[2] } : { name: v }; if (gw && !x.gewerk) neu.gewerk = gw; const vorher = { nr: x.nr, name: x.name, ...(neu.gewerk ? { gewerk: x.gewerk || '' } : {}) }; await lvSetzen(id, neu); rueckgaengig(`LV umbenannt in „${v}“`, () => lvSetzen(id, vorher)); }
      else if (ziel === 'ang') { await api('api/angebote/' + sub.slice(1), 'PUT', { bieter: v }); if (L && L.id === id) L = await api('api/lv/' + id); await refreshList(); render(); rueckgaengig(`Angebot umbenannt in „${v}“`, async () => { await api('api/angebote/' + sub.slice(1), 'PUT', { bieter: alt }); if (L && L.id === id) L = await api('api/lv/' + id); await refreshList(); render(); }); }
      else { await call('api/rechnungen/' + sub.slice(1), 'PUT', { re_nr: v }); }
    } catch (er) { toast(er.message, true); t.innerHTML = html0; }
  };
  i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ende(true); } if (e.key === 'Escape') { e.preventDefault(); ende(false); } e.stopPropagation(); });
  i.addEventListener('blur', () => ende(true));
  i.addEventListener('click', (e) => e.stopPropagation());
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'F2' || e.target.closest('input,textarea,select')) return;
  const r = document.querySelector('.pjtree .pj-r.k.on') || document.querySelector('.pjtree .pj-r.lv.akt'); if (r) { e.preventDefault(); pjUmbenennen(r); }
});
/* Kontextmenü: Einträge, die ein LV erst öffnen (Rechnung anlegen, Nachtrag erfassen, Bereich wechseln) */
async function kmLv(lvId, fn) { if (!L || L.id !== lvId) { await flush(); await openLv(lvId); } return fn(); }
function kmLvPunkte(P, lvId) {
  const x = LIST.find((y) => y.id === lvId); if (!x) return;
  if (x.vergeben && !x.aufgehoben) {
    const schluss = (x.rechnungen || []).some((q) => q.art === 'schluss');
    RE_ARTEN_NEU.forEach(([v, t]) => { if (schluss && !['regie', 'sicherheit'].includes(v)) return; if (v === 'nachtrag') return;
      P.push({ text: `Neue ${t}`, fn: () => kmLv(lvId, () => { if (!['aufmass', 'rechnungen'].includes(tab)) { tab = 'rechnungen'; LS.set('tab', tab); render(); } reNeuStart(v, null); }) }); });
    P.push({ text: 'Nachtrag erfassen …', fn: () => ntDialog(lvId) });
    P.push({ text: 'Nachtragsangebot der Firma einlesen …', fn: () => ntAngebot(lvId) });
  }
  if (x.ohne_auftrag) P.push({ text: 'In einen Auftrag umwandeln', fn: async () => { await api('api/lv/' + lvId, 'PUT', { vergabe: { ohne_auftrag: false } }); await refreshList(); if (L && L.id === lvId) L = await api('api/lv/' + lvId); render();
    rueckgaengig(`„${x.auftragnehmer}“ ist jetzt ein Auftrag`, async () => { await api('api/lv/' + lvId, 'PUT', { vergabe: { ohne_auftrag: true } }); await refreshList(); render(); }); } });
  const ziele = [['lv', 'Leistungsverzeichnis'], ['angebote', 'Angebote & Preisspiegel'], ...(x.vergeben ? [['aufmass', 'Aufmaßprüfung'], ['rechnungen', 'Rechnungen']] : []), ['auftraege', 'Aufträge']].filter(([t]) => t !== tab);
  ziele.forEach(([t, n]) => P.push({ text: `Öffnen in ${n}`, fn: () => kmLv(lvId, () => { tab = t; LS.set('tab', tab); if (t === 'auftraege') { EXP.add('l' + lvId); TSEL = 'l' + lvId; } render(); }) }));
}
document.addEventListener('bph:kontext', (e) => {   // rechte Maustaste im Baum
  const r = e.detail.ziel.closest && e.detail.ziel.closest('.pjtree [data-pjlv]'); if (!r) return;
  if (!r.dataset.pjsub) kmLvPunkte(e.detail.punkte, +r.dataset.pjlv);
  else if (r.dataset.pjsub[0] === 'r') {   // Rechnung: Prüfung abschließen / zurücknehmen
    const lvId = +r.dataset.pjlv, rid = +r.dataset.pjsub.slice(1), x = LIST.find((y) => y.id === lvId), q = x && (x.rechnungen || []).find((z) => z.id === rid);
    if (q) e.detail.punkte.push(q.status === 'geprueft'
      ? { text: 'Prüfung zurücknehmen', fn: () => kmLv(lvId, () => call('api/rechnungen/' + rid, 'PUT', { status: 'offen' })) }
      : { text: 'Prüfung abschließen', fn: () => kmLv(lvId, async () => { await call('api/rechnungen/' + rid, 'PUT', { status: 'geprueft' }); rueckgaengig('Prüfung abgeschlossen – der Aufmaßstand ist festgehalten', () => call('api/rechnungen/' + rid, 'PUT', { status: 'offen' })); }) });
  }
  e.detail.punkte.push({ text: r.dataset.pjsub && r.dataset.pjsub[0] === 'r' ? 'Rechnungsnummer ändern' : 'Umbenennen', k: 'F2', fn: () => { if (!r.classList.contains(r.dataset.pjsub ? 'on' : 'akt')) r.click(); setTimeout(() => { const n = document.querySelector(`.pjtree [data-pjlv="${r.dataset.pjlv}"]${r.dataset.pjsub ? `[data-pjsub="${r.dataset.pjsub}"]` : ':not([data-pjsub])'}`); if (n) pjUmbenennen(n); }, 400); } });
  if (!r.dataset.pjsub) e.detail.punkte.push({ text: 'LV- & Auftragsdaten …', fn: async () => { if (!L || L.id !== +r.dataset.pjlv) { await flush(); await openLv(+r.dataset.pjlv); } lvDaten(); } });
  if (r.dataset.pjsub && r.dataset.pjsub[0] === 'b') e.detail.punkte.push({ text: 'Angaben zum Angebot …', fn: () => angebotDaten(+r.dataset.pjsub.slice(1)) });
  if (r.dataset.pjsub) {   // nur dieses Angebot / diese Rechnung löschen (nicht das LV)
    const sub = r.dataset.pjsub, lvId = +r.dataset.pjlv;
    e.detail.punkte.push({ text: sub[0] === 'r' ? 'Diese Rechnung löschen …' : 'Dieses Angebot löschen …', gefahr: true, fn: async () => {
      if (!L || L.id !== lvId) { await flush(); await openLv(lvId); }
      PJSEL = sub; $('#moreBtn').onclick();
    } });
  }
});
/* Element sichtbar machen – nur wenn es nicht schon zu sehen ist, ohne Gleiten und nur so weit wie nötig (sonst rutscht die Ansicht bei jedem Klick).
   Waagerecht im eigenen Feld (links zählen festgehaltene Spalten nicht als frei), senkrecht im eigenen Feld, sonst die Seite; nurX: nicht senkrecht rollen */
function inFeldZeigen(el, nurX) {
  const r = el.getBoundingClientRect();
  const feld = (achse) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll)/.test(achse === 'x' ? cs.overflowX : cs.overflowY) && (achse === 'x' ? p.scrollWidth > p.clientWidth : p.scrollHeight > p.clientHeight)) return p; } return null; };
  const d = (a0, a1, b0, b1) => (a0 < b0 ? a0 - b0 : a1 > b1 ? Math.min(a1 - b1, a0 - b0) : 0);
  const fx = feld('x');
  if (fx) { const q = fx.getBoundingClientRect(), links = [...el.parentElement.children].filter((c) => c !== el && getComputedStyle(c).position === 'sticky' && c.getBoundingClientRect().right <= r.left + 1).reduce((m, c) => Math.max(m, c.getBoundingClientRect().right), q.left);
    const dx = d(r.left, r.right, links, q.right); if (dx) fx.scrollLeft += dx; }
  const fy = feld('y');
  if (fy) { const q = fy.getBoundingClientRect(), dy = d(r.top, r.bottom, q.top + 30, q.bottom - 10); if (dy && !nurX) fy.scrollTop += dy; }
  else if (!nurX) { const dy = d(r.top, r.bottom, 120, innerHeight - 20); if (dy) scrollBy(0, dy); }
  if (scrollX) scrollTo({ left: 0 });   // die Seite selbst nie seitlich verschoben lassen
}
function pjFokus() {
  const F = PJF; PJF = null; if (!F || !F.sub) return;
  const id = +F.sub.slice(1); let el = null;
  if (tab === 'angebote') { const i = document.querySelector(`th input[data-aid="${id}"]`); el = i && i.closest('th'); if (el) inFeldZeigen(el, true); }
  else if (tab === 'rechnungen') { el = document.querySelector(`.card[data-reid="${id}"]`); if (el) inFeldZeigen(el); }
  else if (tab === 'aufmass') { el = document.querySelector(`tr[data-amr="r${id}"]`); if (el) inFeldZeigen(el); }
  if (el) { el.classList.add('pj-blink'); setTimeout(() => el.classList.remove('pj-blink'), 1600); }
}
/* Doppelklick auf einen Namen im Projektbaum: gleich umbenennen (wie im Explorer; zweiter Klick auf die gewählte Zeile geht weiterhin) */
/* Löschen direkt im Baum: Rechnung/Angebot mit Rückgängig, ganzes LV mit kurzer Nachfrage – alles landet im Papierkorb */
document.addEventListener('click', async (e) => {
  const d = e.target.closest && e.target.closest('.pjtree [data-pjdel]'); if (!d) return;
  e.preventDefault(); e.stopPropagation();
  const r = d.closest('[data-pjlv]'), lvId = +r.dataset.pjlv, sub = r.dataset.pjsub || '', x = LIST.find((y) => y.id === lvId); if (!x) return;
  if (d.dataset.pjdel === 'lv') return lvWegFragen(lvId);
  if (!L || L.id !== lvId) { await flush(); await openLv(lvId); }
  if (d.dataset.pjdel === 're') {
    const rid = +sub.slice(1);   // ob spätere Rechnungen darauf aufbauen, prüft der Server (Meldung mit Grund)
    return reLoeschen(rid);
  }
  return angLoeschen(+sub.slice(1));
}, true);
/* Umbenennen im Baum wie im Explorer: zweiter, langsamer Klick auf den Namen des schon gewählten Eintrags. Ein Doppelklick benennt nicht um. */
let pjKlick = null;
document.addEventListener('pointerdown', (e) => {
  const r = e.target.closest && e.target.closest('.pjtree [data-pjlv]');
  const sel = r && `.pjtree [data-pjlv="${r.dataset.pjlv}"]` + (r.dataset.pjsub ? `[data-pjsub="${r.dataset.pjsub}"]` : ':not([data-pjsub])'), jetzt = Date.now();
  const ok = r && e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.target.closest('.t') && !e.target.closest('input') && r.classList.contains(r.dataset.pjsub ? 'on' : 'akt');
  const vorher = window._pjLetzter;   // voriger Klick auf denselben, schon gewählten Eintrag (langsam: 0,45–5 s)
  pjKlick = ok && vorher && vorher.sel === sel && jetzt - vorher.t > 450 && jetzt - vorher.t < 5000 ? { sel, t: jetzt } : null;
  window._pjLetzter = ok ? { sel, t: jetzt } : r ? { sel, t: jetzt } : null;
}, true);
document.addEventListener('click', (e) => {
  if (!pjKlick || !e.target.closest || !e.target.closest('.pjtree')) return;
  if (e.detail > 1) { clearTimeout(pjKlick.tm); pjKlick = null; return; }
  const k = pjKlick; clearTimeout(k.tm);
  k.tm = setTimeout(() => { if (pjKlick !== k) return; pjKlick = null; const r = document.querySelector(k.sel); if (r && !r.querySelector('input') && r.classList.contains(r.dataset.pjsub ? 'on' : 'akt')) pjUmbenennen(r); }, 550);
});
document.addEventListener('dblclick', () => { if (pjKlick) { clearTimeout(pjKlick.tm); pjKlick = null; } }, true);
document.addEventListener('click', async (e) => {
  if (!e.target.closest('.pjtree')) return;
  if (e.target.closest('[data-pjzu]')) { e.stopPropagation(); PJZU = !PJZU; LS.set('pjzu', PJZU); pjZeichnen(); return; }
  const c = e.target.closest('[data-pjcar]'); if (c) { const id = +c.dataset.pjcar; if (PJX.has(id)) PJX.delete(id); else { PJX.clear(); PJX.add(id); } LS.set('pjx', [...PJX].slice(-100)); PJXG = true; pjZeichnen(); return; }   // immer nur ein LV aufgeklappt – die anderen klappen zu
  const z = e.target.closest('[data-lvzu]'); if (z) { LVXZU = !LVXZU; LS.set('lvxzu', LVXZU); render(); return; }
  const r = e.target.closest('[data-pjlv]'); if (!r) return;
  if (e.target.closest('.t') && r.classList.contains(r.dataset.pjsub ? 'on' : 'akt') && !e.target.closest('input')) return;   // Klick auf die schon gewählte Zeile: nichts neu laden (langsamer zweiter Klick benennt um, s. o.)
  const id = +r.dataset.pjlv, sub = r.dataset.pjsub || null, x0 = LIST.find((y) => y.id === id);
  if (!L || L.id !== id) { LVXZU = false; LS.set('lvxzu', false); LVXHOCH = true; }   // anderes LV gewählt: dessen Inhalt aufgeklappt zeigen und nach oben holen
  // passenden Bereich wählen: Angebot → Angebote, Rechnung → Rechnungen (oder Aufmaß), LV in Aufträgen/Kosten/Türliste → LV bzw. Rechnungen
  const t0 = tab;
  if (sub && sub[0] === 'b' && tab !== 'angebote') tab = 'angebote';
  else if (sub && sub[0] === 'r' && !['aufmass', 'rechnungen'].includes(tab)) tab = 'rechnungen';
  else if (!sub && !PJTABS.has(tab)) tab = x0 && x0.vergeben ? 'rechnungen' : 'lv';
  else if (!sub && x0 && !x0.vergeben && ['aufmass', 'rechnungen'].includes(tab)) tab = x0.angebote.length ? 'angebote' : 'lv';
  if (tab !== t0) LS.set('tab', tab);
  PJSEL = sub; PJF = { lv: id, sub }; PJX.clear(); PJX.add(id); LS.set('pjx', [...PJX].slice(-100));
  if (tab === 'aufmass' && sub) { const x = LIST.find((y) => y.id === id); amAns = 'erfassen'; (x ? x.rechnungen : []).forEach((q) => { AMX['r' + q.id] = 'r' + q.id === sub; }); AMX.rlive = false; LS.set('amx', AMX); }
  if (!L || L.id !== id) { await flush(); await openLv(id); } else render();
});
/* Einfache Ansicht „Alle LVs“ (Bereich alle, nur in „Einfach“): Tafel mit vier Spalten wie die Ablaufleiste – Ausschreibung,
   Vergabe, Abrechnung, nicht vergeben. Je LV eine kleine Karte; ein Hinweis nur, wenn etwas zu tun ist. Klick öffnet das LV. */
let EIN_F = 'alle';
const EIN_MEHR = new Set();
function einKarten() {
  const A = LIST.filter((x) => !x.archived);
  return A.map((x) => {
    const offen = !x.vergeben && !x.frei && x.status !== 'nicht_vergeben';
    const sp = x.vergeben || x.frei ? 'ab' : x.status === 'nicht_vergeben' ? 'nv' : x.n_angebote > 0 ? 've' : 'au';
    const auf = x.auftrag || 0, ab = x.abgerechnet || 0, proz = auf ? Math.round(ab / auf * 100) : 0;
    const roff = (x.rechnungen || []).filter((r) => r.status !== 'geprueft').length;
    let tun = '', t = 'lv';
    if (sp === 'au') { tun = x.n_pos ? 'LV verschicken' : 'Positionen eintragen'; t = 'lv'; }
    else if (sp === 've') { tun = 'Preisspiegel & vergeben'; t = 'angebote'; }
    else if (sp === 'ab') { tun = roff ? `${roff} Rechnung${roff === 1 ? '' : 'en'} zu prüfen` : ''; t = roff ? 'aufmass' : 'rechnungen'; }
    else t = x.n_angebote ? 'angebote' : 'lv';
    const ueber = sp === 'ab' && auf > 0 && ab > auf * 1.0001, leer = sp === 'ab' ? !auf && !ab : !x.n_pos && !x.n_angebote;
    return { x, sp, offen, auf, ab, proz, roff, tun, t, ueber, leer, fertig: sp === 'ab' && x.status === 'abgerechnet' && !roff };
  });
}
function vAlle() {
  const K = einKarten(), eu = (v) => Math.round(v || 0).toLocaleString('de-DE') + ' €';
  const nTun = K.filter((k) => k.tun).length, nUe = K.filter((k) => k.ueber).length;
  if (EIN_F === 'tun' && !nTun) EIN_F = 'alle'; if (EIN_F === 'ueber' && !nUe) EIN_F = 'alle';
  const F = K.filter((k) => EIN_F === 'alle' || (EIN_F === 'tun' ? k.tun : k.ueber));
  const gw = (x) => { const g = (x.gewerk || '').trim(); return g && g.toLowerCase() !== (x.name || '').trim().toLowerCase() ? g : ''; };
  const karte = (k) => { const x = k.x;
    let z1 = '', wert = '', unten = '';
    if (k.sp === 'ab') { z1 = x.auftragnehmer || (x.frei ? 'ohne LV' : ''); wert = k.ab ? eu(k.ab) : '–';
      unten = `<span class="ek-bar${k.ueber ? ' r' : ''}"><i style="width:${Math.min(100, k.proz)}%"></i></span><span class="ek-z">${k.ueber ? `<span class="ek-t r" title="Mehr abgerechnet als beauftragt">${k.proz} % vom Auftrag</span>` : k.fertig ? '<span class="ek-t ok">abgeschlossen</span>' : `<span>${k.auf ? k.proz + ' % abgerechnet' : ''}</span>`}<span>${k.auf ? 'Auftrag ' + eu(k.auf) : ''}</span></span>`; }
    else if (k.sp === 've' || (k.sp === 'nv' && x.n_angebote)) { z1 = `${x.n_angebote} Angebot${x.n_angebote === 1 ? '' : 'e'}`; wert = 'ab ' + eu(x.min_angebot); }
    else { z1 = `${x.n_pos || 0} Position${x.n_pos === 1 ? '' : 'en'}`; wert = x.schaetzung ? 'Schätzung ' + eu(x.schaetzung) : ''; }
    return `<button type="button" class="ek${k.ueber ? ' r' : ''}${k.leer ? ' leer' : ''}${L && L.id === x.id ? ' on' : ''}" data-einlv="${x.id}" data-eintab="${k.t}" title="${esc(`LV ${x.nr || ''} ${x.name}`)} öffnen">
      <span class="ek-k"><i>${esc(x.nr || '·')}</i><b>${esc(x.name)}</b></span>${gw(x) ? `<small class="ek-g">${esc(gw(x))}</small>` : ''}
      <span class="ek-z"><span>${esc(z1)}</span><b>${wert}</b></span>${unten}${k.tun ? `<span class="ek-n">${esc(k.tun)} ›</span>` : ''}</button>`; };
  const SP = [['au', 'Ausschreibung'], ['ve', 'Vergabe'], ['ab', 'Abrechnung'], ['nv', 'Nicht vergeben']];
  const ord = (a, b) => (!!b.tun - !!a.tun) || (a.leer - b.leer) || String(a.x.nr || '').localeCompare(String(b.x.nr || ''), 'de', { numeric: true });
  const spalte = ([k, n]) => { const L2 = F.filter((y) => y.sp === k).sort(ord), max = 8, auf = EIN_MEHR.has(k) || L2.length <= max + 2;
    const zeig = auf ? L2 : L2.slice(0, max);
    return `<section class="ek-sp ek-${k}"><h4>${n}<span>${L2.length}</span></h4>${zeig.map(karte).join('') || '<p class="ek-leer">–</p>'}${L2.length > max + 2 ? `<button type="button" class="ek-mehr" data-einmehr="${k}">${auf ? 'weniger zeigen ▴' : `… ${L2.length - max} weitere ▾`}</button>` : ''}</section>`; };
  const chip = (k, t, n) => `<button type="button" class="ek-chip${EIN_F === k ? ' on' : ''}" data-einf="${k}"${n || k === 'alle' ? '' : ' disabled'}>${t} <b>${n}</b></button>`;
  return `<div class="ekb"><div class="ek-top"><span class="ek-f" role="group" aria-label="Filter">${chip('alle', 'Alle', K.length)}${chip('tun', 'Zu tun', nTun)}${chip('ueber', 'Über Auftrag', nUe)}</span><button type="button" class="btn pri" data-einneu>＋ Neues LV</button></div>
    ${K.length ? `<div class="ek-tafel">${SP.map(spalte).join('')}</div>` : '<div class="card empty"><p>Noch kein LV in diesem Projekt.</p></div>'}</div>`;
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest) return;
  if (e.target.closest('[data-einneu]')) { newDialog(); return; }
  const f = e.target.closest('[data-einf]'); if (f) { EIN_F = f.dataset.einf; render(); return; }
  const m = e.target.closest('[data-einmehr]'); if (m) { const k = m.dataset.einmehr; if (EIN_MEHR.has(k)) EIN_MEHR.delete(k); else EIN_MEHR.add(k); render(); return; }
  const k = e.target.closest('[data-einlv]'); if (!k) return;
  await flush(); tab = k.dataset.eintab; LS.set('tab', tab); await openLv(+k.dataset.einlv);
});
let RKEY = '', RZURUECK = null;   // Rollposition nach dem Neuzeichnen: gleich setzen (kein Bild mit falscher Lage), im nächsten Bild noch einmal
/* Fokus über das Neuzeichnen retten: wer gerade in einem Feld tippt (z. B. Enter → nächste Aufmaßzeile, während die vorige noch speichert),
   bleibt in diesem Feld – sonst landet die nächste Eingabe im Nichts */
let FOKUS_WEG = null;   // Feld, das gerade verlassen wird (sein „change“ speichert und zeichnet neu) – dorthin nicht zurück
document.addEventListener('change', (e) => { FOKUS_WEG = e.target; setTimeout(() => { FOKUS_WEG = null; }, 0); }, true);
function fokusMerken() {
  const a = document.activeElement; if (!a || !a.matches || !a.matches('input,textarea,select') || a === FOKUS_WEG) return null;
  const d = a.dataset, k = ['am', 'amNew', 'id', 're', 'ang', 'aid', 'pid', 'f', 'k'].filter((x) => d[x] != null).map((x) => `[data-${x.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${CSS.escape(d[x])}"]`).join('');
  return k ? { sel: a.tagName.toLowerCase() + k, s: a.selectionStart, e: a.selectionEnd, v: a.value } : null;
}
function fokusZurueck(F) {
  if (!F || (document.activeElement && document.activeElement !== document.body)) return;
  const n = document.querySelector(F.sel); if (!n) return;
  n.focus({ preventScroll: true }); if (n.value !== F.v && F.v != null && n.tagName !== 'SELECT') n.value = F.v;   // schon Getipptes nicht verlieren
  try { if (F.s != null) n.setSelectionRange(F.s, F.e); } catch { /* egal */ }
}
/* ✎ im Kopf der Spalten, in die man tippen kann (Variante C) – aus den Zellen abgelesen, gilt für jede Tabelle der Ansicht */
function edSpalten() {
  document.querySelectorAll('#view table:is(.lv,.ps,.au-t,.am)').forEach((t) => { const h = t.tHead && t.tHead.rows[0]; if (!h) return;
    const n = h.cells.length, fld = 'input:not([type=checkbox]):not([type=hidden]),select,textarea', ed = new Set([...h.cells].flatMap((c, i) => (c.hasAttribute('data-ed') ? [i] : [])));   // data-ed: Spalte ist eingebbar, auch wenn das Feld erst beim Anklicken erscheint
    const R = [...t.tBodies].flatMap((b) => [...b.rows]).filter((r) => r.cells.length === n && !r.classList.contains('wurzel'));
    for (const r of R) for (let i = 0; i < n; i++) if (!ed.has(i) && r.cells[i].querySelector(fld)) ed.add(i);
    if (!ed.size) return;
    [...h.cells].forEach((c, i) => c.classList.toggle('bp-ed', ed.has(i)));
    for (const r of R) for (let i = 0; i < n; i++) { r.cells[i].classList.toggle('ed', ed.has(i)); r.cells[i].classList.toggle('ro', !ed.has(i) && !!r.cells[i].textContent.trim()); } });
}
function render() {
  { const F = fokusMerken(); if (F) setTimeout(() => fokusZurueck(F), 0); }
  { const k = tab + '|' + (L ? L.id : ''), zurueck = k === RKEY ? bpBaum.rolle($('#view')) : null; RKEY = k; RZURUECK = zurueck; if (zurueck) requestAnimationFrame(zurueck); }   // gleiche Ansicht neu gezeichnet (z. B. aufgeklappt): Rollposition bleibt
  setTimeout(seiteAufraeumen, 0);   // freie Fenster eines Bereichs, der nicht mehr zu sehen ist, schließen
  if (typeof MOB !== 'undefined' && MOB) setTimeout(MOB.zeichnen, 0);
  if (typeof histUi === 'function') setTimeout(histUi, 0);
  setTimeout(spaltenGriffe, 0);
  if (tab !== 'lv' && $('#lvSel')) $('#lvSel').hidden = true;
  selBtn(); kpis();
  const PL = LIST.filter((x) => !x.archived), RE = PL.flatMap((x) => x.rechnungen || []);   // Zahlen fürs ganze Projekt
  const NZT = { lv: 'LVs im Projekt', angebote: 'Angebote im Projekt', auftraege: 'vergebene LVs (Aufträge) im Projekt', aufmass: 'Rechnungen in Prüfung im Projekt', rechnungen: 'Rechnungen im Projekt', tueren: 'Türen in der Türliste' };
  const n = { lv: PL.filter((x) => !ohneLv(x) && !lvWeg(x)).length, angebote: PL.reduce((a, x) => a + (x.n_angebote || 0), 0), auftraege: PL.filter((x) => x.vergeben || x.frei).length,
    aufmass: RE.filter((r) => r.status !== 'geprueft').length, rechnungen: RE.length, tueren: TL && TL.pid === pid ? TL.tueren.length : 0 };
  const bk = window.BPHead && BPHead.conf && (BPHead.conf.apps || []).find((a) => a.key === 'baukosten' && a.allowed);
  const sk = schrittVon(tab)[0]; LS.set('tab:' + sk, tab);
  $('#stp').innerHTML = SCHRITTE.map(([k, l], i) => `${i ? '<span class="pf" aria-hidden="true">›</span>' : ''}<button type="button" data-schritt="${k}"${k === sk ? ' class="on" aria-current="step"' : ''}><i>${i + 1}</i>${esc(l)}</button>`).join('')
    + (bk ? `<a href="${esc(BPHead.appUrl(bk))}/" title="Kostenermittlung nach DIN 276 in der App Baukosten">Kostenberechnung ↗</a>` : '');
  const icn = (k) => { const x = NAVI.flatMap((g) => g[1]).find((y) => y[0] === k); return x ? `<svg viewBox="0 0 24 24">${x[2]}</svg>` : ''; };
  $('#stp').style.display = 'none';   // die Arbeitsschritte stehen links als Bereiche (wie in den gewohnten AVA-Programmen)
  $('#utb').style.display = 'none';   // keine eigene Leiste mehr: Datei-Befehle rechts in der Titelzeile
  uLeisteNeu();
  const nLv = LIST.filter((x) => !x.archived && !ohneLv(x) && !lvWeg(x)).length;
  NSU = $('#nsuche') || NSU;   // Suchfeld festhalten: steht in „oben“ in der Navigation und überlebt so deren Neuzeichnen
  bpNav($('#tabs'), {   // Navigation links: gemeinsamer Baustein (/bp/nav.js)
    kopf: { titel: (PROJ.find((p) => p.id === pid) || {}).name || 'Projekt', klein: `${nLv} LV${nLv === 1 ? '' : 's'}` }, davor: pjVerHtml(), aktiv: tab, attr: 'tab', lage: true,   // Lage wählbar (⇔) wie im Bauzeitenplan: links · schmal · oben · automatisch
    nachher: (el, m) => { const su = NSU, ende = el.querySelector('.nv-ende'); if (m === 'oben' && ende) ende.appendChild(su); else if (su.parentElement !== $('#navL')) $('#navL').insertBefore(su, $('#tabs')); },   // data-tab: den Wechsel meldet die AVA wie bisher selbst an
    gruppen: [...(bk ? [{ titel: 'Kostenberechnung', href: BPHead.appUrl(bk) + '/', tip: 'Kostenermittlung nach DIN 276 in der App Baukosten' }] : []),
      ...(einfach() ? [{ titel: 'Übersicht', punkte: [{ id: 'alle', text: 'Alle LVs', icon: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>', farbe: 'var(--c-v)', zahl: LIST.filter((x) => !x.archived).length || '' }] }] : []),
      ...NAVI.map(([g, xs]) => ({ titel: g, punkte: xs.map(([k, l, ic]) => ({ id: k, text: l, icon: ic, farbe: NAVF[k], zahl: n[k] || '', zahlTip: NZT[k] || '', unter: navUnter(k) })) }))],
    fuss: `<div class="nfuss"><label class="ava-drop" data-avadrop title="Datei hierher ziehen oder klicken – Angebot, LV, Aufmaß, Rechnung, Bürgschaft · PDF, Scan, Foto, GAEB, Excel. Die Plattform erkennt, was es ist, und fragt nach, wohin"><span class="ad-i">📥</span><span class="ad-t"><b>Datei ablegen</b><small>hierher ziehen oder klicken – Angebot, LV, Aufmaß, Rechnung …</small></span><input type="file" hidden multiple data-avadropin accept=".pdf,.xlsx,.xlsm,.x81,.x82,.x83,.x84,.x85,.x86,.d81,.d83,.d84,.d86,.p81,.p83,.p84,.p86,.x31,.xml,.docx,image/*,application/pdf"></label><button type="button" class="ava-ein" data-eingang title="Dateien im Eingangsordner auf dem Server (z. B. Scans vom Kopierer)">📂 Eingang vom Kopierer<span data-eingangn>${eingangN() ? `<span class="nz">${eingangN()}</span>` : ''}</span></button></div>`,
  });
  vlSicht();
  const pn = (PROJ.find((p) => p.id === pid) || {}).name || '';
  const mitSel = NURLV.has(tab) && tab !== 'lv' && !PJTABS.has(tab) && LIST.length > 0;   // gewählt wird im Projektbaum links
  $('#sel').hidden = !mitSel;
  $('#phT').textContent = `${tab === 'alle' ? 'Alle LVs' : (TABS.find((t) => t[0] === tab) || [, ''])[1]}${mitSel ? '' : ': ' + (NURLV.has(tab) && L ? `LV ${L.nr} ${L.name}` : pn)}`;
  $('#kpi').hidden = !NURLV.has(tab); $('#stat').hidden = !NURLV.has(tab);
  document.querySelectorAll('[data-need="lv"]').forEach((b) => { b.disabled = !L; });
  // Werkzeugleiste nur dort, wo ihre Befehle greifen (LV und Aufträge); Volltextsuche bleibt über Strg+Umschalt+F
  // Werkzeugleiste bleibt immer gleich hoch – was im Bereich nicht greift, ist grau
  document.querySelectorAll('.rib [data-act="pos"], .rib [data-act="glied"]').forEach((b) => { b.disabled = !L || tab !== 'lv'; });
  $('#phLvD').disabled = !L || !L.id; $('#phPrD').disabled = !pid;   // feste Plätze: gesperrt statt ausgeblendet
  if (typeof quZeigen === 'function' && QU) quZeigen();
  const v0 = $('#view'); let v = v0;
  if (tab === 'alle') { v.innerHTML = vAlle(); $('#avStufen').innerHTML = ''; $('#bfl').hidden = true; return; }
  $('#bfl').hidden = false;
  if (tab === 'uebersicht') { v.innerHTML = vUebersicht(); return; }
  if (tab === 'auftraege') { v.innerHTML = vAuftraege(); auSeite(); uLeisteNeu(); auSpaltenAnwenden(); requestAnimationFrame(auHoehe); return; }
  if (tab === 'tueren') { vTueren(v); return; }
  if (!L && !(pid && LIST.some((x) => !x.archived))) { v.innerHTML = `<div class="card empty"><p>${pid ? 'Für dieses Projekt gibt es noch kein Leistungsverzeichnis.' : 'Bitte oben ein Projekt wählen.'}</p>${pid ? '<button class="btn pri" data-act="new">Erstes LV anlegen</button>' : ''}</div>`; return; }
  const RE2 = ['lv', 'angebote', 'aufmass', 'rechnungen'].includes(tab);   // Baum (LVs mit Angeboten bzw. Rechnungen) links, Inhalt rechts daneben – Trennung ziehbar
  if (!L) { v.innerHTML = RE2 ? re2Html(null) : lvxHtml(null); if (tab === 'angebote') angSeite(); return; }
  const pjAlt = document.getElementById('pjTree'), pjTop = pjAlt ? pjAlt.scrollTop : null;   // Baum links: Rollposition behalten (nicht nach oben springen)
  v.innerHTML = RE2 ? re2Html({ lv: vLv, angebote: vAngebote, aufmass: vAufmass, rechnungen: vRechnungen }[tab]()) : PJTABS.has(tab) ? lvxHtml({ lv: vLv, angebote: vAngebote, aufmass: vAufmass, rechnungen: vRechnungen }[tab]()) : { lv: vLv, angebote: vAngebote, aufmass: vAufmass, rechnungen: vRechnungen }[tab]();
  if (tab === 'angebote') { angSeite(); uLeisteNeu(); }
  spaltenGriffe();   // gemerkte Spaltenbreiten gleich setzen – nicht erst nach dem ersten Bild (sonst springt die Tabelle bei jedem Speichern)
  pjImBlick(pjTop);
  sums();
  if (tab === 'aufmass' || tab === 'rechnungen') { amPdfMount(); if (seiteDa()) uLeisteNeu(); }
  if (PJF && L && PJF.lv === L.id) setTimeout(pjFokus, 30);
  if (tab === 'lv') { lvAktZeigen(); lvSplitMount(); uLeisteNeu(); requestAnimationFrame(lvKopfKleben); }
  if (FELDER[tab]) randUnten();
  edSpalten();   // Höhe des Hauptfelds gleich setzen – nicht erst im nächsten Bild (sonst springt die Tabelle bei jeder Eingabe)
  document.body.classList.toggle('ph-frei', PJTABS.has(tab));
  if (PJTABS.has(tab)) {   // Knopfleiste des geöffneten LV bleibt beim Scrollen unter der Kopfzeile stehen; die übrigen LVs scrollen weg
    const ph = null, kopf = document.querySelector('.bph');   // Titelzeile scrollt hier mit weg – oben (unter der Kopfleiste der Plattform) bleiben nur Knopfleiste und Spaltenköpfe
    document.documentElement.style.setProperty('--phh', (kopf ? Math.round(kopf.getBoundingClientRect().bottom) : 52) + 'px');
    const lb0 = tab === 'lv' && (v.querySelector('.lvx-akt>.bar:first-child') || v.querySelector('.re2-ed>.bar:first-child')), lx = v.querySelector('.lvx');   // LV-Knopfleiste zwischen Kennzahlen und LV-Liste
    if (lb0 && lx) { lb0.classList.add('lvx-bar'); lx.before(lb0); }
    else if (lb0) { lb0.classList.add('lvx-bar'); const r2 = v.querySelector('.re2'); if (r2) r2.classList.add('mit-lvbar'); }   // Baum-Ansicht: Knopfleiste bleibt oben im Inhalt stehen, Spaltenköpfe darunter
    const lb = v.querySelector('.lvx-bar'); if (lb) document.documentElement.style.setProperty('--lvbar', lb.offsetHeight + 'px');
    if (LVXHOCH) { LVXHOCH = false; const a = v.querySelector('.lvx .pj-r.akt'); if (a) setTimeout(() => { const y = a.getBoundingClientRect().top + scrollY - (ph ? ph.offsetHeight : 0) - 60; scrollTo({ top: Math.max(0, y) }); }, 30); }
  }
}

/* ---------- LV als PDF/Scan daneben: Zeilen anklicken → ins gewählte Feld, Alt+Klick → neue Position, erkannte Positionen übernehmen ---------- */
let LVDV = null, LVFELD = null;
/* Spaltenkopf des LV neben der PDF beim Rollen der Seite oben halten (das waagerecht rollende LV-Feld hebt position:sticky auf) */
function lvKopfKleben() {
  document.querySelectorAll('.lv-split>.lv-sl').forEach((sl) => {
    const t = sl.querySelector('table.lv, table.tree'); if (!t || !t.tHead) return;
    if (sl.classList.contains('bp-feld')) { t.tHead.querySelectorAll('th').forEach((th) => { th.style.transform = ''; }); return; }   // Feld rollt in sich: der Kopf klebt per CSS
    const oben = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phh')) || 52) + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lvbar')) || 0);
    const r = t.getBoundingClientRect(), hk = t.tHead.getBoundingClientRect().height;
    const dy = Math.max(0, Math.min(oben - r.top, r.height - hk * 2));
    t.tHead.querySelectorAll('th').forEach((th) => { th.style.transform = dy ? `translateY(${dy}px)` : ''; });
  });
}
addEventListener('scroll', () => requestAnimationFrame(lvKopfKleben), { passive: true });
addEventListener('resize', () => requestAnimationFrame(lvKopfKleben));
/* LV: Bereich rechts (seite.js) – „Details“ (dieselbe Karte wie in den Aufträgen), „Kopierquelle“, „📄 Dokument“ (LV/Angebot als PDF) */
/* Kopierquelle wirklich zu sehen? (ihr Feld hängt im Dokument, im Bereich rechts, und der ist aufgeklappt) – danach richtet sich der Knopf */
const quSichtbar = () => tab === 'lv' && !!QUBOX && QUBOX.isConnected && !!QUBOX.closest('.sr-b, .sr-flo') && !QUBOX.hidden && (seiteOffen() || !!QUBOX.closest('.sr-flo'));
const QUBOX = document.getElementById('quelle');   // Kopierquelle: ihr Feld wandert in den Reiter (bleibt beim Umschalten erhalten)
function lvSplitMount() {
  const tbl = document.querySelector('#view table.lv.baum'); if (!tbl) return;
  const w = tbl.closest('.tblw'); if (!w) return;
  let sp = w.parentNode.classList.contains('lv-sl') ? w.parentNode.parentNode : null;
  if (!sp) { sp = document.createElement('div'); sp.className = 'lv-split'; w.parentNode.insertBefore(sp, w);
    const l = document.createElement('div'); l.className = 'lv-sl'; l.appendChild(w); sp.appendChild(l);
    const sum = sp.nextElementSibling; if (sum && sum.matches && sum.matches('.lvsum,.lv-summe')) l.appendChild(sum); }
  const D = (L && L.dokumente) || [];
  if (LVDV && !D.some((d) => d.id === LVDV.id)) LVDV = null;
  seite(sp, 'lv', [{ id: 'details', titel: 'Details', mount: (el) => { el.innerHTML = `<div class="sr-pad">${lvDetails()}</div>`; } },
    { id: 'quelle', titel: 'Kopierquelle', fenster: false, mount: (el) => { el.appendChild(QUBOX); QUBOX.hidden = false; if (!QU.an) { QU.an = true; LS.set('qu.an', true); } if (!QU.L && !QUBUSY) quLaden().then(quZeigen).catch(() => {}); quZeigen(); } },
    D.length ? { id: 'dok', titel: '📄 Dokument', mount: lvDokReiter, neu: () => LVDV && LVDV.pdf && lvDokZeichnen(LVDV) } : null], { start: D.length ? 'dok' : 'details', w: 0.62, wechsel: () => { uLeisteNeu(); requestAnimationFrame(randUnten); requestAnimationFrame(lvKopfKleben); } });
}
function lvDetails() {   // markierte Zeile des LV – dieselbe Karte wie unter „Aufträge“ (Felder, Langtext, Nachtrag-Häkchen)
  const x = LVAKT && items().find((y) => y.id === LVAKT);
  if (!x || x.typ === 'txt') return '<div class="card empty"><p class="hint">Im LV eine Position oder einen Gliederungspunkt anklicken – hier stehen dann Menge, Preis, Langtext und ob es ein Nachtrag ist.</p></div>';
  PC[L.id] = L; return auPosKarte(L, x);
}
function lvDokReiter(el) {
  const D = (L && L.dokumente) || []; if (!D.length) return;
  const did = LVDV ? LVDV.id : (D.find((d) => d.id === LS.get('lvdokid')) || D[D.length - 1]).id;
  if (!LVDV || LVDV.id !== did) { LVDV = { id: did, el: document.createElement('div'), pages: [], zoom: LS.get('lvZoom', 1) }; LVDV.el.className = 'am-pv'; LVDV.el.innerHTML = '<p class="hint" style="color:#fff">Lade PDF …</p>'; lvDokLaden(LVDV); }
  const d = D.find((x) => x.id === did), n = d.n_pos + d.n_titel;
  el.innerHTML = `<div class="am-pk">${D.map((y) => `<button class="btn sm${y.id === did ? ' pri' : ''}" data-lvdokw="${y.id}" title="${esc(y.name)}">${esc(y.name.length > 26 ? y.name.slice(0, 24) + '…' : y.name)}</button>`).join('')}
    ${d.laeuft ? `<span class="lv-lauf">${laufHtml(d)}</span>` : ''}${d.fehler ? `<span class="hint" style="color:#e07b3a">Lesen fehlgeschlagen: ${esc(d.fehler)}</span>` : ''}${!d.laeuft && (d.abgebrochen || d.fehler || (d.leer && d.ocr)) ? `<button class="btn sm" data-lvdoklesen="${did}" title="Texterkennung neu starten">↻ Neu lesen</button>` : ''}
    ${n ? `<button class="btn sm" data-lvdokueb title="Erkannte Titel und Positionen (OZ, Kurztext, Menge, Einheit, Langtext${d.n_ep ? ', Preise als Schätzung' : ''}) ans LV">Erkannte übernehmen (${d.n_pos} Pos.${d.n_titel ? ', ' + d.n_titel + ' Titel' : ''}${d.ki ? ' · ' + esc(d.ki) : ''})</button>` : ''}
    ${d.laeuft ? '' : `<button class="btn sm" data-lvdokki="${did}" title="Auf Nachfrage: das Dokument von einer KI lesen lassen – findet auch Positionen ohne festes Schema (Angebote, Listen, Fotos)">🤖 mit KI lesen</button>`}
    <span class="fill"></span><button class="ib" data-lvz="-1" title="kleiner">−</button><button class="ib" data-lvz="1" title="größer">＋</button><button class="ib" data-lvdokdel="${did}" title="Dokument entfernen">🗑</button></div>
    <div class="hint" style="padding:.25rem .5rem;border-bottom:1px solid var(--line)">${d.ocr ? 'Scan, per Texterkennung gelesen – bitte prüfen · ' : ''}Zeile anklicken → ins gewählte Feld links (Kurztext, Menge, Einheit, Langtext …) · <b>Alt+Klick</b> → als neue Position</div>`;
  el.appendChild(LVDV.el);
}
/* Antwort als JSON – Fehlerseiten des Webservers (Zeitüberschreitung, Datei zu groß) verständlich melden */
async function jsonAus(r) {
  try { return await r.json(); } catch {
    throw new Error(r.status === 502 ? 'Die AVA war gerade nicht erreichbar (Neustart nach einem Update oder abgestürzte Verarbeitung) – bitte noch einmal versuchen.' : r.status === 504 ? 'Der Server hat zu lange gebraucht – bitte noch einmal versuchen.' : r.status === 413 ? 'Die Datei ist für den Webserver zu groß.' : `Unerwartete Antwort vom Server (${r.status}).`);
  }
}
/* Scan wird im Hintergrund gelesen: nachfragen, bis die Erkennung fertig ist, dann neu zeichnen */
let LVOCRT = 0;
function lvOcrWarten(id, uebernehmen, dokId) {
  clearTimeout(LVOCRT);
  LVOCRT = setTimeout(async () => {
    if (!L || L.id !== id) return;
    let x; try { x = await api('api/lv/' + id); } catch { return lvOcrWarten(id, uebernehmen, dokId); }
    const d = dokId ? (x.dokumente || []).find((y) => y.id === dokId) : (x.dokumente || []).slice(-1)[0];
    if (d && d.laeuft) { const st = document.querySelector('.lv-lauf'); if (st) st.innerHTML = laufHtml(d); return lvOcrWarten(id, uebernehmen, dokId); }
    if (L && L.id === id) { L.dokumente = x.dokumente; render(); }
    if (!d || d.abgebrochen) return;
    if (d.fehler) { toast(d.fehler, true); return; }
    if (d.ki) { lvKiFertig(d); return; }
    toast(d.n_pos ? `Texterkennung fertig: ${d.n_pos} Positionen erkannt.` : 'Texterkennung fertig – keine Positionen sicher erkannt.');
    if (uebernehmen && d.n_pos >= 3) setTimeout(() => { const b = document.querySelector('[data-lvdokueb]'); if (b) b.click(); }, 300);
    else if (d.n_pos < 3) lvKiAnbieten(d, uebernehmen);
  }, 4000);
}
/* Stand eines laufenden Lesens: Balken (bei mehreren Teilen/Seiten, sonst laufender Balken), Zeit, Abbrechen, Neu starten */
function laufHtml(d) {
  const N = d.stand_N || 0, n = d.stand_n || 0, ki = d.lauf_art === 'ki';
  const st = d.ki_stand && d.ki_stand !== 'startet …' ? d.ki_stand : '';
  const t = (ki ? 'KI liest' : 'Texterkennung') + (st ? ' – ' + (ki ? st : st.replace(/^Texterkennung /, '')) : ' …');
  const bar = N > 1 ? `<span class="lauf-bar" title="${n} von ${N} erledigt"><i style="width:${Math.max(6, Math.round(n / N * 100))}%"></i></span>` : '<span class="lauf-bar unb"><i></i></span>';
  return `${bar}<span class="lauf-t">${esc(t)}</span><span class="lauf-z" data-seit="${esc(d.lauf_seit || '')}">${laufZeit(d.lauf_seit)}</span><button class="btn sm" data-lvdokstop="${d.id}">Abbrechen</button><button class="btn sm" data-lvdokneu="${d.id}" data-art="${ki ? 'ki' : 'ocr'}" title="Abbrechen und neu starten">↻ Neu starten</button>`;
}
function laufZeit(seit) { const t = seit ? Math.max(0, Math.round((Date.now() - new Date(seit)) / 1000)) : 0; return seit ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : ''; }
setInterval(() => document.querySelectorAll('.lauf-z[data-seit]').forEach((el) => { el.textContent = laufZeit(el.dataset.seit); }), 1000);
/* KI nur auf Nachfrage: welche KI, und dass der Text dorthin geht */
const DOK_ACCEPT = '.pdf,application/pdf,image/*,.jpg,.jpeg,.png,.tif,.tiff,.docx,.txt,.csv,.x81,.x82,.x83,.x84,.x85,.x86,.d83,.d84,.p83,.p84,.xlsx,.xlsm';
const istImport = (f) => /\.(x8[1-6]|d8[1-6]|p8[1-6]|x3[12]|xlsx|xlsm)$/i.test(f.name || '');
function kiWahl(text, opt = {}) {
  const P = ((window.BPHead && BPHead.providers) || []).filter((p) => p.ok && p.key !== 'intern' && (!opt.bild || p.bild));
  if (!P.length) { toast(opt.bild ? 'Keine KI eingerichtet, die Bilder liest (Claude, Gemini, ChatGPT oder Ollama mit Bildmodell) – Verwaltung → Einstellungen → KI.' : 'Keine KI eingerichtet – in der Verwaltung → Einstellungen → KI (z. B. Ollama im Büro).', true); return Promise.resolve(null); }
  if (window.BPHead && BPHead.kiFragen) return BPHead.kiFragen({ text, hinweis: opt.hinweis || 'Der Text des Dokuments (bei Scans ohne Text die Seitenbilder) geht an die gewählte KI. Das Ergebnis kommt als Vorschlag – übernommen wird erst nach deiner Bestätigung.', bild: opt.bild });
  return Promise.resolve(null);
}
/* Hintergrundarbeit des Servers (Texterkennung, KI) abwarten */
function avaJob(jid, el) {
  return new Promise((fertig) => {
    const t = async () => { let J; try { J = await api('api/avajob/' + jid); } catch (e) { J = { status: 'fehler', fehler: e.message }; }
      if (J.status === 'laeuft') {
        if (el) { const st = el.querySelector('.lauf-t2'); if (st && J.stand) st.textContent = J.stand; const b = el.querySelector('.lauf-bar'); if (b) { b.classList.toggle('unb', !(J.N > 1)); b.firstChild.style.width = J.N > 1 ? Math.max(6, Math.round(J.n / J.N * 100)) + '%' : ''; } }
        setTimeout(t, 2500);
      } else fertig(J); };
    setTimeout(t, 2000);
  });
}
/* Leiste unten: Text, Balken, Zeit, Abbrechen und (wenn neustart gegeben) Neu starten → {status, hinweis|fehler} oder {status:'neu'} */
async function avaJobLeiste(text, jid, neustart) {
  const seit = new Date().toISOString();
  const el = document.createElement('div'); el.className = 'ava-job';
  el.innerHTML = `<span class="lauf-bar unb"><i></i></span><span>${esc(text)}</span><small class="lauf-t2"></small><small class="lauf-z" data-seit="${seit}"></small><button class="btn sm" data-jobstop>Abbrechen</button>${neustart ? '<button class="btn sm" data-jobneu title="Abbrechen und neu starten">↻ Neu starten</button>' : ''}`;
  document.body.appendChild(el);
  let neu = false;
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-jobstop],[data-jobneu]'); if (!b) return;
    neu = !!b.dataset.jobneu || b.hasAttribute('data-jobneu'); b.disabled = true;
    try { await api(`api/avajob/${jid}/abbrechen`, 'POST'); } catch (er) { toast(er.message, true); }
  });
  try { const J = await avaJob(jid, el); if (J.status === 'abgebrochen') { if (neu && neustart) { neustart(); return { status: 'neu' }; } toast('Abgebrochen – es wurde nichts eingetragen.'); } return J; } finally { el.remove(); }
}
/* Angebot als PDF/Scan/Foto: Preise erkennen; Scans im Hintergrund; handschriftliche Preise auf Nachfrage per Bild-KI */
async function angebotPdf(lvId, f, bieter, cid, kiBild) {
  const fd = new FormData(); fd.append('datei', f); fd.append('bieter', bieter || f.name); if (cid) fd.append('contact_id', cid);
  if (kiBild) fd.append('ki_bild', kiBild);
  else if (window.BPHead && BPHead.ki && BPHead.ki !== 'intern') fd.append('ki', '1');
  toast(`„${f.name}“ wird gelesen …`);
  let j; try { const r = await fetch(`api/lv/${lvId}/angebot-pdf`, { method: 'POST', body: fd, credentials: 'same-origin' }); j = await jsonAus(r); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status); }
  catch (e) { toast(e.message, true); return; }
  if (!j.job) { L = j; render(); toast(j.hinweis || 'Angebot übernommen.'); refreshList(); return; }
  const J = await avaJobLeiste(kiBild ? 'Die KI liest die Preise' : 'Eingescanntes Angebot', j.job, () => angebotPdf(lvId, f, bieter, cid, kiBild));
  if (J.status === 'abgebrochen' || J.status === 'neu') return;
  if (L && L.id === lvId) { L = await api('api/lv/' + lvId); render(); } refreshList();
  const ohne = J.status === 'fehler' ? /KI/.test(J.fehler || '') : /ohne lesbaren Preis/.test(J.hinweis || '');
  if (J.status === 'fehler' && !ohne) { toast(J.fehler, true); return; }
  if (J.status !== 'fehler') toast(J.hinweis || 'Angebot übernommen.');
  if (ohne && !kiBild) {
    const ki = await kiWahl(`${J.status === 'fehler' ? 'Im Scan sind keine lesbaren Preise' : 'Einige Preise sind nicht lesbar'} – vermutlich handschriftlich eingetragen. Soll eine KI die Preise von den Seitenbildern lesen? Übernommen wird ein Preis, wenn Menge × EP = GP aufgeht.`, { bild: true, hinweis: 'Die Seitenbilder des Angebots gehen an die gewählte KI. Gelesene Preise werden beim Angebot eingetragen – im Preisspiegel prüfen und bei Bedarf ändern.' });
    if (ki) return angebotPdf(lvId, f, bieter, cid, ki);
  }
}
async function lvKiStarten(dokId, uebernehmen, text) {
  const ki = await kiWahl(text || 'Die KI liest das Dokument und schlägt Titel und Positionen vor – auch bei Angeboten, Listen oder Fotos ohne festes LV-Schema.');
  if (!ki || !L) return;
  try { const j = await call(`api/lvdok/${dokId}/ki`, 'POST', { ki }); if (j) L = j; render(); toast('Die KI liest das Dokument – das kann einige Minuten dauern.'); lvOcrWarten(L.id, uebernehmen, dokId); }
  catch (e) { toast(e.message, true); }
}
function lvKiAnbieten(d, uebernehmen) {
  lvKiStarten(d.id, uebernehmen, d.n_pos ? `Ohne KI wurden nur ${d.n_pos} Position${d.n_pos === 1 ? '' : 'en'} sicher erkannt.` : 'Ohne KI wurden keine Positionen sicher erkannt.');
}
async function lvKiFertig(d) {
  if (!d.n_pos && !d.n_titel) { toast(`${d.ki} hat keine Positionen gefunden – Zeilen rechts anklicken übernimmt sie einzeln.`, true); return; }
  const was = `${d.ki} hat ${d.n_pos} Positionen${d.n_titel ? ' und ' + d.n_titel + ' Titel' : ''} erkannt${d.n_ep ? `, ${d.n_ep} mit Preis (wird als Schätzpreis eingetragen)` : ''}.`;
  if (!posOf().length) { if (await bpFrage(was + '\nIns LV übernehmen?', { ok: 'Übernehmen' })) lvVorschlagRein(d.id, false); return; }
  modalBox(`<h3>KI-Ergebnis übernehmen</h3><p>${esc(was)}</p><p class="hint">Im LV stehen schon ${posOf().length} Positionen.</p>
    <div class="acts"><button class="btn" data-m="x">Später</button><button class="btn" data-m="an">Anhängen</button><button class="btn pri" data-m="er">Ersetzen</button></div>`, (m, bg, close) => {
    close(); if (m === 'an' || m === 'er') lvVorschlagRein(d.id, m === 'er');
  });
}
async function lvVorschlagRein(dokId, ersetzen) {
  const A = await api(`api/lvdok/${dokId}?auslese=1`).catch(() => null);
  const V = (A && A.vorschlag) || []; if (!V.length || !L) return;
  const alt = JSON.parse(JSON.stringify(items()));
  L.data.items = (ersetzen ? [] : items()).concat(V.map(({ seite, ...x }) => ({ id: uid(), ...x }))); HIST.next = 'Positionen aus dem Dokument'; changed(true);
  rueckgaengig(`${V.length} Zeilen aus dem Dokument ${ersetzen ? 'eingesetzt' : 'übernommen'}`, () => { L.data.items = alt; changed(true); });
}
async function lvDokLaden(V) {
  try { const lib = await pdfjs(); [V.pdf, V.A] = await Promise.all([lib.getDocument({ isEvalSupported: false, url: 'api/lvdok/' + V.id, withCredentials: true }).promise, api(`api/lvdok/${V.id}?auslese=1`)]); }
  catch (e) { V.el.innerHTML = `<p class="hint" style="color:#fff">PDF lässt sich nicht anzeigen: ${esc(e.message)}</p>`; return; }
  if (LVDV !== V) return; lvDokZeichnen(V);
}
async function lvDokZeichnen(V) {
  V.el.innerHTML = ''; V.pages = [];
  const w = Math.max(300, (V.el.clientWidth || 600) - 20), dpr = window.devicePixelRatio || 1;
  for (let n = 1; n <= Math.min(V.pdf.numPages, 80); n++) {
    const pg = await V.pdf.getPage(n), vp1 = pg.getViewport({ scale: 1 }), sc = w / vp1.width * V.zoom, vp = pg.getViewport({ scale: sc * dpr });
    const wrap = document.createElement('div'); wrap.className = 'am-pg'; wrap.style.width = vp1.width * sc + 'px'; wrap.style.height = vp1.height * sc + 'px';
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; cv.style.width = '100%'; cv.style.height = '100%'; wrap.appendChild(cv); V.el.appendChild(wrap); V.pages.push(wrap);
    await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; if (LVDV !== V) return;
    ((V.A && V.A.zeilen && V.A.zeilen[n]) || []).forEach(([x0, y0, x1, y1, t], k) => { const d = document.createElement('div'); d.className = 'lv-zz'; d.dataset.t = t; d.title = t;
      Object.assign(d.style, { left: x0 * 100 + '%', top: y0 * 100 + '%', width: (x1 - x0) * 100 + '%', height: (y1 - y0) * 100 + '%' }); wrap.appendChild(d); });
  }
}
const EH_RX = /^(m2|m²|qm|m3|m³|cbm|m|lfm|lfdm|st|stk|stck|stück|psch|pausch|h|std|kg|t|to|wo|mt|tag|l|ltr|satz)\.?$/i;
function lvZeileLesen(t) {   // „02.0010 NYM-J 3x1,5 verlegen 250,000 m“ → {oz, kurz, menge, einheit}
  const tk = t.split(/\s+/).filter((x) => x && !/^[._…\-]{2,}$|^€$/.test(x)); let oz = '', menge = null, einheit = '';
  if (tk.length && /^\d{1,4}(\.\d{1,4}){0,4}\.?$/.test(tk[0]) && tk.length > 1) oz = tk.shift().replace(/\.$/, '');
  const zahl = (x) => (/^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+(,\d+)?$/.test(x) ? pf(x) : null);
  for (let k = tk.length - 1; k > 0 && k >= tk.length - 4; k--) {
    if (EH_RX.test(tk[k]) && zahl(tk[k - 1]) != null) { menge = zahl(tk[k - 1]); einheit = tk[k]; tk.splice(k - 1); break; }
    if (EH_RX.test(tk[k - 1]) && zahl(tk[k]) != null) { menge = zahl(tk[k]); einheit = tk[k - 1]; tk.splice(k - 1); break; }
  }
  return { oz, kurz: tk.join(' ').trim(), menge, einheit, zahlen: t.split(/\s+/).map(zahl).filter((x) => x != null) };
}
document.addEventListener('focusin', (e) => { if (e.target.closest && e.target.closest('table.lv') && e.target.matches('[data-f],[data-vp]')) LVFELD = e.target; });
document.addEventListener('click', async (e) => {
  if (tab !== 'lv' || !L) return;
  const z = e.target.closest('.lv-zz');
  if (z) {
    const P = lvZeileLesen(z.dataset.t); z.classList.add('ok');
    if (e.altKey || !LVFELD || !LVFELD.isConnected) {
      if (!e.altKey) { toast('Erst links ein Feld anklicken (Kurztext, Menge, Langtext …) – oder Alt+Klick legt die Zeile als neue Position an.'); return; }
      const I = items(), ai = LVAKT ? I.findIndex((x) => x.id === LVAKT) : -1, at = ai >= 0 ? ai + 1 : I.length;
      const ref = [...I.slice(0, at)].reverse().find((x) => x.typ === 'pos' && x.art !== 'T');
      const neu = { id: uid(), typ: 'pos', art: 'N', oz: P.oz, kurz: P.kurz || z.dataset.t, lang: '', menge: P.menge ?? 0, einheit: P.einheit || (ref ? ref.einheit : ''), kg: ref ? ref.kg : '' };
      I.splice(at, 0, neu); LVAKT = neu.id; if (!P.oz) numerieren(); HIST.next = 'Position aus der PDF'; changed(true);
      setTimeout(() => { const el = document.querySelector(`tr[data-i="${at}"] [data-f="kurz"]`); if (el) { el.focus({ preventScroll: true }); LVFELD = el; } }, 40); return;
    }
    const f = LVFELD.dataset.f || (LVFELD.dataset.vp ? 'ep' : '');
    if (['menge', 'ep_s', 'ep'].includes(f)) { const v = f === 'menge' && P.menge != null ? P.menge : P.zahlen[P.zahlen.length - 1]; if (v == null) { toast('In dieser Zeile steht keine Zahl.'); return; } LVFELD.value = f === 'menge' ? nf(v) : nf2(v); }
    else if (f === 'einheit') LVFELD.value = P.einheit || z.dataset.t.split(/\s+/).find((x) => EH_RX.test(x)) || LVFELD.value;
    else if (f === 'lang' || LVFELD.tagName === 'TEXTAREA') LVFELD.value = (LVFELD.value.trim() ? LVFELD.value.replace(/\s+$/, '') + '\n' : '') + z.dataset.t;
    else LVFELD.value = P.kurz || z.dataset.t;
    LVFELD.dispatchEvent(new Event('input', { bubbles: true })); LVFELD.dispatchEvent(new Event('change', { bubbles: true })); LVFELD.focus({ preventScroll: true });
    return;
  }
  const w = e.target.closest('[data-lvdokw]'); if (w) { LVDV = null; LS.set('lvdokid', +w.dataset.lvdokw); render(); return; }
  const zz = e.target.closest('[data-lvz]'); if (zz && LVDV && LVDV.pdf) { LVDV.zoom = Math.max(0.5, Math.min(3, LVDV.zoom * (+zz.dataset.lvz > 0 ? 1.2 : 1 / 1.2))); LS.set('lvZoom', LVDV.zoom); lvDokZeichnen(LVDV); return; }
  const dl = e.target.closest('[data-lvdokdel]'); if (dl) { try { await call('api/lvdok/' + dl.dataset.lvdokdel, 'DELETE'); LVDV = null; } catch (er) { toast(er.message, true); } return; }
  if (e.target.closest('[data-lvdokueb]')) {
    const dId = LVDV ? LVDV.id : (LS.get('lvdokid') || L.dokumente[L.dokumente.length - 1].id), d = (L.dokumente || []).find((x) => x.id === dId) || {};
    if (posOf().length && !(await bpFrage(`${d.n_pos || ''} erkannte Positionen an das LV anhängen?\nVorhandene Positionen bleiben stehen.`, { ok: 'Anhängen' }))) return;
    lvVorschlagRein(dId, false);
  }
  const kb = e.target.closest('[data-lvdokki]'); if (kb) { lvKiStarten(+kb.dataset.lvdokki, false); return; }
  const ks = e.target.closest('[data-lvdokstop]'); if (ks) { clearTimeout(LVOCRT); try { await call(`api/lvdok/${ks.dataset.lvdokstop}/abbrechen`, 'POST'); toast('Abgebrochen – der bisherige Stand bleibt.'); } catch (er) { toast(er.message, true); } return; }
  const kn = e.target.closest('[data-lvdokneu]');
  if (kn) { const id = +kn.dataset.lvdokneu; if (kn.dataset.art === 'ki') { lvKiStarten(id, false); return; } try { await call(`api/lvdok/${id}/lesen`, 'POST'); lvOcrWarten(L.id, false, id); } catch (er) { toast(er.message, true); } return; }
  const kl = e.target.closest('[data-lvdoklesen]'); if (kl) { const id = +kl.dataset.lvdoklesen; try { await call(`api/lvdok/${id}/lesen`, 'POST'); toast('Wird neu gelesen …'); lvOcrWarten(L.id, false, id); } catch (er) { toast(er.message, true); } return; }
});
document.addEventListener('change', async (e) => {
  const i = e.target.closest && e.target.closest('[data-lvdokin]'); if (!i || !i.files.length || !L) return;
  const f = i.files[0]; i.value = '';
  if (istImport(f)) { IMP = { ziel: 'lv', ersetzen: false }; await doImport(f); IMP = null; inOrdner(f, 'lv'); return; }
  await lvDokHoch(L.id, f); inOrdner(f, 'lv');
});
/* Eingelesene Datei (LV, Angebot) auch im Projektordner ablegen – wie beim Ablegen, mit einheitlichem Namen; still, nur Hinweis */
async function inOrdner(f, art, firma) {
  if (!f || !pid || !L) return;
  const fd = new FormData(); fd.append('datei', f); fd.append('project_id', pid); fd.append('art', art === 'angebot' ? 'angebot' : 'lv'); fd.append('firma', firma || ''); fd.append('gewerk', [L.nr, L.name].filter(Boolean).join(' '));
  try { const r = await fetch('api/ablage', { method: 'POST', body: fd, credentials: 'same-origin' }), j = await jsonAus(r); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status); if (j.pfad) toast('Auch im Projektordner abgelegt: ' + j.pfad); }
  catch (e) { toast('Nicht im Projektordner abgelegt: ' + e.message, true); }
}
async function lvDokHoch(lvId, f, opt = {}) {
  const fd = new FormData(); fd.append('datei', f); toast(`„${f.name}“ wird gelesen …`);
  try { const r = await fetch(`api/lv/${lvId}/dok`, { method: 'POST', body: fd, credentials: 'same-origin' }), j = await r.json().catch(() => { throw new Error(r.status === 504 || r.status === 502 ? 'Das Lesen hat zu lange gedauert – bitte noch einmal versuchen.' : r.status === 413 ? 'Die Datei ist für den Webserver zu groß.' : 'Fehler ' + r.status); }); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status);
    L = j; seiteReiter('lv', 'dok'); LVDV = null; LS.set('lvdokid', j.dokumente[j.dokumente.length - 1].id); tab = 'lv'; LS.set('tab', tab); render();
    const d = j.dokumente[j.dokumente.length - 1];
    if (d.laeuft) { toast('Eingescannt – die Texterkennung (Tesseract, ohne KI) läuft im Hintergrund, die erkannten Positionen erscheinen gleich.'); lvOcrWarten(lvId, !!opt.uebernehmen); return d; }
    toast(d.n_pos ? `${d.n_pos} Positionen erkannt – oben rechts „Erkannte übernehmen“ oder Zeile für Zeile anklicken.` : 'Keine Positionen sicher erkannt – Zeilen anklicken übernimmt sie ins gewählte Feld, Alt+Klick als neue Position.');
    if (opt.uebernehmen && d.n_pos >= 3) { if (!posOf().length) lvVorschlagRein(d.id, false); else setTimeout(() => { const b = document.querySelector('[data-lvdokueb]'); if (b) b.click(); }, 300); }
    else if (d.n_pos < 3 && opt.ki !== false) lvKiAnbieten(d, !!opt.uebernehmen);
    return d;
  } catch (e) { toast(e.message, true); return null; }
}

/* GAEB-Hinweis: die abweichenden Stellen zeigen – Positionen außerhalb der häufigsten Titeltiefe und Titel mit übersprungener Ebene;
   jeder Klick springt zur nächsten (Titel darüber werden aufgeklappt, die Zeilen markiert) */
let GAEBZ = { i: -1, n: 0 };
function lvGaebStellen() {
  const I = items(), tiefe = {}, D = [], P = []; let akt = 0;
  I.forEach((x) => { if (x.typ === 'titel') { const lv = x.lvl || 1; if (lv > akt + 1) P.push(x.id); akt = lv; } else if (x.art !== 'T') { tiefe[akt] = (tiefe[akt] || 0) + 1; D.push([x.id, akt]); } });
  const haupt = +Object.entries(tiefe).sort((a, b) => b[1] - a[1])[0]?.[0];
  return [...P, ...D.filter(([, t]) => t !== haupt).map(([id]) => id)].filter((id, k, A) => A.indexOf(id) === k)
    .sort((a, b) => I.findIndex((y) => y.id === a) - I.findIndex((y) => y.id === b));
}
document.addEventListener('click', (e) => {
  if (!e.target.closest || !e.target.closest('[data-gaebzeig]')) return;
  e.preventDefault(); e.stopPropagation();
  const S = lvGaebStellen(); if (!S.length) return;
  GAEBZ = { i: GAEBZ.n === S.length ? (GAEBZ.i + 1) % S.length : 0, n: S.length };
  const I = items(), id = S[GAEBZ.i], k = I.findIndex((y) => y.id === id);
  bpBaum.zeige(I, k, lvTiefe, LVZU);   // alle Titel darüber aufklappen
  LVXZU = false; LVSEL = new Set(S); LVAKT = id; render();
  setTimeout(() => { const i2 = items().findIndex((y) => y.id === id), tr = document.querySelector(`table.lv tr[data-i="${i2}"]`);
    if (tr) { tr.scrollIntoView({ block: 'center' }); tr.classList.add('gaeb-hier'); setTimeout(() => tr.classList.remove('gaeb-hier'), 2500); } }, 60);
});
/* GAEB: alle Positionen in derselben Titeltiefe, höchstens 4 Titelebenen, keine übersprungene Ebene */
document.addEventListener('click', (e) => {   // GAEB-Hinweis wegklicken / zurückholen
  const w = e.target.closest && e.target.closest('[data-gaebweg],[data-gaebauf]'); if (!w || !L) return;
  const S = new Set(LS.get('gaebweg', [])); if (w.hasAttribute('data-gaebweg')) S.add(L.id); else S.delete(L.id);
  LS.set('gaebweg', [...S]); render();
});
let GAEBW = null;   // weggeklickter GAEB-Hinweis: Anzahl der Stellen (null = kein Warnzeichen)
function gaebSchwebeSetzen() {   // das Warnzeichen schwebt knapp über der ersten Kennzahl in der Leiste – nach jedem Zeichnen von LV und Kennzahlen
  const k = document.querySelector('#kpi:not([hidden]) > div'); let s = document.getElementById('gaebSchwebe');
  if (GAEBW == null || !k || tab !== 'lv') { if (s) s.remove(); return; }
  if (!s) { s = document.createElement('div'); s.id = 'gaebSchwebe'; s.className = 'gaeb-schwebe'; }
  s.innerHTML = `<button type="button" class="gaeb-mark" data-gaebauf title="Noch nicht GAEB-konform${GAEBW ? ` (${GAEBW} Stelle${GAEBW === 1 ? '' : 'n'})` : ''} – klicken für den Hinweis"><span>⚠</span><small>GAEB</small></button>`;
  if (!s.isConnected) document.body.appendChild(s);   // fest am Bildschirm: die Leiste schneidet sonst ab (overflow)
  gaebLage();
}
function gaebLage() {
  const s = document.getElementById('gaebSchwebe'), k = document.querySelector('#kpi:not([hidden]) > div'); if (!s) return;
  const r = k && k.getBoundingClientRect(); if (!r || !r.width) { s.style.display = 'none'; return; }
  s.style.display = ''; s.style.left = Math.round(r.left + r.width / 2) + 'px'; s.style.top = Math.round(r.top) + 'px';
}
addEventListener('resize', gaebLage); document.addEventListener('scroll', gaebLage, true);
try { new ResizeObserver(gaebLage).observe(document.body); } catch { /* egal */ }
function lvGaebHinweis() {
  const I = items(), tiefe = {}, sprung = []; let akt = 0;
  I.forEach((x) => {
    if (x.typ === 'titel') { const lv = x.lvl || 1; if (lv > akt + 1) sprung.push(x.oz || x.kurz); akt = lv; }
    else if (x.art !== 'T') tiefe[akt] = (tiefe[akt] || 0) + 1;
  });
  const T = Object.keys(tiefe).map(Number);
  GAEBW = null; setTimeout(gaebSchwebeSetzen, 0);
  if (T.length <= 1 && !sprung.length) return '';
  const nz = (t) => (t === 0 ? 'ohne Titel' : t === 1 ? 'direkt unter Titeln' : `unter Untertiteln der ${t}. Ebene`);
  const n = lvGaebStellen().length;
  // weggeklickt (je LV gemerkt): statt der Zeile ein kleines schwebendes Warnzeichen – Klick holt den Hinweis zurück
  if (LS.get('gaebweg', []).includes(L.id)) { GAEBW = n; return ''; }
  return `<p class="si-w gaeb-w" style="margin:.2rem 0 .6rem"><button type="button" class="gaeb-x" data-gaebweg title="Hinweis ausblenden – oben bleibt ein kleines Warnzeichen">✕</button>${n ? `<button type="button" class="gaeb-zeig" data-gaebzeig><b>${GAEBZ.i >= 0 && GAEBZ.n === n ? `Nächste Stelle zeigen (${(GAEBZ.i + 1) % n + 1} von ${n})` : `Zum Anzeigen hier klicken (${n} Stelle${n === 1 ? '' : 'n'})`}</b></button> ` : ''}⚠ Noch nicht GAEB-konform: ${T.length > 1 ? `Positionen stehen in unterschiedlicher Tiefe (${T.sort().map((t) => `${tiefe[t]} ${nz(t)}`).join(', ')}). In GAEB brauchen alle Positionen dieselbe Titeltiefe – z. B. alle Titel mit ⇥ zu Untertiteln machen oder fehlende Untertitel ergänzen.` : ''}${sprung.length ? ` Ebene übersprungen bei ${sprung.slice(0, 3).map(esc).join(', ')} – ein Untertitel braucht einen Titel darüber.` : ''}</p>`;
}
