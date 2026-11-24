import { locale, t } from '../../../src/shared/i18n';
import type { SvWallbox } from '../../../src/shared/protocol';
import { useConnection } from '../connection';
import { Toggle } from './Toggle';
import { WallboxSettings } from './WallboxSettings';
import { formatPower, wallboxLabel, wallboxSnapshot } from '../energy';

function fmtA(v: number): string {
    return `${v.toLocaleString(locale(), { maximumFractionDigits: 1 })} A`;
}

export function WallboxCard({ wallbox }: { wallbox: SvWallbox }): React.JSX.Element {
    const { states } = useConnection();
    const s = wallboxSnapshot(wallbox, states);
    const charging = s.status === 'charging';

    return (
        <section className="card">
            <div className="wallbox__head">
                <div>
                    <div
                        className="subtitle"
                        style={{ margin: 0 }}
                    >
                        🚗 {wallbox.name}
                    </div>
                    <div className={`wallbox__status wallbox__status--${s.status ?? 'unknown'}`}>{wallboxLabel(s)}</div>
                </div>
                {charging && (
                    <div
                        className="wallbox__power"
                        title={
                            s.estimated
                                ? t('Estimated from charging current × 230 V × phases (wallbox without energy meter)')
                                : undefined
                        }
                    >
                        {s.estimated ? '≈ ' : ''}
                        {formatPower(s.power)}
                        {/* Ohne Energiezähler nur geschätzt – sichtbar sagen statt nur per "≈" */}
                        {s.estimated && <span className="wallbox__estimated">{t('estimated')}</span>}
                    </div>
                )}
            </div>
            <div className="stats">
                {wallbox.surplus && (
                    <div className="stat">
                        <span className="stat__value">
                            {s.surplusW === undefined
                                ? '–'
                                : s.surplusW > 0
                                  ? formatPower(s.surplusW)
                                  : `−${formatPower(-s.surplusW)}`}
                        </span>
                        <span className="stat__label">
                            {t('PV surplus')}
                            {s.surplusW !== undefined && s.surplusW <= 0 ? ` · ${t('none')}` : ''}
                        </span>
                    </div>
                )}
                {wallbox.current && (
                    <div className="stat">
                        <span className="stat__value">{s.limitA !== undefined ? fmtA(s.limitA) : '–'}</span>
                        <span className="stat__label">
                            {t('Charging limit')}
                            {s.limitW !== undefined
                                ? ` · ≈ ${formatPower(s.limitW)} (${t('{n}-phase', { n: s.phases ?? '' })})`
                                : ''}
                            {s.maxA !== undefined ? ` · max. ${fmtA(s.maxA)}` : ''}
                        </span>
                    </div>
                )}
            </div>
            <div style={{ marginTop: 12 }}>
                {wallbox.pvAutomatic && (
                    <Toggle
                        state={wallbox.pvAutomatic}
                        label={t('PV surplus charging')}
                        hint={s.pvAutomatic ? t('Charges with solar surplus only') : t('Charges at full power')}
                    />
                )}
                {wallbox.pause && (
                    <Toggle
                        state={wallbox.pause}
                        label={t('Pause charging')}
                    />
                )}
            </div>
            <WallboxSettings wallbox={wallbox} />
        </section>
    );
}
