// Rückgängig fest oben links (undo.js + befehle.js, beschlossen am 15.11.2026) – Ablauftest im echten Browser, ohne Server.
// Geprüft: mit Befehlsleiste ist „Rückgängig“ die erste Gruppe (Zurück · Wieder · ▾ n), grau solange nichts da ist; kein schwebendes Dock mehr;
// Zurück/Wieder arbeiten, der Verlauf klappt unter dem Knopf auf und nimmt bis zu einem Schritt zurück; ohne Befehlsleiste steht die schmale
// Zeile unter der Kopfleiste; Seiten mit eigenem Stapel (bpUndoEigen) werden von denselben Knöpfen bedient; Leisten in Dialogen bekommen die Gruppe nicht.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await rueckgaengigPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/rueckgaengig.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function rueckgaengigPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const SEITE = (mit) => `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/bp/head.css"><body>
    <div class="bph" style="height:48px">Kopfleiste <button class="bph-hlp">?</button></div><div id="bfl"></div><div class="modal"><div id="dlg"></div></div><p id="inhalt">Inhalt</p>
    <script src="/bp/undo.js"></script><script src="/bp/befehle.js"></script>
    <script>window.LOG = []; ${mit ? `befehle(document.getElementById('bfl'), [{ titel: 'Position', knoepfe: [{ t: 'Neu', fn: () => {} }] }]); befehle(document.getElementById('dlg'), [{ titel: 'Im Dialog', knoepfe: [{ t: 'X', fn: () => {} }] }]);` : ''}</script>`;
  async function lauf(name, mit, tun) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 800 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${name}: Fehler im Skript – ${e.message}`));
    await p.route('http://portal.test/**', (r) => { const pf = new URL(r.request().url()).pathname.replace(/^\//, '');
      if (pf === 'seite') return r.fulfill({ contentType: 'text/html', body: SEITE(mit) });
      const f = path.join(KASTEN, pf.slice(3)); return pf.startsWith('bp/') && fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
    try { await p.goto('http://portal.test/seite'); await tun(p); } catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n').slice(0, 3).join(' ')); }
    await ctx.close();
  }
  const stand = (p, wo) => p.evaluate((wo) => { const q = (u) => document.querySelector(`${wo} [data-u="${u}"]`); return { eins: q('eins') && !q('eins').disabled, redo: q('redo') && !q('redo').disabled, liste: q('liste') && !q('liste').disabled, n: q('liste') ? q('liste').textContent.replace(/\D/g, '') : '', dock: !!document.querySelector('.bp-undo:not(.bp-undo-oben)') }; }, wo);
  const schritt = (p, t) => p.evaluate((t) => { rueckgaengig(t, async () => { LOG.push('rück:' + t); }, 10000, async () => { LOG.push('wieder:' + t); }); }, t);

  await lauf('mit Befehlsleiste', true, async (p) => {
    const g = await p.evaluate(() => ({ erste: document.querySelector('#bfl .bf > .bf-g').className, titel: document.querySelector('#bfl .bf-undo .bf-gt').textContent, dlg: !!document.querySelector('#dlg .bf-undo') }));
    pruef(/bf-undo/.test(g.erste) && g.titel === 'Rückgängig', `„Rückgängig“ ist nicht die erste Gruppe der Befehlsleiste (${g.erste})`);
    pruef(!g.dlg, 'Befehlsleiste in einem Dialog hat die Gruppe „Rückgängig“ bekommen');
    let s = await stand(p, '#bfl'); pruef(!s.eins && !s.redo && !s.liste && s.n === '0', `ohne Schritte nicht grau (${JSON.stringify(s)})`);
    await schritt(p, 'A'); s = await stand(p, '#bfl');
    pruef(s.eins && !s.redo && s.n === '1' && !s.dock, `nach einem Schritt: ${JSON.stringify(s)} (Zurück an, Zahl 1, kein schwebendes Dock)`);
    await schritt(p, 'B'); await schritt(p, 'C');
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 1);
    s = await stand(p, '#bfl'); pruef((await p.evaluate(() => LOG.join(','))) === 'rück:C' && s.redo && s.n === '2', `Zurück nimmt nicht den jüngsten Schritt zurück (${await p.evaluate(() => LOG.join(','))}, ${JSON.stringify(s)})`);
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.length === 2);
    pruef((await p.evaluate(() => LOG[1])) === 'wieder:C' && (await stand(p, '#bfl')).n === '3', 'Wieder holt den Schritt nicht zurück');
    await p.click('#bfl [data-u="liste"]'); await p.waitForSelector('.bp-undo-oben [data-u="bis"]');
    const l = await p.evaluate(() => { const a = document.querySelector('#bfl [data-u="liste"]').getBoundingClientRect(), b = document.querySelector('.bp-undo-oben').getBoundingClientRect(); return { n: document.querySelectorAll('.bp-undo-oben [data-u="bis"]').length, unter: b.top >= a.bottom && Math.abs(b.left - a.left) < 40 }; });
    pruef(l.n === 3 && l.unter, `Verlauf: ${l.n} Schritte, unter dem Knopf: ${l.unter}`);
    await p.click('.bp-undo-oben [data-u="bis"][data-i="1"]'); await p.waitForFunction(() => LOG.length === 4);
    pruef((await p.evaluate(() => LOG.slice(2).join(','))) === 'rück:C,rück:B' && (await stand(p, '#bfl')).n === '1' && !(await p.$('.bp-undo-oben')), 'Verlauf nimmt nicht bis zum gewählten Schritt zurück');
    await schritt(p, 'D'); await p.click('#bfl [data-u="liste"]'); await p.waitForSelector('.bp-undo-oben'); await p.click('#inhalt');
    pruef(!(await p.$('.bp-undo-oben')), 'Verlauf klappt beim Klick daneben nicht zu');
    await p.waitForTimeout(1400); pruef(!(await p.$('.bp-undo-zeile')), 'schmale Zeile erscheint, obwohl es eine Befehlsleiste gibt');
    // Seite mit eigenem Stapel (wie Bauzeitenplan, Baukosten): dieselben Knöpfe, der jüngere Schritt zuerst
    await p.evaluate(() => { window.EIG = 2; window.bpUndoEigen = { n: () => EIG, los: () => { EIG--; LOG.push('eigen'); }, text: () => 'Plan', t: () => Date.now() + 1000 }; bpUndo.zeichnen(); });
    pruef((await stand(p, '#bfl')).n === '4', 'eigener Stapel der Seite zählt nicht mit');
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG[LOG.length - 1] === 'eigen');
    pruef((await stand(p, '#bfl')).n === '3', 'Zurück bedient den eigenen Stapel der Seite nicht');
    // Tastatur: Strg+Z zurück, Strg+Umschalt+Z und Strg+Y wieder – auch mit Fokus auf einem Häkchen; im Textfeld gehört Strg+Z dem Browser
    await p.evaluate(() => { LOG.length = 0; window.bpUndoEigen = null; document.body.insertAdjacentHTML('beforeend', '<input type="checkbox" id="hk"><input id="tx" value="abc">'); });
    await schritt(p, 'K'); await p.focus('#hk'); await p.keyboard.press('Control+z'); await p.waitForFunction(() => LOG.length === 1);
    await p.keyboard.press('Control+Shift+Z'); await p.waitForFunction(() => LOG.length === 2);
    await p.keyboard.press('Control+z'); await p.waitForFunction(() => LOG.length === 3);
    await p.keyboard.press('Control+y'); await p.waitForFunction(() => LOG.length === 4);
    pruef((await p.evaluate(() => LOG.join(','))) === 'rück:K,wieder:K,rück:K,wieder:K', `Tastatur: ${await p.evaluate(() => LOG.join(','))} (Strg+Z / Strg+Umschalt+Z / Strg+Y)`);
    await p.focus('#tx'); await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
    pruef((await p.evaluate(() => LOG.length)) === 4, 'Strg+Z im Textfeld nimmt eine Änderung der Seite zurück statt den Text im Feld');
  });
  await lauf('ohne Befehlsleiste', false, async (p) => {
    pruef(!(await p.$('.bp-undo-zeile')), 'Zeile steht schon, bevor die App fertig geladen ist');
    await p.waitForSelector('.bp-undo-zeile', { timeout: 4000 });
    const z = await p.evaluate(() => { const k = document.querySelector('.bph').getBoundingClientRect(), z = document.querySelector('.bp-undo-zeile').getBoundingClientRect(); return { unter: Math.abs(z.top - k.bottom) < 2, h: z.height, links: z.left < 12 }; });
    pruef(z.unter && z.links && z.h < 48, `Zeile nicht direkt unter der Kopfleiste oder zu hoch (${JSON.stringify(z)})`);
    let s = await stand(p, '.bp-undo-zeile'); pruef(!s.eins && !s.redo, 'Zeile ohne Schritte nicht grau');
    await schritt(p, 'Kennwert geändert'); s = await stand(p, '.bp-undo-zeile');
    pruef(s.eins && !s.dock && /zuletzt: Kennwert geändert/.test(await p.evaluate(() => document.querySelector('.bp-undo-zt').textContent)), 'Zeile zeigt den letzten Schritt nicht');
    const h0 = z.h; await p.click('.bp-undo-zeile [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 1);
    pruef(Math.abs((await p.evaluate(() => document.querySelector('.bp-undo-zeile').getBoundingClientRect().height)) - h0) < 1, 'Zeile ändert ihre Höhe (etwas springt)');
  });
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await rueckgaengigPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
