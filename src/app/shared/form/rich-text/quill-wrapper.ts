import { ElementRef, EventEmitter, Signal, signal } from "@angular/core";
import Quill, { Range } from "quill";
import { AsyncState } from "../../utils/async-state";
import { xeffect } from "../../utils/signal-utils";
import { HTMLString } from "./markdown-utils";

export type Format = 'bold' | 'italic' | 'underline' | 'strike';
export type Heading = 1 | 2 | 3 | false;
export type List = 'bullet' | 'ordered';

export class QuillWrapper {

    public onChange = new EventEmitter<HTMLString>();

    private readonly _popoverPosition = signal<[number, number]>([0, 0]);
    public readonly popoverPosition = this._popoverPosition.asReadonly();
    private readonly _hasSelection = signal(false);
    public readonly hasSelection = this._hasSelection.asReadonly();

    private readonly quill = new AsyncState<Quill>();
    private ignoreNextUpdate = false;

    constructor(elemSignal: Signal<ElementRef<HTMLDivElement>>,
        private readonly characterLimit: Signal<number>,
        private readonly minLines: Signal<number>) {
        xeffect([elemSignal, this.minLines], (elem, minLines) => {
            // Set minimum height based on minLines on the parent container
            if (minLines)
                this.setMinHeight(elem.nativeElement, minLines);
            
            const quill = new Quill(elem.nativeElement, {
                modules: {
                    toolbar: false,
                    keyboard: {
                        bindings: {
                            bold: { key: 'B', ctrlKey: true, handler: () => this.toggleFormat('bold') },
                            italic: { key: 'I', ctrlKey: true, handler: () => this.toggleFormat('italic') },
                            underline: { key: 'U', ctrlKey: true, handler: () => this.toggleFormat('underline') },
                        }
                    },
                },
                formats: ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'link', 'indent']
            });
            this.quill.set(quill);
            
            // Make the entire container clickable to focus the editor
            elem.nativeElement.addEventListener('click', (e) => {
                if (e.target === elem.nativeElement) {
                    quill.focus();
                }
            });
            
            quill.on('text-change', () => {
                if (this.ignoreNextUpdate) {
                    this.ignoreNextUpdate = false;
                    return;
                }
                this.updateValue();
            });

            quill.on('selection-change', (selection: Range | null) => {
                if (!selection?.length) {
                    queueMicrotask(() => this._hasSelection.set(false));
                    return;
                }
                const bounds = quill.getBounds(selection.index, selection.length);
                if (!bounds) {
                    queueMicrotask(() => this._hasSelection.set(false));
                    return;
                }
                this._hasSelection.set(true);
                let left = bounds.left + (bounds.width / 2);
                // const boxBounds = elem.nativeElement.getBoundingClientRect();
                // left = this.clamp(left, HALF_TOOLBAR_WIDTH, boxBounds.width - HALF_TOOLBAR_WIDTH - 80);
                const top = bounds.top;
                this._popoverPosition.set([Math.round(left), Math.round(top)]);
            });
            // quill.editor.scroll.domNode.addEventListener('focus', () => queueMicrotask(() => this._hasSelection.set(true)));
            // quill.editor.scroll.domNode.addEventListener('blur', () => {
            //     quill.setSelection(null);
                // queueMicrotask(() => this._hasSelection.set(false));
            // });
        });
    }

    async setContent(content: string) {
        const quill = await this.quill.get();
        const currentSelection = quill.getSelection();
        const hadFocus = quill.hasFocus();
        this.ignoreNextUpdate = true;
        
        // Use Quill's clipboard to properly parse and insert HTML
        // This preserves the HTML structure better than direct innerHTML assignment
        const delta = quill.clipboard.convert({ html: content });
        quill.setContents(delta, 'silent');

        if (currentSelection && hadFocus) {
            const maxIndex = Math.max(0, quill.getLength() - 1);
            const clampedIndex = Math.min(currentSelection.index, maxIndex);
            const maxLength = Math.max(0, quill.getLength() - clampedIndex);
            const clampedLength = Math.min(currentSelection.length, maxLength);
            quill.setSelection(clampedIndex, clampedLength, 'silent');
        }
    }

    async setPlaceholder(placeholder: string) {
        const quill = await this.quill.get();
        quill.options.placeholder = placeholder;
    }

    async toggleFormat(format: string) {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        const currentFormats = quill.getFormat(selection);
        quill.format(format, !currentFormats[format]);
        this.updateValue();
    }

    async formatHeading(level: number | false) {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        const formats = quill.getFormat(selection);
        if (formats['header'] === level) level = false;
        quill.format('header', level);
        this.updateValue();
    }

    async insertLink() {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        
        const url = prompt('Enter URL:');
        if (!url) return;
        
        if (selection.length) {
            quill.format('link', url);
        } else {
            quill.insertText(selection.index, url, 'link', url);
        }
        this.updateValue();
    }

    toggleList = async (listType: string) => {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        const formats = quill.getFormat(selection);
        const isActive = formats['list'] === listType;
        quill.format('list', isActive ? null : listType);
        this.updateValue();
    }

    indent = async (direction: 1 | -1) => {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        const formats = quill.getFormat(selection);
        const currentIndent = typeof formats['indent'] === 'number' ? formats['indent'] : 0;
        const newIndent =  this.clamp(currentIndent + direction, 0, 8);
        quill.format('indent', newIndent > 0 ? newIndent : null);
        this.updateValue();
    }

    isFormatActive = (format: string) => {
        const quill = this.quill.unsafeGet();
        if (!quill) return false;
        const selection = quill.getSelection();
        if (!selection) return false;
        
        const formats = quill.getFormat(selection);
        switch (format) {
            case 'bullet':
            case 'ordered':
                return formats['list'] === format;
            default:
                return !!formats[format];
        }
    }

    isHeadingActive = (level: Heading) => {
        const quill = this.quill.unsafeGet();
        if (!quill) return false;
        const selection = quill.getSelection();
        if (!selection) return false;
        const formats = quill.getFormat(selection);
        const headerLevel = formats['header'] ?? false;
        return headerLevel === level;
    }

    private async updateValue() {
        const quill = await this.quill.get();
        const html = quill.root.innerHTML as HTMLString;

        if (this.characterLimit()) {
            const textLength = quill.getText().length;
            if (textLength > this.characterLimit()) {
                // this.ignoreNextUpdate = true;
                return;
            }
        }
        this.onChange.emit(html);
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    private setMinHeight(element: HTMLDivElement, minLines: number) {
        const lineHeight = 1.5;
        const fontSize = 14;
        const padding = 5 * 2; // input.$padding-y * 2
        const minHeight = (minLines * fontSize * lineHeight) + padding;
        element.style.minHeight = `${minHeight}px`;
    }
}