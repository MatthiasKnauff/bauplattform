// Dämmdicke frei wählen (bp/bauteile.js, GO 17.11.2026 D1/E1/F1) – nachgebildeter Kern, kein Server.
// Geprüft: Dämmschicht zeigt Dämmstoffe als Chips und die Dicke als Auswahl (10–20 cm + Dicken der Optionen + „eigene Dicke …“);
// eine Dicke ohne eigene Option schickt die nächste Option und dicken; Dämmstoff wechseln behält die Dicke; eigene Dicke über die Eingabe.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await daemmdickePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/daemmdicke.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function daemmdickePruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 900, height: 900 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const S = { anfragen: [], z: { id: 'a', bereich: 'rohbau', art: 'Wand', kg: '335', name: 'Außenwand EG', menge: 96, einheit: 'm²', anzahl: 1, zustand: 'neu', status: 'neu', berechnen: true,
    vorlage: '335.01', wahl: [0, 1], dicken: {}, code: '', kurz: 'WDVS, WDVS EPS 16', quelle: 'ifc', ids: [], nummern: [], hinweis: '', erlaubt: ['neu'] } };
  const alles = () => ({ modell: { bauteilliste: { quelle: { datei: 'a.ifc' }, raeume: [], zeilen: [S.z] } }, rev: S.anfragen.length + 1, staende: [], links: [] });
  const V = [{ id: '335.01', kg: '335', name: 'WDVS', einheit: 'm²', schichten: [{ name: 'Tragschicht', optionen: [{ k: 'KS 24', t: '', std: true }] },
    { name: 'Wärmedämmung außen', daemm: true, optionen: [{ k: 'WDVS EPS 12', fam: 'WDVS EPS', dicke: 12 }, { k: 'WDVS EPS 16', fam: 'WDVS EPS', dicke: 16 }, { k: 'WDVS EPS 20', fam: 'WDVS EPS', dicke: 20 },
      { k: 'WDVS MW 16', fam: 'WDVS MW', dicke: 16 }, { k: 'WDVS MW 20', fam: 'WDVS MW', dicke: 20 }, { k: 'ohne', t: '' }] }] }];
  await p.route('http://dd.test/**', async (r) => {
    const q = r.request(), u = new URL(q.url()).pathname, J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><style>${fs.readFileSync(R + 'bp.css', 'utf8')}</style><body><div id="feld"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'bauteile.js', 'utf8')}</script><script>window.bpEingabe = async () => '13,5'; window.BPHead = { conf: { apps: [] }, appUrl: (a) => a.url };
      bpBauteile.mount(document.getElementById('feld'), 7, { einlesen: true })</script>` });
    if (u.endsWith('/bauteile/vorlagen')) return J(V);
    if (u.endsWith('/bauteile/zeile')) { const d = q.postDataJSON(); S.anfragen.push(d); if (d.wahl) S.z.wahl = d.wahl; if (d.dicken) S.z.dicken = d.dicken; return J(alles()); }
    if (u.endsWith('/planstaende')) return J({ planstaende: [], gilt: null });
    if (u.endsWith('/rueckweg')) return J({ vorschlaege: [], schalter: {}, phasen: [], termine: {} });
    if (u === '/api/bp/modell/7') return J(alles());
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://dd.test/seite');
    await p.waitForSelector('[data-btz="a"] [data-btauf]'); await p.click('[data-btz="a"] [data-btauf]');
    await p.waitForSelector('[data-btz="a"] [data-btdk="1"]');
    const a = await p.evaluate(() => ({ fam: [...document.querySelectorAll('[data-btz="a"] [data-btfam]')].map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')),
      ohne: !!document.querySelector('[data-btz="a"] [data-btop="1.5"]'), werte: [...document.querySelectorAll('[data-btdk="1"] option')].map((o) => o.value), sel: document.querySelector('[data-btdk="1"]').value }));
    pruef(JSON.stringify(a.fam) === JSON.stringify(['WDVS EPS*', 'WDVS MW']) && a.ohne, `Dämmstoffe als Chips: ${JSON.stringify(a)}`);
    pruef(a.werte.join() === '10,12,14,16,18,20,eigen' && a.sel === '16', `Dicken: ${JSON.stringify(a)}`);
    await p.selectOption('[data-btdk="1"]', '18'); await p.waitForTimeout(250);
    pruef(JSON.stringify(S.anfragen.at(-1)) === JSON.stringify({ id: 'a', rev: 1, wahl: [0, 1], dicken: { 1: 18 } }), `18 cm: ${JSON.stringify(S.anfragen.at(-1))}`);
    await p.waitForSelector('[data-btz="a"] [data-btfam][data-fam="WDVS MW"]'); await p.click('[data-btz="a"] [data-btfam][data-fam="WDVS MW"]'); await p.waitForTimeout(250);
    pruef(JSON.stringify(S.anfragen.at(-1).wahl) === '[0,3]' && S.anfragen.at(-1).dicken[1] === 18, `Dämmstoff wechseln behält die Dicke: ${JSON.stringify(S.anfragen.at(-1))}`);
    await p.waitForSelector('[data-btdk="1"]'); await p.selectOption('[data-btdk="1"]', '20'); await p.waitForTimeout(250);
    pruef(JSON.stringify(S.anfragen.at(-1).wahl) === '[0,4]' && !('1' in S.anfragen.at(-1).dicken), `20 cm = Option, keine eigene Dicke: ${JSON.stringify(S.anfragen.at(-1))}`);
    await p.waitForSelector('[data-btdk="1"]'); await p.selectOption('[data-btdk="1"]', 'eigen'); await p.waitForTimeout(300);
    pruef(S.anfragen.at(-1).dicken[1] === 13.5, `eigene Dicke 13,5 cm: ${JSON.stringify(S.anfragen.at(-1))}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await daemmdickePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
