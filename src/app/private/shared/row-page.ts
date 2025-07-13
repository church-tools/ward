import { Component, EventEmitter, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TableService } from '../../modules/shared/table.service';
import { Row, TableName } from '../../shared/types';
import { xcomputed } from '../../shared/utils/signal-utils';
import { PrivatePageComponent } from './private-page';

@Component({
    selector: 'app-row-page',
    template: ``,
    host: {
        class: "column gap-3",
        '[class.hidden]': "!show()",
    },
})
export abstract class RowPageComponent<T extends TableName> extends PrivatePageComponent implements OnInit, OnDestroy {
    
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    
    readonly row = signal<Row<T> | undefined>(undefined);
    readonly onIdChange = new EventEmitter<number | null>();
    
    protected readonly title = xcomputed([this.row], row => row ? this.tableService.toString(row) : '');
    
    private subscription?: Subscription;

    constructor(protected readonly tableService: TableService<T>) {
        super();
    }

    async ngOnInit() { 
        // Subscribe to route parameter changes instead of using snapshot
        this.subscription = this.route.paramMap.subscribe(async (params) => {
            const rowId = params.get(this.tableService.tableName);
            this.onIdChange.emit(rowId ? +rowId : null);
            if (!rowId) throw new Error(`${this.tableService.tableName} ID is required in the route`);
            const row = await this.tableService.get(+rowId);
            this.row.set(row);
        });
    }

    ngOnDestroy() {
        this.subscription?.unsubscribe();
    }

    protected navigateToThis() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

}