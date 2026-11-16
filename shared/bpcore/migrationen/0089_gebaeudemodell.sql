-- App „Planung“ heißt intern und extern „Gebäudemodell“ (GO 16.11.2026): Freischaltungen der Konten mitnehmen ("planung" / "-planung")
UPDATE users SET apps = REPLACE(REPLACE(apps, '"-planung"', '"-gebaeudemodell"'), '"planung"', '"gebaeudemodell"') WHERE apps LIKE '%planung%';
