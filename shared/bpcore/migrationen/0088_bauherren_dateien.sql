-- Bauherrenportal: Dateien (entschieden am 16.11.2026, Entwurf „Bauherrenportal: freigeben, an/aus, Uploads“; Programm: bpcore/bauherren.py)
-- bh_datei  PDFs und Bilder an Freigaben (schluessel = bh_freigabe.schluessel) und Dateien, die Bauherr:innen hochgeladen haben
--           (schluessel = „e:<fern_id>“ aus bh_eingang). Die Bereiche je Projekt (an/aus) stehen in bp_store „bauherren:bereiche:<pid>“.
CREATE TABLE IF NOT EXISTS bh_datei (
    schluessel  TEXT    NOT NULL,
    nr          INTEGER NOT NULL DEFAULT 0,
    name        TEXT    NOT NULL DEFAULT '',
    mime        TEXT    NOT NULL DEFAULT '',
    groesse     INTEGER NOT NULL DEFAULT 0,
    inhalt      BYTEA,
    created     TEXT    NOT NULL DEFAULT '',
    PRIMARY KEY (schluessel, nr)
);
