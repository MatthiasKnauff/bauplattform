'use strict';
/* „Mein Ordner“ (GO 19.11.2026, Mock „Mein Ordner“: A1 B1 C1) – Baustein, von head.js erst bei Bedarf geladen (H.meinordner()).
   bpMeinOrdner.menue(m)   Menü unter dem Benutzernamen: „📁 Mein Ordner“ → Pläne & Dateien #ich; ohne Eintrag ausgegraut (C1)
   bpMeinOrdner.konto(el)  Mein Konto → Abschnitt „Mein Ordner“: Unterordner in der Wurzel der Verwaltung wählen (A1), Vorschlag (C1)
   Kern bpcore/meinordner.py (/api/bp/meinordner). Sehen kann den Ordner nur die Person selbst (B1). */
(function () {
  const H = window.BPHead, E = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const J = (u, o = {}) => fetch(u, { credentials: 'same-origin', ...o }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || 'Fehler ' + r.status); return j; });
  let STAND = null;
  const plaeneUrl = () => { const a = (((H && H.conf) || {}).apps || []).find((x) => x.key === 'plaene' && x.allowed); return a ? window.bpAppUrl(a) + '/#ich' : ''; };
  async function stand(neu) { if (!STAND || neu) { try { STAND = await J('api/bp/meinordner'); } catch { STAND = { ordner: '' }; } } return STAND; }

  function menue(m) {
    const b = m.querySelector('[data-meinordner]'); if (!b) return;
    if (!plaeneUrl()) { b.remove(); return; }
    stand().then((s) => {
      if (s.ordner) { b.querySelector('small').textContent = s.ordner; return; }
      b.classList.add('bph-aus'); b.title = 'Noch kein eigener Ordner gewählt'; b.querySelector('small').textContent = 'In Mein Konto festlegen';
    });
  }
  function oeffnen() {
    stand().then((s) => { if (s.ordner) location.href = plaeneUrl(); else H.einstellungen({ bereich: 'ich', teil: 'konto' }); });
  }

  async function konto(el) {
    el.innerHTML = '<p class="bph-mu">Lade …</p>';
    let s; try { s = await J('api/bp/meinordner?liste=1'); } catch (e) { el.innerHTML = `<p class="bph-mu">${E(e.message)}</p>`; return; }
    STAND = s;
    const vor = !s.ordner && s.vorschlag ? s.vorschlag : '', wert = s.ordner || vor;
    el.innerHTML = `<p class="bph-mu">Dein eigener Ordner auf dem Dateiserver – in „Pläne &amp; Dateien“ unter „Benutzerordner“ und im Menü unter deinem Namen. Nur du siehst ihn. Den übergeordneten Ordner legt die Verwaltung fest (Pläne &amp; Dateien → Einstellungen → Ablage).</p>
      <div class="bph-row"><label style="flex:1">Mein Ordner<span style="display:flex;gap:.3rem;align-items:center"><span class="bph-mu" style="white-space:nowrap">${E(s.wurzel)} /</span><input data-mo-in value="${E(wert)}" placeholder="z. B. dein Vorname" maxlength="120" autocomplete="off" style="flex:1"></span></label></div>
      ${vor ? `<p class="bph-mu">Vorschlag: den vorhandenen Ordner „${E(vor)}“ – mit „Speichern“ übernehmen.</p>` : ''}${s.fehler ? `<p class="bph-mu">Ordnerliste nicht lesbar: ${E(s.fehler)}</p>` : ''}
      ${(s.liste || []).length ? `<div class="bph-chips">${s.liste.slice(0, 40).map((x) => `<button type="button" data-mo-w="${E(x)}"${x === wert ? ' class="on"' : ''}>${E(x)}</button>`).join('')}</div>` : ''}
      <div class="bph-row"><button type="button" class="bph-btn pri" data-mo-ok>Speichern</button>${s.ordner ? '<button type="button" class="bph-btn" data-mo-weg>Entfernen</button>' : ''}${s.ordner && plaeneUrl() ? `<a class="bph-btn" href="${E(plaeneUrl())}">📁 Öffnen</a>` : ''}<span class="bph-mu" data-mo-msg></span></div>`;
    el.onclick = async (e) => {
      const w = e.target.closest('[data-mo-w]'); if (w) { el.querySelector('[data-mo-in]').value = w.dataset.moW; el.querySelectorAll('[data-mo-w]').forEach((x) => x.classList.toggle('on', x === w)); return; }
      const ok = e.target.closest('[data-mo-ok]'), weg = e.target.closest('[data-mo-weg]'); if (!ok && !weg) return;
      try {
        STAND = await J('api/bp/meinordner', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordner: weg ? '' : el.querySelector('[data-mo-in]').value.trim() }) });
        konto(el).then(() => { const m = el.querySelector('[data-mo-msg]'); if (m) m.textContent = weg ? 'Entfernt.' : STAND.ordner ? 'Gespeichert – der Ordner wird beim ersten Öffnen angelegt, falls es ihn noch nicht gibt.' : ''; });
      } catch (er) { const m = el.querySelector('[data-mo-msg]'); if (m) m.textContent = er.message; }
    };
  }
  window.bpMeinOrdner = { menue, oeffnen, konto, stand };
})();
