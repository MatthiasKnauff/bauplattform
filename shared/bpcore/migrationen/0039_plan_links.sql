-- Bauzeitenplan: Links zum Ansehen (schreibgeschützt) für Externe – ohne Anmeldung, über einen geheimen Schlüssel.
-- art „mit“: zeigt den aktuellen Stand des eingestellten Plans (der Ersteller kann den Plan/die Version jederzeit wechseln);
-- art „fest“: zeigt den beim Erstellen festgehaltenen Stand (stand = Plan-Daten als JSON).
CREATE TABLE IF NOT EXISTS gantt_links (
    token        TEXT    PRIMARY KEY,
    gantt_id     TEXT    NOT NULL REFERENCES gantt_projects(id) ON DELETE CASCADE,
    art          TEXT    NOT NULL DEFAULT 'mit',
    fortschritt  INTEGER NOT NULL DEFAULT 1,
    name         TEXT    NOT NULL DEFAULT '',
    stand        TEXT,
    stand_name   TEXT    NOT NULL DEFAULT '',
    ablauf       TEXT    NOT NULL DEFAULT '',
    aktiv        INTEGER NOT NULL DEFAULT 1,
    erstellt     TEXT    NOT NULL,
    von          TEXT    NOT NULL DEFAULT '',
    zuletzt      TEXT    NOT NULL DEFAULT '',
    aufrufe      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gantt_links_plan ON gantt_links(gantt_id);
