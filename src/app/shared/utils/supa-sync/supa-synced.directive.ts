import { Directive, inject, input, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { InputBaseComponent } from "../../form/shared/input-base";
import { xeffect } from "../signal-utils";
import { SupaSyncTable } from "./supa-sync-table";
import type { Column, Database, Row, TableName } from "./supa-sync.types";

@Directive({
    selector: '[supaSynced]'
})
export class SupaSyncedDirective<D extends Database, T extends TableName<D>, C extends Column<D, T>> implements OnDestroy {

    private readonly inputBase = inject(InputBaseComponent);

    readonly fromTable = input.required<SupaSyncTable<D, T>>({ alias: 'supaSynced' });
    readonly row = input.required<Row<D, T> | null>();
    readonly column = input.required<C>();
    
    private subscription?: Subscription;
    private lastValue: Row<D, T>[C] | undefined;
    private timeout: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        xeffect([this.fromTable, this.row, this.column], (fromTable, row, column) => {
            this.subscription?.unsubscribe();
            if (!row) return;
            const idKey = fromTable.idKey;
            this.inputBase.writeValue(row[column]);
            this.subscription = fromTable.findOne()
                .eq(idKey, row[idKey])
                .subscribe(({ result: row }) => {
                    const value = row?.[column];
                    if (value == null || this.lastValue === value) return;
                    this.lastValue = value;
                    this.inputBase.writeValue(value);
                });
        });
        this.inputBase.registerOnChange((value: Row<D, T>[C]) => this.sendUpdate(value));
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    private sendUpdate(value: Row<D, T>[C]) {
        const column = this.column(), fromTable = this.fromTable(), row = this.row();
        if (!row) return;
        const idKey = fromTable.idKey;
        if (!this.inputBase.debounceTime) {
            this.lastValue = value;
            fromTable.update({ [idKey]: row[idKey], [column]: value });
        } else {
            if (this.timeout) clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                this.lastValue = value;
                fromTable.update({ [idKey]: row[idKey], [column]: value });
            }, this.inputBase.debounceTime);
        }
    }
}