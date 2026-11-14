import { expect } from 'chai';
import { discover } from './discovery';
import { Tree } from './fixtures/build';

describe('Farblampen: Farb-States für die Farbauswahl', () => {
    it('ioBroker.hue (Color Ambiance): Farbton, Sättigung und Farbmodus neben r/g/b', () => {
        const t = new Tree().instance('hue.0');
        const l = 'hue.0.Stehlampe';
        t.channel(l, 'Stehlampe', { id: '3', type: 'Extended color light' }, { role: 'light.color' })
            .state(`${l}.on`, { type: 'boolean', role: 'switch.light', write: true })
            .state(`${l}.level`, { type: 'number', role: 'level.dimmer', write: true, min: 0, max: 100 })
            .state(`${l}.ct`, { type: 'number', role: 'level.color.temperature', write: true, min: 2200, max: 6500 })
            .state(`${l}.r`, { type: 'number', role: 'level.color.red', write: true, min: 0, max: 255 })
            .state(`${l}.g`, { type: 'number', role: 'level.color.green', write: true, min: 0, max: 255 })
            .state(`${l}.b`, { type: 'number', role: 'level.color.blue', write: true, min: 0, max: 255 })
            .state(`${l}.hue`, { type: 'number', role: 'level.color.hue', write: true, min: 0, max: 360 })
            .state(`${l}.sat`, { type: 'number', role: 'level.color.saturation', write: true, min: 0, max: 254 })
            .state(`${l}.colormode`, { type: 'string', role: 'colormode' });
        const r = discover(t.objects, { language: 'de', ignoreAdapters: [] });
        const lamp = r.model.devices.find(d => d.id === l)!;
        const names = Object.fromEntries(lamp.states.map(s => [s.name, s.id.split('.').pop()]));
        expect(names).to.include({ HUE: 'hue', SATURATION: 'sat', COLORMODE: 'colormode', TEMPERATURE: 'ct' });
        expect(r.writableIds.has(`${l}.hue`)).to.equal(true);
        expect(r.writableIds.has(`${l}.colormode`)).to.equal(false);
    });

    it('hue-v2: Hex-Farbe "rgb" und colorMode', () => {
        const t = new Tree().instance('hue-v2.0');
        const l = 'hue-v2.0.lights.stehlampe';
        t.channel(l, 'Stehlampe', { id: 'abc', type: 'light' })
            .state(`${l}.on`, { type: 'boolean', role: 'switch.light', write: true })
            .state(`${l}.brightness`, { type: 'number', role: 'level.dimmer', write: true, min: 0, max: 100 })
            .state(`${l}.colorTemperature`, {
                type: 'number',
                role: 'level.color.temperature',
                write: true,
                min: 2000,
                max: 6500,
            })
            .state(`${l}.xy`, { type: 'string', role: 'level.color.xy', write: true })
            .state(`${l}.rgb`, { type: 'string', role: 'level.color.rgb', write: true })
            .state(`${l}.colorMode`, { type: 'string', role: 'text', states: { xy: 'xy', ct: 'ct' } });
        const r = discover(t.objects, { language: 'de', ignoreAdapters: [] });
        const lamp = r.model.devices.find(d => d.id === l)!;
        const rgb = lamp.states.find(s => s.name === 'RGB');
        expect(rgb?.id).to.equal(`${l}.rgb`);
        expect(lamp.states.find(s => s.name === 'COLORMODE')?.id).to.equal(`${l}.colorMode`);
        expect(lamp.states.filter(s => s.id === `${l}.rgb`)).to.have.length(1);
    });
});
