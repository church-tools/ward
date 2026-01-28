import { Component, ElementRef, input, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PALETTE_COLORS } from '../../utils/color-utils';
import { xeffect } from '../../utils/signal-utils';
import { AnchoredPopoverComponent } from '../anchored-popover/anchored-popover';
import MenuButtonComponent from '../button/menu/menu-button';
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { HTMLString, markdownToQuillHtml, quillHtmlToMarkdown } from './markdown-utils';
import { Heading, QuillWrapper } from './quill-wrapper';
import { RichTextToolbarGroupComponent, RichTextToolbarItem } from './rich-text-toolbar-group';

@Component({
    selector: 'app-rich-text',
    styleUrl: './rich-text.scss',
    templateUrl: './rich-text.html',
    providers: getProviders(() => RichTextComponent),
    imports: [TranslateModule, InputLabelComponent, RichTextToolbarGroupComponent,
        AnchoredPopoverComponent, MenuButtonComponent],
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

    protected readonly headingMenuItems: RichTextToolbarItem<Heading>[] = [
        { icon: 'text_header_1', action: 1, title: 'Heading 1' },
        { icon: 'text_header_2', action: 2, title: 'Heading 2' },
        { icon: 'text_header_3', action: 3, title: 'Heading 3' },
        { icon: 'text_t', action: false, title: 'Body Text' },
    ];

    protected readonly listMenuItems: RichTextToolbarItem<string>[] = [
        { icon: 'text_number_list_ltr', action: 'ordered', title: 'Numbered List' },
        { icon: 'text_bullet_list_ltr', action: 'bullet', title: 'Bullet List' },
        { icon: 'task_list_ltr', action: 'check', title: 'Task List' },
    ];

    protected readonly paletteColors = PALETTE_COLORS;

    // action: () => this.quill.setTextColor(`var(--${color}-fg)`),
    // active: () => this.quill.getActiveTextColor() === `var(--${color}-fg)`
    // action: () => this.quill.setHighlightColor(`var(--${color}-fg)`),
    // active: () => this.quill.getActiveHighlightColor() === `var(--${color}-fg)`

    protected readonly indentButtons: RichTextToolbarItem<1 | -1>[] = [
        { icon: 'text_indent_increase', action: 1, title: 'Increase Indent' },
        { icon: 'text_indent_decrease', action: -1, title: 'Decrease Indent' },
    ] as const;

    protected readonly linkButtons: RichTextToolbarItem<string>[] = [
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
