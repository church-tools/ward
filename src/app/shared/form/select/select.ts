import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, ContentChild, ElementRef, inject, input, model,
    OnDestroy, OutputRefSubscription, Signal, signal, TemplateRef, viewChild, viewChildren } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AnchoredPopoverComponent, PopoverPosition } from '../anchored-popover/anchored-popover';
import { IconComponent } from "../../icon/icon";
import { WindowService } from '../../service/window.service';
import { getLowest } from '../../utils/array-utils';
import { ColorName } from '../../utils/color-utils';
import { wait } from '../../utils/flow-control-utils';
import { xcomputed, xeffect } from '../../utils/signal-utils';
import { highlightWords, levenshteinDistance } from '../../utils/string-utils';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";

export type SelectOption<T> = {
    value: T;
    view: string;
    row?: unknown;
    id?: number | string;
    lcText?: string;
    translatedText?: string;
    color?: ColorName;
    group?: {
        id: string;
        label: string;
        color?: ColorName;
    };
}

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

@Component({
    selector: 'app-select',
    imports: [TranslateModule, InputLabelComponent, IconComponent, NgTemplateOutlet, AnchoredPopoverComponent],
    templateUrl: './select.html',
    styleUrl: './select.scss',
    providers: getProviders(() => SelectComponent),
})
export class SelectComponent<T> extends InputBaseComponent<T> implements OnDestroy {

    private readonly windowService = inject(WindowService);
    private readonly translateService = inject(TranslateService);

    private readonly input = viewChild('input', { read: ElementRef });
    private readonly inputContainer = viewChild.required('inputContainer', { read: ElementRef });
    protected readonly popover = viewChild.required(AnchoredPopoverComponent);
    private readonly optionRefs: Signal<ReadonlyArray<ElementRef<HTMLDivElement>>> = viewChildren('option', { read: ElementRef });

    @ContentChild('optionTemplate', { read: TemplateRef })
    protected optionTemplate: TemplateRef<SelectOptionTemplateContext<T>> | null = null;

    @ContentChild('valueTemplate', { read: TemplateRef })
    protected valueTemplate: TemplateRef<SelectValueTemplateContext<T>> | null = null;

