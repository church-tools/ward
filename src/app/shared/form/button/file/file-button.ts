import { Component, input, output, signal, viewChild } from "@angular/core";
import { Icon, IconComponent } from "../../../icon/icon";
import { xcomputed } from "../../../utils/signal-utils";
import ButtonBaseComponent from "../shared/button-base";
import FileDropComponent from "./file-drop.component";

@Component({
    selector: 'app-file-button',
    imports: [IconComponent, FileDropComponent],
    templateUrl: './file-button.html',
    styleUrl: './file-button.scss'
})
export default class FileButtonComponent extends ButtonBaseComponent {

    private readonly fileDrop = viewChild(FileDropComponent);
    
    override readonly icon = input<Icon | undefined>('folder_arrow_up');
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