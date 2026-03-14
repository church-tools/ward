import { Component, input, output, signal, viewChild } from "@angular/core";
import { IconCode, Icon } from "../../../icon/icon";
import { xcomputed } from "../../../utils/signal-utils";
import ButtonBase from "../shared/button-base";
import FileDrop from "./file-drop.component";

@Component({
    selector: 'app-file-button',
    imports: [Icon, FileDrop],
    templateUrl: './file-button.html',
    styleUrl: './file-button.scss'
})
export default class FileButton extends ButtonBase {

    private readonly fileDrop = viewChild(FileDrop);
    
    override readonly icon = input<IconCode | undefined>('folder_arrow_up');
    readonly description = input('Dateien hochladen');
    readonly accept = input<string>(); // Filetypes to accept
    readonly capture = input<string>();
    
    readonly asyncUpload = input<(file: File) => Promise<any>>();
    readonly onUpload = output<File>();
    
    protected readonly loading = signal(false);
    protected readonly visibleIcon = xcomputed([this.icon, this.loading],
        (icon, loading) => loading ? 'throbber' : icon);

    protected async handleFileInput(file: File) {
        const asyncUpload = this.asyncUpload();
        if (asyncUpload) {
            this.loading.set(true);
            try {
                await asyncUpload(file);
            } finally {
                this.loading.set(false);
            }
        } else
            this.onUpload.emit(file);
    }

    execute() {
        this.fileDrop()?.open();
    }

}