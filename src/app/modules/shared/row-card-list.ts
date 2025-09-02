import { CommonModule } from "@angular/common";
import { Component, inject, Injector, input, OnDestroy, viewChild } from "@angular/core";
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
import { DropTarget } from "../../shared/service/drag-drop.service";

@Component({
    selector: 'app-row-card-list',
    template: `
        @let table = this.table();
        @let rowComponent = this.rowComponent();
        @let insertComponent = this.insertComponent();
        @if (table && rowComponent && insertComponent) {
            <app-card-list
                [cardClasses]="cardsVisible() ? cardClasses() : ''"
                [reorderable]="editable()"
                [editable]="editable()"
                [activeId]="activeId()"
                [gap]="gap()"
                [idKey]="table.idKey"
                [orderByKey]="table.info.orderKey"
                [getFilterText]="viewService()?.toString"
                [getUrl]="getUrl()"
                (orderChange)="updateRowPositions($event)"
                [insertRow]="insertRow"
                [validateDropTarget]="validateDropTarget">
                <ng-template #itemTemplate let-row>
                    <ng-container [ngComponentOutlet]="rowComponent" 
                        [ngComponentOutletInputs]="{ row, page: this.page() }"/>
                </ng-template>
                <ng-template #insertTemplate let-functions>               
                    <ng-container [ngComponentOutlet]="insertComponent"
                        [ngComponentOutletInputs]="{
                            insert: functions.insert,
                            cancel: functions.cancel,
                            prepareInsert: this.prepareInsert(),
                        }"/>
                </ng-template>
            </app-card-list>
        }
    `,
    imports: [CommonModule, CardListComponent],
})
export class RowCardListComponent<T extends TableName> implements OnDestroy {

    readonly injector = inject(Injector);
    private readonly supabase = inject(SupabaseService);

    readonly tableName = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);
    readonly editable = input(false);
    readonly gap = input(2);
    readonly cardsVisible = input(true);
    readonly getUrl = input<(row: Row<T>) => string>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly activeId = input<number | null>(null);
    readonly page = input<PageComponent>();

    protected readonly table = xcomputed([this.tableName], tableName => this.supabase.sync.from(tableName));
    protected readonly viewService = asyncComputed([this.tableName], tableName => getViewService(this.injector, tableName!));
    protected readonly rowComponent = asyncComputed([this.tableName], tableName => getListRowComponent(tableName!));
    protected readonly insertComponent = asyncComputed([this.tableName], tableName => getListInsertComponent(tableName!));

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

    protected async updateRowPositions(rows: Row<T>[]) {
        const table = this.table();
        const idKey = table.idKey, orderKey = table.info.orderKey;
        if (!orderKey) throw new Error('Table is not ordered');
        const updates = mapToSubObjects(rows, idKey as Column<T>, orderKey as Column<T>, 'unit' as Column<T>);
        await this.table().update(updates);
    }

    protected validateDropTarget = (target: DropTarget) => target.identity === this.tableName();

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}
