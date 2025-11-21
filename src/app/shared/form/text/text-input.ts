import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { copyToClipboard } from '../../utils/clipboard-utils';
import ButtonComponent from "../button/button";
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { xcomputed } from '../../utils/signal-utils';

@Component({
    selector: 'app-text-input',
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input">
                <input #input [required]="true" type="text"
                    [class]="textClass()"
                    [value]="viewValue() ?? ''" (input)="onInput($event)"
                    [disabled]="disabled()"
                    [placeholder]="placeholder()"
                    [attr.pattern]="patternAttribute()"
                    [autocomplete]="autocomplete()" (click)="onClick($event)"
                    (keypress)="onKeyPress($event)">
                @if (copyable()) {
                    <app-button type="subtle" [icon]="copied() ? 'checkmark' : 'copy'"
                        class="icon-only input-btn" (onClick)="copy()"/>
                }
            </div>
        </label>
    `,
    providers: getProviders(() => TextInputComponent),
    imports: [InputLabelComponent, ButtonComponent]
})
export class TextInputComponent extends InputBaseComponent<string> {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');
    readonly pattern = input<readonly RegExp[] | undefined>(); 
    readonly patternErrorMsg = input<string>();
    readonly trim = input<boolean>(false);
    readonly copyable = input(false);
    readonly textClass = input<string | undefined>();

    protected readonly copied = signal(false);

    private readonly inputView = viewChild.required('input', { read: ElementRef });
    override readonly debounceTime = 300;

    protected readonly patternAttribute = xcomputed([this.pattern], (pattern) => {
        if (!pattern) return undefined;
        return pattern[0]?.source;
    });

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
    }

    protected onInput(event: Event) {
        const target = event.target as HTMLInputElement;
        this.setViewValue(target.value ?? '');
    }

    protected onKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter')
            this.inputView().nativeElement.blur();
        if (this.characterLimit() && (this.viewValue()?.length ?? 0) >= this.characterLimit()) {
            event.preventDefault();
        }
    }

    protected override mapOut(value: string): string {
        return this.trim() ? value.trim() : value;
    }

    protected async copy() {
        const value = this.viewValue();
        if (!value) return;
        copyToClipboard(value);
        this.copied.set(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.copied.set(false);
    }
}