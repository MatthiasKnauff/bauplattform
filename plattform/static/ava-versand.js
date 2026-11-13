'use strict';
/* Ausschreibung – LV an Bieter:innen versenden (vor ava-start.js geladen, gemeinsame Namen; Server: ava_versand.py).
   Reiter „Versand“ im Bereich rechts des LV (Ablauf oben → „Versand“): Termine (Abgabe, Rückmeldung), je Bieter:in die
   Ansprechperson aus den Adressen, die persönliche Anrede, Stand (versendet, Zusage/Absage, Angebot da); „An Bieter senden …“
   öffnet den gemeinsamen Versand-Dialog (BPHead.versand) – jede Firma bekommt ihre eigene Mail, nichts geht automatisch. */
const VS = { D: null, lid: null };
const vsDe = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1]}${m[4] ? ' ' + m[4] : ''}` : ''; };
const VS_RUECK = { '': 'offen', zusage: 'Zusage', absage: 'Absage', angebot: 'Angebot da' };
async function vsMount(el) {
  if (!L) { el.innerHTML = '<div class="sr-pad"><p class="hint">Erst ein LV öffnen.</p></div>'; return; }
  el.innerHTML = '<div class="sr-pad"><p class="hint">Lade …</p></div>';
  try { if (!KONT) KONT = await api('api/kontakte').catch(() => []); if (VS.lid !== L.id || !VS.D) { VS.D = await api(`api/lv/${L.id}/versand`); VS.lid = L.id; } } catch (e) { el.innerHTML = `<div class="sr-pad"><p class="hint">${esc(e.message)}</p></div>`; return; }
  el.innerHTML = `<div class="sr-pad">${vsHtml()}</div>`;
}
const vsNeu = () => { if (window.seiteFuellen) seiteFuellen('lv', 'versand'); };
function vsHtml() {
  const D = VS.D, B = D.bieter, n = (k) => B.filter((b) => (b.rueck || '') === k).length;
  const zeile = (b) => `<div class="vs-r" data-vscid="${b.contact_id}">
      <div class="vs-k"><button type="button" class="vs-n" data-vsk title="Adresse bearbeiten (E-Mail, Ansprechperson …)">${esc(b.name)}</button><small>${esc([b.trade, b.city].filter(Boolean).join(' · '))}</small><button type="button" class="ib" data-vsweg title="Nicht mehr anfragen">✕</button></div>
      <div class="vs-g">
        <label>An<select data-vsf="email">${b.adressen.length ? (b.adressen.length > 1 && !b.email ? '<option value="">– bitte wählen –</option>' : '') + b.adressen.map((a) => `<option value="${esc(a.email)}"${a.email === b.email ? ' selected' : ''}>${esc([a.name, a.funktion].filter(Boolean).join(' · ') || 'Firma')} – ${esc(a.email)}</option>`).join('') : '<option value="">keine E-Mail in den Adressen</option>'}</select></label>
        <label>Anrede<input data-vsf="anrede" value="${esc(b.anrede)}" title="Aus dem Namen der Ansprechperson (Herr/Frau …) – hier für diese Firma änderbar"></label>
        <label>Stand<select data-vsf="rueck"${b.rueck === 'angebot' ? ' disabled' : ''}>${Object.entries(VS_RUECK).filter(([k]) => k !== 'angebot' || b.rueck === 'angebot').map(([k, t]) => `<option value="${k}"${(b.rueck || '') === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <span class="vs-st">${b.versendet ? `versendet ${esc(b.versendet)}` : '<span class="hint">noch nicht versendet</span>'}</span>
      </div></div>`;
  return `<div class="vs-t"><label>Abgabe des Angebots<input type="datetime-local" data-vst="abgabe" value="${esc(D.abgabe)}"${D.rueckmeldung ? ` min="${esc(D.rueckmeldung.slice(0, 10))}T00:00"` : ''}></label><label>Rückmeldung bis<input type="date" data-vst="rueckmeldung" value="${esc(D.rueckmeldung)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''} title="Bis wann die Firma zu- oder absagt – spätestens am Tag der Abgabe"></label></div>
    <div class="vs-z"><span>eingeladen <b>${B.filter((b) => b.versendet).length}</b></span><span>Zusage <b>${n('zusage')}</b></span><span>Absage <b>${n('absage')}</b></span><span>Angebot da <b>${n('angebot')}</b></span></div>
    <div class="bar" style="margin:.4rem 0 .6rem"><button type="button" class="btn pri" data-vssenden${B.some((b) => b.email) ? '' : ' disabled title="Erst Bieter:innen mit E-Mail-Adresse hinzufügen"'}>✉ An Bieter senden …</button>
      <select data-vsdazu multiple data-bp-auswahl data-ph="＋ Bieter:innen aus den Adressen – mehrere anhaken …" aria-label="Bieter:innen hinzufügen">${D.vorschlaege.length ? `<optgroup label="Gewerk passt">${D.vorschlaege.map((k) => `<option value="${k.contact_id}">${esc(k.name)}${k.city ? ' · ' + esc(k.city) : ''}</option>`).join('')}</optgroup>` : ''}<optgroup label="Alle Firmen">${(KONT || []).filter((k) => !B.some((b) => b.contact_id === k.id) && !D.vorschlaege.some((v) => v.contact_id === k.id)).slice(0, 400).map((k) => `<option value="${k.id}">${esc(k.name)}${k.trade ? ' · ' + esc(k.trade) : ''}</option>`).join('')}</optgroup></select><input data-vsfrei placeholder="＋ oder Firma eintippen, Enter" aria-label="Bieter:in ohne Adresse eintragen" autocomplete="off" style="min-width:13rem;flex:1"></div>
    ${B.length ? B.map(zeile).join('') : '<div class="card empty"><p class="hint">Noch keine Bieter:innen – oben aus den Adressen anhaken (gern mehrere) oder einfach den Namen eintippen (Firmen mit passendem Gewerk stehen oben, alle anderen darunter). Wer ein Angebot abgegeben hat, steht hier von selbst.</p></div>'}
    ${D.laeufe.length ? `<h4 class="vs-h">Bisher versendet</h4>${D.laeufe.slice().reverse().map((x) => `<div class="vs-l"><b>${esc(x.datum)}</b> · ${esc(x.wer)} · ${x.an.filter((a) => a.ok).length} Mail${x.an.filter((a) => a.ok).length === 1 ? '' : 's'}${x.an.some((a) => !a.ok) ? ` · <span style="color:var(--red)">${x.an.filter((a) => !a.ok).length} Fehler</span>` : ''}<small>${esc(x.an.map((a) => a.name).join(', '))}</small>${(x.ablage || []).length ? `<small>📁 ${esc(x.ablage[0].split('/').slice(0, -1).join('/'))}</small>` : ''}</div>`).join('')}` : ''}`;
}
async function vsSetzen(body, text) {
  const alt = VS.D;
  try { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', body); vsNeu(); if (text) rueckgaengig(text, async () => { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', vsZurueck(alt, body)); vsNeu(); }); }
  catch (e) { toast(e.message, true); vsNeu(); }   // abgelehnt (z. B. Rückmeldung nach der Abgabe): wieder den gespeicherten Stand zeigen
}
function vsZurueck(alt, body) {   // Rückgängig: die betroffenen Werte wie vorher
  const out = {}; ['abgabe', 'rueckmeldung'].forEach((k) => { if (k in body) out[k] = alt[k] || ''; });
  if (body.bieter) { out.bieter = {}; Object.entries(body.bieter).forEach(([cid, x]) => { const b = alt.bieter.find((y) => String(y.contact_id) === cid) || {}; out.bieter[cid] = {};
    Object.keys(x).forEach((f) => { out.bieter[cid][f] = f === 'weg' ? !b.contact_id : f === 'anrede' ? (b.anrede_hand ? b.anrede : '') : f === 'rueck' ? (b.rueck === 'angebot' ? '' : b.rueck || '') : b[f] || ''; }); }); }
  return out;
}
document.addEventListener('change', (e) => {
  const t = e.target; if (!t.closest || !t.closest('.vs-t, .vs-r, [data-vsdazu]') || !L) return;
  if (t.dataset.vst) return vsSetzen({ [t.dataset.vst]: t.value }, t.dataset.vst === 'abgabe' ? 'Abgabe geändert' : 'Rückmeldefrist geändert');
  if (t.matches('[data-vsdazu]')) {   // mehrere angehakt (auch über mehrere Suchen): alle auf einmal, ein Schritt zum Rückgängigmachen
    const ids = [...t.selectedOptions].map((o) => o.value).filter(Boolean); [...t.options].forEach((o) => { o.selected = false; });
    if (ids.length) vsSetzen({ bieter: Object.fromEntries(ids.map((c) => [c, { weg: false }])) }, ids.length === 1 ? 'Bieter:in hinzugefügt' : `${ids.length} Bieter:innen hinzugefügt`); return; }
  const r = t.closest('[data-vscid]'), f = t.dataset.vsf; if (!r || !f) return;
  const b = VS.D.bieter.find((y) => y.contact_id === +r.dataset.vscid), x = { [f]: t.value };
  if (f === 'email' && !b.anrede_hand) x.anrede = '';   // andere Ansprechperson: Anrede neu aus deren Namen
  vsSetzen({ bieter: { [r.dataset.vscid]: x } }, `${b.name}: ${f === 'email' ? 'Ansprechperson' : f === 'anrede' ? 'Anrede' : 'Stand'} geändert`);
});
/* Bieter:in ohne Adresse: Name eintippen + Enter → steht gleich in der Liste (als Kontakt angelegt), ergänzt wird später per Klick auf den Namen */
async function vsFrei(inp) {
  const name = inp.value.trim(); if (!name || !L) return;
  inp.value = '';
  try {
    if (!KONT) KONT = await api('api/kontakte').catch(() => []);
    let k = (KONT || []).find((x) => (x.name || '').trim().toLowerCase() === name.toLowerCase());   // gibt es schon: kein zweiter Eintrag
    if (!k) { k = (await api('api/bp/kontakte', 'POST', { name, trade: L.gewerk || '' })).kontakt || {}; KONT = null; }
    const id = k.id || k.contact_id; if (!id) throw new Error('Kontakt nicht angelegt');
    await vsSetzen({ bieter: { [id]: { weg: false } } }, `${name} hinzugefügt`);
    toast(`${name} steht in der Liste – Namen anklicken, um E-Mail und Adresse zu ergänzen.`);
  } catch (er) { inp.value = name; toast(er.message, true); }
}
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-vsfrei]')) { e.preventDefault(); vsFrei(e.target); } });
document.addEventListener('click', async (e) => {
  const k = e.target.closest && e.target.closest('[data-vsk]');
  if (k && L && window.BPHead && BPHead.kontaktMaske) {   // Adresse im Fenster bearbeiten – die Seite bleibt
    const cid = +k.closest('[data-vscid]').dataset.vscid, kc = await BPHead.kontaktMaske({ id: cid });
    if (kc) { VS.D = null; KONT = null; vsNeu(); }
    return;
  }
  const t = e.target.closest && e.target.closest('[data-vsweg],[data-vssenden]'); if (!t || !L) return;
  if (t.hasAttribute('data-vsweg')) { const r = t.closest('[data-vscid]'), b = VS.D.bieter.find((y) => y.contact_id === +r.dataset.vscid); return vsSetzen({ bieter: { [r.dataset.vscid]: { weg: true } } }, `${b.name} nicht mehr anfragen`); }
  const D = VS.D, mit = D.bieter.filter((b) => b.email), ohne = D.bieter.filter((b) => !b.email);
  const lvPdf = async () => { const r = await fetch(`api/lv/${L.id}/druck`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layout: { preise: 'leer' } }) });
    if (!r.ok) throw new Error('LV-PDF nicht möglich'); return r.blob(); };
  const ok = await BPHead.versand({ titel: `LV ${L.nr} an Bieter:innen senden`, anhaenge: true,   // weitere Unterlagen (Pläne, Baubeschreibung …) vom Rechner
    was: [{ icon: '📄', name: `LV ${L.nr} ${L.name} als PDF`, sub: 'ohne Preise – derselbe Druck wie „Drucken“', pdf: lvPdf, ohneUnterschrift: true },
      { icon: '📦', name: `LV ${L.nr} als GAEB X83`, sub: 'entsteht beim Senden aus dem aktuellen Stand' }],
    hinweis: (D.abgabe ? '' : '<p class="hint" style="color:var(--warn,#b7791f);margin:.3rem 0 0">Noch kein Abgabetermin – im Reiter „Versand“ oben eintragen, sonst steht in der Mail „…“.</p>') + (ohne.length ? `<p class="hint" style="color:var(--warn,#b7791f);margin:.3rem 0 0">Ohne gewählte E-Mail-Adresse – bekommt nichts: ${ohne.map((b) => esc(b.name)).join(', ')}</p>` : ''),
    empfaenger: mit.map((b) => ({ name: b.name, sub: b.email, email: b.email, contact_id: b.contact_id, on: !b.versendet && b.rueck !== 'absage' })),
    kopie: false, betreff: D.vorlage.betreff, text: D.vorlage.text,
    textHilfe: 'Jede Firma bekommt eine eigene Mail. Platzhalter füllt die Plattform je Firma: {anrede} (persönlich, siehe Liste), {firma}, {lv}, {projekt}, {bauvorhaben}, {abgabe}, {rueckmeldung}, {signatur}. Vorlage ändern: Kommunikation → Vorlagen.',
    fuss: () => `Abgabe ${esc(vsDe(D.abgabe) || '–')} · Rückmeldung ${esc(vsDe(D.rueckmeldung) || '–')} · Ablage: Projektordner → Leistungsverzeichnis`,
    knopf: () => 'Mails senden',
    senden: async (W) => {
      const an = W.an.map((a) => { const b = D.bieter.find((y) => y.contact_id === a.contact_id || y.email === a.email) || {}; return { contact_id: a.contact_id || b.contact_id || null, email: a.email, name: a.name || b.name || '', anrede: b.anrede || '' }; });
      const r = await api(`api/lv/${L.id}/versand/senden`, 'POST', { an, betreff: W.betreff, text: W.text, kopie: !!W.kopie, pdf: true, x83: true, anhaenge: W.anhaenge });
      VS.D = r; const fe = r.ergebnis.filter((x) => !x.ok);
      toast(`${r.ergebnis.length - fe.length} Mail${r.ergebnis.length - fe.length === 1 ? '' : 's'} gesendet${fe.length ? ` – ${fe.length} Fehler: ${fe.map((x) => x.name + ' (' + x.fehler + ')').join(', ')}` : ''}${r.ablage.length ? ' · im Projektordner abgelegt' : r.ablage_fehler ? ' · ' + r.ablage_fehler : ''}.`, !!fe.length);
      if (typeof refreshList === 'function') refreshList();
    } });
  if (ok) vsNeu();
});
