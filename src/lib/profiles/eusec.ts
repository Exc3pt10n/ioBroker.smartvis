import { t } from '../../shared/i18n';
import type { SvCamera, SvCameraSetting, SvSecurityStation, SvStateRef } from '../../shared/protocol';
import { getName } from '../names';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/** Sicherheitsmodi der eufy-Stationen (Werte wie im eusec-Adapter) */
const GUARD_MODES: Record<string, string> = {
    Away: 'Away',
    Home: 'At home',
    Schedule: 'Schedule',
    'Custom 1': 'Custom 1',
    'Custom 2': 'Custom 2',
    'Custom 3': 'Custom 3',
    Geofencing: 'Geofencing',
    Disarmed: 'Disarmed',
    Off: 'Off',
};

/** Verbindungsstatus der Kamera */
const CAMERA_STATES: Record<string, string> = {
    Offline: 'Offline',
    Online: 'Online',
    'Manually disabled': 'Switched off',
    'Offline low battery': 'Offline – battery empty',
    'Remove and readd': 'Set up again',
    'Reset and readd': 'Reset and set up again',
};

/** Werte der eusec-Wertelisten als lesbare englische Texte (gemeinsam für alle Einstellungen, übersetzt in translate()) */
const VALUE_LABELS: Record<string, string> = {
    // Erkennung
    'Humans only': 'Persons only',
    'All motions': 'Any motion',
    Person: 'Persons',
    Pet: 'Pets',
    'Person and Pet': 'Persons and pets',
    'All other motions': 'Other motions',
    'Person and all other motions': 'Persons and other motions',
    'Pet and all other motions': 'Pets and other motions',
    'Person, Pet and all other motions': 'Persons, pets and other motions',
    Crying: 'Crying',
    'All Sounds': 'All sounds',
    Min: 'Minimum',
    Low: 'Low',
    Medium: 'Medium',
    High: 'High',
    Max: 'Maximum',
    // Aufnahme
    'Optimal Battery Life': 'Long battery life',
    'Optimal Surveillance': 'Best surveillance',
    'Custom Recording': 'Custom',
    Always: 'Always',
    Schedule: 'Schedule',
    '2K HD': '2K',
    'Full HD (1080P)': 'Full HD (1080p)',
    Auto: 'Automatic',
    // Bild
    Off: 'Off',
    'B&W Night Vision': 'Black and white',
    'Color Night Vision': 'Color',
    Timestamp: 'Timestamp',
    'Timestamp and Logo': 'Timestamp and logo',
    // Benachrichtigungen
    'Most Efficient': 'Text only (fast)',
    'Include Thumbnail': 'With thumbnail',
    'Full Effect': 'With large picture',
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
    { key: 'motion_detection', group: 'detection', label: 'Motion detection' },
    { key: 'motion_detection_type', group: 'detection', label: 'Detect', requires: ['motion_detection', true] },
    {
        key: 'motion_detection_sensitivity',
        group: 'detection',
        label: 'Motion sensitivity',
        hint: 'Higher = reacts to smaller motions',
        requires: ['motion_detection', true],
    },
    {
        key: 'motion_tracking',
        group: 'detection',
        label: 'Track motion',
        hint: 'The camera follows',
        requires: ['motion_detection', true],
    },
    { key: 'pet_detection', group: 'detection', label: 'Detect pets', requires: ['motion_detection', true] },
    { key: 'sound_detection', group: 'detection', label: 'Sound detection' },
    { key: 'sound_detection_type', group: 'detection', label: 'Sounds', requires: ['sound_detection', true] },
    {
        key: 'sound_detection_sensitivity',
        group: 'detection',
        label: 'Sound sensitivity',
        requires: ['sound_detection', true],
    },
    {
        key: 'antitheft_detection',
        group: 'detection',
        label: 'Anti-theft alarm',
        hint: 'Alarm when the camera is moved',
    },
    { key: 'power_working_mode', group: 'recording', label: 'Power mode' },
    { key: 'recording_clip_length', group: 'recording', label: 'Clip length', requires: ['power_working_mode', 2] },
    {
        key: 'recording_retrigger_interval',
        group: 'recording',
        label: 'Pause until the next recording',
        requires: ['power_working_mode', 2],
    },
    {
        key: 'recording_end_clip_motion_stops',
        group: 'recording',
        label: 'End clip early',
        hint: 'As soon as no more motion is detected',
        requires: ['power_working_mode', 2],
    },
    { key: 'continuous_recording', group: 'recording', label: 'Continuous recording' },
    {
        key: 'continuous_recording_type',
        group: 'recording',
        label: 'Continuous recording when',
        requires: ['continuous_recording', true],
    },
    { key: 'audio_recording', group: 'recording', label: 'Record audio' },
    { key: 'video_recording_quality', group: 'recording', label: 'Recording quality' },
    { key: 'video_streaming_quality', group: 'recording', label: 'Livestream quality' },
    { key: 'nightvision', group: 'picture', label: 'Night vision' },
    { key: 'auto_nightvision', group: 'picture', label: 'Automatic night vision' },
    { key: 'light_settings_brightness_manual', group: 'picture', label: 'Light brightness' },
    { key: 'image_mirrored', group: 'picture', label: 'Mirror picture', hint: 'For cameras mounted upside down' },
    { key: 'watermark', group: 'picture', label: 'Watermark' },
    { key: 'status_led', group: 'picture', label: 'Status LED' },
    { key: 'microphone', group: 'picture', label: 'Microphone' },
    { key: 'speaker', group: 'picture', label: 'Speaker' },
    { key: 'speaker_volume', group: 'picture', label: 'Volume', requires: ['speaker', true] },
    { key: 'rotation_speed', group: 'picture', label: 'Pan speed' },
    { key: 'notification_type', group: 'notifications', label: 'Notification type' },
    { key: 'notification_person', group: 'notifications', label: 'On persons' },
    { key: 'notification_pet', group: 'notifications', label: 'On pets' },
    { key: 'notification_crying', group: 'notifications', label: 'On crying' },
    { key: 'notification_all_sound', group: 'notifications', label: 'On sounds' },
    { key: 'notification_all_other_motion', group: 'notifications', label: 'On other motions' },
    { key: 'notification_interval_time', group: 'notifications', label: 'Minimum interval' },
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
                          Object.entries(r.states).map(([k, v]) => [k, v === '0' ? t('None') : `${v} min`]),
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
            label: t(def.label),
            ...(def.hint && { hint: t(def.hint) }),
            state,
            ...(requires && { requires }),
        });
    }
    return result;
}

