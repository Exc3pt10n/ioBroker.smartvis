import type { SvDevice } from '../../../src/shared/protocol';
import { CameraGrid, EventTimeline, StationRow } from '../components/Cameras';
import { CustomSections, type SectionDef } from '../components/CustomSections';
import { DeviceTile } from '../components/DeviceTile';
import { Icon } from '../components/Icon';
import { EditBanner, EditButton } from '../components/EditButton';
import { useConnection } from '../connection';
import { isActive } from '../device';
import { useEditing, visibleDevices } from '../editing';
import {
    ALARM_TYPES,
    MODE_CHOICES,
    MOTION_TYPES,
    OPENING_TYPES,
    activeAlarms,
    modeStations,
    securityMode,
    setSecurityMode,
} from '../security';

/** Geräte als Kachelraster; aktive (offen, ausgelöst) zuerst */
function Tiles({
    devices,
    states,
    roomName,
}: {
    devices: SvDevice[];
    states: Parameters<typeof isActive>[1];
    roomName: (id: string | null) => string;
}): React.JSX.Element {
    const sorted = [...devices].sort((a, b) => Number(isActive(b, states)) - Number(isActive(a, states)));
    return (
        <div className="grid">
            {sorted.map(d => (
                <DeviceTile
                    key={d.id}
                    device={d}
                    showRoom={roomName(d.roomId) || undefined}
                />
            ))}
        </div>
    );
}

/**
 * Bereich Sicherheit: Sicherheitsmodus aller Stationen, Kameras, Ereignis-Zeitleiste,
 * Melder (Rauch, Wasser, CO), Fenster/Türen/Schlösser und Bewegungsmelder.
 */
export function SecurityView(): React.JSX.Element {
    const { model, states } = useConnection();
    const { editing } = useEditing();
    if (!model) {
        return <p className="empty">Lade …</p>;
    }
    const devices = visibleDevices(model, false);
    const cameras = model.cameras || [];
    const stations = modeStations(model);
    const allStations = model.securityStations || [];
    const mode = securityMode(stations, states);
    const alarms = activeAlarms(model, states, devices);
    const roomName = (id: string | null): string => model.rooms.find(r => r.id === id)?.name ?? '';
    const byRoom = (a: SvDevice, b: SvDevice): number =>
        roomName(a.roomId).localeCompare(roomName(b.roomId), 'de') || a.name.localeCompare(b.name, 'de');
    const detectors = devices.filter(d => ALARM_TYPES.includes(d.type)).sort(byRoom);
    const openings = devices.filter(d => OPENING_TYPES.includes(d.type)).sort(byRoom);
    const motions = devices.filter(d => MOTION_TYPES.includes(d.type)).sort(byRoom);
    const openCount = openings.filter(d => isActive(d, states)).length;
    const placeholder = (text: string): React.ReactNode =>
        editing ? <p className="csec__placeholder">{text}</p> : null;

    const sections: SectionDef[] = [
        {
            key: 'mode',
            label: 'Sicherheitsmodus',
            node: stations.length ? (
                <section
                    className="card"
                    aria-label="Sicherheitsmodus"
                >
                    <h2 className="subtitle">🛡️ Sicherheitsmodus</h2>
                    <div
                        className="segmented security__modes"
                        role="radiogroup"
                        aria-label="Sicherheitsmodus aller Stationen"
                    >
                        {MODE_CHOICES.map(c => (
                            <button
                                key={c.mode}
                                type="button"
                                role="radio"
                                aria-checked={mode.mode === c.mode}
                                className={mode.mode === c.mode ? 'segmented--active' : ''}
                                onClick={() => setSecurityMode(stations, c.mode)}
                            >
                                <Icon
                                    name={c.icon}
                                    size={18}
                                />{' '}
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <p className="detail__note">
                        {mode.mode === 'mixed'
                            ? 'Die Stationen sind unterschiedlich eingestellt.'
                            : mode.mode
                              ? `Alle ${stations.length > 1 ? `${stations.length} Stationen` : 'Kameras'}: ${mode.label}`
                              : `Aktuell: ${mode.label}`}
                    </p>
                    {allStations.length > 1 && (
                        <details className="info__details">
                            <summary>Je Station einstellen</summary>
                            {allStations.map(s => (
                                <StationRow
                                    key={s.id}
                                    station={s}
                                />
                            ))}
                        </details>
                    )}
                </section>
            ) : null,
        },
        {
            key: 'cameras',
            label: 'Kameras',
            node: cameras.length ? (
                <section
                    className="group"
                    aria-labelledby="sec-cameras"
                >
                    <h2
                        id="sec-cameras"
                        className="subtitle"
                    >
                        📷 Kameras <span className="group__count">{cameras.length}</span>
                    </h2>
                    <CameraGrid cameras={cameras} />
                </section>
            ) : null,
        },
        {
            key: 'events',
            label: 'Ereignisse',
            node: cameras.length ? (
                <section
                    className="card"
                    aria-labelledby="sec-events"
                >
                    <h2
                        id="sec-events"
                        className="subtitle"
                    >
                        🕒 Ereignisse
                    </h2>
                    <EventTimeline cameras={cameras} />
                </section>
            ) : null,
        },
        {
            key: 'detectors',
            label: 'Melder',
            node: detectors.length ? (
                <section
                    className="group"
                    aria-labelledby="sec-detectors"
                >
                    <h2
                        id="sec-detectors"
                        className="subtitle"
                    >
                        🔥 Melder <span className="group__count">{detectors.length}</span>
                    </h2>
                    <Tiles
                        devices={detectors}
                        states={states}
                        roomName={roomName}
                    />
                </section>
            ) : (
                placeholder('Rauch-, Wasser- und CO-Melder erscheinen hier, sobald welche erkannt sind.')
            ),
        },
        {
            key: 'openings',
            label: 'Fenster & Türen',
            node: openings.length ? (
                <section
                    className="group"
                    aria-labelledby="sec-openings"
                >
                    <h2
                        id="sec-openings"
                        className="subtitle"
                    >
                        🚪 Fenster & Türen{' '}
                        <span className="group__count">{openCount ? `${openCount} offen` : 'alle zu'}</span>
                    </h2>
                    <Tiles
                        devices={openings}
                        states={states}
                        roomName={roomName}
                    />
                </section>
            ) : null,
        },
        {
            key: 'motion',
            label: 'Bewegungsmelder',
            node: motions.length ? (
                <section
                    className="group"
                    aria-labelledby="sec-motion"
                >
                    <h2
                        id="sec-motion"
                        className="subtitle"
                    >
                        🏃 Bewegungsmelder <span className="group__count">{motions.length}</span>
                    </h2>
                    <Tiles
                        devices={motions}
                        states={states}
                        roomName={roomName}
                    />
                </section>
            ) : null,
        },
    ];

    return (
        <>
            <div className="titlebar titlebar--split">
                <h1 className="title">Sicherheit</h1>
                <EditButton />
            </div>
            <EditBanner text="Bereiche am Griff ⠿ ziehen oder mit ↑ ↓ sortieren und aus- oder einblenden" />
            {alarms.length > 0 && (
                <p
                    className="camera__alarm"
                    role="alert"
                >
                    🚨 {alarms.join(' · ')}
                </p>
            )}
            <CustomSections
                view="security"
                className="csecs csecs--stack"
                sections={sections}
            />
        </>
    );
}
