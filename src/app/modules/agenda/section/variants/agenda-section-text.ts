import { Component, inject, input } from '@angular/core';
import { Database } from '../../../../../../database';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { SupabaseService } from '../../../../shared/service/supabase.service';
import { SyncedFieldDirective } from '../../../../shared/utils/supa-sync/synced-field.directive';
import { SyncedRow } from '../../../../shared/utils/supa-sync/synced-row';

@Component({
    selector: 'app-agenda-section-text',
    template: `
        <app-rich-text #richtextInput [syncedRow]="section" column="content"
            [class.subtle]="richtextInput.value()"/>
    `,
    imports: [RichTextComponent, SyncedFieldDirective],
})
export class AgendaSectionTextComponent {

    private readonly supabase = inject(SupabaseService);
    protected readonly fromTable = this.supabase.sync.from('agenda_section');

    readonly section = input.required<SyncedRow<Database, 'agenda_section'>>();

}