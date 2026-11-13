/* Bautagebuch – Darstellung, Anmeldung, Einstellungen der App, Ablage.
   Teil der Seite index.html (gemeinsame Namen, klassische Skripte in fester Reihenfolge: bt-kern.js, bt-projekt.js, bt-bericht.js, bt-assistent.js, bt-suche.js, bt-projektdaten.js, bt-kontakte.js, bt-konto.js, bt-start.js). */
/* Darstellung (Farbschema, Akzentfarbe): applyTheme, applyAccent, applyLook aus dem Baukasten (bp.js) */
let me = {}, users = null, people = [];
function authView(v, msg = '') {
  $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
  const inp = (id, ph, type = 'password', ac = 'new-password') => `<input id="${id}" type="${type}" placeholder="${ph}" autocomplete="${ac}" autocapitalize="none">`;
  const V = {
    login: ['Bautagebuch', '', inp('un', 'Name', 'text', 'username') + inp('pw', 'Kennwort', 'password', 'current-password'), 'Anmelden', '<a href="#" class="lnk" data-auth="forgot">Kennwort vergessen?</a>'],
    forgot: ['Kennwort vergessen', '<p>Gib deinen Namen oder deine E-Mail-Adresse ein. Du bekommst einen Link zum Zurücksetzen per E-Mail.</p>', inp('un', 'Name oder E-Mail', 'text', 'username'), 'Link senden', '<a href="#" class="lnk" data-auth="login">Zurück zur Anmeldung</a>'],
    reset: ['Neues Kennwort', '<p>Vergib ein neues Kennwort (mindestens 8 Zeichen).</p>', inp('pw', 'Neues Kennwort') + inp('pw2', 'Kennwort wiederholen'), 'Kennwort speichern', '<a href="#" class="lnk" data-auth="login">Zur Anmeldung</a>'],
    change: ['Kennwort ändern', '<p>Bitte vergib jetzt dein eigenes Kennwort (mindestens 8 Zeichen).</p>', inp('pw0', 'Bisheriges Kennwort', 'password', 'current-password') + inp('pw', 'Neues Kennwort') + inp('pw2', 'Kennwort wiederholen') + (me.email ? '' : inp('em', 'E-Mail-Adresse (für „Kennwort vergessen“)', 'email', 'email')), 'Speichern', '<a href="#" class="lnk" data-auth="logout">Abmelden</a>'],
  }[v];
  const s = $('#login'); s.dataset.v = v;
  s.innerHTML = `<h1>${V[0]}</h1>${V[1]}${V[2]}<div id="err" role="alert">${esc(msg)}</div><button class="go" id="go">${V[3]}</button><div class="lnks">${V[4]}</div>`;
  (s.querySelector('input'))?.focus();
}
const showLogin = () => authView('login');
async function authGo() {
  const v = $('#login').dataset.v, val = id => $('#' + id)?.value || '', err = m => { $('#err').textContent = m; };
  try {
    if (v === 'login') {
      const r = await api('api/login', 'POST', {name: val('un'), password: val('pw')});
      if (!r.ok) return err(r.error || 'Fehler');
      me = r; applyLook(r); r.must_change ? authView('change') : showApp();
    } else if (v === 'forgot') {
      const r = await api('api/forgot', 'POST', {ident: val('un')});
      authView('login', r.message || r.error || '');
    } else {
      if (val('pw') !== val('pw2')) return err('Die beiden Kennwörter sind nicht gleich.');
      const r = v === 'reset' ? await api('api/reset', 'POST', {token: location.hash.slice(7), password: val('pw')})
                              : await api('api/password', 'POST', {old: val('pw0'), new: val('pw'), email: val('em')});
      if (!r.ok) return err(r.error || 'Fehler');
      if (v === 'reset') { history.replaceState(null, '', location.pathname); authView('login', 'Kennwort geändert. Bitte anmelden.'); }
      else { me.must_change = false; showApp(); }
    }
  } catch {}
}
$('#login').onclick = async e => {
  if (e.target.id === 'go') authGo();
  const a = e.target.dataset.auth; if (!a) return; e.preventDefault();
  if (a === 'logout') { await api('api/logout', 'POST'); authView('login'); } else authView(a);
};
$('#login').onkeydown = e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') authGo(); };

