import { CdkDrag, CdkDropList } from "@angular/cdk/drag-drop";
import { Injectable, signal } from "@angular/core";

export type DragData<T> = { drag: CdkDrag, data: T, view: HTMLElement };
export type DropTarget = { dropList: CdkDropList, identity: string };

@Injectable({
    providedIn: 'root',
})
export class DragDropService {

    private readonly _dragged = signal<DragData<any> | null>(null);
    readonly dragged = this._dragged.asReadonly();

    private readonly targetSet = new Set<DropTarget>();
    private readonly _targets = signal<DropTarget[]>([]);
    public readonly targets = this._targets.asReadonly();

    registerTargets(targets: DropTarget[]) {
        for (const target of targets)
            this.targetSet.add(target);
        this._targets.set([...this.targetSet]);
    }

    unregisterTargets(targets: DropTarget[]) {
        for (const target of targets)
            this.targetSet.delete(target);
        this._targets.set([...this.targetSet]);
    }

    setDrag<T>(drag: CdkDrag, data: T, view: HTMLElement) {
        this._dragged.set({ drag, data, view });
    }

    clearDrag() {
        const dragged = this._dragged();
        if (!dragged) return;
        this._dragged.set(null);
    }

}