import { Component, input } from "@angular/core";
import { Row, Table, TableName, TableQuery } from "../../../modules/shared/table.types";
import { IconComponent } from "../../icon/icon";
import { getProviders, InputBaseComponent } from "../shared/input-base";

@Component({
    selector: 'app-icon-picker',
    template: `
        <app-icon icon="access_time" [filled]="true"/>
    `,
    providers: getProviders(() => IconPickerComponent),
    imports: [IconComponent],
})
export class IconPickerComponent<T extends TableName> extends InputBaseComponent<T> {

    readonly iconOptions = input<((table: Table<T>) => TableQuery<T, Row<T>[]>) | null>(null);
    readonly colored = input<boolean>(false);
    readonly filled = input<boolean>(false);

}