'use strict';
/* Honorar – Architektenvertrag (Server: honorar_vertrag.py) und Einstellungen der Abrechnung.
   Karte „Vertrag“ im Ablauf: „Vertrag (PDF)“ öffnet den Vertrag aus dem beauftragten Stand in der gemeinsamen Vorschau – dort
   ✍ Unterschreiben (am Handy mit dem Finger); die unterschriebene Fassung wird gespeichert und im Projektordner abgelegt.
   „Ablegen“ speichert die erzeugte Fassung ohne Unterschrift. Termine und besondere Vereinbarungen stehen im Vertrag (§ 5, letzter §).
   Einstellungen (Zahnrad → Diese App): Muster der Rechnungsnummer, Text unter dem Betrag, Zahlungsziel, weitere Vereinbarungen.
   Nutzt D, AID, laden() aus honorar.js. */
const deZeit = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '');

function vtFelder(ab) {
  const vt = ab.vertrag || {};
  return `<label class="w">Termine (§ 5)<input data-ab="vertrag.termine" value="${esc(vt.termine || '')}" placeholder="z. B. Bauantrag bis 31.03.2027"></label>
    <label class="w">Besondere Vereinbarungen<input data-ab="vertrag.besonderes" value="${esc(vt.besonderes || '')}" placeholder="kommt als letzter Punkt in den Vertrag"></label>`;
}

function vtKnoepfe() {
  const V = D.vertraege || [], u = V.find((x) => x.unterschrieben);
  return `<button type="button" class="btn sm pri" data-vtpdf title="Vertrag aus dem beauftragten Stand – in der Vorschau ✍ Unterschreiben">Vertrag (PDF)</button>`
    + `<button type="button" class="btn sm" data-vtab title="Erzeugte Fassung (ohne Unterschrift) speichern und im Projektordner ablegen">Ablegen</button>`
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
  const t = e.target.closest && e.target.closest('[data-vtpdf],[data-vtab]'); if (!t || !D) return;
  if (t.dataset.vtpdf !== undefined) {
    const url = `api/auftraege/${AID}/vertrag.pdf?t=${Date.now()}`;
    if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name: `Architektenvertrag ${D.projekt}`, beiUnterschrift: (blob, nm) => vtSpeichern(blob, nm) }]);
    else window.open(url, '_blank', 'noopener');
    return;
  }
  if (t.dataset.vtab !== undefined) vtSpeichern(null);
});

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
