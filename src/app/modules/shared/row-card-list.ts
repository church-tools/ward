import { CommonModule } from "@angular/common";
import { Component, inject, Injector, input, OnDestroy, viewChild } from "@angular/core";
import { Subscription } from "rxjs";
import type { Insert, PromiseOrValue, Row, TableName, TableQuery } from "../../shared/types";
import { mapToSubObjects } from "../../shared/utils/array-utils";
import { asyncComputed, xeffect } from "../../shared/utils/signal-utils";
import { CardListComponent } from "../../shared/widget/card-list/card-list";
import { getListInsertComponent } from "./list-insert";
import { getListRowComponent } from "./list-row";
import { getTableService } from "./table.service";

@Component({
    selector: 'app-row-card-list',
    template: `
        @if (tableService(); as service) {
            @if (rowComponent(); as component) {
                @if (insertComponent(); as insertComponent) {
                    <app-card-list
                        [cardClasses]="cardsVisible() ? cardClasses() : ''"
                        [reorderable]="editable()"
                        [editable]="editable()"
                        [activeId]="activeId()"
                        [gap]="cardsVisible() ? gap() : 0"
                        [idKey]="service.idKey"
                        [orderByKey]="service.orderField"
                        [getFilterText]="service.toString"
                        [getUrl]="getUrl()"
                        (orderChange)="updateRowPositions($event)"
                        [insertRow]="insertRow">
                        <ng-template #itemTemplate let-row>
                            <ng-container [ngComponentOutlet]="component" 
                                [ngComponentOutletInputs]="{ row }"/>
                        </ng-template>
                        <ng-template #insertTemplate let-functions>               
                            <ng-container [ngComponentOutlet]="insertComponent"
                                [ngComponentOutletInputs]="{
                                    insert: functions.insert,
                                    cancel: functions.cancel,
                                    prepareInsert: this.prepareInsert()
                                }"/>
                        </ng-template>
                    </app-card-list>
                }
            }
        }
    `,
    imports: [CommonModule, CardListComponent],
})
export class RowCardListComponent<T extends TableName> implements OnDestroy {

    readonly injector = inject(Injector);
    
    readonly tableName = input.required<T>();
    readonly editable = input(false);
    readonly gap = input(2);
    readonly cardsVisible = input(true);
    readonly getUrl = input<(row: Row<T>) => string>();
    readonly query = input<TableQuery<T>>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly activeId = input<number | null>(null);

    protected readonly tableService = asyncComputed([this.tableName], tableName => getTableService(this.injector, tableName));
    protected readonly rowComponent = asyncComputed([this.tableName], getListRowComponent);
    protected readonly insertComponent = asyncComputed([this.tableName], getListInsertComponent);

    protected readonly cardListView = viewChild(CardListComponent);
    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.cardListView, this.tableService, this.query],
            (cardListView, tableService, query) => {
            if (!cardListView || !tableService) return;
            this.subscription?.unsubscribe();
            this.subscription = tableService.observeMany(query)
                .subscribe(rowRecords => cardListView.updateItems(rowRecords));
        });
    }

    protected insertRow = async (row: Row<T>) => {
        const tableService = this.tableService()!;
        return await tableService.insertRow(row);
    }

    protected async updateRowPositions(rows: Row<T>[]) {
        await this.tableService()!.updateRows(mapToSubObjects(rows,
            'id' as keyof Row<T>, 'position' as keyof Row<T>, 'unit' as keyof Row<T>));
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}