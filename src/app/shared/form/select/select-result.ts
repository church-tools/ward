import { LocalizePipe } from '@/shared/language/localize.pipe';
import { booleanAttribute, Component, input } from '@angular/core';
import { xcomputed } from '../../utils/signal-utils';
import type { SelectOption } from './select-utils';

type SelectOptionsByValue<T extends PropertyKey> = Partial<Record<T, SelectOption<T>>>;

@Component({
	selector: 'app-select-result',
	imports: [LocalizePipe],
	template: `
		@if (this.selectedOption(); as selectedOption) {
			<span [class]="selectedOption.color ? selectedOption.color + '-text' : ''">
				@if (translateOptions()) {
					{{ selectedOption.view | localize }}
				} @else {
					{{ selectedOption.view }}
				}
			</span>
		}
	`,
})
export class SelectResult<T> {

	readonly optionsByValue = input.required<SelectOptionsByValue<T & PropertyKey>>();
	readonly value = input.required<T | null>();
	readonly translateOptions = input<boolean, unknown>(false, { transform: booleanAttribute });

	protected readonly selectedOption = xcomputed([this.optionsByValue, this.value],
        (optionsByValue, value) => value ? optionsByValue[value as T & PropertyKey] : null);
}


