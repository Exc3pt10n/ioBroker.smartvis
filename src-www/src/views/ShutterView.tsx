import { t, tn } from '../../../src/shared/i18n';
import { createContext, useContext, useState } from 'react';
import { useCardColumns } from '../media';
import type { SvAutoShutter, SvShutterControl } from '../../../src/shared/protocol';
import { ActionButton, Toggle } from '../components/Toggle';
import { CustomSections, type SectionDef } from '../components/CustomSections';
import { EditBanner, EditButton } from '../components/EditButton';
import { connection, useConnection } from '../connection';
import { autoStateInfo, text, timeText } from '../shutters';

/** Eingeklappte Bereiche (für diese Sitzung) */
const collapsedAreas = new Set<string>();

/** Filter "Nur abweichende" (geschlossen, Sonnenschutz oder Automatik aus) – für die Sitzung gemerkt */
let deviatingOnly = false;
const DeviatingContext = createContext(false);

/** Weicht der Rollladen vom Normalfall ab (nicht ganz offen oder eine Automatik ausgeschaltet)? */
function isDeviating(s: SvAutoShutter, states: Record<string, { val: unknown } | null>): boolean {
    const level = s.level ? Number(states[s.level.id]?.val) : NaN;
    const autoOff = [s.autoUp, s.autoDown, s.autoSun].some(r => r && states[r.id]?.val === false);
    return (Number.isFinite(level) && level < 95) || autoOff;
}

