'use strict';
/* Abwesenheit zurücknehmen oder löschen (17.11.2026) – ein Fenster für Zeiten (Monat, Mitarbeiter) und Personal (Kalender).
   bpAbwesenheit.oeffnen({ uid, tag | aid, nachher })  Klick auf eine Abwesenheit: Tage zurückgeben · Ganzen Zeitraum · Löschen,
                                                 wen benachrichtigen (vorgeschlagen ist „der andere“), Grund; Rückgängig oben links.
   bpAbwesenheit.arten(host)                     Einstellungen: eigene Abwesenheitsarten mit Wirkung aufs Zeitkonto.
   Server: bpcore/abwesenheit.py (/api/bp/abwesenheit …). Benutzt api, esc, toast, modalBox, rueckgaengig (bp.js, undo.js). */
(() => {
  const A = (u, m, b) => api(u, m, b);
  const dk = (t) => new Date(t + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
  const dl = (t) => new Date(t + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const n = (x) => String(x).replace('.', ',');
  const STATUS = { genehmigt: 'genehmigt', offen: 'beantragt, noch offen', zurueckgenommen: 'zurückgenommen' };

  async function oeffnen(o) {
    let I;
    try { I = await A(`api/bp/abwesenheit?uid=${o.uid || ''}&tag=${encodeURIComponent(o.tag || '')}&aid=${o.aid || ''}`); } catch (e) { toast(e.message, true); return; }
    o = { ...o, tag: I.tag };
    const halb = I.art === 'urlaub_halb', faktor = halb ? 0.5 : 1;
    const sperr = (t) => !!(I.ab && t < I.ab);
    let modus = I.offen ? 'ganz' : (I.tage.some(sperr) || I.tage.length > 1 ? 'tage' : 'ganz');
    const gewaehlt = new Set(I.tage.filter((t) => !sperr(t) && t >= (o.tag || '')));
    if (!gewaehlt.size) I.tage.filter((t) => !sperr(t)).forEach((t) => gewaehlt.add(t));
    const a = I.antrag;
    const kopf = `<b>${esc(I.art_text)} · ${esc(I.name)}</b><div class="bp-mu">${I.von === I.bis ? esc(dl(I.von)) : esc(dl(I.von)) + ' – ' + esc(dl(I.bis))} · ${n(I.tage.length * faktor)} Arbeitstag${I.tage.length * faktor === 1 ? '' : 'e'}`
      + `${a ? ` · ${esc(STATUS[a.status] || a.status)}${a.entschieden_von && a.status === 'genehmigt' ? ' von ' + esc(a.entschieden_von) : ''}${a.zurueck && a.zurueck.length ? ` · schon zurückgegeben: ${a.zurueck.length} T` : ''}` : ''}</div>`;
    const seg = () => `<div class="bp-abw-seg" role="tablist">${[['tage', 'Tage zurückgeben'], ['ganz', 'Ganzen Zeitraum'], ['loeschen', 'Löschen']]
      .filter(([k]) => !(I.offen && k === 'tage')).map(([k, t]) => `<button type="button" class="${modus === k ? 'an' : ''}" data-abwmod="${k}">${t}</button>`).join('')}</div>`;
    const tage = () => modus !== 'tage' ? '' : `<div class="bp-abw-tage">${I.tage.map((t) => `<button type="button" data-abwtag="${t}" class="${gewaehlt.has(t) ? 'zur' : ''}" ${sperr(t) ? 'disabled title="Vergangene Tage ändern Geschäftsführung, Büroleitung oder Assistenz"' : ''}>${esc(dk(t))}</button>`).join('')}</div>`;
    const erkl = () => {
      const k = gewaehlt.size * faktor;
      if (modus === 'tage') return `Tage antippen, die zurückgehen: <b>${n(k)} Tag${k === 1 ? '' : 'e'}</b>${I.art.startsWith('urlaub') ? ' gehen zurück aufs Urlaubskonto' : ' werden wieder Arbeitstage'}.${a ? ' Der Antrag bleibt im Verlauf („teilweise zurückgenommen“).' : ''}`;
      if (modus === 'ganz') return I.offen ? 'Der offene Antrag wird zurückgenommen – er bleibt im Verlauf.' : `Alle ${n(I.tage.length * faktor)} Tage werden frei.${a ? ' Der Antrag bleibt im Verlauf als „zurückgenommen“.' : ''}`;
      return 'Nur für Fehleinträge: Die Tage werden frei' + (a ? ', der Antrag kommt in den Papierkorb und verschwindet aus der Liste.' : '.');
    };
    const knopf = () => modus === 'tage' ? `${n(gewaehlt.size * faktor)} Tag${gewaehlt.size * faktor === 1 ? '' : 'e'} zurückgeben` : modus === 'ganz' ? 'Zurücknehmen' : 'Löschen';
    const an = I.an.map((x) => `<label class="bp-abw-chk"><input type="checkbox" data-abwan="${x.id}"${x.vor ? ' checked' : ''}> ${esc(x.name)} benachrichtigen <small class="bp-mu">(${esc(x.rolle)})</small></label>`).join('');
    modalBox(`<div class="bp-abw">${kopf}<div data-abwseg>${seg()}</div><div data-abwtage>${tage()}</div><p class="bp-mu" data-abwerkl>${erkl()}</p>
      ${an}${I.an.length ? '<label class="bp-abw-chk"><input type="checkbox" data-abwmail> zusätzlich per Mail</label>' : ''}
      <input data-abwgrund maxlength="300" placeholder="Grund (optional, steht in der Nachricht und im Protokoll)">
      <p class="bp-mu" style="margin:.3rem 0 0">Steht im Protokoll (Verwaltung → System).</p></div>
      <div class="acts"><span class="fill"></span><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri${modus === 'loeschen' ? ' rot' : ''}" data-m="ok" data-abwok>${knopf()}</button></div>`,
    async (m, bg, close) => {
      if (m === 'x') { close(); return; }
      if (m !== 'ok') return;
      const body = { uid: I.uid, tag: o.tag, aktion: modus, tage: [...gewaehlt], an: [...bg.querySelectorAll('[data-abwan]:checked')].map((x) => +x.dataset.abwan),
        mail: !!(bg.querySelector('[data-abwmail]') || {}).checked, grund: bg.querySelector('[data-abwgrund]').value };
      try {
        const r = await A('api/bp/abwesenheit', 'POST', body); close();
        toast(r.text + (body.an.length ? ` – ${body.an.length === 1 ? 'benachrichtigt' : body.an.length + ' benachrichtigt'}${r.gesendet ? ' (mit Mail)' : ''}` : '') + '.');
        if (o.nachher) await o.nachher();
        rueckgaengig(r.text, async () => { await A('api/bp/abwesenheit/zurueck', 'POST', { rueck: r.rueck }); if (o.nachher) await o.nachher(); });
      } catch (e) { toast(e.message, true); }
    });
    const bg = [...document.querySelectorAll('.modal-bg')].pop(); if (!bg) return;
    bg.addEventListener('click', (e) => {
      const md = e.target.closest('[data-abwmod]'), tg = e.target.closest('[data-abwtag]');
      if (!md && !tg) return;
      if (md) modus = md.dataset.abwmod;
      if (tg && !tg.disabled) { const t = tg.dataset.abwtag; if (gewaehlt.has(t)) gewaehlt.delete(t); else gewaehlt.add(t); }
      bg.querySelector('[data-abwseg]').innerHTML = seg(); bg.querySelector('[data-abwtage]').innerHTML = tage(); bg.querySelector('[data-abwerkl]').innerHTML = erkl();
      const k = bg.querySelector('[data-abwok]'); k.textContent = knopf(); k.classList.toggle('rot', modus === 'loeschen'); k.disabled = modus === 'tage' && !gewaehlt.size;
    });
  }

  /* Einstellungen: feste Arten (nur lesen) und eigene Arten – Name, Wirkung, beantragen */
  function arten(host) {
    let D = null;
    const zeichne = () => {
      const W = D.wirkungen, wopt = (w) => Object.entries(W).map(([k, t]) => `<option value="${k}"${k === w ? ' selected' : ''}>${esc(t)}</option>`).join('');
      host.innerHTML = `<div class="bp-abwa"><p class="bp-mu" style="margin:0 0 .4rem">Welche Abwesenheiten es gibt und wie sie aufs Zeitkonto wirken. Die festen gelten in jedem Büro; eigene Arten kommen dazu und stehen danach in Zeiten und Personal zur Wahl.</p>
        <table class="bp-abwa-t"><thead><tr><th>Art</th><th>Wirkung aufs Zeitkonto</th><th>beantragen</th><th></th></tr></thead><tbody>
        ${D.arten.map((x, i) => x.fest ? `<tr class="fest"><td>${esc(x.name)}</td><td>${esc(W[x.wirkung] || x.wirkung)}${x.key === 'urlaub_halb' ? ' (halber Tag)' : ''}</td><td>${x.antrag ? 'ja' : 'nein – direkt'}</td><td></td></tr>`
          : `<tr data-abwa="${i}"><td><input data-af="name" value="${esc(x.name)}" maxlength="60"${D.darf ? '' : ' disabled'}></td><td><select data-af="wirkung" data-bp-auswahl${D.darf ? '' : ' disabled'}>${wopt(x.wirkung)}</select></td>
             <td><label><input type="checkbox" data-af="antrag"${x.antrag ? ' checked' : ''}${D.darf ? '' : ' disabled'}> ja</label></td><td>${D.darf ? `<button type="button" class="btn sm" data-abwaweg="${i}" title="Art entfernen – eingetragene Tage behalten ihren Namen nicht mehr">✕</button>` : ''}</td></tr>`).join('')}
        </tbody></table>${D.darf ? '<button type="button" class="btn sm" data-abwaneu style="margin-top:.4rem">＋ eigene Art</button>' : '<p class="bp-mu">Eigene Arten legt die Verwaltung an.</p>'}</div>`;
    };
    const speichern = async () => {
      try { D = await A('api/bp/abwesenheit/arten', 'PUT', { arten: D.arten.filter((x) => !x.fest) }); zeichne(); toast('Gespeichert.'); } catch (e) { toast(e.message, true); }
    };
    host.addEventListener('change', (e) => {
      const tr = e.target.closest('[data-abwa]'), f = e.target.dataset.af; if (!tr || !f) return;
      D.arten[+tr.dataset.abwa][f] = f === 'antrag' ? e.target.checked : e.target.value; speichern();
    });
    host.addEventListener('click', (e) => {
      if (e.target.closest('[data-abwaneu]')) { D.arten.push({ name: 'Neue Art', wirkung: 'arbeitszeit', antrag: false }); speichern(); }
      const w = e.target.closest('[data-abwaweg]'); if (w) { D.arten.splice(+w.dataset.abwaweg, 1); speichern(); }
    });
    A('api/bp/abwesenheit/arten').then((d) => { D = d; zeichne(); }).catch((e) => { host.textContent = e.message; });
  }

  if (!document.getElementById('bp-abw-css')) {
    const s = document.createElement('style'); s.id = 'bp-abw-css';
    s.textContent = `.bp-abw{display:flex;flex-direction:column;gap:.35rem;min-width:min(30rem,82vw);max-width:36rem}
.bp-abw-seg{display:inline-flex;border:1px solid var(--line);border-radius:var(--rk,7px);overflow:hidden;margin:.3rem 0 .1rem;align-self:flex-start}
.bp-abw-seg button{border:0;border-right:1px solid var(--line);background:var(--card,#fff);color:inherit;padding:.22rem .7rem;font:inherit;font-size:.86rem;cursor:pointer;white-space:nowrap}
.bp-abw-seg button:last-child{border-right:0}.bp-abw-seg button.an{background:var(--af,var(--acc));color:#fff;font-weight:600}
.bp-abw-tage{display:flex;flex-wrap:wrap;gap:.25rem}.bp-abw-tage button{border:1px solid var(--line);border-radius:5px;background:color-mix(in srgb,var(--af,var(--acc)) 14%,var(--card,#fff));color:inherit;font:inherit;font-size:.8rem;padding:.2rem .45rem;cursor:pointer}
.bp-abw-tage button.zur{background:var(--card,#fff);border-style:dashed;text-decoration:line-through;color:var(--mute)}.bp-abw-tage button:disabled{opacity:.5;cursor:default}
.bp-abw-chk{display:flex;gap:.4rem;align-items:center;font-size:.88rem}.bp-abw input[data-abwgrund]{width:100%;box-sizing:border-box}
.btn.rot{background:var(--red,#b42318);border-color:var(--red,#b42318);color:#fff}
.bp-abwa-t{border-collapse:collapse;font-size:.88rem}.bp-abwa-t td,.bp-abwa-t th{padding:.2rem .4rem;border-bottom:1px solid var(--line);text-align:left}.bp-abwa-t tr.fest td{color:var(--mute)}`;
    document.head.appendChild(s);
  }
  window.bpAbwesenheit = { oeffnen, arten };
})();
