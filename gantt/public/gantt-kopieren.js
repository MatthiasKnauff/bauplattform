'use strict';
/* Bauzeitenplan – Kopieren, Einfügen, Duplizieren mit Master (GO 16.11.2026, Mock „Bauzeitenplan: Kopieren, Einfügen, Duplizieren mit Master“).
   Teil der Seite index.html (nach gantt-ereignisse.js, vor gantt-start.js; gemeinsame Namen).

   Entschieden:
     A  Änderungen am Master gehen auf Nachfrage in alle Kopien („In 3 Kopien übernehmen?“); was in einer Kopie von Hand geändert wurde,
        bleibt (übernommen wird nur, was in der Kopie noch so steht wie vorher im Master).
     B  Die Zahl im Namen wird hochgezählt (Wohnung 1 → 2, 3 …; „1. OG“ → „2. OG“); ohne Zahl „… (2)“.
     C  Hintereinander = im Takt wie im Planungsassistenten: jede Leistung wartet auf dieselbe Leistung der vorigen Kopie.
     D  Strg+C / Strg+V und Ziehen mit Strg geben eine einfache Kopie ohne Master; nur „Duplizieren …“ macht den Master.
     Kette: Wer einen Master oder eine seiner Kopien noch einmal dupliziert, hängt die neuen Kopien hinten an die Kette
        (Wohnung 4, 5 … im Takt nach der letzten Kopie).
     E  Beim einfachen Kopieren kommen die Verknüpfungen innerhalb der kopierten Zeilen mit, die nach außen nicht.
        Beim Duplizieren entscheidet das Häkchen „Verknüpfungsschema wiederholen“ über die nach außen (Vorgänger und Nachfolger).
   Felder am Plan: mst (Gruppe/Leistung ist Master), mu (uid der entsprechenden Leistung im Master – an jeder Leistung einer Kopie).

   GKopie – reine Funktionen (ohne Oberfläche, geprüft in tools/tests/js/kopieren.test.mjs); darunter die Befehle der Seite. */
