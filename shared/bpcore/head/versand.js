/* Versand – gemeinsamer Dialog für alles, was rausgeht (Rüge, Planversand, Plotauftrag, Abnahme …): /bp/versand.js, lädt head.js von selbst.
   Immer gleich aufgebaut: Was → An wen → Wie → Nachricht → Optionen; unten fest Abbrechen · PDF ansehen · Senden.
   Am Handy Vollbild in einer Spalte. Nichts geht automatisch raus.

   BPHead.versand({
     titel,                                   Überschrift („Pläne versenden“)
     was: [{ icon, name, sub, pdf }],         Dokumente; pdf = URL oder async () => Blob – dann „PDF ansehen“ mit ✍ Unterschreiben
     hinweis,                                 HTML unter „Was“ (z. B. Warnung)
     empfaenger: [{ name, sub, email, contact_id, on }],   als Chips; ohne E-Mail nicht wählbar
     einer,                                   true = genau ein Empfänger (Abnahme an die Firma)
     zusatz: true,                            weitere E-Mail-Adresse eintippen (Vorschläge aus den Adressen)
     wie: { werte: [[wert, text]…], wert, email },   Versandart; ohne = keine Auswahl
     kopie,                                   true/false = „Kopie an mich“ zeigen und vorbelegen; undefined = nicht zeigen
     betreff, text, textHilfe,                Nachricht (aufklappbar am Handy)
     optionen, optionenBind(box, neu),        eigenes HTML für Optionen; neu() aktualisiert Fuß und Knopf
     fuss(box),                               Text links unten (z. B. Größe der Anhänge)
     knopf(wie),                              Beschriftung des Hauptknopfs
     senden: async (W, box) => …              W = { wie, an:[{name,email,contact_id}], kopie, betreff, text, signiert:[Blob|null] } – Fehler werfen = Dialog bleibt offen
   }) → Promise (true = gesendet, false = abgebrochen) */
