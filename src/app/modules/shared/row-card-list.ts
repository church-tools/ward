import { CommonModule } from "@angular/common";
import { Component, inject, Injector, input, OnDestroy, signal } from "@angular/core";
import { Subscription } from "rxjs";
import type { Row, TableName } from "../../shared/types";
import { asyncComputed, multiEffect } from "../../shared/utils/signal-utils";
import { CardListComponent } from "../../shared/widget/card-list/card-list";
import { getListRowComponent } from "./list-row";
import { getTableService } from "./table.service";

@Component({
    selector: 'app-row-card-list',
    template: `
        @if (rowComponent(); as component) {
            <app-card-list
                [items]="items()"
                [cardClasses]="cardClasses()"
                [reorderable]="editable()"
                [orderByKey]="tableService()?.indexField"
                [getFilterText]="tableService()?.toString"
                (orderChange)="updateRows($event)">
                <ng-template let-row>
                    <ng-container [ngComponentOutlet]="component" 
                        [ngComponentOutletInputs]="{ row: row }"/>
                </ng-template>
            </app-card-list>
            <ng-container #insertComponentContainer/>
        }
    `,
    imports: [CommonModule, CardListComponent],
})
export class RowCardListComponent<T extends TableName> implements OnDestroy {

    readonly injector = inject(Injector);
    
    readonly tableName = input.required<T>();
    readonly editable = input(false);
    readonly filter = input<(row: Row<T>) => boolean>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');

    protected readonly tableService = asyncComputed([this.tableName], tableName => getTableService(this.injector, tableName));
    protected readonly rowComponent = asyncComputed([this.tableName], getListRowComponent);
    
    protected readonly items = signal<Row<T>[]>([]);
    private subscription: Subscription | undefined;

    constructor() {
        multiEffect([this.tableService, this.filter], (tableService, filter) => {
            this.subscription?.unsubscribe();
            this.subscription = tableService?.observe(filter).subscribe(rows => {
                this.items.set(rows);
            });
        });
    }

    protected addRow = async () => {
        // const agendas = await this.agendaService.getAllById()
        // const firstFreeId = firstFreeIndex(agendas);
        // const { data } = await this.tableService()!.table
        //     .insert(<Insert<T>>{
        //         id: firstFreeId,
        //         name: "",
        //         unit: 18,
        //     })
        //     .throwOnError();
    }

    protected async updateRows(rows: Row<T>[]) {
        await this.tableService()!.update(rows);
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}