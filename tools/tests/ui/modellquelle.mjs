// Quelle „Bauteile“ der Ausschreibung (21.11.2026, Mock „Gebäudemodell in der Kopierquelle“: A1 B1 C2 D3 F1; ava-modellquelle.js).
// Die Ausschreibung läuft mit ihren echten Skripten; der Server ist nachgebildet (ein Projekt, ein LV mit einer Position aus dem Modell).
// Geprüft: Reiter „Baudaten“ (früher Kopierquelle) · „Bauteile“ · „Planung“ in dieser Reihenfolge, nur EIN Reiter „Bauteile“;
// Baum Kostengruppe › Bauteil › Positionen, „in diesem LV“; ganzes Bauteil übernehmen legt nur die fehlende Position ab (mit Schlüssel mod),
// Kette in der LV-Zeile, Klick löst (POST …/modell/los); Modell geändert (mod.alt) → genau ein Abgleich beim Öffnen.
// Aufgerufen aus oberflaeche.mjs – allein: node tools/tests/ui/modellquelle.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function modellquellePruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head'), STAT = path.join(repo, 'plattform/static');
  const BK = /BAUKASTEN = \(([^)]*)\)/.exec(fs.readFileSync(path.join(repo, 'shared/bpcore/head.py'), 'utf8'))[1].match(/"[^"]+"/g).map((s) => s.slice(1, -1));
  const baukasten = 'void 0;\n' + BK.map((f) => fs.readFileSync(path.join(KASTEN, f), 'utf8')).join('\n;\n');
  const P = (i, kurz, ep) => ({ mod: `331|w|k:A1|h#${i}`, mod_h: 'h' + i, typ: 'pos', art: 'N', kurz, lang: kurz + ' liefern und herstellen', menge: 85.7, einheit: 'm²', kg: '331', ep_s: ep, quelle: 'Gebäudemodell: Außenwand – KS + WDVS 16', lb: 'Mauerarbeiten' });
  const Q = { planstand: 'Baukasten 21.11.2026', rev: 7, linie: 'lebendig', im: { '331|w|k:A1|h#0': ['LV 01'] },
    bauteile: [{ id: '331|w|k:A1|h', name: 'Außenwand – KS + WDVS 16', teil: 'Hauptgebäude', kg: '331', kgname: '330 Außenwände', menge: 85.7, einheit: 'm²', aufbau: 'KS + WDVS 16', pos: [P(0, 'Kalksandstein-Mauerwerk 17,5 cm', 92), P(1, 'WDVS EPS 035, 16 cm', 118)] }] };
  const calc = { schaetzung: 1, ohne_schaetzung: 0, angebote: [], auftrag: 0, nachtraege: { beauftragt: 0, angemeldet: 0, abgelehnt: 0 }, aufmass: {}, leistung: 0, rechnungen: [], nicht_gezahlt: 0, abgerechnet: 0, sicherheit: { einbehalten: 0, freigegeben: 0, offen: 0 } };
  const LV = { id: 1, project_id: 1, projekt: 'Test', bk_id: null, nr: '01', name: 'Rohbau', gewerk: 'Rohbauarbeiten', status: 'entwurf', archived: false, rev: 1, updated: '', updated_by: '', lv_weg: null,
    data: { items: [{ ...P(0, 'Kalksandstein-Mauerwerk 17,5 cm', 92), id: 'a', oz: '01.0010' }, { id: 'b', typ: 'pos', art: 'N', oz: '01.0020', kurz: 'Sturz Stahlbeton', lang: '', menge: 6, einheit: 'St', ep_s: 80 }, { id: 'c', typ: 'pos', art: 'N', oz: '01.0030', kurz: 'Innentür T1', lang: '', menge: 4, einheit: 'St', ep_s: 400, tl: 'T1|innen|88,5x201', quelle: 'Türliste: T1' }], meta: {} },
    vergabe: {}, angebote: [], aufmass: [], rechnungen: [], calc, bilder: {}, dokumente: [], buergschaften: [], mod: { linie: 'lebendig', alt: true } };
  const S = { puts: [], los: [], abgleich: 0, quelle: 0 };
  const antwort = (u, m, body) => {
    const p = u.pathname.replace(/^\/ava\//, ''), q = u.searchParams;
    if (p === 'api/me') return { id: 1, name: 'admin', role: 'admin', admin: true, look: {} };
    if (p === 'api/platform') return { apps: [], user: { name: 'admin', role: 'admin' }, projekte: [{ id: 1, name: 'Test' }] };
    if (p === 'api/projekte') return [{ id: 1, name: 'Test', archived: false }];
    if (p === 'api/projekt/1/modellquelle') { S.quelle++; return Q; }
    if (p === 'api/lv/1/modell/abgleich') { S.abgleich++; LV.mod = { linie: 'lebendig', alt: false }; return { ...LV, mod_stat: { auto: 0, offen: 0, weg: 0 } }; }
    if (p === 'api/lv/1/modell/los') { S.los.push(body); LV.data.items.find((x) => x.id === body.pos).mod_los = !!body.los; LV.rev++; return LV; }
    const liste = [{ id: 1, project_id: 1, nr: '01', name: 'Rohbau', gewerk: 'Rohbauarbeiten', status: 'entwurf', archived: false, updated: '', n_pos: 2, n_el: 3, n_angebote: 0 }];
    if (p === 'api/lv') return q.get('id') ? liste.filter((x) => x.id === +q.get('id')) : liste;
    if (p === 'api/lv/1') { if (m === 'PUT') { S.puts.push(body); if (body && body.data) LV.data = { ...LV.data, items: body.data.items }; LV.rev++; return { rev: LV.rev, calc, vergabe: {}, status: LV.status, name: LV.name, nr: LV.nr, gewerk: LV.gewerk, archived: false, data: LV.data }; } return LV; }
    if (/vergabedok$/.test(p)) return { status: {}, arten: {}, dokumente: [] };
    return /versionen|kontakte|katalog$|eingang|fehler|neuigkeit|baukosten/.test(p) ? [] : {};
  };
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } }), pg = await ctx.newPage(), fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  pg.on('pageerror', (e) => fehler.push('JavaScript-Fehler: ' + String(e.message || e).split('\n')[0]));
  await pg.route('http://ava.test/**', (r) => {
    const u = new URL(r.request().url()), pf = u.pathname.replace(/^\/ava\//, '');
    if (pf === '') return r.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(STAT, 'ava.html'), 'utf8') });
    if (pf === 'bp/baukasten.js') return r.fulfill({ contentType: 'text/javascript', body: baukasten });
    const f = pf.startsWith('bp/') ? path.join(KASTEN, pf.slice(3)) : pf.startsWith('static/') ? path.join(STAT, pf.slice(7)) : null;
    if (f) return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' });
    if (pf.startsWith('api/')) { let b = null; try { b = JSON.parse(r.request().postData() || 'null'); } catch { /* egal */ } return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort(u, r.request().method(), b)) }); }
    return r.fulfill({ status: 404, body: '' });
  });
  try {
    await pg.addInitScript(() => { window.bpPlanungPid = () => 1; try { localStorage.setItem('ava.mobilAus', '1'); } catch { /* egal */ } });
    await pg.goto('http://ava.test/ava/');
    await pg.waitForSelector('#view table', { timeout: 20000 });
    await pg.evaluate(() => document.querySelector('[data-tab="lv"]').click()); await pg.waitForSelector('#view table.lv.baum tr[data-i]', { timeout: 20000 });
    await pg.waitForTimeout(600);
    pruef(S.abgleich === 1, `Modell geändert (mod.alt): genau ein Abgleich beim Öffnen – ${S.abgleich}`);
    const R = await pg.evaluate(() => [...document.querySelectorAll('.sr-r [role="tab"], .sr-r .sr-t button')].map((b) => b.textContent.trim()).filter(Boolean));
    const iB = R.indexOf('Baudaten'), iT = R.indexOf('Bauteile'), iP = R.indexOf('Planung');
    pruef(iB >= 0 && iT === iB + 1 && iP === iT + 1 && R.filter((t) => t === 'Bauteile').length === 1 && !R.includes('Kopierquelle'), `Reiter Baudaten · Bauteile · Planung, „Bauteile“ nur einmal: ${R.join(' | ')}`);
    pruef(await pg.evaluate(() => document.querySelectorAll('table.lv i.lv-mod[data-modkette]').length === 1 && !document.querySelector('table.lv i.lv-mod.los[data-modkette]')), 'Kette an der Position aus dem Modell (C2), nicht an der freien');
    pruef(await pg.evaluate(() => { const k = document.querySelectorAll('table.lv i.lv-mod[data-tlkette]'); return k.length === 1 && k[0].textContent === '🔗' && !document.querySelector('table.lv .lv-tl'); }), 'Türliste: dieselbe Kette statt ⇄ (21.11.2026)');
    await pg.evaluate(() => seiteReiter('lv', 'bauteile')); await pg.waitForSelector('.mq tr[data-mq]', { timeout: 8000 });
    const b = await pg.evaluate(() => ({ g: [...document.querySelectorAll('.mq tr.ti b')].map((x) => x.textContent), bt: [...document.querySelectorAll('.mq tr.mq-b')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
      p: [...document.querySelectorAll('.mq tr.mq-p')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), kopf: document.querySelector('.mq .qu-h').textContent }));
    pruef(b.g.join() === '330 Außenwände' && /Außenwand – KS \+ WDVS 16/.test(b.bt[0] || '') && b.p.length === 2 && /in diesem LV/.test(b.p[0]) && !/in /.test(b.p[1].replace(/in diesem/, '')) && /Baukasten 21\.11\.2026/.test(b.kopf), `Baum der Quelle (A1): ${JSON.stringify(b).slice(0, 400)}`);
    if (process.env.BILD) await pg.screenshot({ path: process.env.BILD });
    // B1: ganzes Bauteil wählen und übernehmen – nur die Position, die noch nicht hier liegt, mit Schlüssel und Fingerabdruck
    await pg.click('.mq tr.mq-b td:nth-child(2)'); await pg.click('.mq [data-mqa="ein"]');
    await pg.waitForFunction(() => document.querySelectorAll('table.lv i.lv-mod[data-modkette]').length === 2, null, { timeout: 5000 });
    await pg.evaluate(() => flush()); await pg.waitForTimeout(200);
    const put = S.puts[S.puts.length - 1], neu = put && put.data.items.filter((x) => x.mod);
    pruef(neu && neu.length === 2 && neu.some((x) => x.mod.endsWith('#1') && x.mod_h === 'h1' && x.kurz === 'WDVS EPS 035, 16 cm' && x.ep_s === 118), `Übernehmen speichert die neue Position mit mod/mod_h: ${JSON.stringify(neu)}`);
    // C2: Klick auf die Kette löst
    await pg.evaluate(() => document.querySelector('table.lv tr[data-i="0"] i.lv-mod[data-modkette]').click()); await pg.waitForFunction(() => !!document.querySelector('table.lv i.lv-mod.los[data-modkette]'), null, { timeout: 5000 });
    pruef(S.los.length === 1 && S.los[0].pos === 'a' && S.los[0].los === true, `Kette: lösen über den Server – ${JSON.stringify(S.los)}`);
    pruef(S.abgleich === 1, `kein weiterer Abgleich ohne Änderung im Modell – ${S.abgleich}`);
  } catch (e) { fehler.push('Prüfung bricht ab – ' + String(e.message).split('\n').slice(0, 2).join(' / ')); }
  await ctx.close();
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await modellquellePruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
