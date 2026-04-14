import type { Localization } from "./localization.en";

export type LocalizeParameters = Record<string, unknown> | null;


export function resolveLocalizationKey(localization: Localization, key: string): string | null {
	let current: unknown = localization;
	for (const segment of key.split('.')) {
		if (typeof current !== 'object' || current === null)
			return null;
		const valueBySegment = current as Record<string, unknown>;
		if (!(segment in valueBySegment))
			return null;
		current = valueBySegment[segment];
	}
	return typeof current === 'string' ? current : null;
}

export function interpolate(value: string, params?: LocalizeParameters): string {
	if (!params)
		return value;
	return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, variableName: string) => {
		const key = variableName.trim();
		const parameterValue = params[key];
		return parameterValue == null ? `{{${key}}}` : String(parameterValue);
	});
}