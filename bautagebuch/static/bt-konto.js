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
  <div class="info">Benutzer:in, E-Mail-Adressen und Rechte verwaltet der Administrator in der Verwaltung (▦ → Verwaltung → Benutzer:in & Rechte). Dein Kennwort änderst du unter ⚙ → Für mich.</div></div>`;
const mailCard = () => `<div class="cform"><h3>Mailserver (Postausgang)</h3>
  <div class="info">Mit diesem Postfach verschickt die App E-Mails: „Kennwort vergessen“ und Erinnerungen zu Erledigungsterminen.</div>
  <label class="w">Anbieter<select data-st="mail_provider">${[['o365', 'Office 365 / Microsoft 365'], ['gmail', 'Gmail / Google Workspace'], ['outlook', 'Outlook.com / Hotmail'], ['webde', 'WEB.DE'], ['gmx', 'GMX'], ['tonline', 'T-Online'], ['ionos', 'IONOS (1&1)'], ['strato', 'Strato'], ['andere', 'anderer Anbieter']].map(([v, n]) => `<option value="${v}" ${(settings.mail_provider || 'gmail') === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  ${settings.mail_provider === 'andere' ? stIn('mail_host', 'SMTP-Server', 0, {ph: 'smtp.firma.de'}) + stIn('mail_port', 'Port', 0, {ph: '587 oder 465'}) : ''}
  ${stIn('mail_user', 'Postfach (Benutzername = Absenderadresse)', 1, {ph: 'bautagebuch@firma.de'})}
  <label class="w">Kennwort des Postfachs<input data-st="mail_pass" type="password" value="" placeholder="${settings.mail_pass_set ? '•••••••• (gespeichert – zum Ändern neu eingeben)' : ''}" autocomplete="new-password"></label>
  ${stIn('app_url', 'Adresse der App in den Links (optional)', 1, {ph: 'https://bau.firma.de'})}
  <div class="acts"><button data-act="mailTest">Testmail an mich senden</button>${settings.mail_pass_set ? '<button class="bad" data-act="mailPassClear">Gespeichertes Kennwort löschen</button>' : ''}</div>
  <div class="info"><b>Gmail:</b> Google-Konto mit Bestätigung in zwei Schritten und dort ein „App-Passwort“ erzeugen; dieses hier eintragen. <b>Office 365:</b> Im Microsoft-365-Admincenter muss für das Postfach „Authentifizierter SMTP-Versand“ erlaubt sein; Microsoft schaltet das teils standardmäßig ab. Die Testmail geht an deine E-Mail-Adresse (Verwaltung → Benutzer:in).</div></div>`;

/* ---------- Einstellungen: Firma, Logo, Ablage ---------- */
const CO = [['office_name','Firmenname (erscheint im PDF, z. B. „Zu erledigen von Musterbüro“)',1],['co_short','Kurzname – wo der lange Firmenname nicht passt (Absenderzeile, Fußzeilen, Gruß), z. B. „Muster Architekt:in“',1],['co_street','Straße und Hausnummer',1],['co_zip','PLZ'],['co_city','Ort'],['co_phone','Telefon'],['co_email','E-Mail'],['co_web','Internet',1],['co_extra','Weitere Angabe (z. B. Steuernummer, Handelsregister)',1]];
const stIn = (k, l, w, o = {}) => `<label class="${w ? 'w' : ''}">${l}<input data-st="${k}" type="text" value="${esc(settings[k] || o.def || '')}" placeholder="${esc(o.ph || '')}" autocomplete="off"${listAttr(k)}></label>`;
const STABS = [['firma', 'Firma & Logo'], ['ablage', 'Ablage'], ['mail', 'Mailserver'], ['sicherung', 'Datensicherung']];
let stab = 'firma';
function renderProfile(box) {
  const m = settings.store_mode || 'off', adm = me.is_admin, imFenster = box === PH;
  if (!STABS.some((x) => x[0] === stab)) stab = 'firma';
  const firm = `  <div class="cform"><h3>Firmendaten</h3>
    ${CO.map(([k, l, w]) => stIn(k, l, w)).join('')}${addrLists()}
    <div class="info">Diese Angaben erscheinen in der Fußzeile jeder PDF-Seite.</div>
    <div class="info">Logo für die PDF-Kopfzeile (rechts oben). PNG, JPG oder WEBP.</div>
    ${settings.has_logo ? `<div class="w" style="grid-column:1/-1"><img class="logo" src="api/logo?v=${logoV}" alt="Logo"></div>` : ''}
    <div class="acts"><button data-act="pickLogo">${settings.has_logo ? 'Logo ersetzen' : 'Logo hochladen'}</button>${settings.has_logo ? '<button class="bad" data-act="delLogo">Logo entfernen</button>' : ''}</div>
    <input type="file" id="logoFile" class="vh" accept="image/png,image/jpeg,image/webp">
    <div class="info">Briefbogen (PDF, DIN A4, leer – nur Logo und Fußzeile): liegt unter den Briefen der Bauplattform (Mängel- und Terminrüge); der Text richtet sich nach ihm.</div>
    <div class="acts" id="bbBox"><span class="mute">Lade …</span></div>
    <input type="file" id="bbFile" class="vh" accept="application/pdf"></div>
`;
  const store = `  <div class="cform"><h3>Ablage auf dem Server</h3>
    <label class="w">Fotos und PDFs automatisch ablegen
      <select data-st="store_mode"><option value="off" ${m === 'off' ? 'selected' : ''}>Aus</option><option value="smb" ${m === 'smb' ? 'selected' : ''}>Windows-Server (Netzwerkfreigabe mit Zugangsdaten)</option><option value="folder" ${m === 'folder' ? 'selected' : ''}>Ordner im Container (z. B. eingebundenes Laufwerk)</option></select></label>
    ${m === 'smb' ? `
      ${stIn('store_server', 'Server (Name oder IP)', 0, {ph: 'z. B. fileserver oder 192.168.1.10'})}
      ${stIn('store_share', 'Freigabename', 0, {ph: 'z. B. Projekte'})}
      ${stIn('store_path', 'Gemeinsamer Ordner in der Freigabe (optional)', 1, {ph: 'z. B. Baustellen/2026'})}
      ${stIn('store_domain', 'Domäne (optional)', 0)}
      ${stIn('store_user', 'Benutzername', 0)}
      <label class="w">Kennwort<input data-st="store_pass" type="password" value="" placeholder="${settings.store_pass_set ? '•••••••• (gespeichert – zum Ändern neu eingeben)' : ''}" autocomplete="new-password"></label>` : ''}
    ${m === 'folder' ? stIn('store_dir', 'Ordner im Container', 1, {ph: '/ablage'}) : ''}
    ${m !== 'off' ? `
      ${stIn('store_tpl_photos', 'Ordner für Fotos', 1, {def: '{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Fotos/{datum}'})}
      <label class="w">Name des Fototag-Ordners<select data-st="store_folder_desc"><option value="1" ${(settings.store_folder_desc || '1') === '1' ? 'selected' : ''}>beschreibend: Datum + Gewerke der Anwesenden + erste drei Fotonamen</option><option value="0" ${settings.store_folder_desc === '0' ? 'selected' : ''}>nur das Datum</option></select></label>
      ${stIn('store_tpl_pdf', 'Ordner für Bautagebuch-PDFs', 1, {def: '{projekt}/{kuerzel} 8. Fotos + Bautagebuch/{kuerzel} Bautagebuch'})}
      <label class="w">Bei erneutem PDF-Export<select data-st="store_old_mode"><option value="behalten" ${settings.store_old_mode !== 'ersetzen' ? 'selected' : ''}>alten Stand als „…_old1“ aufheben</option><option value="ersetzen" ${settings.store_old_mode === 'ersetzen' ? 'selected' : ''}>alten Stand ersetzen (keine „_old“-Kopien)</option></select></label>
      <label class="w">Alte Fototag-Ordner („…_old1“, „…_old2“) behalten<input data-st="store_keep_old_photos" inputmode="numeric" value="${esc(settings.store_keep_old_photos || '0')}" placeholder="0"></label>
      <label class="w">Alte Bautagebuch-PDFs („…_old1.pdf“ …) behalten<input data-st="store_keep_old_pdf" inputmode="numeric" value="${esc(settings.store_keep_old_pdf || '0')}" placeholder="0"></label>
      <div class="info">Bei jedem erneuten PDF-Export benennt die App die bisherige Version in „_old1“, „_old2“ … um. Hier legst du fest, wie viele davon je Bericht auf dem Server bleiben; die ältesten werden danach automatisch gelöscht. <b>0 = alle behalten</b> (nichts wird automatisch gelöscht).</div>
      <div class="info">Platzhalter: <b>{projekt}</b> (Projektordner: der im Projekt eingetragene Ordnername, sonst ein vorhandener Ordner auf dem Server, der mit dem Kürzel beginnt, sonst der Projektname), <b>{kuerzel}</b> (erstes Wort des Projektnamens, z. B. A483), <b>{datum}</b> (2026-10-28), <b>{jahr}</b>, <b>{monat}</b>. Mit „/“ trennst du Unterordner.</div>
      <div class="info">Eine neue Version entsteht nur, wenn sich der Bericht seit dem letzten Export geändert hat – bloßes Ansehen des PDFs erzeugt keine.</div>
      <label class="w bt-ck"><input type="checkbox" data-stck="store_auto_cleanup"${settings.store_auto_cleanup === '0' ? '' : ' checked'}> Jede Nacht automatisch aufräumen (gegen 2 Uhr)</label>
      <label class="w">Nachts je Bericht behalten, wenn oben 0 steht<input data-st="store_auto_keep" inputmode="numeric" value="${esc(settings.store_auto_keep || '2')}" placeholder="2"></label>
      <div class="info">Nachts werden je Bericht nur die neuesten alten Stände behalten – so viele wie oben eingetragen, bei 0 so viele wie hier. Gelöscht werden nur Dateien und Ordner mit „_old“ und Nummer; das aktuelle PDF und die aktuellen Fotos bleiben immer. Jeder gelöschte Stand steht im Protokoll.</div>
      <div class="acts"><button data-act="storeAlte">Alte Stände auf dem Server suchen</button><button data-act="storeAlteWeg" class="bad">Nach Einstellung aufräumen</button></div>
      <div class="info" id="altOut"></div>
      <div class="acts"><button data-act="storeTest">Verbindung testen</button><button data-act="storeRun">Jetzt übertragen</button><button data-act="storeBackfill">Vorhandene Fotos nachträglich übertragen</button></div>
      <div class="info" id="sstat"></div>` : `<div class="info">Aus: Fotos und PDFs bleiben nur in der App.</div>`}
    ${settings.store_pass_set && m === 'smb' ? `<div class="acts"><button class="bad" data-act="storePassClear">Gespeichertes Kennwort löschen</button></div>` : ''}
    <div class="info">Alle Fotos (auch iPhone-HEIC, PNG, WEBP) werden beim Hochladen als JPG gespeichert und liegen auf dem Server in voller Auflösung; nur im PDF sind sie verkleinert. Das Kennwort wird nur auf dem Server der App gespeichert und nie an den Browser zurückgegeben; am besten ein eigenes Konto nur mit Schreibrecht auf diese Freigabe verwenden.</div>
  </div>`;
  const bar = adm ? `<div class="stabs">${STABS.map(([k, l]) => `<button class="${k === stab ? 'on' : ''}" data-act="stab" data-s="${k}">${l}</button>`).join('')}${['firma', 'ablage', 'mail'].includes(stab) ? '<button data-bph-verlauf="einst:bt" title="Frühere Stände von Firma, Ablage und Mailserver ansehen und wiederherstellen" style="margin-left:auto">🕘 Verlauf</button>' : ''}</div>` : '';
  box.innerHTML = `<div class="wrap">${imFenster ? (adm ? '<div class="info" style="margin-bottom:.8rem">Firma & Logo, Ablage, Mailserver und Datensicherung: ⚙ → Büro.</div>' : '') : bar}${imFenster || !adm ? appCard() : {firma: () => firm, ablage: () => store, mail: mailCard, sicherung: backupCard}[stab]()}</div>`;
  if (stab === 'sicherung') loadBackups();

  const lf = $('#logoFile'); if (lf) lf.onchange = async e => {
    const fd = new FormData(); fd.append('file', e.target.files[0]);
    const r = await api('api/logo', 'POST', null, fd);
    if (r.error) { toast(r.error); return; }
    logoV++; settings = await api('api/settings'); favicon(); renderDetail();
  };
  if (adm && stab === 'ablage' && m !== 'off') storeStatus();
  const bbBox = $('#bbBox');
  if (bbBox) {   // Briefbogen (dieselbe Einstellung wie in der Verwaltung)
    const bbDraw = (v) => {
      const sp = v.satzspiegel;
      bbBox.innerHTML = (v.vorhanden ? '<a class="btn" href="api/bp/briefbogen" target="_blank" rel="noopener">Briefbogen ansehen</a>' : '')
        + `<button data-bb="pick">${v.vorhanden ? 'Briefbogen ersetzen' : 'Briefbogen hochladen (PDF)'}</button>` + (v.vorhanden ? '<button class="bad" data-bb="del">Briefbogen entfernen</button>' : '')
        + (sp ? `<span class="mute" style="flex-basis:100%;font-size:.85rem">Abgelesen: Text ab ${sp.links} mm vom linken Rand bis ${sp.rechts} mm vor dem rechten, Logo bis ${sp.kopf} mm von oben, Fußzeile ab ${sp.fuss} mm von unten.</span>` : '');
    };
    bbBox.onclick = async (e) => {
      const b = e.target.closest('[data-bb]'); if (!b) return;
      if (b.dataset.bb === 'pick') return $('#bbFile').click();
      if (!(await bpFrage('Briefbogen entfernen?'))) return;
      const r = await fetch('api/bp/briefbogen', { method: 'DELETE' }); bbDraw(await r.json().catch(() => ({})));
    };
    $('#bbFile').onchange = async (e) => {
      const fd = new FormData(); fd.append('file', e.target.files[0]); e.target.value = '';
      const r = await fetch('api/bp/briefbogen', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}));
      if (!r.ok || j.error) { toast(j.error || 'Hochladen fehlgeschlagen'); return; }
      toast('Briefbogen gespeichert.'); bbDraw(j);
    };
    fetch('api/bp/briefbogen?info=1').then((r) => r.json()).then(bbDraw).catch(() => { bbBox.textContent = ''; });
  }
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
function altText(r) {
  if (!r || r.error) return '✖ ' + esc((r && r.error) || 'fehlgeschlagen');
  const kopf = `<b>${r.pdf} alte PDF${r.pdf === 1 ? '' : 's'}</b> und <b>${r.fotos} alte Fotoordner</b> in ${r.projekte.length} Projekt${r.projekte.length === 1 ? '' : 'en'}${r.geloescht ? ` · ${r.geloescht} aufgeräumt` : ''}${r.fehler ? ' · Fehler: ' + esc(r.fehler) : ''}.`;
  const n = r.nacht, nacht = r.nacht_an === false ? '<br><small>Nächtliches Aufräumen ist ausgeschaltet.</small>' : n ? `<br><small>Letzte Nacht (${esc(new Date(n.zeit).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }))}): ${n.geloescht} alte Stände gelöscht${n.fehler ? ' · Fehler: ' + esc(n.fehler) : ''}.</small>` : '';
  return kopf + nacht + (r.projekte.length ? '<ul style="margin:.4rem 0 0;padding-left:1.1rem">' + r.projekte.map((p) => `<li><b>${esc(p.name)}</b>: ${p.pdf} PDF, ${p.fotos} Fotoordner<br><small>${p.beispiele.map(esc).join('<br>')}</small></li>`).join('') + '</ul>' : '');
}
async function storeStatus() {
  const el = $('#sstat'); if (!el) return;
  const s = await api('api/store/status');
  el.textContent = (s.pending ? `Wartet auf Übertragung: ${s.pending}.` : 'Alles übertragen.') + (s.error ? ` Letzter Fehler: ${s.error}` : '');
}

let PH = null;   // Einstellungen im Einstellungsfenster der Kopfleiste (statt im Hauptbereich)
