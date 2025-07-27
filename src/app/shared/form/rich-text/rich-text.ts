import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, inject, input, OnDestroy, signal, TemplateRef, viewChild, ViewContainerRef } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import Quill from 'quill';
import { copyToClipboard } from '../../utils/clipboard-utils';
import { xeffect } from '../../utils/signal-utils';
import ButtonComponent from "../button/button";
import { getProviders, InputBaseComponent } from '../shared/input-base';
import InputLabelComponent from "../shared/input-label";
import { RichTextToolbarButton, RichTextToolbarGroupComponent } from './rich-text-toolbar-group';

type Format = 'bold' | 'italic' | 'underline' | 'strikeThrough';
type Heading = 1 | 2 | 3 | 0;
type List = 'bullet' | 'numbered';

/**
 * Rich Text Editor with floating toolbar that appears on text selection
 */
@Component({
    selector: 'app-rich-text',
    styleUrl: './rich-text.scss',
    templateUrl: './rich-text.html',
    providers: getProviders(() => RichTextComponent),
    imports: [TranslateModule, InputLabelComponent, RichTextToolbarGroupComponent, ButtonComponent],
    host: {
        class: 'column'
    }
})
export class RichTextComponent extends InputBaseComponent<string> implements OnDestroy {
    
    readonly characterLimit = input<number>(0);
    readonly autocomplete = input<string>('off');
    readonly copyable = input(false);

    protected readonly copied = signal(false);
    protected readonly hasSelection = signal(false);
    protected readonly hasFocus = signal(false);
    private readonly editor = viewChild.required('editor', { read: ElementRef });
    private readonly toolbarTemplate = viewChild.required<TemplateRef<any>>('toolbarTemplate');
    private readonly overlay = inject(Overlay);
    private readonly viewContainerRef = inject(ViewContainerRef);
    
