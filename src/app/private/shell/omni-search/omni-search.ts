import { Component, inject, Injector, OnDestroy, signal, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Database } from '../../../../../database';
import { Row } from '../../../modules/shared/table.types';
import { getViewService } from '../../../modules/shared/view.service';
import { SelectComponent, SelectOption } from '../../../shared/form/select/select';
import { IconComponent } from "../../../shared/icon/icon";
import { SupabaseService } from '../../../shared/service/supabase.service';
import { WindowService } from '../../../shared/service/window.service';
import { IDBFilterBuilder } from '../../../shared/utils/supa-sync/idb/idb-filter-builder';

type SearchedTableNames = 'member' | 'agenda_item';

@Component({
    selector: 'app-omni-search',
    template: `
        <app-select class="omni-search-select"
            placeholder="{{ 'SEARCH' | translate }}"
            [options]="getOptions">
            <app-icon icon="search" size="sm"/>
        </app-select>
    `,
    imports: [TranslateModule, SelectComponent, IconComponent],
    styleUrl: './omni-search.scss',
})
export class OmniSearchComponent implements OnDestroy {

    private readonly windowService = inject(WindowService);
    private readonly supabase = inject(SupabaseService);
    private readonly injector = inject(Injector);

    private readonly tableQueryBuilders = {
        member: () =>  this.supabase.sync.from('member').find(),
        agenda_item: () => this.supabase.sync.from('agenda_item').find(),
    } as const;
    private readonly searchedTables = signal<Set<SearchedTableNames>>(new Set(['member', 'agenda_item']));
    private readonly select = viewChild.required(SelectComponent);
    private readonly keySubscription: Subscription;

    constructor() {
        this.keySubscription = this.windowService.onCtrlAndKeyPressed('f')
            .subscribe(() => this.select()?.focusInput());
    }

    ngOnDestroy() {
        this.keySubscription.unsubscribe();
    }

    protected getOptions = async (search: string) => {
        if (!search) return [];
        const tablesAndBuilders = [...this.searchedTables()].map(table => [table, this.tableQueryBuilders[table]] as const);
        let results = (await Promise.all(tablesAndBuilders.map(
            ([table, builder]) => this.searchTable(table, builder().startsWith(search).get())))).flat();
        if (results.length) return results;
        results = (await Promise.all(tablesAndBuilders.map(
            ([table, builder]) => this.searchTable(table, builder().containsText(search).get())))).flat();
        if (results.length) return results;
        results = (await Promise.all(tablesAndBuilders.map(
            ([table, builder]) => this.searchTable(table, builder().closestText(search, 10).get())))).flat();
        return results;
    }

    private async searchTable<T extends 'member' | 'agenda_item'>(tableName: T, resultProm: Promise<Row<T>[]>) {
        const [items, viewService] = await Promise.all([resultProm, getViewService(this.injector, tableName)]);
        return items.map(item => ({
            view: viewService.toString(item),
            value: { table: tableName, id: item.id },
            id: `${tableName}-${item.id}`,
        }));
    }
}