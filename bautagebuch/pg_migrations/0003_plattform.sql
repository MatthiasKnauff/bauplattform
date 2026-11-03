-- Bauplattform: gemeinsame Anmeldung (SSO), App-Rechte, Bauzeitenpläne in der gemeinsamen Datenbank.
-- Das Bautagebuch führt diese Migration aus; Startseite, Verwaltung und Bauzeitenplan warten darauf.

-- Benutzer: welche Apps (leer = alle), gesperrt ja/nein
ALTER TABLE users ADD COLUMN apps TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1;

-- Sitzungen der gemeinsamen Anmeldung (nur Hash des Cookie-Schlüssels)
CREATE TABLE sso_sessions(
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created TEXT NOT NULL DEFAULT to_char(timezone('UTC', now()), 'YYYY-MM-DD HH24:MI:SS'),
  seen BIGINT NOT NULL DEFAULT 0,          -- Unix-Zeit der letzten Nutzung
  expires BIGINT NOT NULL,
  ip TEXT NOT NULL DEFAULT '', agent TEXT NOT NULL DEFAULT '', app TEXT NOT NULL DEFAULT '');
CREATE INDEX idx_sso_user ON sso_sessions(user_id);

-- Bauzeitenpläne (früher JSON-Dateien der Gantt-App). data = vollständiger Plan als JSON.
CREATE TABLE gantt_projects(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '{}',
  rev INTEGER NOT NULL DEFAULT 1,           -- Änderungszähler: schützt vor gegenseitigem Überschreiben
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,   -- verknüpftes Bautagebuch-Projekt
  created TEXT NOT NULL DEFAULT '', updated TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL DEFAULT '');
CREATE INDEX idx_gantt_project ON gantt_projects(project_id);

CREATE TABLE gantt_versions(
  id TEXT PRIMARY KEY,
  gantt_id TEXT NOT NULL REFERENCES gantt_projects(id) ON DELETE CASCADE,
  meta TEXT NOT NULL DEFAULT '{}',          -- Name, Notiz, auto, Anzahl, Ende …
  data TEXT NOT NULL DEFAULT '{}',
  created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '');
CREATE INDEX idx_gantt_versions ON gantt_versions(gantt_id, created);

-- projektübergreifende Daten der Gantt-App: presets, library, catfirms, phases, settings
CREATE TABLE gantt_store(
  key TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT 'null',
  updated TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL DEFAULT '');

-- wer hat welchen Plan gerade geöffnet (Herzschlag alle paar Sekunden)
CREATE TABLE gantt_presence(
  gantt_id TEXT NOT NULL, user_id INTEGER NOT NULL, user_name TEXT NOT NULL DEFAULT '', seen BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY(gantt_id, user_id));
