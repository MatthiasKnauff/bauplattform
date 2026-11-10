-- Bauplattform: Markierungen auf Plänen auf Wunsch dauerhaft behalten.
-- Eine dauerhafte Skizze erscheint automatisch wieder, wenn derselbe Plan (gleicher Inhalt) irgendwo geöffnet wird.
ALTER TABLE skizze ADD COLUMN dauerhaft INTEGER NOT NULL DEFAULT 0;
ALTER TABLE skizze ADD COLUMN hash TEXT NOT NULL DEFAULT '';          -- SHA-256 des PDFs
ALTER TABLE skizze ADD COLUMN groesse INTEGER NOT NULL DEFAULT 0;     -- Bytes (Ersatzschlüssel mit dem Namen, falls der Browser nicht hashen kann)
CREATE INDEX skizze_dauerhaft ON skizze(dauerhaft, hash);
