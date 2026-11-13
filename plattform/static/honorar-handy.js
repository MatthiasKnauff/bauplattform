'use strict';
/* Honorar – Ansicht fürs Handy (unter 820 px Breite). Nur ansehen; erfassen lassen sich am Handy allein die Nebenkosten (nach Aufwand).
   Aufbau: Liste der Aufträge als Karten je Projekt → ein Auftrag mit Summe und drei Reitern (Übersicht, Phasen, Nebenkosten).
   Die Summe steht wahlweise oben fest oder nur im Reiter „Übersicht“ (Stecknadel in der Summenkarte, je Gerät gemerkt).
   Gemeinsame Namen aus honorar.js (L, D, AID, V, eur, eur0, std, zahl, ART, NKART, api, pdf); honorar.js ruft handyZeichne() auf. */
const HANDY = matchMedia('(max-width: 820px)');
let HV = 'liste', HT = 'ue';
const HSUM_KEY = 'honorar:summe-fest';
const hFest = () => { try { return localStorage.getItem(HSUM_KEY) !== '0'; } catch { return true; } };
const hFestSetzen = (an) => { try { localStorage.setItem(HSUM_KEY, an ? '1' : '0'); } catch { /* ohne Speicher: nur für diese Sitzung */ } };
let HFEST = hFest();
const hFarbe = (s) => (s === 'beauftragt' ? 'var(--ok,#1e8a4c)' : s === 'abgeschlossen' ? 'var(--mute)' : 'var(--y)');
const hProzent = (ist, soll) => (soll ? Math.round(ist / soll * 100) : 0);
const hBalken = (ist, soll) => `<div class="vb${ist > soll ? ' ueber' : ''}"><i style="width:${Math.min(100, hProzent(ist, soll))}%"></i></div>`;

function handyZeichne() {
  document.body.classList.add('ho-handy');
  if (HV === 'auftrag' && D) return handyAuftrag();
  HV = 'liste';
  const G = {};
  L.auftraege.forEach((a) => { (G[a.projekt || '–'] = G[a.projekt || '–'] || []).push(a); });
  const karten = Object.keys(G).sort((x, y) => x.localeCompare(y, 'de')).map((p) => `<div class="hh-pj">${esc(p)}</div>${G[p].map((a) => `
    <button type="button" class="ho-k hh-au" data-hau="${a.id}"><i class="hh-dot" style="background:${hFarbe(a.status)}"></i><span class="hh-n">${esc(a.name)}</span><b>${eur0(a.netto)}</b>
      <span class="hh-s"><span class="hh-chip">${esc(ART[a.art] || a.art)}</span> · ${esc((L.status || {})[a.status] || a.status)}</span><span class="hh-w">${a.warnung ? '! über Honorar' : ''}</span>
      ${hBalken(a.ist_kosten || 0, a.netto || 0)}</button>`).join('')}`).join('');
  V.innerHTML = `<div class="hh">${ueKarte()}${L.auftraege.length ? karten : '<div class="leer">Noch kein Honorarauftrag. Aufträge werden am Rechner angelegt.</div>'}</div>`;
  V.scrollTop = 0;
  if (!UE.r) ueRechnen(true);   // honorar-ueberschlag.js: Kosten aus der Kostenermittlung des Projekts vorschlagen
}

