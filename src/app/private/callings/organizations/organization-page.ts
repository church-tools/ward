import { Component, inject } from '@angular/core';
import { LocalizePipe } from '@/shared/language/localize.pipe';
import { ColorPicker } from "@/shared/form/color-picker/color-picker";
import { TextInput } from '@/shared/form/text/text-input';
import { SyncedFieldDirective } from '@/shared/utils/supa-sync/synced-field.directive';
import { RowHistory } from '../../shared/row-history';
import { RowPage } from '../../shared/row-page';
import { Select } from "@/shared/form/select/select";
import { OrganizationViewService } from '@/modules/organization/organization-view.service';

@Component({
    selector: 'app-organization-page',
    template: `
        <div class="row no-wrap gap-2 items-center">
            <app-color-picker [syncedRow]="syncedRow" column="color" name="color"/>
            <app-text-input class="grow-3" [syncedRow]="syncedRow" column="name" name="title" textClass="h1" subtle/>
        </div>
        <div class="column-grid">
            <app-text-input class="col-md-4" [syncedRow]="syncedRow" column="abbreviation" name="abbreviation"
                label="{{ 'ORGANIZATION_PAGE.ABBREVIATION' | localize }}"/>
            
            <app-select [syncedRow]="syncedRow" column="gender"
                class="col-md-8" name="gender"
                [options]="organizationView.genderOptions" translateOptions
                label="{{ 'ORGANIZATION_PAGE.GENDER' | localize }}"/>
        </div>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [LocalizePipe, TextInput, RowHistory, SyncedFieldDirective, ColorPicker, Select],
})
export class OrganizationPage extends RowPage<'organization'> {

    protected readonly organizationView = inject(OrganizationViewService);

    protected readonly tableName = 'organization';
}