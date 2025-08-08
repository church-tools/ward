import { Directive, inject, input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { TableService } from "../../../modules/shared/table.service";
import { InputBaseComponent } from "../../form/shared/input-base";
import { Row, TableName } from "../../types";
import { xeffect } from "../signal-utils";

@Directive({
    selector: '[supaSynced]'
})
export class SupaSyncedDirective<T extends TableName, C extends keyof Row<T>> implements OnInit, OnDestroy {

    private readonly inputBase = inject(InputBaseComponent);
    
    readonly table = input.required<TableService<T>>({ alias: 'supaSynced' });
    readonly row = input.required<Row<T>>();
    readonly column = input.required<C>();
    readonly recordId = input<number | null>(null);
    
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
        this.subscription = this.table().observe(row => row[this.table().idKey] === recordId)
            .subscribe(row => {
                if (row && row[column] !== undefined) {
                    this.inputBase.writeValue(row[column]);
                }
            });
    }

    private async updateRecord() {
        if (!this.recordId()) return;

        const value = this.inputBase.getValue();
        const update = {
            id: this.recordId()!,
            [this.column()!]: value
        };

        try {
            await this.table().updateRows([update]);
        } catch (error) {
            console.error('Failed to update record:', error);
        }
    }
}