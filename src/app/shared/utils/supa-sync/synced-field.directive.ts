import { Directive, effect, inject, input, ModelSignal, OnDestroy } from "@angular/core";
import { FormValueControl } from "@angular/forms/signals";
import { Subscription } from "rxjs";
import type { Column, Database, Row, TableName } from "./supa-sync.types";
import { SupaSyncedRow } from "./supa-synced-row";

export abstract class HasFormValueControl<T> implements FormValueControl<T> {
    abstract value: ModelSignal<T>;
    abstract debounceTime: number | undefined;
}

@Directive({
    selector: '[syncedRow][column]',
})
export class SyncedFieldDirective<D extends Database, T extends TableName<D>, C extends Column<D, T>> implements OnDestroy {

    private readonly inputBase = inject(HasFormValueControl);

    readonly syncedRow = input.required<SupaSyncedRow<D, T>>();
    readonly column = input.required<C>();
    
    private subscription?: Subscription;
    private lastValue: Row<D, T>[C] | undefined;
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private applyingRemoteValue = false;

    constructor() {
        effect(() => {
            const syncedRow = this.syncedRow();
            this.subscription?.unsubscribe();
            const row = syncedRow.value();
            if (!row) return;
            const column = this.column();
            const value = row[column];
            if (value == null || this.lastValue === value) return;
            this.applyRemoteValue(row[column]);
        });
        effect(() => {
            const currentValue = this.inputBase.value();
            if (this.applyingRemoteValue) return;
            const columnValue = currentValue as Row<D, T>[C] | null;
            if (columnValue == null) return;
            if (this.lastValue === columnValue) return;
            this.lastValue = columnValue;
            this.sendUpdate(columnValue);
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private applyRemoteValue(value: Row<D, T>[C] | null | undefined) {
        this.applyingRemoteValue = true;
        try {
            if (value == null) return;
            this.lastValue = value;
            this.inputBase.value.set(value);
        } finally {
            Promise.resolve().then(() => this.applyingRemoteValue = false);
        }
    }

    private sendUpdate(value: Row<D, T>[C] | null) {
        const syncedRow = this.syncedRow(), column = this.column();
        if (!this.inputBase.debounceTime) {
            this.lastValue = value;
            syncedRow.write({ [column]: value });
        } else {
            if (this.timeout) clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.lastValue = value;
                syncedRow.write({ [column]: value });
            }, this.inputBase.debounceTime);
        }
    }
}