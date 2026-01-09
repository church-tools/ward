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
    private readonly sentValues = new Set<Row<D, T>[C]>();
    private timeout: ReturnType<typeof setTimeout> | undefined;
    private applyingRemote = false;

    constructor() {
        effect(() => {
            const syncedRow = this.syncedRow();
            this.subscription?.unsubscribe();
            const row = syncedRow.value();
            if (!row) {
                this.applyRemoteValue(null);
                return;
            }
            const column = this.column();
            this.sentValues.clear();
            this.applyRemoteValue(row[column]);
        });
        effect(() => {
            const currentValue = this.inputBase.value();
            const columnValue = currentValue as Row<D, T>[C] | null;
            if (columnValue == null) return;
            this.sentValues.add(columnValue);
            this.sendUpdate(columnValue);
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private applyRemoteValue(value: Row<D, T>[C] | null | undefined) {
        if (this.inputBase.debounceTime && this.sentValues.has(value)) {
            this.sentValues.delete(value);
            return;
        }
        this.applyingRemote = true;
        this.inputBase.value.set(value);
    }

    private sendUpdate(value: Row<D, T>[C] | null) {
        if (this.applyingRemote) {
            this.applyingRemote = false;
            return;
        }
        const syncedRow = this.syncedRow(), column = this.column();
        if (this.inputBase.debounceTime) {
            if (this.timeout) clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.sentValues.add(value);
                syncedRow.write({ [column]: value });
                setTimeout(() => this.sentValues.delete(value), 5000);
            }, this.inputBase.debounceTime);
        } else {
            this.sentValues.add(value);
            syncedRow.write({ [column]: value });
        }
    }
}