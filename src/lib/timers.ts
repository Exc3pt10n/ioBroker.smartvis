/**
 * Timer-Funktionen von außen: im Adapter die von ioBroker (adapter.setTimeout/clearTimeout), damit beim Beenden der
 * Instanz keine Timer weiterlaufen; in Demo und Tests die von Node.
 */
export interface Timers {
    setTimeout: (callback: () => void, ms: number) => ioBroker.Timeout | undefined;
    clearTimeout: (timer: ioBroker.Timeout | undefined) => void;
}

/** Timer von Node (Demo, Tests) */
export const nodeTimers: Timers = {
    setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms) as unknown as ioBroker.Timeout,
    clearTimeout: timer => globalThis.clearTimeout(timer as unknown as NodeJS.Timeout),
};

/** Verzögerung der Neu-Erkennung: 1–3600 s, sonst 10 s (die Einstellung wird nicht nur in der Oberfläche geprüft) */
export function rediscoverDelayMs(seconds: unknown): number {
    const value = Number(seconds);
    if (!Number.isFinite(value) || value <= 0) {
        return 10_000;
    }
    return Math.round(Math.min(Math.max(value, 1), 3600) * 1000);
}
