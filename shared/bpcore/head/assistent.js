/* Planungsassistent – derselbe Baustein in jeder App (Etappe 2b des Projektmodells, 15.11.2026).
   Schritt für Schritt: Was wird gebaut? · Größe · Bauweise · Dach · Leistungen · Baubeginn · Was daraus entsteht.
   Die Angaben stehen im Projektmodell (Kern: bpcore/modell.py, /api/bp/modell/<pid>) – nicht in der App. Fragen und Katalog
   kommen aus dem Baukasten (bp/plankatalog.js, bp/plankern.js); hier ist nur die Oberfläche.

   bpAssistent.mount(el, pid)  – füllt ein Feld (Bereich rechts, freies Fenster, eigenes Browserfenster)
   bpAssistent.reiter()        – Reiter für seite(): hängt seite.js von selbst an (Reiter „Planung“)
   Wird erst bei Bedarf geladen (seite.js), kostet beim Öffnen einer App nichts. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = (u, m, b) => fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok && r.status !== 409) throw new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); j.konflikt = r.status === 409; return j; });
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const zahl = (v) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  let kern = null;
  function kernLaden() {   // Katalog und Fragen: im Bauzeitenplan schon da, sonst jetzt holen
    if (window.PlanKern) return Promise.resolve();
    if (kern) return kern;
    const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''];
    const hol = (n) => new Promise((ok, nein) => { const s = document.createElement('script'); s.src = b + n + v; s.onload = ok; s.onerror = () => nein(new Error('Der Katalog konnte nicht geladen werden.')); document.head.appendChild(s); });
    return (kern = (window.CATALOG ? Promise.resolve() : hol('plankatalog.js')).then(() => hol('plankern.js')).then(() => (window.bpBauart ? null : hol('bauart.js'))).catch((e) => { kern = null; throw e; }));
  }
  const STIL = `.pa{display:flex;flex-direction:column;gap:.7rem;padding:.8rem .9rem 1.2rem;font-size:.92rem}
.pa h3{margin:.1rem 0 .2rem;font-size:1.05rem}.pa-n{font-size:.78rem;opacity:.65}
.pa-dots{display:flex;gap:5px;flex-wrap:wrap}.pa-dots button{width:22px;height:8px;border-radius:var(--rk,4px);border:0;background:var(--line,#d5d9de);cursor:pointer;padding:0}
.pa-dots button.ok{background:var(--ok,#3d9a5f)}.pa-dots button.cur{background:var(--pri,#2f6fb3)}
.pa-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.45rem}
.pa-o{display:flex;gap:.5rem;align-items:flex-start;text-align:left;padding:.55rem .65rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,6px);background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer}
.pa-o.on{border-color:var(--pri,#2f6fb3);box-shadow:inset 0 0 0 1px var(--pri,#2f6fb3)}.pa-o small{display:block;opacity:.65;font-size:.8rem;margin-top:2px}.pa-o .ic{font-size:1.25rem;line-height:1}
.pa-f{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.4rem .7rem;align-items:center}
.pa-f input,.pa-t input,.pa-f select{font:inherit;padding:.3rem .4rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,4px);background:var(--card,#fff);color:inherit;width:100%;max-width:11rem;box-sizing:border-box}
.pa-f span.e{opacity:.65;font-size:.82rem;margin-left:.4rem}.pa-f div{display:flex;align-items:center}
.pa-t{border-collapse:collapse}.pa-t th,.pa-t td{text-align:left;padding:.2rem .5rem .2rem 0;font-weight:normal}.pa-t th{font-size:.78rem;opacity:.65}.pa-t input{max-width:7rem}
.pa-gr{margin:.2rem 0 .5rem}.pa-gr>b{display:block;font-size:.84rem;margin-bottom:.25rem}
.pa-nav{display:flex;gap:.5rem;align-items:center;margin-top:.3rem}.pa-nav span{flex:1}
.pa-h{font-size:.84rem;opacity:.75;line-height:1.4}.pa-fl{font-size:.8rem;border-top:1px solid var(--line,#d5d9de);padding-top:.5rem;opacity:.8}
.pa-app{display:grid;grid-template-columns:max-content minmax(0,1fr) max-content;gap:.3rem .7rem;align-items:baseline}.pa-app i{font-style:normal;opacity:.65;font-size:.84rem}
.pa-z{display:inline-block;min-width:1.2em;text-align:center;border-radius:1em;padding:0 .4em;font-size:.78rem;background:var(--line,#d5d9de)}.pa-z.rot{background:var(--err,#c0392b);color:#fff}
.pa-ki{display:flex;gap:1rem;flex-wrap:wrap;font-size:.84rem}.pa-ki label{display:flex;gap:.35rem;align-items:center;cursor:pointer}
.pa-warn{border:1px solid var(--warn,#d9a300);border-radius:var(--rk,6px);padding:.5rem .65rem;font-size:.86rem}`;
  const stil = (doc) => { if (doc.getElementById('pa-stil')) return; const s = doc.createElement('style'); s.id = 'pa-stil'; s.textContent = STIL; doc.head.appendChild(s); };
  // wohin die Angaben eines Schritts fließen (Anzeige unter dem Schritt)
  const FLIESST = { plaene: 'alle Apps', type: 'Termine · Kosten · Ausschreibung · Honorar', eck: 'Kosten · Termine · Bauantrag · Wärmeschutz · Honorar', bau: 'Termine · Kosten · Ausschreibung · Wärmeschutz',
    dg: 'Termine · Kosten · Bauantrag', lst: 'Termine · Ausschreibung', start: 'Termine · Bautagebuch', fertig: '' };
  const SCHRITTE = [['plaene', 'Pläne einlesen (freiwillig)'], ['type', 'Was wird gebaut?'], ['eck', 'Größe des Gebäudes'], ['bau', 'Bauweise'], ['dg', 'Was liegt über dem obersten Geschoss?'],
    ['lst', 'Leistungen'], ['start', 'Wann ist Baubeginn?'], ['fertig', 'Was daraus entsteht']];
  const RICHT = { beide: '⇄ in beide Richtungen', zur_app: '→ vom Modell in die App', zum_modell: '← von der App ins Modell' };

  /* Geschossliste des Modells aus den Angaben: KG · EG · 1.OG … · DG/Staffelgeschoss – Flächen und Höhen bleiben je Name erhalten */
  function geschosse(K, cfg, alt) {
    const { L, dg, kg } = K.levelsOf(K.clone(cfg)), N = [...(kg ? ['KG'] : []), ...L, ...(dg === 'aus' ? ['DG'] : dg === 'staffel' ? ['Staffelgeschoss'] : [])];
    const A = new Map((alt || []).map((g) => [g.name, g]));
    return N.map((n, i) => { const g = A.get(n) || {}; return { id: g.id || 'g' + (i + 1), name: n, flaeche: g.flaeche || 0, hoehe: g.hoehe || 0, bauweise: g.bauweise || '' }; });
  }

  function mount(el, pid) {
    stil(el.ownerDocument);
    const Z = { d: null, m: null, i: 0, t: 0, laeuft: null, fehler: '' };
    el.innerHTML = '<div class="pa"><p class="pa-h">Planungsassistent wird geladen …</p></div>';
    const K = () => window.PlanKern, cfg = () => (Z.m.assistent && Z.m.assistent.type ? Z.m.assistent : null);
    const big = (attr, on, titel, sub, ic) => `<button type="button" class="pa-o${on ? ' on' : ''}" ${attr}>${ic ? `<span class="ic">${ic}</span>` : ''}<span><b>${esc(titel)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
    function ableiten() {   // aus den Angaben des Assistenten die Felder des Modells
      const c = cfg(); if (!c) return;
      c.choice = K().choiceAll(K().clone(c)); c.schritt = Z.i;
      Object.assign(Z.m, { typ: c.type, einheiten: c.units, flaeche: c.area, massnahme: c.choice.massnahme || '', geschosse: geschosse(K(), c, Z.m.geschosse) });
    }
    function speichern() {   // kurz warten, dann einmal schreiben; kommt währenddessen Neues, danach noch einmal
      clearTimeout(Z.t); Z.t = setTimeout(async () => {
        if (Z.laeuft) { await Z.laeuft.catch(() => 0); return speichern(); }
        ableiten();
        Z.laeuft = J('api/bp/modell/' + pid, 'PUT', { modell: Z.m, rev: Z.d.rev }).then((r) => {
          if (r.konflikt) { sag('Jemand anderes hat das Projektmodell inzwischen geändert – der neue Stand ist geladen.', true); Z.d = { ...Z.d, ...r }; Z.m = r.modell; return zeig(); }
          Z.d = r; Z.fehler = ''; const n = el.querySelector('.pa-st'); if (n) n.textContent = 'gespeichert';
        }).catch((e) => { Z.fehler = e.message; sag('Nicht gespeichert: ' + e.message, true); }).finally(() => { Z.laeuft = null; });
      }, 500);
      const n = el.querySelector('.pa-st'); if (n) n.textContent = 'speichert …';
    }
    function schrittHtml(k) {
      const c = cfg(), m = Z.m, C = K().C;
      if (k === 'plaene') return `<p class="pa-h">Hier liest der Assistent später Entwurfspläne ein (IFC, PDF, DXF) und füllt Geschosse, Räume und Flächen vor. <b>Das kommt mit einer späteren Etappe</b> – bis dahin bitte die Angaben in den nächsten Schritten von Hand eintragen.</p>
        ${Z.vor && Z.vor.assistent && Z.vor.assistent.type && !c ? `<div class="pa-warn">Im <b>Bauzeitenplan</b> dieses Projekts stehen schon Angaben (${esc((K().PROF[Z.vor.assistent.type] || {}).n || Z.vor.assistent.type)}, ${Z.vor.assistent.floors} Geschosse, ${Z.vor.assistent.units} Einheiten).<div class="pa-nav"><button type="button" class="btn primary" data-pa="vor">Angaben übernehmen</button></div></div>` : ''}`;
      if (k === 'type' && window.bpBauart) return bpBauart.html(c && c.type, { kachel: 'pa-o' });
      if (k === 'type') return `<div class="pa-g">${C.profiles.filter((p) => !p.hidden).map((p) => big(`data-pat="${esc(p.k)}"`, c && c.type === p.k, p.n, p.desc, p.ic)).join('')}</div>`;
      if (!c) return '<p class="pa-h">Bitte zuerst wählen, was gebaut wird.</p><div class="pa-nav"><button type="button" class="btn" data-pago="1">Zu „Was wird gebaut?“</button></div>';
      if (k === 'eck') return `<div class="pa-f"><label>Wohn-/Nutzfläche</label><div><input type="number" min="0" max="1000000" data-pac="area" value="${esc(c.area)}"><span class="e">m²</span></div>
        <label>Einheiten</label><div><input type="number" min="1" max="500" data-pac="units" value="${esc(c.units)}"><span class="e">Wohnungen / Abschnitte</span></div>
        <label>Geschosse</label><div><input type="number" min="1" max="30" data-pac="floors" value="${esc(c.floors || 1)}"><span class="e">Vollgeschosse (ohne Keller und Dach)</span></div>
        <label>Bruttogrundfläche</label><div><input type="number" min="0" data-pam="bgf" value="${esc(m.bgf || '')}"><span class="e">m² (falls bekannt)</span></div>
        <label>Raumhöhe</label><div><input type="number" min="0" max="20" step="0.01" data-pam="raumhoehe" value="${esc(m.raumhoehe || '')}"><span class="e">m (licht, üblich)</span></div></div>
        <table class="pa-t"><tr><th>Geschoss</th><th>Fläche m²</th><th>Geschosshöhe m</th></tr>${geschosse(K(), c, m.geschosse).map((g) => `<tr><td>${esc(g.name)}</td><td><input type="number" min="0" data-pag="${esc(g.name)}" data-f="flaeche" value="${esc(g.flaeche || '')}"></td><td><input type="number" min="0" max="20" step="0.01" data-pag="${esc(g.name)}" data-f="hoehe" value="${esc(g.hoehe || '')}"></td></tr>`).join('')}</table>
        <p class="pa-h">Flächen und Höhen je Geschoss sind freiwillig – je mehr hier steht, desto genauer werden Kosten und Mengen.</p>`;
      if (k === 'bau') { const G = K().choiceGroups(c).slice().sort((a, b) => (b.k === 'massnahme') - (a.k === 'massnahme') || (b.k === 'erweiterung') - (a.k === 'erweiterung'));
        const misch = G.some((g) => g.k === 'tragwerk' && g.val === 'misch'), F = misch ? K().levelsOf(K().clone(c)).L.map((l, i) => [l, K().floorTw(K().clone(c), K().levelsOf(K().clone(c)).L)[i]]) : [];
        return (G.map((g) => `<div class="pa-gr"><b>${esc(g.n)}</b><div class="pa-g">${g.opts.map((o) => big(`data-pach="${esc(g.k)}" data-v="${esc(o.k)}"`, o.k === g.val, o.n)).join('')}</div></div>`).join('') || '<p class="pa-h">Für diese Maßnahme gibt es keine Auswahl zur Bauweise.</p>')
          + (F.length > 1 ? `<div class="pa-gr"><b>Bauweise je Geschoss</b><div class="pa-f">${F.map(([l, t]) => `<label>${esc(l)}</label><div><select data-pafl="${esc(l)}">${K().FLTW.map(([v, n]) => `<option value="${v}"${v === t ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`).join('')}</div></div>` : ''); }
      if (k === 'dg') { const O = K().dgOpts(c), cur = O.some(([v]) => v === c.dg) ? c.dg : 'kalt'; return `<div class="pa-g">${O.map(([v, l]) => big(`data-padg="${v}"`, v === cur, l)).join('')}</div><p class="pa-h">Gebäude: <b>${esc(K().buildingDesc(c))}</b></p>`; }
      if (k === 'lst') { const ids = c.sel && c.sel.length ? K().baseSel(c.sel) : [...K().recFor(K().clone(c))], PH = C.phases, n = {};
        K().ctx(K().clone(c)); ids.forEach((id) => { const it = K().B(id); if (it) n[it.ph] = (n[it.ph] || 0) + 1; });
        return `<p class="pa-h">Aus den Angaben ergeben sich <b>${ids.length} Leistungen</b>${c.sel && c.sel.length ? ' (Auswahl aus dem Bauzeitenplan)' : ' (Empfehlung des Katalogs)'}:</p>
          <div class="pa-app">${PH.filter((p) => n[p.k]).map((p) => `<b>${esc(p.n)}</b><i></i><span class="pa-z">${n[p.k]}</span>`).join('')}</div>
          <p class="pa-h">Einzelne Leistungen ab- oder zuwählen und Dauern anpassen: vorerst im <b>Bauzeitenplan</b> (Reiter „Assistent“). Die Auswahl zieht mit einer der nächsten Etappen hierher.</p>`; }
      if (k === 'start') return `<div class="pa-f"><label>Baubeginn</label><div><input type="date" data-pam="baubeginn" value="${esc(m.baubeginn || '')}"></div></div><p class="pa-h">Noch offen? Dann leer lassen – der Bauzeitenplan rechnet ab seinem eigenen Starttermin.</p>`;
      const L = Z.d.links || [], offen = {}; (Z.hin || []).forEach((h) => { offen[h.app] = (offen[h.app] || 0) + 1; });
      return `<p class="pa-h"><b>${esc(K().defName(c))}</b> · ${esc(K().buildingDesc(c))}${c.area ? ` · ${esc(c.area)} m²` : ''}${m.baubeginn ? ` · Baubeginn ${esc(m.baubeginn.split('-').reverse().join('.'))}` : ''}</p>
        <div class="pa-app">${L.map((l) => `<b>${esc(l.name)}</b><i>${l.zustand === 'getrennt' ? 'getrennt' : l.zustand === 'fest' ? 'eingefroren' + (l.stand_name ? ' – ' + esc(l.stand_name) : '') : esc(RICHT[l.richtung] || l.richtung) + (l.uebernahme === 'auto' ? ' · automatisch' : ' · mit Übernahme')}</i><span class="pa-z${offen[l.app] ? ' rot' : ''}" title="${offen[l.app] ? 'Hinweise warten auf Übernahme' : 'nichts offen'}">${offen[l.app] || 0}</span>`).join('')}</div>
        <p class="pa-h">Die Angaben stehen jetzt im <b>Projektmodell</b>. Dass Kosten, Ausschreibung und Termine daraus Vorschläge ableiten, kommt mit der nächsten Etappe – dann erscheinen hier die Hinweise zum Übernehmen (rote Zahl).</p>
        <div class="pa-ki"><label><input type="checkbox" data-paki="buero"${m.ki.buero ? ' checked' : ''}> KI im Büro arbeitet mit (nur Vorschläge)</label><label><input type="checkbox" data-paki="extern"${m.ki.extern ? ' checked' : ''}> externe KI zulassen</label></div>`;
    }
    function zeig() {
      const S = SCHRITTE; Z.i = Math.max(0, Math.min(S.length - 1, Z.i));
      const [k, t] = S[Z.i], fertig = (j) => j < Z.i && (j === 0 || !!cfg());
      el.innerHTML = `<div class="pa" data-pa-schritt="${k}"><div class="pa-dots">${S.map((y, j) => `<button type="button" class="${j === Z.i ? 'cur' : fertig(j) ? 'ok' : ''}" data-pago="${j}" title="${esc(y[1])}" aria-label="${esc(y[1])}"></button>`).join('')}</div>
        <div><div class="pa-n">Schritt ${Z.i + 1} von ${S.length} · <span class="pa-st">${Z.fehler ? 'nicht gespeichert' : Z.d.geaendert ? 'gespeichert' : 'noch leer'}</span></div><h3>${esc(t)}</h3></div>
        ${schrittHtml(k)}
        <div class="pa-nav"><button type="button" class="btn" data-pago="${Z.i - 1}"${Z.i ? '' : ' disabled'}>Zurück</button><span></span>${Z.i < S.length - 1 ? `<button type="button" class="btn primary" data-pago="${Z.i + 1}">${k === 'plaene' ? 'Überspringen' : 'Weiter'}</button>` : ''}</div>
        ${FLIESST[k] ? `<div class="pa-fl">Diese Angaben fließen in: <b>${esc(FLIESST[k])}</b></div>` : ''}</div>`;
    }
    const setz = (fn) => { const c = cfg(); if (!c) return; fn(c); ableiten(); speichern(); };
    el.onclick = (e) => {
      const kw = Z.m && window.bpBauart && bpBauart.klick(e.target, cfg() && cfg().type);
      if (kw) {   // Gebäude, Maßnahmen, Bereiche, Denkmal: Typ setzen, Größe behalten, Bauweise nach den Vorgaben
        const alt = cfg(), neu = K().grund(bpBauart.typ(kw)); delete neu.start;
        if (alt && alt.type === neu.type) return;
        const vg = alt && K().kombiTeile(alt.type);   // gleiches Gebäude: Größe behalten
        if (alt && (!vg || vg.geb === kw.geb)) Object.assign(neu, { area: alt.area || neu.area, units: alt.units || neu.units, floors: alt.floors || neu.floors });
        Z.m.assistent = neu; ableiten(); speichern(); return zeig();
      }
      const b = e.target.closest('button'); if (!b || !Z.m) return;
      if (b.dataset.pago != null) { Z.i = +b.dataset.pago; if (cfg()) { cfg().schritt = Z.i; } return zeig(); }
      if (b.dataset.pat) { const alt = cfg(), neu = K().grund(b.dataset.pat);   // anderer Typ: Größe behalten, Bauweise nach den Vorgaben des Typs
        delete neu.start; if (alt) Object.assign(neu, { area: alt.area || neu.area, units: alt.units || neu.units, floors: alt.floors || neu.floors });
        if (alt && alt.type === neu.type) { Z.i++; return zeig(); }
        Z.m.assistent = neu; Z.i++; ableiten(); speichern(); return zeig(); }
      if (b.dataset.pach) { setz((c) => { c.choice = { ...K().choiceAll(K().clone(c)), [b.dataset.pach]: b.dataset.v }; if (b.dataset.pach === 'tragwerk' && b.dataset.v !== 'misch') c.flTw = {}; if (c.sel) delete c.sel; }); return zeig(); }
      if (b.dataset.padg) { setz((c) => { c.dg = b.dataset.padg; }); return zeig(); }
      if (b.dataset.pa === 'vor') { Z.m.assistent = Z.vor.assistent; Z.i = 1; ableiten(); speichern(); return zeig(); }
    };
    el.onchange = (e) => {
      const n = e.target; if (!Z.m) return;
      if (n.dataset.pac) { setz((c) => { c[n.dataset.pac] = n.dataset.pac === 'area' ? Math.max(0, zahl(n.value)) : Math.max(1, Math.round(zahl(n.value)) || 1); }); if (n.dataset.pac === 'floors') zeig(); return; }
      if (n.dataset.pam) { Z.m[n.dataset.pam] = n.type === 'date' ? n.value : Math.max(0, zahl(n.value)); return speichern(); }
      if (n.dataset.pag) { ableiten(); const g = Z.m.geschosse.find((x) => x.name === n.dataset.pag); if (g) { g[n.dataset.f] = Math.max(0, zahl(n.value)); speichern(); } return; }
      if (n.dataset.pafl) { setz((c) => { const L = K().levelsOf(K().clone(c)).L, F = K().floorTw(K().clone(c), L); const ft = L.map((l, i) => [l, l === n.dataset.pafl ? n.value : F[i]]), eins = new Set(ft.map((x) => x[1])).size === 1;   // alle gleich → diese Bauweise statt „gemischt“
        c.flTw = eins ? {} : Object.fromEntries(ft); if (eins) c.choice = { ...c.choice, tragwerk: ft[0][1] }; }); return zeig(); }
      if (n.dataset.paki) { Z.m.ki[n.dataset.paki] = n.checked; return speichern(); }
    };
    Promise.all([kernLaden(), J('api/bp/modell/' + pid), J('api/bp/modell/' + pid + '/hinweise').catch(() => [])]).then(async ([, d, h]) => {
      Z.d = d; Z.m = d.modell; Z.hin = Array.isArray(h) ? h : (h && h.hinweise) || [];
      if (!cfg()) Z.vor = await J('api/bp/modell/' + pid + '/vorschlag').catch(() => null);   // noch leer: gibt es Angaben im Bauzeitenplan?
      Z.i = cfg() ? Math.min(SCHRITTE.length - 1, cfg().schritt || 1) : 0;
      zeig();
    }).catch((e) => { el.innerHTML = `<div class="pa"><div class="pa-warn">Der Planungsassistent konnte nicht geladen werden: ${esc(e.message)}</div></div>`; });
  }
  window.bpAssistent = { mount, SCHRITTE };
})();
