import { Component, inject } from '@angular/core';
import FileButtonComponent from '../../../../shared/form/button/file/file-button';
import { RichTextComponent } from "../../../../shared/form/rich-text/rich-text";
import { TextareaComponent } from '../../../../shared/form/text/textarea';
import { FileStorageService } from '../../../../shared/service/file-storage.service';
import { openFile } from '../../../../shared/utils/file-utils';
import { SyncedFieldDirective } from "../../../../shared/utils/supa-sync/synced-field.directive";
import { RowHistoryComponent } from "../../../shared/row-history";
import { RowPageComponent } from '../../../shared/row-page';

@Component({
    selector: 'app-task-page',
    template: `
        <app-textarea [syncedRow]="syncedRow" column="title" name="title" textClass="h3"
            [subtle]="true"/>
        <app-rich-text [syncedRow]="syncedRow" column="content" name="content"/>
        <app-file-button (onUpload)="uploadFile($event)"/>
        <app-row-history [row]="syncedRow.value()" class="mt-auto"/>
    `,
    host: { class: 'page narrow full-height' },
    imports: [TextareaComponent, RichTextComponent, RowHistoryComponent, SyncedFieldDirective,
        FileButtonComponent],
})
export class TaskPageComponent extends RowPageComponent<'task'> {

    private readonly fileStorage = inject(FileStorageService);

    protected readonly tableName = 'task';

    protected async uploadFile(file: File) {
        const task = this.syncedRow.value();
        if (!task) throw new Error('No task loaded');
        const handle = await this.fileStorage.upload(file);
        const check = await this.fileStorage.read(handle);
        const checkedFile = new File([check], file.name);
        openFile(checkedFile);
        console.log('Uploaded file, first 100 chars:', check.slice(0, 100));
    }
}