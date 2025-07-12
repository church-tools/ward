import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
export abstract class RowPageComponent<T extends TableName> extends PrivatePageComponent implements OnInit {
    
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    
    protected readonly row = signal<Row<T> | undefined>(undefined);

    protected readonly title = xcomputed([this.row], row => row ? this.tableService.toString(row) : '');

    constructor(protected readonly tableService: TableService<T>) {
        super();
    }

    async ngOnInit() { 
        const rowId = this.route.snapshot.paramMap.get(this.tableService.tableName);
        if (!rowId) throw new Error(`${this.tableService.tableName} ID is required in the route`);
        const row = await this.tableService.get(+rowId);
        this.row.set(row);
    }

    protected navigateToThis() {
        this.router.navigate(['.'], { relativeTo: this.route });
    }

}