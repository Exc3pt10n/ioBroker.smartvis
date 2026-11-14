import type { SvCamera, SvSecurityStation, SvStateRef } from '../../shared/protocol';
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

/** Werteliste ins Deutsche übersetzen (unbekannte Werte bleiben) */
function translate(
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
            });
        }
        return cameras.length || stations.length ? { cameras, securityStations: stations } : null;
    },
};

/** Lesende und schreibbare State-Referenzen einer Kamera */
export function cameraRefs(c: SvCamera): { read: SvStateRef[]; write: SvStateRef[] } {
    const write = [c.enabled, c.light, c.liveStart, c.liveStop, c.panLeft, c.panRight, c.tiltUp, c.tiltDown].filter(
        (r): r is SvStateRef => !!r?.write,
    );
    const read = [
        c.picture,
        c.motion,
        c.person,
        c.pet,
        c.sound,
        c.crying,
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
