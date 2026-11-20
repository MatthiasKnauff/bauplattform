/* Verknüpfungen (GO 20.11.2026, Mock „Verknüpfungen neu“: A1 B1 C1 D1 E1) – Seite im Gebäudemodell, gebaut nach dem Whiteboard
   „Gebäudemodell – Verknüpfungen“ (Hilfe: hilfe_seiten/gebaeudemodell.md, dieselben Kennzeichen):
     links A1 Assistent (Fragen · Baukasten) und A2 IFC-Datei (= die frühere Kiste „Pläne“) → Mitte B Gebäudemodell mit B1–B5
     → rechts C1–C6 Kosten, Wärmeschutz, Ausschreibung, Bauzeitenplan, Honorar, Bauantrag. Grün holt aus B, lila holt ein Ergebnis aus B4.
     Darunter der Weg von der Skizze zum Plan (I–V, der aktuelle Schritt markiert, Klick führt hin) und die Regeln R1–R8.
   A1: eingestellt wird im Feld rechts (Klick auf eine App): Änderungen automatisch · mit Übernahme · getrennt, die Version der App (★ gilt,
       eine Version wählen = fest auf ihr, „aktuell“ = wieder folgen) und die wartenden Hinweise.
   B1: keine Wahl der Richtung – sie steht im Konzept (Kern modell.STANDARD); C1: an der App nur, was gilt (★);
   D1: Termine sind ein Ergebnis in B4 (Bauzeitenplan = C4), „Zeiten“ hängt nicht am Modell und fehlt; Bautagebuch liest nur die Termine.
   Regeln und Daten: Kern (bpcore/modell.py, /api/bp/modell/<pid>) – hier ist nur die Oberfläche. Rückgängig über undo.js.
   Schmal (Bereich rechts, Handy): alles untereinander, ohne Pfeile.

   bpKarte.mount(el, pid) → { neu() }. Prüft tools/tests/ui/karte.mjs. */
