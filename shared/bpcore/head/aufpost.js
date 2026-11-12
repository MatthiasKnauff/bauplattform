/* Navigation „Aufgaben & Post“ – gemeinsam für die Seiten Aufgaben (Offen) und Kommunikation (Verschickt), damit beide wie eine App
   wirken: links dieselben Gruppen, ein Klick auf einen Punkt der anderen Seite wechselt dorthin (#tab bzw. #art=…).
   bpAufPost(el, o)
     o.hier     'aufgaben' | 'kommunikation'
     o.aktiv    id des gewählten Punkts: 'o:<tab>' (Offen), 'v:' bzw. 'v:<art>' (Verschickt), 'w:<k>' (Mit wem)
     o.offen    { uebersicht, todos, maengel, termine, erinnerungen } – Zahlen (nur auf der Seite Aufgaben bekannt)
     o.arten    [{ key, name, n }] – Arten des Verschickten mit Zahl (nur auf der Seite Kommunikation bekannt)
     o.mitwem   [{ name, n, tip }] – Kontakte im Projekt (Kommunikation)
     o.wahl     (id) => …  Klick auf einen Punkt dieser Seite */
(() => {
  if (window.bpAufPost) return;
  const IC = { uebersicht: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>', todos: '<path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11"/>',
    maengel: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>', termine: '<path d="M4 5h16v15H4zM4 9h16M8 3v4M16 3v4"/>', erinnerungen: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2 2M5 4l3 2M19 4l-3 2"/>',
    post: '<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>', person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' };
  const OFFEN = [['uebersicht', 'Übersicht'], ['todos', 'To-dos'], ['maengel', 'Mängel & Weisungen'], ['termine', 'Termine & Verzug'], ['erinnerungen', 'Erinnerungen']];
  const ARTEN = [['planversand', 'Planversand'], ['maengelruege', 'Mängelrüge'], ['terminruege', 'Terminrüge'], ['nachricht', 'Nachricht'], ['vorgang', 'Vorgang']];   // ohne Zahlen (Seite Aufgaben)
  const ziel = (key) => { const H = window.BPHead, a = H && H.conf && (H.conf.apps || []).find((x) => x.key === key); return a && a.allowed !== false && H.appUrl ? H.appUrl(a) + '/' : null; };
  window.bpAufPost = function (el, o) {
    const G = [{ titel: 'Offen', punkte: OFFEN.map(([k, t]) => ({ id: 'o:' + k, text: t, icon: IC[k], farbe: 'var(--af-aufgaben)', zahl: o.offen && o.offen[k] ? String(o.offen[k]) : '' })) }];
    if (o.hier === 'kommunikation' || ziel('kommunikation')) {
      const A = o.arten ? o.arten.map((a) => [a.key, a.name, a.n]) : ARTEN;
      G.push({ titel: 'Verschickt', punkte: [{ id: 'v:', text: 'Alles', icon: IC.post, farbe: 'var(--c-v)', zahl: o.arten ? String(o.arten.reduce((s, a) => s + a.n, 0)) : '' }]
        .concat(A.map(([k, t, n]) => ({ id: 'v:' + k, text: t, icon: IC.post, zahl: n == null ? '' : String(n) }))) });
    }
    if (o.mitwem && o.mitwem.length) G.push({ titel: 'Mit wem', punkte: o.mitwem.map((x, k) => ({ id: 'w:' + k, text: x.name, icon: IC.person, zahl: String(x.n), zahlTip: x.tip || '' })) });
    bpNav(el, { kopf: { titel: 'Aufgaben & Post', klein: '' }, lage: true, attr: 'ap', aktiv: o.aktiv, gruppen: G,
      wahl: (id) => {
        const hier = o.hier === 'aufgaben' ? id.startsWith('o:') : !id.startsWith('o:');
        if (hier) { o.wahl(id); return; }
        const u = ziel(o.hier === 'aufgaben' ? 'kommunikation' : 'aufgaben'); if (!u) return;
        location.href = u + (id.startsWith('o:') ? '#' + id.slice(2) : '#art=' + id.slice(2));
      } });
    bpNav.breite(el, { key: 'aufpost' });
  };
})();
