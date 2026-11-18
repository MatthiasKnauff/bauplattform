/* Pläne & Dateien → Bauportal Office (GO 17.11.2026: „Nextcloud Office“ = Collabora Online im eigenen Container; Q1 R1).
   Word-, Excel- und OpenDocument-Dateien öffnen sich zum Bearbeiten in einem Fenster über der Seite (Doppelklick, „Bearbeiten“ in den
   Details, Kontextmenü „Öffnen“); „＋ Neu ▾“ legt im gewählten Ordner ein leeres Dokument, eine leere Tabelle oder eine Kopie einer
   Büro-Vorlage an. Gespeichert wird von selbst in dieselbe Datei; die vorige Fassung liegt unter „_Fassungen“ und lässt sich in den
   Details zurückholen. Server: plaene_office.py, Kern bpcore/office.py, Dateien beim Bautagebuch (modules/office.py).
   Benutzt die gemeinsamen Namen von plaene.html, plaene-alle.js und plaene-dateiops.js. */
const OFF_END = /\.(docx?|odt|rtf|xlsx?|ods|csv|pptx?|odp|odg)$/i;
const offBearbeitbar = (x) => !!(ALLE && ALLE.office && OFF_END.test(typeof x === 'string' ? x : x.name));
let OFF_N = 0, OFF_VORL = null;
/* Aussehen des Editors (18.11.2026, wie Nextcloud Office): schlichte Registerkarten statt Menüzeile, Seitenleiste zu, Lineal aus;
   Farben aus dem Stil der Plattform – wer die alte Ansicht will, stellt sie im Editor unter „Ansicht“ um. */
const OFF_UI = 'UIMode=tabbed;TextRuler=false;TextSidebar=false;SpreadsheetSidebar=false;PresentationSidebar=false;SaveAsMode=group';
function offFarben() {
  const cs = getComputedStyle(document.documentElement), v = (n, d) => (cs.getPropertyValue(n) || '').trim() || d;
  const af = v('--bph-acc', v('--af', '#3b5a8f'));
  return `--co-primary-element:${af};--co-primary-element-light:color-mix(in srgb, ${af} 18%, white);--co-primary-light:color-mix(in srgb, ${af} 10%, white);--co-text-accent:${af};--co-border-radius:${v('--rk', '1') === '0' ? '0' : '6px'}`;
}

async function offOeffnen(pfad) {
  let r;
  try { r = await api(`api/alle/office?project_id=${pid}&pfad=${encodeURIComponent(pfad)}`); } catch (e) { toast(e.message, true); return; }
  const n = ++OFF_N, bg = document.createElement('div'); bg.className = 'off-bg';
  bg.innerHTML = `<div class="off-k"><span class="off-m">Bauportal Office</span><b>${esc(doName(pfad))}</b><span class="mu">${esc(doOrdnerVon(pfad))}</span>${r.schreiben ? '<span class="mu off-s">speichert von selbst</span>' : '<span class="pill">nur ansehen</span>'}
    <button type="button" class="btn sm" data-offzu>✕ Schließen</button></div><iframe name="bpoffice${n}" title="Bauportal Office" allow="clipboard-read *; clipboard-write *; fullscreen"></iframe>
    <form method="post" target="bpoffice${n}" action="${esc(r.url)}" hidden><input type="hidden" name="access_token" value="${esc(r.token)}"><input type="hidden" name="access_token_ttl" value="${r.ttl}"><input type="hidden" name="ui_defaults" value="${OFF_UI}"><input type="hidden" name="css_variables" value="${esc(offFarben())}"></form>`;
  document.body.appendChild(bg); bg.querySelector('form').submit();
  const ifr = bg.querySelector('iframe'), an = (m, v) => ifr.contentWindow && ifr.contentWindow.postMessage(JSON.stringify({ MessageId: m, SendTime: Date.now(), Values: v || {} }), r.herkunft);
  let warte = null;
  const zu = () => { removeEventListener('message', msg); clearTimeout(warte); bg.remove(); alleLaden(false); };
  const msg = (e) => {
    if (e.origin !== r.herkunft || e.source !== ifr.contentWindow) return;
    let m; try { m = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (m.MessageId === 'App_LoadingStatus' && m.Values && m.Values.Status === 'Frame_Ready') an('Host_PostmessageReady');
    else if (m.MessageId === 'UI_Close') zu();
    else if (m.MessageId === 'Action_Save_Resp' && warte) zu();
  };
  addEventListener('message', msg);
  bg.querySelector('[data-offzu]').addEventListener('click', () => {   // erst speichern lassen (falls etwas offen ist), dann schließen
    if (!r.schreiben) { zu(); return; }
    an('Action_Save', { DontTerminateEdit: false, DontSaveIfUnmodified: true, Notify: true });
    warte = setTimeout(zu, 4000);
  });
}

/* ＋ Neu ▾ (nur in „Alle Dateien“, nur wenn Office eingerichtet ist) */
async function offNeu(anker) {
  if (OFF_VORL == null) { try { OFF_VORL = (await api('api/alle/office/vorlagen')).vorlagen || []; } catch { OFF_VORL = []; } }
  const items = [{ value: { art: 'docx' }, title: 'Dokument', sub: 'leeres Word-Dokument (.docx)' }, { value: { art: 'xlsx' }, title: 'Tabelle', sub: 'leere Excel-Tabelle (.xlsx)' },
    { value: { art: 'pptx' }, title: 'Präsentation', sub: 'leere PowerPoint-Präsentation (.pptx)' }, { value: { art: 'odg' }, title: 'Zeichnung', sub: 'leere Zeichnung (.odg) – Skizze, Schema' },
    ...OFF_VORL.map((v) => ({ value: { vorlage: v.name }, title: v.name.replace(/\.[^.]+$/, ''), sub: v.art, group: 'Büro-Vorlagen' }))];
  if (!OFF_VORL.length) items.push({ value: null, title: 'Keine Büro-Vorlagen', sub: 'Ordner einstellen: ⚙ → Pläne & Dateien → Ablage', group: 'Büro-Vorlagen' });
  pickMenu(anker, { items, onPick: async (v) => {
    if (!v) return;
    const ordner = alleImPk(AF.ordner) ? '' : AF.ordner;
    const vorg = v.vorlage ? v.vorlage.replace(/\.[^.]+$/, '') : { xlsx: 'Neue Tabelle', pptx: 'Neue Präsentation', odg: 'Neue Zeichnung' }[v.art] || 'Neues Dokument';
    const name = await bpEingabe(`Name der neuen Datei\nim Ordner „${ordner ? doName(ordner) : 'Projektordner'}“`, vorg, { ok: 'Anlegen und öffnen' }); if (!name || !name.trim()) return;
    let r; try { r = await api('api/alle/office/neu', 'POST', { project_id: pid, ordner, name: name.trim(), ...v }); } catch (e) { toast(e.message, true); return; }
    if (r.testserver) { toast('Testserver: es wurde keine Datei angelegt.', true); return; }
    await alleLaden(false);
    const P = pid;
    rueckgaengig(`„${doName(r.pfad)}“ angelegt`, async () => { try { await api('api/alle/aktion', 'POST', { project_id: P, art: 'loeschen', pfade: [r.pfad] }); await alleLaden(false); } catch (e) { toast(e.message, true); } });
    offOeffnen(r.pfad);
  } });
}
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('#neuOff'); if (b) offNeu(b); });
window.offKnopf = () => { const b = $('#neuOff'); if (b) b.hidden = !(tab === 'alle' && ALLE && ALLE.office && !ALLE.error && ALLE_PID === pid) || doNurLesen(); };

