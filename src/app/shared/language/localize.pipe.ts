import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from './language.service';
import { interpolate, LocalizeParameters, resolveLocalizationKey } from './localize-utils';

@Pipe({
	name: 'localize',
	standalone: true,
	pure: false,
})
export class LocalizePipe implements PipeTransform {

	private readonly languageService = inject(LanguageService);

	transform(key: string | null | undefined, params?: LocalizeParameters): string {
		if (!key) return '';
		const localization = this.languageService.localization();
		if (!localization) return key;
		const translated = resolveLocalizationKey(localization, key) ?? key;
		return interpolate(translated, params);
	}
}