/** Werteliste lesbar machen und in die Sprache der Oberfläche übersetzen (unbekannte Werte bleiben) */
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
        states: Object.fromEntries(Object.entries(own).map(([k, v]) => [k, t(table[String(v)] ?? String(v))])),
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
                const guardMode = translate(ref(objects, `${st}.guard_mode`, 'Security mode'), objects, GUARD_MODES);
                if (!guardMode && !objects[`${st}.alarm`]) {
                    continue;
                }
                stations.push({
                    id,
                    name: getName(obj, lang) || parts[depth],
                    adapter: 'eusec',
                    guardMode,
                    currentMode: translate(ref(objects, `${st}.current_mode`, 'Current mode'), objects, GUARD_MODES),
                    alarm: ref(objects, `${st}.alarm`, 'Alarm'),
                    connected: ref(objects, `${st}.connection`, 'Connected'),
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
                picture: s('picture_url', 'Event picture'),
                motion: s('motion_detected', 'Motion'),
                person: s('person_detected', 'Person'),
                pet: s('pet_detected', 'Pet'),
                sound: s('sound_detected', 'Sound'),
                crying: s('crying_detected', 'Crying'),
                enabled: s('enabled', 'Camera on'),
                status: translate(s('state', 'Status'), objects, CAMERA_STATES),
                battery: s('battery', 'Battery'),
                light: s('light', 'Light'),
                liveStart: s('start_stream', 'Start stream'),
                liveStop: s('stop_stream', 'Stop stream'),
                liveUrl: s('livestream', 'Livestream'),
                panLeft: s('pan_left', 'Pan left'),
                panRight: s('pan_right', 'Pan right'),
                tiltUp: s('tilt_up', 'Tilt up'),
                tiltDown: s('tilt_down', 'Tilt down'),
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
        c.vehicle,
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
