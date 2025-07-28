import { ElementRef, EventEmitter, Signal } from "@angular/core";
import Quill from "quill";
import { xeffect } from "../../utils/signal-utils";
import { AsyncState } from "../../utils/async-state";


export class QuillWrapper {

    public onChange = new EventEmitter<string>();

    private readonly quill = new AsyncState<Quill>();

    constructor(elemSignal: Signal<ElementRef<any>>) {
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
                    }
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

            quill.on('selection-change', (range) => {
                setTimeout(() => this.hasSelection.set(range && range.length > 0), 0);
            });

            quill.on('focus', () => {
                setTimeout(() => {
                    this.hasFocus.set(true);
                    const selection = quill.getSelection();
                    this.hasSelection.set(selection ? selection.length > 0 : false);
                }, 0);
            });
            quill.on('blur', () => {
                setTimeout(() => {
                    if (!this.quill.hasFocus()) {
                        setTimeout(() => this.hasFocus.set(false), 0);
                        this.clearSelection();
                    }
                }, 100);
            });
        });
    }

    async setContent(content: string) {
        const quill = await this.quill.get();
        quill.root.innerHTML = content;
    }

    async focus() {
        const quill = await this.quill.get();
        quill.focus({ preventScroll: true });
    }

    async setPlaceholder(placeholder: string) {
        const quill = await this.quill.get();
        quill.options.placeholder = placeholder;
    }

    private async toggleFormat(format: string) {
        const quill = await this.quill.get();
        const selection = quill.getSelection();
        if (!selection) return;
        const currentFormats = quill.getFormat(selection);
        const key = format === 'strikeThrough' ? 'strike' : format;
        quill.format(key, !currentFormats[key]);
        this.onChange.emit(quill.root.innerHTML);
    }
    
    private clearSelection() {
        this.quill.setSelection(null);
        window.getSelection()?.removeAllRanges();
        setTimeout(() => this.hasSelection.set(false), 0);
    }
}