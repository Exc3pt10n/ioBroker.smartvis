import { locale, t, tn } from '../../../src/shared/i18n';
import { useState } from 'react';
import type { SvRoom } from '../../../src/shared/protocol';
import { EditBanner, EditButton, MoveButtons } from '../components/EditButton';
import { DragHandle, SortableGrid, useSortable } from '../components/SortableGrid';
import { Icon } from '../components/Icon';
import { connection, useConnection } from '../connection';
import { moved, useEditing, visibleDevices, visibleRooms } from '../editing';
import { CreateRoomSheet, EditRoomSheet } from './EditSheets';
import { roomDevices, roomIcon, roomStatus, type RoomStatus } from '../rooms';
import { activeScene, scenesForRoom } from '../scenes';
import { lowBatteries } from '../battery';
import { switchLights } from '../lightActions';

export function RoomsView({ onNavigate }: { onNavigate: (path: string) => void }): React.JSX.Element {
    const { model, states } = useConnection();
    const { editing } = useEditing();
    const [editRoom, setEditRoom] = useState<SvRoom | null>(null);
    const [creating, setCreating] = useState(false);
    if (!model) {
        return <p className="empty">{t('Loading rooms …')}</p>;
    }
    const devices = visibleDevices(model, editing);
    // Sichtbare Geräte aller Räume: Lichtgruppen zählen nicht doppelt, wenn ihre Lampen woanders stehen
    const shownIds = new Set(devices.filter(d => !d.hidden).map(d => d.id));
    const withoutRoom = devices.filter(d => !d.roomId);
    // Im Bearbeiten-Modus auch leere (z. B. neu angelegte) und ausgeblendete Räume zeigen
    const rooms = visibleRooms(model, editing)
        .filter(r => r.kind !== 'zone')
        .map(r => ({ room: r, devices: devices.filter(d => d.roomId === r.id) }))
        // Räume nur mit Kamera (z. B. Einfahrt) zählen auch
        .filter(r => editing || r.devices.length > 0 || (model.cameras || []).some(c => c.roomId === r.room.id));
    // Hue-Zonen über mehrere Räume: eigener Bereich unter den Räumen
    const zones = visibleRooms(model, editing)
        .filter(r => r.kind === 'zone')
        .map(r => ({ room: r, devices: roomDevices(r, devices) }))
        .filter(r => editing || r.devices.length > 0);
    const weak = lowBatteries(model.batteries, states);
    const weakIn = (roomId: string): number => weak.filter(b => b.roomId === roomId).length;
    const sceneOf = (list: typeof devices): string | undefined => activeScene(scenesForRoom(model, list), states)?.name;
    const openRoom = (room: SvRoom): void =>
        editing ? setEditRoom(room) : onNavigate(`rooms/${encodeURIComponent(room.id)}`);

    return (
        <>
            <div className="titlebar titlebar--split">
                <h1 className="title">{t('Rooms')}</h1>
                <EditButton />
            </div>
            <EditBanner text={t('Tap a room to rename or hide it · drag it by the handle ⠿ or sort it with ← →')} />
            <SortableGrid
                className="grid grid--rooms"
                items={rooms}
                getId={r => r.room.id}
                kind="roomOrder"
                render={({ room, devices: list }, order) => {
                    const i = order.indexOf(room.id);
                    return (
                        <RoomCard
                            key={room.id}
                            room={room}
                            status={roomStatus(list, states, shownIds)}
                            scene={sceneOf(list)}
                            weakBatteries={weakIn(room.id)}
                            count={list.length}
                            cameras={(model.cameras || []).filter(c => c.roomId === room.id).length}
                            editing={editing}
                            canBack={i > 0}
                            canForward={i < order.length - 1}
                            onOpen={() => openRoom(room)}
                            onMove={delta => {
                                const ids = moved(order, room.id, delta);
                                if (ids) {
                                    connection.edit({ kind: 'roomOrder', ids });
                                }
                            }}
                        />
                    );
                }}
                after={
                    <>
                        {withoutRoom.length > 0 && (
                            <div className="room-wrap">
                                <button
                                    type="button"
                                    className="room room--none"
                                    onClick={() => onNavigate('rooms/_none')}
                                >
                                    <span
                                        className="room__icon"
                                        aria-hidden="true"
                                    >
                                        ❔
                                    </span>
                                    <span className="room__name">{t('Without room')}</span>
                                    <span className="room__meta">
                                        {tn(withoutRoom.length, '{n} device', '{n} devices')}
                                    </span>
                                </button>
                            </div>
                        )}
                        {editing && (
                            <button
                                type="button"
                                className="room room--add"
                                onClick={() => setCreating(true)}
                            >
                                ＋ {t('Create room')}
                            </button>
                        )}
                    </>
                }
            />
            {zones.length > 0 && (
                <section aria-labelledby="zones-title">
                    <h2
                        id="zones-title"
                        className="subtitle"
                    >
                        🔆 {t('Zones')}
                        <span className="group__count">{zones.length}</span>
                    </h2>
                    <div className="grid grid--rooms">
                        {zones.map(({ room, devices: list }) => (
                            <RoomCard
                                key={room.id}
                                room={room}
                                status={roomStatus(list, states, shownIds)}
                                scene={sceneOf(list)}
                                count={list.length}
                                editing={editing}
                                canBack={false}
                                canForward={false}
                                onOpen={() => openRoom(room)}
                                onMove={() => undefined}
                            />
                        ))}
                    </div>
                </section>
            )}
            {editRoom && (
                <EditRoomSheet
                    room={editRoom}
                    onClose={() => setEditRoom(null)}
                />
            )}
            {creating && <CreateRoomSheet onClose={() => setCreating(false)} />}
        </>
    );
}

