-- 3D-Netz je Planstand (GO 16.11.2026, Entwurf „Gebäudemodell als Mitte“, Punkt 20; Programm: bpcore/netz.py, Betrachter bp/ansicht3d.js)
-- Abgeleitete Dreiecke (gzip-JSON), beim Einlesen einmal berechnet – nie die Datei selbst.
CREATE TABLE IF NOT EXISTS pm_netz (
    planstand  INTEGER PRIMARY KEY,
    daten      BYTEA   NOT NULL,
    erstellt   TEXT    NOT NULL DEFAULT ''
);
