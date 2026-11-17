/* Rücksprung nach einem Sprung aus „Zu tun“, der To-do-Liste oder der Suche (GO 17.11.2026).
   Die Absprungstelle merkt sich vorher, woher sie kommt (bpZurueckMerken in bp.js → sessionStorage „bpZurueck“). In der Ziel-App steht dann unten
   links ein schwebendes Feld: „← Zurück“ · „✓ Erledigt“ (nur bei Einträgen mit Haken) · ✕. Es bleibt beim Weiterklicken durch andere Apps stehen,
   bis man zurückgeht, erledigt, es schließt oder die Absprungseite selbst öffnet.
   „Erledigt“ hakt nicht hier ab, sondern springt zurück und lässt den vorhandenen Haken der Liste klicken (todo.js – mit dessen Rückgängig):
   so gibt es das Abhaken je Art (Aufgabe, Hinweis, Erinnerung) nur einmal. Zurück an der Absprungstelle („bpZurueckTun“): Rollposition,
   Eintrag sichtbar und kurz markiert, ggf. Haken setzen, Suche mit demselben Begriff wieder öffnen.
   head.js lädt den Baustein nur, wenn eine der beiden Angaben im sessionStorage steht. */
(function () {
  if (window.bpZurueck) return;
  const H = window.BPHead || {}, esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lies = (k) => { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch { return null; } };
  const setz = (k, v) => { try { if (v) sessionStorage.setItem(k, JSON.stringify(v)); else sessionStorage.removeItem(k); } catch { /* egal */ } };
  const ohneHash = (u) => String(u || '').replace(/#.*$/, '');
  const FRIST = 30000;   // ein gemerkter Sprung, der nicht binnen 30 s zu einer neuen Seite geführt hat (z. B. Treffer auf derselben Seite), verfällt

  /* ---------- an der Absprungstelle: was nach „Zurück“/„Erledigt“ zu tun ist ---------- */
  const TUN = lies('bpZurueckTun');
  if (TUN && ohneHash(TUN.url) === ohneHash(location.href)) {
    setz('bpZurueckTun', null);
    const bis = Date.now() + 8000;
    const schritt = () => {
      const z = TUN.key && document.querySelector(`[data-tk="${CSS.escape(TUN.key)}"]`);
      if (TUN.key && !z && Date.now() < bis) { setTimeout(schritt, 150); return; }   // Liste lädt noch
      if (TUN.rolle) scrollTo({ top: TUN.rolle });
      if (z) {
        z.scrollIntoView({ block: 'nearest' });
        z.classList.add('bp-zr-hier'); setTimeout(() => z.classList.remove('bp-zr-hier'), 1800);
        const cb = TUN.erledigt && z.querySelector('[data-td="fertig"]');
        if (cb && !cb.checked) cb.click();   // vorhandener Haken der Liste: Abhaken je Art und Rückgängig wie gewohnt
      }
      if (TUN.suche && H.suche) H.suche(TUN.suche);
    };
    setTimeout(schritt, 300);
  }

  /* ---------- in der Ziel-App: das schwebende Feld ---------- */
  let M = lies('bpZurueck'), el = null;
  if (M && ohneHash(M.url) === ohneHash(location.href)) { setz('bpZurueck', null); M = null; }   // wieder an der Absprungstelle: fertig
  else if (M && !M.aktiv && Date.now() - (M.t || 0) > FRIST) { setz('bpZurueck', null); M = null; }
  else if (M && !M.aktiv) { M.aktiv = true; setz('bpZurueck', M); }

  const STIL = `.bp-zr{position:fixed;left:14px;bottom:14px;z-index:9000;display:flex;align-items:center;gap:6px;max-width:min(560px,calc(100vw - 28px));
    background:var(--card,#fff);color:var(--ink,#232427);border:1px solid var(--line,#d9d8d3);border-radius:calc(999px*var(--rk,1));padding:5px 6px 5px 12px;
    box-shadow:var(--sh1,0 2px 10px rgba(0,0,0,.16));font-size:.9rem}
    .bp-zr .t{color:var(--mute,#686a6d);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .bp-zr button{flex:none;border:1px solid var(--line,#d9d8d3);background:transparent;color:inherit;border-radius:calc(999px*var(--rk,1));padding:3px 11px;font:inherit;cursor:pointer}
    .bp-zr button.pri{background:var(--y,#2f5d8a);border-color:var(--y,#2f5d8a);color:var(--on,#fff)}
    .bp-zr button.x{border:0;padding:3px 6px;color:var(--mute,#686a6d)}
    html.mobil .bp-zr{left:8px;right:8px;bottom:8px;max-width:none}
    .bp-zr-hier{outline:2px solid var(--y,#2f5d8a);outline-offset:-2px;transition:outline-color 1.5s}`;
  function zeigen() {
    if (!M || el) return;
    if (!document.getElementById('bp-zr-stil')) { const st = document.createElement('style'); st.id = 'bp-zr-stil'; st.textContent = STIL; document.head.appendChild(st); }
    el = document.createElement('div'); el.className = 'bp-zr'; el.setAttribute('role', 'navigation'); el.setAttribute('aria-label', 'Zurück');
    el.innerHTML = `<span aria-hidden="true">←</span><span class="t" title="${esc(M.titel)}">${esc(M.titel || 'Zurück')}</span>`
      + '<button type="button" class="pri" data-zr="zurueck">Zurück</button>'
      + (M.key && M.haken ? '<button type="button" data-zr="erledigt" title="In „Zu tun“ abhaken und zurück">✓ Erledigt</button>' : '')
      + '<button type="button" class="x" data-zr="weg" title="Ausblenden" aria-label="Ausblenden">✕</button>';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-zr]'); if (!b) return;
      const a = b.dataset.zr, m = M; setz('bpZurueck', null); M = null; el.remove(); el = null;
      if (a === 'weg') return;
      setz('bpZurueckTun', { url: m.url, rolle: m.rolle, key: m.key || '', suche: m.suche || '', erledigt: a === 'erledigt' });
      location.href = m.url;
    });
    document.body.appendChild(el);
  }
  if (M) { if (document.body) zeigen(); else document.addEventListener('DOMContentLoaded', zeigen); }
  window.bpZurueck = { zeigen, aktiv: () => !!M };
})();
