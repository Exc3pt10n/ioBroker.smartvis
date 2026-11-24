import { t } from '../../shared/i18n';
import type { SvEnergyPeriod, SvEnergySystem, SvEnergyTotals } from '../../shared/protocol';
import { getName } from '../names';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/**
 * QCells Q.HOME+ ESS HYB-G2 (Adapter: github.com/Exc3pt10n/ioBroker.qhome-ess-hyb-g2)
 *
 * Echtzeitwerte direkt unter der Instanz, Richtungen bereits getrennt:
 * GridPwPurchaseWb/GridPwFeedInWb (W), BtPwCharge/BtPwDisCharge (W), PvPw/ConsPw (kW).
 * Ab Adapter 0.3.0 mit zusätzlichen Erzeugern: PvPwTotal (gesamt) = PvPw (Q.HOME) + PvPwExt.
 * Energiezähler unter counters.<zeitraum>.* (kWh / %), Vorperiode jeweils unter .previous.
 */

/** Bekannte Zeiträume: Reihenfolge und Bezeichnungen; weitere Kanäle unter counters.* werden ebenfalls erkannt */
const KNOWN_PERIODS: Record<string, { order: number; group: string; current: string; previous: string }> = {
    day: { order: 0, group: 'Day', current: 'Today', previous: 'Yesterday' },
    week: { order: 1, group: 'Week', current: 'This week', previous: 'Last week' },
    month: { order: 2, group: 'Month', current: 'This month', previous: 'Last month' },
    quarter: { order: 3, group: 'Quarter', current: 'This quarter', previous: 'Last quarter' },
    halfyear: { order: 4, group: 'Half-year', current: 'This half-year', previous: 'Last half-year' },
    year: { order: 5, group: 'Year', current: 'This year', previous: 'Last year' },
    total: { order: 99, group: 'Total', current: 'Total', previous: 'Total (before)' },
};
/** Unbekannte Zeiträume stehen vor "Gesamt" */
const UNKNOWN_ORDER = 50;

/**
 * Alle Zählerzeiträume einer Instanz: jeder Kanal counters.<zeitraum> mit bekannten Zählern,
 * die Vorperiode jeweils unter counters.<zeitraum>.previous.
 */
function findPeriods(objects: ObjectMap, instance: string, lang: string): SvEnergyPeriod[] {
    const prefix = `${instance}.counters.`;
    const keys = new Set<string>();
    for (const id of Object.keys(objects)) {
        if (id.startsWith(prefix)) {
            const key = id.slice(prefix.length).split('.')[0];
            if (key && objects[`${prefix}${key}`]?.type !== 'state') {
                keys.add(key);
            }
        }
    }
    const order = (key: string): number => KNOWN_PERIODS[key]?.order ?? UNKNOWN_ORDER;
    const sorted = [...keys].sort((a, b) => order(a) - order(b) || a.localeCompare(b));

    const periods: SvEnergyPeriod[] = [];
    for (const key of sorted) {
        const base = `${prefix}${key}`;
        const known = KNOWN_PERIODS[key];
        const name = getName(objects[base], lang);
        const groupLabel = known ? t(known.group) : name ? name.replace(/^(aktuelle[rs]?|current)\s+/i, '') : key;
        const add = (subKey: string, label: string): void => {
            const sums = totals(objects, `${prefix}${subKey}`);
            if (Object.values(sums).some(Boolean)) {
                periods.push({
                    key: subKey,
                    group: key,
                    groupLabel,
                    label,
                    periodKey: ref(objects, `${prefix}${subKey}.periodKey`, 'Period'),
                    totals: sums,
                });
            }
        };
        add(key, known ? t(known.current) : name || key);
        add(
            `${key}.previous`,
            known
                ? t(known.previous)
                : getName(objects[`${base}.previous`], lang) || t('{period} (before)', { period: groupLabel }),
        );
    }
    return periods;
}

function totals(objects: ObjectMap, base: string): SvEnergyTotals {
    const c = (s: string): string => `${base}.${s}`;
    return {
        pv: ref(objects, c('PvGen'), 'PV generation'),
        home: ref(objects, c('Cons'), 'Consumption'),
        gridImport: ref(objects, c('GridPurchase'), 'Grid import'),
        gridExport: ref(objects, c('GridFeedIn'), 'Grid export'),
        batteryCharge: ref(objects, c('BtCharged'), 'Battery charged'),
        batteryDischarge: ref(objects, c('BtDischarged'), 'Battery discharged'),
        autarky: ref(objects, c('Autarky'), 'Self-sufficiency'),
        selfConsumption: ref(objects, c('SelfConsRate'), 'Self-consumption'),
        selfSupply: ref(objects, c('SelfSupply'), 'Self-supply'),
    };
}
export const qhomeProfile: AdapterProfile = {
    adapter: 'qhome-ess-hyb-g2',
    claimsInstance: true,
    detect(instance, objects, lang) {
        const id = (s: string): string => `${instance}.${s}`;
        const ownPv = ref(objects, id('PvPw'), 'Q.HOME');
        if (!ownPv) {
            return null;
        }
        // Zusätzliche Erzeuger (Adapter ab 0.3.0): PvPwTotal = PvPw + PvPwExt; ohne sie wie bisher PvPw
        const extPv = ref(objects, id('PvPwExt'), 'Other generators');
        const pv = ref(objects, id('PvPwTotal'), 'PV') || { ...ownPv, name: 'PV' };
        const periods = findPeriods(objects, instance, lang);

        const energy: SvEnergySystem = {
            id: instance,
            name: t('Q.HOME storage'),
            adapter: 'qhome-ess-hyb-g2',
            flows: {
                pv,
                home: ref(objects, id('ConsPw'), 'House'),
                gridImport: ref(objects, id('GridPwPurchaseWb'), 'Grid import'),
                gridExport: ref(objects, id('GridPwFeedInWb'), 'Grid export'),
                batteryCharge: ref(objects, id('BtPwCharge'), 'Charging'),
                batteryDischarge: ref(objects, id('BtPwDisCharge'), 'Discharging'),
            },
            ...(extPv && pv.id !== ownPv.id && { pvParts: [ownPv, extPv] }),
            battery: {
                soc: ref(objects, id('BtSoc'), 'State of charge'),
                remaining: ref(objects, id('BtLast'), 'Remaining time'),
            },
            today: periods.find(p => p.key === 'day')?.totals,
            periods,
            connected: ref(objects, id('info.connection'), 'Connected'),
        };
        return { energy };
    },
};