(function (root) {
  const klon = (x) => JSON.parse(JSON.stringify(x));
  const ende = (T, i) => { let j = i; while (j + 1 < T.length && T[j + 1].lvl > T[i].lvl) j++; return j; };
  const vorfahr = (T, a, b) => b > a && b <= ende(T, a);

  /* oberste markierte Zeilen (mit ihren Untergruppen) → [[von, bis], …] in Plan-Reihenfolge */
  function bloecke(T, ix) {
    const tops = [...new Set(ix)].sort((a, b) => a - b).filter((i) => !ix.some((j) => j !== i && vorfahr(T, j, i)));
    return tops.map((i) => [i, ende(T, i)]);
  }
  const blattig = (T, k) => !(k + 1 < T.length && T[k + 1].lvl > T[k].lvl);

  /* Zahl im Namen hochzählen: die letzte Zahl um k erhöhen; ohne Zahl „Name (k+1)“ */
  function nummer(name, k) {
    const s = String(name || '');
    const m = /(\d+)(?!.*\d)/.exec(s);
    if (!m) return `${s} (${k + 1})`.trim();
    return s.slice(0, m.index) + (parseInt(m[1], 10) + k) + s.slice(m.index + m[1].length);
  }

  /* Zeilen kopieren: neue uids, Verknüpfungen innerhalb mitnehmen, nach außen nur mit extern. → { tasks, map: Map(alt → neu) } */
  function kopie(T, ranges, neueUid, o = {}) {
    const alt = [];
    ranges.forEach(([a, b]) => { for (let k = a; k <= b; k++) alt.push(T[k]); });
    const map = new Map(alt.map((t) => [t.uid, neueUid()]));
    const tasks = alt.map((t) => {
      const c = klon(t);
      c.uid = map.get(t.uid);
      c.pct = 0;
      delete c.mst;
      if (o.master) c.mu = t.uid; else delete c.mu;
      c.preds = (t.preds || []).filter((p) => map.has(p.uid) || o.extern).map((p) => (map.has(p.uid) ? { ...klon(p), uid: map.get(p.uid) } : klon(p)));
      return c;
    });
    return { tasks, map };
  }

  /* Duplizieren: n Kopien hinter dem letzten markierten Block; art 'parallel' | 'takt'; schema = Verknüpfungen nach außen wiederholen.
     Die markierten obersten Zeilen werden Master (mst), jede Leistung der Kopien kennt ihr Gegenstück (mu). → neue Liste T */
  function duplizieren(T, ix, n, art, schema, neueUid) {
    T = klon(T);
    let R = bloecke(T, ix);
    if (!R.length || !(n >= 1)) return T;
    // Kette weiterführen: eine Kopie (oder der Master) einer Kette gewählt → vom Master aus, neue Kopien hinten an die Kette,
    // die Zahl im Namen läuft weiter, der Takt schließt an die letzte Kopie an
    let kette = null;
    if (R.length === 1) {
      const t = T[R[0][0]], mu = t.mst ? t.uid : t.mu, im = mu != null ? T.findIndex((x) => x.uid === mu && x.mst) : -1;
      if (im >= 0) {
        const K = kopienVon(T, mu);
        if (K.length) {
          R = [[im, ende(T, im)]];
          const letzte = K[K.length - 1], il = T.findIndex((x) => x.uid === letzte.top);
          kette = { schon: K.length, nach: ende(T, il), vorige: new Map([...letzte.glieder].map(([m, x]) => [m, x.uid])) };
        }
      }
    }
    const tops = R.map(([a]) => T[a].uid), drin = new Set();
    R.forEach(([a, b]) => { for (let k = a; k <= b; k++) drin.add(T[k].uid); });
    R.forEach(([a]) => { T[a].mst = true; });
    const blatt = new Set();
    R.forEach(([a, b]) => { for (let k = a; k <= b; k++) if (blattig(T, k)) blatt.add(T[k].uid); });
    const neu = [];
    let vorige = kette ? kette.vorige : null;   // Map master-uid → uid in der vorigen Kopie (für den Takt)
    for (let j = 1; j <= n; j++) {
      const k = j + (kette ? kette.schon : 0);
      const { tasks, map } = kopie(T, R, neueUid, { master: true, extern: schema });
      tasks.forEach((t) => { if (tops.includes(t.mu)) t.name = nummer(t.name, k); });
      if (art === 'takt') {
        tasks.forEach((t) => {
          if (!blatt.has(t.mu)) return;
          const vor = vorige ? vorige.get(t.mu) : t.mu;
          if (vor != null && !t.preds.some((p) => p.uid === vor)) t.preds.push({ uid: vor, type: 'FS', lag: 0 });
        });
      }
      if (schema) {   // Nachfolger außerhalb warten auch auf die Kopie (z. B. „Abnahme“ nach allen Wohnungen)
        T.forEach((t) => {
          if (drin.has(t.uid)) return;
          (t.preds || []).filter((p) => drin.has(p.uid)).forEach((p) => { const q = map.get(p.uid); if (!t.preds.some((x) => x.uid === q)) t.preds.push({ ...klon(p), uid: q }); });
        });
      }
      vorige = map;
      neu.push(...tasks);
    }
    const nach = kette ? kette.nach : Math.max(...R.map(([, b]) => b));
    T.splice(nach + 1, 0, ...neu);
    return T;
  }

  /* Einfügen (Strg+V, Ziehen mit Strg): Zwischenablage → an Stelle at mit Ebene lvl; Verknüpfungen nur innerhalb. → neue Liste T */
  function einfuegen(T, ablage, at, lvl, neueUid) {
    T = klon(T);
    if (!ablage || !ablage.length) return T;
    const R = [[0, ablage.length - 1]];
    const { tasks } = kopie(ablage, R, neueUid, {});
    const d = lvl - Math.min(...tasks.map((t) => t.lvl));
    tasks.forEach((t) => { t.lvl = Math.max(0, t.lvl + d); });
    T.splice(Math.max(0, Math.min(at, T.length)), 0, ...tasks);
    return T;
  }

  /* Zwischenablage aus der Markierung: die Zeilen (mit Untergruppen), Ebenen ab 0 */
  function ablegen(T, ix) {
    const R = bloecke(T, ix), out = [];
    R.forEach(([a, b]) => { const l0 = T[a].lvl; for (let k = a; k <= b; k++) out.push({ ...klon(T[k]), lvl: T[k].lvl - l0 }); });
    out.forEach((t) => { delete t.mst; delete t.mu; });
    return out;
  }

  /* Kopien eines Masters: [{ top: uid, glieder: Map(mu → Leistung) }] */
  function kopienVon(T, master) {
    const out = [];
    T.forEach((t, i) => {
      if (t.mu !== master || t.mst) return;
      const g = new Map();
      for (let k = i; k <= ende(T, i); k++) if (T[k].mu != null) g.set(T[k].mu, T[k]);
      out.push({ top: t.uid, glieder: g });
    });
    return out;
  }
  const FELDER = ['name', 'dur', 'gw', 'res', 'color', 'notes', 'ph', 'segs'];
  const gleich = (a, b) => JSON.stringify(a == null ? null : a) === JSON.stringify(b == null ? null : b);

  /* Was hat sich in Master-Blöcken geändert? alt/neu = Listen der Leistungen → [{ master, name, kopien }] */
  function masterGeaendert(alt, neu) {
    const out = [];
    neu.forEach((t, i) => {
      if (!t.mst) return;
      const ia = alt.findIndex((x) => x.uid === t.uid); if (ia < 0) return;
      const A = alt.slice(ia, ende(alt, ia) + 1), N = neu.slice(i, ende(neu, i) + 1);
      const sauber = (L) => L.map((x) => ({ ...x, pct: 0, cons: null, collapsed: false, lvl: x.lvl - L[0].lvl, mst: false }));
      if (JSON.stringify(sauber(A)) === JSON.stringify(sauber(N))) return;
      const k = kopienVon(neu, t.uid).length;
      if (k) out.push({ master: t.uid, name: t.name, kopien: k });
    });
    return out;
  }

  /* Änderungen des Masters in die Kopien tragen (Entscheidung A). → neue Liste T, Anzahl geänderter Leistungen */
  function uebertragen(alt, T, master, neueUid) {
    T = klon(T);
    const im = T.findIndex((x) => x.uid === master), ia = alt.findIndex((x) => x.uid === master);
    if (im < 0 || ia < 0) return { T, n: 0 };
    const A = new Map(alt.slice(ia, ende(alt, ia) + 1).map((x) => [x.uid, x]));
    const N = T.slice(im, ende(T, im) + 1), Nu = new Set(N.map((x) => x.uid));
    let n = 0;
    for (const K of kopienVon(T, master)) {
      const g = K.glieder;
      // Felder: nur, was in der Kopie noch wie vorher im Master steht (Abweichungen von Hand bleiben); Name der obersten Zeile bleibt
      for (const m of N) {
        const a = A.get(m.uid), c = g.get(m.uid); if (!a || !c) continue;
        for (const f of FELDER) {
          if (f === 'name' && m.uid === master) continue;
          if (!gleich(a[f], m[f]) && gleich(c[f], a[f])) { c[f] = m[f] == null ? m[f] : klon(m[f]); n++; }
        }
      }
      // neue Leistungen im Master → in die Kopie (hinter das Gegenstück des Vorgängers)
      for (let j = 1; j < N.length; j++) {
        const m = N[j]; if (A.has(m.uid) || g.has(m.uid)) continue;
        const vor = g.get(N[j - 1].uid); if (!vor) continue;
        const iv = T.indexOf(vor), lvl = vor.lvl + (m.lvl - N[j - 1].lvl);
        const c = { ...klon(m), uid: neueUid(), pct: 0, mu: m.uid, lvl, preds: [] }; delete c.mst;
        T.splice(m.lvl > N[j - 1].lvl ? iv + 1 : ende(T, iv) + 1, 0, c); g.set(m.uid, c); n++;
      }
      // im Master gelöschte Leistungen → aus der Kopie
      for (const [mu, c] of [...g]) {
        if (mu !== master && A.has(mu) && !Nu.has(mu)) { const i = T.indexOf(c); if (i >= 0) { T.splice(i, 1); g.delete(mu); n++; } }
      }
      // Verknüpfungen innerhalb des Masters: übernehmen, wenn die Kopie sie noch wie vorher hatte
      const zuK = (p) => (Nu.has(p.uid) || A.has(p.uid) ? (g.get(p.uid) || {}).uid : p.uid);
      for (const m of N) {
        const a = A.get(m.uid), c = g.get(m.uid); if (!c) continue;
        const innen = (L) => (L || []).filter((p) => A.has(p.uid) || Nu.has(p.uid));
        const vorher = a ? innen(a.preds).map((p) => ({ ...p, uid: zuK(p) })) : [];
        const jetzt = innen(m.preds).map((p) => ({ ...p, uid: zuK(p) })).filter((p) => p.uid != null);
        const cIn = (c.preds || []).filter((p) => [...g.values()].some((x) => x.uid === p.uid));
        if (gleich(innen(a ? a.preds : []), innen(m.preds)) || !gleich(cIn, vorher)) continue;
        c.preds = (c.preds || []).filter((p) => !cIn.includes(p)).concat(jetzt); n++;
      }
    }
    return { T, n };
  }

  root.GKopie = { bloecke, nummer, kopie, duplizieren, einfuegen, ablegen, kopienVon, masterGeaendert, uebertragen };
}(typeof window !== 'undefined' ? window : globalThis));