export function ShutterView(): React.JSX.Element {
    const { model } = useConnection();
    const columns = useCardColumns();
    const [onlyDeviating, setOnlyDeviating] = useState(deviatingOnly);
    if (!model) {
        return <p className="empty">{t('Loading …')}</p>;
    }
    if (!model.shutterControl.length) {
        return (
            <>
                <h1 className="title">{t('Shading')}</h1>
                <p className="empty">{t('No blind automation (shuttercontrol) found.')}</p>
            </>
        );
    }
    return (
        <>
            <div className="titlebar titlebar--split">
                <h1 className="title">{t('Shading')}</h1>
                <EditButton />
            </div>
            <EditBanner text={t('Drag sections by the handle ⠿ or sort them with ↑ ↓, and hide or show them')} />
            <div
                className="segmented shutter-filter"
                role="radiogroup"
                aria-label={t('Show blinds')}
            >
                {[
                    { value: false, label: t('All') },
                    { value: true, label: t('Only deviating') },
                ].map(o => (
                    <button
                        key={o.label}
                        type="button"
                        role="radio"
                        aria-checked={onlyDeviating === o.value}
                        className={onlyDeviating === o.value ? 'segmented--active' : ''}
                        onClick={() => {
                            deviatingOnly = o.value;
                            setOnlyDeviating(o.value);
                        }}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
            <DeviatingContext.Provider value={onlyDeviating}>
                <CustomSections
                    view="shutters"
                    columns={columns}
                    className="csecs csecs--cols"
                    sections={model.shutterControl.flatMap(sc => shutterSections(sc, model.shutterControl.length > 1))}
                />
            </DeviatingContext.Provider>
        </>
    );
}

/** Bereiche einer Rollladen-Automatik: Steuerung, Sonne, je Bereich eine Karte, weitere Rollläden */
function shutterSections(sc: SvShutterControl, multi: boolean): SectionDef[] {
    const p = multi ? `${sc.id}:` : '';
    const sections: SectionDef[] = [
        { key: `${p}controls`, label: t('All blinds'), node: <ControlsCard sc={sc} /> },
        { key: `${p}sun`, label: t('Sun'), node: <SunCard sc={sc} /> },
        ...sc.areas.map(area => ({
            key: `${p}area-${area.key}`,
            label: area.label,
            node: (
                <AreaCard
                    sc={sc}
                    area={area}
                />
            ),
        })),
    ];
    if (sc.shutters.some(s => !s.area)) {
        sections.push({ key: `${p}other`, label: t('Other'), node: <OtherCard sc={sc} /> });
    }
    return sections;
}

function ControlsCard({ sc }: { sc: SvShutterControl }): React.JSX.Element {
    return (
        <section className="card">
            <div className="actions">
                <ActionButton
                    state={sc.openAll}
                    label={t('Open all')}
                    icon="up"
                />
                <ActionButton
                    state={sc.closeAll}
                    label={t('Close all')}
                    icon="down"
                />
                <ActionButton
                    state={sc.sunProtectAll}
                    label={t('Sun protection')}
                    icon="sunProtect"
                />
                <ActionButton
                    state={sc.autoAll}
                    label={t('All to automation')}
                    icon="auto"
                    variant="primary"
                />
            </div>
            {sc.holiday && (
                <Toggle
                    state={sc.holiday}
                    label={t('Holiday / weekend times')}
                    hint={t('Moves at the weekend times')}
                />
            )}
            {sc.schoolfree && (
                <Toggle
                    state={sc.schoolfree}
                    label={t('School holiday')}
                    hint={t('Children area opens at the weekend times')}
                />
            )}
        </section>
    );
}

function SunCard({ sc }: { sc: SvShutterControl }): React.JSX.Element {
    const { states } = useConnection();
    const elevation = Number(text(states, sc.sun.elevation?.id));
    const azimuth = Number(text(states, sc.sun.azimuth?.id));
    return (
        <section className="card">
            <h2 className="subtitle">{t('Sun')}</h2>
            <dl className="sun">
                <div>
                    <dt>{t('Sunrise')}</dt>
                    <dd>{timeText(states, sc.sun.sunrise?.id) ?? '–'}</dd>
                </div>
                <div>
                    <dt>{t('Sunset')}</dt>
                    <dd>{timeText(states, sc.sun.sunset?.id) ?? '–'}</dd>
                </div>
                <div>
                    <dt>{t('Elevation')}</dt>
                    <dd>{Number.isFinite(elevation) ? `${Math.round(elevation)}°` : '–'}</dd>
                </div>
                <div>
                    <dt>{t('Direction')}</dt>
                    <dd>{Number.isFinite(azimuth) ? `${Math.round(azimuth)}°` : '–'}</dd>
                </div>
            </dl>
        </section>
    );
}

function AreaCard({ sc, area }: { sc: SvShutterControl; area: SvShutterControl['areas'][number] }): React.JSX.Element {
    const { states } = useConnection();
    const shutters = sc.shutters.filter(s => s.area === area.key);
    const memoryKey = `${sc.id}:${area.key}`;
    const [open, setOpen] = useState(!collapsedAreas.has(memoryKey));
    const toggle = (): void => {
        if (open) {
            collapsedAreas.add(memoryKey);
        } else {
            collapsedAreas.delete(memoryKey);
        }
        setOpen(!open);
    };
    const closed = shutters.filter(s => {
        const level = s.level ? Number(states[s.level.id]?.val) : NaN;
        return Number.isFinite(level) && level < 95;
    }).length;
    return (
        <section className="card">
            <h2 className="area__heading">
                <button
                    type="button"
                    className="area__head"
                    aria-expanded={open}
                    onClick={toggle}
                >
                    <span className="area__title">
                        <span className="subtitle">{area.label}</span>
                        <span className="area__summary">
                            {tn(shutters.length, '{n} blind', '{n} blinds')}
                            {closed ? ` · ${t('{n} closed', { n: closed })}` : ''}
                        </span>
                    </span>
                    <span className="area__times">
                        ⬆️ {timeText(states, area.upTime?.id) ?? '–'} · ⬇️ {timeText(states, area.downTime?.id) ?? '–'}
                    </span>
                    <span
                        className="chevron"
                        aria-hidden="true"
                    />
                </button>
            </h2>
            {area.auto && (
                <Toggle
                    state={area.auto}
                    label={t('Automation')}
                />
            )}
            <div className="actions actions--small">
                <ActionButton
                    state={area.open}
                    label={t('Open')}
                    icon="up"
                />
                <ActionButton
                    state={area.close}
                    label={t('Close')}
                    icon="down"
                />
                <ActionButton
                    state={area.sunProtect}
                    label={t('Sun protection')}
                    icon="sunProtect"
                />
            </div>
            {open && <ShutterList shutters={shutters} />}
        </section>
    );
}

/**
 * Rollläden mit Fahrtasten. Die Automatik-Schalter je Rollladen (Auf/Ab/Sonne) sind selten
 * nötig und deshalb eingeklappt; ausgeschaltete Automatiken stehen als Hinweis am Rollladen.
 */
function ShutterList({ shutters: all }: { shutters: SvAutoShutter[] }): React.JSX.Element {
    const { states } = useConnection();
    const onlyDeviating = useContext(DeviatingContext);
    const [flags, setFlags] = useState(false);
    const shutters = onlyDeviating ? all.filter(s => isDeviating(s, states)) : all;
    const hasFlags = shutters.some(s => s.autoUp || s.autoDown || s.autoSun);
    if (!shutters.length) {
        return <p className="detail__note shutter-list__empty">{t('All open, automation on everywhere.')}</p>;
    }
    return (
        <>
            <ul className="shutter-list">
                {shutters.map(s => (
                    <ShutterRow
                        key={s.name}
                        shutter={s}
                        showFlags={flags}
                    />
                ))}
            </ul>
            {hasFlags && (
                <button
                    type="button"
                    className="linkbtn shutter-list__flags"
                    aria-expanded={flags}
                    onClick={() => setFlags(!flags)}
                >
                    {flags ? t('Done') : t('Adjust automation per blind')}
                </button>
            )}
        </>
    );
}

function OtherCard({ sc }: { sc: SvShutterControl }): React.JSX.Element {
    return (
        <section className="card">
            <h2 className="subtitle">{t('Other')}</h2>
            <ShutterList shutters={sc.shutters.filter(s => !s.area)} />
        </section>
    );
}

function ShutterRow({ shutter, showFlags }: { shutter: SvAutoShutter; showFlags: boolean }): React.JSX.Element {
    const { states } = useConnection();
    const level = shutter.level ? Number(states[shutter.level.id]?.val) : NaN;
    const info = autoStateInfo(shutter.autoState ? states[shutter.autoState.id]?.val : undefined);
    const flags: { ref: typeof shutter.autoUp; label: string }[] = [
        { ref: shutter.autoUp, label: t('Up') },
        { ref: shutter.autoDown, label: t('Down') },
        { ref: shutter.autoSun, label: t('Sun') },
    ];
    // Ausgeschaltete Automatiken als Hinweis (Abweichung vom Normalfall)
    const off = flags.filter(f => f.ref && states[f.ref.id]?.val === false).map(f => f.label);

    return (
        <li className={`shutter${shutter.enabled ? '' : ' shutter--disabled'}`}>
            <div className="shutter__main">
                <div className="shutter__name">{shutter.name}</div>
                <div className="shutter__meta">
                    {Number.isFinite(level) ? `${Math.round(level)} %` : '–'}
                    {info ? ` · ${info.icon} ${info.label}` : ''}
                    {!showFlags && off.length > 0 && (
                        <span className="shutter__off">
                            {' '}
                            · {t('without automation')} {off.join('/')}
                        </span>
                    )}
                </div>
                {showFlags && (
                    <div className="chips chips--small">
                        {flags.map(
                            f =>
                                f.ref && (
                                    <button
                                        key={f.label}
                                        type="button"
                                        role="switch"
                                        aria-checked={states[f.ref.id]?.val === true}
                                        className={`flag${states[f.ref.id]?.val === true ? ' flag--on' : ''}`}
                                        title={`${t('Automation')} ${f.label}`}
                                        onClick={() =>
                                            connection.setState(f.ref!.id, !(states[f.ref!.id]?.val === true))
                                        }
                                    >
                                        {f.label}
                                    </button>
                                ),
                        )}
                    </div>
                )}
            </div>
            {shutter.level?.write && (
                <div className="shutter__drive">
                    <button
                        type="button"
                        className="iconbtn"
                        aria-label={t('Open {name}', { name: shutter.name })}
                        onClick={() => connection.setState(shutter.level!.id, shutter.heightUp)}
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        className="iconbtn"
                        aria-label={t('Close {name}', { name: shutter.name })}
                        onClick={() => connection.setState(shutter.level!.id, shutter.heightDown)}
                    >
                        ▼
                    </button>
                </div>
            )}
        </li>
    );
}
