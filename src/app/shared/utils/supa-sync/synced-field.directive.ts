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
export class SyncedFieldDirective<D extends Database, T extends TableName<D>, C extends Column<D, T>, InnerValue = Row<D, T>[C]> {

    private readonly inputBase = inject(HasFormValueControl);

    readonly syncedRow = input.required<SupaSyncedRow<D, T>>();
    readonly column = input.required<C>();
    readonly mapIn = input<((value: Row<D, T>[C]) => InnerValue) | null>();
    readonly mapOut = input<((value: InnerValue) => Row<D, T>[C] | null) | null>();

    private rowId: number | null = null;
    private ignoreUpdate: Row<D, T>[C] | null | undefined;

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
            const mapIn = this.mapIn();
            const value = mapIn ? mapIn(row[column]) : row[column];
            if ('ignoreUpdate' in this && value === this.ignoreUpdate) return;
            this.applyRemoteValue(value);
        });
        // form control -> syncedRow
        effect(() => {
            const innerValue = this.inputBase.value() as InnerValue;
            const mapOut = this.mapOut();
            const value = innerValue != null && mapOut ? mapOut(innerValue) : innerValue;
            if ('ignoreUpdate' in this && value === this.ignoreUpdate) return;
            this.sendUpdate(value);
        });
    }

    private applyRemoteValue(value: Row<D, T>[C] | null | undefined) {
        const mapIn = this.mapIn();
        const innerValue = mapIn ? mapIn(value as Row<D, T>[C]) : value as InnerValue;
        if (!this.inputBase.value() === innerValue) return;
        this.ignoreUpdate = value;
        this.inputBase.value.set(value);
    }

    private async sendUpdate(value: Row<D, T>[C] | null) {
        this.ignoreUpdate = value;
        const syncedRow = this.syncedRow(), column = this.column();
        await syncedRow.write({ [column]: value }, this.inputBase.debounceTime);
        if (this.ignoreUpdate === value)
            delete this.ignoreUpdate;
    }
}