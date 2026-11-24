import { t } from '../../shared/i18n';
import type { ObjectMap } from './types';

/** Zustand einer Geräte-Erkennung (wie ein type-detector-Treffer, mit optionalen Beschriftungen) */
export interface DeviceControl {
    type: string;
    states: { name: string; id: string; indicator?: boolean; labels?: Record<string, string> }[];
}

/** Beschriftungen der Wertelisten (Schlüssel wie im Adapter; englisch, übersetzt beim Erzeugen) */
const LABELS: Record<string, Record<string, string>> = {
    mode: { AUTO: 'Automatic', COOL: 'Cool', HEAT: 'Heat', DRY: 'Dry', FAN: 'Fan only' },
    fanMode: {
        AUTO: 'Automatic',
        QUIET: 'Quiet',
        LOW: 'Level 1',
        MEDIUM_LOW: 'Level 2',
        MEDIUM: 'Level 3',
        MEDIUM_HIGH: 'Level 4',
        HIGH: 'Level 5',
    },
    swingMode: {
        OFF: 'Off',
        SWING_VERTICAL: 'Swing vertical',
        SWING_HORIZONTAL: 'Swing horizontal',
        SWING_VERTICAL_AND_HORIZONTAL: 'Swing vertical + horizontal',
        FIXED_1: 'Fixed position 1',
        FIXED_2: 'Fixed position 2',
        FIXED_3: 'Fixed position 3',
        FIXED_4: 'Fixed position 4',
        FIXED_5: 'Fixed position 5',
    },
    meritA: {
        OFF: 'Off',
        SLEEP_CARE: 'Sleep mode',
        COMFORT: 'Comfort',
        HIGH_POWER: 'Hi-Power',
        ECO: 'Eco',
        CDU_SILENT_1: 'Outdoor unit quiet 1',
        CDU_SILENT_2: 'Outdoor unit quiet 2',
        HEATING_8C: '8 °C frost protection',
        FLOOR: 'Floor',
    },
    meritB: { OFF: 'Off', FIREPLACE_1: 'Fireplace 1', FIREPLACE_2: 'Fireplace 2' },
    powerSelection: { POWER_50: '50 %', POWER_75: '75 %', POWER_100: '100 %' },
};

/** State-Name im Adapter → Rollen-Name in SmartVis (wie type-detector, plus eigene) */
const STATES: [string, string, boolean?][] = [
    ['power', 'POWER'],
    ['targetTemperature', 'SET'],
    ['indoorTemperature', 'ACTUAL'],
    ['mode', 'MODE'],
    ['fanMode', 'SPEED'],
    ['swingMode', 'SWING'],
    ['meritA', 'SPECIAL'],
    ['meritB', 'FIREPLACE'],
    ['powerSelection', 'POWER_LIMIT'],
    ['outdoorTemperature', 'OUTDOOR'],
    ['energyConsumptionYear', 'ENERGY_YEAR'],
    ['selfCleaning', 'CLEANING', true],
];

/**
 * Toshiba-Klimageräte (Adapter toshiba-ac): je Gerät ein Objekt vom Typ "device" mit den States
 * direkt darunter (power, targetTemperature, mode …) – der type-detector erkennt das nicht.
 * Wertelisten (common.states) werden auf Deutsch beschriftet; nur Werte, die das Gerät kennt.
 */
export function toshibaAcControl(id: string, obj: ioBroker.Object, objects: ObjectMap): DeviceControl | null {
    if (obj.type !== 'device' || objects[`${id}.targetTemperature`]?.type !== 'state') {
        return null;
    }
    const states: DeviceControl['states'] = [];
    for (const [key, name, indicator] of STATES) {
        const sid = `${id}.${key}`;
        const common = objects[sid]?.common as ioBroker.StateCommon | undefined;
        if (!common) {
            continue;
        }
        const own =
            common.states && typeof common.states === 'object' && !Array.isArray(common.states)
                ? common.states
                : undefined;
        const labels = own
            ? Object.fromEntries(Object.entries(own).map(([k, v]) => [k, t(LABELS[key]?.[k] || String(v))]))
            : undefined;
        states.push({ name, id: sid, ...(indicator && { indicator }), ...(labels && { labels }) });
    }
    // Verbindung zur Toshiba-Cloud (gilt für alle Geräte der Instanz)
    const instance = id.split('.', 2).join('.');
    if (objects[`${instance}.info.connection`]?.type === 'state') {
        states.push({ name: 'CONNECTED', id: `${instance}.info.connection`, indicator: true });
    }
    return { type: 'airCondition', states };
}

/** Adapter mit eigener Geräte-Erkennung (statt type-detector) */
export const DEVICE_PROFILES: Partial<
    Record<string, (id: string, obj: ioBroker.Object, objects: ObjectMap) => DeviceControl | null>
> = {
    'toshiba-ac': toshibaAcControl,
};
