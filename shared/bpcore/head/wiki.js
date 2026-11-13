'use strict';
/* Wiki – Baustein für alle Apps (/bp/wiki.js, erst bei Bedarf über BPHead.wiki(…) geladen; Server: bpcore/wiki.py).
   bpWiki.festhalten({ quelle, text })  „💡 Erkenntnis fürs Wiki“ (Kopfleiste → ?): Text, Kapitel, Projekt (oben gewählt), Herkunft,
                                         Dateien hineinziehen – sie landen auf „Bauportal/02 Wiki“, in der Datenbank nur ein Vorschaubild;
                                         danach das Ereignis „bp-wiki“ ({ id }) am document
   bpWiki.hinweis(el, worte)             geprüfte Einträge, die zu den Worten passen (Gewerk, Kurztexte …), als kleiner Hinweis in el;
                                         „Nicht mehr zeigen“ merkt der Browser je Eintrag */
(() => {
  if (window.bpWiki) return;
  const H = window.BPHead || {};
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

  async function festhalten(o = {}) {
    let K = []; try { K = (await J('api/bp/wiki/kapitel')).kapitel; } catch { K = ['Sonstiges']; }
    const P = H.projekt && H.projekt.id ? H.projekt : null, Q = o.quelle || appName(), D = [];
    const liste = () => D.map((f, i) => `<span class="bpw-f">${esc(f.name)} <button type="button" class="bpw-x" data-m="fweg" data-i="${i}" aria-label="entfernen">✕</button></span>`).join('');
    modalBox(`<h3>💡 Erkenntnis fürs Wiki</h3>
      <label class="bpw-l">Was haben wir gelernt?<textarea rows="6" data-bpw="text" placeholder="Was ist passiert, was machen wir künftig anders?">${esc(o.text || '')}</textarea></label>
      <div class="bpw-r"><label class="bpw-l">Kapitel<select data-bpw="kapitel">${K.map((k) => `<option${k === o.kapitel ? ' selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
        <label class="bpw-l">Projekt<span class="bpw-ro">${P ? esc(P.name) : '– (oben kein Projekt gewählt)'}</span></label></div>
      <label class="bpw-l">Herkunft<input data-bpw="quelle" value="${esc(Q)}"></label>
      <div class="bpw-drop" data-bpwdrop>Fotos, PDFs hierher ziehen oder <label class="bpw-wahl">auswählen<input type="file" multiple hidden data-bpwfile></label><div class="bpw-fl"></div></div>
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
        const r = await J('api/bp/wiki', 'POST', { text: v('text'), kapitel: v('kapitel'), quelle: v('quelle'), projekt_id: P ? P.id : null });
        close();
        let fehl = '';
        for (const f of D) { try { await J(`api/bp/wiki/${r.id}/datei`, 'POST', { name: f.name, mime: f.type, datei: await b64(f) }); } catch (e) { fehl = e.message; } }
        meld(fehl ? 'Festgehalten – Dateien nicht abgelegt: ' + fehl : 'Fürs Wiki festgehalten.', !!fehl);
        document.dispatchEvent(new CustomEvent('bp-wiki', { detail: { id: r.id } }));   // z. B. die App „Wiki“ zeigt den neuen Eintrag
        if (window.rueckgaengig) rueckgaengig('Erkenntnis fürs Wiki', async () => { await J('api/bp/wiki/' + r.id, 'DELETE'); });
      } catch (e) { btn.disabled = false; meld(e.message, true); }
    });
    const bg = [...document.querySelectorAll('.modal-bg')].pop();
    const dazu = (fs) => { for (const f of fs) { if (f.size > 40 * 1048576) { meld(`„${f.name}“ ist zu groß (höchstens 40 MB).`, true); continue; } D.push(f); } bg.querySelector('.bpw-fl').innerHTML = liste(); };
    const z = bg.querySelector('[data-bpwdrop]');
    z.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); z.classList.add('an'); });
    z.addEventListener('dragleave', () => z.classList.remove('an'));
    z.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); z.classList.remove('an'); dazu(e.dataTransfer.files); });
    bg.querySelector('[data-bpwfile]').addEventListener('change', (e) => { dazu(e.target.files); e.target.value = ''; });
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

  if (!document.getElementById('bpw-css')) {
    const st = document.createElement('style'); st.id = 'bpw-css';
    st.textContent = `.bpw-l{display:flex;flex-direction:column;gap:.2rem;font-size:.82rem;color:var(--mute);margin:.5rem 0 0;min-width:0}
.bpw-l textarea,.bpw-l input,.bpw-l select{font:inherit;font-size:.92rem;color:var(--ink);background:var(--inp);border:1px solid var(--line);border-radius:calc(7px*var(--rk,1));padding:.4rem .55rem}
.bpw-r{display:flex;gap:.8rem;flex-wrap:wrap}.bpw-r>.bpw-l{flex:1 1 12rem}.bpw-ro{color:var(--ink);font-size:.92rem;padding:.4rem 0}
.bpw-drop{margin-top:.6rem;border:1px dashed var(--line);border-radius:calc(8px*var(--rk,1));padding:.55rem .7rem;font-size:.84rem;color:var(--mute)}.bpw-drop.an{border-color:var(--y);background:var(--hov)}
.bpw-wahl{color:var(--y);cursor:pointer;text-decoration:underline}.bpw-fl{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.3rem}
.bpw-f{background:var(--hov);border-radius:99px;padding:.1rem .5rem;font-size:.8rem;color:var(--ink)}.bpw-x{border:0;background:none;color:var(--mute);cursor:pointer;padding:0 0 0 .2rem}
.bpw-hin{display:flex;gap:.55rem;align-items:flex-start;border:1px solid color-mix(in srgb,var(--y) 35%,var(--line));background:color-mix(in srgb,var(--y) 8%,var(--card));border-radius:calc(8px*var(--rk,1));padding:.45rem .7rem;font-size:.85rem;margin:.3rem 0 .5rem}
.bpw-hin a{color:var(--y)}.bpw-nein{border:0;background:none;color:var(--mute);cursor:pointer;font:inherit;font-size:.8rem;text-decoration:underline;margin-left:.4rem;padding:0}`;
    document.head.appendChild(st);
  }
  window.bpWiki = { festhalten, hinweis };
})();
