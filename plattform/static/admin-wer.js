'use strict';
/* Verwaltung je Rolle (besprochen am 13.11.2026): jeder Bereich gehört zu einem Block (bpcore.rechte.BLOECKE) mit – / sehen / ändern je Rolle.
   Geheimnisse (Zugänge, Kennwörter, Schlüssel) gehören zu keinem Block – nur Administrator. Der Server prüft dasselbe (admin.py, BLOCK_PFADE).
   Hier: welche Seiten jemand sieht (darfNav), „nur sehen“ (#main.nur-sehen) und für den Administrator „Wer darf hier hinein?“ (werHtml).
   Gehört zu admin.html (gemeinsame Namen: api, esc, $, me, tab, data, ADMIN, toast, rueckgaengig). */
const STUFE = () => (me && me.bloecke) || {};
const BLOCK_ABLAGE = ['store_tpl_photos', 'store_folder_desc', 'store_tpl_pdf', 'store_old_mode', 'store_keep_old_photos', 'store_keep_old_pdf', 'pdf_name_tpl', 'eingang_unc', 'allplan_unc'];
const blockVonFeld = (k) => (k === 'office_name' || k.startsWith('co_') || ['modus_standard', 'ui_karte'].includes(k) ? 'buero' : BLOCK_ABLAGE.includes(k) ? 'ablage' : '');   // wie bpcore.einstellungen.block_von
const stSicht = (k) => ADMIN() || !!STUFE()[blockVonFeld(k)];
const APP_BLOCK = { baukosten: 'baukosten', baudaten: 'baudaten', ava: 'ava', plaene: 'plaene', gantt: 'gantt', aufgaben: 'aufgaben' };   // wie rechte.APP_BLOCK
const SEITE_BLOCK = { firma: 'buero', darstellung: 'buero', ablage: 'ablage', sicherung: 'sicherung', mail: 'postfaecher', druck: 'druck', vorlagen: 'druck',
  allgemein: 'ki', kataloge: 'kataloge', apps: 'system', verlauf: 'system' };
function blockDerSeite(t = tab, st = data.stab || 'allgemein', sys = data.sys) {   // '' = jede:r (Persönlich, Seiten der Apps)
  if (t === 'projekte' || t === 'ordner') return 'projekte';
  if (['users', 'rollen', 'sessions'].includes(t)) return 'mitarbeiter';
  if (t === 'system') return 'system';
  if (t === 'einstellungen') return st.startsWith('app:') ? APP_BLOCK[st.slice(4).split('~')[0]] || '' : st.startsWith('ich:') ? '' : SEITE_BLOCK[st] || 'ki';
  return sys ? 'system' : '';
}
const NUR_ADMIN_SYS = ['bugs', 'hilfe', 'fehler', 'altpdf'];   // Meldungen der Benutzer und Aufräumen bleiben beim Administrator
const darfSeite = (t, st, sys) => { const b = blockDerSeite(t, st, sys); return ADMIN() || (!b || !!STUFE()[b]) && !(t === 'system' && NUR_ADMIN_SYS.includes(sys)); };
function darfNav(id) {   // Punkte der Navigation links
  if (ADMIN()) return true;
  if (id === 'menschen') return !!STUFE().mitarbeiter;
  if (id.startsWith('s:')) return darfSeite('system', '', id.slice(2));
  if (id.startsWith('e:')) { const R = REGS.find((r) => r[0] === id.slice(2)); return !!R && R[4].some(([k]) => darfSeite('einstellungen', k)); }
  return darfSeite(id);
}
const nurSehen = () => { const b = blockDerSeite(); return !ADMIN() && !!b && STUFE()[b] === 'sehen'; };

