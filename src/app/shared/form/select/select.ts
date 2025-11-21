import { Component, ElementRef, EmbeddedViewRef, inject, input, model, OnDestroy, Signal, signal, TemplateRef, viewChild, viewChildren, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { IconComponent } from "../../icon/icon";
import { WindowService } from '../../service/window.service';
import { getLowest } from '../../utils/array-utils';
import { ColorName } from '../../utils/color-utils';
import { xeffect } from '../../utils/signal-utils';
import { highlightWords, levenshteinDistance } from '../../utils/string-utils';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";

export type SelectOption<T> = {
    value: T;
    view: string;
    lcText?: string
    color?: ColorName
}

type VisibleOption<T> = SelectOption<T> & { highlights: [string, boolean][] };

@Component({
    selector: 'app-select',
    imports: [InputLabelComponent, IconComponent],
    templateUrl: './select.html',
    styleUrl: './select.scss',
    providers: getProviders(() => SelectComponent),
})
export class SelectComponent<T> extends InputBaseComponent<T> implements OnDestroy {

    private readonly windowService = inject(WindowService);

    private readonly input = viewChild('input', { read: ElementRef });
    private readonly inputContainer = viewChild.required('inputContainer', { read: ElementRef });
    private readonly topContainer = viewChild.required('topContainer', { read: ViewContainerRef });
    private readonly bottomContainer = viewChild.required('bottomContainer', { read: ViewContainerRef });
    private readonly optionsTemplate = viewChild.required('optionsTemplate', { read: TemplateRef<any> });
    private readonly optionRefs: Signal<ReadonlyArray<ElementRef<HTMLDivElement>>> = viewChildren('option', { read: ElementRef });

    readonly options = input.required<SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)>();

    protected readonly optionsLoading = signal<boolean>(false);
    protected readonly visibleOptions = signal<VisibleOption<T>[]>([]);
    protected readonly search = model<string>("");
    protected readonly selectedOption = model<SelectOption<T> | null>(null);
    private keySubscriptions: Subscription[] = [];
    private optionsViewRef: EmbeddedViewRef<any> | null = null;
    private focusedIndex = -1;

    constructor() {
        super();
        xeffect([this.viewValue, this.options], (value, options) => {
            this.syncSelectedOption(value, options);
        });
    }

    protected onFocus() {
        this.openOptions();
    }

    protected clearSelection() {
        this.selectedOption.set(null);
        this.search.set("");
        this.input()?.nativeElement.focus();
        this.setViewValue(null);
    }

    protected async updateVisibleOptions() {
        const search = this.search().toLocaleLowerCase();
        const filteredOptions = await this.getFilteredOptions(search);
        this.visibleOptions.set(filteredOptions);
    }

    protected selectOption(option: SelectOption<T>, event?: UIEvent) {
        event?.stopPropagation();
        event?.preventDefault();
        this.selectedOption.set(option);
        this.search.set("");
        this.setViewValue(option.value);
        this.closeOptions();
    }

    protected closeOptions() {
        this.keySubscriptions.forEach(sub => sub.unsubscribe());
        this.keySubscriptions = [];
        const optionsViewRef = this.optionsViewRef;
        if (optionsViewRef) {
            optionsViewRef?.rootNodes[0].classList.remove('visible');
            setTimeout(() => {
                if (optionsViewRef !== this.optionsViewRef) return;
                optionsViewRef.destroy();
                this.optionsViewRef = null;
                this.topContainer().clear();
                this.bottomContainer().clear();
            }, 100);
        }
    }

    private openOptions() {
        this.focusedIndex = -1;
        this.closeOptions();
        this.updateVisibleOptions();
        this.keySubscriptions = [
            this.windowService.onKeyPressed('Escape').subscribe(() => this.closeOptions()),
            this.windowService.onKeyPressed('Enter').subscribe(() => this.selectFocusedOption()),
            this.windowService.onKeyPressed('ArrowUp').subscribe(() => this.focusNextOption(-1)),
            this.windowService.onKeyPressed('ArrowDown').subscribe(() => this.focusNextOption(1)),
            this.windowService.onKeyPressed('Backspace').subscribe(() => this.deleteLastSelection()),
        ];
        const inputContainerPosition = this.inputContainer().nativeElement.getBoundingClientRect();
        const inputMiddle = inputContainerPosition.top + (inputContainerPosition.height / 2);
        const isInUpperHalf = inputMiddle < (window.innerHeight / 2);
        const container = isInUpperHalf ? this.bottomContainer() : this.topContainer();
        this.optionsViewRef = container.createEmbeddedView(this.optionsTemplate());
        setTimeout(() => this.optionsViewRef?.rootNodes[0].classList.add('visible'), 0);
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
        if (!this.selectedOption()) return;
        this.selectedOption.set(null);
        this.setViewValue(null);
    }

    protected onSearch(event: Event) {
        const target = event.target as HTMLInputElement;
        this.search.set(target.value ?? '');
        this.updateVisibleOptions();
    }

    private async getFilteredOptions(search: string): Promise<VisibleOption<T>[]> {
        const options = this.options();
        this.optionsLoading.set(true);
        const allOptions = Array.isArray(options) ? options : await options(search);
        this.optionsLoading.set(false);
        if (!search) return allOptions.map(o => this.addHighlights(o, []));
        search = search.toLocaleLowerCase();
        for (const option of allOptions)
            option.lcText = option.view.toLocaleLowerCase();
        const searchWords = search.split(/\s+/);
        let filteredOptions = allOptions
            .filter(option => option.lcText!.startsWith(search))
            .map(o => this.addHighlights(o, searchWords))
        if (filteredOptions.length) return filteredOptions;
        filteredOptions = allOptions
            .filter(o => o.lcText!.includes(search))
            .map(o => this.addHighlights(o, searchWords));
        if (filteredOptions.length) return filteredOptions;
        return getLowest(allOptions, o => levenshteinDistance(search, o.lcText!), 1)
            .map(o => this.addHighlights(o, searchWords));
    }

    private addHighlights(option: SelectOption<T>, searchWords: string[]): VisibleOption<T> {
        return { ...option, highlights: highlightWords(option.view, searchWords) };
    }

    private async syncSelectedOption(value: T | null, options: SelectOption<T>[] | ((search: string) => Promise<SelectOption<T>[]>)) {
        if (value == null) {
            this.selectedOption.set(null);
            return;
        }
        const allOptions = Array.isArray(options) ? options : await options('');
        const match = allOptions.find(option => option.value === value) ?? null;
        this.selectedOption.set(match);
    }

    ngOnDestroy() {
        this.closeOptions();
    }
}