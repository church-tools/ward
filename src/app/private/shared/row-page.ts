import { Component, inject, OnInit, signal } from '@angular/core';
import { PrivatePageComponent } from './private-page';
import { Row, TableName } from '../../shared/types';
import { TableService } from '../../modules/shared/table.service';
import { ActivatedRoute } from '@angular/router';
import { xcomputed } from '../../shared/utils/signal-utils';

@Component({
    selector: 'app-row-page',
    template: ``,
    host: {
        class: "animated column gap-3",
        '[class.hidden]': "!show()",
    },
})
export abstract class RowPageComponent<T extends TableName> extends PrivatePageComponent implements OnInit {
    
    private readonly route = inject(ActivatedRoute);
    
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

}