/* Bauantrag – Bauvorlagen „wird nachgereicht“ (nach bauantrag-pdf.js geladen, gemeinsame Namen):
   wer liefert (Adressen), bis wann (festes Datum oder Tage vor einem Vorgang des Bauzeitenplans – wandert mit dem Plan),
   wie erinnert wird (To-do auf der Startseite, „Zu erledigen“ im Bautagebuch, vorbereitete Mail-Nachfrage – geht nie von selbst raus). */
let NACH_VG = { aid: null, L: null };
const NACH_PLAN = new Set();   // „aus dem Bauzeitenplan“ gewählt, Vorgang noch offen   // Vorgänge des Bauzeitenplans, je Antrag einmal geladen
function nachVorgaenge() {
  if (NACH_VG.aid === AID && NACH_VG.L) return NACH_VG.L;
  if (NACH_VG.aid !== AID) { NACH_VG = { aid: AID, L: null }; api(`api/antraege/${AID}/vorgaenge`).then((L) => { NACH_VG = { aid: AID, L }; if (SCHRITT === 'bauvorlagen') zeichne(); }).catch(() => { NACH_VG = { aid: AID, L: [] }; }); }
  return [];
}
const nachDe = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '');
function nachHtml(b) {
  const N = b.nach || {}, k = esc(b.key), plan = !!N.plan_uid || NACH_PLAN.has(AID + ':' + b.key);
  const VG = plan ? nachVorgaenge() : [];
  const ck = (f, t) => `<label class="ba-nck"><input type="checkbox" data-nach="${f}" data-bvk="${k}"${N[f] !== false && (f !== 'bt' || N.bt) ? ' checked' : ''}> ${t}</label>`;
  return `<div class="ba-nach">
    <label class="ba-f"><span>Liefert</span><input data-nach="liefert" data-bvk="${k}" data-vs="bakontakt" autocomplete="off" value="${esc(N.liefert || '')}" placeholder="aus den Adressen, z. B. Tragwerksplaner"></label>
    <div class="ba-f"><span>Bis</span><span class="seg" role="group"><button type="button" data-nachart="datum" data-bvk="${k}" class="${plan ? '' : 'on'}">festes Datum</button><button type="button" data-nachart="plan" data-bvk="${k}" class="${plan ? 'on' : ''}">aus dem Bauzeitenplan</button></span>
      ${plan ? `<span class="ba-nplan"><input type="number" min="0" max="365" data-nach="vorlauf" data-bvk="${k}" value="${esc(N.vorlauf ?? 7)}" class="z" aria-label="Tage vorher"> Tage vor
        <select data-nach="plan_uid" data-bvk="${k}" data-bp-auswahl aria-label="Vorgang"><option value="">– Vorgang wählen –</option>${VG.filter((v) => !v.gruppe).map((v) => `<option value="${esc(v.uid)}" data-sub="Beginn ${nachDe(v.s)}"${v.uid === String(N.plan_uid) ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>
        ${NACH_VG.L && !VG.length ? '<small class="ba-hilfe">Kein Bauzeitenplan im Projekt.</small>' : ''}</span>`
      : `<input type="date" data-nach="bis" data-bvk="${k}" value="${esc(N.bis || '')}" aria-label="Frist">`}
      ${N.frist ? `<b class="ba-nfr">→ ${nachDe(N.frist)}</b>` : ''}</div>
    <div class="ba-f w"><span>Erinnern</span><span class="ba-ncks">${ck('todo', 'To-do auf der Startseite')}${ck('bt', 'im Bautagebuch „Zu erledigen“')}${ck('mail', 'Mail-Nachfrage vorbereiten')}</span></div>
    ${N.liefert_kid ? `<button type="button" class="btn sm" data-nachmail="${k}">✉ Jetzt nachfragen …</button>` : ''}</div>`;
}
async function nachSetzen(key, werte, text) {
  const alt = D.bauvorlagen.find((x) => x.key === key), id = AID;
  try { D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { [key]: { status: 'nachgereicht', ...werte } } }); zeichne();
    rueckgaengig(text, async () => { D = await api('api/antraege/' + id, 'PUT', { bauvorlagen: { [key]: { status: alt.status, ...(alt.nach || {}) } } }); zeichne(); }); }
  catch (e) { toast(e.message, true); }
}
if (window.bpVorschlag) bpVorschlag.listen.bakontakt = () => { baKontakteLaden(); return (BA_KB || []).map((x) => ({ w: x.name, t: x.trade || '' })); };
document.addEventListener('focusin', (e) => { if (e.target.dataset && e.target.dataset.nach === 'liefert') baKontakteLaden(); });
V.addEventListener('change', (e) => {
  const t = e.target, f = t.dataset && t.dataset.nach; if (!f || !D) return;
  const key = t.dataset.bvk, name = (D.bauvorlagen.find((x) => x.key === key) || {}).name || key;
  if (f === 'liefert') { const v = t.value.trim(), kt = (BA_KB || []).find((x) => x.name === v); return nachSetzen(key, { liefert: v, liefert_kid: kt ? kt.id : null }, `„${name}“: liefert ${v || '–'}`); }
  if (f === 'todo' || f === 'bt' || f === 'mail') return nachSetzen(key, { [f]: t.checked }, `„${name}“: Erinnerung geändert`);
  if (f === 'plan_uid') { const v = (NACH_VG.L || []).find((x) => x.uid === t.value); return nachSetzen(key, { plan_uid: t.value, plan_name: v ? v.name : '' }, `„${name}“: Frist aus dem Bauzeitenplan`); }
  if (f === 'vorlauf' || f === 'bis') return nachSetzen(key, { [f]: t.value }, `„${name}“: Frist geändert`);
});
V.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-nachart]');
  if (a) { const key = a.dataset.bvk, b = D.bauvorlagen.find((x) => x.key === key); if (!b) return;
    if (a.dataset.nachart === 'plan') { NACH_PLAN.add(AID + ':' + key); nachVorgaenge(); zeichne(); }
    else { NACH_PLAN.delete(AID + ':' + key); nachSetzen(key, { plan_uid: '', plan_name: '' }, `„${b.name}“: festes Datum`); }
    return; }
  const m = e.target.closest('[data-nachmail]'); if (!m) return;
  const b = D.bauvorlagen.find((x) => x.key === m.dataset.nachmail), N = (b && b.nach) || {}; if (!N.liefert_kid) return;
  let k = {}; try { k = (await api('api/bp/kontakte?ids=' + N.liefert_kid))[0] || {}; } catch { /* ohne Adresse */ }
  if (!k.email) { toast(`Für ${N.liefert} ist keine E-Mail-Adresse in den Adressen eingetragen.`, true); return; }
  const P = (L && L.projekte.find((p) => p.id === PID)) || {};
  BPHead.neuWechsel('nachricht', { von: 'Bauantrag', an: [{ name: k.name, email: k.email, contact_id: k.id }], betreff: `${b.name} – ${P.name || ''}`.trim(),
    text: `Guten Tag,\n\nfür den Bauantrag zum Bauvorhaben ${P.name || ''} benötigen wir noch den ${b.name}${N.frist ? ' bis zum ' + nachDe(N.frist) : ''}.\nKönnen Sie uns kurz mitteilen, bis wann wir damit rechnen können?\n\nVielen Dank und freundliche Grüße` });
});
