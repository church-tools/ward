import { Component, inject } from '@angular/core';
import { AgendaService } from '../../modules/agenda/agenda.service';
import { PrivatePageComponent } from '../shared/private-page';

@Component({
    selector: 'app-agenda-page',
    template: `
        <span class="h0">??</span>
        Test
        <!-- <app-row-card-list tableName="agenda" [editable]="editMode()" [gap]="4"/> -->
    `,
    styleUrls: ['../../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [],
})
export class AgendaPageComponent extends PrivatePageComponent {

    private readonly agendaService = inject(AgendaService);

    protected readonly agendas = this.agendaService.manyAsSignal();
    
}