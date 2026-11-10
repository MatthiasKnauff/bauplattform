// Tastatur im Baum (shared/bpcore/head/baum.js, bpBaum.tasten) – geprüft an einem kleinen Muster-Baum im echten Browser,
// unabhängig von Testdaten: Zeilenmodus (↑ ↓ ← → Enter, losschreiben), Feldmodus (Tab, Enter in derselben Spalte, Esc),
// leere Zwischenzeilen werden übersprungen, die App darf beim Speichern neu zeichnen, die Rollposition bleibt (bpBaum.rolle).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await baumTastenPruefen(page, inhaltVonBaumJs, inhaltVonBpCss)

const SEITE = `<!doctype html><html><head><meta charset="utf-8"><style>__CSS__</style></head><body>
<div id="view"><div id="roll" style="height:120px;overflow:auto"><table class="lv baum bp-baum"><thead><tr><th>Bezeichnung</th><th>Menge</th><th>EH</th></tr></thead><tbody></tbody></table></div></div>
<script>__JS__</script>
<script>
  // Muster: Titel 01 (offen) mit zwei Positionen, Titel 02 (zu) mit einer Position; jede Änderung zeichnet neu wie die AVA
  window.D = [{ t: 'ti', oz: '01', kurz: 'Erdarbeiten', zu: false }, { oz: '01.10', kurz: 'Kiefer fällen', menge: '1', eh: 'St' },
    { oz: '01.20', kurz: 'Birke fällen', menge: '2', eh: 'St' }, { t: 'ti', oz: '02', kurz: 'Pflanzen', zu: true }, { oz: '02.10', kurz: 'Hecke', menge: '8', eh: 'm' }];
  window.AKT = 1; window.NEU = 0;
  window.zeichne = () => { window.NEU++; let zu = false;
    document.querySelector('tbody').innerHTML = '<tr class="wurzel" data-pjwurzel><td class="baumz"><div class="bz" style="padding-left:0rem"><span class="car">▾</span><b>Projekt</b></div></td><td></td><td></td></tr>' + D.map((x, i) => {
      if (x.t === 'ti') { zu = x.zu; return '<tr class="ti' + (AKT === i ? ' akt' : '') + '" data-i="' + i + '"><td class="oz baumz"><div class="bz" style="padding-left:1.15rem"><span class="car" data-zu="' + i + '">' + (x.zu ? '▸' : '▾') + '</span><span class="ozt">' + x.oz + '</span><input data-f="kurz" value="' + x.kurz + '"></div></td><td></td><td></td></tr>'; }
      if (zu) return '';
      return '<tr class="' + (AKT === i ? 'akt' : '') + '" data-i="' + i + '"><td class="oz baumz"><div class="bz" style="padding-left:2.3rem"><span class="car"></span><span class="ozt">' + x.oz + '</span><input data-f="kurz" value="' + x.kurz + '"></div></td><td><input data-f="menge" value="' + x.menge + '"></td><td><input data-f="eh" value="' + x.eh + '"></td></tr>';
    }).join('') + '<tr><td colspan="3" style="height:200px">Platz zum Rollen</td></tr>'; };
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-zu]'); if (c) { const zurueck = bpBaum.rolle(document.getElementById('view')); D[+c.dataset.zu].zu = !D[+c.dataset.zu].zu; zeichne(); zurueck(); return; }
    const o = e.target.closest('.ozt'); if (o) { AKT = +o.closest('tr').dataset.i; document.querySelectorAll('tr.akt').forEach((r) => r.classList.remove('akt')); o.closest('tr').classList.add('akt'); }
  });
  document.addEventListener('change', (e) => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; D[+tr.dataset.i][e.target.dataset.f] = e.target.value; zeichne(); });   // speichern = neu zeichnen
  bpBaum.tasten({ wurzel: '#view table.lv.baum > tbody', zeilen: 'tr[data-i], tr.wurzel', aktiv: (w) => w.querySelector('tr.akt'),
    waehle: (z) => { const o = z.querySelector('.ozt'); if (o) o.click(); } });
  zeichne();
</script></body></html>`;

