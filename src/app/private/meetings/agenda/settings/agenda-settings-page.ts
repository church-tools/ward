import { Component, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DbConstants } from '../../../../shared/db-constants';
import TimePickerComponent from '../../../../shared/form/date-time/time-picker';
import { IconPickerComponent } from "../../../../shared/form/icon-picker/icon-picker";
import { RowSelectComponent } from "../../../../shared/form/row-select/row-select";
import { SelectComponent } from "../../../../shared/form/select/select";
import SwitchComponent from '../../../../shared/form/switch/switch';
import { TextInputComponent } from "../../../../shared/form/text/text-input";
import { range } from '../../../../shared/utils/array-utils';
import { SyncedFieldDirective } from "../../../../shared/utils/supa-sync/synced-field.directive";
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-agenda-settings-page',
    template: `
        <div class="row no-wrap items-center gap-4">
            <app-icon-picker [iconOptions]="iconOptions" [filled]="true"
                buttonType="form"
                [syncedRow]="syncedRow" column="shape"
                [color]="syncedRow.value()?.color"
                (colorChange)="syncedRow.write({ color: $event })"/>
            <app-text-input [syncedRow]="syncedRow" column="name" class="full-width"/>
        </div>
        <app-switch [syncedRow]="syncedRow" column="pre_assign_prayer"
            label="{{ 'AGENDA_SETTINGS.PRE_ASSIGN_PRAYER' | translate }}"/>
        <div class="column-grid">
            <app-select class="col-6" [syncedRow]="syncedRow" column="weekday"
                [options]="weekdayOptions"
                label="{{ 'AGENDA_SETTINGS.WEEKDAY' | translate }}"/>
            <app-time-picker class="col-6" [syncedRow]="syncedRow" column="start_time"
                label="{{ 'AGENDA_SETTINGS.START_TIME' | translate }}"/>
        </div>
        <app-row-select [syncedRow]="syncedRow" column="organizations"
            table="organization"
            label="{{ 'AGENDA_SETTINGS.DEFAULT_SECTION' | translate }}" allowClear/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, SyncedFieldDirective, IconPickerComponent,
        TextInputComponent, SwitchComponent, TimePickerComponent, SelectComponent, RowSelectComponent],
})
export class AgendaSettingsPageComponent extends RowPageComponent<'agenda'> {

    protected readonly iconOptions = DbConstants.public.Enums.shape;
    protected readonly tableName = 'agenda';
    private readonly translate = inject(TranslateService);

    protected readonly weekdayOptions = range(0, 6).map(i => ({
        value: i,
        view: this.translate.instant(`WEEKDAYS.${i}`),
    }));
}