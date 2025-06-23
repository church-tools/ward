import { CommonModule } from "@angular/common";
import { Component, inject, Injector, input, OnDestroy, signal } from "@angular/core";
import { Subscription } from "rxjs";
import type { Row, TableName } from "../../shared/types";
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
                        [items]="items()"
                        [cardClasses]="cardClasses()"
                        [reorderable]="editable()"
                        [editable]="editable()"
                        idKey="id"
                        [orderByKey]="service.orderField"
                        [getFilterText]="service.toString"
                        (orderChange)="updateRowPositions($event)"
                        (addClick)="addRow()">
                        <ng-template #itemTemplate let-row>
                            <ng-container [ngComponentOutlet]="component" 
                                [ngComponentOutletInputs]="{ row }"/>
                        </ng-template>
                        <ng-template #insertTemplate let-insert>               
                            <ng-container [ngComponentOutlet]="insertComponent"
                                [ngComponentOutletInputs]="{ insert }"/>
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
    readonly filter = input<(row: Row<T>) => boolean>();
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');

    protected readonly tableService = asyncComputed([this.tableName], tableName => getTableService(this.injector, tableName));
    protected readonly rowComponent = asyncComputed([this.tableName], getListRowComponent);
    protected readonly insertComponent = asyncComputed([this.tableName], getListInsertComponent);

    protected readonly items = signal<Row<T>[]>([]);
    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.tableService, this.filter], (tableService, filter) => {
            this.subscription?.unsubscribe();
            this.subscription = tableService?.observe(filter).subscribe(rows => {
                this.items.set(rows);
            });
        });
    }

    protected addRow = async () => {
    }

    protected async updateRowPositions(rows: Row<T>[]) {
        await this.tableService()!.saveRows(rows, this.tableService()!.orderField!);
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}