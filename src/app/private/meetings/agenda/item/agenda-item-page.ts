import { Component } from '@angular/core';
import FileInput from '@/shared/form/file/file-input';
import { RichText } from "@/shared/form/rich-text/rich-text";
import { Textarea } from '@/shared/form/text/textarea';
import { SyncedFieldDirective } from "@/shared/utils/supa-sync/synced-field.directive";
import { RowDeleteButton } from "../../../shared/row-delete-button";
import { RowHistory } from "../../../shared/row-history";
import { RowPage } from '../../../shared/row-page';

@Component({
    selector: 'app-agenda-item-page',
    template: `
        <app-textarea [syncedRow]="syncedRow" column="title" name="title" textClass="h3" subtle/>
        <app-rich-text [syncedRow]="syncedRow" column="content" name="content"/>
        <app-file-input [syncedRow]="syncedRow" column="files" name="files"/>
        <!-- <app-row-select [syncedRow]="syncedRow" column="assigned_to" name="assigned_to"
            table="profiles" [multiple]="true"/> -->
        <div class="row end-content mt-auto">
            <app-row-delete-button [syncedRow]="syncedRow" backUrl="../.." suppressConfirmation/>
        </div>
        <app-row-history [row]="syncedRow.value()"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [Textarea, RichText, RowHistory,
        SyncedFieldDirective, FileInput, RowDeleteButton],
})
export class AgendaItemPage extends RowPage<'agenda_item'> {

    protected readonly tableName = 'agenda_item';

}