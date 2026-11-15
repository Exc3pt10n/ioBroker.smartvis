import type { SvCamera, SvSecurityStation, SvStateRef, SvStateValue } from '../../src/shared/protocol';

type States = Record<string, SvStateValue | null>;

const on = (ref: SvStateRef | undefined, states: States): boolean => !!ref && states[ref.id]?.val === true;

export interface CameraInfo {
    /** Standbild aus dem letzten Livestream (URL mit Zeitstempel gegen Zwischenspeichern) oder undefined */
    image?: string;
    /** Zeitpunkt des Standbilds */
    snapshotTs?: number;
    /** Zeitpunkt des letzten Ereignisses (neues Ereignisbild von eufy) */
    imageTs?: number;
    /** Kamera ausgeschaltet (Privatmodus) */
    disabled: boolean;
    online: boolean;
    /** Status in Worten, wenn nicht "Online" */
    status?: string;
    /** Gerade erkannt: Person, Bewegung … */
    events: string[];
    battery?: number;
    /** Livestream-Seite (nur während der Stream läuft) */
    liveUrl?: string;
}

export function cameraInfo(camera: SvCamera, states: States): CameraInfo {
    const pic = camera.picture ? states[camera.picture.id] : undefined;
    const path = typeof pic?.val === 'string' && pic.val.startsWith('/files/') ? pic.val : undefined;
    const statusVal = camera.status ? states[camera.status.id]?.val : undefined;
    const statusLabel =
        statusVal !== undefined && statusVal !== null
            ? (camera.status?.states?.[String(statusVal)] ?? String(statusVal))
            : undefined;
    const disabled = camera.enabled ? states[camera.enabled.id]?.val === false : statusVal === 2;
    const online = statusVal === undefined || statusVal === null ? true : statusVal === 1 || statusVal === 2;
    const events = [
        on(camera.person, states) && 'Person',
        on(camera.pet, states) && 'Haustier',
        on(camera.crying, states) && 'Weinen',
        on(camera.sound, states) && 'Geräusch',
        !on(camera.person, states) && !on(camera.pet, states) && on(camera.motion, states) && 'Bewegung',
    ].filter((e): e is string => !!e);
    const battery = camera.battery ? Number(states[camera.battery.id]?.val) : NaN;
    const live = camera.liveUrl ? states[camera.liveUrl.id]?.val : undefined;
    return {
        // Die Ereignisbilder von eufy kommen seit 2026 falsch entschlüsselt (Streifen) – nur deren Zeitpunkt zählt
        image: camera.snapshot ? `${camera.snapshot.url}?v=${camera.snapshot.ts}` : undefined,
        snapshotTs: camera.snapshot?.ts,
        imageTs: path ? pic?.ts : undefined,
        disabled,
        online,
        status: disabled ? 'Ausgeschaltet' : online ? undefined : statusLabel || 'Offline',
        events,
        battery: Number.isFinite(battery) ? battery : undefined,
        liveUrl: typeof live === 'string' && /^https?:\/\//.test(live) ? live : undefined,
    };
}

/** Station mit ausgelöstem Alarm? */
export function stationAlarm(station: SvSecurityStation, states: States): boolean {
    return on(station.alarm, states);
}

/** "heute 14:32", "gestern 08:15" oder "Mo., 12.11. 09:00" */
export function eventTime(ts: number, now = Date.now()): string {
    const d = new Date(ts);
    const today = new Date(now);
    const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (ts >= startOfToday) {
        return `heute ${time}`;
    }
    if (ts >= startOfToday - 86_400_000) {
        return `gestern ${time}`;
    }
    return `${d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })} ${time}`;
}

/** Kurzform für Kacheln: "19:35" (heute), "gestern", sonst Wochentag */
export function shortEventTime(ts: number, now = Date.now()): string {
    const d = new Date(ts);
    const today = new Date(now);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (ts >= startOfToday) {
        return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    if (ts >= startOfToday - 86_400_000) {
        return 'gestern';
    }
    return d.toLocaleDateString('de-DE', { weekday: 'short' });
}

/**
 * Livestream-Seite von go2rtc mit Ton: WebRTC (Standard) überträgt den AAC-Ton der eufy-Kameras nicht,
 * MSE und HLS schon – daher diese zuerst, WebRTC als Rückfall.
 */
export function liveStreamUrl(url: string): string {
    if (!/\/stream\.html/.test(url) || /[?&]mode=/.test(url)) {
        return url;
    }
    return `${url}${url.includes('?') ? '&' : '?'}mode=mse,hls,webrtc`;
}

const KIND_LABELS: Record<string, string> = {
    person: 'Person',
    pet: 'Haustier',
    motion: 'Bewegung',
    sound: 'Geräusch',
    crying: 'Weinen',
};

/** "Person · Bewegung" bzw. "Ereignis" */
export function eventLabel(kinds: string[]): string {
    return kinds.length ? kinds.map(k => KIND_LABELS[k] ?? k).join(' · ') : 'Ereignis';
}
