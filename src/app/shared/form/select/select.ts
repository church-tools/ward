import { Component, ElementRef, EmbeddedViewRef, inject, input, model, OnDestroy, Signal, signal, TemplateRef, viewChild, viewChildren, ViewContainerRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IconComponent } from "../../icon/icon";
import { WindowService } from '../../service/window.service';
import { getHighest } from '../../utils/array-utils';
import { ColorName } from '../../utils/color-utitls';
import { xeffect } from '../../utils/signal-utils';
import { getAvgSimilarity, highlightWords } from '../../utils/string-utils';
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
    imports: [FormsModule, InputLabelComponent, IconComponent],
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

    readonly options = input.required<SelectOption<T>[]>();
    
    readonly visibleOptions = signal<VisibleOption<T>[]>([]);
    protected readonly search = model<string>("");
    protected readonly selectedOption = model<SelectOption<T> | null>(null);
    private keySubscriptions: Subscription[] = [];
    private optionsViewRef: EmbeddedViewRef<any> | null = null;
    private focusedIndex = -1;

    constructor() {
        super();
        xeffect([this.options], options => {
            for (const option of options)
                option.lcText = option.view.toLocaleLowerCase();
        });
    }

    protected onFocus() {
        this.openOptions();
    }

    protected clearSelection() {
        this.selectedOption.set(null);
        this.search.set("");
        this.input()?.nativeElement.focus();
    }

    protected updateVisibleOptions() {
        const search = this.search().toLocaleLowerCase();
        this.visibleOptions.set(this.getFilteredOptions(search));
    }

    protected selectOption(option: SelectOption<T>, event?: UIEvent) {
        event?.stopPropagation();
        event?.preventDefault();
        this.selectedOption.set(option);
        this.search.set("");
        this.value.set(option.value);
        this.closeOptions();
        this.emitChange();
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
        this.selectedOption.set(null);
    }

    private getFilteredOptions(search: string): VisibleOption<T>[] {
        const allOptions = this.options();
        if (!search) return allOptions.map(o => this.addHighlights(o, []));
        search = search.toLocaleLowerCase();
        const searchWords = search.split(/\s+/);
        let filteredOptions = allOptions
            .filter(option => option.lcText!.startsWith(search))
            .map(o => this.addHighlights(o, searchWords))
        if (filteredOptions.length) return filteredOptions;
        filteredOptions = allOptions
            .filter(o => o.lcText!.includes(search))
            .map(o => this.addHighlights(o, searchWords));
        if (filteredOptions.length) return filteredOptions;
        return getHighest(allOptions, o => getAvgSimilarity(searchWords, o.lcText!), 1)
            .map(o => this.addHighlights(o, searchWords));
    }

    private addHighlights(option: SelectOption<T>, searchWords: string[]): VisibleOption<T> {
        return { ...option, highlights: highlightWords(option.view, searchWords) };
    }

    ngOnDestroy() {
        this.closeOptions();
    }
}