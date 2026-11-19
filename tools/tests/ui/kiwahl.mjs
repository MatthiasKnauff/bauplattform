// KI nur in den Einstellungen wählen (18.11.2026): keine KI-Auswahl in der Kopfleiste, keine Auswahl an der Stelle, an der eine KI gebraucht wird.
// BPHead.kiFragen fragt nur noch „Mit KI lesen?“ mit der eingestellten KI (Link zu den Einstellungen, „Nicht mehr fragen“);
// passt die eingestellte KI nicht (z. B. liest keine Bilder), nimmt sie die KI im Büro; ohne passende KI: Hinweis, kein Dialog.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await kiwahlPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/kiwahl.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function kiwahlPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const KI = { choice: 'claude', providers: [{ key: 'intern', label: 'Intern', ok: true }, { key: 'ollama', label: 'Ollama (im Büro)', ok: true, bild: true }, { key: 'claude', label: 'Claude', ok: true, bild: false, paid: true }] };
  let STUFEN = { buero: true, extern: true, grund: {} };
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), p = await ctx.newPage(), put = [];
  p.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await p.route('http://portal.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\//, ''), J = (o) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(o) });
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'portal.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf === 'api/bp/ki/stufen') return J(STUFEN);   // KI-Schieber (kischieber.js) und ⚙ → Persönlich → KI: was die Verwaltung erlaubt
    if (pf === 'api/bp/ki') { if (r.request().method() === 'PUT') put.push(r.request().postData()); return J(KI); }
    if (pf === 'api/me') return J({ ok: true, id: 1, name: 'admin', vorname: 'A', role: 'admin', admin: true, look: {} });
    if (pf === 'api/platform') return J({ apps: [], projekte: [] });
    if (/(^|\/)api\//.test(pf)) return J(/liste|kontakte|neuigkeit|projekte|verlauf|fehler/.test(pf) ? [] : {});
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await p.goto('http://portal.test/'); await p.waitForSelector('.bph-who', { timeout: 10000 }); await p.waitForTimeout(300);
    pruef(await p.evaluate(() => !document.querySelector('.bph [data-ki], .bph-ki, .bph-kim')), 'Kopfleiste zeigt noch eine KI-Auswahl');
    const frage = (o) => p.evaluate((o) => { window._k = undefined; BPHead.kiFragen(o).then((k) => { window._k = k; }); }, o);
    const dlg = () => p.evaluate(() => { const d = document.querySelector('.bph-dlg[aria-label="Mit KI lesen"]'); return d ? { radios: d.querySelectorAll('input[type=radio]').length, text: d.textContent } : null; });
    await frage({ text: 'Text lesen' }); await p.waitForTimeout(100); let d = await dlg();
    pruef(d && d.radios === 0, `„Mit KI lesen?“ ohne Auswahlliste erwartet (${d ? d.radios + ' Auswahlpunkte' : 'kein Dialog'})`);
    pruef(d && /KI: Claude/.test(d.text) && /in den Einstellungen ändern/.test(d.text), 'Dialog nennt die eingestellte KI (Claude) mit Link zu den Einstellungen nicht');
    await p.click('[data-kok]'); await p.waitForTimeout(100);
    pruef(await p.evaluate(() => window._k) === 'ollama', 'Startstellung „KI im Büro“ (Vorgabe, KS-A1): Mit KI lesen liefert nicht die KI im Büro');
    await p.evaluate(() => { BPHead.kiVorgabe = 'extern'; try { localStorage.removeItem('bp.ki.lesen'); } catch { /* egal */ } });   // ⚙ → Persönlich → KI: Startstellung „externe KI“
    await frage({ text: 'Text lesen' }); await p.waitForTimeout(300); await p.click('[data-kok]'); await p.waitForTimeout(100);
    pruef(await p.evaluate(() => window._k) === 'claude', 'Startstellung „externe KI“: Mit KI lesen liefert nicht die eingestellte externe KI (Claude)');
    pruef(!put.length, 'die Frage darf die eingestellte KI nicht ändern');
    await frage({ text: 'Scan', bild: true }); await p.waitForTimeout(100); d = await dlg();
    pruef(d && /KI: Ollama/.test(d.text), 'Bild: eingestellte KI liest keine Bilder → KI im Büro erwartet');
    await p.click('[data-kx]'); await p.waitForTimeout(100);
    pruef(await p.evaluate(() => window._k) === null, '„Nein, danke“ liefert nicht null');
    await p.evaluate(() => { BPHead.providers = BPHead.providers.filter((x) => x.key === 'intern'); });
    await frage({ text: 'ohne' }); await p.waitForTimeout(100);
    pruef(!(await dlg()) && await p.evaluate(() => window._k) === null, 'ohne eingestellte KI: kein Dialog, Ergebnis null');
    // ⚙ → Persönlich → KI (19.11.2026): was die Verwaltung nicht erlaubt, ist auch hier ausgegraut – mit Grund
    STUFEN = { buero: true, extern: false, grund: { extern: 'Externe KI ist in der Verwaltung nicht erlaubt' } };
    await p.evaluate(() => { BPHead.providers = [{ key: 'ollama', label: 'Ollama', ok: true }, { key: 'claude', label: 'Claude', ok: true, paid: true }]; const h = document.createElement('div'); h.id = 'kiIch'; document.body.appendChild(h); BPHead.einstIch(h, 'ki'); });
    await p.waitForSelector('#kiIch [data-kiv="extern"]', { timeout: 5000 });
    const ich = await p.evaluate(() => ({ ext: document.querySelector('#kiIch [data-kiv="extern"]').disabled, grund: document.querySelector('#kiIch [data-kiv="extern"]').title, bu: document.querySelector('#kiIch [data-kiv="buero"]').disabled, radio: [...document.querySelectorAll('#kiIch [name=bphKiE]')].every((r) => r.disabled) }));
    pruef(ich.ext && /Verwaltung/.test(ich.grund) && !ich.bu && ich.radio, 'Persönlich → KI: nicht erlaubte Stufe ausgegraut – ' + JSON.stringify(ich));
  } catch (e) { fehler.push('bricht ab – ' + String(e.message).split('\n')[0]); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await kiwahlPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')); await b.close();
  console.log(f.length ? 'FEHLER:\n' + f.join('\n') : 'KI-Wahl: ok'); process.exit(f.length ? 1 : 0);
}
