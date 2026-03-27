import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ColorPicker } from "@/shared/form/color-picker/color-picker";
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { RowHistory } from '../../shared/row-history';
import { RowPage } from '../../shared/row-page';

@Component({
    selector: 'app-organization-page',
    template: `
        <div class="row no-wrap gap-2 items-center">
            <app-color-picker [syncedRow]="syncedRow" column="color" name="color"/>
            <app-text-input class="grow-3" [syncedRow]="syncedRow" column="name" name="title" textClass="h1" subtle/>
        </div>
        <div class="column-grid">
            <app-text-input class="col-md-4" [syncedRow]="syncedRow" column="abbreviation" name="abbreviation"
                label="{{ 'ORGANIZATION_PAGE.ABBREVIATION' | translate }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, TextInput, RowHistory, SyncedFieldDirective, ColorPicker],
})
export class OrganizationPage extends RowPage<'organization'> {

    protected readonly tableName = 'organization';
}