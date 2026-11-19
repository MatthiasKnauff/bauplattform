/* Verknüpfungs-Karte – derselbe Baustein in der App „Planung“ und als Reiter „Verknüpfungen“ im Bereich rechts (Etappe 4 des Projektmodells,
   Entwurf „Planung – Verknüpfungen“, entschieden am 15.11.2026). In der Mitte das Projektmodell mit seinen Planständen (seit 17.11.2026 keine eigenen Modell-Stände), links und rechts je App
   eine Kiste; je App genau eine Linie. An der Linie: Richtung (Pfeilspitze), Übernahme (Beschriftung: mit Übernahme / automatisch), Zustand
   (lebendig, fest, getrennt) und die roten Zähler der offenen Hinweise. Der runde Griff am Modell lässt sich auf einen Stand ziehen (fest)
   oder zurück auf den Arbeitsstand (lebendig); das Ende an der Kiste ebenso auf einen Stand der App (ihre Versionen stehen in der Kiste).
   Die Beschriftung lässt sich ziehen – die Linie biegt sich mit; der Verlauf wird je Projekt im Browser gemerkt. Eigenes Rückgängig nur für die Verknüpfungen. Regeln und Daten: Kern (bpcore/modell.py,
   /api/bp/modell/<pid>) – hier ist nur die Oberfläche. Schmal (Bereich rechts, Handy): Kisten untereinander, Einstellungen als Knöpfe.

   Versionen in den Kisten = Versionsmenü der App, ★ gilt (Kern modell_versionen.py); zurück auf „aktuell“ fragt: Version übernehmen oder nur folgen (19.11.2026).

   bpKarte.mount(el, pid)   – füllt ein Feld; wird erst bei Bedarf geladen (seite.js, App „Planung“). Prüft tools/tests/ui/karte.mjs. */
