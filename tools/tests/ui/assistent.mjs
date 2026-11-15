// Planungsassistent (bp/assistent.js): derselbe Baustein im Bereich rechts jeder App – Ablauftest im echten Browser mit nachgebildetem Server.
// Geprüft: seite.js hängt den Reiter „Planung“ von selbst an (nur mit Projekt), der Baustein lädt erst beim Öffnen, die Schritte laufen durch,
// die Angaben landen im Projektmodell (PUT /api/bp/modell/<pid>: assistent, typ, geschosse, einheiten, flaeche, baubeginn) und stehen nach dem Neuladen wieder da;
// Angaben aus dem Bauzeitenplan lassen sich übernehmen; kein Fehler in der Konsole.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await assistentPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/assistent.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function assistentPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const SEITE = (pid) => `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/bp/bp.css"><link rel="stylesheet" href="/bp/head.css"><body>
    <div id="work" style="display:grid;margin-bottom:40px"><section>Tabelle</section></div><div id="ohne" style="display:grid"><section>ohne Projektbezug</section></div>
    <script>window.BP_HEAD_BASIS = ['/bp/', '']; window.BPHead = { projektId: () => ${pid} };</script><script src="/bp/seite.js"></script>
    <script>seite(document.getElementById('work'), 'ho', [{ id: 'pdf', titel: 'PDF', mount: (el) => { el.textContent = 'PDF'; } }], { start: 'pdf' });
      seite(document.getElementById('ohne'), 'pe', [{ id: 'kal', titel: 'Kalender', mount: (el) => { el.textContent = 'K'; } }]);</script>`;
  const LINKS = [{ app: 'termine', name: 'Termine', richtung: 'beide', uebernahme: 'uebernahme', zustand: 'lebendig' }, { app: 'kosten', name: 'Kosten', richtung: 'zur_app', uebernahme: 'auto', zustand: 'lebendig' }];
  async function lauf(name, pid, vorschlag, tun) {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 900 } }), p = await ctx.newPage();
    const S = { modell: { typ: '', einheiten: 0, flaeche: 0, bgf: 0, raumhoehe: 0, geschosse: [], raeume: [], bauteile: [], baubeginn: '', assistent: {}, ki: { buero: true, extern: false }, hand: {} }, rev: 0, geaendert: '', puts: [], geladen: [] };
    p.on('pageerror', (e) => fehler.push(`${name}: Fehler im Skript – ${e.message}`));
    await p.route('http://portal.test/**', (r) => {
      const q = r.request(), pf = new URL(q.url()).pathname.replace(/^\//, '');
      if (pf === 'seite') return r.fulfill({ contentType: 'text/html', body: SEITE(pid) });
      if (pf.startsWith('bp/')) { const f = path.join(KASTEN, pf.slice(3)); S.geladen.push(pf.slice(3)); return fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); }
      const antwort = () => ({ modell: S.modell, rev: S.rev, geaendert: S.geaendert, von: 'A', links: LINKS, staende: [], verlauf: [], apps: [] });
      if (pf === 'api/bp/modell/7' && q.method() === 'PUT') { const b = JSON.parse(q.postData()); S.puts.push(b);
        if (b.rev !== S.rev) return r.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'geändert', ...antwort() }) });
        S.modell = b.modell; S.rev++; S.geaendert = '2026-11-15T10:00'; return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort()) }); }
      if (pf === 'api/bp/modell/7') return r.fulfill({ contentType: 'application/json', body: JSON.stringify(antwort()) });
      if (pf === 'api/bp/modell/7/hinweise') return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ id: 1, app: 'kosten', titel: 'x' }]) });
      if (pf === 'api/bp/modell/7/vorschlag') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ felder: [], assistent: vorschlag || {} }) });
      return r.fulfill({ status: 404, body: '' });
    });
    try { await p.goto('http://portal.test/seite'); await p.waitForSelector('#work > .sr-r'); await tun(p, S); }
    catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n').slice(0, 3).join(' ') + ' – Schritt: ' + await schritt(p).catch(() => '?')); }
    await ctx.close();
  }
  const schritt = (p) => p.evaluate(() => (document.querySelector('#work .pa') || { dataset: {} }).dataset.paSchritt || '');
  const gespeichert = async (p, S, n) => { for (let i = 0; i < 60 && S.puts.length < n; i++) await p.waitForTimeout(50); await p.waitForTimeout(80); };

  await lauf('Durchlauf', 7, null, async (p, S) => {
    const tabs = await p.evaluate(() => [...document.querySelectorAll('#work .sr-tab')].map((t) => t.textContent));
    pruef(tabs.join('|') === 'PDF|Planung', `Reiter „Planung“ hängt nicht hinter den Reitern der App (${tabs.join('|')})`);
    pruef(!(await p.$('#ohne .sr-tab[data-srt="planung"]')), 'Reiter „Planung“ auch in einem Bereich ohne Projektbezug');
    pruef(!S.geladen.includes('assistent.js') && !S.geladen.includes('plankatalog.js'), 'Assistent oder Katalog werden schon beim Öffnen der App geladen');
    await p.click('#work .sr-tab[data-srt="planung"]'); await p.waitForSelector('#work .pa[data-pa-schritt]');
    pruef(await schritt(p) === 'plaene', 'leeres Modell beginnt nicht mit „Pläne einlesen“');
    await p.click('#work .pa-nav .btn.primary'); pruef(await schritt(p) === 'type', '„Überspringen“ führt nicht zu „Was wird gebaut?“');
    await p.click('#work [data-pat="neubau_mfh"]'); pruef(await schritt(p) === 'eck', 'nach der Wahl des Typs folgt nicht „Größe“');
    await p.fill('#work [data-pac="floors"]', '3'); await p.dispatchEvent('#work [data-pac="floors"]', 'change');
    await p.fill('#work [data-pac="area"]', '640'); await p.dispatchEvent('#work [data-pac="area"]', 'change');
    const zeilen = await p.evaluate(() => [...document.querySelectorAll('#work .pa-t tr td:first-child')].map((t) => t.textContent));
    pruef(zeilen.includes('EG') && zeilen.includes('2.OG'), `Geschossliste folgt der Zahl der Geschosse nicht (${zeilen.join(',')})`);
    await p.fill('#work [data-pag="EG"][data-f="flaeche"]', '210'); await p.dispatchEvent('#work [data-pag="EG"][data-f="flaeche"]', 'change');
    await p.click('#work .pa-nav .btn.primary'); pruef(await schritt(p) === 'bau', 'nach „Größe“ folgt nicht „Bauweise“');
    const gruppen = await p.evaluate(() => document.querySelectorAll('#work .pa-gr').length); pruef(gruppen >= 5, `Bauweise zeigt zu wenige Auswahlgruppen (${gruppen})`);
    await p.click('#work [data-pach="dachform"][data-v="flach"]');
    pruef(await p.evaluate(() => document.querySelector('#work [data-pach="dachform"][data-v="flach"]').classList.contains('on')), 'gewählte Bauweise ist nicht markiert');
    await p.click('#work .pa-nav .btn.primary'); pruef(await schritt(p) === 'dg', 'nach „Bauweise“ folgt nicht das Dach');
    pruef(!!(await p.$('#work [data-padg="staffel"]')) && !(await p.$('#work [data-padg="aus"]')), 'Flachdach: Auswahl über dem obersten Geschoss passt nicht (Staffelgeschoss statt ausgebautem Dach)');
    await p.click('#work [data-padg="staffel"]');
    await p.click('#work .pa-nav .btn.primary'); pruef(await schritt(p) === 'lst', 'nach dem Dach folgen nicht die Leistungen');
    pruef(await p.evaluate(() => document.querySelectorAll('#work .pa-app .pa-z').length) > 3, 'Leistungen: keine Zahlen je Abschnitt');
    await p.click('#work .pa-nav .btn.primary'); await p.fill('#work [data-pam="baubeginn"]', '2027-03-01'); await p.dispatchEvent('#work [data-pam="baubeginn"]', 'change');
    await p.click('#work .pa-nav .btn.primary'); pruef(await schritt(p) === 'fertig', 'letzter Schritt fehlt');
    const apps = await p.evaluate(() => [...document.querySelectorAll('#work .pa-app b')].map((b) => b.textContent).join('|') + ' rot=' + document.querySelectorAll('#work .pa-app .pa-z.rot').length);
    pruef(apps === 'Termine|Kosten rot=1', `„Was daraus entsteht“ zeigt die Linien nicht (${apps})`);
    const linie = await p.evaluate(() => [...document.querySelectorAll('#work .pa-app i')].map((x) => x.textContent).join('|'));
    pruef(linie === '⇄ in beide Richtungen · mit Übernahme|→ vom Modell in die App · automatisch', `Linien falsch beschrieben (${linie})`);
    await gespeichert(p, S, 1); await p.waitForTimeout(700);
    const m = S.modell, a = m.assistent || {};
    pruef(S.puts.length >= 1 && S.puts.length <= 8, `Speichern: ${S.puts.length} Aufrufe (erwartet wenige, gesammelt)`);
    pruef(S.puts.every((b, i) => b.rev === i), 'Speichern schickt nicht den gelesenen Änderungszähler mit');
    pruef(a.type === 'neubau_mfh' && a.floors === 3 && a.area === 640 && a.dg === 'staffel' && a.choice && a.choice.dachform === 'flach', `Angaben des Assistenten stehen nicht im Modell (${JSON.stringify(a).slice(0, 160)})`);
    pruef(m.typ === 'neubau_mfh' && m.flaeche === 640 && m.einheiten === a.units && m.baubeginn === '2027-03-01', `abgeleitete Felder fehlen (typ ${m.typ}, Fläche ${m.flaeche}, Baubeginn ${m.baubeginn})`);
    const g = (m.geschosse || []).map((x) => x.name).join(','); pruef(/EG,1\.OG,2\.OG,Staffelgeschoss$/.test(g), `Geschosse im Modell: ${g}`);
    pruef(((m.geschosse || []).find((x) => x.name === 'EG') || {}).flaeche === 210, 'Fläche des EG ging beim Weiterarbeiten verloren');
    await p.reload(); await p.waitForSelector('#work .pa[data-pa-schritt]');   // Reiter „Planung“ ist gemerkt
    pruef(await schritt(p) === 'fertig', `nach dem Neuladen steht der Assistent nicht am selben Schritt (${await schritt(p)})`);
  });
  await lauf('Übernehmen', 7, { type: 'neubau_efh', floors: 2, units: 1, area: 150, dg: 'aus', choice: {}, flTw: {} }, async (p, S) => {
    await p.click('#work .sr-tab[data-srt="planung"]'); await p.waitForSelector('#work [data-pa="vor"]');
    await p.click('#work [data-pa="vor"]'); await gespeichert(p, S, 1);
    pruef(S.modell.typ === 'neubau_efh' && (S.modell.geschosse || []).map((x) => x.name).join(',') === 'EG,1.OG,DG', `Angaben aus dem Bauzeitenplan nicht übernommen (${S.modell.typ}, ${(S.modell.geschosse || []).map((x) => x.name)})`);
  });
  await lauf('ohne Projekt', 'null', null, async (p) => { pruef(!(await p.$('#work .sr-tab[data-srt="planung"]')), 'Reiter „Planung“ erscheint ohne gewähltes Projekt'); });
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await assistentPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
