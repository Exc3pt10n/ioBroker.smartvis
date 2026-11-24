/**
 * Übersetzung der Oberflächentexte (Adapter und App). Die Texte im Code sind englisch; für Deutsch gibt es das
 * Wörterbuch in i18n/de.ts (englischer Text → deutscher Text). Fehlt ein Eintrag, bleibt der englische Text stehen.
 *
 * Platzhalter: t('{n} devices', { n: 3 })
 */
import { DE } from './i18n/de';

export type SvLanguage = 'en' | 'de';

let current: SvLanguage = 'en';

/** Sprache aus einer ioBroker- oder Browser-Sprache (de, de-DE, en, …); alles außer Deutsch wird Englisch */
export function toLanguage(value: string | undefined | null): SvLanguage {
    return /^de\b/i.test(value || '') ? 'de' : 'en';
}

export function setLanguage(language: SvLanguage): void {
    current = language;
}

export function getLanguage(): SvLanguage {
    return current;
}

/** Locale für Zahlen und Datumsangaben */
export function locale(): string {
    return current === 'de' ? 'de-DE' : 'en-GB';
}

export function t(text: string, params?: Record<string, string | number>): string {
    const translated = current === 'de' ? (DE[text] ?? text) : text;
    if (!params) {
        return translated;
    }
    return translated.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

/** Singular oder Plural nach Anzahl, z. B. tn(n, '{n} device', '{n} devices') */
export function tn(n: number, one: string, other: string, params?: Record<string, string | number>): string {
    return t(n === 1 ? one : other, { n, ...params });
}

/** Ist ein deutscher Eintrag vorhanden? (Tests) */
export function hasGerman(text: string): boolean {
    return text in DE;
}
