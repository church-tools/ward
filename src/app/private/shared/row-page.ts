import { Component, inject, Injector, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Row, TableName } from '../../modules/shared/table.types';
import { getViewService } from '../../modules/shared/view.service';
import { SupabaseService } from '../../shared/service/supabase.service';
import { asyncComputed, xcomputed } from '../../shared/utils/signal-utils';
import { RowPageService } from '../row-page.service';
import { PrivatePageComponent } from './private-page';

@Component({
    selector: 'app-row-page',
    template: ``,
    host: {
        class: "column gap-3",
    },
})
export abstract class RowPageComponent<T extends TableName> extends PrivatePageComponent implements OnInit, OnDestroy {
    
    private readonly rowPageService = inject(RowPageService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    protected readonly injector = inject(Injector);
    protected readonly supabase = inject(SupabaseService);
    
    readonly row = signal<Row<T> | null>(null);
    onIdChange?: (rowId: number) => Promise<void> | undefined;
    
    protected abstract readonly tableName: T;
    protected get table() { return this.supabase.sync.from(this.tableName); }
    protected readonly viewService = asyncComputed([], () => getViewService(this.injector, this.tableName));
    protected readonly title = xcomputed([this.row, this.viewService],
        (row, viewService) => row ? viewService?.toString(row) ?? '' : '');

    private subscription?: Subscription;

    async ngOnInit() {
        this.subscription = this.route.paramMap.subscribe(async (params) => {
            const rowId = params.get(this.tableName);
            if (!rowId) throw new Error(`${this.tableName} ID is required in the route`);
            this.rowPageService.pageOpened(this.tableName, +rowId);
            await this.onIdChange?.(+rowId);
            const row = await this.supabase.sync.from(this.tableName).read(+rowId).get();
            this.row.set(row);
        });
    }

    override ngOnDestroy() {
        this.close();
        super.ngOnDestroy();
        this.subscription?.unsubscribe();
    }

    close() {
        const id = this.row()?.[this.table.idKey] as number | undefined;
        if (id) this.rowPageService.pageClosed(this.tableName, id);
    }

    protected navigateToThis() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

}