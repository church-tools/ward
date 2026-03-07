import type { Signal } from "@angular/core";
import { effect, signal } from "@angular/core";
import type { IDBQueryBase } from "./idb/idb-query-base";
import { AnyCalculatedValues, Database, LocalRow, TableName } from "./supa-sync.types";

export type SyncedArraySignal<T> = Signal<T[]> & {
	unsubscribe: () => void;
};

type StrictUnwrap<T> = T extends Signal<infer U> 
    ? (null extends U ? U : undefined extends U ? U : Exclude<U, null | undefined>)
    : never;

type DB = Database;
type TN<D extends DB> = TableName<D>;

export function syncedArraySignal<
	D extends DB, T extends TN<D>,
	Dep1,
	C extends AnyCalculatedValues
>(
	dependencies: [Signal<Dep1>],
	queryComputation: (value1: StrictUnwrap<Signal<Dep1>>) => IDBQueryBase<D, T, C, LocalRow<D, T, C>[]>,
): SyncedArraySignal<LocalRow<D, T, C>>;

export function syncedArraySignal<
	D extends DB, T extends TN<D>,
	Dep1, Dep2,
	C extends AnyCalculatedValues
>(
	dependencies: [Signal<Dep1>, Signal<Dep2>],
	queryComputation: (value1: StrictUnwrap<Signal<Dep1>>, value2: StrictUnwrap<Signal<Dep2>>) => IDBQueryBase<D, T, C, LocalRow<D, T, C>[]>,
): SyncedArraySignal<LocalRow<D, T, C>>;

export function syncedArraySignal<
	D extends DB, T extends TN<D>,
	Dep1, Dep2, Dep3,
	C extends AnyCalculatedValues
>(
	dependencies: [Signal<Dep1>, Signal<Dep2>, Signal<Dep3>],
	queryComputation: (value1: StrictUnwrap<Signal<Dep1>>, value2: StrictUnwrap<Signal<Dep2>>, value3: StrictUnwrap<Signal<Dep3>>) => IDBQueryBase<D, T, C, LocalRow<D, T, C>[]>,
): SyncedArraySignal<LocalRow<D, T, C>>;

export function syncedArraySignal<
	D extends DB, T extends TN<D>,
	Dep1, Dep2, Dep3, Dep4,
	C extends AnyCalculatedValues
>(
	dependencies: [Signal<Dep1>, Signal<Dep2>, Signal<Dep3>, Signal<Dep4>],
	queryComputation: (value1: StrictUnwrap<Signal<Dep1>>, value2: StrictUnwrap<Signal<Dep2>>, value3: StrictUnwrap<Signal<Dep3>>, value4: StrictUnwrap<Signal<Dep4>>) => IDBQueryBase<D, T, C, LocalRow<D, T, C>[]>,
): SyncedArraySignal<LocalRow<D, T, C>>;

export function syncedArraySignal<
	D extends Database,
	T extends TableName<D>,
	C extends AnyCalculatedValues
>(
    dependencies: (Signal<any> | undefined)[],
    queryComputation: (...values: any[]) => IDBQueryBase<D, T, C, LocalRow<D, T, C>[]>,
): SyncedArraySignal<LocalRow<D, T, C>> {
	const rows = signal<LocalRow<D, T, C>[]>([]);
	let subscription: { unsubscribe: () => void; } | undefined;

	let effectRef = effect(() => {
		rows.set([]);
		const query = queryComputation(...dependencies.map(d => d?.() ?? null));
		subscription?.unsubscribe();
		subscription = query.subscribe(({ result, deletions }) => {
			rows.update(current => {
				if (!result?.length && !deletions?.length)
					return current;
				const byId = new Map(current.map(row => [row.id, row]));
				for (const id of deletions ?? [])
					byId.delete(id);
				for (const row of result ?? [])
					byId.set(row.id, row);
				return [...byId.values()];
			});
		});
	});

	const signalWithCleanup = rows.asReadonly() as SyncedArraySignal<LocalRow<D, T, C>>;
	const unsubscribe = () => {
		effectRef.destroy();
		subscription?.unsubscribe();
		subscription = undefined;
	};
	signalWithCleanup.unsubscribe = unsubscribe;
	return signalWithCleanup;
}