function handyAuftrag() {
  const a = D.auftrag, k = D.rechnung;
  const summe = `<div class="ho-k hh-sum"><span>Honorar netto</span><button type="button" class="hh-pin${HFEST ? ' an' : ''}" data-hpin title="${HFEST ? 'Summe nur unter „Übersicht“ zeigen' : 'Summe oben anheften'}" aria-label="Summe anheften">📌</button>
      <b class="hh-gr">${eur(k.netto)}</b><span class="hh-br">brutto ${eur(k.brutto)}</span>
      <span>Aufwand laut Zeiten ${std(k.ist_min)} · ${eur0(k.ist_kosten)}</span><span>${hProzent(k.ist_kosten, k.netto)} %</span>${hBalken(k.ist_kosten, k.netto)}</div>`;
  const reiter = `<div class="hh-tabs">${[['ue', 'Übersicht'], ['ph', a.art === 'hoai' ? 'Phasen' : 'Leistung'], ['nk', 'Nebenkosten']].map(([t, n]) => `<button type="button" data-ht="${t}" class="${HT === t ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  const zeile = (l, w) => `<span>${l}</span><b>${w}</b>`;
  let inhalt = '';
  if (HT === 'ue') {
    inhalt = `${HFEST ? '' : summe}<div class="ho-k hh-li">
        ${zeile('Projekt', esc(D.projekt))}${zeile('Art', esc(ART[a.art] || a.art))}${zeile('Stand', esc((L.status || {})[a.status] || a.status))}
        ${a.auftraggeber ? zeile('Auftraggeber:in', esc(a.auftraggeber)) : ''}${a.datum ? zeile('Datum', esc(new Date(a.datum).toLocaleDateString('de-DE'))) : ''}</div>
      ${a.art === 'hoai' ? `<div class="ho-k hh-li">${zeile('Anrechenbare Kosten', eur(a.kosten))}${zeile('Honorarzone', esc(L.zonen[(a.zone || 1) - 1] || ''))}
        ${zeile('Honorarsatz', !+a.satz ? 'Basishonorarsatz' : +a.satz === 50 ? 'Mittelsatz' : +a.satz === 100 ? 'oberer Honorarsatz' : zahl(a.satz) + ' % der Spanne')}${+a.umbau ? zeile('Umbauzuschlag', zahl(a.umbau) + ' %') : ''}${zeile('100 % der Leistungen', eur(k.grund))}</div>` : ''}
      <div class="ho-k hh-li">${zeile(a.art === 'stunden' ? 'Aufwand (abgerechnet)' : a.art === 'pauschal' ? 'Pauschalhonorar' : 'Leistungsphasen', eur(k.summe_lph))}
        ${k.umbau ? zeile(`Umbauzuschlag ${zahl(a.umbau)} %`, eur(k.umbau)) : ''}${zeile('Nebenkosten', eur(k.nk))}${zeile('zzgl. ' + zahl(L.mwst) + ' % USt.', eur(k.mwst))}
        ${a.art === 'hoai' ? zeile('erbracht', eur(k.erbracht)) : ''}</div>
      ${k.warnungen.length ? `<div class="ho-warn">${k.warnungen.map((w) => `<span>⚠ ${esc(w)}</span>`).join('')}</div>` : ''}`;
  } else if (HT === 'ph') {
    if (a.art === 'hoai') {
      inhalt = k.phasen.map((p) => `<button type="button" class="ho-k hh-lph${p.an ? '' : ' aus'}" data-hlph="${p.key}">
          <span class="hh-n">LPh ${p.key.slice(3)} ${esc(p.name)}</span><b>${p.an ? eur(p.honorar) : '–'}</b>
          <span class="hh-s">${p.an ? `${zahl(p.p)} % · erbracht ${zahl(p.erbracht || 0)} %` : 'nicht beauftragt'}</span><span class="hh-s r">${p.ist_min ? std(p.ist_min) : ''}</span>
          ${p.an ? hBalken(p.ist_kosten, p.honorar) : ''}
          <span class="hh-mehr">${p.an ? `HOAI ${zahl(p.vorgabe)} % · Aufwand ${std(p.ist_min)} · ${p.ist_kosten ? eur0(p.ist_kosten) : '0 €'}${p.honorar ? ` – ${hProzent(p.ist_kosten, p.honorar)} % des Honorars dieser Phase` : ''}` : `HOAI ${zahl(p.vorgabe)} %`}</span></button>`).join('');
    } else if (a.art === 'stunden') {
      const Z = Object.entries(D.zeiten), AR = Object.fromEntries(L.arten || []);
      inhalt = `<div class="ho-k hh-li">${zeile('Abrechnung je angefangene', a.einheit + ' min')}${zeile('Stundensatz', a.satz_h ? eur(a.satz_h) + '/h' : 'je Person')}</div>
        ${Z.length ? Z.map(([art, z]) => `<div class="ho-k hh-li">${zeile(esc(AR[art] || art), eur(z.betrag))}<span class="hh-s">${Object.entries(z.personen).map(([n, m]) => esc(n) + ' ' + std(m)).join(', ')}</span><span class="hh-s r">${std(z.min)}</span></div>`).join('')
          : '<div class="leer">Noch keine bestätigten Zeiten für dieses Projekt.</div>'}`;
    } else {
      inhalt = `<div class="ho-k hh-li">${zeile('Pauschalhonorar', eur(a.pauschal))}${zeile('Aufwand laut Zeiten', std(k.ist_min) + ' · ' + eur0(k.ist_kosten))}</div>`;
    }
  } else {
    const auf = a.nk.art === 'aufwand', fahrt = D.zeiten.fahrt;
    inhalt = `<div class="ho-k hh-li">${zeile('Abrechnung', auf ? 'nach Aufwand' : `pauschal ${zahl(a.nk.p)} % vom Honorar`)}${zeile('Summe', eur(k.nk))}</div>
      ${auf ? D.nk_liste.map((n) => `<div class="ho-k hh-li">${zeile(esc(n.text || NKART[n.art] || n.art), eur(n.betrag))}<span class="hh-s">${esc(n.datum ? new Date(n.datum).toLocaleDateString('de-DE') : '')} · ${esc(NKART[n.art] || n.art)}</span></div>`).join('') : ''}
      ${auf && fahrt ? `<p class="mute hh-ab">Fahrzeit laut Zeiten: ${std(fahrt.min)} – bei Bedarf als Fahrt eintragen.</p>` : ''}
      ${auf ? '<button type="button" class="btn pri hh-nk" data-hnk>＋ Nebenkosten</button>' : '<p class="mute hh-ab">Pauschale Nebenkosten – Einzelbeträge gibt es nur bei „nach Aufwand“ (am Rechner umstellen).</p>'}`;
  }
  V.innerHTML = `<div class="hh"><div class="hh-oben"><div class="hh-kopf"><button type="button" data-hzur aria-label="Zurück zur Liste">‹</button><b>${esc(a.name)}</b>
      <button type="button" data-hpdf title="${a.status === 'angebot' ? 'Angebot' : 'Aufstellung'} als PDF" aria-label="PDF">PDF</button></div>${HFEST ? summe : ''}${reiter}</div>
    <div class="hh-inhalt">${inhalt}</div></div>`;
}

