'use strict';
/* =====================================================================
   Leistungskatalog für den Planungsassistenten
   ---------------------------------------------------------------------
   Felder je Leistung:
     id   eindeutiger Schlüssel          ph   Phase (siehe phases)
     n    Name                           gw   Gewerk (bestimmt die Farbe)
     din  VOB/C – ATV DIN 18xxx          sc   'bau' = einmal je Gebäude,
                                              'we'  = je Einheit/Wohnung
     d    Dauer in Arbeitstagen bezogen auf ref (bau: Gebäude 140 m²,
          we: Einheit 80 m²); wird mit der Fläche skaliert
     fix  Dauer nicht skalieren          ms   Meilenstein
     a    Vorgänger (Ende-Anfang). Ist ein Vorgänger nicht gewählt, wird
          über dessen Vorgänger überbrückt – außer er hat nb (no bridge).
     req  setzt diese Leistung voraus (wird mit an-/abgewählt)
   Profile: rec = empfohlen (vorausgewählt), opt = optional angeboten,
            ovr = Abweichungen (Name, Dauer, Vorgänger) für diesen Typ.
   Die Dauern sind Richtwerte und sollen im Plan angepasst werden.
   ===================================================================== */
window.CATALOG = (() => {
  const phases = [
    { k: 'planung', n: 'Ingenieur:in / Planung' },   // Architekt, Bauleitung, Statiker, Vermesser
    { k: 'vorb', n: 'Vorbereitung' },
    { k: 'abbruch', n: 'Abbruch und Rückbau' },
    { k: 'erd', n: 'Erd- und Gründungsarbeiten' },
    { k: 'rohbau', n: 'Rohbau' },
    { k: 'huelle', n: 'Gebäudehülle (Gerüst, Dach, Fenster, Fassade)' },
    { k: 'tga_roh', n: 'Haustechnik Rohinstallation' },
    { k: 'ausbau', n: 'Innenausbau' },
    { k: 'tga_fein', n: 'Haustechnik Feininstallation' },
    { k: 'aussen', n: 'Außenanlagen' },
    { k: 'abschluss', n: 'Abschluss' },
  ];
  const TGA_START = ['dicht', 'mauer', 'holz_mont', 'durchbr', 'wand_ab', 'entk', 'schutz', 'be'];
  const items = [
    // Vorbereitung
    // Ingenieur / Planung
    { id: 'baugen', ph: 'planung', n: 'Baugenehmigung erteilt', gw: 'Architekt', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'planfrei', ph: 'planung', n: 'Ausführungsplanung freigegeben', gw: 'Architekt', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'statik', ph: 'planung', n: 'Statik / Tragwerksplanung freigegeben', gw: 'Statiker', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'pruefing', ph: 'planung', n: 'Bewehrungsabnahme (Prüfingenieur)', gw: 'Statiker', sc: 'bau', ms: 1, a: ['grund'] },
    { id: 'einmess', ph: 'planung', n: 'Gebäudeeinmessung (Vermesser:in)', gw: 'Vermessung', sc: 'bau', d: 1, fix: 1, a: ['mauer', 'holz_mont'] },
    { id: 'abn', ph: 'planung', n: 'Abnahme mit der Bauherr:in (Bauleitung)', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['reinig'] },
    // Vorbereitung
    { id: 'be', ph: 'vorb', n: 'Baustelleneinrichtung', gw: 'Bauleitung', sc: 'bau', d: 2, fix: 1, a: ['start', 'baugen', 'planfrei'] },
    { id: 'schutz', ph: 'vorb', n: 'Schutzmaßnahmen, Staubschutzwände', gw: 'Bauleitung', sc: 'we', d: 1, fix: 1, a: ['be'] },
    { id: 'verm', ph: 'planung', n: 'Vermessung / Schnurgerüst', gw: 'Vermessung', sc: 'bau', d: 1, fix: 1, nb: 1, a: ['be'] },
    // Abbruch
    { id: 'schad', m: 'entk', ph: 'abbruch', n: 'Schadstoffsanierung (Asbest, KMF, PAK)', gw: 'Abbruch', din: '18459', sc: 'we', d: 3, a: ['schutz', 'be'] },
    { id: 'entk', ph: 'abbruch', n: 'Entkernung (Beläge, Bekleidungen, Altinstallation)', gw: 'Abbruch', din: '18459', sc: 'we', d: 4, a: ['schad', 'schutz', 'be'] },
    { id: 'wand_ab', ph: 'abbruch', n: 'Wände abbrechen', gw: 'Abbruch', din: '18459', sc: 'we', d: 3, a: ['entk', 'schad', 'schutz', 'be'] },
    { id: 'dach_ab', ph: 'abbruch', n: 'Dach abtragen, Bestand für die Aufstockung vorbereiten', gw: 'Abbruch', din: '18459', sc: 'bau', d: 4, ch: 'erweiterung', a: ['geruest', 'statik', 'schutz', 'be'] },
    { id: 'notdach', m: 'dach_ab', ph: 'abbruch', n: 'Notdach / Witterungsschutz für den Bestand', gw: 'Zimmerer', din: '18334', sc: 'bau', d: 1, fix: 1, ch: 'erweiterung', a: ['dach_ab'] },
    { id: 'durchbr', m: 'wand_ab', ph: 'abbruch', n: 'Durchbrüche herstellen und abfangen', gw: 'Rohbau', din: '18330', sc: 'we', d: 4, a: ['wand_ab', 'entk', 'statik'] },
    // Erd- und Gründungsarbeiten
    { id: 'aushub', ph: 'erd', n: 'Baugrube ausheben', gw: 'Erdbau', din: '18300', sc: 'bau', d: 4, nb: 1, a: ['verm', 'be'] },
    { id: 'erder', m: 'grund', ph: 'erd', n: 'Fundamenterder / Ringerder verlegen', gw: 'Elektro', din: '18384', sc: 'bau', d: 1, fix: 1, a: ['aushub'] },
    { id: 'erdsonde', ph: 'erd', n: 'Erdwärmesonden bohren', gw: 'Spezialtiefbau', din: '18301', sc: 'bau', d: 4, fix: 1, ch: 'heizung', a: ['be'] },
    { id: 'grundl', ph: 'erd', n: 'Grundleitungen / Entwässerung', gw: 'Sanitär', din: '18381', sc: 'bau', d: 3, nb: 1, a: ['aushub'] },
    { id: 'unterfang', ph: 'erd', n: 'Bestandsfundamente unterfangen / Baugrube am Bestand sichern (DIN 4123)', gw: 'Rohbau', din: '18331', sc: 'bau', d: 5, ch: 'anbaukeller', a: ['aushub', 'statik'] },
    { id: 'grund', ph: 'erd', n: 'Fundamente und Bodenplatte', gw: 'Rohbau', din: '18331', sc: 'bau', d: 6, nb: 1, a: ['erder', 'grundl', 'aushub', 'statik', 'unterfang'] },
    { id: 'keller', ph: 'erd', n: 'Kellergeschoss (Wände, Decke)', gw: 'Rohbau', din: '18330', sc: 'bau', d: 15, nb: 1, a: ['grund'] },
    { id: 'keller_abd', m: 'keller', ph: 'erd', n: 'Abdichtung und Perimeterdämmung', gw: 'Abdichtung', din: '18336', sc: 'bau', d: 3, nb: 1, req: 'keller', a: ['keller'] },
    { id: 'verfuell', ph: 'erd', n: 'Arbeitsraum verfüllen', gw: 'Erdbau', din: '18300', sc: 'bau', d: 2, nb: 1, req: 'keller', a: ['keller_abd', 'keller'] },
    // Bestandskeller (Umbau)
    { id: 'bk_frei', ph: 'erd', n: 'Kelleraußenwände freilegen (Bestand)', gw: 'Erdbau', din: '18300', sc: 'bau', d: 3, ch: 'bestkeller', a: ['schutz', 'be'] },
    { id: 'bk_abd', m: 'bk_frei', ph: 'erd', n: 'Abdichtung und Perimeterdämmung Bestandskeller', gw: 'Abdichtung', din: '18336', sc: 'bau', d: 4, ch: 'bestkeller', a: ['bk_frei'] },
    { id: 'bk_drain', m: 'bk_frei', ph: 'erd', n: 'Drainage / Entwässerung am Bestandskeller', gw: 'Erdbau', din: '18308', sc: 'bau', d: 2, ch: 'bestkeller', a: ['bk_abd'] },
    { id: 'bk_verf', m: 'bk_frei', ph: 'erd', n: 'Arbeitsraum verfüllen (Bestand)', gw: 'Erdbau', din: '18300', sc: 'bau', d: 2, ch: 'bestkeller', a: ['bk_drain', 'bk_abd'] },
    { id: 'bk_hsp', ph: 'erd', n: 'Horizontalsperre / Innenabdichtung Keller (Injektion, Sanierputz)', gw: 'Abdichtung', din: '18336', sc: 'bau', d: 5, ch: 'bestkeller', a: ['entk', 'schutz', 'be'] },
    { id: 'bk_tr', m: 'bk_hsp', ph: 'erd', n: 'Kellerwände trocknen lassen (Messung vor dem Weiterbau)', gw: 'Abdichtung', sc: 'bau', d: 15, fix: 1, ch: 'bestkeller', a: ['bk_hsp', 'bk_verf'] },
    { id: 'bk_ausbau', ph: 'ausbau', n: 'Keller zu Wohn-/Nutzräumen ausbauen (Dämmung, Lichtschächte)', gw: 'Rohbau', din: '18330', sc: 'bau', d: 6, ch: 'bestkeller', a: ['bk_tr', 'bk_verf', 'bk_hsp', 'entk', 'be'] },
    // Rohbau
    { id: 'mauer', ph: 'rohbau', n: 'Rohbau Geschosse (Mauerwerk, Decken)', gw: 'Rohbau', din: '18330 / 18331', sc: 'bau', d: 25, nb: 1, a: ['keller', 'grund'] },
    { id: 'abbund', ph: 'rohbau', n: 'Vorfertigung Holzbauelemente (Werk)', gw: 'Zimmerer', din: '18334', sc: 'bau', d: 20, nb: 1, ch: 'tragwerk', a: ['statik', 'be'] },
    { id: 'holz_mont', ph: 'rohbau', n: 'Montage Holzrahmenbau (Wände, Decken)', gw: 'Zimmerer', din: '18334', sc: 'bau', d: 6, nb: 1, ch: 'tragwerk', a: ['abbund', 'keller', 'grund'] },
    { id: 'anschluss', ph: 'rohbau', n: 'Anschluss an den Bestand (Wandöffnung, Abfangung, Bauwerksfuge)', gw: 'Rohbau', din: '18330', sc: 'bau', d: 4, ch: 'erweiterung', a: ['mauer', 'holz_mont', 'durchbr', 'statik'] },
    { id: 'treppe', ph: 'rohbau', n: 'Treppen', gw: 'Rohbau', din: '18331', sc: 'bau', d: 2, nb: 1, a: ['mauer', 'holz_mont'] },
    { id: 'schornstein', m: 'mauer', ph: 'rohbau', n: 'Schornstein / Abgasanlage', gw: 'Rohbau', din: '18330', sc: 'bau', d: 2, fix: 1, a: ['mauer', 'holz_mont'] },
    { id: 'balkon', ph: 'rohbau', n: 'Balkone / Loggien (Platten, Konsolen)', gw: 'Rohbau', din: '18331', sc: 'bau', d: 4, a: ['mauer', 'holz_mont'] },
    // Gebäudehülle
    { id: 'geruest', ph: 'huelle', n: 'Gerüst stellen', gw: 'Gerüst', din: '18451', sc: 'bau', d: 2, a: ['mauer', 'holz_mont', 'be'] },
    { id: 'zimmer', ph: 'huelle', n: 'Dachstuhl / Zimmererarbeiten', gw: 'Zimmerer', din: '18334', sc: 'bau', d: 5, a: ['mauer', 'holz_mont', 'geruest', 'be'] },
    { id: 'dachfenster', m: 'dach_deck', ph: 'huelle', n: 'Dachflächenfenster einbauen', gw: 'Dach', din: '18338', sc: 'bau', d: 2, fix: 1, a: ['zimmer', 'geruest'] },
    { id: 'dach_deck', ph: 'huelle', n: 'Dacheindeckung', gw: 'Dach', din: '18338', sc: 'bau', d: 8, a: ['schornstein', 'dachfenster', 'zimmer', 'geruest', 'be'] },
    { id: 'dampfsp', m: 'dach_deck', ph: 'huelle', n: 'Dampfsperre', gw: 'Dach', din: '18336', sc: 'bau', d: 1, a: ['zimmer', 'mauer', 'holz_mont', 'geruest', 'be'] },
    { id: 'dach_daemm', m: 'dach_deck', ph: 'huelle', n: 'Dachdämmung', gw: 'Dach', din: '18338', sc: 'bau', d: 4, a: ['dach_deck', 'zimmer', 'geruest', 'be'] },
    { id: 'dach_zub', m: 'dach_deck', ph: 'huelle', n: 'Dachzubehör (Schneefang, Laufroste, Sicherheitshaken)', gw: 'Dach', din: '18338', sc: 'bau', d: 1, fix: 1, a: ['dach_deck'] },
    { id: 'gruendach', ph: 'huelle', n: 'Dachbegrünung (extensiv)', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 3, ch: 'dachdeckung', a: ['dach_deck'] },
    { id: 'klempner', m: 'dach_deck', ph: 'huelle', n: 'Klempnerarbeiten (Rinnen, Fallrohre)', gw: 'Klempner', din: '18339', sc: 'bau', d: 2, a: ['dach_deck'] },
    { id: 'blitzschutz', m: 'el_roh', ph: 'huelle', n: 'Blitzschutzanlage', gw: 'Elektro', din: '18384', sc: 'bau', d: 1, fix: 1, a: ['dach_deck', 'klempner'] },
    { id: 'pv', ph: 'huelle', n: 'Photovoltaikanlage montieren', gw: 'Elektro', din: '18382', sc: 'bau', d: 3, ch: 'pv', a: ['dach_deck', 'klempner', 'geruest'] },
    { id: 'fenster_neu', ph: 'huelle', n: 'Fenster und Außentüren einbauen', gw: 'Fenster', din: '18355', sc: 'bau', d: 4, nb: 1, a: ['mauer', 'holz_mont'] },
    { id: 'fenster', ph: 'huelle', n: 'Fenster erneuern', gw: 'Fenster', din: '18355', sc: 'we', d: 3, a: ['wand_ab', 'entk', 'schutz', 'be'] },
    { id: 'sonnenschutz', m: 'fenster_neu', ph: 'huelle', n: 'Rollläden / Raffstores (Sonnenschutz)', gw: 'Rollladen', din: '18358', sc: 'bau', d: 3, a: ['fenster_neu', 'fenster'] },
    { id: 'fensterbank_a', m: 'fenster_neu', ph: 'huelle', n: 'Fensterbänke außen', gw: 'Klempner', din: '18339 / 18360', sc: 'bau', d: 2, a: ['wdvs', 'fenster_neu', 'fenster', 'sonnenschutz'] },
    { id: 'dicht', ph: 'huelle', n: 'Gebäude dicht (Dach und Fenster)', gw: 'Bauleitung', sc: 'bau', ms: 1, nb: 1, a: ['dach_deck', 'klempner', 'fenster_neu'] },
    { id: 'wdvs', ph: 'huelle', n: 'Fassadendämmung (WDVS)', gw: 'Fassade', din: '18345', sc: 'bau', d: 12, a: ['fenster_neu', 'fenster', 'klempner', 'geruest'] },
    { id: 'klinker', ph: 'huelle', n: 'Verblendmauerwerk / Klinker (zweischalig)', gw: 'Rohbau', din: '18330', sc: 'bau', d: 15, ch: 'fassade', a: ['fenster_neu', 'fenster', 'geruest'] },
    { id: 'vhf', ph: 'huelle', n: 'Vorgehängte hinterlüftete Fassade', gw: 'Fassade', din: '18351', sc: 'bau', d: 12, ch: 'fassade', a: ['fenster_neu', 'fenster', 'klempner', 'geruest'] },
    { id: 'holzfassade', ph: 'huelle', n: 'Holzfassade (Lattung, Schalung)', gw: 'Zimmerer', din: '18334', sc: 'bau', d: 10, ch: 'fassade', a: ['fenster_neu', 'fenster', 'klempner', 'geruest'] },
    { id: 'aussenputz', ph: 'huelle', n: 'Außenputz / Fassadenanstrich', gw: 'Fassade', din: '18350 / 18363', sc: 'bau', d: 6, a: ['fensterbank_a', 'wdvs', 'fenster_neu', 'fenster', 'geruest'] },
    { id: 'vordach', m: 'aussenputz', ph: 'huelle', n: 'Vordach / Überdachung Eingang', gw: 'Metallbau', din: '18360', sc: 'bau', d: 1, fix: 1, a: ['aussenputz', 'klinker', 'vhf', 'holzfassade'] },
    { id: 'gel_aus', m: 'aussenputz', ph: 'huelle', n: 'Balkon- und Absturzgeländer außen', gw: 'Metallbau', din: '18360', sc: 'bau', d: 3, a: ['balkon', 'aussenputz', 'klinker', 'vhf', 'holzfassade'] },
    { id: 'geruest_ab', m: 'geruest', ph: 'huelle', n: 'Gerüst abbauen', gw: 'Gerüst', din: '18451', sc: 'bau', d: 1, fix: 1, req: 'geruest', a: ['gel_aus', 'vordach', 'fensterbank_a', 'sonnenschutz', 'dach_zub', 'blitzschutz', 'aussenputz', 'wdvs', 'klinker', 'vhf', 'holzfassade', 'pv', 'gruendach', 'klempner', 'dach_daemm', 'dach_deck', 'geruest'] },
    // Haustechnik roh
    { id: 'hak', ph: 'tga_roh', n: 'Hausanschlüsse (Strom, Wasser, Telekom)', gw: 'Elektro', sc: 'bau', d: 2, fix: 1, nb: 1, a: ['dicht', 'mauer', 'holz_mont'] },
    { id: 'waermeerz', ph: 'tga_roh', n: 'Wärmeerzeuger (Wärmepumpe / Kessel)', gw: 'Heizung', din: '18380', sc: 'bau', d: 4, a: ['dicht', 'hak', 'entk', 'be'] },
    { id: 'san_roh', ph: 'tga_roh', n: 'Sanitär-Rohinstallation', gw: 'Sanitär', din: '18381', sc: 'we', d: 5, a: TGA_START },
    { id: 'hz_roh', ph: 'tga_roh', n: 'Heizung-Rohinstallation', gw: 'Heizung', din: '18380', sc: 'we', d: 4, a: TGA_START },
    { id: 'el_roh', ph: 'tga_roh', n: 'Elektro-Rohinstallation', gw: 'Elektro', din: '18382', sc: 'we', d: 5, a: TGA_START },
    { id: 'lueft', ph: 'tga_roh', n: 'Lüftung Rohmontage', gw: 'Lüftung', din: '18379', sc: 'we', d: 3, a: TGA_START },
    // Innenausbau
    { id: 'trocken', ph: 'ausbau', n: 'Trockenbau (Wände, Decken, Vorsatzschalen)', gw: 'Trockenbau', din: '18340', sc: 'we', d: 6, a: ['san_roh', 'hz_roh', 'el_roh', 'lueft', 'dach_daemm', 'fenster', 'dicht', 'durchbr', 'wand_ab', 'entk', 'be'] },
    { id: 'decke_abh', m: 'trocken', ph: 'ausbau', n: 'Abgehängte Decken / Deckenbekleidung', gw: 'Trockenbau', din: '18340', sc: 'we', d: 3, a: ['san_roh', 'hz_roh', 'el_roh', 'lueft', 'trocken', 'putz', 'dicht', 'be'] },
    { id: 'putz', ph: 'ausbau', n: 'Innenputz', gw: 'Putz', din: '18350', sc: 'we', d: 6, a: ['san_roh', 'hz_roh', 'el_roh', 'lueft', 'fenster', 'dicht', 'durchbr', 'wand_ab', 'entk', 'be'] },
    { id: 'fensterbank_i', m: 'putz', ph: 'ausbau', n: 'Fensterbänke innen', gw: 'Naturstein', din: '18332', sc: 'we', d: 1, a: ['putz', 'trocken'] },
    { id: 'fbh', m: 'hz_roh', ph: 'ausbau', n: 'Fußbodenheizung verlegen (Dämmung, Heizrohre)', gw: 'Heizung', din: '18380', sc: 'we', d: 2, ch: 'waermevert', a: ['putz', 'trocken', 'hz_roh'] },
    { id: 'estrich', ph: 'ausbau', n: 'Estrich einbringen', gw: 'Estrich', din: '18353', sc: 'we', d: 2, a: ['fbh', 'putz', 'trocken', 'hz_roh'] },
    { id: 'estr_tr', ph: 'ausbau', n: 'Estrich trocknen (Belegreife, CM-Messung)', gw: 'Estrich', sc: 'we', d: 20, fix: 1, req: 'estrich', a: ['estrich'] },
    { id: 'fliesen_vb', m: 'fliesen', ph: 'ausbau', n: 'Wände für Fliesen vorbereiten (Abdichtung, Grundierung)', gw: 'Fliesen', din: '18352', sc: 'we', d: 3, a: ['estrich', 'putz', 'trocken'] },
    { id: 'fliesen', ph: 'ausbau', n: 'Fliesenarbeiten', gw: 'Fliesen', din: '18352', sc: 'we', d: 6, a: ['estr_tr', 'fliesen_vb', 'estrich', 'putz', 'trocken'] },
    { id: 'spachtel_wd', m: 'maler', ph: 'ausbau', n: 'Wände und Decken spachteln, schleifen (Q2/Q3)', gw: 'Maler', din: '18363', sc: 'we', d: 3, a: ['decke_abh', 'fensterbank_i', 'putz', 'trocken', 'san_roh', 'el_roh'] },
    { id: 'tapete', m: 'maler', ph: 'ausbau', n: 'Tapezieren (Vlies, Raufaser)', gw: 'Maler', din: '18366', sc: 'we', d: 2, a: ['spachtel_wd'] },
    { id: 'maler', ph: 'ausbau', n: 'Wände und Decken streichen', gw: 'Maler', din: '18363', sc: 'we', d: 4, a: ['tapete', 'spachtel_wd', 'decke_abh', 'putz', 'trocken', 'san_roh', 'el_roh'] },
    { id: 'tischler', ph: 'ausbau', n: 'Innentüren und Zargen', gw: 'Tischler', din: '18355', sc: 'we', d: 2, a: ['maler'] },
    { id: 'boden_vorb', m: 'boden', ph: 'ausbau', n: 'Untergrund vorbereiten (Estrich schleifen, grundieren, spachteln)', gw: 'Bodenbelag', din: '18365', sc: 'we', d: 1, a: ['estr_tr', 'estrich', 'maler'] },
    { id: 'parkett_alt', m: 'boden', ph: 'ausbau', n: 'Altparkett / Dielen aufarbeiten (schleifen, versiegeln)', gw: 'Bodenbelag', din: '18356', sc: 'we', d: 3, a: ['maler'] },
    { id: 'boden', ph: 'ausbau', n: 'Bodenbeläge (Parkett, Vinyl)', gw: 'Bodenbelag', din: '18356 / 18365', sc: 'we', d: 4, a: ['boden_vorb', 'estr_tr', 'maler', 'estrich'] },
    { id: 'parkett_ob', m: 'boden', ph: 'ausbau', n: 'Parkett schleifen und ölen / versiegeln', gw: 'Bodenbelag', din: '18356', sc: 'we', d: 2, a: ['boden'] },
    { id: 'sockel', m: 'boden', ph: 'ausbau', n: 'Sockelleisten', gw: 'Bodenbelag', din: '18356', sc: 'we', d: 1, req: 'boden', a: ['parkett_ob', 'boden'] },
    { id: 'treppe_belag', m: 'boden', ph: 'ausbau', n: 'Treppenbelag / Stufen', gw: 'Bodenbelag', din: '18356', sc: 'bau', d: 2, a: ['treppe', 'estr_tr', 'maler'] },
    { id: 'gelaender', m: 'tischler', ph: 'ausbau', n: 'Treppengeländer und Handläufe', gw: 'Metallbau', din: '18360', sc: 'bau', d: 2, a: ['treppe_belag', 'treppe', 'maler'] },
    { id: 'kueche', m: 'tischler', ph: 'ausbau', n: 'Küche montieren', gw: 'Küche', din: '18355', sc: 'we', d: 2, a: ['boden', 'fliesen', 'maler'] },
    { id: 'einbau', m: 'tischler', ph: 'ausbau', n: 'Einbauschränke / Möbel', gw: 'Tischler', din: '18355', sc: 'we', d: 2, a: ['boden', 'maler'] },
    // Haustechnik fein
    { id: 'aufzug', ph: 'tga_fein', n: 'Aufzug montieren', gw: 'Aufzug', din: '18385', sc: 'bau', d: 10, a: ['mauer', 'holz_mont', 'dicht', 'be'] },
    { id: 'san_fein', m: 'san_roh', ph: 'tga_fein', n: 'Sanitär-Feininstallation (Objekte, Armaturen)', gw: 'Sanitär', din: '18381', sc: 'we', d: 3, a: ['fliesen', 'maler', 'san_roh'] },
    { id: 'bad_moebel', m: 'san_fein', ph: 'tga_fein', n: 'Badmöbel, Spiegelschrank, Waschtischunterbau', gw: 'Sanitär', din: '18381', sc: 'we', d: 1, a: ['san_fein', 'fliesen', 'maler'] },
    { id: 'dusche_glas', m: 'san_fein', ph: 'tga_fein', n: 'Duschabtrennung / Glasarbeiten', gw: 'Glaser', din: '18361', sc: 'we', d: 1, a: ['san_fein', 'fliesen'] },
    { id: 'bad_acc', m: 'san_fein', ph: 'tga_fein', n: 'Bad-Accessoires (Halter, Haken, Spiegel)', gw: 'Sanitär', din: '18381', sc: 'we', d: 1, a: ['bad_moebel', 'san_fein', 'maler'] },
    { id: 'silikon', m: 'fliesen', ph: 'tga_fein', n: 'Wartungsfugen (Silikon) Bad und Küche', gw: 'Fliesen', din: '18352', sc: 'we', d: 1, a: ['dusche_glas', 'bad_moebel', 'san_fein', 'kueche', 'fliesen'] },
    { id: 'hz_fein', m: 'hz_roh', ph: 'tga_fein', n: 'Heizkörper, Inbetriebnahme Heizung', gw: 'Heizung', din: '18380', sc: 'we', d: 2, a: ['maler', 'waermeerz', 'hz_roh'] },
    { id: 'el_fein', m: 'el_roh', ph: 'tga_fein', n: 'Elektro-Feininstallation (Schalter, Steckdosen, Leuchten)', gw: 'Elektro', din: '18382', sc: 'we', d: 2, a: ['maler', 'el_roh'] },
    { id: 'lueft_fein', m: 'lueft', ph: 'tga_fein', n: 'Lüftung Feinmontage, Einregulierung', gw: 'Lüftung', din: '18379', sc: 'we', d: 1, req: 'lueft', a: ['maler', 'lueft'] },
    // Außenanlagen
    { id: 'aussenanl', ph: 'aussen', n: 'Geländemodellierung, Oberboden, Entwässerung außen', gw: 'Außenanlagen', din: '18318', sc: 'bau', d: 3, a: ['geruest_ab', 'verfuell', 'aussenputz', 'klinker', 'vhf', 'holzfassade', 'be'] },
    { id: 'zufahrt', m: 'aussenanl', ph: 'aussen', n: 'Zuwege und Zufahrt pflastern', gw: 'Außenanlagen', din: '18318', sc: 'bau', d: 4, a: ['aussenanl'] },
    { id: 'terrasse', m: 'aussenanl', ph: 'aussen', n: 'Terrasse (Unterbau, Belag)', gw: 'Außenanlagen', din: '18318', sc: 'bau', d: 3, a: ['aussenanl'] },
    { id: 'markise', m: 'aussenanl', ph: 'aussen', n: 'Markise / Terrassenüberdachung', gw: 'Rollladen', din: '18358', sc: 'bau', d: 1, fix: 1, a: ['terrasse', 'aussenputz', 'klinker', 'vhf', 'holzfassade'] },
    { id: 'garage', m: 'aussenanl', ph: 'aussen', n: 'Garage / Carport', gw: 'Rohbau', din: '18330', sc: 'bau', d: 3, fix: 1, a: ['aussenanl'] },
    { id: 'zaun', m: 'aussenanl', ph: 'aussen', n: 'Einfriedung, Zaun und Tor', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 3, a: ['aussenanl'] },
    { id: 'briefk', m: 'el_fein', ph: 'aussen', n: 'Briefkasten, Hausnummer, Klingel-/Sprechanlage', gw: 'Elektro', din: '18382', sc: 'bau', d: 1, fix: 1, a: ['aussenputz', 'klinker', 'vhf', 'holzfassade', 'el_fein'] },
    { id: 'aussenlicht', m: 'el_fein', ph: 'aussen', n: 'Außenbeleuchtung', gw: 'Elektro', din: '18382', sc: 'bau', d: 1, fix: 1, a: ['zufahrt', 'terrasse', 'el_fein'] },
    { id: 'garten', ph: 'aussen', n: 'Garten, Begrünung', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 4, a: ['zufahrt', 'terrasse', 'aussenanl', 'geruest_ab', 'be'] },
    // Abschluss
    { id: 'reinig', ph: 'abschluss', n: 'Bauendreinigung', gw: 'Reinigung', sc: 'we', d: 1, a: ['silikon', 'bad_acc', 'bad_moebel', 'dusche_glas', 'kueche', 'einbau', 'gelaender', 'treppe_belag', 'parkett_ob', 'parkett_alt', 'san_fein', 'el_fein', 'hz_fein', 'lueft_fein', 'sockel', 'boden', 'tischler', 'fliesen', 'maler'] },
    // ---- Erweiterung 15.11.2026: weitere gebräuchliche Leistungen (optional angeboten, Dauer = Richtwert) ----
    // Ingenieur:in / Planung
    { id: 'bauantr', ph: 'planung', n: 'Bauantrag eingereicht', gw: 'Architekt', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'baugrund', ph: 'planung', n: 'Baugrunduntersuchung / Bodengutachten', gw: 'Baugrund', sc: 'bau', d: 5, a: ['start'] },
    { id: 'sige', ph: 'planung', n: 'SiGe-Plan und Koordinator:in bestellt', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'geg', ph: 'planung', n: 'Wärmeschutz- / Energienachweis (GModG) aufgestellt', gw: 'Energieberatung', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'brandkonz', ph: 'planung', n: 'Brandschutzkonzept freigegeben', gw: 'Brandschutz', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'pruefstat', ph: 'planung', n: 'Prüfstatik freigegeben (Prüfingenieur:in)', gw: 'Statiker', sc: 'bau', ms: 1, a: ['statik'] },
    { id: 'werkpl', ph: 'planung', n: 'Werk- und Montageplanung der Firmen freigegeben', gw: 'Architekt', sc: 'bau', ms: 1, a: ['planfrei'] },
    { id: 'beweis', ph: 'planung', n: 'Beweissicherung Nachbarbebauung', gw: 'Sachverständige', sc: 'bau', d: 2, a: ['start'] },
    { id: 'sohle', ph: 'planung', n: 'Sohlabnahme Baugrube (Gutachter:in)', gw: 'Baugrund', sc: 'bau', ms: 1, a: ['aushub'] },
    { id: 'richtfest', ph: 'planung', n: 'Richtfest', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['zimmer', 'mauer', 'holz_mont'] },
    { id: 'rohabn', ph: 'planung', n: 'Rohbauabnahme (Bauaufsicht)', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['dicht'] },
    { id: 'blower', ph: 'planung', n: 'Luftdichtheitsmessung (Blower-Door)', gw: 'Energieberatung', sc: 'bau', d: 1, a: ['trocken', 'putz'] },
    { id: 'schlussabn', ph: 'planung', n: 'Schlussabnahme (Bauaufsicht, Brandschutz)', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['reinig'] },
    { id: 'energieausw', ph: 'planung', n: 'Energieausweis ausgestellt', gw: 'Energieberatung', sc: 'bau', ms: 1, a: ['reinig'] },
    // Vorbereitung
    { id: 'bauzaun', ph: 'vorb', n: 'Bauzaun, Beschilderung, Baustellensicherung', gw: 'Bauleitung', sc: 'bau', d: 1, a: ['start'] },
    { id: 'baustrom', ph: 'vorb', n: 'Baustrom und Bauwasser', gw: 'Elektro', din: '18382', sc: 'bau', d: 1, a: ['start'] },
    { id: 'kran', ph: 'vorb', n: 'Baukran stellen', gw: 'Rohbau', sc: 'bau', d: 2, a: ['be'] },
    { id: 'baustr', ph: 'vorb', n: 'Baustraße und Lagerflächen', gw: 'Erdbau', din: '18315', sc: 'bau', d: 3, a: ['be'] },
    { id: 'container', ph: 'vorb', n: 'Bau- und Sanitärcontainer', gw: 'Bauleitung', sc: 'bau', d: 1, a: ['start'] },
    { id: 'verkehr', ph: 'vorb', n: 'Verkehrssicherung / Sondernutzung öffentlicher Fläche', gw: 'Bauleitung', sc: 'bau', d: 1, a: ['start'] },
    { id: 'baumschutz', ph: 'vorb', n: 'Baumschutz (DIN 18920)', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 1, a: ['start'] },
    { id: 'kampfm', ph: 'vorb', n: 'Kampfmittelsondierung', gw: 'Spezialtiefbau', sc: 'bau', d: 3, a: ['start'] },
    // Abbruch
    { id: 'abbruch_ges', ph: 'abbruch', n: 'Gebäude komplett abbrechen', gw: 'Abbruch', din: '18459', sc: 'bau', d: 10, a: ['be', 'schad'] },
    { id: 'fenster_ab', ph: 'abbruch', n: 'Fenster und Türen ausbauen', gw: 'Abbruch', din: '18459', sc: 'we', d: 2, a: ['be', 'entk'] },
    { id: 'estrich_ab', ph: 'abbruch', n: 'Estrich und Bodenaufbau entfernen', gw: 'Abbruch', din: '18459', sc: 'we', d: 2, a: ['entk'] },
    { id: 'putz_ab', ph: 'abbruch', n: 'Putz abschlagen', gw: 'Abbruch', din: '18459', sc: 'we', d: 3, a: ['entk'] },
    { id: 'tga_ab', ph: 'abbruch', n: 'Alte Haustechnik zurückbauen (Leitungen, Heizkörper, Kessel)', gw: 'Abbruch', din: '18459', sc: 'we', d: 3, a: ['entk'] },
    { id: 'schorn_ab', ph: 'abbruch', n: 'Schornstein abbrechen', gw: 'Abbruch', din: '18459', sc: 'bau', d: 2, a: ['be'] },
    { id: 'entsorg', ph: 'abbruch', n: 'Entsorgung, Containerdienst, Entsorgungsnachweise', gw: 'Abbruch', din: '18459', sc: 'bau', d: 2, a: ['entk', 'wand_ab'] },
    { id: 'roden', ph: 'abbruch', n: 'Bäume fällen, Gelände roden', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 2, a: ['start'] },
    // Erd- und Gründung
    { id: 'oberboden', ph: 'erd', n: 'Oberboden abtragen und lagern', gw: 'Erdbau', din: '18300', sc: 'bau', d: 2, a: ['be', 'verm'] },
    { id: 'wasserh', ph: 'erd', n: 'Wasserhaltung', gw: 'Erdbau', din: '18305', sc: 'bau', d: 10, a: ['aushub'] },
    { id: 'verbau', ph: 'erd', n: 'Baugrubenverbau (Spundwand, Trägerbohlwand)', gw: 'Spezialtiefbau', din: '18303', sc: 'bau', d: 8, a: ['verm', 'be'] },
    { id: 'pfahl', ph: 'erd', n: 'Pfahlgründung', gw: 'Spezialtiefbau', din: '18301', sc: 'bau', d: 8, a: ['verm', 'be'] },
    { id: 'bodenaust', ph: 'erd', n: 'Bodenaustausch / Bodenverbesserung', gw: 'Erdbau', din: '18300', sc: 'bau', d: 4, a: ['aushub'] },
    { id: 'sauber', ph: 'erd', n: 'Sauberkeitsschicht, Dämmung unter der Bodenplatte', gw: 'Rohbau', din: '18331', sc: 'bau', d: 2, a: ['grundl', 'aushub'] },
    { id: 'wu', ph: 'erd', n: 'Weiße Wanne (WU-Beton, Fugenbänder)', gw: 'Rohbau', din: '18331', sc: 'bau', d: 10, a: ['grund'] },
    { id: 'kanal', ph: 'erd', n: 'Kanalanschluss / Hausanschluss Abwasser', gw: 'Tiefbau', din: '18306', sc: 'bau', d: 3, a: ['grundl'] },
    { id: 'zisterne', ph: 'erd', n: 'Regenwasserzisterne / Versickerung', gw: 'Erdbau', din: '18306', sc: 'bau', d: 3, a: ['verfuell'] },
    { id: 'lichtsch', ph: 'erd', n: 'Lichtschächte setzen', gw: 'Rohbau', din: '18330', sc: 'bau', d: 2, a: ['keller'] },
    // Rohbau
    { id: 'innenw', ph: 'rohbau', n: 'Nichttragende Innenwände mauern', gw: 'Rohbau', din: '18330', sc: 'bau', d: 6, a: ['mauer'] },
    { id: 'stuetzen', ph: 'rohbau', n: 'Stützen und Unterzüge (Stahlbeton)', gw: 'Rohbau', din: '18331', sc: 'bau', d: 5, a: ['grund'] },
    { id: 'fertigt', ph: 'rohbau', n: 'Betonfertigteile montieren (Decken, Treppen, Balkone)', gw: 'Rohbau', din: '18331', sc: 'bau', d: 4, a: ['mauer'] },
    { id: 'stahlbau', ph: 'rohbau', n: 'Stahlbau (Träger, Stützen, Abfangungen)', gw: 'Stahlbau', din: '18335', sc: 'bau', d: 5, a: ['grund', 'wand_ab'] },
    { id: 'ringanker', ph: 'rohbau', n: 'Ringanker / Ringbalken, Attika', gw: 'Rohbau', din: '18331', sc: 'bau', d: 3, a: ['mauer'] },
    { id: 'schacht', ph: 'rohbau', n: 'Aufzugsschacht', gw: 'Rohbau', din: '18331', sc: 'bau', d: 8, a: ['grund'] },
    { id: 'bohr', ph: 'rohbau', n: 'Kernbohrungen, Schlitze und Aussparungen für die Haustechnik', gw: 'Rohbau', din: '18330', sc: 'bau', d: 3, a: ['mauer', 'wand_ab'] },
    { id: 'brandw', ph: 'rohbau', n: 'Brandwand / Gebäudetrennwand', gw: 'Rohbau', din: '18330', sc: 'bau', d: 5, a: ['grund'] },
    { id: 'stahltr', ph: 'rohbau', n: 'Stahltreppe / Außentreppe', gw: 'Metallbau', din: '18360', sc: 'bau', d: 3, a: ['mauer'] },
    // Gebäudehülle
    { id: 'lattung', ph: 'huelle', n: 'Unterspannbahn, Konter- und Dachlattung', gw: 'Dach', din: '18338', sc: 'bau', d: 3, a: ['zimmer'] },
    { id: 'flachdach', ph: 'huelle', n: 'Flachdachabdichtung', gw: 'Dach', din: '18336', sc: 'bau', d: 6, a: ['mauer', 'zimmer'] },
    { id: 'gaube', ph: 'huelle', n: 'Dachgauben', gw: 'Zimmerer', din: '18334', sc: 'bau', d: 8, a: ['zimmer', 'geruest'] },
    { id: 'attika', ph: 'huelle', n: 'Attika- und Mauerabdeckungen', gw: 'Klempner', din: '18339', sc: 'bau', d: 2, a: ['flachdach'] },
    { id: 'lichtkuppel', ph: 'huelle', n: 'Lichtkuppeln / RWA', gw: 'Dach', din: '18338', sc: 'bau', d: 1, a: ['flachdach'] },
    { id: 'oberste', ph: 'huelle', n: 'Oberste Geschossdecke dämmen', gw: 'Trockenbau', din: '18340', sc: 'bau', d: 3, a: ['be'] },
    { id: 'haustuer', ph: 'huelle', n: 'Hauseingangstür', gw: 'Tischler', din: '18355', sc: 'bau', d: 1, a: ['fenster_neu', 'fenster'] },
    { id: 'pr_fassade', ph: 'huelle', n: 'Pfosten-Riegel-Fassade / Glasfassade', gw: 'Metallbau', din: '18360', sc: 'bau', d: 10, a: ['mauer'] },
    { id: 'wintergarten', ph: 'huelle', n: 'Wintergarten', gw: 'Metallbau', din: '18360', sc: 'bau', d: 5, a: ['dicht'] },
    { id: 'tor', ph: 'huelle', n: 'Garagentor / Sektionaltor', gw: 'Metallbau', din: '18360', sc: 'bau', d: 1, a: ['aussenputz'] },
    { id: 'fensteranschl', ph: 'huelle', n: 'Fensteranschlüsse abdichten (RAL-Montage)', gw: 'Fenster', din: '18355', sc: 'bau', d: 2, a: ['fenster_neu', 'fenster'] },
    { id: 'laibung', ph: 'huelle', n: 'Laibungen dämmen und putzen', gw: 'Fassade', din: '18345', sc: 'bau', d: 3, a: ['fenster', 'geruest'] },
    { id: 'sockel_a', ph: 'huelle', n: 'Sockelabdichtung und Sockelputz', gw: 'Fassade', din: '18350', sc: 'bau', d: 3, a: ['aussenputz', 'wdvs'] },
    { id: 'balkon_abd', ph: 'huelle', n: 'Balkon- und Terrassenabdichtung, Belag', gw: 'Abdichtung', din: '18336', sc: 'bau', d: 3, a: ['balkon'] },
    { id: 'insekt', ph: 'huelle', n: 'Insektenschutz', gw: 'Rollladen', din: '18358', sc: 'bau', d: 1, a: ['fenster_neu', 'fenster'] },
    // Haustechnik roh
    { id: 'gas', ph: 'tga_roh', n: 'Gasinstallation / Gas-Hausanschluss', gw: 'Sanitär', din: '18381', sc: 'bau', d: 3, a: ['hak'] },
    { id: 'fernw', ph: 'tga_roh', n: 'Fernwärme-Übergabestation', gw: 'Heizung', din: '18380', sc: 'bau', d: 2, a: ['hak'] },
    { id: 'solar', ph: 'tga_roh', n: 'Solarthermie', gw: 'Heizung', din: '18380', sc: 'bau', d: 4, a: ['dach_deck', 'geruest'] },
    { id: 'speicher', ph: 'tga_roh', n: 'Trinkwassererwärmung / Speicher', gw: 'Sanitär', din: '18381', sc: 'bau', d: 2, a: ['waermeerz', 'san_roh'] },
    { id: 'vorwand', ph: 'tga_roh', n: 'Vorwandinstallation (WC, Waschtisch)', gw: 'Sanitär', din: '18381', sc: 'we', d: 3, a: ['san_roh'] },
    { id: 'hebe', ph: 'tga_roh', n: 'Hebeanlage', gw: 'Sanitär', din: '18381', sc: 'bau', d: 2, a: ['san_roh'] },
    { id: 'sprinkler', ph: 'tga_roh', n: 'Sprinkleranlage', gw: 'Sanitär', din: '18381', sc: 'bau', d: 10, a: ['dicht'] },
    { id: 'zaehler', ph: 'tga_roh', n: 'Zählerschrank und Unterverteilungen', gw: 'Elektro', din: '18382', sc: 'bau', d: 2, a: ['hak', 'el_roh'] },
    { id: 'netz', ph: 'tga_roh', n: 'Netzwerk- und Datenverkabelung', gw: 'Elektro', din: '18382', sc: 'we', d: 3, a: ['el_roh'] },
    { id: 'bma', ph: 'tga_roh', n: 'Brandmeldeanlage', gw: 'Elektro', din: '18382', sc: 'bau', d: 5, a: ['el_roh'] },
    { id: 'sibe', ph: 'tga_roh', n: 'Sicherheitsbeleuchtung', gw: 'Elektro', din: '18382', sc: 'bau', d: 3, a: ['el_roh'] },
    { id: 'knx', ph: 'tga_roh', n: 'Gebäudeautomation (KNX / MSR)', gw: 'Elektro', din: '18386', sc: 'we', d: 5, a: ['el_roh'] },
    { id: 'klima', ph: 'tga_roh', n: 'Klima- und Kälteanlage', gw: 'Lüftung', din: '18379', sc: 'bau', d: 5, a: ['dicht'] },
    { id: 'rohrdaemm', ph: 'tga_roh', n: 'Rohrleitungen dämmen', gw: 'Dämmung', din: '18421', sc: 'we', d: 3, a: ['san_roh', 'hz_roh'] },
    { id: 'schott', ph: 'tga_roh', n: 'Brandschutz-Abschottungen', gw: 'Brandschutz', din: '18421', sc: 'bau', d: 3, a: ['san_roh', 'hz_roh', 'el_roh', 'lueft'] },
    { id: 'druckpr', ph: 'tga_roh', n: 'Druckprobe / Dichtheitsprüfung der Leitungen', gw: 'Sanitär', din: '18381', sc: 'we', d: 1, a: ['san_roh', 'hz_roh'] },
    // Innenausbau
    { id: 'innendaemm', ph: 'ausbau', n: 'Innendämmung', gw: 'Trockenbau', din: '18340', sc: 'we', d: 5, a: ['entk'] },
    { id: 'trockestr', ph: 'ausbau', n: 'Trockenestrich', gw: 'Trockenbau', din: '18340', sc: 'we', d: 3, a: ['trocken', 'putz'] },
    { id: 'brandbekl', ph: 'ausbau', n: 'Brandschutzbekleidungen (F30/F90)', gw: 'Trockenbau', din: '18340', sc: 'bau', d: 4, a: ['trocken'] },
    { id: 'akustik', ph: 'ausbau', n: 'Akustikdecke', gw: 'Trockenbau', din: '18340', sc: 'we', d: 4, a: ['trocken'] },
    { id: 'revision', ph: 'ausbau', n: 'Revisionsöffnungen', gw: 'Trockenbau', din: '18340', sc: 'we', d: 1, a: ['trocken'] },
    { id: 'beiputz', ph: 'ausbau', n: 'Beiputzarbeiten (Laibungen, Schlitze)', gw: 'Putz', din: '18350', sc: 'we', d: 2, a: ['fenster', 'putz'] },
    { id: 'naturstein', ph: 'ausbau', n: 'Naturstein (Böden, Treppen, Fensterbänke)', gw: 'Naturstein', din: '18332', sc: 'we', d: 5, a: ['estr_tr'] },
    { id: 'teppich', ph: 'ausbau', n: 'Teppich / Linoleum', gw: 'Bodenbelag', din: '18365', sc: 'we', d: 3, a: ['maler'] },
    { id: 'beschicht', ph: 'ausbau', n: 'Bodenbeschichtung (Keller, Garage)', gw: 'Maler', din: '18363', sc: 'bau', d: 2, a: ['estr_tr'] },
    { id: 'lack', ph: 'ausbau', n: 'Lackierarbeiten (Türen, Heizkörper, Geländer)', gw: 'Maler', din: '18363', sc: 'we', d: 3, a: ['maler'] },
    { id: 'holztreppe', ph: 'ausbau', n: 'Holztreppe', gw: 'Tischler', din: '18355', sc: 'bau', d: 3, a: ['maler'] },
    { id: 'glaswand', ph: 'ausbau', n: 'Glastrennwände, Ganzglastüren', gw: 'Glaser', din: '18361', sc: 'we', d: 3, a: ['maler'] },
    { id: 't30', ph: 'ausbau', n: 'Brandschutz- und Rauchschutztüren', gw: 'Metallbau', din: '18360', sc: 'bau', d: 3, a: ['putz', 'trocken'] },
    { id: 'schliess', ph: 'ausbau', n: 'Schließanlage', gw: 'Tischler', din: '18355', sc: 'bau', d: 1, a: ['tischler'] },
    { id: 'kellertr', ph: 'ausbau', n: 'Kellertrennwände / Abstellräume', gw: 'Metallbau', din: '18360', sc: 'bau', d: 2, a: ['estr_tr'] },
    // Haustechnik fein
    { id: 'hydr', ph: 'tga_fein', n: 'Hydraulischer Abgleich', gw: 'Heizung', din: '18380', sc: 'bau', d: 1, a: ['hz_fein'] },
    { id: 'rwm', ph: 'tga_fein', n: 'Rauchwarnmelder', gw: 'Elektro', din: '18382', sc: 'we', d: 1, a: ['maler'] },
    { id: 'wallbox', ph: 'tga_fein', n: 'Wallbox / Ladestation', gw: 'Elektro', din: '18382', sc: 'bau', d: 1, a: ['el_fein', 'hak'] },
    { id: 'eprue', ph: 'tga_fein', n: 'Elektroprüfung, Messprotokoll', gw: 'Elektro', din: '18382', sc: 'we', d: 1, a: ['el_fein'] },
    { id: 'tw_spuel', ph: 'tga_fein', n: 'Trinkwasser spülen, Probe', gw: 'Sanitär', din: '18381', sc: 'we', d: 1, a: ['san_fein'] },
    { id: 'klima_fein', ph: 'tga_fein', n: 'Klima-Inneneinheiten, Inbetriebnahme', gw: 'Lüftung', din: '18379', sc: 'bau', d: 2, a: ['klima', 'maler'] },
    { id: 'knx_ib', ph: 'tga_fein', n: 'Gebäudeautomation in Betrieb nehmen', gw: 'Elektro', din: '18386', sc: 'bau', d: 2, a: ['knx', 'el_fein'] },
    { id: 'aufzug_abn', ph: 'tga_fein', n: 'Aufzug abnehmen (Prüfstelle)', gw: 'Aufzug', din: '18385', sc: 'bau', ms: 1, a: ['aufzug'] },
    // Außenanlagen
    { id: 'asphalt', ph: 'aussen', n: 'Asphaltflächen', gw: 'Tiefbau', din: '18317', sc: 'bau', d: 3, a: ['aussenanl'] },
    { id: 'stellpl', ph: 'aussen', n: 'Stellplätze, Markierung', gw: 'Außenanlagen', din: '18318', sc: 'bau', d: 3, a: ['aussenanl'] },
    { id: 'mauer_a', ph: 'aussen', n: 'Stützmauern, Gabionen, Außentreppen', gw: 'Außenanlagen', din: '18318', sc: 'bau', d: 5, a: ['aussenanl'] },
    { id: 'entw_a', ph: 'aussen', n: 'Hofentwässerung, Rinnen', gw: 'Tiefbau', din: '18306', sc: 'bau', d: 2, a: ['aussenanl'] },
    { id: 'muell', ph: 'aussen', n: 'Müllplatz, Fahrradständer', gw: 'Metallbau', din: '18360', sc: 'bau', d: 2, a: ['aussenanl'] },
    { id: 'spiel', ph: 'aussen', n: 'Spielplatz / Spielgeräte', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 4, a: ['aussenanl'] },
    { id: 'baeume', ph: 'aussen', n: 'Bäume und Sträucher pflanzen', gw: 'Außenanlagen', din: '18916', sc: 'bau', d: 2, a: ['aussenanl'] },
    { id: 'bewaess', ph: 'aussen', n: 'Gartenbewässerung', gw: 'Außenanlagen', din: '18320', sc: 'bau', d: 2, a: ['aussenanl'] },
    { id: 'pflege', ph: 'aussen', n: 'Fertigstellungspflege', gw: 'Außenanlagen', din: '18916', sc: 'bau', d: 10, a: ['garten', 'baeume'] },
    // Abschluss
    { id: 'vorabn', ph: 'abschluss', n: 'Vorbegehung / Mängelliste', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['maler', 'boden'] },
    { id: 'maengel', ph: 'abschluss', n: 'Mängel beseitigen', gw: 'Bauleitung', sc: 'bau', d: 5, a: ['vorabn'] },
    { id: 'fensterrein', ph: 'abschluss', n: 'Fenster- und Feinreinigung', gw: 'Reinigung', sc: 'we', d: 1, a: ['reinig'] },
    { id: 'einweis', ph: 'abschluss', n: 'Einweisung in die Technik', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['san_fein', 'el_fein', 'hz_fein'] },
    { id: 'doku', ph: 'abschluss', n: 'Revisionsunterlagen, Dokumentation übergeben', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['reinig'] },
    { id: 'be_ab', ph: 'abschluss', n: 'Baustelleneinrichtung räumen', gw: 'Bauleitung', sc: 'bau', d: 1, a: ['reinig'] },
    { id: 'schluessel', ph: 'abschluss', n: 'Schlüsselübergabe / Bezug', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['abn'] },
    // ---- Nichtwohngebäude, Denkmal, Umnutzung (15.11.2026; über die Gebäude-Ebene angeboten) ----
    // Ingenieur:in / Planung
    { id: 'nutzaend', ph: 'planung', n: 'Nutzungsänderung genehmigt', gw: 'Architekt', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'denkmal_erl', ph: 'planung', n: 'Denkmalrechtliche Erlaubnis erteilt', gw: 'Architekt', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'befund', ph: 'planung', n: 'Restauratorische Befunduntersuchung', gw: 'Sachverständige', sc: 'bau', d: 5, a: ['start'] },
    { id: 'tpruef', ph: 'planung', n: 'Prüfsachverständige: Technische Anlagen (Wirk-Prinzip-Prüfung)', gw: 'Sachverständige', sc: 'bau', d: 3, a: ['el_fein', 'bma', 'sprinkler', 'lueft_fein'] },
    // Vorbereitung
    { id: 'bemuster', ph: 'vorb', n: 'Musterflächen und Bemusterung (Denkmal)', gw: 'Bauleitung', sc: 'bau', d: 3, a: ['be', 'befund'] },
    // Erd- und Gründung
    { id: 'guelle', ph: 'erd', n: 'Güllekeller / Güllebehälter', gw: 'Rohbau', din: '18331', sc: 'bau', d: 15, a: ['aushub'] },
    { id: 'tg_zufahrt', ph: 'erd', n: 'Rampe und Zufahrt Tiefgarage', gw: 'Rohbau', din: '18331', sc: 'bau', d: 8, a: ['grund'] },
    // Rohbau
    { id: 'stahlhalle', ph: 'rohbau', n: 'Hallentragwerk montieren (Stahl / Holz / Fertigteil)', gw: 'Stahlbau', din: '18335', sc: 'bau', d: 10, a: ['grund'] },
    { id: 'kranbahn', ph: 'rohbau', n: 'Kranbahn montieren', gw: 'Stahlbau', din: '18335', sc: 'bau', d: 4, a: ['stahlhalle'] },
    // Gebäudehülle
    { id: 'trapezdach', ph: 'huelle', n: 'Trapezblech- / Sandwichdach', gw: 'Dach', din: '18338', sc: 'bau', d: 5, a: ['stahlhalle'] },
    { id: 'sandwich', ph: 'huelle', n: 'Sandwich- / Trapezblechfassade', gw: 'Metallbau', din: '18351', sc: 'bau', d: 8, a: ['stahlhalle', 'trapezdach'] },
    { id: 'schaufenster', ph: 'huelle', n: 'Schaufensteranlage / Ladenfront', gw: 'Metallbau', din: '18360', sc: 'bau', d: 4, a: ['mauer', 'stuetzen'] },
    // Haustechnik roh
    { id: 'hallenhz', ph: 'tga_roh', n: 'Hallenheizung (Dunkelstrahler / Deckenstrahlplatten)', gw: 'Heizung', din: '18380', sc: 'bau', d: 5, a: ['sandwich', 'trapezdach'] },
    { id: 'druckluft', ph: 'tga_roh', n: 'Druckluft- und Medienleitungen', gw: 'Sanitär', din: '18381', sc: 'bau', d: 5, a: ['stahlhalle', 'dicht'] },
    { id: 'ela', ph: 'tga_roh', n: 'Elektroakustik, Alarmierung (ELA / Amok)', gw: 'Elektro', din: '18382', sc: 'bau', d: 4, a: ['el_roh'] },
    { id: 'ruf', ph: 'tga_roh', n: 'Lichtrufanlage (Pflege)', gw: 'Elektro', din: '18382', sc: 'we', d: 3, a: ['el_roh'] },
    { id: 'zutritt', ph: 'tga_roh', n: 'Zutrittskontrolle / Einbruchmeldeanlage', gw: 'Elektro', din: '18382', sc: 'bau', d: 3, a: ['el_roh'] },
    { id: 'co_warn', ph: 'tga_roh', n: 'CO-/NO₂-Warnanlage (Garage)', gw: 'Elektro', din: '18382', sc: 'bau', d: 2, a: ['el_roh'] },
    { id: 'fettabsch', ph: 'tga_roh', n: 'Fettabscheider', gw: 'Sanitär', din: '18381', sc: 'bau', d: 2, a: ['grundl'] },
    { id: 'kuehlz', ph: 'tga_roh', n: 'Kühlzellen / gewerbliche Kälte', gw: 'Lüftung', din: '18379', sc: 'bau', d: 4, a: ['trocken', 'putz'] },
    { id: 'stalltech', ph: 'tga_roh', n: 'Stalltechnik (Aufstallung, Fütterung, Lüftung)', gw: 'Landtechnik', sc: 'bau', d: 10, a: ['stahlhalle', 'grund'] },
    // Innenausbau
    { id: 'indboden', ph: 'ausbau', n: 'Industrieboden (Beton, flügelgeglättet / Hartstoff)', gw: 'Rohbau', din: '18331', sc: 'bau', d: 6, a: ['stahlhalle', 'grundl'] },
    { id: 'doppelboden', ph: 'ausbau', n: 'Doppel- / Hohlraumboden', gw: 'Trockenbau', din: '18340', sc: 'we', d: 4, a: ['trocken', 'putz'] },
    { id: 'systemtw', ph: 'ausbau', n: 'Systemtrennwände (Büro)', gw: 'Trockenbau', din: '18340', sc: 'we', d: 4, a: ['boden'] },
    { id: 'gewkueche', ph: 'ausbau', n: 'Gewerbeküche montieren', gw: 'Küche', sc: 'bau', d: 5, a: ['fliesen', 'maler'] },
    { id: 'teekueche', ph: 'ausbau', n: 'Teeküchen', gw: 'Küche', din: '18355', sc: 'we', d: 1, a: ['fliesen', 'maler'] },
    { id: 'sondereinb', ph: 'ausbau', n: 'Nutzungsspezifische Einbauten (Garderoben, Tafeln, Zwinger …)', gw: 'Tischler', din: '18355', sc: 'we', d: 4, a: ['maler', 'boden'] },
    { id: 'leitsys', ph: 'ausbau', n: 'Beschilderung, Leit- und Orientierungssystem', gw: 'Maler', din: '18363', sc: 'bau', d: 2, a: ['maler'] },
    { id: 'rampe', ph: 'ausbau', n: 'Rampen und Handläufe (barrierefrei)', gw: 'Metallbau', din: '18360', sc: 'bau', d: 2, a: ['aussenputz', 'aussenanl'] },
    // Außenanlagen
    { id: 'anliefer', ph: 'aussen', n: 'Anlieferung, Ladebrücken, Rammschutz', gw: 'Metallbau', din: '18360', sc: 'bau', d: 3, a: ['aussenanl'] },
    // Abschluss
    { id: 'denkmal_doku', ph: 'abschluss', n: 'Dokumentation für die Denkmalbehörde übergeben', gw: 'Architekt', sc: 'bau', ms: 1, a: ['reinig'] },
  ];

  /* Überschlag über Mengen (plankern.js: dur): Bezugsgröße und Leistungswert je Kolonne und Arbeitstag, ggf. höchstens kmax Kolonnen.
     Bezug: wf Wohnfläche · bgf Brutto-Grundfläche · gr Grundfläche · fas Fassade · dach Dachfläche · wand Wandfläche innen · u Umfang (m) · g Geschosse.
     Abgestimmt (15.11.2026) an öffentlich genannten Arbeitsstunden eines Massiv-EFH (musterhaus.net: Mauerwerk 690 h, Dacheindeckung 85 h,
     Außenputz 220 h, Innenputz 215 h, Elektro 95 h, Heizung 120 h, Sanitär 80 h, Maler 120 h, Bodenbelag 25 h), an Richtzeiten für
     Mauerwerk (Kalksandstein/Ziegel 0,3–0,8 h/m² Wand) und an Taktzeiten im Rohbau (Mehrfamilienhaus 1–3 Wochen je Geschoss).
     Eigene Werte, nicht aus lizenzierten Kalkulationswerken; im Plan bleibt jede Dauer änderbar. */
  const MENGE = {
    aushub: ['gr', 30], grundl: ['gr', 40], grund: ['gr', 18], keller: ['gr', 8], keller_abd: ['u', 15], verfuell: ['u', 20], sauber: ['gr', 60], wu: ['gr', 12],
    mauer: ['bgf', 6, 4], holz_mont: ['bgf', 30], innenw: ['wf', 30],
    geruest: ['fas', 100], geruest_ab: ['fas', 200], zimmer: ['dach', 30], dach_deck: ['dach', 40], dach_daemm: ['dach', 40], dampfsp: ['dach', 150],
    lattung: ['dach', 60], flachdach: ['dach', 40], gruendach: ['dach', 60], klempner: ['u', 20], pv: ['dach', 50], fenster_neu: ['wf', 35],
    wdvs: ['fas', 20], klinker: ['fas', 12], vhf: ['fas', 15], holzfassade: ['fas', 18], aussenputz: ['fas', 25], oberste: ['gr', 40],
    entk: ['wf', 35], san_roh: ['wf', 35], hz_roh: ['wf', 28], el_roh: ['wf', 35], lueft: ['wf', 45], rohrdaemm: ['wf', 50],
    trocken: ['wf', 23], decke_abh: ['wf', 45], putz: ['wand', 65], fbh: ['wf', 70], estrich: ['wf', 70], spachtel_wd: ['wand', 130],
    maler: ['wand', 70], tapete: ['wand', 200], boden: ['wf', 70], aussenanl: ['gr', 35],
    stahlhalle: ['gr', 60], trapezdach: ['dach', 60], sandwich: ['fas', 40], indboden: ['gr', 120], doppelboden: ['wf', 60], systemtw: ['wf', 60],
    // ohne Leistungswert: aus der Richtdauer am Referenzhaus abgeleitet (plankern.js: kalibriert) – so rechnen alle Gebäude über ihre Mengen
    schad: ['wf'], wand_ab: ['wf'], durchbr: ['wf'], fenster: ['wf'], sonnenschutz: ['wf'], fensterbank_a: ['wf'], fensterbank_i: ['wf'],
    fliesen_vb: ['wf'], fliesen: ['wf'], tischler: ['wf'], boden_vorb: ['wf'], parkett_alt: ['wf'], parkett_ob: ['wf'], sockel: ['wf'],
    san_fein: ['wf'], hz_fein: ['wf'], el_fein: ['wf'], lueft_fein: ['wf'], reinig: ['wf'], fenster_ab: ['wf'], estrich_ab: ['wf'], tga_ab: ['wf'],
    bohr: ['wf'], fensteranschl: ['wf'], laibung: ['wf'], insekt: ['wf'], vorwand: ['wf'], netz: ['wf'], knx: ['wf'], trockestr: ['wf'],
    akustik: ['wf'], beiputz: ['wf'], naturstein: ['wf'], teppich: ['wf'], lack: ['wf'], rwm: ['wf'], eprue: ['wf'], fensterrein: ['wf'], ruf: ['wf'],
    sondereinb: ['wf'],
    dach_ab: ['dach'], lichtkuppel: ['dach'],
    unterfang: ['u'], bk_frei: ['u'], bk_abd: ['u'], bk_drain: ['u'], bk_verf: ['u'], bk_hsp: ['u'], zaun: ['u'], bauzaun: ['u'], verbau: ['u'],
    ringanker: ['u'], attika: ['u'], sockel_a: ['u'],
    bk_ausbau: ['gr'], zufahrt: ['gr'], garten: ['gr'], baustr: ['gr'], kampfm: ['gr'], roden: ['gr'], oberboden: ['gr'], wasserh: ['gr'],
    pfahl: ['gr'], bodenaust: ['gr'], stahlbau: ['gr'], beschicht: ['gr'], kellertr: ['gr'], asphalt: ['gr'], stellpl: ['gr'], entw_a: ['gr'],
    baeume: ['gr'], bewaess: ['gr'], guelle: ['gr'], hallenhz: ['gr'], stalltech: ['gr'],
    abbund: ['bgf'], abbruch_ges: ['bgf'], entsorg: ['bgf'], stuetzen: ['bgf'], fertigt: ['bgf'], sprinkler: ['bgf'], bma: ['bgf'], sibe: ['bgf'],
    klima: ['bgf'], schott: ['bgf'], brandbekl: ['bgf'], t30: ['bgf'], klima_fein: ['bgf'], maengel: ['bgf'], befund: ['bgf'], druckluft: ['bgf'],
    ela: ['bgf'], zutritt: ['bgf'], co_warn: ['bgf'], leitsys: ['bgf'],
    treppe: ['g'], treppe_belag: ['g'], gelaender: ['g'], aufzug: ['g'], schacht: ['g'], holztreppe: ['g'],
    putz_ab: ['wand'], innendaemm: ['wand'],
    pr_fassade: ['fas'],
  };
  items.forEach((i) => { const m = MENGE[i.id]; if (m) { i.bz = m[0]; i.lw = m[1]; if (m[2]) i.kmax = m[2]; } });

  const NEUBAU = ['be', 'statik', 'verm', 'aushub', 'grundl', 'grund', 'mauer', 'treppe', 'geruest', 'zimmer', 'dach_deck', 'klempner', 'fenster_neu', 'dicht', 'aussenputz', 'geruest_ab', 'hak', 'waermeerz', 'san_roh', 'hz_roh', 'el_roh', 'putz', 'fbh', 'estrich', 'estr_tr', 'fliesen', 'maler', 'tischler', 'boden', 'sockel', 'san_fein', 'hz_fein', 'el_fein', 'aussenanl', 'reinig'];
  const profiles = [
    { k: 'neubau_efh', floors: 1, dg: 'aus', choice: { keller: 'none', tragwerk: 'massiv', dachform: 'sattel', dachdeckung: 'ziegel', fassade: 'putz', fenster: 'kunststoff', pv: 'none', heizung: 'wp_luft', lueftung: 'fenster', waermevert: 'fbh', estrichart: 'ze', innenwand: 'putz', bodenbelag: 'parkett' }, n: 'Neubau Einfamilienhaus', ic: '🏠', desc: 'Massivbau, schlüsselfertig', area: 140, units: 1, takt: 'parallel',
      rec: NEUBAU.concat(['erder', 'spachtel_wd', 'boden_vorb', 'fensterbank_a', 'fensterbank_i', 'treppe_belag', 'gelaender', 'bad_moebel', 'dusche_glas', 'silikon', 'zufahrt', 'terrasse', 'briefk']), opt: ['keller', 'keller_abd', 'verfuell', 'dach_daemm', 'wdvs', 'lueft', 'lueft_fein', 'trocken', 'fliesen_vb', 'garten', 'tapete', 'decke_abh', 'kueche', 'einbau', 'bad_acc', 'sonnenschutz', 'vordach', 'dachfenster', 'schornstein', 'blitzschutz', 'dach_zub', 'markise', 'aussenlicht', 'zaun', 'garage', 'balkon', 'gel_aus'] },
    { k: 'neubau_mfh', floors: 3, dg: 'kalt', choice: { keller: 'mw', tragwerk: 'massiv', dachform: 'sattel', dachdeckung: 'ziegel', fassade: 'wdvs', fenster: 'kunststoff', pv: 'none', heizung: 'wp_luft', lueftung: 'fenster', waermevert: 'fbh', estrichart: 'ze', innenwand: 'both', bodenbelag: 'parkett' }, n: 'Neubau Mehrfamilienhaus', ic: '🏢', desc: 'Wohnungen im Takt ausbauen', area: 480, units: 6, naming: 'whg', takt: 'versetzt',
      rec: [...NEUBAU, 'keller', 'keller_abd', 'verfuell', 'trocken', 'wdvs', 'erder', 'spachtel_wd', 'boden_vorb', 'fensterbank_a', 'fensterbank_i', 'treppe_belag', 'gelaender', 'bad_moebel', 'dusche_glas', 'silikon', 'zufahrt', 'briefk', 'balkon', 'gel_aus', 'blitzschutz'], opt: ['aufzug', 'lueft', 'lueft_fein', 'dach_daemm', 'fliesen_vb', 'garten', 'tapete', 'decke_abh', 'kueche', 'einbau', 'bad_acc', 'sonnenschutz', 'vordach', 'dachfenster', 'dach_zub', 'terrasse', 'markise', 'aussenlicht', 'zaun', 'garage'] },
    { k: 'kern_efh', floors: 2, dg: 'kalt', choice: { dachdeckung: 'ziegel', fassade: 'keine', fenster: 'kunststoff', pv: 'none', heizung: 'keep', lueftung: 'fenster', waermevert: 'hk', estrichart: 'ze', innenwand: 'both', bodenbelag: 'parkett' }, n: 'Kernsanierung Einfamilienhaus', ic: '🔨', desc: 'Entkernen, Technik neu, Ausbau', area: 140, units: 1, takt: 'parallel',
      rec: ['be', 'schutz', 'statik', 'entk', 'wand_ab', 'durchbr', 'fenster', 'san_roh', 'hz_roh', 'el_roh', 'trocken', 'putz', 'estrich', 'estr_tr', 'fliesen', 'maler', 'tischler', 'boden', 'sockel', 'san_fein', 'hz_fein', 'el_fein', 'reinig', 'spachtel_wd', 'boden_vorb', 'fensterbank_i', 'bad_moebel', 'silikon'],
      opt: ['schad', 'geruest', 'zimmer', 'dach_deck', 'dach_daemm', 'klempner', 'wdvs', 'aussenputz', 'geruest_ab', 'waermeerz', 'lueft', 'lueft_fein', 'fliesen_vb', 'aussenanl', 'tapete', 'decke_abh', 'parkett_alt', 'dusche_glas', 'bad_acc', 'gelaender', 'treppe_belag', 'fensterbank_a', 'sonnenschutz', 'kueche', 'einbau', 'dachfenster', 'gel_aus', 'vordach'] },
    { k: 'san_mfh', floors: 3, dg: 'kalt', choice: { dachdeckung: 'ziegel', fassade: 'wdvs', fenster: 'kunststoff', pv: 'none', heizung: 'wp_luft', lueftung: 'fenster', waermevert: 'hk', estrichart: 'ze', bodenbelag: 'parkett' }, n: 'Sanierung Mehrfamilienhaus', ic: '🏘️', desc: 'Hülle, Technik, Wohnungen im Takt', area: 400, units: 4, naming: 'whg', takt: 'versetzt',
      rec: ['be', 'schutz', 'statik', 'entk', 'durchbr', 'geruest', 'dach_deck', 'dach_daemm', 'klempner', 'fenster', 'wdvs', 'aussenputz', 'geruest_ab', 'waermeerz', 'san_roh', 'hz_roh', 'el_roh', 'trocken', 'putz', 'estrich', 'estr_tr', 'fliesen', 'maler', 'tischler', 'boden', 'sockel', 'san_fein', 'hz_fein', 'el_fein', 'reinig', 'spachtel_wd', 'boden_vorb', 'fensterbank_a', 'silikon'],
      opt: ['schad', 'wand_ab', 'zimmer', 'lueft', 'lueft_fein', 'fliesen_vb', 'aufzug', 'aussenanl', 'tapete', 'decke_abh', 'fensterbank_i', 'gel_aus', 'balkon', 'sonnenschutz', 'bad_moebel', 'dusche_glas', 'bad_acc', 'gelaender', 'treppe_belag', 'briefk', 'blitzschutz', 'dach_zub', 'vordach'] },
    { k: 'umbau_efh', floors: 2, dg: 'kalt', choice: { erweiterung: 'anbau', anbaukeller: 'none', bestkeller: 'keiner', dachdeckung: 'ziegel', fassade: 'putz', fenster: 'kunststoff', pv: 'none', heizung: 'keep', lueftung: 'fenster', waermevert: 'hk', estrichart: 'ze', innenwand: 'both', bodenbelag: 'parkett' }, n: 'Umbau und Erweiterung Einfamilienhaus', ic: '🏡', desc: 'Bestand umbauen, Anbau oder Aufstockung', area: 170, units: 1, takt: 'parallel',
      rec: ['be', 'schutz', 'statik', 'entk', 'wand_ab', 'durchbr', 'geruest', 'zimmer', 'dach_deck', 'klempner', 'fenster_neu', 'fenster', 'dicht', 'aussenputz', 'geruest_ab', 'hak', 'san_roh', 'hz_roh', 'el_roh', 'trocken', 'putz', 'estrich', 'estr_tr', 'fliesen', 'maler', 'tischler', 'boden', 'sockel', 'san_fein', 'hz_fein', 'el_fein', 'spachtel_wd', 'boden_vorb', 'fensterbank_i', 'fensterbank_a', 'silikon', 'aussenanl', 'reinig', 'zufahrt', 'terrasse'],
      opt: ['schad', 'keller', 'keller_abd', 'verfuell', 'erder', 'dach_daemm', 'wdvs', 'waermeerz', 'lueft', 'lueft_fein', 'fliesen_vb', 'treppe', 'treppe_belag', 'gelaender', 'tapete', 'decke_abh', 'parkett_alt', 'bad_moebel', 'dusche_glas', 'bad_acc', 'kueche', 'einbau', 'sonnenschutz', 'dachfenster', 'dach_zub', 'vordach', 'pv', 'balkon', 'gel_aus', 'blitzschutz', 'garten', 'markise', 'zaun', 'garage', 'aussenlicht'],
      ovr: { fenster: { n: 'Fenster im Bestand erneuern' }, fenster_neu: { n: 'Fenster und Außentüren Erweiterung' }, aussenputz: { n: 'Außenputz Erweiterung, Anschluss an die Bestandsfassade' }, dicht: { n: 'Erweiterung dicht (Dach und Fenster)' }, treppe: { a: ['mauer', 'holz_mont', 'durchbr'] } } },
    { k: 'umbau_mfh', floors: 3, dg: 'kalt', choice: { erweiterung: 'aufstock', anbaukeller: 'none', bestkeller: 'keiner', dachdeckung: 'ziegel', fassade: 'wdvs', fenster: 'kunststoff', pv: 'none', heizung: 'keep', lueftung: 'fenster', waermevert: 'hk', estrichart: 'ze', innenwand: 'both', bodenbelag: 'parkett' }, n: 'Umbau und Erweiterung Mehrfamilienhaus', ic: '🏗️', desc: 'Bestand im Takt umbauen, Aufstockung oder Anbau', area: 480, units: 5, naming: 'whg', takt: 'versetzt',
      rec: ['be', 'schutz', 'statik', 'entk', 'wand_ab', 'durchbr', 'geruest', 'zimmer', 'dach_deck', 'klempner', 'fenster_neu', 'fenster', 'dicht', 'aussenputz', 'geruest_ab', 'hak', 'san_roh', 'hz_roh', 'el_roh', 'trocken', 'putz', 'estrich', 'estr_tr', 'fliesen', 'maler', 'tischler', 'boden', 'sockel', 'san_fein', 'hz_fein', 'el_fein', 'spachtel_wd', 'boden_vorb', 'fensterbank_i', 'fensterbank_a', 'silikon', 'aussenanl', 'reinig', 'wdvs', 'treppe', 'treppe_belag', 'gelaender', 'briefk', 'blitzschutz'],
      opt: ['schad', 'keller', 'keller_abd', 'verfuell', 'erder', 'dach_daemm', 'waermeerz', 'lueft', 'lueft_fein', 'fliesen_vb', 'tapete', 'decke_abh', 'parkett_alt', 'bad_moebel', 'dusche_glas', 'bad_acc', 'kueche', 'einbau', 'sonnenschutz', 'dachfenster', 'dach_zub', 'vordach', 'pv', 'balkon', 'gel_aus', 'aufzug', 'zufahrt', 'garten', 'aussenlicht'],
      ovr: { fenster: { n: 'Fenster im Bestand erneuern' }, fenster_neu: { n: 'Fenster und Außentüren Erweiterung' }, aussenputz: { n: 'Außenputz Erweiterung, Anschluss an die Bestandsfassade' }, dicht: { n: 'Erweiterung dicht (Dach und Fenster)' }, treppe: { a: ['mauer', 'holz_mont', 'durchbr'] } } },
    { k: 'whg_reno', floors: 2, dg: 'kalt', choice: { fenster: 'kunststoff', estrichart: 'ze', bodenbelag: 'parkett' }, n: 'Umbau / Renovierung Wohnungen', ic: '🚪', desc: 'Wände, Durchbrüche, Bad, Oberflächen', area: 160, units: 2, naming: 'gesch', takt: 'versetzt',
      rec: ['be', 'schutz', 'statik', 'wand_ab', 'durchbr', 'fenster', 'san_roh', 'el_roh', 'putz', 'estrich', 'estr_tr', 'fliesen_vb', 'fliesen', 'maler', 'boden', 'sockel', 'san_fein', 'el_fein', 'spachtel_wd', 'boden_vorb', 'silikon'],
      opt: ['schad', 'entk', 'hz_roh', 'hz_fein', 'trocken', 'tischler', 'reinig', 'tapete', 'decke_abh', 'parkett_alt', 'fensterbank_i', 'bad_moebel', 'dusche_glas', 'bad_acc', 'kueche', 'einbau'],
      ovr: { estrich: { n: 'Estricharbeiten Bad', d: 1, fix: 1 }, estr_tr: { d: 5, info: 'Kleine Badfläche: verkürzte Trocknung, vor dem Fliesen CM-Messung.' },
        fliesen: { n: 'Fliesenarbeiten Bad', d: 5, fix: 1 }, fliesen_vb: { fix: 1 }, boden: { n: 'Parkett verlegen', a: ['maler'] } } },
    { k: 'bad', floors: 1, dg: 'kalt', choice: { estrichart: 'ze' }, n: 'Badsanierung', ic: '🛁', desc: 'Rückbau bis Feininstallation', area: 8, units: 1, takt: 'parallel', noScale: 1,
      rec: ['schutz', 'entk', 'san_roh', 'el_roh', 'putz', 'estrich', 'estr_tr', 'fliesen_vb', 'fliesen', 'maler', 'san_fein', 'el_fein', 'reinig', 'bad_moebel', 'dusche_glas', 'silikon'],
      opt: ['be', 'schad', 'durchbr', 'trocken', 'fenster', 'hz_roh', 'hz_fein', 'lueft', 'lueft_fein', 'bad_acc', 'spachtel_wd', 'decke_abh'],
      ovr: { entk: { n: 'Rückbau Bad (Fliesen, Objekte, Estrich)', d: 2 }, san_roh: { d: 3 }, el_roh: { d: 1 }, putz: { n: 'Putz ausbessern', d: 2 }, estrich: { n: 'Estrich Bad', d: 1 },
        estr_tr: { d: 5 }, fliesen_vb: { d: 2 }, fliesen: { d: 5 }, maler: { d: 1 }, san_fein: { d: 2 }, el_fein: { d: 1 }, trocken: { n: 'Vorsatzschalen / Trockenbau', d: 2 },
        fenster: { d: 1 }, hz_roh: { d: 1 }, hz_fein: { d: 1 }, lueft: { d: 1 }, schad: { d: 2 }, durchbr: { d: 2 } } },
    { k: 'dg', floors: 1, dg: 'aus', choice: { dachdeckung: 'ziegel', fenster: 'kunststoff', waermevert: 'hk', estrichart: 'ze', innenwand: 'tb', bodenbelag: 'parkett' }, n: 'Dachgeschossausbau', ic: '📐', desc: 'Dämmung, Dachfenster, Ausbau', area: 70, units: 1, takt: 'parallel',
      rec: ['be', 'statik', 'geruest', 'zimmer', 'dach_daemm', 'fenster', 'san_roh', 'hz_roh', 'el_roh', 'trocken', 'estrich', 'estr_tr', 'fliesen', 'maler', 'tischler', 'boden', 'sockel', 'san_fein', 'hz_fein', 'el_fein', 'geruest_ab', 'reinig', 'spachtel_wd', 'boden_vorb'],
      opt: ['dach_deck', 'klempner', 'durchbr', 'wand_ab', 'lueft', 'lueft_fein', 'fliesen_vb', 'putz', 'tapete', 'decke_abh', 'gelaender', 'treppe_belag', 'fensterbank_i', 'bad_moebel', 'dusche_glas', 'silikon', 'bad_acc', 'kueche', 'einbau', 'dach_zub'],
      ovr: { zimmer: { n: 'Dachstuhl ertüchtigen, Gauben' }, fenster: { n: 'Dachfenster einbauen', d: 2, a: ['zimmer', 'geruest', 'be'] }, trocken: { n: 'Trockenbau (Dachschrägen, Wände)', d: 10 } } },
    { k: 'energ', floors: 2, dg: 'kalt', choice: { dachdeckung: 'ziegel', fassade: 'wdvs', fenster: 'kunststoff', pv: 'none', heizung: 'wp_luft' }, n: 'Energetische Sanierung', ic: '🌡️', desc: 'Dach, Fenster, Fassade, Heizung', area: 160, units: 1, takt: 'parallel',
      rec: ['be', 'geruest', 'dach_deck', 'dach_daemm', 'klempner', 'fenster', 'wdvs', 'aussenputz', 'geruest_ab', 'waermeerz'],
      opt: ['statik', 'zimmer', 'hz_roh', 'hz_fein', 'lueft', 'lueft_fein', 'reinig', 'aussenanl', 'fensterbank_a', 'sonnenschutz', 'dach_zub', 'blitzschutz', 'vordach'] },
    { k: 'frei', floors: 2, dg: 'kalt', n: 'Individuell', ic: '✏️', desc: 'Leistungen frei zusammenstellen', area: 120, units: 1, takt: 'versetzt', rec: [], opt: '*' },
  ];
  /* Bauweisen: je Bereich eine Auswahl. on = Leistungen, die mit dieser Wahl gesetzt werden
     (alle anderen „on“-Leistungen der Gruppe werden abgewählt), ovr = Name/DIN/Gewerk/Dauer/Vorgänger,
     mul = Faktor auf die Richtdauer, if = nur sichtbar bei bestimmter Wahl einer anderen Gruppe. */
  const NB = ['neubau_efh', 'neubau_mfh'];
  const UMB = ['umbau_efh', 'umbau_mfh'];
  const AUFST = { holz_mont: { n: 'Aufstockung in Holzrahmenbau (Wände, Decke)', a: ['dach_ab', 'notdach', 'abbund'] }, abbund: { n: 'Vorfertigung Holzbauelemente Aufstockung (Werk)', a: ['statik', 'be'] },
    zimmer: { n: 'Dachstuhl / Dach der Aufstockung' }, dach_deck: { n: 'Dacheindeckung / Dachabdichtung Aufstockung' }, geruest: { a: ['schutz', 'be'] }, fenster_neu: { n: 'Fenster und Außentüren Aufstockung' } };
  const ANB = { verm: { n: 'Vermessung Anbau' }, aushub: { n: 'Baugrube Anbau', d: 2 }, grundl: { n: 'Grundleitungen Anbau, Anschluss an den Bestand' }, grund: { n: 'Fundamente und Bodenplatte Anbau', d: 4 },
    mauer: { n: 'Rohbau Anbau (Mauerwerk, Decken)', d: 12 }, zimmer: { n: 'Dachstuhl Anbau / Anschluss an das Bestandsdach' }, dach_deck: { n: 'Dacheindeckung Anbau, Anschluss an das Bestandsdach' } };
  const choices = [
    // nur bei „Individuell“: steuert, welche weiteren Fragen kommen (Neubau oder Bestand)
    { k: 'massnahme', ph: 'vorb', n: 'Art der Maßnahme', types: ['frei'], opts: [
      { k: 'neu', n: 'Neubau', on: [] },
      { k: 'bestand', n: 'Umbau / Sanierung im Bestand', on: [] },
      { k: 'erw', n: 'Bestand mit Anbau oder Aufstockung', on: [] } ] },
    { k: 'erweiterung', ph: 'rohbau', n: 'Erweiterung', types: UMB, opts: [
      { k: 'anbau', n: 'Anbau (seitlich, neue Gründung)', on: ['verm', 'aushub', 'grundl', 'grund', 'anschluss', 'fenster_neu'], ovr: ANB },   // Rohbau setzt die Bauweise
      { k: 'aufstock', n: 'Aufstockung (Holzrahmenbau auf den Bestand)', on: ['dach_ab', 'notdach', 'abbund', 'holz_mont', 'anschluss', 'fenster_neu'], ovr: { ...AUFST, anschluss: { n: 'Anschluss der Aufstockung an den Bestand (Ringbalken, Abdichtung)' } } },
      { k: 'beides', n: 'Anbau und Aufstockung', on: ['verm', 'aushub', 'grundl', 'grund', 'mauer', 'dach_ab', 'notdach', 'abbund', 'holz_mont', 'anschluss', 'fenster_neu'],
        ovr: { ...ANB, ...AUFST, zimmer: { n: 'Dachstühle Anbau und Aufstockung' }, dach_deck: { n: 'Dacheindeckung Anbau und Aufstockung' }, fenster_neu: { n: 'Fenster und Außentüren Anbau und Aufstockung' } } },
      { k: 'keine', if: { massnahme: ['bestand'] }, n: 'nur Umbau im Bestand', on: [], ovr: { zimmer: { n: 'Dachstuhl ertüchtigen' }, dach_deck: { n: 'Dacheindeckung erneuern' } } } ] },
    { k: 'bestkeller', ph: 'erd', n: 'Vorhandener Keller', types: [...UMB, 'kern_efh', 'san_mfh'], opts: [
      { k: 'keiner', n: 'kein Keller / bleibt unverändert', on: [] },
      { k: 'aussen', n: 'Abdichtung von außen (freilegen, abdichten, Drainage)', on: ['bk_frei', 'bk_abd', 'bk_drain', 'bk_verf'] },
      { k: 'innen', n: 'Innenabdichtung / Horizontalsperre', on: ['bk_hsp', 'bk_tr'] },
      { k: 'beides', n: 'Außen- und Innenabdichtung', on: ['bk_frei', 'bk_abd', 'bk_drain', 'bk_verf', 'bk_hsp', 'bk_tr'] },
      { k: 'ausbau', n: 'Abdichten und zu Wohn-/Nutzräumen ausbauen', on: ['bk_frei', 'bk_abd', 'bk_drain', 'bk_verf', 'bk_hsp', 'bk_tr', 'bk_ausbau'] } ] },
    // Anbau bei Umbau und Erweiterung: kann neu unterkellert werden – neben dem Bestand mit Unterfangung der Bestandsfundamente
    { k: 'anbaukeller', ph: 'erd', n: 'Neuer Keller (Anbau)', types: UMB, opts: [
      { k: 'none', n: 'kein neuer Keller – Anbau auf Fundamenten und Bodenplatte', on: [] },
      { k: 'wu', if: { erweiterung: ['anbau', 'beides'] }, n: 'neuer Keller – WU-Beton (weiße Wanne)', on: ['unterfang', 'keller', 'verfuell'],
        ovr: { keller: { n: 'Kellergeschoss Anbau WU-Beton (weiße Wanne), Anschluss an den Bestand', d: 12, din: '18331' }, verfuell: { n: 'Arbeitsraum Anbau verfüllen' } } },
      { k: 'mw', if: { erweiterung: ['anbau', 'beides'] }, n: 'neuer Keller – gemauert + Abdichtung (schwarze Wanne)', on: ['unterfang', 'keller', 'keller_abd', 'verfuell'],
        ovr: { keller: { n: 'Kellergeschoss Anbau gemauert, Decke Stahlbeton', din: '18330 / 18331' }, keller_abd: { n: 'Abdichtung und Perimeterdämmung Keller Anbau, Fuge zum Bestand' }, verfuell: { n: 'Arbeitsraum Anbau verfüllen' } } },
      { k: 'ft', if: { erweiterung: ['anbau', 'beides'] }, n: 'neuer Keller – Fertigkeller (Betonfertigteile)', on: ['unterfang', 'keller', 'verfuell'],
        ovr: { keller: { n: 'Fertigkeller Anbau montieren (Betonfertigteile)', d: 4, din: '18331' }, verfuell: { n: 'Arbeitsraum Anbau verfüllen' } } } ] },
    { k: 'keller', ph: 'erd', n: 'Keller / Gründung', types: NB, opts: [
      { k: 'none', n: 'kein Keller – Bodenplatte', on: [] },
      { k: 'wu', n: 'Betonkeller WU-Beton (weiße Wanne)', on: ['keller', 'verfuell'], ovr: { keller: { n: 'Kellergeschoss WU-Beton (weiße Wanne)', d: 12, din: '18331' } } },
      { k: 'mw', n: 'gemauerter Keller + Abdichtung (schwarze Wanne)', on: ['keller', 'keller_abd', 'verfuell'], ovr: { keller: { n: 'Kellergeschoss gemauert, Decke Stahlbeton', din: '18330 / 18331' } } },
      { k: 'ft', n: 'Fertigkeller (Betonfertigteile)', on: ['keller', 'verfuell'], ovr: { keller: { n: 'Fertigkeller montieren (Betonfertigteile)', d: 4, din: '18331' } } } ] },
    // Umbau: Bauweise nur für einen Anbau wählbar (Aufstockung ist Holzbau, „Anbau und Aufstockung“ bleibt beim Standard)
    { k: 'tragwerk', ph: 'rohbau', n: 'Tragwerk / Bauweise', types: [...NB, ...UMB], opts: [
      { k: 'massiv', if: { erweiterung: ['anbau'] }, n: 'Massivbau (Mauerwerk, Stahlbetondecken)', on: ['mauer'] },
      { k: 'stb', if: { erweiterung: ['anbau'] }, n: 'Stahlbeton (Wände und Decken)', on: ['mauer'], ovr: { mauer: { n: 'Rohbau Stahlbeton (Wände, Decken)', din: '18331' } }, mul: { mauer: 1.1 } },
      { k: 'holz', if: { erweiterung: ['anbau'] }, n: 'Holzrahmenbau / Fertigbau', on: ['abbund', 'holz_mont'] },
      { k: 'bsp', if: { erweiterung: ['anbau'] }, n: 'Massivholz (Brettsperrholz)', on: ['abbund', 'holz_mont'], ovr: { abbund: { n: 'Vorfertigung Brettsperrholz-Elemente (Werk)' }, holz_mont: { n: 'Montage Brettsperrholz-Wände und -Decken' } } },
      { k: 'misch', if: { erweiterung: ['anbau'] }, n: 'gemischt – Bauweise je Geschoss wählen', on: ['mauer', 'abbund', 'holz_mont'] } ] },
    { k: 'dachform', ph: 'huelle', n: 'Dachform', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'energ', 'dg'], onTypes: [...NB, ...UMB, 'dg'], opts: [
      { k: 'sattel', n: 'Satteldach', on: ['zimmer', 'lattung'] },
      { k: 'walm', n: 'Walmdach', on: ['zimmer', 'lattung'], mul: { zimmer: 1.3, dach_deck: 1.25, klempner: 1.2 } },
      { k: 'pult', n: 'Pultdach', on: ['zimmer', 'lattung'], mul: { zimmer: 0.8, dach_deck: 0.85 } },
      // Flachdach (Warmdach): Dampfsperre, dann Wärmedämmung (Gefälle), dann die Abdichtung – jeweils eigene Leistungen
      { k: 'flach', n: 'Flachdach', on: ['dampfsp', 'dach_daemm'], ovr: { dach_deck: { n: 'Dachabdichtung Flachdach', din: '18336', a: ['schornstein', 'dachfenster', 'zimmer', 'dach_daemm', 'geruest', 'be'] },
        dach_daemm: { n: 'Flachdach: Wärmedämmung (Gefälledämmung)', din: '18336', a: ['dampfsp', 'zimmer', 'mauer', 'holz_mont', 'geruest', 'be'] }, klempner: { n: 'Klempnerarbeiten (Attika, Abläufe)' } } } ] },
    { k: 'dachdeckung', ph: 'huelle', n: 'Dachdeckung', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'energ', 'dg'], opts: [
      { k: 'ziegel', n: 'Dachziegel / Betondachstein', on: [], if: { dachform: ['sattel', 'walm', 'pult'] } },
      { k: 'schiefer', n: 'Schiefer', on: [], if: { dachform: ['sattel', 'walm', 'pult'] }, ovr: { dach_deck: { n: 'Schieferdeckung' } }, mul: { dach_deck: 1.6 } },
      { k: 'bitumen', n: 'Abdichtung mit Bitumenbahnen', on: [], if: { dachform: ['flach', 'pult'] }, ovr: { dach_deck: { n: 'Dachabdichtung mit Bitumenbahnen', din: '18336' } } },
      { k: 'kunststoff', n: 'Abdichtung mit Kunststoff-/Elastomerbahnen', on: [], if: { dachform: ['flach', 'pult'] }, ovr: { dach_deck: { n: 'Dachabdichtung mit Kunststoff-/Elastomerbahnen', din: '18336' } } },
      { k: 'gruen', n: 'Gründach (extensiv)', on: ['gruendach'], if: { dachform: ['flach', 'pult'] }, ovr: { dach_deck: { n: 'Dachabdichtung (wurzelfest) für die Begrünung', din: '18336' } } },
      { k: 'metall', n: 'Metall (Stehfalz)', on: [], ovr: { dach_deck: { n: 'Metalldach (Stehfalzdeckung)', gw: 'Klempner', din: '18339' } } } ] },
    { k: 'fassade', ph: 'huelle', n: 'Fassade', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'energ'], opts: [
      { k: 'putz', n: 'Putzfassade (monolithisches Mauerwerk)', on: ['aussenputz'] },
      { k: 'wdvs', n: 'WDVS mit Putz', on: ['wdvs', 'aussenputz'] },
      { k: 'klinker', n: 'Klinker / Verblendmauerwerk', on: ['klinker'] },
      { k: 'vhf', n: 'Vorgehängte hinterlüftete Fassade', on: ['vhf'] },
      { k: 'holz', n: 'Holzfassade', on: ['holzfassade'] },
      { k: 'keine', n: 'keine Fassadenarbeiten', on: [] } ] },
    { k: 'fenster', ph: 'huelle', n: 'Fenster', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'energ', 'whg_reno', 'dg'], opts: [
      { k: 'kunststoff', n: 'Kunststofffenster', on: [] },
      { k: 'holz', n: 'Holzfenster', on: [], ovr: { fenster_neu: { n: 'Holzfenster und Außentüren einbauen' }, fenster: { n: 'Holzfenster erneuern' } } },
      { k: 'holzalu', n: 'Holz-Alu-Fenster', on: [], ovr: { fenster_neu: { n: 'Holz-Alu-Fenster und Außentüren einbauen' }, fenster: { n: 'Holz-Alu-Fenster erneuern' } } },
      { k: 'alu', n: 'Aluminiumfenster', on: [], ovr: { fenster_neu: { n: 'Aluminiumfenster und Außentüren einbauen', din: '18360' }, fenster: { n: 'Aluminiumfenster erneuern', din: '18360' } } } ] },
    { k: 'pv', ph: 'huelle', n: 'Photovoltaik', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'energ'], opts: [
      { k: 'none', n: 'keine PV-Anlage', on: [] },
      { k: 'pv', n: 'PV-Anlage', on: ['pv'] },
      { k: 'pvs', n: 'PV-Anlage mit Batteriespeicher', on: ['pv'], ovr: { pv: { n: 'Photovoltaikanlage mit Batteriespeicher montieren' } }, mul: { pv: 1.35 } } ] },
    { k: 'heizung', ph: 'tga_roh', n: 'Wärmeerzeuger', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'energ'], opts: [
      { k: 'keep', n: 'keine / unverändert (vorhandener Wärmeerzeuger bleibt)', on: [] },
      { k: 'wp_luft', n: 'Luft-Wasser-Wärmepumpe', on: ['waermeerz'], ovr: { waermeerz: { n: 'Luft-Wasser-Wärmepumpe aufstellen' } } },
      { k: 'wp_sole', n: 'Sole-Wärmepumpe mit Erdsonden', on: ['waermeerz', 'erdsonde'], ovr: { waermeerz: { n: 'Sole-Wasser-Wärmepumpe montieren', a: ['erdsonde', 'dicht', 'hak', 'entk', 'be'] } } },
      { k: 'gas', n: 'Gas-Brennwerttherme', on: ['waermeerz'], ovr: { waermeerz: { n: 'Gas-Brennwerttherme montieren', d: 2 } } },
      { k: 'fern', n: 'Fernwärme', on: ['waermeerz'], ovr: { waermeerz: { n: 'Fernwärme-Übergabestation', d: 2 } } },
      { k: 'pellet', n: 'Pelletkessel', on: ['waermeerz'], ovr: { waermeerz: { n: 'Pelletkessel und Pelletlager', d: 5 } } } ] },
    { k: 'lueftung', ph: 'tga_roh', n: 'Lüftung', types: [...UMB, ...NB, 'kern_efh', 'san_mfh'], opts: [
      { k: 'fenster', n: 'Fensterlüftung', on: [] },
      { k: 'dez', n: 'Dezentrale Lüftungsgeräte', on: ['lueft', 'lueft_fein'], ovr: { lueft: { n: 'Dezentrale Lüftung: Wanddurchführungen, Rohmontage', d: 2 }, lueft_fein: { n: 'Dezentrale Lüftungsgeräte montieren' } } },
      { k: 'kwl', n: 'Zentrale Lüftung mit Wärmerückgewinnung', on: ['lueft', 'lueft_fein'] } ] },
    { k: 'waermevert', ph: 'ausbau', n: 'Wärmeverteilung', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'dg'], opts: [
      { k: 'fbh', n: 'Fußbodenheizung', on: ['fbh'], ovr: { hz_fein: { n: 'Heizkreisverteiler, Inbetriebnahme Heizung' } } },
      { k: 'hk', n: 'Heizkörper', on: [], ovr: { hz_fein: { n: 'Heizkörper montieren, Inbetriebnahme Heizung' } } } ] },
    { k: 'estrichart', ph: 'ausbau', n: 'Estrich', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'whg_reno', 'bad', 'dg'], opts: [
      { k: 'ze', n: 'Zementestrich', on: ['estr_tr'] },
      { k: 'ca', n: 'Calciumsulfat-Fließestrich', on: ['estr_tr'], ovr: { estrich: { n: 'Calciumsulfat-Fließestrich einbringen' } }, mul: { estr_tr: 0.75 } },
      { k: 'te', n: 'Trockenestrich – ohne Trocknungszeit', on: [], ovr: { estrich: { n: 'Trockenestrich verlegen' } }, mul: { estrich: 1.5 } } ] },
    { k: 'innenwand', ph: 'ausbau', n: 'Wände und Decken innen', types: [...UMB, ...NB, 'kern_efh', 'dg'], opts: [
      { k: 'putz', n: 'Innenputz (Massivwände)', on: ['putz'] },
      { k: 'tb', n: 'Trockenbau (Gipskarton)', on: ['trocken'] },
      { k: 'both', n: 'Innenputz und Trockenbau', on: ['putz', 'trocken'] } ] },
    { k: 'bodenbelag', ph: 'ausbau', n: 'Bodenbelag', types: [...UMB, ...NB, 'kern_efh', 'san_mfh', 'whg_reno', 'dg'], opts: [
      { k: 'parkett', n: 'Parkett', on: ['boden', 'sockel'], ovr: { boden: { n: 'Parkett verlegen', din: '18356' } } },
      { k: 'massiv', n: 'Massivparkett (vor Ort geschliffen, geölt)', on: ['boden', 'parkett_ob', 'sockel'], ovr: { boden: { n: 'Massivparkett verlegen', din: '18356' } } },
      { k: 'vinyl', n: 'Vinyl / Designbelag', on: ['boden', 'sockel'], ovr: { boden: { n: 'Vinyl-/Designbelag verlegen', din: '18365' } }, mul: { boden: 0.7 } },
      { k: 'teppich', n: 'Teppich', on: ['boden'], ovr: { boden: { n: 'Teppichboden verlegen', din: '18365' } }, mul: { boden: 0.6 } },
      { k: 'fliesen', n: 'Fliesen in allen Räumen', on: [], mul: { fliesen: 2 } } ] },
  ];
  // Ingenieur / Planung: in allen Gebäudetypen unter „Weitere Leistungen“ (Neubau-Leistungen nur, wo es eine Gründung gibt)
  const ING = ['baugen', 'planfrei', 'statik', 'pruefing', 'einmess', 'abn'];
  profiles.forEach((p) => { if (Array.isArray(p.opt)) ING.forEach((id) => { if (!p.opt.includes(id) && !(p.rec || []).includes(id)) p.opt.push(id); }); });
  // Erweiterung 15.11.2026: je Bauart optional angeboten (N Neubau, U Umbau/Sanierung, W Wohnung, B Bad, D Dachgeschoss, E energetisch)
  const ZUSATZ_TYP = { N: ['neubau_efh', 'neubau_mfh'], U: ['kern_efh', 'san_mfh', 'umbau_efh', 'umbau_mfh'], W: ['whg_reno'], B: ['bad'], D: ['dg'], E: ['energ'] };
  const ZUSATZ = {
    N: 'bauantr baugrund sige geg brandkonz pruefstat werkpl beweis sohle richtfest rohabn blower schlussabn energieausw bauzaun baustrom kran baustr container verkehr baumschutz kampfm abbruch_ges entsorg roden oberboden wasserh verbau pfahl bodenaust sauber wu kanal zisterne lichtsch innenw stuetzen fertigt stahlbau ringanker schacht bohr brandw stahltr lattung flachdach attika lichtkuppel haustuer pr_fassade wintergarten tor fensteranschl sockel_a balkon_abd insekt gas fernw solar speicher vorwand hebe sprinkler zaehler netz bma sibe knx klima rohrdaemm schott druckpr brandbekl akustik revision naturstein teppich beschicht lack holztreppe glaswand t30 schliess kellertr hydr rwm wallbox eprue tw_spuel klima_fein knx_ib aufzug_abn asphalt stellpl mauer_a entw_a muell spiel baeume bewaess pflege vorabn maengel fensterrein einweis doku be_ab schluessel',
    U: 'bauantr baugrund sige geg brandkonz pruefstat werkpl beweis rohabn blower schlussabn energieausw bauzaun baustrom container verkehr baumschutz fenster_ab estrich_ab putz_ab tga_ab schorn_ab entsorg roden verbau pfahl kanal zisterne lichtsch innenw stuetzen fertigt stahlbau ringanker schacht bohr brandw stahltr lattung flachdach gaube attika lichtkuppel oberste haustuer pr_fassade wintergarten tor fensteranschl laibung sockel_a balkon_abd insekt gas fernw solar speicher vorwand hebe sprinkler zaehler netz bma sibe knx klima rohrdaemm schott druckpr innendaemm trockestr brandbekl akustik revision beiputz naturstein teppich beschicht lack holztreppe glaswand t30 schliess kellertr hydr rwm wallbox eprue tw_spuel klima_fein knx_ib aufzug_abn asphalt stellpl mauer_a entw_a muell spiel baeume bewaess pflege vorabn maengel fensterrein einweis doku be_ab schluessel',
    W: 'container fenster_ab estrich_ab putz_ab tga_ab entsorg bohr insekt vorwand zaehler netz knx druckpr innendaemm trockestr akustik revision beiputz naturstein teppich lack glaswand schliess rwm eprue tw_spuel knx_ib vorabn maengel fensterrein einweis doku be_ab schluessel',
    B: 'estrich_ab putz_ab tga_ab entsorg speicher vorwand druckpr revision beiputz naturstein glaswand eprue tw_spuel vorabn maengel doku be_ab schluessel',
    D: 'bauantr geg brandkonz blower schlussabn container entsorg lattung gaube fensteranschl insekt vorwand netz klima schott druckpr innendaemm trockestr brandbekl revision beiputz teppich lack holztreppe rwm eprue klima_fein vorabn maengel fensterrein doku be_ab schluessel',
    E: 'sige geg werkpl blower energieausw bauzaun container verkehr fenster_ab lattung flachdach attika lichtkuppel oberste haustuer fensteranschl laibung sockel_a insekt gas fernw solar speicher rohrdaemm innendaemm beiputz hydr wallbox vorabn maengel einweis doku be_ab',
  };
  Object.entries(ZUSATZ).forEach(([t, ids]) => ZUSATZ_TYP[t].forEach((k) => { const p = profiles.find((x) => x.k === k); if (p && Array.isArray(p.opt)) ids.split(' ').forEach((id) => { if (!p.opt.includes(id) && !(p.rec || []).includes(id)) p.opt.push(id); }); }));
  // Standard je Bauart (15.11.2026 geprüft): was praktisch immer anfällt, wird vorausgewählt – der Rest bleibt unter „Weitere Leistungen“
  const NB_STD = 'bauantr baugrund geg sige bauzaun baustrom container oberboden sauber kanal innenw ringanker haustuer fensteranschl sockel_a zaehler netz vorwand speicher druckpr beiputz hydr rwm eprue tw_spuel blower energieausw vorabn maengel einweis doku be_ab schluessel';
  const SAN_STD = 'sige container entsorg tga_ab estrich_ab vorwand zaehler druckpr beiputz rwm eprue vorabn maengel doku be_ab';
  const STANDARD = {
    neubau_efh: NB_STD,
    neubau_mfh: NB_STD + ' kran baustr brandkonz pruefstat werkpl stuetzen schott rohrdaemm t30 schliess kellertr stellpl muell spiel entw_a baeume pflege',
    kern_efh: SAN_STD + ' fenster_ab hydr', san_mfh: SAN_STD + ' fenster_ab hydr',
    umbau_efh: SAN_STD + ' bauantr geg kanal fensteranschl schluessel', umbau_mfh: SAN_STD + ' bauantr geg kanal fensteranschl schluessel',
    whg_reno: 'entsorg tga_ab vorwand druckpr beiputz rwm eprue vorabn maengel be_ab schluessel',
    bad: 'entsorg tga_ab estrich_ab vorwand druckpr revision vorabn maengel',
    dg: 'bauantr geg fensteranschl druckpr rwm eprue vorabn maengel be_ab',
    energ: 'geg energieausw fenster_ab fensteranschl laibung sockel_a hydr vorabn maengel doku',
  };
  Object.entries(STANDARD).forEach(([k, ids]) => { const p = profiles.find((x) => x.k === k); if (!p) return;
    ids.split(' ').forEach((id) => { if (!p.rec.includes(id)) p.rec.push(id); if (Array.isArray(p.opt)) p.opt = p.opt.filter((x) => x !== id); }); });
  /* =====================================================================
     Bauart in drei Ebenen (15.11.2026): Gebäude (eines) × Maßnahmen (mehrere) × Bereiche (optional) + Denkmal.
     Die Kombination steht im Typ, z. B. „k:ef:an.um.es:da.fa:d“ (plankern.js: kombiProfil). Leistungen kommen aus den
     bisherigen Gebäudetypen (base) – was das Büro dort einrichtet, gilt auch hier – plus Standard und Angebot je Gebäude.
       geb: k Kürzel · n Name · ic · desc · fl 'wf' Wohnfläche oder 'bgf' · h Geschosshöhe · wand m² Wandfläche je m² Fläche
            groesse 'efh'|'mfh' (welcher Grundtyp) · eigen: eigener Neubau statt Wohn-Neubau · area/units/floors/naming Vorgaben
            std = zusätzlich Standard · opt = zusätzlich angeboten · weg = vom Standard nach „Weitere Leistungen“
       mass: base je Größe (efh/mfh) · erw (anbau/aufstock) · neu (ohne Bestandszuschlag) · std/opt eigene Leistungen
       ber: Leistungen des Bereichs (ids und Phasen); gewählt = nur diese Bereiche (+ Planung, Vorbereitung, Abschluss)
     ===================================================================== */
  const W_WEG = 'estrich estr_tr fbh fliesen_vb fliesen parkett_ob parkett_alt boden boden_vorb tapete spachtel_wd kueche einbau bad_moebel dusche_glas bad_acc silikon treppe_belag fensterbank_i balkon gel_aus briefk terrasse garten markise spiel';
  const NWG_STD = 'brandkonz pruefstat t30 sibe bma rwm leitsys tpruef';
  const N_WEG = 'kueche einbau bad_moebel dusche_glas bad_acc balkon gel_aus briefk terrasse garten markise spiel tapete parkett_ob parkett_alt treppe_belag';   // Wohn-Ausstattung
  const kombi = {
    geb: [
      { k: 'ef', n: 'Ein-/Zweifamilienhaus', ic: '🏠', desc: 'auch Doppel-, Reihenhaus', fl: 'wf', h: 2.9, wand: 2.8, groesse: 'efh', area: 140, units: 1, floors: 2, naming: 'whg', std: '', opt: '', weg: '' },
      { k: 'mf', n: 'Mehrfamilienhaus', ic: '🏢', desc: 'Wohnungen, Wohnanlage', fl: 'wf', h: 2.9, wand: 2.8, groesse: 'mfh', area: 480, units: 6, floors: 3, naming: 'whg', std: '', opt: '', weg: '' },
      { k: 'wg', n: 'Wohn- und Geschäftshaus', ic: '🏬', desc: 'Laden/Praxis unten, Wohnen oben', fl: 'wf', h: 3.1, wand: 2.6, groesse: 'mfh', area: 600, units: 5, floors: 4, naming: 'gesch',
        std: 'schaufenster brandkonz t30 teekueche', opt: 'fettabsch gewkueche klima zutritt sibe', weg: 'spiel' },
      { k: 'bu', n: 'Büro / Verwaltung', ic: '🏛️', desc: 'Büro, Rathaus, Praxis', fl: 'bgf', h: 3.5, wand: 2.0, groesse: 'mfh', area: 1200, units: 3, floors: 3, naming: 'ge',
        std: NWG_STD + ' akustik netz teekueche sonnenschutz aufzug aufzug_abn schliess zutritt', opt: 'doppelboden systemtw klima knx knx_ib sprinkler ela', weg: N_WEG },
      { k: 'sc', n: 'Schule / Kita', ic: '🏫', desc: 'Bildung, Betreuung', fl: 'bgf', h: 3.6, wand: 2.2, groesse: 'mfh', area: 2500, units: 2, floors: 2, naming: 'ba',
        std: NWG_STD + ' akustik netz ela lueft lueft_fein sonnenschutz aufzug aufzug_abn sondereinb spiel teekueche rampe', opt: 'gewkueche fettabsch zutritt knx', weg: N_WEG.replace(' spiel', '') },
      { k: 'pf', n: 'Pflege / Gesundheit', ic: '🏥', desc: 'Heim, Klinik, betreutes Wohnen', fl: 'bgf', h: 3.2, wand: 2.6, groesse: 'mfh', area: 3000, units: 3, floors: 3, naming: 'ge',
        std: NWG_STD + ' ruf aufzug aufzug_abn lueft lueft_fein schliess teekueche rampe vorwand', opt: 'sprinkler gewkueche fettabsch zutritt knx', weg: 'spiel balkon gel_aus' },
      { k: 'ha', n: 'Halle / Gewerbe', ic: '🏭', desc: 'Werkstatt, Lager, Produktion', fl: 'bgf', h: 8, wand: 0.6, groesse: 'mfh', eigen: 1, area: 1500, units: 1, floors: 1, naming: 'ba',
        std: 'brandkonz pruefstat lichtkuppel sibe tor indboden hallenhz anliefer', opt: 'kranbahn druckluft sprinkler bma zutritt teekueche', weg: W_WEG },
      { k: 'hg', n: 'Handel / Gastro / Hotel', ic: '🛒', desc: 'Markt, Restaurant, Beherbergung', fl: 'bgf', h: 3.5, wand: 1.8, groesse: 'mfh', area: 1500, units: 2, floors: 2, naming: 'ba',
        std: NWG_STD + ' gewkueche fettabsch kuehlz klima lueft lueft_fein schaufenster', opt: 'sprinkler zutritt ela aufzug aufzug_abn anliefer', weg: N_WEG },
      { k: 'so', n: 'Sonderbau / Sonstiges', ic: '🐾', desc: 'Tierheim, Feuerwehr, Sport, Kirche', fl: 'bgf', h: 3.5, wand: 2.0, groesse: 'mfh', area: 800, units: 2, floors: 1, naming: 'ba',
        std: 'brandkonz pruefstat t30 sibe rwm sondereinb leitsys', opt: 'bma ela tor indboden hallenhz teekueche gewkueche fettabsch zutritt rampe', weg: 'spiel balkon gel_aus briefk' },
      { k: 'ga', n: 'Garage / Tiefgarage', ic: '🚗', desc: 'auch Carport, Parkhaus', fl: 'bgf', h: 2.8, wand: 0.3, groesse: 'mfh', eigen: 1, area: 1000, units: 1, floors: 1, naming: 'ba',
        std: 'brandkonz tg_zufahrt wu beschicht co_warn lueft lueft_fein sibe tor stellpl entw_a', opt: 'verbau wasserh gruendach sprinkler zutritt', weg: W_WEG },
      { k: 'lw', n: 'Landwirtschaft', ic: '🌾', desc: 'Stall, Scheune, Maschinenhalle', fl: 'bgf', h: 6, wand: 0.5, groesse: 'mfh', eigen: 1, area: 1200, units: 1, floors: 1, naming: 'ba',
        std: 'stahlhalle trapezdach tor stalltech guelle', opt: 'holzfassade sandwich indboden pv druckluft', weg: W_WEG },
    ],
    // eigener Neubau für Hallen, Garagen, Landwirtschaft (statt Wohn-Neubau)
    eigenNeu: {
      ha: 'baugen planfrei statik pruefing einmess abn be verm aushub grundl grund stahlhalle trapezdach sandwich dicht hak el_roh san_roh el_fein san_fein trocken maler aussenanl asphalt stellpl entw_a reinig',
      ga: 'baugen planfrei statik pruefing abn be verm aushub grundl grund stuetzen fertigt flachdach hak el_roh el_fein reinig aussenanl',
      lw: 'baugen planfrei statik abn be verm aushub grundl grund hak el_roh el_fein aussenanl reinig',
    },
    mass: [
      { k: 'nb', n: 'Neubau', base: { efh: 'neubau_efh', mfh: 'neubau_mfh' }, neu: 1 },
      { k: 'an', n: 'Anbau / Erweiterung', base: { efh: 'umbau_efh', mfh: 'umbau_mfh' }, erw: 'anbau' },
      { k: 'au', n: 'Aufstockung', base: { efh: 'umbau_efh', mfh: 'umbau_mfh' }, erw: 'aufstock' },
      { k: 'um', n: 'Umbau / Umnutzung', base: { efh: 'whg_reno', mfh: 'whg_reno' }, std: 'nutzaend wand_ab durchbr statik', ohneOvr: 1 },
      { k: 'ks', n: 'Kernsanierung', base: { efh: 'kern_efh', mfh: 'san_mfh' } },
      { k: 'es', n: 'Energetische Sanierung', base: { efh: 'energ', mfh: 'energ' } },
      { k: 'is', n: 'Instandsetzung', base: {}, std: 'be schutz putz beiputz maler boden_vorb boden sockel reinig vorabn maengel', opt: 'fenster fliesen tischler dach_deck klempner aussenputz' },
      { k: 'ia', n: 'Innenausbau / Mieterausbau', base: {}, std: 'be schutz trocken decke_abh el_roh el_fein san_roh san_fein estrich estr_tr maler boden sockel tischler reinig vorabn maengel', opt: 'akustik doppelboden systemtw lueft lueft_fein klima teekueche fliesen' },
      { k: 'ab', n: 'Abbruch / Rückbau', base: {}, neu: 1, std: 'bauzaun be schad abbruch_ges entsorg verfuell', opt: 'kampfm beweis tga_ab roden baumschutz' },
    ],
    ber: [
      { k: 'ke', n: 'Keller', ids: 'keller keller_abd verfuell bk_frei bk_abd bk_drain bk_verf bk_hsp bk_tr bk_ausbau lichtsch kellertr hebe unterfang' },
      { k: 'da', n: 'Dach / Dachgeschoss', ids: 'zimmer dach_deck dach_daemm dampfsp lattung flachdach gruendach klempner dachfenster dach_zub gaube oberste lichtkuppel attika pv solar dach_ab notdach blitzschutz schornstein trapezdach geruest geruest_ab', prof: 'dg' },
      { k: 'fa', n: 'Fassade', ids: 'geruest geruest_ab wdvs klinker vhf holzfassade aussenputz sockel_a laibung fensterbank_a sonnenschutz pr_fassade sandwich insekt' },
      { k: 'fe', n: 'Fenster', ids: 'fenster fenster_neu fenster_ab fensteranschl fensterbank_a fensterbank_i haustuer sonnenschutz insekt beiputz laibung schaufenster' },
      { k: 'ba', n: 'Bäder', prof: 'bad', profRec: 1, ids: 'vorwand speicher' },
      { k: 'ku', n: 'Küchen', ids: 'kueche teekueche gewkueche fettabsch kuehlz san_roh el_roh san_fein el_fein fliesen maler lueft lueft_fein' },
      { k: 'tg', n: 'Heizung / Lüftung / Elektro', ph: 'tga_roh tga_fein', ids: 'hydr' },
      { k: 'br', n: 'Brandschutz ertüchtigen', ids: 'brandkonz schott t30 brandbekl bma sibe sprinkler lichtkuppel brandw rwm tpruef ela' },
      { k: 'bf', n: 'Barrierefrei / Aufzug', ids: 'aufzug schacht aufzug_abn rampe vorwand tischler' },
      { k: 'sd', n: 'Schadstoffe', ids: 'schad entsorg tga_ab entk' },
      { k: 'ah', n: 'Außenanlagen', ph: 'aussen', ids: '' },
      { k: 'ti', n: 'Tiefgarage', ids: 'tg_zufahrt wu beschicht co_warn lueft lueft_fein stellpl entw_a verbau wasserh' },
    ],
    denkmal: { std: 'denkmal_erl befund bemuster denkmal_doku', zuschlag: 1.4 },
    immer: 'planung vorb abschluss',   // Phasen, die bei gewählten Bereichen immer dabei sind
    // nur mit Neubau, Anbau oder Aufstockung Standard – bei reinen Bestandsmaßnahmen nur angeboten
    nurNeu: 'pruefstat bauantr baugrund stahlhalle trapezdach sandwich indboden hallenhz anliefer guelle stalltech tg_zufahrt wu tor stellpl entw_a kranbahn schaufenster aufzug aufzug_abn spiel',
  };
  return { phases, items, profiles, choices, kombi, ref: { bau: 140, we: 80 } };
})();

