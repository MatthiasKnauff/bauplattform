-- „Alle Dateien“ → Details: Angaben aus der Datei (EXIF der Fotos, Seiten und Format der PDFs, Titel/Autor der Office-Dateien),
-- beim ersten Ansehen gelesen und hier gemerkt; groesse/mtime: Stand der Datei – ändert sie sich, wird neu gelesen.
CREATE TABLE IF NOT EXISTS bp_dateiinfo (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pfad       TEXT    NOT NULL,
    groesse    BIGINT  NOT NULL DEFAULT 0,
    mtime      DOUBLE PRECISION NOT NULL DEFAULT 0,
    meta       TEXT    NOT NULL DEFAULT '{}',
    PRIMARY KEY (project_id, pfad)
);
