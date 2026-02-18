import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RowSelectComponent } from "../../../../shared/form/row-select/row-select";
import { SupabaseService } from '../../../../shared/service/supabase.service';
import { asyncComputed, xcomputed } from '../../../../shared/utils/signal-utils';
import { Agenda } from '../../agenda';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-prayer',
    template: `
        <div class="column-grid items-center">
            <h3 class="col-md-5 overflow-ellipsis">{{ title() | translate }}</h3>
            @if (agenda()?.pre_assign_prayer) {
                <app-row-select class="col-md-7" table="member"/>
            }
        </div>
    `,
    imports: [TranslateModule, RowSelectComponent],
})
export class AgendaSectionPrayerComponent {

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
