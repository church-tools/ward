import { Directive, inject, input, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { InputBaseComponent } from "../../form/shared/input-base";
import { xeffect } from "../signal-utils";
import { SupaSync } from "./supa-sync";
import type { Column, Database, Row, TableName } from "./supa-sync.types";

@Directive({
    selector: '[supaSynced]'
})
export class SupaSyncedDirective<D extends Database, T extends TableName<D>, C extends Column<D, T>> implements OnDestroy {

    private readonly inputBase = inject(InputBaseComponent);

    readonly supaSync = input.required<SupaSync<Database>>({ alias: 'supaSynced' });
    readonly table = input.required<T>();
    readonly row = input.required<Row<D, T>>();
    readonly column = input.required<C>();
    
    private subscription?: Subscription;
    private lastValue: Row<D, T>[C] | undefined;

    constructor() {
        xeffect([this.supaSync, this.table, this.row, this.column], (supaSync, table, row, column) => {
            if (!column || !table) return;
            this.subscription?.unsubscribe();
            const idKey = supaSync.from(table).idKey;
            this.inputBase.writeValue(row![column]);
            this.subscription = supaSync.from(table).findOne().eq(idKey, row![idKey]).observe()
                .subscribe(row => {
                    if (row?.[column] == null) return;
                    const value = row[column];
                    if (this.lastValue === value) return;
                    this.lastValue = value;
                    this.inputBase.writeValue(value);
                });
        });
        this.inputBase.registerOnChange((value: Row<D, T>[C]) => {
            if (this.lastValue === value) return;
            this.lastValue = value;
            const column = this.column();
            if (!column) return;
            const supaSync = this.supaSync(), table = this.table(), row = this.row();
            const idKey = supaSync.from(table).idKey;
            supaSync.from(table).update({ [idKey]: row[idKey], [column]: value });
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}