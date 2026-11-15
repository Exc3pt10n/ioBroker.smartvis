import { Tree } from './build';

/**
 * ioBroker.eufy-next (eufy v6 cloud über @mega-yfue/eufy-sdk), Struktur wie vom Adapter aus dem Geräte-Manifest
 * erzeugt (Seriennummern erfunden): je Gerät `eufy-next.0.<SN>` mit einem Kanal je Fähigkeit (`camera`, `battery`,
 * `motion`, `light`, `ptz`, `arming` …), `events.<name>.triggered` und bei Kameras `snapshot.url`.
 * HomeBase mit zwei Akku-Kameras und eine schwenkbare Innenkamera, die selbst Station ist.
 */
export function eufyNextTree(): Tree {
    const t = new Tree().instance('eufy-next.0');
    t.channel('eufy-next.0.info', 'Information').state('eufy-next.0.info.connection', {
        type: 'boolean',
        role: 'indicator.connected',
    });

    const device = (sn: string, name: string, model: string, codec: string): string => {
        const d = `eufy-next.0.${sn}`;
        t.device(d, name, { sn, model, codec }, { statusStates: { onlineId: `${d}.info.available` } })
            .channel(`${d}.info`, 'Device information')
            .state(`${d}.info.name`, { type: 'string', role: 'info.name' })
            .state(`${d}.info.model`, { type: 'string', role: 'info.hardware' })
            .state(`${d}.info.available`, { type: 'boolean', role: 'indicator.reachable' })
            .state(`${d}.info.lastSeen`, { type: 'number', role: 'value.time' })
            .channel(`${d}.events`, 'Events')
            .state(`${d}.events.lastEvent`, { type: 'string', role: 'text' });
        return d;
    };
    const event = (d: string, name: string, role: string): void => {
        t.channel(`${d}.events.${name}`, name)
            .state(`${d}.events.${name}.triggered`, { type: 'boolean', role })
            .state(`${d}.events.${name}.lastTriggered`, { type: 'number', role: 'value.time' })
            .state(`${d}.events.${name}.payload`, { type: 'string', role: 'json' });
    };
    const arming = (d: string): void => {
        t.channel(`${d}.arming`, 'Arming').state(`${d}.arming.mode`, {
            type: 'number',
            role: 'level.mode',
            write: true,
            states: {
                0: 'away',
                1: 'home',
                2: 'schedule',
                3: 'custom1',
                4: 'custom2',
                5: 'custom3',
                6: 'off',
                47: 'geo',
                63: 'disarmed',
            },
        });
        event(d, 'alarm', 'sensor.alarm');
    };
    const camera = (d: string, battery: boolean): void => {
        t.channel(`${d}.camera`, 'Camera')
            .state(`${d}.camera.enabled`, { type: 'boolean', role: 'switch', write: true })
            .state(`${d}.camera.statusLed`, { type: 'boolean', role: 'switch', write: true })
            .state(`${d}.camera.nightVision`, {
                type: 'number',
                role: 'level.mode',
                write: true,
                states: { 0: 'Off', 1: 'Infrared', 2: 'FullColor' },
            })
            .state(`${d}.camera.wifiRssi`, { type: 'number', role: 'value', unit: 'dBm' })
            .channel(`${d}.motion`, 'Motion')
            .state(`${d}.motion.detectionEnabled`, { type: 'boolean', role: 'switch', write: true })
            .channel(`${d}.audio`, 'Audio')
            .state(`${d}.audio.microphone`, { type: 'boolean', role: 'switch', write: true })
            .state(`${d}.audio.speaker`, { type: 'boolean', role: 'switch', write: true })
            .channel(`${d}.snapshot`, 'Snapshot')
            .state(`${d}.snapshot.url`, { type: 'string', role: 'url' })
            .state(`${d}.snapshot.updated`, { type: 'number', role: 'value.time' })
            .state(`${d}.snapshot.refreshStored`, { type: 'boolean', role: 'button', read: false, write: true })
            .state(`${d}.snapshot.refreshLive`, { type: 'boolean', role: 'button', read: false, write: true });
        event(d, 'motion', 'sensor.motion');
        event(d, 'personDetected', 'indicator');
        if (battery) {
            t.channel(`${d}.battery`, 'Battery')
                .state(`${d}.battery.level`, { type: 'number', role: 'value.battery', unit: '%', min: 0, max: 100 })
                .state(`${d}.battery.charging`, { type: 'boolean', role: 'indicator' })
                .state(`${d}.battery.temperature`, { type: 'number', role: 'value.temperature', unit: '°C' })
                .state(`${d}.battery.workingMode`, {
                    type: 'string',
                    role: 'level.mode',
                    write: true,
                    states: {
                        'Optimal Battery Life': 'Optimal Battery Life',
                        'Optimal Surveillance': 'Optimal Surveillance',
                        'Customize Recording': 'Customize Recording',
                    },
                })
                .channel(`${d}.light`, 'Light')
                .state(`${d}.light.isOn`, { type: 'boolean', role: 'switch', write: true })
                .state(`${d}.light.brightness`, {
                    type: 'number',
                    role: 'level.dimmer',
                    unit: '%',
                    min: 0,
                    max: 100,
                    write: true,
                });
        } else {
            t.channel(`${d}.ptz`, 'Ptz');
            for (const dir of ['left', 'right', 'up', 'down']) {
                t.state(`${d}.ptz.${dir}`, { type: 'boolean', role: 'button', read: false, write: true });
            }
            event(d, 'petDetection', 'indicator');
            event(d, 'cryingDetected', 'indicator');
        }
    };

    const base = device('T8010N0000000001', 'HomeBase', 'T8010', 'station');
    arming(base);
    camera(device('T8142N0000000011', 'Eingangstür', 'T8142', 'camera'), true);
    camera(device('T8142N0000000012', 'Garten', 'T8142', 'camera'), true);
    const indoor = device('T8410P0000000021', 'Wohnzimmer', 'T8410', 'camera');
    camera(indoor, false);
    arming(indoor);
    return t;
}
