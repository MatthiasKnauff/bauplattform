'use strict';
/* Ausschreibung – Versand an Bieter:innen (vor ava-start.js geladen, gemeinsame Namen; Server: ava_versand.py).
   Eigene Seite links unter Vergabe → „Versand & Rücklauf“ (bis 18.11.2026 „Versand an Bieter:innen“; besprochen am 13.11.2026, Mock „Versand als Seite“): links die LVs,
   darüber Ablauf und Befehlsleiste (Senden, Erinnern, Nachversand · Unterlagen aus Pläne & Dateien, Fileserver, vom Rechner).
   Auf der Seite: Termine (Abgabe, Rückmeldung), der Bereich „Unterlagen“, je Bieter:in Ansprechperson, Anrede und Stand, darunter die Läufe.
   Senden öffnet den gemeinsamen Versand-Dialog (BPHead.versand) – jede Firma bekommt ihre eigene Mail, nichts geht automatisch. Danach liegt
   alles in einem Ordner „Versand <Datum>“ unter dem LV-Ordner im Projektordner (mit „Angefragte Firmen“ als PDF und Excel). */
const VS = { D: null, lid: null, rechner: [], rlid: null };   // rechner: Dateien vom Rechner – nur bis zum Senden (nicht in der Datenbank)
const vsDe = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1]}${m[4] ? ' ' + m[4] : ''}` : ''; };
const VS_RUECK = { abgegeben: 'abgegeben', zusage: 'will abgeben', absage: 'gibt nicht ab', '': 'offen' };   // von Hand; „angebot“ setzt die Plattform, sobald ein Angebot eingetragen ist
const VS_ST = { abgegeben: 'ok', angebot: 'ok', zusage: 'wo', absage: 'no' };
const vsZeit = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(t || ''); return m ? `${m[3]}.${m[2]}. ${m[4]}` : ''; };
const vsMb = (n) => (n >= 1048576 ? (n / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB' : n ? Math.max(1, Math.round(n / 1024)) + ' KB' : '');

function vVersand() {   // Inhalt rechts neben dem Baum; geladen wird danach (vsSeiteLaden) – rechts der abdockbare Bereich mit der Mail (vsRechts)
  return `<div class="vs-sp"><div class="vs-l"><div class="vs-seite" id="vsSeite">${VS.D && VS.lid === (L && L.id) ? vsHtml() : '<p class="hint">Lade …</p>'}</div></div></div>`;
}
async function vsSeiteLaden(neu) {
  const el = document.getElementById('vsSeite'); if (!el || !L) return;
  if (vsMehr()) return vsMehrLaden();   // mehrere LVs angehakt: gemeinsamer Versand (unten)
  if (VS.rlid !== L.id) { VS.rechner = []; VS.rlid = L.id; VS.art = ''; VS.wahl = {}; VS.fuer = null; VS.anh = ''; VS.edit = false; }
  try { if (!KONT) KONT = await api('api/kontakte').catch(() => []); if (neu || VS.lid !== L.id || !VS.D) { VS.D = await api(`api/lv/${L.id}/versand`); VS.lid = L.id; } }
  catch (e) { el.innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; }
  vsNeu();
}
const vsNeu = () => { const el = document.getElementById('vsSeite'); if (vsMehr()) { if (el && Object.keys(VS.MD).length) el.innerHTML = vsMehrHtml(); if (tab === 'versand') uLeisteNeu(); return; } if (el && VS.D && L && VS.lid === L.id) { el.innerHTML = vsHtml(); vsRechts(); } if (tab === 'versand') uLeisteNeu(); };

function vsBefehle() {   // Befehlsleiste (ava-kern.js → bereichBefehle)
  const D = VS.D && VS.lid === L.id ? VS.D : null, B = D ? D.bieter : [], mit = B.filter((b) => b.email), raus = mit.filter((b) => b.versendet);
  const ic = { mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', glocke: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    neu: '<path d="M4 4v6h6"/><path d="M20 12a8 8 0 1 1-2.3-5.7L20 9"/>', plan: '<path d="M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16M15 5v16"/>', server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 17.5h.01"/>', pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>' };
  if (vsMehr()) return [{ titel: 'Versand', knoepfe: [{ t: `An Bieter:innen senden (${VS.M.size} LVs)`, ic: ic.mail, attrs: 'data-vsmsenden', aus: !(VS.mw && VS.mw.size), tip: 'Eine Mail je Firma mit allen ihren LVs – über den gemeinsamen Versand-Dialog' }] }];
  return [{ titel: 'Versand', knoepfe: [{ t: 'An Bieter:innen senden', ic: ic.mail, attrs: 'data-vssenden="versand"', aus: !mit.length, tip: mit.length ? 'Jede Firma bekommt ihre eigene Mail mit LV und Unterlagen – nichts geht automatisch' : 'Erst Bieter:innen mit E-Mail-Adresse hinzufügen' },
    { t: 'Erinnern', ic: ic.glocke, attrs: 'data-vssenden="erinnerung"', aus: !raus.length, tip: 'Wer noch nicht geantwortet hat, an Rückmeldung und Abgabe erinnern' },
    { t: 'Nachversand', ic: ic.neu, attrs: 'data-vssenden="nachversand"', aus: !raus.length, tip: 'Geändertes LV und Unterlagen an alle schicken, die schon angefragt sind (ohne Absagen)' }] },
  { titel: 'Bieter:innen', knoepfe: [{ t: `Entfernen${VS.sel && VS.sel.size > 1 ? ` (${VS.sel.size})` : ''}`, ic: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>', attrs: 'data-vsentf', aus: !(D && VS.sel && VS.sel.size), rot: true, tip: 'Markierte Firmen aus der Bieterliste nehmen (Entf) – Klick, Strg+Klick, Umschalt+Klick markiert' }] },
  { titel: 'Liste', knoepfe: [{ t: 'Drucken', ic: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M6 14h12v7H6z"/>', attrs: 'data-vsdruck', aus: !B.length, tip: 'Bieter:innen mit Rücklauf als PDF – Sortierung und Filter wie rechts; liegt auch im LV-Ordner unter „Bieterliste“' },
    { t: 'Excel', ic: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>', attrs: 'data-vsdruck="xlsx"', aus: !B.length, tip: 'Dieselbe Liste als Excel-Datei' }] },
  { titel: 'Unterlagen', knoepfe: [{ t: 'Pläne & Dateien', ic: ic.plan, attrs: 'data-vsu="plaene"', aus: !L.project_id && !pid, tip: 'Pläne (neuester Stand) und PDFs aus dem Projekt beilegen' },
    { t: 'Fileserver', ic: ic.server, attrs: 'data-vsu="server"', aus: !L.project_id && !pid, tip: 'Dateien aus dem Projektordner beilegen' },
    { t: 'Vom Rechner', ic: ic.pc, datei: { accept: '', attrs: 'data-vsrechner multiple' }, tip: 'Dateien vom Rechner beilegen – oder in den Bereich „Unterlagen“ ziehen' }] },
  { titel: 'Nachverfolgen', rechts: true, knoepfe: [{ t: '↗ alle LVs nachverfolgen', ic: (NAVI.flatMap((g) => g[1]).find((x) => x[0] === 'nachverfolgen') || [])[2] || ic.mail, fn: () => { tab = 'nachverfolgen'; LS.set('tab', tab); render(); }, tip: 'Seite „Nachverfolgen“: alle versendeten LVs über alle Projekte – Rücklauf, fällige Anrufe, Fristen (Mock „Versand & Rücklauf“, B1)' }] }];
}

function vsUnterlagenHtml() {
  const D = VS.D, U = D.unterlagen || [], R = VS.rechner, g = U.reduce((s, x) => s + (x.groesse || 0), 0) + R.reduce((s, x) => s + x.groesse, 0);
  const vk = (t, geaendert) => (t ? `<small class="vs-vk${geaendert ? ' gd' : ''}">verschickt ${esc(t.slice(0, 6))}${geaendert ? ' · geändert seitdem' : ''}</small>` : '<small class="vs-vk neu">noch nicht verschickt</small>');   // Stand je Unterlage – für den Nachversand
  const z = (ic, name, sub, tag, gr, x, v) => `<div class="vs-u"><span>${ic}</span><span class="vs-un">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="vs-ut">${tag}</span><span class="vs-ug">${gr}${v || ''}</span>${x || '<span></span>'}</div>`;
  return `<section class="vs-unt" data-vsdrop><h4>📎 Unterlagen für die Bieter:innen <span class="hint">· ${U.length + R.length + (D.ohne_x83 ? 1 : 2) + (D.tueren && !D.ohne_tl ? 1 : 0)} Dateien${g ? ' · ' + vsMb(g) + ' dazu' : ''}</span></h4>
    ${z('📄', D.namen.pdf, 'LV ohne Preise – entsteht beim Senden aus dem aktuellen Stand', 'immer dabei', '', '', vk(D.lv_verschickt, D.lv_geaendert))}
    ${D.ohne_x83 ? `<div class="vs-u vs-aus"><span>📦</span><span class="vs-un">GAEB-Datei (X83) wird nicht mitgeschickt</span><span></span><span></span><button type="button" class="ib" data-vsx83="1" title="GAEB-Datei wieder mitschicken" aria-label="GAEB-Datei wieder mitschicken">＋</button></div>`
      : z('📦', D.namen.x83, 'LV als GAEB-Datei – entsteht beim Senden', 'GAEB', '', '<button type="button" class="ib" data-vsx83="0" title="GAEB-Datei nicht mitschicken" aria-label="GAEB-Datei nicht mitschicken">✕</button>', vk(D.lv_verschickt, D.lv_geaendert))}
    ${!D.tueren ? '' : D.ohne_tl ? `<div class="vs-u vs-aus"><span>🚪</span><span class="vs-un">Fenster- &amp; Türliste wird nicht mitgeschickt</span><span></span><span></span><button type="button" class="ib" data-vstl="1" title="Türliste wieder mitschicken" aria-label="Türliste wieder mitschicken">＋</button></div>`
      : z('🚪', `Fenster- & Türliste (${D.tueren} Elemente)`, 'die Elemente dieses LV als PDF – entsteht beim Senden', 'Anlage', '', '<button type="button" class="ib" data-vstl="0" title="Türliste nicht mitschicken" aria-label="Türliste nicht mitschicken">✕</button>', vk(D.lv_verschickt, D.lv_geaendert))}
    ${U.map((x) => z(x.quelle === 'plan' ? '📐' : '📄', x.name, x.sub, x.quelle === 'server' ? 'Fileserver' : 'Pläne &amp; Dateien', vsMb(x.groesse), `<button type="button" class="ib" data-vsux="${esc(x.pfad)}" title="Nicht mitschicken" aria-label="Nicht mitschicken">✕</button>`, vk(x.verschickt))).join('')}
    ${R.map((x, i) => z('🖥', x.name, 'nur bis zum Senden – danach im Versand-Ordner', 'Rechner', vsMb(x.groesse), `<button type="button" class="ib" data-vsrx="${i}" title="Nicht mitschicken" aria-label="Nicht mitschicken">✕</button>`, vk(''))).join('')}
    <p class="hint vs-uh">Oben <b>Unterlagen</b>: Pläne &amp; Dateien, Fileserver oder vom Rechner – oder Dateien hierher ziehen.${g > 20 * 1048576 ? ' <b style="color:var(--red)">Zusammen über 20 MB – manche Postfächer nehmen das nicht an.</b>' : ''}</p></section>`;
}

function vsHtml() {
  const D = VS.D, B = D.bieter, n = (k) => B.filter((b) => (b.rueck || '') === k).length;
  const heute = new Date().toISOString().slice(0, 10);
  const zeile = (b) => { const st = b.rueck || '', ang = st === 'angebot', A = b.anrufe || [], faellig = b.naechst && b.naechst <= heute && (st === '' || st === 'zusage');
    const frist = !st && b.versendet && D.rueckmeldung && D.rueckmeldung < heute;
    /* kompakt (besprochen am 14.11.2026): eine Zeile je Firma – Klick klappt darunter die Details auf (An, Anrede, Stand, Telefonnotizen) */
    const v = b.verlauf || {}, letzt = [...(v.nachgefragt || [])].pop(), zul = letzt ? `${letzt.weg === 'tel' ? '☎' : '✉'} ${vsTag(letzt.t).slice(0, 6)}` : b.versendet ? `✉ ${esc(b.versendet.slice(0, 6))}` : '–';
    const cls = ang || st === 'abgegeben' ? 'ok' : st === 'absage' ? 'no' : st === 'zusage' ? 'z' : 'o', auf = VS.auf === b.contact_id;
    return `<tr data-vscid="${b.contact_id}" class="vs-kz${faellig ? ' vs-faellig' : ''}${VS.fuer === b.contact_id ? ' vs-akt' : ''}${VS.sel && VS.sel.has(b.contact_id) ? ' vs-sel' : ''}${auf ? ' auf' : ''}">
      <td class="vs-fi"><span class="vs-car">${bpKlapp(auf)}</span><b>${esc(b.name)}</b>${b.trade ? ` <small>${esc(b.trade)}</small>` : ''}</td>
      <td class="vs-an1">${b.email ? esc(b.email) : '<span class="vs-rot">keine E-Mail</span>'}</td>
      <td class="vs-st1"><button type="button" class="vs-ch ${cls}" data-vsstw${ang ? ' disabled title="Angebot eingetragen – unter Angebote &amp; Preisspiegel"' : ''}>${ang ? 'Angebot ✓' : esc(VS_RUECK[st] || 'offen') + ' ▾'}</button>${st === 'zusage' && b.bis ? ` <small>bis ${esc(vsDe(b.bis).slice(0, 6))}</small>` : frist ? ' <small class="vs-rot">Frist um</small>' : ''}</td>
      <td class="vs-zl">${zul}</td>
      <td class="vs-mh"><button type="button" class="ib vs-del" data-vsdel title="Aus der Bieterliste nehmen (Entf) – in den Adressen bleibt die Firma" aria-label="Aus der Bieterliste nehmen">🗑</button><button type="button" class="ib" data-vsmehr title="Mehr" aria-label="Mehr">⋯</button></td></tr>
      ${auf ? `<tr data-vscid="${b.contact_id}" class="vs-det"><td colspan="5"><div class="vs-dg">
        <div class="vs-an">${(b.mails || []).length ? `<label class="vs-kl">Ansprechperson<select data-vsf="person" data-bp-auswahl aria-label="Ansprechperson"><option value=""${b.person ? '' : ' selected'} data-sub="Sehr geehrte Damen und Herren">Firma allgemein</option>${(b.personen || []).map((p) => `<option value="${esc(p.name)}"${p.name === b.person ? ' selected' : ''} data-sub="${esc([p.funktion, p.eigene ? p.email : 'ohne eigene E-Mail → ' + p.email].filter(Boolean).join(' · '))}">${esc(p.name)}</option>`).join('')}</select></label>
          <label class="vs-kl">An<select data-vsf="email" data-bp-auswahl aria-label="An">${b.mails.map((m) => `<option value="${esc(m)}"${m === b.email ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></label>` : '<span class="vs-rot">keine E-Mail in den Adressen</span>'}
        <input data-vsf="anrede" value="${esc(b.anrede)}" aria-label="Anrede" title="Anrede – aus Anrede und Name der Ansprechperson in den Adressen, hier für diese Firma änderbar"><small>${b.versendet ? `versendet ${esc(b.versendet)}` : 'noch nicht versendet'}</small>${!b.versendet && b.email && st !== 'absage' ? `<button type="button" class="btn sm pri" data-vseinzeln="${b.contact_id}" title="Versand-Dialog nur für diese Firma – mit Vorschau, gesendet wird erst dort">✉ jetzt senden …</button>` : ''}</div>
        <div class="vs-sta"><span class="seg sm" role="group" aria-label="Stand">${Object.entries(VS_RUECK).map(([k, t]) => `<button type="button" data-vsrueck="${k}" class="${(ang ? 'abgegeben' : st) === k ? 'on ' + (VS_ST[k] || '') : ''}"${ang ? ' disabled' : ''}>${t}</button>`).join('')}</span>
        ${ang ? '<small>Angebot eingetragen – unter Angebote &amp; Preisspiegel</small>' : st === 'zusage' ? `<label class="vs-kl">Abgabe zugesagt bis<input type="date" data-vsf="bis" value="${esc(b.bis)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''}></label>` : st === 'absage' ? `<input class="vs-kl" data-vsf="grund" value="${esc(b.grund)}" placeholder="Grund (z. B. keine Kapazität)">` : frist ? `<small class="vs-rot">noch keine Rückmeldung · Frist ${esc(vsDe(D.rueckmeldung))}</small>` : ''}</div>
        <div class="vs-nf">${A.map((x, i) => `<div class="vs-a"><i>${i + 1}</i><span class="d">${esc(vsZeit(x.t))}</span><span>${esc(x.text)}${x.wer ? ` <small>· ${esc(x.wer)}</small>` : ''}</span><button type="button" class="ib" data-vsaweg="${i}" aria-label="Notiz löschen">✕</button></div>`).join('')}
        ${b.naechst && (st === '' || st === 'zusage') ? `<div class="vs-a nx"><i>↻</i><span class="d">${esc(vsDe(b.naechst))}</span><span>wieder anrufen</span></div>` : ''}
        ${ang || st === 'abgegeben' || st === 'absage' ? '' : A.length >= 10 ? '<small>10 von 10 Notizen</small>' : `<div class="vs-ae"><input data-vsanruf placeholder="Telefonnotiz … (Enter)" aria-label="Telefonnotiz"><label class="vs-kl" title="nächster Anruf – legt ein To-do an">↻<input type="date" data-vsnaechst value="${esc(b.naechst)}" aria-label="nächster Anruf"></label><button type="button" class="btn sm" data-vsangerufen title="Notiz „angerufen“ mit jetzt anlegen">📞 angerufen</button></div>${A.length ? `<small>${A.length} von 10 Notizen</small>` : ''}`}</div></div></td></tr>` : ''}`; };
  const art = { versand: 'Versand', erinnerung: 'Erinnerung', nachversand: 'Nachversand' };
  return `<div class="vs-t"><label>Abgabe der Angebote<input type="datetime-local" data-vst="abgabe" value="${esc(D.abgabe)}"${D.rueckmeldung ? ` min="${esc(D.rueckmeldung.slice(0, 10))}T00:00"` : ''}></label><label>Rückmeldung bis<input type="date" data-vst="rueckmeldung" value="${esc(D.rueckmeldung)}"${D.abgabe ? ` max="${esc(D.abgabe.slice(0, 10))}"` : ''} title="Bis wann die Firma zu- oder absagt – spätestens am Tag der Abgabe"></label>
    <div class="vs-z"><span>angeschrieben <b>${B.filter((b) => b.versendet).length}</b> von ${B.length}</span><span>abgegeben <b class="ok">${n('angebot') + n('abgegeben')}</b></span><span>wollen abgeben <b class="wo">${n('zusage')}</b></span><span>geben nicht ab <b class="no">${n('absage')}</b></span><span>offen <b>${n('')}</b></span></div></div>
    ${vsUnterlagenHtml()}
    ${(() => { const O = B.filter((b) => b.email && !b.versendet && b.rueck !== 'absage'); return O.length ? `<div class="vs-jetzt"><span><b>${O.length} Bieter:in${O.length === 1 ? '' : 'nen'} noch nicht angeschrieben</b><small>${esc(O.slice(0, 4).map((b) => b.name).join(', '))}${O.length > 4 ? ' …' : ''}</small></span><button type="button" class="btn pri" data-vssenden="versand" title="Versand-Dialog öffnen – mit Vorschau, gesendet wird erst dort">✉ An ${O.length} Bieter:in${O.length === 1 ? '' : 'nen'} senden …</button></div>` : ''; })()}
    <h4 class="vs-h">Bieter:innen</h4>
    <div class="bar" style="margin:.2rem 0 .6rem"><select data-vsdazu multiple data-bp-auswahl data-neu="Firma" data-ph="＋ Bieter:innen suchen oder eintippen – mehrere anhaken …" aria-label="Bieter:innen hinzufügen">${D.vorschlaege.length ? `<optgroup label="Gewerk passt">${D.vorschlaege.map((k) => `<option value="${k.contact_id}">${esc(k.name)}${k.city ? ' · ' + esc(k.city) : ''}</option>`).join('')}</optgroup>` : ''}<optgroup label="Alle Firmen">${(KONT || []).filter((k) => !B.some((b) => b.contact_id === k.id) && !D.vorschlaege.some((v) => v.contact_id === k.id)).slice(0, 400).map((k) => `<option value="${k.id}">${esc(k.name)}${k.trade ? ' · ' + esc(k.trade) : ''}</option>`).join('')}</optgroup></select></div>
    <div class="vs-b">${B.length ? `<div class="tblw"><table class="vs-tab"><thead><tr><th>Firma</th><th class="vs-an1">An</th><th>Stand</th><th>zuletzt</th><th></th></tr></thead><tbody>${B.map(zeile).join('')}</tbody></table></div>` : '<div class="card empty"><p class="hint">Noch keine Bieter:innen – oben suchen und anhaken (gern mehrere; passendes Gewerk steht oben). Gibt es die Firma noch nicht: Namen eintippen und „＋ … als neue Firma anlegen“. Wer ein Angebot abgegeben hat, steht hier von selbst.</p></div>'}</div>
    ${D.laeufe.length ? `<h4 class="vs-h">Bisher verschickt</h4>${D.laeufe.slice().reverse().map((x) => `<div class="vs-l"><b>${esc(art[x.art] || 'Versand')} ${esc(x.datum)}</b> · ${esc(x.wer)} · ${x.an.filter((a) => a.ok).length} Mail${x.an.filter((a) => a.ok).length === 1 ? '' : 's'}${x.an.some((a) => !a.ok) ? ` · <span style="color:var(--red)">${x.an.filter((a) => !a.ok).length} Fehler</span>` : ''}<small>${esc(x.an.map((a) => a.name).join(', '))}</small>${(x.anlagen || []).length ? `<small>📎 ${esc(x.anlagen.join(', '))}</small>` : ''}${(x.ablage || []).length ? `<small>📁 ${esc(String(x.ablage[0]).split('/').filter((t) => !/\.[a-z0-9]{2,4}$/i.test(t)).join('/'))}</small>` : ''}</div>`).join('')}` : ''}`;
}
async function vsSetzen(body, text) {
  const alt = VS.D;
  try { VS.D = await api(`api/lv/${L.id}/versand`, 'PUT', body); vsNeu(); if (text) { const lid = L.id; rueckgaengig(text, async () => { VS.D = await api(`api/lv/${lid}/versand`, 'PUT', vsZurueck(alt, body)); vsNeu(); }, 10000, async () => { VS.D = await api(`api/lv/${lid}/versand`, 'PUT', body); vsNeu(); }); } }
  catch (e) { toast(e.message, true); vsNeu(); }   // abgelehnt (z. B. Rückmeldung nach der Abgabe): wieder den gespeicherten Stand zeigen
}
function vsZurueck(alt, body) {   // Rückgängig: die betroffenen Werte wie vorher
  const out = {}; ['abgabe', 'rueckmeldung', 'unterlagen', 'ohne_x83', 'ohne_tl'].forEach((k) => { if (k in body) out[k] = alt[k] || (k === 'unterlagen' ? [] : k.startsWith('ohne_') ? false : ''); });
  if (body.bieter) { out.bieter = {}; Object.entries(body.bieter).forEach(([cid, x]) => { const b = alt.bieter.find((y) => String(y.contact_id) === cid) || {}; out.bieter[cid] = {};
    Object.keys(x).forEach((f) => { if (f === 'anruf' || f === 'anruf_weg') { out.bieter[cid].anrufe = b.anrufe || []; return; } out.bieter[cid][f] = f === 'weg' ? !b.contact_id : f === 'anrede' ? (b.anrede_hand ? b.anrede : '') : f === 'rueck' ? (b.rueck === 'angebot' ? '' : b.rueck || '') : b[f] || ''; }); }); }
  return out;
}
/* Unterlagen: Verweise aus Pläne & Dateien oder vom Fileserver (Baustein dateiwahl.js), Dateien vom Rechner bis zum Senden im Browser */
async function vsUnterlagenWahl(start) {
  const pj = L.project_id || pid, U = VS.D.unterlagen || [];
  const neu = await BPHead.dateiWahl({ project_id: pj, start, titel: 'Unterlagen für die Bieter:innen', schon: U.map((x) => x.pfad) });
  if (!neu || !neu.length) return;
  vsSetzen({ unterlagen: [...U, ...neu] }, neu.length === 1 ? `„${neu[0].name}“ beigelegt` : `${neu.length} Unterlagen beigelegt`);
}
async function vsRechnerDazu(files) {
  const neu = [];
  for (const f of files) {
    if (f.size > 25 * 1048576) { toast(`„${f.name}“ ist zu groß für eine Mail.`, true); continue; }
    const daten = await bpB64(f);
    neu.push({ name: f.name, mime: f.type || 'application/octet-stream', daten, groesse: f.size });
  }
  if (!neu.length) return;
  VS.rechner.push(...neu); vsNeu();
  rueckgaengig(neu.length === 1 ? `„${neu[0].name}“ beigelegt` : `${neu.length} Dateien beigelegt`, () => { VS.rechner = VS.rechner.filter((x) => !neu.includes(x)); vsNeu(); }, 10000, () => { VS.rechner.push(...neu); vsNeu(); });
}
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.matches && t.matches('[data-vsrechner]') && L) { const fs = [...t.files]; t.value = ''; vsRechnerDazu(fs); return; }
  if (!t.closest || !t.closest('#vsSeite') || !L) return;
  if (t.dataset.vst) return vsSetzen({ [t.dataset.vst]: t.value }, t.dataset.vst === 'abgabe' ? 'Abgabe geändert' : 'Rückmeldefrist geändert');
  if (t.matches('[data-vsdazu]')) {   // mehrere angehakt (auch über mehrere Suchen): alle auf einmal, ein Schritt zum Rückgängigmachen
    const ids = [...t.selectedOptions].map((o) => o.value).filter(Boolean); [...t.options].forEach((o) => { o.selected = false; });
    if (ids.length) vsSetzen({ bieter: Object.fromEntries(ids.map((c) => [c, { weg: false }])) }, ids.length === 1 ? 'Bieter:in hinzugefügt' : `${ids.length} Bieter:innen hinzugefügt`); return; }
  const r = t.closest('[data-vscid]'), f = t.dataset.vsf; if (!r || !f) return;
  const b = VS.D.bieter.find((y) => y.contact_id === +r.dataset.vscid), x = { [f]: t.value };
  if (f === 'person') { x.email = ''; if (!b.anrede_hand) x.anrede = ''; }   // andere Ansprechperson: „An“ und Anrede folgen ihr
  vsSetzen({ bieter: { [r.dataset.vscid]: x } }, `${b.name}: ${{ person: 'Ansprechperson', email: 'E-Mail', anrede: 'Anrede', bis: 'Abgabe zugesagt bis', grund: 'Grund' }[f] || 'Stand'} geändert`);
});
document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('[data-vsdrop]') && [...(e.dataTransfer.types || [])].includes('Files')) { e.preventDefault(); e.target.closest('[data-vsdrop]').classList.add('ueber'); } });
document.addEventListener('dragleave', (e) => { const z = e.target.closest && e.target.closest('[data-vsdrop]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('ueber'); });
document.addEventListener('drop', (e) => { const z = e.target.closest && e.target.closest('[data-vsdrop]'); if (!z || !L) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('ueber'); vsRechnerDazu([...e.dataTransfer.files]); }, true);   // vor „Datei ablegen“ der Seite
/* Bieter:in, die es noch nicht gibt: im Feld eintippen → „＋ … als neue Firma anlegen“ → dieselbe Kontaktmaske wie überall → steht in der Liste */
document.addEventListener('bp-neu', async (e) => {
  if (!e.target.matches || !e.target.matches('[data-vsdazu]') || !L) return;
  try {
    const k = await BPHead.kontaktMaske({ name: e.detail.text, trade: L.gewerk || '' }); if (!k) return;
    KONT = null; await vsSetzen({ bieter: { [k.id]: { weg: false } } }, `${k.name} hinzugefügt`);
  } catch (er) { toast(er.message, true); }
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !L) return;
  const k = e.target.closest('#vsSeite [data-vsk]');
  if (k && window.BPHead && BPHead.kontaktMaske) {   // Adresse im Fenster bearbeiten – die Seite bleibt
    const cid = +k.closest('[data-vscid]').dataset.vscid, kc = await BPHead.kontaktMaske({ id: cid });
    if (kc) { KONT = null; vsSeiteLaden(true); }
    return;
  }
  const gt = e.target.closest('[data-vstl]'); if (gt) { const an = gt.dataset.vstl === '1'; vsSetzen({ ohne_tl: !an }, an ? 'Türliste wird wieder mitgeschickt' : 'Türliste wird nicht mitgeschickt'); return; }
  const gx = e.target.closest('[data-vsx83]'); if (gx) { const an = gx.dataset.vsx83 === '1'; vsSetzen({ ohne_x83: !an }, an ? 'GAEB-Datei wird wieder mitgeschickt' : 'GAEB-Datei nicht mitschicken'); return; }
  const u = e.target.closest('[data-vsu]'); if (u && VS.D) { vsUnterlagenWahl(u.dataset.vsu); return; }
  const ux = e.target.closest('[data-vsux]'); if (ux) { const p = ux.dataset.vsux, x = (VS.D.unterlagen || []).find((y) => y.pfad === p); vsSetzen({ unterlagen: VS.D.unterlagen.filter((y) => y.pfad !== p) }, `„${x ? x.name : 'Unterlage'}“ nicht mitschicken`); return; }
  const rx = e.target.closest('[data-vsrx]'); if (rx) { const x = VS.rechner.splice(+rx.dataset.vsrx, 1)[0]; vsNeu(); rueckgaengig(`„${x.name}“ nicht mitschicken`, () => { VS.rechner.push(x); vsNeu(); }, 10000, () => { VS.rechner = VS.rechner.filter((y) => y !== x); vsNeu(); }); return; }
  const w = e.target.closest('#vsSeite [data-vsweg]');
  if (w) { const r = w.closest('[data-vscid]'), b = VS.D.bieter.find((y) => y.contact_id === +r.dataset.vscid); return vsSetzen({ bieter: { [r.dataset.vscid]: { weg: true } } }, `${b.name} nicht mehr anfragen`); }
  const s = e.target.closest('[data-vssenden]'); if (s && VS.D) { VS.wahl = {}; vsSenden(s.dataset.vssenden || 'versand'); return; }
  const ez = e.target.closest('[data-vseinzeln]'); if (ez && VS.D) { e.stopPropagation(); VS.wahl = { versand: new Set([+ez.dataset.vseinzeln || ez.dataset.vseinzeln]) }; vsSenden('versand'); return; }   // nur diese Firma
  const rz = e.target.closest('#vsSeite [data-vscid]'); if (!rz || !VS.D) return;
  const cid = rz.dataset.vscid, b = VS.D.bieter.find((y) => y.contact_id === +cid);
  if (e.target.closest('[data-vsdel]')) { vsEntfernen(VS.sel && VS.sel.has(+cid) && VS.sel.size > 1 ? [...VS.sel] : [+cid]); return; }
  if (rz.classList.contains('vs-kz') && !e.target.closest('button,input,select,a,label,textarea,.bp-auswahl')) {   // Zeile: Details auf/zu, rechts die Mail an diese Firma
    const st = bpBaum.markiere({ akt: VS.fuer ?? null, sel: VS.sel || new Set(), anker: VS.anker ?? null }, VS.D.bieter.map((y) => y.contact_id), +cid, { strg: e.ctrlKey || e.metaKey, umschalt: e.shiftKey });
    VS.sel = st.sel; VS.anker = st.anker;   // markieren wie in Windows (Strg, Umschalt) – Entf oder „Entfernen“ oben nimmt die markierten heraus
    if (e.ctrlKey || e.metaKey || e.shiftKey) { vsNeu(); return; }
    VS.fuer = +cid; VS.auf = VS.auf === +cid ? null : +cid; vsNeu(); return; }
  const sw = e.target.closest('[data-vsstw]');
  if (sw) { pickMenu(sw, { items: Object.entries(VS_RUECK).map(([k, t]) => ({ value: k, title: t, on: k === (b.rueck || '') })), onPick: (v) => {
    if (v === (b.rueck || '')) return; if ((v === 'abgegeben' || v === 'absage') && b.todo_id) vsTodo(b, '');
    if (v === 'zusage' || v === 'absage') VS.auf = b.contact_id;   // Zusage bis / Grund gleich darunter eintragen
    vsSetzen({ bieter: { [cid]: { rueck: v } } }, `${b.name}: ${VS_RUECK[v]}`); } }); return; }
  const mh = e.target.closest('[data-vsmehr]');
  if (mh) { pickMenu(mh, { items: [{ value: 'adr', title: 'Adresse öffnen' }], onPick: async () => {   // entfernen: 🗑 daneben
    if (await BPHead.kontaktMaske({ id: +cid })) { KONT = null; vsSeiteLaden(true); } } }); return; }
  const st = e.target.closest('[data-vsrueck]'); if (st) { const v = st.dataset.vsrueck; if (v === (b.rueck || '')) return;
    if ((v === 'abgegeben' || v === 'absage') && b.todo_id) vsTodo(b, '');   // kein Anruf mehr nötig
    return vsSetzen({ bieter: { [cid]: { rueck: v } } }, `${b.name}: ${VS_RUECK[v]}`); }
  const ab = e.target.closest('[data-vsangerufen]'); if (ab) { const i = rz.querySelector('[data-vsanruf]'); return vsAnruf(b, (i && i.value.trim()) || 'angerufen'); }
  const aw = e.target.closest('[data-vsaweg]'); if (aw) { const alt = JSON.parse(JSON.stringify(b.anrufe || [])); return vsSetzen({ bieter: { [cid]: { anruf_weg: +aw.dataset.vsaweg } } }, `${b.name}: Notiz gelöscht`); }
});
/* Rechts (seite.js, abdockbar): Mail · Anhang · Bieter:in (Mock „Versand-Mail“, GO 14.11.2026).
   Mail: Art (Versand, Erinnerung, Nachversand), Empfänger:innen mit Haken „alle“ (vorgewählt nach Rückmeldung), Vorschau je Firma
   (Platzhalter gefüllt, wie sie hinausgeht), Anhänge mit Versanddatum, Betreff und Text bearbeiten – für dieses LV oder nur für eine Firma.
   „Senden“ (hier unten oder oben in der Befehlsleiste) schickt genau diese Mails nach einer kurzen Rückfrage – je Firma eine eigene. */
const VS_ART = { versand: 'Versand', erinnerung: 'Erinnerung', nachversand: 'Nachversand' };
const VS_RT = { angebot: 'Angebot da', abgegeben: 'abgegeben', zusage: 'will abgeben', absage: 'gibt nicht ab', '': 'keine Rückmeldung' };
const vsArt = () => VS.art || (VS.D && VS.D.bieter.some((b) => b.email && !b.versendet && b.rueck !== 'absage') ? 'versand' : 'nachversand');
const vsAnStd = (b, art) => !!b.email && (art === 'versand' ? !b.versendet && b.rueck !== 'absage' : art === 'erinnerung' ? !!b.versendet && (!b.rueck || b.rueck === 'zusage') : !!b.versendet && b.rueck !== 'absage' && b.rueck !== 'angebot');
function vsWahl(art) {   // gewählte Empfänger:innen je Art – vorgewählt nach Stand und Rückmeldung, danach einzeln zu- und abwählbar
  VS.wahl = VS.wahl || {};
  if (!VS.wahl[art]) VS.wahl[art] = new Set(VS.D.bieter.filter((b) => vsAnStd(b, art)).map((b) => b.contact_id));
  return VS.wahl[art];
}
function vsText(art, b) {   // Betreff und Text: eigener der Firma → eigener des LV → Standard (Vorlage)
  const D = VS.D, eig = b && b.texte && b.texte[art];
  if (eig) return { ...eig, eigen: 'firma' };
  if (D.texte && D.texte[art]) return { ...D.texte[art], eigen: 'lv' };
  const t = (D.standard || {})[art] || D.vorlage;
  return { betreff: t.betreff, text: art === 'versand' && D.ohne_x83 ? t.text.replace(' und als GAEB-Datei (X83)', '') : t.text, eigen: '' };
}
function vsAnhaenge(art) {
  const D = VS.D; if (art === 'erinnerung') return [];
  return [{ k: 'lv', ic: '📄', name: D.namen.pdf, gr: '', v: D.lv_verschickt, gd: D.lv_geaendert, pdf: true },
    ...(D.ohne_x83 ? [] : [{ k: 'x83', ic: '📦', name: D.namen.x83, gr: '', v: D.lv_verschickt, gd: D.lv_geaendert }]),
    ...(D.tueren && !D.ohne_tl ? [{ k: 'tl', ic: '🚪', name: 'Fenster- & Türliste', gr: '', v: D.lv_verschickt, gd: D.lv_geaendert, pdf: true }] : []),
    ...(D.unterlagen || []).map((x) => ({ k: 'p:' + x.pfad, ic: x.quelle === 'plan' ? '📐' : '📄', name: x.name, gr: vsMb(x.groesse), v: x.verschickt, pdf: /\.pdf$/i.test(x.pfad) })),
    ...VS.rechner.map((x, i) => ({ k: 'r:' + i, ic: '🖥', name: x.name, gr: vsMb(x.groesse), pdf: /pdf/.test(x.mime) }))];
}
const vsFuer = () => { const B = VS.D.bieter, w = vsWahl(vsArt()); return B.find((b) => b.contact_id === VS.fuer) || B.find((b) => w.has(b.contact_id)) || B.find((b) => b.email) || B[0] || null; };

function vsRechts() {   // rechts: Anhänge ansehen und die Bieter:innen – geschrieben und gesendet wird im gemeinsamen Versand-Dialog (vsSenden → BPHead.versand)
  const sp = document.querySelector('#view .vs-sp'); if (!sp || !VS.D) return;
  seite(sp, 'vs', [{ id: 'bieter', titel: 'Bieter:innen', mount: vsBieterMount }, { id: 'anh', titel: 'Anhang ansehen', mount: vsAnhMount }],
    { start: 'bieter', w: 0.55, minL: 420, min: 380, wechsel: () => uLeisteNeu() });
}
function vsAnhMount(el) {
  const A = vsAnhaenge(vsArt() === 'erinnerung' ? 'versand' : vsArt()); if (!A.length) { el.innerHTML = '<p class="hint sr-pad">Keine Anhänge.</p>'; return; }
  const x = A.find((y) => y.k === VS.anh) || A[0]; VS.anh = x.k;
  el.innerHTML = `<div class="vs-ansicht"><div class="am-pk">${A.map((y) => `<button type="button" class="btn sm${y.k === x.k ? ' pri' : ''}" data-vsanh="${esc(y.k)}" title="${esc(y.name)}">${y.ic} ${esc(y.name.length > 26 ? y.name.slice(0, 24) + '…' : y.name)}</button>`).join('')}</div><div class="vs-av"></div></div>`;
  const v = el.querySelector('.vs-av'), url = x.k === 'lv' ? `api/lv/${L.id}/versand/ansehen?was=lv` : x.k === 'tl' ? `api/lv/${L.id}/tueren.pdf` : x.k === 'x83' ? `api/lv/${L.id}/versand/ansehen?was=x83`
    : x.k.startsWith('p:') ? `api/lv/${L.id}/versand/ansehen?pfad=${encodeURIComponent(x.k.slice(2))}` : '';
  if (x.k.startsWith('r:')) {   // vom Rechner: nur im Browser
    const f = VS.rechner[+x.k.slice(2)];
    if (f && x.pdf) { const u = URL.createObjectURL(new Blob([Uint8Array.from(atob(f.daten), (c) => c.charCodeAt(0))], { type: 'application/pdf' })); BPHead.pdfIn(v, u).finally(() => URL.revokeObjectURL(u)); }
    else v.innerHTML = `<p class="hint">Keine Vorschau für „${esc(x.name)}“ – geht so mit.</p>`;
    return;
  }
  if (x.k === 'x83') { v.innerHTML = '<p class="hint">Lade …</p>'; fetch(url, { credentials: 'same-origin' }).then((r) => r.text()).then((t) => { v.innerHTML = `<pre class="vs-x83">${esc(t.slice(0, 200000))}</pre>`; }).catch((e) => { v.innerHTML = `<p class="hint">${esc(e.message)}</p>`; }); return; }
  if (x.pdf) BPHead.pdfIn(v, url).catch((e) => { v.innerHTML = `<p class="hint">${esc(e.message)}</p>`; });
  else v.innerHTML = `<p class="hint">Keine Vorschau für „${esc(x.name)}“ – geht so mit.</p>`;
}
/* Reiter „Bieter:innen“ (besprochen am 14.11.2026): oben der Verlauf aller Firmen – angeschrieben · nachgesandt · nachgefragt (mehrmals, mit Notiz) ·
   Zusage bis · abgesagt (= „gibt nicht ab“) · Angebot; Spalten sortier- und wählbar, Filter, Drucken (liegt dann auch im LV-Ordner unter „Bieterliste“).
   Darunter für die gewählte Firma nur der Status. */
const VS_SP = [['firma', 'Firma'], ['kontakt', 'E-Mail / Telefon'], ['angeschrieben', 'Angeschrieben'], ['nachgesandt', 'Nachgesandt'], ['nachgefragt', 'Nachgefragt · Notiz'],
  ['zusage_bis', 'Zusage bis'], ['abgesagt', 'Abgesagt · Grund'], ['angebot', 'Stand']];
const VS_SP_AUS = '1,5,6';   // Bildschirm: E-Mail/Telefon, Zusage bis, Abgesagt im Standard aus – wählbar über den Spaltenkopf (rechte Maustaste, bpSpalten)
const VS_DRUCK = [['firma', 'Firma (mit Gewerk)'], ['kontakt', 'E-Mail · Telefon'], ['angeschrieben', 'angeschrieben / am'], ['verlauf', 'Rückfragen mit Notiz (je eine Zeile unter der Firma)'], ['stand', 'Stand']];   // ava_bieterliste.SPALTEN
const vsDruckSp = () => { const g = LS.get('vsDruck', null); return Array.isArray(g) ? VS_DRUCK.map((x) => x[0]).filter((k) => k === 'firma' || g.includes(k)) : VS_DRUCK.map((x) => x[0]); };   // Drucken/Excel: eigene Auswahl
const vsTag = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t || ''); return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : (t || ''); };
const vsGruppe = (b) => (b.rueck === 'angebot' || b.rueck === 'abgegeben' ? 'angebot' : b.rueck === 'absage' ? 'abgesagt' : 'offen');
function vsSortWert(b, k) {
  const v = b.verlauf || {};
  return k === 'firma' ? b.name.toLowerCase() : k === 'kontakt' ? (b.email || '') : k === 'nachgesandt' ? (v.nachgesandt || []).slice(-1)[0] || ''
    : k === 'nachgefragt' ? ((v.nachgefragt || []).slice(-1)[0] || {}).t || '' : v[k] || '';
}
function vsListe() {
  const S = VS.lsort || { k: 'firma', ab: false }, F = VS.lfilter || 'alle';
  const B = VS.D.bieter.filter((b) => F === 'alle' || vsGruppe(b) === F);
  return B.sort((a, b) => { const x = vsSortWert(a, S.k), y = vsSortWert(b, S.k); const r = x === y ? 0 : !x ? 1 : !y ? -1 : x < y ? -1 : 1; return S.ab ? -r : r; });
}
function vsZelle(b, k) {
  const v = b.verlauf || {};
  if (k === 'firma') return `<b>${esc(b.name)}</b>${b.trade ? `<small>${esc(b.trade)}</small>` : ''}`;
  if (k === 'kontakt') return [b.email, b.telefon].filter(Boolean).map(esc).join('<br>') || '<span class="mute">–</span>';
  if (k === 'nachgesandt') return (v.nachgesandt || []).map(vsTag).join('<br>') || '–';
  if (k === 'nachgefragt') return (v.nachgefragt || []).map((n) => `<div class="vs-nfv">${vsTag(n.t)} ${n.weg === 'tel' ? '☎' : '✉'} <span>${esc(n.text)}</span></div>`).join('') || '–';
  if (k === 'abgesagt') return v.abgesagt || v.grund ? `${esc(vsTag(v.abgesagt))}${v.grund ? `<small>${esc(v.grund)}</small>` : ''}` : '–';
  if (k === 'angebot') return v.angebot ? `<span class="vs-ch ok">Angebot ${v.angebot === 'ja' ? '' : esc(vsTag(v.angebot))}</span>` : b.rueck === 'absage' ? `<span class="vs-ch no">abgesagt ${esc(vsTag(v.abgesagt))}</span>${v.grund ? `<small>${esc(v.grund)}</small>` : ''}`
    : b.rueck === 'zusage' ? `<span class="vs-ch z">will abgeben</span>${v.zusage_bis ? `<small>bis ${esc(vsTag(v.zusage_bis))}</small>` : ''}` : '<span class="vs-ch o">offen</span>';
  return esc(vsTag(v[k])) || '–';
}
function vsBieterMount(el) {
  if (!VS.D || !VS.D.bieter.length) { el.innerHTML = '<p class="hint sr-pad">Noch keine Bieter:innen.</p>'; return; }
  const SP = VS_SP, S = VS.lsort || { k: 'firma', ab: false }, F = VS.lfilter || 'alle', B = VS.D.bieter;
  const n = (g) => B.filter((b) => g === 'alle' || vsGruppe(b) === g).length, b = vsFuer();
  el.innerHTML = `<div class="sr-pad vs-vl">
    <div class="vs-vb">${[['alle', 'alle'], ['offen', 'offen'], ['angebot', 'Angebot'], ['abgesagt', 'abgesagt']].map(([k, t]) => `<button type="button" class="vs-ch ${k === 'angebot' ? 'ok' : k === 'abgesagt' ? 'no' : k === 'offen' ? 'o' : ''}${F === k ? ' on' : ''}" data-vslf="${k}">${t} ${n(k)}</button>`).join('')}
      <span style="flex:1"></span>
      <button type="button" class="btn sm" data-vsdruck title="Als PDF – liegt dann auch im LV-Ordner unter „Bieterliste“">🖨 Drucken</button>
      <button type="button" class="btn sm" data-vsdruck="xlsx" title="Als Excel-Datei – Spalten und Reihenfolge wie hier">⇩ Excel</button></div>
    <div class="tblw"><table class="vs-vt" data-sp="vs-bieter" data-spaus="${VS_SP_AUS}"><thead><tr>${SP.map(([k, t]) => `<th data-vsls="${k}" data-spname="${esc(t)}" title="Nach „${t}“ sortieren" class="${S.k === k ? (S.ab ? 'ab' : 'auf') : ''}">${t}</th>`).join('')}</tr></thead>
      <tbody>${vsListe().map((x) => `<tr data-vslz="${x.contact_id}" class="${b && x.contact_id === b.contact_id ? 'vs-akt' : ''}">${SP.map(([k]) => `<td class="vs-v-${k}">${vsZelle(x, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    ${b ? `<div class="vs-stk"><h5 class="vs-mh5">Status</h5><div class="vs-stz"><b><button type="button" class="vs-n" data-vsk2="${b.contact_id}" title="Adresse öffnen">${esc(b.name)}</button></b>
      <span class="vs-ch ${vsGruppe(b) === 'angebot' ? 'ok' : vsGruppe(b) === 'abgesagt' ? 'no' : b.rueck === 'zusage' ? 'z' : 'o'}">${esc(VS_RT[b.rueck || ''])}</span>${b.bis ? `<span>Zusage bis ${esc(vsDe(b.bis))}</span>` : ''}${b.grund ? `<span>${esc(b.grund)}</span>` : ''}</div></div>` : ''}</div>`;
}
document.addEventListener('click', (e) => {   // Befehlsleiste „Neu → Bieter:in“: ins Suchfeld der Bieterliste (Bereich rechts)
  if (!e.target.closest || !e.target.closest('[data-vsneu]')) return;
  if (typeof seiteReiter === 'function') seiteReiter('vs', 'bieter');
  setTimeout(() => { const s = document.querySelector('[data-vsdazu]'), i = s && s.nextElementSibling && s.nextElementSibling.querySelector('input');
    if (!i) { toast('Rechts den Bereich „Bieter:innen“ öffnen – dort Firmen suchen und anhaken.'); return; } i.scrollIntoView({ block: 'nearest' }); i.focus(); i.click(); }, 60);
});
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !VS.D || !L) return;
  const f = e.target.closest('[data-vslf]'); if (f) { VS.lfilter = f.dataset.vslf; seiteFuellen('vs', 'bieter'); return; }
  const h = e.target.closest('th[data-vsls]'); if (h) { const k = h.dataset.vsls, S = VS.lsort || { k: 'firma', ab: false }; VS.lsort = { k, ab: S.k === k ? !S.ab : false }; seiteFuellen('vs', 'bieter'); return; }
  const z = e.target.closest('tr[data-vslz]'); if (z && !e.target.closest('button,a')) { VS.fuer = +z.dataset.vslz; seiteFuellen('vs', 'bieter'); const m = document.getElementById('vsSeite'); if (m) m.innerHTML = vsHtml(); return; }
  const dk = e.target.closest('[data-vsdruck]'); if (dk) vsDruckWahl(dk.dataset.vsdruck === 'xlsx');
});
function vsDruckWahl(xl) {   // Drucken/Excel: Spalten fürs Drucklayout getrennt vom Bildschirm wählen (gemerkt je Browser)
  const an = new Set(vsDruckSp());
  modalBox(`<h3>Bieterliste ${xl ? 'als Excel' : 'drucken'}</h3><p class="hint" style="margin:0 0 .5rem">Spalten für ${xl ? 'die Excel-Datei' : 'den Ausdruck'} – unabhängig von der Ansicht. Reihenfolge und Filter wie in der Liste; Rückfragen, Nachversand, Zu- und Absage stehen je Firma untereinander.</p>
    <div class="vs-dsp">${VS_DRUCK.map(([k, t]) => `<label><input type="checkbox" data-vsdsp="${k}"${an.has(k) ? ' checked' : ''}${k === 'firma' ? ' disabled' : ''}> ${esc(t)}</label>`).join('')}</div>
    <div class="bar"><span class="fill"></span><button class="btn" data-m="zu">Abbrechen</button><button class="btn${xl ? '' : ' pri'}" data-m="pdf">🖨 Drucken</button><button class="btn${xl ? ' pri' : ''}" data-m="xlsx">⇩ Excel</button></div>`, (m, b, close) => {
    if (m === 'zu') { close(); return; }
    const sp = ['firma', ...[...b.querySelectorAll('[data-vsdsp]:checked:not(:disabled)')].map((i) => i.dataset.vsdsp)];
    LS.set('vsDruck', sp); close(); vsDruckLos(m === 'xlsx', sp);
  });
}
async function vsDruckLos(xl, spalten) {
  if (!L) return;
  const warte = setTimeout(() => toast('Liste wird erstellt …'), 1500);
  try {
    const r = await fetch(`api/lv/${L.id}/versand/liste`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spalten, ids: vsListe().map((x) => x.contact_id), format: xl ? 'xlsx' : 'pdf' }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Fehler ' + r.status);
    const u = URL.createObjectURL(await r.blob()); setTimeout(() => URL.revokeObjectURL(u), 60000);
    if (xl) { const a = document.createElement('a'); a.href = u; a.download = `Bieterliste LV ${L.nr || ''}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); return; }
    window.open(u, '_blank', 'noopener');
    const a = decodeURIComponent(r.headers.get('X-Ablage') || ''); if (a) toast(a);
  } catch (er) { toast(er.message, true); } finally { clearTimeout(warte); }
}
async function vsTexteSpeichern(art, betreff, text, nurFirma, b, lv = L) {   // gemerkt je LV bzw. je Firma (ohne Rückgängig-Schritt je Taste)
  const t = { [art]: betreff == null ? null : { betreff, text } };
  try { VS.D = await api(`api/lv/${lv.id}/versand`, 'PUT', nurFirma && b ? { bieter: { [b.contact_id]: { texte: t } } } : { texte: t }); }
  catch (e) { toast(e.message, true); }
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !L || !VS.D) return;
  const an = e.target.closest('[data-vsanh]'); if (an) { VS.anh = an.dataset.vsanh; seiteReiter('vs', 'anh'); seiteFuellen('vs', 'anh'); return; }
  const k2 = e.target.closest('[data-vsk2]'); if (k2 && BPHead.kontaktMaske) { if (await BPHead.kontaktMaske({ id: +k2.dataset.vsk2 })) { KONT = null; vsSeiteLaden(true); } return; }
});
/* Senden über den gemeinsamen Versand-Dialog (bp/versand.js): Was (LV, GAEB, Unterlagen der Seite) · An wen (Bieter:innen, vorgewählt nach Stand) ·
   Nachricht (Text dieses LV, je Firma mit persönlicher Anrede – „Vorschau für“) · Optionen. Gesendet wird je Firma eine eigene Mail. */
async function vsSenden(art, lv = L) {   // lv: das LV ({id, nr, name}) – „Nachverfolgen“ ruft ohne geöffnetes LV
  const D = VS.D; if (!D) return;
  const leer = art === 'versand' && lv === L && L && L.data ? (L.data.items || []).flatMap((x) => [...String(x.lang || '').matchAll(/\[\[\s*B(?:ü|ue)ro\s*:\s*([^\]=|]*?)\s*\]\]/gi)].map((m) => `${x.oz || ''} ${m[1]}`)) : [];   // Angaben des Büros ohne Wert (BT-A1)
  if (leer.length && !(await bpFrage(`${leer.length} Angabe${leer.length === 1 ? '' : 'n'} des Büros im Langtext ${leer.length === 1 ? 'ist' : 'sind'} noch leer (z. B. ${leer.slice(0, 3).join(', ')}). Trotzdem versenden? Im LV steht dort eine Punktlinie.`, { ok: 'Trotzdem versenden' }))) return;
  VS.art = art;
  const w = vsWahl(art), mitAnh = art !== 'erinnerung', R = VS.rechner, T = vsText(art, null), A = vsAnhaenge(art);
  const url = (x) => (x.k === 'lv' ? `api/lv/${lv.id}/versand/ansehen?was=lv` : x.k === 'tl' ? `api/lv/${lv.id}/tueren.pdf` : x.k.startsWith('p:') && x.pdf ? `api/lv/${lv.id}/versand/ansehen?pfad=${encodeURIComponent(x.k.slice(2))}`
    : x.k.startsWith('r:') && x.pdf ? async () => new Blob([Uint8Array.from(atob(R[+x.k.slice(2)].daten), (c) => c.charCodeAt(0))], { type: 'application/pdf' }) : null);
  const std = (D.standard || {})[art] || D.vorlage;
  await BPHead.versand({
    titel: `${VS_ART[art]} an Bieter:innen – ${lv.nr || ''} ${lv.name || ''}`.trim(),
    was: A.map((x) => ({ icon: x.ic, name: x.name, sub: [x.gr, art === 'nachversand' ? (x.gd ? 'geändert' : !x.v ? 'neu' : '') : '', x.k === 'lv' ? 'LV ohne Preise – entsteht beim Senden' : x.k === 'x83' ? 'GAEB-Datei – entsteht beim Senden' : ''].filter(Boolean).join(' · '), pdf: url(x), ohneUnterschrift: true })),
    hinweis: `<p class="bpv-h">${mitAnh ? 'Unterlagen ändern: Dialog schließen – oben „Unterlagen“ oder im Kasten „Unterlagen für die Bieter:innen“.' : 'Erinnerung ohne Anhänge – das LV haben die Firmen schon.'}${D.abgabe ? '' : ' <b>Noch kein Abgabetermin</b> – die Zeile fällt in der Mail weg.'}</p>`,
    empfaenger: D.bieter.map((b) => ({ name: b.name, sub: b.email ? (VS_RT[b.rueck || ''] || '') + (b.versendet ? ' · angeschrieben ' + vsTag(b.versendet) : '') : 'keine E-Mail-Adresse', email: b.email || '', contact_id: b.contact_id, on: w.has(b.contact_id) })),
    zusatz: false, kopie: !!VS.kopie, betreff: T.betreff, text: T.text,
    textHilfe: 'Platzhalter füllt die Plattform je Firma: {anrede}, {firma}, {lv}, {projekt}, {bauvorhaben}, {abgabe}, {rueckmeldung}, {signatur}.',
    eigen: { lesen: (x) => { const b = VS.D.bieter.find((y) => y.contact_id === x.contact_id); return (b && b.texte && b.texte[art]) || null; },   // eigener Text nur für diese Firma (je LV gemerkt)
      speichern: async (x, t) => { const b = VS.D.bieter.find((y) => y.contact_id === x.contact_id); const r = await api(`api/lv/${lv.id}/versand`, 'PUT', { bieter: { [b.contact_id]: { texte: { [art]: t } } } }); VS.D = r; } },
    vorschau: async (x, V) => { const b = VS.D.bieter.find((y) => y.contact_id === x.contact_id) || {}, eig = b.texte && b.texte[art];   // eigener Text dieser Firma geht vor
      const r = await api(`api/lv/${lv.id}/versand/vorschau`, 'POST', { art, contact_id: x.contact_id, betreff: eig ? eig.betreff : V.betreff, text: eig ? eig.text : V.text });
      return { an: r.an || x.email, betreff: r.betreff, text: (eig ? '(eigener Text nur für diese Firma)\n\n' : '') + (r.text || '') }; },
    optionen: `<label><input type="checkbox" data-vsmerk checked> Text für dieses LV merken</label><button type="button" class="bpv-x" data-vsstd title="Betreff und Text wieder wie in der Vorlage des Büros (Kommunikation → Vorlagen)" style="font-size:.86rem;color:var(--y)">↺ Text der Vorlage</button>`,
    optionenBind: (box) => { box.querySelector('[data-vsstd]').addEventListener('click', () => { box.querySelector('[data-betreff]').value = std.betreff; box.querySelector('[data-text]').value = art === 'versand' && D.ohne_x83 ? std.text.replace(' und als GAEB-Datei (X83)', '') : std.text; }); },
    knopf: () => `${VS_ART[art]} senden`, fuss: (box) => { const n = box.querySelectorAll('[data-e]:checked').length; return `${n} Mail${n === 1 ? '' : 's'} – jede Firma bekommt ihre eigene, niemand sieht die anderen`; },
    senden: async (W, box) => {
      const an = W.an.map((x) => D.bieter.find((b) => b.contact_id === x.contact_id)).filter(Boolean);
      if (!an.length) throw new Error('Keine Empfänger:in gewählt.');
      VS.kopie = W.kopie; VS.wahl[art] = new Set(an.map((b) => b.contact_id));
      const geaendert = W.betreff !== T.betreff || W.text !== T.text;
      if (geaendert && box.querySelector('[data-vsmerk]').checked) await vsTexteSpeichern(art, W.betreff, W.text, false, null, lv);
      const r = await api(`api/lv/${lv.id}/versand/senden`, 'POST', { art, an: an.map((b) => ({ contact_id: b.contact_id, email: b.email, name: b.name, anrede: b.anrede })),
        betreff: W.betreff, text: W.text, kopie: !!W.kopie, pdf: mitAnh, x83: mitAnh && !D.ohne_x83, tueren: mitAnh && !D.ohne_tl, unterlagen: mitAnh, anhaenge: mitAnh ? R.map((x) => ({ name: x.name, mime: x.mime, daten: x.daten })) : [] });
      VS.D = r; VS.wahl = {}; if (mitAnh && r.ergebnis.some((x) => x.ok)) VS.rechner = [];   // vom Rechner: jetzt im Versand-Ordner
      const fe = r.ergebnis.filter((x) => !x.ok);
      toast(`${r.ergebnis.length - fe.length} Mail${r.ergebnis.length - fe.length === 1 ? '' : 's'} gesendet${fe.length ? ` – ${fe.length} Fehler: ${fe.map((x) => x.name + ' (' + x.fehler + ')').join(', ')}` : ''}${r.ablage.length ? ` · im Projektordner: „${r.ordner}“` : r.ablage_fehler ? ' · ' + r.ablage_fehler : ''}.`, !!fe.length);
      if (typeof refreshList === 'function') refreshList();
      vsNeu();
    } });
}

/* Bieter:innen entfernen (besprochen am 15.11.2026, Mock „Bieter:in entfernen“): 🗑 je Zeile, markierte mit Entf oder oben „Entfernen“.
   Schon angeschrieben: erst fragen – auf Wunsch geht eine Mail „bitte nicht beachten“ über den gemeinsamen Versand-Dialog (nichts automatisch). */
async function vsEntfernen(cids) {
  const B = VS.D.bieter.filter((b) => cids.includes(b.contact_id)); if (!B.length) return;
  const raus = B.filter((b) => b.versendet), name = B.length === 1 ? B[0].name : `${B.length} Firmen`;
  let mail = false;
  if (raus.length) {
    const a = await bpFrage(`${name} aus der Bieterliste nehmen?\n${raus.map((b) => `${b.name} hat das LV am ${vsTag(b.versendet)} bekommen.`).join('\n')}\nDie verschickte Mail bleibt im Verlauf, in den Adressen bleibt die Firma.`,
      { ok: 'Entfernen', drei: 'Entfernen & „bitte nicht beachten“ senden …' });
    if (!a) return; mail = a === 'drei';
  }
  VS.sel = new Set(); if (cids.includes(VS.fuer)) { VS.fuer = null; VS.auf = null; }
  await vsSetzen({ bieter: Object.fromEntries(B.map((b) => [b.contact_id, { weg: true }])) }, `${name} aus der Bieterliste genommen`);
  if (mail) await BPHead.unterlagenSenden({ titel: 'Bitte nicht beachten', art: 'vergabe', pid: L.project_id || undefined, was: [],
    an: raus.filter((b) => b.email).map((b) => ({ name: b.name, email: b.email, contact_id: b.contact_id, on: true })),
    betreff: `Bitte nicht beachten – ${[L.nr, L.name].filter(Boolean).join(' ')}`,
    text: `Sehr geehrte Damen und Herren,\n\nunsere Anfrage zu „${[L.nr, L.name].filter(Boolean).join(' ')}“ hat Sie versehentlich erreicht. Bitte betrachten Sie sie als gegenstandslos – ein Angebot ist nicht nötig.\n\nMit freundlichen Grüßen` });
}
document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('[data-vsentf]') && VS.D && VS.sel && VS.sel.size) vsEntfernen([...VS.sel]); });
document.addEventListener('keydown', (e) => {   // Entf: markierte Firmen entfernen (nicht beim Tippen in einem Feld)
  if (e.key !== 'Delete' || tab !== 'versand' || !VS.D || !VS.sel || !VS.sel.size || (e.target.closest && e.target.closest('input,textarea,select,[contenteditable],.bph-dlg-bg'))) return;
  e.preventDefault(); vsEntfernen([...VS.sel]);
});

/* Nachverfolgung: Telefonnotiz (höchstens 10 je Firma) und „nächster Anruf am …“ mit To-do auf der Startseite */
async function vsAnruf(b, text) { await vsSetzen({ bieter: { [b.contact_id]: { anruf: text } } }, `${b.name}: Telefonnotiz`); const i = document.querySelector(`#vsSeite [data-vscid="${b.contact_id}"] [data-vsanruf]`); if (i) i.focus(); }
async function vsTodo(b, datum) {   // To-do „<Firma> anrufen“ anlegen, verschieben oder (ohne Datum) entfernen; gibt die id zurück
  try {
    if (!datum) { if (b.todo_id) await api('api/bp/todo/' + b.todo_id, 'DELETE').catch(() => {}); return null; }
    if (b.todo_id) { try { await api('api/bp/todo/' + b.todo_id, 'PUT', { faellig: datum }); return b.todo_id; } catch { /* gelöscht oder erledigt: neu anlegen */ } }
    const r = await api('api/bp/todo', 'POST', { titel: `${b.name} anrufen – Angebot ${[L.nr, L.name].filter(Boolean).join(' ')}`.slice(0, 200), notiz: [b.telefon && '☎ ' + b.telefon, D_abgabe()].filter(Boolean).join(' · '), project_id: pid, faellig: datum, prio: 1 });
    return (r.aufgabe || {}).id || null;
  } catch (e) { toast('To-do nicht angelegt: ' + e.message, true); return b.todo_id || null; }
}
const D_abgabe = () => (VS.D && VS.D.abgabe ? 'Abgabe ' + vsDe(VS.D.abgabe) : '');
document.addEventListener('keydown', (e) => { const i = e.target; if (e.key !== 'Enter' || !i.matches || !i.matches('#vsSeite [data-vsanruf]') || !VS.D) return; e.preventDefault();
  const t = i.value.trim(); if (!t) return; const b = VS.D.bieter.find((y) => y.contact_id === +i.closest('[data-vscid]').dataset.vscid); if (b) vsAnruf(b, t); });
document.addEventListener('change', async (e) => { const i = e.target; if (!i.matches || !i.matches('#vsSeite [data-vsnaechst]') || !VS.D) return;
  const b = VS.D.bieter.find((y) => y.contact_id === +i.closest('[data-vscid]').dataset.vscid); if (!b) return;
  const tid = await vsTodo(b, i.value);
  vsSetzen({ bieter: { [b.contact_id]: { naechst: i.value, todo_id: tid } } }, i.value ? `${b.name}: nächster Anruf ${vsDe(i.value)} (To-do)` : `${b.name}: kein Anruf mehr geplant`); });

/* ---------- Mehrere LVs in einem Versand (19.11.2026, Mock „Versand mehrerer LVs“: A eine Mail je Firma, B Spalte je LV, C Termine je LV + gemeinsamer auf Frage) ----------
   Häkchen an den LVs im Baum (nur hier) – ab zwei gewählten zeigt die Seite die Bieter:innen aller LVs zusammen. Server: ava_versand_mehr.py. */
VS.M = new Set(); VS.MD = {};   // gewählte LVs · deren Versand-Daten
const vsMehr = () => tab === 'versand' && VS.M.size >= 2;
const vsLvName = (i) => { const x = (LIST || []).find((y) => y.id === i) || {}; return [x.nr, x.name].filter(Boolean).join(' ') || 'LV ' + i; };
async function vsMehrLaden() {
  const el = document.getElementById('vsSeite'); if (!el) return;
  try { await Promise.all([...VS.M].map(async (i) => { VS.MD[i] = await api(`api/lv/${i}/versand`); })); } catch (e) { el.innerHTML = `<p class="hint">${esc(e.message)}</p>`; return; }
  el.innerHTML = vsMehrHtml(); if (tab === 'versand') uLeisteNeu();
}
function vsMehrFirmen() {   // alle Firmen der gewählten LVs: je LV dabei? angeschrieben?
  const F = new Map();
  [...VS.M].forEach((i) => (VS.MD[i] ? VS.MD[i].bieter : []).forEach((b) => { const f = F.get(b.contact_id) || { contact_id: b.contact_id, name: b.name, email: b.email, anrede: b.anrede, je: {} }; f.email = f.email || b.email; f.anrede = f.anrede || b.anrede; f.je[i] = b; F.set(b.contact_id, f); }));
  return [...F.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
const vsMehrStd = (f) => !!f.email && [...VS.M].some((i) => f.je[i] && !f.je[i].versendet && f.je[i].rueck !== 'absage');   // vorgewählt: hat ein LV, das noch nicht raus ist
function vsMehrHtml() {
  const L2 = [...VS.M], F = vsMehrFirmen(); VS.mw = VS.mw || new Set(F.filter(vsMehrStd).map((f) => f.contact_id));
  const ab = (i) => (VS.MD[i] && VS.MD[i].abgabe ? vsDe(VS.MD[i].abgabe) : 'kein Termin');
  return `<div class="vs-mehr"><div class="vs-mk"><b>Gemeinsamer Versand · ${L2.length} LVs</b><span class="hint">Eine Firma, die in mehreren LVs steht, bekommt <b>eine</b> Mail mit allen ihren LVs und Unterlagen. Je LV entsteht wie bisher ein Ordner „Versand &lt;Datum&gt;“.</span>
      <button type="button" class="btn sm" data-vsmweg>Auswahl aufheben</button></div>
    <div class="vs-ml">${L2.map((i) => `<span><b>${esc(vsLvName(i))}</b><small>Abgabe ${esc(ab(i))} · ${(VS.MD[i] ? VS.MD[i].unterlagen.length : 0)} Unterlagen</small></span>`).join('')}</div>
    <div class="tblw"><table class="vs-tab vs-mtab"><thead><tr><th><input type="checkbox" data-vsmalle${F.length && F.every((f) => VS.mw.has(f.contact_id)) ? ' checked' : ''} aria-label="alle"></th><th>Firma</th>${L2.map((i) => `<th title="${esc(vsLvName(i))}">${esc(vsLvName(i).slice(0, 18))}</th>`).join('')}</tr></thead><tbody>
    ${F.map((f) => `<tr data-vsmcid="${f.contact_id}"><td><input type="checkbox" data-vsmf${VS.mw.has(f.contact_id) ? ' checked' : ''}${f.email ? '' : ' disabled'} aria-label="${esc(f.name)} anschreiben"></td><td><b>${esc(f.name)}</b><small>${f.email ? esc(f.email) : '<span class="vs-rot">keine E-Mail</span>'}</small></td>
      ${L2.map((i) => { const b = f.je[i]; return b ? `<td class="vs-mz on" title="steht in ${esc(vsLvName(i))}">☑${b.versendet ? `<small>✉ ${esc(b.versendet.slice(0, 6))}</small>` : ''}</td>` : `<td class="vs-mz"><button type="button" class="ib" data-vsmdazu="${i}" title="Firma auch für ${esc(vsLvName(i))} anfragen">☐</button></td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div>${F.length ? '' : '<p class="hint">Die gewählten LVs haben noch keine Bieter:innen – erst je LV Firmen hinzufügen (Häkchen nur an einem LV lassen).</p>'}
    <div class="vs-jetzt"><span><b>${[...VS.mw].length} Firma${[...VS.mw].length === 1 ? '' : 'en'} gewählt</b><small>☐ antippen = Firma auch für dieses LV anfragen. Termine bleiben je LV – beim Senden kannst du einen gemeinsamen setzen.</small></span>
      <button type="button" class="btn pri" data-vsmsenden${VS.mw.size ? '' : ' disabled'}>✉ An ${VS.mw.size} Bieter:in${VS.mw.size === 1 ? '' : 'nen'} senden (${L2.length} LVs) …</button></div></div>`;
}
async function vsMehrSenden() {
  const L2 = [...VS.M], F = vsMehrFirmen().filter((f) => VS.mw.has(f.contact_id) && f.email); if (!F.length) return;
  const A = L2.map((i) => (VS.MD[i] || {}).abgabe || '');
  if (new Set(A).size > 1 || !A[0]) {   // C: Termine bleiben je LV – auf Wunsch ein gemeinsamer
    const v = await bpEingabe(`Die gewählten LVs haben ${A[0] && new Set(A).size === 1 ? 'denselben' : 'verschiedene bzw. keine'} Abgabetermin${new Set(A).size > 1 ? 'e' : ''}. Gemeinsamen Abgabetermin für alle ${L2.length} LVs setzen? (leer lassen = je LV wie eingetragen)`, A.find(Boolean) || '', { typ: 'datetime-local', ok: 'Weiter' });
    if (v === null || v === undefined) return;
    if (v) { try { await Promise.all(L2.map((i) => api(`api/lv/${i}/versand`, 'PUT', { abgabe: v }))); await vsMehrLaden(); } catch (e) { toast(e.message, true); return; } }
  }
  const D0 = VS.MD[L2[0]], std = (D0.standard || {}).versand || D0.vorlage, lvText = (ids) => { const n = ids.map((i) => 'LV ' + vsLvName(i)); return n.length === 1 ? n[0] : n.slice(0, -1).join(', ') + ' und ' + n[n.length - 1]; };
  const ihre = (f) => L2.filter((i) => f.je[i]);
  await BPHead.versand({
    titel: `Versand an Bieter:innen – ${L2.length} LVs`,
    was: L2.flatMap((i) => { const D = VS.MD[i]; return [{ icon: '📄', name: D.namen.pdf, sub: 'LV ohne Preise – entsteht beim Senden', pdf: `api/lv/${i}/versand/ansehen?was=lv`, ohneUnterschrift: true },
      ...(D.ohne_x83 ? [] : [{ icon: '📦', name: D.namen.x83, sub: 'GAEB-Datei – entsteht beim Senden' }]), ...(D.unterlagen || []).map((x) => ({ icon: x.quelle === 'plan' ? '📐' : '📄', name: x.name, sub: vsLvName(i) }))]; })
      .concat(VS.rechner.map((x) => ({ icon: '🖥', name: x.name, sub: 'vom Rechner – an alle' }))),
    hinweis: '<p class="bpv-h">Jede Firma bekommt nur die LVs, in denen sie steht (Spalten auf der Seite) – mit deren Unterlagen, in einer Mail.</p>',
    empfaenger: F.map((f) => ({ name: f.name, sub: ihre(f).map(vsLvName).join(' · '), email: f.email, contact_id: f.contact_id, on: true })),
    zusatz: false, kopie: !!VS.kopie, betreff: std.betreff, text: std.text,
    textHilfe: 'Platzhalter je Firma: {anrede}, {firma}, {lv} (alle LVs dieser Firma), {projekt}, {bauvorhaben}, {abgabe}, {rueckmeldung}, {signatur}.',
    vorschau: async (x, V) => { const f = F.find((y) => y.contact_id === x.contact_id) || F[0], ids = ihre(f);
      const r = await api(`api/lv/${ids[0]}/versand/vorschau`, 'POST', { art: 'versand', contact_id: f.contact_id, betreff: V.betreff, text: V.text, lv_text: lvText(ids) });
      return { an: r.an || f.email, betreff: r.betreff, text: r.text || '' }; },
    knopf: () => 'Versand senden', fuss: (box) => { const n = box.querySelectorAll('[data-e]:checked').length; return `${n} Mail${n === 1 ? '' : 's'} – je Firma eine, mit allen ihren LVs`; },
    senden: async (W) => {
      const an = W.an.map((x) => F.find((f) => f.contact_id === x.contact_id)).filter(Boolean); if (!an.length) throw new Error('Keine Empfänger:in gewählt.');
      VS.kopie = W.kopie;
      const r = await api('api/versand/mehrere', 'POST', { art: 'versand', lvs: L2, an: an.map((f) => ({ contact_id: f.contact_id, email: f.email, name: f.name, anrede: f.anrede, lvs: ihre(f) })),
        betreff: W.betreff, text: W.text, kopie: !!W.kopie, anhaenge: VS.rechner.map((x) => ({ name: x.name, mime: x.mime, daten: x.daten })) });
      const fe = r.ergebnis.filter((x) => !x.ok); if (r.ergebnis.some((x) => x.ok)) VS.rechner = [];
      toast(`${r.ergebnis.length - fe.length} Mail${r.ergebnis.length - fe.length === 1 ? '' : 's'} gesendet${fe.length ? ` – ${fe.length} Fehler: ${fe.map((x) => x.name + ' (' + x.fehler + ')').join(', ')}` : ''}${r.abgelegt ? ` · je LV im Projektordner: „${r.ordner}“` : r.ablage_fehler ? ' · ' + r.ablage_fehler : ''}.`, !!fe.length);
      VS.mw = null; VS.D = null; if (typeof refreshList === 'function') refreshList(); vsMehrLaden();
    } });
}
document.addEventListener('click', async (e) => {   // Häkchen im Baum: vor dem Öffnen des LV abfangen
  const m = e.target.closest && e.target.closest('.pjtree [data-vsm]'); if (!m) return;
  e.stopPropagation(); const i = +m.dataset.vsm;
  if (m.checked) { VS.M.add(i); if (L && VS.M.size === 1 && L.id !== i) VS.M.add(L.id); } else VS.M.delete(i);
  VS.mw = null; if (typeof pjZeichnen === 'function') pjZeichnen();
  if (vsMehr()) vsMehrLaden(); else vsSeiteLaden(true);
}, true);
document.addEventListener('click', async (e) => {
  if (!e.target.closest || !e.target.closest('#vsSeite .vs-mehr, [data-vsmsenden]')) return;
  if (e.target.closest('[data-vsmweg]')) { VS.M.clear(); VS.mw = null; if (typeof pjZeichnen === 'function') pjZeichnen(); vsSeiteLaden(true); return; }
  if (e.target.closest('[data-vsmsenden]')) { vsMehrSenden(); return; }
  const d = e.target.closest('[data-vsmdazu]');
  if (d) { const i = +d.dataset.vsmdazu, cid = d.closest('[data-vsmcid]').dataset.vsmcid;
    try { VS.MD[i] = await api(`api/lv/${i}/versand`, 'PUT', { bieter: { [cid]: { weg: false } } }); VS.mw = VS.mw || new Set(); VS.mw.add(+cid);
      const el = document.getElementById('vsSeite'); el.innerHTML = vsMehrHtml();
      rueckgaengig('Firma für ein weiteres LV angefragt', async () => { VS.MD[i] = await api(`api/lv/${i}/versand`, 'PUT', { bieter: { [cid]: { weg: true } } }); el.innerHTML = vsMehrHtml(); }, { neu: vsMehrLaden }); }
    catch (er) { toast(er.message, true); } }
});
document.addEventListener('change', (e) => {
  const t = e.target; if (!t.closest || !t.closest('#vsSeite .vs-mehr')) return;
  if (t.matches('[data-vsmalle]')) { const F = vsMehrFirmen().filter((f) => f.email); VS.mw = new Set(t.checked ? F.map((f) => f.contact_id) : []); }
  else if (t.matches('[data-vsmf]')) { const cid = +t.closest('[data-vsmcid]').dataset.vsmcid; if (t.checked) VS.mw.add(cid); else VS.mw.delete(cid); }
  else return;
  document.getElementById('vsSeite').innerHTML = vsMehrHtml();
});
