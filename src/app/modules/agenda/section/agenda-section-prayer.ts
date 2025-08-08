import { Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { asyncComputed, xcomputed } from '../../../shared/utils/signal-utils';
import { AgendaSection } from './agenda-section';
import { AgendaSectionService } from './agenda-section.service';

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

    protected readonly agendaSectionService = inject(AgendaSectionService)
    
    readonly section = input.required<AgendaSection.Row>();
    
    protected readonly allPrayers = asyncComputed([this.section],
        section => this.agendaSectionService.find(
            s => s.type === 'prayer' && s.agenda === section.agenda));
    protected readonly isFirst = xcomputed([this.section, this.allPrayers],
        (section, prayers) => prayers?.[0].id === section.id);
    protected readonly isLast = xcomputed([this.section, this.allPrayers],
        (section, prayers) => prayers?.[prayers.length - 1].id === section.id);
}