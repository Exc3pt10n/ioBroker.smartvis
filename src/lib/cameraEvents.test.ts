import { expect } from 'chai';
import { CameraEventLog, type EventStorage } from './cameraEvents';
import { discover } from './discovery';
import { eusecTree } from './fixtures/eusec';

function memoryStorage(): EventStorage & { files: Map<string, Buffer | string> } {
    const files = new Map<string, Buffer | string>();
    return {
        files,
        read: (meta, path) => {
            const f = files.get(`${meta}/${path}`);
            return Promise.resolve(f === undefined ? null : Buffer.isBuffer(f) ? f : Buffer.from(f));
        },
        write: (meta, path, data) => {
            files.set(`${meta}/${path}`, data);
            return Promise.resolve();
        },
        remove: (meta, path) => {
            files.delete(`${meta}/${path}`);
            return Promise.resolve();
        },
    };
}

describe('Kamera-Ereignisprotokoll', () => {
    const cameras = discover(eusecTree().objects, { language: 'de', ignoreAdapters: [] }).model.cameras!;
    const garden = cameras.find(c => c.name === 'Garten')!;
    const T = 1_800_000_000_000;
    const v = (val: unknown, ts: number): { val: never; ack: boolean; ts: number } => ({
        val: val as never,
        ack: true,
        ts,
    });

    async function setup(): Promise<{ log: CameraEventLog; storage: ReturnType<typeof memoryStorage> }> {
        const storage = memoryStorage();
        const log = new CameraEventLog(
            'smartvis.0',
            storage,
            () => undefined,
            () => T + 60_000,
        );
        await log.load();
        log.setCameras(cameras);
        log.initial(garden.person!.id, v(false, T - 10_000));
        log.initial(garden.motion!.id, v(false, T - 10_000));
        log.initial(garden.picture!.id, v('/files/eusec.0/B/last_event/G.jpg', T - 3_600_000));
        return { log, storage };
    }

    it('fasst Erkennungen zusammen und kopiert das Ereignisbild in den eigenen Speicher', async () => {
        const { log, storage } = await setup();
        storage.files.set('eusec.0/B/last_event/G.jpg', Buffer.from('bild-1'));
        log.onState(garden.motion!.id, v(true, T));
        log.onState(garden.person!.id, v(true, T + 2_000));
        log.onState(garden.picture!.id, v('/files/eusec.0/B/last_event/G.jpg', T + 8_000));
        await log.flush();
        const [event] = log.list(garden.id);
        expect(event.kinds).to.deep.equal(['person', 'motion']);
        expect(event.ts).to.equal(T);
        expect(event.picture).to.equal(`/files/smartvis.0/events/T8142N0000000012/${T}.jpg`);
        expect(storage.files.get(`smartvis.0/events/T8142N0000000012/${T}.jpg`)?.toString()).to.equal('bild-1');
        expect(log.hasPicture(event.picture!)).to.equal(true);
        // Index gespeichert und wieder ladbar
        const again = new CameraEventLog('smartvis.0', storage);
        await again.load();
        expect(again.list(garden.id)).to.have.length(1);
    });

    it('legt für spätere Erkennungen neue Ereignisse an und erzeugt beim Start keines', async () => {
        const { log } = await setup();
        log.onState(garden.motion!.id, v(true, T));
        log.onState(garden.motion!.id, v(false, T + 5_000));
        log.onState(garden.motion!.id, v(true, T + 5 * 60_000));
        await log.flush();
        expect(log.list(garden.id).map(e => e.ts)).to.deep.equal([T + 5 * 60_000, T]);
        expect(log.list().length).to.equal(2);
    });

    it('verwirft Ereignisse älter als 7 Tage samt Bild', async () => {
        const { log, storage } = await setup();
        storage.files.set('eusec.0/B/last_event/G.jpg', Buffer.from('alt'));
        const old = T - 8 * 86_400_000;
        log.onState(garden.picture!.id, v('/files/eusec.0/B/last_event/G.jpg', old));
        await log.flush();
        expect(log.list(garden.id)).to.have.length(0);
        expect([...storage.files.keys()].some(k => k.includes(`/${old}.`))).to.equal(false);
    });
});
