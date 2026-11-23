// Bautagebuch – Details rechts (23.11.2026, Fehler im Bild: kein Rand links, Textfeld zu kurz, Symbole verstreut).
// Die Details benutzen dieselben Bausteine wie die Zeile im Bericht (Textfeld .ed, Foto .ph, Erinnerung .dueb). Geprüft mit bt.css + rahmen.css:
// Textfeld mit Abstand zum Rand, mindestens ~9 rem hoch, Foto- und Erinnerungsknopf links unter ihrer Beschriftung und beschriftet (nicht über die Breite verteilt).
// Aufgerufen aus oberflaeche.mjs:  const fehler = await btDetailsPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/btdetails.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function btDetailsPruefen(browser, repo) {
  const L = (f) => fs.readFileSync(path.join(repo, f), 'utf8');
  const css = [L('shared/bpcore/head/head.css'), L('bautagebuch/static/bt.css'), L('bautagebuch/static/rahmen.css')].join('\n');
  const svg = '<svg width="18" height="18" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
  const html = `<!doctype html><meta charset="utf-8"><style>${css}</style><body class="bt-rahmen"><div id="pane" style="width:600px;height:800px;border:1px solid #ccc">
    <div class="sr-pad"><div class="bt-det"><div class="bt-dk"><b>Notizen</b></div>
    <div class="bt-f"><label>Text</label><textarea class="ed" rows="8" data-k="text">Zeile 1\nZeile 2</textarea></div>
    <div class="bt-f"><label>Fotos</label><span class="ith"><button class="ph">${svg}<span>Foto hinzufügen</span></button></span></div>
    <div class="bt-f"><label>Erinnerung</label><button class="dueb">${svg}<span>Erinnerung setzen</span></button></div></div></div></div></body>`;
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } }), p = await ctx.newPage();
  try {
    await p.setContent(html);
    const m = await p.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect(), fs = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return { pane: r('#pane'), ta: r('textarea'), ph: r('.ph'), due: r('.dueb'), lab: r('.bt-f>label'), rem: fs };
    });
    pruef(m.ta.left - m.pane.left >= 8, `Textfeld klebt am Rand (${Math.round(m.ta.left - m.pane.left)} px Abstand)`);
    pruef(m.ta.height >= 8.5 * m.rem, `Textfeld zu kurz (${Math.round(m.ta.height)} px)`);
    pruef(Math.abs(m.ph.left - m.lab.left) < 4 && Math.abs(m.due.left - m.lab.left) < 4, `Knöpfe nicht links unter der Beschriftung (Foto ${Math.round(m.ph.left)}, Erinnerung ${Math.round(m.due.left)}, Beschriftung ${Math.round(m.lab.left)})`);
    pruef(m.due.width < m.pane.width / 2, `Erinnerungsknopf über die ganze Breite (${Math.round(m.due.width)} px)`);
  } finally { await ctx.close(); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await btDetailsPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'Bautagebuch Details: ok'); process.exit(f.length ? 1 : 0);
}
