import { Directive, effect, inject, input, ModelSignal } from "@angular/core";
import { FormValueControl } from "@angular/forms/signals";
import type { Column, Database, Row, TableName } from "./supa-sync.types";
import { SupaSyncedRow } from "./supa-synced-row";

export abstract class HasFormValueControl<T> implements FormValueControl<T> {
    abstract value: ModelSignal<T>;
    abstract debounceTime: number | undefined;
}

@Directive({
    selector: '[syncedRow][column]',
})
export class SyncedFieldDirective<D extends Database, T extends TableName<D>, C extends Column<D, T>> {

    private readonly inputBase = inject(HasFormValueControl);

    readonly syncedRow = input.required<SupaSyncedRow<D, T>>();
    readonly column = input.required<C>();

    private rowId: number | null = null;
    private ignoreUpdate: Row<D, T>[C] | null = null;
    private applyingRemote = false;

    constructor() {
        // syncedRow -> form control
        effect(() => {
            const syncedRow = this.syncedRow();
            const row = syncedRow.value();
            if (!row) {
                this.applyRemoteValue(null);
                return;
            }
            const column = this.column();
            const rowId = row[syncedRow.table.idKey];
            if (this.rowId !== rowId) {
                this.rowId = rowId;
                this.ignoreUpdate = null;
            } else if (!(column in row)) return;
            this.applyRemoteValue(row[column]);
        });
        // form control -> syncedRow
        effect(() => {
            const columnValue = this.inputBase.value() as Row<D, T>[C] | null;
            if (columnValue == null) return;
            if (this.ignoreUpdate === columnValue) {
                this.ignoreUpdate = null;
                return;
            }
            this.sendUpdate(columnValue);
        });
    }

    private applyRemoteValue(value: Row<D, T>[C] | null | undefined) {
        if (value === this.ignoreUpdate) return;
        this.applyingRemote = true;
        this.inputBase.value.set(value);
    }

    private async sendUpdate(value: Row<D, T>[C] | null) {
        if (this.applyingRemote) {
            this.applyingRemote = false;
            return;
        }
        this.ignoreUpdate = value;
        const syncedRow = this.syncedRow(), column = this.column();
        await syncedRow.write({ [column]: value }, this.inputBase.debounceTime);
    }
}