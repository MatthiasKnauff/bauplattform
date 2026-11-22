-- Bauteile je Planstand, wie sie aus der Datei gelesen wurden (22.11.2026, „Art ändern dauert sehr lange“; Programm: bpcore/cadimport.py
-- ifc_einlesen → ifc_ordnen, bpcore/planstand.py elemente). Abgeleitet wie das 3D-Netz (gzip-JSON), beim Einlesen einmal berechnet –
-- eine Art-Änderung ordnet nur noch neu, statt die Datei wieder zu lesen. Nie die Datei selbst.
CREATE TABLE IF NOT EXISTS pm_elemente (
    planstand  INTEGER PRIMARY KEY,
    daten      BYTEA   NOT NULL,
    erstellt   TEXT    NOT NULL DEFAULT ''
);
