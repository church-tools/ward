import { CommonModule } from "@angular/common";
import { booleanAttribute, Component, contentChild, inject, Injector, input, OnDestroy, OnInit, TemplateRef, viewChild } from "@angular/core";
import { Router } from "@angular/router";
import { IconCode } from "@/shared/icon/icon";
import { Page } from "@/shared/page/page";
import { SupabaseService } from "@/shared/service/supabase.service";
import { PromiseOrValue } from "@/shared/types";
import { asyncComputed, waitForNextChange, xcomputed, xeffect } from "@/shared/utils/signal-utils";
import type { Subscription } from "@/shared/utils/supa-sync/event-emitter";
import { CardList } from "@/shared/widget/card-list/card-list";
import type { Insert, Row, Table, TableName, TableQuery } from "../table.types";
import { getViewService } from "../view.service";

export type RowCardListMultiQuery<T extends TableName = TableName> = {
    tableName: T;
    id: string;
    query: (table: Table<T>) => TableQuery<T, Row<T>[]>;
};

export type RowCardListMultiInsert<T extends TableName = TableName> = {
    tableName: T;
    row: Insert<T>;
};

export type RowCardListMultiItem<T extends TableName = TableName> = {
    table: T;
    row: Row<T>;
};

type RowCardListCardItem<T extends TableName = TableName> = RowCardListMultiItem<T> & {
    [key: string]: unknown;
};

type RowTemplateContext<T extends TableName> = {
    $implicit: RowCardListMultiItem<T>;
    page: Page | undefined;
    onRemove: (item: RowCardListMultiItem<T>) => Promise<void>;
};

type InsertTemplateContext<T extends TableName> = {
    $implicit: {
        insert: (item: RowCardListMultiInsert<T>) => Promise<void>;
        cancel: () => void;
    };
    prepareInsert: (item: RowCardListMultiInsert<T>) => PromiseOrValue<void>;
    context: unknown;
    tableNames: readonly T[];
};

@Component({
    selector: 'app-row-card-list-multi',
    templateUrl: './row-card-list-multi.html',
    imports: [CommonModule, CardList],
})
export class RowCardListMulti<T extends TableName = TableName> implements OnInit, OnDestroy {

