'use strict';
/* Verwaltung → Einstellungen durchsuchen: ein Stichwortverzeichnis aller Einstellungen (Persönlich, Büro, Seiten der Apps).
   Zeigt nur, was die Rolle sehen darf (darfSeite aus admin-wer.js); Klick öffnet die Seite und hebt den Abschnitt hervor.
   Gehört zu admin.html (gemeinsame Namen: $, esc, tab, data, renderTabs, load, darfSeite, REGS). */
const SUCH = [   // Seite (stab), Ort, Titel, Stichwörter, Abschnitt zum Hervorheben
  ['ich:konto', 'Persönlich', 'Unterschrift', 'Unterschrift unterschreiben Bild PDF Rüge zeichnen', 'Unterschrift'],
  ['ich:konto', 'Persönlich', 'E-Mail-Signatur', 'Signatur Mail Grußformel Telefon Funktion Outlook HTML', 'E-Mail-Signatur'],
  ['ich:konto', 'Persönlich', 'Absender:in meiner Mails', 'Absender Mail Büro eigene Adresse Senden als Antwort', 'Absender'],
  ['ich:konto', 'Persönlich', 'Mängel- und Terminrügen versenden', 'Rüge Mängelrüge Terminrüge Versand PDF Firma Kopie', 'Mängel- und Terminrügen'],
  ['ich:konto', 'Persönlich', 'Preise aus den Baudaten', 'Preis Baudaten Katalog Mittel von bis eigene Preise Median LV Baukosten', 'Preise aus den Baudaten'],
  ['ich:konto', 'Persönlich', 'Erinnerungen', 'Erinnerung Termin Outlook Kalender Einladung Frist', 'Erinnerungen'],
  ['ich:konto', 'Persönlich', 'Posteingang', 'Post Postfach Mails Abruf Startseite CC ausblenden', 'Posteingang'],
  ['ich:konto', 'Persönlich', 'Vor Ort erkennen', 'iPhone Kurzbefehl Standort CarPlay Baustelle Tagesbericht GPS', 'Vor Ort'],
  ['ich:konto', 'Persönlich', 'Kennwort', 'Kennwort Passwort ändern Anmeldung', 'Kennwort'],
  ['ich:look', 'Persönlich', 'Darstellung', 'Darstellung Farbschema hell dunkel Akzentfarbe Farbe Schrift Schriftgröße Stil Design', ''],
  ['ich:ki', 'Persönlich', 'Meine KI', 'KI vorgewählt Claude Gemini ChatGPT Ollama ohne Nachfrage', ''],
  ['firma', 'Büro & Standort', 'Firma, Logo, Briefbogen, Stempel', 'Firma Büro Name Anschrift Logo Briefbogen Briefkopf Stempel Bundesland Kammer Bauvorlage', ''],
  ['darstellung', 'Büro & Standort', 'Darstellung fürs Büro', 'Einfach Profi Vorgabe Karte Kartendienst Google OpenStreetMap', ''],
  ['ablage', 'Ablage & Server', 'Ablage auf dem Server', 'Ablage Dateiserver Projektordner SMB Netzlaufwerk Ordner PDF-Namen Fotos alte Stände Eingangsordner Allplan', ''],
  ['sicherung', 'Ablage & Server', 'Datensicherung', 'Datensicherung Backup Sicherung Wiederherstellen Kopie Fotos', ''],
  ['mail', 'Mail & Kalender', 'Postausgang, Posteingang, Postfächer', 'Mailserver SMTP Postfach Versand Microsoft 365 Absenderadresse Posteingang zuweisen', ''],
  ['druck', 'Druck & Vorlagen', 'Druck-Layouts', 'Druck Layout PDF Ausdruck Briefkopf Anschrift Fenster Raster Rüge Vorlage Editor', ''],
  ['vorlagen', 'Druck & Vorlagen', 'E-Mail-Vorlagen', 'Vorlage Mail Text Rüge Einladung Platzhalter Planversand', ''],
  ['allgemein', 'KI', 'KI im Büro', 'KI künstliche Intelligenz Ollama Claude Gemini ChatGPT Schlüssel Modell an aus Positionsvorschlag', ''],
  ['kataloge', 'Kataloge erzeugen', 'Kataloge erzeugen', 'Katalog Allplan kukat Vorbemerkungen Positionen Bauteil-Vorlagen KI', ''],
  ['apps', 'Apps', 'Apps im Büro', 'Apps abschalten einschalten Kacheln', ''],
  ['verlauf', 'System', 'Verlauf', 'Verlauf Änderungen zurück Version Stand wiederherstellen', ''],
  ['app:portal', 'Apps', 'Startseite', 'Startseite Kacheln Anordnung Posteingang To-dos', ''],
  ['app:aufgaben~erinnerungen', 'Apps', 'Aufgaben: Erinnerungen', 'Erinnerung Vorlauf Uhrzeit Mail Bauzeitenplan Firma Einsatz', ''],
  ['app:aufgaben~todo', 'Apps', 'Aufgaben: Regeln der To-dos', 'To-do Regeln automatisch Vergabe Mängel Rechnung Frist', ''],
  ['app:baukosten', 'Apps', 'Baukosten: Raumtypen & Kennwerte', 'Raumtypen Kennwerte Kosten m² BGF Kostendatenbank', ''],
  ['app:baudaten', 'Apps', 'Baudaten: Kataloge, Preise, Index & Löhne', 'Baudaten Katalog sirAdos Preis Index Baupreisindex Regionalfaktor Löhne', ''],
  ['app:ava', 'Apps', 'Ausschreibung: Kataloge & Abrechnung', 'Ausschreibung AVA Katalog Abrechnung Nachträge Mengenüberschreitung Bedarfsposition', ''],
  ['app:plaene', 'Apps', 'Pläne: Plannummerierung & Gewerke', 'Plan Plannummer Planname Planarten Gewerk Kennung Plotauftrag Anhang', ''],
  ['app:gantt', 'Apps', 'Bauzeitenplan: Kataloge, Phasen, Firmen', 'Bauzeitenplan Leistungskatalog Phasen Firmen Vorlagen Gantt', ''],
  ['app:bautagebuch', 'Apps', 'Bautagebuch: Bericht-Assistent', 'Bautagebuch Bericht Assistent Schritte', ''],
  ['app:honorar', 'Apps', 'Honorar: Rechnungen & Vertrag', 'Honorar Rechnungsnummer Zahlungsziel Texte Vertrag', ''],
];
const _fq = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const suchFeld = () => `<div class="st-such"><input type="search" placeholder="Einstellungen durchsuchen – z. B. Signatur, Logo, Erinnerung …" aria-label="Einstellungen durchsuchen" autocomplete="off"><div class="st-sres" hidden></div></div>`;
function suchTreffer(q) {
  const w = _fq(q).split(/\s+/).filter(Boolean); if (!w.length) return [];
  return SUCH.filter(([st, ort, t, k]) => darfSeite('einstellungen', st) && (!st.startsWith('app:') || (data.conf.apps || []).some((a) => a.allowed && a.key === st.slice(4).split('~')[0]))
    && w.every((a) => _fq(`${ort} ${t} ${k}`).includes(a)));
}
document.addEventListener('input', (e) => {
  const i = e.target.closest && e.target.closest('.st-such input'); if (!i) return;
  const box = i.nextElementSibling, L = suchTreffer(i.value);
  box.hidden = !i.value.trim();
  box.innerHTML = L.length ? L.map(([st, ort, t, k, ab]) => `<button type="button" data-such="${esc(st)}" data-ab="${esc(ab)}"><small>${esc(ort)}</small><b>${esc(t)}</b><span>${esc(k.split(' ').slice(0, 8).join(' · '))}</span></button>`).join('')
    : `<p class="mute" style="margin:.4rem .6rem">Keine Einstellung zu „${esc(i.value)}“.</p>`;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest && e.target.closest('.st-such input')) { const b = e.target.nextElementSibling.querySelector('[data-such]'); if (b) b.click(); } });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-such]'); if (!b) return;
  tab = 'einstellungen'; data.stab = b.dataset.such; history.replaceState(null, '', '#einstellungen-' + data.stab); renderTabs(); await load();
  const ab = _fq(b.dataset.ab); if (!ab) return;   // load() wartet, bis die Seite gezeichnet ist (auch „Mein Konto“)
  const h = [...$('#main').querySelectorAll('h3,h4,label,b')].find((x) => _fq(x.textContent).startsWith(ab));
  if (h) { h.scrollIntoView({ block: 'start' }); h.classList.add('bph-treffer'); h.addEventListener('animationend', () => h.classList.remove('bph-treffer'), { once: true }); }
});
