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
