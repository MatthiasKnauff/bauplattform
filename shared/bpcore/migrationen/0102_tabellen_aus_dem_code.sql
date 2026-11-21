-- Tabellen, die bisher der Code beim ersten Gebrauch selbst anlegte (je Prozess einmal „CREATE TABLE IF NOT EXISTS“ mitten in einer Anfrage –
-- ava.py: _beleg_tabelle, _lvdok_tabelle, _ntd_tabelle, _buerg_tabelle; bpcore: fehler, bugmeldung, hilfe). Das Schema gehört dem Kern
-- (CLAUDE.md, Betrieb): ab 21.11.2026 stehen sie hier, die Anlege-Funktionen im Code entfallen. Dieselben Definitionen wie im Code –
-- in bestehenden Datenbanken gibt es die Tabellen schon, dort ändert diese Migration nichts.
CREATE TABLE IF NOT EXISTS ava_lvdok(id SERIAL PRIMARY KEY, lv_id INTEGER NOT NULL, name TEXT NOT NULL DEFAULT '', data BYTEA,
    auslese TEXT, created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS ava_nt_datei(id SERIAL PRIMARY KEY, lv_id INTEGER NOT NULL, nt TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT 'application/pdf', data BYTEA,
    created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS ava_buergschaft(id SERIAL PRIMARY KEY, lv_id INTEGER NOT NULL, art TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '', data BYTEA, ablage TEXT NOT NULL DEFAULT '', erkannt TEXT NOT NULL DEFAULT '{}',
    created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS ava_beleg(id SERIAL PRIMARY KEY, rechnung_id INTEGER NOT NULL REFERENCES ava_rechnung(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '', data BYTEA, ablage TEXT NOT NULL DEFAULT '', created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '');
ALTER TABLE ava_beleg ADD COLUMN IF NOT EXISTS auslese TEXT;
CREATE TABLE IF NOT EXISTS bp_fehler(id SERIAL PRIMARY KEY, schluessel TEXT UNIQUE NOT NULL, app TEXT NOT NULL DEFAULT '',
    art TEXT NOT NULL DEFAULT 'server', meldung TEXT NOT NULL DEFAULT '', stack TEXT NOT NULL DEFAULT '', pfad TEXT NOT NULL DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '', browser TEXT NOT NULL DEFAULT '', anzahl INTEGER NOT NULL DEFAULT 1,
    zuerst TEXT NOT NULL DEFAULT '', zuletzt TEXT NOT NULL DEFAULT '', gelesen INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bp_bug(id SERIAL PRIMARY KEY, ts TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '',
    app TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '', kontext TEXT NOT NULL DEFAULT '{}',
    bild TEXT NOT NULL DEFAULT '', bild_typ TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'offen', notiz TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS bp_hilfe(id SERIAL PRIMARY KEY, art TEXT NOT NULL DEFAULT 'frage', ts TEXT NOT NULL DEFAULT '',
    user_id INTEGER, user_name TEXT NOT NULL DEFAULT '', app TEXT NOT NULL DEFAULT '', projekt TEXT NOT NULL DEFAULT '',
    text TEXT NOT NULL DEFAULT '', kontext TEXT NOT NULL DEFAULT '{}', bild TEXT NOT NULL DEFAULT '', bild_typ TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'offen', helfer_id INTEGER, helfer_name TEXT NOT NULL DEFAULT '',
    geaendert TEXT NOT NULL DEFAULT '', gelesen_user INTEGER NOT NULL DEFAULT 0, gelesen_helfer INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS bp_hilfe_msg(id SERIAL PRIMARY KEY, hilfe_id INTEGER NOT NULL, ts TEXT NOT NULL DEFAULT '',
    user_id INTEGER, user_name TEXT NOT NULL DEFAULT '', text TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS bp_hilfe_live(hilfe_id INTEGER PRIMARY KEY, seq INTEGER NOT NULL DEFAULT 0, ts TEXT NOT NULL DEFAULT '',
    bild TEXT NOT NULL DEFAULT '', zeiger TEXT NOT NULL DEFAULT '', zseq INTEGER NOT NULL DEFAULT 0);
