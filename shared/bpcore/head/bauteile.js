/* Bauteil-Checkliste – derselbe Baustein in jeder App (Entwurf „Bauteil-Checkliste“, entschieden am 16.11.2026).
   Liest das Gebäudemodell (IFC, z. B. Allplan) und fragt je Gruppe gleicher Bauteile: was passiert damit, wird es berechnet, welcher Aufbau
   aus dem Bauteil-Baukasten. Dazu feste Fragen für das, was nicht im Modell steht. Die Antworten stehen im Projektmodell (Kern:
   bpcore/bauteilliste.py, /api/bp/modell/<pid>/bauteile/…) – Kosten, Ausschreibung und Termine nehmen sie über ihre Linie.
   „IFC mit Maßnahmen ausgeben“ schreibt Nummern, Status, Maßnahme und Aufbau ins IFC zurück.

   Planstände (GO 16.11.2026, Kern bpcore/planstand.py): Jeder eingelesene Plan ist ein Planstand im gemeinsamen Versionsmenü („★ gilt“,
   ansehen, umbenennen, archivieren, löschen). Einlesen nur im Gebäudemodell – vom Gerät oder aus „Pläne & Dateien“ – mit Abgleich
   (neu · geändert · entfällt) und Zuordnung per Klick; entfallene Zeilen mit Antwort bleiben, bis „Aufräumen“.

   bpBauteile.mount(el, pid, { einlesen }) – füllt ein Feld: groß im Gebäudemodell (einlesen: true), sonst Reiter „Bauteile“ im Bereich rechts
   (dort nur der Stand und der Sprung ins Gebäudemodell). Wird erst bei Bedarf geladen (seite.js), kostet beim Öffnen einer App nichts. */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const zahl = (v) => (window.bpZahl ? bpZahl(v, 0, 2) : String(v).replace('.', ','));
  async function J(u, m, b) {
    const r = await fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b && !(b instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
      body: b ? (b instanceof FormData ? b : JSON.stringify(b)) : undefined });
    if (!r.ok) { const j = await r.json().catch(() => ({})); const e = new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); e.status = r.status; throw e; }
    return r;
  }
  const WORT = { offen: 'offen', bleibt: 'bleibt', instandsetzen: 'instandsetzen', erneuern: 'erneuern', neu: 'neu', abbruch: 'Abbruch', pruefen: 'prüfen lassen' };
  const WORT_FRAGE = { bleibt: 'nein, bleibt', erneuern: 'erneuern', neu: 'neu', pruefen: 'prüfen lassen' };
  const BEREICH = [['rohbau', 'Rohbau'], ['oeffnung', 'Öffnungen – Fenster und Türen'], ['raum', 'Räume – Oberflächen'], ['ausbau', 'Küche und Bad'], ['frage', 'Nicht im Modell – bitte beantworten'], ['hand', 'Von Hand']];
  const KG2 = [['31', 'Baugrube'], ['32', 'Gründung'], ['33', 'Außenwände'], ['34', 'Innenwände'], ['35', 'Decken'], ['36', 'Dächer'], ['38', 'Einbauten'], ['39', 'Sonstiges KG 300'], ['41', 'Wasser'], ['42', 'Wärme'], ['43', 'Lüftung'], ['44', 'Elektro'], ['47', 'Nutzungsspezifisch']];
  const STIL = `.bt-l{display:flex;flex-direction:column;gap:.7rem;padding:.8rem .9rem 1.2rem;font-size:.9rem}
.bt-kopf{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center}.bt-kopf .bt-q{flex:1 1 14rem;font-size:.8rem;opacity:.7;min-width:0}
.bt-z{border-radius:1em;padding:0 .55em;font-size:.78rem;background:var(--line,#d5d9de)}.bt-z.rot{background:var(--red,#c62f2a);color:#fff}
.bt-b{border-top:1px solid var(--line,#d5d9de);padding-top:.5rem;display:flex;flex-direction:column;gap:.35rem}.bt-b>h4{margin:0 0 .1rem;font-size:.86rem;opacity:.8}
.bt-r{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.15rem .55rem;padding:.4rem .5rem;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));background:var(--card,transparent)}
.bt-r.offen{border-left:3px solid var(--red,#c62f2a)}
.bt-r input[type=checkbox]{margin-top:.2rem}
.bt-n{display:flex;flex-wrap:wrap;gap:.2rem .6rem;align-items:baseline}.bt-n b{font-weight:600}.bt-n i{font-style:normal;opacity:.7;font-size:.82rem}
.bt-nr{font-size:.76rem;opacity:.65}
.bt-st{grid-column:2;display:flex;flex-wrap:wrap;gap:.25rem}
.bt-st button,.bt-o button{font:inherit;font-size:.8rem;border:1px solid var(--line,#d5d9de);background:none;color:inherit;border-radius:calc(99px*var(--rkp,1));padding:.05rem .6rem;cursor:pointer}
.bt-st button.on,.bt-o button.on{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3);font-weight:600}
.bt-a{grid-column:2;font-size:.82rem;display:flex;flex-wrap:wrap;gap:.2rem .5rem;align-items:baseline}.bt-a code{font-size:.78rem;opacity:.85}
.bt-a button{font:inherit;font-size:.8rem;background:none;border:0;color:var(--y,#2f6fb3);cursor:pointer;padding:0;text-decoration:underline}
.bt-h{grid-column:2;font-size:.78rem;opacity:.7}
.bt-e{grid-column:1/-1;border-top:1px dashed var(--line,#d5d9de);margin-top:.3rem;padding-top:.4rem;display:flex;flex-direction:column;gap:.35rem}
.bt-o{display:flex;flex-wrap:wrap;gap:.25rem;align-items:baseline}.bt-o>span{font-size:.78rem;opacity:.7;min-width:7rem}
.bt-leer{font-size:.88rem;line-height:1.5;opacity:.85}.bt-m{width:5.5rem;text-align:right;font:inherit;font-size:.85rem;padding:.05rem .3rem}
.bt-weg{font:inherit;font-size:.78rem;background:none;border:0;color:var(--red,#c62f2a);cursor:pointer;padding:0;text-decoration:underline}.bt-w{font-size:.82rem;opacity:.75}
.bt-r.weg{opacity:.6;border-style:dashed}.bt-r.weg b{text-decoration:line-through}.bt-chip{font-size:.74rem;border-radius:1em;padding:0 .5em;border:1px solid var(--line,#d5d9de)}
.bt-an{border:1px solid var(--y,#2f6fb3);border-radius:calc(8px*var(--rk,1));padding:.5rem .7rem;display:flex;flex-wrap:wrap;gap:.4rem .8rem;align-items:center;font-size:.86rem}
.bt-an b{font-weight:600}.bt-an span{flex:1 1 14rem}.bt-ps{font-size:.84rem}.bt-ps a{color:var(--y,#2f6fb3)}
.bt-ab{width:min(860px,100%);display:flex;flex-direction:column;gap:.6rem;padding:1rem 1.1rem;max-height:86vh;overflow:auto;font-size:.9rem}
.bt-ab h3{margin:0;font-size:1.05rem}.bt-ab h4{margin:.3rem 0 .2rem;font-size:.86rem}.bt-ab .bt-sp{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
.bt-ab .bt-li{display:flex;flex-direction:column;gap:.25rem}.bt-ab button.bt-i{font:inherit;font-size:.84rem;text-align:left;background:none;color:inherit;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));padding:.25rem .5rem;cursor:pointer}
.bt-ab button.bt-i.sel{border-color:var(--y,#2f6fb3);box-shadow:inset 0 0 0 1px var(--y,#2f6fb3)}.bt-ab button.bt-i.paar{background:var(--hov,rgba(47,111,179,.08))}
.bt-ab .bt-ft{display:flex;gap:.5rem;justify-content:flex-end;align-items:center;flex-wrap:wrap}.bt-ab .bt-ft label{flex:1;display:flex;gap:.4rem;align-items:center;min-width:14rem}.bt-ab .bt-ft input{flex:1;font:inherit;padding:.3rem .5rem}
@media (max-width:640px){.bt-ab .bt-sp{grid-template-columns:1fr}}`;
  const stil = () => { if (document.getElementById('bt-stil')) return; const s = document.createElement('style'); s.id = 'bt-stil'; s.textContent = STIL; document.head.appendChild(s); };

  const tag = (s) => (window.bpTag ? bpTag(String(s || '').slice(0, 10)) : String(s || '').slice(0, 10));

  function mount(el, pid, opt = {}) {
    stil();
    const H = window.BPHead || {};
    const Z = { d: null, auf: null, vorl: {}, laeuft: false, kg: {}, ps: [], an: null };   // an: Planstand, der gerade angesehen wird (gilt nicht)
    const G = () => (Z.d && Z.d.modell && Z.d.modell.bauteilliste) || { zeilen: [], raeume: [], quelle: {} };
    const L = () => (Z.an ? Z.an.liste : G());
    const gilt = () => (G().quelle || {}).planstand || null;
    const basis = `api/bp/modell/${pid}`;
    const warte = (t) => { const tm = setTimeout(() => { const w = el.querySelector('.bt-w'); if (w) w.textContent = t; }, 1500); return () => clearTimeout(tm); };

    async function laden() {
      const [d, p] = await Promise.all([J(basis).then((r) => r.json()), opt.einlesen ? J(`${basis}/planstaende`).then((r) => r.json()) : Promise.resolve(null)]);
      Z.d = d; if (p) Z.ps = p.planstaende || [];
      zeichne();
    }
    const neu = (d) => { Z.d = d; if (d.planstaende) Z.ps = d.planstaende; };
    async function ansehen(id) {
      if (!id || String(id) === String(gilt())) { Z.an = null; return zeichne(); }
      try { const d = await (await J(`${basis}/planstand/${id}`)).json(); Z.an = { ...d.planstand, liste: d.liste, abgleich: d.abgleich }; Z.auf = null; zeichne(); } catch (e) { sag(e.message, true); }
    }
    async function aendern(id, was, text) {
      try { neu(await (await J(`${basis}/planstand/${id}`, 'POST', was)).json()); if (was.gilt || was.loeschen) Z.an = null; zeichne(); if (text) sag(text); } catch (e) { sag(e.message, true); }
    }
    function menue(box) {   // gemeinsames Versionsmenü (head.js) – „Planstand“ statt „Version“
      if (!H.versionsMenue || !box) return;
      const g = gilt(), akt = Z.an ? Z.an.id : g;
      H.versionsMenue({ in: box, wort: 'Planstand', liste: Z.ps.map((x) => ({ id: x.id, name: x.name, datum: tag(x.erstellt), archiviert: x.archiviert })), aktuell: akt, gueltig: g,
        wahlHinweis: 'Kosten, Ausschreibung, Termine und die anderen Apps arbeiten mit dem gültigen Planstand.',
        neuText: '＋ Neuen Planstand einlesen …', giltText: '★ Dieser Planstand gilt ab jetzt …',
        onWahl: (id, wird) => (wird ? null : ansehen(id)),
        onGueltig: (id) => aendern(id, { gilt: true }, 'Der Planstand gilt jetzt – die Apps arbeiten damit.'),
        onNeu: () => einlesen(),
        onUmbenennen: async () => { const x = Z.ps.find((y) => String(y.id) === String(akt)); const n = await bpEingabe('Name des Planstands:', x ? x.name : ''); if (n && n.trim()) aendern(akt, { name: n.trim() }); },
        onVerwalten: async () => {
          const x = Z.ps.find((y) => String(y.id) === String(akt)); if (!x) return;
          if (String(akt) === String(g)) return bpHinweis('Der gültige Planstand kann nicht archiviert oder gelöscht werden – erst einen anderen gelten lassen.');
          const r = await bpFrage(`„${x.name}“ archivieren oder löschen?\nArchivierte Planstände bleiben im Menü unter „Archiviert“.`, { ok: x.archiviert ? 'Wieder hervorholen' : 'Archivieren', drei: 'Löschen', abbrechen: 'Abbrechen' });
          if (r === 'drei') { if (await bpFrage(`„${x.name}“ wirklich löschen?`, { ok: 'Löschen', gefahr: true })) aendern(akt, { loeschen: true }, 'Planstand gelöscht.'); }
          else if (r === true) aendern(akt, { archiviert: !x.archiviert });
        } });
    }
    async function einlesen() {
      const r = await bpFrage('Neuen Planstand einlesen – woher kommt die Datei?\nIFC (Allplan u. a.) liefert Bauteile, Öffnungen und Räume; DXF Räume, Öffnungen und Wände; PDF nur die Raumstempel.',
        { ok: 'Aus „Pläne & Dateien“ …', drei: 'Vom Gerät …', abbrechen: 'Abbrechen' });
      if (r === 'drei') return el.querySelector('[data-btdatei]').click();
      if (r !== true || !H.dateiWahl) return;
      const w = await H.dateiWahl({ project_id: pid, titel: 'Plan für das Gebäudemodell wählen', start: 'server', endungen: ['ifc', 'dxf', 'pdf'], eine: true });
      if (w && w[0]) lesen({ quelle: w[0].quelle, pfad: w[0].pfad });
    }
    async function lesen(was) {   // Schritt 1: Entwurf mit Abgleich – das Modell bleibt, bis „Planstand übernehmen“
      if (Z.laeuft) return; Z.laeuft = true;
      const stop = warte('Plan wird gelesen …');
      try {
        const e = await (await J(`${basis}/bauteile/lesen`, 'POST', was)).json();
        if (e.erster) return await uebernehmen(e, {}, e.name);
        abgleich(e);
      } catch (er) { sag(er.message, true); } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    }
    async function uebernehmen(e, zuordnung, name) {
      neu(await (await J(`${basis}/planstand/${e.entwurf}/uebernehmen`, 'POST', { zuordnung, name })).json()); Z.an = null; Z.auf = null;
      sag(`Planstand übernommen: ${L().zeilen.length} Zeilen` + ((e.hinweise || []).length ? ' – ' + e.hinweise[0] : '')); zeichne();
    }
    function abgleich(e) {   // Schritt 2: Abgleich mit Zuordnung per Klick (entfällt ↔ neu = dasselbe Bauteil)
      const A = e.abgleich, paar = {}; let wahl = null;
      const it = (x, art) => { const p = art === 'e' ? paar[x.id] : Object.keys(paar).find((k) => paar[k] === x.id);
        return `<button type="button" class="bt-i${wahl === x.id ? ' sel' : ''}${p ? ' paar' : ''}" data-m="${art}:${esc(x.id)}">${esc(x.name)} <small>· ${zahl(x.menge)} ${esc(x.einheit)}${x.beantwortet ? ' · ' + esc(WORT[x.status] || x.status) : ''}</small>${p ? `<br><small>↔ ${esc((art === 'e' ? A.neu : A.entfaellt).find((y) => y.id === p)?.name || '')}</small>` : ''}</button>`; };
      const html = () => `<div class="bt-ab"><h3>Neuer Planstand: ${esc(e.name)}</h3>
        <div>${A.neu.length} neu · ${A.geaendert.length} geändert · ${A.entfaellt.length} entfällt · ${A.gleich} unverändert – deine Antworten zu unveränderten Zeilen bleiben.</div>
        ${A.entfaellt.length && A.neu.length ? '<div class="mute">Ist ein „entfällt“ und ein „neu“ dasselbe Bauteil (neu gezeichnet, umbenannt)? Erst links, dann rechts antippen – Status und Aufbau gehen mit. Nochmal antippen löst die Zuordnung.</div>' : ''}
        <div class="bt-sp"><div class="bt-li"><h4>Entfällt (${A.entfaellt.length})</h4>${A.entfaellt.map((x) => it(x, 'e')).join('') || '<span class="mute">nichts</span>'}</div>
          <div class="bt-li"><h4>Neu (${A.neu.length})</h4>${A.neu.map((x) => it(x, 'n')).join('') || '<span class="mute">nichts</span>'}</div></div>
        ${A.geaendert.length ? `<h4>Geändert (${A.geaendert.length})</h4><div class="bt-li">${A.geaendert.map((x) => `<span>${esc(x.name)} <small class="mute">${zahl(x.menge_alt)} → ${zahl(x.menge)} ${esc(x.einheit)}</small></span>`).join('')}</div>` : ''}
        ${(e.hinweise || []).length ? `<div class="mute">${e.hinweise.map(esc).join('<br>')}</div>` : ''}
        <div class="bt-ft"><label>Name <input data-btname value="${esc(e.name)}"></label><button type="button" class="btn" data-m="abbrechen">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Planstand übernehmen</button></div></div>`;
      modalBox(html(), async (m, bg, close) => {
        if (m === 'abbrechen') return close();
        if (m === 'ok') { const n = bg.querySelector('[data-btname]').value.trim(); close(); try { await uebernehmen(e, paar, n); } catch (er) { sag(er.message, true); } return; }
        const [art, id] = [m.slice(0, 1), m.slice(2)];
        if (art === 'e') { if (paar[id]) delete paar[id]; else wahl = id; }
        else if (art === 'n') { const k = Object.keys(paar).find((x) => paar[x] === id); if (k) delete paar[k]; else if (wahl) { paar[wahl] = id; wahl = null; } }
        const box = bg.querySelector('.modal'), n = box.querySelector('[data-btname]').value; box.innerHTML = html(); box.querySelector('[data-btname]').value = n;
      });
    }
    async function zeile(id, neu) {
      try { Z.d = await (await J(`${basis}/bauteile/zeile`, 'POST', { id, rev: Z.d.rev, ...neu })).json(); zeichne(); }
      catch (e) { sag(e.message, true); if (e.status === 409) laden(); }
    }
    async function vorlagen(kg) {
      const k = String(kg || '').slice(0, 2);
      if (!Z.vorl[k]) Z.vorl[k] = (await J(`${basis}/bauteile/vorlagen?kg=${k}0`)).json();
      return Z.vorl[k];
    }

    function zeileHtml(z) {
      const fr = z.bereich === 'frage';
      const st = z.erlaubt || [];   /* welche Antworten passen, sagt der Kern (bauteilliste.erlaubt): im Neubau nur „neu“ */
      const nr = (z.nummern || []).length ? `<div class="bt-nr">${esc(z.nummern.join(' · '))}</div>` : '';
      const auf = z.vorlage ? `<div class="bt-a"><span>${esc(z.kurz)}</span>${z.code ? `<code>${esc(z.code)}</code>` : '<code>Aufbau nach Wahl</code>'}<button type="button" data-btauf="${esc(z.id)}">Aufbau ${Z.auf === z.id ? 'zu' : 'ändern'}</button></div>`
        : z.status !== 'offen' && z.status !== 'bleibt' && z.status !== 'pruefen' ? `<div class="bt-a"><span>kein Aufbau gewählt</span><button type="button" data-btauf="${esc(z.id)}">Aufbau wählen</button></div>` : '';
      if (z.entfaellt || Z.an) {   // entfallen oder älterer Planstand: nur ansehen
        return `<div class="bt-r${z.entfaellt ? ' weg' : ''}" data-btz="${esc(z.id)}"><span></span><div><div class="bt-n"><b>${esc(z.name)}</b><i>${zahl(z.menge)} ${esc(z.einheit)}</i>${z.entfaellt ? '<span class="bt-chip">entfällt</span>' : ''}<span class="bt-chip">${esc((fr ? WORT_FRAGE : WORT)[z.status] || z.status)}</span></div>${nr}${z.kurz ? `<div class="bt-a"><span>${esc(z.kurz)}</span></div>` : ''}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}</div></div>`;
      }
      return `<div class="bt-r${z.status === 'offen' ? ' offen' : ''}" data-btz="${esc(z.id)}">
        <input type="checkbox" data-btber title="wird berechnet (Kosten, LV)"${z.berechnen ? ' checked' : ''}${z.status === 'offen' ? ' disabled' : ''}>
        <div><div class="bt-n"><b>${esc(z.name)}</b>${z.bereich === 'hand' ? `<i><input class="bt-m" data-btmenge value="${zahl(z.menge)}" inputmode="decimal" aria-label="Menge ${esc(z.name)}"> ${esc(z.einheit)}</i><button type="button" class="bt-weg" data-btweg title="Zeile entfernen">entfernen</button>` : `<i>${zahl(z.menge)} ${esc(z.einheit)}${z.anzahl > 1 && z.einheit !== 'St' ? ` · ${z.anzahl} Objekte` : ''}</i>`}</div>${nr}</div>
        <div class="bt-st">${st.map((s) => `<button type="button" data-btst="${s}" class="${z.status === s ? 'on' : ''}">${esc((fr ? WORT_FRAGE : WORT)[s])}</button>`).join('')}</div>
        ${auf}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}${Z.auf === z.id ? '<div class="bt-e"><div class="bt-w">Vorlagen werden geladen …</div></div>' : ''}</div>`;
    }

    function zeichne() {
      const Li = L(), Q = Li.quelle || {}, ZZ = Li.zeilen || [], gm = ((H.conf || {}).apps || []).find((a) => a.key === 'gebaeudemodell');
      const offen = ZZ.filter((z) => z.status === 'offen' && !z.entfaellt).length, weg = G().zeilen.filter((z) => z.entfaellt).length;
      const stand = Q.datei ? `${esc(Q.name || 'Planstand')} · ${esc(Q.datei)}${Q.gelesen ? ' · gelesen ' + esc(tag(Q.gelesen)) : ''}${Q.programm ? ' · ' + esc(Q.programm) : ''}` : '';
      const kopf = opt.einlesen
        ? `<div class="bt-kopf"><span data-btvm></span><button type="button" class="btn${ZZ.length ? '' : ' primary'}" data-btlesen>Planstand einlesen …</button>
          <button type="button" class="btn" data-btaus${ZZ.length && !Z.an ? '' : ' disabled'} title="Nummern, Status und Aufbau ins IFC schreiben${Q.pfad ? ' – die Datei kommt aus „Pläne & Dateien“' : ' – dafür die IFC-Datei noch einmal wählen'}">IFC mit Maßnahmen ausgeben</button>
          ${weg && !Z.an ? `<button type="button" class="btn" data-btweg-alle title="Zeilen, die im gültigen Planstand nicht mehr vorkommen, entfernen">Aufräumen (${weg} entfällt)</button>` : ''}
          ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
          <span class="bt-q"></span>${Z.an ? '' : '<button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button>'}
          <input type="file" accept=".ifc,.dxf,.pdf" data-btdatei hidden></div><div class="bt-w"></div>`
        : `<div class="bt-kopf"><span class="bt-ps">${stand ? 'Planstand: ' + stand : 'Noch kein Planstand eingelesen.'}${gm ? ` · <a href="${esc(H.appUrl(gm))}/#bauteile">${stand ? 'Neuen Planstand einlesen' : 'Plan einlesen'} → Gebäudemodell</a>` : ''}</span>
          ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
          <button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button></div><div class="bt-w"></div>`;
      const an = Z.an ? `<div class="bt-an"><span>Du siehst <b>${esc(Z.an.name)}</b> – gilt nicht. Gegenüber dem gültigen: ${Z.an.abgleich.neu.length} neu · ${Z.an.abgleich.geaendert.length} geändert · ${Z.an.abgleich.entfaellt.length} entfällt.</span>
        <button type="button" class="btn" data-btzurueck>Zurück zum gültigen</button><button type="button" class="btn primary" data-btgilt>Diesen Planstand gelten lassen</button></div>` : '';
      if (!ZZ.length) {   // ohne Modell: Plan einlesen oder Zeilen von Hand
        el.innerHTML = `<div class="bt-l">${kopf}<p class="bt-leer">Die Checkliste liest den Plan (IFC aus Allplan u. a., DXF oder PDF) und legt je Gruppe gleicher Bauteile eine Zeile an:
          was passiert damit, wird es berechnet, welcher Aufbau aus dem Bauteil-Baukasten. Bauteile aus dem Allplan-Katalog der Bauplattform bringen ihren Aufbau schon mit.
          Die Antworten stehen im Projektmodell – Kosten, Ausschreibung und Termine nehmen sie von dort.</p></div>`;
        menue(el.querySelector('[data-btvm]'));
        return;
      }
      el.innerHTML = `<div class="bt-l">${kopf}${an}${BEREICH.map(([b, t]) => { const R = ZZ.filter((z) => z.bereich === b); return R.length ? `<section class="bt-b"><h4>${esc(t)}</h4>${R.map(zeileHtml).join('')}</section>` : ''; }).join('')}</div>`;
      menue(el.querySelector('[data-btvm]'));
      if (Z.auf) editor();
    }

    async function editor() {
      const z = L().zeilen.find((x) => x.id === Z.auf), box = el.querySelector(`[data-btz="${CSS.escape(Z.auf)}"] .bt-e`);
      if (!z || !box) return;
      let V;
      const kg = Z.kg[z.id] || z.kg;
      try { V = await vorlagen(kg); } catch (e) { box.innerHTML = `<div class="bt-w">${esc(e.message)}</div>`; return; }
      const gleich = V.filter((v) => v.kg === z.kg), rest = V.filter((v) => v.kg !== z.kg);
      const v = V.find((x) => x.id === z.vorlage);
      box.innerHTML = `${z.bereich === 'hand' ? `<div class="bt-o"><span>Kostengruppe</span>${KG2.map(([k, t]) => `<button type="button" data-btkg="${k}" class="${String(kg).startsWith(k) ? 'on' : ''}">${k}0 ${esc(t)}</button>`).join('')}</div>` : ''}<div class="bt-o"><span>Vorlage</span>${[...gleich, ...rest].slice(0, 40).map((x) => `<button type="button" data-btvl="${esc(x.id)}" class="${x.id === z.vorlage ? 'on' : ''}" title="${esc(x.kg)}">${esc(x.name)}</button>`).join('')}</div>
        ${v ? v.schichten.map((s, i) => `<div class="bt-o"><span>${esc(s.name)}</span>${s.optionen.map((o, j) => `<button type="button" data-btop="${i}.${j}" class="${(z.wahl || [])[i] === j ? 'on' : ''}" title="${esc(o.t)}">${esc(o.k || 'ohne')}</button>`).join('')}</div>`).join('') : ''}`;
    }

    el.onclick = async (e) => {
      const t = e.target, r = t.closest('[data-btz]'), id = r && r.dataset.btz;
      if (t.closest('[data-btlesen]')) return einlesen();
      if (t.closest('[data-btzurueck]')) return ansehen(null);
      if (t.closest('[data-btgilt]') && Z.an) return aendern(Z.an.id, { gilt: true }, 'Der Planstand gilt jetzt – die Apps arbeiten damit.');
      if (t.closest('[data-btweg-alle]')) {
        if (!(await bpFrage('Alle Zeilen entfernen, die im gültigen Planstand nicht mehr vorkommen? Ihre Antworten gehen dabei verloren.', { ok: 'Aufräumen' }))) return;
        try { const d = await (await J(`${basis}/bauteile/aufraeumen`, 'POST', {})).json(); neu(d); sag(`${d.entfernt} Zeilen entfernt.`); zeichne(); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-bthand]')) {
        const n = window.bpEingabe ? await bpEingabe('Was für ein Bauteil? (z. B. „Trockenbauwand Flur“, „Dämmung oberste Geschossdecke“)', '') : null; if (!n || !String(n).trim()) return;
        try { Z.d = await (await J(`${basis}/bauteile/hand`, 'POST', { name: String(n).trim() })).json(); const L2 = L().zeilen; Z.auf = L2.length ? L2[L2.length - 1].id : null; zeichne(); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-btaus]')) {
        const Q = G().quelle || {};
        if (Q.pfad) return ausgeben({ quelle: 'server', pfad: Q.pfad });   // Datei aus „Pläne & Dateien“: nichts noch einmal wählen
        Z.ausgabe = true; return el.querySelector('[data-btdatei]').click();
      }
      if (!id) return;
      const z = L().zeilen.find((x) => x.id === id);
      if (t.closest('[data-btst]')) return zeile(id, { status: t.closest('[data-btst]').dataset.btst });
      if (t.closest('[data-btauf]')) { Z.auf = Z.auf === id ? null : id; return zeichne(); }
      if (t.closest('[data-btkg]')) { Z.kg[id] = t.closest('[data-btkg]').dataset.btkg + '0'; return editor(); }
      if (t.closest('[data-btweg]')) { const alt = z && z.name; await zeile(id, { loeschen: true }); if (alt) sag(`„${alt}“ entfernt.`); return; }
      if (t.closest('[data-btvl]')) return zeile(id, { vorlage: t.closest('[data-btvl]').dataset.btvl });
      if (t.closest('[data-btop]') && z) { const [i, j] = t.closest('[data-btop]').dataset.btop.split('.').map(Number); const w = [...(z.wahl || [])]; w[i] = j; return zeile(id, { wahl: w }); }
    };
    el.onchange = async (e) => {
      const t = e.target;
      if (t.matches('[data-btber]')) return zeile(t.closest('[data-btz]').dataset.btz, { berechnen: t.checked });
      if (t.matches('[data-btmenge]')) return zeile(t.closest('[data-btz]').dataset.btz, { menge: parseFloat(String(t.value).replace(/\./g, '').replace(',', '.')) || 0 });
      if (!t.matches('[data-btdatei]') || !t.files[0]) return;
      const f = t.files[0], aus = Z.ausgabe; Z.ausgabe = false; t.value = '';
      const fd = new FormData(); fd.append('datei', f, f.name);
      if (aus) return ausgeben(fd);
      lesen(fd);
    };
    async function ausgeben(was) {
      if (Z.laeuft) return; Z.laeuft = true;
      const stop = warte('IFC wird geschrieben …');
      try {
        const r = await J(`${basis}/bauteile/ifc`, 'POST', was), b = await r.blob();
        const m = /filename\*=UTF-8''([^;]+)/.exec(r.headers.get('Content-Disposition') || ''), a = document.createElement('a');
        a.href = URL.createObjectURL(b); a.download = m ? decodeURIComponent(m[1]) : 'modell-massnahmen.ifc'; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        sag('IFC mit Maßnahmen erstellt – Nummern, Status und Aufbau stehen in den Bauteilen.');
      } catch (er) { sag(er.message, true); } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    }
    el.innerHTML = '<div class="bt-l"><div class="bt-w">Lade …</div></div>';
    laden().catch((e) => { el.innerHTML = `<div class="bt-l"><p class="bt-leer">${esc(e.message)}</p></div>`; });
  }
  window.bpBauteile = { mount };
}());
