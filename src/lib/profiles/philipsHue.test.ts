import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discover } from '../discovery';

/** Auszug aus einem echten Objektbaum von ioBroker.philips-hue (eine Bridge, Szenen gekürzt) */
const objects = JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'test', 'fixtures', 'philips-hue.json'), 'utf8'),
) as Record<string, ioBroker.Object>;

describe('profile: philips-hue', () => {
    const result = discover(objects, { language: 'de', ignoreAdapters: [] });
    const devices = result.model.devices;
    const byId = Object.fromEntries(devices.map(d => [d.id, d]));
    const roomOf = (id: string): string | undefined => result.model.rooms.find(r => r.id === byId[id]?.roomId)?.name;

    it('erkennt Lampen, Raumgruppen und Bewegungsmelder – ohne "all", Schalter und Automationen', () => {
        expect(devices.map(d => `${d.id}:${d.type}`).sort()).to.deep.equal([
            'philips-hue.0.lights.Leuchte_Eingangstüre:rgbSingle',
            'philips-hue.0.lights.Leuchte_Gäste_WC:ct',
            'philips-hue.0.lights.Leuchte_Küche:ct',
            'philips-hue.0.lights.Leuchte_Theke:ct',
            'philips-hue.0.rooms.Licht_Küche:ct',
            'philips-hue.0.sensors.Bewegungsmelder_Gäste_WC:motion',
        ]);
    });

    it('übernimmt die Räume der Hue-Bridge und nennt die Raumgruppe "Alle Lichter"', () => {
        expect(roomOf('philips-hue.0.lights.Leuchte_Theke')).to.equal('Küche');
        expect(roomOf('philips-hue.0.lights.Leuchte_Küche')).to.equal('Küche');
        expect(roomOf('philips-hue.0.lights.Leuchte_Gäste_WC')).to.equal('Gäste-WC');
        expect(byId['philips-hue.0.rooms.Licht_Küche'].name).to.equal('Alle Lichter');
    });

    it('zeigt den Bewegungsmelder als ein Gerät mit Batterie', () => {
        const motion = byId['philips-hue.0.sensors.Bewegungsmelder_Gäste_WC'];
        expect(motion.states.map(s => s.name)).to.include.members(['ACTUAL', 'LOWBAT', 'BATTERY']);
        expect(devices.filter(d => d.id.startsWith('philips-hue.0.sensors.Bewegungsmelder_Gäste_WC'))).to.have.length(
            1,
        );
        expect((result.model.batteries || []).map(b => b.name)).to.include('Bewegungsmelder Gäste WC');
    });

    it('liefert die Szenen und Smart Scenes je Raum mit aktiver Szene', () => {
        const kitchen = result.model.scenes.find(g => g.id === 'philips-hue.0.rooms.Licht_Küche')!;
        expect(kitchen.kind).to.equal('room');
        // Lampen der Gruppe und die Gruppe selbst ("Alle Lichter")
        expect([...kitchen.devices].sort()).to.deep.equal([
            'philips-hue.0.lights.Leuchte_Küche',
            'philips-hue.0.lights.Leuchte_Theke',
            'philips-hue.0.rooms.Licht_Küche',
        ]);
        expect(kitchen.scenes.some(s => s.smart)).to.equal(true);
        expect(kitchen.active?.id).to.equal('philips-hue.0.rooms.Licht_Küche.activeScene');
    });
});
