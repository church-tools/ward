import { Component, ElementRef, input, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { HTMLString, markdownToQuillHtml, quillHtmlToMarkdown } from './markdown-utils';
import { Format, Heading, List, QuillWrapper } from './quill-wrapper';
import { RichTextToolbarButton, RichTextToolbarGroupComponent } from './rich-text-toolbar-group';

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
export class RichTextComponent extends InputBaseComponent<HTMLString, string> {
    
    readonly characterLimit = input<number>(0);
    readonly minLines = input<number>(3);
    readonly autocomplete = input<string>('off');

    private readonly editor = viewChild.required('editor', { read: ElementRef });
    
    override readonly debounceTime = 300;

    protected readonly quill = new QuillWrapper(this.editor, this.characterLimit, this.minLines);

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
        { icon: 'text_t', action: false, title: 'Body Text' },
    ] as const;

    protected readonly listButtons: RichTextToolbarButton<List>[] = [
        { icon: 'text_bullet_list_ltr', action: 'bullet', title: 'Bullet List' },
        { icon: 'text_number_list_ltr', action: 'ordered', title: 'Numbered List' },
    ] as const;

    protected readonly indentButtons: RichTextToolbarButton<1 | -1>[] = [
        { icon: 'text_indent_increase', action: 1, title: 'Increase Indent' },
        { icon: 'text_indent_decrease', action: -1, title: 'Decrease Indent' },
    ] as const;

    protected readonly linkButtons: RichTextToolbarButton<string>[] = [
        { icon: 'link', action: 'insertLink', title: 'Insert Link' },
    ] as const;

    constructor() {
        super();
        this.quill.onChange.subscribe(html => {
            this.setViewValue(html);
        });
    }

    protected override mapIn(value: string | null) {
        const html = markdownToQuillHtml(value ?? '');
        this.quill.setContent(html);
        return html;
    }

    protected override mapOut(value: HTMLString | null) {
        return quillHtmlToMarkdown(value);
    }
}
