/* Verwaltung → Einstellungen → Ablage: Freigabe „Bauportal“ (Ordner 01–06 anlegen, Wiki für sich sichern, Notfallpaket).
   Server: bautagebuch/modules/backups.py (/api/backups/bauportal), bautagebuch/core/bauportal.py. */
async function bpoLaden(method, body) {
  const box = $('#bpoBox'); if (!box) return;
  let X; try { X = await api('api/bt/backups/bauportal', method || 'GET', body); } catch (e) { if (method) toast(e.message, true); if (method) { bpoLaden(); return null; } box.hidden = true; return null; }   // nur Administrator
  const S0 = data.bt || {}, vor = S0.store_server ? `\\\\${S0.store_server}\\Bauportal` : '\\\\server\\Bauportal';
  const W = X.wiki || {}, fehlt = (X.ordner || []).filter((o) => !o.da).length;
  box.innerHTML = `<b>Freigabe „Bauportal“</b>
    <p class="mute" style="font-size:.85rem;margin:.3rem 0 .5rem">Platz für große Dateien, die in keinen Projektordner gehören: Eingang (Scanner), Wiki, Kataloge, Vorlagen, Ausgabe, Sicherung. Die Freigabe legst du auf dem Server an; die Ordner darin legt die Plattform an – jeder mit einer LIESMICH. Zugangsdaten wie die Ablage. Ist kein eigener Eingangsordner eingetragen, gilt „01 Eingang“.</p>
    <div class="sf"><label class="w">Freigabe${X.pfad ? '' : ' <small class="mute">(Vorschlag)</small>'}<input id="bpoPfad" value="${esc(X.pfad || vor)}" placeholder="${esc(vor)}"></label></div>
    <div class="st-a" style="margin:.5rem 0"><button class="btn pri" data-bpo="save">Speichern</button>${X.pfad ? `<button class="btn" data-bpo="einrichten"${X.nur_lesen ? ' disabled title="Testserver: nur lesen"' : ''}>Ordner anlegen</button><button class="btn" data-bpo="wiki"${X.nur_lesen ? ' disabled title="Testserver: nur lesen"' : ''}>Wiki jetzt sichern</button>` : ''}<a class="btn" href="api/bt/backups/wiki-notfallpaket.zip" download>Notfallpaket laden</a></div>
    ${X.fehler ? `<p class="err">Freigabe nicht erreichbar: ${esc(X.fehler)}</p>` : ''}
    ${(X.ordner || []).length ? `<p style="font-size:.88rem;margin:.3rem 0">${X.ordner.map((o) => `<span style="margin-right:.8rem;white-space:nowrap">${o.da ? '✓' : '○'} ${esc(o.name)}</span>`).join('')}${fehlt ? `<br><span class="mute">${fehlt} Ordner fehlen noch – „Ordner anlegen“.</span>` : ''}</p>` : ''}
    ${X.pfad ? `<p class="${W.ok === false ? 'err' : 'mute'}" style="font-size:.85rem;margin:.2rem 0">Wiki-Sicherung (täglich mit der Datensicherung): ${W.zeit ? esc(new Date(W.zeit).toLocaleString('de-DE')) + ' – ' + esc(W.meldung || '') : 'noch keine'}</p>` : ''}
    ${X.nur_lesen ? '<p class="mute" style="font-size:.85rem">Testserver: die Freigabe wird hier nur gelesen.</p>' : ''}`;
  return X;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-bpo]'); if (!b) return;
  const a = b.dataset.bpo;
  if (a === 'save') { if (await bpoLaden('PUT', { pfad: $('#bpoPfad').value.trim() })) toast('Freigabe gespeichert.'); return; }
  b.disabled = true; b.textContent = a === 'wiki' ? 'sichere …' : 'lege an …';
  const X = await bpoLaden('POST', { aktion: a });
  if (X) toast(X.meldung || 'Erledigt.');
});
