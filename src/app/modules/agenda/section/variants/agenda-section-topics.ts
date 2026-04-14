import { AgendaItemViewService } from '@/modules/agenda/item/agenda-item-view.service';
import { Component, inject, input } from '@angular/core';
import { AgendaItemList } from '../agenda-item-list';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-topics',
    template: `
        <h1 class="mb-3">{{ agendaItemView.topic.namePlural() }}</h1>
        <app-agenda-item-list [agendaId]="section().agenda" [types]="['topic']"/>
    `,
    imports: [AgendaItemList],
})
export class AgendaSectionTopics {

    protected readonly agendaItemView = inject(AgendaItemViewService);
    
    readonly section = input.required<AgendaSection.Row>();
}