import { CommonModule } from "@angular/common";
import { Component, inject, Injector, input, OnDestroy, output, viewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { PageComponent } from "../../shared/page/page";
import { SupabaseService } from "../../shared/service/supabase.service";
import { PromiseOrValue } from "../../shared/types";
import { mapToSubObjects } from "../../shared/utils/array-utils";
import { asyncComputed, xcomputed, xeffect } from "../../shared/utils/signal-utils";
import { CardListComponent } from "../../shared/widget/card-list/card-list";
import { getListInsertComponent } from "./list-insert";
import { getListRowComponent } from "./list-row";
import type { Column, Insert, Row, Table, TableName, TableQuery } from "./table.types";
import { getViewService } from "./view.service";

@Component({
    selector: 'app-row-card-list',
    template: `
        @let table = this.table();
        @let rowComponent = this.rowComponent();
        @let insertComponent = this.insertComponent();
        @if (table && rowComponent && insertComponent) {
            <app-card-list
                [cardClasses]="cardsVisible() ? cardClasses() : ''"
                [reorderable]="editable() && !!table.info.orderKey"
                [editable]="editable()"
                [activeId]="activeId()"
                [gap]="gap()"
                [idKey]="table.idKey"
                [orderByKey]="table.info.orderKey"
                [getFilterText]="viewService()?.toString"
                [getUrl]="getUrl()"
                (orderChange)="onOrderChanged($event)"
                (itemDropped)="onItemDropped($event)"
                [insertRow]="insertRow"
                [dragDropGroup]="tableName()"
                (itemClick)="onRowClick($event)">
                <ng-template #itemTemplate let-row>
                    <ng-container [ngComponentOutlet]="rowComponent" 
                        [ngComponentOutletInputs]="{
                            row,
                            page: this.page(),
                            onRemove: this.removeRow.bind(this)
                        }"/>
                </ng-template>
                <ng-template #insertTemplate let-functions>   
                    <ng-container [ngComponentOutlet]="insertComponent"
                        [ngComponentOutletInputs]="{
                            insert: functions.insert,
                            cancel: functions.cancel,
                            prepareInsert: _prepareInsert.bind(this),
                            context: insertContext()
                        }"/>
                </ng-template>
            </app-card-list>
        }
    `,
    imports: [CommonModule, CardListComponent],
})
export class RowCardListComponent<T extends TableName> implements OnDestroy {

    readonly injector = inject(Injector);
    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);

    readonly tableName = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);
    readonly editable = input(false);
    readonly gap = input(2);
    readonly cardsVisible = input(true);
    readonly getUrl = input<(row: Row<T> | null) => string>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly insertContext = input<unknown>(null);
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly activeId = input<number | null>(null);
    readonly page = input<PageComponent>();
    readonly rowClicked = output<Row<T>>();

    protected readonly table = xcomputed([this.tableName], t => this.supabase.sync.from(t));
    protected readonly viewService = asyncComputed([this.tableName], t => getViewService(this.injector, t));
    protected readonly rowComponent = asyncComputed([this.tableName], t => getListRowComponent(t));
    protected readonly insertComponent = asyncComputed([this.tableName], t => getListInsertComponent(t));

    protected readonly cardListView = viewChild(CardListComponent);
    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.tableName, this.cardListView, this.getQuery],
            (tableName, cardListView, getQuery) => {
            if (!cardListView || !getQuery) return;
            this.subscription?.unsubscribe();
            const table = this.supabase.sync.from(tableName);
            this.subscription = getQuery(table).subscribe(update => {
                cardListView.updateItems({ items: update.result, deletions: update.deletions });
            });
        });
    }

    protected insertRow = async (row: Row<T>) => {
        const table = this.table();
        return await table.insert(row);
    }

    protected removeRow = async (row: Row<T>) => {
        const table = this.table();
        const id = row[table.idKey] as number;
        await Promise.all([
            table.delete(row),
            this.cardListView()?.updateItems({ deletions: [id] }),
        ]);
    }

    protected async onOrderChanged(rows: Row<T>[]) {
        const table = this.table();
        const idKey = table.idKey, orderKey = table.info.orderKey;
        if (!orderKey) return;
        const updates = mapToSubObjects(rows, idKey, orderKey, 'unit' as Column<T>);
        await this.table().update(updates);
    }

    protected async onItemDropped(row: Row<T>) {
        await this.prepareInsert()?.(row);
        await this.table().update(row);
    }

    protected onRowClick(row: Row<T>) {
        const getUrl = this.getUrl();
        if (getUrl && this.activeId() === row[this.table().idKey])
            this.router.navigate([getUrl(null)]);
    }

    protected _prepareInsert(row: Row<T>): PromiseOrValue<void> {
        this.prepareInsert()?.(row);
        const orderKey = this.table().info.orderKey;
        if (orderKey)
            row[orderKey] = (this.cardListView()?.getLast()?.[orderKey] ?? -1) + 1;
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}
