import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { SupaSync } from './supa-sync';
import type { Database, RemoteRow } from './supa-sync.types';

type TestDb = {
    public: {
        Tables: {
            member: {
                Row: { id: number; value: string | null; updated_at: string; deleted: boolean };
                Insert: Partial<{ id: number; value: string | null; updated_at: string; deleted: boolean }>;
                Update: Partial<{ id: number; value: string | null; updated_at: string; deleted: boolean }>;
            };
        };
    };
} & Database;

const STALE_ROW: RemoteRow<TestDb, 'member'> = {
    id: 1, value: 'Mar', updated_at: '2026-01-01T00:00:00.000Z', deleted: false,
};

/** Minimal Supabase stub: no server state, but it records what the client sends. */
function createMockClient(syncRows: RemoteRow<TestDb, 'member'>[] = []) {
    const sent: { table: string; row: RemoteRow<TestDb, 'member'> }[] = [];
    const channel = {
        on: () => channel,
        subscribe: () => channel,
        unsubscribe: () => { },
    };
    const from = (table: string) => ({
        select: () => ({
            gt: () => ({
                eq: () => ({ throwOnError: async () => ({ data: syncRows }) }),
                throwOnError: async () => ({ data: syncRows }),
            }),
        }),
        upsert: () => ({ throwOnError: async () => ({ data: [] }) }),
        insert: () => ({ select: () => ({ throwOnError: async () => ({ data: [] }) }) }),
        update: (row: RemoteRow<TestDb, 'member'>) => ({
            eq: () => ({
                maybeSingle: () => ({
                    throwOnError: async () => {
                        sent.push({ table, row });
                        return { data: null };
                    },
                }),
            }),
        }),
    });
    return {
        sent,
        client: {
            from,
            channel: () => channel,
            removeChannel: () => { },
            realtime: { setAuth: async () => { } },
        },
    };
}

/** jsdom has no Web Locks API; `IDBStoreAdapter.lock()` depends on it. */
function installLockManager() {
    const tails = new Map<string, Promise<unknown>>();
    Object.defineProperty(globalThis.navigator, 'locks', {
        configurable: true,
        value: {
            request: (name: string, callback: () => Promise<unknown>) => {
                const previous = tails.get(name) ?? Promise.resolve();
                const next = previous.then(callback, callback);
                tails.set(name, next.then(() => undefined, () => undefined));
                return next;
            },
        },
    });
}

let dbCounter = 0;

async function createSync(syncRows: RemoteRow<TestDb, 'member'>[] = []) {
    const mock = createMockClient(syncRows);
    const sync = new SupaSync<TestDb>(
        mock.client as never,
        { member: { idKeys: ['id'], updateOffline: true } } as never,
    );
    await sync.init({ access_token: 'test' } as never, `test-db-${++dbCounter}`, true);
    return { sync, mock, table: sync.from('member') };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 20));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The realtime channel hands `payload.new` to `processChanges()`. */
function deliverRealtimeChange(sync: SupaSync<TestDb>, row: RemoteRow<TestDb, 'member'>, commit = '2026-01-01T00:00:01.000Z') {
    return (sync as unknown as {
        processChanges: (payload: unknown) => Promise<void>;
    }).processChanges({
        table: 'member',
        eventType: 'UPDATE',
        new: row,
        old: row,
        commit_timestamp: commit,
    });
}

describe('SupaSync remote changes vs. pending local edits', () => {
    beforeEach(() => installLockManager());

    it('does not let the echo of an older own write overwrite a newer local edit', async () => {
        const { sync, mock, table } = await createSync();

        // 1. the user types "Mar", the debounce fires and the row travels to the server
        await table.update({ id: 1, value: 'Mar', updated_at: STALE_ROW.updated_at, deleted: false }, 50);
        await wait(80);
        expect(mock.sent.map(s => s.row.value)).toEqual(['Mar']);

        // 2. the user types one more character while the write travels back
        await table.update({ id: 1, value: 'Mart', updated_at: STALE_ROW.updated_at, deleted: false }, 300);

        // 3. the realtime echo of the earlier "Mar" commit arrives
        await deliverRealtimeChange(sync, STALE_ROW);
        await tick();

        const row = await table.read(1).get();
        expect(row?.value).toBe('Mart');
    });

    it('still applies remote changes once the pending local edit has been sent', async () => {
        const { sync, table } = await createSync();

        await table.update({ id: 1, value: 'Mart', updated_at: STALE_ROW.updated_at, deleted: false }, 50);
        await wait(80); // debounce flushed

        await deliverRealtimeChange(sync, { ...STALE_ROW, value: 'Martin' });
        await tick();

        const row = await table.read(1).get();
        expect(row?.value).toBe('Martin');
    });

    it('does not let a background sync overwrite a pending local edit', async () => {
        const { sync, table } = await createSync([STALE_ROW]);

        await table.update({ id: 1, value: 'Mart', updated_at: STALE_ROW.updated_at, deleted: false }, 300);
        await (table as unknown as { _sync: (last: string, dep: boolean) => Promise<void> })
            ._sync(new Date(0).toISOString(), true);
        await tick();

        const row = await table.read(1).get();
        expect(row?.value).toBe('Mart');
        void sync;
    });
});
