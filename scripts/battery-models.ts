/**
 * Erzeugt src/lib/batteryModels.ts (Modellkennung → Batterieart) aus der Gerätebibliothek von
 * HA-Battery-Notes (https://github.com/andrew-codechimp/HA-Battery-Notes, MIT-Lizenz).
 *
 * Aufruf: npx tsx scripts/battery-models.ts <Pfad zu library/library.json>
 *
 * Übernommen werden nur eindeutige Modellkennungen (z. B. "HmIP-SWDO", "RWL021", "MCCGQ11LM",
 * "lumi.sensor_magnet.aq2"), keine Beschreibungen wie "Hue dimmer switch". Widersprechen sich Einträge,
 * gilt die Mehrheit; ohne Mehrheit entfällt die Kennung.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface LibraryDevice {
    manufacturer: string;
    model?: string;
    model_id?: string | number;
    battery_type: string;
    battery_quantity?: number | string;
}

const TOKEN = /[A-Za-z0-9][A-Za-z0-9._\-/]*/g;
const ZIGBEE_TOKEN = /lumi\.[a-z0-9._]+/gi;

/** Modellkennungen in einem Text: mindestens zwei Ziffern oder Homematic-Typ (HmIP-SWDO) */
function codes(text: string | undefined): string[] {
    const out = new Set<string>();
    for (const raw of (text || '').match(TOKEN) || []) {
        const t = raw.replace(/^[._\-/]+|[._\-/]+$/g, '');
        const digits = (t.match(/\d/g) || []).length;
        const homematic = t.includes('-') && /^HM/i.test(t);
        if (t.length >= 4 && /[A-Za-z]/.test(t) && (digits >= 2 || homematic)) {
            out.add(t.toUpperCase());
        }
    }
    for (const raw of (text || '').match(ZIGBEE_TOKEN) || []) {
        out.add(raw.replace(/\.+$/, '').toUpperCase());
    }
    return [...out];
}

/** Anzeige: "2× AAA", "CR2032", "Rechargeable" (übersetzt in der App) */
function label(d: LibraryDevice): string | undefined {
    const type = d.battery_type.trim();
    if (type === 'MANUAL' || /^(APC|RBC)/i.test(type)) {
        return undefined; // keine Angabe bzw. USV-Akkus
    }
    const text = type === 'Irreplaceable' ? 'Built-in battery' : type;
    const n = Number(d.battery_quantity) || 1;
    return n > 1 ? `${n}× ${text}` : text;
}

const file = process.argv[2];
if (!file) {
    console.error('Aufruf: npx tsx scripts/battery-models.ts <library.json>');
    process.exit(1);
}
const library = JSON.parse(readFileSync(file, 'utf8')) as { version?: string | number; devices: LibraryDevice[] };
const votes = new Map<string, Map<string, number>>();
for (const d of library.devices) {
    const l = label(d);
    if (!l) {
        continue;
    }
    for (const code of new Set([...codes(d.model), ...codes(String(d.model_id ?? ''))])) {
        const v = votes.get(code) || new Map<string, number>();
        v.set(l, (v.get(l) || 0) + 1);
        votes.set(code, v);
    }
}
/** Ergänzungen, die in der Bibliothek fehlen (laut Hersteller-Datenblatt) */
const EXTRA: Record<string, string> = {
    'HMIP-SWO-PL': '3× AA',
};
for (const [code, type] of Object.entries(EXTRA)) {
    votes.set(code, new Map([[type, 1]]));
}
const table: [string, string][] = [];
for (const [code, v] of [...votes].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const [best, n] = [...v].sort((a, b) => b[1] - a[1])[0];
    const total = [...v.values()].reduce((a, b) => a + b, 0);
    if (n * 2 > total) {
        table.push([code, best]);
    }
}

const out = `/* eslint-disable */
// Erzeugt mit scripts/battery-models.ts – nicht von Hand bearbeiten.
//
// Quelle: HA-Battery-Notes, Gerätebibliothek (ergänzt um einzelne Modelle laut Hersteller-Datenblatt) (library/library.json, Version ${String(library.version ?? '?')})
// https://github.com/andrew-codechimp/HA-Battery-Notes
//
// MIT License – Copyright (c) 2023-2026 Andrew Jackson
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of
// the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

/** Modellkennung (Großbuchstaben) → Batterieart, z. B. "HMIP-SWDO" → "AAA" */
export const BATTERY_MODELS: Record<string, string> = {
${table.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n')}
};
`;
writeFileSync(join(__dirname, '..', 'src', 'lib', 'batteryModels.ts'), out);
console.log(`${table.length} Modelle geschrieben`);