/* =====================================================================
   Befehle der Seite (nur im Browser)
   ===================================================================== */
if (typeof document !== 'undefined' && typeof P !== 'undefined') {
  var ABLAGE = null;   // eslint-disable-line no-var – Zwischenablage des Plans (auch über Pläne und Versionen hinweg, in diesem Browser)
  const ablageLesen = () => { try { return ABLAGE || JSON.parse(localStorage.getItem('gantt.ablage') || 'null'); } catch { return ABLAGE; } };
  const neueUid = () => P.nextUid++;

  window.kopierenSel = function () {
    const ix = selIdx(); if (!ix.length) return;
    ABLAGE = GKopie.ablegen(P.tasks, ix);
    try { localStorage.setItem('gantt.ablage', JSON.stringify(ABLAGE)); } catch { /* nur in diesem Fenster */ }
    toast(`${ABLAGE.length} ${ABLAGE.length === 1 ? 'Leistung' : 'Leistungen'} kopiert – mit Strg+V unter einer Zeile einfügen.`);
  };
  window.kannEinfuegen = () => !!(ablageLesen() || []).length;
  function einfuegenBei(at, lvl) {
    const A = ablageLesen(); if (!A || !A.length) { toast('Nichts zum Einfügen – erst Leistungen kopieren (Strg+C).', true); return; }
    let vorher;
    const ok = act(() => { vorher = new Set(P.tasks.map((t) => t.uid)); P.tasks = GKopie.einfuegen(P.tasks, A, at, lvl, neueUid); sel = new Set(P.tasks.filter((t) => !vorher.has(t.uid)).map((t) => t.uid)); });
    if (ok) { const r = rowOfIdx(Math.min(...[...sel].map(idxOfUid))); if (r >= 0) { cur.r = r; anchorR = r; } updateSel(); ensureVisible(cur.r); }
  }
  window.einfuegenSel = function () {   // unter der aktuellen Zeile (hinter ihrer Gruppe), auf ihrer Ebene
    if (cur.r < vis.length) { const i = vis[cur.r]; einfuegenBei(blockEnd(i) + 1, P.tasks[i].lvl); }
    else einfuegenBei(P.tasks.length, 0);
  };
  window.kopierenNach = function (ix, rt) {   // Ziehen mit Strg: vor Zeile rt
    ABLAGE = GKopie.ablegen(P.tasks, ix);
    const at = rt < vis.length ? vis[rt] : P.tasks.length, lvl = at < P.tasks.length ? P.tasks[at].lvl : (P.tasks.length ? P.tasks[P.tasks.length - 1].lvl : 0);
    einfuegenBei(at, lvl);
  };

  window.duplizierenDialog = function () {
    const ix = selIdx(); if (!ix.length) return;
    const R = GKopie.bloecke(P.tasks, ix), n0 = R.reduce((s, [a, b]) => s + b - a + 1, 0);
    let top = P.tasks[R[0][0]];
    const mu = R.length === 1 ? (top.mst ? top.uid : top.mu) : null, mst = mu != null ? P.tasks.find((x) => x.uid === mu && x.mst) : null;
    const schon = mst ? GKopie.kopienVon(P.tasks, mst.uid).length : 0;
    if (mst && schon) top = mst;   // Kette weiterführen: vom Master aus, hinten anhängen
    const titel = R.length === 1 ? `„${top.name}“` : `${R.length} Gruppen`;
    const bg = modal('Duplizieren', `<div class="kp-d"><p>${esc(titel)} duplizieren (${n0} ${n0 === 1 ? 'Leistung' : 'Leistungen'}).</p>
      <label class="kp-z">Anzahl Kopien <input id="kpN" type="number" min="1" max="50" value="1"> <span id="kpNamen" class="kp-m"></span></label>
      <label class="kp-o"><input type="radio" name="kpArt" value="parallel"> <span><b>Parallel</b><br><small>Alle Kopien beginnen zur gleichen Zeit wie der Master.</small></span></label>
      <label class="kp-o"><input type="radio" name="kpArt" value="takt" checked> <span><b>Hintereinander im Takt</b><br><small>Wie im Assistenten: jede Leistung wartet auf dieselbe Leistung der vorigen Kopie.</small></span></label>
      <label class="kp-c"><input type="checkbox" id="kpSchema" checked> Verknüpfungsschema wiederholen <small>(Vorgänger und Nachfolger außerhalb)</small></label>
      <p class="kp-m">${schon ? `Hängt an die Kette von „${esc(top.name)}“ an (schon ${schon} ${schon === 1 ? 'Kopie' : 'Kopien'}) – im Takt nach der letzten Kopie.` : `„${esc(top.name)}“ wird Master: Änderungen daran lassen sich später in alle Kopien übernehmen.`}</p></div>`,
    [{ label: 'Abbrechen', left: true }, { label: 'Duplizieren', cls: 'primary', primary: true, fn: (b) => {
      const n = Math.max(1, Math.min(50, parseInt(b.querySelector('#kpN').value, 10) || 1)), art = b.querySelector('[name=kpArt]:checked').value, schema = b.querySelector('#kpSchema').checked;
      let vorher;
      const ok = act(() => { vorher = new Set(P.tasks.map((t) => t.uid)); P.tasks = GKopie.duplizieren(P.tasks, ix, n, art, schema, neueUid); sel = new Set(R.map(([a]) => P.tasks[a] && P.tasks[a].uid).filter(Boolean)); });
      if (ok) { updateSel(); toast(`${n} ${n === 1 ? 'Kopie' : 'Kopien'} angelegt – „${top.name}“ ist der Master.`); }
      void vorher;
    } }]);
    const zeig = () => { const n = Math.max(1, Math.min(50, parseInt(bg.querySelector('#kpN').value, 10) || 1)); bg.querySelector('#kpNamen').textContent = '→ ' + Array.from({ length: Math.min(n, 4) }, (_, k) => GKopie.nummer(top.name, schon + k + 1)).join(', ') + (n > 4 ? ' …' : ''); };
    bg.querySelector('#kpN').addEventListener('input', zeig); zeig();
  };

  /* Nach jeder Änderung: hat sich ein Master geändert? → Leiste „In N Kopien übernehmen?“ (gantt-kern.js ruft nachAct) */
  let MB = null;
  window.nachAct = function (snapAlt) {
    if (window.__mstUebertragen) return;
    let alt; try { alt = JSON.parse(snapAlt).tasks || []; } catch { return; }
    const G = GKopie.masterGeaendert(alt, P.tasks); if (!G.length) return;
    const g = G[0];
    if (MB) MB.remove();
    MB = document.createElement('div'); MB.className = 'kp-bar';
    MB.innerHTML = `<span>Master „${esc(g.name)}“ geändert – in ${g.kopien} ${g.kopien === 1 ? 'Kopie' : 'Kopien'} übernehmen?</span><button type="button" class="btn primary" data-kp="ja">Übernehmen</button><button type="button" class="btn" data-kp="nein">Nein</button>`;
    document.body.appendChild(MB);
    MB.addEventListener('click', (e) => {
      const b = e.target.closest('[data-kp]'); if (!b) return;
      MB.remove(); MB = null;
      if (b.dataset.kp !== 'ja') return;
      let n = 0;
      window.__mstUebertragen = true;
      try { act(() => { const r = GKopie.uebertragen(alt, P.tasks, g.master, neueUid); P.tasks = r.T; n = r.n; }); } finally { window.__mstUebertragen = false; }
      toast(n ? `In die Kopien übernommen (${n} ${n === 1 ? 'Änderung' : 'Änderungen'}).` : 'Die Kopien waren schon so – oder dort von Hand geändert.');
    });
  };
}
