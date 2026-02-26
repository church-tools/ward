import { CommonModule } from "@angular/common";
import { booleanAttribute, Component, contentChild, inject, Injector, input, OnDestroy, OnInit, output, TemplateRef, viewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Icon } from "../../../shared/icon/icon";
import { PageComponent } from "../../../shared/page/page";
import { SupabaseService } from "../../../shared/service/supabase.service";
import { PromiseOrValue } from "../../../shared/types";
import { asyncComputed, waitForNextChange, xcomputed, xeffect } from "../../../shared/utils/signal-utils";
import { Subscription } from "../../../shared/utils/supa-sync/event-emitter";
import { CardListComponent } from "../../../shared/widget/card-list/card-list";
import type { Insert, Row, Table, TableName, TableQuery } from "../table.types";
import { getViewService } from "../view.service";

type RowTemplateContext<T extends TableName> = {
    $implicit: Row<T>;
    page: PageComponent | undefined;
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
    imports: [CommonModule, CardListComponent],
})
export class RowCardListComponent<T extends TableName> implements OnInit, OnDestroy {

    readonly injector = inject(Injector);
    private readonly router = inject(Router);
    private readonly supabase = inject(SupabaseService);

    readonly tableName = input.required<T>();
    readonly getQuery = input<({ query: (table: Table<T>) => TableQuery<T, Row<T>[]>, id: string }) | null>(null);
    readonly editable = input<boolean, unknown>(false, { transform: booleanAttribute });
    readonly gap = input(2);
    readonly cardsVisible = input(true);
    readonly getUrl = input<(row: Row<T> | null) => string>();
    readonly prepareInsert = input<(row: Insert<T>) => PromiseOrValue<void>>();
    readonly insertContext = input<unknown>(null);
    readonly cardClasses = input<string>('card canvas-card suppress-canvas-card-animation');
    readonly activeId = input<number | null>(null);
    readonly page = input<PageComponent>();
    readonly emptyIcon = input<Icon | null>(null);
    readonly rowClicked = output<Row<T>>();

    protected readonly cardListView = viewChild(CardListComponent);
    protected readonly rowTemplate = contentChild.required<TemplateRef<RowTemplateContext<T>>>('rowTemplate');
    protected readonly insertTemplate = contentChild<TemplateRef<InsertTemplateContext<T>>>('insertTemplate');

    protected readonly table = xcomputed([this.tableName], t => this.supabase.sync.from(t));
    protected readonly viewService = asyncComputed([this.tableName], t => getViewService(this.injector, t), null);
    readonly rowCount = xcomputed([this.cardListView], clv => clv?.cardCount() ?? 0);
    readonly initialized = xcomputed([this.cardListView], clv => clv?.initialized() ?? false);

    private queryId: string | null = null;
    private subscription: Subscription | undefined;

    constructor() {
        xeffect([this.tableName, this.cardListView, this.getQuery], async (tableName, cardListView, getQuery) => {
            if (!cardListView || !getQuery) return;
            const { query, id } = getQuery;
            if (this.queryId && this.queryId === id && cardListView.cardCount()) return;
            this.queryId = id;
            this.subscription?.unsubscribe();
            await cardListView.clear(true);
            const table = this.supabase.sync.from(tableName);
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
        const id = row[table.idKey] as number;
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

    protected onRowClick(row: Row<T>) {
        const getUrl = this.getUrl();
        if (getUrl && this.activeId() === row[this.table().idKey])
            this.router.navigate([getUrl(null)]);
    }

    protected _prepareInsert(row: Row<T>): PromiseOrValue<void> {
        this.prepareInsert()?.(row);
        const orderKey = this.table().info.orderKey;
        if (orderKey)
            row[orderKey] = (this.cardListView()?.getLast()?.[orderKey] ?? -1) + 1;
    }

    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }
}
