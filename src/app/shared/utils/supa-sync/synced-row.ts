
import { Signal, signal } from "@angular/core";
import { Subscription } from "rxjs";
import { SupaSyncTable } from "./supa-sync-table";
import type { Database, Row, TableName, Update } from "./supa-sync.types";
import { xeffect } from "../signal-utils";

export class SyncedRow<D extends Database, T extends TableName<D>> {

    private readonly _value = signal<Row<D, T> | null>(null);
    public readonly value = this._value.asReadonly();

    private subscription: Subscription | undefined;

    constructor(
        public readonly table: SupaSyncTable<D, T>,
        public readonly id: Signal<number | null>,
    ) {
        xeffect([this.id], id => {
            this.subscription?.unsubscribe();
            if (id == null) return;
            this.subscription = this.table.read(id).subscribe(update => {
                this._value.set(update.result);
            });
        });
    }

    public async write(update: Update<D, T>) {
        update[this.table.idKey] = this.id();
        await this.table.update(update);
    }

    public destroy() {
        this.subscription?.unsubscribe();
    }
}