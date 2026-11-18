/* Planungsassistent – derselbe Baustein in jeder App (Etappe 2b des Projektmodells, 15.11.2026).
   Zwei Ansichten wie im Bauzeitenplan: Schritt für Schritt (Was wird gebaut? · Größe · Bauweise · Dach · Leistungen · Baubeginn · Was daraus
   entsteht) oder alles auf einer Seite – Angaben oben, darunter die Leistungen zum An- und Abwählen (c.sel).
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
.pa-dots button.ok{background:var(--ok,#3d9a5f)}.pa-dots button.cur{background:var(--y,#2f6fb3)}
.pa-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.45rem}
.pa-o{display:flex;gap:.5rem;align-items:flex-start;text-align:left;padding:.55rem .65rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,6px);background:var(--card,#fff);color:inherit;font:inherit;cursor:pointer}
.pa-o.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3)}.pa-o small{display:block;opacity:.65;font-size:.8rem;margin-top:2px}.pa-o .ic{font-size:1.25rem;line-height:1}
.pa-f{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.4rem .7rem;align-items:center}
.pa-f input,.pa-t input,.pa-f select{font:inherit;padding:.3rem .4rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,4px);background:var(--card,#fff);color:inherit;width:100%;max-width:11rem;box-sizing:border-box}
.pa-f span.e{opacity:.65;font-size:.82rem;margin-left:.4rem}.pa-f div{display:flex;align-items:center}
.pa-t{border-collapse:collapse}.pa-t th,.pa-t td{text-align:left;padding:.2rem .5rem .2rem 0;font-weight:normal}.pa-t th{font-size:.78rem;opacity:.65}.pa-t input{max-width:7rem}
.pa-tl{border:1px solid var(--line,#d5d9de);border-radius:var(--rk,6px);margin:.35rem 0;overflow:hidden}.pa-tl>.k{display:flex;gap:.5rem;align-items:center;padding:.3rem .55rem;background:var(--afb,#e8eef8);font-weight:600}.pa-tl>.k input{font:inherit;font-weight:600;border:0;background:transparent;flex:1;min-width:0;color:inherit}.pa-tl>.k small{font-weight:400;opacity:.7}.pa-tl>.pa-f{padding:.45rem .55rem}
.pa-gr{margin:.2rem 0 .5rem}.pa-gr>b{display:block;font-size:.84rem;margin-bottom:.25rem}
.pa-nav{display:flex;gap:.5rem;align-items:center;margin-top:.3rem}.pa-nav span{flex:1}
.pa-h{font-size:.84rem;opacity:.75;line-height:1.4}.pa-fl{font-size:.8rem;border-top:1px solid var(--line,#d5d9de);padding-top:.5rem;opacity:.8}
.pa-app{width:100%;border-collapse:collapse}.pa-app th{font-size:.74rem;font-weight:600;opacity:.7;text-align:left;padding:.15rem .4rem;border-bottom:1px solid var(--line,#d5d9de)}.pa-app td{padding:.22rem .4rem;vertical-align:baseline}.pa-app .r{text-align:right;white-space:nowrap}
.pa-app tbody tr{cursor:pointer}.pa-app tbody tr:hover{background:var(--hov,rgba(0,0,0,.04))}.pa-app i{font-style:normal;opacity:.65;font-size:.84rem}
.pa-z{display:inline-block;min-width:1.2em;text-align:center;border-radius:1em;padding:0 .4em;font-size:.78rem;background:var(--line,#d5d9de)}.pa-z.rot{background:var(--red,#c62f2a);color:#fff}
.pa-ki{display:grid;gap:.35rem;font-size:.86rem;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;margin-top:.4rem}.pa-ki label{display:flex;gap:.45rem;align-items:flex-start;cursor:pointer}.pa-ki small{display:block;opacity:.7}.pa-ki input{margin-top:.25rem}.pa-aus{opacity:.6;cursor:default}
.pa-um{display:inline-flex;align-self:flex-start;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,6px);overflow:hidden}.pa-um button{border:0;background:none;color:inherit;font:inherit;font-size:.84rem;padding:.3rem .7rem;cursor:pointer}.pa-um button.on{background:var(--y,#2f6fb3);color:var(--on,#fff)}
.pa-sec{border-top:1px solid var(--line,#d5d9de);padding-top:.6rem;display:flex;flex-direction:column;gap:.5rem}.pa-sec h4{margin:0;font-size:.95rem}
.pa-ph{border:1px solid var(--line,#d5d9de);border-radius:var(--rk,6px);padding:.3rem .55rem}.pa-ph summary{display:flex;gap:.5rem;align-items:center;cursor:pointer}.pa-ph summary b{flex:1;font-size:.88rem}
.pa-l{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:.5rem;align-items:baseline;padding:.2rem 0;font-size:.86rem;cursor:pointer}.pa-l i{font-style:normal;opacity:.65;font-size:.78rem;white-space:nowrap}
.pa-eg{display:flex;flex-direction:column;gap:.3rem;border-top:1px dashed var(--line,#d5d9de);padding-top:.45rem}.pa-eg>b{font-size:.82rem;opacity:.8}
.pa-eg .pa-ez{display:flex;gap:.5rem;align-items:baseline;font-size:.86rem}.pa-eg .pa-ez span{flex:1}.pa-x{font:inherit;font-size:.78rem;background:none;border:0;color:var(--red,#c62f2a);cursor:pointer;padding:0;text-decoration:underline}
.pa-ei{display:flex;gap:.4rem;flex-wrap:wrap}.pa-ei input{flex:1 1 12rem;min-width:0;font:inherit;padding:.25rem .4rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,4px);background:var(--card,#fff);color:inherit}.pa-ei input.k{flex:0 0 4.5rem}
.pa-vs{border:1px solid var(--y,#2f6fb3);border-radius:var(--rk,6px);padding:.3rem .55rem;display:flex;gap:.5rem;align-items:baseline;flex-wrap:wrap;font-size:.86rem}.pa-vs span{flex:1 1 14rem}.pa-vs small{opacity:.7}
.pa-q{width:100%;box-sizing:border-box;font:inherit;padding:.35rem .5rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,4px);background:var(--card,#fff);color:inherit}.pa-l[hidden],.pa-ph[hidden]{display:none}
.pa-gm{float:right;text-decoration:none;margin-top:.15rem}.pa-g{cursor:grab;opacity:.45;user-select:none}.pa-l.ziel{box-shadow:0 -2px 0 var(--af,#3b5a8f)}.pa-dz{white-space:nowrap;font-size:.78rem;opacity:.85}.pa-d{width:3.2rem;font:inherit;text-align:right;padding:0 .2rem;border:1px solid var(--line,#d5d9de);border-radius:var(--rk,4px);background:var(--card,#fff);color:inherit}.pa-d.mod{background:color-mix(in srgb,#e8b400 22%,var(--card,#fff))}
.pa-lk{display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;margin:.2rem 0 .5rem;font-size:.84rem}.pa-lk input{width:3.4rem;font:inherit;text-align:right}
.pa-l .pa-eig{font-size:.72rem;border:1px solid var(--line,#d5d9de);border-radius:1em;padding:0 .4em;margin-left:.3rem}
.pa-warn{border:1px solid #b7791f;border-radius:var(--rk,6px);padding:.5rem .65rem;font-size:.86rem}`;
  const stil = (doc) => { if (doc.getElementById('pa-stil')) return; const s = doc.createElement('style'); s.id = 'pa-stil'; s.textContent = STIL; doc.head.appendChild(s); };
  // wohin die Angaben eines Schritts fließen (Anzeige unter dem Schritt)
  const FLIESST = { plaene: 'alle Apps', type: 'Termine · Kosten · Ausschreibung · Honorar', eck: 'Kosten · Termine · Bauantrag · Wärmeschutz · Honorar', bau: 'Termine · Kosten · Ausschreibung · Wärmeschutz',
    dg: 'Termine · Kosten · Bauantrag', lst: 'Termine · Ausschreibung', start: 'Termine · Bautagebuch', fertig: '' };
  const SCHRITTE = [['plaene', 'Aus dem Gebäudemodell'], ['type', 'Was wird gebaut?'], ['eck', 'Größe des Gebäudes'], ['bau', 'Bauweise'], ['dg', 'Was liegt über dem obersten Geschoss?'],
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
    const merk = (k, v) => { try { if (v === undefined) return localStorage.getItem('bp.pa.' + k); localStorage.setItem('bp.pa.' + k, v); } catch { /* ohne Speicher */ } return null; };
    const Z = { d: null, m: null, i: 0, t: 0, laeuft: null, fehler: '', sicht: merk('sicht') === 'alles' ? 'alles' : 'schritt', auf: new Set() };   // sicht: Schritt für Schritt | alles auf einer Seite (wie im Bauzeitenplan)
    el.innerHTML = '<div class="pa"><p class="pa-h">Planungsassistent wird geladen …</p></div>';
    const K = () => window.PlanKern, cfg = () => (Z.m.assistent && Z.m.assistent.type ? Z.m.assistent : null);
    const big = (attr, on, titel, sub, ic) => `<button type="button" class="pa-o${on ? ' on' : ''}" ${attr}>${ic ? `<span class="ic">${ic}</span>` : ''}<span><b>${esc(titel)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
    function ableiten() {   // aus den Angaben des Assistenten die Felder des Modells
      const c = cfg(); if (!c) return;
      c.choice = K().choiceAll(K().clone(c)); c.schritt = Z.i;
      Object.assign(Z.m, { typ: c.type, einheiten: c.units, flaeche: c.area, massnahme: c.choice.massnahme || '', geschosse: geschosse(K(), c, Z.m.geschosse),
        teile: K().teile(K().clone(c)).map((t) => ({ k: t.k, n: t.n, art: t.art, neu: !!t.neu, flaeche: +t.area || 0, geschosse: +t.floors || 1, bauweise: t.tw, keller: !!t.keller, dach: t.dach || '', huelle: t.huelle || {}, ...(t.flTw ? { flTw: t.flTw } : {}) })) });   // für Bauteile und Kosten (modell_hand.py)
    }
    function fertigMachen() {   // W1 (17.11.2026): gespeichert ist schon – Bereich zu, Meldung, was in den Apps wartet
      const H = Z.hin || [], L = Z.d.links || [], nm = (a) => (L.find((l) => l.app === a) || {}).name || a, A = [...new Set(H.map((h) => h.app))];
      sag(H.length ? `Planung gespeichert – ${H.length} Änderung${H.length === 1 ? '' : 'en'} warte${H.length === 1 ? 't' : 'n'} auf Übernahme in ${A.map(nm).join(', ')}.` : 'Planung gespeichert – die Apps sind auf dem Stand.');
      if (window.seiteZuVon) seiteZuVon(el);
    }
    const bauteileLaden = () => (window.bpBauteile ? Promise.resolve() : new Promise((ok, nein) => { const [b, v] = window.BP_HEAD_BASIS || ['/bp/', ''], sc = document.createElement('script'); sc.src = b + 'bauteile.js' + v; sc.onload = ok; sc.onerror = () => nein(new Error('Die Bauteile konnten nicht geladen werden.')); document.head.appendChild(sc); }));
    function speichern() {   // kurz warten, dann einmal schreiben; kommt währenddessen Neues, danach noch einmal
      clearTimeout(Z.t); Z.t = setTimeout(async () => {
        if (Z.laeuft) { await Z.laeuft.catch(() => 0); return speichern(); }
        ableiten();
        Z.laeuft = J('api/bp/modell/' + pid, 'PUT', { modell: Z.m, rev: Z.d.rev }).then((r) => {
          if (r.konflikt) { sag('Jemand anderes hat das Projektmodell inzwischen geändert – der neue Stand ist geladen.', true); Z.d = { ...Z.d, ...r }; Z.m = r.modell; return zeig(); }
          Z.d = r; Z.fehler = ''; const n = el.querySelector('.pa-st'); if (n) n.textContent = 'gespeichert';
          melden();
        }).catch((e) => { Z.fehler = e.message; sag('Nicht gespeichert: ' + e.message, true); }).finally(() => { Z.laeuft = null; });
      }, 500);
      const n = el.querySelector('.pa-st'); if (n) n.textContent = 'speichert …';
    }
    /* Andere Teile der App hören mit (Bauzeitenplan: verknüpfter Plan folgt) – auch aus einem abgedockten Fenster heraus */
    function melden() {
      const ev = () => new CustomEvent('bp:assistent', { detail: { pid, modell: Z.m, links: (Z.d && Z.d.links) || [] } });
      [window, el.ownerDocument.defaultView, window.opener].forEach((w, i, A) => { if (w && A.indexOf(w) === i) { try { w.dispatchEvent(ev()); } catch { /* anderes Fenster zu */ } } });
      const t = cfg() && cfg().type;   // andere Bauart: Vorschläge aus ähnlichen Projekten neu holen
      if (t && t !== Z.lernTyp) { Z.lernTyp = t; J('api/bp/modell/' + pid + '/lernen').then((l) => { if (Array.isArray(l) && (l.length || (Z.lern || []).length)) { Z.lern = l; if (!el.contains(document.activeElement) || !document.activeElement.matches('input')) zeig(); } }).catch(() => {}); }
    }
    /* Werte aus dem Gebäudemodell (gültiger Planstand): Wohnfläche, Geschosse mit Flächen, Fenster, Türen – vorbelegt, änderbar */
    const GNAME = [[/keller|^kg$|untergeschoss|^ug$/i, 'KG'], [/^eg$|erdgeschoss/i, 'EG'], [/dach|^dg$|spitzboden/i, 'DG'], [/(\d+)\.?\s*(og|obergeschoss)/i, (m) => m[1] + '.OG'], [/^og$|obergeschoss/i, '1.OG']];
    const gname = (n) => { for (const [r, t] of GNAME) { const m = r.exec(String(n || '').trim()); if (m) return typeof t === 'function' ? t(m) : t; } return String(n || '').trim(); };
    function ausModell() {
      const B = Z.m && Z.m.bauteilliste, R = (B && B.raeume) || []; if (!R.length) return null;
      const G = {}; R.forEach((r) => { const g = gname(r.geschoss) || 'EG'; G[g] = (G[g] || 0) + (r.flaeche || 0); });
      const voll = Object.keys(G).filter((g) => g === 'EG' || /\.OG$/.test(g));
      const st = (art) => (B.zeilen || []).filter((z) => z.bereich === 'oeffnung' && !z.entfaellt && new RegExp(art).test(z.art || z.name)).reduce((s, z) => s + (z.anzahl || 0), 0);
      return { area: Math.round(R.reduce((s, r) => s + (r.flaeche || 0), 0) * 10) / 10, floors: voll.length || 0, G, fenster: st('Fenster'), tueren: st('Tür'), quelle: B.quelle || {} };
    }
    function ausModellSetzen(c) {   // vorbelegen: Fläche, Geschosse und Geschossflächen
      const A = ausModell(); if (!A || !c) return false;
      if (A.area) c.area = A.area; if (A.floors) c.floors = A.floors;
      ableitenOhneSpeichern(c);
      (Z.m.geschosse || []).forEach((g) => { if (A.G[g.name]) g.flaeche = Math.round(A.G[g.name] * 10) / 10; });
      Z.aus = (A.quelle.name || A.quelle.datei || 'Planstand');   // nur zum Anzeigen (das Modell kennt den Schlüssel nicht)
      return true;
    }
    function ableitenOhneSpeichern(c) { Object.assign(Z.m, { flaeche: c.area, geschosse: geschosse(K(), c, Z.m.geschosse) }); }
    function schrittHtml(k) {
      const c = cfg(), m = Z.m, C = K().C;
      if (k === 'plaene') { const A = ausModell(), gm = ((window.BPHead && BPHead.conf) || {}).apps ? BPHead.conf.apps.find((a) => a.key === 'gebaeudemodell') : null;
        return (A ? `<p class="pa-h">Aus dem <b>Gebäudemodell</b> (${esc(A.quelle.name || A.quelle.datei || 'Planstand')}): <b>${esc(String(A.area).replace('.', ','))} m²</b> in ${Object.keys(A.G).length} Geschossen${A.fenster ? ` · ${A.fenster} Fenster` : ''}${A.tueren ? ` · ${A.tueren} Türen` : ''}.</p>
          <p class="pa-h">Die Werte stehen in den nächsten Schritten schon drin (Fläche, Geschosse, Flächen je Geschoss) – du kannst sie dort ändern.</p>${c ? '<div class="pa-nav"><button type="button" class="btn" data-pa="ausmodell">Werte aus dem Gebäudemodell noch einmal übernehmen</button></div>' : ''}`
          : `<p class="pa-h">Noch kein Plan im Gebäudemodell. Liest du dort einen Plan ein (IFC, DXF oder PDF), füllt der Assistent Fläche, Geschosse und Räume vor.${gm && window.BPHead.appUrl ? ` <a href="${esc(BPHead.appUrl(gm))}/#bauteile">Plan einlesen → Gebäudemodell</a>` : ''} Ohne Plan: die Angaben in den nächsten Schritten von Hand.</p>`) + `
        ${Z.vor && Z.vor.assistent && Z.vor.assistent.type && !c ? `<div class="pa-warn">Im <b>Bauzeitenplan</b> dieses Projekts stehen schon Angaben (${esc((K().PROF[Z.vor.assistent.type] || {}).n || Z.vor.assistent.type)}, ${Z.vor.assistent.floors} Geschosse, ${Z.vor.assistent.units} Einheiten).<div class="pa-nav"><button type="button" class="btn primary" data-pa="vor">Angaben übernehmen</button></div></div>` : ''}`; }
      if (k === 'type' && window.bpBauart) return bpBauart.html(c && c.type, { kachel: 'pa-o' });
      if (k === 'type') return `<div class="pa-g">${C.profiles.filter((p) => !p.hidden).map((p) => big(`data-pat="${esc(p.k)}"`, c && c.type === p.k, p.n, p.desc, p.ic)).join('')}</div>`;
      if (!c) return '<p class="pa-h">Bitte zuerst wählen, was gebaut wird.</p><div class="pa-nav"><button type="button" class="btn" data-pago="1">Zu „Was wird gebaut?“</button></div>';
      if (k === 'eck') { const T0 = K().teile(K().clone(c)), zu = T0.length > 1 ? ` (${esc(T0[0].n)})` : ''; return `<div class="pa-f"><label>Wohn-/Nutzfläche${zu}</label><div><input type="number" min="0" max="1000000" data-pac="area" value="${esc(c.area)}"><span class="e">m²</span></div>
        <label>Einheiten</label><div><input type="number" min="1" max="500" data-pac="units" value="${esc(c.units)}"><span class="e">Wohnungen / Abschnitte</span></div>
        <label>Geschosse${zu}</label><div><input type="number" min="1" max="30" data-pac="floors" value="${esc(c.floors || 1)}"><span class="e">Vollgeschosse (ohne Keller und Dach)</span></div>
        <label>Bruttogrundfläche</label><div><input type="number" min="0" data-pam="bgf" value="${esc(m.bgf || '')}"><span class="e">m² (falls bekannt)</span></div>
        <label>Raumhöhe</label><div><input type="number" min="0" max="20" step="0.01" data-pam="raumhoehe" value="${esc(m.raumhoehe || '')}"><span class="e">m (licht, üblich)</span></div></div>
        <table class="pa-t"><tr><th>Geschoss</th><th>Fläche m²</th><th>Geschosshöhe m</th></tr>${geschosse(K(), c, m.geschosse).map((g) => `<tr><td>${esc(g.name)}</td><td><input type="number" min="0" data-pag="${esc(g.name)}" data-f="flaeche" value="${esc(g.flaeche || '')}"></td><td><input type="number" min="0" max="20" step="0.01" data-pag="${esc(g.name)}" data-f="hoehe" value="${esc(g.hoehe || '')}"></td></tr>`).join('')}</table>
        <p class="pa-h">${Z.aus ? `Vorbelegt aus dem Gebäudemodell (${esc(Z.aus)}) – änderbar. ` : ''}Flächen und Höhen je Geschoss sind freiwillig – je mehr hier steht, desto genauer werden Kosten und Mengen.</p>` + teileHtml(c); }
      if (k === 'bau') { const G = bauGruppen(c).slice().sort((a, b) => (b.k === 'massnahme') - (a.k === 'massnahme') || (b.k === 'erweiterung') - (a.k === 'erweiterung'));
        const misch = G.some((g) => g.k === 'tragwerk' && g.val === 'misch'), F = misch ? K().levelsOf(K().clone(c)).L.map((l, i) => [l, K().floorTw(K().clone(c), K().levelsOf(K().clone(c)).L)[i]]) : [];
        return (G.map((g) => `<div class="pa-gr"><b>${esc(g.n)}</b><div class="pa-g">${g.opts.map((o) => big(`data-pach="${esc(g.k)}" data-v="${esc(o.k)}"`, o.k === g.val, o.n)).join('')}</div></div>`).join('') || '<p class="pa-h">Für diese Maßnahme gibt es keine Auswahl zur Bauweise.</p>')
          + (F.length > 1 ? `<div class="pa-gr"><b>Bauweise je Geschoss</b><div class="pa-f">${F.map(([l, t]) => `<label>${esc(l)}</label><div><select data-pafl="${esc(l)}">${K().FLTW.map(([v, n]) => `<option value="${v}"${v === t ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`).join('')}</div></div>` : '') + jeGeschoss(c); }
      if (k === 'dg') { const O = K().dgOpts(c), cur = O.some(([v]) => v === c.dg) ? c.dg : 'kalt'; return `<div class="pa-g">${O.map(([v, l]) => big(`data-padg="${v}"`, v === cur, l)).join('')}</div><p class="pa-h">Gebäude: <b>${esc(K().buildingDesc(c))}</b></p>`; }
      if (k === 'lst') return lstHtml();
      if (k === 'start') return `<div class="pa-f"><label>Baubeginn</label><div><input type="date" data-pam="baubeginn" value="${esc(m.baubeginn || '')}"></div></div><p class="pa-h">Noch offen? Dann leer lassen – der Bauzeitenplan rechnet ab seinem eigenen Starttermin.</p>` + ergaenzungHtml('start');
      const L = Z.d.links || [], offen = {}; (Z.hin || []).forEach((h) => { offen[h.app] = (offen[h.app] || 0) + 1; });
      return `<p class="pa-h"><b>${esc(K().defName(c))}</b> · ${esc(K().buildingDesc(c))}${c.area ? ` · ${esc(c.area)} m²` : ''}${m.baubeginn ? ` · Baubeginn ${esc(m.baubeginn.split('-').reverse().join('.'))}` : ''}</p>
        <table class="pa-app"><thead><tr><th>App</th><th>wie sie mit dem Modell verbunden ist</th><th class="r" title="Änderungen aus dem Modell, die die App noch übernehmen soll („mit Übernahme“)">wartet auf dich</th></tr></thead><tbody>${L.map((l) => {
          const n = offen[l.app] || 0, weg = l.zustand === 'getrennt';
          return `<tr data-pavk="${esc(l.app)}" title="Verbindung ansehen und ändern (Reiter „Verknüpfungen“)"><td><b>${esc(l.name)}</b></td><td><i>${weg ? 'getrennt' : l.zustand === 'fest' ? 'eingefroren' + (l.stand_name ? ' – ' + esc(l.stand_name) : '') : esc(RICHT[l.richtung] || l.richtung) + (l.uebernahme === 'auto' ? ' · automatisch' : ' · mit Übernahme')}</i></td>
            <td class="r"><span class="pa-z${n ? ' rot' : ''}" title="${n ? n + ' Änderung' + (n === 1 ? '' : 'en') + ' warten auf Übernahme – Klick führt hin' : weg ? 'nicht verbunden' : 'alles übernommen'}">${n || (weg ? '–' : '✓')}</span></td></tr>`; }).join('')}</tbody></table>
        <p class="pa-h">„wartet auf dich“: Änderungen aus dem Modell, die eine App noch übernehmen soll. Rot = so viele warten, ✓ = alles übernommen, – = nicht verbunden. Ein Klick auf eine Zeile öffnet die <b>Verknüpfungen</b> – dort änderst du Richtung und Übernahme.</p>
        ${(window.bpAssistentAktionen ? window.bpAssistentAktionen(m) : []).map((a, i) => `<div class="pa-nav"><button type="button" class="btn${i ? '' : ' primary'}" data-paakt="${i}">${esc(a.text)}</button></div>`).join('')}
        <div class="pa-nav"><button type="button" class="btn" data-pabt>${((m.bauteilliste || {}).zeilen || []).length ? 'Neuen Planstand aus der Planung …' : 'Bauteile aus der Planung anlegen …'}</button><span class="pa-h" style="margin:0">wahlweise mit Vorschlagsmengen und Preisspanne – Grundlage für Kosten und Ausschreibung</span></div>
        <div class="pa-ki"><b>KI für dieses Projekt</b>
          <label><input type="checkbox" data-paki="buero"${m.ki.buero ? ' checked' : ''}><span>KI im Büro hilft mit<small>Die KI auf eurem eigenen Server – nichts verlässt das Büro. Sie wird nur benutzt, wenn du sie fragst: im Reiter „Fragen und Antworten“ und bei „Anweisung …“ im Gebäudemodell (z. B. „alle Fenster im OG Holz-Alu“), wenn die Anweisung ohne sie nicht eindeutig ist. Sie macht nur Vorschläge – übernehmen tust du selbst.</small></span></label>
          <label class="${Z.d.ki_zusatz ? '' : 'pa-aus'}"><input type="checkbox" data-paki="extern"${m.ki.extern && Z.d.ki_zusatz ? ' checked' : ''}${Z.d.ki_zusatz ? '' : ' disabled'}><span>Externe KI als Ergänzung<small>${Z.d.ki_zusatz ? 'Nur auf Knopfdruck, mit Warnung vorher: „externe KI“ im KI-Schieber, „Verfeinern (extern)“ bei den Bauteilen und Anweisungen, die die KI im Büro nicht versteht. Die Angaben gehen anonymisiert hinaus (keine Namen, Adressen, Preise); jede Anfrage steht im Datenschutz-Protokoll.' : 'Die Verwaltung hat externe KI für das Büro ausgeschaltet (Verwaltung → Einstellungen → KI) – damit ist sie in keinem Projekt möglich.'}</small></span></label>
          <span class="pa-h" style="margin:0">Gilt nur für dieses Projekt, jederzeit hier änderbar. Der Assistent selbst rechnet ohne KI.</span></div>`;
    }
    /* Leistungen an- und abwählen (wie die Liste im Bauzeitenplan): gewählt = c.sel, sonst die Empfehlung des Katalogs für diese Angaben */
    const gewaehlt = (c) => new Set(K().baseSel(c.sel && c.sel.length ? c.sel : [...K().recFor(K().clone(c))]));
    /* Ergänzungen (lernen.py): je Abschnitt eigene Ergänzungen; dazu Vorschläge aus ähnlichen Projekten des Büros („1× in Projekt X“) */
    const herkunft = (v) => `${v.n}× in ${v.projekte.length ? esc(v.projekte.join(', ')) + (v.n > v.projekte.length ? ' …' : '') : 'einem Projekt'}`;
    function vorschlagHtml(v) {
      return `<div class="pa-vs"><span>${v.art === 'leistung' ? '<b>Leistung:</b> ' : v.art === 'dauer' ? `<b>Dauer:</b> ${esc(v.daten.d)} AT für ` : ''}${esc(v.text)}${v.art === 'leistung' && v.daten.d ? ` <small>${esc(v.daten.d)} AT${v.daten.gw ? ' · ' + esc(v.daten.gw) : ''}</small>` : ''}<br><small>Vorschlag aus ähnlichen Projekten · ${herkunft(v)}</small></span>
        <button type="button" class="btn sm" data-palv="${esc(v.schluessel)}">Übernehmen</button><button type="button" class="btn sm" data-palx="${esc(v.schluessel)}">Nein</button></div>`;
    }
    function ergaenzungHtml(k, nurListe) {   // nurListe: im Überblick teilen sich zwei Schritte einen Abschnitt – ein Eingabefeld reicht
      const c = cfg(); if (!c) return '';
      const N = ((c.notiz || {})[k]) || [], V = (Z.lern || []).filter((v) => v.art === 'notiz' && v.abschnitt === k);
      if (nurListe && !N.length && !V.length) return '';
      return `<div class="pa-eg" data-pae="${k}"><b>Notizen zu diesem Abschnitt${N.length ? ` (${N.length})` : ''}</b>
        ${N.map((t, i) => `<div class="pa-ez"><span>${esc(t)}</span><button type="button" class="pa-x" data-paex="${k}|${i}">entfernen</button></div>`).join('')}
        ${V.map(vorschlagHtml).join('')}
        ${nurListe ? '' : `<div class="pa-ei"><input data-pane="${k}" placeholder="Notiz – das Büro merkt sie sich für ähnliche Gebäude" aria-label="Notiz"><button type="button" class="btn sm" data-paeneu="${k}">＋ Notiz</button></div>`}</div>`;
    }
    function lstHtml() {
      const c = cfg(), cc = K().clone(c), S = gewaehlt(c), rec = new Set(K().baseSel([...K().recFor(K().clone(c))])), seen = new Set(), PH = K().C.phases, by = {}, mehr = [];
      K().ctx(cc);
      K().itemsOf(cc).forEach((i) => { const id = K().baseOf(i.id); if (seen.has(id)) return; seen.add(id); const it = K().item(id, cc) || i, eig = (c.custom || []).some((x) => x.id === id);
        const hand = c.dur && c.dur[id] != null && c.dur[id] !== '';   // LP-B1: Reihenfolge ziehen, Dauer je Leistung (gelb = von Hand)
        const z = `<label class="pa-l" data-paid="${esc(id)}"><span class="pa-g" draggable="true" data-pagrip="${esc(id)}" title="Ziehen: Reihenfolge ändern">⠿</span><input type="checkbox" data-pal="${esc(id)}"${S.has(id) ? ' checked' : ''}><span>${esc(it.n || id)}${eig ? `<span class="pa-eig">eigene</span> <button type="button" class="pa-x" data-palweg="${esc(id)}">entfernen</button>` : ''}</span>${it.ms ? '<i>Meilenstein</i>'
          : `<span class="pa-dz"><input type="number" min="1" max="999" class="pa-d${hand ? ' mod' : ''}" data-padur="${esc(id)}" value="${K().dur(id, cc)}" aria-label="Dauer in Arbeitstagen" title="${hand ? 'von Hand gesetzt – leer = wieder der Überschlag' : 'Überschlag aus der Größe – änderbar'}"> AT</span>`}</label>`;
        if (S.has(id) || rec.has(id)) (by[it.ph] ||= []).push([z, S.has(id)]); else mehr.push(z); });
      return `<p class="pa-h"><b><span class="pa-ln">${S.size}</span> Leistungen</b> gewählt${c.sel && c.sel.length ? '' : ' – Empfehlung des Katalogs für diese Angaben'}. Die Dauer ist ein Überschlag aus der Größe des Gebäudes.</p>
        <div class="pa-lk"><label>Bauzeit-Faktor <input data-pafak inputmode="decimal" value="${esc(String(c.fak || 1).replace('.', ','))}" title="für alle Leistungen – z. B. 1,2 = 20 % länger (Winter, enge Baustelle); von Hand gesetzte Dauern bleiben"></label>
          <button type="button" class="btn sm" data-pavs>Vorlage speichern …</button><button type="button" class="btn sm" data-pavw>Vorlage laden ▾</button></div>
        ${(Z.lern || []).filter((v) => v.art === 'dauer').map(vorschlagHtml).join('')}
        <input type="search" class="pa-q" data-paq value="${esc(Z.q || '')}" placeholder="Leistung suchen – in allen Abschnitten und unter „Weitere Leistungen“" aria-label="Leistung suchen">
        ${(Z.lern || []).filter((v) => v.art === 'leistung').map(vorschlagHtml).join('')}
        ${PH.filter((p) => by[p.k]).map((p) => `<details class="pa-ph" data-ph="${esc(p.k)}"${Z.auf.has(p.k) ? ' open' : ''}><summary><b>${esc(p.n)}</b><span class="pa-z">${by[p.k].filter((x) => x[1]).length} / ${by[p.k].length}</span></summary>${by[p.k].map((x) => x[0]).join('')}
          <div class="pa-ei"><input data-paln="${esc(p.k)}" placeholder="eigene Leistung in „${esc(p.n)}“" aria-label="Name der eigenen Leistung"><input class="k" data-pald="${esc(p.k)}" type="number" min="1" max="999" value="5" aria-label="Dauer in Arbeitstagen" title="Dauer (Arbeitstage)"><input class="k" data-palg="${esc(p.k)}" placeholder="Gewerk" aria-label="Gewerk"><button type="button" class="btn sm" data-palneu="${esc(p.k)}">＋ Leistung</button></div></details>`).join('')}
        ${mehr.length ? `<details class="pa-ph" data-ph="_mehr"${Z.auf.has('_mehr') ? ' open' : ''}><summary><b>Weitere Leistungen</b><span class="pa-z">${mehr.length}</span></summary>${mehr.join('')}</details>` : ''}
        ${c.sel && c.sel.length ? '<div class="pa-nav"><button type="button" class="btn" data-pa="lstauto" title="Auswahl verwerfen und wieder der Empfehlung des Katalogs folgen">Empfehlung wiederherstellen</button></div>' : ''}`;
    }
    function allesHtml() {   // alles auf einer Seite: Angaben oben, darunter die Leistungen
      const c = cfg(), sec = (t, k, body) => `<section class="pa-sec" data-pa-sec="${k}"><h4>${t}</h4>${body}</section>`;
      if (!c) return sec('Was wird gebaut?', 'type', schrittHtml('type')) + (Z.vor && Z.vor.assistent && Z.vor.assistent.type ? schrittHtml('plaene') : '');
      const G = bauGruppen(c).slice().sort((a, b) => (b.k === 'massnahme') - (a.k === 'massnahme') || (b.k === 'erweiterung') - (a.k === 'erweiterung'));
      const L = K().levelsOf(K().clone(c)).L, F = G.some((g) => g.k === 'tragwerk' && g.val === 'misch') && L.length > 1 ? K().floorTw(K().clone(c), L) : null;
      const O = K().dgOpts(c), cur = O.some(([v]) => v === c.dg) ? c.dg : 'kalt';
      const bau = `<div class="pa-f">${G.map((g) => `<label>${esc(g.n)}</label><div><select data-pachs="${esc(g.k)}">${g.opts.map((o) => `<option value="${esc(o.k)}"${o.k === g.val ? ' selected' : ''}>${esc(o.n)}</option>`).join('')}</select></div>`).join('')}
        ${F ? L.map((l, i) => `<label>Bauweise ${esc(l)}</label><div><select data-pafl="${esc(l)}">${K().FLTW.map(([v, n]) => `<option value="${v}"${v === F[i] ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`).join('') : ''}
        <label>Über dem obersten Geschoss</label><div><select data-padgs="1">${O.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>
        ${jeGeschoss(c)}<p class="pa-h">Gebäude: <b>${esc(K().buildingDesc(c))}</b></p>`;
      return sec('Was wird gebaut?', 'type', schrittHtml('type')) + sec('Größe des Gebäudes', 'eck', schrittHtml('eck') + ergaenzungHtml('eck')) + sec('Bauweise und Dach', 'bau', bau + ergaenzungHtml('bau') + ergaenzungHtml('dg', true))
        + sec('Baubeginn', 'start', schrittHtml('start')) + sec('Leistungen', 'lst', lstHtml()) + sec('Was daraus entsteht', 'fertig', schrittHtml('fertig'));
    }
    function zeig() {
      const gm = (((window.BPHead && BPHead.conf) || {}).apps || []).find((a) => a.key === 'gebaeudemodell'), hier = location.pathname.split('/').filter(Boolean)[0] === 'gebaeudemodell';
      const umsch = `<div class="pa-um" role="group" aria-label="Ansicht"><button type="button" data-pasicht="schritt" class="${Z.sicht === 'schritt' ? 'on' : ''}">Schritt für Schritt</button><button type="button" data-pasicht="alles" class="${Z.sicht === 'alles' ? 'on' : ''}">Alles auf einer Seite</button></div>`
        + (gm && !hier && window.BPHead.appUrl ? `<a class="btn sm pa-gm" href="${esc(BPHead.appUrl(gm))}/" title="Bauteile, Verknüpfungen und Fragen zum Projekt – im Gebäudemodell">↗ Gebäudemodell</a>` : '');   // RR (18.11.2026): überall ein Knopf ins Gebäudemodell
      if (Z.sicht === 'alles') { const rolle = el.closest('.sr-b') || el, pos = rolle.scrollTop;
        el.innerHTML = `<div class="pa pa-alles" data-pa-schritt="alles">${umsch}<div class="pa-n"><span class="pa-st">${Z.fehler ? 'nicht gespeichert' : Z.d.geaendert ? 'gespeichert' : 'noch leer'}</span></div>${allesHtml()}</div>`;
        rolle.scrollTop = pos; return; }
      const S = SCHRITTE; Z.i = Math.max(0, Math.min(S.length - 1, Z.i));
      const [k, t] = S[Z.i], fertig = (j) => j < Z.i && (j === 0 || !!cfg());
      el.innerHTML = `<div class="pa" data-pa-schritt="${k}">${umsch}<div class="pa-dots">${S.map((y, j) => `<button type="button" class="${j === Z.i ? 'cur' : fertig(j) ? 'ok' : ''}" data-pago="${j}" title="${esc(y[1])}" aria-label="${esc(y[1])}"></button>`).join('')}</div>
        <div><div class="pa-n">Schritt ${Z.i + 1} von ${S.length} · <span class="pa-st">${Z.fehler ? 'nicht gespeichert' : Z.d.geaendert ? 'gespeichert' : 'noch leer'}</span></div><h3>${esc(t)}</h3></div>
        ${schrittHtml(k)}${['eck', 'bau', 'dg'].includes(k) ? ergaenzungHtml(k) : ''}
        <div class="pa-nav"><button type="button" class="btn" data-pago="${Z.i - 1}"${Z.i ? '' : ' disabled'}>Zurück</button><span></span>${Z.i < S.length - 1 ? `<button type="button" class="btn primary" data-pago="${Z.i + 1}">${k === 'plaene' ? 'Überspringen' : 'Weiter'}</button>` : '<button type="button" class="btn primary" data-pafertig>Fertig</button>'}</div>
        ${FLIESST[k] ? `<div class="pa-fl">Diese Angaben fließen in: <b>${esc(FLIESST[k])}</b></div>` : ''}</div>`;
    }
    /* Gebäudeteile (GT, 18.11.2026): aus den Maßnahmen der Bauart (PlanKern.teile); je Teil Name, Fläche, Geschosse, Bauweise, Keller, Dach.
       Ein Teil = wie bisher, ohne Kästen. Anbau: Bauweise und Keller sind die Auswahl „Tragwerk“/„Keller des Anbaus“ (eine Angabe an einer Stelle). */
    const TWN = { massiv: 'Mauerwerk, Stahlbetondecke', stb: 'Stahlbeton', holz: 'Holzrahmenbau', bsp: 'Brettsperrholz', misch: 'gemischt (je Geschoss)' };
    const bauGruppen = (c) => { const anb = K().teile(K().clone(c)).some((t) => t.art === 'anbau'); return K().choiceGroups(c).filter((g) => !(anb && (g.k === 'tragwerk' || g.k === 'anbaukeller')))
      .map((g) => (g.k === 'tragwerk' && g.val !== 'misch' ? { ...g, opts: g.opts.filter((o) => o.k !== 'misch') } : g)); };   // im Kasten „Anbau“; „gemischt“ nur über „je Geschoss …“ (Bauabschnitt B1)
    const jeGeschoss = (c) => { const g = bauGruppen(c).find((x) => x.k === 'tragwerk'); if (!g || K().levelsOf(K().clone(c)).L.length < 2) return '';
      return `<div class="pa-nav" style="margin-top:0"><button type="button" class="pa-x" data-pajg>${g.val === 'misch' ? 'Bauweise einheitlich' : 'Bauweise je Geschoss …'}</button></div>`; };
    function teileHtml(c) {
      const T = K().teile(K().clone(c)), G = K().choiceGroups(c), gk = (k) => G.find((g) => g.k === k), dach = K().CHM.dachform;
      if (T.length < 2 && !(c.teilePlus || []).length) return `<div class="pa-nav"><button type="button" class="btn sm" data-patneu>＋ Gebäudeteil</button><span class="pa-h" style="margin:0">nur bei einem zweiten Gebäude oder Bauabschnitt – Anbau und Aufstockung kommen aus den Maßnahmen</span></div>`;
      const sel = (attr, opts, v) => `<select ${attr}>${opts.map(([k, n]) => `<option value="${esc(k)}"${k === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
      return `<div class="pa-gr"><b>Gebäudeteile</b>${T.map((t, i) => {
        const tg = t.art === 'anbau' && gk('tragwerk'), kg = t.art === 'anbau' && gk('anbaukeller'), d = `data-pateil="${esc(t.k)}"`;
        const tw = tg ? sel('data-pachs="tragwerk"', tg.opts.filter((o) => o.k !== 'misch' || tg.val === 'misch').map((o) => [o.k, TWN[o.k] || o.n]), tg.val) : sel(`${d} data-f="tw"`, Object.entries(TWN).filter(([k]) => k !== 'misch'), t.tw);
        return `<div class="pa-tl"><div class="k"><input ${d} data-f="n" value="${esc(t.n)}" aria-label="Name des Teils"><small>${t.neu ? 'neu' : 'Bestand'}</small>${t.art === 'eigen' ? `<button type="button" class="pa-x" data-patweg="${esc(t.k)}">entfernen</button>` : ''}</div>
          <div class="pa-f">${i ? `<label>Fläche</label><div><input type="number" min="0" ${d} data-f="area" value="${esc(t.area || '')}"><span class="e">m²</span></div>
            <label>Geschosse</label><div><input type="number" min="1" max="30" ${d} data-f="floors" value="${esc(t.floors || 1)}"><span class="e">${t.art === 'aufstock' ? 'neue Geschosse auf dem Bestand' : 'Vollgeschosse'}</span></div>`
            : '<label>Fläche, Geschosse</label><div><span class="e" style="margin:0">wie oben</span></div>'}
            ${t.art === 'haupt' ? '' : `<label>Bauweise${t.neu ? '' : ' (vorhanden)'}</label><div>${tw} <button type="button" class="pa-x" data-patgs="${esc(t.k)}">${t.flTw ? 'einheitlich' : 'je Geschoss …'}</button></div>`}
            ${t.flTw ? K().teilGeschosse(t, T).map((g) => `<label>${esc(g)}</label><div>${sel(`${d} data-f="fl:${esc(g)}"`, Object.entries(TWN).filter(([k]) => k !== 'misch'), t.flTw[g] || t.tw)}</div>`).join('') : ''}
            ${t.art === 'aufstock' || t.art === 'haupt' ? '' : kg ? `<label>Keller</label><div>${sel('data-pachs="anbaukeller"', kg.opts.map((o) => [o.k, o.n]), kg.val)}</div>` : `<label>Keller</label><div><input type="checkbox" ${d} data-f="keller"${t.keller ? ' checked' : ''} style="width:auto"></div>`}
            ${i ? `<label>Dach, Fassade, Fenster</label><div><label style="display:flex;gap:.35rem;align-items:center"><input type="checkbox" ${d} data-f="wie"${t.wie ? ' checked' : ''} style="width:auto">wie ${esc(T[0].n)}</label></div>
              ${t.wie ? '' : K().HUELLE.filter((g) => K().CHM[g]).map((g) => `<label>${esc(K().CHM[g].n)}</label><div>${sel(`${d} data-f="h:${g}"`, K().CHM[g].opts.filter((o) => !o.hidden).map((o) => [o.k, o.n]), t.huelle[g])}</div>`).join('')}` : ''}</div></div>`; }).join('')}
        <div class="pa-nav"><button type="button" class="btn sm" data-patneu>＋ Gebäudeteil</button><span class="pa-h" style="margin:0">Teile kommen aus den Maßnahmen (Anbau, Aufstockung); hier nur ein weiteres Gebäude oder ein Bauabschnitt.</span></div></div>`;
    }
    function teilSetzen(k, f, v) {
      setz((c) => {
        c.teile = { ...(c.teile || {}) }; const o = { ...(c.teile[k] || {}) };
        if (f.startsWith('h:')) o.h = { ...(o.h || {}), [f.slice(2)]: v };   // Hülle des Teils (Dachform, Dachdeckung, Fassade, Fenster)
        else if (f.startsWith('fl:')) o.flTw = { ...(o.flTw || {}), [f.slice(3)]: v };   // Bauweise je Geschoss
        else if (v === '' || v == null) delete o[f]; else o[f] = v;
        if (f === 'wie' && !v) { const t = K().teile(K().clone(c)).find((x) => x.k === k); if (t) o.h = { ...t.huelle }; }   // eigene Hülle: mit der des ersten Teils anfangen
        c.teile[k] = o;
        const T = K().teile(K().clone(c)).filter((t) => t.art === 'anbau' || t.art === 'aufstock');   // Fläche der Erweiterung wie bisher für die Dauern
        if (T.length) c.erwArea = T.reduce((s, t) => s + (+t.area || 0), 0);
      });
    }
    function eigeneLeistung(x) {   // wie eine Leistung aus dem Katalog: Abschnitt, Dauer, Gewerk; folgt auf die letzte Leistung des Abschnitts
      const ph = x.ph || 'abschluss', letzte = K().C.items.filter((i) => i.ph === ph).map((i) => i.id).pop() || 'start';
      const it = { id: 'eig' + Date.now().toString(36), n: String(x.n).slice(0, 200), ph, d: Math.max(1, Math.min(999, +x.d || 5)), gw: x.gw || '', sc: x.sc === 'we' ? 'we' : 'bau', a: Array.isArray(x.a) && x.a.length ? x.a : [letzte], custom: 1, ...(x.ms ? { ms: 1 } : {}) };
      setz((c) => { const S = gewaehlt(c); c.custom = [...(c.custom || []), it]; c.sel = [...S, it.id]; });
    }
    const setz = (fn) => { const c = cfg(); if (!c) return; fn(c); ableiten(); speichern(); };
    const wahl = (g, v) => setz((c) => { const alt = K().clone(c);   // Bauweise ändern: eine eigene Auswahl der Leistungen zieht mit (Leistungen der alten Wahl raus, der neuen rein)
      c.choice = { ...K().choiceAll(K().clone(c)), [g]: v }; if (g === 'tragwerk' && v !== 'misch') c.flTw = {};
      if (c.sel && c.sel.length) c.sel = K().baseSel(K().selForChoices(c.sel, alt, K().clone(c))); });
    el.onclick = async (e) => {
      const kw = Z.m && window.bpBauart && bpBauart.klick(e.target, cfg() && cfg().type);
      if (kw) {   // Gebäude, Maßnahmen, Bereiche, Denkmal: Typ setzen, Größe behalten, Bauweise nach den Vorgaben
        const alt = cfg(), neu = K().grund(bpBauart.typ(kw)); delete neu.start;
        if (alt && alt.type === neu.type) return;
        const vg = alt && K().kombiTeile(alt.type);   // gleiches Gebäude: Größe behalten
        if (alt && (!vg || vg.geb === kw.geb)) Object.assign(neu, { area: alt.area || neu.area, units: alt.units || neu.units, floors: alt.floors || neu.floors });
        else if (!alt) ausModellSetzen(neu);   // erste Wahl: Fläche und Geschosse aus dem Gebäudemodell
        Z.m.assistent = neu; ableiten(); speichern(); return zeig();
      }
      const vk = e.target.closest('[data-pavk]');   // Zeile im letzten Schritt → Reiter „Verknüpfungen“ an dieser Linie (im Gebäudemodell: dessen Ansicht)
      if (vk) { window.bpKarteZiel = vk.dataset.pavk;   // im Gebäudemodell: dessen Ansicht „Verknüpfungen“; in den Apps (RR-A1: kein eigener Reiter mehr) dorthin springen
        if (location.pathname.split('/').filter(Boolean)[0] === 'gebaeudemodell') { document.dispatchEvent(new CustomEvent('bp:verknuepfung', { detail: { app: vk.dataset.pavk } })); return; }
        const gm = (((window.BPHead && BPHead.conf) || {}).apps || []).find((a) => a.key === 'gebaeudemodell'); if (gm && BPHead.appUrl) location.href = BPHead.appUrl(gm) + '/#karte'; return; }
      const b = e.target.closest('button'); if (!b || !Z.m) return;
      if (b.dataset.pasicht) { Z.sicht = b.dataset.pasicht; merk('sicht', Z.sicht); return zeig(); }
      if (b.dataset.pa === 'lstauto') { setz((c) => { delete c.sel; }); return zeig(); }
      if (b.dataset.pa === 'ausmodell') { setz((c) => { ausModellSetzen(c); }); sag('Fläche und Geschosse aus dem Gebäudemodell übernommen.'); return zeig(); }
      if (b.dataset.paeneu) {   // Ergänzung zu einem Abschnitt
        const k = b.dataset.paeneu, inp = el.querySelector(`[data-pane="${k}"]`), t = inp && inp.value.trim(); if (!t) return;
        setz((c) => { c.notiz = { ...(c.notiz || {}) }; c.notiz[k] = [...(c.notiz[k] || []), t]; }); return zeig();
      }
      if (b.dataset.paex) { const [k, i] = b.dataset.paex.split('|'); setz((c) => { const N = [...((c.notiz || {})[k] || [])]; N.splice(+i, 1); c.notiz = { ...c.notiz, [k]: N }; }); return zeig(); }
      if (b.dataset.palneu) {   // eigene Leistung in einem Abschnitt der Leistungen
        const ph = b.dataset.palneu, n = (el.querySelector(`[data-paln="${ph}"]`) || {}).value, d = +((el.querySelector(`[data-pald="${ph}"]`) || {}).value) || 5, gw = ((el.querySelector(`[data-palg="${ph}"]`) || {}).value || '').trim();
        if (!n || !n.trim()) return;
        eigeneLeistung({ n: n.trim(), ph, d, gw }); return zeig();
      }
      if (b.dataset.palweg) { const id = b.dataset.palweg; setz((c) => { c.custom = (c.custom || []).filter((x) => x.id !== id); c.sel = [...gewaehlt(c)].filter((x) => x !== id); }); return zeig(); }
      if (b.dataset.palv) {   // Vorschlag übernehmen
        const v = (Z.lern || []).find((x) => x.schluessel === b.dataset.palv); if (!v) return;
        if (v.art === 'leistung') eigeneLeistung({ n: v.text, ph: v.abschnitt, ...v.daten });
        else if (v.art === 'dauer') setz((c) => { c.dur = { ...(c.dur || {}), [v.abschnitt]: v.daten.d }; c.durN = { ...(c.durN || {}), [v.abschnitt]: v.text }; });
        else setz((c) => { c.notiz = { ...(c.notiz || {}) }; c.notiz[v.abschnitt] = [...(c.notiz[v.abschnitt] || []), v.text]; });
        Z.lern = Z.lern.filter((x) => x !== v); sag('Übernommen – aus ' + herkunft(v).replace(/<[^>]+>/g, '') + '.'); return zeig();
      }
      if (b.dataset.palx) { const k = b.dataset.palx; setz((c) => { c.abgelehnt = [...(c.abgelehnt || []), k]; }); Z.lern = (Z.lern || []).filter((x) => x.schluessel !== k); return zeig(); }
      if (b.dataset.patneu != null) { const n = window.bpEingabe ? await bpEingabe('Name des Gebäudeteils (z. B. „Haus 2“, „Garage“, „Bauabschnitt 2“)', 'Gebäudeteil ' + ((cfg().teilePlus || []).length + 2)) : null; if (!n) return;
        setz((c) => { c.teilePlus = [...(c.teilePlus || []), { k: 't' + Date.now().toString(36), n: String(n).slice(0, 80), neu: 1 }]; }); return zeig(); }
      if (b.dataset.pajg != null) { const c = cfg(), g = bauGruppen(c).find((x) => x.k === 'tragwerk');
        if (g && g.val === 'misch') { const L = K().levelsOf(K().clone(c)).L, F = K().floorTw(K().clone(c), L); wahl('tragwerk', F[0] || 'massiv'); } else wahl('tragwerk', 'misch'); return zeig(); }
      if (b.dataset.patgs) { const k = b.dataset.patgs; setz((c) => { c.teile = { ...(c.teile || {}) }; const o = { ...(c.teile[k] || {}) }; if (o.flTw) delete o.flTw; else { const T = K().teile(K().clone(c)), t = T.find((x) => x.k === k); o.flTw = Object.fromEntries(K().teilGeschosse(t, T).map((g) => [g, t.tw])); } c.teile[k] = o; }); return zeig(); }
      if (b.dataset.patweg) { const k = b.dataset.patweg; setz((c) => { c.teilePlus = (c.teilePlus || []).filter((x) => x.k !== k); if (c.teile) delete c.teile[k]; }); return zeig(); }
      if (b.dataset.pafertig != null) return fertigMachen();
      if (b.dataset.pabt != null) { await bauteileLaden(); const e = await bpBauteile.ausPlanung(pid); if (e && !e.erster && window.toast) toast('Es gibt schon einen Planstand – den Abgleich zeigt das Gebäudemodell unter „Bauteile“.'); if (e) { Z.m = (await J('api/bp/modell/' + pid)).modell; Z.d.modell = Z.m; zeig(); } return; }
      if (b.dataset.paakt != null) { const a = (window.bpAssistentAktionen ? window.bpAssistentAktionen(Z.m) : [])[+b.dataset.paakt]; if (a) a.fn(); return; }
      if (b.dataset.pavs != null) return vorlageSpeichern();
      if (b.dataset.pavw != null) return vorlageLaden();
      if (b.dataset.pago != null) { Z.i = +b.dataset.pago; if (cfg()) { cfg().schritt = Z.i; } return zeig(); }
      if (b.dataset.pat) { const alt = cfg(), neu = K().grund(b.dataset.pat);   // anderer Typ: Größe behalten, Bauweise nach den Vorgaben des Typs
        delete neu.start; if (alt) Object.assign(neu, { area: alt.area || neu.area, units: alt.units || neu.units, floors: alt.floors || neu.floors }); else ausModellSetzen(neu);
        if (alt && alt.type === neu.type) { Z.i++; return zeig(); }
        Z.m.assistent = neu; Z.i++; ableiten(); speichern(); return zeig(); }
      if (b.dataset.pach) { wahl(b.dataset.pach, b.dataset.v); return zeig(); }
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
      if (n.dataset.pateil) { const f = n.dataset.f, v = f === 'keller' || f === 'wie' ? (n.checked ? 1 : 0) : f.includes(':') ? n.value : f === 'area' || f === 'floors' ? (n.value === '' ? '' : Math.max(f === 'floors' ? 1 : 0, Math.round(zahl(n.value)))) : n.value.trim().slice(0, 80);
        teilSetzen(n.dataset.pateil, f, v); if (f !== 'n') setTimeout(zeig); return; }   // nach dem Ereignis neu zeichnen (blur eines anderen Felds kann noch laufen)
      if (n.dataset.paki) { Z.m.ki[n.dataset.paki] = n.checked; return speichern(); }
      if (n.dataset.pachs) { wahl(n.dataset.pachs, n.value); return zeig(); }
      if (n.dataset.padgs) { setz((c) => { c.dg = n.value; }); return zeig(); }
      if (n.dataset.pal) { setz((c) => { const S = gewaehlt(c); if (n.checked) S.add(n.dataset.pal); else S.delete(n.dataset.pal); c.sel = [...S]; });   // ohne neu zu zeichnen – die Liste bleibt stehen
        const z = el.querySelector('.pa-ln'); if (z) z.textContent = gewaehlt(cfg()).size;
        const d = n.closest('details'), q = d && d.querySelector('summary .pa-z'); if (q && d.dataset.ph !== '_mehr') q.textContent = `${d.querySelectorAll('input[data-pal]:checked').length} / ${d.querySelectorAll('input[data-pal]').length}`; return; }
      if (n.dataset.padur) { const id = n.dataset.padur, it = K().item(id, K().clone(cfg())), v = n.value.trim();   // Dauer von Hand; leer = wieder der Überschlag
        setz((c) => { c.dur = { ...(c.dur || {}) }; c.durN = { ...(c.durN || {}) }; if (v === '') { delete c.dur[id]; delete c.durN[id]; } else { c.dur[id] = Math.max(1, Math.min(999, Math.round(zahl(v)) || 1)); c.durN[id] = (it && it.n) || id; } }); return zeig(); }
      if (n.dataset.pafak != null) { setz((c) => { const f = zahl(n.value); if (f > 0 && Math.abs(f - 1) > 1e-9) c.fak = Math.min(5, Math.max(0.2, f)); else delete c.fak; }); return zeig(); }
    };
    /* Reihenfolge der Leistungen ziehen (LP-B1): am ⠿ greifen, auf eine andere Zeile fallen lassen – sie steht dann davor (cfg.order wie früher im Bauzeitenplan) */
    let zug = null;
    el.addEventListener('dragstart', (e) => { const g = e.target.closest && e.target.closest('[data-pagrip]'); if (!g) return; zug = g.dataset.pagrip; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', zug); });
    el.addEventListener('dragover', (e) => { const l = zug && e.target.closest && e.target.closest('.pa-l[data-paid]'); if (!l) return; e.preventDefault(); el.querySelectorAll('.pa-l.ziel').forEach((x) => x.classList.remove('ziel')); l.classList.add('ziel'); });
    el.addEventListener('dragend', () => { zug = null; el.querySelectorAll('.pa-l.ziel').forEach((x) => x.classList.remove('ziel')); });
    el.addEventListener('drop', (e) => { const l = zug && e.target.closest && e.target.closest('.pa-l[data-paid]'); if (!l) return; e.preventDefault();
      const von = zug, vor = l.dataset.paid; zug = null; if (von === vor) return;
      setz((c) => { const L = K().itemsOf(K().clone(c)).map((i) => i.id).filter((x, k, a) => a.indexOf(x) === k).filter((x) => x !== von); const k = L.indexOf(vor); L.splice(k < 0 ? L.length : k, 0, von); c.order = L; }); zeig(); });
    el.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-pagrip]')) e.preventDefault(); }, true);   // Griff schaltet die Leistung nicht um
    /* Eigene Vorlagen (Kern planvorlagen.py; früher „Meine Vorlagen“ im Bauzeitenplan): ganze Planung speichern und in ein Projekt laden */
    async function vorlageSpeichern() {
      const c = cfg(); if (!c) return;
      const name = window.bpEingabe ? await bpEingabe('Name der Vorlage (z. B. „EFH massiv mit Keller“)', c.type ? K().buildingDesc(c) : '') : null; if (!name) return;
      const d = { cfg: { type: c.type, choice: K().choiceAll(K().clone(c)), dur: c.dur || {}, durN: c.durN || {}, custom: c.custom || [], order: c.order, phase: c.phase, bezug: c.bezug, fak: c.fak, fakPh: c.fakPh, dg: c.dg, flTw: c.flTw },
        sel: [...gewaehlt(c)] };
      try { await J('api/bp/planvorlagen', 'POST', { name, data: d }); sag(`Vorlage „${name}“ gespeichert – für alle Projekte.`); } catch (er) { sag(er.message, true); }
    }
    async function vorlageLaden() {
      let L; try { L = await J('api/bp/planvorlagen'); } catch (er) { return sag(er.message, true); }
      const bg = modalBox(`<h3>Vorlage laden</h3><p class="hint" style="margin:0 0 .5rem">Übernimmt Bauweise, Leistungen, Dauern, Reihenfolge und Faktor – Größe und Baubeginn dieses Projekts bleiben.</p>
        ${L.length ? L.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'de')).map((v) => `<div class="pa-vs"><span><b>${esc(v.name)}</b><br><small>${esc(v.by || '')}${v.created ? ' · ' + esc(String(v.created).slice(0, 10)) : ''}${v.scope === 'phases' ? ' · nur einzelne Abschnitte' : ''}</small></span>
          <button type="button" class="btn sm" data-m="laden" data-v="${esc(v.id)}">Laden</button><button type="button" class="btn sm" data-m="weg" data-v="${esc(v.id)}" title="Vorlage löschen">🗑</button></div>`).join('') : '<p>Noch keine Vorlagen.</p>'}
        <div class="bar"><span class="fill"></span><button class="btn" data-m="zu">Schließen</button></div>`, async (m, b, close, btn) => {
        if (m === 'zu') return close();
        const v = L.find((x) => x.id === (btn && btn.dataset.v)); if (!v) return;
        if (m === 'weg') { if (window.bpFrage && !(await bpFrage(`Vorlage „${v.name}“ löschen?`, { ok: 'Löschen' }))) return; try { await J('api/bp/planvorlagen/' + v.id, 'DELETE'); L = L.filter((x) => x !== v); btn.closest('.pa-vs').remove(); } catch (er) { sag(er.message, true); } return; }
        anwenden(v); close();
      });
      return bg;
    }
    function anwenden(v) {
      const d = v.data || {}, alt = cfg() || {};
      if (v.scope !== 'phases' && d.cfg) {   // ganze Planung: Angaben der Vorlage, Größe und Baubeginn bleiben die des Projekts
        const g = d.cfg.type ? K().grund(d.cfg.type) : {}, neu = { ...g, ...d.cfg };
        ['area', 'units', 'floors', 'start', 'notiz', 'abgelehnt'].forEach((k) => { if (alt[k] != null) neu[k] = alt[k]; });
        neu.sel = Array.isArray(d.sel) ? d.sel : undefined; Z.m.assistent = neu;
      } else setz((c) => { c.dur = { ...(c.dur || {}), ...(d.dur || {}) }; c.custom = [...(c.custom || []).filter((x) => !(d.custom || []).some((y) => y.id === x.id)), ...(d.custom || [])]; if (Array.isArray(d.sel)) c.sel = [...new Set([...gewaehlt(c), ...d.sel])]; });
      ableiten(); speichern(); sag(`Vorlage „${v.name}“ geladen.`); zeig();
    }
    const suchen = () => {   // Leistungen filtern ohne neu zu zeichnen (Fokus bleibt im Feld); Abschnitte mit Treffern gehen auf
      const q = (Z.q || '').trim().toLowerCase(), D = [...el.querySelectorAll('details.pa-ph')];
      D.forEach((d) => {
        let n = 0; d.querySelectorAll('.pa-l').forEach((l) => { const ja = !q || l.textContent.toLowerCase().includes(q); l.hidden = !ja; n += ja; });
        d.hidden = !!q && !n; if (q && n) d.open = true; else if (!q) d.open = Z.auf.has(d.dataset.ph);
      });
    };
    el.addEventListener('input', (e) => { if (e.target.matches('[data-paq]')) { Z.q = e.target.value; suchen(); } });
    new MutationObserver(() => { if (Z.q && el.querySelector('[data-paq]')) suchen(); }).observe(el, { childList: true });
    el.addEventListener('toggle', (e) => { const d = e.target; if (d.dataset && d.dataset.ph && !Z.q) { if (d.open) Z.auf.add(d.dataset.ph); else Z.auf.delete(d.dataset.ph); } }, true);   // offene Abschnitte der Leistungen merken
    Promise.all([kernLaden(), J('api/bp/modell/' + pid), J('api/bp/modell/' + pid + '/hinweise').catch(() => []), J('api/bp/modell/' + pid + '/lernen').catch(() => [])]).then(async ([, d, h, lern]) => {
      Z.lern = Array.isArray(lern) ? lern : []; Z.lernTyp = d.modell && d.modell.assistent && d.modell.assistent.type;
      Z.d = d; Z.m = d.modell; Z.hin = Array.isArray(h) ? h : (h && h.hinweise) || [];
      if (!cfg()) Z.vor = await J('api/bp/modell/' + pid + '/vorschlag').catch(() => null);   // noch leer: gibt es Angaben im Bauzeitenplan?
      Z.i = cfg() ? Math.min(SCHRITTE.length - 1, cfg().schritt || 1) : 0;
      zeig();
    }).catch((e) => { el.innerHTML = `<div class="pa"><div class="pa-warn">Der Planungsassistent konnte nicht geladen werden: ${esc(e.message)}</div></div>`; });
  }
  window.bpAssistent = { mount, SCHRITTE };
})();
