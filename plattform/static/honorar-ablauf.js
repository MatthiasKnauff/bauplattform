'use strict';
/* Honorar – Ablauf je Auftrag: Anfrage → Angebot → Auftrag → Vertrag → Abrechnung → Abgeschlossen (dazu „abgelehnt“).
   Oben die Stufen als Leiste (Klick = Stufe setzen), darunter je Stufe eine Karte mit ihren Angaben und dem Knopf zur nächsten Stufe.
   Gespeichert in honorar_auftrag.status und .ablauf (JSON je Stufe). Wird vor honorar.js geladen; nutzt dessen D, AID, L, VS, laden(), pdf().
   Erinnerungen (nachfassen, Bindefrist, Vertrag fehlt) kommen als automatische To-dos auf die Startseite (bpcore/todo.py, „honorar“). */
const STUFEN = ['anfrage', 'angebot', 'beauftragt', 'vertrag', 'abrechnung', 'abgeschlossen'];
const STUFE_GRUPPE = { anfrage: 'Anfragen', angebot: 'Angebote', beauftragt: 'Beauftragt', vertrag: 'Vertrag', abrechnung: 'In Abrechnung', abgeschlossen: 'Abgeschlossen', abgelehnt: 'Abgelehnt' };
const STUFE_FARBE = { anfrage: 'var(--warn,#b7791f)', angebot: 'var(--y)', beauftragt: 'var(--ok,#1e8a4c)', vertrag: 'var(--ok,#1e8a4c)', abrechnung: 'var(--ok,#1e8a4c)', abgeschlossen: 'var(--mute)', abgelehnt: 'var(--red)' };
const WEGE = { mail: 'Mail', telefon: 'Telefon', persoenlich: 'persönlich', brief: 'Brief' };
const DURCH = { schreiben: 'Auftragsschreiben', mail: 'Mail', muendlich: 'mündlich', vertrag: 'direkt mit Vertrag' };
const deD = (t) => (t && t.length >= 10 ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : t || '');
const heuteIso = () => new Date().toISOString().slice(0, 10);
const plusTage = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const tageSeit = (iso) => (iso ? Math.round((Date.now() - new Date(iso + 'T12:00:00')) / 864e5) : null);

/* kurzer Hinweis in der Liste links: [Text, Tooltip] */
function stufeHinweis(a) {
  const ab = a.ablauf || {}, an = ab.anfrage || {}, ag = ab.angebot || {}, vt = ab.vertrag || {};
  if (a.status === 'anfrage') { const n = tageSeit(an.datum || a.datum); return n != null ? [`${n} T.`, `Anfrage seit ${n} Tagen`] : ['', '']; }
  if (a.status === 'angebot') { const bf = ag.bindefrist ? tageSeit(ag.bindefrist) : null;
    return [a.versionen ? 'v' + a.versionen : (ag.gesendet ? 'ges.' : ''), [a.versionen ? a.versionen + ' Version(en)' : '', ag.gesendet ? 'gesendet ' + deD(ag.gesendet) : 'noch nicht gesendet', bf != null ? (bf > 0 ? 'Bindefrist abgelaufen' : `Bindefrist noch ${-bf} T.`) : ''].filter(Boolean).join(' · ')]; }
  if (a.status === 'beauftragt') return ['o. Vertrag', 'beauftragt, Vertrag fehlt noch'];
  if (a.status === 'vertrag') return vt.bh && vt.buero ? ['', ''] : ['Unterschr.', 'Unterschrift fehlt: ' + [vt.bh ? '' : 'Bauherr', vt.buero ? '' : 'Büro'].filter(Boolean).join(', ')];
  return ['', ''];
}

