import { Component, inject, input } from "@angular/core";
import { TranslateModule } from "@ngx-translate/core";
import { FileStorageService } from "../../service/file-storage.service";
import { assureArray } from "../../utils/array-utils";
import { compressTimestamp } from "../../utils/date-utils";
import { FileInfo, FileKey, getColor, getIcon, getTypeFromName, needsIframe, viewedByService } from "../../utils/file-utils";
import { xcomputed } from "../../utils/signal-utils";
import ErrorMessageComponent from "../../widget/error-message/error-message";
import { FilePopoverComponent } from "../../widget/popover/file-popover";
import { PopoverService } from "../../widget/popover/popover.service";
import AsyncButtonComponent from "../button/async/async-button";
import FileButtonComponent from "../button/file/file-button";
import { getProviders, InputBaseComponent } from "../shared/input-base";
import InputLabelComponent from "../shared/input-label";
import { wait } from "../../utils/flow-control-utils";

@Component({
    selector: 'app-file-input',
    imports: [TranslateModule, InputLabelComponent, ErrorMessageComponent,
        AsyncButtonComponent, FileButtonComponent],
    templateUrl: './file-input.html',
    providers: getProviders(() => FileInputComponent)
})
export default class FileInputComponent extends InputBaseComponent<FileInfo[], string[]> {

    private readonly fileStorage = inject(FileStorageService);
    private readonly popoverService = inject(PopoverService);

    protected readonly allowedCount = input(12);
    protected readonly accept = input<string, string>('', { transform: v => assureArray(v).join(',') });
    protected readonly capture = input<string>();
    protected readonly description = input<string>('FILE_INPUT.FILE');
    protected readonly allowedSize = input(8); // in MB

    protected readonly uploadVisible = xcomputed([this.value, this.allowedCount, this.disabled],
        (value, allowedCount, disabled) => (!value || value.length < allowedCount) && !disabled);
        
    protected async handleFileInput(file: File) {
        const errorView = this.errorView();
        if (file.size > this.allowedSize() * 1000000)
            return errorView?.setError('FILE_INPUT.TOO_LARGE', { size: this.allowedSize() });
        errorView?.setError(null);
        const key = compressTimestamp() as FileKey;
        const info = this.valueToInfo(`${key}_${file.name}`);
        info.data = file;
        this.viewValue.update(v => [...(v ?? []), info]);
        info.unsaved = true;
        await this.fileStorage.upload(file, key);
        info.unsaved = false;
        this.emitChange();
    }

    protected override mapIn(value: string[] | null): FileInfo[] {
        return (value ?? []).map(this.valueToInfo);
    }

    protected override mapOut(value: FileInfo[]): string[] {
        return value.filter(v => !v.unsaved).map(v => v.value);
    }

    protected getName = (value: string) => value.split('_')[1].replace(/\.[A-Za-z0-9]+$/, '');
    protected getIcon = getIcon;
    protected getColor = getColor;

    protected openFile(fileInfo: FileInfo) {
        return async () => {
            fileInfo.data ??= this.fileStorage.getCached(fileInfo.key);
            if (!fileInfo.data) {
                if (fileInfo.type && needsIframe(fileInfo.type)) {
                    const url = fileInfo.url = await this.fileStorage.getUrl(fileInfo.key, 'GET');
                    if (!viewedByService(fileInfo.type))
                        wait(100)
                        .then(() => this.fileStorage.loadUrl(fileInfo.key, url, fileInfo.name))
                        .then(data => fileInfo.data = data);
                } else
                    fileInfo.data = await this.fileStorage.read(fileInfo.key, fileInfo.name);
            }
            this.popoverService.open(FilePopoverComponent)
                .then(popover => {
                    popover.instance.file.set(fileInfo);
                    if (!this.disabled())
                        popover.instance.onDelete = async () => {
                            await this.remove(fileInfo);
                            this.popoverService.close();
                        };
                });
        }
    }

    protected async remove(fileInfo: FileInfo) {
        await this.fileStorage.delete(fileInfo.key);
        this.viewValue.update(v => v?.filter(v => v !== fileInfo) ?? []);
        this.emitChange();
    }

    private valueToInfo(value: string): FileInfo {
        const [key, ...nameParts] = value.split('_') as [FileKey, string];
        const fullName = nameParts.join('_');
        const name = fullName.replace(/\.[A-Za-z0-9]+$/, '');
        const ending = fullName.split('.').pop() || '';
        const type = getTypeFromName(ending);
        return { fullName, name, value, key, type, icon: getIcon(type), color: getColor(type) };
    }
}
