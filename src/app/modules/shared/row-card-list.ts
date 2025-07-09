import { CommonModule } from "@angular/common";
import { Component, inject, Injector, input, OnDestroy, signal, viewChild } from "@angular/core";
import { MaybeAsync } from "@angular/router";
import { Subscription } from "rxjs";
import type { Insert, Row, TableName } from "../../shared/types";
import { asyncComputed, xeffect } from "../../shared/utils/signal-utils";
import { CardListComponent } from "../../shared/widget/card-list/card-list";
import { getListInsertComponent } from "./list-insert";
import { getListRowComponent } from "./list-row";
import { getTableService, RowRecords } from "./table.service";
import { mapToSubObjects } from "../../shared/utils/array-utils";

@Component({
    selector: 'app-row-card-list',
    template: `
        @if (tableService(); as service) {
            @if (rowComponent(); as component) {
                @if (insertComponent(); as insertComponent) {
                    <app-card-list
                        [cardClasses]="cardClasses()"
                        [reorderable]="editable()"
                        [editable]="editable()"
                        [gap]="gap()"
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
    readonly getUrl = input<(row: Row<T>) => string>();
    readonly filter = input<(row: Row<T>) => boolean>();
    readonly prepareInsert = input<(row: Insert<T>) => MaybeAsync<void>>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');

    protected readonly tableService = asyncComputed([this.tableName], tableName => getTableService(this.injector, tableName));
    protected readonly rowComponent = asyncComputed([this.tableName], getListRowComponent);
    protected readonly insertComponent = asyncComputed([this.tableName], getListInsertComponent);

    protected readonly cardListView = viewChild(CardListComponent);
    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.cardListView, this.tableService, this.filter], (cardListView, tableService, filter) => {
            if (!cardListView) return;
            this.subscription?.unsubscribe();
            this.subscription = tableService?.observeMany(filter)
                .subscribe(rowRecords => cardListView?.updateItems(rowRecords));
        });
    }

    protected insertRow = async (row: Row<T>) => {
        const tableService = this.tableService()!;
        return await tableService.insertRow(row as any);
    }

    protected async updateRowPositions(rows: Row<T>[]) {
        await this.tableService()!.updateRows(mapToSubObjects(rows,
            'id' as keyof Row<T>, 'position' as keyof Row<T>, 'unit' as keyof Row<T>));
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}