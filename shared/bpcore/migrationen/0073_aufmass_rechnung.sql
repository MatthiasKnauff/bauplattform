-- Aufmaß je Rechnung (besprochen am 14.11.2026, Mock „Aufmaßprüfung – ganzer Bereich“): jede Aufmaßzeile gehört zu genau einer Rechnung.
-- rechnung_id leer = laufend: gehört zur offenen Abschlagsrechnung (Zuwachs seit der letzten geprüften). Beim Abschließen der Prüfung
-- bekommen die laufenden Zeilen die Rechnung; Zeilen einer Regierechnung (oder einer Rechnung mit freiem Betrag) tragen sie von Anfang an
-- und zählen nicht für den aufgelaufenen Stand der Abschlagsrechnungen.
ALTER TABLE ava_aufmass ADD COLUMN IF NOT EXISTS rechnung_id INTEGER REFERENCES ava_rechnung(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ava_aufmass_rechnung ON ava_aufmass(rechnung_id);
-- bestehende Zeilen einmalig: die erste geprüfte kumulierende Rechnung, die am Tag der Zeile oder danach geprüft wurde
UPDATE ava_aufmass a SET rechnung_id = (
  SELECT r.id FROM ava_rechnung r
   WHERE r.lv_id = a.lv_id AND r.status = 'geprueft' AND r.art IN ('abschlag', 'schluss', 'nachtrag')
     AND (r.data::jsonb ->> 'frei') IS NULL
     AND COALESCE(NULLIF(r.data::jsonb ->> 'geprueft_am', ''), substr(COALESCE(r.updated, ''), 1, 10)) >= substr(COALESCE(a.created, ''), 1, 10)
   ORDER BY r.nr LIMIT 1)
 WHERE a.rechnung_id IS NULL;
