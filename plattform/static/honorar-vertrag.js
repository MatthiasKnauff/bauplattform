'use strict';
/* Honorar – Architektenvertrag (Server: honorar_vertrag.py) und Einstellungen der Abrechnung.
   Karte „Vertrag“ im Ablauf: „Vertrag (PDF)“ öffnet den Vertrag aus dem beauftragten Stand in der gemeinsamen Vorschau – dort
   ✍ Unterschreiben (am Handy mit dem Finger); die unterschriebene Fassung wird gespeichert und im Projektordner abgelegt.
   „Ablegen“ speichert die erzeugte Fassung ohne Unterschrift. Termine und besondere Vereinbarungen stehen im Vertrag (§ 5, letzter §).
   Einstellungen (Zahnrad → Diese App): Muster der Rechnungsnummer, Text unter dem Betrag, Zahlungsziel, weitere Vereinbarungen.
   Nutzt D, AID, laden() aus honorar.js. */
const VT_ORT = { buero: 'im Büro', ausserhalb: 'außerhalb (Baustelle, Wohnung)', fern: 'per Mail / Post' };
const deZeit = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '');

function vtFelder(ab) {
  const vt = ab.vertrag || {};
  return `<label class="w">Termine (§ 5)<input data-ab="vertrag.termine" value="${esc(vt.termine || '')}" placeholder="z. B. Bauantrag bis 31.03.2027"></label>
    <label class="w">Besondere Vereinbarungen<input data-ab="vertrag.besonderes" value="${esc(vt.besonderes || '')}" placeholder="kommt als letzter Punkt in den Vertrag"></label>
    <label class="hab-ck w" title="Bei Verbraucher:innen, wenn der Vertrag außerhalb des Büros oder nur per Mail/Post geschlossen wird: 14 Tage Widerrufsrecht – ohne Belehrung 12 Monate + 14 Tage und kein Honorar für Erbrachtes"><input type="checkbox" data-ab="vertrag.widerruf"${vt.widerruf ? ' checked' : ''}> Widerrufsbelehrung beilegen <small class="mute">Auftraggeber:in ist Verbraucher:in</small></label>
    ${vt.widerruf ? `<label class="w">Vertrag geschlossen<select data-ab="vertrag.ort" data-bp-auswahl>${vt.ort ? '' : '<option value="">– bitte wählen –</option>'}${Object.entries(VT_ORT).map(([v, t]) => `<option value="${v}"${vt.ort === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      ${vt.ort === 'buero' ? '<span class="hab-h w">Im Büro geschlossen: in der Regel kein Widerrufsrecht – die Belehrung schadet aber nicht.</span>' : ''}
      <label class="hab-ck w"><input type="checkbox" data-ab="vertrag.vorzeitig"${vt.vorzeitig ? ' checked' : ''}> Feld „Beginn vor Ende der Widerrufsfrist gewünscht“ zum Ankreuzen <small class="mute">sonst erst nach 14 Tagen beginnen</small></label>` : ''}
    ${vt.gesendet ? `<span class="hab-h w">✉ per Mail ${deZeit(vt.gesendet)} an ${esc(vt.gesendet_an || '')}${vt.gesendet_mit === 'widerruf' ? ` · mit Widerrufsbelehrung – Frist bis ${deZeit(plusTage(vt.gesendet, 14))}` : ''}</span>` : ''}`;
}

function vtKnoepfe() {
  const V = D.vertraege || [], u = V.find((x) => x.unterschrieben);
  return `<button type="button" class="btn sm pri" data-vtpdf title="Vertrag aus dem beauftragten Stand – in der Vorschau ✍ Unterschreiben">Vertrag (PDF)</button>`
    + `<button type="button" class="btn sm" data-vtab title="Erzeugte Fassung (ohne Unterschrift) speichern und im Projektordner ablegen">Ablegen</button>`
    + (((D.auftrag.ablauf || {}).vertrag || {}).widerruf ? `<button type="button" class="btn sm" data-vtwr title="Widerrufsbelehrung, Muster-Widerrufsformular und Empfangsbestätigung – eigene Datei">Belehrung (PDF)</button>` : '')
    + `<button type="button" class="btn sm" data-vtmail title="Vertrag${((D.auftrag.ablauf || {}).vertrag || {}).widerruf ? ' und Widerrufsbelehrung' : ''} per Mail an die Auftraggeber:in – gesendet wird erst mit „Senden“">✉ Per Mail senden</button>`
    + (V.length ? `<span class="hab-h" title="${esc(V.map((x) => `${deZeit(x.erstellt)} ${x.name}${x.unterschrieben ? ' (unterschrieben)' : ''}${x.ablage ? ' → ' + x.ablage : ''}`).join('\n'))}">`
      + `<a href="api/vertraege/${(u || V[0]).id}.pdf" data-ansehen="pdf">${u ? '✍ unterschrieben ' + deZeit(u.erstellt) : V.length + ' Fassung' + (V.length > 1 ? 'en' : '')}</a></span>` : '');
}

async function vtSpeichern(blob, name) {
  const id = AID, fd = new FormData();
  if (blob) { fd.append('datei', blob, name || 'Architektenvertrag.pdf'); fd.append('unterschrieben', '1'); }
  try {
    const r = await fetch(`api/auftraege/${id}/vertrag`, { method: 'POST', body: fd, credentials: 'same-origin' }), d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Speichern fehlgeschlagen');
    toast(d.ablage ? `Gespeichert und abgelegt: ${d.ablage}` : `Gespeichert${d.ablage_fehler ? ' – nicht im Projektordner: ' + d.ablage_fehler : ''}.`, !!d.ablage_fehler);
    rueckgaengig(blob ? 'Unterschriebenen Vertrag gespeichert' : 'Vertrag gespeichert', async () => { await api('api/vertraege/' + d.neu, 'DELETE'); AID = id; await laden(); });
    AID = id; await laden();
  } catch (e) { toast(e.message, true); }
}

document.addEventListener('click', async (e) => {
  const t = e.target.closest && e.target.closest('[data-vtpdf],[data-vtab],[data-vtwr],[data-vtmail]'); if (!t || !D) return;
  if (t.dataset.vtwr !== undefined) { const url = `api/auftraege/${AID}/widerruf.pdf?t=${Date.now()}`; if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name: `Widerrufsbelehrung ${D.projekt}` }]); return; }
  if (t.dataset.vtmail !== undefined) { vtMail(); return; }
  if (t.dataset.vtpdf !== undefined) {
    const url = `api/auftraege/${AID}/vertrag.pdf?t=${Date.now()}`;
    if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name: `Architektenvertrag ${D.projekt}`, mail: hoMail('honorarvertrag'), beiUnterschrift: (blob, nm) => vtSpeichern(blob, nm) }]);
    else window.open(url, '_blank', 'noopener');
    return;
  }
  if (t.dataset.vtab !== undefined) vtSpeichern(null);
});

/* Vertrag per Mail (honorar_widerruf.py) über den gemeinsamen Versand-Dialog (bp/versand.js): An aus den Adressen der Auftraggeber:in,
   Absender wählbar (GF: eigene Adresse zuerst) – nie automatisch */
async function vtMail() {
  const id = AID; let v;
  try { v = await api(`api/auftraege/${id}/vertrag/mail`); } catch (e) { toast(e.message, true); return; }
  if (!v.konfiguriert) { toast('Kein Mailserver eingerichtet (Verwaltung → Mail).', true); return; }
  await BPHead.versand({ titel: 'Architektenvertrag per Mail', projekt: D.projekt, einer: true, vorlagen: true,
    was: [{ icon: '📄', name: 'Architektenvertrag', sub: 'PDF – entsteht beim Senden', pdf: `api/auftraege/${id}/vertrag.pdf?t=${Date.now()}`, ohneUnterschrift: true },
      ...(v.widerruf ? [{ icon: '📄', name: 'Widerrufsbelehrung + Formular', sub: 'PDF – wird beim Senden auch im Projektordner abgelegt', pdf: `api/auftraege/${id}/widerruf.pdf?t=${Date.now()}`, ohneUnterschrift: true }] : [])],
    empfaenger: v.an.map((x, k) => ({ name: x.name || x.funktion || x.email, email: x.email, on: k === 0 })), betreff: v.betreff, text: v.text,
    optionen: `<label>Von <select data-vtvon data-bp-auswahl aria-label="Absender">${v.von.map((x) => `<option value="${esc(x.wert)}">${esc(x.text)}</option>`).join('')}</select></label>`,
    fuss: () => 'Geht als E-Mail mit Anhang raus',
    senden: async (W, box) => {
      const d = await api(`api/auftraege/${id}/vertrag/mail`, 'POST', { an: W.an[0].email, von: box.querySelector('[data-vtvon]').value, betreff: W.betreff, text: W.text, widerruf: v.widerruf });
      toast(`Gesendet an ${W.an[0].email}${d.ablage ? ' – Belehrung abgelegt: ' + d.ablage : ''}${d.ablage_fehler ? ' – nicht im Projektordner: ' + d.ablage_fehler : ''}`, !!d.ablage_fehler);
      AID = id; await laden();
    } });
}

/* Einstellungen (Zahnrad → Diese App) */
function honorarEinstellungen(host) {
  host.innerHTML = '<p class="mute">Lade …</p>';
  api('api/einstellungen').then((E) => {
    const feld = (k, label, hilfe, gross) => `<label class="hoe-f">${esc(label)}${gross ? `<textarea rows="${gross}" data-hoe="${k}">${esc(E[k])}</textarea>` : `<input data-hoe="${k}" value="${esc(E[k])}">`}<small>${hilfe}</small></label>`;
    host.innerHTML = `<div class="hoe">
      ${feld('honorar_re_nummer', 'Muster der Rechnungsnummer', `{jahr}, {jahr2} (zweistellig), {lfd} bzw. {lfd:03} (laufend je Jahr, dreistellig) – Beispiel: <b data-hoebsp>${esc(E.beispiel)}</b>`)}
      ${feld('honorar_zahlungsziel', 'Zahlungsziel (Tage)', 'Steht im Vertrag; danach erscheint „Honorarrechnung überfällig“ als To-do auf der Startseite.')}
      ${feld('honorar_re_text', 'Text unter dem Rechnungsbetrag', 'Vorschlag für neue Rechnungen (im Entwurf änderbar).', 3)}
      ${feld('honorar_fremd_zuschlag', 'Zuschlag auf Fachplaner:in (%)', 'Vorgabe für neu angelegte Fachplaner:in über unser Büro – je Fachplaner:in änderbar.')}
      ${feld('honorar_bank', 'Bankverbindung auf der Rechnung', 'Nur nötig, wenn sie nicht schon im Briefbogen steht (z. B. „Sparkasse Essen · IBAN DE… · BIC …“). Steuernummer: Verwaltung → Firma → „Weitere Angabe“.', 2)}
      <label class="hoe-f">Kennwort der PDFs im Projektordner<span style="display:flex;gap:.4rem;align-items:center"><input type="password" data-hoekw autocomplete="new-password" placeholder="${E.kennwort_gesetzt ? '●●●●●●●● – zum Ändern neu eingeben' : 'kein Kennwort – PDFs offen'}" style="flex:1">${E.kennwort_gesetzt ? '<button type="button" class="btn sm" data-hoekwweg>Entfernen</button>' : ''}</span>
        <small>Verträge und Rechnungen, die im Projektordner abgelegt werden, sind damit verschlüsselt (AES-256). Sie lassen sich auch ohne Plattform öffnen – nur mit diesem Kennwort. In der Plattform bleiben sie ohne Kennwort sichtbar (nur für die Verwaltung). Das Kennwort wird nie wieder angezeigt – bitte gut aufbewahren. Gilt für alles, was ab jetzt abgelegt wird.</small></label>
      ${feld('honorar_vertrag_text', 'Weitere Vereinbarungen im Architektenvertrag', 'Je Zeile ein Punkt. Vorschlag des Büros – bitte vor der ersten Verwendung prüfen.', 6)}</div>`;
    host.onclick = async (ev) => {
      if (!ev.target.closest('[data-hoekwweg]')) return;
      if (!(await bpFrage('Kennwort der PDFs entfernen? Was ab jetzt abgelegt wird, ist dann ohne Kennwort lesbar.', { ok: 'Entfernen' }))) return;
      try { await api('api/einstellungen', 'PUT', { kennwort_loeschen: true }); toast('Kennwort entfernt.'); honorarEinstellungen(host); } catch (er) { toast(er.message, true); }
    };
    host.onchange = async (ev) => {
      const el = ev.target;
      if (el.dataset.hoekw !== undefined) { if (!el.value.trim()) return;
        try { await api('api/einstellungen', 'PUT', { kennwort: el.value }); el.value = ''; toast('Kennwort gespeichert – neue PDFs im Projektordner sind verschlüsselt.'); honorarEinstellungen(host); } catch (er) { toast(er.message, true); }
        return; }
      if (!el.dataset.hoe) return;
      try { const r = await api('api/einstellungen', 'PUT', { [el.dataset.hoe]: el.value }); const b = host.querySelector('[data-hoebsp]'); if (b) b.textContent = r.beispiel; toast('Gespeichert.'); }
      catch (er) { toast(er.message, true); }
    };
  }).catch((e) => { host.innerHTML = `<p>${esc(e.message)}</p>`; });
}
