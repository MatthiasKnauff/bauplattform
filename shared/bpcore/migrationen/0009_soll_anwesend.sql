-- Bauplattform: Anwesenheit laut Bauzeitenplan.
-- Für jeden Bautagesbericht ergibt sich aus dem verknüpften Bauzeitenplan, welche Firmen an dem Tag auf der Baustelle sein sollten.
-- Hier steht nur, was der Bauleiter dazu entschieden hat: fehlt (war nicht da), nein (nicht erforderlich), da (war da, nachgetragen).
CREATE TABLE soll_anwesend(
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  firma TEXT NOT NULL,                       -- Firmenname klein geschrieben (Schlüssel)
  status TEXT NOT NULL,                      -- fehlt | nein | da
  notiz TEXT NOT NULL DEFAULT '',
  geaendert TEXT NOT NULL DEFAULT '', geaendert_von TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(report_id, firma));
