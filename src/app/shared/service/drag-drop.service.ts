import { CdkDrag } from "@angular/cdk/drag-drop";
import { EventEmitter, Injectable, signal } from "@angular/core";

export type DragData<T> = { drag: CdkDrag, data: T, view: HTMLElement };

@Injectable({
    providedIn: 'root',
})
export class DragDropService {

    private readonly _dragged = signal<DragData<any> | null>(null);
    readonly dragged = this._dragged.asReadonly();

    // Fired on any drag end (legacy behaviour – keep for compatibility)
    readonly onDrop = new EventEmitter<DragData<any>>();
    // Fired when a drop zone explicitly "consumes" (removes) the dragged item
    readonly consumed = new EventEmitter<DragData<any>>();

    setDrag<T>(drag: CdkDrag, data: T, view: HTMLElement) {
        this._dragged.set({ drag, data, view });
    }

    clearDrag() {
        const dragged = this._dragged();
        if (!dragged) return;
        this.onDrop.emit(dragged);
        this._dragged.set(null);
    }

    /**
     * Explicitly consume the currently dragged item (e.g. dropped into a delete / move zone).
     * Emits both onDrop (for backward compat) and consumed so listeners can differentiate.
     */
    consume() {
        const dragged = this._dragged();
        if (!dragged) return;
        // Emit specialised event first so order-dependent listeners can act before generic cleanup
        this.consumed.emit(dragged);
        this.onDrop.emit(dragged);
        this._dragged.set(null);
    }
}