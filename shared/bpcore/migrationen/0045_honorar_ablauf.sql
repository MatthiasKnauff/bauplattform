-- Honorar mit Ablauf: Anfrage → Angebot → Auftrag → Vertrag → Abrechnung (status: anfrage | angebot | beauftragt | vertrag | abrechnung | abgeschlossen | abgelehnt).
-- ablauf: JSON je Stufe {anfrage: {von, datum, weg, leistung, notiz}, angebot: {gesendet, bindefrist, nachfassen}, auftrag: {datum, durch, umfang},
-- vertrag: {datum, bh, buero, ablage}, abrechnung: {notiz}, abgelehnt: {datum, grund}}.
ALTER TABLE honorar_auftrag ADD COLUMN IF NOT EXISTS ablauf TEXT NOT NULL DEFAULT '{}';
