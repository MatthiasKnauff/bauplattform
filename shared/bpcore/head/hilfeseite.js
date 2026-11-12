/* „?“ in der Kopfleiste – Hilfe zur App und alle Änderungen (gemeinsamer Baustein, lädt head.js erst beim ersten Klick).
   Bereich rechts in der Form der Einstellungen (.bph-dr …), die Seite dahinter bleibt bedienbar; ⧉ dockt als freies Fenster ab (bpFrei).
   Register „Hilfe“:      Text aus bpcore/hilfe_seiten/<app>.md (+ allgemein.md) – GET /api/bp/hilfeseite?app=…
                          Abschnitte „## Titel {muster}“: passt muster (regulärer Ausdruck) auf Adresse/#, steht der Abschnitt oben und offen.
   Register „Änderungen“: alle Einträge aus neuigkeiten.json seit Beginn (GET /api/bp/neu?verlauf=1), „Zeigen ›“ = Rundgang an die Stelle (bpNeu.zeige).
   bpHilfeSeite({ reiter: 'hilfe' | 'aenderungen' }) */
(() => {
  if (window.bpHilfeSeite) return;
  const H = window.BPHead || {}, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const css = document.createElement('style');
  css.textContent = `.bph-hs-bg{background:none!important;pointer-events:none}.bph-hs-bg .bph-dr{pointer-events:auto;width:min(440px,100vw)}
.bph-hs-bg .bph-drb{font-size:.95em;line-height:1.5}.bph-hs-bg .bph-drb p{margin:.25rem 0 .55rem}.bph-hs-bg .bph-drb ul,.bph-hs-bg .bph-drb ol{margin:.2rem 0 .6rem;padding-left:1.2rem}
.bph-hs-bg .bph-drb li{margin:.15rem 0}.bph-hs-bg .bph-drb code{font-size:.9em;background:var(--hov,rgba(127,127,127,.12));padding:0 .25rem;border-radius:4px}
.bph-hs-ab{border-top:1px solid var(--line,#ddd);padding:.15rem 0}.bph-hs-ab>summary{cursor:pointer;font-weight:600;padding:.5rem 0;list-style:none;display:flex;gap:.4rem;align-items:baseline}
.bph-hs-ab>summary::before{content:'▸';color:var(--mute,#888);transition:transform .15s}.bph-hs-ab[open]>summary::before{transform:rotate(90deg)}
.bph-hs-ab.hier>summary::after{content:'hier';font-size:.75em;font-weight:600;color:var(--on,#111);background:var(--y,#ffd27a);border-radius:999px;padding:0 .45rem;margin-left:.3rem}
.bph-hs-f{display:flex;gap:.3rem;flex-wrap:wrap;margin:.2rem 0 .6rem}.bph-hs-f button{border:1px solid var(--line,#ddd);background:none;color:inherit;border-radius:calc(999px*var(--rkp,1));padding:.2rem .7rem;font:inherit;font-size:.86em;cursor:pointer}
.bph-hs-f button.on{background:var(--y,#ffd27a);border-color:transparent;color:var(--on,#111);font-weight:600}
.bph-hs-e{border:1px solid var(--line,#ddd);border-radius:calc(10px*var(--rk,1));padding:.5rem .7rem;margin:0 0 .45rem}.bph-hs-e.neu{border-color:var(--y,#e0a800);box-shadow:inset 3px 0 0 var(--y,#e0a800)}
.bph-hs-e small{display:block;color:var(--mute,#888);font-size:.8em}.bph-hs-e b{display:block;margin:.1rem 0}.bph-hs-e p{margin:0;color:var(--mute,#666)}
.bph-hs-e button{border:0;background:none;color:var(--y2,var(--y,#b07800));font:inherit;font-weight:600;font-size:.88em;cursor:pointer;padding:.2rem 0 0}
.bph-hs-leer{color:var(--mute,#888);padding:1rem 0}.bph-hs-m{color:var(--mute,#888);font-size:.85em;margin:.6rem 0}`;
  document.head.appendChild(css);
  const appName = (k) => { const a = ((H.conf || {}).apps || []).find((x) => x.key === k); return k ? (a ? a.name : k) : 'Überall'; };
  const json = (u) => fetch(u, { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))));
  const de = (t) => (t ? `${t.slice(8, 10)}.${t.slice(5, 7)}.${t.slice(0, 4)}` : '');

  /* kleines Markdown: # Überschriften, Listen, **fett**, `code`, Absätze – mehr brauchen die Hilfetexte nicht */
  const zeile = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>').replace(/(^|\s)_(.+?)_(?=\s|$|[.,;:])/g, '$1<i>$2</i>');
  function md(text) {
    const out = []; let liste = null, abs = [];
    const absZu = () => { if (abs.length) { out.push(`<p>${zeile(abs.join(' '))}</p>`); abs = []; } };
    const listeZu = () => { if (liste) { out.push(`<${liste.t}>${liste.l.map((x) => `<li>${zeile(x)}</li>`).join('')}</${liste.t}>`); liste = null; } };
    String(text || '').split('\n').forEach((z) => {
      const h = /^(#{3,4})\s+(.*)$/.exec(z), li = /^\s*[-*]\s+(.*)$/.exec(z), ol = /^\s*\d+[.)]\s+(.*)$/.exec(z);
      if (h) { absZu(); listeZu(); out.push(`<h4>${zeile(h[2])}</h4>`); } else if (li || ol) { absZu(); const t = li ? 'ul' : 'ol'; if (!liste || liste.t !== t) { listeZu(); liste = { t, l: [] }; } liste.l.push((li || ol)[1]); }
      else if (!z.trim()) { absZu(); listeZu(); } else if (liste && /^\s{2,}/.test(z)) liste.l[liste.l.length - 1] += ' ' + z.trim(); else { listeZu(); abs.push(z.trim()); }
    });
    absZu(); listeZu(); return out.join('');
  }
  /* Text in Abschnitte („## Titel {muster}“) teilen; Vorspann vor dem ersten ## bleibt oben */
  function abschnitte(text) {
    const A = []; let cur = { titel: '', muster: '', z: [] };
    String(text || '').replace(/^#\s+.*$/m, '').split('\n').forEach((z) => {
      const m = /^##\s+(.*?)\s*(?:\{(.+)\})?\s*$/.exec(z);
      if (m) { A.push(cur); cur = { titel: m[1], muster: m[2] || '', z: [] }; } else cur.z.push(z);
    });
    A.push(cur); return A.filter((x) => x.titel || x.z.join('').trim());
  }
  const passt = (m) => { if (!m) return false; try { return new RegExp(m, 'i').test(location.pathname + location.hash); } catch { return false; } };

  let OFFEN = null;
  window.bpHilfeSeite = async function (o = {}) {
    if (OFFEN) { OFFEN.zu(); if (!o.reiter) return; }   // zweiter Klick auf „?“ schließt
    let reiter = o.reiter || '', such = '', filter = 'app', HT = null, AE = null, freiAus = null;
    const bg = document.createElement('div'); bg.className = 'bph-dr-bg bph-hs-bg';
    bg.innerHTML = `<aside class="bph-dr" role="dialog" aria-modal="false" aria-label="Hilfe und Änderungen"><div class="bph-drh"><b><span style="font-size:1.25em">?</span> ${esc(H.app ? appName(H.app) : ((document.querySelector('.bph-app') || {}).textContent || 'Hilfe'))}</b>
      <button type="button" class="bph-x bph-drf" data-hsf hidden></button><button type="button" class="bph-x" data-hsx aria-label="Schließen">×</button></div>
      <div class="bph-drn" role="tablist"><button type="button" data-hsr="hilfe" role="tab">Hilfe</button><button type="button" data-hsr="aenderungen" role="tab">Änderungen</button></div>
      <div class="bph-drs" style="padding-top:.6rem"><input type="search" data-hss placeholder="suchen …" aria-label="Suchen"></div><div class="bph-drb" data-hsb><p class="bph-hs-leer">Lädt …</p></div></aside>`;
    document.body.appendChild(bg);
    const D = bg.querySelector('.bph-dr'), B = bg.querySelector('[data-hsb]'), FB = bg.querySelector('[data-hsf]');
    const zu = () => { if (freiAus) freiAus(); bg.remove(); OFFEN = null; };
    OFFEN = { zu };
    const frei = (an) => {
      if (freiAus) { freiAus(); freiAus = null; }
      bg.classList.toggle('frei', an); D.classList.toggle('sr-flo', an);
      FB.textContent = an ? '⇲' : '⧉'; FB.title = an ? 'wieder rechts andocken' : 'als freies Fenster abdocken'; FB.setAttribute('aria-label', FB.title);
      if (an) freiAus = window.bpFrei(D, { key: 'hilfe.pos', start: { x: innerWidth - 480, y: 70, w: 440, h: innerHeight - 110 }, griff: '.bph-drh' });
      else ['left', 'top', 'height', 'width'].forEach((k) => { D.style[k] = ''; });
      try { localStorage.setItem('bph.hsfrei', an ? '1' : ''); } catch { /* egal */ }
    };
    if (window.bpFrei && innerWidth >= 900) { FB.hidden = false; let an = false; try { an = localStorage.getItem('bph.hsfrei') === '1'; } catch { /* egal */ } frei(an); }
    requestAnimationFrame(() => bg.classList.add('in'));

    const treffer = (t) => !such || String(t).toLowerCase().includes(such);
    function hilfeHtml() {
      if (!HT) return '<p class="bph-hs-leer">Lädt …</p>';
      const A = abschnitte(HT.text), G = abschnitte(HT.allgemein);
      if (!A.length && !G.length) return '<p class="bph-hs-leer">Für diese App gibt es noch keinen Hilfetext – er kommt in den nächsten Ständen dazu. Bis dahin hilft 🐞 „Frage stellen“.</p>';
      const L = A.map((x) => ({ ...x, hier: passt(x.muster) })).sort((a, b) => (b.hier ? 1 : 0) - (a.hier ? 1 : 0));
      const ab = (x, i) => { const t = x.z.join('\n'); if (such && !treffer(x.titel + ' ' + t)) return '';
        return x.titel ? `<details class="bph-hs-ab${x.hier ? ' hier' : ''}"${x.hier || such || (x === L.find((y) => y.titel) && !L.some((y) => y.hier)) ? ' open' : ''}><summary>${esc(x.titel)}</summary>${md(t)}</details>` : (such ? '' : md(t)); };
      const s = L.map(ab).join('') + (G.length ? `<h4 style="margin-top:1.4rem">In allen Apps</h4>${G.map((x) => ab({ ...x, hier: false }, 1)).join('')}` : '');
      return s || '<p class="bph-hs-leer">Nichts gefunden.</p>';
    }
    function aendHtml() {
      if (!AE) return '<p class="bph-hs-leer">Lädt …</p>';
      const L = AE.filter((x) => (filter === 'alle' || filter === 'neu' || !x.app || x.app === H.app) && (filter !== 'neu' || !x.gesehen) && treffer(x.titel + ' ' + x.text + ' ' + appName(x.app)));
      const n = AE.filter((x) => !x.gesehen).length;
      return `<div class="bph-hs-f">${[['app', 'diese App'], ['alle', 'alle Apps'], ['neu', `nur ungesehene${n ? ' · ' + n : ''}`]].map(([k, t]) => `<button type="button" data-hsfi="${k}" class="${k === filter ? 'on' : ''}">${t}</button>`).join('')}</div>
        ${L.map((x, i) => `<div class="bph-hs-e${x.gesehen ? '' : ' neu'}"><small>${de(x.datum)} · ${esc(appName(x.app))}${x.gesehen ? '' : ' · neu'}</small><b>${esc(x.titel)}</b><p>${esc(x.text)}</p>${x.ziel || x.hash || x.app !== H.app ? `<button type="button" data-hsz="${i}">Zeigen ›</button>` : ''}</div>`).join('') || '<p class="bph-hs-leer">Keine Änderungen.</p>'}
        ${n ? '<p class="bph-hs-m"><button type="button" class="bph-btn" data-hsg>Alles als gesehen markieren</button></p>' : ''}`;
    }
    let LISTE = [];
    function zeigen() {
      bg.querySelectorAll('[data-hsr]').forEach((b) => { const on = b.dataset.hsr === reiter; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      if (reiter === 'aenderungen' && AE) LISTE = AE.filter((x) => (filter === 'alle' || filter === 'neu' || !x.app || x.app === H.app) && (filter !== 'neu' || !x.gesehen) && treffer(x.titel + ' ' + x.text + ' ' + appName(x.app)));
      B.innerHTML = reiter === 'hilfe' ? hilfeHtml() : aendHtml();
    }
    const laden = async () => {
      if (reiter === 'hilfe' && !HT) { try { HT = await json('api/bp/hilfeseite?app=' + encodeURIComponent(H.app || '')); } catch (e) { HT = { text: '', allgemein: '' }; } }
      if (reiter === 'aenderungen' && !AE) { try { AE = (await json('api/bp/neu?verlauf=1')).eintraege || []; } catch { AE = []; } }
      if (bg.isConnected) zeigen();
    };
    // Vorgabe: ist hier etwas neu → Änderungen, sonst Hilfe
    if (!reiter) reiter = (document.querySelector('.bph-hlp.neu') ? 'aenderungen' : 'hilfe');
    zeigen(); laden();

    bg.addEventListener('click', (e) => {
      if (e.target.closest('[data-hsx]')) { zu(); return; }
      if (e.target.closest('[data-hsf]')) { frei(!bg.classList.contains('frei')); return; }
      const r = e.target.closest('[data-hsr]'); if (r) { reiter = r.dataset.hsr; zeigen(); laden(); return; }
      const f = e.target.closest('[data-hsfi]'); if (f) { filter = f.dataset.hsfi; zeigen(); return; }
      const z = e.target.closest('[data-hsz]'); if (z && window.bpNeu) { const L = LISTE.slice(), i = +z.dataset.hsz; zu(); bpNeu.zeige(L, i); return; }
      if (e.target.closest('[data-hsg]') && window.bpNeu) {
        bpNeu.merken(AE.filter((x) => !x.gesehen).map((x) => x.id)).then(() => { AE.forEach((x) => { x.gesehen = true; }); zeigen(); const q = document.querySelector('.bph-hlp'); if (q) q.classList.remove('neu'); });
      }
    });
    bg.querySelector('[data-hss]').addEventListener('input', (e) => { such = e.target.value.trim().toLowerCase(); zeigen(); });
    document.addEventListener('keydown', function esc_(e) { if (!bg.isConnected) { document.removeEventListener('keydown', esc_); return; } if (e.key === 'Escape' && bg.contains(document.activeElement)) zu(); });
  };
})();
