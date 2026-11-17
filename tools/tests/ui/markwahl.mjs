// PDF-Ansicht – Markierungen auswählen und löschen, Radiergummi, Unterschrift als Ebene (markwahl.js, GO 17.11.2026).
// Geprüft: ✋ Klick auf einen Strich → Rahmen mit ✕, Entf löscht (POST …/loeschen mit der Kennung, Rückgängig legt ihn neu an);
// 🧽 über einen Strich wischen löscht ihn; eine fremde Unterschrift lässt sich auswählen, aber nicht löschen (kein ✕) und nicht wegradieren;
// die eigene Unterschrift hat ✕ und lässt sich ziehen (neu angelegt, alte gelöscht). Nachgebildeter Kern, kein Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await markWahlPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/markwahl.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

function pdf(n) {   // kleines PDF mit n Seiten
  const o = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${Array.from({ length: n }, (_, k) => `${3 + k} 0 R`).join(' ')}] /Count ${n} >>`];
  for (let k = 0; k < n; k++) o.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>');
  let s = '%PDF-1.4\n'; const off = [];
  o.forEach((x, k) => { off.push(s.length); s += `${k + 1} 0 obj\n${x}\nendobj\n`; });
  const x = s.length; s += `xref\n0 ${o.length + 1}\n0000000000 65535 f \n${off.map((v) => String(v).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${o.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

export async function markWahlPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><link rel="stylesheet" href="bp/bp.css"><link rel="stylesheet" href="bp/head.css"></head><body><script src="bp/baukasten.js"></script><script src="bp/head.js"></script></body></html>';
  const K = { n: 0, seq: 0, striche: [], weg: [], loesch: [], neu: [] };   // nachgebildete Skizze im Kern
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://mw.test/**', async (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: html });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf === 'd2.pdf') return r.fulfill({ contentType: 'application/pdf', body: pdf(2) });
    if (pf.startsWith('static/')) { const f = path.join(repo, 'plattform', pf); return fs.existsSync(f) ? r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin' });
    if (pf === 'api/bp/skizze') return J({ id: 's1' });
    if (pf === 'api/bp/skizze/s1/strich') { const d = r.request().postDataJSON(), id = ++K.n; K.striche.push({ ...d, id, uid: 1, name: 'admin' }); delete K.striche[K.striche.length - 1].tmp; K.neu.push(d); K.seq++; return J({ id, seq: K.seq }); }
    if (pf === 'api/bp/skizze/s1/loeschen') { const w = r.request().postDataJSON().was, d = K.striche.find((x) => x.id === +w);
      const ok = d && (d.uid === 1); K.loesch.push(+w); if (ok) { K.striche = K.striche.filter((x) => x !== d); K.weg.push(d.id); K.seq++; } return J({ n: ok ? 1 : 0 }); }
    if (pf === 'api/bp/skizze/s1') return J({ seq: K.seq, striche: K.striche, geloescht: K.weg, leute: [], owner: 1, farbe: '#e5484d', dauerhaft: false });
    return J({});
  });
  const seite1 = () => p.evaluate(() => { const r = document.querySelector('.bph-pg[data-seite="1"]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const zieh = async (a, b) => { const R = await seite1(); await p.mouse.move(R.x + a[0] * R.w, R.y + a[1] * R.h); await p.mouse.down(); for (let k = 1; k <= 8; k++) await p.mouse.move(R.x + (a[0] + (b[0] - a[0]) * k / 8) * R.w, R.y + (a[1] + (b[1] - a[1]) * k / 8) * R.h); await p.mouse.up(); };
  const klick = async (a) => { const R = await seite1(); await p.mouse.click(R.x + a[0] * R.w, R.y + a[1] * R.h); };
  const warte = async (f, t = 4000) => { for (let i = 0; i < t / 50 && !f(); i++) await p.waitForTimeout(50); return f(); };
  try {
    await p.goto('http://mw.test/'); await p.waitForFunction(() => window.BPHead && BPHead.ansehen, null, { timeout: 20000 });
    await p.waitForFunction(() => typeof window.rueckgaengig === 'function', null, { timeout: 10000 }).catch(() => {});
    await p.evaluate(() => { BPHead.me = { id: 1, name: 'admin' }; window.UNDO = []; window.rueckgaengig = (t, f) => window.UNDO.push([t, f]); });
    await p.evaluate(() => BPHead.ansehen([{ url: 'd2.pdf', typ: 'pdf', name: 'Plan.pdf' }]));
    await p.waitForSelector('.bph-pg[data-seite="1"]', { timeout: 15000 }); await p.waitForFunction(() => window.bpMarkWahl, null, { timeout: 5000 });
    await p.click('.bph-skb'); await p.waitForSelector('.bph-skl [data-skw="radier"]', { timeout: 5000 });
    pruef(await p.$('.bph-skl [data-skw="unterschrift"]'), 'kein ✍ in der Werkzeugleiste');
    await zieh([0.2, 0.2], [0.5, 0.2]);
    pruef(await warte(() => K.striche.length === 1), 'Strich nicht beim Kern angekommen');
    await p.waitForTimeout(800);   // Abgleich: Kennung da
    await p.click('[data-skw="zeigen"]'); await klick([0.35, 0.2]);
    pruef(await p.$('.bpm-x'), '✋ Klick auf den Strich zeigt kein ✕');
    await p.keyboard.press('Delete');
    pruef(await warte(() => K.loesch.length === 1 && !K.striche.length), `Entf löscht nicht: ${JSON.stringify(K.loesch)}`);
    await p.waitForTimeout(800);
    pruef(await p.evaluate(() => window.UNDO.length === 1 && /gelöscht/.test(window.UNDO[0][0])), 'kein Rückgängig fürs Löschen');
    await p.evaluate(() => window.UNDO[0][1]());
    pruef(await warte(() => K.striche.length === 1), 'Rückgängig legt den Strich nicht neu an');
    await p.waitForTimeout(800);
    await p.click('[data-skw="radier"]'); await zieh([0.35, 0.1], [0.35, 0.3]);
    pruef(await warte(() => !K.striche.length), 'Radiergummi löscht den Strich nicht');
    // fremde Unterschrift (uid 2): auswählbar, kein ✕, nicht wegradierbar
    K.striche.push({ id: ++K.n, uid: 2, name: 'Bieter', seite: 1, art: 'bild', farbe: '#e5484d', breite: 0.003, pts: [[0.6, 0.3], [0.8, 0.35]], png: PNG, text: 'B. Bieter' }); K.seq++;
    await p.waitForTimeout(1000);
    await zieh([0.7, 0.26], [0.7, 0.4]);
    pruef(K.striche.length === 1 && !K.loesch.includes(K.n), 'Radiergummi löscht eine Unterschrift');
    await p.click('[data-skw="zeigen"]'); await klick([0.7, 0.325]);
    pruef(await p.$('.bpm-sel') && !(await p.$('.bpm-x')), 'fremde Unterschrift: Rahmen ja, ✕ nein');
    // eigene Unterschrift: ✕ und ziehbar
    K.striche.push({ id: ++K.n, uid: 1, name: 'admin', seite: 1, art: 'bild', farbe: '#e5484d', breite: 0.003, pts: [[0.1, 0.3], [0.3, 0.35]], png: PNG, text: 'M. Muster' }); K.seq++;
    await p.waitForTimeout(1000); await klick([0.2, 0.325]);
    pruef(await p.$('.bpm-x') && await p.$('.bpm-sel.b'), 'eigene Unterschrift: kein ✕ oder nicht ziehbar');
    const eig = K.n; await zieh([0.2, 0.325], [0.4, 0.375]);
    pruef(await warte(() => K.loesch.includes(eig) && K.neu.some((d) => d.art === 'bild' && Math.abs(d.pts[0][0] - 0.3) < 0.02)), `Unterschrift verschieben: ${JSON.stringify(K.neu.slice(-1).map((d) => d.pts))}`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await markWahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
