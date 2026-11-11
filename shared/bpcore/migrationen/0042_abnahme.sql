-- Abnahme (Kommunikation → ＋ → Abnahme): ein Vorgang der Art 'abnahme' mit Niederschrift, Mängelblatt und Unterschriften.
-- daten: JSON (Firma, Auftrag, Teilnehmer, Mängel, Erklärungen, Gewährleistung, Unterschriften – siehe bpcore/abnahme.py)
-- status: '' (alle übrigen Vorgänge), 'entwurf', 'unterschrieben' – unterschrieben ist gesperrt; Ergänzungen als Nachtrag (bezug = Abnahme)
ALTER TABLE kom_vorgang ADD COLUMN IF NOT EXISTS daten TEXT NOT NULL DEFAULT '{}';
ALTER TABLE kom_vorgang ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '';
ALTER TABLE kom_vorgang ADD COLUMN IF NOT EXISTS bezug INTEGER REFERENCES kom_vorgang(id) ON DELETE SET NULL;
