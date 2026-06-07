import { CustomTextViewService } from '@/modules/sacrament-meeting/item/custom-text/custom-text-view.service';
import { RichText } from "@/shared/form/rich-text/rich-text";
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { Component, inject } from '@angular/core';
import { RowHistory } from '../../../shared/row-history';
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-message-page',
    template: `
        <h3 class="mb--4">{{ 'SACRAMENT_MEETING_PAGE.CUSTOM_TEXT' | localize }}</h3>
        <div class="column-grid">
            <app-rich-text [syncedRow]="syncedRow" column="content"
                class="col-12"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, SyncedFieldDirective, RowHistory, RichText],
})
export class CustomSacramentTextPage extends RowPage<'custom_text'> {

    protected readonly tableName = 'custom_text';
    protected readonly customTextView = inject(CustomTextViewService);

}
