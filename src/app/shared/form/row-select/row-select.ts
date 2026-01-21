import { Component, input } from "@angular/core";
import { Row, Table, TableName, TableQuery } from "../../../modules/shared/table.types";
import { SelectComponent } from "../select/select";
import { getProviders, InputBaseComponent } from "../shared/input-base";

@Component({
    selector: 'app-row-select',
    template: `
        <app-select [options]="getOptions"
            [value]="viewValue()" (valueChange)="setViewValue($event)"/>
    `,
    providers: getProviders(() => RowSelectComponent),
    imports: [SelectComponent],
})
export class RowSelectComponent<T extends TableName> extends InputBaseComponent<T> {

    readonly table = input.required<T>();
    readonly getQuery = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);

    readonly allowCustom = input<boolean>(false);
    readonly multiple = input<boolean>(false);

    protected getOptions = async (search: string) => {
        return [];
    }
}