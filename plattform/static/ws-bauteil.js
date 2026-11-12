'use strict';
/* Wärmeschutz – Karte „Bauteile“: das links gewählte Bauteil mit Art, Maßnahme nach Anlage 7, Fläche und den Schichten (innen → außen).
   Tippen rechnet sofort (U-Wert, Temperaturen, Tauwasser, fRsi, Phasenverschiebung, Querschnitt); gespeichert wird beim Verlassen des Feldes.
   Gefach (Sparren/Ständer): zweiter Baustoff mit Breite und Achsabstand → U-Wert nach DIN EN ISO 6946 (obere/untere Grenze).
   Neues Bauteil leer, als Musteraufbau oder aus dem Bauteilkatalog des Büros. Nutzt aus ws-kern.js: D, BID, R7, speichern, zeichne, zahl, typName. */
/* Baustoffe aus der Datenbank (ws-kern.js lädt sie beim Start: baustoffeLaden). Herstellerprodukte stehen je Kategorie mit dem Herstellernamen. */
let BS = [], BSI = {};
function baustoffeSetzen(L) { BS = L; BSI = Object.fromEntries(L.map((m) => [m.id, m])); window.WS_BAUSTOFFE = L; }
async function baustoffeLaden() { baustoffeSetzen((await api('api/baustoffe')).baustoffe.map(wsBaustoff)); }
const bsName = (m) => (m.hersteller ? `${m.hersteller} ${m.name}` : m.name);
const baustoffWahl = (wert, attr) => { const A = BS.filter((m) => m.aktiv || m.id === wert), K = [...new Set(A.map((m) => m.kat + (m.hersteller ? ' – Hersteller' : '')))];
  return `<select ${attr}>${K.map((k) => `<optgroup label="${esc(k)}">${A.filter((m) => m.kat + (m.hersteller ? ' – Hersteller' : '') === k).map((m) => `<option value="${m.id}"${m.id === wert ? ' selected' : ''} title="${esc([m.quelle, m.stand && 'Stand ' + m.stand, m.hinweis].filter(Boolean).join(' · '))}">${esc(bsName(m))} · λ ${m.lambda ? String(m.lambda).replace('.', ',') : '–'}</option>`).join('')}</optgroup>`).join('')}
  <optgroup label="Nur hier"><option value="eigen"${wert === 'eigen' || (wert && !BSI[wert]) ? ' selected' : ''}>Freier Baustoff (λ von Hand, nur in diesem Bauteil)</option></optgroup></select>`; };
const ntz = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const pz = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null; };

