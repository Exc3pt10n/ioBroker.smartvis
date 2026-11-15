/** Kleines Inline-Icon-Set (24px, stroke) – keine externe Icon-Bibliothek nötig */
const PATHS: Record<string, string> = {
    home: 'M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    rooms: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
    back: 'M15 18 9 12l6-6',
    light: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
    socket: 'M7 3v5M17 3v5M5 8h14v4a7 7 0 0 1-14 0zM12 19v2',
    fan: 'M12 12c0-4 1-8 4-8s2 5-4 8zM12 12c4 0 8 1 8 4s-5 2-8-4zM12 12c0 4-1 8-4 8s-2-5 4-8zM12 12c-4 0-8-1-8-4s5-2 8 4z',
    blind: 'M4 4h16M5 4v12h14V4M5 8h14M5 12h14M12 16v4',
    thermostat: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z',
    window: 'M5 3h14v18H5zM12 3v18M5 12h14',
    door: 'M6 21V3h12v18M14 12h.01M4 21h16',
    motion: 'M13 4a1 1 0 1 0 0-.01M10 21l2-6 3 3v3M8 11l3-3 3 2 3 1M11 8l-1 5',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    media: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
    energy: 'M13 2 4 14h7l-1 8 9-12h-7z',
    sensor: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v4l2 2',
    edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4',
    warning: 'M12 3 2 21h20zM12 10v4M12 17h.01',
    shield: 'M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    camera: 'M3 8h4l2-3h6l2 3h4v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    battery: 'M3 8h15v8H3zM21 11v2M6 11v2M9 11v2',
    batteryLow: 'M3 8h15v8H3zM21 11v2M6 11v2',
    car: 'M5 16h14M5 16v2M19 16v2M3 13l2-6h14l2 6v3H3zM7 13h.01M17 13h.01',
    chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
    calendar: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4',
    flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-1 2-2 3-4 3 0-2-1-4-2-5-1 4-4 6-4 11a7 7 0 0 0 7 7z',
    snow: 'M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17',
    sunProtect: 'M3 10h7l1 3h2l1-3h7M5 10l1 4h3l1-4M14 10l1 4h3l1-4',
    up: 'M12 19V5M5 12l7-7 7 7',
    auto: 'M12 3a9 9 0 1 0 9 9M21 3v6h-6M12 7v5l3 2',
    down: 'M12 5v14M19 12l-7 7-7-7',
    stop: 'M7 7h10v10H7z',
    play: 'M7 4v16l13-8z',
    power: 'M12 3v9M6.3 7a8 8 0 1 0 11.4 0',
    walk: 'M13 4a1.5 1.5 0 1 0 0-.01M11 21l1.5-6-2.5-2.5 1-4.5 3 3h3M8.5 12 7 21M11 8.5l-3 2v3',
};

const TYPE_ICON: Record<string, string> = {
    light: 'light',
    dimmer: 'light',
    ct: 'light',
    hue: 'light',
    rgb: 'light',
    rgbSingle: 'light',
    rgbwSingle: 'light',
    cie: 'light',
    socket: 'socket',
    fan: 'fan',
    blind: 'blind',
    thermostat: 'thermostat',
    airCondition: 'thermostat',
    temperature: 'thermostat',
    window: 'window',
    windowTilt: 'window',
    door: 'door',
    motion: 'motion',
    lock: 'lock',
    media: 'media',
    electricity: 'energy',
};

export function iconForType(type: string): string {
    return TYPE_ICON[type] || 'sensor';
}

export function Icon({ name, size = 24 }: { name: string; size?: number }): React.JSX.Element {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d={PATHS[name] || PATHS.sensor} />
        </svg>
    );
}
