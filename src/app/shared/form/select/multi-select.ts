import { booleanAttribute, Component, input, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { assureArray } from '../../utils/array-utils';
import { xcomputed } from '../../utils/signal-utils';
import { Icon } from '../../icon/icon';
import { getProviders, InputBase } from '../shared/input-base';
import { Select, SelectOption } from './select';

type MultiSelectValue<T> = T | string;

type MultiSelectChip<T> = SelectOption<MultiSelectValue<T>> & {
	isCustom?: boolean;
};

@Component({
	selector: 'app-multi-select',
	imports: [Select, Icon, TranslateModule],
	styleUrls: ['./multi-select.scss'],
	providers: getProviders(() => MultiSelect),
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
			[translateOptions]="translateOptions()"
            withoutValue
			[onGroupClick]="onGroupClick()"
			[mapSearch]="mapSearch()"
			(keydown)="onSelectKeyDown($event)"
			(valueChange)="selectValue($event)">
			<ng-content/>
			@if (selectedOptions().length) {
				<div class="value-container row wrap gap-1">
					@for (option of selectedOptions(); track getOptionTrackId(option)) {
						<div class="value-btn subtle row no-wrap items-center"
							[class.clickable]="!disabled() && onOptionClick()"
							(click)="onOptionClick() ? onOptionClick()!(option, $event) : null">
							<span class="{{option.color}}-text">
								@if (translateOptions() && !isCustomOption(option)) {
									{{ option.view | translate }}
								} @else {
									{{ option.view }}
								}
							</span>
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
export class MultiSelect<T> extends InputBase<MultiSelectValue<T>[], MultiSelectValue<T>[] | string> {

	readonly options = input.required<readonly SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)>();
	readonly onGroupClick = input<(group: { id: string; label: string; color?: string }) => void>();
	readonly mapSearch = input<(search: string) => string>();
	readonly hideClear = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly translateOptions = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly allowCustomText = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly customValueExclusive = input<boolean, unknown>(false, { transform: booleanAttribute });
	readonly parseCustomValue = input<(text: string) => MultiSelectValue<T> | null>();
	readonly isCustomValue = input<(value: MultiSelectValue<T>) => boolean>();
	readonly optionValuesByValue = input<Record<number | string, unknown> | ReadonlyMap<number | string, unknown> | null>(null);
	readonly onOptionClick = input<(option: SelectOption<MultiSelectValue<T>>, event: MouseEvent) => void>();

	private readonly allOptions = signal<SelectOption<T>[]>([]);
	protected readonly select = viewChild.required(Select<T>);

	protected readonly selectedOptions = xcomputed([this.allOptions, this.viewValue], (options, value) => {
		const optionByValue = new Map<T, SelectOption<T>>(options.map(option => [option.value, option]));
		return assureArray(value ?? []).map(item => this.toChip(item, optionByValue));
	});

	protected readonly getOptions = async (search: string) => {
		const options = this.options();
		const loaded = typeof options === 'function' ? await options(search) : options;
		this.mergeOptions(loaded);
		return [...loaded];
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

	protected onSelectKeyDown(event: KeyboardEvent) {
		if (!this.allowCustomText())
			return;
		if (event.defaultPrevented)
			return;
		if (event.key !== 'Enter' && event.key !== ',')
			return;
		const search = this.select().getSearch().trim();
		if (!search)
			return;
		event.preventDefault();
		event.stopPropagation();
		this.addCustomSelection(search);
	}

	protected removeSelection(value: MultiSelectValue<T>, event?: MouseEvent) {
		event?.stopPropagation();
		event?.preventDefault();
		const selected = assureArray(this.viewValue() ?? []).filter(item => item !== value);
		this.setViewValue(selected);
		this.select().focusInput(false);
	}

	protected override async mapIn(value: MultiSelectValue<T>[] | string | null): Promise<MultiSelectValue<T>[]> {
		const normalized = typeof value === 'string'
			? this.parseStringModelValue(value)
			: [...assureArray(value ?? [])];
		if (normalized.length)
			await this.getOptions('');
		return normalized;
	}

	protected override mapOut(value: MultiSelectValue<T>[] | null): MultiSelectValue<T>[] | string | null {
		const normalized = [...assureArray(value ?? [])]
			.map(item => typeof item === 'string' ? item.trim() : item)
			.filter(item => item != null && item !== '');
		const optionValuesByValue = this.optionValuesByValue();
		if (optionValuesByValue) {
			if (!normalized.length)
				return null;
			const customText = normalized.find(item => typeof item === 'string');
			if (typeof customText === 'string')
				return customText;
			return normalized.map(item => String(item)).join(',');
		}
		return normalized;
	}

	protected getOptionTrackId(option: MultiSelectChip<T>) {
		return option.id ?? option.value;
	}

	protected isCustomOption(option: SelectOption<MultiSelectValue<T>>) {
		const isCustomValue = this.isCustomValue();
		if (isCustomValue)
			return isCustomValue(option.value);
		return !this.allOptions().some(item => item.value === option.value);
	}

	private addCustomSelection(search: string) {
		const parsed = this.parseCustomValue()?.(search)
			?? this.defaultParseCustomValue(search);
		if (parsed == null)
			return;
		const selected = assureArray(this.viewValue() ?? []);
		const withRemovedDuplicate = selected.filter(item => item !== parsed);
		const normalized = this.customValueExclusive()
			? []
			: withRemovedDuplicate;
		this.setViewValue([...normalized, parsed]);
		this.select().setSearch('');
	}

	private defaultParseCustomValue(search: string) {
		return search;
	}

	private stringifyCustomValue(value: MultiSelectValue<T>) {
		if (typeof value === 'string')
			return value;
		return String(value ?? '');
	}

	private toChip(item: MultiSelectValue<T>, optionByValue: Map<T, SelectOption<T>>) {
		if (typeof item === 'string')
			return this.createCustomChip(item, item);
		const option = optionByValue.get(item);
		if (option)
			return option as MultiSelectChip<T>;
		return this.createCustomChip(item, this.stringifyCustomValue(item));
	}

	private createCustomChip(value: MultiSelectValue<T>, view: string): MultiSelectChip<T> {
		return {
			value,
			id: this.getCustomOptionId(value),
			view,
			isCustom: true,
		};
	}

	private getCustomOptionId(value: MultiSelectValue<T>) {
		return `custom-${this.stringifyCustomValue(value)}`;
	}

	private parseStringModelValue(value: string): MultiSelectValue<T>[] {
		const normalized = value.trim();
		if (!normalized)
			return [];
		if (!/^\d+(\s*,\s*\d+)*$/.test(normalized))
			return [normalized];
		const parsed = normalized
			.split(',')
			.map(token => Number(token.trim()))
			.filter(token => Number.isInteger(token));
		if (!parsed.length || !parsed.every(token => this.hasKnownOptionValue(token)))
			return [normalized];
		return parsed as MultiSelectValue<T>[];
	}

	private hasKnownOptionValue(value: number): boolean {
		const optionValuesByValue = this.optionValuesByValue();
		if (!optionValuesByValue)
			return false;
		if (optionValuesByValue instanceof Map)
			return optionValuesByValue.has(value) || optionValuesByValue.has(String(value));
		return Object.prototype.hasOwnProperty.call(optionValuesByValue, String(value));
	}

	private mergeOptions(options: readonly SelectOption<T>[]) {
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
