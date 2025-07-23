import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { copyToClipboard } from '../../utils/clipboard-utils';
import { htmlToMarkdown, markdownToHtml } from '../../utils/markdown-utils';
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
    private readonly editorView = viewChild.required('editor', { read: ElementRef });
    
    // Track active formatting modes for toggle functionality
    protected readonly activeFormats = signal<Set<string>>(new Set());

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

    override writeValue(value: string | null): void {
        super.writeValue(value);
        // Update the editor content when value changes externally
        setTimeout(() => {
            const editor = this.editorView()?.nativeElement;
            if (editor && value !== null) {
                const html = markdownToHtml(value);
                if (editor.innerHTML !== html) {
                    editor.innerHTML = html;
                }
            }
        });
    }

    protected onClick(event: MouseEvent) {
        event.stopImmediatePropagation();
    }

    protected onFocus() {
        // Apply active formats when focusing the editor
        setTimeout(() => this.applyActiveFormats(), 0);
    }

    protected handleBlur() {
        this.onBlur.emit();
    }

    protected onInput(event: Event) {
        const target = event.target as HTMLElement;
        const html = target.innerHTML;
        const markdown = htmlToMarkdown(html);
        
        if (this.characterLimit() && markdown.length > this.characterLimit()) {
            // Restore previous content if character limit exceeded
            const previousMarkdown = this.value() || '';
            target.innerHTML = markdownToHtml(previousMarkdown);
            return;
        }
        
        this.value.set(markdown);
        this.emitChange();
    }

    protected onKeyDown(event: KeyboardEvent) {
        const isCtrl = event.ctrlKey || event.metaKey;
        
        // Handle Backspace key to remove list formatting
        if (event.key === 'Backspace') {
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
                const listItem = this.getParentListItem(selection.anchorNode);
                if (listItem) {
                    // Check if cursor is at the beginning of the list item
                    const range = selection.getRangeAt(0);
                    if (range.startOffset === 0 && range.collapsed) {
                        // Check if this is at the very beginning of the list item content
                        const isAtBeginning = this.isCursorAtListItemStart(selection, listItem);
                        if (isAtBeginning) {
                            event.preventDefault();
                            this.removeListFormatting(listItem);
                            return;
                        }
                    }
                }
            }
        }
        
        // Handle Tab key for list indentation
        if (event.key === 'Tab') {
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
                const element = selection.anchorNode.nodeType === Node.TEXT_NODE 
                    ? selection.anchorNode.parentElement 
                    : selection.anchorNode as Element;
                
                // Check if we're in a list item
                const listItem = element?.closest('li');
                if (listItem) {
                    event.preventDefault();
                    if (event.shiftKey) {
                        // Shift+Tab: outdent
                        this.outdentList();
                    } else {
                        // Tab: indent
                        this.indentList();
                    }
                    return;
                }
            }
        }
        
        // Handle keyboard shortcuts
        if (isCtrl) {
            switch (event.key.toLowerCase()) {
                case 'b':
                    event.preventDefault();
                    this.toggleFormat('bold');
                    break;
                case 'i':
                    event.preventDefault();
                    this.toggleFormat('italic');
                    break;
                case 'u':
                    event.preventDefault();
                    this.toggleFormat('underline');
                    break;
            }
        }
        
        // Prevent default Enter behavior in headings to create new paragraph
        if (event.key === 'Enter') {
            const selection = window.getSelection();
            if (selection && selection.anchorNode) {
                const element = selection.anchorNode.nodeType === Node.TEXT_NODE 
                    ? selection.anchorNode.parentElement 
                    : selection.anchorNode as Element;
                
                if (element && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
                    event.preventDefault();
                    this.execCommand('formatBlock', '<p>');
                }
            }
        }
        
        // Apply active formats for regular typing
        if (event.key.length === 1 && !isCtrl) {
            // This is a regular character being typed
            setTimeout(() => this.applyActiveFormats(), 0);
        }
    }

    protected async copy() {
        const value = this.value();
        if (!value) return;
        copyToClipboard(value);
        this.copied.set(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.copied.set(false);
    }

    // Execute rich text commands
    execCommand(command: string, value?: string) {
        document.execCommand(command, false, value);
        this.updateContent();
    }

    // Check if a format is currently active
    protected isFormatActive = (format: string) => {
        return document.queryCommandState(format);
    }

    // Check if a heading level is active
    protected isHeadingActive = (level: number): boolean => {
        const selection = window.getSelection();
        if (!selection || !selection.anchorNode) return false;
        
        const element = selection.anchorNode.nodeType === Node.TEXT_NODE 
            ? selection.anchorNode.parentElement 
            : selection.anchorNode as Element;
            
        return element?.tagName === (level ? `H${level}` : "P");
    }

    // Check if code formatting is active
    isCodeActive(): boolean {
        const selection = window.getSelection();
        if (!selection || !selection.anchorNode) return false;
        
        const element = selection.anchorNode.nodeType === Node.TEXT_NODE 
            ? selection.anchorNode.parentElement 
            : selection.anchorNode as Element;
            
        return element?.tagName === 'CODE';
    }

    // Format as heading
    formatHeading(level: number) {
        const selection = window.getSelection();
        if (!selection || !selection.anchorNode) return;
        
        const element = selection.anchorNode.nodeType === Node.TEXT_NODE 
            ? selection.anchorNode.parentElement 
            : selection.anchorNode as Element;
        
        // Find the block element (paragraph, heading, etc.)
        let blockElement = element;
        while (blockElement && !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(blockElement.tagName)) {
            blockElement = blockElement.parentElement;
        }
        
        if (!blockElement || blockElement === this.editorView().nativeElement) return;
        
        if (this.isHeadingActive(level)) {
            // Convert heading to paragraph
            const newP = document.createElement('p');
            newP.innerHTML = blockElement.innerHTML;
            blockElement.parentElement?.replaceChild(newP, blockElement);
            
            // Restore cursor position
            this.restoreCursorInElement(newP);
        } else {
            // Convert to heading (from paragraph or other heading)
            const newHeading = document.createElement(`h${level}`);
            newHeading.innerHTML = blockElement.innerHTML;
            blockElement.parentElement?.replaceChild(newHeading, blockElement);
            
            // Restore cursor position
            this.restoreCursorInElement(newHeading);
        }
        
        this.updateContent();
    }

    // Toggle code formatting
    toggleCode() {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        
        if (this.isCodeActive()) {
            // Remove code formatting
            this.execCommand('removeFormat');
        } else {
            // Add code formatting
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            const codeElement = document.createElement('code');
            codeElement.textContent = selectedText;
            range.deleteContents();
            range.insertNode(codeElement);
            selection.removeAllRanges();
        }
        this.updateContent();
    }

    // Insert link
    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            this.execCommand('createLink', url);
        }
    }

    // Toggle format with mode support
    toggleFormat(command: string) {
        const selection = window.getSelection();
        const editor = this.editorView().nativeElement;
        
        if (selection && !selection.isCollapsed) {
            // Text is selected - apply formatting to selection
            this.execCommand(command);
        } else {
            // No text selected - toggle mode
            const currentFormats = this.activeFormats();
            const newFormats = new Set<string>(currentFormats);
            
            if (newFormats.has(command)) {
                newFormats.delete(command);
            } else {
                newFormats.add(command);
            }
            
            this.activeFormats.set(newFormats);
            
            // Keep focus on the editor
            setTimeout(() => {
                if (document.activeElement !== editor) {
                    editor.focus();
                }
            }, 0);
        }
    }

    // Handle list indentation
    indentList() {
        const selection = window.getSelection();
        if (!selection) return;
        
        const listItem = this.getParentListItem(selection.anchorNode);
        if (!listItem) return;
        
        const parentList = listItem.parentElement;
        if (!parentList) return;
        
        const previousItem = listItem.previousElementSibling as HTMLLIElement;
        
        if (previousItem) {
            // Find or create a nested list in the previous item
            let nestedList = previousItem.querySelector('ul, ol') as HTMLElement;
            
            if (!nestedList) {
                // Create a new nested list of the same type as parent
                const listType = parentList.tagName.toLowerCase();
                nestedList = document.createElement(listType);
                previousItem.appendChild(nestedList);
            }
            
            // Move the current item into the nested list
            nestedList.appendChild(listItem);
        } else {
            // If there's no previous item, we can't indent, so do nothing
            return;
        }
        
        this.updateContent();
    }

    // Handle list outdenting
    outdentList() {
        const selection = window.getSelection();
        if (!selection) return;
        
        const listItem = this.getParentListItem(selection.anchorNode);
        if (!listItem) return;
        
        const parentList = listItem.parentElement;
        if (!parentList) return;
        
        // Find the parent list item that contains this nested list
        const grandParentLi = parentList.parentElement?.closest('li') as HTMLLIElement;
        
        if (grandParentLi && grandParentLi.parentElement) {
            // Move the list item to the same level as the grandparent
            const grandParentList = grandParentLi.parentElement;
            const nextSibling = grandParentLi.nextSibling;
            
            if (nextSibling) {
                grandParentList.insertBefore(listItem, nextSibling);
            } else {
                grandParentList.appendChild(listItem);
            }
            
            // Clean up empty nested lists
            if (parentList && !parentList.children.length) {
                parentList.remove();
            }
            
            this.updateContent();
        }
    }

    // Helper method to get parent list item
    private getParentListItem(node: Node | null): HTMLLIElement | null {
        if (!node) return null;
        
        let current = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
        
        while (current && current !== this.editorView().nativeElement) {
            if (current.tagName === 'LI') {
                return current as HTMLLIElement;
            }
            current = current.parentElement;
        }
        
        return null;
    }

    // Check if cursor is at the start of a list item
    private isCursorAtListItemStart(selection: Selection, listItem: HTMLLIElement): boolean {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) return false;
        
        // Get the first text node in the list item
        const walker = document.createTreeWalker(
            listItem,
            NodeFilter.SHOW_TEXT,
            null
        );
        
        const firstTextNode = walker.nextNode();
        if (!firstTextNode) return true; // Empty list item
        
        // Check if cursor is at the beginning of the first text node
        return range.startContainer === firstTextNode && range.startOffset === 0;
    }

    // Remove list formatting and convert to paragraph
    private removeListFormatting(listItem: HTMLLIElement) {
        const parentList = listItem.parentElement;
        if (!parentList) return;
        
        // Get the content of the list item
        const content = listItem.innerHTML;
        
        // Create a new paragraph element
        const paragraph = document.createElement('p');
        paragraph.innerHTML = content;
        
        // If this is the only item in the list, replace the entire list
        if (parentList.children.length === 1) {
            parentList.parentElement?.replaceChild(paragraph, parentList);
        } else {
            // Insert the paragraph before the list and remove the list item
            parentList.parentElement?.insertBefore(paragraph, parentList);
            listItem.remove();
        }
        
        // Place cursor at the beginning of the new paragraph
        const selection = window.getSelection();
        if (selection) {
            const range = document.createRange();
            range.setStart(paragraph, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        
        this.updateContent();
    }

    // Helper method to restore cursor position in an element
    private restoreCursorInElement(element: Element) {
        const selection = window.getSelection();
        if (!selection) return;
        
        try {
            const range = document.createRange();
            
            // Find the first text node in the element
            const walker = document.createTreeWalker(
                element,
                NodeFilter.SHOW_TEXT,
                null
            );
            
            const firstTextNode = walker.nextNode();
            if (firstTextNode) {
                range.setStart(firstTextNode, 0);
                range.collapse(true);
            } else {
                // If no text node, place cursor at the beginning of the element
                range.setStart(element, 0);
                range.collapse(true);
            }
            
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (e) {
            // Ignore cursor restoration errors
        }
    }

    // Apply active formats when typing
    private applyActiveFormats() {
        const formats = this.activeFormats();
        if (formats.size === 0) return;
        
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        
        // Save current selection
        const range = selection.getRangeAt(0);
        
        // Apply each active format
        formats.forEach(format => {
            if (!this.isFormatActive(format)) {
                try {
                    document.execCommand(format, false);
                } catch (e) {
                    // Ignore errors to prevent focus issues
                }
            }
        });
        
        // Restore selection if it was lost
        if (selection.rangeCount === 0 && range) {
            try {
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) {
                // Ignore selection restoration errors
            }
        }
    }

    private updateContent() {
        const html = this.editorView().nativeElement.innerHTML;
        const markdown = htmlToMarkdown(html);
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