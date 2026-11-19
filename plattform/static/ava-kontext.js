'use strict';
/* =====================================================================
   Kontextmenü im Leistungsverzeichnis (GO 19.11.2026, Mock „Kontextmenü im LV“: A1 B1 C1) – über das gemeinsame Menü (head.js, 'bph:kontext').
   Nur Befehle, die es schon gibt (Knöpfe, Tasten); neu ist allein „Bietertextergänzung ändern / entfernen“ (bteBei/bteFeld in ava-bearbeiten.js).
   - Langtext (Tabelle, Fenster „Eigenschaften“, Aufträge): Bietertextergänzung einfügen/ändern/entfernen, ✨ Langtext vorschlagen;
     Vorbemerkungen: „Vorbemerkung aus den Baudaten …“. Darunter setzt head.js die Grundpunkte (Rückgängig, Ausschneiden …).
   - LV-Tabelle: Position, Hinweistext, Gliederungspunkt, mehrere markierte Zeilen.
   - C1: Preisspiegel (Position, Spalte einer Bieter:in), Rechnung (Karte → in der Aufmaßprüfung zeigen).
   ===================================================================== */
(function () {
  const LANG = 'textarea[data-f="lang"],textarea[data-e="lang"],textarea[data-auf="lang"]';
  const blink = (el) => { if (!el) return; el.scrollIntoView({ block: 'center' }); el.classList.add('pj-blink'); setTimeout(() => el.classList.remove('pj-blink'), 1600); };
  const zuTab = (t, sel) => { tab = t; LS.set('tab', tab); render(); setTimeout(() => blink(document.querySelector(sel)), 300); };

  /* ---------- Langtext und Vorbemerkungen ---------- */
  function textPunkte(P, ta) {
    if (ta.matches('[data-vorbem]')) {
      const s = document.querySelector('[data-vbwahl]');
      if (s && s.options.length > 1) P.push({ text: 'Vorbemerkung aus den Baudaten …', fn: () => pickMenu(s, { items: [...s.options].filter((o) => o.value).map((o) => ({ value: o.value, title: o.textContent })),
        onPick: (v) => { s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); } }) });
      return;
    }
    if (!ta.matches(LANG)) return;
    const box = ta.closest('td,div,.grp') || ta.parentElement, frei = !!box.querySelector('[data-bte]') && !ta.readOnly && !ta.disabled;
    const warum = frei ? '' : ' (vergeben – Änderung als Nachtrag)', f = bteBei(ta);
    P.push({ text: 'Bietertextergänzung einfügen …' + warum, fn: () => bteFeld(ta, null), aus: !frei });
    if (f) {
      P.push({ text: (f.art === 'bieter' ? 'Bietertextergänzung' : 'Ergänzung des Büros') + ' ändern …', fn: () => bteFeld(ta, f), aus: !frei },
        { text: (f.art === 'bieter' ? 'Bietertextergänzung' : 'Ergänzung des Büros') + ' entfernen', fn: () => bteSetzen(ta, f.a, f.z, ''), aus: !frei });
    }
    const ki = box.querySelector('[data-a="ki"],[data-m="ki"]') || (ta.closest('tr') && ta.closest('tr').querySelector('[data-a="ki"]'));
    if (ki) P.push({ titel: '' }, { text: '✨ Langtext vorschlagen', fn: () => ki.click(), aus: ki.disabled });
  }

  /* ---------- LV-Tabelle ---------- */
  const istTitel = (x) => x.typ === 'titel', istText = (x) => x.typ !== 'titel' && (x.art === 'T');
  function bereich(i) {   // Gliederungspunkt samt Inhalt
    const I = items(), x = I[i], lv = x.lvl || 1; let e = i + 1;
    while (e < I.length && !(I[e].typ === 'titel' && (I[e].lvl || 1) <= lv)) e++;
    return I.slice(i, e);
  }
  const neu = (kind, id) => { LVSEL = new Set(); LVAKT = id; addItem(kind); };
  function artSetzen(M, v) {
    const P = M.filter((x) => x.typ === 'pos' && x.art !== 'T' && x.art !== 'Z'); if (!P.length) return;
    (async () => {
      for (const x of P) if (gesperrt(x) && !(await freischalten(x))) return;
      P.forEach((x) => { x.art = v; delete x.vb; });
      HIST.next = `${P.length === 1 ? 'Positionsart' : P.length + ' Positionen'}: ${ARTEN[v]}`; changed(true); lvNeu();
    })();
  }
  function lvPunkte(P, tr) {
    const I = items(), i = +tr.dataset.i, x = I[i]; if (!x) return;
    if (!LVSEL.has(x.id)) { LVSEL = new Set(); LVAKT = x.id; LVANK = x.id; lvAktZeigen(); }   // Rechtsklick wählt die Zeile – wie im Explorer
    const M = lvMarkiert(), ro = document.documentElement.classList.contains('bp-nurlesen');
    const zwischen = () => [{ text: 'Kopieren', k: 'Strg+C', fn: () => lvSelAktion('kopieren') }, { text: 'Ausschneiden', k: 'Strg+X', fn: () => lvSelAktion('ausschneiden'), aus: ro },
      { text: 'Einfügen darunter', k: 'Strg+V', fn: () => lvSelAktion('einfuegen'), aus: ro }];
    const arten = (L2) => { const P2 = L2.filter((y) => y.typ === 'pos' && y.art !== 'T' && y.art !== 'Z'); if (!P2.length) return [];
      const jetzt = new Set(P2.map((y) => y.art || 'N'));
      return [['N', 'Normalposition'], ['E', 'Bedarfsposition'], ['A', 'Wahlposition']].map(([k, t]) => ({ text: 'Als ' + t + (jetzt.size === 1 && jetzt.has(k) ? ' ✓' : ''), fn: () => artSetzen(P2, k), aus: ro || (jetzt.size === 1 && jetzt.has(k)) })); };
    if (M.length > 1) {
      P.push(...zwischen(), { titel: '' }, ...arten(M), { titel: '' }, { text: `${M.length} Zeilen löschen`, k: 'Entf', gefahr: true, fn: () => lvSelAktion('loeschen'), aus: ro });
      return;
    }
    if (istTitel(x)) {
      const B = bereich(i), pos = B.filter((y) => y.typ === 'pos'), offen = pos.some((y) => OPEN.has(y.id));
      P.push({ text: 'Umbenennen', k: 'F2', fn: () => { const f = tr.querySelector('[data-f="kurz"]'); if (f) { f.focus(); f.select(); } }, aus: ro },
        { text: 'Eigenschaften …', fn: () => eigDialog(x.id) },
        { titel: '' }, { text: 'Position darin', fn: () => neu('pos', x.id), aus: ro }, { text: 'Gliederungspunkt darin', fn: () => neu('glied', x.id), aus: ro || (x.lvl || 1) >= 4 },
        { text: offen ? 'Alle Langtexte darin zuklappen' : 'Alle Langtexte darin aufklappen', fn: () => { pos.forEach((y) => (offen ? OPEN.delete(y.id) : OPEN.add(y.id))); lvNeu(); }, aus: !pos.length },
        { titel: '' }, { text: 'Kopieren (mit Inhalt)', fn: () => { LVSEL = new Set(B.map((y) => y.id)); lvSelAktion('kopieren'); } },
        { text: 'Ausschneiden (mit Inhalt)', fn: () => { LVSEL = new Set(B.map((y) => y.id)); lvSelAktion('ausschneiden'); }, aus: ro },
        { text: 'Einfügen darunter', k: 'Strg+V', fn: () => lvSelAktion('einfuegen'), aus: ro },
        { titel: '' }, { text: B.length > 1 ? `Löschen (mit ${B.length - 1} Zeilen darin)` : 'Löschen', gefahr: true, fn: () => { LVSEL = new Set(B.map((y) => y.id)); lvSelAktion('loeschen'); }, aus: ro });
      return;
    }
    const pos = !istText(x) && x.typ === 'pos';
    P.push({ text: 'Eigenschaften …', k: 'Doppelklick', fn: () => eigDialog(x.id) },
      { text: OPEN.has(x.id) ? 'Langtext zuklappen' : 'Langtext aufklappen', fn: () => { if (OPEN.has(x.id)) OPEN.delete(x.id); else OPEN.add(x.id); lvNeu(); } },
      { titel: '' }, { text: 'Position darunter', fn: () => neu('pos', x.id), aus: ro }, { text: 'Gliederungspunkt darunter', fn: () => neu('titel', x.id), aus: ro },
      { text: 'Hinweistext darunter', fn: () => neu('txt', x.id), aus: ro },
      { titel: '' }, ...zwischen());
    if (pos) {
      P.push({ titel: '' }, ...arten([x]),
        { text: 'Bietertextergänzung einfügen …' + (gesperrt(x) ? ' (vergeben – Änderung als Nachtrag)' : ''), aus: ro || gesperrt(x), fn: () => {
          OPEN.add(x.id); lvNeu();
          setTimeout(() => { const ta = document.querySelector(`table.lv tr.lang[data-i="${items().indexOf(x)}"] textarea[data-f="lang"]`); if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; bteFeld(ta, null); } }, 80);
        } });
      if (vergeben()) P.push({ text: 'Nachtrag aus dieser Position …', fn: () => ntAbleiten(L.id, x.id), aus: ro },
        { text: 'In der Aufmaßprüfung zeigen', fn: () => zuTab('aufmass', `tr[data-ampos="${x.id}"]`) });
    }
    P.push({ titel: '' }, { text: 'Löschen', k: 'Entf', gefahr: true, fn: () => lvSelAktion('loeschen'), aus: ro });
  }

  /* ---------- Preisspiegel und Rechnungen (C1) ---------- */
  function psPunkte(P, tr, td) {
    const x = items().find((y) => y.id === tr.dataset.psp); if (!x) return;
    P.push({ text: 'Eigenschaften …', fn: () => eigDialog(x.id) },
      { text: 'Im Leistungsverzeichnis zeigen', fn: () => { const i = items().indexOf(x); OPEN.add(x.id); tab = 'lv'; LS.set('tab', tab); render(); setTimeout(() => { const r = lvTr(i); blink(r); }, 300); } });
    const a = td && td.dataset.psa && L.angebote.find((y) => y.id === +td.dataset.psa);
    if (a) P.push({ titel: '' }, { text: `Angaben zum Angebot ${a.bieter} …`, fn: () => angebotDaten(a.id) });
  }

  document.addEventListener('bph:kontext', (e) => {
    if (!L) return;
    const t = e.detail.ziel, P = e.detail.punkte; if (!t.closest) return;
    const ta = t.closest('textarea');
    if (ta) { textPunkte(P, ta); return; }
    if (tab === 'lv') { const tr = t.closest('table.lv tr[data-i]:not(.lang)'); if (tr) lvPunkte(P, tr); return; }
    if (tab === 'angebote') { const tr = t.closest('tr[data-psp]'); if (tr) psPunkte(P, tr, t.closest('td[data-psa]')); return; }
    if (tab === 'rechnungen') {
      const c = t.closest('.card[data-reid]'); if (!c || !vergeben()) return;
      P.push({ text: 'In der Aufmaßprüfung zeigen', fn: () => zuTab('aufmass', `tr[data-amr="r${c.dataset.reid}"]`) });
    }
  });
})();
