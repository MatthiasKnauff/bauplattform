// Kürzel aus dem Plan (GO 18.11.2026, bp/bauteile.js + Kern kuerzel.py): Zeile zeigt, was an der Wand stand und wie es verstanden wurde,
// „bitte bestätigen“ (C1) schickt bestaetigt, „An den Zeichner“ listet Dickenprobe und Wände ohne Kürzel. Nachgebildeter Kern.
// Aufgerufen aus oberflaeche.mjs – allein: node tools/tests/ui/kuerzel.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function kuerzelPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 900, height: 900 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const Z = (id, mehr) => ({ id, bereich: 'rohbau', art: 'Wand', kg: '331', name: 'Wand außen 17,5 cm', menge: 103.2, einheit: 'm²', anzahl: 4, zustand: 'neu', status: 'neu', berechnen: true,
    vorlage: '331.02', wahl: [1, 0, 1], code: '', kurz: 'AW monolithisch, verputzt, PP2 36,5, LP', quelle: 'ifc', ids: [], nummern: [], hinweis: '', erlaubt: ['neu'], ...mehr });
  const S = { L: { quelle: { datei: 'a.ifc' }, raeume: [], zeilen: [
    Z('w1', { kuerzel: 'putz pp putz flies antrich', kz_vorlage: '331.02', bestaetigt: false, dicke_plan: 0.175, richtung: { N: 27, O: 23 },
      erkannt: { stufe: 'bestaetigen', folge: [['pp', 'Porenbeton', 'Kern'], ['antrich', 'Anstrich', 'innen · „antrich“ als Anstrich?']], dicke: 'Plan 17,5 cm – im Baustein gibt es 36,5, 42,5 cm; genommen 36,5 cm, bitte prüfen.' } }),
    Z('w2', { id: 'w2', kg: '341', name: 'Wand 24 cm', vorlage: '', kurz: '' })] }, anfragen: [] };
  const alles = () => ({ modell: { bauteilliste: S.L }, rev: S.anfragen.length + 1, staende: [], links: [] });
  await p.route('http://kz.test/**', async (r) => {
    const q = r.request(), u = new URL(q.url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'bp.css', 'utf8')}</style><body><div id="feld"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script><script>window.BPHead = { conf: { apps: [] } };
      bpBauteile.mount(document.getElementById('feld'), 7, {})</script>` });
    if (u.endsWith('/bauteile/zeile')) { const d = q.postDataJSON(); S.anfragen.push(d); const z = S.L.zeilen.find((x) => x.id === d.id); if (d.bestaetigt) z.bestaetigt = true; return J(alles()); }
    if (u.endsWith('/modell/kuerzel')) return J({ lage: [['AW', 'Außenwand']], kern: [['KS', 'Kalksandstein']], schichten: ['Putz'] });
    if (/\/rueckweg$/.test(u)) return J({ vorschlaege: [] });
    if (/\/api\/bp\/modell\/7$/.test(u)) return J(alles());
    return J({});
  });
  try {
    await p.goto('http://kz.test/seite'); await p.waitForSelector('.bt-kzb', { timeout: 10000 });
    const v = await p.evaluate(() => ({ kz: document.querySelector('.bt-kzb').textContent, best: !!document.querySelector('[data-btbest]'), zl: (document.querySelector('[data-btzeichner]') || {}).outerHTML || '' }));
    pruef(/putz pp putz flies antrich/.test(v.kz) && /bitte bestätigen/.test(v.kz) && /Porenbeton/.test(v.kz) && /17,5/.test(v.kz) && /N 27/.test(v.kz), `Kürzel-Kasten: ${v.kz.slice(0, 300)}`);
    pruef(v.best && v.zl, `Bestätigen und „An den Zeichner“ fehlen – ${JSON.stringify(v)}`);
    await p.click('[data-btbest]'); await p.waitForTimeout(200);
    pruef(S.anfragen.some((a) => a.id === 'w1' && a.bestaetigt === true), `Bestätigen schickt bestaetigt: ${JSON.stringify(S.anfragen)}`);
    await p.click('[data-btzeichner]'); await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/kz2.png' }); await p.waitForSelector('.bt-zl li', { timeout: 3000 });
    const L = await p.evaluate(() => [...document.querySelectorAll('.bt-zl li')].map((x) => x.textContent));
    pruef(L.some((x) => /17,5/.test(x)) && L.some((x) => /ohne Kürzel/.test(x)), `An den Zeichner: ${JSON.stringify(L)}`);
    await p.screenshot({ path: '/tmp/kuerzel.png' });
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await kuerzelPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
