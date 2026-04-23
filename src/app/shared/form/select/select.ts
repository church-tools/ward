import { LanguageService } from '@/shared/language/language.service';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { NgTemplateOutlet } from '@angular/common';
import {
    booleanAttribute, Component, ContentChild, ElementRef, inject, input, model,
    OnDestroy, OutputRefSubscription, signal, TemplateRef, viewChild
} from '@angular/core';
import { Icon, type IconCode } from "../../icon/icon";
import { getLowest } from '../../utils/array-utils';
import { ColorName } from '../../utils/color-utils';
import { wait } from '../../utils/flow-control-utils';
import { xcomputed, xeffect } from '../../utils/signal-utils';
import { highlightWords, levenshteinDistance } from '../../utils/string-utils';
import { getProviders, InputBase } from '../shared/input-base';
import InputLabel from "../shared/input-label";
import { SelectOptions } from './select-options';
import { createPendingValueTracker, shouldFocusInputFromContainerMouseDown, schedulePopupCleanup } from './select-utils';
import type { SelectOption } from './select-utils';

type VisibleOption<T> = SelectOption<T> & { highlights: [string, boolean][] };
type VisibleOptionGroup<T> = {
    id: string;
    label: string;
    color?: ColorName;
    options: VisibleOption<T>[];
};

type SelectOptionTemplateContext<T> = {
    $implicit: VisibleOption<T>;
    option: VisibleOption<T>;
    group: VisibleOptionGroup<T> | null;
    focused: boolean;
};

type SelectValueTemplateContext<T> = {
    $implicit: SelectOption<T>;
    option: SelectOption<T>;
};

type SelectOptionsHeaderTemplateContext<T> = {
    selectedOption: SelectOption<T> | null;
    search: string;
};

@Component({
    selector: 'app-select',
    imports: [LocalizePipe, InputLabel, Icon, NgTemplateOutlet, SelectOptions],
    templateUrl: './select.html',
    styleUrl: './select.scss',
    providers: getProviders(() => Select),
})
export class Select<T> extends InputBase<T> implements OnDestroy {

    private readonly language = inject(LanguageService);
    private readonly closeCleanupDelayMs = 100;
    private readonly loadingIndicatorDelayMs = 200;

    private readonly input = viewChild('input', { read: ElementRef<HTMLInputElement> });
    protected readonly popover = viewChild.required(SelectOptions<VisibleOption<T>>);

    @ContentChild('optionTemplate', { read: TemplateRef })
    protected optionTemplate: TemplateRef<SelectOptionTemplateContext<T>> | null = null;

    @ContentChild('valueTemplate', { read: TemplateRef })
    protected valueTemplate: TemplateRef<SelectValueTemplateContext<T>> | null = null;

    @ContentChild('optionsHeaderTemplate', { read: TemplateRef })
    protected optionsHeaderTemplate: TemplateRef<SelectOptionsHeaderTemplateContext<T>> | null = null;

