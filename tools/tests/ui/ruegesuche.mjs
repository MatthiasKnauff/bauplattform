// Rüge aus dem Suchfeld (GO 18.11.2026): „mängelrüge wasserschaden assenmacher“ zeigt oben unter „Erledigen“ den Vorschlag
// (Firma, Sache, Projekt, VOB-Grundlage, passender Mangel bzw. Schriftverkehr); Enter legt den Vorschlag in die Sitzung und öffnet
// „Aufgaben & Mängel“ mit #maengel&rsuche=1. Ohne Befehlswort fragt die Suche den Server nicht. Server-Antworten nachgebildet.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await ruegesuchePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/ruegesuche.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function ruegesuchePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); }, anfragen = [];
  const V = [{ art: 'mangel', firma: 'Assenmacher GmbH', pid: 5, projekt: 'A497 Maybachstraße', grund: 'vob4', stichwort: 'wasserschaden', mangel_ids: [41], mangel: 'Wasserschaden Decke EG', offen: 2, hinweise: [] },
    { art: 'mangel', firma: 'Assenmacher GmbH', pid: 6, projekt: 'A534 Ostpreußenstraße', grund: 'vob13', stichwort: 'wasserschaden', mangel_ids: [], mangel: '', hinweise: [],
      quelle: { typ: 'post', id: 'm:1', datum: '2026-11-10', betreff: 'Wasserschaden Keller', eingang: true, anhaenge: [] }, frei: 'Wasserschaden Keller' }];
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://portal.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'portal.html'), 'utf8') });
    if (pf === 'maengel/') return r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Aufgaben</title>' });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/bp/ruege/suche') { anfragen.push(u.searchParams.get('q')); return J(V); }
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [{ key: 'aufgaben', name: 'Aufgaben & Mängel', allowed: true, url: 'http://portal.test/maengel', port: 80 }], projekte: [], proxied: ['portal.test'], domain: 'portal.test' });
    if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://portal.test/'); await p.waitForSelector('.bph-who', { timeout: 10000 });
    await p.evaluate(() => BPHead.suche('Wasserschaden')); await p.waitForSelector('.bph-su input'); await p.waitForTimeout(500);
    pruef(!anfragen.length, 'ohne Befehlswort darf die Suche keine Rüge anfragen');
    await p.fill('.bph-su input', 'mängelrüge wasserschaden assenmacher'); await p.waitForTimeout(700);
    const L = await p.evaluate(() => ({ g: [...document.querySelectorAll('.bph-su-g')].map((x) => x.textContent), t: [...document.querySelectorAll('.bph-su-t')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) }));
    pruef(L.g[0] === 'Erledigen', `Gruppe „Erledigen“ zuerst erwartet – ${L.g.join(' | ')}`);
    pruef(/Mängelrüge an Assenmacher GmbH – „wasserschaden“/.test(L.t[0]) && /passender Mangel: „Wasserschaden Decke EG“/.test(L.t[0]) && /§ 4 Abs\. 7/.test(L.t[0]), `erster Vorschlag: ${L.t[0]}`);
    pruef(/aus Mail vom 10\.11\./.test(L.t[1] || '') && /noch kein Mangel erfasst/.test(L.t[1] || '') && /§ 13 Abs\. 5/.test(L.t[1] || ''), `zweiter Vorschlag (Schriftverkehr): ${L.t[1]}`);
    await Promise.all([p.waitForURL(/maengel\/#maengel&rsuche=1/, { timeout: 5000 }), p.keyboard.press('Enter')]);
    const rs = await p.evaluate(() => JSON.parse(sessionStorage.getItem('bpRuegeSuche') || 'null'));
    pruef(rs && rs.pid === 5 && rs.mangel_ids[0] === 41, `Vorschlag liegt in der Sitzung: ${JSON.stringify(rs)}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await ruegesuchePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'Rüge aus dem Suchfeld: ok'); process.exit(f.length ? 1 : 0);
}
