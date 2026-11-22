// Handyansicht – Rahmen (GO 22.11.2026, Mock „Handyansicht je App“ HG-1 … HG-5) im echten Browser mit nachgebildetem Server.
// Geprüft: (1) Startseite bei 390 px: html.bp-handy, „Zu tun“ als erstes, großes Suchfeld oben, Stufe „voll“, untere Leiste mit Start · Bautagebuch · Aufgaben · Adressen · Suche, Start markiert,
// kein Hinweis „bearbeiten am Rechner“; Suche öffnet das Suchfeld. (2) Eigene Leiste aus den persönlichen Einstellungen. (3) Wärmeschutz („nur Ansicht“):
// Hinweis mit „Link an mich senden“ schickt die Adresse an /api/bp/handy/link, Befehlsleiste weg. (4) Bei 1.400 px nichts davon. Kein Fehler im Skript.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await handyPruefen(browser, repoWurzel)
import fs from 'node:fs'; import path from 'node:path';

export async function handyPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const APPS = [['portal', 'Startseite'], ['bautagebuch', 'Bautagebuch'], ['aufgaben', 'Aufgaben & Post'], ['adressen', 'Adressen'], ['waermeschutz', 'Wärmeschutz'], ['wiki', 'Wiki']]
    .map(([key, name]) => ({ key, name, allowed: true, url: '/' + (key === 'portal' ? '' : key), path: key === 'portal' ? '' : key }));
  async function seite(name, { breite, datei, handy, posts }) {
    const ctx = await browser.newContext({ viewport: { width: breite, height: 820 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${name}: Fehler im Skript – ` + String(e.message).split('\n')[0]));
    await p.route('http://portal.test/**', (r) => {
      const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
      if (pf === '' || pf === 'waermeschutz') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, datei), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
      if (pf === 'api/platform') return J({ apps: APPS, user: { name: 'admin', role: 'admin' }, projekte: [] });
      if (pf === 'api/bp/darstellung') return J({ theme: 'hell', handy });
      if (pf === 'api/bp/handy/link') { posts.push(JSON.parse(q.postData() || '{}')); return J({ ok: true, an: 'a@buero.test' }); }
      if (pf === 'api/nachweise') return J({ nachweise: [] });
      if (/(^|\/)api\//.test(pf)) return J(/katalog|liste|kontakte|neuigkeit|projekte|verlauf|fehler|todo|zutun/.test(pf) ? [] : {});
      return r.fulfill({ status: 404, body: '' });
    });
    await p.goto('http://portal.test/' + (datei === 'portal.html' ? '' : 'waermeschutz'));
    await p.waitForSelector('header.bph', { timeout: 15000 }); await p.waitForTimeout(900);
    return { p, ctx };
  }
  const stand = (p) => p.evaluate(() => ({ handy: document.documentElement.classList.contains('bp-handy'), stufe: document.documentElement.dataset.hstufe || '',
    leiste: [...document.querySelectorAll('.bph-unten [data-hu]')].map((x) => x.textContent.trim()), on: (document.querySelector('.bph-unten .on') || {}).textContent || '',
    hinweis: !!document.querySelector('.bph-hrech'), bf: [...document.querySelectorAll('.bf')].some((x) => x.offsetParent) }));
  try {
    let S = await seite('Startseite schmal', { breite: 390, datei: 'portal.html', handy: [], posts: [] }), z = await stand(S.p);
    pruef(z.handy && z.stufe === 'voll' && !z.hinweis, `Startseite 390 px: ${JSON.stringify(z)}`);
    pruef(z.leiste.join('|') === 'Start|Bautagebuch|Aufgaben|Adressen|Suche' && z.on === 'Start', `untere Leiste (Vorgabe): ${JSON.stringify(z)}`);
    const st = await S.p.evaluate(() => ({ erst: ([...document.querySelectorAll('#raster [data-ri]')][0] || { dataset: {} }).dataset.ri, such: !!(document.querySelector('#stSuch') || {}).offsetParent }));
    pruef(st.erst === 'w:todos' && st.such, `Startseite am Handy: „Zu tun“ zuerst, Suchfeld oben – ${JSON.stringify(st)}`);
    await S.p.click('.bph-unten [data-hu="suche"]'); await S.p.waitForTimeout(400);
    pruef(await S.p.evaluate(() => !!document.querySelector('.bph-su')), 'Suche in der unteren Leiste öffnet das Suchfeld nicht');
    await S.ctx.close();
    S = await seite('eigene Leiste', { breite: 390, datei: 'portal.html', handy: ['portal', 'wiki', 'suche'], posts: [] }); z = await stand(S.p);
    pruef(z.leiste.join('|') === 'Start|Wiki|Suche', `eigene Leiste aus den Einstellungen: ${JSON.stringify(z.leiste)}`);
    await S.ctx.close();
    const posts = [];
    S = await seite('Wärmeschutz schmal', { breite: 390, datei: 'waermeschutz.html', handy: [], posts }); z = await stand(S.p);
    pruef(z.handy && z.stufe === 'lesen' && z.hinweis && !z.bf, `nur Ansicht: Hinweis, keine Befehlsleiste – ${JSON.stringify(z)}`);
    await S.p.click('[data-hlink]'); await S.p.waitForTimeout(300);
    pruef(posts.length === 1 && /\/waermeschutz/.test(posts[0].url) && /gesendet/.test(await S.p.textContent('[data-hlink]')), `Link an mich senden: ${JSON.stringify(posts)}`);
    await S.ctx.close();
    S = await seite('Startseite breit', { breite: 1400, datei: 'portal.html', handy: [], posts: [] }); z = await stand(S.p);
    pruef(!z.handy && !z.leiste.length && !z.hinweis, `1.400 px: keine Handyansicht – ${JSON.stringify(z)}`);
    await S.ctx.close();
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n')[0]); }
  return fehler;
}
