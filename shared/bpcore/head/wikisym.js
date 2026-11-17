'use strict';
/* Wiki-Symbol überall (GO 16.11.2026, Entwurf „Wiki-Symbol überall“; Server: bpcore/wiki_symbol.py). Erst geladen, wenn eine Seite
   Platzhalter hat (head.js). Eine App setzt hinter eine Sache nur einen leeren Platzhalter:
     <span data-wk="Worte|weitere Worte" data-wkp="Projekt-ID (nur für das Projekt selbst)"></span>
   Der Baustein fragt alle sichtbaren Platzhalter der Seite mit EINER Abfrage ab (10 Minuten gemerkt) und zeigt bei Treffern ein „W“ im Kreis,
   ab zwei Einträgen mit Zahl. Antippen → eigenes kleines Browserfenster (am Handy ein Fenster in der Seite): lesen, bearbeiten, löschen. */
(() => {
  if (window.bpWikiSym) return;
  const MERK = 10 * 60 * 1000, CACHE = new Map();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = async (u, m, b) => { const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };
  const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M6.8 8.5l2 7 3.2-5.5 3.2 5.5 2-7"/></svg>';
  const STIL = `.bpwk{display:inline-flex;align-items:center;gap:2px;height:18px;padding:0 5px 0 4px;margin-left:.3rem;border:1px solid var(--wkr,#e7cf94);border-radius:99px;
      background:var(--wkb,#fbf3df);color:var(--wk,#7a5a12);font:600 11px/1 system-ui,sans-serif;vertical-align:middle;cursor:pointer;flex:none}
    .bpwk svg{width:13px;height:13px}.bpwk:hover{filter:brightness(.95)}
    html[data-theme="dunkel"] .bpwk,html:not([data-theme]) .bpwk{--wk:#f0c96a;--wkb:#3a3220;--wkr:#6b5626}
    .bpwkf{display:flex;flex-direction:column;gap:.6rem;padding:.8rem 1rem;font-size:.92rem;color:var(--ink);background:var(--bg);min-height:100%;box-sizing:border-box}
    .bpwkf .li{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));overflow:hidden}
    .bpwkf .li button{all:unset;cursor:pointer;padding:.35rem .6rem;border-bottom:1px solid var(--line)}.bpwkf .li button:last-child{border:0}.bpwkf .li button.on{background:var(--hov)}
    .bpwkf .tx{white-space:pre-wrap;line-height:1.5}.bpwkf .mu{color:var(--mute);font-size:.82rem}.bpwkf .rw{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}
    .bpwkf input,.bpwkf textarea{font:inherit;color:var(--ink);background:var(--inp);border:1px solid var(--line);border-radius:calc(6px*var(--rk,1));padding:.35rem .5rem;width:100%;box-sizing:border-box}
    .bpwkf textarea{min-height:12rem;resize:vertical}.bpwkf .warn{border:1px solid var(--red);border-radius:calc(8px*var(--rk,1));padding:.5rem .6rem}`;
  function stil(d) { if (d.getElementById('bpwk-stil')) return; const s = d.createElement('style'); s.id = 'bpwk-stil'; s.textContent = STIL; d.head.appendChild(s); }
  stil(document);

  /* ---------- Platzhalter abfragen ---------- */
  const WK = 'span[data-wk]';   // nur die Platzhalter von bpWk (immer <span>) – data-wk tragen auch andere, z. B. die Navigation der App „Wiki“ (bpNav attr 'wk'), deren Knöpfe sonst geleert wurden (17.11.2026)
  const schluessel = (el) => (el.dataset.wk || '').trim().slice(0, 400) + '#' + (el.dataset.wkp || '');
  function fuellen(el, L) {
    el.dataset.wkk = schluessel(el);
    if (!L || !L.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<button type="button" class="bpwk" data-wkids="${L.map((x) => x.id).join(',')}" title="Wiki: ${esc(L.map((x) => x.titel).join(' · '))}" aria-label="Wiki-Einträge dazu: ${L.length}">${SVG}${L.length > 1 ? L.length : ''}</button>`;
  }
  let laeuft = false, nochmal = false;
  async function scan() {
    if (laeuft) { nochmal = true; return; }
    const offen = [...document.querySelectorAll(WK)].filter((el) => el.dataset.wkk !== schluessel(el));
    if (!offen.length) return;
    const jetzt = Date.now(), frage = {};
    offen.forEach((el) => { const k = schluessel(el), c = CACHE.get(k);
      if (c && jetzt - c.t < MERK) fuellen(el, c.r);
      else if (!(k in frage)) { const p = parseInt(el.dataset.wkp, 10); frage[k] = { w: (el.dataset.wk || '').split('|').filter(Boolean).slice(0, 10), ...(p ? { p } : {}) }; } });
    const K = Object.keys(frage).slice(0, 400); if (!K.length) return;
    laeuft = true;
    try {
      const R = await J('api/bp/wiki/symbole', 'POST', Object.fromEntries(K.map((k) => [k, frage[k]])));
      K.forEach((k) => CACHE.set(k, { t: Date.now(), r: R[k] || [] }));
      document.querySelectorAll(WK).forEach((el) => { const c = CACHE.get(schluessel(el)); if (c) fuellen(el, c.r); });
    } catch { /* ohne Symbol weiterarbeiten */ }
    laeuft = false; if (nochmal) { nochmal = false; setTimeout(scan, 300); }
  }
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 500); }).observe(document.body, { childList: true, subtree: true });
  const neuLaden = () => { CACHE.clear(); document.querySelectorAll(WK).forEach((el) => { delete el.dataset.wkk; }); scan(); };

  /* ---------- Fenster: lesen, bearbeiten, löschen ---------- */
  function fenster(ids) {
    const handy = matchMedia('(max-width: 820px)').matches || /iPhone|Android/i.test(navigator.userAgent);
    if (handy && window.modalBox) {
      const bg = modalBox('<div class="mh"><b>Wiki</b><button type="button" class="ib" data-m="x" aria-label="Schließen">✕</button></div><div class="mb" data-wkhost></div>',
        (m, _bg, close) => { if (m === 'x') close(); });
      inhalt(bg.querySelector('[data-wkhost]'), ids, () => bg.remove());
      return;
    }
    const w = window.open('', 'bp_wiki', 'popup=yes,width=640,height=760');
    if (!w) { if (window.toast) toast('Das Fenster wurde vom Browser blockiert – bitte Pop-ups für diese Seite erlauben.', true); return; }
    const d = w.document;
    d.open(); d.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><base href="${esc(document.baseURI)}"><title>Wiki</title></head><body style="margin:0"><div data-wkhost></div></body></html>`); d.close();
    document.querySelectorAll('link[rel="stylesheet"],style').forEach((n) => { const c = d.importNode(n, true); if (c.tagName === 'LINK') c.href = n.href; d.head.appendChild(c); });
    [...document.documentElement.attributes].forEach((a) => d.documentElement.setAttribute(a.name, a.value));
    stil(d); w.focus();
    inhalt(d.querySelector('[data-wkhost]'), ids, () => w.close());
  }

  async function inhalt(host, ids, zu) {
    const d = host.ownerDocument;
    let akt = ids[0], E = null, modus = 'lesen';
    const liste = ids.length > 1 ? ids : [];
    const titel = {};
    async function laden() { try { E = await J(`api/bp/wiki/eintrag/${akt}`); titel[akt] = E.titel; } catch (e) { E = { fehler: e.message }; } zeichne(); }
    function zeichne() {
      d.title = 'Wiki – ' + ((E && E.titel) || '');
      const kopf = liste.length ? `<div class="li">${liste.map((i) => `<button type="button" data-wkg="${i}" class="${i === akt ? 'on' : ''}">${esc(titel[i] || 'Eintrag ' + i)}</button>`).join('')}</div>` : '';
      if (!E) { host.innerHTML = `<div class="bpwkf">${kopf}<p class="mu">Lade …</p></div>`; return; }
      if (E.fehler) { host.innerHTML = `<div class="bpwkf">${kopf}<p>${esc(E.fehler)}</p><div class="rw"><span style="flex:1"></span><button type="button" class="btn" data-wk-a="zu">Schließen</button></div></div>`; return; }
      const herkunft = [E.kapitel, (E.projekte || []).map((p) => p.name).join(', '), E.autor_name && 'von ' + E.autor_name, E.updated && 'Stand ' + bpTagK(E.updated)].filter(Boolean).join(' · ');
      const dateien = (E.dateien || []).length ? `<div class="mu">${E.dateien.length} Datei${E.dateien.length > 1 ? 'en' : ''} – im Wiki öffnen</div>` : '';
      if (modus === 'bearbeiten') {
        host.innerHTML = `<div class="bpwkf">${kopf}<label class="mu">Titel<input data-wkf="titel" value="${esc(E.titel)}" maxlength="200"></label>
          <label class="mu">Text<textarea data-wkf="text">${esc(E.text)}</textarea></label>
          <label class="mu">Tags (mit Komma getrennt; der erste ordnet ein)<input data-wkf="tags" value="${esc((E.tags || []).join(', '))}"></label>
          ${E.darf && E.darf.pruefen ? '' : '<p class="mu" style="margin:0">Nach dem Speichern prüft das Büro die Änderung in der nächsten Runde – bis dahin zeigt das Symbol den Eintrag nicht.</p>'}
          <div class="rw"><span style="flex:1"></span><button type="button" class="btn" data-wk-a="lesen">Abbrechen</button><button type="button" class="btn pri" data-wk-a="speichern">Speichern</button></div></div>`;
        return;
      }
      host.innerHTML = `<div class="bpwkf">${kopf}<b style="font-size:1.05rem">${esc(E.titel)}</b><div class="mu">${esc(herkunft)}</div><div class="tx">${esc(E.text)}</div>${dateien}
        ${modus === 'loeschen' ? `<div class="warn"><b>„${esc(E.titel)}“ löschen?</b><div class="mu">Der Eintrag kommt in den Papierkorb (30 Tage wiederherstellbar), seine Dateien danach auf der Ablage nach „02 Wiki/_Papierkorb“.</div>
          <div class="rw" style="margin-top:.4rem"><span style="flex:1"></span><button type="button" class="btn" data-wk-a="lesen">Nicht löschen</button><button type="button" class="btn danger" data-wk-a="weg">Löschen</button></div></div>` : ''}
        <div class="rw"><button type="button" class="btn" data-wk-a="bearbeiten">✎ Bearbeiten</button>${E.darf && E.darf.loeschen ? '<button type="button" class="btn danger" data-wk-a="loeschen">Löschen</button>' : ''}
          <span style="flex:1"></span><button type="button" class="btn" data-wk-a="wiki">Im Wiki öffnen</button><button type="button" class="btn pri" data-wk-a="zu">Schließen</button></div></div>`;
    }
    const bpTagK = (s) => (window.bpTag ? bpTag(String(s).slice(0, 10)) : String(s).slice(0, 10));
    host.addEventListener('click', async (e) => {
      const g = e.target.closest('[data-wkg]'); if (g) { akt = +g.dataset.wkg; modus = 'lesen'; E = null; zeichne(); laden(); return; }
      const b = e.target.closest('[data-wk-a]'); if (!b) return; const a = b.dataset.wkA;
      if (a === 'zu') { zu(); return; }
      if (a === 'wiki') { const app = ((window.BPHead && BPHead.conf && BPHead.conf.apps) || []).find((x) => x.key === 'wiki'); window.open((app && app.url ? app.url.replace(/\/$/, '') + '/' : '/wiki/') + '#e' + akt, '_blank'); return; }
      if (a === 'lesen' || a === 'bearbeiten' || a === 'loeschen') { modus = a; zeichne(); return; }
      if (a === 'speichern') {
        const v = (k) => host.querySelector(`[data-wkf="${k}"]`).value;
        const neu = { titel: v('titel').trim(), text: v('text'), tags: v('tags').split(',').map((x) => x.trim()).filter(Boolean) };
        if (!neu.text.trim()) { if (window.toast) toast('Der Text darf nicht leer sein.', true); return; }
        try { const r = await J(`api/bp/wiki/eintrag/${akt}`, 'PUT', neu); const id = akt, alt = r.vorher;
          if (window.rueckgaengig) rueckgaengig(`Wiki „${neu.titel || r.titel}“ geändert`, async () => { await J(`api/bp/wiki/eintrag/${id}`, 'PUT', alt); neuLaden(); },
            10000, async () => { await J(`api/bp/wiki/eintrag/${id}`, 'PUT', neu); neuLaden(); });
          modus = 'lesen'; E = null; zeichne(); await laden(); neuLaden();
        } catch (er) { if (window.toast) toast(er.message, true); }
        return;
      }
      if (a === 'weg') {
        try { const r = await J(`api/bp/wiki/eintrag/${akt}`, 'DELETE'), t0 = E.titel;
          if (window.rueckgaengig && r.papierkorb) rueckgaengig(`Wiki „${t0}“ gelöscht`, async () => { await J(`api/bp/papierkorb/${r.papierkorb}/zurueck`, 'POST'); neuLaden(); });
          neuLaden();
          const rest = liste.filter((i) => i !== akt);
          if (!rest.length) { zu(); return; }
          liste.splice(0, liste.length, ...rest); akt = rest[0]; modus = 'lesen'; E = null; zeichne(); laden();
        } catch (er) { if (window.toast) toast(er.message, true); }
      }
    });
    zeichne();
    if (liste.length) await Promise.all(liste.filter((i) => i !== akt).map(async (i) => { try { titel[i] = (await J(`api/bp/wiki/eintrag/${i}`)).titel; } catch { /* egal */ } }));
    laden();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.bpwk[data-wkids]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    fenster(b.dataset.wkids.split(',').map(Number).filter(Boolean));
  }, true);

  window.bpWikiSym = { scan, neuLaden, fenster };
  scan();
})();
