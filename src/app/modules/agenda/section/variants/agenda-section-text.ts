import { Component, inject, model } from '@angular/core';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { SupabaseService } from '../../../../shared/service/supabase.service';
import { SupaSyncedRow } from '../../../../shared/utils/supa-sync/supa-synced-row';
import { SyncedFieldDirective } from '../../../../shared/utils/supa-sync/synced-field.directive';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-text',
    template: `
        <app-rich-text #richtextInput [syncedRow]="syncedSection" column="content"
            [class.subtle]="richtextInput.value()"/>
    `,
    imports: [RichTextComponent, SyncedFieldDirective],
})
export class AgendaSectionTextComponent {

    private readonly supabase = inject(SupabaseService);

    readonly section = model.required<AgendaSection.Row>();
    protected readonly syncedSection = SupaSyncedRow.fromRow(this.supabase.sync.from('agenda_section'), this.section);
}