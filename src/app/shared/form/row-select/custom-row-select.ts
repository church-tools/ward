import { booleanAttribute, Component, ElementRef, inject, Injector, input, OutputRefSubscription, signal, viewChild } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import type { Row, Table, TableName, TableQuery } from "@/modules/shared/table.types";
import { SupabaseService } from "../../service/supabase.service";
import { Icon } from "../../icon/icon";
import { wait } from "../../utils/flow-control-utils";
import { createPendingValueTracker, xcomputed, xeffect } from "../../utils/signal-utils";
import ErrorMessage from "../../widget/error-message/error-message";
import { SelectOptions } from "../select/select-options";
import { getProviders, InputBase } from "../shared/input-base";
import InputLabel from "../shared/input-label";
import { getCachedRowViewToString, resolveRowQuery } from "./row-select-utils";

type CustomRowSelectOption = {
    id: string;
    view: string;
    lcView: string;
};

type CustomRowSelectedOption = {
    id: string;
    value: string;
    view: string;
    isCustom?: boolean;
};

@Component({
    selector: 'app-custom-row-select',
    template: `
        <app-input-label/>
        <div class="column" (mousedown)="onInputContainerMouseDown($event)">
            <div #inputContainer class="form-input" [style.anchor-name]="popover.anchorNameCss">
                @if (selectedOptions().length) {
                    <div class="value-container row wrap gap-1">
                        @for (option of selectedOptions(); track option.id) {
                            <div class="value-btn subtle row no-wrap items-center"
                                [class.clickable]="!disabled() && onOptionClick()"
                                (click)="onOptionClick() ? onOptionClick()!(option, $event) : null">
                                <span>{{ option.view }}</span>
                                @if (!disabled() && !hideClear()) {
                                    <button class="delete-btn subtle icon-only tiny" type="button" aria-label="Remove selection"
                                        (click)="removeSelection(option.value, $event)">
                                        <app-icon icon="dismiss" size="xs"/>
                                    </button>
                                }
                            </div>
                        }
                    </div>
                }
                <input #input type="text"
                    [required]="required()"
                    [value]="search()"
                    [disabled]="disabled()"
                    [placeholder]="selectedOptions().length ? '' : placeholder()"
                    [attr.aria-label]="label() || placeholder() || 'Select option'"
                    [attr.title]="label() || placeholder() || 'Select option'"
                    (focus)="onFocus()"
                    (input)="onInput($event)"
                    (keydown)="onKeyDown($event)">
            </div>
            <app-select-options #popover
                [anchorElement]="inputContainer"
                [contentVisible]="optionsVisible()"
                [options]="filteredOptions()"
                [searchText]="search()"
                noMatchesText="NO_MATCHES"
                (optionClick)="selectOption($event)"/>
        </div>
        <app-error-message/>
    `,
    styleUrls: ['../select/select.scss', '../select/multi-select.scss'],
    providers: getProviders(() => CustomRowSelect),
    imports: [TranslateModule, InputLabel, ErrorMessage, SelectOptions, Icon],
})
export class CustomRowSelect<T extends TableName> extends InputBase<string | string[]> {

    private readonly supabase = inject(SupabaseService);
    private readonly injector = inject(Injector);
    private readonly input = viewChild('input', { read: ElementRef<HTMLInputElement> });
    protected readonly popover = viewChild.required(SelectOptions<CustomRowSelectOption>);

