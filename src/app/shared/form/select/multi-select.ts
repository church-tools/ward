import { booleanAttribute, Component, input, signal, viewChild } from '@angular/core';
import { assureArray } from '../../utils/array-utils';
import { xcomputed } from '../../utils/signal-utils';
import { IconComponent } from '../../icon/icon';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import { SelectComponent, SelectOption } from './select';

@Component({
	selector: 'app-multi-select',
	imports: [SelectComponent, IconComponent],
	providers: getProviders(() => MultiSelectComponent),
	template: `
		<app-select #select
			[options]="getOptions"
			[value]="null"
			[label]="label()"
			[labelIcon]="labelIcon()"
			[info]="info()"
			[placeholder]="selectedOptions().length ? '' : placeholder()"
			[required]="required()"
			[hideRequiredIndicator]="hideRequiredIndicator()"
			[subtle]="subtle()"
			[disabled]="disabled()"
			[hideClear]="hideClear()"
            withoutValue
			[onGroupClick]="onGroupClick()"
			[mapSearch]="mapSearch()"
			(valueChange)="selectValue($event)">
			<ng-content/>
			@if (selectedOptions().length) {
				<div class="value-container row wrap gap-1">
					@for (option of selectedOptions(); track (option.id ?? option.value)) {
						<div class="value-btn subtle row no-wrap items-center">
							<span class="{{option.color}}-text">{{ option.view }}</span>
							@if (!disabled() && !hideClear()) {
								<button class="delete-btn subtle icon-only tiny" type="button" aria-label="Remove selection" (click)="removeSelection(option.value, $event)">
									<app-icon icon="dismiss" size="xs"/>
								</button>
							}
						</div>
					}
				</div>
			}
		</app-select>
	`,
})
export class MultiSelectComponent<T> extends InputBaseComponent<T[]> {

	readonly options = input.required<SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)>();
	readonly onGroupClick = input<(group: { id: string; label: string; color?: string }) => void>();
	readonly mapSearch = input<(search: string) => string>();
	readonly hideClear = input<boolean, unknown>(false, { transform: booleanAttribute });

	private readonly allOptions = signal<SelectOption<T>[]>([]);
	protected readonly select = viewChild.required(SelectComponent<T>);

	protected readonly selectedOptions = xcomputed([this.allOptions, this.viewValue], (options, value) => {
		const selected = new Set(assureArray(value ?? []));
		return options.filter(option => selected.has(option.value));
	});

	protected readonly getOptions = async (search: string) => {
		const options = this.options();
		const loaded = Array.isArray(options) ? options : await options(search);
		this.mergeOptions(loaded);
		return loaded;
	}

	protected selectValue(value: T | null) {
		if (value == null)
			return;
		const selected = assureArray(this.viewValue() ?? []);
		const index = selected.indexOf(value);
		const updated = index >= 0
			? selected.filter(item => item !== value)
			: [...selected, value];
		this.setViewValue(updated);
	}

	protected removeSelection(value: T, event?: MouseEvent) {
		event?.stopPropagation();
		event?.preventDefault();
		const selected = assureArray(this.viewValue() ?? []).filter(item => item !== value);
		this.setViewValue(selected);
		this.select().focusInput(false);
	}

	protected override async mapIn(value: T[] | null): Promise<T[]> {
		const normalized = [...assureArray(value ?? [])];
		if (normalized.length)
			await this.getOptions('');
		return normalized;
	}

	protected override mapOut(value: T[] | null): T[] {
		return [...assureArray(value ?? [])];
	}

	private mergeOptions(options: SelectOption<T>[]) {
		const current = this.allOptions();
		const known = new Set(current.map(option => option.value));
		const merged = [
			...current,
			...options.filter(option => {
				if (known.has(option.value))
					return false;
				known.add(option.value);
				return true;
			})
		];
		this.allOptions.set(merged);
	}
}
