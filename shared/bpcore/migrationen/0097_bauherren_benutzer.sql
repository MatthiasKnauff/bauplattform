-- Bauherren-Benutzerverwaltung (17.11.2026, BH A1 B1 C1 D1): Rolle je Projekt, Abweichungen je Person, Ablauf, „Abmelden (alle Geräte)“.
-- rolle: bauherr | vertretung | ansehen; rechte: {kosten, nachricht, upload, wochenmail} nur wo abweichend von der Rolle;
-- ablauf: '' = 12 Monate nach Archivierung des Projekts, 'nie' oder Datum JJJJ-MM-TT; abgelaufen: Datum, an dem der Zugang von selbst endete.
ALTER TABLE bh_konto ADD COLUMN IF NOT EXISTS rolle TEXT NOT NULL DEFAULT 'bauherr';
ALTER TABLE bh_konto ADD COLUMN IF NOT EXISTS rechte TEXT NOT NULL DEFAULT '{}';
ALTER TABLE bh_konto ADD COLUMN IF NOT EXISTS ablauf TEXT NOT NULL DEFAULT '';
ALTER TABLE bh_konto ADD COLUMN IF NOT EXISTS abgelaufen TEXT NOT NULL DEFAULT '';
ALTER TABLE bh_konto ADD COLUMN IF NOT EXISTS abmelden TEXT NOT NULL DEFAULT '';
