import { Component, inject, input } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { RowSelect } from "@/shared/form/row-select/row-select";
import { SupabaseService } from '@/shared/service/supabase.service';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-spiritual-thought',
    template: `
        <div class="column-grid items-center">
            <h3 class="col-md-5 overflow-ellipsis">{{ 'AGENDA_SECTION_TYPE.SPIRITUAL_THOUGHT' | localize }}</h3>
            <app-row-select class="col-md-7" table="member"/>
        </div>
    `,
    imports: [LocalizePipe, RowSelect],
})
export class AgendaSectionSpiritualThought {

    protected readonly supabase = inject(SupabaseService);
    protected readonly table = this.supabase.sync.from('agenda_section');
    
    readonly section = input.required<AgendaSection.Row>();

}
