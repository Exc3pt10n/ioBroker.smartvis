import { useEffect, useState } from 'react';
import type { SvDevice, SvModel, SvSecurityStation, SvStateValue } from '../../src/shared/protocol';
import { cameraInfo } from './cameras';
import { connection } from './connection';
import { isActive } from './device';

type States = Record<string, SvStateValue | null>;

export type SecurityMode = 'home' | 'away' | 'off';

/** Beschriftungen der Modi (wie vom Profil übersetzt) */
const MODE_LABELS: Record<SecurityMode, string> = { home: 'Zuhause', away: 'Abwesend', off: 'Deaktiviert' };

export const MODE_CHOICES: { mode: SecurityMode; label: string; icon: string }[] = [
    { mode: 'home', label: 'Zuhause', icon: 'home' },
    { mode: 'away', label: 'Abwesend', icon: 'walk' },
    { mode: 'off', label: 'Aus', icon: 'power' },
];

/** Stationen, deren Modus SmartVis setzen darf */
export function modeStations(model: SvModel): SvSecurityStation[] {
    return (model.securityStations || []).filter(s => s.guardMode?.write);
}

function valueFor(station: SvSecurityStation, mode: SecurityMode): string | undefined {
    return Object.entries(station.guardMode?.states || {}).find(([, label]) => label === MODE_LABELS[mode])?.[0];
}

/** Modus einer Station (undefined = anderer Modus, z. B. Zeitplan) */
function stationMode(station: SvSecurityStation, states: States): SecurityMode | undefined {
    const val = station.guardMode ? states[station.guardMode.id]?.val : undefined;
    if (val === undefined || val === null) {
        return undefined;
    }
    return (Object.keys(MODE_LABELS) as SecurityMode[]).find(m => valueFor(station, m) === String(val));
}

/** Gemeinsamer Modus aller Stationen; "mixed", wenn sie sich unterscheiden */
export function securityMode(
    stations: SvSecurityStation[],
    states: States,
): { mode: SecurityMode | 'mixed' | undefined; label: string } {
    const modes = stations.map(s => stationMode(s, states));
    if (!modes.length) {
        return { mode: undefined, label: '–' };
    }
    if (modes.every(m => m && m === modes[0])) {
        return { mode: modes[0], label: MODE_LABELS[modes[0]!] };
    }
    // Ein anderer Modus (z. B. Zeitplan) bei nur einer Station: dessen Beschriftung
    if (stations.length === 1) {
        const s = stations[0];
        const val = s.guardMode ? states[s.guardMode.id]?.val : undefined;
        return { mode: undefined, label: s.guardMode?.states?.[String(val)] ?? '–' };
    }
    return { mode: 'mixed', label: 'Gemischt' };
}

/** Modus an alle Stationen senden, die ihn kennen */
export function setSecurityMode(stations: SvSecurityStation[], mode: SecurityMode): void {
    for (const s of stations) {
        const v = valueFor(s, mode);
        if (s.guardMode && v !== undefined) {
            connection.setState(s.guardMode.id, s.guardMode.type === 'number' ? Number(v) : v);
        }
    }
}

/** Gerätetypen im Bereich Sicherheit */
export const ALARM_TYPES = ['fireAlarm', 'floodAlarm', 'coAlarm', 'warning'];
export const OPENING_TYPES = ['window', 'windowTilt', 'door', 'lock', 'gate'];
export const MOTION_TYPES = ['motion'];

/** Aktive Alarme: ausgelöste Stationen und Melder (Rauch, Wasser, CO) */
export function activeAlarms(model: SvModel, states: States, devices: SvDevice[]): string[] {
    const stations = (model.securityStations || []).filter(s => s.alarm && states[s.alarm.id]?.val === true);
    const detectors = devices.filter(d => ALARM_TYPES.includes(d.type) && isActive(d, states));
    return [...stations.map(s => `Alarm ${s.name}`), ...detectors.map(d => d.name)];
}

/** Jüngste Kamera-Erkennung (laufend oder Ereignisbild jünger als maxAgeMs) */
export function recentDetections(
    model: SvModel,
    states: States,
    now: number,
    maxAgeMs = 10 * 60_000,
): { cameraId: string; ts: number; events: string[] }[] {
    return (model.cameras || [])
        .map(c => {
            const info = cameraInfo(c, states);
            return { cameraId: c.id, ts: info.imageTs ?? 0, events: info.events, disabled: info.disabled };
        })
        .filter(x => !x.disabled && (x.events.length > 0 || (x.ts && now - x.ts <= maxAgeMs)))
        .sort((a, b) => b.ts - a.ts)
        .map(({ cameraId, ts, events }) => ({ cameraId, ts, events }));
}

/** Aktuelle Zeit, regelmäßig aufgefrischt (für "vor 10 Minuten" o. ä.) */
export function useNow(intervalMs = 60_000): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
}

/** Hauptstation: die mit den meisten Kameras (z. B. HomeBase), sonst die erste */
export function primaryStation(model: SvModel): SvSecurityStation | undefined {
    const stations = modeStations(model);
    const count = (s: SvSecurityStation): number => (model.cameras || []).filter(c => c.stationId === s.id).length;
    return [...stations].sort((a, b) => count(b) - count(a))[0];
}
