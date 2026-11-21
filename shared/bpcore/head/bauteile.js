/* Bauteil-Checkliste – derselbe Baustein in jeder App (Entwurf „Bauteil-Checkliste“, entschieden am 16.11.2026).
   Liest das Gebäudemodell (IFC, z. B. Allplan) und fragt je Gruppe gleicher Bauteile: was passiert damit, wird es berechnet, welcher Aufbau
   aus dem Bauteil-Baukasten. Dazu feste Fragen für das, was nicht im Modell steht. Die Antworten stehen im Projektmodell (Kern:
   bpcore/bauteilliste.py, /api/bp/modell/<pid>/bauteile/…) – Kosten, Ausschreibung und Termine nehmen sie über ihre Linie.
   „IFC mit Maßnahmen ausgeben“ schreibt Nummern, Status, Maßnahme und Aufbau ins IFC zurück.

   Planstände (GO 16.11.2026, Kern bpcore/planstand.py): Jeder eingelesene Plan ist ein Planstand im gemeinsamen Versionsmenü („★ gilt“,
   ansehen, umbenennen, archivieren, löschen). Einlesen nur im Gebäudemodell – vom Gerät oder aus „Pläne & Dateien“ – mit Abgleich
   (neu · geändert · entfällt) und Zuordnung per Klick; entfallene Zeilen mit Antwort bleiben, bis „Aufräumen“.

   bpBauteile.mount(el, pid, { einlesen }) – füllt ein Feld: groß im Gebäudemodell (einlesen: true), sonst Reiter „Bauteile“ im Bereich rechts
   (dort nur der Stand und der Sprung ins Gebäudemodell). Wird erst bei Bedarf geladen (seite.js), kostet beim Öffnen einer App nichts. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const zahl = (v) => (window.bpZahl ? bpZahl(v, 0, 2) : String(v).replace('.', ','));
  async function J(u, m, b) {
    const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b && !(b instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
      body: b ? (b instanceof FormData ? b : JSON.stringify(b)) : undefined });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); e.status = r.status; throw e; }
    return r;
  }
  const WORT = { offen: 'offen', bleibt: 'bleibt', instandsetzen: 'instandsetzen', erneuern: 'erneuern', neu: 'neu', abbruch: 'Abbruch', pruefen: 'prüfen lassen' };
  const WORT_FRAGE = { bleibt: 'nein, bleibt', erneuern: 'erneuern', neu: 'neu', pruefen: 'prüfen lassen' };
  const ROHG = [['grund', 'Gründung · Bodenplatte', '320', (z) => /^32/.test(z.kg || '')], ['aw', 'Außenwände', '330', (z) => /^33/.test(z.kg || '')],   // Rohbau nach Bauteilen (A1)
    ['iw', 'Innenwände', '340', (z) => /^34/.test(z.kg || '')], ['tr', 'Treppen', '350', (z) => /trepp/i.test(`${z.name} ${z.art}`)], ['de', 'Decken', '350', (z) => /^35/.test(z.kg || '')],
    ['da', 'Dach', '360', (z) => /^36/.test(z.kg || '')]];
  const BEREICH = [['rohbau', 'Rohbau'], ['oeffnung', 'Öffnungen – Fenster und Türen'], ['raum', 'Räume – Oberflächen'], ['ausbau', 'Küche und Bad'], ['frage', 'Nicht im Modell – bitte beantworten'], ['hand', 'Von Hand'], ['leistung', 'Leistungen ohne Bauteil']];
  const HAND = ['hand', 'leistung'];   // Name/Menge hier änderbar, entfernen möglich
  let KONTEXT = null; document.addEventListener('bph:kontext', (e) => { if (KONTEXT) KONTEXT(e); });
  const APPN = { kosten: 'Kosten', termine: 'Bauzeitenplan' };
  const KG2 = [['31', 'Baugrube'], ['32', 'Gründung'], ['33', 'Außenwände'], ['34', 'Innenwände'], ['35', 'Decken'], ['36', 'Dächer'], ['38', 'Einbauten'], ['39', 'Sonstiges KG 300'], ['41', 'Wasser'], ['42', 'Wärme'], ['43', 'Lüftung'], ['44', 'Elektro'], ['47', 'Nutzungsspezifisch']];
  const STIL = `.bt-l{display:flex;flex-direction:column;gap:.7rem;padding:.8rem .9rem 1.2rem;font-size:.9rem}
.bt-kopf{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center}.bt-kopf .bt-q{flex:1 1 14rem;font-size:.8rem;opacity:.7;min-width:0}
.bt-z{border-radius:1em;padding:0 .55em;font-size:.78rem;background:var(--line,#d5d9de)}.bt-z.rot{background:var(--red,#c62f2a);color:#fff}
.bt-b{border-top:1px solid var(--line,#d5d9de);padding-top:.5rem;display:flex;flex-direction:column;gap:.35rem}.bt-b>h4{margin:0 0 .1rem;font-size:.86rem;opacity:.8}
.bt-r{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.15rem .55rem;padding:.4rem .5rem;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));background:var(--card,transparent)}
.bt-r.offen{border-left:3px solid var(--red,#c62f2a)}
.bt-r input[type=checkbox]{margin-top:.2rem}
.bt-n{display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline}.bt-n b{font-weight:600}.bt-n i{font-style:normal;opacity:.7;font-size:.82rem}
.bt-nr{font-size:.76rem;opacity:.65}
.bt-st{grid-column:2;display:flex;flex-wrap:wrap;gap:.25rem}
.bt-st button,.bt-o button{font:inherit;font-size:.8rem;border:1px solid var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(99px*var(--rkp,1));padding:.05rem .6rem;cursor:pointer}
.bt-st button.on,.bt-o button.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3);font-weight:600}
.bt-a{grid-column:2;font-size:.82rem;display:flex;flex-wrap:wrap;gap:.2rem .5rem;align-items:baseline}.bt-a code{font-size:.78rem;opacity:.85}
.bt-a button{font:inherit;font-size:.8rem;background:none;border:0;color:var(--y,#2f6fb3);cursor:pointer;padding:0;text-decoration:underline}
.bt-h{grid-column:2;font-size:.78rem;opacity:.7}.bt-vlw{border-style:dashed!important;opacity:.85}.bt-weitere>summary{opacity:.75}.bt-weitere>.bt-blk{margin-left:.8rem}.bt-art{grid-column:2;font-size:.82rem;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.bt-e{grid-column:1/-1;border-top:1px dashed var(--line,#d5d9de);margin-top:.3rem;padding-top:.4rem;display:flex;flex-direction:column;gap:.35rem}
.bt-nm{font:inherit;font-weight:700;color:inherit;background:transparent;border:1px solid transparent;border-radius:calc(6px*var(--rk,1));padding:.05rem .3rem;margin-left:-.3rem;min-width:0;flex:1 1 9rem}.bt-nm:hover,.bt-nm:focus{border-color:var(--line)}
.bt-vbl{display:flex;gap:.25rem}.bt-vbl>.bt-bln{font-size:.78rem;opacity:.7;min-width:7rem;padding-top:.15rem}.bt-vbl>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:.2rem}   /* Vorlagen-Blöcke – nicht .bt-bl (Rahmen der Baumtabelle), sonst rutscht die Tabelle nach unten (19.11.2026) */
.bt-blk>summary{cursor:pointer;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em;opacity:.75;padding:.1rem 0}.bt-blk>summary small{opacity:.7;text-transform:none}.bt-blk>.bt-o{padding:.1rem 0 .3rem}
.bt-o{display:flex;flex-wrap:wrap;gap:.25rem;align-items:baseline}.bt-dkh{font-size:.72rem;opacity:.7;align-self:center}.bt-o .bph-pa{width:8rem}.bt-o>span{font-size:.78rem;opacity:.7;min-width:7rem}
.bt-leer{font-size:.88rem;line-height:1.5;opacity:.85}.bt-m{width:5.5rem;text-align:right;font:inherit;font-size:.85rem;padding:.05rem .3rem}
.bt-weg{font:inherit;font-size:.78rem;background:none;border:0;color:var(--red,#c62f2a);cursor:pointer;padding:0;text-decoration:underline}.bt-w{font-size:.82rem;opacity:.75}
.bt-r.weg{opacity:.6;border-style:dashed}.bt-r.weg b{text-decoration:line-through}.bt-chip{font-size:.74rem;border-radius:1em;padding:0 .5em;border:1px solid var(--line,#d5d9de)}
.bt-an{border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;font-size:.86rem}
.bt-an b{font-weight:600}.bt-an span{flex:1 1 14rem}.bt-ps{font-size:.84rem}.bt-ps a{color:var(--y,#2f6fb3)}
.bt-ab{width:min(860px,100%);display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.1rem;max-height:86vh;overflow:auto;font-size:.9rem}
.bt-ab h3{margin:0;font-size:1.05rem}.bt-ab h4{margin:.3rem 0 .2rem;font-size:.86rem}.bt-ab .bt-sp{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
.bt-ab .bt-li{display:flex;flex-direction:column;gap:.25rem}.bt-ab button.bt-i{font:inherit;font-size:.84rem;text-align:left;background:none;color:inherit;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));padding:.25rem .5rem;cursor:pointer}
.bt-ab button.bt-i.sel{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3)}.bt-ab button.bt-i.paar{background:var(--hov,rgba(47,111,179,.08))}
.bt-ab .bt-ft{display:flex;gap:.5rem;justify-content:flex-end;align-items:center;flex-wrap:wrap}.bt-ab .bt-ft label{flex:1;display:flex;gap:.4rem;align-items:center;min-width:14rem}.bt-ab .bt-ft input{flex:1;font:inherit;padding:.3rem .5rem}
.bt-rw{border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;display:flex;flex-direction:column;gap:.4rem;font-size:.86rem}
.bt-rw h4{margin:0;font-size:.88rem}.bt-rw .bt-rz{display:flex;flex-wrap:wrap;gap:.25rem .6rem;align-items:baseline;border-top:1px dashed var(--line,#d5d9de);padding-top:.3rem}
.bt-rw .bt-rz>span{flex:1 1 14rem;min-width:0}.bt-rw .bt-rk{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end}
.bt-ext{border-color:var(--red,#c62f2a);color:var(--red,#c62f2a)}
.bt-bl{display:flex;flex-direction:column;gap:.5rem;height:100%;min-height:0;font-size:.9rem}.bt-bw{flex:1;min-height:0;overflow:auto}
.bt-baum{width:100%}.bt-baum th{position:sticky;top:0;background:var(--bg,var(--card));z-index:1;text-align:left;font-size:.8rem;font-weight:600;opacity:.8;padding:.3rem .45rem}
.bt-baum td{padding:.28rem .45rem;border-top:1px solid var(--line,#d5d9de);vertical-align:middle}.bt-baum td.r,.bt-baum th.r{text-align:right;white-space:nowrap}.bt-baum td.c,.bt-baum th.c{text-align:center;width:2rem}
.bt-plus{border:0;background:none;color:var(--y,#3b5a8f);font:inherit;font-size:.8rem;font-weight:600;cursor:pointer;margin-left:.5rem;opacity:.75}.bt-plus:hover{opacity:1}.bt-start{padding:.35rem .5rem .35rem 1.6rem}.bt-gerust tr.bt-bh td{opacity:.95}.bt-baum tr[data-btz]{cursor:pointer}.bt-baum tr.akt{background:var(--hov,rgba(47,111,179,.08))}.bt-baum tr.bt-bh td{background:var(--card,transparent);padding-top:.5rem}
.bt-baum tr.weg{opacity:.55}.bt-baum th:first-child{min-width:13rem}.bt-kz{max-width:min(28rem,22vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.82rem;opacity:.85}.bt-ro{color:var(--red,#c62f2a)}
.bt-teile{display:flex;flex-wrap:wrap;gap:.3rem;align-items:center;margin:.3rem 0;font-size:.84rem}.bt-teile>span{opacity:.7;margin-right:.2rem}.bt-teile button{font:inherit;border:1px solid var(--line,#d5d9de);border-radius:999px;padding:.05rem .6rem;background:var(--card,#fff);color:inherit;cursor:pointer}.bt-teile button.on{background:var(--af,#3b5a8f);border-color:var(--af,#3b5a8f);color:#fff}
.bt-mwl{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;background:color-mix(in srgb,#7b2ff7 9%,var(--card,#fff));border:1px solid color-mix(in srgb,#7b2ff7 45%,transparent);border-radius:calc(8px*var(--rk,1));padding:.35rem .6rem;font-size:.86rem}
.bt-mwg{display:inline-flex;flex-wrap:wrap;gap:.25rem;align-items:center}.bt-mwl button:not(.btn),.bt-mwd .bt-o button{font:inherit;font-size:.82rem;border:1px solid var(--line,#d6dce3);background:var(--card,#fff);color:inherit;border-radius:12px;padding:.1rem .55rem;cursor:pointer}
.bt-mwl button.on,.bt-mwd .bt-o button.on{background:#7b2ff7;border-color:#7b2ff7;color:#fff}.bt-mwl select,.bt-mwd select{font:inherit;font-size:.84rem;max-width:22rem}.bt-mwv{color:#8a5a00;font-style:italic;font-size:.82rem}
.bt-mwb{display:inline-flex;gap:.3rem;align-items:center}.bt-mwt{margin:0;font-size:1rem}.bt-mwh{margin:0 .35rem 0 0;vertical-align:-2px}tr.bt-mwz>td{background:color-mix(in srgb,#7b2ff7 8%,transparent)}
.bt-rwl{display:flex;gap:.6rem;align-items:center;border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.3rem .6rem;font-size:.86rem}.bt-rwl span{flex:1}
.bt-el{width:100%;font-size:.82rem;border-collapse:collapse}.bt-el th{text-align:left;opacity:.7;font-weight:600}.bt-el td,.bt-el th{padding:.2rem .35rem;border-top:1px solid var(--line,#d5d9de)}.bt-el .r{text-align:right;white-space:nowrap}
.bt-rs{display:flex;flex-wrap:wrap;gap:.3rem .9rem;font-size:.8rem;opacity:.8;align-items:center}.bt-rs label{display:flex;gap:.3rem;align-items:center;cursor:pointer}
@media (max-width:640px){.bt-ab .bt-sp{grid-template-columns:1fr}}
.bt-ap{display:flex;gap:.5rem;align-items:flex-start;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.4rem .6rem;margin:.3rem 0;cursor:pointer}.bt-ap.on{border-color:var(--y,#3b5a8f);box-shadow:inset 0 0 0 1px var(--y,#3b5a8f)}
.bt-kzb{grid-column:1/-1;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.4rem .55rem;display:flex;flex-direction:column;gap:.3rem;font-size:.84rem}
.bt-kzb code{font-size:.8rem;background:var(--hov,rgba(0,0,0,.05));border-radius:4px;padding:0 .3rem}.bt-kzb table{border-collapse:collapse;font-size:.8rem}.bt-kzb td{padding:.1rem .45rem .1rem 0;vertical-align:top}.bt-kzb td:last-child{opacity:.7}
.bt-kzb .bt-kzk{display:flex;gap:.4rem;flex-wrap:wrap}.bt-chip.gelb{background:#fff4d6;border-color:#e7c27a}.bt-zl{display:flex;flex-direction:column;gap:.25rem;font-size:.86rem}.bt-zl li{margin:.1rem 0}
.bt-weg4{width:100%;text-align:left;font:inherit;color:inherit;background:var(--card,transparent)}.bt-weg4:hover,.bt-weg4:focus-visible{border-color:var(--y,#3b5a8f);box-shadow:inset 0 0 0 1px var(--y,#3b5a8f)}.bt-anf{width:min(520px,100%)}
.bt-hd{width:min(480px,100%)}.bt-hdl{display:flex;flex-direction:column;gap:.2rem;font-size:.86rem}.bt-hdl>span{opacity:.75}.bt-hdl input{font:inherit;padding:.3rem .5rem}.bt-hdz{display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-end}.bt-hdz .bt-m{width:7rem}
.bt-ehb{font:inherit;font-size:.85rem;border:1px solid var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(6px*var(--rk,1));padding:0 .4rem;cursor:pointer}.bt-baum tr.bt-erg td:first-child{box-shadow:inset 3px 0 0 #e0b100}
.bt-ap small{display:block;opacity:.7}.bt-lk{border:0;background:none;color:var(--y,#3b5a8f);font:inherit;cursor:pointer;padding:.2rem 0}.bt-vor{max-height:40vh;overflow:auto}.bt-vor input{max-width:100%}`;
  const stil = () => { if (document.getElementById('bt-stil')) return; const s = document.createElement('style'); s.id = 'bt-stil'; s.textContent = STIL; document.head.appendChild(s); };

  const tag = (s) => (window.bpTag ? bpTag(String(s || '').slice(0, 10)) : String(s || '').slice(0, 10));

  /* Bauteile aus der Planung (GO 17.11.2026 Y1/Z1): Räume, Fenster und Türen aus Fläche, Geschossen und Einheiten des Assistenten (Kern
     modell_hand.vorschlag) → Planstand „Assistent“ mit Bauteilen – wahlweise mit Vorschlagsmengen und Preisspanne aus den Baudaten (Aufbau
     nach der Bauweise). Derselbe Dialog im Reiter „Bauteile“, im Gebäudemodell (Standardbaum, Räume) und im letzten Schritt des Assistenten.
     → Promise<{ entwurf, erster, … } | null>; gilt schon ein Planstand, gibt der Aufrufer den Entwurf in den Abgleich (api.entwurf). */
  async function ausPlanung(pid, o = {}) {
    const B = (o.basis || '') + `api/bp/modell/${pid}`, gz = (v) => String(v ?? '').replace('.', ','), gn = (v) => parseFloat(String(v).replace(',', '.')) || 0;
    let v; try { v = await (await J(`${B}/hand/vorschlag`)).json(); } catch (e) { sag(e.message, true); return null; }
    const R = v.raeume.map((x) => ({ ...x, an: true })), E = v.elemente, W = { m: true, p: true, raeume: false };
    const anz = (nr) => { const L = E.filter((e) => e.raum === nr), f = L.filter((e) => /Fenster/.test(e.art)).length; return [f ? f + ' Fenster' : '', L.length > f ? (L.length - f) + (L.length - f > 1 ? ' Türen' : ' Tür') : ''].filter(Boolean).join(' · '); };
    const opt = (k, w, t, u) => `<label class="bt-ap${W[k] === w ? ' on' : ''}"><input type="radio" name="bta${k}" data-bta="${k}" data-w="${w ? 1 : 0}"${W[k] === w ? ' checked' : ''}><span><b>${t}</b><small>${u}</small></span></label>`;
    const html = () => `<div class="bt-ab"><h3>Bauteile aus der Planung anlegen</h3>
      <div class="mute">${v.quelle === 'planstand' ? 'Räume, Fenster und Türen aus dem gültigen Planstand' : 'Räume, Fenster und Türen aus Fläche, Geschossen und Einheiten des Assistenten'} – daraus wird der Planstand „Assistent“, wie ein eingelesener Plan; ein echter Plan ersetzt ihn später mit Abgleich.</div>
      <h4>Mengen</h4>${opt('m', true, 'Vorschlagsmengen', 'aus Fläche und Geschossen geschätzt – je Zeile überschreibbar')}${opt('m', false, 'ohne Mengen', 'nur die Bauteile – Mengen trägst du ein')}
      <h4>Preise</h4>${opt('p', true, 'Preisspanne aus den Baudaten', 'Aufbau nach der Bauweise aus dem Assistenten – eigene Datenbank, keine Suche im Netz')}${opt('p', false, 'ohne Preise', 'Aufbau wählst du später')}
      <div><button type="button" class="bt-lk" data-m="raeume">${bpKlapp(W.raeume)}Räume vorher ansehen (${R.filter((x) => x.an).length} von ${R.length})</button></div>
      ${W.raeume ? `<div class="bt-vor"><table class="bt-el"><thead><tr><th></th><th>Nr.</th><th>Raum</th><th>Geschoss</th><th class="r">Fläche m²</th><th>Fenster / Türen</th></tr></thead><tbody>${R.map((x, k) => `<tr><td><input type="checkbox" data-btan="${k}"${x.an ? ' checked' : ''} aria-label="${esc(x.nr)} übernehmen"></td><td>${esc(x.nr)}</td><td><input data-btrf="${k}:name" value="${esc(x.name)}" size="12"></td><td>${esc(x.geschoss)}</td><td class="r"><input data-btrf="${k}:flaeche" value="${gz(x.flaeche)}" size="5" inputmode="decimal"></td><td class="mute">${esc(anz(x.nr))}</td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="bt-ft"><span data-btam class="mute"></span><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Anlegen</button></div></div>`;
    const lies = (bg) => { bg.querySelectorAll('[data-btan]').forEach((c) => { R[+c.dataset.btan].an = c.checked; });
      bg.querySelectorAll('[data-btrf]').forEach((i) => { const [k, f] = i.dataset.btrf.split(':'); R[+k][f] = f === 'flaeche' ? gn(i.value) : i.value.trim() || R[+k][f]; }); };
    return new Promise((fertig) => {
      modalBox(html(), async (m, bg, close) => {
        if (m === 'x') { close(); return fertig(null); }
        if (m === 'raeume') { lies(bg); W.raeume = !W.raeume; bg.querySelector('.modal').innerHTML = html(); return; }
        if (m !== 'ok') return;
        lies(bg); const RR = R.filter((x) => x.an), nrs = new Set(RR.map((x) => x.nr));
        if (!RR.length) return sag('Bitte mindestens einen Raum wählen.', true);
        bg.querySelector('[data-btam]').textContent = 'Wird angelegt …'; bg.querySelectorAll('[data-m]').forEach((b) => { b.disabled = true; });
        try {
          const e = await (await J(`${B}/hand/entwurf`, 'POST', { raeume: RR, elemente: E.filter((x) => !x.raum || nrs.has(x.raum)), mengen: W.m, preise: W.p })).json();
          if (e.erster) await J(`${B}/planstand/${e.entwurf}/uebernehmen`, 'POST', { zuordnung: {}, name: e.name });
          close(); sag(e.erster ? `${e.zeilen} Bauteile aus ${RR.length} Räumen angelegt – „${e.name}“ gilt.` : 'Neuer Planstand aus der Planung – bitte abgleichen.'); fertig(e);
        } catch (er) { bg.querySelectorAll('[data-m]').forEach((b) => { b.disabled = false; }); bg.querySelector('[data-btam]').textContent = er.message; }
      });
      [...document.querySelectorAll('.modal-bg')].pop()?.addEventListener('change', (e) => { const t = e.target.closest('[data-bta]'); if (!t) return; W[t.dataset.bta] = t.dataset.w === '1';
        t.closest('.bt-ab').querySelectorAll(`[data-bta="${t.dataset.bta}"]`).forEach((x) => x.closest('label').classList.toggle('on', x.checked)); });
    });
  }

  /* Ein Einstieg ohne Plan (GO 20.11.2026, Mock „Gebäudemodell ergänzen“ D1): ein Fenster „Wie willst du anfangen?“ mit vier Wegen und je
     einem Satz – statt verstreuter Knöpfe. → Promise<'planung' | 'raeume' | 'zeilen' | 'lesen' | null>; der Aufrufer führt den Weg aus. */
  const WEGE = [['planung', 'Aus der Planung', 'Der Assistent legt Räume, Fenster und Bauteile mit Vorschlagsmengen an. Am schnellsten.'],
    ['raeume', 'Räume und Fenster selbst eintragen', 'Du tippst Räume, Fenster und Türen ein – die Bauteile entstehen daraus.'],
    ['zeilen', 'Nur einzelne Bauteile', 'Du legst Zeile für Zeile an, ohne Räume. Für kleine Maßnahmen.'],
    ['lesen', 'Plan einlesen', 'IFC, DXF oder PDF – Bauteile, Räume, Fenster und Türen kommen aus dem Plan.']];
  function anfangen(o = {}) {
    stil();
    return new Promise((fertig) => {
      modalBox(`<div class="bt-ab bt-anf"><h3>Wie willst du anfangen?</h3>
        ${WEGE.map(([k, t, u]) => `<button type="button" class="bt-ap bt-weg4" data-m="${k}"><span><b>${t}</b><small>${k === 'planung' && o.plan === false ? 'Dafür erst im Reiter „Planung“ sagen, was gebaut wird und wie groß – der Reiter geht auf.' : u}</small></span></button>`).join('')}
        <div class="mute">Es entsteht ein Planstand – ein späterer Plan ersetzt ihn mit Abgleich, deine Antworten bleiben.</div>
        <div class="bt-ft"><button type="button" class="btn" data-m="x">Abbrechen</button></div></div>`, (m, bg, close) => { close(); fertig(m === 'x' ? null : m); });
    });
  }
  /* Zeile von Hand (B1): Name, Menge und Einheit gleich beim Anlegen → Promise<{ name, menge, einheit } | null> */
  const EINHEITEN = ['m²', 'm', 'St', 'psch'];
  function handDialog(gruppe) {
    let eh = 'm²';
    return new Promise((fertig) => {
      modalBox(`<div class="bt-ab bt-hd"><h3>Neue Zeile${gruppe ? ' – ' + esc(gruppe) : ''}</h3>
        <label class="bt-hdl"><span>Was für ein Bauteil?</span><input data-bthn placeholder="z. B. Trockenbauwand Flur" maxlength="200"></label>
        <div class="bt-hdz"><label class="bt-hdl"><span>Menge</span><input data-bthm class="bt-m" inputmode="decimal" placeholder="0"></label>
          <div class="bt-hdl"><span>Einheit</span><div class="bt-o" role="group" aria-label="Einheit">${EINHEITEN.map((e) => `<button type="button" data-m="eh:${e}" class="${e === eh ? 'on' : ''}">${e}</button>`).join('')}</div></div></div>
        <div class="mute">Die Menge kannst du auch später eintragen – bis dahin rechnet die Zeile mit 0. Den Aufbau wählst du danach rechts.</div>
        <div class="bt-ft"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Anlegen</button></div></div>`, (m, bg, close) => {
        if (m.startsWith('eh:')) { eh = m.slice(3); bg.querySelectorAll('[data-m^="eh:"]').forEach((b) => b.classList.toggle('on', b.dataset.m === m)); return; }
        if (m === 'x') { close(); return fertig(null); }
        const n = bg.querySelector('[data-bthn]').value.trim(); if (!n) { bg.querySelector('[data-bthn]').focus(); return sag('Bitte sagen, was für ein Bauteil es ist.', true); }
        close(); fertig({ name: n, menge: parseFloat(bg.querySelector('[data-bthm]').value.replace(/\./g, '').replace(',', '.')) || 0, einheit: eh });
      });
      const i = [...document.querySelectorAll('.modal-bg')].pop()?.querySelector('[data-bthn]'); if (i) { i.focus(); i.addEventListener('keydown', (e) => { if (e.key === 'Enter') i.closest('.modal-bg').querySelector('[data-m="ok"]').click(); }); }
    });
  }

  function mount(el, pid, opt = {}) {
    stil();
    const H = window.BPHead || {};
    const Z = { d: null, auf: null, vorl: {}, vorlD: {}, blk: {}, laeuft: false, kg: {}, ps: [], an: null, rw: null, rwW: {}, sel: null, det: null, mw: [] };   // sel: markierte Zeile (Baumtabelle), det: Feld „Details“ rechts   // rw: Vorschläge der Apps (Rückweg), rwW: Wahl je Vorschlag   // an: Planstand, der gerade angesehen wird (gilt nicht)
    const G = () => (Z.d && Z.d.modell && Z.d.modell.bauteilliste) || { zeilen: [], raeume: [], quelle: {} };
    const L = () => (Z.an ? Z.an.liste : G());
    const gilt = () => (G().quelle || {}).planstand || null;
    const basis = `api/bp/modell/${pid}`;
    const warte = (t) => { const tm = setTimeout(() => { const w = el.querySelector('.bt-w'); if (w) w.textContent = t; }, 1500); return () => clearTimeout(tm); };

    async function laden() {
      const [d, p, rw] = await Promise.all([J(basis).then((r) => r.json()), opt.einlesen ? J(`${basis}/planstaende`).then((r) => r.json()) : Promise.resolve(null),
        J(`${basis}/rueckweg`).then((r) => r.json()).catch(() => null)]);
      Z.d = d; if (p) Z.ps = p.planstaende || []; Z.rw = rw;
      zeichne();
    }
    const neu = (d) => { Z.d = d; if (d.planstaende) Z.ps = d.planstaende; };
    async function ansehen(id) {
      if (!id || String(id) === String(gilt())) { Z.an = null; return zeichne(); }
      try { const d = await (await J(`${basis}/planstand/${id}`)).json(); Z.an = { ...d.planstand, liste: d.liste, abgleich: d.abgleich }; Z.auf = null; zeichne(); } catch (e) { sag(e.message, true); }
    }
    async function aendern(id, was, text) {
      try { neu(await (await J(`${basis}/planstand/${id}`, 'POST', was)).json()); if (was.gilt || was.loeschen) Z.an = null; zeichne(); if (text) sag(text); } catch (e) { sag(e.message, true); }
    }
    function menue(box) {   // gemeinsames Versionsmenü (head.js) – „Planstand“ statt „Version“
      if (!H.versionsMenue || !box) return;
      const g = gilt(), akt = Z.an ? Z.an.id : g;
      H.versionsMenue({ in: box, wort: 'Planstand', liste: Z.ps.map((x) => ({ id: x.id, name: x.name, datum: tag(x.erstellt), archiviert: x.archiviert })), aktuell: akt, gueltig: g,
        wahlHinweis: 'Kosten, Ausschreibung, Termine und die anderen Apps arbeiten mit dem gültigen Planstand.',
        neuText: '＋ Neuen Planstand einlesen …', giltText: '★ Dieser Planstand gilt ab jetzt …',
        onWahl: (id, wird) => (wird ? null : ansehen(id)),
        onGueltig: (id) => aendern(id, { gilt: true }, 'Der Planstand gilt jetzt – die Apps arbeiten damit.'),
        onNeu: () => einlesen(),
        onUmbenennen: async () => { const x = Z.ps.find((y) => String(y.id) === String(akt)); const n = await bpEingabe('Name des Planstands:', x ? x.name : ''); if (n && n.trim()) aendern(akt, { name: n.trim() }); },
        onVerwalten: async () => {   // jeder Planstand lässt sich löschen – auch der gültige (16.11.2026), immer über den Papierkorb mit Rückgängig
          const x = Z.ps.find((y) => String(y.id) === String(akt)); if (!x) return;
          const istG = String(akt) === String(g), andere = Z.ps.filter((y) => String(y.id) !== String(akt));
          const nf = istG ? (andere.filter((y) => !y.archiviert).slice(-1)[0] || andere.slice(-1)[0]) : null;
          let r;
          if (istG) r = await bpFrage(nf ? `„${x.name}“ gilt gerade.\nBeim Löschen gilt ab dann „${nf.name}“ – Kosten, Ausschreibung, Termine und die anderen Apps arbeiten damit.`
            : `„${x.name}“ ist der einzige Planstand.\nDanach ist das Gebäudemodell leer – Bauteile, Räume, Fenster und Türen, auch von Hand Ergänztes. Alles liegt 30 Tage im Papierkorb und kommt mit „Zurück“ wieder.`,
          { ok: 'In den Papierkorb', gefahr: true, abbrechen: 'Abbrechen' });
          else r = await bpFrage(`„${x.name}“ archivieren oder löschen?\nArchivierte Planstände bleiben im Menü unter „Archiviert“, gelöschte liegen 30 Tage im Papierkorb.`, { ok: x.archiviert ? 'Wieder hervorholen' : 'Archivieren', drei: 'In den Papierkorb', abbrechen: 'Abbrechen' });
          if (r === true && !istG) { aendern(akt, { archiviert: !x.archiviert }); return; }
          if (!(istG ? r === true : r === 'drei')) return;
          try {
            const d = await (await J(`${basis}/planstand/${akt}`, 'POST', { loeschen: true, ...(nf ? { nachfolger: nf.id } : {}) })).json();
            neu(d); Z.an = null; zeichne(); sag(`„${x.name}“ im Papierkorb.`);
            const id = x.id;
            if (window.rueckgaengig && d.papierkorb) rueckgaengig(`Planstand „${x.name}“ gelöscht`, async () => {
              await J(`api/bp/papierkorb/${d.papierkorb}/zurueck`, 'POST');
              if (istG) neu(await (await J(`${basis}/planstand/${id}`, 'POST', { gilt: true })).json()); else await laden();
              zeichne(); }, { neu: async () => { await laden(); zeichne(); } });
          } catch (e) { sag(e.message, true); }
        } });
    }
    async function einlesen() {
      const r = await bpFrage('Neuen Planstand einlesen – woher kommt die Datei?\nIFC (Allplan u. a.) liefert Bauteile, Öffnungen und Räume; DXF Räume, Öffnungen und Wände; PDF nur die Raumstempel.',
        { ok: 'Aus „Pläne & Dateien“ …', drei: 'Vom Gerät …', abbrechen: 'Abbrechen' });
      if (r === 'drei') return el.querySelector('[data-btdatei]').click();
      if (r !== true || !H.dateiWahl) return;
      const w = await H.dateiWahl({ project_id: pid, titel: 'Plan für das Gebäudemodell wählen', start: 'server', endungen: ['ifc', 'dxf', 'pdf'], eine: true,
        geraet: () => el.querySelector('[data-btdatei]').click() });
      if (w && w[0]) lesen({ quelle: w[0].quelle, pfad: w[0].pfad });
    }
    async function lesen(was) {   // Schritt 1: Entwurf mit Abgleich – das Modell bleibt, bis „Planstand übernehmen“
      if (Z.laeuft) return; Z.laeuft = true;
      const stop = warte('Plan wird gelesen …');
      try {
        const e = await (await J(`${basis}/bauteile/lesen`, 'POST', was)).json();
        if (e.zuordnen) return zuordnen(e.zuordnen, was);
        if (e.erster) return await uebernehmen(e, {}, e.name);
        abgleich(e);
      } catch (er) { sag(er.message, true); } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    }
    function zuordnen(Q, was) {   // DXF: Ebenen und Blöcke einmal zuordnen – das Büro merkt es sich
      const WE = { raum: 'Räume', wand_aussen: 'Außenwände', wand_innen: 'Innenwände', ignorieren: 'nicht verwenden' }, WB = { fenster: 'Fenster', tuer: 'Türen', ignorieren: 'nicht verwenden' };
      const Z = { ebenen: Object.fromEntries(Q.ebenen.map((x) => [x.name, x.rolle])), bloecke: Object.fromEntries(Q.bloecke.map((x) => [x.name, x.rolle])) };
      const zeile = (x, art, W, info) => `<div class="bt-o"><span title="${esc(x.name)}">${esc(x.name)}<br><small>${esc(info)}</small></span>${Object.entries(W).map(([k, t]) => `<button type="button" data-m="${art}|${k}|${esc(x.name)}" class="${Z[art][x.name] === k ? 'on' : ''}">${t}</button>`).join('')}</div>`;
      const html = () => `<div class="bt-ab"><h3>DXF: Ebenen und Symbole zuordnen</h3>
        <div class="mute">Einmal antippen, was auf welcher Ebene liegt – das Büro merkt es sich für die nächsten Pläne. Vorschläge kommen aus den Namen.</div>
        <h4>Ebenen</h4>${Q.ebenen.map((x) => zeile(x, 'ebenen', WE, [x.flaechen ? x.flaechen + ' Umrisse' : '', x.linien ? x.linien + ' Linien' : ''].filter(Boolean).join(' · '))).join('') || '<span class="mute">keine</span>'}
        <h4>Blöcke (Symbole)</h4>${Q.bloecke.map((x) => zeile(x, 'bloecke', WB, x.n + '×')).join('') || '<span class="mute">keine</span>'}
        <div class="bt-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Einlesen</button></div></div>`;
      modalBox(html(), (m, bg, close) => {
        if (m === 'abbrechen') return close();
        if (m === 'ok') { close(); if (was instanceof FormData) { was.set('zuordnung', JSON.stringify(Z)); return lesen(was); } return lesen({ ...was, zuordnung: Z }); }
        const [art, k, ...n] = m.split('|'); Z[art][n.join('|')] = k;
        const box = bg.querySelector('.modal'), y = box.querySelector('.bt-ab').scrollTop; box.innerHTML = html(); box.querySelector('.bt-ab').scrollTop = y;
      });
    }
    async function uebernehmen(e, zuordnung, name, plus_weg) {
      neu(await (await J(`${basis}/planstand/${e.entwurf}/uebernehmen`, 'POST', { zuordnung, name, ...(plus_weg ? { plus_weg } : {}) })).json()); Z.an = null; Z.auf = null;
      sag(`Planstand übernommen: ${L().zeilen.length} Zeilen` + ((e.hinweise || []).length ? ' – ' + e.hinweise[0] : '')); zeichne();
    }
    function abgleich(e) {   // Schritt 2: Abgleich mit Zuordnung per Klick (entfällt ↔ neu = dasselbe Bauteil)
      const A = e.abgleich, paar = {}, ERG = A.ergaenzt || [], bleibt = new Set(); let wahl = null;   // ERG: Ergänztes, das der neue Plan selbst enthält (A1, 20.11.2026)
      const weg = () => { const w = { raeume: [], elemente: [] }; ERG.forEach((x, i) => { if (!bleibt.has(i)) w[x.art].push(x.k); }); return w; };
      const it = (x, art) => { const p = art === 'e' ? paar[x.id] : Object.keys(paar).find((k) => paar[k] === x.id);
        return `<button type="button" class="bt-i${wahl === x.id ? ' sel' : ''}${p ? ' paar' : ''}" data-m="${art}:${esc(x.id)}">${esc(x.name)} <small>· ${zahl(x.menge)} ${esc(x.einheit)}${x.beantwortet ? ' · ' + esc(WORT[x.status] || x.status) : ''}</small>${p ? `<br><small>↔ ${esc((art === 'e' ? A.neu : A.entfaellt).find((y) => y.id === p)?.name || '')}</small>` : ''}</button>`; };
      const html = () => `<div class="bt-ab"><h3>Neuer Planstand: ${esc(e.name)}</h3>
        <div>${A.neu.length} neu · ${A.geaendert.length} geändert · ${A.entfaellt.length} entfällt · ${A.gleich} unverändert – deine Antworten zu unveränderten Zeilen bleiben.</div>
        ${A.entfaellt.length && A.neu.length ? '<div class="mute">Ist ein „entfällt“ und ein „neu“ dasselbe Bauteil (neu gezeichnet, umbenannt)? Erst links, dann rechts antippen – Status und Aufbau gehen mit. Nochmal antippen löst die Zuordnung.</div>' : ''}
        <div class="bt-sp"><div class="bt-li"><h4>Entfällt (${A.entfaellt.length})</h4>${A.entfaellt.map((x) => it(x, 'e')).join('') || '<span class="mute">nichts</span>'}</div>
          <div class="bt-li"><h4>Neu (${A.neu.length})</h4>${A.neu.map((x) => it(x, 'n')).join('') || '<span class="mute">nichts</span>'}</div></div>
        ${A.geaendert.length ? `<h4>Geändert (${A.geaendert.length})</h4><div class="bt-li">${A.geaendert.map((x) => `<span>${esc(x.name)} <small class="mute">${zahl(x.menge_alt)} → ${zahl(x.menge)} ${esc(x.einheit)}</small></span>`).join('')}</div>` : ''}
        ${ERG.length ? `<h4>Ergänzt – jetzt im Plan (${ERG.length})</h4><div class="bt-li">${ERG.map((x, i) => `<button type="button" class="bt-i${bleibt.has(i) ? '' : ' sel'}" data-m="p:${i}">${esc(x.text)} ist jetzt im Plan – ergänzte Zeile ${bleibt.has(i) ? '<b>behalten</b>' : '<b>entfernen</b>'}</button>`).join('')}<span class="mute">Antippen wechselt zwischen entfernen und behalten.</span></div>` : ''}
        ${(e.hinweise || []).length ? `<div class="mute">${e.hinweise.map(esc).join('<br>')}</div>` : ''}
        <div class="bt-ft"><label>Name <input data-btname value="${esc(e.name)}"></label><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Planstand übernehmen</button></div></div>`;
      modalBox(html(), async (m, bg, close) => {
        if (m === 'abbrechen') return close();
        if (m === 'ok') { const n = bg.querySelector('[data-btname]').value.trim(); close(); try { await uebernehmen(e, paar, n, ERG.length ? weg() : null); } catch (er) { sag(er.message, true); } return; }
        const [art, id] = [m.slice(0, 1), m.slice(2)];
        if (art === 'p') { if (bleibt.has(+id)) bleibt.delete(+id); else bleibt.add(+id); }
        else if (art === 'e') { if (paar[id]) delete paar[id]; else wahl = id; }
        else if (art === 'n') { const k = Object.keys(paar).find((x) => paar[x] === id); if (k) delete paar[k]; else if (wahl) { paar[wahl] = id; wahl = null; } }
        const box = bg.querySelector('.modal'), n = box.querySelector('[data-btname]').value; box.innerHTML = html(); box.querySelector('[data-btname]').value = n;
      });
    }
    async function zeile(id, neu, still) {   // eine Antwort ändern – mit Rückgängig (undo.js) für Antwort, berechnen, Aufbau, Menge
      const z0 = L().zeilen.find((x) => x.id === id), alt = z0 && !neu.loeschen ? Object.fromEntries(Object.keys(neu).map((k) => [k, k === 'wahl' ? [...(z0.wahl || [])] : z0[k]])) : null;
      if (alt && 'status' in neu) Object.assign(alt, { vorlage: z0.vorlage, wahl: [...(z0.wahl || [])], berechnen: z0.berechnen });
      const oben = () => { const r = el.querySelector(`[data-btz="${CSS.escape(id)}"]`); return r ? r.getBoundingClientRect().top : null; }, o0 = oben();
      try {
        Z.d = await (await J(`${basis}/bauteile/zeile`, 'POST', { id, rev: Z.d.rev, ...neu })).json(); zeichne();
        {   // die geänderte Zeile bleibt, wo sie war – auch wenn sich darüber etwas ändert (19.11.2026, „ohne Herumgehüpfe“)
          let sc = el; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
          const o1 = oben(); if (o0 != null && o1 != null && sc && sc !== document.body && Math.abs(o1 - o0) > 2) sc.scrollTop += o1 - o0; }
        window.dispatchEvent(new CustomEvent('bp:bauteile', { detail: { pid, id } }));   // andere Ansichten (Kosten links) rechnen nach
        if (alt && !still && window.rueckgaengig) rueckgaengig(`„${z0.name}“ geändert`, () => zeile(id, alt, true), 10000, () => zeile(id, neu, true));
      } catch (e) { sag(e.message, true); if (e.status === 409) laden(); }
    }
    async function vorlagen(kg) {
      const k = String(kg || '').slice(0, 2);
      if (!Z.vorl[k]) Z.vorl[k] = J(`${basis}/bauteile/vorlagen?kg=${k}0`).then((r) => r.json()).then((d) => (Z.vorlD[k] = d), (e) => { delete Z.vorl[k]; throw e; });
      return Z.vorl[k];
    }

    function zeileHtml(z) {
      const fr = z.bereich === 'frage';
      const st = z.erlaubt || [];   /* welche Antworten passen, sagt der Kern (bauteilliste.erlaubt): im Neubau nur „neu“ */
      const T = ((Z.rw && Z.rw.termine && Z.rw.termine.phasen) || {})[z.bauphase], PN = ((Z.rw && Z.rw.phasen) || []).find((x) => x.k === z.bauphase);
      const ph = PN && (T || z.phase) ? `<span title="Bauphase${T ? ' aus dem Bauzeitenplan' : ''}">${esc(PN.n)}${T ? ' · ' + esc(tag(T.von)) + '–' + esc(tag(T.bis)) : ''}</span>` : '';
      const nr = (z.nummern || []).length || ph || z.herkunft ? `<div class="bt-nr">${[esc((z.nummern || []).join(' · ')), ph, z.herkunft ? 'aus ' + esc(z.herkunft) : ''].filter(Boolean).join(' · ')}</div>` : '';
      const auf = z.vorlage ? `<div class="bt-a"><span>${esc(z.kurz)}</span>${z.code ? `<code>${esc(z.code)}</code>` : '<code>Aufbau nach Wahl</code>'}<button type="button" data-btauf="${esc(z.id)}">Aufbau ${Z.auf === z.id ? 'zu' : 'ändern'}</button></div>`
        : z.status !== 'offen' && z.status !== 'bleibt' && z.status !== 'pruefen' ? `<div class="bt-a"><span>kein Aufbau gewählt</span><button type="button" data-btauf="${esc(z.id)}">Aufbau wählen</button></div>` : '';
      if (z.entfaellt || Z.an) {   // entfallen oder älterer Planstand: nur ansehen
        return `<div class="bt-r${z.entfaellt ? ' weg' : ''}" data-btz="${esc(z.id)}"><span></span><div><div class="bt-n"><b>${esc(z.name)}</b>${z.einordnung ? `<small class="bt-nr"> ${esc(z.einordnung)}</small>` : ''}<i>${zahl(z.menge)} ${esc(z.einheit)}</i>${z.entfaellt ? '<span class="bt-chip">entfällt</span>' : ''}<span class="bt-chip">${esc((fr ? WORT_FRAGE : WORT)[z.status] || z.status)}</span></div>${nr}${z.kurz ? `<div class="bt-a"><span>${esc(z.kurz)}</span></div>` : ''}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}</div></div>`;
      }
      return `<div class="bt-r${z.status === 'offen' ? ' offen' : ''}" data-btz="${esc(z.id)}">
        <input type="checkbox" data-btber title="wird berechnet (Kosten, LV)"${z.berechnen ? ' checked' : ''}${z.status === 'offen' ? ' disabled' : ''}>
        <div><div class="bt-n">${HAND.includes(z.bereich) ? `<input class="bt-nm" data-btname value="${esc(z.name)}" aria-label="Name des Bauteils" title="Name ändern">` : `<b>${esc(z.name)}</b>`}${z.einordnung ? `<small class="bt-nr"> ${esc(z.einordnung)}</small>` : ''}${typeof bpWk === 'function' ? bpWk([z.name, z.material]) : ''}<span data-btu="${esc(z.id)}"></span>${HAND.includes(z.bereich) ? `<i><input class="bt-m" data-btmenge value="${zahl(z.menge)}" inputmode="decimal" aria-label="Menge ${esc(z.name)}"> ${z.bereich === 'hand' ? `<button type="button" class="bt-ehb" data-bteh title="Einheit wählen" aria-label="Einheit ${esc(z.einheit)}">${esc(z.einheit)} ▾</button>` : esc(z.einheit)}</i><button type="button" class="bt-weg" data-btweg title="Zeile entfernen">entfernen</button>${z.bereich === 'hand' && !z.menge ? '<span class="bt-chip gelb" data-btmf>Menge fehlt – wird mit 0 gerechnet</span>' : ''}` : `<i>${zahl(z.menge)} ${esc(z.einheit)}${z.anzahl > 1 && z.einheit !== 'St' ? ` · ${z.anzahl} Objekte` : ''}</i>${z.ergaenzt ? '<span class="bt-chip gelb" title="Neben dem Plan ergänzt – ändern unter „Räume“ bzw. „Fenster & Türen“">ergänzt</span>' : ''}`}</div>${nr}</div>
        <div class="bt-st">${st.map((s) => `<button type="button" data-btst="${s}" class="${z.status === s ? 'on' : ''}">${esc((fr ? WORT_FRAGE : WORT)[s])}</button>`).join('')}</div>
        ${auf}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}${artHtml(z)}${kzHtml(z)}${Z.auf === z.id ? `<div class="bt-e">${editorSofort(z) || '<div class="bt-w">Vorlagen werden geladen …</div>'}</div>` : ''}</div>`;
    }
    /* Art berichtigen (20.11.2026): was der Import vermutet (unterste Platte = Bodenplatte, außen/innen, tragend), lässt sich umstellen – Kern bauteilliste.art_wahl */
    const ARTEN = { 322: 'Bodenplatte', 351: 'Decke', 361: 'Dach', 331: 'Außenwand tragend', 332: 'Außenwand nichttragend', 341: 'Innenwand tragend', 342: 'Innenwand nichttragend' };   // wie bauteilliste.ARTEN
    const artWahl = (z) => (z.bereich !== 'rohbau' || z.quelle === 'allplan' ? [] : ([['322', '351', '361'], ['331', '332', '341', '342']].find((F) => F.includes(String(z.kg))) || []).map((k) => [k, ARTEN[k]]));   // auch für Listen, die vor dem 20.11.2026 gespeichert sind
    function artHtml(z) {
      const W = artWahl(z); if (W.length < 2) return '';
      const n = (k) => (W.find((x) => x[0] === k) || [k, k])[1];
      return `<div class="bt-art">Art: <button type="button" class="bt-ehb" data-btart title="Art ändern, falls der Plan sie falsch zeigt">${esc(n(z.kg))} ▾</button>${z.kg_hand && z.kg_plan && z.kg_plan !== z.kg ? ` <small class="bt-nr">von Hand – im Plan ${esc(n(z.kg_plan))}</small>` : ''}</div>`;
    }
    /* Kürzel aus dem Plan (GO 18.11.2026, Kern kuerzel.py): was an der Wand steht, wie es verstanden wurde, Vorschlag „bitte bestätigen“ (C1),
       Gelerntes (D1), Dickenprobe, Himmelsrichtung; „Wie andere Zeile …“ für gleiche Wände mit verschiedenen Namen */
    const STUFE = { bestaetigen: 'fast alles erkannt', teils: 'teils erkannt', offen: 'nur die Lage erkannt' };
    const stufeText = (e) => (e.stufe === 'offen' && !(e.folge || []).some((f) => f[2] === 'Lage') ? 'nicht erkannt' : STUFE[e.stufe] || '');   // ohne Lage nicht „nur die Lage“
    const kzChip = (z) => (!z.bestaetigt ? '<span class="bt-chip gelb">bitte bestätigen</span>' : z.vorlage ? '<span class="bt-chip">bestätigt</span>' : '<span class="bt-chip gelb">Aufbau wählen</span>');   // ohne Aufbau nichts „bestätigt“
    function kzHtml(z) {
      if (!z.kuerzel || z.bereich === 'oeffnung') return '';   // Fenster/Türen: Name ist der Typ – Ausführung über die Türliste
      const e = z.erkannt || {}, R = z.richtung || {}, ri = Object.keys(R).length ? ['N', 'O', 'S', 'W'].filter((k) => R[k]).map((k) => `${k} ${zahl(R[k])} m²`).join(' · ') : '';
      return `<div class="bt-kzb"><div><b>Aus dem Plan:</b> <code>${esc(z.kuerzel)}</code> ${kzChip(z)} <span class="bt-nr">${esc(stufeText(e))}</span></div>
        ${(e.folge || []).length ? `<table>${e.folge.map((f) => `<tr><td><code>${esc(f[0])}</code></td><td>${esc(f[1])}</td><td>${esc(f[2])}</td></tr>`).join('')}</table>` : ''}
        ${e.gelernt ? `<div class="bt-h">Vorschlag aus dem Büro: ${e.gelernt}× bei diesem Kürzel so bestätigt.</div>` : ''}${e.dicke ? `<div class="bt-h bt-ro">${esc(e.dicke)}</div>` : ''}${e.frage ? `<div class="bt-h bt-ro">${esc(e.frage)}</div>` : ''}
        ${ri ? `<div class="bt-h">Himmelsrichtung (aus der Geometrie): ${esc(ri)}</div>` : ''}
        ${Z.an ? '' : `<div class="bt-kzk">${!z.bestaetigt && z.vorlage ? '<button type="button" class="btn sm primary" data-btbest>Bestätigen</button>' : ''}<button type="button" class="btn sm" data-btwie>Wie andere Zeile …</button></div>`}</div>`;
    }
    function zeichnerListe() {   // „An den Zeichner“: was im Plan nachzuziehen ist – Abweichungen, Dicken, fehlende Kürzel
      const Zs = (L().zeilen || []).filter((z) => !z.entfaellt), A = [];
      for (const z of Zs) {
        if (z.kuerzel && z.bestaetigt && z.kz_vorlage && z.vorlage && z.vorlage !== z.kz_vorlage) A.push(`„${z.kuerzel}“: im Modell ${z.kurz} – weicht vom Plan ab`);
        if (z.kuerzel && (z.erkannt || {}).dicke) A.push(`„${z.kuerzel}“: ${z.erkannt.dicke}`);
        if (z.kuerzel && (z.erkannt || {}).frage) A.push(`„${z.kuerzel}“: ${z.erkannt.frage}`);
        if (!z.kuerzel && /^Wand|^Decke|^Dach|^Bodenplatte/.test(z.art || '') && !z.code && z.quelle === 'ifc') A.push(`${z.name}: ohne Kürzel im Plan`);
      }
      const nach = {}; Zs.filter((z) => z.kuerzel && z.bereich !== 'oeffnung').forEach((z) => { (nach[z.kuerzel.toLowerCase()] = nach[z.kuerzel.toLowerCase()] || new Set()).add(zahl((z.dicke_plan || 0) * 100)); });
      Object.entries(nach).forEach(([k, d]) => { if (d.size > 1) A.push(`„${k}“ kommt mit verschiedenen Dicken vor (${[...d].join(' / ')} cm) – gleiche Wände, gleicher Name?`); });
      return A;
    }
    async function zeichnerZeigen() {
      const A = zeichnerListe(); let K = null; try { K = await (await J('api/bp/modell/kuerzel')).json(); } catch { /* ohne Liste */ }
      const txt = A.map((x) => '– ' + x).join('\n');
      modalBox(`<div class="bt-ab"><h3>An den Zeichner</h3><p class="mute">Was im Plan nachzuziehen ist – die Kosten stimmen trotzdem, das Modell gilt.</p>
        <ul class="bt-zl">${A.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>Nichts – Plan und Modell passen zusammen.</li>'}</ul>
        ${K ? `<details><summary>Kürzel, die das Portal sicher kennt</summary><p class="mute">Gleiche Bauteile, gleicher Name. Groß/klein, Leerzeichen und Bindestriche egal. Die Art (Wand, Decke …) kommt aus dem Plan.</p>
          <p><b>Lage (freiwillig):</b> ${K.lage.map((x) => `<code>${esc(x[0])}</code> ${esc(x[1])}`).join(' · ')}</p><p><b>Kern:</b> ${K.kern.map((x) => `<code>${esc(x[0])}</code> ${esc(x[1])}`).join(' · ')}</p>
          <p><b>Schichten:</b> ${K.schichten.map(esc).join(', ')} – Tippfehler bis 2 Buchstaben werden erkannt.</p></details>` : ''}
        <div class="bt-ft"><button type="button" class="btn" data-m="kopie"${A.length ? '' : ' disabled'}>Liste kopieren</button><button type="button" class="btn primary" data-m="zu">Schließen</button></div></div>`,
      async (m, bg, close) => { if (m === 'zu') close(); if (m === 'kopie') { try { await navigator.clipboard.writeText(txt); sag('Kopiert.'); } catch { sag('Kopieren ging nicht – bitte markieren.', true); } } });
    }

    /* Gebäudeteile (GT-C1, 18.11.2026): Zeilen tragen „teil“ – Auswahl oben, Name des Teils hinter der Zeile; Zeilen ohne Teil (Fragen, von Hand) immer */
    const teilName = (k) => (((Z.d && Z.d.modell && Z.d.modell.teile) || []).find((t) => t.k === k) || {}).n || k;
    const teilFilter = (ZZ) => { const T = [...new Set(ZZ.map((z) => z.teil).filter(Boolean))]; if (Z.teil && !T.includes(Z.teil)) Z.teil = '';
      return [T.length > 1 ? ZZ.filter((z) => !Z.teil || !z.teil || z.teil === Z.teil) : ZZ, T.length > 1 ? `<div class="bt-teile" role="group" aria-label="Gebäudeteil"><span>Gebäudeteil</span>${['', ...T].map((k) => `<button type="button" data-btteil="${esc(k)}" class="${(Z.teil || '') === k ? 'on' : ''}">${esc(k ? teilName(k) : 'alle')}</button>`).join('')}</div>` : ''];
    };
    const mitTeil = (z) => (z.teil && !String(z.name).includes(teilName(z.teil)) ? `${z.name} – ${teilName(z.teil)}` : z.name);
    function zeichne() {
      if (opt.baum) { baumZeichnen(); uFuellen(el); detailsZeichnen(); if (opt.nachher) opt.nachher(api); return; }
      const Li = L(), Q = Li.quelle || {}, ZZ = Li.zeilen || [], gm = ((H.conf || {}).apps || []).find((a) => a.key === 'gebaeudemodell');
      const offen = ZZ.filter((z) => z.status === 'offen' && !z.entfaellt).length, weg = G().zeilen.filter((z) => z.entfaellt).length;
      const stand = Q.datei ? `${esc(Q.name || 'Planstand')} · ${esc(Q.datei)}${Q.gelesen ? ' · gelesen ' + esc(tag(Q.gelesen)) : ''}${Q.programm ? ' · ' + esc(Q.programm) : ''}` : '';
      const kopf = opt.einlesen
        ? `<div class="bt-kopf"><span data-btvm></span><button type="button" class="btn${ZZ.length ? '' : ' primary'}" data-btlesen>Planstand einlesen …</button>
          <button type="button" class="btn" data-btaus${ZZ.length && !Z.an && ifcDa(Q) ? '' : ' disabled'} title="Nummern, Status und Aufbau ins IFC schreiben${Q.pfad ? ' – die Datei kommt aus „Pläne & Dateien“' : ' – dafür die IFC-Datei noch einmal wählen'}">IFC mit Maßnahmen ausgeben</button>
          ${weg && !Z.an ? `<button type="button" class="btn" data-btweg-alle title="Zeilen, die im gültigen Planstand nicht mehr vorkommen, entfernen">Aufräumen (${weg} entfällt)</button>` : ''}
          ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
          <span class="bt-q"></span>${Z.an ? '' : '<button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button>'}
          ${ZZ.length && !Z.an && Z.rw && Z.rw.extern ? '<button type="button" class="btn" data-btki title="Eine externe KI schlägt fehlende Bauteile, Aufbauten, Mengen oder Ausstattung vor – anonymisiert, nur als Vorschlag">Verfeinern (extern) …</button>' : ''}
          <input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div><div class="bt-w"></div>`
        : `<div class="bt-kopf"><span class="bt-ps">${stand ? 'Planstand: ' + stand : 'Noch kein Planstand eingelesen.'}${gm ? ` · <a href="${esc(H.appUrl(gm))}/#bauteile">${stand ? 'Neuen Planstand einlesen' : 'Plan einlesen'} → Gebäudemodell</a>` : ''}</span>
          ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
          <button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button></div><div class="bt-w"></div>`;
      const an = Z.an ? `<div class="bt-an"><span>Du siehst <b>${esc(Z.an.name)}</b> – gilt nicht. Gegenüber dem gültigen: ${Z.an.abgleich.neu.length} neu · ${Z.an.abgleich.geaendert.length} geändert · ${Z.an.abgleich.entfaellt.length} entfällt.</span>
        <button type="button" class="btn" data-btzurueck>Zurück zum gültigen</button><button type="button" class="btn primary" data-btgilt>Diesen Planstand gelten lassen</button></div>` : '';
      if (!ZZ.length) {   // ohne Modell (Z1, 17.11.2026): dieselbe Meldung wie überall – aus der Planung anlegen, Plan einlesen oder Zeile von Hand
        const A = (Z.d.modell || {}).assistent || {}, plan = !!A.type;
        el.innerHTML = `<div class="bt-l">${typeof bpLeer === 'function' ? bpLeer({ was: 'keine Bauteile', text: plan ? 'Aus der Planung lässt sich ein erster Stand anlegen – mit Vorschlagsmengen und Preisspanne aus den Baudaten. Oder einen Plan einlesen (IFC, DXF, PDF).' : 'Erst die Planung beginnen (Was wird gebaut, wie groß) – daraus entstehen die Bauteile. Oder einen Plan einlesen (IFC, DXF, PDF).',
          knoepfe: [{ t: 'Anfangen …', attrs: 'data-btanfang' }] }) : ''}
          ${opt.einlesen || !gm ? '' : `<p class="bt-nr"><a href="${esc(H.appUrl(gm))}/#bauteile">Plan einlesen → Gebäudemodell</a></p>`}<span data-btvm hidden></span><input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div>`;
        menue(el.querySelector('[data-btvm]'));
        return;
      }
      const nZ = Z.an ? 0 : zeichnerListe().length, [ZT, tw] = teilFilter(ZZ);
      // ohne Hüpfen (19.11.2026, Video): Höhe halten, bis der Aufbau-Editor wieder gefüllt ist, und die Rollposition des Bereichs zurücksetzen
      let sc = el; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const y = sc && sc !== document.body ? sc.scrollTop : null, hoch = el.offsetHeight;
      if (y != null) el.style.minHeight = hoch + 'px';
      const halt = () => { if (y == null) return; sc.scrollTop = y; el.style.minHeight = ''; };
      el.innerHTML = `<div class="bt-l">${kopf}${an}${tw}${Z.an ? '' : rueckwegHtml()}${nZ ? `<div class="bt-rwl"><span>${nZ} Hinweis${nZ === 1 ? '' : 'e'} an den Zeichner (Plan und Modell weichen ab, Kürzel fehlen)</span><button type="button" class="btn sm" data-btzeichner>ansehen</button></div>` : ''}${BEREICH.map(([b, t]) => { const R = ZT.filter((z) => z.bereich === b); return R.length ? `<section class="bt-b"><h4>${esc(t)}</h4>${R.map(zeileHtml).join('')}</section>` : ''; }).join('')}</div>`;
      menue(el.querySelector('[data-btvm]'));
      uFuellen(el);
      if (y != null) sc.scrollTop = y;
      if (Z.auf) editor().then(halt, halt); else halt();
    }

    function rueckwegHtml() {   // Vorschläge der Apps (Kern rueckweg.py): annehmen, verbinden, ablehnen; Schalter „ins Modell“ je App
      const R = Z.rw; if (!R) return '';
      const S = R.schalter || {}, alle = G().zeilen || [], name = (id) => (alle.find((x) => x.id === id) || {}).name || id;
      const PN = (k) => ((R.phasen || []).find((x) => x.k === k) || {}).n || k;
      const was = (e) => Object.entries(e.neu || {}).filter(([k]) => !['einheit', 'kg', 'gewerk', 'vorlage_name'].includes(k))
        .map(([k, v]) => (k === 'menge' ? `Menge ${e.alt && e.alt.menge != null ? zahl(e.alt.menge) + ' → ' : ''}${zahl(v)} ${esc(e.einheit || (e.neu || {}).einheit || '')}`
          : k === 'vorlage' ? `Aufbau ${e.alt && e.alt.aufbau ? esc(e.alt.aufbau) + ' → ' : ''}${esc(e.neu.vorlage_name || v)}`
            : `Bauphase ${e.alt && e.alt.phase ? esc(PN(e.alt.phase)) + ' → ' : ''}${esc(PN(v))}`)).join(' · ')
        + (e.grund ? `<br><small class="bt-w">${esc(e.grund)}</small>` : '');
      const knopf = (hid, i, w, t) => `<button type="button" class="btn sm${(Z.rwW[hid] || {})[i] === w ? ' primary' : ''}" data-btrw="${hid}" data-i="${i}" data-w="${esc(w)}">${t}</button>`;
      const box = (R.vorschlaege || []).map((h) => {
        const W = Z.rwW[h.id] ||= {}, Zl = (h.daten.zeilen || []);
        Zl.forEach((e, i) => { if (!(i in W)) W[i] = e.doppelt ? 'verbinden:' + e.doppelt : 'ja'; });
        return `<div class="bt-rw" data-btrwh="${h.id}"><h4>${esc(h.titel)}${h.daten.extern ? ' <span class="bt-chip bt-ext">extern, ungeprüft</span>' : ''}</h4>${Zl.map((e, i) => `<div class="bt-rz"><span>${e.art === 'neu' ? `<b>Neu:</b> ${esc(e.name)}${was(e) ? ' · ' + was(e) : ''}${e.doppelt ? ` <span class="bt-chip">gibt es schon: „${esc(name(e.doppelt))}“</span>` : ''}` : `<b>${esc(e.name)}</b>: ${was(e)}`}</span>
          <span class="bt-rk">${e.art === 'neu' ? knopf(h.id, i, 'ja', 'Neu anlegen') + (e.doppelt ? knopf(h.id, i, 'verbinden:' + e.doppelt, 'Verbinden') : '') : knopf(h.id, i, 'ja', 'Übernehmen')}${knopf(h.id, i, 'nein', 'Nein')}</span></div>`).join('')}
          <div class="bt-rk"><button type="button" class="btn sm" data-btrwab="${h.id}">Alle ablehnen</button><button type="button" class="btn sm primary" data-btrwok="${h.id}">Entscheidung übernehmen</button></div></div>`;
      }).join('');
      return `${box}<div class="bt-rs"><span>Änderungen aus den Apps als Vorschlag ins Modell:</span>${Object.keys(APPN).map((a) => `<label><input type="checkbox" data-btrws="${a}"${S[a] !== false ? ' checked' : ''}> ${APPN[a]}</label>`).join('')}</div>`;
    }
    function verfeinern() {   // externe KI (Kern verfeinern.py): 1. was vorschlagen · 2. was hinausgeht · dann Vorschläge oben in der Liste
      const W = [['luecken', 'Fehlende Bauteile', 'was zur Bauart passt, aber in der Liste fehlt (z. B. Dachentwässerung, Sockel)', true],
        ['aufbau', 'Aufbauten', 'zu Zeilen ohne Aufbau: passender Aufbau aus dem eigenen Baukasten', true],
        ['mengen', 'Mengen prüfen', 'Auffälliges, z. B. Wandfläche zu Bodenfläche', false],
        ['ausstattung', 'Ausstattung je Raumgruppe', 'Aufbau für Bad, Küche und Böden nach üblichem Standard', false]];
      let schritt = 1;
      const html = () => schritt === 1
        ? `<div class="bt-ab"><h3>Verfeinern (extern) – was soll die KI vorschlagen?</h3>${W.map(([k, n, t, an]) => `<label style="display:flex;gap:.5rem;align-items:flex-start"><input type="checkbox" data-btkw="${k}"${an ? ' checked' : ''}><span><b>${n}</b><br><small class="bt-w">${t}</small></span></label>`).join('')}
          <div class="bt-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="kweiter">Weiter …</button></div></div>`
        : `<div class="bt-ab"><h3>Das geht hinaus</h3><p style="margin:0">An die externe KI (wie in der Verwaltung eingestellt), <b>anonymisiert</b>:</p>
          <ul style="margin:0;padding-left:1.2rem"><li>Bauart, Geschosse, Räume nach Art (Bad, Küche …) mit Fläche und Höhe – keine Raumnamen</li><li>die Bauteil-Liste mit Mengen, Antworten und Aufbau</li><li>passende Aufbauten aus dem eigenen Baukasten (nur Namen)</li></ul>
          <p style="margin:0"><b>Nicht:</b> Projektname, Adresse, Personen, Firmen, Preise, Pläne oder Bilder.</p>
          <p class="bt-an" style="margin:0">Kostet je Anfrage, die Antwort ist ungeprüft und steht im Datenschutz-Protokoll. Nichts ändert sich von selbst – jeder Vorschlag wird einzeln übernommen.</p>
          <div class="bt-w" data-btkw2></div><div class="bt-ft"><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn" data-m="kzur">Zurück</button><button type="button" class="btn primary" data-m="kgo" data-btkgo>Extern fragen</button></div></div>`;
      let wahl = W.filter((w) => w[3]).map((w) => w[0]);
      modalBox(html(), async (m, bg, close) => {
        const box = bg.querySelector('.modal');
        if (m === 'abbrechen') return close();
        if (m === 'kweiter') { wahl = [...box.querySelectorAll('[data-btkw]:checked')].map((x) => x.dataset.btkw); if (!wahl.length) return sag('Bitte mindestens einen Punkt wählen.', true); schritt = 2; box.innerHTML = html(); }
        else if (m === 'kzur') { schritt = 1; box.innerHTML = html(); box.querySelectorAll('[data-btkw]').forEach((x) => { x.checked = wahl.includes(x.dataset.btkw); }); }
        else if (m === 'kgo') {
          const b = box.querySelector('[data-btkgo]'); b.disabled = true; box.querySelector('[data-btkw2]').textContent = 'Die externe KI arbeitet … (bis etwa eine Minute)';
          try {
            const d = await (await J(`${basis}/verfeinern`, 'POST', { was: wahl })).json();
            Z.rw = { ...Z.rw, vorschlaege: d.vorschlaege }; close(); zeichne();
            sag(d.n ? `${d.n} Vorschl${d.n === 1 ? 'ag' : 'äge'} der externen KI – oben in der Liste, einzeln übernehmen.` : 'Die externe KI hat nichts Neues vorgeschlagen.');
            if (d.n) { const v = el.querySelector('.bt-rw'); if (v) v.scrollIntoView({ block: 'nearest' }); }
          } catch (er) { b.disabled = false; box.querySelector('[data-btkw2]').textContent = er.message; }
        }
      });
    }
    async function rueckweg(hid, wahl) {
      try {
        const d = await (await J(`${basis}/rueckweg/${hid}`, 'POST', { wahl })).json();
        Z.d = { ...Z.d, modell: d.modell, rev: d.rev }; Z.rw = { ...Z.rw, vorschlaege: d.vorschlaege }; delete Z.rwW[hid];
        sag(d.n ? `${d.n} Vorschl${d.n === 1 ? 'ag' : 'äge'} ins Modell übernommen.` : 'Vorschlag abgelehnt.'); zeichne();
      } catch (e) { sag(e.message, true); }
    }

    /* Jede Schicht gleich: Material · Stärke · Ausführung (GO 18.11.2026, Mock „Schicht: Material, Stärke, Ausführung“: MA-A1 B1 C1).
       Der Kern zerlegt die Optionen (bpcore/schicht.py: mat, dicke, ausf je Option; je Schicht Bezeichnung und Liste der Ausführungen, übliche
       Stärken). Hier: Material als Knöpfe, Stärke und Ausführung als Auswahl mit „eigener Wert …“. Gewählt wird die Option mit gleichem
       Material, gleicher Ausführung und der nächsten Stärke; was davon abweicht, steht in der Zeile (dicken, ausf). */
    const dz = (d) => String(d).replace('.', ',');
    function schichtHtml(z, s, i) {
      const j = (z.wahl || [])[i], o = s.optionen[j] || {}, d = (z.dicken || {})[i] || o.dicke, a = (z.ausf || {})[i] || o.ausf || '', mats = [];
      s.optionen.forEach((x, k) => { const m = x.mat ? 'm:' + x.mat : '#' + k; if (!mats.includes(m)) mats.push(m); });
      const chips = mats.map((m) => (m.startsWith('#') ? `<button type="button" data-btop="${i}.${m.slice(1)}" class="${j === +m.slice(1) ? 'on' : ''}" title="${esc(s.optionen[+m.slice(1)].t || '')}">${esc(optName(s.optionen[+m.slice(1)]))}</button>`
        : `<button type="button" data-btmat="${i}" data-mat="${esc(m.slice(2))}" class="${o.mat === m.slice(2) ? 'on' : ''}" title="${esc(s.optionen.filter((x) => x.mat === m.slice(2)).map((x) => x.k).join(' · '))}">${esc(m.slice(2))}</button>`)).join('');
      if (!o.mat) return chips;
      const M = (s.mats || {})[o.mat] || {};   // Angaben des Materials: Ausführung (Bezeichnung, Liste), übliche Stärken
      const st = [...new Set([...(M.staerken || []), ...s.optionen.filter((x) => x.mat === o.mat && x.dicke).map((x) => x.dicke), d].filter(Boolean))].sort((x, y) => x - y);
      const stHtml = d ? `<span class="bt-dkh">Stärke</span><select data-bp-auswahl data-btdk="${i}" title="Stärke – zwischen den Positionen der Datenbank wird der Preis umgerechnet">${st.map((w) => `<option value="${w}"${w === d ? ' selected' : ''}>${dz(w)} cm</option>`).join('')}<option value="eigen">eigener Wert …</option></select>` : '';
      const wl = [...new Set([...(M.werte || []), ...s.optionen.filter((x) => x.mat === o.mat && x.ausf).map((x) => x.ausf), a].filter(Boolean))];
      const auHtml = M.ausf ? `<span class="bt-dkh">${esc(M.ausf)}</span><select data-bp-auswahl data-btau="${i}" title="Ausführung – steht im Text der Positionen, der Preis bleibt">${a ? '' : '<option value="" selected>–</option>'}${wl.map((w) => `<option value="${esc(w)}"${w === a ? ' selected' : ''}>${esc(w)}</option>`).join('')}<option value="eigen">eigener Wert …</option></select>` : '';
      const hin = (z.dicken || {})[i] ? 'Preis aus den Nachbardicken umgerechnet' : (z.ausf || {})[i] ? 'eigene Ausführung – Preis wie die Option' : '';
      return `${chips}${stHtml}${auHtml}${hin ? `<small class="bt-dkh">${hin}</small>` : ''}`;
    }
    function schichtSetzen(id, i, mat, d, a) {   // → wahl, dicken, ausf: passende Option; Abweichungen nur, wenn sie von der Option abweichen
      const z = L().zeilen.find((x) => x.id === id), s = Z.vl && Z.vl.schichten[i]; if (!z || !s) return;
      const O = s.optionen.map((x, k) => [k, x]).filter(([, x]) => x.mat === mat); if (!O.length) return;
      const wert = ([, x]) => (a && x.ausf !== a ? 1000 : 0) + Math.abs((x.dicke || 0) - (d || x.dicke || 0));
      const [k, o] = O.reduce((p, q) => (wert(q) < wert(p) ? q : p));
      const w = [...(z.wahl || [])]; w[i] = k;
      const dk = { ...(z.dicken || {}) }; if (!d || o.dicke === d) delete dk[i]; else dk[i] = d;
      const au = { ...(z.ausf || {}) }; if (!a || o.ausf === a) delete au[i]; else au[i] = a;
      return zeile(id, { wahl: w, dicken: dk, ausf: au });
    }
    /* Vorlagen in Blöcken (GO 18.11.2026, Mock „Vorlagen in Blöcken“: BL-A1 B1 C1): je 3. Ebene der DIN 276 ein Block; offen ist der Block
       der Zeile (bei Wänden tragend und nichttragend zusammen), die anderen zugeklappt darunter. Vorlagen nur für Vorhandenes (Kern: bestand)
       fehlen bei „neu“ und stehen sonst als Block „Bestand“ oben. Der Knopf wiederholt den Block nicht („IW tragend …“ → „…“). */
    const PAAR = { 331: [332], 332: [331], 341: [342], 342: [341] };
    const kurzName = (n) => { const x = String(n || '').replace(/^(?:Nichttragende\s+)?(?:IW|AW)\s+(?:(?:nicht)?tragend\s+)?/i, ''); return x ? x[0].toUpperCase() + x.slice(1) : n; };
    // Option ohne Kurzname: mit Leistung = Regelausführung („Standard“, z. B. Deckenschalung bis 3 m), ohne Leistung = „ohne“ (19.11.2026)
    const optName = (o) => o.k || (o.t ? 'Standard' : 'ohne');
    // Bauteile, die in der KG stehen, aber nicht zur Zeile passen: in einer Decke keine Treppen, Unterzüge, Träger (19.11.2026)
    const passt = (z, x) => !(/decke|platte/i.test(`${z.art} ${z.name}`) && !/trepp/i.test(`${z.art} ${z.name}`) && /trepp|unterzug|träger/i.test(x.name));
    function bloeckeHtml(z, V) {
      const k3 = String(z.kg || '').slice(0, 3), offen = new Set([k3, ...(PAAR[k3] || []).map(String)]), st = z.status || '';
      const gew = V.find((x) => x.id === z.vorlage); if (gew) offen.add(gew.bestand && st !== 'neu' ? '_b' : String(gew.kg).slice(0, 3));
      const B = new Map(), knopf = (x) => `<button type="button" data-btvl="${esc(x.id)}" class="${x.id === z.vorlage ? 'on' : ''}" title="${esc(x.kg + ' ' + x.name)}">${esc(kurzName(x.name))}</button>`;
      for (const x of V) {
        if (x.id !== z.vorlage && ((x.bestand && st === 'neu') || !passt(z, x))) continue;
        const k = x.bestand && st !== 'neu' ? '_b' : String(x.kg).slice(0, 3);
        if (!B.has(k)) B.set(k, { n: k === '_b' ? 'Bestand' : `${k} · ${x.block || ''}`, L: [] }); B.get(k).L.push(x);
      }
      if (['bleibt', 'instandsetzen', 'erneuern', 'abbruch'].includes(st)) offen.add('_b');
      const ord = [...B.keys()].sort((a, b) => (b === '_b') - (a === '_b') || offen.has(b) - offen.has(a) || a.localeCompare(b));
      // kompakt (20.11.2026): ist eine Vorlage gewählt, steht nur sie da – „ändern“ klappt die Auswahl auf; dort die Blöcke der Zeile offen,
      // die übrigen Kostengruppen in EINER Zeile „weitere Kostengruppen“ (nichts geht verloren, alles einen Klick weiter)
      if (gew && Z.vlAuf !== z.id) return `<div class="bt-vbl"><span class="bt-bln">Vorlage</span><div class="bt-o"><button type="button" class="on" data-btvlauf title="${esc(gew.kg + ' ' + gew.name)}">${esc(kurzName(gew.name))}</button><button type="button" class="bt-vlw" data-btvlauf>andere Vorlage …</button></div></div>`;
      const blk = (k) => { const b = B.get(k); return `<details class="bt-blk" data-btblk="${esc(k)}"${(k in Z.blk ? Z.blk[k] : offen.has(k)) ? ' open' : ''}><summary>${esc(b.n)} <small>${b.L.length}</small></summary><div class="bt-o">${b.L.map(knopf).join('')}</div></details>`; };
      const vorn = ord.filter((k) => offen.has(k)), rest = ord.filter((k) => !offen.has(k));
      return `<div class="bt-vbl"><span class="bt-bln">Vorlage</span><div>${(vorn.length ? vorn : rest.splice(0, 1)).map(blk).join('')}${rest.length ? `<details class="bt-blk bt-weitere" data-btblk="_weitere"${Z.blk._weitere ? ' open' : ''}><summary>weitere Kostengruppen <small>${rest.length}</small></summary>${rest.map(blk).join('')}</details>` : ''}${gew ? '<div class="bt-o"><button type="button" class="bt-vlw" data-btvlauf>zuklappen</button></div>' : ''}</div></div>`;
    }
    /* Aufbau-Editor: sind die Vorlagen schon da, steht er gleich mit in der Zeile (kein „wird geladen“ dazwischen – sonst springt die Seite bei jeder Wahl, 20.11.2026) */
    function editorSofort(z) { const kg = Z.kg[z.id] || z.kg, V = Z.vorlD[String(kg || '').slice(0, 2)]; return V ? editorHtml(z, kg, V) : ''; }
    async function editor(neu) {
      const sel = `[data-btz="${CSS.escape(Z.auf || '')}"] .bt-e`, z = L().zeilen.find((x) => x.id === Z.auf), box = (Z.det && Z.det.querySelector(sel)) || el.querySelector(sel);
      if (!z || !box || (!neu && !box.querySelector('.bt-w'))) return;   // schon gefüllt (editorSofort)
      let V;
      const kg = Z.kg[z.id] || z.kg;
      try { V = await vorlagen(kg); } catch (e) { box.innerHTML = `<div class="bt-w">${esc(e.message)}</div>`; return; }
      box.innerHTML = editorHtml(z, kg, V);
    }
    function editorHtml(z, kg, V) {
      const v = V.find((x) => x.id === z.vorlage);
      Z.vl = v;
      return `${HAND.includes(z.bereich) ? `<div class="bt-o"><span>Kostengruppe</span>${KG2.map(([k, t]) => `<button type="button" data-btkg="${k}" class="${String(kg).startsWith(k) ? 'on' : ''}">${k}0 ${esc(t)}</button>`).join('')}</div>` : ''}${bloeckeHtml(z, V)}
        ${v ? v.schichten.map((s, i) => `<div class="bt-o"><span>${esc(s.name)}</span>${s.gl ? schichtHtml(z, s, i) : s.optionen.map((o, j) => `<button type="button" data-btop="${i}.${j}" class="${(z.wahl || [])[i] === j ? 'on' : ''}" title="${esc(o.t)}">${esc(optName(o))}</button>`).join('')}</div>`).join('') : ''}`;
    }

    const blkMerk = (e) => { const d = e.target; if (d && d.dataset && d.dataset.btblk) Z.blk[d.dataset.btblk] = d.open; };   // auf-/zugeklappte Vorlagen-Blöcke bleiben beim Neuzeichnen so
    el.addEventListener('toggle', blkMerk, true);
    const klick = async (e) => {
      const t = e.target, r = t.closest('[data-btz]'), id = r && r.dataset.btz;
      if (opt.baum && t.closest('[data-btrwzeig]')) { Z.sel = '__rw'; Z.auf = null; zeichne(); if (opt.auswahl) opt.auswahl(null); return; }
      if (t.closest('[data-btmw]') && id) return mwUm(id, true);
      if (opt.baum && r && r.tagName === 'TR' && (e.ctrlKey || e.metaKey) && !t.closest('[data-zu],input,button')) return mwUm(id, true);
      if (t.closest('[data-btmwweg]')) return mwSetzen([]);
      if (t.closest('[data-btmwst]')) return mwAendern({ status: t.closest('[data-btmwst]').dataset.btmwst });
      if (opt.baum && r && r.tagName === 'TR' && !t.closest('[data-zu],input,button')) { if (Z.mw.length) { Z.mw = []; if (opt.mehr) opt.mehr([]); } Z.sel = id; Z.auf = id; zeichne(); if (opt.auswahl) opt.auswahl(L().zeilen.find((x) => x.id === id)); return; }
      if (t.closest('[data-btlesen]')) return einlesen();
      if (t.closest('[data-btanfang]')) return anfang();
      if (t.closest('[data-btplan]')) { const e = await ausPlanung(pid); if (!e) return; return e.erster ? laden() : abgleich(e); }   // gilt schon ein Planstand: Abgleich wie beim Einlesen
      if (t.closest('[data-btplanung]')) { if (window.seiteReiterVon && seiteReiterVon(el, 'planung')) return; sag('Die Planung steht im Reiter „Planung“ rechts.'); return; }
      if (t.closest('[data-btki]')) return verfeinern();
      if (t.closest('[data-btzurueck]')) return ansehen(null);
      if (t.closest('[data-btgilt]') && Z.an) return aendern(Z.an.id, { gilt: true }, 'Der Planstand gilt jetzt – die Apps arbeiten damit.');
      if (t.closest('[data-btweg-alle]')) {
        if (!(await bpFrage('Alle Zeilen entfernen, die im gültigen Planstand nicht mehr vorkommen? Ihre Antworten gehen dabei verloren.', { ok: 'Aufräumen' }))) return;
        try { const d = await (await J(`${basis}/bauteile/aufraeumen`, 'POST', {})).json(); neu(d); sag(`${d.entfernt} Zeilen entfernt.`); zeichne(); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-btstart]')) {   // Standardbaum ohne Plan: Fragen beantworten → Planstand „Von Hand“ mit den Fragen (Kern: von_hand_anfangen)
        try { neu(await (await J(`${basis}/bauteile/hand`, 'POST', { nur_start: true })).json()); zeichne(); sag('Planstand „Von Hand“ angelegt – die Fragen stehen jetzt in der Liste.'); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-bthand]')) {
        const hk = t.closest('[data-bthand]'), g = hk.dataset.gruppe ? ` – ${hk.dataset.gruppe}` : '';
        const n = await handDialog(g.slice(3)); if (!n) return;   // Name, Menge, Einheit (B1, 20.11.2026)
        try { neu(await (await J(`${basis}/bauteile/hand`, 'POST', { ...n, kg: hk.dataset.kg || '' })).json()); const L2 = L().zeilen; Z.sel = Z.auf = L2.length ? L2[L2.length - 1].id : null; zeichne(); if (opt.auswahl) opt.auswahl(L2[L2.length - 1]); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-btaus]')) {
        const Q = G().quelle || {};
        return ausgeben(Q.pfad ? { quelle: 'server', pfad: Q.pfad } : {});   // Datei aus „Pläne & Dateien“ oder die beim Einlesen gespeicherte
      }
      const rw = t.closest('[data-btrw]'); if (rw) { (Z.rwW[rw.dataset.btrw] ||= {})[rw.dataset.i] = rw.dataset.w; return zeichne(); }
      if (t.closest('[data-btrwok]')) { const h = t.closest('[data-btrwok]').dataset.btrwok; return rueckweg(+h, Z.rwW[h] || {}); }
      if (t.closest('[data-btrwab]')) return rueckweg(+t.closest('[data-btrwab]').dataset.btrwab, {});
      if (t.closest('[data-btzeichner]')) return zeichnerZeigen();
      if (t.closest('[data-btteil]')) { Z.teil = t.closest('[data-btteil]').dataset.btteil; return zeichne(); }
      if (!id) return;
      const z = L().zeilen.find((x) => x.id === id);
      if (t.closest('[data-btst]')) return zeile(id, { status: t.closest('[data-btst]').dataset.btst });
      if (t.closest('[data-btauf]')) { Z.auf = Z.auf === id ? null : id; return zeichne(); }
      if (t.closest('[data-btbest]') && id) return zeile(id, { bestaetigt: true });
      if (t.closest('[data-btwie]') && id) {
        const z = L().zeilen.find((x) => x.id === id), A = L().zeilen.filter((x) => x.id !== id && x.vorlage && !x.entfaellt && (x.kg || '').slice(0, 2) === (z.kg || '').slice(0, 2));
        if (!A.length) return sag('Keine andere Zeile mit Aufbau in dieser Gruppe.');
        return pickMenu(t.closest('[data-btwie]'), { items: A.map((x) => ({ value: x.id, title: `${x.kuerzel ? '„' + x.kuerzel + '“' : x.name} – ${x.kurz}` })), onPick: (v) => zeile(id, { wie: v }) });
      }
      if (t.closest('[data-btvlauf]')) { Z.vlAuf = Z.vlAuf === id ? null : id; return editor(true); }
      if (t.closest('[data-btkg]')) { Z.kg[id] = t.closest('[data-btkg]').dataset.btkg + '0'; return editor(true); }
      if (t.closest('[data-btweg]')) return handWeg(id);
      if (t.closest('[data-btart]') && z) return pickMenu(t.closest('[data-btart]'), { items: artWahl(z).map(([k, n]) => ({ value: k, title: n + (k === z.kg ? ' ✓' : '') })), onPick: (v) => zeile(id, { kg: v }) });   // gleiche Art = bestätigt (Hinweis weg)
      if (t.closest('[data-bteh]') && z) return pickMenu(t.closest('[data-bteh]'), { items: EINHEITEN.map((e) => ({ value: e, title: e })), onPick: (v) => (v === z.einheit ? null : zeile(id, { einheit: v })) });
      if (t.closest('[data-btvl]')) {   // Zeile von Hand mit gewählter Einheit: rechnet der Aufbau anders, fragt die Zeile nach (B1)
        Z.vlAuf = null;   // gewählt: Auswahl klappt wieder zu
        const vid = t.closest('[data-btvl]').dataset.btvl, v = z && z.bereich === 'hand' && z.einheit_hand ? ((await vorlagen(Z.kg[id] || z.kg)) || []).find((x) => x.id === vid) : null;
        if (v && v.einheit && v.einheit !== z.einheit) { const r = await bpFrage(`Der Aufbau „${v.name}“ rechnet in ${v.einheit}, die Zeile in ${z.einheit}.`, { ok: `Auf ${v.einheit} umstellen`, drei: `${z.einheit} behalten`, abbrechen: 'Abbrechen' });
          return r === true || r === 'drei' ? zeile(id, { vorlage: vid, einheit: r === true ? v.einheit : z.einheit }) : null; }
        return zeile(id, { vorlage: vid });
      }
      if (t.closest('[data-btmat]') && z) { const b = t.closest('[data-btmat]'), i = +b.dataset.btmat, s = Z.vl && Z.vl.schichten[i], o = s && s.optionen[(z.wahl || [])[i]], gl = o && o.mat === b.dataset.mat;
        return schichtSetzen(id, i, b.dataset.mat, gl ? (z.dicken || {})[i] || o.dicke : (o && ((z.dicken || {})[i] || o.dicke)), gl ? (z.ausf || {})[i] || o.ausf : ''); }   // anderes Material: Stärke behalten, Ausführung der Option
      if (t.closest('[data-btop]') && z) { const [i, j] = t.closest('[data-btop]').dataset.btop.split('.').map(Number); const w = [...(z.wahl || [])]; w[i] = j; return zeile(id, { wahl: w }); }
    };
    el.onclick = klick;
    const wechsel = async (e) => {
      const t = e.target;
      if (t.matches('[data-btrws]')) {
        try { const d = await (await J(`${basis}/rueckweg/schalter`, 'PUT', { [t.dataset.btrws]: t.checked })).json(); Z.rw = { ...Z.rw, schalter: d.schalter }; Z.d = await (await J(basis)).json();
          sag(t.checked ? `${APPN[t.dataset.btrws]}: Änderungen kommen als Vorschlag ins Modell.` : `${APPN[t.dataset.btrws]}: Änderungen bleiben in der App.`); } catch (er) { sag(er.message, true); t.checked = !t.checked; }
        return;
      }
      if (t.matches('[data-btdk]') || t.matches('[data-btau]')) {   // Stärke oder Ausführung: Liste oder eigener Wert
        const id = t.closest('[data-btz]').dataset.btz, i = +(t.dataset.btdk ?? t.dataset.btau), z = L().zeilen.find((x) => x.id === id), s = Z.vl && Z.vl.schichten[i], o = s && z && s.optionen[(z.wahl || [])[i]];
        if (!o) return;
        let d = (z.dicken || {})[i] || o.dicke, a = (z.ausf || {})[i] || o.ausf || '';
        if (t.matches('[data-btdk]')) {
          d = parseFloat(t.value);
          if (t.value === 'eigen') {
            const e = window.bpEingabe ? await bpEingabe('Stärke in cm (0,5 bis 60, halbe cm möglich)', dz((z.dicken || {})[i] || o.dicke)) : null;
            d = Math.round(parseFloat(String(e || '').replace(',', '.')) * 2) / 2;
            if (!(d >= 0.5 && d <= 60)) { if (e) sag('Bitte eine Stärke von 0,5 bis 60 cm.', true); return editor(true); }
          }
        } else {
          a = t.value;
          if (a === 'eigen') {
            const e = window.bpEingabe ? await bpEingabe(`${((s.mats || {})[o.mat] || {}).ausf || 'Ausführung'} – eigener Wert (wird fürs Büro gemerkt)`, (z.ausf || {})[i] || o.ausf || '') : null;
            a = String(e || '').trim().slice(0, 40); if (!a) return editor(true);
          }
        }
        return schichtSetzen(id, i, o.mat, d, a);
      }
      if (t.matches('[data-btmwvl]') && t.value) return mwAendern({ vorlage: t.value });
      if (t.matches('[data-btmwber]')) return mwAendern({ berechnen: t.checked });
      if (t.matches('[data-btber]')) return zeile(t.closest('[data-btz]').dataset.btz, { berechnen: t.checked });
      if (t.matches('[data-btname]')) { const n = String(t.value).trim(), z0 = L().zeilen.find((x) => x.id === t.closest('[data-btz]').dataset.btz); if (!n || !z0 || n === z0.name) { if (z0) t.value = z0.name; return; } return zeile(z0.id, { name: n }); }
      if (t.matches('[data-btmenge]')) return zeile(t.closest('[data-btz]').dataset.btz, { menge: parseFloat(String(t.value).replace(/\./g, '').replace(',', '.')) || 0 });
      if (!t.matches('[data-btdatei]') || !t.files[0]) return;
      const f = t.files[0], aus = Z.ausgabe; Z.ausgabe = false; t.value = '';
      const fd = new FormData(); fd.append('datei', f, f.name);
      if (aus) return ausgeben(fd);
      lesen(fd);
    };
    el.onchange = wechsel;
    function ifcDa(Q) { return !!Q.planstand && (Q.art || 'ifc') === 'ifc'; }   // IFC ausgeben nur mit gültigem IFC-Planstand (sonst gibt es keine Datei)
    async function ausgeben(was) {
      if (Z.laeuft) return; Z.laeuft = true;
      const stop = warte('IFC wird geschrieben …');
      try {
        const r = await J(`${basis}/bauteile/ifc`, 'POST', was), b = await r.blob();
        const m = /filename\*=UTF-8''([^;]+)/.exec(r.headers.get('Content-Disposition') || ''), a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = m ? decodeURIComponent(m[1]) : 'modell-massnahmen.ifc'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        sag('IFC mit Maßnahmen erstellt – Nummern, Status und Aufbau stehen in den Bauteilen.');
      } catch (er) {
        if (er.status === 409 && !(was instanceof FormData)) { sag(er.message); Z.ausgabe = true; const f = el.querySelector('[data-btdatei]'); if (f) f.click(); }   // älterer Planstand ohne gespeicherte Datei
        else sag(er.message, true);
      } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    }
    /* Baumtabelle (Gebäudemodell, GO 16.11.2026 „wie alle Apps“): Bereich → Zeile → aus Anweisungen abgeleitete Zeile; Antwort, Aufbau und
       Optionen rechts unter „Details“ (details(box)); die Knöpfe stehen in der Befehlsleiste der App (api unten). */
    const KL = window.bpBaum ? bpBaum.klapp({ key: 'gm.bauteile.' + pid }) : null;
    const ganzVerteilt = (z) => z.menge_basis != null && !z.anzahl && z.verteilt;
    function baumZeichnen() {
      const Li = L(), [ZZ, tw] = teilFilter((Li.zeilen || []).filter((z) => !ganzVerteilt(z))), nRw = ((Z.rw && Z.rw.vorschlaege) || []).length, leer = !ZZ.length;
      const an = Z.an ? `<div class="bt-an"><span>Du siehst <b>${esc(Z.an.name)}</b> – gilt nicht. Gegenüber dem gültigen: ${Z.an.abgleich.neu.length} neu · ${Z.an.abgleich.geaendert.length} geändert · ${Z.an.abgleich.entfaellt.length} entfällt.</span>
        <button type="button" class="btn" data-btzurueck>Zurück zum gültigen</button><button type="button" class="btn primary" data-btgilt>Diesen Planstand gelten lassen</button></div>` : '';
      const rwl = nRw && !Z.an ? `<div class="bt-rwl"><span>${nRw} Vorschl${nRw === 1 ? 'ag' : 'äge'} fürs Modell (aus den Apps${(Z.rw.vorschlaege || []).some((h) => h.daten && h.daten.extern) ? ' und der externen KI' : ''})</span><button type="button" class="btn sm" data-btrwzeig>ansehen</button></div>` : '';
      const nZ = !Z.an && Li.zeilen ? zeichnerListe().length : 0;
      const zl = nZ ? `<div class="bt-rwl"><span>${nZ} Hinweis${nZ === 1 ? '' : 'e'} an den Zeichner (Plan und Modell weichen ab, Kürzel fehlen)</span><button type="button" class="btn sm" data-btzeichner>ansehen</button></div>` : '';
      const zeilenHtml = (z, t) => {
        const fr = z.bereich === 'frage', w = (fr ? WORT_FRAGE : WORT)[z.status] || z.status;
        const menge = fr && !z.menge ? '<span title="kommt, sobald Fläche oder Räume bekannt sind (Assistent, Plan oder von Hand)">–</span>' : `${zahl(z.menge)}&nbsp;${esc(z.einheit)}`;
        return `<tr data-btz="${esc(z.id)}" class="${Z.sel === z.id ? 'akt' : ''}${Z.mw.includes(z.id) ? ' bt-mwz' : ''}${z.status === 'offen' ? ' offen' : ''}${z.entfaellt ? ' weg' : ''}${z.ergaenzt ? ' bt-erg' : ''}">${bpBaum.zelle({ tiefe: t, html: `${Z.an ? '' : `<input type="checkbox" class="bt-mwh" data-btmw${Z.mw.includes(z.id) || (!Z.mw.length && Z.sel === z.id) ? ' checked' : ''} title="Mehrere Zeilen wählen und gemeinsam ändern" aria-label="${esc(z.name)} wählen">`}<span class="bt-tn">${esc(mitTeil(z))}</span>${z.einordnung ? `<small class="bt-nr"> ${esc(z.einordnung)}</small>` : ''}${typeof bpWk === 'function' ? bpWk([z.name, z.material]) : ''}${(z.nummern || []).length && t < 2 ? `<small class="bt-nr"> ${esc(z.nummern.length > 6 ? z.nummern[0] + ' … ' + z.nummern[z.nummern.length - 1] : z.nummern.join(' · '))}</small>` : ''}` })}
          <td class="r">${z.bereich === 'hand' && !z.menge ? '<span class="bt-chip gelb" title="Menge fehlt – die Zeile wird mit 0 gerechnet. Eintragen rechts unter „Details“.">Menge fehlt</span>' : menge}</td><td><span class="bt-chip${z.status === 'offen' ? ' bt-ext' : ''}">${esc(w)}</span>${z.ergaenzt ? ' <span class="bt-chip gelb" title="Neben dem Plan ergänzt">ergänzt</span>' : ''}${z.entfaellt ? ' <span class="bt-chip">entfällt</span>' : ''}${z.kuerzel && !z.bestaetigt && !z.entfaellt ? ' <span class="bt-chip gelb" title="Aufbau aus dem Kürzel im Plan – bitte bestätigen">bestätigen</span>' : ''}</td>
          <td class="bt-kz" title="${esc(z.kurz || '')}">${esc(z.kurz || (z.berechnen ? 'kein Aufbau' : ''))}</td><td class="r" data-btu="${esc(z.id)}"></td><td class="c"><input type="checkbox" data-btber title="wird berechnet (Kosten, LV)"${z.berechnen ? ' checked' : ''}${z.status === 'offen' || Z.an ? ' disabled' : ''}></td></tr>`;
      };
      /* Eine Baumtabelle für alles (17.11.2026, „konsequent“): alle Bereiche und Gruppen stehen immer da – leer mit 0 und „＋ Zeile“, gefüllt
         klappbar; „＋ Zeile“ am Kopf jeder Gruppe, in die man von Hand etwas eintragen kann. Ohne Zeilen oben die Meldung wie in allen Apps. */
      const plus = (kg, g) => (Z.an ? '' : ` <button type="button" class="bt-plus" data-bthand data-kg="${kg}" data-gruppe="${esc(g)}" title="Bauteil von Hand in „${esc(g)}“ anlegen">＋ Zeile</button>`);
      const kopfZ = (R, t, k, tiefe, extra) => {
        const zu = R.length && KL && KL.zu(k), offen = R.filter((z) => z.status === 'offen' && !z.entfaellt).length;
        return [zu, `<tr class="bt-bh">${bpBaum.zelle({ tiefe, auf: R.length ? !zu : null, klapp: R.length ? k : null, html: `<b>${esc(t)}</b> <small class="bt-nr">${R.length}${offen ? ` · <span class="bt-ro">${offen} offen</span>` : ''}</small>${extra || ''}` })}<td colspan="5"></td></tr>`];
      };
      const ort = (z) => z.bereich !== 'hand' ? z.bereich : /^3[2-6]/.test(z.kg || '') ? 'rohbau' : /^41/.test(z.kg || '') ? 'ausbau' : 'hand';   // „＋ Zeile“ in einer Gruppe: die Zeile steht dort
      const PLUS = { ausbau: '412', hand: '300' };
      let body = '';
      for (const [b, t] of BEREICH) {
        const R = ZZ.filter((z) => ort(z) === b);
        if (!R.length && (b === 'hand' || (b === 'leistung' && !leer))) continue;   // „Von Hand“ nur mit Zeilen; Leistungen ohne Bauteil kommen aus den Apps
        const [zu, k] = kopfZ(R, t, 'b:' + b, 0, PLUS[b] ? plus(PLUS[b], t) : ''); body += k;
        if (b === 'frage' && !R.length) { body += `<tr><td colspan="6" class="bt-start"><button type="button" class="btn sm" data-btstart${Z.an ? ' disabled' : ''}>Fragen beantworten …</button> <span class="bt-nr">Was ein Plan nicht zeigt (Elektro, Heizung, Leitungen, Baustelle …) – die Mengen kommen, sobald Fläche oder Räume bekannt sind</span></td></tr>`; continue; }
        if (zu) continue;
        if (b !== 'rohbau') { body += R.map((z) => zeilenHtml(z, z.abgeleitet ? 2 : 1)).join(''); continue; }
        const rest = new Set(R);   // Rohbau nach Bauteilen (A1, 17.11.2026): Gründung, Außenwände, Innenwände, Treppen, Decken, Dach, Sonstiges
        for (const [g, tg, kgg, fn] of ROHG) {
          const RG = R.filter((z) => rest.has(z) && fn(z)); RG.forEach((z) => rest.delete(z));
          const [zg, kg] = kopfZ(RG, tg, 'r:' + g, 1, plus(kgg, tg)); body += kg; if (!zg) body += RG.map((z) => zeilenHtml(z, z.abgeleitet ? 3 : 2)).join('');
        }
        if (rest.size) { const RS = [...rest], [zs, ks] = kopfZ(RS, 'Sonstiges', 'r:so', 1); body += ks; if (!zs) body += RS.map((z) => zeilenHtml(z, z.abgeleitet ? 3 : 2)).join(''); }
      }
      const meldung = leer && typeof bpLeer === 'function' ? bpLeer({ was: 'kein Gebäudemodell', text: 'Mit Plan oder ohne: aus der Planung, Räume und Fenster selbst eintragen, einzelne Bauteile oder einen Plan einlesen (IFC, DXF, PDF).', knoepfe: [{ t: 'Anfangen …', attrs: 'data-btanfang' }] }) : '';
      const y = el.querySelector('.bt-bw') ? el.querySelector('.bt-bw').scrollTop : 0;
      const mwl = Z.mw.length > 1 && !Z.an ? `<div class="bt-mwl">${mwHtml(true)}</div>` : '';   // H1: gemeinsam ändern über der Tabelle
      el.innerHTML = `<div class="bt-bl">${an}${rwl}${zl}${tw}${meldung}${mwl}<div class="bt-w"></div><div class="bt-bw"><table class="bp-baum bt-baum${leer ? ' bt-gerust' : ''}"><thead><tr><th>Bauteil</th><th class="r">Menge</th><th>Antwort</th><th>Aufbau</th><th class="r" title="U-Wert aus dem gewählten Aufbau, W/(m²K) – Farbe nach GModG (Neubau: Referenzgebäude, Bestand: Anlage 7)">U</th><th class="c" title="wird berechnet">€</th></tr></thead><tbody>${body}</tbody></table></div>
        <input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div>`;
      el.querySelector('.bt-bw').scrollTop = y;
    }
    if (opt.baum && window.bpBaum) {
      bpBaum.klappbar(el, { klapp: () => KL, neu: () => baumZeichnen(), alle: () => BEREICH.map(([b]) => 'b:' + b).concat(ROHG.map(([g]) => 'r:' + g), ['r:so']) });
      bpBaum.tasten({ wurzel: '.bt-baum > tbody', zeilen: 'tr[data-btz]', waehle: (z) => z.querySelector('td').click(), loesche: (tr) => handWeg(tr.dataset.btz) });
      /* Zeilen von Hand auch im Baum ändern (20.11.2026: „lassen sich weder bearbeiten noch löschen“ – ging nur rechts in den Details): Kontextmenü, F2, Entf */
      KONTEXT = (e) => { const tr = e.detail.ziel.closest && e.detail.ziel.closest('tr[data-btz]'); if (!tr || !el.contains(tr) || Z.an) return;
        const z = L().zeilen.find((x) => x.id === tr.dataset.btz); if (!z || !HAND.includes(z.bereich)) return;
        e.detail.punkte.push({ titel: z.name }, { text: 'Umbenennen …', k: 'F2', fn: () => handName(z.id) }, { text: 'Entfernen', k: 'Entf', gefahr: true, fn: () => handWeg(z.id) }); };   // ein Lauscher für die Seite (unten), immer der zuletzt aufgebaute Baum
      el.addEventListener('keydown', (e) => { if (e.key !== 'F2' || !Z.sel || Z.an || (window.bpTippt && bpTippt(e.target))) return; e.preventDefault(); handName(Z.sel); });
    }
    const ladeJs = (n, da) => (da() ? Promise.resolve() : new Promise((ok) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + n + v; sc.onload = ok; sc.onerror = ok; document.head.appendChild(sc); }));
    const raumbuchJs = () => ladeJs('raumbuch.js', () => window.bpRaumbuch);
    const uFuellen = (w) => { if (w && Z.d && !Z.an) ladeJs('uwert.js', () => window.bpUwert).then(() => window.bpUwert && bpUwert.fuellen(w, basis, Z.d.rev, { name: (id) => ((G().zeilen || []).find((x) => x.id === id) || {}).name || id, setzen: (id, v) => zeile(id, v) })); };   // U-Werte (bp/uwert.js, UW-A1)
    function detailsZeichnen() {
      const box = Z.det; if (!box || !box.isConnected) return;
      if (Z.mw.length > 1) { box.innerHTML = `<div class="bt-l bt-mwd">${mwHtml(false)}</div>`; return; }
      if (Z.sel === '__rw') { box.innerHTML = `<div class="bt-l">${rueckwegHtml() || '<p class="bt-leer">Keine offenen Vorschläge.</p>'}</div>`; return; }
      const z = L().zeilen.find((x) => x.id === Z.sel);
      if (!z) { box.innerHTML = '<div class="bt-l"><p class="bt-leer">Links eine Zeile antippen – hier stehen Antwort, Aufbau mit Optionen, „wird berechnet“ und die Fenster, Türen oder Räume der Zeile.</p></div>'; return; }
      const D = Z.d.modell.bauteilliste || {}, E = (D.elemente || []).filter((e) => (z.mitglieder || []).includes(String(e.id))), R = (D.raeume || []).filter((r) => z.bereich === 'raum' && (z.mitglieder || []).includes(r.nr));
      const m = (v) => (v == null ? '–' : zahl(v));
      const liste = E.length ? `<table class="bt-el"><thead><tr><th>Nr.</th><th>Art</th><th>Geschoss</th><th>Raum</th><th class="r">B × H</th><th class="r">Brüstung</th></tr></thead><tbody>${E.map((e) => `<tr><td>${esc(e.nr)}</td><td>${esc(e.typ)}</td><td>${esc(e.geschoss)}</td><td>${esc((e.raeume || []).join(' → '))}</td><td class="r">${m(e.b)} × ${m(e.h)}</td><td class="r">${m(e.bruestung)}</td></tr>`).join('')}</tbody></table>`
        : R.length ? '<div data-btrb></div>' : '';   // Räume: Raumbuch – Boden, Wand, Decke je Raum (bp/raumbuch.js, erst hier geladen)
      let sc = box; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const y = sc && sc !== document.body ? sc.scrollTop : null;   // Details neu gezeichnet: Rollposition bleibt (kein Springen nach jeder Wahl)
      box.innerHTML = `<div class="bt-l">${zeileHtml(z)}<div data-btuw="${esc(z.id)}"></div>${z.anweisung === 'raumbuch' ? '<div class="bt-h">Aus dem Raumbuch – ändern unten je Raum.</div>' : z.abgeleitet ? '<div class="bt-h">Aus einer Anweisung an das Modell – zurücknehmen unter „Anweisungen“.</div>' : ''}${liste}</div>`;
      const rb = box.querySelector('[data-btrb]');
      uFuellen(box);
      if (rb) raumbuchJs().then(() => window.bpRaumbuch && bpRaumbuch.mount(rb, { basis, rev: Z.d && Z.d.rev, sel: R.map((r) => r.nr), neu: (d) => api.neu(d) }));
      if (y != null) sc.scrollTop = y;
      if (Z.auf === z.id) editor().then(() => { if (y != null) sc.scrollTop = y; });
    }
    /* Mehrere Bauteile gemeinsam (GO 20.11.2026, Mock „Gebäudemodell schlank“ H1): Haken in der Tabelle, Strg + Klick, im 3D mit Strg oder Rahmen
       (api.mehr). Rechts und über der Tabelle dieselben Felder: Antwort, Aufbau, „wird berechnet“ – „verschieden“, wo die Gewählten abweichen;
       jede Änderung gilt für alle, ein Rückgängig für alle. */
    const mwZ = () => Z.mw.map((id) => L().zeilen.find((x) => x.id === id)).filter(Boolean);
    function mwSetzen(ids) { Z.mw = [...new Set(ids)].filter((id) => L().zeilen.some((x) => x.id === id)); if (Z.mw.length === 1) { Z.sel = Z.auf = Z.mw[0]; Z.mw = []; } zeichne(); if (opt.mehr) opt.mehr(Z.mw.length ? Z.mw : Z.sel ? [Z.sel] : []); }
    function mwUm(id, mitSel) { const A = Z.mw.length ? [...Z.mw] : mitSel && Z.sel && Z.sel !== '__rw' ? [Z.sel] : []; const i = A.indexOf(id); if (i >= 0) A.splice(i, 1); else A.push(id); if (!A.length) { Z.sel = null; } mwSetzen(A); }
    function mwHtml(kompakt) {
      const R = mwZ(); if (R.length < 2) return '';
      const gl = (f) => (R.every((z) => z[f] === R[0][f]) ? R[0][f] : undefined), versch = '<span class="bt-mwv">verschieden</span>';
      const erl = (R[0].erlaubt || []).filter((s) => R.every((z) => (z.erlaubt || []).includes(s))), st = gl('status'), ber = gl('berechnen'), vl = gl('vorlage');
      const k2 = String(R[0].kg || '').slice(0, 2), einKg = k2 && R.every((z) => String(z.kg || '').slice(0, 2) === k2), V = einKg ? Z.vorlD[k2] : null;
      if (einKg && !V && !Z.mwL) { Z.mwL = true; vorlagen(k2).then(() => { Z.mwL = false; zeichne(); }, () => { Z.mwL = false; }); }
      const ant = erl.length ? `${erl.map((s) => `<button type="button" data-btmwst="${s}" class="${st === s ? 'on' : ''}">${esc(WORT[s] || s)}</button>`).join('')}${st === undefined ? ' ' + versch : ''}` : '<span class="mute">keine gemeinsame Antwort</span>';
      const auf = einKg ? `<select data-btmwvl aria-label="Aufbau für alle"><option value="">${vl ? esc(R[0].kurz || 'gewählter Aufbau') : 'verschieden – für alle wählen …'}</option>${(V || []).filter((v) => v.id !== vl || true).map((v) => `<option value="${esc(v.id)}"${v.id === vl ? ' selected' : ''}>${esc(v.name)}</option>`).join('')}</select>` : '<span class="mute">verschiedene Bauteilarten – Aufbau je Zeile</span>';
      const be = `<label class="bt-mwb"><input type="checkbox" data-btmwber${ber ? ' checked' : ''}${ber === undefined ? ' data-mix' : ''}> wird berechnet${ber === undefined ? ' ' + versch : ''}</label>`;
      if (kompakt) return `<b>${R.length} gewählt:</b><span class="bt-mwg"><span class="mute">Antwort</span>${ant}</span><span class="bt-mwg"><span class="mute">Aufbau</span>${auf}</span>${be}<button type="button" class="btn sm" data-btmwweg>Auswahl aufheben</button>`;
      return `<h3 class="bt-mwt">${R.length} Bauteile gewählt</h3><p class="bt-nr">${R.slice(0, 8).map((z) => esc(z.name)).join(' · ')}${R.length > 8 ? ` · … ${R.length - 8} weitere` : ''}</p>
        <div class="bt-o"><span>Antwort</span>${ant}</div><div class="bt-o"><span>Aufbau</span>${auf}</div><div class="bt-o"><span></span>${be}</div>
        <p class="bt-h">Jede Änderung hier gilt für alle ${R.length}. „verschieden“ = die Gewählten haben verschiedene Werte; wählst du einen, gilt er für alle. Mit Strg + Klick weitere dazu oder weg.</p>
        <button type="button" class="btn sm" data-btmwweg>Auswahl aufheben</button>`;
    }
    async function mwAendern(neu) {
      const R = mwZ(); if (!R.length) return;
      const alt = R.map((z) => [z.id, Object.fromEntries(Object.keys(neu).map((k) => [k, z[k]]).concat('status' in neu ? [['vorlage', z.vorlage], ['wahl', [...(z.wahl || [])]], ['berechnen', z.berechnen]] : 'vorlage' in neu ? [['wahl', [...(z.wahl || [])]]] : []))]);
      const lauf = async (L2) => { for (const [id, v] of L2) await zeile(id, v, true); };
      const stop = warte(`${R.length} Bauteile werden geändert …`);
      try { await lauf(R.map((z) => [z.id, neu])); } finally { stop(); }
      sag(`${R.length} Bauteile geändert.`);
      if (window.rueckgaengig) rueckgaengig(`${R.length} Bauteile geändert`, () => lauf(alt), 10000, () => lauf(R.map((z) => [z.id, neu])));
    }
    const handZ = (id) => { const z = L().zeilen.find((x) => x.id === id); return z && HAND.includes(z.bereich) && !Z.an ? z : null; };
    async function handWeg(id) { const z = handZ(id); if (!z) return sag('Nur Zeilen von Hand lassen sich entfernen – Bauteile aus dem Plan entfallen mit dem nächsten Planstand.'); const alt = { ...z, wahl: [...(z.wahl || [])] };
      await zeile(id, { loeschen: true }); if (Z.sel === id) { Z.sel = Z.auf = null; zeichne(); if (opt.auswahl) opt.auswahl(null); } sag(`„${z.name}“ entfernt.`);
      if (window.rueckgaengig) rueckgaengig(`„${alt.name}“ entfernt`, async () => {   // zurück: Zeile neu anlegen und Menge, Antwort, Aufbau wieder setzen (neue Kennung)
        neu(await (await J(`${basis}/bauteile/hand`, 'POST', { name: alt.name, kg: alt.kg || '', ...(alt.einheit_hand ? { einheit: alt.einheit } : {}) })).json()); const n = L().zeilen[L().zeilen.length - 1]; if (!n) return;
        await zeile(n.id, { menge: alt.menge || 0, status: alt.status, berechnen: !!alt.berechnen, ...(alt.vorlage ? { vorlage: alt.vorlage, wahl: alt.wahl, ...(alt.dicken ? { dicken: alt.dicken } : {}), ...(alt.ausf ? { ausf: alt.ausf } : {}) } : {}) }, true); }); }
    async function handName(id) { const z = handZ(id); if (!z || !window.bpEingabe) return; const n = await bpEingabe('Name des Bauteils', z.name); if (n && String(n).trim() && String(n).trim() !== z.name) return zeile(id, { name: String(n).trim() }); }
    async function anfang() {   // D1: ein Fenster, vier Wege
      const plan = !!(((Z.d && Z.d.modell) || {}).assistent || {}).type, gm = ((H.conf || {}).apps || []).find((a) => a.key === 'gebaeudemodell'), w = await anfangen({ plan });
      const hin = (h) => { if (gm) location.href = `${H.appUrl(gm)}/#${h}`; };
      if (w === 'planung') return tue(plan ? 'data-btplan' : 'data-btplanung');
      if (w === 'raeume') return opt.raeume ? opt.raeume() : hin('raeume');
      if (w === 'zeilen') return tue('data-bthand');
      if (w === 'lesen') return opt.einlesen ? einlesen() : hin('bauteile');
    }
    const tue = (attr) => { const b = document.createElement('button'); b.setAttribute(attr, ''); return klick({ target: b }); };
    const api = {
      laden, menue, verfeinern, einlesen, anfang,
      hand: () => tue('data-bthand'), aufraeumen: () => tue('data-btweg-alle'), ausgeben: () => tue('data-btaus'),
      gelten: () => (Z.an ? aendern(Z.an.id, { gilt: true }, 'Der Planstand gilt jetzt – die Apps arbeiten damit.') : null),
      details(box) { Z.det = box; box.onclick = klick; box.onchange = wechsel; box.addEventListener('toggle', blkMerk, true); detailsZeichnen(); },
      zustand: () => ({ an: Z.an, ifc: ifcDa(G().quelle || {}), plan: !!(G().quelle || {}).planstand && ((G().quelle || {}).art || 'ifc') !== 'hand', planart: (G().quelle || {}).art || '', zeilen: L().zeilen, weg: G().zeilen.filter((z) => z.entfaellt).length, extern: !!(Z.rw && Z.rw.extern), sel: Z.sel, modell: Z.d && Z.d.modell, rev: Z.d && Z.d.rev }),
      mehr(ids) { mwSetzen(ids || []); },   // im 3D mehrere gewählt (Zeilen-Kennungen)
      mehrfach: () => [...Z.mw],
      zeige(id, rollen) { Z.mw = []; Z.sel = id; Z.auf = id; zeichne(); const r = rollen && el.querySelector(`[data-btz="${CSS.escape(id)}"]`); if (r) r.scrollIntoView({ block: 'nearest' }); },   // rollen: aus der 3D-Ansicht gewählt – die Zeile ins Bild
      neu(d) { Z.d = d; zeichne(); },
      entwurf: (e) => (e.erster ? uebernehmen(e, {}, e.name) : abgleich(e)),   // Planstand von außen (Assistent: bpcore/modell_hand.py) – wie nach dem Einlesen
    };
    el.innerHTML = '<div class="bt-l"><div class="bt-w">Lade …</div></div>';
    laden().catch((e) => { el.innerHTML = `<div class="bt-l"><p class="bt-leer">${esc(e.message)}</p></div>`; });
    return api;
  }
  window.bpBauteile = { mount, ausPlanung, anfangen };
}());
