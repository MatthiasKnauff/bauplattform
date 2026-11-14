'use strict';
/* Wiki in Runden (besprochen am 14.11.2026, Mock „Wiki-Ablauf in Runden“; Server bpcore/wiki_runde.py): gesammelt → vorsichten (Rolle, z. B. Assistenz:
   behalten oder Unsinn) → an die KI (auf Wunsch erst bestätigen) → fachlich prüfen (zugeteilt: ins Wiki · korrigieren · löschen · warten).
   Knöpfe je Zeile in den Bereichen der Runde, oben in der Leiste der nächste Schritt; Einstellungen in Verwaltung → Einstellungen → Wiki.
   Gemeinsame Namen mit wiki-kern.js (L, E, BER, laden, speichern). */
const rundeSp = () => ['vorsicht', 'meine', 'pruef'].includes(BER) && !HANDY.matches;
function rundeZelle(x) {
  if (BER === 'vorsicht' && x.status === 'vorsicht' && (L.runde || {}).darf_vorsichten)
    return '<button type="button" class="btn sm" data-wkrv="1" title="Behalten – geht mit zur Auswertung">behalten</button><button type="button" class="btn sm" data-wkrv="0" title="Unsinn – wird gelöscht (Rückgängig möglich)">Unsinn</button>';
  if ((BER === 'meine' || BER === 'pruef') && x.status === 'zusammengefasst' && L.darf_pruefen)
    return `${BER === 'pruef' && x.pruefer_name ? `<small class="mute" title="zugeteilt">${esc(x.pruefer_name.split(' ')[0])}</small> ` : ''}<button type="button" class="ib" data-wkrp="ok" title="Stimmt – ins Wiki (erscheint als Hinweis in den Apps)">✓</button><button type="button" class="ib" data-wkrp="edit" title="Korrigieren – Text rechts ändern, dann ✓">✎</button><button type="button" class="ib" data-wkrp="loeschen" title="Löschen (Rückgängig möglich)">🗑</button><button type="button" class="ib" data-wkrp="warten" title="Warten – kommt in der nächsten Runde wieder zu dir">⏸</button>`;
  return x.warten ? '<small class="mute">wartet</small>' : '';
}
function rundeKopf() {
  const R = L.runde || {}, r = R.runde || {};
  const t = BER === 'vorsicht' ? `Runde ${r.nr || 1}: je Fund <b>behalten</b> oder <b>Unsinn</b> – oben „Fertig“ behält alle übrigen und gibt sie weiter${R.einst && R.einst.auswerten ? ' an die KI' : ' in die fachliche Prüfung'}.`
    : BER === 'auswerten' ? (r.stufe === 'bestaetigen' ? (R.darf_bestaetigen ? `Bereit: diese Funde gehen an die KI (${esc(R.einst.ki)})${R.einst.ki === 'ollama' ? '' : ' – anonymisiert'}. Oben „An die KI senden“.` : 'Wartet auf die Bestätigung zum Senden an die KI.')
      : r.stufe === 'auswerten' ? 'Die Dienste lassen die KI gerade auswerten – danach wird zur fachlichen Prüfung verteilt.' : 'Hier stehen behaltene Funde, bis sie an die KI gehen.')
      : BER === 'meine' ? 'Dir zugeteilt (Projektleitung, Kapitel oder zufällig): ✓ ins Wiki · ✎ korrigieren · 🗑 löschen · ⏸ warten bis zur nächsten Runde.'
        : BER === 'neu' ? 'Wird gesammelt (KI im Büro) und mit der nächsten Runde zum Vorsichten vorgelegt.' : '';
  return t ? `<caption class="wk-rh">${t}</caption>` : '';
}
function rundeKnoepfe(K) {
  const R = L.runde || {}, r = R.runde || {}, ic = '<path d="M5 12l5 5 9-10"/>', ki = '<path d="M4 12h12M12 6l6 6-6 6"/>';
  if (BER === 'vorsicht' && R.darf_vorsichten && (L.zahl || {}).vorsicht) return [{ titel: 'Runde', knoepfe: [K('Fertig → weiter', ic, rundeFertig, { tip: 'Alle übrigen behalten und weitergeben' })] }];
  if (BER === 'auswerten' && R.darf_bestaetigen) return [{ titel: 'Runde', knoepfe: [K('An die KI senden', ki, rundeSenden, { tip: `Behaltene Funde an die KI (${R.einst.ki}) – extern anonymisiert` })] }];
  return [];
}
async function rundeSchritt(was, body, text, zurueck) {
  try { L.runde = await api('api/runde/' + was, 'POST', body || {}); if (text) rueckgaengig(text, async () => { await zurueck(); await laden(); }); await laden(); } catch (e) { toast(e.message, true); }
}
async function rundeFertig() {
  const n = (L.zahl || {}).vorsicht || 0;
  if (n && !(await bpFrage(`${n} übrige Fund${n === 1 ? '' : 'e'} behalten und weitergeben?`, { ok: 'Fertig → weiter' }))) return;
  rundeSchritt('fertig', {}, null); toast('Vorsichtung fertig.');
}
async function rundeSenden() {
  const R = L.runde || {};
  if (!(await bpFrage(`${(L.zahl || {}).auswerten || 0} Funde an die KI (${R.einst.ki}) senden?${R.einst.ki === 'ollama' ? '' : '\nNamen, Firmen und Adressen gehen nur als Kennung hinaus (anonymisiert).'}`, { ok: 'Senden' }))) return;
  rundeSchritt('bestaetigen', {}, null); toast('Die Dienste werten jetzt aus – danach wird verteilt.');
}
V.addEventListener('click', async (e) => {
  const v = e.target.closest('[data-wkrv]'), p = e.target.closest('[data-wkrp]'); if (!v && !p) return;
  e.stopPropagation();
  const id = +e.target.closest('tr[data-wke]').dataset.wke, x = L.eintraege.find((y) => y.id === id) || {};
  if (v) { const beh = v.dataset.wkrv === '1';
    return rundeSchritt('vorsicht', { id, behalten: beh }, beh ? `„${x.titel}“ behalten` : `„${x.titel}“ als Unsinn gelöscht`,
      async () => { if (!beh) await api(`api/eintraege/${id}/zurueck`, 'POST'); await api('api/eintraege/' + id, 'PUT', { status: 'vorsicht' }); }); }
  const a = p.dataset.wkrp;
  if (a === 'edit') { EID = id; E = await api('api/eintraege/' + id); V.querySelectorAll('tr.on').forEach((t) => t.classList.remove('on')); e.target.closest('tr').classList.add('on'); leiste(); if (window.seiteReiter) seiteReiter('wk', 'eintrag'); rechtsNeu(); const t = document.querySelector('.wk-a textarea[data-wkf="text"]'); if (t) t.focus(); return; }
  rundeSchritt('pruefen', { id, aktion: a }, { ok: `„${x.titel}“ ins Wiki`, loeschen: `„${x.titel}“ gelöscht`, warten: `„${x.titel}“ wartet bis zur nächsten Runde` }[a],
    async () => { if (a === 'loeschen') await api(`api/eintraege/${id}/zurueck`, 'POST'); else await api('api/runde/pruefen', 'POST', { id, aktion: 'zurueck' }); });
});

