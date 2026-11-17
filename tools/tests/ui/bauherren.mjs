// Bauherrenportal – Baustein bp/freigeben.js im echten Browser (nachgebildeter Server, Seite der App „Bauantrag“ als Rahmen):
// Projekt-Fenster mit Bereichen an/aus und Eingang (Datei von Bauherr:in), „Information schreiben“, Freigeben mit PDF (multipart)
// und Nachfrage, wenn der Bereich aus ist. Entschieden am 16.11.2026.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await bauherrenPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/bauherren.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function bauherrenPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 950 } }), p = await ctx.newPage();
  p.on('pageerror', (e) => fehler.push('Fehler im Skript – ' + e.message));
  const S = { B: { tagesbericht: true, termine: true, kosten: false, plan: false, rechnung: false, maengel: true, foto: true, info: true, upload: true, nachricht: true }, posts: [], frei: [], kopf: [], KO: { ansprech: null, phasen: true, termine: 'phasen', mail: 'aus', anrede: '', bild_text: '' } };
  const TT = { tagesbericht: 'Bautagebuch', termine: 'Termine', kosten: 'Kosten', plan: 'Pläne', rechnung: 'Rechnungen', maengel: 'Mängel', foto: 'Fotos', info: 'Informationen', upload: 'Dateien hochladen', nachricht: 'Nachrichten schreiben' };
  const projekt = () => ({ an: true, url: 'https://portal.test', takt: 60, konten: [], vorschlaege: [{ name: 'Erika Muster', email: 'erika@muster.test', rolle: 'Bauherr:in', firma: '' }], freigaben: [],
    eingang: [{ id: 1, fern_id: 9, art: 'datei', zeit: '2026-11-15T10:00:00', erledigt: '', daten: { von: 'Anna', name: 'Angebot.pdf', text: 'Küche', ablage: 'A481/Von Bauherrschaft/Angebot.pdf' }, dateien: [{ nr: 0, name: 'Angebot.pdf' }] }],
    bereiche: Object.keys(TT).map((k) => ({ key: k, titel: TT[k], an: S.B[k] })) });
  await p.route('http://portal.test/**', async (r) => {
    const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, ''), J = (o, st = 200) => r.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === 'bauantrag') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'bauantrag.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'plan.pdf') return r.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4 Plan' });
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', role: 'admin', admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [], bauherren: true });
    if (pf === 'api/bp/bauherren/projekt/7' && q.method() === 'POST') { const b = JSON.parse(q.postData() || '{}'); S.posts.push(b); if (b.bereiche) Object.assign(S.B, b.bereiche); return J(projekt()); }
    if (pf === 'api/bp/bauherren/projekt/7') return J(projekt());
    if (pf === 'api/bp/bauherren/projekt/7/kopf') { if (q.method() === 'PUT') { const b = JSON.parse(q.postData() || '{}'); S.kopf.push(b); Object.assign(S.KO, b); }   // Startseite im Portal (17.11.2026)
      return J({ ...S.KO, bild: false, leute: [{ id: 3, name: 'M. Knauff' }], termine_wahl: { phasen: 'nur Bauphasen und Meilensteine', alle: 'alle Leistungen' } }); }
    if (pf === 'api/bp/bauherren/freigeben') { const ct = q.headers()['content-type'] || '', body = q.postDataBuffer() || Buffer.from('');
      const b = ct.startsWith('multipart') ? JSON.parse(/name="json"\r\n\r\n([^\r]*)/.exec(body.toString('latin1'))[1]) : JSON.parse(body.toString());
      S.frei.push({ ...b, multipart: ct.startsWith('multipart'), pdf: body.includes('%PDF-1.4 Plan') }); return J({ ok: true, schluessel: 'x', bereich_aus: !S.B[b.art] }); }
    if (pf === 'api/antraege') return J({ antraege: [], projekte: [], haupt: {} });
    if (/(^|\/)api\//.test(pf)) return J(/katalog|liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  const warte = async (fn, n = 60) => { for (let i = 0; i < n && !fn(); i++) await p.waitForTimeout(50); };
  try {
    await p.goto('http://portal.test/bauantrag');
    await p.waitForFunction(() => window.BPHead && BPHead.bauherrProjekt && BPHead.ready, null, { timeout: 20000 });
    await p.evaluate(() => BPHead.ready);
    pruef(await p.evaluate(() => BPHead.bauherrAn()), 'bauherrAn() erkennt das eingeschaltete Portal nicht');
    await p.evaluate(() => BPHead.bauherrProjekt(7, 'Tierheim'));
    await p.waitForSelector('[data-bhb="kosten"]', { timeout: 5000 });
    let b = await p.evaluate(() => ({ an: [...document.querySelectorAll('[data-bhb]')].filter((x) => x.checked).map((x) => x.dataset.bhb), ein: document.querySelector('.bph-bhn').textContent, link: (document.querySelector('.bph-bhn a') || {}).getAttribute?.('href') }));
    pruef(!b.an.includes('kosten') && b.an.includes('upload') && b.an.length === 7, `Bereiche: ${b.an}`);
    pruef(/Angebot\.pdf/.test(b.ein) && /Von Bauherrschaft/.test(b.ein), `Eingang mit Datei: ${b.ein}`);
    pruef(b.link === 'api/bp/bauherren/datei/e%3A9/0', `Datei-Link: ${b.link}`);
    {   // Einladen: Vorschlag aus dem Projekt füllt die Adresse, frei bleibt möglich (17.11.2026)
            await p.evaluate(() => { const i = document.querySelector('#bhName'); i.value = 'Erika Muster'; i.dispatchEvent(new Event('change', { bubbles: true })); });
      pruef((await p.inputValue('#bhMail')) === 'erika@muster.test', 'Vorschlag füllt die E-Mail-Adresse');
    }
    {   // Startseite im Portal: Ansprechperson wählen, Wochenmail einschalten
      await p.waitForSelector('[data-bhkf="ansprech"]', { timeout: 5000 });
      await p.selectOption('[data-bhkf="ansprech"]', '3'); await warte(() => S.kopf.length);
      await p.waitForSelector('[data-bhkf="mail"]'); await p.click('[data-bhkf="mail"]'); await warte(() => S.kopf.length > 1);
      pruef(JSON.stringify(S.kopf) === JSON.stringify([{ ansprech: '3' }, { mail: 'woche' }]), `Startseite: ${JSON.stringify(S.kopf)}`);
      pruef(await p.evaluate(() => !!document.querySelector('[data-bhtb]') && document.querySelector('[data-bhkf="termine"]').value === 'phasen'), 'Titelbild-Knopf und Termine (Vorgabe: nur Bauphasen) fehlen');
    }
    await p.click('[data-bhb="kosten"]');
    await warte(() => S.posts.length);
    pruef(JSON.stringify(S.posts[0]) === JSON.stringify({ bereiche: { kosten: true } }), `Umschalten schickt ${JSON.stringify(S.posts[0])}`);
    await p.waitForFunction(() => document.querySelector('[data-bhb="kosten"]').checked, null, { timeout: 3000 });
    await p.click('[data-bh="info"]');
    await p.fill('.bph-frage-in', 'Rohbau beginnt am Montag. Bitte Zufahrt freihalten.');
    await p.click('.bph-dlg [data-f="ja"]');
    await p.waitForSelector('.bph-dlg [data-f="ja"]', { timeout: 3000 }); await p.click('.bph-dlg [data-f="ja"]');   // „… freigeben?“
    await warte(() => S.frei.length);
    pruef(S.frei[0] && S.frei[0].art === 'info' && S.frei[0].titel === 'Rohbau beginnt am Montag.' && /Zufahrt/.test(S.frei[0].daten.text) && /^info:/.test(S.frei[0].schluessel), `Information: ${JSON.stringify(S.frei[0])}`);
    await p.click('.modal [data-m="zu"]');
    // Freigeben mit PDF in einen ausgeschalteten Bereich → Nachfrage „einschalten?“
    const fertig = p.evaluate(() => BPHead.bauherrFreigeben({ pid: 7, art: 'plan', titel: 'Grundriss EG', schluessel: 'plan:101', pdf: 'plan.pdf', ohneFrage: true }));
    await warte(() => S.frei.length > 1);
    pruef(S.frei[1] && S.frei[1].multipart && S.frei[1].pdf && S.frei[1].art === 'plan' && !('ohneFrage' in S.frei[1]), `PDF-Freigabe: ${JSON.stringify(S.frei[1])}`);
    await p.waitForSelector('.bph-dlg [data-f="ja"]', { timeout: 3000 });
    pruef(/ausgeschaltet/.test(await p.textContent('.bph-dlg')), 'keine Nachfrage beim ausgeschalteten Bereich');
    await p.click('.bph-dlg [data-f="ja"]');
    await warte(() => S.posts.some((x) => x.bereiche && 'plan' in x.bereiche));
    pruef(S.posts.some((x) => JSON.stringify(x) === JSON.stringify({ bereiche: { plan: true } })), `Einschalten schickt ${JSON.stringify(S.posts)}`);
    pruef(await fertig === true, 'bauherrFreigeben meldet nicht „erledigt“');
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n').slice(0, 3).join(' ')); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await bauherrenPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
