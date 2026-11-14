// Startseite: jede Sache steht nur einmal da – Ablauftest im echten Browser mit nachgebildeten Server-Antworten.
// Geprüft: (1) Hat eine Regel ein eigenes Widget, fehlt sie in „Erinnerungen & Fristen“. (2) Zeigt „Erinnerungen & Fristen“ eine Regel,
// entsteht dafür kein zweites Widget von selbst. (3) Eine Erinnerung bzw. ein Mangel mit Frist, der schon als Hinweis einer Regel dasteht,
// erscheint nicht noch einmal unter „Meine Erinnerungen“. (4) Ohne „Erinnerungen & Fristen“ bekommt jede Regel wie bisher ihr Widget.
// (5) Viele gleichartige Hinweise stehen in einer aufklappbaren Sammelzeile. (6) Zwei Zahlen im Kopf: fällig (rot) und offen.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await startseitePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/startseite.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function startseitePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const heute = new Date().toISOString().slice(0, 10), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const hinweis = (regel, name, obj, titel) => ({ key: `${regel}:${obj}`, regel, regel_name: name, titel, text: '', pid: null, projekt: '', faellig: heute, link: '', prio: 0, auto: true });
  const AUTO = [1, 2, 3, 4, 5].map((n) => hinweis('formulare', 'Neue Bauantragsformulare', n, 'Neues Bauantragsformular ' + n))
    .concat([hinweis('erinnerungen', 'Fällige Erinnerungen', 5, 'Statik nachfordern'), hinweis('maengel', 'Mängel mit abgelaufener Frist', 7, 'Mangel: Blech fehlt'), hinweis('vorort', 'Tagesbericht nach Baustellenbesuch', '1:x', 'Tagesbericht schreiben')]);
  const REGELN = [['formulare', 'Neue Bauantragsformulare'], ['erinnerungen', 'Fällige Erinnerungen'], ['maengel', 'Mängel mit abgelaufener Frist'], ['vorort', 'Tagesbericht nach Baustellenbesuch']].map(([key, name]) => ({ key, name, an: true, fuer: 'alle', projekte: 'meine', wert: 0 }));
  const er = (id, titel) => ({ id, quelle: id[0] === 'b' ? 'bautagebuch' : 'eigen', titel, text: '', termin: heute, uhrzeit: '08:00', status: 'offen', gesendet: '', lage: 'heute', projekt: '', an: ['A'], an_ids: [1], von: 'A', firma: '' });
  const ERIN = [er('r5', 'Statik nachfordern'), er('b7', 'Mangel: Blech fehlt'), er('r9', 'Nur Erinnerung')];
  const kombi = { i: 'w:kombi.1', x: 8, y: 0, w: 4, h: 5 };

  async function lauf(raster, name, pruefen) {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${name}: JavaScript-Fehler: ` + String(e.message || e).split('\n')[0]));
    const antwort = (pf) => {
      if (pf === 'api/me') return { ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} };
      if (pf === 'api/platform') return { apps: [{ key: 'aufgaben', name: 'Aufgaben & Post', url: '/aufgaben', path: '/aufgaben', allowed: true }], user: { name: 'admin', role: 'admin' }, projekte: [] };
      if (pf === 'api/bp/kacheln') return { reihenfolge: [], raster };
      if (pf === 'api/bp/todo') return { auto: AUTO, manuell: [], fehler: [] };
      if (pf === 'api/bp/todo-regeln') return { regeln: REGELN, projekte: [], benutzer: [], ich: 1, eigene: {} };
      if (/api\/erinnerungen$/.test(pf)) return { items: ERIN, mail: true };
      if (pf === 'api/bp/post') return { eingerichtet: true, stand: heute + 'T08:00:00', seit: heute + 'T00:00:00', gelesen: 2, projekte: 1, fehler: [], mails: [
        { id: 'm1', pid: 1, projekt: 'T101 Testprojekt', art: 'Angebot', von: 'a@firma.test', von_name: 'Firma A', betreff: 'Angebot Rohbau', zeit: heute + 'T07:00:00', todo: { id: 11, faellig: heute, status: 'offen' } },
        { id: 'm2', pid: 1, projekt: 'T101 Testprojekt', art: 'Nachricht', von: 'b@firma.test', von_name: 'Firma B', betreff: 'Rückfrage Entwässerung', zeit: heute + 'T07:30:00' }] };
      return /liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {};
    };
    await p.route('http://portal.test/**', (r) => {
      const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, '');
      if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'portal.html'), 'utf8') });
      if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
      const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
      if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
      if (/(^|\/)api\//.test(pf)) return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort(pf.replace(/^aufgaben\//, 'aufgaben/'))) });
      return r.fulfill({ status: 404, body: '' });
    });
    try {
      await p.goto('http://portal.test/');
      await p.waitForFunction(() => typeof TD !== 'undefined' && TD && (TD.auto || []).length && typeof KOMBI !== 'undefined' && KOMBI.erin, null, { timeout: 20000 });
      await p.waitForTimeout(300);
      const bild = await p.evaluate(() => ({
        widgets: [...document.querySelectorAll('section.ue-b[data-blk]')].map((s) => s.dataset.blk),
        kombi: (() => { const s = document.querySelector('section.ue-b[data-blk^="kombi"]'); if (!s) return null; UE.mehr.add(s.dataset.blk); rasterZeigen(); const t = document.querySelector('section.ue-b[data-blk^="kombi"]'); return { n: +t.querySelector('.ue-n').textContent, text: t.textContent }; })() }));
      if (bild.kombi && /× Neue Bauantragsformulare/.test(bild.kombi.text)) {   // Sammelzeile aufklappen
        await p.evaluate(() => document.querySelector('section.ue-b[data-blk^="kombi"] [data-kbsum]').click()); await p.waitForTimeout(150);
        bild.kombi.auf = await p.evaluate(() => document.querySelector('section.ue-b[data-blk^="kombi"]').textContent);
      }
      bild.post = await p.evaluate(async () => { const b = document.querySelector('#post'); if (!b || b.hidden) return null; const z = () => b.querySelectorAll('.pm').length, vor = z(), text = b.textContent;
        const k = b.querySelector('[data-post="todomails"]'); if (k) k.click(); await new Promise((r) => setTimeout(r, 100)); return { vor, nach: z(), text }; });
      bild.zahlen = await p.evaluate(() => [...document.querySelectorAll('section.ue-b[data-blk^="kombi"] h3 .ue-n')].map((x) => +x.textContent));
      pruefen(bild);
    } catch (e) { fehler.push(`${name}: Prüfung bricht ab – ` + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  const mal = (t, s) => t.split(s).length - 1;
  await lauf({ items: [kombi, { i: 'w:formulare', x: 0, y: 3, w: 4, h: 3 }], weg: ['w:todos', 'w:post', 'w:erin'] }, 'eigenes Widget und „Erinnerungen & Fristen“', (b) => {
    pruef(b.widgets.includes('formulare'), 'das eigene Widget „Neue Bauantragsformulare“ fehlt');
    pruef(b.kombi && mal(b.kombi.text, 'Bauantragsformular ') === 0, '„Erinnerungen & Fristen“ zeigt die Formulare noch einmal, obwohl sie ein eigenes Widget haben');
    pruef(b.kombi && mal(b.kombi.text, 'Statik nachfordern') === 1 && mal(b.kombi.text, 'Mangel: Blech fehlt') === 1, 'Erinnerung bzw. Mangel steht doppelt in „Erinnerungen & Fristen“ (Regel und „Meine Erinnerungen“)');
    pruef(b.kombi && mal(b.kombi.text, 'Nur Erinnerung') === 1 && b.kombi.n === 4, `„Erinnerungen & Fristen“: 4 Einträge erwartet (Erinnerung, Mangel, Besuch, eigene Erinnerung), gezählt ${b.kombi && b.kombi.n}`);
    pruef(!b.widgets.some((k) => ['erinnerungen', 'maengel', 'vorort'].includes(k)), 'für Regeln, die in „Erinnerungen & Fristen“ stehen, ist ein zweites Widget entstanden: ' + b.widgets.join(', '));
  });
  await lauf({ items: [kombi], weg: ['w:todos', 'w:post', 'w:erin'] }, 'nur „Erinnerungen & Fristen“', (b) => {
    pruef(b.widgets.length === 1, 'neben „Erinnerungen & Fristen“ sind von selbst Widgets entstanden: ' + b.widgets.join(', '));
    pruef(b.kombi && mal(b.kombi.text, '5 × Neue Bauantragsformulare') === 1 && mal(b.kombi.text, 'Bauantragsformular ') === 0, 'fünf gleichartige Hinweise sollen in einer Sammelzeile stehen');
    pruef(b.kombi && mal(b.kombi.auf || '', 'Bauantragsformular ') === 5, 'die Sammelzeile klappt nicht auf');
    pruef(JSON.stringify(b.zahlen) === '[9,9]', `„Erinnerungen & Fristen“: zwei Zahlen erwartet – fällig 9 und offen 9 (Sammelzeile zählt ihre Einträge), gezeigt ${JSON.stringify(b.zahlen)}`);
  });
  await lauf({ items: [kombi], weg: ['w:todos', 'w:erin'] }, 'Post', (b) => {   // eine Mail – eine Sache: Mail mit To-do steht in „Meine To-dos“, nicht noch einmal in der Post
    pruef(b.post && b.post.vor === 1 && /Eine Mail steht als To-do/.test(b.post.text) && /Rückfrage Entwässerung/.test(b.post.text), `Post: nur die Mail ohne To-do erwartet und der Hinweis auf das To-do – gezeigt ${b.post ? b.post.vor : 'nichts'} Mail(s)`);
    pruef(b.post && b.post.nach === 2, '„hier zeigen“ blendet die Mail mit To-do nicht wieder ein');
  });
  await lauf({ items: [], weg: ['w:todos', 'w:post', 'w:erin'] }, 'ohne „Erinnerungen & Fristen“', (b) => {
    pruef(['formulare', 'erinnerungen', 'maengel', 'vorort'].every((k) => b.widgets.includes(k)), 'ohne „Erinnerungen & Fristen“ muss jede Regel ihr eigenes Widget bekommen: ' + b.widgets.join(', '));
  });
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await startseitePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
