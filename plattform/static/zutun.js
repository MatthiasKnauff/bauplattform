'use strict';
/* Startseite „Zu tun“ (GO 17.11.2026, Entwurf „Startseite: Zu tun statt Erinnerungen, Fristen, To-dos“):
   EINE Liste für alles, was ich erledigen muss – eigene Aufgaben, Mails als To-do, Fristen und Hinweise der Regeln (todo.py),
   bald fällige Erinnerungen, unbestätigte Zeiten (ein Eintrag). Eine Erinnerung ist nur ein Datum an der Sache.
   Gliederung nach Zeit: Überfällig · Heute · Diese Woche · Später · Ohne Datum; Filter: Alle · Aufgaben · Mails · Fristen · Zeiten · Warte auf.
   „Warte auf“ = Aufgaben, die ich anderen gegeben habe – nicht in „Alle“. Nur zur Kenntnis (info: neues Formular, Datei hochgeladen):
   Leiste „Neu für dich“ ohne Haken, Gleichartiges zusammengefasst, ✕ blendet aus.
   Braucht todo.js (TD, tdZeile, tdDatum, tdHeute, tdPlus, Formular „neuform“) – todo.js ruft TDZU.zeigen(box) statt der eigenen Liste. */
window.TDZU = {
  filter: (() => { try { return localStorage.getItem('zt.filter') || 'alle'; } catch { return 'alle'; } })(),
  extra: [],   // vom Portal: Zeiten (ein Eintrag), bald fällige Erinnerungen – ohne Haken, führen in ihre App
  heute: '',   // vom Portal: Zeile „Heute seit … · … von … h“
  mehr: false,
  art(x) {
    if (x.regel === 'zeiten') return 'zeiten';
    if (x.auto) return x.regel === 'post' ? 'mail' : 'frist';
    const ich = TDREF && TDREF.ich, P = x.personen || [];
    if (ich && x.erstellt_von === ich && P.length && !P.includes(ich)) return 'warte';
    return (tdNotizTeilen(x.notiz).links || []).some((u) => /outlook\.|\/owa\/|mailto:|mail/i.test(u)) ? 'mail' : 'aufgabe';
  },
  alle() {
    const A = (TD.auto || []).filter((x) => !x.info).map((x) => ({ ...x, f: x.faellig || '' }));
    const M = (TD.manuell || []).filter((x) => x.status === 'offen').map((x) => ({ ...x, f: x.faellig || '', projekt: x.pid && TDREF ? ((TDREF.projekte || []).find((p) => p.id === x.pid) || {}).name || '' : '' }));
    const schon = new Set(A.map((x) => x.key));
    const E = this.extra.filter((x) => !schon.has(x.ist)).map((x) => ({ ...x, f: x.faellig || '' }));
    return [...A.filter((x) => !x.spaeter), ...M, ...E].map((x) => ({ ...x, _art: this.art(x) }));
  },
  zaehler() {   // rot = fällig (heute oder früher), grau = offen – ohne „Warte auf“
    const L = TD ? this.alle().filter((x) => x._art !== 'warte') : [];
    return { n: L.filter((x) => x.f && x.f <= tdHeute()).length, n2: L.length };
  },
  neuLeiste() {
    const I = (TD.auto || []).filter((x) => x.info && !x.spaeter), G = new Map();
    I.forEach((x) => { const g = G.get(x.regel) || []; g.push(x); G.set(x.regel, g); });
    if (!G.size) return '';
    const chip = (L) => { const x = L[0], t = L.length > 1 ? `${L.length} × ${x.regel_name}` : x.titel;
      return `<span class="zt-n"><button type="button" class="zt-nl" data-ztauf="${esc(x.key)}" title="${esc(L.length > 1 ? L.slice(0, 5).map((y) => y.titel).join(' · ') : x.text || x.titel)}">${esc(t)}</button><button type="button" class="zt-nx" data-ztweg="${esc(L.map((y) => y.key).join('|'))}" title="Gesehen – ausblenden" aria-label="${esc(t)} ausblenden">✕</button></span>`; };
    return `<div class="zt-neu"><span class="zt-nt">Neu für dich</span>${[...G.values()].map(chip).join('')}</div>`;
  },
  zeigen(box) {
    box.classList.add('td-klein', 'zt');
    const h = tdHeute(), wo = tdPlus(7 - ((new Date().getDay() + 6) % 7) - 1), A = this.alle();
    const F = [['alle', 'Alle', (x) => x._art !== 'warte'], ['aufgabe', 'Aufgaben'], ['mail', 'Mails'], ['frist', 'Fristen'], ['zeiten', 'Zeiten'], ['warte', 'Warte auf']]
      .map(([k, l, fn]) => [k, l, fn || ((x) => x._art === k)]).filter(([k, , fn]) => k === 'alle' || A.some(fn));
    if (!F.some(([k]) => k === this.filter)) this.filter = 'alle';
    const fn = F.find(([k]) => k === this.filter)[2], L = A.filter(fn);
    const G = [['Überfällig', (x) => x.f && x.f < h, 1], ['Heute', (x) => x.f === h], ['Diese Woche', (x) => x.f > h && x.f <= wo], ['Später', (x) => x.f > wo], ['Ohne Datum', (x) => !x.f]];
    const sort = (a, b) => (a.f || '').localeCompare(b.f || '') || (b.prio || 0) - (a.prio || 0) || String(b.erstellt || '').localeCompare(String(a.erstellt || ''));
    let html = this.neuLeiste() + (this.heute ? `<div class="zt-heute">${this.heute}</div>` : '')
      + `<div class="zt-f" role="tablist" aria-label="Filter">${F.map(([k, l, f]) => `<button type="button" role="tab" class="zt-c${k === this.filter ? ' on' : ''}" data-ztf="${k}" aria-selected="${k === this.filter}">${esc(l)} <small>${A.filter(f).length}</small></button>`).join('')}</div>`
      + `${TDPROJ ? `<div class="tq-p">für <b>${esc(TDPROJ.name)}</b><button type="button" data-td="tqweg" title="Ohne Projekt weiter" aria-label="Projekt entfernen">✕</button></div>` : ''}
      <form class="tq" data-td="neuform"><input id="tdNeu" data-bp-projekt="wort" placeholder="+ Neue Aufgabe – z. B. „A480 Statik nachfordern bis Fr“" autocomplete="off" aria-label="Neue Aufgabe" title="Projektkürzel, Ort oder Name tippen (z. B. A48, Tierheim) – passende Projekte werden vorgeschlagen"><button class="btn sm pri">Anlegen</button></form>`;
    if (TDOFFEN === 'neu') html += `<div class="tr">${tdEditor({ titel: (TD._neu || {}).titel, faellig: (TD._neu || {}).faellig, pid: window.BPHead && BPHead.projektId ? BPHead.projektId() : null, personen: [], mail: true })}</div>`;
    let rest = this.mehr ? 1e9 : 10;   // erst die dringendsten zehn
    for (const [name, gfn, rot] of G) {
      const Z = L.filter(gfn).sort(sort); if (!Z.length) continue;
      const immer = (x) => x.key === TDOFFEN || TDFRISCH.has(x.key);
      if (rest <= 0 && !Z.some(immer)) { html += `<div class="tg">${name} · ${Z.length}</div>`; continue; }
      const zeig = Z.slice(0, Math.max(0, rest)); Z.filter(immer).forEach((o) => { if (!zeig.includes(o)) zeig.unshift(o); });
      html += `<div class="tg${rot ? ' rot' : ''}">${name} · ${Z.length}</div>` + zeig.map((x) => tdZeile(x).replace('<b>', `<b><span class="zt-a zt-${x._art}">${esc(ZT_WORT[x._art])}</span>`)).join('');
      rest -= Z.length;
    }
    if (!L.length) html += `<p class="mute" style="margin:.4rem 0">${this.filter === 'warte' ? 'Du wartest auf nichts.' : 'Nichts zu tun 🎉'}</p>`;
    else if (L.length > 10) html += `<button type="button" class="ue-mehr" data-ztmehr>${this.mehr ? 'weniger' : `alle ${L.length} zeigen`}</button>`;
    if ((TD.fehler || []).length) html += `<div class="fehler">${TD.fehler.map(esc).join('<br>')}</div>`;
    box.innerHTML = html;
  },
};
const ZT_WORT = { aufgabe: 'Aufgabe', mail: 'Mail', frist: 'Frist', zeiten: 'Zeiten', warte: 'Warte auf' };
document.addEventListener('click', async (e) => {
  const t = e.target; if (!t.closest || !t.closest('#todo.zt')) return;
  const f = t.closest('[data-ztf]'); if (f) { TDZU.filter = f.dataset.ztf; try { localStorage.setItem('zt.filter', TDZU.filter); } catch { /* egal */ } tdZeigen(); return; }
  if (t.closest('[data-ztmehr]')) { TDZU.mehr = !TDZU.mehr; tdZeigen(); return; }
  const a = t.closest('[data-ztauf]'); if (a) { const x = tdFinde(a.dataset.ztauf); if (!x || !x.link) return;
    const [k] = x.link.split(':'), app = ((BPHead.conf || {}).apps || []).find((y) => y.key === k && y.allowed);
    if (app) { bpZurueckMerken({ titel: 'Zu tun: ' + (x.titel || ''), key: x.key, haken: !x.ohneHaken }); location.href = appUrl(app) + '/' + x.link.slice(k.length + 1); } return; }
  const w = t.closest('[data-ztweg]'); if (w) {   // „Neu für dich“: gesehen – für mich ausblenden (wie der Haken bei automatischen Hinweisen)
    const K = w.dataset.ztweg.split('|'), alt = (TD.auto || []).filter((x) => K.includes(x.key));
    await Promise.all(K.map((key) => api('api/bp/todo-zustand', 'POST', { key, aus: true }))).catch((er) => toast(er.message, true));
    TD.auto = (TD.auto || []).filter((x) => !K.includes(x.key)); tdZeigen();
    rueckgaengig('Ausgeblendet', async () => { await Promise.all(K.map((key) => api('api/bp/todo-zustand', 'POST', { key }))); TD.auto.push(...alt); tdZeigen(); }, { neu: async () => { if (window.tdLaden) await tdLaden(); } });
  }
});