(function () {
  if (window.bpKarte) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const J = (u, m, b) => fetch(u, { method: m || 'GET', credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Der Server ist gerade nicht erreichbar.'); return j; });
  const sag = (t, f) => { if (window.toast) window.toast(t, f); };
  const LINKS = ['plaene', 'termine', 'kosten', 'waermeschutz'];   // Kisten links vom Modell; alle anderen rechts
  const APPKEY = { termine: 'gantt', kosten: 'baukosten', ausschreibung: 'ava' };   // Name auf der Karte → Schlüssel der App
  const UEB = { uebernahme: 'mit Übernahme', auto: 'automatisch' };
  const richtungText = (l, r) => (r === 'beide' ? 'beide Richtungen' : r === 'zur_app' ? `Modell → ${l.name}` : `${l.name} → Modell`);
  const art = (l) => (l.zustand !== 'lebendig' ? l.zustand : l.uebernahme === 'auto' ? 'auto' : 'ueb');
  const artText = (l) => (l.zustand !== 'lebendig' ? l.zustand : UEB[l.uebernahme]);
  const tag = (s) => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(s || ''); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
  const heute = () => { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`; };

  const STIL = `.vk{display:flex;flex-direction:column;gap:.7rem;padding:.8rem .9rem 1.2rem;font-size:.9rem;min-width:0}
.vk-bar{display:flex;gap:.5rem .9rem;flex-wrap:wrap;align-items:center}
.vk-grp{display:flex;gap:.35rem;flex-wrap:wrap}
.vk button{font:inherit;color:inherit;cursor:pointer}
.vk-b{padding:.35rem .7rem;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));background:var(--card,#fff)}
.vk-b[disabled]{opacity:.45;cursor:default}
.vk-seg{display:inline-flex;align-items:stretch;border:1px solid var(--line,#d5d9de);border-radius:calc(6px*var(--rk,1));overflow:hidden;background:var(--card,#fff);max-width:100%;flex-wrap:wrap}
.vk-seg>span{padding:.35rem .6rem;opacity:.7}.vk-seg>button{border:0;border-left:1px solid var(--line,#d5d9de);background:none;padding:.35rem .65rem}
.vk-seg>button:first-child{border-left:0}.vk-seg>button.on{background:color-mix(in srgb,var(--y,#2f6fb3) 16%,transparent);font-weight:600}.vk-seg>button[disabled]{opacity:.45;cursor:default}
.vk-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,320px);gap:.9rem;align-items:start}
.vk-karte{position:relative;display:grid;grid-template-columns:minmax(150px,1fr) minmax(150px,.9fr) minmax(150px,1fr);gap:1rem clamp(48px,9%,150px);align-items:center;padding:1rem;border:1px solid var(--line,#d5d9de);border-radius:calc(10px*var(--rk,1));background:var(--card,#fff);touch-action:pan-y}
.vk-sp{display:flex;flex-direction:column;gap:.8rem;min-width:0}
.vk-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.vk-svg path{fill:none;stroke-width:1.6}.vk-svg .k-ueb{stroke:var(--warn,#9a6a12)}.vk-svg .k-auto{stroke:var(--ok,#1e8a4c)}.vk-svg .k-fest{stroke:var(--mute,#777);stroke-dasharray:5 4}
.vk-svg polygon.k-ueb{fill:var(--warn,#9a6a12)}.vk-svg polygon.k-auto{fill:var(--ok,#1e8a4c)}.vk-svg polygon.k-fest{fill:var(--mute,#777)}
.vk-box{position:relative;z-index:1;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));background:var(--card2,var(--card,#fff));box-shadow:var(--sh0,0 1px 3px rgba(0,0,0,.12));min-width:0;cursor:pointer}
.vk-box.sel{outline:2px solid var(--y,#2f6fb3);outline-offset:1px}.vk-box.k-getrennt{border-style:dashed;box-shadow:none;opacity:.75}
.vk-bh{display:flex;align-items:center;gap:.4rem;padding:.35rem .6rem;font-weight:600}.vk-bh b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vk-st{display:flex;gap:.4rem;justify-content:space-between;padding:.2rem .6rem;font-size:.82rem;white-space:nowrap;overflow:hidden}.vk-st span{overflow:hidden;text-overflow:ellipsis}.vk-st small{opacity:.65}
.vk-st.on{background:color-mix(in srgb,var(--y,#2f6fb3) 13%,transparent)}.vk-st:last-child{border-radius:0 0 calc(8px*var(--rk,1)) calc(8px*var(--rk,1))}
.vk-sl{max-height:6.9rem;overflow:auto}.vk-box .vk-st.ziel{outline:2px dashed var(--y,#2f6fb3);outline-offset:-2px}
.vk-mod{border-color:var(--y,#2f6fb3);cursor:default}.vk-mod .vk-bh{color:var(--y,#2f6fb3)}.vk-ml{max-height:11.5rem;overflow:auto}
.vk-mod .vk-st.ziel{outline:2px dashed var(--y,#2f6fb3);outline-offset:-2px}
.vk-z{min-width:1.25rem;height:1.25rem;padding:0 .3rem;border-radius:1rem;background:var(--red,#b42318);color:#fff;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-style:normal}
.vk-lab{position:absolute;z-index:2;transform:translate(-50%,-50%);padding:.1rem .55rem;border-radius:1rem;border:1px solid;background:var(--card,#fff);font-size:.76rem!important;white-space:nowrap;display:inline-flex;gap:.3rem;align-items:center}
.vk-lab.k-ueb{border-color:var(--warn,#9a6a12);color:var(--warn,#9a6a12)}.vk-lab.k-auto{border-color:var(--ok,#1e8a4c);color:var(--ok,#1e8a4c)}.vk-lab.k-fest,.vk-lab.k-getrennt{border-color:var(--mute,#777);color:var(--mute,#777)}
.vk-bh .vk-lab{position:static;transform:none}.vk-lab[hidden]{display:none}
.vk-lab .vk-z{min-width:1.05rem;height:1.05rem;font-size:.68rem}
.vk-pf,.vk-griff{position:absolute;z-index:3;width:14px;height:14px;transform:translate(-50%,-50%);border:0;background:none;padding:0;border-radius:50%}
.vk-griff::after{content:"";position:absolute;inset:2px;border-radius:50%;border:2px solid currentColor;background:var(--card,#fff)}
.vk-griff,.vk-pf{cursor:grab;touch-action:none}.vk-karte>.vk-lab{touch-action:none}.vk-wl{display:flex;flex-direction:column;gap:.3rem;margin:.6rem 0;max-height:50vh;overflow:auto}.vk-wl button{text-align:left}.vk-griff.k-ueb{color:var(--warn,#9a6a12)}.vk-griff.k-auto{color:var(--ok,#1e8a4c)}.vk-griff.k-fest{color:var(--mute,#777)}
.vk-det{border:1px solid var(--line,#d5d9de);border-radius:calc(10px*var(--rk,1));background:var(--card,#fff);padding:.8rem .9rem;display:flex;flex-direction:column;gap:.6rem;min-width:0}
.vk-det h3{margin:0;font-size:1rem;display:flex;gap:.5rem;align-items:center}.vk-det h3 span{flex:1}
.vk-f{display:flex;flex-direction:column;gap:.2rem}.vk-f>label{font-size:.76rem;opacity:.7}
.vk-h{border-top:1px solid var(--line,#d5d9de);padding-top:.55rem;display:flex;flex-direction:column;gap:.3rem}.vk-h b{font-weight:600}.vk-h small{opacity:.75}
.vk-n{font-size:.8rem;opacity:.7;margin:0}
.vk-mittel .vk-wrap,.vk-eng .vk-wrap{grid-template-columns:minmax(0,1fr)}.vk-eng .vk-karte{grid-template-columns:minmax(0,1fr);gap:.6rem;padding:.6rem}.vk-eng .vk-m{order:-1}.vk-eng .vk-sp{gap:.6rem}
.vk-eng .vk-svg,.vk-eng .vk-pf,.vk-eng .vk-griff{display:none}.vk-eng .vk-lab{position:static;transform:none}
.vk-opt{display:flex;gap:.5rem;align-items:flex-start;border:1px solid var(--line,#d5d9de);border-radius:calc(8px*var(--rk,1));padding:.45rem .6rem;cursor:pointer}.vk-opt small{opacity:.75}
.vk-vl{max-height:60vh;overflow:auto;display:flex;flex-direction:column;gap:.25rem;margin:.6rem 0}.vk-vl div{display:flex;gap:.6rem;justify-content:space-between}.vk-vl small{opacity:.65;white-space:nowrap}.vk-vl .zr{opacity:.45;text-decoration:line-through}`;
  function stil() { if (document.getElementById('vk-stil')) return; const s = document.createElement('style'); s.id = 'vk-stil'; s.textContent = STIL; document.head.appendChild(s); }

  function mount(el, pid) {
    stil();
    const Z = { D: null, app: null, hin: {}, zieh: null, gezogen: false };
    const BIEGE = (() => { try { return JSON.parse(localStorage.getItem('bp.vk.biege.' + pid) || '{}') || {}; } catch { return {}; } })();   // je Linie: Versatz der Beschriftung [dx, dy]
    const biegeMerken = () => { try { localStorage.setItem('bp.vk.biege.' + pid, JSON.stringify(BIEGE)); } catch { /* egal */ } };
    el.classList.add('vk'); el.innerHTML = '<p class="vk-n">Verknüpfungen werden geladen …</p>';
    const basis = `api/bp/modell/${pid}`;
    const link = (a) => Z.D.links.find((x) => x.app === a);
    async function tu(u, m, b, text) {   // jede Antwort des Kerns trägt den ganzen Stand der Karte
      try { const r = await J(basis + u, m, b); Z.D = r; Z.hin = {}; zeichne(); if (text) sag(typeof text === 'function' ? text(r) : text); return r; } catch (e) { sag(e.message, true); return null; }
    }
    const setze = (a, d) => tu(`/link/${a}`, 'PUT', d);

    const msName = (nr) => { const s = (Z.D.staende || []).find((x) => x.nr === nr); return s ? s.kommentar : String(nr); };
    const appStaende = (l) => ((Z.D.app_staende || {})[l.app] || []);
    const festRef = (l) => (l.zustand !== 'fest' ? '' : appStaende(l).some((x) => x.ref === l.stand_ref) ? l.stand_ref : '*');   // '*' = frei benannter Stand, der nicht in der Liste der App steht
    const kiste = (l) => { const f = festRef(l), ms = l.zustand === 'fest' && l.modell_stand ? `<small>Planstand ${esc(msName(l.modell_stand))}</small>` : ''; return `<div class="vk-box k-${art(l)}${Z.app === l.app ? ' sel' : ''}" data-app="${l.app}" tabindex="0" role="button" aria-label="${esc(l.name)}: ${esc(richtungText(l, l.richtung))}, ${esc(artText(l))}">
      <div class="vk-bh"><b>${esc(l.name)}</b><button type="button" class="vk-lab k-${art(l)}" data-lab="${l.app}" title="${l.zustand === 'lebendig' ? 'Tippen wechselt zwischen „mit Übernahme“ und „automatisch“' : 'Einstellungen dieser Linie'}">${esc(artText(l))}${l.offen ? `<i class="vk-z">${l.offen}</i>` : ''}</button></div>
      <div class="vk-sl"><div class="vk-st${f ? '' : ' on'}" data-as=""><span>aktuell</span></div>
      ${f === '*' ? `<div class="vk-st on" data-as="*"><span>${esc(l.stand_name || l.stand_ref)}</span>${ms}</div>` : ''}
      ${appStaende(l).map((x) => `<div class="vk-st${f === x.ref ? ' on' : ''}" data-as="${esc(x.ref)}" title="${esc(tag(x.wann))}${x.gilt ? ' · gilt' : ''}"><span>${x.gilt ? '★ ' : ''}${esc(x.name)}</span>${f === x.ref ? ms : `<small>${esc(tag(x.wann).slice(0, 6))}</small>`}</div>`).join('')}</div></div>`; };
    /* Zurück auf „aktuell“ ziehen (Mock „Verknüpfungen mit Versionen“, GO 19.11.2026): war die Linie fest auf einer Version, die nicht gilt –
       fragen: diese Version übernehmen (wird die gültige ★, nichts wird überschrieben) oder nur wieder dem aktuellen Stand folgen */
    function zurueck(l, modell) {
      const V = modell ? (Z.D.staende || []).find((s) => s.nr === l.modell_stand) : appStaende(l).find((x) => x.ref === l.stand_ref);
      const n = V ? (modell ? V.kommentar || 'Planstand' : V.name) : '';
      if (!V || V.gilt) return setze(l.app, { zustand: 'lebendig' });
      return new Promise((ok) => modalBox(`<h3>${esc(modell ? 'Projektmodell' : l.name)}: wieder auf „aktuell“</h3><p class="vk-n">Die Linie war fest auf „${esc(n)}“${V.wann ? ` (${esc(tag(V.wann))})` : ''}.</p>
        <div class="vk-wl"><label class="vk-opt"><input type="radio" name="vkz" value="gilt" checked> <span><b>„${esc(n)}“ übernehmen</b><br><small>${modell ? 'Dieser Planstand gilt wieder; der bisherige bleibt als Planstand erhalten.' : `„${esc(n)}“ wird die gültige Version (★) von ${esc(l.name)}. Die bisherige bleibt als Version erhalten.`}</small></span></label>
        <label class="vk-opt"><input type="radio" name="vkz" value="folgen"> <span><b>Nur wieder dem aktuellen Stand folgen</b><br><small>„${esc(n)}“ bleibt, wie ${modell ? 'er' : 'sie'} ist.</small></span></label></div>
        <div class="row" style="flex-direction:row;justify-content:flex-end;gap:.4rem"><button type="button" class="btn" data-m="ab">Abbrechen</button><button type="button" class="btn primary" data-m="ok">Übernehmen</button></div>`, async (m, bg, close) => {
        if (m === 'ab') { close(); zeichne(); ok(null); return; }
        if (m !== 'ok') return;
        const gilt = bg.querySelector('[name="vkz"]:checked').value === 'gilt'; close();
        if (gilt) {
          try { await J(modell ? `${basis}/planstand/${V.nr}` : `${basis}/gilt`, 'POST', modell ? { gilt: true } : { ref: V.ref }); } catch (e) { sag(e.message, true); zeichne(); ok(null); return; }
          sag(modell ? `Planstand „${n}“ gilt wieder.` : `„${n}“ ist jetzt die gültige Version von ${l.name}.`);
        }
        ok(await setze(l.app, { zustand: 'lebendig' }));
      }));
    }

    function detail() {
      const l = Z.app && link(Z.app);
      if (!l) return `<h3><span>Verknüpfungen</span></h3><p class="vk-n">Je App genau eine Linie zum Projektmodell. Eine Kiste antippen, um ihre Linie einzustellen. Tippen auf die Beschriftung wechselt die Übernahme, Tippen auf das Ende an der Kiste die Richtung; der runde Griff am Modell lässt sich auf einen Stand ziehen.</p>
        <p class="vk-n">Standard: mit Übernahme. Mit jedem neuen Stand des Projektmodells gehen alle Linien wieder auf „mit Übernahme“. Handänderungen werden nie still überschrieben.</p>`;
      const seg = (feld, werte, akt, aus) => `<div class="vk-seg">${werte.map(([v, t]) => `<button type="button" data-set="${feld}" data-v="${v}" class="${v === akt ? 'on' : ''}"${aus ? ' disabled' : ''}>${esc(t)}</button>`).join('')}</div>`;
      const H = Z.hin[l.app], a = ((window.BPHead && BPHead.conf && BPHead.conf.apps) || []).find((x) => x.key === (APPKEY[l.app] || l.app));
      return `<h3><span>Modell und ${esc(l.name)}</span>${l.offen ? `<i class="vk-z">${l.offen}</i>` : ''}</h3>
        <div class="vk-f"><label>Richtung</label>${seg('richtung', ['beide', 'zur_app', 'zum_modell'].map((r) => [r, richtungText(l, r)]), l.richtung, l.zustand === 'getrennt')}</div>
        <div class="vk-f"><label>Übernahme</label>${seg('uebernahme', Object.entries(UEB), l.uebernahme, l.zustand !== 'lebendig')}</div>
        <div class="vk-f"><label>Zustand</label>${seg('zustand', [['lebendig', 'lebendig'], ['fest', 'fest'], ['getrennt', 'getrennt']], l.zustand)}</div>
        <p class="vk-n">${l.zustand === 'fest' ? `Fest auf „${esc(l.stand_name || l.stand_ref)}“${l.modell_stand ? ` · Planstand ${esc(msName(l.modell_stand))}` : ''}: die App arbeitet weiter, ins Modell fließt nur dieser Stand.` : l.zustand === 'getrennt' ? 'Getrennt: zwischen App und Modell fließt nichts.' : l.uebernahme === 'auto' ? 'Automatisch: Änderungen fließen sofort.' : 'Mit Übernahme: Änderungen warten als Hinweis, bis du entscheidest.'}</p>
        ${l.abweichend ? '<div><button type="button" class="vk-b" data-vk="std1">Standard dieser Linie</button></div>' : ''}
        ${l.offen ? (H ? H.map((h) => `<div class="vk-h" data-hid="${h.id}"><b>${esc(h.titel)}</b>${h.daten && h.daten.aenderung ? `<small>${esc(h.daten.aenderung)}</small>` : ''}${((h.daten && h.daten.auswirkungen) || []).slice(0, 4).map((x) => `<small>${esc(x)}</small>`).join('')}
          <div class="vk-grp">${a && h.daten && h.daten.art ? `<a class="vk-b" href="${esc(BPHead.appUrl(a))}/" title="Dieser Hinweis ändert Werte – übernommen wird in der App, dort stehen sie">In ${esc(l.name)} übernehmen</a>` : ''}${h.daten && h.daten.art ? '' : '<button type="button" class="vk-b" data-hin="uebernommen" title="Zur Kenntnis genommen – der Hinweis ist damit erledigt">Übernehmen</button>'}<button type="button" class="vk-b" data-hin="abgelehnt">Ablehnen</button><button type="button" class="vk-b" data-hin="spaeter">Später</button></div></div>`).join('') : '<p class="vk-n">Hinweise werden geladen …</p>') : ''}`;
    }

    function zeichne() {
      const D = Z.D, L = D.links, leb = L.filter((x) => x.zustand === 'lebendig'), alle = leb.length && leb.every((x) => x.uebernahme === leb[0].uebernahme) ? leb[0].uebernahme : '';
      const V = D.verlauf || {}, st = el.querySelector('.vk-ml') ? el.querySelector('.vk-ml').scrollTop : 0, roll = {}; el.querySelectorAll('.vk-box[data-app] .vk-sl').forEach((x) => { roll[x.parentNode.dataset.app] = x.scrollTop; });
      el.innerHTML = `<div class="vk-bar">
          <div class="vk-grp"><button type="button" class="vk-b" data-vk="rueck"${V.rueck ? '' : ' disabled'} title="Letzte Änderung an den Verknüpfungen zurücknehmen">↶ Zurück</button><button type="button" class="vk-b" data-vk="vor"${V.vor ? '' : ' disabled'} title="Zurückgenommene Änderung wiederholen">↷ Wieder</button><button type="button" class="vk-b" data-vk="verlauf">Verlauf</button><button type="button" class="vk-b" data-vk="standard"${L.some((x) => x.abweichend) ? '' : ' disabled'}>Standard wiederherstellen</button></div>
          <div class="vk-seg" role="group" aria-label="Alle Linien"><span>Alle Linien</span><button type="button" data-vk="alle" data-v="auto" class="${alle === 'auto' ? 'on' : ''}">automatisch</button><button type="button" data-vk="alle" data-v="uebernahme" class="${alle === 'uebernahme' ? 'on' : ''}">mit Übernahme</button></div></div>
        <div class="vk-wrap"><div class="vk-karte"><svg class="vk-svg" aria-hidden="true"></svg>
          <div class="vk-sp vk-l">${L.filter((x) => LINKS.includes(x.app)).map(kiste).join('')}</div>
          <div class="vk-m"><div class="vk-box vk-mod"><div class="vk-bh"><b>Projektmodell</b></div><div class="vk-ml"><div class="vk-st on" data-ms="" title="Linien folgen dem Modell, wie es gerade ist"><span>aktuell</span></div>
            ${(D.staende || []).map((s) => `<div class="vk-st" data-ms="${s.nr}" title="Planstand · ${esc(tag(s.wann))} · ${esc(s.wer || '')}"><span>${s.gilt ? '★ ' : ''}${esc(s.kommentar || 'Planstand')}</span></div>`).join('')}</div></div></div>
          <div class="vk-sp vk-r">${L.filter((x) => !LINKS.includes(x.app)).map(kiste).join('')}</div></div>
          <aside class="vk-det">${detail()}</aside></div>`;
      const ml = el.querySelector('.vk-ml'); if (ml) { ml.scrollTop = st; ml.addEventListener('scroll', linien, { passive: true }); }
      el.querySelectorAll('.vk-box[data-app] .vk-sl').forEach((x) => { x.scrollTop = roll[x.parentNode.dataset.app] || 0; x.addEventListener('scroll', linien, { passive: true }); });
      linien();
      const l = Z.app && link(Z.app);
      if (l && l.offen && !Z.hin[l.app]) J(`${basis}/hinweise?app=${l.app}`).then((h) => { Z.hin[l.app] = h; if (Z.app === l.app && el.isConnected) { const d = el.querySelector('.vk-det'); if (d) d.innerHTML = detail(); } }, () => {});
    }

    /* Linien, Beschriftungen und Griffe: nach dem Aufbau aus der Lage der Kisten gerechnet (bei Größenänderung neu) */
    function linien() {
      const K = el.querySelector('.vk-karte'); if (!K) return;
      const w = el.clientWidth, eng = w < 600;   // schmal: Kisten untereinander; mittel (z. B. Bereich rechts): Erklärung unter die Karte statt daneben
      el.classList.toggle('vk-eng', eng); el.classList.toggle('vk-mittel', !eng && w < 1080);
      K.querySelectorAll(':scope > .vk-lab, .vk-pf, .vk-griff').forEach((x) => x.remove());
      const svg = K.querySelector('.vk-svg'); svg.innerHTML = '';
      K.querySelectorAll('.vk-bh .vk-lab').forEach((x) => { x.hidden = !eng && !x.classList.contains('k-getrennt'); });   // breit: Beschriftung sitzt auf der Linie (getrennt hat keine)
      if (eng) return;
      const k = K.getBoundingClientRect(), mod = K.querySelector('.vk-ml'), mr = mod.getBoundingClientRect(), mb = K.querySelector('.vk-mod').getBoundingClientRect();
      let s = '';
      const zeile = (l) => (l.zustand === 'fest' && l.modell_stand && mod.querySelector(`[data-ms="${l.modell_stand}"]`) ? String(l.modell_stand) : ''), seite = (l) => (LINKS.includes(l.app) ? 'l' : 'r');
      const gruppe = {}; for (const l of Z.D.links) if (l.zustand !== 'getrennt') (gruppe[seite(l) + zeile(l)] = gruppe[seite(l) + zeile(l)] || []).push(l.app);   // mehrere Linien an derselben Zeile: Enden untereinander, damit jeder Griff greifbar bleibt
      for (const l of Z.D.links) {
        if (l.zustand === 'getrennt') continue;
        const gr = gruppe[seite(l) + zeile(l)], versatz = (gr.indexOf(l.app) - (gr.length - 1) / 2) * 13;
        const box = K.querySelector(`.vk-box[data-app="${l.app}"]`), sl = box.querySelector('.vk-sl').getBoundingClientRect(), an = box.querySelector('.vk-st.on').getBoundingClientRect(), b = box.getBoundingClientRect();
        const z = mod.querySelector(`[data-ms="${zeile(l)}"]`).getBoundingClientRect();
        const li = b.left < mb.left, x1 = (li ? b.right : b.left) - k.left, y1 = Math.max(sl.top + 4, Math.min(sl.bottom - 4, an.top + an.height / 2)) - k.top;
        const x2 = (li ? mb.left : mb.right) - k.left, y2 = Math.max(mb.top + 8, Math.min(mb.bottom - 8, Math.max(mr.top, Math.min(mr.bottom, z.top + z.height / 2)) + versatz)) - k.top, dx = (x2 - x1) / 2, c = art(l), r = li ? 1 : -1;
        const t = 0.38, q = 1 - t, bx = q * q * q * x1 + 3 * q * q * t * (x1 + dx) + 3 * q * t * t * (x2 - dx) + t * t * t * x2, by = (q * q * q + 3 * q * q * t) * y1 + (3 * q * t * t + t * t * t) * y2;   // Beschriftung nahe der Kiste: dort liegen die Linien auseinander
        const V = BIEGE[l.app], lx = bx + (V ? V[0] : 0), ly = by + (V ? V[1] : 0), d1 = (lx - x1) / 2, d2 = (x2 - lx) / 2;
        s += V ? `<path class="k-${c}" d="M${x1} ${y1} C${x1 + d1} ${y1} ${lx - d1} ${ly} ${lx} ${ly} C${lx + d2} ${ly} ${x2 - d2} ${y2} ${x2} ${y2}"/>` : `<path class="k-${c}" d="M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}"/>`;
        const spitze = (x, y, d) => `<polygon class="k-${c}" points="${x},${y} ${x - 9 * d},${y - 4.5} ${x - 9 * d},${y + 4.5}"/>`;
        if (l.richtung !== 'zur_app') s += spitze(x2 - 7 * r, y2, r);
        if (l.richtung !== 'zum_modell') s += spitze(x1, y1, -r);
        K.insertAdjacentHTML('beforeend', `<button type="button" class="vk-lab k-${c}" data-lab="${l.app}" data-bx="${bx}" data-by="${by}" style="left:${lx}px;top:${ly}px" title="${l.zustand === 'lebendig' ? 'Tippen wechselt zwischen „mit Übernahme“ und „automatisch“' : 'Einstellungen dieser Linie'} · Ziehen biegt die Linie">${esc(artText(l))}${l.offen ? `<i class="vk-z">${l.offen}</i>` : ''}</button>
          <button type="button" class="vk-pf" data-pf="${l.app}" style="left:${x1 + 7 * r}px;top:${y1}px" title="Tippen wechselt die Richtung (${esc(richtungText(l, l.richtung))}) · auf einen Stand der Kiste ziehen: fest auf diesem Stand" aria-label="Richtung der Linie ${esc(l.name)} wechseln"></button>
          <button type="button" class="vk-griff k-${c}" data-griff="${l.app}" style="left:${x2}px;top:${y2}px" title="Auf einen Stand des Modells ziehen (fest) oder auf „aktuell“ (lebendig)" aria-label="Linie ${esc(l.name)} an einen Stand des Modells hängen"></button>`);
      }
      svg.innerHTML = s;
    }

    const naechste = { beide: 'zur_app', zur_app: 'zum_modell', zum_modell: 'beide' };
    function standWahl(l) {   // fest geht nur auf einem Stand der App: aus ihren Ständen wählen oder frei benennen
      const S = appStaende(l), frei = () => bpEingabe(`Welcher Stand von „${l.name}“ wird festgehalten?`, l.stand_name || `Stand vom ${heute()}`).then((n) => (n && String(n).trim() ? { stand_ref: '', stand_name: String(n).trim() } : null));
      if (!S.length) return frei();
      return new Promise((ok) => { modalBox(`<h3>${esc(l.name)}: welcher Stand wird festgehalten?</h3><div class="vk-wl">${S.map((x, i) => `<button type="button" class="btn" data-m="s${i}">${esc(x.name)}${x.wann ? ` · ${esc(tag(x.wann))}` : ''}</button>`).join('')}</div>
        <div class="row" style="flex-direction:row;justify-content:space-between"><button type="button" class="btn" data-m="ab">Abbrechen</button><button type="button" class="btn" data-m="frei">Anderer Stand …</button></div>`, (m, bg, close) => { close(); if (m === 'ab') ok(null); else if (m === 'frei') frei().then(ok); else { const x = S[+m.slice(1)]; ok({ stand_ref: x.ref, stand_name: x.name }); } }); });
    }
    async function fest(l, ms) {
      const w = await standWahl(l); if (!w) return null;
      if (ms) return setze(l.app, { zustand: 'fest', ...w, modell_stand: ms });
      return tu('/einfrieren', 'POST', { app: l.app, ...w }, (r) => `${l.name} ist fest – Modellstand ${r.nr} angelegt, alle anderen Linien stehen auf „mit Übernahme“.`);
    }
    el.onclick = async (e) => {
      if (!Z.D) return;
      if (Z.gezogen) { Z.gezogen = false; return; }   // der Klick nach einem Ziehen gehört zum Ziehen
      const t = e.target, vk = t.closest('[data-vk]'), lab = t.closest('[data-lab]'), pf = t.closest('[data-pf]'), set = t.closest('[data-set]'), hin = t.closest('[data-hin]'), box = t.closest('.vk-box[data-app]');
      if (lab) { const l = link(lab.dataset.lab); Z.app = l.app; if (l.zustand === 'lebendig') return setze(l.app, { uebernahme: l.uebernahme === 'auto' ? 'uebernahme' : 'auto' }); return zeichne(); }
      if (pf) { const l = link(pf.dataset.pf); Z.app = l.app; return setze(l.app, { richtung: naechste[l.richtung] }); }
      if (set) {
        const l = link(Z.app), v = set.dataset.v; if (!l || set.disabled || l[set.dataset.set] === v) return;
        if (set.dataset.set === 'zustand' && v === 'fest') return fest(l);
        return setze(l.app, { [set.dataset.set]: v });
      }
      if (hin) { const h = hin.closest('[data-hid]'); return tu(`/hinweis/${h.dataset.hid}`, 'POST', { status: hin.dataset.hin }); }
      if (vk) {
        const a = vk.dataset.vk;
        if (a === 'rueck' || a === 'vor') return tu('/' + a, 'POST', {}, (r) => (r.text ? `${a === 'vor' ? 'Wiederholt' : 'Zurückgenommen'}: ${r.text}` : ''));
        if (a === 'alle') return tu('/alle', 'POST', { uebernahme: vk.dataset.v });
        if (a === 'std1') return tu('/standard', 'POST', { app: Z.app });
        if (a === 'standard') { if (await bpFrage('Alle Linien auf den Standard zurücksetzen?\n\nTermine, Kosten und Ausschreibung lebendig in beide Richtungen, Bauantrag, Wärmeschutz und Honorar nur lesend – alles mit Übernahme.', { ok: 'Zurücksetzen' })) return tu('/standard', 'POST', {}); return; }
        if (a === 'verlauf') {
          const E = ((Z.D.verlauf || {}).eintraege || []);
          return modalBox(`<h3>Verlauf der Verknüpfungen</h3><div class="vk-vl">${E.length ? E.map((x) => `<div class="${x.zurueck ? 'zr' : ''}"><span>${esc(x.text)}</span><small>${esc(tag(x.wann))} · ${esc(x.wer || '')}</small></div>`).join('') : '<p class="vk-n">Noch nichts geändert – es gilt der Standard.</p>'}</div><div class="row" style="flex-direction:row;justify-content:flex-end"><button type="button" class="btn primary" data-m="zu">Schließen</button></div>`, (m, bg, close) => { if (m === 'zu') close(); });
        }
      }
      if (box) { Z.app = Z.app === box.dataset.app ? null : box.dataset.app; zeichne(); }
    };
    el.onkeydown = (e) => { const box = e.target.closest && e.target.closest('.vk-box[data-app]'); if (box && e.target === box && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); Z.app = box.dataset.app; zeichne(); } };
    /* Ziehen: Griff am Modell → auf einen Modellstand (fest) oder „Arbeitsstand“ (lebendig); Ende an der Kiste → auf einen Stand der App;
       Beschriftung → die Linie biegt sich mit (nahe der Ausgangslage rastet sie zurück) */
    const unter = (e, sel) => document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.matches && x.matches(sel));
    const zielSel = (z) => (z.typ === 'modell' ? '.vk-ml [data-ms]' : `.vk-box[data-app="${z.app}"] [data-as]`);
    el.onpointerdown = (e) => {
      if (e.button) return; Z.gezogen = false;
      const g = e.target.closest('[data-griff]'), pf = e.target.closest('[data-pf]'), lab = e.target.closest('.vk-karte > .vk-lab'), q = g || pf || lab; if (!q) return;
      if (g) e.preventDefault(); q.setPointerCapture(e.pointerId);
      Z.zieh = { g: q, typ: g ? 'modell' : pf ? 'app' : 'lab', app: q.dataset.griff || q.dataset.pf || q.dataset.lab, x: e.clientX, y: e.clientY, weit: false };
    };
    el.onpointermove = (e) => {
      const z = Z.zieh; if (!z) return; if (Math.hypot(e.clientX - z.x, e.clientY - z.y) > 5) z.weit = true; if (!z.weit) return;
      const K = el.querySelector('.vk-karte').getBoundingClientRect(); z.g.style.left = (e.clientX - K.left) + 'px'; z.g.style.top = (e.clientY - K.top) + 'px';
      if (z.typ === 'lab') { BIEGE[z.app] = [Math.round(e.clientX - K.left - +z.g.dataset.bx), Math.round(e.clientY - K.top - +z.g.dataset.by)]; return; }
      el.querySelectorAll('.vk-st.ziel').forEach((x) => x.classList.remove('ziel'));
      const u = unter(e, zielSel(z)); if (u) u.classList.add('ziel');
    };
    el.onpointerup = async (e) => {
      const z = Z.zieh; if (!z) return; Z.zieh = null;
      el.querySelectorAll('.vk-st.ziel').forEach((x) => x.classList.remove('ziel'));
      const l = link(z.app);
      if (!z.weit) { if (z.typ === 'modell') { Z.app = z.app; zeichne(); } return; }   // nur getippt: Beschriftung und Linienende behalten ihren Klick
      Z.gezogen = true; Z.app = z.app;   // der folgende Klick gehört zum Ziehen (onclick nimmt den Merker zurück, spätestens das nächste Antippen)
      if (z.typ === 'lab') { const v = BIEGE[z.app]; if (v && Math.hypot(v[0], v[1]) < 14) delete BIEGE[z.app]; biegeMerken(); return zeichne(); }
      const u = unter(e, zielSel(z)); if (!u) return zeichne();
      if (z.typ === 'modell') {
        if (u.dataset.ms === '') return l.zustand === 'fest' ? zurueck(l, !!l.modell_stand) : zeichne();
        const r = await fest(l, +u.dataset.ms); if (!r) zeichne(); return;
      }
      const ref = u.dataset.as;
      if (ref === '') return l.zustand === 'fest' ? zurueck(l, false) : zeichne();
      if (ref === '*' || (l.zustand === 'fest' && l.stand_ref === ref)) return zeichne();
      const x = appStaende(l).find((y) => y.ref === ref); if (!x) return zeichne();
      return setze(l.app, { zustand: 'fest', stand_ref: x.ref, stand_name: x.name });
    };
    el.onpointercancel = () => { if (Z.zieh) { Z.zieh = null; zeichne(); } };
    if (window.ResizeObserver) { let b0 = 0; new ResizeObserver(() => { if (!el.isConnected || !Z.D) return; const b = el.clientWidth; if (b !== b0) { b0 = b; linien(); } }).observe(el); }
    J(basis).then((r) => { Z.D = r; const o = r.links.find((x) => x.offen), ziel = window.bpKarteZiel && r.links.find((x) => x.app === window.bpKarteZiel); window.bpKarteZiel = null; if (ziel) Z.app = ziel.app; else if (o) Z.app = o.app;   /* bpKarteZiel: Sprung aus dem Assistenten */ zeichne(); }, (e) => { el.innerHTML = `<p class="vk-n">${esc(e.message)}</p>`; });
    return { neu: () => J(basis).then((r) => { Z.D = r; Z.hin = {}; zeichne(); }) };
  }
  window.bpKarte = { mount };
})();
