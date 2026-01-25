import { Component, ElementRef, input, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { xeffect } from '../../utils/signal-utils';
import { AnchoredPopoverComponent } from '../anchored-popover/anchored-popover';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { HTMLString, markdownToQuillHtml, quillHtmlToMarkdown } from './markdown-utils';
import { QuillWrapper } from './quill-wrapper';
import { RichTextToolbarButton, RichTextToolbarGroupComponent } from './rich-text-toolbar-group';
import MenuButtonComponent, { MenuButtonItem } from '../button/menu/menu-button';

@Component({
    selector: 'app-rich-text',
    styleUrl: './rich-text.scss',
    templateUrl: './rich-text.html',
    providers: getProviders(() => RichTextComponent),
    imports: [TranslateModule, InputLabelComponent, RichTextToolbarGroupComponent, MenuButtonComponent, AnchoredPopoverComponent],
    host: {
        class: 'column',
        '[style.anchor-name]': 'toolbar().anchorNameCss',
    }
})
export class RichTextComponent extends InputBaseComponent<HTMLString, string> {
    
    readonly characterLimit = input<number>(0);
    readonly minLines = input<number>(3);
    readonly autocomplete = input<string>('off');

    private readonly editor = viewChild.required('editor', { read: ElementRef });
    protected readonly toolbar = viewChild.required(AnchoredPopoverComponent);
    
    override readonly debounceTime = 300;

    protected readonly quill = new QuillWrapper(this.editor, this.characterLimit, this.minLines);

    protected readonly formatMainAction = () => this.quill.toggleFormat('bold');
    protected readonly formatMenuItems: MenuButtonItem[] = [
        { icon: 'text_italic', label: 'Italic (Ctrl+I)', action: () => this.quill.toggleFormat('italic') },
        { icon: 'text_underline', label: 'Underline (Ctrl+U)', action: () => this.quill.toggleFormat('underline') },
        { icon: 'text_strikethrough', label: 'Strikethrough', action: () => this.quill.toggleFormat('strike') },
    ] as const;

    protected readonly headingMainAction = () => this.quill.formatHeading(1);
    protected readonly headingMenuItems: MenuButtonItem[] = [
        { icon: 'text_header_2', label: 'Heading 2', action: () => this.quill.formatHeading(2) },
        { icon: 'text_header_3', label: 'Heading 3', action: () => this.quill.formatHeading(3) },
        { icon: 'text_t', label: 'Body Text', action: () => this.quill.formatHeading(false) },
    ] as const;

    protected readonly listMainAction = () => this.quill.toggleList('bullet');
    protected readonly listMenuItems: MenuButtonItem[] = [
        { icon: 'text_number_list_ltr', label: 'Numbered List', action: () => this.quill.toggleList('ordered') },
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
        xeffect([this.quill.hasSelection], hasSelection => {
            if (hasSelection) this.toolbar().show();
            else this.toolbar().hide();
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
