import { Component, input } from "@angular/core";
import type { Row, TableName } from "../../shared/types";

@Component({
    selector: 'app-list-row',
    template: '',
})
export abstract class ListRowComponent<T extends TableName> {
    
    readonly row = input.required<Row<T>>();
}