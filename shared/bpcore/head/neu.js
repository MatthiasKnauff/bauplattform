/* Neuigkeiten – gemeinsamer Baustein (/bp/neu.js, lädt head.js von selbst): was in einem neuen Stand dazukam, einmal je Benutzer.
   Startseite: Überblick über alles Ungesehene (je App, mit „Zeigen ›“). In einer App: Rundgang Schritt für Schritt mit Scheinwerfer
   auf der Stelle (ziel). Gesehen merkt der Server (/api/bp/neu), also auf allen Geräten. Alles seit Beginn: „?“ in der Kopfleiste → Änderungen (hilfeseite.js).
   Einträge: shared/bpcore/neuigkeiten.json – {id, datum, app, titel, text, ziel, hash, klick}. */
(() => {
  if (window.bpNeu) return;
  const NUR_TEST_AUS = false;   // true: Rundgang und Überblick auch in der Produktion von selbst
  const H = window.BPHead, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = document.createElement('style');
  css.textContent = `.bpn-dim{position:fixed;inset:0;z-index:2400;background:rgba(20,20,25,.45)}
.bpn-spot{position:fixed;z-index:2401;border-radius:calc(10px*var(--rk,1));box-shadow:0 0 0 9999px rgba(20,20,25,.5);outline:2px solid var(--y,#ff5fb3);outline-offset:3px;pointer-events:none;transition:all .25s}
.bpn-k{position:fixed;z-index:2402;width:min(470px,calc(100vw - 24px));box-sizing:border-box;background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(16px*var(--rk,1));box-shadow:var(--sh0,0 18px 48px rgba(0,0,0,.32));padding:1.3rem 1.5rem;display:grid;grid-template-columns:minmax(0,1fr);gap:.75rem;font-size:1.02rem;overflow-wrap:anywhere}
.bpn-k.mitte{left:50%!important;top:50%!important;transform:translate(-50%,-50%);width:min(640px,calc(100vw - 24px))}
.bpn-k h3{margin:0;font-size:1.35rem;line-height:1.25}.bpn-k p{margin:0;color:var(--mute,#666);line-height:1.55}
.bpn-kl{font-size:.8rem;color:var(--y,#d4357f);font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.bpn-a{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}.bpn-a .f{flex:1}
.bpn-d{display:flex;flex-wrap:wrap;gap:5px;min-width:0;max-width:100%}.bpn-d i{width:9px;height:9px;border-radius:50%;background:var(--line,#ccc);cursor:pointer}.bpn-b:disabled{opacity:.4;cursor:default}.bpn-b.bpn-x{border:0;background:none;color:var(--mute,#666);padding-left:0}.bpn-d i.on{background:var(--y,#d4357f)}
.bpn-b{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(9px*var(--rk,1));padding:.6rem 1.15rem;font:inherit;font-size:.95rem;cursor:pointer}
.bpn-b.pri{background:var(--y,#d4357f);border-color:var(--y,#d4357f);color:var(--on,#fff);font-weight:600}
.bpn-l{display:grid;gap:.2rem;max-height:min(62vh,560px);overflow:auto;margin:0 -.3rem}
.bpn-ap{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute,#666);margin:.45rem .3rem .1rem}
.bpn-e{display:flex;gap:.6rem;align-items:baseline;padding:.35rem .3rem;border-radius:calc(8px*var(--rk,1))}.bpn-e:hover{background:var(--hov,rgba(0,0,0,.04))}
.bpn-e{padding:.5rem .4rem}.bpn-e span{flex:1;min-width:0;font-weight:600}.bpn-e small{display:block;color:var(--mute,#666);font-size:.88rem;font-weight:400;margin-top:.1rem}
.bpn-e button{border:0;background:none;color:var(--y,#d4357f);font:inherit;font-weight:600;font-size:.92rem;cursor:pointer;white-space:nowrap;padding:0}`;
  document.head.appendChild(css);
  const api = (m, b) => fetch('api/bp/neu' + (m === 'alle' ? '?alle=1' : ''), m === 'PUT' ? { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : { credentials: 'same-origin' }).then((r) => r.json());
  const merken = (ids) => (ids.length ? api('PUT', { ids }).catch(() => {}) : Promise.resolve());
  const appName = (k) => { const a = ((H.conf || {}).apps || []).find((x) => x.key === k); return k ? (a ? a.name : k) : 'Überall'; };
  let offenEl = [];
  const zu = () => { offenEl.forEach((x) => x.remove()); offenEl = []; removeEventListener('resize', setzen); removeEventListener('scroll', setzen, true); };
  let setzen = () => {};

  /* Rundgang: Schritt für Schritt; ein Schritt aus einer anderen App ruft diese auf (Seite + hash) und läuft dort weiter.
     Je Eintrag optional: hash (z. B. „#einstellungen-firma“), klick (CSS-Auswahl, die vorher angeklickt wird – Reiter, Menü), ziel (Scheinwerfer). */
  const TOUR = { get() { try { return JSON.parse(localStorage.getItem('bp.neu.tour') || 'null'); } catch { return null; } },
    set(v) { try { if (v) localStorage.setItem('bp.neu.tour', JSON.stringify(v)); else localStorage.removeItem('bp.neu.tour'); } catch { /* egal */ } } };
  const fremd = (x) => !!x.app && x.app !== H.app;
  const hin = (E, i) => {   // zu einer anderen App wechseln und dort weitermachen
    const x = E[i], a = ((H.conf || {}).apps || []).find((y) => y.key === x.app && y.allowed); if (!a) return false;
    TOUR.set({ ids: E.map((y) => y.id), i, t: Date.now() }); location.href = H.appUrl(a) + '/' + (x.hash || ''); return true;
  };
  function rundgang(E, start = 0, fertig) {
    let i = Math.max(0, Math.min(E.length - 1, start));
    const dim = document.createElement('div'), spot = document.createElement('div'), k = document.createElement('div');
    dim.className = 'bpn-dim'; spot.className = 'bpn-spot'; k.className = 'bpn-k'; k.setAttribute('role', 'dialog');
    document.body.append(dim, spot, k); offenEl = [dim, spot, k];
    const ziel = () => { const x = E[i]; if (!x || fremd(x) || !x.ziel) return null; try { const el = document.querySelector(x.ziel); const r = el && el.getBoundingClientRect(); return r && r.width && r.height ? el : null; } catch { return null; } };
    setzen = () => {
      const el = ziel();
      dim.hidden = !!el; spot.hidden = !el; k.classList.toggle('mitte', !el);
      if (!el) { k.style.left = ''; k.style.top = ''; return; }
      const r = el.getBoundingClientRect(), W = innerWidth, Hh = innerHeight, p = 6;
      const t = Math.max(4, r.top - p), l = Math.max(4, r.left - p), b = Math.min(Hh - 4, r.bottom + p), rr = Math.min(W - 4, r.right + p);
      Object.assign(spot.style, { left: l + 'px', top: t + 'px', width: (rr - l) + 'px', height: (b - t) + 'px' });
      const kh = k.offsetHeight, kw = k.offsetWidth, unten = b + kh + 14 <= Hh;
      k.style.top = (unten ? b + 12 : Math.max(8, t - kh - 12 < 8 ? Hh - kh - 12 : t - kh - 12)) + 'px';
      k.style.left = Math.max(12, Math.min(W - kw - 12, l)) + 'px';
    };
    const oeffnen = (x) => {   // Stelle aufmachen: hash (Reiter), dann ein Klick (Menü, Knopf) – danach den Scheinwerfer setzen
      let warte = 0;
      if (x.hash && location.hash !== x.hash) { location.hash = x.hash; dispatchEvent(new HashChangeEvent('hashchange')); warte = 500; }
      if (x.klick) { try { const b = document.querySelector(x.klick); if (b) { b.click(); warte = Math.max(warte, 450); } } catch { /* egal */ } }
      if (warte) setTimeout(() => { const el = ziel(); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' }); setzen(); }, warte);
    };
    const zeig = () => {
      const x = E[i], letzt = i === E.length - 1, weg = fremd(x);
      k.innerHTML = `<span class="bpn-kl">Neu${E.length > 1 ? ` · ${i + 1} von ${E.length}` : ''}${x.app ? ' · ' + esc(appName(x.app)) : ''}</span><h3>${esc(x.titel)}</h3><p>${esc(x.text)}</p>
        <div class="bpn-a"><button type="button" class="bpn-b bpn-x" data-n="ende"${letzt ? ' style="visibility:hidden"' : ''}>Überspringen</button><span class="f"></span>${E.length > 1 ? `<span class="bpn-d">${E.map((_, j) => `<i class="${j === i ? 'on' : ''}" data-zu="${j}" title="Schritt ${j + 1}"></i>`).join('')}</span><span class="f"></span>
        <button type="button" class="bpn-b" data-n="zur"${i ? '' : ' disabled'}>‹ Zurück</button>` : ''}${weg ? `<button type="button" class="bpn-b" data-n="hin">${esc(appName(x.app))} öffnen ›</button>` : ''}<button type="button" class="bpn-b pri" data-n="${letzt ? 'ende' : 'vor'}">${letzt ? 'Fertig ✓' : 'Weiter ›'}</button></div>`;
      if (!weg) oeffnen(x);
      const el = ziel(); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      setzen();
    };
    const ende = () => { zu(); TOUR.set(null); merken(E.map((x) => x.id)); if (fertig) fertig(); };
    const taste = (e) => { if (!k.isConnected) { removeEventListener('keydown', taste); return; } if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'ArrowRight' && i < E.length - 1) { i++; zeig(); } else if (e.key === 'ArrowLeft' && i > 0) { i--; zeig(); } };
    addEventListener('keydown', taste);
    k.addEventListener('click', (e) => { const d = e.target.closest('[data-zu]'); if (d) { i = +d.dataset.zu; zeig(); return; } const b = e.target.closest('[data-n]'); if (!b || b.disabled) return;
      if (b.dataset.n === 'vor') { i++; zeig(); } else if (b.dataset.n === 'zur') { i--; zeig(); } else if (b.dataset.n === 'hin') { hin(E, i); } else ende(); });
    addEventListener('resize', setzen); addEventListener('scroll', setzen, true);
    zeig();
  }
  const ordnen = (E) => { const rang = (x) => (!x.app ? 1 : x.app === H.app ? 0 : 2); return E.slice().sort((a, b) => rang(a) - rang(b) || String(a.app).localeCompare(String(b.app))); };

  /* Überblick (Startseite, Benutzermenü) – „Zeigen ›“ öffnet die Stelle, „Rundgang ›“ geht alles der Reihe nach durch, auch über die Apps */
  function ueberblick(E, o = {}) {
    E = ordnen(E);
    const gruppen = {}; E.forEach((x) => { (gruppen[x.app || ''] = gruppen[x.app || ''] || []).push(x); });
    const dim = document.createElement('div'), k = document.createElement('div');
    dim.className = 'bpn-dim'; k.className = 'bpn-k mitte'; k.setAttribute('role', 'dialog');
    document.body.append(dim, k); offenEl = [dim, k];
    k.innerHTML = `<h3>✨ ${o.alle ? 'Neuigkeiten der letzten Wochen' : 'Neu seit deinem letzten Besuch'}</h3><p>${(H.conf && H.conf.version) ? 'Stand ' + esc(String(H.conf.version).split(' ')[0]) + ' · ' : ''}${E.length} ${E.length === 1 ? 'Neuerung' : 'Neuerungen'}</p>
      <div class="bpn-l">${Object.entries(gruppen).map(([ap, L]) => `<div class="bpn-ap">${esc(appName(ap))}</div>${L.map((x) => `<div class="bpn-e"><span>${esc(x.titel)}<small>${esc(x.text)}</small></span><button type="button" data-zeig="${E.indexOf(x)}">Zeigen ›</button></div>`).join('')}`).join('')}</div>
      <div class="bpn-a"><span class="f"></span>${o.alle ? '<button type="button" class="bpn-b" data-n="zu">Schließen</button>' : '<button type="button" class="bpn-b" data-n="spaeter">Später</button><button type="button" class="bpn-b" data-n="gelesen">Alles gelesen</button>'}<button type="button" class="bpn-b pri" data-n="rund">Rundgang ›</button></div>`;
    k.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zeig]');
      if (z) { const j = +z.dataset.zeig; zu(); if (fremd(E[j])) { if (!hin(E, j)) rundgang(E, j); } else rundgang(E, j); return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      zu();
      if (b.dataset.n === 'gelesen') merken(E.map((x) => x.id));
      if (b.dataset.n === 'rund') rundgang(E, 0);
    });
  }

  async function start() {
    if (window.top !== window || !H || !H.me || offenEl.length || navigator.webdriver) return;   // nicht in Tests (automatisch gesteuerter Browser)
    const T = TOUR.get();
    if (T && Date.now() - (T.t || 0) < 10 * 60 * 1000) {   // Rundgang läuft über die Apps: hier weitermachen
      let A; try { A = (await api('alle')).eintraege || []; } catch { return; }
      const E = T.ids.map((id) => A.find((x) => x.id === id)).filter(Boolean);
      if (E.length) { setTimeout(() => rundgang(E, Math.min(T.i, E.length - 1)), 1200); return; }
    }
    TOUR.set(null);
    if (!NUR_TEST_AUS && !/-test\b/.test(String((H.conf || {}).version || ''))) return;   // vorerst nur auf dem Testserver von selbst (Wunsch 11.11.) – Benutzermenü „Neuigkeiten“ geht überall
    let E;
    try { E = (await api('GET')).eintraege || []; } catch { return; }
    if (!E.length) return;
    if (H.app === 'portal') { setTimeout(() => ueberblick(E), 900); return; }
    const hier = E.filter((x) => x.app === H.app || !x.app);
    if (hier.length) setTimeout(() => { if (!document.querySelector('.modal-bg,.bph-dlg-bg')) rundgang(ordnen(hier)); }, 1500);   // erst wenn die Seite steht; nie über einem offenen Fenster
  }
  window.bpNeu = { start, merken,
    zeige: (E, i) => { zu(); if (fremd(E[i])) { if (!hin(E, i)) rundgang(E, i); } else rundgang(E, i); },   // aus dem „?“ → Änderungen: an die Stelle
    alle: async () => { try { const E = (await api('alle')).eintraege || []; zu(); ueberblick(E, { alle: true }); } catch { /* egal */ } } };
})();
