import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { asyncComputed, xcomputed } from '../../../shared/utils/signal-utils';
import { AgendaSection } from './agenda-section';
import { SupabaseService } from '../../../shared/service/supabase.service';

@Component({
    selector: 'app-agenda-section-prayer',
    template: `
        <h1>
            @if (isFirst()) {
                {{ "AGENDA_SECTION_TYPE.OPENING_PRAYER" | translate }}
            } @else if (isLast()) {
                {{ "AGENDA_SECTION_TYPE.CLOSING_PRAYER" | translate }}
            } @else {
                {{ "AGENDA_SECTION_TYPE.PRAYER" | translate }}
            }
        </h1>
    `,
    imports: [TranslateModule],
})
export class AgendaSectionPrayerComponent {

    protected readonly supabase = inject(SupabaseService);
    
    readonly section = input.required<AgendaSection.Row>();
    
    protected readonly allPrayerIds = asyncComputed([this.section],
        section => this.supabase.sync.from('agenda_section').find()
            .eq('type', 'prayer')
            .eq('agenda', section!.agenda)
            .getKeys());
    protected readonly isFirst = xcomputed([this.section, this.allPrayerIds],
        (section, prayerIds) => prayerIds?.[0] === section.id);
    protected readonly isLast = xcomputed([this.section, this.allPrayerIds],
        (section, prayerIds) => prayerIds?.[prayerIds.length - 1] === section.id);
}
