/* Bauteil-Checkliste – derselbe Baustein in jeder App (Entwurf „Bauteil-Checkliste“, entschieden am 16.11.2026).
   Liest das Gebäudemodell (IFC, z. B. Allplan) und fragt je Gruppe gleicher Bauteile: was passiert damit, wird es berechnet, welcher Aufbau
   aus dem Bauteil-Baukasten. Dazu feste Fragen für das, was nicht im Modell steht. Die Antworten stehen im Projektmodell (Kern:
   bpcore/bauteilliste.py, /api/bp/modell/<pid>/bauteile/…) – Kosten, Ausschreibung und Termine nehmen sie über ihre Linie.
   „IFC mit Maßnahmen ausgeben“ schreibt Nummern, Status, Maßnahme und Aufbau ins IFC zurück.

   bpBauteile.mount(el, pid) – füllt ein Feld (Reiter „Bauteile“ im Bereich rechts, groß in der App „Planung“).
   Wird erst bei Bedarf geladen (seite.js), kostet beim Öffnen einer App nichts. */
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
  const STATUS = { rohbau: ['bleibt', 'instandsetzen', 'neu', 'abbruch'], oeffnung: ['bleibt', 'instandsetzen', 'erneuern', 'neu', 'abbruch'],
    raum: ['bleibt', 'instandsetzen', 'erneuern'], ausbau: ['bleibt', 'erneuern', 'neu'], frage: ['bleibt', 'erneuern', 'neu', 'pruefen'], hand: ['neu', 'erneuern', 'instandsetzen', 'abbruch'] };
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
.bt-weg{font:inherit;font-size:.78rem;background:none;border:0;color:var(--red,#c62f2a);cursor:pointer;padding:0;text-decoration:underline}.bt-w{font-size:.82rem;opacity:.75}`;
  const stil = () => { if (document.getElementById('bt-stil')) return; const s = document.createElement('style'); s.id = 'bt-stil'; s.textContent = STIL; document.head.appendChild(s); };

  function mount(el, pid) {
    stil();
    const Z = { d: null, auf: null, vorl: {}, laeuft: false, kg: {} };
    const L = () => (Z.d && Z.d.modell && Z.d.modell.bauteilliste) || { zeilen: [], raeume: [], quelle: {} };
    const basis = `api/bp/modell/${pid}`;
    const warte = (t) => { const tm = setTimeout(() => { const w = el.querySelector('.bt-w'); if (w) w.textContent = t; }, 1500); return () => clearTimeout(tm); };

    async function laden() { Z.d = await (await J(basis)).json(); zeichne(); }
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
      const st = (STATUS[z.bereich] || STATUS.rohbau).filter((s) => s !== 'pruefen' || z.id === 'frage:schadstoffe');
      const nr = (z.nummern || []).length ? `<div class="bt-nr">${esc(z.nummern.join(' · '))}</div>` : '';
      const auf = z.vorlage ? `<div class="bt-a"><span>${esc(z.kurz)}</span>${z.code ? `<code>${esc(z.code)}</code>` : '<code>Aufbau nach Wahl</code>'}<button type="button" data-btauf="${esc(z.id)}">Aufbau ${Z.auf === z.id ? 'zu' : 'ändern'}</button></div>`
        : z.status !== 'offen' && z.status !== 'bleibt' && z.status !== 'pruefen' ? `<div class="bt-a"><span>kein Aufbau gewählt</span><button type="button" data-btauf="${esc(z.id)}">Aufbau wählen</button></div>` : '';
      return `<div class="bt-r${z.status === 'offen' ? ' offen' : ''}" data-btz="${esc(z.id)}">
        <input type="checkbox" data-btber title="wird berechnet (Kosten, LV)"${z.berechnen ? ' checked' : ''}${z.status === 'offen' ? ' disabled' : ''}>
        <div><div class="bt-n"><b>${esc(z.name)}</b>${z.bereich === 'hand' ? `<i><input class="bt-m" data-btmenge value="${zahl(z.menge)}" inputmode="decimal" aria-label="Menge ${esc(z.name)}"> ${esc(z.einheit)}</i><button type="button" class="bt-weg" data-btweg title="Zeile entfernen">entfernen</button>` : `<i>${zahl(z.menge)} ${esc(z.einheit)}${z.anzahl > 1 && z.einheit !== 'St' ? ` · ${z.anzahl} Objekte` : ''}</i>`}</div>${nr}</div>
        <div class="bt-st">${st.map((s) => `<button type="button" data-btst="${s}" class="${z.status === s ? 'on' : ''}">${esc((fr ? WORT_FRAGE : WORT)[s])}</button>`).join('')}</div>
        ${auf}${z.hinweis ? `<div class="bt-h">${esc(z.hinweis)}</div>` : ''}${Z.auf === z.id ? '<div class="bt-e"><div class="bt-w">Vorlagen werden geladen …</div></div>' : ''}</div>`;
    }

    function zeichne() {
      const Li = L(), Q = Li.quelle || {}, ZZ = Li.zeilen || [];
      const offen = ZZ.filter((z) => z.status === 'offen').length;
      const kopf = `<div class="bt-kopf"><button type="button" class="btn${ZZ.length ? '' : ' primary'}" data-btlesen>IFC einlesen</button>
        <button type="button" class="btn" data-btaus${ZZ.length ? '' : ' disabled'}>IFC mit Maßnahmen ausgeben</button>
        ${ZZ.length ? `<span class="bt-z${offen ? ' rot' : ''}" title="noch offen">${offen ? offen + ' offen' : 'alles beantwortet'}</span>` : ''}
        <span class="bt-q">${Q.datei ? `Modell: ${esc(Q.datei)}${Q.gelesen ? ' · gelesen ' + esc((window.bpTag ? bpTag(Q.gelesen) : Q.gelesen.slice(0, 10))) : ''}${Q.programm ? ' · ' + esc(Q.programm) : ''}` : ''}</span>
        <button type="button" class="btn" data-bthand title="Bauteil ohne Modell anlegen: Menge eintippen, Aufbau aus dem Baukasten">＋ Zeile von Hand</button>
        <input type="file" accept=".ifc" data-btdatei hidden></div><div class="bt-w"></div>`;
      if (!ZZ.length) {   // ohne Modell: IFC einlesen oder Zeilen von Hand
        el.innerHTML = `<div class="bt-l">${kopf}<p class="bt-leer">Die Checkliste liest das Gebäudemodell (IFC, z. B. aus Allplan) und legt je Gruppe gleicher Bauteile eine Zeile an:
          was passiert damit, wird es berechnet, welcher Aufbau aus dem Bauteil-Baukasten. Bauteile aus dem Allplan-Katalog der Bauplattform bringen ihren Aufbau schon mit.
          Die Antworten stehen im Projektmodell – Kosten, Ausschreibung und Termine nehmen sie von dort.</p></div>`;
        return;
      }
      el.innerHTML = `<div class="bt-l">${kopf}${BEREICH.map(([b, t]) => { const R = ZZ.filter((z) => z.bereich === b); return R.length ? `<section class="bt-b"><h4>${esc(t)}</h4>${R.map(zeileHtml).join('')}</section>` : ''; }).join('')}</div>`;
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
      if (t.closest('[data-btlesen]')) return el.querySelector('[data-btdatei]').click();
      if (t.closest('[data-bthand]')) {
        const n = window.bpEingabe ? await bpEingabe('Was für ein Bauteil? (z. B. „Trockenbauwand Flur“, „Dämmung oberste Geschossdecke“)', '') : null; if (!n || !String(n).trim()) return;
        try { Z.d = await (await J(`${basis}/bauteile/hand`, 'POST', { name: String(n).trim() })).json(); const L2 = L().zeilen; Z.auf = L2.length ? L2[L2.length - 1].id : null; zeichne(); } catch (er) { sag(er.message, true); }
        return;
      }
      if (t.closest('[data-btaus]')) { Z.ausgabe = true; return el.querySelector('[data-btdatei]').click(); }
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
      if (Z.laeuft) return; Z.laeuft = true;
      const fd = new FormData(); fd.append('datei', f, f.name);
      const stop = warte(aus ? 'IFC wird geschrieben …' : 'Modell wird gelesen …');
      try {
        if (aus) {
          const r = await J(`${basis}/bauteile/ifc`, 'POST', fd), b = await r.blob();
          const m = /filename\*=UTF-8''([^;]+)/.exec(r.headers.get('Content-Disposition') || ''), a = document.createElement('a');
          a.href = URL.createObjectURL(b); a.download = m ? decodeURIComponent(m[1]) : 'modell-massnahmen.ifc'; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000);
          sag('IFC mit Maßnahmen erstellt – Nummern, Status und Aufbau stehen in den Bauteilen.');
        } else {
          Z.d = await (await J(`${basis}/bauteile/lesen`, 'POST', fd)).json(); Z.auf = null;
          sag(`Modell gelesen: ${L().zeilen.length} Zeilen` + ((Z.d.hinweise || []).length ? ' – ' + Z.d.hinweise[0] : ''));
          zeichne();
        }
      } catch (er) { sag(er.message, true); } finally { stop(); Z.laeuft = false; const w = el.querySelector('.bt-w'); if (w) w.textContent = ''; }
    };
    el.innerHTML = '<div class="bt-l"><div class="bt-w">Lade …</div></div>';
    laden().catch((e) => { el.innerHTML = `<div class="bt-l"><p class="bt-leer">${esc(e.message)}</p></div>`; });
  }
  window.bpBauteile = { mount };
}());
