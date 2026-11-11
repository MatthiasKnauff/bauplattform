-- „Pläne & Dateien“ → „Alle Dateien“: kleine Vorschaubilder (JPEG, längste Seite 320 px) der Dateien im Projektordner.
-- Die Originale bleiben auf dem Dateiserver; hier liegen nur die Vorschauen. groesse/mtime: Stand der Datei beim Erzeugen –
-- ändert sich die Datei, wird neu erzeugt. bild NULL + wunsch: jemand sieht die Kachel gerade an → kommt zuerst dran (Dienste).
-- fehler: Vorschau ließ sich nicht erzeugen (z. B. zu groß, verschlüsselt) – wird nicht ständig neu versucht.
CREATE TABLE IF NOT EXISTS bp_vorschau (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pfad       TEXT    NOT NULL,
    groesse    BIGINT  NOT NULL DEFAULT 0,
    mtime      DOUBLE PRECISION NOT NULL DEFAULT 0,
    bild       BYTEA,
    fehler     TEXT    NOT NULL DEFAULT '',
    wunsch     TIMESTAMPTZ,
    erstellt   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, pfad)
);
CREATE INDEX IF NOT EXISTS idx_bp_vorschau_wunsch ON bp_vorschau(wunsch) WHERE wunsch IS NOT NULL AND bild IS NULL;
