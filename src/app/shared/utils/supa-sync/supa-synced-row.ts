
import { effect, EffectRef, Signal, signal, WritableSignal } from "@angular/core";
import { Subscription } from "./event-emitter";
import { SupaSyncTable } from "./supa-sync-table";
import type { AnyCalculatedValues, CalculatedOf, Database, NoCalculatedValues,
    RowWithCalculated, SupaSyncCalculatedMap, TableName, Update } from "./supa-sync.types";
import { SupaSync } from "./supa-sync";

export class SupaSyncedRow<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues = NoCalculatedValues> {

    private subscription: Subscription | undefined;
    private readonly effectRef: EffectRef | undefined;

    public get table() { return this._table; }

    constructor(
        private _table: SupaSyncTable<D, T, C>,
        public readonly id: Signal<number | null>,
        public readonly value: Signal<RowWithCalculated<D, T, C> | null>,
        effectFunc: (self: SupaSyncedRow<D, T, C>) => void,
    ) {
        this.effectRef = effect(() => effectFunc(this));
    }

    public static fromId<
        D extends Database,
        T extends TableName<D>,
        IA extends Partial<{ [K in TableName<D>]: any }> = {},
        CM extends SupaSyncCalculatedMap<D> = {},
    >(
        supaSync: SupaSync<D, IA, CM>,
        getTableName: () => T,
        idSignal: Signal<number | null>,
    ): SupaSyncedRow<D, T, CalculatedOf<D, T, CM>> {
        const row = signal<RowWithCalculated<D, T, CalculatedOf<D, T, CM>> | null>(null);
        const self = new SupaSyncedRow<D, T, CalculatedOf<D, T, CM>>(supaSync.from(getTableName()), idSignal, row, self => {
            const id = idSignal();
            row.set(null);
            self.subscription?.unsubscribe();
            if (id == null) return;
            self._table ??= supaSync.from(getTableName());
            self.subscription = self._table.read(id)
                .subscribe(update => row.set(update.result));
        });
        return self;
    }

    public static fromRow<D extends Database, T extends TableName<D>, C extends AnyCalculatedValues = NoCalculatedValues>(
        table: SupaSyncTable<D, T, C, any>,
        rowSignal: WritableSignal<RowWithCalculated<D, T, C> | null>,
    ): SupaSyncedRow<D, T, C> {
        const id = signal<number | null>(null);
        const self = new SupaSyncedRow<D, T, C>(table, id, rowSignal, self => {
            const row = rowSignal();
            id.set(row?.[self._table.idKey] ?? null);
            self.subscription?.unsubscribe();
            if (row == null) return;
            self.subscription = self._table.read(row[self._table.idKey])
                .listenToChanges(update => rowSignal.set(update.result));
        });
        return self;
    }

    public async write(update: Update<D, T>, debounce?: number) {
        const newRow = { ...(this.value() ?? {}), ...update };
        await this._table.update(newRow, debounce);
    }

    public destroy() {
        this.subscription?.unsubscribe();
        this.effectRef?.destroy();
    }
}