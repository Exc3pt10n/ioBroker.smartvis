import { t } from '../../shared/i18n';
import type { SvStateRef, SvWallbox, SvWallboxSetting } from '../../shared/protocol';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/**
 * KEBA KeContact P20/P30 (Adapter: ioBroker.kecontact)
 *
 * - p: Ladeleistung in mW
 * - state: 0 Start, 1 nicht bereit, 2 bereit, 3 lädt, 4 Fehler, 5 unterbrochen
 * - plug: 0 kein Kabel, 1/3 Kabel an Wallbox, 5/7 Fahrzeug verbunden
 * - currentUser: Ladestrom, den die Automatik des Adapters vorgibt (mA) = aktuelles Limit
 * - statistics.surplus: PV-Überschuss, mit dem die Automatik zuletzt gerechnet hat (W)
 * - automatic.photovoltaics / automatic.pauseWallbox: Schalter der Lade-Automatik des Adapters
 *
 * Die "Deutschland-Edition" (Produkt …-DE) hat keinen Energiezähler: p, ePres und die Statistik bleiben 0.
 * Der Adapter schätzt die Leistung selbst aus currentUser × 230 V × Phasen (chargingPhases bzw.
 * automatic.calcPhases) – die App macht es ebenso. Sitzungsenergie wird deshalb nicht angezeigt.
 */
/**
 * Einstellungen der Ladeautomatik (automatic.*), Bezeichnungen englisch und übersetzt.
 * Bewusst nicht enthalten: Rohbefehle (start/stop/display/output/unlock/report/setenergy/currentTimer …),
 * der von der Automatik geregelte Ladestrom und automatic.stateVehicleSoC (Konfiguration, Datenpunkt-Name).
 */
function settings(objects: ObjectMap, instance: string): SvWallboxSetting[] {
    const defs: Omit<SvWallboxSetting, 'state'>[] = [
        {
            key: 'automatic.1p3pCharging',
            group: 'Charging automation',
            label: 'Phases while charging',
            hint: 'Only with phase switching (e.g. X2 output)',
            kind: 'select',
            options: [
                { value: 0, label: 'Automatic by surplus' },
                { value: 1, label: '1-phase only' },
                { value: 3, label: '3-phase only' },
            ],
        },
        {
            key: 'automatic.addPower',
            group: 'Charging automation',
            label: 'Additional grid import',
            hint: 'Allowed grid import so that charging starts earlier',
            kind: 'number',
            unit: 'W',
            min: 0,
            max: 22000,
            step: 100,
        },
        {
            key: 'automatic.maxGridPower',
            group: 'Charging automation',
            label: 'Maximum grid import',
            kind: 'number',
            unit: 'W',
            min: 0,
            max: 50000,
            step: 100,
            zeroLabel: 'Adapter setting',
        },
        {
            key: 'automatic.limitCurrent',
            group: 'Charging automation',
            label: 'Limit charging current',
            kind: 'number',
            unit: 'A',
            scale: 0.001,
            min: 0,
            max: 32,
            step: 1,
            zeroLabel: 'no limit',
        },
        {
            key: 'automatic.limitCurrent1p',
            group: 'Charging automation',
            label: 'Limit charging current (1-phase)',
            kind: 'number',
            unit: 'A',
            scale: 0.001,
            min: 0,
            max: 32,
            step: 1,
            zeroLabel: 'as above',
        },
        {
            key: 'automatic.calcPhases',
            group: 'Charging automation',
            label: 'Phases for power estimate',
            hint: 'Germany edition without energy meter',
            kind: 'number',
            min: 1,
            max: 3,
            step: 1,
        },
        {
            key: 'automatic.batteryStorageStrategy',
            group: 'Battery storage',
            label: 'Strategy',
            kind: 'select',
            options: [
                { value: 0, label: 'Adapter setting' },
                { value: 1, label: 'Do not use storage (car first)' },
                { value: 2, label: 'Do not use storage (storage first)' },
                { value: 3, label: 'Use storage for minimum charging current' },
                { value: 4, label: 'Use storage fully for the car' },
            ],
        },
        {
            key: 'automatic.batterySoCForCharging',
            group: 'Battery storage',
            label: 'Storage for the car from state of charge',
            kind: 'number',
            unit: '%',
            min: 0,
            max: 100,
            step: 5,
        },
        {
            key: 'automatic.targetSoC',
            group: 'Target charging',
            label: 'Charge without PV automation up to',
            hint: 'Charges at full power up to this vehicle state of charge',
            kind: 'number',
            unit: '%',
            min: 0,
            max: 100,
            step: 5,
            zeroLabel: 'off',
            needsVehicleSoC: true,
        },
        {
            key: 'automatic.maxSoC',
            group: 'Target charging',
            label: 'Stop charging at',
            kind: 'number',
            unit: '%',
            min: 0,
            max: 100,
            step: 5,
            zeroLabel: 'off',
            needsVehicleSoC: true,
        },
        {
            key: 'automatic.resetTargetSoC',
            group: 'Target charging',
            label: 'Reset target when reached',
            kind: 'switch',
            needsVehicleSoC: true,
        },
    ];
    const result: SvWallboxSetting[] = [];
    for (const def of defs) {
        const state = ref(objects, `${instance}.${def.key}`, def.label);
        if (state?.write) {
            result.push({
                ...def,
                group: t(def.group),
                label: t(def.label),
                ...(def.hint && { hint: t(def.hint) }),
                ...(def.zeroLabel && { zeroLabel: t(def.zeroLabel) }),
                ...(def.options && { options: def.options.map(o => ({ ...o, label: t(o.label) })) }),
                state,
            });
        }
    }
    return result;
}

function readOnly(r: SvStateRef | undefined): SvStateRef | undefined {
    return r ? { ...r, write: false } : undefined;
}

export const kecontactProfile: AdapterProfile = {
    adapter: 'kecontact',
    claimsInstance: true,
    detect(instance, objects) {
        const id = (s: string): string => `${instance}.${s}`;
        const power = ref(objects, id('p'), 'Charging power');
        const status = ref(objects, id('state'), 'Status');
        if (!power || !status) {
            return null;
        }

        const wallbox: SvWallbox = {
            id: instance,
            name: 'Wallbox',
            adapter: 'kecontact',
            power,
            status,
            statusMap: {
                0: 'starting',
                1: 'notReady',
                2: 'ready',
                3: 'charging',
                4: 'error',
                5: 'interrupted',
            },
            plug: ref(objects, id('plug'), 'Plug'),
            vehiclePluggedValues: [5, 7],
            // nur lesen: der Ladestrom wird von der PV-Automatik des Adapters geregelt
            current: readOnly(ref(objects, id('currentUser'), 'Charging current')),
            currentMax: ref(objects, id('currentHardware'), 'Maximum charging current'),
            phases: ref(objects, id('statistics.chargingPhases'), 'Phases'),
            configuredPhases: readOnly(ref(objects, id('automatic.calcPhases'), 'Phases (setting)')),
            surplus: ref(objects, id('statistics.surplus'), 'PV surplus'),
            settings: settings(objects, instance),
            vehicleSoCSource: readOnly(ref(objects, id('automatic.stateVehicleSoC'), 'SoC data point')),
            pvAutomatic: ref(objects, id('automatic.photovoltaics'), 'PV surplus charging'),
            pause: ref(objects, id('automatic.pauseWallbox'), 'Pause'),
            connected: ref(objects, id('info.connection'), 'Connected'),
        };
        return { wallbox };
    },
};
