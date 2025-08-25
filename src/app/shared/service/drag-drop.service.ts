import { CdkDrag } from "@angular/cdk/drag-drop";
import { Injectable, signal } from "@angular/core";

export type DragData<T> = { drag: CdkDrag, data: T };

@Injectable({
    providedIn: 'root',
})
export class DragDropService {

    readonly _dragged = signal<DragData<any> | null>(null);
    readonly dragged = this._dragged.asReadonly();

    setDrag<T>(drag: CdkDrag, data: T) {
        this._dragged.set({ drag, data });
    }

    clearDrag() {
        this._dragged.set(null);
    }
}