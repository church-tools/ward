import type { Signal } from "@angular/core";
import { signal } from "@angular/core";
import type { IDBQueryBase } from "./idb/idb-query-base";
import { AnyCalculatedValues, Database, LocalRow, TableName } from "./supa-sync.types";

export type SupaSyncedArraySignal<T> = Signal<T[]> & {
	unsubscribe: () => void;
};

export function supaSyncedArraySignal<
	D extends Database,
	T extends TableName<D>,
	C extends AnyCalculatedValues
>(
	query: IDBQueryBase<D, T, C, LocalRow<D, T, C>[]>,
	abortSignal?: AbortSignal,
): SupaSyncedArraySignal<LocalRow<D, T, C>> {
	const rows = signal<(LocalRow<D, T, C>)[]>([]);
	const subscription = query.subscribe(({ result, deletions }) => {
		rows.update(currentRows => {
			let nextRows = currentRows;
			if (deletions?.length) {
				const deletedIds = new Set(deletions);
				nextRows = nextRows.filter(row => !deletedIds.has(row.id));
			}
			if (!result?.length) return nextRows;
			const byId = new Map(nextRows.map(row => [row.id, row]));
			for (const row of result)
				byId.set(row.id, row);
			return [...byId.values()];
		});
	});
	const signalWithCleanup = rows.asReadonly() as SupaSyncedArraySignal<LocalRow<D, T, C>>;
	const unsubscribe = () => {
		subscription.unsubscribe();
		abortSignal?.removeEventListener("abort", unsubscribe);
	};
	if (abortSignal?.aborted)
		unsubscribe();
	else if (abortSignal)
		abortSignal.addEventListener("abort", unsubscribe, { once: true });
	signalWithCleanup.unsubscribe = unsubscribe;
	return signalWithCleanup;
}