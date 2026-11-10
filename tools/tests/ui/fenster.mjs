// Fenster (modalBox in shared/bpcore/head/bp.js): OK und Abbrechen überall gleich – Enter in einem Feld = OK (nicht in Tabellenzeilen),
// Esc = Abbrechen, Abbrechen nach einer Änderung fragt „Änderungen verwerfen?“. Geprüft an einem Muster-Fenster im echten Browser.
// Aufgerufen aus oberflaeche.mjs:  const fehler = await fensterPruefen(page, inhaltVonBpJs)
export async function fensterPruefen(p, bpJs) {
  const fehler = [], pruef = (ok, t) => { if (!ok) fehler.push(t); };
  const HTML = `<!doctype html><meta charset="utf-8"><body><script>${bpJs}</script><script>
    window.LOG = []; window.ANT = true; window.bpFrage = () => { LOG.push('frage'); return Promise.resolve(ANT); };
    window.auf = () => modalBox('<h3>T</h3><input id="a"><table><tr><td><input id="t"></td></tr></table><div class="acts"><button class="btn" data-m="x">Abbrechen</button><button class="btn pri" data-m="ok">OK</button></div>',
      (m, bg, close) => { LOG.push(m); close(); });</script>`;
  await p.route('http://fenster.test/**', (r) => r.fulfill({ contentType: 'text/html', body: HTML }));
  await p.goto('http://fenster.test/');
  const L = () => p.evaluate(() => { const l = LOG.join(',') + '|' + (document.querySelector('.modal-bg') ? 'offen' : 'zu'); LOG.length = 0; return l; });
  await p.evaluate(() => auf()); await p.focus('#a'); await p.keyboard.press('Enter'); let s = await L();
  pruef(s === 'ok|zu', `Enter im Feld soll OK sein (ok|zu), ist ${s}`);
  await p.evaluate(() => auf()); await p.focus('#t'); await p.keyboard.press('Enter'); s = await L();
  pruef(s === '|offen', `Enter in einer Tabellenzeile soll das Fenster nicht schließen, ist ${s}`);
  await p.keyboard.press('Escape'); s = await L(); pruef(s === 'x|zu', `Esc ohne Änderung soll schließen (x|zu), ist ${s}`);
  await p.evaluate(() => { auf(); window.ANT = false; }); await p.fill('#a', 'x'); await p.click('[data-m="x"]'); await p.waitForTimeout(50); s = await L();
  pruef(s === 'frage|offen', `Abbrechen nach Änderung soll fragen und bei „Nein“ offen bleiben, ist ${s}`);
  await p.evaluate(() => { window.ANT = true; }); await p.keyboard.press('Escape'); await p.waitForTimeout(50); s = await L();
  pruef(s === 'frage,x|zu', `Esc nach Änderung soll fragen und bei „Ja“ schließen, ist ${s}`);
  return fehler;
}
