// Gemeinsam markieren für Externe (/gast/<Schlüssel>, skizze_routen.GAST_HTML): die Seite hat <base href="/"> – pdf.js muss über
// document.baseURI geladen werden, nicht über location.href (sonst /gast/static/… → „PDF-Anzeige nicht verfügbar“, Fehler vom 17.11.2026).
// allein: node tools/tests/ui/gastpdf.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function gastPdfPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [];
  const ctx = await browser.newContext(), p = await ctx.newPage(), geholt = [];
  p.on('pageerror', (e) => fehler.push('Skriptfehler – ' + e.message));
  await p.route('http://g.test/**', (r) => { const pf = new URL(r.request().url()).pathname; geholt.push(pf);
    if (pf === '/gast/abc') return r.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><base href="/"></head><body><script src="bp/head.js"></script></body></html>' });
    if (pf.startsWith('/bp/') && fs.existsSync(path.join(KASTEN, pf.slice(4)))) return r.fulfill({ contentType: pf.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(path.join(KASTEN, pf.slice(4))) });
    if (pf.startsWith('/bp/pdfjs/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(repo, 'shared/bpcore/vendor/pdfjs', pf.slice(10))) });
    return r.fulfill({ status: 404, body: '' }); });
  try {
    await p.goto('http://g.test/gast/abc'); await p.waitForFunction(() => window.BPHead && BPHead.pdfLib, null, { timeout: 8000 });
    const ok = await p.evaluate(() => BPHead.pdfLib().then((m) => !!(m && m.getDocument), (e) => String(e.message)));
    if (ok !== true) fehler.push(`pdf.js lädt auf der Gast-Seite nicht: ${ok} – geholt: ${geholt.filter((x) => /pdf/.test(x)).join(', ')}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await gastPdfPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
