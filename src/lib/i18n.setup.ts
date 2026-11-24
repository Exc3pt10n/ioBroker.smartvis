/**
 * Wird vor allen Unit-Tests geladen (.mocharc.json → file): Die meisten Tests prüfen die deutschen Bezeichnungen
 * (auch Erkennungen, die schon beim Laden der Testdatei laufen); Tests für Englisch stellen die Sprache selbst um.
 */
import { setLanguage } from '../shared/i18n';

setLanguage('de');
beforeEach(() => setLanguage('de'));
