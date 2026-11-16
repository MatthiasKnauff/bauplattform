// KI-Gespräch „Fragen“ (bp/fragen.js, GO 16.11.2026): Frage → Antwort mit Quellen; kein Preis + Zusatzrecherche an → „Im Netz nachfragen …“
// erst nach Warnung (extern: true); Ollama nicht erreichbar → Hinweis, keine externe Anfrage. Ablauftest im echten Browser, nachgebildeter Kern.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await fragenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/fragen.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function fragenPruefen(browser, repo) {
  const R = path.join(repo, 'shared/bpcore/head/'), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const p = await browser.newPage({ viewport: { width: 420, height: 800 } });
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const S = { posts: [], warnung: 0, aus: false };
  await p.route('http://kf.test/**', (r) => {
    const u = new URL(r.request().url()).pathname, J = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (u === '/seite') return r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset=utf-8><body><div id="f"></div><script>${fs.readFileSync(R + 'bp.js', 'utf8')}</script><script>${fs.readFileSync(R + 'fragen.js', 'utf8')}</script>
      <script>window.bpFrage = async () => { window.W = (window.W || 0) + 1; return true; }; bpFragen.mount(document.getElementById('f'), 7);</script>` });
    if (u === '/api/bp/modell/7/fragen') {
      const b = r.request().postDataJSON(); S.posts.push(b);
      if (S.aus) return J({ hinweis: 'Die KI im Büro (Ollama) ist gerade nicht erreichbar – bitte später noch einmal.' });
      if (b.extern) return J({ antwort: 'Etwa 650 € je Fenster (Schätzung).', quellen: [{ art: 'extern', text: 'externe KI (claude), anonymisiert – ungeprüft' }], extern: 'claude' });
      return J({ antwort: 'Dazu habe ich keinen Preis in unseren Daten.', quellen: [{ art: 'modell', text: 'Bauteil-Checkliste (3 berechnet, 0 offen)' }], kein_preis: true, zusatz: true });
    }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://kf.test/seite');
    await p.fill('[data-kft]', 'Was kostet ein Dachfenster?'); await p.press('[data-kft]', 'Enter');
    await p.waitForSelector('[data-kfnetz]');
    const a = await p.evaluate(() => ({ t: document.querySelector('.kf-a').textContent, w: window.W || 0 }));
    pruef(/keinen Preis/.test(a.t) && /Bauteil-Checkliste/.test(a.t) && a.w === 0 && S.posts.length === 1 && !S.posts[0].extern, `Antwort mit Quelle, ohne externe Anfrage: ${JSON.stringify(a)} ${JSON.stringify(S.posts)}`);
    await p.click('[data-kfnetz]'); await p.waitForSelector('.kf-a.ext');
    pruef(await p.evaluate(() => window.W) === 1 && S.posts.length === 2 && S.posts[1].extern === true, `Im Netz nur nach Warnung: ${JSON.stringify(S.posts)}`);
    S.aus = true;
    await p.fill('[data-kft]', 'Wann ist der Rohbau fertig?'); await p.click('[data-kfok]'); await p.waitForTimeout(300);
    pruef(await p.evaluate(() => /nicht erreichbar/.test(document.querySelector('.kf').textContent)) && !S.posts[2].extern, 'Ollama aus: Hinweis, keine externe Anfrage');
    pruef(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'schmal: waagerechter Scrollbalken');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await p.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await fragenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
