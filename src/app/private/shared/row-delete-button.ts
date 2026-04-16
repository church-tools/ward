import { CalculatedMap, TableName } from "@/modules/shared/table.types";
import { AsyncButton } from "@/shared/form/button/async/async-button";
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupaSyncedRow } from "@/shared/utils/supa-sync/supa-synced-row";
import { Component, input } from "@angular/core";
import { Database } from "@root/database";

@Component({
    selector: 'app-row-delete-button',
    template: `
        <app-async-button type="secondary" icon="delete"
            [onClick]="deleteRow">
            {{ 'DELETE' | localize }}
        </app-async-button>
    `,
    imports: [LocalizePipe, AsyncButton],
})
export class RowDeleteButton<T extends TableName> {

    readonly syncedRow = input.required<SupaSyncedRow<Database, T, CalculatedMap[T]>>()

    protected deleteRow = async () => {
        await this.syncedRow().write({ deleted: true });
    };
}