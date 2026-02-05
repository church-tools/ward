import { ElementRef, EventEmitter, Signal, signal } from "@angular/core";
import Quill, { Range } from "quill";
import { PALETTE_COLORS } from "../../utils/color-utils";
import { AsyncState } from "../../utils/async-state";
import { xeffect } from "../../utils/signal-utils";
import { HTMLString } from "./markdown-utils";
import { createClipboardColorMatcher, getPopoverOffset, normalizeHtml, preserveDeltaSpaces, setMinHeight } from "./quill-utils";
import { getSelectionFormats, markUserEditing, withSelection } from "./quill-selection-utils";

export type Format = 'bold' | 'italic' | 'underline' | 'strike';
export type Heading = 1 | 2 | 3 | false;
export type List = 'bullet' | 'ordered';

const COLOR_CLASS_SET = new Set(PALETTE_COLORS.map(c => `${c}-active`));
const BG_CLASS_SET = new Set(PALETTE_COLORS.map(c => `${c}-bg`));

const ColorClass = Quill.import('attributors/class/color') as any;
const BackgroundClass = Quill.import('attributors/class/background') as any;
ColorClass.whitelist = [...PALETTE_COLORS];
BackgroundClass.whitelist = [...PALETTE_COLORS];
Quill.register(ColorClass, true);
Quill.register(BackgroundClass, true);

export class QuillWrapper {

    public onChange = new EventEmitter<HTMLString>();

    private readonly _popoverPosition = signal<[number, number]>([0, 0]);
    public readonly popoverPosition = this._popoverPosition.asReadonly();
    private readonly _hasSelection = signal(false);
    public readonly hasSelection = this._hasSelection.asReadonly();

    private readonly quill = new AsyncState<Quill>();
    private ignoreNextUpdate = false;
    private lastEmittedHtml: string = '';
    private isUserEditing = false;
    private editingTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

    constructor(elemSignal: Signal<ElementRef<HTMLDivElement>>,
        private readonly characterLimit: Signal<number>,
        private readonly minLines: Signal<number>) {
        
        // Handle minLines changes separately - don't recreate Quill
        xeffect([elemSignal, this.minLines], (elem, minLines) => {
            if (minLines)
                setMinHeight(elem.nativeElement, minLines);
        });
        
        // Only create Quill once when the element is available
        xeffect([elemSignal], (elem) => {
            // Don't recreate if already initialized
            if (this.quill.unsafeGet()) return;
            
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
                formats: ['bold', 'italic', 'underline', 'strike', 'header', 'list', 'link', 'indent', 'color', 'background']
            });
            this.quill.set(quill);

            quill.clipboard.addMatcher(
                Node.TEXT_NODE,
                (_node, delta) => preserveDeltaSpaces(delta)
            );
            quill.clipboard.addMatcher(
                Node.ELEMENT_NODE,
                createClipboardColorMatcher(COLOR_CLASS_SET, BG_CLASS_SET)
            );
            
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
                markUserEditing(
                    () => { this.isUserEditing = true; },
                    () => { this.isUserEditing = false; },
                    this.editingTimeoutRef,
                    500
                );
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
                queueMicrotask(() => {
                    this._hasSelection.set(true);
                    const editorBounds = elem.nativeElement.getBoundingClientRect();
                    const [left, top] = getPopoverOffset(
                        editorBounds,
                        bounds,
                        window.innerWidth,
                        window.innerHeight,
                    );
                    this._popoverPosition.set([left, top]);
                });
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
        
        if (this.isUserEditing) // Skip if user is actively editing to prevent disruption
            return;
        
        // Compare normalized content to avoid unnecessary updates
        const currentHtml = quill.root.innerHTML;
        if (normalizeHtml(content) === normalizeHtml(currentHtml))
            return;
        
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
        await withSelection(this.quill.get(), (quill, selection, formats) => {
            quill.format(format, !formats[format]);
            this.updateValue();
        });
    }

    async formatHeading(level: Heading) {
        await withSelection(this.quill.get(), (quill, selection, formats) => {
            const nextLevel = formats['header'] === level ? false : level;
            quill.format('header', nextLevel);
            this.updateValue();
        });
    }

    async insertLink() {
        await withSelection(this.quill.get(), (quill, selection) => {
            const url = prompt('Enter URL:');
            if (!url) return;

            if (selection.length) {
                quill.format('link', url);
            } else {
                quill.insertText(selection.index, url, 'link', url);
            }
            this.updateValue();
        });
    }

    toggleList = async (listType: string) => {
        await withSelection(this.quill.get(), (quill, selection, formats) => {
            const isActive = formats['list'] === listType;
            quill.format('list', isActive ? null : listType);
            this.updateValue();
        });
    }

    setTextColor = async (color: string | false) => {
        await withSelection(this.quill.get(), (quill, selection) => {
            quill.format('color', color || false);
            this.updateValue();
        });
    }

    setHighlightColor = async (color: string | false) => {
        await withSelection(this.quill.get(), (quill, selection) => {
            quill.format('background', color || false);
            this.updateValue();
        });
    }

    getActiveTextColor = (): string | false => {
        const selection = getSelectionFormats(this.quill.unsafeGet());
        if (!selection) return false;
        const colorValue = selection.formats['color'] as string | undefined;
        return colorValue || false;
    }

    getActiveHighlightColor = (): string | false => {
        const selection = getSelectionFormats(this.quill.unsafeGet());
        if (!selection) return false;
        const bgValue = selection.formats['background'] as string | undefined;
        return bgValue || false;
    }

    indent = async (direction: 1 | -1) => {
        await withSelection(this.quill.get(), (quill, selection, formats) => {
            const currentIndent = typeof formats['indent'] === 'number' ? formats['indent'] : 0;
            const newIndent = Math.min(Math.max(currentIndent + direction, 0), 8);
            quill.format('indent', newIndent > 0 ? newIndent : null);
            this.updateValue();
        });
    }

    isFormatActive = (format: string) => {
        const selection = getSelectionFormats(this.quill.unsafeGet());
        if (!selection) return false;
        const formats = selection.formats;
        switch (format) {
            case 'bullet':
            case 'ordered':
                return formats['list'] === format;
            default:
                return !!formats[format];
        }
    }

    isHeadingActive = (level: Heading) => {
        const selection = getSelectionFormats(this.quill.unsafeGet());
        if (!selection) return false;
        const formats = selection.formats;
        const headerLevel = formats['header'] ?? false;
        return headerLevel === level;
    }

    private async updateValue() {
        const quill = await this.quill.get();
        const html = quill.root.innerHTML as HTMLString;

        // Skip if the HTML hasn't actually changed
        if (html === this.lastEmittedHtml) {
            return;
        }

        if (this.characterLimit()) {
            const textLength = quill.getText().length;
            if (textLength > this.characterLimit()) {
                // this.ignoreNextUpdate = true;
                return;
            }
        }
        
        this.lastEmittedHtml = html;
        this.onChange.emit(html);
    }

}