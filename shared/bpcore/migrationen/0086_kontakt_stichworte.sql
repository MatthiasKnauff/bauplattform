-- Kontakte: Stichwörter (was die Firma kann – zum Finden) und Tags (Einschätzung des Büros, z. B. Stammfirma) – je mit Komma getrennt,
-- in der Kontaktmaske als Bausteine mit Vorschlägen (besprochen am 15.11.2026, Mock „Kontaktmaske“)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stichworte TEXT NOT NULL DEFAULT '';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT '';
