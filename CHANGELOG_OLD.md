# Older changes

> Änderungen bis 0.12.0 (auf Deutsch). Neuere Einträge stehen im [README](README.md#changelog).

### 0.12.0 (2026-11-14)

- (Exc3pt10n) Farbiges Licht für Farblampen (z. B. Hue Color Ambiance mit `hue` oder `hue-v2`, Zigbee, Tasmota): in der Lampen-Ansicht Umschalter „Weiß | Farbe“ (startet im aktuellen Farbmodus der Lampe), Farbfelder für die schnelle Wahl sowie Farbton und Sättigung; eine ausgeschaltete Lampe wird dabei eingeschaltet. SmartVis nutzt Farbton/Sättigung, die Hex-Farbe oder notfalls R/G/B – je nachdem, was die Lampe anbietet

- (Exc3pt10n) Kamera-Einstellungen (eusec) in der Kamera-Ansicht: Erkennung, Aufnahme, Bild & Ton und Benachrichtigungen – gruppiert, auf Deutsch und nur, was die Kamera anbietet; Untereinstellungen erscheinen nur, wenn sie wirken (z. B. Empfindlichkeit bei eingeschalteter Bewegungserkennung, Clip-Länge im Energiemodus „Benutzerdefiniert“)

### 0.11.0 (2026-11-14)

- (Exc3pt10n) Startseite nach Dringlichkeit: frische Kamera-Erkennung vor dem Wetter, dann offene Fenster, Lichter, Klima, Medien, zuletzt Störungen und Batterien (eigene Anordnungen bleiben erhalten); der Hinweis „Geräte ohne Raum“ steht dezent am Seitenende
- (Exc3pt10n) Kennzahlen: Warnungen zuerst und farbig hinterlegt, Nullwerte ausgeblendet, höchstens zwei Reihen mit „+N weitere“, Beschriftungen zweizeilig statt abgeschnitten, gezeichnete Symbole statt Emojis; die Sicherheits-Kennzahl heißt „Modus · …“
- (Exc3pt10n) Raumkarten mit einheitlicher Fußzeile (Geräte und Kameras – statt „0 Geräte“ bei Räumen nur mit Kamera)
- (Exc3pt10n) Eingeschaltete Lichter auch auf dem Handy kompakt (Raumzeile mit „Alle aus“, Lampen beim Aufklappen)
- (Exc3pt10n) Rollladen-Detail mit Auf · Stopp · Zu; ohne eigenen Stopp-Datenpunkt hält der Rollladen an der aktuellen Position an
- (Exc3pt10n) Desktop-Startseite als Mauerwerk: Karten rücken in Lücken nach, Lichter in einer Spalte
- (Exc3pt10n) Energie auf dem Handy: Energiezähler und Verlauf zunächst eingeklappt (Antippen im Energiefluss öffnet den Verlauf)
- (Exc3pt10n) Beschattung: Filter „Nur abweichende“ (nicht ganz offen oder Automatik aus)
- (Exc3pt10n) Einmaliger Tipp zum Bearbeiten-Modus; Knöpfe mit gezeichneten Symbolen; Nebentexte größer und kontrastreicher

- (Exc3pt10n) Neuer Bereich „Sicherheit“: Sicherheitsmodus aller Stationen auf einmal (Zuhause · Abwesend · Aus), Alarm-Banner, Kameras, Ereignis-Zeitleiste nach Tagen, Melder, Fenster & Türen und Bewegungsmelder; auf dem Handy in der Navigationsleiste, „Beschattung“ dann unter „Mehr“
- (Exc3pt10n) Startseite: Kennzahl mit Sicherheitsmodus und jüngster Erkennung (Antippen öffnet Sicherheit), Karte „Gerade erkannt“ nur bei frischer Erkennung (bis 10 Minuten)
- (Exc3pt10n) Kameras (eufy Security über `eusec`): Kamera-Kacheln mit dem letzten Ereignisbild im Bereich Sicherheit und in den Räumen; erkannte Bewegung oder Person ist hervorgehoben, ausgeschaltete (Privatmodus) und Offline-Kameras sind gekennzeichnet
- (Exc3pt10n) Kamera-Detailansicht: großes Bild mit Zeitpunkt, Livestream über die go2rtc-Seite des eusec-Adapters (wird beim Schließen beendet), Kamera an/aus, Licht, Schwenken der Innenkameras und Sicherheitsmodus der Station (Zuhause, Abwesend, Deaktiviert …); ein Alarm erscheint auf der Kamerakarte
- (Exc3pt10n) Livestream mit Ton: go2rtc wird mit MSE/HLS geöffnet (WebRTC überträgt den AAC-Ton der eufy-Kameras nicht)
- (Exc3pt10n) Livestream bricht nicht mehr ab, wenn der Adapter ein neues Model schickt (z. B. nach einer Neu-Erkennung oder wenn sich ein weiteres Gerät anmeldet); endet der Stream nach der Höchstdauer von eusec, zeigt SmartVis das an und bietet „Weiter ansehen“
- (Exc3pt10n) Letzte Ereignisse: SmartVis merkt sich jede Erkennung mit dem zugehörigen Ereignisbild (je Kamera bis zu 30, höchstens 7 Tage) – in der Kamera-Ansicht und als Zeitleiste im Bereich Sicherheit; Antippen zeigt das Bild groß. Clips stehen nicht zur Verfügung, weil eusec sie derzeit nicht herunterlädt
- (Exc3pt10n) Die Ereignisbilder liefert SmartVis aus dem ioBroker-Dateispeicher aus (nur die Dateien, auf die eine erkannte Kamera verweist); Akkustände der Kameras erscheinen in der Batterieübersicht; aus den eusec-Objekten entstehen keine Störkacheln mehr

### 0.10.0 (2026-11-14)

- (Exc3pt10n) Erkennung für die meistgenutzten Geräte-Adapter (laut ioBroker-Statistik): `shelly`, `sonoff` (Tasmota), `tuya`, `fritzdect`, `zigbee`, `zigbee2mqtt` und `deconz` – Rollen korrigiert, Hilfs-Datenpunkte (Eingänge, Gerätetemperatur, Übergangszeiten, Kindersicherung …) ausgeblendet, lesbare Namen; entwickelt und getestet an Objektbäumen, die nach dem Quellcode der Adapter nachgebaut sind
- (Exc3pt10n) Shelly: Dimmer als Licht statt Steckdose, H&T als Klimasensor statt Thermostat, Rollladen mit Ist-Position, 3EM mit Gesamtleistung; ohne Namen in der Shelly-App das Modell als Name („Shelly Plus 1PM 1A2B“) statt „Channel Relay0“
- (Exc3pt10n) Tuya: Zuordnung über die Datenpunkt-Codes – Lampen, Steckdosen(-leisten), Rollläden, Thermostate und Sensoren werden erkannt; Farbtemperatur in Prozent
- (Exc3pt10n) FRITZ!DECT: LED-Lampe als Farblicht (bisher Thermostat), Thermostat mit richtigem Ist-Wert und Boost, Rollläden und Kontakte werden erkannt, Batterien erscheinen in der Batterieübersicht
- (Exc3pt10n) Mehrfach-Schalter (Tasmota POWER1–4, Tuya-Steckdosenleisten, Zigbee-Doppelschalter): ein Gerät je Ausgang statt nur eines
- (Exc3pt10n) Zigbee/zigbee2mqtt/deCONZ: Rollläden und Markisen, Wassermelder und Kontakte werden erkannt; Kindersicherung erscheint nicht mehr als „Schloss“
- (Exc3pt10n) Umgekehrt laufende Rollladen-Positionen (deCONZ, FRITZ!DECT: 0 = offen) werden beim Lesen, Schreiben und im Verlauf umgerechnet
- (Exc3pt10n) Geräte mit technischem Namen (z. B. Tasmota „DVES_4E55F6“) heißen wie ihr smartName aus iot/Alexa; als „Licht“ zugeordnete Schalter werden zu Lampen; Kontakte mit „Tür“ im Namen sind Türen
- (Exc3pt10n) Wetterdienste `openweathermap`, `weatherunderground` und `daswetter`: Wetterlage mit Symbol und Vorhersage für fünf Tage in der Wetterkarte; ohne eigene Wetterstation auch die aktuellen Werte des Dienstes
- (Exc3pt10n) Amtliche Warnungen des DWD (`dwd`) farbig nach Stufe in der Wetterkarte, mit Beschreibung und Verhaltenshinweisen
- (Exc3pt10n) Mehr → Erkennung: erkannte Geräte je Adapter, Kanäle ohne Kachel mit Grund und Datenpunkten und ein anonymer Bericht (nur Adapter, Datenpunkt-Schlüssel und Rollen) zum Anhängen an ein Issue

### 0.9.0 (2026-11-14)

- (Exc3pt10n) Batterien: SmartVis erfasst alle batteriebetriebenen Geräte (Anzeige „Batterie schwach“ bzw. Ladestand in %), auch ohne eigene Kachel wie Fensterkontakte, Bewegungsmelder oder Schalter; der Raum kommt von der Kachel, aus den Raum-Aufzählungen oder aus dem Gerätenamen. Hausspeicher, Autos und Telefone zählen nicht dazu, die Teilsensoren eines Hue-Bewegungsmelders (alter Hue-Adapter) nur einmal
- (Exc3pt10n) Startseite: Kennzahl „🪫 Batterien schwach“ (eigene Anzeige des Geräts oder höchstens 20 %) mit einer Liste der betroffenen Geräte samt Raum und Ladestand; schwache Batterien zählen nicht mehr als „Störung“
- (Exc3pt10n) Raumkarte mit 🪫 und Anzahl, Kacheln zeigen bei schwacher Batterie 🪫 statt ⚠️; unter „Mehr“ die Karte „Batterien“ mit allen Batteriegeräten, schwächste zuerst
- (Exc3pt10n) Erneutes Antippen des aktiven Tabs scrollt die Seite nach oben

### 0.8.0 (2026-11-14)

- (Exc3pt10n) Hue-Zonen (hue und hue-v2): Liegen alle Lampen einer Zone in einem Raum (z. B. „Esstisch“ im Wohnzimmer), steht der Zonen-Schalter als Kachel in diesem Raum; Zonen über mehrere Räume (z. B. „Erdgeschoss“) bekommen in der Raumübersicht einen eigenen Eintrag unter „Zonen“ mit Status, „Alle aus“ und einer eigenen Seite mit allen Lampen der Zone (aus allen Räumen), dem Zonen-Schalter und den Szenen
- (Exc3pt10n) Aktive Szene sichtbar: Der Szenen-Knopf ist umrandet und mit „aktiv“ gekennzeichnet, der Name steht im Szenen-Kopf (auch eingeklappt) und auf der Raum- bzw. Zonenkarte; mit hue-v2 (`activeScene`) auch für Smart Scenes, die sich mit erneutem Antippen beenden lassen
- (Exc3pt10n) Geräte lassen sich nur Räumen zuordnen, nicht Zonen
- (Exc3pt10n) Weichere Seitenwechsel: Die neue Seite blendet kurz ein, statt hart umzuspringen; die Navigationsleiste bleibt dabei stehen (View Transitions in Safari ab iOS 18, Chrome und Edge, sonst eine kurze Einblendung). Gilt für die Tabs und den Zurück-Knopf, nicht für die Wisch-Geste; die Einstellung „Animationen“ wird beachtet
- (Exc3pt10n) Verläufe und PV-Prognose messen ihre Breite vor dem ersten Zeichnen (kein kurzes Umspringen beim Öffnen)

### 0.7.1 (2026-11-13)

- (Exc3pt10n) Releases werden automatisch gebaut, getestet und veröffentlicht: stabil installieren über den Branch `release` (`…/tarball/release`) oder als fertig gebautes Paket (`.tgz`) vom GitHub-Release, ohne Build auf dem ioBroker-Host

### 0.7.0 (2026-11-13)

- (Exc3pt10n) Neuer unterstützter Adapter [`hue-v2`](https://github.com/Exc3pt10n/ioBroker.hue-v2) (Hue-Bridge-API v2): Lampen, Räume (als „Alle Lichter“), Zonen, Szenen und Smart Scenes (z. B. „Natürliches Licht“, mit ✨); Räume aus den Hue-Räumen, Lampen über `native.lights` am Raum zugeordnet
- (Exc3pt10n) In ioBroker deaktivierte (pausierte) Instanzen: SmartVis blendet ihre Geräte, Szenen und Profile aus – z. B. die alte `hue`-Instanz beim Umstieg auf hue-v2; nach dem Aktivieren erscheinen sie automatisch wieder. Unter Mehr → ioBroker steht bei der Instanz „Geräte ausgeblendet“

### 0.6.0 (2026-11-13)

- (Exc3pt10n) Startseite auf dem Desktop: Kennzahlen als Leiste oben, darunter ein flexibles Raster – im Bearbeiten-Modus hat jede Karte zusätzlich zu Reihenfolge und Ein-/Ausblenden eine Breite (⅓, ½, ⅔, ganz); Standard: Wetter, Energiefluss und PV-Prognose nebeneinander, darunter die Statuslisten und die Lichter über die volle Breite; in schmaleren Fenstern werden Drittel zu Hälften, zwei Drittel zur vollen Breite
- (Exc3pt10n) Eingeschaltete Lichter auf dem Desktop: kompakte Kacheln (mehr pro Zeile); Räume ab 4 Lichtern sind eingeklappt und zeigen die Lampennamen, „anzeigen“ klappt sie auf
- (Exc3pt10n) Die Desktop-Anordnung der Startseite wird neu gespeichert; eine frühere Desktop-Anordnung beginnt einmalig mit dem neuen Standard

### 0.5.2 (2026-11-13)

- (Exc3pt10n) Klimageräte: „Außengerät leise“ ist eine Schaltfläche, die durchschaltet (Stufe 1 → Stufe 2 → aus), mit Stufenanzeige
- (Exc3pt10n) Energie auf dem Desktop: PV-Prognose über die volle Breite wie der Verlauf (Zahlen links, Tageskurve rechts); die Karten darüber werden nach Höhe auf die Spalten verteilt

### 0.5.1 (2026-11-13)

- (Exc3pt10n) Klimageräte: Bereich „Funktionen“ in der Steuerung wie in der Hersteller-App – Sonderfunktionen (Hi-Power, Eco, Außengerät leise, Komfort, Schlafmodus, 8 °C Frostschutz) als Schaltflächen; das Gerät kennt immer nur eine davon gleichzeitig, erneutes Antippen schaltet sie aus, in der aktuellen Betriebsart nicht mögliche sind ausgegraut
- (Exc3pt10n) Klimageräte: Kaminmodus (nur beim Heizen) und Leistungsbegrenzung (50/75/100 %) unabhängig davon direkt einstellbar statt unter „Alle Werte“

### 0.5.0 (2026-11-12)

- (Exc3pt10n) Energie: Statuszeile über dem Energiefluss – Überschuss oder Netzbezug, Autarkie jetzt, Batterie voll/leer in …
- (Exc3pt10n) Energie: Antippen eines Kreises im Energiefluss öffnet den passenden Verlauf (PV/Haus → Leistung, Netz, Batterie, Auto → Überschuss)
- (Exc3pt10n) Verlauf: PV und Verbrauch (bzw. Bezug und Einspeisung) zusammen in einem Diagramm mit Legende und gemeinsamer Ablesung; Ansichten als Umschaltleiste (Leistung · Netz · Batterie · Überschuss); Einheit an der y-Achse; Hinweis auf die Datenquelle entfernt
- (Exc3pt10n) PV-Prognose: tatsächliche Erzeugung von heute als Linie über der (gestrichelten) Prognose; „noch 0 kWh“ entfällt, wenn nichts mehr erwartet wird
- (Exc3pt10n) Wallbox: Ladeeinstellungen in einem eigenen Fenster (auf dem Handy Bezeichnung über der Eingabe, technischer Hinweis zum Aufklappen); geschätzte Ladeleistung als „geschätzt“ gekennzeichnet
- (Exc3pt10n) Energiezähler: Autarkie und Eigenverbrauch groß mit Vergleich zur Vorperiode, Mengen paarweise (Netz bezogen/eingespeist, Batterie geladen/entladen)
- (Exc3pt10n) Energie auf dem Desktop: ausgeglichene Spalten, Verlauf über die volle Breite; einheitliche Kartenköpfe
- (Exc3pt10n) Startseite: Energiefluss-Karte mit Statuszeile; auf dem Handy lassen sich Kennzahlen und Wetter gemeinsam anordnen

### 0.4.0 (2026-11-12)

- (Exc3pt10n) Startseite auf dem Handy: Kennzahlen zuerst, Antippen springt zur passenden Liste (Lichter, Klima, offen, spielt, Störungen); das Wetter ist eine kompakte Zeile und klappt beim Antippen auf; keine einzelne Kennzahl mehr allein in der letzten Zeile
- (Exc3pt10n) Raumseite: Temperatur und Luftfeuchte unter dem Raumnamen; beim Licht „Alle aus“ bzw. „Alle an“
- (Exc3pt10n) „Alle aus“ zeigt eine Rückmeldung mit „Rückgängig“ (Startseite, Raumliste, Raumseite)
- (Exc3pt10n) Kacheln: ausgeschaltete Lichter zeigen „aus“ statt „0 %“; der Gerätetyp (z. B. „· Dimmer“) wird nicht mehr wiederholt
- (Exc3pt10n) Rollläden sind nur hervorgehoben, wenn sie (teilweise) geschlossen sind; Rollläden, Fenster, Thermostate usw., die wie ihr Raum heißen, heißen jetzt nach ihrem Gerätetyp (z. B. „Rollladen“)
- (Exc3pt10n) Beschattung: Automatik-Schalter je Rollladen (Auf/Ab/Sonne) eingeklappt, ausgeschaltete Automatiken stehen als Hinweis am Rollladen; Bereiche lassen sich einklappen; Fahrtasten nebeneinander
- (Exc3pt10n) Energiezähler: eine Zeitraum-Auswahl (Tag, Woche, Monat, Jahr, Gesamt; Quartal/Halbjahr unter „Mehr“), Vorperioden mit ‹ ›
- (Exc3pt10n) „Bearbeiten“ als dezentes Stift-Symbol; größere Tippflächen (Kachel-Menü, „Alle aus“)
- (Exc3pt10n) PV-Prognose: „jetzt“ am rechten Rand wird nicht mehr abgeschnitten
- (Exc3pt10n) Desktop: „Alle aus“ steht direkt neben dem Raum bzw. der Überschrift
- (Exc3pt10n) Mehr: „Verbindung“ und „Erkannte Geräte“ zu einer Info-Karte mit aufklappbaren Details zusammengefasst
- (Exc3pt10n) Startseite: Schaltfläche „💡 Alle aus“ neben jedem Raum unter „Eingeschaltete Lichter“
- (Exc3pt10n) Zurück aus einem Raum führt dorthin, woher man kam (Raumliste oder Startseite), und an dieselbe Scroll-Position statt ganz nach oben; Räume öffnen immer oben
- (Exc3pt10n) Licht-Szenen im Raum sind ausklappbar und standardmäßig eingeklappt (bleiben während der Sitzung offen, wenn man sie aufgeklappt hat)

### 0.3.0 (2026-11-12)

- (Exc3pt10n) Raumübersicht überarbeitet: Live-Status je Raum – Temperatur und Luftfeuchte sowie Kennzeichen für eingeschaltete Lichter, offene Fenster/Türen, Heizen/Kühlen, laufende Musik, (teilweise) geschlossene Rollläden und Probleme
- (Exc3pt10n) Raumsymbole: automatisch aus dem Raumnamen, im Bearbeiten-Modus frei wählbar (wird mit den Anpassungen gespeichert)
- (Exc3pt10n) Räume mit eingeschaltetem Licht sind hervorgehoben, Räume mit offenem Fenster oder Problem rot umrandet; auf dem iPhone zwei Spalten
- (Exc3pt10n) Schnellaktion „💡 aus“ auf der Raumkarte schaltet alle Lichter des Raums aus
- (Exc3pt10n) Lichter richtig gezählt: Hue-Raumgruppen („Alle Lichter“) und Zonen zählen auf der Startseite (Kennzahl, „Eingeschaltete Lichter“) und in der Raumliste nicht mehr zusätzlich zu ihren Lampen; die Gruppen-Kachel im Raum bleibt zum Schalten erhalten
- (Exc3pt10n) Einzelne Hue-Lampen, die wie ihr Raum heißen, heißen jetzt „Licht“ statt fälschlich „Alle Lichter“
- (Exc3pt10n) Diagramme auf dem iPhone/Touch (Verläufe, PV-Prognose, Temperaturkurve, Energiefluss): langes Drücken markiert bzw. kopiert nichts mehr; in Verläufen und PV-Prognose seitlich wischen zum Ablesen, der Wert bleibt nach dem Loslassen stehen
- (Exc3pt10n) Verläufe: Ablesen genau an der Zeiger-/Fingerposition – Uhrzeit dort und der Wert, der dann galt (bisher sprang der Punkt in Aufzeichnungslücken zum nächsten Messwert)

### 0.2.3 (2026-11-12)

- (Exc3pt10n) **Breaking:** Mindestversion Node.js 22 (Node.js 20 wird seit April 2026 nicht mehr unterstützt)
- (Exc3pt10n) Automatische Tests (GitHub Actions) verschlankt: keine Doppelläufe mehr, Node.js 22 und 24, Integrationstest einmal

### 0.2.2 (2026-11-12)

- (Exc3pt10n) Verläufe: Lücken ohne gespeicherte Werte (Aufzeichnung „nur Änderungen“, z. B. PV nachts) halten den letzten Wert bis zur nächsten Änderung bzw. bis jetzt, statt zwei weit auseinanderliegende Punkte schräg zu verbinden
- (Exc3pt10n) Verläufe: Mittelwert (Ø) zeitgewichtet – jeder Wert zählt so lange, bis der nächste kommt (bisher je Messpunkt, dadurch z. B. bei PV deutlich zu hoch)
- (Exc3pt10n) Verläufe: Die Zeitachse zeigt immer den vollen Zeitraum (6 Std./24 Std./7 Tage bis jetzt); liegen erst wenige Stunden Daten vor, werden sie nicht mehr über die ganze Breite gestreckt

### 0.2.1 (2026-11-11)

- (Exc3pt10n) Q.HOME mit zusätzlichen PV-Erzeugern (qhome-ess-hyb-g2 ab 0.3.0, z. B. zweiter Wechselrichter): PV-Leistung, Energiefluss, Kennzahl „PV jetzt“ und PV-Verlauf nutzen die Gesamtleistung `PvPwTotal`; der Energiefluss zeigt die Aufteilung (Q.HOME / weitere Erzeuger)

### 0.2.0 (2026-11-11)

- (Exc3pt10n) Anpassungen je Endgerät: Namen, Räume, Favoriten, ausgeblendete Geräte und die Anordnung gelten jetzt je Handy/Tablet/Browser
- (Exc3pt10n) Mehr → Anpassungen: Gerät umbenennen, Anpassungen eines anderen Geräts übernehmen, dieses Gerät oder alle Geräte auf den Ausgangszustand zurücksetzen, alte Geräte entfernen
- (Exc3pt10n) **Breaking:** neues Format von `overrides.json` (Version 2). Bestehende Anpassungen werden beim Start automatisch übernommen und gelten als Ausgangsbasis für jedes Gerät; eine Rückkehr zu 0.1.x verliert die Anpassungen, die danach gemacht wurden

### 0.1.1 (2026-11-11)

- (Exc3pt10n) Neue Einstellung „Animationen“ unter Mehr → Darstellung (Wie im System / Immer an / Aus, je Gerät): Wünscht das Betriebssystem reduzierte Bewegung (z. B. Windows: Animationseffekte aus), standen Animationen wie der Energiefluss bisher still – mit „Immer an“ laufen sie trotzdem

### 0.1.0 (2026-11-11)

- (Exc3pt10n) Erkennung: type-detector mit adapterspezifischen Regeln (Homematic, Hue, Alexa), Räume aus Enums, Hue und Gerätenamen; gegen einen echten Objektbaum abgestimmt (727 → 146 Kacheln)
- (Exc3pt10n) Eigener Webserver mit PWA (mobile first, Desktop mit Seitenleiste und Spalten), Live-Werte per WebSocket
- (Exc3pt10n) Detailansichten: Licht, Rollladen, Thermostat, Klima, Medien-Player; Wertelisten als Auswahlfelder
- (Exc3pt10n) Profile: QCells Q.HOME (inkl. aller Energiezähler), KEBA KeContact (inkl. Ladeautomatik), pvforecast, shuttercontrol, Homematic-Wetterstation und Lichtsensoren, Hue-Szenen, Toshiba-Klimageräte (toshiba-ac)
- (Exc3pt10n) Verläufe aus sql, history und influxdb
- (Exc3pt10n) Startseite als Dashboard mit Kennzahlen, Wetter, Favoriten, laufenden Medien und Statuslisten (eingeschaltete Lichter und Klimageräte, offene Fenster, Störungen)
- (Exc3pt10n) Bearbeiten-Modus: Geräte und Räume umbenennen, verschieben, ausblenden, Favoriten; Kacheln, Räume und alle Bereiche per Ziehen anordnen
- (Exc3pt10n) „Mehr“: Zustand von ioBroker (Host-Auslastung, Instanzen)

### 0.0.1

- (Exc3pt10n) Erstveröffentlichung
