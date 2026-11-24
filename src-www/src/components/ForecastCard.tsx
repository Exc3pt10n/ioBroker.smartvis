import { locale, t } from '../../../src/shared/i18n';
import { useEffect, useMemo, useState } from 'react';
import type { SvPvForecast, SvStateRef } from '../../../src/shared/protocol';
import { connection, useConnection } from '../connection';
import { kwh, num, watts } from '../energy';
import { ForecastChart, type Point } from './ForecastChart';

function fmtKwh(v: number | undefined): string {
    return v === undefined ? '–' : `${v.toLocaleString(locale(), { maximumFractionDigits: 1 })} kWh`;
}

/** Faktor der Leistungseinheit nach W (pvforecast liefert je nach Einstellung W oder kW) */
function factor(ref: SvStateRef | undefined): number {
    const unit = (ref?.unit || 'W').trim();
    return unit === 'kW' ? 1000 : unit === 'MW' ? 1_000_000 : 1;
}

function parseCurve(raw: unknown, f: number): Point[] {
    if (typeof raw !== 'string' || !raw) {
        return [];
    }
    try {
        const arr = JSON.parse(raw) as { t?: number; y?: number }[];
        return Array.isArray(arr)
            ? arr
                  .filter(p => Number.isFinite(Number(p.t)) && Number.isFinite(Number(p.y)))
                  .map(p => ({ t: Number(p.t), w: Number(p.y) * f }))
                  .sort((a, b) => a.t - b.t)
            : [];
    } catch {
        return [];
    }
}

