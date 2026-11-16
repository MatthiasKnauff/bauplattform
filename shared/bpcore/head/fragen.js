/* KI-Gespräch „Fragen“ zum Projekt – ein Baustein für Gebäudemodell, Kosten und Bauzeitenplan (GO 16.11.2026, „Gebäudemodell als Mitte“).
   Es fragt nur die KI im Büro (Ollama) mit den eigenen Daten (Kern bpcore/ki_fragen.py). Findet sie keinen Preis und hat die Verwaltung
   die Zusatzrecherche eingeschaltet, bietet der Reiter „im Netz nachfragen“ an – erst nach einer Warnung, denn dann geht die Frage
   (anonymisiert) an eine externe KI.
   bpFragen.mount(el, pid) – seite.js hängt den Reiter „Fragen“ in Kosten und Bauzeitenplan an; im Gebäudemodell eine eigene Ansicht. */
(function () {
  if (window.bpFragen) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const STIL = `.kf{display:flex;flex-direction:column;gap:.6rem;padding:.8rem .9rem 1rem;font-size:.9rem}
.kf-v{display:flex;flex-direction:column;gap:.55rem}.kf-f{align-self:flex-end;max-width:85%;background:var(--hov,rgba(47,111,179,.1));border-radius:calc(10px*var(--rk,1));padding:.4rem .65rem}
.kf-a{border:1px solid var(--line,#d5d9de);border-radius:calc(10px*var(--rk,1));padding:.5rem .7rem;white-space:pre-wrap;line-height:1.45}.kf-a.ext{border-style:dashed}
.kf-q{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.35rem}.kf-q span{font-size:.74rem;border:1px solid var(--line,#d5d9de);border-radius:1em;padding:0 .5em;opacity:.8}
.kf-h{font-size:.85rem;border-left:3px solid var(--warn,#c99a06);padding:.3rem .6rem}.kf-e{display:flex;gap:.4rem;align-items:flex-end}
.kf-e textarea{flex:1;min-width:0;font:inherit;min-height:2.6rem;max-height:9rem;resize:vertical;padding:.35rem .5rem;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));background:var(--card,#fff);color:inherit}
.kf-w{font-size:.8rem;opacity:.7}.kf-leer{font-size:.86rem;opacity:.75;line-height:1.5}`;
  const VERLAUF = {};   // je Projekt, nur in dieser Sitzung (nichts wird gespeichert)

  function mount(el, pid) {
    if (!document.getElementById('kf-stil')) { const s = document.createElement('style'); s.id = 'kf-stil'; s.textContent = STIL; document.head.appendChild(s); }
    const V = (VERLAUF[pid] ||= []);
    let laeuft = false;
    const antwortHtml = (x, i) => {
      if (x.hinweis) return `<div class="kf-h">${esc(x.hinweis)}</div>`;
      if (x.fehler) return `<div class="kf-h">${esc(x.fehler)}</div>`;
      if (!x.antwort && x.wartet) return '<div class="kf-a kf-w">Die KI im Büro denkt nach …</div>';
      return `<div class="kf-a${x.extern ? ' ext' : ''}">${esc(x.antwort)}<div class="kf-q">${(x.quellen || []).map((q) => `<span>${esc(q.text)}</span>`).join('')}</div></div>
        ${x.kein_preis ? (x.zusatz ? `<div><button type="button" class="btn sm" data-kfnetz="${i}" title="Die Frage geht anonymisiert an eine externe KI – kostenpflichtig, Antwort ungeprüft">Im Netz nachfragen …</button></div>`
          : '<div class="kf-w">Kein Preis in den eigenen Daten. Die externe KI als Ergänzung ist in der Verwaltung ausgeschaltet.</div>') : ''}`;
    };
    function zeichne() {
      el.innerHTML = `<div class="kf"><div class="kf-v">${V.length ? V.map((x, i) => `<div class="kf-f">${esc(x.frage)}${x.extern ? ' <small>(im Netz)</small>' : ''}</div>${antwortHtml(x, i)}`).join('')
        : '<p class="kf-leer">Frag zum Projekt – zum Beispiel „Was kostet der Fenstertausch?“ oder „Wann ist der Rohbau fertig?“. Es antwortet die KI im Büro, nur aus unseren Daten: Gebäudemodell, Bauteile, Kosten, Bauphasen, eigene Angebote und die Preisdatenbank.</p>'}</div>
        <div class="kf-e"><textarea data-kft placeholder="Frage zum Projekt …" aria-label="Frage zum Projekt"></textarea><button type="button" class="btn primary" data-kfok>Fragen</button></div></div>`;
      const v = el.querySelector('.kf-v'); if (v.lastElementChild) v.lastElementChild.scrollIntoView({ block: 'nearest' });
    }
    async function senden(frage, extern) {
      if (laeuft || !String(frage || '').trim()) return; laeuft = true;
      const x = { frage: String(frage).trim(), wartet: true, extern }; V.push(x); zeichne();
      try {
        const r = await fetch(`api/bp/modell/${pid}/fragen`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frage: x.frage, extern: !!extern }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) x.fehler = j.error || 'Der Server ist gerade nicht erreichbar.'; else Object.assign(x, j);
      } catch (e) { x.fehler = e.message; }
      x.wartet = false; laeuft = false; zeichne();
    }
    el.onclick = async (e) => {
      if (e.target.closest('[data-kfok]')) return senden(el.querySelector('[data-kft]').value);
      const n = e.target.closest('[data-kfnetz]');
      if (n) {
        const x = V[+n.dataset.kfnetz];
        const ok = window.bpFrage ? await bpFrage('Im Netz nachfragen?\n\nDie Frage geht mit den Projektdaten an eine externe KI – Namen, Adressen und Kontaktdaten werden vorher ersetzt. Das kostet je Anfrage, und die Antwort ist nicht geprüft.', { ok: 'Extern nachfragen' }) : false;
        if (ok) senden(x.frage, true);
      }
    };
    el.onkeydown = (e) => { if (e.target.matches('[data-kft]') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); senden(e.target.value); } };
    zeichne();
  }
  window.bpFragen = { mount };
}());
