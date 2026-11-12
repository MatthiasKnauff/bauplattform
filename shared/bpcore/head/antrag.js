/* =====================================================================
   Urlaubsanträge in jeder App – Fenster oben rechts (Server: /api/bp/antraege, Regeln in bpcore/zeiten.py)
     • Wer entscheidet (Recht „Urlaubsanträge entscheiden“, als Vorgesetzte(r) oder ohne eingetragene Vorgesetzte):
       neue Anträge und Wünsche, einen genehmigten Urlaub zurückzuziehen – Genehmigen, Ablehnen (mit Begründung), Später.
     • Wer beantragt hat: die Entscheidung („genehmigt“, „abgelehnt“ …) und ein Hinweis, wenn nach einigen Tagen niemand
       geantwortet hat (Verwaltung → Einstellungen „zeit_antrag_erinnern“).
   Kein eigener Abruf beim Öffnen: api/platform meldet die Zahl (conf.antraege); nur dann werden die Einzelheiten geholt.
   Neue Anträge kommen über die Live-Aktualisierung (Tabelle zeit_antrag). „Später“ blendet bis zum nächsten Öffnen aus.
   Schließen nur über die Knöpfe.
   ===================================================================== */
(function los() {
  if (!window.BPHead || !BPHead.ready) { setTimeout(los, 200); return; }
  const H = window.BPHead;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tag = (d) => (d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' : '');
  const zr = (a) => tag(a.von) + (a.bis !== a.von ? ' – ' + tag(a.bis) + a.bis.slice(0, 4) : a.von.slice(0, 4));
  const zahl = (n) => String(n).replace('.', ',');
  const spaeter = () => { try { return JSON.parse(sessionStorage.getItem('bpAntragSpaeter') || '[]'); } catch { return []; } };
  let D = null, el = null, nr = 0, ablehnen = false;

  const css = document.createElement('style');
  css.textContent = `.bpurl{position:fixed;right:max(16px,env(safe-area-inset-right,0px));top:calc(var(--phh,52px) + 10px);z-index:2500;width:min(440px,calc(100vw - 32px));background:var(--card);color:var(--ink);border-radius:calc(14px*var(--rk,1));box-shadow:var(--sh0,0 16px 44px rgba(0,0,0,.28));border-top:4px solid var(--af-zeiten,#d6336c);padding:.85rem 1rem;font-size:.92rem}
.bpurl h4{margin:0 0 .25rem;font-size:1rem;display:flex;gap:.5rem;align-items:baseline}.bpurl h4 small{margin-left:auto;color:var(--mute);font-weight:400}
.bpurl .bpurl-m{color:var(--mute)}.bpurl .bpurl-m b{color:var(--ink)}.bpurl .bpurl-g{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin:.7rem 0 .2rem}
.bpurl ul{margin:0;padding-left:1.1rem}.bpurl q{display:block;margin:.4rem 0;padding:.4rem .6rem;background:var(--hov);border-radius:8px;quotes:none}
.bpurl .bpurl-k{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.8rem}.bpurl .bpurl-k .r{margin-left:auto}
.bpurl textarea{width:100%;box-sizing:border-box;min-height:3.4rem;margin-top:.5rem;font:inherit;border:1px solid var(--line);border-radius:8px;background:var(--inp,var(--card));color:var(--ink);padding:.4rem}`;
  document.head.appendChild(css);

  async function laden() {
    try { const r = await fetch('api/bp/antraege', { credentials: 'same-origin', cache: 'no-store' }); if (!r.ok) return; D = await r.json(); } catch { return; }
    zeigen();
  }
  const liste = () => {
    const weg = spaeter();
    return D ? D.entscheiden.filter((a) => !weg.includes('e' + a.id)).map((a) => ['e', a]).concat(D.meine.filter((a) => !weg.includes('m' + a.id)).map((a) => ['m', a])) : [];
  };
  function zeigen() {
    const L = liste(); if (nr >= L.length) nr = 0;
    if (!L.length) { if (el) { el.remove(); el = null; } return; }
    if (!el) { el = document.createElement('div'); el.className = 'bpurl'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Urlaubsanträge'); document.body.appendChild(el); }
    const [art, a] = L[nr], von = L.length > 1 ? `<small>${nr + 1} von ${L.length}</small>` : '';
    const kopf = `${zr(a)} · ${esc(a.art_text)} · <b>${zahl(a.tage)} Arbeitstag${a.tage === 1 ? '' : 'e'}</b>`;
    if (art === 'e') {
      const rz = a.rueckzug === 'beantragt';
      el.innerHTML = `<h4>${rz ? 'Zurückziehen' : 'Urlaubsantrag'} ${esc(a.name)}${von}</h4>
        <div class="bpurl-m">${kopf}${rz ? ' – schon genehmigt, soll zurückgezogen werden' : ` · Rest danach ${zahl(a.konto.rest - (a.art.startsWith('urlaub') ? a.tage : 0))}`}${a.vertretung ? ' · Vertretung ' + esc(a.vertretung) : ''}</div>
        ${a.notiz ? `<q>${esc(a.notiz)}</q>` : ''}
        <div class="bpurl-g">Wer ist sonst weg?</div>${a.auch_weg.length ? `<ul>${a.auch_weg.map((x) => `<li>${esc(x.name)}: ${zr(x)}${x.status === 'offen' ? ' (beantragt)' : ''}</li>`).join('')}</ul>` : '<div class="bpurl-m">niemand</div>'}
        ${ablehnen ? '<textarea data-bpurl-grund placeholder="Begründung (Pflicht) – z. B. „Bitte 21./22.12. tauschen, Abnahme Rohbau“"></textarea>' : ''}
        <div class="bpurl-k">${ablehnen ? '<button type="button" class="btn" data-bpurl="zurueck">Abbrechen</button><button type="button" class="btn pri" data-bpurl="nein">Ablehnen senden</button>'
          : `<button type="button" class="btn pri" data-bpurl="${rz ? 'rueckzug_ok' : 'genehmigen'}">✓ ${rz ? 'Zustimmen' : 'Genehmigen'}</button><button type="button" class="btn" data-bpurl="ablehnen">Ablehnen …</button>${L.length > 1 ? '<button type="button" class="btn" data-bpurl="weiter">Nächster ›</button>' : ''}<button type="button" class="btn r" data-bpurl="spaeter">Später</button>`}</div>`;
    } else {
      const was = a.wartet ? `wartet seit über ${D.erinnern_tage} Tagen auf eine Antwort – sprich am besten direkt nach.`
        : a.status === 'genehmigt' && !a.rueckzug ? (a.antwort ? 'bleibt genehmigt – Zurückziehen abgelehnt' : 'ist <b>genehmigt</b> – die Tage stehen in „Zeiten“.')
          : a.status === 'abgelehnt' ? 'wurde <b>abgelehnt</b>.' : a.status === 'zurueckgezogen' ? 'ist zurückgezogen – die Tage sind wieder frei.' : 'ist entschieden.';
      el.innerHTML = `<h4>Dein Antrag${von}</h4><div class="bpurl-m">${kopf}</div><p style="margin:.5rem 0 0">Der Antrag ${was}</p>
        ${a.antwort ? `<q>${esc(a.antwort)}</q><div class="bpurl-m">– ${esc(a.entschieden_von)}</div>` : a.entschieden_von && !a.wartet ? `<div class="bpurl-m">– ${esc(a.entschieden_von)}</div>` : ''}
        <div class="bpurl-k"><button type="button" class="btn pri" data-bpurl="gesehen">OK</button>${L.length > 1 ? '<button type="button" class="btn" data-bpurl="weiter">Nächster ›</button>' : ''}<button type="button" class="btn r" data-bpurl="spaeter">Später</button></div>`;
    }
    const t = el.querySelector('[data-bpurl-grund]'); if (t) t.focus();
  }

  document.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('[data-bpurl]'); if (!b || !el || !el.contains(b)) return;
    const [art, a] = liste()[nr] || [], k = b.dataset.bpurl; if (!a) return;
    if (k === 'weiter') { nr++; ablehnen = false; return zeigen(); }
    if (k === 'ablehnen' || k === 'zurueck') { ablehnen = k === 'ablehnen'; return zeigen(); }
    if (k === 'spaeter') { try { sessionStorage.setItem('bpAntragSpaeter', JSON.stringify(spaeter().concat(art + a.id))); } catch { /* egal */ } ablehnen = false; return zeigen(); }
    const aktion = k === 'nein' ? (a.rueckzug === 'beantragt' ? 'rueckzug_nein' : 'ablehnen') : k, antwort = k === 'nein' ? el.querySelector('[data-bpurl-grund]').value.trim() : '';
    if (k === 'nein' && !antwort) { if (window.toast) toast('Bitte eine Begründung angeben.', true); return; }
    b.disabled = true;
    try {
      const r = await fetch('api/bp/antraege/' + a.id, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aktion, antwort }) });
      const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Das ging nicht.');
      if (window.toast && aktion !== 'gesehen') toast({ genehmigen: `${a.name}: genehmigt – die Tage sind eingetragen.`, ablehnen: `${a.name}: abgelehnt.`, rueckzug_ok: `${a.name}: zurückgezogen – die Tage sind wieder frei.`, rueckzug_nein: `${a.name}: bleibt genehmigt.` }[aktion]);
      ablehnen = false; await laden();
    } catch (er) { b.disabled = false; if (window.toast) toast(er.message, true); }
  });

  H.ready.then(() => {
    const c = H.conf || {}; if (!H.me) return;
    if (c.antraege) laden();
    if (c.freigeben || c.antraege) H.live('zeit_antrag', laden, { projekt: false });
  }).catch(() => {});
})();
