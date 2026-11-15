import type { SvCamera, SvStateValue } from '../shared/protocol';

/** Zugriff auf den Dateispeicher der Instanz (im Adapter: readFile/writeFile von ioBroker) */
export interface SnapshotStorage {
    read(meta: string, path: string): Promise<Buffer | null>;
    write(meta: string, path: string, data: Buffer | string): Promise<void>;
}

/** Bild holen: Antwort mit Inhalt und Typ, null bei Fehler */
export type FrameFetcher = (url: string) => Promise<{ data: Buffer; type: string } | null>;

const DIR = 'snapshots';
const INDEX = `${DIR}/index.json`;
/** Erstes Bild, sobald der Stream Bilder liefert; danach regelmäßig, solange er läuft */
const FIRST_MS = 5_000;
const EVERY_MS = 30_000;
/** Kleinere Antworten sind kein brauchbares Bild (z. B. Fehlermeldung von go2rtc) */
const MIN_BYTES = 2_000;

/**
 * Standbild-Adresse von go2rtc zur Livestream-Seite: ".../stream.html?src=<Kamera>" → ".../api/frame.jpeg?src=<Kamera>".
 * Andere Adressen (ohne go2rtc) liefern kein Standbild.
 */
export function frameUrl(liveUrl: string): string | undefined {
    const m = /^(https?:\/\/[^/?#]+)(?:\/[^?#]*)?\/stream\.html\?(?:[^#]*&)?src=([^&#]+)/.exec(liveUrl);
    return m ? `${m[1]}/api/frame.jpeg?src=${m[2]}` : undefined;
}

/** Dateiname aus der Kamera-ID (eusec: Seriennummer am Ende) */
function fileName(cameraId: string): string {
    return `${cameraId
        .split('.')
        .pop()!
        .replace(/[^\w-]/g, '_')}.jpg`;
}

/**
 * Kachelbilder der Kameras aus dem Livestream: eufy liefert seit 2026 unbrauchbare (falsch entschlüsselte)
 * Ereignisbilder. Solange ein Livestream läuft, holt SmartVis über go2rtc ein Standbild und speichert es im eigenen
 * Dateispeicher (snapshots/<Kamera>.jpg) – es bleibt bis zum nächsten Livestream das Bild der Kachel.
 */
export class CameraSnapshots {
    private taken: Record<string, number> = {};
    /** State-ID der Livestream-Adresse → Kamera-ID */
    private liveIds = new Map<string, string>();
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(
        private readonly namespace: string,
        private readonly storage: SnapshotStorage,
        private readonly fetchFrame: FrameFetcher,
        private readonly onChange: () => void,
        private readonly log: (message: string) => void,
    ) {}

    async load(): Promise<void> {
        try {
            const raw = await this.storage.read(this.namespace, INDEX);
            const parsed = raw ? (JSON.parse(raw.toString('utf8')) as unknown) : {};
            this.taken = parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {};
        } catch {
            this.taken = {};
        }
    }

    setCameras(cameras: SvCamera[]): void {
        this.liveIds = new Map(cameras.filter(c => c.liveUrl).map(c => [c.liveUrl!.id, c.id]));
    }

    /** Bild der Kamera für die Kachel (Pfad unter /files/… mit Zeitpunkt) */
    snapshot(cameraId: string): { url: string; ts: number } | undefined {
        const ts = this.taken[cameraId];
        return ts ? { url: `/files/${this.namespace}/${DIR}/${fileName(cameraId)}`, ts } : undefined;
    }

    /** Darf der Pfad ausgeliefert werden? Nur gespeicherte Standbilder */
    hasPicture(path: string): boolean {
        return Object.keys(this.taken).some(id => this.snapshot(id)?.url === path);
    }

    /** Anfangswert nach dem Abonnieren (läuft schon ein Stream?) */
    initial(id: string, value: SvStateValue | null | undefined): void {
        this.onState(id, value);
    }

    onState(id: string, value: SvStateValue | null | undefined): void {
        const cameraId = this.liveIds.get(id);
        if (!cameraId) {
            return;
        }
        const url = typeof value?.val === 'string' ? frameUrl(value.val) : undefined;
        this.stop(cameraId);
        if (url) {
            this.schedule(cameraId, url, FIRST_MS);
        }
    }

    stopAll(): void {
        for (const id of [...this.timers.keys()]) {
            this.stop(id);
        }
    }

    private stop(cameraId: string): void {
        const timer = this.timers.get(cameraId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(cameraId);
        }
    }

    private schedule(cameraId: string, url: string, delay: number): void {
        this.timers.set(
            cameraId,
            setTimeout(() => {
                void this.capture(cameraId, url).finally(() => {
                    // Weiter, solange der Stream läuft (stop() entfernt den Eintrag)
                    if (this.timers.has(cameraId)) {
                        this.schedule(cameraId, url, EVERY_MS);
                    }
                });
            }, delay),
        );
    }

    /** Ein Standbild holen und speichern; true, wenn es geklappt hat */
    async capture(cameraId: string, url: string): Promise<boolean> {
        const frame = await this.fetchFrame(url).catch(() => null);
        if (!frame || !frame.type.startsWith('image/') || frame.data.length < MIN_BYTES) {
            this.log(`Kein Standbild vom Livestream für ${cameraId}`);
            return false;
        }
        try {
            await this.storage.write(this.namespace, `${DIR}/${fileName(cameraId)}`, frame.data);
            this.taken = { ...this.taken, [cameraId]: Date.now() };
            await this.storage.write(this.namespace, INDEX, JSON.stringify(this.taken));
        } catch (e) {
            this.log(`Standbild für ${cameraId} nicht gespeichert: ${(e as Error).message}`);
            return false;
        }
        this.onChange();
        return true;
    }
}

/** Standbild per HTTP holen (Node fetch, 15 s Zeitlimit) */
export const fetchFrame: FrameFetcher = async url => {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
        return null;
    }
    return { data: Buffer.from(await res.arrayBuffer()), type: res.headers.get('content-type') || '' };
};
