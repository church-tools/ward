import { Component, input } from '@angular/core';
import { RichTextComponent } from "../../../shared/form/rich-text/rich-text";
import { AgendaSection } from './agenda-section';
import { SupaSyncedDirective } from '../../../shared/utils/supa-sync/supa-synced.directive';

@Component({
    selector: 'app-agenda-section-text',
    template: `
        <app-rich-text supaSynced="agenda_section" [row]="section()" column="text_content">
    `,
    imports: [RichTextComponent, SupaSyncedDirective],
})
export class AgendaSectionTextComponent {
    
    readonly section = input.required<AgendaSection.Row>();

}