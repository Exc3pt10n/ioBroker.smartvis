import type { SvForecastDay, SvWeather, SvWeatherWarning } from '../../shared/protocol';
import { getName } from '../names';
import { ref, type AdapterProfile, type ObjectMap } from './types';

/** Höchstens so viele Vorhersagetage (heute + 4) */
const MAX_DAYS = 5;

/** Vorhersagetag nur, wenn mindestens Temperatur oder Wetterlage vorhanden ist */
function day(d: SvForecastDay): SvForecastDay | undefined {
    return d.tempMax || d.tempMin || d.conditionText || d.conditionCode ? d : undefined;
}

function days(list: (SvForecastDay | undefined)[]): SvForecastDay[] {
    return list.filter((d): d is SvForecastDay => !!d).slice(0, MAX_DAYS);
}

/**
 * OpenWeatherMap (ioBroker.openweathermap): `forecast.current.*` und `forecast.day0…` (day0 = heute).
 * Symbol als URL ".../img/w/10d.png" (Code steckt im Dateinamen), Text in der eingestellten Sprache.
 */
export const openweathermapProfile: AdapterProfile = {
    adapter: 'openweathermap',
    claimsInstance: true,
    detect(instance, objects) {
        const cur = `${instance}.forecast.current`;
        const temperature = ref(objects, `${cur}.temperature`, 'Temperature');
        if (!temperature) {
            return null;
        }
        const forecast = days(
            Array.from({ length: MAX_DAYS }, (_, i) => {
                const d = `${instance}.forecast.day${i}`;
                return day({
                    offset: i,
                    tempMin: ref(objects, `${d}.temperatureMin`, 'Lowest temperature'),
                    tempMax: ref(objects, `${d}.temperatureMax`, 'Highest temperature'),
                    conditionText: ref(objects, `${d}.title`, 'Conditions'),
                    conditionCode: ref(objects, `${d}.icon`, 'Symbol'),
                    rain: ref(objects, `${d}.precipitation`, 'Precipitation'),
                    windSpeed: ref(objects, `${d}.windSpeed`, 'Wind'),
                });
            }),
        );
        const weather: SvWeather = {
            id: instance,
            name: 'OpenWeatherMap',
            adapter: 'openweathermap',
            source: 'service',
            temperature,
            humidity: ref(objects, `${cur}.humidity`, 'Humidity'),
            windSpeed: ref(objects, `${cur}.windSpeed`, 'Wind'),
            windDirection: ref(objects, `${cur}.windDirection`, 'Wind direction'),
            pressure: ref(objects, `${cur}.pressure`, 'Air pressure'),
            rainToday: ref(objects, `${cur}.precipitation`, 'Precipitation'),
            conditionText: ref(objects, `${cur}.title`, 'Conditions'),
            conditionCode: ref(objects, `${cur}.icon`, 'Symbol'),
            codeScheme: 'owm',
            forecast,
        };
        return { weather: [weather] };
    },
};

/**
 * Weather Underground (ioBroker.weatherunderground): `forecast.current.*` (Messwerte der gewählten Station)
 * und `forecast.<n>d.*` (0d = heute). Symbole sind Codes von The Weather Company (0–47).
 */
export const weatherundergroundProfile: AdapterProfile = {
    adapter: 'weatherunderground',
    claimsInstance: true,
    detect(instance, objects) {
        const cur = `${instance}.forecast.current`;
        const temperature = ref(objects, `${cur}.temp`, 'Temperature');
        const forecast = days(
            Array.from({ length: MAX_DAYS }, (_, i) => {
                const d = `${instance}.forecast.${i}d`;
                return day({
                    offset: i,
                    tempMin: ref(objects, `${d}.tempMin`, 'Lowest temperature'),
                    tempMax: ref(objects, `${d}.tempMax`, 'Highest temperature'),
                    conditionText:
                        ref(objects, `${d}.stateShort`, 'Conditions') ?? ref(objects, `${d}.state`, 'Conditions'),
                    conditionCode: ref(objects, `${d}.icon`, 'Symbol'),
                    rain: ref(objects, `${d}.precipitationAllDay`, 'Precipitation'),
                    rainChance: ref(objects, `${d}.precipitationChance`, 'Chance of rain'),
                    windSpeed: ref(objects, `${d}.windSpeed`, 'Wind'),
                });
            }),
        );
        if (!temperature && !forecast.length) {
            return null;
        }
        const weather: SvWeather = {
            id: instance,
            name: 'Weather Underground',
            adapter: 'weatherunderground',
            source: 'service',
            temperature,
            humidity: ref(objects, `${cur}.relativeHumidity`, 'Humidity'),
            windSpeed: ref(objects, `${cur}.wind`, 'Wind'),
            windDirection: ref(objects, `${cur}.windDegrees`, 'Wind direction'),
            pressure: ref(objects, `${cur}.pressure`, 'Air pressure'),
            rainToday: ref(objects, `${cur}.precipitationDay`, 'Rain today'),
            conditionText: ref(objects, `${cur}.weather`, 'Conditions'),
            conditionCode: ref(objects, `${cur}.iconURL`, 'Symbol'),
            codeScheme: 'twc',
            forecast,
        };
        return { weather: [weather] };
    },
};

