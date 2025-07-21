import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { copyToClipboard } from '../../utils/clipboard-utils';
import ButtonComponent from "../button/button";
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";

@Component({
    selector: 'app-rich-text',
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input column">
                <div class="row no-wrap gap-1">
                    <app-button icon="text_bold" type="secondary" class="icon-only" (click)="formatSelection('**')" shortcut="B"/>
                    <app-button icon="text_italic" type="secondary" class="icon-only" (click)="formatSelection('_')" shortcut="I"/>
                    <app-button icon="text_underline" type="secondary" class="icon-only" (click)="formatSelection('<u>')" shortcut="U"/>
                    <app-button icon="text_strikethrough" type="secondary" class="icon-only" (click)="formatSelection('~~')"/>
                    <app-button icon="text_bullet_list_ltr" type="secondary" class="icon-only" (click)="formatSelection('<ul><li></li></ul>')"/>
                    <app-button icon="text_number_list_ltr" type="secondary" class="icon-only" (click)="formatSelection('<ol><li></li></ol>')"/>
                    <!-- <app-button icon="text_indent_increase" type="secondary" class="icon-only" (click)="formatSelection('<ol><li></li></ol>')"/>
                    <app-button icon="text_indent_decrease" type="secondary" class="icon-only" (click)="formatSelection('<ol><li></li></ol>')"/> -->
                </div>

                <textarea #editor class="full-width"></textarea>
                @if (copyable()) {
                    <app-button type="subtle" [icon]="copied() ? 'checkmark' : 'copy'"
                        class="icon-only input-btn" (onClick)="copy()"/>
                }
            </div>
        </label>
    `,
    providers: getProviders(() => RichTextComponent),
    imports: [TranslateModule, InputLabelComponent, ButtonComponent],
})
export class RichTextComponent extends InputBaseComponent<string> {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');
    readonly pattern = input<string | RegExp>('');
    readonly patternErrorMsg = input<string>();
    readonly copyable = input(false);

    protected readonly copied = signal(false);
    private readonly editorView = viewChild.required('editor', { read: ElementRef });

    constructor() {
        super();
    }

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
    }

    protected onKeyPress(event: KeyboardEvent) {
        if (event.key === 'Enter')
            this.editorView().nativeElement.blur();
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

    formatSelection(before: string, after: string = before) {
        // const ta = this.textarea.nativeElement;
        // const { selectionStart: start, selectionEnd: end, value: text } = ta;
        // const selected = text.slice(start, end);

        // const hasBefore = text.slice(start - before.length, start) === before;
        // const hasAfter = text.slice(end, end + after.length) === after;
        // let newText: string, newStart: number, newEnd: number;

        // if (hasBefore && hasAfter) {
        // // remove formatting
        // newText =
        //     text.slice(0, start - before.length) +
        //     selected +
        //     text.slice(end + after.length);
        // newStart = start - before.length;
        // newEnd = end - before.length;
        // } else {
        // // add formatting
        // newText =
        //     text.slice(0, start) +
        //     before +
        //     selected +
        //     after +
        //     text.slice(end);
        // newStart = start + before.length;
        // newEnd = end + before.length;
        // }

        // this.updateValue(newText);

        // // restore focus + selection
        // setTimeout(() => {
        // ta.focus();
        // ta.setSelectionRange(newStart, newEnd);
        // }, 0);
    }

}