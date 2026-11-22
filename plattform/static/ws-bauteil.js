'use strict';
/* Wärmeschutz – Karte „Bauteile“: das links gewählte Bauteil mit Art, Maßnahme nach Anlage 7, Fläche und den Schichten (innen → außen).
   Tippen rechnet sofort (U-Wert, Temperaturen, Tauwasser, fRsi, Phasenverschiebung, Querschnitt); gespeichert wird beim Verlassen des Feldes.
   Schichten, Querschnitt, Gefache und Ergebnisleiste: ws-schichten.js.
   Neues Bauteil leer, als Musteraufbau oder aus dem Bauteilkatalog des Büros. Nutzt aus ws-kern.js: D, BID, R7, speichern, zeichne, zahl, typName. */
/* Baustoffe aus der Datenbank (ws-kern.js lädt sie beim Start: baustoffeLaden). Herstellerprodukte stehen je Kategorie mit dem Herstellernamen. */
let BS = [], BSI = {};
function baustoffeSetzen(L) { BS = L; BSI = Object.fromEntries(L.map((m) => [m.id, m])); window.WS_BAUSTOFFE = L; }
async function baustoffeLaden() { baustoffeSetzen((await api('api/baustoffe')).baustoffe.map(wsBaustoff)); }
const bsName = (m) => (m.hersteller ? `${m.hersteller} ${m.name}` : m.name);
const baustoffWahl = (wert, attr) => {   // Knopf mit Name und λ – öffnet die Baustoff-Wahl mit Suche und Filtern (bsWaehlen, ws-datenbank.js; 19.11.2026)
  const m = BSI[wert], t = !wert ? '– Baustoff wählen –' : m ? `${bsName(m)} · λ ${m.lambda ? String(m.lambda).replace('.', ',') : '–'}` : 'Freier Baustoff (λ von Hand)';
  return `<button type="button" class="ws-bsb" ${attr} data-bswert="${esc(wert || '')}" title="${esc(m ? [m.kat, m.quelle, m.stand && 'Stand ' + m.stand, m.hinweis].filter(Boolean).join(' · ') : 'Baustoff wählen')}">${esc(t)}</button>`; };
const ntz = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const pz = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };

