import type { SvCamera, SvCameraEvent, SvStateRef, SvStateValue } from '../shared/protocol';

/** Dateizugriff (im Adapter: ioBroker-Dateispeicher; in Tests: Speicher im RAM) */
export interface EventStorage {
    read(meta: string, path: string): Promise<Buffer | null>;
    write(meta: string, path: string, data: Buffer | string): Promise<void>;
    remove(meta: string, path: string): Promise<void>;
}

const INDEX = 'events/index.json';
/** Je Kamera höchstens so viele Ereignisse … */
const MAX_PER_CAMERA = 30;
/** … und nicht älter als 7 Tage */
const MAX_AGE = 7 * 86_400_000;
/** Erkennungen innerhalb dieser Zeit gehören zum selben Ereignis */
const MERGE_MS = 60_000;
/** So lange nach Beginn wird ein neues Ereignisbild noch dem Ereignis zugeordnet */
const PICTURE_MS = 3 * 60_000;

type Kind = 'person' | 'pet' | 'motion' | 'sound' | 'crying';
const KINDS: Kind[] = ['person', 'pet', 'motion', 'sound', 'crying'];

/**
 * Ereignisprotokoll der Kameras: eusec meldet nur das jeweils letzte Ereignisbild (und lädt keine Clips).
 * SmartVis merkt sich deshalb jede Erkennung (Person, Bewegung …) und kopiert das zugehörige Ereignisbild
 * in den eigenen Dateispeicher (events/<Kamera>/<ts>.jpg), damit ältere Ereignisse sichtbar bleiben.
 */
export class CameraEventLog {
    private events: Record<string, SvCameraEvent[]> = {};
    private watch = new Map<string, { camera: SvCamera; kind: Kind | 'picture' }>();
    private last = new Map<string, SvStateValue | null>();
    private queue: Promise<void> = Promise.resolve();
    private saveTimer?: NodeJS.Timeout;

    constructor(
        private readonly namespace: string,
        private readonly storage: EventStorage,
        private readonly onError: (message: string) => void = () => undefined,
        private readonly now: () => number = Date.now,
    ) {}

    /** Gespeicherten Index laden (beim Start) */
    async load(): Promise<void> {
        try {
            const raw = await this.storage.read(this.namespace, INDEX);
            const parsed = raw ? (JSON.parse(raw.toString('utf8')) as unknown) : {};
            this.events = parsed && typeof parsed === 'object' ? (parsed as Record<string, SvCameraEvent[]>) : {};
        } catch (e) {
            this.onError(`Kamera-Ereignisse konnten nicht geladen werden: ${(e as Error).message}`);
            this.events = {};
        }
    }

    /** Erkannte Kameras (nach jeder Erkennung) */
    setCameras(cameras: SvCamera[]): void {
        this.watch.clear();
        for (const camera of cameras) {
            const refs: [SvStateRef | undefined, Kind | 'picture'][] = [
                [camera.person, 'person'],
                [camera.pet, 'pet'],
                [camera.motion, 'motion'],
                [camera.sound, 'sound'],
                [camera.crying, 'crying'],
                [camera.picture, 'picture'],
            ];
            for (const [ref, kind] of refs) {
                if (ref) {
                    this.watch.set(ref.id, { camera, kind });
                }
            }
        }
    }

    /** Ausgangswert (beim Abonnieren) – erzeugt kein Ereignis */
    initial(id: string, value: SvStateValue | null): void {
        if (this.watch.has(id)) {
            this.last.set(id, value);
        }
    }

    /** State-Änderung; Ereignisse entstehen bei neuer Erkennung (false → true) bzw. neuem Ereignisbild */
    onState(id: string, value: SvStateValue | null): void {
        const entry = this.watch.get(id);
        if (!entry) {
            return;
        }
        const previous = this.last.get(id);
        this.last.set(id, value);
        if (!value) {
            return;
        }
        if (entry.kind === 'picture') {
            if (typeof value.val === 'string' && value.val.startsWith('/files/') && value.ts !== previous?.ts) {
                const path = value.val;
                const ts = value.ts || this.now();
                this.enqueue(() => this.addPicture(entry.camera, path, ts));
            }
            return;
        }
        if (value.val === true && previous?.val !== true) {
            this.addDetection(entry.camera, entry.kind, value.ts || this.now());
        }
    }

