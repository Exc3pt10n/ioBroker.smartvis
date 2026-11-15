import type { SvCamera, SvCameraSetting, SvSecurityStation, SvStateRef } from '../../shared/protocol';
import { getName } from '../names';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/** Sicherheitsmodi der eufy-Stationen (Werte wie im eusec-Adapter) */
const GUARD_MODES: Record<string, string> = {
    Away: 'Abwesend',
    Home: 'Zuhause',
    Schedule: 'Zeitplan',
    'Custom 1': 'Benutzerdefiniert 1',
    'Custom 2': 'Benutzerdefiniert 2',
    'Custom 3': 'Benutzerdefiniert 3',
    Geofencing: 'Geofencing',
    Disarmed: 'Deaktiviert',
    Off: 'Aus',
};

/** Verbindungsstatus der Kamera */
const CAMERA_STATES: Record<string, string> = {
    Offline: 'Offline',
    Online: 'Online',
    'Manually disabled': 'Ausgeschaltet',
    'Offline low battery': 'Offline – Akku leer',
    'Remove and readd': 'Neu einrichten',
    'Reset and readd': 'Zurücksetzen und neu einrichten',
};

/** Werte der eusec-Wertelisten auf Deutsch (gemeinsam für alle Einstellungen) */
const VALUE_LABELS: Record<string, string> = {
    // Erkennung
    'Humans only': 'Nur Personen',
    'All motions': 'Jede Bewegung',
    Person: 'Personen',
    Pet: 'Haustiere',
    'Person and Pet': 'Personen und Haustiere',
    'All other motions': 'Sonstige Bewegungen',
    'Person and all other motions': 'Personen und sonstige Bewegungen',
    'Pet and all other motions': 'Haustiere und sonstige Bewegungen',
    'Person, Pet and all other motions': 'Personen, Haustiere und sonstige Bewegungen',
    Crying: 'Weinen',
    'All Sounds': 'Alle Geräusche',
    Min: 'Minimal',
    Low: 'Niedrig',
    Medium: 'Mittel',
    High: 'Hoch',
    Max: 'Maximal',
    // Aufnahme
    'Optimal Battery Life': 'Lange Akkulaufzeit',
    'Optimal Surveillance': 'Beste Überwachung',
    'Custom Recording': 'Benutzerdefiniert',
    Always: 'Immer',
    Schedule: 'Zeitplan',
    '2K HD': '2K',
    'Full HD (1080P)': 'Full HD (1080p)',
    Auto: 'Automatisch',
    // Bild
    Off: 'Aus',
    'B&W Night Vision': 'Schwarz-Weiß',
    'Color Night Vision': 'Farbe',
    Timestamp: 'Zeitstempel',
    'Timestamp and Logo': 'Zeitstempel und Logo',
    // Benachrichtigungen
    'Most Efficient': 'Nur Text (schnell)',
    'Include Thumbnail': 'Mit Vorschaubild',
    'Full Effect': 'Mit großem Bild',
};

/**
 * Einstellungen, die SmartVis anbietet (Reihenfolge = Anzeige). Bewusst nicht: RTSP, NAS-Speicher, Sprachausgabe,
 * Bewegungszonen (Polygone), Kalibrieren und Energiequelle – das gehört in die eufy-App bzw. die eusec-Konfiguration.
 */
