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
    private ignoreUpdate: Row<D, T>[C] | undefined;

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
            } else if (!(column in row)) return;
            const value = row[column];
            if ('ignoreUpdate' in this && value === this.ignoreUpdate) return;
            this.applyRemoteValue(value);
        });
        // form control -> syncedRow
        effect(() => {
            const value = this.inputBase.value() as Row<D, T>[C] | null;
            if ('ignoreUpdate' in this && value === this.ignoreUpdate) return;
            this.sendUpdate(value);
        });
    }

    private applyRemoteValue(value: Row<D, T>[C] | null | undefined) {
        if (!this.inputBase.value() === value) return;
        this.ignoreUpdate = value;
        this.inputBase.value.set(value);
    }

    private async sendUpdate(value: Row<D, T>[C] | null) {
        console.log('sending', value);
        this.ignoreUpdate = value;
        const syncedRow = this.syncedRow(), column = this.column();
        await syncedRow.write({ [column]: value }, this.inputBase.debounceTime);
        if (this.ignoreUpdate === value)
            delete this.ignoreUpdate;
    }
}