function sameDay(t: number, ref: Date): boolean {
    const d = new Date(t);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

/** Tatsächliche PV-Leistung von heute aus dem Verlauf (alle 5 Minuten neu) */
function useActualToday(ref: SvStateRef | undefined): Point[] {
    const [points, setPoints] = useState<Point[]>([]);
    const id = ref?.history?.id;
    const unit = (ref?.history?.unit || ref?.unit || 'W').trim();
    useEffect(() => {
        if (!id) {
            return;
        }
        const f = unit === 'kW' ? 1000 : unit === 'MW' ? 1_000_000 : 1;
        let cancelled = false;
        const load = (): void => {
            connection.history(id, '24h').then(
                raw => {
                    if (cancelled) {
                        return;
                    }
                    const midnight = new Date();
                    midnight.setHours(0, 0, 0, 0);
                    setPoints(
                        raw.filter(([t]) => t >= midnight.getTime()).map(([t, v]) => ({ t, w: Math.max(0, v * f) })),
                    );
                },
                () => undefined,
            );
        };
        load();
        const timer = setInterval(load, 5 * 60_000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [id, unit]);
    return points;
}

export function ForecastCard({
    pv,
    actualPvW,
    producedTodayKwh,
    actualRef,
}: {
    pv: SvPvForecast;
    actualPvW?: number;
    producedTodayKwh?: number;
    /** PV-Leistung mit Verlauf: tatsächliche Erzeugung als Linie in der Prognose */
    actualRef?: SvStateRef;
}): React.JSX.Element {
    const { states } = useConnection();
    const actual = useActualToday(actualRef);
    const [day, setDay] = useState<'today' | 'tomorrow'>('today');
    const s = pv.summary;
    const raw = pv.curve ? states[pv.curve.id]?.val : undefined;
    const curve = useMemo(() => parseCurve(raw, factor(s.powerNow)), [raw, s.powerNow]);

    const updated = num(pv.lastUpdated, states);
    // Aktuelle Zeit minütlich auffrischen (Markierung "jetzt", Tageswechsel)
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);
    const today = new Date(now);
    const tomorrow = new Date(now + 86_400_000);
    const points = curve.filter(p => sameDay(p.t, day === 'today' ? today : tomorrow));

    const todayKwh = kwh(s.energyToday, states);
    const remainingKwh = kwh(s.energyRemaining, states);
    const tomorrowKwh = kwh(s.energyTomorrow, states);
    const progress = todayKwh && producedTodayKwh !== undefined ? Math.min(1, producedTodayKwh / todayKwh) : undefined;

    return (
        <section className="card forecast">
            <h2 className="subtitle">☀️ {t('PV forecast')}</h2>
            <div className="forecast__body">
                <div className="forecast__summary">
                    <div className="stats">
                        <div className="stat">
                            <span className="stat__value">{fmtKwh(todayKwh)}</span>
                            <span className="stat__label">
                                {t('Expected today')}
                                {/* "noch 0 kWh" neben einer verfehlten Prognose verwirrt – nur zeigen, wenn noch etwas kommt */}
                                {remainingKwh !== undefined && remainingKwh >= 0.05
                                    ? ` · ${t('{value} to go', { value: fmtKwh(remainingKwh) })}`
                                    : ''}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat__value">{fmtKwh(tomorrowKwh)}</span>
                            <span className="stat__label">{t('Expected tomorrow')}</span>
                        </div>
                    </div>
                    {progress !== undefined && (
                        <div
                            className="progress"
                            role="meter"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(progress * 100)}
                            aria-label={t('Generated compared to the forecast')}
                        >
                            <div className="progress__text">
                                {progress >= 1
                                    ? t('Generated: {value} – forecast reached', { value: fmtKwh(producedTodayKwh) })
                                    : t('Generated: {value} of {expected} expected ({percent} %)', {
                                          value: fmtKwh(producedTodayKwh),
                                          expected: fmtKwh(todayKwh),
                                          percent: Math.round(progress * 100),
                                      })}
                            </div>
                            <div className="progress__track">
                                <div
                                    className="progress__bar"
                                    style={{ width: `${progress * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {pv.plants.length > 0 && (
                        <table className="plants">
                            <thead>
                                <tr>
                                    <th scope="col">{t('Plant')}</th>
                                    <th scope="col">{t('Now')}</th>
                                    <th scope="col">{t('Today')}</th>
                                    <th scope="col">{t('Tomorrow')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pv.plants.map(p => (
                                    <PlantRow
                                        key={p.name}
                                        name={p.name}
                                        power={watts(p.powerNow, states)}
                                        today={kwh(p.energyToday, states)}
                                        tomorrow={kwh(p.energyTomorrow, states)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="forecast__chart">
                    <div
                        className="segmented"
                        role="tablist"
                        aria-label={t('Day')}
                    >
                        {(['today', 'tomorrow'] as const).map(d => (
                            <button
                                key={d}
                                type="button"
                                role="tab"
                                aria-selected={day === d}
                                className={day === d ? 'segmented--active' : ''}
                                onClick={() => setDay(d)}
                            >
                                {d === 'today' ? t('Today') : t('Tomorrow')}
                            </button>
                        ))}
                    </div>
                    <ForecastChart
                        points={points}
                        now={day === 'today' ? now : undefined}
                        actualW={day === 'today' ? actualPvW : undefined}
                        actual={day === 'today' ? actual : undefined}
                        label={
                            day === 'today'
                                ? t('PV forecast for today over the day')
                                : t('PV forecast for tomorrow over the day')
                        }
                    />
                </div>
            </div>
            {updated !== undefined && (
                <p className="detail__note">
                    {t('Forecast from')}{' '}
                    {new Date(updated).toLocaleString(locale(), { dateStyle: 'short', timeStyle: 'short' })}
                </p>
            )}
        </section>
    );
}

function PlantRow({
    name,
    power,
    today,
    tomorrow,
}: {
    name: string;
    power?: number;
    today?: number;
    tomorrow?: number;
}): React.JSX.Element {
    const kw =
        power === undefined ? '–' : `${(power / 1000).toLocaleString(locale(), { maximumFractionDigits: 1 })} kW`;
    return (
        <tr>
            <th scope="row">{name}</th>
            <td>{kw}</td>
            <td>{fmtKwh(today)}</td>
            <td>{fmtKwh(tomorrow)}</td>
        </tr>
    );
}
