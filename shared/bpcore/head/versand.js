/* Versand – gemeinsamer Dialog für alles, was rausgeht (Rüge, Planversand, Plotauftrag, Abnahme …): /bp/versand.js, lädt head.js von selbst.
   Immer gleich aufgebaut: Was → An wen → Wie → Nachricht → Optionen; unten fest Abbrechen · PDF ansehen · Senden.
   Am Handy Vollbild in einer Spalte. Nichts geht automatisch raus.

   BPHead.versand({
     titel,                                   Überschrift („Pläne versenden“)
     was: [{ icon, name, sub, pdf, ohneUnterschrift }],   Dokumente; pdf = URL oder async () => Blob – dann „PDF ansehen“ mit ✍ Unterschreiben
                                              (ohneUnterschrift: nur ansehen – z. B. wenn der Server die Unterschrift selbst einsetzt)
     hinweis,                                 HTML unter „Was“ (z. B. Warnung)
     empfaenger: [{ name, sub, email, contact_id, on }],   als Chips; ohne E-Mail nicht wählbar
     einer,                                   true = genau ein Empfänger (Abnahme an die Firma)
     zusatz: true,                            weitere E-Mail-Adresse eintippen (Vorschläge aus den Adressen)
     wie: { werte: [[wert, text]…], wert, email },   Versandart; ohne = keine Auswahl
     kopie,                                   true/false = „Kopie an mich“ zeigen und vorbelegen; undefined = nicht zeigen
     betreff, text, textHilfe,                Nachricht (aufklappbar am Handy)
     vorlagen: true, projekt, frist,          „📋 Vorlage ▾“ und „als Vorlage speichern“ (Textvorlagen fürs ganze Büro, /api/bp/textvorlagen); {firma} {projekt} {frist} {ich}
     vorschau: async (empf, {betreff, text}) => ({ an, betreff, text }),   „Vorschau für …“ – so kommt die Mail bei dieser Empfänger:in an (persönliche Anrede, Platzhalter)
     optionen, optionenBind(box, neu),        eigenes HTML für Optionen; neu() aktualisiert Fuß und Knopf
     fuss(box),                               Text links unten (z. B. Größe der Anhänge)
     knopf(wie),                              Beschriftung des Hauptknopfs
     neu: 'plaene', mit                       optional: Leiste „＋ Neu“ oben (Art) und was mitgebracht wurde
     anhaenge: true                           weitere Dateien anhängen (vom Rechner wählen oder ins Fenster ziehen, höchstens 20 MB)
     dateien: [File],                         schon mitgebrachte Anhänge (z. B. aus der Leiste „＋ Neu“)
     vorlagenVerwalten: () => …               zeigt in der Vorlagenliste „Vorlagen verwalten …“
     senden: async (W, box) => …              W = { wie, an:[{name,email,contact_id}], kopie, betreff, text, signiert:[Blob|null], anhaenge:[{name, mime, daten (Base64)}] } – Fehler werfen = Dialog bleibt offen
   }) → Promise (true = gesendet, false = abgebrochen)

   BPHead.unterlagenSenden({                  der kurze Weg für jede App: Unterlagen als Mail mit Anhang – gesendet und im Verlauf abgelegt vom Kern (/api/bp/versand)
     titel, art, pid, projekt,                art = Schlüssel aus bpcore/versand.py (auftrag, bauantrag, honorarangebot …)
     was: [{ icon, name, sub, pdf, datei, ohneUnterschrift }],   pdf = URL oder async () => Blob; datei = Dateiname im Anhang
     an: [{ name, sub, email, contact_id, on }],   Vorschlag; dazu kommen die Beteiligten des Projekts (nicht angehakt)
     betreff, text, link, hinweis, danach(antwort, W),
     einzeln: true,                           „einzeln senden“ vorbelegt: je Empfänger:in eine eigene Mail, niemand sieht die anderen
     neu, mit, dateien, kopie, textHilfe      wie bei BPHead.versand (Leiste „＋ Neu“, mitgebrachte Dateien)
   }) → Promise (true = gesendet)

   window.bpMailStandard = (eintrag) => ({ art, pid, projekt, an })   setzt eine App einmal: Vorgaben, wenn ein Eintrag keine eigenen (mail) mitbringt
   Ein fertiges PDF verschicken geht überall gleich: im Ansehen-Fenster (BPHead.ansehen, Eintrag { …, mail: { art, pid, projekt, an, betreff, text } })
   unter ⋯ → „Per Mail senden“ und auf der Druckseite (bpDruck({ …, mail: { … } })) über „✉ Senden“ – beide über BPHead.mailVorgabe. */
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
.bpv-anh{display:inline-block;margin-top:.35rem;color:var(--y,#d4357f);font-weight:600;font-size:.88rem;cursor:pointer}.bpv-anh small{color:var(--mute,#666);font-weight:400}
.bpv-c{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center}
.bpv-c .bph-skw small{color:var(--mute,#666);font-size:.78rem}.bpv-c .bph-skw.aus{opacity:.5;cursor:not-allowed}
.bpv-neu{display:flex;gap:.4rem;margin-top:.45rem}.bpv-neu input{flex:1;min-width:0;font:inherit;color:var(--ink,#222);background:var(--inp,#fff);border:1px dashed var(--line,#ccc);border-radius:calc(999px*var(--rkp,1));padding:.3rem .75rem}
.bpv-f{display:grid;gap:.4rem}.bpv-f input,.bpv-f textarea{font:inherit;color:var(--ink,#222);background:var(--inp,#fff);border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));padding:.45rem .6rem;width:100%;box-sizing:border-box}
.bpv-f textarea{min-height:7rem;resize:vertical}.bpv-h{color:var(--mute,#666);font-size:.8rem;margin:.1rem 0 0}
.bpv-o{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;font-size:.92rem}.bpv-o label{display:flex;gap:.35rem;align-items:center}
.bpv-u{display:flex;gap:.5rem;align-items:center;padding:.7rem 1rem;border-top:1px solid var(--line,#ddd)}.bpv-u .f{flex:1;color:var(--mute,#666);font-size:.8rem;min-width:0}
.bpv-u button{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--ink,#222);border-radius:calc(10px*var(--rk,1));padding:.5rem .95rem;font:inherit;cursor:pointer;white-space:nowrap}
.bpv-u button.pri{background:var(--y,#d4357f);border-color:var(--y,#d4357f);color:var(--on,#fff);font-weight:600}.bpv-u button:disabled{opacity:.6}
.bpv-vl{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;position:relative}.bpv-vl button,.bpv-vsz button{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:var(--y,#d4357f);border-radius:calc(8px*var(--rk,1));padding:.25rem .6rem;font:inherit;font-size:.86rem;cursor:pointer}
.bpv-vll{flex-basis:100%;border:1px solid var(--line,#ccc);border-radius:calc(10px*var(--rk,1));max-height:13rem;overflow:auto;background:var(--card,#fff)}.bpv-vll button{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line,#ddd);border-radius:0;color:var(--ink,#222);padding:.4rem .6rem}.bpv-vll button small{display:block;color:var(--mute,#666);font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bpv-vsz{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;color:var(--mute,#666);font-size:.86rem}.bpv-vsz select{font:inherit;font-size:.86rem;max-width:16rem;border:1px solid var(--line,#ccc);border-radius:calc(8px*var(--rk,1));background:var(--inp,#fff);color:var(--ink,#222);padding:.2rem .4rem}
.bpv-vsb{border:1px solid var(--line,#ccc);border-radius:calc(10px*var(--rk,1));padding:.5rem .7rem;background:var(--hov,rgba(0,0,0,.03));font-size:.9rem;white-space:pre-wrap;max-height:14rem;overflow:auto}.bpv-vsb b{display:block;white-space:normal}
.bpv details summary{cursor:pointer;color:var(--mute,#666);font-size:.88rem;padding-top:.35rem}
@media (max-width:640px){.bpv-bg{padding:0}.bpv{width:100%;height:100%;max-height:none;border-radius:0}
  .bpv-k{padding-top:calc(.8rem + env(safe-area-inset-top,0px))}.bpv-a{grid-template-columns:minmax(0,1fr);gap:.35rem}.bpv-a>b{padding-top:0}
  .bpv-a .bph-seg{display:grid;width:100%;border-radius:calc(12px*var(--rk,1))}.bpv-a .bph-seg button{border-radius:calc(10px*var(--rk,1))}
  .bpv-u{flex-wrap:wrap;padding-bottom:calc(.8rem + env(safe-area-inset-bottom,0px))}.bpv-u .f{flex-basis:100%;text-align:center}.bpv-u button{flex:1;padding:.7rem .5rem}.bpv-u .nh{display:none}}`;
  document.head.appendChild(css);

  function versand(o) {
    return new Promise((fertig) => {
      const E = (o.empfaenger || []).map((x) => ({ ...x, on: !!(x.on && x.email) })), SIG = (o.was || []).map(() => null), ANH = [...(o.dateien || [])];   // dateien: schon mitgebrachte Anhänge (File)
      let wie = o.wie ? (o.wie.wert || o.wie.werte[0][0]) : '';
      const bg = document.createElement('div'); bg.className = 'bpv-bg';
      const pdfDa = (o.was || []).some((d) => d.pdf);
      bg.innerHTML = `<div class="bpv" role="dialog" aria-label="${esc(o.titel)}"><div class="bpv-k"><h3>${esc(o.titel)}</h3><button type="button" class="bpv-x" data-v="x" aria-label="Schließen">✕</button></div>
        <div class="bpv-b">${o.neu && window.BPHead && BPHead.neuLeiste ? BPHead.neuLeiste(o.neu) + (BPHead.neuMitHtml ? BPHead.neuMitHtml(o.mit) : '') : ''}
          ${(o.was || []).length ? `<div class="bpv-a"><b>Was</b><div style="display:grid;gap:.35rem">${o.was.map((d, k) => `<div class="bpv-d"><span class="i">${d.icon || '📄'}</span><span class="t">${esc(d.name)}${d.sub ? `<small>${esc(d.sub)}</small>` : ''}</span>${d.pdf ? `<button type="button" data-v="pdf" data-k="${k}">${d.ohneUnterschrift ? '📄 ansehen' : '✍ ansehen & unterschreiben'}</button>` : ''}</div>`).join('')}${o.hinweis || ''}</div></div>` : ''}
          ${o.anhaenge ? `<div class="bpv-a"><b>Anhänge</b><div><div style="display:grid;gap:.35rem" data-anh></div><label class="bpv-anh"><input type="file" multiple data-anhf hidden>＋ Datei anhängen … <small>(oder hierher ziehen)</small></label></div></div>` : ''}
          <div class="bpv-a" data-teil="an"><b>An wen</b><div><div class="bpv-c" data-chips></div>${o.zusatz === false ? '' : `<div class="bpv-neu"><input type="email" data-neu placeholder="＋ weitere E-Mail-Adresse oder Name aus den Adressen …" list="bpvL" inputmode="email" autocomplete="off"><datalist id="bpvL"></datalist></div>`}</div></div>
          ${o.wie ? `<div class="bpv-a"><b>Wie</b><div><div class="bph-seg" role="radiogroup">${o.wie.werte.map(([v, l]) => `<button type="button" role="radio" data-wie="${v}">${esc(l)}</button>`).join('')}</div><p class="bpv-h" data-wh></p></div></div>` : ''}
          ${o.betreff != null || o.text != null ? `<div class="bpv-a" data-teil="msg"><b>Nachricht</b><div class="bpv-f">${o.vorlagen ? '<div class="bpv-vl"><button type="button" data-v="vl" title="Text aus einer Vorlage einsetzen – {firma}, {projekt}, {frist}, {ich} werden ersetzt">📋 Vorlage ▾</button><button type="button" data-v="vls" title="Betreff und Text als Vorlage fürs ganze Büro speichern">als Vorlage speichern</button><div class="bpv-vll" data-vll hidden></div></div>' : ''}${o.betreff != null ? `<input data-betreff value="${esc(o.betreff)}" aria-label="Betreff">` : ''}${o.text != null ? `<textarea data-text aria-label="Text">${esc(o.text)}</textarea>` : ''}${o.textHilfe ? `<p class="bpv-h">${o.textHilfe}</p>` : ''}${o.vorschau ? '<div class="bpv-vsz"><span>Vorschau für</span><select data-vsf aria-label="Vorschau für Empfänger:in"></select><button type="button" data-v="vs">ansehen</button></div><div class="bpv-vsb" data-vsb hidden></div>' : ''}</div></div>` : ''}
          ${o.optionen || o.kopie !== undefined ? `<div class="bpv-a"><b>Optionen</b><div class="bpv-o">${o.optionen || ''}${o.kopie !== undefined ? `<label data-kopie-w><input type="checkbox" data-kopie${o.kopie ? ' checked' : ''}> Kopie an mich</label>` : ''}</div></div>` : ''}
        </div>
        <div class="bpv-u"><span class="f" data-fuss></span><button type="button" data-v="x">Abbrechen</button>${pdfDa ? '<button type="button" data-v="pdf" data-k="0">📄 PDF<span class="nh"> ansehen</span></button>' : ''}<button type="button" class="pri" data-v="ok"></button></div></div>`;
      document.body.appendChild(bg);
      const $ = (s) => bg.querySelector(s);
      const chips = () => { $('[data-chips]').innerHTML = E.map((x, k) => `<label class="bph-skw${x.email ? '' : ' aus'}" title="${esc(x.email || 'keine E-Mail-Adresse hinterlegt')}"><input type="${o.einer ? 'radio' : 'checkbox'}" name="bpvE" data-e="${k}"${x.on ? ' checked' : ''}${x.email ? '' : ' disabled'}>${esc(x.name || x.email)}${x.sub ? ` <small>${esc(x.sub)}</small>` : ''}</label>`).join('') || '<span class="bpv-h">Noch keine Empfänger:innen – unten eine Adresse eintragen.</span>'; vsWahl(); };
      const vsWahl = () => { const sel = $('[data-vsf]'); if (!sel) return; const alt = sel.value, L = E.map((x, k) => [x, k]).filter(([x]) => x.on && x.email);
        sel.innerHTML = L.map(([x, k]) => `<option value="${k}">${esc(x.name || x.email)}</option>`).join('') || '<option value="">– erst Empfänger:in wählen –</option>'; if (L.some(([, k]) => String(k) === alt)) sel.value = alt; const vb = $('[data-vsb]'); if (vb) vb.hidden = true; };
      /* Textvorlagen fürs ganze Büro – in jedem Versand gleich */
      let VL = null;
      const vlHolen = async () => { if (!VL) VL = (await fetch('api/bp/textvorlagen', { credentials: 'same-origin' }).then((r) => r.json())).vorlagen || []; return VL; };
      const vlFuellen = (t) => { const an = E.find((x) => x.on && x.email) || {}, pj = o.projekt || ((window.BPHead && BPHead.projekt) || {}).name || '', me = (H && H.me) || {};
        const frist = o.frist || new Date(Date.now() + 7 * 864e5).toLocaleDateString('de-DE');
        return String(t || '').replace(/\{firma\}/g, an.name || an.email || '').replace(/\{projekt\}/g, pj).replace(/\{frist\}/g, frist).replace(/\{ich\}/g, [me.vorname, me.nachname].filter(Boolean).join(' ') || me.full_name || me.name || ''); };
      const neu = () => {
        bg.querySelectorAll('[data-wie]').forEach((b) => { const on = b.dataset.wie === wie; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        const wh = $('[data-wh]'); if (wh) wh.textContent = wie === 'mich' ? `Kommt an dich${o.wie.email ? ' (' + o.wie.email + ')' : ''} – zum Weiterleiten aus deinem Postfach.` : wie === 'pdf' ? 'Nur das PDF – nichts wird verschickt.' : 'Eine E-Mail je Empfänger:in.';
        const an = $('[data-teil="an"]'); if (an) an.hidden = wie === 'pdf' || wie === 'mich';
        const kw = $('[data-kopie-w]'); if (kw) kw.hidden = wie === 'pdf' || wie === 'mich';
        const msg = $('[data-teil="msg"]'); if (msg) msg.hidden = wie === 'pdf';
        $('[data-v="ok"]').textContent = o.knopf ? o.knopf(wie) : wie === 'pdf' ? 'PDF erstellen' : 'Senden';
        $('[data-fuss]').innerHTML = o.fuss ? o.fuss(bg) : 'Nichts geht automatisch raus · steht danach in der Kommunikation';
      };
      const MB = (n) => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
      const anhZeigen = () => { const z = $('[data-anh]'); if (!z) return;
        z.innerHTML = ANH.map((f, k) => `<div class="bpv-d"><span class="i">📎</span><span class="t">${esc(f.name)}<small>${MB(f.size)}</small></span><button type="button" data-anhweg="${k}">entfernen</button></div>`).join(''); };
      const anhDazu = (files) => { for (const f of files) { if (ANH.reduce((s, x) => s + x.size, 0) + f.size > 20 * 1048576) { if (window.toast) toast('Zusammen höchstens 20 MB – viele Mailserver nehmen mehr nicht an.', true); break; } ANH.push(f); } anhZeigen(); };
      chips(); neu(); anhZeigen(); if (o.optionenBind) o.optionenBind(bg, neu);
      if (o.anhaenge) {
        bg.addEventListener('change', (e) => { if (e.target.matches('[data-anhf]')) { anhDazu([...e.target.files]); e.target.value = ''; } });
        bg.addEventListener('dragover', (e) => { if ([...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
        bg.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); e.stopPropagation(); anhDazu([...e.dataTransfer.files]); });
      }
      const b64 = (f) => new Promise((ok, nein) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = nein; r.readAsDataURL(f); });
      const zu = (v) => { bg.remove(); fertig(v); };
      if (o.neu && window.BPHead) {   // Leiste „＋ Neu“: beim Wechseln Empfänger, Betreff und Text mitgeben
        BPHead.neuDaten = () => { const an = E.filter((x) => x.on && x.email).map((x) => ({ name: x.name, email: x.email, contact_id: x.contact_id }));
          return { an, firma: (an[0] || {}).name || '', contact_id: (an[0] || {}).contact_id || null, betreff: (bg.querySelector('[data-betreff]') || {}).value || '', text: (bg.querySelector('[data-text]') || {}).value || '' }; };
        BPHead.neuSchliessen = () => zu(false);
      }
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
      bg.addEventListener('change', (e) => { const c = e.target.closest('[data-e]'); if (c) { if (o.einer) E.forEach((x) => { x.on = false; }); E[+c.dataset.e].on = c.checked; vsWahl(); } neu(); });
      bg.addEventListener('click', async (e) => {
        const w = e.target.closest('[data-wie]'); if (w) { wie = w.dataset.wie; neu(); return; }
        const aw = e.target.closest('[data-anhweg]'); if (aw) { ANH.splice(+aw.dataset.anhweg, 1); anhZeigen(); return; }
        const vp = e.target.closest('[data-vlp]');
        if (vp) { const v = (VL || []).find((x) => x.id === vp.dataset.vlp), be = $('[data-betreff]'), tx = $('[data-text]'); $('[data-vll]').hidden = true; if (!v || !tx) return;
          const alt = [be ? be.value : '', tx.value]; if (be && v.betreff) be.value = vlFuellen(v.betreff); tx.value = vlFuellen(v.text); tx.focus();
          if (window.rueckgaengig) rueckgaengig(`Vorlage „${v.name}“ eingesetzt`, () => { if (be) be.value = alt[0]; tx.value = alt[1]; });
          return; }
        const b = e.target.closest('[data-v]'); if (!b) return;
        if (b.dataset.v === 'x') { zu(false); return; }
        if (b.dataset.v === 'vl') { const box = $('[data-vll]'); if (!box.hidden) { box.hidden = true; return; }
          try { const L = await vlHolen(); box.innerHTML = L.map((v) => `<button type="button" data-vlp="${esc(v.id)}">${esc(v.name)}<small>${esc(String(v.text || '').replace(/\s+/g, ' ').slice(0, 90))}</small></button>`).join('') || '<p class="bpv-h" style="padding:.4rem .6rem">Noch keine Vorlagen – Text schreiben und „als Vorlage speichern“.</p>'; if (o.vorlagenVerwalten) box.innerHTML += '<button type="button" data-v="vlv">Vorlagen verwalten …<small>umbenennen, löschen</small></button>'; box.hidden = false; }
          catch { if (window.toast) toast('Die Vorlagen ließen sich nicht laden.', true); }
          return; }
        if (b.dataset.v === 'vlv') { $('[data-vll]').hidden = true; VL = null; o.vorlagenVerwalten(); return; }
        if (b.dataset.v === 'vls') { const be = (($('[data-betreff]') || {}).value || '').trim(), tx = (($('[data-text]') || {}).value || '').trim();
          if (!tx) { if (window.toast) toast('Erst einen Text schreiben.', true); return; }
          const pj = o.projekt || ((window.BPHead && BPHead.projekt) || {}).name || '', allg = (t) => (pj ? t.split(pj).join('{projekt}') : t), name = (be || tx.split('\n')[0]).slice(0, 60);
          try { const L = await vlHolen(), r = await fetch('api/bp/textvorlagen', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vorlagen: [...L, { id: 'v' + Date.now().toString(36), name, betreff: allg(be), text: allg(tx) }] }) });
            if (!r.ok) throw new Error(); VL = (await r.json()).vorlagen; if (window.toast) toast(`Als Vorlage „${name}“ gespeichert – der Projektname wird beim Einsetzen ersetzt.`); }
          catch { if (window.toast) toast('Die Vorlage ließ sich nicht speichern.', true); }
          return; }
        if (b.dataset.v === 'vs') { const x = E[+($('[data-vsf]') || {}).value], vb = $('[data-vsb]'); if (!x) { if (window.toast) toast('Erst eine:n Empfänger:in wählen.', true); return; }
          if (!vb.hidden && vb.dataset.fuer === x.email) { vb.hidden = true; return; }
          try { const r = await o.vorschau(x, { betreff: ($('[data-betreff]') || {}).value, text: ($('[data-text]') || {}).value });
            vb.innerHTML = `<b>An: ${esc(r.an || x.email)}</b><b>Betreff: ${esc(r.betreff || '')}</b>\n${esc(r.text || '')}`; vb.dataset.fuer = x.email; vb.hidden = false; }
          catch (er) { if (window.toast) toast(er.message || 'Die Vorschau ließ sich nicht erstellen.', true); }
          return; }
        if (b.dataset.v === 'pdf') {   // gemeinsame Vorschau – dort ✍ Unterschreiben; das unterschriebene PDF wird dann versendet
          const k = +b.dataset.k, d = o.was[k]; let url = d.pdf;
          try { if (typeof url === 'function') { const x = await url(); url = x instanceof Blob ? URL.createObjectURL(x) : x; } } catch (er) { if (window.toast) toast(er.message, true); return; }
          if (SIG[k]) url = URL.createObjectURL(SIG[k]);
          H.ansehen([{ url, name: d.name, typ: 'pdf', beiUnterschrift: d.ohneUnterschrift ? undefined : (blob) => { SIG[k] = blob; const z = bg.querySelectorAll('.bpv-d')[k]; const kb = z && z.querySelector('button'); if (kb) kb.outerHTML = '<span class="bpv-ok">✓ unterschrieben</span>'; } }]);
          return;
        }
        if (b.dataset.v !== 'ok') return;
        if (!hinzu()) { if (window.toast) toast('Bitte eine gültige E-Mail-Adresse.', true); return; }
        const an = E.filter((x) => x.on && x.email).map(({ name, email, contact_id }) => ({ name: name || '', email, contact_id }));
        if (wie !== 'pdf' && wie !== 'mich' && !an.length) { if (window.toast) toast('Bitte mindestens eine:n Empfänger:in wählen.', true); return; }
        if (wie === 'mich' && o.wie && !o.wie.email) { if (window.toast) toast('Für dein Konto ist keine E-Mail-Adresse hinterlegt (Mein Konto).', true); return; }
        const W = { wie, an, kopie: !!($('[data-kopie]') || {}).checked, betreff: ($('[data-betreff]') || {}).value, text: ($('[data-text]') || {}).value, signiert: SIG.slice(), anhaenge: [] };
        const alt = b.textContent; b.disabled = true; b.textContent = wie === 'pdf' ? 'wird erstellt …' : 'wird gesendet …';
        try { for (const f of ANH) W.anhaenge.push({ name: f.name, mime: f.type || 'application/octet-stream', daten: await b64(f) }); await o.senden(W, bg); zu(true); } catch (er) { b.disabled = false; b.textContent = alt; if (window.toast) toast(er.message || String(er), true); }
      });
    });
  }
  /* Der kurze Weg für jede App: Unterlagen (PDF aus einer Adresse oder Funktion) als Mail mit Anhang – der Kern sendet und legt im Verlauf ab */
  async function unterlagenSenden(o) {
    const E = (o.an || []).map((x) => ({ ...x, on: x.on !== false })), gleich = (a, b) => (a.contact_id && a.contact_id === b.id) || (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase());
    if (o.pid) { try { const B = await fetch('api/bp/versand/beteiligte?pid=' + encodeURIComponent(o.pid), { credentials: 'same-origin' }).then((r) => r.json());
      (Array.isArray(B) ? B : []).forEach((b) => { const da = E.find((x) => gleich(x, b));   // von der App nur mit Kontakt-Nr. genannt: Name und Adresse aus dem Projekt
        if (da) { da.name = da.name || b.name; da.email = da.email || b.email; da.sub = da.sub || b.gewerk || b.rolle || ''; }
        else E.push({ name: b.name, sub: b.gewerk || b.rolle || '', email: b.email, contact_id: b.id, on: false }); }); } catch { /* ohne Vorschläge */ } }
    for (const x of E) { if (x.email || !x.name) continue;   // nur ein Name (z. B. Auftraggeber:in): Adresse aus den Adressen, wenn der Name genau passt
      try { const L = await fetch('api/bp/mailadressen?q=' + encodeURIComponent(x.name), { credentials: 'same-origin' }).then((r) => r.json()), n = x.name.toLowerCase(), k = (Array.isArray(L) ? L : []).find((y) => { const m = (y.name || '').toLowerCase(); return m === n || m.startsWith(n + ' – '); }); if (k) x.email = k.email; } catch { /* bleibt ohne Adresse */ } }
    const datei = (d) => d.datei || (String(d.name || 'Unterlage').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 100) + '.pdf');
    return versand({ titel: o.titel, was: o.was || [], hinweis: o.hinweis, empfaenger: E, zusatz: true, kopie: o.kopie !== undefined ? o.kopie : true, betreff: o.betreff || '', text: o.text || '', vorlagen: true, projekt: o.projekt, anhaenge: true,
      neu: o.neu, mit: o.mit, dateien: o.dateien, textHilfe: o.textHilfe, vorlagenVerwalten: o.vorlagenVerwalten,
      optionen: `<label title="Jede:r bekommt eine eigene Mail – die Empfänger:innen sehen einander nicht"><input type="checkbox" data-einzeln${o.einzeln ? ' checked' : ''}> einzeln senden</label>`,
      fuss: () => ((o.was || []).length ? 'Geht als E-Mail mit Anhang raus' : 'Geht als E-Mail raus') + ' · steht danach in der Kommunikation',
      senden: async (W, box) => {
        const fd = new FormData(); fd.append('art', o.art || 'unterlagen'); if (o.pid) fd.append('pid', o.pid);
        fd.append('an', JSON.stringify(W.an)); fd.append('betreff', W.betreff || ''); fd.append('text', W.text || ''); fd.append('kopie', W.kopie ? '1' : ''); fd.append('link', o.link || ''); fd.append('einzeln', box.querySelector('[data-einzeln]').checked ? '1' : '');
        for (const [k, d] of (o.was || []).entries()) {
          let blob = W.signiert[k];
          if (!blob && d.pdf) { const x = typeof d.pdf === 'function' ? await d.pdf() : d.pdf;
            blob = x instanceof Blob ? x : await fetch(x, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(`„${d.name}“ ließ sich nicht erstellen.`); return r.blob(); }); }
          if (blob) fd.append('dateien', blob, datei(d));
        }
        for (const a of W.anhaenge) fd.append('dateien', await fetch(`data:${a.mime};base64,${a.daten}`).then((r) => r.blob()), a.name);
        const r = await fetch('api/bp/versand', { method: 'POST', body: fd, credentials: 'same-origin' }), j = await r.json().catch(() => null);
        if (!r.ok || !j) throw new Error((j && j.error) || (r.status === 413 ? 'Die Anhänge sind für den Webserver zu groß.' : 'Das Senden hat nicht geklappt.'));
        if (window.toast) toast(`Gesendet an ${W.an.map((x) => x.name || x.email).join(', ')}${j.weg === 'm365' ? ' – steht in Outlook unter „Gesendete Elemente“' : ''}.`);
        if (o.danach) o.danach(j, W);
      } });
  }
  /* Ein PDF verschicken – dieselben Vorgaben für das Ansehen-Fenster (⋯ → Per Mail senden) und die Druckseite (✉ Senden):
     { name, datei, pdf, art, pid, projekt, an, betreff, text, link } → Angaben für unterlagenSenden */
  const mailVorgabe = (m) => { const nm = String(m.name || 'Unterlage').replace(/\.pdf$/i, '');
    return { titel: `„${nm}“ per Mail senden`, art: m.art || 'unterlagen', pid: m.pid || null, projekt: m.projekt || '', link: m.link || '', an: m.an || [],
      was: [{ icon: '📄', name: nm, datei: m.datei || nm.replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 100) + '.pdf', pdf: m.pdf, ohneUnterschrift: true }],
      betreff: m.betreff || nm + (m.projekt ? ' – ' + m.projekt : ''), text: m.text || `Guten Tag,\n\nanbei erhalten Sie ${nm}${m.projekt ? ' zum Bauvorhaben ' + m.projekt : ''}.\n\nMit freundlichen Grüßen`, danach: m.danach, einzeln: m.einzeln }; };
  window.bpVersand = versand;
  if (H) { H.versand = versand; H.unterlagenSenden = unterlagenSenden; H.mailVorgabe = mailVorgabe; }
})();
