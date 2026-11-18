'use strict';
/* Ausschreibung – LV-Nachverfolgung (17.11.2026, Mock „LV-Nachverfolgung“: Symbol B Papierflieger, Einstieg B1, Vorgabe C1 ↔ C2).
   Reiter „Nachverfolgen“ unter Vergabe hinter „Versand“, dazu eine Kachel im App-Menü (/ava/#nachverfolgen). Alle versendeten LVs mit ihren
   Bieter:innen über alle Projekte: je LV eine Zeile (aufklappbar), darunter die Firmen mit Stand, zuletzt, nächster Anruf – „📞 angerufen“,
   „✉ erinnern“ und Stand ändern wie im Versand (dieselbe Adresse PUT /api/lv/<i>/versand, Rückgängig). Klick auf ein LV öffnet dessen Versand.
   Server: ava_nachverfolgen.py (/api/nachverfolgen). Vor ava-start.js geladen, gemeinsame Namen (VS_RUECK, vsDe aus ava-versand.js). */
const NV = { D: null, alle: LS.get('nv:alle', false), f: LS.get('nv:f', 'laufend'), anrufe: false, q: '', zu: new Set(LS.get('nv:zu', [])), laedt: false };
const NV_ST = { laufend: 'laufend', frist: 'Frist vorbei', erledigt: 'erledigt', alle: 'alle' };

function vNachverfolgen() { return `<div class="nv" id="nvSeite">${NV.D ? nvHtml() : '<p class="hint">Lade …</p>'}</div>`; }
async function nvLaden() {
  if (NV.laedt) return; NV.laedt = true;
  try { NV.D = await api('api/nachverfolgen?alle=' + (NV.alle ? 1 : 0)); } catch (e) { const el = $('#nvSeite'); if (el) el.innerHTML = `<p class="hint">${esc(e.message)}</p>`; NV.laedt = false; return; }
  NV.laedt = false; nvNeu();
}
const nvNeu = () => { const el = $('#nvSeite'); if (el && NV.D) el.innerHTML = nvHtml(); };
const nvTage = (t, heute) => Math.round((new Date(t.slice(0, 10) + 'T12:00') - new Date(heute + 'T12:00')) / 864e5);

