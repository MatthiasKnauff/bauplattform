/* Navigation von „Post & Vorgänge“ (App aufgaben) – Offen, Verlauf nach Art, Mit wem; eine Seite, kein Wechsel der Adresse.
   Bis 24.11.2026 gemeinsam für zwei Apps (Aufgaben und Kommunikation); seitdem ist der Verlauf Teil derselben Seite.
   bpAufPost(el, o)
     o.aktiv    id des gewählten Punkts: 'o:offen' (Alles offen), 'v:' bzw. 'v:<art>' (Verlauf), 'w:<k>' (Mit wem)
     o.offen    { offen } – Zahl (fällig); seit Etappe 2 (24.11.2026, PV-4 B) gibt es keine eigenen Seiten Mängel, Termine, Erinnerungen, To-dos mehr
     o.offenTip { … } – was die Zahl zählt (Tooltip), z. B. „fällig – offen insgesamt: 26“
     o.arten    [{ key, name, n }] – Arten im Verlauf mit Zahl (null: noch nicht geladen → Arten ohne Zahl)
     o.mitwem   [{ name, n, tip }] – Kontakte im Verlauf
     o.buero    true: Gruppe „Büro“ mit „Bauplattform“ (ToDo-Liste mit Antworten, nur Verwaltung) · o.bueroZahl: wartende Punkte
     o.wahl     (id) => …  Klick auf einen Punkt
     o.filter   bpFilter(…) bzw. { einhaengen(el) } – Suchfeld oben in der Navigation (optional) */
(() => {
  if (window.bpAufPost) return;
  const IC = { offen: '<path d="M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11"/>',
    post: '<path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/>', person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' };
  const OFFEN = [['offen', 'Alles offen']];
  const ARTEN = [['planversand', 'Planversand'], ['maengelruege', 'Mängelrüge'], ['terminruege', 'Terminrüge'], ['nachricht', 'Nachricht'], ['vorgang', 'Vorgang']];   // solange der Verlauf noch nicht geladen ist
  window.bpAufPost = function (el, o) {
    const G = [{ titel: 'Offen', punkte: OFFEN.map(([k, t]) => ({ id: 'o:' + k, text: t, icon: IC[k], farbe: 'var(--af-aufgaben)', zahl: o.offen && o.offen[k] ? String(o.offen[k]) : '', zahlTip: (o.offenTip && o.offenTip[k]) || '' })) }];
    const A = o.arten ? o.arten.map((a) => [a.key, a.name, a.n]) : ARTEN;
    G.push({ titel: 'Verlauf', punkte: [{ id: 'v:', text: 'Alles', icon: IC.post, farbe: 'var(--c-v)', zahl: o.arten ? String(o.arten.reduce((s, a) => s + a.n, 0)) : '' }]
      .concat(A.map(([k, t, n]) => ({ id: 'v:' + k, text: t, icon: IC.post, zahl: n == null ? '' : String(n) }))) });
    if (o.buero) G.push({ titel: 'Büro', punkte: [{ id: 'o:bauplattform', text: 'Bauplattform', icon: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>', zahl: o.bueroZahl ? String(o.bueroZahl) : '', zahlTip: 'Punkte, die auf deine Antwort warten' }] });
    if (o.mitwem && o.mitwem.length) G.push({ titel: 'Mit wem', punkte: o.mitwem.map((x, k) => ({ id: 'w:' + k, text: x.name, icon: IC.person, zahl: String(x.n), zahlTip: x.tip || '' })) });
    bpNav(el, { kopf: { titel: 'Post & Vorgänge', klein: '' }, lage: true, attr: 'ap', aktiv: o.aktiv, gruppen: G,
      davor: o.filter ? '<div class="ap-flt"></div>' : '', nachher: (x) => {   // Suchfeld mit Filtern (bp/filter.js) oben in der Navigation – nur das der gezeigten Ansicht (der Platz bleibt beim Neuzeichnen stehen)
        const pl = x.querySelector('.ap-flt'); if (!o.filter || !pl) return;
        o.filter.einhaengen(pl); [...pl.children].forEach((c) => { if (c !== o.filter.el) c.remove(); });
      },
      wahl: (id) => o.wahl(id) });
    bpNav.breite(el, { key: 'aufpost' });
  };
})();
