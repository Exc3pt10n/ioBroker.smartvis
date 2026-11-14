import { useEffect, useRef, useState } from 'react';
import type { SvCamera, SvModel, SvSecurityStation } from '../../../src/shared/protocol';
import { cameraInfo, eventTime, shortEventTime, stationAlarm } from '../cameras';
import { connection, useConnection } from '../connection';
import { SelectState } from '../views/DeviceDetail';
import { Sheet } from './Sheet';
import { Toggle } from './Toggle';

/** Ereignisbild mit Platzhalter, falls (noch) keines vorhanden ist oder das Laden scheitert */
function CameraImage({ src, alt, className }: { src?: string; alt: string; className: string }): React.JSX.Element {
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
function StationRow({ station }: { station: SvSecurityStation }): React.JSX.Element | null {
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

/** Kamera-Karte der Startseite: Alarm, Sicherheitsmodus der Stationen und alle Kameras */
export function CamerasCard({ model }: { model: SvModel }): React.JSX.Element | null {
    const { states } = useConnection();
    const cameras = model.cameras || [];
    if (!cameras.length) {
        return null;
    }
    // Stationen mit Kameras; die HomeBase (mehrere Kameras) zuerst
    const stations = (model.securityStations || [])
        .filter(s => cameras.some(c => c.stationId === s.id))
        .sort(
            (a, b) =>
                cameras.filter(c => c.stationId === b.id).length - cameras.filter(c => c.stationId === a.id).length,
        );
    const alarms = stations.filter(s => stationAlarm(s, states));
    return (
        <section
            className="card"
            aria-label="Kameras"
        >
            <h2 className="subtitle">📷 Kameras</h2>
            {alarms.length > 0 && (
                <p
                    className="camera__alarm"
                    role="alert"
                >
                    🚨 Alarm: {alarms.map(s => s.name).join(', ')}
                </p>
            )}
            <CameraGrid cameras={cameras} />
            {stations.length > 0 && (
                <details className="info__details">
                    <summary>Sicherheitsmodus</summary>
                    {stations.map(s => (
                        <StationRow
                            key={s.id}
                            station={s}
                        />
                    ))}
                </details>
            )}
        </section>
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

    useEffect(
        () => () => {
            // Beim Schließen: laufenden Stream beenden
            if (liveRef.current && camera.liveStop) {
                connection.setState(camera.liveStop.id, true);
            }
        },
        [camera.liveStop],
    );

    const startLive = (): void => {
        if (camera.liveStart) {
            connection.setState(camera.liveStart.id, true);
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
                                src={info.liveUrl}
                                title={`Livestream ${camera.name}`}
                                allow="autoplay; fullscreen"
                            />
                            <a
                                className="linkbtn"
                                href={info.liveUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Livestream in neuem Fenster öffnen ↗
                            </a>
                        </div>
                    ) : (
                        <div className="camera__big camera__placeholder camera__waiting">Stream wird gestartet …</div>
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
                            onClick={live ? stopLive : startLive}
                        >
                            {live ? '⏹ Livestream beenden' : '▶ Livestream'}
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
            </div>
        </Sheet>
    );
}
