import { Component, ElementRef, input, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { wait } from '../../utils/flow-control-utils';
import { asyncComputed } from '../../utils/signal-utils';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { QuillWrapper } from './quill-wrapper';
import { RichTextToolbarButton, RichTextToolbarGroupComponent } from './rich-text-toolbar-group';

type Format = 'bold' | 'italic' | 'underline' | 'strike';
type Heading = 1 | 2 | 3 | 0;
type List = 'bullet' | 'numbered';

@Component({
    selector: 'app-rich-text',
    styleUrl: './rich-text.scss',
    templateUrl: './rich-text.html',
    providers: getProviders(() => RichTextComponent),
    imports: [TranslateModule, InputLabelComponent, RichTextToolbarGroupComponent],
    host: {
        class: 'column'
    }
})
export class RichTextComponent extends InputBaseComponent<string> {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');

    private readonly editor = viewChild.required('editor', { read: ElementRef });

    protected readonly quill = new QuillWrapper(this.editor, this.characterLimit);

    protected readonly toolbarDelayedPosition = asyncComputed([this.quill.popoverPosition],
        p => wait(100).then(() => p));

    protected readonly formatButtons: RichTextToolbarButton<Format>[] = [
        { icon: 'text_bold', action: 'bold', title: 'Bold (Ctrl+B)', shortcut: 'B' },
        { icon: 'text_italic', action: 'italic', title: 'Italic (Ctrl+I)', shortcut: 'I' },
        { icon: 'text_underline', action: 'underline', title: 'Underline (Ctrl+U)', shortcut: 'U' },
        { icon: 'text_strikethrough', action: 'strike', title: 'Strikethrough' },
    ] as const;

    protected readonly headingButtons: RichTextToolbarButton<Heading>[] = [
        { icon: 'text_header_1', action: 1, title: 'Heading 1' },
        { icon: 'text_header_2', action: 2, title: 'Heading 2' },
        { icon: 'text_header_3', action: 3, title: 'Heading 3' },
        { icon: 'text_t', action: 0, title: 'Body Text' },
    ] as const;

    protected readonly listButtons: RichTextToolbarButton<List>[] = [
        { icon: 'text_bullet_list_ltr', action: 'bullet', title: 'Bullet List' },
        { icon: 'text_number_list_ltr', action: 'numbered', title: 'Numbered List' },
    ] as const;

    protected readonly linkButtons: RichTextToolbarButton<string>[] = [
        { icon: 'link', action: 'insertLink', title: 'Insert Link' },
    ] as const;

    constructor() {
        super();
        this.quill.onChange.subscribe(html => {
            if (this.characterLimit()) {
                this.quill.getText().then(text => {
                    if (text.length > this.characterLimit()) {
                        this.quill.setContent(this.value() || '');
                        return;
                    }
                    this.value.set(html);
                    this.emitChange();
                });
            } else {
                this.value.set(html);
                this.emitChange();
            }
        });
    }

    override writeValue(value: string | null): void {
        super.writeValue(value);
        if (value !== null) {
            this.quill.setContent(value);
        }
    }
}
