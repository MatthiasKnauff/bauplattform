'use strict';
/* =====================================================================
   Teilen ohne Anmeldung – ein Fenster für alle Apps (Baukasten, erst bei Bedarf geladen über BPHead.teilen).
   Kopf mit Büro-Logo und Büro-Farbe (/api/bp/teilen/kopf), Voreinstellungen (/api/bp/teilen/vorlagen?app=…: vom Büro –
   nur die Verwaltung ändert sie – und eigene), Empfänger:in aus den Adressen (BPHead.kontaktFeld), Art (mitlaufend/fest),
   gültig bis, was zu sehen ist (Optionen der App), Liste der Links mit Kopieren · Senden (BPHead.unterlagenSenden) ·
   Öffnen · Zurückziehen · Löschen. Speichern tut die App (ihre Schnittstellen), gemeinsam ist die Tabelle bp_teilen.

   bpTeilen({
     app, titel, unter,                       app = Schlüssel der Voreinstellungen (z. B. 'gantt')
     arten: true,                              Auswahl mitlaufend / fester Stand anbieten
     sicht: [{ k, l, an, tip } | { k, l, wahl: [{ v, l }] }],   Optionen: Haken (wahr/falsch) oder Auswahl (Text, '' = alle)
     url(token), liste() → [link], neu(werte) → link, aendern(token, werte) → link, loeschen(token)
                                                werte = { name, contact_id, art, ablauf, optionen }
     zeigt(link) → html (z. B. Versionen zum Umschalten), klick(e, link, neu zeichnen) → true, wenn erledigt
     mail(link) → { art, pid, projekt, betreff, text }   für „✉ Senden“ (der Link steht im Text)
   })
   ===================================================================== */
