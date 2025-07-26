import { Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import Quill from 'quill';
import { copyToClipboard } from '../../utils/clipboard-utils';
import { htmlToMarkdown, markdownToHtml } from '../../utils/markdown-utils';
import { xeffect } from '../../utils/signal-utils';
import ButtonComponent from "../button/button";
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { RichTextToolbarButton, RichTextToolbarGroupComponent } from './rich-text-toolbar-group';

type Format = 'bold' | 'italic' | 'underline' | 'strikeThrough';
type Heading = 1 | 2 | 3 | 0; // 0 for body text
type List = 'bullet' | 'numbered' | 'check';

@Component({
    selector: 'app-rich-text',
    styleUrl: './rich-text.scss',
    templateUrl: './rich-text.html',
    providers: getProviders(() => RichTextComponent),
    imports: [TranslateModule, InputLabelComponent, RichTextToolbarGroupComponent, ButtonComponent],
})
export class RichTextComponent extends InputBaseComponent<string> {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');
    readonly pattern = input<string | RegExp>('');
    readonly patternErrorMsg = input<string>();
    readonly copyable = input(false);

    protected readonly copied = signal(false);
    private readonly editor = viewChild.required('editor', { read: ElementRef });
    private readonly destroyRef = inject(DestroyRef);
    
    private quill!: Quill;
    private ignoreNextUpdate = false;

    protected readonly formatButtons: RichTextToolbarButton<Format>[] = [
        { icon: 'text_bold', action: 'bold', title: 'Bold (Ctrl+B)', shortcut: 'B' },
        { icon: 'text_italic', action: 'italic', title: 'Italic (Ctrl+I)', shortcut: 'I' },
        { icon: 'text_underline', action: 'underline', title: 'Underline (Ctrl+U)', shortcut: 'U' },
        { icon: 'text_strikethrough', action: 'strikeThrough', title: 'Strikethrough' },
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
        { icon: 'task_list_ltr', action: 'check', title: 'Check List' },
    ] as const;

    protected readonly linkButtons: RichTextToolbarButton<string>[] = [
        { icon: 'link', action: 'insertLink', title: 'Insert Link' },
    ] as const;

    constructor() {
        super();
        xeffect([this.editor], editor => {
            this.quill = new Quill(editor.nativeElement, {
                theme: 'snow',
                modules: {
                    toolbar: false, // We'll use our custom toolbar
                    keyboard: {
                        bindings: {
                            'ctrl+b': {
                                key: 'b',
                                ctrlKey: true,
                                handler: () => this.toggleFormat('bold')
                            },
                            'ctrl+i': {
                                key: 'i',
                                ctrlKey: true,
                                handler: () => this.toggleFormat('italic')
                            },
                            'ctrl+u': {
                                key: 'u',
                                ctrlKey: true,
                                handler: () => this.toggleFormat('underline')
                            }
                        }
                    }
                },
                placeholder: this.placeholder() || 'Enter text...',
                formats: ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'link', 'code']
            });
            const initialValue = this.value();
            if (initialValue) {
                const html = markdownToHtml(initialValue);
                this.quill.root.innerHTML = html;
            }

            // Listen for content changes
            this.quill.on('text-change', () => {
                if (this.ignoreNextUpdate) {
                    this.ignoreNextUpdate = false;
                    return;
                }
                this.updateValue();
            });

            // Listen for selection changes to update toolbar states
            this.quill.on('selection-change', () => {
                // Trigger change detection for toolbar button states
            });
        });
    }

    override writeValue(value: string | null): void {
        super.writeValue(value);
        if (this.quill && value !== null) {
            this.ignoreNextUpdate = true;
            const html = markdownToHtml(value);
            this.quill.root.innerHTML = html;
        }
    }

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
    }

    protected onFocus() {
        if (this.quill) {
            this.quill.focus();
        }
    }

    protected handleBlur() {
        this.onBlur.emit();
    }

    protected async copy() {
        const value = this.value();
        if (!value) return;
        copyToClipboard(value);
        this.copied.set(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.copied.set(false);
    }

    // Check if a format is currently active
    protected isFormatActive = (format: string): boolean => {
        if (!this.quill) return false;
        
        const formatMap: Record<string, string> = {
            'bold': 'bold',
            'italic': 'italic',
            'underline': 'underline',
            'strikeThrough': 'strike'
        };
        
        const quillFormat = formatMap[format] || format;
        const selection = this.quill.getSelection();
        if (!selection) return false;
        
        const formats = this.quill.getFormat(selection);
        return !!formats[quillFormat];
    }

    // Check if a heading level is active
    protected isHeadingActive = (level: number): boolean => {
        if (!this.quill) return false;
        
        const selection = this.quill.getSelection();
        if (!selection) return false;
        
        const formats = this.quill.getFormat(selection);
        const headerLevel = formats['header'];
        
        if (level === 0) {
            return !headerLevel; // No header means it's body text
        }
        
        return headerLevel === level;
    }

    // Format as heading
    formatHeading(level: number) {
        if (!this.quill) return;
        
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        if (level === 0) {
            // Convert to paragraph (remove header)
            this.quill.format('header', false);
        } else {
            // Apply header level
            this.quill.format('header', level);
        }
        
        this.updateValue();
    }

    // Insert link
    insertLink() {
        if (!this.quill) return;
        
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const url = prompt('Enter URL:');
        if (url) {
            if (selection.length > 0) {
                // Text is selected, create link with selected text
                this.quill.format('link', url);
            } else {
                // No text selected, insert URL as both text and link
                this.quill.insertText(selection.index, url, 'link', url);
            }
        }
        
        this.updateValue();
    }

    // Toggle format
    toggleFormat(command: string) {
        if (!this.quill) return;
        
        const formatMap: Record<string, string> = {
            'bold': 'bold',
            'italic': 'italic',
            'underline': 'underline',
            'strikeThrough': 'strike'
        };
        
        const quillFormat = formatMap[command] || command;
        const isActive = this.isFormatActive(command);
        
        this.quill.format(quillFormat, !isActive);
        this.updateValue();
    }

    // Execute list commands
    execCommand(command: string) {
        if (!this.quill) return;
        
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const formats = this.quill.getFormat(selection);
        
        switch (command) {
            case 'bullet':
                const isBulletList = formats['list'] === 'bullet';
                this.quill.format('list', isBulletList ? false : 'bullet');
                break;
            case 'numbered':
                const isOrderedList = formats['list'] === 'ordered';
                this.quill.format('list', isOrderedList ? false : 'ordered');
                break;
            case 'check':
                // Note: Quill doesn't have built-in checkbox list support
                // You might need to add a custom module for this
                const isCheckList = formats['list'] === 'check';
                this.quill.format('list', isCheckList ? false : 'bullet');
                break;
        }
        
        this.updateValue();
    }

    private updateValue() {
        if (!this.quill) return;
        
        const html = this.quill.root.innerHTML;
        const markdown = htmlToMarkdown(html);
        
        // Check character limit
        if (this.characterLimit() && markdown.length > this.characterLimit()) {
            // Restore previous content if character limit exceeded
            const previousMarkdown = this.value() || '';
            this.ignoreNextUpdate = true;
            this.quill.root.innerHTML = markdownToHtml(previousMarkdown);
            return;
        }
        
        this.value.set(markdown);
        this.emitChange();
    }

    override validate(control: AbstractControl): ValidationErrors | null {
        const errors = super.validate(control) || {};
        const value = this.value();
        
        // Validate against pattern if provided
        const pattern = this.pattern();
        if (pattern && value) {
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            if (!regex.test(value)) {
                errors['pattern'] = {
                    requiredPattern: pattern.toString(),
                    actualValue: value,
                    message: this.patternErrorMsg() || 'Invalid format'
                };
            }
        }
        
        return Object.keys(errors).length ? errors : null;
    }
}