function ablaufHtml() {
  const a = D.auftrag, ab = a.ablauf || {}, st = a.status, k = D.rechnung;
  const cur = st === 'abgelehnt' ? 1 : STUFEN.indexOf(st);
  const an = ab.anfrage || {}, ag = ab.angebot || {}, au = ab.auftrag || {}, vt = ab.vertrag || {}, ar = ab.abrechnung || {};
  const sub = {
    anfrage: an.datum ? deD(an.datum) + (an.von ? ' · ' + an.von : '') : an.von || '',
    angebot: st === 'abgelehnt' ? 'abgelehnt' + ((ab.abgelehnt || {}).datum ? ' ' + deD(ab.abgelehnt.datum) : '') : ag.gesendet ? 'gesendet ' + deD(ag.gesendet) : (VS && VS.aid === AID && VS.versionen.length ? VS.versionen.length + ' Version(en)' : ''),
    beauftragt: au.datum ? deD(au.datum) + (au.durch ? ' · ' + (DURCH[au.durch] || au.durch) : '') : '', vertrag: vt.datum ? deD(vt.datum) : '',
    abrechnung: k && k.erbracht ? 'erbracht ' + eur0(k.erbracht) : '', abgeschlossen: '' };
  const flow = STUFEN.map((s, i) => `<button type="button" class="hab-s${i < cur ? ' ok' : i === cur ? (st === 'abgelehnt' ? ' ab' : ' cur') : ''}" data-stufe="${s}" title="Stufe „${esc(L.status[s])}“ setzen"><b>${esc(L.status[s])}</b><small>${esc(sub[s] || (i === cur ? 'jetzt' : i === cur + 1 ? 'als Nächstes' : '–'))}</small></button>`).join('');
  const tag = (i) => (i < cur ? 'erledigt' : i === cur ? 'aktuell' : i === cur + 1 ? 'nächster Schritt' : 'später');
  const z = (s, f, label, typ = 'text', ph = '') => `<label>${esc(label)}<input${typ === 'date' ? ' type="date"' : ''} data-ab="${s}.${f}" value="${esc((ab[s] || {})[f] || '')}"${ph ? ` placeholder="${esc(ph)}"` : ''}></label>`;
  const seg = (s, f, W) => `<span class="seg" role="group">${Object.entries(W).map(([v, t]) => `<button type="button" data-abseg="${s}.${f}" data-v="${v}" class="${(ab[s] || {})[f] === v ? 'on' : ''}">${esc(t)}</button>`).join('')}</span>`;
  const ck = (s, f, label) => `<label class="hab-ck"><input type="checkbox" data-ab="${s}.${f}"${(ab[s] || {})[f] ? ' checked' : ''}> ${esc(label)}</label>`;
  const karte = (i, ic, titel, inhalt, knoepfe) => `<div class="ho-k hab-k${i < cur ? ' fertig' : i > cur + 1 ? ' spaeter' : i === cur ? ' jetzt' : ''}"><h3>${ic} ${titel}<span class="mute">${tag(i)}</span></h3><div class="ho-f">${inhalt}</div>${knoepfe ? `<div class="hab-a">${knoepfe}</div>` : ''}</div>`;
  const weiter = (s, t, pri = true) => `<button type="button" class="btn sm${pri ? ' pri' : ''}" data-weiter="${s}">${t}</button>`;
  const vsL = VS && VS.aid === AID ? VS.versionen : [], gilt = vsL.find((v) => v.gilt);
  const bf = ag.bindefrist ? -tageSeit(ag.bindefrist) : null;
  const karten = [
    karte(0, '📨', 'Anfrage', `${z('anfrage', 'von', 'von', 'text', 'z. B. Bauherr')}${z('anfrage', 'datum', 'eingegangen', 'date')}<label>Weg${seg('anfrage', 'weg', WEGE)}</label>${z('anfrage', 'leistung', 'Leistung', 'text', 'z. B. Erweiterung, LPh 1–9')}`,
      cur === 0 ? weiter('angebot', 'Angebot erstellen ›') : ''),
    karte(1, '📄', 'Angebot', `<label>Versionen<input value="${vsL.length ? vsL.length + (gilt ? ' · gilt: ' + gilt.name : '') : 'noch keine'}" disabled></label>${z('angebot', 'gesendet', 'gesendet am', 'date')}${z('angebot', 'bindefrist', 'Bindefrist', 'date')}${z('angebot', 'nachfassen', 'nachfassen am', 'date')}
        ${bf != null ? `<span class="hab-h${bf < 7 ? ' warn' : ''}">${bf < 0 ? 'Bindefrist abgelaufen' : `noch ${bf} Tag${bf === 1 ? '' : 'e'} gebunden`}</span>` : ''}`,
      `<button type="button" class="btn sm" data-vneu>Neue Version</button><button type="button" class="btn sm" data-abpdf>PDF</button>${cur <= 1 && st !== 'abgelehnt' ? weiter('beauftragt', 'Auftrag erhalten ›') + '<button type="button" class="btn sm" data-ablehnen>abgelehnt</button>' : ''}${st === 'abgelehnt' ? `<span class="hab-h warn">abgelehnt${(ab.abgelehnt || {}).grund ? ': ' + esc(ab.abgelehnt.grund) : ''}</span>` + weiter('angebot', 'wieder öffnen', false) : ''}`),
    karte(2, '✅', 'Auftrag', `${z('auftrag', 'datum', 'beauftragt am', 'date')}<label>durch${seg('auftrag', 'durch', DURCH)}</label>${z('auftrag', 'umfang', 'Umfang', 'text', 'z. B. LPh 1–4 wie im Angebot, Stufe 1')}
        <label>beauftragte Version<input value="${esc(gilt ? gilt.name : vsL.length ? 'keine als „gilt“ markiert' : 'der jetzige Stand')}" disabled></label>`,
      cur === 2 ? weiter('vertrag', 'Vertrag ›') : ''),
    karte(3, '✍', 'Vertrag', `${z('vertrag', 'datum', 'Vertrag vom', 'date')}${ck('vertrag', 'bh', 'unterschrieben Bauherr')}${ck('vertrag', 'buero', 'unterschrieben Büro')}${z('vertrag', 'ablage', 'abgelegt', 'text', 'z. B. Vertragsverzeichnis, Projektordner')}`,
      (cur === 3 ? weiter('abrechnung', 'Abrechnung ›') : '') + '<span class="mute hab-sp">Vertrag aus der beauftragten Version erzeugen und unterschreiben: folgt</span>'),
    karte(4, '💶', 'Abrechnung', `<label>erbracht<input value="${k ? eur0(k.erbracht) : '–'}" disabled></label><label>Honorar netto<input value="${k ? eur0(k.netto) : '–'}" disabled></label>
        <label class="w">Notiz<input data-ab="abrechnung.notiz" value="${esc(ar.notiz || '')}" placeholder="z. B. 1. Abschlag LPh 1–2 gestellt"></label>`,
      (cur === 4 ? weiter('abgeschlossen', 'Abgeschlossen ›') : '') + '<span class="mute hab-sp">Abschläge nach erbrachten LPh, bezahlt/offen, Schlussrechnung: folgt</span>'),
  ];
  return `<div class="ho-k hab-flow" role="group" aria-label="Ablauf">${flow}</div><div class="hab-r">${karten.join('')}</div>`;
}

