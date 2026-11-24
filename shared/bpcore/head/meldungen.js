'use strict';
/* Benachrichtigungen verwalten (17.11.2026, BN A1 B1 C1 D1) – alles, was die Plattform von sich aus meldet, an einer Stelle:
   Erinnerungen, automatische Hinweise („Zu tun“), Kalendereinladungen (Outlook), Mails, die von selbst gehen.
   bpMeldungen.mount(host, { alle })   Verwaltung → Benachrichtigungen (Für mich · Für alle · Je Rolle) und ⚙ → Persönlich (nur Für mich).
   Aus = bleibt stehen, löst nichts mehr aus; Löschen = Papierkorb bzw. Absage im Kalender; alles mit Rückgängig (rueckgaengig, undo.js).
   Server: bpcore/meldungen.py (/api/bp/meldungen). Benutzt api, esc, toast, bpFrage (bp.js, head.js). */
(() => {
  if (window.bpMeldungen) return;
  const ART = { erinnerung: ['⏰', 'Erinnerungen'], hinweis: ['🔔', 'Automatische Hinweise (Zu tun)'], kalender: ['📅', 'Kalender (an Outlook gesendet)'], mail: ['✉', 'Mails, die von selbst gehen'] };
  const KURZ = { erinnerung: 'Erinnerungen', hinweis: 'Hinweise', kalender: 'Kalender', mail: 'Mails' };
  const dt = (t) => (/^\d{4}-\d\d-\d\d$/.test(t || '') ? new Date(t + 'T12:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : t || '–');
  const fold = (s) => String(s || '').toLowerCase().normalize('NFC');
  function stil() {
    if (document.getElementById('bpMlStil')) return;
    const s = document.createElement('style'); s.id = 'bpMlStil';
    s.textContent = `.bp-ml-aus{margin:0 0 .8rem;display:grid;gap:.4rem}.bp-ml-aus label{display:flex;gap:.5rem;align-items:flex-start;cursor:pointer}.bp-ml-aus input{margin-top:.2rem;flex:none;width:1.1rem;height:1.1rem}.bp-ml-aus p{margin:0;font-size:.85rem}.bp-ml-seite{display:block;width:100%;border:0;height:420px;background:transparent}
.bp-ml-kopf{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;margin-bottom:.6rem}
.bp-ml-seg{display:inline-flex;border:1px solid var(--bd,#d5d9de);border-radius:var(--rk,8px);overflow:hidden}.bp-ml-seg button{border:0;background:none;padding:.25rem .8rem;cursor:pointer;color:inherit;font:inherit}.bp-ml-seg button.an{background:var(--af,#3b5a8f);color:#fff}
.bp-ml-chip{border:1px solid var(--bd,#d5d9de);border-radius:999px;padding:.1rem .65rem;background:none;cursor:pointer;color:inherit;font:inherit;font-size:.86em}.bp-ml-chip.an{border-color:var(--af,#3b5a8f);color:var(--af,#3b5a8f);font-weight:600}
.bp-ml-such{margin-left:auto;min-width:10rem}
table.bp-ml{border-collapse:collapse;width:100%;font-size:.9em}table.bp-ml th,table.bp-ml td{padding:.3rem .5rem;border-bottom:1px solid var(--bd,#e3e6ea);text-align:left;vertical-align:middle}table.bp-ml th{font-size:.8em;opacity:.7;font-weight:600}
table.bp-ml td{white-space:normal;overflow-wrap:anywhere}table.bp-ml td.w:nth-child(3),table.bp-ml td.w:nth-child(4){max-width:14rem}table.bp-ml td.w:nth-child(5){white-space:nowrap}
table.bp-ml tr.gr td{font-weight:600;background:var(--bg2,rgba(0,0,0,.03))}table.bp-ml tr.aus td.w{opacity:.5}table.bp-ml td.k{white-space:nowrap;text-align:right}
.bp-ml-sw{position:relative;display:inline-block;width:2.1rem;height:1.1rem;border-radius:999px;border:0;background:#c9ced5;cursor:pointer;vertical-align:middle}.bp-ml-sw::after{content:"";position:absolute;left:.15rem;top:.15rem;width:.8rem;height:.8rem;border-radius:50%;background:#fff;transition:left .12s}.bp-ml-sw.an{background:#2e9d5b}.bp-ml-sw.an::after{left:1.15rem}
.bp-ml-x{border:0;background:none;cursor:pointer;opacity:.6;font:inherit}.bp-ml-x:hover{opacity:1}
.bp-ml-fuss{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin-top:.6rem}.bp-ml-woher{opacity:.65;font-size:.85em}
.bp-ml-tw{overflow-x:auto}table.bp-ml td.m{text-align:center}`;
    document.head.appendChild(s);
  }

  function mount(host, o = {}) {
    stil();
    const S = { modus: o.alle ? 'alle' : 'ich', art: '', such: '', person: '', rolle: '', sel: new Set(), D: null };
    const url = () => `api/bp/meldungen?alle=${S.modus === 'ich' ? 0 : 1}&person=${S.person}&rolle=${encodeURIComponent(S.rolle)}`;
    async function laden() {
      try { S.D = await api(url()); } catch (e) { host.innerHTML = `<p class="bp-mu">${esc(e.message)}</p>`; return; }
      if (!S.D.darf_alle && S.modus !== 'ich') { S.modus = 'ich'; return laden(); }
      zeichnen();
    }
    const alleZeilen = () => Object.values(S.D.listen).flat();
    async function aendern(ids, was) {
      const alle = S.modus !== 'ich';
      if (was === 'loeschen') {
        const kal = ids.some((i) => i.startsWith('k'));
        if (!(await bpFrage(`${ids.length === 1 ? 'Diese Benachrichtigung' : ids.length + ' Benachrichtigungen'} löschen?${kal ? ' Kalendereinladungen werden in Outlook abgesagt.' : ''}`, { ok: 'Löschen', gefahr: true }))) return;
      }
      let r; try { r = await api('api/bp/meldungen', 'POST', { ids, was, alle }); } catch (e) { toast(e.message, true); return; }
      if (r.hinweis) toast(r.hinweis);
      const Z = (r.zurueck || []).filter(Boolean);
      S.sel.clear(); await laden();
      if (Z.length) rueckgaengig(`${ids.length === 1 ? 'Benachrichtigung' : ids.length + ' Benachrichtigungen'} ${was === 'loeschen' ? 'gelöscht' : was === 'aus' ? 'ausgeschaltet' : was === 'an' ? 'eingeschaltet' : 'zurückgesetzt'}`, async () => {
        for (const z of Z.reverse()) { try { await api('api/bp/meldungen', 'POST', { zurueck: z, alle }); } catch (e) { toast(e.message, true); } }
        await laden();
      }, { neu: async () => { await laden(); } });
    }
    function zeile(x) {
      const fuer = Array.isArray(x.fuer) ? (x.fuer.length > 2 ? `${x.fuer[0]} + ${x.fuer.length - 1}` : x.fuer.join(', ')) : x.fuer || '';
      const wann = x.art === 'hinweis' ? (x.wert != null && x.einheit ? `${x.wert} ${x.einheit}` : 'laufend') : x.art === 'mail' ? x.datum : `${dt(x.datum)}${x.uhrzeit ? ' ' + x.uhrzeit : ''}`;
      const std = (x.art === 'hinweis' && x.eigen) || (x.art === 'mail' && x.woher === 'eigene Wahl');
      return `<tr class="${x.aktiv ? '' : 'aus'}" data-mlid="${esc(x.id)}"><td><input type="checkbox" class="bp-chk-alt" data-mlsel${S.sel.has(x.id) ? ' checked' : ''} aria-label="markieren"></td>
        <td class="w">${esc(x.titel)}${x.text ? `<div class="bp-ml-woher">${esc(x.text)}</div>` : ''}</td><td class="w">${esc(x.projekt || '')}</td><td class="w">${esc(fuer)}</td><td class="w">${esc(wann)}</td>
        <td class="bp-ml-woher">${esc(x.woher || '')}${x.gesendet ? ' · gesendet ' + esc(dt(x.gesendet)) : ''}</td>
        <td class="k"><button type="button" class="bp-ml-sw${x.aktiv ? ' an' : ''}" data-mlsw role="switch" aria-checked="${x.aktiv}" title="${x.aktiv ? 'ausschalten' : 'einschalten'}"></button>
        ${std ? '<button type="button" class="bp-ml-x" data-mlstd title="wieder wie die Vorgabe (Rolle bzw. Büro)">↺</button>' : ''}${x.loeschbar ? '<button type="button" class="bp-ml-x" data-mldel title="löschen">🗑</button>' : ''}</td></tr>`;
    }
    function liste() {
      const L = S.D.listen, f = fold(S.such);
      const passt = (x) => !f || fold([x.titel, x.projekt, (x.fuer || []).toString(), x.woher].join(' ')).includes(f);
      const n = (k) => L[k].filter(passt).length;
      const chips = `<button type="button" class="bp-ml-chip${S.art ? '' : ' an'}" data-mlart="">Alle ${Object.keys(L).reduce((s, k) => s + n(k), 0)}</button>`
        + Object.keys(ART).map((k) => `<button type="button" class="bp-ml-chip${S.art === k ? ' an' : ''}" data-mlart="${k}">${ART[k][0]} ${KURZ[k]} ${n(k)}</button>`).join('');
      const filt = S.modus === 'alle' ? `<select data-mlperson aria-label="Person"><option value="">alle Personen</option>${S.D.personen.map((p) => `<option value="${p.id}"${String(p.id) === String(S.person) ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <select data-mlrolle aria-label="Rolle"><option value="">alle Rollen</option>${S.D.rollen.map((r) => `<option value="${esc(r.key)}"${r.key === S.rolle ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select>` : '';
      const rumpf = Object.keys(ART).filter((k) => !S.art || S.art === k).map((k) => {
        const Z = L[k].filter(passt);
        return Z.length ? `<tr class="gr"><td colspan="7">${ART[k][0]} ${ART[k][1]}</td></tr>${Z.map(zeile).join('')}` : '';
      }).join('');
      return `<div class="bp-ml-kopf">${chips}${filt}<input type="search" class="bp-ml-such" data-mlsuch placeholder="suchen …" value="${esc(S.such)}">${S.modus === 'alle' ? '<button type="button" class="bph-btn" data-mlneu title="Alle Erinnerungen, Kalendereinladungen und Hinweise des Büros löschen – neu beginnen">🗑 Alles löschen …</button>' : ''}</div>
        <div class="bp-ml-tw"><table class="bp-ml"><thead><tr><th></th><th>Was</th><th>Projekt</th><th>Für</th><th>Wann</th><th>woher</th><th></th></tr></thead><tbody>${rumpf || '<tr><td colspan="7" class="bp-mu">Nichts gefunden.</td></tr>'}</tbody></table></div>
        <div class="bp-ml-fuss"><span class="bp-mu">${S.sel.size} markiert:</span><button type="button" class="bph-btn" data-mlalle="aus"${S.sel.size ? '' : ' disabled'}>ausschalten</button><button type="button" class="bph-btn" data-mlalle="an"${S.sel.size ? '' : ' disabled'}>einschalten</button><button type="button" class="bph-btn" data-mlalle="loeschen"${S.sel.size ? '' : ' disabled'}>löschen</button></div>
        <p class="bp-mu">Ausschalten: bleibt stehen, löst aber nichts mehr aus (keine Mail, nicht in „Zu tun“). Löschen: eigene Erinnerungen in den Papierkorb, Kalendereinladungen werden in Outlook abgesagt, aus dem Bauzeitenplan wird nur ausgeschaltet. ↺ = wieder wie die Vorgabe der Rolle.</p>`;
    }
    function matrix() {
      const R = S.D.rollen, M = S.D.matrix || {};
      return `<p class="bp-mu">Je Rolle an oder aus – das ist die Vorgabe. Jede Person kann bei sich ab- oder zuschalten (Für mich bzw. ⚙ → Persönlich → Benachrichtigungen). Ohne Häkchen-Zeile gilt die Regel wie bisher für alle.</p>
        <div class="bp-ml-tw"><table class="bp-ml"><thead><tr><th>Benachrichtigung</th>${R.map((r) => `<th class="m">${esc(r.name)}</th>`).join('')}<th></th></tr></thead><tbody>
        ${S.D.regeln.map((g) => `<tr data-mlregel="${esc(g.key)}"><td>${esc(g.name)}${M[g.key] ? '' : ' <span class="bp-ml-woher">· für alle</span>'}</td>${R.map((r) => `<td class="m"><input type="checkbox" data-mlrol="${esc(r.key)}"${!M[g.key] || M[g.key].includes(r.key) ? ' checked' : ''} aria-label="${esc(g.name)} – ${esc(r.name)}"></td>`).join('')}
          <td class="k">${M[g.key] ? '<button type="button" class="bp-ml-x" data-mlrstd title="wieder für alle Rollen">↺</button>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
    }
    /* EIN Haken: alle Benachrichtigungs-Mails aus (20.11.2026, Kern bpcore/mailaus.py) – je Person, und mit Recht „für alle“ */
    function ausHtml() {
      const M = S.D.mailaus; if (!M) return '';
      const de = (d) => (d || '').split('-').reverse().join('.'), st = M.stau, n = st ? (st.erinnerungen || 0) + (st.bautagebuch || 0) : 0;
      const dunkel = (() => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(document.body).backgroundColor || ''); return m ? (+m[1] * 299 + +m[2] * 587 + +m[3] * 114) / 1000 < 128 : false; })();
      /* Für die Person: DIESELBE Seite wie hinter dem Link in der Mail (bpcore/mailaus_seite.py), hier eingebettet – eine Oberfläche für beides */
      /* EINE Seite für beides (bpcore/mailaus_seite.py), hier eingebettet: unter „Für mich“ die der Person (dieselbe wie hinter dem Link in der
         Mail), unter „Für alle“ dieselbe fürs ganze Büro – kein eigener Haken „für alle“ mehr (20.11.2026) */
      const alle = S.modus === 'alle' && M.darf_alle && !o.nurIch, ich = S.modus === 'ich' || o.nurIch;
      if (!alle && !ich) return '';
      return `<div class="bp-ml-aus" data-mlausbox><iframe class="bp-ml-seite" data-mlseite title="Mails der Bauplattform: abschalten, pausieren, nach Apps${alle ? ' – für alle im Büro' : ''}" src="${esc(alle ? M.seite_alle : M.seite)}?e=1&amp;d=${dunkel ? 1 : 0}"></iframe>
        ${alle && st ? `<p class="bp-mu">${n ? `Aufgestaut: ${st.erinnerungen || 0} Erinnerungen und ${st.bautagebuch || 0} fällige Punkte aus dem Bautagebuch mit Termin vor dem ${de(st.grenze)}. Sie werden nicht mehr nachträglich gemailt` : 'Nichts aufgestaut. Erinnerungen mit älterem Termin werden nie nachträglich gemailt'} – Mails gibt es nur für Termine der letzten ${st.tage} Tage.</p>` : ''}</div>`;
    }
    function zeichnen() {
      const seg = S.D.darf_alle && !o.nurIch ? `<div class="bp-ml-seg" role="tablist">${[['ich', 'Für mich'], ['alle', 'Für alle'], ['rollen', 'Je Rolle']].map(([k, t]) => `<button type="button" role="tab" class="${S.modus === k ? 'an' : ''}" data-mlmod="${k}">${t}</button>`).join('')}</div>` : '';
      host.innerHTML = `${ausHtml()}${seg ? `<div class="bp-ml-kopf">${seg}</div>` : ''}<div data-mlinhalt>${S.modus === 'rollen' ? matrix() : liste()}</div>`;
      const f = host.querySelector('[data-mlseite]');   // Höhe folgt dem Inhalt – kein zweiter Rollbalken
      if (f) f.addEventListener('load', () => { try { const d = f.contentDocument, h = () => { f.style.height = d.documentElement.scrollHeight + 'px'; }; h(); new ResizeObserver(h).observe(d.body); } catch { f.style.height = '640px'; } });
    }
    host.addEventListener('click', async (e) => {
      const t = e.target, id = t.closest('[data-mlid]')?.dataset.mlid, x = id && alleZeilen().find((z) => z.id === id);
      if (t.closest('[data-mlmod]')) { S.modus = t.closest('[data-mlmod]').dataset.mlmod; S.sel.clear(); if (S.modus === 'rollen') zeichnen(); else await laden(); return; }
      if (t.closest('[data-mlart]')) { S.art = t.closest('[data-mlart]').dataset.mlart; zeichnen(); return; }
      if (t.closest('[data-mlsw]') && x) return aendern([id], x.aktiv ? 'aus' : 'an');
      if (t.closest('[data-mlstd]') && x) return aendern([id], 'standard');
      if (t.closest('[data-mldel]') && x) return aendern([id], 'loeschen');
      if (t.closest('[data-mlalle]')) return aendern([...S.sel], t.closest('[data-mlalle]').dataset.mlalle);
      if (t.closest('[data-mlneu]')) return neuBeginnen();
      if (t.closest('[data-mlrstd]')) return rollenSetzen(t.closest('[data-mlregel]').dataset.mlregel, null);
    });
    host.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.matches('[data-mlsel]')) { const id = t.closest('[data-mlid]').dataset.mlid; if (t.checked) S.sel.add(id); else S.sel.delete(id); zeichnen(); return; }
      if (t.matches('[data-mlperson]')) { S.person = t.value; S.rolle = ''; return laden(); }
      if (t.matches('[data-mlrolle]')) { S.rolle = t.value; S.person = ''; return laden(); }
      if (t.matches('[data-mlrol]')) {
        const tr = t.closest('[data-mlregel]');
        return rollenSetzen(tr.dataset.mlregel, [...tr.querySelectorAll('[data-mlrol]')].filter((c) => c.checked).map((c) => c.dataset.mlrol));
      }
    });
    host.addEventListener('input', (e) => { if (!e.target.matches('[data-mlsuch]')) return; S.such = e.target.value; const p = e.target.selectionStart; zeichnen(); const f = host.querySelector('[data-mlsuch]'); f.focus(); f.setSelectionRange(p, p); });
    /* Alles auf einmal weg (24.11.2026): Zahlen vorher, ein Rückgängig für alles – Kern meldungen.neu_beginnen */
    async function neuBeginnen() {
      let v; try { v = (await api('api/bp/meldungen', 'POST', { neu_beginnen: true, vorschau: true })).zahlen; } catch (e) { toast(e.message, true); return; }
      const T = [[v.erinnerung, 'eigene Erinnerungen und Erinnerungen aus Mails (gelöscht)'], [v.plan, 'Vorab-Erinnerungen aus dem Bauzeitenplan (erledigt)'],
        [v.bautagebuch, 'Erinnerungen an Einträgen im Bautagebuch (aus – die Frist bleibt am Eintrag)'], [v.aufgabe, 'Erinnerungen an Aufgaben (Glocke weg)'],
        [v.kalender, 'gesendete Kalendereinladungen (vergessen – ohne Absage-Mail; in Outlook bitte selbst löschen)'], [v.neu_fuer_dich, '„Neu für dich“ zu Abwesenheiten (gelöscht)']].filter(([n]) => n);
      if (!T.length) { toast('Es gibt keine Benachrichtigungen mehr.'); return; }
      if (!(await bpFrage(`Für das ganze Büro löschen?\n\n${T.map(([n, t]) => `• ${n} ${t}`).join('\n')}\n\nEs geht keine Mail hinaus. Neue Erinnerungen entstehen ab jetzt wie gewohnt.`, { ok: 'Alles löschen', gefahr: true }))) return;
      let r; try { r = await api('api/bp/meldungen', 'POST', { neu_beginnen: true }); } catch (e) { toast(e.message, true); return; }
      S.sel.clear(); await laden();
      rueckgaengig('Alle Benachrichtigungen gelöscht', async () => { await api('api/bp/meldungen', 'POST', { neu_zurueck: r.key }); await laden(); }, 10000,
        async () => { r = await api('api/bp/meldungen', 'POST', { neu_beginnen: true }); await laden(); });
    }
    async function rollenSetzen(key, liste) {
      let r; try { r = await api('api/bp/meldungen', 'POST', { rollen_fuer: key, rollen: liste }); } catch (e) { toast(e.message, true); return; }
      await laden();
      rueckgaengig('Vorgabe je Rolle geändert', async () => { await api('api/bp/meldungen', 'POST', { rollen_fuer: key, rollen: r.zurueck.rollen ?? null }); await laden(); }, { neu: async () => { await laden(); } });
    }
    laden();
  }
  window.bpMeldungen = { mount };
})();
