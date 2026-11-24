import { t } from '../../../src/shared/i18n';
import { useState } from 'react';
import { useCardColumns, useMediaQuery } from '../media';
import type { SvStateRef } from '../../../src/shared/protocol';
import { EnergyFlow, FlowStatus } from '../components/EnergyFlow';
import { EnergyTotals } from '../components/EnergyTotals';
import { ForecastCard } from '../components/ForecastCard';
import { HistoryPanel, type HistorySeries } from '../components/HistoryPanel';
import { WallboxCard } from '../components/WallboxCard';
import { CustomSections, type SectionDef } from '../components/CustomSections';
import { EditBanner, EditButton } from '../components/EditButton';
import { useConnection } from '../connection';
import { kwh, num, snapshot } from '../energy';

/** Auf dem Handy aufgeklappte Bereiche (für die Sitzung gemerkt) */
const openedOnPhone = new Set<string>();

export function EnergyView(): React.JSX.Element {
    const { model, states } = useConnection();
    const columns = useCardColumns();
    const [focus, setFocus] = useState<{ key: string; n: number }>();
    const phone = useMediaQuery('(max-width: 599px)');
    if (!model) {
        return <p className="empty">{t('Loading …')}</p>;
    }
    if (!model.energy.length && !model.wallboxes.length && !model.pvForecast.length) {
        return (
            <>
                <h1 className="title">{t('Energy')}</h1>
                <p className="empty">{t('No supported energy system found.')}</p>
            </>
        );
    }

    // Verläufe: Leistungsflüsse, Ladezustand und PV-Überschuss der Wallbox (sofern aufgezeichnet)
    const main = model.energy[0];
    const pvColor = 'var(--chart-pv)';
    // Ansichten: Leistung (PV + Verbrauch zusammen), Netz (Bezug + Einspeisung), Batterie, PV-Überschuss
    const f = main?.flows;
    const has = (ref: SvStateRef | undefined): ref is SvStateRef => !!ref?.history;
    const homeColor = 'var(--chart-series)';
    const candidates: (HistorySeries | undefined | false)[] = [
        has(f?.pv)
            ? {
                  key: 'power',
                  label: t('Power'),
                  lineLabel: 'PV',
                  ref: f.pv,
                  color: pvColor,
                  zeroBased: true,
                  extra: has(f?.home) ? [{ label: t('Consumption'), ref: f.home, color: homeColor }] : [],
              }
            : has(f?.home) && { key: 'power', label: t('Consumption'), ref: f.home, color: homeColor, zeroBased: true },
        has(f?.gridImport)
            ? {
                  key: 'grid',
                  label: t('Grid'),
                  lineLabel: t('Import'),
                  ref: f.gridImport,
                  color: 'var(--chart-grid-import)',
                  zeroBased: true,
                  extra: has(f?.gridExport)
                      ? [{ label: t('Grid export'), ref: f.gridExport, color: 'var(--chart-grid-export)' }]
                      : [],
              }
            : has(f?.gridExport) && {
                  key: 'grid',
                  label: t('Grid'),
                  ref: f.gridExport,
                  color: 'var(--chart-grid-export)',
                  zeroBased: true,
              },
        has(main?.battery?.soc)
            ? {
                  key: 'battery',
                  label: t('Battery'),
                  ref: main.battery.soc,
                  color: 'var(--chart-battery)',
                  zeroBased: true,
              }
            : has(f?.batteryCharge) && {
                  key: 'battery',
                  label: t('Battery'),
                  lineLabel: t('Charging'),
                  ref: f.batteryCharge,
                  color: 'var(--chart-battery)',
                  zeroBased: true,
                  extra: has(f?.batteryDischarge)
                      ? [{ label: t('Discharging'), ref: f.batteryDischarge, color: 'var(--chart-grid-import)' }]
                      : [],
              },
        ...model.wallboxes.map(w =>
            has(w.surplus)
                ? {
                      key: `s-${w.id}`,
                      label: model.wallboxes.length > 1 ? `${t('Surplus')} ${w.name}` : t('Surplus'),
                      ref: w.surplus,
                      color: pvColor,
                  }
                : undefined,
        ),
    ];
    const energyHistory = candidates.filter((x): x is HistorySeries => !!x);
    // Antippen im Energiefluss → passende Ansicht im Verlauf
    const surplusKey = energyHistory.find(h => h.key.startsWith('s-'))?.key;
    const showHistory = (node: 'pv' | 'grid' | 'home' | 'battery' | 'car'): void => {
        const key =
            node === 'grid'
                ? 'grid'
                : node === 'battery'
                  ? 'battery'
                  : node === 'car' && surplusKey
                    ? surplusKey
                    : 'power';
        setFocus({ key, n: Date.now() });
        openedOnPhone.add('history');
    };

    const multi = model.energy.length > 1;
    const sections: SectionDef[] = [
        ...model.energy.flatMap((system): SectionDef[] => {
            // Wallboxen fließen in das erste Energiesystem ein
            const flow = snapshot(system, states, system === model.energy[0] ? model.wallboxes : []);
            const value = (ref: SvStateRef | undefined): number | undefined => num(ref, states);
            const remaining = value(system.battery?.remaining);
            const offline = system.connected && states[system.connected.id]?.val === false;
            const suffix = multi ? ` (${system.name})` : '';
            return [
                {
                    key: `flow-${system.id}`,
                    label: `${t('Energy flow')}${suffix}`,
                    weight: 5,
                    node: (
                        <section className="card energy__flow">
                            <h2 className="subtitle">⚡ {multi ? system.name : t('Energy flow')}</h2>
                            {offline && (
                                <div className="banner banner--offline">
                                    {system.name}: {t('no connection to the device')}
                                </div>
                            )}
                            <FlowStatus
                                flow={flow}
                                remainingMin={remaining}
                            />
                            <EnergyFlow
                                flow={flow}
                                onSelect={energyHistory.length ? showHistory : undefined}
                            />
                        </section>
                    ),
                },
                {
                    key: `totals-${system.id}`,
                    label: `${t('Energy counters')}${suffix}`,
                    weight: 4,
                    node: (
                        <PhoneCollapse
                            id={`totals-${system.id}`}
                            phone={phone}
                            title={`📊 ${t('Energy counters')}${suffix}`}
                        >
                            <EnergyTotals
                                system={system}
                                states={states}
                            />
                        </PhoneCollapse>
                    ),
                },
            ];
        }),
        ...model.wallboxes.map(wb => ({
            key: `wallbox-${wb.id}`,
            label: model.wallboxes.length > 1 ? `${t('Wallbox')} ${wb.name}` : t('Wallbox'),
            weight: 3.5,
            node: <WallboxCard wallbox={wb} />,
        })),
        {
            key: 'history',
            label: t('History'),
            // Zeitreihen profitieren von Breite: auf dem Desktop über beide Spalten
            wide: true,
            node:
                energyHistory.length > 0 ? (
                    <PhoneCollapse
                        id="history"
                        phone={phone}
                        title={`📈 ${t('History')}`}
                    >
                        <HistoryPanel
                            series={energyHistory}
                            focus={focus}
                        />
                    </PhoneCollapse>
                ) : null,
        },
        ...model.pvForecast.map(pv => ({
            key: `forecast-${pv.id}`,
            label: t('PV forecast'),
            // Tageskurve: auf dem Desktop über die volle Breite wie der Verlauf
            wide: true,
            node: (
                <ForecastCard
                    pv={pv}
                    actualPvW={main ? snapshot(main, states).pv : undefined}
                    producedTodayKwh={main?.today?.pv ? kwh(main.today.pv, states) : undefined}
                    actualRef={main?.flows.pv}
                />
            ),
        })),
    ];
    // Standard: Fluss, Wallbox, Zähler (zwei Spalten), Prognose und Verlauf über die volle Breite
    const rank = (k: string): number =>
        k.startsWith('flow-')
            ? 0
            : k.startsWith('wallbox-')
              ? 1
              : k.startsWith('totals-')
                ? 2
                : k === 'history'
                  ? 4
                  : 3;
    sections.sort((a, b) => rank(a.key) - rank(b.key));

    return (
        <>
            <div className="titlebar titlebar--split">
                <h1 className="title">{t('Energy')}</h1>
                <EditButton />
            </div>
            <EditBanner text={t('Drag sections by the handle ⠿ or sort them with ↑ ↓, and hide or show them')} />
            <CustomSections
                view="energy"
                columns={columns}
                sections={sections}
                className="csecs csecs--cols"
            />
        </>
    );
}

