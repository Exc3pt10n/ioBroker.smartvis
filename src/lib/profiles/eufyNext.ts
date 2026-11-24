import { t } from '../../shared/i18n';
import type { SvCamera, SvCameraSetting, SvSecurityStation, SvStateRef } from '../../shared/protocol';
import { getName } from '../names';
import { translate } from './eusec';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/** Sicherheitsmodi (Bezeichnungen des eufy-SDK, Werte wie bei eusec: 0 Abwesend, 1 Zuhause, 63 Deaktiviert) */
const ARMING_MODES: Record<string, string> = {
    away: 'Away',
    home: 'At home',
    schedule: 'Schedule',
    custom1: 'Custom 1',
    custom2: 'Custom 2',
    custom3: 'Custom 3',
    off: 'Off',
    geo: 'Geofencing',
    disarmed: 'Disarmed',
};

/** Wertelisten des eufy-SDK: lesbare englische Texte (übersetzt in translate()) */
const VALUE_LABELS: Record<string, string> = {
    Off: 'Off',
    Infrared: 'Infrared (black and white)',
    FullColor: 'Color',
    'Full Color': 'Color',
    'Timestamp + Logo': 'Timestamp and logo',
    'Text Only': 'Text only (fast)',
    'Included Thumbnail': 'With thumbnail',
    'Text First, Then Thumbnail': 'Text first, then picture',
    'All Sound': 'All sounds',
    Events: 'On events',
    Continuous: 'Continuous',
    'Optimal Battery Life': 'Long battery life',
    'Optimal Surveillance': 'Best surveillance',
    'Customize Recording': 'Custom',
    'Balance Surveillance': 'Balanced surveillance',
    Timestamp: 'Timestamp',
    TimestampAndLogo: 'Timestamp and logo',
    TextOnly: 'Text only (fast)',
    IncludedThumbnail: 'With thumbnail',
    TextFirstThenThumbnail: 'Text first, then picture',
    Crying: 'Crying',
    AllSound: 'All sounds',
    'HD (720P)': 'HD (720p)',
    'Full HD (1080P)': 'Full HD (1080p)',
    Max: 'Maximum',
    Auto: 'Automatic',
    Battery: 'Battery',
    'External Solar Panel': 'Solar panel',
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
    { key: 'motion.detectionEnabled', group: 'detection', label: 'Motion detection' },
    {
        key: 'motion.humanOnlyAtNight',
        group: 'detection',
        label: 'Only persons at night',
        requires: ['motion.detectionEnabled', true],
    },
    {
        key: 'motion.loiteringDetection',
        group: 'detection',
        label: 'Detect loitering',
        requires: ['motion.detectionEnabled', true],
    },
    { key: 'camera.soundDetection', group: 'detection', label: 'Sound detection' },
    {
        key: 'camera.soundDetectionType',
        group: 'detection',
        label: 'Sounds',
        requires: ['camera.soundDetection', true],
    },
    {
        key: 'camera.antiTheftDetection',
        group: 'detection',
        label: 'Anti-theft alarm',
        hint: 'Alarm when the camera is moved',
    },
    { key: 'battery.workingMode', group: 'recording', label: 'Power mode' },
    {
        key: 'battery.recordDuration',
        group: 'recording',
        label: 'Clip length',
        requires: ['battery.workingMode', 'Customize Recording'],
    },
    {
        key: 'battery.recordInterval',
        group: 'recording',
        label: 'Pause until the next recording',
        requires: ['battery.workingMode', 'Customize Recording'],
    },
    { key: 'audio.audioRecording', group: 'recording', label: 'Record audio' },
    { key: 'camera.recordingQuality', group: 'recording', label: 'Recording quality' },
    { key: 'camera.streamingQuality', group: 'recording', label: 'Livestream quality' },
    { key: 'camera.nightVision', group: 'picture', label: 'Night vision' },
    { key: 'light.brightness', group: 'picture', label: 'Light brightness' },
    { key: 'camera.imageFlipped', group: 'picture', label: 'Rotate picture', hint: 'For cameras mounted upside down' },
    { key: 'camera.watermark', group: 'picture', label: 'Watermark' },
    { key: 'camera.statusLed', group: 'picture', label: 'Status LED' },
    { key: 'audio.microphone', group: 'picture', label: 'Microphone' },
    { key: 'audio.speaker', group: 'picture', label: 'Speaker' },
    { key: 'audio.volume', group: 'picture', label: 'Volume', requires: ['audio.speaker', true] },
    { key: 'ptz.rotationSpeed', group: 'picture', label: 'Pan speed' },
    { key: 'camera.notificationStyle', group: 'notifications', label: 'Notification type' },
];

function cameraSettings(id: string, objects: ObjectMap): SvCameraSetting[] {
    const result: SvCameraSetting[] = [];
    for (const def of SETTINGS) {
        const r = translate(ref(objects, `${id}.${def.key}`, def.label), objects, VALUE_LABELS);
        if (!r?.write || !['boolean', 'number', 'string'].includes(String(r.type))) {
            continue;
        }
        // Nur Einstellungen, deren aktuellen Wert die Kamera meldet (nicht die reinen Befehle "set…")
        if ((objects[r.id]?.common as ioBroker.StateCommon | undefined)?.read === false) {
            continue;
        }
        // Zahl ohne Werteliste und ohne Bereich (z. B. Energiemodus als Index) wäre ein nichtssagender Regler
        if (r.type === 'number' && !r.states && (r.min === undefined || r.max === undefined)) {
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
            label: t(def.label),
            ...(def.hint && { hint: t(def.hint) }),
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
 * (HomeBase, Innenkameras mit eigener Station) `arming.mode`. Livestream ab eufy-next 0.2.0 über die mitgelieferte
 * go2rtc-Seite (`livestream.start/stop/url`), außerdem "Aktuelles Bild" (`snapshot.refreshLive`).
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
            const guardMode = translate(s('arming.mode', 'Security mode'), objects, ARMING_MODES);
            if (guardMode) {
                stations.push({
                    id,
                    name,
                    adapter: 'eufy-next',
                    guardMode,
                    alarm: event(objects, id, ['alarm'], 'Alarm'),
                    connected: s('info.available', 'Reachable'),
                });
            }
            const picture = s('snapshot.url', 'Event picture');
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
                pictureRefresh: s('snapshot.refreshLive', 'Take current picture'),
                motion: event(objects, id, ['motion'], 'Motion'),
                person: event(objects, id, ['personDetected', 'strangerDetected'], 'Person'),
                pet: event(objects, id, ['petDetection', 'dogDetected'], 'Pet'),
                sound: event(objects, id, ['soundDetected'], 'Sound'),
                crying: event(objects, id, ['cryingDetected'], 'Crying'),
                ring: event(objects, id, ['doorbellPress'], 'Doorbell'),
                vehicle: event(objects, id, ['vehicleDetected'], 'Vehicle'),
                enabled: s('camera.enabled', 'Camera on'),
                status: s('info.available', 'Reachable'),
                battery: s('battery.level', 'Battery'),
                light: s('light.isOn', 'Light'),
                // Livestream (ab eufy-next 0.2.0): go2rtc-Seite in livestream.url, nur solange der Stream läuft
                liveStart: s('livestream.start', 'Start stream'),
                liveStop: s('livestream.stop', 'Stop stream'),
                liveUrl: s('livestream.url', 'Livestream'),
                panLeft: s('ptz.left', 'Pan left'),
                panRight: s('ptz.right', 'Pan right'),
                tiltUp: s('ptz.up', 'Tilt up'),
                tiltDown: s('ptz.down', 'Tilt down'),
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
