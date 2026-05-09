import { CalculatedMap, TableName } from "@/modules/shared/table.types";
import { AsyncButton } from "@/shared/form/button/async/async-button";
import { Button } from "@/shared/form/button/button";
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SupaSyncedRow } from "@/shared/utils/supa-sync/supa-synced-row";
import { PopoverService } from "@/shared/widget/popover/popover.service";
import { booleanAttribute, Component, inject, input } from "@angular/core";
import { Database } from "@root/database";

@Component({
    selector: 'app-row-delete-button',
    template: `
        @if (suppressConfirmation()) {
            <app-async-button type="secondary" icon="delete"
                [onClick]="deleteRow">
                {{ 'DELETE' | localize }}
            </app-async-button>
        } @else {
            <app-button type="secondary" icon="delete"
                (onClick)="confirmAndDelete()">
                {{ 'DELETE' | localize }}
            </app-button>
        }
    `,
    imports: [LocalizePipe, Button, AsyncButton],
})
export class RowDeleteButton<T extends TableName> {

    private readonly popover = inject(PopoverService);
    
    readonly syncedRow = input.required<SupaSyncedRow<Database, T, CalculatedMap[T]>>()
    readonly suppressConfirmation = input<boolean, unknown>(false, { transform: booleanAttribute });

    protected deleteRow = async () => {

        await this.syncedRow().write({ deleted: true });
    };

    protected async confirmAndDelete() {
        const confirmed = await this.popover.confirm(
            'DELETE_CONFIRMATION.TITLE',
            'DELETE_CONFIRMATION.MESSAGE',
            'DELETE_CONFIRMATION.CONFIRM',
            'DELETE_CONFIRMATION.CANCEL'
        );
        if (confirmed) await this.deleteRow();
    }
}
