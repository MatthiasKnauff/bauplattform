// Versionsmenü (BPHead.versionsMenue, head.js): offen hängt das Menü an <body> – eine schmale Navigation (Containerabfrage, overflow) schneidet
// es nicht mehr ab und der Bereich daneben (eigene Ebene) verdeckt es nicht (Fehler vom 16.11.2026: Menü „Planstand …“ im Gebäudemodell
// rechts abgeschnitten); Klick auf einen Eintrag wirkt weiter.
// Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await versionsmenuePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/versionsmenue.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function versionsmenuePruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://vm.test/**', (r) => {
    const u = new URL(r.request().url()).pathname;
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'head.css', 'utf8')}</style>
      <body style="display:flex;margin:0"><nav id="nav" style="width:200px;position:relative;z-index:1;container-type:inline-size;border:1px solid #ccc"><div id="box"></div></nav>
      <main style="flex:1;height:600px;position:relative;z-index:2;background:#eee">Tabelle</main>
      <script src="/bp/bp.js"></script><script src="/bp/head.js"></script>` });
    if (u.startsWith('/bp/')) return r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(R + u.slice(4)) });
    return r.fulfill({ contentType: 'application/json', body: '{}' });
  });
  try {
    await p.goto('http://vm.test/seite');
    await p.waitForFunction(() => window.BPHead && BPHead.versionsMenue);
    await p.evaluate(() => { window.W = []; BPHead.versionsMenue({ in: document.getElementById('box'), wort: 'Planstand', fragen: false,
      liste: [{ id: 1, name: 'Planstand 16.11.2026 – tierheim.ifc mit langem Namen' }, { id: 2, name: 'Planstand 2' }], aktuell: 1, gueltig: 1,
      onWahl: (id) => W.push(id), onNeu: () => W.push('neu') }); });
    await p.click('#box [data-vm="dd"]');
    const m = await p.evaluate(() => { const x = document.querySelector('.bph-vm-m:not([hidden])'), r = x.getBoundingClientRect(), n = document.getElementById('nav').getBoundingClientRect();
      const e = document.elementFromPoint(r.right - 8, r.top + 12); return { body: x.parentNode === document.body, breiter: r.right > n.right + 20, sichtbar: !!e && x.contains(e) }; });
    pruef(m.body && m.breiter && m.sichtbar, `Menü ragt über die Navigation hinaus und ist ganz zu sehen: ${JSON.stringify(m)}`);
    await p.click('.bph-vm-m [data-vm="w"][data-id="2"]');
    pruef(await p.evaluate(() => W.join()) === '2', 'Klick auf einen Eintrag im Menü wirkt');
    await p.click('#box [data-vm="dd"]'); await p.click('.bph-vm-m [data-vm="neu"]');
    pruef(await p.evaluate(() => W.join()) === '2,neu', 'Befehl im Menü wirkt');
    // Gruppen (22.11.2026, Gebäudemodell: Versionen vom Versand eingeklappt)
    await p.evaluate(() => BPHead.versionsMenue({ in: document.getElementById('box'), gruppen: { versand: 'Beim Versand festgehalten' }, onWahl: (id) => W.push(id),
      liste: [{ id: 1, name: 'Arbeitsstand' }, { id: 3, name: 'LV Rohbau', gruppe: 'versand' }, { id: 4, name: 'Bauantrag', gruppe: 'versand' }], aktuell: 1 }));
    await p.click('#box [data-vm="dd"]');
    const g = await p.evaluate(() => { const d = document.querySelector('.bph-vm-m:not([hidden]) details.bph-vm-gr'); return d && { zu: !d.open, t: d.querySelector('summary').textContent, n: d.querySelectorAll('[data-vm="w"]').length, oben: document.querySelectorAll('.bph-vm-m:not([hidden]) > [data-vm="w"]').length }; });
    pruef(g && g.zu && /Versand festgehalten \(2\)/.test(g.t) && g.n === 2 && g.oben === 1, `Gruppe eingeklappt unter den übrigen: ${JSON.stringify(g)}`);
    await p.click('.bph-vm-m details.bph-vm-gr summary'); await p.click('.bph-vm-m [data-vm="w"][data-id="4"]');
    pruef(await p.evaluate(() => W.join()) === '2,neu,4', 'Eintrag in der Gruppe wählbar');
    await p.evaluate(() => BPHead.versionsMenue({ in: document.getElementById('box'), liste: [{ id: 1, name: 'A' }], aktuell: 1, onWahl: () => {} }));
    pruef(await p.evaluate(() => document.querySelectorAll('.bph-vm-m').length) === 1, 'neu gezeichnet: kein altes Menü bleibt an <body> hängen');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await versionsmenuePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
