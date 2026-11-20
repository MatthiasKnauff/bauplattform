"""Seite hinter dem Link in jeder Benachrichtigungs-Mail (/bp/mail/<Schlüssel>, 20.11.2026): ohne Anmeldung, eigenständig, klein.
Drei Dinge: alles aus · alles aus bis … · nach Apps. Liest und schreibt nur über POST auf dieselbe Adresse (mailaus.routen)."""

SEITE = """<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Mails der Bauplattform</title>
<style>
:root{--bg:#f4f5f7;--card:#fff;--fg:#1d2430;--mut:#667085;--line:#d9dee6;--y:#2c63c9;--ok:#2e7d32;--warn:#b26a00;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#1c1d21;--card:#27292e;--fg:#eceef2;--mut:#a3a9b5;--line:#3a3d45;--y:#8ab4ff;--ok:#7bd88f;--warn:#f0b455;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;padding:20px 16px 48px}
main{max-width:560px;margin:0 auto;display:grid;gap:14px}h1{font-size:1.3rem;margin:0}h2{font-size:1rem;margin:0}p{margin:0}.mut{color:var(--mut);font-size:.9rem}
.k{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px 16px;display:grid;gap:10px}
button{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:8px;padding:.5rem .9rem;cursor:pointer;min-height:44px}
button.p{background:var(--y);border-color:var(--y);color:#fff}button:focus-visible,input:focus-visible{outline:2px solid var(--y);outline-offset:2px}
.z{display:flex;gap:8px;flex-wrap:wrap;align-items:center}input[type=date]{font:inherit;padding:.45rem .5rem;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);min-height:44px}
.st{font-weight:600}.st.aus{color:var(--warn)}.st.an{color:var(--ok)}
.g{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--line);cursor:pointer}.g:first-of-type{border-top:0}.g input{width:22px;height:22px;margin-top:2px;flex:none}.g small{display:block;color:var(--mut)}
[hidden]{display:none!important}
</style></head><body><main>
<h1>Mails der Bauplattform</h1>
<p class="mut" id="wer">Einen Moment …</p>
<div class="k" id="fehler" hidden><p id="fehlertext"></p></div>
<div id="inhalt" hidden style="display:grid;gap:14px">
 <div class="k"><h2>Alle Mails</h2><p class="st" id="stand"></p>
  <div class="z"><button type="button" class="p" id="aus">Alle Mails abschalten</button><button type="button" id="an" hidden>Wieder einschalten</button></div></div>
 <div class="k"><h2>Pause</h2><p class="mut">Keine Mails bis einschließlich zu einem Tag, danach kommen sie von selbst wieder.</p>
  <div class="z"><button type="button" data-tage="7">1 Woche</button><button type="button" data-tage="14">2 Wochen</button><button type="button" data-tage="30">1 Monat</button></div>
  <div class="z"><label for="bis">oder bis</label><input type="date" id="bis"><button type="button" id="bisok">Pausieren</button><button type="button" id="bisweg" hidden>Pause beenden</button></div></div>
 <div class="k"><h2>Nach Apps</h2><p class="mut">Mit Haken kommen die Mails, ohne Haken nicht.</p><div id="apps"></div></div>
 <p class="mut">Abgeschaltet werden nur Mails, die die Bauplattform von sich aus schickt. Was zu tun ist, steht weiter unter „Zu tun“ auf der Startseite. Zugangsdaten und Unterlagen, die dir jemand ausdrücklich schickt, kommen weiterhin. Dieser Link gilt nur für dich – bitte nicht weitergeben.</p>
</div></main>
<script>
(() => {
  const $ = (i) => document.getElementById(i), de = (d) => d.split('-').reverse().join('.');
  let S = null;
  async function ruf(b) {
    const r = await fetch(location.pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Das hat nicht geklappt.');
    return d;
  }
  function zeig() {
    $('wer').textContent = 'Einstellungen für ' + S.name;
    $('inhalt').hidden = false;
    const st = $('stand');
    st.className = 'st ' + (S.aus || S.bis || S.alle ? 'aus' : 'an');
    st.textContent = S.alle ? 'Das Büro hat zurzeit alle Benachrichtigungs-Mails abgeschaltet.' : S.aus ? 'Abgeschaltet – du bekommst keine Mails.' : S.bis ? 'Pause bis einschließlich ' + de(S.bis) + '.' : 'Eingeschaltet.';
    $('aus').hidden = S.aus; $('an').hidden = !S.aus; $('bisweg').hidden = !S.bis; $('bis').value = S.bis || '';
    $('bis').min = new Date().toISOString().slice(0, 10);
    const weg = new Set(S.apps);
    $('apps').replaceChildren(...S.gruppen.map((g) => { const l = document.createElement('label'); l.className = 'g';
      const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !weg.has(g.key); i.dataset.app = g.key;
      const t = document.createElement('span'); t.textContent = g.name; const k = document.createElement('small'); k.textContent = g.text; t.appendChild(k);
      l.append(i, t); return l; }));
  }
  async function tu(b) { try { S = await ruf(b); $('fehler').hidden = true; zeig(); } catch (e) { $('fehlertext').textContent = e.message; $('fehler').hidden = false; } }
  const inTagen = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  $('aus').addEventListener('click', () => tu({ aus: true }));
  $('an').addEventListener('click', () => tu({ aus: false }));
  $('bisok').addEventListener('click', () => { if ($('bis').value) tu({ bis: $('bis').value }); else $('bis').focus(); });
  $('bisweg').addEventListener('click', () => tu({ bis: '' }));
  document.addEventListener('click', (e) => { const t = e.target.closest('[data-tage]'); if (t) tu({ bis: inTagen(+t.dataset.tage) }); });
  $('apps').addEventListener('change', () => tu({ apps: [...document.querySelectorAll('[data-app]')].filter((i) => !i.checked).map((i) => i.dataset.app) }));
  tu();
})();
</script></body></html>"""
