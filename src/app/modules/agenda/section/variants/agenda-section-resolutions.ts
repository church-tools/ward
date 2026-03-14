import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AgendaItemViewService } from '../../../item/agenda-item-view.service';
import { AgendaSection } from '../agenda-section';
import { AgendaItemList } from '../agenda-item-list';

@Component({
    selector: 'app-agenda-section-resolutions',
    template: `
        <h1 class="mb-3">{{ agendaItemView.resolution.namePlural | async }}</h1>
        <app-agenda-item-list [agendaId]="section().agenda"
            [types]="['task', 'in_progress', 'acknowledged']"/>
    `,
    imports: [AgendaItemList, AsyncPipe],
})
export class AgendaSectionResolutions {

    protected readonly agendaItemView = inject(AgendaItemViewService);
    
    readonly section = input.required<AgendaSection.Row>();

}