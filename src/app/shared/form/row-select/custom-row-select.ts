import { Component, ElementRef, inject, Injector, input, OutputRefSubscription, signal, viewChild } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import type { Row, Table, TableName, TableQuery } from "../../../modules/shared/table.types";
import { SupabaseService } from "../../service/supabase.service";
import { wait } from "../../utils/flow-control-utils";
import { createPendingValueTracker, xcomputed, xeffect } from "../../utils/signal-utils";
import ErrorMessage from "../../widget/error-message/error-message";
import { SelectOptions } from "../select/select-options";
import { getProviders, InputBase } from "../shared/input-base";
import InputLabel from "../shared/input-label";
import { getRowViewToString, resolveRowQuery } from "./row-select-utils";

type CustomRowSelectOption = {
    id: string;
    view: string;
    lcView: string;
};

@Component({
    selector: 'app-custom-row-select',
    template: `
        <app-input-label/>
        <div class="column" (mousedown)="onInputContainerMouseDown($event)">
            <div #inputContainer class="form-input" [style.anchor-name]="popover.anchorNameCss">
                <input #input type="text"
                    [required]="required()"
                    [value]="search()"
                    [disabled]="disabled()"
                    [placeholder]="placeholder()"
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
    providers: getProviders(() => CustomRowSelect),
    imports: [TranslateModule, InputLabel, ErrorMessage, SelectOptions],
})
export class CustomRowSelect<T extends TableName> extends InputBase<string> {

    private readonly supabase = inject(SupabaseService);
    private readonly injector = inject(Injector);
    private readonly input = viewChild('input', { read: ElementRef<HTMLInputElement> });
    protected readonly popover = viewChild.required(SelectOptions<CustomRowSelectOption>);

    readonly table = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);

    private readonly _table = xcomputed([this.table], t => this.supabase.sync.from(t));
    private readonly optionList = signal<CustomRowSelectOption[]>([]);
    protected readonly filteredOptions = signal<CustomRowSelectOption[]>([]);
    protected readonly search = signal<string>('');
    protected readonly optionsVisible = xcomputed([this.filteredOptions, this.search],
        (options, search) => options.length > 0 || !!search.trim());
    private readonly selectedOptionId = signal<string | null>(null);

    private readonly typing = signal(false);
    private typingResetTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly typingSyncDelayMs = 250;
    private readonly pendingValueTracker = createPendingValueTracker<string | null>(150);
    private locallyTypedRawNumericValue: string | null = null;
    private locallyTypedRawNumericValueExpiresAt = 0;
    private readonly locallyTypedRawNumericValueTtlMs = 10000;

    private viewToString: ((row: Row<T>) => string) | null = null;
    private readonly blurSubscription: OutputRefSubscription;

    constructor() {
        super();
        xeffect([this.table, this.getQuery], () => {
            this.optionList.set([]);
            this.filteredOptions.set([]);
            this.viewToString = null;
        });
        xeffect([this.viewValue], value => {
            if (this.shouldIgnoreModelSync(value))
                return;
            if (value !== this.selectedOptionId())
                this.selectedOptionId.set(null);
            if (value && /^\d+$/.test(value) && this.optionList().length === 0) {
                void this.loadOptions();
                return;
            }
            this.syncSearchFromViewValue(value);
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
        this.selectedOptionId.set(null);
        this.markLocallyTypedRawNumericValue(normalized);
        this.search.set(rawValue);
        this.setViewValue(normalized);
        this.markPendingValue(normalized);
        this.updateVisibleOptions();
    }

    protected onKeyDown(event: KeyboardEvent) {
        this.popover().handleKeyDown(event);
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
        this.selectedOptionId.set(option.id);
        this.search.set(option.view);
        this.setViewValue(option.id);
        this.markPendingValue(option.id);
        this.closeOptionsContainer();
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
        }, 100);
    }

    private async updateVisibleOptions() {
        await this.loadOptions();
        const search = this.search().trim().toLocaleLowerCase();
        if (!search) {
            this.filteredOptions.set(this.optionList());
            return;
        }
        const options = this.optionList();
        const startsWith = options.filter(option => option.lcView.startsWith(search));
        const contains = options.filter(option => {
            return !option.lcView.startsWith(search) && option.lcView.includes(search);
        });
        this.filteredOptions.set([...startsWith, ...contains]);
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
            this.syncSearchFromViewValue(viewValue);
    }

    protected override mapIn(value: string | null): string | null {
        return this.normalizeInput(value);
    }

    protected override mapOut(value: string | null): string | null {
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
        const selectedId = this.selectedOptionId();
        const valueIsNumeric = !!value && /^\d+$/.test(value);
        const hasLocalTypedNumeric = this.isLocallyTypedRawNumericValue(value);
        const shouldResolveById = !!value && (
            (selectedId != null && value === selectedId)
            || (valueIsNumeric && !hasLocalTypedNumeric)
        );
        const match = shouldResolveById
            ? this.optionList().find(option => option.id === value) ?? null
            : null;
        this.search.set(match?.view ?? value ?? '');
    }

    private markTypingActive() {
        this.typing.set(true);
        this.clearTypingResetTimeout();
        this.typingResetTimeout = setTimeout(() => {
            this.typing.set(false);
            const viewValue = this.viewValue();
            if (!this.shouldIgnoreModelSync(viewValue))
                this.syncSearchFromViewValue(viewValue);
            this.typingResetTimeout = null;
        }, this.typingSyncDelayMs);
    }

    private markTypingInactive() {
        this.clearTypingResetTimeout();
        this.typing.set(false);
    }

    private clearTypingResetTimeout() {
        if (!this.typingResetTimeout)
            return;
        clearTimeout(this.typingResetTimeout);
        this.typingResetTimeout = null;
    }

    private async mapRowsToOptions(rows: Row<T>[]) {
        const toString = await this.getToString();
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

    private async getToString() {
        if (!this.viewToString) {
            this.viewToString = await getRowViewToString(this.injector, this.table());
        }
        return this.viewToString;
    }

    private markPendingValue(value: string | null) {
        this.pendingValueTracker.mark(value);
    }

    private shouldIgnoreModelSync(value: string | null) {
        return this.pendingValueTracker.shouldIgnore(value);
    }

    private clearPendingValue() {
        this.pendingValueTracker.clear();
    }

    private markLocallyTypedRawNumericValue(value: string | null) {
        if (!value || !/^\d+$/.test(value)) {
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
}
