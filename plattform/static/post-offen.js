'use strict';
/* Post & Vorgänge – „Alles offen“ (Etappe 2, GO 24.11.2026, Mock „Post & Vorgänge“ PV-2 A, PV-4 B)
   EINE Liste für alles, was offen ist: eigene Aufgaben und Hinweise der Regeln (todo.js/zutun.js – dieselbe Liste wie „Zu tun“ auf der
   Startseite, hier ganz), dazu Mängel & Weisungen, Termine (Firma nicht da), Verzug und Erinnerungen als Einträge. Die früheren Seiten
   Mängel, Termine, Erinnerungen und To-dos gibt es nicht mehr; ihre Auswahl sind die Knöpfe oben in der Liste (Mängel, Termine …).
   Darunter der Verlauf (zuletzt Verschicktes), rechts der Vorgang (seite.js, Schlüssel „ao“) mit derselben Bedienung wie früher
   (Frist, Firma, Rüge, Neu terminieren …) – Karten in aufgaben.html (mangelKarte, terminKarte, vzKarte, erinKarte).
   AO.zeigen(view) · AO.neu() · AO.waehle(key) · AO.mangelIds()
   Braucht aufgaben.html (M, T, VZ, E, AF, scope, render, de, deW) und todo.js/zutun.js (TD, TDZU, tdZeigen). */
