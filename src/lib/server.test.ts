import { expect } from 'chai';
import { isSameOrigin } from './server';
import { rediscoverDelayMs } from './timers';

const req = (headers: Record<string, string>): { headers: Record<string, string> } => ({ headers });

describe('isSameOrigin', () => {
    it('accepts the page served by SmartVis itself', () => {
        expect(isSameOrigin(req({ origin: 'http://192.168.1.10:8099', host: '192.168.1.10:8099' }))).to.equal(true);
        expect(isSameOrigin(req({ origin: 'https://Vis.Example.org', host: 'vis.example.org' }))).to.equal(true);
    });

    it('accepts clients without Origin header (no browser)', () => {
        expect(isSameOrigin(req({ host: '127.0.0.1:8099' }))).to.equal(true);
    });

    it('rejects other web pages', () => {
        expect(isSameOrigin(req({ origin: 'https://evil.example', host: '192.168.1.10:8099' }))).to.equal(false);
        expect(isSameOrigin(req({ origin: 'http://192.168.1.10:8080', host: '192.168.1.10:8099' }))).to.equal(false);
        expect(isSameOrigin(req({ origin: 'null', host: '192.168.1.10:8099' }))).to.equal(false);
    });
});

describe('rediscoverDelayMs', () => {
    it('uses the configured seconds', () => {
        expect(rediscoverDelayMs(10)).to.equal(10_000);
        expect(rediscoverDelayMs('30')).to.equal(30_000);
    });

    it('falls back to 10 s for invalid values', () => {
        expect(rediscoverDelayMs(undefined)).to.equal(10_000);
        expect(rediscoverDelayMs(-5)).to.equal(10_000);
        expect(rediscoverDelayMs('abc')).to.equal(10_000);
    });

    it('limits the value to 1 h', () => {
        expect(rediscoverDelayMs(1e12)).to.equal(3_600_000);
        expect(rediscoverDelayMs(0.2)).to.equal(1000);
    });
});
