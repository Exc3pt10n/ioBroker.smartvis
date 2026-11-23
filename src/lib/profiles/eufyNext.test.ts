import { expect } from 'chai';
import { discover } from '../discovery';
import { eufyNextTree } from '../fixtures/eufyNext';

describe('profile: eufy-next (eufy v6 cloud)', () => {
    const tree = eufyNextTree();
    tree.room('outside', 'Eingang', ['eufy-next.0.T8142N0000000011']);
    const r = discover(tree.objects, { language: 'de', ignoreAdapters: [] });
    const cameras = r.model.cameras ?? [];
    const cam = (name: string): (typeof cameras)[number] => cameras.find(c => c.name === name)!;

    it('erkennt die Kameras – ohne Störkacheln aus den Kanälen der Fähigkeiten', () => {
        expect(cameras.map(c => c.name)).to.deep.equal(['Eingangstür', 'Garten', 'Wohnzimmer']);
        expect(r.model.devices).to.have.length(0);
    });

    it('übernimmt Ereignisbild (brauchbar), Erkennung, Status, Licht und Schwenken', () => {
        const garden = cam('Garten');
        expect(garden.picture?.id).to.equal(`${garden.id}.snapshot.url`);
        expect(garden.pictureUsable).to.equal(true);
        expect(garden.pictureRefresh?.id).to.equal(`${garden.id}.snapshot.refreshLive`);
        expect(garden.motion?.id).to.equal(`${garden.id}.events.motion.triggered`);
        expect(garden.person?.id).to.equal(`${garden.id}.events.personDetected.triggered`);
        expect(garden.status?.id).to.equal(`${garden.id}.info.available`);
        expect(garden.battery?.id).to.equal(`${garden.id}.battery.level`);
        expect(garden.light?.write).to.equal(true);
        expect(garden.liveStart?.id).to.equal(`${garden.id}.livestream.start`);
        expect(garden.liveStop?.id).to.equal(`${garden.id}.livestream.stop`);
        expect(garden.liveUrl?.id).to.equal(`${garden.id}.livestream.url`);
        expect(r.writableIds.has(garden.liveStart!.id)).to.equal(true);
        expect(r.writableIds.has(`${garden.id}.livestream.rtsp`)).to.equal(false);
        expect(garden.model).to.equal('T8142');
        const living = cam('Wohnzimmer');
        expect(living.tiltUp?.id).to.equal(`${living.id}.ptz.up`);
        expect(living.crying?.id).to.match(/cryingDetected\.triggered$/);
        expect(r.writableIds.has(garden.pictureRefresh!.id)).to.equal(true);
    });

    it('ordnet Kameras ihrer Station zu: eigene Station bzw. die einzige HomeBase', () => {
        expect(cam('Wohnzimmer').stationId).to.equal('eufy-next.0.T8410P0000000021');
        expect(cam('Garten').stationId).to.equal('eufy-next.0.T8010N0000000001');
    });

    it('Sicherheitsmodus auf Deutsch und schreibbar, Alarm aus dem Ereignis', () => {
        const base = r.model.securityStations?.find(s => s.name === 'HomeBase');
        expect(base?.guardMode?.states?.['0']).to.equal('Abwesend');
        expect(base?.guardMode?.states?.['1']).to.equal('Zuhause');
        expect(base?.guardMode?.states?.['63']).to.equal('Deaktiviert');
        expect(base?.alarm?.id).to.equal(`${base!.id}.events.alarm.triggered`);
        expect(r.writableIds.has(base!.guardMode!.id)).to.equal(true);
        expect(r.model.securityStations?.map(s => s.name).sort()).to.deep.equal(['HomeBase', 'Wohnzimmer']);
    });

    it('Einstellungen auf Deutsch, auch Text-Wertelisten mit Abhängigkeit', () => {
        const garden = cam('Garten');
        const setting = (key: string): NonNullable<typeof garden.settings>[number] | undefined =>
            garden.settings?.find(s => s.state.id === `${garden.id}.${key}`);
        expect(setting('camera.nightVision')?.state.states).to.deep.equal({
            0: 'Aus',
            1: 'Infrarot (schwarz-weiß)',
            2: 'Farbe',
        });
        // Energiemodus nur als Index ohne Werteliste, Befehle ohne gemeldeten Wert: nicht anbieten
        expect(setting('battery.workingMode')).to.equal(undefined);
        expect(setting('camera.setPrivacy')).to.equal(undefined);
        expect(garden.vehicle?.id).to.equal(`${garden.id}.events.vehicleDetected.triggered`);
        expect(setting('motion.detectionEnabled')?.group).to.equal('detection');
        expect(setting('light.brightness')?.state.write).to.equal(true);
        expect(r.writableIds.has(setting('camera.statusLed')!.state.id)).to.equal(true);
    });

    it('zählt die Akkus der Außenkameras mit fest eingebautem Akku', () => {
        const batteries = r.model.batteries ?? [];
        const garden = batteries.find(b => b.name === 'Garten');
        expect(garden?.batteryType).to.equal('fester Akku');
        // Ladestand, nicht der Akkuzustand (beide mit Rolle value.battery)
        expect(garden?.level?.id).to.match(/\.battery\.level$/);
        expect(batteries.map(b => b.name)).to.not.include('Wohnzimmer');
    });
});
