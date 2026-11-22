// PDF-Ansicht (BPHead.ansehen, head.js – neu am 17.11.2026): Knöpfe mit Beschriftung oben (Senden · Ablegen · Drucken · Speichern ·
// Markieren · Gemeinsam · Unterschreiben), Hauptknopf je App (x.haupt, sonst Senden bei Mail-Vorgaben), „Bauherr:in“ nicht mehr im Viewer,
// Seitenübersicht ab 3 Seiten am Rechner, am Handy die Leiste unten; „Ablegen“ fragt, wenn das Dokument schon abgelegt ist (x.abgelegt).
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await pdfAnsichtPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/pdfansicht.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

function pdf(n) {   // kleines PDF mit n Seiten
  const o = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${Array.from({ length: n }, (_, k) => `${3 + k} 0 R`).join(' ')}] /Count ${n} >>`];
  for (let k = 0; k < n; k++) o.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>');
  let s = '%PDF-1.4\n'; const off = [];
  o.forEach((x, k) => { off.push(s.length); s += `${k + 1} 0 obj\n${x}\nendobj\n`; });
  const x = s.length; s += `xref\n0 ${o.length + 1}\n0000000000 65535 f \n${off.map((v) => String(v).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${o.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}

export async function pdfAnsichtPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="bp/bp.css"><link rel="stylesheet" href="bp/head.css"></head><body><script src="bp/baukasten.js"></script><script src="bp/head.js"></script></body></html>';
  async function seite(breite, hoehe) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${breite}px: JavaScript-Fehler: ` + String(e.message || e).split('\n')[0]));
    await p.route('http://pa.test/**', (r) => { const pf = new URL(r.request().url()).pathname.replace(/^\//, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: html });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      if (/^d\d\.pdf$/.test(pf)) return r.fulfill({ contentType: 'application/pdf', body: pdf(+pf[1]) });
      const f = pf.startsWith('bp/pdfjs/') ? path.join(repo, 'shared/bpcore/vendor/pdfjs', pf.slice(9)) : pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      return r.fulfill({ contentType: 'application/json', body: pf === 'api/me' ? '{"ok":true,"id":1,"name":"admin"}' : '{}' }); });
    await p.goto('http://pa.test/'); await p.waitForFunction(() => window.BPHead && BPHead.ansehen, null, { timeout: 20000 });
    await p.evaluate(() => { BPHead.ablage = { ablegen: async () => { window.ABGELEGT = 1; } }; window.bpFrage = async (t) => { window.FRAGE = t; return false; }; });
    return { p, ctx };
  }
  const sicht = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].filter((b) => b.offsetParent).map((b) => b.textContent.trim()), sel);
  try {
    const { p, ctx } = await seite(1300, 900);
    await p.evaluate(() => BPHead.ansehen([{ url: 'd4.pdf', typ: 'pdf', name: 'Tagesbericht Nr. 4', mail: { pid: 1 }, abgelegt: 'Bautagebuch-Ordner' }]));
    await p.waitForSelector('.bph-gvth [data-gvs="4"]', { timeout: 15000 });
    const k = await sicht(p, '.bph-gva .bph-gvbt');
    pruef(['Senden', 'Ablegen', 'Drucken', 'Speichern', 'Markieren', 'Gemeinsam'].every((w) => k.join('|').includes(w)), `Knöpfe mit Beschriftung oben: ${k.join(' | ')}`);
    pruef((await p.textContent('.bph-gvh')).includes('Senden'), 'Hauptknopf „Senden“ bei Mail-Vorgaben');
    pruef((await p.textContent('.bph-gvn')).includes('4 Seiten'), 'Seitenzahl im Kopf');
    pruef(!(await sicht(p, '.bph-gvb [data-gv="me"]')).length, 'Rechner: „Gemeinsam“ steht oben, das leere ⋯ ist weg (17.11.2026)');
    await p.click('.bph-gva [data-gv="ab"]'); await p.waitForTimeout(200);
    pruef(/Liegt schon in Bautagebuch-Ordner/.test(await p.evaluate(() => window.FRAGE || '')) && !(await p.evaluate(() => window.ABGELEGT)), '„Ablegen“ fragt, wenn schon abgelegt');
    await p.click('[data-gvs="3"]');   // sanftes Rollen dauert auf langsamen Rechnern länger – warten, bis es angekommen ist (statt fester 600 ms)
    pruef(await p.waitForFunction(() => { const S = document.querySelector('[data-gvs="3"]'); return S && S.classList.contains('on'); }, null, { timeout: 4000 }).then(() => true, () => false), 'Seitenübersicht springt zur Seite 3');
    await p.keyboard.press('Escape');
    await p.evaluate(() => BPHead.ansehen([{ url: 'd2.pdf', typ: 'pdf', name: 'Plan', haupt: 'ab' }]));
    await p.waitForSelector('.bph-pg[data-seite="2"]', { timeout: 15000 });
    pruef((await p.textContent('.bph-gvh')).includes('Ablegen'), 'Hauptknopf je App (haupt: ab)');
    pruef(await p.evaluate(() => document.querySelector('.bph-gvth').hidden), 'keine Seitenübersicht unter 3 Seiten');
    await ctx.close();
    const H = await seite(390, 800);
    await H.p.evaluate(() => BPHead.ansehen([{ url: 'd2.pdf', typ: 'pdf', name: 'Plan', mail: { pid: 1 } }]));
    await H.p.waitForSelector('.bph-pg[data-seite="2"]', { timeout: 15000 });
    const u = await sicht(H.p, '.bph-gvmk button');
    pruef(u.join('|').includes('Senden') && u.join('|').includes('Markieren') && u.join('|').includes('Mehr'), `Handy: Leiste unten ${u.join(' | ')}`);
    pruef(!(await sicht(H.p, '.bph-gva .bph-gvbt')).length, 'Handy: oben keine Knöpfe');
    await H.p.click('.bph-gvmk [data-gv="me"]'); const m = await H.p.textContent('.bph-gvm');
    pruef(!/Bauherr/.test(m) && /Gemeinsam markieren/.test(m), `Handy: ⋯ bietet gemeinsames Markieren an, ohne Bauherr:in: ${m}`);
    await H.ctx.close();
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await pdfAnsichtPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
