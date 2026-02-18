import { Component, inject, input } from '@angular/core';
import { getRowRoute } from '../../../private/private.routes';
import { RowPageService } from '../../../private/row-page.service';
import { xcomputed } from '../../../shared/utils/signal-utils';
import { AgendaItem } from '../../item/agenda-item';
import { ProfileService } from '../../profile/profile.service';
import { RowCardListComponent } from '../../shared/row-card-list/row-card-list';
import { Table } from '../../shared/table.types';
import { Agenda } from '../agenda';

@Component({
    selector: 'app-agenda-item-list',
    template: `
        <app-row-card-list tableName="agenda_item" [editable]="true"
            [getQuery]="getQuery()"
            [getUrl]="getItemUrl"
            [activeId]="activeItemId()"
            [prepareInsert]="prepareItemInsert"/>
    `,
    imports: [RowCardListComponent],
    host: { class: 'full-width' },
})
export class AgendaItemListComponent {
    
    private readonly profileService = inject(ProfileService);
    private readonly rowPageService = inject(RowPageService);
    
    readonly agendaId = input.required<number>();
    readonly types = input.required<AgendaItem.type[]>();

    protected readonly getQuery = xcomputed([this.agendaId, this.types],
        (agenda, types) => ({
            query: (table: Table<'agenda_item'>) => table.find()
                .eq('agenda', agenda)
                .in('type', types),
            id: `agenda_item_${agenda}_${types.join(',')}`,
        }));
    
    protected readonly itemFilter = xcomputed([this.agendaId, this.types],
        ((agenda, types) => (item: AgendaItem.Row) => item.agenda === agenda && types.includes(item.type)));
    protected readonly activeItemId = xcomputed([this.rowPageService.openRows],
        openRows => openRows['agenda_item'] ?? null);

    protected getItemUrl = (item: AgendaItem.Row | null) => getRowRoute(item
        ? { table: 'agenda_item', row: item }
        : { table: 'agenda', row: { id: this.agendaId() } as Agenda.Row });
    
    protected prepareItemInsert = async (item: AgendaItem.Insert) => {
        item.agenda = this.agendaId();
        item.type = this.types()[0];
        item.created_by ??= (await this.profileService.own.asPromise()).id;
    }
}