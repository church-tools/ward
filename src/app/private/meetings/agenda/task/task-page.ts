import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import AsyncButtonComponent from '../../../../shared/form/button/async/async-button';
import FileInputComponent from '../../../../shared/form/file/file-input';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextareaComponent } from '../../../../shared/form/text/textarea';
import { SyncedFieldDirective } from "../../../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../../../shared/row-history";
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-textarea [syncedRow]="syncedRow" column="title" name="title" textClass="h3"
            [subtle]="true"/>
        <app-rich-text [syncedRow]="syncedRow" column="content" name="content"/>
        <app-file-input [syncedRow]="syncedRow" column="files" name="files"/>
        <div class="row end-content mt-auto">
            <app-async-button type="secondary" icon="delete"
                [onClick]="deleteTask">
                {{ 'DELETE' | translate }}
            </app-async-button>
        </div>
        <app-row-history [row]="syncedRow.value()"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TranslateModule, TextareaComponent, RichTextComponent, RowHistoryComponent, SyncedFieldDirective,
        FileInputComponent, AsyncButtonComponent],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    protected readonly tableName = 'task';

    protected deleteTask = async () => {
        await this.syncedRow.write({ deleted: true });
        this.router.navigate(['../'], { relativeTo: this.route });
    };
}