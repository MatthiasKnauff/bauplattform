/* KI-Schieber – ein Baustein für alle Stellen mit KI (GO 18.11.2026, Mock „KI-Schieber“: KS-A1 B1 C1 D1, auch Wiki).
   bpKI.mount(el, stelle, { pid, kompakt, nachher(stufe) }) → { wert() }   Schieber ohne KI · KI im Büro · externe KI
     stelle   Name der Stelle (z. B. 'fragen', 'anweisung', 'wiki') – die Wahl merkt sich der Browser je Stelle und Person (KS-A1)
     pid      Projekt: dessen Schalter sind die Obergrenze (KS-B1); gesperrte Stellungen ausgegraut mit Grund (Kern bpcore/ki_stufe.py)
   bpKI.wert(stelle) → 'aus' | 'buero' | 'extern' (zuletzt gewählt, sonst Vorgabe: KI im Büro). Beim ersten Umschalten auf eine Stellung erklärt
   eine Blase die Wirkung (bpBlase, „Verstanden“ = nicht mehr zeigen). Extern: der Server anonymisiert, jede Anfrage steht im Protokoll (KS-C1). */
(function () {
  if (window.bpKI) return;
  const N = { aus: 'ohne KI', buero: 'KI im Büro', extern: 'externe KI' }, SYM = { aus: '⊘', buero: '⌂', extern: '☁' };
  const WIRKUNG = {
    aus: '**Ohne KI**: die Plattform rechnet und sucht mit ihren eigenen Regeln – nichts geht an eine KI. Einfache Sätze und klare Angaben klappen, freie Sätze nicht immer.',
    buero: '**KI im Büro**: die KI auf eurem eigenen Server liest mit – nichts verlässt das Büro. Versteht freie Sätze; Vorschläge übernimmst du selbst.',
    extern: '**Externe KI**: die Anfrage geht anonymisiert (ohne Namen, Adressen, Preise) an eine KI im Netz – das kostet je Anfrage, steht im Datenschutz-Protokoll, die Antwort ist ungeprüft.',
  };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const K = (s) => 'bp.ki.' + s, lies = (s) => { try { return localStorage.getItem(K(s)); } catch { return null; } };
  const CACHE = new Map();
  const erlaubt = (pid) => { const k = String(pid || ''); if (!CACHE.has(k)) CACHE.set(k, fetch('api/bp/ki/stufen' + (pid ? '?pid=' + pid : ''), { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : { buero: false, extern: false, grund: {} })).catch(() => ({ buero: false, extern: false, grund: {} }))); return CACHE.get(k); };
  const passend = (s, E) => { if (s === 'extern' && !E.extern) s = 'buero'; if (s === 'buero' && !E.buero) s = 'aus'; return s; };   // gesperrt → eine Stufe tiefer
  const STIL = `.bp-ks{display:inline-flex;border:1px solid var(--line,#d5d9de);border-radius:999px;padding:2px;background:var(--hov,#f0f2f5);gap:2px;font-size:.8rem;user-select:none;vertical-align:middle}
.bp-ks button{font:inherit;border:0;background:none;color:inherit;padding:.1rem .6rem;border-radius:999px;cursor:pointer;white-space:nowrap}
.bp-ks button.on{background:var(--card,#fff);box-shadow:0 1px 2px rgba(0,0,0,.18);font-weight:600}.bp-ks button.on.ext{color:#b86e00}.bp-ks button.on.bu{color:var(--y,#3b5a8f)}
.bp-ks button:disabled{opacity:.4;text-decoration:line-through;cursor:not-allowed}.bp-ks.k button{padding:.1rem .45rem}`;
  const stil = (doc) => { if (doc.getElementById('bp-ks-stil')) return; const s = doc.createElement('style'); s.id = 'bp-ks-stil'; s.textContent = STIL; doc.head.appendChild(s); };
  async function mount(el, stelle, o = {}) {
    stil(el.ownerDocument);
    const E = await erlaubt(o.pid), G = E.grund || {};
    let s = passend(lies(stelle) || o.vorgabe || (window.BPHead && BPHead.kiVorgabe) || 'buero', E);   // A1: an der Stelle Gewähltes, sonst Startstellung aus ⚙ → Persönlich → KI
    const kompakt = o.kompakt != null ? o.kompakt : matchMedia('(max-width: 700px)').matches;   // D1: Text am Rechner, Symbole am Handy und in engen Leisten
    const zeig = () => { el.innerHTML = `<span class="bp-ks${kompakt ? ' k' : ''}" role="group" aria-label="KI">${['aus', 'buero', 'extern'].map((k) => {
      const zu = k !== 'aus' && !E[k];
      return `<button type="button" data-ks="${k}" class="${s === k ? 'on' : ''}${k === 'extern' ? ' ext' : k === 'buero' ? ' bu' : ''}"${zu ? ' disabled' : ''} title="${esc(zu ? N[k] + ' – ' + (G[k] || 'nicht erlaubt') : N[k])}" aria-pressed="${s === k}">${kompakt ? SYM[k] : N[k]}</button>`; }).join('')}</span>`; };
    zeig();
    el.onclick = (e) => {
      const b = e.target.closest('[data-ks]'); if (!b || b.disabled || b.dataset.ks === s) return;
      s = b.dataset.ks; try { localStorage.setItem(K(stelle), s); } catch { /* nur diese Sitzung */ }
      zeig();
      if (window.bpBlase) bpBlase(() => el.querySelector('.bp-ks'), WIRKUNG[s], { key: 'ki-stufe-' + s, mal: 1, sek: 18 });   // erste Betätigung: was die Stellung bewirkt
      if (o.nachher) o.nachher(s);
    };
    return { wert: () => s };
  }
  window.bpKI = { mount, vergessen: () => CACHE.clear(), wert: (stelle) => lies(stelle) || (window.BPHead && BPHead.kiVorgabe) || 'buero', erlaubt, NAME: N };
})();
