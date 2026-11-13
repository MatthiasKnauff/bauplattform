'use strict';
/* Wiki – Baustein für alle Apps (/bp/wiki.js, erst bei Bedarf über BPHead.wiki(…) geladen; Server: bpcore/wiki.py).
   bpWiki.festhalten({ quelle, text })  „💡 Erkenntnis fürs Wiki“ (Kopfleiste → ?): Text, Tags (Knöpfe), Projekte (Häkchen), Herkunft,
                                         Dateien hineinziehen – sie landen auf „Bauportal/02 Wiki“, in der Datenbank nur ein Vorschaubild;
                                         danach das Ereignis „bp-wiki“ ({ id }) am document
   bpWiki.warnung(text, { worte })        beim Eintippen: passende geprüfte Einträge und frühere Mängel als kleine Karte unten rechts
   bpWiki.hinweis(el, worte)             geprüfte Einträge, die zu den Worten passen (Gewerk, Kurztexte …), als kleiner Hinweis in el;
                                         „Nicht mehr zeigen“ merkt der Browser je Eintrag */
(() => {
  if (window.bpWiki) return;
  const H = new Proxy({}, { get: (_, k) => (window.BPHead || {})[k] });   // BPHead erst beim Aufruf lesen (die App „Wiki“ lädt diesen Baustein vor head.js)
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = async (u, m, b) => { const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };
  const meld = (t, f) => (window.toast ? toast(t, f) : console.log(t));
  const CACHE = new Map();
  const LS = { get() { try { return new Set(JSON.parse(localStorage.getItem('bp.wiki.weg') || '[]')); } catch { return new Set(); } },
    weg(id) { const S = LS.get(); S.add(id); try { localStorage.setItem('bp.wiki.weg', JSON.stringify([...S].slice(-300))); } catch { /* egal */ } } };
  const wikiUrl = (id) => { const a = ((H.conf || {}).apps || []).find((x) => x.key === 'wiki'); return (a && a.url ? a.url.replace(/\/$/, '') + '/' : '/wiki/') + (id ? '#e' + id : ''); };
  const appName = () => { const b = document.querySelector('.bph-app'); return ((b && b.textContent) || H.app || document.title || '').trim().slice(0, 60); };
  const b64 = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(f); });

  /* Tags als Knöpfe (meistbenutzte zuerst, Zahl dahinter) – antippen an/aus, „＋ Tag“ für neue; der erste gewählte ordnet im Baum ein.
     tagKnoepfe(host, gewaehlt, alle [{tag, n}], neu()) → { werte() } */
  function tagKnoepfe(host, gewaehlt, alle, neu) {
    let G = [...gewaehlt], offen = false;
    const zeichne = () => {
      const A = [...alle], da = new Set(A.map((x) => x.tag.toLowerCase()));
      G.forEach((t) => { if (!da.has(t.toLowerCase())) A.unshift({ tag: t, n: 0 }); });
      const zeig = offen ? A : A.filter((x, i) => i < 12 || G.some((t) => t.toLowerCase() === x.tag.toLowerCase()));
      host.innerHTML = `<div class="bpw-tags">${zeig.map((x) => `<button type="button" class="bpw-tag${G.some((t) => t.toLowerCase() === x.tag.toLowerCase()) ? ' an' : ''}" data-bpwtag="${esc(x.tag)}">${esc(x.tag)}${x.n ? `<small>${x.n}</small>` : ''}</button>`).join('')}
        <button type="button" class="bpw-tag plus" data-bpwtagneu>＋ Tag</button>${A.length > zeig.length || offen ? `<button type="button" class="bpw-tag plus" data-bpwtagalle>${offen ? 'weniger' : 'alle ' + A.length + ' …'}</button>` : ''}</div>`;
    };
    host.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-bpwtag],[data-bpwtagneu],[data-bpwtagalle]'); if (!b) return;
      if (b.dataset.bpwtagalle != null) offen = !offen;
      else if (b.dataset.bpwtagneu != null) { const t = window.bpEingabe ? await bpEingabe('Neuer Tag', '', { ok: 'Hinzufügen' }) : ''; if (t && t.trim() && !G.some((x) => x.toLowerCase() === t.trim().toLowerCase())) G.push(t.trim().slice(0, 60)); }
      else { const t = b.dataset.bpwtag, k = G.findIndex((x) => x.toLowerCase() === t.toLowerCase()); if (k >= 0) G.splice(k, 1); else G.push(t); }
      zeichne(); if (neu) neu(G);
    });
    zeichne();
    return { werte: () => [...G], dazu: (L) => { L.forEach((t) => { if (!G.some((x) => x.toLowerCase() === t.toLowerCase())) G.push(t); }); zeichne(); } };
  }

  /* Projekte zum Ankreuzen: das aktuelle zuerst, dann alle Projekte der Plattform und alle Projektordner vom Fileserver („nur Ordner“).
     projektWahl(host, gewaehlt [{id?, name}], aktuell) → { werte(), dazu(L) } */
  let PRJ = null;
  function projektWahl(host, gewaehlt, aktuell) {
    let G = [...gewaehlt], q = '';
    const gleich = (a, b) => (a.id && b.id ? a.id === b.id : a.name.toLowerCase() === b.name.toLowerCase());
    const hat = (x) => G.some((y) => gleich(x, y));
    const zeichne = () => {
      const alle = PRJ ? [...PRJ.projekte, ...PRJ.ordner.map((n) => ({ name: n, ordner: true }))] : [];
      const oben = [...(aktuell ? [aktuell] : []), ...G].filter((x, i, A) => A.findIndex((y) => gleich(x, y)) === i);
      const rest = alle.filter((x) => !oben.some((y) => gleich(x, y)) && (!q || x.name.toLowerCase().includes(q)));
      const zeile = (x, akt) => `<label class="${akt ? 'akt' : ''}"><input type="checkbox" data-bpwpj="${esc(JSON.stringify({ id: x.id, name: x.name }))}"${hat(x) ? ' checked' : ''}> <span>${esc(x.name)}</span>${akt ? ' <small>aktuell</small>' : x.ordner ? ' <small>nur Ordner</small>' : ''}</label>`;
      host.querySelector('.bpw-pl').innerHTML = oben.map((x) => zeile(x, aktuell && gleich(x, aktuell))).join('') + rest.slice(0, 60).map((x) => zeile(x)).join('')
        + (!PRJ ? '<small class="bpw-pm">Projektordner werden geladen …</small>' : rest.length > 60 ? `<small class="bpw-pm">… ${rest.length - 60} weitere – oben suchen</small>` : '');
    };
    host.innerHTML = '<div class="bpw-pj"><input type="search" class="bpw-ps" placeholder="Projekt oder Ordner suchen …"><div class="bpw-pl"></div></div>';
    host.querySelector('.bpw-ps').addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); zeichne(); });
    host.addEventListener('change', (e) => { const c = e.target.closest('[data-bpwpj]'); if (!c) return; const x = JSON.parse(c.dataset.bpwpj); if (!x.id) delete x.id;
      if (c.checked) { if (!hat(x)) G.push(x); } else G = G.filter((y) => !gleich(x, y)); });
    zeichne();
    if (!PRJ) J('api/bp/wiki/projekte').then((r) => { PRJ = r; zeichne(); }).catch(() => { PRJ = { projekte: [], ordner: [] }; zeichne(); });
    return { werte: () => [...G], dazu: (L) => { L.forEach((x) => { if (!hat(x)) G.push(x); }); zeichne(); } };
  }

  /* Dokument lesen (Texterkennung) → Tags und Projekte vorschlagen; nichts wird dabei gespeichert */
  async function lesen(f) { try { return await J('api/bp/wiki/lesen', 'POST', { name: f.name, datei: await b64(f) }); } catch { return { tags: [], projekte: [] }; } }

  async function festhalten(o = {}) {
    let T = []; try { T = (await J('api/bp/wiki/kapitel')).tags || []; } catch { T = []; }
    const P = H.projekt && H.projekt.id ? { id: H.projekt.id, name: H.projekt.name } : null, Q = o.quelle || appName(), D = [];
    const liste = () => D.map((f, i) => `<span class="bpw-f">${esc(f.name)} <button type="button" class="bpw-x" data-m="fweg" data-i="${i}" aria-label="entfernen">✕</button></span>`).join('');
    let TK = null, PW = null;
    modalBox(`<h3>💡 Erkenntnis fürs Wiki</h3>
      <label class="bpw-l">Was haben wir gelernt?<textarea rows="5" data-bpw="text" placeholder="Was ist passiert, was machen wir künftig anders?">${esc(o.text || '')}</textarea></label>
      <span class="bpw-l">Tags <small>– meistbenutzte zuerst; der erste ordnet im Wiki ein</small></span><div data-bpwtags></div>
      <span class="bpw-l">Projekte <small>– das aktuelle zuerst, dann alle Projektordner</small></span><div data-bpwprj></div>
      <label class="bpw-l">Herkunft<input data-bpw="quelle" value="${esc(Q)}"></label>
      <div class="bpw-drop" data-bpwdrop>Fotos, PDFs hierher ziehen oder <label class="bpw-wahl">auswählen<input type="file" multiple hidden data-bpwfile></label> – sie werden gelesen und belegen Tags und Projekte vor<div class="bpw-fl"></div></div>
      <p class="mute" style="font-size:.78rem;margin:.3rem 0 0">Die KI fasst neue Erkenntnisse einmal in der Woche zusammen; als Hinweis in den Apps erscheinen sie erst nach der fachlichen Prüfung.</p>
      <div class="btns"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Festhalten</button></div>`,
    async (m, bg, close, btn) => {
      if (m === 'abbrechen') { close(); return; }
      if (m === 'fweg') { D.splice(+btn.dataset.i, 1); bg.querySelector('.bpw-fl').innerHTML = liste(); return; }
      if (m !== 'ok') return;
      const v = (k) => bg.querySelector(`[data-bpw="${k}"]`).value.trim();
      if (!v('text')) { meld('Bitte kurz aufschreiben, was wir gelernt haben.', true); return; }
      btn.disabled = true;
      try {
        const r = await J('api/bp/wiki', 'POST', { text: v('text'), tags: TK.werte(), quelle: v('quelle'), projekte: PW.werte() });
        close();
        let fehl = '';
        for (const f of D) { try { await J(`api/bp/wiki/${r.id}/datei`, 'POST', { name: f.name, mime: f.type, datei: await b64(f) }); } catch (e) { fehl = e.message; } }
        meld(fehl ? 'Festgehalten – Dateien nicht abgelegt: ' + fehl : 'Fürs Wiki festgehalten.', !!fehl);
        document.dispatchEvent(new CustomEvent('bp-wiki', { detail: { id: r.id } }));   // z. B. die App „Wiki“ zeigt den neuen Eintrag
        if (window.rueckgaengig) rueckgaengig('Erkenntnis fürs Wiki', async () => { await J('api/bp/wiki/' + r.id, 'DELETE'); });
      } catch (e) { btn.disabled = false; meld(e.message, true); }
    });
    const bg = [...document.querySelectorAll('.modal-bg')].pop();
    TK = tagKnoepfe(bg.querySelector('[data-bpwtags]'), o.tags || [], T);
    PW = projektWahl(bg.querySelector('[data-bpwprj]'), P ? [P] : [], P);
    const dazu = async (fs) => {
      for (const f of fs) { if (f.size > 40 * 1048576) { meld(`„${f.name}“ ist zu groß (höchstens 40 MB).`, true); continue; } D.push(f); }
      bg.querySelector('.bpw-fl').innerHTML = liste();
      const st = bg.querySelector('.bpw-fl'); st.insertAdjacentHTML('beforeend', '<small class="bpw-pm" data-bpwlies> · wird gelesen (KI im Büro) …</small>');
      for (const f of fs) {   // nach der Texterkennung vorbelegen: zuerst Ollama (Essenz als Text, Tags, Projekt), sonst Tags und Projekte aus dem Text
        const v = await lesen(f); TK.dazu(v.tags || []); PW.dazu(v.projekte || []);
        const t = bg.querySelector('[data-bpw="text"]'); if (v.text && t && !t.value.trim()) t.value = v.text;
      }
      const w = bg.querySelector('[data-bpwlies]'); if (w) w.remove();
    };
    const z = bg.querySelector('[data-bpwdrop]');
    z.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); z.classList.add('an'); });
    z.addEventListener('dragleave', () => z.classList.remove('an'));
    z.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); z.classList.remove('an'); dazu([...e.dataTransfer.files]); });
    bg.querySelector('[data-bpwfile]').addEventListener('change', (e) => { dazu([...e.target.files]); e.target.value = ''; });
    const t = bg.querySelector('[data-bpw="text"]'); if (t) t.focus();
  }

  async function hinweis(el, worte) {
    if (!el) return;
    const w = [...new Set((worte || []).map((x) => String(x || '').trim()).filter(Boolean))].slice(0, 40);
    if (!w.length) { el.innerHTML = ''; return; }
    const k = w.join(','), c = CACHE.get(k);   // dieselben Worte (z. B. LV neu gezeichnet): 5 Minuten aus dem Speicher
    let L = c && Date.now() - c.t < 300000 ? c.L : null;
    if (!L) { try { L = (await J('api/bp/wiki/hinweise?w=' + encodeURIComponent(k))).hinweise || []; } catch { L = []; } CACHE.set(k, { t: Date.now(), L }); }
    const weg = LS.get(); L = L.filter((x) => !weg.has(x.id));
    if (!L.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="bpw-hin"><span aria-hidden="true">📘</span><div><b>Aus dem Wiki:</b> ${L.length === 1 ? 'eine geprüfte Erkenntnis' : L.length + ' geprüfte Erkenntnisse'} –
      ${L.map((x) => `<a href="${esc(wikiUrl(x.id))}" target="_blank" rel="noopener" title="${esc(x.kurz)}">${esc(x.titel)}</a>`).join(' · ')}
      <button type="button" class="bpw-nein" data-bpwweg="${L.map((x) => x.id).join(',')}">Nicht mehr zeigen</button></div></div>`;
    el.querySelector('[data-bpwweg]').addEventListener('click', (e) => { e.currentTarget.dataset.bpwweg.split(',').forEach((i) => LS.weg(+i)); el.innerHTML = ''; });
  }

  /* Beim Eintippen (LV-Position, Vorgang): geprüfte Wiki-Einträge und frühere Mängel aus den Bautagebüchern – kleine Karte unten rechts,
     bleibt bis ✕ oder zur nächsten Warnung; derselbe Text warnt je Seite nur einmal */
  const GEWARNT = new Set();
  async function warnung(text, o = {}) {
    const t = String(text || '').trim(); if (t.length < 4 || GEWARNT.has(t.toLowerCase())) return;
    GEWARNT.add(t.toLowerCase());
    let R; try { R = await J('api/bp/wiki/warnung?t=' + encodeURIComponent(t) + '&w=' + encodeURIComponent((o.worte || []).filter(Boolean).join(','))); } catch { return; }
    const weg = LS.get(), W = (R.wiki || []).filter((x) => !weg.has(x.id)), M = R.maengel || [];
    if (!W.length && !M.length) return;
    const alt = document.querySelector('.bpw-warn'); if (alt) alt.remove();
    const de = (d) => (d && d.length >= 10 ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d || '');
    const k = document.createElement('div'); k.className = 'bpw-warn'; k.setAttribute('role', 'status');
    k.innerHTML = `<div class="bpw-wk"><b>⚠ Aufpassen bei „${esc(t.slice(0, 60))}“</b><button type="button" class="bpw-x" data-bpwzu aria-label="Schließen">✕</button></div>
      ${W.length ? `<div class="bpw-wg">📘 Aus dem Wiki</div>${W.map((x) => `<a href="${esc(wikiUrl(x.id))}" target="_blank" rel="noopener" title="${esc(x.kurz)}">${esc(x.titel)}</a>`).join('')}` : ''}
      ${M.length ? `<div class="bpw-wg">🔧 Frühere Mängel</div>${M.map((x) => `<div class="bpw-m">${esc(x.text)}<small>${esc(x.projekt)} · ${de(x.datum)}${x.bericht ? ' · Bericht ' + esc(x.bericht) : ''}</small></div>`).join('')}` : ''}`;
    k.querySelector('[data-bpwzu]').addEventListener('click', () => k.remove());
    document.body.appendChild(k);
  }

  if (!document.getElementById('bpw-css')) {
    const st = document.createElement('style'); st.id = 'bpw-css';
    st.textContent = `.bpw-l{display:flex;flex-direction:column;gap:.2rem;font-size:.82rem;color:var(--mute);margin:.5rem 0 0;min-width:0}
.bpw-l textarea,.bpw-l input,.bpw-l select{font:inherit;font-size:.92rem;color:var(--ink);background:var(--inp);border:1px solid var(--line);border-radius:calc(7px*var(--rk,1));padding:.4rem .55rem}
.bpw-r{display:flex;gap:.8rem;flex-wrap:wrap}.bpw-r>.bpw-l{flex:1 1 12rem}.bpw-ro{color:var(--ink);font-size:.92rem;padding:.4rem 0}
.bpw-drop{margin-top:.6rem;border:1px dashed var(--line);border-radius:calc(8px*var(--rk,1));padding:.55rem .7rem;font-size:.84rem;color:var(--mute)}.bpw-drop.an{border-color:var(--y);background:var(--hov)}
.bpw-wahl{color:var(--y);cursor:pointer;text-decoration:underline}.bpw-fl{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem}
.bpw-f{background:var(--hov);border-radius:99px;padding:.1rem .5rem;font-size:.8rem;color:var(--ink)}.bpw-x{border:0;background:none;color:var(--mute);cursor:pointer;padding:0 0 0 .2rem}
.bpw-hin{display:flex;gap:.55rem;align-items:flex-start;border:1px solid color-mix(in srgb,var(--y) 35%,var(--line));background:color-mix(in srgb,var(--y) 8%,var(--card));border-radius:calc(8px*var(--rk,1));padding:.45rem .7rem;font-size:.85rem;margin:.3rem 0 .5rem}
.bpw-warn{position:fixed;right:max(12px,env(safe-area-inset-right,0px));bottom:max(70px,calc(env(safe-area-inset-bottom,0px) + 70px));z-index:900;width:min(380px,calc(100vw - 24px));max-height:45vh;overflow:auto;background:var(--card);color:var(--ink);border:1px solid color-mix(in srgb,var(--c-o,#c77d12) 55%,var(--line));border-radius:calc(10px*var(--rk,1));box-shadow:var(--sh0,0 10px 30px rgba(0,0,0,.25));padding:.55rem .75rem;font-size:.84rem;display:grid;gap:.25rem}
.bpw-wk{display:flex;gap:.5rem;align-items:flex-start}.bpw-wk b{flex:1;min-width:0}.bpw-wg{color:var(--mute);font-size:.76rem;margin-top:.25rem}
.bpw-warn a{color:var(--y)}.bpw-m small{display:block;color:var(--mute);font-size:.74rem}
.bpw-hin a{color:var(--y)}
.bpw-l small{color:var(--mute);font-size:.76rem}
.bpw-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin:.25rem 0 .2rem}
.bpw-tag{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:99px;padding:.15rem .6rem;font:inherit;font-size:.82rem;cursor:pointer}
.bpw-tag small{color:var(--mute);margin-left:.3rem;font-size:.74rem}.bpw-tag.an{background:var(--y);border-color:var(--y);color:var(--on,#111)}.bpw-tag.an small{color:inherit;opacity:.75}
.bpw-tag.plus{border-style:dashed;color:var(--mute)}
.bpw-pj{border:1px solid var(--line);border-radius:calc(8px*var(--rk,1));padding:.35rem .5rem;margin:.25rem 0 .2rem}
.bpw-ps{width:100%;box-sizing:border-box;font:inherit;font-size:.86rem;color:var(--ink);background:var(--inp);border:1px solid var(--line);border-radius:calc(6px*var(--rk,1));padding:.3rem .5rem;margin-bottom:.3rem}
.bpw-pl{max-height:11rem;overflow:auto;display:grid;gap:.1rem;font-size:.86rem}.bpw-pl label{display:flex;gap:.45rem;align-items:center}.bpw-pl small,.bpw-pm{color:var(--mute);font-size:.76rem}
.bpw-pl label.akt{border-bottom:1px solid var(--line);padding-bottom:.2rem;margin-bottom:.15rem}.bpw-nein{border:0;background:none;color:var(--mute);cursor:pointer;font:inherit;font-size:.8rem;text-decoration:underline;margin-left:.4rem;padding:0}`;
    document.head.appendChild(st);
  }
  window.bpWiki = { festhalten, hinweis, warnung, tagKnoepfe, projektWahl, lesen };
})();
