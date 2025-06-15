import { Component } from "@angular/core";
import type { TableName } from "../../shared/types";

@Component({
    selector: 'app-list-insert',
    template: '',
})
export abstract class ListInsertComponent<T extends TableName> {
    
}