import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { expect, it, vi } from 'vitest';
import type { LocalRow } from '../supa-sync.types';
import { IDBFilterBuilder } from './idb-filter-builder';
import { idbNumberToBool, IDBStoreAdapter } from './idb-store-adapter';

type Row = { id: number; active: boolean | null };
type Db = { public: { Tables: { items: { Row: Row; Insert: Row; Update: Partial<Row> } } } };

it('decodes indexed boolean fields on rows but not on primary keys', async () => {
    const store = new IDBStoreAdapter<LocalRow<Db, 'items'>, 'id'>('items', 'id');
    const open = new IDBFactory().open('filter');
    open.onupgradeneeded = () => {
        const items = store.assureIDBStore(open.transaction!, { indexedKeys: ['active'] });
        items.put({ id: 10, active: 1, _calculated: {} });
        items.put({ id: 20, active: -1, _calculated: {} });
    };
    const db = await open.toPromise();
    try {
        store.init(Promise.resolve(db));
        const decode = vi.fn((row: LocalRow<Db, 'items'>) => ({ ...row, active: idbNumberToBool(Number(row.active)) }));
        store.mappingOutFunction = decode;
        for (const [active, id] of [[true, 10], [false, 20]] as const) {
            const query = new IDBFilterBuilder<Db, 'items', Record<string, never>, Row[]>(
                store, undefined, rows => rows, { active: Boolean },
            ).eq('active', active);
            decode.mockClear();
            expect(await query.getKeys()).toEqual([id]);
            expect(decode).not.toHaveBeenCalled();
            expect(await query.get()).toEqual([{ id, active, _calculated: {} }]);
        }
    } finally {
        db.close();
    }
});
