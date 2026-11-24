import { getLanguage, locale, t, tn } from '../../../src/shared/i18n';
import { useCardColumns } from '../media';
import { CustomSections } from '../components/CustomSections';
import { EditBanner, EditButton } from '../components/EditButton';
import { SystemCard } from '../components/SystemCard';
import { CustomizationsCard } from '../components/CustomizationsCard';
import { DiagnosisCard } from '../components/DiagnosisCard';
import { useConnection } from '../connection';
import { setMotion, useMotion, type MotionSetting } from '../motion';
import { BatteryList } from '../components/BatteryList';
import { batteryLevel, isBatteryLow } from '../battery';

export function MoreView({ onNavigate }: { onNavigate: (path: string) => void }): React.JSX.Element {
    const { status, version, model, lastError, states } = useConnection();
    const columns = useCardColumns();
    const byAdapter = new Map<string, number>();
    for (const d of model?.devices || []) {
        byAdapter.set(d.adapter, (byAdapter.get(d.adapter) || 0) + 1);
    }

    // Diagnose-Infos: kurz zusammengefasst, Einzelheiten zum Aufklappen
    const deviceCount = model?.devices.length ?? 0;
    const statusText =
        status === 'online' ? t('connected') : status === 'connecting' ? t('connecting …') : t('disconnected');
    const infoCard = (
        <section className="card">
            <h2 className="subtitle">{t('Info')}</h2>
            <p className="info__summary">
                {status === 'online' ? '🟢' : '🟠'} {statusText} · {t('Version')} {version || '–'} ·{' '}
                {tn(deviceCount, '{n} device', '{n} devices')}
            </p>
            <details className="info__details">
                <summary>{t('Details')}</summary>
                <dl className="facts">
                    <dt>{t('Status')}</dt>
                    <dd>{status}</dd>
                    <dt>{t('Adapter version')}</dt>
                    <dd>{version || '–'}</dd>
                    <dt>{t('Last detection')}</dt>
                    <dd>{model ? new Date(model.generatedAt).toLocaleString(locale()) : '–'}</dd>
                    {lastError && (
                        <>
                            <dt>{t('Last error')}</dt>
                            <dd>{lastError}</dd>
                        </>
                    )}
                </dl>
                <h3 className="info__subtitle">{t('Detected devices per adapter')}</h3>
                <dl className="facts">
                    {[...byAdapter.entries()].map(([adapter, count]) => (
                        <div
                            key={adapter}
                            className="facts__row"
                        >
                            <dt>{adapter}</dt>
                            <dd>{count}</dd>
                        </div>
                    ))}
                </dl>
            </details>
        </section>
    );

    return (
        <>
            <div className="titlebar titlebar--split">
                <h1 className="title">{t('More')}</h1>
                <EditButton />
            </div>
            <EditBanner text={t('Drag sections by the handle ⠿ or sort them with ↑ ↓, and hide or show them')} />
            <CustomSections
                view="more"
                columns={columns}
                className="csecs csecs--cols"
                sections={[
                    {
                        // Auf dem Handy ist "Beschattung" nicht in der Leiste, wenn es den Bereich Sicherheit gibt
                        key: 'shortcuts',
                        label: t('More sections'),
                        note: t('phone only'),
                        node:
                            model?.shutterControl.length &&
                            (model.cameras?.length || model.securityStations?.length) ? (
                                <nav
                                    className="card more__links"
                                    aria-label={t('More sections')}
                                >
                                    <button
                                        type="button"
                                        className="more__link"
                                        onClick={() => onNavigate('shutters')}
                                    >
                                        <span aria-hidden="true">🪟</span> {t('Shading')}
                                        <span
                                            className="chevron-right"
                                            aria-hidden="true"
                                        >
                                            ›
                                        </span>
                                    </button>
                                </nav>
                            ) : null,
                    },
                    {
                        key: 'iobroker',
                        label: 'ioBroker',
                        node: model?.system ? (
                            <SystemCard
                                system={model.system}
                                states={states}
                            />
                        ) : null,
                    },
                    {
                        key: 'batteries',
                        label: t('Batteries'),
                        node: model?.batteries?.length ? <BatteryCard /> : null,
                    },
                    { key: 'display', label: t('Display'), node: <DisplayCard /> },
                    {
                        key: 'customizations',
                        label: t('Customizations'),
                        node:
                            model?.editable && model.client ? (
                                <CustomizationsCard
                                    key={model.client.name || ''}
                                    client={model.client}
                                />
                            ) : null,
                    },
                    { key: 'connection', label: t('Info'), node: infoCard },
                    { key: 'diagnosis', label: t('Detection'), node: <DiagnosisCard /> },
                ]}
            />
        </>
    );
}

/** Alle Batteriegeräte: schwache zuerst, dann nach Ladestand; Liste aufklappbar, um die Karte kurz zu halten */
function BatteryCard(): React.JSX.Element | null {
    const { model, states } = useConnection();
    const all = model?.batteries || [];
    const sorted = [...all].sort(
        (a, b) =>
            Number(isBatteryLow(b, states)) - Number(isBatteryLow(a, states)) ||
            (batteryLevel(a, states) ?? 101) - (batteryLevel(b, states) ?? 101) ||
            a.name.localeCompare(b.name, getLanguage()),
    );
    const low = sorted.filter(b => isBatteryLow(b, states));
    if (!model || !all.length) {
        return null;
    }
    return (
        <section className="card">
            <h2 className="subtitle">🔋 {t('Batteries')}</h2>
            <p className={`info__summary${low.length ? ' system__summary--warn' : ''}`}>
                {low.length
                    ? `🪫 ${tn(low.length, '{n} battery low', '{n} batteries low')}`
                    : `✅ ${t('All batteries OK')}`}{' '}
                <span className="system__count">
                    · {tn(all.length, '{n} device with battery', '{n} devices with battery')}
                </span>
            </p>
            {low.length > 0 && (
                <BatteryList
                    items={low}
                    rooms={model.rooms}
                    states={states}
                />
            )}
            <details className="info__details">
                <summary>
                    {t('All battery devices')} ({all.length})
                </summary>
                <BatteryList
                    items={sorted}
                    rooms={model.rooms}
                    states={states}
                />
            </details>
        </section>
    );
}

const MOTION_OPTIONS: { value: MotionSetting; label: string }[] = [
    { value: 'system', label: t('As in the system') },
    { value: 'on', label: t('Always on') },
    { value: 'off', label: t('Off') },
];

/** Darstellung auf diesem Gerät (im Browser gespeichert) */
function DisplayCard(): React.JSX.Element {
    const { setting, systemReduced } = useMotion();
    return (
        <section className="card">
            <h2 className="subtitle">{t('Display')}</h2>
            <div className="setting setting--select setting--first">
                <label
                    className="setting__text"
                    htmlFor="motion"
                >
                    {t('Animations')}
                </label>
                <select
                    id="motion"
                    className="field__input"
                    value={setting}
                    onChange={e => setMotion(e.target.value as MotionSetting)}
                >
                    {MOTION_OPTIONS.map(o => (
                        <option
                            key={o.value}
                            value={o.value}
                        >
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
            <p className="detail__note">
                {systemReduced
                    ? setting === 'on'
                        ? t(
                              'Your system asks for reduced motion – SmartVis animates here anyway (e.g. the energy flow).',
                          )
                        : t(
                              'Your system asks for reduced motion (e.g. Windows: animation effects off) – therefore the animations rest. With “Always on” they run anyway.',
                          )
                    : t('Applies to this device or browser only.')}
            </p>
        </section>
    );
}