    private quill!: Quill;
    private ignoreNextUpdate = false;
    private toolbarOverlayRef: OverlayRef | null = null;
    private toolbarPortal: TemplatePortal | null = null;

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
                    toolbar: false,
                    keyboard: {
                        bindings: {
                            bold: { key: 'B', ctrlKey: true, handler: () => this.toggleFormat('bold') },
                            italic: { key: 'I', ctrlKey: true, handler: () => this.toggleFormat('italic') },
                            underline: { key: 'U', ctrlKey: true, handler: () => this.toggleFormat('underline') }
                        }
                    }
                },
                placeholder: this.placeholder() || 'Enter text...',
                formats: ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'link']
            });
            
            if (this.value()) this.quill.root.innerHTML = this.value()!;

            // Event handlers with deferred signal updates
            this.quill.on('text-change', () => {
                if (this.ignoreNextUpdate) {
                    this.ignoreNextUpdate = false;
                    return;
                }
                this.updateValue();
            });

            this.quill.on('selection-change', (range) => {
                setTimeout(() => this.hasSelection.set(range && range.length > 0), 0);
            });

            this.quill.on('focus', () => {
                setTimeout(() => {
                    this.hasFocus.set(true);
                    const selection = this.quill.getSelection();
                    this.hasSelection.set(selection ? selection.length > 0 : false);
                }, 0);
            });

            this.quill.on('blur', () => {
                setTimeout(() => {
                    if (!this.quill.hasFocus()) {
                        setTimeout(() => this.hasFocus.set(false), 0);
                        this.clearSelection();
                    }
                }, 100);
            });
        });

        // Show/hide toolbar based on selection and focus
        xeffect([this.hasSelection, this.hasFocus], (hasSelection, hasFocus) => {
            const shouldShow = hasSelection && hasFocus;
            if (shouldShow && !this.toolbarOverlayRef) {
                this.createToolbarOverlay();
            } else if (!shouldShow && this.toolbarOverlayRef) {
                this.closeToolbarOverlay();
            }
        });
    }

    override writeValue(value: string | null): void {
        super.writeValue(value);
        if (this.quill && value !== null) {
            this.ignoreNextUpdate = true;
            this.quill.root.innerHTML = value || '';
        }
    }

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
        if (this.quill) setTimeout(() => this.hasFocus.set(true), 0);
    }

    protected onFocus() {
        if (this.quill) {
            this.quill.focus();
            setTimeout(() => this.hasFocus.set(true), 0);
        }
    }

    protected handleBlur() {
        this.onBlur.emit();
    }

    private clearSelection() {
        if (!this.quill) return;
        this.quill.setSelection(null);
        window.getSelection()?.removeAllRanges();
        setTimeout(() => this.hasSelection.set(false), 0);
    }

    protected async copy() {
        if (!this.quill) return;
        const text = this.quill.getText();
        if (!text.trim()) return;
        
        copyToClipboard(text);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 3000);
    }

    protected isFormatActive = (format: string): boolean => {
        if (!this.quill) return false;
        const selection = this.quill.getSelection();
        if (!selection) return false;
        
        const formats = this.quill.getFormat(selection);
        switch (format) {
            case 'strikeThrough':
                return !!formats['strike'];
            case 'bullet':
                return formats['list'] === 'bullet';
            case 'numbered':
                return formats['list'] === 'ordered';
            default:
                return !!formats[format];
        }
    }

    protected isHeadingActive = (level: number): boolean => {
        if (!this.quill) return false;
        const selection = this.quill.getSelection();
        if (!selection) return false;
        
        const formats = this.quill.getFormat(selection);
        const headerLevel = formats['header'];
        
        // Handle the case where level 0 means "no header" (body text)
        if (level === 0) {
            return !headerLevel || headerLevel === false;
        }
        
        return headerLevel === level;
    }

    formatHeading(level: number) {
        if (!this.quill) return;
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const formats = this.quill.getFormat(selection);
        const currentHeader = formats['header'];
        
        // If clicking the same heading level, remove it (toggle to body text)
        if (currentHeader === level && level > 0) {
            this.quill.format('header', false);
        } else {
            // Apply the new heading level (or remove heading if level is 0)
            this.quill.format('header', level === 0 ? false : level);
        }
        
        this.updateValue();
    }

    insertLink() {
        if (!this.quill) return;
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const url = prompt('Enter URL:');
        if (!url) return;
        
        if (selection.length > 0) {
            this.quill.format('link', url);
        } else {
            this.quill.insertText(selection.index, url, 'link', url);
        }
        this.updateValue();
    }

    toggleFormat(format: string) {
        if (!this.quill) return;
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const currentFormats = this.quill.getFormat(selection);
        const key = format === 'strikeThrough' ? 'strike' : format;
        this.quill.format(key, !currentFormats[key]);
        this.updateValue();
    }

    execCommand(command: string) {
        if (!this.quill) return;
        const selection = this.quill.getSelection();
        if (!selection) return;
        
        const formats = this.quill.getFormat(selection);
        const listType = command === 'bullet' ? 'bullet' : 'ordered';
        const isActive = formats['list'] === listType;
        this.quill.format('list', isActive ? false : listType);
        this.updateValue();
    }

    private updateValue() {
        if (!this.quill) return;
        const html = this.quill.root.innerHTML;
        
        if (this.characterLimit()) {
            const textLength = this.quill.getText().length;
            if (textLength > this.characterLimit()) {
                this.ignoreNextUpdate = true;
                this.quill.root.innerHTML = this.value() || '';
                return;
            }
        }
        
        this.value.set(html);
        this.emitChange();
    }

    ngOnDestroy() {
        this.closeToolbarOverlay();
    }

    private createToolbarOverlay() {
        const selection = this.quill?.getSelection();
        if (!selection || selection.length === 0) return;

        const range = this.quill.getBounds(selection.index, selection.length);
        if (!range) return;
        
        const editorRect = this.editor().nativeElement.getBoundingClientRect();
        const left = editorRect.left + range.left + (range.width / 2);
        const top = editorRect.top + range.top - 60;

        const positionStrategy = this.overlay.position()
            .global()
            .left(`${Math.round(left)}px`)
            .top(`${Math.round(top)}px`);

        this.toolbarOverlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
            hasBackdrop: false,
            panelClass: 'rich-text-toolbar-overlay'
        });

        this.toolbarPortal = new TemplatePortal(this.toolbarTemplate(), this.viewContainerRef);
        this.toolbarOverlayRef.attach(this.toolbarPortal);
    }

    private closeToolbarOverlay() {
        if (this.toolbarOverlayRef) {
            this.toolbarOverlayRef.detach();
            this.toolbarOverlayRef.dispose();
            this.toolbarOverlayRef = null;
            this.toolbarPortal = null;
        }
    }
}