/* ---------- Einstellungen: Bericht-Assistent (je Benutzer), Mailserver – Benutzer verwaltet nur die Verwaltung ---------- */
const appCard = () => `<div class="cform"><h3>Bautagebuch</h3>
  <div class="w" style="grid-column:1/-1;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap"><b>Bericht-Assistent</b><span style="color:var(--mute)">${bwzPrefs().on ? (bwzPrefs().auto ? 'startet bei jedem neuen Bericht' : 'auf Knopfdruck im Bericht') : 'ausgeschaltet'}</span><button class="bd" data-act="bwzSet">Schritte und Start einstellen …</button></div>
  <div class="w" style="grid-column:1/-1;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap"><b>Diktieren</b><span style="color:var(--mute)">bestätigen</span>
    <span class="seg" role="group">${[['sofort', 'sofort am Handy'], ['spaeter', 'später am Rechner']].map(([v, t]) => `<button type="button" data-dtset="ok" data-v="${v}" class="${dtEinst().ok === v ? 'on' : ''}">${t}</button>`).join('')}</span>
    <span style="color:var(--mute)">KI</span><span class="seg" role="group">${[['standard', 'wie oben gewählt'], ['intern', 'immer die interne']].map(([v, t]) => `<button type="button" data-dtset="ki" data-v="${v}" class="${dtEinst().ki === v ? 'on' : ''}">${t}</button>`).join('')}</span></div>
  <div class="info">Benutzer:in, E-Mail-Adressen und Rechte verwaltet der Administrator in der Verwaltung (▦ → Verwaltung → Benutzer:in & Rechte). Dein Kennwort änderst du unter ⚙ → Persönlich.</div></div>`;
/* Firma & Logo, Briefbogen, Ablage, Mailserver und Datensicherung stehen nur noch in der Verwaltung → Einstellungen (dort je Rolle freigegeben). */
function renderProfile(box) {
  box.innerHTML = `<div class="wrap">${appCard()}<div class="info" style="margin-top:.6rem">Firma &amp; Logo, Briefbogen, Ablage, Mailserver und Datensicherung: Verwaltung → Einstellungen.</div></div>`;
}
/* Nach dem PDF: Stand „exportiert“ neu laden und melden, ob Bericht und Fotos im Projektordner auf dem Server angekommen sind */
let ablT = 0;
async function ablageMelden() {
  loadVer();
  clearTimeout(ablT);
  const t0 = Date.now();
  const schau = async () => {
    let s; try { s = await api('api/store/status'); } catch { return; }
    if (!s.enabled) return;   // keine Ablage auf dem Server eingerichtet
    if (!s.pending) { toast('✓ Bericht und Fotos sind im Projektordner auf dem Server abgelegt.'); return; }
    if (Date.now() - t0 > 60000) { toast(`Ablage im Projektordner wartet noch (${s.pending} Datei${s.pending === 1 ? '' : 'en'})${s.error ? ': ' + s.error : ''} – wird automatisch erneut versucht.`); return; }
    ablT = setTimeout(schau, 4000);
  };
  ablT = setTimeout(schau, 2500);
}

let PH = null;   // Einstellungen im Einstellungsfenster der Kopfleiste (statt im Hauptbereich)
document.addEventListener('click', async (e) => {   // Einstellung „Diktieren“ (bt-diktat.js) – gespeichert beim Konto wie der Bericht-Assistent
  const b = e.target.closest && e.target.closest('[data-dtset]'); if (!b || b.classList.contains('on')) return;
  const alt = { ...dtEinst() }, P = { ...bwzPrefs(), diktat: { ...alt, [b.dataset.dtset]: b.dataset.v } };
  const setze = async (Q) => { me.assistent = Q; const r = await api('api/account', 'PUT', { assistent: Q }); if (r.error) toast(r.error); if (PH) renderProfile(PH); };
  await setze(P); rueckgaengig('Diktieren eingestellt', () => setze({ ...bwzPrefs(), diktat: alt }));
});
