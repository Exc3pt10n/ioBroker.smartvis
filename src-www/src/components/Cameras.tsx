import { useEffect, useRef, useState } from 'react';
import type { SvCamera, SvCameraSetting, SvSecurityStation } from '../../../src/shared/protocol';
import { cameraInfo, eventTime, liveStreamUrl, shortEventTime, stationAlarm } from '../cameras';
import { connection, useConnection } from '../connection';
import { SelectState } from '../views/DeviceDetail';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Slider } from './Slider';
import { Toggle } from './Toggle';

/** Ereignisbild mit Platzhalter, falls (noch) keines vorhanden ist oder das Laden scheitert */
export function CameraImage({
    src,
    alt,
    className,
}: {
    src?: string;
    alt: string;
    className: string;
}): React.JSX.Element {
    const [failed, setFailed] = useState<string | undefined>();
    if (!src || failed === src) {
        return (
            <div
                className={`${className} camera__placeholder`}
                role="img"
                aria-label={`${alt}: kein Bild`}
            >
                📷
            </div>
        );
    }
    return (
        <img
            className={className}
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(src)}
        />
    );
}

/** Kachel mit letztem Ereignisbild, Name und Status; Antippen öffnet die Kamera */
export function CameraTile({ camera, onOpen }: { camera: SvCamera; onOpen: () => void }): React.JSX.Element {
    const { states } = useConnection();
    const info = cameraInfo(camera, states);
    const badge = info.status ?? (info.events.length ? info.events.join(' · ') : undefined);
    return (
        <button
            type="button"
            className={`camera${info.disabled || !info.online ? ' camera--off' : ''}${info.events.length ? ' camera--event' : ''}`}
            onClick={onOpen}
            aria-label={`${camera.name}${badge ? `, ${badge}` : ''}`}
        >
            <CameraImage
                className="camera__img"
                src={info.disabled ? undefined : info.image}
                alt={camera.name}
            />
            {badge && (
                <span className={`camera__badge${info.events.length && !info.status ? ' camera__badge--event' : ''}`}>
                    {badge}
                </span>
            )}
            <span className="camera__bar">
                <span className="camera__name">{camera.name}</span>
                {info.imageTs && !info.disabled && (
                    <span
                        className="camera__time"
                        title={`Letztes Ereignis ${eventTime(info.imageTs)}`}
                    >
                        {shortEventTime(info.imageTs)}
                    </span>
                )}
            </span>
        </button>
    );
}

/** Kameras als Raster; die Detailansicht öffnet sich als Sheet */
export function CameraGrid({ cameras }: { cameras: SvCamera[] }): React.JSX.Element {
    const [open, setOpen] = useState<string | undefined>();
    const camera = cameras.find(c => c.id === open);
    return (
        <>
            <div className="cameras">
                {cameras.map(c => (
                    <CameraTile
                        key={c.id}
                        camera={c}
                        onOpen={() => setOpen(c.id)}
                    />
                ))}
            </div>
            {camera && (
                <CameraSheet
                    camera={camera}
                    onClose={() => setOpen(undefined)}
                />
            )}
        </>
    );
}

/** Sicherheitsmodus einer Station (Zuhause, Abwesend …) und Alarm */
export function StationRow({ station }: { station: SvSecurityStation }): React.JSX.Element | null {
    const { states } = useConnection();
    if (!station.guardMode) {
        return null;
    }
    return (
        <div className={`camera__station${stationAlarm(station, states) ? ' camera__station--alarm' : ''}`}>
            {station.guardMode.write ? (
                <SelectState
                    state={station.guardMode}
                    label={`🛡️ ${station.name}`}
                />
            ) : (
                <span>
                    🛡️ {station.name}: {station.guardMode.states?.[String(states[station.guardMode.id]?.val)] ?? '–'}
                </span>
            )}
        </div>
    );
}

/**
 * Detailansicht einer Kamera: großes Ereignisbild, Status, Livestream (go2rtc-Seite des eusec-Adapters),
 * Kamera an/aus, Licht und Schwenken. Ein gestarteter Stream wird beim Schließen beendet (Akku schonen).
 */
