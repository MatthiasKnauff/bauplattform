-- Die eingelesene IFC-Datei je Planstand (17.11.2026): „IFC mit Maßnahmen ausgeben“ braucht die Originaldatei – bisher musste man sie,
-- wenn sie vom Gerät kam, noch einmal wählen. Gespeichert gzip-gepackt, gelöscht mit dem Planstand (Papierkorb).
CREATE TABLE IF NOT EXISTS pm_planstand_datei (
    planstand  INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL DEFAULT '',
    daten      BYTEA   NOT NULL
);
