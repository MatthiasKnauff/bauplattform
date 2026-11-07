-- Mail: die Liste gesperrter Empfänger („abgelehnte Adressen nicht mehr anschreiben“) ist wieder entfernt – gespeicherte Liste löschen.
DELETE FROM bp_store WHERE key='mail:ungueltig';