export function CameraSheet({ camera, onClose }: { camera: SvCamera; onClose: () => void }): React.JSX.Element {
    const { states, model } = useConnection();
    const info = cameraInfo(camera, states);
    const [live, setLive] = useState(false);
    const liveRef = useRef(false);
    useEffect(() => {
        liveRef.current = live;
    }, [live]);

    // Beim Schließen: laufenden Stream beenden. Abhängig nur von der State-ID – das Kamera-Objekt ist nach
    // jedem neuen Model (z. B. nach einer Neu-Erkennung) ein anderes, das darf den Stream nicht beenden.
    const stopId = camera.liveStop?.id;
    useEffect(
        () => () => {
            if (liveRef.current && stopId) {
                connection.setState(stopId, true);
            }
        },
        [stopId],
    );

    // eusec beendet den Stream nach der eingestellten Höchstdauer (Standard 120 s) und löscht die Adresse
    const [sawUrl, setSawUrl] = useState(false);
    if (live && info.liveUrl && !sawUrl) {
        setSawUrl(true);
    }
    const ended = live && sawUrl && !info.liveUrl;

    const startLive = (): void => {
        if (camera.liveStart) {
            connection.setState(camera.liveStart.id, true);
            setSawUrl(false);
            setLive(true);
        }
    };
    const stopLive = (): void => {
        if (camera.liveStop) {
            connection.setState(camera.liveStop.id, true);
        }
        setLive(false);
    };
    const room = model?.rooms.find(r => r.id === camera.roomId)?.name;
    const station = model?.securityStations?.find(s => s.id === camera.stationId);
    const ptz = camera.panLeft || camera.panRight || camera.tiltUp || camera.tiltDown;
    const press = (ref: typeof camera.panLeft): void => {
        if (ref) {
            connection.setState(ref.id, true);
        }
    };

    return (
        <Sheet
            title={camera.name}
            subtitle={[room, 'Kamera'].filter(Boolean).join(' · ')}
            onClose={onClose}
        >
            <div className="camera__detail">
                {live ? (
                    info.liveUrl ? (
                        <div className="camera__live">
                            <iframe
                                className="camera__frame"
                                src={liveStreamUrl(info.liveUrl)}
                                title={`Livestream ${camera.name}`}
                                allow="autoplay; fullscreen"
                            />
                            <p className="detail__note">
                                Kein Ton? Den Lautsprecher im Video antippen – der Browser startet Videos stumm.
                            </p>
                            <a
                                className="linkbtn"
                                href={liveStreamUrl(info.liveUrl)}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Livestream in neuem Fenster öffnen ↗
                            </a>
                        </div>
                    ) : (
                        <div className="camera__big camera__placeholder camera__waiting">
                            {ended ? (
                                <span>
                                    Livestream beendet
                                    <small>
                                        eusec begrenzt die Dauer (Einstellung „Max camera livestream duration“, Standard
                                        120 s)
                                    </small>
                                </span>
                            ) : (
                                'Stream wird gestartet …'
                            )}
                        </div>
                    )
                ) : (
                    <CameraImage
                        className="camera__big"
                        src={info.disabled ? undefined : info.image}
                        alt={`Letztes Ereignis ${camera.name}`}
                    />
                )}
                <p className="detail__note">
                    {info.status
                        ? info.status
                        : info.events.length
                          ? `Gerade erkannt: ${info.events.join(', ')}`
                          : info.imageTs
                            ? `Letztes Ereignis ${eventTime(info.imageTs)}`
                            : 'Noch kein Ereignisbild'}
                    {info.battery !== undefined ? ` · 🔋 ${Math.round(info.battery)} %` : ''}
                </p>
                <div className="detail__controls">
                    {camera.liveStart && !info.disabled && (
                        <button
                            type="button"
                            className="action action--primary"
                            onClick={live && !ended ? stopLive : startLive}
                        >
                            <Icon
                                name={live && !ended ? 'stop' : 'play'}
                                size={18}
                            />{' '}
                            {ended ? 'Weiter ansehen' : live ? 'Livestream beenden' : 'Livestream'}
                        </button>
                    )}
                    {ptz && !info.disabled && (
                        <div
                            className="camera__ptz"
                            role="group"
                            aria-label="Kamera schwenken"
                        >
                            <button
                                type="button"
                                className="csec__btn camera__ptz-up"
                                disabled={!camera.tiltUp}
                                aria-label="Nach oben"
                                onClick={() => press(camera.tiltUp)}
                            >
                                ▲
                            </button>
                            <button
                                type="button"
                                className="csec__btn camera__ptz-left"
                                disabled={!camera.panLeft}
                                aria-label="Nach links"
                                onClick={() => press(camera.panLeft)}
                            >
                                ◀
                            </button>
                            <button
                                type="button"
                                className="csec__btn camera__ptz-right"
                                disabled={!camera.panRight}
                                aria-label="Nach rechts"
                                onClick={() => press(camera.panRight)}
                            >
                                ▶
                            </button>
                            <button
                                type="button"
                                className="csec__btn camera__ptz-down"
                                disabled={!camera.tiltDown}
                                aria-label="Nach unten"
                                onClick={() => press(camera.tiltDown)}
                            >
                                ▼
                            </button>
                        </div>
                    )}
                    {camera.enabled?.write && (
                        <Toggle
                            state={camera.enabled}
                            label="Kamera eingeschaltet"
                            hint="Aus = Privatmodus, keine Aufnahmen"
                        />
                    )}
                    {camera.light?.write && !info.disabled && (
                        <Toggle
                            state={camera.light}
                            label="Licht"
                        />
                    )}
                    {station?.guardMode && <StationRow station={station} />}
                </div>
                {camera.settings && camera.settings.length > 0 && <CameraSettings settings={camera.settings} />}
            </div>
        </Sheet>
    );
}

