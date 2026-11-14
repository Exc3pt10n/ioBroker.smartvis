import { Tree } from './build';

/**
 * ioBroker.eusec (eufy Security), Struktur wie in einer echten Anlage (Seriennummern erfunden):
 * HomeBase mit drei Außenkameras (eufyCam, Akku, Licht) und eine Innenkamera mit eigener Station (schwenkbar).
 */
export function eusecTree(): Tree {
    const t = new Tree().instance('eusec.0');
    const station = (id: string, name: string): string => {
        const s = `eusec.0.${id}`;
        t.device(s, name)
            .channel(`${s}.station`, 'station')
            .channel(`${s}.cameras`, 'cameras')
            .state(`${s}.station.name`, { type: 'string', role: 'info.name' })
            .state(`${s}.station.guard_mode`, {
                type: 'number',
                role: 'value',
                write: true,
                states: { 0: 'Away', 1: 'Home', 2: 'Schedule', 47: 'Geofencing', 63: 'Disarmed' },
            })
            .state(`${s}.station.current_mode`, {
                type: 'number',
                role: 'value',
                states: { 0: 'Away', 1: 'Home', 63: 'Disarmed' },
            })
            .state(`${s}.station.alarm`, { type: 'boolean', role: 'state' })
            .state(`${s}.station.connection`, { type: 'boolean', role: 'indicator.connection' })
            .state(`${s}.station.reboot`, { type: 'boolean', role: 'button.start', write: true });
        return s;
    };
    const camera = (st: string, serial: string, name: string, indoor: boolean): void => {
        const c = `${st}.cameras.${serial}`;
        t.device(c, name)
            .state(`${c}.name`, { type: 'string', role: 'info.name' })
            .state(`${c}.enabled`, { type: 'boolean', role: 'switch.enable', write: true })
            .state(`${c}.state`, {
                type: 'number',
                role: 'info.status',
                states: { 0: 'Offline', 1: 'Online', 2: 'Manually disabled', 3: 'Offline low battery' },
            })
            .state(`${c}.motion_detected`, { type: 'boolean', role: 'sensor.motion' })
            .state(`${c}.person_detected`, { type: 'boolean', role: 'sensor.motion' })
            .state(`${c}.picture_url`, { type: 'string', role: 'url' })
            .state(`${c}.picture_html`, { type: 'string', role: 'html' })
            .state(`${c}.livestream`, { type: 'string', role: 'url' })
            .state(`${c}.start_stream`, { type: 'boolean', role: 'button.start', write: true })
            .state(`${c}.stop_stream`, { type: 'boolean', role: 'button.stop', write: true })
            .state(`${c}.motion_detection`, { type: 'boolean', role: 'switch.enable', write: true })
            .state(`${c}.status_led`, { type: 'boolean', role: 'switch.enable', write: true })
            .state(`${c}.trigger_alarm_sound`, { type: 'boolean', role: 'button.start', write: true });
        if (indoor) {
            t.state(`${c}.pan_left`, { type: 'boolean', role: 'button.start', write: true })
                .state(`${c}.pan_right`, { type: 'boolean', role: 'button.start', write: true })
                .state(`${c}.tilt_up`, { type: 'boolean', role: 'button.start', write: true })
                .state(`${c}.tilt_down`, { type: 'boolean', role: 'button.start', write: true })
                .state(`${c}.pet_detected`, { type: 'boolean', role: 'sensor' })
                .state(`${c}.crying_detected`, { type: 'boolean', role: 'sensor.noise' });
        } else {
            t.state(`${c}.battery`, { type: 'number', role: 'value.battery', unit: '%' })
                .state(`${c}.battery_temperature`, { type: 'number', role: 'value.temperature', unit: '°C' })
                .state(`${c}.light`, { type: 'boolean', role: 'switch.enable', write: true });
        }
    };
    const base = station('T8010N0000000001', 'HomeBase');
    camera(base, 'T8142N0000000011', 'Eingangstür', false);
    camera(base, 'T8142N0000000012', 'Garten', false);
    camera(base, 'T8142T0000000013', 'Einfahrt', false);
    const indoor = station('T8410P0000000021', 'Wohnzimmer');
    camera(indoor, 'T8410P0000000021', 'Wohnzimmer', true);
    t.channel('eusec.0.info', 'info').state('eusec.0.info.connection', {
        type: 'boolean',
        role: 'indicator.connection',
    });
    return t;
}