function bauteilKarte() {
  const b = bauteil();
  if (!b) return `<p class="ws-hin">Noch kein Bauteil. Oben „Bauteil → Neu“ oder links „＋ Bauteil …“: leer, als Musteraufbau oder aus dem Bauteilkatalog des Büros.</p>`;
  const M = R7.massnahmen(b.typ), ohne = R7.ohneSchichten(b.typ);
  const kopf = `<div class="ws-f">
      <label>Kürzel<input data-bk="kurz" value="${esc(b.kurz || '')}" style="width:4.5rem"></label>
      <label class="w">Bezeichnung<input data-bk="name" value="${esc(b.name || '')}" placeholder="${esc(typName(b.typ))}"></label>
      <label>Art<select data-bk="typ">${R7.TYPEN.map(([k, t]) => `<option value="${k}"${b.typ === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="w">Maßnahme (Anlage 7 GModG)<select data-bk="massnahme"><option value="">– keine Anforderung / Neubau –</option>${M.map((m) => { const u = zone() === '12' ? m.u12 : m.u19;
        return `<option value="${m.k}"${b.massnahme === m.k ? ' selected' : ''}>${m.k} ${esc(m.n)} – ${u == null ? 'keine Anforderung' : 'U max ' + zahl(u)}</option>`; }).join('')}</select></label>
      <label>Fläche (m²)<input data-bk="flaeche" value="${ntz(b.flaeche)}" style="width:6rem" inputmode="decimal"></label>
      ${ohne ? `<label>U-Wert laut Datenblatt<input data-bk="uw" value="${ntz(b.uw)}" style="width:6rem" inputmode="decimal" placeholder="z. B. 0,95"></label>` : ''}</div>`;
  if (ohne) return kopf + `<div class="ws-erg" id="wsErg">${ergebnisBoxen(b)}</div><p class="ws-hin">Fenster und Türen: U-Wert (Uw, Ug bzw. Uc je nach Maßnahme) aus dem Datenblatt des Herstellers.</p>`;
  const S = b.schichten || [];
  const zeilen = S.map((s, i) => { const m = BSI[s.m], eig = !m;
    const gef = s.m2 ? `<tr class="gef"><td></td><td colspan="2">Gefach: ${baustoffWahl(s.m2, `data-sk="m2" data-si="${i}" aria-label="Baustoff im Gefach"`)}</td>
        <td colspan="3">Breite <input class="n" data-sk="breite" data-si="${i}" value="${ntz(s.breite)}" inputmode="decimal"> cm · Achsabstand <input class="n" data-sk="abstand" data-si="${i}" value="${ntz(s.abstand)}" inputmode="decimal"> cm</td>
        <td class="r" colspan="2">${s.breite > 0 && s.abstand > 0 ? zahl(s.breite / s.abstand * 100, 1) + ' % Anteil' : ''}</td><td></td></tr>` : '';
    return `<tr data-row="${i}"${m && m.belueftet ? ' class="aus" title="Belüftete Schicht: sie und alles außen davon zählen nicht (Rse = Rsi)"' : ''}><td><span class="sw" style="background:${esc((m || {}).farbe || '#dcdcdc')}"></span></td>
      <td>${baustoffWahl(eig ? 'eigen' : s.m, `data-sk="m" data-si="${i}" aria-label="Baustoff"`)}${eig ? ` <input data-sk="name" data-si="${i}" value="${esc(s.name || '')}" placeholder="Name" style="width:9rem">` : ''}</td>
      <td class="r"><input class="n" data-sk="d" data-si="${i}" value="${ntz(s.d)}" inputmode="decimal" aria-label="Dicke in cm"></td>
      <td class="r"><input class="n${s.lam ? ' hand' : ''}" data-sk="lam" data-si="${i}" value="${ntz(s.lam)}" placeholder="${m && m.lambda ? ntz(m.lambda) : ''}" inputmode="decimal" aria-label="λ" title="leer = Richtwert des Baustoffs; eintragen = Bemessungswert des Produkts"></td>
      <td class="r"><input class="n${s.mu != null || s.sd != null ? ' hand' : ''}" data-sk="${m && m.sd != null ? 'sd' : 'mu'}" data-si="${i}" value="${ntz(m && m.sd != null ? s.sd : s.mu)}" placeholder="${m ? (m.sd != null ? 'sd ' + ntz(m.sd) : ntz(m.mu)) : '1'}" inputmode="decimal" aria-label="${m && m.sd != null ? 'sd in m' : 'μ'}"></td>
      <td class="r" data-rr="${i}"></td><td class="r" data-th="${i}"></td>
      <td class="r"><button type="button" class="ib${s.m2 ? ' on' : ''}" data-sgef="${i}" title="Gefach (Sparren/Ständer) ${s.m2 ? 'entfernen' : 'hinzufügen'}">▥</button><button type="button" class="ib" data-smv="${i}" data-r="-1" title="nach innen"${i ? '' : ' disabled'}>↑</button><button type="button" class="ib" data-smv="${i}" data-r="1" title="nach außen"${i < S.length - 1 ? '' : ' disabled'}>↓</button><button type="button" class="ib" data-sweg="${i}" title="Schicht entfernen">✕</button></td></tr>${gef}`; }).join('');
  return kopf + `<div class="ws-tw"><table class="ws-t" data-volle><thead><tr><th></th><th>Schicht (innen → außen)</th><th class="r">d [cm]</th><th class="r">λ [W/mK]</th><th class="r">μ / sd</th><th class="r">R [m²K/W]</th><th class="r">θ innen [°C]</th><th></th></tr></thead>
      <tbody>${zeilen || '<tr><td></td><td colspan="7" class="mute">Noch keine Schicht – oben „Schicht → Neu“.</td></tr>'}</tbody>
      <tfoot><tr><td></td><td><button type="button" class="btn sm" data-sneu>＋ Schicht</button> <span class="mute" id="wsRs"></span></td><td class="r" id="wsDs"></td><td></td><td></td><td class="r" id="wsRt"></td><td></td><td></td></tr></tfoot></table></div>
    <div class="ws-erg" id="wsErg"></div><div class="ws-svg" id="wsSvg"></div>`;
}

function ergebnisBoxen(b) {
  const e = ergebnis(b);
  if (e.u == null) return '<span class="mute">Schichten eintragen – der U-Wert rechnet sofort mit.</span>';
  const box = (kl, t, w, s) => `<div class="ws-box ${kl}"><small>${t}</small><b>${w}</b><small>${s}</small></div>`;
  let h = box(e.ok === false ? 'no' : e.ok ? 'ok' : '', 'U-Wert', zahl(e.u, 3) + ' W/m²K', e.umax == null ? (b.massnahme ? 'keine Anforderung' : 'Maßnahme wählen') : `U max ${zahl(e.umax)} (Nr. ${esc(b.massnahme)}) ${e.ok ? '✓' : '✗'}`);
  if (!e.r) return h;
  const r = e.r, gl = r.glaser;
  h += box(gl.tauwasser ? (gl.mc > 1 || gl.mev < gl.mc ? 'no' : '') : 'ok', 'Tauwasser (Glaser −5/20 °C)', gl.tauwasser ? zahl(gl.mc, 3) + ' kg/m²' : 'kein Tauwasser',
    gl.tauwasser ? `Verdunstung ${zahl(gl.mev, 3)} kg/m² ${gl.mev >= gl.mc ? '✓' : '✗'}` : 'Dampfdruck überall unter Sättigung');
  h += box(r.frsi >= 0.7 ? 'ok' : 'no', 'Oberfläche innen (Schimmel)', zahl(r.tSchimmel.tsi, 1) + ' °C', `fRsi ${zahl(r.frsi)} ${r.frsi >= 0.7 ? '≥' : '<'} 0,70`);
  if (r.inst) h += box('', 'Hitzeschutz', zahl(r.inst.phasenverschiebung, 1) + ' h', `Phasenverschiebung · Dämpfung ${zahl(r.inst.daempfung, 1)}`);
  h += box('', 'Dicke · Masse', zahl(r.dicke * 100, 1) + ' cm', `${zahl(r.masse, 0)} kg/m²${r.u.inhomogen ? ` · Fehler ${zahl(r.u.fehler * 100, 1)} %` : ''}`);
  if (b.flaeche) h += box('', 'Wärmeverlust', zahl(e.u * b.flaeche, 1) + ' W/K', `bei ${zahl(b.flaeche, 1)} m²`);
  return h;
}

/* Querschnitt maßstäblich mit Temperaturverlauf (−5/20 °C) und Taupunkt der Innenluft */
function querschnitt(b, r) {
  const A = r.aktiv, S = b.schichten || [], W = 760, H = 220, x0 = 56, x1 = W - 56, ti = 20, te = -5;
  const dg = S.reduce((s, x) => s + (+x.d || 0), 0); if (!dg) return '';
  const sc = (x1 - x0) / dg, y = (t) => 26 + (ti - t) / (ti - te) * 160;
  let g = `<rect x="0" y="18" width="${x0}" height="176" fill="color-mix(in srgb,var(--red,#c62f2a) 8%,transparent)"/><rect x="${x1}" y="18" width="${W - x1}" height="176" fill="color-mix(in srgb,var(--y) 10%,transparent)"/>
    <text x="4" y="13">innen ${ti} °C</text><text x="${W - 4}" y="13" text-anchor="end">außen ${te} °C</text>`, xs = x0;
  S.forEach((s, i) => { const m = BSI[s.m] || {}, w = (+s.d || 0) * sc;
    g += `<rect x="${xs}" y="18" width="${Math.max(w, 1)}" height="176" fill="${esc(m.farbe || '#dcdcdc')}" stroke="color-mix(in srgb,var(--ink) 20%,transparent)" stroke-width=".6"${i >= A.length ? ' opacity=".35"' : ''}/>`;
    if (s.m2 && s.breite > 0 && s.abstand > 0 && w > 4) { const m2 = BSI[s.m2] || {}; g += `<rect x="${xs}" y="${18 + 176 * 0.35}" width="${w}" height="${176 * Math.min(1, s.breite / s.abstand)}" fill="${esc(m2.farbe || '#c8a060')}" opacity=".75"/>`; }
    if (w > 46) g += `<text x="${xs + w / 2}" y="208" text-anchor="middle">${esc(((m.name || s.name || '').split(/[ (/]/)[0]).slice(0, 14))} ${ntz(s.d)}</text>`;
    xs += w; });
  const P = [[0, ti]], T = r.tWinter.punkte; let xk = x0;
  P.push([x0, T[0].t]); A.forEach((s, i) => { xk += (+S[i].d || 0) * sc; P.push([xk, T[i + 1].t]); }); P.push([W, te]);
  g += `<polyline points="${P.map((p) => p[0].toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ')}" fill="none" stroke="var(--red,#c62f2a)" stroke-width="2.2"/>`;
  const tp = window.WSP.taupunkt(20, 0.5);
  g += `<line x1="${x0}" x2="${x1}" y1="${y(tp)}" y2="${y(tp)}" stroke="var(--y)" stroke-dasharray="5 4"/><text x="${x0 + 4}" y="${y(tp) - 4}">Taupunkt ${zahl(tp, 1)} °C (20 °C / 50 %)</text>`;
  (r.glaser.ebenen || []).forEach((e) => { const x = x0 + e.x * 100 * sc; g += `<line x1="${x}" x2="${x}" y1="18" y2="194" stroke="var(--red,#c62f2a)" stroke-width="2" stroke-dasharray="3 3"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Querschnitt mit Temperaturverlauf">${g}</svg>`;
}

/* Nur die Rechenwerte neu (beim Tippen), ohne die Eingabefelder anzufassen */
function ergebnisNeu() {
  const b = bauteil(); if (!b) return;
  const E = $('#wsErg'); if (E) E.innerHTML = ergebnisBoxen(b);
  if (R7.ohneSchichten(b.typ)) return;
  const e = ergebnis(b), r = e.r, sv = $('#wsSvg');
  (b.schichten || []).forEach((_, i) => { const rr = V.querySelector(`[data-rr="${i}"]`), th = V.querySelector(`[data-th="${i}"]`);
    if (rr) rr.textContent = r && r.u.rSchicht[i] != null ? zahl(r.u.rSchicht[i], 3) : r ? '–' : '';
    if (th) th.textContent = r && r.tWinter.punkte[i] ? zahl(r.tWinter.punkte[i].t, 1) : ''; });
  const ds = $('#wsDs'), rt = $('#wsRt'), rs = $('#wsRs');
  if (ds) ds.textContent = zahl((b.schichten || []).reduce((s, x) => s + (+x.d || 0), 0), 1);
  if (rt) rt.textContent = r ? zahl(r.u.rT, 3) : '';
  if (rs) rs.textContent = r ? `Rsi ${zahl(r.u.rsi)} · Rse ${zahl(r.u.rse)}` : '';
  if (sv) sv.innerHTML = r ? querschnitt(b, r) : '';
}
function bauteilNachher() { ergebnisNeu(); }

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
V.addEventListener('click', (e) => {
  const b = bauteil(); if (!b) return;
  const t = e.target.closest('[data-sneu],[data-sweg],[data-smv],[data-sgef]'); if (!t) return;
  const S = b.schichten;
  if (t.dataset.sneu != null) { schichtNeu(); return; }
  if (t.dataset.sweg != null) { S.splice(+t.dataset.sweg, 1); bauteilSpeichern('Schicht entfernt'); return; }
  if (t.dataset.smv != null) { const i = +t.dataset.smv, j = i + +t.dataset.r; if (j < 0 || j >= S.length) return; [S[i], S[j]] = [S[j], S[i]]; bauteilSpeichern('Schicht verschoben'); return; }
  const s = S[+t.dataset.sgef];
  if (s.m2) { delete s.m2; delete s.breite; delete s.abstand; } else Object.assign(s, { m2: 'holz_nadel', breite: 6, abstand: 62.5 });
  bauteilSpeichern(s.m2 ? 'Gefach hinzugefügt' : 'Gefach entfernt');
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
    ...(window.WS_VORLAGEN || []).map((v, i) => ({ value: 'v:' + i, title: v.name, sub: typName(v.typ), group: 'Musteraufbauten' })),
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
  const aufbau = (k) => k.schichten.map((x) => { const m = BSI[x.m]; return `${esc(m ? bsName(m) : x.name || 'frei')} ${String(x.d).replace('.', ',')} cm`; }).join(' · ');
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
      rueckgaengig('Aus dem Katalog gelöscht', async () => { await api('api/bp/papierkorb/' + pk + '/zurueck', 'POST'); KAT = null; }); } catch (er) { toast(er.message, true); } }
  });
}
