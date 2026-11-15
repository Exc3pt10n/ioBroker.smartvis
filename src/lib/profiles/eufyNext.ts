import type { SvCamera, SvCameraSetting, SvSecurityStation, SvStateRef } from '../../shared/protocol';
import { getName } from '../names';
import { translate } from './eusec';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/** Sicherheitsmodi (Bezeichnungen des eufy-SDK, Werte wie bei eusec: 0 Abwesend, 1 Zuhause, 63 Deaktiviert) */
const ARMING_MODES: Record<string, string> = {
    away: 'Abwesend',
    home: 'Zuhause',
    schedule: 'Zeitplan',
    custom1: 'Benutzerdefiniert 1',
    custom2: 'Benutzerdefiniert 2',
    custom3: 'Benutzerdefiniert 3',
    off: 'Aus',
    geo: 'Geofencing',
    disarmed: 'Deaktiviert',
};

/** Wertelisten des eufy-SDK auf Deutsch */
const VALUE_LABELS: Record<string, string> = {
    Off: 'Aus',
    Infrared: 'Infrarot (schwarz-weiß)',
    FullColor: 'Farbe',
    'Optimal Battery Life': 'Lange Akkulaufzeit',
    'Optimal Surveillance': 'Beste Überwachung',
    'Customize Recording': 'Benutzerdefiniert',
    'Balance Surveillance': 'Ausgewogen',
    Timestamp: 'Zeitstempel',
    TimestampAndLogo: 'Zeitstempel und Logo',
    TextOnly: 'Nur Text (schnell)',
    IncludedThumbnail: 'Mit Vorschaubild',
    TextFirstThenThumbnail: 'Erst Text, dann Bild',
    Crying: 'Weinen',
    AllSound: 'Alle Geräusche',
    'HD (720P)': 'HD (720p)',
    'Full HD (1080P)': 'Full HD (1080p)',
    Max: 'Maximal',
    Auto: 'Automatisch',
    Battery: 'Akku',
    'External Solar Panel': 'Solarpanel',
};

/**
 * Einstellungen, die SmartVis anbietet (Kanal.Datenpunkt wie im Geräte-Manifest des SDK, Reihenfolge = Anzeige).
 * Nur, was die Kamera anbietet und schreibbar ist.
 */
const SETTINGS: {
    key: string;
    group: SvCameraSetting['group'];
    label: string;
    hint?: string;
    requires?: [string, boolean | number | string];
}[] = [
    { key: 'motion.detectionEnabled', group: 'detection', label: 'Bewegungserkennung' },
    {
        key: 'motion.humanOnlyAtNight',
        group: 'detection',
        label: 'Nachts nur Personen',
        requires: ['motion.detectionEnabled', true],
    },
    {
        key: 'motion.loiteringDetection',
        group: 'detection',
        label: 'Herumlungern erkennen',
        requires: ['motion.detectionEnabled', true],
    },
    { key: 'camera.soundDetection', group: 'detection', label: 'Geräuscherkennung' },
    {
        key: 'camera.soundDetectionType',
        group: 'detection',
        label: 'Geräusche',
        requires: ['camera.soundDetection', true],
    },
    {
        key: 'camera.antiTheftDetection',
        group: 'detection',
        label: 'Diebstahlwarnung',
        hint: 'Alarm, wenn die Kamera bewegt wird',
    },
    { key: 'battery.workingMode', group: 'recording', label: 'Energiemodus' },
    {
        key: 'battery.recordDuration',
        group: 'recording',
        label: 'Clip-Länge',
        requires: ['battery.workingMode', 'Customize Recording'],
    },
    {
        key: 'battery.recordInterval',
        group: 'recording',
        label: 'Pause bis zur nächsten Aufnahme',
        requires: ['battery.workingMode', 'Customize Recording'],
    },
    { key: 'audio.audioRecording', group: 'recording', label: 'Ton aufnehmen' },
    { key: 'camera.recordingQuality', group: 'recording', label: 'Aufnahmequalität' },
    { key: 'camera.streamingQuality', group: 'recording', label: 'Livestream-Qualität' },
    { key: 'camera.nightVision', group: 'picture', label: 'Nachtsicht' },
    { key: 'light.brightness', group: 'picture', label: 'Helligkeit Licht' },
    { key: 'camera.imageFlipped', group: 'picture', label: 'Bild drehen', hint: 'Für über Kopf montierte Kameras' },
    { key: 'camera.watermark', group: 'picture', label: 'Wasserzeichen' },
    { key: 'camera.statusLed', group: 'picture', label: 'Status-LED' },
    { key: 'audio.microphone', group: 'picture', label: 'Mikrofon' },
    { key: 'audio.speaker', group: 'picture', label: 'Lautsprecher' },
    { key: 'audio.volume', group: 'picture', label: 'Lautstärke', requires: ['audio.speaker', true] },
    { key: 'ptz.rotationSpeed', group: 'picture', label: 'Schwenkgeschwindigkeit' },
    { key: 'camera.notificationStyle', group: 'notifications', label: 'Art der Benachrichtigung' },
];