export async function baumTastenPruefen(p, baumJs, css) {
  const fehler = [];
  const pruef = (ok, text) => { if (!ok) fehler.push(text); };
  await p.setContent(SEITE.replace('__CSS__', () => css).replace('__JS__', () => baumJs));
  const st = () => p.evaluate(() => { const a = document.activeElement;
    return { akt: window.AKT, feld: a && a.dataset && a.dataset.f ? a.dataset.f + '@' + a.closest('tr').dataset.i : a ? a.tagName : '', wert: a && a.value, cur: (document.querySelector('.bp-kc') || {}).dataset ? Object.keys(document.querySelector('.bp-kc').dataset).map((k) => k + '=' + document.querySelector('.bp-kc').dataset[k]).join() : '' }; });
  const taste = async (k) => { await p.keyboard.press(k); await p.waitForTimeout(120); };

  await p.click('tr[data-i="1"] .ozt'); await p.waitForTimeout(60);
  let s = await st(); pruef(s.feld === 'TBODY', `Klick auf eine Zeile: der Baum hat den Fokus nicht (${s.feld})`);
  await taste('ArrowDown'); s = await st(); pruef(s.akt === 2, `↓: nächste Zeile erwartet (2), ist ${s.akt}`);
  await taste('ArrowDown'); s = await st(); pruef(s.akt === 3, `↓: der zugeklappte Titel 02 erwartet (3), ist ${s.akt}`);
  await taste('ArrowDown'); s = await st(); pruef(s.akt === 3, `↓ am Ende: bleibt auf der letzten sichtbaren Zeile (3), ist ${s.akt}`);
  await taste('ArrowRight'); s = await st(); pruef(await p.evaluate(() => !!document.querySelector('tr[data-i="4"]')), '→ auf zugeklapptem Titel klappt nicht auf');
  await taste('ArrowRight'); s = await st(); pruef(s.akt === 4, `→ auf offenem Titel: in die erste Zeile darin (4), ist ${s.akt}`);
  await taste('ArrowLeft'); s = await st(); pruef(s.akt === 3, `← auf einer Position: zum Titel darüber (3), ist ${s.akt}`);
  await taste('ArrowLeft'); pruef(await p.evaluate(() => !document.querySelector('tr[data-i="4"]')), '← auf offenem Titel klappt nicht zu');
  await taste('Home'); s = await st(); pruef(s.cur === 'pjwurzel=', `Pos1: oberste Zeile erwartet, ist ${s.cur}`);
  await taste('ArrowDown'); await taste('ArrowDown');
  s = await st(); pruef(s.akt === 1, `zweimal ↓ von oben: Position 01.10 erwartet (1), ist ${s.akt}`);
  // Feldmodus
  await taste('Enter'); s = await st(); pruef(s.feld === 'kurz@1', `Enter: ins erste Feld der Zeile (kurz@1), ist ${s.feld}`);
  await taste('Tab'); s = await st(); pruef(s.feld === 'menge@1', `Tab: nächstes Feld (menge@1), ist ${s.feld}`);
  await p.keyboard.type('5'); await taste('Enter'); s = await st();
  pruef(s.feld === 'menge@2', `Enter: dieselbe Spalte eine Zeile tiefer (menge@2), ist ${s.feld}`);
  pruef(await p.evaluate(() => window.D[1].menge === '5'), 'Enter speichert den Wert nicht');
  await taste('ArrowUp'); s = await st(); pruef(s.feld === 'menge@1', `↑ im Zahlenfeld: Zeile darüber (menge@1), ist ${s.feld}`);
  await taste('ArrowDown'); await taste('Tab'); await taste('Tab'); s = await st();
  pruef(s.feld === 'kurz@3', `Tab am Zeilenende: erstes Feld der nächsten Zeile (kurz@3), ist ${s.feld}`);
  await taste('Shift+Tab'); s = await st(); pruef(s.feld === 'eh@2', `Umschalt+Tab: voriges Feld (eh@2), ist ${s.feld}`);
  await p.keyboard.type('xyz'); await taste('Escape'); s = await st(); pruef(s.wert === 'St', `Esc: alter Wert zurück (St), ist ${s.wert}`);
  await taste('Escape'); s = await st(); pruef(s.feld === 'TBODY', `zweites Esc: zurück in den Zeilenmodus, ist ${s.feld}`);
  pruef(s.cur === 'i=2', `zweites Esc: Cursor auf der Zeile des Felds (i=2), ist ${s.cur}`);
  await taste('b'); s = await st(); pruef(s.feld === 'kurz@2' && s.wert === 'b', `Buchstabe im Zeilenmodus: ins erste Feld und losschreiben (kurz@2 = b), ist ${s.feld} = ${s.wert}`);
  await taste('Escape'); await taste('Escape');
  // Rollposition bleibt beim Auf- und Zuklappen
  const y = await p.evaluate(() => { const r = document.getElementById('roll'); r.scrollTop = 60; return r.scrollTop; });
  await p.click('tr[data-i="0"] [data-zu]'); await p.waitForTimeout(80);
  const y2 = await p.evaluate(() => document.getElementById('roll').scrollTop);
  pruef(y > 0 && Math.abs(y2 - y) <= 1, `Zuklappen: Rollposition springt (${y} → ${y2})`);
  return fehler;
}
