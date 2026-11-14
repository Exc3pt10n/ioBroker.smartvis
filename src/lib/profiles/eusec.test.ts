import { expect } from 'chai';
import { discover } from '../discovery';
import { eusecTree } from '../fixtures/eusec';

describe('profile: eusec (eufy Security)', () => {
    const tree = eusecTree();
    tree.room('outside', 'Einfahrt', ['eusec.0.T8010N0000000001.cameras.T8142T0000000013']);
    const r = discover(tree.objects, { language: 'de', ignoreAdapters: [] });
    const cameras = r.model.cameras ?? [];
    const cam = (name: string): (typeof cameras)[number] => cameras.find(c => c.name === name)!;

    it('erkennt alle Kameras – ohne Störkacheln (Bewegung, Akkutemperatur)', () => {
        expect(cameras.map(c => c.name)).to.deep.equal(['Eingangstür', 'Garten', 'Einfahrt', 'Wohnzimmer']);
        expect(r.model.devices).to.have.length(0);
    });

    it('ordnet Räume über Aufzählungen und Namen zu', () => {
        const room = (name: string): string | undefined => r.model.rooms.find(x => x.id === cam(name).roomId)?.name;
        expect(room('Einfahrt')).to.equal('Einfahrt');
        expect(room('Garten')).to.equal('Garten');
        expect(room('Wohnzimmer')).to.equal('Wohnzimmer');
    });

    it('übernimmt Bild, Erkennung, Livestream, Licht und Schwenken', () => {
        const garden = cam('Garten');
        expect(garden.picture?.id).to.match(/picture_url$/);
        expect(garden.light?.write).to.equal(true);
        expect(garden.panLeft).to.equal(undefined);
        expect(garden.model).to.equal('T8142');
        const living = cam('Wohnzimmer');
        expect(living.tiltUp?.id).to.match(/tilt_up$/);
        expect(living.crying?.id).to.match(/crying_detected$/);
        expect(living.stationId).to.equal('eusec.0.T8410P0000000021');
    });

    it('Sicherheitsmodus auf Deutsch, schreibbar; Sirene und Neustart nicht freigegeben', () => {
        const base = r.model.securityStations?.find(s => s.name === 'HomeBase');
        expect(base?.guardMode?.states).to.deep.equal({
            0: 'Abwesend',
            1: 'Zuhause',
            2: 'Zeitplan',
            47: 'Geofencing',
            63: 'Deaktiviert',
        });
        expect(r.writableIds.has(base!.guardMode!.id)).to.equal(true);
        expect([...r.writableIds].some(id => /trigger_alarm_sound|reboot/.test(id))).to.equal(false);
        expect(r.writableIds.has(cam('Garten').liveStart!.id)).to.equal(true);
    });

    it('zählt die Akkus der Außenkameras zu den Batteriegeräten', () => {
        expect((r.model.batteries ?? []).map(b => b.name).sort()).to.include.members([
            'Einfahrt',
            'Eingangstür',
            'Garten',
        ]);
    });
});
