import { Component, inject } from '@angular/core';
import { PageComponent } from '../shared/page';
import AsyncButtonComponent from "../../shared/form/button/async/async-button";
import { SupabaseService } from '../../shared/supabase.service';
import { Agenda } from '../../../../database-table.types';

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="display-text">Sitzungen</span>
        <p>Meetings component content goes here.</p>
        <app-async-button icon="add" type="form" [onClick]="addAgenda"></app-async-button>
    `,
    styleUrls: ['../shared/page.scss'],
    host: { class: 'narrow' },
    imports: [AsyncButtonComponent],
})
export class MeetingsPageComponent extends PageComponent {

    private readonly supabaseService = inject(SupabaseService);

    constructor() {
        super();
    }
    
    protected addAgenda = async () => {
        const { data: units, error } = await this.supabaseService.client
            .from('agenda')
            .select('id');
        const agendas = this.supabaseService.agenda.get();
        const firstFreeId = Math.max(0, ...Object.keys(agendas).map(Number)) + 1;
        // const { data, error } = await this.supabaseService.client
        //     .from('agenda')
        //     .insert(<Agenda>{
        //         id: firstFreeId,
        //         name: "",
        //         unit: 18,
        //     });
        // if (error) {
        //     console.error('Error adding agenda:', error);
        // }
    }
}