function cameraSettings(id: string, objects: ObjectMap): SvCameraSetting[] {
    const result: SvCameraSetting[] = [];
    for (const def of SETTINGS) {
        const r = translate(ref(objects, `${id}.${def.key}`, def.label), objects, VALUE_LABELS);
        if (!r?.write || !['boolean', 'number', 'string'].includes(String(r.type))) {
            continue;
        }
        // Text nur mit Werteliste (Auswahl), sonst wäre es ein freies Eingabefeld
        if (r.type === 'string' && !r.states) {
            continue;
        }
        const requires =
            def.requires && objects[`${id}.${def.requires[0]}`]
                ? { id: `${id}.${def.requires[0]}`, value: def.requires[1] }
                : undefined;
        result.push({
            group: def.group,
            label: def.label,
            ...(def.hint && { hint: def.hint }),
            state: r,
            ...(requires && { requires }),
        });
    }
    return result;
}

/** Erstes vorhandenes Ereignis ("events.<name>.triggered", wird vom Adapter nach einigen Sekunden zurückgesetzt) */
function event(objects: ObjectMap, id: string, names: string[], label: string): SvStateRef | undefined {
    for (const name of names) {
        const r = ref(objects, `${id}.events.${name}.triggered`, label);
        if (r) {
            return r;
        }
    }
    return undefined;
}

/**
 * eufy (ioBroker.eufy-next): je Gerät `eufy-next.0.<SN>`, ein Kanal je Fähigkeit aus dem Manifest des eufy-SDK.
 * Kameras haben `camera.*` und `snapshot.url` (Ereignisbild, vom neuen SDK korrekt entschlüsselt), Stationen
 * (HomeBase, Innenkameras mit eigener Station) `arming.mode`. Kein Livestream: Das SDK liefert Video nur als
 * Datenstrom, nicht als Webseite – SmartVis bietet dafür "Aktuelles Bild" (`snapshot.refreshLive`).
 */
export const eufyNextProfile: AdapterProfile = {
    adapter: 'eufy-next',
    claimsInstance: true,
    detect(instance, objects, lang) {
        const cameras: SvCamera[] = [];
        const stations: SvSecurityStation[] = [];
        const depth = instance.split('.').length;
        for (const id of Object.keys(objects).sort()) {
            const obj = objects[id];
            if (obj?.type !== 'device' || !id.startsWith(`${instance}.`) || id.split('.').length !== depth + 1) {
                continue;
            }
            const sn = id.split('.')[depth];
            const name = getName(obj, lang) || sn;
            const s = (key: string, label: string): SvStateRef | undefined => ref(objects, `${id}.${key}`, label);
            const guardMode = translate(s('arming.mode', 'Sicherheitsmodus'), objects, ARMING_MODES);
            if (guardMode) {
                stations.push({
                    id,
                    name,
                    adapter: 'eufy-next',
                    guardMode,
                    alarm: event(objects, id, ['alarm'], 'Alarm'),
                    connected: s('info.available', 'Erreichbar'),
                });
            }
            const picture = s('snapshot.url', 'Ereignisbild');
            if (!objects[`${id}.camera`] && !picture) {
                continue;
            }
            const native = (obj.native || {}) as { model?: unknown };
            cameras.push({
                id,
                name,
                adapter: 'eufy-next',
                roomId: null,
                model: typeof native.model === 'string' && native.model ? native.model : undefined,
                picture,
                pictureUsable: !!picture,
                pictureRefresh: s('snapshot.refreshLive', 'Aktuelles Bild aufnehmen'),
                motion: event(objects, id, ['motion'], 'Bewegung'),
                person: event(objects, id, ['personDetected', 'strangerDetected'], 'Person'),
                pet: event(objects, id, ['petDetection', 'dogDetected'], 'Haustier'),
                sound: event(objects, id, ['soundDetected'], 'Geräusch'),
                crying: event(objects, id, ['cryingDetected'], 'Weinen'),
                ring: event(objects, id, ['doorbellPress'], 'Klingel'),
                enabled: s('camera.enabled', 'Kamera an'),
                status: s('info.available', 'Erreichbar'),
                battery: s('battery.level', 'Akku'),
                light: s('light.isOn', 'Licht'),
                panLeft: s('ptz.left', 'Nach links'),
                panRight: s('ptz.right', 'Nach rechts'),
                tiltUp: s('ptz.up', 'Nach oben'),
                tiltDown: s('ptz.down', 'Nach unten'),
                ...(guardMode && { stationId: id }),
                settings: cameraSettings(id, objects),
            });
        }
        // Kameras ohne eigene Station: bei genau einer HomeBase gehören sie zu ihr
        // (die Zuordnung steht nur im Wert von info.stationSn, nicht in den Objekten)
        const bases = stations.filter(st => !cameras.some(c => c.id === st.id));
        if (bases.length === 1) {
            for (const c of cameras) {
                c.stationId ??= bases[0].id;
            }
        }
        return cameras.length || stations.length ? { cameras, securityStations: stations } : null;
    },
};
