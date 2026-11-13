/* Dateien aus dem Projektordner wählen – Baustein für alle Apps (/bp/dateiwahl.js, von head.js bei Bedarf geladen: BPHead.dateiWahl).
   Zwei Reiter: „Pläne & Dateien“ (je Plan der neueste PDF-Stand, darunter die übrigen PDFs, mit Suche) und „Fileserver“ (Ordner durchklicken).
   Gewählt wird mit Häkchen über beide Reiter hinweg; Ergebnis sind nur Verweise – gelesen wird die Datei erst, wenn sie gebraucht wird.

   BPHead.dateiWahl({ project_id, titel, start: 'plaene'|'server', schon: [pfad, …] })
     → Promise<[{ quelle: 'plan'|'server', pfad, name, groesse, sub }] | null>   (null = abgebrochen)
   Server: /api/bp/dateiwahl/plaene, /api/bp/dateiwahl/ordner (bpcore/dateiwahl.py) */
(() => {
  if (window.bpDateiWahl) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fold = (s) => String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round((n || 0) / 1024)) + ' KB');
  const css = document.createElement('style');
  css.textContent = `.bpdw{width:min(760px,100%);display:flex;flex-direction:column;max-height:88vh;overflow:hidden}
.bpdw .bph-dh{gap:.6rem}.bpdw .bph-dh b{flex:1}
.bpdw-r{display:flex;gap:.3rem;padding:0 1rem .5rem;border-bottom:1px solid var(--line,#ddd)}
.bpdw-r button{border:0;background:none;color:inherit;font:inherit;padding:.4rem .8rem;border-radius:calc(8px*var(--rk,1));cursor:pointer;opacity:.7}.bpdw-r button.on{opacity:1;background:var(--hov,rgba(127,127,127,.15));font-weight:600}
.bpdw-q{display:flex;gap:.5rem;align-items:center;padding:.5rem 1rem;flex-wrap:wrap}.bpdw-q input{flex:1;min-width:12rem;padding:.4rem .6rem;border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));background:transparent;color:inherit;font:inherit}
.bpdw-pf{display:flex;gap:.2rem;flex-wrap:wrap;align-items:center;font-size:.88em}.bpdw-pf button{border:0;background:none;color:var(--y,#2f6fb3);cursor:pointer;font:inherit;padding:.1rem .2rem}
.bpdw-l{flex:1;overflow:auto;min-height:14rem;border-top:1px solid var(--line,#ddd)}
.bpdw-z{display:grid;grid-template-columns:1.6rem 1.4rem minmax(0,1fr) auto;gap:.45rem;align-items:center;padding:.4rem 1rem;border-bottom:1px solid var(--line,#eee);cursor:pointer}
.bpdw-z:hover{background:var(--hov,rgba(127,127,127,.08))}.bpdw-z small{display:block;color:var(--mute,#888);font-size:.8em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpdw-z .n{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bpdw-z .g{color:var(--mute,#888);font-size:.82em;white-space:nowrap}
.bpdw-h{padding:.5rem 1rem .2rem;font-size:.75em;text-transform:uppercase;letter-spacing:.05em;color:var(--mute,#888)}
.bpdw-e{padding:1rem;color:var(--mute,#888)}
.bpdw-f{display:flex;gap:.5rem;align-items:center;padding:.7rem 1rem;border-top:1px solid var(--line,#ddd)}.bpdw-f span{flex:1;color:var(--mute,#888);font-size:.88em}`;
  document.head.appendChild(css);

  function dateiWahl(o = {}) {
    return new Promise((fertig) => {
      const api = (u) => fetch(u, { credentials: 'same-origin' }).then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Fehler ' + r.status); return j; });
      const schon = new Set(o.schon || []), wahl = new Map();   // pfad → Verweis
      let reiter = o.start || 'plaene', P = null, pfad = [], O = null, q = '';
      const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
      bg.innerHTML = `<div class="bph-dlg bpdw" role="dialog" aria-label="${esc(o.titel || 'Dateien wählen')}"><div class="bph-dh"><b>${esc(o.titel || 'Dateien aus dem Projekt wählen')}</b><button type="button" class="bph-x" data-dwx aria-label="Schließen">✕</button></div>
        <div class="bpdw-r"><button type="button" data-dwr="plaene">📐 Pläne &amp; Dateien</button><button type="button" data-dwr="server">🗄 Fileserver (Projektordner)</button></div>
        <div class="bpdw-q"></div><div class="bpdw-l"></div>
        <div class="bpdw-f"><span></span><button type="button" class="bph-btn" data-dwx>Abbrechen</button><button type="button" class="bph-btn pri" data-dwok disabled>Übernehmen</button></div></div>`;
      document.body.appendChild(bg);
      const $ = (s) => bg.querySelector(s), ende = (v) => { bg.remove(); fertig(v); };
      const zeile = (x, ic) => { const da = schon.has(x.pfad), an = da || wahl.has(x.pfad);
        return `<label class="bpdw-z"${da ? ' title="Schon in der Liste"' : ''}><input type="checkbox" data-dwp="${esc(x.pfad)}"${an ? ' checked' : ''}${da ? ' disabled' : ''}><span>${ic}</span><span class="n">${esc(x.name)}${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span><span class="g">${x.groesse ? mb(x.groesse) : ''}</span></label>`; };
      const fuss = () => { const n = wahl.size, g = [...wahl.values()].reduce((s, x) => s + (x.groesse || 0), 0);
        $('.bpdw-f span').textContent = n ? `${n} gewählt · ${mb(g)}` : 'Häkchen setzen – auch in beiden Reitern'; $('[data-dwok]').disabled = !n; $('[data-dwok]').textContent = n ? `${n} übernehmen` : 'Übernehmen'; };
      const zeichne = () => {
        bg.querySelectorAll('[data-dwr]').forEach((b) => b.classList.toggle('on', b.dataset.dwr === reiter));
        const L = $('.bpdw-l');
        if (reiter === 'plaene') {
          if (!$('.bpdw-q input')) $('.bpdw-q').innerHTML = '<input type="search" placeholder="Suchen – Nummer, Titel, Index …" autocomplete="off">';
          if (!P) { L.innerHTML = '<p class="bpdw-e">Pläne werden gelesen …</p>'; return; }
          if (P.error) { L.innerHTML = `<p class="bpdw-e">${esc(P.error)}</p>`; return; }
          const f = (x) => !q || q.split(/\s+/).every((w) => fold(`${x.name} ${x.sub}`).includes(w));
          const a = P.plaene.filter(f), b = P.sonstige.filter(f);
          L.innerHTML = (a.length ? `<div class="bpdw-h">Pläne – neuester Stand</div>${a.map((x) => zeile(x, '📐')).join('')}` : '')
            + (b.length ? `<div class="bpdw-h">Weitere PDFs im Projektordner</div>${b.map((x) => zeile(x, '📄')).join('')}` : '')
            || `<p class="bpdw-e">${q ? 'Nichts gefunden.' : 'Keine Pläne im Projektordner gefunden.'}</p>`;
        } else {
          $('.bpdw-q').innerHTML = `<div class="bpdw-pf"><button type="button" data-dwt="0">Projektordner</button>${pfad.map((t, i) => `› <button type="button" data-dwt="${i + 1}">${esc(t)}</button>`).join('')}</div>`;
          if (!O) { L.innerHTML = '<p class="bpdw-e">Ordner wird gelesen …</p>'; return; }
          if (O.error) { L.innerHTML = `<p class="bpdw-e">${esc(O.error)}</p>`; return; }
          L.innerHTML = O.ordner.map((d) => `<div class="bpdw-z" data-dwd="${esc(d)}"><span></span><span>📁</span><span class="n">${esc(d)}</span><span class="g">›</span></div>`).join('')
            + O.dateien.map((x) => zeile({ quelle: 'server', pfad: [...pfad, x.name].join('/'), name: x.name, groesse: x.groesse, sub: pfad.join(' › ') }, /\.pdf$/i.test(x.name) ? '📄' : /\.(jpe?g|png|tiff?)$/i.test(x.name) ? '🖼' : '📎')).join('')
            || '<p class="bpdw-e">Dieser Ordner ist leer.</p>';
        }
        fuss();
      };
      const laden = async () => {
        if (reiter === 'plaene' && !P) { try { P = await api('api/bp/dateiwahl/plaene?project_id=' + o.project_id); } catch (e) { P = { error: e.message }; } }
        if (reiter === 'server' && !O) { try { O = await api(`api/bp/dateiwahl/ordner?project_id=${o.project_id}&pfad=${encodeURIComponent(pfad.join('/'))}`); } catch (e) { O = { error: e.message }; } }
        if (document.body.contains(bg)) zeichne();
      };
      const merke = () => { const all = [...(P ? P.plaene.concat(P.sonstige) : [])]; return (p) => all.find((x) => x.pfad === p); };
      bg.addEventListener('click', (e) => {
        if (e.target.closest('[data-dwx]')) return ende(null);
        if (e.target.closest('[data-dwok]')) return ende([...wahl.values()]);
        const r = e.target.closest('[data-dwr]'); if (r) { reiter = r.dataset.dwr; q = ''; $('.bpdw-q').innerHTML = ''; zeichne(); laden(); return; }
        const d = e.target.closest('[data-dwd]'); if (d) { pfad = [...pfad, d.dataset.dwd]; O = null; zeichne(); laden(); return; }
        const t = e.target.closest('[data-dwt]'); if (t) { pfad = pfad.slice(0, +t.dataset.dwt); O = null; zeichne(); laden(); }
      });
      bg.addEventListener('change', (e) => {
        const c = e.target.closest('[data-dwp]'); if (!c) return; const p = c.dataset.dwp;
        if (!c.checked) wahl.delete(p);
        else if (reiter === 'plaene') wahl.set(p, merke()(p));
        else { const n = p.split('/').pop(), x = (O.dateien || []).find((y) => y.name === n) || {}; wahl.set(p, { quelle: 'server', pfad: p, name: n, groesse: x.groesse || 0, sub: pfad.join(' › ') }); }
        fuss();
      });
      bg.addEventListener('input', (e) => { if (e.target.matches('.bpdw-q input')) { q = fold(e.target.value.trim()); zeichne(); } });
      bg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); ende(null); } });
      zeichne(); laden();
      setTimeout(() => { const i = $('.bpdw-q input'); if (i) i.focus(); }, 30);
    });
  }
  window.bpDateiWahl = dateiWahl;
})();
