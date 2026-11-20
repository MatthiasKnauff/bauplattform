// Rückgängig fest oben links (undo.js + befehle.js, beschlossen am 15.11.2026) – Ablauftest im echten Browser, ohne Server.
// Geprüft: mit Befehlsleiste ist „Rückgängig“ die erste Gruppe (Zurück · Wieder · ▾ n), grau solange nichts da ist; kein schwebendes Dock mehr;
// Zurück/Wieder arbeiten, der Verlauf klappt unter dem Knopf auf und nimmt bis zu einem Schritt zurück; ohne Befehlsleiste steht die schmale
// Zeile unter der Kopfleiste; Seiten mit eigenem Stapel (bpUndoEigen) werden von denselben Knöpfen bedient; Leisten in Dialogen bekommen die Gruppe nicht.
//
// Aufgerufen aus oberflaeche.mjs:  const fehler = await rueckgaengigPruefen(browser, repoWurzel)   – allein: node tools/tests/ui/rueckgaengig.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

export async function rueckgaengigPruefen(browser, repo) {
  const KASTEN = path.join(repo, 'shared/bpcore/head');
  const SRV = []; let PK = 6, NID = 40;
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const SEITE = (mit) => `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/bp/head.css"><body>
    <div class="bph" style="height:48px">Kopfleiste <button class="bph-hlp">?</button></div><div id="bfl"></div><div class="modal"><div id="dlg"></div></div><p id="inhalt">Inhalt</p>
    <script src="/bp/undo.js"></script><script src="/bp/befehle.js"></script>
    <script>window.LOG = []; ${mit ? `befehle(document.getElementById('bfl'), [{ titel: 'Position', knoepfe: [{ t: 'Neu', fn: () => {} }] }, { titel: 'Neu', knoepfe: [{ t: 'LV', ic: '<path d="M6 3h8"/>', fn: () => {} }] }]); befehle(document.getElementById('dlg'), [{ titel: 'Im Dialog', knoepfe: [{ t: 'X', fn: () => {} }] }]);` : ''}</script>`;
  async function lauf(name, mit, tun) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 800 } }), p = await ctx.newPage();
    p.on('pageerror', (e) => fehler.push(`${name}: Fehler im Skript – ${e.message}`));
    await p.route('http://portal.test/**', (r) => { const pf = new URL(r.request().url()).pathname.replace(/^\//, '');
      if (pf === 'seite') return r.fulfill({ contentType: 'text/html', body: SEITE(mit) });
      if (pf.startsWith('api/')) { const q = r.request(), b = q.postData() || ''; SRV.push(`${q.method()} ${pf}${b && !b.startsWith('--') ? ' ' + b : ''}`);   // kleiner Server für „Wieder“
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify(q.method() === 'DELETE' ? { ok: true, papierkorb: ++PK } : pf === 'api/neu' ? { id: ++NID } : { ok: true }) }); }
      const f = path.join(KASTEN, pf.slice(3)); return pf.startsWith('bp/') && fs.existsSync(f) ? r.fulfill({ contentType: f.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) }) : r.fulfill({ status: 404, body: '' }); });
    try { await p.goto('http://portal.test/seite'); await tun(p); } catch (e) { fehler.push(`${name}: bricht ab – ` + String(e.message).split('\n').slice(0, 3).join(' ')); }
    await ctx.close();
  }
  const stand = (p, wo) => p.evaluate((wo) => { const q = (u) => document.querySelector(`${wo} [data-u="${u}"]`); return { eins: q('eins') && !q('eins').disabled, redo: q('redo') && !q('redo').disabled, liste: q('liste') && !q('liste').disabled, n: q('liste') ? q('liste').textContent.replace(/\D/g, '') : '', dock: !!document.querySelector('.bp-undo:not(.bp-undo-oben)') }; }, wo);
  const schritt = (p, t) => p.evaluate((t) => { rueckgaengig(t, async () => { LOG.push('rück:' + t); }, 10000, async () => { LOG.push('wieder:' + t); }); }, t);

  await lauf('mit Befehlsleiste', true, async (p) => {
    const g = await p.evaluate(() => ({ erste: document.querySelector('#bfl .bf > .bf-g').className, titel: document.querySelector('#bfl .bf-undo .bf-gt').textContent, dlg: !!document.querySelector('#dlg .bf-undo') }));
    pruef(/bf-undo/.test(g.erste) && g.titel === 'Rückgängig', `„Rückgängig“ ist nicht die erste Gruppe der Befehlsleiste (${g.erste})`);
    pruef(!g.dlg, 'Befehlsleiste in einem Dialog hat die Gruppe „Rückgängig“ bekommen');
    pruef(await p.evaluate(() => { const G = [...document.querySelectorAll('#bfl .bf > .bf-g')]; return G[1] && G[1].classList.contains('bf-neu') && /Neu/.test(G[1].textContent); }), 'Gruppe „Neu“ steht nicht gleich hinter Rückgängig');
    let s = await stand(p, '#bfl'); pruef(!s.eins && !s.redo && !s.liste && s.n === '0', `ohne Schritte nicht grau (${JSON.stringify(s)})`);
    await schritt(p, 'A'); s = await stand(p, '#bfl');
    pruef(s.eins && !s.redo && s.n === '1' && !s.dock, `nach einem Schritt: ${JSON.stringify(s)} (Zurück an, Zahl 1, kein schwebendes Dock)`);
    await schritt(p, 'B'); await schritt(p, 'C');
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 1);
    s = await stand(p, '#bfl'); pruef((await p.evaluate(() => LOG.join(','))) === 'rück:C' && s.redo && s.n === '2', `Zurück nimmt nicht den jüngsten Schritt zurück (${await p.evaluate(() => LOG.join(','))}, ${JSON.stringify(s)})`);
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.length === 2);
    pruef((await p.evaluate(() => LOG[1])) === 'wieder:C' && (await stand(p, '#bfl')).n === '3', 'Wieder holt den Schritt nicht zurück');
    await p.click('#bfl [data-u="liste"]'); await p.waitForSelector('.bp-undo-oben [data-u="bis"]');
    const l = await p.evaluate(() => { const a = document.querySelector('#bfl [data-u="liste"]').getBoundingClientRect(), b = document.querySelector('.bp-undo-oben').getBoundingClientRect(); return { n: document.querySelectorAll('.bp-undo-oben [data-u="bis"]').length, unter: b.top >= a.bottom && Math.abs(b.left - a.left) < 40 }; });
    pruef(l.n === 3 && l.unter, `Verlauf: ${l.n} Schritte, unter dem Knopf: ${l.unter}`);
    await p.click('.bp-undo-oben [data-u="bis"][data-i="1"]'); await p.waitForFunction(() => LOG.length === 4);
    pruef((await p.evaluate(() => LOG.slice(2).join(','))) === 'rück:C,rück:B' && (await stand(p, '#bfl')).n === '1' && !(await p.$('.bp-undo-oben')), 'Verlauf nimmt nicht bis zum gewählten Schritt zurück');
    await schritt(p, 'D'); await p.click('#bfl [data-u="liste"]'); await p.waitForSelector('.bp-undo-oben'); await p.click('#inhalt');
    pruef(!(await p.$('.bp-undo-oben')), 'Verlauf klappt beim Klick daneben nicht zu');
    await p.waitForTimeout(1400); pruef(!(await p.$('.bp-undo-zeile, .bph-uk')), 'Knöpfe in der Kopfleiste erscheinen, obwohl es eine Befehlsleiste gibt');
    // Seite mit eigenem Stapel (wie Bauzeitenplan, Baukosten): dieselben Knöpfe, der jüngere Schritt zuerst
    await p.evaluate(() => { window.EIG = 2; window.bpUndoEigen = { n: () => EIG, los: () => { EIG--; LOG.push('eigen'); }, text: () => 'Plan', t: () => Date.now() + 1000 }; bpUndo.zeichnen(); });
    pruef((await stand(p, '#bfl')).n === '4', 'eigener Stapel der Seite zählt nicht mit');
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG[LOG.length - 1] === 'eigen');
    pruef((await stand(p, '#bfl')).n === '3', 'Zurück bedient den eigenen Stapel der Seite nicht');
    // Tastatur: Strg+Z zurück, Strg+Umschalt+Z und Strg+Y wieder – auch mit Fokus auf einem Häkchen; im Textfeld gehört Strg+Z dem Browser
    await p.evaluate(() => { LOG.length = 0; window.bpUndoEigen = null; document.body.insertAdjacentHTML('beforeend', '<input type="checkbox" id="hk"><input id="tx" value="abc">'); });
    await schritt(p, 'K'); await p.focus('#hk'); await p.keyboard.press('Control+z'); await p.waitForFunction(() => LOG.length === 1);
    await p.keyboard.press('Control+Shift+Z'); await p.waitForFunction(() => LOG.length === 2);
    await p.keyboard.press('Control+z'); await p.waitForFunction(() => LOG.length === 3);
    await p.keyboard.press('Control+y'); await p.waitForFunction(() => LOG.length === 4);
    pruef((await p.evaluate(() => LOG.join(','))) === 'rück:K,wieder:K,rück:K,wieder:K', `Tastatur: ${await p.evaluate(() => LOG.join(','))} (Strg+Z / Strg+Umschalt+Z / Strg+Y)`);
    await p.focus('#tx'); await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
    pruef((await p.evaluate(() => LOG.length)) === 4, 'Strg+Z im Textfeld nimmt eine Änderung der Seite zurück statt den Text im Feld');
    // 16.11.2026: Seite mit eigenem Wiederholen (wie die Ausschreibung) – ein gewöhnlicher Schritt mit „wieder“ ließ sich dort nicht wiederholen
    await p.evaluate(() => { LOG.length = 0; window.RR = []; window.bpRedo = { kann: () => RR.length > 0, los: () => { RR.pop(); LOG.push('seite-wieder'); bpUndo.push('LV', () => { RR.push(1); LOG.push('seite-rück'); }); } };
      bpUndo.push('LV', () => { RR.push(1); LOG.push('seite-rück'); }); });
    await schritt(p, 'S');
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 1);
    pruef((await stand(p, '#bfl')).redo, 'mit eigenem Wiederholen der Seite: „Wieder“ bleibt grau nach einem gewöhnlichen Schritt');
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.length === 2);
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 3);
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 4);
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.length === 5);
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.length === 6);
    pruef((await p.evaluate(() => LOG.join(','))) === 'rück:S,wieder:S,rück:S,seite-rück,seite-wieder,wieder:S', `gemischt zurück und wieder in der richtigen Reihenfolge: ${await p.evaluate(() => LOG.join(','))}`);
    await p.evaluate(() => { window.bpRedo = null; });
  });
  // 19.11.2026: „Wieder“ für jeden Schritt – die Anfragen der Änderung gehen noch einmal hinaus, danach neu(); Papierkorb-Nummer folgt
  await lauf('Wieder mit Anfragen', true, async (p) => {
    await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="aend">ändern</button><button id="loesch">löschen</button><button id="hoch">hochladen</button><button id="anlegen">anlegen</button>');
      const j = (m, u, b) => fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
      document.getElementById('aend').onclick = async () => { await j('PUT', '/api/sache/1', { wert: 2 }); rueckgaengig('Wert 2', () => j('PUT', '/api/sache/1', { wert: 1 }), { neu: () => LOG.push('neu') }); };
      document.getElementById('loesch').onclick = async () => { const r = await j('DELETE', '/api/sache/1'); rueckgaengig('gelöscht', () => j('POST', `/api/bp/papierkorb/${r.papierkorb}/zurueck`), { neu: () => LOG.push('neu') }); };
      document.getElementById('anlegen').onclick = async () => { const r = await j('POST', '/api/neu', { name: 'x' }); await j('PUT', `/api/neu/${r.id}/text`, { t: 1 }); rueckgaengig('angelegt', () => j('DELETE', `/api/neu/${r.id}`), { neu: () => LOG.push('neu') }); };
      document.getElementById('hoch').onclick = async () => { const f = new FormData(); f.append('a', 'b'); await fetch('/api/datei', { method: 'POST', body: f }); rueckgaengig('hochgeladen', () => j('DELETE', '/api/datei'), { neu: () => {} }); }; });
    await p.click('#aend'); await p.waitForFunction(() => document.querySelector('#bfl [data-u="eins"]:not([disabled])'));
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => document.querySelector('#bfl [data-u="redo"]:not([disabled])'));
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.includes('neu'));
    pruef(SRV.join(' | ') === 'PUT api/sache/1 {"wert":2} | PUT api/sache/1 {"wert":1} | PUT api/sache/1 {"wert":2}', `Wieder schickt die Änderung nicht noch einmal: ${SRV.join(' | ')}`);
    SRV.length = 0; await p.click('#loesch'); await p.waitForFunction(() => document.querySelector('#bfl [data-u="eins"]:not([disabled])'));
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => document.querySelector('#bfl [data-u="redo"]:not([disabled])'));
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.filter((x) => x === 'neu').length === 2);
    await p.click('#bfl [data-u="eins"]'); await p.waitForTimeout(300);
    pruef(SRV.join(' | ') === 'DELETE api/sache/1 | POST api/bp/papierkorb/7/zurueck | DELETE api/sache/1 | POST api/bp/papierkorb/8/zurueck', `Papierkorb nach Wiederholen: ${SRV.join(' | ')}`);
    SRV.length = 0; await p.click('#anlegen'); await p.waitForTimeout(150);
    await p.click('#bfl [data-u="eins"]'); await p.waitForFunction(() => document.querySelector('#bfl [data-u="redo"]:not([disabled])'));
    await p.click('#bfl [data-u="redo"]'); await p.waitForFunction(() => LOG.filter((x) => x === 'neu').length === 3);
    await p.click('#bfl [data-u="eins"]'); await p.waitForTimeout(300);
    pruef(SRV.join(' | ') === 'POST api/neu {"name":"x"} | PUT api/neu/41/text {"t":1} | DELETE api/neu/41 | POST api/neu {"name":"x"} | PUT api/neu/42/text {"t":1} | DELETE api/neu/42', `neu Angelegtes nach Wiederholen: ${SRV.join(' | ')}`);
    await p.click('#hoch'); await p.waitForTimeout(200); await p.click('#bfl [data-u="eins"]'); await p.waitForTimeout(300);
    pruef(!(await stand(p, '#bfl')).redo, 'Hochladen (FormData) gilt als wiederholbar');
  });
  await lauf('ohne Befehlsleiste', false, async (p) => {
    // 20.11.2026: keine eigene Zeile unter der Kopfleiste mehr – ohne Befehlsleiste und ohne Platz im Inhalt stehen ↶ ↷ klein IN der Kopfleiste
    const oben0 = await p.evaluate(() => document.querySelector('.bph').getBoundingClientRect().bottom);
    pruef(!(await p.$('.bph-uk')), 'Knöpfe stehen schon, bevor die App fertig geladen ist');
    await p.waitForSelector('.bph .bph-uk', { timeout: 4000 });
    const z = await p.evaluate(() => { const k = document.querySelector('.bph').getBoundingClientRect(), z = document.querySelector('.bph-uk').getBoundingClientRect(), n = document.querySelector('.bph').nextElementSibling;
      return { drin: z.top >= k.top && z.bottom <= k.bottom + 1, kopf: k.bottom, zeile: !!document.querySelector('.bp-undo-zeile'), t: [...document.querySelectorAll('.bph-uk .bf-t, .bph-uk [data-u="liste"]')].every((x) => !x.offsetParent), nach: n ? n.className : '' }; });
    pruef(z.drin && !z.zeile && z.t && Math.abs(z.kopf - oben0) < 1, `↶ ↷ nicht in der Kopfleiste, eigene Zeile da oder die Kopfleiste wächst (${JSON.stringify(z)})`);
    let s = await stand(p, '.bph-uk'); pruef(!s.eins && !s.redo, 'Knöpfe ohne Schritte nicht grau');
    await schritt(p, 'Kennwert geändert'); s = await stand(p, '.bph-uk');
    pruef(s.eins && !s.dock && /Kennwert geändert/.test(await p.evaluate(() => document.querySelector('.bph-uk [data-u="eins"]').title)), 'Knopf nennt den letzten Schritt nicht');
    await p.click('.bph-uk [data-u="eins"]'); await p.waitForFunction(() => LOG.length === 1);
    pruef(Math.abs((await p.evaluate(() => document.querySelector('.bph').getBoundingClientRect().bottom)) - oben0) < 1, 'Kopfleiste ändert ihre Höhe (etwas springt)');
  });
  return fehler;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const f = await rueckgaengigPruefen(b, path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
  await b.close(); console.log(f.length ? f.join('\n') : 'ok'); process.exit(f.length ? 1 : 0);
}
