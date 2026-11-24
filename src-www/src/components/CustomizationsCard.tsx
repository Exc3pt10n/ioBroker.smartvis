import { locale, t } from '../../../src/shared/i18n';
import { useState } from 'react';
import type { SvClientInfo } from '../../../src/shared/protocol';
import { connection } from '../connection';

function seen(ts: number, now = Date.now()): string {
    if (!ts) {
        return t('unknown');
    }
    const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(ts).setHours(0, 0, 0, 0)) / 86_400_000);
    const time = new Date(ts).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    if (days <= 0) {
        return t('today {time}', { time });
    }
    if (days === 1) {
        return t('yesterday {time}', { time });
    }
    return days < 7 ? t('{n} days ago', { n: days }) : new Date(ts).toLocaleDateString(locale());
}

/**
 * Anpassungen je Endgerät: Name dieses Geräts, von einem anderen Gerät übernehmen,
 * auf den Ausgangszustand zurücksetzen (dieses Gerät oder alle), alte Geräte entfernen.
 */
export function CustomizationsCard({ client }: { client: SvClientInfo }): React.JSX.Element {
    const others = client.devices.filter(d => d.id !== client.id);
    const [name, setName] = useState(client.name || '');
    const [source, setSource] = useState('');
    const sourceId = others.some(d => d.id === source) ? source : others[0]?.id || '';
    const rename = (): void => {
        const trimmed = name.trim();
        if (trimmed && trimmed !== client.name) {
            connection.client({ action: 'rename', name: trimmed });
        }
    };

    return (
        <section className="card custom">
            <h2 className="subtitle">{t('Customizations')}</h2>
            <p className="detail__note">
                {t(
                    'Names, rooms, favorites, hidden devices and the arrangement apply per device. New devices start with the previous shared customizations.',
                )}
            </p>

            {client.id ? (
                <>
                    <div className="setting setting--select setting--first">
                        <label
                            className="setting__text"
                            htmlFor="client-name"
                        >
                            {t('This device')}
                        </label>
                        <input
                            id="client-name"
                            className="field__input"
                            value={name}
                            maxLength={40}
                            onChange={e => setName(e.target.value)}
                            onBlur={rename}
                            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        />
                    </div>

                    {others.length > 0 && (
                        <div className="setting setting--select setting--stack">
                            <label
                                className="setting__text"
                                htmlFor="client-source"
                            >
                                {t('Copy from')}
                            </label>
                            <div className="custom__row">
                                <select
                                    id="client-source"
                                    className="field__input"
                                    value={sourceId}
                                    onChange={e => setSource(e.target.value)}
                                >
                                    {others.map(d => (
                                        <option
                                            key={d.id}
                                            value={d.id}
                                        >
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="action action--small"
                                    disabled={!sourceId}
                                    onClick={() => {
                                        const from = others.find(d => d.id === sourceId);
                                        if (
                                            from &&
                                            window.confirm(
                                                t(
                                                    'Copy the customizations of “{name}”? The customizations of this device will be replaced.',
                                                    { name: from.name },
                                                ),
                                            )
                                        ) {
                                            connection.client({ action: 'copyFrom', id: from.id });
                                        }
                                    }}
                                >
                                    {t('Copy')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="custom__actions">
                        <button
                            type="button"
                            className="action"
                            onClick={() => {
                                if (
                                    window.confirm(
                                        t(
                                            'Discard all customizations of this device? The automatic detection applies again afterwards.',
                                        ),
                                    )
                                ) {
                                    connection.client({ action: 'reset' });
                                }
                            }}
                        >
                            ↺ {t('Reset this device')}
                        </button>
                        <button
                            type="button"
                            className="action action--danger"
                            onClick={() => {
                                if (
                                    window.confirm(
                                        t(
                                            'Discard all customizations on ALL devices? The automatic detection applies everywhere again afterwards.',
                                        ),
                                    )
                                ) {
                                    connection.client({ action: 'resetAll' });
                                }
                            }}
                        >
                            ⚠️ {t('Reset all devices')}
                        </button>
                    </div>

                    {others.length > 0 && (
                        <details className="custom__devices">
                            <summary>
                                {t('Other devices')} ({others.length})
                            </summary>
                            <ul className="instances">
                                {others.map(d => (
                                    <li
                                        key={d.id}
                                        className="instance custom__device"
                                    >
                                        <span className="instance__name">
                                            {d.name}
                                            <span className="instance__id">
                                                {t('last seen {time}', { time: seen(d.lastSeen) })}
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            className="action action--small"
                                            onClick={() => {
                                                if (
                                                    window.confirm(
                                                        t(
                                                            'Remove “{name}” with its customizations? If the device connects again, it starts with the shared customizations.',
                                                            { name: d.name },
                                                        ),
                                                    )
                                                ) {
                                                    connection.client({ action: 'remove', id: d.id });
                                                }
                                            }}
                                        >
                                            {t('Remove')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </>
            ) : (
                <p className="detail__note">
                    {t(
                        'This app version does not register a device – please reload the page to use customizations per device.',
                    )}
                </p>
            )}
        </section>
    );
}