window.AO = (() => {
  let sel = '';   // Schlüssel des Eintrags im Vorgang rechts
  TDZU.ls = 'auf.zt';   // Auswahl oben in der Liste getrennt von „Zu tun“ der Startseite gemerkt
  const G = (x, k) => (x[k] ||= []);
  const gruppen = (L) => { const g = {}; L.forEach((x) => G(g, x.pid + '|' + x.key).push(x)); return g; };
  /* Einträge aus Mängeln, Terminen, Verzug, Erinnerungen – „ist“: derselbe Hinweis der Regeln (todo.py) ersetzt den Eintrag hier nicht doppelt */
  function extras() {
    const X = [], h = iso(new Date());
    (M || []).filter((m) => !m.done).forEach((m) => X.push({ key: 'm:' + m.id, ist: 'maengel:' + m.id, auto: true, ohneHaken: true, regel: 'ao', _zart: 'mangel', _wort: m.art_n || 'Mangel',
      titel: String(m.text || m.art_n || '').split('\n')[0].slice(0, 160), projekt: m.projekt || '', firma: m.firma || '', text: [m.firma, m.status === 'ueberfaellig' ? 'Frist abgelaufen' : m.frist ? '' : 'ohne Frist'].filter(Boolean).join(' · '), faellig: m.frist || '' }));
    Object.values(gruppen((T || []).filter((x) => x.status === 'offen'))).forEach((R) => {
      const x0 = R[0], d = R.map((x) => x.datum).sort()[0];
      X.push({ key: 'tg:' + x0.pid + '|' + x0.key, auto: true, ohneHaken: true, regel: 'ao', _zart: 'termin', titel: `${x0.firma} – ${R.length} ${R.length === 1 ? 'Tag' : 'Tage'} nicht bestätigt`,
        projekt: x0.projekt || '', firma: x0.firma || '', text: 'laut Bauzeitenplan erwartet, im Bautagebuch nicht anwesend', faellig: d || '' });
    });
    if (VZ) Object.values(gruppen(VZ.vorgaenge || [])).forEach((R) => {
      const x0 = R[0], at = Math.max(...R.map((x) => +x.verzug || 0));
      X.push({ key: 'vz:' + x0.pid + '|' + x0.key, ist: `terminruege:${x0.pid}:${x0.key}`, auto: true, ohneHaken: true, regel: 'ao', _zart: 'termin', _wort: 'Verzug',
        titel: `${x0.firma} – ca. ${String(at).replace('.', ',')} AT im Verzug`, projekt: x0.projekt || '', firma: x0.firma || '', text: R.map((x) => x.vorgang).slice(0, 3).join(', '), faellig: h });
    });
    ((E && E.items) || []).filter((x) => x.status !== 'erledigt' && !/^b/.test(x.id)).forEach((x) => {   // b…: Fristen aus dem Bautagebuch stehen schon als Mangel da
      X.push({ key: 'e:' + x.id, ist: /^r\d+$/.test(x.id) ? 'erinnerungen:' + x.id.slice(1) : '', auto: true, ohneHaken: true, regel: 'ao', _zart: 'erinnerung',
        titel: x.titel || 'Erinnerung', projekt: x.projekt || '', firma: x.firma || '', text: x.lage === 'abgelaufen' ? 'abgelaufen – neu terminieren oder erledigen' : '', faellig: x.datum || x.termin || '' });
    });
    return X;
  }
  /* Schlüssel → Karte rechts; auch die Hinweise der Regeln (maengel:…, erinnerungen:…, terminruege:…) zeigen ihren Vorgang hier */
  function karte(key) {
    let m;
    if ((m = /^(?:m:|maengel:)(\d+)$/.exec(key))) { const x = (M || []).find((y) => String(y.id) === m[1]); return x && mangelKarte(x); }
    if ((m = /^(?:e:(.+)|erinnerungen:(\d+))$/.exec(key))) { const id = m[1] || 'r' + m[2], x = ((E && E.items) || []).find((y) => y.id === id); return x && erinKarte(x); }
    if ((m = /^tg:(.+)$/.exec(key))) { const R = (T || []).filter((x) => x.pid + '|' + x.key === m[1]); return R.length && terminKarte(R); }
    if ((m = /^(?:vz:(.+)|terminruege:(\d+):(.+))$/.exec(key))) { const k = m[1] || m[2] + '|' + m[3], R = ((VZ && VZ.vorgaenge) || []).filter((x) => x.pid + '|' + x.key === k); return R.length && vzKarte(R); }
    return null;
  }
  const kennt = (key) => /^(m|e|tg|vz):|^(maengel|erinnerungen|terminruege):/.test(key);
  function vorgang(el) {
    const k = sel && karte(sel);
    el.innerHTML = `<div class="sr-pad ao-vg">${k || `<p class="mute">${sel ? 'Dieser Eintrag ist nicht (mehr) offen.' : 'Links einen Mangel, Termin oder eine Erinnerung anklicken – hier stehen dann Frist, Firma, Rüge und alles, was dazugehört. Eigene Aufgaben bearbeitest du direkt in der Liste.'}</p>`}</div>`;
  }
  /* Verlauf darunter: das zuletzt Verschickte (PV-2 A) – der ganze Verlauf ist links unter „Verlauf“ */
  let VL = null, vlTok = 0;
  async function verlaufLaden() {
    const my = ++vlTok, p = window.BPHead && BPHead.projektId && BPHead.projektId();
    try { const r = await api('api/kom?n=8' + (scope === 'mine' && p ? '&pid=' + p : '')); if (my === vlTok) { VL = r.eintraege || []; verlaufZeigen(); } } catch { /* Verlauf ist nur Beigabe */ }
  }
  function verlaufZeigen() {
    const el = document.querySelector('#aoW .ao-ver'); if (!el || !VL) return;
    el.innerHTML = `<div class="ao-vh"><h3>Zuletzt verschickt</h3><a href="#post" data-aopost>ganzer Verlauf ›</a></div>` + (VL.length
      ? VL.map((x) => `<a class="ao-vz" href="#v=${x.id}"><span class="ao-vd">${esc(de(String(x.ts).slice(0, 10)))}</span><span class="zt-a">${esc(x.art_name || '')}</span><b>${esc(x.kontakt || x.name || x.email || '')}</b><span class="mute">${esc(x.betreff || '')}</span></a>`).join('')
      : '<p class="mute">Noch nichts verschickt.</p>');
  }
  function neu() {
    if (!document.getElementById('aoW')) return;
    TDZU.extra = extras();
    if (typeof TD !== 'undefined' && TD) tdZeigen(); else { const b = $('#todo'); if (b && !b.firstChild) b.innerHTML = '<p class="mute">Lade …</p>'; }
    const n = (M || []).filter((m) => !m.done).length, b = $('#mpdf'); if (b) b.hidden = !n;
    document.querySelectorAll('#todo [data-tk]').forEach((r) => r.classList.toggle('ao-on', r.dataset.tk === sel));
    if (window.seiteFuellen) seiteFuellen('ao', 'vorgang');
    verlaufZeigen();
  }
  function zeigen(view) {
    TDZU.alles = true; TDZU.heute = '';
    TDZU.feiner = { maengel: 'mangel', erinnerungen: 'erinnerung', terminruege: 'termin' };   // Hinweise der Regeln in dieselben Knöpfe wie die Einträge hier
    if (!document.getElementById('aoW')) {
      try { TDZU.filter = localStorage.getItem(TDZU.ls) || 'alle'; } catch { TDZU.filter = 'alle'; }
      view.innerHTML = `<div id="aoW" class="ao"><div class="ao-l"><div class="ao-kopf"><h2>Alles offen</h2><span class="fill"></span><button class="btn sm" id="mpdf" hidden title="Die offenen Mängel der Liste als PDF – z. B. für eine Firma">🖨 Mängelliste</button></div><div class="ao-flt"></div>
        <section class="todo zt" id="todo"></section><div class="ao-ver"></div></div></div>`;
      AF.einhaengen($('#aoW .ao-flt'));   // Suchfeld mit Filtern oben in der Liste – nicht in der Navigation (springt sonst beim Wechsel der Ansicht)
      seite($('#aoW'), 'ao', [{ id: 'vorgang', titel: 'Vorgang', mount: vorgang }], { planung: false, w: 0.58 });
      verlaufLaden();
    }
    neu();
  }
  function waehle(key, vonWoanders) {
    sel = key; neu(); if (window.seiteReiter) seiteReiter('ao', 'vorgang');
    const r = document.querySelector(`#todo [data-tk="${CSS.escape(key)}"]`);
    if (vonWoanders && r) r.scrollIntoView({ block: 'nearest' });   // nur, wenn die Auswahl nicht aus der Liste kommt (Link aus der Mail)
  }
  /* Klick auf den Titel eines Mangels, Termins, einer Erinnerung (oder ihres Hinweises): Vorgang rechts statt in eine andere App springen */
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#aoW #todo [data-tk] .tt'); if (!t) return;
    const key = t.closest('[data-tk]').dataset.tk; if (!kennt(key) || !karte(key)) return;
    e.preventDefault(); e.stopImmediatePropagation(); waehle(key);
  }, true);
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-aopost]')) { e.preventDefault(); zuTab('post'); } });
  return { zeigen, neu, waehle, verlauf: verlaufLaden, mangelIds: () => TDZU.alle().map((x) => /^(?:m|maengel):(\d+)$/.exec(x.key)).filter(Boolean).map((m) => +m[1]) };
})();
