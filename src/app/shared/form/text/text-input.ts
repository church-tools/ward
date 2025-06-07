import { Component, forwardRef, input, signal } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { copyToClipboard } from '../../utils/clipboard-utils';
import ButtonComponent from "../button/button.component";
import { InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";

@Component({
    selector: 'app-text-input',
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input">
                <input [required]="true" type="text"
                    [(ngModel)]="value" [disabled]="false"
                    [placeholder]="placeholder()" [pattern]="pattern()"
                    [autocomplete]="autocomplete()" (click)="onClick($event)"
                    (keypress)="onKeyPress($event)">
                @if (copyable()) {
                    <app-button type="subtle" [icon]="copied() ? 'checkmark' : 'copy'"
                        class="icon-only input-btn" (onClick)="copy()"/>
                }
            </div>
        </label>
    `,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TextInputComponent),
            multi: true
        }
    ],
    imports: [FormsModule, InputLabelComponent, ButtonComponent]
})
export class TextInputComponent extends InputBaseComponent<string> {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');
    readonly pattern = input<string | RegExp>('');
    readonly patternErrorMsg = input<string>();
    readonly copyable = input(false);

    protected readonly copied = signal(false);

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
    }

    protected onKeyPress(event: KeyboardEvent) {
        // if (event.key === 'Enter') {
        //     this.onFocusOut.emit(this.value());
        if (this.characterLimit() && (this.value()?.length ?? 0) >= this.characterLimit()) {
            event.preventDefault();
        }
    }


    protected async copy() {
        const value = this.value();
        if (!value) return;
        copyToClipboard(value);
        this.copied.set(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.copied.set(false);
    }
}