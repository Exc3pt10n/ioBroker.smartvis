# Hinweise für die Weiterentwicklung

## Versionierung

Jede Änderung, die gemergt werden soll, zieht die Adapter-Version **einmal pro Pull Request** hoch
(Semantic Versioning, solange < 1.0):

| Änderung | Version |
|---|---|
| Neue Funktion, neuer unterstützter Adapter | Minor: 0.1.0 → 0.2.0 |
| Fehlerbehebung, Layout-Korrektur, kleine Verbesserung | Patch: 0.2.0 → 0.2.1 |
| Inkompatible Änderung (Einstellungen, gespeicherte Anpassungen) | Minor, im Changelog als **Breaking** markiert |

Bei mehreren Änderungen in einem Pull Request gilt die höchste Stufe.

Ausnahme: Reine Änderungen an Entwicklungswerkzeugen ohne Auswirkung auf Nutzer (CI-Workflows,
Tests, Demo, Lint-Konfiguration, `CLAUDE.md`) brauchen keine neue Version.

Anzupassen sind jeweils:

- `package.json` und `package-lock.json` (Feld `version`, im Lockfile oben und unter `packages[""]`)
- `io-package.json`: `common.version` und ein neuer Eintrag ganz oben in `common.news`
  (alle Sprachen: en, de, ru, pt, nl, fr, it, es, pl, uk, zh-cn; **höchstens 7 Einträge** behalten, ältere
  einfach entfernen – der Repository-Builder kürzt sonst, der `release-guard` prüft das)
- `README.md`: Abschnitt `### <version> (<datum>)` oben im Changelog, Einträge **auf Englisch** im Stil
  `- (Exc3pt10n) …`. Die README muss vollständig englisch sein (ioBroker-Repochecker); ältere Changelog-Einträge
  stehen in `CHANGELOG_OLD.md`. Die ausführliche deutsche Beschreibung liegt in `docs/de/README.md` und wird bei
  neuen Funktionen mitgepflegt.

Wird ein Pull Request erweitert, bevor er gemergt ist, bleibt es bei dieser einen Erhöhung
(ggf. von Patch auf Minor anheben). Nach einem Merge beginnt die nächste Änderung mit einer neuen Erhöhung.

### Release

Releases entstehen automatisch über den zentralen Workflow aus
[Exc3pt10n/ioBroker-workflows](https://github.com/Exc3pt10n/ioBroker-workflows) (eingebunden in
`.github/workflows/test-and-release.yml` über `@v1`, Dateiname wie vom ioBroker-Repochecker erwartet). Nach einem Merge auf `main` laufen alle Checks; nur wenn sie grün
sind und die Version aus `package.json` noch keinen Tag hat, legt der Release-Job an:

- den annotierten Tag `vX.Y.Z`,
- ein GitHub-Release mit den Notes aus dem Changelog-Abschnitt der README und dem fertig gebauten
  `iobroker.smartvis-X.Y.Z.tgz` als Asset,
- danach veröffentlicht `npm-publish.yml` genau dieses `.tgz` auf npm (Trusted Publishing, kein Token).

Tags, Releases und npm-Versionen also nie selbst anlegen oder pushen bzw. veröffentlichen – insbesondere nicht bei einem
Versionssprung auf einem Feature-Branch. Ist lokal versehentlich ein Tag entstanden, ihn mit
`git tag -d vX.Y.Z` wieder löschen. Ein Merge ohne Versionssprung (z. B. nur Werkzeuge) erzeugt kein Release.

Der `release-guard` im Workflow prüft die Regeln oben maschinell: Ändert ein Pull Request ausgelieferte Dateien
(`files`/`main` aus `package.json`, `io-package.json`, `src/`, `src-www/`) oder Laufzeit-Abhängigkeiten
(auch nur im Lockfile, z. B. durch `npm audit fix`), muss die Version erhöht und vollständig eingetragen sein.

## Verteilung über npm

SmartVis wird über npm und das ioBroker-Repository verteilt (Parameter `npm-package: true` im zentralen Workflow):

- Es gibt **kein** `prepare`-Skript: Nutzer bekommen das fertig gebaute Paket, der Build läuft nur in der CI.
- `common.nogit` ist in `io-package.json` gesetzt (der Build liegt nicht im Repository).
- `@iobroker/testing` bleibt auf dem aktuellen Stand (6.x), `admin` als globale Abhängigkeit mindestens 7.6.20.
- Alles, was der Build braucht, steht in `devDependencies`.
- Für Tester ohne npm-Version: das `.tgz` am jeweiligen GitHub-Release
  (`iobroker url https://github.com/Exc3pt10n/ioBroker.smartvis/releases/download/vX.Y.Z/iobroker.smartvis-X.Y.Z.tgz smartvis`).
  Eine Installation aus `tarball/main` funktioniert nicht mehr.

Vor einem Pull Request auf Funde des ioBroker-Repocheckers achten:

```bash
npx @iobroker/repochecker https://github.com/Exc3pt10n/ioBroker.smartvis <branch>
```

## Automatische Tests (GitHub Actions)

`.github/workflows/test.yml` ruft den zentralen Workflow auf. Er läuft für Pull Requests, Pushes auf `main`
und wöchentlich:

- Pull Requests und `main`: Lint, Typprüfung, Build, Unit- und Paket-Tests auf Node 22 und 24,
  Integrationstest, Installationstest (Installation des gepackten Pakets wie aus npm),
  `npm audit` der Laufzeit-Abhängigkeiten und bei Pull Requests der `release-guard`
- wöchentlich: volle Matrix Linux und Windows, Node 22, 24 und 26

Pflicht-Check im Branch-Schutz von `main` ist `adapter / ci-result`. Den früheren Branch `release` pflegt der
Workflow nicht mehr (`release-branch: ''`); er bleibt auf dem letzten Stand vor der Umstellung auf npm stehen.

Änderungen an den Checks oder am Release gehören in das zentrale Repo, nicht in diesen Adapter. Wird die
Node-Mindestversion geändert: `engines` in `package.json`/`package-lock.json`, README (Voraussetzungen) und
ggf. den Parameter `node-versions` in `test-and-release.yml` gemeinsam anpassen.

## Prüfen vor dem Push

```bash
npm run lint && npm run check && npm test && npm run build
```

Den `release-guard` lokal ausführen (mit einem Klon von ioBroker-workflows daneben):

```bash
node ../ioBroker-workflows/scripts/check-release.mjs pr --base origin/main --npm-package true
```

Bei Änderungen an `src/main.ts`, an der Erkennung oder am Webserver zusätzlich:

```bash
npm run test:integration
```