    readonly injector = inject(Injector);
    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);

    readonly tableQueries = input.required<readonly RowCardListMultiQuery<T>[]>();
    readonly editable = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly alwaysShowInsertTemplate = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly gap = input(2);
    readonly columns = input(1);
    readonly cardsVisible = input(true);
    readonly getUrl = input<(item: RowCardListMultiItem<T> | null) => string>();
    readonly prepareInsert = input<(item: RowCardListMultiInsert<T>) => PromiseOrValue<void>>();
    readonly insertContext = input<unknown>(null);
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly activeId = input<number | null>(null);
    readonly page = input<Page>();
    readonly emptyIcon = input<IconCode | null>(null);
    readonly rowClicked = input<(item: RowCardListMultiItem<T>) => void>();
    readonly dragDropGroup = input<string>('row-card-list-multi');

    protected readonly cardListView = viewChild(CardList<RowCardListCardItem<T>, number>);
    protected readonly rowTemplate = contentChild.required<TemplateRef<RowTemplateContext<T>>>('rowTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<InsertTemplateContext<T>>>('insertTemplate');

    readonly rowCount = xcomputed([this.cardListView], clv => clv?.cardCount() ?? 0, { trackInner: true });
    readonly initialized = xcomputed([this.cardListView], clv => clv?.initialized() ?? false, { trackInner: true });

    protected readonly tableNames = xcomputed([this.tableQueries], tableQueries => {
        const names = tableQueries.map(query => query.tableName);
        return [...new Set(names)] as T[];
    });

    protected readonly tablesByName = xcomputed([this.tableNames], tableNames => {
        const tables = tableNames.map(tableName => [tableName, this.getTable(tableName)] as const);
        return new Map(tables);
    });

    protected readonly sharedIdKey = xcomputed([this.tablesByName], tablesByName => {
        let sharedKey: string | null = null;
        for (const [tableName, table] of tablesByName) {
            if (table.idKeys.length !== 1)
                throw new Error(`RowCardListMulti requires a single id key for table '${tableName}'`);
            const idKey = table.firstIdKey as string;
            if (sharedKey == null) {
                sharedKey = idKey;
                continue;
            }
            if (sharedKey !== idKey)
                throw new Error(`RowCardListMulti requires matching id keys. Found '${sharedKey}' and '${idKey}'`);
        }
        return sharedKey;
    });

    protected readonly sharedOrderKey = xcomputed([this.tablesByName], tablesByName => {
        let sharedKey: string | null = null;
        for (const [tableName, table] of tablesByName) {
            const orderKey = ((table.info as any).orderKey as string | undefined) ?? null;
            if (!orderKey)
                throw new Error(`RowCardListMulti requires orderKey for table '${tableName}'`);
            if (sharedKey == null) {
                sharedKey = orderKey;
                continue;
            }
            if (sharedKey !== orderKey)
                throw new Error(`RowCardListMulti requires matching order keys. Found '${sharedKey}' and '${orderKey}'`);
        }
        return sharedKey;
    });

    protected readonly viewServices = asyncComputed([this.tableNames], async tableNames => {
        const services = await Promise.all(tableNames.map(async tableName => {
            const service = await getViewService(this.injector, tableName);
            return [tableName, service] as const;
        }));
        return new Map(services);
    }, new Map<T, Awaited<ReturnType<typeof getViewService<T>>>>());

    protected readonly getId = (item: RowCardListCardItem<T>) => {
        const idKey = this.sharedIdKey();
        if (!idKey)
            throw new Error('RowCardListMulti cannot resolve id key without table queries');
        return this.getRowNumericValue(item.row, idKey, item.table, 'id');
    };

    protected readonly getFilterText = (item: RowCardListCardItem<T>) => {
        const service = this.viewServices().get(item.table);
        return service?.toString(item.row) ?? '';
    };

    protected readonly getCardUrl = (item: RowCardListCardItem<T>) => {
        return this.getUrl()?.(item) ?? '';
    };

    protected readonly onCardClick = (item: RowCardListCardItem<T>) => {
        this.rowClicked()?.(item);
    };

    protected readonly onRowClick = (item: RowCardListCardItem<T>) => {
        const getUrl = this.getUrl();
        if (getUrl && this.activeId() === this.getId(item))
            this.router.navigate([getUrl(null)]);
    };

    private readonly subscriptions = new Map<T, Subscription>();
    private querySignature: string | null = null;

    constructor() {
        xeffect([this.tableQueries, this.cardListView, this.sharedIdKey, this.sharedOrderKey], async (tableQueries, cardListView, sharedIdKey, sharedOrderKey) => {
            if (!cardListView)
                return;
            if (!tableQueries.length) {
                this.clearSubscriptions();
                this.querySignature = null;
                await cardListView.clear(true);
                return;
            }
            if (!sharedIdKey || !sharedOrderKey)
                return;
            const querySignature = tableQueries.map(query => `${query.tableName}:${query.id}`).join('|');
            if (this.querySignature === querySignature && cardListView.cardCount())
                return;
            this.querySignature = querySignature;
            this.clearSubscriptions();
            await cardListView.clear(true);
            for (const queryInfo of tableQueries) {
                const tableName = queryInfo.tableName;
                const table = this.getTable(tableName);
                const subscription = queryInfo.query(table).subscribe(update => {
                    const items = update.result?.map(row => this.createCardItem(tableName, row));
                    void cardListView.updateItems({ items, deletions: update.deletions });
                });
                this.subscriptions.set(tableName, subscription);
            }
        });
    }

    async ngOnInit() {
        const activeId = this.activeId();
        if (!activeId)
            return;
        const initialized = await waitForNextChange(this.initialized, this.injector);
        if (!initialized)
            return;
        this.cardListView()?.scrollToItem(activeId);
    }

    protected readonly insertRow = async (item: RowCardListCardItem<T>) => item;

    protected readonly removeRow = async (item: RowCardListMultiItem<T>) => {
        const table = this.getTable(item.table);
        const id = this.getId(this.createCardItem(item.table, item.row));
        await Promise.all([
            table.delete(item.row),
            this.cardListView()?.updateItems({ deletions: [id] }),
        ]);
    };

    protected readonly onOrderChanged = async (items: RowCardListCardItem<T>[]) => {
        const orderKey = this.sharedOrderKey();
        if (!orderKey)
            return;
        const updates = new Map<T, Row<T>[]>();
        for (const item of items) {
            (item.row as any)[orderKey] = Number((item as any)[orderKey] ?? 0);
            const tableUpdates = updates.get(item.table) ?? [];
            tableUpdates.push(item.row);
            updates.set(item.table, tableUpdates);
        }
        await Promise.all([...updates.entries()].map(([tableName, rows]) => this.getTable(tableName).update(rows)));
    };

    protected readonly onItemDropped = async (item: RowCardListCardItem<T>) => {
        await this.prepareInsert()?.({ tableName: item.table, row: item.row as Insert<T> });
        await this.getTable(item.table).update(item.row);
    };

    protected readonly getInsertFunctions = (insert: (item: RowCardListCardItem<T>) => Promise<void>, cancel: () => void) => ({
        insert: async (item: RowCardListMultiInsert<T>) => {
            await this._prepareInsert(item);
            const row = await this.getTable(item.tableName).insert(item.row);
            await insert(this.createCardItem(item.tableName, row));
        },
        cancel,
    });

    protected readonly _prepareInsert = (item: RowCardListMultiInsert<T>): PromiseOrValue<void> => {
        this.prepareInsert()?.(item);
        const orderKey = this.sharedOrderKey();
        if (!orderKey)
            return;
        if ((item.row as any)[orderKey] != null)
            return;
        const last = this.cardListView()?.getLast();
        (item.row as any)[orderKey] = Number(last?.[orderKey] ?? -1) + 1;
    };

    ngOnDestroy() {
        this.clearSubscriptions();
    }

    private clearSubscriptions() {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.subscriptions.clear();
    }

    private createCardItem(table: T, row: Row<T>): RowCardListCardItem<T> {
        const idKey = this.sharedIdKey();
        if (!idKey)
            throw new Error('RowCardListMulti cannot resolve id key without table queries');
        const orderKey = this.sharedOrderKey();
        if (!orderKey)
            throw new Error('RowCardListMulti cannot resolve order key without table queries');
        const item = {
            table,
            row,
        } as RowCardListCardItem<T>;
        item[idKey] = this.getRowNumericValue(row, idKey, table, 'id');
        item[orderKey] = this.getRowNumericValue(row, orderKey, table, 'order');
        return item;
    }

    private getRowNumericValue(row: Row<T>, key: string, tableName: T, valueLabel: 'id' | 'order') {
        const value = (row as any)[key];
        if (typeof value !== 'number')
            throw new Error(`RowCardListMulti expected numeric ${valueLabel} key '${key}' on table '${tableName}'`);
        return value;
    }

    private getTable<K extends T>(tableName: K): Table<K> {
        return this.supabase.sync.from(tableName);
    }
}