    /** Neueste zuerst; ohne cameraId alle Kameras */
    list(cameraId?: string, limit = 50): SvCameraEvent[] {
        const all = cameraId ? (this.events[cameraId] ?? []) : Object.values(this.events).flat();
        return [...all].sort((a, b) => b.ts - a.ts).slice(0, limit);
    }

    /** Gehört der Pfad zu einem gespeicherten Ereignisbild? */
    hasPicture(path: string): boolean {
        return Object.values(this.events).some(list => list.some(e => e.picture === path));
    }

    /** Warten, bis alle Kopien und Speichervorgänge erledigt sind (Tests, Beenden) */
    async flush(): Promise<void> {
        await this.queue;
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = undefined;
            await this.save();
        }
    }

    private addDetection(camera: SvCamera, kind: Kind, ts: number): void {
        const list = (this.events[camera.id] ??= []);
        const open = list.find(e => ts - e.ts >= 0 && ts - e.ts <= MERGE_MS);
        if (open) {
            if (!open.kinds.includes(kind)) {
                open.kinds = KINDS.filter(k => k === kind || open.kinds.includes(k));
            }
        } else {
            list.push({ id: `${camera.id}@${ts}`, cameraId: camera.id, ts, kinds: [kind] });
        }
        this.enqueue(() => this.prune(camera.id));
        this.scheduleSave();
    }

    private async addPicture(camera: SvCamera, source: string, ts: number): Promise<void> {
        const m = /^\/files\/([^/]+)\/(.+)$/.exec(source);
        if (!m || m[2].split('/').includes('..')) {
            return;
        }
        const list = (this.events[camera.id] ??= []);
        // Jüngstes Ereignis ohne Bild, das kurz vorher begonnen hat; sonst eigenes Ereignis (nur Bild)
        let event = [...list]
            .sort((a, b) => b.ts - a.ts)
            .find(e => !e.picture && ts - e.ts >= -5_000 && ts - e.ts <= PICTURE_MS);
        if (!event) {
            event = { id: `${camera.id}@${ts}`, cameraId: camera.id, ts, kinds: [] };
            list.push(event);
        }
        try {
            const data = await this.storage.read(m[1], m[2]);
            if (data) {
                const ext = /\.(\w+)$/.exec(m[2])?.[1] ?? 'jpg';
                const target = `events/${fileKey(camera.id)}/${event.ts}.${ext}`;
                await this.storage.write(this.namespace, target, data);
                event.picture = `/files/${this.namespace}/${target}`;
            }
        } catch (e) {
            this.onError(`Ereignisbild von ${camera.name} konnte nicht gespeichert werden: ${(e as Error).message}`);
        }
        await this.prune(camera.id);
        this.scheduleSave();
    }

    /** Alte Ereignisse samt Bild entfernen */
    private async prune(cameraId: string): Promise<void> {
        const list = (this.events[cameraId] ?? []).sort((a, b) => b.ts - a.ts);
        const cutoff = this.now() - MAX_AGE;
        const keep = list.filter((e, i) => i < MAX_PER_CAMERA && e.ts >= cutoff);
        const drop = list.filter(e => !keep.includes(e));
        this.events[cameraId] = keep;
        for (const e of drop) {
            if (e.picture) {
                const path = e.picture.replace(`/files/${this.namespace}/`, '');
                await this.storage.remove(this.namespace, path).catch(() => undefined);
            }
        }
    }

    private enqueue(task: () => Promise<void>): void {
        this.queue = this.queue.then(task).catch(e => this.onError((e as Error).message));
    }

    /** Index gebündelt speichern (mehrere Erkennungen kurz hintereinander) */
    private scheduleSave(): void {
        if (this.saveTimer) {
            return;
        }
        this.saveTimer = setTimeout(() => {
            this.saveTimer = undefined;
            void this.save();
        }, 2_000);
    }

    private async save(): Promise<void> {
        try {
            await this.storage.write(this.namespace, INDEX, JSON.stringify(this.events));
        } catch (e) {
            this.onError(`Kamera-Ereignisse konnten nicht gespeichert werden: ${(e as Error).message}`);
        }
    }
}

function fileKey(cameraId: string): string {
    return cameraId
        .split('.')
        .pop()!
        .replace(/[^A-Za-z0-9_-]/g, '_');
}