    readonly table = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);
    readonly multiple = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly hideClear = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly onOptionClick = input<(option: CustomRowSelectedOption, event: MouseEvent) => void>();

    private readonly _table = xcomputed([this.table], t => this.supabase.sync.from(t));
    private readonly optionList = signal<CustomRowSelectOption[]>([]);
    protected readonly filteredOptions = signal<CustomRowSelectOption[]>([]);
    protected readonly search = signal<string>('');
    protected readonly optionsVisible = xcomputed([this.filteredOptions, this.search],
        (options, search) => options.length > 0 || !!search.trim());
    protected readonly selectedValues = xcomputed([this.viewValue, this.multiple], (value, multiple) => {
        const normalized = this.normalizeModelValue(value, multiple);
        return Array.isArray(normalized)
            ? normalized
            : (normalized ? [normalized] : []);
    });
    protected readonly selectedOptions = xcomputed([this.selectedValues, this.optionList, this.multiple],
        (values, options, multiple) => {
        const optionById = new Map(options.map(option => [option.id, option]));
        return values
            .map(value => this.buildSelectedOption(value, optionById, multiple))
            .filter((option): option is CustomRowSelectedOption => option !== null);
    });

    private readonly typing = signal(false);
    private typingResetTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly typingSyncDelayMs = 250;
    private readonly optionCleanupDelayMs = 100;
    private readonly pendingValueTracker = createPendingValueTracker<string | string[] | null>(150);
    // Preserve a recently typed numeric token to avoid immediately resolving it as an option id during model sync.
    private locallyTypedRawNumericValue: string | null = null;
    private locallyTypedRawNumericValueExpiresAt = 0;
    private readonly locallyTypedRawNumericValueTtlMs = 10000;

    private readonly viewToStringCache: { value: ((row: Row<T>) => string) | null } = { value: null };
    private readonly blurSubscription: OutputRefSubscription;

    constructor() {
        super();
        xeffect([this.table, this.getQuery], () => {
            this.optionList.set([]);
            this.filteredOptions.set([]);
            this.viewToStringCache.value = null;
        });
        xeffect([this.viewValue], value => {
            if (this.shouldIgnoreModelSync(value))
                return;
            if (this.multiple()) {
                if (!this.typing())
                    this.search.set('');
                return;
            }
            if (typeof value === 'string' && /^\d+$/.test(value) && this.optionList().length === 0) {
                void this.loadOptions();
                return;
            }
            this.syncSearchFromViewValue(typeof value === 'string' ? value : null);
        });
        this.blurSubscription = this.onBlur.subscribe(async () => {
            this.markTypingInactive();
            this.pendingValueTracker.clear();
            await wait(150);
            this.closeOptionsContainer();
        });
    }

    ngOnDestroy() {
        this.clearTypingResetTimeout();
        this.blurSubscription.unsubscribe();
        this.closeOptionsContainer();
    }

    protected async onFocus() {
        if (this.disabled())
            return;
        this.openOptionsContainer();
        await this.updateVisibleOptions();
    }

    protected onInput(event: Event) {
        const target = event.target as HTMLInputElement;
        const rawValue = target.value ?? '';
        const normalized = this.normalizeInput(rawValue);
        this.markTypingActive();
        this.markLocallyTypedRawNumericValue(normalized);
        this.search.set(rawValue);
        if (!this.multiple()) {
            this.setViewValue(normalized);
            this.markPendingValue(normalized);
        }
        this.updateVisibleOptions();
    }

    protected onKeyDown(event: KeyboardEvent) {
        const handled = this.popover().handleKeyDown(event);
        if (handled)
            return;
        if (!this.multiple())
            return;
        if ((event.key === 'Enter' || event.key === ',') && this.search().trim()) {
            event.preventDefault();
            event.stopPropagation();
            this.addCustomSelection(this.search());
            return;
        }
        if (event.key === 'Backspace' && !this.search().trim()) {
            const selected = this.selectedValues();
            const last = selected[selected.length - 1];
            if (last)
                this.removeSelection(last, event as unknown as MouseEvent);
        }
    }

    protected onInputContainerMouseDown(event: MouseEvent) {
        if (this.disabled())
            return;
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, textarea, select, [role="button"]'))
            return;
        event.preventDefault();
        this.input()?.nativeElement.focus();
    }

    protected selectOption(option: CustomRowSelectOption) {
        this.markTypingInactive();
        this.clearLocallyTypedRawNumericValue();
        if (this.multiple()) {
            const selected = this.selectedValues();
            const exists = selected.includes(option.id);
            const updated = exists
                ? selected.filter(value => value !== option.id)
                : [...selected, option.id];
            this.search.set('');
            this.setViewValue(updated);
            this.markPendingValue(updated);
            this.updateVisibleOptions();
            return;
        }
        this.search.set('');
        this.setViewValue(option.id);
        this.markPendingValue(option.id);
        this.closeOptionsContainer();
    }

    protected removeSelection(value: string, event?: MouseEvent) {
        event?.stopPropagation();
        event?.preventDefault();
        if (!this.multiple()) {
            this.search.set('');
            this.setViewValue(null);
            this.markPendingValue(null);
            this.input()?.nativeElement.focus();
            return;
        }
        const selected = this.selectedValues().filter(item => item !== value);
        this.setViewValue(selected);
        this.markPendingValue(selected);
        this.input()?.nativeElement.focus();
    }

    private openOptionsContainer() {
        if (this.popover().isRequested()) return;
        this.popover().open();
    }

    private closeOptionsContainer() {
        if (!this.popover().isRequested()) return;
        this.popover().close();
        setTimeout(() => {
            if (this.popover().isRequested()) return;
            this.filteredOptions.set([]);
        }, this.optionCleanupDelayMs);
    }

    private async updateVisibleOptions() {
        await this.loadOptions();
        this.filteredOptions.set(this.filterOptions(this.search(), this.optionList()));
    }

    private async loadOptions() {
        if (this.optionList().length)
            return;
        const query = resolveRowQuery(this._table(), this.getQuery());
        const rows = await query.get();
        const options = await this.mapRowsToOptions(rows);
        this.optionList.set(options);
        this.filteredOptions.set(options);
        const viewValue = this.viewValue();
        if (!this.shouldIgnoreModelSync(viewValue))
            this.syncSearchFromViewValue(typeof viewValue === 'string' ? viewValue : null);
    }

    protected override mapIn(value: string | string[] | null): string | string[] | null {
        return this.normalizeModelValue(value, this.multiple());
    }

    protected override mapOut(value: string | string[] | null): string | string[] | null {
        return this.normalizeModelValue(value, this.multiple());
    }

    private normalizeModelValue(value: string | string[] | null | undefined, multiple: boolean): string | string[] | null {
        if (multiple) {
            const values = Array.isArray(value)
                ? value
                : (value ? [value] : []);
            const unique = new Set<string>();
            for (const item of values) {
                const normalized = this.normalizeInput(item);
                if (!normalized)
                    continue;
                unique.add(normalized);
            }
            return [...unique];
        }
        if (Array.isArray(value))
            return this.normalizeInput(value[0]);
        return this.normalizeInput(value);
    }

    private normalizeInput(value: string | null | undefined): string | null {
        const normalized = value?.trim() ?? '';
        return normalized || null;
    }

    private syncSearchFromViewValue(value: string | null) {
        const currentSearch = this.normalizeInput(this.search());
        if (this.typing() && currentSearch !== value)
            return;
        const valueIsNumeric = this.isNumericToken(value);
        const hasLocalTypedNumeric = this.isLocallyTypedRawNumericValue(value);
        const valueMatchesKnownOption = !!this.findOptionById(value);
        const shouldResolveById = !!value && (
            (valueIsNumeric && !hasLocalTypedNumeric)
            || valueMatchesKnownOption
        );
        const match = shouldResolveById ? this.findOptionById(value) : null;
        if (match) {
            this.search.set('');
            return;
        }
        this.search.set(value ?? '');
    }

    private markTypingActive() {
        this.typing.set(true);
        this.clearTypingResetTimeout();
        this.typingResetTimeout = setTimeout(() => {
            this.typing.set(false);
            const viewValue = this.viewValue();
            if (!this.shouldIgnoreModelSync(viewValue))
                this.syncSearchFromViewValue(typeof viewValue === 'string' ? viewValue : null);
            this.typingResetTimeout = null;
        }, this.typingSyncDelayMs);
    }

    private markTypingInactive() {
        this.clearTypingResetTimeout();
        this.typing.set(false);
    }

    private clearTypingResetTimeout() {
        clearTimeout(this.typingResetTimeout ?? undefined);
        this.typingResetTimeout = null;
    }

    private async mapRowsToOptions(rows: Row<T>[]) {
        const toString = await getCachedRowViewToString(this.viewToStringCache, this.injector, this.table());
        const getId = this._table().getId;
        const uniqueById = new Map<string, CustomRowSelectOption>();
        for (const row of rows) {
            const view = toString(row)?.trim();
            if (!view)
                continue;
            const id = String(getId(row));
            uniqueById.set(id, { id, view, lcView: view.toLocaleLowerCase() });
        }
        return [...uniqueById.values()].sort((a, b) => a.view.localeCompare(b.view));
    }

    private markPendingValue(value: string | string[] | null) {
        this.pendingValueTracker.mark(value);
    }

    private shouldIgnoreModelSync(value: string | string[] | null) {
        return this.pendingValueTracker.shouldIgnore(value);
    }

    private markLocallyTypedRawNumericValue(value: string | null) {
        if (!this.isNumericToken(value)) {
            this.clearLocallyTypedRawNumericValue();
            return;
        }
        this.locallyTypedRawNumericValue = value;
        this.locallyTypedRawNumericValueExpiresAt = Date.now() + this.locallyTypedRawNumericValueTtlMs;
    }

    private clearLocallyTypedRawNumericValue() {
        this.locallyTypedRawNumericValue = null;
        this.locallyTypedRawNumericValueExpiresAt = 0;
    }

    private isLocallyTypedRawNumericValue(value: string | null) {
        if (!value || !this.locallyTypedRawNumericValue)
            return false;
        if (Date.now() > this.locallyTypedRawNumericValueExpiresAt) {
            this.clearLocallyTypedRawNumericValue();
            return false;
        }
        return value === this.locallyTypedRawNumericValue;
    }

    private addCustomSelection(rawValue: string) {
        const customValue = this.normalizeInput(rawValue);
        if (!customValue)
            return;
        const selected = this.selectedValues().filter(item => item !== customValue);
        const withoutCustom = selected.filter(item => this.optionList().some(option => option.id === item));
        const updated = [...withoutCustom, customValue];
        this.search.set('');
        this.setViewValue(updated);
        this.markPendingValue(updated);
        this.updateVisibleOptions();
    }

    private buildSelectedOption(
        value: string,
        optionById: Map<string, CustomRowSelectOption>,
        multiple: boolean,
    ): CustomRowSelectedOption | null {
        const option = optionById.get(value);
        if (option)
            return { id: option.id, value: option.id, view: option.view };
        if (!multiple)
            return null;
        return { id: `custom-${value}`, value, view: value, isCustom: true };
    }

    private filterOptions(searchInput: string, options: CustomRowSelectOption[]) {
        const search = searchInput.trim().toLocaleLowerCase();
        if (!search)
            return options;
        const startsWith = options.filter(option => option.lcView.startsWith(search));
        const contains = options.filter(option => !option.lcView.startsWith(search) && option.lcView.includes(search));
        return [...startsWith, ...contains];
    }

    private findOptionById(value: string | null) {
        if (!value)
            return null;
        return this.optionList().find(option => option.id === value) ?? null;
    }

    private isNumericToken(value: string | null | undefined) {
        return !!value && /^\d+$/.test(value);
    }
}
