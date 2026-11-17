// Startseite „Zu tun“ (17.11.2026): jede Sache steht nur einmal da – Ablauftest im echten Browser mit nachgebildeten Server-Antworten.
// Geprüft: (1) EIN Widget „Zu tun“ statt „Erinnerungen & Fristen“, Regel-Widgets, „Meine To-dos“, „Zeiten“ – auch wenn das gespeicherte Raster sie noch hat.
// (2) Hinweise nur zur Kenntnis (info: neue Formulare) stehen zusammengefasst unter „Neu für dich“, nicht in der Liste. (3) Eine Erinnerung bzw. ein Mangel,
// der schon als Hinweis einer Regel dasteht, erscheint nicht noch einmal. (4) Unbestätigte Zeiten = EIN Eintrag. (5) „Warte auf“ (Aufgaben an andere) nicht in „Alle“.
// (6) Zwei Zahlen im Kopf: fällig (rot) und offen. (7) Mail mit To-do steht in „Zu tun“, nicht noch einmal in der Post. (8) Der Titel „Zu tun“ ist ein Link.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await startseitePruefen(browser, repoWurzel)   – allein: node tools/tests/ui/startseite.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function startseitePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const heute = new Date().toISOString().slice(0, 10), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const hinweis = (regel, name, obj, titel, info) => ({ key: `${regel}:${obj}`, regel, regel_name: name, titel, text: '', pid: null, projekt: '', faellig: heute, link: '', prio: 0, auto: true, ...(info ? { info: true } : {}) });
  const AUTO = [1, 2, 3, 4, 5].map((n) => hinweis('formulare', 'Neue Bauantragsformulare', n, 'Neues Bauantragsformular ' + n, true))
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
      if (pf === 'api/platform') return { apps: [{ key: 'aufgaben', name: 'Aufgaben & Post', url: '/aufgaben', path: '/aufgaben', allowed: true }, { key: 'zeiten', name: 'Zeiten', url: '/zeiten', path: '/zeiten', allowed: true }], user: { name: 'admin', role: 'admin' }, projekte: [] };
      if (pf === 'api/bp/kacheln') return { reihenfolge: [], raster };
      if (pf === 'api/bp/todo') return { auto: AUTO, manuell: [{ id: 11, key: 't:11', titel: 'Angebot Rohbau prüfen', faellig: heute, status: 'offen', erstellt_von: 1, personen: [1], notiz: 'https://outlook.office.com/mail/x' },
        { id: 12, key: 't:12', titel: 'Bauleiter soll Fotos schicken', faellig: '', status: 'offen', erstellt_von: 1, personen: [2], personen_namen: ['B'] }], fehler: [] };
      if (/api\/offen$/.test(pf)) return { offen: ['2026-11-12', '2026-11-14'], heute: { kommen: '07:40', arbeit: 45, soll: 480 } };
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
      await p.waitForFunction(() => typeof TD !== 'undefined' && TD && (TD.auto || []).length && document.querySelector('#todo.zt') && TDZU.extra.some((x) => x.regel === 'zeiten') && TDZU.extra.some((x) => x.regel === 'erinnerung'), null, { timeout: 20000 });
      await p.waitForTimeout(300);
      const bild = await p.evaluate(() => {
        const s = document.querySelector('section.ue-b[data-blk="todos"]'), z = document.querySelector('#todo.zt');
        return { widgets: [...document.querySelectorAll('section.ue-b[data-blk]')].map((x) => x.dataset.blk), titel: s && s.querySelector('h3').textContent, link: !!(s && s.querySelector('h3 a[href]')),
          liste: [...z.querySelectorAll('.tr')].map((x) => x.textContent).join(' | '), neu: (z.querySelector('.zt-neu') || {}).textContent || '', heute: (z.querySelector('.zt-heute') || {}).textContent || '',
          chips: [...z.querySelectorAll('[data-ztf]')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), zahlen: [...s.querySelectorAll('h3 .ue-n, h3 .ue-n2')].map((x) => +x.textContent) };
      });
      await p.evaluate(() => document.querySelector('[data-ztf="warte"]').click()); await p.waitForTimeout(100);
      bild.warte = await p.evaluate(() => [...document.querySelectorAll('#todo.zt .tr')].map((x) => x.textContent).join(' | '));
      await p.evaluate(() => document.querySelector('[data-ztf="alle"]').click());
      bild.post = await p.evaluate(async () => { const b = document.querySelector('#post'); if (!b || b.hidden) return null; const z = () => b.querySelectorAll('.pm').length, vor = z(), text = b.textContent;
        const k = b.querySelector('[data-post="todomails"]'); if (k) k.click(); await new Promise((r) => setTimeout(r, 100)); return { vor, nach: z(), text }; });
      pruefen(bild);
    } catch (e) { fehler.push(`${name}: Prüfung bricht ab – ` + String(e.message).split('\n')[0]); }
    await ctx.close();
  }
  const mal = (t, s) => t.split(s).length - 1;
  await lauf({ items: [kombi, { i: 'w:formulare', x: 0, y: 3, w: 4, h: 3 }, { i: 'w:todos', x: 0, y: 6, w: 6, h: 4 }, { i: 'w:zeiten', x: 6, y: 6, w: 4, h: 3 }], weg: ['w:erin'] }, 'altes Raster', (b) => {
    pruef(b.widgets.join('|') === 'todos', 'nur noch das Widget „Zu tun“ erwartet, gezeigt: ' + b.widgets.join(', '));
    pruef(/^\s*.*Zu tun/.test(b.titel || '') && b.link, `Titel „Zu tun“ als Link erwartet: ${b.titel}`);
    pruef(mal(b.liste, 'Bauantragsformular') === 0 && /5 × Neue Bauantragsformulare/.test(b.neu), `Formulare gehören unter „Neu für dich“ (zusammengefasst): ${b.neu}`);
    pruef(mal(b.liste, 'Statik nachfordern') === 1 && mal(b.liste, 'Mangel: Blech fehlt') === 1 && mal(b.liste, 'Nur Erinnerung') === 1, 'Erinnerung/Mangel doppelt oder fehlt: ' + b.liste);
    pruef(mal(b.liste, 'Tage Zeiten bestätigen') === 1 && mal(b.liste, 'noch nicht bestätigt') === 0, 'unbestätigte Zeiten als EIN Eintrag erwartet');
    pruef(/Heute seit 07:40/.test(b.heute), `Zeile „Heute“ fehlt: ${b.heute}`);
    pruef(mal(b.liste, 'Fotos schicken') === 0 && /Fotos schicken/.test(b.warte || ''), '„Warte auf“: Aufgabe an andere gehört nicht in „Alle“, aber unter „Warte auf“');
    pruef(mal(b.liste, 'Angebot Rohbau prüfen') === 1 && /Mail/.test(b.liste), 'Mail als To-do erwartet (mit Kennzeichen „Mail“)');
    pruef(b.chips.some((c) => /^Warte auf 1/.test(c)) && b.chips.some((c) => /^Alle/.test(c)), 'Filter fehlen: ' + b.chips.join(' · '));
    pruef(JSON.stringify(b.zahlen) === '[6,6]', `zwei Zahlen erwartet – fällig 6 und offen 6, gezeigt ${JSON.stringify(b.zahlen)}`);
  });
  await lauf({ items: [], weg: ['w:erin'] }, 'Post', (b) => {   // eine Mail – eine Sache: Mail mit To-do steht in „Zu tun“, nicht noch einmal in der Post
    pruef(b.post && b.post.vor === 1 && /Eine Mail steht als To-do/.test(b.post.text) && /Rückfrage Entwässerung/.test(b.post.text), `Post: nur die Mail ohne To-do erwartet und der Hinweis auf das To-do – gezeigt ${b.post ? b.post.vor : 'nichts'} Mail(s)`);
    pruef(b.post && b.post.nach === 2, '„hier zeigen“ blendet die Mail mit To-do nicht wieder ein');
    pruef(b.widgets.includes('todos'), '„Zu tun“ fehlt bei leerem Raster');
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
