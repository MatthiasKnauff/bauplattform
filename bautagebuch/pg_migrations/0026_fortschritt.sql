-- Arbeitsfortschritt im Tagesbericht: je Vorgang des Bauzeitenplans Prozent und Ampel (im Plan / hinterher / fertig).
-- Der Prozentwert wird zugleich in den Bauzeitenplan geschrieben; hier bleibt der Verlauf je Bericht (für Bericht und Terminrüge).
CREATE TABLE bt_fortschritt(
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  gantt_id TEXT NOT NULL,
  uid INTEGER NOT NULL,
  vorgang TEXT NOT NULL DEFAULT '',
  firma TEXT NOT NULL DEFAULT '',
  pct INTEGER,
  soll INTEGER,
  ampel TEXT NOT NULL DEFAULT '',          -- plan | hinterher | fertig
  verzug REAL,
  geaendert TEXT NOT NULL DEFAULT '', geaendert_von TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(report_id, gantt_id, uid));
CREATE INDEX bt_fortschritt_vorgang ON bt_fortschritt(gantt_id, uid);
