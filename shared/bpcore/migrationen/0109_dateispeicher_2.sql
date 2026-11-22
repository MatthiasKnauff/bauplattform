-- Dateispeicher, Etappe 2 (22.11.2026): weitere Dokumente und Fotos aus der Datenbank auf das Laufwerk des Kerns (bpcore/dateien.py).
-- Je Tabelle der Verweis datei_ref neben der bisherigen BYTEA-Spalte; vorhandene Zeilen ziehen die Dienste um (dateien.umziehen).
-- Bleiben in der Datenbank (klein oder gerechnet): Logo, Vorschaubilder (bp_vorschau, wiki_datei.vorschau, ava_bild.klein), 3D-Netz, Bauteile je Planstand.
ALTER TABLE kom_datei ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE todo_datei ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE ava_lvdok ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE ava_nt_datei ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE ava_buergschaft ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE ava_bild ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE ava_vergabedok ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE honorar_vertrag ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE honorar_fremd_re ADD COLUMN IF NOT EXISTS datei_ref TEXT;
ALTER TABLE bh_datei ADD COLUMN IF NOT EXISTS datei_ref TEXT;
