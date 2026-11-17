'use strict';
/* Bauzeitenplan – Ansicht für Externe: liest /api/ansicht/<Schlüssel>; Tabelle und Balken zeichnet der Baustein bp/zeitplan.js (wie im Bauherrenportal). */
(() => {
  const tok = location.pathname.split('/').filter(Boolean).pop();
  const api = new URL('../api/ansicht/' + encodeURIComponent(tok), location.href);
  const $ = (s) => document.querySelector(s), esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let Z = null;
  const knoepfe = () => document.querySelectorAll('[data-z]').forEach((b) => b.classList.toggle('on', Z && b.dataset.z === Z.stufe));
  document.addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]'); if (z && Z) { Z.zoom(z.dataset.z); knoepfe(); return; }
    if (e.target.closest('#heute') && Z) { Z.heute(); return; }
    if (e.target.closest('#drucken')) window.print();
  });
  fetch(api, { credentials: 'omit' }).then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Der Plan ist nicht erreichbar.'); return d; })
    .then((d) => {
      document.title = `${d.projekt || d.plan} – Bauzeitenplan`;
      const K = d.kopf || {}; if (K.farbe) document.documentElement.style.setProperty('--acc', K.farbe);   // Büro-Farbe und Logo (Verwaltung → Firma & Logo)
      if (K.buero || K.logo) { $('#buero').hidden = false; $('#bname').textContent = K.buero || ''; if (K.logo) { $('#logo').src = K.logo; $('#logo').hidden = false; }
        $('#fuer').textContent = [d.fuer ? 'für ' + d.fuer : '', d.gewerk ? 'Gewerk ' + d.gewerk : ''].filter(Boolean).join(' · '); }
      $('#titel').textContent = d.projekt || d.plan;
      $('#unter').textContent = [d.adresse, d.stand].filter(Boolean).join(' · ');
      Z = bpZeitplan.mount($('#plan'), d); knoepfe();
    })
    .catch((er) => { $('#plan').innerHTML = `<div class="ak-fehler"><b>${esc(er.message)}</b>Bitte wende dich an die Person, die dir den Link geschickt hat.</div>`; $('.ak-k').hidden = true; });
})();
