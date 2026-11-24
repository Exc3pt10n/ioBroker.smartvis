import { t } from '../../src/shared/i18n';
import type { SvAutoShutter, SvModel, SvStateValue } from '../../src/shared/protocol';

/** Status-Texte von shuttercontrol (shutters.autoState) */
const AUTO_STATE: Record<string, { label: string; icon: string }> = {
    up: { label: t('Opened'), icon: '⬆️' },
    down: { label: t('Closed'), icon: '⬇️' },
    sunProtect: { label: t('Sun protection'), icon: '🕶️' },
    manu_sunProtect: { label: t('Sun protection (manual)'), icon: '🕶️' },
    OpenInSunProtect: { label: t('Window open during sun protection'), icon: '🪟' },
    triggered: { label: t('Window open'), icon: '🪟' },
    Manu_Mode: { label: t('Manual'), icon: '✋' },
    none: { label: t('No status'), icon: '·' },
    wind1: { label: t('Wind alarm 1'), icon: '💨' },
    wind2: { label: t('Wind alarm 2'), icon: '💨' },
    rain: { label: t('Rain alarm'), icon: '🌧️' },
    frost: { label: t('Frost alarm'), icon: '❄️' },
    fire: { label: t('Fire alarm'), icon: '🔥' },
};

export function autoStateInfo(
    val: string | number | boolean | null | undefined,
): { label: string; icon: string } | undefined {
    if (val === null || val === undefined || val === '') {
        return undefined;
    }
    return AUTO_STATE[String(val)] || { label: String(val), icon: '·' };
}

/** Rollladen der Automatik zu einer Kachel (über den Level-State) finden */
export function shutterForDevice(model: SvModel | undefined, stateIds: string[]): SvAutoShutter | undefined {
    for (const sc of model?.shutterControl || []) {
        const s = sc.shutters.find(x => x.level && stateIds.includes(x.level.id));
        if (s) {
            return s;
        }
    }
    return undefined;
}

export function text(states: Record<string, SvStateValue | null>, id: string | undefined): string | undefined {
    const v = id ? states[id]?.val : undefined;
    return v === null || v === undefined || v === '' ? undefined : String(v);
}

/** shuttercontrol liefert Zeiten teils als "07:30", teils als Datum-String → "07:30" */
export function timeText(states: Record<string, SvStateValue | null>, id: string | undefined): string | undefined {
    const t = text(states, id);
    if (!t) {
        return undefined;
    }
    const m = /(\d{1,2}):(\d{2})/.exec(t);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : t;
}
