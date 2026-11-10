# Bauplattform – Regeln für jede Änderung

Diese Datei liest jeder Claude-Chat automatisch. Sie gilt für alle Apps. Was hier steht, prüft zum Teil die Pipeline
(`tools/tests/ordnung.py`, `tools/tests/js/`, `tools/tests/ui/`) – ein Verstoß wird nicht gebaut.

## Zusammenarbeit
- Antworten nur auf Deutsch.
- Änderungen an Bedienung oder Navigation erst besprechen und als Mock zeigen, dann auf das GO warten.
- Nach jedem Push: Liste der Änderungen nennen, im Hintergrund auf den Build warten, bei Grün eine Push-Nachricht schicken
  und den Freigabe-Link mit der nächsten Versionsnummer angeben (`…/releases/new?tag=v<nächste>&target=main`).
- Handbuch, Chronik und technische Dokumentation nur auf Zuruf.
- Mehrere Chats arbeiten gleichzeitig an diesem Repo: vor dem Push immer `git pull --rebase --autostash`.
- Sehr aufwendige Umbauten vorher melden.

## Sicherheit (ohne Ausnahme)
- Das Repo ist öffentlich. Nie hinein: Briefbogen/PDFs mit Bankdaten, lizenzierte Katalogdaten (`.ava`, sirAdos),
  Bildschirmfotos, Fehlermeldungen von Benutzern, Schlüssel, Kennwörter, Sicherungen.
- Geheimnisse (Kennwörter, API-Schlüssel) werden nie an den Browser zurückgegeben.
- Fehlermeldungen, Bildschirmfotos und Hilfeanfragen bleiben in der Datenbank des Büros.

## Zielbild (beschlossen am 09.11.2026)
- **Ein Image** für alle Apps, je App ein Container. Daneben nur Datenbank (postgres) und KI (ollama).
- **Jede App gleich gebaut:** ein Ordner mit Seite und Server-Teil. Eine App benutzt nur Baukasten und Kern, nie eine andere App.
- **Baukasten (Oberfläche):** `shared/bpcore/head/` → im Browser unter `/bp/…`. Jede Funktion gibt es genau einmal.
- **Kern (Server):** `shared/bpcore/` – Anmeldung, Rechte, Datenbank, Verlauf, Papierkorb, Mail, KI, Druck.
- **Dienste:** Hintergrundaufgaben (Datenbank einrichten, Datensicherung, Erinnerungen) wandern aus dem Bautagebuch
  in einen eigenen Container; das Bautagebuch wird eine normale App.
- Reihenfolge: 1 Sicherheitsnetz (Tests, Ordnungsprüfung) · 2 Baukasten als ein Bündel · 3 ein Image, ein Startprogramm,
  eine App-Liste · 4 Apps auf den Baukasten, große Dateien teilen · 5 Kern aus dem Bautagebuch lösen.
- Kein Framework, kein Übersetzungsschritt: reines Python/Flask und reines JavaScript/CSS.

## Code
- Erst nachsehen, ob es den Baustein schon gibt – benutzen statt kopieren; dabei möglichst alten Code überflüssig machen.
  Vorhanden u. a.: `bp.js` (Grundhilfen `$`, `esc`, `api`, `toast`, `modalBox`), `undo.js` (`rueckgaengig`, Rückgängig-Dock),
  `seite.js` (Bereich rechts, abdockbar), `befehle.js` (Befehlsleiste), `vorschlag.js` (Vorschlagsliste, GAEB-Einheiten), `blase.js` (`bpBlase` – Erklär-Blase, zeigt sich nur die ersten Male), `nav.js` (`bpNav` – Navigation links: Kopf, Gruppen, Bereiche), `baum.js` (`bpBaum` – Baumtabelle `table.bp-baum`: Baumzelle mit Einrückung, Dreieck, Symbol; Auf-/Zuklappen `klapp`, `sicht`, `zeige`, `klappbar`; Markieren `markiere`, `markiert` (Klick, Strg, Umschalt); Rollposition beim Neuzeichnen `rolle`; Tastatur `tasten` – Zeilen-/Feldmodus mit ↑↓←→, Tab, Enter, Esc, F6 – jeder neue Baum meldet sich dort an),
  `head.js` (Kopfleiste, Stil, Verlauf, `bpFrage`/`bpEingabe`/`bpHinweis`, `BPHead.datenMaske`, Kontaktmaske).