    readonly options = input.required<readonly SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)>();
    readonly onGroupClick = input<(group: { id: string; label: string; color?: ColorName }) => void>();
    readonly withoutValue = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly hideClear = input<boolean, unknown>(true, { transform: booleanAttribute });
    readonly mapSearch = input<(search: string) => string>();
    readonly translateOptions = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly onOptionClick = input<(option: SelectOption<T>, event: MouseEvent) => void>();

    protected readonly optionsLoading = signal<boolean>(false);
    protected readonly visibleOptions = signal<VisibleOption<T>[]>([]);
    protected readonly visibleOptionGroups = signal<VisibleOptionGroup<T>[]>([]);
    protected readonly showOptionGroups = signal<boolean>(false);
    protected readonly search = model<string>("");
    protected readonly selectedOption = model<SelectOption<T> | null>(null);
    readonly optionsVisible = xcomputed([this.visibleOptions, this.optionsLoading],
        (options, loading) => loading || options.length > 0);

    private readonly blurSubscription: OutputRefSubscription;
    private suppressNextFocusOpen = false;
    private readonly pendingValueTracker = createPendingValueTracker<T | null>(150);

    constructor() {
        super();
        xeffect([this.viewValue, this.options], (value, options) => {
            if (this.pendingValueTracker.shouldIgnore(value))
                return;
            this.syncSelectedOption(value, options);
        });
        this.blurSubscription = this.onBlur.subscribe(async () => {
            this.pendingValueTracker.clear();
            await wait(150);
            this.closeOptionsContainer();
        });
    }

    ngOnDestroy() {
        this.blurSubscription.unsubscribe();
        this.closeOptionsContainer();
    }

    protected onFocus() {
        if (this.suppressNextFocusOpen) {
            this.suppressNextFocusOpen = false;
            return;
        }
        this.createOptionsContainer();
    }

    protected clearSelection() {
        if (this.hideClear()) return;
        this.clearSelectedValue();
        this.search.set("");
        this.input()?.nativeElement.focus();
    }

    focusInput(openOptions = true) {
        if (this.disabled()) return;
        if (!openOptions)
            this.suppressNextFocusOpen = true;
        this.input()?.nativeElement.focus();
    }

    protected onInputContainerMouseDown(event: MouseEvent) {
        if (this.disabled())
            return;
        if (!shouldFocusInputFromContainerMouseDown(event.target))
            return;
        event.preventDefault();
        this.focusInput();
    }

    getSearch() {
        return this.search();
    }

    setSearch(search: string, keepOpen = true) {
        this.search.set(search ?? '');
        if (!this.popover().isRequested() && keepOpen)
            this.createOptionsContainer();
        this.updateVisibleOptions();
        this.input()?.nativeElement.focus();
    }

    protected async updateVisibleOptions() {
        const search = this.search().toLocaleLowerCase();
        const mapSearch = this.mapSearch();
        const filteredOptions = await this.getFilteredOptions(mapSearch ? mapSearch(search) : search);
        this.visibleOptions.set(filteredOptions);
        this.setVisibleOptionGroups(filteredOptions);
    }

    protected selectOption(option: SelectOption<T>, event?: UIEvent) {
        event?.stopPropagation();
        event?.preventDefault();
        this.search.set("");
        if (this.withoutValue()) {
            this.emitChange(option.value);
            this.updateVisibleOptions();
        } else {
            this.selectedOption.set(option);
            this.setViewValue(option.value);
            this.pendingValueTracker.mark(option.value);
            this.closeOptionsContainer();
        }
    }

    protected closeOptionsContainer() {
        if (!this.popover().isRequested()) return;
        this.popover().close();
        schedulePopupCleanup(() => this.popover().isRequested(), () => {
            this.visibleOptions.set([]);
            this.visibleOptionGroups.set([]);
        }, this.closeCleanupDelayMs);
    }

    private createOptionsContainer() {
        if (this.popover().isRequested()) return;
        this.popover().open();
        this.updateVisibleOptions();
    }

    private deleteLastSelection() {
        if (this.withoutValue()) return;
        if (!this.hideClear()) return;
        if (!this.selectedOption()) return;
        this.clearSelectedValue();
    }

    protected onSearch(event: Event) {
        const target = event.target as HTMLInputElement;
        this.search.set(target.value ?? '');
        this.updateVisibleOptions();
    }

    protected onKeyDown(event: KeyboardEvent) {
        const handled = this.popover().handleKeyDown(event);
        if (handled)
            return;
        if (event.key === 'Backspace')
            this.deleteLastSelection();
    }

    protected onGroupTitleMouseDown(event: MouseEvent) {
        event.preventDefault();
    }

    protected onGroupTitleClick(group: VisibleOptionGroup<T>, event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
        this.onGroupClick()?.({ id: group.id, label: group.label, color: group.color });
    }

    protected getOptionTemplateContext(option: VisibleOption<T>, group: VisibleOptionGroup<T> | null): SelectOptionTemplateContext<T> {
        return {
            $implicit: option,
            option,
            group,
            focused: this.popover().focusedOption() === option,
        };
    }

    protected getValueTemplateContext(option: SelectOption<T>): SelectValueTemplateContext<T> {
        return {
            $implicit: option,
            option,
        };
    }

    protected getOptionsHeaderTemplateContext(): SelectOptionsHeaderTemplateContext<T> {
        return {
            selectedOption: this.selectedOption(),
            search: this.search(),
        };
    }

    private async getFilteredOptions(search: string): Promise<VisibleOption<T>[]> {
        const allOptions = await this.resolveAllOptions(search);
        const textKey = this.resolveTextKey();
        await this.prepareSearchText(allOptions, textKey);
        const normalizedSearch = search.toLocaleLowerCase();
        const searchWords = this.getSearchWords(normalizedSearch);
        if (!searchWords.length)
            return allOptions.map(option => this.toVisibleOption(option, textKey, searchWords));
        const startsWith = allOptions.filter(option => option.lcText!.startsWith(normalizedSearch));
        if (startsWith.length)
            return startsWith.map(option => this.toVisibleOption(option, textKey, searchWords));
        const contains = allOptions.filter(option => option.lcText!.includes(normalizedSearch));
        if (contains.length)
            return contains.map(option => this.toVisibleOption(option, textKey, searchWords));
        return getLowest(allOptions, option => levenshteinDistance(normalizedSearch, option.lcText!), 1)
            .map(option => this.toVisibleOption(option, textKey, searchWords));
    }

    private async resolveAllOptions(search: string) {
        const options = this.options();
        const loadingTimeout = setTimeout(() => this.optionsLoading.set(true), this.loadingIndicatorDelayMs);
        try {
            return typeof options === 'function'
                ? await options(search)
                : options;
        } finally {
            clearTimeout(loadingTimeout);
            this.optionsLoading.set(false);
        }
    }

    private resolveTextKey() {
        return this.translateOptions() ? 'translatedText' : 'view' as const;
    }

    private async prepareSearchText(allOptions: readonly SelectOption<T>[], textKey: 'translatedText' | 'view') {
        const localizer = await this.language.getLocalizer();
        if (this.translateOptions())
            for (const option of allOptions)
                option.translatedText = localizer(option.view);
        for (const option of allOptions)
            option.lcText = option[textKey]!.toLocaleLowerCase();
    }

    private getSearchWords(search: string) {
        return search.split(/\s+/).filter(Boolean);
    }

    private toVisibleOption(option: SelectOption<T>, textKey: 'translatedText' | 'view', searchWords: string[]): VisibleOption<T> {
        return { ...option, highlights: highlightWords(option[textKey]!, searchWords) };
    }

    private setVisibleOptionGroups(options: VisibleOption<T>[]) {
        this.visibleOptionGroups.set([]);
        this.showOptionGroups.set(false);
        const hasGroups = options.length > 0 && options[0].group != null;
        if (!hasGroups)
            return;
        const groupById: Record<string, VisibleOptionGroup<T>> = {};
        for (const option of options) {
            const { id, label, color } = option.group!;
            const visibleGroup = groupById[id] ??= { id, label, color, options: [] };
            visibleGroup.options.push(option);
        }
        const groups = Object.values(groupById);
        this.visibleOptionGroups.set(groups);
        this.showOptionGroups.set(groups.length > 1);
    }

    private async syncSelectedOption(value: T | null, options: readonly SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)) {
        const allOptions = typeof options === 'function'
            ? await options('')
            : options;
        if (value == null) {
            this.selectedOption.set(null);
            return;
        }
        const match = allOptions.find(option => option.value === value) ?? null;
        this.selectedOption.set(match);
    }

    private clearSelectedValue() {
        this.selectedOption.set(null);
        this.setViewValue(null);
        this.pendingValueTracker.mark(null);
    }

}