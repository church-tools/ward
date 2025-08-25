import { CdkDrag } from "@angular/cdk/drag-drop";
import { EventEmitter, Injectable, signal } from "@angular/core";

    export type DragData<T> = { drag: CdkDrag, data: T, view: HTMLElement };

@Injectable({
    providedIn: 'root',
})
export class DragDropService {

    readonly _dragged = signal<DragData<any> | null>(null);
    readonly dragged = this._dragged.asReadonly();

    readonly onDrop = new EventEmitter<DragData<any>>();

    setDrag<T>(drag: CdkDrag, data: T, view: HTMLElement) {
        this._dragged.set({ drag, data, view });
    }

    clearDrag() {
        const dragged = this._dragged();
        if (!dragged) return;
        this.onDrop.emit(dragged);
        this._dragged.set(null);
    }
}