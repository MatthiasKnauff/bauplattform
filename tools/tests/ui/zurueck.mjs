// Schwebendes Zurück-Feld (GO 17.11.2026) – Ablauftest im echten Browser mit zwei nachgebildeten Seiten und Kopfleiste aus dem Baukasten.
// Geprüft: (1) Sprung aus einer Liste („Zu tun“) merkt sich den Ausgangspunkt; in der Ziel-App steht unten links „← Zurück“ · „✓ Erledigt“ · ✕.
// (2) „Zurück“ führt zur Absprungseite: Rollposition wie vorher, Eintrag markiert, kein Haken gesetzt; das Feld ist weg.
// (3) „Erledigt“ springt zurück und klickt dort den vorhandenen Haken des Eintrags (Abhaken bleibt Sache der Liste).
// (4) Einträge ohne Haken: kein „Erledigt“. (5) ✕ blendet aus, das Feld kommt nach Neuladen nicht wieder.
// (6) Ein gemerkter Sprung, der nicht zu einer neuen Seite geführt hat, verfällt nach 30 s. (7) Sprung aus der Suche: zurück öffnet die Suche mit demselben Begriff.
// (8) Gewöhnlicher Link in eine andere App: „Zurück zu <App>“ ohne eigenes Merken.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await zurueckPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/zurueck.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const SEITE = (titel, inhalt) => `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>${titel}</title></head><body>
<div id="kopf"></div>${inhalt}<script src="/bp/baukasten.js"></script><script src="/bp/head.js"></script><script>BPHead.mount({ app: 'test', name: '${titel}', parent: document.getElementById('kopf') });</script></body></html>`;
const LISTE = '<div style="height:1600px"></div><ul id="liste">'
  + ['a1', 'a2', 'a3'].map((k) => `<li data-tk="${k}">Eintrag ${k} <input type="checkbox" data-td="fertig"> <a href="/b" data-sprung="${k}">öffnen</a></li>`).join('')
  + '</ul><div style="height:1600px"></div><script>window.geklickt = [];'
  + 'document.addEventListener("change", (e) => { const z = e.target.closest("[data-tk]"); if (z) window.geklickt.push(z.dataset.tk); });'
  + 'document.addEventListener("click", (e) => { const a = e.target.closest("[data-sprung]"); if (!a) return; e.preventDefault();'
  + ' bpZurueckMerken({ titel: "Zu tun: " + a.dataset.sprung, key: a.dataset.sprung, haken: a.dataset.sprung !== "a3" }); location.href = "/b"; });</script>';

export async function zurueckPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://zr.test/**', (r) => {
    const pf = new URL(r.request().url()).pathname.replace(/^\//, '');
    if (pf === 'a') return r.fulfill({ contentType: 'text/html', body: SEITE('Start', LISTE) });
    if (pf === 'b') return r.fulfill({ contentType: 'text/html', body: SEITE('Ziel', '<p>Ziel-App</p><a id="weiter" href="/c">weiter</a>') });
    if (pf === 'c') return r.fulfill({ contentType: 'text/html', body: SEITE('Andere', '<p>andere App</p>') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
    const J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [], projekte: [] });
    if (pf.startsWith('api/')) return J(/liste|kontakte|neuigkeit|projekte|verlauf|fehler|suche/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  const feld = () => p.evaluate(() => { const f = document.querySelector('.bp-zr'); return f ? { text: f.textContent, knoepfe: [...f.querySelectorAll('[data-zr]')].map((b) => b.dataset.zr),
    links: Math.round(f.getBoundingClientRect().left), unten: Math.round(innerHeight - f.getBoundingClientRect().bottom) } : null; });
  const warte = (ms) => p.waitForTimeout(ms);
  const springe = async (k) => { await p.goto('http://zr.test/a'); await p.waitForSelector('.bph-who', { timeout: 10000 });
    await p.evaluate(() => { const z = document.querySelector('[data-tk="a2"]'); scrollTo({ top: z.offsetTop - 200 }); }); await warte(100);
    const rolle = await p.evaluate(() => Math.round(scrollY));
    await Promise.all([p.waitForURL('**/b'), p.evaluate((x) => document.querySelector(`[data-sprung="${x}"]`).click(), k)]);
    await p.waitForSelector('.bph-who'); await warte(600); return rolle; };
  const zurueck = async (welcher) => { await Promise.all([p.waitForURL('**/a'), p.evaluate((w) => document.querySelector(`.bp-zr [data-zr="${w}"]`).click(), welcher)]);
    await p.waitForSelector('.bph-who'); await warte(900); };

  try {
    // (1) Feld in der Ziel-App, auch nach dem Weiterklicken in eine andere App
    const rolle = await springe('a2');
    let f = await feld();
    pruef(f && /Zu tun: a2/.test(f.text), 'Ziel-App: Feld „← Zurück“ mit Herkunft fehlt');
    pruef(f && f.knoepfe.join('|') === 'zurueck|erledigt|weg', `Knöpfe Zurück · Erledigt · ✕ erwartet, sind ${f && f.knoepfe.join(' · ')}`);
    pruef(f && f.links < 40 && f.unten < 40, `Feld nicht unten links (links ${f && f.links}, unten ${f && f.unten})`);
    await Promise.all([p.waitForURL('**/c'), p.evaluate(() => document.getElementById('weiter').click())]); await p.waitForSelector('.bph-who'); await warte(600);
    pruef(!!(await feld()), 'Feld verschwindet beim Weiterklicken in eine andere App');
    // (2) Zurück: Rollposition, Markierung, kein Haken
    await zurueck('zurueck');
    const a = await p.evaluate(() => ({ rolle: Math.round(scrollY), hier: !!document.querySelector('[data-tk="a2"].bp-zr-hier'), geklickt: window.geklickt.slice(), feld: !!document.querySelector('.bp-zr') }));
    pruef(Math.abs(a.rolle - rolle) < 5, `Zurück: Rollposition ${a.rolle} statt ${rolle}`);
    pruef(a.hier, 'Zurück: Eintrag a2 ist nicht markiert');
    pruef(!a.geklickt.length, 'Zurück: Haken wurde gesetzt, obwohl nur „Zurück“ geklickt');
    pruef(!a.feld, 'Zurück: Feld steht noch an der Absprungseite');
    // (3) Erledigt: Haken der Liste wird geklickt
    await springe('a1'); await zurueck('erledigt');
    const e = await p.evaluate(() => ({ geklickt: window.geklickt.slice(), an: document.querySelector('[data-tk="a1"] [data-td="fertig"]').checked }));
    pruef(e.geklickt.join() === 'a1' && e.an, `Erledigt: Haken von a1 erwartet, geklickt: ${e.geklickt.join() || 'nichts'}`);
    // (4) ohne Haken: kein „Erledigt“
    await springe('a3'); f = await feld();
    pruef(f && !f.knoepfe.includes('erledigt'), 'Eintrag ohne Haken: „Erledigt“ wird trotzdem angeboten');
    // (5) ✕ blendet aus, auch nach Neuladen
    await p.evaluate(() => document.querySelector('.bp-zr [data-zr="weg"]').click()); await warte(100);
    pruef(!(await feld()), '✕: Feld bleibt stehen');
    await p.reload(); await p.waitForSelector('.bph-who'); await warte(600);
    pruef(!(await feld()), '✕: Feld kommt nach Neuladen wieder');
    // (6) Verfall: Sprung ohne Seitenwechsel, 30 s später eine neue Seite → kein Feld
    await p.evaluate(() => sessionStorage.setItem('bpZurueck', JSON.stringify({ titel: 'alt', url: 'http://zr.test/a', rolle: 0, t: Date.now() - 31000 })));
    await p.goto('http://zr.test/c'); await p.waitForSelector('.bph-who'); await warte(600);
    pruef(!(await feld()), 'Verfall: alter Sprung (> 30 s) zeigt noch ein Feld');
    // (7) Suche: zurück öffnet die Suche mit demselben Begriff
    await p.goto('http://zr.test/a'); await p.waitForSelector('.bph-who');
    await p.evaluate(() => bpZurueckMerken({ titel: 'Suche: Fenster', suche: 'Fenster' }));
    await p.goto('http://zr.test/b'); await p.waitForSelector('.bph-who'); await warte(600);
    f = await feld();
    pruef(f && /Suche: Fenster/.test(f.text) && !f.knoepfe.includes('erledigt'), 'Suche: Feld „Suche: Fenster“ ohne „Erledigt“ fehlt');
    if (f) {
      await zurueck('zurueck'); await warte(400);
      const q = await p.evaluate(() => { const i = [...document.querySelectorAll('input')].find((x) => x.type !== 'checkbox' && x.offsetParent && x.value); return i ? i.value : ''; });
      pruef(q === 'Fenster', `Suche: nach Zurück ist die Suche nicht mit „Fenster“ offen (${q || 'leer'})`);
    }
    // (8) Gewöhnlicher Link in eine andere App (19.11.2026): ohne eigenes Merken steht in der Ziel-App „Zurück zu <App>“, Zurück führt zur Seite davor
    await p.evaluate(() => sessionStorage.clear());
    await p.goto('http://zr.test/b'); await p.waitForSelector('.bph-who'); await warte(300);
    await Promise.all([p.waitForURL('**/c'), p.evaluate(() => document.getElementById('weiter').click())]); await p.waitForSelector('.bph-who'); await warte(600);
    f = await feld();
    pruef(f && /Zurück zu Ziel/.test(f.text), `Link in andere App: Feld „Zurück zu Ziel“ fehlt (${f && f.text})`);
    if (f) { await Promise.all([p.waitForURL('**/b'), p.evaluate(() => document.querySelector('.bp-zr [data-zr="zurueck"]').click())]); await p.waitForSelector('.bph-who'); await warte(400);
      pruef(!(await feld()), 'Link in andere App: nach Zurück steht das Feld noch'); }
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await zurueckPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
