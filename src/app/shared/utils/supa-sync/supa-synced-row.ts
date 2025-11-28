
import { effect, EffectRef, Signal, signal, WritableSignal } from "@angular/core";
import { Subscription } from "./event-emitter";
import { SupaSyncTable } from "./supa-sync-table";
import type { Database, Row, TableName, Update } from "./supa-sync.types";
import { SupaSync } from "./supa-sync";

export class SupaSyncedRow<D extends Database, T extends TableName<D>> {

    private subscription: Subscription | undefined;
    private readonly effectRef: EffectRef | undefined;

    public get table() { return this._table; }

    constructor(
        private _table: SupaSyncTable<D, T>,
        public readonly id: Signal<number | null>,
        public readonly value: Signal<Row<D, T> | null>,
        effectFunc: (self: SupaSyncedRow<D, T>) => void,
    ) {
        this.effectRef = effect(() => effectFunc(this));
    }

    public static fromId<D extends Database, T extends TableName<D>, IA extends { [K in TableName<D>]?: any } = {}>(
        supaSync: SupaSync<D, IA>,
        getTableName: () => T,
        idSignal: Signal<number | null>,
    ): SupaSyncedRow<D, T> {
        const row = signal<Row<D, T> | null>(null); 
        const self = new SupaSyncedRow<D, T>(supaSync.from(getTableName()), idSignal, row, self => {
            const id = idSignal();
            self.subscription?.unsubscribe();
            if (id == null) return;
            self._table ??= supaSync.from(getTableName());
            self.subscription = self._table.read(id)
                .subscribe(update => row.set(update.result));
        });
        return self;
    }

    public static fromRow<D extends Database, T extends TableName<D>>(
        table: SupaSyncTable<D, T>,
        rowSignal: WritableSignal<Row<D, T>>,
    ): SupaSyncedRow<D, T> {
        const id = signal(rowSignal()?.[table.idKey] ?? null);
        const self = new SupaSyncedRow<D, T>(table, id, rowSignal, self => {
            const row = rowSignal();
            id.set(row?.[self._table.idKey] ?? null);
            self.subscription?.unsubscribe();
            if (row == null) return;
            self.subscription = self._table.read(row[self._table.idKey])
                .listenToChanges(update => rowSignal.set(update.result));
        });
        return self;
    }

    public async write(update: Update<D, T>) {
        update[this._table.idKey] = this.id();
        await this._table.update(update);
    }

    public destroy() {
        this.subscription?.unsubscribe();
        this.effectRef?.destroy();
    }
}