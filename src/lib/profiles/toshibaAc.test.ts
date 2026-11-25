import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discover } from '../discovery';

const objects = JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'test', 'fixtures', 'toshiba-ac.json'), 'utf8'),
) as Record<string, ioBroker.Object>;

describe('profile: toshiba-ac', () => {
    const result = discover(objects, { language: 'de', ignoreAdapters: [] });
    const devices = result.model.devices;
    const living = devices.find(d => d.id === 'toshiba-ac.0.Wohnzimmer')!;
    const state = (name: string): ReturnType<typeof living.states.find> => living.states.find(s => s.name === name);

    it('erkennt jedes Klimagerät genau einmal (keine Info-Kanäle als Kacheln)', () => {
        expect(devices.map(d => `${d.id}:${d.type}`)).to.deep.equal([
            'toshiba-ac.0.Arbeitszimmer:airCondition',
            'toshiba-ac.0.Schlafzimmer:airCondition',
            'toshiba-ac.0.Wohnzimmer:airCondition',
        ]);
    });

    it('ordnet den Raum über den Gerätenamen zu und nennt das Gerät "Klimaanlage"', () => {
        expect(living.name).to.equal('Klimaanlage');
        expect(result.model.rooms.find(r => r.id === living.roomId)?.name).to.equal('Wohnzimmer');
    });

    it('bildet die States auf Rollen ab, mit Schrittweite und deutschen Wertelisten', () => {
        expect(state('SET')?.id).to.equal('toshiba-ac.0.Wohnzimmer.targetTemperature');
        expect(state('SET')?.step).to.equal(1);
        expect(state('ACTUAL')?.id).to.equal('toshiba-ac.0.Wohnzimmer.indoorTemperature');
        expect(state('POWER')?.write).to.equal(true);
        expect(state('MODE')?.states).to.deep.equal({
            AUTO: 'Automatik',
            COOL: 'Kühlen',
            HEAT: 'Heizen',
            DRY: 'Entfeuchten',
            FAN: 'Lüften',
        });
        // Nur die Lamellen-Stellungen, die das Gerät kennt
        expect(Object.keys(state('SWING')?.states || {})).to.have.length(9);
        const bedroom = devices.find(d => d.id === 'toshiba-ac.0.Schlafzimmer')!;
        expect(Object.keys(bedroom.states.find(s => s.name === 'SWING')?.states || {})).to.deep.equal([
            'OFF',
            'SWING_VERTICAL',
        ]);
        expect(state('ENERGY_YEAR')?.unit).to.equal('Wh');
        expect(state('CONNECTED')?.id).to.equal('toshiba-ac.0.info.connection');
    });

    it('gibt nur die bedienbaren States zum Schreiben frei', () => {
        expect(result.writableIds.has('toshiba-ac.0.Wohnzimmer.mode')).to.equal(true);
        expect(result.writableIds.has('toshiba-ac.0.Wohnzimmer.indoorTemperature')).to.equal(false);
        expect(result.writableIds.has('toshiba-ac.0.info.connection')).to.equal(false);
    });
});

describe('profile: toshiba-ac ab 0.2.0 (Betriebsart als Zahl)', () => {
    // Gleicher Objektbaum, nur "mode" wie in toshiba-ac 0.2.0: Zahl mit Werteliste, FAN_ONLY statt FAN
    const numeric = structuredClone(objects);
    for (const id of Object.keys(numeric).filter(k => k.endsWith('.mode'))) {
        const common = numeric[id].common as ioBroker.StateCommon;
        common.type = 'number';
        common.role = 'level.mode.airconditioner';
        common.states = { 1: 'AUTO', 2: 'COOL', 3: 'HEAT', 4: 'DRY', 5: 'FAN_ONLY' };
    }
    const devices = discover(numeric, { language: 'de', ignoreAdapters: [] }).model.devices;
    const mode = devices.find(d => d.id === 'toshiba-ac.0.Wohnzimmer')!.states.find(s => s.name === 'MODE')!;

    it('beschriftet die Zahlen auf Deutsch und kennt ihre Namen', () => {
        expect(mode.type).to.equal('number');
        expect(mode.states).to.deep.equal({
            1: 'Automatik',
            2: 'Kühlen',
            3: 'Heizen',
            4: 'Entfeuchten',
            5: 'Lüften',
        });
        expect(mode.codes).to.deep.equal({ 1: 'AUTO', 2: 'COOL', 3: 'HEAT', 4: 'DRY', 5: 'FAN' });
    });

    it('braucht bei Namen als Werte (vor 0.2.0) keine Zuordnung', () => {
        const old = discover(objects, { language: 'de', ignoreAdapters: [] }).model.devices;
        const oldMode = old.find(d => d.id === 'toshiba-ac.0.Wohnzimmer')!.states.find(s => s.name === 'MODE')!;
        expect(oldMode.codes).to.equal(undefined);
    });
});
