import { Component, inject, input } from '@angular/core';
import { RichTextComponent } from "../../../shared/form/rich-text/rich-text";
import { AgendaSection } from './agenda-section';
import { SupaSyncedDirective } from '../../../shared/utils/supa-sync/supa-synced.directive';
import { AgendaSectionService } from './agenda-section.service';

@Component({
    selector: 'app-agenda-section-text',
    template: `
        <app-rich-text [supaSynced]="agendaSectionService" [row]="section()" column="text_content">
    `,
    imports: [RichTextComponent, SupaSyncedDirective],
})
export class AgendaSectionTextComponent {

    protected readonly agendaSectionService = inject(AgendaSectionService)
    
    readonly section = input.required<AgendaSection.Row>();

}