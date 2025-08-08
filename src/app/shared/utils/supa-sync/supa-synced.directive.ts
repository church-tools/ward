import { Directive, inject, input, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";
import { TableService } from "../../../modules/shared/table.service";
import { InputBaseComponent } from "../../form/shared/input-base";
import { Row, TableName } from "../../types";
import { xeffect } from "../signal-utils";

@Directive({
    selector: '[supaSynced]'
})
export class SupaSyncedDirective<T extends TableName, C extends keyof Row<T>> implements OnDestroy {

    private readonly inputBase = inject(InputBaseComponent);
    
    readonly table = input.required<TableService<T>>({ alias: 'supaSynced' });
    readonly row = input.required<Row<T>>();
    readonly column = input.required<C>();
    
    private subscription?: Subscription;
    private lastValue: Row<T>[C] | undefined;

    constructor() {
        xeffect([this.column], column => {
            if (!column) return;
            this.subscription?.unsubscribe();
            const idKey = this.table().idKey;
            const row = this.row()
            this.inputBase.writeValue(row[column]);
            this.subscription = this.table().observe(row => row[idKey] === row[idKey])
                .subscribe(row => {
                    if (row?.[column] == null) return;
                    const value = row[column];
                    if (this.lastValue === value) return;
                    this.lastValue = value;
                    this.inputBase.writeValue(value);
                });
        });
        this.inputBase.registerOnChange((value: Row<T>[C]) => {
            if (this.lastValue === value) return;
            this.lastValue = value;
            const column = this.column();
            if (!column) return;
            const idKey = this.table().idKey;
            this.table().update({
                [idKey]: this.row()[idKey] as number,
                [column]: value
            });
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }
}