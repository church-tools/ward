import { Component, input } from "@angular/core";
import { Page } from "../../../shared/page/page";
import type { Row, TableName } from "../table.types";

@Component({
    selector: 'app-list-row',
    template: '',
    host: { 'class': 'full-width' }
})
export abstract class ListRow<T extends TableName> {
    
    readonly row = input.required<Row<T>>();
    readonly onRemove = input<(row: Row<T>) => Promise<void>>();
    readonly page = input<Page>();
}
