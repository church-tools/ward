import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AgendaService } from '../../../modules/agenda/agenda.service';
import { RowPageComponent } from '../../shared/row-page';

@Component({
    selector: 'app-agenda-page',
    template: `
        <span class="h0">{{title()}}</span>
        Test
        <!-- <app-row-card-list tableName="agenda" [editable]="editMode()" [gap]="4"/> -->
        <router-outlet/>
    `,
    styleUrls: ['../../../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [RouterOutlet],
})
export class AgendaPageComponent extends RowPageComponent<'agenda'> {
    
    constructor() {
        super(inject(AgendaService));
    }
}