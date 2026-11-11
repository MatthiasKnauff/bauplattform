/* =====================================================================
   „＋ Neu“ – eine Leiste für alle Arten von Schreiben, oben in jedem Spezialdialog gleich:
   Nachricht · Vorgang · Abnahme · Mängelrüge · Terminrüge · Pläne · Datei.
   Wechseln nimmt mit, was gemeinsam ist (Firma/Empfänger, Betreff, Text), über sessionStorage – auch in eine andere App.
     BPHead.neuLeiste(aktuell)            → HTML der Leiste (in den Kopf des Dialogs setzen)
     BPHead.neuArten[art] = (daten) => …  eine App öffnet den Dialog selbst (ohne Seitenwechsel)
     BPHead.neuDaten = () => ({ an, firma, contact_id, betreff, text })   was der offene Dialog mitgibt
     BPHead.neuSchliessen = () => …       offenen Dialog schließen (vor dem Wechsel)
     BPHead.neuUebergabe()                beim Laden: mitgebrachte Daten abholen (einmal)
   Wer in eine andere App wechselt, kommt mit #…&neu=<art> an; die App öffnet dann ihren Dialog.
   ===================================================================== */
(function los() {
  if (!window.BPHead) { setTimeout(los, 50); return; }
  const H = window.BPHead;
  if (H.neuLeiste) return;
  const ARTEN = [
    ['nachricht', '✉', 'Nachricht', 'kommunikation'], ['vorgang', '📝', 'Vorgang', 'kommunikation'], ['abnahme', '🏁', 'Abnahme', 'kommunikation'],
    ['m4', '⚠', 'Mängelrüge', 'aufgaben', 'vor Abnahme · § 4 Abs. 7 VOB/B'], ['m13', '⚠', 'Mängelrüge nach Abnahme', 'aufgaben', '§ 13 Abs. 5 VOB/B'],
    ['termin', '⏱', 'Terminrüge', 'aufgaben', '§ 5 VOB/B'], ['plaene', '📐', 'Pläne', 'plaene'], ['datei', '📎', 'Datei', 'kommunikation']];
  H.NEU_ARTEN = ARTEN;
  H.neuArten = H.neuArten || {};
  const E = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const st = document.createElement('style');
  st.textContent = `.bpn-l{display:flex!important;flex-direction:row!important;gap:.3rem;flex-wrap:wrap;align-items:center;padding:.5rem .9rem .6rem;margin:0 0 .5rem;border-bottom:1px solid var(--line,#ddd);overflow-x:auto}
  .bpn-l>button{width:auto!important;flex:none!important;display:inline-flex!important;align-items:center;gap:.25rem;margin:0!important;min-height:0!important;box-shadow:none!important;justify-content:flex-start!important}
  .bpn-l button{border:1px solid var(--line,#ccc);background:var(--card,#fff);color:inherit;border-radius:calc(999px*var(--rkp,1));padding:.18rem .65rem;font:inherit;font-size:.82rem;cursor:pointer;white-space:nowrap}
  .bpn-l button:hover{border-color:var(--y,#2b4a7a)}.bpn-l button.on{border-color:var(--y,#2b4a7a);background:color-mix(in srgb,var(--y,#2b4a7a) 14%,var(--card,#fff));color:var(--y,#2b4a7a);font-weight:600;cursor:default}
  .bpn-mit{font-size:.8rem;color:var(--y,#2b4a7a);margin:-.2rem 0 .5rem}
  @media (max-width:760px){.bpn-l{flex-wrap:nowrap!important;padding:.4rem .6rem .5rem}}`;
  document.head.appendChild(st);
  H.neuLeiste = (akt) => `<div class="bpn-l" role="tablist" aria-label="Art">${ARTEN.filter(([k]) => k !== 'm13' || akt === 'm13').map(([k, ic, n, , sub]) => `<button type="button" data-bpneu="${k}" class="${k === akt ? 'on' : ''}"${sub ? ` title="${E(sub)}"` : ''}>${ic} ${E(n)}</button>`).join('')}</div>`;
  H.neuMitHtml = (d) => { if (!d || !d.von) return ''; const t = [d.firma || (d.an && d.an.length ? d.an.map((x) => x.name || x.email).join(', ') : ''), d.betreff ? 'Betreff' : '', d.text ? 'Text' : ''].filter(Boolean);
    return t.length ? `<div class="bpn-mit">übernommen aus „${E(d.von)}“: ${E(t.join(', '))}</div>` : ''; };
  H.neuUebergabe = () => { try { const v = JSON.parse(sessionStorage.getItem('bp.neu') || 'null'); sessionStorage.removeItem('bp.neu'); return v && Date.now() - (v.t || 0) < 600000 ? v : null; } catch { return null; } };
  H.neuMerken = (art) => { try { localStorage.setItem('bp.neu.zuletzt', art); } catch { /* egal */ } };
  H.neuZuletzt = () => { try { return localStorage.getItem('bp.neu.zuletzt') || 'nachricht'; } catch { return 'nachricht'; } };
  /* wechseln: im selben Programm direkt, sonst in die App, die die Art kann */
  H.neuWechsel = (art, daten) => {
    const A = ARTEN.find((x) => x[0] === art); if (!A) return;
    const d = { ...(daten || {}), t: Date.now(), art }; H.neuMerken(art);
    if (H.neuSchliessen) { try { H.neuSchliessen(); } catch { /* egal */ } }
    if (H.neuArten[art]) { H.neuArten[art](d); return; }
    try { sessionStorage.setItem('bp.neu', JSON.stringify(d)); } catch { /* egal */ }
    const apps = (H.conf && H.conf.apps) || [], ap = apps.find((y) => y.key === A[3] && y.allowed);
    if (!ap) { if (window.toast) toast(`„${A[2]}“ gibt es in einer App, die für dein Konto nicht freigeschaltet ist.`, true); return; }
    const hash = A[3] === 'aufgaben' ? (art === 'termin' ? 'termine' : 'maengel') + '&neu=' + art : A[3] === 'plaene' ? 'plaene&neu=plaene' : 'neu=' + art;
    location.href = (H.appUrl ? H.appUrl(ap) : '/' + A[3]) + '/#' + hash;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-bpneu]'); if (!b || b.classList.contains('on')) return;
    e.preventDefault(); e.stopPropagation();
    const von = (ARTEN.find((x) => x[0] === (b.parentElement.querySelector('.on') || {}).dataset?.bpneu) || [])[2] || '';
    H.neuWechsel(b.dataset.bpneu, { ...(H.neuDaten ? H.neuDaten() || {} : {}), von });
  }, true);
})();