/**
 * Handy: Bereich zunächst als eine Zeile ("📈 Verlauf ›"), die Seite bleibt kurz;
 * Antippen zeigt den vollen Inhalt. Desktop: immer offen.
 */
function PhoneCollapse({
    id,
    phone,
    title,
    children,
}: {
    id: string;
    phone: boolean;
    title: string;
    children: React.ReactNode;
}): React.JSX.Element {
    const [, rerender] = useState(0);
    if (!phone) {
        return <>{children}</>;
    }
    if (openedOnPhone.has(id)) {
        // Aufgeklappt: unter der Karte wieder einklappen
        return (
            <div className="collapse-open">
                {children}
                <button
                    type="button"
                    className="collapse-open__btn"
                    aria-expanded
                    onClick={() => {
                        openedOnPhone.delete(id);
                        rerender(n => n + 1);
                    }}
                >
                    {t('Collapse {name}', { name: title.replace(/^\S+\s/, '') })}
                    <span
                        className="collapse-open__chevron"
                        aria-hidden="true"
                    >
                        ›
                    </span>
                </button>
            </div>
        );
    }
    return (
        <button
            type="button"
            className="card collapse-card"
            aria-expanded={false}
            onClick={() => {
                openedOnPhone.add(id);
                rerender(n => n + 1);
            }}
        >
            <span className="subtitle">{title}</span>
            <span
                className="collapse-card__chevron"
                aria-hidden="true"
            >
                ›
            </span>
        </button>
    );
}