/* „Wer darf hier hinein?“ – nur für den Administrator, oben auf jeder Seite eines Blocks */
let WER = null, WER_AUF = false;
try { WER_AUF = localStorage.getItem('adm.wer') === '1'; } catch { /* egal */ }
async function werLaden() { if (ADMIN() && !WER) { try { WER = await api('api/rollen'); } catch { WER = null; } } }
const werStufe = (ro, b) => (ro.rechte.includes('verwaltung') ? 'fest' : ro.rechte.includes(`b.${b}.aendern`) ? 'aendern' : ro.rechte.includes(`b.${b}.sehen`) ? 'sehen' : '');
function werHtml() {
  const b = blockDerSeite(), B = (me.bloecke_liste || []).find((x) => x.key === b);
  if (!ADMIN() || !B || !WER || EMBED) { $('#main').classList.toggle('nur-sehen', nurSehen()); return nurSehen() ? '<p class="wer-ns">👁 Nur zum Ansehen – ändern dürfen andere Rollen.</p>' : ''; }
  $('#main').classList.remove('nur-sehen');
  const st = (ro) => { const s = werStufe(ro, b); if (s === 'fest') return '<span class="seg wer-fest" title="hat das Recht „Verwaltung“ – darf alles"><span>–</span><span>sehen</span><span class="on a">ändern</span></span>';
    return `<span class="seg">${[['', '–'], ['sehen', 'sehen'], ...(B.stufen === 3 ? [['aendern', 'ändern']] : [])].map(([k, l]) => `<button type="button" class="${s === k ? 'on ' + (k ? k[0] : 'n') : ''}" data-wer="${esc(ro.key)}" data-ws="${k}">${l}</button>`).join('')}</span>`; };
  return `<details class="wer"${WER_AUF ? ' open' : ''}><summary><b>👁 Wer darf hier hinein?</b> <span class="mute">${esc(B.titel)} – ${esc(B.erkl)}</span></summary>
    <div class="wer-l">${WER.rollen.map((ro) => `<span>${esc(ro.name)}</span>${st(ro)}`).join('')}</div>
    <p class="mute" style="margin:.4rem 0 0;font-size:.82rem">Zugänge, Kennwörter und Schlüssel ändert immer nur, wer „Verwaltung“ hat – sie sind hier nicht freigebbar. Alle Blöcke auf einen Blick: Mitarbeiter &amp; Rechte → Rollen &amp; Rechte.</p></details>`;
}
async function werSetzen(key, b, s) {   // eine Rolle für einen Block auf – / sehen / ändern
  const ro = WER.rollen.find((x) => x.key === key), alt = ro.rechte.slice();
  const neu = alt.filter((k) => k !== `b.${b}.sehen` && k !== `b.${b}.aendern`).concat(s ? [`b.${b}.${s}`] : []);
  await api('api/rollen/' + key, 'PUT', { rechte: neu }); ro.rechte = neu;
  return alt;
}
document.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('details.wer')) { WER_AUF = e.target.open; try { localStorage.setItem('adm.wer', WER_AUF ? '1' : ''); } catch { /* egal */ } } }, true);
document.addEventListener('click', async (e) => {
  const x = e.target.closest('[data-wer]'); if (!x || !WER) return;
  const b = x.dataset.wb || blockDerSeite(), key = x.dataset.wer, ro = WER.rollen.find((r) => r.key === key);
  try {
    const alt = await werSetzen(key, b, x.dataset.ws); WER = null; await werLaden(); load();
    rueckgaengig(`${ro.name}: ${((me.bloecke_liste || []).find((y) => y.key === b) || {}).titel || b} → ${{ '': '–', sehen: 'sehen', aendern: 'ändern' }[x.dataset.ws]}`, async () => { await api('api/rollen/' + key, 'PUT', { rechte: alt }); WER = null; await werLaden(); load(); });
  } catch (er) { toast(er.message, true); }
});

/* Rollen & Rechte: alle Blöcke × Rollen (dieselben Knöpfe wie oben in den Bereichen) */
function werTabelle(R) {
  const L = me.bloecke_liste || [];
  return `<h2 style="margin:1.4rem 0 .3rem">Verwaltung: wer darf welchen Bereich?</h2><p class="mute" style="margin:0 0 .6rem">– taucht nicht auf · sehen = nur lesen · ändern. Klick auf ein Feld schaltet weiter. Zugänge, Kennwörter und Schlüssel bleiben bei „Verwaltung“.</p>
    <div class="tbl"><table class="ro-t wer-t"><thead><tr><th>Bereich</th>${R.map((ro) => `<th class="c">${esc(ro.name)}</th>`).join('')}</tr></thead><tbody>
    ${L.map((B) => `<tr><td><b>${esc(B.titel)}</b><small class="mute ro-e">${esc(B.erkl)}</small></td>${R.map((ro) => { const s = werStufe(ro, B.key);
      const folge = B.stufen === 3 ? { '': 'sehen', sehen: 'aendern', aendern: '' } : { '': 'sehen', sehen: '' };   // Klick schaltet weiter: – → sehen → ändern
      return `<td class="c">${s === 'fest' ? '<span class="wer-d a">ändern</span>' : `<button type="button" class="wer-z ${s ? s[0] : 'n'}" data-wer="${esc(ro.key)}" data-wb="${B.key}" data-ws="${folge[s]}" title="Klick: ${{ '': '–', sehen: 'sehen', aendern: 'ändern' }[folge[s]]}">${{ '': '–', sehen: 'sehen', aendern: 'ändern' }[s]}</button>`}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>`;
}
