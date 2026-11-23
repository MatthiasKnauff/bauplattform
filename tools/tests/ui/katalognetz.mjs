// Leistungskatalog: Büro-Ebene, Abhängigkeiten, Lernen (Mock „Leistungskatalog: Abhängigkeiten“, GO 22.11.2026) – gantt/public/katalogbuero.js,
// katalognetz.js, library.js. Werk-Leistung direkt ändern (gelb, ↺), Ansicht mit der Leistung in der Mitte, Kreis abgelehnt, Probe, Lern-Vorschlag übernehmen.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await katalogNetzPruefen(browser, repoWurzel)
import fs from 'node:fs'; import path from 'node:path';

export async function katalogNetzPruefen(browser, repo) {
  const PUB = path.join(repo, 'gantt/public'), KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const J = (o) => ({ contentType: 'application/json', body: JSON.stringify(o) });
  const ART = (f) => (f.endsWith('.css') ? 'text/css' : f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream');
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => { if (!/NaN/.test(e.message)) fehler.push(`Fehler im Skript – ${e.message}`); });
  const PUT = [];
  await p.route('http://portal.test/**', (r) => { const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/gantt\//, '').replace(/^\//, '');
    if (pf === '' || pf === 'gantt') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(PUB, 'index.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : path.join(PUB, pf);
    if (!pf.startsWith('api/') && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ contentType: ART(f), body: fs.readFileSync(f) });
    if (!pf.startsWith('api/')) return r.fulfill({ status: 404, body: '' });
    if (r.request().method() === 'PUT') { const b = JSON.parse(r.request().postData() || 'null'); PUT.push([pf, b]); return r.fulfill(J(pf === 'api/catlernen/nein' ? { nein: [b.schluessel] } : b)); }
    if (pf === 'api/me') return r.fulfill(J({ ok: true, id: 1, name: 'admin', role: 'admin', admin: true, is_admin: true, look: {}, katalog: true }));
    if (pf === 'api/platform') return r.fulfill(J({ apps: [], user: { name: 'admin', role: 'admin' }, projekte: [] }));
    if (pf === 'api/projects') return r.fulfill(J([{ id: 1, name: 'Testplan', updated: '2026-11-15' }]));
    if (/^api\/projects\/(1|undefined)$/.test(pf)) return r.fulfill(J({ id: 1, name: 'Testplan', rev: 1, start: 20773, nextUid: 3, tasks: [{ uid: 1, name: 'A', dur: 2, lvl: 0, preds: [] }, { uid: 2, name: 'B', dur: 3, lvl: 0, preds: [] }] }));
    if (pf === 'api/catlernen') return r.fulfill(J({ dauer: { estrich: [{ p: 'A100', f: 1.5 }, { p: 'A200', f: 1.5 }] }, links: {}, eigene: { 'baustrom-abbau': { n: 'Baustrom-Abbau', gw: 'Elektro', d: 1, p: ['A100', 'A200'] } }, nein: [] }));
    return r.fulfill({ contentType: 'application/json', body: /firms|presets|liste|versions|neuigkeit|kontakte|library/.test(pf) ? '[]' : '{}' }); });
  const warte = (ms) => p.waitForTimeout(ms);
  const letzt = (k) => { const x = PUT.filter((y) => y[0] === k).pop(); return x && x[1]; };
  try {
    await p.goto('http://portal.test/gantt/'); await warte(2000);
    await p.evaluate(() => { LS.set('libModus', 'liste'); LIBMODUS = 'liste'; showTab('katalog'); libEk = 0; libZu = new Set(); renderLib(); }); await warte(500);
    // A: Richtdauer einer Werk-Leistung direkt ändern → Abweichung des Büros (gelb, ↺)
    await p.fill('#libView input[data-kbd="estrich"]', '3'); await p.press('#libView input[data-kbd="estrich"]', 'Tab'); await warte(500);
    pruef((letzt('api/catbuero') || {}).estrich && letzt('api/catbuero').estrich.d === 3, `Richtdauer als Büro-Abweichung gespeichert: ${JSON.stringify(letzt('api/catbuero'))}`);
    pruef(await p.evaluate(() => document.querySelector('#libView input[data-kbd="estrich"]').classList.contains('lv-fown') && !!document.querySelector('#libView [data-kbz="estrich:d"]') && CATALOG.items.find((i) => i.id === 'estrich').d === 3), 'gelb mit ↺, gilt im Katalog');
    await p.click('#libView [data-kbz="estrich:d"]'); await warte(500);
    pruef(!(letzt('api/catbuero') || {}).estrich && await p.evaluate(() => CATALOG.items.find((i) => i.id === 'estrich').d === 2), '↺ zurück auf Werk');
    // B: Abhängigkeiten – Estrich in der Mitte, Vorgänger links, Nachfolger rechts
    await p.click('#libView tr.lv-std [data-lnetz="estrich"]'); await p.waitForSelector('.kn-mk');
    const b = await p.evaluate(() => ({ m: document.querySelector('.kn-mk b').textContent, vor: [...document.querySelectorAll('[data-kndrop="vor"] .kn-k b')].map((x) => x.textContent), nach: document.querySelectorAll('[data-kndrop="nach"] .kn-k').length, nachN: [...document.querySelectorAll('[data-kndrop="nach"] .kn-k b')].map((x) => x.textContent), probe: document.querySelector('.kn-probe').textContent }));
    pruef(/Estrich/.test(b.m) && b.vor.some((x) => /Innenputz/.test(x)) && b.nach > 0 && !b.nachN.some((x) => /Estrich einbringen/.test(x)) && /\d+ AT/.test(b.probe), `Ansicht Abhängigkeiten: ${JSON.stringify(b)}`);
    {   // 23.11.2026: linke Spalte in der Breite ziehen – gemerkt auch nach dem Neuzeichnen
      const g = await p.evaluate(() => { const r = document.querySelector('.kn .bp-nav-griff').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 40, w0: document.querySelector('.kn-l').offsetWidth }; });
      await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 80, g.y, { steps: 4 }); await p.mouse.up(); await warte(200);
      await p.click('.kn-k[data-knk="putz"]'); await warte(300);
      const w = await p.evaluate(() => ({ w: document.querySelector('.kn-l').offsetWidth, griffe: document.querySelectorAll('.kn .bp-nav-griff').length }));
      pruef(w.w >= g.w0 + 60 && w.griffe === 1, `linke Spalte ziehen: ${JSON.stringify({ g, w })}`);
      await p.evaluate(() => { KN.id = 'estrich'; renderLib(); }); await warte(300);
    }
    await p.evaluate(() => knVerbinde('el_roh', 'estrich')); await warte(500);
    pruef(((letzt('api/catbuero') || {}).estrich || {}).a && letzt('api/catbuero').estrich.a.includes('el_roh'), `neuer Vorgänger als Abweichung: ${JSON.stringify(letzt('api/catbuero'))}`);
    const n0 = PUT.length; await p.evaluate(() => knVerbinde('estrich', 'putz')); await warte(400);
    pruef(PUT.length === n0, 'Kreis (Estrich vor Innenputz) wird abgelehnt');
    await p.evaluate(() => KN.id = 'estrich'); await p.click('.kn-k[data-knk="putz"]'); await warte(300);
    pruef(await p.evaluate(() => /Innenputz/.test(document.querySelector('.kn-mk b').textContent)), 'Klick auf eine Kiste: sie steht in der Mitte');
    // C: Lernen – Vorschlag übernehmen
    pruef(await p.evaluate(() => /2 Vorschläge/.test(document.querySelector('.lv-lern summary').textContent)), 'Lern-Vorschläge stehen da');
    await p.evaluate(() => { document.querySelector('.lv-lern').open = true; }); await p.click('.lv-lern [data-lern="ja:0"]'); await warte(500);
    pruef(((letzt('api/catbuero') || {}).estrich || {}).d === 3, `gelernte Richtdauer übernommen (2 × 1,5): ${JSON.stringify(letzt('api/catbuero'))}`);
    {   // „↺ Zurücksetzen …“ (GO 22.11.2026): Vorschau mit Häkchen, eigene Leistungen nur angekreuzt, ein Rückgängig für alles
      await p.evaluate(() => katZuruecksetzen()); await p.waitForSelector('.zr .zr-z');
      const z = await p.evaluate(() => [...document.querySelectorAll('.zr .zr-z')].map((l) => [l.textContent.trim(), l.querySelector('input').checked]));
      pruef(z.some(([t, an]) => /Estrich/.test(t) && /Richtdauer/.test(t) && an), `Zurücksetzen zeigt die Abweichung angehakt: ${JSON.stringify(z)}`);
      await p.click('.modal [data-m="ok"]'); await warte(500);
      pruef(!(letzt('api/catbuero') || {}).estrich && await p.evaluate(() => CATALOG.items.find((i) => i.id === 'estrich').d === 2), `zurückgesetzt auf Werk: ${JSON.stringify(letzt('api/catbuero'))}`);
      await p.evaluate(async () => { const u = UNDO.s.pop(); if (/zurückgesetzt/.test(u.text)) await bpUndo.lauf(u); }); await warte(600);
      pruef(((letzt('api/catbuero') || {}).estrich || {}).d === 3, `Rückgängig holt die Abweichungen zurück: ${JSON.stringify(letzt('api/catbuero'))}`);
      await p.evaluate(() => { KatBuero.ersetzen({}, true); }); await warte(400);
      await p.evaluate(() => katZuruecksetzen()); await warte(200);
      pruef(!(await p.$('.zr')), 'ohne Abweichung kein Fenster, nur ein Hinweis');
    }
    // K7: später fertig – Verlängerung am Balken (seit ÜF-3 V1 orange), Grund wählen
    await p.evaluate(() => { showTab('plan'); P.tasks[1].ueber = { at: 3, grund: 'wetter' }; P.tasks[1].pct = 100; render(); }); await warte(300);
    pruef(await p.evaluate(() => !!document.querySelector('.bar rect.ue')), 'überzogen: Verlängerung am Balken');
    await p.evaluate(() => zsPop(0)); await p.waitForSelector('.zs-pop [data-zs="ue"]'); await p.fill('.zs-pop [data-zs="ue"]', '2'); await p.press('.zs-pop [data-zs="ue"]', 'Enter'); await warte(200); await p.keyboard.press('Escape');
    pruef(await p.evaluate(() => P.tasks[0].ueber.at === 2 && P.tasks[0].ueber.grund === 'leistung'), 'Feld am Balken: fertig 2 AT später, Grund „liegt an der Leistung“ zählt fürs Lernen');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 2).join(' / ')); }
  await ctx.close();
  return fehler;
}
