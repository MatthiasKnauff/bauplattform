// Dateiauswahl am iPhone/iPad (bp/bp.js): Filter mit Endungen, die iOS nicht kennt (.ifc, GAEB .x83 …), fallen beim Öffnen weg – sonst sind
// diese Dateien in der Auswahl grau. Bekannte Arten (PDF, Bilder) behalten ihren Filter; am Rechner bleibt alles, wie es ist.
// Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await dateiwahlPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/dateiwahl.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { ESC } from './esc.mjs';

export async function dateiwahlPruefen(browser, repo) {
  const js = fs.readFileSync(path.join(repo, 'shared/bpcore/head/bp.js'), 'utf8'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  for (const [ua, ios] of [['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1', true],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', false]]) {
    const ctx = await browser.newContext({ userAgent: ua }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
    await p.route('http://datei.test/**', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body>
      <input type=file id=ifc accept=".ifc"><label id=lb><input type=file id=gaeb accept=".x83,.x84,.pdf"> GAEB</label><input type=file id=pdf accept="application/pdf,.pdf,image/*,.heic">
      <script>${js}</script>` }));
    try {
      await p.goto('http://datei.test/');
      const A = await p.evaluate(() => { const x = document.createElement('input'); x.type = 'file'; x.accept = '.gantt,.json'; x.click();   // nicht im Dokument (wie in library.js)
        document.getElementById('ifc').click(); document.getElementById('lb').click(); document.getElementById('pdf').click();
        return { neu: x.accept, ifc: document.getElementById('ifc').accept, gaeb: document.getElementById('gaeb').accept, pdf: document.getElementById('pdf').accept }; });
      if (ios) pruef(A.neu === '' && A.ifc === '' && A.gaeb === '' && A.pdf === 'application/pdf,.pdf,image/*,.heic', `iPhone: unbekannte Endungen ohne Filter, PDF/Bilder mit – ${JSON.stringify(A)}`);
      else pruef(A.neu === '.gantt,.json' && A.ifc === '.ifc' && A.gaeb === '.x83,.x84,.pdf', `Rechner: Filter bleiben – ${JSON.stringify(A)}`);
    } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  // Dateien aus dem Projekt wählen (bp/dateiwahl.js): ohne Ablage (Testserver) keine Sackgasse – Knopf „Vom Gerät wählen …“ (20.11.2026)
  {
    const dw = fs.readFileSync(path.join(repo, 'shared/bpcore/head/dateiwahl.js'), 'utf8'), ctx = await browser.newContext(), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push('Dateiwahl: Fehler im Skript – ' + e.message));
    await p.route('http://datei.test/**', (r) => (r.request().url().includes('/api/')
      ? r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Die Ablage auf dem Server ist nicht eingerichtet (Verwaltung → Einstellungen → Ablage).' }) })
      : r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body>${ESC}<script>${dw}</script>` })));
    try {
      await p.goto('http://datei.test/');
      await p.evaluate(() => { window.G = 0; window.E = 'offen'; window.bpDateiWahl({ project_id: 7, start: 'server', geraet: () => { window.G++; } }).then((v) => { window.E = v; }); });
      await p.waitForSelector('[data-dwg]');
      pruef((await p.textContent('.bpdw-l')).includes('nicht eingerichtet'), 'Dateiwahl: Meldung der Ablage fehlt');
      await p.click('[data-dwg]');
      const A = await p.evaluate(() => ({ g: window.G, e: window.E, da: !!document.querySelector('.bpdw') }));
      pruef(A.g === 1 && A.e === null && !A.da, `Dateiwahl: „Vom Gerät wählen …“ schließt und ruft geraet() – ${JSON.stringify(A)}`);
      await p.evaluate(() => { window.bpDateiWahl({ project_id: 7, start: 'server' }); });
      await p.waitForFunction(() => /nicht eingerichtet/.test((document.querySelector('.bpdw-l') || {}).textContent || ''));
      pruef(!(await p.$('[data-dwg]')), 'Dateiwahl: ohne geraet kein Knopf');
    } catch (e) { fehler.push('Dateiwahl bricht ab – ' + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await dateiwahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
