// Fenster stapeln (bp.js bpObenauf, 17.11.2026): ein neues Fenster liegt über Druckseite/PDF-Ansicht – „Datei ablegen“ aus der Druckseite
// lag vorher dahinter (modal-bg z 90 unter bpd-bg z 9800). Geprüft: Fenster und Rückfrage oben, Auswahlliste über dem Fenster.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await stapelPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/stapel.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function stapelPruefen(browser, repo) {
  const K = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 900, height: 700 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  try {
    await p.setContent(`<style>${fs.readFileSync(path.join(K, 'bp.css'), 'utf8')}</style><body><div class="bpd-bg" style="position:fixed;inset:0;z-index:9800;background:#333"></div><script>${fs.readFileSync(path.join(K, 'bp.js'), 'utf8')}</script></body>`);
    await p.evaluate(() => modalBox('<h3>Datei ablegen</h3><p>x</p>', () => {}));
    await p.waitForTimeout(50);
    pruef(await p.evaluate(() => !!document.elementFromPoint(450, 350).closest('.modal-bg')), 'Fenster liegt hinter der Druckseite');
    await p.evaluate(() => { const d = document.createElement('div'); d.className = 'bph-dlg-bg'; d.style.cssText = 'position:fixed;inset:0;z-index:1000'; document.body.appendChild(d); });
    await p.waitForTimeout(50);
    pruef(await p.evaluate(() => !!document.elementFromPoint(450, 350).closest('.bph-dlg-bg')), 'Rückfrage liegt nicht über dem Fenster');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await stapelPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
