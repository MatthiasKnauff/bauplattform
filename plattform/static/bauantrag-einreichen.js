'use strict';
/* Bauantrag einreichen (F5, 13.11.2026): Klick auf „eingereicht“ fragt nach dem Weg (Papier, Bauportal, E-Mail), Datum, Aktenzeichen
   und Notiz; auf Wunsch kommen Antragspaket und Begleitliste in den Projektordner. Jede Einreichung steht im Verlauf unter „Stand“.
   Server: plattform/bauantrag_einreichen.py. Nutzt D, AID, L, zeichne(), laden() aus bauantrag.js. */
const EIN_WEGE = { papier: ['📮', 'Papier', 'Post oder persönlich'], bauportal: ['🌐', 'Bauportal', 'Online-Portal des Landes'], email: ['✉', 'E-Mail', 'an die Bauaufsicht'] };
const einDe = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '');

function einreichVerlauf() {   // unter „Stand“: wann, wie, Aktenzeichen, wo abgelegt
  const E = (D && D.einreichungen) || [];
  if (!E.length) return '';
  return `<div class="ba-ev">${E.slice().reverse().map((e) => `<div><b>${einDe(e.datum)}</b> eingereicht ${EIN_WEGE[e.weg] ? EIN_WEGE[e.weg][0] + ' ' + EIN_WEGE[e.weg][1] : ''}${e.aktenzeichen ? ` · Az. ${esc(e.aktenzeichen)}` : ''}
    <span class="mute"> · ${esc(e.von || '')}</span>${e.notiz ? `<div class="mute">${esc(e.notiz)}</div>` : ''}${(e.ablage || []).length ? `<div class="mute">abgelegt: ${e.ablage.map((p) => esc(p.split('/').pop())).join(' · ')}</div>` : ''}</div>`).join('')}</div>`;
}

/* Was beim Einreichen noch fehlt (17.11.2026: „am Ende vor fehlenden Unterlagen warnen“) – Pflicht rot, „falls nötig“ zum Prüfen, „wird nachgereicht“ zur Kenntnis.
   Eine Liste für „Prüfen“ und den Einreichen-Dialog. */
function bvFehlt() {
  const B = (D.bauvorlagen || []).filter((b) => b.key !== 'antrag');
  return { pflicht: B.filter((b) => b.pflicht && b.status === 'offen'), pruefen: B.filter((b) => !b.pflicht && b.status === 'offen'),
    spaeter: B.filter((b) => b.status === 'nachgereicht'), felder: (D.fehlt && D.fehlt.felder) || [] };
}
function bvWarnHtml(kurz) {
  const F = bvFehlt(), n = (L_) => L_.map((b) => `„${esc(b.name)}“`).join(', ');
  if (!F.pflicht.length && !F.pruefen.length && !F.spaeter.length && !F.felder.length) return kurz ? '' : '<span class="ok">✓ Alle Unterlagen liegen vor oder entfallen.</span>';
  return `<div class="ba-warn">${F.pflicht.length ? `<div class="ba-w-r"><b>${F.pflicht.length} Unterlage${F.pflicht.length === 1 ? '' : 'n'} ${F.pflicht.length === 1 ? 'fehlt' : 'fehlen'}:</b> ${n(F.pflicht)}</div>` : ''}
    ${F.felder.length ? `<div class="ba-w-r"><b>${F.felder.length} Pflichtangabe${F.felder.length === 1 ? '' : 'n'} leer:</b> ${F.felder.map(esc).join(', ')}</div>` : ''}
    ${F.pruefen.length ? `<div class="ba-w-g"><b>Noch auf „fehlt“, falls nötig – bitte prüfen:</b> ${n(F.pruefen)} <span class="mute">(nicht nötig → „entfällt“)</span></div>` : ''}
    ${F.spaeter.length ? `<div class="ba-w-i"><b>Wird nachgereicht:</b> ${n(F.spaeter)}</div>` : ''}
    ${kurz ? '' : '<a data-geh="bauvorlagen">zu den Bauvorlagen</a>'}</div>`;
}

function einreichenDialog() {
  let weg = (D.abgabe === 'digital' ? 'bauportal' : 'papier');
  const az = (D.anschreiben && D.anschreiben.aktenzeichen) || '';
  const F = bvFehlt(), hart = F.pflicht.length + F.felder.length;
  modalBox(`<h3>Bauantrag einreichen</h3>${bvWarnHtml(true)}
    <div class="ba-vw" role="radiogroup" aria-label="Weg">${Object.entries(EIN_WEGE).map(([k, [i, t, x]]) => `<button type="button" role="radio" class="ba-vo${k === weg ? ' on' : ''}" data-einweg="${k}" aria-checked="${k === weg}"><b>${i} ${t}</b><small>${x}</small></button>`).join('')}</div>
    <div class="row"><label>Eingereicht am<input type="date" id="einDat" value="${new Date().toISOString().slice(0, 10)}"></label><label>Aktenzeichen (falls schon bekannt)<input id="einAz" value="${esc(az)}" autocomplete="off"></label></div>
    <div class="row"><label>Notiz<textarea id="einNotiz" rows="2" placeholder="z. B. Vorgangsnummer des Portals, Eingangsbestätigung abwarten"></textarea></label></div>
    <label class="chk"><input type="checkbox" id="einAbl" checked> Antragspaket und Begleitliste im Projektordner ablegen</label>
    <p class="ba-hilfe">Danach sind die Angaben gesperrt (zum Ändern zurück auf „Entwurf“). Die Einreichung steht im Verlauf unter „Stand“.</p>
    <div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">${hart ? 'Trotzdem eingereicht' : 'Eingereicht'}</button></div>`,
  async (m, bg, close, btn) => {
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    btn.disabled = true; btn.textContent = 'lege ab …';
    const id = AID;
    try {
      const r = await api(`api/antraege/${id}/einreichen`, 'POST', { weg, datum: bg.querySelector('#einDat').value, aktenzeichen: bg.querySelector('#einAz').value,
        notiz: bg.querySelector('#einNotiz').value, ablegen: bg.querySelector('#einAbl').checked });
      close(); D = r; L = await api('api/antraege'); zeichne();
      const e = (r.einreichungen || []).slice(-1)[0] || {};
      toast(`Eingereicht (${EIN_WEGE[weg][1]}) am ${einDe(e.datum)}${(e.ablage || []).length ? ' – im Projektordner abgelegt' : ''}.${r.hinweis ? ' ' + r.hinweis : ''}`, !!r.hinweis);
      rueckgaengig('Stand: eingereicht', async () => { D = await api(`api/antraege/${id}/einreichen`, 'DELETE'); L = await api('api/antraege'); zeichne(); });   // abgelegte Dateien bleiben im Projektordner
    } catch (er) { btn.disabled = false; btn.textContent = hart ? 'Trotzdem eingereicht' : 'Eingereicht'; toast(er.message, true); }
  });
  const bg = [...document.querySelectorAll('.modal-bg')].pop();
  bg.addEventListener('click', (e) => { const o = e.target.closest('[data-einweg]'); if (!o) return; weg = o.dataset.einweg;
    bg.querySelectorAll('[data-einweg]').forEach((x) => { const on = x === o; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); });
}