function bauteilKarte() {
  const b = bauteil();
  if (!b) return modellHtml() + `<p class="ws-hin">Noch kein Bauteil. Oben „Bauteil → Neu“ oder links „＋ Bauteil …“: leer, als Musteraufbau oder aus dem Bauteilkatalog des Büros. Was Baukosten (IFC) und Planungsassistent zur Hülle wissen, erscheint hier von selbst als Hinweis.</p>`;
  const M = R7.massnahmen(b.typ), ohne = R7.ohneSchichten(b.typ);
  const kopf = modellHtml() + `<div class="ws-f ws-bk">
      <label>Kürzel<input data-bk="kurz" value="${esc(b.kurz || '')}" style="width:4.2rem"></label>
      <label class="w">Bezeichnung<input data-bk="name" value="${esc(b.name || '')}" placeholder="${esc(typName(b.typ))}"></label>
      <label>Art<select data-bk="typ">${R7.TYPEN.map(([k, t]) => `<option value="${k}"${b.typ === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="w2">Maßnahme (Anlage 7 GModG)<select data-bk="massnahme"><option value="">– keine Anforderung / Neubau –</option>${M.map((m) => { const u = zone() === '12' ? m.u12 : m.u19;
        return `<option value="${m.k}"${b.massnahme === m.k ? ' selected' : ''}>${m.k} ${esc(m.n)} – ${u == null ? 'keine Anforderung' : 'U max ' + zahl(u)}</option>`; }).join('')}</select></label>
      <label>Fläche (m²)<input data-bk="flaeche" value="${ntz(b.flaeche)}" style="width:5rem" inputmode="decimal"></label>
      ${ohne ? `<label>U-Wert laut Datenblatt<input data-bk="uw" value="${ntz(b.uw)}" style="width:6rem" inputmode="decimal" placeholder="z. B. 0,95"></label>` : ''}</div>${herkunftHtml(b)}`;
  if (ohne) return kopf + `<div class="ws-ampel ${ergebnisKl(b)}" id="wsErg">${ergebnisLeiste(b)}</div><p class="ws-hin">Fenster und Türen: U-Wert (Uw, Ug bzw. Uc je nach Maßnahme) aus dem Datenblatt des Herstellers.</p>`;
  return kopf + schichtenHtml(b);   // Schichtaufbau: ws-schichten.js (Mock „Schichtaufbau neu“, 22.11.2026)
}

/* Nur die Rechenwerte neu (beim Tippen), ohne die Eingabefelder anzufassen */
function ergebnisNeu() {
  const b = bauteil(); if (!b) return;
  rechtsNeu();
  schichtenNeu(b);
}
function bauteilNachher() { if (bauteil()) ergebnisNeu(); else rechtsNeu(); }

/* ---------- Ändern ---------- */
const bauteilSpeichern = (text, still) => { const b = bauteil(); if (b) return speichern({ bauteil: b }, text, still); };
V.addEventListener('input', (e) => {
  const b = bauteil(); if (!b) return;
  const f = e.target.closest('[data-bk],[data-sk]'); if (!f || f.tagName === 'SELECT') return;
  if (f.dataset.bk) { const k = f.dataset.bk; b[k] = ['flaeche', 'uw'].includes(k) ? pz(f.value) : f.value; }
  else { const s = b.schichten[+f.dataset.si], k = f.dataset.sk; if (!s) return; if (k === 'name') s.name = f.value; else { const v = pz(f.value); if (v == null) delete s[k]; else s[k] = v; } f.classList.toggle('hand', ['lam', 'mu', 'sd'].includes(k) && f.value !== ''); }
  ergebnisNeu();
});
V.addEventListener('change', (e) => {
  const b = bauteil(); if (!b) return;
  const f = e.target.closest('[data-bk],[data-sk]'); if (!f) return;
  if (f.tagName !== 'SELECT') { bauteilSpeichern('Bauteil geändert', true); return; }
  if (f.dataset.bk) {
    b[f.dataset.bk] = f.value;
    if (f.dataset.bk === 'typ') { const M = R7.massnahmen(f.value); b.massnahme = (M[0] || {}).k || ''; if (R7.ohneSchichten(f.value)) b.schichten = []; }
  } else { const s = b.schichten[+f.dataset.si]; if (s) { s[f.dataset.sk] = f.value; if (f.dataset.sk === 'm') { delete s.lam; delete s.mu; delete s.sd; } } }
  bauteilSpeichern('Bauteil geändert');
});
V.addEventListener('click', (e) => {   // Baustoff einer Schicht bzw. eines Gefachs wählen
  const k = e.target.closest('.ws-bsb[data-sk]'), b = bauteil(); if (!k || !b) return;
  const s = b.schichten[+k.dataset.si]; if (!s) return;
  bsWaehlen(k.dataset.bswert, (id) => { s[k.dataset.sk] = id; if (k.dataset.sk === 'm') { delete s.lam; delete s.mu; delete s.sd; } bauteilSpeichern('Baustoff gewählt'); }, k.dataset.sk === 'm2' ? 'Baustoff im Gefach' : 'Baustoff der Schicht');
});
function schichtNeu() {
  const b = bauteil(); if (!b || R7.ohneSchichten(b.typ)) return;
  b.schichten.push({ m: 'mw_035', d: 10 });
  bauteilSpeichern('Schicht hinzugefügt');
}
function schichtenUmdrehen() { const b = bauteil(); if (!b) return; b.schichten.reverse(); bauteilSpeichern('Schichten umgedreht'); }

/* ---------- Bauteile anlegen, kopieren, löschen ---------- */
function kurzNeu(typ) {
  const p = (R7.TYPEN.find((x) => x[0] === typ) || [, , 'B'])[2], n = D.bauteile.filter((b) => (b.kurz || '').startsWith(p + ' ')).length + 1;
  return `${p} ${n}`;
}
async function bauteilAnlegen(x, text) {
  const b = { id: Math.random().toString(36).slice(2, 12), typ: x.typ || 'wand', kurz: kurzNeu(x.typ || 'wand'), name: x.name || '', massnahme: (R7.massnahmen(x.typ || 'wand')[0] || {}).k || '',
    flaeche: x.flaeche || null, schichten: (x.schichten || []).map((s) => ({ ...s })) };
  if (D.grundlagen.vorhaben === 'neubau') b.massnahme = '';
  const r = await speichern({ bauteil: b }, text);
  if (r) { BID = b.id; zeichne(); }
}
let KAT = null;
async function bauteilNeu(anker) {
  if (!D) return;
  if (!KAT) { try { KAT = (await api('api/katalog')).katalog; } catch { KAT = []; } }
  const items = [...R7.TYPEN.map(([k, t]) => ({ value: 't:' + k, title: t, group: 'Leer' })),
    ...(window.WS_VORLAGEN || []).map((v, i) => ({ value: 'v:' + i, title: v.name, sub: typName(v.typ), group: 'Muster · ' + (v.gruppe || typName(v.typ)) })),
    ...KAT.map((k) => ({ value: 'k:' + k.id, title: k.name, sub: `${typName(k.typ)} · ${k.von || ''}`, group: 'Bauteilkatalog des Büros' }))];
  pickMenu(anker || LEISTE, { search: 'Bauteil suchen …', items, onPick: (v) => {
    const [a, k] = [v[0], v.slice(2)];
    if (a === 't') bauteilAnlegen({ typ: k }, 'Bauteil angelegt');
    else if (a === 'v') { const x = window.WS_VORLAGEN[+k]; bauteilAnlegen({ typ: x.typ, name: x.name, schichten: x.schichten }, 'Musteraufbau übernommen'); }
    else { const x = KAT.find((y) => y.id === +k); if (x) bauteilAnlegen({ typ: x.typ, name: x.name, schichten: x.schichten }, 'Aus dem Katalog übernommen'); }
  } });
}
function bauteilKopie() { const b = bauteil(); if (b) bauteilAnlegen({ ...b, name: (b.name || typName(b.typ)) + ' (Kopie)' }, 'Bauteil kopiert'); }
async function bauteilLoeschen() {
  const b = bauteil(); if (!b) return;
  const i = D.bauteile.indexOf(b), r = await speichern({ bauteil_weg: b.id }, `Bauteil „${b.kurz || ''} ${b.name || ''}“ gelöscht`);
  if (r) { BID = (D.bauteile[Math.max(0, i - 1)] || {}).id || null; zeichne(); }
}

/* ---------- Bauteilkatalog des Büros ---------- */
async function katalogSpeichern() {
  const b = bauteil(); if (!b || !b.schichten.length) return;
  const n = await bpEingabe('Name im Bauteilkatalog', b.name || typName(b.typ), { ok: 'Übernehmen' }); if (n == null || !n.trim()) return;
  try { await api('api/katalog', 'POST', { name: n.trim(), typ: b.typ, schichten: b.schichten }); KAT = null; toast('In den Bauteilkatalog übernommen.'); } catch (er) { toast(er.message, true); }
}
async function katalogZeigen() {
  try { KAT = (await api('api/katalog')).katalog; } catch (er) { toast(er.message, true); return; }
  const aufbau = (k) => k.schichten.map((x) => { const m = BSI[x.m]; return `${esc(x.name || (m ? bsName(m) : 'frei'))} ${String(x.d).replace('.', ',')} cm`; }).join(' · ');
  const uk = (k) => { const e = R7.pruefe({ typ: k.typ, schichten: k.schichten }, '19'); return e.u == null ? '' : ' · U ' + zahl(e.u, 3); };
  const zeile = (k) => `<tr><td><b>${esc(k.name)}</b><br><small class="mute">${esc(typName(k.typ))}${uk(k)} · ${esc(k.von || '')}</small><br><small>${aufbau(k)}</small></td>
    <td class="r"><button type="button" class="btn sm" data-m="rein" data-k="${k.id}"${D ? '' : ' disabled'}>Ins Projekt</button> <button type="button" class="btn sm" data-m="weg" data-k="${k.id}" title="in den Papierkorb">🗑</button></td></tr>`;
  modalBox(`<h3>Bauteilkatalog des Büros</h3><p class="mute" style="font-size:.85rem">Aufbauten zum Wiederverwenden – aus einem Bauteil mit „Bauteil → In Katalog“.</p>
    <div style="max-height:55vh;overflow:auto"><table class="ws-pt" data-volle><tbody>${KAT.length ? KAT.map(zeile).join('') : '<tr><td class="mute">Noch leer.</td></tr>'}</tbody></table></div>
    <div class="btns"><button type="button" class="btn" data-m="zu">Schließen</button></div>`, async (m, bg, close, btn) => {
    if (m === 'zu') { close(); return; }
    const k = KAT.find((x) => x.id === +btn.dataset.k); if (!k) return;
    if (m === 'rein') { close(); bauteilAnlegen({ typ: k.typ, name: k.name, schichten: k.schichten }, 'Aus dem Katalog übernommen'); return; }
    if (m === 'weg') { try { const r = await api('api/katalog/' + k.id, 'DELETE'), pk = r.papierkorb; KAT = KAT.filter((x) => x !== k); btn.closest('tr').remove();
      rueckgaengig('Aus dem Katalog gelöscht', async () => { await api('api/bp/papierkorb/' + pk + '/zurueck', 'POST'); KAT = null; }, { neu: async () => { KAT = null; } }); } catch (er) { toast(er.message, true); } }
  });
}

/* ---------- Projektmodell (Server: waermeschutz_modell.py, Kern: bpcore/huelle.py) – Bauteile der Hülle kommen aus den Quellen des Projekts
   (Baukosten/IFC, Planungsassistent). Was dort neu ist oder sich ändert, wartet hier als Hinweis; geändert wird nur auf Knopfdruck. ---------- */
// MOD (ws-kern.js): { hinweise: [{ id, art: neu|flaeche|vorschlag, titel, text, quelle, typ }], linie, quellen } – nach dem Laden geholt
async function modellLaden() {
  const nid = NID; if (!nid) { MOD = null; return; }
  try { const m = await api(`api/nachweise/${nid}/modell`); if (nid !== NID) return; const vor = MOD ? MOD.hinweise.length : 0; MOD = m; if (m.hinweise.length || vor) zeichne(); }
  catch { MOD = null; }   // ohne Modell geht der Nachweis genauso
}
function modellHtml() {
  const H = MOD ? MOD.hinweise.filter((h) => wsSicht(h) && !(h.art === 'neu' && wsZeileVon(h.ref) && wsHu().has(wsZeileVon(h.ref)))) : []; if (!H.length) return '';   // „neu“ aus dem Gebäudemodell: im Baum links („＋ in den Nachweis“, WB-4 A)
  const arten = R7.TYPEN.filter(([k]) => k !== 'innenwand');
  return `<div class="ws-mod"><div class="ws-modk"><span class="ws-modz">${H.length}</span><b>${H.length === 1 ? 'Hinweis' : 'Hinweise'} aus dem Projektmodell – nichts wird ohne dich geändert</b></div>
    <ul>${H.map((h) => `<li data-wshin="${h.id}"${h.ref ? ' title="Anklicken: im 3D-Modell zeigen"' : ''}><div class="t"><b>${esc(h.titel)}</b><p>${esc(h.text)}</p><small>Quelle: ${esc(h.quelle)}</small></div>
      ${h.art === 'neu' && !h.typ ? `<select data-wsmodtyp="${h.id}" aria-label="Art im Nachweis"><option value="">– Art wählen –</option>${arten.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select>` : ''}
      <button type="button" class="btn sm pri" data-wsmod="uebernehmen" data-hid="${h.id}">${h.art === 'flaeche' ? 'Übernehmen' : 'Anlegen'}</button>
      <button type="button" class="btn sm" data-wsmod="ablehnen" data-hid="${h.id}">${h.art === 'flaeche' ? 'So lassen' : 'Nicht nötig'}</button></li>`).join('')}</ul></div>`;
}
const herkunftHtml = (b) => { const r = b.ref || (b.bk ? 'bk:' + b.bk : '');
  return `<p class="ws-hin ws-her">${b.einordnung ? `<span class="mute">${esc(b.einordnung)}</span> · ` : ''}Herkunft: ${r.startsWith('bk:') ? '<span class="ws-tag">Projektmodell · Baukosten</span>' : r.startsWith('as:') ? '<span class="ws-tag w">Projektmodell · Vorschlag des Assistenten</span>' : '<span class="ws-tag m">von Hand</span>'}
    ${(b.schichten || []).length || b.uw > 0 ? '<button type="button" class="btn sm" data-wszurueck title="Den festgelegten Aufbau als Hinweis an Kosten und Ausschreibung geben – dort entscheidet wieder ein Mensch">Aufbau an Kosten und Ausschreibung melden</button>' : ''}</p>`; };
async function modellEntscheiden(hid, tun, typ) {   // typ: Art im Nachweis, wenn sie schon feststeht (Baum links: aus der Hülle des Kerns)
  const sel = typ ? null : V.querySelector(`[data-wsmodtyp="${hid}"]`);
  if (tun === 'uebernehmen' && sel && !sel.value) { toast('Bitte erst die Art wählen – z. B. Kellerdecke oder oberste Geschossdecke.', true); sel.focus(); return; }
  try {
    const r = await api(`api/nachweise/${NID}/modell`, 'POST', { hid, tun, typ: typ || (sel ? sel.value : undefined) }), vorher = r.vorher, nid = NID, n0 = D.bauteile.length;
    MOD = r.modell; delete r.modell; D = r; delete D.vorher;
    if (D.bauteile.length > n0) BID = D.bauteile[D.bauteile.length - 1].id;   // das neue Bauteil gleich zeigen
    zeichne();
    if (tun === 'uebernehmen') rueckgaengig('Aus dem Projektmodell übernommen', async () => { if (NID !== nid) return; D = await api('api/nachweise/' + nid, 'PUT', { stand: vorher }); delete D.vorher; zeichne(); modellLaden(); }, { neu: async () => { if (NID === nid) { D = await api('api/nachweise/' + nid); zeichne(); } } });
  } catch (er) { toast(er.message, true); modellLaden(); }
}
async function modellZurueck() {
  const b = bauteil(); if (!b) return;
  let oeffnen = false;
  if (MOD && MOD.linie.richtung === 'zur_app') {
    if (!(await bpFrage('Die Linie zum Projektmodell zeigt bisher nur zum Wärmeschutz. Für beide Richtungen öffnen und den Aufbau als Hinweis an Kosten und Ausschreibung geben?', { ok: 'Öffnen und melden' }))) return;
    oeffnen = true;
  }
  try {
    const r = await api(`api/nachweise/${NID}/modell/zurueck`, 'POST', { bid: b.id, oeffnen, u: ergebnis(b).u });
    if (oeffnen && MOD) MOD.linie.richtung = 'beide';
    toast(r.gesendet ? 'Als Hinweis an Kosten und Ausschreibung gegeben.' : 'Dieser Aufbau liegt dort schon als Hinweis.');
  } catch (er) { toast(er.message, true); }
}
V.addEventListener('click', (e) => {
  const m = e.target.closest('[data-wsmod]'); if (m) { modellEntscheiden(+m.dataset.hid, m.dataset.wsmod); return; }
  if (e.target.closest('[data-wszurueck]')) modellZurueck();
});