- Neue gemeinsame Bausteine gehören nach `shared/bpcore/head/` und in die Freigabeliste in `shared/bpcore/head.py`.
- Die Ausschreibung ist geteilt: `plattform/static/ava.html` (nur Gerüst), `ava.css`, und zehn Skripte `ava-kern.js`, `ava-baum.js`, `ava-lv.js`, `ava-aufmass.js` (mit Angeboten), `ava-rechnungen.js`, `ava-werkzeuge.js`, `ava-bearbeiten.js`, `ava-auftraege.js`, `ava-tueren.js`, `ava-start.js` – in dieser Reihenfolge geladen, gemeinsame Namen. Änderungen dort machen, nicht wieder in die Seite schreiben.
- Neue Dateien höchstens 1.500 Zeilen; die großen Altdateien nicht weiter aufblähen (Liste in `ordnung.py`), sondern teilen.
- Keine Inline-Handler (`onclick=`) – Ereignisse im Skript anmelden.
- Tests gehören ins Repo (`tools/tests/`), nicht nur in die Arbeitsumgebung eines Chats.

## Oberfläche
- Keine Systemdialoge (`alert`, `confirm`, `prompt`, native Auswahllisten) – immer die eigenen Dialoge.
- Rückgängig überall über `rueckgaengig()` (ein Dock, mit Wiederholen).
- Fenster schließen nur über ihre Knöpfe, nie durch Klick daneben.
- Je Bereich genau ein Scrollbalken. Fenster in Standardbreite ohne waagerechten Scrollbalken.
- Keine halben Rahmen, keine springenden Elemente; Spalten so schmal wie ihr Inhalt, aber keine leere Fläche neben der Tabelle.
- Gleiche Aufgabe, gleicher Aufbau: links Baumtabelle (Projekt → LV → Inhalt), rechts der abdockbare Bereich (`seite.js`),
  darüber die Befehlsleiste (`befehle.js`).
- Aussehen nur über Stil-Variablen (`--rk`, `--rkp`, `--sh0`, `--af` …), damit jeder Benutzer seinen Stil wählen kann;
  Farben, Schrift und Schriftgröße bleiben davon unabhängig. Startschema = wie das alte Bautagebuch.
- Was länger als 1,5 Sekunden dauert, zeigt einen kleinen Warte-Hinweis.

## Betrieb
- Ein Image für alle Apps: `Dockerfile` und `requirements.txt` im Hauptordner. Welche Apps es gibt und wie sie starten, steht in `apps.py`
  (Ordner, Modul, Port); `start.py` startet die App des Containers (Umgebungsvariable `APP`). Die Hintergrundaufgaben (Datenbank einrichten, sichern, erinnern) laufen im Container `dienste` (`bautagebuch/dienste.py`, Aufgaben in `bautagebuch/core/dienste.py`); die Apps warten auf ihn, nicht mehr auf das Bautagebuch. Das Datenbankschema gehört dem Kern: nummerierte Migrationen in `shared/bpcore/migrationen/` (nur additiv, nie nachträglich ändern; eingespielt von `bpcore.schema`), Zugriff für alle Apps über `bpcore.db`. Neue App: Ordner, Zeile in `apps.py`, Dienst in den Stack-Dateien.
- Push auf `main` → Pipeline → Testserver (Docker 1). Erst die Freigabe (Release `v…`) bringt den Stand in die Produktion (Docker 2).
- Lehnt GitHub den Upload eines Images ab (`permission_denied: write_package`), den Lauf mit „nur fehlgeschlagene“ wiederholen.
