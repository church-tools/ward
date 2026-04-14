import { AgendaItemViewService } from '@/modules/agenda/item/agenda-item-view.service';
import { Component, inject, input } from '@angular/core';
import { AgendaItemList } from '../agenda-item-list';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-resolutions',
    template: `
        <h1 class="mb-3">{{ agendaItemView.resolution.namePlural() }}</h1>
        <app-agenda-item-list [agendaId]="section().agenda"
            [types]="['task', 'in_progress', 'acknowledged']"/>
    `,
    imports: [AgendaItemList],
})
export class AgendaSectionResolutions {

    protected readonly agendaItemView = inject(AgendaItemViewService);
    
    readonly section = input.required<AgendaSection.Row>();

}