const SETTINGS: {
    key: string;
    group: SvCameraSetting['group'];
    label: string;
    hint?: string;
    /** Nur wirksam, wenn dieser Datenpunkt der Kamera den Wert hat */
    requires?: [string, boolean | number];
}[] = [
    { key: 'motion_detection', group: 'detection', label: 'Bewegungserkennung' },
    { key: 'motion_detection_type', group: 'detection', label: 'Erkennen', requires: ['motion_detection', true] },
    {
        key: 'motion_detection_sensitivity',
        group: 'detection',
        label: 'Empfindlichkeit Bewegung',
        hint: 'Höher = reagiert auf kleinere Bewegungen',
        requires: ['motion_detection', true],
    },
    {
        key: 'motion_tracking',
        group: 'detection',
        label: 'Bewegung verfolgen',
        hint: 'Kamera schwenkt mit',
        requires: ['motion_detection', true],
    },
    { key: 'pet_detection', group: 'detection', label: 'Haustiere erkennen', requires: ['motion_detection', true] },
    { key: 'sound_detection', group: 'detection', label: 'Geräuscherkennung' },
    { key: 'sound_detection_type', group: 'detection', label: 'Geräusche', requires: ['sound_detection', true] },
    {
        key: 'sound_detection_sensitivity',
        group: 'detection',
        label: 'Empfindlichkeit Geräusch',
        requires: ['sound_detection', true],
    },
    {
        key: 'antitheft_detection',
        group: 'detection',
        label: 'Diebstahlwarnung',
        hint: 'Alarm, wenn die Kamera bewegt wird',
    },
    { key: 'power_working_mode', group: 'recording', label: 'Energiemodus' },
    { key: 'recording_clip_length', group: 'recording', label: 'Clip-Länge', requires: ['power_working_mode', 2] },
    {
        key: 'recording_retrigger_interval',
        group: 'recording',
        label: 'Pause bis zur nächsten Aufnahme',
        requires: ['power_working_mode', 2],
    },
    {
        key: 'recording_end_clip_motion_stops',
        group: 'recording',
        label: 'Clip früher beenden',
        hint: 'Sobald keine Bewegung mehr erkannt wird',
        requires: ['power_working_mode', 2],
    },
    { key: 'continuous_recording', group: 'recording', label: 'Daueraufnahme' },
    {
        key: 'continuous_recording_type',
        group: 'recording',
        label: 'Daueraufnahme wann',
        requires: ['continuous_recording', true],
    },
    { key: 'audio_recording', group: 'recording', label: 'Ton aufnehmen' },
    { key: 'video_recording_quality', group: 'recording', label: 'Aufnahmequalität' },
    { key: 'video_streaming_quality', group: 'recording', label: 'Livestream-Qualität' },
    { key: 'nightvision', group: 'picture', label: 'Nachtsicht' },
    { key: 'auto_nightvision', group: 'picture', label: 'Nachtsicht automatisch' },
    { key: 'light_settings_brightness_manual', group: 'picture', label: 'Helligkeit Licht' },
    { key: 'image_mirrored', group: 'picture', label: 'Bild spiegeln', hint: 'Für über Kopf montierte Kameras' },
    { key: 'watermark', group: 'picture', label: 'Wasserzeichen' },
    { key: 'status_led', group: 'picture', label: 'Status-LED' },
    { key: 'microphone', group: 'picture', label: 'Mikrofon' },
    { key: 'speaker', group: 'picture', label: 'Lautsprecher' },
    { key: 'speaker_volume', group: 'picture', label: 'Lautstärke', requires: ['speaker', true] },
    { key: 'rotation_speed', group: 'picture', label: 'Schwenkgeschwindigkeit' },
    { key: 'notification_type', group: 'notifications', label: 'Art der Benachrichtigung' },
    { key: 'notification_person', group: 'notifications', label: 'Bei Personen' },
    { key: 'notification_pet', group: 'notifications', label: 'Bei Haustieren' },
    { key: 'notification_crying', group: 'notifications', label: 'Bei Weinen' },
    { key: 'notification_all_sound', group: 'notifications', label: 'Bei Geräuschen' },
    { key: 'notification_all_other_motion', group: 'notifications', label: 'Bei sonstigen Bewegungen' },
    { key: 'notification_interval_time', group: 'notifications', label: 'Mindestabstand' },
];

/** Einstellungen einer Kamera, soweit vorhanden und schreibbar */
function cameraSettings(id: string, objects: ObjectMap): SvCameraSetting[] {
    const result: SvCameraSetting[] = [];
    for (const def of SETTINGS) {
        const r = translate(ref(objects, `${id}.${def.key}`, def.label), objects, VALUE_LABELS);
        if (!r?.write || (r.type !== 'boolean' && r.type !== 'number')) {
            continue;
        }
        // Benachrichtigungs-Abstand: Werte sind Minuten ("0", "1" …)
        const state =
            def.key === 'notification_interval_time' && r.states
                ? {
                      ...r,
                      states: Object.fromEntries(
                          Object.entries(r.states).map(([k, v]) => [k, v === '0' ? 'Keiner' : `${v} min`]),
                      ),
                  }
                : r;
        // Abhängigkeit nur, wenn es den steuernden Datenpunkt bei dieser Kamera gibt
        const requires =
            def.requires && objects[`${id}.${def.requires[0]}`]
                ? { id: `${id}.${def.requires[0]}`, value: def.requires[1] }
                : undefined;
        result.push({
            group: def.group,
            label: def.label,
            ...(def.hint && { hint: def.hint }),
            state,
            ...(requires && { requires }),
        });
    }
    return result;
}

/** Werteliste ins Deutsche übersetzen (unbekannte Werte bleiben) */
export function translate(
    r: SvStateRef | undefined,
    objects: ObjectMap,
    table: Record<string, string>,
): SvStateRef | undefined {
    if (!r) {
        return undefined;
    }
    const own = (objects[r.id]?.common as ioBroker.StateCommon | undefined)?.states;
    if (!own || typeof own !== 'object' || Array.isArray(own)) {
        return r;
    }
    return {
        ...r,
        states: Object.fromEntries(Object.entries(own).map(([k, v]) => [k, table[String(v)] ?? String(v)])),
    };
}

