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
    { id: 'be', ph: 'vorb', n: 'Baustelleneinrichtung', gw: 'Bauleitung', sc: 'bau', d: 2, fix: 1, a: ['start'] },
    { id: 'statik', ph: 'vorb', n: 'Statik / Tragwerksplanung freigegeben', gw: 'Bauleitung', sc: 'bau', ms: 1, a: ['start'] },
    { id: 'schutz', ph: 'vorb', n: 'Schutzmaßnahmen, Staubschutzwände', gw: 'Bauleitung', sc: 'we', d: 1, fix: 1, a: ['be'] },
    { id: 'verm', ph: 'vorb', n: 'Vermessung / Schnurgerüst', gw: 'Vermessung', sc: 'bau', d: 1, fix: 1, nb: 1, a: ['be'] },
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
  ];

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
      { k: 'sattel', n: 'Satteldach', on: ['zimmer'] },
      { k: 'walm', n: 'Walmdach', on: ['zimmer'], mul: { zimmer: 1.3, dach_deck: 1.25, klempner: 1.2 } },
      { k: 'pult', n: 'Pultdach', on: ['zimmer'], mul: { zimmer: 0.8, dach_deck: 0.85 } },
      // Flachdach: erst Dampfsperre und Dämmung (Warmdach), dann die Abdichtung – Dämmung bleibt eine eigene Leistung
      { k: 'flach', n: 'Flachdach', on: ['dach_daemm'], ovr: { dach_deck: { n: 'Dachabdichtung Flachdach', din: '18336', a: ['schornstein', 'dachfenster', 'zimmer', 'dach_daemm', 'geruest', 'be'] },
        dach_daemm: { n: 'Flachdach: Dampfsperre und Wärmedämmung (Gefälle)', din: '18336', a: ['zimmer', 'mauer', 'holz_mont', 'geruest', 'be'] }, klempner: { n: 'Klempnerarbeiten (Attika, Abläufe)' } } } ] },
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
  return { phases, items, profiles, choices, ref: { bau: 140, we: 80 } };
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