(() => {
  if (window.bpVersand) return;
  const H = window.BPHead, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MAIL = /^[^@\s<>,;]+@[^@\s<>,;]+\.[A-Za-z]{2,}$/;
  const css = document.createElement('style');
  css.textContent = `.bpv-bg{position:fixed;inset:0;z-index:3000;background:rgba(15,15,20,.45);display:grid;place-items:center;padding:16px}
.bpv{background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(16px*var(--rk,1));box-shadow:var(--sh0,0 20px 50px rgba(0,0,0,.3));width:min(760px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden}
.bpv-k{display:flex;align-items:center;gap:.6rem;padding:.8rem 1rem;border-bottom:1px solid var(--line,#ddd)}.bpv-k h3{margin:0;font-size:1.05rem;flex:1}
.bpv-x{border:0;background:none;color:var(--mute,#666);font-size:1.15rem;cursor:pointer;padding:.2rem .4rem}
.bpv-b{flex:1;min-height:0;overflow:auto;padding:.3rem 1rem .8rem}
.bpv-a{display:grid;grid-template-columns:7rem minmax(0,1fr);gap:.6rem;padding:.65rem 0;border-bottom:1px solid var(--line,#ddd);align-items:start}.bpv-a:last-child{border-bottom:0}
.bpv-a>b{font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mute,#666);padding-top:.4rem;font-weight:600}
.bpv-d{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;border:1px solid var(--line,#ddd);border-radius:calc(10px*var(--rk,1));padding:.45rem .6rem;background:var(--hov,rgba(0,0,0,.03))}
.bpv-d .i{font-size:1.15rem}.bpv-d .t{flex:1;min-width:0}.bpv-d small{display:block;color:var(--mute,#666);font-size:.8rem}
.bpv-d button{border:0;background:none;color:var(--y,#d4357f);font:inherit;font-weight:600;font-size:.85rem;cursor:pointer;padding:0;white-space:nowrap}.bpv-ok{color:var(--ok,#1e8a4c);font-weight:600;font-size:.82rem}
.bpv-c{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}
.bpv-c .bph-skc small{color:var(--mute,#666);font-size:.78rem}.bpv-c .bph-skc.aus{opacity:.5;cursor:not-allowed}
.bpv-neu{display:flex;gap:.4rem;margin-top:.45rem}.bpv-neu input{flex:1;min-width:0;font:inherit;color:var(--ink,#222);background:var(--inp,#fff);border:1px dashed var(--line,#ccc);border-radius:calc(999px*var(--rkp,1));padding:.3rem .75rem}
.bpv-f{display:grid;gap:.4rem}.bpv-f input,.bpv-f textarea{font:inherit;color:var(--ink,#222);background:var(--inp,#fff);border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));padding:.45rem .6rem;width:100%;box-sizing:border-box}
.bpv-f textarea{min-height:7rem;resize:vertical}.bpv-h{color:var(--mute,#666);font-size:.8rem;margin:.1rem 0 0}
.bpv-o{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;font-size:.92rem}.bpv-o label{display:flex;gap:.35rem;align-items:center}
.bpv-u{display:flex;gap:.5rem;align-items:center;padding:.7rem 1rem;border-top:1px solid var(--line,#ddd)}.bpv-u .f{flex:1;color:var(--mute,#666);font-size:.8rem;min-width:0}
.bpv-u button{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(10px*var(--rk,1));padding:.5rem .95rem;font:inherit;cursor:pointer;white-space:nowrap}
.bpv-u button.pri{background:var(--y,#d4357f);border-color:var(--y,#d4357f);color:var(--on,#fff);font-weight:600}.bpv-u button:disabled{opacity:.6}
.bpv details summary{cursor:pointer;color:var(--mute,#666);font-size:.88rem;padding-top:.35rem}
@media (max-width:640px){.bpv-bg{padding:0}.bpv{width:100%;height:100%;max-height:none;border-radius:0}
  .bpv-k{padding-top:calc(.8rem + env(safe-area-inset-top,0px))}.bpv-a{grid-template-columns:minmax(0,1fr);gap:.35rem}.bpv-a>b{padding-top:0}
  .bpv-a .bph-seg{display:grid;width:100%;border-radius:calc(12px*var(--rk,1))}.bpv-a .bph-seg button{border-radius:calc(10px*var(--rk,1))}
  .bpv-u{flex-wrap:wrap;padding-bottom:calc(.8rem + env(safe-area-inset-bottom,0px))}.bpv-u .f{flex-basis:100%;text-align:center}.bpv-u button{flex:1;padding:.7rem .5rem}.bpv-u .nh{display:none}}`;
  document.head.appendChild(css);

  function versand(o) {
    return new Promise((fertig) => {
      const E = (o.empfaenger || []).map((x) => ({ ...x, on: !!(x.on && x.email) })), SIG = (o.was || []).map(() => null);
      let wie = o.wie ? (o.wie.wert || o.wie.werte[0][0]) : '';
      const bg = document.createElement('div'); bg.className = 'bpv-bg';
      const pdfDa = (o.was || []).some((d) => d.pdf);
      bg.innerHTML = `<div class="bpv" role="dialog" aria-label="${esc(o.titel)}"><div class="bpv-k"><h3>${esc(o.titel)}</h3><button type="button" class="bpv-x" data-v="x" aria-label="Schließen">✕</button></div>
        <div class="bpv-b">
          ${(o.was || []).length ? `<div class="bpv-a"><b>Was</b><div style="display:grid;gap:.35rem">${o.was.map((d, k) => `<div class="bpv-d"><span class="i">${d.icon || '📄'}</span><span class="t">${esc(d.name)}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</span>${d.pdf ? `<button type="button" data-v="pdf" data-k="${k}">✍ ansehen & unterschreiben</button>` : ''}</div>`).join('')}${o.hinweis || ''}</div></div>` : ''}
          <div class="bpv-a" data-teil="an"><b>An wen</b><div><div class="bpv-c" data-chips></div>${o.zusatz === false ? '' : `<div class="bpv-neu"><input type="email" data-neu placeholder="＋ weitere E-Mail-Adresse oder Name aus den Adressen …" list="bpvL" inputmode="email" autocomplete="off"><datalist id="bpvL"></datalist></div>`}</div></div>
          ${o.wie ? `<div class="bpv-a"><b>Wie</b><div><div class="bph-seg" role="radiogroup">${o.wie.werte.map(([v, l]) => `<button type="button" role="radio" data-wie="${v}">${esc(l)}</button>`).join('')}</div><p class="bpv-h" data-wh></p></div></div>` : ''}
          ${o.betreff != null || o.text != null ? `<div class="bpv-a" data-teil="msg"><b>Nachricht</b><div class="bpv-f">${o.betreff != null ? `<input data-betreff value="${esc(o.betreff)}" aria-label="Betreff">` : ''}${o.text != null ? `<textarea data-text aria-label="Text">${esc(o.text)}</textarea>` : ''}${o.textHilfe ? `<p class="bpv-h">${o.textHilfe}</p>` : ''}</div></div>` : ''}
          ${o.optionen || o.kopie !== undefined ? `<div class="bpv-a"><b>Optionen</b><div class="bpv-o">${o.optionen || ''}${o.kopie !== undefined ? `<label data-kopie-w><input type="checkbox" data-kopie${o.kopie ? ' checked' : ''}> Kopie an mich</label>` : ''}</div></div>` : ''}
        </div>
        <div class="bpv-u"><span class="f" data-fuss></span><button type="button" data-v="x">Abbrechen</button>${pdfDa ? '<button type="button" data-v="pdf" data-k="0">📄 PDF<span class="nh"> ansehen</span></button>' : ''}<button type="button" class="pri" data-v="ok"></button></div></div>`;
      document.body.appendChild(bg);
      const $ = (s) => bg.querySelector(s);
      const chips = () => { $('[data-chips]').innerHTML = E.map((x, k) => `<label class="bph-skc${x.email ? '' : ' aus'}" title="${esc(x.email || 'keine E-Mail-Adresse hinterlegt')}"><input type="${o.einer ? 'radio' : 'checkbox'}" name="bpvE" data-e="${k}"${x.on ? ' checked' : ''}${x.email ? '' : ' disabled'}>${esc(x.name || x.email)}${x.sub ? ` <small>${esc(x.sub)}</small>` : ''}</label>`).join('') || '<span class="bpv-h">Noch keine Empfänger – unten eine Adresse eintragen.</span>'; };
      const neu = () => {
        bg.querySelectorAll('[data-wie]').forEach((b) => { const on = b.dataset.wie === wie; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        const wh = $('[data-wh]'); if (wh) wh.textContent = wie === 'mich' ? `Kommt an dich${o.wie.email ? ' (' + o.wie.email + ')' : ''} – zum Weiterleiten aus deinem Postfach.` : wie === 'pdf' ? 'Nur das PDF – nichts wird verschickt.' : 'Eine E-Mail je Empfänger.';
        const an = $('[data-teil="an"]'); if (an) an.hidden = wie === 'pdf' || wie === 'mich';
        const kw = $('[data-kopie-w]'); if (kw) kw.hidden = wie === 'pdf' || wie === 'mich';
        const msg = $('[data-teil="msg"]'); if (msg) msg.hidden = wie === 'pdf';
        $('[data-v="ok"]').textContent = o.knopf ? o.knopf(wie) : wie === 'pdf' ? 'PDF erstellen' : 'Senden';
        $('[data-fuss]').innerHTML = o.fuss ? o.fuss(bg) : 'Nichts geht automatisch raus · steht danach in der Kommunikation';
      };
      chips(); neu(); if (o.optionenBind) o.optionenBind(bg, neu);
      const zu = (v) => { bg.remove(); fertig(v); };
      const hinzu = () => { const i = $('[data-neu]'); if (!i) return true; const v = i.value.trim(); if (!v) return true; if (!MAIL.test(v)) return false;
        const da = E.find((x) => (x.email || '').toLowerCase() === v.toLowerCase());
        if (da) da.on = true; else { if (o.einer) E.forEach((x) => { x.on = false; }); E.push({ name: '', email: v, on: true }); }
        i.value = ''; chips(); return true; };
      const ni = $('[data-neu]');
      if (ni) {
        let t = 0;
        ni.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!hinzu() && window.toast) toast('Bitte eine gültige E-Mail-Adresse.', true); } });
        ni.addEventListener('input', () => { const v = ni.value.trim(); if (MAIL.test(v) && [...bg.querySelectorAll('#bpvL option')].some((x) => x.value === v)) { hinzu(); return; }
          clearTimeout(t); if (v.length < 2) return;
          t = setTimeout(async () => { try { const L = await fetch('api/bp/mailadressen?q=' + encodeURIComponent(v), { credentials: 'same-origin' }).then((r) => r.json()); $('#bpvL').innerHTML = L.map((x) => `<option value="${esc(x.email)}">${esc(x.name)}</option>`).join(''); } catch { /* ohne Vorschläge */ } }, 200); });
      }
      bg.addEventListener('change', (e) => { const c = e.target.closest('[data-e]'); if (c) { if (o.einer) E.forEach((x) => { x.on = false; }); E[+c.dataset.e].on = c.checked; } neu(); });
      bg.addEventListener('click', async (e) => {
        const w = e.target.closest('[data-wie]'); if (w) { wie = w.dataset.wie; neu(); return; }
        const b = e.target.closest('[data-v]'); if (!b) return;
        if (b.dataset.v === 'x') { zu(false); return; }
        if (b.dataset.v === 'pdf') {   // gemeinsame Vorschau – dort ✍ Unterschreiben; das unterschriebene PDF wird dann versendet
          const k = +b.dataset.k, d = o.was[k]; let url = d.pdf;
          try { if (typeof url === 'function') { const x = await url(); url = x instanceof Blob ? URL.createObjectURL(x) : x; } } catch (er) { if (window.toast) toast(er.message, true); return; }
          if (SIG[k]) url = URL.createObjectURL(SIG[k]);
          H.ansehen([{ url, name: d.name, typ: 'pdf', beiUnterschrift: (blob) => { SIG[k] = blob; const z = bg.querySelectorAll('.bpv-d')[k]; const kb = z && z.querySelector('button'); if (kb) kb.outerHTML = '<span class="bpv-ok">✓ unterschrieben</span>'; } }]);
          return;
        }
        if (b.dataset.v !== 'ok') return;
        if (!hinzu()) { if (window.toast) toast('Bitte eine gültige E-Mail-Adresse.', true); return; }
        const an = E.filter((x) => x.on && x.email).map(({ name, email, contact_id }) => ({ name: name || '', email, contact_id }));
        if (wie !== 'pdf' && wie !== 'mich' && !an.length) { if (window.toast) toast('Bitte mindestens einen Empfänger wählen.', true); return; }
        if (wie === 'mich' && o.wie && !o.wie.email) { if (window.toast) toast('Für dein Konto ist keine E-Mail-Adresse hinterlegt (Mein Konto).', true); return; }
        const W = { wie, an, kopie: !!($('[data-kopie]') || {}).checked, betreff: ($('[data-betreff]') || {}).value, text: ($('[data-text]') || {}).value, signiert: SIG.slice() };
        const alt = b.textContent; b.disabled = true; b.textContent = wie === 'pdf' ? 'wird erstellt …' : 'wird gesendet …';
        try { await o.senden(W, bg); zu(true); } catch (er) { b.disabled = false; b.textContent = alt; if (window.toast) toast(er.message || String(er), true); }
      });
    });
  }
  window.bpVersand = versand;
  if (H) H.versand = versand;
})();
