import { expect } from 'chai';
import type { SvCamera } from '../shared/protocol';
import { CameraSnapshots, frameUrl, type FrameFetcher } from './cameraSnapshots';

describe('cameraSnapshots', () => {
    it('derives the go2rtc frame url from the livestream page', () => {
        expect(frameUrl('http://192.168.1.5:1984/stream.html?src=T8142N0000000011')).to.equal(
            'http://192.168.1.5:1984/api/frame.jpeg?src=T8142N0000000011',
        );
        expect(frameUrl('https://nas:1984/stream.html?src=CAM&mode=mse')).to.equal(
            'https://nas:1984/api/frame.jpeg?src=CAM',
        );
        expect(frameUrl('rtsp://nas:8554/CAM')).to.equal(undefined);
        expect(frameUrl('')).to.equal(undefined);
    });

    const camera = {
        id: 'eusec.0.T8010N0000000001.cameras.T8142N0000000011',
        name: 'Eingangstür',
        adapter: 'eusec',
        roomId: null,
        liveUrl: { name: 'LIVE', id: 'eusec.0.cam.livestream', type: 'string', write: false },
    } as SvCamera;

    function setup(frame: { data: Buffer; type: string } | null): {
        snaps: CameraSnapshots;
        files: Map<string, Buffer | string>;
        changes: () => number;
    } {
        const files = new Map<string, Buffer | string>();
        let changes = 0;
        const fetcher: FrameFetcher = () => Promise.resolve(frame);
        const snaps = new CameraSnapshots(
            'smartvis.0',
            {
                read: (_m, p) => Promise.resolve(files.has(p) ? Buffer.from(files.get(p)!) : null),
                write: (_m, p, d) => {
                    files.set(p, d);
                    return Promise.resolve();
                },
            },
            fetcher,
            () => changes++,
            () => undefined,
        );
        snaps.setCameras([camera]);
        return { snaps, files, changes: () => changes };
    }

    it('stores a frame and serves only that file', async () => {
        const { snaps, files, changes } = setup({ data: Buffer.alloc(5000, 1), type: 'image/jpeg' });
        expect(await snaps.capture(camera.id, 'http://x/api/frame.jpeg?src=a')).to.equal(true);
        const snap = snaps.snapshot(camera.id)!;
        expect(snap.url).to.equal('/files/smartvis.0/snapshots/T8142N0000000011.jpg');
        expect(files.has('snapshots/T8142N0000000011.jpg')).to.equal(true);
        expect(snaps.hasPicture(snap.url)).to.equal(true);
        expect(snaps.hasPicture('/files/smartvis.0/overrides.json')).to.equal(false);
        expect(changes()).to.equal(1);
        // Nach einem Neustart aus dem Index
        const again = setup(null);
        files.forEach((v, k) => again.files.set(k, v));
        await again.snaps.load();
        expect(again.snaps.snapshot(camera.id)?.ts).to.equal(snap.ts);
    });

    it('ignores errors and non-images', async () => {
        const text = setup({ data: Buffer.from('stream not found'), type: 'text/plain' });
        expect(await text.snaps.capture(camera.id, 'u')).to.equal(false);
        expect(text.snaps.snapshot(camera.id)).to.equal(undefined);
        const none = setup(null);
        expect(await none.snaps.capture(camera.id, 'u')).to.equal(false);
    });

    it('nimmt keine eigenen Standbilder für Kameras mit brauchbarem Ereignisbild (eufy-next)', async () => {
        let fetched = 0;
        const snaps = new CameraSnapshots(
            'smartvis.0',
            { read: () => Promise.resolve(null), write: () => Promise.resolve() },
            () => {
                fetched++;
                return Promise.resolve(null);
            },
            () => undefined,
            () => undefined,
        );
        snaps.setCameras([{ ...camera, pictureUsable: true }]);
        snaps.onState('eusec.0.cam.livestream', { val: 'http://h:1984/stream.html?src=x', ack: true, ts: 1 });
        await new Promise(resolve => setTimeout(resolve, 20));
        snaps.stopAll();
        expect(fetched).to.equal(0);
        expect(snaps.snapshot(camera.id)).to.equal(undefined);
    });
});
