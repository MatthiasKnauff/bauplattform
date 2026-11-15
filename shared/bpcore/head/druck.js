'use strict';
/* Druckseite für alle Apps (Baukasten): links Layout und ankreuzen, was ins PDF soll, rechts die Vorschau (Zoom: zoom.js),
   oben „✉ Senden“ (Versand-Dialog), „⤓ PDF“ (öffnet das Ansehen-Fenster: Teilen, Speichern, Unterschreiben, Markieren) und „🖨 Drucken“ (gleich der Druckdialog).
   bpDruck({ titel, name, hinweis, merk, teile: [[key, label, vorgabeAn, aus, warum]], url: (keys) => string,
             einmal: [keys]   – gelten nur für diesen Ausdruck (z. B. „mit meiner Unterschrift“): nie gemerkt, anfangs aus
             bereich: 'rechnungsfreigabe' – Druck-Layouts (Verwaltung → Einstellungen → Druck-Layouts): Auswahl und Inhaltseinstellungen, je Bereich gemerkt
             anlagen: [{ key, label, an, url: (variante) => string, varianten: [[k, label]] }] – hinten angehängt (Kern /api/bp/pdf/zusammen),
               z. B. die Fenster- & Türliste; an/aus und Variante je Ausdruck („merk“) gemerkt, anfangs „an“
             teilLayouts: { aufmass: 'aufmass' } – ein Teil mit eigenem Ausdruck bekommt darunter seine Vorlage und Einstellungen
               (gleich gemerkt wie beim Einzelausdruck; an die url als &layout.<bereich>=…&opt.<bereich>=…)
             vorher: async () => '&…' | null – z. B. fehlende Angaben abfragen (null = abbrechen),
             mail: { art, pid, projekt, an: [{name, email, contact_id}], betreff, text } – Vorgaben für „✉ Senden“ (Versand-Dialog, bp/versand.js)
             stempel: { speichern: async (lage | null) } – Teil 'stempel' angekreuzt: Stempel und Unterschrift in der Vorschau verschieben
               (url(…)&stempel=info liefert die Lage, &stempel=0 das PDF ohne sie; bp/stempellage.js),
               – ohne: Haken „Stempel & Unterschrift“ für jeden Ausdruck (15.11.2026): der Kern stempelt das PDF (/api/bp/stempeln),
                 an/aus und die Lage je Ausdruck („merk“) im Browser gemerkt, anfangs aus
             ablegen: { text, tip, vorn, aus: async (blob, teile) } – Knopf „Ablegen“ (z. B. geprüfte Rechnung in den Projektordner); vorn: Hauptknopf
               – ohne: „📁 Ablegen“ in den Projektordner über BPHead.ablage (Ordner und Name wählbar; Name = name, Ordner: wo dieselbe Art
                 im Projekt zuletzt hinkam, sonst ordner: 'Vorgabe') })
   Teil mit 6. Angabe 'ohneMail' (z. B. Sendungsnachweis): in Vorschau, Druck, PDF und Ablage – „✉ Senden“ holt das PDF ohne ihn.
   Teile, die beim letzten Merken noch nicht da waren (z. B. eine weitere PDF), starten mit ihrer Vorgabe.
   Die Auswahl wird je „merk“ im Browser gemerkt. Die Seiten zeichnet BPHead.pdfIn – derselbe Weg wie im Bereich rechts und im Ansehen-Fenster. */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lesen = (k) => { try { return JSON.parse(localStorage.getItem('bpd.' + k) || 'null'); } catch { return null; } };
  const merken = (k, v) => { try { localStorage.setItem('bpd.' + k, JSON.stringify(v)); } catch { /* egal */ } };
  const meldung = (t) => { if (window.toast) toast(t, true); };

  window.bpDruck = async function (o) {
    const AB = window.BPHead && BPHead.ablage;   // ohne eigenes Ablegen der App: im Projektordner ablegen – Ordner und Name wie beim Hereinziehen (bp/ablegen.js)
    if (!o.ablegen && AB && AB.ablegen && !AB.aus) o = { ...o, ablegen: { text: '📁 Ablegen', tip: 'Dieses PDF im Projektordner auf dem Fileserver ablegen – Ordner und Name wählbar',
      aus: async (blob) => { const n = o.name || o.titel || 'Ausdruck'; await AB.ablegen([new File([blob], /\.pdf$/i.test(n) ? n : n + '.pdf', { type: 'application/pdf' })], null, { merk: 'druck:' + MK, name: true, ordner: o.ordner }); return false; } } };
    const qs = o.vorher ? await o.vorher() : ''; if (qs == null) return;
    const EINMAL = new Set(o.einmal || []), teileAll = o.teile || [], OHNE = new Set(teileAll.filter((t) => t[5] === 'ohneMail').map((t) => t[0]));
    const MK = o.merk || o.titel, kennt = new Set(lesen(MK + '.kennt') || []), gem = lesen(MK);
    const wahl = new Set([...(gem || []), ...teileAll.filter((t) => t[2] && !t[3] && (!gem || (kennt.size ? !kennt.has(t[0]) : t[0].includes(':') && gem.includes(t[0].split(':')[0])))).map((t) => t[0])].filter((k) => !EINMAL.has(k) && teileAll.some((t) => t[0] === k && !t[3])));
    let W = null;
    if (o.bereich) { try { const r = await fetch('api/bp/layouts/' + encodeURIComponent(o.bereich) + '/wahl', { credentials: 'same-origin' }); W = r.ok ? await r.json() : null; } catch { W = null; } }
    const DM = lesen('lay.' + o.bereich) || {}, admin = !!(window.BPHead && BPHead.me && BPHead.me.is_admin);
    let vid = W && W.layouts.some((l) => l.id === DM.layout) ? DM.layout : W ? ((W.layouts.find((l) => l.id === W.vorgabe) || W.layouts[0] || {}).id || '') : '';
    let OPT = W ? { ...(W.werte[vid] || {}), ...(DM.layout === vid ? DM.opt || {} : {}) } : {};
    const layHtml = () => !W ? '' : `${W.layouts.length > 1 || admin ? `<label class="dz-l">Layout<select data-lay>${W.layouts.map((l) => `<option value="${esc(l.id)}"${l.id === vid ? ' selected' : ''}>${esc(l.name)} · ${esc(l.format)}</option>`).join('')}</select></label>` : ''}
      ${W.optionen.length ? `<div class="dz-g">${W.optionen.map((x) => x.typ === 'bool' ? `<label class="dz-c"><input type="checkbox" data-opt="${esc(x.key)}"${OPT[x.key] ? ' checked' : ''}> ${esc(x.name)}</label>`
        : `<label class="dz-l">${esc(x.name)}<select data-opt="${esc(x.key)}">${x.wahl.map(([k, l]) => `<option value="${esc(k)}"${String(OPT[x.key]) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
      ${admin ? '<button type="button" class="btn sm" data-d="layedit">Layouts bearbeiten …</button>' : ''}`;
    /* Vorlage je Teil (15.11.2026): z. B. die Massenermittlung in der Rechnungsfreigabe – dieselbe Auswahl wie beim Einzelausdruck */
    const TL = {};
    await Promise.all(Object.entries(o.teilLayouts || {}).filter(([k]) => teileAll.some((t) => t[0] === k)).map(async ([k, b]) => {
      let w = null; try { const r = await fetch('api/bp/layouts/' + encodeURIComponent(b) + '/wahl', { credentials: 'same-origin' }); w = r.ok ? await r.json() : null; } catch { w = null; }
      if (!w) return; const dm = lesen('lay.' + b) || {}, v = w.layouts.some((l) => l.id === dm.layout) ? dm.layout : ((w.layouts.find((l) => l.id === w.vorgabe) || w.layouts[0] || {}).id || '');
      TL[k] = { b, W: w, vid: v, OPT: { ...(w.werte[v] || {}), ...(dm.layout === v ? dm.opt || {} : {}) } };
    }));
    const tlHtml = (k) => { const t = TL[k]; if (!t) return ''; const w = t.W;
      return `<div class="dz-tl" data-tlw="${esc(k)}"${wahl.has(k) ? '' : ' hidden'}>${w.layouts.length > 1 ? `<label class="dz-l">Vorlage<select data-tlay="${esc(k)}">${w.layouts.map((l) => `<option value="${esc(l.id)}"${l.id === t.vid ? ' selected' : ''}>${esc(l.name)} · ${esc(l.format)}</option>`).join('')}</select></label>` : ''}
        ${w.optionen.map((x) => x.typ === 'bool' ? `<label class="dz-c"><input type="checkbox" data-topt="${esc(k)}" data-key="${esc(x.key)}"${t.OPT[x.key] ? ' checked' : ''}> ${esc(x.name)}</label>`
          : `<label class="dz-l">${esc(x.name)}<select data-topt="${esc(k)}" data-key="${esc(x.key)}">${x.wahl.map(([a, l]) => `<option value="${esc(a)}"${String(t.OPT[x.key]) === String(a) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`).join('')}</div>`; };
    const layQs = () => (W ? `&layout=${encodeURIComponent(vid)}${Object.keys(OPT).length ? '&opt=' + encodeURIComponent(JSON.stringify(OPT)) : ''}` : '')
      + Object.values(TL).map((t) => `&layout.${t.b}=${encodeURIComponent(t.vid)}${Object.keys(t.OPT).length ? `&opt.${t.b}=` + encodeURIComponent(JSON.stringify(t.OPT)) : ''}`).join('');
    const GEN = !o.stempel; let GST = GEN && !!lesen(MK + '.st'), GBLOB = null;   // Stempeln für jeden Ausdruck (Kern) – Apps mit eigenem Stempeln (Rechnungsfreigabe) behalten ihres
    const gstHtml = () => (GEN ? `<div class="dz-g" style="margin-top:.5rem"><label class="dz-c"><input type="checkbox" data-gst${GST ? ' checked' : ''}> Stempel &amp; Unterschrift</label><button type="button" class="btn sm" data-d="stempel" hidden style="margin:.1rem 0 .3rem 1.6rem;align-self:flex-start" title="Stempel und Unterschrift auf den Seiten verschieben, löschen, weitere einfügen (Bürostempel, Prüfstempel, Zahlbetrag, Unterschrift)">✋ Stempel verschieben</button></div>` : '');
    const stempelnKern = async (blob, info) => { const fd = new FormData(); fd.append('pdf', blob, 'a.pdf'); fd.append('lage', JSON.stringify(lesen(MK + '.stl'))); if (info) fd.append('info', '1');
      const r = await fetch('api/bp/stempeln', { method: 'POST', body: fd, credentials: 'same-origin' }); if (!r.ok) throw new Error(((await r.json().catch(() => ({}))).error) || 'Stempeln ging nicht (' + r.status + ')'); return info ? r.json() : r.blob(); };
    const appPdf = async (tl, extra) => { const u = o.url(tl || teile()), r = await fetch(u + (u.includes('?') ? '&' : '?') + 't=' + Date.now() + qs + layQs() + (extra || ''), { credentials: 'same-origin' }); if (!r.ok) throw new Error('PDF nicht erstellt (' + r.status + ')'); return r.blob(); };
    /* Anlagen (15.11.2026): hinten angehängt – an/aus und Variante je Ausdruck gemerkt */
    const ANL = (o.anlagen || []).map((a) => { const g = (lesen(MK + '.anl') || {})[a.key] || {}; return { ...a, on: g.on ?? !!a.an, v: g.v || (a.varianten ? a.varianten[0][0] : '') }; });
    const anlMerken = () => merken(MK + '.anl', Object.fromEntries(ANL.map((a) => [a.key, { on: a.on, v: a.v }])));
    const anlHtml = () => (ANL.length ? `<div class="dz-g" style="margin-top:.5rem"><div class="dz-l">Anlagen</div>${ANL.map((a) => `<label class="dz-c"><input type="checkbox" data-anl="${esc(a.key)}"${a.on ? ' checked' : ''}> ${esc(a.label)}</label>${a.varianten ? `<div class="dz-tl"${a.on ? '' : ' hidden'} data-anlw="${esc(a.key)}">${a.varianten.map(([k, l]) => `<label class="dz-c"><input type="radio" name="anl-${esc(a.key)}" data-anlv="${esc(a.key)}" value="${esc(k)}"${a.v === k ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</div>` : ''}`).join('')}</div>` : '');
    const zusammen = async (blobs) => { const fd = new FormData(); blobs.forEach((b, i) => fd.append('pdf', b, i + '.pdf'));
      const r = await fetch('api/bp/pdf/zusammen', { method: 'POST', body: fd, credentials: 'same-origin' }); if (!r.ok) throw new Error(((await r.json().catch(() => ({}))).error) || 'Anlagen ließen sich nicht anhängen'); return r.blob(); };
    const kette = async (tl, ohneStempel) => {   // PDF der App → Anlagen dahinter → (Kern) stempeln
      let b = await appPdf(tl, EDIT && !GEN ? '&stempel=0' : ''); const A = ANL.filter((a) => a.on);
      if (A.length) b = await zusammen([b, ...await Promise.all(A.map(async (a) => { const r = await fetch(a.url(a.v), { credentials: 'same-origin' }); if (!r.ok) throw new Error(a.label + ': ' + (((await r.json().catch(() => ({}))).error) || r.status)); return r.blob(); }))]);
      return GEN && GST && !EDIT && !ohneStempel ? stempelnKern(b) : b; };
    const ov = document.createElement('div'); ov.className = 'bed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', o.titel);
    ov.innerHTML = `<div class="bed-bar"><b>${esc(o.titel)}</b><span class="hint">${esc(o.hinweis || 'Links ankreuzen, was ins PDF soll – rechts die Vorschau.')}</span><span style="flex:1"></span>
      <button type="button" class="btn" data-d="x">Schließen</button><button type="button" class="btn" data-d="mail" title="Dieses PDF per E-Mail verschicken – Empfänger:in und Text im Versand-Dialog">✉ Senden</button><button type="button" class="btn" data-d="pdf">⤓ PDF</button><button type="button" class="btn${o.ablegen && o.ablegen.vorn ? '' : ' pri'}" data-d="druck">🖨 Drucken</button>${o.ablegen ? `<button type="button" class="btn${o.ablegen.vorn ? ' pri' : ''}" data-d="ablegen" title="${esc(o.ablegen.tip || '')}">${esc(o.ablegen.text || '📁 Ablegen')}</button>` : ''}</div>
      <div class="dz"><aside class="dz-side"><div data-layw>${layHtml()}</div><div${teileAll.length ? '' : ' hidden'}><div class="dz-l">Im PDF</div><div class="dz-g">${teileAll.map(([k, l, , aus, warum]) => `<label class="dz-c${aus ? ' aus' : ''}" title="${esc(aus ? warum || '' : '')}"><input type="checkbox" data-t="${esc(k)}"${wahl.has(k) && !aus ? ' checked' : ''}${aus ? ' disabled' : ''}> ${esc(l)}${aus && warum ? `<small class="hint" style="flex-basis:100%;padding-left:1.4rem">${esc(warum)}</small>` : ''}</label>${OHNE.has(k) ? '<small class="hint" style="margin:-.2rem 0 .2rem 1.6rem">nur im Ausdruck und in der Ablage – nicht beim Senden</small>' : ''}${tlHtml(k)}${k === 'stempel' && o.stempel ? '<button type="button" class="btn sm" data-d="stempel" hidden style="margin:.1rem 0 .3rem 1.6rem;align-self:flex-start" title="Stempel und Unterschrift auf den Seiten verschieben, löschen, wieder einfügen">✋ Stempel verschieben</button>' : ''}`).join('')}</div></div>${anlHtml()}${gstHtml()}<div data-bpsw></div></aside>
      <div class="bed-s"><div class="bed-l">Lade Vorschau …</div></div></div>`;
    document.body.appendChild(ov); document.body.style.overflow = 'hidden';
    const S = ov.querySelector('.bed-s');
    const teile = () => [...ov.querySelectorAll('[data-t]:checked')].map((x) => x.dataset.t);
    let bereit = false, EDIT = null;
    const stKnopf = () => { const k = ov.querySelector('[data-d="stempel"]'); if (k) k.hidden = !(GEN ? GST : teile().includes('stempel')) || !!EDIT; };
    async function laden() {
      bereit = false; S._pdfDaten = null; stKnopf();
      if (teileAll.length && !teile().filter((k) => !EINMAL.has(k)).length) { S.innerHTML = '<div class="bed-l">Bitte links mindestens einen Teil ankreuzen.</div>'; return; }
      let url;
      if ((GEN && GST && !EDIT) || ANL.some((a) => a.on)) {   // PDF der App holen, Anlagen dahinter, im Kern stempeln – diese Fassung geht auch in Drucken, PDF, Senden, Ablegen
        try { const b = await kette(); if (GBLOB) URL.revokeObjectURL(GBLOB); url = GBLOB = URL.createObjectURL(b); }
        catch (er) { meldung(er.message); S.innerHTML = '<div class="bed-l">' + esc(er.message) + '</div>'; return; }
      } else { const u = o.url(teile()); url = u + (u.includes('?') ? '&' : '?') + 't=' + Date.now() + qs + layQs() + (EDIT && !GEN ? '&stempel=0' : ''); }
      const n = await BPHead.pdfIn(S, url, { box: 'bed-p', breite: 820, ruhig: true, daten: true, top: S.scrollTop });
      bereit = n > 0 && !!S._pdfDaten;
    }
    const blobUrl = () => URL.createObjectURL(new Blob([S._pdfDaten], { type: 'application/pdf' }));
    const zu = () => { S._pdfTok = (S._pdfTok || 0) + 1; ov.remove(); document.body.style.overflow = ''; };
    const layMerken = () => merken('lay.' + o.bereich, { layout: vid, opt: OPT });
    ov.addEventListener('change', (e) => {
      const an = e.target.dataset.anl || e.target.dataset.anlv, A = an && ANL.find((x) => x.key === an);
      if (A) { if (e.target.dataset.anl) { A.on = e.target.checked; const w = ov.querySelector(`[data-anlw="${CSS.escape(an)}"]`); if (w) w.hidden = !A.on; } else A.v = e.target.value; anlMerken(); laden(); return; }
      if (e.target.matches('[data-gst]')) { GST = e.target.checked; merken(MK + '.st', GST); laden(); return; }
      if (e.target.dataset.t) { const tw = ov.querySelector(`[data-tlw="${CSS.escape(e.target.dataset.t)}"]`); if (tw) tw.hidden = !e.target.checked;
        merken(MK, teile().filter((k) => !EINMAL.has(k))); merken(MK + '.kennt', teileAll.map((t) => t[0])); laden(); return; }
      const tk = e.target.dataset.tlay || e.target.dataset.topt, t = tk && TL[tk];
      if (t) { if (e.target.dataset.tlay) { t.vid = e.target.value; t.OPT = { ...(t.W.werte[t.vid] || {}) }; ov.querySelector(`[data-tlw="${CSS.escape(tk)}"]`).outerHTML = tlHtml(tk); }
        else t.OPT[e.target.dataset.key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        merken('lay.' + t.b, { layout: t.vid, opt: t.OPT }); laden(); return; }
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
        const ohne = teile().some((k) => OHNE.has(k)), daten0 = new Blob([S._pdfDaten], { type: 'application/pdf' }), m = o.mail || (window.bpMailStandard ? window.bpMailStandard(o) : null) || {}, pj = (window.BPHead && BPHead.projekt) || {};
        return BPHead.unterlagenSenden(BPHead.mailVorgabe({ ...m, name: o.name || o.titel, pdf: async () => { if (!ohne) return daten0;   // Teile „ohneMail“ (Sendungsnachweis) nicht mitschicken: das PDF ohne sie holen
          return kette(teile().filter((k) => !OHNE.has(k))); }, pid: m.pid || pj.id || null, projekt: m.projekt || pj.name || '' }));
      }
      if (a === 'druck') return BPHead.pdfDrucken(blobUrl());
      if (a === 'ablegen') { b.disabled = true; Promise.resolve(o.ablegen.aus(new Blob([S._pdfDaten], { type: 'application/pdf' }), teile())).then((zu_) => { if (zu_) zu(); }).finally(() => { b.disabled = false; }); return; }   // aus → true: Druckseite schließen
      BPHead.ansehen([{ url: blobUrl(), typ: 'pdf', name: o.name || o.titel }]);
    });
    async function stempelVerschieben() {   // Vorschau ohne Stempel, die Stempel als verschiebbare Felder darüber (bp/stempellage.js)
      if (!window.bpStempelLage) await new Promise((ok, nein) => { const s = document.createElement('script'); s.src = 'bp/stempellage.js'; s.onload = ok; s.onerror = nein; document.head.appendChild(s); }).catch(() => null);
      if (!window.bpStempelLage) return meldung('Das ging gerade nicht – bitte noch einmal.');
      const u = o.url(teile()); let info;
      try { if (GEN) info = await stempelnKern(await kette(null, true), true);
        else { const r = await fetch(u + (u.includes('?') ? '&' : '?') + 'stempel=info' + qs + layQs(), { credentials: 'same-origin' }); info = await r.json(); if (!r.ok) throw new Error(info.error || 'Fehler ' + r.status); } }
      catch (er) { return meldung(er.message); }
      EDIT = true; await laden();
      const speichern = GEN ? async (lage) => { merken(MK + '.stl', lage); } : (lage) => o.stempel.speichern(lage);   // Kern: Lage je Ausdruck im Browser
      EDIT = bpStempelLage.start({ S, side: ov.querySelector('[data-bpsw]'), info, speichern, fertig: () => { EDIT = null; laden(); } });
    }
    ov.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.target.closest('input,select,textarea')) zu(); });
    laden();
  };
})();