(() => {
  if (window.bpTeilen) return;
  const H = window.BPHead || {}, esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const meld = (t, f) => (window.toast ? toast(t, f) : window.bpHinweis && bpHinweis(t));
  const de = (s) => (s ? new Date(s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');
  const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const call = async (u, m = 'GET', b) => { const r = await fetch(u, { method: m, credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Fehler ' + r.status); return d; };
  const css = document.createElement('style');
  css.textContent = `.bpt{width:min(50rem,96vw);max-height:calc(100vh - 24px);display:flex;flex-direction:column;padding:0;overflow:hidden;--bf:#2f5fb3}
.bpt-k{display:flex;gap:.8rem;align-items:center;padding:.8rem 1rem;color:#fff;background:linear-gradient(120deg,var(--bf),color-mix(in srgb,var(--bf) 55%,#14b8a6))}
.bpt-k img{max-height:2.4rem;max-width:8rem;background:#fff;border-radius:calc(6px*var(--rk,1));padding:.2rem .35rem}.bpt-k h3{margin:0;font-size:1.08rem}.bpt-k small{opacity:.9}
.bpt-k>div{flex:1;min-width:0}.bpt-k small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bpt-k button{border:0;background:rgba(255,255,255,.18);color:#fff;font-size:1.1rem;font-weight:700;border-radius:999px;width:2rem;height:2rem;cursor:pointer}
.bpt-r{overflow:auto;padding:.8rem 1rem;display:flex;flex-direction:column;gap:.7rem}
.bpt-neu{border:2px solid color-mix(in srgb,var(--bf) 45%,transparent);border-radius:calc(10px*var(--rk,1));padding:.65rem .8rem;display:grid;gap:.55rem;background:color-mix(in srgb,var(--bf) 4%,transparent)}
.bpt-z{display:grid;grid-template-columns:7.5rem 1fr;gap:.6rem;align-items:center}.bpt-z>b{font-size:.74rem;text-transform:uppercase;letter-spacing:.05em;color:var(--mute,#666)}
.bpt-w{display:flex;flex-wrap:wrap;gap:.35rem .8rem;align-items:center}.bpt-w label{display:inline-flex;gap:.3rem;align-items:center}
.bpt-v{font:inherit;font-size:.85em;border:1.5px solid var(--vf,var(--line,#ccc));background:none;color:inherit;border-radius:calc(999px*var(--rkp,1));padding:.12rem .7rem;cursor:pointer}
.bpt-v.on{background:var(--vf,var(--bf));border-color:var(--vf,var(--bf));color:#fff;font-weight:600}.bpt-v .x{margin-left:.35rem;opacity:.7}
.bpt-l{border:1px solid var(--line,#ddd);border-left:4px solid var(--bf);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;display:grid;gap:.35rem}.bpt-l.aus{opacity:.6;border-left-color:#c33}
.bpt-lk{display:flex;gap:.5rem;align-items:baseline;flex-wrap:wrap}.bpt-lk .bph-mu{margin-left:auto}
.bpt-a{font-size:.74em;border:1px solid currentColor;border-radius:999px;padding:0 .5rem}.bpt-a.fest{color:#c07a12}.bpt-a.mit{color:var(--bf)}.bpt-a.aus{color:#c33}
.bpt-f{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;align-items:center}
.bpt .bpt-b{font:inherit;font-size:.86em;border:1px solid var(--line,#ccc);background:none;color:inherit;border-radius:calc(999px*var(--rkp,1));padding:.18rem .8rem;cursor:pointer}
.bpt .bpt-b:hover{border-color:var(--bf);color:var(--bf)}.bpt .bpt-b.pri{background:var(--bf);border-color:var(--bf);color:#fff;font-weight:600}.bpt .bpt-b.pri:hover{color:#fff;filter:brightness(1.08)}
[data-kf] .bph-kf{display:flex;width:100%}[data-kf] .bph-kf input{flex:1;min-width:0}
@media (max-width:560px){.bpt-z{grid-template-columns:1fr}}`;
  document.head.appendChild(css);

  window.bpTeilen = async function (o) {
    let L = [], V = [], buero = false, K = { farbe: '#2f5fb3', logo: '', buero: '' }, vw = null;   // vw: gewählte Voreinstellung
    const N = { kontakt: null, name: '', art: 'mit', ablauf: plus(14), sicht: {} };
    (o.sicht || []).forEach((s) => { N.sicht[s.k] = s.wahl ? '' : s.an !== false; });
    const bg = document.createElement('div'); bg.className = 'bph-dlg-bg';
    bg.innerHTML = `<div class="bph-dlg bpt" role="dialog" aria-label="${esc(o.titel || 'Teilen')}"><div class="bpt-k"></div><div class="bpt-r"><p class="bph-mu">Lade …</p></div></div>`;
    document.body.appendChild(bg);
    const root = bg.firstChild, kopfEl = root.querySelector('.bpt-k'), box = root.querySelector('.bpt-r');
    const zu = () => { bg.remove(); document.removeEventListener('keydown', esc1); };
    const esc1 = (e) => { if (e.key === 'Escape' && [...document.querySelectorAll('.bph-dlg-bg, .modal-bg, .bpv-bg')].pop() === bg) zu(); };
    document.addEventListener('keydown', esc1);
    const kopf = () => { root.style.setProperty('--bf', K.farbe);
      kopfEl.innerHTML = `${K.logo ? `<img src="${esc(K.logo)}" alt="">` : ''}<div><h3>${esc(o.titel || 'Teilen')}</h3><small>${esc([o.unter, K.buero].filter(Boolean).join(' · '))} – ansehen ohne Anmeldung, nichts ändern</small></div>
        <button type="button" aria-label="Schließen" data-bx>✕</button>`; };
    const sichtHtml = (S, key) => (o.sicht || []).map((s) => (s.wahl
      ? `<label>${esc(s.l)} <select data-${key}="${esc(s.k)}"><option value="">alle</option>${s.wahl.map((w) => `<option value="${esc(w.v)}"${S[s.k] === w.v ? ' selected' : ''}>${esc(w.l)}</option>`).join('')}</select></label>`
      : `<label title="${esc(s.tip || '')}"><input type="checkbox" data-${key}="${esc(s.k)}"${S[s.k] !== false ? ' checked' : ''}> ${esc(s.l)}</label>`)).join('');
    const neuHtml = () => `<div class="bpt-neu"><b>Neuer Link</b>
      <div class="bpt-z"><b>Voreinstellung</b><div class="bpt-w">${V.map((v) => `<button type="button" class="bpt-v${vw === v.id ? ' on' : ''}" data-vw="${v.id}" style="${v.farbe ? `--vf:${esc(v.farbe)}` : ''}"
          title="${v.buero ? 'Vom Büro' + (buero ? ' – Rechtsklick oder ✕ zum Löschen' : ' – ändern kann nur die Verwaltung') : 'Eigene Voreinstellung'}">${v.buero ? '🔒 ' : ''}${esc(v.name)}${!v.buero || buero ? '<span class="x" data-vx title="Voreinstellung löschen">✕</span>' : ''}</button>`).join('')}
        <button type="button" class="bpt-b" data-vneu title="Die Einstellungen unten als Voreinstellung merken">＋ als Voreinstellung speichern</button></div></div>
      <div class="bpt-z"><b>Für wen?</b><div data-kf></div></div>
      ${o.arten ? `<div class="bpt-z"><b>Stand</b><div class="bpt-w"><span class="seg" role="group" aria-label="Stand"><button type="button" data-na="mit" class="${N.art === 'mit' ? 'on' : ''}" title="Zeigt immer den aktuellen Stand">mitlaufend</button><button type="button" data-na="fest" class="${N.art === 'fest' ? 'on' : ''}" title="Zeigt genau den Stand von jetzt">fester Stand</button></span></div></div>` : ''}
      <div class="bpt-z"><b>Gültig bis</b><div class="bpt-w"><input type="date" data-nab value="${esc(N.ablauf)}"><span class="bph-mu">leer = unbegrenzt</span></div></div>
      ${(o.sicht || []).length ? `<div class="bpt-z"><b>Zu sehen</b><div class="bpt-w">${sichtHtml(N.sicht, 'ns')}</div></div>` : ''}
      <div class="bpt-f"><button type="button" class="bpt-b" data-nl>🔗 Link erstellen</button>${o.mail ? '<button type="button" class="bpt-b pri" data-nm>✉ Erstellen &amp; senden …</button>' : ''}</div></div>`;
    const zeile = (x) => `<div class="bpt-l${x.aktiv ? '' : ' aus'}" data-t="${esc(x.token)}">
      <div class="bpt-lk"><b>${esc((x.kontakt && x.kontakt.name) || x.name || 'Link vom ' + de(x.erstellt))}</b><span class="bpt-a ${esc(x.art)}">${x.art === 'fest' ? 'fester Stand' : 'mitlaufend'}</span>${x.aktiv ? '' : '<span class="bpt-a aus">zurückgezogen</span>'}
        <span class="bph-mu">${x.aufrufe ? `${x.aufrufe}× geöffnet, zuletzt ${de(x.zuletzt)}` : 'noch nicht geöffnet'}</span></div>
      ${o.zeigt ? `<div class="bpt-w">${o.zeigt(x)}</div>` : ''}
      <div class="bpt-w">${sichtHtml(x.optionen || {}, 'ls')}<label>gültig bis <input type="date" data-lab value="${esc(x.ablauf || '')}"></label></div>
      <div class="bpt-f"><button type="button" class="bpt-b" data-lk title="${esc(o.url(x.token))}">Link kopieren</button>${o.mail ? '<button type="button" class="bpt-b" data-lm>✉ Senden …</button>' : ''}
        <a class="bpt-b" href="${esc(o.url(x.token))}" target="_blank" rel="noopener noreferrer">Öffnen</a>
        <button type="button" class="bpt-b" data-lz>${x.aktiv ? 'Zurückziehen' : 'Wieder freigeben'}</button><button type="button" class="bpt-b" data-ld title="Link endgültig löschen">✕</button></div></div>`;
    const zeichne = () => {
      box.innerHTML = `${neuHtml()}${L.length ? `<b>Bisherige Links (${L.length})</b>${L.map(zeile).join('')}` : '<p class="bph-mu">Noch kein Link.</p>'}`;
      if (H.kontaktFeld) H.kontaktFeld(box.querySelector('[data-kf]'), { wert: N.name, kid: N.kontakt && N.kontakt.id, setzen: (k, t) => { N.kontakt = k || null; N.name = (k && k.name) || t || ''; } });
      else box.querySelector('[data-kf]').innerHTML = `<input type="text" data-kn value="${esc(N.name)}" placeholder="z. B. Rohbau Meyer, Bauherr:in" style="width:100%">`;
    };
    const kopieren = async (t) => { try { await navigator.clipboard.writeText(o.url(t)); meld('Link kopiert – z. B. in eine Mail einfügen.'); } catch { meld(o.url(t)); } };
    const ersetze = (x) => { L = L.map((y) => (y.token === x.token ? x : y)); };
    const aendern = async (t, w) => { try { ersetze(await o.aendern(t, w)); zeichne(); } catch (e) { meld(e.message, true); } };
    const senden = async (x) => {
      const m = o.mail(x) || {}, k = x.kontakt, u = o.url(x.token);
      const bis = x.ablauf ? ` (gültig bis ${de(x.ablauf)})` : '';
      await H.unterlagenSenden({ titel: m.titel || 'Link senden', art: m.art || 'unterlagen', pid: m.pid, projekt: m.projekt, was: [], link: u, kopie: false,
        an: k ? [{ name: k.name, email: k.email, contact_id: k.id, on: true }] : [],
        betreff: m.betreff || o.titel || 'Link zum Ansehen', text: (m.text || 'Guten Tag,\n\nüber diesen Link können Sie den aktuellen Stand ansehen – ohne Anmeldung:') + `\n${u}${bis}\n\nMit freundlichen Grüßen` });
    };
    const erstellen = async (dann) => {
      const kn = box.querySelector('[data-kn], [data-kfi]'); if (kn && !N.kontakt) N.name = kn.value.trim();
      try {
        const x = await o.neu({ name: N.name, contact_id: N.kontakt ? N.kontakt.id : null, art: N.art, ablauf: N.ablauf, optionen: { ...N.sicht } });
        L.unshift(x); N.kontakt = null; N.name = ''; zeichne();
        if (dann) await senden(x); else kopieren(x.token);
      } catch (e) { meld(e.message, true); }
    };
    const vorlageNehmen = (v) => { const p = v.optionen || {}; vw = v.id; N.art = p.art === 'fest' ? 'fest' : 'mit'; N.ablauf = p.tage ? plus(p.tage) : '';
      (o.sicht || []).forEach((s) => { if (p.sicht && s.k in p.sicht) N.sicht[s.k] = p.sicht[s.k]; }); zeichne(); };
    const vorlageSpeichern = async () => {
      const name = await bpEingabe('Name der Voreinstellung (z. B. „Firma – nur ihr Gewerk“):', ''); if (!name) return;
      const fb = buero && (await bpFrage('Für das ganze Büro speichern? Dann sehen sie alle, ändern kann sie nur die Verwaltung.', { ok: 'Fürs Büro', abbrechen: 'Nur für mich' }));
      const tage = N.ablauf ? Math.max(0, Math.round((new Date(N.ablauf) - new Date(plus(0))) / 864e5)) : 0;
      try { const d = await call('api/bp/teilen/vorlagen', 'POST', { app: o.app, name, buero: !!fb, farbe: fb ? K.farbe : '', optionen: { art: N.art, tage, sicht: { ...N.sicht } } });
        V = d.vorlagen; buero = d.buero; vw = (V[V.length - 1] || {}).id; zeichne(); meld('Voreinstellung gespeichert.'); } catch (e) { meld(e.message, true); }
    };
    const vorlageLoeschen = async (v) => {
      if (!(await bpFrage(`Voreinstellung „${v.name}“ löschen?`, { ok: 'Löschen' }))) return;
      try { const d = await call('api/bp/teilen/vorlagen/' + v.id, 'DELETE'); V = d.vorlagen; if (vw === v.id) vw = null; zeichne(); } catch (e) { meld(e.message, true); }
    };
    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-bx]')) { zu(); return; }
      const vb = e.target.closest('[data-vw]');
      if (vb) { const v = V.find((y) => String(y.id) === vb.dataset.vw); if (!v) return; if (e.target.closest('[data-vx]')) vorlageLoeschen(v); else vorlageNehmen(v); return; }
      if (e.target.closest('[data-vneu]')) { vorlageSpeichern(); return; }
      const na = e.target.closest('[data-na]'); if (na) { N.art = na.dataset.na; vw = null; box.querySelectorAll('[data-na]').forEach((b) => b.classList.toggle('on', b === na)); return; }
      if (e.target.closest('[data-nl]')) { erstellen(false); return; }
      if (e.target.closest('[data-nm]')) { erstellen(true); return; }
      const z = e.target.closest('[data-t]'); if (!z) return; const x = L.find((y) => y.token === z.dataset.t); if (!x) return;
      if (o.klick && (await o.klick(e, x, async (n) => { if (n) ersetze(n); zeichne(); }))) return;
      if (e.target.closest('[data-lk]')) kopieren(x.token);
      else if (e.target.closest('[data-lm]')) senden(x);
      else if (e.target.closest('[data-lz]')) aendern(x.token, { aktiv: !x.aktiv });
      else if (e.target.closest('[data-ld]')) {
        if (!(await bpFrage('Diesen Link endgültig löschen? Wer ihn hat, sieht danach nichts mehr.', { ok: 'Löschen', gefahr: true }))) return;
        try { await o.loeschen(x.token); L = L.filter((y) => y !== x); zeichne(); } catch (er) { meld(er.message, true); }
      }
    });
    root.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-nab]')) { N.ablauf = t.value; vw = null; return; }
      if (t.matches('[data-ns]')) { N.sicht[t.dataset.ns] = t.type === 'checkbox' ? t.checked : t.value; vw = null; box.querySelectorAll('[data-vw]').forEach((b) => b.classList.remove('on')); return; }
      const z = t.closest('[data-t]'); if (!z) return;
      if (t.matches('[data-ls]')) aendern(z.dataset.t, { optionen: { [t.dataset.ls]: t.type === 'checkbox' ? t.checked : t.value } });
      if (t.matches('[data-lab]')) aendern(z.dataset.t, { ablauf: t.value });
    });
    kopf();
    const [k, v, l] = await Promise.all([call('api/bp/teilen/kopf').catch(() => null), call('api/bp/teilen/vorlagen?app=' + encodeURIComponent(o.app || '')).catch(() => null), o.liste().catch((e) => { meld(e.message, true); return []; })]);
    if (k) K = k; if (v) { V = v.vorlagen || []; buero = !!v.buero; } L = l || [];
    kopf(); zeichne();
  };
})();
