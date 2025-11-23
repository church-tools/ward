import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from "@angular/core";

@Component({
    selector: 'app-file-drop',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <input #fileInput type="file" [accept]="accept()" [attr.capture]="capture()"
            (drop)="handleDrop($event)" (change)="handleFileInput($event)"
            (dragenter)="dragHover.set(true)" (dragleave)="dragHover.set(false)" (dragover)="allowDrop($event)"
            [disabled]="disabled()">
    `,
    host: { '[class.drag-hovered]': "dragHover()" },
    styleUrl: './file-drop.component.scss'
})
export default class FileDropComponent {

    private readonly fileInput = viewChild.required('fileInput', { read: ElementRef });
    
    readonly accept = input<string>(); // Filetypes to accept
    readonly capture = input<string>();
    readonly disabled = input(false);

    readonly onFile = output<File>();

    protected readonly dragHover = signal(false);

    open() {
        this.fileInput().nativeElement.click();
    }

    protected async handleFileInput(fileInput: any) {
        const file = fileInput.target.files[0] as File | undefined;
        if (!file || !this.isAccepted(file)) return;
        this.onFile.emit(file);
        fileInput.target.value = null;
    }

    protected allowDrop(event: DragEvent) {
        event.preventDefault();
    }

    protected async handleDrop(event: DragEvent) {
        this.dragHover.set(false);
        const dragJson = event.dataTransfer?.getData('text/plain');
        if (!dragJson) return;
    }

    private isAccepted(file: File) {
        const accept = this.accept()?.split(',').map(a => new RegExp(a.trim()));
        if (!accept) return true;
        return accept.some(a => a.test(file.type));
    }
}