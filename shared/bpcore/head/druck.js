'use strict';
/* Druckseite für alle Apps (Baukasten): links Layout und ankreuzen, was ins PDF soll, rechts die Vorschau (Zoom: zoom.js),
   oben „✉ Senden“ (Versand-Dialog), „⤓ PDF“ (öffnet das Ansehen-Fenster: Teilen, Speichern, Unterschreiben, Markieren) und „🖨 Drucken“ (gleich der Druckdialog).
   bpDruck({ titel, name, hinweis, merk, teile: [[key, label, vorgabeAn, aus, warum]], url: (keys) => string,
             einmal: [keys]   – gelten nur für diesen Ausdruck (z. B. „mit meiner Unterschrift“): nie gemerkt, anfangs aus
             bereich: 'rechnungsfreigabe' – Druck-Layouts (Verwaltung → Einstellungen → Druck-Layouts): Auswahl und Inhaltseinstellungen, je Bereich gemerkt
             vorher: async () => '&…' | null – z. B. fehlende Angaben abfragen (null = abbrechen),
             mail: { art, pid, projekt, an: [{name, email, contact_id}], betreff, text } – Vorgaben für „✉ Senden“ (Versand-Dialog, bp/versand.js)
             stempel: { speichern: async (lage | null) } – Teil 'stempel' angekreuzt: Stempel und Unterschrift in der Vorschau verschieben
               (url(…)&stempel=info liefert die Lage, &stempel=0 das PDF ohne sie; bp/stempellage.js) })
   Die Auswahl wird je „merk“ im Browser gemerkt. Die Seiten zeichnet BPHead.pdfIn – derselbe Weg wie im Bereich rechts und im Ansehen-Fenster. */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lesen = (k) => { try { return JSON.parse(localStorage.getItem('bpd.' + k) || 'null'); } catch { return null; } };
  const merken = (k, v) => { try { localStorage.setItem('bpd.' + k, JSON.stringify(v)); } catch { /* egal */ } };
  const meldung = (t) => { if (window.toast) toast(t, true); };

  window.bpDruck = async function (o) {
    const qs = o.vorher ? await o.vorher() : ''; if (qs == null) return;
    const EINMAL = new Set(o.einmal || []), teileAll = o.teile || [];
    const wahl = new Set((lesen(o.merk || o.titel) || teileAll.filter((t) => t[2] && !t[3]).map((t) => t[0])).filter((k) => !EINMAL.has(k) && teileAll.some((t) => t[0] === k && !t[3])));
    let W = null;
    if (o.bereich) { try { const r = await fetch('api/bp/layouts/' + encodeURIComponent(o.bereich) + '/wahl', { credentials: 'same-origin' }); W = r.ok ? await r.json() : null; } catch { W = null; } }
    const DM = lesen('lay.' + o.bereich) || {}, admin = !!(window.BPHead && BPHead.me && BPHead.me.is_admin);
    let vid = W && W.layouts.some((l) => l.id === DM.layout) ? DM.layout : W ? ((W.layouts.find((l) => l.id === W.vorgabe) || W.layouts[0] || {}).id || '') : '';
    let OPT = W ? { ...(W.werte[vid] || {}), ...(DM.layout === vid ? DM.opt || {} : {}) } : {};
    const layHtml = () => !W ? '' : `${W.layouts.length > 1 || admin ? `<label class="dz-l">Layout<select data-lay>${W.layouts.map((l) => `<option value="${esc(l.id)}"${l.id === vid ? ' selected' : ''}>${esc(l.name)} · ${esc(l.format)}</option>`).join('')}</select></label>` : ''}
      ${W.optionen.length ? `<div class="dz-g">${W.optionen.map((x) => x.typ === 'bool' ? `<label class="dz-c"><input type="checkbox" data-opt="${esc(x.key)}"${OPT[x.key] ? ' checked' : ''}> ${esc(x.name)}</label>`
        : `<label class="dz-l">${esc(x.name)}<select data-opt="${esc(x.key)}">${x.wahl.map(([k, l]) => `<option value="${esc(k)}"${String(OPT[x.key]) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
      ${admin ? '<button type="button" class="btn sm" data-d="layedit">Layouts bearbeiten …</button>' : ''}`;
    const layQs = () => (W ? `&layout=${encodeURIComponent(vid)}${Object.keys(OPT).length ? '&opt=' + encodeURIComponent(JSON.stringify(OPT)) : ''}` : '');
    const ov = document.createElement('div'); ov.className = 'bed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titel);
    ov.innerHTML = `<div class="bed-bar"><b>${esc(o.titel)}</b><span class="hint">${esc(o.hinweis || 'Links ankreuzen, was ins PDF soll – rechts die Vorschau.')}</span><span style="flex:1"></span>
      ${o.stempel ? '<button type="button" class="btn" data-d="stempel" hidden title="Stempel und Unterschrift auf den Seiten verschieben, löschen, wieder einfügen">✋ Stempel verschieben</button>' : ''}<button type="button" class="btn" data-d="x">Schließen</button><button type="button" class="btn" data-d="mail" title="Dieses PDF per E-Mail verschicken – Empfänger:in und Text im Versand-Dialog">✉ Senden</button><button type="button" class="btn" data-d="pdf">⤓ PDF</button><button type="button" class="btn pri" data-d="druck">🖨 Drucken</button></div>
      <div class="dz"><aside class="dz-side"><div data-layw>${layHtml()}</div><div${teileAll.length ? '' : ' hidden'}><div class="dz-l">Im PDF</div><div class="dz-g">${teileAll.map(([k, l, , aus, warum]) => `<label class="dz-c${aus ? ' aus' : ''}" title="${esc(aus ? warum || '' : '')}"><input type="checkbox" data-t="${esc(k)}"${wahl.has(k) && !aus ? ' checked' : ''}${aus ? ' disabled' : ''}> ${esc(l)}${aus && warum ? `<small class="hint" style="flex-basis:100%;padding-left:1.4rem">${esc(warum)}</small>` : ''}</label>`).join('')}</div></div><div data-bpsw></div></aside>
      <div class="bed-s"><div class="bed-l">Lade Vorschau …</div></div></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const S = ov.querySelector('.bed-s');
    const teile = () => [...ov.querySelectorAll('[data-t]:checked')].map((x) => x.dataset.t);
    let bereit = false, EDIT = null;
    const stKnopf = () => { const k = ov.querySelector('[data-d="stempel"]'); if (k) k.hidden = !teile().includes('stempel') || !!EDIT; };
    async function laden() {
      bereit = false; S._pdfDaten = null; stKnopf();
      if (teileAll.length && !teile().filter((k) => !EINMAL.has(k)).length) { S.innerHTML = '<div class="bed-l">Bitte links mindestens einen Teil ankreuzen.</div>'; return; }
      const u = o.url(teile()), url = u + (u.includes('?') ? '&' : '?') + 't=' + Date.now() + qs + layQs() + (EDIT ? '&stempel=0' : '');
      const n = await BPHead.pdfIn(S, url, { box: 'bed-p', breite: 820, ruhig: true, daten: true, top: S.scrollTop });
      bereit = n > 0 && !!S._pdfDaten;
    }
    const blobUrl = () => URL.createObjectURL(new Blob([S._pdfDaten], { type: 'application/pdf' }));
    const zu = () => { S._pdfTok = (S._pdfTok || 0) + 1; ov.remove(); document.body.style.overflow = ''; };
    const layMerken = () => merken('lay.' + o.bereich, { layout: vid, opt: OPT });
    ov.addEventListener('change', (e) => {
      if (e.target.dataset.t) { merken(o.merk || o.titel, teile().filter((k) => !EINMAL.has(k))); laden(); return; }
      if (e.target.matches('[data-lay]')) { vid = e.target.value; OPT = { ...(W.werte[vid] || {}) }; ov.querySelector('[data-layw]').innerHTML = layHtml(); layMerken(); laden(); return; }
      const op = e.target.dataset.opt; if (op) { OPT[op] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; layMerken(); laden(); }
    });
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-d]'); if (!b) return; const a = b.dataset.d;
      if (a === 'x') return zu();
      if (a === 'layedit') { const ad = ((BPHead.conf || {}).apps || []).find((x) => x.key === 'admin'); if (ad) BPHead.layoutEditor(BPHead.appUrl(ad), o.bereich, laden, laden); return; }   // Änderungen sofort in der Vorschau
      if (a === 'stempel') return stempelVerschieben();
      if (EDIT) return meldung('Erst links „✓ Fertig“ – dann werden Stempel und Unterschrift eingesetzt.');
      if (!bereit) return meldung(teile().length || !teileAll.length ? 'Die Vorschau lädt noch …' : 'Bitte mindestens einen Teil ankreuzen.');
      if (a === 'mail') {   // das PDF der Vorschau über den gemeinsamen Versand-Dialog (bp/versand.js); o.mail = { art, pid, projekt, an, betreff, text, link }
        const daten = new Blob([S._pdfDaten], { type: 'application/pdf' }), m = o.mail || (window.bpMailStandard ? window.bpMailStandard(o) : null) || {}, pj = (window.BPHead && BPHead.projekt) || {};
        return BPHead.unterlagenSenden(BPHead.mailVorgabe({ ...m, name: o.name || o.titel, pdf: async () => daten, pid: m.pid || pj.id || null, projekt: m.projekt || pj.name || '' }));
      }
      if (a === 'druck') return BPHead.pdfDrucken(blobUrl());
      BPHead.ansehen([{ url: blobUrl(), typ: 'pdf', name: o.name || o.titel }]);
    });
    async function stempelVerschieben() {   // Vorschau ohne Stempel, die Stempel als verschiebbare Felder darüber (bp/stempellage.js)
      if (!window.bpStempelLage) await new Promise((ok, nein) => { const s = document.createElement('script'); s.src = 'bp/stempellage.js'; s.onload = ok; s.onerror = nein; document.head.appendChild(s); }).catch(() => null);
      if (!window.bpStempelLage) return meldung('Das ging gerade nicht – bitte noch einmal.');
      const u = o.url(teile()); let info;
      try { const r = await fetch(u + (u.includes('?') ? '&' : '?') + 'stempel=info' + qs + layQs(), { credentials: 'same-origin' }); info = await r.json(); if (!r.ok) throw new Error(info.error || 'Fehler ' + r.status); }
      catch (er) { return meldung(er.message); }
      EDIT = true; await laden();
      EDIT = bpStempelLage.start({ S, side: ov.querySelector('[data-bpsw]'), info, speichern: (lage) => o.stempel.speichern(lage), fertig: () => { EDIT = null; laden(); } });
    }
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.target.closest('input,select,textarea')) zu(); });
    laden();
  };
})();
