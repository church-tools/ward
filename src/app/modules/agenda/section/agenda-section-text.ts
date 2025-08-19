import { Component, inject, input } from '@angular/core';
import { RichTextComponent } from "../../../shared/form/rich-text/rich-text";
import { SupabaseService } from '../../../shared/service/supabase.service';
import { SupaSyncedDirective } from '../../../shared/utils/supa-sync/supa-synced.directive';
import { AgendaSection } from './agenda-section';

@Component({
    selector: 'app-agenda-section-text',
    template: `
        <app-rich-text [supaSynced]="fromTable" [row]="section()" column="text_content">
    `,
    imports: [RichTextComponent, SupaSyncedDirective],
})
export class AgendaSectionTextComponent {

    private readonly supabase = inject(SupabaseService);
    protected readonly fromTable = this.supabase.sync.from('agenda_section');

    readonly section = input.required<AgendaSection.Row>();

}