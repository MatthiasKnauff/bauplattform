-- Bauplattform: KI-Auswahl je Benutzer (Kopfleiste aller Apps) und Baukosten-App.
-- ai: '' = Intern (Regeln und Kennwerte, ohne Internet), 'ollama', 'claude', 'gemini', 'chatgpt'
ALTER TABLE users ADD COLUMN ai TEXT NOT NULL DEFAULT '';

-- Kostenermittlungen (eine je Projekt und Stufe möglich). data = Raumbuch, Raumtypen, Kennwerte, Ansätze als JSON.
CREATE TABLE bk_projects(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,          -- Projekt des Bautagebuchs
  gantt_id TEXT REFERENCES gantt_projects(id) ON DELETE SET NULL,        -- Bauzeitenplan für den Mittelabfluss
  stufe TEXT NOT NULL DEFAULT 'schaetzung',                               -- rahmen, schaetzung, berechnung, anschlag, feststellung
  data TEXT NOT NULL DEFAULT '{}',
  rev INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL DEFAULT '', updated TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL DEFAULT '');
CREATE INDEX idx_bk_project ON bk_projects(project_id);

-- hochgeladene Pläne (PDF) einer Kostenermittlung
CREATE TABLE bk_files(
  id SERIAL PRIMARY KEY,
  bk_id INTEGER NOT NULL REFERENCES bk_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '', mime TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
  data BYTEA,
  meta TEXT NOT NULL DEFAULT '{}',                                        -- Maßstab, Blatt, erkannte Räume …
  created TEXT NOT NULL DEFAULT '', user_name TEXT NOT NULL DEFAULT '');
CREATE INDEX idx_bk_files ON bk_files(bk_id);

-- projektübergreifend: eigene Kennwerte je Raumtyp u. a.
CREATE TABLE bk_store(
  key TEXT PRIMARY KEY, data TEXT NOT NULL DEFAULT 'null',
  updated TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL DEFAULT '');
