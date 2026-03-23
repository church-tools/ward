import { booleanAttribute, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { xcomputed } from '../../utils/signal-utils';
import { SelectOption } from './select';

type SelectOptionsByValue<T extends PropertyKey> = Partial<Record<T, SelectOption<T>>>;

@Component({
	selector: 'app-select-result',
	imports: [TranslateModule],
	template: `
		@if (this.selectedOption(); as selectedOption) {
			<span [class]="selectedOption.color ? selectedOption.color + '-text' : ''">
				@if (translateOptions()) {
					{{ selectedOption.view | translate }}
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


