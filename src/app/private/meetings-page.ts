import { Component, inject } from '@angular/core';
import { Agenda } from '../modules/agenda/agenda';
import AsyncButtonComponent from "../shared/form/button/async/async-button";
import { PageComponent } from '../shared/page/page';
import { SupabaseService } from '../shared/supabase.service';
import { firstFreeIndex } from '../shared/utils/dict-utils';
import { ListComponent } from "../shared/widget/list/list";

@Component({
    selector: 'app-meetings-page',
    template: `
        <span class="display-text">Sitzungen</span>
        <p>Meetings component content goes here.</p>
        <!-- <div class="column gap-1">
            @for (agenda of agendas(); track agenda.id) {
                <div class="card canvas-card">
                    ID: {{agenda.id}}
                </div>
            }
        </div> -->
        
        <app-list [items]="agendas()">
            <ng-template let-agenda>
                <div class="card canvas-card">
                    <h3>{{ agenda.name }}</h3>
                    <p>{{ agenda.id }}</p>
                </div>
            </ng-template>
        </app-list>
        <app-async-button icon="add" type="form" [onClick]="addAgenda"></app-async-button>
    `,
    styleUrls: ['../shared/page/page.scss'],
    host: { class: 'narrow' },
    imports: [AsyncButtonComponent, ListComponent],
})
export class MeetingsPageComponent extends PageComponent {

    private readonly supabaseService = inject(SupabaseService);

    protected readonly agendas = this.supabaseService.collection.agenda.asSignal();
    
    protected addAgenda = async () => {
        const agendas = await this.supabaseService.collection.agenda.getAllById()
        const firstFreeId = firstFreeIndex(agendas);
        const { data } = await this.supabaseService.client
            .from('agenda')
            .insert(<Agenda.Insert>{
                id: firstFreeId,
                name: "",
                unit: 18,
            })
            .throwOnError();
    }
}