/**
 * DasWetter / Meteored (ioBroker.daswetter ab 4.x): je Ort `location_<id>` mit `ForecastDaily.Day_1…5`
 * (Day_1 = heute) und optional `ForecastHourly.Current` bzw. `Hour_1` für die aktuelle Stunde.
 * Symbole sind Meteored-Codes ohne öffentliche Liste – die Wetterlage kommt aus dem Beschreibungstext.
 */
export const daswetterProfile: AdapterProfile = {
    adapter: 'daswetter',
    claimsInstance: true,
    detect(instance, objects, lang) {
        const locations = Object.keys(objects).filter(
            id =>
                objects[id]?.type === 'channel' &&
                new RegExp(`^${instance.replace('.', '\\.')}\\.location_[^.]+$`).test(id),
        );
        const weather: SvWeather[] = [];
        for (const loc of locations) {
            const forecast = days(
                Array.from({ length: MAX_DAYS }, (_, i) => {
                    const d = `${loc}.ForecastDaily.Day_${i + 1}`;
                    return day({
                        offset: i,
                        tempMin: ref(objects, `${d}.Temperature_Min`, 'Lowest temperature'),
                        tempMax: ref(objects, `${d}.Temperature_Max`, 'Highest temperature'),
                        conditionText: ref(objects, `${d}.symbol_description`, 'Conditions'),
                        rain: ref(objects, `${d}.Rain`, 'Precipitation'),
                        rainChance: ref(objects, `${d}.Rain_Probability`, 'Chance of rain'),
                        windSpeed: ref(objects, `${d}.Wind_Speed`, 'Wind'),
                    });
                }),
            );
            const hour = objects[`${loc}.ForecastHourly.Current.temperature`]
                ? `${loc}.ForecastHourly.Current`
                : `${loc}.ForecastHourly.Hour_1`;
            const temperature = ref(objects, `${hour}.temperature`, 'Temperature');
            if (!temperature && !forecast.length) {
                continue;
            }
            weather.push({
                id: loc,
                name: getName(objects[loc], lang)?.replace(/^location_.*/, '') || 'DasWetter',
                adapter: 'daswetter',
                source: 'service',
                temperature,
                humidity: ref(objects, `${hour}.humidity`, 'Humidity'),
                windSpeed: ref(objects, `${hour}.wind_speed`, 'Wind'),
                pressure: ref(objects, `${hour}.pressure`, 'Air pressure'),
                conditionText: ref(objects, `${hour}.symbol_description`, 'Conditions'),
                forecast,
            });
        }
        return weather.length ? { weather } : null;
    },
};

/**
 * Deutscher Wetterdienst (ioBroker.dwd): amtliche Warnungen, je Platz ein Kanal
 * `warning`, `warning1` … (Region) bzw. `warncell.warning…` (Warnzelle). Keine Vorhersage.
 */
export const dwdProfile: AdapterProfile = {
    adapter: 'dwd',
    claimsInstance: true,
    detect(instance, objects: ObjectMap) {
        const pattern = new RegExp(`^${instance.replace('.', '\\.')}\\.(warncell\\.)?warning\\d*$`);
        const warnings: SvWeatherWarning[] = [];
        for (const id of Object.keys(objects).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
            if (!pattern.test(id) || objects[id]?.type !== 'channel') {
                continue;
            }
            const headline = ref(objects, `${id}.headline`, 'Warning');
            if (!headline) {
                continue;
            }
            warnings.push({
                id,
                adapter: 'dwd',
                headline,
                level: ref(objects, `${id}.level`, 'Level'),
                begin: ref(objects, `${id}.begin`, 'Start'),
                end: ref(objects, `${id}.end`, 'End'),
                description: ref(objects, `${id}.description`, 'Description'),
                instruction: ref(objects, `${id}.instruction`, 'Instructions'),
            });
        }
        return warnings.length ? { warnings } : null;
    },
};
