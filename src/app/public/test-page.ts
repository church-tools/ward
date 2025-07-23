import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RichTextComponent } from '../shared/form/rich-text/rich-text';
import { PageComponent } from '../shared/page/page';

@Component({
    selector: 'app-not-found-page',
    template: `
        <span class="display-text">Test</span>
        <p>Dies ist eine Testseite</p>
        <app-rich-text [(ngModel)]="richTextContent" name="test"/>
        <p>Aktueller Inhalt:</p>
        {{ richTextContent() }}
        <app-rich-text [ngModel]="richTextContent" name="test-out"/>
    `,
    imports: [FormsModule, RichTextComponent],
    host: { class: 'page narrow' },
})
export class TestComponent extends PageComponent {


    protected readonly richTextContent = signal('Hier könnte Ihre Werbung stehen!');
}