function nvHtml() {
  const H = NV.D.heute, q = NV.q.toLowerCase();
  const passt = (x) => (NV.f === 'alle' || x.stand === NV.f) && (!q || [x.projekt, x.nr, x.name, x.gewerk, ...x.bieter.map((b) => b.name)].join(' ').toLowerCase().includes(q))
    && (!NV.anrufe || x.bieter.some((b) => b.faellig));
  const L_ = NV.D.lvs.filter(passt), lauf = NV.D.lvs.filter((x) => x.stand !== 'erledigt');
  const k = { anrufe: lauf.reduce((s, x) => s + x.bieter.filter((b) => b.faellig).length, 0), bald: lauf.filter((x) => x.abgabe && nvTage(x.abgabe, H) >= 0 && nvTage(x.abgabe, H) <= 3).length,
    unterwegs: lauf.length, da: lauf.reduce((s, x) => s + x.da, 0), von: lauf.reduce((s, x) => s + x.bieter.length, 0) };
  const zahl = (s) => NV.D.lvs.filter((x) => s === 'alle' || x.stand === s).length;
  const zeile = (x) => {
    const zu = NV.zu.has(x.lv_id), t = x.abgabe ? nvTage(x.abgabe, H) : null, offen = x.bieter.length - x.da - x.zusage - x.absage;
    const abg = x.abgabe ? `${esc(vsDe(x.abgabe).slice(0, 6))} ${t < 0 ? '<small class="vs-rot">vorbei</small>' : `<small>(${t} T.)</small>`}` : '–';
    const sum = [x.da && `${x.da} abgegeben`, x.zusage && `${x.zusage} will abgeben`, x.absage && `${x.absage} gibt nicht ab`, offen && `${offen} offen`].filter(Boolean).join(' · ');
    return `<tr class="nv-lv ${x.stand}" data-nvlv="${x.lv_id}"><td><span class="vs-car">${bpKlapp(!zu)}</span><b>${esc(x.projekt)}</b> · <a href="#" data-nvgeh="${x.lv_id}" title="Versand dieses LV öffnen">LV ${esc(x.nr)} ${esc(x.name)}</a></td>
      <td>${esc(String(x.verschickt).slice(0, 6))}</td><td>${abg}</td><td>${x.da}/${x.bieter.length}</td><td colspan="3">${esc(sum)}</td>
      <td class="nv-k">${x.stand === 'laufend' ? '' : `<button type="button" class="btn sm" data-nvps="${x.lv_id}">→ Preisspiegel</button>`}</td></tr>
      ${zu ? '' : x.bieter.filter((b) => !NV.anrufe || b.faellig).map((b) => {
        const ang = b.rueck === 'angebot', cls = ang || b.rueck === 'abgegeben' ? 'ok' : b.rueck === 'absage' ? 'no' : b.rueck === 'zusage' ? 'z' : 'o', ende = ang || b.rueck === 'abgegeben' || b.rueck === 'absage';
        const lz = b.letzt && b.letzt.t ? `${b.letzt.weg === 'tel' ? '☎' : '✉'} ${esc(vsDe(b.letzt.t).slice(0, 6))}` : '–';
        return `<tr class="nv-b${b.faellig ? ' vs-faellig' : ''}" data-nvlv="${x.lv_id}" data-nvcid="${b.contact_id}"><td class="nv-f">${esc(b.name)}<small>${esc(b.email || '')}${b.telefon ? ' · ☎ ' + esc(b.telefon) : ''}</small></td>
          <td></td><td>${b.rueck === 'zusage' && b.bis ? '<small>bis ' + esc(vsDe(b.bis).slice(0, 6)) + '</small>' : ''}</td><td></td>
          <td><button type="button" class="vs-ch ${cls}" data-nvst${ang ? ' disabled title="Angebot eingetragen – unter Angebote &amp; Preisspiegel"' : ''}>${ang ? 'Angebot ✓' : esc(VS_RUECK[b.rueck] || 'offen') + ' ▾'}</button></td>
          <td>${lz}</td><td>${b.naechst && !ende ? `<span class="${b.faellig ? 'vs-rot' : ''}">${b.naechst <= H ? 'heute' : esc(vsDe(b.naechst).slice(0, 6))}</span>` : ''}</td>
          <td class="nv-k">${ende ? '' : `<button type="button" class="btn sm" data-nvanruf title="Telefonnotiz „angerufen“ mit jetzt">📞 angerufen</button><button type="button" class="btn sm" data-nverinnern title="Erinnerung nur an diese Firma – im Versand-Dialog, gesendet wird erst dort">✉ erinnern</button>`}</td></tr>`;
      }).join('')}`;
  };
  return `<div class="nv-kopf"><span class="seg sm" role="group" aria-label="Projekte"><button type="button" data-nvalle="0" class="${NV.alle ? '' : 'on'}">meine Projekte</button><button type="button" data-nvalle="1" class="${NV.alle ? 'on' : ''}">alle</button></span>
    <span class="seg sm" role="group" aria-label="Stand">${Object.entries(NV_ST).map(([s, t]) => `<button type="button" data-nvf="${s}" class="${NV.f === s ? 'on' : ''}">${t} ${zahl(s)}</button>`).join('')}</span>
    <label class="nv-ck"><input type="checkbox" data-nvanrufe${NV.anrufe ? ' checked' : ''}> nur fällige Anrufe</label><input type="search" class="nv-q" data-nvq placeholder="Firma, LV, Gewerk …" value="${esc(NV.q)}"></div>
    <div class="vs-z nv-z"><span><b class="${k.anrufe ? 'no' : ''}">${k.anrufe}</b> Anruf${k.anrufe === 1 ? '' : 'e'} fällig</span><span><b>${k.bald}</b> Abgabe in ≤ 3 Tagen</span><span><b>${k.unterwegs}</b> LV${k.unterwegs === 1 ? '' : 's'} unterwegs</span><span><b class="ok">${k.da}</b> / ${k.von} Angebote da</span></div>
    ${L_.length ? `<div class="nv-tw"><table class="nv-t"><thead><tr><th>Projekt · LV / Bieter:in</th><th>verschickt</th><th>Abgabe</th><th>Rücklauf</th><th>Stand</th><th>zuletzt</th><th>nächster Anruf</th><th></th></tr></thead><tbody>${L_.map(zeile).join('')}</tbody></table></div>`
      : `<p class="hint">${NV.D.lvs.length ? 'Nichts in dieser Auswahl.' : NV.alle ? 'Noch kein LV an Bieter:innen verschickt.' : 'In deinen Projekten ist kein LV unterwegs – „alle“ zeigt die übrigen.'}</p>`}
    <p class="hint">Dieselben Daten wie im Versand – nur über alle LVs. Klick auf ein LV öffnet seinen Versand. Fällige Anrufe und Fristen stehen auch unter „Zu tun“ auf der Startseite.</p>`;
}
async function nvGeh(lid, art) {
  const x = NV.D.lvs.find((y) => y.lv_id === lid); if (!x) return;
  await vqGehe({ lv_id: x.lv_id, pid: x.pid, projekt: x.projekt, art, titel: '' });
}
async function nvSetzen(lid, body, text) {
  try { await api(`api/lv/${lid}/versand`, 'PUT', body); await nvLaden(); if (text) toast(text); return true; } catch (e) { toast(e.message, true); return false; }
}
document.addEventListener('click', async (e) => {
  const t = e.target; if (tab !== 'nachverfolgen' || !t.closest || !t.closest('#nvSeite') || !NV.D) return;
  const a = t.closest('[data-nvalle]'); if (a) { NV.alle = a.dataset.nvalle === '1'; LS.set('nv:alle', NV.alle); NV.D = null; nvNeu(); nvLaden(); return; }
  const f = t.closest('[data-nvf]'); if (f) { NV.f = f.dataset.nvf; LS.set('nv:f', NV.f); nvNeu(); return; }
  const g_ = t.closest('[data-nvgeh]'); if (g_) { e.preventDefault(); return nvGeh(+g_.dataset.nvgeh, 'versand'); }
  const ps = t.closest('[data-nvps]'); if (ps) return nvGeh(+ps.dataset.nvps, 'angebot');
  const tr = t.closest('tr[data-nvlv]'); if (!tr) return;
  const lid = +tr.dataset.nvlv, x = NV.D.lvs.find((y) => y.lv_id === lid), cid = +tr.dataset.nvcid, b = x && x.bieter.find((y) => y.contact_id === cid);
  if (tr.classList.contains('nv-lv') && !t.closest('button,a,input')) { if (NV.zu.has(lid)) NV.zu.delete(lid); else NV.zu.add(lid); LS.set('nv:zu', [...NV.zu].slice(-200)); nvNeu(); return; }
  if (!b) return;
  if (t.closest('[data-nvanruf]')) {
    const alt = await api(`api/lv/${lid}/versand`).then((D) => (D.bieter.find((y) => y.contact_id === cid) || {}).anrufe || []).catch(() => null);
    if (await nvSetzen(lid, { bieter: { [cid]: { anruf: 'angerufen' } } }) && alt) rueckgaengig(`${b.name}: angerufen`, () => nvSetzen(lid, { bieter: { [cid]: { anrufe: alt } } }));
    return;
  }
  if (t.closest('[data-nverinnern]')) {   // Versand-Dialog dieses LV, vorgewählt nur diese Firma
    await nvGeh(lid, 'versand'); await vsSeiteLaden(true); VS.wahl = { erinnerung: new Set([cid]) }; vsSenden('erinnerung'); return;
  }
  const sw = t.closest('[data-nvst]');
  if (sw) pickMenu(sw, { items: Object.entries(VS_RUECK).map(([k, ti]) => ({ value: k, title: ti, on: k === (b.rueck || '') })), onPick: async (v) => {
    if (v === (b.rueck || '')) return; const alt = b.rueck || '';
    if (await nvSetzen(lid, { bieter: { [cid]: { rueck: v } } })) rueckgaengig(`${b.name}: ${VS_RUECK[v]}`, () => nvSetzen(lid, { bieter: { [cid]: { rueck: alt } } }));
  } });
});
document.addEventListener('change', (e) => { if (tab === 'nachverfolgen' && e.target.matches && e.target.matches('[data-nvanrufe]')) { NV.anrufe = e.target.checked; nvNeu(); } });
document.addEventListener('input', (e) => {
  if (tab !== 'nachverfolgen' || !e.target.matches || !e.target.matches('[data-nvq]')) return;
  NV.q = e.target.value; const p = e.target.selectionStart; nvNeu(); const f = document.querySelector('[data-nvq]'); f.focus(); f.setSelectionRange(p, p);
});
