import { Component, inject, input } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { RowSelect } from "@/shared/form/row-select/row-select";
import { SupabaseService } from '@/shared/service/supabase.service';
import { asyncComputed, xcomputed } from '@/shared/utils/signal-utils';
import { Agenda } from '../../agenda';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-prayer',
    template: `
        <div class="column-grid items-center">
            @let preAssign = agenda()?.pre_assign_prayer;
            <h3 class="col-md-{{preAssign ? 5 : 12}} overflow-ellipsis">{{ title() | localize }}</h3>
            @if (preAssign) {
                <app-row-select class="col-md-7" table="member"/>
            }
        </div>
    `,
    imports: [LocalizePipe, RowSelect],
})
export class AgendaSectionPrayer {

    protected readonly supabase = inject(SupabaseService);
    protected readonly table = this.supabase.sync.from('agenda_section');
    
    readonly agenda = input.required<Agenda.Row | null>();
    readonly section = input.required<AgendaSection.Row>();
    
    private readonly allPrayerIds = asyncComputed([this.section],
        section => this.supabase.sync.from('agenda_section').find()
            .eq('type', 'prayer')
            .eq('agenda', section!.agenda)
            .getKeys());

    private readonly isFirst = xcomputed([this.section, this.allPrayerIds],
        (section, prayerIds) => prayerIds?.[0] === section.id);
    private readonly isLast = xcomputed([this.section, this.allPrayerIds],
        (section, prayerIds) => prayerIds?.[prayerIds.length - 1] === section.id);

    protected readonly title = xcomputed([this.isFirst, this.isLast],
        (isFirst, isLast) => 'AGENDA_SECTION_TYPE.' + (isFirst ? 'OPENING_PRAYER' : isLast ? 'CLOSING_PRAYER' : 'PRAYER'));
}
