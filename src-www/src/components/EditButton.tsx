import { t } from '../../../src/shared/i18n';
import { useState } from 'react';
import { useConnection } from '../connection';
import { useEditing } from '../editing';
import { Icon } from './Icon';

/** Bearbeiten/Fertig-Knopf für Titelzeilen (nur sichtbar, wenn der Adapter es erlaubt) */
export function EditButton(): React.JSX.Element | null {
    const { model } = useConnection();
    const { editing, setEditing } = useEditing();
    if (!model?.editable) {
        return null;
    }
    return (
        // Selten gebraucht: im Alltag nur ein dezentes Stift-Symbol, im Bearbeiten-Modus deutlich "Fertig"
        <button
            type="button"
            className={`editbtn${editing ? ' editbtn--active' : ' editbtn--icon'}`}
            onClick={() => setEditing(!editing)}
            aria-pressed={editing}
            aria-label={editing ? undefined : t('Edit')}
            title={editing ? undefined : t('Arrange, rename, hide')}
        >
            {editing ? (
                t('Done')
            ) : (
                <Icon
                    name="edit"
                    size={20}
                />
            )}
        </button>
    );
}

const TIP_KEY = 'smartvis.tip.edit';

function tipSeen(): boolean {
    try {
        return localStorage.getItem(TIP_KEY) === '1';
    } catch {
        return true;
    }
}

/**
 * Einmaliger Tipp unter der Titelzeile (Startseite): Das Stift-Symbol ist leicht zu übersehen.
 * Verschwindet mit ✕ oder sobald der Bearbeiten-Modus einmal geöffnet wurde (im Browser gemerkt).
 */
export function EditTip(): React.JSX.Element | null {
    const { model } = useConnection();
    const { editing } = useEditing();
    const [seen, setSeen] = useState(tipSeen);
    const dismiss = (): void => {
        try {
            localStorage.setItem(TIP_KEY, '1');
        } catch {
            // ohne Speicher: nur für diese Sitzung ausblenden
        }
        setSeen(true);
    };
    if (editing && !seen) {
        dismiss();
    }
    if (seen || editing || !model?.editable) {
        return null;
    }
    return (
        <div
            className="edittip"
            role="note"
        >
            <span>
                {t('Tip: With')}{' '}
                <Icon
                    name="edit"
                    size={14}
                />{' '}
                {t('at the top right you arrange sections, hide them and rename devices and rooms.')}
            </span>
            <button
                type="button"
                className="iconbtn edittip__close"
                aria-label={t('Hide tip')}
                onClick={dismiss}
            >
                ✕
            </button>
        </div>
    );
}

/** Hinweisleiste im Bearbeiten-Modus */
export function EditBanner({ text }: { text: string }): React.JSX.Element | null {
    const { editing } = useEditing();
    const { lastError } = useConnection();
    if (!editing) {
        return null;
    }
    return (
        <div
            className="editbanner"
            role="status"
        >
            {lastError ? `⚠️ ${lastError}` : text}
        </div>
    );
}

/** Pfeil-Knöpfe zum Verschieben (Kacheln, Räume) */
export function MoveButtons({
    label,
    onMove,
    canBack,
    canForward,
}: {
    label: string;
    onMove: (delta: -1 | 1) => void;
    canBack: boolean;
    canForward: boolean;
}): React.JSX.Element {
    return (
        <div className="movebtns">
            <button
                type="button"
                aria-label={t('Move {name} forward', { name: label })}
                disabled={!canBack}
                onClick={() => onMove(-1)}
            >
                ←
            </button>
            <button
                type="button"
                aria-label={t('Move {name} back', { name: label })}
                disabled={!canForward}
                onClick={() => onMove(1)}
            >
                →
            </button>
        </div>
    );
}