const SETTING_GROUPS: { key: SvCameraSetting['group']; label: string }[] = [
    { key: 'detection', label: 'Erkennung' },
    { key: 'recording', label: 'Aufnahme' },
    { key: 'picture', label: 'Bild & Ton' },
    { key: 'notifications', label: 'Benachrichtigungen' },
];

/** Einheiten der eusec-Datenpunkte lesbar ("sec" → "s") */
function unitText(unit: string | undefined): string {
    return unit === 'sec' ? 's' : (unit ?? '');
}

/**
 * Einstellungen der Kamera, je Gruppe aufklappbar (selten gebraucht, daher eingeklappt).
 * Untereinstellungen erscheinen nur, wenn sie gerade wirken (z. B. Empfindlichkeit bei eingeschalteter Erkennung).
 */
function CameraSettings({ settings }: { settings: SvCameraSetting[] }): React.JSX.Element {
    const { states } = useConnection();
    const active = (s: SvCameraSetting): boolean => {
        if (!s.requires) {
            return true;
        }
        const v = states[s.requires.id]?.val;
        return typeof s.requires.value === 'boolean' ? v === s.requires.value : Number(v) === s.requires.value;
    };
    return (
        <div className="camera__settings">
            <h3 className="info__subtitle">Einstellungen</h3>
            {SETTING_GROUPS.map(g => {
                const list = settings.filter(s => s.group === g.key && active(s));
                if (!list.length) {
                    return null;
                }
                return (
                    <details
                        key={g.key}
                        className="camera__setgroup"
                    >
                        <summary>
                            {g.label}
                            <span className="group__count">{list.length}</span>
                        </summary>
                        <div className="camera__setlist">
                            {list.map(s => {
                                const ref = s.state;
                                if (ref.type === 'boolean') {
                                    return (
                                        <Toggle
                                            key={ref.id}
                                            state={ref}
                                            label={s.label}
                                            {...(s.hint && { hint: s.hint })}
                                            compact
                                        />
                                    );
                                }
                                if (ref.states && Object.keys(ref.states).length) {
                                    return (
                                        <div key={ref.id}>
                                            <SelectState
                                                state={ref}
                                                label={s.label}
                                            />
                                            {s.hint && <p className="camera__sethint">{s.hint}</p>}
                                        </div>
                                    );
                                }
                                const value = Number(states[ref.id]?.val);
                                return (
                                    <div key={ref.id}>
                                        <Slider
                                            label={s.label}
                                            value={Number.isFinite(value) ? value : undefined}
                                            min={ref.min ?? 0}
                                            max={ref.max ?? 100}
                                            step={ref.step ?? 1}
                                            pending={states[ref.id]?.ack === false}
                                            format={v =>
                                                `${Math.round(v)}${unitText(ref.unit) ? ` ${unitText(ref.unit)}` : ''}`
                                            }
                                            onCommit={v => connection.setState(ref.id, v)}
                                        />
                                        {s.hint && <p className="camera__sethint">{s.hint}</p>}
                                    </div>
                                );
                            })}
                        </div>
                    </details>
                );
            })}
        </div>
    );
}

/**
 * Startseite: Kameras mit laufender oder frischer Erkennung (Ereignisbild jünger als 10 Minuten).
 * Ohne aktuelles Ereignis erscheint nichts – die Kameras stehen im Bereich Sicherheit.
 */
export function RecentDetectionsCard({
    detections,
    cameras,
}: {
    detections: { cameraId: string; ts: number; events: string[] }[];
    cameras: SvCamera[];
}): React.JSX.Element | null {
    const [open, setOpen] = useState<string | undefined>();
    const list = detections
        .map(d => ({ ...d, camera: cameras.find(c => c.id === d.cameraId) }))
        .filter((d): d is typeof d & { camera: SvCamera } => !!d.camera);
    if (!list.length) {
        return null;
    }
    const camera = cameras.find(c => c.id === open);
    return (
        <section
            className="card"
            aria-label="Gerade erkannt"
        >
            <h2 className="subtitle">📷 Gerade erkannt</h2>
            <div className="cameras">
                {list.map(d => (
                    <CameraTile
                        key={d.cameraId}
                        camera={d.camera}
                        onOpen={() => setOpen(d.cameraId)}
                    />
                ))}
            </div>
            {camera && (
                <CameraSheet
                    camera={camera}
                    onClose={() => setOpen(undefined)}
                />
            )}
        </section>
    );
}