(function () {
  if (window.bpKarte) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = (u, m, b) => fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); return j; });
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const tag = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
  // Apps nach dem Konzept: Kennzeichen, Name, was sie holen, Farbe (g = holt aus B, l = holt ein Ergebnis aus B4), woher (Zeile in B), App-Schlüssel
  const C = [['kosten', 'C1', 'Kosten', 'Preise aus den Bauteilen mit Aufbau (B2)', 'g', 'b2', 'baukosten'],
    ['waermeschutz', 'C2', 'Wärmeschutz', 'U-Werte und Nachweis aus den Bauteilen der Hülle (B2) – Dämmdicken gehen zurück ins Modell', 'g', 'b2', 'waermeschutz'],
    ['ausschreibung', 'C3', 'Ausschreibung', 'LV-Texte aus den Aufbauten (B2)', 'g', 'b2', 'ava'],
    ['termine', 'C4', 'Bauzeitenplan', 'Leistungen aus den Angaben (B1) und den Ausführungseinheiten (B3); legt die Termine in B4 ab', 'g', 'b3', 'gantt'],
    ['honorar', 'C5', 'Honorar', 'anrechenbare Kosten aus den Ergebnissen (B4)', 'l', 'b4', 'honorar'],
    ['bauantrag', 'C6', 'Bauantrag', 'Nachweis und Flächen aus den Ergebnissen (B4)', 'l', 'b4', 'bauantrag']];
  const ABSEITS = [['bautagebuch', 'Bautagebuch', 'bautagebuch']];   // liest nur die Termine aus B4
  const UEB = [['auto', 'automatisch'], ['uebernahme', 'mit Übernahme'], ['getrennt', 'getrennt']];
  const REGELN = ['Ein Gebäudemodell (B) je Projekt; A1 oder A2 liefert den Planstand, es gilt immer einer.', 'Die 3D-Ansicht (B5) liegt in jeder App C1–C6 daneben, anklickbar, mit eigener Färbung.',
    'Jede Änderung an einem Bauteil (B2) landet direkt in B – egal aus welcher App C1–C6.', 'Keine App C liest in den Daten einer anderen; Ergebnisse liegen in B4.',
    'C1 erzeugt aus B2 die Preise, C2 die U-Werte, C3 die LV-Texte, C4 aus B1 und B3 die Leistungen.', 'Was in C1–C6 von Hand angepasst ist, bleibt stehen und bekommt einen Hinweis.',
    'C3 im Entwurf schreibt mit; verschickt → Bieterrundschreiben, vergeben → Nachtrag, beides als Entwurf.', 'Zwei Etiketten je Bauteil: Aufbau (B2 → C1, C2, C3) und Ausführungseinheit (B3 → C4).'];

  const STIL = `.vk{display:flex;flex-direction:column;gap:.8rem;padding:.8rem .9rem 1.2rem;font-size:.9rem;min-width:0}
.vk button{font:inherit;color:inherit;cursor:pointer}
.vk-b{padding:.3rem .65rem;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));background:var(--card,#fff)}.vk-b[disabled]{opacity:.45;cursor:default}
.vk-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,320px);gap:.9rem;align-items:start}
.vk-bild{position:relative;display:grid;grid-template-columns:minmax(140px,.8fr) minmax(220px,1.15fr) minmax(170px,1fr);gap:.8rem clamp(40px,7%,110px);align-items:center;padding:1rem;border:1px solid var(--line,#d5d9de);border-radius:calc(10px*var(--rk,1));background:var(--card,#fff)}
.vk-sp{display:flex;flex-direction:column;gap:.6rem;min-width:0}
.vk-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.vk-svg path{fill:none}
.vk-k{position:relative;z-index:1;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));background:var(--card2,var(--card,#fff));box-shadow:var(--sh0,0 1px 3px rgba(0,0,0,.12));padding:.4rem .6rem;min-width:0;text-align:left}
.vk-k.c{cursor:pointer}.vk-k.sel{outline:2px solid var(--y,#2f6fb3);outline-offset:1px}.vk-k.weg{border-style:dashed;box-shadow:none;opacity:.7}
.vk-kz{position:absolute;left:-.55rem;top:-.55rem;background:var(--y,#2f6fb3);color:#fff;font-size:.68rem;font-weight:700;border-radius:5px;padding:0 .3rem;line-height:1.35}
.vk-k b{display:block}.vk-k small{display:block;opacity:.7;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vk-ch{display:flex;gap:.3rem;align-items:center;flex-wrap:wrap;margin-top:.15rem}
.vk-c{font-size:.72rem;border:1px solid currentColor;border-radius:1rem;padding:0 .4rem;white-space:nowrap}.vk-c.g{color:var(--ok,#1e8a4c)}.vk-c.l{color:#7a3fb0}.vk-c.m{color:var(--mute,#777)}
.vk-z{min-width:1.2rem;height:1.2rem;padding:0 .3rem;border-radius:1rem;background:var(--red,#b42318);color:#fff;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-style:normal}
.vk-m{border:2px solid var(--y,#2f6fb3);border-radius:calc(10px*var(--rk,1));background:color-mix(in srgb,var(--y,#2f6fb3) 5%,var(--card,#fff));padding:.55rem .7rem;display:flex;flex-direction:column;gap:.35rem;position:relative;z-index:1}
.vk-m h4{margin:0;font-size:.98rem;color:var(--y,#2f6fb3)}.vk-m .st{font-size:.78rem;opacity:.75}
.vk-mz{display:grid;grid-template-columns:2rem 1fr;gap:.4rem;font-size:.84rem;align-items:baseline}.vk-mz i{font-style:normal;font-weight:700;font-size:.72rem;color:var(--y,#2f6fb3)}
.vk-ab{font-size:.8rem;opacity:.8;display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}
.vk-weg{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.45rem}
.vk-weg button{border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));background:var(--card,#fff);padding:.35rem .5rem;text-align:left;font-size:.8rem;min-width:0}
.vk-weg button b{display:block;font-size:.85rem}.vk-weg button small{opacity:.7}.vk-weg button.jetzt{border-color:var(--y,#2f6fb3);background:color-mix(in srgb,var(--y,#2f6fb3) 12%,var(--card,#fff))}
.vk-weg button.fertig{opacity:.7}
.vk-rg ol{margin:.3rem 0 0;padding-left:1.4rem;font-size:.84rem}.vk-rg li{margin:.1rem 0}
.vk-det{border:1px solid var(--line,#d5d9de);border-radius:calc(10px*var(--rk,1));background:var(--card,#fff);padding:.8rem .9rem;display:flex;flex-direction:column;gap:.6rem;min-width:0}
.vk-det h3{margin:0;font-size:1rem;display:flex;gap:.5rem;align-items:center}.vk-det h3 span{flex:1}
.vk-f{display:flex;flex-direction:column;gap:.25rem}.vk-f>label{font-size:.76rem;opacity:.7}
.vk-seg{display:inline-flex;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));overflow:hidden;background:var(--card,#fff);flex-wrap:wrap;max-width:100%}
.vk-seg>button{border:0;border-left:1px solid var(--line,#d5d9de);background:none;padding:.3rem .6rem}.vk-seg>button:first-child{border-left:0}
.vk-seg>button.on{background:color-mix(in srgb,var(--y,#2f6fb3) 16%,transparent);font-weight:600}
.vk-vl{display:flex;flex-direction:column;gap:.15rem;max-height:12rem;overflow:auto}
.vk-vl button{display:flex;justify-content:space-between;gap:.6rem;border:0;background:none;padding:.2rem .4rem;border-radius:5px;text-align:left}
.vk-vl button.on{background:color-mix(in srgb,var(--y,#2f6fb3) 13%,transparent);font-weight:600}.vk-vl small{opacity:.65;white-space:nowrap}
.vk-h{border-top:1px solid var(--line,#d5d9de);padding-top:.5rem;display:flex;flex-direction:column;gap:.3rem}.vk-h small{opacity:.75}.vk-h .vk-grp{display:flex;gap:.35rem;flex-wrap:wrap}
.vk-n{font-size:.8rem;opacity:.75;margin:0}
.vk-opt{display:flex;gap:.5rem;align-items:flex-start;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.45rem .6rem;cursor:pointer}.vk-opt small{opacity:.75}
.vk-wl{display:flex;flex-direction:column;gap:.3rem;margin:.6rem 0;max-height:50vh;overflow:auto}.vk-vlg{max-height:60vh;overflow:auto;display:flex;flex-direction:column;gap:.25rem;margin:.6rem 0}
.vk-vlg div{display:flex;gap:.6rem;justify-content:space-between}.vk-vlg small{opacity:.65;white-space:nowrap}.vk-vlg .zr{opacity:.45;text-decoration:line-through}
.vk-mittel .vk-wrap,.vk-eng .vk-wrap{grid-template-columns:minmax(0,1fr)}
.vk-eng .vk-bild{grid-template-columns:minmax(0,1fr);gap:.6rem;padding:.6rem}.vk-eng .vk-svg{display:none}.vk-eng .vk-weg{grid-template-columns:minmax(0,1fr)}`;
  function stil(doc) { if (doc.getElementById('vk-stil')) return; const s = doc.createElement('style'); s.id = 'vk-stil'; s.textContent = STIL; doc.head.appendChild(s); }

  function mount(el, pid) {
    stil(el.ownerDocument || document);
    const Z = { D: null, app: null, hin: {} };
    el.classList.add('vk'); el.innerHTML = '<p class="vk-n">Verknüpfungen werden geladen …</p>';
    const basis = `api/bp/modell/${pid}`;
    const link = (a) => (Z.D.links || []).find((x) => x.app === a) || null;
    const appConf = (key) => ((window.BPHead && BPHead.conf && BPHead.conf.apps) || []).find((x) => x.key === key);
    const appStaende = (a) => ((Z.D.app_staende || {})[a] || []);
    const giltApp = (a) => appStaende(a).find((x) => x.gilt);
    const ueb = (l) => (!l ? '' : l.zustand === 'getrennt' ? 'getrennt' : l.uebernahme === 'auto' ? 'auto' : 'uebernahme');
    async function tu(u, m, b, text, rueck) {   // jede Antwort des Kerns trägt den ganzen Stand der Seite
      try {
        const r = await J(basis + u, m, b); Z.D = r; Z.hin = {}; zeichne(); if (text) sag(typeof text === 'function' ? text(r) : text);
        if (rueck && window.rueckgaengig) rueckgaengig(rueck, () => tu('/rueck', 'POST', {}), 10000, () => tu('/vor', 'POST', {}));   // Verlauf der Verknüpfungen im Kern
        return r;
      } catch (e) { sag(e.message, true); return null; }
    }
    const setze = (a, d, text) => tu(`/link/${a}`, 'PUT', d, '', text || 'Verknüpfung geändert');

    /* Weg von der Skizze zum Plan (E1): I Assistent · II Skizze („Assistent“/von Hand) · III IFC eingelesen · IV Abgleich · V Planstand IFC gilt */
    function wegStufe() {
      const m = Z.D.modell || {}, Q = ((m.bauteilliste || {}).quelle) || {}, S = Z.D.staende || [], art = String(Q.art || '');
      const ifc = S.some((s) => /ifc/i.test(`${s.art || ''} ${s.kommentar || ''} ${s.datei || ''}`)) || /ifc/.test(art);
      const entwurf = S.some((s) => s.entwurf);
      if (entwurf) return 4;
      if (ifc && (m.bauteilliste || {}).zeilen) return 5;
      if (ifc) return 3;
      if ((m.bauteilliste || {}).zeilen || (m.baukasten || {}).koerper) return 2;
      return 1;
    }
    const WEG = [['I', 'Assistent', 'Fragen oder Baukasten', 'baukasten'], ['II', 'Skizze aus Körpern', 'Planstand „Assistent“', 'baukasten'], ['III', 'IFC einlesen', 'neuer Planstand als Entwurf', 'bauteile'],
      ['IV', 'Abgleich', 'Skizze ↔ Plan bestätigen', 'bauteile'], ['V', 'Planstand „IFC“ gilt', 'Aufbau wandert mit', 'bauteile']];
    function hin(sicht) {   // im Gebäudemodell: Ansicht wechseln; aus einer App: ins Gebäudemodell
      if (location.pathname.split('/').filter(Boolean)[0] === 'gebaeudemodell') { document.dispatchEvent(new CustomEvent('bp:gmSicht', { detail: sicht })); return; }
      const gm = appConf('gebaeudemodell'); if (gm && window.BPHead && BPHead.appUrl) location.href = `${BPHead.appUrl(gm)}/#${sicht}`;
    }

    function kiste(a, kz, name, f) {
      const l = link(a), g = giltApp(a), u = ueb(l);
      return `<div class="vk-k c${Z.app === a ? ' sel' : ''}${u === 'getrennt' ? ' weg' : ''}" data-app="${a}" tabindex="0" role="button" aria-label="${esc(name)}"><span class="vk-kz">${kz}</span><b>${esc(name)}</b>
        <div class="vk-ch"><span class="vk-c ${f}">${f === 'g' ? 'holt aus B' : 'holt Ergebnis'}</span>${u === 'getrennt' ? '<span class="vk-c m">getrennt</span>' : l && l.zustand === 'fest' ? '<span class="vk-c m">fest</span>' : ''}${l && l.offen ? `<i class="vk-z" title="${l.offen} Hinweise warten">${l.offen}</i>` : ''}</div>
        ${l && l.zustand === 'fest' ? `<small>fest: ${esc(l.stand_name || l.stand_ref)}</small>` : g ? `<small>★ ${esc(g.name)}${g.wann ? ' · ' + esc(tag(g.wann).slice(0, 6)) : ''}</small>` : ''}</div>`;
    }
    function feld() {
      const l = Z.app && link(Z.app), c = l && (C.find((x) => x[0] === Z.app) || ABSEITS.find((x) => x[0] === Z.app));
      const L = Z.D.links || [], V = Z.D.verlauf || {};
      if (Z.app === '_plan') {   // A2: Planstände des Gebäudemodells, ★ gilt
        const S = Z.D.staende || [];
        return `<h3><span>IFC-Datei und Planstände</span></h3><p class="vk-n">Es gilt immer genau ein Planstand (R1). Einen anderen wählen, um ihn gelten zu lassen.</p>
          <div class="vk-vl">${S.length ? S.map((s) => `<button type="button" data-ps="${s.nr}" class="${s.gilt ? 'on' : ''}"><span>${s.gilt ? '★ ' : ''}${esc(s.kommentar || 'Planstand')}</span><small>${esc(tag(s.wann))}</small></button>`).join('') : '<p class="vk-n">Noch kein Planstand – einlesen unter „Bauteile“.</p>'}</div>
          <div><button type="button" class="vk-b" data-sicht="bauteile">Plan einlesen …</button></div>`;
      }
      if (!l || !c) {
        const leb = L.filter((x) => x.zustand === 'lebendig'), alle = leb.length && leb.every((x) => x.uebernahme === leb[0].uebernahme) ? leb[0].uebernahme : '';
        return `<h3><span>Verknüpfungen</span></h3><p class="vk-n">Eine App antippen: dort stellst du ein, wie Änderungen aus dem Modell ankommen, welche Version der App gilt, und arbeitest die wartenden Hinweise ab. Die Richtung steht im Konzept (grün holt aus dem Modell, lila holt ein abgelegtes Ergebnis).</p>
          <div class="vk-f"><label>Alle Apps</label><div class="vk-seg">${UEB.slice(0, 2).map(([v, t]) => `<button type="button" data-alle="${v}" class="${alle === v ? 'on' : ''}">${t}</button>`).join('')}</div></div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap"><button type="button" class="vk-b" data-vk="verlauf">Verlauf</button><button type="button" class="vk-b" data-vk="standard"${L.some((x) => x.abweichend) ? '' : ' disabled'}>Standard wiederherstellen</button></div>`;
      }
      const u = ueb(l), S = appStaende(l.app), fest = l.zustand === 'fest', H = Z.hin[l.app], cc = C.find((x) => x[0] === l.app), a = appConf(cc ? cc[6] : c[2]), nm = nameVon(l.app);
      return `<h3><span>${esc(nm)} ↔ Gebäudemodell</span>${l.offen ? `<i class="vk-z">${l.offen}</i>` : ''}</h3>
        <p class="vk-n">${esc(cc ? cc[1] + ' holt ' + cc[3] : 'liest nur die Termine aus B4')}</p>
        <div class="vk-f"><label>Änderungen aus dem Modell</label><div class="vk-seg">${UEB.map(([v, t]) => `<button type="button" data-ueb="${v}" class="${u === v ? 'on' : ''}">${t}</button>`).join('')}</div>
          <p class="vk-n">${u === 'getrennt' ? 'Getrennt: zwischen App und Modell fließt nichts.' : u === 'auto' ? 'Automatisch: Änderungen kommen sofort an.' : 'Mit Übernahme: Änderungen warten als Hinweis, bis du entscheidest.'}</p></div>
        ${u === 'getrennt' ? '' : `<div class="vk-f"><label>Version der App</label><div class="vk-vl"><button type="button" data-ver="" class="${fest ? '' : 'on'}"><span>aktuell – folgt dem Modell</span></button>
          ${fest && !S.some((x) => x.ref === l.stand_ref) ? `<button type="button" class="on" data-ver="*"><span>${esc(l.stand_name || l.stand_ref)}</span><small>fest</small></button>` : ''}
          ${S.map((x) => `<button type="button" data-ver="${esc(x.ref)}" class="${fest && l.stand_ref === x.ref ? 'on' : ''}"><span>${x.gilt ? '★ ' : ''}${esc(x.name)}</span><small>${esc(tag(x.wann))}</small></button>`).join('')}</div>
          <p class="vk-n">${fest ? `Fest auf „${esc(l.stand_name || l.stand_ref)}“: ins Modell fließt nur dieser Stand.` : 'Eine Version wählen = die Linie bleibt auf ihr stehen (fest).'}</p>${S.length ? '' : '<div><button type="button" class="vk-b" data-vk="festhalten">Stand festhalten …</button></div>'}</div>`}
        ${l.abweichend ? '<div><button type="button" class="vk-b" data-vk="std1">Standard dieser App</button></div>' : ''}
        ${l.offen ? (H ? H.map((h) => `<div class="vk-h" data-hid="${h.id}"><b>${esc(h.titel)}</b>${h.daten && h.daten.aenderung ? `<small>${esc(h.daten.aenderung)}</small>` : ''}${((h.daten && h.daten.auswirkungen) || []).slice(0, 4).map((x) => `<small>${esc(x)}</small>`).join('')}
          <div class="vk-grp">${a && h.daten && h.daten.art ? `<a class="vk-b" href="${esc(BPHead.appUrl(a))}/" title="Dieser Hinweis ändert Werte – übernommen wird in der App">In ${esc(nm)} übernehmen</a>` : '<button type="button" class="vk-b" data-hin="uebernommen" title="Zur Kenntnis genommen – der Hinweis ist damit erledigt">Übernehmen</button>'}<button type="button" class="vk-b" data-hin="abgelehnt">Ablehnen</button><button type="button" class="vk-b" data-hin="spaeter">Später</button></div></div>`).join('') : '<p class="vk-n">Hinweise werden geladen …</p>') : '<p class="vk-n">Keine Hinweise.</p>'}
        ${a && window.BPHead && BPHead.appUrl ? `<div><a class="vk-b" href="${esc(BPHead.appUrl(a))}/">↗ ${esc(nm)} öffnen</a></div>` : ''}`;
    }

    function zeichne() {
      const D = Z.D, m = D.modell || {}, ps = (D.staende || []).find((s) => s.gilt), st = wegStufe(), as = (m.assistent || {});
      el.innerHTML = `<div class="vk-wrap"><div style="display:flex;flex-direction:column;gap:.8rem;min-width:0"><div class="vk-bild"><svg class="vk-svg" aria-hidden="true"></svg>
          <div class="vk-sp"><button type="button" class="vk-k c" data-sicht="baukasten" id="vk-a1"><span class="vk-kz">A1</span><b>Assistent</b><small>Fragen · Baukasten</small>${as.type ? `<small>${esc(as.area ? Math.round(as.area) + ' m² · ' : '')}${esc(as.floors ? as.floors + ' Geschosse' : '')}</small>` : '<small>noch keine Angaben</small>'}</button>
            <div class="vk-k c${Z.app === '_plan' ? ' sel' : ''}" data-app="_plan" id="vk-a2" tabindex="0" role="button"><span class="vk-kz">A2</span><b>IFC-Datei</b><small>aus Pläne &amp; Dateien</small>${ps ? `<small>★ ${esc(ps.kommentar || 'Planstand')}</small>` : '<small>noch kein Plan</small>'}</div></div>
          <div class="vk-m" id="vk-b"><span class="vk-kz">B</span><h4>Gebäudemodell</h4><span class="st">${ps ? '★ ' + esc(ps.kommentar || 'Planstand') : 'gilt: Planstand „Assistent“'}</span>
            <div class="vk-mz" id="vk-b1"><i>B1</i><span>Angaben (Assistent)</span></div><div class="vk-mz" id="vk-b2"><i>B2</i><span>Bauteile mit Aufbau · Korb der Aufbauten</span></div>
            <div class="vk-mz" id="vk-b3"><i>B3</i><span>Ausführungseinheiten, z. B. „Dach samt Gaube“</span></div><div class="vk-mz" id="vk-b4"><i>B4</i><span>Ergebnisse: Kosten-Stand · Termine · Nachweis</span></div>
            <div class="vk-mz"><i>B5</i><span>3D in jeder App daneben, anklickbar</span></div></div>
          <div class="vk-sp">${C.map(([a, kz, n, , f]) => kiste(a, kz, n, f)).join('')}</div></div>
        <div class="vk-ab">Lesen nur die Termine aus B4: ${ABSEITS.map(([a, n]) => { const l = link(a); return `<button type="button" class="vk-b${Z.app === a ? ' sel' : ''}" data-app="${a}">${esc(n)}${l && l.offen ? ` <i class="vk-z">${l.offen}</i>` : ''}</button>`; }).join('')} · Bauherrenportal</div>
        <div class="vk-weg" aria-label="Von der Skizze zum Plan">${WEG.map(([k, n, s, z], i) => `<button type="button" data-sicht="${z}" class="${i + 1 === st ? 'jetzt' : i + 1 < st ? 'fertig' : ''}" title="${i + 1 === st ? 'Hier steht das Projekt' : ''}"><b>${k} ${esc(n)}</b><small>${i + 1 === st ? 'jetzt hier' : esc(s)}</small></button>`).join('')}</div>
        <details class="vk-rg" data-klapp="vk-regeln"><summary>Regeln R1–R8</summary><ol>${REGELN.map((r) => `<li>${esc(r)}</li>`).join('')}</ol></details></div>
        <aside class="vk-det">${feld()}</aside></div>`;
      pfeile();
      const l = Z.app && link(Z.app);
      if (l && l.offen && !Z.hin[l.app]) J(`${basis}/hinweise?app=${l.app}`).then((h) => { Z.hin[l.app] = h; if (Z.app === l.app && el.isConnected) { const d = el.querySelector('.vk-det'); if (d) d.innerHTML = feld(); } }, () => {});
    }

    /* Pfeile: aus der Lage der Kisten gerechnet; A → B blau, B → App grün/lila, Wärmeschutz in beide Richtungen; getrennt gestrichelt grau */
    function pfeile() {
      const w = el.clientWidth, eng = w < 640;
      el.classList.toggle('vk-eng', eng); el.classList.toggle('vk-mittel', !eng && w < 1080);
      const K = el.querySelector('.vk-bild'), svg = K && K.querySelector('.vk-svg'); if (!svg || eng) return;
      const k = K.getBoundingClientRect(), r = (q) => el.querySelector(q).getBoundingClientRect(), B = r('#vk-b');
      const farbe = { b: 'var(--y,#2f6fb3)', g: 'var(--ok,#1e8a4c)', l: '#7a3fb0', m: 'var(--mute,#999)' };
      let s = '<defs>' + Object.entries(farbe).map(([n, f]) => `<marker id="vk-p${n}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="${f}"/></marker>`).join('') + '</defs>';
      const bog = (x1, y1, x2, y2, f, breit, strich, beide) => { const dx = (x2 - x1) / 2;
        s += `<path d="M${x1} ${y1}C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}" stroke="${farbe[f]}" stroke-width="${breit}"${strich ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#vk-p${f})"${beide ? ` marker-start="url(#vk-p${f})"` : ''}/>`; };
      for (const q of ['#vk-a1', '#vk-a2']) { const a = r(q); bog(a.right - k.left, a.top + a.height / 2 - k.top, B.left - k.left - 2, a.top + a.height / 2 - k.top < B.top - k.top + 30 ? B.top - k.top + 30 : Math.min(B.bottom - k.top - 20, a.top + a.height / 2 - k.top), 'b', 1.8); }
      for (const [a, , , , f, von] of C) {
        const l = link(a), box = el.querySelector(`.vk-k[data-app="${a}"]`); if (!box) continue;
        const z = r('#vk-' + von), b = box.getBoundingClientRect(), u = ueb(l);
        bog(B.right - k.left, z.top + z.height / 2 - k.top, b.left - k.left - 2, b.top + b.height / 2 - k.top, u === 'getrennt' ? 'm' : f, Z.app === a ? 3 : 1.6, u === 'getrennt' || (l && l.zustand === 'fest'), l && l.richtung === 'beide' && a === 'waermeschutz');
      }
      svg.innerHTML = s;
    }

    function standWahl(l, name) {   // ohne Versionen in der App: frei benennen
      return bpEingabe(`Welcher Stand von „${name}“ wird festgehalten?`, l.stand_name || `Stand vom ${tag(new Date().toISOString())}`).then((n) => (n && String(n).trim() ? { stand_ref: '', stand_name: String(n).trim() } : null));
    }
    /* Zurück auf „aktuell“ (Mock „Verknüpfungen mit Versionen“, GO 19.11.2026): war die Linie fest auf einer Version, die nicht gilt – fragen:
       diese Version übernehmen (wird die gültige ★) oder nur wieder dem aktuellen Stand folgen */
    function zurueck(l, name) {
      const V = appStaende(l.app).find((x) => x.ref === l.stand_ref), n = V ? V.name : '';
      if (!V || V.gilt) return setze(l.app, { zustand: 'lebendig' });
      return new Promise((ok) => modalBox(`<h3>${esc(name)}: wieder auf „aktuell“</h3><p class="vk-n">Die Linie war fest auf „${esc(n)}“${V.wann ? ` (${esc(tag(V.wann))})` : ''}.</p>
        <div class="vk-wl"><label class="vk-opt"><input type="radio" name="vkz" value="gilt" checked> <span><b>„${esc(n)}“ übernehmen</b><br><small>„${esc(n)}“ wird die gültige Version (★) von ${esc(name)}. Die bisherige bleibt als Version erhalten.</small></span></label>
        <label class="vk-opt"><input type="radio" name="vkz" value="folgen"> <span><b>Nur wieder dem aktuellen Stand folgen</b><br><small>„${esc(n)}“ bleibt, wie sie ist.</small></span></label></div>
        <div class="row" style="flex-direction:row;justify-content:flex-end;gap:.4rem"><button type="button" class="btn" data-m="ab">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Übernehmen</button></div>`, async (m, bg, close) => {
        if (m === 'ab') { close(); ok(null); return; }
        if (m !== 'ok') return;
        const gilt = bg.querySelector('[name="vkz"]:checked').value === 'gilt'; close();
        if (gilt) { try { await J(`${basis}/gilt`, 'POST', { ref: V.ref }); } catch (e) { sag(e.message, true); ok(null); return; } sag(`„${n}“ ist jetzt die gültige Version von ${name}.`); }
        ok(await setze(l.app, { zustand: 'lebendig' }));
      }));
    }
    const nameVon = (a) => { const c = C.find((x) => x[0] === a) || ABSEITS.find((x) => x[0] === a); return c ? (c[1].length === 2 ? c[2] : c[1]) : a; };

    el.onclick = async (e) => {
      if (!Z.D) return;
      const t = e.target, q = (s) => t.closest(s);
      const si = q('[data-sicht]'); if (si && !q('.vk-det [data-ps]')) return hin(si.dataset.sicht);
      const l = Z.app && link(Z.app);
      if (q('[data-ueb]') && l) { const v = q('[data-ueb]').dataset.ueb; if (v === ueb(l)) return;
        return setze(l.app, v === 'getrennt' ? { zustand: 'getrennt' } : { ...(l.zustand === 'getrennt' ? { zustand: 'lebendig' } : {}), uebernahme: v }); }
      if (q('[data-ver]') && l) { const ref = q('[data-ver]').dataset.ver;
        if (ref === '') return l.zustand === 'fest' ? zurueck(l, nameVon(l.app)) : null;
        if (ref === '*' || (l.zustand === 'fest' && l.stand_ref === ref)) return;
        const x = appStaende(l.app).find((y) => y.ref === ref); if (x) return setze(l.app, { zustand: 'fest', stand_ref: x.ref, stand_name: x.name }); return; }
      if (q('[data-ps]')) { const nr = +q('[data-ps]').dataset.ps, s = (Z.D.staende || []).find((x) => x.nr === nr); if (!s || s.gilt) return;
        if (!(await bpFrage(`Planstand „${s.kommentar || 'Planstand'}“ gelten lassen? Die Apps arbeiten dann damit.`, { ok: 'Gelten lassen' }))) return;
        try { await J(`${basis}/planstand/${nr}`, 'POST', { gilt: true }); } catch (er) { sag(er.message, true); return; } return api.neu(); }
      if (q('[data-alle]')) return tu('/alle', 'POST', { uebernahme: q('[data-alle]').dataset.alle }, '', 'Alle Verknüpfungen geändert');
      if (q('[data-hin]')) return tu(`/hinweis/${q('[data-hid]').dataset.hid}`, 'POST', { status: q('[data-hin]').dataset.hin });
      const vk = q('[data-vk]');
      if (vk) {
        const a = vk.dataset.vk;
        if (a === 'std1') return tu('/standard', 'POST', { app: Z.app }, '', 'Standard der Verknüpfung');
        if (a === 'festhalten' && l) { const w = await standWahl(l, nameVon(l.app)); if (w) return setze(l.app, { zustand: 'fest', ...w }); return; }
        if (a === 'standard') { if (await bpFrage('Alle Verknüpfungen auf den Standard zurücksetzen? Alle Apps folgen dann dem Modell „mit Übernahme“.', { ok: 'Zurücksetzen' })) return tu('/standard', 'POST', {}, '', 'Standard aller Verknüpfungen'); return; }
        if (a === 'verlauf') {
          const E = ((Z.D.verlauf || {}).eintraege || []);
          return modalBox(`<h3>Verlauf der Verknüpfungen</h3><div class="vk-vlg">${E.length ? E.map((x) => `<div class="${x.zurueck ? 'zr' : ''}"><span>${esc(x.text)}</span><small>${esc(tag(x.wann))} · ${esc(x.wer || '')}</small></div>`).join('') : '<p class="vk-n">Noch nichts geändert – es gilt der Standard.</p>'}</div><div class="row" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn primary" data-m="zu">Schließen</button></div>`, (m, bg, close) => { if (m === 'zu') close(); });
        }
        return;
      }
      const box = q('[data-app]'); if (box) { Z.app = Z.app === box.dataset.app ? null : box.dataset.app; zeichne(); }
    };
    el.onkeydown = (e) => { const box = e.target.closest && e.target.closest('.vk-k[data-app]'); if (box && e.target === box && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); box.click(); } };
    if (window.ResizeObserver) { let b0 = 0; new ResizeObserver(() => { if (!el.isConnected || !Z.D) return; const b = el.clientWidth; if (b !== b0) { b0 = b; pfeile(); } }).observe(el); }
    const api = { neu: () => J(basis).then((r) => { Z.D = r; Z.hin = {}; zeichne(); }) };
    J(basis).then((r) => { Z.D = r; const ziel = window.bpKarteZiel && link(window.bpKarteZiel), o = (r.links || []).find((x) => x.offen && (C.some((c) => c[0] === x.app) || ABSEITS.some((c) => c[0] === x.app))); window.bpKarteZiel = null;
      Z.app = ziel ? ziel.app : o ? o.app : null; zeichne(); }, (e) => { el.innerHTML = `<p class="vk-n">${esc(e.message)}</p>`; });
    return api;
  }
  window.bpKarte = { mount };
})();
