-- Basic oder Profi je Rolle (Vorgabe für alle mit dieser Rolle, solange sie nicht selbst umschalten): '' = Vorgabe des Büros.
ALTER TABLE rollen ADD COLUMN IF NOT EXISTS modus TEXT NOT NULL DEFAULT '';