/* Details rechts: frühere Fassungen (R1) – zurückholen; der Stand davor wird selbst eine Fassung */
async function offDetail(el, x) {
  if (!offBearbeitbar(x) || alleImPk(x.pfad)) return;
  const b = el.querySelector('[data-adoff]'); if (b) b.textContent = doNurLesen() ? 'Ansehen' : 'Bearbeiten';
  const box = document.createElement('div'); box.className = 'off-f'; box.innerHTML = '<div class="ad-t">Frühere Fassungen</div><p class="ad-lade">…</p>';
  el.querySelector('.ad').appendChild(box);
  let F; try { F = (await api(`api/alle/office/fassungen?project_id=${pid}&pfad=${encodeURIComponent(x.pfad)}`)).fassungen || []; } catch { F = []; }
  if (!box.isConnected) return;
  box.innerHTML = '<div class="ad-t">Frühere Fassungen</div>' + (F.length ? F.map((f) => `<div class="off-fz"><span title="${esc(f.name)}">${esc(f.name.replace(/\.[^.]+$/, ''))} <small>${mb(f.groesse)}</small></span>${doNurLesen() ? '' : `<button type="button" class="btn sm" data-offzr="${esc(f.name)}">Zurückholen</button>`}</div>`).join('')
    : '<p class="ad-lade">Noch keine – beim ersten Speichern im Browser wird der Stand davor aufgehoben.</p>');
  box.addEventListener('click', async (e) => {
    const z = e.target.closest('[data-offzr]'); if (!z) return;
    if (!(await bpFrage(`Fassung „${z.dataset.offzr.replace(/\.[^.]+$/, '')}“ zurückholen?\nDer jetzige Stand wird vorher als Fassung aufgehoben.`, { ok: 'Zurückholen' }))) return;
    const P = pid, pfad = x.pfad;
    const hol = async (fassung) => { const r = await api('api/alle/office/zurueckholen', 'POST', { project_id: P, pfad, fassung }); if (r.testserver) toast('Testserver: nichts geändert.', true); await alleLaden(false); return r; };
    try {
      await hol(z.dataset.offzr);
      const neu = ((await api(`api/alle/office/fassungen?project_id=${P}&pfad=${encodeURIComponent(pfad)}`)).fassungen || []).find((f) => / vor Zurückholen\./.test(f.name));
      rueckgaengig('Fassung zurückgeholt', () => neu && hol(neu.name).catch((er) => toast(er.message, true)));
    } catch (er) { toast(er.message, true); }
  });
}
