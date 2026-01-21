import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AgendaItemViewService } from '../../../item/agenda-item-view.service';
import { AgendaItemListComponent } from '../agenda-item-list';
import { AgendaSection } from '../agenda-section';

@Component({
    selector: 'app-agenda-section-suggestions',
    template: `
        <h1 class="mb-3">{{ agendaItemView.suggestion.namePlural | async }}</h1>
        <app-agenda-item-list [agendaId]="section().agenda" [types]="['suggestion']"/>
    `,
    imports: [AgendaItemListComponent, AsyncPipe],
})
export class AgendaSectionSuggestionsComponent {

    protected readonly agendaItemView = inject(AgendaItemViewService);
    
    readonly section = input.required<AgendaSection.Row>();
}