/** Farbumrechnung für die Lichtfarbe (Farbton 0–360°, Sättigung/Helligkeit 0–1) */

export function hsvToHex(h: number, s: number, v = 1): string {
    const f = (n: number): number => {
        const k = (n + h / 60) % 6;
        return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    const to = (x: number): string =>
        Math.round(x * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}

export function parseHex(hex: string): [number, number, number] | undefined {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) {
        return undefined;
    }
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** RGB (0–255) → Farbton (0–360) und Sättigung (0–1) */
export function rgbToHs(r: number, g: number, b: number): { h: number; s: number } {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
        h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
        if (h < 0) {
            h += 360;
        }
    }
    return { h, s: max ? d / max : 0 };
}

/** Farbfelder für die schnelle Auswahl (Farbton in Grad) */
export const COLOR_SWATCHES: { name: string; h: number }[] = [
    { name: 'Rot', h: 0 },
    { name: 'Orange', h: 28 },
    { name: 'Gelb', h: 52 },
    { name: 'Grün', h: 120 },
    { name: 'Türkis', h: 175 },
    { name: 'Blau', h: 225 },
    { name: 'Lila', h: 275 },
    { name: 'Pink', h: 320 },
];
