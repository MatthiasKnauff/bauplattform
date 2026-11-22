'use strict';
/* Kette 🔗 im Bauzeitenplan (Mock „Bauzeitenplan Logik“ H1–H3, 22.11.2026) – dasselbe Zeichen wie im LV (Positionen aus dem
   Gebäudemodell, Fenster- & Türliste: i.bp-kette, bp.css).
   Eine Leistung aus dem Assistenten folgt ihm, solange Dauer, Name und Vorgänger noch sein Vorschlag sind (t.vs). Von Hand
   geändert = Kette gelöst. „Plan neu aus den Angaben“ ersetzt den Plan nicht mehr, sondern gleicht ab (planAbgleich): Leistungen,
   die dem Assistenten folgen, bekommen den neuen Vorschlag; von Hand geänderte bleiben, wie sie sind (H3: der neue Vorschlag steht
   im Hinweis der Kette); eigene Leistungen, Firmen, Notizen, Fortschritt, „Anfang nicht früher als“ bleiben immer; gelöschte
   Leistungen des Assistenten kommen nicht wieder (P.hand.weg).
   Klick auf die Kette: verbunden → lösen (t.los); gelöst → zurück auf den Vorschlag (Dauer, Name, Vorgänger). */
(() => {
  const sig = (L) => (L || []).map((p) => `${p.uid}:${p.type || 'FS'}:${p.lag || 0}`).sort().join(',');
  const kopie = (L) => (L || []).map((p) => ({ uid: p.uid, type: p.type || 'FS', lag: p.lag || 0 }));
  const vsVon = (t) => ({ d: t.dur, n: t.name, p: sig(t.preds), pl: kopie(t.preds) });
  const istAssist = (t) => !!(t && t.cat && t.cat[0] !== '_');
  /* null = kein Vorschlag bekannt (eigene Leistung, alter Plan), sonst true/false */
  function vonHand(t) {
    if (!istAssist(t) || !t.vs) return null;
    return !!(t.los || t.dur !== t.vs.d || t.name !== t.vs.n || sig(t.preds) !== t.vs.p);
  }
  /* Assistent hat geschrieben: Vorschlag merken – für die Leistungen in „nur“ (folgten ihm vorher) und alle ohne Vorschlag (neu) */
  function merken(L, nur) {
    for (const t of L) if (istAssist(t) && (!t.vs || !nur || nur.has(t))) { t.vs = vsVon(t); delete t.los; }
  }
  const folgend = (L) => new Set(L.filter((t) => istAssist(t) && t.vs && !vonHand(t)));

  /* Schlüssel einer Zeile über Pläne hinweg (die uid ist je Aufbau neu): Katalog-Eintrag, Einheit, Gebäudeteil, Bauphase */
  const roh = (t) => [t.cat, t.blk ?? -1, t.teil ?? '', t.ph || ''].join('|');
  function schluessel(L) { const z = {}, m = new Map(); for (const t of L) { if (!t.cat) continue; const k = roh(t); z[k] = (z[k] || 0) + 1; m.set(t, k + '#' + z[k]); } return m; }
  const schluesselEiner = (t) => roh(t) + '#1';

  /* Abgleich: A = was die bisherigen Angaben ergeben (oder null), B = was die neuen ergeben, plan = jetziger Plan.
     → { tasks, nextUid, neu, weg, behalten } */
  function planAbgleich(A, B, plan, nextUid, geloescht) {
    const kA = A ? schluessel(A) : new Map(), kB = schluessel(B), kP = schluessel(plan);
    const Ak = new Map([...kA].map(([t, k]) => [k, t])), Pk = new Map([...kP].map(([t, k]) => [k, t]));
    const aUid = new Map((A || []).map((t) => [t.uid, kA.get(t)])), pUid = new Map(plan.map((t) => [t.uid, kP.get(t)])), bUid = new Map(B.map((t) => [t.uid, kB.get(t)]));
    const keysOf = (t, M) => (t.preds || []).map((p) => `${M.get(p.uid) || 'u' + p.uid}:${p.type || 'FS'}:${p.lag || 0}`).sort().join(',');
    const weg = new Set(geloescht || []);
    const hand = (t, k) => {
      const h = vonHand(t); if (h !== null) return h;
      const a = Ak.get(k); if (!a) return istAssist(t);   // der alte Vorschlag kannte sie nicht: von Hand dazu – bleibt
      return t.dur !== a.dur || t.name !== a.name || keysOf(t, pUid) !== keysOf(a, aUid);
    };
    let next = Math.max(nextUid || 1, ...plan.map((t) => t.uid + 1), ...B.map((t) => t.uid + 1));
    const uidVon = new Map();   // Schlüssel → uid im Ergebnis
    for (const t of B) { const k = kB.get(t), alt = Pk.get(k); if (alt) uidVon.set(k, alt.uid); else if (!weg.has(k)) uidVon.set(k, next++); }
    const umhaengen = (L) => kopie(L).map((p) => ({ ...p, uid: uidVon.get(bUid.get(p.uid)) })).filter((p) => p.uid != null);
    const out = [], benutzt = new Set(), R = { neu: 0, weg: 0, behalten: 0 };
    for (const tb of B) {
      const k = kB.get(tb), alt = Pk.get(k);
      if (!uidVon.has(k)) continue;   // von Hand gelöscht
      if (alt) {
        benutzt.add(alt);
        const h = hand(alt, k), o = alt;
        o.lvl = tb.lvl; o.blk = tb.blk; if (tb.teil != null) o.teil = tb.teil; else delete o.teil; o.ph = tb.ph;
        if (!h) {
          o.dur = tb.dur; o.name = tb.name; o.gw = tb.gw; o.preds = umhaengen(tb.preds);
          if (o.segs && o.segs.reduce((s, x) => s + (x.d || 0), 0) !== o.dur) delete o.segs;
          if (istAssist(o)) { o.vs = vsVon(o); delete o.los; }
        } else {
          if (istAssist(o)) { const pl = umhaengen(tb.preds); o.vs = { d: tb.dur, n: tb.name, p: sig(pl), pl }; }   // H3: der neue Vorschlag steht an der Kette
          R.behalten++;
        }
        out.push(o);
      } else {
        const o = { ...tb, uid: uidVon.get(k), preds: umhaengen(tb.preds) };
        if (istAssist(o)) o.vs = vsVon(o);
        out.push(o); if (istAssist(o)) R.neu++;
      }
    }
    // was der neue Vorschlag nicht mehr kennt: eigene Leistungen und von Hand geänderte bleiben (hinter ihrem bisherigen Vorgänger), der Rest entfällt
    let vor = null;
    for (const t of plan) {
      if (benutzt.has(t)) { vor = t; continue; }
      const k = kP.get(t), bleibt = !t.cat || (istAssist(t) && hand(t, k));
      if (!bleibt) { if (istAssist(t)) R.weg++; continue; }
      const i = vor ? out.indexOf(vor) : -1, gruppe = vor && out[i + 1] && out[i + 1].lvl > vor.lvl;
      t.lvl = vor ? vor.lvl + (gruppe ? 1 : 0) : 0;
      out.splice(i + 1, 0, t); vor = t;
      if (t.cat) R.behalten++;
    }
    const da = new Set(out.map((t) => t.uid));
    out.forEach((t) => { t.preds = (t.preds || []).filter((p) => da.has(p.uid) && p.uid !== t.uid); if (t.vs && t.vs.pl) { t.vs.pl = t.vs.pl.filter((p) => da.has(p.uid)); t.vs.p = sig(t.vs.pl); } });
    return { tasks: out, nextUid: Math.max(next, ...out.map((t) => t.uid + 1)), ...R };
  }

  /* Zeichen in der Namensspalte (gantt-diagramm.js cellHTML) */
  function planKette(t) {
    const h = vonHand(t); if (h === null) return '';
    const vs = t.vs, wie = vs && (vs.d !== t.dur ? `Vorschlag ${vs.d} AT, hier ${t.dur} AT` : vs.n !== t.name ? `Vorschlag „${vs.n}“` : t.los ? 'gelöst' : 'Vorgänger geändert');
    return `<i class="bp-kette${h ? ' los' : ''}" data-kette title="${h ? `Von Hand geändert (${window.bpEsc(wie)}) – „Plan neu aus den Angaben“ lässt die Leistung so. Klick: zurück auf den Vorschlag` : 'Folgt dem Planungsassistenten (Dauer, Vorgänger) – Klick: lösen'}">🔗</i>`;
  }
  function klick(i) {
    const t = P.tasks[i]; const h = vonHand(t); if (h === null) return;
    act(() => {
      if (!h) { t.los = 1; return; }
      const vs = t.vs, da = new Set(P.tasks.map((x) => x.uid));
      t.dur = vs.d; t.name = vs.n; t.preds = kopie(vs.pl).filter((p) => da.has(p.uid)); delete t.los;
      if (t.segs && t.segs.reduce((s, x) => s + (x.d || 0), 0) !== t.dur) delete t.segs;
    });
    if (typeof toast === 'function') toast(h ? `„${t.name}“ folgt wieder dem Vorschlag.` : `„${t.name}“ gelöst – „Plan neu aus den Angaben“ lässt sie so.`);
  }
  document.addEventListener('click', (e) => {
    const k = e.target.closest && e.target.closest('[data-kette]'); if (!k || !k.closest('#gridBody')) return;
    const row = k.closest('[data-r]'); if (!row || typeof vis === 'undefined') return;
    e.preventDefault(); e.stopPropagation(); klick(vis[+row.dataset.r]);
  }, true);
  /* Gelöschte Leistungen des Assistenten merken – „Plan neu“ bringt sie nicht wieder (gantt-befehle.js deleteSel) */
  function geloescht(L) {
    if (!P.assist) return;
    const S = (P.hand = P.hand || {}), w = new Set(S.weg || []);
    L.filter(istAssist).forEach((t) => w.add(schluesselEiner(t)));
    S.weg = [...w].slice(-2000);
  }
  window.planKette = planKette;
  window.GKette = { vonHand, merken, folgend, planAbgleich, geloescht, schluessel };
})();
