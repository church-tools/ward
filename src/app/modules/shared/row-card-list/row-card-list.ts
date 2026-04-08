import { CommonModule } from "@angular/common";
import { booleanAttribute, Component, contentChild, inject, Injector, input, OnDestroy, OnInit, output, TemplateRef, viewChild } from "@angular/core";
import { Router, UrlTree } from "@angular/router";
import { IconCode } from "@/shared/icon/icon";
import { Page } from "@/shared/page/page";
import { SupabaseService } from "@/shared/service/supabase.service";
import { PromiseOrValue } from "@/shared/types";
import { asyncComputed, waitForNextChange, xcomputed, xeffect } from "@/shared/utils/signal-utils";
import { Subscription } from "@/shared/utils/supa-sync/event-emitter";
import { CardList } from "@/shared/widget/card-list/card-list";
import type { Insert, Row, Table, TableName, TableQuery } from "../table.types";
import { getViewService } from "../view.service";

type RowTemplateContext<T extends TableName> = {
    $implicit: Row<T>;
    page: Page | undefined;
    onRemove: (row: Row<T>) => Promise<void>;
}

type InsertTemplateContext<T extends TableName> = {
    $implicit: {
        insert: (item: Insert<T>) => PromiseOrValue<void>;
        cancel: () => void;
    };
    prepareInsert: (row: Insert<T>) => PromiseOrValue<void>;
    context: unknown;
}

@Component({
    selector: 'app-row-card-list',
    templateUrl: './row-card-list.html',
    imports: [CommonModule, CardList],
})
export class RowCardList<T extends TableName> implements OnInit, OnDestroy {

    readonly injector = inject(Injector);
    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);

    readonly tableName = input.required<T>();
    readonly getQuery = input<({ query: (table: Table<T>) => TableQuery<T, Row<T>[]>, id: string, mutable?: boolean }) | null>(null);
    readonly editable = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly gap = input(2);
    readonly columns = input(1);
    readonly cardsVisible = input(true);
    readonly getUrl = input<(row: Row<T> | null) => string | UrlTree>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly insertContext = input<unknown>(null);
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly activeId = input<number | null>(null);
    readonly page = input<Page>();
    readonly emptyIcon = input<IconCode | null>(null);
    readonly rowClicked = input<(row: Row<T>) => void>();
    readonly orderKey = input<keyof Row<T> | null>(null);
    readonly fixedOrder = input<boolean, unknown>(false, { transform: booleanAttribute });

    protected readonly cardListView = viewChild<CardList<Row<T>, number>>(CardList);
    protected readonly rowTemplate = contentChild.required<TemplateRef<RowTemplateContext<T>>>('rowTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<InsertTemplateContext<T>>>('insertTemplate');

    protected readonly table = xcomputed([this.tableName], t => this.supabase.sync.from(t));
    protected readonly viewService = asyncComputed([this.tableName], t => getViewService(this.injector, t), null);
    readonly rowCount = xcomputed([this.cardListView], clv => clv?.cardCount() ?? 0, { trackInner: true });
    readonly initialized = xcomputed([this.cardListView], clv => clv?.initialized() ?? false, { trackInner: true });

    private queryId: string | null = null;
    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.tableName, this.cardListView, this.getQuery], async (tableName, cardListView, getQuery) => {
            if (!cardListView || !getQuery) return;
            const { query, id, mutable } = getQuery;
            if (this.queryId && this.queryId === id) return;
            this.queryId = id;
            this.subscription?.unsubscribe();
            const table = this.supabase.sync.from(tableName);
            if (cardListView.cardCount()) {
                if (mutable) {
                    const ids = await query(table).getKeys<number>();
                    await cardListView.removeExcept(ids);
                } else {
                    await cardListView.clear(true);
                }
            }
            this.subscription = query(table).subscribe(update => {
                cardListView.updateItems({ items: update.result, deletions: update.deletions });
            });
        });
    }

    async ngOnInit() {
        const activeId = this.activeId();
        if (!activeId) return;
        const initialized = await waitForNextChange(this.initialized, this.injector);
        if (!initialized) return;
        this.cardListView()?.scrollToItem(activeId);
    }
    
    protected insertRow = async (row: Row<T>) => {
        const table = this.table();
        return await table.insert(row);
    }

    protected removeRow = async (row: Row<T>) => {
        const table = this.table();
        const id = table.getId(row);
        await Promise.all([
            table.delete(row),
            this.cardListView()?.updateItems({ deletions: [id] }),
        ]);
    }

    protected async onOrderChanged(rows: Row<T>[]) {
        await this.table().update(rows);
    }

    protected async onItemDropped(row: Row<T>) {
        await this.prepareInsert()?.(row);
        await this.table().update(row);
    }

    protected onRowClick = (row: Row<T>) => {
        const getUrl = this.getUrl();
        if (getUrl && this.activeId() === this.table().getId(row))
            this.router.navigateByUrl(getUrl(null));
    }

    protected _prepareInsert(row: Insert<T>): PromiseOrValue<void> {
        this.prepareInsert()?.(row);
        const orderKey = this.table().info.orderKey;
        if (orderKey) {
            const last = this.cardListView()?.getLast();
            (row as any)[orderKey] = (last?.[orderKey] as number ?? -1) + 1;
        }
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}
