'use strict';
/* Druckseite für alle Apps (Baukasten): ein Knopf „Drucken“, dann links ankreuzen, was ins PDF soll, rechts die Vorschau.
   „⤓ PDF / Drucken“ öffnet das Ergebnis im gemeinsamen Viewer (dort Drucken, Teilen, Speichern, Unterschreiben).
   bpDruck({ titel, name, hinweis, merk, teile: [[key, label, vorgabeAn, aus, warum]], url: (keys) => string })
   Die Auswahl wird je „merk“ im Browser gemerkt. Vorbild: PDF-Paket der Ausschreibung (ava-werkzeuge.js paketDruck). */
(function () {
  const st = document.createElement('style');
  st.textContent = `.bpdr{position:fixed;inset:0;z-index:1000;background:#3b3f45;display:flex;flex-direction:column}
  .bpdr-bar{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;padding:.5rem max(.9rem,env(safe-area-inset-right,0px)) .5rem max(.9rem,env(safe-area-inset-left,0px));background:var(--card,#fff);color:var(--ink,#222);box-shadow:var(--sh0,0 2px 8px rgba(0,0,0,.25))}
  .bpdr-bar .bpdr-h{color:var(--mute,#777);font-size:.85em;flex:1;min-width:10rem}
  .bpdr-z{flex:1;display:grid;grid-template-columns:300px minmax(0,1fr);min-height:0}
  .bpdr-side{background:var(--card,#fff);color:var(--ink,#222);overflow:auto;padding:.9rem;display:flex;flex-direction:column;gap:.35rem;border-right:1px solid var(--line,#ddd)}
  .bpdr-side .bpdr-t{font-size:.75em;text-transform:uppercase;letter-spacing:.05em;color:var(--mute,#777);margin:.3rem 0 .2rem}
  .bpdr-c{display:flex;gap:.5rem;align-items:flex-start;cursor:pointer;padding:.25rem .3rem;border-radius:calc(6px*var(--rk,1))}.bpdr-c:hover{background:var(--hov,#f3f1ec)}
  .bpdr-c input{margin:.2rem 0 0;accent-color:var(--y,#c62f2a)}.bpdr-c.aus{opacity:.55;cursor:default}.bpdr-c small{display:block;color:var(--mute,#777)}
  .bpdr-s{overflow:auto;padding:1rem .75rem 3rem}.bpdr-s .bph-pdfs{display:block;margin:0 auto 1rem;max-width:820px;width:100%;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,.35)}
  .bpdr-l{color:#ddd;padding:3rem;text-align:center}
  @media (max-width:860px){.bpdr-z{grid-template-columns:1fr;grid-template-rows:auto 1fr}.bpdr-side{max-height:38vh}}`;
  document.head.appendChild(st);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lesen = (k) => { try { return JSON.parse(localStorage.getItem('bpd.' + k) || 'null'); } catch { return null; } };
  const merken = (k, v) => { try { localStorage.setItem('bpd.' + k, JSON.stringify(v)); } catch { /* egal */ } };

  window.bpDruck = function (o) {
    const gemerkt = lesen(o.merk || o.titel);
    const wahl = new Set((gemerkt || o.teile.filter((t) => t[2] && !t[3]).map((t) => t[0])).filter((k) => o.teile.some((t) => t[0] === k && !t[3])));
    const ov = document.createElement('div'); ov.className = 'bpdr'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titel);
    ov.innerHTML = `<div class="bpdr-bar"><b>${esc(o.titel)}</b><span class="bpdr-h">${esc(o.hinweis || 'Links ankreuzen, was ins PDF soll – rechts die Vorschau.')}</span>
      <button type="button" class="btn" data-bpdr="x">Schließen</button><button type="button" class="btn pri" data-bpdr="ok">⤓ PDF / Drucken</button></div>
      <div class="bpdr-z"><aside class="bpdr-side"><div class="bpdr-t">Im PDF</div>${o.teile.map(([k, l, , aus, warum]) => `<label class="bpdr-c${aus ? ' aus' : ''}"><input type="checkbox" data-bpdr-t="${esc(k)}"${wahl.has(k) && !aus ? ' checked' : ''}${aus ? ' disabled' : ''}><span>${esc(l)}${aus && warum ? `<small>${esc(warum)}</small>` : ''}</span></label>`).join('')}</aside>
      <div class="bpdr-s"><div class="bpdr-l">Lade Vorschau …</div></div></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const S = ov.querySelector('.bpdr-s');
    const teile = () => o.teile.map((t) => t[0]).filter((k) => { const x = ov.querySelector(`[data-bpdr-t="${CSS.escape(k)}"]`); return x && x.checked; });
    let url = '';
    async function laden() {
      const T = teile();
      if (!T.length) { url = ''; S.innerHTML = '<div class="bpdr-l">Bitte links mindestens einen Teil ankreuzen.</div>'; return; }
      url = o.url(T) + (o.url(T).includes('?') ? '&' : '?') + 't=' + Date.now();
      if (window.BPHead && BPHead.pdfIn) await BPHead.pdfIn(S, url);
      else S.innerHTML = `<iframe title="Vorschau" src="${esc(url)}" style="width:100%;height:100%;border:0"></iframe>`;
    }
    const zu = () => { ov.remove(); document.body.style.overflow = ''; };
    ov.addEventListener('change', (e) => { if (e.target.dataset.bpdrT === undefined) return; merken(o.merk || o.titel, teile()); laden(); });
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bpdr]'); if (!b) return;
      if (b.dataset.bpdr === 'x') return zu();
      if (!url) { if (window.toast) toast('Bitte mindestens einen Teil ankreuzen.', true); return; }
      if (window.BPHead && BPHead.ansehen) BPHead.ansehen([{ url, typ: 'pdf', name: o.name || o.titel }]); else window.open(url, '_blank', 'noopener');
    });
    laden();
  };
})();
