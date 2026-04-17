import { TableName } from '@/modules/shared/table.types';
import { getViewService } from '@/modules/shared/view.service';
import { SupabaseService } from '@/shared/service/supabase.service';
import { asyncComputed, xcomputed, xeffect } from '@/shared/utils/signal-utils';
import { SupaSyncedRow } from '@/shared/utils/supa-sync/supa-synced-row';
import { Component, inject, Injector, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RowPageService } from '../row-page.service';
import { PrivatePage } from './private-page';
import { wait } from '@/shared/utils/flow-control-utils';

@Component({
    selector: 'app-row-page',
    template: ``,
    host: {
        class: "column gap-4",
    },
})
export abstract class RowPage<T extends TableName> extends PrivatePage implements OnInit, OnDestroy {
    
    private readonly rowPageService = inject(RowPageService);
    protected readonly route = inject(ActivatedRoute);
    protected readonly router = inject(Router);
    protected readonly injector = inject(Injector);
    protected readonly supabase = inject(SupabaseService);
    
    protected readonly rowId = signal<number | null>(null);
    
    protected abstract readonly tableName: T;
    public readonly syncedRow = SupaSyncedRow.fromId(this.supabase.sync, () => this.tableName, this.rowId);
    protected readonly viewService = asyncComputed([], () => getViewService(this.injector, this.tableName));
    protected readonly title = xcomputed([this.syncedRow.value, this.viewService],
        (row, viewService) => row ? viewService?.toString(row) ?? '' : '');

    private subscription?: Subscription;

    constructor() {
        super();
        xeffect([this.syncedRow.value], row => {
            if (!row) {
                this.closePage?.();
            }
        }, { skipFirst: true });
    }

    private async setRowId(rowId: number) {
        const currentId = this.rowId();
        if (currentId === rowId)
            return;
        if (currentId)
            this.rowPageService.pageClosed(this.tableName, currentId);
        this.rowPageService.pageOpened(this.tableName, rowId);
        await this.repaintPage?.();
        this.rowId.set(rowId);
    }

    public async setPopoverRowId(rowId: number) {
        await this.setRowId(rowId);
    }

    async ngOnInit() {
        this.subscription = this.route.paramMap.subscribe(async params => {
            const rowId = params.get(this.tableName) ?? this.route.snapshot.paramMap.get(this.tableName);
            if (!rowId)
                return;
            await this.setRowId(+rowId);
        });
    }

    override ngOnDestroy() {
        this.close();
        super.ngOnDestroy();
        this.subscription?.unsubscribe();
        this.syncedRow.destroy();
    }

    close() {
        const id = this.rowId();
        if (!id)
            return;
        this.rowPageService.pageClosed(this.tableName, id);
        this.rowId.set(null);
    }

    protected navigateToThis() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

}