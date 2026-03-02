import { Directive, effect, inject, input, ModelSignal, untracked } from "@angular/core";
import type { FormValueControl } from "@angular/forms/signals";
import type { AnyCalculatedValues, Column, Database, LocalRow, NoCalculatedValues, TableName } from "./supa-sync.types";
import type { SupaSyncedRow } from "./supa-synced-row";

export abstract class HasFormValueControl<T> implements FormValueControl<T> {
    abstract value: ModelSignal<T>;
    abstract debounceTime: number | undefined;
}

@Directive({
    selector: '[syncedRow][column]',
})
export class SyncedFieldDirective<
    D extends Database,
    T extends TableName<D>,
    Col extends Column<D, T>,
    Calc extends AnyCalculatedValues = NoCalculatedValues,
    InnerValue = LocalRow<D, T, Calc>[Col]
> {
    private readonly inputBase = inject(HasFormValueControl);

    readonly syncedRow = input.required<SupaSyncedRow<D, T, Calc>>();
    readonly column = input.required<Col>();
    readonly mapIn = input<((value: LocalRow<D, T, Calc>[Col]) => InnerValue)>(v => v);
    readonly mapOut = input<((value: InnerValue) => LocalRow<D, T, Calc>[Col] | null)>(v => v);

    private readonly ignoreUpdates = new Set<LocalRow<D, T, Calc>[Col]>();

    constructor() {
        // syncedRow -> form control
        effect(() => {
            const syncedRow = this.syncedRow();
            const column = this.column();
            const row = syncedRow.value();
            if (!row) return;
            untracked(() => {
                const value = row[column];
                if (this.ignoreUpdates.has(value)) {
                    setTimeout(() => this.ignoreUpdates.delete(value), 500);
                    return;
                }
                const innerValue = this.mapIn()(value);
                if (this.inputBase.value() === innerValue) return;
                this.inputBase.value.set(innerValue);
            });
        });
        // form control -> syncedRow
        let firstRun = true;
        effect(() => {
            const innerValue = this.inputBase.value() as InnerValue; 
            if (firstRun) {
                firstRun = false;
                return;
            }
            untracked(() => {
                const currentValue = this.syncedRow().value()?.[this.column()];
                const value = (innerValue != null) ? this.mapOut()(innerValue) : innerValue;
                if (currentValue === value) return;
                this.ignoreUpdates.add(value);
                const syncedRow = this.syncedRow();
                const column = this.column();
                syncedRow.write({ [column]: value }, this.inputBase.debounceTime);
            });
        });
    }
}