/* Verwaltung → Einstellungen → Wiki: Runde */
function rundeEinst(host) {
  let D = null;
  const TAGE = [[7, '1 Woche'], [14, '2 Wochen'], [28, '4 Wochen']], WT = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const KI = [['ollama', 'KI im Büro (Ollama)'], ['claude', 'Claude – anonymisiert'], ['gemini', 'Gemini – anonymisiert'], ['chatgpt', 'ChatGPT – anonymisiert']];
  const sel = (k, L2, v) => `<select data-wre="${k}" data-bp-auswahl>${L2.map(([w, t]) => `<option value="${esc(w)}"${String(w) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const ck = (k, t, v) => `<label class="wre-ck"><input type="checkbox" data-wre="${k}"${v ? ' checked' : ''}> ${t}</label>`;
  const zeichne = () => {
    const E2 = D.einst_alle, R = D.runde || {}, rol = (D.rollen || []).map((r) => [r.key, r.name]), pr = [['', '– niemand fest –'], ...(D.pruefer || []).map((u) => [u.id, u.name])];
    host.innerHTML = `<div class="wre">
      <p class="bph-mu">Runde ${R.nr || 0}${R.vorgelegt ? ' · zuletzt vorgelegt ' + deD(R.vorgelegt) : ''} · jetzt: <b>${esc({ sammeln: 'sammeln', vorsicht: 'vorsichten', bestaetigen: 'wartet auf „senden“', auswerten: 'KI wertet aus', pruefen: 'fachlich prüfen', weiter: 'weiter' }[R.stufe] || R.stufe)}</b></p>
      <h4>1 Sammeln <small>– jede Nacht mit der KI im Büro, nichts verlässt das Büro</small></h4>
      <div class="wre-z">${ck('bt', 'Bautagebücher (Mängel, Weisungen)', E2.bt)}${ck('ordner', 'Projektordner (Protokolle, Rügen, Bedenken, Nachträge, Abnahmen)', E2.ordner)}</div>
      <div class="wre-z"><label>Länge einer Runde${sel('tage', TAGE, E2.tage)}</label><label>vorlegen am${sel('tag', WT.map((t, i) => [i, t]), E2.tag)}</label><label>ab${sel('stunde', [...Array(24).keys()].map((h) => [h, h + ' Uhr']), E2.stunde)}</label></div>
      <h4>2 Vorsichten</h4><div class="wre-z">${ck('vorsicht', 'Funde erst vorsichten lassen', E2.vorsicht)}${E2.vorsicht ? `<label>durch die Rolle${sel('vorsicht_rolle', rol, E2.vorsicht_rolle)}</label>` : ''}</div>
      <h4>3 Auswerten</h4><div class="wre-z">${ck('auswerten', 'von der KI zusammenführen und einordnen lassen', E2.auswerten)}${E2.auswerten ? `<label>mit${sel('ki', KI, E2.ki)}</label>
        <label>vor dem Senden bestätigen${sel('bestaetigen', [['aus', 'nein – gleich senden'], ['vorsicht', 'ja – wer vorgesichtet hat'], ['rolle', 'ja – durch eine Rolle']], E2.bestaetigen)}</label>
        ${E2.bestaetigen === 'rolle' ? `<label>Rolle${sel('bestaetigen_rolle', rol, E2.bestaetigen_rolle)}</label>` : ''}` : ''}</div>
      <h4>4 Fachlich prüfen <small>– wer das Recht „Wiki prüfen“ hat: Projektleitung des Projekts → zuständig fürs Kapitel → zufällig</small></h4>
      <div class="wre-k">${(D.kapitel || []).map((k) => `<label>${esc(k)}${sel('z:' + k, pr, (E2.zustaendig || {})[k] || '')}</label>`).join('')}</div>
      <div class="wre-z"><button type="button" class="btn" data-wrvor title="Nicht auf den Termin warten – was gesammelt ist, gleich zum Vorsichten vorlegen">Runde jetzt vorlegen</button></div></div>`;
  };
  const laden2 = async () => { try { D = await api('api/runde'); if (!D.einst_alle) { host.innerHTML = '<p class="bph-mu">Nur in der Verwaltung.</p>'; return; } zeichne(); } catch (e) { host.textContent = e.message; } };
  host.addEventListener('change', async (e) => {
    const t = e.target.closest('[data-wre]'); if (!t) return;
    const k = t.dataset.wre, v = t.type === 'checkbox' ? t.checked : t.value;
    const b = k.startsWith('z:') ? { zustaendig: { ...(D.einst_alle.zustaendig || {}), [k.slice(2)]: v } } : { [k]: v };
    if (k.startsWith('z:') && !v) delete b.zustaendig[k.slice(2)];
    try { D.einst_alle = await api('api/runde/einst', 'PUT', b); toast('Gespeichert.'); zeichne(); } catch (er) { toast(er.message, true); zeichne(); }
  });
  host.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-wrvor]')) return;
    if (!(await bpFrage('Runde jetzt vorlegen? Alles Gesammelte geht zum Vorsichten.', { ok: 'Vorlegen' }))) return;
    try { await api('api/runde/vorlegen', 'POST'); toast('Vorgelegt.'); await laden2(); } catch (er) { toast(er.message, true); }
  });
  laden2();
}