    readonly options = input.required<readonly SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)>();
    readonly getValueId = input<(value: T) => number | string>();
    readonly onGroupClick = input<(group: { id: string; label: string; color?: ColorName }) => void>();
    readonly withoutValue = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly hideClear = input<boolean, unknown>(true, { transform: booleanAttribute });
    readonly mapSearch = input<(search: string) => string>();
    readonly translateOptions = input<boolean, unknown>(false, { transform: booleanAttribute });

    protected readonly optionsLoading = signal<boolean>(false);
    protected readonly visibleOptions = signal<VisibleOption<T>[]>([]);
    protected readonly visibleOptionGroups = signal<VisibleOptionGroup<T>[]>([]);
    protected readonly showOptionGroups = signal<boolean>(false);
    protected readonly search = model<string>("");
    protected readonly selectedOption = model<SelectOption<T> | null>(null);
    protected readonly popoverPosition = signal<PopoverPosition>('bottom');
    protected readonly popoverWidth = signal<number>(0);
    private readonly closing = signal(false);
    private readonly popoverRequested = signal(false);

    readonly optionsVisible = xcomputed([this.visibleOptions, this.closing, this.optionsLoading, this.popoverRequested],
        (options, closing, loading, popoverRequested) => popoverRequested && !closing && (loading || options.length > 0));

    private keySubscriptions: Subscription[] = [];
    private readonly blurSubscription: OutputRefSubscription;
    private focusedIndex = -1;
    private suppressNextFocusOpen = false;

    constructor() {
        super();
        xeffect([this.viewValue, this.options], (value, options) => {
            this.syncSelectedOption(value, options);
        });
        xeffect([this.popover, this.optionsVisible], (popover, optionsVisible) => {
            if (!popover) return;
            if (optionsVisible) popover.show();
            else popover.hide();
        });
        this.blurSubscription = this.onBlur.subscribe(async () => {
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
        this.selectedOption.set(null);
        this.search.set("");
        this.input()?.nativeElement.focus();
        this.setViewValue(null);
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
        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, textarea, select, [role="button"]'))
            return;
        event.preventDefault();
        this.focusInput();
    }

    getSearch() {
        return this.search();
    }

    setSearch(search: string, keepOpen = true) {
        this.search.set(search ?? '');
        if (!this.popoverRequested() && keepOpen)
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
            this.closeOptionsContainer();
        }
    }

    protected closeOptionsContainer() {
        this.keySubscriptions.forEach(sub => sub.unsubscribe());
        this.keySubscriptions = [];
        if (!this.popoverRequested()) return;
        this.popoverRequested.set(false);
        this.closing.set(true);
        setTimeout(() => {
            if (this.popoverRequested()) return;
            this.closing.set(false);
            this.visibleOptions.set([]);
            this.visibleOptionGroups.set([]);
        }, 100);
    }

    private createOptionsContainer() {
        if (this.popoverRequested()) return;
        this.focusedIndex = -1;
        const inputContainerPosition = this.inputContainer().nativeElement.getBoundingClientRect();
        const inputMiddle = inputContainerPosition.top + (inputContainerPosition.height / 2);
        const isInUpperHalf = inputMiddle < (window.innerHeight / 2);
        this.popoverPosition.set(isInUpperHalf ? 'bottom' : 'top');
        this.popoverWidth.set(inputContainerPosition.width);
        this.popoverRequested.set(true);
        this.updateVisibleOptions();
        this.keySubscriptions.forEach(sub => sub.unsubscribe());
        this.keySubscriptions = [
            this.windowService.onKeyPressed('Escape').subscribe(() => this.closeOptionsContainer()),
            this.windowService.onKeyPressed('Enter').subscribe(() => this.selectFocusedOption()),
            this.windowService.onKeyPressed('ArrowUp').subscribe(() => this.focusNextOption(-1)),
            this.windowService.onKeyPressed('ArrowDown').subscribe(() => this.focusNextOption(1)),
            this.windowService.onKeyPressed('Backspace').subscribe(() => this.deleteLastSelection()),
        ];
    }

    protected onPopoverVisibilityChange(visible: boolean) {
        if (visible) return;
        this.keySubscriptions.forEach(sub => sub.unsubscribe());
        this.keySubscriptions = [];
        this.popoverRequested.set(false);
        this.closing.set(false);
        this.focusedIndex = -1;
    }

    private focusNextOption(offset: number) {
        const options = this.visibleOptions();
        if (!options.length) return;
        const optionRefs = this.optionRefs();
        optionRefs[this.focusedIndex]?.nativeElement.classList.remove('focused');;
        this.focusedIndex = this.focusedIndex < 0
            ? offset > 0 ? 0 : -1
            : this.focusedIndex + offset;
        this.focusedIndex = (this.focusedIndex + options.length) % options.length;
        optionRefs[this.focusedIndex]?.nativeElement.classList.add('focused');
    }

    private selectFocusedOption() {
        const options = this.visibleOptions();
        if (!options.length) return;
        const focusedOption = options[this.focusedIndex >= 0 ? this.focusedIndex : 0];
        this.selectOption(focusedOption);
    }

    private deleteLastSelection() {
        if (this.withoutValue()) return;
        if (!this.hideClear()) return;
        if (!this.selectedOption()) return;
        this.selectedOption.set(null);
        this.setViewValue(null);
    }

    protected onSearch(event: Event) {
        const target = event.target as HTMLInputElement;
        this.search.set(target.value ?? '');
        this.updateVisibleOptions();
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
            focused: this.isOptionFocused(option),
        };
    }

    protected getValueTemplateContext(option: SelectOption<T>): SelectValueTemplateContext<T> {
        return {
            $implicit: option,
            option,
        };
    }

    private isOptionFocused(option: VisibleOption<T>) {
        const options = this.visibleOptions();
        if (this.focusedIndex < 0 || this.focusedIndex >= options.length)
            return false;
        return options[this.focusedIndex] === option;
    }

    private async getFilteredOptions(search: string): Promise<VisibleOption<T>[]> {
        const options = this.options();
        const loadingTimeout = setTimeout(() => this.optionsLoading.set(true), 200);
        const allOptions = typeof options === 'function'
            ? await options(search)
            : options;
        clearTimeout(loadingTimeout);
        this.optionsLoading.set(false);
        if (this.translateOptions())
            for (const option of allOptions)
                option.translatedText = this.translateService.instant(option.view);
        const textKey = this.translateOptions() ? 'translatedText' : 'view' as const;
        search = search.toLocaleLowerCase();
        const searchWords = search.split(/\s+/).filter(Boolean);
        const addHighlights = (option: SelectOption<T>): VisibleOption<T> =>
            ({ ...option, highlights: highlightWords(option[textKey]!, searchWords) });
        if (!searchWords.length) return allOptions.map(addHighlights);
        for (const option of allOptions)
            option.lcText = option[textKey]!.toLocaleLowerCase();
        let filteredOptions = allOptions
            .filter(o => o.lcText!.startsWith(search))
            .map(addHighlights);
        if (filteredOptions.length) return filteredOptions;
        filteredOptions = allOptions
            .filter(o => o.lcText!.includes(search))
            .map(addHighlights);
        if (filteredOptions.length) return filteredOptions;
        return getLowest(allOptions, o => levenshteinDistance(search, o.lcText!), 1)
            .map(addHighlights);
    }

    private setVisibleOptionGroups(options: VisibleOption<T>[]) {
        const hasGroups = options.length > 0 && options[0].group != null;
        if (!hasGroups) return;
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
}