import { CalculatedMap, TableName } from "@/modules/shared/table.types";
import { AsyncButton } from "@/shared/form/button/async/async-button";
import { SupaSyncedRow } from "@/shared/utils/supa-sync/supa-synced-row";
import { Component, inject, input } from "@angular/core";
import { Router } from "@angular/router";
import { LocalizePipe } from '@/shared/language/localize.pipe';
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

    private readonly router = inject(Router);

    readonly syncedRow = input.required<SupaSyncedRow<Database, T, CalculatedMap[T]>>()
    readonly backUrl = input.required<string>();

    protected deleteRow = async () => {
        await this.syncedRow().write({ deleted: true });
        this.router.navigate([this.backUrl()]);
    };
}