/* Nebenkosten erfassen – das einzige, was am Handy geändert werden kann */
function handyNk() {
  const heute = new Date().toISOString().slice(0, 10), id = AID;
  modalBox(`<h3>Nebenkosten erfassen</h3>
    <div class="seg hh-nkart" role="group">${Object.entries(NKART).map(([v, t], i) => `<button type="button" data-m="art" data-nka="${v}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div>
    <div class="row"><label>Betrag (€)</label><input id="hnB" inputmode="decimal" class="hh-betrag" autocomplete="off"></div>
    <div class="row"><label>Text</label><input id="hnT" placeholder="z. B. Baustelle, Abstimmung Statik"></div>
    <div class="row"><label>Datum</label><input id="hnD" type="date" value="${heute}"></div>
    <div class="acts"><button type="button" class="btn" data-m="x">Abbrechen</button><button type="button" class="btn pri" data-m="ok">Eintragen</button></div>`,
  async (m, bg, close, b) => {
    if (m === 'art') { bg.querySelectorAll('[data-nka]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (m === 'x') { close(); return; }
    if (m !== 'ok') return;
    const betrag = bg.querySelector('#hnB').value.trim();
    if (!betrag) { toast('Bitte einen Betrag eingeben.', true); return; }
    try {
      D = await api(`api/auftraege/${id}/nk`, 'POST', { datum: bg.querySelector('#hnD').value, art: bg.querySelector('[data-nka].on').dataset.nka, text: bg.querySelector('#hnT').value, betrag });
      close(); handyZeichne();
      const n = D.nk_liste.reduce((x, y) => (!x || y.id > x.id ? y : x), null);
      if (n) rueckgaengig('Nebenkosten eingetragen', async () => { D = await api('api/nk/' + n.id, 'DELETE'); AID = id; handyZeichne(); });
    } catch (e) { toast(e.message, true); }
  });
}

V.addEventListener('click', async (e) => {
  if (!HANDY.matches) return;
  const au = e.target.closest('[data-hau]');
  if (au) { AID = +au.dataset.hau; HT = 'ue'; HV = 'auftrag'; try { D = await api('api/auftraege/' + AID); } catch (er) { toast(er.message, true); return; } handyZeichne(); V.scrollTop = 0; return; }
  if (e.target.closest('[data-hzur]')) { HV = 'liste'; await laden(); return; }
  if (e.target.closest('[data-hpdf]')) { pdf(); return; }
  if (e.target.closest('[data-hpin]')) { HFEST = !HFEST; hFestSetzen(HFEST); if (!HFEST) HT = 'ue'; handyZeichne(); return; }
  const t = e.target.closest('[data-ht]');
  if (t) { HT = t.dataset.ht; handyZeichne(); V.scrollTop = 0; return; }
  const ph = e.target.closest('[data-hlph]');
  if (ph) { ph.classList.toggle('auf'); return; }
  if (e.target.closest('[data-hnk]')) handyNk();
});
HANDY.addEventListener('change', () => { if (!HANDY.matches) document.body.classList.remove('ho-handy'); if (L) zeichne(); });
