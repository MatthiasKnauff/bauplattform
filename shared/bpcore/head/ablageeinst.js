/* Was eine App auf dem Dateiserver ablegt – ein Baustein für die Einstellungsseite jeder App (beschlossen am 17.11.2026).
   bpAblageEinst(host, app, { unten(el, D) }) – Felder kommen vom Kern (bpcore/ablage_einst.py, /api/bp/ablage-einst/<app>).
   Wird ein Ordnername geändert, fragt der Baustein, ob die vorhandenen Ordner mitwandern; umbenannt wird im Container „dienste“.
   Der Zugang zum Dateiserver selbst steht in der Verwaltung → Ablage & Server. Geladen über BPHead.ablageEinst (erst bei Bedarf). */
(function () {
  const esc = window.bpEsc;
  const K = (u, o = {}) => fetch(u, { credentials: 'same-origin', ...o, headers: o.body ? { 'Content-Type': 'application/json' } : {} })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || 'Fehler ' + r.status); return j; });
  const meld = (t, f) => (window.toast ? toast(t, f) : window.bpHinweis && bpHinweis(t));
  const verw = () => { const H = window.BPHead || {}, v = ((H.conf || {}).apps || []).find((x) => x.key === 'admin'); return v && H.appUrl ? H.appUrl(v) + '/#einstellungen-ablage' : ''; };
  const ord = (f, v) => (f.art === 'zeilen' ? v.split('\n').map((z) => z.trim()).filter(Boolean).join(' · ') : v);
  const job = (j) => `<li>${j.fertig ? (j.fehler ? '✖' : '✔') : '⏳'} ${esc(j.alt.join(j.key === 'ordner_personal' ? ' · ' : '/'))} → <b>${esc(j.neu.join(j.key === 'ordner_personal' ? ' · ' : '/'))}</b>`
    + ` <span class="bph-mu">${j.fertig ? (j.fehler ? 'Fehler: ' + esc(j.fehler) : `umbenannt (${j.anzahl || 0} Ordner)`) : 'wartet auf den Dienst (höchstens ein paar Minuten)'}</span></li>`;

  window.bpAblageEinst = function (host, app, opt = {}) {
    const url = 'api/bp/ablage-einst/' + encodeURIComponent(app);
    const zeichne = (D) => {
      const dis = D.aendern ? '' : ' disabled', v = verw();
      host.innerHTML = `<div class="bpae">
        <p class="bph-mu" style="margin-top:0">${esc(D.text)}</p>
        ${D.ablage ? '' : `<p class="bpae-aus">Die Ablage auf dem Dateiserver ist ausgeschaltet – die Einstellungen hier wirken erst, wenn sie unter Verwaltung → Ablage &amp; Server eingeschaltet ist.${v ? ` <a href="${esc(v)}" target="_top">Dorthin</a>` : ''}</p>`}
        ${D.felder.map((f) => `<label class="bpae-f"><span>${esc(f.label)}</span>${
          f.art === 'auswahl' ? `<span class="bpae-seg" data-k="${f.key}">${f.opt.map(([w, l]) => `<button type="button" data-w="${esc(w)}" class="${String(f.wert) === w ? 'on' : ''}"${dis}>${esc(l)}</button>`).join('')}</span>`
          : f.art === 'zeilen' ? `<textarea data-k="${f.key}" rows="${Math.max(4, f.wert.split('\n').length + 1)}"${dis}>${esc(f.wert)}</textarea>`
          : `<input data-k="${f.key}" value="${esc(f.wert)}" ${f.art === 'zahl' ? 'type="number" min="0" style="max-width:8rem"' : `placeholder="${esc(f.vorgabe)}"`}${dis}>`
        }${f.ordner && f.wert !== f.vorgabe ? `<small class="bph-mu">Vorgabe: ${esc(ord(f, f.vorgabe))}</small>` : ''}</label>`).join('')}
        ${D.auftraege.length ? `<ul class="bpae-j">${D.auftraege.map(job).join('')}</ul>` : ''}
        ${D.aendern ? '<div class="bpae-a"><button type="button" class="bph-btn bph-pri" data-bpae="s">Speichern</button></div>' : '<p class="bph-mu">Ändern darf, wer in der Verwaltung den Bereich „Ablage“ ändern darf.</p>'}
        <div class="bpae-u"></div></div>`;
      host._D = D;
      if (opt.unten) try { opt.unten(host.querySelector('.bpae-u'), D); } catch { /* Zusatz der App: Fehler stören die Felder nicht */ }
    };
    if (!host._bpae) {
      host._bpae = 1;
      host.addEventListener('click', async (e) => {
        const s = e.target.closest('.bpae-seg button'); if (s) { s.parentNode.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === s)); return; }
        if (!e.target.closest('[data-bpae="s"]')) return;
        const D = host._D, werte = {}, neu = [];
        D.felder.forEach((f) => {
          const el = host.querySelector(`[data-k="${f.key}"]`); if (!el) return;
          const w = f.art === 'auswahl' ? ((el.querySelector('.on') || {}).dataset || {}).w : el.value;
          if (w == null || String(w) === String(f.wert)) return;
          werte[f.key] = String(w);
          if (f.ordner) neu.push(`„${ord(f, f.wert)}“ → „${ord(f, String(w).trim())}“`);
        });
        if (!Object.keys(werte).length) { meld('Nichts geändert.'); return; }
        let umbenennen = false;
        if (neu.length) {
          const a = await bpFrage(`Vorhandene Ordner auf dem Dateiserver mit umbenennen?\n${neu.join('\n')}\n\n„Nur künftig“: Die App legt ab jetzt unter dem neuen Namen ab, die vorhandenen Ordner bleiben, wie sie sind.`, { ok: 'Ja, umbenennen', drei: 'Nur künftig' });
          if (!a) return; umbenennen = a === true;
        }
        try { zeichne(await K(url, { method: 'PUT', body: JSON.stringify({ werte, umbenennen }) })); meld(umbenennen ? 'Gespeichert – die Ordner werden umbenannt.' : 'Gespeichert.'); } catch (er) { meld(er.message, true); }
      });
    }
    host.innerHTML = '<p class="bph-mu">Lade …</p>';
    return K(url).then(zeichne).catch((e) => { host.innerHTML = `<p class="bph-mu">${esc(e.message)}</p>`; });
  };
})();
