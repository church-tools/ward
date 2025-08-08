import { Directive, inject, Injector, input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { getTableService } from "../../../modules/shared/table.service";
import { InputBaseComponent } from "../../form/shared/input-base";
import { asyncComputed, xeffect } from "../signal-utils";
import { Row, TableName } from "../../types";

@Directive({
    selector: '[supaSynced]'
})
export class SupaSyncedDirective<T extends TableName, C extends keyof Row<T>> implements OnInit, OnDestroy {

    private readonly inputBase = inject(InputBaseComponent);
    private readonly injector = inject(Injector);
    
    readonly table = input.required<T>({ alias: 'supaSynced' });
    readonly row = input.required<Row<T>>();
    readonly column = input.required<C>();
    readonly recordId = input<number | null>(null);
    
    protected readonly tableService = asyncComputed([this.table], table => getTableService(this.injector, table));
    private subscription?: Subscription;

    async ngOnInit() {
        // Set up reactive effects
        xeffect([this.recordId, this.column], (recordId, column) => {
            if (recordId && column) {
                this.subscribeToRecord(recordId, column);
            }
        });

        // Listen for value changes from the input and sync to database
        this.inputBase.onBlur.subscribe(() => {
            if (this.recordId() && this.column()) {
                this.updateRecord();
            }
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private subscribeToRecord(recordId: number, column: C) {
        this.subscription?.unsubscribe();
        const table = this.tableService();
        if (!table) return;
        this.subscription = table.observe(row => row[table.idKey] === recordId)
            .subscribe(row => {
                if (row && row[column] !== undefined) {
                    this.inputBase.writeValue(row[column]);
                }
            });
    }

    private async updateRecord() {
        const table = this.tableService();
        if (!table || !this.recordId() || !this.column()) return;

        const value = this.inputBase.getValue();
        const update = {
            id: this.recordId()!,
            [this.column()!]: value
        };

        try {
            await table.updateRows([update]);
        } catch (error) {
            console.error('Failed to update record:', error);
        }
    }
}