'use strict';
/* Wärmeschutz – Seite der App. Projekt oben in der Kopfleiste wie überall; links die Navigation (bpNav: Nachweis, Bauteile, Katalog),
   oben die Befehlsleiste, in der Mitte die Ablaufleiste (bp-stufen, wie Honorar) und darunter je Stufe eine Karte:
   Grundlagen (aus dem Bauantrag) → Bauteile (Rechner, ws-bauteil.js) → Prüfung (Anlage 7 GModG) → Nachweis → Eingereicht.
   Jede Änderung wird sofort gespeichert (Rückgängig-Dock). Rechnen: ws-physik.js, Regeln: ws-regeln.js, Server: plattform/waermeschutz.py. */
let L = null, D = null, NID = null, PID = null, BID = null;
const NAV = $('#navL'), LEISTE = $('#bfl'), V = $('#view'), WORK = $('#work');
const R7 = window.WS_REGELN;
const STUFEN = [['grundlagen', 'Grundlagen', '📋'], ['bauteile', 'Bauteile', '🧱'], ['pruefung', 'Prüfung', '✔'], ['nachweis', 'Nachweis', '📄'], ['eingereicht', 'Eingereicht', '📨']];
const VORHABEN = { aenderung: 'Änderung bestehender Gebäude (§ 36 GModG)', erweiterung: 'Erweiterung / Ausbau', neubau: 'Neubau' };
const IC = { neu: '<path d="M12 5v14M5 12h14"/>', weg: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', kopie: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  wand: '<path d="M4 4h16v16H4z"/><path d="M4 9h16M4 14h16M10 4v5M14 9v5M10 14v6"/>', kat: '<path d="M4 5h6v15H4zM10 5h4v15h-4zM15 6l4-1 2 14-4 1z"/>',
  dreh: '<path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/>', schicht: '<path d="M4 7h16M4 12h16M4 17h16"/>', haken: '<path d="M5 12l4 4 10-10"/>', ablage: '<path d="M4 4h16v4H4zM5 8v12h14V8M10 12h4"/>' };
