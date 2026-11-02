import { RichText } from '@/shared/form/rich-text/rich-text';
import LinkButton from '@/shared/form/button/link/link-button';
import { Page } from '@/shared/page/page';
import { Component, signal } from '@angular/core';

@Component({
    selector: 'app-test-markdown-page',
    template: `
        <app-link-button icon="arrow_left" type="subtle" size="small" hideNewTab
            href="/test">Test pages</app-link-button>
        <span class="display-text">Markdown</span>
        <p>Dies ist eine Testseite</p>
        <app-rich-text [value]="markdownContent()" (valueChange)="markdownContent.set($event ?? '')" name="test"/>
        <p>Markdown Inhalt:</p>
        <p class="text-pre-wrap">
            {{ markdownContent() }}
        </p>
    `,
    imports: [RichText, LinkButton],
    host: { class: 'page narrow' },
})
export class TestMarkdownPage extends Page {

    protected readonly markdownContent = signal('**Bold text** and _italic text_\n\n## Heading 2\n\n- List item 1\n- List item 2');
}