/**
 * eufy Security (ioBroker.eusec): Stationen `eusec.0.<Station>` (HomeBase oder Kamera mit eigener Station)
 * mit `station.*` (Sicherheitsmodus, Alarm) und Kameras unter `<Station>.cameras.<Kamera>`.
 * Ereignisbild: `picture_url` = Pfad im ioBroker-Dateispeicher; Livestream über go2rtc nach `start_stream`.
 */
export const eusecProfile: AdapterProfile = {
    adapter: 'eusec',
    claimsInstance: true,
    detect(instance, objects, lang) {
        const cameras: SvCamera[] = [];
        const stations: SvSecurityStation[] = [];
        const depth = instance.split('.').length;
        for (const id of Object.keys(objects).sort()) {
            const obj = objects[id];
            if (obj?.type !== 'device' || !id.startsWith(`${instance}.`)) {
                continue;
            }
            const parts = id.split('.');
            // Station: eusec.0.<Station>
            if (parts.length === depth + 1) {
                const st = `${id}.station`;
                const guardMode = translate(ref(objects, `${st}.guard_mode`, 'Sicherheitsmodus'), objects, GUARD_MODES);
                if (!guardMode && !objects[`${st}.alarm`]) {
                    continue;
                }
                stations.push({
                    id,
                    name: getName(obj, lang) || parts[depth],
                    adapter: 'eusec',
                    guardMode,
                    currentMode: translate(ref(objects, `${st}.current_mode`, 'Aktueller Modus'), objects, GUARD_MODES),
                    alarm: ref(objects, `${st}.alarm`, 'Alarm'),
                    connected: ref(objects, `${st}.connection`, 'Verbunden'),
                });
                continue;
            }
            // Kamera: eusec.0.<Station>.cameras.<Kamera>
            if (parts.length !== depth + 3 || parts[depth + 1] !== 'cameras') {
                continue;
            }
            const s = (key: string, label: string): SvStateRef | undefined => ref(objects, `${id}.${key}`, label);
            cameras.push({
                id,
                name: getName(obj, lang) || parts[depth + 2],
                adapter: 'eusec',
                roomId: null,
                // Modell aus der Seriennummer (T8142… = eufyCam, T8410… = Indoor Cam Pan & Tilt)
                model: /^T\d{4}/.exec(parts[depth + 2])?.[0],
                picture: s('picture_url', 'Ereignisbild'),
                motion: s('motion_detected', 'Bewegung'),
                person: s('person_detected', 'Person'),
                pet: s('pet_detected', 'Haustier'),
                sound: s('sound_detected', 'Geräusch'),
                crying: s('crying_detected', 'Weinen'),
                enabled: s('enabled', 'Kamera an'),
                status: translate(s('state', 'Status'), objects, CAMERA_STATES),
                battery: s('battery', 'Akku'),
                light: s('light', 'Licht'),
                liveStart: s('start_stream', 'Stream starten'),
                liveStop: s('stop_stream', 'Stream beenden'),
                liveUrl: s('livestream', 'Livestream'),
                panLeft: s('pan_left', 'Nach links'),
                panRight: s('pan_right', 'Nach rechts'),
                tiltUp: s('tilt_up', 'Nach oben'),
                tiltDown: s('tilt_down', 'Nach unten'),
                stationId: parts.slice(0, depth + 1).join('.'),
                settings: cameraSettings(id, objects),
            });
        }
        return cameras.length || stations.length ? { cameras, securityStations: stations } : null;
    },
};

/** Lesende und schreibbare State-Referenzen einer Kamera */
export function cameraRefs(c: SvCamera): { read: SvStateRef[]; write: SvStateRef[] } {
    const write = [
        c.enabled,
        c.light,
        c.pictureRefresh,
        c.liveStart,
        c.liveStop,
        c.panLeft,
        c.panRight,
        c.tiltUp,
        c.tiltDown,
        ...(c.settings || []).map(s => s.state),
    ].filter((r): r is SvStateRef => !!r?.write);
    const read = [
        c.picture,
        c.motion,
        c.person,
        c.pet,
        c.sound,
        c.crying,
        c.ring,
        c.status,
        c.battery,
        c.liveUrl,
        c.enabled,
        c.light,
    ].filter((r): r is SvStateRef => !!r);
    return { read, write };
}

/** Lesende und schreibbare State-Referenzen einer Station */
export function stationRefs(s: SvSecurityStation): { read: SvStateRef[]; write: SvStateRef[] } {
    return {
        read: [s.guardMode, s.currentMode, s.alarm, s.connected].filter((r): r is SvStateRef => !!r),
        write: s.guardMode?.write ? [s.guardMode] : [],
    };
}
