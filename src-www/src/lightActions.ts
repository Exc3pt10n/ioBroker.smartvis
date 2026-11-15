import type { SvDevice, SvScene, SvSceneGroup, SvStateValue } from '../../src/shared/protocol';
import { connection } from './connection';
import { showToast } from './components/Toast';
import { lightChanges } from './rooms';
import { isSceneActive } from './scenes';

type States = Record<string, SvStateValue | null>;

/**
 * Aktive Szenen der Gruppen, zu denen die Lampen gehören (z. B. Hue-Raum mit "Entspannen").
 * Beim Rückgängigmachen wird die Szene wieder aufgerufen – nur "an" würde sie nicht reaktivieren
 * (Hue meldet sie dann als inaktiv, dynamische Szenen bleiben stehen).
 */
export function activeScenesOf(
    lights: SvDevice[],
    groups: SvSceneGroup[],
    states: States,
): { group: SvSceneGroup; scene: SvScene }[] {
    const ids = new Set(lights.map(d => d.id));
    const result: { group: SvSceneGroup; scene: SvScene }[] = [];
    for (const group of groups) {
        if (!group.devices.some(id => ids.has(id))) {
            continue;
        }
        // Smart Scene vor normaler Szene (wie in der Anzeige)
        const scene =
            group.scenes.find(s => s.smart && isSceneActive(group, s, states)) ??
            group.scenes.find(s => !s.smart && isSceneActive(group, s, states));
        if (scene) {
            result.push({ group, scene });
        }
    }
    // Verschachtelte Gruppen (Zone im Raum): nur die größte Gruppe je Lampe aufrufen
    return result.filter(
        r =>
            !result.some(
                o =>
                    o !== r &&
                    o.group.devices.length > r.group.devices.length &&
                    r.group.devices.every(id => o.group.devices.includes(id)),
            ),
    );
}

/** Lampen aus-/einschalten, mit Rückmeldung und "Rückgängig" (stellt auch eine aktive Szene wieder her) */
export function switchLights(lights: SvDevice[], on: boolean, states: States, where?: string): void {
    const changes = lightChanges(lights, on, states);
    if (!changes.length) {
        return;
    }
    const scenes = on ? [] : activeScenesOf(lights, connection.getSnapshot().model?.scenes || [], states);
    for (const c of changes) {
        connection.setState(c.id, c.val);
    }
    const n = changes.length;
    showToast(
        `${n} ${n === 1 ? 'Licht' : 'Lichter'} ${on ? 'eingeschaltet' : 'ausgeschaltet'}${where ? ` · ${where}` : ''}`,
        () => {
            // Lampen einer Gruppe mit aktiver Szene: Szene aufrufen statt einzeln einschalten
            const byScene = new Set(
                lights.filter(d => scenes.some(s => s.group.devices.includes(d.id))).map(d => d.id),
            );
            const sceneStates = new Set(lights.filter(d => byScene.has(d.id)).flatMap(d => d.states.map(st => st.id)));
            for (const { scene } of scenes) {
                connection.setState(scene.state.id, true);
            }
            for (const c of changes) {
                if (c.prev !== undefined && c.prev !== null && !sceneStates.has(c.id)) {
                    connection.setState(c.id, c.prev);
                }
            }
        },
    );
}
