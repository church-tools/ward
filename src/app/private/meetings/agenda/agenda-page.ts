import { Component, inject } from '@angular/core';
import { AgendaService } from '../../../modules/agenda/agenda.service';
import { PrivatePageComponent } from '../../shared/private-page';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-agenda-page',
    template: `
        <span class="h0">??</span>
        Test
        <!-- <app-row-card-list tableName="agenda" [editable]="editMode()" [gap]="4"/> -->
        <router-outlet/>
    `,
    styleUrls: ['../../../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [RouterOutlet],
})
export class AgendaPageComponent extends PrivatePageComponent {

    private readonly agendaService = inject(AgendaService);
    
}