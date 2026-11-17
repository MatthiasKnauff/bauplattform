/* Windows-App (17.11.2026): einmaliges Angebot auf der Startseite und Menüpunkt unter dem Benutzernamen.
   head.js lädt den Baustein erst, wenn er gebraucht wird: in der App selbst (meldet „genutzt“), auf der Startseite unter Windows
   (Angebot, wenn die App noch nie benutzt wurde) und beim Klick auf den Menüpunkt. Kern: bpcore/winapp.py.
   bpWinApp.menue()  → Zeile für das Benutzermenü (HTML)
   bpWinApp.oeffnen() → Fenster „Windows-App“ mit Installieren (aus dem Menü) */
(function () {
  if (window.bpWinApp) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = async (u, b) => { const r = await fetch(u, { method: b ? 'POST' : 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };
  const D = window.bpDesktop, windows = /Windows/i.test(navigator.userAgent) && !/Mobile|Android|iPhone|iPad/i.test(navigator.userAgent);
  const SS = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch { /* egal */ } return null; };
  let STAND = null;
  const laden = () => J('api/bp/winapp').then((s) => { STAND = s; return s; }).catch(() => null);
  const installieren = () => { location.href = 'api/bp/winapp/setup'; };

  const TEXT = `<p style="margin:0 0 .6rem">Die Bauplattform gibt es auch als App für Windows: eigenes Fenster in der Taskleiste, abgedockte Bereiche
    als echte Fenster (auch auf dem zweiten Bildschirm), Benachrichtigungen von Windows. Die Daten bleiben auf dem Server – die App zeigt dieselbe Oberfläche.</p>
    <p style="margin:0 0 .6rem">Die Installation braucht <b>keine Administratorrechte</b>. Neuerungen kommen von selbst, ohne neue Installation.</p>
    <p class="mu" style="margin:0 0 .8rem;font-size:var(--fs-s2,.85rem)">Beim ersten Start meldet Windows „Der Computer wurde durch Windows geschützt“ – dann auf
    „Weitere Informationen“ und „Trotzdem ausführen“ klicken. Die App ist für unser Büro gebaut und (noch) nicht signiert.</p>`;

  /* Angebot auf der Startseite: nur unter Windows im Browser, nur wenn es ein Setup gibt und die Person die App nie benutzt, nicht „nie“ gesagt und nicht gerade „später“ */
  function angebot(s) {
    if (!s || s.genutzt || s.nie || s.spaeter_bis || !s.setup || SS('bpWinAppGefragt')) return;
    SS('bpWinAppGefragt', '1');
    modalBox(`<h3>Bauplattform als Windows-App</h3>${TEXT}
      <div class="acts"><button type="button" class="btn" data-m="nie">Nicht mehr fragen</button><button type="button" class="btn" data-m="spaeter">Später</button><button type="button" class="btn pri" data-m="ok">App installieren</button></div>`,
    (m, bg, close) => {
      if (m === 'ok') { close(); installieren(); return; }
      J('api/bp/winapp', { art: m === 'nie' ? 'nie' : 'spaeter' }).catch(() => {});
      close();
    });
  }

  function oeffnen() {
    const s = STAND || {};
    const kopf = D ? `<p style="margin:0 0 .6rem">Du arbeitest gerade in der Windows-App (Version ${esc(D.version)}${D.server === 'test' ? ', Testserver' : ''}). Neuerungen kommen von selbst; Testserver und Einstellungen: <b>Alt</b> drücken → Menü „Bauplattform“.</p>`
      : s.genutzt ? `<p style="margin:0 0 .6rem">Du hast die Windows-App schon benutzt${s.version ? ' (Version ' + esc(s.version) + ')' : ''} – öffnen über das Startmenü oder das Symbol auf dem Desktop.</p>` : TEXT;
    const geht = !D && s.setup;
    modalBox(`<h3>Windows-App</h3>${kopf}${!D && !s.setup ? '<p class="mu" style="margin:0 0 .8rem">Ein Setup gibt es mit der nächsten Freigabe der Plattform.</p>' : ''}
      <div class="acts"><button type="button" class="btn" data-m="x">Schließen</button>${geht ? `<button type="button" class="btn pri" data-m="ok">${s.genutzt ? 'Neu installieren' : 'App installieren'}${s.setup_version ? ' <small>(' + esc(s.setup_version) + ')</small>' : ''}</button>` : ''}</div>`,
    (m, bg, close) => { close(); if (m === 'ok') installieren(); });
  }

  /* Zeile im Benutzermenü (head.js userMenu): in der App „Windows-App · Version“, sonst „Windows-App installieren“ bzw. „… nutzt du schon“ */
  function menue() {
    if (!D && !windows) return '';
    const s = STAND || {}, sub = D ? 'du arbeitest in der App · ' + esc(D.version) : s.genutzt ? 'nutzt du schon – Startmenü' : 'eigenes Fenster, ohne Administratorrechte';
    return `<button type="button" role="menuitem" data-winapp><span class="bph-mi">🪟</span>${D || s.genutzt ? 'Windows-App' : 'Windows-App installieren'} <small class="bph-ms">${sub}</small></button>`;
  }

  window.bpWinApp = { menue, oeffnen: () => (STAND ? Promise.resolve() : laden()).then(oeffnen), stand: () => STAND };

  /* in der App: einmal je Sitzung melden, dass die Person sie nutzt (dann kein Angebot mehr im Browser) */
  if (D && !SS('bpWinAppGemeldet')) J('api/bp/winapp', { art: 'genutzt', version: D.version }).then((s) => { STAND = { ...s, setup: false }; SS('bpWinAppGemeldet', '1'); }).catch(() => {});
  else if (!D && windows) laden().then((s) => { if (window.BPHead && BPHead.app === 'portal') setTimeout(() => angebot(s), 1500); });
})();