/* =====================================================================
   VOB/C – Allgemeine Technische Vertragsbedingungen (ATV DIN 18299 ff.)
   für die Gewerk-Vorschläge bei eigenen Leistungen: [DIN, Titel, Gewerk, Stichworte]
   ===================================================================== */
window.DIN_ATV = [
  ['18299', 'Allgemeine Regelungen für Bauarbeiten jeder Art', 'Bauleitung', 'baustelleneinrichtung einrichtung räumung schutz reinigung allgemein container bauzaun'],
  ['18300', 'Erdarbeiten', 'Erdbau', 'erdarbeiten aushub baugrube boden verfüllen verfüllung oberboden mutterboden abtrag auftrag planum erdreich'],
  ['18301', 'Bohrarbeiten', 'Spezialtiefbau', 'bohrung bohrarbeiten erdwärme sonde brunnen'],
  ['18303', 'Verbauarbeiten', 'Spezialtiefbau', 'verbau berliner spundwand baugrubenverbau'],
  ['18305', 'Wasserhaltungsarbeiten', 'Erdbau', 'wasserhaltung grundwasser absenkung pumpe'],
  ['18306', 'Entwässerungskanalarbeiten', 'Tiefbau', 'kanal entwässerungskanal hausanschluss kanalanschluss schacht'],
  ['18308', 'Drän- und Versickerarbeiten', 'Tiefbau', 'drainage drän dränage versickerung rigole'],
  ['18318', 'Pflasterdecken und Plattenbeläge, Einfassungen', 'Außenanlagen', 'pflaster pflasterarbeiten terrasse weg zufahrt einfahrt hof platten randstein bordstein'],
  ['18320', 'Landschaftsbauarbeiten', 'Außenanlagen', 'garten landschaftsbau begrünung pflanzen rasen hecke bepflanzung zaun'],
  ['18322', 'Kabelleitungstiefbauarbeiten', 'Tiefbau', 'kabelgraben leerrohr tiefbau kabel erdkabel'],
  ['18330', 'Mauerarbeiten', 'Rohbau', 'mauer mauerwerk mauern wand wände durchbruch durchbrüche sturz schornstein kamin vermauern zumauern untermauern'],
  ['18331', 'Betonarbeiten', 'Rohbau', 'beton betonarbeiten decke bodenplatte fundament stahlbeton treppe unterzug stütze schalung bewehrung'],
  ['18332', 'Naturwerksteinarbeiten', 'Naturstein', 'naturstein marmor granit fensterbank treppenbelag werkstein'],
  ['18333', 'Betonwerksteinarbeiten', 'Naturstein', 'betonwerkstein terrazzo werkstein'],
  ['18334', 'Zimmer- und Holzbauarbeiten', 'Zimmerer', 'zimmerer dachstuhl holzbau sparren balken gaube gauben carport holzrahmen aufsparren'],
  ['18335', 'Stahlbauarbeiten', 'Stahlbau', 'stahlbau stahlträger träger stahlkonstruktion abfangung hea heb'],
  ['18336', 'Abdichtungsarbeiten', 'Abdichtung', 'abdichtung kellerabdichtung bitumen perimeter horizontalsperre bauwerksabdichtung'],
  ['18338', 'Dachdeckungs- und Dachabdichtungsarbeiten', 'Dach', 'dach dachdecker eindeckung ziegel dachabdichtung flachdach dachfenster dachdämmung'],
  ['18339', 'Klempnerarbeiten', 'Klempner', 'klempner dachrinne rinne fallrohr blech verwahrung attika abdeckung kehle'],
  ['18340', 'Trockenbauarbeiten', 'Trockenbau', 'trockenbau rigips gipskarton ständerwand vorsatzschale abhangdecke abgehängte decke trennwand akustikdecke'],
  ['18345', 'Wärmedämm-Verbundsysteme', 'Fassade', 'wdvs wärmedämmverbundsystem fassadendämmung außendämmung'],
  ['18350', 'Putz- und Stuckarbeiten', 'Putz', 'putz innenputz außenputz stuck verputzen gips kalkputz spachtel schlitze'],
  ['18351', 'Vorgehängte hinterlüftete Fassaden', 'Fassade', 'vorgehängte fassade hinterlüftet fassadenbekleidung verkleidung'],
  ['18352', 'Fliesen- und Plattenarbeiten', 'Fliesen', 'fliesen fliesenarbeiten wandfliesen bodenfliesen naturstein bad küchenspiegel platten'],
  ['18353', 'Estricharbeiten', 'Estrich', 'estrich zementestrich anhydrit fließestrich trittschall ausgleich'],
  ['18354', 'Gussasphaltarbeiten', 'Estrich', 'gussasphalt asphaltestrich'],
  ['18355', 'Tischlerarbeiten', 'Tischler', 'tischler schreiner innentür türen zarge einbauschrank möbel fenster holzfenster haustür treppe holztreppe'],
  ['18356', 'Parkett- und Holzpflasterarbeiten', 'Bodenbelag', 'parkett dielen holzboden schleifen versiegeln sockelleisten'],
  ['18357', 'Beschlagarbeiten', 'Tischler', 'beschlag beschläge drücker schloss'],
  ['18358', 'Rollladenarbeiten', 'Fenster', 'rollladen rollläden raffstore sonnenschutz jalousie markise'],
  ['18360', 'Metallbauarbeiten', 'Metallbau', 'metallbau geländer handlauf schlosser stahltür alufenster aluminium vordach balkon gitter tor'],
  ['18361', 'Verglasungsarbeiten', 'Fenster', 'verglasung glas glaser duschwand spiegel'],
  ['18363', 'Maler- und Lackierarbeiten – Beschichtungen', 'Maler', 'maler malerarbeiten anstrich streichen lackieren spachteln beschichtung'],
  ['18365', 'Bodenbelagarbeiten', 'Bodenbelag', 'bodenbelag vinyl linoleum teppich pvc designbelag laminat'],
  ['18366', 'Tapezierarbeiten', 'Maler', 'tapezieren tapete raufaser vlies'],
  ['18379', 'Raumlufttechnische Anlagen', 'Lüftung', 'lüftung lüftungsanlage klima klimaanlage kwl abluft zuluft ventilator'],
  ['18380', 'Heizanlagen und zentrale Wassererwärmungsanlagen', 'Heizung', 'heizung heizkörper fußbodenheizung wärmepumpe kessel therme warmwasser speicher solar thermie'],
  ['18381', 'Gas-, Wasser- und Entwässerungsanlagen innerhalb von Gebäuden', 'Sanitär', 'sanitär wasser abwasser gas leitung wc waschtisch dusche badewanne armatur vorwand installation hebeanlage'],
  ['18382', 'Elektro- und sicherheitstechnische Anlagen', 'Elektro', 'elektro strom kabel steckdose schalter leuchte licht verteiler zählerschrank unterverteilung rauchmelder netzwerk klingel sprechanlage photovoltaik pv wallbox'],
  ['18384', 'Blitzschutzanlagen', 'Elektro', 'blitzschutz erdung fundamenterder potentialausgleich'],
  ['18385', 'Förderanlagen, Aufzugsanlagen, Fahrtreppen', 'Aufzug', 'aufzug lift fahrstuhl treppenlift'],
  ['18386', 'Gebäudeautomation', 'Elektro', 'gebäudeautomation smarthome smart home knx bus steuerung'],
  ['18421', 'Dämm- und Brandschutzarbeiten an technischen Anlagen', 'Dämmung', 'rohrdämmung brandschutz brandschott abschottung dämmung leitungen'],
  ['18451', 'Gerüstarbeiten', 'Gerüst', 'gerüst gerüstbau fassadengerüst rollgerüst'],
  ['18459', 'Abbruch- und Rückbauarbeiten', 'Abbruch', 'abbruch rückbau abriss entkernung demontage ausbau entfernen schadstoff asbest entsorgung'],
];
