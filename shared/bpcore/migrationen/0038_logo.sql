-- Büro-Logo in der Datenbank: jede App liest es direkt (bpcore.logo), statt das Bautagebuch danach zu fragen.
-- Genau eine Zeile; die Datei im Datenordner des Bautagebuchs bleibt als Kopie für seine Ausdrucke und die Auslagerung.
CREATE TABLE IF NOT EXISTS buero_logo (
    id        INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    ext       TEXT    NOT NULL,
    daten     BYTEA   NOT NULL,
    geaendert TEXT    NOT NULL
);
