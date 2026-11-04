'use strict';
/* =====================================================================
   Handy-Ansicht des Bauzeitenplans (nur lesen)
   Wird auf Handys automatisch gezeigt (schmaler Bildschirm + Touch). Zeigt
   - „Jetzt“: was gerade läuft, was in den nächsten 14 Tagen beginnt, danach, erledigt
   - „Ablauf“: alle Leistungen nach Gruppen mit kleinem Balken und Heute-Linie
   - „Gewerke“: je Gewerk Firma (anrufen, Mail) und Zeitraum
   Bearbeiten geht am Handy nicht – „Desktop-Ansicht“ schaltet bei Bedarf um.
   ===================================================================== */
(function () {
  const LSK = 'gantt.mobilAus';
  const istHandy = () => {
    try { if (localStorage.getItem(LSK) === '1') return false; } catch { /* egal */ }
    const schmal = Math.min(window.innerWidth, screen.width || 9999) <= 760;
    const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    return schmal && touch || /iPhone|Android.+Mobile|Windows Phone/i.test(navigator.userAgent);
  };
  if (!istHandy()) {
    window.bpMobilAn = () => { try { localStorage.removeItem(LSK); } catch { /* egal */ } location.reload(); };
    return;
  }
  document.documentElement.classList.add('mobil');
  const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const d2 = (n) => { const d = ud(n); return `${DW[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.`; };
  const d3 = (n) => { const d = ud(n); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCFullYear()).slice(2)}`; };
  let modus = 'jetzt', offen = {};
  try { modus = localStorage.getItem('gantt.mobilModus') || 'jetzt'; } catch { /* egal */ }

  const box = document.createElement('div'); box.id = 'mView';
  const app = document.getElementById('app') || document.body;
  app.appendChild(box);

  const firmaVon = (gw) => {
    if (!gw || !P || typeof tradeOf !== 'function' || typeof firmById !== 'function') return null;
    try { return firmById(tradeOf(gw).firm) || null; } catch { return null; }
  };
  const tel = (s) => String(s || '').replace(/[^\d+]/g, '');

  function karte(i, heute) {
    const t = P.tasks[i], sd = CAL.sd[i], fd = CAL.fd[i], ms = !t.dur, f = firmaVon(t.gw);
    const pct = Math.max(0, Math.min(100, Math.round(t.pct || 0)));
    const lage = fd < heute || pct >= 100 ? 'vorbei' : sd <= heute ? 'laeuft' : 'kommt';
    const col = (t.gw && typeof gwColor === 'function' && gwColor(t.gw)) || '#9e9e9e';
    const span = Math.max(1, CAL.peDay - P.start), l = ((sd - P.start) / span) * 100, w = Math.max(1.2, ((fd + 1 - sd) / span) * 100), hx = ((heute - P.start) / span) * 100;
    return `<div class="mk ${lage}${ms ? ' ms' : ''}" style="--gw:${col}">
      <div class="mk-h"><span class="mk-dot"></span><b>${E(t.name)}</b>${ms ? '<span class="mk-tag">Meilenstein</span>' : ''}</div>
      <div class="mk-z">${ms ? d2(sd) : `${d2(sd)} – ${d2(fd)} · ${CAL.dur[i]} AT`}${t.gw ? ` · ${E(t.gw)}` : ''}</div>
      ${f ? `<div class="mk-f">${E(f.name)}${f.contact ? ` · ${E(f.contact)}` : ''}<span class="mk-a">${f.mobile || f.phone ? `<a href="tel:${E(tel(f.mobile || f.phone))}" aria-label="anrufen">☎</a>` : ''}${f.mail ? `<a href="mailto:${E(f.mail)}" aria-label="Mail schreiben">✉</a>` : ''}</span></div>` : ''}
      ${ms ? '' : `<div class="mk-b"><i style="left:${l}%;width:${w}%"><u style="width:${pct}%"></u></i>${hx >= 0 && hx <= 100 ? `<s style="left:${hx}%"></s>` : ''}</div>`}
      ${pct && !ms ? `<div class="mk-p">${pct} % erledigt</div>` : ''}</div>`;
  }

  function vJetzt(heute) {
    const L = P.tasks.map((t, i) => i).filter((i) => !CAL.summ[i]), fertig = (i) => (P.tasks[i].pct || 0) >= 100;
    const grp = [
      ['Läuft gerade', L.filter((i) => CAL.sd[i] <= heute && CAL.fd[i] >= heute && !fertig(i))],
      ['Beginnt in den nächsten 14 Tagen', L.filter((i) => CAL.sd[i] > heute && CAL.sd[i] <= heute + 14).sort((a, b) => CAL.sd[a] - CAL.sd[b])],
      ['Danach', L.filter((i) => CAL.sd[i] > heute + 14).sort((a, b) => CAL.sd[a] - CAL.sd[b])],
      ['Erledigt / vorbei', L.filter((i) => CAL.fd[i] < heute || (fertig(i) && CAL.sd[i] <= heute)).sort((a, b) => CAL.fd[b] - CAL.fd[a])],
    ];
    return grp.map(([n, ix], k) => {
      if (!ix.length && k > 1) return '';
      const zu = (k >= 2) && !offen[n];
      return `<section class="mg"><h3 data-mo="${E(n)}">${E(n)} <small>${ix.length}</small>${k >= 2 ? `<span class="mg-t">${zu ? 'zeigen ▾' : 'ausblenden ▴'}</span>` : ''}</h3>
        ${zu ? '' : ix.length ? ix.map((i) => karte(i, heute)).join('') : '<p class="mu">Nichts.</p>'}</section>`;
    }).join('');
  }

  function vAblauf(heute) {
    let h = '', grp = null;
    P.tasks.forEach((t, i) => {
      if (CAL.summ[i]) { if ((t.lvl || 0) === 0) { h += (grp ? '</section>' : '') + `<section class="mg"><h3>${E(t.name)} <small>${d3(CAL.sd[i])} – ${d3(CAL.fd[i])}</small></h3>`; grp = 1; } else h += `<div class="mu mg-sub">${E(t.name)}</div>`; return; }
      h += karte(i, heute);
    });
    return h + (grp ? '</section>' : '');
  }

  function vGewerke(heute) {
    const by = {};
    P.tasks.forEach((t, i) => { if (CAL.summ[i] || !t.gw) return; const g = by[t.gw] ||= { sd: Infinity, fd: -Infinity, n: 0 }; g.sd = Math.min(g.sd, CAL.sd[i]); g.fd = Math.max(g.fd, CAL.fd[i]); g.n++; });
    const gws = Object.keys(by).sort((a, b) => by[a].sd - by[b].sd);
    if (!gws.length) return '<p class="mu">Im Plan sind keine Gewerke eingetragen.</p>';
    return gws.map((gw) => {
      const g = by[gw], f = firmaVon(gw), col = (typeof gwColor === 'function' && gwColor(gw)) || '#9e9e9e';
      const lage = g.fd < heute ? 'vorbei' : g.sd <= heute ? 'laeuft' : 'kommt';
      return `<div class="mk ${lage}" style="--gw:${col}"><div class="mk-h"><span class="mk-dot"></span><b>${E(gw)}</b><span class="mk-tag">${g.n} Leistung${g.n > 1 ? 'en' : ''}</span></div>
        <div class="mk-z">${d2(g.sd)} – ${d2(g.fd)}${lage === 'laeuft' ? ' · <b>auf der Baustelle</b>' : ''}</div>
        ${f ? `<div class="mk-f">${E(f.name)}${f.contact ? ` · ${E(f.contact)}` : ''}<span class="mk-a">${f.mobile || f.phone ? `<a href="tel:${E(tel(f.mobile || f.phone))}">☎</a>` : ''}${f.mail ? `<a href="mailto:${E(f.mail)}">✉</a>` : ''}</span></div>` : '<div class="mk-f mu">keine Firma eingetragen</div>'}</div>`;
    }).join('');
  }

  function zeichnen() {
    const heute = todayN();
    const projSel = `<select id="mProj" aria-label="Bauzeitenplan wählen">${(projects || []).map((p) => `<option value="${E(p.id)}"${P && p.id === P.id ? ' selected' : ''}>${E(p.name)}</option>`).join('')}</select>`;
    if (!P || !CAL) { box.innerHTML = `<div class="mv-top">${projSel}</div><p class="mu" style="padding:1rem">Kein Bauzeitenplan geöffnet.</p>`; return; }
    const L = P.tasks.filter((t, i) => !CAL.summ[i]);
    const fertig = L.length ? Math.round(L.reduce((s, t) => s + (t.pct || 0), 0) / L.length) : 0;
    const tage = Math.max(0, CAL.peDay - heute);
    box.innerHTML = `<div class="mv-top">${projSel}
      <div class="mv-k"><span>${d3(P.start)} – ${d3(CAL.peDay)}</span><span>${heute > CAL.peDay ? 'abgeschlossen' : heute < P.start ? `Beginn in ${P.start - heute} Tagen` : `noch ${tage} Tage`}</span><span>${fertig} % erledigt</span></div>
      <div class="mv-seg">${[['jetzt', 'Jetzt'], ['ablauf', 'Ablauf'], ['gewerke', 'Gewerke']].map(([k, l]) => `<button data-mm="${k}" class="${k === modus ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="mv-b">${modus === 'ablauf' ? vAblauf(heute) : modus === 'gewerke' ? vGewerke(heute) : vJetzt(heute)}
      <p class="mv-f">Nur Ansicht – bearbeiten am Computer. <button data-mdesk>Desktop-Ansicht</button></p></div>`;
  }

  box.addEventListener('change', async (e) => {
    if (e.target.id === 'mProj' && typeof openProject === 'function') { await openProject(e.target.value); zeichnen(); }
  });
  box.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mm]'); if (m) { modus = m.dataset.mm; try { localStorage.setItem('gantt.mobilModus', modus); } catch { /* egal */ } zeichnen(); window.scrollTo(0, 0); return; }
    const o = e.target.closest('[data-mo]'); if (o) { offen[o.dataset.mo] = !offen[o.dataset.mo]; zeichnen(); return; }
    if (e.target.closest('[data-mdesk]')) { try { localStorage.setItem(LSK, '1'); } catch { /* egal */ } location.reload(); }
  });

  // nach jedem Neuzeichnen des Plans (Öffnen, Änderungen anderer übernommen) die Handy-Ansicht aktualisieren
  if (typeof window.render === 'function') {
    const orig = window.render;
    window.render = function () { try { orig.apply(this, arguments); } catch (er) { /* Desktop-Teile sind ausgeblendet */ } zeichnen(); };
  }
  setInterval(() => { if (document.visibilityState === 'visible') zeichnen(); }, 60000);   // Heute-Linie, Wechsel um Mitternacht
  zeichnen();
})();
