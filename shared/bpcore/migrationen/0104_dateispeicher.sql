-- Gemeinsamer Dateispeicher (GO 21.11.2026, bpcore/dateien.py): große Dateien liegen als Datei auf dem Laufwerk aller Container
-- (DATA_DIR/dateien/<ab>/<cd>/<sha256>), die Datenbank hält nur den Verweis. Erste Etappe: Rechnungs-PDFs (ava_beleg),
-- Pläne der Markierung (skizze), IFC-Dateien der Planstände (pm_planstand_datei). Die bisherigen BYTEA-Spalten bleiben –
-- eine Zeile hat entweder den Verweis oder den Inhalt; vorhandene Zeilen ziehen die Dienste um (dateien.umziehen).
CREATE TABLE IF NOT EXISTS bp_datei(
    sha       TEXT PRIMARY KEY,                -- SHA-256 des Inhalts = Name der Datei im Speicher
    groesse   BIGINT  NOT NULL DEFAULT 0,
    erstellt  TEXT    NOT NULL DEFAULT '',
    frei_seit TEXT    NOT NULL DEFAULT '',     -- seit wann kein Verweis mehr darauf zeigt (gelöscht erst 90 Tage später)
    extern    INTEGER NOT NULL DEFAULT 0);     -- 1 = liegt auch auf dem Dateiserver (Sicherung außerhalb des Servers)
ALTER TABLE ava_beleg ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE skizze ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE pm_planstand_datei ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE pm_planstand_datei ALTER COLUMN daten DROP NOT NULL;   -- mit Verweis steht hier nichts mehr
