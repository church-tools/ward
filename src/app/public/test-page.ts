import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RichTextComponent } from '../shared/form/rich-text/rich-text';
import { PageComponent } from '../shared/page/page';
import { xcomputed } from '../shared/utils/signal-utils';
import { markdownToQuillHtml, quillHtmlToMarkdown } from '../shared/form/rich-text/markdown-utils';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">Test</span>
        <p>Dies ist eine Testseite</p>
        <app-rich-text [(ngModel)]="richTextContent" name="test"/>
        <app-rich-text [ngModel]="htmlContent()" name="test-out"/>
        <p>Aktueller Inhalt:</p>
        {{ richTextContent() }}
        <p>Markdown:</p>
        <p class="text-pre-wrap">
            {{ markdownContent() }}
        </p>
        <p>Converted:</p>
        <p class="text-pre-wrap">
            {{ htmlContent() }}
        </p>
            
    `,
    imports: [FormsModule, RichTextComponent],
    host: { class: 'page narrow' },
})
export class TestComponent extends PageComponent {

    protected readonly richTextContent = signal('Hier könnte Ihre Werbung stehen!');

    protected readonly markdownContent = xcomputed([this.richTextContent], content => quillHtmlToMarkdown(content));
    protected readonly htmlContent = xcomputed([this.markdownContent], content => markdownToQuillHtml(content));
}