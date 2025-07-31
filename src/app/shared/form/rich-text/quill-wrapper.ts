import { ElementRef, EventEmitter, Signal, signal, WritableSignal } from "@angular/core";
import Quill, { Range } from "quill";
import { xcomputed, xeffect } from "../../utils/signal-utils";
import { AsyncState } from "../../utils/async-state";

export type Format = 'bold' | 'italic' | 'underline' | 'strike';
export type Heading = 1 | 2 | 3 | false;
export type List = 'bullet' | 'numbered';

const TOOLBAR_WIDTH = 450;
const HALF_TOOLBAR_WIDTH = TOOLBAR_WIDTH / 2;

export class QuillWrapper {

    public onChange = new EventEmitter<string>();

    
    private readonly selectionPosition = signal<[number, number] | null>(null);
    private readonly hasFocus = signal(false);
    readonly popoverPosition = xcomputed([this.selectionPosition, this.hasFocus],
        (hasSelection, hasFocus) => hasFocus ? hasSelection : null);

    private readonly quill = new AsyncState<Quill>();
    private ignoreNextUpdate = false;

    constructor(elemSignal: Signal<ElementRef<HTMLDivElement>>,
        private readonly characterLimit: Signal<number>) {
        xeffect([elemSignal], elem => {
            const quill = new Quill(elem.nativeElement, {
                modules: {
                    toolbar: false,
                    keyboard: {
                        bindings: {
                            bold: { key: 'B', ctrlKey: true, handler: () => this.toggleFormat('bold') },
                            italic: { key: 'I', ctrlKey: true, handler: () => this.toggleFormat('italic') },
                            underline: { key: 'U', ctrlKey: true, handler: () => this.toggleFormat('underline') }
                        }
                    },
                },
                formats: ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'link']
            });
            this.quill.set(quill);
            quill.on('text-change', () => {
                if (this.ignoreNextUpdate) {
                    this.ignoreNextUpdate = false;
                    return;
                }
                this.updateValue();
            });

            quill.on('selection-change', (selection: Range | null) => {
                if (!selection?.length) {
                    this.selectionPosition.set(null);
                    return;
                }
                const bounds = quill.getBounds(selection.index, selection.length);
                if (!bounds) {
                    this.selectionPosition.set(null);
                    return;
                }
                const boxBounds = elem.nativeElement.getBoundingClientRect();
                const left = this.clamp(bounds.left + (bounds.width / 2),
                    HALF_TOOLBAR_WIDTH, boxBounds.width - HALF_TOOLBAR_WIDTH);
                const top = bounds.top - 60;
                this.selectionPosition.set([Math.round(left), Math.round(top)]);
            });
            quill.editor.scroll.domNode.addEventListener('focus', () => this.hasFocus.set(true));
            quill.editor.scroll.domNode.addEventListener('blur', () => {
                quill.setSelection(null);
                this.selectionPosition.set(null);
                this.hasFocus.set(false);
            });
        });
    }

    async setContent(content: string) {
        const quill = await this.quill.get();
        this.ignoreNextUpdate = true;
        quill.root.innerHTML = content;
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

    indent = async (indent: '+1' | '-1') => {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        const formats = quill.getFormat(selection);
        quill.format('indent', indent);
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
            case 'numbered':
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
        const html = quill.root.innerHTML;

        if (this.characterLimit()) {
            const textLength = quill.getText().length;
            if (textLength > this.characterLimit()) {
                this.ignoreNextUpdate = true;
                return;
            }
        }
        this.onChange.emit(html);
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }
}