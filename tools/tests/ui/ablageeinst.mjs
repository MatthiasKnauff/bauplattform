// Ablage-Einstellungen je App (bp/ablageeinst.js, 17.11.2026): Felder vom Kern, Auswahl als Knöpfe (keine native Liste),
// beim Ändern eines Ordnernamens die Frage „mit umbenennen?“ – „Nur künftig“ speichert ohne Auftrag, „Abbrechen“ speichert nichts.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ablageEinstPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ablageeinst.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function ablageEinstPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const D = { titel: 'Ablage', text: 'Wiki-Dateien', aendern: true, ablage: true, auftraege: [], felder: [
    { key: 'ordner_wiki', label: 'Ordner der Wiki-Dateien', art: 'text', vorgabe: '02 Wiki', opt: null, ordner: true, wert: '02 Wiki' },
    { key: 'modus', label: 'Modus', art: 'auswahl', vorgabe: 'a', opt: [['a', 'A'], ['b', 'B']], ordner: false, wert: 'a' }] };
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"></head><body><div id="h"></div>
    <script>window.PUTS = []; window.FR = []; window.bpFrage = async (t, o) => { FR.push(t); return window.ANTWORT; }; window.toast = () => {};</script>
    <script src="bp/ablageeinst.js"></script></body></html>`;
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://ae.test/**', async (r) => { const pf = new URL(r.request().url()).pathname;
    if (pf === '/') return r.fulfill({ contentType: 'text/html', body: html });
    if (pf.startsWith('/api/bp/ablage-einst/')) {
      if (r.request().method() === 'PUT') { const b = JSON.parse(r.request().postData()); await p.evaluate((x) => window.PUTS.push(x), b);
        D.felder.forEach((f) => { if (b.werte[f.key] != null) f.wert = b.werte[f.key]; }); }
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(D) }); }
    return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(KASTEN, pf.replace('/bp/', ''))) }); });
  try {
    await p.goto('http://ae.test/'); await p.waitForFunction(() => window.bpAblageEinst);
    await p.evaluate(() => bpAblageEinst(document.getElementById('h'), 'wiki')); await p.waitForSelector('[data-k="ordner_wiki"]');
    pruef(!(await p.$('select')), 'keine native Auswahlliste');
    await p.click('.bpae-seg [data-w="b"]');
    await p.evaluate(() => { window.ANTWORT = false; }); await p.fill('[data-k="ordner_wiki"]', '02 Wissen'); await p.click('[data-bpae="s"]');
    await p.waitForTimeout(200);
    pruef((await p.evaluate(() => window.FR.length)) === 1, 'Frage beim neuen Ordnernamen');
    pruef((await p.evaluate(() => window.PUTS.length)) === 0, '„Abbrechen“ speichert nichts');
    await p.evaluate(() => { window.ANTWORT = 'drei'; }); await p.click('[data-bpae="s"]');
    await p.waitForFunction(() => window.PUTS.length === 1);
    const b = await p.evaluate(() => window.PUTS[0]);
    pruef(b.umbenennen === false && b.werte.ordner_wiki === '02 Wissen' && b.werte.modus === 'b', `„Nur künftig“: ${JSON.stringify(b)}`);
    await p.waitForSelector('.bpae-f small'); pruef(/02 Wiki/.test(await p.textContent('.bpae-f small')), 'Vorgabe wird genannt, wenn abweichend');
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ablageEinstPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
