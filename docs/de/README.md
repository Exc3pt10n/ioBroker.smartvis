![Logo](../../admin/smartvis.svg)

# ioBroker.smartvis – Beschreibung auf Deutsch

> Englische Kurzfassung und Changelog: [README.md](../../README.md). Ältere Changelog-Einträge: [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

[![Test](https://github.com/Exc3pt10n/ioBroker.SmartVis/actions/workflows/test-and-release.yml/badge.svg?branch=main)](https://github.com/Exc3pt10n/ioBroker.SmartVis/actions/workflows/test-and-release.yml)

Selbstkonfigurierende, **mobile-first** Visualisierung für ioBroker.
SmartVis erkennt Geräte und Räume automatisch und zeigt sie ohne manuelles Anlegen von Widgets als installierbare Web-App (PWA) an – auf dem Smartphone wie im Browser.

> **Status:** Version 0.x – im täglichen Einsatz und vollständig nutzbar. Bis Version 1.0 können sich Einstellungen und das Speicherformat noch ändern; solche Änderungen sind im [Changelog](../../README.md#changelog) als **Breaking** markiert und werden, wo möglich, automatisch übernommen.
> Die Erkennung ist an einer Installation mit Homematic (IP), Philips Hue (`hue` und `hue-v2`), QCells Q.HOME, KEBA, Toshiba-Klimageräten und Echo abgestimmt; für Shelly, Sonoff (Tasmota), Tuya, FRITZ!DECT, Zigbee, zigbee2mqtt und deCONZ gibt es eigene Regeln, die anhand der Objektstrukturen aus dem Quellcode dieser Adapter entwickelt und getestet sind (noch ohne Rückmeldungen echter Anlagen). Bei anderen Systemen können Geräte fehlen oder überzählig sein – sie lassen sich im Bearbeiten-Modus ausblenden. Unter **Mehr → Erkennung** zeigt SmartVis, welche Kanäle keine Kachel bekommen haben, und speichert einen anonymen Bericht (nur Adapter, Datenpunkt-Schlüssel und Rollen); als Anhang an ein Issue hilft er, die Erkennung zu verbessern.
> Die Oberfläche gibt es auf Deutsch und Englisch; sie folgt der Systemsprache von ioBroker (in den Instanz-Einstellungen änderbar).

## Funktionen

- Automatische Geräteerkennung über [`@iobroker/type-detector`](https://github.com/ioBroker/ioBroker.type-detector)
- Räume aus mehreren Quellen, gleichnamige Räume werden zusammengeführt:
  1. `enum.rooms` – z. B. die Räume der Homematic-CCU, wenn `hm-rega` sie synchronisiert
  2. Hue-Räume aus dem `hue`- bzw. [`hue-v2`](https://github.com/Exc3pt10n/ioBroker.hue-v2)-Adapter (Zonen werden bewusst nicht als Raum verwendet)
  3. Gerätenamen („Wohnzimmer Deckenlicht“ → Raum *Wohnzimmer*, Gerät *Deckenlicht*)
- **Bearbeiten-Modus** (✎ in Startseite, Raumliste und Räumen):
  - Geräte umbenennen, in einen anderen oder neuen Raum verschieben, ausblenden, als Favorit markieren; alles einzeln zurücksetzbar
  - Kacheln (Favoriten, Geräte im Raum) und Räume per Ziehen am Griff ⠿ anordnen – mit Maus und Finger; alternativ mit ← →
  - Alle Ansichten anpassbar: Bereiche bzw. Karten auf Startseite, Energie, Beschattung, Raumansicht (gilt für alle Räume) und „Mehr“ per Ziehen oder ↑ ↓ anordnen und aus-/einblenden; je Ansicht zurücksetzbar
  - Räume umbenennen, ausblenden, sortieren, selbst anlegen und wieder löschen
  - Favoriten oben auf der Startseite (auch per ☆ in der Detailansicht)
  - **Je Endgerät:** Jedes Handy, Tablet bzw. jeder Browser hat eigene Anpassungen (erkannt an einer im Browser gespeicherten Kennung). Neue Geräte starten mit den gemeinsamen Anpassungen aus der Zeit vor 0.2.0
  - Unter **Mehr → Anpassungen**: Gerät umbenennen, Anpassungen eines anderen Geräts übernehmen, **dieses Gerät** oder **alle Geräte** auf den Ausgangszustand (automatische Erkennung) zurücksetzen, alte Geräte entfernen
  - Gespeichert im ioBroker-Dateispeicher (`smartvis.0/overrides.json`, Teil von Backups); Anpassungen hängen an stabilen Objekt-IDs und überleben Neu-Erkennungen
  - Im Admin abschaltbar („Bearbeiten-Modus erlauben“) – solange es keinen Login gibt, kann sonst jeder im Netz Anpassungen speichern
- **Detailansicht** je Gerät (Bottom-Sheet auf dem Handy, Dialog am Desktop; öffnet per ⋯-Knopf, langem Drücken oder Tap auf Geräte ohne Schaltfunktion; Zurück-Taste schließt):
  - Licht: Ein/Aus, Helligkeit, Farbtemperatur (Mired oder Kelvin), Farbe
  - Rollladen: Position, Auf/Stopp/Zu, Automatik aus shuttercontrol
  - Thermostat: Ist-/Solltemperatur, ± in 0,5-°C-Schritten, Slider, Boost
  - Alle übrigen Werte des Geräts; Slider senden erst beim Loslassen
- **PV-Prognose** aus `pvforecast`: heute/morgen erwartet, Rest des Tages, je Anlage (z. B. Ost/West), Abgleich mit der tatsächlichen Erzeugung, Tagesverlauf als Diagramm mit Istwert, Tooltip und Tabellenansicht
- **Wetter auf der Startseite** aus der lokalen Wetterstation (HmIP-SWO-PL/-PR/-B, HM-WDS100; Fallback Außensensor HmIP-STHO), dazu die Helligkeit der HmIP-SLO-Lichtsensoren je Himmelsrichtung: Temperatur, Wetterlage, Luftfeuchte, Wind, Regen und Sonnenscheindauer heute. Die Tageswerte stammen aus den Systemvariablen, die die CCU automatisch anlegt (`svHmIPRainCounterToday_…`, `svHmIPSunshineCounterToday_…`).
- **Beschattung** über [shuttercontrol](https://github.com/simatec/ioBroker.shuttercontrol):
  - Alle öffnen/schließen, Sonnenschutz, alle auf Automatik; Urlaub und Schulfrei schaltbar
  - Je Bereich (Wohnen, Schlafen, Kinder): Automatik ein/aus, öffnen/schließen/Sonnenschutz, nächste Fahrzeiten
  - Je Rollladen: Position, Automatik-Status, Automatik Auf/Ab/Sonne einzeln schaltbar, ▲/▼
  - Sonnenauf-/-untergang und Sonnenstand
  - Verknüpfung mit den Rollladen-Kacheln über die Instanz-Konfiguration: Status an der Kachel, Namen und fehlende Räume aus shuttercontrol
  - Sind Trigger-Datenpunkte konfiguriert (z. B. `triggerAutoLiving`, `HolidayDP`), schreibt SmartVis auf diese – shuttercontrol würde direkte Änderungen sonst wieder überschreiben
- **Weitere Geräte-Adapter** (die meistgenutzten laut ioBroker-Statistik), jeweils mit korrigierten Rollen, ausgeblendeten Hilfs-Datenpunkten und lesbaren Namen:
  - `shelly`: Relais, Dimmer, Rollläden (Ist-Position), Sensoren und Energiemesser (3EM als Summe); Eingänge, Gerätetemperatur und Schwellwerte erscheinen nicht als Kacheln; ohne Namen in der Shelly-App heißen Geräte nach dem Modell („Shelly Plus 1PM 1A2B“), mehrere Ausgänge werden durchnummeriert
  - `sonoff` (Tasmota): Mehrfach-Relais (POWER1–4) als einzelne Schalter, Rollläden ohne die Motor-Relais, Lampen mit Dimmer/Farbe, Sensoren
  - `tuya`: Zuordnung über die Datenpunkt-Codes (`switch_led`, `bright_value`, `percent_control`, `temp_set` …) – Lampen, Steckdosen(-leisten), Rollläden, Thermostate, Klima-, Tür- und Wassersensoren
  - `fritzdect`: Heizkörperthermostate (Soll/Ist, Boost), Steckdosen mit Messung, LED-Lampen (Helligkeit, Farbe, Farbtemperatur), Rollläden, Kontakte und Taster mit Klimawerten
  - `zigbee`, `zigbee2mqtt`, `deconz`: Rollläden/Markisen, Wassermelder, Fenster-/Türkontakte, Doppelschalter; Kindersicherung, Übergangszeiten u. ä. ausgeblendet
  - Allgemein: Geräte mit technischem Namen (z. B. „DVES_4E55F6“) heißen wie ihr smartName aus iot/Alexa; Mehrfach-Schalter werden zu einem Gerät je Ausgang; Kontakte mit „Tür“ im Namen sind Türen; umgekehrt laufende Rollladen-Positionen (deCONZ, FRITZ!DECT: 0 = offen) rechnet SmartVis beim Lesen, Schreiben und im Verlauf um
- **Wetterdienste** für die Wetterkarte: `openweathermap`, `weatherunderground` und `daswetter` (ab 4.x, Meteored) liefern Wetterlage mit Symbol und eine Vorhersage für heute und die nächsten vier Tage (Höchst-/Tiefstwert, Regen); ohne eigene Wetterstation zeigt die Karte auch die aktuellen Werte des Dienstes (Wind in km/h, °F in °C umgerechnet). Mit Station bleiben deren Messwerte maßgeblich, Regen und Sturm meldet weiterhin die Station
- **Amtliche Warnungen** des Deutschen Wetterdienstes (`dwd`): aktive Warnungen oben in der Wetterkarte, farbig nach Stufe (gelb, orange, rot, violett), antippen zeigt Beschreibung und Verhaltenshinweise
- **Bereich „Sicherheit“** (erscheint, sobald Kameras oder Sicherheitsstationen erkannt sind): Sicherheitsmodus für alle Stationen auf einmal (Zuhause · Abwesend · Aus, einzeln unter „Je Station einstellen“), ausgelöster Alarm als Banner, Kameras, Melder (Rauch, Wasser, CO), Fenster & Türen (offene zuerst) und Bewegungsmelder – Bereiche wie überall sortier- und ausblendbar. Auf dem Handy steht „Sicherheit“ in der Navigationsleiste, „Beschattung“ ist dann unter „Mehr“ erreichbar. Auf der Startseite zeigt eine Kennzahl Modus und jüngste Erkennung; die Karte „Gerade erkannt“ erscheint nur bei laufender oder höchstens 10 Minuten alter Erkennung
- **Kameras mit [`eufy-next`](https://github.com/Exc3pt10n/ioBroker.eufy-next)** (eufy v6 cloud über das neue eufy-SDK, empfohlen): Kacheln mit dem letzten Ereignisbild des Adapters (`snapshot.url`, vom neuen SDK korrekt entschlüsselt) und dessen Zeit; Erkennung von Bewegung, Person, Haustier, Geräusch, Weinen und Klingel aus `events.*`, „Nicht erreichbar“ aus `info.available`. Die Detailansicht bietet „Aktuelles Bild“ (`snapshot.refreshLive`, weckt Akku-Kameras), Kamera an/aus, Licht, Schwenken, den Sicherheitsmodus der Station (`arming.mode`) und Einstellungen auf Deutsch (Erkennung, Energiemodus, Nachtsicht, Status-LED, Mikrofon, Lautsprecher …). Ab eufy-next 0.2.0 gibt es einen Livestream mit Ton über die go2rtc-Seite des Adapters (`livestream.start/stop/url`); er wird beim Schließen beendet, nach der Höchstdauer des Adapters bietet SmartVis „Weiter ansehen“. Kameras ohne eigene Station gehören zur HomeBase, wenn es genau eine gibt
- **Kameras** (eufy Security über [`eusec`](https://github.com/bropat/ioBroker.eusec)): Kacheln im Bereich Sicherheit und im Raum mit einem Standbild aus dem letzten Livestream (SmartVis holt es über go2rtc, solange ein Livestream läuft – die Ereignisbilder von eufy kommen seit 2026 nur noch verstreift an) und der Zeit des letzten Ereignisses; erkannte Bewegung/Person ist hervorgehoben, ausgeschaltete und Offline-Kameras sind gekennzeichnet. Die Detailansicht zeigt das Bild groß und bietet Livestream (go2rtc-Seite des eusec-Adapters; der Stream wird beim Schließen beendet), Kamera an/aus, Licht, Schwenken der Innenkameras und den Sicherheitsmodus der Station. Die Standbilder speichert SmartVis unter `smartvis.0/snapshots` und liefert nur diese aus. Sirene und Neustart der Station sind bewusst nicht bedienbar
  - Livestream mit Ton: SmartVis öffnet die go2rtc-Seite mit MSE/HLS (WebRTC überträgt den AAC-Ton der eufy-Kameras nicht); startet der Browser stumm, den Lautsprecher im Video antippen. eusec beendet den Stream nach der eingestellten Höchstdauer („Max camera livestream duration“, Standard 120 s) – SmartVis zeigt das an und bietet „Weiter ansehen“
  - **Einstellungen** in der Kamera-Ansicht, je Gruppe aufklappbar und auf Deutsch – nur, was die Kamera anbietet: Erkennung (Bewegung an/aus, was erkannt wird, Empfindlichkeit, Verfolgen, Haustiere, Geräusche, Diebstahlwarnung), Aufnahme (Energiemodus, Clip-Länge, Pause bis zur nächsten Aufnahme, Ton, Daueraufnahme, Qualität), Bild & Ton (Nachtsicht, Lichthelligkeit, Spiegeln, Wasserzeichen, Status-LED, Mikrofon, Lautsprecher, Lautstärke, Schwenkgeschwindigkeit) und Benachrichtigungen. Untereinstellungen erscheinen nur, wenn sie wirken (z. B. Clip-Länge nur im Energiemodus „Benutzerdefiniert“). Nicht dabei: RTSP, NAS, Sprachausgabe und Bewegungszonen
- **Batterie-Übersicht** unter Mehr: alle batteriebetriebenen Geräte mit Ladestand bzw. „schwach“, schwache zuerst, mit Batterieart aus dem Gerätemodell (Tabelle aus der Gerätebibliothek von [Battery Notes](https://github.com/andrew-codechimp/HA-Battery-Notes), MIT-Lizenz)
- **Diagnose der Erkennung** unter Mehr → Erkennung: erkannte Geräte je Adapter, Kanäle ohne Kachel mit Grund und Datenpunkten, anonymer Bericht zum Teilen
- Adapterspezifische Regeln gegen Kachel-Rauschen: Homematic IP nur den ersten virtuellen Kanal je Ausgang (keine Wartungs-, Tasten-, Wochenprofil- oder Schwellwert-Kanäle), Hue ohne Sensoren, Smart Scenes, Entertainment-Bereiche und Altlasten der alten Objektstruktur, Alexa nur Player
- Eigener Webserver mit WebSocket-API; die App erhält nur erkannte States, Schreibzugriffe nur auf freigegebene States
- **Energie-Sicht** mit Energiefluss (PV, Haus, Batterie, Netz, Auto) und Tageswerten über Adapter-Profile:
  - [ioBroker.qhome-ess-hyb-g2](https://github.com/Exc3pt10n/ioBroker.qhome-ess-hyb-g2) (QCells Q.HOME+ ESS HYB-G2) – inkl. zusätzlicher PV-Erzeuger (`PvPwTotal`/`PvPwExt`) und aller Energiezähler (Tag, Monat, Quartal, Halbjahr, Jahr jeweils mit Vorperiode, Gesamt)
  - `toshiba-ac` (Toshiba-Klimageräte): je Gerät eine Kachel „Klimaanlage“ im passenden Raum; Detailansicht mit Ein/Aus, Betriebsart, Solltemperatur (in ganzen Grad), Lüfterstufe und Lamellen, weitere Einstellungen (Sonderfunktion, Kaminmodus, Leistungsbegrenzung) als Auswahlfelder
  - `kecontact` (KEBA KeContact P20/P30): Status, Ladeleistung, PV-Überschuss, aktuelles Ladelimit (A und ≈ kW), PV-Überschussladen und Pause schaltbar, dazu die Einstellungen der Ladeautomatik (Phasen 1/3, zusätzlicher/maximaler Netzbezug, Ladestrom-Begrenzung, Batteriespeicher-Strategie und -Schwelle, Ziel-Ladung). Bei der Deutschland-Edition (ohne Energiezähler) wird die Ladeleistung wie im kecontact-Adapter aus Ladestrom × 230 V × Phasen geschätzt (Anzeige mit „≈“)
  - Ist eine Wallbox vorhanden, wird ihre Leistung aus dem Hausverbrauch des Speichers herausgerechnet (der Speicher misst am Netzanschluss)
- Neu-Erkennung bei Objektänderungen
- **Verläufe** aus `sql`, `history` oder `influxdb`: automatisch für alle aufgezeichneten Werte (Einstellung „Aufzeichnung aktiviert“ am Datenpunkt) – in der Detailansicht der Geräte, im Wetter-Verlauf (Link in der Wetterkarte) und in der Energie-Sicht; Zeiträume 6 Std./24 Std./7 Tage als Mittelwerte, mit Min./Ø/Max., Tooltip und Tabelle. Für die Q.HOME werden auch die aufgezeichneten kW-Varianten (`GridPwPurchase`, `GridPwFeedIn`) erkannt
- **Farbiges Licht** für Farblampen (Hue Color Ambiance über `hue` und `hue-v2`, Zigbee, Tasmota u. a.): „Weiß | Farbe“, Farbfelder, Farbton und Sättigung
- **Hue-Szenen**: die Szenen der Hue-Räume und -Zonen lassen sich in der Detailansicht jeder Hue-Lampe und in der Raumansicht (unter „Licht“) auslösen; interne Bridge-Szenen und doppelte Gruppen werden ausgeblendet. Mit `hue-v2` auch Smart Scenes wie „Natürliches Licht“ (mit ✨ gekennzeichnet)
- **Deaktivierte Instanzen**: Ist eine Adapter-Instanz in ioBroker deaktiviert, zeigt SmartVis ihre Geräte nicht an (ihre Werte aktualisieren sich ohnehin nicht mehr) – praktisch z. B. beim Umstieg von `hue` auf `hue-v2`
- **Hue-Zonen**: Zonen innerhalb eines Raums erscheinen als Kachel im Raum, Zonen über mehrere Räume als eigener Eintrag unter „Zonen“; die gerade aktive Szene ist markiert (bei hue-v2 über `activeScene`, Smart Scenes über ihren Schalter)
- **hue-v2**: Lampen unter `lights`, Räume und Zonen unter `rooms`/`zones` mit Szenen (`scenes`) und Smart Scenes (`smartScenes`). Für die Zuordnung der Lampen zu den Räumen braucht SmartVis am Raum-/Zonen-Kanal `native.lights` (IDs der Lampen wie in `native.id` der Lampen-Kanäle); fehlt die Liste, funktionieren Raum und Szenen trotzdem, die Lampen stehen dann aber unter „Ohne Raum“
- Der Hinweis „Geräte ohne Raum“ auf der Startseite lässt sich mit ✕ ausblenden (gilt für alle Geräte); im Bearbeiten-Modus wieder einblenden
- Startseite zeigt unter „Läuft gerade“ alle Medien-Player (z. B. Echos), die gerade abspielen
- Auf dem Desktop nutzt die Oberfläche die gesamte Fensterbreite: Die Startseite wird ab 1200 px zum Dashboard mit Spalten (Wetter · Favoriten und Status · Energiefluss und PV-Prognose), darüber Kennzahl-Kacheln (PV, Batterie, Verbrauch, Prognose, Lichter, offene Fenster …); auf dem Handy stehen die Kennzahlen als kompaktes Raster (alle gleichzeitig sichtbar)
- Wetterkarte mit 24-Stunden-Temperaturkurve (wenn aufgezeichnet), Helligkeit als Balken je Himmelsrichtung und weiteren Außensensoren als eigene Zeilen; passt sich der verfügbaren Breite an
- „Mehr“ zeigt den Zustand von ioBroker: je Host Prozessor, Arbeitsspeicher, Festplatte (mit Warnschwelle), Laufzeit, js-controller- und Node.js-Version; dazu alle Adapter-Instanzen mit Status (läuft, läuft nicht, keine Verbindung, geplant, deaktiviert) – Probleme stehen oben
- Raumansicht nach Gerätegruppen (Licht, Beschattung, Heizung & Klima, Fenster & Türen, Steckdosen & Schalter, Medien, Sensoren); Startseite mit Status-Karten je Thema (Lichter an je Raum, Klima, offene Fenster & Türen, laufende Player, Störungen, schwache Batterien) mit Schnellaktionen wie „Aus“ und „Pause“
- Responsive Oberfläche: Bottom-Navigation auf dem Handy, Seitenleiste ab Tablet, Hell/Dunkel automatisch

## Installation

SmartVis wird über npm bzw. das ioBroker-Repository verteilt. Sobald der Adapter im Repository „latest“ ist, wird er wie jeder andere Adapter in der Admin-Oberfläche unter *Adapter* installiert; danach eine Instanz anlegen und `http://<iobroker>:8099` öffnen.

Voraussetzungen: js-controller ≥ 6.0.11, Admin ≥ 7.6.20, Node.js ≥ 22.

## Konfiguration

| Einstellung | Standard | Beschreibung |
|---|---|---|
| IP-Adresse | `0.0.0.0` | Netzwerk-Interface des Webservers |
| Port | `8099` | Aufruf: `http://<iobroker>:8099` |
| Sprache | Systemsprache | Oberfläche und erzeugte Gerätenamen (Deutsch oder Englisch; auch für mehrsprachige Objektnamen) |
| Neu-Erkennung | `10` s | Wartezeit nach Objektänderungen |
| Ignorierte Adapter | `system,admin,…,iot` | Werden bei der Erkennung übersprungen |
| Bearbeiten-Modus erlauben | an | Anpassungen aus der App speichern |

## Entwicklung

Hinweise zur Entwicklung (englisch): [DEVELOPMENT.md](../../DEVELOPMENT.md).
