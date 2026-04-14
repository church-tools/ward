import { AgendaItemViewService } from '@/modules/agenda/item/agenda-item-view.service';
import { Component, inject, input } from '@angular/core';
import { AgendaItemList } from '../agenda-item-list';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-suggestions',
    template: `
        <h1 class="mb-3">{{ agendaItemView.suggestion.namePlural() }}</h1>
        <app-agenda-item-list [agendaId]="section().agenda" [types]="['suggestion']"/>
    `,
    imports: [AgendaItemList],
})
export class AgendaSectionSuggestions {

    protected readonly agendaItemView = inject(AgendaItemViewService);
    
    readonly section = input.required<AgendaSection.Row>();
}