/* Speichern mit Rückgängig: Stufe und Angaben; der alte Stand wird feldgenau gemerkt (null = Feld war leer) */
async function abSetzen(werte, text) {
  const a = D.auftrag, ab = a.ablauf || {}, alt = {}, id = AID;
  if ('status' in werte) alt.status = a.status;
  if (werte.ablauf) { alt.ablauf = {}; Object.entries(werte.ablauf).forEach(([s, x]) => { alt.ablauf[s] = {}; Object.keys(x).forEach((f) => { alt.ablauf[s][f] = (ab[s] || {})[f] ?? null; }); }); }
  try { await api('api/auftraege/' + id, 'PUT', werte); } catch (e) { toast(e.message, true); return; }
  rueckgaengig(text, async () => { await api('api/auftraege/' + id, 'PUT', alt); AID = id; await laden(); }, 10000, async () => { await api('api/auftraege/' + id, 'PUT', werte); AID = id; await laden(); });
  await laden();
}

async function stufeSetzen(s) {
  const ab = D.auftrag.ablauf || {}, heute = heuteIso(), w = { status: s };
  if (s === 'beauftragt' && !(ab.auftrag || {}).datum) w.ablauf = { auftrag: { datum: heute } };
  if (s === 'angebot' && D.auftrag.status === 'anfrage' && !(ab.anfrage || {}).datum) w.ablauf = { anfrage: { datum: D.auftrag.datum || heute } };
  await abSetzen(w, `Stufe: ${L.status[s]}`);
  if (s === 'beauftragt' && VS && VS.aid === AID && VS.versionen.length && !VS.versionen.some((v) => v.gilt)) {   // beauftragte Version = die neueste
    try { await vHolen(await api(`api/versionen/${VS.versionen[0].id}?auftrag=${AID}`, 'PUT', { gilt: true })); toast(`„${VS.versionen[0].name}“ gilt als beauftragt.`); } catch (e) { toast(e.message, true); }
  }
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-stufe],[data-weiter],[data-abseg],[data-ablehnen],[data-abpdf]'); if (!t || !D) return;
  if (t.dataset.stufe) { if (t.dataset.stufe !== D.auftrag.status) await stufeSetzen(t.dataset.stufe); return; }
  if (t.dataset.weiter) { await stufeSetzen(t.dataset.weiter); return; }
  if (t.dataset.abpdf !== undefined) { pdf(); return; }
  if (t.dataset.abseg) { const [s, f] = t.dataset.abseg.split('.'), an = !t.classList.contains('on');
    await abSetzen({ ablauf: { [s]: { [f]: an ? t.dataset.v : null } } }, `${f === 'weg' ? 'Weg' : 'Beauftragt durch'}: ${an ? t.textContent : '–'}`); return; }
  if (t.dataset.ablehnen !== undefined) {
    const g = await bpEingabe('Angebot abgelehnt – Grund (optional)', '', { ok: 'Abgelehnt' }); if (g == null) return;
    await abSetzen({ status: 'abgelehnt', ablauf: { abgelehnt: { datum: heuteIso(), grund: g || null } } }, 'Angebot abgelehnt');
  }
});
document.addEventListener('change', async (e) => {
  const t = e.target; if (!t.dataset || !t.dataset.ab || !D) return;
  const [s, f] = t.dataset.ab.split('.'), v = t.type === 'checkbox' ? t.checked : t.value.trim();
  const x = { [f]: v === '' || v === false ? null : v };
  if (s === 'angebot' && f === 'gesendet' && v) {   // gesendet: Bindefrist 4 Wochen, nachfassen nach 2 Wochen vorschlagen
    const ag = D.auftrag.ablauf.angebot || {};
    if (!ag.bindefrist) x.bindefrist = plusTage(v, 28);
    if (!ag.nachfassen) x.nachfassen = plusTage(v, 14);
  }
  await abSetzen({ ablauf: { [s]: x } }, `${(t.closest('label') || {}).textContent?.trim().split('\n')[0] || 'Angabe'} geändert`);
});
