import { Icon } from './Icon';

export interface StatusRow {
    key: string;
    /** Symbol aus dem Icon-Set (z. B. "light", "window") */
    icon: string;
    /** Farbe des Symbols: aktiv (gelb), Warnung (rot) oder neutral */
    tone?: 'active' | 'warn' | 'neutral';
    name: string;
    /** Kurzinfo hinter dem Namen ("5 an", "offen · Küche") */
    detail?: string;
    /** Antippen der Zeile (Raum oder Detailansicht öffnen) */
    onOpen?: () => void;
    /** Schnellaktion rechts ("Aus", "Pause") */
    action?: { label: string; ariaLabel: string; onClick: () => void };
}

/**
 * Status-Karte der Startseite: Überschrift mit Anzahl und optionaler Sammelaktion ("Alle aus"),
 * darunter eine Zeile je Raum bzw. Gerät – kompakt statt Kacheln oder Namenslisten.
 */
export function StatusCard({
    id,
    title,
    action,
    rows,
    children,
}: {
    id: string;
    title: string;
    action?: { label: string; onClick: () => void };
    rows?: StatusRow[];
    /** Eigener Inhalt statt Zeilen (z. B. Batterieliste) */
    children?: React.ReactNode;
}): React.JSX.Element {
    return (
        <section
            id={id}
            className="card slist"
            aria-labelledby={`${id}-title`}
        >
            <div className="slist__head">
                <h2
                    id={`${id}-title`}
                    className="subtitle"
                >
                    {title}
                </h2>
                {action && (
                    <button
                        type="button"
                        className="pillbtn"
                        onClick={action.onClick}
                    >
                        {action.label}
                    </button>
                )}
            </div>
            {rows && (
                <ul className="slist__rows">
                    {rows.map(r => {
                        const content = (
                            <>
                                <span
                                    className={`slist__icon slist__icon--${r.tone ?? 'active'}`}
                                    aria-hidden="true"
                                >
                                    <Icon
                                        name={r.icon}
                                        size={18}
                                    />
                                </span>
                                <span className="slist__text">
                                    <span className="slist__name">{r.name}</span>
                                    {r.detail && <span className="slist__detail">{r.detail}</span>}
                                </span>
                            </>
                        );
                        return (
                            <li
                                key={r.key}
                                className="slist__row"
                            >
                                {r.onOpen ? (
                                    <button
                                        type="button"
                                        className="slist__link"
                                        onClick={r.onOpen}
                                    >
                                        {content}
                                    </button>
                                ) : (
                                    <div className="slist__link">{content}</div>
                                )}
                                {r.action && (
                                    <button
                                        type="button"
                                        className="slist__action"
                                        aria-label={r.action.ariaLabel}
                                        onClick={r.action.onClick}
                                    >
                                        {r.action.label}
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {children}
        </section>
    );
}
