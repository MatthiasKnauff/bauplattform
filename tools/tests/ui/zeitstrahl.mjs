// Zeiten → Mein Tag (zeiten-strahl.js): Ausschnitt des Zeitstrahls zoomen (＋/−, Strg + Rad) und verschieben (Umschalt + Rad, Balken unten);
// Vorgabe = Arbeitszeit ±1 h und alles Eingetragene; „Ganzer Tag“ 0–24 Uhr (16.11.2026). Ablauftest im echten Browser, ohne Server.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await zeitstrahlPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/zeitstrahl.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function zeitstrahlPruefen(browser, repo) {
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const bp = fs.readFileSync(path.join(repo, 'shared/bpcore/head/bp.js'), 'utf8'), zs = fs.readFileSync(path.join(repo, 'plattform/static/zeiten-strahl.js'), 'utf8');
  const p = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  await p.route('http://strahl.test/**', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8>
    <style>.tl{position:relative;height:58px;margin:1.3rem 0 .4rem}.b{position:absolute;top:4px;height:50px}</style><body><div id=m></div>
    <script>${bp}</script><script>const LS = bpLS('zeit.'); const h2m = (s) => { const m = /^(\\d{1,2}):(\\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
    const m2h = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const PJN = () => ({}); const artKurz = (a) => a; let W = null; const G = { heute: '2026-11-16', projekte: [{ id: 7, name: 'A480 Grundstück Spedition Knauf, Duisburg', mein: 1 }, { id: 8, name: 'A481 Tierheim', mein: 1 }] };
    let D = { tag: '2026-11-16', eintraege: [{ id: 1, von: '09:00', bis: '10:00', art: 'buero' }], vorschlaege: [], pausen: [], kommen: '', gehen: '', kommen_az: '08:00', gehen_az: '16:30' };
    function laden() {} function zeichne() { document.getElementById('m').innerHTML = zsTag(D); } window.rueckgaengig = (t, f) => { window.zuruck = f; };</script><script>${zs}</script>
    <script>LS.set('sicht', null); LS.set('ablageWeg', []); document.getElementById('m').innerHTML = zsTag(D);</script>` }));
  try {
    await p.goto('http://strahl.test/');
    const st = () => p.evaluate(() => { const t = document.querySelector('[data-zsicht] .tl'); return [+t.dataset.a, +t.dataset.b]; });
    let [a, b] = await st();
    pruef(a === 7 * 60 && b === 18 * 60, `Vorgabe Arbeitszeit ±1 h (07–18) erwartet – ${a}–${b}`);
    await p.click('[data-zz="+"]'); let [a2, b2] = await st();
    pruef(b2 - a2 < b - a && a2 > a, `＋ vergrößert – ${a2}–${b2}`);
    await p.click('[data-zz="tag"]'); [a, b] = await st();
    pruef(a === 0 && b === 1440, `Ganzer Tag – ${a}–${b}`);
    await p.click('[data-zz="+"]'); await p.click('[data-zz="+"]'); [a, b] = await st();
    const tl = await (await p.$('[data-zsicht] .tl')).boundingBox();
    await p.mouse.move(tl.x + tl.width / 2, tl.y + 20); await p.keyboard.down('Shift'); await p.mouse.wheel(0, 200); await p.keyboard.up('Shift');
    [a2, b2] = await st();
    pruef(a2 > a && b2 - a2 === b - a, `Umschalt + Rad verschiebt – ${a}–${b} → ${a2}–${b2}`);
    const f = await (await p.$('.zs-uebf')).boundingBox();
    await p.mouse.move(f.x + f.width / 2, f.y + f.height / 2); await p.mouse.down(); await p.mouse.move(f.x + f.width / 2 - 120, f.y + f.height / 2, { steps: 4 }); await p.mouse.up();
    const [a3, b3] = await st();
    pruef(a3 < a2 && b3 - a3 === b2 - a2, `Balken ziehen verschiebt – ${a2}–${b2} → ${a3}–${b3}`);
    await p.mouse.move(tl.x + tl.width / 2, tl.y + 20); await p.keyboard.down('Control'); await p.mouse.wheel(0, 200); await p.keyboard.up('Control');
    const [a4, b4] = await st();
    pruef(b4 - a4 > b3 - a3, `Strg + Rad zoomt heraus – ${a3}–${b3} → ${a4}–${b4}`);
    await p.click('[data-zz="az"]'); [a, b] = await st();
    pruef(a === 420 && b === 1080, `„Arbeitszeit“ setzt zurück – ${a}–${b}`);
    // Kärtchen der Ablage mit × herausnehmen (18.11.2026), Rückgängig und „＋ Projekt …“ holen es zurück
    const ab = () => p.evaluate(() => [...document.querySelectorAll('.zs-ab .zs-cp')].map((x) => x.dataset.zc).join());
    pruef(await ab() === 'p7,p8', `Ablage mit beiden Projekten erwartet – ${await ab()}`);
    const lang = await p.evaluate(() => { const c = document.querySelector('[data-zc="p7"]'), x = c.querySelector('[data-zcx]').getBoundingClientRect(), r = c.getBoundingClientRect(); return x.right <= r.right + 0.5 && x.width > 8; });
    pruef(lang, 'langer Name: das × bleibt im Kärtchen sichtbar');
    await p.click('[data-zcx="7"]');
    pruef(await ab() === 'p8', `× nimmt das Kärtchen heraus – ${await ab()}`);
    pruef(await p.evaluate(() => JSON.stringify(LS.get('ablageWeg'))) === '[7]', 'herausgenommen bleibt gemerkt');
    await p.evaluate(() => window.zuruck()); pruef(await ab() === 'p7,p8', `Rückgängig holt es zurück – ${await ab()}`);
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await zeitstrahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
