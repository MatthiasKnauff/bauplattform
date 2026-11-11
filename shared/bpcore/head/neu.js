/* Neuigkeiten – gemeinsamer Baustein (/bp/neu.js, lädt head.js von selbst): was in einem neuen Stand dazukam, einmal je Benutzer.
   Startseite: Überblick über alles Ungesehene (je App, mit „Zeigen ›“). In einer App: Rundgang Schritt für Schritt mit Scheinwerfer
   auf der Stelle (ziel). Gesehen merkt der Server (/api/bp/neu), also auf allen Geräten. Benutzermenü „Neuigkeiten“: alles der letzten Wochen.
   Einträge: shared/bpcore/neuigkeiten.json. */
(() => {
  if (window.bpNeu) return;
  const H = window.BPHead, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = document.createElement('style');
  css.textContent = `.bpn-dim{position:fixed;inset:0;z-index:2400;background:rgba(20,20,25,.45)}
.bpn-spot{position:fixed;z-index:2401;border-radius:calc(10px*var(--rk,1));box-shadow:0 0 0 9999px rgba(20,20,25,.5);outline:2px solid var(--y,#ff5fb3);outline-offset:3px;pointer-events:none;transition:all .25s}
.bpn-k{position:fixed;z-index:2402;width:min(360px,calc(100vw - 24px));box-sizing:border-box;background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(14px*var(--rk,1));box-shadow:var(--sh0,0 16px 40px rgba(0,0,0,.3));padding:.85rem 1rem;display:grid;gap:.5rem;font-size:.92rem}
.bpn-k.mitte{left:50%!important;top:50%!important;transform:translate(-50%,-50%);width:min(460px,calc(100vw - 24px))}
.bpn-k h3{margin:0;font-size:1.05rem}.bpn-k p{margin:0;color:var(--mute,#666);line-height:1.45}
.bpn-kl{font-size:.72rem;color:var(--y,#d4357f);font-weight:700;letter-spacing:.05em;text-transform:uppercase}
.bpn-a{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}.bpn-a .f{flex:1}
.bpn-d{display:flex;gap:5px}.bpn-d i{width:9px;height:9px;border-radius:50%;background:var(--line,#ccc);cursor:pointer}.bpn-b:disabled{opacity:.4;cursor:default}.bpn-b.bpn-x{border:0;background:none;color:var(--mute,#666);padding-left:0}.bpn-d i.on{background:var(--y,#d4357f)}
.bpn-b{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(9px*var(--rk,1));padding:.42rem .85rem;font:inherit;font-size:.88rem;cursor:pointer}
.bpn-b.pri{background:var(--y,#d4357f);border-color:var(--y,#d4357f);color:var(--on,#fff);font-weight:600}
.bpn-l{display:grid;gap:.15rem;max-height:min(55vh,420px);overflow:auto;margin:0 -.3rem}
.bpn-ap{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute,#666);margin:.45rem .3rem .1rem}
.bpn-e{display:flex;gap:.6rem;align-items:baseline;padding:.35rem .3rem;border-radius:calc(8px*var(--rk,1))}.bpn-e:hover{background:var(--hov,rgba(0,0,0,.04))}
.bpn-e span{flex:1;min-width:0}.bpn-e small{display:block;color:var(--mute,#666);font-size:.8rem}
.bpn-e button{border:0;background:none;color:var(--y,#d4357f);font:inherit;font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap;padding:0}`;
  document.head.appendChild(css);
  const api = (m, b) => fetch('api/bp/neu' + (m === 'alle' ? '?alle=1' : ''), m === 'PUT' ? { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : { credentials: 'same-origin' }).then((r) => r.json());
  const merken = (ids) => (ids.length ? api('PUT', { ids }).catch(() => {}) : Promise.resolve());
  const appName = (k) => { const a = ((H.conf || {}).apps || []).find((x) => x.key === k); return k ? (a ? a.name : k) : 'Überall'; };
  const LS = { get() { try { return localStorage.getItem('bp.neu.zeig') || ''; } catch { return ''; } }, set(v) { try { if (v) localStorage.setItem('bp.neu.zeig', v); else localStorage.removeItem('bp.neu.zeig'); } catch { /* egal */ } } };
  let offenEl = [];
  const zu = () => { offenEl.forEach((x) => x.remove()); offenEl = []; removeEventListener('resize', setzen); removeEventListener('scroll', setzen, true); };
  let setzen = () => {};

  /* Rundgang durch die Einträge dieser Seite */
  function rundgang(E, fertig) {
    let i = 0;
    const dim = document.createElement('div'), spot = document.createElement('div'), k = document.createElement('div');
    dim.className = 'bpn-dim'; spot.className = 'bpn-spot'; k.className = 'bpn-k'; k.setAttribute('role', 'dialog');
    document.body.append(dim, spot, k); offenEl = [dim, spot, k];
    const ziel = () => { const s = E[i].ziel; if (!s) return null; try { const el = document.querySelector(s); const r = el && el.getBoundingClientRect(); return r && r.width && r.height ? el : null; } catch { return null; } };
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
    const zeig = () => {
      const x = E[i], letzt = i === E.length - 1;
      k.innerHTML = `<span class="bpn-kl">Neu${E.length > 1 ? ` · ${i + 1} von ${E.length}` : ''}</span><h3>${esc(x.titel)}</h3><p>${esc(x.text)}</p>
        <div class="bpn-a"><button type="button" class="bpn-b bpn-x" data-n="ende"${letzt ? ' style="visibility:hidden"' : ''}>Überspringen</button><span class="f"></span>${E.length > 1 ? `<span class="bpn-d">${E.map((_, j) => `<i class="${j === i ? 'on' : ''}" data-zu="${j}" title="Schritt ${j + 1}"></i>`).join('')}</span><span class="f"></span>
        <button type="button" class="bpn-b" data-n="zur"${i ? '' : ' disabled'}>‹ Zurück</button>` : ''}<button type="button" class="bpn-b pri" data-n="${letzt ? 'ende' : 'vor'}">${letzt ? 'Fertig ✓' : 'Weiter ›'}</button></div>`;
      const el = ziel(); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      setzen();
    };
    const taste = (e) => { if (!k.isConnected) { removeEventListener('keydown', taste); return; } if (/INPUT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
      if (e.key === 'ArrowRight' && i < E.length - 1) { i++; zeig(); } else if (e.key === 'ArrowLeft' && i > 0) { i--; zeig(); } };
    addEventListener('keydown', taste);
    k.addEventListener('click', (e) => { const d = e.target.closest('[data-zu]'); if (d) { i = +d.dataset.zu; zeig(); return; } const b = e.target.closest('[data-n]'); if (!b || b.disabled) return;
      if (b.dataset.n === 'vor') { i++; zeig(); } else if (b.dataset.n === 'zur') { i--; zeig(); } else { zu(); merken(E.map((x) => x.id)); if (fertig) fertig(); } });
    addEventListener('resize', setzen); addEventListener('scroll', setzen, true);
    zeig();
  }

  /* Überblick (Startseite, Benutzermenü) */
  function ueberblick(E, o = {}) {
    const hier = E.filter((x) => x.app === H.app || (!x.app && o.alle !== true));
    const gruppen = {}; E.forEach((x) => { (gruppen[x.app || ''] = gruppen[x.app || ''] || []).push(x); });
    const dim = document.createElement('div'), k = document.createElement('div');
    dim.className = 'bpn-dim'; k.className = 'bpn-k mitte'; k.setAttribute('role', 'dialog');
    document.body.append(dim, k); offenEl = [dim, k];
    k.innerHTML = `<h3>✨ ${o.alle ? 'Neuigkeiten der letzten Wochen' : 'Neu seit deinem letzten Besuch'}</h3><p>${(H.conf && H.conf.version) ? 'Stand ' + esc(String(H.conf.version).split(' ')[0]) + ' · ' : ''}${E.length} ${E.length === 1 ? 'Neuerung' : 'Neuerungen'}</p>
      <div class="bpn-l">${Object.entries(gruppen).map(([ap, L]) => `<div class="bpn-ap">${esc(appName(ap))}</div>${L.map((x) => `<div class="bpn-e"><span>${esc(x.titel)}<small>${esc(x.text)}</small></span>${ap && ap !== H.app ? `<button type="button" data-zeig="${esc(ap)}">Zeigen ›</button>` : ''}</div>`).join('')}`).join('')}</div>
      <div class="bpn-a"><span class="f"></span>${o.alle ? '<button type="button" class="bpn-b pri" data-n="zu">Schließen</button>'
        : `<button type="button" class="bpn-b" data-n="spaeter">Später</button>${hier.length ? '<button type="button" class="bpn-b" data-n="gelesen">Alles gelesen</button><button type="button" class="bpn-b pri" data-n="rund">Rundgang hier ›</button>' : '<button type="button" class="bpn-b pri" data-n="gelesen">Alles gelesen</button>'}`}</div>`;
    k.addEventListener('click', (e) => {
      const z = e.target.closest('[data-zeig]');
      if (z) { const a = ((H.conf || {}).apps || []).find((x) => x.key === z.dataset.zeig); if (a) { LS.set(a.key); if (!o.alle) merken(E.filter((x) => x.app !== a.key).map((x) => x.id)); location.href = H.appUrl(a) + '/'; } return; }
      const b = e.target.closest('[data-n]'); if (!b) return;
      zu();
      if (b.dataset.n === 'gelesen') merken(E.map((x) => x.id));
      if (b.dataset.n === 'rund') { merken(E.filter((x) => !hier.includes(x)).map((x) => x.id)); rundgang(hier); }
    });
  }

  async function start() {
    if (window.top !== window || !H || !H.me || offenEl.length || navigator.webdriver) return;   // nicht in Tests (automatisch gesteuerter Browser)
    const zeigApp = LS.get();
    let E;
    try { E = (await api(zeigApp === H.app ? 'alle' : 'GET')).eintraege || []; } catch { return; }
    if (zeigApp === H.app) { LS.set(''); E = E.filter((x) => x.app === H.app); if (E.length) setTimeout(() => rundgang(E), 1200); return; }
    if (!E.length) return;
    if (H.app === 'portal') { setTimeout(() => ueberblick(E), 900); return; }
    const hier = E.filter((x) => x.app === H.app || !x.app);
    if (hier.length) setTimeout(() => { if (!document.querySelector('.modal-bg,.bph-dlg-bg')) rundgang(hier); }, 1500);   // erst wenn die Seite steht; nie über einem offenen Fenster
  }
  window.bpNeu = { start, alle: async () => { try { const E = (await api('alle')).eintraege || []; zu(); ueberblick(E, { alle: true }); } catch { /* egal */ } } };
})();