const zahl = (v, n = 2) => (v == null || !isFinite(v) ? '–' : (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n }));
const deD = (t) => (t && t.length >= 10 ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
const GMODG_AB = '2026-07-29';
const WS_AUF = new Set();   // von Hand aufgeklappte Stufen-Karten
const LS = { get(k) { try { return JSON.parse(localStorage.getItem('ws.' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('ws.' + k, JSON.stringify(v)); } catch { /* egal */ } } };

async function laden(nid) {
  if (!PID) PID = (window.BPHead && BPHead.projektId && BPHead.projektId()) || null;
  L = await api('api/nachweise' + (PID ? '?project_id=' + PID : ''));
  if (nid) NID = nid;
  if (!L.nachweise.some((n) => n.id === NID)) NID = (L.nachweise.find((n) => n.id === LS.get('nid:' + PID)) || L.nachweise[0] || {}).id || null;
  if (NID) LS.set('nid:' + PID, NID);
  D = NID ? await api('api/nachweise/' + NID) : null;
  if (D && !D.bauteile.some((b) => b.id === BID)) BID = (D.bauteile[0] || {}).id || null;
  zeichne();
}

/* Speichern: der Server antwortet mit dem neuen Stand und „vorher“ für Rückgängig */
async function speichern(body, text, still) {
  try {
    const r = await api('api/nachweise/' + NID, 'PUT', body);
    const vorher = r.vorher, nid = NID;
    D = r; delete D.vorher;
    if (!still) zeichne(); else { nav(); const pr = $('#wsPruef'); if (pr) pr.innerHTML = pruefungHtml(); }
    if (text && vorher) rueckgaengig(text, async () => { if (NID !== nid) return; D = await api('api/nachweise/' + nid, 'PUT', { stand: vorher }); delete D.vorher; zeichne(); });
    return r;
  } catch (e) { toast(e.message, true); return null; }
}

const bauteil = () => (D ? D.bauteile.find((b) => b.id === BID) : null);
const zone = () => (D && D.grundlagen.zone) || '19';
const ergebnis = (b) => R7.pruefe(b, zone());
const typName = (t) => (R7.TYPEN.find((x) => x[0] === t) || [, t])[1];

function nav() {
  const P = D ? D.projekt : '';
  if (!D) {
    bpNav(NAV, { kopf: { titel: P || 'Wärmeschutz', klein: PID ? 'kein Nachweis' : 'Projekt oben wählen' }, gruppen: [], attr: 'ws', lage: true,
      fuss: PID ? '<button type="button" class="nneu" data-wsneu>＋ Neuer Nachweis</button>' : '' });
    return;
  }
  const off = D.bauteile.filter((b) => ergebnis(b).ok === false).length;
  const G = [];
  G.push({ titel: 'Nachweis', punkte: [
    { id: 's:grundlagen', text: 'Grundlagen', icon: IC.schicht, farbe: 'var(--c-b)', zahl: D.grundlagen.vorhaben ? '✓' : 'offen' },
    { id: 's:pruefung', text: 'Prüfung', icon: IC.haken, farbe: 'var(--c-v)', zahl: !D.bauteile.length ? '–' : off ? off + ' ✗' : '✓', zahlTip: off ? 'Bauteile über dem Höchstwert' : '' },
    { id: 's:nachweis', text: 'Nachweis', icon: IC.ablage, farbe: 'var(--c-t)', zahl: D.nachweis.status === 'eingereicht' ? 'eingereicht' : '' }] });
  G.push({ titel: 'Bauteile', punkte: [...D.bauteile.map((b) => { const e = ergebnis(b);
    return { id: 'b:' + b.id, text: `${b.kurz || ''} ${b.name || typName(b.typ)}`.trim(), icon: IC.wand, farbe: e.ok === false ? 'var(--c-r)' : e.ok ? 'var(--c-g)' : 'var(--c-o)',
      zahl: e.u == null ? '–' : zahl(e.u) + (e.ok === false ? ' ✗' : e.ok ? ' ✓' : ''), zahlTip: e.umax != null ? 'U max ' + zahl(e.umax) : 'keine Anforderung' }; }),
    { id: 'b+', text: '＋ Bauteil …', icon: IC.neu }] });
  G.push({ titel: 'Datenbank des Büros', punkte: [{ id: 'k', text: 'Bauteilkatalog …', icon: IC.kat }, { id: 'bs', text: 'Baustoffe …', icon: IC.schicht, zahl: String(BS.filter((m) => m.aktiv).length) }] });
  bpNav(NAV, { kopf: { titel: P, klein: VORHABEN[D.grundlagen.vorhaben] ? VORHABEN[D.grundlagen.vorhaben].split(' (')[0] : '' }, davor: '<div class="ws-vm"></div>',
    nachher: (el) => { const b = el.querySelector('.ws-vm'); if (b) versionMenue(b); },
    gruppen: G, aktiv: BID ? 'b:' + BID : '', attr: 'ws', lage: true,
    wahl: (id, e) => navWahl(id, e) });
}
/* Versionen wie überall (Baukasten versionsMenue): ★ = gilt für das Projekt, neue Version = Kopie */
function versionMenue(box) {
  const h = (L.haupt || {})[String(PID)];
  BPHead.versionsMenue({ in: box, wort: 'Version', liste: L.nachweise.map((n) => ({ id: n.id, name: n.name, datum: (STUFEN.find((s) => s[0] === n.status) || [, ''])[1] })), aktuell: NID,
    gueltig: L.nachweise.some((n) => n.id === h) ? h : (L.nachweise[0] || {}).id, fragen: false, giltText: '★ gilt für das Projekt', neuText: '⧉ Neue Version (Kopie) …',
    onWahl: async (id) => { BID = null; await laden(+id); },
    onGueltig: async (id) => { try { await api(`api/nachweise/${id}/haupt`, 'PUT'); L = await api('api/nachweise?project_id=' + PID); nav(); toast('Diese Version gilt jetzt für das Projekt.'); } catch (er) { toast(er.message, true); } },
    onNeu: () => versionNeu(), onUmbenennen: () => versionUmbenennen(), onVerwalten: () => nachweisLoeschen() });
}
async function versionNeu() {
  const n = await bpEingabe('Neue Version – Name', (D ? D.nachweis.name + ' – ' : '') + new Date().toLocaleDateString('de-DE'), { ok: 'Anlegen' }); if (n == null) return;
  try { const r = await api('api/nachweise', 'POST', { project_id: PID, name: n, grundlagen: D ? D.grundlagen : undefined, bauteile: D ? D.bauteile : [] });
    BID = null; await laden(r.nachweis.id); toast('Neue Version angelegt.'); } catch (er) { toast(er.message, true); }
}
async function versionUmbenennen() {
  const n = await bpEingabe('Version umbenennen', D.nachweis.name, { ok: 'Umbenennen' }); if (n == null || !n.trim()) return;
  await speichern({ name: n.trim() }, 'Version umbenannt'); L = await api('api/nachweise?project_id=' + PID); nav();
}
function navWahl(id, e) {
  if (id.startsWith('n:')) { BID = null; laden(+id.slice(2)); return; }
  if (id.startsWith('s:')) { const k = V.querySelector(`[data-karte="${id.slice(2)}"]`); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  if (id === 'b+') { bauteilNeu(e && e.target.closest('button')); return; }
  if (id === 'k') { katalogZeigen(); return; }
  if (id === 'bs') { baustoffeZeigen(); return; }
  if (id.startsWith('b:')) { BID = id.slice(2); WS_AUF.add('bauteile'); zeichne(); const k = V.querySelector('[data-karte="bauteile"]'); if (k) k.scrollIntoView({ block: 'start' }); }
}

function leiste() {
  const K = (t, ic, fn, o = {}) => ({ t, ic, fn, tip: o.tip || t, aus: !!o.aus, rot: !!o.rot });
  const b = bauteil(), mitS = b && !R7.ohneSchichten(b.typ);
  befehle(LEISTE, [
    { titel: 'Bauteil', knoepfe: [K('Neu', IC.neu, (e) => bauteilNeu(e.target.closest('button')), { aus: !D, tip: 'Neues Bauteil: Art wählen, Musteraufbau oder aus dem Katalog' }),
      K('Kopieren', IC.kopie, bauteilKopie, { aus: !b }), K('In Katalog', IC.kat, katalogSpeichern, { aus: !mitS, tip: 'Aufbau in den Bauteilkatalog des Büros übernehmen' })] },
    { titel: 'Schicht', knoepfe: [K('Neu', IC.schicht, () => schichtNeu(), { aus: !mitS }), K('Umdrehen', IC.dreh, schichtenUmdrehen, { aus: !mitS, tip: 'Reihenfolge innen ↔ außen tauschen' })] },
    { titel: 'Bearbeiten', rechts: true, knoepfe: [K('Bauteil löschen', IC.weg, bauteilLoeschen, { aus: !b, rot: true }), K('Nachweis löschen', IC.weg, nachweisLoeschen, { aus: !D, rot: true, tip: 'Nachweis in den Papierkorb legen' })] },
  ]);
}

function zeichne() {
  nav(); leiste();
  if (!PID) { V.innerHTML = '<div class="leer">Oben in der Kopfleiste ein Projekt wählen.</div>'; return; }
  if (!D) { V.innerHTML = '<div class="leer">Noch kein Wärmeschutznachweis für dieses Projekt. Links „＋ Neuer Nachweis“ – die Grundlagen kommen aus dem Bauantrag.</div>'; return; }
  const st = D.nachweis.status, cur = STUFEN.findIndex((s) => s[0] === st);
  const off = D.bauteile.filter((b) => ergebnis(b).ok === false).length;
  const sub = { grundlagen: fassung().kurz, bauteile: `${D.bauteile.length} Bauteil${D.bauteile.length === 1 ? '' : 'e'}${off ? ' · ' + off + ' ✗' : ''}`,
    pruefung: 'Anlage 7, DIN 4108', nachweis: 'Zusammenstellung', eingereicht: D.grundlagen.eingereicht ? deD(D.grundlagen.eingereicht) : 'mit dem Bauantrag' };
  const flow = STUFEN.map(([k, t], i) => `<button type="button" class="bp-stufe${i < cur ? ' ok' : i === cur ? ' cur' : ''}${k === 'bauteile' && off ? ' fehlt' : ''}" data-wsstufe="${k}" title="Stufe „${t}“ setzen"><b>${t}</b><small>${esc(sub[k])}</small></button>`).join('');
  // nur die aktuelle Stufe ist offen, die anderen sind eine Zeile mit dem Wichtigsten (▸ öffnen)
  const kurz = { grundlagen: [D.grundlagen.nutzung, (VORHABEN[D.grundlagen.vorhaben] || '').split(' (')[0], zone() === '12' ? '12–19 °C' : '≥ 19 °C', fassung().kurz].filter(Boolean).join(' · '),
    bauteile: sub.bauteile, pruefung: pruefKurz(), nachweis: 'PDF folgt in der nächsten Ausbaustufe', eingereicht: D.grundlagen.eingereicht ? 'am ' + deD(D.grundlagen.eingereicht) : '' };
  const k = (i, key, ic, titel, inhalt, knopf) => { const auf = i === cur || WS_AUF.has(key);
    return `<div class="ws-k${i < cur ? ' fertig' : i === cur ? ' jetzt' : ' spaeter'}${auf ? '' : ' zu'}" data-karte="${key}"><h3 data-wsauf="${key}"${i === cur ? '' : ' title="öffnen / schließen"'}>${ic} ${titel}${auf ? '' : `<span class="ws-kurz">${esc(kurz[key] || '')}</span>`}<span class="mute">${i === cur ? 'aktuell' : (auf ? '▾ schließen' : '▸ öffnen')}</span></h3>${auf ? inhalt + (knopf && i === cur ? `<div class="ws-knopf">${knopf}</div>` : '') : ''}</div>`; };
  const weiter = (s, t) => `<button type="button" class="btn sm pri" data-wsweiter="${s}">${t} ›</button>`;
  const pos = V.scrollTop, fokus = document.activeElement && document.activeElement.dataset && (document.activeElement.dataset.wsg || document.activeElement.dataset.bk) ? document.activeElement : null;
  const fsel = fokus ? (fokus.dataset.wsg ? `[data-wsg="${fokus.dataset.wsg}"]` : `[data-bk="${fokus.dataset.bk}"]`) : '';
  V.innerHTML = `<div class="ws-w"><div class="bp-stufen" role="group" aria-label="Ablauf">${flow}</div>
    ${k(0, 'grundlagen', '📋', 'Grundlagen', grundlagenHtml(), weiter('bauteile', 'Bauteile'))}
    ${k(1, 'bauteile', '🧱', 'Bauteile', bauteilKarte(), weiter('pruefung', 'Prüfung'))}
    ${k(2, 'pruefung', '✔', 'Prüfung', `<div id="wsPruef">${pruefungHtml()}</div>`, weiter('nachweis', 'Nachweis'))}
    ${k(3, 'nachweis', '📄', 'Nachweis', `<p class="ws-hin">Die Zusammenstellung als PDF auf dem Briefbogen (mit Unterschrift und Ablage im Projektordner) kommt in der nächsten Ausbaustufe. Bis dahin: Prüfung oben.</p>`, weiter('eingereicht', 'Eingereicht'))}
    ${k(4, 'eingereicht', '📨', 'Eingereicht', `<div class="ws-f"><label>eingereicht am<input type="date" data-wsg="eingereicht" value="${esc(D.grundlagen.eingereicht || '')}"></label></div>`)}</div>`;
  V.scrollTop = pos;
  if (fsel) { const f = V.querySelector(fsel); if (f) f.focus(); }
  if (!WORK.querySelector(':scope > .sr-r')) bereich();
  bauteilNachher();
}

/* Welche Fassung gilt: Datum des Bauantrags (bzw. Bauanzeige; verfahrensfrei: Baubeginn) – § 111 Abs. 2 GModG */
function fassung() {
  const g = D.grundlagen, ba = D.bauantrag || {};
  const d = g.antrag_datum || ba.eingereicht || new Date().toISOString().slice(0, 10);
  return d >= GMODG_AB ? { kurz: 'GModG', lang: `GModG (seit 29.07.2026) – maßgeblich: ${g.antrag_datum ? 'Antragsdatum' : ba.eingereicht ? 'Bauantrag eingereicht' : 'heute, Antrag noch nicht gestellt'} ${deD(d)}` }
    : { kurz: 'GEG 2024', lang: `GEG 2024 – Antrag vor dem 29.07.2026 (${deD(d)}); Höchstwerte der Anlage 7 sind gleich` };
}
function grundlagenHtml() {
  const g = D.grundlagen, ba = D.bauantrag;
  const q = (k, wert) => (ba && ba[k] && String(ba[k]) === String(wert || '') ? '<span class="ws-q">aus dem Bauantrag</span>' : '');
  return `<div class="ws-f">
      <label>Vorhaben<select data-wsg="vorhaben">${Object.entries(VORHABEN).map(([v, t]) => `<option value="${v}"${g.vorhaben === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Nutzung ${q('nutzung', g.nutzung)}<input data-wsg="nutzung" value="${esc(g.nutzung || '')}" placeholder="z. B. Wohngebäude"></label>
      <label>Gebäudeklasse ${q('gebaeudeklasse', g.gebaeudeklasse)}<select data-wsg="gebaeudeklasse">${['', '1', '2', '3', '4', '5'].map((v) => `<option value="${v}"${String(g.gebaeudeklasse || '') === v ? ' selected' : ''}>${v || '–'}</option>`).join('')}</select></label>
      <label>Baujahr<input data-wsg="baujahr" value="${esc(g.baujahr || '')}" placeholder="z. B. 1962" style="width:6rem" inputmode="numeric"></label>
      <label>Innentemperatur<select data-wsg="zone"><option value="19"${zone() === '19' ? ' selected' : ''}>≥ 19 °C (Wohnen, Büro)</option><option value="12"${zone() === '12' ? ' selected' : ''}>12 bis &lt; 19 °C</option></select></label>
      <label>Antragsdatum<input type="date" data-wsg="antrag_datum" value="${esc(g.antrag_datum || '')}" title="leer = Datum der Einreichung aus dem Bauantrag"></label>
      <label>Außenwand gesamt (m²)<input data-wsg="flaeche_aw" value="${esc(g.flaeche_aw || '')}" style="width:7rem" inputmode="decimal" title="für die 10-%-Regel (§ 36 Satz 2)"></label></div>
    <p class="ws-hin"><b>${esc(fassung().lang)}</b>${ba ? ` · Bauantrag „${esc(ba.name)}“ (${esc(ba.status)})` : ' · kein Bauantrag im Projekt – Angaben von Hand'}.
      ${g.vorhaben === 'neubau' ? ' Neubau: Der Gesamtnachweis (Referenzgebäude, §§ 15 ff.) ist nicht Teil dieses Bauteilnachweises – die U-Werte hier dienen als Angabe.' : ''}
      ${+g.baujahr && +g.baujahr > 1983 ? ' Bauteile nach dem 31.12.1983 errichtet: bei manchen Maßnahmen entfällt die Anforderung (Anlage 7, Fußnoten 2 und 5).' : ''}</p>`;
}
function pruefKurz() {
  if (!D.bauteile.length) return 'noch keine Bauteile';
  const E = D.bauteile.map(ergebnis), no = E.filter((e) => e.ok === false).length, of = E.filter((e) => e.ok == null).length;
  const aw = D.bauteile.filter((b) => b.typ === 'wand').reduce((s, b) => s + (+b.flaeche || 0), 0), ges = parseFloat(String(D.grundlagen.flaeche_aw || '').replace(',', '.'));
  return [`${D.bauteile.length} Bauteil${D.bauteile.length === 1 ? '' : 'e'}`, no ? `${no} zu hoch ✗` : of ? `${of} offen` : 'alle erfüllt ✓', aw && ges ? `10-%-Regel: ${zahl(aw / ges * 100, 0)} % → ${aw / ges > 0.1 ? 'gilt' : 'gilt nicht'}` : ''].filter(Boolean).join(' · ');
}
function pruefungHtml() {
  if (!D.bauteile.length) return '<p class="ws-hin">Noch keine Bauteile.</p>';
  const rows = D.bauteile.map((b) => { const e = ergebnis(b), m = R7.massnahmen(b.typ).find((x) => x.k === b.massnahme);
    const ch = e.ok == null ? '<span class="ws-ch of">offen</span>' : e.ok ? '<span class="ws-ch ok">✓ erfüllt</span>' : '<span class="ws-ch no">✗ zu hoch</span>';
    const tw = e.r && e.r.glaser ? (e.r.glaser.tauwasser ? `${zahl(e.r.glaser.mc, 3)} kg/m²` : 'kein') : '–';
    const fr = e.r ? (e.r.frsi >= 0.7 ? '✓ ' : '✗ ') + zahl(e.r.frsi) : '–';
    return `<tr><td>${esc(b.kurz || '')} ${esc(b.name || typName(b.typ))}</td><td>${m ? 'Nr. ' + m.k : '<span class="mute">Maßnahme wählen</span>'}</td><td class="r">${b.flaeche ? zahl(b.flaeche, 1) + ' m²' : ''}</td>
      <td class="r">${zahl(e.u)}</td><td class="r">${e.umax == null ? (m ? 'keine' : '–') : zahl(e.umax)}</td><td>${ch}</td><td class="r">${tw}</td><td class="r">${fr}</td></tr>`; }).join('');
  const aw = D.bauteile.filter((b) => b.typ === 'wand').reduce((s, b) => s + (+b.flaeche || 0), 0), ges = parseFloat(String(D.grundlagen.flaeche_aw || '').replace(',', '.'));
  const zehn = aw && ges ? `<p class="ws-hin"><b>10-%-Regel (§ 36 Satz 2):</b> geänderte Außenwand ${zahl(aw, 1)} m² von ${zahl(ges, 1)} m² = ${zahl(aw / ges * 100, 0)} % → ${aw / ges > 0.1 ? 'Anforderungen gelten.' : 'unter 10 % – die Anforderungen der Anlage 7 gelten nicht.'}</p>` : '';
  return `<table class="ws-pt"><thead><tr><th>Bauteil</th><th>Anlage 7</th><th class="r">Fläche</th><th class="r">U</th><th class="r">U max</th><th></th><th class="r">Tauwasser</th><th class="r">fRsi ≥ 0,70</th></tr></thead><tbody>${rows}</tbody></table>${zehn}
    <p class="ws-hin">U in W/(m²K) nach DIN EN ISO 6946, Tauwasser nach DIN 4108-3 (Glaser, −5/20 °C), Mindestwärmeschutz DIN 4108-2 (fRsi). Richtwerte der Baustoffe – für den Nachweis die Bemessungswerte der eingebauten Produkte eintragen.</p>`;
}

/* ---------- Ereignisse ---------- */
V.addEventListener('click', (e) => {   // Stufen-Karte auf- und zuklappen (die aktuelle bleibt offen)
  const h = e.target.closest('[data-wsauf]'); if (!h || e.target.closest('button,input,select,a')) return;
  const k = h.dataset.wsauf; if (D && k === D.nachweis.status) return;
  if (WS_AUF.has(k)) WS_AUF.delete(k); else WS_AUF.add(k);
  zeichne();
});
document.addEventListener('change', (e) => {
  const f = e.target.closest && e.target.closest('[data-wsg]'); if (!f || !D) return;
  speichern({ grundlagen: { [f.dataset.wsg]: f.value } }, 'Grundlagen geändert');
});
document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-wsstufe],[data-wsweiter],[data-wsneu]'); if (!t) return;
  if (t.dataset.wsneu != null) { nachweisNeu(); return; }
  const s = t.dataset.wsstufe || t.dataset.wsweiter;
  await speichern({ status: s }, `Stufe „${(STUFEN.find((x) => x[0] === s) || [, s])[1]}“`);
  if (t.dataset.wsweiter) { const k = V.querySelector(`[data-karte="${s}"]`); if (k) k.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
});
async function nachweisNeu() {
  if (!PID) { toast('Oben ein Projekt wählen.', true); return; }
  const n = await bpEingabe('Neuer Wärmeschutznachweis – Name', 'Wärmeschutznachweis', { ok: 'Anlegen' }); if (n == null) return;
  try { const r = await api('api/nachweise', 'POST', { project_id: PID, name: n }); BID = null; await laden(r.nachweis.id); toast('Nachweis angelegt – Grundlagen aus dem Bauantrag übernommen.'); } catch (er) { toast(er.message, true); }
}
async function nachweisLoeschen() {
  if (!D || !(await bpFrage(`Nachweis „${D.nachweis.name}“ in den Papierkorb legen?`, { ok: 'Löschen' }))) return;
  try { const r = await api('api/nachweise/' + NID, 'DELETE'), pk = r.papierkorb;
    rueckgaengig('Nachweis gelöscht', async () => { await api('api/bp/papierkorb/' + pk + '/zurueck', 'POST'); await laden(); });
    NID = null; await laden(); } catch (er) { toast(er.message, true); }
}

(async () => {
  const ME = await api('api/me'); applyLook(ME);
  const PC = await api('api/platform');
  await header('Wärmeschutz', ME, PC);
  bpNav.breite(NAV, { key: 'waermeschutz' });
  await baustoffeLaden();
  if (BPHead.beiProjektWahl) BPHead.beiProjektWahl(async (id) => { PID = +id; NID = null; BID = null; await laden(); });
  await laden();
  BPHead.live(['ws_nachweis', 'projects'], async () => { await laden(); BPHead.liveNotiz(); }, { projekt: false });   // Änderungen anderer
})().catch((e) => { V.innerHTML = `<div class="leer">${esc(e.message)}</div>`; });