function fmt(v: number, digits: number): string {
    return v.toLocaleString(locale(), { maximumFractionDigits: digits });
}

function RoomCard({
    room,
    status,
    scene,
    weakBatteries = 0,
    count,
    cameras = 0,
    editing,
    canBack,
    canForward,
    onOpen,
    onMove,
}: {
    room: SvRoom;
    status: RoomStatus;
    /** Name der gerade aktiven Szene */
    scene?: string | undefined;
    /** Geräte mit schwacher Batterie in diesem Raum */
    weakBatteries?: number;
    count: number;
    /** Kameras im Raum (zählen zu den Geräten, sonst stünde dort z. B. "0 Geräte") */
    cameras?: number;
    editing: boolean;
    canBack: boolean;
    canForward: boolean;
    onOpen: () => void;
    onMove: (delta: -1 | 1) => void;
}): React.JSX.Element {
    const sort = useSortable();
    const lit = status.lights.length > 0;
    const warn = status.open > 0 || status.problems > 0;
    // Kurze Statusangaben – nur was gerade los ist
    type Badge = { key: string; text: string; label: string; warn?: boolean; wide?: boolean };
    const candidates: (Badge | false | '' | undefined)[] = [
        lit && {
            key: 'lights',
            text: `💡 ${status.lights.length}`,
            label: tn(status.lights.length, '{n} light on', '{n} lights on'),
        },
        status.open > 0 && {
            key: 'open',
            text: `🪟 ${status.open}`,
            label: t('{n} open', { n: status.open }),
            warn: true,
        },
        !!scene && {
            key: 'scene',
            text: `🎨 ${scene}`,
            label: t('Scene “{name}” active', { name: scene }),
            wide: true,
        },
        status.climate && { key: 'climate', text: status.climate, label: t('Climate running') },
        status.playing > 0 && { key: 'media', text: '🎵', label: t('Music playing') },
        status.blindMin !== undefined && {
            key: 'blind',
            text: `▤ ${Math.round(status.blindMin)} %`,
            label: t('Blind {percent} % open', { percent: Math.round(status.blindMin) }),
        },
        weakBatteries > 0 && {
            key: 'battery',
            text: `🪫 ${weakBatteries}`,
            label: tn(weakBatteries, '{n} battery low', '{n} batteries low'),
            warn: true,
        },
        status.problems > 0 && {
            key: 'problems',
            text: `⚠️ ${status.problems}`,
            label: tn(status.problems, '{n} fault', '{n} faults'),
            warn: true,
        },
    ];
    const badges = candidates.filter((b): b is Badge => !!b);

    return (
        <div
            className={`room-wrap${room.hidden ? ' is-hidden' : ''}${editing ? ' is-editing' : ''}${sort?.dragId === room.id ? ' is-dragging' : ''}`}
            data-sort-id={room.id}
        >
            <button
                type="button"
                className={`room${lit && !editing ? ' room--lit' : ''}${warn && !editing ? ' room--warn' : ''}`}
                onClick={onOpen}
            >
                <span
                    className="room__icon"
                    aria-hidden="true"
                >
                    {roomIcon(room)}
                </span>
                <span className="room__name">
                    {room.name}
                    {room.hidden && <span className="badge">ausgeblendet</span>}
                </span>
                {status.temperature !== undefined || status.humidity !== undefined ? (
                    <span className="room__climate">
                        {status.temperature !== undefined && <span>🌡️ {fmt(status.temperature, 1)}°</span>}
                        {status.humidity !== undefined && <span>💧 {fmt(status.humidity, 0)} %</span>}
                    </span>
                ) : null}
                {badges.length > 0 && !editing && (
                    <span className="room__badges">
                        {badges.map(b => (
                            <span
                                key={b.key}
                                className={`room__badge${b.warn ? ' room__badge--warn' : ''}${b.wide ? ' room__badge--text' : ''}`}
                                title={b.label}
                                aria-label={b.label}
                            >
                                {b.text}
                            </span>
                        ))}
                    </span>
                )}
                {/* Immer dieselbe Fußzeile: Anzahl Geräte (und Kameras) – einheitlich auf allen Karten */}
                <span className="room__meta">
                    {[
                        count > 0 && tn(count, '{n} device', '{n} devices'),
                        cameras > 0 && tn(cameras, '{n} camera', '{n} cameras'),
                    ]
                        .filter(Boolean)
                        .join(' · ') || t('No devices')}
                    {editing && room.source === 'name' ? ` · ${t('detected from device names')}` : ''}
                    {editing && room.source === 'custom' ? ` · ${t('created by you')}` : ''}
                </span>
            </button>
            {lit && !editing && (
                <button
                    type="button"
                    className="room__off"
                    aria-label={`${room.name}: ${t('switch all lights off')}`}
                    title={t('Switch all lights off')}
                    onClick={() => switchLights(status.lights, false, connection.getSnapshot().states, room.name)}
                >
                    <Icon
                        name="light"
                        size={14}
                    />{' '}
                    {t('off')}
                </button>
            )}
            {editing && (
                <DragHandle
                    id={room.id}
                    label={room.name}
                />
            )}
            {editing && (
                <MoveButtons
                    label={room.name}
                    canBack={canBack}
                    canForward={canForward}
                    onMove={onMove}
                />
            )}
        </div>
    );
}
