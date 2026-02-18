import { Component, inject, Injector, OnDestroy, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AgendaItem } from '../../../modules/item/agenda-item';
import { Row } from '../../../modules/shared/table.types';
import { getViewService } from '../../../modules/shared/view.service';
import { SelectComponent } from '../../../shared/form/select/select';
import { IconComponent } from "../../../shared/icon/icon";
import { SupabaseService } from '../../../shared/service/supabase.service';
import { WindowService } from '../../../shared/service/window.service';

type SearchedTableName = 'member' | 'agenda_item';
type SearchValue<T extends SearchedTableName> = { table: T; row: Row<T> };

@Component({
    selector: 'app-omni-search',
    template: `
        <app-select class="omni-search-select"
            placeholder="{{ 'SEARCH' | translate }}"
            [options]="getOptions"
            [onGroupClick]="onGroupClick"
            (valueChange)="navigateTo($event)"
            [holdsValue]="false"
            [mapSearch]="mapSearch">
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
    private readonly translate = inject(TranslateService);
    private readonly router = inject(Router);

    private readonly tableQueryBuilders = {
        member: () =>  this.supabase.sync.from('member').find(),
        agenda_item: () => this.supabase.sync.from('agenda_item').find(),
    } as const;
    private readonly searchedTables = signal<Set<SearchedTableName>>(new Set(['member', 'agenda_item']));
    private readonly select = viewChild.required(SelectComponent<SearchValue<SearchedTableName>>);
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
        const { search: normalizedSearch, scopedTable } = this.parseSearch(search);
        if (!normalizedSearch) return [];
        const searchedTables = scopedTable ? [scopedTable] : [...this.searchedTables()];
        const tablesAndBuilders = searchedTables.map(table => [table, this.tableQueryBuilders[table]] as const);
        let results = (await Promise.all(tablesAndBuilders.map(
            ([table, builder]) => this.searchTable(table, builder().startsWith(normalizedSearch).get())))).flat();
        if (results.length) return results;
        results = (await Promise.all(tablesAndBuilders.map(
            ([table, builder]) => this.searchTable(table, builder().containsText(normalizedSearch).get())))).flat();
        if (results.length) return results;
        results = (await Promise.all(tablesAndBuilders.map(
            ([table, builder]) => this.searchTable(table, builder().closestText(normalizedSearch, 10).get())))).flat();
        return results;
    }

    protected onGroupClick = ({ label }: { id: string; label: string }) => {
        const search = this.select().getSearch();
        this.select().setSearch(`${label}: ${search}`);
    }

    protected navigateTo(value: SearchValue<SearchedTableName> | null) {
        if (!value) return;
        this.router.navigate([this.getPath(value.table, value.row)]);
    }

    protected mapSearch = (search: string) => {
        const { search: normalizedSearch } = this.parseSearch(search);
        return normalizedSearch;
    }

    private async searchTable<T extends 'member' | 'agenda_item'>(tableName: T, resultProm: Promise<Row<T>[]>) {
        const [rows, viewService] = await Promise.all([resultProm, getViewService(this.injector, tableName)]);
        const label = this.getTableLabel(tableName);
        return rows.filter(Boolean).map(row => ({
            view: viewService.toString(row),
            value: { table: tableName, row },
            id: `${tableName}-${row.id}`,
            group: {
                id: tableName,
                label,
            },
        }));
    }

    private parseSearch(search: string): { search: string; scopedTable: SearchedTableName | null } {
        search = search.trim().toLocaleLowerCase();
        if (search?.length < 2) return { search: '', scopedTable: null };
        const match = search.match(/^([a-zA-Z_]+):?/);
        if (!match) return { search, scopedTable: null };
        const scopedTable = this.parseScopedTable(match[1]);
        if (!scopedTable) return { search, scopedTable: null };
        return { search: search.substring(match[0].length).trim(), scopedTable };
    }

    private parseScopedTable(tableLabel: string): SearchedTableName | null {
        tableLabel = tableLabel.toLowerCase();
        for (const table of this.searchedTables())
            if (this.getTableLabel(table).toLowerCase() === tableLabel)
                return table;
        return null;
    }

    private getTableLabel(table: SearchedTableName) {
        const label = this.translate.instant('VIEW.' + table.toUpperCase());
        if (!label) throw new Error(`Missing translation key VIEW.${table.toUpperCase()}`);
        return label;
    }

    private getPath<T extends SearchedTableName>(table: T, row: Row<T>) {
        switch (table) {
            case 'member': return `/members/${row.id}`;
            case 'agenda_item': return `/meetings/agenda/${(row as AgendaItem.Row).agenda}/${row.id}`;
        }
    }
}