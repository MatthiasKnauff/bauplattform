-- Büro-Zuschnitt aus dem Programm in die Büroinfos (Verwaltung → Büro). Nur bestehende Installationen (Firmenname eingetragen)
-- bekommen die bisher fest eingebauten Werte als Eintrag; eine neue Installation trägt ihre eigenen ein.
-- Bundesland des Büros (Feiertage in Zeiten, Vorgabe im Bauantrag) – bisher fest Nordrhein-Westfalen.
INSERT INTO settings(key, value)
SELECT 'co_land', 'NW'
WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'office_name' AND COALESCE(value, '') <> '')
  AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'co_land');

-- Eingangsordner der AVA: leer hieß bisher „der fest eingebaute Ordner“, ab jetzt „aus“ – den bisherigen Ordner übernehmen.
UPDATE settings SET value = '\\192.168.233.88\Projekte\Bauportal_Inbox'
WHERE key = 'eingang_unc' AND COALESCE(value, '') = ''
  AND EXISTS (SELECT 1 FROM settings WHERE key = 'office_name' AND COALESCE(value, '') <> '');
INSERT INTO settings(key, value)
SELECT 'eingang_unc', '\\192.168.233.88\Projekte\Bauportal_Inbox'
WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'office_name' AND COALESCE(value, '') <> '')
  AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'eingang_unc');

-- Allplan-Bürostandard (Bauteilkataloge aus den Baudaten): ebenso bisher fest eingebaut.
UPDATE settings SET value = '\\192.168.233.88\Allplan'
WHERE key = 'allplan_unc' AND COALESCE(value, '') = ''
  AND EXISTS (SELECT 1 FROM settings WHERE key = 'office_name' AND COALESCE(value, '') <> '');
INSERT INTO settings(key, value)
SELECT 'allplan_unc', '\\192.168.233.88\Allplan'
WHERE EXISTS (SELECT 1 FROM settings WHERE key = 'office_name' AND COALESCE(value, '') <> '')
  AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'allplan_unc');
