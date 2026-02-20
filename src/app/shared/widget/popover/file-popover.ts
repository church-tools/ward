import { Component, inject, signal } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { TranslateModule } from "@ngx-translate/core";
import AsyncButtonComponent from "../../form/button/async/async-button";
import ButtonComponent from "../../form/button/button";
import { FileStorageService } from "../../service/file-storage.service";
import { download, downloadUrl, FileInfo, FileType, FileUrl, getEmbedUrl, openFileInfoInNewTab, viewedByService } from "../../utils/file-utils";
import { asyncComputed, xcomputed } from "../../utils/signal-utils";
import { PopoverPage } from "./popover";

@Component({
    selector: 'app-file-popover',
    template: `
        <div class="column full-width full-height">
            <div class="title-bar row no-wrap position-relative center-content gap-2 p-2">
                <h4 class="grow-1 align-content-center overflow-ellipsis ps-4">{{ file().name }}</h4>
                <div class="row center-content gap-2">
                    @if (onDelete) {
                        <app-async-button class="icon-only" icon="delete" type="secondary" size="large"
                            [onClick]="onDelete" hideSuccess/>
                    }
                </div>
                <app-button class="icon-only" icon="arrow_download" type="secondary" size="large"
                    (onClick)="download()"/>
                <app-button class="icon-only" icon="open" type="secondary" size="large"
                    (onClick)="openInTab()"/>
                <div class="spacer"></div>
            </div>
            @if (isImage()) {
                <div class="viewer full-width full-height">
                    <img [src]="src()" class="full-width full-height"/>
                </div>
            } @else if (src()) {
                <iframe #iframe frameBorder="0" [src]="src()" class="full-width full-height"></iframe>
            }
        <div>
    `,
    imports: [TranslateModule, ButtonComponent, AsyncButtonComponent],
    styleUrl: './popover.scss',
    styles: [`
        .title-bar {
            height: 3.25rem;
            .spacer { width: 3.25rem; }
        }
        .viewer {
            overflow: auto;
            img {
                display: block;
                object-fit: contain;
            }
        }
        :host {
            height: 80rem;
            width: 60rem;
            max-width: calc(100vw - 4rem);
            max-height: calc(100vh - 4rem);

        }
    `]
})
export class FilePopoverComponent extends PopoverPage {

    private readonly sanitizer = inject(DomSanitizer);
    private readonly fileStorage = inject(FileStorageService);

    readonly file = signal<FileInfo>(null!);
    onDelete?: () => Promise<void>;

    protected readonly isImage = xcomputed([this.file], file => file.type === FileType.image);

    protected readonly src = asyncComputed([this.file, this.isImage], async (file, isImage) => {
        if (!file.url && !file.data) return;
        let url = file.url!;
        if (file.data) {
            url = viewedByService(file.type!)
                ? await this.fileStorage.getUrl(file.key, 'GET')
                : URL.createObjectURL(file.data) as FileUrl;
            setTimeout(() => URL.revokeObjectURL(url), 3000);
        }
        if (!isImage)
            url = getEmbedUrl(url, file.type) as FileUrl;
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    });

    protected download() {
        const { url, data } = this.file();
        if (data)
            download(data);
        else if (url)
            downloadUrl(url, this.file().name);
    }

    protected openInTab() {
        openFileInfoInNewTab(this.file());
    }
}
