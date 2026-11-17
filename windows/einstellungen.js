/* Fenster „Einstellungen“ der Windows-App: Server (Produktion/Test) mit Adressen, Autostart. OK speichert und schließt, Abbrechen verwirft. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const zwingend = new URLSearchParams(location.search).get('zwingend') === '1';
  const e = await window.einst.holen();
  let server = e.server;
  $('produktion').value = e.adressen.produktion || '';
  $('test').value = e.adressen.test || '';
  $('autostart').checked = !!e.autostart;
  $('ver').textContent = 'Version ' + e.version;
  if (zwingend) $('kopf').textContent = 'Bitte die Adresse des Servers eintragen – danach öffnet sich die Bauplattform.';
  const wahl = () => document.querySelectorAll('#wahl button').forEach((b) => b.classList.toggle('an', b.dataset.s === server));
  wahl();
  $('wahl').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; server = b.dataset.s; wahl(); $('fehler').textContent = ''; });
  ['produktion', 'test'].forEach((k) => $(k).addEventListener('input', () => { $('fehler').textContent = ''; }));
  const pruefen = (v) => !v || /^https?:\/\/[^\s/]+/.test(v.trim());
  $('ok').addEventListener('click', async () => {
    const a = { produktion: $('produktion').value.trim(), test: $('test').value.trim() };
    const falsch = Object.entries(a).find(([, v]) => !pruefen(v));
    if (falsch) { $('fehler').textContent = `Die Adresse für ${falsch[0] === 'test' ? 'den Testserver' : 'die Produktion'} muss mit http:// oder https:// beginnen.`; $(falsch[0]).focus(); return; }
    const r = await window.einst.speichern({ server, adressen: a, autostart: $('autostart').checked });
    if (r && r.fehler) $('fehler').textContent = r.fehler;
  });
  $('abbrechen').addEventListener('click', () => window.einst.abbrechen());
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('ok').click(); if (ev.key === 'Escape') $('abbrechen').click(); });
  (server === 'test' && !e.adressen.test ? $('test') : $('produktion')).focus();
})();
