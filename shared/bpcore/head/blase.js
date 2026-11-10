/* Erklär-Blase – gemeinsamer Baustein (/bp/blase.js): ein kurzer Hinweis, der an einem Element hängt und sich nur die ersten Male zeigt.
   bpBlase(el, text, { key, mal = 3, sek = 14 })
     el    Element, auf das die Blase zeigt (auch in einem eigenen Fenster – es zählt dessen Dokument); oder eine Funktion, die es liefert –
           für Stellen, die neu gezeichnet werden (ist es gerade nicht da, bleibt die Blase stehen, wo sie war)
     text  Text; Zeilenumbrüche bleiben, **fett** wird fett
     key   Name des Hinweises – gezählt je Benutzer im Browser (bp.blase.<key>)
     mal   so oft erscheint der Hinweis höchstens; „Verstanden“ beendet ihn sofort für immer
     sek   nach so vielen Sekunden geht die Blase von selbst weg (zählt als einmal gezeigt)
   Je Schlüssel steht nie mehr als eine Blase; je Sitzung zeigt sich derselbe Hinweis nur einmal. bpBlase.neu(key) zeigt ihn wieder von vorn. */
(() => {
  if (window.bpBlase) return;
  const SCHON = new Set(), K = (k) => 'bp.blase.' + k;
  const lies = (k) => { try { return +localStorage.getItem(K(k)) || 0; } catch { return 0; } };
  const merk = (k, n) => { try { localStorage.setItem(K(k), n); } catch { /* ohne Speicher: nur für diese Sitzung */ } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function bpBlase(ziel, text, o = {}) {
    const key = o.key || text.slice(0, 40), mal = o.mal || 3, hol = typeof ziel === 'function' ? ziel : () => ziel;
    let el = hol();
    if (!el || !el.isConnected || SCHON.has(key) || lies(key) >= mal) return null;
    const doc = el.ownerDocument, win = doc.defaultView || window;
    SCHON.add(key); merk(key, lies(key) + 1);
    const b = doc.createElement('div'); b.className = 'bp-blase'; b.setAttribute('role', 'status');
    b.innerHTML = `<div class="bp-blase-t">${esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}</div><button type="button" class="bp-blase-ok">Verstanden</button><i></i>`;
    doc.body.appendChild(b);
    const setz = () => {   // unter dem Element, sonst darüber; die Spitze zeigt auf seine Mitte
      if (!el.isConnected) { const n = hol(); if (n && n.isConnected && n !== el) el = n; else if (typeof ziel === 'function') return; else return weg(); }
      const r = el.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, W = win.innerWidth, H = win.innerHeight;
      const mx = Math.max(12, Math.min(W - 12, r.left + r.width / 2)), unten = r.bottom + h + 14 <= H || r.top - h - 14 < 0;
      const x = Math.max(8, Math.min(W - w - 8, mx - w / 2));
      b.style.left = x + 'px'; b.style.top = Math.max(8, Math.min(H - h - 8, unten ? r.bottom + 10 : r.top - h - 10)) + 'px';
      b.classList.toggle('oben', !unten); b.querySelector('i').style.left = Math.max(12, Math.min(w - 12, mx - x)) + 'px';
    };
    let t = 0;
    function weg() { clearTimeout(t); win.removeEventListener('scroll', setz, true); win.removeEventListener('resize', setz); b.remove(); }
    b.querySelector('.bp-blase-ok').onclick = () => { merk(key, mal); weg(); };
    win.addEventListener('scroll', setz, true); win.addEventListener('resize', setz);
    setz(); t = setTimeout(weg, (o.sek || 14) * 1000);
    return b;
  }
  bpBlase.neu = (key) => { SCHON.delete(key); try { localStorage.removeItem(K(key)); } catch { /* egal */ } };
  window.bpBlase = bpBlase;
})();
