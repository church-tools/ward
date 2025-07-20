import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { copyToClipboard } from '../../utils/clipboard-utils';
import ButtonComponent from "../button/button";
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { xeffect } from '../../utils/signal-utils';

@Component({
    selector: 'app-rich-text',
    template: `
        <label class="column">
            <app-input-label/>
            <div class="form-input">
                <div #editor name="editor"></div>
                @if (copyable()) {
                    <app-button type="subtle" [icon]="copied() ? 'checkmark' : 'copy'"
                        class="icon-only input-btn" (onClick)="copy()"/>
                }
            </div>
        </label>
    `,
    providers: getProviders(() => RichTextComponent),
    imports: [InputLabelComponent, ButtonComponent]
})
export class RichTextComponent extends InputBaseComponent<string> {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');
    readonly pattern = input<string | RegExp>('');
    readonly patternErrorMsg = input<string>();
    readonly copyable = input(false);

    protected readonly copied = signal(false);
    private readonly editorView = viewChild.required('editor', { read: ElementRef });
    protected readonly editor = new Editor({
        element: null,
        content: '<p>Test</p>',
        extensions: [
            Document,
            Paragraph,
            Text,
        ],
    });

    constructor() {
        super();
        xeffect([this.editorView], editorView => {
            this.editor.mount(editorView.nativeElement);
        });
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
}