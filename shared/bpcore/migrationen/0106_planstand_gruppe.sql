-- Gebäudemodell neu, Etappe 4 (GO 22.11.2026, F4-A/F5-A): der gültige Planstand ist der Arbeitsstand, die übrigen sind festgehaltene Versionen.
-- Versionen, die beim Versand von selbst entstehen (LV, Bauantrag, Bauherrenportal – modell.einfrieren), stehen im Menü eingeklappt
-- in der Gruppe „Versand“: gruppe = 'versand' (leer = von Hand bzw. frühere Planstände).
ALTER TABLE pm_planstand ADD COLUMN IF NOT EXISTS gruppe TEXT NOT NULL DEFAULT '';
