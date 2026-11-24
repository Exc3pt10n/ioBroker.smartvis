import { expect } from 'chai';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getLanguage, hasGerman, locale, setLanguage, t, tn, toLanguage } from '../shared/i18n';

/** Alle t('…')/tn(…, '…', '…') mit festem Text in den Quellen von Adapter und App */
function literalKeys(): { key: string; file: string }[] {
    const roots = [join(__dirname, '..'), join(__dirname, '..', '..', 'src-www', 'src')];
    const files: string[] = [];
    const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) {
                if (name !== 'fixtures' && name !== 'i18n') {
                    walk(path);
                }
            } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
                files.push(path);
            }
        }
    };
    roots.forEach(walk);
    const result: { key: string; file: string }[] = [];
    const str = String.raw`'((?:[^'\\]|\\.)*)'`;
    const single = new RegExp(String.raw`(?<![\w.])t\(\s*` + str, 'g');
    const plural = new RegExp(String.raw`(?<![\w.])tn\([^,]+,\s*` + str + String.raw`\s*,\s*` + str, 'g');
    for (const file of files) {
        // ohne Kommentarzeilen (Beispiele in der Doku)
        const source = readFileSync(file, 'utf8')
            .split('\n')
            .filter(line => !/^\s*(\*|\/\/|\/\*)/.test(line))
            .join('\n');
        for (const m of source.matchAll(single)) {
            result.push({ key: m[1].replace(/\\'/g, "'"), file });
        }
        for (const m of source.matchAll(plural)) {
            result.push({ key: m[1].replace(/\\'/g, "'"), file }, { key: m[2].replace(/\\'/g, "'"), file });
        }
    }
    return result;
}

describe('i18n', () => {
    it('translates English texts to German and fills in placeholders', () => {
        expect(t('All lights')).to.equal('Alle Lichter');
        expect(t('No history for {id}', { id: 'a.0.b' })).to.equal('Kein Verlauf für a.0.b');
        setLanguage('en');
        expect(t('All lights')).to.equal('All lights');
        expect(t('No history for {id}', { id: 'a.0.b' })).to.equal('No history for a.0.b');
        expect(locale()).to.equal('en-GB');
    });

    it('keeps unknown texts', () => {
        expect(t('Kitchen spots')).to.equal('Kitchen spots');
    });

    it('picks singular or plural', () => {
        setLanguage('en');
        expect(tn(1, '{n} light', '{n} lights')).to.equal('1 light');
        expect(tn(3, '{n} light', '{n} lights')).to.equal('3 lights');
    });

    it('maps ioBroker and browser languages', () => {
        expect(toLanguage('de')).to.equal('de');
        expect(toLanguage('de-AT')).to.equal('de');
        expect(toLanguage('en')).to.equal('en');
        expect(toLanguage('fr')).to.equal('en');
        expect(toLanguage(undefined)).to.equal('en');
        setLanguage('de');
        expect(getLanguage()).to.equal('de');
    });

    it('has a German translation for every fixed text in adapter and app', () => {
        const missing = literalKeys()
            .filter(({ key }) => !hasGerman(key))
            .map(({ key, file }) => `${file.split(/[\\/]src/).pop()}: ${key}`);
        expect([...new Set(missing)]).to.deep.equal([]);
    });
});
