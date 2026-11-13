'use strict';
/* Verwaltung → Einstellungen durchsuchen: ein Stichwortverzeichnis aller Einstellungen (Persönlich, Büro, Seiten der Apps).
   Zeigt nur, was die Rolle sehen darf (darfSeite aus admin-wer.js); Klick öffnet die Seite und hebt den Abschnitt hervor.
   Gehört zu admin.html (gemeinsame Namen: $, esc, tab, data, renderTabs, load, darfSeite, REGS). */
const SUCH = () => (window.bpSuche ? bpSuche.EINST : []);   // Seite (stab), Ort, Titel, Stichwörter, Abschnitt – steht im Baukasten (bp/suche.js), dieselbe Liste wie die Suche in der Kopfleiste
const _fq = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const suchFeld = () => `<div class="st-such"><input type="search" placeholder="Einstellungen durchsuchen – z. B. Signatur, Logo, Erinnerung …" aria-label="Einstellungen durchsuchen" autocomplete="off"><div class="st-sres" hidden></div></div>`;
function suchTreffer(q) {
  const w = _fq(q).split(/\s+/).filter(Boolean); if (!w.length) return [];
  return SUCH().filter(([st, ort, t, k]) => darfSeite('einstellungen', st) && (!st.startsWith('app:') || (data.conf.apps || []).some((a) => a.allowed && a.key === st.slice(4).split('~')[0]))
    && w.every((a) => _fq(`${ort} ${t} ${k}`).includes(a)));
}
document.addEventListener('input', (e) => {
  const i = e.target.closest && e.target.closest('.st-such input'); if (!i) return;
  const box = i.nextElementSibling, L = suchTreffer(i.value);
  box.hidden = !i.value.trim();
  box.innerHTML = L.length ? L.map(([st, ort, t, k, ab]) => `<button type="button" data-such="${esc(st)}" data-ab="${esc(ab)}"><small>${esc(ort)}</small><b>${esc(t)}</b><span>${esc(k.split(' ').slice(0, 8).join(' · '))}</span></button>`).join('')
    : `<p class="mute" style="margin:.4rem .6rem">Keine Einstellung zu „${esc(i.value)}“.</p>`;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest && e.target.closest('.st-such input')) { const b = e.target.nextElementSibling.querySelector('[data-such]'); if (b) b.click(); } });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-such]'); if (!b) return;
  tab = 'einstellungen'; data.stab = b.dataset.such; history.replaceState(null, '', '#einstellungen-' + data.stab); renderTabs(); await load();
  const ab = _fq(b.dataset.ab); if (!ab) return;   // load() wartet, bis die Seite gezeichnet ist (auch „Mein Konto“)
  const h = [...$('#main').querySelectorAll('h3,h4,label,b')].find((x) => _fq(x.textContent).startsWith(ab));
  if (h) { h.scrollIntoView({ block: 'start' }); h.classList.add('bph-treffer'); h.addEventListener('animationend', () => h.classList.remove('bph-treffer'), { once: true }); }
});
