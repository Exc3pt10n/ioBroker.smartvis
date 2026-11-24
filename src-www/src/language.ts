import { type SvLanguage, getLanguage, setLanguage, toLanguage } from '../../src/shared/i18n';

/** Zuletzt vom Adapter gemeldete Sprache: beim nächsten Start sofort richtig, bevor das Model da ist */
const KEY = 'smartvis.language';

/** Sprache setzen; true, wenn sie für den nächsten Start gespeichert ist */
function apply(language: SvLanguage): boolean {
    setLanguage(language);
    document.documentElement.lang = language;
    try {
        localStorage.setItem(KEY, language);
        return localStorage.getItem(KEY) === language;
    } catch {
        // ohne Speicher (privates Fenster) gilt beim nächsten Start wieder die Browsersprache
        return false;
    }
}

/** Vor dem ersten Zeichnen: gespeicherte Sprache, sonst die des Browsers */
export function initLanguage(): void {
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(KEY);
    } catch {
        stored = null;
    }
    apply(toLanguage(stored || navigator.language));
}

/**
 * Sprache aus dem Model übernehmen. Weicht sie von der beim Start angenommenen ab, lädt die App einmal neu: Manche
 * Texte entstehen schon beim Laden der Module. Ohne Speicher (kein Neuladen in einer Schleife) wird nur neu gezeichnet.
 */
export function applyLanguage(language: SvLanguage | undefined): void {
    if (!language || language === getLanguage()) {
        return;
    }
    if (apply(language)) {
        window.location.reload();
    }
}
